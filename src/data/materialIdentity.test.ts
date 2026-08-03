// ─────────────────────────────────────────────────────────────────────────────
// CP-2 · B2a — MATERIAL IDENTITY, PINNED IN BOTH DIRECTIONS.
//
// The batch that produced this file broke the code collisions in the document
// lane. Its deliverable is a PROPERTY, not a diff, so the property is pinned
// here rather than described in a PR nobody re-reads:
//
//   ONE CODE, ONE MEANING   — no material code carries two descriptions.
//   ONE MEANING, ONE CODE   — no material description rides two codes.
//
// ── WHY BOTH DIRECTIONS (the correction that produced this file) ─────────────
//   The dispatch chased the first direction only. The census found the mirror
//   image and it was worse: four materials carried one code in PO + Inventory
//   and a DIFFERENT code in GR + Shipments, so a goods receipt could not be
//   reconciled to its purchase order on the material code at all — and nothing
//   tested that it should. A CENSUS CHECKING ONLY ONE DIRECTION REPORTS A CLEAN
//   TREE THAT STILL CANNOT JOIN. Both halves are asserted below, derived from
//   the fixtures rather than listed, so neither can rot into a stale literal.
//
// ── WHY A REGULATORY PIN LIVES IN AN IDENTITY TEST ──────────────────────────
//   `inferBpom` (`GRInspectionWizard.tsx`) decides whether a received lot needs
//   a BPOM lot check by reading the material code's PREFIX, and it FAILS OPEN —
//   an unrecognised prefix yields "no check required". That makes every
//   code-space edit a potential regulatory change, silently. The master holds no
//   `FR-` code at all, so re-pointing document-lane codes ONTO master codes
//   would have switched the BPOM check OFF on every fragrance line. That is why
//   B2a minted NEW codes that keep their first segment instead. The firing set
//   is pinned below so the neutrality is TESTED, not assumed — and so the next
//   sweep cannot change a compliance check as a side effect of a cleanup.
//   `inferBpom` itself is untouched (its rule CONTENT is `D-COMP-BPOM`, with
//   compliance); this pins the INPUT it reads.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';

import { MATERIAL_MASTER } from '../services/sdc/fixtures';
import { mockGoodsReceipts } from './mockGoodsReceipts';
import { mockInventory } from './mockInventory';
import { mockPurchaseOrders } from './mockPurchaseOrders';
import { mockShipments } from './mockShipments';

/** One material reference as the document lane states it. `where` is carried so
 *  a failure names the document that disagrees, not just the pair. */
interface MaterialRef {
  readonly code: string;
  readonly meaning: string;
  readonly where: string;
}

const REFS: readonly MaterialRef[] = [
  ...mockInventory.map((r) => ({
    code: r.materialCode,
    meaning: r.materialDescription,
    where: `inventory/${r.id}`,
  })),
  ...mockPurchaseOrders.flatMap((po) =>
    po.lineItems.map((li) => ({
      code: li.materialCode,
      meaning: li.description,
      where: `po/${po.poNumber}`,
    })),
  ),
  ...mockGoodsReceipts.flatMap((gr) =>
    gr.inspectionResults.map((ir) => ({
      code: ir.materialCode,
      meaning: ir.description,
      where: `gr/${gr.grNumber}`,
    })),
  ),
  ...mockShipments.flatMap((s) =>
    s.lineItems.map((li) => ({
      code: li.materialCode,
      meaning: li.description,
      where: `shipment/${s.id}`,
    })),
  ),
];

/** Group `REFS` by one field, collecting the distinct values of the other. */
const distinctBy = (key: 'code' | 'meaning', value: 'code' | 'meaning') => {
  const out = new Map<string, Map<string, string[]>>();
  for (const r of REFS) {
    if (!out.has(r[key])) out.set(r[key], new Map());
    const inner = out.get(r[key])!;
    if (!inner.has(r[value])) inner.set(r[value], []);
    inner.get(r[value])!.push(r.where);
  }
  return out;
};

/** Render the offenders so a failure reads as a report, not a diff of counts. */
const offenders = (grouped: ReturnType<typeof distinctBy>) =>
  [...grouped.entries()]
    .filter(([, inner]) => inner.size > 1)
    .map(([k, inner]) => ({
      [k === '' ? '(blank)' : k]: [...inner.entries()].map(
        ([v, wheres]) => `${v} @ ${[...new Set(wheres)].sort().join(', ')}`,
      ),
    }));

describe('CP-2 · B2a — one code, one meaning (across the whole document lane)', () => {
  it('the fixtures actually carry material references (guards a vacuous pass)', () => {
    // Every assertion below is a "no offenders" shape, which an empty REFS would
    // satisfy trivially. This is the floor that makes the rest mean something.
    expect(REFS.length).toBeGreaterThan(40);
    expect(new Set(REFS.map((r) => r.code)).size).toBeGreaterThan(20);
  });

  it('NO material code carries two different meanings', () => {
    expect(offenders(distinctBy('code', 'meaning'))).toEqual([]);
  });

  it('NO material meaning rides two different codes', () => {
    // The half the original dispatch did not ask for. Before B2a this failed on
    // four pairs, each split PO+Inventory vs GR+Shipments — the exact shape that
    // makes a GR→PO reconciliation on the material code silently find nothing.
    expect(offenders(distinctBy('meaning', 'code'))).toEqual([]);
  });
});

describe('CP-2 · B2a — the document lane no longer CONTRADICTS the master', () => {
  // The two spaces are still separate (that is B2b's question, and it is
  // deliberately open). What B2a settled is narrower and is the precondition for
  // a schema freeze: where the two spaces SHARE a code, they now mean the same
  // thing. Pinned as a literal because "means the same thing" is a human
  // judgement — a change here is a review, not a refactor.
  const shared = [...new Set(REFS.map((r) => r.code))]
    .filter((c) => c in MATERIAL_MASTER)
    .sort();

  it('lists exactly the codes both spaces name', () => {
    expect(shared).toEqual(['AI-NIAC-6601', 'RM-EMUL-3320']);
  });

  it('each shared code means the master thing on both sides', () => {
    const both = shared.map((c) => ({
      code: c,
      master: MATERIAL_MASTER[c].label,
      document: [...new Set(REFS.filter((r) => r.code === c).map((r) => r.meaning))],
    }));
    expect(both).toEqual([
      {
        code: 'AI-NIAC-6601',
        master: 'Niacinamide (Vitamin B3)',
        // Same substance; the document line states the grade the master leaves
        // unspecified. The master's under-specification is booked to B2b — it is
        // a master-content question, not a collision.
        document: ['Niacinamide USP Grade 99.5% (Vitamin B3)'],
      },
      {
        code: 'RM-EMUL-3320',
        master: 'Cetearyl Alcohol',
        // Was `Polysorbate 80` — a DIFFERENT substance — until B2a moved that
        // meaning to `RM-EMUL-9430` and brought the document lane's own Cetearyl
        // (previously `RM-EMUL-9420`) onto the code its master owner declares.
        document: ['Cetearyl Alcohol — Vegetable Origin'],
      },
    ]);
  });

  it('the codes B2a freed are no longer squatted on by the document lane', () => {
    // `RM-EMUL-3310` (Glycerin) and `PK-PETB-8810` (PET Bottle 250ml) are master
    // materials that the document lane used to define as something else.
    const codes = new Set(REFS.map((r) => r.code));
    expect(codes.has('RM-EMUL-3310')).toBe(false);
    expect(codes.has('PK-PETB-8810')).toBe(false);
  });
});

describe('CP-2 · B2a — the BPOM firing set is UNCHANGED by the re-coding', () => {
  // The predicate `inferBpom` applies, restated here over the same input. This
  // is deliberately a COPY and not an import: importing it would couple a
  // regulatory pin to a component's export surface, and the point is to detect
  // the day the two stop agreeing.
  const wouldRequireBpom = (code: string) => code.startsWith('AI-') || code.startsWith('FR-');

  it('pins the exact set of codes that trigger a BPOM lot check', () => {
    const firing = [...new Set(REFS.map((r) => r.code))].filter(wouldRequireBpom).sort();
    // Byte-identical to the pre-B2a set. Every re-code preserved its first
    // segment precisely so this list could not move: FR-WARDA-2401 → FR-WARD-4410
    // and FR-EMINA-3550 → FR-EMIN-4420 are both FR- on each side, and the
    // RM-/PK- re-codes never fired at all.
    expect(firing).toEqual([
      'AI-HYALU-6610',
      'AI-NIAC-6601',
      'AI-NIAC-6605',
      'AI-PANTO-6640',
      // Found by THIS pin, not by the census that preceded it: the census
      // enumerated codes with a regex assuming a 2–6 character middle segment,
      // and `PEPTIDE` is seven. A shape assumption made a real code invisible to
      // a census whose whole subject was that codes are OPAQUE. Derived
      // assertions catch what hand-listed ones cannot — which is why the two
      // directional tests above are computed rather than pinned.
      'AI-PEPTIDE-8801',
      'AI-RETA-6750',
      'AI-SALI-6800',
      'AI-VITC-6720',
      'AI-VITC-6730',
      'FR-EMIN-4420',
      'FR-MKOV-5510',
      'FR-MKOV-5520',
      'FR-WARD-4410',
      'FR-WARD-4430',
      'FR-WARD-4440',
    ]);
  });

  it('no code B2a introduced changes its regulatory class', () => {
    // Stated as the RULE rather than the list, so it also governs the next sweep.
    const introduced: readonly [string, string][] = [
      ['RM-EMUL-3310', 'RM-EMUL-9410'], // Glyceryl Stearate SE off the master's code
      ['RM-EMUL-3320', 'RM-EMUL-9430'], // Polysorbate 80 off the master's code
      ['RM-EMUL-9420', 'RM-EMUL-3320'], // Cetearyl onto its master owner
      ['PK-PETB-8810', 'PK-PETB-8802'], // Emina 100ml Clear off the master's code
      ['PK-PETB-8810', 'PK-PETB-8803'], // Wardah 100ml Airless Pump off it too
      ['PK-PET-1100', 'PK-PETB-8801'], // GR/Shipment 200ml onto the PO/Inv code
      ['PK-PET-1110', 'PK-PETB-8802'], // GR/Shipment 100ml onto the PO/Inv code
      ['FR-WARDA-2401', 'FR-WARD-4410'], // one meaning, one code (fragrance)
      ['FR-EMINA-3550', 'FR-EMIN-4420'], // one meaning, one code (fragrance)
    ];
    for (const [before, after] of introduced) {
      expect(wouldRequireBpom(before), `${before} → ${after}`).toBe(wouldRequireBpom(after));
    }
  });
});
