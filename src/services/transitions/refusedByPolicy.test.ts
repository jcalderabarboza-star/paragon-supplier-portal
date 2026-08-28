import { describe, it, expect, beforeEach } from 'vitest';
import { refusedByPolicy } from './refusalMessage';
import { POLICY_HOOKS } from './policyHooks';
import { isCurrencyRefusal } from '../../pages-v2/rfqs/quotationSubmitModel';
import { MockCommandService } from '../data/mock/MockCommandService';
import { mockShipments } from '../../data/mockShipments';
import {
  SUPPLIER_MATERIAL_RELATIONSHIPS,
  FORECAST_PUBLICATIONS,
  MATERIAL_MASTER,
} from '../sdc/fixtures';
import { readFileSync } from 'node:fs';
import { PERSONA_SYSTEM_ROLES } from './businessRoles';
import { NO_PERSON } from '../../context/noPerson';
import type { QueryScope } from '../data/types';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ **A POLICY-HOOK REASON TESTED BY ITS HEAD IS ALWAYS FALSE, AND TWO SHIPPED
// SURFACES DID EXACTLY THAT.** `GRInspectionWizard` asked
// `reason.startsWith('UNDECLARED_MATERIAL')` and `BuyerChannelTriage` asked
// `reason.startsWith('UNKNOWN_MATERIAL')`. Both codes are what a POLICY HOOK
// says, so the dispatcher wraps them as `POLICY_REJECTED:<hook>:<that text>` and
// neither condition could ever hold. Both had full EN+ID remedial copy that had
// therefore never rendered.
//
// ⚠️ **THE REFUSALS BELOW COME FROM A REAL DISPATCHER ROUND TRIP, NOT FROM A
// HAND-BUILT STRING.** A hand-built string is the SAME ARTEFACT as the bug: the
// defect was a wrong belief about the wire format, and a test that states that
// format itself can only ever re-state the belief. So the format is taken from
// the machine and only then asserted against.
// ─────────────────────────────────────────────────────────────────────────────

const seat = (roles: readonly string[], supplierId: string | null = null): QueryScope => ({
  personaType: supplierId ? 'supplier' : 'buyer',
  supplierId,
  businessRoles: roles,
  actor: NO_PERSON,
});

describe('POPULATION GUARD — the hooks these surfaces name really exist', () => {
  it('both hook ids are members of POLICY_HOOKS, and a made-up one is not', () => {
    // Membership, never a count (`EMPTY-INPUT-REPORTS-CLEAN-01`).
    const ids: string[] = Object.values(POLICY_HOOKS);
    expect(ids).toContain(POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED);
    expect(ids).toContain(POLICY_HOOKS.SDC_MATERIAL_KNOWN);
    expect(ids).toContain(POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED);
    expect(ids).not.toContain('gr_inspection_materials_declared_v2');
  });
});

describe('refusedByPolicy — the head is POLICY_REJECTED, never the hook’s own code', () => {
  it('accepts the hook it names and refuses the hook it does not', () => {
    const real = `POLICY_REJECTED:${POLICY_HOOKS.SDC_MATERIAL_KNOWN}:UNKNOWN_MATERIAL: 'X' …`;
    // known-GOOD and known-BAD in one test, so neither can be believed alone
    // (rule 4 — probe the guard BOTH ways).
    expect(refusedByPolicy(real, POLICY_HOOKS.SDC_MATERIAL_KNOWN)).toBe(true);
    expect(refusedByPolicy(real, POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED)).toBe(false);
  });

  it('is FALSE for the bare code — the shape the two shipped arms tested', () => {
    expect(refusedByPolicy("UNKNOWN_MATERIAL: 'X' is not in the material master", POLICY_HOOKS.SDC_MATERIAL_KNOWN)).toBe(false);
    expect(refusedByPolicy('UNDECLARED_MATERIAL: …', POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED)).toBe(false);
  });

  it('is FALSE for a non-policy refusal, for absent and for empty', () => {
    expect(refusedByPolicy('ROLE_NOT_PERMITTED:po:confirm', POLICY_HOOKS.SDC_MATERIAL_KNOWN)).toBe(false);
    expect(refusedByPolicy(undefined, POLICY_HOOKS.SDC_MATERIAL_KNOWN)).toBe(false);
    expect(refusedByPolicy('', POLICY_HOOKS.SDC_MATERIAL_KNOWN)).toBe(false);
  });

  it('a hook whose id PREFIXES another’s cannot be confused for it', () => {
    // The trailing colon is load-bearing: without it `sdc_material_known` would
    // also match a hypothetical `sdc_material_known_v2`.
    const other = `POLICY_REJECTED:${POLICY_HOOKS.SDC_MATERIAL_KNOWN}_v2:UNKNOWN_MATERIAL: …`;
    expect(refusedByPolicy(other, POLICY_HOOKS.SDC_MATERIAL_KNOWN)).toBe(false);
  });
});

describe('ROUND TRIP — the wire value a real dispatcher emits', () => {
  let svc: MockCommandService;
  beforeEach(() => {
    svc = new MockCommandService();
  });

  it('the GR wizard’s UNDECLARED_MATERIAL refusal is matched by hook, not by head', async () => {
    // A shipment that HAS arrived, so `GR_CREATE_SHIPMENT_RECEIVED` passes and
    // the materials-declared hook is the one that speaks.
    // RECEIVABLE_SHIPMENT_STATUSES, read off the hook rather than retyped as a
    // guess: 'At Dock' | 'Unloading' | 'Delivered'.
    const shp = mockShipments.find((s) =>
      ['At Dock', 'Unloading', 'Delivered'].includes(s.status),
    );
    expect(shp, 'no arrived shipment in the fixtures').toBeDefined();

    const res = await svc.dispatch(seat(PERSONA_SYSTEM_ROLES.buyer), {
      transitionId: 't_gr_create',
      entity: 'goodsReceipt',
      payload: {
        asnReference: shp!.asnNumber,
        receivedDate: '2026-04-25',
        receivedBy: 'QA',
        inspectionResults: [
          { materialCode: 'RM-NOT-ON-THIS-SHIPMENT', qtyReceived: 1, disposition: 'Accepted' },
        ],
      },
    });

    expect(res.status).toBe('failed');
    // The MEASURED wire value — asserted, not described.
    expect(res.reason).toMatch(
      new RegExp(`^POLICY_REJECTED:${POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED}:UNDECLARED_MATERIAL`),
    );
    // The arm as it shipped: unsatisfiable on this very string.
    expect((res.reason ?? '').startsWith('UNDECLARED_MATERIAL')).toBe(false);
    // The arm as it is now: fires.
    expect(refusedByPolicy(res.reason, POLICY_HOOKS.GR_INSPECTION_MATERIALS_DECLARED)).toBe(true);
  });

  // ── ⚠️ THE SECOND ARM'S REFUSAL CANNOT BE ROUND-TRIPPED, AND SAYING SO IS
  //    THE FINDING RATHER THAN A GAP IN THIS SUITE ────────────────────────────
  //
  // `SDC_MATERIAL_KNOWN` refuses a material the MASTER lacks. But every SDC
  // creation verb resolves its owner through `collaboratedMaterial` FIRST
  // (`inventoryDeclarationTarget.creationOwner` + `requireCreationOwner`), and
  // the dispatcher's scope check runs BEFORE any policy hook — so a code the
  // master lacks is thrown out as `SCOPE_DENIED` before the hook is asked.
  //
  // The hook is therefore reachable ONLY for a material that is COLLABORATED but
  // NOT in the master, which is precisely the gap its own comment says it exists
  // to catch at F2 wire time. **The two tests below MEASURE that gap rather than
  // repeating the claim**: it is empty today, so the branch is unreachable, so
  // there is no round trip to take. That is why the format assertion for this
  // arm rests on the SINGLE construction site instead.
  it('the scope gate fires before the hook, so the master-miss refusal is not reachable', async () => {
    await expect(
      svc.dispatch(seat(PERSONA_SYSTEM_ROLES.buyer), {
        transitionId: 't_inventorydeclaration_record',
        entity: 'inventoryDeclaration',
        payload: {
          supplierId: 'sup-007',
          materialCode: 'RM-NOT-IN-THE-MASTER',
          totalQty: 10,
          asOfDate: '2026-04-25',
        },
      }),
    ).rejects.toThrow(/unresolved owner/);
  });

  it('COLLABORATED ∖ MASTER is empty today — derived, so this stops being true loudly', () => {
    const collaborated = new Set<string>();
    for (const r of SUPPLIER_MATERIAL_RELATIONSHIPS) collaborated.add(r.materialCode);
    for (const p of FORECAST_PUBLICATIONS)
      for (const l of p.lines) collaborated.add(l.materialCode);
    // Known-good control: the derivation examined a real population, not an
    // empty one (`EMPTY-INPUT-REPORTS-CLEAN-01` — an empty input also yields an
    // empty gap, and reads identically).
    expect(collaborated.size).toBeGreaterThan(0);
    expect(Object.keys(MATERIAL_MASTER).length).toBeGreaterThan(0);

    const gap = [...collaborated].filter((c) => !(c in MATERIAL_MASTER));
    expect(gap, 'a collaborated material left the master — the hook is now reachable').toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ **ONE CONSTRUCTION SITE IS WHAT LETS ONE ROUND TRIP SPEAK FOR EVERY HOOK.**
// The GR round trip above proves the format for the hook it exercised. It
// generalises only because `dispatcher.ts` builds EVERY policy refusal at a
// single `refusal('POLICY_REJECTED', …)` call — so a second site appearing is
// the event that would break the generalisation, and this is what notices.
// ─────────────────────────────────────────────────────────────────────────────
describe('the POLICY_REJECTED wire format has exactly one producer', () => {
  it('dispatcher.ts constructs it once, and nests the hook name ahead of the reason', () => {
    const src = readFileSync('src/services/transitions/dispatcher.ts', 'utf8');
    const sites = src.split('\n').filter((l) => l.includes("refusal('POLICY_REJECTED'"));
    // Known-good control first: the file was really read.
    expect(src.length).toBeGreaterThan(1000);
    expect(sites).toHaveLength(1);
    expect(sites[0]).toContain('${name}:${decision.reason');
  });
});

describe('isCurrencyRefusal — the site that was already right, on the shared construction', () => {
  it('still accepts its own hook and still refuses another', () => {
    const own = `POLICY_REJECTED:${POLICY_HOOKS.QUOTATION_SUBMIT_CURRENCY_PERMITTED}:currency 'XAU' is not permitted`;
    expect(isCurrencyRefusal(own)).toBe(true);
    expect(isCurrencyRefusal(`POLICY_REJECTED:${POLICY_HOOKS.SDC_MATERIAL_KNOWN}:…`)).toBe(false);
    expect(isCurrencyRefusal(undefined)).toBe(false);
  });
});
