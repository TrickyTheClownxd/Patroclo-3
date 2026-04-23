// ===== CORNUCOPIA =====
const eventosCornucopia = [
  {t:"{a} corre hacia el centro y consigue un arco.",k:[],item:"arco"},
  {t:"{a} encuentra una mochila llena de suministros.",k:[],item:"comida"},
  {t:"{a} tropieza en la cornucopia y muere pisoteado.",k:["a"]},
  {t:"{a} agarra un cuchillo y huye rápidamente.",k:[],item:"cuchillo"},
  {t:"{a} decide huir hacia el bosque para salvarse.",k:[]},
  {t:"{a} pelea con un rival por una mochila y gana.",k:[],item:"botiquín"},
  {t:"{a} encuentra una lanza y se prepara para la caza.",k:[],item:"cuchillo"}
];

// ===== HAMBRE =====
const eventosHambre = [const eventos = [

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
  {t:"{a} se ahoga en un río y muere.",k:["a"]},              // NUEVO
  {t:"{a} se intoxica con frutos venenosos y muere.",k:["a"]}, // NUEVO

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
  {t:"{a} provoca un incendio en el bosque y muere atrapado.",k:["a"]}, // NUEVO
  {t:"{a} pisa una mina oculta y muere.",k:["a"]},                      // NUEVO

  // 🎲 MIX
  {t:"{a} y {b} discuten y ambos mueren.",k:["a","b"]},
  {t:"{a} se sacrifica por {b} y ambos mueren.",k:["a","b"]},
  {t:"{a} y {b} se enfrentan y solo uno sobrevive.",k:["random_ab"]}
];];

// ===== CALAMAR =====
const eventosCalamar = [
  {t:"🔴🟢 Luz roja, luz verde… varios jugadores caen.",k:["random_group"]},
  {t:"🍪 Juego del panal… algunos no logran superar la prueba.",k:["random_group"]},
  {t:"🪢 Tira y afloja… el equipo perdedor cae al vacío.",k:["random_group"]},
  {t:"🎲 Canicas… los perdedores entregan su vida.",k:["random_group"]},
  {t:"🌉 Puente de cristal… quienes pisan mal caen y mueren.",k:["random_group"]},
  {t:"🦑 Batalla final… solo uno sobrevive.",k:["random_group"]},

  {t:"{a} ataca a {b} mientras duerme.",k:["b"]},
  {t:"{a} roba comida y {b} lo descubre… pelea mortal.",k:["b"]},
  {t:"Se apagan las luces… el caos deja muertos.",k:["random_group"]},
  {t:"{a} desconfía de todos y elimina a {b}.",k:["b"]},
  {t:"{a} forma alianza con {b}, pero luego lo traiciona y lo mata.",k:["b"]}
];

module.exports = { eventosCornucopia, eventosHambre, eventosCalamar };