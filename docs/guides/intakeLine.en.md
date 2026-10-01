---
entity: intakeLine
locale: en
title: Intake line (requirement triage)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_intake_dismiss
  - t_intake_restore
  - t_intake_commit
---

<!-- section:summary -->
## 1 · What this process is

A requirement that planning has proposed and nobody has ruled on yet — the queue where a planner decides which needs enter the buying workload and which are set aside. Each intake line is emitted by a producer, either SOMO or the internal planning grid (*Internal Grid*), and carries a material, a suggested quantity, the quantity the producer actually delivered, a planning period and the producer's reason (*Why (deficit)*). Paragon does not author the line; it only records what a planner decided about it.

One role decides. Every one of the three acts — set a line aside, bring it back, commit it — needs the `pr:create` permission, which sits in the **requisitioner** lane (the plain role word is planner or requisitioner). Dismissing is treated as exactly as consequential as committing, so there is no separate triage permission. A seat without it sees *"Awaiting Requisitioner"* instead of the buttons.

A line is born **Pending** — there is no creation step, because the producer already emitted it. From Pending a planner either **dismisses** it (→ **Dismissed**, which can be undone with **Restore**) or **commits** it (→ **Committed**, final). Committing is the only way a planned requirement becomes a real request: it automatically raises a Draft purchase requisition through `t_pr_create`, at most once per line. Changing the quantity first is not a separate step — it is part of the commit, and leaving the producer's delivered quantity requires a written reason.

Honest markers. The data is **SIMULATED**: both pages carry the pill *"Sample — awaiting live PR producer (SOMO / Grid)"*, and the four authored lines (plus the generated SOMO proposals behind the planning grid) are sample data — a committed line is never a live procurement instruction. Every act is recorded and survives a reload (the triage is kept in the browser under `paragon.intakeTriage`), but the requisition it raised lives in an in-memory store that a reload re-seeds, so after a reload a committed line can show *"Committed — its requisition is not in this session's store"*. No person is signed in, so the act is attributed to the seat, not to a named person. Nothing is told upstream: the producer is not informed of a dismissal.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:1-73; src/services/transitions/flows/intakeLine.flow.ts:82-86; src/services/transitions/flows/intakeLine.flow.ts:139; src/lib/i18n/processFlowPurpose.ts:227-235; src/services/transitions/businessRoles.ts:389-391; src/services/transitions/cascades.ts:75-77; src/services/data/mock/stores/intakeLineStore.ts:64; src/pages-v2/IntakeReview.tsx:66-89; src/lib/i18n/intakeReview.ts:17-18; src/lib/i18n/intakeReview.ts:46-47; src/lib/i18n/widget.ts:25; src/services/liveness/registry.ts:281-284; src/lib/i18n/roles.ts:31; src/lib/i18n/roles.ts:48 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Pending | the producer emits the line (no verb, no event) | — (SOMO / Internal Grid) | — |
| 1a | Pending → Dismissed | operator action | requisitioner | `t_intake_dismiss` |
| 1b | Dismissed → Pending | operator action | requisitioner | `t_intake_restore` |
| 2 | Pending → Committed | operator action; cascade source (fires `t_pr_create`) | requisitioner | `t_intake_commit` |

**Forks**

- **At Pending:** `t_intake_commit` — requisitioner — when the need should enter the buying workload, at the delivered quantity or at a changed quantity with a reason; `t_intake_dismiss` — requisitioner — when nobody should act on the line now.
- **At Dismissed:** `t_intake_restore` — requisitioner — the only way out; it returns the line to Pending. A dismissed line cannot be committed directly.
- **At Committed:** no exit. A changed mind belongs on the requisition, which has its own reject and revise steps.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:55-61; src/services/transitions/flows/intakeLine.flow.ts:124-197 -->

<!-- section:steps -->
## 3 · Step by step

### t_intake_dismiss — Dismiss a line <!-- transition:t_intake_dismiss -->

- **Step kind:** operator action
- **Role:** buyer · requisitioner (permission `pr:create`)
- **From → to:** Pending → Dismissed
- **Operator — where:** `/buyer/intake-review` (*Intake Review*) → a row whose *Triage* column shows the two buttons → **Dismiss**. Offered nowhere else — the plan grid has no dismiss control.
- **Operator — do:** set the requirement aside so nobody acts on it now. The line stays in the queue, dimmed, with a *Dismissed* chip, so a colleague opening the same queue sees that somebody already looked at it. The producer is not told.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Dismissed
- **Tester — confirm:** the row dims and its *Triage* cell shows *Dismissed* with a **Restore** button; the summary line under the header moves one from *pending* to *dismissed*; reload the page — the line is still dismissed. The *Provenance* column still reads *Planned*: setting a line aside decides nothing about the plan.
- **Tester — trigger event:** `t_intake_dismiss`
- **Checks that can refuse:** none beyond role, legality and module. The verb declares no fields and no rules.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `MODULE_INACTIVE`.
- **Honesty:** the dismissal is a recorded act (it survives a reload and is visible to the next seat in the same browser); it records only the state, never a reason. Only the four authored lines are listed on Intake Review, so the generated SOMO lines behind the planning grid cannot be dismissed from any screen.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:141-153; src/pages-v2/IntakeReview.tsx:107; src/pages-v2/IntakeReview.tsx:214-217; src/pages-v2/IntakeReview.tsx:277-321; src/pages-v2/intake-review/intakeReviewModel.ts:74-86; src/services/query/commandHooks.ts:1930-1946; src/services/data/mock/MockCommandService.ts:2618-2624; src/services/data/mock/stores/intakeLineStore.ts:224-271; src/services/data/intakeLineProjection.ts:38-46; src/lib/i18n/intakeReview.ts:12-13; src/lib/i18n/intakeReview.ts:38; src/lib/i18n/intakeReview.ts:48; src/services/planning/somoIntake.ts:25-27 -->

### t_intake_restore — Restore a dismissed line <!-- transition:t_intake_restore -->

- **Step kind:** operator action
- **Role:** buyer · requisitioner (permission `pr:create`)
- **From → to:** Dismissed → Pending
- **Operator — where:** `/buyer/intake-review` → a dimmed row showing *Dismissed* → **Restore**.
- **Operator — do:** bring a set-aside requirement back into the queue — a choice made in error should not be a dead end. It is the exact inverse of dismiss.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Pending
- **Tester — confirm:** the row is no longer dimmed and shows **Accept as delivered** and **Dismiss** again; the summary moves one from *dismissed* back to *pending*.
- **Tester — trigger event:** `t_intake_restore`
- **Checks that can refuse:** none beyond role, legality and module.
- **Glossary:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `MODULE_INACTIVE`.
- **Honesty:** the store keeps one record per line and replaces it in place; the history of dismiss → restore → dismiss lives only in the audit events, not on the line.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:154-165; src/pages-v2/IntakeReview.tsx:277-296; src/services/query/commandHooks.ts:1949-1965; src/services/data/mock/MockCommandService.ts:2618-2624; src/services/data/mock/stores/intakeLineStore.ts:261-271; src/lib/i18n/intakeReview.ts:39 -->

### t_intake_commit — Commit a line into the sourcing workload <!-- transition:t_intake_commit -->

- **Step kind:** operator action; cascade source (fires `t_pr_create` on the purchase requisition)
- **Role:** buyer · requisitioner (permission `pr:create`). The requisition it raises is created under the automation grant, which carries the same permission.
- **From → to:** Pending → Committed (and, by cascade, ∅ → Draft on a new purchase requisition)
- **Operator — where:** three entrances, all firing this one verb.
  1. `/buyer/intake-review` → a pending row → **Accept as delivered**. Commits the quantity the producer delivered; nothing is asked.
  2. `/buyer/plan-grid` → **Intake** tab → **Adjust** on a row → the *Adjust & push — selected line* section → edit *Accepted* if needed (and *Reason* when it differs) → **Push to PR**.
  3. `/buyer/plan-grid` → **Raw materials** or **Packaging** tab → type or paste an accepted quantity into a cell → the planned-changes panel above the grid → **Push** on the row, **Push selection (n)** or **Push all (n)**. These cells are the generated SOMO proposals; one commit is sent per row, grouped under one causation anchor.
- **Operator — do:** turn a proposed requirement into a real request for the buying team, at the figure you are willing to stand behind — and only once, so one need never becomes several requisitions. Accepting the delivered quantity carries no decision and needs no reason; changing it is your own decision and must say why.
- **Operator — fill:** the accepted quantity — digits only, no thousands separators (e.g. 4500). Required behind the scenes: the number and the exact text you typed, which the platform re-reads to make sure they agree. A **reason** is required only when the quantity differs from what the producer delivered (*"Reason required to push an override"*). On the grid, a planned change shows *"As delivered — no reason owed"* when it matches.
- **Tester — expected state:** Committed (and a new requisition in Draft)
- **Tester — confirm:** on Intake Review the *Triage* cell reads *"Committed → PR-2026-9xx"* and *Provenance* reads *Committed*; in the drawer the footer reads *"Pushed → PR-2026-9xx"* and the button is disabled; on a planning tab the cell reads committed and the planned change clears. On `/buyer/purchase-requisition` the new Draft shows *From intake line* = the line id, *Planning bucket* = the line's period, and — only if you changed the quantity — *Quantity override* with from → to and your reason. In the audit trail the `t_pr_create` event carries a `causationId` equal to this commit's `correlationId`.
- **Tester — trigger event:** `t_intake_commit`
- **Checks that can refuse:**
  - required fields `acceptedQty` and `acceptedQtyRaw` must be present (`MISSING_FIELDS`);
  - `intake_qty_floor` — the quantity must be a finite number above zero; a zero is a commitment to nothing, not a blank;
  - `intake_qty_agrees` — the typed text must read, through the platform's one quantity parser, exactly as the number being committed (this is what stops "4.500" being committed as 4.5); an ambiguous token is refused rather than guessed;
  - `intake_override_reasoned` — the committed quantity is compared with the producer's delivered quantity read from the line itself (never from the request); if they differ, a non-blank reason is required. A line that cannot be resolved is refused, not waved through;
  - legality: only a Pending line can be committed, so a second press, or a push of a dismissed line from the plan-grid drawer, is refused `ILLEGAL_TRANSITION`.
- **Glossary:** `MISSING_FIELDS`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`, `MODULE_INACTIVE`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Honesty:** the requisition is **SIMULATED** and never a live procurement instruction. The committed line is final — there is no un-commit. Two guards keep one line to at most one requisition: legality refuses a person pressing twice (and tells them), and the cascade's replay key (the line's own id) returns the first requisition to a repeated delivery instead of raising a second. The requisition number is not stored on the line; it is found by looking up the requisition that names the line, so after a reload (which re-seeds requisitions but keeps the triage) the line reads *"Committed — its requisition is not in this session's store"*.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:95-117; src/services/transitions/flows/intakeLine.flow.ts:166-197; src/services/transitions/policies.ts:1759-1894; src/services/transitions/cascades.ts:61-77; src/services/transitions/businessRoles.ts:613-632; src/services/data/mock/MockCommandService.ts:2625-2646; src/services/data/mock/MockCommandService.ts:2762-2808; src/services/data/mock/MockCommandService.ts:824-830; src/services/data/intakeLineProjection.ts:67-90; src/pages-v2/IntakeReview.tsx:140-141; src/pages-v2/IntakeReview.tsx:263-276; src/pages-v2/IntakeReview.tsx:297-309; src/pages-v2/intake-review/intakeReviewModel.ts:50-56; src/pages-v2/PlanGrid.tsx:202-216; src/pages-v2/PlanGrid.tsx:357-361; src/pages-v2/PlanGrid.tsx:457-468; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:112-161; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:262-280; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:296-318; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:105-123; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:169-203; src/pages-v2/plan-grid/planDraft.ts:321-380; src/services/planning/measures.ts:113-121; src/services/query/commandHooks.ts:1894-1927; src/pages-v2/BuyerRequisitions.tsx:1306-1358; src/lib/i18n/intakeReview.ts:36; src/lib/i18n/intakeReview.ts:45-47; src/lib/i18n/planGrid.ts:75-85; src/lib/i18n/planGrid.ts:100; src/lib/i18n/planGrid.ts:164-168; src/lib/i18n/planGrid.ts:196-198; src/lib/i18n/planGrid.ts:212; src/lib/i18n/requisitions.ts:143-149; src/services/planning/views.ts:35-47; src/services/planning/views.ts:70-101 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Commit or set aside (at Pending).** Branch A — `t_intake_commit` — **When:** the need should enter the buying workload. At the delivered quantity it carries no decision; at any other quantity a written reason is required and travels to the requisition as its *Quantity override*. Branch B — `t_intake_dismiss` — **When:** nobody should act on the line now; nothing is raised and nothing is told upstream.
- **A mistaken dismissal (at Dismissed).** `t_intake_restore` — **When:** the line was set aside in error or circumstances changed. It is the only exit from Dismissed; to commit a dismissed line, restore it first.
- **The producer already trimmed it (at Pending).** When the producer delivered less or more than it suggested (`pil-somo-002`: 5,000 suggested, 4,500 delivered; `pil-grid-002`: 80,000 suggested, 90,000 delivered), that change is the producer's own — shown under the quantity as *"{producer} adjusted {from} → {to}"* and never charged to the planner. The baseline for any reason is the delivered quantity, not the suggestion.
- **Committed is final.** There is no edge out of Committed. A changed mind is handled on the requisition (reject / revise there).
- **Refused commit.** Any refusal — returned or thrown — leaves the line Pending with the reason shown under the row (*"Refused: …"*, *"Push failed: …"*). On the planning tabs a change whose reason is owed and blank is not sent at all (*"Not pushed — a reason is required because the quantity differs from what the producer delivered."*).
- **Unpushed grid changes.** A planned change on the grid is not a fact: it lives in the page only and a reload drops it. Only a push records anything.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:35-53; src/services/transitions/flows/intakeLine.flow.ts:124-139; src/services/data/mock/fixtures/prIntake.ts:58-101; src/services/data/intakeLineProjection.ts:48-60; src/pages-v2/plan-grid/planDraft.ts:321-380; src/lib/i18n/planGrid.ts:58; src/lib/i18n/planGrid.ts:195; src/lib/i18n/planGrid.ts:225 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| SIMULATED — *"Sample — awaiting live PR producer (SOMO / Grid)"* | external (liveness registry) | all states | always, until a real intake producer lands | `/buyer/intake-review` and `/buyer/plan-grid` header pill; *Simulated* in the *Provenance* column |
| *Planned* / *Committed* | derived at read (from the state) | Pending and Dismissed read *Planned*; Committed reads *Committed* | always | *Provenance* column on Intake Review and the plan-grid *Intake* tab |
| *"{producer} adjusted {from} → {to}"* | derived at read (delivered ≠ suggested) | all states | the producer delivered a different quantity than it suggested | under the delivered quantity on Intake Review; drawer *Delivered by producer* |
| *Dismissed* | operator-raised, recorded | Dismissed | after `t_intake_dismiss` | *Triage* column on Intake Review |
| *"Committed → {pr}"* / *"Pushed → {pr}"* | derived at read (the requisition naming the line) | Committed | after a commit, while the requisition is in this session's store | Intake Review *Triage* column; drawer footer |
| *"Committed — its requisition is not in this session's store"* | derived at read | Committed | after a reload — the triage persisted, the requisition store did not | same places |
| *"Awaiting Requisitioner"* | derived at read (seat vs. permission) | Pending, Dismissed | the seat does not hold `pr:create` | Intake Review header; drawer footer; planned-changes panel |
| *"Switched off — Planning"* | operator-raised (module switch) | all states | the PLN module is off | the same slots as above; the pages stay readable |
| *Planned* / *External* (grid overlay) | operator-raised, page-only | Pending | a cell was typed (*Planned*) or pasted from outside the portal (*External*) and not yet pushed | planned-changes panel and the cell on the planning tabs |
| *"Refused: {reason}"* / *"Push failed: {reason}"* | derived at read (last refusal, page-only) | Pending, Dismissed | a dispatch was refused | under the row on Intake Review; drawer footer; planned-changes panel |
<!-- src: src/lib/i18n/widget.ts:25; src/pages-v2/IntakeReview.tsx:153-154; src/pages-v2/IntakeReview.tsx:232-247; src/pages-v2/IntakeReview.tsx:263-328; src/pages-v2/PlanGrid.tsx:333; src/pages-v2/plan-grid/PlanCellMarker.tsx:44-55; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:296-318; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:89-104; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:148-160; src/components/ui-v2/HandoffNotice.tsx:41-45; src/services/modules/registry.ts:179-184; src/lib/i18n/modules.ts:16; src/lib/i18n/modules.ts:79-80; src/lib/i18n/planGrid.ts:206-207; src/lib/i18n/intakeReview.ts:45-49 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `pil-somo-002` — *Niacinamide USP*, SOMO, 5,000 KG suggested / 4,500 KG delivered, period `2026-08`, in **Pending** at seed.

| Joins to | By | Note |
|---|---|---|
| Producer's line | `id` (fixture `PR_INTAKE_LINES`, or a generated SOMO id `pil-somo-<material>@<bucket>`) | Read-only. The producer's row is never copied or edited; the set of lines the producers emitted decides which ids exist. |
| Triage record | `lineId` in the browser store `paragon.intakeTriage` | Holds only what an act produced: state, committed quantity, the reason (only when the quantity was changed) and the commit instant. One record per line, replaced in place. |
| Purchase requisition | `intakeLineId` on the requisition = this line's id | The line's requisition number is **derived** by finding the requisition that names the line — it is never stored on the line. Shown on the requisition as *From intake line*. |
| Producer mark | requisition `source` = `SOMO` or `INTERNAL_GRID` | Copied from the line into the requisition by the cascade. |
| Planning bucket | requisition `periodBucket` = the line's period | A month (`2026-08`) or an ISO week (`2026-W36`), never a required date. |
| Quantity override | requisition `decision` (from → to, reason) | Present only when the planner left the delivered quantity; the platform computes whether it was adjusted. Shown as *Quantity override*. |
| Planning grid cell | the `acceptedQty` fact's source = the generated line's id | For generated SOMO lines only; reads the committed quantity once committed. The four authored lines contribute no planning-grid fact. |
| Audit trail | event `subject` = intakeLine + line id | See §7. |
<!-- src: src/services/data/mock/fixtures/prIntake.ts:43-102; src/services/data/mock/intakeLines.ts:16-22; src/services/planning/somoIntake.ts:40-80; src/services/data/mock/stores/intakeLineStore.ts:1-84; src/services/data/intakeLineProjection.ts:1-27; src/services/data/intakeLineProjection.ts:67-90; src/services/data/types.ts:1081-1115; src/services/data/types.ts:1188-1222; src/pages-v2/requisitions/prCreatePayload.ts:133-150; src/services/data/mock/planningFacts.ts:10-20; src/services/data/mock/planningFacts.ts:255-265; src/lib/i18n/requisitions.ts:143-149 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` for every buyer seat (the seat, not a person), `ts`, `outcome`, a `correlationId` per command, `subject` = {`entity`: `intakeLine`, `entityId`: the line id, `from`, `to`}, and on a cascade a `causationId` pointing at the command that caused it. The three intake verbs are user acts, so their events also carry an `attribution` from the session — today unattributed unless a sample identity was chosen. The quantity override is recorded as a `decision` on the cascaded `t_pr_create` event, not on the commit event. Refused commands are recorded too, with their reason. Being born Pending writes no event: the producer emitted the line and nobody acted.

Worked sequence for `pil-somo-002` as a tester would produce it on `/buyer/intake-review` and `/buyer/plan-grid`:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Pending | — (SOMO emitted it) | seed — no event | — |
| T+1 | Pending → Dismissed | requisitioner (`buyer:all`) | **Dismiss** on Intake Review | `t_intake_dismiss` |
| T+2 | Dismissed → Pending | requisitioner (`buyer:all`) | **Restore** on Intake Review | `t_intake_restore` |
| T+3 | Pending → Committed | requisitioner (`buyer:all`) | plan grid *Intake* tab → **Adjust** → *Accepted* 4000, a reason → **Push to PR** | `t_intake_commit` |
| T+3 | ∅ → Draft (purchase requisition) | automation (`buyer:all`), `causationId` = the commit's `correlationId` | cascade; `decision` from 4500 to 4000 with the reason | `t_pr_create` |

A tester pressing **Push to PR** again at T+4 will find the button disabled; a hand-crafted second commit is recorded as a failed `t_intake_commit` with `ILLEGAL_TRANSITION`.
<!-- src: src/services/transitions/events.ts:26-122; src/services/transitions/dispatcher.ts:469-495; src/services/transitions/dispatcher.ts:882-903; src/services/data/mock/MockCommandService.ts:2762-2808; src/services/transitions/flows/intakeLine.flow.ts:55-61 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Accept as delivered** / **Dismiss** / **Restore**; header shows *"Awaiting Requisitioner"* | handoff notice in the Intake Review header (also in the drawer footer and the planned-changes panel) | the seat does not hold `pr:create` | act from a seat holding the requisitioner lane |
| *"Switched off — Planning"* in place of the buttons; a dispatch is refused naming `PLN` | `MODULE_INACTIVE:PLN` | the Planning module is switched off; the pages stay readable | switch the module back on (`/buyer/platform/modules/admin`); nothing else will help, whatever the role |
| **Push to PR** stays disabled with *"Reason required to push an override"* | the *Reason* box under *Accepted* is empty | the accepted quantity differs from what the producer delivered | write why, or put the delivered quantity back |
| Red text under *Accepted* in the drawer | *"Enter an accepted quantity…"* / *"That is not a quantity…"* / *"This can be read two ways…"* | blank, non-numeric or separator-ambiguous quantity | type digits only, e.g. 4500 |
| Refused naming `intake_qty_floor` | `POLICY_REJECTED:intake_qty_floor` | the quantity committed was 0 or below (typing 0 passes the field, then the rule refuses it) | commit a quantity above zero, or dismiss the line instead |
| Refused naming `intake_qty_agrees` | `POLICY_REJECTED:intake_qty_agrees` | the typed text and the number disagree, or the text is unreadable — only a hand-crafted dispatch reaches this | send the text exactly as typed beside its number |
| Refused naming `intake_override_reasoned` | `POLICY_REJECTED:intake_override_reasoned` | a changed quantity with no reason, sent around the surface | supply the reason |
| *"Not pushed — a reason is required…"* in the planned-changes panel | the row stays *Planned* | a grid change differs from the delivered quantity and its *Reason* is blank — nothing was sent | fill the reason, then push again |
| Refused as *"not in a state this action can be taken from"* | `ILLEGAL_TRANSITION:Committed->Committed` or `Dismissed->Committed` | the line was already committed, or a dismissed line was pushed from the plan-grid drawer | nothing to do for a committed line; restore a dismissed line on Intake Review first |
| *"Committed — its requisition is not in this session's store"* | the line is Committed but shows no PR number | the page was reloaded: the triage is kept, the in-memory requisitions are re-seeded | expected in the demo; the requisition was raised, this session no longer holds it |
| Planned grid changes disappeared | the planned-changes panel is gone | a reload drops every change that was not pushed | re-enter and push |
| *"Refused: NOT_FOUND"* / *"Refused: SCOPE_DENIED"* | thrown before any rule ran | the line id names nothing a producer emitted, or a supplier seat reached the verb | intake lines are buyer-internal; use a listed line |
<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/dispatcher.ts:612-637; src/services/transitions/dispatcher.ts:735-737; src/services/transitions/dispatcher.ts:798; src/services/transitions/policies.ts:1777-1894; src/services/data/mock/MockCommandService.ts:2597-2609; src/pages-v2/IntakeReview.tsx:122-138; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:58-62; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:309-318; src/lib/glossary/refusals.glossary.ts:47-50; src/lib/i18n/planGrid.ts:75; src/lib/i18n/planGrid.ts:83-96; src/lib/i18n/planGrid.ts:195; src/lib/i18n/planGrid.ts:225; src/lib/i18n/modules.ts:79-80; src/router/AppRouter.tsx:167 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Pending | `pil-somo-001`; `pil-somo-002`; `pil-grid-001`; `pil-grid-002` | — | every line opens Pending because the triage store starts empty. SOMO · Glycerin USP (Halal) 12,000 KG delivered as suggested; SOMO · Niacinamide USP 5,000 suggested / 4,500 KG delivered (producer-trimmed); Internal Grid · PET Bottle 200ml 200,000 PCS as suggested; Internal Grid · Folding Carton 80,000 suggested / 90,000 PCS delivered, the only week-bucket line (2026-W36) |
| Dismissed | — | — | no fixture — press **Dismiss** on any pending line on `/buyer/intake-review` |
| Committed | — | — | no fixture — press **Accept as delivered** on Intake Review, or **Push to PR** in the plan-grid drawer; the cascade raises a Draft requisition with a store-assigned number in the PR-2026-9xx range |

All rows are SIMULATED sample data. The Raw materials and Packaging planning tabs also expose generated SOMO lines whose ids are built from a material code and a bucket; they are addressable and committable from the grid but are not enumerated in any fixture, are not listed on Intake Review, and cannot be dismissed from any screen. Line ids have no document number. The triage is kept in the browser, so clear the `paragon.intakeTriage` entry to return every line to Pending.
<!-- src: src/services/data/mock/fixtures/prIntake.ts:43-102; src/services/data/mock/stores/intakeLineStore.ts:64; src/services/data/mock/stores/intakeLineStore.ts:249-260; src/services/data/mock/MockProcurementService.ts:546-557; src/services/planning/somoIntake.ts:12-27; src/services/data/mock/stores/purchaseRequisitionStore.ts:41-45 -->
