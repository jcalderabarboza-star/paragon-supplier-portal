// ────────────────────────────────────────────────────────────────────────────
// G1 · STATUS HISTORY — one document's events, read from the audit sink
// (Design 5 §B.2, the "Status history" tab).
//
// ⚠️ **REAL, NOT AUTHORED.** Every row is a `TransitionEvent` the dispatcher
// emitted, found by `subject` (C3 — the field G1 added so an event names its
// document). Nothing here is written or inferred: a document seeded from a
// fixture has NO events, and the tab says exactly that rather than drawing the
// guide's worked sequence as if it had happened. The worked sequence is shown
// beside it, labelled as the guide's.
//
// ⚠️ **GROUPED THE DR-10 WAY.** A cascade carries the source command's
// correlationId as its `causationId`, so the group key is
// `causationId ?? correlationId`: an act and everything it fanned out to read
// as one group — including a cascaded act on ANOTHER document, which is how the
// reader learns that this document's act moved something else.
// ────────────────────────────────────────────────────────────────────────────

import type { TransitionEvent } from '../../services/transitions/events';

export interface HistoryRow {
  readonly event: TransitionEvent;
  /** True when the row is about ANOTHER document, pulled in because this one's act caused it. */
  readonly elsewhere: boolean;
}

export interface HistoryGroup {
  /** The correlationId of the act that opened the group. */
  readonly anchor: string;
  readonly rows: readonly HistoryRow[];
}

const isAbout = (e: TransitionEvent, entity: string, entityId: string) =>
  e.subject?.entity === entity && e.subject.entityId === entityId;

/** The document's events, oldest first, grouped by causation. */
export function historyFor(
  events: readonly TransitionEvent[],
  entity: string,
  entityId: string,
): readonly HistoryGroup[] {
  const own = events.filter((e) => isAbout(e, entity, entityId));
  const anchors = new Set(own.map((e) => e.causationId ?? e.correlationId));
  const groups = new Map<string, HistoryRow[]>();
  for (const e of events) {
    const anchor = e.causationId ?? e.correlationId;
    if (!anchors.has(anchor)) continue;
    const rows = groups.get(anchor) ?? [];
    rows.push({ event: e, elsewhere: !isAbout(e, entity, entityId) });
    groups.set(anchor, rows);
  }
  return [...groups.entries()].map(([anchor, rows]) => ({ anchor, rows }));
}

/** Every document of `entity` the sink has an event about — the picker's live half. */
export function documentsWithEvents(events: readonly TransitionEvent[], entity: string): readonly string[] {
  return [...new Set(events.filter((e) => e.subject?.entity === entity).map((e) => e.subject!.entityId))];
}
