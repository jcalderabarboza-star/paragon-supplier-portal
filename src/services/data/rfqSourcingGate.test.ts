// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE SOURCING GATE'S DECISION — every verdict arm, pinned to a NAMED MEMBER
// REACHED THROUGH A VALUE.
//
// ⚠️ **NO ARM IS PINNED BY A COUNT** (`DATA-POPULATION-INSTRUMENT-SURVIVES-ITS-
// CORPUS-01`). A count is satisfied by the wrong match and a replacement corpus
// usually preserves it by construction; every claim below names the supplier,
// the designation and the code that produced it, so swapping the corpus reddens
// rather than passes.
//
// The environment is `node` on purpose: it proves the gate needs no DOM, no
// provider and no query client — the property that makes it callable from a
// `PolicyHookFn`, which has none of those.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';

import { DECLARED_PRESENT } from './fixturePresent';
import { PSL_LISTINGS } from './mock/fixtures/pslListings';
import { mockRfqs } from '../../data/mockRfqs';
import { mockSuppliers } from '../../data/mockSuppliers';
import { SupplierStatus } from '../../types/supplier.types';
import { mockQuotations } from '../../data/mockQuotations';
import { rfqFlow } from '../transitions/flows/rfq.flow';
import { POLICY_HOOKS } from '../transitions/policyHooks';
import {
  COMPETITION_FLOOR_INVITEES,
  COMPETITION_TARGET_INVITEES,
  INELIGIBLE_INVITEE_STATUSES,
  awardIntegrity,
  competitionVerdict,
  decideSourcing,
  eligibleInvitees,
  pslExemptionFor,
  quotationOwnerOf,
  rosterStatusOf,
} from './rfqSourcingGate';
import type { PslListing } from './pslListing';

const P = DECLARED_PRESENT;
const rfq = (id: string) => mockRfqs.find((r) => r.id === id)!;

// ─────────────────────────────────────────────────────────────────────────────
describe('REACH — the corpus reaches every arm this file asserts', () => {
  it('⚠️ the exempting pair exists BY NAME, reached through its value', () => {
    // sup-005 holds an in-force Mandatory listing for AI-NIAC-6601 (psl-004).
    // Reached through the VALUE (a Mandatory, in-force, material-scoped row),
    // then named — so a corpus that keeps the ids and changes the designations
    // reddens here rather than passing silently.
    const exempting = PSL_LISTINGS.filter(
      (l) =>
        l.status === 'Mandatory' &&
        l.lifecycle === 'Listed' &&
        l.scope.kind === 'material' &&
        l.scope.materialCodes.includes('AI-NIAC-6601'),
    );
    expect(exempting.map((l) => l.id)).toEqual(['psl-004']);
    expect(exempting[0].supplierId).toBe('sup-005');
  });

  it('⚠️ the mixed-material row exists and its two codes really differ', () => {
    // Without this, the any-suffices counterfactual below is vacuous.
    const mixed = rfq('rfq-014');
    expect(mixed.materialIds).toEqual(['AI-NIAC-6601', 'RM-EMUL-3310']);
    expect(mixed.status).toBe('Draft');
    const codes = new Set(
      PSL_LISTINGS.flatMap((l) => (l.scope.kind === 'material' ? l.scope.materialCodes : [])),
    );
    expect(codes.has('AI-NIAC-6601')).toBe(true);
    expect(codes.has('RM-EMUL-3310')).toBe(false); // the material with NO listing
  });

  it('⚠️ a SUSPENDED supplier exists, and holds no quotation', () => {
    const suspended = mockSuppliers.filter((s) => s.status === SupplierStatus.SUSPENDED);
    expect(suspended.map((s) => s.id)).toEqual(['sup-012']);
    expect(mockQuotations.filter((q) => q.supplierId === 'sup-012')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE TWO CONSTANTS — and the gap between them is the ruling', () => {
  it('the floor is below the target, and neither is the other', () => {
    expect(COMPETITION_FLOOR_INVITEES).toBe(2);
    expect(COMPETITION_TARGET_INVITEES).toBe(3);
    expect(COMPETITION_FLOOR_INVITEES).toBeLessThan(COMPETITION_TARGET_INVITEES);
  });

  it('⚠️ AT THE TARGET IS SILENT, AT THE FLOOR IS ALLOWED WITH A NOTE, BELOW IS REFUSED', () => {
    // All three arms off the SAME function, so "the floor quietly became three"
    // cannot happen without one of these flipping.
    const none = { kind: 'NOT_EXEMPT' } as const;
    expect(competitionVerdict(COMPETITION_TARGET_INVITEES, none).kind).toBe('SATISFIED');
    expect(competitionVerdict(COMPETITION_FLOOR_INVITEES, none).kind).toBe('AT_FLOOR');
    expect(competitionVerdict(COMPETITION_FLOOR_INVITEES - 1, none).kind).toBe('UNDER_FLOOR');
    expect(competitionVerdict(0, none).kind).toBe('UNDER_FLOOR');
  });

  it('⚠️ AT_FLOOR IS AN ALLOWANCE — it is not in the refusable set', () => {
    // The direction a "tidy up the arms" edit would break: the hook refuses on
    // UNDER_FLOOR alone, so AT_FLOOR must remain a distinct, non-refused arm.
    const v = competitionVerdict(2, { kind: 'NOT_EXEMPT' });
    expect(v.kind).not.toBe('UNDER_FLOOR');
    expect(v.kind).toBe('AT_FLOOR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ELIGIBILITY — derived from SupplierStatus, and Onboarding is deliberately IN', () => {
  it('the refusable set is Suspended, and Active is never in it', () => {
    expect([...INELIGIBLE_INVITEE_STATUSES]).toEqual([SupplierStatus.SUSPENDED]);
    expect(INELIGIBLE_INVITEE_STATUSES).not.toContain(SupplierStatus.ACTIVE);
  });

  it('⚠️ ONBOARDING IS NOT REFUSED, AND THE EVIDENCE IS PINNED BESIDE THE RULE', () => {
    // ⚠️ THIS IS THE ASSERTION THAT MAKES THE OTHER READING IMPOSSIBLE TO ADOPT
    // SILENTLY. The dispatched lean was that Onboarding refuses too, on the
    // ground that such a supplier "cannot yet transact". Measured: they DO
    // transact. If that stops being true — if these quotations are removed —
    // this reddens and the ruling gets re-taken on fresh evidence rather than
    // inherited from a sentence.
    expect(INELIGIBLE_INVITEE_STATUSES).not.toContain(SupplierStatus.ONBOARDING);
    const onboarding = mockSuppliers
      .filter((s) => s.status === SupplierStatus.ONBOARDING)
      .map((s) => s.id);
    expect(onboarding).toEqual(['sup-010', 'sup-011']);
    const theirQuotes = mockQuotations.filter((q) => onboarding.includes(q.supplierId));
    expect(theirQuotes.map((q) => q.id).sort()).toEqual(['qt-001c', 'qt-003c', 'qt-006b']);
    expect(theirQuotes.filter((q) => q.status === 'Under Review').map((q) => q.id).sort()).toEqual([
      'qt-001c',
      'qt-003c',
    ]);
  });

  it('a Suspended invitee is named as an offender, with its status', () => {
    const v = eligibleInvitees(['sup-005', 'sup-012'], rosterStatusOf);
    expect(v.kind).toBe('INELIGIBLE_INVITEES');
    if (v.kind !== 'INELIGIBLE_INVITEES') throw new Error('unreachable');
    expect(v.offenders).toEqual([{ supplierId: 'sup-012', status: SupplierStatus.SUSPENDED }]);
    expect(v.eligible).toEqual(['sup-005']);
  });

  it('⚠️ AN UNKNOWN SUPPLIER IS NEITHER REFUSED NOR COUNTED', () => {
    // Refusing would make the hook an existence oracle for the roster; counting
    // would let a typo manufacture competition.
    const v = eligibleInvitees(['sup-005', 'sup-999'], rosterStatusOf);
    expect(v.kind).toBe('ALL_ELIGIBLE');
    expect(v.eligible).toEqual(['sup-005']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE ORDERING — eligibility decides, THEN the count is taken', () => {
  it('an ineligible invitee does NOT count toward the floor', () => {
    // Two invitees, one Suspended ⇒ ONE eligible ⇒ under the floor. If the
    // count were taken over the raw invitee list this would read AT_FLOOR.
    const d = decideSourcing(
      { invitedSupplierIds: ['sup-005', 'sup-012'], materialIds: ['RM-EMUL-3310'] },
      P,
      rosterStatusOf,
    );
    expect(d.eligibility.kind).toBe('INELIGIBLE_INVITEES');
    expect(d.competition.kind).toBe('UNDER_FLOOR');
    if (d.competition.kind !== 'UNDER_FLOOR') throw new Error('unreachable');
    expect(d.competition.eligible).toBe(1);
  });

  it('and the SAME two invitees, both Active, reach the floor', () => {
    // The control that proves the arm above is about ELIGIBILITY and not about
    // the number two.
    const d = decideSourcing(
      { invitedSupplierIds: ['sup-005', 'sup-006'], materialIds: ['RM-EMUL-3310'] },
      P,
      rosterStatusOf,
    );
    expect(d.eligibility.kind).toBe('ALL_ELIGIBLE');
    expect(d.competition.kind).toBe('AT_FLOOR');
  });

  it('⚠️ THE FLOW DECLARES THE HOOKS IN THAT ORDER — the machine agrees with the rule', () => {
    // The dispatcher runs `policyHooks` in array order, so this array IS the
    // ordering. Pinned position for position: swapping the two reddens here.
    const publish = rfqFlow.transitions.find((t) => t.id === 't_rfq_publish')!;
    expect([...publish.policyHooks]).toEqual([
      POLICY_HOOKS.RFQ_PUBLISH_INVITEES_ELIGIBLE,
      POLICY_HOOKS.RFQ_PUBLISH_COMPETITION,
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ RULING 1 — ANY-SUFFICES, with the counterfactual that proves it is a choice', () => {
  const mixed = () => rfq('rfq-014');

  it('the mixed row is EXEMPT, and the exemption names supplier, designation AND code', () => {
    const e = pslExemptionFor(mixed().invitedSupplierIds, mixed().materialIds, P);
    expect(e).toEqual({
      kind: 'EXEMPT',
      supplierId: 'sup-005',
      status: 'Mandatory',
      materialCode: 'AI-NIAC-6601',
    });
  });

  it('⚠️ ALL-MUST-BE-COVERED WOULD GIVE THE OPPOSITE VERDICT ON THIS ROW', () => {
    // The rejected rule, applied by hand to the SAME row through the SAME
    // function — each material asked separately, and all required to exempt.
    // Without this the ruling is merely obeyed; with it, it is probed.
    const perMaterial = mixed().materialIds.map(
      (code) => pslExemptionFor(mixed().invitedSupplierIds, [code], P).kind,
    );
    expect(perMaterial).toEqual(['EXEMPT', 'UNDECIDABLE']);
    const allMustBeCovered = perMaterial.every((k) => k === 'EXEMPT');
    const anySuffices = perMaterial.some((k) => k === 'EXEMPT');
    expect(allMustBeCovered).toBe(false);
    expect(anySuffices).toBe(true);
    // …and the shipped rule follows the second.
    expect(pslExemptionFor(mixed().invitedSupplierIds, mixed().materialIds, P).kind).toBe('EXEMPT');
  });

  it('the whole decision on that row is NOT_REQUIRED, even though 3 were invited', () => {
    // Sharpens the counterfactual: under all-must-be-covered this row would be
    // SATISFIED (three eligible), so the two rules differ in the VERDICT NAME
    // and not merely in whether something is refused.
    const d = decideSourcing(mixed(), P, rosterStatusOf);
    expect(d.eligibility.kind).toBe('ALL_ELIGIBLE');
    expect(d.competition.kind).toBe('NOT_REQUIRED');
    expect(competitionVerdict(3, { kind: 'NOT_EXEMPT' }).kind).toBe('SATISFIED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ THE ACQUITTALS — nothing that is not in force grants anything', () => {
  it('a WITHDRAWN listing grants no exemption', () => {
    // psl-006: sup-007, Validated, lifecycle Withdrawn, on PK-PETB-8804.
    const row = PSL_LISTINGS.find((l) => l.lifecycle === 'Withdrawn')!;
    expect(row.id).toBe('psl-006');
    const code = row.scope.kind === 'material' ? row.scope.materialCodes[0] : '';
    expect(pslExemptionFor([row.supplierId], [code], P).kind).not.toBe('EXEMPT');
  });

  it('a REJECTED listing grants no exemption — even though its status is Mandatory', () => {
    // psl-007 is the sharp one: a MANDATORY designation that was refused. If
    // the ladder were consulted before the clock, this would exempt.
    const row = PSL_LISTINGS.find((l) => l.lifecycle === 'Rejected')!;
    expect(row.id).toBe('psl-007');
    expect(row.status).toBe('Mandatory');
    const code = row.scope.kind === 'material' ? row.scope.materialCodes[0] : '';
    expect(pslExemptionFor([row.supplierId], [code], P).kind).not.toBe('EXEMPT');
  });

  it('a PROPOSED listing grants no exemption — even though its status is Sole Source', () => {
    const row = PSL_LISTINGS.find((l) => l.lifecycle === 'Proposed')!;
    expect(row.id).toBe('psl-008');
    expect(row.status).toBe('Sole Source');
    const code = row.scope.kind === 'material' ? row.scope.materialCodes[0] : '';
    expect(pslExemptionFor([row.supplierId], [code], P).kind).not.toBe('EXEMPT');
  });

  it('⚠️ VALIDATED IS IN FORCE AND STILL DOES NOT EXEMPT — pre-qualification COMPETES', () => {
    // psl-005: sup-005, Validated, in force, on AI-HYALU-6610. The one arm
    // where "in force" is true and the answer is still no.
    const e = pslExemptionFor(['sup-005'], ['AI-HYALU-6610'], P);
    expect(e.kind).toBe('NOT_EXEMPT');
  });

  it('a material A exemption does NOT reach an event for material B', () => {
    // sup-005 is Mandatory on AI-NIAC-6601 and holds nothing on PK-CART-9901.
    expect(pslExemptionFor(['sup-005'], ['AI-NIAC-6601'], P).kind).toBe('EXEMPT');
    expect(pslExemptionFor(['sup-005'], ['PK-CART-9901'], P).kind).not.toBe('EXEMPT');
  });

  it('a supplier who is NOT invited cannot exempt the event', () => {
    expect(pslExemptionFor(['sup-006'], ['AI-NIAC-6601'], P).kind).toBe('NOT_EXEMPT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ RULING 5 — UNDECIDABLE blocks the EXEMPTION, never the event', () => {
  it('a wizard-shaped payload (material NAMES) is undecidable, naming the codes', () => {
    // The live shape of the queued MATERIAL_CATALOG defect: the wizard writes
    // display prose into `materialIds`.
    const e = pslExemptionFor(['sup-005'], ['Niacinamide USP'], P);
    expect(e).toEqual({
      kind: 'UNDECIDABLE',
      because: 'UNMAPPED_MATERIAL',
      codes: ['Niacinamide USP'],
    });
  });

  it('⚠️ IT NEVER GRANTS — the same supplier who WOULD exempt on the real code does not', () => {
    expect(pslExemptionFor(['sup-005'], ['AI-NIAC-6601'], P).kind).toBe('EXEMPT');
    expect(pslExemptionFor(['sup-005'], ['Niacinamide USP'], P).kind).toBe('UNDECIDABLE');
  });

  it('⚠️ AND IT NEVER REFUSES ON ITS OWN — three invitees still SATISFY', () => {
    const d = decideSourcing(
      { invitedSupplierIds: ['sup-005', 'sup-006', 'sup-009'], materialIds: ['Niacinamide USP'] },
      P,
      rosterStatusOf,
    );
    expect(d.exemption.kind).toBe('UNDECIDABLE');
    expect(d.competition.kind).toBe('SATISFIED');
  });

  it('a decided event is never reported undecidable, even with an unmapped code beside it', () => {
    // The mixed row's second code is unmapped; the first one settles the
    // question, so asking the buyer about the second would be noise.
    const d = decideSourcing(rfq('rfq-014'), P, rosterStatusOf);
    expect(d.exemption.kind).toBe('EXEMPT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ PUBLICATION IS NEVER READ — the same row, both ways', () => {
  /** The exempting row with its publication fact flipped, and nothing else. */
  const flipped = (): readonly PslListing[] =>
    PSL_LISTINGS.map((l) =>
      l.id === 'psl-004'
        ? ({ ...l, publishedAt: l.publishedAt === null ? '2026-08-01T00:00:00+07:00' : null } as PslListing)
        : l,
    );

  it('the exempting listing really changes publication state in the probe', () => {
    // Anti-vacuity: if the flip were a no-op, "identical verdicts" would be
    // satisfied by a probe that changed nothing.
    const before = PSL_LISTINGS.find((l) => l.id === 'psl-004')!.publishedAt;
    const after = flipped().find((l) => l.id === 'psl-004')!.publishedAt;
    expect(before).not.toBe(after);
  });

  it('⚠️ the exemption is IDENTICAL published and unpublished', () => {
    const a = pslExemptionFor(['sup-005'], ['AI-NIAC-6601'], P, PSL_LISTINGS);
    const b = pslExemptionFor(['sup-005'], ['AI-NIAC-6601'], P, flipped());
    expect(a).toEqual(b);
    expect(a.kind).toBe('EXEMPT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ CLOCK INDEPENDENCE — the decision is identical under every wall clock', () => {
  const RealDate = globalThis.Date;
  const withOffset = <T,>(days: number, fn: () => T): T => {
    const shift = days * 86_400_000;
    class Shifted extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(RealDate.now() + shift);
        else super(...(args as [string]));
      }
      static now(): number {
        return RealDate.now() + shift;
      }
    }
    globalThis.Date = Shifted as DateConstructor;
    try {
      return fn();
    } finally {
      globalThis.Date = RealDate;
    }
  };

  const blob = () => JSON.stringify(mockRfqs.map((r) => decideSourcing(r, P, rosterStatusOf)));

  it('the probe really moves the clock', () => {
    const here = new Date().getTime();
    const there = withOffset(700, () => new Date().getTime());
    expect(Math.round((there - here) / 86_400_000)).toBe(700);
    expect(globalThis.Date).toBe(RealDate);
  });

  it('three clocks, separated by years, produce byte-identical decisions', () => {
    const base = blob();
    for (const d of [-800, 0, 800]) expect(withOffset(d, blob), `offset ${d}`).toBe(base);
  });

  it('⚠️ and the INJECTED instant still changes the answer — it is not frozen', () => {
    const far = new RealDate(RealDate.parse(P) + 3000 * 86_400_000).toISOString().slice(0, 10);
    expect(pslExemptionFor(['sup-005'], ['AI-NIAC-6601'], P).kind).toBe('EXEMPT');
    expect(pslExemptionFor(['sup-005'], ['AI-NIAC-6601'], far).kind).not.toBe('EXEMPT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('AWARD INTEGRITY — the stronger check, both arms', () => {
  it('a real award passes: the awardee owns the quotation and was invited', () => {
    // rfq-003 / qt-003a / sup-001, reached through the corpus rather than typed.
    const q = mockQuotations.find((x) => x.id === 'qt-003a')!;
    expect(q.supplierId).toBe('sup-001');
    expect(rfq('rfq-003').invitedSupplierIds).toContain('sup-001');
    expect(
      awardIntegrity(
        {
          invitedSupplierIds: rfq('rfq-003').invitedSupplierIds,
          awardedSupplierId: 'sup-001',
          awardedQuotationId: 'qt-003a',
        },
        quotationOwnerOf,
      ),
    ).toEqual({ kind: 'OK' });
  });

  it('⚠️ THE AWARDEE AND THE QUOTATION MAY NAME DIFFERENT SUPPLIERS — refused', () => {
    // The hole the two independent payload writes leave open. sup-002 IS
    // invited to rfq-003 and DOES hold a quotation there, so this is not caught
    // by the weaker "was the awardee invited?" test — which is the whole point.
    expect(rfq('rfq-003').invitedSupplierIds).toContain('sup-002');
    const v = awardIntegrity(
      {
        invitedSupplierIds: rfq('rfq-003').invitedSupplierIds,
        awardedSupplierId: 'sup-002',
        awardedQuotationId: 'qt-003a',
      },
      quotationOwnerOf,
    );
    expect(v).toEqual({
      kind: 'AWARDEE_NOT_THE_QUOTING_SUPPLIER',
      supplierId: 'sup-002',
      quotingSupplierId: 'sup-001',
      quotationId: 'qt-003a',
    });
  });

  it('an awardee who was never invited is refused by name', () => {
    const v = awardIntegrity(
      {
        invitedSupplierIds: ['sup-001'],
        awardedSupplierId: 'sup-008',
        awardedQuotationId: 'qt-x',
      },
      (id) => (id === 'qt-x' ? 'sup-008' : null),
    );
    expect(v).toEqual({ kind: 'AWARDEE_NOT_INVITED', supplierId: 'sup-008' });
  });

  it('a quotation that does not exist is refused, not silently passed', () => {
    const v = awardIntegrity(
      { invitedSupplierIds: ['sup-001'], awardedSupplierId: 'sup-001', awardedQuotationId: 'qt-nope' },
      quotationOwnerOf,
    );
    expect(v.kind).toBe('AWARDEE_NOT_THE_QUOTING_SUPPLIER');
  });

  it('⚠️ THE WEAKER CHECK IS VACUOUS AGAINST THIS CORPUS — measured, not assumed', () => {
    // Why the stronger check is the one that shipped: no seeded quotation
    // belongs to an uninvited supplier, so an "awardee not invited" arm can
    // never be reached from a fixture and must be dispatched deliberately.
    const stray = mockQuotations.filter((q) => {
      const parent = mockRfqs.find((r) => r.id === q.rfqId);
      return parent !== undefined && !parent.invitedSupplierIds.includes(q.supplierId);
    });
    expect(stray).toEqual([]);
    expect(mockQuotations.length).toBeGreaterThan(20);
  });
});
