// ═══════════════════════════════════════════════════════════════════
// services/certificado.js · genera el PDF del certificado (pdfkit)
// Usa los mismos datos que ya existen en Firestore /certificados/{folio}
// (escritos por el panel al completar un curso). No inventa nada nuevo,
// solo produce la versión descargable/adjunta del certificado que ya
// se ve en pantalla.
//
// MODIFICADO: versión enriquecida. El PDF que llegaba por correo se
// veía muy plano comparado con el certificado bonito del panel (sin
// logo, sin sello, sin firmas como imagen — solo texto). No tenemos
// el archivo del logo real ni las firmas escaneadas disponibles para
// incrustar como imagen, así que en vez de eso se agregó un sello
// dorado dibujado a mano (vectorial, sin depender de ningún archivo
// externo), listón, marco doble vino+dorado y mejor tipografía/espaciado
// para que se sienta oficial. Si en algún momento tienes el logo y las
// firmas como imagen (PNG con fondo transparente), mándamelos y los
// incrusto de verdad en vez del sello dibujado.
// ═══════════════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';

const WINE = '#6b1526';
const WINE_DEEP = '#4a0e1a';
const GOLD = '#b8862f';
const GOLD_LIGHT = '#d8ab5a';
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

// ─── Sello dorado vectorial (medallón + listón) · no requiere ningún archivo ───
function dibujarSello(doc, cx, cy) {
  const rOuter = 30, rInner = 23;

  // Anillo exterior dorado
  doc.circle(cx, cy, rOuter).lineWidth(2).stroke(GOLD);
  doc.circle(cx, cy, rOuter - 4).lineWidth(0.75).stroke(GOLD_LIGHT);
  // Disco interior vino
  doc.circle(cx, cy, rInner).fill(WINE);
  doc.circle(cx, cy, rInner).lineWidth(1).stroke(GOLD_LIGHT);

  // Puntas tipo sol alrededor del anillo (12 rayos cortos)
  for (let i = 0; i < 12; i++) {
    const ang = (Math.PI * 2 * i) / 12;
    const x1 = cx + Math.cos(ang) * (rOuter + 2);
    const y1 = cy + Math.sin(ang) * (rOuter + 2);
    const x2 = cx + Math.cos(ang) * (rOuter + 7);
    const y2 = cy + Math.sin(ang) * (rOuter + 7);
    doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(1.25).stroke(GOLD);
  }

  // Iniciales al centro
  doc.font('Times-Bold').fontSize(15).fillColor(CREAM)
    .text('DF', cx - rInner, cy - 8, { width: rInner * 2, align: 'center' });

  // Listón colgante (dos cintas en V con muesca)
  const ribbonW = 11, ribbonTop = cy + rOuter - 3, ribbonBottom = cy + rOuter + 20;
  [-1, 1].forEach((dir) => {
    const x0 = cx + dir * 5;
    doc.moveTo(x0 - ribbonW / 2, ribbonTop)
      .lineTo(x0 + ribbonW / 2, ribbonTop)
      .lineTo(x0 + ribbonW / 2 - dir * 2, ribbonBottom)
      .lineTo(x0, ribbonBottom - 10)
      .lineTo(x0 - ribbonW / 2 - dir * 2, ribbonBottom)
      .closePath()
      .fill(dir < 0 ? WINE : WINE_DEEP);
  });
}

// ─── Esquinero decorativo (línea doble en forma de L, en cada esquina) ───
function dibujarEsquina(doc, x, y, rotX, rotY, size = 26) {
  doc.moveTo(x, y + rotY * size).lineTo(x, y).lineTo(x + rotX * size, y)
    .lineWidth(1.5).stroke(GOLD);
  doc.moveTo(x + rotX * 6, y + rotY * (size - 6)).lineTo(x + rotX * 6, y + rotY * 6).lineTo(x + rotX * (size - 6), y + rotY * 6)
    .lineWidth(0.5).stroke(GOLD_LIGHT);
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

    // Fondo crema + marco triple (vino grueso, dorado fino, vino fino)
    doc.rect(0, 0, W, H).fill(CREAM);
    doc.rect(24, 24, W - 48, H - 48).lineWidth(2.5).stroke(WINE);
    doc.rect(32, 32, W - 64, H - 64).lineWidth(1).stroke(GOLD);
    doc.rect(38, 38, W - 76, H - 76).lineWidth(0.5).stroke(WINE);

    // Esquineros dorados
    dibujarEsquina(doc, 50, 50, 1, 1);
    dibujarEsquina(doc, W - 50, 50, -1, 1);
    dibujarEsquina(doc, 50, H - 50, 1, -1);
    dibujarEsquina(doc, W - 50, H - 50, -1, -1);

    let y = 66;

    // Encabezado marca
    doc.font('Times-Bold').fontSize(30).fillColor(WINE)
      .text('DulceLab Food', 0, y, { align: 'center', characterSpacing: 0.5 });
    y += 32;
    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text('GASTRONOMÍA · REPOSTERÍA · INOCUIDAD ALIMENTARIA', 0, y, { align: 'center', characterSpacing: 1.6 });
    y += 22;

    // Línea decorativa con rombo dorado al centro
    doc.moveTo(W / 2 - 70, y).lineTo(W / 2 - 10, y).lineWidth(1).stroke(GOLD);
    doc.moveTo(W / 2 + 70, y).lineTo(W / 2 + 10, y).lineWidth(1).stroke(GOLD);
    doc.save().translate(W / 2, y).rotate(45).rect(-4, -4, 8, 8).fill(GOLD).restore();
    y += 18;

    doc.font('Times-Bold').fontSize(25).fillColor(TEXT)
      .text('Certificado de Acreditación', 0, y, { align: 'center', characterSpacing: 1 });
    y += 42;

    doc.font('Helvetica').fontSize(11).fillColor(MUTED)
      .text('Se otorga la presente constancia a', 0, y, { align: 'center' });
    y += 22;

    doc.font('Times-Bold').fontSize(29).fillColor(WINE)
      .text((cert.nombre || 'Alumno DulceLab Food').toUpperCase(), 60, y, { align: 'center', width: W - 120, characterSpacing: 0.5 });
    y += 42;

    doc.font('Helvetica').fontSize(11).fillColor(MUTED)
      .text('Por haber acreditado satisfactoriamente el programa académico denominado:', 0, y, { align: 'center' });
    y += 22;

    doc.font('Times-Italic').fontSize(18).fillColor(TEXT)
      .text(cert.curso || '', 80, y, { align: 'center', width: W - 160 });
    y += 32;

    doc.font('Helvetica').fontSize(10).fillColor(MUTED)
      .text(
        `Carga académica: ${cert.sesiones || 0} sesiones · ${cert.horas || 0} horas      |      Área: ${cert.area || 'Formación DulceLab Food'}`,
        0, y, { align: 'center' }
      );

    // ─── Pie: QR + sello + firmas + folio ───
    const footY = H - 178;
    doc.moveTo(70, footY).lineTo(W - 70, footY).lineWidth(0.5).stroke('#D8C4C9');

    // QR (izquierda)
    if (qrBuffer) {
      doc.image(qrBuffer, 70, footY + 20, { width: 78, height: 78 });
      doc.font('Helvetica').fontSize(7).fillColor(MUTED)
        .text('Escanea para validar', 58, footY + 102, { width: 102, align: 'center' });
    }

    // Sello dorado (derecha)
    dibujarSello(doc, W - 108, footY + 50);

    // Firma 1: instructor/coordinación
    const sigX1 = W / 2 - 210;
    doc.moveTo(sigX1, footY + 74).lineTo(sigX1 + 190, footY + 74).lineWidth(0.75).stroke(GOLD);
    doc.font('Times-Bold').fontSize(11).fillColor(TEXT)
      .text('María Josefina Mariano Ventura', sigX1, footY + 80, { width: 190, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(MUTED)
      .text('COORDINADORA · DULCELAB FOOD', sigX1, footY + 112, { width: 190, align: 'center', characterSpacing: 1 });

    // Firma 2: coordinación de certificación
    const sigX2 = W / 2 + 20;
    doc.moveTo(sigX2, footY + 74).lineTo(sigX2 + 190, footY + 74).lineWidth(0.75).stroke(GOLD);
    doc.font('Times-Bold').fontSize(11).fillColor(TEXT)
      .text('Coordinación de Certificación', sigX2, footY + 80, { width: 190, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(MUTED)
      .text('IPCI LATINOAMERICANO', sigX2, footY + 112, { width: 190, align: 'center', characterSpacing: 1 });

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
