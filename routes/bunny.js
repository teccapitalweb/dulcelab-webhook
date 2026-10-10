// Reproductor protegido de Bunny Stream para BioNova.
// Solo firma videos pertenecientes al catálogo migrado; nunca acepta IDs arbitrarios.

import express from 'express';
import admin from 'firebase-admin';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { db, FieldValue, Timestamp } from '../config/firebase.js';
import { env } from '../config/env.js';
import { getMembership } from '../services/firestore.js';

const router = express.Router();
const catalogo = JSON.parse(
  readFileSync(new URL('../data/dulcelab-bunny-catalog.json', import.meta.url), 'utf8')
);
const videosPermitidos = new Set(
  catalogo.flatMap(curso => (curso.sesiones || []).map(sesion => sesion.videoId)).filter(Boolean)
);
const correosAdmin = new Set([
  'teccapitalweb@gmail.com'
]);

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function verificarAdmin(req) {
  const usuario = await verificarUsuario(req);
  return usuario && correosAdmin.has(String(usuario.email || '').toLowerCase()) ? usuario : null;
}

function fechaISO(valor) {
  const fecha = valor?.toDate?.() || (valor instanceof Date ? valor : null);
  return fecha && !Number.isNaN(fecha.getTime()) ? fecha.toISOString() : null;
}

function diaLocal(fecha) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(fecha);
}

async function listarCuentasAuth() {
  const cuentas = new Map();
  let pageToken;
  do {
    const pagina = await admin.auth().listUsers(1000, pageToken);
    pagina.users.forEach(usuario => cuentas.set(usuario.uid, {
      email: usuario.email || '', nombre: usuario.displayName || usuario.email || 'Miembro'
    }));
    pageToken = pagina.pageToken;
  } while (pageToken);
  return cuentas;
}

function puntajeTitulo(a, b) {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const ta = new Set(na.split(' ').filter(x => x.length > 2));
  const tb = new Set(nb.split(' ').filter(x => x.length > 2));
  const union = new Set([...ta, ...tb]);
  let inter = 0;
  tb.forEach(x => { if (ta.has(x)) inter++; });
  return union.size ? inter / union.size : 0;
}

let muestraCache = { videoId: null, vence: 0 };

async function obtenerVideoMuestra() {
  if (muestraCache.vence > Date.now()) return muestraCache.videoId;

  const snap = await db.collection('cursos').orderBy('orden', 'asc').get();
  let videoId = null;
  for (const doc of snap.docs) {
    const curso = doc.data() || {};
    if (curso.marcarProximamente === true) continue;
    const primera = Array.isArray(curso.sesiones) && curso.sesiones.length > 1 ? curso.sesiones[0] : null; // la última clase nunca es muestra
    if (!primera && !(curso.clases || []).length) continue;

    if (primera?.videoId && videosPermitidos.has(primera.videoId)) {
      videoId = primera.videoId;
      break;
    }

    let mejor = null;
    let score = 0;
    for (const item of catalogo) {
      const actual = puntajeTitulo(curso.titulo, item.titulo);
      if (actual > score) { score = actual; mejor = item; }
    }
    if (mejor && score >= 0.52) {
      videoId = (mejor.sesiones || []).length > 1 ? (mejor.sesiones[0]?.videoId || null) : null;
    }
    break;
  }

  muestraCache = { videoId, vence: Date.now() + 60_000 };
  return videoId;
}

async function verificarUsuario(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    return await admin.auth().verifyIdToken(header.slice(7));
  } catch {
    return null;
  }
}

// ── Prueba gratuita ──
// Cada persona sin membresía elige UN curso (se guarda en progreso/{uid}.cursoPrueba y ya no cambia).
// De ese curso puede ver todas las clases MENOS la última, sin importar cuántas tenga. Esto se valida aquí,
// no en el navegador, para que la última clase no se pueda abrir sin membresía.
async function videoEsDePrueba(uid, videoId) {
  const prog = await db.collection('progreso').doc(uid).get();
  const cursoId = prog.exists ? prog.data().cursoPrueba : null;
  if (!cursoId) return false;
  const doc = await db.collection('cursos').doc(String(cursoId)).get();
  if (!doc.exists) return false;
  const ses = Array.isArray(doc.data().sesiones) ? doc.data().sesiones : [];
  const i = ses.findIndex(x => x && (x.videoId === videoId || x.url === videoId));
  return i >= 0 && i < ses.length - 1;
}

// POST /api/bunny/curso-prueba · { cursoId } → { cursoId }. La primera elección gana; las siguientes devuelven la guardada.
router.post('/curso-prueba', async (req, res) => {
  try {
    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Falta iniciar sesión' });
    const pedido = String(req.body?.cursoId || '').slice(0, 160);
    const ref = db.collection('progreso').doc(usuario.uid);
    const r = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : {};
      if (d.cursoPrueba) return { cursoId: d.cursoPrueba };
      if (!pedido) return { cursoId: null };
      const curso = await tx.get(db.collection('cursos').doc(pedido));
      const c = curso.exists ? curso.data() : null;
      if (!c || c.marcarProximamente === true || c.pruebaGratis === false || !(Array.isArray(c.sesiones) && c.sesiones.length)) {
        return { error: 'curso-no-disponible' };
      }
      tx.set(ref, { cursoPrueba: pedido, cursoPruebaAt: FieldValue.serverTimestamp() }, { merge: true });
      return { cursoId: pedido };
    });
    if (r.error) return res.status(400).json({ error: r.error });
    res.set('Cache-Control', 'no-store');
    return res.json(r);
  } catch (error) {
    console.error('[Bunny curso-prueba]', error);
    return res.status(500).json({ error: 'No se pudo guardar el curso de prueba' });
  }
});

// GET /api/bunny/pruebas-gratis · resumen privado para el administrador.
// La elección se guarda en progreso/{uid}; los datos de pago viven en miembros/{uid}.
// Se cruzan en el servidor para no publicar correos ni estados de membresía fuera del panel admin.
router.get('/pruebas-gratis', async (req, res) => {
  try {
    if (!await verificarAdmin(req)) return res.status(403).json({ error: 'Solo un administrador puede ver las pruebas gratuitas' });

    const [progresoSnap, miembrosSnap, cursosSnap, cuentasAuth] = await Promise.all([
      db.collection('progreso').get(),
      db.collection('miembros').get(),
      db.collection('cursos').get(),
      listarCuentasAuth()
    ]);
    const miembros = new Map();
    miembrosSnap.docs.forEach(doc => {
      const data = doc.data() || {};
      if (data.uid) miembros.set(String(data.uid), data);
      miembros.set(doc.id, data);
    });
    const cursos = new Map(cursosSnap.docs.map(doc => [doc.id, doc.data() || {}]));
    const elegidas = progresoSnap.docs.map(doc => {
      const data = doc.data() || {};
      if (!data.cursoPrueba) return null;
      const miembro = miembros.get(doc.id) || {};
      const cuenta = cuentasAuth.get(doc.id) || {};
      const curso = cursos.get(String(data.cursoPrueba)) || {};
      const elegidaAt = data.cursoPruebaAt || data.updatedAt || data.createdAt || null;
      return {
        uid: doc.id,
        cursoId: String(data.cursoPrueba),
        curso: String(curso.titulo || 'Curso eliminado'),
        nombre: String(miembro.nombre || miembro.displayName || cuenta.nombre || miembro.email || 'Miembro'),
        email: String(miembro.email || cuenta.email || ''),
        pagado: miembro.activa === true || miembro.activo === true,
        fecha: fechaISO(elegidaAt),
        orden: (elegidaAt?.toDate?.() || new Date(0)).getTime()
      };
    }).filter(Boolean);
    const miembrosUnicos = new Map();
    miembrosSnap.docs.forEach(doc => {
      const data = doc.data() || {};
      const clave = String(data.uid || doc.id);
      miembrosUnicos.set(clave, data);
    });
    const cursoConteo = new Map();
    elegidas.forEach(x => cursoConteo.set(x.cursoId, (cursoConteo.get(x.cursoId) || 0) + 1));
    const hoy = new Date();
    const serie = Array.from({ length: 14 }, (_, i) => {
      const fecha = new Date(hoy.getTime() - (13 - i) * 86400000);
      return { dia: diaLocal(fecha), cantidad: 0 };
    });
    const porDia = new Map(serie.map(x => [x.dia, x]));
    elegidas.forEach(x => {
      if (!x.fecha) return;
      const fila = porDia.get(diaLocal(new Date(x.fecha)));
      if (fila) fila.cantidad++;
    });
    const totalCuentas = Math.max(cuentasAuth.size, miembrosUnicos.size);
    const elegidasPagadas = elegidas.filter(x => x.pagado).length;
    const pagaronSinElegir = [...miembrosUnicos.entries()].filter(([uid, m]) =>
      (m.activa === true || m.activo === true) && !elegidas.some(x => x.uid === uid)
    ).length;
    res.set('Cache-Control', 'no-store');
    return res.json({
      totales: {
        elegidas: elegidas.length,
        cuentas: totalCuentas,
        sinElegir: Math.max(0, totalCuentas - elegidas.length),
        eligieronYPagaron: elegidasPagadas,
        pagaronSinElegir
      },
      cursos: [...cursoConteo.entries()].map(([id, cantidad]) => ({
        id, titulo: String(cursos.get(id)?.titulo || 'Curso eliminado'), cantidad
      })).sort((a, b) => b.cantidad - a.cantidad || a.titulo.localeCompare(b.titulo, 'es')),
      serie,
      ultimas: elegidas.sort((a, b) => b.orden - a.orden).slice(0, 30).map(({ orden, ...x }) => x)
    });
  } catch (error) {
    console.error('[Bunny pruebas-gratis]', error);
    return res.status(500).json({ error: 'No se pudo obtener el resumen de pruebas gratuitas' });
  }
});

// Programa la invitación después de que la persona agota su parte gratuita.
// No activa nada aquí: el correo sale 24 h después y el usuario debe aceptar.
router.post('/oferta-vip', async (req, res) => {
  try {
    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Falta iniciar sesión' });
    const cursoId = String(req.body?.cursoId || '').slice(0, 160);
    const ref = db.collection('progreso').doc(usuario.uid);
    const ahora = new Date();
    const resultado = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const progreso = snap.exists ? snap.data() : {};
      if (!cursoId || progreso.cursoPrueba !== cursoId) return { error: 'curso-prueba-invalido' };
      const oferta = progreso.ofertaVip || {};
      if (oferta.estado) return { estado: oferta.estado, yaExiste: true };
      tx.set(ref, { ofertaVip: {
        estado: 'programada', cursoId,
        creadaAt: FieldValue.serverTimestamp(),
        enviarDespuesDe: Timestamp.fromDate(new Date(ahora.getTime() + 24 * 60 * 60 * 1000)),
        venceAt: Timestamp.fromDate(new Date(ahora.getTime() + 72 * 60 * 60 * 1000))
      } }, { merge: true });
      return { estado: 'programada' };
    });
    if (resultado.error) return res.status(400).json(resultado);
    return res.json(resultado);
  } catch (error) {
    console.error('[Bunny oferta-vip]', error);
    return res.status(500).json({ error: 'No se pudo programar el regalo VIP' });
  }
});

// El enlace del correo solo abre el panel; este POST es la aceptación real.
router.post('/activar-oferta-vip', async (req, res) => {
  try {
    const usuario = await verificarUsuario(req);
    if (!usuario) return res.status(401).json({ error: 'Falta iniciar sesión' });
    const miembro = await getMembership(usuario.uid);
    if (miembro.activa && !miembro.certificadoBloqueado) return res.status(409).json({ error: 'Tu membresía ya está activa' });
    const ref = db.collection('progreso').doc(usuario.uid);
    const ahora = new Date();
    const resultado = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const oferta = snap.exists ? (snap.data().ofertaVip || {}) : {};
      const vence = oferta.venceAt?.toDate?.();
      if (oferta.estado === 'activada' && oferta.vipHasta?.toDate?.()?.getTime() > ahora.getTime()) return { ok: true, hasta: oferta.vipHasta.toDate().toISOString() };
      if (oferta.estado !== 'enviada' || !vence || vence.getTime() <= ahora.getTime()) return { error: 'oferta-no-disponible' };
      const hasta = new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000);
      tx.set(ref, { ofertaVip: { ...oferta, estado: 'activada', activadaAt: FieldValue.serverTimestamp(), vipHasta: Timestamp.fromDate(hasta) } }, { merge: true });
      return { ok: true, hasta: hasta.toISOString() };
    });
    if (resultado.error) return res.status(400).json(resultado);
    return res.json(resultado);
  } catch (error) {
    console.error('[Bunny activar-oferta-vip]', error);
    return res.status(500).json({ error: 'No se pudo activar el regalo VIP' });
  }
});

router.post('/embed-token', async (req, res) => {
  try {
    if (!env.bunnyTokenAuthKey) {
      return res.status(503).json({ error: 'Bunny Stream no está configurado en Railway' });
    }

    const videoId = String(req.body?.videoId || '').trim();
    if (!videosPermitidos.has(videoId)) {
      return res.status(404).json({ error: 'Video no encontrado en el catálogo de DulceLab Food' });
    }

    const usuario = await verificarUsuario(req);
    // La muestra abierta (primera clase del primer curso) es solo para visitantes sin cuenta.
    const muestraId = usuario ? null : await obtenerVideoMuestra();
    const esMuestra = videoId === muestraId;
    const esAdmin = Boolean(usuario && (
      usuario.admin === true || correosAdmin.has(String(usuario.email || '').toLowerCase())
    ));
    let tieneAcceso = esAdmin;
    if (usuario && !tieneAcceso) {
      const membresia = await getMembership(usuario.uid);
      tieneAcceso = membresia.activa === true || membresia.activo === true;
    }

    let esPrueba = false;
    if (usuario && !tieneAcceso) esPrueba = await videoEsDePrueba(usuario.uid, videoId);

    if (!esMuestra && !tieneAcceso && !esPrueba) {
      return res.status(403).json({ error: 'Membresía requerida' });
    }

    const expires = Math.floor(Date.now() / 1000) + env.bunnyTokenTtlSeconds;
    const token = createHash('sha256')
      .update(env.bunnyTokenAuthKey + videoId + expires)
      .digest('hex');
    const embedUrl = `https://iframe.mediadelivery.net/embed/${env.bunnyStreamLibraryId}/${videoId}?token=${token}&expires=${expires}`;

    res.set('Cache-Control', 'no-store');
    return res.json({ embedUrl, expires, esMuestra: esMuestra || esPrueba });
  } catch (error) {
    console.error('[Bunny embed-token]', error);
    return res.status(500).json({ error: 'No se pudo autorizar el reproductor' });
  }
});

export default router;
