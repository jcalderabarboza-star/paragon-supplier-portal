/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHAOS?: string;
  readonly VITE_CHAOS_MIN_MS?: string;
  readonly VITE_CHAOS_MAX_MS?: string;
  readonly VITE_CHAOS_FAILURE_RATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected by vite `define` from process.env.VERCEL_ENV at build time
// ('production' | 'preview' | 'development' | ''). See src/lib/envBadge.ts.
declare const __DEPLOY_ENV__: string;

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}
