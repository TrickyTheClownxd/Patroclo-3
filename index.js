const { Client, GatewayIntentBits, Events } = require('discord.js');
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

// ===== NORMALIZADOR =====
function normalizarMem(mem){
  mem.partidaActiva ??= false;
  mem.pausado ??= false;
  mem.jugadores ??= [];

  mem.kills ??= {};
  mem.muertosTotales ??= 0;

  mem.acciones ??= {};
  mem.bounties ??= [];
  mem.alianzas ??= [];
  mem.apuestas ??= {};

  mem.zonas ??= ["bosque","río","colinas","cueva","ruinas"];
  mem.zonasCerradas ??= [];

  mem.muertesDia ??= [];

  mem.esDeDia ??= true;

  mem.ronda ??= 1;
  mem.loopActivo ??= false;

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

  // registrar muerte del día
  mem.muertesDia.push(j.id);

  if(killer){
    mem.kills[killer.id] = (mem.kills[killer.id]||0)+1;

    if(mem.bounties && mem.bounties.includes(j.id)){
      mem.kills[killer.id]+=3;
    }
  }
}

// ===== PROB =====
function calcularProb(a,t,mem){
  let prob = 0.4;

  if(a.item==="cuchillo") prob+=0.3;
  if(a.item==="arco") prob+=0.2;

  if(a.herido) prob-=0.2;
  if(t.herido) prob+=0.2;

  if(a.zona !== t.zona) prob-=0.5;

  if(t.escondido) prob-=0.3;

  // noche más difícil
  if(!mem.esDeDia) prob -= 0.1;

  return prob;
}

// ===== LOOP =====
async function loop(channel){

  while(true){

    let mem = normalizarMem(loadMemory());

    if(!mem.partidaActiva) break;

    const vivos = mem.jugadores.filter(j=>j.vivo);
    if(vivos.length <= 1) break;

    await channel.send(`🔄 Ronda ${mem.ronda}`);
    await channel.send("🕒 10s para acciones (!accion ...)");

    await sleep(10000);

    mem = normalizarMem(loadMemory());

    // ===== ACCIONES =====
    for(const j of mem.jugadores.filter(x=>x.vivo)){

      const acc = mem.acciones[j.id];
      if(!acc) continue;

      // MOVERSE
      if(acc.tipo === "moverse" && acc.zona){
        if(!mem.zonasCerradas.includes(acc.zona)){
          j.zona = acc.zona;
          await channel.send(`🚶 <@${j.id}> fue a ${acc.zona}`);
        }
      }

      // ESCONDERSE
      if(acc.tipo === "esconderse"){
        j.escondido = true;
        await channel.send(`🫥 <@${j.id}> se escondió`);
      }

      // ATACAR
      if(acc.tipo === "atacar" && acc.objetivo){
        const target = mem.jugadores.find(x=>x.id===acc.objetivo);

        if(target && target.vivo){

          let prob = calcularProb(j,target,mem);

          if(Math.random() < prob){
            matar(target,mem,j);
            await channel.send(`⚔️ <@${j.id}> mató a <@${target.id}>`);
          } else {
            await channel.send(`⚠️ <@${j.id}> falló`);
          }
        }
      }
    }

    // limpiar acciones
    mem.acciones = {};

    // ===== CIERRE DE ZONAS =====
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

    // ===== BOUNTY =====
    if(mem.ronda % 3 === 0){
      const vivos2 = mem.jugadores.filter(j=>j.vivo);
      const target = pick(vivos2);

      if(target && !mem.bounties.includes(target.id)){
        mem.bounties.push(target.id);
        await channel.send(`🎯 Recompensa por <@${target.id}>`);
      }
    }

    // ===== FIN DEL DÍA =====
    if(mem.ronda % 5 === 0){

      await channel.send("🌙 La noche cae...");
      await sleep(2000);

      const muertos = mem.muertesDia.length;

      if(muertos === 0){
        await channel.send("🔇 No se escuchan disparos...");
      } else {

        const tiros = "💥".repeat(Math.min(muertos,10));

        await channel.send(`🔊 Se escuchan disparos a lo lejos...\n${tiros}`);

        const lista = mem.muertesDia
          .map(id=>`💀 <@${id}>`)
          .join("\n");

        await channel.send(`🪦 Caídos del día:\n${lista}`);
      }

      mem.muertesDia = [];
      mem.esDeDia = !mem.esDeDia;

      await sleep(2000);
    }

    // reset estados
    mem.jugadores.forEach(j=> j.escondido=false);

    mem.ronda++;
    saveMemory(mem);

    await sleep(3000);
  }

  let mem = normalizarMem(loadMemory());
  const ganador = mem.jugadores.find(j=>j.vivo);

  if(ganador){
    await channel.send(`🏆 Ganador: <@${ganador.id}>`);
  }

  mem.partidaActiva = false;
  mem.loopActivo = false;
  saveMemory(mem);
}

// ===== START =====
async function start(msg){

  let mem = normalizarMem(loadMemory());

  if(mem.loopActivo){
    return msg.reply("⚠️ Ya hay partida activa");
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

  if(jugadores.length < 2){
    return msg.reply("❌ Necesitan mínimo 2 jugadores");
  }

  mem = {
    partidaActiva:true,
    loopActivo:true,
    jugadores,
    ronda:1,
    kills:{},
    muertosTotales:0,
    acciones:{},
    bounties:[],
    alianzas:[],
    apuestas:{},
    zonas:["bosque","río","colinas","cueva","ruinas"],
    zonasCerradas:[],
    muertesDia:[],
    esDeDia:true
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

  if(c.startsWith("!accion")){
    if(!mem.partidaActiva) return;

    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if(!j || !j.vivo) return msg.reply("💀 No podés");

    const partes = c.split(" ");

    mem.acciones[msg.author.id] = {
      tipo: partes[1],
      objetivo: msg.mentions.users.first()?.id || null,
      zona: partes[2] || null
    };

    saveMemory(mem);

    msg.reply(`🧠 Acción: ${partes[1]}`);
  }

  if(c === "!zona"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    msg.reply(`📍 ${j?.zona}`);
  }
});

// ===== SERVER =====
client.login(process.env.DISCORD_TOKEN);
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);