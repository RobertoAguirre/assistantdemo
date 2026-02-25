# Focus – Reporte de Mantenimiento Correctivo

Backend que recibe por **webhook** ubicación, descripción y fotos; genera **Reporte de Mantenimiento** y **Acta/Evidencia Fotográfica** (Word + PDF) y envía el ZIP por **correo**.

## Cómo correr

```bash
cd server
cp .env.example .env
# Editar .env: SMTP_* y REPORT_EMAIL_FROM
npm install
npm run dev
```

- **Health:** `GET /health`
- **Webhook WhatsApp (demo):** `POST /webhook/whatsapp` — Twilio llama aquí cuando llega un mensaje. El reporte se envía a `REPORT_EMAIL_TO`.
- **Webhook genérico:** `POST /webhook/reporte` — multipart: `ubicacion`, `descripcion`, `email`, `fotos[]`
- **Prueba sin correo:** `GET /api/demo` — descarga un ZIP de ejemplo

## Desplegar en Render

1. Crear **Web Service**, conectar el repo.
2. Build: `npm install`, Start: `npm start`.
3. En **Environment** añadir las variables de `.env.example` (PORT lo asigna Render).
4. La URL del servicio será tu base para el webhook: `https://tu-app.onrender.com/webhook/reporte`.

## Webhook

**POST /webhook/reporte** (Content-Type: multipart/form-data)

| Campo        | Tipo   | Obligatorio | Descripción                    |
|-------------|--------|-------------|---------------------------------|
| ubicacion   | string | Sí          | Dónde se hizo el mantenimiento  |
| descripcion | string | Sí          | Qué se hizo                     |
| email       | string | Sí          | Destino del correo con el ZIP   |
| fotos       | file[] | No          | Imágenes (evidencia antes/después) |

Respuesta 200: `{ "ok": true, "message": "Reporte enviado por correo a ..." }`.

Desde WhatsApp (Twilio/Meta): tu flujo recoge ubicación, texto y fotos del técnico, obtiene el email (del usuario o fijo) y hace este POST al backend; el técnico recibe el reporte por correo.

## Variables de entorno (.env)

Ver **server/.env.example**. Para el demo completo necesitas: `SMTP_*`, `REPORT_EMAIL_FROM`, `REPORT_EMAIL_TO` (destino del reporte por WhatsApp), y `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.

---

## Pasos para dejar el demo funcional (tu lado)

Orden recomendado para ir levantando servicios y tener el flujo completo.

### 1. Correo (probar envío del ZIP)

**Objetivo:** que el webhook envíe el ZIP por correo (incl. adjuntos).

- **Resend (para probar sin configurar dominio):** [Resend](https://resend.com) → API Keys → crear clave. En Render: `RESEND_API_KEY` y **`REPORT_EMAIL_TO` = el mismo email con el que te registraste en Resend** (en modo prueba los correos solo llegan a ese destino). No hace falta verificar dominio; el backend usa `onboarding@resend.dev` como remitente.

- **SendGrid (SMTP, Nodemailer):** [SendGrid](https://sendgrid.com) → API Keys → crear. Settings → Sender Authentication → **Single Sender** (verifica un email). En Render: `SMTP_HOST=smtp.sendgrid.net`, `SMTP_PORT=587`, `SMTP_USER=apikey`, `SMTP_PASS=SG.xxx` (tu API key), `REPORT_EMAIL_FROM=el-email-verificado`. 100 correos/día gratis.

- **Gmail (SMTP):** Contraseña de aplicación de Google → variables `SMTP_*` y `REPORT_EMAIL_FROM` con ese Gmail. Entrega real a cualquier destino.

---

### 2. WhatsApp (Twilio)

**Objetivo:** que el técnico envíe por WhatsApp y tu backend reciba los datos.

- [Twilio Console](https://console.twilio.com) → Messaging → Try it out → Send a WhatsApp message (sandbox).
- O configura un número con WhatsApp (requiere negocio verificado).
- Crea un servicio (p. ej. “Focus Reportes”) y una **Función** o un **Studio Flow** que:
  - Reciba mensaje + ubicación (o texto con ubicación) + fotos.
  - Obtenga el email (del perfil, de base de datos o uno fijo de demo).
  - Haga **POST** a `https://tu-app.onrender.com/webhook/reporte` con `multipart`: `ubicacion`, `descripcion`, `email`, `fotos[]`.

Variables en `.env` (si tu backend recibe primero el webhook de Twilio para WhatsApp):

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

El “demo funcional” aquí es: mensaje por WhatsApp → Twilio llama a tu backend (o a un middleware que reenvía al webhook) → backend genera y envía correo.

---

### 3. Asistente con Claude

**Objetivo:** usar IA para, por ejemplo, extraer o mejorar la descripción (o más adelante voz → texto).

- [Anthropic Console](https://console.anthropic.com) → API Keys → crear clave.
- En `.env`:

```env
ANTHROPIC_API_KEY=...
```

En el backend aún no hay llamadas a Claude; cuando las agregues (p. ej. un paso antes de generar el reporte que reciba texto/audio y devuelva `ubicacion` + `descripcion` mejorada), usarás esta variable.

Orden práctico: **1) Correo → 2) Twilio → 3) Claude**. Así primero validas “webhook → correo”, luego “WhatsApp → webhook → correo”, y por último enriqueces con el asistente.
