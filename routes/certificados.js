// ═══════════════════════════════════════════════════════════════════
// routes/certificados.js · genera el PDF del certificado y lo envía por correo
//
//   POST /certificados/emitir   body: { folio, email }
//
// El panel ya escribió el certificado en Firestore (colección /certificados,
// vía Firestore client SDK) al completar el curso. Este endpoint solo lo LEE
// desde ahí (nunca confía en el contenido del certificado que venga del
// cliente, solo en el folio para buscarlo), genera el PDF con pdfkit y lo
// manda por Resend. Idempotente: si ya se envió, no lo manda dos veces.
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import { getCertificado, marcarCertificadoEnviado } from '../services/firestore.js';
import { generarCertificadoPDF } from '../services/certificado.js';
import { enviarCertificado } from '../services/email.js';

const router = express.Router();

router.post('/emitir', async (req, res) => {
  try {
    const { folio, email } = req.body || {};
    if (!folio) return res.status(400).json({ ok: false, error: 'Falta folio' });
    if (!email) return res.status(400).json({ ok: false, error: 'Falta email' });

    const cert = await getCertificado(folio);
    if (!cert) return res.status(404).json({ ok: false, error: 'Certificado no encontrado' });

    // Idempotencia: si ya se mandó, no lo repetimos (el panel puede reintentar
    // la llamada sin querer, p.ej. si el alumno recarga la pantalla).
    if (cert.correoEnviado) {
      console.log(`ℹ️  Certificado ${folio} ya había sido enviado por correo · se omite`);
      return res.json({ ok: true, yaEnviado: true });
    }

    const pdfBuffer = await generarCertificadoPDF(cert);

    const resultado = await enviarCertificado({
      to: email,
      nombre: cert.nombre,
      curso: cert.curso,
      folio: cert.folio,
      pdfBuffer
    });

    if (resultado.ok) {
      await marcarCertificadoEnviado(folio);
      console.log(`✅ Certificado emitido y enviado · ${folio} · ${email}`);
    } else {
      console.warn(`⚠️  Certificado generado pero el correo no se pudo enviar · ${folio} ·`, resultado.reason || resultado.status);
    }

    return res.json({ ok: true, correo: resultado });
  } catch (err) {
    console.error('❌ /certificados/emitir:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /certificados/verificar/:folio · endpoint PÚBLICO (sin login).
// Lo usa verificar.html para que cualquier persona con el link o el QR
// del certificado pueda confirmar que es real. Solo expone los campos
// necesarios para mostrar la validez — nunca el uid, el correo del
// alumno ni si ya se le mandó el PDF por correo.
// ─────────────────────────────────────────────────────────────
router.get('/verificar/:folio', async (req, res) => {
  try {
    const cert = await getCertificado(req.params.folio);
    if (!cert) return res.status(404).json({ valido: false });
    return res.json({
      valido: true,
      folio: cert.folio,
      nombre: cert.nombre,
      curso: cert.curso,
      area: cert.area,
      horas: cert.horas,
      sesiones: cert.sesiones,
      instructor: cert.instructor,
      emitido: cert.emitido
    });
  } catch (err) {
    console.error('❌ /certificados/verificar:', err.message);
    return res.status(500).json({ valido: false, error: err.message });
  }
});

export default router;
