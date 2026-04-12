const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

// Servidor para Render (para que no se apague)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3 Online');
}).listen(process.env.PORT || 8080);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Comandos de barra
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Juego del Calamar')
].map(cmd => cmd.toJSON());

// Evento Ready
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ BOT CONECTADO: ${c.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 Comandos cargados');
  } catch (e) {
    console.error('Error cargando comandos:', e);
  }
});

// Respuesta simple (Sin IA por ahora para probar conexión)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.reply(`¡Iniciando ${interaction.commandName}! (Modo prueba)`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.startsWith('!')) return;
  if (message.content === '!hambre' || message.content === '!calamar') {
    await message.channel.send("¡Iniciando juego! (Modo prueba)");
  }
});

// Login con manejo de error
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('❌ ERROR DE LOGIN:', err.message);
});
