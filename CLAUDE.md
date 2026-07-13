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

## Current state (as-built: main @ #53 — command spine complete; Stage F opening)
Re-baselined by Batch **F0.1** (2026-07-13). The prior "Next: Step 3" pointer was
stale by ~19 commits; the transition schema + command spine it named are BUILT.

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
- **Phase 2′ exit** is contract-complete as of F0.4 (all 15 machines authored;
  5 lifecycle machines wired only where a surface already has the verb; the
  compliance machine rides R2.2 DTO-v2). It is deliberately NOT behavior-complete
  — remaining verb wiring rides each Stage-2 surface (FORK-2 hybrid).
- **Backend is greenfield.** Zero server code / datastore clients; data is
  in-memory fixtures behind `mockDataService` (`src/main.tsx`); tenant scoping is
  enforced client-side. `httpDataService` is the designed Phase-F1 swap
  (`DataServiceContext.tsx`) — pages do not change when it lands.
- BuyerCompliance stays a registered fixture carve-out (COMPLIANCE-CARVEOUT-01,
  `docs/findings.md`) until Stage-2 **I3** re-points it to `useDataService()` off
  the R2.2 DTO-v2 / Track-R harvest.
- Consumption pattern is standardized: TanStack Query v5 over `useDataService()`,
  scoped query hooks (per-supplier cache isolation via `scopeKey`), a typed
  `DataError` contract, the `Page<T>` list envelope (shape frozen; no pagination
  machinery), and a dev-only, env-gated chaos mock.
- Fixtures are multi-tenant (sup-002 / sup-005 / sup-007); a service-level
  scoping contract guards buyer-superset / per-supplier-isolation / SCOPE_DENIED.
- Locale + i18n: `formatIDR / formatDate / formatNumber` (Asia/Jakarta) and a full
  EN/ID react-i18next layer (per-page fragments + central label maps) are live.
  Test floor: **557** (never regresses).

### Forward plan vocabulary (Stage F / I / A)
- **Canonical forward plan:** `Paragon_World_Class_Build_Plan_v1.md` (executes
  `docs/Paragon_Platform_Strategic_Spine_v1.md`). It supersedes the *sequencing*
  of `docs/Supplier_Portal_Revised_Build_Plan_v2_2.md` from Stage 1 onward; v2.2
  remains the Phase 0–2′ record + ratified-decision register (DR-6/7/9/10, DP).
- **Stage F — Foundation** (governed data + integration backbone): **F0**
  contract-freeze & ledger truth (F0.1–F0.6, in progress) → **F1** real backend
  core (`httpDataService`, OIDC, durable audit; SE Team) → **F2** S/4HANA event
  seam (Event Mesh + OData; INT-TMS-01 is a sub-case) → **F3** Snowflake +
  data-quality prerequisites.
- **Stage I — Intelligence:** I1 spend classification · I2 should-cost/commodity-FX
  · I3 risk + halal/BPOM compliance (hard date 17 Oct 2026) · I4 3-way match +
  e-Faktur · I5 guided-buying intake · I6 BOM-linked sourcing. Each ships
  fixture-first behind honest markers, flips Live when its Stage-F prerequisite lands.
- **Stage A — Agentic** (disciplined/bounded): A1 copilot · A2 document
  intelligence · A3 bounded task agents · A4 advanced levers (buy-vs-build).
- **Track R** (halal) runs as a PARALLEL operator lane with its own clock
  (17 Oct 2026); it feeds the Stage-2 I3 compliance primitive. Four operator
  decisions OPEN: D-CAL / D-STAFF / D-SAP / D-DPO.
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
