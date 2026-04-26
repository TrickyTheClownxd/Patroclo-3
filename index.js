const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require("fs");
const http = require("http");
const axios = require("axios");

const { eventosCornucopia, eventosHambre, eventosCalamar } = require("./eventos");

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

// ===== IA =====
async function narrar(txt){
  try{
    const r = await axios.post("https://api.groq.com/openai/v1/chat/completions",{
      model:"llama3-70b-8192",
      messages:[
        {role:"system",content:"Narrador dramático argentino"},
        {role:"user",content:txt}
      ]
    },{
      headers:{Authorization:`Bearer ${process.env.GROQ_API_KEY}`}
    });
    return r.data.choices[0].message.content;
  }catch{
    return txt;
  }
}

// ===== CORE =====
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
    if(!mem.kills[killer.id]) mem.kills[killer.id]=0;
    mem.kills[killer.id]++;

    if(!db.players[killer.id]){
      db.players[killer.id]={kills:0,wins:0};
    }

    db.players[killer.id].kills++;
    db.global.killsTotales++;

    if(mem.bounties.includes(j.id)){
      mem.kills[killer.id]+=3;
      db.players[killer.id].kills+=3;
    }
  }

  saveDB(db);
}

function asignarDistritos(jugadores){
  let d=1;
  for(let i=0;i<jugadores.length;i+=2){
    jugadores[i].distrito=d;
    if(jugadores[i+1]){
      jugadores[i+1].distrito=d;
    }else{
      jugadores[i].distrito = Math.ceil(Math.random()*d);
    }
    d++;
  }

  jugadores.forEach(j=>{
    j.compañero = jugadores.find(x => x.distrito === j.distrito && x.id !== j.id)?.id || null;
  });
}

function toggleDia(mem){
  mem.esDeDia=!mem.esDeDia;
  return mem.esDeDia?"☀️ Día":"🌙 Noche";
}

function cambiarClima(mem){
  const climas=["☀️ Normal","🌧️ Lluvia","🌫️ Niebla","❄️ Frío"];
  mem.clima=pick(climas);
  return mem.clima;
}

function calcularProb(a,t,mem){
  let prob=0.4;

  if(a.item==="cuchillo") prob=0.7;
  if(a.item==="arco") prob=0.6;

  if(a.herido) prob-=0.2;
  if(t.herido) prob+=0.2;

  if(t.escondido) prob-=0.3;

  if(a.distrito===t.distrito) prob-=0.25;
  if(a.compañero === t.id) prob-=0.4;

  if(!mem.esDeDia) prob+=0.15;
  else prob+=0.05;

  if(mem.clima.includes("Niebla")) prob-=0.25;
  if(mem.clima.includes("Lluvia")) prob-=0.1;
  if(mem.clima.includes("Frío")) prob-=0.2;

  return prob;
}

// ===== EVENTOS =====
function eventoHambre(mem){
  const vivos = mem.jugadores.filter(j=>j.vivo);
  const [a,b,c,d] = [...vivos].sort(()=>Math.random()-0.5);
  const ev = pick(eventosHambre);

  let txt = ev.t
    .replaceAll("{a}",`<@${a?.id}>`)
    .replaceAll("{b}",`<@${b?.id}>`)
    .replaceAll("{c}",`<@${c?.id}>`)
    .replaceAll("{d}",`<@${d?.id}>`);

  ev.k.forEach(k=>{
    if(k==="a") matar(a,mem);
    if(k==="b") matar(b,mem,a);
    if(k==="c") matar(c,mem,a);
    if(k==="d") matar(d,mem,a);
    if(k==="random_ab"){
      Math.random()<0.5 ? matar(a,mem,b) : matar(b,mem,a);
    }
  });

  return txt;
}

function eventoCalamar(mem){
  const vivos = mem.jugadores.filter(j=>j.vivo);
  const [a,b] = [...vivos].sort(()=>Math.random()-0.5);
  const ev = pick(eventosCalamar);

  let txt = ev.t
    .replace("{a}",`<@${a?.id}>`)
    .replace("{b}",`<@${b?.id}>`);

  ev.k.forEach(k=>{
    if(k==="b") matar(b,mem,a);
    if(k==="random_group"){
      vivos.forEach(j=>{
        if(Math.random()<0.4) matar(j,mem);
      });
    }
  });

  return txt;
}

// ===== LOOP =====
async function loop(channel){
  let mem = loadMemory();

  // CORNUCOPIA POR TURNOS
  for(const j of mem.jugadores){
    if(!j.vivo) continue;

    const ev = pick(eventosCornucopia);

    let txt = ev.t.replace("{a}", `<@${j.id}>`);

    if(ev.k.includes("a")) matar(j,mem);
    if(ev.item) j.item = ev.item;

    await channel.send("🏁 " + txt);
    await sleep(1500);
  }

  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length > 1){

    mem = loadMemory();

    let txt = mem.modo==="calamar"
      ? eventoCalamar(mem)
      : eventoHambre(mem);

    txt = await narrar(txt);

    await channel.send({
      embeds:[new EmbedBuilder()
        .setTitle(`Ronda ${mem.ronda} | ${mem.esDeDia?"☀️":"🌙"}`)
        .setDescription(txt)]
    });

    // HERIDOS pueden morir
    mem.jugadores.forEach(j=>{
      if(j.herido && Math.random() < 0.3){
        matar(j,mem);
      }
    });

    if(mem.ronda % 3 === 0){
      let t = pick(mem.jugadores.filter(j=>j.vivo));
      mem.bounties.push(t.id);
      channel.send(`🎯 Recompensa por <@${t.id}>`);
    }

    if(mem.ronda % 5 === 0){
      let estado = toggleDia(mem);
      let clima = cambiarClima(mem);

      const vivos = mem.jugadores.filter(j=>j.vivo).length;

      channel.send(
        `📊 INTERMEDIO\n` +
        `💀 Muertos: ${mem.muertosTotales}\n` +
        `🧍 Vivos: ${vivos}\n` +
        `${estado}\n${clima}`
      );
    }

    mem.ronda++;

    mem.jugadores.forEach(j=>{
      if(j.cooldown>0) j.cooldown--;
      j.escondido=false;
    });

    saveMemory(mem);
    await sleep(5000);
  }

  const ganador = mem.jugadores.find(j=>j.vivo);
  channel.send(`🏆 Ganador: <@${ganador.id}>`);

  mem.partidaActiva=false;
  saveMemory(mem);
}

// ===== START =====
async function start(msg,modo){
  const miembros = await msg.guild.members.fetch();

  const jugadores = miembros
    .filter(m=>!m.user.bot)
    .map(m=>({
      id:m.user.id,
      vivo:true,
      item:null,
      escondido:false,
      cooldown:0,
      herido:false
    }));

  asignarDistritos(jugadores);

  let mem = {
    partidaActiva:true,
    pausado:false,
    modo,
    temporada:1,
    jugadores,
    ronda:1,
    kills:{},
    muertosTotales:0,
    historial:[],
    traiciones:[],
    acciones:{},
    canalId:msg.channel.id,
    alianzas:[],
    bounties:[],
    clima:"☀️ Normal",
    esDeDia:true
  };

  saveMemory(mem);
  msg.reply("🎮 Partida iniciada");

  loop(msg.channel);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = loadMemory();
  let db = loadDB();

  if(c==="!hambre") start(msg,"hambre");
  if(c==="!calamar") start(msg,"calamar");

  if(c==="!tienda"){
    msg.reply(Object.entries(db.tienda)
      .map(([i,v])=>`${i}: ${v.precio}`)
      .join("\n"));
  }

  if(c.startsWith("!comprar")){
    let item = c.split(" ")[1];
    let precio = db.tienda[item]?.precio;

    if(!precio) return;

    if(!db.players[msg.author.id]) db.players[msg.author.id]={kills:0,wins:0};

    if(db.players[msg.author.id].kills < precio) return msg.reply("💀 No alcanza");

    db.players[msg.author.id].kills -= precio;

    let j = mem.jugadores.find(x=>x.id===msg.author.id);
    if(j) j.item=item;

    saveDB(db);
    saveMemory(mem);

    msg.reply(`🛒 Compraste ${item}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);