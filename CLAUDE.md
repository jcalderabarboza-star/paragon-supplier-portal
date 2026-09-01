# Claude Code — Project Rules

## Branch policy
- Branch off `main` for every task (e.g. `chore/...`, `qa/...`, `feat/...`)
- Open a pull request to `main`; never push directly to `main`
- The CLI merges via the GitHub UI (Squash + delete branch); the operator directs and approves

### ⚠️ MERGE DOCTRINE — BOTH DIRECTIONS. RECOVERED AND EXTENDED (§59c, 2026-08-26)

⚠️ **PROVENANCE FIRST, BECAUSE IT IS THE WHOLE ARGUMENT FOR THIS SECTION
EXISTING.** The first half below was ratified 2026-08-14 and has governed every
dispatch since — and it lived **only on `qa/chaos-ambience-pin` (PR #227), which
was closed unmerged on 2026-08-20.** `grep -in "merge doctrine"` over every `.md`
on `main` returned nothing; `main`'s sole trace of it was one sentence in
`docs/findings.md` recording that it was *absent*. **A doctrine whose only copy
is in a pull request is enforced by memory, and memory is the instrument this
register exists because it does not trust.** It is restated here verbatim, not
re-derived. That is `FLOOR-IN-PROSE-01`'s shape applied to a rule instead of a
number.

**HALF ONE — A MERGE INSTRUCTION NAMING A PR THE SEAT HAS NOT ITSELF REPORTED IS
A REQUEST TO VERIFY, NOT TO MERGE (ratified 2026-08-14).**

**The seat MUST refuse it, and refusing is doctrine rather than judgement.**
Two merge instructions were issued in one arc for PRs that had never existed —
`#226` before it was opened, and `#228` which was never opened at all. Both were
refused, and the refusal is the only reason neither cost anything.

The mechanism, named by the strategist against themself: **A PLAN WAS READ AS A
RESULT.** The seat reports what it *would* build; that report is read as a build
report; artifacts that exist only in a description get ruled on. **The
strategist will not issue a merge instruction without a SHA and a PR number
reported by the seat in the turn immediately prior.** Absent both, the
instruction is a request to verify.

⚠️ **AND THIS IS THE CLASS THE DISCIPLINE WAS NOT PROTECTING AGAINST, BECAUSE
THE DISCIPLINE RUNS ON THE CODE SIDE AND THE DISPATCH SIDE HAD NO GATE.** Every
code-side inverted premise costs a report, which is recoverable by measuring
again. A merge is not. So before ANY outward or irreversible step — merge, push,
publish, delete — assert the object exists **at the site the action names**
(`gh pr view <n>`, `git branch`, the file itself), never from the conversation
that described it. See `docs/findings.md` §43a.

**HALF TWO — A REPORTED SHA IS A CLAIM, NOT A FACT (ratified 2026-08-26).**

**Before the strategist rules on any merge report, THE SEAT VERIFIES ITS OWN
REPORTED SHA WITH `git cat-file` AND STATES THE RESULT.** State the negative
control too: a report that says only *"verified"* is indistinguishable from a
report that ran nothing (`EMPTY-INPUT-REPORTS-CLEAN-01`), so name at least one
object the check was expected to REJECT and show that it did.

⚠️ **THIS CLOSES THE DIRECTION HALF ONE CANNOT SEE, AND IT IS THE DIRECTION THAT
ACTUALLY FAILED.** Half one stops the strategist naming a PR the seat did not
report. **It has nothing to say when a report NAMES one and the strategist
ACCEPTS it** — which is the same object arriving through the one door the rule
holds open, wearing the credential the rule asks for. An unknown number of
rulings were made against merge reports citing PRs and SHAs this repository has
never held (`9c31c7f` · `#226` · `#228` are the ones recovered; the register
under-counts the class by construction, because a claim refused in conversation
leaves no trace). **The tree was sound throughout. The account of it was not**,
and no gate in this project reads an account.

⚠️ **THE COST ASYMMETRY IS WHY THIS IS DOCTRINE AND NOT A HABIT.** The check is
one command and cannot fail slowly. A merge performed on a SHA that does not
exist fails loudly; a merge performed on the WRONG object that does exist does
not fail at all. Half one guards the cheap direction. This guards the expensive
one. Filed as `DISPATCH-HEADER-CITES-A-NONEXISTENT-OBJECT-01`
(`docs/findings.md` §59c), whose subject is the same object one step earlier —
a SHA in a dispatch HEADER, arriving in the position that reads as context
rather than as claim, which is exactly what makes it the cheaper place to put a
wrong object.

### ⚠️ A MECHANISM WHOSE SUCCESS SIGNAL IS SILENT ABOUT THE DAMAGE IT DOES

Ruled 2026-08-27, from **four members measured in one session** — the drain of
a five-PR stack. Each of the four reported success. Each was doing damage its
success signal does not mention. They are one rule because the remedy is the
same in all four: **the signal is not the state; go and measure the state.**

| Mechanism | What it reported | What it was actually doing | The measurement |
|---|---|---|---|
| CI on `pull_request: branches: [main]` | `mergeStateStatus: CLEAN` | never ran — a PR based on a feature branch is outside the trigger | three PRs of the stack carried Vercel checks only; `build · floor · test:gate` was **absent** from `gh pr checks` |
| **squash**-merge on a stacked chain | merged · branch deleted · green | severed ancestry, so the next link's merge-base never advances | `main` tree **==** `pr/262` head tree (`39e955ae8359…`) while `pr/262` was **not an ancestor of main**; the next merge then conflicted in six files, one of them `add/add` |
| `--delete-branch` on a stacked chain | merged · branch deleted | **closed the next PR**, whose base ref ceased to exist | #263 merged `06:03:10Z`; #264 `base_ref_deleted` **and** `closed` at `06:03:12Z` |
| retargeting (`gh pr edit --base main`) | `mergeable=MERGEABLE` · `CLEAN` | did not gate — `edited` is not in the default `types` set | two retargeted PRs reached CLEAN with **no gate run**, which would have silently undone the fix for the first row |

⚠️ **`CLEAN` IS NOT EVIDENCE.** It answers *"is anything blocking?"*, and *"no
check was required"* is one of the ways nothing blocks. **Read the check LIST,
by name; say plainly when the gate is ABSENT.** Never report an aggregate — an
aggregate cannot distinguish "everything passed" from "nothing was asked."

**The operational rules that follow. Not advisory:**

- **NEVER squash-merge a stacked chain.** Use `--merge`: ancestry is precisely
  what the next link's merge-base reads. Squash remains the default for an
  ordinary single PR — the defect is squash **on a chain**, not squash.
- **NEVER `--delete-branch` on a stacked chain.** Delete by hand once the whole
  stack is on main, each branch first asserted to be an ancestor of main.
- **A retarget requires a gate run.** Retargeting emits `edited`, which is why
  `types:` is now spelled out in `.github/workflows/gates.yml`. If a retargeted
  PR still shows no gate, run the four locally on the merged base **and say that
  the local run is the only gate record there is.**
- **Repair a severed chain with `git merge -s ours main` on the branch** — never
  `-X ours` / `-X theirs`, which are a different operation and DO discard
  content. Assert the branch's tree SHA is the **same object** before and after;
  if it moved, what ran was not what you meant.

## Session startup — run these commands every time
git checkout main && git pull origin main

## Workflow for every task
1. git checkout main
2. git pull origin main
3. git checkout -b <type>/<short-description>
4. Make changes
5. git add .
6. git commit -m "description"
7. git push -u origin <branch>
8. Open a PR to main; the operator directs and approves, then the CLI merges via the GitHub UI (Squash + delete branch)

## Why
This project uses a branch + PR + CLI-merge workflow (the ratified four-actor
model). Changes reach `main` only through a reviewed PR: the operator directs
and approves, and the CLI merges via the GitHub UI (Squash + delete branch).
Direct pushes to `main` are not used.

## Current state (as-built: main @ #65 — F0 + I3 complete; Stage G planning canon on main)

> ⚠️ **AUTHORISATION NOW EXISTS (Batch A, §64).** `resolveRoles` no longer widens
> a persona to its whole atom set: it resolves the SEAT's business roles
> (`services/transitions/businessRoles.ts` — **derive the roles from the
> `SystemRoleId` union and `LANE_BUNDLES`; no figure is written here** — plus an
> `automation` grant that is deliberately NOT assignable to a person).
> **There is no persona fallback**; a command scope without `businessRoles` is
> refused, because a fallback is the wildcard with better manners. The cascade
> fan-out runs under the automation grant — it re-dispatches inside a `catch {}`,
> so it is the one path where a narrowed grant deletes a reachable act in
> silence. `PERSONA_ROLES` survives as a DERIVED tenancy view and is no longer an
> authorisation source. **Do not restate the atom or role counts here** — derive
> them from `SYSTEM_ROLES` × `catalogRoles()`; the bilateral gate in
> `businessRoles.test.ts` is what keeps them honest.
>
> **The cross-role handoff renders the wait, not a gap** (`handoff.ts` +
> `HandoffNotice` + `useVerbAvailability`) — wired across the BUYER surfaces at §72–§76, and it is **ONE NOTICE PER VERB, IN THAT VERB'S OWN SLOT** (§76 retired §74's per-group collapse: the RFQ side panel is a WORKSPACE, not a control, and the two verbs one group notice spoke for are not co-reachable on any RFQ in the tree).
> ⚠️ **DO NOT RESTATE HOW MANY SURFACES CARRY IT** — the sentence that stood here was a prose count and it was wrong TWICE, once per batch, which is `FLOOR-IN-PROSE-01` in the paragraph about handoffs. Derive it as **(surface × verb)** from the `testId="handoff-…"` sites against BOTH dispatch families. **THE SUPPLIER SIDE IS COVERED TOO, AND THE SENTENCE THAT SAID OTHERWISE IS DELETED RATHER THAN CORRECTED.** It read *"every supplier-side surface (a supplier seat is exactly `['supplier']` — no proper subset to narrow to, so every notice is dead branch)"*. That reason died at #263, which seeded `commercial` · `fulfilment` · `back_office`; **six supplier surfaces already carried notices while it still stood**, so it was describing the tree it was filed against, not the tree. Derived today: **no supplier atom is held by all three lanes** — the intersection is EMPTY — so "every lane holds it" is never the reason on this side. What is deliberately NOT covered: every control that holds **no atom** (toasts and reads are ungoverned, not withheld — §75e), and **`GRInspectionWizard`'s interior** (`WIZARD-ADMITS-A-SEAT-IT-WILL-REFUSE-01`, OPEN — closed at both known entrances, unprobed within).
>
> ⚠️ **AND A NOTICE ON THE SURFACE IS NOT COVERAGE OF THE VERB — THE ENTRANCE IS THE UNIT (§84).** `SupplierOrders` imported the guard, rendered it, and still shipped a live commit: `po:confirm`'s notice gated the `detail` footer, while `handleRowAction` opened the panel *directly* in `editing` mode, where the commit sat ungated behind a comment asserting it was "unreachable behind this one." **That comment was the only thing holding the claim up, and it was false.** Derive coverage as **(surface × verb × ENTRANCE)**, never (surface × verb): a mode reached three ways is guarded when the MODE is gated, not when one door is. And gate the mode rather than the door for a second reason — **component state outlives the seat**: a seat narrowed WHILE a panel or tab stands open is reachable, not a dead branch (`SupplierShipments` says so in its own comment and is the precedent to copy).
> ⚠️ **AND THE SEGREGATION THE BUNDLES EXPRESS IS CROSSED BY ONE SURFACE (`SEGREGATION-CROSSED-IN-ONE-DRAWER-01`, §76d, OPEN).** `BuyerRequisitions`' drawer offers `pr:revise` → `pr:submit` → `pr:approve` on the same document to the same seat, and the DEFAULT buyer seat holds all six role bundles — so adjust-then-approve-what-you-adjusted is the out-of-box state, not a misconfiguration. A per-transition dispatcher cannot catch it: segregation is a property of the SEQUENCE. **Do not "fix" it with a notice or a role gate without the ruling** — §76d names the two candidate readings and measures that the actor-level one is unbuildable until an IdP answers (`actor` is always `UNATTRIBUTED: NO_PERSON_IN_SESSION`).
> 
> ⚠️ **AND IMPORTER PRESENCE IS NOT VERB COVERAGE (`IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`, §72a).** `BuyerRequisitions` imported the guard, rendered four of them, and still shipped a live **New PR** button to a seat holding no `pr:create` — because all four guarded verbs act on a document already selected and the CREATE verb lives in the page header. Derive the exposure as **(surface × verb) → guarded?**, never as **surface → imports the guard?**, and derive the surfaces from BOTH dispatch families (`commandHooks` AND the `sdc*Hooks` that call `svc.commands.dispatch` directly — a `commandHooks`-only matcher misses seven verbs).
>
> The resolved actor is a SEAM, not a person: `CurrentIdentity.actor` is always
> `UNATTRIBUTED: NO_PERSON_IN_SESSION`. **C10 §6.2's payload-refusal half is NOT
> built** and is guarded by a tripwire in `simUsrNamespace.test.ts` — the moment
> shipped code constructs a `RESOLVED` actor, the refusal must land first.
>
> **AUTHORISATION IS NOW VISIBLE (§65).** The identity panel (`IdentityPanel`,
> in the avatar) states the seat's role and the scope it grants, and is the ONE
> role control — a sidebar chip block was built and rejected, and must not come
> back. `/buyer/roles` is a READ-ONLY catalogue (list → detail), derived from
> `SYSTEM_ROLES` × `getKnownFlows()`. It is UNGATED deliberately: **no page in
> this platform has ever gated on role**, no atom could express it (C10 §3.3),
> and the gate is filed as the precondition of EDITABILITY, not of reading.
> Nothing persists a custom role — no store, no target — so duplicate-and-narrow
> is a store, a verb and a merge rule, not a page feature.
>
> **CUSTOM ROLES EXIST, FOR THE SESSION (§66).** A custom role is
> `{ parent, adds }` — a PARENT REFERENCE resolved at read, never a snapshot of
> atoms, because a snapshot silently keeps yesterday's truth the moment the
> parent gains one. It is granted by `t_role_grant` (`flows/role.flow.ts`),
> which follows `t_enforcement_set` verb for verb: single state `Defined`,
> `statePreserving`, append-only ledger, CommandTarget, policy hook, and
> `entityId` IS the parent `SystemRoleId`. **`role:grant` is a `compliance`
> atom** — whoever can edit roles can grant themselves any verb, so procurement
> cannot hold it. **A CUSTOM ROLE MAY NOT SPAN TENANCIES**, refused at the verb
> by name, per atom. The store (`services/transitions/customRoles.ts`) is
> **PERSISTED in `localStorage` under `paragon.customRoles`** (operator ruling,
> superseding session scope: an honest statement does not repair an experience
> that looks like a defect). **Only CUSTOM roles are written** — the seeded ones
> stay derived from the frozen constant, and a stored row claiming a system id is
> refused ON READ by name. **The read fails honestly:** absent, corrupt and
> unparseable are distinguished from empty (`readState().unreadable`), every row
> is re-validated through the SAME predicates the verb calls, and refusals are
> rendered rather than absorbed. A grant is still recorded against
> `UNATTRIBUTED: NO_PERSON_IN_SESSION`, and the surface says so before the act. **Every SEAT resolves through `atomsForSeat`, never
> `atomsFor`** — the call sites are derived from source and allowlisted
> bilaterally in `businessRoles.test.ts`. **ASSIGNING a custom role to a seat is
> NOT built** (§66k): `rolesFromStorage` would silently re-widen such a seat to
> its whole persona on reload, and that line is the assignment batch's first fix.
>
> ⚠️ **`ROUTE-SMOKE-GUARD-IS-SELF-REFERENTIAL-01` (§65a).** `allRoutes.smoke`'s
> coverage guard asserted its OWN table's length against a hardcoded number and
> never read `AppRouter` — it could not detect the defect its comment named, and
> was hiding three untested routes. It now DERIVES from the router source and
> asserts membership both ways. **A page also has to bring its own chrome:**
> `AppRouter` is a flat `<Routes>` with no layout route, so a page that forgets
> `AppShellV2` renders with no sidebar and no way back, and
> `renderWithProviders` will never say so.
>
> ⚠️ **THE APPROVAL BAND IS AUTHORED, AND THE LADDER IS UNBUILDABLE — NOT DEFERRED
> (§69).** `approvalLevel` ('Section Head' / 'Procurement Head' / 'VP Procurement')
> tracks `estimatedValue` closely enough to read as computed and **nothing computes
> it**: zero relational or arithmetic reads of `estimatedValue` exist in the tree and
> no threshold number exists in `src/` or `docs/`. The surface now SAYS it is
> authored; `approvalBandAuthored.guard.test.ts` re-derives it every run (write-site
> assertion primary, read-site secondary and labelled weaker).
> **Both readings of what a band decides fail independently:** WHO MAY APPROVE needs
> seniority roles that do not exist and C10 §3.4 forbids minting (*"a new role per
> band"*); HOW MANY APPROVALS needs the `ApprovalPolicyAct` × `ApprovalAct` ledgers
> C10 §3.5 defers. Either ground alone is sufficient.
>
> ⚠️ **AND DO NOT INHERIT "THE POLICY HOOK CANNOT SEE THE DOCUMENT" — IT IS FALSE AND
> IT HAS ALREADY STOPPED ONE BATCH.** `PolicyHookFn` takes ONE ctx
> (`{ entityId, currentState, toState, payload, target, scope }`), `CommandTarget.
> readEntity` is *"Full entity for policy hooks to inspect"*, and FOUR shipped hooks
> read a document through it (`policies.ts:64/87/104/263`) — none by importing a
> store. What a threshold lacks is the RIGHT-HAND SIDE of the comparison, not the
> left. A role-gated VALUE policy (value from `readEntity` × lane from
> `scope.businessRoles`) is buildable today and is **not** the ladder: it
> discriminates lanes, and the rungs are altitudes.
Re-baselined by the **Canon True-Up** (2026-07-14). The prior "main @ #53" pointer
was stale by ~12 commits; F0 (contract-freeze) and the I3 compliance phase are DONE,
and the Stage G planning canon + World-Class Build Plan are now on main.

- **Phases 0 → 2′ (historical, all merged).** Phase 0 (PRs #11–#17); Phase 1′
  page/read migrations + gates + DP-1/2/3 theme (PRs #18–#31); v2.2 Step 1 Canon
  True-Up (#32) + Step 2 Batch 1.4 canonical `PurchaseOrder` + Phase 1′ exit audit
  (#33–#34). **Phase 2.1′ transition schema + dispatcher + PO-confirm proof
  (3.1–3.11) BUILT** (PR #35). **Phase 2.2′ verb batches BUILT** — ASN (#36),
  GR (#37), Invoice/DR-7 (#38), RFQ-award cascade (#41). Design polish (#39–#43)
  + full EN/ID i18n Batches 0–6 + coverage sweep (#44–#53).
- **Command spine is complete and wired end-to-end:** canonical state-machine
  schema + dispatcher (legality + role + fields + `QueryScope` + policy),
  `CommandResult`/`getCommandStatus`/`settle` (Option-B SAP boundary), DR-10 event
  taxonomy (`TransitionEvent` + `AuditSink`, in-memory), cascades (RFQ→quotation,
  GR→ASN). PO/ASN/GR/Invoice/RFQ-award verbs run against in-memory stores.
- **Phase 2′ exit is STAMPED contract-complete as of F0.4 (PR #58).** The
  lifecycle machines are authored under `src/services/transitions/flows/`.
  ⚠️ **DERIVE HOW MANY FROM `getKnownFlows()`, NEVER FROM THIS SENTENCE** — it
  read *"All 10 lifecycle machines … across 13 flow files"* until 2026-08-27,
  by which time the registry held neither figure. The F0.4 set was PO · ASN ·
  GR (+ line) · Invoice (+ match) · RFQ · Quotation · Shipment · Contract ·
  Obligation · PurchaseRequisition · SupplierDocument; flows have been added
  since and will be again. The sole remaining
  census machine — the ONE canonical compliance machine that collapses the 5
  fragmented vocabularies (census #11–15) — rides R2.2 DTO-v2. Of the F0.4 five,
  **FOUR remain author-unwired inert registry data**
  (Shipment/Contract/Obligation/SupplierDocument): no CommandTarget, no cascade
  link, roles mapped for catalog-coverage only (DNA-SEED-01 contract surface, no
  UI consumer). **PR is NO LONGER among them** — corrected 2026-08-03: it was
  wired at G1.1 and dispatches (`MockCommandService.ts:547-593`, registered
  `:983`).

  ⚠️ **THE TARGET-LESS FLOWS ARE A SET DIFFERENCE, NOT A LIST — RUN
  `getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`.** This line has been written out
  as a list twice and gone stale both times, in opposite directions: R2
  (2026-08-12) had to correct *"four"* to seven because it counted only the
  F0.4 machines and never the two rolled-up sub-flows or the compliance
  machine; then on 2026-08-27 **`supplierDocument` was wired and left the set
  without anyone touching this sentence.** A membership list decays silently
  every time a flow is wired, which is the whole argument for deriving it.
  **⚠️ NAME COMPLIANCE SPECIFICALLY: I3 is stamped COMPLETE below
  and `BuyerCompliance` really does read through the seam — but the compliance
  MACHINE IS READ-ONLY. `t_compliance_submit` / `_verify` / `_reject` CAN NEVER
  FIRE.** A complete read path and an inert write path are compatible, and
  nothing in the I3 stamp said which one it meant. Every member of that derived
  set IS honestly badged `AUTHORED — UNWIRED` on `/buyer/process-flows`
  (verified by rendering, R1) — the defect was in this file, not on the surface.

  ⚠️ **THE WIRED-COMMANDTARGET COUNT IS DELIBERATELY NOT WRITTEN HERE.** Derive
  it from `WIRED_COMMAND_TARGETS` — the runtime export of `TARGETS` in
  `MockCommandService.ts`, which is the one place it can be true. The sentence
  that stood in this spot carried a figure, and it was restated and re-corrected
  repeatedly (*"6"*, then *"10"*, then *"11"*), each right on the day it was
  typed and stale within weeks; the line references shipped beside it had
  drifted ~150 lines as well, so even the pointer rotted. **`FLOOR-IN-PROSE-01`,
  in the paragraph that exists to warn about it — which is why the remedy is to
  delete the number rather than to write a newer one.** It is
  deliberately **contract-complete, NOT behavior-complete** — remaining verb
  wiring (and each machine's CommandTarget) rides its Stage-2 surface (FORK-2
  hybrid). Clock-projected states stay out of every transition table (law 0.5);
  the fixtures that still store them as literals are F0.4-FIND-01 (read/DTO-v2).
- **Backend is greenfield.** Zero server code / datastore clients; data is
  in-memory fixtures behind `mockDataService` (`src/main.tsx`); tenant scoping is
  enforced client-side. `httpDataService` is the designed Phase-F1 swap
  (`DataServiceContext.tsx`) — pages do not change when it lands.
- **I3 compliance phase COMPLETE** (PRs #61–#64): I3.1 canonical compliance
  machine + DTO-v2 read (fixture-first, SIMULATED); I3.2 re-pointed BuyerCompliance
  + widget onto the seam and **closed COMPLIANCE-CARVEOUT-01**; I3.3 simulation
  depth + SIMULATED→LIVE flip harness (LIVENESS-DATASOURCE-01, two-gate honest
  render); I3.4 minimal scripted halal-renewal walkthrough (FORK-1=(c)). The
  17-Oct-2026 SIMULATED→LIVE flip is proven; it flips when its Track-R prerequisite
  lands. BuyerCompliance now reads via `useDataService()` (carve-out retired).
- Consumption pattern is standardized: TanStack Query v5 over `useDataService()`,
  scoped query hooks (per-supplier cache isolation via `scopeKey`), a typed
  `DataError` contract, the `Page<T>` list envelope (shape frozen; no pagination
  machinery), and a dev-only, env-gated chaos mock.
- Fixtures are multi-tenant (sup-002 / sup-005 / sup-007); a service-level
  scoping contract guards buyer-superset / per-supplier-isolation / SCOPE_DENIED.
- Locale + i18n: `formatIDR / formatDate / formatNumber` (Asia/Jakarta) and a full
  EN/ID react-i18next layer (per-page fragments + central label maps) are live.
  Test floor: **`scripts/floor.json` holds it** (never regresses; asserted by
  `npm run gates` and by CI). **No floor number is restated here, deliberately**
  — the figure that stood in this spot had drifted more than 1400 tests behind
  the suite, uncorrected, because no build step failed when it stopped being
  true (FLOOR-IN-PROSE-01, CP-3a). `npm run gates` fails if this pointer is
  deleted, since deleting it is how a number comes back.

### Forward plan vocabulary (Stage F / I / A)
- **Canonical forward plan:** `Paragon_World_Class_Build_Plan_v1.md` (on main at
  repo root, merged #65; executes `docs/Paragon_Platform_Strategic_Spine_v1.md`).
  It supersedes the *sequencing* of `docs/Supplier_Portal_Revised_Build_Plan_v2_2.md`
  from Stage 1 onward; v2.2 remains the Phase 0–2′ record + ratified-decision
  register (DR-6/7/9/10, DP).
- **Stage G planning canon is on main:** `docs/Stage_G_Grid_Planning_Layer_Plan_v1.md`
  + `docs/Grid_Planning_Layer_Investigation_2026-07-14.md` (ratified; PLANNED-as-axis
  doctrine, I6 anchor).

  ⚠️ **CORRECTED 2026-08-20 — THIS POINTER NAMED AS "NEXT" A BATCH THAT MERGED
  FIVE WEEKS EARLIER, AND FOUR BATCHES HAVE LANDED PAST IT SINCE.** The sentence
  read *"G0.1 (the C6 planning-doctrine contract) is the next Stage-G batch, gated
  on G-PRECOND (this true-up is the last precondition item)."* Derived: **G0.1
  merged 2026-07-14 as PR #67** (`dc059fc`, and `docs/contracts/C6-planning.md`
  has read `Status: CONTRACT · authored G0.1` ever since), and Stage G ran on
  through **G0.2 · G1.1 · G1.2a · G1.2b · G1.3**, the last of them on
  2026-07-15. **G-PRECOND was satisfied the day before G0.1 opened** — the Build
  Plan merged at #65 on 2026-07-14 — and `Stage_G_Grid_Planning_Layer_Plan_v1.md`
  still carried it as `OPEN — operator` until this true-up.

  Derivation, re-runnable: `git log --format='%ad %s' --date=short | grep -oE
  '^[0-9-]+ G[0-9]\.[0-9][a-z]?' | sort -u`. **Stage G is DORMANT, not next** —
  it stands where G1.3 left it and is not on the recalibrated path below.
- **Stage F — Foundation** (governed data + integration backbone): **F0**
  contract-freeze & ledger truth (F0.1–F0.6 COMPLETE; F0.6 = LivenessRegistry,
  PR #60 closed F0) → **F1** real backend
  core (`httpDataService`, OIDC, durable audit; SE Team) → **F2** S/4HANA event
  seam (Event Mesh + OData; INT-TMS-01 is a sub-case) → **F3** Snowflake +
  data-quality prerequisites.
- **Stage I — Intelligence:** I1 spend classification · I2 should-cost/commodity-FX
  · I3 risk + halal/BPOM compliance (a platform capability modeled fully; NO
  external deadline gates the build — certification is handled manually by the
  compliance team) · I4 3-way match + e-Faktur · I5 guided-buying intake · I6
  BOM-linked sourcing. Each ships fixture-first behind honest markers, flips Live
  when its Stage-F prerequisite lands.
- **Stage A — Agentic** (disciplined/bounded): A1 copilot · A2 document
  intelligence · A3 bounded task agents · A4 advanced levers (buy-vs-build).
- **Track R** (halal). ⚠️ **RE-PRIORITIZED 2026-08-20 — THIS IS THE OPERATOR
  REVERSING THE OPERATOR, AND IT IS RECORDED AS A REVERSAL RATHER THAN AN EDIT.**
  The de-pressurization ruled on 2026-07-15 (PR #75) said Track R is a normal
  capability on equal footing with every other lane and that no external deadline
  gates the build. That ruling is **SUPERSEDED FOR SEQUENCING ONLY**: Track R is
  now **arc 1**, the first arc on the recalibrated path below. What is NOT
  reversed: certification is still handled manually by the compliance team, the
  four operator inputs (D-CAL / D-STAFF / D-SAP / D-DPO) are still non-blocking,
  and **no honesty marker moves** — `compliance` stays SIMULATED behind its
  two-gate guard until the real harvest lands (LIVENESS-DATASOURCE-01).

  The regulatory date is real and derivable in-tree: **17 October 2026**, GR
  42/2024, BPJPH — carried at `docs/Paragon_Platform_Strategic_Spine_v1.md:102`,
  `docs/Halal_Compliance_Control_Design_v1.md:9`, and as the `BPJPH_MANDATE_DATE`
  constant behind `complianceProjection.schemeValid`
  (`src/services/data/complianceProjection.ts`). ⚠️ **THE DAYS REMAINING ARE NOT
  WRITTEN HERE.** A countdown in prose is wrong every day after it is typed —
  `FLOOR-IN-PROSE-01` with a clock attached, and the one variant that decays
  with nobody touching the file. The line read *"58 days from 2026-08-20"* and
  was already stale when it was next read. **Subtract today from the constant.**
  What changed is not the date — it was always there — but which lane the seat
  spends its next batches on. It feeds the Stage-2 I3 compliance primitive.

### THE RECALIBRATED PATH (ruled 2026-08-20; supersedes the Stage-G "next" pointer)

Three arcs, in order. Nothing else is queued.

- **ARC 1 · TRACK R — the halal lane made operable.** Three deliverables, and
  every one of them is a SURFACE or a WRITE PATH, never a register entry:
  1. **An operator-editable certificate registry.** Today `COMPLIANCE_REGISTRY`
     (`src/services/data/mock/fixtures/complianceRegistry.ts`) is **16 frozen
     rows** — `readonly … = [ … ]`, every supplier `"Sample … (illustrative)"`,
     every cert number a `SAMPLE-…` token, every material `RM-SAMPLE-…`. Derived:
     `compliance` is one of the **seven flows with no `CommandTarget`**
     (`getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`), so `t_compliance_submit` /
     `_verify` / `_reject` **cannot fire**. There is no write path of any kind:
     nobody — operator, buyer or supplier — can add, edit or expire a
     certificate. **That is arc 1's first deliverable.**
  2. **The expiry projection on real dates.** `complianceProjection.ts` already
     computes display status and scheme validity from `expiryDate` + issuer
     (clock-states never stored, law 0.5). It has never once run against a date a
     person entered.
  3. **The receipt gate reading it.** `verifyHalalAtReceipt`
     (`src/services/data/halalVerification.ts`) is authored, tested, and
     **HEADLESS BY RULING** — its own header forbids acquiring a consumer there,
     because `COMPLIANCE_REGISTRY`'s codes are `RM-SAMPLE-…` and
     `MATERIAL_MASTER`'s are not, so **the intersection is empty by construction**
     and a wire today would refuse 100% of real receipts. **(1) is what makes (3)
     safe to wire** — that is the whole reason the arc is ordered this way, and
     H4 / `D-COMP-HALAL-4` is the gate it opens.

- **ARC 2 · THE REQUISITION LANE.** ⚠️ **The dispatched premise inverted twice,
  and the lane is in WORSE shape than "unreachable", not better.** Derived:
  `purchaseRequisition` **IS** a wired `CommandTarget`
  (`MockCommandService.ts:1292`), so `t_pr_submit` / `t_pr_approve` /
  `t_pr_reject` are dispatch**able**; and procurement's entry point **DOES** have
  a page — `/buyer/purchase-requisition` → `BuyerRequisitions`
  (`AppRouter.tsx:111`), alongside `IntakeReview` and
  `plan-grid/IntakeAdjustDrawer`. What is true is sharper: **only `t_pr_create`
  has a hook and a caller.** The panel ships a `Draft` → **"Submit for approval"**
  button that fires a **`variant: 'success'` toast and closes the drawer** — no
  dispatch, no state change (`BuyerRequisitions.tsx:520-532`); the `Approved` →
  "Create PO directly" / "Create sourcing event" button does the same
  (`:501-519`); and `Pending Approval` carries **no approve or reject affordance
  at all**. An unreachable verb is silent. **This one tells the buyer it
  succeeded.** Arc 2 is the approval half of the lane, and the two false
  affordances are its first fix.

- **ARC 3 · SUPPLIER ONBOARDING.** ⚠️ **AMENDED 2026-09-01 — THE MECHANISM
  SURVIVES MEASUREMENT, THE CONCLUSION DOES NOT.** Re-derived today, and the
  hard half still holds exactly: `src/pages-v2/SupplierRegistration.tsx` behind
  `/register` contains **zero** service calls — `grep -c 'useDataService'` and
  `grep -c 'dispatch'` both return 0 — the whole form lives in `useState`, and
  submitting still sets a `const [submitted, setSubmitted] = useState(false)`
  boolean. **The supplier-side WRITE PATH is unbuilt, and that is arc 3.**

  ⚠️ **THE LINE COUNT IS DELETED RATHER THAN CORRECTED.** It read *"1,551
  lines"* and measured 1,554 today — `FLOOR-IN-PROSE-01` again, in the
  paragraph that scopes an arc, and the ratified remedy is deletion in favour
  of the derivation (`wc -l`), never a fresher number.

  ⚠️ **AND THE CLOSING SENTENCE IS RETIRED, BECAUSE ARC B FALSIFIED IT WITHOUT
  TOUCHING THIS PARAGRAPH.** It read *"A supplier completes onboarding and
  nothing anywhere records that they did."* Arc B built the
  `supplierApplication` machine, its store, its `CommandTarget`, and the buyer
  review lane (#287–#289), so an application IS recorded — **a BUYER raises
  it.** What no surface does is let the SUPPLIER raise their own, and `/register`
  no longer pretends otherwise: it stopped minting a fabricated
  `APP-2026-{random}` under the label "Application number", and
  `registrationHonesty.guard.test.ts` holds that closed bilaterally. **The gap
  is now one-sided, not total** — which is a materially different arc from the
  one this bullet used to describe, and the difference decides whether arc 3
  builds a machine or only a door onto one that exists.

**PARKED, NOT QUEUED — and the reason is one sentence: THESE ARE MACHINE HYGIENE,
NOT MANDATE WORK.** Every one of them makes the tree more consistent with itself;
not one of them puts a capability in front of a person. They stay open, they stay
derivable, and they are picked up when an arc's own surface work touches them —
never as a standalone batch:

  - **The dead-end states.** The derived population is **37 non-terminal states no
    surface can leave, across 12 of 18 flows** (`docs/findings.md` §48g — derived
    with cascade targets and `settlesTo` edges folded in; without those two
    corrections the same derivation returns 43 and condemns both working SAP
    boundaries). ⚠️ The dispatch called this *"the eight fixture-only states"*;
    **no derivation in this tree returns eight**, and the two nearest real figures
    are that 37 and §49a's 18.
  - **GL-0b's unregistered unions.** GL-0 derived **143 closed string-literal
    unions / 580 members** across `src/` and registered 18 of them / 66 terms;
    **125 remain** as GL-0b's worklist. The figure is GL-0's derivation, named
    here rather than restated as if freshly measured (§27).
  - **The 29 stored-field allowlist rows** (`src/lib/storedFieldGate/allowlist.ts`
    — 29 `key:` entries, derived at read time). Each is a stored field carrying a
    stated reason instead of a reader; the list can only ever shrink truthfully.
  - **R1d.** ⚠️ Parked as named, with a caveat that belongs in the parking
    notice: **`R1d` occurs exactly ONCE in the register** (`docs/findings.md:14727`,
    inside an UNTOUCHED list) and **is defined nowhere in the tree**. It is parked
    as a token, not as a scope. Whoever un-parks it defines it first.

- **Adjudicated forks:** **FORK-1 = (c)** (minimal scripted halal-renewal
  walkthrough at I3; full Learn absorbed into the A1 copilot). **FORK-2 = hybrid**
  (author all remaining flows; wire opportunistically per Stage-2 surface).

## Routing
Routing is HashRouter (`src/router/AppRouter.tsx`) — not BrowserRouter. The `/`
home redirect points to `/buyer/dashboard`; unknown routes render a real 404
(`src/pages-v2/NotFound.tsx`).

Most routes are persona-prefixed (`/buyer/…`, `/supplier/…`). Two are
deliberately NOT: `/marketplace` and `/glossary` (GL-1). The glossary is reached
by term chips that sit on BOTH personas' refusal sites, so a persona prefix
would have sent half its readers out of their own shell; it is listed in both
nav groups under one neutral key, `nav.glossary`.

## Design principles

### DP-1 — Fiori-aligned visual language
- No dark solid backgrounds as content surfaces. Hero/identity cards restyle to
  light surfaces: white / light-neutral card, subtle border, navy (`#0D1B2A`)
  text, teal (`#0097A7`) decorative accents, action (`#0070F2`) interactive,
  mid (`#354A5F`) secondary text.
- Odyssey colors are accents, not fills. Semantic color (green/amber/red) is
  reserved for state (as the KPI tiles already do).
- Reference grammar: light shell, white cards, thin borders, high information
  density, restrained color.
- Applied opportunistically per touched page (formatter precedent) — restyle
  when a batch touches the page, never as a standalone sweep. Applies from
  Batch 1.1b onward. If a shared token / card-variant change makes it cheap,
  propose it in that batch's investigation rather than patching per-page.

### DP-2 — Restrained beauty-tech palette (extends DP-1)
- TWO distinct roles — do NOT conflate: **action** (`#0070F2`) is the ONE
  primary-interactive color — primary CTAs, selected / active states, the blue
  a user acts on. **teal** (`#0097A7`) is decorative / accent ONLY — charts,
  score dials, cert highlights, low-emphasis view-links — never a selected/active
  affordance or a primary action. Navy (`#0D1B2A`) is text/headings only — never
  a decorative fill. Mid (`#354A5F`) is secondary text. Surfaces stay white /
  light-neutral with subtle borders.
- ⚠️ BUTTON HIERARCHY (DP2-BUTTON-01, **AMENDED §68 — THE RESERVED-SOLID
  REGISTER IS RETIRED**): primary action = action-blue **OUTLINE**
  (`Button variant="outline"`), and it is now the ONLY primary register.
  Export / Cancel / Close / secondary paths stay `variant="secondary"`; an
  Export never occupies the primary slot.

  **SOLID action-blue no longer exists in this portal.** The prior rule reserved
  it for consequential / irreversible commits — Award (RFQ), Release payment,
  Post-to-SAP, Reject / Dispute, Override-hold, at most one per surface — and
  exempted WhatsApp / messenger chrome from DP-2 (D-2). **All of that is
  retired, messenger chrome included** (operator ruling, §68).

  **THE RULE IS ENFORCED BY A TYPE, NOT BY THIS PARAGRAPH.** `Button`'s
  `Variant` union has no `'primary'` member, so every route back is a `tsc`
  failure; `src/pages-v2/solidButtonRetired.guard.test.ts` covers what a type
  cannot. **Do not restate the site count here** — the literal scan that opened
  the sweep was incomplete four ways (a `BulkActionsBar` prop, an
  `invoiceActionModel` flag that also drove a confirm step, two typed
  `'primary' | 'outline'` helpers, and `Button`'s own DEFAULT), and the last two
  were found by the type after the union member was removed, not by any scan.
  If solid is ever wanted again, amend this paragraph AND the type AND the gate
  together — changing one of the three is how the register comes back.
- Semantic color (green/amber/red) is ONLY for true state, in soft/muted
  variants — never saturated decoration. If a chip's color doesn't inform a
  decision, it goes neutral.
- WARNING token is a FILL/TEXT split (DP2-WARN-01), same shape as `action`:
  `warning.DEFAULT` = bright amber `#D97706` for every GRAPHICAL warning use
  (accent-edges, dots, bar fills, dials, chip fills, borders — 3.19:1 on white,
  meets the 3:1 non-text floor); `warning.hover` = dark amber `#8A5606` is the
  ONLY warning color for TEXT on light (`text-warning-hover`, AA on white 6.2:1
  and on warning-soft 5.6:1). `text-warning` must never be used — the bright
  DEFAULT fails AA as text. `warning.soft` (#FEF3D6 chip/banner tint) unchanged.
  The old burnt `#B45309` is retired from the token; `CHART_SEMANTIC.warning`
  (chart strokes / flow-band fills with white text) is a separate concern.
- TARGET/KPI bars are ONE system (DP2-TARGET-01), centralized in
  `chartPalette.ts`: `targetStatus(pct, target, nearBand=10)` →
  meeting | near | missing, and `TARGET_STATUS` gives the fill/text colour
  (meeting = success, near = the DP2-WARN-01 amber split, missing = danger).
  Every target bar renders via the shared `<TargetBar>` primitive — fill +
  a navy target-tick — so attainment is colourblind-safe (position vs tick,
  not colour alone). KPI fixtures carry a numeric `targetPct` (the tick, on the
  same 0–100 axis as `pct`); the old hand-assigned per-row hex + the duplicated
  KPI colour consts are gone. Pass-warn-fail cells (Analytics) and the supplier
  dashboard perf bars derive from the same helper (target 90). Grade A–D ramps
  are a separate axis, not yet unified here.
- Charts consume ONE ordered series ramp from `src/lib/chartPalette.ts`
  (`CHART_SERIES`: teal → navy → teal-tint → navy-tint → neutral grey). No
  rainbow donuts, no per-page ad-hoc hex. Migrate chart colors opportunistically
  per touched page (SupplierPerformance is the first natural migrant).
- Decorative color flattens: colored icon backgrounds, gradients, and multi-hue
  step chips collapse to the neutral + teal system.
- Applies every batch from 1.3 onward. Messenger-chrome exemption (D-2) and
  GradeBadge / status semantics stand where they inform.

### DP-3 — Odyssey platform family theme (TMS alignment; extends DP-1/DP-2)
The Supplier Portal adopts the TMS Control Tower visual language so the Odyssey
family reads as one product line.
- TYPOGRAPHY: monospace for all DATA — document numbers (PO/GR/RFQ/CTR/SH), SAP
  refs, material codes, currency amounts, dates/times, tracking refs. Clean sans
  (current) for UI labels, headings, body. Implemented centrally via a
  font-family token (tailwind.config) + a data-cell convention; exact mono face
  (JetBrains Mono / IBM Plex Mono, checked for IDR digit legibility) confirmed in
  the DP-3 seam investigation.
- DATA-TOKEN COLOUR (DP2-DATA-NAVY-01): mono data tokens render in `data-navy`
  (`#1E3A5F`, reusing the dormant `--paragon-navy-light`), NOT near-black. Applied
  centrally in the `<Data>` primitive + `KpiCard` hero number — every doc number,
  currency value, quantity, date, and KPI figure lifts from `#0D1B2A` to
  data-navy; an explicit muted (secondary/tertiary) or semantic
  (success/danger/warning/info) colour on a token is preserved. This is the
  mono/sans grammar as colour: **mono = data = data-navy · sans = names/prose =
  `text-primary` black** (supplier company names stay black by design). data-navy
  is deliberately DISTINCT from action `#0070F2` — a full lightness tier darker
  (11.5:1 vs 4.6:1 on white, AAA as text) and desaturated, so a data value can
  never read as clickable. DP-3 "identifiers, not links" holds: mono face, no
  underline, no hover — recolouring to a NON-action navy reinforces it. The
  `action` token is untouched.
- STATUS CHIPS: quiet outlined style — soft tint background, thin border, small
  radius, no solid saturated fills. DP-2 semantic-color rules unchanged.
- TABLES: light grey header band, thin row borders, generous row height.
- DELIVERY: one small dedicated theme-token PR (central tokens + StatusPill +
  table primitives only) immediately after PR-B merges — investigation-first, no
  per-page sweep. Page-level cleanup stays opportunistic.

## Deriving a population — STANDING HEURISTIC (not arc history)

Whenever you answer "which things are X?" by scanning the tree — dead modules,
uncalled verbs, unbacked affordances, missing i18n keys — **derive the
population; never work an inherited list.** A scope written before its
predecessors ran is a list. The rules below were earned across the arcs recorded
in `docs/findings.md` (`CENSUS-MUST-DERIVE-01`, the bilateral loose-end census,
`ENF-SEED-LIST-IS-NOT-THE-VOCABULARY-01`, `FLOOR-IN-PROSE-01`, the R1
false-affordance sweep, and GL-1) — **the rules are numbered below and the
numbering is the count.** (It read *"Two rules"* while three were numbered
underneath it, from GL-0 until GL-1 corrected it: a cardinality restated in
prose, in the section that forbids restating cardinalities in prose. §27 /
`FLOOR-IN-PROSE-01`, in its own house.)

1. ⚠️ **A DERIVED POPULATION THAT COMES BACK SUSPICIOUSLY SMALL OR SUSPICIOUSLY
   ROUND IS REPORTING ON ITS OWN MATCHER, NOT ON THE TREE.** Treat a clean
   result as a bug report about the instrument until you have proved otherwise.
   Both of R1's were this signal: **"0 verbs with no caller"** (two catalog
   files name all 91 by construction) and **"16 orphans"** (an import matcher
   that could not cross a newline — it condemned ~2,000 lines of live code,
   including a walkthrough the operator had specifically ruled to build).
   Sanity-check by asserting a known-true member is present and a known-false
   one is absent, before reporting anything.

   ⚠️ **GL-1 · THE RULE FIRED ON THE SEAT THAT WROTE IT.** The refusal sites were
   derived **from a list of map names read off an earlier grep — a list, not a
   derivation.** The proper derivation (registered vocabularies →
   `Record<Vocab, string>` declarations → uses) immediately named a **21st site
   the list never contained**, because its map is
   `Record<Exclude<QtyRefusalReason, 'EMPTY_QTY'>, string>` — **a shape the eye
   would never catch**, and one no name-list could have held. A grep output
   pasted forward is an inherited list wearing a derivation's clothes.

2. **Widening a matcher creates false accusations as readily as narrowing it
   creates blind spots.** R1 widened handler matching to `on[A-Z]\w*` and swept
   in `onSuccess`/`onError` — react-query lifecycle callbacks, not affordances —
   which accused fully-wired code of lying. Re-derive after every widening too,
   not only after every narrowing.

   ⚠️ **GL-1 · SECOND INSTANCE, SAME BATCH.** The first refusal-site matcher
   keyed **only on the union** (`Record<QtyRefusalReason, …>`) and produced
   **three false accusations** against `services/sdc/ingest.ts` — a
   union-to-union translation table (`Record<QtyRefusalReason, ParseReason>`) in
   a service, with no message and no surface to attach anything to. The fix was
   to test **both halves of the generic**: the VALUE must be `string`, which is
   what makes it a message map.

   ⚠️ **D-F · THIRD INSTANCE, AND THE FIRST WHERE WIDENING DELETED TRUE
   FINDINGS RATHER THAN ADDING FALSE ONES.** The stored-field gate's first
   population matcher walked interfaces syntactically and returned 10 DTOs;
   re-deriving through the TypeScript CHECKER instead **gained 17 and silently
   lost 5**, because an OPTIONAL property's type widens to `… | undefined` — a
   fresh union whose `aliasSymbol` is gone — so `reason?: QtyRefusalReason` no
   longer names its own union. **The number went UP, which is what a widening
   is supposed to look like**, and the loss was visible only by diffing against
   the narrower run. Fixed by reading BOTH halves — the declared type NODE
   (sees optionals, blind to `extends`) and the checker alias (sees `extends`,
   blind to optionals) — and unioning them. §40e.

   ⚠️ **AND IT SHARPENS THE RULE: RE-DERIVE MEANS COMPARE THE SETS, NOT THE
   COUNTS.** Rules 1–3 all assume a wrong population ANNOUNCES ITSELF BY SIZE —
   suspiciously small, suspiciously round, a red list of files. This one grew,
   which is what a correct widening looks like, and the losses sat inside the
   gain where no check on the total could see them.

   ⚠️ **WHY RULES 1 AND 2 ARE WORTH READING AS A PAIR, AND WHY GL-1 IS FILED
   AGAINST BOTH:** widening creates false accusations as readily as narrowing
   creates blind spots — **on the same instrument, in the same hour, on the seat
   that wrote the rule.** Neither error is the careless opposite of the other;
   they are the two ways one matcher is wrong, and a batch that fixes one
   without re-deriving is simply choosing which way to be wrong next.

3. ⚠️ **NEVER CONCLUDE ABSENCE FROM A TRUNCATED VIEW OF A DERIVATION.** Rules 1
   and 2 guard the matcher; this one guards the READING. At GL-0 the union
   derivation was correct (143/580) and a `sed -n '80,200p'` window over its
   265-line output did not show the halal/BPOM unions — briefly read as "the
   tree is missing them" when they were present throughout. **Assert membership
   programmatically** (`grep -c` the derived output, or filter the derivation)
   rather than paging it: a `head`/`sed` window is a sampling instrument, and
   reading absence out of a sample is the same error one layer up — a
   conclusion reporting on the instrument rather than on the tree.

   ⚠️ **§42 · AND THE SAME RULE GOVERNS WHAT A MATCH *MEANS*, NOT ONLY WHICH
   MATCHES YOU FOUND. THE SCAN MATCHED A CALL SITE; THE DERIVATION MATCHED A
   REGISTRATION SITE; ONLY THE SECOND IS WHAT A KEY COLLISION NEEDS.** A verb
   appearing in a call is not a verb claiming a key. Four premises inverted on
   measurement in one arc — two of them naming identifiers that do not exist in
   the tree at all — and each was a scan's match read as if it were a
   registration's. **Name the site the claim REQUIRES, then assert membership at
   THAT site.** A correct-sounding claim resting on the wrong site is the same
   defect as `COUNT-RESTATED-ACROSS-INSTRUMENTS-01` (§40k) with a location
   standing in for a number.

   ⚠️ **§83 · AND THE SHARPEST INSTANCE OF IT, BECAUSE THE INSTRUMENT RETURNS
   THE SAME ANSWER FOR A LIVE VERB AND A DEAD ONE.** A census of *"which verbs
   are dispatched?"* run as `grep "transitionId: '<id>'"` returns **0 for
   `t_gr_approve`, which fires on every goods receipt the wizard commits, and 0
   for `t_gr_hold`, which nothing has ever fired.** The literal is real — it
   lives in a `switch` return (`grRollup.ts`), not at the call site, because the
   GR header disposition is DERIVED rather than chosen and the call site reads
   `transitionId: headerVerb`. **A dispatch census must RESOLVE every
   non-literal id to its concrete returns before it reports anything**; derive
   the non-literal sources rather than assuming there is one (today: the GR
   header verb, and the cascade fan-out's `link.targetTransitionId`, which is
   the dispatcher firing at itself rather than a page firing). Thirteen verbs
   were reported dead on the literal scan and three of them were live.
   ⚠️ **AND A VERB WITH A CALLER IS STILL NOT REACHABLE IF NO DISPATCHED VERB
   PRODUCES ITS FROM-STATE** — that is a third answer, distinct from live and
   from dead, and it decides whether the remedy is a surface or a machine.
   Carry rule 4's bilateral control on the instrument itself: a verb known
   dispatched must be FOUND and one known undispatched must be ABSENT, by the
   same instrument in the same run.

   ⚠️ **§43 · AND THE RULE BINDS THE SEAT THAT DISPATCHES, NOT ONLY THE ONE
   THAT MEASURES. A PLAN READ AS A RESULT IS THE SAME DEFECT CLASS AS A SCAN
   READ AS A DERIVATION.** The cascade arc ended on its SEVENTH inverted
   premise: a ruling to *merge PR #226* when no PR, no branch and no code
   existed — the number, the string, the surfaces and a demo risk all read off
   a PLAN as though it were a RESULT. Six premises inverted on measurement and
   each cost a report; the seventh cost nothing **only because it was refused**,
   and it is the one that mattered most: **it required an OUTWARD, IRREVERSIBLE
   ACTION to act on.** Six wrong premises can be corrected by measuring again;
   a merge cannot. So before ANY outward or irreversible step — merge, push,
   publish, delete — assert the object exists **at the site the action names**
   (`gh pr list`, `git branch`, the file itself), never from the conversation
   that described it. §43a.

Handler shapes in THIS codebase that a naive matcher misses: custom props
(`onQualify`, `onInviteRfq`, `onUpdate`), and **named handlers hoisted out of
the JSX** (`const handleExport = () => …`) — which is where the largest pages
keep their affordances. Full list: `docs/findings.md` §19.

**A count you publish must be derived at read time or name the derivation that
produces it** (§27). Do not restate a cardinality in prose — the "four unwired
flows / 10 wired targets" sentence was wrong twice, in one sentence, for exactly
that reason.

⚠️ **THE REMEDY IS DELETION IN FAVOUR OF A DERIVATION, NEVER CORRECTION TO A
NEWER NUMBER — AND THE REASON IS THAT A CORRECTED NUMBER IS THE SAME DEFECT WITH
A FRESHER DATE.** This class has now failed in THIS FILE at every sentence
carrying a `FLOOR-IN-PROSE-01` marker; **run `grep -c 'FLOOR-IN-PROSE-01'
CLAUDE.md` — the markers ARE the count, and it is deliberately not written
here**, because a tally of stale-count incidents is itself a count in prose. The
recovered members, each measured against its own instrument: the test floor
(drifted past 1400 tests behind the suite); the wired-`CommandTarget` figure
(*"6"* → *"10"* → *"11"*, all three right the day they were typed); *"10
lifecycle machines … across 13 flow files"*; the target-less flow LIST (*"four"*
corrected to seven, then silently wrong again the day `supplierDocument` was
wired); the BPJPH countdown (*"58 days"*, the one variant that decays with
nobody touching the file); *"Two rules"* above three numbered rules; *"Three"*
identifiers above a list that wanted a fourth; the handoff surface count (wrong
TWICE, once per batch); and — added by the batch that wrote this paragraph —
*"six system roles + a supplier role"* against a `SystemRoleId` union holding
twelve members, sitting **three lines above the instruction not to restate role
counts.**

⚠️ **AND THE DISPATCH THAT ORDERED THIS PARAGRAPH SAID THE CLASS HAD FAILED
"FOUR TIMES". THAT WAS ITSELF AN UNDERCOUNT, DERIVED AGAINST.** Which is the
whole argument in one line: **the tally of a self-reported failure class is the
number least likely to be re-measured, because everyone assumes the register
already did it.** Do not accept one — including from this paragraph. Derive it.

⚠️ **AND A COUNT IS COMPARABLE ONLY TO A COUNT FROM THE SAME INSTRUMENT**
(`COUNT-RESTATED-ACROSS-INSTRUMENTS-01`, §40k). A prototype and the thing it
became are TWO instruments — especially then, because the differences are the
deliberate improvements, which is exactly what changes the count. D-F subtracted
a prototype's figure from the shipped gate's, got a gap of 7 where the truth was
2, and **wrote a plausible, specific, quantified explanation for the gap rather
than re-running.** The general form, and it is the reason this sits under the
derivation rules: **A BARE WRONG NUMBER GETS CHECKED; A WRONG NUMBER WITH AN
EXPLANATION GETS BELIEVED.** The explanation is not a failed catch — it is the
mechanism by which the error survives. **Re-run; do not reconcile.**

### And the rule above the three: PROBE THE GUARD BOTH WAYS
Rules 1–3 guard a POPULATION. They say nothing about the instrument that guards
an INVARIANT. **A guard is habitually probed in one direction only — "does it
catch the bad thing?" — so a guard that is wrong about what it should ACCEPT
ships looking like a working guard.** GL-1's chip-ref type was exactly this: it
rejected the bad ref *and the known-good one*, because a mapped type collapsed
`term` to `never`. A one-sided probe would have shipped it.
**Assert a known-GOOD input passes before you believe a known-BAD input failed.**
The running count of this class lives in `docs/findings.md` §39 — it is a table,
and the table is the count.

⚠️ **D-F IS THE FIRST BATCH IN WHICH THE REFLEX PAID FOR ITSELF, AND IT PAID ON
THE FIRST RUN.** The stored-field gate came back GREEN against the real tree
while its own known-good probe was failing: the synthetic harness put its files
outside `src/`, so the derivation returned an EMPTY population, and a
one-directional probe would have read that as *"yes, it catches the bad thing —
there is nothing bad here."* The good-input probe and its bad-input twin now run
against the SAME synthetic program, so neither can be believed alone. §40e.

⚠️ **§42 · SECOND INSTANCE, ONE DAY LATER, AND IT WOULD HAVE PRODUCED THE RIGHT
CONCLUSION BY AN INSTRUMENT THAT PROVED NOTHING.** A derivation asking "does any
transition-id keying collide?" returned **"0 colliding" on every keying** — over
an EMPTY population, because it imported `./registry` instead of `./index`, so no
shipped flow had self-registered and `getKnownFlows()` returned `[]`. The
conclusion it pointed at ("nothing collides") happens to be TRUE, which is what
makes this the dangerous shape: **a right answer from an instrument that examined
nothing looks exactly like a right answer.** Only the known-good control
(`expect(ids).toContain('t_gr_post')`) went red, beside `total transition ids: 0`.
Filed as `EMPTY-INPUT-REPORTS-CLEAN-01`, **not** in §39b's table — that table
counts the opposite half of the asymmetry, and one event under two classes
inflates both. The population guard is now the FIRST test in the shipped gate and
asserts MEMBERSHIP, never a count. §42b.

⚠️ **§71 · AND A THIRD WAY A CLEAN READING LIES, WHICH IS NEITHER OF THE OTHER
TWO — `CLEAN-AFTER-THE-FIX-REPORTS-THE-FIX-01`. THE OPERATIVE FORM: A CLEAN
RESULT TAKEN RIGHT AFTER THE FIX IS A REPORT ABOUT THE FIX.** The family now has
three members and they fail for three different reasons, so a note on either of
the first two would have been filed in the wrong place:

| | What the instrument examined | Why the clean reading is worthless |
|---|---|---|
| `EMPTY-INPUT-REPORTS-CLEAN-01` | **nothing** | there was no population |
| **rule 1** | a population, through a broken matcher | the result reports on the matcher |
| **this** | **everything, correctly** | **the defect was removed an hour earlier** |

The third is the hardest to distrust, because *nothing is wrong with it*: real
population, correct matcher, honest zero. At §70b a candidate gate for
`FORWARD-PROMISE-HAS-NO-HANDLER-01` measured **zero false positives across the
whole i18n layer** — a genuinely clean reading over a genuinely complete
population — and it was clean **because §69 had deleted both instances that
morning.**

⚠️ **AND THE CONSEQUENCE IS RULE 4's, ARRIVING THROUGH A DIFFERENT DOOR: AN
INSTRUMENT VALIDATED ONLY AGAINST A REPAIRED TREE HAS NEVER BEEN SHOWN TO FIRE.**
Rule 4 says probe the guard both ways; this is the case where a seat believes it
already has, because the real-tree run came back green and green is what a
working guard looks like. **The zero proves the repair landed. It proves nothing
about whether the instrument can catch the next instance** — for that, fire it at
the defect the fix removed (§70b did: the proxy would have caught both §69
strings, which is a different measurement from the zero, taken against different
input). **A gate whose only evidence is a clean run on a just-repaired tree is
unprobed, whatever its output says.**

⚠️ **§51 · AND ONE LAYER ABOVE THE PROBE: THE INSTRUMENT THAT COUNTS THE PROBE.
RULE 4 COVERS THE PROBE. THIS COVERS THE THING THAT READS THE PROBE'S OUTPUT, AND
ITS FAILURE MODE IS FLATTERINGLY HUMBLE.** A mutation probe is trusted through a
counter, and a counter is an instrument like any other — with two ways to be
wrong that have both now happened, one batch apart, in the same harness:

- **§50e — the kill that never registers.** Thinning a `surfaceable` reason made
  the flow fail `assertValidFlow`, so it never registered, so vitest reported a
  FAILED SUITE with *"no tests"*. A counter watching `Tests N failed` saw
  nothing and reported **0 KILLED** on a probe that had killed everything.
- **§51f — the digit inside the escape code.** The same counter matched
  `Tests\D+(\d+) failed` against vitest's COLOURED summary, and `ESC[1m`
  contains a digit: `\D+` stopped short, `(\d+)` captured the `1` out of the
  formatting, ` failed` did not follow, and it again reported **0 KILLED** on a
  probe that killed a named test.

**BOTH MECHANISMS FAIL IN THE SAME DIRECTION — TOWARD "YOUR GATE IS WEAK" — AND
THAT IS THE READING THAT GETS BELIEVED, BECAUSE IT SOUNDS LIKE THE HUMBLE
ANSWER.** A counter that over-reports kills would be challenged immediately; one
that under-reports them is accepted as modesty and the gate gets rewritten to fix
a hole it does not have. **STRIP THE FORMATTING BEFORE PARSING AN INSTRUMENT'S
OUTPUT, AND CONFIRM ONE KILL BY NAME BEFORE TRUSTING A COUNT.**

⚠️ **§85 · AND IT FAILED A THIRD TIME TODAY, ON A THIRD MECHANISM, IN THE SAME
DIRECTION — WHICH IS THE POINT OF FILING IT RATHER THAN FIXING IT QUIETLY.** The
module-scope-literal probe captured vitest's output with Python's
`subprocess(text=True)`, which decodes using the CONSOLE CODEPAGE (`cp1252`
here) and **throws** on the UTF-8 the suite emits. Every mutant came back
`named=False` — *"the gate went red but could not name the string"* — on a probe
where all three mutants were in fact named. **Three mechanisms now, all reporting
"your gate is weak":** a kill that never registers (§50e), a digit captured out
of an escape code (§51f), and now a decode that throws before the match runs.
The direction is not a coincidence — **every parsing failure loses matches, and
losing matches always reads as the humble answer.** Decode instrument output as
BYTES with an explicit encoding, never through the ambient codepage.

⚠️ **AND THE RESTORE HALF OF A MUTATION PROBE NEEDS ITS OWN AUTHORITY, NAMED
BEFORE THE RUN.** A probe that mutates shipped source is only honest if the
restore is provably byte-identical, and **`sha256` of the file bytes is that
authority** — it decides, full stop. But it is not sufficient EVIDENCE on its
own here: `core.autocrlf` is on in this repo (git says so on every write —
*"LF will be replaced by CRLF"*), so a bare sha256 computed on a working-copy
file is not reproducible by a reader on another platform, and a reader who
recomputes it and gets a different digest cannot tell a line-ending policy from
a failed restore. **So report BOTH: sha256 as the authority, and `git
hash-object` beside it** — the blob id is what a reviewer on any platform can
recompute and compare, because it is normalized. State which bytes were hashed.

⚠️ **AND THE SAME REFLEX APPLIES TO AN ARTIFACT NAMED IN A DISPATCH.** The
identifiers named as existing code and measured absent are
`getInvoiceAction`, the FX-page `<span lang="en">` (§45), `SurfaceExpectation`
(§51), **`blockingReasons` (§63b)**, and — all four in ONE dispatch (§64a) —
**`roleMatches`**, **`buyer:planner`**, **`t_asn_confirm`** and
**`t_asn_dispatch`** — beside a SHA (`c95e8ce`) and a PR number the tree never
held.

⚠️ **§64a ADDS THE VARIANT THAT IS HARDEST TO CATCH: A MISDESCRIBED MECHANISM
ATTACHED TO A CORRECT CONCLUSION.** The dispatch said `buyer:all` was a wildcard
that `roleMatches` short-circuits, on 32 of 44. `buyer:all` is a `requiredRole`
on **0 of 91** transitions (it is the DR-10 audit ACTOR string) and `roleMatches`
does not exist — the gate is a bare `Array.includes`. **And the conclusion was
right anyway**: the persona-wide grant WAS a wildcard, because holding all 48
atoms by virtue of being a buyer is exactly that. The wildcard was the SHAPE of
the grant, not a token in it. **A hunt for the named token finds nothing and
concludes there is no wildcard** — so grep the artifact, keep the property. **THE LIST IS THE COUNT; do not restate it as a number** —
the sentence that stood here opened with *"Three"* while it was already time to
write a fourth, which is `FLOOR-IN-PROSE-01` in the paragraph that teaches the
reflex. `blockingReasons` was the load-bearing mechanism of a ruling — *"your own
finding shows how: `qualityValid` ALREADY WRITES INTO `blockingReasons`"* — and it
cost nothing only because it was grepped before it was built on. **The register
under-counts this class by construction:** an invented artifact that is REFUSED in
conversation leaves no trace, so only the ones that reached a batch were ever
written down. Before building on a named artifact, `grep` for it —
absence is a one-line measurement and a wrong premise with a specific name is the
most believable kind.

⚠️ **§70 · AND WHAT TO DO WITH ONE, WHICH §64a DOES NOT SAY —
`FALSE-MECHANISM-MUST-NOT-BE-FILED-01`. A FINDING WHOSE MECHANISM IS FALSE MUST
NOT BE FILED, EVEN WHEN ITS CONCLUSION IS RIGHT: THE REGISTER IS WHAT THE NEXT
BATCH BUILDS ON, AND A FALSE BLOCKER COSTS MORE THAN THE BATCH IT STOPPED.**
**AND THE BOUND IS PART OF THE RULE, NOT A FOOTNOTE TO IT: AN UNVERIFIED
MECHANISM IS STILL FILED, WITH ITS UNCERTAINTY STATED — ONLY A MECHANISM
*MEASURED FALSE* IS WITHHELD. THE DISTINCTION IS WHETHER THE MEASUREMENT WAS
TAKEN.** Unbounded, the rule licenses withholding anything a seat has not proven,
**which would empty the register of exactly the findings that most need
checking** — so the limit is what keeps the rule from inverting into the harm it
exists to prevent, and it is stated before the argument rather than after it.
§64a stops at detection (*grep the artifact, keep the property*), so the default
survives — the conclusion held, and filing is what this project does with
survivors. **That default is wrong, and asymmetrically:** a finding filed with a
correct mechanism costs ONE batch to act on; one filed with a false mechanism
costs EVERY batch that reads it, because "X cannot do Y" invites a Y-shaped
replacement for X, and **nobody re-measures a blocker — a blocker is why you
stopped.** At §69 the finding was *"the policy hook cannot reach the document"*,
attached to a conclusion that was RIGHT (*the bands are not where the work is*),
which is exactly what would have carried it past review; filed, it would have sat
in front of every value-based policy this platform will ever want, while
`readEntity` was documented for that purpose and four shipped hooks already used
it. **The disposal is re-measure, then file the TRUE finding** — which was the
opposite shape and sharper: the hook reaches the document, and what is missing is
the RIGHT-HAND SIDE of the comparison. One is a dead end; the other names what to
build.

The gate itself is `src/lib/storedFieldGate/` — every stored field on a
glossary-covered DTO has a non-fixture reader or a bilateral allowlist row with
its reason stated. It is deliberately TEST-level, not type-level, precisely so
#179's mutation practice CAN reach it; both directions of the bilateral
assertion are mutation-probed.

`src/lib/moduleScopeLiteralGate/` is the second gate on that pattern: no
reader-visible literal may sit where `t()` cannot reach it — a parameter
default that renders, or a module-scope const consumed by `.map()`. ⚠️ **Its
discriminator is DERIVED, and that is the part worth copying: a default is a
defect iff some JSX call site OMITS the prop.** No allowlist, no
"looks-like-a-sentence" heuristic, and — the property a marker cannot have — it
RE-DECIDES ITSELF: the day a new call site omits `title`, that literal becomes a
defect with nobody editing the gate. Content is never inspected. Where
reachability cannot answer (a mapped const always renders) the reason is stated
AT THE SITE via the tree's existing `i18n-defer:` convention, which cannot go
stale because it is the same bytes as the code it acquits — **and which is
UNVERIFIED, buying a stated reason and a visible diff, never enforcement.**
`grandfathered.ts` carries the consts that predate the gate as a bilateral set
that can only shrink; it is the S2 worklist, not an exemption.

### And the rule beside all of them: A REGISTER ENTRY IS NOT A DELIVERABLE

⚠️ **NO BATCH MAY BE DISPATCHED WHOSE DELIVERABLE IS A REGISTER ENTRY, UNLESS
THAT ENTRY IS A CONTRACT.** Ruled 2026-08-20. Binding on the dispatching seat,
not only on the executing one — it is a rule about what may be ASKED FOR.

**A contract is the exemption because a contract is a commitment somebody else
builds against**: `docs/contracts/C1…C10`, a frozen DTO, an invariant a gate
enforces. A finding is a commitment to nobody. The test is not the file the text
lands in — a finding written into `docs/contracts/` is still a finding. The test
is: **does anything outside this repository change if it is true?**

**THE REMEDY IS STRUCTURAL BECAUSE THE FAILURE IS STRUCTURAL, AND THE FAILURE IS
NOT LAZINESS.** The strategist seat produces findings faster than surfaces, and
findings READ AS PROGRESS: they are dated, numbered, cross-linked, derived, and
often genuinely excellent work. Nothing in the review loop distinguishes a
register that grew because the tree was examined from a register that grew
because examining is cheaper than building. **A finding costs one seat one
session and passes every gate this project has by construction — `npm run gates`
cannot fail on prose.** A surface costs a design, a write path, a locale pass, a
mutation probe, and a floor that must not regress. Between two things that both
read as progress, the cheaper one wins every time it is allowed to compete, and
until this rule it was allowed to compete.

**Measured, not asserted** — the numbers and their instruments are in
`docs/findings.md` §61 (`REGISTER-OUTGREW-THE-SURFACES-01`), re-runnable there.
The register is now the largest thing in the docs corpus by a factor of three
over everything else combined, and it grew that way in six weeks.

**How to apply it, concretely:**
- A batch whose PR touches only `docs/findings.md` needs a stated reason that is
  not *"the census produced findings."* Recording what a BUILDING batch measured
  is not this rule's target — that is the register doing its job. **Dispatching a
  batch TO produce findings is.**
- Findings that arrive as a by-product of surface work are unaffected and always
  were: §56's own line is that three of its four findings came from instruments
  running *after* the code was written. **Keep that. This rule is about what the
  batch was FOR.**
- When a census genuinely must run first, dispatch it with **the surface it
  unblocks named in the same dispatch**, and merge them as one arc. A census with
  no named consumer is the shape this rule refuses.
- ⚠️ **AND THE RULE APPLIES TO ITSELF.** This entry is a register entry about
  register entries. It earns its place only if the next three arcs ship surfaces;
  if the recalibrated path above produces another six weeks of prose, this
  paragraph is evidence for the diagnosis and not a remedy for it.

## Gates — THIS PROJECT HAS NO LINT SCRIPT
There is no `lint` script and no ESLint config. Do not invent one, and do not
run `npx eslint` — it fails on missing config, which is not a code defect.
The gates are exactly four (three until `TSC-SKIPS-TESTS-01` closed):
- `npm run build`  → `tsc && vite build` (typecheck + bundle)
- `tsc -p tsconfig.vitest.json --noEmit` → **typechecks the SPEC surface**, which
  `tsconfig.json` excludes. Added when `TSC-SKIPS-TESTS-01` was closed: for the
  life of the suite no gate typechecked a test, and the remedy the register had
  booked did not work (the child config `include`s the specs and then inherits
  the base `exclude`, which wins). The override `"exclude": []` is what closes
  it, and `npm run gates` ASSERTS the override is present — without it the gate
  would pass while checking nothing.
- `npx vitest run` → the test floor, which never regresses
- `npm run test:gate` → the SEC-GATE-01 session/HMAC suite (`gate/`, outside `src/`)

### `npm run gates` — the four, run and ASSERTED (CP-3a)
`npm run gates` (`scripts/gates.mjs`) runs exactly those four, in that order,
and then asserts that each one did something: the build emitted a bundle, the
suite collected at least the recorded number of tests across at least the
recorded number of files, and the gate suite passed at least its recorded count.
The counts live in `scripts/floor.json` and are a **FLOOR, not an equality**
(operator ruling, CP-3a): **below it fails; above it passes and prints a note
asking you to bump the file.** Exact matching was rejected — it reddens every
legitimate test-adding PR until somebody edits a number, which trains people to
edit the number, and a floor that gets edited routinely is not a floor.
**The trade, recorded: a suite that shrinks but still clears the floor is
invisible to this gate** (the skipped/todo refusal covers the common shape).
**Bump `scripts/floor.json` when the note asks.**
It is not a fourth gate and adds no new notion of green; it is the same three
plus the assertion that they ran. **CI runs this exact command** and nothing
else (`.github/workflows/gates.yml`) — on every PR to `main`, on every push to
`main`, and **daily at 00:17 UTC on `main` with no commit involved**, which is
the half that catches a clock-decay break like 2026-08-01 (see `docs/findings.md`,
CP-3a). A failing scheduled run opens/updates a `gates-failure` issue.

## Deploy
Vite root is app/ — never edit app/index.html directly.
Deploy is Vercel-only: Vercel builds from source via vercel.json (npm run build → dist/).
Nothing is copied to repo root; there are no committed build artifacts.
Source entry: app/index.html  |  vite.config.ts root: app  |  outDir: ../dist

### Access gate (SEC-GATE-01)
A Vercel Routing Middleware (`middleware.js`) runs BEFORE the SPA rewrite and
fronts the entire app shell and every `/assets/*` chunk behind an HMAC-SHA256
signed, HttpOnly, 7-day session cookie — the bundle never ships to an
unauthenticated client. Credentials validate at the edge against NON-`VITE_`
env (`GATE_USER` / `GATE_PASSWORD` / `GATE_SECRET`, never bundled); the gate
fails CLOSED (503) if unprovisioned. Gate logic lives outside `src/` (`gate/`,
`middleware.js`) so it does not touch the vitest floor. noindex is shipped
(meta + robots.txt + `X-Robots-Tag`). The in-app persona / CurrentIdentity flow
is separate and untouched by the gate.
