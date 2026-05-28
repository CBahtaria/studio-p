import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) return 'forms';
          if (id.includes('@radix-ui')) return 'radix';
        },
      },
    },
    chunkSizeWarningLimit: 800,
    sourcemap: false,
    target: 'es2020',
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
});
