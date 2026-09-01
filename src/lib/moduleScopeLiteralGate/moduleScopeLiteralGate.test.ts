// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE MODULE-SCOPE LITERAL GATE.
//
// No reader-visible literal may sit where `t()` cannot reach it — a parameter
// default that renders, or a module-scope const that renders — without a reason
// stated at the site.
//
// ── ⚠️ THE ORDER OF THIS FILE IS THE ARGUMENT ───────────────────────────────
//   1. THE POPULATION GUARD RUNS FIRST and asserts MEMBERSHIP, never a count.
//      `EMPTY-INPUT-REPORTS-CLEAN-01`: a derivation that examined nothing
//      reports a clean tree, and a right-looking answer from an instrument that
//      read no files is indistinguishable from a right answer.
//   2. THE SELF-PROBE RUNS SECOND, both directions, against ONE synthetic
//      program. Heuristic rule 4: **assert a known-GOOD input passes before you
//      believe a known-BAD input failed.** A gate wrong about what it should
//      ACCEPT ships looking like a working gate — and this gate has four
//      distinct acquittal paths, so there are four ways to be wrong about
//      acceptance and only one of them is visible from the bad-input side.
//   3. THE TREE RUNS LAST, on the population the first two proved the
//      instrument can see.
//
//   ⚠️ **AND A CLEAN TREE RUN HERE PROVES LESS THAN IT LOOKS**
//   (`CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`, §71). The tree is green in part
//   because this batch repaired it an hour earlier. That zero is a report about
//   the repair. What proves the instrument can FIRE is the synthetic probe
//   below and the mutation probe recorded in the PR — different input, taken
//   against a defect that is still there.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'node:path';
import {
  buildProgramFromSources,
  buildRepoProgram,
  deriveCensus,
  type Candidate,
  type Census,
} from './derive';
import { S2_GRANDFATHERED, grandfatheredKeys } from './grandfathered';

const ROOT = join(__dirname, '..', '..', '..');

// ═══ THE SYNTHETIC PROGRAM ═══════════════════════════════════════════════════
// One known-BAD per shape, one known-GOOD per acquittal path, side by side, so
// neither half can be believed without the other.
const SYNTH: Record<string, string> = {
  '/src/Good.tsx': `
    // GOOD — empty string: not copy.
    // GOOD — closed union: a discriminator, not prose.
    export function GoodButton({
      variant = 'outline',
      className = '',
    }: { variant?: 'outline' | 'secondary'; className?: string }) {
      return <button className={className}>{variant}</button>;
    }

    // GOOD — unreachable default: every call site passes it, so it never renders.
    export function AlwaysPassed({ label = 'Never Rendered Prose' }: { label?: string }) {
      return <span>{label}</span>;
    }

    // i18n-defer: Incoterm codes are not prose.
    const CODES = ['FOB', 'CIF'];
    export function Codes() {
      return <ul>{CODES.map((c) => <li>{c}</li>)}</ul>;
    }

    // GOOD — grandfathered: carried over, adjudication pending.
    const LEGACY_ROWS = [{ label: 'Legacy prose awaiting adjudication' }];
    export function Legacy() {
      return <ul>{LEGACY_ROWS.map((r) => <li>{r.label}</li>)}</ul>;
    }
  `,
  '/src/Bad.tsx': `
    // BAD S1 — a reachable prose default.
    export function Loader({ title = 'Loading…' }: { title?: string }) {
      return <div>{title}</div>;
    }

    // BAD S1b — an ARRAY-valued default. The literal is a CHILD of the
    // initializer, which is how it evaded the matcher that opened this batch.
    export function Crumbs({ trail = ['LOADING'] }: { trail?: string[] }) {
      return <div>{trail.join('/')}</div>;
    }

    // BAD S2 — a module-scope const consumed by .map(), no stated reason.
    const ROWS = [{ label: 'Quarterly delivery performance report' }];
    export function Rows() {
      return <ul>{ROWS.map((r) => <li>{r.label}</li>)}</ul>;
    }
  `,
  '/src/App.tsx': `
    import { GoodButton, AlwaysPassed } from './Good';
    import { Loader, Crumbs } from './Bad';
    export function App() {
      return (
        <div>
          <GoodButton variant="secondary" />
          <AlwaysPassed label="always supplied" />
          <Loader />
          <Crumbs />
        </div>
      );
    }
  `,
};

const SYNTH_GRANDFATHERED = new Set(['src/Good.tsx::LEGACY_ROWS']);

const find = (c: Census, text: string): Candidate | undefined =>
  c.candidates.find((x) => x.text === text);

describe('module-scope literal gate · the self-probe', () => {
  let synth: Census;

  beforeAll(() => {
    synth = deriveCensus(buildProgramFromSources(SYNTH), '/', {
      grandfathered: SYNTH_GRANDFATHERED,
    });
  });

  // ── 1. THE POPULATION GUARD ────────────────────────────────────────────────
  it('examined the synthetic program at all (membership, never a count)', () => {
    expect(synth.filesWalked).toBeGreaterThan(0);
    // A known member of each shape must be PRESENT, or nothing below means
    // anything — including the acquittals.
    expect(find(synth, 'Loading…')).toBeDefined();
    expect(find(synth, 'LOADING')).toBeDefined();
    expect(find(synth, 'Quarterly delivery performance report')).toBeDefined();
    expect(find(synth, 'FOB')).toBeDefined();
  });

  // ── 2a. THE KNOWN-GOOD HALF — asserted BEFORE the bad half is believed ─────
  it('ACQUITS the empty string', () => {
    expect(find(synth, '')?.acquittal?.kind).toBe('empty-string');
  });

  it('ACQUITS a default whose declared type is a closed string-literal union', () => {
    expect(find(synth, 'outline')?.acquittal?.kind).toBe('closed-union');
  });

  it('ACQUITS a default passed at every call site — it cannot render', () => {
    expect(find(synth, 'Never Rendered Prose')?.acquittal?.kind).toBe('unreachable-default');
  });

  it('ACQUITS a const with a reason stated at the site', () => {
    const fob = find(synth, 'FOB');
    expect(fob?.acquittal?.kind).toBe('adjudicated');
    expect(fob?.acquittal?.note).toBe('Incoterm codes are not prose.');
  });

  it('ACQUITS a grandfathered const, and says so rather than calling it clean', () => {
    const legacy = find(synth, 'Legacy prose awaiting adjudication');
    expect(legacy?.acquittal?.kind).toBe('adjudicated');
    expect(legacy?.acquittal?.note).toMatch(/GRANDFATHERED/);
  });

  // ── 2b. THE KNOWN-BAD HALF ────────────────────────────────────────────────
  it('FLAGS a reachable prose default (S1)', () => {
    const bad = find(synth, 'Loading…');
    expect(bad?.acquittal).toBeNull();
    expect(bad?.shape).toBe('param-default');
  });

  it('FLAGS an ARRAY-valued default (S1b) — the shape that evaded the first matcher', () => {
    const bad = find(synth, 'LOADING');
    expect(bad?.acquittal).toBeNull();
    expect(bad?.shape).toBe('array-default');
  });

  it('FLAGS an unmarked module-scope const consumed by .map() (S2)', () => {
    const bad = find(synth, 'Quarterly delivery performance report');
    expect(bad?.acquittal).toBeNull();
    expect(bad?.shape).toBe('mapped-const');
  });

  it('flags exactly the three planted defects and nothing else', () => {
    expect(synth.flagged.map((f) => f.text).sort()).toEqual([
      'LOADING',
      'Loading…',
      'Quarterly delivery performance report',
    ]);
  });

  // ── 2c. THE MARKER MUST CARRY A REASON ────────────────────────────────────
  it('refuses a bare `i18n-defer` with no reason — a rubber stamp acquits nothing', () => {
    const bare = deriveCensus(
      buildProgramFromSources({
        '/src/Bare.tsx': `
          // i18n-defer
          const ROWS = ['Some rendered prose here'];
          export function R() { return <ul>{ROWS.map((r) => <li>{r}</li>)}</ul>; }
        `,
      }),
      '/',
      { grandfathered: new Set<string>() },
    );
    expect(bare.filesWalked).toBe(1);
    expect(bare.flagged.map((f) => f.text)).toEqual(['Some rendered prose here']);
  });
});

// ═══ THE TREE ════════════════════════════════════════════════════════════════
describe('module-scope literal gate · the tree', () => {
  let census: Census;

  beforeAll(() => {
    census = deriveCensus(buildRepoProgram(ROOT), ROOT, {
      grandfathered: grandfatheredKeys(),
    });
  }, 180000);

  it('examined the tree at all', () => {
    expect(census.filesWalked).toBeGreaterThan(100);
    // Membership both ways, never a count.
    //
    // ⚠️ The anchor is `Button.variant`, and the first draft of this test
    // anchored on `LoadingState` instead — then this batch fixed LoadingState,
    // removed its every default, and the guard went red on a tree that was
    // getting BETTER. Which is the guard working, and the lesson: **anchor a
    // population guard on something the batch is not editing.** `Button`'s
    // `variant` default is held in place by DP2-BUTTON-01 and by the `Variant`
    // type, so it is as stable as this tree has.
    expect(census.candidates.some((c) => c.file.endsWith('ui-v2/Button.tsx'))).toBe(true);
    // And a known-FALSE member: specs are out of scope, so none may appear.
    expect(census.candidates.some((c) => /\.test\.tsx?$/.test(c.file))).toBe(false);
  });

  it('no reader-visible literal sits where t() cannot reach it', () => {
    const report = census.flagged
      .map((f) => `  ${f.shape}  ${f.file}:${f.line}  ${f.owner}.${f.prop}  ${JSON.stringify(f.text)}`)
      .join('\n');
    expect(
      census.flagged.length,
      `Literals at sites t() cannot reach, with no reason stated:\n${report}\n\n` +
        'Fix: resolve it in the component BODY via t(), or state why it is not ' +
        'copy in an `// i18n-defer: <reason>` comment at the site.',
    ).toBe(0);
  });

  it('the grandfather list is BILATERAL — every key still names a live const', () => {
    const live = new Set(census.mappedConstKeys);
    const dead = [...grandfatheredKeys()].filter((k) => !live.has(k));
    expect(
      dead,
      `Grandfathered keys naming no live mapped const. The const was renamed, ` +
        `moved, or adjudicated — delete the row:\n${dead.join('\n')}`,
    ).toEqual([]);
  });

  it('the grandfather list can only shrink', () => {
    // A ceiling, not an equality: adjudicating one must not require editing a
    // number, but ADDING one must be impossible without editing this test.
    expect(S2_GRANDFATHERED.length).toBeLessThanOrEqual(57);
  });

  it('reports the alias tripwire that limit 1 depends on', () => {
    // Reachability is by JSX tag name; a VALUE alias could hide a render site.
    // Zero today. If this rises, limit 1 needs re-reading before the
    // `unreachable-default` acquittals are trusted.
    expect(census.aliasImportCount).toBe(0);
  });
});
