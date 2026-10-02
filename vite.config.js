import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // En desarrollo, /api se reenvía a la API local para no lidiar con CORS.
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_HOST || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
