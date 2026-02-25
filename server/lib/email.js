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

export async function enviarReportePorCorreo(destino, bufferZip, ubicacion) {
  const transport = getTransport();
  if (!transport) {
    throw new Error('Correo no configurado: define SMTP_HOST, SMTP_USER, SMTP_PASS en .env');
  }
  const from = process.env.REPORT_EMAIL_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from: from,
    to: destino,
    subject: `Reporte de Mantenimiento – ${ubicacion || 'Sin ubicación'}`,
    text: 'Adjunto encontrará el reporte de mantenimiento correctivo y el acta de evidencia fotográfica (Word y PDF).',
    attachments: [
      { filename: 'reporte-mantenimiento.zip', content: bufferZip },
    ],
  });
}
