// ────────────────────────────────────────────────────────────────────────────
// MockDeliveryService — the Delivery Agreement seam's mock implementation.
//
// ⚠️ **THE WRITES NO LONGER WRITE. THEY DISPATCH (call-off step 1).**
// This class used to hold three direct store mutations gated by ONE predicate
// (`scope.personaType === 'buyer'`) — no atom, no policy hook, no
// `TransitionEvent`, no actor. Its own header said so: *"NO command dispatcher,
// NO CommandTarget → deliveryAgreements stays SIMULATED by construction."*
// That sentence is retired rather than softened: the lane now has two flows,
// two CommandTargets and four verbs, and every write below is a `dispatch`.
//
// What each write method still owns is ORCHESTRATION, which is exactly the job
// the backend will do server-side at F1: resolve the selection into addresses,
// dispatch one command per address, and re-read the view. It owns no rule and
// no mutation — every gate is the dispatcher's, and the only code that touches
// `schedulingAgreementStore` is the two targets.
//
//   · SCOPING: unchanged. `applySupplierScope` on the READ; the WRITE's tenancy
//     is now the dispatcher's `readScopeOwner: () => null` (a supplier is
//     denied at SCOPE, not by a predicate in this file).
//   · SHIPMENT POOL: lifted to `delivery/pool.ts` so the view, the confirm
//     policy hook and the confirm target all resolve the IDENTICAL pool.
//
// ⚠️ **AND `t_delivery_adjust` IS NOT HERE, DELIBERATELY.** It is dispatched
// straight from `useAdjustLine` (the `commandHooks` precedent). C1 freezes this
// interface's method list, and an adjust is one command against one address —
// there is no orchestration for a seam method to do, so adding one would widen
// a ratified contract to gain a pass-through.
//
// ⚠️ **A RELEASE OF MANY LINES IS MANY COMMANDS, AND THAT IS THE HONEST SHAPE.**
// The entity is the SCHEDULE LINE, so a horizon release dispatches one command
// per line in range. Each line is an independent commitment to a vendor, each
// gets its own `TransitionEvent`, and each can be refused on its own merits —
// which the back-dating guard makes routine rather than exotic. A PARTIAL
// outcome is therefore real and is REPORTED (`releasedSeqs` + `refusals`)
// rather than collapsed into one boolean: "three transmitted, two refused
// because they are already past" is the truth, and an all-or-nothing wrapper
// would have to either hide it or duplicate the policy outside the dispatcher
// to pre-check it.
// ────────────────────────────────────────────────────────────────────────────

import { applySupplierScope } from '../scoping';
import { sdcClock } from '../../sdc';
import { mockSuppliers } from '../../../data/mockSuppliers';
import { deriveAgreementView } from '../../delivery';
import { deliveryShipmentPool } from '../../delivery/pool';
import { itemKey } from '../../delivery/addressing';
import { schedulingAgreementStore } from '../../delivery/stores/schedulingAgreementStore';
import type {
  DeliveryAgreementView,
  EditPolicyPatch,
  ReleaseSelection,
  SchedulingAgreement,
  SchedulingAgreementItem,
} from '../../delivery';
import type {
  ConfirmCommandResult,
  EditPolicyCommandResult,
  ReleaseCommandResult,
  ReleaseLineRefusal,
} from '../../delivery';
import type {
  DeliveryQuery,
  ICommandService,
  IDeliveryService,
  Page,
  QueryScope,
} from '../types';

/** Display join — resolve the agreement supplier's name from reference data. */
function supplierNameOf(supplierId: string): string | null {
  return mockSuppliers.find((s) => s.id === supplierId)?.name ?? null;
}

/**
 * Which DRAFT lines does this selection name, in ascending seq order?
 *
 * The two arms keep the pure verb's own semantics (`release.ts`, Decision E):
 * the HORIZON arm skips already-released lines silently (re-releasing a horizon
 * is a natural operator repeat); the EXPLICIT arm names them, because an
 * operator who named a line deserves to be told what happened to it.
 */
function selectLines(
  item: SchedulingAgreementItem,
  selection: ReleaseSelection,
): { readonly seqs: readonly number[]; readonly named: boolean } {
  if ('horizonDate' in selection) {
    return {
      seqs: item.scheduleLines
        .filter((l) => l.releaseDate <= selection.horizonDate && l.state === 'draft')
        .map((l) => l.releaseSeq),
      named: false,
    };
  }
  return { seqs: [...new Set(selection.releaseSeqs)].sort((a, b) => a - b), named: true };
}

export class MockDeliveryService implements IDeliveryService {
  /**
   * The command seam every write below goes through.
   *
   * Injected rather than imported, so this class cannot reach a second
   * dispatcher and a spec can hand it one that records what it was asked to do.
   */
  constructor(private readonly commands: ICommandService) {}

  /** The scoped delivery-agreement views (drawdown ledger + per-line fulfillment,
   *  derived internally as of the shared SDC clock). Buyer = superset; supplier =
   *  own agreements only. `query.contractId` narrows to one contract's agreements
   *  (the nested contract-detail DA tab) — applied AFTER supplier scoping, so it
   *  never widens what a supplier can see. */
  async getAgreements(
    scope: QueryScope,
    query?: DeliveryQuery,
  ): Promise<Page<DeliveryAgreementView>> {
    const supplierScoped = applySupplierScope(scope, schedulingAgreementStore.all());
    const scoped = query?.contractId
      ? supplierScoped.filter((a) => a.contractId === query.contractId)
      : supplierScoped;
    return { items: scoped.map((agreement) => this.viewOf(agreement)) };
  }

  /**
   * Release the selected DRAFT lines of ONE item — as one `t_delivery_release`
   * command per line, through the dispatcher.
   *
   * Every gate is the dispatcher's: the `delivery:release` atom, the attributed
   * actor (Q6), the back-dating guard, and the tenancy denial of a supplier
   * scope. This method resolves addresses and reports outcomes; it decides
   * nothing.
   */
  async releaseLines(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    selection: ReleaseSelection,
  ): Promise<ReleaseCommandResult> {
    const located = this.locate(agreementId, itemSeq);
    if (!located) {
      return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no item ${itemSeq}` };
    }
    const { agreement, item } = located;
    const { seqs, named } = selectLines(item, selection);
    if (seqs.length === 0) {
      return {
        ok: false,
        reason: 'NO_LINES_SELECTED',
        detail: 'the selection resolved to no releasable draft lines',
      };
    }

    const releasedSeqs: number[] = [];
    const refusals: ReleaseLineRefusal[] = [];
    for (const releaseSeq of seqs) {
      const line = item.scheduleLines.find((l) => l.releaseSeq === releaseSeq);
      if (!line) {
        refusals.push({ releaseSeq, reason: `no schedule line ${releaseSeq}` });
        continue;
      }
      // An already-released line: silent on the horizon arm (an operator
      // repeat), reported on the explicit arm (they named it). The pure verb
      // draws the same distinction for the same reason.
      if (line.state === 'released') {
        if (named) refusals.push({ releaseSeq, reason: 'ALREADY_RELEASED' });
        continue;
      }
      const result = await this.commands.dispatch(scope, {
        transitionId: 't_delivery_release',
        entity: 'deliveryRelease',
        entityId: line.releaseRef,
        // EMPTY, AND IT CANNOT BE OTHERWISE. The address carries the
        // coordinates and the session carries the actor, so there is no field
        // for a caller to supply — and therefore nowhere a document number
        // could be smuggled in (C12 §2.1).
        payload: {},
      });
      if (result.status === 'failed') {
        refusals.push({ releaseSeq, reason: result.reason ?? 'REFUSED' });
      } else {
        releasedSeqs.push(releaseSeq);
      }
    }

    if (releasedSeqs.length === 0) {
      // Nothing was transmitted. The FIRST refusal is the reason, because the
      // selection is ordered and the first thing that went wrong is what an
      // operator wants read out to them.
      return {
        ok: false,
        reason: refusals[0]?.reason ?? 'NO_LINES_SELECTED',
        detail: refusals.map((r) => `line ${r.releaseSeq}: ${r.reason}`).join('; '),
      };
    }
    return {
      ok: true,
      view: this.viewOf(this.reread(agreement.id)),
      releasedSeqs,
      refusals,
    };
  }

  /**
   * Confirm the fulfillment of ONE released line — `t_delivery_confirm`.
   *
   * ACCEPT-AS-OBSERVED: the `(ref, qty)` is derived by the TARGET from the same
   * pool this service rendered, so nothing about the accepted quantity travels
   * in a payload. A confirm is a PORTAL record, never a SAP goods-receipt.
   */
  async confirmMatch(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    releaseSeq: number,
  ): Promise<ConfirmCommandResult> {
    const located = this.locate(agreementId, itemSeq);
    const line = located?.item.scheduleLines.find((l) => l.releaseSeq === releaseSeq);
    if (!located || !line) {
      return { ok: false, reason: 'UNKNOWN_RELEASE_SEQ', detail: `no schedule line ${releaseSeq}` };
    }
    const result = await this.commands.dispatch(scope, {
      transitionId: 't_delivery_confirm',
      entity: 'deliveryRelease',
      entityId: line.releaseRef,
      payload: {},
    });
    if (result.status === 'failed') {
      return { ok: false, reason: result.reason ?? 'REFUSED' };
    }
    return { ok: true, view: this.viewOf(this.reread(located.agreement.id)) };
  }

  /**
   * Re-point ONE item's ACTIVE drawdown tolerance — `t_delivery_policy_set`.
   *
   * The governance write, and the one whose atom is `compliance`'s rather than
   * `procurement`'s: whoever sets the tolerance can relax the check the release
   * lane is measured against.
   */
  async editPolicy(
    scope: QueryScope,
    agreementId: string,
    itemSeq: number,
    patch: EditPolicyPatch,
  ): Promise<EditPolicyCommandResult> {
    const located = this.locate(agreementId, itemSeq);
    if (!located) {
      return { ok: false, reason: 'UNKNOWN_ITEM', detail: `no item ${itemSeq}` };
    }
    const result = await this.commands.dispatch(scope, {
      transitionId: 't_delivery_policy_set',
      entity: 'deliveryPolicy',
      entityId: itemKey(agreementId, itemSeq),
      payload: {
        tolerancePct: patch.tolerancePct,
        enforcement: patch.enforcement,
        reason: patch.reason,
      },
    });
    if (result.status === 'failed') {
      return { ok: false, reason: result.reason ?? 'REFUSED' };
    }
    return { ok: true, view: this.viewOf(this.reread(located.agreement.id)) };
  }

  /** Resolve an agreement + item from the store, or null. */
  private locate(
    agreementId: string,
    itemSeq: number,
  ): { agreement: SchedulingAgreement; item: SchedulingAgreementItem } | null {
    const agreement = schedulingAgreementStore.get(agreementId);
    if (!agreement) return null;
    const item = agreement.items.find((i) => i.lineSeq === itemSeq);
    return item ? { agreement, item } : null;
  }

  /** Re-read an agreement AFTER a dispatch — the store swapped the object, so a
   *  stale reference would render the world as it was before the act. */
  private reread(agreementId: string): SchedulingAgreement {
    const a = schedulingAgreementStore.get(agreementId);
    if (!a) throw new Error(`delivery: agreement ${agreementId} vanished after a successful write`);
    return a;
  }

  /** Derive one agreement's view-model as of the shared SIMULATED clock, over the
   *  live shipment pool (real store + the SIMULATED demo shipments). */
  private viewOf(agreement: SchedulingAgreement): DeliveryAgreementView {
    return deriveAgreementView(
      agreement,
      deliveryShipmentPool(),
      sdcClock.now(),
      supplierNameOf(agreement.supplierId),
    );
  }
}
