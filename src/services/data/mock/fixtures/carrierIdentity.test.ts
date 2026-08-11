// ─────────────────────────────────────────────────────────────────────────────
// DISCOVERY-REAL-SUBJECTS-01 · batch E — the carrier lane stays fictional.
//
// WHY THIS IS A POSITIVE VOCABULARY AND NOT A DENYLIST. PF-2a's endorsement
// guard is a string census over known names: adequate for keeping FOURTEEN
// KNOWN names out, useless as a discovery mechanism, and it trains the next
// author to append to a list. The rule that generalises is the one that fails
// CLOSED on a name nobody has thought of yet. So this asserts what a carrier
// identity MAY be, not what it may not:
//
//   · every `carrier`  is `Sample …` or a declared sentinel;
//   · every `trackingNumber` / `containerNumber` is `SMPL-…` or a sentinel.
//
// A real carrier added tomorrow fails this without anyone editing the test.
// The refs are held to the same rule as the names because a real ISO container
// owner code (the ones that were here) identifies the line on its own — removing
// the name and keeping the code is the completed-half failure PF-2a warns about.
//
// SCOPE, STATED: this covers the two shipment FIXTURES. `CARRIER_OPTIONS` in
// SupplierShipments.tsx is the same lane but lives in a page module; it is not
// imported here to keep this a fixture-level test with no React dependency.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { mockShipments } from '../../../../data/mockShipments';
import { MOCK_ASNS } from './supplierShipments';

/** Values that are explicitly "no carrier yet", not an organisation name. */
const SENTINELS = new Set(['—', 'Awaiting', '']);

const isSampleName = (v: string) => /^Sample\b/.test(v);
const isSampleRef = (v: string) => /^SMPL-/.test(v);

describe('DISCOVERY-REAL-SUBJECTS-01 · carrier identities are fictional by vocabulary', () => {
  const carriers: Array<{ where: string; value: string }> = [
    ...mockShipments.map((s) => ({ where: `mockShipments ${s.id}`, value: s.carrier })),
    ...MOCK_ASNS.map((a) => ({ where: `MOCK_ASNS ${a.id}`, value: a.carrier })),
  ];

  it('is non-vacuous — both shipment fixtures carry carriers', () => {
    expect(mockShipments.length).toBeGreaterThan(0);
    expect(MOCK_ASNS.length).toBeGreaterThan(0);
    expect(carriers.filter((c) => isSampleName(c.value)).length).toBeGreaterThan(0);
  });

  it('every carrier is a Sample name or a declared sentinel', () => {
    const bad = carriers
      .filter((c) => !SENTINELS.has(c.value) && !isSampleName(c.value))
      .map((c) => `${c.where}: ${c.value}`);
    expect(bad, `carrier is not a Sample name: ${bad.join(' | ')}`).toEqual([]);
  });

  it('every tracking / container ref is a SMPL- ref or a declared sentinel', () => {
    const refs: Array<{ where: string; value: string }> = [
      ...mockShipments.flatMap((s) => [
        { where: `mockShipments ${s.id}.trackingNumber`, value: s.trackingNumber },
        ...(s.containerNumber
          ? [{ where: `mockShipments ${s.id}.containerNumber`, value: s.containerNumber }]
          : []),
      ]),
      ...MOCK_ASNS.map((a) => ({ where: `MOCK_ASNS ${a.id}.trackingNumber`, value: a.trackingNumber })),
    ];
    const bad = refs
      .filter((r) => !SENTINELS.has(r.value) && !isSampleRef(r.value))
      .map((r) => `${r.where}: ${r.value}`);
    expect(bad, `ref is not a SMPL- ref: ${bad.join(' | ')}`).toEqual([]);
    expect(refs.filter((r) => isSampleRef(r.value)).length).toBeGreaterThan(0);
  });
});
