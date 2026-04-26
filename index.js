// ===== IMPORTS =====
const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require("fs");
const http = require("http");
const axios = require("axios");

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
        {role:"system",content:"Narrador épico argentino"},
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

// ===== DISTRITOS =====
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

// ===== PROBABILIDAD =====
function calcularProb(a,t,mem){
  let prob=0.4;

  if(a.item==="cuchillo") prob=0.7;
  if(a.item==="arco") prob=0.6;

  if(a.herido) prob-=0.2;
  if(t.herido) prob+=0.2;

  if(a.zona !== t.zona) prob -= 0.5;

  if(a.compañero === t.id) prob -= 0.4;

  if(!mem.esDeDia) prob += 0.15;

  if(mem.clima.includes("Niebla")) prob -= 0.25;
  if(mem.clima.includes("Frío")) prob -= 0.2;

  return prob;
}

// ===== EVENTOS =====
function eventoHambre(mem){
  const vivos = mem.jugadores.filter(j=>j.vivo);
  const [a,b,c] = [...vivos].sort(()=>Math.random()-0.5);

  const ev = pick(eventosHambre);

  let txt = ev.t
    .replaceAll("{a}",`<@${a?.id}>`)
    .replaceAll("{b}",`<@${b?.id}>`)
    .replaceAll("{c}",`<@${c?.id}>`);

  ev.k.forEach(k=>{
    if(k==="a") matar(a,mem);
    if(k==="b") matar(b,mem,a);
    if(k==="c") matar(c,mem,a);
  });

  return txt;
}

// ===== LOOP =====
async function loop(channel){

  let mem = loadMemory();

  // CORNUCOPIA
  for(const j of mem.jugadores){
    const ev = pick(eventosCornucopia);

    let txt = ev.t.replace("{a}", `<@${j.id}>`);

    if(ev.k.includes("a")) matar(j,mem);
    if(ev.item) j.item = ev.item;

    await channel.send("🏁 "+txt);
    await sleep(1200);
  }

  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length > 1){

    mem = loadMemory();

    let txt = await narrar(eventoHambre(mem));

    await channel.send({
      embeds:[new EmbedBuilder()
        .setTitle(`Ronda ${mem.ronda}`)
        .setDescription(txt)]
    });

    // ZONAS QUE SE CIERRAN
    if(mem.ronda % 5 === 0){

      const abiertas = mem.zonas.filter(z=>!mem.zonasCerradas.includes(z));

      if(abiertas.length > 1){
        const cerrada = pick(abiertas);
        mem.zonasCerradas.push(cerrada);

        channel.send(`☠️ La zona ${cerrada} es mortal`);

        mem.jugadores.forEach(j=>{
          if(j.vivo && j.zona === cerrada){
            if(Math.random() < 0.7){
              matar(j,mem);
            }
          }
        });
      }

      // ZONA FINAL
      if(mem.zonasCerradas.length >= mem.zonas.length-1){
        const final = mem.zonas.find(z=>!mem.zonasCerradas.includes(z));

        channel.send(`🔥 TODOS SON FORZADOS A ${final}`);

        mem.jugadores.forEach(j=>{
          j.zona = final;
        });
      }
    }

    // AVISO IA
    mem.jugadores.forEach(j=>{
      if(j.vivo && mem.zonasCerradas.includes(j.zona)){
        channel.send(`⚠️ <@${j.id}> está en zona peligrosa`);
      }
    });

    mem.ronda++;
    saveMemory(mem);

    await sleep(4000);
  }

  const ganador = mem.jugadores.find(j=>j.vivo);
  channel.send(`🏆 Ganador: <@${ganador.id}>`);
}

// ===== START =====
async function start(msg){

  const miembros = await msg.guild.members.fetch();

  const zonas = ["bosque","río","colinas","cueva","ruinas"];

  const jugadores = miembros
    .filter(m=>!m.user.bot)
    .map(m=>({
      id:m.user.id,
      vivo:true,
      item:null,
      herido:false,
      zona: pick(zonas)
    }));

  asignarDistritos(jugadores);

  let mem = {
    partidaActiva:true,
    jugadores,
    ronda:1,
    kills:{},
    muertosTotales:0,
    zonas,
    zonasCerradas:[],
    clima:"☀️",
    esDeDia:true
  };

  saveMemory(mem);

  msg.reply("🔥 Juego iniciado");

  loop(msg.channel);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = loadMemory();

  if(c==="!hambre") start(msg);

  if(c.startsWith("!mover")){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    const zona = c.split(" ")[1];

    if(mem.zonasCerradas.includes(zona)) return msg.reply("☠️ Cerrada");

    j.zona = zona;
    saveMemory(mem);

    msg.reply(`🚶 ${zona}`);
  }

  if(c==="!zona"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    msg.reply(`📍 ${j?.zona}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);