---
entity: contract
locale: en
title: Contract
wired: false
owner: s4hana
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_contract_draft
  - t_contract_activate
  - t_contract_renew
  - t_contract_terminate
---

<!-- section:summary -->
## 1 · What this process is

The standing agreement a supplier is bought from — the prices, volumes and terms that orders inherit rather than renegotiate each time. A contract is drafted, put into force, optionally renewed for a further period, and ended; termination is reachable from every non-terminal state. Procurement is the lane that holds every contract atom.

**This process is modelled but not active.** All four steps are external facts owned by S/4HANA, by operator ruling. The flow file says why: *"An outline agreement is an SAP document exactly as a purchase order is, and this flow used to declare all four verbs surfaced — a standing promise that Paragon drafts, activates, renews and terminates contracts. It does not, and `BuyerContracts` has never dispatched one: the page reads fixtures and there is no CommandTarget behind it."* Nobody in the portal can move a contract between these states, and no event is ever written for one.

What the portal shows today: `/buyer/contracts` (**Contract Management**) reads a fixture of thirteen contracts plus their obligations, with computed expiry (**Expiring** / **Expired** are derived at read from the end date and the contract's own notice period, never stored), a renewal pipeline and a detail page at `/buyer/contracts/:id`. The page carries a **Sample data** provenance marker because the `contracts` capability is null-backed. The **New Contract** wizard collects a request and ends in a panel headed **No contract was created**, naming S/4HANA as the owner — it no longer mints a client-side contract number; that fabrication has been retired from the page.

<!-- src: src/services/transitions/flows/contract.flow.ts:1-32; src/pages-v2/BuyerContracts.tsx:41,580-620,1376,1629; src/services/liveness/registry.ts:221; src/services/data/contractExpiry.ts:119-133; _derived/surfaces.md:30,55 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | external fact (S/4HANA) · creation | procurement holds the atom; S/4HANA performs the act | `t_contract_draft` |
| 2 | Draft → Active | external fact (S/4HANA) | procurement / S/4HANA | `t_contract_activate` |
| 3 | Active → Renewed | external fact (S/4HANA) | procurement / S/4HANA | `t_contract_renew` |
| 4 | Draft, Active, Renewed → Terminated (terminal) | external fact (S/4HANA) | procurement / S/4HANA | `t_contract_terminate` |

**Forks**

- **At Draft:** `t_contract_activate` — S/4HANA — when the agreement is put into force; `t_contract_terminate` — S/4HANA — when it is abandoned before it binds.
- **At Active:** `t_contract_renew` — S/4HANA — when a further validity period is granted; `t_contract_terminate` — S/4HANA — when it ends at or before term.
- **At Renewed:** `t_contract_terminate` only — there is no second renewal edge and no re-activate strand.

<!-- src: src/services/transitions/flows/contract.flow.ts:39-42,101-105 -->

<!-- section:steps -->
## 3 · Step by step

### t_contract_draft — Terms begin to be set out <!-- transition:t_contract_draft -->

- **Step kind:** external fact (S/4HANA) · creation · modelled, not active (no target)
- **Role:** procurement (atom `contract:draft`); the act is S/4HANA's
- **From → to:** ∅ → Draft
- **Operator — where:** nobody presses this in the portal. `/buyer/contracts` → **New Contract** opens a walkthrough gated on `contract:draft` (a seat without it sees a handoff notice); the last step ends in **No contract was created** — *"an outline agreement is raised in S/4HANA and arrives in Paragon as a fact."*
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** the flow requires a supplier id and a title; the walkthrough collects them and records nothing.
- **Tester — expected state:** Draft — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_contract_draft` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"An outline agreement is created in S/4HANA, which owns the contract document. Paragon receives it and collaborates around it; it is never where the agreement is raised."* The wizard used to mint `CTR-<yr>-<n>` and a row client-side; that is gone.
<!-- src: src/services/transitions/flows/contract.flow.ts:45-62; src/pages-v2/BuyerContracts.tsx:444,580-620,1356; src/pages-v2/contracts/RaisedElsewhere.tsx:31-104; src/lib/i18n/contracts.ts:175-184 -->

### t_contract_activate — The terms take effect <!-- transition:t_contract_activate -->

- **Step kind:** external fact (S/4HANA) · modelled, not active (no target)
- **Role:** procurement (atom `contract:activate`); the act is S/4HANA's
- **From → to:** Draft → Active
- **Operator — where:** nobody presses this in the portal. The one fixture in Draft (`ctr-011`) can only be read.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Active — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_contract_activate` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"Activation is a status change on the S/4HANA outline agreement. The portal reads the outcome; nobody here puts a contract into force."*
<!-- src: src/services/transitions/flows/contract.flow.ts:64-81; src/data/mockContracts.ts:322-327 -->

### t_contract_renew — A further period <!-- transition:t_contract_renew -->

- **Step kind:** external fact (S/4HANA) · modelled, not active (no target)
- **Role:** procurement (atom `contract:renew`); the act is S/4HANA's
- **From → to:** Active → Renewed
- **Operator — where:** nobody presses this in the portal. The **Renewal Pipeline** on `/buyer/contracts` lists live contracts ending inside a 180-day horizon, grouped by month — a planning read, not a renewal act.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Renewed — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_contract_renew` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"A renewal extends the S/4HANA outline agreement — a new validity period on the SAP document. Paragon learns of it; it does not grant it."*
<!-- src: src/services/transitions/flows/contract.flow.ts:83-100; src/services/data/contractExpiry.ts:156-163; src/lib/i18n/contracts.ts:84-91 -->

### t_contract_terminate — The agreement ends <!-- transition:t_contract_terminate -->

- **Step kind:** external fact (S/4HANA) · modelled, not active (no target)
- **Role:** procurement (atom `contract:terminate`); the act is S/4HANA's
- **From → to:** Draft, Active, Renewed → Terminated (terminal)
- **Operator — where:** nobody presses this in the portal.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Terminated — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_contract_terminate` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"Termination is recorded against the S/4HANA outline agreement. The commercial decision may be taken here, but the act that ends the contract is SAP's."* A Terminated row is never re-labelled by the clock: only Active, Expiring and Renewed rows can read Expiring or Expired.
<!-- src: src/services/transitions/flows/contract.flow.ts:103-120; src/services/data/contractExpiry.ts:97-106 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Terminate (at Draft, Active, Renewed).** `t_contract_terminate` — **When:** S/4HANA records the end of the outline agreement, at its term or before it. It is the only exception path in the machine and it is not the portal's to take.
- **Renew or let lapse (at Active).** `t_contract_renew` — **When:** SAP grants a new validity period. Otherwise nothing moves; the clock only re-labels the row **Expiring** or **Expired** (see §5) without the machine state changing.
<!-- src: src/services/transitions/flows/contract.flow.ts:4-7; src/services/data/contractExpiry.ts:119-133 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Expiring | time-driven, derived at read | Active, Renewed | days to end date ≤ the contract's own `noticeRequiredDays` | `/buyer/contracts` pill, **Expiring** tab, **Expiring Soon** KPI |
| Expired | time-driven, derived at read | Active, Renewed | end date before the declared present (31 Aug 2026) | `/buyer/contracts` pill, **Expired** tab |
| Sample data · contracts | external / provenance | whole page | always — `contracts` is null-backed | `/buyer/contracts` meta line |
<!-- src: src/services/data/contractExpiry.ts:97-133; src/pages-v2/BuyerContracts.tsx:1376; src/services/liveness/registry.ts:221 -->

<!-- section:linked -->
## 6 · Linked objects

**What the portal reads today:** the `mockContracts` fixture through `useContracts()`, joined to `mockObligations` and `mockSuppliers`. These are fixture contracts that no machine state governs — the stored `status` is an authored literal using this flow's state names (Active, Renewed, Draft, Terminated), and the page adds Expiring / Expired at read. Representative row: `ctr-001` (`CTR-2026-001`, *Halal Emulsifier Master Supply Agreement 2026*, stored Active).

| Joins to | By | Note |
|---|---|---|
| Supplier | `supplierId` | name and country read from `useSuppliers()` |
| Obligations | `ContractObligation.contractId` | the panel lists them and computes **N of M met** from `completedDate`; no stored count remains |
| Delivery agreements | contract id, on `/buyer/contracts/:id` | the detail page's **Delivery Agreements** tab dispatches `deliveryRelease` verbs — a separate, wired process |
| Compliance documents | shown as *linked compliance documents* in the panel | display-only |
| Contract number | `contractNumber` | display-only; SAP owns contract identity and the page no longer generates one |

Contract and obligation dates share one anchor (`SHARED_CONTRACT_ANCHOR`, 2026-05-24) and are re-timed to the declared present.
<!-- src: src/data/mockContracts.ts:19-68,65-70; src/pages-v2/BuyerContracts.tsx:41,453,1261; src/services/data/obligationRollup.ts:107; src/pages-v2/BuyerContractDetail.tsx:329-358; src/services/data/fixturePresent.ts:267,391; _derived/surfaces.md:55-56 -->

<!-- section:history -->
## 7 · Status history

There is none. Nothing dispatches a contract verb — the entity has no command target, so a dispatch naming `contract` is refused as `UNKNOWN_ENTITY` before an event exists. The **Lifecycle** timeline in the side panel (Drafted · Negotiated · Signed · Active Period · Renewal Decision · Expiry / Renewal) is drawn from stored dates, not from events.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| — | — | — | nothing dispatches | no events exist |
<!-- src: src/services/transitions/dispatcher.ts:548; src/lib/i18n/contracts.ts:154-164 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| A button appears to offer one of these steps | **New Contract** opens a walkthrough; its last step reads **No contract was created** and *"nothing was sent, and nobody has been notified"* | it is a read-only page for the contract itself: drafting, activating, renewing and terminating an outline agreement are S/4HANA's acts | raise or change the agreement in S/4HANA; the portal reads the outcome when the F2 seam lands |
| — (cannot occur yet) | `MODULE_INACTIVE:CTR` | this flow has no command target, so a hand-crafted dispatch is refused `UNKNOWN_ENTITY` before the module check runs; once it is wired, switching off the Contracts & delivery agreements module refuses every verb by this name | nothing to do today; the module switch is at `/buyer/platform/modules/admin` |
<!-- src: src/pages-v2/BuyerContracts.tsx:580-620,1629; src/lib/i18n/contracts.ts:177-181 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| all | — | — | no fixture — modelled, not active. The contracts page shows fixture contracts (`ctr-001` … `ctr-013`) that no machine state governs: `ctr-011` is stored Draft, `ctr-010` Renewed, `ctr-012` Terminated, the rest Active; none can be moved. |
<!-- src: src/data/mockContracts.ts:65-381; _derived/guidefacts.json (contract.fixtures = "no store") -->
