// ─────────────────────────────────────────────────────────────────────────────
// THE NUMERIC ARM OF THE PROJECTION GATE — bilateral, and probed BOTH ways.
//
// ⚠️ **POPULATION CONTROLS FIRST.** `EMPTY-INPUT-REPORTS-CLEAN-01`: an
// instrument that examined nothing returns the same green as one that examined
// everything and found nothing wrong. Every assertion below runs over a
// population this file proves is non-empty FIRST, and asserts MEMBERSHIP rather
// than a count.
//
// ⚠️ **AND THE ACQUITTALS ARE ASSERTED, NOT ASSUMED.** Four of the declared
// fields have `days` in the name and are CORRECT as stored values. A gate probed
// only against what it convicts has never been shown to acquit — so the four are
// pinned, and the four false accusations an earlier matcher produced
// (`transitionId`, `packageCount`, `message`, `stage`) are pinned as negatives.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  DAY_COUNTS,
  STORAGE_SCOPE,
  declaredDayCountFields,
  takesInjectedNow,
  writesField,
} from './dayCounts';
import { sourceFiles } from './derive';

/** The storage scope, resolved to real files. */
const SCOPE_FILES = sourceFiles().filter((f) =>
  STORAGE_SCOPE.some((s) => f === s || f.startsWith(`${s}/`)),
);

const DERIVED = declaredDayCountFields(undefined, SCOPE_FILES);
const derivedFields = [...new Set(DERIVED.map((d) => d.field))].sort();
const declaredFields = [...new Set(DAY_COUNTS.map((r) => r.field))].sort();

describe('POPULATION + MATCHER CONTROLS — before any row is believed', () => {
  it('the storage scope resolves to real files, and includes the three known homes', () => {
    expect(SCOPE_FILES.length).toBeGreaterThan(3);
    expect(SCOPE_FILES).toContain('src/services/data/types.ts');
    expect(SCOPE_FILES).toContain('src/data/mockContracts.ts');
    expect(SCOPE_FILES).toContain('src/types/supplier.types.ts');
  });

  it('the derivation is NON-EMPTY, finds a known-true member and NOT a retired one', () => {
    expect(DERIVED.length).toBeGreaterThan(0);
    // Known-TRUE: still declared on `PurchaseOrder`.
    expect(derivedFields).toContain('daysOverdue');
    // Known-FALSE, and it is the interesting half: `daysUntilExpiry` was the
    // anchor here until it was RETIRED. Asserting its absence is what proves
    // the derivation reads the tree rather than a memory of it.
    expect(derivedFields).not.toContain('daysUntilExpiry');
    expect(derivedFields).not.toContain('daysLeft');
  });

  it('the matcher does NOT re-commit the four false accusations of the widened scan', () => {
    // Each of these matched an earlier `[Dd]ays|[Aa]ge|[Tt]ransit` matcher —
    // `transitionId` on *transit*; the rest on *age*. All four are real fields
    // and none is a day-count.
    for (const ghost of ['transitionId', 'packageCount', 'message', 'stage']) {
      expect(derivedFields).not.toContain(ghost);
    }
  });

  it('the matcher does NOT match an ASSIGNMENT whose value begins with "number"', () => {
    // `noticeRequiredDays: numbers.noticeRequiredDays,` matched a `:\s*number`
    // matcher. The declaration regex requires a terminating `;`.
    const synthetic = ['  noticeRequiredDays: numbers.noticeRequiredDays,'].join('\n');
    const hits = declaredDayCountFields(() => synthetic, ['synthetic.ts']);
    expect(hits).toEqual([]);
  });

  it('the matcher DOES match a real declaration — the positive half of that control', () => {
    const hits = declaredDayCountFields(() => '  daysUntilExpiry: number;', ['synthetic.ts']);
    expect(hits).toEqual([{ file: 'synthetic.ts', field: 'daysUntilExpiry' }]);
  });

  it('the matcher is CRLF-immune — the same bytes in both line endings agree', () => {
    const lf = '  daysOverdue: number;\n  delayDays?: number;\n';
    const crlf = lf.replace(/\n/g, '\r\n');
    expect(declaredDayCountFields(() => crlf, ['x.ts'])).toEqual(
      declaredDayCountFields(() => lf, ['x.ts']),
    );
    expect(declaredDayCountFields(() => crlf, ['x.ts'])).toHaveLength(2);
  });
});

describe('BILATERAL — declared == derived, as SETS', () => {
  it('every DERIVED day-count field is DECLARED (no field slips in unclassified)', () => {
    expect(declaredFields).toEqual(expect.arrayContaining(derivedFields));
    const undeclared = derivedFields.filter((f) => !declaredFields.includes(f));
    expect(undeclared).toEqual([]);
  });

  it('every DECLARED row is still DERIVED (no row outlives its field)', () => {
    const orphaned = declaredFields.filter((f) => !derivedFields.includes(f));
    expect(orphaned).toEqual([]);
  });
});

describe('EVERY ROW STATES A CHECKABLE CLAIM', () => {
  it('the two clock groups NAME the other endpoint; acquittals must not', () => {
    for (const row of DAY_COUNTS) {
      if (row.group === 'not-a-clock-difference') {
        expect(row.against, `${row.owner}.${row.field}`).toBeUndefined();
        expect(row.reason, `${row.owner}.${row.field} must say why`).toBeTruthy();
      } else {
        expect(row.against, `${row.owner}.${row.field} must name its endpoint`).toBeTruthy();
      }
    }
  });

  it('the named endpoint EXISTS on a type in the storage scope', () => {
    const corpus = SCOPE_FILES.map((f) => readFileSync(f, 'utf8')).join('\n');
    for (const row of DAY_COUNTS) {
      if (!row.against) continue;
      expect(
        new RegExp(`\\b${row.against}\\??:`).test(corpus),
        `${row.owner}.${row.field} counts against "${row.against}", which no type declares`,
      ).toBe(true);
    }
  });

  it('`computed-at-read` names a producer that takes an INJECTED now', () => {
    const computed = DAY_COUNTS.filter((r) => r.group === 'computed-at-read');
    // Population control: this group is non-empty, so the loop is not vacuous.
    expect(computed.length).toBeGreaterThan(0);
    for (const row of computed) {
      expect(existsSync(row.producer!), `${row.producer} missing`).toBe(true);
      expect(
        takesInjectedNow(row.producer!),
        `${row.producer} must take an injected now — a producer with its own clock is the defect`,
      ).toBe(true);
      expect(writesField(row.producer!, row.field)).toBe(true);
    }
  });

  it('`stored-in-fixtures` really is written by a fixture', () => {
    const stored = DAY_COUNTS.filter((r) => r.group === 'stored-in-fixtures');
    expect(stored.length).toBeGreaterThan(0);
    const fixtures = sourceFiles().filter((f) => /\/data\/mock[A-Z]|\/mock\/fixtures\//.test(f));
    expect(fixtures.length).toBeGreaterThan(0);
    for (const row of stored) {
      expect(
        fixtures.some((f) => writesField(f, row.field)),
        `${row.owner}.${row.field} claims stored-in-fixtures but no fixture writes it`,
      ).toBe(true);
    }
  });

  it('`factWhenPresent` names a date the same storage scope declares', () => {
    const corpus = SCOPE_FILES.map((f) => readFileSync(f, 'utf8')).join('\n');
    const marked = DAY_COUNTS.filter((r) => r.factWhenPresent);
    expect(marked.length).toBeGreaterThan(0);
    for (const row of marked) {
      expect(new RegExp(`\\b${row.factWhenPresent}\\??:`).test(corpus)).toBe(true);
    }
  });
});

describe('⚠️ mintedAtWrite — the clock value COMPUTED AND THEN STORED', () => {
  it('every marker names a file that really writes the field', () => {
    // ⚠️ VACUOUS TODAY, AND SAID SO RATHER THAN HIDDEN. The tree's only marker
    // was `Contract.daysUntilExpiry`, minted by the contract wizard, and the
    // field is retired — so this loop has nothing to iterate. The assertion
    // BELOW is what keeps that honest: it derives the marker set from the tree
    // instead of trusting this one, over a population it proves is non-empty.
    for (const row of DAY_COUNTS.filter((r) => r.mintedAtWrite)) {
      expect(existsSync(row.mintedAtWrite!)).toBe(true);
      expect(
        writesField(row.mintedAtWrite!, row.field),
        `${row.mintedAtWrite} no longer writes ${row.field} — remove the marker with the write`,
      ).toBe(true);
    }
  });

  it('⚠️ DERIVED both ways — no NON-FIXTURE file writes a stored day-count undeclared', () => {
    // The half that cannot go vacuous. It scans every non-fixture source file
    // for a write of any `stored-in-fixtures` day-count, and pins the result
    // EQUAL to the declared `mintedAtWrite` set. A new mint anywhere in the tree
    // turns this red with nobody editing the table.
    const stored = DAY_COUNTS.filter((r) => r.group === 'stored-in-fixtures');
    const nonFixture = sourceFiles().filter(
      (f) => !/\/data\/mock[A-Z]|\/mock\/fixtures\//.test(f) && !/projectionGate/.test(f),
    );
    // POPULATION CONTROLS — both must be non-empty or the empty result below
    // reports on the scan rather than on the tree.
    expect(stored.length).toBeGreaterThan(0);
    expect(nonFixture.length).toBeGreaterThan(50);
    expect(nonFixture).toContain('src/pages-v2/BuyerContracts.tsx');

    const found: string[] = [];
    for (const row of stored) {
      for (const f of nonFixture) {
        if (writesField(f, row.field)) found.push(`${f}:${row.field}`);
      }
    }
    const declared = DAY_COUNTS.filter((r) => r.mintedAtWrite).map(
      (r) => `${r.mintedAtWrite}:${r.field}`,
    );
    expect(found.sort()).toEqual(declared.sort());
  });

  it('the shorthand half of the write matcher works — it is what finds the one real site', () => {
    // `BuyerContracts` mints this with ES6 shorthand (`daysUntilExpiry,`), so a
    // `field:`-only matcher reports the sole minted site in the tree as absent.
    expect(writesField('x.ts', 'daysUntilExpiry', () => '      daysUntilExpiry,')).toBe(true);
    expect(writesField('x.ts', 'daysUntilExpiry', () => '  daysUntilExpiry: 590,')).toBe(true);
    // …and a DECLARATION is not a write.
    expect(writesField('x.ts', 'daysUntilExpiry', () => '  daysUntilExpiry: number;')).toBe(false);
    // …nor is a commented-out one.
    expect(writesField('x.ts', 'daysUntilExpiry', () => '  // daysUntilExpiry: 590,')).toBe(false);
  });
});

describe('ACQUITTALS — asserted, because a gate that only convicts is unprobed', () => {
  it('the four non-clock day-fields are acquitted and each says why', () => {
    const acquitted = DAY_COUNTS.filter((r) => r.group === 'not-a-clock-difference');
    expect(acquitted.map((r) => r.field).sort()).toEqual([
      'coverDays',
      'daysOfSupply',
      'leadTimeDays',
      'noticeRequiredDays',
    ]);
    for (const row of acquitted) expect(row.reason!.length).toBeGreaterThan(20);
  });
});
