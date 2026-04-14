const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const http = require('http');

// 1. CONFIGURACIÓN IA (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 2. CONFIGURACIÓN BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 3. FUNCIÓN NARRADORA (Gemini)
async function narrarInicio(juego) {
  try {
    if (!process.env.GEMINI_API_KEY) return null;
    const prompt = `Eres un narrador épico. Escribe una frase de inicio para un juego de ${juego}. Máximo 20 palabras.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Error Gemini:", err.message);
    return null;
  }
}

// 4. LÓGICA DE JUEGO
async function ejecutarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  if (esSlash) await ctx.deferReply();

  const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
  const backup = tipo === 'hambre' ? '¡Que la suerte esté siempre de su lado!' : '¡Jugador eliminado!';
  
  const narracion = await narrarInicio(titulo);
  const respuesta = `${titulo}\n\n${narracion || backup}`;

  if (esSlash) await ctx.editReply(respuesta);
  else await ctx.reply(respuesta);
}

// 5. EVENTOS
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Patroclo 3 conectado como ${c.user.tag}`);
  
  // Registrar Slash Commands
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Inicia los Juegos del Hambre'),
    new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
  ].map(cmd => cmd.toJSON());

  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
  } catch (e) { console.error("Error comandos:", e); }
});

// Comandos por mensaje (!) - CORREGIDO
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') return message.reply('🏓 ¡Pong!');

  if (message.content === '!hambre' || message.content === '!calamar') {
    const tipo = message.content.includes('hambre') ? 'hambre' : 'calamar';
    // Creamos un contexto compatible para la función
    const ctx = { 
      reply: (text) => message.channel.send(text),
      isChatInputCommand: () => false 
    };
    await ejecutarJuego(ctx, tipo);
  }
});

// Comandos por barra (/)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  await ejecutarJuego(interaction, interaction.commandName);
});

// 6. LOGIN Y SERVER
client.login(process.env.DISCORD_TOKEN);

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3 con Gemini activo');
}).listen(process.env.PORT || 8080);
