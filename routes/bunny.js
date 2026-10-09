// Reproductor protegido de Bunny Stream para BioNova.
// Solo firma videos pertenecientes al catálogo migrado; nunca acepta IDs arbitrarios.

import express from 'express';
import admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { db } from '../config/firebase.js';
import { env } from '../config/env.js';
import { getMembership } from '../services/firestore.js';

const router = express.Router();
const catalogo = JSON.parse(
  readFileSync(new URL('../data/dulcelab-bunny-catalog.json', import.meta.url), 'utf8')
);
const videosPermitidos = new Set(
  catalogo.flatMap(curso => (curso.sesiones || []).map(sesion => sesion.videoId)).filter(Boolean)
);
const correosAdmin = new Set([
  'teccapitalweb@gmail.com'
]);

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function puntajeTitulo(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = new Set(na.split(' ').filter(x => x.length > 2));
  const tb = new Set(nb.split(' ').filter(x => x.length > 2));
  const union = new Set([...ta, ...tb]);
  let inter = 0;
  tb.forEach(x => { if (ta.has(x)) inter++; });
  return union.size ? inter / union.size : 0;
}

let muestraCache = { videoId: null, vence: 0 };

async function obtenerVideoMuestra() {
  if (muestraCache.vence > Date.now()) return muestraCache.videoId;

  const snap = await db.collection('cursos').orderBy('orden', 'asc').get();
  let videoId = null;
  for (const doc of snap.docs) {
    const curso = doc.data() || {};
    if (curso.marcarProximamente === true) continue;
    const primera = Array.isArray(curso.sesiones) && curso.sesiones.length > 1 ? curso.sesiones[0] : null; // la última clase nunca es muestra
    if (!primera && !(curso.clases || []).length) continue;

    if (primera?.videoId && videosPermitidos.has(primera.videoId)) {
      videoId = primera.videoId;
      break;
    }

    let mejor = null;
    let score = 0;
    for (const item of catalogo) {
      const actual = puntajeTitulo(curso.titulo, item.titulo);
      if (actual > score) { score = actual; mejor = item; }
    }
    if (mejor && score >= 0.52) {
      videoId = (mejor.sesiones || []).length > 1 ? (mejor.sesiones[0]?.videoId || null) : null;
    }
    break;
  }

  muestraCache = { videoId, vence: Date.now() + 60_000 };
  return videoId;
}

async function verificarUsuario(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return await admin.auth().verifyIdToken(header.slice(7));
  } catch {
    return null;
  }
}

// ── Prueba gratuita ──
// Cada persona sin membresía elige UN curso (se guarda en progreso/{uid}.cursoPrueba y ya no cambia).
// De ese curso puede ver todas las clases MENOS la última, sin importar cuántas tenga. Esto se valida aquí,
// no en el navegador, para que la última clase no se pueda abrir sin membresía.
async function videoEsDePrueba(uid, videoId) {
  const prog = await db.collection('progreso').doc(uid).get();
  const cursoId = prog.exists ? prog.data().cursoPrueba : null;
  if (!cursoId) return false;
  const doc = await db.collection('cursos').doc(String(cursoId)).get();
  if (!doc.exists) return false;
  const ses = Array.isArray(doc.data().sesiones) ? doc.data().sesiones : [];
  const i = ses.findIndex(x => x && (x.videoId === videoId || x.url === videoId));
  return i >= 0 && i < ses.length - 1;
}

// POST /api/bunny/curso-prueba · { cursoId } → { cursoId }. La primera elección gana; las siguientes devuelven la guardada.
router.post('/curso-prueba', async (req, res) => {
  try {
    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Falta iniciar sesión' });
    const pedido = String(req.body?.cursoId || '').slice(0, 160);
    const ref = db.collection('progreso').doc(usuario.uid);
    const r = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : {};
      if (d.cursoPrueba) return { cursoId: d.cursoPrueba };
      if (!pedido) return { cursoId: null };
      const curso = await tx.get(db.collection('cursos').doc(pedido));
      const c = curso.exists ? curso.data() : null;
      if (!c || c.marcarProximamente === true || c.pruebaGratis === false || !(Array.isArray(c.sesiones) && c.sesiones.length)) {
        return { error: 'curso-no-disponible' };
      }
      tx.set(ref, { cursoPrueba: pedido }, { merge: true });
      return { cursoId: pedido };
    });
    if (r.error) return res.status(400).json({ error: r.error });
    res.set('Cache-Control', 'no-store');
    return res.json(r);
  } catch (error) {
    console.error('[Bunny curso-prueba]', error);
    return res.status(500).json({ error: 'No se pudo guardar el curso de prueba' });
  }
});

router.post('/embed-token', async (req, res) => {
  try {
    if (!env.bunnyTokenAuthKey) {
      return res.status(503).json({ error: 'Bunny Stream no está configurado en Railway' });
    }

    const videoId = String(req.body?.videoId || '').trim();
    if (!videosPermitidos.has(videoId)) {
      return res.status(404).json({ error: 'Video no encontrado en el catálogo de DulceLab Food' });
    }

    const usuario = await verificarUsuario(req);
    // La muestra abierta (primera clase del primer curso) es solo para visitantes sin cuenta.
    const muestraId = usuario ? null : await obtenerVideoMuestra();
    const esMuestra = videoId === muestraId;
    const esAdmin = Boolean(usuario && (
      usuario.admin === true || correosAdmin.has(String(usuario.email || '').toLowerCase())
    ));
    let tieneAcceso = esAdmin;
    if (usuario && !tieneAcceso) {
      const membresia = await getMembership(usuario.uid);
      tieneAcceso = membresia.activa === true || membresia.activo === true;
    }

    let esPrueba = false;
    if (usuario && !tieneAcceso) esPrueba = await videoEsDePrueba(usuario.uid, videoId);

    if (!esMuestra && !tieneAcceso && !esPrueba) {
      return res.status(403).json({ error: 'Membresía requerida' });
    }

    const expires = Math.floor(Date.now() / 1000) + env.bunnyTokenTtlSeconds;
    const token = createHash('sha256')
      .update(env.bunnyTokenAuthKey + videoId + expires)
      .digest('hex');
    const embedUrl = `https://iframe.mediadelivery.net/embed/${env.bunnyStreamLibraryId}/${videoId}?token=${token}&expires=${expires}`;

    res.set('Cache-Control', 'no-store');
    return res.json({ embedUrl, expires, esMuestra: esMuestra || esPrueba });
  } catch (error) {
    console.error('[Bunny embed-token]', error);
    return res.status(500).json({ error: 'No se pudo autorizar el reproductor' });
  }
});

export default router;
