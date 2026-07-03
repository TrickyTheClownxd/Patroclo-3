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

// ===== HAMBRE (Viejo) =====
const eventosHambre = [

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

// ===== CALAMAR (Viejo) =====
const eventosCalamarViejo = [
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

// ===== CALAMAR (Nuevo - Extendido) =====
const eventosCalamarNuevo = [

  // ===== LUZ ROJA, LUZ VERDE (Variantes) =====
  {t:"🔴 LUZ ROJA. {a} se mueve y una bala le atraviesa el cráneo. Su cuerpo cae al suelo.",k:["a"]},
  {t:"🟢 LUZ VERDE. {a} y {b} corren, pero {a} tropieza y {b} lo pisa. {a} muere en el acto.",k:["a"]},
  {t:"🔴 LUZ ROJA. El francotirador dispara. {a} y {b} caen abrazados. Sangre en el suelo.",k:["a","b"]},
  {t:"🟢 LUZ VERDE. {a} llega a la meta, pero la muñeca gira y dispara. Impacto en la espalda.",k:["a"]},
  {t:"🔴 LUZ ROJA. {a} se congela del miedo y no se mueve. El francotirador le perdona la vida.",k:[]},

  // ===== PANAL (Dalgona) =====
  {t:"🍪 {a} intenta sacar el círculo del panal. Su mano tiembla. El panal se rompe. Una bala.",k:["a"]},
  {t:"🍪 {a} lame el panal para ablandarlo, pero el guardia lo ve y lo ejecuta.",k:["a"]},
  {t:"🍪 {a} logra sacar la forma perfecta. Respira aliviado. {b} falla y muere desangrado.",k:["b"]},
  {t:"🍪 {a} y {b} usan sus encendedores. {a} lo logra. {b} se quema la mano y pierde.",k:["b"]},
  {t:"🍪 {a} decide cambiar de forma en el último segundo y muere al romper el panal.",k:["a"]},

  // ===== TIRA Y AFLOJA =====
  {t:"🪢 {a} y {b} tiran de la cuerda. {a} resbala y cae al vacío. Su grito se corta.",k:["a"]},
  {t:"🪢 El equipo de {a} pierde. Todos caen. {b} intenta agarrarse pero resbala.",k:["a","b"]},
  {t:"🪢 {a} usa su peso para arrastrar al equipo rival. {b} suelta la cuerda y muere.",k:["b"]},
  {t:"🪢 La cuerda se rompe. {a} y {b} caen juntos al abismo. Impacto fatal.",k:["a","b"]},
  {t:"🪢 {a} gana el tira y afloja, pero suelta a {b} por venganza. {b} muere.",k:["b"]},

  // ===== CANICAS =====
  {t:"🎲 {a} y {b} juegan canicas. {a} gana. {b} sabe que morirá y se rinde.",k:["b"]},
  {t:"🎲 {a} hace trampa en las canicas. {b} lo descubre y lo golpea hasta matarlo.",k:["a"]},
  {t:"🎲 {a} apuesta su vida en una canica. Pierde. Su cabeza explota.",k:["a"]},
  {t:"🎲 {a} y {b} deciden empatar. Los guardias los ejecutan a ambos.",k:["a","b"]},
  {t:"🎲 {a} gana las canicas. {b} llora y suplica. {a} le da la espalda y se va.",k:["b"]},

  // ===== PUENTE DE CRISTAL =====
  {t:"🌉 {a} pisa el cristal equivocado. El vidrio se rompe y cae. Gritos y silencio.",k:["a"]},
  {t:"🌉 {a} empuja a {b} para probar el cristal. {b} cae. {a} sigue.",k:["b"]},
  {t:"🌉 {a} duda demasiado. La bomba explota. {a} y {b} vuelan por los aires.",k:["a","b"]},
  {t:"🌉 {a} cruza el puente con suerte. Mira atrás y ve a {b} caer.",k:["b"]},
  {t:"🌉 {a} y {b} eligen el mismo cristal. Se abrazan y caen juntos.",k:["a","b"]},

  // ===== JUEGO FINAL (Squid Game) =====
  {t:"🦑 {a} y {b} se enfrentan en el juego final. {a} apuñala a {b} y gana.",k:["b"]},
  {t:"🦑 {a} usa una táctica sucia. Muerde el cuello de {b} y lo desangra.",k:["b"]},
  {t:"🦑 {a} y {b} pelean con cuchillos. {a} hiere a {b} y lo remata.",k:["b"]},
  {t:"🦑 {a} está contra las cuerdas. De repente, se rinde y {b} lo ejecuta.",k:["a"]},
  {t:"🦑 {a} derrota a {b}. {b} pide perdón. {a} lo mira y lo apuñala.",k:["b"]},

  // ===== MUERTES POR LOS GUARDIAS =====
  {t:"🎭 Un guardia se acerca a {a}. Le dispara en la nuca. {a} cae sin hacer ruido.",k:["a"]},
  {t:"🎭 Los guardias rodean a {a} y {b}. Los ejecutan por desobedecer.",k:["a","b"]},
  {t:"🎭 Un guardia le ofrece una cuchilla a {a}. La usa para matar a {b}.",k:["b"]},
  {t:"🎭 {a} insulta al guardia. El guardia lo apuñala repetidamente.",k:["a"]},

  // ===== TRAICIONES Y CAOS =====
  {t:"🔪 {a} traiciona a {b} mientras duerme. Lo degüella sin piedad.",k:["b"]},
  {t:"🔪 {a} y {b} se alían para eliminar a {c}. Lo acorralan y lo matan.",k:["c"]},
  {t:"🔪 {a} le dice a {b} que confía en él. Luego le clava un cuchillo en el pecho.",k:["b"]},
  {t:"🔪 {a} envenena la comida de {b}. {b} muere retorciéndose.",k:["b"]},
  {t:"🔪 {a} pierde el control y mata a {b}, {c} y {d} antes de morir.",k:["a","b","c","d"]},

  // ===== SUICIDIOS DESESPERADOS =====
  {t:"💔 {a} no soporta la culpa. Se corta las venas y muere desangrado.",k:["a"]},
  {t:"💔 {a} mira a {b} y dice 'nos vemos del otro lado'. Salta al vacío.",k:["a"]},
  {t:"💔 {a} se ahorca con su camisa. {b} lo ve y no hace nada.",k:["a"]},
  {t:"💔 {a} y {b} deciden morir juntos. Se toman de la mano y saltan.",k:["a","b"]},

  // ===== MUERTES ACCIDENTALES =====
  {t:"💥 {a} pisa una mina. La explosión lo desintegra. {b} queda herido.",k:["a"]},
  {t:"💥 Una estructura colapsa. {a} queda aplastado. {b} escapa.",k:["a"]},
  {t:"💥 {a} enciende un encendedor cerca de gasolina. La explosión quema a {b}.",k:["b"]},
  {t:"💥 Una bala perdida impacta a {a}. Muere antes de tocar el suelo.",k:["a"]},

  // ===== EVENTOS MASIVOS =====
  {t:"🔥 Se declara un incendio. {a}, {b} y {c} mueren quemados.",k:["a","b","c"]},
  {t:"🌊 Una inundación arrasa la zona. {a} y {b} se ahogan.",k:["a","b"]},
  {t:"⚡ Un rayo cae sobre {a}. Muere electrocutado.",k:["a"]},
  {t:"🎲 Los guardias deciden ejecutar a un grupo aleatorio. {a}, {b} y {c} caen.",k:["random_group"]},
  {t:"🎲 La ruleta de la muerte selecciona a {a}. Muere sin piedad.",k:["a"]},

  // ===== EVENTOS CON DIALOGO =====
  {t:"💬 {a} grita: '¡No quiero morir!'. {b} le dice: 'Todos morimos'. Y lo apuñala.",k:["a"]},
  {t:"💬 {a} le dice a {b}: 'Eres mi hermano'. {b} responde: 'No en este juego'. Y lo mata.",k:["a"]},
  {t:"💬 {a} ofrece su vida a cambio de la de {b}. Los guardias aceptan. {a} muere.",k:["a"]},
  {t:"💬 {a} le dice a {b}: 'El que ríe último, ríe mejor'. {b} muere.",k:["b"]},

  // ===== FINAL DRAMÁTICO =====
  {t:"🏆 {a} es el ganador del juego. Pero {b} lo apuñala por la espalda y roba su victoria.",k:["a"]},
  {t:"🏆 {a} y {b} llegan juntos a la meta. Los guardias dicen que solo puede quedar uno. {a} mata a {b}.",k:["b"]},
  {t:"🏆 {a} se arrodilla. Ha ganado. Pero el dolor es demasiado. Muere en el acto.",k:["a"]}
];

// ===== UNIFICAR CALAMAR =====
const eventosCalamar = [
  ...eventosCalamarViejo,
  ...eventosCalamarNuevo
];

// ===== EXPORT =====
module.exports = {
  eventosCornucopia,
  eventosHambre,
  eventosCalamar
};