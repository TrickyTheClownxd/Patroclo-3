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
      partidaActiva: false,
      pausado: false,
      modo: "hambre",
      jugadores: [],
      ronda: 0,
      historial: [],
      kills: {},
      muertosTotales: 0
    }, null, 2));
  }
  return JSON.parse(fs.readFileSync("memory.json"));
}

function saveMemory(mem) {
  fs.writeFileSync("memory.json", JSON.stringify(mem, null, 2));
}

// ===== IA NARRADOR =====
async function narrar(txt) {
  try {
    if (!process.env.GEMINI_API_KEY) return txt;
    const r = await model.generateContent(`Narrador oscuro estilo serie: ${txt}`);
    return r.response.text();
  } catch {
    return txt;
  }
}

// ===== LOOT =====
function asignarLoot(jugadores) {
  const items = ["cuchillo","agua","comida","linterna","botiquín","cuerda","arco"];

  jugadores.forEach(j=>{
    j.item = Math.random()<0.5 ? items[Math.floor(Math.random()*items.length)] : null;
    j.escondido = false;
    j.cooldown = 0;
  });

  return jugadores;
}

// ===== KILL =====
function matar(j, mem, killer=null) {
  if (!j.vivo) return;
  j.vivo = false;
  mem.muertosTotales++;

  if (killer) {
    if (!mem.kills[killer.id]) mem.kills[killer.id] = 0;
    mem.kills[killer.id]++;
  }
}

// ===== ATAQUE =====
function calcularAtaque(j) {
  let base = 0.5;
  if (j.item==="cuchillo") base+=0.4;
  if (j.item==="arco") base+=0.3;
  if (j.item==="cuerda") base+=0.2;
  return base;
}

// ===== EVENTOS HAMBRE =====
function eventoHambre(vivos, ronda, mem) {

  const pick = () => vivos[Math.floor(Math.random()*vivos.length)];
  const a = pick();
  let b = pick(), c = pick(), d = pick();

  if (b.id===a.id) b=pick();
  if (c.id===a.id||c.id===b.id) c=pick();
  if (d.id===a.id||d.id===b.id||d.id===c.id) d=pick();

  let probMuerte = Math.min(0.9, 0.25 + ronda * 0.12);

  const eventos = [
    { t: "{a} construye una fogata.", k: [] },
    { t: "{a} y {b} se acurrucan para sobrevivir.", k: [] },
    { t: "{a} y {b} se dan la mano.", k: [] },
    { t: "{a} escapa de la cornucopia.", k: [] },
    { t: "Los jugadores dejan la cornucopia vacía.", k: [] },

    { t: "{a} intenta un plan arriesgado contra {b}, pero falla y muere.", k:["a"] },
    { t: "{a} muere de frío.", k:["a"] },
    { t: "{a} mata brutalmente a {b} con una piedra.", k:["b"] },
    { t: "{a} roba provisiones de {b}, pero es descubierto y muere.", k:["a"] },
    { t: "{a} se esconde en la oscuridad, pero {b} lo encuentra y lo mata.", k:["a"] },
    { t: "{a} y {b} discuten por comida… ambos mueren.", k:["a","b"] },
    { t: "{a} cae en una trampa natural y muere.", k:["a"] },
    { t: "{a} intenta atacar a {b}, pero falla y muere.", k:["a"] },
    { t: "{a} se queda sin fuerzas y muere.", k:["a"] },
    { t: "{a} y {b} forman una alianza temporal… que pronto se rompe con sangre.", k:[] },
    { t: "{a} se pierde en el bosque y muere.", k:["a"] },
    { t: "{a} embosca a {b} durante la noche y lo mata.", k:["b"] },
    { t: "{a} intenta construir refugio, pero fracasa y muere.", k:["a"] },
    { t: "{a} y {b} se enfrentan… solo uno sobrevive.", k:["random_ab"] },
    { t: "{a} se arriesga demasiado y muere.", k:["a"] },
    { t: "{a} se confía demasiado y {b} lo mata.", k:["b"] },
    { t: "{a} se sacrifica para salvar a {b}, pero ambos mueren.", k:["a","b"] },
    { t: "{a} encuentra un recurso valioso, pero {b} lo mata.", k:["b"] },
    { t: "{a} y {b} se enfrentan en la última ronda… alguien muere.", k:["random_ab"] },

    { t: "{a} cae de un árbol sobre {b}… ambos mueren.", k:["a","b"] },
    { t: "{a} encuentra una bomba, esta falla y explota.", k:["a"] },
    { t: "{a} pierde el control y detona una bomba que elimina a varios.", k:["a","b","c","d"], rare:true },
    { t: "{a} cae en un pozo y muere.", k:["a"] },
    { t: "{a} dispara a {b}, pero mata a {c}.", k:["c"] }
  ];

  let pool = eventos.filter(e => !(e.rare && ronda < 4));
  const ev = pool[Math.floor(Math.random()*pool.length)];

  let texto = ev.t
    .replaceAll("{a}", `<@${a.id}>`)
    .replaceAll("{b}", `<@${b.id}>`)
    .replaceAll("{c}", `<@${c.id}>`)
    .replaceAll("{d}", `<@${d.id}>`);

  ev.k.forEach(k => {
    let target=null, killer=null;

    if(k==="a") target=a;
    if(k==="b"){ target=b; killer=a; }
    if(k==="c") target=c;
    if(k==="d") target=d;
    if(k==="random_ab"){
      Math.random()<0.5 ? (target=a, killer=b) : (target=b, killer=a);
    }

    if(!target) return;
    if(target.escondido && Math.random()<0.6) return;

    if(Math.random()<probMuerte){
      matar(target, mem, killer);
    }
  });

  return texto;
}

// ===== CALAMAR =====
function eventoCalamar(mem) {

  const vivos = mem.jugadores.filter(j=>j.vivo);
  if (vivos.length <= 1) return "🦑 Fin";

  let texto = "";
  let eliminados = [];

  switch(mem.ronda) {
    case 1:
      eliminados = vivos.filter(()=>Math.random()<0.3);
      texto = "🔴🟢 Luz roja, luz verde...";
      break;

    case 2:
      eliminados = vivos.filter(()=>Math.random()<0.35);
      texto = "🍪 Juego del panal...";
      break;

    case 3:
      eliminados = vivos.filter(()=>Math.random()<0.4);
      texto = "🪢 Tira y afloja...";
      break;

    case 4:
      for (let i=0;i<vivos.length;i+=2){
        if(vivos[i+1]){
          eliminados.push(Math.random()<0.5 ? vivos[i] : vivos[i+1]);
        }
      }
      texto = "🎲 Canicas...";
      break;

    case 5:
      eliminados = vivos.filter(()=>Math.random()<0.5);
      texto = "🌉 Puente de cristal...";
      break;

    default:
      if(vivos.length>1){
        eliminados=[vivos[Math.floor(Math.random()*vivos.length)]];
        texto="🦑 Batalla final...";
      }
      break;
  }

  eliminados.forEach(j=>matar(j,mem));

  return `${texto}\n💀 Eliminados: ${eliminados.map(j=>`<@${j.id}>`).join(", ") || "Nadie"}`;
}

// ===== LOOP =====
async function loop(channel) {

  let mem = loadMemory();

  while (mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length > 1) {

    mem = loadMemory();
    if (mem.pausado) { await new Promise(r=>setTimeout(r,3000)); continue; }

    const vivos = mem.jugadores.filter(j=>j.vivo);

    let texto = mem.modo === "calamar"
      ? eventoCalamar(mem)
      : eventoHambre(vivos, mem.ronda, mem);

    mem.historial.push(texto);

    mem.jugadores.forEach(j=>{
      if(j.escondido && Math.random()<0.5) j.escondido=false;
      if(j.cooldown>0) j.cooldown--;
    });

    saveMemory(mem);

    const narrado = await narrar(texto);

    await channel.send({
      embeds:[new EmbedBuilder()
        .setTitle(`🔥 RONDA ${mem.ronda}`)
        .setDescription(narrado)]
    });

    const muertos = mem.jugadores.filter(j=>!j.vivo).map(j=>`<@${j.id}>`);
    if (muertos.length>0) {
      await channel.send(`💀 Muertos (${mem.muertosTotales}):\n${muertos.join(", ")}`);
    }

    await new Promise(r=>setTimeout(r,5000));

    mem.ronda++;
    saveMemory(mem);
  }

  const ganador = mem.jugadores.find(j=>j.vivo);
  if (ganador) channel.send(`🏆 <@${ganador.id}> ganó`);

  mem.partidaActiva=false;
  saveMemory(mem);
}

// ===== START =====
async function start(msg, modo="hambre") {
  let mem = loadMemory();
  if (mem.partidaActiva) return msg.reply("⚠️ Ya hay partida");

  const miembros = await msg.guild.members.fetch();
  let jugadores = miembros.filter(m=>!m.user.bot)
    .map(m=>({id:m.user.id,vivo:true}));

  jugadores = asignarLoot(jugadores);

  mem.partidaActiva=true;
  mem.modo=modo;
  mem.jugadores=jugadores;
  mem.ronda=1;
  mem.historial=[];
  mem.kills={};
  mem.muertosTotales=0;
  mem.pausado=false;

  saveMemory(mem);

  msg.reply(`🎮 Comienza ${modo}`);
  setTimeout(()=>loop(msg.channel),2000);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;

  const c = msg.content.toLowerCase();
  let mem = loadMemory();

  if (c==="!hambre") start(msg,"hambre");
  if (c==="!calamar") start(msg,"calamar");

  if (c.startsWith("!atacar")) {
    if (!mem.partidaActiva) return msg.reply("❌ No hay partida");

    const atacante = mem.jugadores.find(j=>j.id===msg.author.id);
    const objetivo = msg.mentions.users.first();

    if (!atacante || !atacante.vivo) return msg.reply("💀 Estás muerto");
    if (!objetivo) return msg.reply("❌ Menciona objetivo");
    if (atacante.cooldown>0) return msg.reply("⏳ Espera");

    const target = mem.jugadores.find(j=>j.id===objetivo.id);
    if (!target || !target.vivo) return msg.reply("❌ Inválido");

    let prob = calcularAtaque(atacante);
    if (target.escondido) prob -= 0.3;

    if (Math.random()<prob) {
      matar(target, mem, atacante);
      msg.reply(`⚔️ Eliminaste a <@${target.id}>`);
    } else {
      if (Math.random()<0.5) {
        matar(atacante, mem, target);
        msg.reply("💀 Fallaste y moriste");
      } else {
        msg.reply("⚠️ Fallaste");
      }
    }

    atacante.cooldown = 2;
    saveMemory(mem);
  }

  if (c==="!esconderse") {
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if (!j || !j.vivo) return msg.reply("💀 No podés");

    j.escondido = true;
    j.cooldown = 2;
    saveMemory(mem);

    msg.reply("🫥 Te escondiste");
  }

  if (c==="!inventario") {
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if (!j) return msg.reply("❌ No estás");

    msg.reply(`🎒 ${j.item || "Nada"}`);
  }

  if (c==="!pausa"){ mem.pausado=true; saveMemory(mem); msg.reply("⏸️"); }
  if (c==="!reanudar"){ mem.pausado=false; saveMemory(mem); msg.reply("▶️"); }
  if (c==="!parar"){ mem.partidaActiva=false; saveMemory(mem); msg.reply("⛔"); }
});

// ===== READY =====
client.once(Events.ClientReady, () => {
  console.log("🔥 Patroclo FINAL COMPLETO activo");
});

client.login(process.env.DISCORD_TOKEN);

http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT || 8080);