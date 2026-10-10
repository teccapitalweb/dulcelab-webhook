import admin from 'firebase-admin';
import { db, FieldValue } from '../config/firebase.js';
import { enviarInvitacionVip } from './email.js';

// Se ejecuta cada hora. Solo procesa invitaciones que ya cumplieron 24 h;
// el campo estado evita duplicados aunque Railway reinicie el proceso.
export async function procesarOfertasVip() {
  const ahora = new Date();
  const snap = await db.collection('progreso').where('ofertaVip.estado', '==', 'programada').limit(100).get();
  let enviadas = 0;
  for (const doc of snap.docs) {
    const oferta = doc.data().ofertaVip || {};
    const enviar = oferta.enviarDespuesDe?.toDate?.();
    if (!enviar || enviar.getTime() > ahora.getTime()) continue;
    try {
      const usuario = await admin.auth().getUser(doc.id);
      if (!usuario.email) continue;
      const vence = oferta.venceAt?.toDate?.()?.toISOString();
      const correo = await enviarInvitacionVip({ to: usuario.email, nombre: usuario.displayName || usuario.email.split('@')[0], venceAt: vence });
      if (correo.ok) {
        await doc.ref.set({ ofertaVip: { ...oferta, estado: 'enviada', correoEnviadoAt: FieldValue.serverTimestamp() } }, { merge: true });
        enviadas++;
      }
    } catch (error) { console.error('[oferta-vip] correo', doc.id, error.message); }
  }
  return enviadas;
}
