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

/**
 * Envía el reporte por Mailtrap Email API REST.
 * Doc: https://api-docs.mailtrap.io/docs/mailtrap-api-docs/67f1d70aeb62c-send-email
 * Endpoint: POST https://send.api.mailtrap.io/api/send
 * Auth: header Api-Token o Authorization: Bearer {token}
 */
async function enviarConMailtrapApi(destino, bufferZip, ubicacion) {
  const token = process.env.MAILTRAP_API_TOKEN;
  if (!token) throw new Error('MAILTRAP_API_TOKEN no configurado');

  const fromEmail = process.env.REPORT_EMAIL_FROM || 'reportes@demo.mailtrap.io';
  const fromName = process.env.REPORT_EMAIL_FROM_NAME || 'Reportes Mantenimiento';

  const body = {
    from: { email: fromEmail, name: fromName },
    to: [{ email: destino }],
    subject: `Reporte de Mantenimiento – ${ubicacion || 'Sin ubicación'}`,
    text: 'Adjunto encontrará el reporte de mantenimiento correctivo y el acta de evidencia fotográfica (Word y PDF).',
    attachments: [
      {
        filename: 'reporte-mantenimiento.zip',
        content: bufferZip.toString('base64'),
        type: 'application/zip',
        disposition: 'attachment',
      },
    ],
  };

  const res = await fetch('https://send.api.mailtrap.io/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Token': token,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errDetail = errText;
    try {
      const j = JSON.parse(errText);
      if (j.message) errDetail = j.message;
      else if (j.errors) errDetail = JSON.stringify(j.errors);
    } catch (_) {}
    throw new Error(`Mailtrap API ${res.status}: ${errDetail}`);
  }
}

export async function enviarReportePorCorreo(destino, bufferZip, ubicacion) {
  console.log('[email] enviarReportePorCorreo ->', destino, 'zip:', bufferZip?.length, 'bytes');

  if (process.env.MAILTRAP_API_TOKEN) {
    console.log('[email] Usando Mailtrap API (token / dominio demo)');
    try {
      await enviarConMailtrapApi(destino, bufferZip, ubicacion);
      console.log('[email] Correo enviado OK (Mailtrap API) a', destino);
    } catch (err) {
      console.error('[email] Error Mailtrap API:', err.message);
      throw err;
    }
    return;
  }

  const transport = getTransport();
  if (!transport) {
    console.error('[email] SMTP no configurado y no hay MAILTRAP_API_TOKEN');
    throw new Error('Correo no configurado: define MAILTRAP_API_TOKEN o SMTP_HOST, SMTP_USER, SMTP_PASS');
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
