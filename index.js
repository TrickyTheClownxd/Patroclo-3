const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const fs = require("fs");
const http = require("http");

// ================= CONFIG =================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= HELPERS =================
async function responder(ctx, contenido) {
  if (ctx.editReply) return ctx.editReply(contenido);
  if (ctx.reply) return ctx.reply(contenido);
}

// ================= DB =================
function cargarDB() {
  if (!fs.existsSync("db.json")) {
    fs.writeFileSync("db.json", JSON.stringify({
      players: {},
      global: { eventosDesbloqueados: [], partidasJugadas: 0 },
      apuestas: {}
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync("db.json"));
}
function guardarDB(db) {
  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

// ================= MEMORY =================
function cargarMemory() {
  if (!fs.existsSync("memory.json")) {
    fs.writeFileSync("memory.json", JSON.stringify({
      partidaActiva: false,
      jugadores: [],
      ronda: 0,
      historial: [],
      traiciones: [],
      canalId: null
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync("memory.json"));
}
function guardarMemory(mem) {
  fs.writeFileSync("memory.json", JSON.stringify(mem, null, 2));
}

// ================= IA =================
async function narrarEvento(texto, mem) {
  try {
    const contexto = mem.historial.slice(-5).join(" | ");
    const prompt = `Historia: ${contexto}. Evento: ${texto}. Narración brutal, oscura y corta.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return texto;
  }
}

async function decidirEvento(jugadores) {
  try {
    const vivos = jugadores.filter(j => j.vivo);
    const lista = vivos.map(j => `${j.nombre}(${j.personalidad}/${j.rol})`).join(", ");

    const prompt = `Jugadores: ${lista}
Elegí:
ataque|A|B
accidente|A|-
traicion|A|B`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await res.json();
    return data.choices[0].message.content.trim().split("|");

  } catch {
    return null;
  }
}

// ================= ROLES =================
const roles = ["traidor", "cazador", "superviviente", "neutral"];
const personalidades = ["agresivo", "cobarde", "estratega"];

// ================= MOTOR =================
async function continuarPartida(channel) {
  console.log("🧠 Simulación iniciada");

  let db = cargarDB();
  let mem = cargarMemory();
  let jugadores = mem.jugadores;

  while (jugadores.filter(j => j.vivo).length > 1) {
    console.log("⚔️ Ronda", mem.ronda);

    let eventos = [];

    for (let i = 0; i < 2; i++) {
      const decision = await decidirEvento(jugadores);

      let texto = "";

      if (decision) {
        const [tipo, aN, bN] = decision;
        const a = jugadores.find(j => j.nombre === aN && j.vivo);
        const b = jugadores.find(j => j.nombre === bN && j.vivo);

        if (tipo === "ataque" && a && b) {
          b.vivo = false;
          a.kills++;
          texto = `${a.nombre} elimina a ${b.nombre}`;
        }

        if (tipo === "accidente" && a) {
          a.vivo = false;
          texto = `${a.nombre} muere por accidente`;
        }

        if (tipo === "traicion" && a && b) {
          b.vivo = false;
          a.kills++;
          mem.traiciones.push(`${a.nombre} traicionó a ${b.nombre}`);
          texto = `${a.nombre} traiciona a ${b.nombre}`;
        }
      }

      if (!texto) continue;

      mem.historial.push(`R${mem.ronda}: ${texto}`);
      eventos.push(await narrarEvento(texto, mem));
    }

    guardarMemory(mem);

    const embed = new EmbedBuilder()
      .setTitle(`🔥 RONDA ${mem.ronda}`)
      .setDescription(eventos.join("\n\n"));

    await channel.send({ embeds: [embed] });

    // 📺 MODO STREAM (intermedio)
    await new Promise(r => setTimeout(r, 30000));
    await channel.send("📺 Intermedio... recapitulando muertes...");

    const resumen = mem.historial.slice(-3).join("\n");
    await channel.send(`💀 Últimos eventos:\n${resumen}`);

    await new Promise(r => setTimeout(r, 30000));

    mem.ronda++;
    guardarMemory(mem);
  }

  const ganador = jugadores.find(j => j.vivo);

  // 💰 recompensas + apuestas
  db.apuestas = db.apuestas || {};

  for (const user in db.apuestas) {
    const apuesta = db.apuestas[user];
    if (apuesta.objetivo === ganador.nombre) {
      if (!db.players[user]) db.players[user] = { dinero: 0 };
      db.players[user].dinero += apuesta.monto * 2;
    }
  }

  db.apuestas = {};

  if (!db.players[ganador.nombre]) {
    db.players[ganador.nombre] = { wins: 0, dinero: 0 };
  }

  db.players[ganador.nombre].wins++;
  db.players[ganador.nombre].dinero += 100;

  guardarDB(db);

  await channel.send(`🏆 Ganador: ${ganador.nombre}`);

  mem.partidaActiva = false;
  guardarMemory(mem);
}

// ================= INICIAR =================
async function iniciarPartida(ctx) {
  let mem = cargarMemory();

  if (mem.partidaActiva) {
    return responder(ctx, "⚠️ Ya hay una partida en curso.");
  }

  const miembros = await ctx.guild.members.fetch();

  let jugadores = miembros
    .filter(m => !m.user.bot)
    .map(m => ({
      nombre: m.user.username,
      vivo: true,
      kills: 0,
      rol: roles[Math.floor(Math.random() * roles.length)],
      personalidad: personalidades[Math.floor(Math.random() * personalidades.length)]
    }));

  mem.partidaActiva = true;
  mem.jugadores = jugadores;
  mem.ronda = 1;
  mem.historial = [];
  mem.traiciones = [];
  mem.canalId = ctx.channel.id;

  guardarMemory(mem);

  await responder(ctx, "🎮 Partida iniciada...");
  setTimeout(() => continuarPartida(ctx.channel), 1000);
}

// ================= SLASH =================
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return;

  await i.deferReply();

  if (i.commandName === "hambre") iniciarPartida(i);
  if (i.commandName === "calamar") iniciarPartida(i);

  if (i.commandName === "balance") {
    const db = cargarDB();
    const user = db.players[i.user.username];
    await responder(i, `💰 Dinero: ${user?.dinero || 0}`);
  }
});

// ================= PREFIX =================
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  const args = msg.content.split(" ");
  const cmd = args[0];

  if (cmd === "!hambre") iniciarPartida(msg);
  if (cmd === "!calamar") iniciarPartida(msg);

  if (cmd === "!balance") {
    const db = cargarDB();
    const user = db.players[msg.author.username];
    msg.reply(`💰 Dinero: ${user?.dinero || 0}`);
  }

  if (cmd === "!apostar") {
    const objetivo = args[1];
    const monto = parseInt(args[2]);

    const db = cargarDB();
    db.apuestas[msg.author.username] = { objetivo, monto };
    guardarDB(db);

    msg.reply("💰 Apuesta registrada");
  }

  if (cmd === "!estado") {
    const mem = cargarMemory();
    msg.reply("```json\n" + JSON.stringify(mem, null, 2) + "\n```");
  }
});

// ================= READY =================
client.once(Events.ClientReady, async () => {
  console.log("🔥 Patroclo DIOS activo");

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Iniciar juego'),
    new SlashCommandBuilder().setName('calamar').setDescription('Modo calamar'),
    new SlashCommandBuilder().setName('balance').setDescription('Ver dinero')
  ].map(c => c.toJSON());

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
    { body: commands }
  );

  const mem = cargarMemory();
  if (mem.partidaActiva && mem.canalId) {
    const ch = await client.channels.fetch(mem.canalId);
    if (ch) continuarPartida(ch);
  }
});

client.login(process.env.DISCORD_TOKEN);

http.createServer((req, res) => {
  res.end("Patroclo activo");
}).listen(process.env.PORT || 8080);