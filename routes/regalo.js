// ═══════════════════════════════════════════════════════════════════
// routes/regalo.js · regalo de bienvenida: 150 XP una sola vez por persona
//
// Las reglas de Firestore solo dejan subir el XP de a 50 por escritura desde
// el navegador, así que el regalo se otorga aquí (el servidor no pasa por esas
// reglas) y con una transacción para que no se pueda cobrar dos veces.
// Los XP sirven igual que los de los retos: desbloquean los libros de la biblioteca.
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { db, FieldValue } from '../config/firebase.js';
import { getMembership } from '../services/firestore.js';

const router = express.Router();

export const REGALO_BIENVENIDA_XP = 150;

async function verificarToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try { return await admin.auth().verifyIdToken(token); } catch { return null; }
}

// POST /api/regalo-bienvenida · (con sesión) → { nuevo: boolean, xp: number, regalo: number }
// nuevo = true solo la primera vez; las siguientes responde nuevo:false sin tocar nada.
router.post('/', async (req, res) => {
  try {
    const decoded = await verificarToken(req);
    if (!decoded) return res.status(401).json({ error: 'Falta iniciar sesión' });

    const ref = db.collection('progreso').doc(decoded.uid);
    const resultado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : {};
      const xpActual = Number.isFinite(Number(d.xp)) ? Number(d.xp) : 0;
      if (d.regaloBienvenida) return { nuevo: false, xp: xpActual, regalo: REGALO_BIENVENIDA_XP };

      const xp = xpActual + REGALO_BIENVENIDA_XP;
      tx.set(ref, {
        xp,
        racha: Number.isFinite(Number(d.racha)) ? Number(d.racha) : 0,
        ultimaActividad: d.ultimaActividad ?? null,
        retosCompletados: Array.isArray(d.retosCompletados) ? d.retosCompletados : [],
        logrosDesbloqueados: Array.isArray(d.logrosDesbloqueados) ? d.logrosDesbloqueados : [],
        regaloBienvenida: { xp: REGALO_BIENVENIDA_XP, fecha: FieldValue.serverTimestamp() }
      }, { merge: true });
      return { nuevo: true, xp, regalo: REGALO_BIENVENIDA_XP };
    });

    res.set('Cache-Control', 'no-store');
    return res.json(resultado);
  } catch (err) {
    console.error('❌ /api/regalo-bienvenida error:', err.message);
    res.status(500).json({ error: 'No se pudo aplicar el regalo' });
  }
});

// ───────────────────────────────────────────────────────────────
// Regalo por terminar un curso: XP_CURSO_COMPLETADO una sola vez por curso y por persona.
// El servidor comprueba que de verdad terminó todas las clases del curso (progreso/{uid}.clases)
// y que tiene membresía activa; luego suma los XP en una transacción.
// ───────────────────────────────────────────────────────────────
export const XP_CURSO_COMPLETADO = 300;

// POST /api/regalo-bienvenida/curso · { cursoId } → { nuevo, xp, regalo } | 409 curso-incompleto | 403 membresia-requerida
router.post('/curso', async (req, res) => {
  try {
    const decoded = await verificarToken(req);
    if (!decoded) return res.status(401).json({ error: 'Falta iniciar sesión' });
    const cursoId = String(req.body?.cursoId || '').slice(0, 160);
    if (!cursoId) return res.status(400).json({ error: 'Falta cursoId' });

    const m = await getMembership(decoded.uid);
    if (!m.activa) return res.status(403).json({ error: 'membresia-requerida' });

    const cursoDoc = await db.collection('cursos').doc(cursoId).get();
    if (!cursoDoc.exists) return res.status(404).json({ error: 'curso-no-encontrado' });
    const sesiones = Array.isArray(cursoDoc.data().sesiones) ? cursoDoc.data().sesiones : [];
    if (!sesiones.length) return res.status(400).json({ error: 'curso-sin-clases' });

    const ref = db.collection('progreso').doc(decoded.uid);
    const r = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : {};
      const xpActual = Number.isFinite(Number(d.xp)) ? Number(d.xp) : 0;
      if (d.cursosPremiados && d.cursosPremiados[cursoId]) return { nuevo: false, xp: xpActual, regalo: XP_CURSO_COMPLETADO };

      const vistas = (((d.clases || {})[cursoId] || {}).clasesVistas) || [];
      const completo = sesiones.every((s, i) => vistas.includes((s && s.numero) || (i + 1)));
      if (!completo) return { incompleto: true };

      const xp = xpActual + XP_CURSO_COMPLETADO;
      tx.set(ref, { xp, cursosPremiados: { [cursoId]: { xp: XP_CURSO_COMPLETADO, fecha: FieldValue.serverTimestamp() } } }, { merge: true });
      return { nuevo: true, xp, regalo: XP_CURSO_COMPLETADO };
    });

    if (r.incompleto) return res.status(409).json({ error: 'curso-incompleto' });
    res.set('Cache-Control', 'no-store');
    return res.json(r);
  } catch (err) {
    console.error('❌ /api/regalo-bienvenida/curso error:', err.message);
    res.status(500).json({ error: 'No se pudo aplicar el regalo' });
  }
});

export default router;
