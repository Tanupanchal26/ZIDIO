import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: { alias: { '@': '/src' } },

  build: {
    target:     'es2020',
    sourcemap:  false,
    cssCodeSplit: true,
    // Raise the inline-asset threshold to 6 KB (reduces HTTP requests)
    assetsInlineLimit: 6144,
    rollupOptions: {
      output: {
        // ── Manual chunks — keep vendor code separate from app code ─────────
        manualChunks: (id) => {
          // React core — tiny, always needed
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }
          // Router — small, needed on every route
          if (id.includes('react-router-dom') || id.includes('@remix-run')) {
            return 'router';
          }
          // State management
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('zustand')) {
            return 'state';
          }
          // Data fetching
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
          // Animation — framer-motion is large, isolate it
          if (id.includes('framer-motion')) {
            return 'motion';
          }
          // Charts — recharts only loaded on dashboard/analytics
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          // Socket.IO
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
            return 'socket';
          }
          // Icons — lucide-react can be large
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          // Forms
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'forms';
          }
          // Catch-all vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Consistent naming for cache busting
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
      },
    },
  },

  // Speed up local dev with pre-bundled deps
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@reduxjs/toolkit', 'react-redux',
      '@tanstack/react-query',
      'axios', 'clsx', 'tailwind-merge',
      'framer-motion', 'lucide-react',
    ],
  },
});
