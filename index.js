const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const fs = require("fs");
const http = require("http");

// ===== IA =====
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== MEMORY =====
function loadMemory() {
  if (!fs.existsSync("memory.json")) {
    fs.writeFileSync("memory.json", JSON.stringify({
      partidaActiva:false,
      pausado:false,
      modo:"hambre",
      jugadores:[],
      ronda:0,
      historial:[],
      kills:{},
      muertosTotales:0
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync("memory.json"));
}

function saveMemory(mem) {
  fs.writeFileSync("memory.json", JSON.stringify(mem,null,2));
}

// ===== IA =====
async function narrar(txt){
  try{
    if(!process.env.GEMINI_API_KEY) return txt;
    const r = await model.generateContent(`Narrador oscuro brutal: ${txt}`);
    return r.response.text();
  }catch{
    return txt;
  }
}

// ===== LOOT =====
function asignarLoot(jugadores){
  const items=["cuchillo","agua","comida","linterna","botiquín","cuerda","arco"];
  jugadores.forEach(j=>{
    j.item=Math.random()<0.5?items[Math.floor(Math.random()*items.length)]:null;
    j.escondido=false;
    j.cooldown=0;
  });
  return jugadores;
}

// ===== KILL =====
function matar(j, mem, killer=null){
  if(!j.vivo) return;
  j.vivo=false;
  mem.muertosTotales++;

  if(killer){
    if(!mem.kills[killer.id]) mem.kills[killer.id]=0;
    mem.kills[killer.id]++;
  }
}

// ===== ATAQUE =====
function calcularAtaque(j){
  let base=0.5;
  if(j.item==="cuchillo") base+=0.4;
  if(j.item==="arco") base+=0.3;
  if(j.item==="cuerda") base+=0.2;
  return base;
}

// ===== EVENTOS HAMBRE (FULL) =====
function eventoHambre(vivos, ronda, mem){

  const pick=()=>vivos[Math.floor(Math.random()*vivos.length)];
  const a=pick();
  let b=pick(),c=pick(),d=pick();

  if(b.id===a.id) b=pick();
  if(c.id===a.id||c.id===b.id) c=pick();
  if(d.id===a.id||d.id===b.id||d.id===c.id) d=pick();

  let probMuerte=Math.min(0.9,0.25+ronda*0.12);

  const eventos=[

    // 🧊 SOCIALES
    {t:"{a} construye una fogata.",k:[]},
    {t:"{a} y {b} se acurrucan para sobrevivir.",k:[]},
    {t:"{a} y {b} se dan la mano.",k:[]},
    {t:"{a} escapa de la cornucopia.",k:[]},
    {t:"Los jugadores dejan la cornucopia vacía y sin recursos.",k:[]},

    // 💀 MUERTES / BRUTAL
    {t:"{a} y {b} intentan suicidarse… fallan y mueren.",k:["a","b"]},
    {t:"{a} se suicida.",k:["a"]},
    {t:"{a} mata brutalmente a {b} con una piedra.",k:["b"]},
    {t:"{a} intenta matar a {b}, falla y muere.",k:["a"]},
    {t:"{a} muere de frío.",k:["a"]},
    {t:"{a} roba provisiones de {b}, es descubierto y muere.",k:["a"]},
    {t:"{a} se esconde… pero {b} lo encuentra y lo mata.",k:["a"]},
    {t:"{a} y {b} discuten… ambos mueren.",k:["a","b"]},
    {t:"{a} cae en una trampa natural y muere.",k:["a"]},
    {t:"{a} intenta atacar a {b}, falla y muere.",k:["a"]},
    {t:"{a} se queda sin fuerzas y muere.",k:["a"]},
    {t:"{a} forma alianza con {b}… luego lo traiciona y lo mata.",k:["b"]},
    {t:"{a} se pierde en el bosque y muere.",k:["a"]},
    {t:"{a} embosca a {b} en la noche y lo mata.",k:["b"]},
    {t:"{a} intenta construir refugio… muere.",k:["a"]},
    {t:"{a} y {b} se enfrentan… uno muere.",k:["random_ab"]},
    {t:"{a} se arriesga demasiado y muere.",k:["a"]},
    {t:"{a} se confía… {b} lo mata.",k:["a"]},
    {t:"{a} se sacrifica por {b}… ambos mueren.",k:["a","b"]},
    {t:"{a} encuentra recurso… {b} lo mata.",k:["a"]},

    // 💥 CAOS
    {t:"{a} cae de un árbol sobre {b}… ambos mueren.",k:["a","b"]},
    {t:"{a} encuentra una bomba… explota y muere.",k:["a"]},
    {t:"{a} detona bomba y elimina a varios.",k:["a","b","c","d"],rare:true},
    {t:"{a} cae en un pozo y muere.",k:["a"]},
    {t:"{a} dispara a {b}, pero mata a {c}.",k:["c"]}
  ];

  let pool=eventos.filter(e=>!(e.rare && ronda<4));
  const ev=pool[Math.floor(Math.random()*pool.length)];

  let texto=ev.t
    .replaceAll("{a}",`<@${a.id}>`)
    .replaceAll("{b}",`<@${b.id}>`)
    .replaceAll("{c}",`<@${c.id}>`)
    .replaceAll("{d}",`<@${d.id}>`);

  ev.k.forEach(k=>{
    let target=null, killer=null;

    if(k==="a") target=a;
    if(k==="b"){target=b; killer=a;}
    if(k==="c") target=c;
    if(k==="d") target=d;
    if(k==="random_ab"){
      Math.random()<0.5?(target=a,killer=b):(target=b,killer=a);
    }

    if(!target) return;
    if(target.escondido && Math.random()<0.6) return;

    if(Math.random()<probMuerte){
      matar(target,mem,killer);
    }
  });

  return texto;
}

// ===== CALAMAR FIX =====
function eventoCalamar(mem){
  const vivos=mem.jugadores.filter(j=>j.vivo);

  if(vivos.length===2){
    const [a,b]=vivos;
    if(Math.random()<0.5){matar(b,mem); return `<@${a.id}> gana el final`;}
    else{matar(a,mem); return `<@${b.id}> gana el final`;}
  }

  let eliminados=vivos.filter(()=>Math.random()<0.4);

  if(eliminados.length===0){
    const forced=vivos[Math.floor(Math.random()*vivos.length)];
    matar(forced,mem);
    return `⚠️ <@${forced.id}> eliminado`;
  }

  eliminados.forEach(j=>matar(j,mem));
  return `🦑 Eliminados: ${eliminados.map(j=>`<@${j.id}>`).join(", ")}`;
}

// ===== LOOP =====
async function loop(channel){
  let mem=loadMemory();

  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length>1){

    mem=loadMemory();
    if(mem.pausado){ await new Promise(r=>setTimeout(r,3000)); continue; }

    const vivos=mem.jugadores.filter(j=>j.vivo);

    let texto = mem.modo==="calamar"
      ? eventoCalamar(mem)
      : eventoHambre(vivos,mem.ronda,mem);

    mem.historial.push(texto);

    saveMemory(mem);

    const narrado=await narrar(texto);

    await channel.send({
      embeds:[new EmbedBuilder()
        .setTitle(`🔥 RONDA ${mem.ronda}`)
        .setDescription(narrado)]
    });

    await new Promise(r=>setTimeout(r,4000));

    mem.ronda++;
    saveMemory(mem);
  }

  const ganador=mem.jugadores.find(j=>j.vivo);
  if(ganador) channel.send(`🏆 <@${ganador.id}> ganó`);

  mem.partidaActiva=false;
  saveMemory(mem);
}

// ===== START =====
async function start(msg,modo="hambre"){
  let mem=loadMemory();
  if(mem.partidaActiva) return msg.reply("⚠️ Ya hay partida");

  const miembros=await msg.guild.members.fetch();
  let jugadores=miembros.filter(m=>!m.user.bot).map(m=>({id:m.user.id,vivo:true}));

  jugadores=asignarLoot(jugadores);

  mem.partidaActiva=true;
  mem.modo=modo;
  mem.jugadores=jugadores;
  mem.ronda=1;
  mem.historial=[];
  mem.kills={};
  mem.muertosTotales=0;
  mem.pausado=false;

  saveMemory(mem);

  msg.reply(`🎮 Inicia ${modo}`);
  setTimeout(()=>loop(msg.channel),2000);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;

  const c=msg.content.toLowerCase();
  let mem=loadMemory();

  if(c==="!hambre") start(msg,"hambre");
  if(c==="!calamar") start(msg,"calamar");

  if(c==="!pausa"){mem.pausado=true;saveMemory(mem);msg.reply("⏸️");}
  if(c==="!reanudar"){mem.pausado=false;saveMemory(mem);msg.reply("▶️");}
  if(c==="!parar"){mem.partidaActiva=false;saveMemory(mem);msg.reply("⛔");}
});

// ===== READY =====
client.once(Events.ClientReady,()=>console.log("🔥 FULL SIN RECORTES activo"));

client.login(process.env.DISCORD_TOKEN);

http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);