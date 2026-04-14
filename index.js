const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

console.log("🚀 [INICIO] Arrancando Patroclo 3...");

// 1. CONFIGURACIÓN DEL BOT (Asegúrate de tener los 3 activados en el portal)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent 
  ]
});

// 2. SERVIDOR HTTP
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo ONLINE');
}).listen(process.env.PORT || 8080);

// 3. REGISTRO DE COMANDOS SLASH (/)
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [DISCORD] ¡CONECTADO! Bot: ${c.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('✨ [SISTEMA] Comandos (/) sincronizados.');
  } catch (error) {
    console.error('❌ Error sincronizando comandos:', error);
  }
});

// 4. ESCUCHA DE MENSAJES (Comandos con !)
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  // DEBUG: Esto saldrá en Render cada vez que alguien escriba algo
  console.log(`📩 [MENSAJE] ${msg.author.tag}: ${msg.content}`);

  if (msg.content.toLowerCase() === '!ping') {
    await msg.reply('🏓 ¡Pong! El sistema está operativo.');
  }

  if (msg.content.toLowerCase() === '!hambre') {
    await msg.reply('🔥 **¡Los Juegos del Hambre han comenzado!**');
  }
});

// 5. ESCUCHA DE COMANDOS SLASH (/)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hambre') {
    await interaction.reply('🔥 ¡Que los tributos comiencen la batalla!');
  }
  
  if (interaction.commandName === 'calamar') {
    await interaction.reply('🦑 ¡Jugador eliminado! El juego del calamar continúa.');
  }
});

// 6. LOGIN
client.login(process.env.DISCORD_TOKEN).catch(err => console.error("❌ ERROR:", err.message));
