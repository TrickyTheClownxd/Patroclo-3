const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. Configuración de los comandos (Slash Commands)
const commands = [
  new SlashCommandBuilder()
    .setName('hambre')
    .setDescription('Inicia el Juego del Hambre con IA'),
  new SlashCommandBuilder()
    .setName('calamar')
    .setDescription('Inicia el Juego del Calamar con IA'),
].map(command => command.toJSON());

// 2. Inicializar cliente con los Intents necesarios
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // Vital para los comandos con "!"
  ]
});

// --- LÓGICA DE IA ---
async function pedirIA(prompt, motor = 'groq') {
  try {
    if (motor === 'groq' && process.env.GROQ_API_KEY) {
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
      });
      return response.data.choices[0].message.content;
    } 
    
    if (motor === 'gemini' && process.env.GEMINI_API_KEY) {
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });
      return response.data.candidates[0].content.parts[0].text;
    }
    return "No se pudo conectar con la IA, pero el juego comienza igual.";
  } catch (error) {
    console.error(`Error en ${motor}:`, error.message);
    return "⚠️ ¡El sistema de IA falló! Pero la masacre debe continuar...";
  }
}

// --- LÓGICA DEL JUEGO ---
async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  
  try {
    if (esSlash) await ctx.deferReply();
    else await ctx.channel.sendTyping();

    const prompt = `Escribe una intro muy corta y épica para: ${tipo === 'hambre' ? 'Los Juegos del Hambre' : 'El Juego del Calamar'}.`;
    const narracion = await pedirIA(prompt, 'groq');

    const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
    const msg = `${titulo}\n\n${narracion}`;

    if (esSlash) await ctx.editReply(msg);
    else await ctx.channel.send(msg);
  } catch (err) {
    console.error("Error en iniciarJuego:", err);
  }
}

// --- EVENTOS ---
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ BOT ONLINE como: ${c.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('⏳ Sincronizando comandos...');
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 Comandos de barra listos.');
  } catch (e) {
    console.error('❌ Error sincronizando comandos:', e.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (['hambre', 'calamar'].includes(interaction.commandName)) {
    await iniciarJuego(interaction, interaction.commandName);
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.startsWith('!')) return;
  const cmd = message.content.slice(1).toLowerCase();
  if (['hambre', 'calamar'].includes(cmd)) {
    await iniciarJuego(message, cmd);
  }
});

// --- LOGIN CON DEBUG ---
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ ERROR FATAL AL LOGUEAR:");
  console.error("Mensaje:", err.message);
  console.error("Asegúrate de que el DISCORD_TOKEN en Render sea el correcto.");
});

// Servidor Dummy
http.createServer((req, res) => {
  res.write('Bot Vivo');
  res.end();
}).listen(process.env.PORT || 8080);
