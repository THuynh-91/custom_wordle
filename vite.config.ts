import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: './frontend',
  envDir: '..',  // Look for .env files in parent directory
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true
      },
      '/health': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
    sourcemap: true
  }
});
