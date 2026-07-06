// ────────────────────────────────────────────────────────────────────────────
// Event taxonomy (v2.2 Step 3.8) — ONE shape across dispatcher + AuditSink.
//
// The dispatcher emits a TransitionEvent on EVERY command outcome (done /
// submitted / failed). The Phase-5′ CMVE AuditSink persists the SAME shape, so
// there is no retrofit — the sink interface is the contract. Coordinated with
// Track R (DR-10).
// ────────────────────────────────────────────────────────────────────────────

import type { QueryScope } from '../data/types';
import type { CommandOutcome } from '../data/types';

/** The single audit/telemetry event shape (DR-10). */
export interface TransitionEvent {
  /** The transition id that fired (e.g. `t_po_confirm`). */
  readonly event: string;
  /** Who acted — `personaType:supplierId` (or `buyer:all`). */
  readonly actor: string;
  /** The scope the command ran under. */
  readonly scope: QueryScope;
  /** Correlates the event with the command result / status. */
  readonly correlationId: string;
  /** How it resolved. */
  readonly outcome: CommandOutcome;
  /** ISO timestamp (supplied by the caller — no clock reads inside pure code). */
  readonly ts: string;
}

/** Stable actor key for an event. Mirrors the query-layer scopeKey format. */
export function actorKey(scope: QueryScope): string {
  return `${scope.personaType}:${scope.supplierId ?? 'all'}`;
}

/** Where transition events are persisted. CMVE implements this in Phase 5′. */
export interface AuditSink {
  emit(event: TransitionEvent): void;
}

/** Dev/mock sink: keeps events in memory for inspection and tests. */
export class InMemoryAuditSink implements AuditSink {
  private events: TransitionEvent[] = [];

  emit(event: TransitionEvent): void {
    this.events.push(event);
  }

  /** All events, oldest first. */
  all(): readonly TransitionEvent[] {
    return [...this.events];
  }

  /** Events for a given transition id. */
  byEvent(id: string): readonly TransitionEvent[] {
    return this.events.filter((e) => e.event === id);
  }

  clear(): void {
    this.events = [];
  }
}
