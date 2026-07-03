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
  // Expose Vercel's build-time VERCEL_ENV ('production' | 'preview' |
  // 'development') to the client as __DEPLOY_ENV__ — the deploy-path-independent
  // signal the env badge keys off (ENV-BADGE-01). Empty off-Vercel, where the
  // badge falls back to the hostname allowlist.
  define: {
    __DEPLOY_ENV__: JSON.stringify(process.env.VERCEL_ENV ?? ''),
  },
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
}));
