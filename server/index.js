import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { buildZipBuffer } from './lib/buildZip.js';
import { enviarReportePorCorreo } from './lib/email.js';
import { fetchTwilioMediaUrls, parseWhatsAppBody } from './lib/twilioWhatsApp.js';
import { MOCK_UBICACION, MOCK_DESCRIPCION, getMockFotos } from './lib/mockData.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/**
 * Webhook: recibe ubicación, descripción, email y fotos (multipart).
 * Genera Reporte + Acta (Word/PDF) y envía el ZIP por correo.
 * Uso: desde WhatsApp (Twilio/Meta) o cualquier cliente que envíe POST multipart.
 */
app.post('/webhook/reporte', upload.array('fotos', 10), async (req, res) => {
  try {
    const { ubicacion, descripcion, email } = req.body || {};
    const fotos = (req.files || []).map((f) => ({ buffer: f.buffer, name: f.originalname }));

    if (!ubicacion?.trim() || !descripcion?.trim()) {
      return res.status(400).json({ error: 'Faltan ubicación o descripción' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Falta email de destino' });
    }

    const ubicacionTrim = ubicacion.trim();
    const descripcionTrim = descripcion.trim();
    const emailTrim = email.trim();

    const zipBuffer = await buildZipBuffer(ubicacionTrim, descripcionTrim, fotos);
    await enviarReportePorCorreo(emailTrim, zipBuffer, ubicacionTrim);

    res.json({ ok: true, message: 'Reporte enviado por correo a ' + emailTrim });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message || 'Error generando o enviando reporte' });
  }
});

/**
 * Webhook que Twilio llama cuando llega un mensaje de WhatsApp.
 * Body del mensaje: primera línea = ubicación, resto = descripción (o "ubicación | descripción").
 * Fotos: se envían como archivos adjuntos en el mensaje.
 * El reporte se envía al correo en REPORT_EMAIL_TO.
 */
app.post('/webhook/whatsapp', async (req, res) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('application/json')) {
    return res.status(400).send('Invalid content type');
  }

  const body = req.body?.Body || req.body?.body || '';
  const numMedia = parseInt(req.body?.NumMedia || '0', 10) || 0;
  const mediaUrls = [];
  for (let i = 0; i < numMedia; i++) {
    const url = req.body[`MediaUrl${i}`];
    if (url) mediaUrls.push(url);
  }

  const { ubicacion, descripcion } = parseWhatsAppBody(body);
  const email = (process.env.REPORT_EMAIL_TO || process.env.SMTP_USER || '').trim();

  if (!email) {
    res.type('text/xml').status(200).send(
      '<Response><Message>Error: no hay REPORT_EMAIL_TO configurado en el servidor.</Message></Response>'
    );
    return;
  }
  if (!ubicacion || !descripcion) {
    res.type('text/xml').status(200).send(
      '<Response><Message>Envía: ubicación en la primera línea, descripción en el resto. Opcional: adjunta fotos.</Message></Response>'
    );
    return;
  }

  try {
    const fotos = await fetchTwilioMediaUrls(mediaUrls);
    const zipBuffer = await buildZipBuffer(ubicacion, descripcion, fotos);
    await enviarReportePorCorreo(email, zipBuffer, ubicacion);
    res.type('text/xml').status(200).send(
      '<Response><Message>Reporte generado y enviado a tu correo.</Message></Response>'
    );
  } catch (e) {
    console.error(e);
    res.type('text/xml').status(200).send(
      '<Response><Message>Error al generar el reporte. Revisa los logs.</Message></Response>'
    );
  }
});

/**
 * Prueba de generación: devuelve el ZIP de un reporte demo (sin enviar correo).
 */
app.get('/api/demo', async (_req, res) => {
  try {
    const fotos = getMockFotos();
    const zipBuffer = await buildZipBuffer(MOCK_UBICACION, MOCK_DESCRIPCION, fotos);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-mantenimiento-demo.zip');
    res.send(zipBuffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Error generando demo' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
