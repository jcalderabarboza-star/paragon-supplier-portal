---
entity: forecastPublication
locale: en
title: Forecast publication
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_publication_open
  - t_publication_allocate
  - t_publication_approve_firm
  - t_publication_publish
  - t_publication_supersede
  - t_publication_withdraw
---

<!-- section:summary -->
## 1 · What this process is

A forecast publication is the plan suppliers are asked to answer: which material, in which period, and how much each supplier is expected to supply — the version every confirmation is measured against. SOMO gives Paragon a total per material per period; the portal splits that total across suppliers, and each resulting line (one supplier × one material × one period bucket) carries a commitment class — **Firm** in the horizon's first (locked) bucket, **Semi-firm** after it. A supplier's requirement response binds the exact publication and plan version it answered, which is why a sent plan is never edited: a revision is a new publication that replaces the old one.

Two buyer lanes touch it, and the split between them is deliberate. The planner (the `planning` lane) opens a draft from a SOMO plan version, splits the totals to suppliers in the plan grid and publishes. Procurement (the `procurement` lane) signs every Firm split before it can go out, because a Firm line is what a supplier builds stock on — the planner splits, somebody else signs. Publishing retires the previous publication of the same grain automatically (a cascade nobody presses). Suppliers never act on a publication; they read their own lines of it on `/supplier/forecasts` and answer them (see the requirement-response guide). The default buyer seat holds both lanes, so in the demo one seat can split and sign; the two lanes make narrowing possible, they do not enforce it.

A publication starts as a **Draft**, holding SOMO's totals and — unless the planner chose to start from the current publication's split — no supplier lines. **Published** is the plan suppliers answer. **Superseded** (replaced by the next publication) and **Withdrawn** (taken back with a reason) are both endings; neither is re-opened, and the next plan is a new draft. There is no verb that discards a draft. **One plan is current per grain:** the monthly raw-material plan and the weekly packaging plan stand side by side, and publishing at one grain supersedes only the previous plan of that grain — the other grain's plan, its lines and its open responses stay where they are, on `/buyer/collaboration` and on each supplier's page. A withdrawn plan brings back nothing: its grain has no current plan until the next publish.

Honesty markers. Every plan version on offer is SIMULATED: the seed publications and the generated SOMO fixture are sample data, so the plan grid carries **Sample SOMO plan — simulated** and the liveness pill reads *Sample — awaiting SOMO C8 feed*. A SIMULATED publication is never shown to a live supplier; the supplier page renders the sample set only under **Sample forecast — no live publication yet**. All six verbs belong to the portal's own command spine — nothing here is S/4HANA's, TMS's or the bank's. The publications live in an in-memory store: a page reload re-seeds it, so a draft opened in a session is gone after a reload. Timestamps come from one shared simulated clock (the app's "today" is 31 Aug 2026, 12:00 UTC), never the wall clock. Withdraw is modelled and wired but no screen offers it.

<!-- src: src/lib/i18n/processFlowPurpose.ts:237-251; src/services/transitions/flows/forecastPublication.flow.ts:1-65; src/services/transitions/businessRoles.ts:156-162; src/services/transitions/businessRoles.ts:381-386; src/services/transitions/businessRoles.ts:747-758; src/services/sdc/publication.ts:40-42; src/services/data/mock/stores/forecastPublicationStore.ts:1-20; src/services/data/mock/MockCollaborationService.ts:126-155; src/services/liveness/registry.ts:340-347; src/lib/i18n/planGrid.ts:169-170; src/lib/i18n/sdcSupplier.ts:15; src/lib/i18n/widget.ts:42; src/services/sdc/clock.ts:55 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Draft | operator action (creation) | buyer · planning | `t_publication_open` |
| 2 | Draft → Draft (same state) | operator action, state-preserving, repeatable | buyer · planning | `t_publication_allocate` |
| 3 | Draft → Draft (same state) | operator action, state-preserving, one per Firm line | buyer · procurement | `t_publication_approve_firm` |
| 4 | Draft → Published | operator action | buyer · planning | `t_publication_publish` |
| 5 | Published → Superseded | cascade (raised by the next publish of the same grain) | automation | `t_publication_supersede` |
| 6 | Published → Withdrawn | not active (no caller) | buyer · planning | `t_publication_withdraw` |

**Forks**

- **At Draft:** `t_publication_allocate` — planner — as often as needed while splitting; `t_publication_approve_firm` — procurement — once per Firm line, after its split is final; `t_publication_publish` — planner — the one exit, only when every Firm line is signed.
- **At Published:** `t_publication_supersede` — automation — when a newer publication of the same grain is published; `t_publication_withdraw` — planner — when a sent plan must be taken back (no screen offers it today).

<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:37-170; src/services/transitions/cascades.ts:82-85 -->

<!-- section:steps -->
## 3 · Step by step

### t_publication_open — Open a draft <!-- transition:t_publication_open -->

- **Step kind:** operator action (creation)
- **Role:** buyer · planning (the planner)
- **From → to:** ∅ → Draft
- **Operator — where:** `/buyer/plan-grid` → tab **Raw materials** (monthly grain) or **Packaging** (weekly grain) → panel **Forecast publication** → choose a **Plan version** → optionally tick **Start from the split of {id} (signatures are not carried)** → **Open draft**
- **Operator — do:** Start the next plan from a SOMO plan version. The draft holds SOMO's total for each material in each period of the horizon; ticked, it also copies the current publication's split as a starting point, so you only re-split what moved.
- **Operator — fill:** the plan version (the list offers every SOMO version with a horizon at this grain, shown as *version · first–last bucket*; it preselects the current publication's version). The grain, horizon and SOMO emission are taken from the chosen version, never typed. The carry checkbox appears only while a publication of this grain is Published.
- **Tester — expected state:** Draft
- **Tester — confirm:** the panel switches to the draft: *Draft* {id} (store-minted as `PUB-<grain>-<planVersion>-r<n>`, e.g. `PUB-month-PV-2026-08.2-r2` when opened from `PV-2026-08.2`), *Plan version*, *Grain · horizon* (*Monthly* / *Weekly*), *Response deadline* *{date} if published now*, the coverage line *{n} material-periods allocated · {n} unallocated · {n} supplier lines* and, when carried, *split carried from {id}*. **Publication history** gains an **Opened** row with role *Planning* and the person (or *No person named*). Nothing changes on `/supplier/forecasts` — a draft is never shown to a supplier.
- **Tester — trigger event:** `t_publication_open`
- **Checks that can refuse:** `pub_horizon_one_grain` — the horizon must parse as one grain and match the stated grain; `pub_planversion_known` — SOMO must have emitted that plan version, in the named emission; `pub_carry_from_current` — a carry source must be the current Published publication of the same grain, nothing else; `pub_one_open_draft` — no other draft of the grain may be open (publish it, or let it be, before opening another).
- **Glossary:** `POLICY_REJECTED`; `MISSING_FIELDS`; `ROLE_NOT_PERMITTED`.
- **Honesty:** Every plan version offered is SIMULATED, and the draft inherits that provenance. Carried lines keep their class but lose their signature and are re-labelled with the basis *carried-forward*; a material-period whose carried split would exceed the new total is not carried at all and starts unallocated. A seat without the planning lane sees *Awaiting Planning* in place of the control.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:67-87; src/services/data/mock/publicationTarget.ts:82-113; src/services/data/mock/publicationTarget.ts:209-234; src/services/data/mock/publicationTarget.ts:373-395; src/services/data/mock/publicationFeed.ts:42-91; src/services/sdc/publication.ts:47-49; src/services/sdc/publication.ts:90-130; src/pages-v2/plan-grid/PublicationPanel.tsx:66-109; src/pages-v2/plan-grid/PublicationPanel.tsx:162-199; src/pages-v2/plan-grid/PublicationPanel.tsx:239-269; src/pages-v2/PlanGrid.tsx:357-369; src/services/planning/views.ts:70-89; src/lib/i18n/planGrid.ts:232-247; src/services/query/commandHooks.ts:2043-2056 -->

### t_publication_allocate — Allocate a supplier's share <!-- transition:t_publication_allocate -->

- **Step kind:** operator action (state-preserving — the draft stays Draft)
- **Role:** buyer · planning (the planner)
- **From → to:** Draft → Draft (same state)
- **Operator — where:** `/buyer/plan-grid` → tab **Raw materials** or **Packaging** (with a draft open for that grain) → a supplier's **Allocation** row under the material → select the period cell, press Enter and type (or paste) → the planned-changes panel → **Push**, **Push selection ({n})** or **Push all ({n})**
- **Operator — do:** Give one supplier its share of a material's total for one period. The edit is held in the page as a planned change until you push it; a zero removes that supplier from the line.
- **Operator — fill:** the quantity, digits only (e.g. `12000`). No reason is asked for: the split is the planner's own act, with no producer figure to depart from. The supplier, material and period come from the cell; the basis is recorded as *planner-split*.
- **Tester — expected state:** Draft (unchanged)
- **Tester — confirm:** the cell shows the planned value with the PLANNED marker (*Plan*) until pushed; after a successful push the entry clears from the planned-changes panel and the cell reads the draft's value. In the publication panel the coverage line and *Firm lines awaiting signature: {n}* recount. **Publication history** gains no row — an allocation is not a ledger act.
- **Tester — trigger event:** `t_publication_allocate`
- **Checks that can refuse:** at the cell, before anything is sent — *no open draft covers this figure — open a draft in the publication panel to split it*, *over SOMO's total — the suppliers would hold {sum} of {total}*, and the quantity refusals (empty, not a number, ambiguous). At dispatch: `pub_material_known` — the material must be in the planning master; `pub_basis_known` — the basis must be planner-split, quota or award-history (carried-forward is minted only by the carry); `pub_line_in_horizon` — the period must be in the draft's horizon and SOMO must have given a total for it; `pub_supplier_collaborated` — the supplier must already work with Paragon on the material (a relationship, a line in an earlier publication, or the generated fixture's sourcing) — a new pairing is not opened from a plan; `pub_qty_floor` — a finite number ≥ 0; `pub_qty_agrees` — the typed text must re-read to the same number; `pub_alloc_within_total` — all suppliers together may not exceed SOMO's total.
- **Glossary:** `POLICY_REJECTED`; `EMPTY_QTY`; `NOT_NUMERIC`; `AMBIGUOUS_QTY`; `ROLE_NOT_PERMITTED`.
- **Honesty:** Re-splitting a line that was already signed drops the signature — the approval was given to the old quantity — so split first and sign last. Planned changes live in the page only: a reload drops every change that has not been pushed. A seat without the planning lane sees *Awaiting Planning* in the planned-changes panel instead of the push buttons.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:88-108; src/services/data/mock/publicationTarget.ts:53-68; src/services/data/mock/publicationTarget.ts:149-179; src/services/data/mock/publicationTarget.ts:236-302; src/services/data/mock/publicationTarget.ts:352-362; src/services/data/mock/publicationFeed.ts:93-128; src/services/planning/measures.ts:128-147; src/pages-v2/plan-grid/planDraft.ts:24-38; src/pages-v2/plan-grid/planDraft.ts:130-190; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:59-123; src/services/query/commandHooks.ts:1979-2017; src/lib/i18n/planGrid.ts:122; src/lib/i18n/planGrid.ts:184; src/lib/i18n/planGrid.ts:193-210; src/lib/i18n/planGrid.ts:227-231 -->

### t_publication_approve_firm — Sign firm lines <!-- transition:t_publication_approve_firm -->

- **Step kind:** operator action (state-preserving — the draft stays Draft)
- **Role:** buyer · procurement (not planning — the signature is a second authority)
- **From → to:** Draft → Draft (same state)
- **Operator — where:** `/buyer/plan-grid` → tab **Raw materials** or **Packaging** → panel **Forecast publication** → line *Firm lines awaiting signature: {n}* → **Sign firm lines ({n})**
- **Operator — do:** Put a person's name to every Firm split in the draft. One press signs every unsigned Firm line, one signature per line.
- **Operator — fill:** nothing to fill — but a person must be named in the session first: adopt one in the identity panel (the avatar). The signature is the session's person, written by the portal, never a field you type.
- **Tester — expected state:** Draft (unchanged)
- **Tester — confirm:** *Firm lines awaiting signature* drops to 0 and the button reads **Sign firm lines (0)**, disabled; the publish blocker *Not yet: {n} firm lines await procurement's signature — …* disappears. Each signed line now carries the signer's person id and the time; **Publication history** gains no row.
- **Tester — trigger event:** `t_publication_approve_firm`
- **Checks that can refuse:** `pub_line_is_firm` — the allocation must exist and be Firm (only a Firm split is signed); `pub_actor_attributed` — a person must be named in the session (a sample person is admitted and marked as one). The panel keeps the button disabled, with *A firm split is signed by a person — adopt one in the identity panel first (a sample person is marked as one).*, while no person is named.
- **Glossary:** `POLICY_REJECTED`; `NO_PERSON_IN_SESSION`; `ROLE_NOT_PERMITTED`.
- **Honesty:** The lines are signed one dispatch each, grouped under the first one's correlation id; a refusal stops the run at that line. In the demo the signer is a SAMPLE person and is labelled as one wherever shown. The default buyer seat holds procurement as well as planning, so the same seat can split and sign; a seat without procurement sees *Awaiting Procurement* in place of the button (shown only while unsigned Firm lines exist).
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:109-122; src/services/transitions/businessRoles.ts:156-162; src/services/data/mock/publicationTarget.ts:181-196; src/services/data/mock/publicationTarget.ts:304-326; src/services/sdc/publication.ts:62-64; src/pages-v2/plan-grid/PublicationPanel.tsx:111-128; src/pages-v2/plan-grid/PublicationPanel.tsx:271-294; src/lib/i18n/planGrid.ts:248-253; src/services/query/commandHooks.ts:2057-2063; src/lib/glossary/governance.glossary.ts:96-99 -->

### t_publication_publish — Publish <!-- transition:t_publication_publish -->

- **Step kind:** operator action
- **Role:** buyer · planning (the planner)
- **From → to:** Draft → Published
- **Operator — where:** `/buyer/plan-grid` → tab **Raw materials** or **Packaging** → panel **Forecast publication** → **Publish**
- **Operator — do:** Send the plan to suppliers. Publishing stamps the publish time and the date suppliers' answers are due, and retires the plan it replaces in the same moment.
- **Operator — fill:** nothing to fill. The button stays disabled, with the reasons listed beside it, until the draft could pass every check.
- **Tester — expected state:** Published (and the previously Published publication of the same grain → Superseded)
- **Tester — confirm:** the panel returns to *No draft is open for this grain…* and its header reads *Published now: {id} ({version}) · responses due {date}* — the shared clock's date + 7 days (07 Sep 2026 in this build). **Publication history** gains **Published** (role *Planning*) and, for the replaced publication, **Superseded** (role *The platform (by the next publication)*). On `/supplier/forecasts` (sample mode) the new plan becomes the one shown: the version banner reads *Plan {version} published {date} — {n} lines changed, {n} carried*, each line card carries *Carried — no re-confirmation needed*, *Changed — was {qty} {uom}* or *Changed — new in this plan*, and the **Published lines** tab label and the *Respond by* field show the deadline. `/buyer/collaboration` consolidates against the new publication.
- **Tester — trigger event:** `t_publication_publish`
- **Checks that can refuse:** `pub_has_lines` — the draft must allocate something to some supplier; `pub_firm_lines_approved` — every Firm line must carry its signature; `pub_class_projection_present` — every line must carry a commitment class. The panel lists the same three as *Not yet: …* lines (the same predicates the checks use), so a refusal after pressing should not occur from the screen.
- **Glossary:** `POLICY_REJECTED`; `ILLEGAL_TRANSITION`; `ROLE_NOT_PERMITTED`.
- **Honesty:** The published plan is still SIMULATED, so a live supplier still sees no publication; the supplier page shows it only inside the sample banner. The deadline offset (7 days) is a constant shared with the chase list, not yet a governed setting. A seat without the planning lane sees *Awaiting Planning* in place of the button.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:123-139; src/services/data/mock/publicationTarget.ts:118-127; src/services/data/mock/publicationTarget.ts:328-371; src/services/sdc/publication.ts:10-20; src/services/sdc/publication.ts:51-88; src/services/sdc/consolidation.ts:46; src/pages-v2/plan-grid/PublicationPanel.tsx:130-160; src/pages-v2/plan-grid/PublicationPanel.tsx:296-315; src/lib/i18n/planGrid.ts:233-234; src/lib/i18n/planGrid.ts:251-254; src/pages-v2/SupplierForecasts.tsx:336-357; src/pages-v2/SupplierForecasts.tsx:436-461; src/pages-v2/SupplierForecasts.tsx:1793-1859; src/lib/i18n/sdcSupplier.ts:20-35; src/services/data/mock/MockCollaborationService.ts:143-155; src/services/query/commandHooks.ts:2064-2075 -->

### t_publication_supersede — Superseded by the next publication <!-- transition:t_publication_supersede -->

- **Step kind:** cascade (raised by `t_publication_publish`)
- **Role:** automation
- **From → to:** Published → Superseded
- **Operator — where:** nobody presses this in the portal — it fires when a newer publication of the same grain is published.
- **Operator — do:** Nothing. The older plan is marked as replaced, so suppliers answer the current one while answers given against the older one stay readable against what they answered.
- **Operator — fill:** nothing to fill.
- **Tester — expected state:** Superseded (on the previously Published publication of that grain)
- **Tester — confirm:** in **Publication history** (on `/buyer/plan-grid` and on `/buyer/collaboration`) a **Superseded** row appears for the old publication with role *The platform (by the next publication)* and a dash for the person; the record carries the id of the publication that replaced it. The first publication of a grain supersedes nothing.
- **Tester — trigger event:** `t_publication_supersede`
- **Checks that can refuse:** none beyond role, legality and required fields — the cascade only targets a record it has confirmed is Published and of the same grain.
- **Glossary:** `ILLEGAL_TRANSITION`.
- **Honesty:** A machine act: no person is recorded and the atom belongs to no assignable lane. The event carries the publish's correlation id as its causation id, so the two can be read together. A superseded publication stays in what suppliers and the consolidation read — earlier answers keep pointing at it.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:140-156; src/services/transitions/cascades.ts:82-85; src/services/data/mock/MockCommandService.ts:2806-2822; src/services/data/mock/publicationTarget.ts:128-138; src/services/data/mock/publicationTarget.ts:200-202; src/services/transitions/businessRoles.ts:650-653; src/services/transitions/dispatcher.ts:838-907; src/pages-v2/plan-grid/PublicationLedger.tsx:26-30; src/pages-v2/plan-grid/PublicationLedger.tsx:99-109; src/lib/i18n/planGrid.ts:265-267; src/services/data/mock/stores/forecastPublicationStore.ts:99-102 -->

### t_publication_withdraw — Withdraw a publication <!-- transition:t_publication_withdraw -->

- **Step kind:** not active (no caller) — the verb is wired and dispatchable, but no screen offers it
- **Role:** buyer · planning (the same permission as publishing)
- **From → to:** Published → Withdrawn
- **Operator — where:** not offered anywhere today.
- **Operator — do:** (When a screen offers it) take a sent plan back and say why, so no supplier answers a plan that no longer stands.
- **Operator — fill:** a reason in words — required.
- **Tester — expected state:** Withdrawn
- **Tester — confirm:** only by a direct dispatch: the record moves to Withdrawn with the reason stored, **Publication history** shows **Withdrawn — "{reason}"** with role *Planning*, and the publication leaves what suppliers and the consolidation read.
- **Tester — trigger event:** `t_publication_withdraw`
- **Checks that can refuse:** `pub_text_authored` — the reason must be text of at least three characters after trimming, not whitespace.
- **Glossary:** `POLICY_REJECTED`; `MISSING_FIELDS`; `ILLEGAL_TRANSITION`.
- **Honesty:** The history table and its label already exist for this act, but no page dispatches it — a planner cannot withdraw a plan from the portal today.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:157-168; src/services/data/mock/publicationTarget.ts:139-147; src/services/data/mock/publicationTarget.ts:344-348; src/services/data/mock/stores/forecastPublicationStore.ts:13-16; src/services/data/mock/stores/forecastPublicationStore.ts:99-102; src/services/query/commandHooks.ts:2019-2075; src/pages-v2/plan-grid/PublicationLedger.tsx:92-95; src/lib/i18n/planGrid.ts:266 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Start empty or start from the current split (at open).** Branch A — `t_publication_open` with the carry box ticked — **When:** a publication of the grain is Published and most of its split still holds; lines are copied without signatures and marked *carried-forward*. Branch B — `t_publication_open` unticked (or no current publication) — **When:** the plan should be split from scratch; the draft starts with no lines.
- **Split, then sign, then publish (inside Draft).** `t_publication_allocate` — **When:** a supplier's share must be set or changed; changing a signed Firm line removes its signature. `t_publication_approve_firm` — **When:** every Firm split is final; procurement signs. `t_publication_publish` — **When:** the panel lists no *Not yet* reason.
- **Replace or take back (at Published).** Branch A — a new draft published over it, which fires `t_publication_supersede` — **When:** the plan changed and suppliers should answer the new version; answers that did not move are carried. Branch B — `t_publication_withdraw` — **When:** the plan must not be answered at all; not offered by any screen today.
- **A draft that is no longer wanted.** No transition removes or discards a draft, and a second draft of the same grain is refused while one is open (`pub_one_open_draft`). The only exit is to publish it; in this build a page reload also clears it, because the store re-seeds.

<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:60-168; src/services/data/mock/publicationTarget.ts:153-179; src/services/data/mock/publicationTarget.ts:373-382; src/services/sdc/publication.ts:90-130; src/services/data/mock/stores/forecastPublicationStore.ts:18-19 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Not yet: the draft allocates nothing to any supplier / Not yet: {n} firm lines await procurement's signature / Not yet: {n} lines carry no commitment class | derived at read | Draft | the matching publish check would refuse | `/buyer/plan-grid` publication panel, beside **Publish** |
| Firm lines awaiting signature: {n} | derived at read | Draft | Firm lines without a signature | publication panel |
| A firm split is signed by a person — adopt one in the identity panel first | derived at read | Draft | the seat holds procurement but names no person | publication panel, beside **Sign firm lines** |
| Awaiting Planning / Awaiting Procurement | role handoff | any control | the seat does not hold the verb's atom | in the control's own slot (publication panel; planned-changes panel for allocation pushes) |
| {date} if published now | time-driven, derived at read | Draft | always — shared clock + 7 days | publication panel, *Response deadline* |
| no open draft covers this figure / over SOMO's total | derived at read (cell refusal) | Draft (or no draft) | an Allocation cell edit with no open draft, or a split above SOMO's total | the grid cell and the planned-changes panel |
| Respond by {date} / Overdue | time-driven, derived at read | Published | the deadline stamped at publish — or, on a publication without a stamp (the seeds), published date + 7 days, the same date the buyer's chase reads; **Overdue** marks only a line still awaiting an answer once the date has passed | `/supplier/forecasts` line cards and the **Published lines** tab label (*respond by* / *overdue since* / *all answered*) |
| Carried — no re-confirmation needed / Unchanged — awaiting your confirmation (or acknowledgment) / Changed — was {qty} {uom} / Changed — new in this plan | derived at read | Published (against the one it superseded) | a line's quantity and class equal, differ from, or are absent in the previous publication; an unchanged line reads *Carried* only while an answer to it still counts by the buyer's own rule, otherwise *Unchanged — awaiting…* | `/supplier/forecasts` line cards; counts in the version banner |
| Sample record — not published through the portal | SAMPLE marker | Published, Superseded (seeds) | the ledger row was seeded, not written by a verb | **Publication history** |
| No person named | derived at read | any ledger row by a person's lane | the seat named nobody when it acted | **Publication history**, *Person* |
| Sample SOMO plan — simulated / Sample forecast — no live publication yet / Sample — awaiting SOMO C8 feed | SIMULATED marker | whole page | every plan version is SIMULATED | `/buyer/plan-grid` banner; `/supplier/forecasts` banner; liveness pill on both |

<!-- src: src/services/sdc/publication.ts:18-29; src/services/sdc/publication.ts:62-88; src/services/sdc/publication.ts:132-192; src/pages-v2/plan-grid/PublicationPanel.tsx:136-144; src/pages-v2/plan-grid/PublicationPanel.tsx:233-318; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:59-110; src/pages-v2/plan-grid/PublicationLedger.tsx:99-110; src/lib/i18n/planGrid.ts:169; src/lib/i18n/planGrid.ts:227-269; src/lib/i18n/roles.ts:26-30; src/lib/i18n/roles.ts:48-49; src/lib/i18n/sdcSupplier.ts:15-35; src/pages-v2/SupplierForecasts.tsx:336-357; src/pages-v2/SupplierForecasts.tsx:436-447; src/pages-v2/SupplierForecasts.tsx:1793-1859; src/lib/i18n/widget.ts:42 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `PUB-2026-08-RM-R2` (no separate document number — the publication id is the number; plan version `PV-2026-08.2`, published 2026-08-15, monthly horizon 2026-08 · 2026-09 · 2026-10, state Published).

| Joins to | By | Note |
|---|---|---|
| SOMO plan version `PV-2026-08.2` | `planVersion` + `sourceRef` | the seed record names the plan version as its source; a draft opened in the portal names the SOMO emission it came from (`somo-emission@PV-2026-08.2` for this version) |
| SOMO material-period totals | `totals` (material \| period) | six totals here, e.g. RM-EMUL-3310 in 2026-08 = 10 000 KG; the lines may never sum above them |
| Forecast lines (supplier × material × period) | `lines[]` — `supplierId` + `materialCode` + `periodBucket` | seven lines across sup-002, sup-005 and sup-007; the three 2026-08 lines are Firm and carry an approval stamped with the role word *planner* dated 2026-07-30; 2026-09 lines are Semi-firm; the one 2026-10 line (AI-NIAC-6601, sup-007) is Visibility only |
| Allocation | `lines[].allocation` — `materialPeriodTotal`, `basis`, `approvedBy`, `approvedAt` | basis planner-split, quota or award-history on the seeds; a portal allocation writes planner-split, a carry writes carried-forward |
| Superseded publication `PUB-2026-08-RM` | its `supersededBy` | `PV-2026-08.1`, published 2026-08-01; RM-EMUL-3320 and PK-PETB-8810 in 2026-09 moved between the two versions (2 000 → 2 600 KG; 120 000 → 150 000 PCS) |
| Requirement responses | `publicationId` + `planVersion` on each response | `rr-0005` (sup-007's acknowledgment) binds this publication; `rr-0001` to `rr-0004` bind `PUB-2026-08-RM` and are read against this one as carried or stale |
| Material master / planning master | `materialCode` | a line's unit is copied from the master at allocation; an unknown code is refused |
| Publication ledger | `ledger[]` | open, publish, supersede and withdraw rows only — allocations and signatures are not ledger rows |
| Response deadline | `responseDueAt` | absent on both seeds (never published through the verb); both seats then read published date + 7 days — 22 Aug 2026 for `PUB-2026-08-RM-R2` |

Display-only: `provenance` (`SOMO` · `SIMULATED` · `PLANNED`) is carried on the publication and every line; `segment` and `suggestedSource` on some seed lines are SOMO's planning annotations, and no verb writes them.

<!-- src: src/services/sdc/fixtures.ts:36-40; src/services/sdc/fixtures.ts:886-1142; src/services/sdc/fixtures.ts:1149-1265; src/services/sdc/types.ts:240-330; src/services/sdc/types.ts:332-390; src/services/data/mock/stores/forecastPublicationStore.ts:39-71; src/services/data/mock/publicationFeed.ts:42-58; src/services/data/mock/publicationTarget.ts:149-178 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` for the buyer seat, `ts` from the shared clock, `outcome` (done / failed, with the refusal as `reason` on a failure), a `correlationId`, and `subject` = {`entity` `forecastPublication`, `entityId`, `from`, `to`} — for allocate and sign, `to` is the same state. A user act also carries `attribution` (the session's person, if one was named); the supersede, being a cascade, carries the publish's `correlationId` as its `causationId` and no person. Signing several Firm lines in one press groups them the same way: the first signature's `correlationId` is the later ones' `causationId`.

The publication keeps its own ledger beside the events: one row each for opened, published, superseded and withdrawn, with `at`, a monotonic `seq` (the shared clock is frozen, so an open, its publish and the supersede it causes can share one instant — `seq` orders them), `personId` (or none) and, for a withdrawal, the reason. The role is not stored; **Publication history** derives it from the lane holding each verb. The seed rows are marked as seeded.

Seeded history of `PUB-2026-08-RM-R2`: **Published** 2026-08-15 (seq 3, seeded); `PUB-2026-08-RM` shows **Published** 2026-08-01 (seq 1) and **Superseded** 2026-08-15 (seq 4). Worked sequence a tester produces from there on the **Raw materials** tab:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Draft (`PUB-month-PV-2026-08.2-r2`) | buyer · planning | **Open draft** from `PV-2026-08.2`, carry box ticked (7 lines carried, 3 Firm unsigned) | `t_publication_open` |
| T+1 | Draft → Draft | buyer · planning | edit an **Allocation** cell, **Push** (optional) | `t_publication_allocate` |
| T+2 | Draft → Draft (×3) | buyer · procurement, person adopted | **Sign firm lines (3)** | `t_publication_approve_firm` |
| T+3 | Draft → Published | buyer · planning | **Publish** (deadline stamped) | `t_publication_publish` |
| T+3 | Published → Superseded on `PUB-2026-08-RM-R2` | automation | cascade, `causationId` = T+3's `correlationId` | `t_publication_supersede` |

<!-- src: src/services/transitions/events.ts:24-124; src/services/transitions/events.ts:126-129; src/services/transitions/dispatcher.ts:838-907; src/services/data/mock/publicationTarget.ts:44-51; src/services/data/mock/stores/forecastPublicationStore.ts:36-76; src/services/sdc/types.ts:337-367; src/pages-v2/plan-grid/PublicationLedger.tsx:43-63; src/pages-v2/plan-grid/PublicationPanel.tsx:111-128 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Open draft** / **Publish**, only *Awaiting Planning* | handoff notice in the control's slot | the seat lacks the planning lane (`publication:draft` / `publication:publish`) | a seat holding planning acts (`ROLE_NOT_PERMITTED` if forced) |
| No **Sign firm lines**, only *Awaiting Procurement* | handoff notice beside *Firm lines awaiting signature* | the seat lacks the procurement lane (`publication:approve`) | a seat holding procurement signs |
| **Sign firm lines** disabled with *A firm split is signed by a person…* | warning text beside the button | the session names no person; `POLICY_REJECTED:pub_actor_attributed` if forced | adopt a person in the identity panel (avatar), then sign |
| **Publish** disabled with *Not yet: …* lines | the reasons listed beside the button | nothing allocated, unsigned Firm lines, or a line without a class | allocate, have procurement sign, then publish |
| *SOMO has emitted no plan version at this grain.* | no plan-version list in the panel | no feed version has a horizon at this grain | switch tab (monthly / weekly) |
| `POLICY_REJECTED:pub_one_open_draft` | refusal under the panel naming the open draft | a draft of this grain is already open (e.g. opened in another tab) | publish that draft; there is no discard verb (a reload re-seeds the store) |
| `POLICY_REJECTED:pub_carry_from_current` / `pub_planversion_known` / `pub_horizon_one_grain` | refusal under the panel | the carry source is not the current publication, or the version / emission / horizon does not match SOMO's feed | reopen from the panel so the keys come from the offer shown |
| Cell refused: *no open draft covers this figure…* | refusal at the Allocation cell | no draft is open for this grain | open a draft in the publication panel first |
| Cell refused: *over SOMO's total — the suppliers would hold {sum} of {total}* | refusal at the cell; at dispatch `POLICY_REJECTED:pub_alloc_within_total` | the suppliers' shares would exceed SOMO's material-period total | lower this or another supplier's share |
| `POLICY_REJECTED:pub_supplier_collaborated` | push refused naming the supplier and material | the supplier has no relationship with the material and was never allocated it | a new pairing is not opened from a plan; establish the relationship first |
| `POLICY_REJECTED:pub_line_in_horizon` / `pub_material_known` / `pub_basis_known` / `pub_qty_floor` / `pub_qty_agrees` | push refused with that hook | period outside the horizon or without a SOMO total, unknown material, wrong basis, negative or mis-read quantity | edit from the grid cell; type digits only |
| *Not pushed — this change is not anchored to an open draft.* | push row stays PLANNED with this reason | the draft the change was made against is no longer open (published or reloaded) | open a new draft and re-enter the split |
| `POLICY_REJECTED:pub_line_is_firm` | refusal on signing | the line does not exist or is not Firm | only Firm lines are signed; the panel signs exactly the unsigned Firm lines |
| `ILLEGAL_TRANSITION` | e.g. publishing a record that is no longer Draft | the publication moved since the screen rendered | reload the panel and act on the current draft |
| `MODULE_INACTIVE` naming SDC | refusal under the panel, for every seat | the Supplier collaboration module is switched off; `/buyer/plan-grid` belongs to the planning module, which can stay on | have the module switched back on at `/buyer/platform/modules/admin` |
| `SCOPE_DENIED` | thrown for a supplier seat | a supplier never acts on a publication; the check runs before the role check | suppliers read and answer on `/supplier/forecasts` |
| `STALE_STATE` | never produced on these surfaces | the panel and grid send no expected state | n/a — reported for completeness |
| Supplier still sees *Sample forecast — no live publication yet* after a publish | the banner on `/supplier/forecasts` | every publication is SIMULATED; a live supplier sees only LIVE publications | none in this build — the real SOMO feed has not landed |
| Supplier sees *overdue since 22 Aug 2026* on a seed plan | **Published lines** tab label | the seed carries no stamp, so its deadline is published date + 7 days — the date the buyer's chase has always used; a line still awaiting an answer is overdue | answer the lines marked **Overdue**; once every line is answered the tab reads *all answered* |
| The draft is gone after a page reload | panel shows *No draft is open for this grain…* | the publication store is in memory and re-seeds on reload | reopen the draft; push and publish in one session |
| No way to withdraw a published plan | no control on any page | `t_publication_withdraw` has no caller | not available in the portal today |

<!-- src: src/services/transitions/refusals.ts:56-111; src/services/transitions/dispatcher.ts:573-636; src/services/transitions/dispatcher.ts:737; src/services/transitions/dispatcher.ts:777-800; src/services/data/mock/publicationTarget.ts:10-12; src/services/data/mock/publicationTarget.ts:209-395; src/pages-v2/plan-grid/PublicationPanel.tsx:162-216; src/lib/i18n/planGrid.ts:228-236; src/lib/i18n/planGrid.ts:250-254; src/lib/i18n/roles.ts:48-49; src/services/modules/registry.ts:179-198; src/lib/i18n/modules.ts:17; src/services/data/mock/MockCollaborationService.ts:126-155; src/services/data/mock/stores/forecastPublicationStore.ts:18-19 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Draft | — | — | no fixture; reach it with **Open draft** on `/buyer/plan-grid` (Raw materials tab, `PV-2026-08.2`, carry ticked → `PUB-month-PV-2026-08.2-r2` with 7 carried lines, 3 Firm unsigned) |
| Published | `PUB-2026-08-RM-R2` | — | `PV-2026-08.2`, published 2026-08-15, horizon 2026-08 / 2026-09 / 2026-10, 7 lines; seeded ledger row; no response deadline; the current monthly publication |
| Superseded | `PUB-2026-08-RM` | — | `PV-2026-08.1`, published 2026-08-01, superseded by `PUB-2026-08-RM-R2`; four seed responses (`rr-0001` to `rr-0004`) still bind it |
| Withdrawn | — | — | no fixture and no screen reaches it; only a direct dispatch of `t_publication_withdraw` on a Published record |

Context for the tester: the store seeds from the two fixture publications — the latest by publish date is Published, the earlier one Superseded. Both are SIMULATED and monthly; no weekly publication exists at seed, so the **Packaging** tab's panel starts with no current publication. The plan versions on offer are the two seed versions and the generated SOMO fixture's version (`PV-SIM-…`). A new draft's ledger rows continue from seq 5. The demo buyer seat holds planning and procurement; signing also needs a person adopted in the identity panel.

<!-- src: src/services/data/mock/stores/forecastPublicationStore.ts:39-76; src/services/data/mock/stores/forecastPublicationStore.ts:92-120; src/services/sdc/fixtures.ts:891-1142; src/services/sdc/fixtures.ts:1149-1265; src/services/data/mock/publicationFeed.ts:42-91; src/services/planning/somoFixture.ts:40-41; src/services/transitions/businessRoles.ts:747-758 -->
