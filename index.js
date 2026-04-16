const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require('dotenv').config();
const http = require('http');

// ================= IA =================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

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
    const prompt = `Historial: ${contexto}. Evento: ${texto}. Narración corta, oscura.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return "El destino se ejecuta...";
  }
}

// ================= EVENTOS =================
function checkEventosRaros(db, jugadores, ronda) {
  let eventos = [];
  const vivos = jugadores.filter(j => j.vivo);

  if (db.global.eventosDesbloqueados.includes("ente_techo") && ronda >= 2)
    eventos.push("ente_techo");

  if (vivos.length <= 3) eventos.push("traicion_final");

  if (Math.random() < 0.15) eventos.push("loot");

  return eventos;
}

async function ejecutarEventoRaro(ev, jugadores, mem) {
  const vivos = jugadores.filter(j => j.vivo);

  if (ev === "ente_techo") {
    const v = vivos[Math.floor(Math.random() * vivos.length)];
    v.vivo = false;
    return `El Ente del Techo elimina a ${v.nombre}`;
  }

  if (ev === "loot") {
    const j = vivos[Math.floor(Math.random() * vivos.length)];
    j.kills += 2;
    return `${j.nombre} obtiene poder prohibido`;
  }

  if (ev === "traicion_final") {
    const a = vivos[0];
    const b = vivos[1];
    b.vivo = false;
    mem.traiciones.push(`${a.nombre} traicionó a ${b.nombre}`);
    return `${a.nombre} traiciona a ${b.nombre}`;
  }
}

// ================= MOTOR =================
async function continuarPartida(channel) {
  let db = cargarDB();
  let mem = cargarMemory();

  let jugadores = mem.jugadores;

  while (jugadores.filter(j => j.vivo).length > 1) {
    const vivos = jugadores.filter(j => j.vivo);
    let eventosRonda = [];

    for (let i = 0; i < Math.max(1, Math.floor(vivos.length / 2)); i++) {
      const a = vivos[Math.floor(Math.random() * vivos.length)];
      const b = vivos.filter(j => j !== a)[Math.floor(Math.random() * (vivos.length - 1))];

      if (!a || !b) continue;

      b.vivo = false;
      a.kills++;

      const texto = `${a.nombre} elimina a ${b.nombre}`;
      mem.historial.push(`R${mem.ronda}: ${texto}`);
      eventosRonda.push(await narrarEvento(texto, mem));
    }

    const raros = checkEventosRaros(db, jugadores, mem.ronda);

    for (const ev of raros) {
      const txt = await ejecutarEventoRaro(ev, jugadores, mem);
      mem.historial.push(`R${mem.ronda}: ${txt}`);
      eventosRonda.push(await narrarEvento(txt, mem));
    }

    guardarMemory(mem);

    const embed = new EmbedBuilder()
      .setTitle(`🔥 RONDA ${mem.ronda}`)
      .setDescription(eventosRonda.join("\n\n"));

    await channel.send({ embeds: [embed] });

    setTimeout(() => channel.send("👁️ Algo observa..."), 30000);
    await new Promise(r => setTimeout(r, 60000));

    mem.ronda++;
    guardarMemory(mem);
  }

  const ganador = jugadores.find(j => j.vivo);

  // guardar progreso
  jugadores.forEach(j => {
    if (!db.players[j.nombre]) db.players[j.nombre] = { wins: 0, kills: 0, partidas: 0 };
    db.players[j.nombre].kills += j.kills;
    db.players[j.nombre].partidas++;
  });

  db.players[ganador.nombre].wins++;
  db.global.partidasJugadas++;

  guardarDB(db);

  const embed = new EmbedBuilder()
    .setTitle("🏆 FINAL")
    .setDescription(`Ganador: ${ganador.nombre}`)
    .addFields({
      name: "📜 Historia",
      value: mem.historial.slice(-5).join("\n") || "Sin datos"
    });

  await channel.send({ embeds: [embed] });

  // reset memory
  mem.partidaActiva = false;
  mem.jugadores = [];
  mem.historial = [];
  mem.traiciones = [];
  guardarMemory(mem);
}

// ================= INICIAR =================
async function iniciarPartida(ctx) {
  const guild = ctx.guild;
  const miembros = await guild.members.fetch();

  let jugadores = miembros
    .filter(m => !m.user.bot)
    .map(m => ({
      nombre: m.user.username,
      vivo: true,
      kills: 0
    }));

  if (jugadores.length < 2) return ctx.reply("❌ No hay suficientes jugadores.");

  let mem = cargarMemory();

  mem.partidaActiva = true;
  mem.jugadores = jugadores;
  mem.ronda = 1;
  mem.historial = [];
  mem.traiciones = [];
  mem.canalId = ctx.channel.id;

  guardarMemory(mem);

  ctx.reply("🎮 Partida iniciada...");
  continuarPartida(ctx.channel);
}

// ================= EVENTOS =================
client.once(Events.ClientReady, async (c) => {
  console.log("✅ Patroclo persistente activo");

  const mem = cargarMemory();

  // 🔄 REANUDAR
  if (mem.partidaActiva && mem.canalId) {
    const channel = await client.channels.fetch(mem.canalId);
    if (channel) continuarPartida(channel);
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Inicia partida')
  ].map(c => c.toJSON());

  await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  const db = cargarDB();

  if (msg.content === "!hambre") iniciarPartida(msg);

  if (msg.content === "!ritual") {
    if (!db.global.eventosDesbloqueados.includes("ente_techo")) {
      db.global.eventosDesbloqueados.push("ente_techo");
      guardarDB(db);
      msg.reply("🌑 Has invocado al Ente...");
    }
  }
});

client.on(Events.InteractionCreate, async (i) => {
  if (i.isChatInputCommand()) iniciarPartida(i);
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);

// ================= SERVER =================
http.createServer((req, res) => {
  res.end("Patroclo persistente activo");
}).listen(process.env.PORT || 8080);