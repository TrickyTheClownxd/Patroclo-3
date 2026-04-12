const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. Configuración de los comandos (Slash Commands)
const commands = [
  new SlashCommandBuilder()
    .setName('hambre')
    .setDescription('Genera una introducción épica para los Juegos del Hambre con IA'),
  new SlashCommandBuilder()
    .setName('calamar')
    .setDescription('Genera una introducción épica para el Juego del Calamar con IA'),
].map(command => command.toJSON());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- LÓGICA DE IA ---

/**
 * Función para llamar a Gemini o Groq
 * @param {string} prompt - Lo que le pedimos a la IA
 * @param {string} motor - 'gemini' o 'groq'
 */
async function pedirIA(prompt, motor = 'groq') {
  try {
    if (motor === 'groq') {
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192", // El modelo rápido de Groq
        messages: [{ role: "user", content: prompt }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
      });
      return response.data.choices[0].message.content;
    } 
    
    if (motor === 'gemini') {
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });
      return response.data.candidates[0].content.parts[0].text;
    }
  } catch (error) {
    console.error(`Error en ${motor}:`, error.response?.data || error.message);
    return "⚠️ Hubo un fallo en la matriz... prepárense de todas formas.";
  }
}

// --- LÓGICA DEL JUEGO ---

async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  
  // 1. Feedback inmediato (para que no de timeout)
  if (esSlash) await ctx.deferReply();
  else await ctx.channel.sendTyping();

  const prompt = `Escribe una introducción corta, dramática y épica en español para una partida de: ${tipo === 'hambre' ? 'Los Juegos del Hambre' : 'El Juego del Calamar'}. Máximo 3 líneas.`;
  
  // 2. Llamada a la IA (usamos Groq por la velocidad, podés cambiar a 'gemini')
  const narracion = await pedirIA(prompt, 'groq');

  const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
  const respuestaFinal = `${titulo}\n\n${narracion}`;

  // 3. Responder
  try {
    if (esSlash) {
      await ctx.editReply(respuestaFinal);
    } else {
      await ctx.channel.send(respuestaFinal);
    }
  } catch (error) {
    console.error('Error al responder:', error);
  }
}

// --- EVENTOS ---

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot online: ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 Comandos de barra actualizados.');
  } catch (e) { console.error(e); }
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

client.login(process.env.DISCORD_TOKEN);

http.createServer((req, res) => { res.write('OK'); res.end(); }).listen(process.env.PORT || 8080);
