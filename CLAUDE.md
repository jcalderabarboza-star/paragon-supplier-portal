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

## Current state (as-built: main @ 248ca75 — Phase 0 complete)
- Phase 0 (0.1–0.7) is closed via PRs #11–#15. Test floor: 48 (never regresses).
- Consumption pattern is standardized: TanStack Query v5 over `useDataService()`,
  scoped query hooks (per-supplier cache isolation via `scopeKey`), a typed
  `DataError` contract, the `Page<T>` list envelope (shape frozen; no pagination
  machinery), and a dev-only, env-gated chaos mock.
- Fixtures are multi-tenant (sup-002 / sup-005 / sup-007); a service-level
  scoping contract guards buyer-superset / per-supplier-isolation / SCOPE_DENIED.
- Locale + i18n: `formatIDR / formatDate / formatNumber` (Asia/Jakarta) and an
  i18next primitive are installed.
- Canonical build plan: `docs/Supplier_Portal_Revised_Build_Plan_v2.1.md`.

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

## Deploy
Vite root is app/ — never edit app/index.html directly.
Deploy is Vercel-only: Vercel builds from source via vercel.json (npm run build → dist/).
Nothing is copied to repo root; there are no committed build artifacts.
Source entry: app/index.html  |  vite.config.ts root: app  |  outDir: ../dist
