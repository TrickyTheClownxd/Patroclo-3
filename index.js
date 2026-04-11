const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();
const http = require('http');

// Inicializar cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Función genérica para iniciar juego
function iniciarJuego(ctx, tipo) {
  if (tipo === 'hambre') {
    ctx.reply('🔥 ¡Comienza la partida del **Juego del Hambre**!');
  }
  if (tipo === 'calamar') {
    ctx.reply('🦑 ¡Comienza la partida del **Juego del Calamar**!');
  }
}

// Evento: listo
client.once(Events.ClientReady, () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

// Slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hambre') {
    iniciarJuego(interaction, 'hambre');
  }

  if (interaction.commandName === 'calamar') {
    iniciarJuego(interaction, 'calamar');
  }
});

// Prefijo clásico (!)
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.content === '!hambre') {
    iniciarJuego({ reply: msg => message.channel.send(msg) }, 'hambre');
  }

  if (message.content === '!calamar') {
    iniciarJuego({ reply: msg => message.channel.send(msg) }, 'calamar');
  }
});

// Login con token
client.login(process.env.DISCORD_TOKEN);

// Servidor dummy para Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot de Discord corriendo\n');
}).listen(process.env.PORT || 8080);