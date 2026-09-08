// ────────────────────────────────────────────────────────────────────────────
// `contractExpiry` — the classifier, held against the fixture's AUTHORED LADDER.
//
// ⚠️ **THE ORACLE IS READ OFF DISK AND IT IS NOT THE `status` FIELD.** Two
// separate reasons, and both matter:
//
//   1. The fixture module applies `shiftFields` at load, so `mockContracts`
//      carries RESOLVED dates. What the classifier must reproduce is what the
//      author MEANT, which lives in the raw literals against the family ANCHOR,
//      where `P` cancels (`daysUntil(date + (P − A), P) = date − A`).
//   2. The clock literals RETIRED in this batch — no row stores `Expiring` or
//      `Expired` any more — so `status` is now a MACHINE state. Comparing the
//      classifier to it would assert only that the classifier never overrides
//      anything, which is the opposite of what it is for.
//
// What survives as the oracle is the fixture author's own SECTION LADDER:
// `── Expiring (within 30d) ──`, `── Active expiring within 90d ──`,
// `── Active expiring within 180d ──`, `── Active stable (> 180d) ──`. It sits
// UPSTREAM of every predicate under test (§86: a gate must not derive its
// subject through the code it is probing) and it is the evidence the notice
// rule was ruled against — every one of those comments is exactly true at the
// anchor, which is checked below rather than assumed.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  contractDisplayStatus,
  isLiveContract,
  inRenewalHorizon,
  CONTRACT_LIVE_STATES,
  CONTRACT_RENEWAL_HORIZON_DAYS,
  CONTRACT_EXPIRY_TONE,
  CONTRACT_EXPIRY_CHIP,
} from './contractExpiry';
import { daysUntil, isPast } from './dayProjection';
import { FAMILY_ANCHORS, SDC_FAMILY_CONTRACT_IDS } from './fixturePresent';
import { mockContracts, type ContractStatus } from '../../data/mockContracts';
import { contractsEn, contractsId } from '../../lib/i18n/contracts';

const MS = 86_400_000;
const dayMs = (v: string) => Date.parse(`${v.slice(0, 10)}T00:00:00.000Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const at = (d: string) => `${d}T00:00:00.000Z`;

/** RAW rows, off disk — upstream of `shiftFields`, with the section each was
 *  authored under. Comment lines are stripped BEFORE the chunk split (the
 *  fixture's notes now quote retired literals), and the section markers are
 *  captured before the strip. */
const raw = (() => {
  const lines = readFileSync('src/data/mockContracts.ts', 'utf8')
    .replace(/\r/g, '')
    .split('\n');
  const sectionOf = new Map<string, string>();
  let section = '';
  for (const line of lines) {
    const m = /^\s*\/\/ ── (.+?) ─+/.exec(line);
    if (m) section = m[1].trim();
    const idm = /id: '(ctr-[^']+)'/.exec(line);
    if (idm && !line.trim().startsWith('//')) sectionOf.set(idm[1], section);
  }
  const code = lines.filter((l) => !l.trim().startsWith('//')).join('\n');
  const parts = code.split(/id:\s*'(?=ctr-)/);
  parts.shift();
  return parts.map((p) => {
    const id = /^([^']+)'/.exec(p)?.[1] ?? '';
    return {
      id,
      section: sectionOf.get(id) ?? '',
      status: (/status:\s*'([^']*)'/.exec(p)?.[1] ?? '') as ContractStatus,
      endDate: /endDate:\s*'(\d{4}-\d{2}-\d{2})'/.exec(p)?.[1] ?? '',
      noticeRequiredDays: Number(/noticeRequiredDays:\s*(\d+)/.exec(p)?.[1] ?? NaN),
    };
  });
})();

const A = FAMILY_ANCHORS.contract.anchor;

/** What the author's section says the row should read. */
const SECTION_EXPECTATION: Record<string, ContractStatus> = {
  'Expiring (within 30d)': 'Expiring',
  Expired: 'Expired',
  Renewed: 'Renewed',
  Draft: 'Draft',
  Terminated: 'Terminated',
};
const expected = (r: (typeof raw)[number]): ContractStatus | null =>
  SECTION_EXPECTATION[r.section] ??
  (r.section.startsWith('Active') ? 'Active' : null);

/** The ladder each `Active …` section declares, as a predicate on the offset. */
const LADDER: readonly [string, (d: number) => boolean][] = [
  ['Expiring (within 30d)', (d) => d > 0 && d <= 30],
  ['Active expiring within 90d', (d) => d > 30 && d <= 90],
  ['Active expiring within 180d', (d) => d > 90 && d <= 180],
  ['Active stable (> 180d)', (d) => d > 180],
];

describe('the population this gate speaks for', () => {
  // ⚠️ EMPTY-INPUT-REPORTS-CLEAN-01 — every assertion below is a `.every` or a
  // filtered count, all of which pass vacuously over an empty parse. This runs
  // FIRST and asserts MEMBERSHIP, never a bare count.
  it('parses every authored contract, with both controls', () => {
    expect(raw.length).toBeGreaterThan(10);
    expect(raw.map((r) => r.id)).toContain('ctr-008'); // known-true member
    expect(raw.map((r) => r.id)).not.toContain('ctr-999'); // known-false
    expect(
      raw.every((r) => r.id && r.endDate && r.status && !Number.isNaN(r.noticeRequiredDays)),
    ).toBe(true);
    expect(raw.length).toBe(mockContracts.length);
    expect(new Set(raw.map((r) => r.id))).toEqual(
      new Set(mockContracts.map((c) => c.id)),
    );
  });

  it('⚠️ every row maps to a section expectation — no silent UNMAPPED', () => {
    // Without this, a renamed section comment would make `expected()` return
    // null for a row and the coherence assertions below would quietly stop
    // speaking for it.
    const unmapped = raw.filter((r) => expected(r) === null);
    expect(unmapped.map((r) => `${r.id}: ${r.section}`)).toEqual([]);
  });

  it('the RAW literals are NOT the exported ones — the shift is real', () => {
    const c007 = mockContracts.find((c) => c.id === 'ctr-007')!;
    expect(c007.endDate).not.toBe('2026-06-15');
  });
});

describe('⚠️ THE FIXTURE STORES NO CLOCK STATE — the duplicate source is gone', () => {
  it('no contract row stores `Expiring` or `Expired`', () => {
    // The single assertion this batch's third mutation probe fires. It is a
    // TEST rather than a narrowed type on purpose: a `tsc` failure cannot be
    // probed, because a probe that will not compile is a probe that never ran.
    const clockStates = raw.filter(
      (r) => r.status === 'Expiring' || r.status === 'Expired',
    );
    expect(clockStates.map((r) => `${r.id} stores ${r.status}`)).toEqual([]);
    // CONTROL: the parser CAN see those literals — asserted against the union
    // it reads, so the emptiness above is a measurement and not a blind spot.
    expect(new Set(raw.map((r) => r.status))).toEqual(
      new Set(['Active', 'Renewed', 'Draft', 'Terminated']),
    );
  });
});

describe('contractDisplayStatus — zero misclassified against the authored ladder', () => {
  it("the author's section ladder is exactly true at the anchor", () => {
    // The oracle, verified before anything is asserted against it. Each dated
    // section is read as a PREDICATE on the row's own offset, not as prose.
    for (const [section, pred] of LADDER) {
      const members = raw.filter((r) => r.section === section);
      expect(members.length, section).toBeGreaterThan(0);
      for (const r of members) {
        expect(pred(daysUntil(r.endDate, at(A))!), `${r.id} in ${section}`).toBe(true);
      }
    }
  });

  it('⚠️ every row computes its authored expectation at the anchor — zero misses', () => {
    const missed = raw.filter(
      (r) => contractDisplayStatus(r, at(A)) !== expected(r),
    );
    expect(
      missed.map((r) => `${r.id}: ${contractDisplayStatus(r, at(A))} != ${expected(r)}`),
    ).toEqual([]);
  });

  it('⚠️ CONTROL — a rule that ignores the notice term must FAIL here', () => {
    // Without this the assertion above proves only that SOME rule fits. The
    // shipped 90 is the rule that was actually running, and it misclassifies
    // ctr-005 and ctr-006 — the two rows the ruling turned on.
    const band90 = (r: (typeof raw)[number]): ContractStatus => {
      if (!isLiveContract(r.status)) return r.status;
      const d = daysUntil(r.endDate, at(A))!;
      if (isPast(d)) return 'Expired';
      if (d <= 90) return 'Expiring';
      return r.status;
    };
    const wrong = raw.filter((r) => band90(r) !== expected(r)).map((r) => r.id);
    expect(wrong).toEqual(['ctr-005', 'ctr-006']);

    // …and the everything-is-expiring control, which must be wrong about most
    // of the fixture. A loop that cannot fail proves nothing about the loop
    // above it.
    const allExpiring = raw.filter((r) => expected(r) !== 'Expiring').map((r) => r.id);
    expect(allExpiring.length).toBeGreaterThan(6);
  });

  it('⚠️ the notice term DECIDES — moving one row`s notice moves that row', () => {
    // The ruling made checkable. `ctr-003` is 129 days out at the anchor with a
    // 60-day notice, so it reads Active; widen its notice past its own distance
    // and the SAME row, SAME clock, reads Expiring. No band probe reaches this.
    const c3 = raw.find((r) => r.id === 'ctr-003')!;
    expect(daysUntil(c3.endDate, at(A))).toBe(129);
    expect(contractDisplayStatus(c3, at(A))).toBe('Active');
    expect(
      contractDisplayStatus({ ...c3, noticeRequiredDays: 130 }, at(A)),
    ).toBe('Expiring');
    // …and one day short of its distance leaves it Active — the boundary is a
    // boundary, not an off-by-one that only fires on one value.
    expect(
      contractDisplayStatus({ ...c3, noticeRequiredDays: 128 }, at(A)),
    ).toBe('Active');
    expect(
      contractDisplayStatus({ ...c3, noticeRequiredDays: 129 }, at(A)),
    ).toBe('Expiring');
  });
});

describe('⚠️ the LIVE guard — a clock may not retire what it does not own', () => {
  it('ctr-012 is Terminated and 39 days past its end, and is NOT convicted', () => {
    const c12 = raw.find((r) => r.id === 'ctr-012')!;
    expect(c12.status).toBe('Terminated');
    // The bare rule the guard exists to refuse, asserted so the acquittal is a
    // measurement rather than a claim about intent.
    expect(isPast(daysUntil(c12.endDate, at(A)))).toBe(true);
    expect(contractDisplayStatus(c12, at(A))).toBe('Terminated');
  });

  it('ctr-011 is Draft and 586 days out, and is not swept in either', () => {
    const c11 = raw.find((r) => r.id === 'ctr-011')!;
    expect(c11.status).toBe('Draft');
    expect(contractDisplayStatus(c11, at(A))).toBe('Draft');
  });

  it('the LIVE set is exactly Active · Expiring · Renewed', () => {
    expect([...CONTRACT_LIVE_STATES].sort()).toEqual(
      ['Active', 'Expiring', 'Renewed'].sort(),
    );
    expect(isLiveContract('Active')).toBe(true);
    expect(isLiveContract('Terminated')).toBe(false);
    expect(isLiveContract('Draft')).toBe(false);
    expect(isLiveContract('Expired')).toBe(false);
  });
});

describe('the zero boundary — `days <= 0` is PAST, read and not restated', () => {
  const row = (endDate: string, noticeRequiredDays = 30) => ({
    status: 'Active' as ContractStatus,
    endDate,
    noticeRequiredDays,
  });

  it('a contract ending EXACTLY at `now` reads Expired, one day earlier Expiring', () => {
    const end = '2026-06-01';
    expect(contractDisplayStatus(row(end), at(end))).toBe('Expired');
    expect(
      contractDisplayStatus(row(end), at(iso(dayMs(end) - MS))),
    ).toBe('Expiring');
    expect(
      contractDisplayStatus(row(end), at(iso(dayMs(end) + MS))),
    ).toBe('Expired');
  });

  it('`isPast` is the shared statement and the classifier has no opinion of its own', () => {
    for (const offset of [-2, -1, 0, 1, 2]) {
      const now = at(iso(dayMs('2026-06-01') - offset * MS));
      const days = daysUntil('2026-06-01', now)!;
      const got = contractDisplayStatus(row('2026-06-01'), now);
      expect(got, `offset ${offset}`).toBe(
        isPast(days) ? 'Expired' : days <= 30 ? 'Expiring' : 'Active',
      );
    }
  });

  it('a notice of 0 still expires — the term narrows Expiring, it never blocks Expired', () => {
    // `noticeRequiredDays: 0` is a real term ("no notice required") and the
    // wizard PRESERVES a typed zero. Such a contract never reads Expiring, and
    // must still read Expired the day it ends.
    expect(contractDisplayStatus(row('2026-06-02', 0), at('2026-06-01'))).toBe('Active');
    expect(contractDisplayStatus(row('2026-06-01', 0), at('2026-06-01'))).toBe('Expired');
  });

  it('an unreadable end date keeps the stored status rather than manufacturing one', () => {
    expect(contractDisplayStatus(row('not-a-date'), at('2026-06-01'))).toBe('Active');
  });
});

describe('the renewal horizon — a planning question, kept and named', () => {
  it('is 180 days and stays inside what the subtitle calls six months', () => {
    // ⚠️ The prose coupling, asserted rather than trusted. EN and ID both read
    // "next 6 months" / "6 bulan ke depan" against this number, and neither can
    // see it. Move the constant to 90 and this goes red naming the key.
    expect(CONTRACT_RENEWAL_HORIZON_DAYS).toBe(180);
    expect(CONTRACT_RENEWAL_HORIZON_DAYS).toBeGreaterThanOrEqual(175);
    expect(CONTRACT_RENEWAL_HORIZON_DAYS).toBeLessThanOrEqual(186);
    expect(contractsEn['contracts.pipeline.subtitle']).toContain('6 months');
    expect(contractsId['contracts.pipeline.subtitle']).toContain('6 bulan');
  });

  it('⚠️ the KPI subtitle names NO width, in either locale', () => {
    // The ruled change, held closed: the contracts tile was the only expiry KPI
    // subtitle in the tree carrying a number, and therefore the only one a rule
    // change could falsify.
    expect(contractsEn['contracts.kpi.expiring.subtitle']).not.toMatch(/[0-9]/);
    expect(contractsId['contracts.kpi.expiring.subtitle']).not.toMatch(/[0-9]/);
    // CONTROL both ways: the probe CAN see a digit in this map, so the two
    // negatives above are measurements rather than a regex that never matches.
    expect(contractsEn['contracts.pipeline.subtitle']).toMatch(/[0-9]/);
    expect(contractsId['contracts.pipeline.subtitle']).toMatch(/[0-9]/);
  });

  it('selects the rows a planner needs and excludes the ones a status tab holds', () => {
    const inH = raw.filter((r) => inRenewalHorizon(r, at(A))).map((r) => r.id);
    // Both Expiring rows AND the two the ruling left Active — that superset is
    // the whole reason the horizon is not routed through the classifier.
    expect(inH).toEqual(['ctr-003', 'ctr-004', 'ctr-005', 'ctr-006', 'ctr-007', 'ctr-008']);
    const expiring = raw
      .filter((r) => contractDisplayStatus(r, at(A)) === 'Expiring')
      .map((r) => r.id);
    expect(expiring).toEqual(['ctr-007', 'ctr-008']);
    expect(inH.length).toBeGreaterThan(expiring.length);
  });

  it('excludes what is already past and what is not running', () => {
    const c9 = raw.find((r) => r.id === 'ctr-009')!; // 85 days past its end
    const c12 = raw.find((r) => r.id === 'ctr-012')!; // Terminated
    expect(inRenewalHorizon(c9, at(A))).toBe(false);
    expect(inRenewalHorizon(c12, at(A))).toBe(false);
  });
});

describe('the display maps are total over the status union', () => {
  it('every status has a tone and a chip, and the two agree on which are alarming', () => {
    const all: ContractStatus[] = [
      'Draft',
      'Active',
      'Expiring',
      'Expired',
      'Renewed',
      'Terminated',
    ];
    expect(Object.keys(CONTRACT_EXPIRY_TONE).sort()).toEqual([...all].sort());
    expect(Object.keys(CONTRACT_EXPIRY_CHIP).sort()).toEqual([...all].sort());
    expect(CONTRACT_EXPIRY_TONE.Expired).toContain('danger');
    expect(CONTRACT_EXPIRY_TONE.Expiring).toContain('warning');
    expect(CONTRACT_EXPIRY_TONE.Active).toContain('success');
    // ⚠️ The deliberate change of colour, pinned so it cannot drift back: a
    // contract nobody can act on does not get a semantic colour.
    expect(CONTRACT_EXPIRY_TONE.Terminated).toBe('text-text-tertiary');
    expect(CONTRACT_EXPIRY_TONE.Draft).toBe('text-text-tertiary');
  });
});

describe('⚠️ the shifted fixture agrees with the raw parse at `P`', () => {
  it('every resolved row classifies the same as its raw row at the anchor', () => {
    // The bridge between the two representations. `ctr-013` is SDC-family and
    // does NOT shift, so it is excluded by the same membership ruling that
    // excludes it from `shiftFields` — named here rather than silently skipped.
    const shift = Math.round(
      (dayMs(mockContracts.find((c) => c.id === 'ctr-001')!.endDate) -
        dayMs(raw.find((r) => r.id === 'ctr-001')!.endDate)) /
        MS,
    );
    const P = iso(dayMs(A) + shift * MS);
    const byId = new Map(raw.map((r) => [r.id, r]));
    for (const c of mockContracts) {
      if (SDC_FAMILY_CONTRACT_IDS.includes(c.id)) continue;
      expect(contractDisplayStatus(c, at(P)), c.id).toBe(
        contractDisplayStatus(byId.get(c.id)!, at(A)),
      );
    }
  });
});
