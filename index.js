const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
require('dotenv').config();
const http = require('http');

// --- 1. CONFIGURACIÓN DE IA (Doble API) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- 2. CONFIGURACIÓN DEL BOT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- 3. NARRACIÓN CON IA (Prioridad Gemini, Respaldo Groq) ---
async function obtenerNarracionIA(juego) {
  const prompt = `Eres un narrador épico y oscuro. Escribe una frase de inicio de máximo 15 palabras para un juego de ${juego}.`;

  // Intento con Gemini
  try {
    if (process.env.GEMINI_API_KEY) {
      console.log(`🤖 [IA] Consultando a Gemini para ${juego}...`);
      const result = await geminiModel.generateContent(prompt);
      return result.response.text();
    }
  } catch (err) {
    console.error("⚠️ [IA] Gemini falló, intentando con Groq...");
  }

  // Respaldo con Groq
  try {
    if (process.env.GROQ_API_KEY) {
      console.log(`🤖 [IA] Consultando a Groq para ${juego}...`);
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "system", content: "Eres un narrador épico y oscuro." }, { role: "user", content: prompt }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 4000
      });
      return response.data.choices[0].message.content;
    }
  } catch (error) {
    console.error("❌ [IA] Ambas IAs fallaron:", error.message);
    return null;
  }
}

// --- 4. FUNCIÓN GENÉRICA PARA INICIAR JUEGO (Tu Lógica Base) ---
async function iniciarJuego(ctx, tipo, originalMsg = null) {
  const guildName = originalMsg ? originalMsg.guild.name : ctx.guild.name;
  console.log(`🎮 [JUEGO] Iniciando ${tipo} en: [${guildName}]`);

  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  if (esSlash) await ctx.deferReply();
  else await ctx.channel.sendTyping();

  const titulo = tipo === 'hambre' ? 'Los Juegos del Hambre' : 'El Juego del Calamar';
  const emoji = tipo === 'hambre' ? '🔥' : '🦑';
  const backup = tipo === 'hambre' ? '¡Comienza la partida del **Juego del Hambre**!' : '¡Comienza la partida del **Juego del Calamar**!';

  const narracion = await obtenerNarracionIA(titulo);
  const respuesta = `${emoji} **${titulo.toUpperCase()}**\n\n${narracion || backup}`;

  if (esSlash) await ctx.editReply(respuesta);
  else await ctx.reply(respuesta);
  
  console.log(`✅ [RESPUESTA] Enviada con éxito a ${guildName}`);
}

// --- 5. EVENTOS Y LOGS DE DISCORD ---
client.once(Events.ClientReady, async (c) => {
  console.log(`\n-----------------------------------------`);
  console.log(`✅ [SISTEMA] Patroclo 3 online: ${c.user.tag}`);
  console.log(`🌍 [INFO] Servidores: ${c.guilds.cache.size}`);
  c.guilds.cache.forEach(g => console.log(`   - ${g.name} (${g.id})`));
  console.log(`-----------------------------------------\n`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder().setName('hambre').setDescription('Inicia el Juego del Hambre'),
    new SlashCommandBuilder().setName('calamar').setDescription('Inicia el Juego del Calamar'),
  ].map(cmd => cmd.toJSON());

  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('✨ [SISTEMA] Slash commands sincronizados.');
  } catch (err) { console.error('❌ [ERROR REST]:', err); }
});

// Mensajes clásicos (!)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const content = message.content.toLowerCase().trim();

  if (content === '!ping') {
    console.log(`📩 [PING] Recibido de ${message.author.tag}`);
    return message.reply('🏓 ¡Pong! El sistema está operativo.');
  }

  if (content === '!hambre' || content === '!calamar') {
    console.log(`📩 [COMANDO] !${content.slice(1)} por ${message.author.tag}`);
    const tipo = content.includes('hambre') ? 'hambre' : 'calamar';
    // Adaptamos el contexto para que funcione con tu lógica base
    const ctx = { 
      reply: (msg) => message.channel.send(msg),
      channel: message.channel,
      guild: message.guild,
      isChatInputCommand: () => false 
    };
    await iniciarJuego(ctx, tipo, message);
  }
});

// Comandos de barra (/)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  console.log(`🖱️ [SLASH] /${interaction.commandName} por ${interaction.user.tag}`);
  await iniciarJuego(interaction, interaction.commandName);
});

// --- 6. LOGIN Y SERVIDOR ÚNICO ---
client.login(process.env.DISCORD_TOKEN).catch(e => console.error("❌ [LOGIN ERROR]", e.message));

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3: Activo y Fusionado');
}).listen(process.env.PORT || 8080, () => {
  console.log(`🌐 [WEB] Servidor HTTP escuchando en puerto ${process.env.PORT || 8080}`);
});
