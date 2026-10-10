import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

<<<<<<< HEAD
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
=======
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://quanlythietbi-main.onrender.com',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'https://quanlythietbi-main.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
<<<<<<< Updated upstream
});
=======
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
});
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
});
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
});
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
});
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
});
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
=======
});
>>>>>>> 64fdb63c918a251c7dec6851826f3f6b16932521
>>>>>>> Stashed changes
