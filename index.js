const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

console.log("🚀 [SISTEMA] Iniciando Patroclo 3...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- 1. CONFIGURACIÓN DE COMANDOS ---
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

// --- 2. LÓGICA DE IA ---
async function pedirIA(tipo) {
  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: `Escribe una frase épica y muy corta para el inicio de ${tipo}. Máximo 10 palabras.` }]
    }, {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      timeout: 3000
    });
    return res.data.choices[0].message.content;
  } catch (err) {
    return null;
  }
}

// --- 3. EVENTO READY (Aquí levantamos la web) ---
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [DISCORD] Conectado como ${c.user.tag}`);
  
  // REGISTRAR COMANDOS
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 [BOT] Comandos sincronizados.');
  } catch (e) {
    console.error('❌ [ERROR] Comandos:', e.message);
  }

  // RECIÉN AHORA LEVANTAMOS EL SERVIDOR WEB
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Patroclo 3 esta ONLINE');
  }).listen(process.env.PORT || 8080, () => {
    console.log("🌐 [WEB] Render puede vernos ahora.");
  });
});

// --- 4. MANEJO DE COMANDOS ---
async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  try {
    if (esSlash) await ctx.deferReply();
    const narracion = await pedirIA(tipo);
    const msg = `**${tipo.toUpperCase()}**\n${narracion || "¡Que empiece el juego!"}`;
    if (esSlash) await ctx.editReply(msg);
    else await ctx.channel.send(msg);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

client.on(Events.InteractionCreate, async i => {
  if (i.isChatInputCommand()) await iniciarJuego(i, i.commandName);
});

client.on(Events.MessageCreate, async m => {
  if (m.author.bot || !m.content.startsWith('!')) return;
  const cmd = m.content.slice(1).toLowerCase();
  if (['hambre', 'calamar'].includes(cmd)) await iniciarJuego(m, cmd);
});

// --- 5. LOGIN ---
console.log("🛠️ [SISTEMA] Intentando login...");
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ [ERROR CRÍTICO] Falló el login:", err.message);
});
