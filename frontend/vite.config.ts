import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiPort = process.env.VITE_API_PORT || '8000';

export default defineConfig({
  plugins: [react()],
  server: {
    strictPort: false,
    proxy: {
      '/api': `http://localhost:${apiPort}`,
      '/uploads': `http://localhost:${apiPort}`,
    },
  },
})
