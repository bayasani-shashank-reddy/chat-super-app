import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,          // exposes to network (needed for LAN testing)
    proxy: {
      '/api': 'http://localhost:5000'   // fixed: was 5001, server runs on 5000
    }
  }
})