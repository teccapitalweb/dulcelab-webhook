// ═══════════════════════════════════════════════════════════════════
// routes/directorio.js · tarjeta profesional del Directorio VIP
//
// Las escrituras pasan por el servidor: así una regla o una conexión lenta
// de Firestore no deja al miembro atrapado en "Guardando…" en el navegador.
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import admin from 'firebase-admin';
import { db, FieldValue } from '../config/firebase.js';
import { getMembership } from '../services/firestore.js';

const router = express.Router();
const ADMIN_EMAILS = new Set(['teccapitalweb@gmail.com', 'fisiotec25@gmail.com']);
const SECTORES = new Set(['Repostería', 'Panadería', 'Cocina', 'Catering', 'Restaurante', 'Negocio propio', 'Docencia', 'Consultoría', 'Otro']);

function colorPara(uid) {
  const colores = ['#C4577A', '#D5A13D', '#60A5FA', '#A78BFA', '#F87171', '#FBBF24', '#38BDF8', '#FB7185'];
  let h = 0;
  for (const ch of String(uid || 'x')) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return colores[Math.abs(h) % colores.length];
}

function texto(valor, maximo) {
  return String(valor || '').trim().replace(/\s+/g, ' ').slice(0, maximo);
}

async function usuario(req, res, next) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Falta iniciar sesión' });
  try {
    req.usuario = await admin.auth().verifyIdToken(header.slice(7));
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

async function puedeUsarDirectorio(decoded) {
  if (ADMIN_EMAILS.has(String(decoded.email || '').toLowerCase())) return true;
  const membresia = await getMembership(decoded.uid);
  return membresia.activa === true;
}

function nombreBase(decoded, pedido) {
  return texto(pedido, 50)
    || texto(decoded.name, 50)
    || texto(String(decoded.email || '').split('@')[0], 50)
    || 'Miembro DulceLab Food';
}

// Crea la tarjeta básica al activar/entrar como VIP. No incluye correo ni
// WhatsApp, por lo que nunca publica datos de contacto sin que la persona los agregue.
router.post('/asegurar', usuario, async (req, res) => {
  try {
    if (!await puedeUsarDirectorio(req.usuario)) return res.status(403).json({ error: 'El Directorio VIP requiere membresía activa' });
    const ref = db.collection('directorio').doc(req.usuario.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      const nombre = nombreBase(req.usuario, req.body?.nombre);
      await ref.set({
        uid: req.usuario.uid,
        nombre,
        puesto: 'Miembro DulceLab Food',
        empresa: '', sector: '', bio: '',
        whatsapp: '', email: '', linkedin: '', web: '', foto: null,
        color: colorPara(req.usuario.uid),
        visible: true,
        autoCreada: true,
        perfilEditado: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      return res.json({ ok: true, creada: true });
    }
    const actual = snap.data() || {};
    if (!actual.nombre) await ref.set({ nombre: nombreBase(req.usuario, req.body?.nombre), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return res.json({ ok: true, creada: false });
  } catch (error) {
    console.error('❌ /api/directorio/asegurar:', error.message);
    return res.status(500).json({ error: 'No se pudo preparar tu tarjeta profesional' });
  }
});

// Guarda exclusivamente la tarjeta del usuario autenticado.
router.post('/mi-tarjeta', usuario, async (req, res) => {
  try {
    if (!await puedeUsarDirectorio(req.usuario)) return res.status(403).json({ error: 'El Directorio VIP requiere membresía activa' });
    const body = req.body || {};
    const nombre = texto(body.nombre, 50);
    if (nombre.length < 3) return res.status(400).json({ error: 'Escribe tu nombre completo' });
    const sector = texto(body.sector, 40);
    const foto = body.foto === null ? null : (typeof body.foto === 'string' ? body.foto : undefined);
    if (foto !== undefined && foto !== null && (!foto.startsWith('data:image/') || foto.length > 190000)) {
      return res.status(400).json({ error: 'La foto es demasiado grande o no es válida' });
    }
    const tarjeta = {
      uid: req.usuario.uid,
      nombre,
      puesto: texto(body.puesto, 60),
      empresa: texto(body.empresa, 60),
      sector: SECTORES.has(sector) ? sector : '',
      bio: texto(body.bio, 160),
      whatsapp: texto(body.whatsapp, 20),
      email: texto(body.email, 80),
      linkedin: texto(body.linkedin, 120),
      web: texto(body.web, 120),
      visible: body.visible !== false,
      color: colorPara(req.usuario.uid),
      autoCreada: false,
      perfilEditado: true,
      updatedAt: FieldValue.serverTimestamp()
    };
    if (foto !== undefined) tarjeta.foto = foto;
    await db.collection('directorio').doc(req.usuario.uid).set(tarjeta, { merge: true });
    return res.json({ ok: true });
  } catch (error) {
    console.error('❌ /api/directorio/mi-tarjeta:', error.message);
    return res.status(500).json({ error: 'No se pudo guardar tu tarjeta profesional' });
  }
});

export default router;
