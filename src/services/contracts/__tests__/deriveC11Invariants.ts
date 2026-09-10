// ─────────────────────────────────────────────────────────────────────────────
// C11 · THE DERIVATION BEHIND THE PIN — the document half and the tree half.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   `C11-invariants.md` claims, for each invariant, that some named assertion
//   in some named file fails the build when the property stops holding. That is
//   a claim about the TREE made in PROSE, which is the shape this corpus has
//   been wrong in at five separate sites. Nothing fails when a cited enforcer is
//   retired, renamed, or never existed — the document simply keeps promising.
//
//   This module supplies the two populations the pin compares:
//
//     · the DOCUMENT half — parsed from the committed markdown table
//     · the TREE half     — the files on disk and the bytes in them
//
//   ⚠️ **NEITHER IS READ THROUGH THE OTHER, WHICH IS THE §86 RULE.** A gate must
//   not derive its population from the code it is probing. Here the row set
//   comes from markdown and the resolution comes from `node:fs`; mutating an
//   enforcer cannot shrink the population, so the pin can always tell "I caught
//   it" from "I have nothing to look at".
//
// ── ⚠️ WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────
//   It does not read what an assertion MEANS, and it must never start. A pin
//   that tried to check that `it('...')` really tests the property it is cited
//   for would be re-implementing the assertion, and a re-implementation that
//   disagrees with the instrument is the thing under test
//   (`REIMPLEMENTATION-CONTRADICTS-THE-INSTRUMENT-01`). The claim this pin makes
//   is narrow and true: **the cited enforcer exists and still contains the cited
//   assertion.** Everything stronger is the assertion's own job.
// ─────────────────────────────────────────────────────────────────────────────
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = process.cwd();
export const C11_PATH = join(ROOT, 'docs', 'contracts', 'C11-invariants.md');

/** The four classes a row may declare. Anything else is a malformed row. */
export const CLASSES = ['FACTORY', 'GATE', 'TYPE', 'NOT ENFORCED'] as const;
export type InvariantClass = (typeof CLASSES)[number];

/** The literal a prose row must carry, in the row's own cell — not a footnote. */
export const NOT_ENFORCED_DISCLAIMER = 'THIS IS NOT ENFORCED';

/** The cell contents used for "there is no enforcer": an em dash, alone. */
const ABSENT = '—';

export interface InvariantRow {
  readonly n: number;
  readonly text: string;
  readonly cls: string;
  readonly file: string;
  readonly assertion: string;
}

/** Strip one layer of markdown backticks/bold from a cell. */
function bare(cell: string): string {
  return cell.trim().replace(/^\*\*(.*)\*\*$/s, '$1').replace(/^`(.*)`$/s, '$1').trim();
}

/**
 * THE DOCUMENT HALF — every `| **V<n>** | … |` row of the invariant table.
 *
 * Rows are matched on the `**V<n>**` first cell rather than on position, so a
 * new prose section between tables cannot silently change the population.
 */
export function parseC11Rows(markdown = readFileSync(C11_PATH, 'utf8')): InvariantRow[] {
  const rows: InvariantRow[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const m = /^\|\s*\*\*V(\d+)\*\*\s*\|/.exec(line);
    if (!m) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
    rows.push({
      n: Number(m[1]),
      text: cells[1] ?? '',
      cls: bare(cells[2] ?? ''),
      file: bare(cells[3] ?? ''),
      assertion: bare(cells[4] ?? ''),
    });
  }
  return rows;
}

/** How many cells the row actually had — a malformed row must not parse clean. */
export function cellCount(line: string): number {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').length;
}

/** Every `| **V<n>** |` line, raw — so the pin can assert the column count. */
export function rawRowLines(markdown = readFileSync(C11_PATH, 'utf8')): string[] {
  return markdown.split(/\r?\n/).filter((l) => /^\|\s*\*\*V\d+\*\*\s*\|/.test(l));
}

export function isAbsent(cell: string): boolean {
  return cell === ABSENT || cell === '';
}

/**
 * THE TREE HALF — does the cited file exist, and does it contain the cited
 * assertion? Read as BYTES→utf8 with an explicit encoding, never through the
 * ambient codepage (§85: a decode that throws loses every match and reads as
 * "your gate is weak").
 */
export function resolveEnforcer(
  file: string,
  assertion: string,
): { fileExists: boolean; assertionPresent: boolean } {
  const abs = join(ROOT, file);
  if (!existsSync(abs)) return { fileExists: false, assertionPresent: false };
  const src = readFileSync(abs, 'utf8');
  // Compare with line endings normalised: `core.autocrlf` is on in this repo,
  // so a `\r` inside a cited title would make a true assertion read as absent.
  const norm = (s: string) => s.replace(/\r\n/g, '\n');
  return { fileExists: true, assertionPresent: norm(src).includes(norm(assertion)) };
}

/**
 * THE CONTRACT-NUMBER DERIVATION — the occupied set, read off the directory.
 *
 * This is the same derivation the document's opening claim makes, re-run at
 * test time. `C9` has two files and contributes one number; `README.md`
 * contributes none.
 */
export function occupiedContractNumbers(): number[] {
  const dir = join(ROOT, 'docs', 'contracts');
  const ns = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => /^C(\d+)/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]));
  return [...new Set(ns)].sort((a, b) => a - b);
}
