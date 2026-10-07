// ────────────────────────────────────────────────────────────────────────────
// RFx-1 · THE STAGES OF ONE SOURCING EVENT (design A, operator ruling).
//
// A sourcing event is ONE row that moves through stages — RFI, then RFP, then
// RFQ — not three documents linked to one another. An event starts at any of
// the three and only ever moves forward, one stage at a time. An event that
// states no stage is at RFQ: every event authored before this batch is one, and
// none of them is rewritten.
//
// Pure: no store, no clock. The machine (`policies.ts`), the store, the buyer's
// panel and the supplier's card all read these and nothing else, so "what is
// the next stage" has one answer.
// ────────────────────────────────────────────────────────────────────────────

import type { RfiAnswers } from './rfiQuestionnaire';

export type RfqStage = 'RFI' | 'RFP' | 'RFQ';

/** The three, in the only order an event moves through them. */
export const RFQ_STAGES: readonly RfqStage[] = ['RFI', 'RFP', 'RFQ'];

/** Exact membership — never a coercion, never a nearest match. */
export const isRfqStage = (v: unknown): v is RfqStage =>
  typeof v === 'string' && (RFQ_STAGES as readonly string[]).includes(v);

/** The stage an event is at. An event that states none is at RFQ. */
export const stageOf = (event: { stage?: RfqStage }): RfqStage => event.stage ?? 'RFQ';

/** The stage after `stage`, or `null` at RFQ — the last one. */
export function nextStageOf(stage: RfqStage): RfqStage | null {
  return RFQ_STAGES[RFQ_STAGES.indexOf(stage) + 1] ?? null;
}

/**
 * One advance, as the event keeps it. An APPEND-ONLY ledger entry: the shortlist
 * a stage ended on stays readable after the next advance narrows it again.
 */
export interface StageAdvance {
  readonly from: RfqStage;
  readonly to: RfqStage;
  /** The day of the act (`YYYY-MM-DD`), store-assigned. */
  readonly advancedAt: string;
  /** Who was carried into `to` — the next stage's invite list. */
  readonly shortlistedSupplierIds: readonly string[];
  /** Who was invited at `from` and is not carried. */
  readonly notShortlistedSupplierIds: readonly string[];
  /** Why the list was narrowed. Present whenever anyone was left out. */
  readonly reason?: string;
}

/**
 * RFx-2 · where a stage response is. A `Draft` is the supplier's own work in
 * progress: the buyer does not read it and it is not an answer. Absent on a
 * row = `Submitted`, which is every row authored before drafts existed.
 */
export type StageResponseStatus = 'Draft' | 'Submitted';

/**
 * A supplier's answer at an RFI or RFP stage: an acknowledgement of interest,
 * an optional note and — at an RFI that carries a questionnaire (RFx-2) — the
 * answers to it. The RFP proposal is RFx-3.
 */
export interface StageResponse {
  readonly id: string;
  readonly rfqId: string;
  /** The stage the event was at when the answer was recorded. Store-assigned. */
  readonly stage: RfqStage;
  readonly supplierId: string;
  readonly note?: string;
  /**
   * The day of the act (`YYYY-MM-DD`), store-assigned: the day it was
   * submitted, or — on a Draft — the day it was last saved.
   */
  readonly respondedAt: string;
  /** RFx-2 · read it through `isSubmittedResponse`, never directly. */
  readonly status?: StageResponseStatus;
  /** RFx-2 · the answers to the event's RFI questionnaire, keyed by question id. */
  readonly answers?: RfiAnswers;
}

/** RFx-2 · is this row an answer the buyer reads? A row that states no status is. */
export const isSubmittedResponse = (r: Pick<StageResponse, 'status'>): boolean =>
  r.status !== 'Draft';

/** RFx-2 · the state the machine reads off a row. */
export const stageResponseStatusOf = (r: Pick<StageResponse, 'status'>): StageResponseStatus =>
  r.status ?? 'Submitted';

interface StagedEvent {
  readonly stage?: RfqStage;
  readonly stageHistory?: readonly StageAdvance[];
}

/** The stage an event STARTED at: where its first advance left from, or where it still is. */
export const startStageOf = (event: StagedEvent): RfqStage =>
  event.stageHistory?.[0]?.from ?? stageOf(event);

/** Every stage on this event's path, from where it started through RFQ. */
export function stagePathOf(event: StagedEvent): RfqStage[] {
  return RFQ_STAGES.slice(RFQ_STAGES.indexOf(startStageOf(event)));
}

/** The advance that left `supplierId` out, or `null` if none did. */
export function notShortlistedAdvanceOf(
  event: StagedEvent,
  supplierId: string,
): StageAdvance | null {
  return (
    (event.stageHistory ?? []).find((a) => a.notShortlistedSupplierIds.includes(supplierId)) ?? null
  );
}

/**
 * The suppliers who answered at `stage`, once each, in the order they answered.
 * RFx-2 — a Draft is not an answer: a supplier that saved one and never
 * submitted it has not responded, and cannot be shortlisted on it.
 */
export function stageRespondersOf(
  responses: readonly StageResponse[],
  rfqId: string,
  stage: RfqStage,
): string[] {
  const seen: string[] = [];
  for (const r of responses) {
    if (
      r.rfqId === rfqId &&
      r.stage === stage &&
      isSubmittedResponse(r) &&
      !seen.includes(r.supplierId)
    ) {
      seen.push(r.supplierId);
    }
  }
  return seen;
}
