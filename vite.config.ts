import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// ── ⚠️ `npm run dev` SERVED A BLANK PAGE, AND THE BUILD COULD NEVER SAY SO ────
//
// The vite root is `app/` and the entry it loads is `../src/main.tsx` — OUTSIDE
// that root. Rollup resolves a relative path like that at BUILD time, so
// `npm run build` has always been correct and `dist/` has always been right;
// the DEV SERVER does not, because it can only serve out-of-root files through
// its `/@fs/` prefix and nothing rewrote the attribute. The request fell
// through to the SPA fallback, which answered with `index.html` under
// `Content-Type: text/html` — a **200, not a 404** — so the module was rejected
// by the browser and `#root` stayed empty.
//
// ⚠️ **THAT IS WHY IT SURVIVED: EVERY SIGNAL SAID FINE.** The four gates build
// and test the app without ever starting a dev server, so nothing in the tree
// exercised this path; and the server's own answer was a success status
// carrying the wrong content type. A handover engineer's first command after
// `npm ci` is `npm run dev`, and the whole product would have looked broken.
//
// The rewrite is `apply: 'serve'`, so the production bundle is untouched — the
// A/B bundle comparison in this batch's PR shows the emitted assets are
// byte-identical across this change. **It THROWS if the attribute it rewrites
// is not there**: a `.replace()` that silently matches nothing would put the
// blank page back with the fix still in the file, which is the same
// success-signal-says-nothing shape the paragraph above describes.
const ENTRY = fileURLToPath(new URL('./src/main.tsx', import.meta.url)).replace(/\\/g, '/');
const ENTRY_ATTR = 'src="../src/main.tsx"';

const devEntryOutsideRoot = (): PluginOption => ({
  name: 'paragon:dev-entry-outside-root',
  apply: 'serve',
  transformIndexHtml: {
    order: 'pre',
    handler(html: string): string {
      if (!html.includes(ENTRY_ATTR))
        throw new Error(
          `paragon:dev-entry-outside-root expected ${ENTRY_ATTR} in app/index.html and did ` +
            'not find it. The dev server cannot serve an entry outside the vite root without ' +
            'this rewrite, and a silent no-op here is a blank page with the fix still in place.',
        );
      return html.replace(ENTRY_ATTR, `src="/@fs/${ENTRY}"`);
    },
  },
});

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
  plugins: [devEntryOutsideRoot(), react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Stated rather than inferred. Vite's default searches upward from `root`
    // for a workspace marker and would land here anyway — but the entry, the
    // whole of `src/` and every asset it imports sit OUTSIDE `root`, so the one
    // thing this server depends on is the thing a default is deciding.
    fs: {
      allow: [fileURLToPath(new URL('.', import.meta.url))],
    },
  },
}));
