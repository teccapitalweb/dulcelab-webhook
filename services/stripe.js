// ═══════════════════════════════════════════════════════════════════
// services/stripe.js · handlers de eventos de Stripe
// Cada función procesa un tipo específico de evento del webhook
// ═══════════════════════════════════════════════════════════════════

import { stripe, STRIPE_CONFIG, SOURCE } from '../config/stripe.js';
import {
  upsertMiembro, updateMiembroBySubscription, registrarPago,
  buscarMiembro, marcarCancelacionProgramada, marcarReactivacion,
  leerPreciosConfig
} from './firestore.js';
import { enviarBienvenida } from './email.js';
import { db, FieldValue } from '../config/firebase.js';

// ───────────────────────────────────────────────────────────────
// Compatibilidad con versiones nuevas de la API de Stripe.
// El destino del webhook puede entregar los eventos en una versión más nueva
// que la que fija este servidor ('2024-06-20'). En las nuevas, el fin del periodo
// vive en los items de la suscripción y la factura guarda la suscripción en
// parent.subscription_details. Estas funciones leen ambos formatos, y para los
// eventos de suscripción/factura se vuelve a leer el objeto con el cliente fijo.
// ───────────────────────────────────────────────────────────────
function finPeriodo(sub) {
  return sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end ?? null;
}
function subIdDeInvoice(inv) {
  const v = inv?.subscription ?? inv?.parent?.subscription_details?.subscription ?? null;
  return typeof v === 'string' ? v : (v && v.id) || null;
}
async function aVersionFija(tipo, obj) {
  try {
    if (tipo === 'subscription') return await stripe.subscriptions.retrieve(obj.id);
    if (tipo === 'invoice') return await stripe.invoices.retrieve(obj.id);
  } catch (e) {
    console.warn('⚠️  No se pudo releer', tipo, obj?.id, '· se usa el evento tal cual:', e.message);
  }
  return obj;
}

// ───────────────────────────────────────────────────────────────
// checkout.session.completed → activa la membresía en Firestore.
// ───────────────────────────────────────────────────────────────
export async function handleCheckoutCompleted(session) {
  // ⚠️ FILTRO MULTI-PROYECTO: esta cuenta Stripe es compartida por varios
  // proyectos (IMDIIL, OdonTeck, etc.). Solo procesamos pagos de BioNova.
  // Si el pago trae un source de OTRO proyecto, lo ignoramos para no activar
  // miembros ni mandar correos cruzados.
  const src = session.metadata?.source || '';
  if (src !== SOURCE) {
    console.log(`⏭️  Ignorado: pago de otro proyecto (source="${src}", esperaba "${SOURCE}")`);
    return;
  }

  // Una misma compra puede procesarse por dos caminos (el webhook de Stripe y la confirmación
  // que hace el panel al regresar del pago). Se anota la sesión para no activar ni escribir dos veces.
  const marca = db.collection('stripe_sesiones').doc(session.id);
  if ((await marca.get()).exists) {
    console.log('⏭️  Sesión ya procesada:', session.id);
    return;
  }

  const uid = session.client_reference_id || session.metadata?.uid;
  const email = session.customer_email || session.customer_details?.email;
  let customerId = session.customer;
  let subscriptionId = session.subscription;
  const plan = session.metadata?.plan || 'desconocido';

  // Cupón 100% / total $0: el evento puede llegar SIN customer/subscription.
  // Los resolvemos desde Stripe para poder cancelar después.
  if (!customerId && email) {
    try {
      const cust = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
      if (cust.data.length) customerId = cust.data[0].id;
    } catch (e) { console.warn('⚠️  No se pudo resolver customer por email:', e.message); }
  }
  if (!subscriptionId && customerId) {
    subscriptionId = await subIdBionovaDeCustomer(customerId) || subscriptionId;
  }

  if (!uid && !email) {
    console.warn('⚠️  Checkout sin uid ni email · session:', session.id);
    return;
  }

  // Período de renovación
  let periodoFin = null;
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      periodoFin = new Date(sub.current_period_end * 1000);
    } catch (e) {
      console.warn('⚠️  No pudimos obtener detalles de suscripción:', e.message);
    }
  }

  const docId = await upsertMiembro({ uid, email, plan, customerId, subscriptionId, periodoFin });
  console.log('✅ Miembro activado:', docId, '·', plan, '·', email);

  // Correo de bienvenida (no bloquea ni truena el webhook si falla / no hay key)
  try {
    const nombre = session.customer_details?.name || (email ? email.split('@')[0] : '');
    await enviarBienvenida({ to: email, nombre, plan });
  } catch (e) {
    console.warn('⚠️  No se pudo enviar correo de bienvenida:', e.message);
  }

  try {
    await marca.set({ uid: uid || null, email: email || null, plan, procesadaEn: FieldValue.serverTimestamp() });
  } catch (e) { console.warn('⚠️  No se pudo anotar la sesión:', e.message); }
}

// ───────────────────────────────────────────────────────────────
// Confirmación desde el panel: al volver del pago (?checkout=success&session_id=...) el panel
// le pide al servidor que revise esa sesión directamente en Stripe y active la membresía. Así la
// activación no depende solo de que el webhook llegue bien (secreto mal puesto, retraso, etc.).
// Solo funciona si la sesión es de DulceLab, está pagada y pertenece a la persona que la pide.
// ───────────────────────────────────────────────────────────────
export async function confirmarSesionPagada({ sessionId, uid }) {
  if (!sessionId || !uid) return { ok: false, error: 'faltan-datos' };
  const s = await stripe.checkout.sessions.retrieve(sessionId);
  if ((s.metadata?.source || '') !== SOURCE) return { ok: false, error: 'sesion-ajena' };
  const dueno = s.client_reference_id || s.metadata?.uid || '';
  if (dueno !== uid) return { ok: false, error: 'sesion-de-otra-persona' };
  const pagada = s.status === 'complete' && ['paid', 'no_payment_required'].includes(s.payment_status);
  if (!pagada) return { ok: false, error: 'sin-pago', status: s.status, payment_status: s.payment_status };
  await handleCheckoutCompleted(s);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────────
// customer.subscription.updated / deleted
// ───────────────────────────────────────────────────────────────
export async function handleSubscriptionChange(subscription) {
  const subId = subscription.id;
  const status = subscription.status;
  const activa = ['active', 'trialing'].includes(status);

  const docId = await updateMiembroBySubscription(subId, {
    activa,
    estado: status,
    cancelaAlFinal: !!subscription.cancel_at_period_end,
    fechaProximaRenovacion: finPeriodo(subscription)
      ? new Date(finPeriodo(subscription) * 1000) : null
  });

  if (!docId) {
    // Si no existe en nuestra colección, es de otro proyecto: lo ignoramos.
    console.log('⏭️  Suscripción cambió pero no es de DulceLab Food:', subId);
    return;
  }
  console.log('🔄 Suscripción actualizada:', docId, '·', status, '· activa:', activa);
}

// ───────────────────────────────────────────────────────────────
// invoice.payment_succeeded / failed
// ───────────────────────────────────────────────────────────────
export async function handleInvoicePaid(invoice) {
  const invSubId = subIdDeInvoice(invoice);
  if (!invSubId) return;
  // Solo registramos si la suscripción es nuestra (existe en miembros)
  const docId = await updateMiembroBySubscription(invSubId, {});
  if (!docId) { console.log('⏭️  Invoice de otro proyecto · ignorado'); return; }

  await registrarPago({
    invoiceId: invoice.id,
    subscriptionId: invSubId,
    customerId: invoice.customer,
    email: invoice.customer_email,
    monto: (invoice.amount_paid || 0) / 100,
    moneda: invoice.currency,
    estado: 'pagado',
    fechaPago: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000) : new Date()
  });
  console.log('💰 Pago registrado:', invoice.id, '·', (invoice.amount_paid / 100), invoice.currency);
}

export async function handleInvoiceFailed(invoice) {
  const invSubId = subIdDeInvoice(invoice);
  if (!invSubId) return;
  const docId = await updateMiembroBySubscription(invSubId, {});
  if (!docId) return;

  await registrarPago({
    invoiceId: invoice.id,
    subscriptionId: invSubId,
    customerId: invoice.customer,
    email: invoice.customer_email,
    monto: (invoice.amount_due || 0) / 100,
    moneda: invoice.currency,
    estado: 'fallido',
    fechaPago: new Date()
  });
  console.log('⚠️  Pago falló:', invoice.id);
}

// ───────────────────────────────────────────────────────────────
// Crear sesión de Embedded Checkout (con cupones)
// ───────────────────────────────────────────────────────────────
// MODIFICADO (patrón SYNOVA): en vez de un Price ID fijo, arma el precio en
// el momento leyendo config/club — cambiar el precio en vip-admin cambia el
// cobro real desde la siguiente suscripción, sin tocar Stripe ni Railway.
export async function createCheckoutSession({ plan, uid, email }) {
  if (!['mensual', 'anual'].includes(plan)) {
    throw new Error('Plan inválido (debe ser mensual o anual)');
  }
  const { precioMes, precioAno } = await leerPreciosConfig();
  const montoMXN = plan === 'mensual' ? precioMes : precioAno;
  const interval = plan === 'mensual' ? 'month' : 'year';

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: 'mxn',
        unit_amount: Math.round(montoMXN * 100),
        recurring: { interval },
        product_data: {
          name: `DulceLab Food VIP · Plan ${plan === 'mensual' ? 'Mensual' : 'Anual'}`,
          metadata: { plan, source: SOURCE }
        }
      },
      quantity: 1
    }],
    allow_promotion_codes: true,                       // campo de cupón en el checkout
    client_reference_id: uid || undefined,
    customer_email: email || undefined,
    metadata: { plan, uid: uid || '', source: SOURCE, precioAlCobrar: String(montoMXN) }, // ← marca de proyecto
    subscription_data: {
      metadata: { plan, uid: uid || '', source: SOURCE }
    },
    return_url: `${STRIPE_CONFIG.panelUrl}/vip-panel.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    locale: 'es-419',
    payment_method_types: ['card']
  });

  return { clientSecret: session.client_secret, sessionId: session.id };
}

export async function retrieveSession(sessionId) {
  const s = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    status: s.status,
    payment_status: s.payment_status,
    customer_email: s.customer_details?.email,
    plan: s.metadata?.plan
  };
}

// helper a prueba de balas: localiza el subId de un miembro;
// si no lo tiene guardado, lo busca en Stripe por customerId.
// ¿Esta suscripción es de BioNova? Por etiqueta source O por su precio.
// (La cuenta de Stripe es compartida entre consultoras; con cupón 100% el
//  metadata.source puede no quedar, así que el precio es el identificador firme.)
// NOTA MIGRACIÓN: las suscripciones nuevas usan price_data dinámico (sin Price
// ID fijo) pero SIEMPRE llevan metadata.source en subscription_data, así que
// pasan por la primera condición. El chequeo por Price ID queda solo para
// suscripciones viejas creadas antes de la migración.
function esSubBionova(s) {
  if ((s.metadata?.source || '') === SOURCE) return true;
  const ids = [STRIPE_CONFIG.priceMensual, STRIPE_CONFIG.priceAnual].filter(Boolean);
  return (s.items?.data || []).some(it => ids.includes(it.price?.id));
}

async function subIdBionovaDeCustomer(customerId) {
  if (!customerId) return null;
  try {
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
    const vivas = subs.data.filter(s => !['canceled', 'incomplete_expired'].includes(s.status));
    const bio = vivas.find(esSubBionova) || subs.data.find(esSubBionova) || vivas[0] || null;
    return bio ? bio.id : null;
  } catch (e) {
    console.warn('⚠️  No se pudo listar suscripciones por customer:', e.message);
    return null;
  }
}

async function resolverSubId(data) {
  let subId = data.stripeSubscriptionId || data.subscriptionId || null;
  if (subId) return subId;
  let customerId = data.stripeCustomerId || data.customerId;
  // Sin customer guardado (p.ej. activado con cupón 100%): búscalo por email.
  if (!customerId && data.email) {
    try {
      const cust = await stripe.customers.list({ email: data.email, limit: 1 });
      if (cust.data.length) customerId = cust.data[0].id;
    } catch (e) {
      console.warn('⚠️  No se pudo resolver customer por email:', e.message);
    }
  }
  return await subIdBionovaDeCustomer(customerId);
}

// ───────────────────────────────────────────────────────────────
// Cancelar suscripción (al final del periodo, conserva acceso)
// ───────────────────────────────────────────────────────────────
export async function cancelarSuscripcion({ uid, email }) {
  const miembro = await buscarMiembro({ uid, email });
  if (!miembro) throw new Error('No encontramos tu membresía');

  const subId = await resolverSubId(miembro.data);
  if (!subId) throw new Error('No hay suscripción activa que cancelar');

  const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true });

  const finAcceso = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : (miembro.data.fechaProximaRenovacion?.toDate?.() || null);

  await marcarCancelacionProgramada(miembro.ref, finAcceso);
  return { finAcceso: finAcceso ? finAcceso.toISOString() : null };
}

// ───────────────────────────────────────────────────────────────
// Reactivar suscripción (revierte cancelación programada)
// ───────────────────────────────────────────────────────────────
export async function reactivarSuscripcion({ uid, email }) {
  const miembro = await buscarMiembro({ uid, email });
  if (!miembro) throw new Error('No encontramos tu membresía');

  const subId = await resolverSubId(miembro.data);
  if (!subId) throw new Error('No hay suscripción que reactivar');

  const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: false });
  await marcarReactivacion(miembro.ref);

  const proxRenov = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString() : null;
  return { reactivada: true, proximaRenovacion: proxRenov };
}

// ───────────────────────────────────────────────────────────────
// Portal de facturación de Stripe (cambiar tarjeta, ver facturas)
// ───────────────────────────────────────────────────────────────
export async function crearBillingPortal({ uid, email }) {
  const miembro = await buscarMiembro({ uid, email });
  if (!miembro) throw new Error('No encontramos tu membresía');
  const customerId = miembro.data.stripeCustomerId || miembro.data.customerId;
  if (!customerId) throw new Error('No hay cliente de Stripe asociado');

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${STRIPE_CONFIG.panelUrl}/vip-panel.html`
  });
  return { url: portal.url };
}

// ───────────────────────────────────────────────────────────────
// Verificar firma del webhook (seguridad)
// ───────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
// Diagnóstico de pagos (lo usa la sección "Pagos" del panel de administración)
// ───────────────────────────────────────────────────────────────
// El webhook anota aquí cuándo llegó el último aviso de Stripe y cuándo rechazó uno por firma
// (secreto mal puesto), para poder revisarlo sin abrir los registros de Railway.
export async function registrarEstadoWebhook(datos) {
  try {
    await db.collection('stripe_estado').doc('webhook').set({ ...datos, actualizadoEn: FieldValue.serverTimestamp() }, { merge: true });
  } catch (e) { console.warn('⚠️  No se pudo anotar el estado del webhook:', e.message); }
}

export async function leerEstadoWebhook() {
  const d = await db.collection('stripe_estado').doc('webhook').get();
  if (!d.exists) return {};
  const x = d.data();
  const iso = (t) => (t && t.toDate ? t.toDate().toISOString() : null);
  return {
    ultimoEventoEn: iso(x.ultimoEventoEn), ultimoEventoTipo: x.ultimoEventoTipo || null,
    ultimoRechazoEn: iso(x.ultimoRechazoEn), ultimoRechazoMotivo: x.ultimoRechazoMotivo || null,
    ultimoErrorEn: iso(x.ultimoErrorEn), ultimoErrorMotivo: x.ultimoErrorMotivo || null
  };
}

// Últimos intentos de pago de DulceLab (la cuenta de Stripe es compartida: se filtran por la marca source).
export async function listarIntentosPago({ limite = 30 } = {}) {
  const propias = [];
  let after;
  for (let pagina = 0; pagina < 5 && propias.length < limite; pagina++) {
    const r = await stripe.checkout.sessions.list({ limit: 100, ...(after ? { starting_after: after } : {}) });
    for (const s of r.data) {
      if ((s.metadata?.source || '') === SOURCE) propias.push(s);
      if (propias.length >= limite) break;
    }
    if (!r.has_more || !r.data.length) break;
    after = r.data[r.data.length - 1].id;
  }
  const filas = [];
  for (const s of propias) {
    const uid = s.client_reference_id || s.metadata?.uid || null;
    const procesada = (await db.collection('stripe_sesiones').doc(s.id).get()).exists;
    let activa = false;
    if (uid) { const m = await db.collection('miembros').doc(uid).get(); activa = m.exists ? !!m.data().activa : false; }
    const pagado = s.status === 'complete' && s.payment_status === 'paid';
    const sinCobro = s.status === 'complete' && s.payment_status === 'no_payment_required';
    const estado = pagado ? 'pagado' : sinCobro ? 'completo-sin-cobro' : s.status === 'expired' ? 'expirada' : s.status === 'open' ? 'sin-terminar' : String(s.status);
    filas.push({
      id: s.id, creada: new Date(s.created * 1000).toISOString(),
      email: s.customer_details?.email || s.customer_email || null,
      plan: s.metadata?.plan || null,
      monto: (s.amount_total || 0) / 100, descuento: (s.total_details?.amount_discount || 0) / 100,
      estado, activa, procesada, puedeActivar: (pagado || sinCobro) && !activa
    });
  }
  return filas;
}

// El administrador activa a mano una compra completa que no se activó sola.
export async function activarSesionAdmin(sessionId) {
  const s = await stripe.checkout.sessions.retrieve(String(sessionId || ''));
  if ((s.metadata?.source || '') !== SOURCE) return { ok: false, error: 'sesion-ajena' };
  const ok = s.status === 'complete' && ['paid', 'no_payment_required'].includes(s.payment_status);
  if (!ok) return { ok: false, error: 'sin-pago', status: s.status, payment_status: s.payment_status };
  await db.collection('stripe_sesiones').doc(s.id).delete().catch(() => {});
  await handleCheckoutCompleted(s);
  return { ok: true };
}

export function verifyWebhookSignature(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, STRIPE_CONFIG.webhookSecret);
}

// ───────────────────────────────────────────────────────────────
// Dispatcher de eventos
// ───────────────────────────────────────────────────────────────
export async function processWebhookEvent(event) {
  console.log('📥 Stripe event:', event.type, '·', event.id);
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object); break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(await aVersionFija('subscription', event.data.object)); break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaid(await aVersionFija('invoice', event.data.object)); break;
    case 'invoice.payment_failed':
      await handleInvoiceFailed(await aVersionFija('invoice', event.data.object)); break;
    default:
      console.log('   (sin handler para este evento)');
  }
}

// helper público para que admin.js resuelva subId a prueba de balas
export { resolverSubId };
