import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/@supabase/') || id.includes('/@supabase-js/')) return 'supabase-vendor';
          if (id.includes('/framer-motion/')) return 'motion-vendor';
          if (id.includes('/lucide-react/')) return 'icon-vendor';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router/')) {
            return 'react-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
  server: {
    proxy: {
      '/aladin-api': {
        target: 'http://www.aladin.co.kr/ttb/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/aladin-api/, '')
      }
    }
  }
})
