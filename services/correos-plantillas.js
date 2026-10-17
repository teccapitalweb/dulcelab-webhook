// ═══════════════════════════════════════════════════════════════════
// services/correos-plantillas.js · los 3 correos de la secuencia de registro
//   1) beneficios de la membresía      (12 h después de registrarse)
//   2) descuento de $50 en el 1.er mes (24 h después del correo 1)
//   3) descuento de $100 en el 1.er mes (24 h después del correo 2, solo si no pagó)
// Mismo estilo que el correo de bienvenida de la membresía.
// ═══════════════════════════════════════════════════════════════════

const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const peso = (n) => '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });

// "sábado a las 10:00 p. m." en hora de México
export function textoVence(fecha) {
  const partes = new Intl.DateTimeFormat('es-MX', { weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Mexico_City' }).formatToParts(fecha);
  const g = (t) => (partes.find((p) => p.type === t) || {}).value || '';
  return `${g('weekday')} a las ${g('hour')}:${g('minute')} ${g('dayPeriod').replace(/\./g, '. ').replace(/\s+/g, ' ').trim()}`;
}

function marco({ etiqueta, cuerpo, urlBaja }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>DulceLab Food</title></head>
<body style="margin:0;padding:0;background:#fbeff2;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbeff2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #f0d9de;border-radius:20px;overflow:hidden;">
        <tr><td style="background:#6b1526;padding:32px;text-align:center;">
          <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-.5px;">DulceLab Food</div>
          <div style="font-size:12px;font-weight:600;color:#f6d9de;opacity:.9;margin-top:6px;letter-spacing:1.5px;text-transform:uppercase;">${esc(etiqueta)}</div>
        </td></tr>
        <tr><td style="padding:34px 32px 30px;">${cuerpo}</td></tr>
        <tr><td style="padding:22px 32px;border-top:1px solid #f0d9de;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#8a746c;line-height:1.6;">Recibiste este correo porque te registraste en DulceLab Food. <a href="${esc(urlBaja)}" style="color:#8a746c;">Darme de baja</a></p>
          <p style="margin:0;font-size:12px;color:#a5928a;">DulceLab Food · Gastronomía · Repostería · Inocuidad alimentaria · Tehuacán, Puebla</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const boton = (url, texto) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 14px;">
  <tr><td style="border-radius:12px;background:#6b1526;">
    <a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(texto)}</a>
  </td></tr>
</table>`;

function bloquePrecio({ precioNormal, precioFinal, vence }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#fbeff2;border-radius:16px;">
  <tr><td style="padding:22px;text-align:center;">
    <div style="font-size:13px;color:#8a746c;letter-spacing:1px;text-transform:uppercase;font-weight:700;">Tu primer mes</div>
    <div style="margin-top:8px;">
      <span style="font-size:20px;color:#a5928a;text-decoration:line-through;">${peso(precioNormal)}</span>
      <span style="font-size:42px;font-weight:800;color:#6b1526;letter-spacing:-1px;margin-left:10px;">${peso(precioFinal)}</span>
    </div>
    <div style="margin-top:8px;font-size:13px;color:#6B5147;">Plan mensual · <strong>vigente por 24 horas</strong></div>
    <div style="margin-top:2px;font-size:12px;color:#8a746c;">Vence el ${esc(vence)}</div>
  </td></tr>
</table>`;
}

// tipo: 'beneficios' | 'descuento1' | 'descuento2'
export function armarCorreo({ tipo, nombre, precioNormal, monto, vence, urlCta, urlBaja }) {
  const saludo = nombre ? `${esc(nombre)}, ` : '';
  const letra = (txt) => (nombre ? `${esc(nombre)}, ${txt}` : txt.charAt(0).toUpperCase() + txt.slice(1));
  const precioFinal = Math.max(0, Number(precioNormal) - Number(monto || 0));
  const pie = `<p style="margin:0;font-size:12.5px;line-height:1.6;color:#8a746c;">El descuento aplica solo al primer mes del plan mensual. Después, la membresía continúa en ${peso(precioNormal)} al mes y puedes cancelarla cuando quieras.</p>`;

  if (tipo === 'beneficios') {
    const fila = (t, ultimo) => `<tr><td style="padding:11px 0;${ultimo ? '' : 'border-bottom:1px solid #f0d9de;'}font-size:14px;color:#6B5147;">${t}</td></tr>`;
    const cuerpo = `
      <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#3B2420;letter-spacing:-.4px;">${nombre ? `Hola ${esc(nombre)}, esto` : 'Hola, esto'} es lo que tendrás con la membresía VIP</h1>
      <p style="margin:0 0 6px;font-size:15px;line-height:1.65;color:#6B5147;">Ya creaste tu cuenta en DulceLab Food. Con la membresía se abre todo el contenido del club:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 22px;">
        ${fila('<strong style="color:#6b1526;">Todos los cursos completos</strong>, con su última clase y certificado verificable')}
        ${fila('<strong style="color:#6b1526;">Biblioteca</strong> de guías, recetas y libros clásicos')}
        ${fila('<strong style="color:#6b1526;">Retos y XP</strong> para desbloquear material y subir de nivel')}
        ${fila('<strong style="color:#6b1526;">Clases en vivo</strong> con chefs y especialistas')}
        ${fila('<strong style="color:#6b1526;">Herramientas profesionales</strong> de costeo y cocina')}
        ${fila('<strong style="color:#6b1526;">Comunidad</strong>: foro, directorio profesional y canal de WhatsApp', true)}
      </table>
      ${boton(urlCta, 'Ver la membresía')}`;
    return {
      subject: 'Lo que incluye tu membresía en DulceLab Food',
      html: marco({ etiqueta: 'Club VIP · Gastronomía · Repostería · Inocuidad', cuerpo, urlBaja })
    };
  }

  if (tipo === 'descuento1') {
    const cuerpo = `
      <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#3B2420;letter-spacing:-.4px;">${letra(`te regalamos ${peso(monto)} en tu primer mes`)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#6B5147;">Quisimos darte un empujón para que empieces a aprender hoy mismo con la membresía VIP de DulceLab Food.</p>
      ${bloquePrecio({ precioNormal, precioFinal, vence })}
      ${boton(urlCta, `Aprovechar mis ${peso(monto)}`)}
      ${pie}`;
    return {
      subject: `${saludo}tu primer mes con ${peso(monto)} de descuento`.replace(/^./, (c) => c.toUpperCase()),
      html: marco({ etiqueta: 'Una oferta para ti', cuerpo, urlBaja })
    };
  }

  // descuento2
  const cuerpo = `
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:800;color:#3B2420;letter-spacing:-.4px;">${letra('tu primer mes a mitad de precio')}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#6B5147;">Tu descuento anterior ya venció, pero no queremos que te quedes sin empezar. Esta es nuestra mejor oferta, y es la última.</p>
    ${bloquePrecio({ precioNormal, precioFinal, vence })}
    ${boton(urlCta, `Aprovechar mis ${peso(monto)}`)}
    ${pie.replace('</p>', ' Pasado este plazo, el precio vuelve a ser el normal.</p>')}`;
  return {
    subject: `Última oportunidad: tu primer mes a ${peso(precioFinal)}`,
    html: marco({ etiqueta: 'Última oportunidad', cuerpo, urlBaja })
  };
}
