// ═══════════════════════════════════════════════════════════════════
// routes/biblioteca.js · Guías y Recetas de "PDFs y material"
//
//   GET /api/biblioteca/catalogo   → lista pública (título, descripción, XP). Sin el cuerpo.
//   POST /api/biblioteca/desbloquear/:id → GASTA los XP del premio (una sola vez por material).
//                                     Pide membresía activa y saldo suficiente. Queda guardado
//                                     en progreso/{uid}.desbloqueados y ya no se vuelve a cobrar.
//   GET /api/biblioteca/item/:id   → el cuerpo completo, solo si la persona tiene membresía activa
//                                     y ya desbloqueó ese material. Un admin abre todo para revisar.
//
// Saldo = xp (todo lo ganado, nunca baja) − xpGastado (lo que ya pagó por materiales).
// El nivel de Retos usa el xp total; el saldo es lo que se puede gastar.
//
// Así el contenido de pago no viaja en el HTML ni en un JS público: se entrega aquí,
// y la regla (membresía + XP) se verifica en el servidor, no en el navegador.
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { db, FieldValue } from '../config/firebase.js';
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

// Reglas de acceso, separadas para poder probarlas sin Firebase.
export function saldoDe(d) {
  const xp = Number.isFinite(Number(d && d.xp)) ? Number(d.xp) : 0;
  const gastado = Number.isFinite(Number(d && d.xpGastado)) ? Number(d.xpGastado) : 0;
  return Math.max(0, xp - gastado);
}

export function yaDesbloqueado(d, id) {
  return !!(d && d.desbloqueados && d.desbloqueados[id]);
}

// Lectura: membresía activa + material ya desbloqueado.
export function evaluarAcceso({ esAdmin, activa, desbloqueado }) {
  if (esAdmin) return { ok: true };
  if (!activa) return { ok: false, error: 'membresia-requerida' };
  if (!desbloqueado) return { ok: false, error: 'sin-desbloquear' };
  return { ok: true };
}

router.get('/catalogo', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json(catalogoPublico());
});

async function contexto(req) {
  const decoded = await verificarToken(req);
  if (!decoded) return { error: { status: 401, body: { error: 'sesion-requerida' } } };
  const esAdmin = ADMIN_EMAILS.includes((decoded.email || '').toLowerCase());
  return { decoded, esAdmin };
}

router.get('/item/:id', async (req, res) => {
  try {
    const item = buscarItem(String(req.params.id || ''));
    if (!item) return res.status(404).json({ error: 'no-encontrado' });
    const ctx = await contexto(req);
    if (ctx.error) return res.status(ctx.error.status).json(ctx.error.body);
    const { decoded, esAdmin } = ctx;

    let activa = false, desbloqueado = false;
    if (!esAdmin) {
      const m = await getMembership(decoded.uid);
      activa = !!m.activa;
      if (activa) {
        const snap = await db.collection('progreso').doc(decoded.uid).get();
        desbloqueado = snap.exists && yaDesbloqueado(snap.data(), item.id);
      }
    }
    const acceso = evaluarAcceso({ esAdmin, activa, desbloqueado });
    if (!acceso.ok) return res.status(403).json({ error: acceso.error, precio: Number(item.xp) || 0 });
    res.set('Cache-Control', 'no-store');
    return res.json(item);
  } catch (err) {
    console.error('❌ /api/biblioteca/item error:', err.message);
    res.status(500).json({ error: 'No se pudo abrir el contenido' });
  }
});

router.post('/desbloquear/:id', async (req, res) => {
  try {
    const item = buscarItem(String(req.params.id || ''));
    if (!item) return res.status(404).json({ error: 'no-encontrado' });
    const ctx = await contexto(req);
    if (ctx.error) return res.status(ctx.error.status).json(ctx.error.body);
    const { decoded, esAdmin } = ctx;

    if (!esAdmin) {
      const m = await getMembership(decoded.uid);
      if (!m.activa) return res.status(403).json({ error: 'membresia-requerida' });
    }
    const precio = Number(item.xp) || 0;
    const ref = db.collection('progreso').doc(decoded.uid);
    const r = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : {};
      if (yaDesbloqueado(d, item.id) || esAdmin) {
        return { ok: true, ya: true, saldo: saldoDe(d), xp: Number(d.xp) || 0, xpGastado: Number(d.xpGastado) || 0 };
      }
      const saldo = saldoDe(d);
      if (saldo < precio) return { ok: false, faltan: precio - saldo, saldo };
      const xpGastado = (Number(d.xpGastado) || 0) + precio;
      tx.set(ref, { xpGastado, desbloqueados: { [item.id]: { xp: precio, fecha: FieldValue.serverTimestamp() } } }, { merge: true });
      return { ok: true, ya: false, saldo: saldo - precio, xp: Number(d.xp) || 0, xpGastado };
    });
    res.set('Cache-Control', 'no-store');
    if (!r.ok) return res.status(403).json({ error: 'xp-insuficiente', faltan: r.faltan, saldo: r.saldo });
    return res.json({ ok: true, ya: r.ya, gastado: r.ya ? 0 : precio, saldo: r.saldo, xp: r.xp, xpGastado: r.xpGastado });
  } catch (err) {
    console.error('❌ /api/biblioteca/desbloquear error:', err.message);
    res.status(500).json({ error: 'No se pudo desbloquear' });
  }
});

export default router;
