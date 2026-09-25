// ─────────────────────────────────────────────────────────────────────────────
// THE CHANGE HISTORY — the first READER of the stamps this lane has always
// written.
//
// `releasedAt`, `adjustedAt`, `confirmedAt` and `activeChangedAt` have been on
// the model since the lane was authored. Nothing read them. A stamp with no
// reader is a field that LOOKS like an audit trail and answers no question, and
// "change history" is a named RFP element, so the honest fix is a reader rather
// than another stamp.
//
// ⚠️ **DERIVED AT READ, NEVER STORED.** This is a fold over the agreement's own
// rows — exactly the discipline `deriveDrawdownLedger` and `deriveFulfillment`
// already hold the lane to. There is no history table to fall out of step with
// the thing it describes, and a row cannot exist for an act the model does not
// carry.
//
// ⚠️ **AND IT IS NOT THE AUDIT TRAIL — IT IS THE SURFACE'S VIEW OF ONE
// AGREEMENT.** The DR-10 `TransitionEvent` stream is the audit record, it
// carries every refusal too, and it is process-wide. This shows a buyer what
// happened to the document in front of them. `deliveryHistory.test.ts` pins the
// two together in the direction that matters: every act this view shows was
// dispatched, by named transition id.
//
// ⚠️ **THE ACTOR IS CARRIED, NEVER RENDERED HERE.** An `ActorAttribution` holds
// a `personId` and nothing else (C10 §8.2 / D-ID-7); the LABEL — and its
// `(SAMPLE)` marker — is resolved at the render site through the ONE resolver,
// `services/identity/personLabel.ts`. A module that produced a display string
// would be the sixth call site that has to remember the marker.
// ─────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import type { SchedulingAgreement } from './types';

/** What kind of act a history row records. A CLOSED union — one member per
 *  stamp the model carries, so a row can never describe an act with no field
 *  behind it. */
export type DeliveryHistoryKind = 'released' | 'adjusted' | 'confirmed' | 'policy';

/** One recorded act against one agreement. */
export interface DeliveryHistoryEntry {
  /** Stable row key: address + kind, so React never re-keys on a re-derive. */
  readonly key: string;
  readonly kind: DeliveryHistoryKind;
  /** ISO stamp of the act. */
  readonly at: string;
  /** WHO — carried as attribution; the label resolves at render. */
  readonly actor: ActorAttribution;
  /** The item's material, so a row reads without opening the calendar. */
  readonly materialCode: string;
  readonly lineSeq: number;
  /** Absent on a `policy` row — a tolerance belongs to the ITEM, not a line. */
  readonly releaseSeq?: number;
  /** The operator's stated reason. Only a `policy` act carries one today. */
  readonly reason?: string;
}

/**
 * Fold one agreement's rows into its change history, NEWEST FIRST.
 *
 * Ties are broken by the address so the order is total and stable — two acts
 * stamped at the same simulated instant (every seeded release is) must not
 * shuffle between renders.
 */
export function deriveAgreementHistory(
  agreement: SchedulingAgreement,
): readonly DeliveryHistoryEntry[] {
  const rows: DeliveryHistoryEntry[] = [];

  for (const item of agreement.items) {
    const { materialCode, lineSeq } = item;

    const policy = item.drawdownPolicy;
    if (policy.activeChangedAt && policy.activeChangedBy) {
      rows.push({
        key: `${agreement.id}#${lineSeq}:policy`,
        kind: 'policy',
        at: policy.activeChangedAt,
        actor: policy.activeChangedBy,
        materialCode,
        lineSeq,
        reason: policy.activeChangeReason,
      });
    }

    for (const line of item.scheduleLines) {
      // ⚠️ BOTH HALVES REQUIRED, DELIBERATELY. A stamp with no actor is a row
      // this view cannot honestly render — it would have to print an empty
      // "who" beside a real "when", which reads as a redaction rather than as
      // the absence it is. The invariants on `types.ts` say the pair moves
      // together; this is the read side declining to paper over a break in them.
      if (line.releasedAt && line.releasedBy) {
        rows.push({
          key: `${line.releaseRef}:released`,
          kind: 'released',
          at: line.releasedAt,
          actor: line.releasedBy,
          materialCode,
          lineSeq,
          releaseSeq: line.releaseSeq,
        });
      }
      if (line.adjustedAt && line.adjustedBy) {
        rows.push({
          key: `${line.releaseRef}:adjusted`,
          kind: 'adjusted',
          at: line.adjustedAt,
          actor: line.adjustedBy,
          materialCode,
          lineSeq,
          releaseSeq: line.releaseSeq,
        });
      }
      if (line.confirmedAt && line.confirmedBy) {
        rows.push({
          key: `${line.releaseRef}:confirmed`,
          kind: 'confirmed',
          at: line.confirmedAt,
          actor: line.confirmedBy,
          materialCode,
          lineSeq,
          releaseSeq: line.releaseSeq,
        });
      }
    }
  }

  return rows.sort((a, b) => (a.at === b.at ? a.key.localeCompare(b.key) : a.at < b.at ? 1 : -1));
}
