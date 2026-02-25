import nodemailer from 'nodemailer';

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: port ? parseInt(port, 10) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

/** Resend dominio de prueba: sin verificar dominio. No usar REPORT_EMAIL_FROM con Resend. */
const RESEND_SANDBOX_FROM = 'Reportes <onboarding@resend.dev>';

/**
 * Resend: 100/día. Siempre remitente onboarding@resend.dev (sin verificación de dominio).
 * Doc: https://resend.com/docs/api-reference/emails/send-email
 */
async function enviarConResend(destino, bufferZip, ubicacion) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY no configurado');

  const body = {
    from: RESEND_SANDBOX_FROM,
    to: [destino],
    subject: `Reporte de Mantenimiento – ${ubicacion || 'Sin ubicación'}`,
    text: 'Adjunto encontrará el reporte de mantenimiento correctivo y el acta de evidencia fotográfica (Word y PDF).',
    attachments: [
      {
        filename: 'reporte-mantenimiento.zip',
        content: bufferZip.toString('base64'),
      },
    ],
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errDetail = errText;
    try {
      const j = JSON.parse(errText);
      if (j.message) errDetail = j.message;
    } catch (_) {}
    throw new Error(`Resend API ${res.status}: ${errDetail}`);
  }
}

/**
 * Brevo: 300 correos/día gratis. Requiere REPORT_EMAIL_FROM (correo cuenta Brevo).
 */
async function enviarConBrevo(destino, bufferZip, ubicacion) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY no configurado');

  const fromEmail = process.env.REPORT_EMAIL_FROM;
  if (!fromEmail?.trim()) throw new Error('Con Brevo define REPORT_EMAIL_FROM (correo de tu cuenta Brevo)');

  const fromName = process.env.REPORT_EMAIL_FROM_NAME || 'Reportes Mantenimiento';

  const body = {
    sender: { email: fromEmail.trim(), name: fromName },
    to: [{ email: destino }],
    subject: `Reporte de Mantenimiento – ${ubicacion || 'Sin ubicación'}`,
    textContent: 'Adjunto encontrará el reporte de mantenimiento correctivo y el acta de evidencia fotográfica (Word y PDF).',
    attachment: [
      {
        name: 'reporte-mantenimiento.zip',
        content: bufferZip.toString('base64'),
        type: 'application/zip',
      },
    ],
  };

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errDetail = errText;
    try {
      const j = JSON.parse(errText);
      if (j.message) errDetail = j.message;
      else if (j.code) errDetail = `${j.code}: ${j.message || errText}`;
    } catch (_) {}
    throw new Error(`Brevo API ${res.status}: ${errDetail}`);
  }
}

export async function enviarReportePorCorreo(destino, bufferZip, ubicacion) {
  console.log('[email] enviarReportePorCorreo ->', destino, 'zip:', bufferZip?.length, 'bytes');

  if (process.env.RESEND_API_KEY) {
    console.log('[email] Usando Resend');
    try {
      await enviarConResend(destino, bufferZip, ubicacion);
      console.log('[email] Correo enviado OK (Resend) a', destino);
    } catch (err) {
      console.error('[email] Error Resend:', err.message);
      throw err;
    }
    return;
  }

  if (process.env.BREVO_API_KEY) {
    console.log('[email] Usando Brevo');
    try {
      await enviarConBrevo(destino, bufferZip, ubicacion);
      console.log('[email] Correo enviado OK (Brevo) a', destino);
    } catch (err) {
      console.error('[email] Error Brevo:', err.message);
      throw err;
    }
    return;
  }

  const transport = getTransport();
  if (!transport) {
    console.error('[email] No hay RESEND_API_KEY, BREVO_API_KEY ni SMTP configurado');
    throw new Error('Correo no configurado: define RESEND_API_KEY, BREVO_API_KEY o SMTP_*');
  }
  const from = process.env.REPORT_EMAIL_FROM || process.env.SMTP_USER;
  try {
    await transport.sendMail({
      from: from,
      to: destino,
      subject: `Reporte de Mantenimiento – ${ubicacion || 'Sin ubicación'}`,
      text: 'Adjunto encontrará el reporte de mantenimiento correctivo y el acta de evidencia fotográfica (Word y PDF).',
      attachments: [
        { filename: 'reporte-mantenimiento.zip', content: bufferZip },
      ],
    });
    console.log('[email] Correo enviado OK (SMTP) a', destino);
  } catch (err) {
    console.error('[email] Error enviando correo:', err.message);
    if (err.response) console.error('[email] Respuesta SMTP:', err.response);
    throw err;
  }
}
