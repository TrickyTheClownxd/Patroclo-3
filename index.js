const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require("fs");
const http = require("http");

// ===== IMPORTS =====
const {
  eventosCornucopia,
  eventosHambre,
  eventosCalamar
} = require('./eventos.js');

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== UTILS =====
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chance = p => Math.random() < p;

// ===== LOAD/SAVE =====
const loadMemory = () => {
  try {
    return JSON.parse(fs.readFileSync("memory.json"));
  } catch (e) {
    return {
      partidaActiva: false,
      pausado: false,
      modo: "hambre",
      temporada: 1,
      jugadores: [],
      ronda: 0,
      kills: {},
      muertosTotales: 0,
      historial: [],
      traiciones: [],
      acciones: {},
      canalId: null,
      alianzas: [],
      bounties: [],
      clima: "☀️ Normal",
      esDeDia: true,
      zonas: ["bosque", "río", "colinas", "cueva", "ruinas"],
      zonasCerradas: [],
      eventoActual: null,
      loopActivo: false,
      ultimaInteraccion: 0
    };
  }
};

const saveMemory = m => {
  try {
    fs.writeFileSync("memory.json", JSON.stringify(m, null, 2));
  } catch (e) {
    console.error("❌ Error guardando memoria:", e);
  }
};

const loadDB = () => {
  try {
    return JSON.parse(fs.readFileSync("db.json"));
  } catch (e) {
    return {
      players: {},
      global: { eventosDesbloqueados: [], partidasJugadas: 0, killsTotales: 0 },
      apuestas: {},
      historialJugadores: {},
      tienda: { cuchillo: { precio: 2 }, arco: { precio: 3 }, botiquin: { precio: 2 } },
      economia: { moneda: "kills" }
    };
  }
};

const saveDB = data => {
  try {
    fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("❌ Error guardando DB:", e);
  }
};

// ===== NORMALIZADOR =====
function normalizarMem(mem) {
  mem.partidaActiva ??= false;
  mem.pausado ??= false;
  mem.modo ??= "hambre";
  mem.temporada ??= 1;
  mem.jugadores ??= [];
  mem.kills ??= {};
  mem.muertosTotales ??= 0;
  mem.historial ??= [];
  mem.traiciones ??= [];
  mem.acciones ??= {};
  mem.canalId ??= null;
  mem.alianzas ??= [];
  mem.bounties ??= [];
  mem.clima ??= "☀️ Normal";
  mem.esDeDia ??= true;
  mem.zonas ??= ["bosque", "río", "colinas", "cueva", "ruinas"];
  mem.zonasCerradas ??= [];
  mem.eventoActual ??= null;
  mem.loopActivo ??= false;
  mem.ultimaInteraccion ??= 0;
  mem.muertesDia ??= [];
  mem.ronda ??= 1;
  return mem;
}

// ===== MATAR =====
function matar(j, mem, killer = null) {
  if (!j || !j.vivo) return;

  if (chance(0.25) && !j.herido) {
    j.herido = true;
    return;
  }

  j.vivo = false;
  mem.muertosTotales++;
  mem.muertesDia.push(j.id);
  mem.historial.push({
    victima: j.id,
    asesino: killer?.id || null,
    ronda: mem.ronda
  });

  const db = loadDB();
  db.global.killsTotales = (db.global.killsTotales || 0) + 1;

  if (killer) {
    mem.kills[killer.id] = (mem.kills[killer.id] || 0) + 1;

    if (!db.players[killer.id]) {
      db.players[killer.id] = { kills: 0, victorias: 0, dinero: 0, items: [] };
    }
    db.players[killer.id].kills = (db.players[killer.id].kills || 0) + 1;
    db.players[killer.id].dinero = (db.players[killer.id].dinero || 0) + 1;

    if (mem.bounties && mem.bounties.includes(j.id)) {
      mem.kills[killer.id] += 3;
      db.players[killer.id].kills += 3;
      db.players[killer.id].dinero += 3;
    }

    const alianza = mem.alianzas.find(a => a.includes(killer.id));
    if (alianza) {
      alianza.forEach(id => {
        if (id !== killer.id) {
          mem.kills[id] = (mem.kills[id] || 0) + 1;
          if (!db.players[id]) {
            db.players[id] = { kills: 0, victorias: 0, dinero: 0, items: [] };
          }
          db.players[id].kills = (db.players[id].kills || 0) + 1;
          db.players[id].dinero = (db.players[id].dinero || 0) + 1;
        }
      });
    }
  }

  if (!db.historialJugadores[j.id]) {
    db.historialJugadores[j.id] = { partidas: 0, kills: 0, victorias: 0 };
  }
  db.historialJugadores[j.id].partidas = (db.historialJugadores[j.id].partidas || 0) + 1;

  saveDB(db);
}

// ===== PROBABILIDAD =====
function calcularProb(a, t, mem) {
  let prob = 0.4;

  if (a.item === "cuchillo") prob += 0.3;
  if (a.item === "arco") prob += 0.2;

  if (a.herido) prob -= 0.2;
  if (t.herido) prob += 0.2;

  if (a.zona !== t.zona) prob -= 0.5;
  if (t.escondido) prob -= 0.3;
  if (!mem.esDeDia) prob -= 0.1;

  const alianza = mem.alianzas.find(a => a.includes(a.id) && a.includes(t.id));
  if (alianza) prob -= 0.3;

  return Math.max(0, Math.min(1, prob));
}

// ===== EJECUTAR EVENTO NARRATIVO =====
async function ejecutarEventoNarrativo(mem, channel) {
  let evento;
  let esCalamar = false;

  if (mem.modo === "calamar" && chance(0.3)) {
    evento = pick(eventosCalamar);
    esCalamar = true;
  } else {
    evento = pick(eventosHambre);
  }

  if (!evento) return;

  const vivos = mem.jugadores.filter(j => j.vivo);
  if (vivos.length === 0) return;

  let a = pick(vivos);
  let b = pick(vivos.filter(j => j.id !== a.id));
  let c = pick(vivos.filter(j => j.id !== a.id && j.id !== b?.id));
  let d = pick(vivos.filter(j => j.id !== a.id && j.id !== b?.id && j.id !== c?.id));

  let texto = evento.t;
  let muertos = [];

  texto = texto.replace(/{a}/g, `<@${a.id}>`);
  if (b) texto = texto.replace(/{b}/g, `<@${b.id}>`);
  if (c) texto = texto.replace(/{c}/g, `<@${c.id}>`);
  if (d) texto = texto.replace(/{d}/g, `<@${d.id}>`);

  if (evento.k) {
    const kills = evento.k;

    if (kills.includes("random_group")) {
      const numMuertos = Math.floor(vivos.length * (0.25 + Math.random() * 0.25));
      const seleccionados = vivos.sort(() => Math.random() - 0.5).slice(0, numMuertos);
      seleccionados.forEach(j => {
        matar(j, mem);
        muertos.push(j.id);
      });
    } else if (kills.includes("random_ab")) {
      const victima = chance(0.5) ? a : b;
      if (victima) {
        matar(victima, mem);
        muertos.push(victima.id);
      }
    } else {
      kills.forEach(id => {
        if (id === "a" && a) { matar(a, mem); muertos.push(a.id); }
        if (id === "b" && b) { matar(b, mem); muertos.push(b.id); }
        if (id === "c" && c) { matar(c, mem); muertos.push(c.id); }
        if (id === "d" && d) { matar(d, mem); muertos.push(d.id); }
      });
    }
  }

  mem.eventoActual = evento.t;

  const embed = new EmbedBuilder()
    .setTitle(esCalamar ? "🦑 Evento de Calamar" : "🔥 Evento de los Juegos del Hambre")
    .setColor(esCalamar ? 0xFF4500 : 0xFF6347)
    .setDescription(texto)
    .setFooter({ text: `Ronda ${mem.ronda} • ${mem.clima}` });

  await channel.send({ embeds: [embed] });

  if (muertos.length > 0) {
    const listaMuertos = muertos.map(id => `💀 <@${id}>`).join("\n");
    const embedMuertos = new EmbedBuilder()
      .setTitle("🪦 Muertos en el evento")
      .setColor(0xFF0000)
      .setDescription(listaMuertos);
    await channel.send({ embeds: [embedMuertos] });
  }

  saveMemory(mem);
}

// ===== CORNUCOPIA =====
async function cornucopia(mem, channel) {
  const vivos = mem.jugadores.filter(j => j.vivo);
  if (vivos.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle("🏕️ ¡La Cornucopia está abierta!")
    .setColor(0xFFD700)
    .setDescription("Los tributos corren hacia el centro...");

  await channel.send({ embeds: [embed] });
  await sleep(2000);

  for (const jugador of vivos) {
    const evento = pick(eventosCornucopia);
    let texto = evento.t.replace(/{a}/g, `<@${jugador.id}>`);

    if (evento.item) {
      jugador.item = evento.item;
      texto += ` 🎒 Consiguió: **${evento.item}**`;
    }

    if (evento.k && evento.k.includes("a")) {
      matar(jugador, mem);
      texto += " 💀";
    }

    const embedEvento = new EmbedBuilder()
      .setDescription(texto)
      .setColor(0x00FF00);
    await channel.send({ embeds: [embedEvento] });
    await sleep(1000);
  }

  saveMemory(mem);
}

// ===== LOOP PRINCIPAL =====
let loopTimeout = null;

async function loop(channel) {
  if (loopTimeout) clearTimeout(loopTimeout);

  loopTimeout = setTimeout(() => {
    const mem = normalizarMem(loadMemory());
    mem.loopActivo = false;
    mem.partidaActiva = false;
    saveMemory(mem);
    console.log("⏰ Loop terminado por timeout de seguridad");
  }, 60 * 60 * 1000);

  try {
    while (true) {
      let mem = normalizarMem(loadMemory());

      if (!mem.partidaActiva || mem.pausado) break;

      const vivos = mem.jugadores.filter(j => j.vivo);
      if (vivos.length <= 1) break;

      // ===== INICIO RONDA =====
      const embed = new EmbedBuilder()
        .setTitle(`🔄 Ronda ${mem.ronda}`)
        .setColor(0x0099FF)
        .addFields(
          { name: "👥 Vivos", value: `${vivos.length}`, inline: true },
          { name: "💀 Muertos", value: `${mem.muertosTotales}`, inline: true },
          { name: "🌓 Momento", value: mem.esDeDia ? "☀️ Día" : "🌙 Noche", inline: true },
          { name: "🎮 Modo", value: mem.modo === "calamar" ? "🦑 Calamar" : "🔥 Hambre", inline: true },
          { name: "🌦️ Clima", value: mem.clima, inline: true },
          { name: "🗺️ Zonas abiertas", value: mem.zonas.filter(z => !mem.zonasCerradas.includes(z)).join(", ") || "Ninguna", inline: false }
        )
        .setFooter({ text: "Usa !accion para moverte, atacar, esconderte o curarte" });

      await channel.send({ embeds: [embed] });
      await channel.send("🕒 10s para acciones (!accion ...)");
      mem.ultimaInteraccion = Date.now();

      await sleep(10000);

      mem = normalizarMem(loadMemory());

      // ===== PROCESAR ACCIONES =====
      for (const j of mem.jugadores.filter(x => x.vivo)) {
        const acc = mem.acciones[j.id];
        if (!acc) continue;

        switch (acc.tipo) {
          case "moverse":
            if (acc.zona && !mem.zonasCerradas.includes(acc.zona) && mem.zonas.includes(acc.zona)) {
              j.zona = acc.zona;
              await channel.send(`🚶 <@${j.id}> fue a ${acc.zona}`);
            }
            break;

          case "esconderse":
            j.escondido = true;
            await channel.send(`🫥 <@${j.id}> se escondió`);
            break;

          case "curar":
            if (j.herido) {
              j.herido = false;
              await channel.send(`💚 <@${j.id}> se curó`);
            } else {
              await channel.send(`💚 <@${j.id}> ya está sano`);
            }
            break;

          case "atacar":
            if (acc.objetivo) {
              const target = mem.jugadores.find(x => x.id === acc.objetivo);
              if (target && target.vivo) {
                let prob = calcularProb(j, target, mem);
                if (chance(prob)) {
                  matar(target, mem, j);
                  await channel.send(`⚔️ <@${j.id}> mató a <@${target.id}>`);
                } else {
                  await channel.send(`⚠️ <@${j.id}> falló`);
                }
              }
            }
            break;
        }
      }

      mem.acciones = {};

      // ===== EVENTO NARRATIVO =====
      if (mem.ronda > 1 && chance(0.6)) {
        await ejecutarEventoNarrativo(mem, channel);
        mem = normalizarMem(loadMemory());
      }

      // ===== CIERRE DE ZONAS =====
      if (mem.ronda % 5 === 0) {
        const abiertas = mem.zonas.filter(z => !mem.zonasCerradas.includes(z));
        if (abiertas.length > 1) {
          const cerrada = pick(abiertas);
          mem.zonasCerradas.push(cerrada);
          await channel.send(`☠️ Zona ${cerrada} cerrada`);

          mem.jugadores.forEach(j => {
            if (j.vivo && j.zona === cerrada) {
              if (chance(0.7)) matar(j, mem);
            }
          });
        }
      }

      // ===== BOUNTY =====
      if (mem.ronda % 3 === 0) {
        const vivos2 = mem.jugadores.filter(j => j.vivo);
        const target = pick(vivos2);
        if (target && !mem.bounties.includes(target.id)) {
          mem.bounties.push(target.id);
          await channel.send(`🎯 Recompensa por <@${target.id}>`);
        }
      }

      // ===== CAMBIO CLIMA =====
      if (mem.ronda % 4 === 0) {
        const climas = ["☀️ Normal", "🌧️ Lluvia", "🌫️ Niebla", "⛅ Nublado", "🌪️ Tormenta"];
        mem.clima = pick(climas);
        await channel.send(`🌦️ El clima cambia a: ${mem.clima}`);
      }

      // ===== FIN DEL DÍA =====
      if (mem.ronda % 5 === 0) {
        await channel.send("🌙 La noche cae...");
        await sleep(2000);

        const muertos = mem.muertesDia.length;

        if (muertos === 0) {
          await channel.send("🔇 No se escuchan disparos...");
        } else {
          const tiros = "💥".repeat(Math.min(muertos, 10));
          await channel.send(`🔊 Se escuchan disparos a lo lejos...\n${tiros}`);

          const lista = mem.muertesDia.map(id => `💀 <@${id}>`).join("\n");
          const embedMuertos = new EmbedBuilder()
            .setTitle("🪦 Caídos del día")
            .setColor(0xFF0000)
            .setDescription(lista);
          await channel.send({ embeds: [embedMuertos] });
        }

        mem.muertesDia = [];
        mem.esDeDia = !mem.esDeDia;
        await sleep(2000);
      }

      mem.jugadores.forEach(j => j.escondido = false);

      mem.ronda++;
      mem.ultimaInteraccion = Date.now();
      saveMemory(mem);

      await sleep(3000);

      const vivosCheck = mem.jugadores.filter(j => j.vivo);
      if (vivosCheck.length <= 1) break;
    }

    // ===== FIN JUEGO =====
    let mem = normalizarMem(loadMemory());
    const ganador = mem.jugadores.find(j => j.vivo);

    if (ganador) {
      const db = loadDB();

      if (!db.players[ganador.id]) {
        db.players[ganador.id] = { kills: 0, victorias: 0, dinero: 0, items: [] };
      }
      db.players[ganador.id].victorias = (db.players[ganador.id].victorias || 0) + 1;
      db.players[ganador.id].dinero = (db.players[ganador.id].dinero || 0) + 5;
      db.global.partidasJugadas = (db.global.partidasJugadas || 0) + 1;

      if (!db.historialJugadores[ganador.id]) {
        db.historialJugadores[ganador.id] = { partidas: 0, kills: 0, victorias: 0 };
      }
      db.historialJugadores[ganador.id].victorias = (db.historialJugadores[ganador.id].victorias || 0) + 1;

      saveDB(db);

      const embedGanador = new EmbedBuilder()
        .setTitle("🏆 ¡Tenemos un ganador!")
        .setColor(0xFFD700)
        .setDescription(`🎉 <@${ganador.id}> ha ganado la partida!`)
        .addFields(
          { name: "💀 Kills", value: `${mem.kills[ganador.id] || 0}`, inline: true },
          { name: "🏅 Victorias totales", value: `${db.players[ganador.id]?.victorias || 0}`, inline: true },
          { name: "💰 Dinero", value: `${db.players[ganador.id]?.dinero || 0}`, inline: true },
          { name: "📊 Rondas", value: `${mem.ronda}`, inline: true },
          { name: "🎮 Modo", value: mem.modo === "calamar" ? "🦑 Calamar" : "🔥 Hambre", inline: true }
        );

      await channel.send({ embeds: [embedGanador] });

      const topKills = Object.entries(mem.kills)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, kills], i) => `🥇 <@${id}>: ${kills} kills`)
        .join("\n");

      if (topKills) {
        await channel.send(`📊 **Top Kills:**\n${topKills}`);
      }
    }

    mem.partidaActiva = false;
    mem.loopActivo = false;
    saveMemory(mem);

  } catch (error) {
    console.error("❌ Error en loop:", error);
    const mem = normalizarMem(loadMemory());
    mem.loopActivo = false;
    mem.partidaActiva = false;
    saveMemory(mem);
    await channel.send("❌ El juego se detuvo por un error. Usa !hambre para reiniciar.");
  }
}

// ===== START (adaptado para mensajes e interacciones) =====
async function start(ctx, modo = "hambre") {
  let mem = normalizarMem(loadMemory());

  if (mem.loopActivo) {
    return ctx.reply("⚠️ Ya hay partida activa");
  }

  const miembros = await ctx.guild.members.fetch();

  const jugadores = miembros
    .filter(m => !m.user.bot)
    .map(m => ({
      id: m.user.id,
      vivo: true,
      item: null,
      herido: false,
      escondido: false,
      zona: pick(["bosque", "río", "colinas", "cueva", "ruinas"])
    }));

  if (jugadores.length < 2) {
    return ctx.reply("❌ Necesitan mínimo 2 jugadores");
  }

  mem = {
    partidaActiva: true,
    loopActivo: true,
    pausado: false,
    modo: modo,
    temporada: mem.temporada || 1,
    jugadores,
    ronda: 1,
    kills: {},
    muertosTotales: 0,
    historial: [],
    traiciones: [],
    acciones: {},
    canalId: ctx.channel.id,
    alianzas: [],
    bounties: [],
    clima: "☀️ Normal",
    esDeDia: true,
    zonas: ["bosque", "río", "colinas", "cueva", "ruinas"],
    zonasCerradas: [],
    eventoActual: null,
    muertesDia: [],
    ultimaInteraccion: Date.now()
  };

  saveMemory(mem);

  const embedInicio = new EmbedBuilder()
    .setTitle(modo === "calamar" ? "🦑 ¡Juego del Calamar iniciado!" : "🔥 ¡Juegos del Hambre iniciados!")
    .setColor(modo === "calamar" ? 0xFF4500 : 0xFF6347)
    .setDescription(`👥 ${jugadores.length} tributos han entrado a la arena`)
    .addFields(
      { name: "📍 Zonas", value: mem.zonas.join(", "), inline: false },
      { name: "📜 Reglas", value: "Sobrevive hasta el final\nUsa !accion para realizar acciones\nCada 5 rondas cae la noche", inline: false }
    )
    .setFooter({ text: `¡Que empiecen los ${modo === "calamar" ? "juegos" : "juegos del hambre"}!` });

  await ctx.reply({ embeds: [embedInicio] });

  await sleep(2000);
  await cornucopia(mem, ctx.channel);

  loop(ctx.channel);
}

// ============================================================
//  COMANDOS DE PREFIJO (!)
// ============================================================
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = normalizarMem(loadMemory());

  try {
    // ===== INICIAR =====
    if (c === "!hambre") {
      start(msg, "hambre");
    }

    if (c === "!calamar") {
      start(msg, "calamar");
    }

    // ===== ACCIÓN =====
    if (c.startsWith("!accion")) {
      if (!mem.partidaActiva) return msg.reply("❌ No hay partida activa");

      const j = mem.jugadores.find(x => x.id === msg.author.id);
      if (!j) return msg.reply("❌ No estás en la partida");
      if (!j.vivo) return msg.reply("💀 Estás muerto");

      const partes = c.split(" ");
      const tipo = partes[1];
      const target = msg.mentions.users.first();

      const tiposValidos = ["moverse", "esconderse", "atacar", "curar"];
      if (!tiposValidos.includes(tipo)) {
        return msg.reply("❌ Acciones: moverse, esconderse, atacar, curar");
      }

      if (tipo === "atacar" && !target) {
        return msg.reply("❌ Menciona a quién atacar");
      }

      if (tipo === "moverse" && !partes[2]) {
        return msg.reply("❌ Especifica zona: !accion moverse bosque");
      }

      if (tipo === "moverse" && !mem.zonas.includes(partes[2])) {
        return msg.reply(`❌ Zonas: ${mem.zonas.join(", ")}`);
      }

      if (tipo === "moverse" && mem.zonasCerradas.includes(partes[2])) {
        return msg.reply(`❌ Zona ${partes[2]} cerrada`);
      }

      if (tipo === "atacar" && target.id === msg.author.id) {
        return msg.reply("❌ No puedes atacarte a ti mismo");
      }

      mem.acciones[msg.author.id] = {
        tipo,
        objetivo: target?.id || null,
        zona: partes[2] || null
      };

      saveMemory(mem);
      msg.reply(`✅ Acción guardada: ${tipo}`);
    }

    // ===== ALIANZA =====
    if (c.startsWith("!aliarse")) {
      if (!mem.partidaActiva) return msg.reply("❌ No hay partida activa");

      const target = msg.mentions.users.first();
      if (!target) return msg.reply("❌ Menciona a quien aliarte");

      const j1 = mem.jugadores.find(x => x.id === msg.author.id);
      const j2 = mem.jugadores.find(x => x.id === target.id);

      if (!j1?.vivo || !j2?.vivo) {
        return msg.reply("❌ Ambos deben estar vivos");
      }

      const existe = mem.alianzas.find(a => a.includes(msg.author.id) && a.includes(target.id));
      if (!existe) {
        mem.alianzas.push([msg.author.id, target.id]);
        saveMemory(mem);
        msg.reply(`🤝 <@${msg.author.id}> y <@${target.id}> son aliados`);
      } else {
        msg.reply("⚠️ Ya son aliados");
      }
    }

    // ===== ROMPER ALIANZA =====
    if (c.startsWith("!romper")) {
      if (!mem.partidaActiva) return msg.reply("❌ No hay partida activa");

      const target = msg.mentions.users.first();
      if (!target) return msg.reply("❌ Menciona con quién romper");

      const index = mem.alianzas.findIndex(a => a.includes(msg.author.id) && a.includes(target.id));
      if (index !== -1) {
        mem.alianzas.splice(index, 1);
        saveMemory(mem);
        msg.reply(`💔 <@${msg.author.id}> rompió alianza con <@${target.id}>`);
      } else {
        msg.reply("❌ No tienen alianza");
      }
    }

    // ===== ESTADO =====
    if (c === "!estado") {
      if (!mem.partidaActiva) return msg.reply("❌ No hay partida activa");

      const j = mem.jugadores.find(x => x.id === msg.author.id);
      if (!j) return msg.reply("❌ No estás en la partida");

      const db = loadDB();
      const player = db.players[msg.author.id] || { kills: 0, victorias: 0, dinero: 0, items: [] };

      const embed = new EmbedBuilder()
        .setTitle(`📊 Estado de ${msg.author.username}`)
        .setColor(0x00FF00)
        .addFields(
          { name: "❤️ Vida", value: j.vivo ? "✅ Vivo" : "💀 Muerto", inline: true },
          { name: "📍 Zona", value: j.zona || "Ninguna", inline: true },
          { name: "🛡️ Item", value: j.item || "Ninguno", inline: true },
          { name: "🫥 Escondido", value: j.escondido ? "Sí" : "No", inline: true },
          { name: "🤕 Herido", value: j.herido ? "Sí" : "No", inline: true },
          { name: "🔪 Kills", value: `${mem.kills[msg.author.id] || 0}`, inline: true },
          { name: "💰 Dinero", value: `${player.dinero || 0}`, inline: true },
          { name: "🏅 Victorias", value: `${player.victorias || 0}`, inline: true }
        );

      msg.reply({ embeds: [embed] });
    }

    // ===== MAPA =====
    if (c === "!mapa") {
      if (!mem.partidaActiva) return msg.reply("❌ No hay partida activa");

      const abiertas = mem.zonas.filter(z => !mem.zonasCerradas.includes(z));
      const embed = new EmbedBuilder()
        .setTitle("🗺️ Mapa")
        .setColor(0x00BFFF)
        .addFields(
          { name: "🟢 Abiertas", value: abiertas.join(", ") || "Ninguna", inline: false },
          { name: "🔴 Cerradas", value: mem.zonasCerradas.join(", ") || "Ninguna", inline: false },
          { name: "👥 Vivos", value: `${mem.jugadores.filter(j => j.vivo).length}`, inline: true },
          { name: "🌓 Momento", value: mem.esDeDia ? "☀️ Día" : "🌙 Noche", inline: true },
          { name: "🌦️ Clima", value: mem.clima, inline: true }
        );

      msg.reply({ embeds: [embed] });
    }

    // ===== ZONA =====
    if (c === "!zona") {
      const j = mem.jugadores.find(x => x.id === msg.author.id);
      if (!j) return msg.reply("❌ No estás en la partida");
      msg.reply(`📍 Estás en: ${j.zona}`);
    }

    // ===== TOP =====
    if (c === "!top") {
      const db = loadDB();
      const topKills = Object.entries(db.players)
        .sort((a, b) => (b[1].kills || 0) - (a[1].kills || 0))
        .slice(0, 5)
        .map(([id, data], i) => {
          const medalla = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i] || "•";
          return `${medalla} <@${id}>: ${data.kills || 0} kills (${data.dinero || 0} ${db.economia.moneda})`;
        })
        .join("\n");

      const topVictorias = Object.entries(db.players)
        .sort((a, b) => (b[1].victorias || 0) - (a[1].victorias || 0))
        .slice(0, 5)
        .map(([id, data], i) => {
          const medalla = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i] || "•";
          return `${medalla} <@${id}>: ${data.victorias || 0} victorias`;
        })
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📊 Rankings Globales")
        .setColor(0xFFD700)
        .addFields(
          { name: "🔪 Top Kills", value: topKills || "Sin datos", inline: true },
          { name: "🏆 Top Victorias", value: topVictorias || "Sin datos", inline: true }
        );

      msg.reply({ embeds: [embed] });
    }

    // ===== PAUSAR =====
    if (c === "!pausar") {
      if (!mem.partidaActiva) return msg.reply("❌ No hay partida activa");
      mem.pausado = !mem.pausado;
      saveMemory(mem);
      msg.reply(mem.pausado ? "⏸️ Partida pausada" : "▶️ Partida reanudada");
    }

    // ===== AYUDA =====
    if (c === "!ayuda" || c === "!help" || c === "!cmdayuda") {
      const embed = new EmbedBuilder()
        .setTitle("📚 Patroclo 3 - Comandos")
        .setColor(0x00FFFF)
        .setDescription("¡Sobrevive a los Juegos del Hambre o al Juego del Calamar!")
        .addFields(
          { name: "🎮 Iniciar partida", value: "`!hambre` - Juegos del Hambre\n`!calamar` - Juego del Calamar\n`/hambre` - Slash\n`/calamar` - Slash", inline: false },
          { name: "⚔️ Acciones (durante la partida)", value: "`!accion atacar @usuario` - Atacar\n`!accion moverse zona` - Moverse\n`!accion esconderse` - Esconderse\n`!accion curar` - Curarse", inline: false },
          { name: "📍 Información", value: "`!estado` - Ver tu estado\n`!mapa` - Ver mapa de zonas\n`!zona` - Ver tu zona actual\n`!top` - Rankings globales", inline: false },
          { name: "🤝 Social", value: "`!aliarse @usuario` - Formar alianza\n`!romper @usuario` - Romper alianza", inline: false },
          { name: "📦 Economía", value: "`!inventario` - Ver tus items\n`!tienda` - Ver tienda\n`!comprar [item]` - Comprar item", inline: false },
          { name: "⏸️ Control", value: "`!pausar` - Pausar/Reanudar partida", inline: false },
          { name: "❓ Ayuda", value: "`!ayuda` `!help` `!cmdayuda` - Este mensaje", inline: false }
        )
        .setFooter({ text: "¡Que empiecen los juegos!" });

      msg.reply({ embeds: [embed] });
    }

  } catch (error) {
    console.error("❌ Error:", error);
    msg.reply("⚠️ Ocurrió un error");
  }
});

// ============================================================
//  COMANDOS SLASH (/)
// ============================================================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'hambre') {
    await start(interaction, 'hambre');
  } else if (interaction.commandName === 'calamar') {
    await start(interaction, 'calamar');
  }
});

// ============================================================
//  REGISTRO DE COMANDOS SLASH
// ============================================================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Patroclo 3 conectado como ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);

  try {
    const commands = [
      {
        name: 'hambre',
        description: 'Inicia una partida de los Juegos del Hambre'
      },
      {
        name: 'calamar',
        description: 'Inicia una partida del Juego del Calamar'
      }
    ];
    await client.application.commands.set(commands);
    console.log('✅ Comandos slash registrados: /hambre y /calamar');
  } catch (error) {
    console.error('❌ Error al registrar comandos slash:', error);
  }

  console.log(`🔄 Usa !hambre, !calamar, /hambre o /calamar para iniciar`);
});

// ============================================================
//  SERVER
// ============================================================
client.login(process.env.DISCORD_TOKEN);
http.createServer((req, res) => res.end("OK")).listen(process.env.PORT || 8080);