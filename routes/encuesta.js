// ═══════════════════════════════════════════════════════════════════
// routes/encuesta.js · guarda y lee las respuestas de la encuesta de
// segmentación de clientes (modal en dulcelabfood.com).
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { guardarRespuesta, obtenerRespuestas, borrarTodasLasRespuestas } from '../services/encuesta.js';

const router = express.Router();

const ADMIN_EMAILS = ['teccapitalweb@gmail.com'];

async function verificarAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return false;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return ADMIN_EMAILS.includes((decoded.email || '').toLowerCase());
  } catch {
    return false;
  }
}

// POST /api/encuesta/responder · pública (sin login, la contesta cualquier
// visitante del landing) → { tipo, respuestas: {preguntaId: valor} }
router.post('/responder', express.json(), async (req, res) => {
  try {
    const resultado = await guardarRespuesta(req.body);
    if (resultado.error) return res.status(400).json({ error: resultado.error });
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ /api/encuesta/responder error:', err.message);
    res.status(500).json({ error: 'No se pudo guardar la respuesta' });
  }
});

// GET /api/encuesta/resultados · solo admin
router.get('/resultados', async (req, res) => {
  try {
    const esAdmin = await verificarAdmin(req);
    if (!esAdmin) return res.status(403).json({ error: 'Solo un admin puede ver los resultados' });
    const respuestas = await obtenerRespuestas();
    res.set('Cache-Control', 'no-store');
    res.json({ respuestas });
  } catch (err) {
    console.error('❌ /api/encuesta/resultados error:', err.message);
    res.status(500).json({ error: 'No se pudieron obtener los resultados' });
  }
});

// POST /api/encuesta/borrar-todas · solo admin · borra todas las respuestas
// (limpiar pruebas). El panel pide confirmación antes de llamarlo.
router.post('/borrar-todas', express.json(), async (req, res) => {
  try {
    const esAdmin = await verificarAdmin(req);
    if (!esAdmin) return res.status(403).json({ error: 'Solo un admin puede borrar las respuestas' });
    const borradas = await borrarTodasLasRespuestas();
    res.json({ ok: true, borradas });
  } catch (err) {
    console.error('❌ /api/encuesta/borrar-todas error:', err.message);
    res.status(500).json({ error: 'No se pudieron borrar las respuestas' });
  }
});

export default router;
