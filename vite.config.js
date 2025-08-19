import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This is the new configuration block
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
    host: 'localhost',
    port: 5173,
    // Add your ngrok hostname here
    allowedHosts: ['f5e75fa35edb.ngrok-free.app'], 
  },
})