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

// ================= FILES =================
function cargarDB() {
  return JSON.parse(fs.readFileSync("db.json"));
}
function guardarDB(db) {
  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

function cargarMemory() {
  return JSON.parse(fs.readFileSync("memory.json"));
}
function guardarMemory(mem) {
  fs.writeFileSync("memory.json", JSON.stringify(mem, null, 2));
}

// ================= IA =================
async function narrarEvento(texto, mem) {
  try {
    const intensidad = mem.ronda > 5 ? "muy intenso" : "tenso";

    const prompt = `
Modo narrador de streaming.
Tono: ${intensidad}
Evento: ${texto}
Narralo corto y épico.
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return texto;
  }
}

async function decidirEvento(jugadores) {
  try {
    const vivos = jugadores.filter(j => j.vivo);

    const db = cargarDB();

    const memoria = vivos.map(j => {
      const hist = db.historialJugadores[j.id] || [];
      return `${j.id}: ${hist.slice(-3).join(",")}`;
    }).join(" | ");

    const lista = vivos.map(j => j.id).join(", ");

    const prompt = `
Jugadores: ${lista}
Memoria: ${memoria}

Elegí:
ataque|A|B
accidente|A|-
traicion|A|B
`;

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
    return data.choices?.[0]?.message?.content?.split("|");
  } catch {
    return null;
  }
}

// ================= HISTORIAL =================
function registrarEventoJugador(id, evento) {
  const db = cargarDB();

  if (!db.historialJugadores[id]) {
    db.historialJugadores[id] = [];
  }

  db.historialJugadores[id].push(evento);

  if (db.historialJugadores[id].length > 10) {
    db.historialJugadores[id].shift();
  }

  guardarDB(db);
}

// ================= MOTOR =================
async function continuarPartida(channel) {
  console.log("🧠 Simulación iniciada");

  let mem = cargarMemory();
  let jugadores = mem.jugadores;

  while (jugadores.filter(j => j.vivo).length > 1) {

    mem = cargarMemory();

    if (mem.pausado) {
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    await channel.send(["🎙️ La tensión aumenta...", "🔥 Nadie está a salvo..."][Math.floor(Math.random()*2)]);

    let eventos = [];

    for (let i = 0; i < 2; i++) {

      const decision = await decidirEvento(jugadores);

      if (!decision) continue;

      const [tipo, aID, bID] = decision;

      const a = jugadores.find(j => j.id === aID && j.vivo);
      const b = jugadores.find(j => j.id === bID && j.vivo);

      let texto = "";

      if (tipo === "ataque" && a && b) {
        b.vivo = false;
        texto = `<@${a.id}> elimina a <@${b.id}>`;
        registrarEventoJugador(a.id, "mató a alguien");
        registrarEventoJugador(b.id, "murió");
      }

      if (tipo === "accidente" && a) {
        a.vivo = false;
        texto = `<@${a.id}> muere por accidente`;
        registrarEventoJugador(a.id, "murió solo");
      }

      if (tipo === "traicion" && a && b) {
        b.vivo = false;
        texto = `<@${a.id}> traiciona a <@${b.id}>`;
      }

      if (!texto) continue;

      mem.historial.push(texto);
      eventos.push(await narrarEvento(texto, mem));
    }

    guardarMemory(mem);

    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle(`🔥 RONDA ${mem.ronda}`)
        .setDescription(eventos.join("\n\n"))]
    });

    // EVENTO LOCO
    if (Math.random() < 0.25) {
      const vivos = jugadores.filter(j => j.vivo);
      const victima = vivos[Math.floor(Math.random()*vivos.length)];
      victima.vivo = false;

      await channel.send(`⚠️ EVENTO GLOBAL eliminó a <@${victima.id}>`);
      registrarEventoJugador(victima.id, "murió por evento");
    }

    await new Promise(r => setTimeout(r, 60000));

    mem.ronda++;
    mem.acciones = {};
    guardarMemory(mem);
  }

  const ganador = jugadores.find(j => j.vivo);

  await channel.send(`🏆 <@${ganador.id}> ha ganado el juego`);

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
      id: m.user.id,
      vivo: true
    }));

  if (jugadores.length < 4) {
    return responder(ctx, "❌ Se necesitan mínimo 4 jugadores");
  }

  mem.partidaActiva = true;
  mem.jugadores = jugadores;
  mem.ronda = 1;
  mem.historial = [];
  mem.canalId = ctx.channel.id;
  mem.pausado = false;

  guardarMemory(mem);

  await responder(ctx, "🎮 Partida iniciada");
  setTimeout(() => continuarPartida(ctx.channel), 1000);
}

// ================= COMANDOS =================
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  const args = msg.content.split(" ");
  const cmd = args[0];

  if (cmd === "!inicio") iniciarPartida(msg);

  if (cmd === "!pausa") {
    let mem = cargarMemory();
    mem.pausado = true;
    guardarMemory(mem);
    msg.reply("⏸️ Pausado");
  }

  if (cmd === "!reanudar") {
    let mem = cargarMemory();
    mem.pausado = false;
    guardarMemory(mem);
    msg.reply("▶️ Reanudado");
  }

  if (cmd === "!parar") {
    let mem = cargarMemory();
    mem.partidaActiva = false;
    guardarMemory(mem);
    msg.reply("⛔ Finalizado");
  }

  if (cmd === "!estado") {
    msg.reply("```json\n" + JSON.stringify(cargarMemory(), null, 2) + "\n```");
  }
});

// ================= READY =================
client.once(Events.ClientReady, async () => {
  console.log("🔥 Patroclo FINAL activo");

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Iniciar juego'),
    new SlashCommandBuilder().setName('calamar').setDescription('Modo calamar')
  ].map(c => c.toJSON());

  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("🌍 Slash commands listos");
});

client.login(process.env.DISCORD_TOKEN);

http.createServer((req, res) => {
  res.end("Bot activo");
}).listen(process.env.PORT || 8080);