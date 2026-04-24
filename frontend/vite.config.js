import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          '3d-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'sentry': ['@sentry/react', '@sentry/vite-plugin']
        }
      }
    }
  }
})
