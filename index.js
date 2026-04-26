const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require("fs");
const http = require("http");

const { eventosCornucopia, eventosHambre, eventosCalamar } = require("./eventos");

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== FILES =====
const loadJSON = (file, def) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
  return JSON.parse(fs.readFileSync(file));
};
const saveJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// ===== LOAD =====
const loadMemory = () => loadJSON("memory.json", {});
const saveMemory = (m) => saveJSON("memory.json", m);

const loadDB = () => loadJSON("db.json", {});
const saveDB = (d) => saveJSON("db.json", d);

const pick = arr => arr[Math.floor(Math.random()*arr.length)];

// ===== KILL =====
function matar(j, mem, killer=null){
  if(!j || !j.vivo) return;
  j.vivo = false;
  mem.muertosTotales++;

  if(killer){
    if(!mem.kills[killer.id]) mem.kills[killer.id] = 0;
    mem.kills[killer.id]++;
    
    const db = loadDB();
    if(!db.players[killer.id]) db.players[killer.id] = {kills:0};
    db.players[killer.id].kills++;
    db.global.killsTotales++;
    saveDB(db);
  }
}

// ===== ATAQUE =====
function calcularAtaque(j){
  if(j.item === "cuchillo") return 0.7;
  if(j.item === "arco") return 0.6;
  return 0.4;
}

// ===== EVENTO HAMBRE =====
function eventoHambre(vivos, ronda, mem){
  const shuffled=[...vivos].sort(()=>Math.random()-0.5);
  const a=shuffled[0], b=shuffled[1]||a, c=shuffled[2]||a, d=shuffled[3]||a;

  const lista = ronda === 1 ? eventosCornucopia : eventosHambre;
  const pool = ronda < 4 ? lista.filter(e=>!e.rare) : lista;

  const ev = pick(pool);

  let texto = ev.t
    .replaceAll("{a}", `<@${a.id}>`)
    .replaceAll("{b}", `<@${b.id}>`)
    .replaceAll("{c}", `<@${c.id}>`)
    .replaceAll("{d}", `<@${d.id}>`);

  // items
  if(ev.item && a){
    a.item = ev.item;
  }

  ev.k.forEach(k=>{
    if(k==="a") matar(a,mem);
    if(k==="b") matar(b,mem,a);
    if(k==="c") matar(c,mem,a);
    if(k==="d") matar(d,mem,a);
    if(k==="random_ab") Math.random()<0.5 ? matar(a,mem,b) : matar(b,mem,a);
  });

  return texto;
}

// ===== EVENTO CALAMAR =====
function eventoCalamar(mem){
  const vivos = mem.jugadores.filter(j=>j.vivo);
  if(vivos.length<=1) return "🦑 Fin.";

  const shuffled=[...vivos].sort(()=>Math.random()-0.5);
  const a=shuffled[0], b=shuffled[1]||a;

  const ev = pick(eventosCalamar);

  let texto = ev.t
    .replaceAll("{a}", `<@${a.id}>`)
    .replaceAll("{b}", `<@${b.id}>`);

  ev.k.forEach(k=>{
    if(k==="b") matar(b,mem,a);
    if(k==="random_group"){
      vivos.forEach(j=>{
        if(Math.random() < (mem.temporada===1?0.35:0.5)) matar(j,mem);
      });
    }
  });

  return texto;
}

// ===== LOOP =====
async function loop(channel){
  let mem = loadMemory();

  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length > 1){
    mem = loadMemory();

    if(mem.pausado){
      await new Promise(r=>setTimeout(r,3000));
      continue;
    }

    const vivos = mem.jugadores.filter(j=>j.vivo);

    const texto = mem.modo === "calamar"
      ? eventoCalamar(mem)
      : eventoHambre(vivos, mem.ronda, mem);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🔥 RONDA ${mem.ronda}`)
          .setDescription(texto)
          .setColor(mem.modo==="calamar"?"#00ffff":"#ff0000")
      ]
    });

    // cooldowns
    mem.jugadores.forEach(j=>{
      if(j.cooldown > 0) j.cooldown--;
      j.escondido = false;
    });

    mem.ronda++;
    saveMemory(mem);

    await new Promise(r=>setTimeout(r,5000));
  }

  const ganador = mem.jugadores.find(j=>j.vivo);
  if(ganador){
    channel.send(`🏆 <@${ganador.id}> ganó!`);
  }

  mem.partidaActiva = false;
  saveMemory(mem);
}

// ===== START =====
async function start(msg, modo){
  let mem = loadMemory();

  if(mem.partidaActiva) return msg.reply("⚠️ Ya hay partida");

  const miembros = await msg.guild.members.fetch();

  const jugadores = miembros
    .filter(m=>!m.user.bot)
    .map(m=>({
      id:m.user.id,
      vivo:true,
      item:null,
      escondido:false,
      cooldown:0
    }));

  mem = {
    partidaActiva:true,
    pausado:false,
    modo,
    temporada:1,
    jugadores,
    ronda:1,
    kills:{},
    muertosTotales:0
  };

  saveMemory(mem);

  msg.reply(`🎮 Iniciando ${modo.toUpperCase()}`);
  loop(msg.channel);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = loadMemory();
  let db = loadDB();

  if(c === "!hambre") start(msg,"hambre");
  if(c === "!calamar") start(msg,"calamar");

  // ===== ATAQUE =====
  if(c.startsWith("!atacar")){
    if(!mem.partidaActiva) return msg.reply("❌ No hay partida");

    const atacante = mem.jugadores.find(j=>j.id===msg.author.id);
    const targetUser = msg.mentions.users.first();

    if(!atacante || !atacante.vivo) return msg.reply("💀 Estás muerto");
    if(!targetUser) return msg.reply("❌ Menciona objetivo");
    if(atacante.cooldown>0) return msg.reply("⏳ Espera");

    const target = mem.jugadores.find(j=>j.id===targetUser.id);
    if(!target || !target.vivo) return msg.reply("❌ Inválido");

    let prob = calcularAtaque(atacante);
    if(target.escondido) prob -= 0.3;

    if(Math.random() < prob){
      matar(target,mem,atacante);
      msg.reply(`⚔️ Mataste a <@${target.id}>`);
    } else {
      if(Math.random()<0.5){
        matar(atacante,mem,target);
        msg.reply("💀 Fallaste y moriste");
      } else {
        msg.reply("⚠️ Fallaste");
      }
    }

    atacante.cooldown = 2;
    saveMemory(mem);
  }

  // ===== ESCONDERSE =====
  if(c === "!esconderse"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if(!j || !j.vivo) return msg.reply("💀 No podés");

    j.escondido = true;
    j.cooldown = 2;

    saveMemory(mem);
    msg.reply("🫥 Te escondiste");
  }

  // ===== INVENTARIO =====
  if(c === "!inventario"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if(!j) return;

    const kills = mem.kills[j.id] || 0;

    msg.reply(`🎒 Item: ${j.item||"Nada"} | 💀 Kills: ${kills}`);
  }

  // ===== TIENDA =====
  if(c === "!tienda"){
    const tienda = db.tienda;

    let txt = "🛒 TIENDA:\n";
    for(const item in tienda){
      txt += `• ${item} - ${tienda[item].precio} kills\n`;
    }

    msg.reply(txt);
  }

  if(c.startsWith("!comprar")){
    const item = c.split(" ")[1];
    const j = mem.jugadores.find(x=>x.id===msg.author.id);

    if(!j || !j.vivo) return msg.reply("💀 No podés");

    if(!db.tienda[item]) return msg.reply("❌ No existe");

    const precio = db.tienda[item].precio;
    const kills = mem.kills[j.id] || 0;

    if(kills < precio) return msg.reply("❌ No tenés kills suficientes");

    mem.kills[j.id] -= precio;
    j.item = item;

    saveMemory(mem);

    msg.reply(`🛒 Compraste ${item}`);
  }

  // ===== CONTROL =====
  if(c === "!pausa"){ mem.pausado=true; saveMemory(mem); msg.reply("⏸️"); }
  if(c === "!reanudar"){ mem.pausado=false; saveMemory(mem); msg.reply("▶️"); }
  if(c === "!parar"){ mem.partidaActiva=false; saveMemory(mem); msg.reply("⛔"); }
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);

// ===== KEEP ALIVE (Render) =====
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT || 8080);