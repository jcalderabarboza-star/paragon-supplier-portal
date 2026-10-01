---
entity: compliance
locale: en
title: Certificate compliance
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_compliance_submit
  - t_compliance_verify
  - t_compliance_reject
---

<!-- section:summary -->
## 1 · What this process is

Whether a supplier holds the certificates a material actually requires — halal, BPOM and the rest — and where each requirement stands today. The unit is one cell of a requirement grid: supplier × material × certificate. A cell is born **Missing** with no creation step (the requirement matrix implies it), goes **Under Review** when the supplier submits a certificate, and ends **Valid** when the check stands up — or falls back to Missing when it does not. The supplier's admin lane (`back_office`) holds the submit atom; the buyer's compliance lane holds verify and reject.

**This process is modelled but not active, and it is ruled for retirement.** The flow file calls itself *"INERT: NO CommandTarget, no cascade — dispatching any verb fails at target-resolution."* Verify and reject are declared unsurfaced on purpose: *"I3.1 models verification as the pipeline behind the compliance registry, not as an operator screen."* The fact pack records the ruling that the machine is retired in favour of **supplier documents** — the one compliance process that really dispatches (`t_supplierdoc_*`, on `/buyer/compliance` and `/supplier/documents`). The text of that ruling is not in the export; only the fact-pack sentence is measured.

What the portal shows today: `/buyer/compliance` (**Compliance Tracker**) renders a **projection** of the compliance registry — sixteen synthetic rows whose display status (**Expiring**, **Expired**) and days remaining are computed at read from the expiry date, never stored. The page is marked **Sample — awaiting Track-R harvest**, states the BPJPH regulatory date (17 Oct 2026) as an external fact, and offers verify / refuse buttons — but those act on **supplier documents**, not on this machine. The registry is also read by the receipt gate inside the goods-receipt wizard, which renders a certificate notice; it tells, it does not stop.

<!-- src: src/services/transitions/flows/compliance.flow.ts:1-29,63-70; _derived/surfaces.md:37-39; src/pages-v2/BuyerCompliance.tsx:159,340-344,448,616-642; src/services/data/complianceProjection.ts:50,66-76; src/components/v2-features/GRInspectionWizard.tsx:848; src/lib/i18n/widget.ts:22 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| — | (born) Missing | born-state, no creation verb | — | — |
| 1 | Missing → Under Review | operator action · modelled, not active (no target) | supplier · back_office | `t_compliance_submit` |
| 2a | Under Review → Valid (terminal) | system-driven · modelled, not active (no target) | automation (compliance atom) | `t_compliance_verify` |
| 2b | Under Review → Missing | system-driven · modelled, not active (no target) | automation (compliance atom) | `t_compliance_reject` |

**Forks**

- **At Under Review:** `t_compliance_verify` — verification pipeline — when the certificate stands up; `t_compliance_reject` — verification pipeline — when it does not satisfy the requirement, returning the cell to Missing for a fresh submission.

Expiring and Expired are not exits from Valid: the flow says *"Expiry is a read-time projection (law 0.5), never an edge out of Valid."*

<!-- src: src/services/transitions/flows/compliance.flow.ts:36-40; src/services/transitions/looseEndCensus.ts:181-191 -->

<!-- section:steps -->
## 3 · Step by step

### t_compliance_submit — The supplier provides the certificate <!-- transition:t_compliance_submit -->

- **Step kind:** operator action · modelled, not active (no target)
- **Role:** supplier · back_office (atom `compliance:submit`)
- **From → to:** Missing → Under Review
- **Operator — where:** not offered anywhere today. The flow marks this verb surfaceable, but no screen fires it and no target could receive it. What a supplier can do today is declare and submit a **supplier document** on `/supplier/documents` (`t_supplierdoc_declare` / `t_supplierdoc_submit`).
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Under Review — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_compliance_submit` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** the fixture holds two cells stored Missing (`creg-0013`, `creg-0006`) and nothing can move them.
<!-- src: src/services/transitions/flows/compliance.flow.ts:43-53; _derived/surfaces.md:38-39; src/services/data/mock/fixtures/complianceRegistry.ts:279-289,315-325 -->

### t_compliance_verify — The certificate stands up <!-- transition:t_compliance_verify -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `compliance:verify`, in the compliance lane)
- **From → to:** Under Review → Valid (terminal)
- **Operator — where:** nobody presses this in the portal. The **Confirm** button in the *Declared certificates awaiting review* queue on `/buyer/compliance` dispatches `t_supplierdoc_verify` on a supplier document — a different machine.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Valid — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_compliance_verify` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"I3.1 models verification as the pipeline behind the compliance registry, not as an operator screen. Flips when Track R rules its operator lane, not when somebody finds time to build it."*
<!-- src: src/services/transitions/flows/compliance.flow.ts:55-72; src/pages-v2/BuyerCompliance.tsx:616-625; src/lib/i18n/compliance.ts:103,116 -->

### t_compliance_reject — The certificate does not satisfy the requirement <!-- transition:t_compliance_reject -->

- **Step kind:** system-driven · modelled, not active (no target)
- **Role:** automation (atom `compliance:reject`, in the compliance lane)
- **From → to:** Under Review → Missing
- **Operator — where:** nobody presses this in the portal. The **Refuse** / **Record refusal** buttons in the same queue dispatch `t_supplierdoc_reject` with a written reason the supplier reads word for word — again the supplier-document machine.
- **Operator — do:** nothing in the portal — the step is modelled, not active.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Missing — not reachable; no dispatch path.
- **Tester — confirm:** nothing to confirm; the machine state is not rendered.
- **Tester — trigger event:** `t_compliance_reject` (never emitted)
- **Checks that can refuse:** none declared; the dispatcher would answer `UNKNOWN_ENTITY` before any check ran.
- **Glossary:** `UNKNOWN_ENTITY`.
- **Honesty:** *"I3.1 models verification as the pipeline behind the compliance registry, not as an operator screen."* Two fixture cells sit Under Review (`creg-0009`, `creg-0004`) and nothing can resolve them.
<!-- src: src/services/transitions/flows/compliance.flow.ts:74-90; src/pages-v2/BuyerCompliance.tsx:633-642,681-698; src/lib/i18n/compliance.ts:117-119; src/services/data/mock/fixtures/complianceRegistry.ts:173-183,209-219 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Verify or reject (at Under Review).** `t_compliance_verify` — **When:** the pipeline confirms the certificate. `t_compliance_reject` — **When:** it does not cover the requirement; the cell returns to Missing and the supplier submits again. Neither can happen today.
- **Expiry (not a path).** A Valid cell reads **Expiring** inside 90 days of its expiry date and **Expired** past it; a cell with no expiry date (a BPJPH certificate has permanent validity) stays Valid. A MUI-legacy halal certificate additionally stops being scheme-valid from the BPJPH mandate date even while its own dates read Valid.
<!-- src: src/services/data/complianceProjection.ts:29,50,66-76,84-104 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Expiring · Expired | time-driven, derived at read | Valid | days to `expiryDate` ≤ 90, or negative, at the declared present (31 Aug 2026) | `/buyer/compliance` pills, KPIs and status filter |
| Sample — awaiting Track-R harvest | external / provenance (SIMULATED) | whole page | always — `compliance` has no wired target and is harvest-gated; green is structurally unreachable | `/buyer/compliance` liveness pill and readiness banner |
<!-- src: src/services/data/complianceProjection.ts:29,66-76; src/pages-v2/BuyerCompliance.tsx:445-467; src/services/liveness/registry.ts:144-149; src/lib/i18n/compliance.ts:30-32 -->

<!-- section:linked -->
## 6 · Linked objects

**What the portal reads today:** `COMPLIANCE_REGISTRY` through `useComplianceRegistry()`, projected at read. Representative cell: `creg-0001` — supplier `sup-007`, material `FR-ROUD-4470`, type `HALAL_BPJPH`, certificate number `SAMPLE-HALAL-0007A`, issuer *BPJPH (illustrative)*, no expiry (permanent basis), stored `lifecycleState` Valid. The fixture's own header is the honesty statement: the supplier and the material are real platform rows; **which supplier holds which certificate is invented**, every number is a `SAMPLE-…` token and no real certifying body is named.

| Joins to | By | Note |
|---|---|---|
| Supplier | `supplierId` / `supplierName` | taken verbatim from the supplier roster; tenancy-scoped read |
| Material | `materialCodes[]` | real `MATERIAL_MASTER` codes the supplier actually transacts |
| Certificate type | `certType` | one of HALAL_BPJPH · HALAL_MUI_LEGACY · HALAL_FOREIGN · BPOM · ISO · OTHER (glossary) |
| SAP sync | `sapSync` | a stored fact, shown so a reader learns there is no transport yet |
| Goods receipt | `verifyHalalAtReceipt` in the GR wizard | the gate reads the same registry and renders a notice; it does not refuse a receipt |
| Supplier documents | none by field | the review queue on the same page is a different machine (`supplierDocument`) |
<!-- src: src/services/data/mock/fixtures/complianceRegistry.ts:1-60,100-118; src/lib/glossary/governance.glossary.ts:159-183; src/pages-v2/BuyerCompliance.tsx:159,905-921; src/components/v2-features/GRInspectionWizard.tsx:848 -->

<!-- section:history -->
## 7 · Status history

There is none. Nothing dispatches a compliance verb — the entity has no command target, so a dispatch naming `compliance` is refused as `UNKNOWN_ENTITY` before an event exists. The *last refreshed* date on the page is the declared present, not an event time.

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| — | — | — | nothing dispatches | no events exist |
<!-- src: src/services/transitions/dispatcher.ts:548; src/services/transitions/flows/compliance.flow.ts:25-26 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| A button appears to offer one of these steps | **Confirm** / **Refuse** sit in the *Declared certificates awaiting review* queue; **Remind** on a Valid row opens a toast saying reminders are not wired | the registry table is a read-only projection; the queue's buttons act on supplier documents, not on this machine, and the act of verifying a registry cell belongs to the pipeline Track R has not yet ruled | verify or refuse the supplier document instead; the registry itself changes only when the Track-R harvest lands |
| — (cannot occur yet) | `MODULE_INACTIVE:CMP` | this flow has no command target, so a hand-crafted dispatch is refused `UNKNOWN_ENTITY` before the module check runs; once it is wired, switching off the Compliance & documents module refuses every verb by this name | nothing to do today; the module switch is at `/buyer/platform/modules/admin` |
<!-- src: src/pages-v2/BuyerCompliance.tsx:616-642,946-960; src/lib/i18n/compliance.ts:116-119,146-150 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| all | — | — | no fixture — modelled, not active. The sixteen `creg-*` rows on `/buyer/compliance` are a synthetic registry no machine state governs (`creg-0013` and `creg-0006` stored Missing, `creg-0009` and `creg-0004` Under Review, the rest Valid); none can be moved. |
<!-- src: src/services/data/mock/fixtures/complianceRegistry.ts:102-376; _derived/guidefacts.json (compliance.fixtures = "no store") -->
