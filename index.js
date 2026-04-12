const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. Servidor para Render
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3 operativo');
}).listen(process.env.PORT || 8080);

// 2. Comandos
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Juego del Calamar'),
].map(command => command.toJSON());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// 3. Función de IA con Timeout de 5 segundos
async function pedirIA(prompt) {
  try {
    const fuente = process.env.GROQ_API_KEY ? 'groq' : 'gemini';
    
    // Si no hay ninguna Key, ni intentamos
    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) return null;

    const config = { timeout: 5000 }; // Si tarda más de 5s, aborta

    if (fuente === 'groq') {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        ...config
      });
      return res.data.choices[0].message.content;
    }
    return null;
  } catch (e) {
    console.error("Error llamando a la IA:", e.message);
    return null;
  }
}

// 4. Lógica de juego
async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  
  if (esSlash) await ctx.deferReply();
  else await ctx.channel.sendTyping();

  const prompt = `Intro épica corta para ${tipo}.`;
  const narracion = await pedirIA(prompt);

  const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
  const respuestaDefault = "¡La arena está lista! Que comience la carnicería.";
  const finalMsg = `${titulo}\n\n${narracion || respuestaDefault}`;

  if (esSlash) await ctx.editReply(finalMsg);
  else await ctx.channel.send(finalMsg);
}

// 5. Eventos
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ ${c.user.tag} conectado`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
  } catch (e) { console.error(e); }
});

client.on(Events.InteractionCreate, async i => {
  if (i.isChatInputCommand()) await iniciarJuego(i, i.commandName);
});

client.on(Events.MessageCreate, async m => {
  if (m.author.bot || !m.content.startsWith('!')) return;
  const cmd = m.content.slice(1).toLowerCase();
  if (['hambre', 'calamar'].includes(cmd)) await iniciarJuego(m, cmd);
});

client.login(process.env.DISCORD_TOKEN);
