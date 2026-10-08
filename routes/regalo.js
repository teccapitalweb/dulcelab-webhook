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

export default router;
