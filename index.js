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

function saveMemory(mem){
  fs.writeFileSync("memory.json", JSON.stringify(mem,null,2));
}

// ===== UTIL =====
const pick = arr => arr[Math.floor(Math.random()*arr.length)];

// ===== KILL =====
function matar(j, mem, killer=null){
  if(!j || !j.vivo) return;
  j.vivo=false;
  mem.muertosTotales++;

  if(killer){
    if(!mem.kills[killer.id]) mem.kills[killer.id]=0;
    mem.kills[killer.id]++;
  }
}

// ===== LOOT =====
function asignarLoot(jugadores){
  const items=["cuchillo","agua","comida","linterna","botiquín","cuerda","arco"];

  jugadores.forEach(j=>{
    j.item=Math.random()<0.5?pick(items):null;
    j.escondido=false;
    j.cooldown=0;
  });

  return jugadores;
}

// ===== EVENTOS HAMBRE (100% COMPLETO) =====
function eventoHambre(vivos, ronda, mem){

  const a=pick(vivos);
  const b=pick(vivos);
  const c=pick(vivos);
  const d=pick(vivos);

  const eventos = [

    // 🧊 SOCIALES / NEUTROS
    {t:"{a} construye una fogata.",k:[]},
    {t:"{a} y {b} se acurrucan para sobrevivir.",k:[]},
    {t:"{a} encuentra agua fresca y recupera fuerzas.",k:[]},
    {t:"{a} logra encender una fogata y espantar el frío.",k:[]},
    {t:"{a} descubre un sendero oculto que lo mantiene a salvo.",k:[]},
    {t:"{a} encuentra un escondite seguro.",k:[]},
    {t:"{a} construye un refugio improvisado y sobrevive la noche.",k:[]},
    {t:"{a} encuentra frutas silvestres y se alimenta.",k:[]},
    {t:"{a} se esconde en silencio y evita ser descubierto.",k:[]},
    {t:"{a} encuentra un recurso valioso y lo guarda.",k:[]},

    // 💚 POSITIVOS
    {t:"{a} ayuda a {b} a levantarse tras una caída.",k:[]},
    {t:"{a} comparte comida con {b}.",k:[]},
    {t:"{a} encuentra un amuleto misterioso.",k:[]},
    {t:"{a} y {b} ríen juntos en medio del caos.",k:[]},
    {t:"{a} descubre un escondite seguro y descansa.",k:[]},
    {t:"{a} recibe apoyo inesperado de {b}.",k:[]},
    {t:"{a} encuentra un río cristalino.",k:[]},
    {t:"{a} y {b} recuerdan viejos tiempos.",k:[]},
    {t:"{a} siente una extraña calma.",k:[]},
    {t:"{a} y {b} sobreviven una tormenta juntos.",k:[]},
    {t:"{a} y {b} tienen un encuentro íntimo durante la noche.",k:[]},

    // 💀 MUERTES
    {t:"{a} intenta un plan arriesgado contra {b}, pero falla y muere.",k:["a"]},
    {t:"{a} muere de frío.",k:["a"]},
    {t:"{a} muere de hambre lentamente.",k:["a"]},
    {t:"{a} cae en un pozo y muere.",k:["a"]},
    {t:"{a} cae en una trampa natural y muere.",k:["a"]},
    {t:"{a} cae de un árbol y muere.",k:["a"]},
    {t:"{a} es picado por una serpiente y muere de disentería.",k:["a"]},
    {t:"{a} muere de disentería.",k:["a"]},
    {t:"{a} se ahoga en un río y muere.",k:["a"]},
    {t:"{a} se intoxica con frutos venenosos y muere.",k:["a"]},

    // ⚔️ COMBATE
    {t:"{a} mata brutalmente a {b} con una piedra.",k:["b"]},
    {t:"{a} asesina a {b} mientras duerme.",k:["b"]},
    {t:"{a} apuñala a {b} hasta matarlo.",k:["b"]},
    {t:"{a} ataca a {b}, falla y muere.",k:["a"]},
    {t:"{a} se confía y {b} lo mata.",k:["a"]},
    {t:"{a} envenena la comida de {b}, pero se equivoca y muere.",k:["a"]},

    // 🧠 TRAICIÓN
    {t:"{a} traiciona a {b} y lo mata.",k:["b"]},
    {t:"{a} finge alianza con {b} y luego lo mata.",k:["b"]},
    {t:"{a} y {b} discuten por comida… ambos mueren.",k:["a","b"]},

    // 💀 SUICIDIOS
    {t:"{a} no soporta la presión y se suicida.",k:["a"]},
    {t:"{a} pierde la cordura y se suicida.",k:["a"]},
    {t:"{a} y {b} intentan suicidarse juntos y mueren.",k:["a","b"]},
    {t:"{a} y {b} amenazan con doble suicidio, fallan y mueren.",k:["a","b"]},

    // 💥 CAOS
    {t:"{a} encuentra una bomba, esta falla y explota.",k:["a"]},
    {t:"{a} pierde el control y detona una bomba que mata a varios.",k:["a","b","c","d"],rare:true},
    {t:"{a} dispara una flecha hacia {b}, pero falla y golpea a {c}, que muere.",k:["c"]},
    {t:"{a} se sube a un árbol pero cae sobre {b} y mueren.",k:["a","b"]},
    {t:"{a} provoca un incendio en el bosque y muere atrapado.",k:["a"]},
    {t:"{a} pisa una mina oculta y muere.",k:["a"]},

    // 🎲 MIX
    {t:"{a} y {b} discuten y ambos mueren.",k:["a","b"]},
    {t:"{a} se sacrifica por {b} y ambos mueren.",k:["a","b"]},
    {t:"{a} y {b} se enfrentan y solo uno sobrevive.",k:["random_ab"]}
  ];

  const ev = pick(eventos);

  let texto = ev.t
    .replaceAll("{a}",`<@${a.id}>`)
    .replaceAll("{b}",`<@${b.id}>`)
    .replaceAll("{c}",`<@${c.id}>`)
    .replaceAll("{d}",`<@${d.id}>`);

  ev.k.forEach(k=>{
    if(k==="a") matar(a,mem);
    if(k==="b") matar(b,mem,a);
    if(k==="c") matar(c,mem);
    if(k==="d") matar(d,mem);

    if(k==="random_ab"){
      Math.random()<0.5 ? matar(a,mem,b) : matar(b,mem,a);
    }
  });

  return texto;
}

// ===== CALAMAR COMPLETO =====
function eventoCalamar(mem){
  const vivos = mem.jugadores.filter(j=>j.vivo);
  if(vivos.length<=1) return "🦑 Fin";

  const a=pick(vivos);
  const b=pick(vivos);

  const eventos = [
    {t:"🔴🟢 Luz roja, luz verde… varios caen.",k:["random_group"]},
    {t:"🍪 Juego del panal… algunos mueren.",k:["random_group"]},
    {t:"🪢 Tira y afloja… caen al vacío.",k:["random_group"]},
    {t:"🎲 Canicas… pierden y mueren.",k:["random_group"]},
    {t:"🌉 Puente… caen y mueren.",k:["random_group"]},

    // descanso
    {t:"{a} ataca a {b} mientras duerme.",k:["b"]},
    {t:"{a} roba comida y {b} lo descubre… pelea mortal.",k:["b"]},
    {t:"Se apagan las luces… el caos deja muertos.",k:["random_group"]},
    {t:"{a} elimina a {b}.",k:["b"]},
    {t:"{a} traiciona a {b}.",k:["b"]}
  ];

  const ev = pick(eventos);

  let texto = ev.t
    .replaceAll("{a}",`<@${a.id}>`)
    .replaceAll("{b}",`<@${b.id}>`);

  ev.k.forEach(k=>{
    if(k==="b") matar(b,mem,a);

    if(k==="random_group"){
      vivos.forEach(j=>{
        if(Math.random()<0.4) matar(j,mem);
      });
    }
  });

  return texto;
}

// ===== LOOP =====
async function loop(channel){
  let mem=loadMemory();

  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length>1){

    mem=loadMemory();
    if(mem.pausado){
      await new Promise(r=>setTimeout(r,3000));
      continue;
    }

    const vivos=mem.jugadores.filter(j=>j.vivo);

    let texto = mem.modo==="calamar"
      ? eventoCalamar(mem)
      : eventoHambre(vivos,mem.ronda,mem);

    mem.historial.push(texto);
    saveMemory(mem);

    await channel.send({
      embeds:[new EmbedBuilder()
        .setTitle(`🔥 RONDA ${mem.ronda}`)
        .setDescription(texto)]
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
  let jugadores=miembros.filter(m=>!m.user.bot)
    .map(m=>({id:m.user.id,vivo:true}));

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
client.once(Events.ClientReady,()=>{
  console.log("🔥 100% EVENTOS ACTIVO");
});

client.login(process.env.DISCORD_TOKEN);

http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);