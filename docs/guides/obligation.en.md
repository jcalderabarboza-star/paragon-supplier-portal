---
entity: obligation
locale: en
title: Contract obligation
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_obligation_track
  - t_obligation_complete
---

<!-- section:summary -->
## 1 · What this process is

A promise written into an agreement — a volume, a rebate, a service level — tracked so somebody notices whether it was actually kept. An obligation follows its contract: it is opened against a contract id and lives in one working state, **In Progress**, until it is marked **Completed**. That is the whole machine: two states, one edge. Procurement holds both atoms.

**This process is modelled but not active.** Unlike the contract it hangs off, neither verb is declared an external fact — the flow says both are surfaceable and names no outside owner — but there is no command target behind `obligation`, so `t_obligation_track` and `t_obligation_complete` cannot fire and nothing in the product writes a completion. The obligation is a rollup of the contract substrate: it is read wherever its contract is read, and it is not a thing anybody in the portal can act on today. The rollup module says so directly: *"`obligation` has no CommandTarget, so `t_obligation_complete` cannot fire and nothing in the product writes `completedDate`. The counters are honest about the store; the store is still fixture-only."*

What the portal shows today: on `/buyer/contracts`, opening a contract lists its obligations with a title, owner (Buyer / Supplier / Both), due date and a computed display state, and the panel heading counts **N of M met** from `completedDate`. The display states a reader sees are **Upcoming**, **Overdue** and **Completed**, derived at read; the machine's own **In Progress** is deliberately not rendered, because no stored field records that work began. The **Overdue Obligations** KPI on the same page is the same derivation folded across all contracts.

<!-- src: src/services/transitions/flows/obligation.flow.ts:1-12; src/services/data/obligationRollup.ts:81-86; src/services/data/obligationProjection.ts:23-42,144-200; src/pages-v2/BuyerContracts.tsx:41,1261; src/lib/i18n/contracts.ts:119-128 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → In Progress | creation · modelled, not active (no target) | procurement | `t_obligation_track` |
| 2 | In Progress → Completed (terminal) | operator action · modelled, not active (no target) | procurement | `t_obligation_complete` |

**Forks**

- None. One state has one exit. What looks like a fork on the page — Upcoming against Overdue — is the clock reading the due date of an In Progress row, not a branch of the machine.

<!-- src: src/services/transitions/flows/obligation.flow.ts:141-144; src/services/data/obligationProjection.ts:188-200 -->

<!-- section:steps -->
## 3 · Step by step

### t_obligation_track — Start watching one commitment <!-- transition:t_obligation_track -->

- **Step kind:** creation · modelled, not active (no target)
- **Role:** procurement (atom `obligation:track`)
- **From → to:** ∅ → In Progress
- **Operator — where:** not offered anywhere today. The **New Contract** walkthrough on `/buyer/contracts` has an **Obligations** step that collects suggested or custom obligations, but the walkthrough ends without creating anything (see the contract guide).
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** the flow requires a contract id; nothing in the portal supplies one to a dispatcher.
- **Tester — expected state:** In Progress — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_obligation_track` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** the verb records that an obligation exists, never that work began; the projection module measured that wiring this target alone would not give the page a real **In Progress** to show, because every fixture row without a completion date is In Progress by construction.
<!-- src: src/services/transitions/flows/obligation.flow.ts:147-156; src/services/data/obligationProjection.ts:73-100; src/lib/i18n/contracts.ts:190-191,235-246 -->

### t_obligation_complete — The commitment was met <!-- transition:t_obligation_complete -->

- **Step kind:** operator action · modelled, not active (no target)
- **Role:** procurement (atom `obligation:complete`)
- **From → to:** In Progress → Completed (terminal)
- **Operator — where:** not offered anywhere today. No control on `/buyer/contracts` or `/buyer/contracts/:id` marks an obligation complete; the rows a reader sees as **Completed** carry an authored `completedDate` in the fixture.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Completed — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_obligation_complete` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** nothing in the product writes `completedDate`; the **N of M met** counter is honest about a store that is fixture-only.
<!-- src: src/services/transitions/flows/obligation.flow.ts:158-167; src/services/data/obligationRollup.ts:81-86; src/data/mockObligations.ts:74-82 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **None in the machine.** There is no dispute, waive or cancel edge; an obligation is either still open or met. The exception a reader sees is **Overdue** — an In Progress row whose due date has passed without a completion date — and it is derived at read, not a state anything enters.
<!-- src: src/services/transitions/flows/obligation.flow.ts:126-133; src/services/data/obligationProjection.ts:188-200 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Overdue | time-driven, derived at read | In Progress (no `completedDate`) | due date before the declared present (31 Aug 2026) | contract side panel row pill; **Overdue Obligations** KPI on `/buyer/contracts` |
| Upcoming | time-driven, derived at read | In Progress (no `completedDate`) | due date on or after the declared present | contract side panel row pill |
<!-- src: src/services/data/obligationProjection.ts:182-200; src/pages-v2/BuyerContracts.tsx:1261; src/lib/i18n/contracts.ts:33-34 -->

<!-- section:linked -->
## 6 · Linked objects

**What the portal reads today:** the `mockObligations` fixture through `useObligations()`, always in the context of a contract. Representative row: `obl-001a` (*Submit BPJPH halal certificate renewal*, contract `ctr-001`, owner Supplier, recurrence Annual). No machine state governs these rows: the stored `status` literal is kept only as the oracle the projection is tested against, and it is not what the page renders.

| Joins to | By | Note |
|---|---|---|
| Contract | `contractId` | the parent; an obligation is only ever listed under its contract |
| Completion | `completedDate` | the one fact **Completed** is read from; display-only, nothing writes it |
| Owner | `owner` (Buyer / Supplier / Both) | display-only |
| Category · recurrence | `category`, `recurrence` | display-only |

Obligation dates share the contract family's anchor (`SHARED_CONTRACT_ANCHOR`, 2026-05-24), so an obligation and its contract are never compared across two clocks.
<!-- src: src/data/mockObligations.ts:25-49; src/services/data/obligationProjection.ts:126-133; src/services/data/fixturePresent.ts:267,403 -->

<!-- section:history -->
## 7 · Status history

There is none. Nothing dispatches an obligation verb — the entity has no command target, so a dispatch naming `obligation` is refused as `UNKNOWN_ENTITY` before an event exists.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| — | — | — | nothing dispatches | no events exist |
<!-- src: src/services/transitions/dispatcher.ts:548 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| An obligation row appears to offer completion, or a KPI suggests one can be cleared | the row shows a pill and a due date only; there is no button on it | it is a read-only view: obligations are a rollup of fixture contract data and no verb is wired to mark one met | nothing to resolve in the portal; the obligation follows its contract, and the contract is S/4HANA's |
| — (cannot occur yet) | `MODULE_INACTIVE:CTR` | this flow has no command target, so a hand-crafted dispatch is refused `UNKNOWN_ENTITY` before the module check runs; once it is wired, switching off the Contracts & delivery agreements module refuses every verb by this name | nothing to do today; the module switch is at `/buyer/platform/modules/admin` |
<!-- src: src/services/data/obligationRollup.ts:81-86; src/pages-v2/BuyerContracts.tsx:1261 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| all | — | — | no fixture — modelled, not active. The rows under each contract on `/buyer/contracts` are display fixtures (`obl-001a` and its siblings) that no machine state governs; none can be moved. |
<!-- src: src/data/mockObligations.ts:39-49; _derived/guidefacts.json (obligation.fixtures = "no store") -->
