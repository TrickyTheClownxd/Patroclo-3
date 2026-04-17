const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const fs = require("fs");
const http = require("http");

// ================= CONFIG =================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    const result = await model.generateContent(
      `Narrá esto como un evento brutal de supervivencia: ${texto}`
    );

    return result.response.text();
  } catch {
    return texto;
  }
}

// ================= MOTOR =================
async function continuarPartida(channel) {
  console.log("🧠 Simulación iniciada");

  let mem = cargarMemory();

  while (mem.partidaActiva && mem.jugadores.filter(j => j.vivo).length > 1) {

    mem = cargarMemory();

    if (mem.pausado) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    console.log("⚔️ Nueva ronda");

    const vivos = mem.jugadores.filter(j => j.vivo);

    const a = vivos[Math.floor(Math.random() * vivos.length)];
    const b = vivos.find(j => j.id !== a.id);

    if (!a || !b) break;

    b.vivo = false;

    const texto = `<@${a.id}> eliminó a <@${b.id}>`;
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

    await new Promise(r => setTimeout(r, 10000));

    mem.ronda++;
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
    console.log("🟢 iniciarPartida ejecutado");

    let mem = cargarMemory();

    if (mem.partidaActiva) {
      return ctx.reply("⚠️ Ya hay partida activa");
    }

    const miembros = await ctx.guild.members.fetch();

    const jugadores = miembros
      .filter(m => !m.user.bot)
      .map(m => ({
        id: m.user.id,
        vivo: true
      }));

    if (jugadores.length < 2) {
      return ctx.reply("❌ No hay suficientes jugadores");
    }

    mem.partidaActiva = true;
    mem.jugadores = jugadores;
    mem.ronda = 1;
    mem.historial = [];
    mem.canalId = ctx.channel.id;
    mem.pausado = false;

    guardarMemory(mem);

    await ctx.reply("🎮 Partida iniciada");

    setTimeout(() => continuarPartida(ctx.channel), 2000);

  } catch (err) {
    console.error("❌ ERROR iniciarPartida:", err);
    ctx.reply("❌ Error al iniciar");
  }
}

// ================= MENSAJES =================
client.on(Events.MessageCreate, async (msg) => {
  console.log("📩 Mensaje:", msg.content);

  if (msg.author.bot) return;

  const cmd = msg.content.toLowerCase();

  try {

    if (cmd === "!hambre" || cmd === "!calamar") {
      console.log("🔥 comando detectado");
      return iniciarPartida(msg);
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

    if (cmd === "!ping") {
      return msg.reply("🏓 Pong!");
    }

  } catch (err) {
    console.error("❌ ERROR comando:", err);
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
    console.error("❌ ERROR slash:", err);
  }
});

// ================= READY =================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot listo: ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Iniciar juego'),
    new SlashCommandBuilder().setName('calamar').setDescription('Modo calamar')
  ].map(c => c.toJSON());

  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("🌍 Slash commands OK");
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);

// ================= SERVER =================
http.createServer((req, res) => {
  res.end("Bot activo");
}).listen(process.env.PORT || 8080);