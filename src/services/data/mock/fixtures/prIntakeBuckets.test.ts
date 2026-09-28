// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// EVERY INTAKE LINE'S `period` IS A BUCKET THE SHIPPED PARSER ACCEPTS.
//
// ⚠️ **THIS EXISTS BECAUSE THE CLAIM WAS OTHERWISE PROSE.** The operator ruled on
// 2026-09-28 that quarters are refused and that the two `'2026-Q3'` rows become
// valid buckets. The fixture's header now says so — and a header is exactly the
// thing this corpus has watched go stale while the suite stayed green
// (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-CORPUS-01`). So the claim is asserted
// against the real parser, over the real rows.
//
// ⚠️ **NAMED MEMBERS REACHED THROUGH A VALUE, NEVER A COUNT AND NEVER AN ID
// ALONE.** A row count is preserved by construction when a corpus is replaced, and
// an id-only control is the control a replacement walks straight through: #319
// re-anchored four corpora keeping every export name, every row and every id, and
// changed every date — nine instruments read them, none was touched, all stayed
// green. So the two assertions below reach `pil-somo-001` and `pil-grid-002` by
// their PARSED GRAIN, which is a value. Re-anchor the periods and this goes red.
//
// ⚠️ **AND THE GRAIN PINS ARE NOT DECORATION — THEY ARE THE ONLY THING KEEPING A
// WEEK REACHABLE.** `pil-grid-002` is the fixture's sole ISO-week row. Without a
// named pin on it, a later edit "tidying" the fixture to one grain would delete
// the only week-shaped bucket any surface in this tree can render, and nothing
// would say so: the loop below would still pass on four months.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';

import { parseBucket } from '../../../planning/bucket';
import { PR_INTAKE_LINES } from './prIntake';

describe('PR intake fixture — every period is a legal bucket (operator ruling 2026-09-28)', () => {
  it('POPULATION CONTROL — the fixture was really read, and a known member is in it', () => {
    // Derived from something upstream of the assertion: if this import ever
    // resolves to nothing, the loop below passes over zero rows and proves
    // nothing (EMPTY-INPUT-REPORTS-CLEAN-01).
    expect(PR_INTAKE_LINES.length).toBeGreaterThan(0);
    expect(PR_INTAKE_LINES.map((l) => l.id)).toContain('pil-grid-002');
  });

  it('⚠️ KNOWN-BAD CONTROL — the same instrument still refuses a quarter', () => {
    // Without this, a `parseBucket` that accepted everything would make the claim
    // below true and meaningless.
    expect(parseBucket('2026-Q3').ok).toBe(false);
  });

  it('THE CLAIM — no row carries a period the parser refuses', () => {
    const refused = PR_INTAKE_LINES.filter((l) => !parseBucket(l.period).ok).map(
      (l) => `${l.id}: ${l.period}`,
    );
    expect(refused).toEqual([]);
  });

  it('⚠️ the grain follows the lane, pinned at NAMED rows through their parsed grain', () => {
    const grainOf = (id: string): string => {
      const line = PR_INTAKE_LINES.find((l) => l.id === id);
      expect(line, `${id} has left the fixture`).toBeDefined();
      const outcome = parseBucket(line!.period);
      expect(outcome.ok, `${id} carries an unparseable period`).toBe(true);
      if (!outcome.ok) throw new Error('unreachable');
      return outcome.bucket.grain;
    };

    // A raw material on the monthly grain.
    expect(grainOf('pil-somo-001')).toBe('month');
    // Packaging on the ISO-weekly grain — the fixture's ONLY week.
    expect(grainOf('pil-grid-002')).toBe('week');
  });

  it('⚠️ BOTH grains are reachable from this fixture, which a single-grain corpus could not do', () => {
    const grains = new Set(
      PR_INTAKE_LINES.map((l) => parseBucket(l.period)).flatMap((o) =>
        o.ok ? [o.bucket.grain] : [],
      ),
    );
    // Set equality, both directions: a fixture that loses its week fails here,
    // and so does one that gains a grain the union does not have.
    expect([...grains].sort()).toEqual(['month', 'week']);
  });
});
