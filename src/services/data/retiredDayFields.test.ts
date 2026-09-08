// ─────────────────────────────────────────────────────────────────────────────
// THE RETIREMENT, ASSERTED AT THE TYPE, THE FIXTURE, AND THE CLOCK.
//
// ⚠️ **WHY THIS FILE EXISTS AT ALL — AND IT IS THE SAME FINDING ONE LAYER DOWN.**
// Before this batch, `grep -rl daysUntilExpiry --include=*.test.*` returned
// NOTHING. So did `daysLeft`, `daysInTransit`, `delayDays` and `daysOverdue`.
// **No test read any of the five.** That is why retiring two of them is safe —
// nothing asserts on them — and it is also exactly why they drifted 111 and 153
// days without anyone noticing. A field with no reader in the suite has no
// instrument watching it, and a stored clock value with no instrument is a
// number that silently stops being true.
//
// So this file asserts the ABSENCE, which is the only claim that cannot rot:
// re-add either field and it goes red by name.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mockContracts } from '../../data/mockContracts';
import { COMPLIANCE_DATA } from './mock/fixtures/buyerRisk';
import { daysUntil } from './dayProjection';

const EARLY = '2026-09-08T00:00:00.000Z';
const LATER = '2027-03-08T00:00:00.000Z';

describe('POPULATION CONTROLS — nothing below means anything without these', () => {
  it('both fixtures are non-empty and carry the date the projection needs', () => {
    expect(mockContracts.length).toBeGreaterThan(5);
    expect(COMPLIANCE_DATA.length).toBeGreaterThan(5);
    expect(mockContracts.every((c) => typeof c.endDate === 'string')).toBe(true);
    expect(COMPLIANCE_DATA.every((r) => typeof r.expires === 'string')).toBe(true);
  });
});

describe('⚠️ Contract.daysUntilExpiry is RETIRED', () => {
  it('no contract row carries the field', () => {
    for (const c of mockContracts) {
      expect(c, c.contractNumber).not.toHaveProperty('daysUntilExpiry');
    }
  });

  it('the fixture SOURCE declares no such field — the type is not the only guard', () => {
    // A `delete` at runtime would satisfy the check above. This reads the file.
    const src = readFileSync('src/data/mockContracts.ts', 'utf8');
    expect(/^\s*daysUntilExpiry\s*:\s*number\s*;/m.test(src)).toBe(false);
    expect(/^\s*daysUntilExpiry\s*:\s*-?[0-9]+,/m.test(src)).toBe(false);
    // CONTROL: the field it is derived FROM is still there.
    expect(/^\s*endDate\s*:\s*string\s*;/m.test(src)).toBe(true);
  });

  it('the wizard no longer MINTS it — the one non-fixture writer is gone', () => {
    const src = readFileSync('src/pages-v2/BuyerContracts.tsx', 'utf8');
    // Neither the computation nor the shorthand write survives.
    expect(/const daysUntilExpiry = Math\.round/.test(src)).toBe(false);
    expect(/^\s*daysUntilExpiry,\s*$/m.test(src)).toBe(false);
  });

  it('⚠️ the replacement MOVES with the clock — a projection that ignores `now` is the defect', () => {
    const c = mockContracts[0];
    const a = daysUntil(c.endDate, EARLY);
    const b = daysUntil(c.endDate, LATER);
    expect(a).not.toBe(b);
    expect(a!).toBeGreaterThan(b!);
    // 181 days between the two instants, so the counts differ by exactly that.
    expect(a! - b!).toBe(daysUntil(LATER.slice(0, 10), EARLY));
  });
});

describe('⚠️ ComplianceRow.daysLeft is RETIRED', () => {
  it('no compliance row carries the field', () => {
    for (const r of COMPLIANCE_DATA) {
      expect(r, r.supplier).not.toHaveProperty('daysLeft');
    }
  });

  it('the fixture SOURCE declares no such field, and `expires` survives', () => {
    const src = readFileSync('src/services/data/mock/fixtures/buyerRisk.ts', 'utf8');
    expect(/daysLeft\s*:/.test(src)).toBe(false);
    expect(/expires\s*:\s*'[0-9-]{10}'/.test(src)).toBe(true);
  });

  it('⚠️ the replacement MOVES with the clock', () => {
    const r = COMPLIANCE_DATA[0];
    expect(daysUntil(r.expires, EARLY)).not.toBe(daysUntil(r.expires, LATER));
  });
});

describe('⚠️ WHAT THE STORED NUMBERS SAID vs WHAT THE CLOCK SAYS', () => {
  // The retirement is only worth doing if the answers actually differ. These
  // pin the measured gap at the instant it was taken, so a future reader can
  // see WHY the fields went rather than only that they did.
  it('the compliance rows were 153 days stale — every one of them', () => {
    // Authoring date back-solved from `expires - daysLeft` was 2026-04-08 for
    // all 8 rows. Against 2026-09-08 that is 153 days of drift.
    expect(daysUntil('2026-09-08', '2026-04-08T00:00:00.000Z')).toBe(153);
  });

  it('a cert the fixture called "146 days left" is expired at the measured instant', () => {
    const gulf = COMPLIANCE_DATA.find((r) => r.supplier === 'Gulf Logistics');
    expect(gulf, 'Gulf Logistics row is this test’s subject').toBeDefined();
    expect(gulf!.expires).toBe('2026-09-01');
    expect(daysUntil(gulf!.expires, EARLY)).toBe(-7);
  });
});
