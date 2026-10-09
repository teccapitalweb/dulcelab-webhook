// ═══════════════════════════════════════════════════════════════════
// services/metricas.js · visitas y embudo de la membresía (sin datos personales)
//
// Se guarda UN documento por visitante y por día en `metricas_visitas/{día}_{vid}`:
//   - vid: identificador anónimo que genera el navegador (no es correo, ni IP, ni nombre)
//   - de qué medio llegó (Instagram, Facebook, WhatsApp, Google, directo…)
//   - qué pasos dio: sitio, club, panel, membresia (vio el plan), checkout (abrió el pago), registro, compra
// El panel de admin lee esto agregado en GET /api/metricas/resumen.
// ═══════════════════════════════════════════════════════════════════

import { db, FieldValue } from '../config/firebase.js';

const COL = 'metricas_visitas';
export const TIPOS = ['vista', 'membresia', 'checkout', 'registro'];
export const PAGINAS = ['sitio', 'club', 'panel'];

const HOSTS_PROPIOS = /(^|\.)dulcelabfood\.com$|(^|\.)stripe\.com$|(^|\.)localhost$/i;

// Nombre amigable para el medio, a partir de utm_source o del dominio de referencia.
const ALIAS = [
  [/^(ig|instagram|insta)$|instagram\.com$/i, 'Instagram'],
  [/^(fb|facebook|face|meta)$|(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/i, 'Facebook'],
  [/^(wa|whatsapp|wapp)$|whatsapp\.com$|(^|\.)wa\.me$/i, 'WhatsApp'],
  [/^(tiktok|tt)$|tiktok\.com$/i, 'TikTok'],
  [/^(yt|youtube)$|youtube\.com$|youtu\.be$/i, 'YouTube'],
  [/^(google|goog|gads|adwords)$|(^|\.)google\.[a-z.]+$/i, 'Google'],
  [/^bing$|(^|\.)bing\.com$/i, 'Bing'],
  [/^(x|twitter|tw)$|(^|\.)twitter\.com$|(^|\.)x\.com$|^t\.co$/i, 'X (Twitter)'],
  [/^linkedin$|linkedin\.com$|lnkd\.in$/i, 'LinkedIn'],
  [/^(telegram|tg)$|(^|\.)t\.me$|telegram\.org$/i, 'Telegram'],
  [/^(email|mail|correo|newsletter)$|mail\.google\.com$|outlook\.(live|office)\.com$/i, 'Correo'],
  [/^pinterest$|pinterest\.[a-z.]+$/i, 'Pinterest']
];
const SOCIALES = new Set(['Instagram', 'Facebook', 'WhatsApp', 'TikTok', 'YouTube', 'X (Twitter)', 'LinkedIn', 'Telegram', 'Pinterest']);
const BUSCADORES = new Set(['Google', 'Bing']);

const limpiar = (v, n = 80) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);

// origen = { s: utm_source, m: utm_medium, c: utm_campaign, r: dominio de referencia }
export function clasificarOrigen(origen) {
  const o = origen && typeof origen === 'object' ? origen : {};
  const s = limpiar(o.s, 60).toLowerCase();
  const m = limpiar(o.m, 60).toLowerCase();
  const c = limpiar(o.c, 80);
  const r = limpiar(o.r, 120).toLowerCase().replace(/^www\./, '');

  let fuente = '';
  if (s) fuente = (ALIAS.find(([re]) => re.test(s)) || [null, s.charAt(0).toUpperCase() + s.slice(1)])[1];
  else if (r && !HOSTS_PROPIOS.test(r)) fuente = (ALIAS.find(([re]) => re.test(r)) || [null, r])[1];
  if (!fuente) fuente = 'Directo / no identificado';

  let medio = m;
  if (!medio) {
    if (fuente.startsWith('Directo')) medio = 'directo';
    else if (SOCIALES.has(fuente)) medio = 'red social';
    else if (BUSCADORES.has(fuente)) medio = 'búsqueda';
    else if (fuente === 'Correo') medio = 'correo';
    else medio = s ? 'campaña' : 'referido';
  }
  return { fuente, medio, campana: c };
}

export function hoyMX(fecha = new Date()) {
  // YYYY-MM-DD en hora de México, para que "hoy" coincida con el día de quien lo mira
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha);
}

const VID_RE = /^[a-z0-9_-]{8,48}$/i;
export const vidValido = (v) => VID_RE.test(String(v || ''));

export function dispositivoDe(ua) {
  const u = String(ua || '');
  if (/ipad|tablet/i.test(u)) return 'tablet';
  if (/mobi|android|iphone/i.test(u)) return 'celular';
  return 'computadora';
}
export const esBot = (ua) => !ua || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|curl|python|wget|axios|node-fetch|monitor|uptime/i.test(String(ua));

export async function registrarEvento({ vid, tipo, pagina, origen, ua }) {
  if (!vidValido(vid)) return { ok: false, error: 'vid' };
  if (!TIPOS.includes(tipo)) return { ok: false, error: 'tipo' };
  const dia = hoyMX();
  const { fuente, medio, campana } = clasificarOrigen(origen);
  const pag = PAGINAS.includes(pagina) ? pagina : null;

  const datos = {
    day: dia, vid, ultimo: FieldValue.serverTimestamp(),
    fuente, medio, campana: campana || FieldValue.delete(),
    dispositivo: dispositivoDe(ua)
  };
  if (tipo === 'vista') {
    datos.vistas = FieldValue.increment(1);
    if (pag) datos.paginas = { [pag]: FieldValue.increment(1) };
    datos.pasos = { ...(pag ? { [pag]: true } : {}) };
  } else {
    datos.pasos = { [tipo]: true };
    if (pag) datos.paginas = { [pag]: FieldValue.increment(0) };
  }
  await db.collection(COL).doc(`${dia}_${vid}`).set(datos, { merge: true });
  return { ok: true };
}

// Compra confirmada por Stripe (se llama una sola vez por sesión: handleCheckoutCompleted ya deduplica).
export async function registrarCompra({ vid, sessionId, monto, plan, fuente, medio, campana }) {
  const dia = hoyMX();
  const id = vidValido(vid) ? vid : `s${String(sessionId || '').slice(-14)}`;
  await db.collection(COL).doc(`${dia}_${id}`).set({
    day: dia, vid: id, ultimo: FieldValue.serverTimestamp(),
    fuente: fuente || 'Directo / no identificado', medio: medio || 'directo',
    ...(campana ? { campana } : {}),
    plan: plan || null,
    compras: FieldValue.increment(1),
    compraMonto: FieldValue.increment(Number(monto) || 0),
    pasos: { compra: true }
  }, { merge: true });
}

// ───────────────────────────────────────────────────────────────
// Resumen para el panel de admin
// ───────────────────────────────────────────────────────────────
export async function resumen(dias = 30) {
  const n = Math.max(1, Math.min(365, Number(dias) || 30));
  const hoy = new Date();
  const desde = hoyMX(new Date(hoy.getTime() - (n - 1) * 86400000));
  const snap = await db.collection(COL).where('day', '>=', desde).limit(60000).get();

  const totales = { visitantes: new Set(), vistas: 0, compras: 0, ingresos: 0 };
  const clubOPanel = new Set();
  const pasos = { sitio: new Set(), club: new Set(), panel: new Set(), membresia: new Set(), checkout: new Set(), registro: new Set(), compra: new Set() };
  const porFuente = new Map();
  const porDia = new Map();
  const porCamp = new Map();
  const disp = { celular: new Set(), computadora: new Set(), tablet: new Set() };

  const celda = (mapa, k, init) => { if (!mapa.has(k)) mapa.set(k, init()); return mapa.get(k); };

  snap.forEach((doc) => {
    const d = doc.data() || {};
    const vid = d.vid || doc.id;
    const p = d.pasos || {};
    totales.visitantes.add(vid);
    totales.vistas += Number(d.vistas) || 0;
    totales.compras += Number(d.compras) || 0;
    totales.ingresos += Number(d.compraMonto) || 0;
    Object.keys(pasos).forEach((k) => { if (p[k]) pasos[k].add(vid); });
    if (p.club || p.panel) clubOPanel.add(vid);
    if (disp[d.dispositivo]) disp[d.dispositivo].add(vid);

    const f = celda(porFuente, d.fuente || 'Directo / no identificado', () => ({ visitantes: new Set(), membresia: new Set(), checkout: new Set(), registro: new Set(), compras: 0, ingresos: 0, medio: d.medio || '' }));
    f.visitantes.add(vid);
    if (p.membresia) f.membresia.add(vid);
    if (p.checkout) f.checkout.add(vid);
    if (p.registro) f.registro.add(vid);
    f.compras += Number(d.compras) || 0;
    f.ingresos += Number(d.compraMonto) || 0;

    const dd = celda(porDia, d.day, () => ({ visitantes: 0, vistas: 0, membresia: 0, compras: 0 }));
    dd.visitantes += 1; dd.vistas += Number(d.vistas) || 0;
    if (p.membresia) dd.membresia += 1;
    dd.compras += Number(d.compras) || 0;

    if (d.campana) {
      const c = celda(porCamp, `${d.fuente || ''}|${d.campana}`, () => ({ fuente: d.fuente || '', campana: d.campana, visitantes: new Set(), compras: 0 }));
      c.visitantes.add(vid); c.compras += Number(d.compras) || 0;
    }
  });

  // serie diaria completa (con ceros) para que la gráfica no tenga huecos
  const serie = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = hoyMX(new Date(hoy.getTime() - i * 86400000));
    serie.push({ dia: k, ...(porDia.get(k) || { visitantes: 0, vistas: 0, membresia: 0, compras: 0 }) });
  }

  return {
    dias: n, desde,
    totales: { visitantes: totales.visitantes.size, vistas: totales.vistas, compras: totales.compras, ingresos: Math.round(totales.ingresos * 100) / 100 },
    embudo: {
      sitio: pasos.sitio.size, club: pasos.club.size, panel: pasos.panel.size, clubOPanel: clubOPanel.size,
      membresia: pasos.membresia.size, checkout: pasos.checkout.size, registro: pasos.registro.size, compra: pasos.compra.size
    },
    fuentes: [...porFuente.entries()].map(([fuente, f]) => ({
      fuente, medio: f.medio, visitantes: f.visitantes.size, membresia: f.membresia.size, checkout: f.checkout.size,
      registro: f.registro.size, compras: f.compras, ingresos: Math.round(f.ingresos * 100) / 100
    })).sort((a, b) => b.visitantes - a.visitantes),
    campanas: [...porCamp.values()].map((c) => ({ fuente: c.fuente, campana: c.campana, visitantes: c.visitantes.size, compras: c.compras }))
      .sort((a, b) => b.visitantes - a.visitantes).slice(0, 15),
    dispositivos: { celular: disp.celular.size, computadora: disp.computadora.size, tablet: disp.tablet.size },
    serie,
    truncado: snap.size >= 60000
  };
}
