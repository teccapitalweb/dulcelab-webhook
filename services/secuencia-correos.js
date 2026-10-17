// ═══════════════════════════════════════════════════════════════════
// services/secuencia-correos.js · recordatorios automáticos para quien se registra y no paga
//
//   registro ──12 h──▶ correo 1 (beneficios)
//            ──24 h──▶ correo 2 (−$50 el primer mes, vale 24 h)
//            ──24 h──▶ correo 3 (−$100 el primer mes, vale 24 h; solo si no pagó)
//   Después de eso el precio vuelve a ser el normal y no se manda nada más.
//
// Reglas:
//   · Solo personas que se registraron DESPUÉS de que esto se encendió (secuencia_correos/_meta.inicio).
//   · Solo con el correo confirmado y que nunca han pagado. Si pagan, la secuencia se detiene.
//   · Nada sale entre las 10 p. m. y las 8 a. m. (hora de México): espera hasta las 8 a. m.
//   · Cada correo lleva «Darme de baja». Los descuentos valen solo el 1.er mes del plan mensual.
//   · Se revisa cada hora desde index.js. Apagar de emergencia: variable SECUENCIA_CORREOS_OFF=1 en Railway.
// ═══════════════════════════════════════════════════════════════════

import admin from 'firebase-admin';
import crypto from 'node:crypto';
import { db, FieldValue, Timestamp } from '../config/firebase.js';
import { env } from '../config/env.js';
import { leerPreciosConfig } from './firestore.js';
import { enviarCorreo } from './email.js';
import { armarCorreo, textoVence } from './correos-plantillas.js';

const COL = 'secuencia_correos';
const HORA = 3600 * 1000;
export const ESPERA_CORREO_1 = 12 * HORA;       // desde el registro
export const ESPERA_CORREO_2 = 24 * HORA;       // desde el correo 1
export const ESPERA_CORREO_3 = 24 * HORA;       // desde el correo 2
export const VIGENCIA_DESCUENTO = 24 * HORA;
export const DESCUENTO_1 = 50;
export const DESCUENTO_2 = 100;
const MAX_ENVIOS_POR_VUELTA = 60;
const API_URL = process.env.PUBLIC_API_URL || 'https://dulcelab-webhook-production.up.railway.app';

const apagada = () => String(process.env.SECUENCIA_CORREOS_OFF || '') === '1';

// ── hora de México ──
function horaMX(fecha = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: 'numeric', hour12: false }).format(fecha)) % 24;
}
export const enHorarioPermitido = (fecha = new Date()) => { const h = horaMX(fecha); return h >= 8 && h < 22; };

// ── enlace de baja firmado (no se puede dar de baja a otra persona adivinando) ──
function claveBaja() { return `dlf-baja:${env.resendApiKey || 'sin-clave'}`; }
export function tokenBaja(uid) { return crypto.createHmac('sha256', claveBaja()).update(String(uid)).digest('hex').slice(0, 32); }
export function urlBaja(uid) { return `${API_URL}/api/correos/baja?u=${encodeURIComponent(uid)}&t=${tokenBaja(uid)}`; }
export function tokenValido(uid, t) {
  const a = Buffer.from(tokenBaja(uid)); const b = Buffer.from(String(t || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── ¿ya pagó alguna vez? (o es miembro por cualquier vía) ──
export async function yaPago(uid) {
  const snap = await db.collection('miembros').doc(uid).get();
  if (!snap.exists) return false;
  const d = snap.data() || {};
  return d.activa === true || !!d.plan || !!d.stripeSubscriptionId || !!d.stripeCustomerId || !!d.fechaAlta;
}

async function inicioDeLaSecuencia() {
  const ref = db.collection(COL).doc('_meta');
  const snap = await ref.get();
  if (snap.exists && snap.data().inicio) return snap.data().inicio.toDate();
  const ahora = new Date();
  await ref.set({ inicio: Timestamp.fromDate(ahora), nota: 'Solo reciben la secuencia las cuentas creadas después de esta fecha.' }, { merge: true });
  console.log('📨 Secuencia de correos: inicio fijado en', ahora.toISOString());
  return ahora;
}

// Registra a las cuentas nuevas (creadas después del inicio) para seguirles la secuencia.
async function registrarNuevas(inicio) {
  const nuevas = [];
  let token;
  do {
    const page = await admin.auth().listUsers(1000, token);
    page.users.forEach((u) => {
      const creada = u.metadata && u.metadata.creationTime ? new Date(u.metadata.creationTime) : null;
      if (creada && creada.getTime() >= inicio.getTime() && u.email) nuevas.push({ uid: u.uid, email: u.email.toLowerCase(), nombre: u.displayName || '', creada });
    });
    token = page.pageToken;
  } while (token);
  if (!nuevas.length) return;

  const refs = nuevas.map((n) => db.collection(COL).doc(n.uid));
  const existentes = await db.getAll(...refs);
  const batch = db.batch();
  let n = 0;
  existentes.forEach((snap, i) => {
    if (snap.exists) return;
    const u = nuevas[i];
    batch.set(refs[i], {
      uid: u.uid, email: u.email, nombre: u.nombre,
      registradoAt: Timestamp.fromDate(u.creada),
      estado: 'activa', paso: 0, intentos: 0,
      creadoAt: FieldValue.serverTimestamp()
    });
    n++;
  });
  if (n) { await batch.commit(); console.log(`📨 Secuencia: ${n} cuenta(s) nueva(s) agregada(s)`); }
}

const primerNombre = (n, email) => String(n || '').trim().split(/\s+/)[0] || '';

async function enviarPaso({ doc, datos, paso, precioNormal }) {
  const uid = datos.uid;
  const nombre = primerNombre(datos.nombre);
  const urlCta = `${env.panelUrl}/vip-panel.html#suscripcion`;
  const ahora = new Date();
  let tipo, monto = 0, vence = null;
  if (paso === 1) tipo = 'beneficios';
  else if (paso === 2) { tipo = 'descuento1'; monto = DESCUENTO_1; vence = new Date(ahora.getTime() + VIGENCIA_DESCUENTO); }
  else { tipo = 'descuento2'; monto = DESCUENTO_2; vence = new Date(ahora.getTime() + VIGENCIA_DESCUENTO); }
  if (monto && precioNormal - monto <= 0) return { ok: false, motivo: 'precio-menor-al-descuento' };

  const { subject, html } = armarCorreo({
    tipo, nombre, precioNormal, monto, vence: vence ? textoVence(vence) : '', urlCta, urlBaja: urlBaja(uid)
  });
  const r = await enviarCorreo({
    to: datos.email, subject, html,
    headers: { 'List-Unsubscribe': `<${urlBaja(uid)}>` }
  });
  return { ...r, vence, monto, ahora };
}

// Se llama cada hora.
export async function procesarSecuencia() {
  if (apagada()) return { apagada: true };
  const inicio = await inicioDeLaSecuencia();
  await registrarNuevas(inicio);

  const ahora = new Date();
  if (!enHorarioPermitido(ahora)) return { fueraDeHorario: true };

  const snap = await db.collection(COL).where('estado', '==', 'activa').limit(300).get();
  if (snap.empty) return { enviados: 0 };
  const { precioMes } = await leerPreciosConfig();
  let enviados = 0;

  for (const doc of snap.docs) {
    if (doc.id === '_meta') continue;
    if (enviados >= MAX_ENVIOS_POR_VUELTA) break;
    const d = doc.data();
    try {
      if (await yaPago(d.uid)) { await doc.ref.set({ estado: 'pagado', pagadoDetectadoAt: FieldValue.serverTimestamp() }, { merge: true }); continue; }

      const t = (campo) => (d[campo] && d[campo].toDate ? d[campo].toDate().getTime() : null);
      let paso = 0;
      if (d.paso === 0) { if (ahora.getTime() - t('registradoAt') >= ESPERA_CORREO_1) paso = 1; }
      else if (d.paso === 1) { if (ahora.getTime() - t('correo1At') >= ESPERA_CORREO_2) paso = 2; }
      else if (d.paso === 2) { if (ahora.getTime() - t('correo2At') >= ESPERA_CORREO_3) paso = 3; }
      if (!paso) continue;

      // solo con el correo confirmado
      const u = await admin.auth().getUser(d.uid).catch(() => null);
      if (!u || !u.emailVerified) continue;

      const r = await enviarPaso({ doc, datos: d, paso, precioNormal: precioMes });
      if (!r.ok) {
        const intentos = (d.intentos || 0) + 1;
        await doc.ref.set({ intentos, ultimoError: String(r.motivo || r.reason || r.detalle || 'error').slice(0, 160), ...(intentos >= 6 ? { estado: 'error' } : {}) }, { merge: true });
        continue;
      }
      enviados++;
      const cambios = { paso, intentos: 0, ultimoError: FieldValue.delete() };
      if (paso === 1) cambios.correo1At = Timestamp.fromDate(r.ahora);
      if (paso === 2) { cambios.correo2At = Timestamp.fromDate(r.ahora); cambios.descuento1VenceAt = Timestamp.fromDate(r.vence); }
      if (paso === 3) { cambios.correo3At = Timestamp.fromDate(r.ahora); cambios.descuento2VenceAt = Timestamp.fromDate(r.vence); cambios.estado = 'terminada'; }
      await doc.ref.set(cambios, { merge: true });
    } catch (e) {
      console.error('[secuencia] error con', doc.id, e.message);
    }
  }
  if (enviados) console.log(`📨 Secuencia: ${enviados} correo(s) enviado(s)`);
  return { enviados };
}

// ── descuento vigente de una persona (para el panel y para el cobro) ──
export async function ofertaVigente(uid) {
  const snap = await db.collection(COL).doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.estado === 'pagado') return null;
  if (await yaPago(uid)) return null;
  const ahora = Date.now();
  const f = (campo) => (d[campo] && d[campo].toDate ? d[campo].toDate().getTime() : 0);
  let monto = 0, vence = 0;
  if (f('descuento1VenceAt') > ahora) { monto = DESCUENTO_1; vence = f('descuento1VenceAt'); }
  else if (f('descuento2VenceAt') > ahora) { monto = DESCUENTO_2; vence = f('descuento2VenceAt'); }
  if (!monto) return null;
  const { precioMes } = await leerPreciosConfig();
  if (precioMes - monto <= 0) return null;
  return { monto, precioNormal: precioMes, precioFinal: precioMes - monto, venceAt: new Date(vence).toISOString() };
}

// Resumen para el admin: cuántas personas van en cada paso.
export async function resumenSecuencia() {
  const snap = await db.collection(COL).get();
  const r = { registradas: 0, correo1: 0, correo2: 0, correo3: 0, pagaron: 0, pagaronConDescuento: 0, bajas: 0, conError: 0, inicio: null };
  snap.forEach((doc) => {
    const d = doc.data();
    if (doc.id === '_meta') { r.inicio = d.inicio && d.inicio.toDate ? d.inicio.toDate().toISOString() : null; return; }
    if (d.esPrueba) return; // las ofertas de prueba del admin no cuentan
    r.registradas++;
    if (d.correo1At) r.correo1++;
    if (d.correo2At) r.correo2++;
    if (d.correo3At) r.correo3++;
    if (d.estado === 'pagado') { r.pagaron++; if (d.descuentoUsado) r.pagaronConDescuento++; }
    if (d.estado === 'baja') r.bajas++;
    if (d.estado === 'error') r.conError++;
  });
  return r;
}

// Envía los 3 correos de ejemplo a una dirección (para que el admin los vea en su bandeja).
export async function enviarPruebas(to, nombre = 'Ana') {
  const { precioMes } = await leerPreciosConfig();
  const urlCta = `${env.panelUrl}/vip-panel.html#suscripcion`;
  const resultados = [];
  for (const [tipo, monto] of [['beneficios', 0], ['descuento1', DESCUENTO_1], ['descuento2', DESCUENTO_2]]) {
    const vence = new Date(Date.now() + VIGENCIA_DESCUENTO);
    const { subject, html } = armarCorreo({ tipo, nombre, precioNormal: precioMes, monto, vence: textoVence(vence), urlCta, urlBaja: `${API_URL}/api/correos/baja?u=prueba&t=prueba` });
    const r = await enviarCorreo({ to, subject: `[PRUEBA] ${subject}`, html });
    resultados.push({ tipo, ok: !!r.ok });
  }
  return resultados;
}

// Para que el admin pruebe el cobro con descuento sin esperar las horas de la secuencia.
// monto 50 o 100 = da esa oferta por 1 hora; monto 0 = la quita. No mete a la cuenta en los correos automáticos.
export async function darOfertaDePrueba(email, monto) {
  const u = await admin.auth().getUserByEmail(String(email || '').trim().toLowerCase()).catch(() => null);
  if (!u) return { error: 'cuenta-no-encontrada' };
  if (await yaPago(u.uid)) return { error: 'ya-es-miembro' };
  const m = Number(monto);
  const vence = Timestamp.fromDate(new Date(Date.now() + HORA));
  const datos = {
    uid: u.uid, email: (u.email || '').toLowerCase(), nombre: u.displayName || '',
    estado: 'prueba', esPrueba: true, paso: 3,
    descuento1VenceAt: m === DESCUENTO_1 ? vence : FieldValue.delete(),
    descuento2VenceAt: m === DESCUENTO_2 ? vence : FieldValue.delete(),
    pruebaAt: FieldValue.serverTimestamp()
  };
  await db.collection(COL).doc(u.uid).set(datos, { merge: true });
  return { ok: true, email: datos.email, monto: [DESCUENTO_1, DESCUENTO_2].includes(m) ? m : 0, venceAt: [DESCUENTO_1, DESCUENTO_2].includes(m) ? vence.toDate().toISOString() : null };
}

export async function darDeBaja(uid) {
  await db.collection(COL).doc(uid).set({ estado: 'baja', bajaAt: FieldValue.serverTimestamp() }, { merge: true });
}

// Se llama cuando una compra se confirma: la secuencia se cierra y queda anotado qué descuento usó.
export async function marcarPagado(uid, montoDescuento) {
  if (!uid) return;
  const ref = db.collection(COL).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.set({ estado: 'pagado', pagadoAt: FieldValue.serverTimestamp(), descuentoUsado: Number(montoDescuento) || 0 }, { merge: true });
}
