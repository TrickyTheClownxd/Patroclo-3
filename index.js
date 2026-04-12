const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

console.log("🚀 ARRANCANDO PROCESO...");

// Servidor para Render (INMEDIATO)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3 OK');
}).listen(process.env.PORT || 8080, () => {
  console.log("🌐 Puerto " + (process.env.PORT || 8080) + " abierto.");
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Comandos
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Juego del Calamar'),
].map(cmd => cmd.toJSON());

// Evento Ready
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ DISCORD: Conectado como ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 Comandos sincronizados con Discord.');
  } catch (e) { console.error('❌ Error REST:', e.message); }
});

// Función IA
async function pedirIA(tipo) {
  console.log(`🤖 Pidiendo IA para ${tipo}...`);
  try {
    if (process.env.GROQ_API_KEY) {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: `Frase corta de inicio para ${tipo}` }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 4000
      });
      return res.data.choices[0].message.content;
    }
  } catch (e) { console.log("⚠️ IA falló, usando texto base."); }
  return "¡Que empiece el juego!";
}

// Iniciar Juego
async function iniciarJuego(ctx, tipo) {
  console.log(`🎮 Comando detectado: ${tipo}`);
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  try {
    if (esSlash) await ctx.deferReply();
    else await ctx.channel.sendTyping();

    const narracion = await pedirIA(tipo);
    const msg = `**${tipo.toUpperCase()}**\n${narracion}`;

    if (esSlash) await ctx.editReply(msg);
    else await ctx.channel.send(msg);
  } catch (err) { console.error("❌ Error en juego:", err.message); }
}

client.on(Events.InteractionCreate, async i => {
  if (i.isChatInputCommand()) await iniciarJuego(i, i.commandName);
});

client.on(Events.MessageCreate, async m => {
  if (m.author.bot || !m.content.startsWith('!')) return;
  const cmd = m.content.slice(1).toLowerCase();
  if (['hambre', 'calamar'].includes(cmd)) await iniciarJuego(m, cmd);
});

// LOGIN
console.log("⏳ Intentando entrar a Discord...");
if (!process.env.DISCORD_TOKEN) {
  console.error("❌ ERROR: No hay DISCORD_TOKEN en las variables de entorno!");
} else {
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ ERROR DE LOGIN:", err.message);
  });
}
