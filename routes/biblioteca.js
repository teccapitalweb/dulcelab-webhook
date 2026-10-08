// ═══════════════════════════════════════════════════════════════════
// routes/biblioteca.js · Guías y Recetas de "PDFs y material"
//
//   GET /api/biblioteca/catalogo   → lista pública (título, descripción, XP). Sin el cuerpo.
//   GET /api/biblioteca/item/:id   → el cuerpo completo, solo si la persona
//                                     (a) tiene membresía activa y (b) ya juntó los XP
//                                     de ese premio. Un admin puede abrir todo para revisar.
//
// Así el contenido de pago no viaja en el HTML ni en un JS público: se entrega aquí,
// y la regla (membresía + XP) se verifica en el servidor, no en el navegador.
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { db } from '../config/firebase.js';
import { getMembership } from '../services/firestore.js';
import { catalogoPublico, buscarItem } from '../data/biblioteca.js';

const router = express.Router();
const ADMIN_EMAILS = ['teccapitalweb@gmail.com'];

async function verificarToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try { return await admin.auth().verifyIdToken(token); } catch { return null; }
}

// Regla de acceso, separada para poder probarla sin Firebase.
export function evaluarAcceso({ item, esAdmin, activa, xp }) {
  if (esAdmin) return { ok: true };
  if (!activa) return { ok: false, error: 'membresia-requerida' };
  const necesarios = Number(item.xp) || 0;
  const tiene = Number.isFinite(Number(xp)) ? Number(xp) : 0;
  if (tiene < necesarios) return { ok: false, error: 'xp-insuficiente', faltan: necesarios - tiene };
  return { ok: true };
}

router.get('/catalogo', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(catalogoPublico());
});

router.get('/item/:id', async (req, res) => {
  try {
    const item = buscarItem(String(req.params.id || ''));
    if (!item) return res.status(404).json({ error: 'no-encontrado' });

    const decoded = await verificarToken(req);
    if (!decoded) return res.status(401).json({ error: 'sesion-requerida' });
    const esAdmin = ADMIN_EMAILS.includes((decoded.email || '').toLowerCase());

    let activa = false, xp = 0;
    if (!esAdmin) {
      const m = await getMembership(decoded.uid);
      activa = !!m.activa;
      if (activa) {
        const snap = await db.collection('progreso').doc(decoded.uid).get();
        xp = snap.exists ? Number(snap.data().xp) || 0 : 0;
      }
    }

    const acceso = evaluarAcceso({ item, esAdmin, activa, xp });
    if (!acceso.ok) {
      return res.status(403).json({ error: acceso.error, faltan: acceso.faltan ?? null });
    }
    res.set('Cache-Control', 'no-store');
    return res.json(item);
  } catch (err) {
    console.error('❌ /api/biblioteca/item error:', err.message);
    res.status(500).json({ error: 'No se pudo abrir el contenido' });
  }
});

export default router;
