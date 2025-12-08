import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Permet de proxyfier '/api' vers le backend en dev pour éviter le CORS
// La cible peut être sur-mesure via VITE_DEV_PROXY_TARGET
// - En local: http://127.0.0.1:4000 (par défaut)
// - En Docker Compose: http://bsrq-livepulse-backend:4000
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
  },
});
