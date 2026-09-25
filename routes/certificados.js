// ═══════════════════════════════════════════════════════════════════
// routes/certificados.js · envía por correo el PDF del certificado
//
//   POST /certificados/emitir   body: { folio, pdfBase64? }
//
// El panel ya escribió el certificado en Firestore (colección /certificados,
// vía Firestore client SDK) al completar el curso. Este endpoint solo lo LEE
// desde ahí (nunca confía en el contenido del certificado que venga del
// cliente, solo en el folio para buscarlo).
//
// MODIFICADO (revisión de seguridad): antes el body traía {folio, email} y
// el correo se mandaba a lo que dijera el cliente — así que alguien que
// supiera o adivinara el folio de OTRA persona (los folios no son secretos,
// se ven en el propio PDF y en verificar.html) podía pedir que ese
// certificado ajeno se lo mandaran a SU propio correo, y quedarse con una
// copia real de un certificado con el nombre de otra persona. Ahora el
// correo de destino sale SIEMPRE del certificado ya guardado en Firestore
// (cert.email, escrito por el panel al momento de completar el curso, con
// la sesión real de esa persona) — lo que venga en el body ya no se usa.
//
// MODIFICADO: antes este endpoint SIEMPRE redibujaba el PDF desde cero en el
// servidor (pdfkit), y por eso el correo llegaba con un diseño distinto —
// más plano — al certificado bonito que se ve en el panel. Ahora el panel
// manda el PDF YA renderizado (el mismo html2canvas+jsPDF que usa el botón
// "Descargar PDF" en pantalla) en `pdfBase64`, y este endpoint solo lo
// adjunta y lo envía — es exactamente el mismo archivo, pixel por pixel.
// Si por algún motivo el panel no pudo generarlo (navegador viejo, error de
// canvas, etc.) y no manda pdfBase64, se cae de vuelta al generador de
// pdfkit para no dejar al alumno sin certificado por correo.
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import { getCertificado, marcarCertificadoEnviado } from '../services/firestore.js';
import { generarCertificadoPDF } from '../services/certificado.js';
import { enviarCertificado } from '../services/email.js';

const router = express.Router();

router.post('/emitir', async (req, res) => {
  try {
    const { folio, pdfBase64 } = req.body || {};
    if (!folio) return res.status(400).json({ ok: false, error: 'Falta folio' });

    const cert = await getCertificado(folio);
    if (!cert) return res.status(404).json({ ok: false, error: 'Certificado no encontrado' });
    if (!cert.email) {
      console.error(`❌ Certificado ${folio} no tiene correo guardado — no se puede enviar de forma segura`);
      return res.status(400).json({ ok: false, error: 'Este certificado no tiene correo asociado' });
    }
    const email = cert.email;

    // Idempotencia: si ya se mandó, no lo repetimos (el panel puede reintentar
    // la llamada sin querer, p.ej. si el alumno recarga la pantalla).
    if (cert.correoEnviado) {
      console.log(`ℹ️  Certificado ${folio} ya había sido enviado por correo · se omite`);
      return res.json({ ok: true, yaEnviado: true });
    }

    let pdfBuffer;
    let origen;
    if (pdfBase64) {
      try {
        // Acepta tanto un data URI completo ("data:application/pdf;base64,....")
        // como el base64 puro, por si el cliente lo manda de cualquiera de las dos formas.
        const soloBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
        pdfBuffer = Buffer.from(soloBase64, 'base64');
        origen = 'panel (mismo diseño que se ve en pantalla)';
      } catch (e) {
        console.warn(`⚠️  pdfBase64 recibido pero no se pudo decodificar (${folio}):`, e.message);
      }
    }
    if (!pdfBuffer || !pdfBuffer.length) {
      pdfBuffer = await generarCertificadoPDF(cert);
      origen = 'respaldo del servidor (el panel no mandó el PDF ya generado)';
    }
    console.log(`ℹ️  PDF del certificado ${folio} · origen: ${origen}`);

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
