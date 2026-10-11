import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'https://quanlythietbi-main.onrender.com';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: true
        }
      }
    }
  };
});
