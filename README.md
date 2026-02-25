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

### 1. Correo (Mailtrap o Mailgun)

**Objetivo:** que el webhook pueda enviar el ZIP por correo.

- **Mailtrap (pruebas):** [mailtrap.io](https://mailtrap.io) → Inbox → SMTP. No envía a correos reales; ves los mensajes en el panel. Ideal para probar sin spamear.
- **Mailgun (producción):** [mailgun.com](https://www.mailgun.com) → Sending → Domain o SMTP credentials. Para enviar a correos reales.

En `.env`:

```env
SMTP_HOST=smtp.mailtrap.io   # o el que te den (Mailgun: smtp.mailgun.org)
SMTP_PORT=2525               # Mailtrap suele usar 2525; Mailgun 587
SMTP_USER=...
SMTP_PASS=...
REPORT_EMAIL_FROM=reportes@tudominio.com
```

Prueba: `POST /webhook/reporte` con `ubicacion`, `descripcion`, `email`, y opcionalmente fotos. Debe llegar el correo (en Mailtrap lo ves en el inbox).

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
