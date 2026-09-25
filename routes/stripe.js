// ═══════════════════════════════════════════════════════════════════
// routes/stripe.js · endpoints relacionados con Stripe
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import {
  verifyWebhookSignature, processWebhookEvent,
  createCheckoutSession, retrieveSession,
  cancelarSuscripcion, reactivarSuscripcion, crearBillingPortal
} from '../services/stripe.js';

const router = express.Router();

// Emails con permiso de admin (igual que en routes/admin.js)
const ADMIN_EMAILS = ['teccapitalweb@gmail.com'];

// ───────────────────────────────────────────────────────────────
// MODIFICADO (revisión de seguridad): cancel-subscription,
// reactivate-subscription y create-billing-portal antes aceptaban
// {uid, email} en el body SIN verificar nada — cualquiera podía cancelar
// la suscripción de OTRO miembro con solo saber o adivinar su uid o su
// correo (que muchas veces no es secreto). Este middleware exige un
// token real de Firebase (Authorization: Bearer <getIdToken()>, igual
// que ya hace el panel admin) y solo deja pasar si el token es de esa
// misma persona (uid coincide) o de un admin.
// ───────────────────────────────────────────────────────────────
async function requireSelfOrAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Falta iniciar sesión' });

    const decoded = await admin.auth().verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const esAdmin = ADMIN_EMAILS.includes(email);
    const uidPedido = req.body?.uid;

    if (!esAdmin && uidPedido && uidPedido !== decoded.uid) {
      return res.status(403).json({ error: 'No puedes hacer esto en la cuenta de otra persona' });
    }
    req.usuarioToken = { uid: decoded.uid, email, esAdmin };
    next();
  } catch (e) {
    console.error('❌ requireSelfOrAdmin:', e.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// POST /stripe/webhook · necesita raw body (sin JSON parser) para verificar firma
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = verifyWebhookSignature(req.body, sig);
  } catch (err) {
    console.error('⚠️  Webhook signature invalid:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    await processWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('❌ Error procesando webhook:', err);
    res.status(500).send('Error interno');
  }
});

// POST /stripe/checkout · crea sesión Embedded Checkout → clientSecret
router.post('/checkout', express.json(), async (req, res) => {
  try {
    const { plan, uid, email } = req.body;
    const result = await createCheckoutSession({ plan, uid, email });
    res.json(result);
  } catch (err) {
    console.error('❌ /stripe/checkout error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// GET /stripe/session/:id · estado de una sesión (página de éxito)
router.get('/session/:id', async (req, res) => {
  try {
    res.json(await retrieveSession(req.params.id));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /stripe/cancel-subscription · cancela al final del periodo (usuario VIP)
router.post('/cancel-subscription', express.json(), requireSelfOrAdmin, async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid && !email) return res.status(400).json({ error: 'Falta uid o email' });
    res.json(await cancelarSuscripcion({ uid, email }));
  } catch (err) {
    console.error('❌ /stripe/cancel-subscription error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /stripe/reactivate-subscription · revierte la cancelación programada
router.post('/reactivate-subscription', express.json(), requireSelfOrAdmin, async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid && !email) return res.status(400).json({ error: 'Falta uid o email' });
    res.json(await reactivarSuscripcion({ uid, email }));
  } catch (err) {
    console.error('❌ /stripe/reactivate-subscription error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// POST /stripe/create-billing-portal · portal de facturación de Stripe
router.post('/create-billing-portal', express.json(), requireSelfOrAdmin, async (req, res) => {
  try {
    const { uid, email } = req.body;
    if (!uid && !email) return res.status(400).json({ error: 'Falta uid o email' });
    res.json(await crearBillingPortal({ uid, email }));
  } catch (err) {
    console.error('❌ /stripe/create-billing-portal error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default router;
