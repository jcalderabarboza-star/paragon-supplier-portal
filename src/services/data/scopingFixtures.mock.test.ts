// ─────────────────────────────────────────────────────────────────────────────
// MOCK FIXTURE REGRESSIONS — NOT A CONTRACT, AND THE FILENAME SAYS SO.
//
// ── WHY THIS FILE EXISTS SEPARATELY ─────────────────────────────────────────
//   These eight assertions lived in `scoping.contract.test.ts` and travelled
//   under the word "contract" for their whole life. They are not contract.
//   Every one of them is true of THIS FIXTURE SET and would be false of any
//   other correct implementation:
//
//     · they name specific rows — `sa-0001`, `sa-0002`, `sa-1002`, `sa-1007`,
//       `PO-2025-00107`, `sample-personalcare`;
//     · or they assert a specific cross-tenant DISTRIBUTION — `getKpis` says
//       supplier A has improvement actions and supplier B has none, which is a
//       statement about seeded data, not about scoping;
//     · or they reach outside `IDataService` altogether — the obligations test
//       imports `deriveDeliveryChase` and `SDC_SIMULATED_NOW` and is really a
//       test of that derivation.
//
//   An `httpDataService` pointed at a real backend would fail all eight while
//   being perfectly correct. Left in the conformance factory they would have
//   read as contract violations by an implementation that had violated nothing
//   — which is the most expensive kind of false accusation a conformance kit
//   can make, because it is made against a team that cannot fix it.
//
// ── ⚠️ WHY THEY WERE NOT PARAMETERISED INSTEAD (operator ruling) ────────────
//   The obvious "fix" is a seeding hook: let the caller declare which agreement
//   ids it expects, and assert against that. **That converts a real assertion
//   into a tautology** — `toEqual(['sa-0001', 'sa-0002'])` becomes "assert
//   whatever the caller says", which passes for every implementation and
//   therefore certifies nothing. It is the same defect the conformance factory
//   is probed against with a broken stub, arriving through the front door. A
//   test that names a fixture row IS a fixture test; the honest move is to say
//   so, not to launder it through a parameter.
//
// ── WHAT DID MOVE ───────────────────────────────────────────────────────────
//   The other 30 assertions from that file are now
//   `services/contracts/conformance/scoping.ts`, stated once and runnable
//   against any `IDataService`. Nothing was rewritten in either direction: each
//   assertion here asserts exactly what it asserted before, against the same
//   scopes, in the same order.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { mockDataService as svc } from './mock/mockDataService';
import type { QueryScope } from './types';
import { deriveDeliveryChase } from '../chase';
import { SDC_SIMULATED_NOW } from '../sdc';
import { PERSONA_SYSTEM_ROLES } from '../transitions/businessRoles';

const A = 'sup-007';
const B = 'sup-002';
const C = 'sup-005';
const buyerScope: QueryScope = { personaType: 'buyer', supplierId: null, businessRoles: PERSONA_SYSTEM_ROLES.buyer };
const aScope: QueryScope = { personaType: 'supplier', supplierId: A, businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const bScope: QueryScope = { personaType: 'supplier', supplierId: B, businessRoles: PERSONA_SYSTEM_ROLES.supplier };
const cScope: QueryScope = { personaType: 'supplier', supplierId: C, businessRoles: PERSONA_SYSTEM_ROLES.supplier };

describe('mock fixtures — seeded rows the surfaces depend on', () => {
  it('getSupplierScorecards: buyer sees the portfolio grading; a supplier sees none', async () => {
    const buyer = (await svc.procurement.getSupplierScorecards(buyerScope)).items;
    expect(buyer.length).toBeGreaterThan(0);
    expect((await svc.procurement.getSupplierScorecards(aScope)).items.length).toBe(0);
    // D-2: per-supplier optionals live on the record, not shared consts — the
    // conditional supplier carries both its compliance issue and its plan.
    const samplePc = buyer.find((s) => s.id === 'sample-personalcare');
    expect(samplePc?.improvementActions?.length).toBeGreaterThan(0);
    expect(samplePc?.complianceIssue?.level).toBe('expiring');
  });

  it('getKpis: improvement actions are wired into the snapshot', async () => {
    // ⚠️ THE SUPPLIER-vs-SUPPLIER ASYMMETRY IS WHY THIS IS A FIXTURE TEST. Buyer
    // -vs-supplier asymmetry is the scoping contract; A-has-rows-and-B-does-not
    // is a fact about seeding. The first matcher written to partition this file
    // keyed on literal ids and did not flag this one — it has no id in it.
    expect((await svc.procurement.getKpis(buyerScope)).improvementActions.length).toBeGreaterThan(0);
    expect((await svc.procurement.getKpis(aScope)).improvementActions.length).toBeGreaterThan(0);
    expect((await svc.procurement.getKpis(bScope)).improvementActions.length).toBe(0);
  });
});

// The delivery mirror's crux: a supplier persona reads its OWN scheduling
// agreements and NOTHING else. Persona is hard-wired to sup-007 (no UI to become
// another supplier), so isolation is a contract, not a click — the CONTRACT half
// is in the conformance factory; what is pinned here is the exact per-supplier
// ownership of the seeded rows.
describe('mock fixtures — delivery agreement ownership (seeded rows)', () => {
  const idsFor = async (s: QueryScope): Promise<string[]> =>
    (await svc.delivery.getAgreements(s)).items.map((v) => v.agreement.id).sort();

  it('sup-007 sees EXACTLY its own two agreements, never another supplier’s', async () => {
    const ids = await idsFor(aScope); // A = sup-007
    expect(ids).toEqual(['sa-0001', 'sa-0002']);
    expect(ids).not.toContain('sa-1002'); // sup-005's
    expect(ids.some((id) => id.startsWith('sa-100'))).toBe(false); // none of the scale fleet
  });

  it('sup-005 sees EXACTLY its own agreement (sa-1002); sup-002 sees none', async () => {
    expect(await idsFor(cScope)).toEqual(['sa-1002']); // C = sup-005
    expect(await idsFor(bScope)).toEqual([]); // B = sup-002 owns no agreement — honest empty
  });

  it('the buyer superset contains every supplier’s agreements', async () => {
    const buyerIds = await idsFor(buyerScope);
    expect(buyerIds).toEqual(expect.arrayContaining(['sa-0001', 'sa-0002', 'sa-1002']));
    expect(buyerIds.length).toBeGreaterThanOrEqual(8);
  });

  // Read-only for suppliers is an explicit CONTRACT, not merely a UI absence: every
  // write verb refuses a supplier scope with SCOPE_DENIED — even the OWNER supplier
  // (sup-007 on its own sa-0002) — because release / confirm / policy-edit are all
  // buyer governance actions. It sits here rather than in the factory only because
  // it names a seeded agreement id to act on.
  it('a supplier scope is refused ALL three delivery writes (SCOPE_DENIED)', async () => {
    const rel = await svc.delivery.releaseLines(aScope, 'sa-0002', 10, { releaseSeqs: [1] });
    expect(rel.ok).toBe(false);
    if (!rel.ok) expect(rel.reason).toBe('SCOPE_DENIED');

    const conf = await svc.delivery.confirmMatch(aScope, 'sa-0002', 20, 2);
    expect(conf.ok).toBe(false);
    if (!conf.ok) expect(conf.reason).toBe('SCOPE_DENIED');

    const edit = await svc.delivery.editPolicy(aScope, 'sa-0002', 10, {
      tolerancePct: 0.25,
      enforcement: 'flag',
      reason: 'supplier attempt',
    });
    expect(edit.ok).toBe(false);
    if (!edit.ok) expect(edit.reason).toBe('SCOPE_DENIED');
  });

  // SDC-5e — the supplier obligations view derives from the OWN-scoped views, so a
  // supplier's obligations are its own by construction (never another's).
  // ⚠️ This one reaches OUTSIDE `IDataService` entirely: `deriveDeliveryChase` is a
  // pure module, not a service method, so no conformance factory could host it.
  it('a supplier’s obligations derive ONLY from its own agreements', async () => {
    const ownViews = (await svc.delivery.getAgreements(aScope)).items; // A = sup-007
    const obligations = deriveDeliveryChase(ownViews, SDC_SIMULATED_NOW);
    expect(obligations.length).toBeGreaterThan(0); // sa-0002 has real overdue/upcoming
    expect(obligations.every((e) => e.supplierId === 'sup-007')).toBe(true);
    // Never another supplier's commitment (sa-1002 sup-005, sa-1007 sup-006).
    expect(obligations.some((e) => e.agreementId === 'sa-1002' || e.agreementId === 'sa-1007')).toBe(false);
  });
});

describe('mock fixtures — creation-scope refusal against a seeded parent PO', () => {
  // Creation-shape scope (Step 4 batch i): scoped by the payload's PARENT PO.
  // The RULE is contract; the PO it is demonstrated on is a seeded row, which is
  // the only reason this did not travel with the other command refusals.
  it('a supplier drafting an ASN against another supplier’s PO is denied (creation scope)', async () => {
    // PO-2025-00107 is owned by sup-007; sup-002 cannot draft its ASN.
    await expect(
      svc.commands.dispatch(bScope, {
        transitionId: 't_asn_create',
        entity: 'advanceShipNotice',
        payload: { poReference: 'PO-2025-00107' },
      }),
    ).rejects.toMatchObject({ code: 'SCOPE_DENIED' });
  });
});
