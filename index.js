const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. Servidor para Render (Fundamental)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3 está listo para la acción');
}).listen(process.env.PORT || 8080);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. Comandos
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

// 3. Función IA que no rompe el bot
async function obtenerNarracionIA(tipo) {
  const prompt = `Escribe una frase épica y corta de inicio para ${tipo === 'hambre' ? 'Los Juegos del Hambre' : 'El Juego del Calamar'}. Máximo 15 palabras.`;
  
  try {
    // Intentamos con Groq (que es más rápido)
    if (process.env.GROQ_API_KEY) {
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 4000 // Si en 4 segundos no responde, pasamos al plan B
      });
      return res.data.choices[0].message.content;
    }
  } catch (e) {
    console.log("Groq falló o tardó mucho, usando mensaje predefinido.");
  }
  return tipo === 'hambre' ? "¡Que los tributos comiencen la batalla!" : "¡Jugadores, prepárense para el primer juego!";
}

// 4. Lógica de inicio de juego
async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  
  try {
    if (esSlash) await ctx.deferReply();
    else await ctx.channel.sendTyping();

    const narracion = await obtenerNarracionIA(tipo);
    const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
    const finalMsg = `${titulo}\n\n${narracion}`;

    if (esSlash) await ctx.editReply(finalMsg);
    else await ctx.channel.send(finalMsg);
  } catch (err) {
    console.error("Error en el juego:", err);
  }
}

// 5. Eventos
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ ${c.user.tag} ONLINE`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log("🚀 Comandos sincronizados");
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

// 6. Login
client.login(process.env.DISCORD_TOKEN).catch(err => console.log("Error de Token:", err.message));
