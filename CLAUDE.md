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
  `:983`). **Wired CommandTargets now number 10, not 6** (`:976-987`; census
  evolution tracked at `:989-991`). It is
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

## Gates — THIS PROJECT HAS NO LINT SCRIPT
There is no `lint` script and no ESLint config. Do not invent one, and do not
run `npx eslint` — it fails on missing config, which is not a code defect.
The gates are exactly three:
- `npm run build`  → `tsc && vite build` (typecheck + bundle)
- `npx vitest run` → the test floor, which never regresses
- `npm run test:gate` → the SEC-GATE-01 session/HMAC suite (`gate/`, outside `src/`)

### `npm run gates` — the three, run and ASSERTED (CP-3a)
`npm run gates` (`scripts/gates.mjs`) runs exactly those three, in that order,
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
