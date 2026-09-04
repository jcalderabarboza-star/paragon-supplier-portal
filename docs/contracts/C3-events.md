# C3 — Events

One event shape across the whole command layer (DR-10). The dispatcher emits a `TransitionEvent`
on **every** command outcome; the durable audit sink persists the **same** shape, so there is no
retrofit — the sink interface *is* the contract.

Source of truth: `src/services/transitions/events.ts`, `src/services/transitions/dispatcher.ts`.

---

## The single event shape — `TransitionEvent` · **LIVE (in-memory)**

```ts
interface TransitionEvent {
  readonly event: string;          // the transition id that fired, e.g. 't_po_confirm'
  readonly actor: string;          // who acted — `personaType:supplierId` (or `buyer:all`)
  readonly scope: QueryScope;      // the scope the command ran under
  readonly correlationId: string;  // correlates this event with its command result / status
  readonly causationId?: string;   // set ONLY on a cascaded transition (see grouping below)
  readonly outcome: CommandOutcome;// 'done' | 'submitted' | 'failed'
  readonly ts: string;             // ISO timestamp — SUPPLIED by the caller (no clock in pure code)
}
```

**Every outcome is an event.** A successful apply (`done`), a SAP-boundary submit (`submitted`),
and a domain rejection (`failed`, with its reason on the `CommandResult`) all emit — so the audit
trail is complete, including refusals. `actorKey(scope)` produces the stable `actor` string and
mirrors the query-layer `scopeKey` format.

`ts` is **caller-supplied**, never read inside the pure dispatcher — same discipline as the
read-projection clock injection (C2). In the mock it is `() => new Date().toISOString()`; the real
adapter supplies its own clock.

---

## The sink seam — `AuditSink` · **LIVE (in-memory) / durable RESERVED**

```ts
interface AuditSink {
  emit(event: TransitionEvent): void;
}
```

- **LIVE:** `InMemoryAuditSink` — keeps events in memory for inspection and tests
  (`all()` / `byEvent(id)` / `clear()`). The process-wide instance is `commandAuditSink`
  (`MockCommandService.ts`), injected into the dispatcher as `deps.sink`.
- **RESERVED:** the durable persistent sink. The comment in `events.ts` names it "CMVE implements
  this in Phase 5′" — because it implements the **same** `AuditSink` interface, landing it is
  additive: the dispatcher, the event shape, and every emit site are unchanged.

---

## Correlation / causation grouping (DR-10)

Two ids, two jobs. This is what lets a **1→N cascade** be reassembled as one correlatable group
**without** collapsing the per-transition status.

- **`correlationId`** — minted per command (`nextCorrelationId()`; the mock uses a monotonic
  `cmd_0001`… so tests are deterministic). `getCommandStatus(scope, correlationId)` and
  `settle(scope, correlationId)` are **1:1** with it. Every cascaded transition keeps **its own**
  correlationId, so each remains individually queryable and settleable — **by a scope entitled
  to it.** The dense monotonic id is guessable by construction and is printed to the user in
  every success toast, so both methods gate on the issuing tenancy (or the `automation` machine
  grant, which is what the Phase-3 settlement webhook presents) and answer everyone else with
  `null` — never a refusal, which would be an existence oracle by refusal kind. The scope
  parameter is NOT new on `ICommandService`; it is new on the internal `Dispatcher`, which had
  nowhere to put the one the seam already handed it.
- **`causationId`** — present **only** on a cascaded (fanned-out) transition; it carries the
  **source command's** correlationId. Absent on a directly-initiated command.

So a cascade fan-out emits N child events, each with its own `correlationId` **and** a shared
`causationId` = the source's `correlationId`. Grouping by `causationId` reassembles the whole
fan-out; the per-child `correlationId` keeps each child's status independent (DR-10, "Option A").

### Worked example — RFQ award (the 1→N cascade)

`t_rfq_award` (source) fans out to the RFQ's quotation siblings: the winner fires
`t_quotation_award` (→ Awarded), every other sibling fires `t_quotation_reject` (→ Rejected)
(`MockCommandService.ts` `resolveCascades`, `rfq` branch). Each quotation transition:

- gets its **own** `correlationId` (independently settleable),
- carries `causationId` = the award command's `correlationId` (groups the fan-out).

The dispatcher runs cascades **post-apply, best-effort**: a sibling already terminal simply no-ops
(illegal transition) and never breaks the source award. Same discipline for GR-post → invoice-match
(fires the header `t_invoice_match` only on a genuine `Matched` verdict; a variance verdict writes
the truthful `matchStatus` and honestly no-ops) and GR-reject/partial → ASN-discrepancy.

---

## Contract guarantee for the SE-Team

The event taxonomy is **frozen at one shape**. When the durable sink lands (RESERVED → LIVE) and
when the remaining flows wire their CommandTargets (FORK-2), **no new event type is introduced** —
they emit the same `TransitionEvent`. Analytics, audit, and observability build once against this
shape. The only forward-add is durability of the sink, not a change to what is emitted.
