import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Frontend calls /api/* — proxy them to the Express API in server/.
    proxy: { '/api': `http://localhost:${process.env.API_PORT || 8787}` },
  },
})
