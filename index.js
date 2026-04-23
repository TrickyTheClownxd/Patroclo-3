const { Client, GatewayIntentBits, Events } = require('discord.js');
require('dotenv').config();
const fs = require("fs");
const http = require("http");

const { eventosCornucopia, eventosHambre, eventosCalamar } = require("./eventos");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ===== MEMORY =====
function loadMemory(){
  return JSON.parse(fs.readFileSync("memory.json"));
}
function saveMemory(mem){
  fs.writeFileSync("memory.json", JSON.stringify(mem,null,2));
}

const pick = arr => arr[Math.floor(Math.random()*arr.length)];

// ===== KILL =====
function matar(j, mem, killer=null){
  if(!j || !j.vivo) return;
  j.vivo=false;
  if(killer){
    if(!mem.kills) mem.kills={};
    mem.kills[killer.id]=(mem.kills[killer.id]||0)+1;
  }
}

// ===== ATAQUE =====
function calcularAtaque(j){
  if(j.item==="cuchillo") return 0.7;
  if(j.item==="arco") return 0.6;
  return 0.4;
}

// ===== EVENTOS =====
function ejecutarEvento(lista, vivos, mem){
  const shuffled=[...vivos].sort(()=>Math.random()-0.5);
  const a=shuffled[0], b=shuffled[1]||a, c=shuffled[2]||a, d=shuffled[3]||a;

  const ev = pick(lista);

  let texto = ev.t
    .replaceAll("{a}",`<@${a.id}>`)
    .replaceAll("{b}",`<@${b.id}>`)
    .replaceAll("{c}",`<@${c.id}>`)
    .replaceAll("{d}",`<@${d.id}>`);

  (ev.k||[]).forEach(k=>{
    if(k==="a") matar(a,mem);
    if(k==="b") matar(b,mem,a);
    if(k==="c") matar(c,mem,a);
    if(k==="d") matar(d,mem,a);

    if(k==="random_group"){
      vivos.forEach(j=>{
        if(Math.random()<0.35) matar(j,mem);
      });
    }

    if(k==="random_ab"){
      Math.random()<0.5 ? matar(a,mem,b) : matar(b,mem,a);
    }
  });

  if(ev.item && a.vivo){
    a.item = ev.item;
  }

  return texto;
}

// ===== LOOP =====
async function loop(channel){
  let mem = loadMemory();

  // CORNUCOPIA SOLO RONDA 1
  if(mem.modo==="hambre"){
    const vivos = mem.jugadores.filter(j=>j.vivo);
    const txt = ejecutarEvento(eventosCornucopia, vivos, mem);
    await channel.send(`🏹 **CORNUCOPIA**\n${txt}`);
    mem.ronda++;
    saveMemory(mem);
  }

  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length > 1){
    mem = loadMemory();
    if(mem.pausado){
      await new Promise(r=>setTimeout(r,3000));
      continue;
    }

    const vivos = mem.jugadores.filter(j=>j.vivo);

    const lista = mem.modo==="calamar" ? eventosCalamar : eventosHambre;
    const texto = ejecutarEvento(lista, vivos, mem);

    await channel.send(`🔥 **RONDA ${mem.ronda}**\n${texto}`);

    mem.ronda++;
    mem.jugadores.forEach(j=>{
      if(j.cooldown>0) j.cooldown--;
      j.escondido=false;
    });

    saveMemory(mem);
    await new Promise(r=>setTimeout(r,5000));
  }

  const ganador = mem.jugadores.find(j=>j.vivo);
  if(ganador){
    channel.send(`🏆 GANADOR: <@${ganador.id}>`);
  }

  mem.partidaActiva=false;
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
    jugadores,
    ronda:1,
    kills:{}
  };

  saveMemory(mem);
  msg.reply(`🎮 Iniciando ${modo}`);
  loop(msg.channel);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = loadMemory();

  if(c==="!hambre") start(msg,"hambre");
  if(c==="!calamar") start(msg,"calamar");

  // ATAQUE
  if(c.startsWith("!atacar")){
    if(!mem.partidaActiva) return msg.reply("❌ No hay partida");

    const atacante = mem.jugadores.find(j=>j.id===msg.author.id);
    const objetivo = msg.mentions.users.first();

    if(!atacante || !atacante.vivo) return msg.reply("💀 Estás muerto");
    if(!objetivo) return msg.reply("❌ Menciona objetivo");
    if(atacante.cooldown>0) return msg.reply("⏳ Espera");

    const target = mem.jugadores.find(j=>j.id===objetivo.id);
    if(!target || !target.vivo) return msg.reply("❌ Inválido");

    let prob = calcularAtaque(atacante);
    if(target.escondido) prob -= 0.3;

    if(Math.random()<prob){
      matar(target, mem, atacante);
      msg.reply(`⚔️ Eliminaste a <@${target.id}>`);
    } else {
      if(Math.random()<0.5){
        matar(atacante, mem, target);
        msg.reply("💀 Fallaste y moriste");
      } else {
        msg.reply("⚠️ Fallaste");
      }
    }

    atacante.cooldown=2;
    saveMemory(mem);
  }

  // ESCONDERSE
  if(c==="!esconderse"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if(!j || !j.vivo) return msg.reply("💀 No podés");

    j.escondido=true;
    j.cooldown=2;

    saveMemory(mem);
    msg.reply("🫥 Te escondiste");
  }

  // INVENTARIO
  if(c==="!inventario"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if(!j) return;

    msg.reply(`🎒 Item: ${j.item||"Nada"} | Kills: ${mem.kills[j.id]||0}`);
  }

  // CONTROL
  if(c==="!pausa"){ mem.pausado=true; saveMemory(mem); msg.reply("⏸️"); }
  if(c==="!reanudar"){ mem.pausado=false; saveMemory(mem); msg.reply("▶️"); }
  if(c==="!parar"){ mem.partidaActiva=false; saveMemory(mem); msg.reply("⛔"); }
});

client.login(process.env.DISCORD_TOKEN);
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);