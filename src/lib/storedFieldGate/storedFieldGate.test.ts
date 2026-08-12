// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// D-F · THE STORED-FIELD GATE.
//
// Every stored field on a glossary-covered DTO has at least one NON-FIXTURE
// READER, or a row in `allowlist.ts` with its reason stated.
//
// ── ⚠️ THE SELF-PROBE COMES FIRST, AND THE ORDER IS THE POINT ───────────────
//   Heuristic rule 4: **assert a known-GOOD input passes before you believe a
//   known-BAD input failed.** A guard is habitually probed in one direction —
//   "does it catch the bad thing?" — so a guard that is wrong about what it
//   should ACCEPT ships looking like a working guard. Every good-input probe
//   below runs against the SAME synthetic program as its bad-input twin, so a
//   derivation that flagged everything (or nothing) fails here before it ever
//   reaches the tree.
//
//   This gate is TEST-level, not type-level, and deliberately so: a type-level
//   gate cannot be probed this way at all — #179's mutation practice cannot
//   reach a `tsc` error, and rule 4 would then be the only protection there is.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { GLOSSARY_REGISTRIES } from '../glossary';
import { STORED_FIELD_ALLOWLIST, unadjudicatedCount } from './allowlist';
import {
  buildProgramFromSources,
  buildRepoProgram,
  deriveCensus,
  isFixturePath,
  type Census,
} from './derive';

const ROOT = join(__dirname, '..', '..', '..');

// ═══ THE SELF-PROBE ══════════════════════════════════════════════════════════
// One synthetic program carrying, side by side: fields that MUST pass, fields
// that MUST be flagged, and the entity-collision that is the whole reason this
// census resolves declarations instead of matching names.
const SYNTH = {
  '/src/vocab.ts': `export type CertType = 'BPJPH' | 'MUI';`,
  '/src/dto.ts': `
    import type { CertType } from './vocab';
    export interface Covered {
      certType: CertType;          // vocabulary — this is what makes Covered covered
      readByAccess: string;        // GOOD: read via property access
      readByDestructure: string;   // GOOD: read via destructuring
      readByOptionalChain: string; // GOOD: read through ?.
      certBasisShape: string;      // BAD: written in a fixture literal, read nowhere
      /** Gates the KPI and remind-eligibility. */
      promisedGating: boolean;     // BAD: a comment that names consumers it does not have
      testOnly: string;            // BAD: read, but only from a spec
      collidingName: string;       // BAD: read at ANOTHER entity of the same name only
      writtenNeverRead: string;    // BAD: assignment target only
    }
    export interface Uncovered {
      collidingName: string;       // the masker — read in production, different declaration
      alsoUnread: string;          // must NOT be in the population: no vocabulary on Uncovered
    }`,
  '/src/fixtures.ts': `
    import type { Covered } from './dto';
    export const ROW: Covered = {
      certType: 'BPJPH', readByAccess: 'a', readByDestructure: 'b', readByOptionalChain: 'c',
      certBasisShape: 'permanent', promisedGating: true, testOnly: 'd', collidingName: 'e',
      writtenNeverRead: 'f',
    };`,
  '/src/consumer.ts': `
    import type { Covered, Uncovered } from './dto';
    export function render(c: Covered, u: Uncovered): string {
      const { readByDestructure } = c;
      c.writtenNeverRead = 'set';
      return c.certType + c.readByAccess + readByDestructure + (c.readByOptionalChain ?? '') + u.collidingName;
    }`,
  '/src/consumer.test.ts': `
    import type { Covered } from './dto';
    export const t = (c: Covered): string => c.testOnly;`,
};

const synth = (): Census =>
  deriveCensus(buildProgramFromSources(SYNTH), {
    vocabulary: new Set(['CertType']),
    root: '/',
    isFixture: (p) => p.endsWith('.test.ts') || p.endsWith('fixtures.ts'),
  });

describe('D-F self-probe — the instrument, both ways (heuristic rule 4)', () => {
  const census = synth();
  const flagged = new Set(census.flagged.map((f) => f.key));
  const population = new Set(census.fields.map((f) => f.key));

  // ── KNOWN-GOOD FIRST. If any of these fail, no verdict below means anything.
  it.each([
    ['Covered.readByAccess', 'plain property access'],
    ['Covered.readByDestructure', 'object destructuring'],
    ['Covered.readByOptionalChain', 'optional chaining'],
    ['Covered.certType', 'the vocabulary field itself'],
  ])('ACCEPTS %s — %s', (key) => {
    expect(population.has(key), `${key} fell out of the population entirely`).toBe(true);
    expect(flagged.has(key), `${key} is read in production and was still flagged`).toBe(false);
  });

  it('ACCEPTS a whole uncovered DTO — no vocabulary, no population', () => {
    expect(population.has('Uncovered.alsoUnread')).toBe(false);
    expect(population.has('Uncovered.collidingName')).toBe(false);
  });

  // ── ONLY NOW the known-bad half.
  it.each([
    ['Covered.certBasisShape', 'stored in a fixture literal, read by nothing — the certBasis shape'],
    ['Covered.promisedGating', 'a boolean whose comment names consumers it has none of'],
    ['Covered.testOnly', 'read only from a spec'],
    ['Covered.writtenNeverRead', 'assignment target only — a write is not a read'],
  ])('FLAGS %s — %s', (key) => {
    expect(population.has(key), `${key} is not even in the population`).toBe(true);
    expect(flagged.has(key), `${key} has no non-fixture reader and was not flagged`).toBe(true);
  });

  it('FLAGS Covered.collidingName though the NAME is read in production — the masking case', () => {
    // Seat 3's binding caveat, as a test. `u.collidingName` is read in
    // consumer.ts; a name-matching census clears Covered.collidingName on the
    // strength of it. This is how materialCategory nearly hid.
    expect(flagged.has('Covered.collidingName')).toBe(true);
    const row = census.fields.find((f) => f.key === 'Covered.collidingName');
    expect(row?.sharedNameWith, 'the collision must be REPORTED, not merely survived')
      .toContain('Uncovered');
  });

  it('counts a write as a write and not as a read', () => {
    expect(census.fields.find((f) => f.key === 'Covered.writtenNeverRead')?.writes).toBe(1);
  });

  it('does not flag everything — a derivation that flags all is as useless as one that flags none', () => {
    expect(census.flagged.length).toBeGreaterThan(0);
    expect(census.flagged.length).toBeLessThan(census.fields.length);
  });
});

// ═══ THE GATE ════════════════════════════════════════════════════════════════
describe('D-F stored-field gate (the tree)', () => {
  let census: Census;

  beforeAll(() => {
    census = deriveCensus(buildRepoProgram(ROOT), {
      vocabulary: new Set(GLOSSARY_REGISTRIES.map((r) => r.sourceType)),
      root: ROOT,
      isFixture: isFixturePath,
    });
  }, 120_000);

  it('derives a population from the glossary rather than a list', () => {
    // Rule 1: a population that comes back suspiciously small or round is
    // reporting on its own matcher. Assert a known-true member is present and a
    // known-false one is absent before believing any verdict.
    expect(census.coveredTypes.map((t) => t.name)).toContain('ComplianceRegistryEntry');
    expect(census.fields.map((f) => f.key)).toContain('ComplianceRegistryEntry.certType');
    expect(census.fields.map((f) => f.key)).not.toContain('Supplier.name');
    expect(census.coveredTypes.length).toBeGreaterThan(20);
    expect(census.fields.length).toBeGreaterThan(100);
  });

  it('⚠️ BILATERAL — the allowlist is EXACTLY the flagged set', () => {
    const flagged = new Set(census.flagged.map((f) => f.key));
    const listed = new Set(STORED_FIELD_ALLOWLIST.map((e) => e.key));

    const unlisted = census.flagged
      .filter((f) => !listed.has(f.key))
      .map((f) => `${f.key}  (${f.file}; ${f.reads.length} fixture/test reads, ${f.writes} writes)`);
    expect(
      unlisted,
      'A STORED FIELD ON A GLOSSARY-COVERED DTO HAS NO NON-FIXTURE READER AND NO STATED REASON.\n' +
        'This is the certBasis shape. Give it a reader, delete it, or add a row to allowlist.ts\n' +
        'with the reason stated:\n' +
        unlisted.join('\n'),
    ).toEqual([]);

    const stale = [...listed]
      .filter((k) => !flagged.has(k))
      .map((k) => {
        const row = census.fields.find((f) => f.key === k);
        return row
          ? `${k}  — NOW READ at ${row.nonFixtureReads[0]?.file}:${row.nonFixtureReads[0]?.line}`
          : `${k}  — the field no longer exists`;
      });
    expect(
      stale,
      'AN EXEMPTION OUTLIVED ITS SUBJECT. Delete these rows from allowlist.ts — an excuse left\n' +
        'behind after the thing it excused was fixed is how a list stops being able to shrink:\n' +
        stale.join('\n'),
    ).toEqual([]);
  });

  it('every allowlist row states a reason, and its token carries its obligation', () => {
    const thin = STORED_FIELD_ALLOWLIST.filter((e) => e.why.trim().length < 80).map((e) => e.key);
    expect(thin, `reason not stated (a one-line row states nothing):\n${thin.join('\n')}`).toEqual([]);

    const missing = STORED_FIELD_ALLOWLIST.flatMap((e) => {
      if (e.reason === 'data-in-waiting' && !e.consumer?.trim()) return [`${e.key}: data-in-waiting names no consumer`];
      if (e.reason === 'contract-surface' && !e.contract?.trim()) return [`${e.key}: contract-surface names no contract`];
      if (e.reason === 'substrate' && !e.surface?.trim()) return [`${e.key}: substrate names no surface`];
      return [];
    });
    expect(missing, missing.join('\n')).toEqual([]);

    const brokenPins = STORED_FIELD_ALLOWLIST.filter((e) => e.pinnedBy && !existsSync(join(ROOT, e.pinnedBy)))
      .map((e) => `${e.key} → ${e.pinnedBy!}`);
    expect(brokenPins, `pinnedBy names a spec that is gone:\n${brokenPins.join('\n')}`).toEqual([]);

    expect(new Set(STORED_FIELD_ALLOWLIST.map((e) => e.key)).size).toBe(STORED_FIELD_ALLOWLIST.length);
  });

  it('publishes the unadjudicated debt rather than burying it', () => {
    // Not a threshold — a report. The number is meant to fall, and a ruling
    // that lands must change it, so a silent re-labelling is not available.
    const n = unadjudicatedCount();
    expect(n).toBe(STORED_FIELD_ALLOWLIST.filter((e) => e.reason === 'unadjudicated').length);
    expect(n).toBeLessThanOrEqual(STORED_FIELD_ALLOWLIST.length);
  });

  it('reports where a name-matching census would have been fooled', () => {
    // Not a pass/fail — the instrument's own honesty. Every flagged field whose
    // name is declared elsewhere is a field a name census would have cleared.
    const masked = census.flagged.filter((f) => f.sharedNameWith.length > 0);
    expect(masked.length).toBeGreaterThan(0);
    for (const f of masked) expect(f.sharedNameWith).not.toContain(f.owner);
  });
});
