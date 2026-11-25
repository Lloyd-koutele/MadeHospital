import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// En développement, Vite relaie /api vers le backend Spring Boot (BACKEND_URL, 8080 par défaut).
// En production, le frontend est servi par Nginx derrière Traefik, qui route /api vers le backend :
// toutes les URL de l'application restent donc relatives (/api/...).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.BACKEND_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
    },
    server: {
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          // Permet de viser la pile Docker en HTTPS local (certificat mkcert) : BACKEND_URL=https://madehospital.sn
          secure: false,
          // Le navigateur parle à Vite (même origine) : inutile de transmettre son Origin au backend,
          // qui le rejetterait (CORS limité au domaine de production).
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
          },
        },
      },
    },
  };
});
