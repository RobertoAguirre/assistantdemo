/**
 * Descarga medios (fotos) desde las URLs que Twilio envía en el webhook.
 * Las URLs de Twilio requieren Basic auth (Account SID + Auth Token).
 */
export async function fetchTwilioMediaUrls(mediaUrls) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.log('[twilio-media] TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no configurados, omitiendo fotos');
    return [];
  }
  if (!mediaUrls.length) {
    console.log('[twilio-media] Sin URLs de medios');
    return [];
  }

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const fotos = [];

  for (let i = 0; i < mediaUrls.length; i++) {
    const url = mediaUrls[i];
    if (!url) continue;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) {
        console.log('[twilio-media] MediaUrl' + i, 'status', res.status);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || '';
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      fotos.push({ buffer, name: `evidencia_${i + 1}.${ext}` });
      console.log('[twilio-media] Descargada foto', i + 1, buffer.length, 'bytes');
    } catch (e) {
      console.log('[twilio-media] Error descargando MediaUrl' + i, e.message);
    }
  }
  return fotos;
}

/**
 * Parsea el Body del mensaje de WhatsApp.
 * Formato esperado (demo): primera línea = ubicación, resto = descripción.
 * O una sola línea "ubicación | descripción".
 */
export function parseWhatsAppBody(body) {
  const text = (body || '').trim();
  if (!text) return { ubicacion: '', descripcion: '' };

  const firstLineBreak = text.indexOf('\n');
  if (firstLineBreak > 0) {
    return {
      ubicacion: text.slice(0, firstLineBreak).trim(),
      descripcion: text.slice(firstLineBreak + 1).trim(),
    };
  }

  const pipe = text.indexOf('|');
  if (pipe > 0) {
    return {
      ubicacion: text.slice(0, pipe).trim(),
      descripcion: text.slice(pipe + 1).trim(),
    };
  }

  return { ubicacion: text, descripcion: text };
}
