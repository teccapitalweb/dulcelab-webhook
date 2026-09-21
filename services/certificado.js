// ═══════════════════════════════════════════════════════════════════
// services/certificado.js · genera el PDF del certificado (pdfkit)
// Usa los mismos datos que ya existen en Firestore /certificados/{folio}
// (escritos por el panel al completar un curso). No inventa nada nuevo,
// solo produce la versión descargable/adjunta del certificado que ya
// se ve en pantalla.
// ═══════════════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';

const WINE = '#6b1526';
const CREAM = '#fbeff2';
const TEXT = '#3B2420';
const MUTED = '#6B5147';

function verifyUrl(folio) {
  return `${env.panelUrl || 'https://club.dulcelabfood.com'}/verificar.html?folio=${encodeURIComponent(folio)}`;
}
function qrUrl(folio) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=' + encodeURIComponent(verifyUrl(folio));
}

async function descargarQR(folio) {
  try {
    const r = await fetch(qrUrl(folio));
    if (!r.ok) return null;
    const arr = await r.arrayBuffer();
    return Buffer.from(arr);
  } catch (e) {
    console.warn('⚠️  No se pudo descargar el QR del certificado:', e.message);
    return null;
  }
}

function formatoFecha(fechaIso) {
  try {
    return new Date(fechaIso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) { return ''; }
}

/**
 * Genera el PDF del certificado y devuelve un Buffer.
 * cert: { folio, nombre, curso, area, horas, sesiones, instructor, emitido }
 */
export async function generarCertificadoPDF(cert) {
  const qrBuffer = await descargarQR(cert.folio);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width, H = doc.page.height;

    // Fondo crema + marco doble color vino
    doc.rect(0, 0, W, H).fill(CREAM);
    doc.rect(28, 28, W - 56, H - 56).lineWidth(2).stroke(WINE);
    doc.rect(36, 36, W - 72, H - 72).lineWidth(0.75).stroke(WINE);

    let y = 70;

    // Encabezado marca
    doc.font('Times-Bold').fontSize(24).fillColor(WINE)
      .text('DulceLab Food', 0, y, { align: 'center' });
    y += 30;
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text('GASTRONOMÍA · REPOSTERÍA · INOCUIDAD ALIMENTARIA', 0, y, { align: 'center', characterSpacing: 1.5 });
    y += 34;

    // Línea decorativa + título
    doc.moveTo(W / 2 - 60, y).lineTo(W / 2 + 60, y).lineWidth(1).stroke(WINE);
    y += 14;
    doc.font('Times-Bold').fontSize(26).fillColor(TEXT)
      .text('Certificado de Acreditación', 0, y, { align: 'center', characterSpacing: 1 });
    y += 46;

    doc.font('Helvetica').fontSize(11).fillColor(MUTED)
      .text('Se otorga la presente constancia a', 0, y, { align: 'center' });
    y += 22;

    doc.font('Times-Bold').fontSize(30).fillColor(WINE)
      .text((cert.nombre || 'Alumno DulceLab Food').toUpperCase(), 60, y, { align: 'center', width: W - 120 });
    y += 46;

    doc.font('Helvetica').fontSize(11).fillColor(MUTED)
      .text('Por haber acreditado satisfactoriamente el programa académico denominado:', 0, y, { align: 'center' });
    y += 22;

    doc.font('Times-Italic').fontSize(18).fillColor(TEXT)
      .text(cert.curso || '', 80, y, { align: 'center', width: W - 160 });
    y += 34;

    doc.font('Helvetica').fontSize(10).fillColor(MUTED)
      .text(
        `Carga académica: ${cert.sesiones || 0} sesiones · ${cert.horas || 0} horas      |      Área: ${cert.area || 'Formación DulceLab Food'}`,
        0, y, { align: 'center' }
      );

    // ─── Pie: QR + firmas + folio ───
    const footY = H - 175;
    doc.moveTo(70, footY).lineTo(W - 70, footY).lineWidth(0.5).stroke('#D8C4C9');

    // QR
    if (qrBuffer) {
      doc.image(qrBuffer, 70, footY + 20, { width: 80, height: 80 });
      doc.font('Helvetica').fontSize(7).fillColor(MUTED)
        .text('Escanea para validar', 60, footY + 104, { width: 100, align: 'center' });
    }

    // Firma 1: instructor/coordinación
    const sigX1 = W / 2 - 150;
    doc.moveTo(sigX1, footY + 74).lineTo(sigX1 + 150, footY + 74).lineWidth(0.75).stroke(TEXT);
    doc.font('Times-Bold').fontSize(12).fillColor(TEXT)
      .text(cert.instructor || 'Equipo DulceLab Food', sigX1, footY + 80, { width: 150, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(MUTED)
      .text('INSTRUCTOR(A) DEL PROGRAMA', sigX1, footY + 100, { width: 150, align: 'center', characterSpacing: 1 });

    // Firma 2: coordinación de certificación
    const sigX2 = W / 2 + 20;
    doc.moveTo(sigX2, footY + 74).lineTo(sigX2 + 170, footY + 74).lineWidth(0.75).stroke(TEXT);
    doc.font('Times-Bold').fontSize(11).fillColor(TEXT)
      .text('Coordinación de Certificación', sigX2, footY + 80, { width: 170, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(MUTED)
      .text('DULCELAB FOOD', sigX2, footY + 100, { width: 170, align: 'center', characterSpacing: 1 });

    // Barra final: folio · sitio · fecha
    const barY = H - 50;
    doc.moveTo(70, barY - 8).lineTo(W - 70, barY - 8).lineWidth(0.5).stroke('#D8C4C9');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(TEXT)
      .text(`Folio: ${cert.folio || ''}`, 70, barY, { continued: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text('dulcelabfood.com', W / 2 - 60, barY, { width: 120, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(`Emitido el ${formatoFecha(cert.emitido)}`, W - 260, barY, { width: 190, align: 'right' });

    doc.end();
  });
}
