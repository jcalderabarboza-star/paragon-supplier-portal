// ─────────────────────────────────────────────────────────────────────────────
// C12 · THE DERIVATION BEHIND THE PIN — the document half and the tree half.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   `C12-backend-spec.md` tells an SE team what they must never build, which
//   invariants they inherit, and which boundaries have no contract. Every one of
//   those claims is a statement about the TREE made in PROSE, and nothing fails
//   when one stops being true.
//
//   ⚠️ **AND ONE CLASS OF CLAIM HAS ALREADY FAILED IN A DRAFT OF THAT FILE.** It
//   cited `sourceSystem` and `externalEventId` as shipped fields; the tree
//   contains neither (0 occurrences, against 37 for `expectedState` as the
//   control that the instrument can see a real one). A handover document naming
//   an artefact that does not exist is `FORWARD-PROMISE-HAS-NO-HANDLER-01` aimed
//   at the people least able to check it. `citedArtefacts` below is the half of
//   this pin that exists for that, and it is the half most likely to fire.
//
// ── §86 — THE POPULATION IS NOT DERIVED THROUGH THE CODE UNDER TEST ─────────
//   The document half is parsed from markdown; the tree half comes from the flow
//   registry and from OTHER contract files. Mutating a flow cannot shrink the
//   document's row set, so the pin can always tell "I caught it" from "I have
//   nothing to look at".
// ─────────────────────────────────────────────────────────────────────────────
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { getKnownFlows } from '../../transitions';
import type { FlowDefinition } from '../../transitions/schema';

export const ROOT = process.cwd();
export const C12_PATH = join(ROOT, 'docs', 'contracts', 'C12-backend-spec.md');
export const C11_PATH = join(ROOT, 'docs', 'contracts', 'C11-invariants.md');
export const C5_PATH = join(ROOT, 'docs', 'contracts', 'C5-seams.md');

export const readDoc = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

/** The markdown between a `### `/`## ` heading matching `re` and the next one. */
export function section(markdown: string, re: RegExp): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => /^#{2,4} /.test(l) && re.test(l));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{2,4} /.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Every `` `token` `` in a chunk of markdown. */
export function backticked(md: string): string[] {
  return [...md.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
}

// ── THE TREE HALF ───────────────────────────────────────────────────────────

type Trans = FlowDefinition['transitions'][number];

const allTransitions = (): Trans[] => getKnownFlows().flatMap((f) => f.transitions);

const externalFact = (t: Trans): boolean =>
  t.surfaceable.surfaced === false &&
  (t.surfaceable as { because?: string }).because === 'external-fact';

export const ownerOf = (t: Trans): string | undefined =>
  (t.surfaceable as { owner?: string }).owner;

/** Transitions that CREATE an entity whose existence is an external fact. */
export function creationExternalFacts(): { id: string; owner: string }[] {
  return allTransitions()
    .filter((t) => t.trigger === 'creation' && externalFact(t))
    .map((t) => ({ id: t.id, owner: ownerOf(t) ?? '<none>' }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Every distinct owner named by an external fact — the union, as USED. */
export function ownersInUse(): string[] {
  return [...new Set(allTransitions().filter(externalFact).map((t) => ownerOf(t) ?? '<none>'))].sort();
}

/** Verbs that settle outside this platform (Option B). */
export function sapBoundaryVerbs(): string[] {
  return allTransitions()
    .filter((t) => (t as { sapBoundary?: boolean }).sapBoundary === true)
    .map((t) => t.id)
    .sort();
}

/**
 * Owners that have an `INT-…` seam SECTION in C5 — the four-part artefact, not
 * a passing mention. Matched on the heading, so a citation in prose elsewhere
 * cannot make an owner look covered.
 */
export function ownersWithSeamCode(): string[] {
  const headings = readDoc(C5_PATH)
    .split('\n')
    .filter((l) => /^## .*INT-[A-Z0-9]+-\d+/.test(l));
  const out = new Set<string>();
  for (const h of headings) {
    if (/TMS/i.test(h)) out.add('tms');
    if (/SAP|S\/4/i.test(h)) out.add('s4hana');
    if (/BANK/i.test(h)) out.add('bank');
  }
  return [...out].sort();
}

/** C11's rows that a conformance factory does NOT reach, as `V<n>` labels. */
export function c11NonFactoryRows(): string[] {
  const out: string[] = [];
  for (const line of readDoc(C11_PATH).split('\n')) {
    const m = /^\|\s*\*\*V(\d+)\*\*\s*\|/.exec(line);
    if (!m) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
    const cls = (cells[2] ?? '').trim().replace(/^`(.*)`$/, '$1').trim();
    if (cls !== 'FACTORY') out.push(`V${m[1]}`);
  }
  return out;
}

/** The `V<n>` labels C12's inherited-invariants table names. */
export function c12InheritedRows(): string[] {
  const md = section(readDoc(C12_PATH), /The invariants you inherit as work/);
  return [...md.matchAll(/^\|\s*\*\*(V\d+)\*\*\s*\|/gm)].map((m) => m[1]);
}

/**
 * ⚠️ THE ARTEFACT-EXISTENCE HALF — every identifier C12 names must be real.
 *
 * Deliberately conservative about WHAT counts as a claim: only tokens that look
 * like a transition id or a source identifier are checked, because a document
 * also backticks types, states and prose fragments. Widening this to every
 * backticked token would create false accusations, which is heuristic rule 2 and
 * is how a gate gets muted.
 */
export type CitedKind = 'transition' | 'identifier' | 'file';

/** Extensions a backticked token may carry and still be a FILE claim. */
const FILE_EXT = /\.(json|jsonc|js|mjs|cjs|ts|tsx|html|css|ico|txt|yml|yaml|md|lock)$/;

/**
 * ⚠️ **A FILE IS A THIRD KIND, AND ADDING IT CLOSED A VACUITY RATHER THAN
 * A GAP — WHICH IS WHY IT IS WORTH THE COMMENT.**
 *
 * `BuyerContracts.tsx`, `CLAUDE.md` and `findings.md` already satisfied the
 * IDENTIFIER pattern (`Word.lowercase`), so each was being checked as a field
 * name: the assertion asked whether `src/` contains the string `tsx` or `md`,
 * which it always does. **Three members were passing on their own file
 * extension.** The document's §7 claims *"every artefact this document names in
 * backticks is asserted to exist"*; for files that claim was true only by
 * accident, and §6 adds more of them.
 *
 * Classified BEFORE the identifier branch, so a file can never fall through to
 * the weaker test.
 */
export function citedArtefacts(): { token: string; kind: CitedKind }[] {
  const md = readDoc(C12_PATH);
  const seen = new Map<string, CitedKind>();
  for (const raw of backticked(md)) {
    const tok = raw.trim();
    // A glob is a SHAPE, not a path — `*.mock.test.ts` names no single file.
    if (tok.includes('*')) continue;
    if (/^t_[a-z0-9_]+$/.test(tok)) seen.set(tok, 'transition');
    else if (FILE_EXT.test(tok) && !/\s/.test(tok)) seen.set(tok, 'file');
    // `CommandInput.idempotencyKey` and bare camelCase field names
    else if (/^[A-Za-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9]*$/.test(tok)) seen.set(tok, 'identifier');
  }
  return [...seen].map(([token, kind]) => ({ token, kind })).sort((a, b) => a.token.localeCompare(b.token));
}

/**
 * Does a cited file token name something real? A token is accepted if it
 * resolves from the repository root, or if its BASENAME exists somewhere in the
 * tree — C12 cites both (`src/services/.../c12BackendSpec.contract.test.ts` and
 * bare `BuyerContracts.tsx`).
 *
 * ⚠️ `node_modules`, `dist` and `.git` are excluded: a dependency's file is
 * not this repository's artefact, and `dist/` is a BUILD OUTPUT that does not
 * exist on a clean checkout — accepting it would make the check pass or fail
 * depending on whether somebody had run a build.
 */
let repoFilesCache: Set<string> | null = null;
function repoBasenames(): Set<string> {
  if (repoFilesCache !== null) return repoFilesCache;
  const names = new Set<string>();
  const skip = new Set(['node_modules', 'dist', '.git', 'coverage', '.vercel']);
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      if (e.isDirectory()) walk(join(dir, e.name));
      else names.add(e.name);
    }
  };
  walk(ROOT);
  repoFilesCache = names;
  return names;
}

export function citedFileExists(token: string): boolean {
  if (existsSync(join(ROOT, token))) return true;
  const base = token.split('/').pop() as string;
  return repoBasenames().has(base);
}

/**
 * The fallback rewrite, read from the host config the tree actually ships.
 * Returns every rule that sends a path to the single HTML entry.
 */
export function fallbackRewrites(): { source: string; destination: string }[] {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
    rewrites?: { source: string; destination: string }[];
  };
  return (cfg.rewrites ?? []).filter((r) => /index\.html$/.test(r.destination));
}

/** The HTML entries under the Vite root — the build's entry points. */
export function htmlEntries(): string[] {
  return readdirSync(join(ROOT, 'app')).filter((n) => n.endsWith('.html'));
}

/** Client route paths declared by the router — derived, never counted here. */
export function declaredRoutePaths(): string[] {
  const src = readFileSync(join(ROOT, 'src', 'router', 'AppRouter.tsx'), 'utf8');
  return [...new Set([...src.matchAll(/path="([^"]*)"/g)].map((m) => m[1]))];
}

/** Every transition id the registry knows — the authority for a `t_…` claim. */
export function knownTransitionIds(): Set<string> {
  return new Set(allTransitions().map((t) => t.id));
}

/**
 * PRODUCTION `src` text — specs deliberately EXCLUDED.
 *
 * ⚠️ **THE EXCLUSION IS LOAD-BEARING, AND IT WAS FOUND BY THE CONTROL FIRING
 * RATHER THAN BY REVIEW.** A first version walked all of `src/` and the
 * known-bad control went red: this pin's own spec contains the literals
 * `sourceSystem` and `externalEventId` — inside the assertion that they must be
 * ABSENT from the tree. The instrument was reading its own text and reporting
 * it as the tree, which is §86's rule (a gate must not derive its population
 * through the thing it is probing) arriving from an unexpected direction.
 *
 * It is also the correct scope on the merits: a field a handover document names
 * must exist in SHIPPED code, not merely in a test that mentions it.
 */
let srcCache: string | null = null;
export function srcText(): string {
  if (srcCache !== null) return srcCache;
  const parts: string[] = [];
  const isSpec = (name: string): boolean => /\.test\.tsx?$/.test(name);
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === '__tests__') continue;
        walk(p);
      } else if (/\.tsx?$/.test(e.name) && !isSpec(e.name)) {
        parts.push(readFileSync(p, 'utf8'));
      }
    }
  };
  walk(join(ROOT, 'src'));
  srcCache = parts.join('\n');
  return srcCache;
}
