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

// ================= MEMORY =================
function cargarMemory() {
  if (!fs.existsSync("memory.json")) {
    fs.writeFileSync("memory.json", JSON.stringify({
      partidaActiva: false,
      pausado: false,
      modo: "hambre",
      temporada: null,
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
    const prompt = `Narrador de reality show oscuro. Evento: ${texto}. Corto, tenso y cinematográfico.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return texto;
  }
}

// ================= EVENTOS HAMBRE =================
function eventoHambre(a, b, mem) {

  const eventos = [
    { texto: "{user1} y {user2} intentan un pacto desesperado… pero fracasan y quedan fuera.", kill: "both" },
    { texto: "{user1} prepara una trampa para {user2}, pero se vuelve en su contra.", kill: "self" },
    { texto: "{user1} no soporta el frío de la noche y abandona.", kill: "self" },
    { texto: "{user1} embosca a {user2} con una piedra y lo elimina.", kill: "other" },
    { texto: "{user1} roba provisiones de {user2}, pero es descubierto y eliminado.", kill: "self" },
    { texto: "{user1} se esconde en la oscuridad, pero {user2} lo encuentra y lo elimina.", kill: "self" },
    { texto: "{user1} y {user2} discuten por comida… la tensión termina con ambos fuera.", kill: "both" },
    { texto: "{user1} cae en una trampa natural y queda eliminado.", kill: "self" },
    { texto: "{user1} intenta atacar a {user2}, pero falla y queda fuera.", kill: "self" },
    { texto: "{user1} se queda sin fuerzas y abandona el desafío.", kill: "self" },
    { texto: "{user1} y {user2} forman una alianza temporal… que pronto se rompe.", kill: "none" },
    { texto: "{user1} se pierde en el bosque y no regresa.", kill: "self" },
    { texto: "{user1} embosca a {user2} durante la noche y lo elimina.", kill: "other" },
    { texto: "{user1} intenta construir refugio, pero fracasa y queda fuera.", kill: "self" },
    { texto: "{user1} y {user2} se enfrentan en un duelo improvisado… solo uno sobrevive.", kill: "random" },
    { texto: "{user1} se arriesga demasiado y queda eliminado.", kill: "self" },
    { texto: "{user1} se confía demasiado y {user2} lo sorprende.", kill: "self" },
    { texto: "{user1} se sacrifica para salvar a {user2}, pero ambos quedan fuera.", kill: "both" },
    { texto: "{user1} encuentra un recurso valioso, pero {user2} lo arrebata y lo elimina.", kill: "self" },
    { texto: "{user1} y {user2} se enfrentan en la última ronda… el juego decide su destino.", kill: "random" }
  ];

  // evento especial en rondas altas
  if (mem.ronda >= 5 && Math.random() < 0.3) {
    const especiales = [
      "{user1} encuentra un recurso raro que cambia el juego.",
      "{user1} activa un evento inesperado que altera la arena.",
      "{user1} aprovecha el caos para escapar momentáneamente."
    ];
    return especiales[Math.floor(Math.random()*especiales.length)]
      .replaceAll("{user1}", `<@${a.id}>`);
  }

  const evento = eventos[Math.floor(Math.random() * eventos.length)];

  let texto = evento.texto
    .replaceAll("{user1}", `<@${a.id}>`)
    .replaceAll("{user2}", `<@${b.id}>`);

  switch (evento.kill) {
    case "self": a.vivo = false; break;
    case "other": b.vivo = false; break;
    case "both": a.vivo = false; b.vivo = false; break;
    case "random": Math.random() < 0.5 ? a.vivo = false : b.vivo = false; break;
  }

  return texto;
}

// ================= CALAMAR =================
function pruebaCalamar(mem, jugadores) {
  const vivos = jugadores.filter(j => j.vivo);

  if (mem.ronda === 1) {
    const elim = vivos.filter(() => Math.random() < 0.3);
    elim.forEach(j => j.vivo = false);
    return `🔴 Luz roja... ${elim.map(j=>`<@${j.id}>`).join(", ")} fallaron`;
  }

  if (mem.ronda === 2) {
    const elim = vivos.filter(() => Math.random() < 0.4);
    elim.forEach(j => j.vivo = false);
    return `🍪 Fallaron la galleta: ${elim.map(j=>`<@${j.id}>`).join(", ")}`;
  }

  if (mem.ronda === 3) {
    const mitad = Math.floor(vivos.length/2);
    const elim = vivos.slice(0, mitad);
    elim.forEach(j => j.vivo = false);
    return `🪢 Equipo eliminado: ${elim.map(j=>`<@${j.id}>`).join(", ")}`;
  }

  if (mem.ronda === 4) {
    const elim = vivos.filter(() => Math.random() < 0.5);
    elim.forEach(j => j.vivo = false);
    return `🎲 Pierden: ${elim.map(j=>`<@${j.id}>`).join(", ")}`;
  }

  if (mem.ronda === 5) {
    const elim = vivos.filter(() => Math.random() < 0.6);
    elim.forEach(j => j.vivo = false);
    return `🌉 Caen: ${elim.map(j=>`<@${j.id}>`).join(", ")}`;
  }

  return `🦑 Final entre sobrevivientes`;
}

// ================= MOTOR =================
async function continuarPartida(channel) {
  let mem = cargarMemory();

  while (mem.partidaActiva && mem.jugadores.filter(j => j.vivo).length > 1) {

    mem = cargarMemory();

    if (mem.pausado) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    const vivos = mem.jugadores.filter(j => j.vivo);
    const a = vivos[Math.floor(Math.random()*vivos.length)];
    const b = vivos.find(j => j.id !== a.id);

    let texto;

    if (mem.modo === "calamar") {
      texto = pruebaCalamar(mem, mem.jugadores);
    } else {
      texto = eventoHambre(a, b, mem);
    }

    // acciones
    if (mem.acciones[a.id] === "atacar" && b?.vivo) {
      b.vivo = false;
      texto = `⚔️ <@${a.id}> ejecuta un ataque`;
    }

    if (mem.acciones[a.id] === "esconder") {
      texto = `🌿 <@${a.id}> se oculta`;
    }

    mem.historial.push(texto);
    guardarMemory(mem);

    const narracion = await narrarEvento(texto);

    await channel.send({ embeds: [new EmbedBuilder().setTitle(`🔥 RONDA ${mem.ronda}`).setDescription(narracion)] });

    await new Promise(r => setTimeout(r, 5000));

    await channel.send({ embeds: [new EmbedBuilder().setTitle("📊 RESUMEN").setDescription(mem.historial.slice(-3).join("\n"))] });

    await new Promise(r => setTimeout(r, 5000));

    mem.ronda++;
    mem.acciones = {};
    guardarMemory(mem);
  }

  const ganador = mem.jugadores.find(j => j.vivo);
  if (ganador) await channel.send(`🏆 <@${ganador.id}> ganó la partida`);

  mem.partidaActiva = false;
  guardarMemory(mem);
}

// ================= INICIO =================
async function iniciarPartida(ctx, modo = "hambre", temporada = null) {
  let mem = cargarMemory();

  if (mem.partidaActiva) return ctx.reply("⚠️ Ya hay partida activa");

  const miembros = await ctx.guild.members.fetch();

  const jugadores = miembros.filter(m => !m.user.bot).map(m => ({ id: m.user.id, vivo: true }));

  if (jugadores.length < 2) return ctx.reply("❌ No hay suficientes jugadores");

  mem.partidaActiva = true;
  mem.modo = modo;
  mem.temporada = temporada;
  mem.jugadores = jugadores;
  mem.ronda = 1;
  mem.historial = [];
  mem.acciones = {};
  mem.canalId = ctx.channel.id;
  mem.pausado = false;

  guardarMemory(mem);

  await ctx.reply(`🎮 Iniciando ${modo}`);

  setTimeout(() => continuarPartida(ctx.channel), 2000);
}

// ================= MENSAJES =================
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  const cmd = msg.content.toLowerCase();

  if (cmd === "!hambre") return iniciarPartida(msg, "hambre");

  if (cmd.startsWith("!calamar")) return iniciarPartida(msg, "calamar");

  if (cmd === "!atacar") {
    let mem = cargarMemory();
    mem.acciones[msg.author.id] = "atacar";
    guardarMemory(mem);
    return msg.reply("⚔️ Ataque listo");
  }

  if (cmd === "!esconder") {
    let mem = cargarMemory();
    mem.acciones[msg.author.id] = "esconder";
    guardarMemory(mem);
    return msg.reply("🌿 Escondido");
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
});

// ================= READY =================
client.once(Events.ClientReady, async () => {
  console.log("🔥 Patroclo PRO activo");

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Modo hambre'),
    new SlashCommandBuilder().setName('calamar').setDescription('Modo calamar')
  ].map(c => c.toJSON());

  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

  console.log("🌍 Slash listos");
});

client.login(process.env.DISCORD_TOKEN);

http.createServer((req, res) => {
  res.end("Bot activo");
}).listen(process.env.PORT || 8080);