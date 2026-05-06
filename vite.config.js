import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
