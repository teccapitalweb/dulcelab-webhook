// ═══════════════════════════════════════════════════════════════════
// routes/metricas.js
//   POST /api/metricas/evento   → (público, sin datos personales) registra una visita o un paso del embudo
//   GET  /api/metricas/resumen  → (solo admin) visitas, embudo de la membresía y desde qué medio llegan
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { registrarEvento, resumen, esBot } from '../services/metricas.js';

const router = express.Router();
const ADMIN_EMAILS = ['teccapitalweb@gmail.com'];

async function esAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return false;
  try {
    const d = await admin.auth().verifyIdToken(token);
    return ADMIN_EMAILS.includes((d.email || '').toLowerCase());
  } catch { return false; }
}

// Freno sencillo por visitante: máx. 60 eventos cada 10 minutos (evita que alguien infle los números).
const cuenta = new Map();
function permitido(vid) {
  const ahora = Date.now();
  const r = cuenta.get(vid);
  if (!r || ahora - r.t > 600000) { cuenta.set(vid, { t: ahora, n: 1 }); return true; }
  r.n += 1;
  if (cuenta.size > 20000) cuenta.clear();
  return r.n <= 60;
}

// sendBeacon manda text/plain (evita preflight de CORS), así que se acepta como JSON también.
router.post('/evento', express.json({ type: ['application/json', 'text/plain'], limit: '4kb' }), async (req, res) => {
  try {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const ua = req.get('user-agent') || '';
    if (esBot(ua)) return res.status(204).end();
    if (!permitido(String(b.vid || ''))) return res.status(204).end();
    const r = await registrarEvento({ vid: b.vid, tipo: b.tipo, pagina: b.pagina, origen: b.origen, ua });
    return res.status(r.ok ? 204 : 400).end();
  } catch (err) {
    console.error('❌ /api/metricas/evento error:', err.message);
    return res.status(204).end(); // nunca estorbar al visitante
  }
});

router.get('/resumen', async (req, res) => {
  try {
    if (!(await esAdmin(req))) return res.status(403).json({ error: 'Solo un admin puede ver las métricas' });
    const data = await resumen(req.query.dias);
    res.set('Cache-Control', 'no-store');
    res.json(data);
  } catch (err) {
    console.error('❌ /api/metricas/resumen error:', err.message);
    res.status(500).json({ error: 'No se pudieron calcular las métricas' });
  }
});

export default router;
