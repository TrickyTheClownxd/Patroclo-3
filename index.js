const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const http = require('http');
const axios = require('axios');

// --- 1. SERVIDOR HTTP PARA RENDER ---
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Patroclo 3 está operando correctamente');
}).listen(process.env.PORT || 8080);

// --- 2. CONFIGURACIÓN DEL CLIENTE ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- 3. CONFIGURACIÓN DE COMANDOS ---
const commands = [
  new SlashCommandBuilder()
    .setName('hambre')
    .setDescription('Inicia el Juego del Hambre con intro de IA'),
  new SlashCommandBuilder()
    .setName('calamar')
    .setDescription('Inicia el Juego del Calamar con intro de IA'),
].map(cmd => cmd.toJSON());

// --- 4. LÓGICA DE IA CON TIMEOUT SEGURO ---
async function pedirIA(tipo) {
  // Promesa de tiempo límite (3 segundos)
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('timeout')), 3000)
  );

  const tareaIA = (async () => {
    try {
      if (!process.env.GROQ_API_KEY) return null;
      
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: `Escribe una frase épica y muy corta de inicio para ${tipo === 'hambre' ? 'Los Juegos del Hambre' : 'El Juego del Calamar'}. Máximo 12 palabras.` }]
      }, {
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
      });
      return res.data.choices[0].message.content;
    } catch (err) {
      return null;
    }
  })();

  // El primero que termine gana: la IA o el reloj de 3s
  return Promise.race([tareaIA, timeout]).catch(() => null);
}

// --- 5. FUNCIÓN PARA INICIAR EL JUEGO ---
async function iniciarJuego(ctx, tipo) {
  const esSlash = ctx.isChatInputCommand && ctx.isChatInputCommand();
  
  try {
    // AVISO INMEDIATO A DISCORD (Crucial para evitar el error)
    if (esSlash) {
      await ctx.deferReply(); 
    } else {
      await ctx.channel.sendTyping();
    }

    const narracion = await pedirIA(tipo);
    const titulo = tipo === 'hambre' ? '🔥 **JUEGOS DEL HAMBRE**' : '🦑 **JUEGO DEL CALAMAR**';
    const textoDefault = tipo === 'hambre' 
      ? "¡Que los tributos comiencen la batalla por la supervivencia!" 
      : "¡Jugadores, prepárense! El primer juego está por comenzar.";
    
    const respuestaFinal = `${titulo}\n\n${narracion || textoDefault}`;

    // RESPONDER SEGÚN EL TIPO DE MENSAJE
    if (esSlash) {
      await ctx.editReply(respuestaFinal);
    } else {
      await ctx.channel.send(respuestaFinal);
    }
  } catch (err) {
    console.error("❌ Error en iniciarJuego:", err.message);
    if (esSlash) await ctx.editReply("⚠️ Hubo un problema técnico, ¡pero el juego arranca igual!");
  }
}

// --- 6. EVENTOS ---
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ DISCORD: Conectado como ${c.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(c.user.id), { body: commands });
    console.log('🚀 Comandos de barra sincronizados.');
  } catch (e) {
    console.error('❌ Error registrando comandos:', e.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (['hambre', 'calamar'].includes(interaction.commandName)) {
    await iniciarJuego(interaction, interaction.commandName);
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.startsWith('!')) return;
  const cmd = message.content.slice(1).toLowerCase();
  if (['hambre', 'calamar'].includes(cmd)) {
    await iniciarJuego(message, cmd);
  }
});

// --- 7. LOGIN ---
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ ERROR DE LOGIN:", err.message);
});
