const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

// 1. Configuración de los comandos (Slash Commands)
const commands = [
  new SlashCommandBuilder()
    .setName('hambre')
    .setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder()
    .setName('calamar')
    .setDescription('Inicia el Juego del Calamar'),
].map(command => command.toJSON());

// 2. Inicializar cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 3. Función lógica para los juegos
async function iniciarJuego(ctx, tipo) {
  const respuestas = {
    hambre: '🔥 ¡Comienza la partida del **Juego del Hambre**!',
    calamar: '🦑 ¡Comienza la partida del **Juego del Calamar**!'
  };

  const texto = respuestas[tipo];

  try {
    // Si es interacción (/) usamos reply, si es mensaje (!) usamos channel.send
    if (ctx.isChatInputCommand && ctx.isChatInputCommand()) {
      await ctx.reply(texto);
    } else {
      await ctx.channel.send(texto);
    }
  } catch (error) {
    console.error('Error al responder:', error);
  }
}

// 4. Evento: Registro de comandos y Ready
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot conectado como ${c.user.tag}`);

  // Esto registra los comandos automáticamente en todos los servers donde esté el bot
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('⏳ Registrando comandos de barra...');
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: commands },
    );
    console.log('🚀 Comandos registrados con éxito.');
  } catch (error) {
    console.error('Error registrando comandos:', error);
  }
});

// 5. Manejo de Slash Commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hambre' || interaction.commandName === 'calamar') {
    await iniciarJuego(interaction, interaction.commandName);
  }
});

// 6. Manejo de Prefijo Clásico (!)
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.startsWith('!')) return;

  const cmd = message.content.slice(1).toLowerCase();

  if (cmd === 'hambre' || cmd === 'calamar') {
    await iniciarJuego(message, cmd);
  }
});

// Login
client.login(process.env.DISCORD_TOKEN);

// Servidor para que Render no se duerma
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot Online');
}).listen(process.env.PORT || 8080);
