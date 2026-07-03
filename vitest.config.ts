import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate from vite.config.ts on purpose: the app's vite root is 'app/'
// (index.html there loads ../src/main.tsx), but source and tests live at the
// repo root under src/. This config leaves `root` at its default (repo root)
// so `src/**` resolves for the test run.
export default defineConfig({
  plugins: [react()],
  // __DEPLOY_ENV__ is injected by vite `define` in the real build; define it here
  // too so components that read it don't hit a ReferenceError under test. Empty
  // string → the badge's hostname fallback path (ENV-BADGE-01).
  define: {
    __DEPLOY_ENV__: JSON.stringify(''),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
