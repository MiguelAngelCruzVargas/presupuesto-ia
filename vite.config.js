import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
    host: true, // Escuchar en todas las interfaces (IPv4 e IPv6)
    strictPort: false, // Si el puerto está ocupado, intentar el siguiente
    proxy: {
      '/api/ai': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/ai/, '/api/ai'), // Asegura que la ruta se mantenga
      },
      '/api/ai/chat': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/ai\/chat/, '/api/ai/chat'),
      },
      '/api/ai/pricesearch': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/ai\/pricesearch/, '/api/ai/pricesearch'),
      }
    }
  },
})
