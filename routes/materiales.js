// ═══════════════════════════════════════════════════════════════════
// routes/materiales.js · entrega protegida de URLs de materiales (PDF/Drive/etc.)
//
// Antes, la URL real de cada material vivía en cursos/{id}.materiales[],
// que el panel lee completo por Firestore directo — cualquiera podía verla
// en el Network tab sin importar si tenía membresía. Ahora vive en una
// subcolección aparte (materiales_privados) y solo se entrega aquí, tras
// repetir la misma regla de acceso que ya usa el panel.
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { obtenerUrlMaterial, guardarUrlMaterial, eliminarUrlMaterial, migrarMaterialesExistentes, inferirTipo } from '../services/materiales.js';

const router = express.Router();

// Mismo admin allowlist que routes/admin.js y routes/stripe.js
const ADMIN_EMAILS = ['teccapitalweb@gmail.com'];

async function verificarToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try { return await admin.auth().verifyIdToken(token); } catch { return null; }
}

// POST /api/materiales/url · { cursoId, materialIndex } → { url } si tiene derecho
// El token es OPCIONAL: sin token (invitado) solo puede recibir el material
// marcado como muestra gratuita; con token se revisa membresía/clase/días.
router.post('/url', express.json(), async (req, res) => {
  try {
    const { cursoId, materialIndex } = req.body || {};
    if (!cursoId || typeof materialIndex !== 'number') {
      return res.status(400).json({ error: 'Falta cursoId o materialIndex' });
    }
    const decoded = await verificarToken(req);
    const uid = decoded?.uid || null;
    const esAdmin = Boolean(decoded && ADMIN_EMAILS.includes((decoded.email || '').toLowerCase()));

    const resultado = await obtenerUrlMaterial({ cursoId, materialIndex, uid, esAdmin });
    if (resultado.error) {
      const status = resultado.error === 'curso-no-encontrado' || resultado.error === 'material-no-encontrado'
        ? 404 : 403;
      return res.status(status).json({ error: resultado.error });
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ url: resultado.url });
  } catch (err) {
    console.error('❌ /api/materiales/url error:', err.message);
    res.status(500).json({ error: 'No se pudo obtener el material' });
  }
});

// POST /api/materiales/guardar · (solo admin) { cursoId, materialIndex, url } → { ok, tipo }
// Llamado por vip-admin.html al crear/editar un material, en vez de escribir
// la url directo en cursos/{id}.materiales[].
router.post('/guardar', express.json(), async (req, res) => {
  try {
    const decoded = await verificarToken(req);
    const esAdmin = Boolean(decoded && ADMIN_EMAILS.includes((decoded.email || '').toLowerCase()));
    if (!esAdmin) return res.status(403).json({ error: 'Solo un admin puede guardar materiales' });

    const { cursoId, materialIndex, url } = req.body || {};
    if (!cursoId || typeof materialIndex !== 'number' || !url) {
      return res.status(400).json({ error: 'Falta cursoId, materialIndex o url' });
    }
    await guardarUrlMaterial({ cursoId, materialIndex, url });
    res.json({ ok: true, tipo: inferirTipo(url) });
  } catch (err) {
    console.error('❌ /api/materiales/guardar error:', err.message);
    res.status(500).json({ error: 'No se pudo guardar el material' });
  }
});

// POST /api/materiales/eliminar · (solo admin) { cursoId, materialIndex }
// Se llama justo después de quitar ese material de cursos/{id}.materiales[]
// en el admin, para recorrer la subcolección protegida de la misma forma.
router.post('/eliminar', express.json(), async (req, res) => {
  try {
    const decoded = await verificarToken(req);
    const esAdmin = Boolean(decoded && ADMIN_EMAILS.includes((decoded.email || '').toLowerCase()));
    if (!esAdmin) return res.status(403).json({ error: 'Solo un admin puede eliminar materiales' });

    const { cursoId, materialIndex } = req.body || {};
    if (!cursoId || typeof materialIndex !== 'number') {
      return res.status(400).json({ error: 'Falta cursoId o materialIndex' });
    }
    await eliminarUrlMaterial({ cursoId, materialIndex });
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ /api/materiales/eliminar error:', err.message);
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

// POST /api/materiales/migrar · (solo admin) mueve los materiales viejos
// (con url todavía inline en cursos/{id}.materiales[]) a la subcolección
// protegida. Pensado para correrse UNA vez desde el admin tras desplegar.
router.post('/migrar', express.json(), async (req, res) => {
  try {
    const decoded = await verificarToken(req);
    const esAdmin = Boolean(decoded && ADMIN_EMAILS.includes((decoded.email || '').toLowerCase()));
    if (!esAdmin) return res.status(403).json({ error: 'Solo un admin puede migrar materiales' });

    const migrados = await migrarMaterialesExistentes();
    res.json({ ok: true, migrados });
  } catch (err) {
    console.error('❌ /api/materiales/migrar error:', err.message);
    res.status(500).json({ error: 'No se pudo migrar' });
  }
});

export default router;
