// VERSION FINAL ESTABLE (NO SE TOCAN EVENTOS, SOLO FIXES Y SEGURIDAD)

const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js'); require('dotenv').config(); const fs = require("fs"); const http = require("http");

const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers ] });

// ===== MEMORIA ===== function loadMemory() { if (!fs.existsSync("memory.json")) { fs.writeFileSync("memory.json", JSON.stringify({ partidaActiva: false, loopActivo: false, pausado: false, modo: "hambre", temporada: 1, jugadores: [], ronda: 0, kills: {}, muertosTotales: 0 }, null, 2)); } return JSON.parse(fs.readFileSync("memory.json")); }

function saveMemory(mem) { fs.writeFileSync("memory.json", JSON.stringify(mem, null, 2)); }

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

// ===== MATAR SEGURO ===== function matar(j, mem, killer = null) { if (!j || !j.vivo) return; j.vivo = false; mem.muertosTotales++; if (killer) { if (!mem.kills[killer.id]) mem.kills[killer.id] = 0; mem.kills[killer.id]++; } }

// ===== PROTECCIÓN ANTI TODOS MUERTOS ===== function asegurarSuperviviente(mem) { const vivos = mem.jugadores.filter(j => j.vivo); if (vivos.length === 0) { const revive = pick(mem.jugadores); revive.vivo = true; } }

// ===== CORNUCOPIA ===== function eventoCornucopia(vivos, mem) { const a = pick(vivos); const eventosC = [ { t: "{a} corre hacia el centro y consigue un arco.", k: [], item: "arco" }, { t: "{a} encuentra una mochila llena de suministros.", k: [], item: "comida" }, { t: "{a} tropieza en la cornucopia y muere pisoteado.", k: ["a"] }, { t: "{a} agarra un cuchillo y huye rápidamente.", k: [], item: "cuchillo" }, { t: "{a} decide huir hacia el bosque para salvarse.", k: [] }, { t: "{a} pelea con un rival por una mochila y gana.", k: [], item: "botiquín" }, { t: "{a} encuentra una lanza y se prepara para la caza.", k: [], item: "cuchillo" } ]; const ev = pick(eventosC); if (ev.item) a.item = ev.item; if (ev.k.includes("a")) matar(a, mem); return ev.t.replaceAll("{a}", <@${a.id}>); }

// ===== EVENTO HAMBRE (MISMA LISTA) ===== function eventoHambre(vivos, ronda, mem) { const shuffled = [...vivos].sort(() => Math.random() - 0.5); const a = shuffled[0], b = shuffled[1] || a, c = shuffled[2] || a, d = shuffled[3] || a;

const eventos = [

// 🧊 SOCIALES / NEUTROS {t:"{a} construye una fogata.",k:[]}, {t:"{a} y {b} se acurrucan para sobrevivir.",k:[]}, {t:"{a} encuentra agua fresca y recupera fuerzas.",k:[]}, {t:"{a} logra encender una fogata y espantar el frío.",k:[]}, {t:"{a} descubre un sendero oculto que lo mantiene a salvo.",k:[]}, {t:"{a} encuentra un escondite seguro.",k:[]}, {t:"{a} construye un refugio improvisado y sobrevive la noche.",k:[]}, {t:"{a} encuentra frutas silvestres y se alimenta.",k:[]}, {t:"{a} se esconde en silencio y evita ser descubierto.",k:[]}, {t:"{a} encuentra un recurso valioso y lo guarda.",k:[]},

// 💚 POSITIVOS {t:"{a} ayuda a {b} a levantarse tras una caída.",k:[]}, {t:"{a} comparte comida con {b}.",k:[]}, {t:"{a} encuentra un amuleto misterioso.",k:[]}, {t:"{a} y {b} ríen juntos en medio del caos.",k:[]}, {t:"{a} descubre un escondite seguro y descansa.",k:[]}, {t:"{a} recibe apoyo inesperado de {b}.",k:[]}, {t:"{a} encuentra un río cristalino.",k:[]}, {t:"{a} y {b} recuerdan viejos tiempos.",k:[]}, {t:"{a} siente una extraña calma.",k:[]}, {t:"{a} y {b} sobreviven una tormenta juntos.",k:[]}, {t:"{a} y {b} tienen un encuentro íntimo durante la noche.",k:[]},

// 💀 MUERTES {t:"{a} intenta un plan arriesgado contra {b}, pero falla y muere.",k:["a"]}, {t:"{a} muere de frío.",k:["a"]}, {t:"{a} muere de hambre lentamente.",k:["a"]}, {t:"{a} cae en un pozo y muere.",k:["a"]}, {t:"{a} cae en una trampa natural y muere.",k:["a"]}, {t:"{a} cae de un árbol y muere.",k:["a"]}, {t:"{a} es picado por una serpiente y muere de disentería.",k:["a"]}, {t:"{a} muere de disentería.",k:["a"]}, {t:"{a} se ahoga en un río y muere.",k:["a"]}, {t:"{a} se intoxica con frutos venenosos y muere.",k:["a"]},

// ⚔️ COMBATE {t:"{a} mata brutalmente a {b} con una piedra.",k:["b"]}, {t:"{a} asesina a {b} mientras duerme.",k:["b"]}, {t:"{a} apuñala a {b} hasta matarlo.",k:["b"]}, {t:"{a} ataca a {b}, falla y muere.",k:["a"]}, {t:"{a} se confía y {b} lo mata.",k:["a"]}, {t:"{a} envenena la comida de {b}, pero se equivoca y come él mismo, muriendo brutalmente.",k:["a"]},

// 🧠 TRAICIÓN {t:"{a} traiciona a {b} y lo mata.",k:["b"]}, {t:"{a} finge alianza con {b} y luego lo mata.",k:["b"]}, {t:"{a} y {b} discuten por comida… ambos mueren.",k:["a","b"]},

// 💀 SUICIDIOS {t:"{a} no soporta la presión y se suicida.",k:["a"]}, {t:"{a} pierde la cordura y se suicida.",k:["a"]}, {t:"{a} y {b} intentan suicidarse juntos y mueren.",k:["a","b"]}, {t:"{a} y {b} amenazan con doble suicidio, fallan y mueren.",k:["a","b"]},

// 💥 CAOS {t:"{a} encuentra una bomba, esta falla y explota.",k:["a"]}, {t:"{a} pierde el control y detona una bomba que mata a varios.",k:["a","b","c","d"],rare:true}, {t:"{a} dispara una flecha hacia {b}, pero falla y golpea a {c}, que muere.",k:["c"]}, {t:"{a} se sube a un árbol pero cae sobre {b} y mueren.",k:["a","b"]}, {t:"{a} provoca un incendio en el bosque y muere atrapado.",k:["a"]}, {t:"{a} pisa una mina oculta y muere.",k:["a"]},

// 🎲 MIX {t:"{a} y {b} discuten y ambos mueren.",k:["a","b"]}, {t:"{a} se sacrifica por {b} y ambos mueren.",k:["a","b"]}, {t:"{a} y {b} se enfrentan y solo uno sobrevive.",k:["random_ab"]} ];

const pool = eventos.filter(e => e.rare ? (Math.random() < (ronda * 0.02)) : true); const ev = pick(pool);

let texto = ev.t .replaceAll("{a}", <@${a.id}> (D${a.distrito})) .replaceAll("{b}", <@${b.id}> (D${b.distrito})) .replaceAll("{c}", <@${c.id}>) .replaceAll("{d}", <@${d.id}>);

const targets = new Set(ev.k); targets.forEach(k => { if(k==="a") matar(a, mem); if(k==="b" && b!==a) matar(b, mem, a); if(k==="c" && c!==a) matar(c, mem, a); if(k==="d" && d!==a) matar(d, mem, a); if(k==="random_ab") Math.random()<0.5 ? matar(a,mem,b) : matar(b,mem,a); });

asegurarSuperviviente(mem); return texto; }

// ===== EVENTO CALAMAR (MISMA LISTA + MÁS LETAL) ===== function eventoCalamar(mem) { const vivos = mem.jugadores.filter(j => j.vivo); if (vivos.length <= 1) return "🦑 Fin del juego.";

const shuffled = [...vivos].sort(() => Math.random() - 0.5); const a = shuffled[0], b = shuffled[1] || a;

const muertesCalamar = [ {t:"🔴🟢 Luz roja, luz verde… varios jugadores caen.",k:["random_group"]}, {t:"🍪 Juego del panal… algunos no logran superar la prueba.",k:["random_group"]}, {t:"🪢 Tira y afloja… el equipo perdedor cae al vacío.",k:["random_group"]}, {t:"🎲 Canicas… los perdedores entregan su vida.",k:["random_group"]}, {t:"🌉 Puente de cristal… quienes pisan mal caen y mueren.",k:["random_group"]}, {t:"🦑 Batalla final… solo uno sobrevive.",k:["random_group"]}, {t:"{a} ataca a {b} mientras duerme.",k:["b"]}, {t:"{a} roba comida y {b} lo descubre… pelea mortal.",k:["b"]}, {t:"Se apagan las luces… el caos deja muertos.",k:["random_group"]}, {t:"{a} desconfía de todos y elimina a {b}.",k:["b"]}, {t:"{a} forma alianza con {b}, pero luego lo traiciona y lo mata.",k:["b"]} ];

const ev = pick(muertesCalamar);

let texto = ev.t .replaceAll("{a}", <@${a.id}>) .replaceAll("{b}", <@${b.id}>);

ev.k.forEach(k => { if(k==="b") matar(b, mem, a); if(k==="random_group") { const prob = mem.temporada === 1 ? 0.3 : 0.45; vivos.forEach(j => { if (Math.random() < prob) matar(j, mem); }); } });

asegurarSuperviviente(mem); return texto; }

// ===== LOOP ===== async function loop(channel) { let mem = loadMemory(); if (!mem.loopActivo) return;

while (mem.partidaActiva && mem.jugadores.filter(j => j.vivo).length > 1) { mem = loadMemory();

if (!mem.loopActivo) return;

if (mem.pausado) {
  await new Promise(r => setTimeout(r, 3000));
  continue;
}

const vivos = mem.jugadores.filter(j => j.vivo);

let texto = (mem.modo === "hambre" && mem.ronda === 1)
  ? `🏁 **CORNUCOPIA** 🏁\n${eventoCornucopia(vivos, mem)}`
  : (mem.modo === "hambre"
    ? eventoHambre(vivos, mem.ronda, mem)
    : eventoCalamar(mem));

mem.jugadores.forEach(j => j.escondido = false);

await channel.send({
  embeds: [
    new EmbedBuilder()
      .setTitle(`🔥 RONDA ${mem.ronda}`)
      .setDescription(texto)
      .setColor(mem.modo === "calamar" ? "#00ffff" : "#ff4500")
  ]
});

if (mem.ronda % 3 === 0) {
  const muertos = mem.jugadores.filter(j => !j.vivo).slice(-5).map(j => `<@${j.id}>`).join("\n");
  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🪦 INTERMEDIO")
        .setDescription(`Últimos caídos:\n${muertos || "Nadie"}`)
    ]
  });
  await new Promise(r => setTimeout(r, 60000));
}

console.log(`[RONDA ${mem.ronda}] Vivos: ${vivos.length}`);

mem.ronda++;
saveMemory(mem);
await new Promise(r => setTimeout(r, 7000));

}

const ganador = mem.jugadores.find(j => j.vivo); if (ganador) channel.send(🏆 <@${ganador.id}> gana);

mem.partidaActiva = false; mem.loopActivo = false; saveMemory(mem); }

// ===== SISTEMA AVANZADO ===== function registrarKill(mem, killer, victim) { if (!mem.historial) mem.historial = {}; if (!mem.historial[killer.id]) mem.historial[killer.id] = { kills: [], enemigos: [] }; mem.historial[killer.id].kills.push(victim.id); if (!mem.historial[victim.id]) mem.historial[victim.id] = { enemigos: [] }; mem.historial[victim.id].enemigos.push(killer.id); }

// modificar matar const matarOriginal = matar; matar = function(j, mem, killer = null) { if (!j || !j.vivo) return; j.vivo = false; mem.muertosTotales++; if (killer) { if (!mem.kills[killer.id]) mem.kills[killer.id] = 0; mem.kills[killer.id]++; registrarKill(mem, killer, j); } };

// ===== FINAL ÉPICO ===== async function finalEpico(channel, mem) { const vivos = mem.jugadores.filter(j => j.vivo); if (vivos.length !== 2) return;

const [a, b] = vivos; await channel.send(⚔️ FINAL: <@${a.id}> vs <@${b.id}>);

await new Promise(r => setTimeout(r, 3000));

const winner = Math.random() < 0.5 ? a : b; const loser = winner === a ? b : a;

matar(loser, mem, winner);

await channel.send(💀 <@${loser.id}> cae en el duelo final...); await new Promise(r => setTimeout(r, 2000)); await channel.send(🏆 <@${winner.id}> es el campeón definitivo.); }

// ===== LOOP MODIFICADO ===== async function loop(channel) { let mem = loadMemory(); if (!mem.loopActivo) return;

while (mem.partidaActiva && mem.jugadores.filter(j => j.vivo).length > 2) { mem = loadMemory();

if (!mem.loopActivo) return;
if (mem.pausado) {
  await new Promise(r => setTimeout(r, 3000));
  continue;
}

const vivos = mem.jugadores.filter(j => j.vivo);

let texto = (mem.modo === "hambre" && mem.ronda === 1)
  ? `🏁 CORNUCOPIA

${eventoCornucopia(vivos, mem)}` : (mem.modo === "hambre" ? eventoHambre(vivos, mem.ronda, mem) : eventoCalamar(mem));

await channel.send({ embeds: [new EmbedBuilder().setTitle(`RONDA ${mem.ronda}`).setDescription(texto)] });

mem.ronda++;
saveMemory(mem);
await new Promise(r => setTimeout(r, 7000));

}

await finalEpico(channel, mem);

const ganador = mem.jugadores.find(j => j.vivo);

if (!mem.ranking) mem.ranking = {}; if (ganador) { if (!mem.ranking[ganador.id]) mem.ranking[ganador.id] = 0; mem.ranking[ganador.id]++; channel.send(🏆 <@${ganador.id}> gana); }

mem.partidaActiva = false; mem.loopActivo = false; saveMemory(mem); }

// ===== COMANDOS ===== client.on(Events.MessageCreate, async msg => { if (msg.author.bot) return; const c = msg.content.toLowerCase(); let mem = loadMemory();

if (c === "!hambre" || c.startsWith("!calamar")) { if (mem.partidaActiva || mem.loopActivo) return msg.reply("⚠️ Ya hay partida en curso.");

const miembros = await msg.guild.members.fetch();

const jugadores = miembros
  .filter(m => !m.user.bot)
  .map(m => ({
    id: m.user.id,
    vivo: true,
    distrito: Math.floor(Math.random()*12)+1,
    item: null,
    escondido: false
  }));

mem = {
  partidaActiva: true,
  loopActivo: true,
  pausado: false,
  modo: c.includes("calamar") ? "calamar" : "hambre",
  temporada: c.includes("2") ? 2 : 1,
  jugadores,
  ronda: 1,
  kills: {},
  muertosTotales: 0,
  historial: {},
  ranking: mem.ranking || {}
};

saveMemory(mem);
msg.reply(`🎮 ¡Comienza ${mem.modo}!`);
loop(msg.channel);

}

if (c === "!ranking") { if (!mem.ranking) return msg.reply("Sin datos"); const top = Object.entries(mem.ranking) .sort((a,b)=>b[1]-a[1]) .slice(0,5) .map(([id,k],i)=>${i+1}. <@${id}> - ${k} wins) .join(" "); msg.reply(🏆 Ranking: ${top}); }

if (c === "!enemigos") { const data = mem.historial?.[msg.author.id]; if (!data) return msg.reply("Sin historial"); msg.reply(👥 Enemigos: ${data.enemigos.map(id=><@${id}>).join(" ")||"Nadie"}); } });

client.login(process.env.DISCORD_TOKEN); http.createServer((req, res) => res.end("OK")).listen(process.env.PORT || 8080);