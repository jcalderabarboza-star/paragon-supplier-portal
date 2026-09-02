// ────────────────────────────────────────────────────────────────────────────
// THE OWNER-LESS EXISTENCE ORACLE — closed, and held closed by derivation.
//
// ⚠️ **THE DEFECT, IN ONE SENTENCE: THE REFUSAL *KIND* WAS AN EXISTENCE
// ORACLE.** The dispatcher's supplier scope gate read
// `owner !== null && owner !== scope.supplierId`. On a target whose
// `readScopeOwner` returns `null` BY CONSTRUCTION — a buyer-governance
// collection with no supplier owner — that clause could never be true, so a
// supplier scope fell THROUGH scope to the role gate and came back
// `ROLE_NOT_PERMITTED` (a RETURNED `CommandResult`). The same probe at an id
// that does not exist was stopped at scope and came back `SCOPE_DENIED` (a
// THROWN `DataError`). **Probe an id, read the refusal kind, learn whether the
// row exists** — across a tenancy boundary, on the write path, for a caller
// entitled to neither answer.
//
// ⚠️ **AND THE FILING UNDER-COUNTED THE POPULATION BY MORE THAN HALF.** B1
// filed it against `supplierApplication` naming `purchaseRequisition` as the
// inherited precedent — two. Derived at the fix through the real dispatcher:
// **FIVE**. `rfq` is the member a list would never have reached for, because it
// is the document suppliers are INVITED to — "a supplier has no business acting
// on an RFQ" is the least intuitive true sentence in this file, and it is true
// because a supplier acts through its own `quotation`, which HAS an owner.
//
// ⚠️ **SO NOTHING HERE READS A LIST OF ENTITIES.** The population is derived on
// every run, from each wired target's OWN contract:
//
//     E is OWNER-LESS ⇔ for an entity of E that EXISTS (`readState !== null`),
//                       `readScopeOwner` returns null.
//
// Both halves are load-bearing. `readScopeOwner` returns null for an id that
// simply does not exist on EVERY target, owner-ful ones included — so without
// the `readState` conjunct the derivation condemns all fourteen and reports on
// its own matcher rather than on the tree.
//
// ⚠️ **AND IT IS DERIVED FROM THE TARGET RATHER THAN FROM THE DISPATCHER FOR A
// REASON THAT WAS MEASURED, NOT ANTICIPATED.** The first version of this file
// derived the population BEHAVIOURALLY — "which supplier ids clear the scope
// gate?" — which reads correctly against the shipped tree and is worthless as a
// gate. Mutating the predicate under test collapses that population to EMPTY:
// the suite goes red on its own population control while **the assertion it
// exists to make never runs at all**, and every remaining spec passes vacuously
// over zero rows. The mutation probe registers a kill, the kill proves nothing,
// and a counter watching pass/fail cannot tell the difference. That is
// `EMPTY-INPUT-REPORTS-CLEAN-01` arriving through the POPULATION instead of
// through the input, and it was caught only because the probe's output was read
// row by row instead of as a count.
//
// `readScopeOwner` is upstream of every dispatcher predicate, so the population
// below is identical under the shipped code and under both mutants.
//
// ⚠️ **THE CONTROL THAT MAKES THE EQUALITY MEAN ANYTHING, AND IT IS THE POINT
// OF THE FILE.** "The supplier gets the same refusal at both ids" is worth
// nothing if the two ids do not differ — `EMPTY-INPUT-REPORTS-CLEAN-01` with
// two inputs instead of none. So every probe pair is taken by a BUYER at the
// SAME two ids, and the buyer's two answers must DIFFER. The invariant is not
// "nobody can tell". It is:
//
//     THE BUYER CAN TELL THE TWO IDS APART. THE SUPPLIER CANNOT.
//
// A gate asserting only the supplier half would pass just as happily against a
// tree where both ids were absent, or where the dispatcher refused every seat
// on every owner-less entity. The second is the dangerous one — closing a leak
// by deleting the capability — and `THE LEGITIMATE PATHS` below is what fires
// when someone does it.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

import {
  MockCommandService,
  WIRED_COMMAND_TARGETS,
  commandTargetFor,
} from '../data/mock/MockCommandService';
import { getFlow } from './registry';
import './index';
import { PERSONA_SYSTEM_ROLES, atomsFor, rolesHolding } from './businessRoles';
import { DataError } from '../data/types';
import type { QueryScope } from '../data/types';
import type { TransitionDef } from './schema';
import { NO_PERSON } from '../../context/noPerson';
import { GOVERNED_CHECK_IDS } from '../../lib/enforcement';
import { purchaseOrderStore } from '../data/mock/stores/purchaseOrderStore';
import { asnStore } from '../data/mock/stores/asnStore';
import { goodsReceiptStore } from '../data/mock/stores/goodsReceiptStore';
import { invoiceStore } from '../data/mock/stores/invoiceStore';
import { rfqStore } from '../data/mock/stores/rfqStore';
import { quotationStore } from '../data/mock/stores/quotationStore';
import { purchaseRequisitionStore } from '../data/mock/stores/purchaseRequisitionStore';
import { requirementResponseStore } from '../data/mock/stores/requirementResponseStore';
import { inventoryDeclarationStore } from '../data/mock/stores/inventoryDeclarationStore';
import { incomingShipmentStore } from '../data/mock/stores/incomingShipmentStore';
import { enforcementSettingStore } from '../data/mock/stores/enforcementSettingStore';
import { supplierDocumentStore } from '../data/mock/stores/supplierDocumentStore';
import { supplierApplicationStore } from '../data/mock/stores/supplierApplicationStore';
import { customRoleStore } from './customRoles';

const svc = new MockCommandService();
const ABSENT = 'zzz-no-such-entity-0000';

const buyerSeat = (...businessRoles: string[]): QueryScope => ({
  personaType: 'buyer',
  supplierId: null,
  businessRoles,
  actor: NO_PERSON,
});
const supplierSeatOf = (supplierId: string, ...businessRoles: string[]): QueryScope => ({
  personaType: 'supplier',
  supplierId,
  businessRoles,
  actor: NO_PERSON,
});


/** The widest supplier scope that can exist, owning nothing. A refusal against
 *  THIS seat is not an artefact of a thin one. */
const widestSupplier = supplierSeatOf('sup-OWNS-NOTHING', ...PERSONA_SYSTEM_ROLES.supplier);
/** The existence discriminator the BUYER side still has — holds no atoms, so it
 *  reaches the role gate and stops there, never mutating. */
const rolelessBuyer = buyerSeat();

/** The REFUSAL KIND and nothing else. NEVER the message — it embeds the
 *  entityId, so comparing messages makes every target look like it differs.
 *  (That mistake was made and caught while deriving this population; it turned
 *  nine owner-FUL targets into false positives in one run.) */
async function kindOf(
  scope: QueryScope,
  entity: string,
  transitionId: string,
  entityId: string,
): Promise<string> {
  try {
    const r = await svc.dispatch(scope, { transitionId, entity, entityId, payload: {} });
    return r.status === 'failed' ? `failed/${(r.reason ?? '').split(':')[0]}` : `ok/${r.status}`;
  } catch (e) {
    return e instanceof DataError ? `throw/${e.code}` : `throw/${(e as Error).name}`;
  }
}

// ─── One real id per wired target ───────────────────────────────────────────
//
// ⚠️ **A FIXTURE, NOT THE POPULATION.** The population is derived FROM these;
// these are only "an entity of each kind that exists". The coverage assertion
// below requires one for EVERY wired target, so wiring a fifteenth reddens this
// file until somebody supplies an id — loud, rather than a silently-skipped
// target.
async function realIds(): Promise<Record<string, string | null>> {
  const raised = await svc.dispatch(buyerSeat('procurement'), {
    transitionId: 't_application_submit',
    entity: 'supplierApplication',
    payload: { requestType: 'External SR', companyName: 'PT Sample Applicant' },
  });
  return {
    purchaseOrder: purchaseOrderStore.all()[0]?.id ?? null,
    advanceShipNotice: asnStore.all()[0]?.asnNumber ?? null,
    goodsReceipt: goodsReceiptStore.all()[0]?.id ?? null,
    invoice: invoiceStore.all()[0]?.id ?? null,
    rfq: rfqStore.all()[0]?.id ?? null,
    quotation: quotationStore.all()[0]?.id ?? null,
    purchaseRequisition: purchaseRequisitionStore.all()[0]?.id ?? null,
    requirementResponse: requirementResponseStore.all()[0]?.id ?? null,
    inventoryDeclaration: inventoryDeclarationStore.all()[0]?.id ?? null,
    incomingShipment: incomingShipmentStore.all()[0]?.id ?? null,
    enforcement: GOVERNED_CHECK_IDS[0],
    role: 'receiving',
    supplierDocument: supplierDocumentStore.all()[0]?.id ?? null,
    supplierApplication: raised.entityId ?? null,
  };
}

/** Whether a flow declares any non-creation transition. A creation verb carries
 *  no `entityId`, so it cannot be probed for an existence leak. */
const hasProbeVerb = (entity: string): boolean =>
  (getFlow(entity)?.transitions ?? []).some((t) => t.trigger !== 'creation');

type Derived = { ownerless: string[]; ownerful: string[]; unprobeable: string[] };

/** THE DERIVATION — read off each target's own `readState` / `readScopeOwner`,
 *  which sit upstream of every dispatcher predicate. Non-mutating. */
async function derive(): Promise<Derived> {
  const ids = await realIds();
  const out: Derived = { ownerless: [], ownerful: [], unprobeable: [] };
  for (const entity of WIRED_COMMAND_TARGETS) {
    const target = commandTargetFor(entity);
    const id = ids[entity];
    if (!target || !id || !hasProbeVerb(entity)) { out.unprobeable.push(entity); continue; }
    // The existence conjunct. Without it `readScopeOwner` answers null for every
    // target and the derivation condemns all fourteen.
    if (target.readState(id) === null) { out.unprobeable.push(entity); continue; }
    (target.readScopeOwner(id) === null ? out.ownerless : out.ownerful).push(entity);
  }
  return out;
}

// ─── The walk table ─────────────────────────────────────────────────────────
//
// ⚠️ **EVERY ORACLE PROBE IS TAKEN AT AN ID GENUINELY IN THE VERB'S OWN `from`
// STATE.** Probing a verb at an entity it could not legally fire on would let
// `ILLEGAL_TRANSITION` stand in for the refusal under test, and the gate would
// pass while measuring a different gate. The walk mints or advances through the
// REAL dispatcher, and the first assertion of every case is that the id it
// handed back really is in one of that verb's from-states.
type Walk = { entity: string; t: TransitionDef; id: string; state: string | null };

async function walk(entity: string, t: TransitionDef): Promise<Walk | null> {
  const at = (id: string, state: string | null) => ({ entity, t, id, state });

  if (entity === 'rfq') {
    const row = rfqStore.all().find((r) => t.from.includes(r.status));
    return row ? at(row.id, rfqStore.get(row.id)!.status) : null;
  }
  if (entity === 'purchaseRequisition') {
    const seeded = purchaseRequisitionStore.all().find((r) => t.from.includes(r.status));
    if (seeded) return at(seeded.id, seeded.status);
    // `Rejected` is not seeded — walk one there through the real verbs.
    const pending = purchaseRequisitionStore.all().find((r) => r.status === 'Pending Approval');
    if (!pending) return null;
    await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_pr_reject', entity, entityId: pending.id,
      payload: { rejectionReason: 'walked here to probe the scope gate' },
    });
    const now = purchaseRequisitionStore.get(pending.id)!.status;
    return t.from.includes(now) ? at(pending.id, now) : null;
  }
  if (entity === 'enforcement') return at(GOVERNED_CHECK_IDS[0], 'Governed');
  if (entity === 'role') return at('receiving', 'Defined');
  if (entity === 'supplierApplication') {
    const raised = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_application_submit', entity,
      payload: { requestType: 'External SR', companyName: 'PT Sample Applicant' },
    });
    const id = raised.entityId!;
    if (!t.from.includes('Submitted')) {
      await svc.dispatch(buyerSeat('compliance'), {
        transitionId: 't_application_start_review', entity, entityId: id,
      });
    }
    const now = supplierApplicationStore.get(id)?.status ?? null;
    return now && t.from.includes(now) ? at(id, now) : null;
  }
  return null;
}

/** Every (owner-less entity × non-creation verb) reachable at a from-state.
 *  The ENTITY set comes from `derive()`; only the id supply is authored. */
async function ownerlessWalks(): Promise<Walk[]> {
  const { ownerless } = await derive();
  const out: Walk[] = [];
  for (const entity of ownerless) {
    for (const t of getFlow(entity)?.transitions ?? []) {
      if (t.trigger === 'creation') continue;
      const w = await walk(entity, t);
      if (w) out.push(w);
    }
  }
  return out;
}

const resetAll = () => {
  rfqStore.reset();
  purchaseRequisitionStore.reset();
  enforcementSettingStore.reset();
  supplierApplicationStore.reset();
  customRoleStore.reset();
};

beforeEach(resetAll);

// ─────────────────────────────────────────────────────────────────────────────
describe('POPULATION — nothing below means anything without this', () => {
  it('CONTROL — the id supply covers every wired target, so none is silently skipped', async () => {
    const ids = await realIds();
    expect(Object.keys(ids).sort()).toEqual([...WIRED_COMMAND_TARGETS].sort());
    const missing = Object.entries(ids).filter(([, v]) => !v).map(([k]) => k);
    expect(missing, 'a wired target with no real id to probe').toEqual([]);
  });

  it('CONTROL — the two halves of the derivation each discriminate, on their own', async () => {
    const ids = await realIds();
    const po = commandTargetFor('purchaseOrder')!;
    const pr = commandTargetFor('purchaseRequisition')!;
    // `readState` separates a real id from a fabricated one — the conjunct that
    // stops the derivation condemning every target.
    expect(po.readState(ids.purchaseOrder!)).not.toBeNull();
    expect(po.readState(ABSENT)).toBeNull();
    // `readScopeOwner` separates owner-ful from owner-less ON AN ID THAT EXISTS,
    // which is the only place the question means anything.
    expect(po.readScopeOwner(ids.purchaseOrder!)).not.toBeNull();
    expect(pr.readScopeOwner(ids.purchaseRequisition!)).toBeNull();
    // ⚠️ And the trap the conjunct exists for: the OWNER-FUL target answers null
    // too, for an id that is merely absent.
    expect(po.readScopeOwner(ABSENT)).toBeNull();
  });

  it('the owner-less population is DERIVED, and lands on both sides of a bilateral control', async () => {
    const { ownerless, ownerful, unprobeable } = await derive();
    expect(ownerless.length).toBeGreaterThan(0);
    expect(ownerful.length).toBeGreaterThan(0);
    // ⚠️ A derivation returning everything, or nothing, is reporting on itself.
    // Known owner-less members present; known owner-ful members absent.
    expect(ownerless).toContain('purchaseRequisition');
    expect(ownerless).toContain('supplierApplication');
    expect(ownerless).toContain('rfq');
    expect(ownerless).not.toContain('purchaseOrder');
    expect(ownerless).not.toContain('invoice');
    expect(ownerful).toContain('purchaseOrder');
    expect(ownerful).toContain('invoice');
    // Every wired target is classified exactly once.
    expect([...ownerless, ...ownerful, ...unprobeable].sort()).toEqual(
      [...WIRED_COMMAND_TARGETS].sort(),
    );
    // `inventoryDeclaration` declares no non-creation transition, so it has no
    // verb this leak could ride. Stated rather than silently absent.
    expect(unprobeable).toEqual(['inventoryDeclaration']);
  });

  it('CONTROL — the walk lands every probe in one of its verb\'s from-states', async () => {
    const walks = await ownerlessWalks();
    expect(walks.length).toBeGreaterThan(0);
    for (const w of walks) {
      expect(w.state, `${w.entity}/${w.t.id} reached a state`).not.toBeNull();
      expect(w.t.from, `${w.entity}/${w.t.id}`).toContain(w.state!);
    }
  });

  it('CONTROL — the ABSENT id really is absent, and the BUYER can still tell', async () => {
    // The assertion the whole file rests on. If the buyer could NOT distinguish
    // the two ids, the supplier's equal answers below would be equal for the
    // wrong reason.
    for (const w of await ownerlessWalks()) {
      const atReal = await kindOf(rolelessBuyer, w.entity, w.t.id, w.id);
      const atAbsent = await kindOf(rolelessBuyer, w.entity, w.t.id, ABSENT);
      expect(atAbsent, `${w.entity}/${w.t.id} buyer@absent`).toBe('throw/NOT_FOUND');
      expect(atReal, `${w.entity}/${w.t.id} buyer@real`).toBe('failed/ROLE_NOT_PERMITTED');
      expect(atReal).not.toBe(atAbsent);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE ORACLE IS CLOSED — a supplier cannot tell the two ids apart', () => {
  it('every owner-less verb: the supplier refusal is IDENTICAL at a real id and an absent one', async () => {
    const walks = await ownerlessWalks();
    expect(walks.length).toBeGreaterThan(0);
    for (const w of walks) {
      const atReal = await kindOf(widestSupplier, w.entity, w.t.id, w.id);
      const atAbsent = await kindOf(widestSupplier, w.entity, w.t.id, ABSENT);
      expect(atReal, `${w.entity}/${w.t.id} — supplier@real vs supplier@absent`).toBe(atAbsent);
      // And the single kind both resolve to is the SCOPE refusal, not the role
      // one: `ROLE_NOT_PERMITTED` names an ATOM, which tells the caller which
      // lane owns the document — a smaller leak of the same shape.
      expect(atReal, `${w.entity}/${w.t.id} — the honest single kind`).toBe('throw/SCOPE_DENIED');
    }
  });

  it('and a supplier naming ITSELF as the entity id does not change the answer', async () => {
    // The one shape that could resurrect the leak: an owner-less `null` replaced
    // by an echo of the caller's own id.
    for (const w of await ownerlessWalks()) {
      const asSelf = await kindOf(widestSupplier, w.entity, w.t.id, widestSupplier.supplierId!);
      expect(asSelf, `${w.entity}/${w.t.id}`).toBe('throw/SCOPE_DENIED');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('THE LEGITIMATE PATHS — the half a "refuse everyone" fix would break', () => {
  it('a BUYER seat still clears the scope gate on every owner-less verb', async () => {
    // The negative-direction guard. Closing the oracle by denying every persona
    // satisfies the describe above and fails here, on every row.
    for (const w of await ownerlessWalks()) {
      const k = await kindOf(rolelessBuyer, w.entity, w.t.id, w.id);
      expect(k, `${w.entity}/${w.t.id} — a buyer must reach the ROLE gate, not be denied at scope`)
        .toBe('failed/ROLE_NOT_PERMITTED');
    }
  });

  it('NO supplier lane holds ANY atom on ANY owner-less verb — which is why nothing was lost', async () => {
    // The measurement that made the one-expression fix safe. The day a supplier
    // lane gains such an atom this goes red — and the fix becomes a deleted
    // capability rather than a closed leak, which is the moment somebody has to
    // be told rather than the moment an act quietly stops working.
    const supplierAtoms = new Set(atomsFor([...PERSONA_SYSTEM_ROLES.supplier]));
    // Control on the SET, both ways. A zero over an empty set proves nothing.
    expect(supplierAtoms.has('asn:submit')).toBe(true);
    expect(supplierAtoms.has('rfq:award')).toBe(false);

    for (const w of await ownerlessWalks()) {
      expect(
        supplierAtoms.has(w.t.requiredRole),
        `${w.entity}/${w.t.id} requires ${w.t.requiredRole}; holders=${JSON.stringify(rolesHolding(w.t.requiredRole))}`,
      ).toBe(false);
    }
  });

  it('and each owner-less entity still has a verb a HOLDER seat can LAND', async () => {
    // One real walk per owner-less entity, through the real dispatcher, ending
    // in a state change. Every derived assertion above can pass over a lane that
    // refuses everybody; these cannot.
    const { ownerless } = await derive();
    expect(ownerless.sort()).toEqual(
      ['enforcement', 'purchaseRequisition', 'rfq', 'role', 'supplierApplication'],
    );

    const draftRfq = rfqStore.all().find((r) => r.status === 'Draft')!;
    const rfqRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_rfq_publish', entity: 'rfq', entityId: draftRfq.id,
    });
    expect(rfqRes.status, rfqRes.reason).toBe('done');
    expect(rfqStore.get(draftRfq.id)!.status).toBe('Open');

    const draftPr = purchaseRequisitionStore.all().find((r) => r.status === 'Draft')!;
    const prRes = await svc.dispatch(buyerSeat('requisitioner'), {
      transitionId: 't_pr_submit', entity: 'purchaseRequisition', entityId: draftPr.id,
    });
    expect(prRes.status, prRes.reason).toBe('done');
    expect(purchaseRequisitionStore.get(draftPr.id)!.status).toBe('Pending Approval');

    const enfRes = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_enforcement_set', entity: 'enforcement', entityId: GOVERNED_CHECK_IDS[0],
      payload: { mode: 'BLOCK', setBy: NO_PERSON },
    });
    expect(enfRes.status, enfRes.reason).toBe('done');
    expect(enforcementSettingStore.all()).toHaveLength(1);

    const roleRes = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_role_grant', entity: 'role', entityId: 'receiving',
      payload: {
        roleId: 'ownerless-gate-probe',
        displayName: 'Ownerless Gate Probe',
        description: 'Minted by the owner-less scope gate, to prove the lane still works.',
        adds: ['invoice:dispute'],
        grantedBy: NO_PERSON,
      },
    });
    expect(roleRes.status, roleRes.reason).toBe('done');
    expect(customRoleStore.all().map((r) => r.id)).toContain('ownerless-gate-probe');

    const raised = await svc.dispatch(buyerSeat('procurement'), {
      transitionId: 't_application_submit', entity: 'supplierApplication',
      payload: { requestType: 'External SR', companyName: 'PT Sample Applicant' },
    });
    expect(raised.status, raised.reason).toBe('done');
    const reviewed = await svc.dispatch(buyerSeat('compliance'), {
      transitionId: 't_application_start_review', entity: 'supplierApplication',
      entityId: raised.entityId!,
    });
    expect(reviewed.status, reviewed.reason).toBe('done');
    expect(supplierApplicationStore.get(raised.entityId!)!.status).toBe('Under Review');
  });
});
