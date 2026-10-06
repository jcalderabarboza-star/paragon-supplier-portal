// ────────────────────────────────────────────────────────────────────────────
// SRC-1 · WHO HAS ANSWERED A SOURCING EVENT IS DERIVED, NEVER STORED.
//
// `RFQ.respondedSupplierIds` was an authored list on the fixture and `[]` on a
// created event, and NOTHING wrote it: a supplier's quotation landed in the
// quotation store and the list beside it never moved. The board read "1 / 2"
// with both invitees' quotations in review, and the award control — which asked
// for the list to equal the invite list — never appeared on an event the
// platform had made.
//
// A second copy of a fact the quotations already state can only agree with them
// by being rewritten every time they change, and it drifts the first time one
// write site forgets. So there is no second copy: the list is computed from the
// quotations at every read (`rfqStore`), and the fixture no longer authors one.
//
// A supplier has answered when it holds ANY quotation on the event, whatever
// became of it — awarded, rejected, or withdrawn with a cancelled event.
// ────────────────────────────────────────────────────────────────────────────

/** The two facts the derivation reads off a quotation. */
export interface RespondingQuotation {
  readonly rfqId: string;
  readonly supplierId: string;
}

/** The suppliers holding a quotation on `rfqId`, once each, in quotation order. */
export function respondedSupplierIdsOf(
  rfqId: string,
  quotations: readonly RespondingQuotation[],
): string[] {
  const seen: string[] = [];
  for (const q of quotations) {
    if (q.rfqId === rfqId && !seen.includes(q.supplierId)) seen.push(q.supplierId);
  }
  return seen;
}
