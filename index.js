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

  if(killer){
    if(!mem.kills[killer.id]) mem.kills[killer.id]=0;
    mem.kills[killer.id]++;

    if(mem.bounties.includes(j.id)){
      mem.kills[killer.id]+=2;
    }
  }
}

function asignarDistritos(jugadores){
  let d = 1;
  for(let i=0;i<jugadores.length;i+=2){
    jugadores[i].distrito = d;
    if(jugadores[i+1]) jugadores[i+1].distrito = d;
    d++;
  }
}

function toggleDia(mem){
  mem.esDeDia = !mem.esDeDia;
  return mem.esDeDia ? "☀️ Día" : "🌙 Noche";
}

function cambiarClima(mem){
  const climas = ["☀️ Normal","🌧️ Lluvia","🌫️ Niebla","❄️ Frío"];
  mem.clima = pick(climas);
  return mem.clima;
}

function calcularProb(a,t,mem){
  let prob = 0.4;

  if(a.item==="cuchillo") prob=0.7;
  if(a.item==="arco") prob=0.6;

  if(a.herido) prob -= 0.2;
  if(t.herido) prob += 0.2;

  if(t.escondido) prob -= 0.3;

  if(a.distrito === t.distrito) prob -= 0.25;

  if(mem.alianzas.find(x =>
    (x.a===a.id && x.b===t.id)||(x.a===t.id && x.b===a.id)
  )) prob -= 0.5;

  if(!mem.esDeDia) prob += 0.1;

  if(mem.clima.includes("Niebla")) prob -= 0.15;
  if(mem.clima.includes("Frío")) prob -= 0.1;

  return prob;
}

// ===== EVENTOS =====
function eventoCornucopia(mem){
  const vivos = mem.jugadores.filter(j=>j.vivo);
  const a = pick(vivos);
  const ev = pick(eventosCornucopia);

  let txt = ev.t.replace("{a}",`<@${a.id}>`);

  if(ev.k.includes("a")) matar(a,mem);
  if(ev.item) a.item = ev.item;

  return txt;
}

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
  let db = loadDB();

  for(let i=0;i<mem.jugadores.length;i++){
    await channel.send("🏁 " + eventoCornucopia(mem));
    await sleep(1200);
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

    if(mem.ronda % 3 === 0){
      let t = pick(mem.jugadores.filter(j=>j.vivo));
      mem.bounties.push(t.id);
      channel.send(`🎯 Recompensa por <@${t.id}>`);
    }

    if(mem.ronda % 5 === 0){
      let estado = toggleDia(mem);
      let clima = cambiarClima(mem);

      channel.send(`📊 Muertos: ${mem.muertosTotales}\n${estado}\n${clima}`);
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

  const ranking = Object.entries(mem.kills)
    .sort((a,b)=>b[1]-a[1])
    .map(([id,k])=>`<@${id}>: ${k}`)
    .join("\n");

  channel.send(`🏆 <@${ganador.id}>\n${ranking}`);

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
    modo,
    jugadores,
    ronda:1,
    kills:{},
    muertosTotales:0,
    traiciones:[],
    esDeDia:true,
    alianzas:[],
    bounties:[],
    clima:"☀️ Normal"
  };

  saveMemory(mem);
  msg.reply("🎮 Iniciando");

  loop(msg.channel);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = loadMemory();

  if(c==="!hambre") start(msg,"hambre");
  if(c==="!calamar") start(msg,"calamar");

  if(c.startsWith("!atacar")){
    const atacante = mem.jugadores.find(j=>j.id===msg.author.id);
    const objetivo = msg.mentions.users.first();
    const target = mem.jugadores.find(j=>j.id===objetivo?.id);

    if(!atacante || !target) return;

    let prob = calcularProb(atacante,target,mem);

    if(Math.random()<prob){
      matar(target,mem,atacante);
      msg.reply("⚔️ kill");
    }else msg.reply("⚠️ fail");

    atacante.cooldown=2;
    saveMemory(mem);
  }

  if(c==="!esconderse"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    j.escondido=true;
    saveMemory(mem);
    msg.reply("🫥");
  }

  if(c.startsWith("!aliarse")){
    const o = msg.mentions.users.first();
    mem.alianzas.push({a:msg.author.id,b:o.id});
    saveMemory(mem);
    msg.reply("🤝");
  }

  if(c==="!romper"){
    mem.alianzas = mem.alianzas.filter(x=>x.a!==msg.author.id && x.b!==msg.author.id);
    saveMemory(mem);
    msg.reply("💔");
  }
});

client.login(process.env.DISCORD_TOKEN);
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);