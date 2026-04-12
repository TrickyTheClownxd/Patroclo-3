const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. ABRIR PUERTO INMEDIATAMENTE (Para que Render no nos mate)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3: Sistema de Monitoreo Activo');
}).listen(process.env.PORT || 8080, () => {
  console.log("🌐 [WEB] Puerto abierto. Render ya no debería quejarse.");
});

console.log("🚀 [SISTEMA] Iniciando Patroclo 3...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. COMANDOS
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

// 3. IA
async function pedirIA(tipo) {
  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: `Frase corta para ${tipo}` }]
    }, {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      timeout: 3000
    });
    return res.data.choices[0].message.content;
  } catch (err) { return null; }
}

// 4. EVENTOS
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [DISCORD] LOGUEADO COMO: ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 [BOT] Comandos sincronizados.');
  } catch (e) { console.error('❌ [ERROR REST]:', e.message); }
});

client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand()) return;
  await i.deferReply();
  const narracion = await pedirIA(i.commandName);
  await i.editReply(`**${i.commandName.toUpperCase()}**\n${narracion || "¡Empiecen!"}`);
});

// 5. LOGIN CON CAPTURA DE ERROR TOTAL
console.log("🛠️ [SISTEMA] Intentando login en Discord...");

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ [ERROR DE LOGIN]:", err.message);
  if (err.code === 'ENOTFOUND') console.error("👉 Problema de DNS/Internet en Render.");
  if (err.message.includes("An invalid token")) console.error("👉 EL TOKEN ES INVÁLIDO.");
});
