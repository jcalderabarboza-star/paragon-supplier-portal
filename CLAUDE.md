# Claude Code — Project Rules

## Branch policy
- Branch off `main` for every task (e.g. `chore/...`, `qa/...`, `feat/...`)
- Open a pull request to `main`; never push directly to `main`
- The CLI merges via the GitHub UI (Squash + delete branch); the operator directs and approves

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
> (`services/transitions/businessRoles.ts` — six system roles + a supplier role,
> plus an `automation` grant that is deliberately NOT assignable to a person).
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
> `HandoffNotice`) — and it is wired on **BuyerInvoices only**. Every other
> governed surface still renders its affordances unconditionally, so a narrowed
> seat gets a dispatcher refusal with no rendered owner. Derive the exposure from
> `HandoffNotice`'s importers before claiming otherwise (§64j).
>
> The resolved actor is a SEAM, not a person: `CurrentIdentity.actor` is always
> `UNATTRIBUTED: NO_PERSON_IN_SESSION`. **C10 §6.2's payload-refusal half is NOT
> built** and is guarded by a tripwire in `simUsrNamespace.test.ts` — the moment
> shipped code constructs a `RESOLVED` actor, the refusal must land first.
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
- **Phase 2′ exit is STAMPED contract-complete as of F0.4 (PR #58).** All 10
  lifecycle machines are authored across 13 flow files (`src/services/transitions/
  flows/`): PO · ASN · GR (+ line) · Invoice (+ match) · RFQ · Quotation · Shipment ·
  Contract · Obligation · PurchaseRequisition · SupplierDocument. The sole remaining
  census machine — the ONE canonical compliance machine that collapses the 5
  fragmented vocabularies (census #11–15) — rides R2.2 DTO-v2. Of the F0.4 five,
  **FOUR remain author-unwired inert registry data**
  (Shipment/Contract/Obligation/SupplierDocument): no CommandTarget, no cascade
  link, roles mapped for catalog-coverage only (DNA-SEED-01 contract surface, no
  UI consumer). **PR is NO LONGER among them** — corrected 2026-08-03: it was
  wired at G1.1 and dispatches (`MockCommandService.ts:547-593`, registered
  `:983`).

  ⚠️ **CORRECTED AT R2 (2026-08-12) — THE TARGET-LESS FLOWS ARE SEVEN, NOT FOUR,
  AND THE COUNT ABOVE IS THE F0.4 SUBSET, NOT THE POPULATION.** Derived from
  `getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS`, the flows with NO CommandTarget
  are: **Shipment · Contract · Obligation · SupplierDocument · goodsReceiptLine ·
  invoiceMatch · compliance** — 30 verbs that cannot fire. The "four" counted
  only the five F0.4 machines and never included the two rolled-up sub-flows or
  the compliance machine, so the sentence was true of its own subset and false
  of the tree. **⚠️ NAME COMPLIANCE SPECIFICALLY: I3 is stamped COMPLETE below
  and `BuyerCompliance` really does read through the seam — but the compliance
  MACHINE IS READ-ONLY. `t_compliance_submit` / `_verify` / `_reject` CAN NEVER
  FIRE.** A complete read path and an inert write path are compatible, and
  nothing in the I3 stamp said which one it meant. All seven ARE honestly badged
  `AUTHORED — UNWIRED` on `/buyer/process-flows` (verified by rendering, R1) —
  the defect was in this file, not on the surface.

  **Wired CommandTargets number 11, not 10 and not 6** — `TARGETS`
  (`MockCommandService.ts:1130`), exported as `WIRED_COMMAND_TARGETS` (`:1155`).
  The 11th is `enforcement` (CP-3 · E2); the "10" predated it and the line refs
  cited with it had drifted ~150 lines. **Do not restate this number without
  re-deriving it** — it has now been wrong twice, in the same sentence, for the
  same reason. It is
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
  doctrine, I6 anchor). G0.1 (the C6 planning-doctrine contract) is the next Stage-G
  batch, gated on G-PRECOND (this true-up is the last precondition item).
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
- **Track R** (halal) is a NORMAL operator-lane capability — on equal footing
  with every other lane, NOT a deadline-driven track. The platform models the
  full compliance flow; no external deadline gates the build, and certification
  is handled manually by the compliance team. Switch-on timing is operational,
  not a build gate. It feeds the Stage-2 I3 compliance primitive. Four operator
  inputs remain OPEN (informational, non-blocking): D-CAL / D-STAFF / D-SAP / D-DPO.
- Adjudicated forks: **FORK-1 = (c)** (minimal scripted halal-renewal walkthrough
  at I3; full Learn absorbed into the A1 copilot). **FORK-2 = hybrid** (author all
  remaining flows; wire opportunistically per Stage-2 surface).

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
- BUTTON HIERARCHY (DP2-BUTTON-01): primary action = action-blue **OUTLINE** by
  default (`Button variant="outline"`) — the calm portal-wide register. **SOLID**
  action-blue (`variant="primary"`) is RESERVED for consequential / irreversible
  commits — Award (RFQ), Release payment, Post-to-SAP, Reject / Dispute,
  Override-hold. Principle: **solid = the irreversible-commit signal**; at most
  ONE meaningful solid per surface. Export / Cancel / Close / secondary paths stay
  outline / `variant="secondary"`; an Export never occupies the primary slot. The
  `BulkActionsBar` primary slot renders outline by default — set `primary.solid`
  only for a reserved commit verb. WhatsApp / messenger chrome is exempt (D-2).
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

The gate itself is `src/lib/storedFieldGate/` — every stored field on a
glossary-covered DTO has a non-fixture reader or a bilateral allowlist row with
its reason stated. It is deliberately TEST-level, not type-level, precisely so
#179's mutation practice CAN reach it; both directions of the bilateral
assertion are mutation-probed.

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
