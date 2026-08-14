// ────────────────────────────────────────────────────────────────────────────
// Event taxonomy (v2.2 Step 3.8) — ONE shape across dispatcher + AuditSink.
//
// The dispatcher emits a TransitionEvent on EVERY command outcome (done /
// submitted / failed). The Phase-5′ CMVE AuditSink persists the SAME shape, so
// there is no retrofit — the sink interface is the contract. Coordinated with
// Track R (DR-10).
//
// ⚠️ **THAT SENTENCE WAS FALSE FOR THE LIFE OF THE SEAM, AND FALSE ON THE
// SUCCESS PATH (§43).** A `sapBoundary` verb resolves `submitted` and settles
// later; the settlement flips the recorded status to `done` — an OUTCOME — and
// `settle()` never called `sink.emit`. `deps.sink.emit` appeared exactly once in
// the whole dispatcher, inside `finish()`. So the ledger held the `submitted`
// and never the `done`, and eight fixture documents rest in a `settlesTo` state
// (3 GRs `Posted to SAP`, 5 invoices `Payment Released`) that no recorded event
// accounts for. **The ledger could not tell a settled document from a seeded
// one** — if a real settlement had produced all eight it would look identical.
// The settlement is now a distinct event under the SAME correlationId, which is
// what makes the sentence above true rather than intended.
// ────────────────────────────────────────────────────────────────────────────

import type { QueryScope } from '../data/types';
import type { CommandOutcome, CommandDecision } from '../data/types';

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
  /**
   * The correlationId of the SOURCE command that caused this one, present only
   * when this transition was fired by a cascade fan-out (DR-10). Absent on a
   * directly-initiated command. Lets a 1→N cascade (RFQ award → the winning +
   * losing quotations) be reassembled as ONE correlatable group WITHOUT
   * collapsing the per-transition correlationId — `getCommandStatus` stays 1:1,
   * so each cascaded transition remains individually queryable / settleable.
   */
  readonly causationId?: string;
  /** How it resolved. */
  readonly outcome: CommandOutcome;
  /**
   * WHY it resolved that way, on a `failed` outcome — the same wire value as
   * `CommandResult.reason`: `PREFIX` or `PREFIX:detail`, decoded back to its
   * closed kind by `refusalKindOf` (the dispatcher's nine) or
   * `settleFaultKindOf` (the settle boundary's three).
   *
   * ⚠️ **ADDED AT §43, AND ITS ABSENCE WAS LOAD-BEARING.** Until this field
   * existed, `CommandResult` carried the reason and the EVENT did not — so a
   * failure whose result nobody keeps left a record saying only THAT it failed.
   * The cascade fan-out discards every `CommandResult` it produces
   * (`dispatcher.ts:329`), which is precisely the population the DR-10 ledger is
   * for. Absent on `done` / `submitted`.
   */
  readonly reason?: string;
  /** ISO timestamp (supplied by the caller — no clock reads inside pure code). */
  readonly ts: string;
  /**
   * Governed-decision provenance (C6-LOCK — G1.2b). Present only when the
   * command carried a human override; the dispatcher forwards `CommandInput.
   * decision` here VERBATIM (opaque — never interpreted, exactly as `causationId`
   * is). This is how the DR-10 audit records suggestedQty→acceptedQty + reason +
   * wasAdjusted alongside the actor + ts it already carries.
   */
  readonly decision?: CommandDecision;
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
