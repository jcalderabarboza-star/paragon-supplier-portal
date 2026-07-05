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

## Current state (as-built: main @ 99db9be — Phase 1′ in progress)
- Phase 0 (0.1–0.7) closed via PRs #11–#17. Test floor: 167 (never regresses).
- Phase 1′ page/read migrations merged — Batches 1.1a–1.3 (PRs #18–#24): buyer +
  supplier pages consume `useDataService()` via scoped TanStack Query hooks;
  DP-1/DP-2 restyle applied opportunistically per touched page.
- SEC-GATE-01 (PR #25) + ENV-BADGE-01 hardening (PRs #27–#28) merged; DP-3
  Odyssey/TMS theme + typography merged (PRs #29–#31).
- Batch 1.4 (legacy PO alias collapse) + Phase 1′ close are pending (v2.2 Step 2).
  BuyerCompliance is a registered fixture carve-out (COMPLIANCE-CARVEOUT-01, see
  `docs/findings.md`) that lands at R2.2 — the Phase 1′ exit criterion is "all
  pages on `useDataService()` EXCEPT this registered carve-out".
- Consumption pattern is standardized: TanStack Query v5 over `useDataService()`,
  scoped query hooks (per-supplier cache isolation via `scopeKey`), a typed
  `DataError` contract, the `Page<T>` list envelope (shape frozen; no pagination
  machinery), and a dev-only, env-gated chaos mock.
- Fixtures are multi-tenant (sup-002 / sup-005 / sup-007); a service-level
  scoping contract guards buyer-superset / per-supplier-isolation / SCOPE_DENIED.
- Locale + i18n: `formatIDR / formatDate / formatNumber` (Asia/Jakarta) and an
  i18next primitive are installed.
- Canonical build plan: `docs/Supplier_Portal_Revised_Build_Plan_v2_2.md`
  (supersedes v2.1, which remains valid where not amended).

## Routing
Routing is HashRouter (`src/router/AppRouter.tsx`) — not BrowserRouter. The `/`
home redirect points to `/buyer/dashboard`; unknown routes render a real 404
(`src/pages-v2/NotFound.tsx`).

## Design principles

### DP-1 — Fiori-aligned visual language
- No dark solid backgrounds as content surfaces. Hero/identity cards restyle to
  light surfaces: white / light-neutral card, subtle border, navy (`#0D1B2A`)
  text, teal (`#0097A7`) accents/interactive, mid (`#354A5F`) secondary text.
- Odyssey colors are accents, not fills. Semantic color (green/amber/red) is
  reserved for state (as the KPI tiles already do).
- Reference grammar: light shell, white cards, thin borders, high information
  density, restrained color.
- Applied opportunistically per touched page (formatter precedent) — restyle
  when a batch touches the page, never as a standalone sweep. Applies from
  Batch 1.1b onward. If a shared token / card-variant change makes it cheap,
  propose it in that batch's investigation rather than patching per-page.

### DP-2 — Restrained beauty-tech palette (extends DP-1)
- ONE brand accent: teal (`#0097A7`) for interactive / active / highlights.
  Navy (`#0D1B2A`) is text/headings only — never a decorative fill. Mid
  (`#354A5F`) is secondary text. Surfaces stay white / light-neutral with
  subtle borders.
- Semantic color (green/amber/red) is ONLY for true state, in soft/muted
  variants — never saturated decoration. If a chip's color doesn't inform a
  decision, it goes neutral.
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
