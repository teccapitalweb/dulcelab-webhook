// ═══════════════════════════════════════════════════════════════════
// data/biblioteca.js · contenido de "PDFs y material" → Guías y Recetas
//
// Todo el texto es de DulceLab Food (escrito con conocimiento general de la
// industria; los chefs del equipo deben revisarlo antes de dar por bueno cada
// dato). El cuerpo (contenido / ingredientes / pasos) NO viaja al navegador de
// cualquiera: solo lo entrega routes/biblioteca.js a miembros con membresía y XP
// suficientes. El catálogo (títulos, descripción, XP) sí es público.
//
// Los XP se GASTAN al abrir un material (una sola vez por material; después queda abierto).
// Se ganan con: regalo de bienvenida (150), retos (50 XP o menos cada uno), cofres por terminar
// cada nivel de retos (Básico, Intermedio, Avanzado) y un cofre de 15 por cada curso terminado.
// Precios: de 270 a 560 XP. Todo el catálogo cuesta 6,960 XP; con lo que hay hoy se alcanza ~2,850.
// ═══════════════════════════════════════════════════════════════════

const NOTA_GUIA = 'Guía elaborada por DulceLab Food con criterios generales de la industria. No sustituye la normativa vigente de tu país ni la capacitación presencial.';

export const GUIAS = [
  // ───────────────────────── 1 · Pastelería ─────────────────────────
  {
    id: 'g-pasteleria', xp: 400, tema: 'Pastelería', minutos: 12,
    titulo: 'Pastelería moderna: ciencia y emplatado',
    resumen: 'Qué hace cada ingrediente, cómo mezclar sin arruinar la miga y cómo presentar un postre que se vea (y se venda) mejor.',
    fuente: { titulo: 'Modern Pastry and Plated Dessert Techniques', autor: 'BC Cook Articulation Committee (BCcampus)', licencia: 'CC BY 4.0', url: 'https://opentextbc.ca/modernpastryandplateddesserts' },
    contenido: [
      { h: 'Los cinco ingredientes que lo deciden todo', p: ['Casi todo postre es una combinación de cinco funciones. Si entiendes qué hace cada una, puedes arreglar una receta que falla en lugar de adivinar.'],
        ul: ['Harina: da estructura (gluten y almidón). Harina de pastel o repostería (baja en proteína) da miga suave; harina de fuerza da una textura chiclosa, buena para pan y mala para un bizcocho.',
             'Azúcar: además de dulzor aporta humedad, suavidad, dorado y estabilidad a los merengues.',
             'Grasa: da ternura y sabor. La mantequilla aporta el mejor sabor, el aceite deja la miga más húmeda y la manteca da hojaldrado.',
             'Huevo: estructura, emulsión, aire (las claras batidas), color y riqueza (las yemas).',
             'Leudantes: el polvo para hornear lleva bicarbonato, un ácido y almidón; el bicarbonato solo necesita un ingrediente ácido (yogur, limón, suero, cacao natural). También leudan el aire batido y el vapor.'] },
      { h: 'Pesa, no midas por tazas', p: ['Una taza de harina puede pesar entre 100 y 150 g según cómo la llenes. En pastelería esa diferencia es la que separa un pastel esponjoso de uno seco. Usa báscula y pesa todo, incluso los líquidos.', 'La temperatura también es un ingrediente: la mantequilla para cremar debe estar blanda pero fresca (se hunde con el dedo sin deshacerse), y los huevos a temperatura ambiente se integran y emulsionan mejor.'] },
      { h: 'Ciencia de la mezcla', ul: ['Cremado: batir mantequilla con azúcar mete aire en la grasa. Ese aire es el que después se expande en el horno. Bate hasta que esté clara y esponjosa.',
             'Batido de huevos: en un bizcocho tipo genovesa, el volumen sale de huevos batidos con azúcar. Se incorporan los secos con movimientos envolventes, sin golpear.',
             'Mezcla corta (estilo muffin): se mezclan secos por un lado y húmedos por otro y se juntan lo mínimo.',
             'Gluten: al mezclar harina con líquido se forma gluten. Mezclar de más en un pastel o muffin da miga dura y túneles; para eso, une los ingredientes solo hasta que desaparezca la harina seca.'] },
      { h: 'Cremas, rellenos y espumas', ul: ['Crema pastelera: leche, yemas, azúcar y almidón. Hay que llevarla a hervor suave y cocinarla uno o dos minutos batiendo para activar el almidón; si no, queda líquida. Enfría con plástico pegado a la superficie para que no se forme costra.',
             'Ganache: chocolate con crema caliente. Una proporción 1:1 en peso (chocolate:crema) da una ganache suave para cubrir; 2:1 firma para hacer trufas.',
             'Merengue: claras con azúcar. El francés es el más sencillo, el suizo se calienta a baño maría y el italiano se hace con jarabe caliente; este último es el más estable.',
             'Crema batida: sale mejor con crema para batir (alrededor de 35 % de grasa), muy fría, y con el tazón y el batidor fríos.'] },
      { h: 'Horno y tiempos', ul: ['Precalienta siempre; un horno sin llegar a temperatura es la causa más común de pasteles planos.',
             'Usa un termómetro de horno: muchos hornos marcan 10 a 20 °C de más o de menos.',
             'No abras la puerta antes de que pase dos tercios del tiempo: el cambio brusco de temperatura hace que el pastel se baje.',
             'Prueba del palillo: sale limpio o con migas secas. Deja enfriar en rejilla antes de desmoldar o cortar.'] },
      { h: 'Emplatado de postres: reglas que sí funcionan', ol: ['Elige un protagonista: lo demás lo acompaña, no compite.',
             'Busca contraste: de textura (crujiente con cremoso), de temperatura (tibio con frío), de sabor (dulce con ácido) y de color.',
             'Da altura y deja espacio: un plato lleno se ve amontonado. El borde limpio vale tanto como la decoración.',
             'Usa números impares de elementos (tres o cinco se ven más naturales que dos o cuatro).',
             'Pon las salsas con intención: un punto, una línea o un brochazo, no un charco.',
             'Toda decoración debe poder comerse y tener sentido: una fruta ácida corta lo dulce y a la vez adorna.'] },
      { h: 'Errores comunes y cómo corregirlos', ul: ['El bizcocho se baja: abriste el horno muy pronto, usaste demasiado leudante o batiste las claras de más.',
             'La miga sale seca: horneaste de más o pusiste harina de más (por eso conviene pesar).',
             'La crema pastelera queda con grumos: no la batiste mientras espesaba; cuélala y bate más fuerte la próxima vez.',
             'La ganache se corta (se separa): se calentó de más. Agrega una cucharada de leche tibia y bate desde el centro con un batidor de globo.',
             'El merengue suelta líquido ("llora"): el azúcar no se disolvió del todo o había humedad en el tazón.'] },
      { h: 'Lista antes de servir', ul: ['¿El postre está a la temperatura correcta (frío o tibio, según el diseño)?', '¿El borde del plato está limpio?', '¿Hay contraste de textura y de sabor?', '¿Se puede comer todo lo que está en el plato?', '¿Lo probaste tú antes de mandarlo?'] },
      { nota: NOTA_GUIA }
    ]
  },

  // ───────────────────────── 2 · Panadería ─────────────────────────
  {
    id: 'g-panaderia', xp: 440, tema: 'Panadería', minutos: 12,
    titulo: 'Ingredientes del panadero: harina, agua, sal y fermento',
    resumen: 'Cómo elegir la harina, calcular la hidratación y usar porcentajes del panadero para escalar cualquier receta.',
    fuente: { titulo: 'Understanding Ingredients for the Canadian Baker', autor: 'BC Cook Articulation Committee (BCcampus)', licencia: 'CC BY 4.0', url: 'https://opentextbc.ca/ingredients' },
    contenido: [
      { h: 'Cuatro ingredientes, infinitos panes', p: ['La mayoría de los panes salen de harina, agua, sal y un fermento (levadura o masa madre). La diferencia está en las proporciones, el tiempo y la temperatura. Por eso conviene pensar en porcentajes y no en tazas.'] },
      { h: 'La harina', p: ['Lo que más importa es la proteína, porque con agua y amasado forma gluten, la red que atrapa el gas y da estructura.'],
        ul: ['Harina de fuerza (para pan): alrededor de 12 a 14 % de proteína. Da miga elástica y buen volumen.',
             'Harina todo uso: punto medio, sirve para pan sencillo, tortillas de harina y masas rápidas.',
             'Harina de repostería o pastel: baja en proteína (alrededor de 7 a 9 %), para miga tierna.',
             'Harina integral: conserva salvado y germen. Aporta fibra y sabor, absorbe más agua y desarrolla menos gluten, por eso el pan queda más denso.',
             'Centeno y otros cereales: casi no forman gluten; se mezclan con harina de trigo.'],
        nota: 'Los porcentajes de proteína varían según la marca y el país: revisa la etiqueta (proteína por 100 g) en lugar de confiar solo en el nombre.' },
      { h: 'El agua y la hidratación', p: ['La hidratación es el agua dividida entre la harina, multiplicada por 100. Con 1,000 g de harina y 650 g de agua, la hidratación es 65 %.'],
        ul: ['Masas más secas (60 a 65 %) son fáciles de formar: pan de caja, bolillo, pan dulce.', 'Masas intermedias (65 a 75 %) dan miga más abierta: baguette, pan rústico.', 'Masas muy hidratadas (75 % o más) dan miga muy abierta, pero son pegajosas: ciabatta, algunas masas madre.'],
        nota: 'Son rangos de referencia. Cada harina absorbe distinto: agrega el último 5 % del agua poco a poco.' },
      { h: 'La sal', p: ['En la mayoría de panes va alrededor de 2 % del peso de la harina. Da sabor, controla la velocidad de la fermentación y fortalece el gluten. Un pan sin sal fermenta más rápido y sabe plano.'] },
      { h: 'Levadura y masa madre', ul: ['Levadura instantánea: se mezcla directo con la harina.', 'Levadura seca activa: conviene hidratarla unos minutos en agua tibia.', 'Levadura fresca: se desmorona en la masa. Como regla práctica, hace falta unas tres veces más peso de fresca que de instantánea.', 'Masa madre: cultivo de levaduras y bacterias lácticas silvestres. Aporta sabor ácido y conserva mejor el pan; fermenta más lento.', 'Más levadura o más calor, fermentación más rápida; menos levadura y refrigerar, fermentación lenta y más sabor.'] },
      { h: 'Azúcar, grasa, huevo y leche', ul: ['Azúcar: alimenta a la levadura, dora y suaviza; en cantidades altas (arriba de 10 % de la harina, como en pan dulce) frena la levadura, por eso esas masas fermentan más lento.', 'Grasa: suaviza la miga y alarga la vida del pan. Se agrega después de que el gluten ya empezó a formarse.', 'Huevo y leche: miga fina, color más dorado y sabor más redondo.'] },
      { h: 'Porcentajes del panadero', p: ['Se toma la harina como 100 % y los demás ingredientes se expresan sobre ella. Ejemplo de una masa sencilla:'],
        ul: ['Harina 1,000 g → 100 %', 'Agua 650 g → 65 %', 'Sal 20 g → 2 %', 'Levadura instantánea 5 g → 0.5 %'],
        nota: 'Ventaja: para hacer el doble solo multiplicas todo por 2; para ajustar la hidratación cambias un número. Es el idioma en el que se escriben las fórmulas profesionales.' },
      { h: 'De la mezcla al horno', ol: ['Mezclar y amasar hasta que la masa esté lisa y elástica (prueba de la ventana: se estira fina sin romperse).', 'Primera fermentación, hasta que casi doble su volumen.', 'Dividir y bolear; reposar 10 a 15 minutos.', 'Formar la pieza.', 'Fermentación final: prueba del dedo; si al presionar suavemente vuelve despacio, está lista.', 'Hornear, con vapor al inicio si buscas corteza crujiente.', 'Enfriar en rejilla antes de cortar: el interior todavía se está terminando de cocer.'] },
      { h: 'Problemas frecuentes', ul: ['Pan denso: poca fermentación, harina floja o falta de agua.', 'Pan plano o que se hunde: se pasó de fermentación.', 'Corteza pálida: horno poco caliente o sin vapor.', 'Miga cerrada con huecos grandes en un solo lado: formado flojo o gas mal distribuido.', 'Sabe a levadura: demasiada levadura con poco tiempo; baja la dosis y alarga la fermentación.'] },
      { nota: NOTA_GUIA }
    ]
  },

  // ───────────────────────── 3 · Inocuidad ─────────────────────────
  {
    id: 'g-inocuidad', xp: 480, tema: 'Inocuidad', minutos: 14,
    titulo: 'Inocuidad en la cocina: higiene, temperaturas y orden',
    resumen: 'Lo esencial para que lo que sirves no enferme a nadie: peligros, temperaturas clave, contaminación cruzada y alérgenos.',
    fuente: { titulo: 'Food Safety, Sanitation, and Personal Hygiene', autor: 'BC Cook Articulation Committee (BCcampus)', licencia: 'CC BY 4.0', url: 'https://opentextbc.ca/foodsafety' },
    contenido: [
      { h: 'Qué es la inocuidad', p: ['Un alimento es inocuo cuando no hace daño a quien lo consume. Los peligros son de tres tipos:'],
        ul: ['Biológicos: bacterias, virus, parásitos y hongos. Son la causa principal de las enfermedades por alimentos.', 'Químicos: productos de limpieza, plaguicidas, exceso de aditivos y alérgenos mal controlados.', 'Físicos: vidrio, metal, plástico, pelo, huesos y cualquier objeto que no debería estar.'] },
      { h: 'Las cinco claves de la OMS', ol: ['Mantén la limpieza.', 'Separa los alimentos crudos de los cocinados.', 'Cocina completamente.', 'Mantén los alimentos a temperaturas seguras.', 'Usa agua y materias primas seguras.'] },
      { h: 'La zona de peligro de temperatura', p: ['Las bacterias se multiplican rápido entre aproximadamente 4 °C y 60 °C. Tu trabajo es pasar los alimentos por esa zona lo menos posible.'],
        ul: ['Refrigeración: 4 °C o menos.', 'Congelación: −18 °C o menos.', 'Mantener caliente: 60 °C o más.', 'Regla de las dos horas: un alimento perecedero no debe pasar más de dos horas a temperatura ambiente (una hora si hace mucho calor, alrededor de 32 °C o más).'] },
      { h: 'Temperaturas internas de cocción', p: ['El color no es una prueba confiable: usa un termómetro de sonda en la parte más gruesa.'],
        ul: ['Aves y recalentado de sobras: 74 °C.', 'Carne molida: 71 °C.', 'Cortes enteros de res y cerdo, y pescado: 63 °C y dejar reposar 3 minutos.', 'Huevos: cocinados hasta que clara y yema estén firmes si se sirven a personas vulnerables (niños, adultos mayores, embarazadas).'] },
      { h: 'Contaminación cruzada', p: ['Ocurre cuando los microbios pasan de un alimento crudo a uno listo para comer, por manos, tablas, cuchillos, trapos o goteos.'],
        ul: ['Usa tablas y cuchillos distintos (o desinfecta entre usos) para crudos y listos para comer. Un código de colores ayuda.', 'En el refrigerador: alimentos listos arriba, crudos abajo; las carnes crudas, en la parte más baja y en recipientes cerrados.', 'No laves el pollo crudo en el fregadero: salpica bacterias a todo alrededor. La cocción es lo que lo vuelve seguro.', 'Cambia el trapo con frecuencia; usa uno para superficies y otro para manos.'] },
      { h: 'Higiene personal', ul: ['Lávate las manos al menos 20 segundos con agua y jabón: al llegar, después de ir al baño, tocar basura, carne cruda, huevo, celular, cara o pelo.', 'Uniforme limpio, cabello recogido y cubierto, uñas cortas y sin esmalte, sin joyería.', 'Si tienes vómito, diarrea, fiebre o heridas infectadas, no manipules alimentos.', 'Cubre heridas con curita impermeable y guante.'] },
      { h: 'Limpiar y desinfectar no es lo mismo', p: ['Limpiar quita la suciedad visible con agua y detergente. Desinfectar reduce los microbios con un producto adecuado y en su concentración correcta. El orden siempre es: limpiar, enjuagar, desinfectar. Si desinfectas sobre superficie sucia, no funciona.'], ul: ['Respeta las diluciones del fabricante; más cloro no es mejor.', 'Nunca mezcles productos de limpieza.', 'Guarda los químicos lejos y por debajo de los alimentos, bien etiquetados.'] },
      { h: 'Recepción, almacenamiento y descongelado', ul: ['Al recibir: revisa temperatura, caducidad, empaques íntegros y limpieza del transporte. Rechaza lo dudoso.', 'Etiqueta todo con fecha. Rota con PEPS: primeras entradas, primeras salidas.', 'Descongela en el refrigerador, bajo agua fría corriente en un recipiente o en microondas si lo vas a cocinar enseguida. Nunca sobre la mesa.', 'Enfría rápido las preparaciones grandes: divide en recipientes poco profundos antes de refrigerar.'] },
      { h: 'Alérgenos', p: ['Los alimentos que con más frecuencia causan reacciones graves incluyen leche, huevo, trigo, soya, cacahuate, nueces, pescado y mariscos. Si sirves al público:'],
        ul: ['Conoce qué lleva cada platillo y avísalo cuando te pregunten.', 'Evita contacto cruzado: utensilios y superficies limpios al preparar algo "sin" un alérgeno.', 'Revisa siempre las etiquetas de los ingredientes: cambian.'] },
      { h: 'Normativa en México', p: ['En México, las prácticas de higiene para el proceso de alimentos, bebidas o suplementos alimenticios están en la NOM-251-SSA1-2009. Si vendes alimentos, consúltala y confirma los requisitos que aplican a tu giro y estado con la autoridad sanitaria.'] },
      { h: 'Lista diaria rápida', ul: ['Manos lavadas y uniforme limpio.', 'Refrigerador a 4 °C o menos (anótalo).', 'Crudos abajo, listos arriba.', 'Termómetro limpio y a la mano.', 'Todo etiquetado con fecha.', 'Superficies limpias y desinfectadas al terminar.'] },
      { nota: NOTA_GUIA }
    ]
  },

  // ───────────────────────── 4 · Carnes ─────────────────────────
  {
    id: 'g-carnes', xp: 520, tema: 'Cocina', minutos: 12,
    titulo: 'Cortes de carne: qué son, cómo cocinarlos y cómo aprovecharlos',
    resumen: 'Entiende por qué unos cortes son suaves y otros duros, qué método usar con cada uno y cómo calcular el rendimiento real.',
    fuente: { titulo: 'Meat Cutting and Processing for Food Service', autor: 'BC Cook Articulation Committee (BCcampus)', licencia: 'CC BY 4.0', url: 'https://opentextbc.ca/meatcutting' },
    contenido: [
      { h: 'Seguridad antes de cortar', ul: ['Cuchillo bien afilado: uno sin filo resbala y causa más accidentes.', 'Tabla estable: coloca un trapo húmedo debajo.', 'Corta siempre alejando la hoja de tu cuerpo y de tu mano de apoyo (mano en garra).', 'La carne bien fría (2 a 4 °C) se corta con más control. Trabaja en tandas y regresa lo demás al refrigerador.', 'Lava y desinfecta tabla y cuchillos al cambiar de tipo de carne.'] },
      { h: 'La idea que lo explica todo', p: ['Los músculos que trabajan poco (lomo, filete) son suaves, de sabor delicado y caros: se cocinan rápido. Los músculos que trabajan mucho (pierna, paleta, pecho) son duros pero muy sabrosos, porque tienen colágeno: se cocinan despacio y con humedad, y el colágeno se convierte en gelatina que da jugosidad.'] },
      { h: 'Res, cerdo y pollo: nombres que debes conocer', ul: ['Res suave: filete, lomo alto y costilla (ribeye), lomo bajo o New York.', 'Res de mucho sabor: arrachera (falda), que se asa y se corta contra la fibra; pecho, paleta y pierna, que van mejor guisados o a baja temperatura.', 'Cerdo: lomo y chuleta (suaves), pierna y paleta (para deshebrar o carnitas), costillar y panza.', 'Pollo: pechuga (magra, se seca fácil), muslo y pierna (más jugosos, perdonan la cocción), ala.'],
        nota: 'Los nombres de los cortes cambian de país y hasta de carnicería. Pide con nombre y muestra al proveedor y confirma con una foto o un corte real.' },
      { h: 'Qué método usar según el corte', ul: ['Cortes suaves → calor seco y rápido: plancha, parrilla, salteado, horno caliente.', 'Cortes duros → calor húmedo y lento: guisado, braseado, caldo, barbacoa, cocción a baja temperatura.', 'Sellar la carne (dorarla fuerte por fuera) da sabor, pero no "sella jugos": el sabor viene del dorado.'] },
      { h: 'Cortar contra la fibra y reposar', p: ['Las fibras musculares son como pajillas. Si cortas en paralelo, quedan largas y chiclosas; si cortas en sentido perpendicular, quedan cortas y tiernas. Es clave en arrachera y pecho.', 'Después de cocinar, deja reposar la carne 5 a 10 minutos (más si la pieza es grande): los jugos se redistribuyen y no se pierden al cortar.'] },
      { h: 'Temperaturas internas seguras', ul: ['Aves: 74 °C.', 'Carne molida: 71 °C.', 'Cortes enteros de res, cerdo y pescado: 63 °C y 3 minutos de reposo.'], nota: 'Mide siempre en la parte más gruesa, sin tocar hueso, con un termómetro de sonda limpio.' },
      { h: 'Rendimiento y merma: cuánto cuesta realmente tu carne', p: ['Cuando compras una pieza, parte se pierde al limpiar, deshuesar y recortar. Eso es merma. Lo que queda es el rendimiento.'],
        ul: ['Rendimiento = kilos utilizables ÷ kilos comprados × 100.', 'Costo real por kilo = costo total pagado ÷ kilos utilizables.', 'Ejemplo: compras 10 kg a $200/kg ($2,000). Quedan 8 kg utilizables: rendimiento 80 % y costo real $250/kg, no $200.'],
        nota: 'Aprovecha los recortes: huesos y retazos para caldo, recortes limpios para guisado o carne molida.' },
      { h: 'Almacenamiento', ul: ['Carnes crudas en la parte baja del refrigerador, en recipientes cerrados y a 4 °C o menos.', 'Rotula con fecha y usa por PEPS.', 'Congela a −18 °C en porciones del tamaño que vas a usar, sin aire.', 'Descongela en refrigerador, no a temperatura ambiente.'] },
      { nota: NOTA_GUIA }
    ]
  },

  // ───────────────────────── 5 · Gestión ─────────────────────────
  {
    id: 'g-gestion', xp: 560, tema: 'Producción', minutos: 14,
    titulo: 'Gestión de cocina y costos: de la receta al precio de venta',
    resumen: 'Ficha técnica, costo por porción, merma, precio de venta, inventario y punto de equilibrio, con ejemplos que puedes copiar.',
    fuente: { titulo: 'Basic Kitchen and Food Service Management / Introduction to Food Production and Service', autor: 'BC Cook Articulation Committee (BCcampus) / Beth Egan (Penn State)', licencia: 'CC BY 4.0', url: 'https://opentextbc.ca/basickitchenandfoodservicemanagement/' },
    contenido: [
      { h: 'Receta estándar y ficha técnica', p: ['Una receta estándar se prepara igual, con el mismo resultado, sin importar quién la haga. Su ficha técnica debe incluir:'],
        ul: ['Nombre, rendimiento (cuántas porciones) y tamaño de la porción.', 'Ingredientes con cantidades en peso o volumen exactos.', 'Procedimiento paso a paso, tiempos y temperaturas.', 'Costo de cada ingrediente, costo total y costo por porción.', 'Alérgenos, vida útil y foto del plato terminado.'] },
      { h: 'Costo por porción', p: ['Suma el costo de todos los ingredientes (incluye pequeños como sal, aceite y empaque) y divide entre las porciones.'],
        ul: ['Ejemplo: un flan cuesta $180 en ingredientes y rinde 12 porciones.', '$180 ÷ 12 = $15 por porción.'] },
      { h: 'Merma y rendimiento', p: ['No pagas por el producto que usas, sino por el que compras. Si compras 5 kg de zanahoria a $20/kg ($100) y después de pelar quedan 4.2 kg, tu costo real es $100 ÷ 4.2 = $23.81 por kilo utilizable. Usa ese costo real en tus recetas.'] },
      { h: 'Del costo al precio de venta', p: ['Un método común: define qué porcentaje del precio quieres que sea costo de ingredientes (el "food cost" objetivo) y divide.'],
        ul: ['Precio de venta = costo por porción ÷ porcentaje objetivo.', 'Ejemplo: costo $24 y objetivo 30 % → $24 ÷ 0.30 = $80.', 'En restaurantes es habitual mantener el costo de alimentos entre 28 y 35 % del precio, pero depende de tu tipo de negocio: calcúlalo con tus propios gastos.'],
        nota: 'El costo de ingredientes no es todo: además hay renta, sueldos, gas, luz, empaques, impuestos y tu propio trabajo. El precio debe cubrirlos y dejar utilidad.' },
      { h: 'Inventario y PEPS', ul: ['Cuenta lo que tienes con regularidad (semanal como mínimo).', 'PEPS (primeras entradas, primeras salidas): lo más antiguo se usa primero; lo nuevo va al fondo.', 'Define mínimos y máximos por producto para no quedarte sin nada ni acumular lo que se caduca.', 'Revisa caducidades y desperdicio cada semana y anota por qué se tira lo que se tira.'] },
      { h: 'Mise en place y flujo de producción', ul: ['Mise en place: todo en su lugar antes de empezar (ingredientes pesados, cortados y utensilios a la mano).', 'Planea la producción del día según ventas esperadas y no produzcas "a ojo".', 'Ordena la cocina por estaciones y flujo: recepción, almacén, preparación, cocción, emplatado y entrega.'] },
      { h: 'Compras y proveedores', ul: ['Cotiza con al menos dos o tres proveedores y compara precio por kilo utilizable, no solo por kilo.', 'Revisa y pesa cada entrega contra la factura; mide temperatura y fecha.', 'Pon por escrito qué calidad esperas (tamaño, madurez, peso) y mantén comunicación con el proveedor.'] },
      { h: 'Punto de equilibrio sencillo', p: ['Es cuántas piezas necesitas vender al mes para cubrir tus gastos fijos.'],
        ul: ['Margen por pieza = precio − costo variable.', 'Punto de equilibrio = gastos fijos ÷ margen por pieza.', 'Ejemplo: gastos fijos $12,000 al mes; pastel a $400 con costo variable de $250 → margen $150 → $12,000 ÷ $150 = 80 pasteles al mes para no perder.'] },
      { h: 'Hábito semanal de control', ul: ['Actualiza los costos de tus ingredientes principales.', 'Revisa las 5 recetas que más vendes: ¿siguen dejando margen?', 'Compara inventario real contra lo que debería haber.', 'Anota merma y desperdicio y define una acción para reducirlo.', 'Usa las Herramientas Pro de este panel: costeo de recetas, rendimiento y merma, y porciones.'] },
      { nota: NOTA_GUIA }
    ]
  }
];

// ═══════════════════════════════ RECETAS ═══════════════════════════════
const NOTA_RECETA = 'Receta de DulceLab Food. Los tiempos y las cantidades son una base: prueba, ajusta a tu horno y a tus ingredientes, y anota los cambios en tu ficha técnica.';

export const RECETAS = [
  {
    id: 'r-salsas', xp: 270, categoria: 'Cocina', tiempo: 25, porciones: 8, dificultad: 'Fácil',
    titulo: 'Salsa verde cocida y salsa roja asada',
    resumen: 'Dos salsas de mesa básicas que se hacen en menos de media hora.',
    grupos: [
      { g: 'Salsa verde', items: ['500 g de tomate verde (tomatillo)', '2 a 3 chiles serranos', '¼ de cebolla', '1 diente de ajo', '½ taza de cilantro', 'Sal al gusto', '¼ de taza del agua de cocción'] },
      { g: 'Salsa roja', items: ['4 jitomates saladet (unos 500 g)', '2 a 3 chiles de árbol secos (o serranos)', '¼ de cebolla', '1 diente de ajo', 'Sal al gusto'] }
    ],
    pasos: [
      'Verde: hierve los tomates y los chiles 8 a 10 minutos, hasta que cambien de color y se suavicen.',
      'Licúa con cebolla, ajo, cilantro y un poco del agua de cocción. Prueba y ajusta la sal.',
      'Roja: asa los jitomates, el ajo y los chiles en un comal hasta que se ampollen y ennegrezcan ligeramente por fuera.',
      'Licúa todo con la cebolla y la sal hasta la textura que prefieras.',
      'Opcional: calienta cada salsa 3 a 5 minutos en una sartén con un poco de aceite para un sabor más profundo.'
    ],
    tips: ['Más chile o menos: quita semillas y venas para bajar el picante.', 'Guarda en refrigerador en frasco limpio y úsalas en 4 días.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-galletas', xp: 290, categoria: 'Repostería', tiempo: 60, porciones: 30, dificultad: 'Fácil',
    titulo: 'Galletas de mantequilla',
    resumen: 'Galletas de masa corta que se cortan con molde y conservan su forma.',
    grupos: [{ g: 'Ingredientes', items: ['225 g de mantequilla sin sal, blanda', '100 g de azúcar glass', '1 yema', '1 cucharadita de vainilla', '300 g de harina de trigo', '¼ de cucharadita de sal'] }],
    pasos: [
      'Bate la mantequilla con el azúcar glass 2 a 3 minutos, solo hasta que esté cremosa.',
      'Agrega la yema y la vainilla y mezcla.',
      'Incorpora la harina con la sal hasta que la masa se junte; no sigas mezclando.',
      'Forma un disco, envuélvelo y refrigera 30 minutos.',
      'Extiende a unos 6 mm de grosor, corta con molde y acomoda en charola con papel.',
      'Refrigera la charola 10 minutos para que las galletas no se deformen.',
      'Hornea a 170 °C de 15 a 18 minutos, hasta que los bordes estén dorados claro. Enfría en rejilla.'
    ],
    tips: ['Pesa la harina: de más y quedan secas.', 'Si la masa se pega, ponla 10 minutos al refrigerador.', 'Puedes agregar ralladura de limón o naranja a la mantequilla.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-arroz', xp: 310, categoria: 'Cocina', tiempo: 45, porciones: 6, dificultad: 'Fácil',
    titulo: 'Arroz rojo',
    resumen: 'Arroz suelto, color intenso y sabor a jitomate, con la proporción 1 a 2.',
    grupos: [{ g: 'Ingredientes', items: ['1½ tazas de arroz de grano largo (unos 300 g)', '2 jitomates (unos 250 g)', '¼ de cebolla', '1 diente de ajo', '3 tazas de líquido en total (caldo de pollo y/o agua, incluido el licuado)', '3 cucharadas de aceite', 'Sal al gusto', '½ taza de chícharos y zanahoria en cubos (opcional)'] }],
    pasos: [
      'Enjuaga el arroz y escúrrelo bien durante 15 minutos.',
      'Licúa jitomate, cebolla y ajo con 1 taza de agua; cuela. Completa con caldo hasta 3 tazas en total y caliéntalo.',
      'Calienta el aceite y fríe el arroz moviendo de 5 a 7 minutos, hasta que se dore ligeramente.',
      'Agrega el líquido caliente, la sal y las verduras. Sube a hervor.',
      'Baja a fuego mínimo, tapa y cocina 18 a 20 minutos sin destapar.',
      'Apaga y deja reposar tapado 10 minutos. Esponja con un tenedor.'
    ],
    tips: ['El arroz bien enjuagado y dorado queda suelto.', 'Si está duro, agrega ¼ de taza de caldo caliente y tapa 5 minutos más.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-flan', xp: 330, categoria: 'Repostería', tiempo: 90, porciones: 10, dificultad: 'Media',
    titulo: 'Flan napolitano',
    resumen: 'Flan cremoso con caramelo, hecho a baño maría.',
    grupos: [
      { g: 'Caramelo', items: ['150 g de azúcar'] },
      { g: 'Mezcla', items: ['1 lata de leche condensada (397 g)', '1 lata de leche evaporada (360 ml)', '4 huevos', '190 g de queso crema', '1 cucharadita de vainilla'] }
    ],
    pasos: [
      'Caramelo: pon el azúcar en una olla a fuego medio sin mover hasta que se derrita y tome color ámbar. Viértelo en un molde de 1.5 a 2 litros y gira para cubrir la base.',
      'Licúa todos los ingredientes de la mezcla 1 minuto y cuélalos.',
      'Vierte sobre el caramelo y tapa el molde con papel aluminio.',
      'Hornea a baño maría a 170 °C de 60 a 70 minutos, hasta que cuaje y tiemble ligeramente al centro.',
      'Enfría a temperatura ambiente y refrigera mínimo 4 horas.',
      'Pasa un cuchillo por el borde y desmolda sobre un plato con orilla.'
    ],
    tips: ['Colar evita grumos y burbujas.', 'Si el caramelo se oscurece demasiado, amarga: retíralo del fuego cuando esté ámbar.', 'El agua del baño maría debe llegar a la mitad del molde.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-brownies', xp: 350, categoria: 'Repostería', tiempo: 55, porciones: 16, dificultad: 'Fácil',
    titulo: 'Brownies de chocolate',
    resumen: 'Brownies densos y húmedos, con costra delgada arriba.',
    grupos: [{ g: 'Ingredientes', items: ['170 g de mantequilla', '200 g de chocolate semiamargo picado', '200 g de azúcar', '3 huevos', '1 cucharadita de vainilla', '100 g de harina', '30 g de cacao en polvo', '¼ de cucharadita de sal', '100 g de nueces (opcional)'] }],
    pasos: [
      'Precalienta el horno a 175 °C y forra un molde de 20 × 20 cm con papel.',
      'Derrite mantequilla y chocolate a baño maría (o en microondas en intervalos cortos). Deja entibiar 5 minutos.',
      'Bate azúcar, huevos y vainilla 1 a 2 minutos.',
      'Integra el chocolate derretido.',
      'Tamiza harina, cacao y sal e incorpora con espátula, solo hasta que no se vea harina. Agrega las nueces.',
      'Vierte en el molde y hornea de 25 a 28 minutos: un palillo debe salir con migas húmedas, no líquido.',
      'Deja enfriar por completo antes de cortar para tener cortes limpios.'
    ],
    tips: ['No mezcles de más después de agregar la harina.', 'Si los quieres más "fudgy", hornea 2 minutos menos.', 'Un cuchillo ligeramente caliente corta mejor.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-pay-limon', xp: 370, categoria: 'Repostería', tiempo: 40, porciones: 10, dificultad: 'Fácil',
    titulo: 'Pay de limón sin horno',
    resumen: 'Base de galleta y relleno cremoso de limón que cuaja en el refrigerador.',
    grupos: [
      { g: 'Base', items: ['200 g de galletas Marías molidas', '100 g de mantequilla derretida', '2 cucharadas de azúcar'] },
      { g: 'Relleno', items: ['1 lata de leche condensada (397 g)', '1 lata de media crema (unos 225 g) o 200 g de crema ácida', '½ taza (120 ml) de jugo de limón recién exprimido', 'Ralladura de 1 limón'] }
    ],
    pasos: [
      'Mezcla las galletas molidas con la mantequilla y el azúcar. Presiona en un molde de 23 cm (base y 2 cm de las paredes).',
      'Refrigera la base 20 minutos.',
      'Bate la leche condensada con la crema.',
      'Agrega el jugo de limón en 2 o 3 tandas, mezclando: la acidez hace que espese.',
      'Vierte sobre la base y alisa. Refrigera mínimo 6 horas.',
      'Decora con ralladura de limón antes de servir.'
    ],
    tips: ['Usa jugo recién exprimido; el embotellado cambia el sabor.', 'Guárdalo en el refrigerador y consúmelo en 3 días.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-pan-caja', xp: 390, categoria: 'Panadería', tiempo: 210, porciones: 14, dificultad: 'Media',
    titulo: 'Pan de caja casero',
    resumen: 'Pan de molde de miga suave, ideal para sándwiches y tostadas.',
    grupos: [{ g: 'Masa', items: ['500 g de harina de fuerza', '320 g de leche tibia', '40 g de mantequilla blanda', '30 g de azúcar', '10 g de sal', '7 g de levadura seca instantánea'] }],
    pasos: [
      'Mezcla harina, azúcar, sal y levadura. Agrega la leche y amasa hasta formar la masa.',
      'Amasa 8 a 10 minutos. Agrega la mantequilla y amasa 3 a 5 minutos más hasta que esté lisa y elástica (prueba de la ventana).',
      'Fermenta tapada de 60 a 75 minutos, hasta que casi doble su volumen.',
      'Desgasifica, estira en rectángulo y enrolla apretado. Coloca con la unión hacia abajo en un molde engrasado de 25 × 11 cm.',
      'Fermenta de 45 a 60 minutos, hasta que sobrepase el borde 1 a 2 cm.',
      'Hornea a 180 °C de 35 a 40 minutos; al golpear la base debe sonar hueco.',
      'Desmolda y enfría en rejilla al menos 1 hora antes de cortar.'
    ],
    tips: ['La masa debe estar a unos 24 a 26 °C al terminar de amasar.', 'Si la corteza se dora muy rápido, cubre con aluminio los últimos 10 minutos.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-tres-leches', xp: 410, categoria: 'Repostería', tiempo: 360, porciones: 15, dificultad: 'Media',
    titulo: 'Pastel tres leches',
    resumen: 'Bizcocho esponjoso bañado en tres leches y cubierto con crema batida.',
    grupos: [
      { g: 'Bizcocho', items: ['5 huevos (claras y yemas separadas)', '200 g de azúcar, divididos en 2', '125 g de harina', '1½ cucharaditas de polvo para hornear', '80 ml de leche', '1 cucharadita de vainilla'] },
      { g: 'Remojo', items: ['1 lata de leche evaporada (360 ml)', '1 lata de leche condensada (397 g)', '250 ml de leche entera'] },
      { g: 'Cubierta', items: ['300 ml de crema para batir, muy fría', '3 cucharadas de azúcar glass', '1 cucharadita de vainilla', 'Fresas o canela para decorar (opcional)'] }
    ],
    pasos: [
      'Precalienta el horno a 175 °C. Engrasa y forra un molde de 23 × 33 cm.',
      'Bate las yemas con la mitad del azúcar hasta que estén pálidas (unos 3 minutos). Agrega la leche y la vainilla.',
      'Tamiza la harina con el polvo para hornear e incorpórala a las yemas.',
      'Bate las claras a punto suave, agrega el resto del azúcar poco a poco y sigue hasta picos firmes.',
      'Incorpora las claras a la mezcla en 2 o 3 tandas, con movimientos envolventes.',
      'Hornea de 25 a 30 minutos. Deja enfriar.',
      'Pica el bizcocho con un tenedor. Mezcla las tres leches y báñalo poco a poco.',
      'Refrigera mínimo 4 horas (mejor toda la noche).',
      'Bate la crema con el azúcar glass y la vainilla, cubre y decora.'
    ],
    tips: ['Las claras no deben tener nada de yema ni grasa para subir bien.', 'Vierte la leche poco a poco para que el bizcocho la absorba de manera pareja.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-conchas', xp: 430, categoria: 'Panadería', tiempo: 240, porciones: 12, dificultad: 'Media',
    titulo: 'Conchas',
    resumen: 'Pan dulce mexicano de miga suave con cubierta de azúcar.',
    grupos: [
      { g: 'Masa', items: ['500 g de harina de fuerza', '100 g de azúcar', '8 g de sal', '10 g de levadura seca instantánea', '2 huevos', '180 ml de leche tibia', '100 g de mantequilla blanda', '1 cucharadita de vainilla'] },
      { g: 'Cubierta', items: ['100 g de mantequilla blanda (o manteca vegetal)', '100 g de azúcar glass', '100 g de harina de trigo', '1 cucharadita de vainilla', 'Para la versión de chocolate: cambia 15 g de harina por 15 g de cacao'] }
    ],
    pasos: [
      'Mezcla harina, azúcar, sal y levadura. Agrega huevos, leche y vainilla y amasa 8 a 10 minutos.',
      'Incorpora la mantequilla en 3 partes y amasa 5 a 8 minutos más, hasta que esté lisa y elástica.',
      'Fermenta tapada de 60 a 90 minutos, hasta casi doblar.',
      'Divide en 12 piezas de unos 80 g, forma bolitas y acomódalas en charola con papel. Reposa 10 minutos.',
      'Cubierta: mezcla todos los ingredientes hasta obtener una pasta tersa. Divide en 12 y aplana cada porción en forma de disco.',
      'Coloca un disco sobre cada bolita y presiona suavemente. Marca la cubierta con un cortador o un cuchillo.',
      'Fermenta de 45 a 60 minutos, hasta que estén esponjosas.',
      'Hornea a 180 °C de 15 a 18 minutos, hasta dorar ligeramente la base.'
    ],
    tips: ['La cubierta se parte al crecer y forma el dibujo: es normal.', 'Si la cubierta se pone blanda, refrigérala 10 minutos antes de usarla.', 'Pesa las bolitas para que todas hornee parejo.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-pozole', xp: 450, categoria: 'Cocina', tiempo: 210, porciones: 10, dificultad: 'Media',
    titulo: 'Pozole rojo',
    resumen: 'Caldo de chile guajillo con carne de cerdo y maíz cacahuazintle.',
    grupos: [
      { g: 'Caldo', items: ['1 kg de carne de cerdo (espaldilla o pierna) en trozos grandes', '500 g de hueso de cerdo (espinazo)', '1 cebolla, dividida', '6 dientes de ajo, divididos', '2.5 litros de agua', 'Sal al gusto'] },
      { g: 'Salsa y maíz', items: ['6 chiles guajillo', '2 chiles ancho', '2 latas grandes (unas 800 g cada una) de maíz pozolero cocido, escurrido', '2 cucharaditas de orégano'] },
      { g: 'Para servir', items: ['Lechuga o col rallada', 'Rábanos', 'Cebolla picada', 'Limón', 'Orégano', 'Tostadas'] }
    ],
    pasos: [
      'Coloca la carne y el hueso en una olla con el agua, la mitad de la cebolla, 3 dientes de ajo y sal. Cuando hierva, retira la espuma.',
      'Tapa y cocina a fuego bajo de 1.5 a 2 horas, hasta que la carne esté suave.',
      'Desvena los chiles y tuéstalos 20 segundos por lado en un comal, sin quemarlos. Remójalos en agua caliente 15 minutos.',
      'Licúa los chiles con el resto de la cebolla, el ajo y 1½ tazas del caldo. Cuela.',
      'Fríe la salsa en una cucharada de aceite 5 minutos y agrégala a la olla junto con el maíz escurrido y el orégano.',
      'Hierve a fuego bajo de 30 a 40 minutos. Ajusta la sal.',
      'Sirve caliente con las guarniciones al lado.'
    ],
    tips: ['Si se quema el chile, amarga: tuéstalo solo hasta que huela.', 'Mejora al día siguiente. Para refrigerar, enfría rápido y guarda en recipientes poco profundos.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-cheesecake', xp: 470, categoria: 'Repostería', tiempo: 480, porciones: 12, dificultad: 'Avanzada',
    titulo: 'Cheesecake horneado',
    resumen: 'Cheesecake cremoso estilo clásico, a baño maría y sin grietas.',
    grupos: [
      { g: 'Base', items: ['200 g de galletas Marías molidas', '90 g de mantequilla derretida', '2 cucharadas de azúcar'] },
      { g: 'Relleno', items: ['900 g de queso crema a temperatura ambiente (4 barras de 225 g)', '200 g de azúcar', '3 huevos + 1 yema', '240 g de crema ácida', '1 cucharada de jugo de limón', '2 cucharaditas de vainilla', '30 g de harina', 'Una pizca de sal'] }
    ],
    pasos: [
      'Precalienta a 175 °C. Forra por fuera con aluminio un molde desmontable de 23 cm.',
      'Mezcla galletas, mantequilla y azúcar. Presiona en el fondo y hornea 10 minutos.',
      'Baja la temperatura del horno a 160 °C.',
      'Bate el queso crema con azúcar, harina y sal a velocidad baja, solo hasta que esté liso.',
      'Agrega los huevos y la yema, uno a uno. Incorpora crema ácida, limón y vainilla.',
      'Vierte sobre la base. Coloca el molde dentro de otro con agua caliente (baño maría).',
      'Hornea de 60 a 70 minutos, hasta que los bordes estén firmes y el centro tiemble como gelatina.',
      'Apaga el horno, entreabre la puerta y deja reposar 1 hora dentro.',
      'Enfría a temperatura ambiente y refrigera mínimo 6 horas antes de desmoldar.'
    ],
    tips: ['Todos los ingredientes deben estar a temperatura ambiente para evitar grumos.', 'Batir de más mete aire y provoca grietas.', 'Pasa un cuchillo caliente por el borde antes de abrir el aro.'],
    nota: NOTA_RECETA
  },
  {
    id: 'r-masa-madre', xp: 490, categoria: 'Panadería', tiempo: 10080, porciones: 0, dificultad: 'Avanzada',
    titulo: 'Cultivo de masa madre en 7 días',
    resumen: 'Cómo iniciar y alimentar tu propio fermento natural para hacer pan.',
    grupos: [{ g: 'Materiales', items: ['Harina integral (para el inicio)', 'Harina de fuerza (para alimentar)', 'Agua a unos 25 a 30 °C', 'Un frasco de vidrio limpio con tapa floja', 'Báscula'] }],
    pasos: [
      'Día 1: mezcla 50 g de harina integral con 50 g de agua tibia en el frasco. Tapa sin apretar y deja a 24 a 26 °C.',
      'Día 2: observa; puede haber pocas burbujas. Mezcla y deja reposar.',
      'Días 3 a 7: cada 24 horas retira todo menos 50 g de cultivo, y agrega 50 g de harina de fuerza y 50 g de agua. Mezcla bien. Si hace calor, alimenta cada 12 horas.',
      'Marca el nivel con una liga: debe crecer y llenarse de burbujas.',
      'Está listo cuando dobla su volumen en 4 a 8 horas después de alimentarlo, huele agradablemente ácido y tiene burbujas por toda la masa.',
      'Para usarlo: úsalo en su punto máximo, cuando esté bien burbujeante y redondeado.',
      'Conservación: guárdalo en el refrigerador y aliméntalo una vez por semana; sácalo y aliméntalo 1 o 2 veces antes de hornear.'
    ],
    tips: ['Un líquido gris encima (hooch) significa que tiene hambre: mézclalo o retíralo y alimenta.', 'Si aparecen moho (puntos de color rosa, naranja o pelusa), tira todo el cultivo y empieza de nuevo; no lo rasques.', 'Usa agua sin cloro fuerte; deja reposar el agua de la llave unos minutos si huele a cloro.'],
    nota: NOTA_RECETA
  }
];

export function catalogoPublico() {
  const sinCuerpo = (x) => {
    const { contenido, grupos, pasos, tips, nota, ...resto } = x;
    return resto;
  };
  return { guias: GUIAS.map(sinCuerpo), recetas: RECETAS.map(sinCuerpo) };
}

export function buscarItem(id) {
  return GUIAS.find(x => x.id === id) || RECETAS.find(x => x.id === id) || null;
}
