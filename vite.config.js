import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build cache bust: 2026-06-09 — Vercel sigue sirviendo bundle viejo
// pese a sources nuevos. Tocar este archivo invalida el cache de Vite.
export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://sala-crespo-backend.onrender.com',
        changeOrigin: true,
        secure: true,
        headers: {
          origin: 'https://www.saladejuegoscrespo.ar',
        },
      },
    },
  },
})
