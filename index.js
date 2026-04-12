const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// 1. SERVIDOR HTTP (Indispensable para Render)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3: Activo');
}).listen(process.env.PORT || 8080, () => {
  console.log("🌐 [WEB] Puerto 8080 abierto.");
});

console.log("🚀 [SISTEMA] Iniciando Patroclo 3...");

// 2. CONFIGURACIÓN DEL CLIENTE (Con más tiempo de espera para la red)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  rest: { timeout: 60000 } // 60 segundos de paciencia para la API
});

// 3. COMANDOS
const commands = [
  new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
  new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
].map(cmd => cmd.toJSON());

// 4. LÓGICA DE IA
async function pedirIA(tipo) {
  try {
    if (!process.env.GROQ_API_KEY) return null;
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: `Frase corta épica para inicio de ${tipo}` }]
    }, {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      timeout: 5000
    });
    return res.data.choices[0].message.content;
  } catch (err) { return null; }
}

// 5. EVENTOS
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ [DISCORD] ¡CONECTADO! Usuario: ${c.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 [BOT] Comandos sincronizados.');
  } catch (e) { console.error('❌ [ERROR REST]:', e.message); }
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

// 6. LOGIN CON ESCÁNER DE TOKEN
console.log("🛠️ [SISTEMA] Intentando login en Discord...");

if (!process.env.DISCORD_TOKEN) {
    console.log("❌ [DEBUG] ERROR: Falta la variable DISCORD_TOKEN en Render.");
} else {
    // Verificación de estructura (Un token real tiene 3 partes separadas por puntos)
    const partes = process.env.DISCORD_TOKEN.split('.');
    console.log(`🔑 [DEBUG] Info del Token:`);
    console.log(`   - Partes detectadas: ${partes.length}`);
    console.log(`   - Longitud total: ${process.env.DISCORD_TOKEN.length}`);
    console.log(`   - Inicio: ${process.env.DISCORD_TOKEN.substring(0, 10)}...`);

    if (partes.length !== 3) {
        console.warn("⚠️ [ATENCIÓN] El token no parece tener el formato estándar de Discord (3 partes).");
    }

    client.login(process.env.DISCORD_TOKEN).catch(err => {
      console.error("❌ [FALLO EL LOGIN]:", err.message);
      if (err.message.includes("Privileged intents")) {
          console.error("👉 REVISÁ: Activa los Intents en el portal de Discord y dale a 'Save Changes'.");
      }
    });
}
