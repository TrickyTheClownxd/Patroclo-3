const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. SERVIDOR HTTP INMEDIATO (Para que Render no dé error de puerto)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3: Sistema de Monitoreo Activo');
}).listen(process.env.PORT || 8080, () => {
  console.log("🌐 [WEB] Servidor levantado. Render detecta el servicio.");
});

console.log("🚀 [SISTEMA] Iniciando Patroclo 3...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. CONFIGURACIÓN DE COMANDOS
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

// 3. IA (CON TIMEOUT)
async function pedirIA(tipo) {
  try {
    if (!process.env.GROQ_API_KEY) return null;
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: `Frase corta épica para inicio de ${tipo}` }]
    }, {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      timeout: 3000
    });
    return res.data.choices[0].message.content;
  } catch (err) { return null; }
}

// 4. EVENTOS
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [DISCORD] LOGUEADO COMO: ${c.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 [BOT] Comandos sincronizados.');
  } catch (e) {
    console.error('❌ [ERROR REST]:', e.message);
  }
});

client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand()) return;
  await i.deferReply();
  const narracion = await pedirIA(i.commandName);
  await i.editReply(`**${i.commandName.toUpperCase()}**\n${narracion || "¡Que empiece el juego!"}`);
});

client.on(Events.MessageCreate, async m => {
  if (m.author.bot || !m.content.startsWith('!')) return;
  const cmd = m.content.slice(1).toLowerCase();
  if (['hambre', 'calamar'].includes(cmd)) {
    await m.channel.sendTyping();
    const narracion = await pedirIA(cmd);
    await m.channel.send(narracion || "¡Iniciando juego!");
  }
});

// 5. LOGIN CON CAPTURA DE ERRORES TOTAL
console.log("🛠️ [SISTEMA] Intentando login en Discord...");

// Capturadores de errores globales del cliente
client.on('error', (err) => console.error("❌ [CLIENT ERROR]:", err));
client.on('warn', (m) => console.warn("⚠️ [WARN]:", m));

if (!process.env.DISCORD_TOKEN) {
    console.log("❌ [DEBUG] ERROR: No hay variable DISCORD_TOKEN en Render.");
} else {
    console.log("🔑 [DEBUG] Token detectado (Largo: " + process.env.DISCORD_TOKEN.length + ")");
    
    client.login(process.env.DISCORD_TOKEN)
        .then(() => console.log("✅ [SISTEMA] El proceso de login terminó con éxito."))
        .catch(err => {
            console.error("❌ [FALLO EL LOGIN]:");
            console.error("Mensaje:", err.message);
            console.error("Código de error:", err.code);
            
            if (err.message.includes("Privileged intents")) {
                console.error("👉 SOLUCIÓN: Anda a la pestaña 'Bot' en Discord Developer Portal y activa los 3 Gateway Intents.");
            }
            if (err.message.includes("invalid token")) {
                console.error("👉 SOLUCIÓN: El token está mal copiado o es viejo. Resetéalo y pégalo de nuevo.");
            }
        });
}
