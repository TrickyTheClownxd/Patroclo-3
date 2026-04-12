const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

// --- 1. SERVIDOR PARA RENDER ---
// Esto evita que Render apague el bot por falta de actividad web.
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Patroclo 3 esta vivo.');
}).listen(process.env.PORT || 8080, () => {
  console.log("🌐 Servidor HTTP listo.");
});

// --- 2. CONFIGURACIÓN DEL BOT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // Fundamental para comandos con "!"
  ]
});

// --- 3. COMANDOS DE BARRA (/) ---
const commands = [
  new SlashCommandBuilder()
    .setName('hambre')
    .setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder()
    .setName('calamar')
    .setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

// --- 4. EVENTO DE CONEXIÓN ---
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ ¡BOT ONLINE! Identificado como: ${c.user.tag}`);
  
  // Registrar los comandos en Discord
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 Comandos sincronizados.');
  } catch (error) {
    console.error('❌ Error al sincronizar comandos:', error);
  }
});

// --- 5. MANEJO DE COMANDOS ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hambre') {
    await interaction.reply('🔥 **¡Los Juegos del Hambre han comenzado!** Que la suerte esté siempre de su lado.');
  }
  
  if (interaction.commandName === 'calamar') {
    await interaction.reply('🦑 **¡Juego del Calamar iniciado!** Jugador eliminado...');
  }
});

// Comandos con prefijo "!" (por si los preferís)
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const command = message.content.slice(1).toLowerCase();

  if (command === 'hambre') {
    await message.channel.send('🔥 ¡Iniciando Juegos del Hambre desde comando de texto!');
  }
  
  if (command === 'calamar') {
    await message.channel.send('🦑 ¡Iniciando Juego del Calamar desde comando de texto!');
  }
});

// --- 6. LOGIN ---
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ Error crítico de login:", err.message);
  console.error("Revisá que el DISCORD_TOKEN en Render sea el nuevo que generaste.");
});
