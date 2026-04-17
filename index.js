const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const fs = require("fs");
const http = require("http");

// ================= CONFIG =================
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

// ================= FILES =================
function cargarMemory() {
  if (!fs.existsSync("memory.json")) {
    fs.writeFileSync("memory.json", JSON.stringify({
      partidaActiva: false,
      pausado: false,
      jugadores: [],
      ronda: 0,
      historial: [],
      acciones: {},
      canalId: null
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync("memory.json"));
}

function guardarMemory(mem) {
  fs.writeFileSync("memory.json", JSON.stringify(mem, null, 2));
}

// ================= IA =================
async function narrarEvento(texto) {
  try {
    if (!process.env.GEMINI_API_KEY) return texto;

    const prompt = `
Narrá esto como un reality show brutal, corto y cinematográfico:
${texto}
`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return texto;
  }
}

// ================= MOTOR =================
async function continuarPartida(channel) {
  console.log("🧠 Simulación avanzada iniciada");

  let mem = cargarMemory();

  while (mem.partidaActiva && mem.jugadores.filter(j => j.vivo).length > 1) {

    mem = cargarMemory();

    if (mem.pausado) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    const vivos = mem.jugadores.filter(j => j.vivo);

    const a = vivos[Math.floor(Math.random() * vivos.length)];
    const b = vivos.filter(j => j.id !== a.id)[Math.floor(Math.random() * (vivos.length - 1))];

    if (!a || !b) break;

    const eventos = ["ataque", "traicion", "accidente", "escape", "alianza", "dialogo"];
    const tipo = eventos[Math.floor(Math.random() * eventos.length)];

    let texto = "";

    // EVENTOS
    if (tipo === "ataque") {
      b.vivo = false;
      texto = `<@${a.id}> atacó brutalmente a <@${b.id}>`;
    }

    if (tipo === "traicion") {
      b.vivo = false;
      texto = `<@${a.id}> traicionó a <@${b.id}>`;
    }

    if (tipo === "accidente") {
      a.vivo = false;
      texto = `<@${a.id}> murió en un accidente`;
    }

    if (tipo === "escape") {
      texto = `<@${a.id}> escapó por poco`;
    }

    if (tipo === "alianza") {
      texto = `<@${a.id}> y <@${b.id}> forman una alianza`;
    }

    if (tipo === "dialogo") {
      const frases = [
        "No voy a morir hoy...",
        "Esto termina ahora.",
        "Confía en mí...",
        "No deberías estar aquí."
      ];
      texto = `<@${a.id}> le dice a <@${b.id}>: "${frases[Math.floor(Math.random()*frases.length)]}"`;
    }

    // ACCIONES DE USUARIOS
    if (mem.acciones[a.id] === "atacar" && b.vivo) {
      b.vivo = false;
      texto = `⚔️ <@${a.id}> ejecutó un ataque y eliminó a <@${b.id}>`;
    }

    if (mem.acciones[a.id] === "esconder") {
      texto = `🌿 <@${a.id}> se escondió y evitó peligro`;
    }

    mem.historial.push(texto);
    guardarMemory(mem);

    const narracion = await narrarEvento(texto);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🔥 RONDA ${mem.ronda}`)
          .setDescription(narracion)
      ]
    });

    // INTERMEDIO
    await new Promise(r => setTimeout(r, 5000));

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📊 RESUMEN")
          .setDescription(mem.historial.slice(-3).join("\n"))
      ]
    });

    await new Promise(r => setTimeout(r, 5000));

    mem.ronda++;
    mem.acciones = {};
    guardarMemory(mem);
  }

  const ganador = mem.jugadores.find(j => j.vivo);

  if (ganador) {
    await channel.send(`🏆 <@${ganador.id}> ganó la partida`);
  }

  mem.partidaActiva = false;
  guardarMemory(mem);
}

// ================= INICIO =================
async function iniciarPartida(ctx) {
  try {
    console.log("🟢 iniciarPartida");

    let mem = cargarMemory();

    if (mem.partidaActiva) {
      return ctx.reply("⚠️ Ya hay una partida en curso");
    }

    const miembros = await ctx.guild.members.fetch();

    const jugadores = miembros
      .filter(m => !m.user.bot)
      .map(m => ({ id: m.user.id, vivo: true }));

    if (jugadores.length < 2) {
      return ctx.reply("❌ No hay suficientes jugadores");
    }

    mem.partidaActiva = true;
    mem.jugadores = jugadores;
    mem.ronda = 1;
    mem.historial = [];
    mem.acciones = {};
    mem.canalId = ctx.channel.id;
    mem.pausado = false;

    guardarMemory(mem);

    await ctx.reply("🎮 PARTIDA INICIADA");

    setTimeout(() => continuarPartida(ctx.channel), 2000);

  } catch (err) {
    console.error("❌ ERROR iniciar:", err);
    ctx.reply("❌ Error al iniciar");
  }
}

// ================= MENSAJES =================
client.on(Events.MessageCreate, async (msg) => {
  console.log("📩", msg.content);

  if (msg.author.bot) return;

  const cmd = msg.content.toLowerCase();

  try {

    if (cmd === "!hambre" || cmd === "!calamar") return iniciarPartida(msg);

    if (cmd === "!atacar") {
      let mem = cargarMemory();
      mem.acciones[msg.author.id] = "atacar";
      guardarMemory(mem);
      return msg.reply("⚔️ Preparaste un ataque");
    }

    if (cmd === "!esconder") {
      let mem = cargarMemory();
      mem.acciones[msg.author.id] = "esconder";
      guardarMemory(mem);
      return msg.reply("🌿 Te escondiste");
    }

    if (cmd === "!pausa") {
      let mem = cargarMemory();
      mem.pausado = true;
      guardarMemory(mem);
      return msg.reply("⏸️ Pausado");
    }

    if (cmd === "!reanudar") {
      let mem = cargarMemory();
      mem.pausado = false;
      guardarMemory(mem);
      return msg.reply("▶️ Reanudado");
    }

    if (cmd === "!parar") {
      let mem = cargarMemory();
      mem.partidaActiva = false;
      guardarMemory(mem);
      return msg.reply("⛔ Finalizado");
    }

    if (cmd === "!ping") return msg.reply("🏓 Pong!");

  } catch (err) {
    console.error("❌ ERROR:", err);
  }
});

// ================= SLASH =================
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return;

  try {
    await i.deferReply();

    if (i.commandName === "hambre" || i.commandName === "calamar") {
      return iniciarPartida(i);
    }

  } catch (err) {
    console.error("❌ Slash error:", err);
  }
});

// ================= READY =================
client.once(Events.ClientReady, async () => {
  console.log("🔥 Patroclo ULTRA activo");

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Iniciar juego'),
    new SlashCommandBuilder().setName('calamar').setDescription('Modo calamar')
  ].map(c => c.toJSON());

  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("🌍 Slash listos");
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);

// ================= SERVER =================
http.createServer((req, res) => {
  res.end("Bot activo");
}).listen(process.env.PORT || 8080);