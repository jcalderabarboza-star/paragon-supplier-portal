// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// C11 — THE INVARIANT POINTER AND THE TREE ARE PINNED TOGETHER.
//
// ⚠️ **WHAT THIS ASSERTS, AND WHY BOTH DIRECTIONS ARE LOAD-BEARING.**
//
//   FORWARD  — every enforcer C11 names still exists and still contains the
//              assertion it is cited for. **Retiring an enforcer reddens the
//              document** instead of leaving a promise nobody keeps.
//   REVERSE  — every row is EITHER enforced with both fields resolved OR marked
//              `NOT ENFORCED` and carrying the disclaimer in its own cell.
//              **A row that is neither is refused.**
//
//   A pin that only ran the forward direction would ratify the reverse: an
//   invariant could be added with no enforcer and no marking, and the document
//   would read as twelve-checkable-of-twelve while some were prose. That is the
//   flattering reading, and this file exists to make it impossible.
//
// ⚠️ **THE ANTI-VACUITY CONTROLS COME FIRST AND ARE NOT OPTIONAL.** Every
//   assertion below iterates a parsed population, and a parser that returned []
//   would pass all of them (`EMPTY-INPUT-REPORTS-CLEAN-01`). The first describe
//   asserts the population is real, contains a known-true member, and rejects a
//   known-false one — before any row is believed.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';

import {
  CLASSES,
  NOT_ENFORCED_DISCLAIMER,
  cellCount,
  isAbsent,
  occupiedContractNumbers,
  parseC11Rows,
  rawRowLines,
  resolveEnforcer,
} from './deriveC11Invariants';

const rows = parseC11Rows();

describe('POPULATION + PARSER CONTROLS — before any row is believed', () => {
  it('the document parsed into rows, not silence', () => {
    expect(rows.length).toBeGreaterThan(10);
  });

  it('KNOWN-GOOD FIRST: a row the document really carries is FOUND', () => {
    const v1 = rows.find((r) => r.n === 1);
    expect(v1).toBeDefined();
    expect(v1?.file).toBe('src/services/contracts/conformance/scoping.ts');
  });

  it('and a row it cannot carry is ABSENT — the parser is not inventing', () => {
    expect(rows.find((r) => r.n === 999)).toBeUndefined();
  });

  it('every row parsed FIVE cells — a short row must not read as a clean one', () => {
    const short = rawRowLines()
      .map((l) => ({ l, n: cellCount(l) }))
      .filter((x) => x.n !== 5);
    expect(short.map((x) => `${x.n} cells :: ${x.l.slice(0, 60)}`)).toEqual([]);
  });

  it('row numbers are contiguous from V1 — a gap is a deleted invariant', () => {
    expect(rows.map((r) => r.n)).toEqual(rows.map((_, i) => i + 1));
  });
});

describe('THE CLASSES — every row declares one, and every class is populated', () => {
  it('every row names a known class', () => {
    const bad = rows.filter((r) => !(CLASSES as readonly string[]).includes(r.cls));
    expect(bad.map((r) => `V${r.n}: ${r.cls}`)).toEqual([]);
  });

  // ⚠️ ANTI-VACUITY. Every per-class assertion below is a filter, and a filter
  // over an empty set passes. If a class ever empties, the assertions that
  // discriminate it stop discriminating anything — silently.
  it('⚠️ EVERY class has at least one row — a filter over nothing proves nothing', () => {
    const empty = CLASSES.filter((c) => !rows.some((r) => r.cls === c));
    expect(empty).toEqual([]);
  });
});

describe('FORWARD — a retired enforcer reddens the document', () => {
  const enforced = rows.filter((r) => r.cls !== 'NOT ENFORCED');

  it('CONTROL — there are enforced rows to resolve', () => {
    expect(enforced.length).toBeGreaterThan(5);
  });

  it('every cited enforcer FILE exists on disk', () => {
    const missing = enforced
      .filter((r) => !resolveEnforcer(r.file, r.assertion).fileExists)
      .map((r) => `V${r.n} -> ${r.file}`);
    expect(missing).toEqual([]);
  });

  it('every cited ASSERTION is present in the file it is cited from', () => {
    const absent = enforced
      .filter((r) => {
        const res = resolveEnforcer(r.file, r.assertion);
        return res.fileExists && !res.assertionPresent;
      })
      .map((r) => `V${r.n} -> ${r.file} :: ${r.assertion}`);
    expect(absent).toEqual([]);
  });

  it('KNOWN-BAD CONTROL — a title that is not in the file does NOT resolve', () => {
    const res = resolveEnforcer(
      'src/services/contracts/conformance/scoping.ts',
      'this assertion has never existed in this tree',
    );
    expect(res.fileExists).toBe(true);
    expect(res.assertionPresent).toBe(false);
  });

  it('KNOWN-BAD CONTROL — a file that does not exist does NOT resolve', () => {
    expect(resolveEnforcer('src/no/such/file.ts', 'anything').fileExists).toBe(false);
  });
});

describe('REVERSE — an invariant with no enforcer must SAY so, in its own cell', () => {
  const prose = rows.filter((r) => r.cls === 'NOT ENFORCED');

  it('CONTROL — there are prose rows, so the assertions below discriminate', () => {
    expect(prose.length).toBeGreaterThan(0);
  });

  it('every NOT ENFORCED row carries the disclaimer in its own text', () => {
    const silent = prose
      .filter((r) => !r.text.includes(NOT_ENFORCED_DISCLAIMER))
      .map((r) => `V${r.n}`);
    expect(silent).toEqual([]);
  });

  it('every NOT ENFORCED row leaves BOTH enforcer cells absent', () => {
    const claiming = prose
      .filter((r) => !isAbsent(r.file) || !isAbsent(r.assertion))
      .map((r) => `V${r.n} -> ${r.file} :: ${r.assertion}`);
    expect(claiming).toEqual([]);
  });

  // The direction that catches a row added with no enforcer AND no marking:
  // it would be `NOT ENFORCED`-shaped (empty cells) while declaring a class
  // that promises an instrument.
  it('⚠️ NO ENFORCED ROW HAS AN EMPTY ENFORCER CELL — the silent-promise case', () => {
    const hollow = rows
      .filter((r) => r.cls !== 'NOT ENFORCED')
      .filter((r) => isAbsent(r.file) || isAbsent(r.assertion))
      .map((r) => `V${r.n} (${r.cls})`);
    expect(hollow).toEqual([]);
  });

  it('a prose row does not accidentally satisfy the disclaimer via the class cell', () => {
    // The disclaimer must be in the INVARIANT text, which is where a reader
    // skimming the table actually looks — not in the machine-readable class.
    for (const r of prose) {
      expect(r.text).toContain(NOT_ENFORCED_DISCLAIMER);
      expect(r.cls).toBe('NOT ENFORCED');
    }
  });
});

describe('THE NUMBER — derived from the directory, not chosen', () => {
  it('CONTROL — the directory scan sees real contracts', () => {
    const ns = occupiedContractNumbers();
    expect(ns).toContain(1);
    expect(ns).toContain(10);
  });

  it('the occupied set is contiguous from C1, and C11 is its maximum', () => {
    const ns = occupiedContractNumbers();
    expect(ns).toEqual(ns.map((_, i) => i + 1));
    // This document IS C11, so it is now the max. A twelfth contract makes the
    // opening claim wrong, and this is the assertion that says so.
    expect(Math.max(...ns)).toBe(11);
  });
});
