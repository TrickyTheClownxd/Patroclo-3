const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

console.log("🚀 [SISTEMA] Iniciando Patroclo 3...");

// --- 1. SERVIDOR HTTP (PARA RENDER) ---
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Patroclo 3 esta online');
}).listen(process.env.PORT || 8080, () => {
  console.log("🌐 [WEB] Servidor HTTP listo en puerto " + (process.env.PORT || 8080));
});

// --- 2. CONFIGURACIÓN DEL BOT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('hambre')
    .setDescription('Inicia el Juego del Hambre con intro de IA'),
  new SlashCommandBuilder()
    .setName('calamar')
    .setDescription('Inicia el Juego del Calamar con intro de IA'),
].map(cmd => cmd.toJSON());

// --- 3. LÓGICA DE IA (CON TIEMPO LÍMITE) ---
async function pedirIA(tipo) {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), 3000)
  );

  const tareaIA = (async () => {
    try {
      if (!process.env.GROQ_API_KEY) return null;
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: `Frase épica de 10 palabras para el inicio de ${tipo}` }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
      });
      return res.data.choices[0].message.content;
    } catch (err) {
      return null;
    }
  })();

  return Promise.race([tareaIA, timeout]).catch(() => null);
}

// --- 4. FUNCIÓN DEL JUEGO ---
async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  console.log(`🎮 [JUEGO] Comando recibido: ${tipo}`);

  try {
    if (esSlash) await ctx.deferReply();
    else await ctx.channel.sendTyping();

    const narracion = await pedirIA(tipo);
    const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
    const msgBase = tipo === 'hambre' ? "¡Que los tributos luchen!" : "¡Jugadores, prepárense!";
    
    const respuestaFinal = `${titulo}\n\n${narracion || msgBase}`;

    if (esSlash) await ctx.editReply(respuestaFinal);
    else await ctx.channel.send(respuestaFinal);
  } catch (err) {
    console.error("❌ [ERROR] En iniciarJuego:", err.message);
  }
}

// --- 5. EVENTOS ---
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [DISCORD] Online como ${c.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 [BOT] Comandos sincronizados.');
  } catch (e) {
    console.error('❌ [ERROR] Sincronizando comandos:', e.message);
  }
});

client.on(Events.InteractionCreate, async i => {
  if (i.isChatInputCommand()) await iniciarJuego(i, i.commandName);
});

client.on(Events.MessageCreate, async m => {
  if (m.author.bot || !m.content.startsWith('!')) return;
  const cmd = m.content.slice(1).toLowerCase();
  if (['hambre', 'calamar'].includes(cmd)) await iniciarJuego(m, cmd);
});

// --- 6. LOGIN CON DEBUG AVANZADO ---
console.log("🛠️ [SISTEMA] Intentando conectar a Discord...");

if (!process.env.DISCORD_TOKEN) {
    console.error("❌ [ERROR] No existe la variable DISCORD_TOKEN en Render.");
} else {
    client.login(process.env.DISCORD_TOKEN)
        .then(() => console.log("✅ [SISTEMA] Login exitoso."))
        .catch(err => {
            console.error("❌ [ERROR] Falló el login:");
            console.error("Mensaje:", err.message);
            if (err.message.includes("Privileged intents")) {
                console.error("👉 REVISA: Activá los 3 Gateway Intents en el Discord Developer Portal y guardá cambios.");
            }
            if (err.message.includes("An invalid token")) {
                console.error("👉 REVISA: El Token de Render no coincide con el de Discord.");
            }
        });
}
