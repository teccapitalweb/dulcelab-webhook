// ═══════════════════════════════════════════════════════════════════
// services/encuesta.js · encuesta adaptativa de segmentación de clientes
//
// Modal en dulcelabfood.com: pregunta qué tipo de visitante es
// (estudiante / profesional / emprendedor / aficionado) y ramifica a
// 3 preguntas más según esa respuesta, más 2 preguntas finales comunes
// a todos (intereses de membresía + tiempo disponible). Algunas
// preguntas son de opción múltiple (el valor guardado es un arreglo).
// Las respuestas se guardan aquí (Firestore, vía Admin SDK) para que
// el admin vea agregados en gráficas y sepa qué ofrecerle a cada
// segmento.
// ═══════════════════════════════════════════════════════════════════

import admin from 'firebase-admin';

const TIPOS_VALIDOS = ['estudiante', 'profesional', 'emprendedor', 'aficionado'];

function db() {
  return admin.firestore();
}

function valorValido(valor) {
  if (typeof valor === 'string') return valor.length > 0 && valor.length <= 60;
  if (Array.isArray(valor)) {
    return valor.length > 0 && valor.length <= 15 &&
      valor.every(v => typeof v === 'string' && v.length > 0 && v.length <= 60);
  }
  return false;
}

// Valida la forma del body antes de guardar: no de más (campos extra se
// ignoran) ni de menos (tipo/respuestas obligatorios), y cada respuesta es
// un string corto o un arreglo corto de strings (preguntas de opción
// múltiple) — nunca objetos anidados ni textos libres gigantes.
function validarRespuesta(body) {
  const { tipo, respuestas } = body || {};
  if (!TIPOS_VALIDOS.includes(tipo)) return 'tipo inválido';
  if (!respuestas || typeof respuestas !== 'object' || Array.isArray(respuestas)) {
    return 'respuestas inválidas';
  }
  const entradas = Object.entries(respuestas);
  if (entradas.length === 0 || entradas.length > 12) return 'respuestas inválidas';
  for (const [preguntaId, valor] of entradas) {
    if (typeof preguntaId !== 'string' || preguntaId.length > 60) return 'respuestas inválidas';
    if (!valorValido(valor)) return 'respuestas inválidas';
  }
  return null;
}

export async function guardarRespuesta(body) {
  const error = validarRespuesta(body);
  if (error) return { error };

  const doc = {
    tipo: body.tipo,
    respuestas: body.respuestas,
    creadoEn: admin.firestore.FieldValue.serverTimestamp()
  };
  const ref = await db().collection('encuesta_clientes').add(doc);
  return { id: ref.id };
}

// Trae todas las respuestas (sin paginar: para el volumen de una encuesta
// de landing esto es más simple que armar agregados en el servidor, y el
// admin los agrega en el navegador para las gráficas).
export async function obtenerRespuestas() {
  const snap = await db().collection('encuesta_clientes')
    .orderBy('creadoEn', 'desc')
    .limit(5000)
    .get();
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      tipo: data.tipo,
      respuestas: data.respuestas || {},
      creadoEn: data.creadoEn ? data.creadoEn.toDate().toISOString() : null
    };
  });
}

// Borra TODAS las respuestas (para limpiar datos de prueba). Lotes de 400
// porque Firestore limita a 500 operaciones por batch.
export async function borrarTodasLasRespuestas() {
  let borradas = 0;
  for (;;) {
    const snap = await db().collection('encuesta_clientes').limit(400).get();
    if (snap.empty) break;
    const batch = db().batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    borradas += snap.size;
  }
  return borradas;
}
