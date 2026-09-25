// ─────────────────────────────────────────────────────────────────────────────
// ENV GATE — `.env.example` lists EVERY environment variable this tree reads,
// and lists nothing else.
//
// ⚠️ **THE DEFECT THIS EXISTS FOR IS A HANDOVER DEFECT, WHICH IS WHY A PROSE
// LIST WOULD NOT HAVE DONE.** An engineer cloning this repository cold has no
// way to discover that `GATE_USER` exists, or that `VITE_CHAOS` is the reason
// the app can be made to fail on demand, except by grepping for `process.env`.
// A hand-written `.env.example` answers that on the day it is written and is
// silently wrong the first time somebody reads a new variable — which is
// `FLOOR-IN-PROSE-01` with an env var standing in for a number. So the list is
// DERIVED from source and asserted in BOTH directions:
//
//   · every name the code READS must appear in `.env.example`  (no surprises)
//   · every name `.env.example` LISTS must be read by the code  (no decoration)
//
// One direction alone is the usual half-gate: the first lets the file accrete
// dead entries nobody can refute, the second lets a new read ship undocumented.
//
// ── ⚠️ DEFAULT-DENY ON THE ACCESS SHAPE, AND IT IS THE LOAD-BEARING CHOICE ───
//   `const { GATE_USER } = process.env` reads a variable while containing no
//   `process.env.NAME` for any matcher to find, so a name-only scan reports
//   CLEAN on a file that reads three secrets. That is the direction that ends
//   an investigation (`SILENT-PESSIMISM-TERMINATES-THE-INVESTIGATION-01`), so
//   an `env` access this module cannot resolve to a NAME is reported as
//   `UNRESOLVED` and refused, never passed. Measured when this gate was
//   written: **zero** such accesses exist, and the refusal is what keeps that
//   true rather than a sentence recording that it was true once.
//
// ── COMMENTS ARE STRIPPED, THROUGH THE TREE'S OWN PARSER ─────────────────────
//   Five source comments in this tree name env vars in prose (`main.tsx`,
//   `withChaos.ts`, `envBadge.ts`, `vite-env.d.ts`, `GRInspectionWizard.tsx`).
//   Counting them would force `.env.example` to list whatever a comment happened
//   to mention. `stripSourceComments` is the shared, parser-backed stripper —
//   not a regex, for the reasons stated in its own header.
//
// ── REACH LIMITS, STATED ────────────────────────────────────────────────────
//   · A variable reached through a runtime-computed key is `UNRESOLVED`, which
//     is refused rather than passed.
//   · `.env.example` is parsed by LINE, which is what a dotenv file is. A name
//     is "listed" whether or not its line is commented out — a documented
//     variable nobody should set (`DEV`, `MODE`) is still documented.
//   · The root comes from `treeMutationGate/derive`, so this tree has ONE root
//     derivation and it is the one keyed on the repository's declared identity.
// ─────────────────────────────────────────────────────────────────────────────
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { REPO_ROOT } from '../treeMutationGate/derive';
import { stripSourceComments } from '../sourceScan/stripComments';

/** Directories that are never part of the tree under test. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite', '.playwright-mcp']);

const SOURCE_EXT = /\.(?:tsx?|jsx?|mjs|cjs)$/;

export const ENV_EXAMPLE = join(REPO_ROOT, '.env.example');

/** Every source file in the repo, derived from disk — never a list. */
export function sourceFiles(dir: string = REPO_ROOT, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (SOURCE_EXT.test(name)) out.push(p);
  }
  return out;
}

/** `import.meta.env.NAME` / `process.env.NAME`. */
const DOTTED = /(?:import\.meta|process)\.env\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
/** `import.meta.env['NAME']` / `process.env["NAME"]`. */
const BRACKETED = /(?:import\.meta|process)\.env\[\s*(['"])([^'"]+)\1\s*\]/g;
/** Any `env` access at all, so the two above can be shown to have covered it. */
const ANY_ACCESS = /(?:import\.meta|process)\.env/g;

export interface EnvRead {
  readonly file: string;
  readonly name: string | null; // null === UNRESOLVED
}

/**
 * Every environment-variable name read in ONE source text, in source order,
 * with an unresolvable access reported as `null`.
 *
 * Takes TEXT rather than a path so the probes can fire it at constructed
 * sources without writing anything to disk — which is the neighbouring gate's
 * rule, and it applies to this one too.
 */
export function envNamesInSource(raw: string, fileName = 'source.ts'): (string | null)[] {
  // 'blank' keeps offsets and newline positions, so the accounting below counts
  // over exactly the text the names came out of.
  const text = stripSourceComments(raw, 'blank', fileName);
  const names: (string | null)[] = [];
  for (const m of text.matchAll(DOTTED)) names.push(m[1]);
  for (const m of text.matchAll(BRACKETED)) names.push(m[2]);
  // DEFAULT-DENY: every `env` access must have been claimed by one of the two
  // shapes above. A destructure, a spread or a computed key is a real read this
  // module cannot name — the two matchers are disjoint (one needs a dot, the
  // other a bracket), so anything left over is an access nobody explained, and
  // an unnamed read is refused rather than acquitted.
  const total = (text.match(ANY_ACCESS) ?? []).length;
  for (let i = names.length; i < total; i++) names.push(null);
  return names;
}

/** Every environment-variable read in `files`, with its name resolved. */
export function envReads(files: readonly string[]): EnvRead[] {
  const found: EnvRead[] = [];
  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    if (!raw.includes('.env')) continue; // cheap pre-filter; sound in the one
    const rel = relative(REPO_ROOT, file).split(sep).join('/'); // direction that matters
    for (const name of envNamesInSource(raw, file)) found.push({ file: rel, name });
  }
  return found;
}

/** Every variable name `.env.example` lists, commented-out lines included. */
export function listedNames(text: string = readFileSync(ENV_EXAMPLE, 'utf8')): string[] {
  const names: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^#?\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line);
    if (m) names.push(m[1]);
  }
  return names;
}
