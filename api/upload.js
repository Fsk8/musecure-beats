// Función de Vercel: sube un archivo a IPFS con Lighthouse.
// La clave de Lighthouse vive solo en el servidor (variable LIGHTHOUSE_API_KEY), nunca en el navegador:
// con ella se pueden subir y también borrar archivos de la cuenta.
//
// Uso: POST /api/upload con el archivo como cuerpo y los encabezados
//   Content-Type: audio/wav | application/json
//   X-Filename:   nombre del archivo
// Respuesta: { cid, name, size }

const LIGHTHOUSE_ADD = 'https://upload.lighthouse.storage/api/v0/add?cid-version=1';
// Las funciones de Vercel aceptan cuerpos de hasta 4,5 MB.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['audio/wav', 'application/json']);

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BYTES) throw Object.assign(new Error('El archivo supera 4 MB'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Usa POST' });
  }

  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Falta LIGHTHOUSE_API_KEY en el servidor' });

  const type = String(req.headers['content-type'] || '').split(';')[0].trim();
  if (!ALLOWED_TYPES.has(type)) return res.status(415).json({ error: 'Solo se aceptan WAV y JSON' });

  const name = String(req.headers['x-filename'] || 'archivo').replace(/[^\w.-]/g, '_').slice(0, 80);

  try {
    const body = await readBody(req);
    if (!body.length) return res.status(400).json({ error: 'El archivo está vacío' });
    if (body.length > MAX_BYTES) return res.status(413).json({ error: 'El archivo supera 4 MB' });

    const form = new FormData();
    form.append('file', new Blob([body], { type }), name);
    let r;
    try {
      r = await fetch(LIGHTHOUSE_ADD, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } catch {
      return res.status(502).json({ error: 'No se pudo conectar con Lighthouse. Revisa tu conexión e inténtalo de nuevo.' });
    }
    const text = await r.text();
    if (!r.ok) return res.status(502).json({ error: `Lighthouse respondió ${r.status}: ${text.slice(0, 200)}` });

    const data = JSON.parse(text);
    return res.status(200).json({ cid: data.Hash, name: data.Name, size: Number(data.Size) });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Error al subir' });
  }
}
