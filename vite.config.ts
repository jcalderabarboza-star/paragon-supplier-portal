import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  root: 'app',
  // Root base for all targets. Vercel serves at the domain root (with the
  // vercel.json SPA rewrite); the former '/paragon-supplier-portal/' branch was
  // a GitHub Pages relic (VITE-BASE-01) that broke local `vite preview` and
  // served no purpose once Pages is retired.
  base: '/',
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
