// ────────────────────────────────────────────────────────────────────────────
// SRC-2 · WHAT ONE SUPPLIER MAY READ OF A SOURCING EVENT.
//
// The supplier read used to return the buyer's own row: the whole invite list,
// the list of who had answered, the winner's id and quotation id, the rate
// ledger (which says another bidder priced in dollars) and the buyer's budget.
// No surface rendered them, which is not the same as not sending them — the
// rows crossed the tenancy boundary and sat in the supplier's cache.
//
// AN ALLOWLIST, NOT A STRIP. Every field below is named; a field added to `RFQ`
// tomorrow reaches no supplier until someone adds it here. A strip is the other
// way round: it leaks every new field by default.
//
// The three "who" lists are kept as fields and narrowed to the reader itself,
// so the supplier's surfaces keep asking the questions they already ask ("am I
// invited", "have I answered", "did I win") and get their own answer only.
// `src2SupplierScope.test.ts` fails if any other supplier's id reaches a
// supplier scope through a sourcing read.
//
// RFx-1 · THE STAGED EVENT, UNDER THE SAME RULE. The stage and the dates of
// each advance are the event's facts and cross. Who was carried and who was
// left out are narrowed to the reader, as the invite list is: a supplier reads
// that IT was shortlisted or that IT was not — and the reason only when it is
// the one left out, since the reason is about those suppliers. The stage
// responses are the reader's own. The reason an event was concluded without an
// award stays with the buyer; the day it ended crosses.
//
// RFx-2 · THE QUESTIONNAIRE, UNDER THE SAME RULE. The questions cross — the
// supplier has to read them to answer them — but each question is itself an
// allowlist, and THE KNOCK-OUT ANSWER IS NOT ON IT: which answer takes a
// supplier out of consideration is the buyer's, and a supplier that could read
// it would simply not give it. The reader's own unsent draft is handed in by
// the caller (the event row never holds a draft) and is checked to be the
// reader's, a draft, and of the stage the event is at.
// ────────────────────────────────────────────────────────────────────────────

import type { RFQ } from '../../data/mockRfqs';
import {
  isSubmittedResponse,
  notShortlistedAdvanceOf,
  stageOf,
  type StageResponse,
} from '../../data/rfqStage';
import type { RfiQuestion } from '../../data/rfiQuestionnaire';

/** One question as a supplier reads it. Named fields only; no knock-out. */
export function toSupplierQuestion(q: RfiQuestion): RfiQuestion {
  return {
    id: q.id,
    prompt: q.prompt,
    type: q.type,
    required: q.required,
    ...(q.options ? { options: [...q.options] } : {}),
    ...(q.unit !== undefined ? { unit: q.unit } : {}),
  };
}

export function toSupplierRfqView(rfq: RFQ, supplierId: string, ownDraft?: StageResponse): RFQ {
  const draft =
    ownDraft &&
    ownDraft.rfqId === rfq.id &&
    ownDraft.supplierId === supplierId &&
    !isSubmittedResponse(ownDraft) &&
    ownDraft.stage === stageOf(rfq)
      ? ownDraft
      : undefined;
  const mine = (ids: readonly string[]): string[] => (ids.includes(supplierId) ? [supplierId] : []);
  const won = rfq.awardedSupplierId === supplierId;
  return {
    id: rfq.id,
    rfqNumber: rfq.rfqNumber,
    title: rfq.title,
    materialCategory: rfq.materialCategory,
    materialIds: [...rfq.materialIds],
    buyerId: rfq.buyerId,
    status: rfq.status,
    createdAt: rfq.createdAt,
    responseDeadline: rfq.responseDeadline,
    awardDeadline: rfq.awardDeadline,
    invitedSupplierIds: mine(rfq.invitedSupplierIds),
    respondedSupplierIds: mine(rfq.respondedSupplierIds),
    totalQty: rfq.totalQty,
    uom: rfq.uom,
    currency: rfq.currency,
    incoterms: rfq.incoterms,
    paymentTerms: rfq.paymentTerms,
    // The day an award was made is the event's fact; who won is the winner's.
    ...(rfq.stage ? { stage: rfq.stage } : {}),
    ...(rfq.stageHistory
      ? {
          stageHistory: rfq.stageHistory.map((a) => {
            const leftOut = a.notShortlistedSupplierIds.includes(supplierId);
            return {
              from: a.from,
              to: a.to,
              advancedAt: a.advancedAt,
              shortlistedSupplierIds: mine(a.shortlistedSupplierIds),
              notShortlistedSupplierIds: mine(a.notShortlistedSupplierIds),
              ...(leftOut && a.reason ? { reason: a.reason } : {}),
            };
          }),
        }
      : {}),
    ...(rfq.concludedAt ? { concludedAt: rfq.concludedAt } : {}),
    stageResponses: (rfq.stageResponses ?? []).filter((r) => r.supplierId === supplierId),
    ...(rfq.questionnaire ? { questionnaire: rfq.questionnaire.map(toSupplierQuestion) } : {}),
    ...(draft ? { myStageDraft: draft } : {}),
    ...(rfq.awardedAt ? { awardedAt: rfq.awardedAt } : {}),
    ...(won && rfq.awardedSupplierId ? { awardedSupplierId: rfq.awardedSupplierId } : {}),
    ...(won && rfq.awardedQuotationId ? { awardedQuotationId: rfq.awardedQuotationId } : {}),
  };
}

/**
 * RFx-1 · MAY THIS SUPPLIER READ THE EVENT AT ALL? It is on the invite list, or
 * it was on it and an advance left it out. The second half is what lets a
 * supplier read "not shortlisted" with the reason: the invite list narrows to
 * the shortlist, so membership alone would make the event vanish from the
 * board of exactly the suppliers who are owed the explanation.
 */
export function supplierMayRead(rfq: RFQ, supplierId: string): boolean {
  return (
    rfq.invitedSupplierIds.includes(supplierId) || notShortlistedAdvanceOf(rfq, supplierId) !== null
  );
}
