// ============================================================
//  CORNUCOPIA (con tus nuevos eventos)
// ============================================================
const eventosCornucopia = [
  { t: "{a} corre hacia el centro y consigue un arco.", k: [], item: "arco" },
  { t: "{a} encuentra una mochila llena de suministros.", k: [], item: "comida" },
  { t: "{a} tropieza en la cornucopia y muere pisoteado.", k: ["a"] },
  { t: "{a} agarra un cuchillo y huye rápidamente.", k: [], item: "cuchillo" },
  { t: "{a} decide huir hacia el bosque para salvarse.", k: [] },
  { t: "{a} pelea con un rival por una mochila y gana.", k: [], item: "botiquín" },
  { t: "{a} encuentra una lanza y se prepara para la caza.", k: [], item: "cuchillo" },
  // TUS NUEVOS
  { t: "{a} atiende las heridas de {b}.", k: [], efecto: "curar_b" },
  { t: "{a} se droga con unos hongos quedando indefenso por las siguientes 3 rondas.", k: [], efecto: "hongos" }
];

// ============================================================
//  HAMBRE – VERSIÓN COMPLETA (tus 53 eventos mejorados)
// ============================================================
const eventosHambre = [

  // 🧊 SOCIALES / NEUTROS (mejorados)
  { t: "{a} construye una fogata con ramas secas y calienta sus manos, sintiendo un poco de seguridad.", k: [] },
  { t: "{a} y {b} se acurrucan para sobrevivir, compartiendo el calor de sus cuerpos.", k: [] },
  { t: "{a} encuentra agua fresca y bebe hasta saciarse, recuperando fuerzas.", k: [] },
  { t: "{a} logra encender una fogata con esfuerzo, espantando el frío y las bestias.", k: [] },
  { t: "{a} descubre un sendero oculto entre los arbustos, lo mantiene a salvo del peligro.", k: [] },
  { t: "{a} encuentra un escondite seguro entre las rocas, protegido del viento.", k: [] },
  { t: "{a} construye un refugio improvisado con ramas y hojas, sobrevive la noche.", k: [] },
  { t: "{a} encuentra frutas silvestres y come con voracidad, sintiendo el azúcar en la sangre.", k: [] },
  { t: "{a} se esconde en silencio, conteniendo la respiración, y evita ser descubierto.", k: [] },
  { t: "{a} encuentra un recurso valioso, lo guarda con cuidado y sigue su camino.", k: [] },

  // 💚 POSITIVOS (mejorados)
  { t: "{a} corre hacia {b} y lo ayuda a levantarse tras una caída, limpiándole el barro.", k: [] },
  { t: "{a} comparte su racion de comida con {b}, viendo cómo {b} la devora.", k: [] },
  { t: "{a} encuentra un amuleto misterioso que le da esperanza y fuerzas.", k: [] },
  { t: "{a} y {b} ríen juntos en medio del caos, un momento de paz frágil.", k: [] },
  { t: "{a} descubre un escondite seguro y descansa, dejando que el sueño lo venza.", k: [] },
  { t: "{a} recibe apoyo inesperado de {b}, una mano amiga en la oscuridad.", k: [] },
  { t: "{a} encuentra un río cristalino y se lava las heridas, sintiendo el agua fría.", k: [] },
  { t: "{a} y {b} recuerdan viejos tiempos, compartiendo historias antes de dormir.", k: [] },
  { t: "{a} siente una extraña calma a pesar del peligro, como si todo estuviera bien.", k: [] },
  { t: "{a} y {b} sobreviven una tormenta juntos, refugiados bajo un árbol.", k: [] },
  { t: "{a} y {b} tienen un encuentro íntimo durante la noche, buscando consuelo.", k: [] },

  // 💀 MUERTES (mejoradas y más explícitas)
  { t: "{a} intenta un plan arriesgado contra {b}, pero falla y es atravesado por su propia arma. Muere desangrado.", k: ["a"] },
  { t: "{a} muere de frío, su cuerpo se vuelve rígido, la piel azulada.", k: ["a"] },
  { t: "{a} muere de hambre lentamente, su estómago se contrae vacío, sin fuerzas para moverse.", k: ["a"] },
  { t: "{a} cae en un pozo de púas y muere ensartado, las puntas le atraviesan el pecho.", k: ["a"] },
  { t: "{a} cae en una trampa natural de lazos y queda colgado, asfixiándose.", k: ["a"] },
  { t: "{a} cae de un árbol al intentar recoger frutas, su cuello se rompe al impactar.", k: ["a"] },
  { t: "{a} es picado por una serpiente venenosa y muere en agonía, con calambres.", k: ["a"] },
  { t: "{a} contrae disentería y muere entre fiebres y vómitos, sin fuerzas.", k: ["a"] },
  { t: "{a} se ahoga en un río, luchando por respirar hasta que el agua llena sus pulmones.", k: ["a"] },
  { t: "{a} come frutos venenosos y muere con espuma en la boca, retorciéndose.", k: ["a"] },

  // ⚔️ COMBATE (más sangriento)
  { t: "{a} mata brutalmente a {b} con una piedra, aplastándole el cráneo. La sangre salpica.", k: ["b"] },
  { t: "{a} se acerca sigilosamente a {b} mientras duerme y le corta la garganta.", k: ["b"] },
  { t: "{a} apuñala a {b} repetidamente hasta que {b} deja de moverse, la sangre empapa la tierra.", k: ["b"] },
  { t: "{a} ataca a {b}, falla y {b} lo atraviesa con la espada. {a} muere al instante.", k: ["a"] },
  { t: "{a} se confía y {b} lo mata de un golpe en la nuca con una rama.", k: ["a"] },
  { t: "{a} envenena la comida de {b}, pero come él mismo por error y muere retorciéndose.", k: ["a"] },

  // 🧠 TRAICIÓN
  { t: "{a} traiciona a {b} y lo apuñala por la espalda mientras {b} se protege.", k: ["b"] },
  { t: "{a} finge alianza con {b} y luego lo mata, robándole sus pertenencias.", k: ["b"] },
  { t: "{a} y {b} discuten por la comida y ambos se hieren mortalmente.", k: ["a", "b"] },

  // 💀 SUICIDIOS
  { t: "{a} no soporta la presión, toma un cuchillo y se corta las venas, desangrándose.", k: ["a"] },
  { t: "{a} pierde la cordura, se ahorca con su camisa en un árbol.", k: ["a"] },
  { t: "{a} y {b} deciden suicidarse juntos, tomados de la mano, saltan al vacío.", k: ["a", "b"] },
  { t: "{a} y {b} intentan un doble suicidio, pero fallan y mueren en el intento.", k: ["a", "b"] },

  // 💥 CAOS
  { t: "{a} encuentra una bomba, intenta desactivarla, falla y explota, despedazándolo.", k: ["a"] },
  { t: "{a} pierde el control y detona una bomba que mata a varios, incluyéndose.", k: ["a", "b", "c", "d"], rare: true },
  { t: "{a} dispara una flecha hacia {b}, falla y golpea a {c}, que muere al instante.", k: ["c"] },
  { t: "{a} se sube a un árbol, la rama se rompe y cae sobre {b}; ambos mueren.", k: ["a", "b"] },
  { t: "{a} provoca un incendio en el bosque y queda atrapado entre las llamas, ardiendo.", k: ["a"] },
  { t: "{a} pisa una mina oculta, la explosión lo lanza por los aires.", k: ["a"] },

  // 🎲 MIX
  { t: "{a} y {b} discuten acaloradamente y ambos terminan muertos.", k: ["a", "b"] },
  { t: "{a} se sacrifica por {b}, pero ambos caen en una trampa y mueren.", k: ["a", "b"] },
  { t: "{a} y {b} se enfrentan en un duelo y solo uno sobrevive.", k: ["random_ab"] }
];

// ============================================================
//  CALAMAR – VERSIÓN DEFINITIVA (con expansiones de temporada 2)
// ============================================================
const eventosCalamar = [
  // --- LUZ ROJA, LUZ VERDE (8 variantes) ---
  {
    t: "🔴 LUZ ROJA. {a} respira hondo, pero su pie se desliza un centímetro. El disparo le arranca la nuca. Cae de rodillas, con los ojos aún abiertos, viendo cómo la sangre empapa la tierra.",
    k: ["a"]
  },
  {
    t: "🟢 LUZ VERDE. {a} corre como un animal, pero tropieza con {b}. Ambos caen. La muñeca gira y los fulmina a los dos. Sus cuerpos quedan enredados, humeantes.",
    k: ["a", "b"]
  },
  {
    t: "🔴 LUZ ROJA. {a} se queda completamente inmóvil, pero {b}, a su lado, tiembla y mueve un dedo. El francotirador elige a {b}. La bala le atraviesa el cráneo y salpica a {a}.",
    k: ["b"]
  },
  {
    t: "🟢 LUZ VERDE. {a} llega a la meta, pero la muñeca gira un segundo después. El disparo le perfora la columna. Muere con una sonrisa, pensando que había ganado.",
    k: ["a"]
  },
  {
    t: "🔴 LUZ ROJA. El pánico se apodera de {a}, {b} y {c}. Se mueven al mismo tiempo. Los tres caen acribillados, sus cuerpos se retuercen en el polvo.",
    k: ["a", "b", "c"]
  },
  {
    t: "🟢 LUZ VERDE. {a} avanza sigilosamente, pero al oír un disparo a lo lejos, se congela. La muñeca lo señala a él. Dispara. {a} cae con la garganta perforada.",
    k: ["a"]
  },
  {
    t: "🔴 LUZ ROJA. {a} y {b} se agarran de las manos para no caer. La muñeca los mira. Un disparo único atraviesa a ambos. Mueren abrazados.",
    k: ["a", "b"]
  },
  {
    t: "🟢 LUZ VERDE. {a} corre desesperado, pero se detiene a medio camino. La muñeca no dispara. {a} respira aliviado… hasta que una bala perdida lo alcanza en la sien.",
    k: ["a"]
  },

  // --- PANAL (DALGONA) (7 variantes) ---
  {
    t: "🍪 {a} elige el triángulo. La aguja resbala. El panal se quiebra. El guardia dispara sin piedad. {a} cae con la boca llena de azúcar y sangre.",
    k: ["a"]
  },
  {
    t: "🍪 {a} lame el panal para ablandarlo. El guardia lo ve, se acerca y le pone la pistola en la frente. 'No hagas trampa', dice. Y dispara.",
    k: ["a"]
  },
  {
    t: "🍪 {a} logra sacar el círculo perfecto. Sonríe. {b}, al lado, rompe la estrella. El guardia ejecuta a {b} en el acto. {a} mira el cuerpo sin pestañear.",
    k: ["b"]
  },
  {
    t: "🍪 {a} y {b} usan sus mecheros. {a} lo logra. {b} se quema la mano, suelta el panal y la forma se rompe. Un disparo en la nuca. {b} muere.",
    k: ["b"]
  },
  {
    t: "🍪 {a} cambia de forma en el último segundo. El panal se rompe en mil pedazos. La bala le perfora la mejilla y sale por la nuca. Muere al instante.",
    k: ["a"]
  },
  {
    t: "🍪 {a} termina el panal con segundos de sobra. El guardia asiente. {a} vomita de la emoción. Sobrevive.",
    k: []
  },
  {
    t: "🍪 {a} y {b} se ayudan mutuamente. Ambos logran sacar sus formas. El guardia los mira con desprecio pero los deja vivir.",
    k: []
  },

  // --- TIRA Y AFLOJA (6 variantes) ---
  {
    t: "🪢 {a} y {b} tiran con todas sus fuerzas. {a} resbala y cae al vacío. Su grito se corta al impactar contra el suelo. Sus huesos crujen.",
    k: ["a"]
  },
  {
    t: "🪢 El equipo de {a} pierde. Todos caen. {b} se agarra al borde, pero el peso lo arrastra. Cae junto a los demás.",
    k: ["a", "b"]
  },
  {
    t: "🪢 {a} usa su peso para arrastrar al equipo rival. {b} suelta la cuerda y cae. Su cuerpo se estrella contra las rocas.",
    k: ["b"]
  },
  {
    t: "🪢 La cuerda se rompe. {a} y {b} caen abrazados. El impacto los mata a ambos. Quedan enredados en la cuerda rota.",
    k: ["a", "b"]
  },
  {
    t: "🪢 {a} gana el tira y afloja. Pero suelta a {b} por venganza. {b} cae y muere. {a} lo mira con indiferencia.",
    k: ["b"]
  },
  {
    t: "🪢 {a} y {b} se alían para ganar. Logran vencer al equipo rival. Ambos sobreviven, jadeando.",
    k: []
  },

  // --- CANICAS (6 variantes) ---
  {
    t: "🎲 {a} y {b} juegan canicas. {a} gana. {b} sabe que morirá. Se arrodilla y cierra los ojos. El disparo le vuela la cabeza.",
    k: ["b"]
  },
  {
    t: "🎲 {a} hace trampa. {b} lo descubre y lo golpea con una canica en la sien. {a} muere desangrado.",
    k: ["a"]
  },
  {
    t: "🎲 {a} apuesta su vida en una canica. Pierde. Su cabeza explota. La sangre salpica a {b}.",
    k: ["a"]
  },
  {
    t: "🎲 {a} y {b} deciden empatar. Los guardias los ejecutan a ambos. Caen abrazados.",
    k: ["a", "b"]
  },
  {
    t: "🎲 {a} gana las canicas. {b} llora y suplica. {a} le da la espalda y se va. El guardia remata a {b}.",
    k: ["b"]
  },
  {
    t: "🎲 {a} y {b} juegan canicas. {a} pierde, pero {b} le ofrece una segunda oportunidad. Los guardias lo impiden y ejecutan a {a}.",
    k: ["a"]
  },

  // --- PUENTE DE CRISTAL (6 variantes) ---
  {
    t: "🌉 {a} pisa el cristal equivocado. El vidrio se rompe y cae. El cuerpo se despedaza al golpear el suelo. Un brazo queda colgando.",
    k: ["a"]
  },
  {
    t: "🌉 {a} empuja a {b} para probar el cristal. {b} cae. {a} sigue temblando, pero avanza.",
    k: ["b"]
  },
  {
    t: "🌉 {a} duda demasiado. La bomba explota. {a} y {b} vuelan por los aires. Sus restos caen en pedazos.",
    k: ["a", "b"]
  },
  {
    t: "🌉 {a} cruza con suerte. Mira atrás y ve a {b} caer. No puede hacer nada. Sigue adelante.",
    k: ["b"]
  },
  {
    t: "🌉 {a} y {b} eligen el mismo cristal. Se abrazan y caen juntos. El impacto los mata.",
    k: ["a", "b"]
  },
  {
    t: "🌉 {a} elige el cristal correcto y cruza. Detrás de él, {b} pisa el mismo y cae. {a} no mira atrás.",
    k: ["b"]
  },

  // --- BATALLA FINAL (6 variantes) ---
  {
    t: "🦑 {a} y {b} se enfrentan en el círculo. {a} apuñala a {b} en el cuello. La sangre brota. {a} es el ganador.",
    k: ["b"]
  },
  {
    t: "🦑 {a} muerde la garganta de {b}. {b} se desangra en segundos. {a} escupe sangre y alza los brazos.",
    k: ["b"]
  },
  {
    t: "🦑 {a} y {b} pelean con cuchillos. {a} hiere a {b} en el vientre y lo remata en el suelo.",
    k: ["b"]
  },
  {
    t: "🦑 {a} se rinde. {b} lo ejecuta sin dudar, clavándole el cuchillo en el pecho.",
    k: ["a"]
  },
  {
    t: "🦑 {a} derrota a {b}. {b} pide perdón. {a} lo mira y lo apuñala en el corazón.",
    k: ["b"]
  },
  {
    t: "🦑 {a} y {b} luchan cuerpo a cuerpo. {a} rompe el cuello de {b} con un movimiento seco. Gana.",
    k: ["b"]
  },

  // --- ATAQUE MIENTRAS DUERME (4 variantes) ---
  {
    t: "🔪 {a} se acerca sigilosamente a {b} mientras duerme. Saca un cuchillo y le corta la garganta. {b} muere sin despertarse.",
    k: ["b"]
  },
  {
    t: "🔪 {a} aprovecha la oscuridad para acercarse a {b}. Le clava el cuchillo en el pecho. {b} abre los ojos y muere.",
    k: ["b"]
  },
  {
    t: "🔪 {a} intenta matar a {b} mientras duerme, pero {b} se despierta y lo golpea. {a} muere.",
    k: ["a"]
  },
  {
    t: "🔪 {a} asfixia a {b} con una almohada. {b} se debate, pero muere en silencio.",
    k: ["b"]
  },

  // --- ROBO DE COMIDA (4 variantes) ---
  {
    t: "🍖 {a} roba la comida de {b}. {b} lo descubre y lo ataca. {a} lo mata a puñaladas. Muere por un poco de comida.",
    k: ["b"]
  },
  {
    t: "🍖 {a} roba la comida de {b}. {b} lo enfrenta y ambos pelean. {a} muere en la pelea.",
    k: ["a"]
  },
  {
    t: "🍖 {a} roba la comida de {b}. {b} lo descubre, pero decide no pelear. {a} se siente culpable y comparte la comida.",
    k: []
  },
  {
    t: "🍖 {a} y {b} pelean por la comida. {a} logra huir, pero {b} lo persigue y lo mata.",
    k: ["a"]
  },

  // --- APAGÓN (4 variantes) ---
  {
    t: "💡 Se apagan las luces. En la oscuridad, se oyen gritos y puñetazos. Cuando vuelven, {a} y {b} están muertos.",
    k: ["a", "b"]
  },
  {
    t: "💡 Las luces se apagan. {a} aprovecha para matar a {b} a ciegas. Cuando vuelven, {a} está de pie sobre el cuerpo.",
    k: ["b"]
  },
  {
    t: "💡 Apagón total. {a} y {b} chocan entre sí. Ambos mueren en el caos.",
    k: ["a", "b"]
  },
  {
    t: "💡 Las luces se apagan y se encienden rápidamente. {a} está con un cuchillo en la mano, {b} yace a sus pies.",
    k: ["b"]
  },

  // --- DESCONFIANZA (4 variantes) ---
  {
    t: "🔪 {a} desconfía de {b}. Sin mediar palabra, lo apuñala por la espalda. {b} cae, sorprendido.",
    k: ["b"]
  },
  {
    t: "🔪 {a} cree que {b} lo traicionará. Lo envenena en la cena. {b} muere retorciéndose.",
    k: ["b"]
  },
  {
    t: "🔪 {a} no confía en nadie. Elimina a {b} para sentirse seguro. {b} muere sin entender por qué.",
    k: ["b"]
  },
  {
    t: "🔪 {a} desconfía de {b}, pero {b} lo descubre y lo mata a él.",
    k: ["a"]
  },

  // --- TRAICIÓN DE ALIANZA (4 variantes) ---
  {
    t: "🤝 {a} y {b} forman una alianza. Pero cuando {b} baja la guardia, {a} lo apuñala. La traición es más rápida que el perdón.",
    k: ["b"]
  },
  {
    t: "🤝 {a} y {b} juran protegerse. Pero {a} ve una oportunidad y mata a {b} para quedarse con sus objetos.",
    k: ["b"]
  },
  {
    t: "🤝 {a} y {b} se alían. {a} traiciona a {b} en el último momento, pero {b} logra herirlo y ambos mueren.",
    k: ["a", "b"]
  },
  {
    t: "🤝 {a} y {b} se alían. {a} decide no traicionar a {b}. Sobreviven juntos.",
    k: []
  },

  // --- JUEGOS DE LA TEMPORADA 2 (Ddakji, Gonggi, Piedra/Papel/Tijera, Ruleta Rusa) ---
  {
    t: "🃏 DDAKJI. {a} y {b} juegan a voltear cartas. {a} golpea fuerte y voltea la suya. {b} falla. El guardia dispara a {b} en la nuca.",
    k: ["b"]
  },
  {
    t: "🃏 DDAKJI. {a} hace trampa y voltea la carta de {b}. {b} lo descubre y lo golpea. {a} muere.",
    k: ["a"]
  },
  {
    t: "🪨 GONGGI. {a} intenta recoger las piedras, pero se le caen dos. El guardia dispara, la bala le perfora la cabeza.",
    k: ["a"]
  },
  {
    t: "🪨 GONGGI. {a} y {b} compiten. {a} completa el recorrido. {b} falla y muere.",
    k: ["b"]
  },
  {
    t: "✊ PIEDRA, PAPEL O TIJERA. {a} y {b} juegan. {a} gana con tijera contra papel. {b} es ejecutado.",
    k: ["b"]
  },
  {
    t: "✊ PIEDRA, PAPEL O TIJERA. {a} y {b} empatan tres veces. Los guardias se cansan y los matan a ambos.",
    k: ["a", "b"]
  },
  {
    t: "🔫 RULETA RUSA. {a} aprieta el gatillo. Disparo. La bala le atraviesa la cabeza.",
    k: ["a"]
  },
  {
    t: "🔫 RULETA RUSA. {a} pasa el revólver a {b}. {b} dispara… vacío. {a} lo intenta de nuevo… muerte.",
    k: ["a"]
  }
];

// ============================================================
//  EXPORT
// ============================================================
module.exports = {
  eventosCornucopia,
  eventosHambre,
  eventosCalamar
};