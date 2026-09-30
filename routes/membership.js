// ═══════════════════════════════════════════════════════════════════
// routes/membership.js · consulta de estado de membresía (paywall del panel)
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { getMembership } from '../services/firestore.js';

const router = express.Router();

// Emails con permiso de admin (igual que en routes/admin.js y routes/stripe.js)
const ADMIN_EMAILS = ['teccapitalweb@gmail.com'];

// MODIFICADO (revisión de seguridad): antes este endpoint no pedía ningún
// token — cualquiera que supiera o adivinara un uid podía leer el estado de
// membresía (plan, si está activa, próxima renovación) de ese miembro. Ahora
// exige el mismo Authorization: Bearer <idToken> que ya usan /stripe/* y
// solo deja pasar si el token es de ese mismo uid o de un admin.
router.get('/:uid', async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Falta iniciar sesión' });

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(token);
  } catch (err) {
    console.error('❌ /membership token inválido:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  const esAdmin = ADMIN_EMAILS.includes((decoded.email || '').toLowerCase());
  if (!esAdmin && decoded.uid !== req.params.uid) {
    return res.status(403).json({ error: 'No puedes ver la membresía de otra persona' });
  }

  try {
    res.json(await getMembership(req.params.uid));
  } catch (err) {
    console.error('❌ /membership error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
