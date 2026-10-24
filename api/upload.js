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
    if (size > MAX_BYTES) throw Object.assign(new Error('The file exceeds 4 MB'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  const apiKey = process.env.LIGHTHOUSE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'LIGHTHOUSE_API_KEY is missing on the server' });

  const type = String(req.headers['content-type'] || '').split(';')[0].trim();
  if (!ALLOWED_TYPES.has(type)) return res.status(415).json({ error: 'Only WAV and JSON are accepted' });

  const name = String(req.headers['x-filename'] || 'archivo').replace(/[^\w.-]/g, '_').slice(0, 80);

  try {
    const body = await readBody(req);
    if (!body.length) return res.status(400).json({ error: 'The file is empty' });
    if (body.length > MAX_BYTES) return res.status(413).json({ error: 'The file exceeds 4 MB' });

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
      return res.status(502).json({ error: 'Could not reach Lighthouse. Check your connection and try again.' });
    }
    const text = await r.text();
    if (!r.ok) return res.status(502).json({ error: `Lighthouse replied ${r.status}: ${text.slice(0, 200)}` });

    const data = JSON.parse(text);
    return res.status(200).json({ cid: data.Hash, name: data.Name, size: Number(data.Size) });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Upload error' });
  }
}
