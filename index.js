const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

let partidas = {};

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

// Comando para iniciar juegos
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hambre') {
    iniciarJuego(interaction, 'hambre');
  }

  if (interaction.commandName === 'calamar') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('temp1').setLabel('Temporada 1').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('temp2').setLabel('Temporada 2').setStyle(ButtonStyle.Secondary)
      );
    await interaction.reply({ content: '🦑 Elige la temporada del Juego del Calamar:', components: [row] });
  }
});

// Elección de temporada Calamar
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'temp1' || interaction.customId === 'temp2') {
    const temporada = interaction.customId === 'temp1' ? 'Temporada 1' : 'Temporada 2';
    iniciarJuego(interaction, 'calamar', temporada);
  } else {
    manejarAccion(interaction);
  }
});

// Iniciar juego
async function iniciarJuego(interaction, tipo, temporada = null) {
  const jugadores = interaction.guild.members.cache.filter(m => !m.user.bot).map(m => m.user.id);
  partidas[interaction.guildId] = { tipo, temporada, ronda: 0, vivos: {} };

  jugadores.forEach(id => {
    partidas[interaction.guildId].vivos[id] = { vida: 100, monedas: 5, inventario: [] };
  });

  await interaction.reply(`🎯 ¡${tipo === 'hambre' ? 'Juego del Hambre' : 'Juego del Calamar ('+temporada+')'} iniciado con ${jugadores.length} jugadores!`);
  siguienteRonda(interaction.guildId, interaction.channel);
}

// Avanzar rondas
async function siguienteRonda(guildId, channel) {
  const partida = partidas[guildId];
  partida.ronda++;

  let rondasCanon;
  if (partida.tipo === 'hambre') {
    rondasCanon = [
      "Cornucopia inicial",
      "Supervivencia en la arena",
      "Alianzas y traiciones",
      "Intervenciones de los Vigilantes",
      "Patrocinadores",
      "Clímax final en la Cornucopia"
    ];
  } else {
    rondasCanon = partida.temporada === 'Temporada 1'
      ? ["Luz roja, Luz verde", "Dalgona", "Tug of War", "Canicas", "Puente de cristal", "Squid Game"]
      : ["Red Light, Green Light (nuevo)", "Six-Legged Pentathlon", "Mingle Game", "Bathroom Fight", "Rebellion", "Minijuegos coreanos"];
  }

  const rondaActual = rondasCanon[partida.ronda - 1];
  if (!rondaActual) {
    channel.send("🏆 ¡El juego ha terminado!");
    return;
  }

  channel.send(`🎲 Ronda ${partida.ronda}: ${rondaActual}`);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('curarse').setLabel('Curarse').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('comprar').setLabel('Comprar').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('atacar').setLabel('Atacar').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('esconderse').setLabel('Esconderse').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('alianza').setLabel('Formar alianza').setStyle(ButtonStyle.Secondary)
    );

  channel.send({ content: 'Elige tu acción:', components: [row] });
}

// Manejo de acciones
async function manejarAccion(interaction) {
  const partida = partidas[interaction.guildId];
  const jugador = partida?.vivos[interaction.user.id];
  if (!jugador) {
    return interaction.reply({ content: 'No estás en la partida.', ephemeral: true });
  }

  let texto = "";
  switch (interaction.customId) {
    case 'curarse':
      jugador.vida = Math.min(100, jugador.vida + 20);
      texto = `${interaction.user.username} usa medicina y ahora tiene ${jugador.vida} de vida.`;
      break;
    case 'comprar':
      if (jugador.monedas >= 3) {
        jugador.monedas -= 3;
        jugador.inventario.push('arma');
        texto = `${interaction.user.username} recibe un arma de patrocinadores. Monedas restantes: ${jugador.monedas}.`;
      } else {
        return interaction.reply({ content: 'No tienes suficientes monedas.', ephemeral: true });
      }
      break;
    case 'atacar':
      texto = `${interaction.user.username} intenta atacar a otro jugador...`;
      break;
    case 'esconderse':
      texto = `${interaction.user.username} se esconde para evitar problemas.`;
      break;
    case 'alianza':
      texto = `${interaction.user.username} busca formar una alianza. ¿Será traicionado más adelante?`;
      break;
  }

  const narracion = await manejarIA(texto);
  await interaction.reply(narracion);
}

// Flujo combinado Groq + Gemini
async function manejarIA(texto) {
  try {
    // Groq: resultado rápido
    const groqRes = await axios.post(process.env.GROQ_API_URL, { prompt: texto }, {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
    });
    const resultadoGroq = groqRes.data.resultado || texto;

    // Gemini: narración inmersiva
    const geminiRes = await axios.post(process.env.GEMINI_API_URL, { prompt: `Narra de forma dramática: ${resultadoGroq}` }, {
      headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` }
    });
    return geminiRes.data.narracion || resultadoGroq;
  } catch (err) {
    console.error(err);
    return texto;
  }
}

client.login(process.env.DISCORD_TOKEN);