const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require("fs");
const http = require("http");

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
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const loadMemory = () => JSON.parse(fs.readFileSync("memory.json"));
const saveMemory = m => fs.writeFileSync("memory.json", JSON.stringify(m,null,2));

const loadDB = () => JSON.parse(fs.readFileSync("db.json"));
const saveDB = d => fs.writeFileSync("db.json", JSON.stringify(d,null,2));

// ===== NORMALIZADOR (ANTI CRASH) =====
function normalizarMem(mem){

  if(!mem.partidaActiva) mem.partidaActiva = false;
  if(!mem.pausado) mem.pausado = false;
  if(!mem.modo) mem.modo = "hambre";

  if(!mem.jugadores) mem.jugadores = [];

  if(!mem.kills) mem.kills = {};
  if(!mem.muertosTotales) mem.muertosTotales = 0;

  if(!mem.historial) mem.historial = [];
  if(!mem.traiciones) mem.traiciones = [];
  if(!mem.acciones) mem.acciones = {};

  if(!mem.alianzas) mem.alianzas = [];
  if(!mem.bounties) mem.bounties = [];
  if(!mem.apuestas) mem.apuestas = {};

  if(!mem.clima) mem.clima = "☀️ Normal";
  if(mem.esDeDia === undefined) mem.esDeDia = true;

  if(!mem.zonas) mem.zonas = ["bosque","río","colinas","cueva","ruinas"];
  if(!mem.zonasCerradas) mem.zonasCerradas = [];

  if(!mem.loopActivo) mem.loopActivo = false;

  return mem;
}

// ===== MATAR =====
function matar(j, mem, killer=null){
  if(!j || !j.vivo) return;

  if(Math.random() < 0.25){
    j.herido = true;
    return;
  }

  j.vivo = false;
  mem.muertosTotales++;

  let db = loadDB();

  if(killer){
    mem.kills[killer.id] = (mem.kills[killer.id] || 0) + 1;

    if(!db.players[killer.id]){
      db.players[killer.id] = {kills:0,wins:0};
    }

    db.players[killer.id].kills++;

    if(mem.bounties && mem.bounties.includes(j.id)){
      mem.kills[killer.id] += 3;
    }

    // TRAICIÓN
    if(killer.compañero === j.id){
      mem.traiciones.push({
        traidor: killer.id,
        victima: j.id,
        ronda: mem.ronda
      });
    }
  }

  saveDB(db);
}

// ===== PROBABILIDAD =====
function calcularProb(a,t,mem){
  let prob = 0.4;

  if(a.item==="cuchillo") prob+=0.3;
  if(a.item==="arco") prob+=0.2;

  if(a.herido) prob-=0.2;
  if(t.herido) prob+=0.2;

  if(a.zona !== t.zona) prob-=0.5;

  const alianza = mem.alianzas.find(al =>
    (al.a===a.id && al.b===t.id) ||
    (al.b===a.id && al.a===t.id)
  );

  if(alianza) prob-=0.5;

  return prob;
}

// ===== LOOP =====
async function loop(channel){

  let mem = normalizarMem(loadMemory());

  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length > 1){

    mem = normalizarMem(loadMemory());

    const vivos = mem.jugadores.filter(j=>j.vivo);
    const [a,b] = vivos.sort(()=>Math.random()-0.5);

    if(a && b){
      let prob = calcularProb(a,b,mem);

      if(Math.random() < prob){
        matar(b,mem,a);
        await channel.send(`⚔️ <@${a.id}> mató a <@${b.id}>`);
      }
    }

    // ZONAS
    if(mem.ronda % 5 === 0){
      const abiertas = mem.zonas.filter(z=>!mem.zonasCerradas.includes(z));

      if(abiertas.length > 1){
        const cerrada = pick(abiertas);
        mem.zonasCerradas.push(cerrada);

        await channel.send(`☠️ Zona ${cerrada} cerrada`);

        mem.jugadores.forEach(j=>{
          if(j.vivo && j.zona === cerrada){
            if(Math.random()<0.7) matar(j,mem);
          }
        });
      }
    }

    // BOUNTY
    if(mem.ronda % 3 === 0){
      const target = pick(vivos);
      if(target){
        mem.bounties.push(target.id);
        await channel.send(`🎯 Recompensa por <@${target.id}>`);
      }
    }

    mem.ronda++;
    saveMemory(mem);

    await sleep(4000);
  }

  const ganador = mem.jugadores.find(j=>j.vivo);

  if(ganador){
    let db = loadDB();

    if(!db.players[ganador.id]){
      db.players[ganador.id]={kills:0,wins:0};
    }

    db.players[ganador.id].wins++;

    saveDB(db);

    channel.send(`🏆 Ganador: <@${ganador.id}>`);
  }

  mem.loopActivo = false;
  mem.partidaActiva = false;
  saveMemory(mem);
}

// ===== START =====
async function start(msg){

  let mem = normalizarMem(loadMemory());

  if(mem.loopActivo){
    return msg.reply("⚠️ Ya hay partida");
  }

  const miembros = await msg.guild.members.fetch();

  const jugadores = miembros
    .filter(m=>!m.user.bot)
    .map(m=>({
      id:m.user.id,
      vivo:true,
      item:null,
      herido:false,
      zona: pick(["bosque","río","colinas","cueva","ruinas"])
    }));

  mem = {
    partidaActiva:true,
    loopActivo:true,
    jugadores,
    ronda:1,
    kills:{},
    muertosTotales:0,
    alianzas:[],
    bounties:[],
    apuestas:{},
    zonas:["bosque","río","colinas","cueva","ruinas"],
    zonasCerradas:[]
  };

  saveMemory(mem);

  msg.reply("🔥 Partida iniciada");

  loop(msg.channel);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = normalizarMem(loadMemory());

  if(c === "!hambre") start(msg);

  if(c.startsWith("!mover")){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    const zona = c.split(" ")[1];

    if(!mem.zonas.includes(zona)) return;
    if(mem.zonasCerradas.includes(zona)) return msg.reply("☠️ Cerrada");

    j.zona = zona;
    saveMemory(mem);

    msg.reply(`🚶 ${zona}`);
  }

  if(c === "!zona"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    msg.reply(`📍 ${j?.zona}`);
  }
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);