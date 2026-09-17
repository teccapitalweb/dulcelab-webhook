# DulceLab Food VIP · Webhook

Backend Stripe + cron NewsData para el club VIP de DulceLab Food
(gastronomía y alimentos). Se despliega en **Railway**, como su propio
servicio — independiente del webhook de BioNova, aunque comparten
la misma cuenta de Stripe de TEC CAPITAL.

Misma arquitectura modular que BioNova/IMDIIL/OdonTeck. La cuenta de
Stripe es **compartida** con las otras plataformas — por eso el
webhook filtra por `metadata.source === 'dulcelab'` y **ignora**
pagos de otros proyectos. Esto significa que **NO** necesitas una
cuenta de Stripe nueva ni un `STRIPE_SECRET_KEY` distinto: reusa el
mismo que ya usan BioNova/IMDIIL en Railway.

## Estructura
```
config/    env, firebase, stripe
services/  stripe, firestore, email, news
routes/    stripe, membership, admin, news, health
index.js   entry point
```

## Antes de desplegar — 3 pendientes marcados en el código
1. `routes/admin.js` y `routes/bunny.js` → `ADMIN_EMAILS` tiene un
   placeholder `CAMBIA-ESTE-CORREO@dulcelabfood.com`. Pon ahí los
   MISMOS correos que pusiste en `ADMINS` de `vip-auth.html` /
   `vip-admin.html` en el repo del frontend.
2. `data/dulcelab-bunny-catalog.json` y `assets/dulcelab-bunny-catalog.js`
   → los 8 cursos ya están, pero con `collectionId` y `sesiones` vacíos.
   Se llenan cuando subas los videos a Bunny Stream.
3. `config/env.js` → el `cronSecret` por default dice
   `dulcelab-secret-CAMBIA-ESTO-2026`, mejor sobreescríbelo con tu
   propio `CRON_SECRET` en las variables de Railway.

## Variables de entorno en Railway (Settings → Variables)
| Variable | Valor |
|---|---|
| `STRIPE_SECRET_KEY` | La MISMA que ya usan en el Railway de BioNova/IMDIIL (cuenta compartida) |
| `STRIPE_WEBHOOK_SECRET` | **NUEVA** — se genera al crear el endpoint de webhook (ver abajo), es distinta por cada servicio de Railway |
| `FIREBASE_PROJECT_ID` | `dulcelab-club` |
| `FIREBASE_SERVICE_ACCOUNT` | **NUEVA** — JSON de una cuenta de servicio del proyecto `dulcelab-club` (ver abajo cómo sacarla) |
| `PANEL_URL` | `https://club.dulcelabfood.com` |
| `MAIL_FROM` | `DulceLab Food <noreply@dulcelabfood.com>` (o el correo que uses con Resend) |
| `CRON_SECRET` | El que tú elijas, distinto al de BioNova |
| `RESEND_API_KEY`, `NEWSDATA_API_KEY`, `BUNNY_STREAM_LIBRARY_ID`, `BUNNY_TOKEN_AUTH_KEY` | Opcionales — solo si vas a usar correo transaccional / noticias / Bunny Stream |

### Sacar el `FIREBASE_SERVICE_ACCOUNT`
Firebase Console → proyecto `dulcelab-club` → ⚙️ Configuración del
proyecto → pestaña **Cuentas de servicio** → **Generar nueva clave
privada** → descarga el JSON → pégalo completo (todo el JSON, en una
sola línea o como venga) como valor de esa variable en Railway.

## Deploy en Railway
1. Sube esta carpeta como repo nuevo en GitHub (ej. `dulcelab-webhook`).
2. En Railway → **New Project → Deploy from GitHub repo** → selecciona ese repo.
3. Agrega las variables de la tabla de arriba en **Settings → Variables**.
4. **Redeploy** después de guardar variables (Railway solo las carga al redesplegar).
5. Copia la URL pública que te da Railway (algo como
   `https://dulcelab-webhook-production.up.railway.app`).
6. Pon esa URL en `WEBHOOK_URL` / `WEBHOOK_BASE_URL` dentro de
   `vip-panel.html` (reemplaza el placeholder `TODO-webhook-dulcelab...`).

## Webhook de Stripe (endpoint nuevo, aunque la cuenta sea compartida)
1. Stripe → Developers → Webhooks → **Add endpoint**.
2. URL: `https://<tu-railway-dulcelab>.up.railway.app/stripe/webhook`
3. Eventos: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
4. Copia el **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET` en Railway → Redeploy.

## Endpoints
- `POST /stripe/webhook` — eventos Stripe (raw body + firma)
- `POST /stripe/checkout` — Embedded Checkout con cupones (`allow_promotion_codes`)
- `GET  /stripe/session/:id` — estado de la sesión
- `POST /stripe/cancel-subscription` — cancela al fin de periodo (conserva acceso)
- `POST /stripe/reactivate-subscription` — revierte la cancelación
- `POST /stripe/create-billing-portal` — portal de facturación
- `GET  /membership/:uid` — paywall del panel
- `POST /admin/activar-manual` — activa Mensual/Anual o regala días (admin)
- `POST /admin/cancelar-stripe` — cancela suscripción (admin)
- `POST /admin/eliminar-miembro` — borra Stripe + Firestore + Auth (admin, a prueba de balas)
- `GET  /noticias/sync?secret=` — dispara el cron manualmente
- `GET  /test-correo?to=` — prueba el correo sin gastar pagos
- `GET  /health` — health check

## Nota
Quité el `index.html` que traía el repo original de BioNova: es un
panel admin legacy que `index.js` nunca sirve (no hay
`express.static` ni `sendFile` apuntando a él), así que no hacía
nada en producción. Si en algún momento sí lo usan, avísame y lo
reviso — pero de entrada `vip-admin.html` (en el repo del frontend)
ya cubre esas funciones.
