const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');

console.log("🚀 [INICIO] Arrancando Patroclo 3...");

// 1. CONFIGURACIÓN DEL BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 2. SERVIDOR PARA RENDER (Arranca de inmediato)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo ONLINE');
}).listen(process.env.PORT || 8080, () => {
  console.log("🌐 [WEB] Servidor HTTP escuchando.");
});

// 3. EVENTO READY
client.once(Events.ClientReady, (c) => {
  console.log(`✅ [DISCORD] ¡CONECTADO! Bot: ${c.user.tag}`);
});

// 4. COMANDOS SIMPLES
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;
  if (msg.content.toLowerCase() === '!ping') {
    await msg.reply('🏓 ¡Pong! Patroclo está vivo.');
  }
});

// 5. LOGIN (Con reporte de error directo)
console.log("🛠️ [LOGIN] Intentando entrar a Discord...");

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN || TOKEN.length < 10) {
  console.error("❌ [ERROR] El token no está en las variables de Render o es inválido.");
} else {
  client.login(TOKEN)
    .then(() => console.log("✨ [LOGIN] Proceso completado sin errores."))
    .catch(err => {
      console.error("❌ [ERROR DE LOGIN]:", err.message);
    });
}

// Para que el proceso no muera
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});
