import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

/**
 * En desarrollo (`pnpm dev`) sirve las funciones de /api igual que Vercel,
 * leyendo las variables secretas de .env.local sin exponerlas al navegador.
 */
function localApi(env) {
  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      Object.assign(process.env, env);
      server.middlewares.use('/api/', async (req, res, next) => {
        const route = req.url.split('?')[0].replace(/^\//, '');
        if (!/^[\w-]+$/.test(route)) return next();
        let handler;
        try {
          handler = (await server.ssrLoadModule(`/api/${route}.js`)).default;
        } catch {
          return next();
        }
        // Adaptador mínimo de la respuesta de Vercel.
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
        try {
          await handler(req, res);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // '' = cargar todas las variables, también las que no empiezan con VITE_ (solo para el servidor local).
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Las librerías de NEAR usan Buffer y otras APIs de Node en el navegador.
    plugins: [nodePolyfills(), react(), localApi(env)],
    // FFmpeg (huella acústica) carga su propio worker y WASM: no debe pre-empaquetarse.
    optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
    worker: { format: 'es' },
  };
});
