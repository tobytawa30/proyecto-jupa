import { db } from './src/lib/db';
import { schools, users, exams, questions, questionOptions } from './src/lib/db/schema';
import { hashPassword } from './src/lib/auth/config';

async function seed() {
  console.log('🌱 Starting seed...');

  // Create schools
  console.log('Creating schools...');
  const schoolsData = [
    { name: 'Escuela Primaria Central', code: 'EPC-001' },
    { name: 'Escuela Primaria Norte', code: 'EPN-002' },
    { name: 'Escuela Primaria Sur', code: 'EPS-003' },
    { name: 'Escuela Primaria Este', code: 'EPE-004' },
    { name: 'Escuela Primaria Oeste', code: 'EPO-005' },
  ];

  for (const school of schoolsData) {
    await db.insert(schools).values(school).onConflictDoNothing();
  }

  // Create admin user
  console.log('Creating admin user...');
  const hashedPassword = await hashPassword('admin123');
  await db.insert(users).values({
    name: 'Admin JUPA',
    email: 'admin@jupa.org',
    passwordHash: hashedPassword,
    role: 'ADMIN',
  }).onConflictDoNothing();

  // Create exams
  console.log('Creating exams...');

  // 1st Grade Exam
  const [exam1] = await db.insert(exams).values({
    title: 'Lectura Comprensiva 1er Grado 2026',
    grade: 1,
    storyTitle: 'El gran día de los cuentos',
    storyContent: `En un barrio bonito, los amigos se reunieron para escuchar un cuento. La historia era sobre Norman, un pececito dorado que se perdió. Emma y Camila decidieron ayudarle a encontrar el camino.

Percy, al principio, se enojó, pero luego aprendió que es mejor ayudar y ser amable. Los amigos animaron a Norman y le dieron un beso en la mano para que se sintiera querido.

La pequeña ballena les recordó que un barrio no es solo casas, sino un lugar lleno de amistad y amor.

Al final, todos descubrieron que leer cuentos es una gran aventura, nos hace crecer y ser mejores amigos.`,
    isActive: true,
    totalPoints: '5',
  }).returning();

  // 1st Grade Questions
  const questions1 = [
    { questionText: 'Norman, el pececito del cuento, era de color:', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Rojo', isCorrect: false }, { label: 'B', text: 'Azul', isCorrect: false }, { label: 'C', text: 'Dorado', isCorrect: true }] },
    { questionText: '¿Quiénes ayudaron a buscar a Norman?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Percy y Juan', isCorrect: false }, { label: 'B', text: 'Emma y Camila', isCorrect: true }, { label: 'C', text: 'La pequeña ballena', isCorrect: false }] },
    { questionText: 'Al principio, Percy se enojó, pero luego aprendió a ser amable.', questionType: 'TRUE_FALSE', points: 1, options: [{ label: 'A', text: 'Verdadero', isCorrect: true }, { label: 'B', text: 'Falso', isCorrect: false }] },
    { questionText: '¿Qué aprendieron principalmente los niños en este cuento?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Que los peces pueden perderse', isCorrect: false }, { label: 'B', text: 'Que hay que vivir cerca del mar', isCorrect: false }, { label: 'C', text: 'Que la amistad y leer cuentos son importantes', isCorrect: true }] },
    { questionText: '¿Por qué la pequeña ballena dijo que "un barrio no es solo casas"?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Porque en el barrio hay muchas tiendas y parques', isCorrect: false }, { label: 'B', text: 'Porque un barrio está hecho de personas que se cuidan y se quieren', isCorrect: true }, { label: 'C', text: 'Porque las casas son importantes para vivir', isCorrect: false }] },
  ];

  for (let i = 0; i < questions1.length; i++) {
    const q = questions1[i];
    const [question] = await db.insert(questions).values({
      examId: exam1.id,
      section: 'Parte 1',
      questionText: q.questionText,
      questionType: q.questionType as any,
      orderIndex: i,
      points: q.points.toString(),
    }).returning();

    await db.insert(questionOptions).values(
      q.options.map((opt, oi) => ({
        questionId: question.id,
        optionLabel: opt.label,
        optionText: opt.text,
        isCorrect: opt.isCorrect,
        orderIndex: oi,
      }))
    );
  }

  // 2nd Grade Exam
  const [exam2] = await db.insert(exams).values({
    title: 'Lectura Comprensiva 2do Grado 2026',
    grade: 2,
    storyTitle: 'El Gran Día en el Bosque de los Cuentos',
    storyContent: `Había una vez, en un bosque mágico, muchos amigos especiales. Ferdinando, el toro tranquilo, caminaba despacio y disfruta de las hermosas flores. Cerca, Marisol, una niña muy especial que vestía de colores diferentes, jugaba y reía con sus amigos. También estaba una niña que siempre trataba de no cometer errores; ella aprendía que equivocarse es parte de aprender cosas nuevas.

Mientras tanto, la gallina Cocorina picoteaba el suelo, buscando granos y compartiendo su comida con los demás. En una casita mágica, Strega Nona preparaba una olla llena de pasta para todos, enseñando a cuidar y compartir lo que tenían. Más adelante, Ricitos de Oro visitó la casita de los tres osos y aprendió a respetar las cosas de los otros.

En el parque del bosque, un niño dijo: "¡Debo compartir mi helado!" y repartió su helado entre sus amigos, haciendo que todos se sintieran felices. Esa tarde, Stellaluna, la pequeña murciélaga, voló junto a sus amigos y mostró que ser diferente es algo muy bonito. Por último, recordaron la fábula de la hormiga y la paloma, que enseña que ayudar a los demás es lo más importante.

Fue un día lleno de aventuras, amistad y grandes aprendizajes en el Bosque de los Cuentos.`,
    isActive: true,
    totalPoints: '7',
  }).returning();

  const questions2 = [
    { questionText: '¿Dónde estaban los amigos al principio de la historia?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'En la playa', isCorrect: false }, { label: 'B', text: 'En el bosque', isCorrect: true }, { label: 'C', text: 'En la escuela', isCorrect: false }, { label: 'D', text: 'En la ciudad', isCorrect: false }] },
    { questionText: '¿Qué hacía Ferdinando, el toro, en el bosque?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Saltaba alto', isCorrect: false }, { label: 'B', text: 'Oía música', isCorrect: false }, { label: 'C', text: 'Olía las flores', isCorrect: true }, { label: 'D', text: 'Corría muy rápido', isCorrect: false }] },
    { questionText: '¿Qué aprendió Ricitos de Oro en la casa de los tres osos?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'A cocinar pasta', isCorrect: false }, { label: 'B', text: 'A volar como un murciélago', isCorrect: false }, { label: 'C', text: 'A respetar las cosas de los demás', isCorrect: true }, { label: 'D', text: 'A buscar granos en el suelo', isCorrect: false }] },
    { questionText: '¿Qué lección enseña la fábula de la hormiga y la paloma?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Que hay que trabajar mucho', isCorrect: false }, { label: 'B', text: 'Que hay que volar lejos', isCorrect: false }, { label: 'C', text: 'Que ayudar a los demás es importante', isCorrect: true }, { label: 'D', text: 'Que hay que ser rápido', isCorrect: false }] },
    { questionText: 'Según lo que hizo Ferdinando el toro, ¿qué podemos decir sobre su personalidad?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Es tranquilo y le gusta disfrutar de las cosas bellas', isCorrect: true }, { label: 'B', text: 'Es juguetón y le gusta correr', isCorrect: false }, { label: 'C', text: 'Es travieso y le gusta molestar a los demás', isCorrect: false }, { label: 'D', text: 'Es tímido y se esconde de los amigos', isCorrect: false }] },
    { questionText: 'Cuando la historia dice que "Marisol vestía de colores diferentes", ¿qué nos quiere enseñar sobre ella?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Que le gusta llamar la atención', isCorrect: false }, { label: 'B', text: 'Que es especial y única, como todos en el bosque', isCorrect: true }, { label: 'C', text: 'Que no sabe combinar su ropa', isCorrect: false }, { label: 'D', text: 'Que quiere ser diferente a los demás', isCorrect: false }] },
    { questionText: 'Si Strega Nona preparó pasta para todos y el niño compartió su helado, ¿qué enseñanza tienen en común estas dos acciones?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'A', text: 'Que es mejor guardar la comida para uno mismo', isCorrect: false }, { label: 'B', text: 'Que compartir hace que todos se sientan felices', isCorrect: true }, { label: 'C', text: 'Que la comida en el bosque sabe mejor cuando es mágica', isCorrect: false }, { label: 'D', text: 'Que debemos ayudar a los demás solo cuando nos necesitan', isCorrect: false }] },
  ];

  for (let i = 0; i < questions2.length; i++) {
    const q = questions2[i];
    const [question] = await db.insert(questions).values({
      examId: exam2.id,
      section: 'Parte 1',
      questionText: q.questionText,
      questionType: q.questionType as any,
      orderIndex: i,
      points: q.points.toString(),
    }).returning();

    await db.insert(questionOptions).values(
      q.options.map((opt, oi) => ({
        questionId: question.id,
        optionLabel: opt.label,
        optionText: opt.text,
        isCorrect: opt.isCorrect,
        orderIndex: oi,
      }))
    );
  }

  // 3rd Grade Exam
  const [exam3] = await db.insert(exams).values({
    title: 'Lectura Comprensiva 3er Grado 2026',
    grade: 3,
    storyTitle: 'El Día de las Emociones y la Amistad',
    storyContent: `En el barrio de los cuentos, Bettinita era una niña valiente que siempre ayudaba a sus amigos. Un día, mientras jugaban, Alexander tuvo un día horrible y se sintió triste y enojado. Sus amigos, recordando lo que decía Frida, le mostraron que ser diferente y creativo es muy especial.

María, inspirada en "No te rías de mí", les recordó a todos que nunca se debe burlarse de alguien. Así, cada niño dijo: "¡Así me siento yo!" y compartió sus emociones, ya fueran de alegría o de tristeza.

Crisantemo, con su nombre tan bonito, se sintió orgullosa de ser ella misma, mientras la coleccionista de palabras explicaba que cada palabra amable llena la cubeta de alguien con cariño. Por su parte, Tomás preparó un pequeño sillón de papel para su mamá, demostrando que el amor se nota en los pequeños detalles.

Al final del día, todos aprendieron que compartir, respetar y expresar lo que sienten hace que el mundo sea un lugar más feliz y lleno de amistad.`,
    isActive: true,
    totalPoints: '10',
  }).returning();

  const questions3 = [
    { questionText: '¿Qué quiere decir la frase "cada palabra amable llena la cubeta de alguien con cariño"?', questionType: 'MULTIPLE_CHOICE', points: 1, contextText: '', options: [{ label: 'a', text: 'Que hay que hablar mucho para ser amigo de todos', isCorrect: false }, { label: 'b', text: 'Que las palabras amables hacen sentir querida a una persona', isCorrect: true }, { label: 'c', text: 'Que debemos dar regalos en lugar de hablar', isCorrect: false }, { label: 'd', text: 'Que solo los adultos pueden usar palabras amables', isCorrect: false }] },
    { questionText: 'Según el cuento, ¿cuál fue el mensaje principal que aprendieron los niños?', questionType: 'MULTIPLE_CHOICE', points: 1, contextText: '', options: [{ label: 'a', text: 'Que ganar en los juegos es lo más divertido', isCorrect: false }, { label: 'b', text: 'Que compartir, respetar y expresar emociones hace el mundo mejor', isCorrect: true }, { label: 'c', text: 'Que solo los niños valientes pueden tener amigos', isCorrect: false }, { label: 'd', text: 'Que siempre hay que estar felices, nunca tristes', isCorrect: false }] },
    { questionText: '¿Por qué es importante no burlarse de los demás, según lo que enseñó María?', questionType: 'MULTIPLE_CHOICE', points: 1, contextText: '', options: [{ label: 'a', text: 'Porque te puedes meter en problemas con los adultos', isCorrect: false }, { label: 'b', text: 'Porque burlarse no es divertido para nadie', isCorrect: false }, { label: 'c', text: 'Porque cada persona es especial y merece respeto', isCorrect: true }, { label: 'd', text: 'Porque si te burlas, nadie querrá jugar contigo', isCorrect: false }] },
    { questionText: 'Si Alexander no hubiera tenido amigos que lo apoyaran, ¿qué podría haber pasado?', questionType: 'MULTIPLE_CHOICE', points: 1, contextText: '', options: [{ label: 'a', text: 'Se habría sentido aún más triste y solo', isCorrect: true }, { label: 'b', text: 'Habría ganado el juego igualmente', isCorrect: false }, { label: 'c', text: 'Habría olvidado su mal día rápido', isCorrect: false }, { label: 'd', text: 'Habría decidido no jugar nunca más', isCorrect: false }] },
    { questionText: 'Alexander estaba triste porque no le gustaba el barrio donde vivía.', questionType: 'TRUE_FALSE', points: 1, options: [{ label: 'a', text: 'Verdadero', isCorrect: false }, { label: 'b', text: 'Falso', isCorrect: true }] },
    { questionText: 'Tomás demostró su amor con un pequeño detalle: un sillón de papel.', questionType: 'TRUE_FALSE', points: 1, options: [{ label: 'a', text: 'Verdadero', isCorrect: true }, { label: 'b', text: 'Falso', isCorrect: false }] },
    { questionText: 'Al final del cuento, los niños entendieron que es mejor guardarse las emociones.', questionType: 'TRUE_FALSE', points: 1, options: [{ label: 'a', text: 'Verdadero', isCorrect: false }, { label: 'b', text: 'Falso', isCorrect: true }] },
    { questionText: 'Respuesta: "Porque tenía un nombre bonito."', questionType: 'MATCHING', points: 1, contextText: '', options: [{ label: 'a', text: '¿Por qué Crisantemo se sintió orgullosa?', isCorrect: true }, { label: 'b', text: '¿Qué hizo la coleccionista de palabras?', isCorrect: false }, { label: 'c', text: '¿Por qué Alexander estaba enojado?', isCorrect: false }, { label: 'd', text: '¿Qué le regaló Tomás a su mamá?', isCorrect: false }] },
    { questionText: 'Respuesta: "Un sillón de papel."', questionType: 'MATCHING', points: 1, contextText: '', options: [{ label: 'a', text: '¿Qué les enseñó María?', isCorrect: false }, { label: 'b', text: '¿Qué preparó Tomás para su mamá?', isCorrect: true }, { label: 'c', text: '¿Qué hizo Bettinita para ayudar?', isCorrect: false }, { label: 'd', text: '¿Qué dijo la coleccionista de palabras?', isCorrect: false }] },
    { questionText: 'Respuesta: "Que nunca se debe burlarse de alguien."', questionType: 'MATCHING', points: 1, contextText: '', options: [{ label: 'a', text: '¿Cómo se sintió Crisantemo?', isCorrect: false }, { label: 'b', text: '¿Qué les recordó María a los niños?', isCorrect: true }, { label: 'c', text: '¿Qué hizo Alexander cuando estaba triste?', isCorrect: false }, { label: 'd', text: '¿Qué aprendieron al final del día?', isCorrect: false }] },
  ];

  for (let i = 0; i < questions3.length; i++) {
    const q = questions3[i];
    const [question] = await db.insert(questions).values({
      examId: exam3.id,
      section: i < 4 ? 'Parte 1' : (i < 7 ? 'Parte 2' : 'Parte 3'),
      questionText: q.questionText,
      questionType: q.questionType as any,
      orderIndex: i,
      points: q.points.toString(),
      contextText: q.contextText || null,
    }).returning();

    await db.insert(questionOptions).values(
      q.options.map((opt, oi) => ({
        questionId: question.id,
        optionLabel: opt.label,
        optionText: opt.text,
        isCorrect: opt.isCorrect,
        orderIndex: oi,
      }))
    );
  }

  // 4th Grade Exam
  const [exam4] = await db.insert(exams).values({
    title: 'Lectura Comprensiva 4to Grado 2026',
    grade: 4,
    storyTitle: 'La Aventura de los Amigos Inolvidables',
    storyContent: `En un pequeño pueblo, vivía un niño llamado Pinocho, quien había aprendido la importancia de decir la verdad. Un día, mientras paseaba por el bosque, encontró un árbol muy especial que siempre estaba dispuesto a dar sin esperar nada a cambio. Este árbol le recordó la importancia de ser generoso y amable.

Más adelante, Pinocho se topó con un gato muy peculiar que llevaba un sombrero enorme. El gato le enseñó que, aunque las cosas no siempre salgan como uno espera, siempre se puede encontrar diversión y alegría en cada situación.

Cerca del río, conoció a una niña que se sentía diferente a los demás. Pinocho le explicó que ser diferente es lo que nos hace únicos y especiales. Juntos, ayudaron a una amiga que tenía un caso grave de rayas en la piel, enseñándole que la verdadera belleza está en el interior.

En la escuela, Pinocho y sus amigos defendieron a un compañero que era víctima de burlas, recordando que todos merecen respeto y amabilidad. También conocieron a un niño que se sentía invisible, y le mostraron que siempre hay alguien dispuesto a escuchar y ser amigo.

Al final del día, Pinocho se dio cuenta de que, aunque todos eran diferentes, cada uno aportaba algo valioso al grupo. Y así, juntos, aprendieron que la amistad, la honestidad y la aceptación son los verdaderos tesoros de la vida.`,
    isActive: true,
    totalPoints: '25',
  }).returning();

  const questions4 = [
    { questionText: '¿Dónde encontró Pinocho el árbol especial?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'a', text: 'En la escuela', isCorrect: false }, { label: 'b', text: 'En el bosque', isCorrect: true }, { label: 'c', text: 'Cerca del río', isCorrect: false }, { label: 'd', text: 'En su casa', isCorrect: false }] },
    { questionText: '¿Qué característica tenía el gato que Pinocho conoció?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'a', text: 'Era un gato muy grande', isCorrect: false }, { label: 'b', text: 'Tenía un sombrero enorme', isCorrect: true }, { label: 'c', text: 'Sabía hablar con los humanos', isCorrect: false }, { label: 'd', text: 'Era invisible', isCorrect: false }] },
    { questionText: '¿Por qué la amiga de Pinocho estaba preocupada por sus rayas en la piel?', questionType: 'MULTIPLE_CHOICE', points: 1.5, options: [{ label: 'a', text: 'Porque las rayas le producían dolor físico', isCorrect: false }, { label: 'b', text: 'Porque temía que no la aceptaran por ser diferente', isCorrect: true }, { label: 'c', text: 'Porque pensaba que las rayas eran un castigo por sus mentiras', isCorrect: false }, { label: 'd', text: 'Porque los demás se reían constantemente de su apariencia', isCorrect: false }] },
    { questionText: '¿Qué aprendió Pinocho del árbol especial?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'a', text: 'La importancia de la generosidad', isCorrect: true }, { label: 'b', text: 'Cómo encontrar comida en el bosque', isCorrect: false }, { label: 'c', text: 'Que los árboles pueden hablar', isCorrect: false }, { label: 'd', text: 'La forma de construir una casa', isCorrect: false }] },
    { questionText: '¿Qué relación existe entre la niña que se sentía diferente y la amiga con rayas en la piel?', questionType: 'MULTIPLE_CHOICE', points: 2, options: [{ label: 'a', text: 'Ambas vivían en la misma casa', isCorrect: false }, { label: 'b', text: 'Las dos habían conocido al gato del sombrero', isCorrect: false }, { label: 'c', text: 'Ambas aprendieron que ser únicas es valioso', isCorrect: true }, { label: 'd', text: 'Las dos eran familiares de Pinocho', isCorrect: false }] },
    { questionText: '¿Por qué Pinocho y sus amigos defendieron a su compañero en la escuela?', questionType: 'MULTIPLE_CHOICE', points: 1, options: [{ label: 'a', text: 'Para ganar popularidad entre los demás', isCorrect: false }, { label: 'b', text: 'Porque creían que todos merecen respeto', isCorrect: true }, { label: 'c', text: 'Porque el profesor se lo ordenó', isCorrect: false }, { label: 'd', text: 'Porque el compañero les había ayudado antes', isCorrect: false }] },
    { questionText: '¿Cuál es el mensaje principal de la historia?', questionType: 'MULTIPLE_CHOICE', points: 1.5, options: [{ label: 'a', text: 'Es importante compartir y ayudar a los demás', isCorrect: true }, { label: 'b', text: 'La aventura es lo más importante en la vida', isCorrect: false }, { label: 'c', text: 'Que la diversión y el entretenimiento son esenciales para ser feliz', isCorrect: false }, { label: 'd', text: 'Que es mejor tener pocos amigos pero que sean leales', isCorrect: false }] },
    { questionText: 'Si fueras Pinocho, ¿qué harías para ayudar a la niña que se sentía diferente?', questionType: 'MULTIPLE_CHOICE', points: 2, options: [{ label: 'a', text: 'Ignorarla para no empeorar la situación', isCorrect: false }, { label: 'b', text: 'Decirle que cambie para encajar mejor', isCorrect: false }, { label: 'c', text: 'Mostrarle amistad y valorar su singularidad', isCorrect: true }, { label: 'd', text: 'Contárselo al profesor inmediatamente', isCorrect: false }] },
    { questionText: 'En la historia, todos los eventos podrían ocurrir exactamente igual en la vida real.', questionType: 'TRUE_FALSE', points: 1, options: [{ label: 'a', text: 'Verdadero', isCorrect: false }, { label: 'b', text: 'Falso', isCorrect: true }] },
    { questionText: '¿Por qué el final de la historia refuerza la idea de la amistad?', questionType: 'MULTIPLE_CHOICE', points: 2, options: [{ label: 'a', text: 'Porque cada amigo aportó algo único al grupo', isCorrect: true }, { label: 'b', text: 'Porque Pinocho regresó solo a casa', isCorrect: false }, { label: 'c', text: 'Porque el gato desapareció al final', isCorrect: false }, { label: 'd', text: 'Porque la escuela les dio un premio', isCorrect: false }] },
    { questionText: 'Basándote en la historia, ¿qué pregunta tendría como respuesta "Que la generosidad es importante"?', questionType: 'MATCHING', points: 2, contextText: 'Que la generosidad es importante', options: [{ label: 'a', text: '¿Qué le enseñó el árbol especial a Pinocho?', isCorrect: true }, { label: 'b', text: '¿Qué aprendió Pinocho del gato?', isCorrect: false }, { label: 'c', text: '¿Qué le dijo Pinocho a la niña diferente?', isCorrect: false }, { label: 'd', text: '¿Qué pasó en la escuela?', isCorrect: false }] },
    { questionText: '¿Qué pregunta corresponde a la respuesta "Llevaba un sombrero enorme y era muy peculiar"?', questionType: 'MATCHING', points: 2, contextText: 'Llevaba un sombrero enorme y era muy peculiar', options: [{ label: 'a', text: '¿Cómo ayudó Pinocho en la escuela?', isCorrect: false }, { label: 'b', text: '¿Cómo era el gato que conoció Pinocho?', isCorrect: true }, { label: 'c', text: '¿Qué hacía el árbol especial?', isCorrect: false }, { label: 'd', text: '¿Dónde vivía la niña diferente?', isCorrect: false }] },
    { questionText: 'El árbol especial del bosque representa la generosidad condicional, ya que esperaba algo a cambio de lo que daba.', questionType: 'TRUE_FALSE', points: 2.5, options: [{ label: 'a', text: 'Verdadero', isCorrect: false }, { label: 'b', text: 'Falso', isCorrect: true }] },
    { questionText: 'Dada la siguiente respuesta: "Que la verdadera belleza está en el interior y no en la apariencia física", ¿Qué pregunta corresponde?', questionType: 'MATCHING', points: 2.5, contextText: 'Que la verdadera belleza está en el interior y no en la apariencia física', options: [{ label: 'a', text: '¿Qué le enseñó Pinocho a la amiga con rayas en la piel?', isCorrect: true }, { label: 'b', text: '¿Qué aprendió Pinocho del árbol especial?', isCorrect: false }, { label: 'c', text: '¿Qué mensaje dio el gato del sombrero?', isCorrect: false }, { label: 'd', text: '¿Por qué defendieron al compañero en la escuela?', isCorrect: false }] },
    { questionText: '¿Qué pregunta corresponde a la respuesta "Que la amistad, la honestidad y la aceptación son los verdaderos tesoros de la vida"?', questionType: 'MATCHING', points: 2, contextText: 'Que la amistad, la honestidad y la aceptación son los verdaderos tesoros de la vida', options: [{ label: 'a', text: '¿Qué aprendieron juntos al final del día?', isCorrect: true }, { label: 'b', text: '¿Qué hizo Pinocho en el bosque?', isCorrect: false }, { label: 'c', text: '¿Cómo ayudaron a la niña diferente?', isCorrect: false }, { label: 'd', text: '¿Qué enseñó el gato a Pinocho?', isCorrect: false }] },
  ];

  for (let i = 0; i < questions4.length; i++) {
    const q = questions4[i];
    const [question] = await db.insert(questions).values({
      examId: exam4.id,
      section: i < 2 ? 'Sección 1' : (i < 6 ? 'Sección 2' : (i < 9 ? 'Sección 3' : 'Sección 4')),
      questionText: q.questionText,
      questionType: q.questionType as any,
      orderIndex: i,
      points: q.points.toString(),
      contextText: q.contextText || null,
    }).returning();

    await db.insert(questionOptions).values(
      q.options.map((opt, oi) => ({
        questionId: question.id,
        optionLabel: opt.label,
        optionText: opt.text,
        isCorrect: opt.isCorrect,
        orderIndex: oi,
      }))
    );
  }

  console.log('✅ Seed completed!');
}

seed().catch(console.error);
