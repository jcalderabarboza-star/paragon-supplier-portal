// ────────────────────────────────────────────────────────────────────────────
// B3 · THE PLAN DRAFT — the PLANNED overlay a grid edit creates (Design 1 §5.1,
// C6 §1–§3), as PURE functions a spec can reach without the virtualised engine.
//
//   cell edit / paste ─► GridEditRequest ─► normalizeQty(raw, seat convention)
//        │  refusal → the cell shows the reason; nothing enters the overlay
//        ▼
//   PlanDraft.entries  (seamRef-keyed; NOT the query cache, NOT browser storage)
//        │  a pasted value carries origin PASTE → the EXTERNAL marker until pushed
//        ▼
//   push (row · selection · all) ─► one `t_intake_commit` per row, one anchor,
//        │  ONE refresh at the end, a pause between rows (PLN-4 — push at volume)
//        │  a reason is demanded, per row and BEFORE dispatch, only where the
//        │  planner left the producer's baseline (A2's rule — A1-R2)
//        │  refusal (thrown OR returned) → the row stays PLANNED with its reason
//        ▼
//   the seam re-read agrees → the entry clears (C6 §3 — the ONLY exit)
//
// ⚠️ THE OVERLAY IS NEVER MERGED. Nothing here writes into a `PlanRow`, a fact,
// or a cache entry: a planned value is reachable ONLY as
// `draft.entries.get(seamRef)` (C6 §6 invariant 1). `planDraft.test.ts` searches
// every seam array after an edit and a paste, and the mutation probe that
// writes the value into the row instead is killed by name.
//
// ── B4b · ALLOCATION (Design 1 §5.3) ─────────────────────────────────────────
// A supplier's `allocation` cell edits the OPEN DRAFT publication's split. It
// enters the same overlay, keyed by its allocation anchor, and pushes as
// `t_publication_allocate` under the SAME causation anchor as any intake row
// in the push. Two rules are its own:
//  · Σ over the material's suppliers ≤ SOMO's material-period total is refused
//    AT THE CELL (`OVER_TOTAL`), counting each sibling's PLANNED value where it
//    has one — the hook still decides at dispatch; the cell says it first.
//  · No reason is owed: the split IS the planner's act, with no producer
//    baseline to depart from (the registry's edit spec says so).
//
// ⚠️ SE-14, NOT HERE: the fill handle. A fill is a batch of `GridEditRequest`s
// with origin FILL (§5.4) and needs range selection the installed engine does
// not give.
//
// ── PLN-5 · DELETE AND UNDO ACT ON THE OVERLAY, NEVER ON THE SEAM ────────────
// Delete over a selection REMOVES the planned changes in it (`removeEntries`) —
// it never blanks a seam figure ("a blank is not a quantity"), and a selection
// with nothing planned in it is said to have nothing to delete. Ctrl+Z undoes
// the last change TO THE OVERLAY (an edit, a paste, a delete or a remove —
// `diffEntries` records one step per act, `applyUndo` takes it back), and only
// where that change still stands: a row since pushed, re-typed or reconciled
// is past undoing, and is left alone rather than rolled back over.
// ────────────────────────────────────────────────────────────────────────────

import { normalizeQty, type NumberConvention, type QtyRefusalReason } from '../../lib/localeNumber';
import type { BucketId } from '../../services/planning/bucket';
import { measureOf, type MeasureId, type MeasureSource } from '../../services/planning/measures';
import type { CommandResult } from '../../services/data/types';
import { DataError } from '../../services/data/types';
import { isCommittedCell, isEditableCell, type PlanRow } from './planGridModel';
import { parseAllocationAnchor } from '../../services/planning/allocationAnchor';

export type EditOrigin = 'TYPED' | 'PASTE';

/** One planned change, anchored to one seam row (C6 §1 `PlanDraftRow`). */
export interface PlanDraftEntry {
  /** The seam row — the intake line id. REQUIRED: no anchor, no entry. */
  readonly seamRef: string;
  readonly rowId: string;
  readonly materialCode: string;
  /** B4b · the supplier of a supplier-grain cell (an allocation); null on a material row. */
  readonly supplierId: string | null;
  readonly uom: string;
  readonly bucket: BucketId;
  readonly measureId: MeasureId;
  /** What the planner typed or pasted, verbatim — `INTAKE_QTY_AGREES` re-reads it. */
  readonly raw: string;
  /** The ONE parse of `raw`, under the seat's convention. */
  readonly value: number;
  /** The seam's figure when the edit was made — the producer's delivered quantity. */
  readonly baseline: number | null;
  readonly origin: EditOrigin;
  /** The planner's reason; owed only when `value` leaves `baseline`. */
  readonly reason: string;
  /** PLANNED until a push dispatches it; PUSHING until the seam agrees. */
  readonly planState: 'PLANNED' | 'PUSHING';
  /** Why the last push left it PLANNED — present only after a refusal. */
  readonly failureReason?: string;
  /**
   * R2 · the planner confirmed a value `magnitudeFlag` holds. Reset by every
   * re-edit: a confirmation is about ONE value, never about the cell.
   */
  readonly magnitudeConfirmed?: boolean;
}

/**
 * Why a cell edit was refused. `NO_SEAM_ROW` is an EDITABLE measure in a
 * bucket where the producer emitted no line — there is nothing to anchor a
 * planned value to (C6 §1), and calling that "read-only" would name the wrong
 * owner (found in browser QA: a gap bucket read "the planner owns this figure").
 */
export type CellRefusalReason =
  | QtyRefusalReason
  | 'READ_ONLY'
  | 'NO_SEAM_ROW'
  | 'NO_OPEN_DRAFT'
  | 'OVER_TOTAL'
  // PLN-1 · the line is already committed; its requisition is where it changes.
  | 'COMMITTED';

/** A cell edit that did NOT enter the overlay, and why. Shown at the cell. */
export interface CellRefusal {
  readonly rowId: string;
  readonly bucket: BucketId;
  readonly raw: string;
  readonly reason: CellRefusalReason;
  /** For READ_ONLY: who owns the figure (the measure's producer). */
  readonly source?: MeasureSource;
  /** For OVER_TOTAL: what the suppliers would hold, and SOMO's total. */
  readonly sum?: number;
  readonly total?: number;
}

/**
 * B4b · what an allocation edit is measured against: the rows the grid holds
 * (the material's other suppliers are among them) and SOMO's material-period
 * total on the open draft. Absent on a material-grain edit, which needs neither.
 */
export interface EditContext {
  readonly rows: readonly PlanRow[];
  readonly totalOf: (materialCode: string, bucket: BucketId) => number | undefined;
}

export interface PlanDraft {
  readonly entries: ReadonlyMap<string, PlanDraftEntry>;
  /** Keyed by `cellKey(rowId, bucket)`. */
  readonly refusals: ReadonlyMap<string, CellRefusal>;
}

export const EMPTY_DRAFT: PlanDraft = Object.freeze({ entries: new Map(), refusals: new Map() });

export const cellKey = (rowId: string, bucket: BucketId): string => `${rowId}@${bucket}`;

/** The seat's number convention — the UI language it reads in (Design 1 §5.4). */
export const conventionOf = (language: string | undefined): NumberConvention =>
  (language ?? '').toLowerCase().startsWith('id') ? 'id' : 'en';

const withRefusal = (draft: PlanDraft, r: CellRefusal): PlanDraft => {
  const refusals = new Map(draft.refusals);
  refusals.set(cellKey(r.rowId, r.bucket), r);
  return { entries: draft.entries, refusals };
};

/**
 * Apply ONE cell edit. An editable cell whose raw parses becomes (or replaces)
 * a PLANNED entry and clears any refusal on that cell; anything else becomes a
 * refusal at the cell and leaves the overlay untouched.
 */
export function applyEdit(
  draft: PlanDraft,
  row: PlanRow,
  bucket: BucketId,
  raw: string,
  origin: EditOrigin,
  convention: NumberConvention,
  ctx?: EditContext,
): PlanDraft {
  if (!isEditableCell(row, bucket)) {
    const spec = measureOf(row.measureId);
    // PLN-1 · a committed line names itself — never "read-only" (which names a
    // producer) and never the spine's illegal-transition trail.
    if (isCommittedCell(row, bucket)) {
      return withRefusal(draft, { rowId: row.id, bucket, raw, reason: 'COMMITTED' });
    }
    // An editable measure with nothing to anchor to names WHY — never "read-only",
    // which would name the wrong owner (the B3 NO_SEAM_ROW finding): a supplier
    // allocation is anchored to the open draft, and without one it has nowhere
    // to go.
    if (spec.editable !== false && spec.grain === 'supplier' && row.supplierId !== null) {
      return withRefusal(draft, { rowId: row.id, bucket, raw, reason: 'NO_OPEN_DRAFT' });
    }
    return spec.editable !== false && spec.grain === 'material' && row.supplierId === null
      ? withRefusal(draft, { rowId: row.id, bucket, raw, reason: 'NO_SEAM_ROW' })
      : withRefusal(draft, { rowId: row.id, bucket, raw, reason: 'READ_ONLY', source: spec.source });
  }
  // ⚠️ OPERATOR RULING R2 (R-PLN, 2026-10-02) — RETIRES B4a'S PASTE REFUSAL.
  // B4a refused a pasted token whose EN and ID readings differ (`3,000`,
  // `3.000`). Measured at R-PLN: a spreadsheet copies FORMATTED text, so nearly
  // every pasted value of 1,000 or more was refused in both locales, while a
  // TYPED `12.000` under EN was admitted as 12 with nothing said. Typed and
  // pasted values now follow the SEAT's convention alike, and the 1000× slip is
  // guarded where it can actually be seen: `magnitudeFlag` holds any value more
  // than 10× or under 0.1× its baseline until the planner confirms it, and every
  // edited cell shows its reading ("= 12 KG").
  const parsed = normalizeQty(raw, convention);
  if (!parsed.ok) return withRefusal(draft, { rowId: row.id, bucket, raw, reason: parsed.reason });

  const seamRef = row.seamRefs![bucket];
  // B4b · Σ over suppliers ≤ SOMO's total, at the cell. A sibling's PLANNED
  // value counts where it has one: the planner is refused against the split
  // they are building, not against the one they are replacing.
  if (row.supplierId !== null && ctx) {
    const total = ctx.totalOf(row.materialCode, bucket);
    if (total !== undefined) {
      const others = ctx.rows
        .filter((r) => r.materialCode === row.materialCode && r.measureId === row.measureId)
        .filter((r) => r.supplierId !== null && r.supplierId !== row.supplierId && r.seamRefs?.[bucket])
        .reduce((sum, r) => sum + (draft.entries.get(r.seamRefs![bucket])?.value ?? r.cells[bucket] ?? 0), 0);
      if (others + parsed.value > total) {
        return withRefusal(draft, { rowId: row.id, bucket, raw, reason: 'OVER_TOTAL', sum: others + parsed.value, total });
      }
    }
  }
  const prior = draft.entries.get(seamRef);
  const entries = new Map(draft.entries);
  entries.set(seamRef, {
    seamRef,
    rowId: row.id,
    materialCode: row.materialCode,
    supplierId: row.supplierId,
    uom: row.uom,
    bucket,
    measureId: row.measureId,
    raw,
    value: parsed.value,
    baseline: row.cells[bucket] ?? null,
    origin,
    // A re-edit keeps the reason already written; the value it justifies moved,
    // and the planner can see and change both before pushing.
    reason: prior?.reason ?? '',
    planState: 'PLANNED',
  });
  const refusals = new Map(draft.refusals);
  refusals.delete(cellKey(row.id, bucket));
  return { entries, refusals };
}

/** Split clipboard text into a TSV grid. A trailing newline adds no row. */
export function parseTsv(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((l) => l.split('\t'));
}

/**
 * Apply a multi-cell paste anchored at (rowIndex, bucketIndex) of the rendered
 * rows. Every pasted cell is judged ON ITS OWN: an editable one enters the
 * overlay with origin PASTE, a read-only one is refused at that cell. Cells
 * that fall past the grid's edge have no cell to show a refusal on and are
 * counted as `outside`, never silently dropped from the report.
 */
export function applyPaste(
  draft: PlanDraft,
  rows: readonly PlanRow[],
  horizon: readonly BucketId[],
  anchor: { readonly row: number; readonly col: number },
  text: string,
  convention: NumberConvention,
  totalOf?: EditContext['totalOf'],
): { draft: PlanDraft; planned: number; refused: number; outside: number } {
  let next = draft;
  let planned = 0;
  let refused = 0;
  let outside = 0;
  parseTsv(text).forEach((cells, i) => {
    cells.forEach((raw, j) => {
      const row = rows[anchor.row + i];
      const bucket = horizon[anchor.col + j];
      if (!row || !bucket) {
        outside++;
        return;
      }
      const before = next.entries.get(row.seamRefs?.[bucket] ?? '');
      next = applyEdit(next, row, bucket, raw, 'PASTE', convention, totalOf ? { rows, totalOf } : undefined);
      const after = next.entries.get(row.seamRefs?.[bucket] ?? '');
      if (after && after !== before) planned++;
      else refused++;
    });
  });
  return { draft: next, planned, refused, outside };
}

/**
 * Did the planner leave the producer's baseline? (A1-R2: the ONLY move that
 * owes a reason.) Asked of the REGISTRY: a measure whose edit spec owes no
 * reason (an allocation — the split is the planner's own act) never owes one.
 */
export const reasonOwed = (e: PlanDraftEntry): boolean => {
  const spec = measureOf(e.measureId).editable;
  return spec !== false && spec.reasonRequiredWhen === 'differsFromBaseline' && e.value !== e.baseline;
};

/** R2 · the ratio band outside which a value is held for an explicit confirm. */
export const MAGNITUDE_BAND = Object.freeze({ low: 0.1, high: 10 });

/**
 * R2 · is this value far enough from its baseline to be a separator slip?
 * More than 10× or under 0.1× the baseline (`12.000` read as 12 against a
 * delivered 10,950 is 0.001×). No baseline, or a baseline of zero, gives no
 * ratio to judge by, and the flag stays down rather than guessing.
 */
export const magnitudeFlag = (e: Pick<PlanDraftEntry, 'value' | 'baseline'>): boolean => {
  if (e.baseline === null || !(e.baseline > 0)) return false;
  const ratio = e.value / e.baseline;
  return ratio > MAGNITUDE_BAND.high || ratio < MAGNITUDE_BAND.low;
};

/** R2 · flagged and not yet confirmed — this row does not dispatch. */
export const magnitudeUnconfirmed = (e: PlanDraftEntry): boolean => magnitudeFlag(e) && e.magnitudeConfirmed !== true;

/**
 * Which gate holds a row before dispatch — the reason first, because it is the
 * one the planner writes. THE ONE SOURCE: `pushBlocked` and `pushEntries` both
 * ask this, so the two cannot disagree about whether a row goes.
 */
export const blockedBy = (e: PlanDraftEntry): 'REASON_REQUIRED' | 'MAGNITUDE_UNCONFIRMED' | null =>
  reasonOwed(e) && e.reason.trim() === '' ? 'REASON_REQUIRED' : magnitudeUnconfirmed(e) ? 'MAGNITUDE_UNCONFIRMED' : null;

/** The gates — an owed, blank reason or an unconfirmed magnitude means this row does not dispatch. */
export const pushBlocked = (e: PlanDraftEntry): boolean => blockedBy(e) !== null;

export function setMagnitudeConfirmed(draft: PlanDraft, seamRef: string, confirmed: boolean): PlanDraft {
  const e = draft.entries.get(seamRef);
  if (!e) return draft;
  const entries = new Map(draft.entries);
  entries.set(seamRef, { ...e, magnitudeConfirmed: confirmed });
  return { entries, refusals: draft.refusals };
}

export function setReason(draft: PlanDraft, seamRef: string, reason: string): PlanDraft {
  const e = draft.entries.get(seamRef);
  if (!e) return draft;
  const entries = new Map(draft.entries);
  entries.set(seamRef, { ...e, reason });
  return { entries, refusals: draft.refusals };
}

export function removeEntry(draft: PlanDraft, seamRef: string): PlanDraft {
  if (!draft.entries.has(seamRef)) return draft;
  const entries = new Map(draft.entries);
  entries.delete(seamRef);
  return { entries, refusals: draft.refusals };
}

export function dismissRefusal(draft: PlanDraft, key: string): PlanDraft {
  if (!draft.refusals.has(key)) return draft;
  const refusals = new Map(draft.refusals);
  refusals.delete(key);
  return { entries: draft.entries, refusals };
}

// ─── Push ────────────────────────────────────────────────────────────────────

export interface CommitVars {
  readonly lineId: string;
  readonly acceptedQty: number;
  readonly acceptedQtyRaw: string;
  readonly overrideReason?: string;
  readonly numberConvention: NumberConvention;
  readonly causationId?: string;
}

/** B4b · one supplier's share, pushed to the open draft. */
export interface AllocateVars {
  readonly publicationId: string;
  readonly materialCode: string;
  readonly periodBucket: string;
  readonly supplierId: string;
  readonly forecastQty: number;
  readonly forecastQtyRaw: string;
  readonly numberConvention: NumberConvention;
  readonly causationId?: string;
}

export type PushOutcome =
  | { readonly seamRef: string; readonly kind: 'dispatched'; readonly correlationId: string }
  | { readonly seamRef: string; readonly kind: 'failed'; readonly reason: string }
  | { readonly seamRef: string; readonly kind: 'blocked'; readonly reason: 'REASON_REQUIRED' | 'MAGNITUDE_UNCONFIRMED' };

/**
 * Push rows, one `t_intake_commit` each, in order, under ONE causation anchor:
 * the first dispatch's correlation id is the anchor and every later dispatch
 * passes it (the SubmissionSession pattern). A row whose reason is owed and
 * blank is BLOCKED here, before dispatch — it never reaches the spine.
 *
 * ⚠️ BOTH FAILURE CHANNELS END THE SAME WAY (C6 §3.1): a thrown error and a
 * returned `status: 'failed'` are each a `failed` outcome with a reason, and
 * the row stays PLANNED. Neither is swallowed into `dispatched`.
 */
export interface PushProgress {
  /** Rows the push has finished with — dispatched, refused or held. */
  readonly done: number;
  readonly total: number;
}

/**
 * PLN-4 · how a push at volume stays a page: told after each row how far it has
 * got, and handed a pause between rows so the browser can paint and take input.
 * Both optional — a one-row push and the pure specs need neither.
 */
export interface PushOptions {
  readonly onProgress?: (p: PushProgress) => void;
  readonly yieldBetween?: () => Promise<void>;
}

export async function pushEntries(
  entries: readonly PlanDraftEntry[],
  commit: (vars: CommitVars) => Promise<CommandResult>,
  convention: NumberConvention,
  allocate?: (vars: AllocateVars) => Promise<CommandResult>,
  opts: PushOptions = {},
): Promise<readonly PushOutcome[]> {
  const out: PushOutcome[] = [];
  let anchor: string | undefined;
  // B4b · allocations that LOWER a share go before those that raise one: the
  // hook measures Σ against the draft as it stands, so a planner moving
  // quantity from one supplier to another would otherwise be refused for the
  // raise before the lower had landed.
  const isAlloc = (e: PlanDraftEntry) => e.measureId === 'allocation';
  const delta = (e: PlanDraftEntry) => e.value - (e.baseline ?? 0);
  const ordered = [
    ...entries.filter((e) => !isAlloc(e)),
    ...entries.filter(isAlloc).sort((a, b) => delta(a) - delta(b)),
  ];
  const total = ordered.length;
  for (const e of ordered) {
    if (out.length > 0) {
      opts.onProgress?.({ done: out.length, total });
      await opts.yieldBetween?.();
    }
    const held = blockedBy(e);
    if (held) {
      out.push({ seamRef: e.seamRef, kind: 'blocked', reason: held });
      continue;
    }
    const target = isAlloc(e) ? parseAllocationAnchor(e.seamRef) : null;
    if (isAlloc(e) && (!target || !allocate)) {
      out.push({ seamRef: e.seamRef, kind: 'failed', reason: 'NOT_ROUTABLE' });
      continue;
    }
    try {
      const result = target
        ? await allocate!({
            ...target,
            forecastQty: e.value,
            forecastQtyRaw: e.raw,
            numberConvention: convention,
            ...(anchor ? { causationId: anchor } : {}),
          })
        : await commit({
            lineId: e.seamRef,
            acceptedQty: e.value,
            acceptedQtyRaw: e.raw,
            numberConvention: convention,
            ...(reasonOwed(e) ? { overrideReason: e.reason.trim() } : {}),
            ...(anchor ? { causationId: anchor } : {}),
          });
      anchor ??= result.correlationId;
      out.push(
        result.status === 'failed'
          ? { seamRef: e.seamRef, kind: 'failed', reason: result.reason ?? 'failed' }
          : { seamRef: e.seamRef, kind: 'dispatched', correlationId: result.correlationId },
      );
    } catch (err) {
      out.push({ seamRef: e.seamRef, kind: 'failed', reason: err instanceof DataError ? err.code : 'ERROR' });
    }
  }
  opts.onProgress?.({ done: out.length, total });
  return out;
}

/** PLN-4 · what one push did: how many rows went in, how many did not, and why. */
export interface PushSummary {
  readonly total: number;
  readonly committed: number;
  readonly refused: number;
  /** Each refusal reason with how many rows it held back, most frequent first. */
  readonly reasons: readonly (readonly [reason: string, count: number])[];
}

/**
 * PLN-4 · the final summary of a push — "N committed, M refused with reasons".
 * A row held before dispatch (no reason, an unconfirmed magnitude) is refused
 * too: it did not go in, and the planner is owed the reason in the same line.
 */
export function summarizePush(outcomes: readonly PushOutcome[]): PushSummary {
  const counts = new Map<string, number>();
  let committed = 0;
  for (const o of outcomes) {
    if (o.kind === 'dispatched') committed++;
    else counts.set(o.reason, (counts.get(o.reason) ?? 0) + 1);
  }
  return {
    total: outcomes.length,
    committed,
    refused: outcomes.length - committed,
    reasons: [...counts.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/**
 * PLN-4 · "apply this reason to selected". The ONE reason is written onto EACH
 * selected row that owes one, as that row's own reason — the record still
 * carries one reason per committed row (each commit sends its own
 * `overrideReason`, and each requisition its own `decision.reason`). A row that
 * owes none (it holds the producer's figure, or it is an allocation) is left as
 * it is: a reason on a change nobody made is not a record of anything. A row
 * already PUSHING is not rewritten under its own dispatch.
 */
export function applyReasonToRows(
  draft: PlanDraft,
  seamRefs: readonly string[],
  reason: string,
): { draft: PlanDraft; applied: number } {
  const text = reason.trim();
  if (text === '') return { draft, applied: 0 };
  const entries = new Map(draft.entries);
  let applied = 0;
  for (const ref of seamRefs) {
    const e = entries.get(ref);
    if (!e || e.planState !== 'PLANNED' || !reasonOwed(e)) continue;
    entries.set(ref, { ...e, reason: text });
    applied++;
  }
  return applied === 0 ? { draft, applied } : { draft: { entries, refusals: draft.refusals }, applied };
}

/** Fold push outcomes into the draft: dispatched → PUSHING, else PLANNED + reason. */
export function applyPushOutcomes(draft: PlanDraft, outcomes: readonly PushOutcome[]): PlanDraft {
  const entries = new Map(draft.entries);
  for (const o of outcomes) {
    const e = entries.get(o.seamRef);
    if (!e) continue;
    if (o.kind === 'dispatched') {
      const { failureReason: _drop, ...rest } = e;
      entries.set(o.seamRef, { ...rest, planState: 'PUSHING' });
    } else {
      entries.set(o.seamRef, { ...e, planState: 'PLANNED', failureReason: o.reason });
    }
  }
  return { entries, refusals: draft.refusals };
}

/** What the seam currently holds for a row. */
export interface SeamCell {
  readonly value: number | null;
  readonly committed: boolean;
}

/**
 * C6 §3 — the ONLY exit from the overlay. A PUSHING entry clears when the seam
 * re-read holds the same figure AS COMMITTED. A PLANNED entry never clears here
 * (push-only-exit); a PUSHING entry the seam contradicts returns to PLANNED and
 * says so, rather than waiting forever or clearing on a disagreement.
 */
export function reconcile(draft: PlanDraft, seam: (seamRef: string) => SeamCell | undefined): PlanDraft {
  let changed = false;
  const entries = new Map(draft.entries);
  for (const e of draft.entries.values()) {
    if (e.planState !== 'PUSHING') continue;
    const s = seam(e.seamRef);
    if (!s || !s.committed) continue;
    changed = true;
    if (s.value === e.value) entries.delete(e.seamRef);
    else entries.set(e.seamRef, { ...e, planState: 'PLANNED', failureReason: 'SEAM_DISAGREES' });
  }
  return changed ? { entries, refusals: draft.refusals } : draft;
}

// ─── Paste routing (PLN-1) ───────────────────────────────────────────────────

/** Does the clipboard text span more than one cell? A trailing newline does not. */
export const isMultiCell = (text: string): boolean => /[\t\n]/.test(text.replace(/\r\n?/g, '\n').replace(/\n$/, ''));

export type PasteRoute = 'grid' | 'field';

/**
 * PLN-1 · WHO TAKES A PASTE. A single token pasted while a cell's editor is
 * open is the field's own paste. A MULTI-CELL paste is always the grid's,
 * editor open or not.
 *
 * ⚠️ THE DEFECT THIS CLOSES (R-PLN P0 #1, measured): clicking the cell that is
 * already active opens its editor, and the grid's handler stood aside for ANY
 * paste into an open editor — so a row copied from a spreadsheet landed in ONE
 * field as `1000\t2000\t3,000…`, was refused as "not a number", and the paste
 * note kept saying the PREVIOUS paste's "10 planned · 0 refused". Five pastes of
 * ten cells left ten planned changes and a page that reported success.
 */
export const routePaste = (text: string, editorOpen: boolean): PasteRoute =>
  editorOpen && !isMultiCell(text) ? 'field' : 'grid';

// ─── PLN-5 · delete and undo, on the overlay only ───────────────────────────

/**
 * Remove the PLANNED changes among `seamRefs` — Delete over a selection. A ref
 * with no entry, or one already PUSHING (it is the dispatcher's now), is left;
 * `removed` says how many went, so "nothing planned here" is said, not implied.
 */
export function removeEntries(draft: PlanDraft, seamRefs: readonly string[]): { draft: PlanDraft; removed: number } {
  const entries = new Map(draft.entries);
  let removed = 0;
  for (const ref of new Set(seamRefs)) {
    if (entries.get(ref)?.planState !== 'PLANNED') continue;
    entries.delete(ref);
    removed++;
  }
  return removed === 0 ? { draft, removed } : { draft: { entries, refusals: draft.refusals }, removed };
}

/** One act's change to the overlay: each touched row, before and after. */
export interface UndoStep {
  readonly changes: readonly { readonly seamRef: string; readonly before?: PlanDraftEntry; readonly after?: PlanDraftEntry }[];
}

/**
 * The overlay rows an act changed — the step Ctrl+Z takes back — or null when
 * it changed none (a refused edit, a re-entry of the same value). Refusals are
 * not recorded: they are reports about an act, not planned changes.
 */
export function diffEntries(before: PlanDraft, after: PlanDraft): UndoStep | null {
  if (before.entries === after.entries) return null;
  const changes: { seamRef: string; before?: PlanDraftEntry; after?: PlanDraftEntry }[] = [];
  for (const ref of new Set([...before.entries.keys(), ...after.entries.keys()])) {
    const b = before.entries.get(ref);
    const a = after.entries.get(ref);
    if (b === a) continue;
    if (b && a && b.raw === a.raw && b.value === a.value && b.planState === a.planState) continue;
    changes.push({ seamRef: ref, ...(b ? { before: b } : {}), ...(a ? { after: a } : {}) });
  }
  return changes.length === 0 ? null : { changes };
}

/** Does the overlay still hold what the step left there — the same figure, still PLANNED? */
const stillStands = (cur: PlanDraftEntry | undefined, after: PlanDraftEntry | undefined): boolean =>
  after === undefined
    ? cur === undefined
    : cur !== undefined && cur.planState === 'PLANNED' && cur.raw === after.raw && cur.value === after.value;

/**
 * Take one step back. A row is restored only where the step's result still
 * stands; anything since pushed, re-typed or cleared by the seam is past undoing
 * and is left as it is. A reason written AFTER the act is kept on the restored
 * row — it is the planner's later work, not part of the act being undone.
 */
export function applyUndo(draft: PlanDraft, step: UndoStep): { draft: PlanDraft; restored: number } {
  const entries = new Map(draft.entries);
  let restored = 0;
  for (const c of step.changes) {
    const cur = entries.get(c.seamRef);
    if (!stillStands(cur, c.after)) continue;
    if (c.before === undefined) entries.delete(c.seamRef);
    else entries.set(c.seamRef, cur ? { ...c.before, reason: cur.reason } : c.before);
    restored++;
  }
  return restored === 0 ? { draft, restored } : { draft: { entries, refusals: draft.refusals }, restored };
}
