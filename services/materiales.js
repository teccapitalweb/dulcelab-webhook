// ═══════════════════════════════════════════════════════════════════
// services/materiales.js · entrega protegida de la URL real de un material
//
// La URL real (Drive/PDF/etc.) de cada material vive en la subcolección
// cursos/{cursoId}/materiales_privados/{idx}, NO en cursos/{cursoId}.materiales[]
// (ese documento sí lo lee completo el panel vía Firestore client SDK, así
// que cualquier campo que viva ahí se manda al navegador sin importar el
// candado visual). Esta es la única puerta que entrega la URL real, y solo
// después de repetir aquí — en el servidor — la misma regla de acceso que
// ya usa el panel (gratis, membresía activa, desbloqueo por días o por
// clase vista).
//
// IMPORTANTE: esto solo protege de verdad si las reglas de Firestore
// también niegan la lectura directa de materiales_privados desde el
// cliente (el Admin SDK que usa este archivo ignora las reglas siempre,
// pero un atacante podría intentar leer esa subcolección directo con el
// mismo apiKey público de la app). Ver README.md para la regla exacta.
// ═══════════════════════════════════════════════════════════════════

import { db } from '../config/firebase.js';

// Igual que _inferirTipoMaterial() en vip-panel.html — se usa una sola vez al
// migrar, para que el material público guarde su tipo sin necesitar la URL.
export function inferirTipo(url) {
  const u = (url || '').toLowerCase();
  if (u.endsWith('.xlsx') || u.endsWith('.xls') || u.includes('sheets.google')) return 'excel';
  if (u.endsWith('.pdf')) return 'pdf';
  if (u.endsWith('.pptx') || u.endsWith('.ppt') || u.includes('presentation')) return 'ppt';
  if (u.endsWith('.docx') || u.endsWith('.doc') || u.includes('document')) return 'doc';
  return 'pdf';
}

async function tieneMembresiaActiva(uid) {
  const doc = await db.collection('miembros').doc(uid).get();
  if (!doc.exists) return { activa: false, fechaAlta: null };
  const m = doc.data();
  let activa = !!m.activa;
  const expira = m.expiraEn?.toDate?.();
  if (activa && expira && expira.getTime() < Date.now()) activa = false;
  return { activa, fechaAlta: m.fechaAlta?.toDate?.() || null };
}

/**
 * Decide si { uid, esAdmin } tiene derecho a ver el material materialIndex
 * del curso cursoId, y si sí, regresa su URL real (leída de la subcolección
 * protegida). Replica la misma lógica que _materialDisponible() en
 * vip-panel.html, pero corriendo en el servidor con el Admin SDK.
 */
export async function obtenerUrlMaterial({ cursoId, materialIndex, uid, esAdmin }) {
  const cursoDoc = await db.collection('cursos').doc(cursoId).get();
  if (!cursoDoc.exists) return { error: 'curso-no-encontrado' };
  const curso = cursoDoc.data() || {};
  const materiales = Array.isArray(curso.materiales) ? curso.materiales : [];
  const meta = materiales[materialIndex];
  if (!meta) return { error: 'material-no-encontrado' };

  const leerUrlReal = async () => {
    const privDoc = await db.collection('cursos').doc(cursoId)
      .collection('materiales_privados').doc(String(materialIndex)).get();
    return privDoc.exists ? (privDoc.data().url || null) : (meta.url || null); // fallback: aún no migrado
  };

  if (esAdmin) {
    const url = await leerUrlReal();
    return url ? { url } : { error: 'material-sin-url' };
  }

  const { activa: esVip, fechaAlta } = uid ? await tieneMembresiaActiva(uid) : { activa: false, fechaAlta: null };

  if (!esVip) {
    // La prueba no es un curso fijo: cada cuenta puede elegir uno. Del curso
    // elegido se entregan todas sus presentaciones menos la última, igual que
    // las clases de prueba. La elección se guarda en progreso/{uid}.
    const progreso = uid ? await db.collection('progreso').doc(uid).get() : null;
    const cursoPrueba = progreso?.exists ? progreso.data().cursoPrueba : null;
    const materialesGratis = Math.max(0, materiales.length - 1);
    const esGratis = cursoPrueba === cursoId && materialIndex >= 0 && materialIndex < materialesGratis;
    if (!esGratis) return { error: 'membresia-requerida' };
    const url = await leerUrlReal();
    return url ? { url } : { error: 'material-sin-url' };
  }

  if (meta.disponibleSiempre === true) {
    const url = await leerUrlReal();
    return url ? { url } : { error: 'material-sin-url' };
  }

  // Ligado a una clase: manda sobre curso.disponibleSiempre ("modo prueba")
  // — ese interruptor solo bypasea la espera por días, no el avance por
  // clase (si no, un curso en modo prueba destrabaría todos los materiales
  // de golpe aunque tengan clase asignada).
  if (typeof meta.desbloqueaConClase === 'number') {
    const idx = meta.desbloqueaConClase - 1;
    let desbloqueada = idx <= 0; // la primera clase de un curso VIP siempre está abierta
    if (!desbloqueada) {
      const sesiones = Array.isArray(curso.sesiones) ? curso.sesiones : [];
      const anterior = sesiones[idx - 1];
      const anteriorNum = anterior?.numero || idx;
      const progDoc = await db.collection('progreso').doc(uid).get();
      const prog = progDoc.exists ? (progDoc.data()[cursoId] || {}) : {};
      const vistas = Array.isArray(prog.clasesVistas) ? prog.clasesVistas : [];
      desbloqueada = vistas.includes(anteriorNum);
    }
    if (!desbloqueada) return { error: 'clase-no-desbloqueada' };
    const url = await leerUrlReal();
    return url ? { url } : { error: 'material-sin-url' };
  }

  if (curso.disponibleSiempre === true) {
    const url = await leerUrlReal();
    return url ? { url } : { error: 'material-sin-url' };
  }

  // Respaldo: desbloqueo por días de membresía (igual que el cliente)
  const cursosSnap = await db.collection('cursos').orderBy('orden', 'asc').get();
  const ids = cursosSnap.docs.map(d => d.id);
  const cursoOrden = typeof curso.orden === 'number' ? curso.orden : ids.indexOf(cursoId);
  const diaDesbloqueo = (typeof meta.desbloquearEnDias === 'number') ? meta.desbloquearEnDias : (Math.max(0, cursoOrden) * 8);
  const dias = fechaAlta ? Math.max(0, Math.floor((Date.now() - fechaAlta.getTime()) / 86400000)) : 0;
  if (dias < diaDesbloqueo) return { error: 'aun-no-disponible' };

  const url = await leerUrlReal();
  return url ? { url } : { error: 'material-sin-url' };
}

/**
 * Guarda la URL real de un material en la subcolección protegida.
 * Usado por vip-admin.html al crear/editar un curso (en vez de escribir
 * la URL directo en cursos/{id}.materiales[], que el panel lee completo).
 */
export async function guardarUrlMaterial({ cursoId, materialIndex, url }) {
  await db.collection('cursos').doc(cursoId)
    .collection('materiales_privados').doc(String(materialIndex))
    .set({ url }, { merge: true });
}

/**
 * Al eliminar el material materialIndex del arreglo público (cursos/{id}.materiales[]),
 * todos los materiales que estaban después se recorren una posición hacia
 * atrás. Esta función hace lo mismo en la subcolección protegida (que está
 * indexada por posición), para que cada material siga apuntando a su URL
 * real y no a la del que ahora quedó en su lugar.
 */
export async function eliminarUrlMaterial({ cursoId, materialIndex }) {
  const colRef = db.collection('cursos').doc(cursoId).collection('materiales_privados');
  const snap = await colRef.get();
  if (snap.empty) return;
  const docs = {};
  let maxIdx = -1;
  snap.forEach(d => {
    const i = parseInt(d.id, 10);
    docs[i] = d.data();
    if (i > maxIdx) maxIdx = i;
  });
  const batch = db.batch();
  for (let i = materialIndex; i < maxIdx; i++) {
    if (docs[i + 1]) batch.set(colRef.doc(String(i)), docs[i + 1]);
    else batch.delete(colRef.doc(String(i)));
  }
  if (docs[maxIdx] !== undefined) batch.delete(colRef.doc(String(maxIdx)));
  await batch.commit();
}

/**
 * Migración de una sola vez: mueve cualquier url que siga viviendo en
 * cursos/{id}.materiales[].url a la subcolección protegida, y la borra
 * del documento público. Pensado para correrse una vez desde el admin
 * después de desplegar este cambio (los materiales creados antes de este
 * cambio guardaron su url ahí).
 */
export async function migrarMaterialesExistentes() {
  const snap = await db.collection('cursos').get();
  let migrados = 0;
  for (const doc of snap.docs) {
    const curso = doc.data() || {};
    const materiales = Array.isArray(curso.materiales) ? curso.materiales : [];
    if (!materiales.length) continue;

    const nuevosMateriales = [];
    let cambio = false;
    for (let i = 0; i < materiales.length; i++) {
      const m = materiales[i];
      if (m && m.url) {
        await guardarUrlMaterial({ cursoId: doc.id, materialIndex: i, url: m.url });
        const { url, ...sinUrl } = m;
        if (!sinUrl.tipo) sinUrl.tipo = inferirTipo(url);
        nuevosMateriales.push(sinUrl);
        cambio = true;
        migrados++;
      } else {
        nuevosMateriales.push(m);
      }
    }
    if (cambio) {
      await doc.ref.update({ materiales: nuevosMateriales });
    }
  }
  return migrados;
}
