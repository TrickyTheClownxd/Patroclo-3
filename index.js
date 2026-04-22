const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
require('dotenv').config();
const fs = require("fs");
const http = require("http");

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
      partidaActiva:false, pausado:false, modo:"hambre", temporada:1, jugadores:[], ronda:0, kills:{}, muertosTotales:0
    }, null, 2));
  }
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
  mem.muertosTotales++;
  if(killer){
    if(!mem.kills[killer.id]) mem.kills[killer.id]=0;
    mem.kills[killer.id]++;
  }
}

// ===== HAMBRE (LISTA REGISTRADA EXACTA) =====
function eventoHambre(vivos, ronda, mem){
  const shuffled=[...vivos].sort(()=>Math.random()-0.5);
  const a=shuffled[0], b=shuffled[1]||a, c=shuffled[2]||a, d=shuffled[3]||a;

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
    {t:"{a} envenena la comida de {b}, pero se equivoca y come él mismo, muriendo brutalmente.",k:["a"]},

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

  const pool = ronda < 4 ? eventos.filter(e => !e.rare) : eventos;
  const ev = pick(pool);

  let texto = ev.t.replaceAll("{a}",`<@${a.id}>`).replaceAll("{b}",`<@${b.id}>`).replaceAll("{c}",`<@${c.id}>`).replaceAll("{d}",`<@${d.id}>`);

  ev.k.forEach(k=>{
    if(k==="a") matar(a,mem);
    if(k==="b") matar(b,mem,a);
    if(k==="c") matar(c,mem,a);
    if(k==="d") matar(d,mem,a);
    if(k==="random_ab") Math.random()<0.5?matar(a,mem,b):matar(b,mem,a);
  });
  return texto;
}

// ===== CALAMAR =====
function eventoCalamar(mem){
  const vivos = mem.jugadores.filter(j=>j.vivo);
  if(vivos.length<=1) return "🦑 Fin del juego.";
  const shuffled=[...vivos].sort(()=>Math.random()-0.5);
  const a=shuffled[0], b=shuffled[1]||a;

  let eventos = mem.temporada === 1 ? [
    {t:"🔴🟢 Luz roja, luz verde… varios caen.",k:["random_group"]},
    {t:"🍪 Juego del panal… algunos mueren.",k:["random_group"]},
    {t:"🪢 Tira y afloja… el equipo perdedor cae.",k:["random_group"]},
    {t:"🎲 Canicas… los perdedores mueren.",k:["random_group"]},
    {t:"🌉 Puente de cristal… caídas mortales.",k:["random_group"]},
    {t:"{a} mata a {b} mientras duerme.",k:["b"]},
    {t:"🦑 Batalla final… solo uno sobrevive.",k:["final"]}
  ] : [
    {t:"🔴🟢 Versión avanzada… masacre total.",k:["random_group"]},
    {t:"🍪 Panal extremo… errores fatales.",k:["random_group"]},
    {t:"🪢 Tira y afloja brutal… todos caen.",k:["random_group"]},
    {t:"{a} traiciona a {b} y lo mata.",k:["b"]},
    {t:"🦑 Final sangriento… solo uno vive.",k:["final"]}
  ];

  const ev = pick(eventos);
  let texto = ev.t.replaceAll("{a}",`<@${a.id}>`).replaceAll("{b}",`<@${b.id}>`);

  ev.k.forEach(k=>{
    if(k==="b") matar(b,mem,a);
    if(k==="random_group") vivos.forEach(j=>{ if(Math.random() < (mem.temporada === 1 ? 0.35 : 0.5)) matar(j,mem); });
    if(k==="final") {
      const winner = pick(vivos);
      vivos.forEach(j=>{ if(j.id !== winner.id) matar(j,mem); });
    }
  });
  return texto;
}

// ===== LOOP =====
async function loop(channel){
  let mem=loadMemory();
  while(mem.partidaActiva && mem.jugadores.filter(j=>j.vivo).length > 1){
    mem=loadMemory();
    if(mem.pausado){ await new Promise(r=>setTimeout(r,3000)); continue; }

    const vivos=mem.jugadores.filter(j=>j.vivo);
    const texto = mem.modo === "calamar" ? eventoCalamar(mem) : eventoHambre(vivos, mem.ronda, mem);

    await channel.send({ embeds:[new EmbedBuilder().setTitle(`🔥 RONDA ${mem.ronda}`).setDescription(texto).setColor(mem.modo==="calamar"?"#00ffff":"#ff0000")] });
    
    mem.ronda++;
    saveMemory(mem);
    await new Promise(r=>setTimeout(r,5000));
  }
  const ganador = mem.jugadores.find(j=>j.vivo);
  if(ganador) channel.send(`🏆 **<@${ganador.id}> ganó la partida!**`);
  mem.partidaActiva=false;
  saveMemory(mem);
}

// ===== COMANDOS =====
client.on(Events.MessageCreate, async msg=>{
  if(msg.author.bot) return;
  const c=msg.content.toLowerCase();
  let mem=loadMemory();

  if(c === "!hambre" || c.startsWith("!calamar")){
    if(mem.partidaActiva) return msg.reply("⚠️ Ya hay una partida.");
    const miembros = await msg.guild.members.fetch();
    const jugadores = miembros.filter(m=>!m.user.bot).map(m=>({id:m.user.id, vivo:true, item:pick(["cuchillo","arco",null]), escondido:false}));
    mem = { partidaActiva:true, pausado:false, modo: c.includes("calamar")?"calamar":"hambre", temporada: c.includes("2")?2:1, jugadores, ronda:1, kills:{}, muertosTotales:0 };
    saveMemory(mem);
    msg.reply(`🎮 **Iniciando ${mem.modo.toUpperCase()}...**`);
    loop(msg.channel);
  }

  if(c.startsWith("!atacar")){
    const atacante = mem.jugadores.find(j=>j.id===msg.author.id && j.vivo);
    const targetUser = msg.mentions.users.first();
    if(!atacante || !targetUser) return;
    const target = mem.jugadores.find(j=>j.id===targetUser.id && j.vivo);
    if(!target) return msg.reply("❌ El objetivo no está vivo.");
    let prob = atacante.item === "cuchillo" ? 0.7 : (atacante.item === "arco" ? 0.6 : 0.4);
    if(target.escondido) prob -= 0.3;
    if(Math.random() < prob) { matar(target, mem, atacante); msg.reply(`⚔️ ¡Has matado a <@${target.id}>!`); }
    else msg.reply("🛡️ Fallaste el ataque.");
    saveMemory(mem);
  }

  if(c === "!esconderse"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id && x.vivo);
    if(j){ j.escondido=true; saveMemory(mem); msg.reply("🫥 Te has escondido."); }
  }

  if(c === "!inventario"){
    const j = mem.jugadores.find(x=>x.id===msg.author.id);
    if(j) msg.reply(`🎒 Ítem: **${j.item||"Nada"}** | Escondido: **${j.escondido?"Sí":"No"}** | Kills: **${mem.kills[j.id]||0}**`);
  }

  if(c === "!pausa") { mem.pausado=true; saveMemory(mem); msg.reply("⏸️"); }
  if(c === "!reanudar") { mem.pausado=false; saveMemory(mem); msg.reply("▶️"); }
  if(c === "!parar") { mem.partidaActiva=false; saveMemory(mem); msg.reply("⛔"); }
});

client.login(process.env.DISCORD_TOKEN);
http.createServer((req,res)=>res.end("OK")).listen(process.env.PORT||8080);
