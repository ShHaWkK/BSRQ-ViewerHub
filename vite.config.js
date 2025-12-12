import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxy de développement pour éviter le CORS lorsque le frontend appelle '/api/...'
// La cible peut être personnalisée via VITE_DEV_PROXY_TARGET
// - Local par défaut: http://127.0.0.1:4000
// - Docker Compose éventuel: http://bsrq-livepulse-backend:4000
const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
        secure: false,
        ws: true,
        // Le frontend émet '/api/...' -> on retire le préfixe pour frapper le backend
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  }
});
