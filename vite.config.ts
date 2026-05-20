import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  root: 'app',
  base:
    command === 'serve'
      ? '/'
      : process.env.VERCEL
        ? '/'
        : '/paragon-supplier-portal/',
  publicDir: '../public',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
}));
