const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const fs = require("fs");
const http = require("http");

// ================= CONFIG =================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ================= CLIENT =================
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
    const contexto = mem.historial.slice(-3).join(" | ");
    const prompt = `Historia: ${contexto}. Evento: ${texto}. Narración corta, oscura y épica.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return texto;
  }
}

async function decidirEvento(jugadores) {
  try {
    const vivos = jugadores.filter(j => j.vivo);
    const lista = vivos.map(j => `${j.nombre}(${j.personalidad})`).join(", ");

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

// ================= MOTOR =================
async function continuarPartida(channel) {
  let db = cargarDB();
  let mem = cargarMemory();
  let jugadores = mem.jugadores;

  while (jugadores.filter(j => j.vivo).length > 1) {
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

    await new Promise(r => setTimeout(r, 60000));
    mem.ronda++;
  }

  const ganador = jugadores.find(j => j.vivo);

  if (!db.players[ganador.nombre]) {
    db.players[ganador.nombre] = { wins: 0, kills: 0, partidas: 0, dinero: 0 };
  }

  db.players[ganador.nombre].wins++;
  db.players[ganador.nombre].dinero += 100;
  db.global.partidasJugadas++;

  guardarDB(db);

  await channel.send(`🏆 Ganador: ${ganador.nombre} (+100 monedas)`);

  mem.partidaActiva = false;
  guardarMemory(mem);
}

// ================= INICIAR =================
async function iniciarPartida(ctx) {
  const miembros = await ctx.guild.members.fetch();

  const personalidades = ["agresivo", "cobarde", "estratega", "traidor"];

  let jugadores = miembros
    .filter(m => !m.user.bot)
    .map(m => ({
      nombre: m.user.username,
      vivo: true,
      kills: 0,
      personalidad: personalidades[Math.floor(Math.random() * personalidades.length)]
    }));

  let mem = cargarMemory();

  mem.partidaActiva = true;
  mem.jugadores = jugadores;
  mem.ronda = 1;
  mem.historial = [];
  mem.traiciones = [];
  mem.canalId = ctx.channel.id;

  guardarMemory(mem);

  await responder(ctx, "🎮 Partida iniciada...");
  continuarPartida(ctx.channel);
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

  if (cmd === "!ritual") {
    const db = cargarDB();
    db.global.eventosDesbloqueados.push("ente_techo");
    guardarDB(db);
    msg.reply("🌑 Has invocado algo...");
  }
});

// ================= READY =================
client.once(Events.ClientReady, async () => {
  console.log("🔥 Patroclo FULL activo");

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Iniciar juego'),
    new SlashCommandBuilder().setName('calamar').setDescription('Modo calamar'),
    new SlashCommandBuilder().setName('balance').setDescription('Ver dinero')
  ].map(c => c.toJSON());

  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  const mem = cargarMemory();
  if (mem.partidaActiva && mem.canalId) {
    const ch = await client.channels.fetch(mem.canalId);
    if (ch) continuarPartida(ch);
  }
});

client.login(process.env.DISCORD_TOKEN);

http.createServer((req, res) => {
  res.end("Bot activo");
}).listen(process.env.PORT || 8080);