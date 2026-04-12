const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// --- 1. SERVIDOR PARA RENDER ---
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Patroclo 3 está vivo y coleando');
  res.end();
}).listen(process.env.PORT || 8080);
console.log("🌐 Servidor HTTP iniciado");

// --- 2. CONFIGURACIÓN DE COMANDOS ---
const commands = [
  new SlashCommandBuilder()
    .setName('hambre')
    .setDescription('Inicia el Juego del Hambre con narración de IA'),
  new SlashCommandBuilder()
    .setName('calamar')
    .setDescription('Inicia el Juego del Calamar con narración de IA'),
].map(command => command.toJSON());

// --- 3. INICIALIZAR CLIENTE ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- 4. LÓGICA DE IA ---
async function pedirIA(prompt, motor = 'groq') {
  try {
    // Intento con Groq
    if (motor === 'groq' && process.env.GROQ_API_KEY) {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
      });
      return res.data.choices[0].message.content;
    } 
    
    // Intento con Gemini (fallback)
    if (motor === 'gemini' && process.env.GEMINI_API_KEY) {
      const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
      });
      return res.data.candidates[0].content.parts[0].text;
    }
    return "La IA no responde, pero la carnicería empieza igual.";
  } catch (error) {
    console.error(`❌ Error IA:`, error.message);
    return "⚠️ Error de conexión con el Oráculo. ¡Sobrevivan como puedan!";
  }
}

// --- 5. FUNCIÓN INICIAR JUEGO (CON FIX DE TIEMPO) ---
async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  
  try {
    // PASO CLAVE: Decirle a Discord que espere (modo "pensando...")
    if (esSlash) {
      await ctx.deferReply(); 
    } else {
      await ctx.channel.sendTyping();
    }

    const prompt = `Escribe una intro muy corta, épica y algo turbia para una partida de: ${tipo === 'hambre' ? 'Los Juegos del Hambre' : 'El Juego del Calamar'}. En español y máximo 20 palabras.`;
    
    const narracion = await pedirIA(prompt, 'groq');
    const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
    const respuestaFinal = `${titulo}\n\n${narracion}`;

    // ENVIAR RESPUESTA
    if (esSlash) {
      await ctx.editReply(respuestaFinal); // Se usa editReply porque ya hicimos defer
    } else {
      await ctx.channel.send(respuestaFinal);
    }
  } catch (err) {
    console.error("❌ Error en iniciarJuego:", err.message);
    if (esSlash) await ctx.editReply("Hubo un error técnico, pero denle gas al juego.");
  }
}

// --- 6. EVENTOS ---
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ BOT ONLINE: ${c.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 Comandos de barra sincronizados');
  } catch (e) {
    console.error('❌ Error REST:', e.message);
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

// --- 7. LOGIN ---
console.log("⏳ Conectando...");
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ FALLÓ EL LOGIN:", err.message);
});
