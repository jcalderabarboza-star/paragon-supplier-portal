// @vitest-environment node
//
// (node, not jsdom: this spec imports `vite.config.ts`, which pulls in vite and
// therefore esbuild. esbuild asserts `new TextEncoder().encode('') instanceof
// Uint8Array`, which is false under jsdom's TextEncoder, and the suite fails to
// COLLECT — reported by vitest as a failed file with "no tests", which is the
// shape a mutation counter reads as a kill.)
// ─────────────────────────────────────────────────────────────────────────────
// THE GUARD — `npm run dev` can actually serve the entry.
//
// ⚠️ **THE DEFECT THIS EXISTS FOR, MEASURED IN A CLEAN CLONE.** The vite root is
// `app/` and `app/index.html` loads `../src/main.tsx`, which is OUTSIDE it.
// Rollup resolves that at BUILD time, so `npm run build` and `dist/` were always
// correct — the DEV SERVER cannot, and the request fell through to the SPA
// fallback, which answered `index.html` under `Content-Type: text/html` with a
// **200**. The module was rejected, `#root` stayed empty, and the first command
// a handover engineer runs after `npm ci` showed them a blank page.
//
// ⚠️ **NOTHING IN THE TREE COULD HAVE CAUGHT IT, WHICH IS THE PART WORTH
// KEEPING.** All four gates build and test the app; not one starts a dev server.
// And the server's own signal was a SUCCESS status carrying the wrong content
// type — `A MECHANISM WHOSE SUCCESS SIGNAL IS SILENT ABOUT THE DAMAGE IT DOES`,
// on the one surface no gate was watching.
//
// ⚠️ **SO THIS PROBES THE MECHANISM, NOT ITS SPELLING.** It takes the config the
// dev server is really built from, finds the plugin in it, and runs it over the
// real `app/index.html` — then requires the path that comes out to be a file
// that EXISTS. A spec that merely grepped `vite.config.ts` for a plugin name
// would pass with the rewrite pointing at nothing.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, isAbsolute, relative } from 'node:path';
import type { Plugin, UserConfig } from 'vite';

import { REPO_ROOT } from './lib/treeMutationGate/derive';
import viteConfigFn from '../vite.config';

const INDEX_HTML = join(REPO_ROOT, 'app', 'index.html');

/** The config the DEV SERVER is built from — `apply: 'serve'` depends on it. */
const serveConfig = (): UserConfig =>
  (viteConfigFn as unknown as (env: {
    command: 'serve' | 'build';
    mode: string;
  }) => UserConfig)({ command: 'serve', mode: 'development' });

// Flattened by hand rather than with `.flat(Infinity)`: the plugin option type
// is deeply recursive and `Infinity` makes tsc give up with TS2589 ("type
// instantiation is excessively deep"), which is a gate failure rather than a
// style note. `react()` returns an array, so nesting is real and must be walked.
const plugins = (c: UserConfig): Plugin[] => {
  const out: Plugin[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object' && 'name' in node) out.push(node as Plugin);
  };
  walk(c.plugins);
  return out;
};

const devEntryPlugin = (): Plugin => {
  const p = plugins(serveConfig()).find((x) => x.name === 'paragon:dev-entry-outside-root');
  if (!p) throw new Error('the dev-entry plugin is not registered in vite.config.ts');
  return p;
};

const transform = (plugin: Plugin, html: string): string => {
  // The object form of the hook is a union: vite 6 spells it `handler`, and the
  // legacy shape spells it `transform`. Both are read, so this guard is about
  // the mechanism rather than about which spelling the installed vite uses.
  const hook = plugin.transformIndexHtml as
    | ((h: string) => unknown)
    | { handler?: (h: string) => unknown; transform?: (h: string) => unknown }
    | undefined;
  const handler = typeof hook === 'function' ? hook : (hook?.handler ?? hook?.transform);
  if (!handler) throw new Error('the dev-entry plugin has no transformIndexHtml handler');
  const out = handler.call(plugin, html);
  return typeof out === 'string' ? out : html;
};

describe('dev entry · THE PREMISE, before any claim about the fix', () => {
  it('⚠️ the entry really does sit OUTSIDE the vite root', () => {
    // If this stops holding, the rewrite is unnecessary rather than broken —
    // and a guard that cannot tell those apart is the one that gets deleted for
    // the wrong reason. `root: 'app'` with an entry under `src/` is the premise.
    expect(serveConfig().root).toBe('app');
    const html = readFileSync(INDEX_HTML, 'utf8');
    const src = /<script[^>]*\ssrc="([^"]+)"/.exec(html)?.[1];
    expect(src).toBeDefined();
    expect(src?.startsWith('../')).toBe(true);
    // The entry resolves to a real file that is NOT under the vite root — which
    // is the whole defect. Stated as "escapes the root", not as "does not
    // exist": `join` normalises `app/../src` back to `src`, so an existence
    // check on the joined path answers the wrong question and answers it `true`.
    const root = join(REPO_ROOT, 'app');
    const resolved = join(root, src as string);
    expect(existsSync(resolved)).toBe(true);
    expect(relative(root, resolved).startsWith('..')).toBe(true);
  });

  it('⚠️ and the plugin is registered for SERVE and absent from BUILD', () => {
    // `apply: 'serve'` is what keeps the production bundle byte-identical across
    // this change. Asserted, because "it only applies in dev" is exactly the
    // kind of claim that is true until a refactor drops the field.
    expect(devEntryPlugin().apply).toBe('serve');
  });
});

describe('dev entry · THE CLAIM', () => {
  it('⚠️ the rewrite points at a file that EXISTS', () => {
    const out = transform(devEntryPlugin(), readFileSync(INDEX_HTML, 'utf8'));
    const fsPath = /src="\/@fs\/([^"]+)"/.exec(out)?.[1];
    expect(fsPath, 'the entry was not rewritten to an /@fs path').toBeDefined();
    expect(isAbsolute(fsPath as string)).toBe(true);
    expect(existsSync(fsPath as string)).toBe(true);
    // NAMED, not merely present: a rewrite onto the wrong real file would pass
    // an existence check and serve the wrong module.
    expect(relative(REPO_ROOT, fsPath as string).replace(/\\/g, '/')).toBe('src/main.tsx');
  });

  it('⚠️ and it REFUSES rather than silently matching nothing', () => {
    // A `.replace()` whose needle has gone stale returns the input untouched,
    // which puts the blank page back with the fix still sitting in the file.
    // The throw is what makes the failure loud; this is the probe that it is
    // really there, since the acquittal above cannot distinguish "rewrote it"
    // from "had nothing to do" on its own.
    expect(() => transform(devEntryPlugin(), '<html><body></body></html>')).toThrow(
      /app\/index\.html/,
    );
  });
});
