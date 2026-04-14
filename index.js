const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. SERVIDOR PARA RENDER
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3: Sistema Operativo');
}).listen(process.env.PORT || 8080);

// 2. CONFIGURACIÓN DEL CLIENTE
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent 
  ]
});

// 3. REGISTRO DE COMANDOS SLASH
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

// 4. FUNCIÓN PARA LLAMAR A LA IA (Groq)
async function obtenerNarracionIA(juego) {
  try {
    // Si no tienes la API KEY de Groq, devolverá un texto por defecto
    if (!process.env.GROQ_API_KEY) return null;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "Eres un narrador épico y oscuro." },
        { role: "user", content: `Escribe una frase de inicio muy corta (máximo 15 palabras) para un juego de ${juego}.` }
      ]
    }, {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      timeout: 4000
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error Groq:", error.message);
    return null;
  }
}

// 5. EVENTO READY
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [SISTEMA] Patroclo 3 conectado como ${c.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('✨ [SISTEMA] Comandos de barra actualizados.');
  } catch (err) {
    console.error('❌ [ERROR REST]:', err);
  }
});

// 6. ESCUCHA DE MENSAJES (Comandos con !)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase().trim();

  if (content === '!ping') {
    return message.reply('🏓 ¡Pong! El bot responde correctamente.');
  }

  if (content === '!hambre' || content === '!calamar') {
    await message.channel.sendTyping();
    const tipo = content.includes('hambre') ? 'Los Juegos del Hambre' : 'El Juego del Calamar';
    const narracion = await obtenerNarracionIA(tipo);
    
    const emoji = content.includes('hambre') ? '🔥' : '🦑';
    return message.reply(`${emoji} **${tipo.toUpperCase()}**\n\n${narracion || "¡Que comience la carnicería! Suerte a todos."}`);
  }
});

// 7. ESCUCHA DE COMANDOS SLASH (/)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();
  const tipo = interaction.commandName === 'hambre' ? 'Los Juegos del Hambre' : 'El Juego del Calamar';
  const narracion = await obtenerNarracionIA(tipo);
  
  const emoji = interaction.commandName === 'hambre' ? '🔥' : '🦑';
  await interaction.editReply(`${emoji} **${tipo.toUpperCase()}**\n\n${narracion || "¡Los juegos han comenzado!"}`);
});

// 8. LOGIN
client.login(process.env.DISCORD_TOKEN);
