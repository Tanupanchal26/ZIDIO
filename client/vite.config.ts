import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': '/src' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['lucide-react', 'clsx', 'react-hot-toast'],
          store: ['@reduxjs/toolkit', 'react-redux', 'zustand'],
          query: ['@tanstack/react-query'],
          socket: ['socket.io-client', 'simple-peer']
        }
      }
    }
  }
})
