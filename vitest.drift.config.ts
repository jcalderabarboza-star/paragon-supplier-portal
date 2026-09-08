import { defineConfig, configDefaults, type UserConfig } from 'vitest/config';
import base from './vitest.config';

// ────────────────────────────────────────────────────────────────────────────
// THE DRIFT RUN — the only configuration that collects a real-clock spec.
//
// `vitest.config.ts` EXCLUDES `*.live.test.ts`, and an exclusion beats a CLI
// file filter: `vitest run <path>` against the base config answers
//   `No test files found, exiting with code 1`
// which would have made `npm run drift` look like a failing gate that examined
// nothing. So the drift run gets its own config rather than a flag, and it
// INVERTS the include — live specs only — so this config can never quietly
// start running the whole suite under a name that says it measures one thing.
//
// ⚠️ **`mergeConfig` WAS TRIED FIRST AND IS WRONG HERE. IT CONCATENATES ARRAYS.**
// Measured, not reasoned: the merged form collected **316 files / 4496 tests** —
// the entire suite — while its own comment claimed it inverted the include. The
// live spec ran inside that, so the exit code was 0 and the run "passed". An
// instrument that examines everything while reporting that it examined one
// thing is the same defect as one that examines nothing; only reading the
// output rather than the exit code told them apart.
//
// So the override is EXPLICIT: spread, then replace. `configDefaults.exclude`
// is restored by hand because dropping the base's exclusion is the whole point
// and a bare `[]` would let the run reach `node_modules`.
// ────────────────────────────────────────────────────────────────────────────

const b = base as UserConfig;

export default defineConfig({
  ...b,
  test: {
    ...b.test,
    include: ['src/**/*.live.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude],
  },
});
