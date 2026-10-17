// ═══════════════════════════════════════════════════════════════════
// routes/correos.js
//   GET /api/correos/baja?u=&t=   → enlace de «Darme de baja» de los correos de recordatorio
//   GET /api/correos/oferta       → (con sesión) descuento vigente de la persona, para mostrarlo en el panel
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { darDeBaja, tokenValido, ofertaVigente, resumenSecuencia, enviarPruebas, darOfertaDePrueba } from '../services/secuencia-correos.js';

const ADMIN_EMAILS = ['teccapitalweb@gmail.com'];
async function adminDe(req) {
  const h = req.headers.authorization || '';
  const tk = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!tk) return null;
  try { const d = await admin.auth().verifyIdToken(tk); return ADMIN_EMAILS.includes((d.email || '').toLowerCase()) ? d : null; } catch { return null; }
}

const router = express.Router();

const pagina = (titulo, texto) => `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;background:#fbeff2;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#3B2420;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px">
<div style="max-width:440px;background:#fff;border:1px solid #f0d9de;border-radius:20px;padding:34px 30px;text-align:center">
<div style="font-size:24px;font-weight:800;color:#6b1526;margin-bottom:14px">DulceLab Food</div>
<h1 style="font-size:20px;margin:0 0 10px">${titulo}</h1><p style="margin:0;font-size:15px;line-height:1.6;color:#6B5147">${texto}</p></div></body></html>`;

router.get('/baja', async (req, res) => {
  try {
    const uid = String(req.query.u || '');
    if (!uid || !tokenValido(uid, req.query.t)) {
      return res.status(400).type('html').send(pagina('Enlace no válido', 'Este enlace de baja no es válido o ya expiró. Si necesitas ayuda, escríbenos.'));
    }
    await darDeBaja(uid);
    return res.type('html').send(pagina('Listo, ya no te enviaremos más', 'Te diste de baja de estos recordatorios. Tu cuenta sigue activa y puedes entrar al club cuando quieras.'));
  } catch (err) {
    console.error('❌ /api/correos/baja error:', err.message);
    return res.status(500).type('html').send(pagina('No pudimos procesarlo', 'Inténtalo de nuevo en un momento.'));
  }
});

router.get('/oferta', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'sesion-requerida' });
    let uid;
    try { uid = (await admin.auth().verifyIdToken(token)).uid; } catch { return res.status(401).json({ error: 'sesion-requerida' }); }
    res.set('Cache-Control', 'no-store');
    return res.json({ oferta: await ofertaVigente(uid) });
  } catch (err) {
    console.error('❌ /api/correos/oferta error:', err.message);
    return res.status(500).json({ error: 'No se pudo consultar' });
  }
});

router.get('/resumen', async (req, res) => {
  try {
    if (!(await adminDe(req))) return res.status(403).json({ error: 'Solo un admin' });
    res.set('Cache-Control', 'no-store');
    return res.json(await resumenSecuencia());
  } catch (err) { console.error('❌ /api/correos/resumen error:', err.message); return res.status(500).json({ error: 'No se pudo calcular' }); }
});

router.post('/oferta-prueba', express.json(), async (req, res) => {
  try {
    if (!(await adminDe(req))) return res.status(403).json({ error: 'Solo un admin' });
    const monto = Number(req.body && req.body.monto);
    if (![0, 50, 100].includes(monto)) return res.status(400).json({ error: 'monto-invalido' });
    const r = await darOfertaDePrueba(req.body && req.body.email, monto);
    if (r.error) return res.status(r.error === 'cuenta-no-encontrada' ? 404 : 409).json(r);
    return res.json(r);
  } catch (err) { console.error('❌ /api/correos/oferta-prueba error:', err.message); return res.status(500).json({ error: 'No se pudo dar la oferta' }); }
});

router.post('/prueba', async (req, res) => {
  try {
    const d = await adminDe(req);
    if (!d) return res.status(403).json({ error: 'Solo un admin' });
    return res.json({ enviadosA: d.email, resultados: await enviarPruebas(d.email) });
  } catch (err) { console.error('❌ /api/correos/prueba error:', err.message); return res.status(500).json({ error: 'No se pudieron enviar' }); }
});

export default router;
