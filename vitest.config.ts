import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Separate from vite.config.ts on purpose: the app's vite root is 'app/'
// (index.html there loads ../src/main.tsx), but source and tests live at the
// repo root under src/. This config leaves `root` at its default (repo root)
// so `src/**` resolves for the test run.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
