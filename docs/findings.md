# Open Findings

Findings surfaced during the build that are not yet actioned, registered here so
they survive the session boundary. Each carries a disposition (where/when it
lands). Code references are `file:line` against `main @ 99db9be`, EXCEPT the
CP-0 · W1 · 2e block, whose refs are against `main @ c1855ef`, and the
**CP-1 C7/C8 seam block at the foot of the table**, whose refs are against
`main @ 063adca` (stated per row).

**The C7/C8 seam block exists because the findings register was not the register
for seam truth.** Seam findings lived only inside `docs/contracts/*.md`, so a
contract could go stale without anything in the register noticing — which is
precisely how `SEAM-DOC-DRIFT-01` happened. Seam findings are registered here
from CP-1 onward.

| ID | Finding | Disposition |
|---|---|---|
| **ENV-BADGE-01** | Header shows a `PREVIEW` badge even on the production canonical domain (cosmetic). | Resolved in Batch 1.1a (PR `feat/phase1a-onestep-bpages`). → **CLOSED-HARDENED (PR #27, `f1652de`).** Reopened post-SEC-GATE-01, then hardened. Operator saw `PREVIEW` on production. Investigation (live, cef5706): the canonical domain `paragon-supplier-portal.vercel.app` was **clean** — deployed bundle byte-matched source (`index-BVHjwEui.js`), compiled logic returned `null`, live authenticated DOM showed no badge; only one badge source exists (`TopBarV2` + `envBadge.ts`). **Root cause = a fragile signal, not a code bug on canonical:** the badge keyed off a hardcoded hostname allowlist (`PRODUCTION_HOSTS`), so it wrongly emits `PREVIEW` for any production host **not** in the list — an immutable deployment-specific URL, a new alias/custom domain, or a stale cached bundle. **Hardened fix (`fix/env-badge-01-deploy-env`):** primary signal switched to Vercel's build-time `VERCEL_ENV` (injected via vite `define` as `__DEPLOY_ENV__`), which is `'production'` on **every** production deploy regardless of the viewing URL; hostname allowlist kept only as a fallback for local `build && preview` / non-Vercel. Unit test pins the production case across canonical/deployment-URL/custom-domain hosts. Verified: `VERCEL_ENV=production` build on `localhost` (a non-allowlisted host) → **no badge**; `VERCEL_ENV=preview` build on the same host → **PREVIEW** (badge now tracks deploy env, not hostname). Floor 165→167. **Live-verified on production canonical (`f1652de`, deploy `dpl_DvYJxjB4b3hYXkwsyzq1GDz4Dz5f`):** no badge; the deployed bundle (`index-8Sc6hRbN.js`) has the hostname allowlist **folded out entirely** — proving `VERCEL_ENV=production` reached the build, i.e. Vercel's *Automatically expose System Environment Variables* setting is **ON** (no operator toggle needed). Preview-side (`VERCEL_ENV=preview` → PREVIEW) proven via local build + the end-to-end mechanism; the real Vercel preview sits behind Vercel SSO + the gate, so the final browser click is operator-side. |
| **NAV-01** | Persona toggle does not navigate to the matching dashboard when switched. | Resolved in Batch 1.1a (PR `feat/phase1a-onestep-bpages`). |
| **NAV-02** | Unknown `/buyer/*` (and other) paths fall through to the buyer dashboard — no 404. Catch-all `*` now renders `NotFound` at `src/router/AppRouter.tsx:82`. | Resolved in Batch 1.1a (PR `feat/phase1a-onestep-bpages`). |
| **INV-SEED-01** | `BuyerInvoices` view seeds its editable state once from the server list and does not re-seed on refetch (stale after background refresh). | **CLOSED (v2.2 Step 4 batch iii — PR #38 merged `a106d31`).** `BuyerInvoicesView` no longer holds a `useState` seeded copy, no longer applies the `applyGrOverlay` / `paragon_gr_posted` localStorage overlay, and no longer fabricates payment client-side. It consumes the query list directly and mutates through the command seam (`t_invoice_release_payment` → interim `Releasing Payment` → `settle` mints the real FI doc; dispute/resolve verbs) → `invalidateQueries(procurement)` → re-derive (3.6 pattern). Both persona surfaces project from the ONE canonical `invoiceStore`. |
| **STATE-PRIM-01** | Inline (section-level) state-primitive variants are needed for partial loading/error — today only full-page states exist. | Build when the first page needs one. |
| **DEFER-ACTION-01** | No shared "deferred action" visual treatment exists; dead/stub actions roll their own toasts/banners ad hoc. Deliberately NOT built in Batch 1.1a — it is an action-layer primitive whose taxonomy belongs to Phase 2′, so building it before the action layer is premature. | Build in Phase 2′ (action layer). |
| **WA-CONNECT-01** | `BuyerWhatsAppHub` showed a green **"CONNECTED — 360dialog Business API"** badge (pulsing dot) claiming a live BSP connection that does not exist. | Resolved in Batch 1.1b-iii — relabelled to an honest static amber **"Simulated — 360dialog (Phase 4′)"** marker; a live 360dialog Business API integration lands in Phase 4′. |
| **DEPLOY-PAGES-01** | GitHub Pages repo setting is still enabled (legacy build from `main` root): every push to `main` produces a spurious `github-pages` deployment even though deploy is Vercel-only and the root build artifacts were retired in PR #12. The `jcalderabarboza-star.github.io/paragon-supplier-portal/` URL serves nothing (root has no `index.html`). There is no `.github/workflows/` driving it — it is purely the lingering repo Pages setting. Surfaced while verifying the #20 merge deploy. | **OPEN.** UI toggle (Branch → None) did not stick across retries; authenticated API `DELETE /repos/.../pages` is refused (HTTP 422 "Deactivating GitHub pages for this repository is not allowed" — org/repo policy, not a token issue). Next proposed step: `PUT /repos/.../pages -f build_type=workflow` to stop the legacy auto-build (no Pages workflow present → no deploys), pending operator approval. Closes when the Pages API reads 404/`source: null` **and** no `github-pages` deploy fires on the next push. → **CLOSED (Batch 1.3 / SEC-GATE-01 verify).** UI toggle ×2 and API `DELETE` (422 org policy) both refused; resolved via `PUT .../pages -f build_type=workflow` (Pages API now `build_type: workflow`, `status: errored` — no Pages workflow exists, so nothing builds). Evidence: the `99889fa` merge push fired **only** a Production (Vercel) deployment — **no `github-pages`** — whereas every pre-flip merge (`265e89a`, `2e3d169`, `9d2d961`, `955ade3`, `9583b67`) fired both. The legacy auto-deploy is dead. |
| **SHIP-FIXTURE-01** | `BuyerShipments` still imports `src/data/mockShipments` directly (a direct-fixture page outside the 1.2 named scope). Adjacent PO/shipment-drift debt surfaced during the 1.2 census. | **CLOSED (v2.2 Step 1.2).** Satisfied: `BuyerShipments.tsx:35-39` is now a **type-only** import (`import type { Shipment, ShipmentStatus, ShipmentMode }`); runtime data comes from the `useShipments` hook (`:43`), not the fixture — no direct-fixture consumption remains. |
| **DP-1-WA-EMAIL-01** | `SupplierWhatsApp.tsx:969` has a `bg-navy` email-preview header — a DP-1 content-surface offender, distinct from the D-2-exempt WhatsApp/WeChat messenger chrome and the two `#1A1A1A` device bezels (chrome, exempt). | Future DP-1 pass (opportunistic when the page is touched). |
| **PERF-GRADEHIST-01** | `SupplierPerformance` renders a hardcoded `GRADE_HISTORY` chart + hardcoded hero grade/score under a "Sample data" pill; the page is otherwise fully migrated. Retiring the sample needs a net-new `getGradeHistory` read (+ hook). | When performance analytics needs a real per-period grade metric. |
| **STOREFRONT-FIXTURE-01** | `SupplierMyStorefront` still consumes `INITIAL_CATALOG` / `INITIAL_CERTS` fixtures directly (`useState(INITIAL_CERTS)`) instead of the wired `useStorefrontCatalog/Certs` hooks — its own migration debt beyond the mechanical `useCurrentSupplier` identity swap. | Resolved in Batch 1.3 PR-B (wrapper/inner reads; local mutable state seeds from `useStorefrontCatalog/Certs`). |
| **DP-1** | Fiori-aligned visual language — light surfaces, Odyssey colors as accents, semantic color reserved for state. A standing design principle applied opportunistically per touched page from Batch 1.1b onward. Full text in `CLAUDE.md` → Design principles. Applied in Batch 1.1b-i: navy content surfaces on BuyerRisk (ARIA card), SupplierPerformance (scorecard hero), and SupplierStorefront (teal→navy gradient hero) restyled to light surfaces. **Exemption (D-2):** authentic messenger chrome — WhatsApp `#075E54` / WeChat `#07C160` headers on BuyerWhatsAppHub — is deliberate product mimicry, NOT an Odyssey content surface; leave it. Only the `bg-navy` email banner there restyles (done in Batch 1.1b-ii: light surface + teal accent border + navy brand text; the WhatsApp/WeChat headers stay on-brand). | Standing; see `CLAUDE.md`. |
| **DOC-01** | `README.md` structure/page-table/roadmap rewrite is still outstanding — the Pages route tables (`/buyer/purchase-orders`, `/supplier/ship-notices`, etc.), the `pages/`+`data/` Project Structure section, and the Roadmap phase taxonomy still describe an older app shape. (Code-contradicted claims — GH-Pages live-demo URL, SAP-UI5 stack table, HashRouter rationale — were corrected in PR #16.) | Owner: Phase 5 (full README true-up). |
| **DOC-02** | No true Current State of Truth document exists in the repo — both `docs/` plan files are build plans (one was misnamed `Supplier_Portal_Current_State_of_Truth_v1.md`; it holds Build Plan v1.1, now renamed + superseded-banner'd). Fresh CST authoring (Mode 2, investigation-grounded) is due at a natural post-Phase-1′ boundary. | Post-Phase-1′. |
| **DP-2** | Restrained beauty-tech palette (extends DP-1) — one teal accent, navy for text only, semantic color = state only (soft/muted), one centralized chart ramp (`src/lib/chartPalette.ts` `CHART_SERIES`), decorative color flattened. Full text in `CLAUDE.md` → Design principles. Applies every batch from 1.3 onward. | Standing; see `CLAUDE.md`. Ramp SSoT created in Batch 1.3 PR-B; charted pages migrate opportunistically (SupplierPerformance first). |
| **DP-3** | Odyssey platform family theme (TMS alignment; extends DP-1/DP-2) — monospace for all data, quiet outlined status chips, TMS table grammar (grey header band, thin borders, generous rows). Full text in `CLAUDE.md` → Design principles. | Standing; see `CLAUDE.md`. **Central seams delivered in `feat/dp3-theme-tokens`:** StatusPill → quiet-outlined (110 sites inherit), TableHeader → grey band (25 files inherit; thin borders/generous rows already in place), `<Data>` mono data-cell primitive established. No per-page sweep — mono adoption + stragglers tracked in DP3-MIGRATE-01. |
| **SUPPLIER-SOURCING-01** | `SupplierDashboard` "Open Sourcing" KPI is a static value — no supplier-facing sourcing read exists (buyer-side `useRFQs` is invited-membership, not a supplier sourcing feed). Left static (not pilled — a lone KPI tile can't carry a pill cleanly) during the Batch 1.2 dashboard migration. | **SPLIT (F0.3).** **Read half — CLOSED:** the supplier-facing sourcing read landed with `SupplierRFQs.tsx` — `useRFQs` (invited-membership) + `useQuotations` (supplier-scoped) resolve off the mutable stores; the award-history tab (`buildAwardRows`) re-derives from the RFQ-award cascade, verified in-floor. **Write half — CLOSED (Task 3b).** Supplier quote *submission* (`t_quotation_submit`) + buyer *review* (`t_quotation_review`) wired through the command spine ([[F0.3-FIND-01]] closed); SupplierRFQs submit dispatches real, My-Quotes reads real `useQuotations`. The lone remaining sub-item is the cross-entity roster sync [[QUOTATION-RESPONDED-01]] (deferred, 3b-D). |
| **RFQ-DRAWER-01** | `BuyerSourcing` quote-comparison drawer has no responsive layout at compact width (criterion/quote column collision, clipped AI-composite circles) and uses multi-hue score bars (blue/orange/green) violating DP-2. | Resolved in Batch 1.3 PR-B — single-accent teal score bars (consume `CHART_SERIES`) + horizontal-scroll / stacked layout for 3+ quotes. |
| **VITE-BASE-01** | `vite.config.ts` carried `base: '/paragon-supplier-portal/'` for local non-Vercel builds — a GitHub Pages relic that broke local `vite preview` mounting (asset 404s under the subpath) and served no purpose under Vercel root-domain serving (Vercel already builds with base `/` via `process.env.VERCEL`, behind the `vercel.json` SPA rewrite). | Resolved in Batch 1.3 PR-B (`4623881` — ⚠️ **UNREACHABLE: not an object in this repository, presumably a pre-squash branch SHA. Left verbatim as the record; see `CITED-SHA-SWEEP-01`**) — collapsed to `base: '/'`; verified via flag-free `npm run build && npm run preview` Playwright smoke (mounts, 0 console errors). |
| **VITE-DEV-ENTRY-01** | Plain `npm run dev` does not mount — `root: 'app'` + entry `../src/main.tsx` makes Vite dev serve `/src/main.tsx`, which 404s (file is above root). Distinct from VITE-BASE-01 (dev base was already `/`); the base fix does not resolve it. | Entry restructure deferred to the **polish batch** (Phase 5 hardening) — do not touch `root: 'app'` or the entry mid-migration. Local Playwright smoke path = `npm run build && npm run preview` (flag-free). **RECONFIRMED — PR #38 invoice-verb audit (2026-07-09):** a *fresh* `npm run dev` still serves blank (a `Sec-Fetch-Dest: script` request for `/src/main.tsx` 404s; curl without that header gets the HTML fallback → the false-200). This is the true root cause of the operator's "local dev is blank" and **supersedes the stale-server diagnosis** (killing stale 5173/5174 servers does not fix it). |
| **SEC-GATE-01** | The prototype was fully public on Vercel (no access gate; `/` → `/buyer/dashboard`) with an orphaned, unenforced mock `Login.tsx` at `/login`. Threat model: keep unauthorized/casual eyes and search engines off a pre-release, all-mock prototype before it goes to IT. Client-side gates rejected as theater (a `VITE_` code ships in the bundle; a localStorage flag is bypassable). | **CLOSED (PR #25, `cef5706`) — real server-side gate (Option C).** Vercel Routing Middleware (`middleware.js`) runs before the SPA rewrite and requires a valid HMAC-SHA256 signed, HttpOnly, 7-day session cookie for the app shell and every `/assets/*` chunk — the bundle never ships to an unauthenticated client. Credentials validated at the edge against **NON-VITE** `GATE_USER`/`GATE_PASSWORD`/`GATE_SECRET` (never bundled); fails **closed** (503) if unprovisioned. Gate screen is a middleware-served standalone HTML page in `Login.tsx`'s brand language (DP-1) — the in-app persona/CurrentIdentity flow is untouched. Logic lives outside `src/` (gate/, middleware.js) so the vitest 165 floor is unaffected; own `node --test` crypto proof (7/7) + Playwright full-flow verify via a local Node harness (`scripts/gate-preview-server.mjs`). noindex shipped (meta + robots.txt + `X-Robots-Tag`). Env vars set by operator in Vercel; per-persona gate creds not built (identity stays in-app). **Live-verified on `paragon-supplier-portal.vercel.app` (prod deploy `dpl_CL4VPT5J5BPPx8h5zX34TLVXJm4S`, sha `cef5706`):** unauthed `/` → gate 200 (not the app), unauthed `/assets/*.js` → gate HTML (bundle not served), correct creds → 303 + `pgate` signed cookie → app `index.html` mounts, cookie persists (authed asset served). Confirmed independently by operator from a clean browser. Note: Vercel captures env at build time — the initial post-merge deploy fail-closed 503'd until a redeploy re-captured the Production env vars (expected; documents the ordering for future env changes). |
| **DP3-MIGRATE-01** | DP-3 adjacent debt — surfaces the central theme seams do NOT cover, to migrate opportunistically per touched page (never a standalone sweep, per the DP-3 amendment): (a) **mono-for-data adoption** — the `<Data>` primitive + JetBrains Mono exist, but currency (`formatIDR`, 24 sites, 0 in mono), dates, and most table data still render as plain sans; wrap them in `<Data>` when a page is touched; (b) **9 files with raw `<table>`** bypassing the Table primitive — no grey header band until migrated: BuyerContracts, BuyerInventory, BuyerInvoices, BuyerOrders, BuyerShipments, BuyerSourcing, BuyerWhatsAppHub, SupplierOrders, SupplierShipments; (c) **≥3 files with inline status chips** duplicating StatusPill's class signature (won't inherit the quiet-outline): BuyerInventory, BuyerScorecard, SupplierPerformance. | Opportunistic per touched page (DP-1/DP-2 model). **(a) mono adoption CLOSED in DP3-FONT-01 (PR #31)** — the sweep is complete (every money/date/qty/doc token routes through `<Data>`). **(c) BuyerInventory inline chip CLOSED (PR #31 → StatusPill).** Remaining: raw-`<table>` → Table primitive (data cells migrated, but headers still raw); BuyerScorecard/SupplierPerformance inline chips are grade dials (grades excluded from StatusPill). Migrate remaining raw tables when a page is next edited. |
| **DP3-FONT-01** | Typography standardization (operator finding: 4 modules read with visibly different font treatments). Investigation (census across 30 pages): the h1/drawer-section roles were already canonical, but every "big number" role was a free-for-all — `font-extrabold` on 7 pages (a weight in no primitive), KPI-number size drift (text-4xl/3xl/2xl), 8 distinct section-header className strings, and mono applied inconsistently (doc-numbers mono, money/dates/qty plain; `<Data>` had 0 importers). | **CLOSED (PR #31, `feat/dp3-font-01`).** Canonical type scale tokens added (`title` 30/600, `section` 16/600, `kpi` 36/600 mono). PageHeader→`text-title`; KpiCard→`text-kpi font-mono tabular-nums`; all section `<h2>/<h3>`→`text-section` (16 files); `font-extrabold` retired (6 files; BuyerCompliance left per Track-R). Mono convention COMPLETED: `<Data>` made polymorphic and every money/date/qty/doc token across 23 modules routes through it (DP3-MIGRATE-01(a) closed). KPI numbers ruled mono (JetBrains Mono, tabular-nums, semibold) — legibility Playwright-checked at 36px. Floor 167. |
| **DP3-FONT-02** | Residual type-scale variance across modules — a follow-on to DP3-FONT-01. The canonical tokens (`text-title` 30/600, `text-section` 16/600, `text-kpi` 36/600 mono) exist and the KPI/section/`font-extrabold` sweep landed in PR #31, but they are **not universally consumed**: some surfaces still hand-roll sizes rather than the tokens. Operator-cited exemplars: the supplier **My Orders** KPI number size (off the `text-kpi` scale), **drawer/section headers** that don't route through `text-section`, and **hero headers vs page titles** reading at different scales instead of the single `text-title` role. Not a re-color (that is DP3-CHIP-01) — purely the size/weight/role token adoption gap. **Ops #11 (SEAT 2) census, file:line —** *KPI-number role* (canon `text-kpi` 36/600 mono via `KpiCard`): a hand-rolled `KpiProgressTile` is **duplicated verbatim** in `SupplierPerformance.tsx:118-128` + `BuyerScorecard.tsx:145-155`, rendering the value at `text-xl font-bold` (20px, non-mono, grade-colored via `style={{color:k.color}}`); also `SupplierPerformance.tsx:404`, `SupplierDashboard.tsx:367`, `BuyerScorecard.tsx:153`,`:258` (`text-xl font-bold`), `BuyerCompliance.tsx:180` (`text-3xl font-extrabold` — the banned weight, kept per Track-R) → same KPI role spans 20/30/36px; `SupplierWhatsApp.tsx:791` is mono-correct (`text-kpi font-mono`) but tinted `text-teal`. *Hero/section-header role* (canon `text-title` 30 / `text-section` 16): `SupplierStorefront.tsx:235` (`text-2xl font-semibold` hero name), `:213` (`text-2xl font-bold` avatar), `SupplierRegistration.tsx:219` (`text-lg sm:text-xl` h1), `:1103`,`:1113`, `BuyerRisk.tsx:785` (`text-xl font-semibold`), `:439` (`text-2xl font-bold`). *Off-scale arbitrary micro-sizes* (below `label` 11px): `text-[10px]` at `SupplierPerformance.tsx:129`, `BuyerScorecard.tsx:156`, `BuyerShipments.tsx:691`, `BuyerSourcing.tsx:1386`. *Non-primitive weights*: `font-black` `SupplierDashboard.tsx:123`, `font-extrabold` `BuyerCompliance.tsx:180`. *Mono straggler*: the `KpiProgressTile` value is a data number NOT routed through `<Data>`/`font-mono` (a residual beyond DP3-FONT-01's "mono completed" claim). | **OPEN — full-surface mechanical sweep.** Census every `text-[234]xl` / ad-hoc `font-*` heading + KPI number against the three canonical roles and repoint to the tokens (no visual redesign, just token adoption). **Disposition: the first PR after Phase 1′ closes, before Step 3 opens** (a bounded mechanical sweep, so it lands as its own PR rather than opportunistically). |
| **DP3-CHIP-01** | Status-chip tone consolidation — the remainder after the canonical `src/lib/statusTone.ts` landed (PR #31). The ratified "canonical wins all conflicts, no per-module overrides" is only **partially** applied: the zero-recolor duplicated maps were consolidated (POStatus ×3, SupplierStatus ×2, BuyerRisk severity), but ~13 per-page/domain maps remain, and full consolidation would **recolor** live chips — the census surfaced genuine conflicts the ratified table didn't fully anticipate: `In Transit` (neutral vs warning → canonical info), `Delayed` (danger vs warning), `Open` (info vs warning), `Confirmed` (info vs success), `Renewed` (info vs success), cert `pending`/`missing` (warning/neutral vs canonical), `Closed` (success vs neutral), plus three distinct High/Med/Low scales (severity vs priority vs stock). | **OPEN — needs operator sign-off on the recolor set before mass-applying** (per investigation-first). `statusTone.ts` provides `statusTone()` + `severityTone`/`priorityTone` context resolvers; migrating the remaining maps means accepting the listed recolors. Domain-specific enums (cert/compliance/conv/stock/source) may legitimately keep an explicit variant. Next: operator rules the recolor list, then migrate remaining maps + add `stockTone`/context resolvers as needed. |
| **COMPLIANCE-CARVEOUT-01** | `BuyerCompliance` is **deliberately unmigrated** from fixtures — it imports the `COMPLIANCE_ITEMS` mock directly (`BuyerCompliance.tsx:25-30` ← `src/services/data/mock/fixtures/buyerCompliance.ts`) rather than consuming `useDataService()`. This is intentional: the page is a redesign target (not a mechanical re-point) because its data model is superseded by the CMVE-side `ComplianceRegistryEntry` DTO v2 (v2.2 Step 5.5), so re-pointing it to the current service would be throwaway work. | Registered carve-out. **Lands at R2.2** as a DTO-v2 projection (Track R; v2.2 Step 5.6). **Phase 1′ exit criterion AMENDED:** all pages on `useDataService()` EXCEPT this registered carve-out. **→ I3.1:** the DTO read landed (`risk.getComplianceRegistry` + `ComplianceRegistryEntry` + `complianceProjection.ts`, fixture-first/SIMULATED). **→ I3.2: CLOSED.** `BuyerCompliance` (+ `BuyerComplianceWidget`) now read the seam via `useComplianceRegistry()` — the `COMPLIANCE_ITEMS` fixture-direct import is gone; status/daysRemaining are computed-at-read, the BPJPH KPI is scheme-aware, and the page renders SIMULATED via `<LivenessPill capability="compliance">` (green structurally unreachable). The page is now on `useDataService()` — the carve-out is retired. (Note: `halalXpersona.invariant.test.ts` keeps its OWN independent `COMPLIANCE_ITEMS` read by design — a separate name-vs-id guard, NOT this carve-out.) |
| **HALAL-XPERSONA-01** | Fixture cross-persona contradiction (sup-007). The buyer-side compliance aggregate (`src/services/data/mock/fixtures/buyerCompliance.ts`, keyed by supplier **name**) and the supplier-side persona fixtures (keyed by **id**, incl. sup-007) share no linkage, so the same real supplier can present contradictory compliance state across personas with no reconciliation guarantee. Surfaced in Critical Review v2 (halal set). | **Track R — R2.2.** sup-007 cross-persona reconciliation rides the `ComplianceRegistryEntry` DTO v2 (v2.2 Step 5.5), NOT row patches (Step 5.6). **Guarded (v2.2 Step 2.3, this PR):** a supplierId-keyed cross-persona invariant (`src/services/data/halalXpersona.invariant.test.ts`) reconciles the halal cert-story (certified/issuer/expiry) across master + storefront + compliance; the current contradiction set — **sup-007** (certified: compliance `Valid` vs master/storefront not-certified) and **sup-003** (expiry: compliance `2027-09-01` vs master `2026-11-01`) — is whitelisted by finding-id as KNOWN. Any NEW contradiction fails the gate. The invariant reads the id-keyed surfaces through the service seam, so it survives the R2.2 fold-in unchanged. **→ I3.1: CLOSED (reconciliation mechanism).** `ComplianceRegistryEntry` carries a `supplierId` FK (not a supplier-name key) — the linkage that structurally forbids the name-vs-id split; the read is supplierId-scoped (proven in `scoping.contract.test.ts`). The mechanism-defect is fixed; the whitelisted legacy contradictions in `COMPLIANCE_ITEMS` retire when `BuyerCompliance` re-points at I3.2. |
| **HALAL-CLOCK-STATE-01** | Status-vs-expiry contradiction (stored clock-state). `buyerCompliance.ts` stores BOTH `status` and `daysRemaining` as literals (e.g. `c-001` status `'Expired'`/`daysRemaining -346`; `c-002` `'Expiring'`/`70`) instead of COMPUTING Expired/Expiring/daysRemaining from `expiryDate` vs. the read-time clock — status drifts out of sync with expiry as the clock advances. Direct violation of law 0.5 (DR-8, computed-never-stored). | **Track R — R2.2.** On the DTO-v2 projection, `status`/`daysRemaining` become COMPUTED-at-read-time (never stored). **→ I3.1: CLOSED (mechanism).** `complianceProjection.ts` computes `computeStatus`/`daysRemaining` from `expiryDate` vs an injected `now` (pure, deterministic; `complianceProjection.test.ts`); the `ComplianceRegistryEntry` fixture stores ONLY `lifecycleState` + `expiryDate` — no clock literal exists. The legacy `COMPLIANCE_ITEMS` literals are retired when the page re-points at I3.2. |
| **HALAL-DEADLINE-DRIFT-01** | Deadline drift. Code + copy carried **01 Oct 2026** (`BuyerCompliance.tsx:111`, `:174-175`; fixture action copy "before October 2026") vs. the canonical BPJPH mandatory deadline **17 Oct 2026** (GR 42/2024 — D-DATE RESOLVED). | **Code anchors corrected in v2.2 Step 1.7 (this PR).** Scheme-aware BPJPH-KPI semantics ride R2.2 (Step 5.6). |
| **HALAL-UNDERREVIEW-01** [F2-23] | Under-Review is second-class. `'Under Review'` status exists (`ComplianceItem` type; fixture `c-012` BPOM) but has NO KPI tile (only Expired/Expiring surfaced — `BuyerCompliance.tsx:204`,`:210`) and no defined remind-eligibility. | **Track R — R2.2.** Under-Review gets explicit semantics: own KPI slot + remind-eligibility=false (v2.2 Step 5.6). **→ I3.1: CLOSED (mechanism).** `Under Review` is a first-class lifecycle state on the canonical machine; `complianceProjection.remindEligible` returns `false` for it (and for `Missing`) — Under-Review is no longer a silent second-class state (`complianceProjection.test.ts`). Its own KPI *tile* is a surface concern that renders at I3.2. |
| **HALAL-REMIND-01** [F2-24] | Remind: no-audit / no-throttle / false-delivery. The Remind action (`BuyerCompliance.tsx:332-350`) toasts "Delivered via WhatsApp" with no audit trail, no throttle, and no real channel — a false-delivery claim (violates law 0.6, honest-by-construction). | **Toast copy made honest in v2.2 Step 1.7 (this PR).** Real audited/throttled dispatch through the R1.2 reminder ladder rides R2.2 (Step 5.6). |
| **HALAL-ISSUER-BLIND-01** [F2-21] | Issuer-blind validity. Halal validity is computed from `status === 'Valid'` IGNORING the certifying scheme (`issuedBy`: MUI vs BPJPH) — `BuyerCompliance.tsx:105-107` counts any Halal `'Valid'` regardless of issuer. Post-17-Oct-2026 only BPJPH satisfies the mandate, so a MUI-only `'Valid'` cert is actually NON-compliant. | **Track R — R2.2.** BPJPH KPI derives from scheme-aware validity (Valid+MUI post-deadline = NON-compliant); DTO-v2 carries the issuer/scheme validity dimension (v2.2 Steps 5.5/5.6). **→ I3.1: DOWNGRADED — surface-ready, SIMULATED (NOT closed).** The mechanism is built: `ComplianceRegistryEntry` carries the `certType`/`issuer` dimension and `complianceProjection.schemeValid` computes MUI-legacy-post-`BPJPH_MANDATE_DATE` = NON-compliant even while the cert's own dates say Valid (`complianceProjection.test.ts`). But scheme-aware validity is a real-world-correctness rule — stamping it CLOSED against honestly-synthetic certs would be the honesty violation this lane guards. **Closes only when REAL issuer data (Track-R harvest) backs it.** |
| **GR-FABRICATION-01** | `GRInspectionWizard` fabricates SAP artifacts client-side. `src/components/v2-features/GRInspectionWizard.tsx:556` mints `MAT-DOC-${500000+seq}` in-browser; `:711` sets status `'Posted to SAP'`; `:714` persists the fabricated `sapMaterialDoc`; `:719-724` toasts "Posted to SAP as {doc}" — fabricated system artifact + false delivery claim (violates law 0.6). *(Anchor corrected vs. plan's assumed `pages-v2/…:677-726`: file is `src/components/v2-features/…`; fabrication spans `:556`+`:711`/`:714`/`:719-724`.)* | **CLOSED (v2.2 Step 4 batch ii — PR #37 merged `a1bff8f`).** The wizard no longer mints a MAT-DOC, sets `'Posted to SAP'` locally, or toasts a false delivery claim. It dispatches through the command seam: `t_gr_create` (store assigns the number; lines recorded at receipt) → the rolled-up header verb (the dispatcher re-derives the disposition from the stored lines) → `t_gr_post` (`sapBoundary` → `submitted`, interim `'Posting to SAP'` with **no** document) → `settle` assigns the REAL material document (Option B; minted only on settlement). Honest, requiredFields-aware toasts (`gr.*`). |
| **GR-LEGACY-READ-01** | `GRInspectionWizard` reads fixtures directly. `src/components/v2-features/GRInspectionWizard.tsx:6` imports `mockShipments`; `:118-125` reads it (`.filter`/`.find`) instead of `useDataService()`/`useShipments`. *(Anchor verified vs. plan's assumed `pages-v2/…`: file is `src/components/v2-features/…`; lines `:6`,`:118-125` confirmed.)* | **CLOSED (v2.2 Step 4 batch ii — PR #37 merged `a1bff8f`).** The wizard no longer imports `mockShipments`; `BuyerGoodsReceipt` resolves shipments through `useShipments()` and passes them down as a prop, and the `Shipment` type comes from the service contract. Additionally `getGoodsReceipts` now reads the mutable `goodsReceiptStore` (mirrors `getASNs`), so GR commands are reflected in the scoped reads and the page holds no local seeded copy. |
| **ASN-HONEST-01** | `SupplierShipments` fabricated a client-side ASN number (hardcoded `ASN-2026-007`) on wizard completion and toasted a false delivery claim (`"Paragon WMS notified · EDI 856 transmission queued."`) while never actually creating an ASN (reads came from the `MOCK_ASNS` const). Honest-by-construction violation (law 0.6), same class as GR-FABRICATION-01. | **CLOSED (v2.2 Step 4 batch i).** Create/submit route through the dispatcher; the mutable `asnStore` assigns a real ASN number (the supplier's own document — not a fabricated SAP artifact) and returns it on `CommandResult.entityId`. Toasts honest: `"{{correlationId}} recorded. WMS transmission pending live channel."` A blank draft honestly fails `MISSING_FIELDS`. Discrepancy-resolve is an honest deferred notice until the GR cascade lands (batch ii). **Update (batch ii):** the GR mismatch cascade (`t_gr_reject` / `t_gr_partial_approve` → `t_asn_discrepancy`) now lands, so an ASN reaches `Discrepancy` via the cross-entity fan-out; the supplier-side resolve verb remains the deferred notice (its own surface). |
| **ASN-WIZARD-01** | The `SupplierShipments` "Create ASN" wizard collects RICHER detail than the create/submit verbs persist. `completeWizard` (`SupplierShipments.tsx`) passes only `{poReference, carrier, trackingNumber, eta}` to `t_asn_create` / `t_asn_submit`; the wizard's `packages`, `weightKg`, `batchNumber`, `lotNumber`, `packingList`, `shipDate`, and `notes` fields are collected but DROPPED (not carried in the command payload, not persisted on the ASN). No fabrication (honest — the ASN that is created is real), but the extra detail is cosmetic until the ASN detail model carries it. | **REGISTERED — deferred.** Wire the richer fields when the ASN line/detail model + submit form expand to carry them (a payload + `asnStore` shape extension, not a new verb). Batch-i deliberately scoped the verbs to the canonical creation shape; the wizard's cargo/batch section is authored-ahead. Lands with the ASN logistics-detail surface (Phase 2′/4′). |
| **INV-XPERSONA-FIXTURE-01** | The buyer + supplier invoice fixtures were two hand-maintained projections of the SAME economic documents and had already DRIFTED: `INV-2025-BRL-0042` (sup-007) was `Payment Released` in `supplierInvoices.si-001` yet `Approved` in `buyerInvoices.binv-005` — the exact HALAL-XPERSONA-01 class of cross-persona contradiction DR-7 exists to forbid. | **CLOSED (v2.2 Step 4 batch iii — PR #38 merged `a106d31`).** The two fixtures are retired and collapsed into ONE canonical set (`fixtures/invoices.ts`, one `Invoice` row per document). Both persona reads PROJECT from it (`toSupplierInvoice` / `toBuyerInvoice`), so the surfaces can no longer disagree — proven by `invoiceRead.test.ts` (same document, two truthful labels; coherent advance). The BRL-0042 contradiction is resolved at the root (the substantiated `Payment Released` truth wins). |
| **INV-GR-OVERLAY-01** | The invoice 3-way match was faked by a client-side overlay: `BuyerInvoices` read `paragon_gr_posted` from `localStorage` (written by the GR page) and auto-advanced a `Pending Match` invoice to `Approved`/`Matched` with a fabricated `sapGrDoc` (`applyGrOverlay`). A localStorage side-channel standing in for a real cross-entity relationship. | **CLOSED (F0.2 — GR-post → invoice-match cascade).** The overlay was DELETED in batch iii (the page no longer reads localStorage); F0.2 wires the honest replacement. `t_gr_post` fans out `t_invoice_match` via the `cascades.ts` registry (census G4). The resolver computes the 3-way verdict from REAL PO×GR×invoice data (`deriveMatchVerdict`: GR rejects → Qty Mismatch; invoiced amount vs Σ(confirmedQty × unitPrice) within tolerance → Matched; else Price Variance), writes the invoice's `matchStatus`, and fires the header ONLY on a genuine `Matched` — a variance verdict writes the truthful state and honestly no-ops (the invoice stays Submitted). Fires at the `submitted` moment (adjudicated B), reusing the one dispatch-time cascade path; `sapGrDoc` stamping deferred (settle-only). **KNOWN DEFERRAL (→ A2):** the `matchStatus` WRITE is a resolver side-effect; its true home is a computed read-projection per DR-7 ruling 1 (retire the stored literals), which is Stage-2 batch **A2** — `deriveMatchVerdict` is authored so the read layer calls the SAME function then. Proven by `grInvoiceMatchCascade.test.ts` (Matched fires header + DR-10 causation grouping; Qty Mismatch / Price Variance no-op honestly; non-Submitted invoice untouched). |
| **INT-TMS-01** | Portal↔TMS ASN boundary is not wired. Once an ASN is `Submitted`, its logistics lifecycle (`In Transit` / `Delivered` — `system`-trigger transitions on `advanceShipNotice.flow.ts`, authored but unwired) belongs to the **TMS Control Tower** (the Odyssey platform sibling), not the Supplier Portal. There is no integration seam handing the submitted ASN to the TMS, and no inbound channel for TMS-driven logistics events to advance the ASN. | **REGISTERED — Phase 4′ wire.** The ASN carrier/logistics events flow across the Portal↔TMS boundary when the real integration lands (the `asn:carry` transitions become TMS-driven, mirroring how `t_gr_post` is SAP-driven). Until then In-Transit/Delivered stay authored-unwired. Tracks the Odyssey-family alignment (DP-3) at the data-flow level. |
| **DP2-PALETTE-01** | Visual-conformance census (Ops #11, SEAT 2) — **COLOR axis**, sibling to DP3-FONT-02 (size). Canon (task-ratified, matches `tailwind.config.js` + `statusTone.ts`): `action` #0070F2 = **primary/interactive/selected/active**; `teal` #0097A7 = **decorative/brand-accent ONLY** (charts, score dials, low-emphasis links — NOT primary); semantic (green/amber/red) = **state only**; every chart consumes `src/lib/chartPalette.ts` (`CHART_SERIES`/`CHART_SEMANTIC`/`CHART_GRID`). **NB the CLAUDE.md DP-2 text still says "teal = interactive/active" — that predates the action-blue system and should be trued-up to "teal = decorative, action = interactive" as part of this batch.** Deviations (file:line → target): **(A) Charts not sourcing `chartPalette.ts`** — only `SupplierRFQs` imports it; 8 chart pages hand-roll hex (via per-page `TOKEN_*` mirror consts or literals): BuyerDashboard, BuyerAnalytics, BuyerInvoices, BuyerInventory, SupplierPerformance, SupplierDashboard, BuyerScorecard, BuyerRisk (SVG map) → repoint series/grid to `CHART_SERIES`/`CHART_GRID`. **(B) Rainbow / semantic-as-decoration in charts** [HIGH, user-visible on share]: `BuyerDashboard.tsx:201-204` "Supplier Health Index" bars `fill={GRADE_COLOR[grade]}` (A=#107E3E green / B=#1E5BAE blue / C=#B45309 orange / D=#BB0000 red) — ad-hoc 4-hue ramp on the buyer landing page (the operator-cited stray colors); `BuyerAnalytics.tsx:563-565` channel stacked bars color WhatsApp=SUCCESS-green / Email=DANGER-red (category, not state) → `CHART_SERIES`; grade-dial maps `SupplierPerformance.tsx:58-61`, `SupplierDashboard.tsx:73-77`, `BuyerScorecard.tsx:72-75`. **(C) Genuinely stray off-token hex (breaks palette)** [HIGH]: `BuyerInventory.tsx` DOS-trend chart — `#0F766E` (Tailwind teal-700, a SECOND teal ≠ token #0097A7) `:728`, `#6B7280` (gray-500 ≠ text-tertiary #6B7785) `:720`,`:723`, `#E5E9F2` (≠ grid #E5E9EE) `:715`. **(D) Teal used as PRIMARY / selected / active interactive → should be `action`** [needs recolor sign-off, à la DP3-CHIP-01]: selected/active `border-teal`/`bg-teal-soft` — `BuyerContracts.tsx:691`,`:846`, `BuyerSourcing.tsx:548`,`:627`, `BuyerRisk.tsx:526`, `SupplierRFQs.tsx:984`, `SupplierShipments.tsx:731`, `SupplierRegistration.tsx:617`,`:649`,`:896`; solid teal button/badge fills `bg-teal text-white` — `BuyerRequisitions.tsx:80`, `SupplierWhatsApp.tsx:831`,`:970`, `BuyerShipments.tsx:688` (quick-action). **(E) Chip forced off canonical tone**: `BuyerRisk.tsx:596` `<StatusPill variant="info" className="!bg-teal-soft !text-teal">` overrides info-blue with teal (also DP3-CHIP-01 territory). **Correct — keep (teal-as-accent):** AI/ARIA callouts, score dials (`ScoreBadge`), low-emphasis view-links, cert highlights, decorative icons, progress meters. **Exempt:** WhatsApp/WeChat messenger chrome (D-2 exemption) + `#1A1A1A`/`#444` device bezels; `src/pages/auth/Login.tsx` legacy slate hexes (pre-gate, outside the portal shell). | **OPEN — folds into the DP3-FONT-02 polish batch** (first PR after Phase 1′ closes, before Step 3 opens). Mechanical repoint: chart hex → `chartPalette.ts`; teal-interactive/selected → `action`/`action-soft`/`action-hover`; stray hex (C) → nearest token. Tiers (D)+(E) are recolors of live interactive surfaces → **need operator sign-off on the teal→action set** before mass-apply (same gate as DP3-CHIP-01), and the CLAUDE.md DP-2 text true-up rides with it. Tiers (A)+(B)+(C) are zero-ambiguity token adoption. |
| **I18N-01** | Bilingual EN/ID is a platform requirement. Architecture: **externalized strings** (i18n keys, never inline copy), **ID-first for supplier surfaces**. The react-i18next primitive (`src/lib/i18n.ts`) was proof-only (one key, EN-only). | **SEAM ADOPTED (v2.2 Step 3, this PR).** react-i18next kept as the seam; `src/lib/i18n.ts` extended with an `id` locale (stub) + the PO-confirm proof keys (real EN + ID stub). The Step 3.10 proof UI (`SupplierOrders` confirm surface) is the **first surface on the pattern** — strings resolve via `useTranslation()` keys. New surfaces use keys from here on. **Existing-page key sweep = Phase 3′** (mechanical, opportunistic-or-batched). Default runtime locale stays EN until the sweep flips ID-first. **Nothing gates Track R.** |
| **DNA-SEED-01** | Phase 3′ DNA items need type/interface seeds reserved now so later work is additive, not a refactor (v2.2 Step 3.9). | **PARTIAL (v2.2 Step 3, this PR).** `getCapabilities(scope): Promise<CapabilitySet>` reserved on `IDataService` (mock-backed via `capabilitiesFor` = persona-role map × flow catalog). The **`guidance` prop slot** on the inline state / deferred-action primitives is **NOT built** — STATE-PRIM-01 / DEFER-ACTION-01 have not landed yet (still full-page-only states; no action-layer primitive). Add the optional `guidance?` prop when those primitives are first built (Phase 2′ action layer), so the seed is co-located with the primitive rather than an orphan type. |
| **E2E-SUITE-01** | No committed browser-level (Playwright) e2e suite exists. The two crown invariants — *no cross-supplier leak* and *four honest states* — are backstopped **in-floor by vitest**: the 3-tenant service scoping contract (`scoping.contract.test.ts`) and the per-page `withChaos` state suites (data/loading/error/empty). Every prior Playwright verification in this repo was an **ephemeral operator-run `npx` pass** behind Vercel SSO + the SEC-GATE (there is no local gated target; the gate is Vercel-edge-only), never a committed suite. | **Deferred to Phase 5 (or the first stable ungated target).** Operator ruling (v2.2 Step 2.3): **rely on the in-floor vitest guarantee** — the committed Playwright suite is not built now; ephemeral operator-run passes remain the pattern. A committed `e2e/` suite (config + spec + gitignored `.env` gate creds + `test:e2e` script) lands when a stable ungated preview or Phase 5 hardening makes green-verification reproducible in CI. |
| **F0.2-FIND-01** | Action-layer honest-render gap on the invoice detail drawer. At `matchStatus = 'Pending GR'` (pre-GR-post), the drawer's **"Review match"** footer button (`buyerInvoices.footer.reviewMatch`, `BuyerInvoices.tsx`) renders as an **active primary** affordance but can only INFORM — it toasts "Awaiting 3-way match", it cannot act (the match legitimately cannot complete until a GR posts). Surfaced in the F0.2 / PR #55 pre-merge browser QA. NOT a logic defect: the cascade correctly cannot advance the invoice pre-GR-post, and the match STATE itself renders truthfully (`Pending GR` + "Awaiting goods receipt posting in SAP…", EN + ID; see INV-GR-OVERLAY-01 / F0.2). The gap is purely the affordance: an active-looking button for an action that is gated. | **OPEN — minor (fix-pack candidate, not a blocker).** At `Pending GR` (and any non-actionable match state) the button should read **gated/disabled** (or relabel to a non-action, e.g. an info affordance), so the control's appearance matches what it can do. Natural home: the deferred-action visual treatment — ties to [[DEFER-ACTION-01]] / STATE-PRIM-01 (Phase 2′ action layer). Batch into a fix-pack, not a standalone urgent fix. |
| **F0.3-FIND-01** | Supplier quote **submission** + **review** (`t_quotation_submit` / `t_quotation_review`, `quotation.flow.ts`) are authored-unwired and cannot be wired honestly this stage. **Submit:** the canonical `Quotation` requires AI-evaluation outputs — `complianceScore`, `priceScore`, `leadTimeScore`, `reliabilityScore`, `aiCompositeScore`, `aiRecommended` — that the supplier quote form (`SupplierRFQs.tsx`) never collects and the mock has no engine to compute; wiring submit would either **fabricate** those scores (the buyer's comparison drawer then treats an unscored quote as real + awardable) or write zeros (a misleading dead-looking quote). Creation plumbing is also absent: `quotationStore` has no `add`/`nextNumber` and `quotationTarget` has no `create` (unlike asn/invoice targets). **Review:** `from: ['Submitted']` has **no legal target** — every fixture quotation is seeded `Under Review` or terminal, so a wired review button could only no-op (a dead control) until submit mints `Submitted` quotes, itself blocked above. Adjudicated F0.3: DEFER, do not fabricate (à la [[F0.2-FIND-01]]). The honest RFQ half — `t_rfq_cancel` / `t_rfq_reopen` — WAS wired this batch. `t_rfq_publish` also stays authored-unwired (the only Draft fixture, rfq-008, has no invited suppliers → publish would yield a hollow 0/0 event; fixture-engineering, out of scope). | **OPEN — blocks [[SUPPLIER-SOURCING-01]] write half.** Home: a **quote-scoring primitive** (I-stage — the should-cost / commodity-FX + compliance-scoring engine that mints the score axes). When it lands, add `quotationStore.add`/`nextNumber` + `quotationTarget.create` (creationOwner = the invited supplier, mirroring the ASN/invoice creation-shape), wire `t_quotation_submit` on `SupplierRFQs` and `t_quotation_review` on `BuyerSourcing`, and retire the "Sample data / illustrative" pill on the supplier quote/award tabs. Also a **forward item (separate):** `BuyerSourcing` "New RFQ" wizard mints RFQs into local non-persisting `extraRfqs` state — it does not dispatch `t_rfq_publish`/creation, so a created RFQ vanishes on reload and is invisible to the invited supplier's read. Wire to a real RFQ-creation verb when the sourcing creation-shape lands (**RFQ-create forward item CLOSED, PR #77**). **→ CLOSED (Task 3b).** The quote-scoring primitive (`scoreQuotations`, PR #78) landed first, so submit could be wired WITHOUT fabricating scores: `t_quotation_submit` persists RAW FACTS only (unitPrice/leadTime/terms/validity) — derived axes stay the 0/false SENTINEL (engine owns them AT READ, #78), compliance/reliability seed from a documented SIMULATED baseline (never a lying zero). `quotationStore.add`/`nextNumber` (QUO-2026-9xx) + `quotationTarget.create`/`creationOwner` added; creationOwner folds invited-membership + scope into one ASN-faithful statement (invited supplier only, else SCOPE_DENIED). `t_quotation_review` (buyer, Submitted→Under Review) wired — its `from:['Submitted']` now has a legal source (submit mints Submitted). Supplier My-Quotes reads real `useQuotations` (own facts + status only — no competitive score/rank, 3b-C); the "Sample data / illustrative" pill + fake rank/score column retired. |
| **F0.4-FIND-01** | Fixtures store **clock-projected status as stored literals**, contradicting law 0.5 (computed-never-stored). Concrete: `mockObligations` carries `Upcoming`/`Overdue`; `mockContracts` carries `Expiring`/`Expired`; `SupplierDocument` fixtures carry `Expiring Soon`/`Expired` (and `Contract` also `Renewed`). These are read-time projections of a real event-state (Active/In Progress/Valid × a date-vs-clock comparison), yet they sit in the fixtures as first-class `status` values. Surfaced authoring the F0.4 flows (census G1): the flows' `states` deliberately EXCLUDE these projected values, so the state machine is honest — but the fixture literals still exist and the read layer renders them as-stored rather than deriving them. Pre-existing debt (predates F0.4; the flows do not touch fixtures, so no new contradiction is introduced). | **OPEN — minor, noted-not-fixed (adjudicated F0.4).** Home: the **read / DTO-v2 layer** — the same computed-at-read job as `ComplianceRegistryEntry` (Step 5.5) and the [[DNA-SEED-01]] projection slot. When the DTO-v2 harvest lands (R2.2 / Stage-2 I3), derive `Expiring/Expired/Upcoming/Overdue/Expiring Soon` from the entity's date fields vs the reference clock and drop the stored literal to the honest event-state. Not this batch (F0.4 is schema-only). **→ I3.1: PARTIAL — cert-literal class CLOSED (mechanism).** The compliance registry is the first entity fully on the computed-never-stored pattern: `ComplianceRegistryEntry` stores no clock literal and `complianceProjection.ts` derives the decay — the reference implementation for this finding's fix. The `mockObligations` / `mockContracts` / `SupplierDocument` literals are UNTOUCHED (their fixtures store `Upcoming`/`Overdue`/`Expiring`/`Expired`/`Renewed` still) and ride their own per-entity DTO-v2 landing. |
| **LIVENESS-DATASOURCE-01** | The LivenessRegistry derives liveness from **CommandTarget-wiring, not data-source realness**. A capability goes LIVE the instant its backing entity becomes a wired `CommandTarget` (`WIRED_COMMAND_TARGETS`). For `compliance` — legally-dated halal cert data (17 Oct 2026 mandate) — this is a latent trap: wiring a `CommandTarget` against the **synthetic** `COMPLIANCE_REGISTRY` fixture (e.g. to demo the inert submit/verify verbs) would flip the honest-render marker **green over fake certificate data** — the worst-case honesty failure on the most sensitive surface in the build. The real SIMULATED→LIVE flip is genuinely **TWO gates**: (1) a `CommandTarget` wired [structural] AND (2) the real data source landed [operator-verified, the Track-R harvest]. Gate-1 alone must never claim LIVE on compliance. Surfaced authoring the I3.3 flip harness. | **OPEN — the two-gate guard is now STRUCTURAL, closes at harvest.** I3.3 encodes the guard in the registry (`src/services/liveness/registry.ts`): a harvest-gated capability carries a `HARVEST_GATED` entry (gate-2); `isLive` = `isGreenFrom(backing, WIRED, awaitsHarvest)` requires **both** gate-1 (`livenessFrom` wired ⇒ LIVE) **and** gate-2 (`!awaitsHarvest`). The pure cores are injectable so `flipHarness.test.ts` proves every cell: not-wired ⇒ SIMULATED; wired-but-harvest-pending ⇒ **guarded, not green** (this finding); real-data-without-wiring ⇒ not green; **both gates ⇒ green** (the real 17-Oct flip). The flip is a proven **two-edit** op: wire the compliance `CommandTarget` (gate-1) **and** drop `compliance` from `HARVEST_GATED` once the Track-R data lands (gate-2). **Closes when the Track-R harvest makes gate-2 real** (the real read swap behind `getComplianceRegistry` / `httpDataService`) and both gates flip together — until then the guard keeps compliance honestly SIMULATED regardless of wiring. See [[F0.6-FIND-01]] (marker sweep) and [[HALAL-ISSUER-BLIND-01]] (also awaits real Track-R data). |
| **F0.6-FIND-01** | Mechanism-3 static honest-render markers are **not yet under the LivenessRegistry**. F0.6 built the registry (`src/services/liveness/`) and routed the ONE reusable widget shell (`ExpandableWidget` → the 12 dashboard widgets) through it — one authority, honest-by-construction. But ~13 **hand-written page markers** still assert liveness as JSX/i18n literals with no registry read: `BuyerSupplierProfile.tsx:591`, `Marketplace.tsx:225` (+ `marketplace.ts:39` "illustrative"), `BuyerWhatsAppHub.tsx:137` & `:1102` ("Simulated — 360dialog"), `SupplierRFQs.tsx:409-410` (**RETIRED in Task 3b — the My-Quotes tab now reads real supplier quotations, so the "Sample data" marker was removed, not swept**), `SupplierStorefront.tsx:376`, `SupplierPerformance.tsx:374`, `SupplierDashboard.tsx:485`, `BuyerDashboard.tsx:170` & `:178` ("Illustrative — no live source"), and the `compliance.ts:77` toast. **The named contradiction:** `BuyerRisk.tsx:1026-1040` renders a pulsing **"LIVE"** dot **unconditionally**, while the same risk domain is `capability="risk"` → **SIMULATED** in `BuyerRiskWidget` (and now the registry). Two surfaces, one domain, opposite liveness claims. | **OPEN — follow-on sweep (adjudicated F0.6, scope (a)).** Deliberately NOT in this PR (one clean primitive). Home: a Mechanism-3 sweep that re-points each static marker at the registry — extend the `Capability` enum to cover the sourcing/storefront/whatsapp/risk-page surfaces, replace each literal with an `isLive(capability)`-driven marker, and **the derivation RESOLVES the `BuyerRisk` contradiction structurally** — once the risk page reads `capability="risk"`, it can only render SIMULATED (green becomes unreachable), forcing agreement with the widget. Mechanism-1 (deploy-env badge, `envBadge.ts`) stays OUT — it is deploy-env, not data-liveness. |
| **QUOTATION-RESPONDED-01** | `t_quotation_submit` (Task 3b) mints the `Submitted` quotation but does NOT sync the parent RFQ's `respondedSupplierIds` roster — so the buyer's `isAllResponded` gate (which drives the BuyerSourcing Award-CTA / DP2-BUTTON-01 solid footer) is still fixture-driven, not advanced by a real supplier submit. Adjudicated 3b-D: DEFER — a cross-entity roster write is a SECOND mutation (a would-be cascade with no verb), and adding it would break the ONE-mutation-path discipline for this batch. The quote itself is real + buyer-visible via `useQuotations` regardless; only the responded-roster count lags. The supplier's own already-quoted RFQs ARE honestly pruned from their Open list (SupplierRFQs reads the supplier's real quotations, not the RFQ roster). | **OPEN — deferred (3b-D).** Home: when the RFQ needs its responded-roster driven by real submits — either a `t_rfq_record_response` cascade fired from `t_quotation_submit` (submit → mark responded on the parent RFQ, one causation group, DR-10) or a read-time derivation of `respondedSupplierIds` from the quotation set (computed-never-stored, law 0.5). The latter is likely cleaner (the roster is a projection of "who has a quotation on this RFQ"). Lands when the buyer sourcing board needs live responded-counts; until then the fixture roster stands. |
| **COS-09** | *(refs @ `c1855ef`)* **Buyer-side twin of COS-07 — the lead-time cell renders "1 days".** `sourcing.cmp.leadTimeDays` (`src/lib/i18n/sourcing.ts:126` EN, `:389` ID) is a single key holding `'{{count}} days'`. i18next only PLURALISES when a key carries explicit plural suffixes (or `_one`/`_other` variants); a bare `{{count}}` key just interpolates. So the buyer comparison (`src/pages-v2/BuyerSourcing.tsx:2145`) prints "1 days" for the SAME quotation the supplier surface now prints "1 day" for (2e-b-3 / COS-07 fixed the supplier side with an explicit one/other pair). Two surfaces, one value, two renderings. Display-only: `leadTimeDays` is read verbatim by `leadTimeScoreFor`, and this cell is a leaf render — nothing stored, ranked or dispatched flows through the string. Found by the operator on the 2e-b-3 smoke, outside that batch's given scope. | **CP-0 sweep**, with the other display residue. Deliberately NOT fixed in 2e-b-3 — the batch was merged and the scope was fixed; reopening it to chase a twin found during its own smoke is how a bounded batch becomes unbounded. Fix mirrors COS-07 exactly: `sourcing.cmp.leadTimeDays.one` / `.other`, ID identical both ways (no number inflection), count through `formatNumber`. |
| **4a-FIND-01** | *(refs @ `c1855ef`)* **`num()` admits NaN across three creation targets.** `MockCommandService.ts:372` (rfq), `:451` (quotation), `:513` (purchaseRequisition) each define an IDENTICAL local `const num = (k) => typeof payload[k] === 'number' ? payload[k] : 0`. Because `typeof NaN === 'number'`, all three pass NaN straight to the store, and `isEmpty` in the dispatcher does not catch it either (NaN is not undefined/null/''), so `requiredFields` cannot stop it. Reachable only by a hand-crafted dispatch now that the wizard parses upstream (2e-b-4a), but the hole is real and identical in three places. | **Own batch, census first.** 2e-b-4a deliberately fixed at the MODEL and left the guard alone: three identical copies across three targets is shared-in-substance, and widening one while leaving two is worse than leaving all three. Needs a blast-radius census of every `num()` consumer before any change. |
| **4a-FIND-02** | *(refs @ `c1855ef`)* **A zero-quantity RFQ is blocked anonymously, not refused by name.** `BuyerSourcing.tsx:819` keeps the pre-existing `totalQty > 0` step guard, so a typed `0` disables Next with no message — the buyer is not told which rule they hit. Every sibling field on this arc refuses zero BY NAME (`ZERO_PRICE`, `ZERO_MOQ`) with its own sentence. Note the parser layer deliberately PRESERVES a typed zero (blank ≠ zero is the canon); the question is purely whether the surface should name the refusal. | **Operator ruling required** — commercial, not parsing. 2e-b-4a preserved the existing guard verbatim in meaning rather than tightening or relaxing it unilaterally. |
| **4b-FIND-01** | *(refs @ `c1855ef`)* **This codebase cannot currently test its own default locale.** `type="number"` returns `.value` VERBATIM in en-US (verified in-browser: typing "2.400" yields `"2.400"`), and jsdom does no locale parsing at all. The 2e-b-4a defect — the browser rewriting a value per locale before React sees it — therefore reproduces in NEITHER the test suite nor an en-US dev browser, only on an id-ID browser. A behavioural spec asserting the correct refusal PASSED over a surface that was broken in production. The mitigation applied in 2e-b-4b was to lock the INPUT CONTRACT (`type="text"` + `inputMode`, `BuyerSourcing.tsx:967`/`:1036`) because that property is locale-independent and jsdom-visible; the underlying gap is untouched. | **Front of CP-3**, with the `tsconfig.vitest` gate. Both are the same class: a verification surface that cannot see the thing it is supposed to verify. |
| **COS-05** | *(refs @ `c1855ef`)* **A USD quotation renders as Rupiah on the supplier surface.** `SupplierRFQs.tsx:113`, `:114`, `:166` call `formatIDR` unconditionally, so `qt-009a` / `qt-009b` (real `currency: 'USD'` fixtures) would read as `Rp 3` / `Rp 22.800`. LATENT today — `identitySources.ts` seeds only `sup-007`, so sup-005/sup-006 quotes never reach a supplier surface — but live the moment the currency path is fixed or a persona is added. | **2e-c**, blocked on the currency ruling. Fixing the formatter before the write path exists would dress an absent field as a handled one. |
| **COS-01 (label half)** | *(refs @ `c1855ef`)* **The quote-total preview is labelled with a currency the payload discards.** `SupplierRFQs.tsx:1112` prints `${form.currency} ${totalPrice}` from the selector at `:1076` (IDR/USD/EUR). 2e-b-3 fixed the GROUPING half (runtime-locale `toLocaleString` → pinned `formatNumber`) and deliberately did NOT switch to `formatIDR`, because hardcoding "Rp" beside a live USD/EUR label would make the platform contradict itself. | **2e-c**, with the currency ruling. Entangled by construction: the label cannot be made honest until the field it names survives the submit. |
| **COS-06** | *(refs @ `c1855ef`)* **`lib/format` silently rounds to 3 fraction digits.** `format.ts:16` `const idID = new Intl.NumberFormat('id-ID')` takes Intl's default `maximumFractionDigits: 3`, so a stored `0.3333` displays as `0,333`. Reachable: `readMoq` deliberately permits a fractional minimum (KG/L/MT), so a buyer can read a number nobody typed. | **CP-0 sweep.** `lib/format` is a SHARED primitive consumed across the app — `maximumFractionDigits` is not a local edit, and a blast-radius census comes first. |
| **COS-08** | *(refs @ `c1855ef`)* **`canSample` / `sampleLeadTime` are collected and discarded.** `SupplierRFQs.tsx:238`–`239` declare them, `:251`–`252` seed them, `:1302`+ render the controls, and `buildQuotationSubmitPayload` is never given either. The FIND-02 class (captures-what-it-discards) — but distinct from FIND-02 and from the currency drop in one decisive way: there is NO entity field and NO consumer, so nothing downstream re-asserts a contrary fact. A supplier is asked a question whose answer goes nowhere. | **Register only — do NOT build.** Needs a product ruling on whether sampling is a real capability first. Adding a field to carry an answer nobody consumes would be scope invention. |
| **MOQ-FIND-01** | *(refs @ `c1855ef`)* **A minimum order quantity that EXCEEDS the RFQ quantity carries no verdict.** 2e-b-2 made the supplier's stated minimum visible on the buyer comparison (`BuyerSourcing.tsx:2159`) as a bare fact, deliberately with no comparison against `selectedRfq.totalQty`. The case is live in the fixtures, not hypothetical: a 100,000 PCS minimum sits against `rfq-011`, an 80,000 PCS event — so a buyer can award a quote that cannot be ordered at the quantity being sourced, and the surface says nothing. Whether that should WARN, FLAG the comparison, or BLOCK the award is undecided. Booked at `quotationMoq.ts:43`, `i18n/sourcing.ts:114`, `BuyerSourcing.tsx:2159`, `BuyerSourcing.test.tsx:113`. | **Operator ruling required, then its own batch** — commercial, not parsing. 2e-b-2 stopped the DROP and deliberately attached no verdict, so this is an open decision rather than an unfinished implementation. Note it is the one member of this arc that could escalate: a blocking rule would make the minimum a value the award path *reads*, not merely displays. |
| **2e-FIND-04** | *(refs @ `c1855ef`)* **Free-goods / bundled zero-price lines have no representation.** `readBidPrice` refuses a zero unit price by name (`ZERO_PRICE`, `quotationPrice.ts:47`) because on a competitive bid line zero is not an offer. But a zero-price line is a *genuine* commercial construct — free goods, bundled or promotional supply — and today a supplier with a real one cannot express it. | **Separate capability, own batch.** Explicitly NOT a relaxation of the bid-price gate: it needs its own line type and its own audit story. Widening `ZERO_PRICE` to admit it would reopen the hole 2e-a closed, where an unreadable token became Rp 0 against a real audited quotation number. |
| **2f-FIND-01** | *(refs @ `c6b7e01`)* **Goods-receipt quantities are entered through `type="number"` + bare `Number()`, and the guard set is collectively blind.** `GRInspectionWizard.tsx:516`/`:531` are number inputs; `:522`/`:538` read them with `Number(e.target.value)`. The value is stored on the GR, `qtyRejected` is DERIVED from it (`:268`, `max(0, received − accepted)`), and `grHasRejects` (`MockCommandService:983`) drives the GR rollup/disposition. Two failures: (a) the 4b locale coercion — the browser rewrites the typed value before React sees it, on a quantity closer to inventory truth than anything in the 2e arc; (b) `Number('') === 0` satisfies EVERY existing guard (`:294`–`:296`: not negative ✓, accepted ≤ received ✓, no rejection reason owed because rejected is 0 ✓), so a cleared field silently posts a receipt asserting that nothing arrived and nothing was rejected. The guards are individually correct and collectively blind. | **2f-a — the next batch, at the FRONT of remaining CP-0.** Not tail work: same class as the RFQ-create defect on a surface closer to inventory truth. Three-part 2e-a pattern (input contract, one parse, no fabricating zero) PLUS an open question the operator has asked to be reasoned before building — whether keeping blank distinguishable from a typed zero *through to the stored GR* requires touching the guard set rather than only the parse. |
| **2f-FIND-02** | *(refs @ `c6b7e01`; **AMENDED at 2f-b, see below**)* **Contract value and notice-days are SIX reads with two `\|\| 0`.** `BuyerContracts.tsx:661`/`:677` are `type="number"`; the strings are read at `:415` (step gate `Number(draft.value) > 0`), `:439`/`:440` (entity, both `Number(...) \|\| 0`), and `:917`/`:920`/`:927` (review display). Byte-for-byte the `rfqCreateModel` shape 2e-b-4a retired, one surface over. **What each field actually let through:** the `> 0` gate INCIDENTALLY blocked the two zero-shaped failures on `value` (a blank, and a comma-grouped token that `type="number"` empties) — silently, naming no cause — but could not catch `Number('1.500') === 1.5`, which passed `1.5 > 0` and stored an Rp 1,500 commitment as Rp 1.5, rendered "Rp 2" by `formatIDR`. `noticeRequiredDays` had NO gate at all, so `\|\| 0` ran unopposed and a cleared field became a stated zero-day notice requirement. **⟶ CORRECTION (2f-b).** This row previously read *"`value` is stored on the Contract entity"* and *"four reads"*. Both were wrong. (a) **Six reads, not four** — `value` is read three times and `noticeRequiredDays` three times. (b) **`value` is NOT persisted today.** The page imports only `useContracts()`; a "created" contract is fabricated into local `extraContracts` state (`CTR-FABRICATION-01`) and dies on unmount, and it is created `status: 'Draft'`, so it is also excluded from the Active-only `totalValue` KPI at `:983`–`:985`. The original wording overstated both persistence and aggregate reach. The honest statement: while `CTR-FABRICATION-01` stands it BOUNDS this defect's blast radius to a wrong number on a displayed row; it becomes a stored-fact defect the moment the fabrication is fixed. Corrected because a register carrying a known-wrong claim is worse than one with a visible gap. | **2f-b — DONE.** One PR. NOTE: this surface ALSO client-fabricates its entities (see `CTR-FABRICATION-01`) — 2f-b fixed the NUMERIC defect only and left the fabrication in place, noted in its PR body so the merge is not read as blessing it. Consequence recorded in `contractCreateModel`: with no dispatcher there is no `requiredFields` second lock, so the parse gate is ONE LOCK BY NECESSITY, not by oversight. |
| **2f-FIND-03** | *(refs @ `c6b7e01`; **AMENDED at 2f-c, see below**)* **The PO confirmed quantity is a bare `Number()` behind a number input.** `SupplierOrders.tsx:596` input, `:601` read, state `confirmedQtys: number[]` (no representation for blank), dispatched at `:192` as `confirmedQuantities` on `t_po_confirm`, policy-gated by `PO_CONFIRM_QTY_WITHIN_ORDERED`. **⟶ CORRECTION (2f-c).** This row previously claimed *"`Number('') === 0` produces a silent zero confirmation that PASSES 'within ordered': the supplier confirms nothing and the gate approves it."* **That was false, and was false at the filing ref:** `poConfirmQtyWithinOrdered` (`policies.ts`, unchanged since #35) enforces `0 < q ≤ ordered` per line — a LOWER bound as well as the upper one — so a zero is REFUSED at dispatch and never reaches the store. **Why it was mis-filed: filed from the policy's NAME ("within ordered" suggests only an upper bound) without reading its body** — the second register correction of this arc from the same cause (2f-FIND-02 overstated persistence the same way); this note exists to stop a third: a register row may not assert what a named mechanism does until the mechanism's body has been read. The honest defect census: (a) the misread NO gate can catch — `"1.500"` → 1.5, inside bounds, PASSED and was stamped `confirmedQty: 1.5` onto the stored line, poisoning `expectedValue = Σ(confirmedQty × unitPrice)`, the 3-way-match input (WORSE than filed); (b) the blank/grouped path fabricated a 0 into surface state and was bounced by the policy AFTER the fact, with the dispatcher's raw English debug string as the only explanation (UX defect, not a data defect — BETTER than filed); (c) the policy itself carried the `num()` NaN hole (`typeof NaN === 'number'`, and NaN fails both comparisons) — a hand-crafted dispatch could stamp NaN (closed in 2f-c, `Number.isFinite`, a named SE-Team spec edit). | **2f-c — DONE.** The inverted-locks batch: 2f-b was one lock by necessity (no dispatcher); here the SECOND lock existed and held, and the FIRST was missing — the first full two-lock build of the 2f arc. Parse gate + per-line refusals + courtesy bounds mirror sharing the policy's own predicate (`confirmedQtyWithinBounds`, ONE expression, two consumers) + the policy's first direct unit tests. |
| **2f-FIND-04** | *(refs @ `c6b7e01`)* **The supplier invoice amount is locale-blind (but not fabricating).** `SupplierInvoices.tsx:779` input, `:210` read `Number(newAmount)`. The guard at `:211` (`!Number.isFinite(amount) \|\| amount <= 0`) is REAL — no zero or NaN is fabricated. The residual defect is reading only: "1.500" resolves to 1.5 and passes as a valid positive amount, on a value stored on the invoice. | **2f-d**, last of the four. Lower severity than 01–03 precisely because the guard holds. |
| **2f-FIND-05** | *(refs @ `c6b7e01`)* **The drawdown tolerance percentage is locale-blind (but not fabricating).** `PolicyEditor.tsx:96` input, `:47` read `Number(pct) / 100`. `pctInvalid` (`:48`) catches empty/NaN/negative, so nothing is fabricated. The residual defect is reading only, on `tolerancePct` — a governed policy value that gates drawdown enforcement. | **2f-d**, with FIND-04. |
| **CTR-FABRICATION-01** | *(refs @ `c6b7e01`)* **`BuyerContracts` mints contract entities CLIENT-SIDE — the retired `extraRfqs` anti-pattern, alive.** `:306` holds an `extraContracts` state array, `:321` merges it into the list the page renders, and `:430` fabricates `id: ctr-new-${Date.now()}` with a client-computed `contractNumber` (`:422`, `baseContracts.length + extraContracts.length + 1`). This is exactly the C6 §1 anti-pattern that `t_rfq_create` was built to kill: identity and numbering are STORE-assigned, never client-minted. It is worse than a parse bug in kind, not just degree — the codebase is read by the SE Team as executable spec, and this asserts that contract identity is client-minted, which is false and is a thing SAP owns. | **NOT SCHEDULED — operator-level.** Filed, parked, deliberately unslotted: materially bigger than the batch that found it, and a spec defect rather than an implementation defect. Explicitly OUT of 2f-b's scope. |
| **BACKTEST-FIND-01** | *(refs @ `c6b7e01`)* **A conditional finding nobody has resolved.** `shouldCostBacktest.ts:15`: *"If an episode fails, that is a FINDING for a separate batch — the engine is never tweaked to pass its own gate."* The discipline is right, but nothing records whether any episode HAS failed, so the finding exists in a superposition: either there is nothing to do, or there is an unrecorded engine defect, and the register cannot tell which. | **Parked.** Needs someone to run the backtest and record the outcome — the cheap half is establishing which of the two states we are in. |
| **POLICY-ACTOR-01** | *(refs @ `c6b7e01`)* **`activeChangedBy` is declared and never written.** `delivery/types.ts:112` declares it, `delivery/policy.ts:79` and `:23` document that it is deliberately not written because no actor is threaded to that function, and `types.ts:1324` repeats the deferral. Characterised precisely: this is NOT the FIND-02 silent-drop class — the field is OPTIONAL on the type, nothing is collected from a user and discarded, and the absence is documented with its reason. It is an honest completeness gap awaiting the Stage-F dispatcher, recorded here so it is not mistaken for either a defect or a finished feature. | **Stage-F**, with the real dispatcher (an actor exists only once identity is threaded through commands). |
| **COS-10** | *(refs @ `c6b7e01`)* **COSMETIC, not a parse defect — named so it is not mistaken for one.** `BuyerChannelTriage.tsx:541` and `CommHubInbound.tsx:634` render `formatNumber(Number(o.qty))`, where `o.qty` is `String(unit.payload.totalQty)` — a number that ALREADY went through `normalizeQty` upstream, stringified for a toast and re-parsed. A pointless `String → Number` round-trip with NO locale risk, because the canonical form is convention-neutral by construction. Nothing is misread and nothing is fabricated. | **CP-0 sweep**, sweep-tier. Listed only so a future census does not re-open it as a residual coercion. |
| **GR-DISPOSITION-01** | *(refs @ `1f3e457`)* **The DERIVED goods-receipt header disposition does not survive the post — a receipt with rejected units is stored as accepted.** Observed on the 2f-a smoke against a real post (GR-2026-901, MAT-DOC-600001): the wizard derived **"Partially Approved"** from the lines (100 received / 80 accepted / 20 rejected, reason carried), rolled up via `deriveHeaderDisposition` (`grRollup.ts:49`) and rendered as explicitly non-editable (`GRInspectionWizard.tsx:325`). The STORED GR then reads **"Accept"** in all three places: the drawer header Disposition, the Disposition-Decision workflow step, and the list row. The vocabulary is not missing from the surface — GR-2026-010 renders "Partially Approved" in the same list — so the derived value is being dropped or overwritten between submit and store. `Disposition` is a real field on the entity (`mockGoodsReceipts.ts:52`). **NOT cosmetic and NOT a parse defect:** 20 units were rejected and the governed record says the receipt was accepted. It is derived-then-stamped-over, the exact inverse of the derived-never-stamped canon (law 0.6) that `deriveHeaderDisposition` exists to enforce. ROOT CAUSE DELIBERATELY UNLOCATED — filed from the observed symptom and the surface refs only, so the investigation is not half-done in the register. | **Investigation-first, own batch, UNSCHEDULED.** Not folded into 2f-a (merged, and out of its scope) and explicitly not investigated at filing time so the agreed 2f severity sequence is not rewritten by the most recent discovery. A candidate to JUMP THE QUEUE ahead of 2f-b/c/d, given it is a stored-fact defect rather than an entry-path one — the operator slots it. |
| **CTR-HIDDEN-SEED-01** | *(refs @ `1276453`, found on the 2f-b build)* **A hidden field's untouched default becomes a contract term nobody entered or saw.** In the contract-create wizard the notice-period input renders ONLY under auto-renewal (`BuyerContracts.tsx`, the `draft.autoRenewal &&` guard on the notice block), but `noticeRequiredDays` is written to the created contract UNCONDITIONALLY, and the draft seeds it to `'90'`. So a contract created with auto-renewal OFF silently carries a 90-day notice requirement that was never entered, never displayed, and never reviewed — the review step also hides the row when auto-renewal is off. NOT a parse defect, and NOT fixed by 2f-b: that batch made the number READ honestly and deliberately PRESERVED the unconditional write verbatim, on the same discipline that preserved the `> 0` step gate in 2e-b-4a. **Why it needs a ruling rather than an obvious fix:** "don't write it when auto-renewal is off" would be WRONG — the fixtures carry `autoRenewal: false` WITH a real notice period (`mockContracts.ts:79`–`:80` = ctr-002, 60 days; also ctr-004/006/007/009/011/012), so a notice period without auto-renewal is legitimate in the data model. A notice period is a termination term, not only a renewal term. What a hidden field should contribute to the stated terms is a contract-terms question. | **Operator ruling required — contract terms, not parse.** Filed, not scheduled. 2f-b left the write untouched and named it in code at the write site so the merge is not read as blessing it. Note 2f-b did NOT make the stale seed more visible or more likely to be committed: the seed path is unchanged (`'90'` parses and writes 90 exactly as before) and the one changed case — a field the operator CLEARED and then hid by unchecking the box — previously wrote a fabricated 0 in silence and now refuses out loud. |
| **CTR-BLANK-SILENT-01** | *(refs @ `0a11733`, found on the 2f-b smoke)* **The blank contract value blocks Next but SAYS NOTHING.** In the contract-create wizard (`BuyerContracts.tsx`), an untouched blank `value` is refused at the step gate — Next stays disabled — but no inline message renders: the refusal display is gated on `draft.value.trim() !== ''` (the 2e-a "an untouched blank does not nag on sight" precedent, applied verbatim from BuyerSourcing). Meanwhile EVERY neighbouring case explains itself: a typed `0` gets the `> 0` message, `"1.500"` gets the ambiguity copy, a cleared notice period gets its own refusal, and 2f-a's GR wizard explains a blank explicitly. The one case where a user is most likely to be confused is the one case that says nothing. NOT a data defect — the gate HOLDS (confirmed on the 2f-b smoke and locked by spec); the blank never becomes a value. The open design question is where "don't nag an untouched form" ends and "a silent block teaches nothing" begins — the same tension the `> 0` message just resolved in favour of speaking. Note the no-nag precedent is shared: BuyerSourcing's `totalQty` has the identical silent-blank behaviour, so a fix here should decide the PATTERN, not one field. | **CP-0 sweep — cosmetic, display-only.** Filed, not fixed; reopening a merged batch for copy is not warranted. EXCEPTION pre-authorised by the operator: if it falls out for free in 2f-c, take it there and say so in that PR body. |
| **QA-PERSONA-01** | *(refs @ `32778e4`, found on the 2f-c smoke)* **The operator cannot hand-verify any multi-supplier surface.** Persona is route-driven and seeded sup-007 (`CurrentIdentityContext`); there is no UI affordance to become a different supplier, so e.g. sup-005's PO-2025-00105 — the two-line PO-confirm composite — is unreachable by hand. This is CORRECT for production (a real supplier is only ever themselves), so the gap is a TESTABILITY gap, not a product one: no demo/QA affordance exists to seed another supplier identity. Consequence, stated at register level so it is not rediscovered per batch: **every multi-supplier or cross-supplier claim in this codebase is spec-verified only**, and the operator smoke — which has caught what specs missed twice in this arc (#139's locale bypass; 2f-a's coverage gap) — structurally cannot reach it. First concrete instance: 2f-c's two-line composite was landed spec-only, explicitly noted as not operator-verified. | **CP-3 (structural guards), alongside CI and the tsconfig gate. NOT a 2f item, not scheduled now.** Any future demo/QA persona affordance must be env-gated out of production builds — the production invariant (a supplier is only ever themselves) is load-bearing for tenant scoping and must not be weakened to buy testability. |
| **INVOICE-CREATE-CONTRACT-01** | *(refs @ `d5d37d5`, found on the 2f-d body-read)* **`t_invoice_create` does not require an amount, and the store defaults the absence to Rp 0.** `invoice.flow.ts` gives `t_invoice_create` `requiredFields: ['poReference']` — amount is required only at `t_invoice_submit` — while `MockCommandService:304` writes `amount: typeof payload.amount === 'number' ? payload.amount : 0` (same shape at `:272` for submit). So a create dispatched without an amount mints a stored **Rp 0 invoice**, and the flow contract and the only UI create path (which requires an amount) disagree about whether the amount is a create-time fact. Not UI-reachable: 2f-d's parse gate refuses every unreadable amount before dispatch. **Why this is NOT a hole in a lock and was deliberately not fixed in 2f-d:** 2f-c edited `requiredFields` on a verb that was ALREADY defined — tightening an existing guard. Adding `'amount'` here would AUTHOR a contract for a fact the verb does not currently claim, and the draft-then-submit shape may be the intended model (a Draft invoice legitimately having no amount yet) that the UI simply does not use. That is a design act — what a Draft invoice IS — and design acts do not belong inside a parse batch. | **Operator/SE-Team ruling required — spec, not parse.** Filed, not scheduled. Note the two `MockCommandService` defaults are separately recorded as 4a-FIND-01-family below, and stand whichever way the contract question is ruled. |
| **NUM-GUARD-FAMILY-01** | *(refs @ `d5d37d5`; the 4a-FIND-01 census, extended at 2f-d)* **Two more `typeof x === 'number'` store defaults that cannot see NaN.** `MockCommandService:272` (invoice submit: `toState === 'Submitted' && typeof payload.amount === 'number' ? payload.amount : …`) and `:304` (invoice create, as above). `typeof NaN === 'number'`, and the dispatcher's `isEmpty` (`dispatcher.ts:151`) only catches `undefined`/`null`/`''` — so a hand-crafted NaN amount passes both the required-field check and the store guard, lands on the invoice, and then poisons `deriveMatchVerdict` (an invoice whose amount is NaN can never match, silently, forever). Same shape as the three `num()` closures filed at 4a-FIND-01 and as the PO-confirm policy hole CLOSED in 2f-c. Recorded so the family is enumerated in one place rather than rediscovered per batch: the fix is `Number.isFinite`, and the pattern is that a `typeof` check reads as a type guard while doing none of a value guard's work. | **CP-0 sweep / Stage-F, with the real dispatcher.** Not UI-reachable today (every entry path in the CP-0 arc now routes through `normalizeQty`, which never returns NaN). Filed as census, not scheduled: the two locks that WERE load-bearing for a batch have been closed in-batch (2f-c policy hook, 2f-d `setActivePolicy`); these are not, and closing them piecemeal outside a batch that leans on them is how a sweep turns into scope drift. |
| **2e-c-1-FIND-01** | *(refs @ `185186b`, found on the 2e-c-1 build; **BLOCKS 2e-c-2**)* **A EUR bid renders rounded to the whole euro — €2.85/KG displays as "€3".** `BuyerSourcing.tsx` `formatMoney` is a USD-vs-domestic BINARY, not a currency-aware formatter: both of its ternaries read `currency === 'USD' ? … : …`, so every non-USD currency inherits the rupiah branch — `id-ID` grouping and `maximumFractionDigits: 0`. Rupiah wants zero decimals; the euro does not. The result is not a formatting blemish but a **~5% misstatement of the supplier's stated price**, rendered in the unit-price and line-total cells of the comparison table a buyer awards from. 2e-c-1 widened the parameter to `BidCurrency` (it had to — the entity widened) and deliberately left the BODY alone: choosing EUR's locale is a presentation ruling, not a representation change, and this batch was scoped to representation. **Currently unreachable** — no fixture carries EUR and the currency does not survive submit — so widening the signature changed nothing that renders. LOCKED BY A WITNESS TEST (`BuyerSourcing.test.tsx`, "WITNESS (2e-c-1-FIND-01)") which asserts the wrong output on purpose and reaches into `quotationStore` to construct the case: the day EUR becomes storable that test forces the decision instead of the rounding shipping behind a green suite. Note the supplier-side twin is already filed as **COS-05** (unconditional `formatIDR`), and the two should be fixed together — one ruling, two surfaces. | **2e-c-2, as a PRECONDITION.** 2e-c-2 makes the currency survive submit, which is exactly what makes this reachable. Needs one operator input: EUR's display locale (`de-DE` "1.500,00 €" vs `en-IE` "€1,500.00" vs staying `id-ID` with 2 decimals). Everything else is mechanical. |
| **2e-c-1-FIND-02** | *(refs @ `185186b`, carried forward from the 2e-c dispatch and confirmed on the build)* **Three names in the should-cost currency path that describe something other than what they do.** (a) `shouldCostSpread.ts` `fxApplied` computes `currency !== 'USD'` — i.e. "this is not the engine-native branch", not "FX was applied to this figure"; the two coincide only while the engine has exactly one FX-free currency, and they diverge the moment a second engine-native currency exists. (b) `SpreadCurrency` reads as "a currency" but enumerates ENGINE BRANCHES — it is the capability axis, and 2e-c-1 introduced `BidCurrency` as the policy axis precisely so the two stop being confused; the type name still invites the confusion. (c) `formatMoney`'s `= 'IDR'` default parameter asserted a fact about absent currencies at a call site rather than at the policy — narrowed in 2e-c-1 to `= BASE_CURRENCY`, so (c) is **CLOSED**; (a) and (b) stand. | **2e-c batch 5**, with the `SpreadCurrency` widening — the batch that touches these branches is the batch that should rename them. Renaming ahead of it would churn the same lines twice. |
| **2e-c-1-FIND-03** | *(refs @ `185186b`, a deliberate debt recorded at the moment it was taken on)* **The currency-capability gate sits at the CALL SITE, not in the resolver.** `spreadForQuote` is documented as "pure & total: every path returns a discriminated result", and it is — over `SpreadCurrency`. But the honest-silence decision for a currency the engine cannot price is made by `BuyerSourcing.tsx` before the resolver is called, so a SECOND consumer of `spreadForQuote` would have to remember to make the same decision, and nothing would tell them. The `'currency-unsupported'` reason is therefore declared on `SilentReason` but never RAISED by the engine that owns it. This was chosen over the alternative — widening `SpreadCurrency` now — because that 2-union is currently the only thing turning a wrong-branch bug into a compile error, and widening it without restructuring the branches converts compile-time refusal into a runtime lie (a euro measured against a rupiah band). One consumer exists today, so the exposure is zero; it becomes real the instant a second surface renders a spread. | **2e-c batch 5**, as the FIRST gate in `spreadForQuote`, ahead of every branch. Both the code comment at the call site and the `SilentReason` doc comment name this so the relocation is not rediscovered. |
| **2e-c-2-FIND-01** | *(refs @ `f494052`, found on the 2e-c-2 build; **the exposure this batch OPENS**)* **A mixed-currency quote set is now UI-reachable, and `scoreQuotations` is currency-blind — so a foreign bid hijacks the award ranking.** `quoteScore.ts:104` `ScorableQuote` carries `unitPrice` and no currency, and price scoring is ratio-to-best over the raw number. Feed it an EUR 3.00 bid alongside IDR 15,000 bids and 3 becomes the set's `minPrice`: every honest rupiah quote's `priceScore` collapses toward 0 and the EUR quote takes `topRanked` at 100. This is the SAME SHAPE as the misparse hijack already locked by `quotationPriceRanking.test.ts` ("the retired parser's value WOULD have hijacked the award") — a number that is not comparable to its rivals deciding who wins. **Newly reachable BECAUSE of this batch, and reachable only through it.** Before 2e-c-2 the currency never reached the payload, so every UI-created quote was currency-absent (= IDR) and no mixed set could be built through the product; the one multi-currency fixture (rfq-009) is deliberately internally consistent — `mockQuotations.ts` says so in as many words: *"Both quotes share the currency, so ratio-to-best scoring stays internally consistent."* That safety was an accident of the currency being dropped, and dropping it was the defect. **NOT fixed here, by explicit dispatch fence:** scoring stays currency-blind until the FxPin contract exists (D-1 pins the rate at first scored render), because converting on an unpinned rate would make a comparison that silently changes value between two page loads. The fence is right; the exposure is real; both facts are recorded. | **2e-c batch 3 — the FxPin contract + currency-aware scoring. This is now the arc's critical path, not a follow-up.** Until it lands, a supplier choosing USD or EUR on an RFQ whose rivals bid in IDR wins the price axis by denomination rather than by price. Interim options for the operator, none taken unilaterally: (a) refuse a submit whose currency differs from the RFQ's other quotes, (b) mark a mixed-currency comparison as unscoreable and withhold `topRanked`, (c) accept the exposure until batch 3 on the grounds that every current persona is domestic (`identitySources` seeds sup-007 only) so no foreign bid can be entered by hand today. |
| **2e-c-2-FIND-02** | *(refs @ `f494052`)* **The quote-submit toast shows the supplier a dispatcher constant.** `SupplierRFQs.tsx` renders `description: res.reason ?? …` verbatim, and `CommandResult.reason` is documented at `types.ts:1087` as "the machine-readable rejection reason" — strings like `MISSING_FIELDS:leadTimeDays`, `ROLE_NOT_PERMITTED:quotation:submit`, `SCOPE_DENIED`. So a supplier whose submit fails reads an internal token, identically in EN and ID: the i18n layer is bypassed entirely for the one message that appears when something has gone wrong. 2e-c-2 translated the ONE refusal it introduced (`isCurrencyRefusal` → `rfqs.toast.currencyRefused.body`, EN + ID, naming both the rejected token and the permitted set) and deliberately did NOT generalise: mapping every dispatcher reason is a refusal-vocabulary design task across every verb and surface, not a currency batch. PRE-EXISTING — not introduced here, and the currency path is now the one refusal on this surface that does speak the supplier's language. | **CP-0 sweep or its own batch.** Needs a decision on the shape: a per-reason i18n map, or a `reasonCode` field on `CommandResult` distinct from the human `reason` (the cleaner fix, and a contract change the SE Team owns). Note the same pattern will exist on every surface that renders `res.reason`, so this should decide the PATTERN, not one toast. |
| **2e-c-1-FIND-01** | **CLOSED (2e-c-2).** EUR renders en-IE "€2.85" — symbol leading, dot decimal, two fraction digits, by operator ruling — on BOTH surfaces (buyer comparison + supplier read-back, closing COS-05 with it). `formatMoney` moved from a `BuyerSourcing` local const to `lib/format` beside the rest of the app's money, its currency argument is now REQUIRED (no defaulted denomination), and each currency states its own locale and precision instead of inheriting a USD-vs-domestic binary. The witness test locked in 2e-c-1 fired exactly as designed and was resolved by fixing the rendering, not by relaxing the assertion (`'€3/KG'` → `'€2.85/KG'`). IDR now delegates to `formatIDR`, retiring a second rupiah rendering that differed from it by a NO-BREAK SPACE. | — |
| **COS-05** | **CLOSED (2e-c-2).** The three unconditional `formatIDR` calls on `SupplierRFQs` (submitted-quote unit price + total, awarded contract value) route through the shared `formatMoney`. One ruling, both surfaces: a supplier reads their bid back in the same format the buyer scores it in. | — |
| **COS-01 (label half)** | **CLOSED (2e-c-2).** The total-price preview rendered `${form.currency} ${totalPrice}` — a manual prefix compensating for a formatter that could not name a currency, on a field the payload then discarded. The currency survives the submit now, so the preview goes through `formatMoney` like the stored quote and the buyer's comparison. The register entry's own condition is met: *"the label cannot be made honest until the field it names survives the submit."* | — |
| **2e-c-3-FIND-01** | *(refs @ `66406b6`, an INTERPRETATION taken on the 2e-c-3 build — needs a nod, not a fix)* **D-1's "locks at first scored render" is implemented as "locks on recording", which is strictly stronger.** The weaker reading — a pin is editable until some comparison has been computed against it — requires tracking whether a render has yet CONSUMED a pin. Nothing can set that flag except a render, which would make scoring a WRITE: a pure engine cannot own it, and a surface that mutates governed data to record that it rendered is a worse defect than the one being prevented. So `FxPin` is deeply `readonly`, `fxPins` is an append-only ledger, and the effective pin is derived (`effectivePin`) — there is no edit path to forget to guard, which is the only kind of lock worth having. WHAT IT COSTS: a buyer who fat-fingers a rate must SUPERSEDE rather than edit, so a typo appears on the ledger permanently beside its correction. WHAT IT BUYS: every basis any comparison ever used is on the record, including ones that were never scored against. Both readings satisfy the audit intent; this one is simpler and has no unreachable branch. | **Operator confirmation only.** If the weaker reading was meant — pins editable until first use — say so and it becomes a small follow-up: an `unusedPin` predicate plus a `t_rfq_fx_pin_correct` verb that replaces rather than appends, gated on the pin never having been read. Nothing built here blocks that; the ledger would simply gain a rarely-used second write path. |
| **2e-c-3-FIND-02** | *(refs @ `66406b6`; **D-3 IS UNRULED — this is the placeholder awaiting your call**)* **`FX_PIN_MAX_AGE_DAYS = 7` is a placeholder, and staleness is measured from the RATE's vintage (`asOf`), not from when it was pinned.** The threshold lives in `currencyPolicy.ts` beside `BID_CURRENCIES` as a plain editable constant, exactly as dispatched: how fast a rate goes off is a procurement judgement, so the people who hold that judgement must be able to change it without touching the scoring engine. 7 days is the operator's stated lean going to JJ, used so the mechanism is real and tested rather than deferred behind a TODO. **The `asOf`-not-`pinnedAt` choice is a second decision inside D-3 and is called out separately** because it is easy to miss: measuring from `pinnedAt` would let a buyer refresh a three-week-old rate's apparent freshness merely by re-recording it, which is the opposite of what a staleness gate is for. Locked by test (`fxPin.test.ts`, "reads asOf, NOT pinnedAt"). Also decided here and worth a glance: an UNREADABLE `asOf` counts as stale rather than fresh — an unparseable date is not evidence a rate is current. **The freeze/staleness interaction:** a stale pin does not undo D-1. The freeze decides WHICH rate a comparison uses; staleness decides whether that rate is still fit to rank on, and when it is not the engine refuses and the buyer supersedes — the deliberate, audited act D-1 already requires. | **Operator ruling D-3.** Changing the value is a one-line edit and every test derives its boundary cases FROM the constant, so no spec hardcodes 7. If the `asOf` basis is wrong, that is a two-line change in `isStalePin` plus its two specs. |
| **2e-c-3-FIND-03** | *(refs @ `66406b6`, a SCHEMA EXTENSION taken on this build — flagged because it touches the shared spine, not just this arc)* **`TransitionDef` gained `statePreserving?: boolean`.** Some governed facts are recorded ON an entity without moving it, and the FX pin is the first: it is legal on an Open RFQ and on a Closed one (`t_rfq_award` is legal from both, so a comparison — and therefore a pin — must be too), and it must leave both where they are. `to` is a single value, so any concrete choice moves the entity for the other from-state: declaring `from: ['Open','Closed'], to: 'Open'` would silently REOPEN a Closed RFQ every time a buyer recorded a rate. The alternatives were worse — a second near-duplicate verb per from-state (two verbs for one act, differing only in a state), or writing the pin outside the dispatcher (which is the only path to the DR-10 trail, and a governed fact recorded outside the trail is what the trail exists to prevent). The flag follows `sapBoundary`'s established shape: optional, absent ⇒ unchanged behaviour, with `validate.ts` enforcing that it is not a creation and that `to ∈ from` so the declaration cannot lie about where the entity ends up. Every existing transition is unaffected and untouched. | **Filed for SE-Team awareness, not scheduled.** It is likely to recur — any "record a governed fact without advancing the machine" verb wants it (a note, an attachment, a recorded approval basis). Worth a look at the next spine review to decide whether the concept should be named more explicitly in the flow vocabulary rather than carried as a boolean. |
| **2e-c-3-FIND-04** | *(refs @ `66406b6`, found while wiring the surface)* **The comparison's score cells read `scoreById.get(id)?.x ?? 0`, which fabricates a real score of ZERO the moment the map is legitimately empty.** Harmless before this batch — the engine always returned a score for every quote, so the map was never missing an entry and the `?? 0` was unreachable. A refusal makes it reachable, and it would have painted every axis bar at 0 (the WORST value on each) for quotes the engine had explicitly declined to rank, with the composite dial — the number `topRanked` is argmax'd over — reading "scored, and worst". Fixed here (a `ScoreOrSilence` wrapper renders an em dash for an absent score) because ruling (b) is not implementable without it: withholding the ranking means withholding the scores, not restating them as zeros. **Recorded as a PATTERN, not just a fix:** `?? 0` on a derived-score lookup reads as a harmless default and is a fabrication the day the lookup can miss, and this codebase has the same shape elsewhere (`4a-FIND-01`'s `num()` family is the write-side cousin). | **CP-0 sweep — census.** Worth one grep for `?? 0` on optional-lookup reads across the buyer surfaces, filed so it is a deliberate sweep rather than a per-batch rediscovery. |
| **2e-c-2-FIND-01** | **CLOSED (2e-c-3).** `ScorableQuote.currency` is required; a mixed-currency set converts through the RFQ's recorded pin (`unitPrice × rate`, derived at read, never stored) or is REFUSED by name (`FX_UNPINNED` / `FX_STALE`, EN + ID, naming the currencies). The homogeneous-set exemption is proved on the real all-USD rfq-009: single-currency sets need no pin and score byte-identically to before. The operator's interim ruling (b) — withhold `topRanked` — is not a separate stopgap but the refusal itself: there was no window to leave open, because batch 3 landed as one PR. | — |
| **SCHEMA EXTENSION · `statePreserving`** *(TransitionDef, added 2e-c-3, ACCEPTED by operator at 2e-c-4)* | **A NAMED SCHEMA EXTENSION, recorded here as a register row rather than a merged-PR line — the SE Team reads this file as spec.** `TransitionDef` carries an optional `statePreserving?: boolean`. **What it means:** the transition RECORDS A FACT on the entity without moving it. The dispatcher applies it with the entity's CURRENT state, so `to` is never written. **What validation enforces** (`validate.ts`): it may not be a `creation` (there is no prior state to preserve), and `to` must be one of its own `from` states, so the declaration cannot claim a destination the dispatcher will not take the entity to. **Why it exists:** such a verb is legal from SEVERAL resting states and `to` is a single value. The first instance, `t_rfq_fx_pin`, is legal on an Open RFQ and on a Closed one — `t_rfq_award` is legal from both, so a comparison, and therefore a pin, must be too. Declaring `from: ['Open','Closed'], to: 'Open'` would silently REOPEN a Closed RFQ every time a buyer recorded a rate. **Rejected alternatives:** a duplicate verb per from-state (fragments the audit vocabulary — two transition ids for one act, differing only in a state); writing the fact outside the dispatcher (loses DR-10, and the trail is the entire reason pinning is a dispatched verb). **Shape:** follows `sapBoundary` exactly — optional, absent ⇒ unchanged behaviour, every existing transition untouched. **Operator reasoning on record:** *"A pin IS state-preserving: recording which rate ranked a set does not advance a lifecycle."* | **ACCEPTED and shipped.** Expect recurrence — any "record a governed fact without advancing the machine" verb wants it (a note, an attachment, a recorded approval basis). Worth deciding at the next spine review whether the concept earns a name in the flow vocabulary rather than a boolean. |
| **FX-FREEZE-DOCTRINE** *(D-1 + D-3, ratified 2e-c-4 — recorded verbatim at operator instruction)* | **The freeze decides WHICH rate; staleness decides whether that rate is still FIT TO RANK ON; when it is not, the buyer supersedes — the audited act D-1 already requires.** The two rules are therefore not in tension and neither weakens the other. Consequences as built: a pin is immutable from the moment it is recorded (2e-c-3-FIND-01 — stronger than "locks at first scored render", accepted); `fxPins` is an append-only ledger so a superseded basis stays readable for as long as the RFQ does; the pin in force is DERIVED (`effectivePin`), never stored, so "current" cannot drift from the ledger that justifies it; **D-3 = 7 days**, measured from the RATE's vintage (`asOf`), never from `pinnedAt` — measuring from the pin date would let a buyer refresh a three-week-old rate's apparent freshness by merely re-recording it. An unreadable `asOf` counts as stale. Operator reasoning on the threshold: IDR/USD moves enough in a fortnight to flip a ranking between two close bids, and a week is the natural rhythm of a comparison window. | **Doctrine — no action.** `FX_PIN_MAX_AGE_DAYS` is a plain editable const beside `BID_CURRENCIES`; no spec hardcodes 7 (every boundary case derives its dates from the constant), so retuning is genuinely one line. |
| **2e-c-4-FIND-01** | *(refs @ `86ff895`, **found by the operator smoke on the BUILT BUNDLE — the spec suite passed straight through it**)* **An open side panel rendered a STALE snapshot of its entity, so a command that mutated the open RFQ had no visible effect.** `BuyerSourcing` held `selectedRfq` as an RFQ OBJECT captured when the row was clicked. A command invalidated the query and the list re-fetched, but the open panel kept rendering the copy it was opened with. Observed live: a buyer recorded an FX rate, the pin landed in the store, and the comparison went on refusing `FX_UNPINNED` — because the panel was still reading an RFQ that had no `fxPins` on it. **Why no test caught it:** the batch's own spec asserted the STORE (`rfqStore.get(...).fxPins`) and not the SCREEN, so it passed with the defect present. Fixed by holding `selectedRfqId` and DERIVING the row from the live list, and the spec now asserts the refusal clears and the vintage appears without reopening the panel. **Recorded as a PATTERN, not an incident:** every panel that holds an entity object across a mutation has this shape. Award masked it here only because the panel closes on award; any future in-panel verb on this surface (or any other page with the same idiom) reintroduces it. Related in kind to 2e-c-3-FIND-04 — both are "the surface quietly disagrees with the store", one via a fabricated `?? 0`, one via a stale snapshot. | **CP-0 sweep — census.** Worth one grep for `useState<Entity \| null>` panel state across `pages-v2` to find the same idiom elsewhere, filed so it is a deliberate sweep rather than a per-batch rediscovery. Note the general lesson for specs: a surface test that asserts only the store is not a surface test. |
| **2e-c-4-FIND-02** | *(refs @ `86ff895`)* **`RFQ.currency` is the literal type `'IDR'`, and three `formatIDR` call sites on `BuyerSourcing` depend on that being true.** `estimatedValue` renders through `formatIDR` at the board, the drawer summary and the KPI strip. Those are CORRECT today and were deliberately left alone: the RFQ's own budget is rupiah BY TYPE, so a currency-aware formatter there would be ceremony around a fact the type already guarantees. They become wrong the moment RFQ-side currency intake lands — which is explicitly fenced out of this arc — and the type will change with it, so `tsc` will point at all three. Filed so that batch does not have to rediscover them, and so nobody "helpfully" converts them early and buys an assumption the data does not yet support. | **The RFQ-currency-intake batch, whenever it is dispatched.** Not scheduled here; the fence is right. The type change is the forcing function, so this is a note, not a task. |
| **2e-c-2-FIND-01 / ruling (b)** | **CLOSED and OPERATOR-VERIFIABLE (2e-c-4).** Hand-confirmed on the built bundle, EN and ID, using only seeded fixtures: sup-007 submits a EUR 3.00 bid on RFQ-2026-011 (which already carries sup-005's currency-absent rupiah quote qt-011a) → the buyer comparison refuses `FX_UNPINNED` naming EUR, withholds `Top-ranked`, renders every score axis as an em dash, and still shows both bids (`€3.00/PCS` beside `Rp 15.000/PCS`) → the buyer records 1 EUR = Rp 18.000 as of 29 Jul 2026 → the comparison re-ranks in place and **sup-005's Rp 15.000 bid takes top rank over the EUR bid (= Rp 54.000 converted)**. That is the hijack the finding described, demonstrated absent on a real bundle rather than only in a spec. | — |
| **D-4-EUR-SPREAD-GAP** *(operator ruling D-4, ratified 2e-c-5 — the ACCEPTED COST, parked so it is findable if it bites)* | **A buyer sees no should-cost signal on a EUR bid, and that is a decision, not an oversight.** D-4 ruled HONEST SILENCE: a fourth named reason on the spread output — *"quoted in a currency the model does not price"* — never a euro routed through the rupiah band. **Operator reasoning on record:** EUR bids are rare enough at Paragon that a quiet spread row costs a buyer little, while a second rate pair means a second feed to keep honest and a second thing to go stale — hand-maintained until `API_EXHGRATE` arrives at F1+ and gives both legs at once. **The counter is acknowledged and accepted as the cost.** What it would take to change: ONE entry in `SPREAD_BASIS` (`EUR: 'FX_CONVERTED'`) plus a real EUR leg on the FX feed — `FxRate` currently carries a single pair (`idrPerUsd`), so the feed is the work, not the branching. The engine is USD-native, so a EUR leg is EUR↔USD, not EUR↔IDR. | **Parked, not scheduled. Revisit trigger: a buyer reports the gap, or `API_EXHGRATE` lands at F1+ (whichever comes first).** If it becomes a funded EUR↔USD leg, it is an additive change — no re-branching, and the honest-silence path simply stops being reachable for EUR. |
| **2e-c-1-FIND-02** | **CLOSED (2e-c-5)** — all three names resolved. (a) `fxApplied` is GONE, replaced by `basis: SpreadBasis` on the result. Renaming the boolean was rejected: a boolean whose meaning is "the other branch" is the same defect with a better label, and the surface wants to know what the engine did. `basis === 'FX_CONVERTED'` drives the FX marker. (b) `SpreadCurrency` is RETIRED. It was named for a currency and was really an enumeration of engine branches — so it is replaced by `SPREAD_BASIS` (the branch table, the one place that decides which currencies the engine can price) with `PriceableCurrency = keyof typeof SPREAD_BASIS` derived from it. Both branch-named AND derived-from-policy, so the type cannot drift from the table. (c) closed at 2e-c-1. Also retired here: `currencyPolicy.test.ts` held a hand-listed `['IDR','USD']` copy of the engine's capability, so the guard against policy/capability drift could itself drift from the capability it guarded — it now reads `SPREAD_BASIS`. | — |
| **2e-c-1-FIND-03** | **CLOSED (2e-c-5).** The currency gate moved from the `BuyerSourcing` call site into `spreadForQuote`, as its FIRST gate — named in two places at the time precisely so the relocation would not be rediscovered, and both notes were honoured. Ordering is by how FUNDAMENTAL the obstacle is, the same doctrine that already put `tail` ahead of the unit gate: an unmapped material could be mapped and a tail could gain a basket, but a currency with no branch cannot be priced for ANY material, so reporting `unmapped` for a EUR quote would send a buyer to fix the wrong thing. The surface's `isSpreadCurrency` guard is deleted rather than kept as a mirror — with the union retired it would have been a second place for the rule to drift. | — |
| **2e-c-5-FIND-01** | *(refs @ `e688e8d`, recorded as the reason this batch was never a ride-along)* **Three separate branches tested the same fact, and each silently treated "not USD" as "IDR".** `shouldCostSpread.ts` decided the band (`currency === 'USD' ? nativeBand : idrBand`), the liveness (`currency === 'USD' ? basketLiveness : sc.liveness`) and `fxApplied` (`currency !== 'USD'`) with three independent tests of one condition. Under the 2-union all three were correct and none could be wrong; the union was the invariant holding them up. Widening it without collapsing them would have made a EUR quote take the IDR band (a **−99.99% spread** on a real comparison row: `(2.85 − 22600) / 22600`), inherit FX-leg liveness for a currency with no FX leg, and report `fxApplied: true` for a conversion through a pair that does not exist — three plausible, precise, entirely fictional facts. They are now ONE lookup (`const basis = SPREAD_BASIS[currency]`) taken after the gate, so the branches cannot disagree and cannot be reached for an unpriceable currency. **Recorded as a PATTERN:** a narrow union standing in for a guard is a real invariant, and widening one is never a mechanical edit — the branches it was protecting have to be found first. This one was named and deferred four batches in a row rather than taken opportunistically, which is why it landed without incident. | — |
| **2e-c-6-FIND-01** *(opened @ `f2eeed8`; **restated as a CLASS by the CP-0 sweep batch 1** — the original single-instance text is superseded by this row)* | **THE CLASS — a literal fixture date that feeds a computed-at-read state is only stable on ONE side of the clock, and nothing in the codebase says which side a given fixture is meant to sit on.** `isOverdue`, `isStalePin` and `computeStatus` all compare a stored date against the clock AT READ. That makes every such fixture date an assertion with a *direction*, and the two directions behave oppositely. **PAST-anchored = LOAD-BEARING DECAY: the date means "already past", and time only deepens the truth it asserts — monotone, true once and true for ever.** `rfq-013`'s pin (`asOf` 2026-05-09, `FX_PIN_MAX_AGE_DAYS` = 7) is stale permanently *on purpose*; that is the whole point of it, and `inv-evo-0188` (due 2026-06-04, commented "Intended OVERDUE demo row") is the invoice-side twin. **FUTURE-anchored = SILENT ASSUMPTION OF NON-DECAY: the date means "not yet", which is true only until one specific day the fixture never names, and false for ever after.** Same construct, opposite intent; the type system sees `dueDate: string` in both cases and the test names say nothing, which is why INTENT — not shape — is the axis. **BOTH INSTANCES: `inv-brl-0051` (`invoices.ts:50`, Submitted) and `inv-giv-0892` (`invoices.ts:102`, Approved), each `dueDate: '2026-08-01'`.** `isOverdue` is a strict `dueDate < today`, so **on 2026-08-02 both flipped to `Overdue` and main's floor fell from 1990/1990 to 1988/1990 with NO COMMIT INVOLVED** — `invoiceRead.test.ts` (expected `Pending Approval`, received `Overdue`) and `BuyerInvoices.test.tsx` (the `Release payment` button is offered on the computed label, so it vanished). *That is the evidence CP-3 is arguing from: a green main went red on a calendar boundary, and `git log` cannot show it.* **THE FIXTURES ARE NOT THE DEFECT.** Read at the instant they were authored for — **2026-07-06** — the invoice set is exactly coherent: ONE overdue row, `inv-evo-0188`, the row whose own comment claims that status. The defect is that these two specs asserted a clock-derived label while reading the REAL wall clock, when every other clock-aware spec in the repo already pins `now` (`invoiceProjection.test.ts`, `complianceProjection.test.ts`, the dispatcher specs' `now: () => '2026-07-06T00:00:00.000Z'`, and `sdcClock`/`SDC_SIMULATED_NOW`). Re-anchoring the fixture dates was rejected — and the rejection is this finding's own prior ruling: a clock read inside seed data makes every spec that reads the fixture time-dependent. A literal FUTURE date cannot express "not yet due" permanently, so the honest place to declare the reading instant is the SPEC, not the SEED. **CENSUS BOUND (empirical, not eyeballed):** the whole suite was run under shifted clocks at +30d / +90d / +180d / +1y / +2y / +3y / +5y; these two specs are the ONLY failures at every horizon, so the floor-breaking class is exactly two instances and one batch. | **CLOSED (CP-0 sweep batch 1).** Both instances fixed at the spec, not the seed: `src/test/demoClock.ts` exports `DEMO_NOW` = `2026-07-06T00:00:00.000Z` + `usePinnedDemoClock()` (a constant-offset `Date` proxy, so timers/`waitFor` keep running on real time), applied to `invoiceRead.test.ts` and `BuyerInvoices.test.tsx`. Floor restored to 1990/1990 and now clock-invariant. The RULE from the original row still stands for demo fixtures: seed the state that does not decay, and reach the decaying one through a user act. **STILL OPEN, deliberately NOT decided here:** the RUNNING demo still reads the wall clock, so it keeps drifting past its own present — five invoices read `Overdue` today where the fixture set intends one, and `inv-msm-0224` / `inv-mus-0214` (due 2026-07-10 / 2026-07-23) crossed earlier and unremarked because no spec asserts them. Same for the compliance registry (`creg-0008` 2026-08-20, `creg-0015` 2026-08-31, `creg-0003` 2026-09-15, `creg-0012` 2026-09-30 all read `Expired` within two months) and the contract set. That is the **demo-present canon question**, and it is the root this row is a holding action against. **SPLIT OUT AND FILED SEPARATELY as `FIXTURE-PRESENT-01`** (operator ruling on this PR): the specs assert what the fixture set MEANS — a coherent ledger with one intended overdue row — and that meaning must be stable or the floor decays again; the app rendering `Overdue` is the derivation working CORRECTLY on a fixture set whose present has moved on. That is demo drift, not a defect in either layer, and it is **not chased here**. |
| **2e-c-6-FIND-02** *(refs @ `f2eeed8`)* | **`rfq-009` is the FX specs' test bench, and seeding it re-premised three arc proofs.** The dispatch's item 6 named `rfq-009` for the pin seed. Adding a two-pin ledger there broke `BuyerSourcing.test.tsx` in three places — the refusal that must name BOTH unpinned currencies (a seeded USD pin makes the gate report only EUR, since `quoteScore.ts:255` checks unpinned before stale), the `fx-missing-USD` "No rate recorded" witness, and the append-only proof asserting `fxPins` length 2 after two dispatches. Those specs are written against "an RFQ with no recorded basis" because they MUTATE `rfq-009`'s quotes to mint mixed sets. Two further reasons made the relocation right rather than merely convenient: the batch's own fence says fixtures are ADDITIVE and no existing fixture migrates — seeding `rfq-009` is a migration; and `rfq-009` is homogeneous all-USD, so `quoteScore.ts:253` exempts it from the FX gate entirely and a pin there would rank NOTHING. It would have displayed a basis the comparison never used. The seed moved to the additive `rfq-013`, where the pin is load-bearing and its staleness has a real consequence. | **CLOSED (2e-c-6).** `rfq-009` left untouched and now carries a comment saying why. Zero existing specs changed by this batch. |
| **2e-c-6-FIND-03** *(refs @ `f2eeed8`)* | **Five of the arc's user-facing strings were looked up by string concatenation, so nothing in the build could tell that a reason had no translation.** ``t(...)` with a template literal` and four siblings in `BuyerSourcing.tsx` meant a newly-added refusal reason would ship with no key and render its raw key on screen — in EN and ID equally — with every existing i18n guard green, because a key-set parity test can only check the keys that exist. Two of the five additionally reached the reason through `as { reason: string }`, a cast that would have gone on compiling if the outcome shape changed underneath it, and called the parser twice per render. **Fixed by converting all five to exact `Record<Reason, string>` maps** — the same shape and for the same reason as this file's own `RFQ_QTY_REFUSAL_KEY` precedent. Widening `FxRefusalReason`, `FxRateRefusalReason`, `FxVintageRefusalReason`, `FxPinSource` or `SilentReason` now fails the BUILD until the strings exist. `fxCurrencyArc.test.ts` closes the other half — that each mapped key actually RESOLVES in both bundles, which the compiler cannot see because a typo'd key is a valid string. | **CLOSED (2e-c-6).** Neither guard alone is sufficient, which is why the arc shipped with neither. |
| **2e-c-6-FIND-04** *(refs @ `f2eeed8`)* | **Key-set parity proves a string EXISTS in Indonesian; it says nothing about whether it still says the same thing.** The arc's honesty claim is that a refusal NAMES its cause — `{{currencies}}` on FX_UNPINNED, `{{currencies}}` and `{{asOf}}` on FX_STALE, `{{currency}}` and `{{permitted}}` on the supplier-side currency refusal. An ID string that drops an interpolation is not a slightly-worse refusal: it is a refusal that does not say what is wrong, for half the userbase, and i18next renders it silently rather than erroring. **Added a placeholder-parity guard across ALL 38 i18n fragments** (`fragments.test.ts`), not just this arc's — EN and ID must interpolate the identical variable set for every key. **It found no existing drift**, so it lands as a LOCK rather than a fix; the value is that the next dropped placeholder fails a test instead of reaching a buyer. | **CLOSED (2e-c-6).** |
| **SIDEPANEL-I18N-01** *(refs @ `f2eeed8`, found during the 2e-c-6 ID smoke)* | **The side-panel close button is hardcoded English.** `SidePanel.tsx:53` sets `aria-label="Close panel"` as a literal, so in Indonesian a screen-reader user hears "Close panel" on every panel in the portal — buyer sourcing, orders, shipments, everywhere the shared primitive is used. Sighted users see only an icon, which is why it survived six i18n batches: it is invisible unless you read the accessibility tree, which the 2e-c-6 ID pass did. OUT OF SCOPE here — 2e-c-6's sweep is scoped to the keys the currency arc added, and this is a shared-primitive change touching every page that renders a panel. | **OPEN.** Small and self-contained: one key pair plus a `t()` at the primitive. Right home is the next batch that touches `ui-v2` shared primitives, or a standalone a11y pass. Worth checking the other shared primitives for the same class of literal at the same time. |
| **FX-DIALOG-SOURCE-DEFAULT-01** *(CP-0 sweep batch 1 — dispatched as a fix, **found ALREADY SATISFIED on main**)* | **The record-rate dialog's SOURCE already defaults to `MANUAL` / "Entered manually", and has since `e688e8d` (#154).** The sweep dispatched this as a change to make; the census found the behaviour correct on main and the item therefore stale. `blankPinDraft` (`BuyerSourcing.tsx:273`) seeds `source: 'MANUAL'`, there is exactly ONE construction path for the draft (`BuyerSourcing.tsx:2425`), and `FxPinSource` has no other non-test seed anywhere in `src/`. The reasoning the item was raised on still holds and is worth keeping on the record: nothing in this build is wired to SAP, so a SAP default would stamp a provenance that never happened onto the one strip that answers *"what basis ranked this"* — and a default is invisible in the UI right up until the moment it is wrong. | **VERIFIED + LOCKED (CP-0 sweep batch 1).** No production change made — editing correct code to reach a correct state would have recorded a fix that fixed nothing. Instead the behaviour is now pinned by a spec (`BuyerSourcing.test.tsx`, "SOURCE defaults to Entered manually, and the SAP rate type appears only for SAP") covering both halves: the `MANUAL` default, and the SAP rate-type field appearing only on SAP and being retired again on switching away — so a rate type can never ride along on a manually-entered rate. |
| **FIXTURE-PRESENT-01** *(split out of `2e-c-6-FIND-01` by operator ruling on #157; **a CP-2 item, NOT a sweep item** — see the last consequence)* | **The fixture set has an implicit "now" — 2026-07-06 — that nothing owns, nothing declares, and nothing moves.** The date is REAL but DERIVED, never stated: at that instant the invoice ledger is exactly coherent (one overdue row, `inv-evo-0188`, the row whose comment claims that status), and four spec files independently pin the same instant (`invoiceProjection.test.ts`, `complianceProjection.test.ts`, the dispatcher specs, and now `demoClock.ts`) — but no fixture, type or constant in `src/` says "this is the present these seeds were written for". `demoClock.ts` declares it for TESTS only, deliberately. **THREE KNOWN CONSEQUENCES.** *(1) The app's demo present drifts from the specs' pinned now.* The read path supplies `now` from the wall clock (`MockProcurementService`), so the running portal shows five `Overdue` invoices where the fixture set intends one — the derivation working correctly on a set whose present has moved on. *(2) Demo rows cross thresholds unremarked.* `inv-msm-0224` and `inv-mus-0214` (due 2026-07-10 / 2026-07-23) went `Overdue` weeks ago with nothing to notice; the compliance registry does the same shortly (`creg-0008` 2026-08-20, `creg-0015` 2026-08-31, `creg-0003` 2026-09-15, `creg-0012` 2026-09-30 all read `Expired` inside two months), and the contract set follows. Only the rows a spec happens to assert are audible; the rest degrade the demo silently. *(3) A fixture set that must be re-anchored BY HAND is one whose contract cannot be reliably machine-generated.* This is the consequence that relocates the item: a generator or harvest script cannot emit a coherent seed without knowing the present the seed is coherent AT, and today that value exists only as an unwritten convention recoverable by inference. **OPEN QUESTION — WHO OR WHAT OWNS THE FIXTURE PRESENT, AND DOES IT MOVE?** Options, stated without recommendation: **(a) A declared frozen present** — one owned constant the read path consumes instead of `new Date()`, the shape `sdcClock` / `SDC_SIMULATED_NOW` already uses for the SDC loop. App and specs agree by construction; cost is that the portal then renders a date that is not today, which must be surfaced honestly as sample-data-as-of or it becomes the manufactured-freshness claim `BuyerRisk` and `i18n/risk.ts` already retired. **(b) A rolling present** — seed dates computed from the read clock at load. Never drifts; cost is that `2e-c-6-FIND-01` already ruled this out (a clock read inside seed data makes every spec that reads a fixture time-dependent), so choosing it means reopening that ruling. **(c) Periodic manual re-anchor** — the status quo made explicit and owned, with a cadence. Cost is exactly consequence (3): it is the one option that cannot be machine-generated. **(d) Declared intent + computed literal** — the seed carries the ANCHOR (past / future) and the coherent offset, and a build or harvest step resolves it against a declared present. Preserves the monotone/non-monotone axis in the data rather than in comments; cost is a generation step the fixtures do not have today, which is why it lands with the harvest script rather than before it. | **OPEN — filed, deliberately NOT solved.** Carried to **CP-2**, to be decided alongside the harvest script and the `material_master_ref` freeze, because option (d) and consequence (3) are the same question as "can this contract be generated". No option is recommended here. Blocking nothing: the floor is clock-invariant as of #157 (`063adca`), so this can be decided on its merits rather than under a decaying test suite. |
| **SEAM-DOC-DRIFT-01** *(CP-1 · refs @ `063adca` · heads the C7/C8 seam block below)* | **Eleven doc-vs-code divergences across the C7 and C8 seams, and every one ran the SAME DIRECTION: the documents understated the implementation.** Eleven errors sharing a direction are one process gap, not eleven drafting errors. **Cause:** contract documents are generated ONCE by machine-harvest from code at a fixed commit and then **never re-harvested** while the code moves. There is no re-run trigger, and **no build step fails when a contract statement stops being true** — the documents are not on the floor, so they cannot regress a test. A frozen document describing a live implementation can only drift one way. **The asymmetry is the diagnostic:** a random drafting error overstates as often as it understates, and none of these overstated. **Consequence:** a conformance conversation held against these documents would have misreported our own position *in a peer platform's favour* — further along on wiring, further behind on ratification, than the documents said. | **CLOSED for C7/C8 (this batch).** C7 re-harvested and corrected; C8 issued as a real contract for the first time; `contracts/README.md` count corrected 6→10; `CLAUDE.md` corrected. **Process fix:** both documents now carry a re-harvest trigger — re-verified at each seam-touching batch and each CP checkpoint, and a contract statement that cannot be traced to a current `file:line` is a finding, not prose. **⚠️ C1–C5 have NOT been re-verified and must be assumed to carry the same class of drift** (flagged in `contracts/README.md`). |
| **C7-FIND-01 / -01a** *(refs @ `063adca`)* | PR create documented as author-inert with no `CommandTarget`, and the liveness capability documented as still needing to be added with a `null` backing. | **BOTH CLOSED — and -01a resolved DIFFERENTLY than the doc prescribed.** `purchaseRequisition` is a wired `CommandTarget` (`MockCommandService.ts:547-593`, registered `:983`; closure recorded in-code at `:538`) and `t_pr_create` dispatches into a mutable store. The capability is backed **structurally** to the wired entity (`registry.ts:78`), not `null`, with **gate-2 harvest gating** holding it SIMULATED (`registry.ts:70-77`). The shipped resolution is stronger than the prescribed one: a `null` backing is a hand-authored claim that goes stale exactly the way these documents did, whereas structural backing makes unwire-to-honest automatic. What holds the pill guarded is the honest absence of a live PRODUCER (SOMO = SPEC/F2, internal Grid = G1.2), not a fiction about wiring. |
| **C7-FIND-02** *(refs @ `063adca`)* | **The three-value quantity provenance collapses to one at the write, and the contract claimed otherwise.** C7 §2.1 asserted `wasAdjusted` is *"stored, not derived-and-discarded — the fact of human adjustment is itself the audit signal."* `purchaseRequisitionTarget.create` (`MockCommandService.ts:547-593`) reads neither `suggestedQty` nor `wasAdjusted`, `buildPrCreatePayload` (`planGridModel.ts:196-213`) does not emit them, and `PurchaseRequisition` (`types.ts:569-587`) has no field to hold either. Only `acceptedQty` survives, as `quantity`. What *does* survive is narrower and lives elsewhere: an override's reason + from/to ride the DR-10 `TransitionEvent` via `buildQtyDecision` (`planGridModel.ts:176-189`), and the reason-gate genuinely blocks an unexplained override pre-dispatch (`overrideBlocked`, `:165-172`). The audit signal exists **on the event, not on the entity**. | **OPEN — DEFECT, recorded as a defect rather than documented as intended behaviour.** Doc corrected to state both (C7 §2.1). Closing it is a code batch: either persist the two values on the entity, or restate the guarantee as event-scoped. Not bundled here — this batch is docs-only. |
| **C7-FIND-03** *(refs @ `063adca`)* | **`shortfall` was promised as RESERVED and was never reserved.** C7 §2.2 closed with *"Reserved now so the shape does not change when the constrained solve lands (additive-landing discipline …)"*. `shortfall` does not exist on `PrIntakeLine` (`types.ts:636-653`) and never did. The consequence is exactly the one the reservation existed to prevent: when SOMO's capacity-constrained solve lands, **adding `shortfall` IS a shape change, not an additive landing.** The field's semantics (an unmet portion must arrive VISIBLE, never silently truncated) still stand and are still right; only the claim that the slot exists is withdrawn. | **OPEN — DEFECT.** Doc corrected (C7 §2.2) and stated plainly to SOMO so they do not build against a slot we do not have. Same class as the three other fields C7 §2 listed that were never built (`bomContext?`, `decisionMetadata`, `liveness`) — of those, `liveness` is *correctly* absent (derived at runtime from `registry.ts:137`; carrying it per-line would fork the axis), so only `shortfall` is a defect. |
| **C7-FIND-04** *(refs @ `063adca`)* | **Five payload keys the code reads that no document stated** — `category` (`MockCommandService.ts:571`), `requestor` (`:579`), `costCenter` (`:580`), `justification` (`:587`), `priority` (`:565-566`). A conforming producer that *wanted* to populate them could not have known they existed. **`priority` is the sharp one: it is three-valued with a SILENT DEFAULT.** Anything not exactly `'High'` or `'Low'` — absent, `'HIGH'`, `'Urgent'`, a typo — yields `'Medium'` with no error and no marker. Every other unstated key degrades to `''`/`0` via the `str`/`num` helpers (`:557-558`), which is at least visibly empty; `priority` degrades to a **plausible value**, so an emitter with a casing slip produces a PR queue that is uniformly Medium and looks entirely normal. | **DOCUMENTED (C7 §3.1).** The five are now on the contract as the real conformance surface, with `PrIntakeLine` (what the portal *displays*) explicitly distinguished from the `create` payload (what it *accepts*) — a distinction no document had drawn. `priority`'s silent default is carried as a **candidate defect**, not fixed here. |
| **C7-FIND-05** *(refs @ `063adca`)* | **No idempotency contract exists at the PR intake.** The PR id is the store-assigned `prNumber` (`stores/purchaseRequisitionStore.ts:42-45`) and the payload accepts no external reference or dedupe key. The F2 Event Mesh boundary is **at-least-once by nature**, so a redelivered SOMO accepted-requirement event mints a **duplicate PR** with no detection. Related: an unrecognised `source` token is **dropped, not rejected** (`MockCommandService.ts:561-564`) — `'somo'` or `'SOMO_V2'` yields a PR with no producer mark and no error. | **OPEN — must close before the F2 wire lands.** Ours to close, not SOMO's. Recorded in C7 §2.3 alongside seven other undeclared assumptions the code relies on (IDR denomination, line-total-not-unit-price, two coexisting `period` formats, a period bucket stored in a date-named `requiredDate` field, payload-trusted `uom` where the C8 sibling refuses to trust it, wall-clock `createdDate` against a fixture set anchored to 2026-07-06). |
| **C8-FIND-01** *(refs @ `063adca`)* | **C8 had no contract file at all** — only an unratified proposal (`docs/C8_Forecast_Publication_Seam_Proposal.md`, 2026-07-16) that ended by asking SOMO to confirm the grain. In the interval the code hardened **past** the proposal: a **required `allocation` object** (the ⭐ top schema-affecting fix, `sdc/types.ts:113-120`, `:135`), a closed `Uom` union (`:71`), a per-line `provenance` (`:140`) and a shipped `commitmentClass` mapping — **none of which the document SOMO held described.** The worst form of the drift class: not a stale document but *no document*, with a shape hardening in code while a peer built against an overtaken proposal. Most load-bearing divergence: the proposal defined `ForecastLine.supplier` as SOMO-emitted, while the code states the supplier fan-out is **ours** (`sdc/types.ts:122-126`). | **CLOSED — `docs/contracts/C8-forecast-publication.md` issued.** SOMO's 2026-08-03 rulings carried as ratified: the **portal owns allocation** (SOMO emits material×period totals and holds no vendor entity of any kind), `ForecastLine.supplier` struck from the emission while `Allocation.materialPeriodTotal` is kept so SOMO's number stays auditable through our fan-out (enforced by integrity invariant #4, `sdc.integrity.test.ts:105-121`). The post-fan-out `ForecastLine.supplierId` (`:129`) is retained and explicitly distinguished from the pre-fan-out emission, so the strike is not misread. |
| **C8-FIND-02** *(refs @ `063adca`)* | **SOMO's inbound emission shape is not modelled anywhere in code.** Grep-confirmed: no `PlanTotal`, no inbound-plan type; the only residue of SOMO's number is `Allocation.materialPeriodTotal` (`sdc/types.ts:115`), which lives on our **post**-fan-out line. So the seam SOMO conforms to is prose, not a harvested shape — the one part of C8 that could not be written from code-truth. | **OPEN.** C8 §1.2 states the emission as **SPEC** and says plainly that it is unmodelled rather than implying a shape exists. Lands with the F2 producer. |
| **C8-FIND-03** *(refs @ `063adca`)* | **The shipped `locked → firm` `commitmentClass` mapping is VOID, and the void mapping is still in the code.** SOMO ruled that SOMO emits `lockState` + `approvalState` and **the portal projects the class**; our mapping was a unilateral derivation of a **commercial-liability statement** from a **planning state**, unratified by SOMO, procurement or finance. Recorded as **void/withdrawn**, not as a position we hold. | **OPEN — code/contract divergence, knowingly held.** `sdc/FLAGS.md` FLAG-1 neutralised in this batch (docs); the code comment (`sdc/types.ts:23`) and any mapping logic are **deliberately NOT touched** — booked as a separate code batch. **C8 is the authority in the interim.** Nothing is unsafe meanwhile: FLAG-2 alone suffices, since all seed publications carry `provenance.liveness = 'SIMULATED'` and are therefore **never supplier-visible**, so no real supplier can see a `firm` badge however it was projected. The replacement projection (firm=locked · semi-firm=approved-but-unlocked · visibility-only=draft/submitted) is carried in C8 §2.2 as a **NAMED OPEN DECISION, explicitly UNRATIFIED**, pending named owners in Paragon procurement and finance — neither platform has standing to assert a commercial commitment. |
| **C8-RM-SLS-2050** *(refs @ `063adca`)* | **The shared first-wire acceptance test RM-SLS-2050 does not exist, on either side, and nothing was ever run against it.** Portal-side verification was exhaustive: zero occurrences in the working tree, in `docs/`, in `src/`, and **in git history** (`git log --all -S` returns no commit that ever added or removed it). Near-hits are unrelated (`MAT-20500`, `channel/outboundFixtures.ts:29`; a commodity price `2050.2`, `commodityHistory.ts:102`). SOMO confirmed the same. ⚠️ **CORRECTED (2nd amendment):** an earlier revision of this row explained the token's plausibility by citing "this repo's material-code convention (`RM-COCO-8200`, `RM-STEAR-7300`)" — **both of those codes are NON-MASTER** (`src/data/mock*.ts` only), so that sentence was itself an instance of `MASTER-STRADDLE-01` and is withdrawn. Against the **authoritative** master (`sdc/fixtures.ts:58-100`) the convention is `XX-XXXX-NNNN` with numeric serials (`RM-EMUL-3310`, `AI-NIAC-6601`, `PK-PETB-8810`) — which `RM-SLS-2050` does resemble, so the plausibility point survives; only the evidence for it was drawn from the wrong dataset. | **CLOSED by ruling — DO NOT SEED IT.** Creating the material to make the test runnable would manufacture the very agreement the test was meant to verify: a fixture invented to satisfy a citation, on both sides, joining on a code that exists only because both sides created it. **Replacement method (ratified):** intersection of the two material masters, computed on **BOTH codes and names** (code-only would report empty for the wrong reason, since C8-MATERIAL-REF says the codes are not expected to agree; name-only would miss a genuine code match), with **an empty intersection REPORTED AS A RESULT, not resolved** — no fuzzy join, no reaching for the nearest plausible match. **THE INTERSECTION HAS LANDED (C8 §3.2): EMPTY BY CODE, NON-EMPTY BY SUBSTANCE.** Empty-by-code is **structural** — ours are `XX-XXXX-NNNN` with numeric serials, theirs mnemonic (`RM-AQUA`, `PM-CAP-FLIP`); packaging is `PK-` for us and `PM-` for them; we have an `AI-` actives class and they have none. Three credible substance pairs with confidence stated (`RM-EMUL-3320`↔`RM-CETALC` HIGH · `AI-NIAC-6601`↔`RM-NIAC` HIGH · `RM-EMUL-3310`↔`RM-GLYC` MEDIUM-HIGH, **grade does not carry**). **Refusals recorded as the quality signal:** stearates/metallic salts are not stearic acid, finished surfactants are not the distillate feedstock — structurally, SOMO's master is a **cosmetic formulation BOM** and those are **oleochemical feedstocks upstream of its grain**. `ROH`/`VERP` is the **only** pre-existing vocabulary agreement between the masters — the one thing neither side negotiated. `EA` vs `PCS` booked as a normalization item, **dormant** while all strong pairs are KG. **No crosswalk is built** — see `C8-ADOPTION`. |
| **C8-MATERIAL-REF** *(refs @ `063adca`)* | **`material_master_ref` is the live external clock in BOTH directions.** SOMO's material identity is **illustrative** — their BOM codes are not canonical S/4, and their crosswalk to canonical codes is named, registered and **NOT BUILT**. Ours is a 5-entry SIMULATED master (`sdc/fixtures.ts:58-100`), with C7 not even on codes yet (display strings). **Neither side is waiting on the other; both are waiting on the same freeze.** Consequence: `materialCode` is **not yet a join key between the platforms** and no C8 work should assume it is. | **OPEN — this is CP-2, the next thing after this batch.** Recorded in C8 §4. This is also the one place a crosswalk **is** warranted — between spaces owned by different parties — in deliberate contrast to `C7-MATERIAL-JOIN` below. |
| **C7-MATERIAL-JOIN** *(refs @ `063adca`)* | **C7 and C8 do not join on material.** C7 carries material as a **display string** (`types.ts:638`; `'Glycerin USP (Halal)'`, `fixtures/prIntake.ts:20`); C8 carries a **code** (`sdc/types.ts:128`; `RM-EMUL-3310` labelled `'Glycerin USP 99.5%'`, `sdc/fixtures.ts:59-64`). Same substance, different key, different label, no crosswalk. There are in fact **four disconnected material-identity populations** in the tree: C7 display strings; the SDC master (5 codes); GR/inventory codes with no master (`mockGoodsReceipts.ts`, `mockInventory.ts`); and `MAT-20500` on a third convention (`channel/outboundFixtures.ts:29`). | **OPEN — RECOMMENDATION RECORDED, NOT BUILT (C7 §6.1).** Adopting SOMO's own internal ruling on this class: **a crosswalk between two spaces you control carries no information — the fix is to DELETE one space, not to bridge them.** A crosswalk earns its place only between spaces owned by **different parties**, which is what `C8-MATERIAL-REF` is and this is not. So C7's display-string space should be **collapsed into** the coded space. **DELIBERATELY NOT DONE HERE, for a specific reason:** `inferBpom` (`components/v2-features/GRInspectionWizard.tsx:129-163`) **parses the material-code prefix** (`AI-`/`FR-`) to derive **BPOM applicability** — so a code-format change **silently changes regulatory-compliance behaviour**, with no test asserting that linkage as intentional. Earns its own investigation-first batch, ahead of any collapse. |
| **C8-MASTER-DECL** *(operator ruling · refs @ `063adca`)* | **`src/services/sdc/fixtures.ts` (`MATERIAL_MASTER`, `:58-100`) IS the portal's authoritative material master.** `src/data/mock*.ts` is a **parallel NON-MASTER dataset**. Declared explicitly rather than left to inference because **SOMO cannot ratify a freeze against an undeclared master** — the declaration is load-bearing on C8, and its absence is the gap in which `MASTER-STRADDLE-01` formed. **Rationale:** a second parallel master owned by one party is **deleted, not mapped** — *a crosswalk between two spaces WE control carries no information.* Same argument SOMO used to close its own internal identity leg, applied to ours. Reconciling `mock*.ts` against `sdc/fixtures.ts` would encode nothing except the fact that we once had two datasets. | **RATIFIED — binding (C8 §4.0).** Consequences: the §3.1 intersection runs against `sdc/fixtures.ts` **only**; `ForecastLine.materialCode` keys to that master and no other; integrity invariant #2 is the master's enforcement and is already on the floor; **a code appearing only in `mock*.ts` is not portal material identity** — not evidence of our naming convention, not an intersection candidate, not quotable in a code-truth record. |
| **MASTER-STRADDLE-01** *(refs @ `063adca`)* | **A code list assembled from our own code-truth record drew from BOTH datasets without noticing.** Of the codes quoted as "this repo's material-code convention", **only `RM-EMUL-3310` was authoritative**; `RM-COCO-8200` and `RM-STEAR-7300` came from `src/data/mock*.ts`, the non-master. **Why it matters more than its size: an unnoticed straddle becomes the next phantom.** A mixed list quoted once in a code-truth record is quoted again as evidence, and the non-master codes acquire the authority of the record carrying them — precisely how an `RM-SLS-2050` comes to exist on both sides without either side deliberately creating it. Same mechanism: a citation nothing owns, treated as fact because it was written down. **SOMO caught this; we did not** — the peer platform reviewing our record found a defect in our own identity space that our own audit walked past. **Measured consequence:** the mixed list propagated out of our record and **into SOMO's intersection run**, where they spent real analysis refusing two codes that were never portal identity (C8 §3.2). | **RECORD CORRECTED AT SOURCE — do not build.** The straddled quote is withdrawn in the `C8-RM-SLS-2050` row above so the mixed list is not re-quoted from the register, and the substitute evidence is drawn from the authoritative master. The refusals SOMO computed stand as **substance-level findings** and are worth keeping; they are **not** portal-master results and must not be re-quoted as such. Declaration that prevents recurrence: `C8-MASTER-DECL`. **⚠️ AMENDED IN PLACE AT 2B-2 — NARROWED, NOT CLOSED: 30 codes wide → 5.** The adoption made 25 of the 30 master-absent document-lane codes resolvable, so the two spaces now overlap almost completely. Its executable pin used `PK-PETB-8801` as the witness that the two are different spaces — **2B-2 adopted the witness** — and the assertion was rewritten rather than bumped, against the code a receipt actually arrives carrying at runtime (`MAT-*`, seeded into `asnStore` from `MOCK_ASNS`). **The assertion survives its own witness being fixed.** **⚠️ AMENDED AGAIN AT 2B-3 — NARROWED TO ZERO against the declared lane (5 → 0): the RFQ-mute five were AUTHORED, so every code the document lane names is now master-resolvable. STILL NOT CLOSED — the third space is untouched, and it was always the operative half (`asnStore` feeds the GR wizard; an RFQ material is not a received line). The assertion has now survived TWO rounds of its own witness being adopted.** |
| **MOCK-RETIREMENT-01** *(refs @ `063adca`)* | Retire `src/data/mock*.ts` as a material-identity space, per `C8-MASTER-DECL` (booked for **retirement, not reconciliation**). | **BOOKED — NOT this PR and NOT the next one.** **Reason it cannot ride an ordinary batch:** `inferBpom` (`components/v2-features/GRInspectionWizard.tsx:129-163`) **parses the material code prefix** (`AI-`/`FR-`) to derive **BPOM applicability** — so retiring or renaming a material code space can **silently change regulatory-compliance behaviour**, with no test asserting that linkage as intentional. **Investigation-first batch, its own dispatch, blast-radius census before any deletion.** Reinforced by SOMO's reciprocal disclosure (`C8-RECIPROCAL-HAZARD`): prefix-parsing is load-bearing on **both** platforms, so a code-space change is a compliance-and-explosion change until proven otherwise. |
| **C8-ADOPTION** *(refs @ `063adca`)* | **Both masters are self-declared SIMULATED** — ours carries an honesty marker at the top of the file (*"⚠️ HONESTY MARKER — THIS IS SIMULATED DATA, NOT PARAGON DATA … It is NOT Paragon's real material master"*, `sdc/fixtures.ts:4-11`); SOMO's declares itself seed-illustrative and **never SKU-validated**. Therefore **any match between them is an ADOPTION, NOT A DISCOVERY**: every crosswalk row would be a **fact invented at agreement time**, not a correspondence found against a real master. Two invented spaces cannot yield a discovered mapping — only an agreement to treat one invented thing as another, which is a decision dressed as a finding. **The three pairs are REAL AS SUBSTANCES and NOT REAL AS IDENTITIES.** The chemistry is not in doubt; `RM-EMUL-3320` and `RM-CETALC` are both invented labels, so binding them creates an identity fact neither master had. Contrast `ROH`/`VERP`: neither side chose it, both inherited it from S/4 — a **discovery**, true before anyone looked. | **RATIFIED — NO CROSSWALK BUILT (C8 §4.3).** General rule, now **shared canon rather than one platform's precedent**: **a crosswalk earns its place only between spaces owned by DIFFERENT parties.** `material_master_ref` is that; our two demo masters are not. Applied three times this cycle in all three directions — SOMO to its own internal identity leg, us to `mock*.ts` vs `sdc/fixtures.ts` and to C7 vs C8, both platforms to the portal-vs-SOMO masters. A rule that survives being turned on its author is canon rather than convenience. |
| **C8-WIRE-OPTION / C8-OPTION-1-DECLINED** *(operator ruling · refs @ `063adca`)* | **OPTION 3, THEN OPTION 2.** The first wire proves **TRANSPORT AND SHAPE ONLY** — no material semantics, no identity claim. The identity join becomes real when **`material_master_ref` freezes**, not before. This sequences correctly against everything else: the intersection is empty by code, any substance pairing would be an adoption not a discovery, and spec-vs-substance is open — a first wire carrying material identity would have to assume answers to all three; one carrying only transport and shape assumes none and still proves what a first wire exists to prove. | **RATIFIED (C8 §4.5).** **Option 1 — the adopted translation on `RM-EMUL-3320 ↔ RM-CETALC`, offered by SOMO on acceptable terms — is EXPLICITLY NOT TAKEN.** Reasons recorded: (a) we do not need a material in the payload sooner, since option 3 proves transport and shape without one; (b) **a fiction with an expiry condition is a fiction someone must remember to retire** — it would be correct-by-agreement until the freeze, then require someone to recall it was provisional and unwind it, and every item in this codebase expected to be remembered was not (the subject of `SEAM-DOC-DRIFT-01`). **Recorded because a declined option that leaves no trace gets re-proposed** — the terms were acceptable and the reasoning sound; the answer is still no, and the next reader should see it was considered rather than overlooked. |
| **C8-IDENTITY-GRAIN** *(refs @ `063adca`)* | **Does material identity mean the SUBSTANCE or the SPECIFICATION?** A **USP-99.5%** requirement is a **different purchasable item** from unspecified glycerin; a **24mm** cap and an unsized cap are **not interchangeable in procurement**. Both readings are defensible and they produce **different masters**, so this cannot be settled by whoever writes the schema first. Already visible in the intersection: `RM-EMUL-3310` Glycerin USP 99.5% ↔ `RM-GLYC` is MEDIUM-HIGH rather than HIGH precisely because **the grade does not carry** — that downgrade is this question in miniature, not a rounding of confidence. | **NAMED OPEN DECISION — explicitly NOT DEFAULTED (C8 §4.4).** **Blocks nothing under option 3** (the first wire carries no material semantics, so the question cannot bite); **becomes LOAD-BEARING at option 2, because `material_master_ref`'s schema depends on the answer** — a substance-level master and a spec-level master are not the same freeze. **Escalated to Paragon procurement alongside `commitmentClass`** (C8 §2.2) — same class of question, likely the same owners: a platform can express the field but has no standing to decide what it means commercially. No reading is assumed pending the answer; the first mapping this platform chose unilaterally is now void, and the lesson generalises. |
| **C8-RECIPROCAL-HAZARD** *(refs @ `063adca`)* | **We disclosed `inferBpom`'s prefix-parsed BPOM applicability** (`GRInspectionWizard.tsx:129-163`) — a regulatory determination computed from a string prefix. **SOMO responded with a reciprocal hazard of their own:** their codes carry **class semantics in the prefix** (`RM-` raw, `PM-` packaging), **their explosion engine reads that distinction**, and **nobody had asked what else parses a prefix.** They are booking the check **because we volunteered ours.** Neither hazard was discoverable by the other party — each sits inside code the other will never read — and both surfaced only because one side volunteered a weakness with nothing obliging it to. | **RECORDED AS STANDING PRACTICE (C8 §4.6).** The generalisable line: **a hazard named on one platform is worth more to the other than any agreement in the document.** Practice that follows: **disclose the thing that would embarrass you, first.** Concrete consequence: `MOCK-RETIREMENT-01` stays investigation-first with a blast-radius census, because on **both** platforms a code-space change is a compliance-and-explosion change until proven otherwise. This was the highest-value exchange of the cycle and it came from no clause. |
| **STALE-BY-HALVES-01** *(class; found by the CP-3 H3 census, `92123b7`; **filed as its own class by operator ruling — it was a paragraph inside `HALAL-VERIFY-*` and read as colour on H3 rather than as a thing that happened to a file nobody was watching**)* | **THE GENERAL FORM, VERBATIM: A STORED CLOCK VALUE GOES STALE UNEVENLY, AND A PARTIAL REFRESH IS INDISTINGUISHABLE FROM A CORRECT FILE BY INSPECTION.** ⚠️ **And the clause that carries the argument: UNIFORM STALENESS ANNOUNCES ITSELF.** That is the whole of why this is worse than ordinary decay, and why it must not be filed alongside it: a uniformly stale file is *wrong everywhere*, so the first row you check tells you the file is wrong. A half-refreshed file is **HALF RIGHT**, and every row in it looks plausible on its own — the correctness of the refreshed half is what conceals the staleness of the other. There is no row you can spot-check that reveals it. **THE INSTANCE — `src/services/data/mock/fixtures/buyerCompliance.ts`.** All **ten** dated rows carry a wrong `daysRemaining` and **four** stored `status` values now contradict their own expiry (c-002 `Expiring`/−49 · c-003 `Expiring`/−34 · c-005 `Valid`/34 · c-010 `Valid`/24, at 2026-08-07). ⚠️ **The detection method is the finding: back-solving `expiryDate − daysRemaining` per row recovers the day each row was typed, and it yields TWO AUTHORING DATES A YEAR APART, FIVE ROWS EACH** — **2025-04-11/13** (c-004, c-006, c-007, c-008, c-009) and **2026-04-10/11** (c-001, c-002, c-003, c-005, c-010). Somebody refreshed half this file a year later and left the other half. No two halves agree on what day it is, and nothing in the file, the types, or the suite records that a refresh happened at all. It was invisible until somebody divided. **EXPOSURE, and it differs from its twin:** `buyerCompliance.ts` is **OFF the read path** — I3.2 closed `COMPLIANCE-CARVEOUT-01`, and `COMPLIANCE_ITEMS` is now imported by exactly one file (`halalXpersona.invariant.test.ts`) — whereas `supplierDocuments.ts` **doc-001 is ON the live read path** (`MockProcurementService.ts:14` → My Documents) rendering `Expiring Soon` on a certificate that expired **84 days** ago. **Different exposure, same defect**; doc-001 is the *uniform* case that announces itself, this row is the one that does not. **RELATION TO LAW 0.5:** this is the empirical argument for it that is not a paragraph. `COMPLIANCE_REGISTRY` cannot exhibit this class at all — it stores no clock-derived value, so there is no half to refresh. | **OPEN — filed, deliberately NOT fixed.** Both fixtures are pre-DTO-v2 shapes whose retirement is a read-path batch, not a number edit: re-typing `daysRemaining` today buys a file correct for one day that then resumes decaying — the defect, performed once more. ⚠️ **What this class asks for is not a fix but a DETECTION:** the back-solve is mechanical (`expiryDate − daysRemaining` → authoring date; >1 distinct value = partial refresh) and would run as a census test over any fixture storing a clock-derived value. **NOT built here** — the honest first move is to stop storing them, which is what DTO-v2 already does, and a detector for a shape you are retiring is a mechanism standing in for a decision. Revisit if the read-path batch slips. |
| **FIXTURE-EXEMPLAR-HOLE-01** *(child of **`FIXTURE-PRESENT-01`** — see the lineage note; found looking FORWARD, not at today, at CP-3 H3. **Filed at `92123b7` under the id `HALAL-VERIFY-EXPIRING-EXEMPLARS-EXPIRE-01`, which is what commit `92123b7` and PR #189 still say; RENAMED HERE when the lineage was corrected** — the old id named it after the batch that found it rather than after the class it belongs to, which is the same mistake as filing it under the wrong parent)* | ⚠️ **THE LINEAGE IS THE POINT AND IT IS RECORDED FIRST. The parent is `FIXTURE-PRESENT-01`, NOT CP-3a's clock-decay shape.** `FIXTURE-PRESENT-01`'s consequence (2) — *"demo rows cross thresholds unremarked"* — **already names these four rows by id** (`creg-0008` 2026-08-20, `creg-0015` 2026-08-31, `creg-0003` 2026-09-15, `creg-0012` 2026-09-30). This row is that consequence carried one step further and given dates. **WRONG LINEAGE IS WORSE THAN A MISSING ROW: a reader chasing `FIXTURE-PRESENT-01` looks for exactly this case and does not find it, SO THE CLASS LOOKS SMALLER THAN IT IS — that is how a class stops being a class.** *(Cross-reference: CP-3a's clock-decay shape applies too — a green thing goes wrong on a calendar boundary with no commit involved — but it is the cousin, not the parent. The parent is the one that owns the fixture's unowned present.)* **THE FINDING.** `COMPLIANCE_REGISTRY`'s header promises *"≥2 exemplars of every computed display status, so KPIs/filters read plural"*. The registry itself is law-0.5-clean and cannot store a stale status — **and the promise still dies, because the ILLUSTRATION has a clock even where the DATA does not.** All four `Expiring` exemplars are inside their 90-day windows only until: creg-0008 **2026-08-20** · creg-0015 **2026-08-31** · creg-0003 **2026-09-15** · creg-0012 **2026-09-30**. The next row to *enter* an Expiring window is creg-0002 on **2027-03-03**. Therefore: **the "≥2" promise STOPS BEING TRUE ON 2026-09-16**, and from **2026-09-30 to 2027-03-03 the fixture holds ZERO `Expiring` rows — A FIVE-MONTH HOLE**, during which every KPI, filter and chip that reads plural reads empty. Same axis, sooner: `supplierDocuments.ts` **doc-005 crosses into Expiring on 2026-08-11** with `status: 'Valid'` stored. ⚠️ **NOTHING CATCHES ANY OF IT.** No spec asserts the header's promise, so the daily scheduled `npm run gates` — the half built precisely to catch clock decay with no commit involved — stays green straight through it. | **OPEN — filed with its dates so it is actionable rather than ominous.** Two options, neither taken here: **(a) a census test that pins the header's promise** (≥2 exemplars of each display status at a declared instant) — it goes **RED on 2026-09-16**, which is the point, and converts a silent hole into a scheduled failure; **(b) re-seed the four expiry dates.** ⚠️ (b) alone is `FIXTURE-PRESENT-01` option (c) — a manual re-anchor — and buys the same hole further out with nobody owning the cadence; (a) makes the hole audible without deciding who owns the present. **Choosing is a Track-R / `FIXTURE-PRESENT-01` call, not a batch call**, and it is the same question as *"can this contract be generated"*. Blocking nothing today. |

---

## CP-2 · Batch 1 — master-miss refusal + parser precedence (refs @ `f82c63a`)

Filed during the batch that made the master-miss condition ONE thing with three
legal outcomes. Rows above this line predate it. **Refs in this block are
against `main @ f82c63a`.**

| Finding | What it is | Disposition |
| --- | --- | --- |
| **INFERBPOM-REGULATORY-01** *(refs @ `f82c63a`)* | **A REGULATORY determination made from a string prefix, and it FAILS OPEN.** `inferBpom` (`GRInspectionWizard.tsx:129-165`) decides whether a received lot needs a **BPOM lot check** by parsing the material code's prefix. Two independent defects ride it. **(1) The rule CONTENT is a compliance decision, not ours** — which material groups require a BPOM lot check is `D-COMP-BPOM`, escalated and unanswered. **(2) The MECHANISM is the retired class.** Seat 3 ruled prefix-derived semantics retired as a class: `materialCode` is OPAQUE, no prefix stability is promised, semantics move to fields, membership replaces shape. `inferBpom` is that exact anti-pattern still load-bearing on a REGULATORY surface — and it **fails OPEN**: an unrecognised prefix yields "no check required", so a code-space change silently switches a compliance check **OFF** rather than erroring. `MOCK-RETIREMENT-01` and `MASTER-STRADDLE-01` both make a code-space change a live prospect. Its sibling `inferHalal` parses the DESCRIPTION rather than the code — different mechanism, same fail-open shape, same unratified-content problem. | **HELD OPEN DELIBERATELY — explicitly OUT OF SCOPE for CP-2 · B1 (operator ruling).** Converting the mechanism before compliance states which material groups require BPOM lot checks would **replace an unratified PREFIX convention with an unratified FIELD convention** — the same unratified rule in better clothes, and harder to dislodge once it looks principled. **Blocked on `D-COMP-BPOM`.** When that answers: the rule becomes a master FIELD (the `MaterialMasterEntry` extension point), and the fail-open default becomes a **refusal** — an unresolvable code must not silently mean "no regulatory check". Filed prominently because it is the single most consequential surviving prefix parser and **nothing in the code says so.** **⚠️ AMENDED IN PLACE at 2B-0 — THIS DISPOSITION UNDERSTATED ITS OWN FINDING. It says a code-space CHANGE would silently switch the check OFF. No change is required: the check is ALREADY off for an entire live vocabulary. See [[BPOM-OFF-BY-SPACE-01]] below — all nine codes in the undeclared `MAT-*` space receive `bpomRequired: false` today, and `GRInspectionWizard` renders it. The mechanism half is now ruled (`D-COMP-BPOM` = master field, fails closed, PROVISIONAL — see the 2B-0 ruling block); the ruling does NOT close this row, because the seed CONTENT is still compliance's and because wiring fail-closed before 2B-2/2B-3 would refuse essentially every GR line (the `2B-4` gate).** |
| **MASTER-STRADDLE-CONSEQUENCE-01** *(refs @ `f82c63a`)* | **The straddle is now load-bearing on a GATE, not just on reads.** `MATERIAL_MASTER` (`src/services/sdc/fixtures.ts:58-100`) names **five** codes; the mock\*.ts document lane names **~30**, and the GR fixtures (`src/data/mockGoodsReceipts.ts`) name **eleven**, of which the master names **two** (`RM-EMUL-3310` @ `:417`, `RM-EMUL-3320` @ `:285`). The dispatch for this batch asked to close the `goodsReceipt.create` hole by gating `inspectionResults` on **master membership** — which would have refused **9 of 11 seeded GRs** and every wizard run whose ASN names a non-SDC code (`GRInspectionWizard.tsx:133-165`). **Built instead as `GR_INSPECTION_MATERIALS_DECLARED`: membership in the PARENT document's own `lineItems`** — Seat 3's ratified collision principle (identity settled by DECLARED OWNERSHIP, never by content plausibility) applied at the seam. It is **strictly stronger here** than a master check (it also refuses a master-valid code the ASN never declared) and it survives the straddle. **Pinned as an executable fact** in `masterMissRefusal.test.ts` so the divergence cannot drift silently. | **The gate is DONE and correct as built.** What remains open is the straddle itself: **the two write-path gates now key on two different identity spaces** — honest today, untenable once the spaces merge. **Rides `MOCK-RETIREMENT-01` (next batch) and the CP-2 schema freeze.** Revisit trigger: when the document lane's codes join the master, `GR_INSPECTION_MATERIALS_DECLARED` should **GAIN** a master check rather than be replaced by one — parent-declaration and master-membership are different invariants and both are worth holding. |
| **SDC-MEMBERSHIP-≠-MASTER-01** *(refs @ `f82c63a` — **ELEVATED TO CLASS `SCOPE-IS-NOT-EXISTENCE-01`**, below)* | **Creation scope proves COLLABORATION, not EXISTENCE — and nothing at runtime forces the two to agree.** `collaboratedMaterial` (`MockCommandService.ts:791-797`) tests relationships ∪ publications; **the material master is never consulted.** Seat 3's correction is confirmed and now **verified rather than assumed** (`masterMissRefusal.test.ts`): a bogus code IS `SCOPE_DENIED` on every SDC verb — `creationOwner` returns null and `dispatcher.ts:216-229` denies it, with the buyer record path covered by `requireCreationOwner: true` (`MockCommandService.ts:822`). **But the residual gap is real:** the moment a relationship row or a SOMO-fed publication line names a code the master lacks, creation scope **passes** and `create` reaches the unit lookup — where `?? 'KG'` used to fabricate a unit. Only the SDC-0 integrity suite (`sdc.integrity.test.ts:81`) held those sets in agreement, **and a suite is not a boundary.** | **CLOSED at the boundary by `SDC_MATERIAL_KNOWN`** (on all five SDC creation transitions), with `requireUom` behind it so no `??` chain can quietly reinstate a default. **Deliberately unreachable through the dispatcher today** — scope refuses first — and that is correct layering, not dead code: it is precisely the assumption **F2's live SOMO feed removes.** Tested at the hook level for that reason. **No further action; recorded so the layering is not mistaken for redundancy and deleted.** |
| **POLICY-REASON-I18N-01** *(refs @ `f82c63a`)* | **Policy refusal reasons are English server strings interpolated into localised wrappers.** Every bound policy hook returns a raw English `reason` (`ISH_P2D_NO_ASN`, `INV_DECLARE_BATCH_TOTAL`, and now `SDC_MATERIAL_KNOWN` / `GR_INSPECTION_MATERIALS_DECLARED`); surfaces render it inside a translated frame — `gr.create.failed.desc` (`i18n.ts:398/767`), the triage `reasonText` fallback. This batch's two refusals got **dedicated EN + ID sentences** via the `startsWith` precedent already present at `GRInspectionWizard.tsx:964` (`gr.create.failed.undeclared`, `commHub.refusal.UNKNOWN_MATERIAL`), so an Indonesian operator reads a real sentence rather than a fragment of English. **The other ~12 policy refusals still do not.** | **Not fixed here — a systematic concern, and fixing two of fourteen ad hoc is how a convention rots.** The right shape is a **refusal-name → i18n-key registry keyed off `POLICY_HOOKS`**, so a hook that cannot be spoken in the operator's language fails the build — the exhaustive-`Record` pattern `BuyerChannelTriage.tsx:67-75` already uses for parse reasons. **Books to the i18n lane.** Low severity: refusals are named and honest today, just not always fluent. |
| **GR-FIXTURE-INCOHERENCE-01** *(refs @ `f82c63a` — FOUND BY the new gate, already fixed)* | **Two GR test fixtures declared `lineItems: []` while filing an inspection line.** `goodsReceiptCommand.test.ts` and `grInvoiceMatchCascade.test.ts` seeded ASNs that said nothing arrived, then created receipts inspecting a material — **nine tests that had passed for as long as they existed.** `GR_INSPECTION_MATERIALS_DECLARED` refused them on its first run, correctly. **The fixtures were made coherent** (each ASN now declares the line its receipt inspects); **the gate was not weakened.** Recorded because the tempting fix — skipping the gate when the parent declares no lines — would have left exactly the hole the gate exists to close: reference a line-less parent, file anything. | **CLOSED in this batch.** Kept on the register as evidence for a general point: **a gate that finds incoherent fixtures on its first run is doing its job**, and the fixture is the thing that changes. Worth re-reading if a future gate produces a similar wave of failures. |
| **SEAT3-FIND / SEAM-DOC-DRIFT-01 (REVERSE)** *(refs @ `f82c63a` — CORRECTED in this batch; **ELEVATED TO CLASS `COMMENT-AS-CONTRACT-01`**, below)* | **Code-truth OVERSTATING the contract, on the exact field CP-2 freezes.** `sdc/types.ts:84`'s doc-comment described `materialCode` as *"the S/4 material code — the shared join key (C7 GG-4)"*, while ratified **C8 §4.1 says `materialCode` is NOT YET a join key between the platforms.** `SEAM-DOC-DRIFT-01` running in reverse: the usual failure is docs outrunning code, and this was code claiming a seam fact the contract explicitly withholds. Had it survived the harvest script, **the harvest would have propagated the overstatement into the contract** — a claim laundered into ratified status by tooling. | **CLOSED — corrected before the harvest runs.** The comment now states what is true today (the master's own primary key, and the identity CP-2 keys on; **OPAQUE**, no prefix stability promised) and names becoming a cross-platform join key as a **C8 deliverable, not a fact**. **Generalisable:** the harvest script reads code comments as contract input, so a comment on a seam field is a contract edit with no review gate. Worth a harvest-time check that flags seam-field comments asserting cross-platform status. |

### Elevated to CLASSES (operator ruling, CP-2 · B1 merge)

Two findings from the batch above **outlive the batch** and were elevated by the
operator from instance rows to standing classes. An instance row records what
happened once; a class row states the rule that will be violated again. Both
carry a **named precondition or a standing warning**, not just a disposition.

| Class | The rule | Standing consequence |
| --- | --- | --- |
| **COMMENT-AS-CONTRACT-01** *(class; instance = `SEAT3-FIND` above)* | **The harvest script reads code comments as contract input, so A COMMENT ON A SEAM FIELD IS A CONTRACT EDIT WITH NO REVIEW GATE.** `sdc/types.ts:84` was **not a stale comment** — it was an **unreviewed contract amendment living in a type file**, and it ran in the **OVERSTATING** direction (code claiming a seam fact the contract explicitly withholds) on **the exact field CP-2 freezes**. The usual drift class is docs outrunning code and is caught by reading the code; this one is invisible from the code, because the code *is* the thing being believed. Any developer with commit access can amend a ratified contract by editing a doc-comment, with no seam review, no counterparty sight, and no diff that looks like a contract change. The blast radius is every field the harvest reads — not just this one. | **NAMED PRECONDITION ON CP-2b: the harvest script MUST NOT treat an unreviewed comment as ratified contract text.** Minimum bar before CP-2b harvests anything: seam-field comments asserting cross-platform status (join key, shared identity, agreed grain) are either **excluded from harvest** or **flagged for explicit seam review**, and the harvest output must distinguish *ratified* from *code-asserted*. Until that exists, **every harvest run is an unreviewed contract amendment path.** Re-read this row before writing or running the harvest. |
| **SCOPE-IS-NOT-EXISTENCE-01** *(class; instance = `SDC-MEMBERSHIP-≠-MASTER-01` above)* | **Scope proves COLLABORATION, not EXISTENCE.** `collaboratedMaterial` (`MockCommandService.ts:791-797`) tests relationships ∪ publications and **never consults `MATERIAL_MASTER`**. The two sets agreeing is a **fixture property, not an invariant**: only the SDC-0 integrity suite (`sdc.integrity.test.ts:81`) held them in agreement, **AND A SUITE IS NOT A BOUNDARY.** The generalisable rule: *an authorisation check answers "may this actor act on this thing", never "does this thing exist"* — and the second question is the one a unit, a price, or a regulatory flag actually depends on. Wherever a scope check is read as an existence proof, the existence gate is missing and nothing will say so. | **`SDC_MATERIAL_KNOWN` IS UNREACHABLE THROUGH THE DISPATCHER TODAY BY CORRECT LAYERING — NOT AS DEAD CODE.** Scope refuses first *while the two sets happen to agree*. It guards **the assumption F2's live SOMO feed removes**: the moment a relationship row or a fed publication line names a code the master lacks, scope **passes** and `create` reaches the unit lookup. **Anyone finding it unreachable later must find this row first — do not delete it, and do not "simplify" it into the scope check.** Its coverage is proved at the hook level (`masterMissRefusal.test.ts`) precisely because the dispatcher path cannot reach it yet. Same test applies to any future existence gate that sits behind a scope gate. |

---

## CP-2 · Batch 2 — `mock*.ts` retirement CENSUS (refs @ `cf09e70`)

**Investigation only — nothing was deleted, moved, or re-pointed.** The batch was
dispatched as a retirement sweep ("the fix is deletion"). The census says the
dispatched action is aimed at the wrong object and the work is **two batches**;
both arguments are filed below rather than compressed into a shippable PR.
Baseline verified independently green at dispatch time: **2028/2028 across 173
files**, `main @ cf09e70`.

| Finding | What it is | Disposition |
| --- | --- | --- |
| **MOCK-RETIREMENT-SCOPE-01** *(refs @ `cf09e70` — **THE HEADLINE; the dispatched verb is wrong**)* | **`src/data/mock*.ts` is not a parallel material dataset. It is the TYPE HOME and SEED for the entire legacy document lane, and deleting it deletes the application.** Ten files, 4 066 lines, **~45 importing modules**. `services/data/types.ts` — the public DTO surface — imports its `Shipment`/`ASN` (`:77`), `GoodsReceipt`/`InspectionResult` (`:86`), `Contract` (`:92`), `ContractObligation` (`:100`), `RFQ` (`:102`) and `Quotation` (`:103`) types **from these files**. Four stores seed from them (`rfqStore.ts:15`, `quotationStore.ts:12`, `purchaseOrderStore.ts:12`, `goodsReceiptStore.ts:15`); four mock services and eight pages consume them (`BuyerSourcing`, `BuyerShipments`, `BuyerContracts`, `BuyerContractDetail`, `PlanGrid`, `BuyerCollaboration`, `SidebarV2`, `Login`). **Five of the ten carry no material identity at all** — `mockSuppliers`, `mockKpis`, `mockContracts`, `mockObligations`, `mockQuotations` (zero code matches). The material identity space lives in the other five: `mockPurchaseOrders` (25), `mockShipments` (17), `mockInventory` (15), `mockGoodsReceipts` (14), `mockRfqs` (13). | **RE-AIM THE BATCH.** The retirement target is the **non-master material identity space inside five files**, not the files. Deletion is unavailable at any batch size until `httpDataService` lands (Stage F1) — these types and seeds are the in-memory backend. Everything below scopes to the identity space. **The dispatch's success criterion is unchanged and still reachable** ("one code, one meaning, one owner"); only the mechanism changes from deletion to re-coding. |
| **CODE-COLLISION-CENSUS-01** *(refs @ `cf09e70` — all four VERIFIED, plus four the dispatch did not list)* | **The four named collisions are real and confirmed by declared ownership.** **`RM-EMUL-3310`** — master `Glycerin USP 99.5%` (ROH, MG-03, KG; `sdc/fixtures.ts:59-65`) vs legacy `Glyceryl Stearate SE (Halal Emulsifier)` (`mockPurchaseOrders:60`, `mockInventory:50`, `mockGoodsReceipts:417`, `mockShipments:138`, `grInvoiceMatchCascade.test:55,65`) — **different substance**. **`RM-EMUL-3320`** — master `Cetearyl Alcohol` vs legacy `Polysorbate 80` (`mockPurchaseOrders:542`, `mockInventory:254`, `mockGoodsReceipts:285`, `mockShipments:308`) — **different substance**. **`PK-PETB-8810`** — master `PET Bottle 250ml` (VERP, MG-20, **PCS**) vs legacy `PET Bottle 100ml Clear` (`mockInventory:186`, `mockPurchaseOrders:238`) and RFQ-2026-002's title `PET Bottle 100ml Airless Pump` (`mockRfqs:84-86`) — **different purchasable item**. **`AI-NIAC-6601`** — master `Niacinamide (Vitamin B3)` vs legacy `Niacinamide USP Grade 99.5%` (`mockInventory:118`, `mockPurchaseOrders:147`) — same substance, different grade claim. **`PK-CAPF-8820` is master-only and collides with nothing.** **Four straddles the dispatch did not list, all confirmed:** (1) the master's meaning for `RM-EMUL-3320` **already exists in the legacy lane under `RM-EMUL-9420`** (`Cetearyl Alcohol — Vegetable Origin`, `mockGoodsReceipts:232,311`, `mockShipments:163,284`) — the meaning did not vanish, it moved codes; (2) **`PK-PETB-8810` and `PK-PETB-8825` are SWAPPED** — RFQ-2026-010's `PET Bottle 250ml Flip-Top` (the master's meaning) rides the non-master `PK-PETB-8825` (`mockRfqs:265-267`) while the master's own code carries 100ml; (3) `PK-PETB-8801` = `PET Bottle 200ml Frosted`, a third bottle in the same numeric block; (4) `supplierDocuments.ts:17-18` binds COA records to `PK-PETB-8801` / `PK-PETB-8810` in free-text `linkedTo` strings, so the collision has reached a **document-reference surface** that no type checks. | **Batch 2A (below).** Per the ratified rule the master's meaning keeps each code; three displaced meanings are **operationally real** (Glyceryl Stearate SE, Polysorbate 80, PET Bottle 100ml) and need new codes, which the batch can mint **inside the non-master fixture space without touching `MATERIAL_MASTER`** — no schema draft, no procurement dependency. `AI-NIAC-6601` is the exception: same substance, so it is a **label reconciliation, not a new code**. |
| **ONE-MEANING-TWO-CODES-01** *(refs @ `cf09e70` — **NEW CLASS; the inverse of the dispatched problem**)* | **The dispatch chased one code with two meanings. The census found the mirror image — one meaning with two codes — and it splits cleanly by DOCUMENT LANE.** Four confirmed pairs, each carrying a byte-identical description under two different codes, with a perfect file split: **PO + Inventory use one code family, GR + Shipments use another.** `Wardah Signature Floral Compound — Lot A` = `FR-WARD-4410` (PO/Inv) **and** `FR-WARDA-2401` (GR/Ship). `Emina Fresh Citrus Accord` = `FR-EMIN-4420` **and** `FR-EMINA-3550`. `PET Bottle 200ml Frosted` = `PK-PETB-8801` **and** `PK-PET-1100`. `PET Bottle 100ml Clear` = `PK-PETB-8810` **and** `PK-PET-1110`. The split is systematic, not incidental: the PO/Inventory fixtures and the GR/Shipment fixtures were authored as **two separate code systems for the same physical materials**. **Consequence: a goods receipt can never be reconciled to its purchase order or to inventory ON THE MATERIAL CODE** — the join silently finds nothing, and no test asserts it should. Note `PK-PETB-8810` sits in **both** ambiguity classes at once: it is the master's code for 250ml, the legacy code for 100ml, and that same 100ml meaning has a second code in `PK-PET-1110`. | **Filed as a class; scoped into Batch 2A for the four pairs, because collapsing each pair is the same edit as breaking a collision and leaving it undone would re-fragment the codes 2A just settled.** The generalisable rule: **`ONE CODE, ONE MEANING` has a second half — `ONE MEANING, ONE CODE` — and a census that only checks the first direction reports a clean tree that still cannot join.** Any future identity audit must run both directions. |
| **PRICED-SURFACE-MASKED-01** *(refs @ `cf09e70` — **CORRECTS the Seat 3 warning carried in the dispatch**)* | **The wiring Seat 3 flagged is real; the severity is not what was stated, and the difference matters for sequencing.** Confirmed: `BuyerSourcing.tsx:2508-2519` prices `selectedRfq.materialIds[0]` through `MATERIAL_TO_BASKET`, and `materialIds` comes from the non-master `mockRfqs.ts` while the basket map encodes the master's reading. **But the collision does not reach a rendered number.** `shouldCostSpread.ts:225-249` gates in order — currency → `unmapped` → `tail` → non-mass unit — and of thirteen seeded RFQs **only two materials clear all four gates**: `RM-EMUL-3310` (→ `sc-glycerin`, KG) and `RM-HUMEC-3405` (→ `sc-propylene-glycol`, KG). At the RFQ layer `RM-EMUL-3310` reads **glycerin in all three spaces** — RFQ-2026-003's title `Halal Glycerin 99.5%`, the basket `sc-glycerin`, the master `Glycerin USP 99.5%` — so the number rendered is glycerin priced against glycerin, and it is **correct today**. `RM-HUMEC-3405` is master-absent but internally coherent. The genuinely colliding `PK-PETB-8810` returns `silent: 'unit-mismatch'` (PCS quote) and `AI-NIAC-6601` returns `silent: 'tail'` — **the two gates that mask the collision are the unit gate and the tail gate, neither of which exists to catch identity errors.** The RFQ-2026-003 straddle is real and unfixed: title and category say glycerin/Emulsifiers, `materialIds` bundles `RM-EMUL-3310` + `RM-EMUL-3320`, and only `[0]` is ever priced — **`RM-EMUL-3320` is silently dropped from the comparison with nothing on screen saying so.** | **Recorded as LATENT, not live — and that is the more dangerous state, so it is filed at the same weight.** No wrong number renders today; the mispricing is held back by two gates that would stop caring the moment a bottle is quoted per-KG or the basket map gains a `RM-EMUL-3320` entry, and **neither change would look like it touched pricing.** Seat 3 was right about the wiring and right to escalate; the correction is only to the word "live". **Sequencing consequence: this does NOT make 2A urgent on pricing grounds** — it makes the `materialIds[0]` silent-drop worth its own finding, below the census, whenever multi-material RFQ comparison is next touched. |
| **TRIAGE-PLACEHOLDER-UOM-01** *(refs @ `cf09e70` — **NEW; live, user-facing, on the documented smoke path**)* | **The Comm Hub triage input teaches the operator a unit the master refuses, in both languages.** `lib/i18n/buyerCommHub.ts:57` (EN) and `:131` (ID) set the placeholder to `e.g. STOK PK-PETB-8810 2.400 KG` / `mis. STOK …`. **`PK-PETB-8810`'s canonical unit is `PCS`** (`sdc/fixtures.ts:87`), and `sup-007` (PT Berlina) holds a seeded manufacturer relationship on exactly that code (`sdc/fixtures.ts:125-129`) — **which is the documented triage smoke pair.** So a reader who types the app's own worked example gets `subjectUom → 'PCS'` against `diagnostics.uom → 'KG'` and trips the mismatch warning at `BuyerChannelTriage.tsx:492-496`. The stored quantity is **not** corrupted — `replyParser.ts:39-40,103` keeps a parsed uom strictly diagnostic and the unit stays master-assigned (invariant #2), so this is a credibility defect rather than a data defect. It is nonetheless the **first thing a new operator reads on that surface**, it demonstrates the exact error the surface exists to catch, and it survived the batch that built the warning. | **Not fixed here — investigation batch.** Cheap and self-contained: change the placeholder's unit to `PCS`, or its code to a KG material (`RM-EMUL-3310`), in EN and ID together. **Scoped into Batch 2A** since 2A already re-codes `PK-PETB-8810`'s neighbours and would otherwise have to touch this string twice. Worth a general note: **example strings are untyped assertions about the master**, and nothing in the build checks one. |
| **INFERBPOM-SWEEP-CONSEQUENCE-01** *(refs @ `cf09e70` — **REPORTED, DELIBERATELY UNTOUCHED** per dispatch constraint)* | **What a code sweep does to the BPOM check's firing pattern, stated because a regulatory check changing behaviour must never be a side effect nobody named.** `inferBpom` (`GRInspectionWizard.tsx:129-131`) fires on `materialCode.startsWith('AI-')` or `startsWith('FR-')`, reading `li.materialCode` from Shipment (`:133-148`) and ASN (`:150-165`) lines. Over the seeded shipments it currently fires on `AI-VITC-6730`, `FR-WARDA-2401`, `FR-EMINA-3550` — and **does not** fire on `RM-EMUL-3310` (Glyceryl Stearate) or `RM-EMUL-3320` (Polysorbate 80). **`MATERIAL_MASTER` contains no `FR-` code at all and exactly one `AI-` code.** Therefore **any sweep that re-points legacy codes onto master codes silently switches the BPOM check OFF** on every fragrance line — the fail-open shape already filed as `INFERBPOM-REGULATORY-01`, now with a concrete trigger. **Conversely, minting new non-master codes that keep their semantic prefix leaves the firing set byte-identical** — which is an independent argument for the 2A mechanism chosen above, arrived at from the compliance side rather than the schema side. Secondary observation, no action: the master's own `RM-EMUL-3310` is grouped `MG-03` (humectants) while its prefix says `EMUL`, so **a prefix rule is already unsound over master codes** before any sweep touches it. | **NO CHANGE MADE — `D-COMP-BPOM` is with compliance and the rule content is not ours to invent.** Filed so the constraint is discharged in writing: **the sweep as re-scoped in 2A leaves `inferBpom`'s firing set unchanged**, and that is a property 2A must be tested for rather than assumed. **Named precondition on 2A:** a test pinning the BPOM firing set before and after the re-coding, so a future sweep cannot quietly change it. Does not unblock or pre-empt `D-COMP-BPOM`. |
| **MATERIAL-TO-BASKET-DOMAIN-01** *(refs @ `cf09e70` — Seat 3's §4.3 indictment, re-scoped)* | **Seat 3 is right that the name is wrong, and the rename is the cheap half.** `MATERIAL_TO_BASKET` (`fixtures/commodityMaterialMap.ts:23-45`) is a **classification** — material → should-cost basket — not a crosswalk between two identity spaces; its own header calling it a "JOIN" between "two vocabularies authored independently" is what invited the §4.3 reading. **The expensive half is its DOMAIN: seven of its eleven keys name codes the master does not contain** (`RM-HUMEC-3405`, `AI-HYALU-6610`, `AI-CENT-6900`, `FR-WARD-4430`, `FR-WARD-4440`, `PK-CART-9901`, `PK-CART-9910` — exactly the seven the dispatch listed), and `PK-CAPF-8820` is in the master but absent here. So the map is a classification **keyed on the legacy lane, not on the master** — which is why it reads as a crosswalk: its left column genuinely is a second identity space. | **Rename + re-document in Batch 2A (free, as the dispatch allows).** **BOOK the domain question to 2B** — it cannot be settled first: seven of the eleven keys are precisely the codes awaiting an adoption decision, so re-keying the map onto master codes is downstream of that decision, not independent of it. Recording the ordering because the tempting move is to "fix the map" in 2A and discover in 2B that the fix chose the adoption outcome by implication. |
| **ADOPTION-QUEUE-01** *(refs @ `cf09e70` — **the 2B scope, and why it cannot ride 2A**)* | **The legacy lane names 34 distinct material codes. The master names five. Thirty are master-absent** (full list in the PR body): 8 actives, 8 fragrance, 7 packaging, 7 raw-material. This is not a collision problem — it is a **coverage** problem, and it is the reason the batch splits. Resolving it means, per code, either adopting into `MATERIAL_MASTER` under a declared code or marking it an explicitly non-master fixture code — **~30 judgements of what is operationally real, which is procurement's call and not ours**, and the adopting half is a `MATERIAL_MASTER` expansion, i.e. exactly the schema work this batch excludes. **What makes the wait safe is already built:** CP-2 · B1's `SDC_MATERIAL_KNOWN` refuses an unresolvable code by name on all five SDC creation transitions, `requireUom` cannot fabricate a unit behind it, and `labelOf` echoes the raw code honestly on display. **A master-absent code is therefore refused or honestly echoed today — never silently wrong.** | **BATCH 2B — blocked on operator + procurement, and correctly so.** Not urgent: B1 bounded the risk at the boundary, and the delivery lane (`services/delivery/demoFixtures.ts:67-68`, `demoFixturesScale.ts`) already derives its units from the master via `requireUom`, so the master-governed lanes are clean. **2A does not depend on this and must not wait for it** — breaking the collisions needs no master edit. Re-read `SCOPE-IS-NOT-EXISTENCE-01` before 2B: adoption changes which codes exist, which is the exact axis that class warns about. **⚠️ AMENDED IN PLACE AT 2B-2 — DISCHARGED FOR 25 OF 30.** What remains is the five RFQ-mute codes (`AI-CENT-6900`, `PK-ALCP-2441`, `PK-PETB-8803`, `PK-PETB-8825`, `RM-HUMEC-3405`) — and **its character changed with its size: the queue was a COVERAGE problem, and what is left is an AUTHORING problem.** The 25 could be ratified because the lane stated a meaning; the 5 cannot, because `materialIds: string[]` states none. That is 2B-3. **⚠️ AMENDED IN PLACE AT 2B-3 — DISCHARGED IN FULL.** All five were authored from their RFQ header (T2 evidence, recorded per row and derived rather than stamped). The queue was a COVERAGE problem, then an AUTHORING problem, and is now neither. |

### The batch split — why this is two batches

**BATCH 2A — break the collisions (mechanical; no `MATERIAL_MASTER` edit; shippable now).**
Scope: the four shared codes and the four one-meaning-two-codes pairs. Each
displaced legacy meaning moves onto a **new non-master fixture code**; the
master's meaning keeps the code it owns. Touches five fixture files, the
`supplierDocuments` `linkedTo` strings, the `MATERIAL_TO_BASKET` rename, the
`TRIAGE-PLACEHOLDER-UOM-01` string pair, and the ~six test files that assert on
the colliding codes. Adds the BPOM firing-set pin required above. **No schema
draft, no procurement dependency, no master expansion** — and it delivers the
dispatch's stated success criterion in full: one code, one meaning, across the
tree.

**BATCH 2B — master coverage / adoption (blocked on operator + procurement).**
Scope: the thirty master-absent codes. **Cannot ride 2A** for three independent
reasons: it *is* the excluded schema work; it needs ~30 operationally-real
judgements that are not the CLI's to make; and B1's refusal already bounds the
risk, so there is no correctness argument for rushing it.

**The census does not recommend deleting any file.** `MOCK-RETIREMENT-SCOPE-01`
is the reason, and it applies at every batch size.

---

## CP-2 · Batch 2a — collisions BROKEN (refs @ `1b85af3`)

The census above was accepted and the split ratified. **2a executed the
mechanical half: one code, one meaning, in BOTH directions, with no
`MATERIAL_MASTER` edit and no adoption decision.** Floor 2028 → **2037**.
The batch's deliverable is a property rather than a diff, so it is pinned
executably in `src/data/materialIdentity.test.ts` rather than described here.

| Finding | What it is | Disposition |
| --- | --- | --- |
| **MECHANISM-IS-COMPLIANCE-01** *(refs @ `1b85af3` — **operator ruling; the reason the batch looks the way it does**)* | **A regulatory check's behaviour decided the refactor's mechanism, not the other way round.** Two mechanisms could break the collisions: **re-point** the document lane's colliding codes onto master codes, or **mint new codes** and leave the master's untouched. `INFERBPOM-SWEEP-CONSEQUENCE-01` settled it and was ruled **not a preference**: `inferBpom` (`GRInspectionWizard.tsx:129-131`) derives BPOM applicability from the code's first segment and **fails open**, and **`MATERIAL_MASTER` holds no `FR-` code at all** — so re-pointing would have **silently switched the BPOM check OFF on every fragrance line**, as a side effect of a cleanup, with nothing on any surface saying so. New codes that preserve their first segment leave the firing set **byte-identical**. Every one of the nine re-codes below preserves it. | **RULED AND EXECUTED.** The general rule, worth more than this batch: **when a cleanup could change a regulatory check's behaviour, the compliance consequence chooses the mechanism — a refactor is never allowed to be the reason a check stops firing.** Pinned in `materialIdentity.test.ts` two ways: the firing set as a literal, and the before/after class-equality of every re-code as a rule that also governs the next sweep. `inferBpom` itself remains **untouched** (`D-COMP-BPOM`, with compliance). |
| **CENSUS-REGEX-SHAPE-01** *(refs @ `1b85af3` — **THE FINDING OF THE BATCH; self-implicating, and elevated to a class below**)* | **THE CENSUS'S OWN SUBJECT WAS C8 §4.1's RULING THAT `materialCode` IS OPAQUE WITH NO SHAPE STABILITY PROMISED — AND THE CENSUS VIOLATED THAT RULING IN ITS METHOD WHILE DOCUMENTING IT IN ITS OUTPUT.** That is the substance of this finding, not a remark about it. The census enumerated material codes with a regex requiring a **2–6 character middle segment**. **`AI-PEPTIDE-8801`** (`mockShipments.ts:208,497`, `mockGoodsReceipts.ts:338`) has seven, so it was **invisible** to the census: it appears in neither the "34 distinct codes" figure nor the 30-code master-absent list. **The correct counts are 35 and 31.** A census that exists to establish what codes mean **silently under-counted the population it was reporting on**, and reported a complete-looking answer. The code itself is harmless — internally coherent (one meaning, one code, GR + Shipments only) and master-absent, so it changes no 2a conclusion and belongs to 2b. **What it changes is the confidence any hand-rolled census can carry.** | **CORRECTED in this batch** (counts restated; the pin includes it). **THE PIN IS WHAT CAUGHT IT, AND THAT IS WHY THE PRACTICE IS WORTH KEEPING:** `materialIdentity.test.ts` **derives** the BPOM firing set from the fixtures instead of hand-listing it, so it **failed on its first run** against the author's own literal and named the missing code. **Invariants derived from the fixtures turned a wrong census into a failing test in one run; a hand-listed pin would have inherited the census's blind spot exactly and passed.** The two directional invariants are computed for the same reason. **Elevated to a class — see `CENSUS-MUST-DERIVE-01` below.** |
| **DOC-REF-CROSS-SUPPLIER-01** *(refs @ `1b85af3` — **found during 2a, deliberately NOT fixed**)* | **A supplier document points at another supplier's purchase order, and it is not an identity defect.** `supplierDocuments.ts:18` — `doc-007`, a **sup-007** (PT Berlina) COA for `PET Bottle Clear` — carries `linkedTo: 'PO-2025-00109 / …'`. **`PO-2025-00109` is a sup-008 (PT Indo Karton) carton PO** (`mockPurchaseOrders.ts:247-271`) containing no PET bottle at all; the bottle line lives on **`PO-2025-00108`** (sup-007). 2a corrected the **material code** in that string (`PK-PETB-8810` → `PK-PETB-8802`, in scope — it was a collision site) and **left the PO number alone**. The incoherence pre-dates this batch and is unchanged in kind by it: the old string was equally wrong, pointing at a PO that did not contain `PK-PETB-8810` either. | **NOT FIXED — outside 2a's remit, and recorded rather than quietly folded in.** 2a's warrant is "break the collisions"; a cross-supplier document reference is a **fixture coherence** defect on a free-text field, not a material-identity one, and fixing it would have been scope the operator did not authorise. **Books to whichever batch next touches supplier documents.** Worth noting the shape: `linkedTo` is an **untyped free-text join** — nothing checks that the PO exists, belongs to the same supplier, or contains the named material, so this class of error is undetectable by the build. |

### Fixture re-codes — every one, old → new → why

Nine re-codes, in three groups. **Every one preserves its first segment**, which
is what makes the BPOM firing set provably unchanged (`MECHANISM-IS-COMPLIANCE-01`).

**Group 1 — a master code was carrying a NON-master meaning. The master keeps the code; the meaning moves.**

| Old | New | Why |
| --- | --- | --- |
| `RM-EMUL-3310` | `RM-EMUL-9410` | Master owns 3310 as **Glycerin USP 99.5%**. The document lane defined it as **Glyceryl Stearate SE** — a different substance, and one that is **operationally real**, so it is re-coded rather than deleted. |
| `RM-EMUL-3320` | `RM-EMUL-9430` | Master owns 3320 as **Cetearyl Alcohol**. The document lane defined it as **Polysorbate 80** — different substance, operationally real, re-coded. |
| `PK-PETB-8810` | `PK-PETB-8802` | Master owns 8810 as **PET Bottle 250ml**. The document lane defined it as **PET Bottle 100ml Clear — Emina** — a different purchasable item. |
| `PK-PETB-8810` | `PK-PETB-8803` | The **same master code** was ALSO carrying a second non-master meaning: RFQ-2026-002's **PET Bottle 100ml Airless Pump — Wardah**. Distinct from the Emina 100ml Clear (different closure and brand), so it takes its own code. Corroborated by the sup-007 storefront line, `PR-2026-00342`, and the `PO-2025-00107` remittance note — **the code was the outlier, not the meaning**. |

**Group 2 — one meaning was riding two codes (`ONE-MEANING-TWO-CODES-01`). The GR/Shipment code retires onto the PO/Inventory one, which is the master-aligned shape.**

| Old | New | Why |
| --- | --- | --- |
| `RM-EMUL-9420` | `RM-EMUL-3320` | **BOTH HALVES OF THE PRINCIPLE IN ONE EDIT — recorded as the intent, not as a side effect.** Group 1 moved `Polysorbate 80` OFF 3320 because one code cannot hold two meanings; that freed 3320 for the meaning its master owner declares, and the document lane's own **Cetearyl Alcohol** — stranded on 9420 — converged onto it because one meaning cannot hold two codes. The same edit satisfies *one code, one meaning* and *one meaning, one code*. **It is only available in that order:** freeing the code is the precondition for converging onto it, which is why a sweep that runs the two directions as separate passes will find the second one blocked by its own first pass. |
| `PK-PET-1100` | `PK-PETB-8801` | **PET Bottle 200ml Frosted** had one code in PO + Inventory and another in GR + Shipments. |
| `PK-PET-1110` | `PK-PETB-8802` | **PET Bottle 100ml Clear** — same split; converges onto the code Group 1 minted. |
| `FR-WARDA-2401` | `FR-WARD-4410` | **Wardah Signature Floral Compound — Lot A** — same split. `FR-` on both sides, so BPOM-neutral. |
| `FR-EMINA-3550` | `FR-EMIN-4420` | **Emina Fresh Citrus Accord** — same split. `FR-` on both sides, so BPOM-neutral. |

**Group 3 — verified NOT a collision; no change made.**

`AI-NIAC-6601` was carried into the census on the dispatch's list, and the census
proposed a **label reconciliation rather than a new code**. On execution it turns
out to need **no change at all**: the master's `Niacinamide (Vitamin B3)` and the
document line's `Niacinamide USP Grade 99.5% (Vitamin B3)` are the **same
substance**, and a document line stating a grade the master leaves unspecified is
ordinary, not contradictory. **The master's under-specification is a
master-content question and is booked to 2b** — the fixture convention already
distinguishes grades by code elsewhere (`AI-NIAC-6605`, Feed Grade 98%), so
whether 6601 should say "USP 99.5%" is an adoption decision, not a cleanup.

### Left to 2b, deliberately

- **`PK-PETB-8825`** carries `PET Bottle 250ml Flip-Top` — which *looks like* the
  master's 250ml meaning on a non-master code. **Not touched.** Deciding they are
  the same item is an **adoption decision**, and the ratified rule is that
  identity is settled by declared ownership, never by content plausibility. It is
  not a collision (no code has two meanings), so 2a has no warrant.
- **The 30 master-absent codes.** Untouched, per ruling.
  **⚠️ CORRECTED IN PLACE at 2B-0 (operator ruling, D-1). This line read "The 31
  master-absent codes (corrected from 30 — see `CENSUS-REGEX-SHAPE-01`)" and it
  was STALE, not wrong-at-the-time:** 31 is the PRE-B2a figure, and B2a then
  retired five codes and minted four in the same batch that wrote this line. It
  was never restated. C9 §6.4 says 30; a fresh derived measurement at 2B-0 says
  **30**; only this line said 31 — **and it is the line a 2B dispatch reads
  first, because it is the one titled "Left to 2b".** The register rule applied:
  a stale number in the register is corrected in place and the staleness is
  recorded, because deleting the history is how the same number comes back.
  **Read the count with `MAT-SPACE-UNDECLARED-01` beside it: 30 is the DOCUMENT
  LANE's answer. The TREE's master-absent population is 39.**
- **`MATERIAL_BASKET_CLASSIFICATION`** was **renamed and re-documented, not
  re-keyed** — seven of its eleven keys are master-absent, so re-keying would
  settle 2b by implication.
- **`AI-NIAC-6601`'s master under-specification** (the master states no grade).
  Verified NOT a collision — a document line stating a grade the master leaves
  unspecified is ordinary, not contradictory. **A small instance of D-1
  (substance vs specification), and it belongs where the master gets edited.**

---

## CP-2 · `material_master_ref` SCHEMA (C9) — first issue (refs @ `23eac6f`)

The CP-2 deliverable: the crosswalk schema SOMO's own BOM→canonical-S/4 crosswalk
waits on. **Schema + contract document + types. ZERO ROWS, ZERO CONSUMERS.**
Contract at `docs/contracts/C9-material-master-ref.md`; shape at
`src/services/sdc/materialMasterRef.types.ts`; pinned by
`materialMasterRef.contract.test.ts`. Floor 2037 → **2050**.

| Finding | What it is | Disposition |
| --- | --- | --- |
| **C9-NONCONFORMANCE-LEDGER-01** *(refs @ `23eac6f` — **the contract's own eight admissions**)* | **C9 §7 enumerates EIGHT places where our shipped implementation cannot honour what the contract states**, written into the contract itself rather than discovered later. The sharpest is **§7.3: the contract declares `materialCode` OPAQUE and forbids parsing it, and we parse it** — `inferBpom` derives a REGULATORY flag from the prefix and fails open (`GRInspectionWizard.tsx:129-131`). The others: zero rows / zero consumers (7.1); `MaterialRefJoinPolicy` is a shape with **no policy engine** behind it (7.2); `substanceRef` RESERVED, not on `MaterialMasterEntry` (7.4); the master holds **5 of the 35 codes that transact** (7.5); the per-row provenance invariants are **type-level assertions never exercised by a written row** (7.6); `EA`/`PCS` unresolved and dormant (7.7); and **SOMO's side is unverifiable by us** — their codes are illustrative and their crosswalk unbuilt, so every statement C9 makes about their space is *their* declaration, carried, not confirmed (7.8). | **DECLARED, NOT FIXED — and that is the deliverable.** The section exists because the last audit found **eleven** doc-vs-code divergences all running one direction (documents understating the implementation), and **a new contract is not permitted to start with a twelfth.** None of the eight blocks ratification of the SHAPE (R-1…R-6); all of them block any claim the crosswalk is **operational**, and no such claim is made. Pinned: the contract test asserts the ledger exists and names its load-bearing entries, so the section cannot be quietly trimmed. |
| **C9-TYPE-IN-CODE-01** *(refs @ `23eac6f` — **the one judgment call, argued in §8 rather than assumed**)* | **A types-only module with no consumers is exactly the shape of inert registry data**, and this codebase carries a named class of that (F0.4's four author-unwired machines). It was added anyway, on four grounds stated in C9 §8: the normative content is a **shape**, and a shape in prose is unfalsifiable by the floor; the **`grain` union is the schema's central safety property** and is exhaustiveness-checked in code but only a sentence in prose; **SOMO builds against it**, and a type is the least ambiguous shape we can hand a peer platform; and it **inverts `COMMENT-AS-CONTRACT-01`** — document as authority, code pinned to it. The unions are derived from `as const` arrays so the pin can read them at runtime from **one** source. | **SHIPPED, declared INERT in its own header, and trivially reversible** — one file, no importers outside its test; deleting it costs nothing but the anti-drift property. **The honest cost is stated in the contract, not hidden**: it is an unused module. Flagged for the operator as the single decision in this batch that was mine rather than ruled. |
| **C9-SPACEID-REQUIRED-01** *(refs @ `23eac6f`; **AMENDED IN PLACE 2026-08-04 @ `3860fe4` — the retirement condition was WRONG**)* | **Every `MaterialRef` must name its code SPACE, not just its code — because each party owns more than one space TODAY, on both sides.** Paragon has the authoritative master (5 codes) **and** the document lane (30 master-absent codes, §6.4); SOMO has BOM codes (declared ILLUSTRATIVE, never SKU-validated) **and** canonical S/4, whose crosswalk between them is **named, registered and NOT BUILT**. A crosswalk row that cannot say which space it means is **ambiguous now, not hypothetically** — which is precisely the condition `MASTER-STRADDLE-01` described on our side and SOMO declares on theirs. **⚠️ THE AMENDED PART — the original disposition read *"retire the field only when both sides have exactly one space each"*, and SOMO's own check found the defect: THE SYMMETRY IS FALSE. That sentence describes a JOINT exit that only ONE party can reach.** Our second space is the **document lane** — **we own it**, and B2b collapses it: our half is conditional on **our own tidying, on our own schedule**. SOMO's second space is **CANONICAL S/4** — **they do not own it and cannot collapse it**: their half is conditional on **the S/4 wire**, a programme neither signatory controls. | **BUILT INTO THE SHAPE** (`MaterialCodeSpace` / `MaterialRef.spaceId`). Recorded because the field looks like generality-for-its-own-sake and is not: it is the minimum needed to write an unambiguous row against the two platforms **as they actually stand**. **AMENDED DISPOSITION — the condition is stated PER PARTY, and the consequence is stated rather than implied away: A REQUIRED FIELD WHOSE EXIT DEPENDS ON A SYSTEM NEITHER PARTY CONTROLS IS A FIELD THAT NEVER RETIRES.** Treat `spaceId` as **PERMANENT, not transitional** — the original phrasing invited a reader to design around it as scaffolding, and **a field designed around becomes wrong before it becomes unnecessary.** Note also that discharging OUR half changes nothing about the requirement: a row names both parties, and SOMO still holds two spaces. **This is a strengthening, not a weakening, of §5.** Pinned per party in `materialMasterRef.contract.test.ts` (A-1 block) — mutation-verified: restoring the joint phrasing fails by name. |

### Filed from the #162 render pass

| Finding | What it is | Disposition |
| --- | --- | --- |
| **COMMHUB-BARE-CODE-01** *(refs @ `23eac6f` — **found by a render pass, not by a test**)* | **The Comm Hub chase panel renders material codes as bare mono tokens with NO label, so an operator on that surface cannot tell what the material is.** Outbound chase requests render `RM-EMUL-3310 · jatuh tempo 01 Mei 2026` — code and due date, nothing else (`<Data>` primitive, `font-mono … text-data-navy`). The gap is **uniform across every code space on the panel**: master codes (`RM-EMUL-3310`), and delivery/chase-lane codes (`MAT-10234`, `MAT-20500`) alike. **This arc did not introduce it** — the panel reads the chase and delivery fixtures, which 2A never touched, and it rendered exactly this way before the re-coding. What the arc did was **make it visible**: after spending a batch establishing that one code means one thing, a surface that shows the code and withholds the meaning is conspicuous in a way it was not before. Note the honest counter-argument: `labelOf` (`sdc/materialMaster.ts:118-120`) would resolve only the five master codes and echo the raw code for everything else, so a naive fix would label some rows and not others — **which is arguably worse than labelling none**, because inconsistency reads as data quality rather than as design. | **NOT FIXED — filed only, and filed late.** It existed **only in a session conversation** after the #162 render pass and was reported verbally without reaching the register; recorded here on operator instruction. **That lateness is the point worth keeping: a finding that lives only in a conversation does not survive the session boundary, which is the entire reason this register exists.** No batch owns it yet. Whichever batch next touches the chase/Comm Hub surface should decide between (a) label where resolvable and echo the code otherwise, accepting the inconsistency, or (b) leave codes bare and make that a stated convention rather than an accident — **and the choice is downstream of 2B**, since master coverage is what determines how many rows could be labelled at all. |

### What the schema does NOT do — stated so it is not read into

- **It publishes no correspondence.** Zero rows, and none may be inferred. Populating
  is CP-2 · B2b, blocked on D-1 and D-COMP-BPOM.
- **It does not answer D-1.** The key takes the reversible direction and the grain
  tag carries both readings; procurement's ruling lands in
  `MaterialRefJoinPolicy.joinableGrains`, and **either answer leaves every stored
  row unchanged.**
- **It does not touch `MATERIAL_MASTER`.** No adoption, no new entry, no field added
  to `MaterialMasterEntry` — `substanceRef` is RESERVED with a named swap-point.
- **It does not fix `inferBpom`.** The mechanism is ours; the rule content is
  compliance's. See §6.2 and §7.3.

### Elevated to a CLASS (operator ruling, CP-2 · B2a merge)

| Class | The rule | Standing consequence |
| --- | --- | --- |
| **CONTRACT-OFF-THE-FLOOR-01** *(class; instances = the ELEVEN C7/C8 divergences)* | **NO BUILD STEP FAILS WHEN A CONTRACT STATEMENT STOPS BEING TRUE, SO CONTRACT DOCUMENTS DRIFT IN EXACTLY ONE DIRECTION.** A CP-1 audit found eleven doc-vs-code divergences across C7 and C8 and **every one understated the implementation**. Eleven errors sharing a direction are **one systematic cause, not eleven drafting mistakes** — and the asymmetry is the diagnostic, because random drafting error would overstate as often as understate. The cause: contracts are harvested once at a fixed commit and never re-harvested, and **documents are not on the floor, so they cannot regress a test.** | **C9 IS THE FIRST CONTRACT PUT PARTLY ON THE FLOOR.** `materialMasterRef.contract.test.ts` pins the document's **closed vocabularies** against the code's unions — verified to bite by mutation (adding a third grain fails two tests by name). **It deliberately does NOT check prose**: prose is not mechanically checkable and pretending otherwise would be its own dishonesty. **The direction is the point** — the DOCUMENT is authority and the code is pinned to it, which is `COMMENT-AS-CONTRACT-01` run the safe way round. **Standing consequence: a new contract document should ship with its vocabulary pinned, or state why it cannot.** |
| **CENSUS-MUST-DERIVE-01** *(class; instances = `CENSUS-REGEX-SHAPE-01` above **and SOMO's mirrored instance**, below — **NOW RATIFIED SHARED CANON BETWEEN THE PLATFORMS**)* | **AN IDENTITY CENSUS MUST DERIVE ITS POPULATION, NEVER MATCH A SHAPE.** A census answers "what is in this space and what does it mean". If it finds its members by matching a PATTERN, it has quietly assumed the very thing identity work exists to deny — that identifiers have a stable, knowable form — and every member that does not fit is absent from a report that still reads as complete. **The failure is silent and it is asymmetric: a shape-matched census never reports "I may have missed some", it reports a clean all-clear.** The instance below the rule is the sharpest possible demonstration, because the census's own subject was the ruling it broke. | **ANY sweep, audit, or census that greps for identifiers by pattern is under-counting by an unknown amount.** Enumerate from the data — iterate the fixtures, read the field, collect what is actually there. **And pin the result with DERIVED invariants, not hand-listed ones:** the pin that computes its expectation from the same data will fail the moment the author's mental model is wrong, which is precisely when a hand-written literal agrees with the author and passes. This is not a testing preference; it is the only mechanism that caught the instance. Re-read before CP-2's schema freeze, which is a census of exactly this kind. **BILATERAL AS OF 2026-08-04 — see `CENSUS-DERIVE-BILATERAL-01` below: SOMO adopted the rule and it immediately landed on them in the OPPOSITE direction, so the standing consequence now has a second half — a census must derive the COUNTERPARTY's population too, and every figure quoted about the other platform's code space must state how it was obtained.** |

---

## CP-2 · C9 AMENDMENT 1 — corrections landed BEFORE ratification (refs @ `3860fe4`)

**SOMO ratified the C9 SHAPE verbally** — specification-keyed with optional
substance rollup and a per-row grain tag; no-UNKNOWN-verdict; `materialCode`
opaque; `spaceId` required; adoption-is-not-discovery. **Written ratification
follows their own two checks.** Their check found **a real defect in our clause**,
and it is corrected here rather than after the fact, **so that what they ratify
is the corrected text and not an erratum against it.**

C9 is now at **second issue**. Three amendments, all marked **AMENDED** at the
clause in the contract. **No rows populated, no master edit, 2B still blocked on
D-1 and D-COMP-BPOM.** Floor 2050 → **2057** across 175 files.

| Finding | What it is | Disposition |
| --- | --- | --- |
| **C9-FALSE-SYMMETRY-01 (A-1)** *(refs @ `3860fe4` — **THEIR CHECK, OUR DEFECT; amends `C9-SPACEID-REQUIRED-01` in place, above**)* | **We wrote a retirement condition as a shared exit that only one party can reach.** The first issue said `spaceId` is dropped *"when both sides hold one space each"* — one sentence, one condition, implicitly joint. **It is two conditions with different owners and only one of them is a task.** OUR second space is the **document lane**: we own it outright and **B2b collapses it** — our half is discharged by our own tidying, on our own schedule. **SOMO's second space is CANONICAL S/4.** They do not own it, cannot collapse it, and their half is discharged only by **the S/4 wire** — a programme neither signatory to this contract controls. **The joint phrasing did not merely lose precision; it made a permanent field look like scaffolding**, and scaffolding gets designed around. | **CORRECTED IN THE CONTRACT (§5.2) AND IN THE TYPES MODULE, PER PARTY.** The consequence is now stated plainly instead of implied away: **a required field whose exit depends on a system neither party controls is a field that NEVER RETIRES** — build against `spaceId` as **PERMANENT**. Two second-order points kept because they are the ones a reader would otherwise get wrong: **(1)** discharging our half changes nothing about the requirement, since a row names both parties and SOMO still holds two spaces; **(2)** this is a **strengthening** of §5, not a weakening — the field's justification moved from "true today" to "true indefinitely". Pinned (A-1 block) and **mutation-verified: restoring the joint phrasing fails by name.** |
| **C9-ROUTE-TO-RESOLUTION-01 (A-2)** *(refs @ `3860fe4` — **SOMO's refinement of our own honesty rule, accepted and built**)* | **"Absence is unknown" was two-thirds of a rule, and the missing third is the part that does any work.** In their words: **AN UNRESOLVED ROW BEATS A CONFIDENT WRONG ANSWER ONLY IF IT CARRIES ITS CANDIDATE, ITS EVIDENCE, AND ITS ROUTE TO RESOLUTION — OTHERWISE IT IS A SHRUG WITH BETTER MANNERS.** Checked field by field against the first issue: the **candidate** is carried (the row *is* the candidate — `paragon` + `somo` + `grain` + `verdict`); the **evidence** is carried (`sourceOfTruth` + `evidenceLiveness` + `method`); **the route was ABSENT.** The near-miss is instructive: `sourceOfTruth` looks like it covers this and does not — **it is RETROSPECTIVE**, naming what was consulted, never what is still needed. A row reading *"TENTATIVE · source of truth: NONE — both masters SIMULATED"* is perfectly honest and completely inert: it tells the reader the row is doubtful and gives them nowhere to go. | **ADDED as `AdjudicationProvenance.routeToResolution` — REQUIRED, and bounded** (C9 §4.2). It names the **artifact, ruling or wire that would settle the row** — a resolution MECHANISM, not a description of the doubt (`'D-1 ruling from Paragon procurement'`, `'a LIVE Paragon master extract'`, `'D-COMP-BPOM'`). **Explicitly NOT a second notes column** — `note` already exists, is optional, and is where everything else goes; the boundary is stated in both the contract and the field's own docblock, and pinned. **REQUIRED rather than optional on purpose**: an optional route is omitted on exactly the doubtful rows it exists for and filled in on the confident ones. It follows `sourceOfTruth`'s ratified precedent — required, with a truthful value permitted to be an admission. **Invariant, and it composes:** a row that is not `CERTAIN` must name a real route; `'NONE'` belongs only to a row with nothing left to settle, i.e. one with LIVE evidence — **and since no row today can be `CERTAIN`, EVERY row writable today must name its route.** The field cannot be dead on arrival. Mutation-verified: making it optional fails by name. |
| **C9-COUNTERPARTY-OVERSTATEMENT-01 (A-3)** *(refs @ `3860fe4` — **the first C9 divergence, and it runs the OPPOSITE way to the eleven**)* | **We published, in a contract document, a defect the counterparty does not have.** C9 §3.1's headline was *"this clause exists because BOTH platforms violate it in shipped code today"*, with SOMO's explosion engine named as reading `RM-`/`PM-` class semantics from the prefix. **Their reciprocal sweep MEASURED it: no material-code prefix is parsed anywhere in their production, and `materialClass` is a declared ENUM read as a FIELD at ~20 sites** — already the shape the clause demands. **How we got it wrong is the part worth keeping:** C8 §4.6 recorded them *booking a check* after we volunteered `inferBpom`. **That was a hypothesis they had undertaken to test, and this document carried it forward as a finding.** A hazard the counterparty offers to look for is not a hazard the counterparty has. **Note the direction:** `CONTRACT-OFF-THE-FLOOR-01`'s eleven instances all understated OUR implementation; this one **overstated a defect in THEIRS.** | **CORRECTED IN §3.1 AND FILED AS §7.9 IN THE CONTRACT'S OWN NON-CONFORMANCE LEDGER** — the ledger is for divergences whichever way they run, and one that only catches the familiar direction is not a ledger. **The clause survives and is now asymmetric, which is more useful than the symmetry was: PREVENTATIVE on SOMO's side** (they carry class as a field already; the clause stops that regressing, including into the crosswalk) **and CORRECTIVE on ours** — `inferBpom` is live, unfixed, blocked on D-COMP-BPOM. **We are the only party currently in breach of a clause we proposed, and the contract now says so.** Also corrected in R-3, in the types module header, and in the pin — the old test asserted *"the opacity clause names BOTH platforms' prefix readers"*, an assertion whose premise had died. |
| **C9-SEMANTIC-IN-A-STRING-01** *(refs @ `3860fe4` — **shared risk; what their sweep found on the way past**)* | **They do not hold our BPOM shape. They hold its structural cousin, one level up: one record type carries an echelon ROLE only inside a DISPLAY STRING, with no field a reader could have used instead.** Not a material-code prefix, not a breach of §3 — and the same defect: **a semantic that exists in the system, is needed by readers, and is recoverable only by parsing prose.** Ours reads a code; theirs reads a label. **Generalisable form — `SEMANTIC-IN-A-STRING`: if a reader needs it, it is a FIELD; if it lives only in a string, every consumer becomes a parser and every rename becomes a behaviour change.** | **RECORDED IN C9 §3.1a AS SHARED RISK, not as a violation** — it is theirs to place and we are not pricing it. Filed because **neither party could have found the other's instance** (each sits in code the other will never read — the `C8-RECIPROCAL-HAZARD` pattern, third instance), and because **the crosswalk is where this would do the most damage**: `materialCode`, `spaceId`, `sourceOfTruth` and now `routeToResolution` are all strings, and the contract now states that **none of them may be parsed for meaning by either party.** Carried into §9 as a narrow ask: confirm no field C9 defines carries meaning either side is expected to parse. |

### Recorded as ratified shared canon between the platforms

| Canon | What happened | Standing consequence |
| --- | --- | --- |
| **CENSUS-DERIVE-BILATERAL-01** *(extends the `CENSUS-MUST-DERIVE-01` class, above — **SOMO adopted it and it landed on them too**)* | **AN IDENTITY CENSUS MUST DERIVE ITS POPULATION, NEVER MATCH A SHAPE — and "its population" includes the COUNTERPARTY's.** The rule was offered to SOMO as shared canon after our own census matched a code shape while documenting the ruling that codes are opaque. **They adopted it, and their intersection then broke it in the mirror image:** they **derived their 88 codes from seed** — the rule, correctly applied to their own space — while **reading ours from a file they had been told holds five**; and **two of the three Paragon codes we quoted at them came from a different file entirely.** **Same failure mode, opposite direction: ours was credulous about its own space, theirs about the other's** — and the second half is the half a crosswalk actually runs on. | **BOTH PLATFORMS NOW STATE HOW A POPULATION WAS OBTAINED WHENEVER QUOTING A FIGURE ABOUT THE OTHER'S CODE SPACE** — which file or extract, by what method. Not because the figure is probably wrong, but because **a population obtained by an unstated method reports a clean all-clear rather than "I may have missed some."** Written into C9 §3.3 as bilateral and binding; C9's Provenance block now marks every claim about SOMO's tree with how it was obtained, and names the one that was not (§7.9). **Second-order note worth keeping: both errors above are SPACE CONFUSIONS, which makes them the strongest live argument for `spaceId` — a row that names its space cannot make either of them.** |

### Elevated to a CLASS (operator ruling, C9 Amendment 1)

| Class | The rule | Standing consequence |
| --- | --- | --- |
| **DESCRIBE-DONT-RENDER-01** *(class; instances = **one per platform**, below)* | **DESCRIBING A DEFECT CAN RECREATE IT — NAME THE MECHANISM, NEVER RENDER IT.** A document about a defect is written in the same medium the defect lives in, so **the act of description is an opportunity to commit the thing being described.** Two instances, one from each platform, found independently and within days of each other. **SOMO's:** a **NUL byte inside a document describing the NUL byte they had just fixed** — the artifact reproduced its own subject, verbatim, in the file explaining it. **Ours:** a **shape-matching census whose subject was the ruling that codes are OPAQUE** (`CENSUS-REGEX-SHAPE-01`) — the method violated the clause the output was documenting, and under-reported by one code while reading as complete. **The two look unrelated and are the same failure:** in each, the register's own hygiene was the thing that broke, and **in each the subject matter is what made the breach invisible** — you do not check a document about NUL bytes for a NUL byte, or a census about opacity for an opacity assumption. | **A REGISTER-HYGIENE RULE, AND IT WILL BITE AGAIN — this register is a document about defects.** Standing practice: **when a finding is about a MECHANISM, name the mechanism; never reproduce an instance of it in the artifact that describes it.** Concretely — a finding about a malformed byte quotes its *description*, not the byte; a finding about a parsed prefix does not demonstrate itself by parsing one; a census about opacity derives its population rather than matching a shape. **The diagnostic to reach for: when writing up a defect, ask whether the write-up is itself an instance.** Note this class is an ORTHOGONAL AXIS on `CENSUS-REGEX-SHAPE-01`, not a replacement — that instance sits under `CENSUS-MUST-DERIVE-01` for its method and under this class for its irony, and both readings carry a different warning. |

### Constraints discharged, in writing

- **No rows populated.** The crosswalk is still `EMPTY AT FREEZE, BY RULING`; the
  contract test still asserts the module exports **no data arrays**, and A-2 added
  a required field to a table that has never carried a row (recorded as C9 §7.6,
  not as a claim of use).
- **No master edit.** `MATERIAL_MASTER` untouched; **2B remains blocked on D-1 and
  D-COMP-BPOM**, and nothing here pre-empts either.
- **The pin moved with the module.** A-2 changed `materialMasterRef.types.ts`, so
  `materialMasterRef.contract.test.ts` gained the A-1 and A-2 blocks — **including
  a DERIVED pin** (`CENSUS-MUST-DERIVE-01` applied to the pin itself) that reads
  the provenance field names out of the interface and requires each to be
  documented in C9, so a future field cannot reach the shape without reaching the
  document. **Both amendments mutation-verified to bite**, one failure each.
- **Floor 2050 → 2057 across 175 files**; `npm run build` and `npm run test:gate`
  green.

---

## CP-2 · C9 CANON ADDENDUM — shared canon, a worked example, one advance signal (refs @ `6560fe6`)

**SOMO has accepted all three amendments.** Written ratification follows their
**check 1**, which is running now. **C9's SHAPE IS NOT IN QUESTION.** C9 is at
**third issue**; the additions are **ADD-1…ADD-4**, all marked at the clause.

**DOCS ONLY.** No schema change, no rows, no master edit, **no edit to
`materialMasterRef.types.ts` — therefore the pin does not move.** Floor
**2057/2057, unchanged**. **2B remains blocked on D-1 and D-COMP-BPOM.**

### Elevated to a CLASS, and recorded as ratified shared canon — **SOMO's contribution**

| Class | The rule | Standing consequence |
| --- | --- | --- |
| **COMMITMENT-IS-NOT-A-FINDING-01** *(class; theirs, adopted — **the general form of our own `C9-COUNTERPARTY-OVERSTATEMENT-01`, above**; siblings = `CENSUS-MUST-DERIVE-01` and `DESCRIBE-DONT-RENDER-01`)* | **A COMMITMENT TO CHECK IS NOT A FINDING.** When one platform tells the other it will look at something, the other records it as **OPEN**, not **CONFIRMED**, until the measurement comes back. **Their reasoning is the part that makes it stick, and it is why the rule is about documents rather than about care: A DISCLOSURE AND A MEASUREMENT LOOK IDENTICAL IN A DOCUMENT ONCE QUOTED.** Carry *"they are checking whether their explosion engine parses prefixes"* forward one document and it reads exactly like *"their explosion engine parses prefixes"* — same structure, same apparent authority, and **nothing in the later document records which of the two it started as.** That is the entire mechanism of C9 §7.9: the transcription was faithful and **the status was the thing that did not survive it.** A-3 corrected the instance; **an instance corrected without its class is a defect waiting to recur under another name.** | **EVERY STATEMENT ONE PLATFORM MAKES ABOUT THE OTHER'S TREE CARRIES ITS STATUS, AND A STATUS NEVER SILENTLY UPGRADES.** Three tiers, written into C9 §3.4: **DISCLOSED** (undertaken to look, or a preliminary reading) → held OPEN at the clause; **REPORTED-MEASURED** (they ran it and reported) → carried with how it was obtained, and still not verification (§7.8); **VERIFIED** (we read it ourselves) → **permanently unavailable across this boundary in either direction.** Applies immediately to `C9-GRAIN-MISMATCH-01` below, which is why that finding is OPEN and not filed as a result. **Sibling reading worth keeping: none of the three classes is about the underlying fact being wrong — all three are about what the ACT OF WRITING does to a fact.** A shape-matched census loses the members it never looked for; a description reproduces its own subject; **a quotation strips a status.** The register's own hygiene is the failure surface in each. |

### Recorded as shared canon — their reading of our own ledger

| Canon | What happened | Standing consequence |
| --- | --- | --- |
| **DIVERGENCE-LOG-ONE-DIRECTION-01** *(theirs; reads `CONTRACT-OFF-THE-FLOOR-01`'s eleven instances against us)* | **A DIVERGENCE LOG THAT ONLY EVER RUNS ONE DIRECTION IS NOT BEING READ HARD ENOUGH.** We treated the uniform direction of the eleven C7/C8 divergences — **documents understating our implementation, every time** — as evidence about the **WRITING**: one systematic cause in how contracts were harvested and never re-harvested. **Their reading is that it is ALSO evidence about the READING.** A ledger that keeps producing instances of exactly one kind is being kept by someone who already knows which kind to look for, and **the instances of the other kind are not absent — they are UNSEARCHED.** | **CARRIED INTO THE C9 §7 PREAMBLE, where the ledger lives.** The observation's own best support is sitting directly beneath it: **§7.9 is the first entry that runs the other way — overstating a defect in the counterparty's tree — and it was found BY THE COUNTERPARTY, NOT BY US.** Both directions are now in scope for this ledger **by rule, not by luck**: a non-conformance sweep that returns only the familiar shape is to be re-run against the unfamiliar one before it is believed. |

### Filed in this addendum

| Finding | What it is | Disposition |
| --- | --- | --- |
| **C9-ROUTE-WORKED-EXAMPLE-01** *(refs @ `6560fe6` — **SOMO's worked example, carried with attribution; the identity of the row is theirs to publish**)* | **`routeToResolution` demonstrated in prose rather than in schema, on their own unresolved work — and it is better than anything we would have written.** **Their crosswalk resolved NOTHING: 0 confirmed of 5, published as 0 of 5.** Its strongest unresolved row does four things in order — **names its candidate** (not "unclear"; the specific correspondence it believes is the answer), **states the candidate was DELIBERATELY NOT TAKEN** (a decision, not a gap: somebody considered it and declined to assert it), **gives both circumstantial supports** (enumerated, so a reader can weigh the candidate instead of inheriting it), and **closes with the route: one sentence from the network team would settle it.** The first three are the candidate and the evidence — **the exact two-of-three C9 §4.2 calls *the shrug*.** | **ADDED AS C9 §4.2a.** The point, stated plainly and now in the contract: **WITHOUT THAT CLOSING CLAUSE THE ROW IS A BLANK; WITH IT, IT IS AN ANSWERABLE QUESTION WITH THE ANSWERER IMPLIED.** The fourth part costs one sentence and changes what the row **is** — not a record of doubt but **a piece of work with a named next step and a named owner**; a reader who cannot resolve it can still route it. **Second half of the finding, and it is the load-bearing half: a crosswalk that resolves zero of five and publishes zero of five is the no-`'UNKNOWN'`-verdict ruling WORKING (C9 §5), not a failed crosswalk.** Absence is unknown, silence asserts nothing, nothing in the shape rewards filling it in. **The failure mode was never an empty crosswalk — it was FIVE CONFIDENT ROWS, and every one of them would have looked like progress.** |
| **C9-GRAIN-MISMATCH-01** *(refs @ `6560fe6` — **⚠️ OPEN, NOT CONFIRMED. A DISCLOSURE, NOT A MEASUREMENT, per `COMMITMENT-IS-NOT-A-FINDING-01` above**)* | **SOMO's PRELIMINARY READING of their own master, given in advance of their check-1 report.** It is **not a finding until their report lands**, and it is filed under that status deliberately — the class above exists precisely because a signal this load-bearing, quoted once without its status, becomes a fact nobody decided to assert. **What they report preliminarily: their master carries SUBSTANCE-LEVEL rows.** They hold `Glycerin` where we hold `Glycerin USP 99.5%`, `Flip-Top Cap` where we hold `Flip-Top Cap 24mm`. **Grade and size do not carry on their side.** **So the likely finding is a GRAIN MISMATCH, not a missing field** — and that distinction is the whole of its significance: a missing field is a schema defect and would put C9 back into amendment; **a grain mismatch is a thing the schema was built to express.** Their rows would be **writable at `'substance'` grain and UNKNOWN at `'specification'` grain**, asserting substance-equivalence while saying nothing whatever about grade or size — neither denying a specification correspondence nor inventing one. | **RECORDED AS C9 §6.1a, HELD OPEN, AND NOTHING IS BUILT ON IT.** Three consequences, stated because they are the operator-relevant part: **(1) C9 ALREADY EXPRESSES THIS — no schema change is implied**, not by the signal and not by its confirmation, which is why this addendum is docs-only. **(2) It is the grain tag's FIRST REAL-DATA JUSTIFICATION.** Until now `grain` rested on the irreversibility argument (§2.2) — sound and entirely hypothetical; no actual pair of masters had been shown to sit at different grains. **A peer platform's master, read by its owner, is the first evidence that the two grains are where the data actually IS.** **(3) It sharpens D-1 for procurement, with a different argument than D-1 has been carrying:** the substance rollup (§2.4) has been presented as an additive convenience for later. **If our peer platform's master is substance-level and ours is specification-level, the substance axis is not a convenience — it is the axis on which any row sourced from their master can be written at all.** Procurement should have that before ruling. **Disposal condition, stated in advance so the section cannot be quietly retained: if their check reports otherwise, §6.1a is deleted and NOTHING ELSE IN C9 MOVES** — which is not a consolation but **the property the grain tag was built for, tested against a real counterparty master for the first time.** Its own route: `'SOMO check-1 report, at a declared grain'`, which is also R-6 (§6.3) — **they are one question.** |

### Constraints discharged, in writing

- **DOCS ONLY.** Two files: `docs/contracts/C9-material-master-ref.md` and this
  register. **No schema change** — the closed vocabularies, the row shape and
  `AdjudicationProvenance` are byte-identical to the second issue.
- **No rows.** The crosswalk is still `EMPTY AT FREEZE, BY RULING`, and
  `C9-GRAIN-MISMATCH-01` explicitly authorises none.
- **No master edit.** `MATERIAL_MASTER` untouched; **2B remains blocked on D-1 and
  D-COMP-BPOM**, and §6.1a — being a disclosure — pre-empts neither.
- **The pin did NOT move, because nothing reached the types module.** The dispatch
  condition was *"if any addition touches the C9 types module, the pin moves with
  it"*; no addition did. `materialMasterRef.contract.test.ts` is unchanged and
  still passes against the third issue — the DERIVED provenance-field pin
  included, since no field was added.
- **Floor 2057/2057**, `npm run build` and `npm run test:gate` green.

---

## CP-2 · C9 AMENDMENT 2 — the collision, the shipping failure, and both checks (refs @ `50f2858`)

**SOMO ran both checks. Everything in C9 stands ratified on their side EXCEPT
ONE COLLISION**, which they raised correctly and which the operator ruled in
their favour. **C9 is at fourth issue: A-4…A-14.** A-4 changes the schema, so
**the pin moved with the types module.**

**And the blocker that outranks all of it, also theirs: C9 WAS NEVER DELIVERED
AND NEVER PINNED** — see `CONTRACT-NOT-PINNED-01` / `ENCLOSED-IS-NOT-DELIVERED-01`
below. **No rows, no master edit; 2B still blocked on D-1 and D-COMP-BPOM.**

| Finding | What it is | Disposition |
| --- | --- | --- |
| **C9-VERDICT-COLLISION-01 (A-4)** *(refs @ `50f2858` — **THEIRS, RAISED CORRECTLY, RULED IN THEIR FAVOUR; §7's SECOND counterparty-found item**)* | **Two of our own clauses collided and a row could satisfy both only by not existing.** §5: **absence IS unknown**, so a doubtful row is simply not written. §4.2: **`routeToResolution` is REQUIRED on every writable row.** **A ROW THAT IS ABSENT CANNOT CARRY A ROUTE** — so the field we added one issue earlier **at SOMO's own request had nowhere to live.** Their resolution, adopted: **ABSENCE AND ADJUDICATED-UNRESOLVED ARE DIFFERENT FACTS. Absence means NOBODY LOOKED. An adjudicated-unresolved row means SOMEBODY LOOKED, FORMED A CANDIDATE, AND COULD NOT CLOSE IT. A map that cannot distinguish them LOSES THE MORE EXPENSIVE ONE — the one that cost analysis.** | **`'ADJUDICATED_UNRESOLVED'` ADDED AS A VERDICT DISTINCT FROM ABSENCE** (C9 §5.3), carrying candidate, evidence and route — **the row shape `routeToResolution` was built for.** **IT DOES NOT WEAKEN THE NO-UNKNOWN RULE; IT SHARPENS IT:** the rule was that **silence must assert nothing**, and it still does. The error was assuming absence was the only honest way to say *not settled*. **An unresolved row asserts NOTHING ABOUT THE CORRESPONDENCE; it asserts something about the WORK DONE** — a different claim, and a true one. **There is still no `'unknown'` verdict and still no way to write one**, pinned mechanically (no vocabulary member contains the string). Three further invariants: **must not be `'CERTAIN'`** (a separate reason from §4.1's — that one is about invented EVIDENCE, this about an absent CLAIM); **never joinable, unconditionally** (not a confidence threshold, so raising confidence cannot reach it); **superseded, never accompanied.** Mutation-verified. |
| **C9-RETIREMENT-NOT-A-COUNT-01 (A-5)** *(refs @ `50f2858` — **their check 2; second correction to the same clause in two issues**)* | **`spaceId`'s retirement condition was still soft, and the softness was in the word "holds".** SOMO satisfy *"holds one space"* **TODAY, and ONLY VACUOUSLY — because the counterpart space is EMPTY** (they hold zero codes in canonical S/4). **The condition holds precisely while the crosswalk has no S/4 codes in it, and FAILS THE MOMENT THE WIRE LANDS AND THE CONTRACT DOES THE WORK IT EXISTS FOR.** Their formulation, carried verbatim: **A RETIREMENT CONDITION THAT HOLDS ONLY BEFORE THE CONTRACT DOES ANY WORK IS NOT A RETIREMENT CONDITION.** | **RESTATED AS AUTHORSHIP, NOT A COUNT — in the contract (§5.2a) and the types module: BOTH PARTIES AUTHOR EVERY SPACE THEY HOLD.** **A count treats space-holding as housekeeping**; for SOMO one space is **another organisation's master under Paragon MDG governance, which they can no more collapse than rename S/4** — no amount of tidying reaches it, because the obstacle was never their untidiness. **Second-order consequence worth keeping: composed with §1, the conclusion stops being circumstantial.** §1 says a crosswalk earns its place only between spaces owned by DIFFERENT parties, so the authorship condition can be satisfied only when both sides share an author — **exactly the case in which the crosswalk should not exist.** `spaceId` retires **only when the crosswalk is deleted**, and no longer depends on the S/4 programme's timing to be true. Mutation-verified. |
| **C9-S4-IS-OUR-SIDE-01 (A-6)** *(refs @ `50f2858` — **operator ruling**)* | **CANONICAL S/4 IS THE PORTAL'S SIDE OF C9.** Our side of the crosswalk **IS** S/4 material-master identity — that is what `material_master_ref` exists for, and the 5-entry SIMULATED master is that space's stand-in, not a different space. | **STATED EXPLICITLY IN §5.2b, §5 AND §6.3, because it changes what SOMO must build: THEY NEVER NEED MORE THAN ONE `spaceId` FOR THEIR OWN POPULATIONS, AND S/4 IS NOT A THIRD SPACE FOR THEM TO CARRY.** What they do not author, they **reference** — as the counterpart half of a row, the one place in this schema a foreign identity belongs. **R-6 narrows and survives** (§6.3): the ruling moved the ownership of the target space, not the adjudication — **the crosswalk to S/4 is still theirs to build and its grain is still the open question.** |
| **C9-SOMO-SHAPE-CORRECTED-01 (A-7)** *(refs @ `50f2858` — **three corrections, all theirs, all running AGAINST their own earlier position, all measured**)* | **(1) THEIR DISCRIMINATORS ARE SPARSE AND UNSYSTEMATIC, NOT ABSENT** — of 88 material codes: **1 grade token, 5 concentrations, 12 packaging rows with structured capacity.** The earlier *"grade and size do not carry"* was **generalised from a sample of two** (`Glycerin`, `Flip-Top Cap`) — the two examples that reached us. **(2) THREE self-authored populations under MATNR semantics, not two:** 88 material (ROH+VERP), 17 bulk (HALB), 17 finished-good (FERT), and **ZERO codes in canonical S/4.** **(3) PAIRWISE DISJOINT BY MEASUREMENT BUT NOT ENFORCED** — no cross-contract uniqueness assertion exists. **(4) The opacity pass is CLEAN WITH EVIDENCE** across all three populations; **prefixes are authoring convention only.** | **EVERY PLACE OUR TEXT SAID THEY CARRY NONE IS CORRECTED** (C9 §5, §5.2b, §6.1a) — ***sparse and unsystematic* is a materially different finding from *absent*: the axis exists on their side and is NOT RELIABLE**, which is a harder problem than absence and much easier to overstate in either direction. **The distinction they drew is recorded verbatim because it is the honest one: THEY CAN DECLARE THE COLLAPSE; THEY CANNOT PROMISE IT** — a declaration is not an enforcement, and `spaceId` is what carries the difference. Populations and disjointness pinned by name in the contract test. |
| **C9-DATA-GAP-NOT-SCHEMA-GAP-01 (A-8)** *(refs @ `50f2858` — **their check-1 verdict, in their words**)* | **The gap is in the DATA, not in the schema: *if Paragon buys `Glycerin USP 99.5%` and `Glycerin BP 99.0%`, their master holds ONE ROW AND HAS NOWHERE TO PUT THE SECOND.*** **And their reason for NOT proposing the easy fix is the finding's better half:** adding a grade column would give them **a master that can EXPRESS the distinction while its data still does not — WHICH IS A QUIETER KIND OF WRONG.** A schema that can express what the data does not hold **looks complete and reads as authoritative**, and the gap stops being visible exactly when it stops being fixable by inspection. | **RECORDED IN C9 §6.1a WITH ATTRIBUTION — it is our own honest-silence discipline arriving from their side, unprompted**, and it is the same argument §7 makes about documents pointed at a master instead. **Also recorded: their master carries no confidence and no adjudication provenance, and the absence is DEFENSIBLE** — those fields are authored **at adjudication time and no adjudication has occurred.** They are **a shape SOMO can build, not data they hold**, and **C9 does not relax for them**: the fields stay REQUIRED on every row, whoever writes it. |
| **C9-GRAIN-MISMATCH-01** *(filed OPEN at `6560fe6` — **NOW CLOSED BY MEASUREMENT, and the disclosure was PARTLY WRONG**)* | The advance signal held OPEN one issue ago said *"grade and size do not carry on their side"*. **Their report corrected it** (A-7). **The finding survives in substance — it is a GRAIN MISMATCH, not a missing field — and its premise was overstated.** | **THIS IS `COMMITMENT-IS-NOT-A-FINDING-01` PAYING FOR ITSELF INSIDE ONE CYCLE.** Had the advance signal been recorded as a result, C9 would now carry **a generalisation from a sample of two as a measured fact about a peer platform's master — which is precisely §7.9, repeated.** The tier machinery is left visible in §6.1a (DISCLOSED → REPORTED-MEASURED) rather than tidied away, because **the correction is the evidence the canon works.** What survives: still a grain mismatch, **still no schema change implied by it**, still the grain tag's first real-data justification, and **still sharpening D-1** — sparse discriminators are exactly what make per-row `grain` tagging unavoidable rather than uniform. |
| **C9-SUMMARY-DELTA-01 (A-12)** *(refs @ `50f2858` — **⚠️ OPEN. A DISCLOSURE, NOT A FINDING, per `COMMITMENT-IS-NOT-A-FINDING-01`**)* | **SOMO have undertaken to report THE DELTA BETWEEN OUR PROSE SUMMARY AND THE ARTIFACT** — any required field the prose named that the artifact does not require, and any the artifact requires that the prose never named. They are re-running check 1 against the artifact and the derived field list. | **RECORDED AS C9 §6.1b, HELD OPEN, NOTHING BUILT ON IT.** Why it is worth its own section: **NOBODY HAS MEASURED WHAT A SUMMARY LOSES AGAINST ITS SOURCE.** A-9 establishes that ratifying a summary is not ratifying the contract — that is an argument; **the delta is the first number ever put on it**, and it exists only because both platforms happen to hold the summary, the artifact, and a ratification decision that ran on the wrong one. **Disposal condition stated in advance: EMPTY ⇒ our summary was faithful and their shape-ratification was sound, and the section is deleted. NON-EMPTY ⇒ both platforms learn what a summary costs, field by field.** |

### Elevated to CLASSES (operator ruling, C9 Amendment 2) — **the family now covers WRITING, READING and SHIPPING**

| Class | The rule | Standing consequence |
| --- | --- | --- |
| **COUNTERPARTY-RATIFYING-A-SUMMARY-01 (A-9)** *(class; **`COMMENT-AS-CONTRACT-01` aimed at OURSELVES, one boundary out**)* | **A COUNTERPARTY RATIFYING A SUMMARY HAS NOT RATIFIED THE CONTRACT.** **C9 IS NOT IN SOMO'S REPOSITORY.** Their field list came from **our prose summary** of `materialMasterRef.types.ts` — so every ratification they gave was given against **a description of the artifact, not the artifact.** C9 §8 claims the types module INVERTS `COMMENT-AS-CONTRACT-01` by making the document authority and pinning the code to it. **That inversion holds inside our repository and stops at its edge** — which is precisely where a contract with a peer platform does its work. | **FIXED, PARTLY, AND THE UNFIXED HALF IS NAMED.** **FIXED:** `docs/contracts/C9-required-fields.md` — the **complete required-field list, DERIVED from the module** (never transcribed: a hand-written list is the very summary that caused this) **and pinned to it in the contract test**, bidirectionally, so a field cannot reach the shape without reaching the list. It **refuses to stand in for C9** in its own header. **NOT FIXED:** every ratification given before it existed was given against prose — **`C9-SUMMARY-DELTA-01` is the measurement of what that cost.** Recorded as C9 §7.11. |
| **STATED-LIMIT-DOES-NOT-DISCHARGE-01 (A-10)** *(class; **SOMO's, and the instance is theirs**)* | **A STATED LIMIT DOES NOT DISCHARGE THE LIMIT. NAMING A GAP IS NOT CLOSING IT.** Their investigating seat **opened by naming exactly what it could not check** — that its field list came from prose, not the artifact — and **the seat above it proceeded as though the check were complete.** The disclaimer was present, correct, and first; it changed nothing downstream. | **FILE IT BESIDE `COMMITMENT-IS-NOT-A-FINDING-01` — SAME FAMILY, OPPOSITE END.** One governs how a **disclosure is RECORDED** by the party receiving it; this one governs how a **disclaimer is CONSUMED** by the party acting on it. **Neither is any use without the other:** a status faithfully recorded is still discarded if the next reader treats a stated limit as a discharged one. **An investigation that states what it could not check has done its job; the seat consuming it has not, if it proceeds as though the check were complete.** **Both halves of the summary failure are now filed, one from each platform** — ours above, theirs here — and that symmetry is not decoration: **a class filed from only one side would have read as blame rather than as mechanism.** C9 §3.5. |
| **RECORD-OF-WORK-IS-NOT-A-CLAIM-01 (A-11)** *(class; **SOMO's generalisation off our collision reframing; they are adopting it platform-wide**)* | **A RECORD OF WORK DONE IS NOT A CLAIM ABOUT THE THING WORKED ON.** It is **the sentence that resolved `ADJUDICATED_UNRESOLVED`**: once the two kinds of claim are separated, a row saying *"we looked and could not close it"* stops looking like a hedged assertion about the correspondence and becomes an exact assertion about something else. | **IT STATES WHY AN HONEST-STATE POSTURE THAT REFUSES TO WRITE ANYTHING CAN ITSELF BE A LOSS.** A discipline that writes nothing until it can write a confident answer **discards the analysis** — and **the effort is a fact worth keeping**, one the party that spent it is uniquely placed to record and uniquely likely to lose. Recorded in C9 §3.5 **with its origin**, because the generalisation and the amendment that produced it are only fully legible together. |
| **CONTRACT-NOT-PINNED-01 (A-13)** *(class; **SOMO's formulation, verbatim — and it was BLOCKING them**)* | **A CONTRACT THAT IS NOT PINNED CANNOT BE RATIFIED — ONLY DESCRIBED. COMMITTED-AND-CITED IS THE MINIMUM UNIT OF AGREEMENT BETWEEN TWO SYSTEMS, AND A WORKING TREE IS NOT A VERSION.** **C9 was DIRTY every time they read it** — contract, types module and field-list generator all modified in the working tree across the readings — **so they were reading a document mid-edit, past the version our prose described.** A stronger form of the A-9 defect: not a summary instead of the artifact, but **no fixed artifact to summarise.** | **THE STINGING HALF IS THE USEFUL ONE: OUR OWN GENERATOR ALREADY SAYS THE HARDER VERSION OF THIS** — `C9-required-fields.md` opens by refusing to be ratified in place of the contract. **We wrote that rule, generated it into an artifact, and did not apply it one layer out. A DISCIPLINE STATED IN AN ARTIFACT DOES NOT PROPAGATE TO THE PROCESS THAT SHIPS THE ARTIFACT** — it has to be applied to the shipping, deliberately, by someone. **STANDING PRACTICE, adopting the precedent SOMO already set from the other side (they pin C7 at a SHA):** C9 is cited as **all three paths at one SHA**, and **ANY LATER AMENDMENT IS A NEW SHA AND A NEW RATIFICATION.** That is a feature — **it makes *"which C9 did you ratify?"* answerable**, which it was not while four issues shipped under one filename. Citation block at the head of C9; recorded as §7.12. |
| **ENCLOSED-IS-NOT-DELIVERED-01 (A-14)** *(class; **SOMO's, the delivery half**)* | **AN ARTIFACT DESCRIBED AS ENCLOSED IS NOT ENCLOSED. DELIVERY IS A FACT TO BE CONFIRMED, NOT ASSERTED.** **THE ENCLOSURE NEVER ARRIVED.** C9 has only ever lived in our repository; our message said *"enclosed"* and **carried nothing**. **"Enclosed" and "delivered" came apart silently and NEITHER SIDE NOTICED FOR TWO EXCHANGES.** | **THE SHAPE IT SHARES WITH `COMMITMENT-IS-NOT-A-FINDING-01` is the reason it belongs in this family:** a disclosure and a measurement look identical in a document once quoted; **an asserted delivery and an actual one look identical in a message.** In both, the failing artifact is **the sentence that stands in for the thing**, and in both the fix has the same shape — **name the status, and make the confirming party the one who can see it.** Standing practice: **a delivery is confirmed by the receiving side or it did not happen**; a SHA the counterparty can fetch is the confirmation. C9 §3.6. |

### Constraints discharged, in writing

- **The pin MOVED WITH the types module.** A-4 changed the verdict vocabulary, so
  `materialMasterRef.contract.test.ts` gained four blocks (A-4, A-5/A-6, A-7/A-8,
  A-9). **Both new invariants mutation-verified to bite:** removing
  `'ADJUDICATED_UNRESOLVED'` from the union fails by name, and restoring the
  count formulation of the retirement condition fails by name.
- **The derived field list is pinned BOTH WAYS.** The committed
  `C9-required-fields.md` is a file snapshot of the rendering, and a second,
  independent assertion reads every interface field out of the module and
  requires each in the committed file — **`CENSUS-MUST-DERIVE-01` applied to the
  artifact we send the counterparty**, since a hand-written list is the exact
  failure `COUNTERPARTY-RATIFYING-A-SUMMARY-01` names.
- **No rows populated.** Still `EMPTY AT FREEZE, BY RULING`; the new verdict
  authorises no row and the contract test still asserts the module exports no
  data arrays.
- **No master edit.** `MATERIAL_MASTER` untouched; **2B remains blocked on D-1
  and D-COMP-BPOM.**
- **Floor 2057 → 2070** across 175 files; `npm run build` and `npm run test:gate`
  green.
- **The tree is CLEAN at the merge SHA and all three C9 artifacts are committed**
  — the contract, the types module and the derived field list. Per
  `CONTRACT-NOT-PINNED-01`, that SHA is the citation, and the next amendment is a
  new one.

---

## CP-3a · CI — the gates, run where nobody is looking (refs @ `f492b5c`)

**There was no `.github/` in this repository.** Every guarantee in the register
above rode on operator discipline, and we already had the evidence that is not
enough: **on Saturday 2026-08-01 the floor broke with NOBODY TOUCHING A FILE**
(two specs read the real wall clock past a fixture due-date), and it was found
the following **Monday, by a session looking at something else**. **No commit
could have caught it, because no commit occurred.** That is the whole argument
for the scheduled half, and it is a measurement, not a hypothesis.

**One workflow, `.github/workflows/gates.yml`, one job, four triggers** — PR to
`main`, push to `main`, **daily at 00:17 UTC**, and manual. It runs **one
command, `npm run gates`**, which is the command the operator runs. There is
deliberately **no gate CI can run that the operator cannot**.

| Finding | What it is | Disposition |
| --- | --- | --- |
| **FLOOR-IN-PROSE-01** *(refs @ `f492b5c` — **`CONTRACT-OFF-THE-FLOOR-01` caught in our own root instruction file**)* | **`CLAUDE.md` said the test floor was 662. The suite collects 2070.** The prose had drifted **more than fourteen hundred tests** behind the thing it described, across dozens of merges, **and nothing failed** — because no build step fails when a sentence stops being true. Every findings entry in this register quotes the floor correctly; **the one place a fresh session reads first was the one place it was wrong.** | **THE NUMBER IS NOW A FILE THAT IS CHECKED: `scripts/floor.json`**, asserted by `npm run gates` and by CI. **`CLAUDE.md` no longer restates any floor figure** — it points at the file. **That is the fix, and it is deliberately not "correct the number":** a corrected number is the same artifact one merge later. **The file count is asserted too (175)** — a suite can lose a whole spec file without losing a round number of tests. **Asked whether a gate could assert that the number in `CLAUDE.md` matches the suite, the answer is that there is no longer a number there to match, and the residual risk is a future session writing one back.** So the gate asserts **the POINTER survives** — `CLAUDE.md` must still name `scripts/floor.json`, because deleting the pointer is how prose regrows a number. **Deliberately NOT a regex hunting stray digits in an English document: it would fire on the very sentence recording this finding, and a gate that cries wolf over its own prose is worse than no gate.** Verified failing when the pointer is removed. |
| **PASSWITHNOTESTS-01** *(refs @ `f492b5c`)* | **The repository shipped a script that is green precisely when it finds nothing to do:** `"test:run": "vitest run --passWithNoTests"`. **It is the exact failure mode this batch exists to prevent, pre-installed and one `npm run` away**, and it survived because **nothing calls it** — the only reference to `test:run` anywhere in the repository was its own definition. An unused trap is not a harmless trap; it is a trap that has not been stepped in **yet**, and the obvious thing for a future CI author to wire is the script with `test` in its name. | **THE FLAG IS REMOVED.** Verified that bare `vitest run` **fails** when its pattern matches nothing (probe: `vitest run src/does-not-exist-anywhere` → **exit 1**), so the documented gate `npx vitest run` was never at risk — only the unused script was. **Not a weakening of any gate: strictly the opposite.** |
| **GATE-GLOB-01** *(refs @ `f492b5c` — **the file's own header documented an invocation that ERRORS**)* | Two defects in one line. **(1)** `test:gate` named **ONE FILE EXPLICITLY** (`node --test gate/session.test.js`), so a second gate test file would be **silently not run** — green, having found nothing to do, in the security suite. **(2)** The header comment of `gate/session.test.js` told the reader to run **`node --test gate/`**, which **does not work on this runtime**: node v24.15 resolves the directory as a *module* and dies `MODULE_NOT_FOUND`, then reports **`✖ gate` / `ℹ tests 1`** — a failure that looks like a failing test. **The documented form was broken and the working form was blind.** | **`test:gate` is now `node --test gate/*.test.js`** — verified 7/7 both as a direct argv and through `cmd.exe` (the Windows npm-script path, which does not expand globs, so node's own glob support carries it; `sh` expands it on Linux to the same single file today). **The comment is corrected in place** and now names the working invocation and why the documented one is not it. **The gate count (7) is asserted as well** — the glob fixes *new file not picked up*, the count assertion fixes *existing file stopped running*, and neither covers the other. |
| **CI-LINUX-PARITY-01** *(refs @ `f492b5c` — **five probes run BEFORE writing any workflow YAML, per dispatch**)* | The operator's environment is **Windows / `Asia/Bangkok` (UTC+7) / node v24.15.0**; CI is **Linux / UTC**. Four axes could make CI disagree with a locally-green tree, and a CI that disagrees for an environmental reason **teaches the operator to ignore it**. | **ALL FOUR PROBED AND CLEAR; EVIDENCE, NOT ASSUMPTION.** **(1) TIMEZONE — the full suite re-run under `TZ=UTC` (verified applied: node reported `04:09 GMT+0000` against a 11:09 local wall clock): 2070/2070, 175 files.** The suite is timezone-invariant at this instant. **(2) LINE ENDINGS — `core.autocrlf=true` and NO `.gitattributes`, so every text file is CRLF in the operator's worktree and LF in CI.** That is not academic here: **the C9 pin reads committed markdown and compares it to a generated rendering.** Probed by rewriting `docs/contracts/C9-required-fields.md` to LF-only (0 CRLF pairs) and re-running the contract spec → **33/33 pass**; the pin is EOL-invariant and the file restored. **(3) LOCKFILE PLATFORM BINARIES — the classic `npm ci`-on-Linux failure.** `package-lock.json` (v3) carries **all 25 `@rollup/rollup-*` and all 26 `@esbuild/*` optional platform packages**, `linux-x64-gnu` included; `npm ci --dry-run` is clean, so the lock is in sync with `package.json`. **(4) RUNTIME — CI pinned to node major 24**, the operator's major. **Named and NOT fixed: nothing asserts these four stay true.** The daily run is what would surface a later divergence, and it will surface it as a failure on `main`, which is the correct place to see it. |
| **NOTIFICATION-UNCONFIRMED-01** *(refs @ `f492b5c` — **⚠️ OPEN, and it is the operator's to close, not ours**)* | **A RED BADGE IS NOT A NOTIFICATION.** Nobody goes to look at a badge on a Saturday — that is the premise of the whole batch, so accepting one as the answer would be circular. GitHub's own path for a scheduled-run failure is **an email to the account that last modified the cron expression** — which, since squash-merges here are authored by `jcalderabarboza-star`, would be the operator — **but only if that account has Actions notifications enabled**, a per-account setting **this repository cannot read and we cannot assert on their behalf.** | **A SECOND, INDEPENDENT PATH IS BUILT, AND THE FIRST IS LEFT UNASSERTED.** A failing **scheduled** run (only scheduled — a PR failure is seen by the person merging) opens or comments on a `gates-failure` **issue**, using `GITHUB_TOKEN` and `gh` — durable, visible without going to look, and independent of the notification setting. **What is NOT claimed: that either path reaches a human.** Per `RECEIVER-CONFIRMS-01` below, **delivery is confirmed by the receiving side or it did not happen.** **Closes when the operator reports having actually RECEIVED something** from a failing scheduled run — not when the mechanism is observed to exist. |
| **PATH-FILTER-TRAP-01** *(refs @ `f492b5c` — **filed as a decision taken, so it is not re-taken later as an optimisation**)* | The standard economy on a CI workflow is `paths-ignore: docs/**` — skip the suite when only prose changed. **In this repository that is precisely backwards.** The C9 contract pin **reads `docs/contracts/*.md`** and fails when the prose and the types module disagree; `CENSUS-MUST-DERIVE-01` and the derived field list are the same shape. **A docs-only change here is a change to a checked artifact.** | **NO PATH FILTERS, DELIBERATELY, AND THE REASON IS IN THE WORKFLOW FILE** rather than only here — a comment beside the trigger is what a future editor reads before adding the filter. **The economy would have skipped exactly the gate built to catch the drift it was skipping for.** |
| **CI-PUBLIC-LOGS-01** *(refs @ `f492b5c` — **surfaced while checking Actions was enabled; not a defect, a constraint on everything built after this**)* | **The repository is PUBLIC** (`visibility: public`). Two standing consequences for CI: **Actions logs and run artifacts are world-readable**, and **Actions minutes are free**, which is why a daily full run costs nothing to keep. | **RECORDED AS A CONSTRAINT: NO SECRET MAY EVER ENTER A GATE LOG.** The gates need none — `npm run build`, the suite and `test:gate` all run without environment (`GATE_USER` / `GATE_PASSWORD` / `GATE_SECRET` are edge-runtime env for `middleware.js`, never referenced by the gate *tests*, which use their own literal `'unit-test-secret-do-not-ship'`). The workflow declares `permissions: contents: read`, with `issues: write` scoped to the reporting job alone. **Also recorded because it will matter later:** GitHub disables scheduled workflows on a public repository after **60 days of repository inactivity** — irrelevant at the present commit rate, and the reason a quiet quarter would silently end the daily run. |
| **TSC-SKIPS-TESTS-01** *(refs @ `f492b5c` — **⚠️ OPEN, NAMED AND NOT FIXED, because fixing it needs an argument the dispatch requires be had first**)* | **`npm run build` never typechecks the test surface.** `tsconfig.json` excludes `src/**/*.test.ts`, `src/**/*.test.tsx` and `src/test`, and vitest transpiles without typechecking — so **no gate typechecks a spec file.** A spec can carry a type error indefinitely and all three gates stay green. `tsconfig.vitest.json` exists and includes them, and nothing runs it. | **CI INHERITS THE GAP EXACTLY, WHICH IS THE POINT: CI IS NOT A SECOND SOURCE OF TRUTH.** Closing it means `tsc -p tsconfig.vitest.json --noEmit` — **a gate the operator does not run today**, and the dispatch is explicit that such a gate is argued before it is added, not smuggled in beside a CI batch. **Filed so the next batch can rule on it with the cost known.** |

### Elevated to CLASSES (operator ruling, CP-3a) — **SOMO's generalisation of our own filing, sharper than ours**

| Class | The rule | Standing consequence |
| --- | --- | --- |
| **GOVERNANCE-INSIDE-THE-GOVERNED-01** *(class; **SOMO's generalisation of `CONTRACT-NOT-PINNED-01`'s stinging half — carried with attribution, and it is better than the form we filed**)* | We filed it as an instance: *"a discipline stated in an artifact does not propagate to the process that ships the artifact."* **They generalised it, and the general form is the load-bearing one: THIS IS THE FAILURE OF ANY GOVERNANCE THAT LIVES INSIDE THE THING BEING GOVERNED.** Their own case holds the identical shape — **contracts carrying honest-state rules that their dispatch process does not inherit.** A rule written inside the artifact **binds readers of the artifact and nothing else**; the shipping, the scheduling, the merging and the notifying are all outside it and inherit nothing. | **RECORDED WITH THE OBSERVATION THAT MAKES THIS BATCH WORTH MORE THAN ITS DIFF: CI IS THE FIRST MECHANISM THIS PROJECT HAS THAT LIVES *OUTSIDE* THE THING IT GOVERNS.** Every gate before it — the contract pins, the derived field list, the census-must-derive rule, the honest-state markers — **is enforced by code that only runs when somebody chooses to run it.** The scheduled half runs **when nobody chooses anything**, which is the only condition under which the 2026-08-01 break was ever going to be caught. **It is also why the batch is deliberately small: the value is in being outside, not in being clever.** Two instances filed in this batch alone — `FLOOR-IN-PROSE-01` (a number governed by prose inside the repository it describes) and `GATE-GLOB-01` (a run instruction governed by a comment inside the file it runs). |
| **RECEIVER-CONFIRMS-01** *(class; **SOMO's, the half of `ENCLOSED-IS-NOT-DELIVERED-01` we did not file**)* | **THE SENDER ASSERTS; THE RECEIVER IS THE ONE WHO CAN CONFIRM.** Their instance, from their side: they received *"enclosed"*, **assumed delivery, and did not check for two exchanges.** We filed the sender's error (asserting an enclosure that was not there). **The receiver's error is separate and symmetrical — accepting an assertion of delivery from the only party who cannot verify it** — and neither half alone describes how the failure lasted two exchanges. | **APPLIED IMMEDIATELY, TO THIS BATCH, AGAINST OUR OWN INTEREST — `NOTIFICATION-UNCONFIRMED-01` IS THE INSTANCE.** We can build a notification path; **we cannot confirm one.** The temptation is to write *"a failing scheduled run notifies the operator"* in `CLAUDE.md` and be done — **an asserted delivery, by the only party that cannot see the inbox.** So it is filed **OPEN**, the claim made is only that the mechanism exists, and **it closes when the operator reports receiving something.** Standing practice, mirroring the SHA rule already adopted: **for a contract, the confirmation is a SHA the counterparty can fetch; for a notification, it is the receiving side saying it arrived.** |

### Rulings taken (operator, at CP-3a merge)

| Ruling | The reasoning, in the operator's terms | What it changed |
| --- | --- | --- |
| **`push: [main]` STAYS.** | **A squash-merge is the moment `main` changes**, and *"PR was green"* and *"`main` is green"* are two different facts. **The gap between them is where the Saturday break lived.** Cheap, and it removes a class of surprise. | Nothing — kept as built. Every merge SHA now carries a green stamp of its own, which composes with `CONTRACT-NOT-PINNED-01`: a SHA a counterparty can fetch is now also a SHA the gates were observed green at. |
| **THE FLOOR ASSERTS `>=`, NOT EXACTLY.** | **Exact matching reddens every legitimate test-adding PR until somebody edits a number — which trains people to edit the number, and A FLOOR THAT GETS EDITED ROUTINELY IS NOT A FLOOR.** `>=` catches the regression, which is the thing being defended. | **Implemented and re-verified.** Below the floor fails; above it **passes with a loud note** to bump the file, so the recorded figure cannot quietly go stale the way `CLAUDE.md`'s did. **THE TRADE, RECORDED AT THE OPERATOR'S INSTRUCTION: a suite that SHRINKS but still exceeds the recorded floor is INVISIBLE to this gate.** The skipped/todo refusal already covers the common shape of that — a spec disabled rather than deleted — but **a spec file genuinely deleted while others grow past it is not caught**, and saying so is the point of recording it. |
| **`NOTIFICATION-UNCONFIRMED-01` STAYS OPEN.** | Correctly filed against our own interest. **The operator reports when something actually arrives.** | Nothing — the finding stands OPEN, unchanged, and this row is not a substitute for closing it. |

### Constraints discharged, in writing

- **CI RUNS THE SAME GATES THE OPERATOR RUNS, and runs them by running the same
  command.** The workflow's only gate step is `npm run gates`. `scripts/gates.mjs`
  invokes `npm run build` literally, invokes the suite through the installed
  `vitest` bin (identical execution to `npx vitest run`; two reporters added so
  the run leaves a record to assert against), and **DERIVES the `test:gate`
  invocation from `package.json` rather than restating it** — a second copy of
  the command is a second thing that can drift (`CENSUS-MUST-DERIVE-01`). **No
  gate exists that CI can run and the operator cannot**; the only new capability
  is the assertion, and it runs in both places.
- **NO EXISTING GATE WEAKENED.** Two gate-adjacent changes, both strictly
  strengthening and both verified: `--passWithNoTests` removed from an unused
  script, and `test:gate` widened from one hardcoded filename to a glob (7/7
  before and after). **Nothing was relaxed to make CI pass**, because nothing
  failed: the three gates are green on Linux-equivalent conditions by probe
  before a line of YAML was written.
- **NEVER GREEN ON A SKIPPED RUN — four independent guards.** The build's
  `dist/` is **deleted before it runs** and `index.html` + at least one JS chunk
  are required after, so a zero-output build cannot pass on a stale artifact;
  the suite's JSON report must **exist** (no report = no evidence the run
  happened) and its counts must clear the floor; the gate suite's TAP summary
  must **parse** and its pass count clear the floor; and `scripts/gates.mjs` **fails by
  default** — every check appends to a failure list and the process exits 0 only
  at the very end, only if that list is empty, with a spawn error or a
  signal-killed child counted as a failure and never as a pass. **Skipped and
  todo tests are refused outright** — they inflate a count while proving nothing.
- **NO FIXTURE CHANGES. NO SCHEMA CHANGES. C9 NOT TOUCHED** — the pin stays at
  `f492b5c`, and per `CONTRACT-NOT-PINNED-01` a new SHA would be a new
  ratification. `docs/contracts/` is unmodified; `C9-required-fields.md` was
  rewritten to LF *in the working tree only* for the EOL probe and restored
  (`git status` clean before commit). **2B remains blocked on D-1 and
  D-COMP-BPOM.**
- **NO NEW TESTS, DELIBERATELY.** A test asserting the CI wiring would have
  moved the floor in the same PR that first asserts the floor. **Floor 2070/2070
  across 175 files, unchanged**; `npm run build` and `npm run test:gate` green;
  `npm run gates` green end to end **and green on Linux in CI on this PR** —
  the workflow validated by running against itself, not by inspection.
- **THREE MUTATIONS VERIFIED TO BITE, each against the assertion it defends:**
  floor above the actual → `REGRESSION: 2070 < 2071`, exit 1; floor below the
  actual → a **note**, not a failure (the ruling's semantics, proven, not
  assumed); the `CLAUDE.md` pointer removed → `floor provenance` fails while
  every other check stays green. **An assertion that has never been observed to
  fail is not a verified assertion.**
- **`DEPLOY-PAGES-01` re-confirmed in passing, with one addendum.** Pages reads
  `build_type: workflow` / `status: errored`, the URL 404s, and the last
  `pages-build-deployment` run was 2026-07-03. **The addendum: that workflow is
  still REGISTERED and carries 193 historical runs**, so `gh api .../workflows`
  answers *"1 workflow"* and the Actions tab is already red — **"this repository
  has run Actions" was true and misleading throughout, and is exactly what a
  future session would read as *CI exists*.** It does not; `gates.yml` is the
  first.

---

## CP-2 · C9 RATIFIED AT A SHA — the delta measured, and what a summary loses (refs @ `00aad61`)

**C9 IS RATIFIED BY SOMO AT `f492b5c` — all three paths, checked against the
BYTES rather than against our description of them.** That is the first
ratification in this project given against an artifact instead of a summary of
one, and the method they used to do it is recorded below because **it would have
returned the right answer for the wrong reason if run the obvious way.**

**REGISTER ONLY. C9's bytes are untouched and the pin does NOT move** — per
`CONTRACT-NOT-PINNED-01` a new SHA is a new ratification, and nothing below is
worth spending one. **Everything here that would otherwise amend the contract is
filed and rides the next amendment.** No schema, no rows, no master edit; **2B
still blocked on D-1 and D-COMP-BPOM.** Floor **2070/2070**, unchanged.

**`C9-SUMMARY-DELTA-01` (A-12) CLOSES, AND IT CLOSES NON-EMPTY.** The disposal
condition was stated in advance one issue ago: *empty ⇒ our summary was faithful
and their shape-ratification was sound; non-empty ⇒ both platforms learn what a
summary costs, field by field.* **It is non-empty. THE NUMBER IS NOT THE
FINDING — THE SHAPE IS.**

### Elevated to a CLASS (operator ruling, C9 ratification) — **the one with a number behind it**

| Class | The rule | Standing consequence |
| --- | --- | --- |
| **SUMMARY-LOSS-IS-DIRECTIONAL-01** *(class; **the measurement is SOMO's, the class is the family's fourth member**)* | **A SUMMARY PRESERVES WHAT A SENTENCE CAN HOLD AND DROPS WHAT ONLY A STRUCTURE CAN.** Measured against the artifact: **15 of 21 required fields — 71% — were never named in our prose.** **THE LOSS WAS NOT UNIFORM, and that is the whole finding.** It fell hardest on **NESTED BLOCKS** — `AdjudicationProvenance` collapsed **six fields into one phrase**, *including `routeToResolution`, the field SOMO themselves had asked for one issue earlier* — and on **WHOLE INTERFACES WITH NO NATURAL HOOK IN A NARRATIVE SENTENCE**, which is how `MaterialCodeSpace` and **the ENTIRE `MaterialRefJoinPolicy` layer vanished. That policy layer is where D-1's answer lands** (§2.3, §6.1): the one structure whose existence is the claim we make to procurement, and a sentence about grain tags has nowhere to put it. **Closed vocabularies: 2 of 13 members conveyed — ZERO of 3 verdicts, 3 confidences, 3 methods, 2 parties. AND THE TWO THAT SURVIVED ARE THE MECHANISM, NOT A DETAIL:** read off the module ourselves, since the artifact is ours, **they are exactly the two `MaterialGrain` members — the two the narrative was ABOUT.** A summary is a sequence of sentences; **a vocabulary member only survives if it is the SUBJECT of one.** `'substance'` and `'specification'` were the argument, so they carried; **`'PROBABLE'`, `'MASTER_DATA_MATCH'` and `'ADJUDICATED_UNRESOLVED'` have nothing to ride in on and no sentence would have missed them.** That is *why* the loss is directional and not merely large. **Invariants: 0 of 6** — including **`allowSimulatedEvidence` MUST be false** and **no `'CERTAIN'` without LIVE evidence**, the two that stop a demo joining invented data. | **THE RISK IS NOT THAT A SUMMARY IS SHORT. IT IS THAT IT IS SHORT IN A PREDICTABLE DIRECTION, AND THAT DIRECTION RUNS EXACTLY OPPOSITE TO WHERE CONTRACTS CARRY THEIR WEIGHT.** Prose keeps the headline and the argument; it drops **enumerations, nested structures, and invariants** — which is to say it drops the enforceable half and keeps the persuadable one. **File beside `COUNTERPARTY-RATIFYING-A-SUMMARY-01`, `STATED-LIMIT-DOES-NOT-DISCHARGE-01` and `CONTRACT-NOT-PINNED-01`: the first says a summary is not the contract, the second says naming that gap does not close it, the third says an unpinned contract cannot be ratified at all — and THIS ONE IS THE ONE WITH A NUMBER BEHIND IT.** Standing practice, unchanged in kind and now evidenced: **the DERIVED field list (`C9-required-fields.md`) ships with the document and the SHA ships with both; a prose summary is a covering note and is never the thing ratified.** |

### Filed in this batch

| Finding | What it is | Disposition |
| --- | --- | --- |
| **ANSWER-ABOUT-NOTHING-01** *(refs @ `00aad61` — **Direction B of the delta, and the cleanest demonstration either platform has produced**)* | **THE OPTIONAL SUBSTANCE-ROLLUP FIELD DOES NOT EXIST, AND SOMO RETURNED A VERDICT ON IT** — *"present for RM, absent for PM"*. **That answer was ABOUT NOTHING.** Verified in our own tree, since the artifact is ours: `SubstanceRef` is a **BARE TYPE ALIAS** (`export type SubstanceRef = string`, `materialMasterRef.types.ts:389`) — reserved, not landed — and `MaterialMasterEntry` (`sdc/types.ts`) carries exactly five fields (`materialCode`, `label`, `materialType`, `materialGroup`, `canonicalUom`); **`substanceRef` is not one of them.** **Both platforms spent real analysis on a field that is not there, and only reading the artifact surfaced it.** **The information was in the same document all along — see `LEDGER-UNCOMPOSED-01` below, which is the worse half of this finding and is filed separately because it is a different hazard.** | **THE CONSEQUENCE FOR US, STATED PLAINLY: OUR D-1 ESCALATION TO PROCUREMENT ASSERTS THE SUBSTANCE ROLLUP IS THE AXIS ON WHICH ANY ROW SOURCED FROM SOMO'S MASTER CAN BE WRITTEN AT ALL** (C9 §6.1a's closing paragraph, and `C9-GRAIN-MISMATCH-01`'s disposition above). **THAT PREMISE IS CURRENTLY FALSE.** The axis is reserved, not built. **D-1 NOW ALSO DECIDES WHETHER THE FIELD IS BUILT, NOT ONLY HOW IT IS USED** — a materially larger question than the one escalated, and procurement should have it in that form. **NOT amended into C9 here** (register-only; §6.1a and §2.4 are byte-frozen at the pin) — **it rides the next amendment, which is a new SHA and a new ratification.** **SECOND DIRECTION-B ITEM, same shape:** our first issue was summarised as carrying *"`spaceId` with a stated retirement condition"* — **it stated NO exit condition at all.** Verified against the first issue at `53eac3b`: the clause reads *"Each party owns more than one space **today**"* and stops; the retirement was **implied by one adverb and never written.** **And the artifact now says the OPPOSITE — `spaceId` is PERMANENT, not scaffolding** (§5.2a, A-1 then A-5). **A third-order note, ours, against ourselves: the phantom clause reached THIS REGISTER.** `C9-FALSE-SYMMETRY-01` (A-1) quotes the first issue as saying the field drops *"when both sides hold one space each"* — **that sentence is in neither the first-issue contract nor the first-issue types module.** **A-1's CORRECTION STANDS and is pinned and mutation-verified;** what was wrong is the **provenance of the quotation** — we amended the artifact against a sentence that existed only in prose, and got a better artifact by luck rather than by reading. |
| **LEDGER-UNCOMPOSED-01** *(refs @ `00aad61` — **the hazard `ANSWER-ABOUT-NOTHING-01` uncovered, filed on its own because it is WORSE than the thing that uncovered it; operator ruling at the #169 merge**)* | **THE CONTRADICTION WAS INTERNAL, IN ONE FILE, AND VISIBLE.** C9 **§7.4** states *"`substanceRef` is not on `MaterialMasterEntry`. RESERVED with a named swap-point; not built."* C9 **§6.1a** states that the substance rollup *"is the axis on which any row sourced from their master can be written at all."* **SAME DOCUMENT. One clause says the axis does not exist; the other rests a live escalation to procurement on it.** Neither platform composed them — **and the composition is not a clever cross-reference somebody might have thought of: §7 IS THE DIVERGENCE LEDGER, WRITTEN INTO THIS CONTRACT FOR EXACTLY THIS, after `CONTRACT-OFF-THE-FLOOR-01` found eleven doc-vs-code divergences and the ruling that a new contract may not start with a twelfth.** The ledger did its job perfectly — it declared the non-conformance, in advance, in the right place, unprompted — **and the declaration then sat inert while the body of the same document asserted the opposite.** | **A LEDGER OF SELF-DECLARED NON-CONFORMANCES ONLY WORKS IF SOMETHING COMPOSES IT AGAINST THE CLAIMS IN THE SAME DOCUMENT.** Otherwise it is **an honest artifact that absorbs the honesty and releases none of it**: writing §7.4 down felt like — and *was* — the disclosure working, which is precisely what stopped anyone checking §6.1a against it. **THIS IS WORSE THAN A MISSING FIELD.** A missing field is found by whoever reaches for it; **a claim contradicted by its own document's ledger is found by nobody, because both halves read as diligence.** Note the family it lands in: `GOVERNANCE-INSIDE-THE-GOVERNED-01` said a rule inside an artifact binds only readers of that artifact — **this is one step in from that, and less forgivable: the rule and the violation are inside the SAME artifact, and still nothing composed them.** **NOT FIXED HERE, and the shape of the fix is named rather than guessed at:** a §7 row asserts a **negative about our own tree**, and negatives are exactly what `CENSUS-MUST-DERIVE-01` says to derive — so the candidate is **a derived check that every §7 ledger row's subject is absent from the body's claims**, argued and costed in its own batch, not smuggled in beside a register. **What this batch does instead: files it, and states that D-1's escalation currently rests on the falsified half.** |
| **CITED-SHA-MUST-BE-REACHABLE-01** *(refs @ `00aad61` — **ours, found while verifying THEIR method; a NEAR MISS, not a defect that occurred**)* | **A SHA IS ONLY A CITATION WHILE SOMETHING STILL REACHES IT.** Our HEAD, at the moment SOMO ran their verification, was **`977ce25`** — and `977ce25` is **the pre-squash tip of `ci/cp-3a-gates`, NOT an ancestor of `main`.** That branch was deleted at merge (`Squash + delete branch`, per project policy): **`git ls-remote origin` today returns 12 heads and NONE of them reaches `977ce25`**; the only ref naming it in this clone is a **stale remote-tracking ref**. **The pin itself was never at risk — `f492b5c` is the squash-merge commit and sits on `main`** — but the SHA a counterparty would have written down had they cited *"our HEAD"* is one that no remote ref now reaches. | **REFINEMENT TO `CONTRACT-NOT-PINNED-01`, recorded so the citation rule is not read as *"any SHA will do"*: A CITABLE SHA IS ONE ON `main`.** A branch SHA is a version of the artifact and a perfectly good thing to read; **it is not a durable citation**, because the workflow that produces `main` also destroys it. **What is NOT claimed:** that `977ce25` is gone — GitHub may still serve an unreachable commit by full SHA for some time, and we do not assert either way; the claim is exactly that **no ref reaches it**, which is the property a citation needs. **Filed as a near miss on purpose:** the correct thing happened (they pinned to the merge commit) and it happened because they hashed against the pinned tree rather than against whatever HEAD was. |

### Recorded as shared canon — **SOMO's method, and it is better than the answer it produced**

| Canon | What happened | Standing consequence |
| --- | --- | --- |
| **VERIFY-AGAINST-THE-PIN-01** *(theirs; **the method half of `CONTRACT-NOT-PINNED-01`**)* | **THE METHOD HAS TO BE RIGHT EVEN WHEN THE ANSWER WOULD HAVE BEEN.** They content-hashed all three C9 paths **against the PINNED TREE at `f492b5c`** rather than diffing against our HEAD. **Confirmed on our side, by blob hash:** the contract, the types module and the derived field list are **byte-identical at `f492b5c`, at `977ce25` (the HEAD they saw) and at `00aad61`** — `f5c17be…`, `e6ddd94…`, `7718f9e…` at all three. **SO A DIFF AGAINST HEAD WOULD HAVE RETURNED "NO DIFFERENCE" AND PROVEN NOTHING:** it would have been evidence about HEAD, not about the version that was ratified, and it returns the same clean answer whether or not the pin is the thing they read. | **STANDING PRACTICE, BOTH DIRECTIONS: A RATIFICATION IS CHECKED AGAINST THE CITED SHA'S TREE, NEVER AGAINST WHATEVER THE COUNTERPARTY'S DEFAULT BRANCH HOLDS TODAY.** The two agree most of the time, which is exactly what makes the shortcut attractive and what makes the one disagreement unfindable. **Also recorded, and it is the part that makes the delta legible: OUR DERIVED FIELD LIST WAS FAITHFUL.** Their hash-level read confirms **5 interfaces, 22 fields, 21 required, 1 optional, 5 closed vocabularies**, identical names, flags and types, **no drift** — re-derived here from the module and matching field for field. **THE ARTIFACT WAS RIGHT; THE PROSE WAS NOT.** That separation is what turns `SUMMARY-LOSS-IS-DIRECTIONAL-01` into a measurement of summarisation rather than a measurement of our carelessness — **the generated artifact did its job, and the covering note is where the 71% went.** |

### SOMO's re-verified findings — **RECORDED AS `REPORTED-MEASURED` (§3.4, tier 2), NOT VERIFIED**

**`VERIFIED` is permanently unavailable across this boundary in either direction
(§7.8).** Everything in this table is their measurement of their own tree,
carried with how it was obtained.

| Reported | What they report | What it changes for us |
| --- | --- | --- |
| **GRAIN MISMATCH HOLDS — and is now PRECISELY LOCATED** | **Of 61 RM rows, 6 carry a grade or concentration token; 55 are BARE SUBSTANCE NAMES** that can never truthfully be tagged `'specification'` against C9's own definition (§2.1: same substance *and* everything else that makes it orderable). **PM is worse: capacity is documented BRIMFUL, diverging from nominal on every row checked** — 50→55, 40→44, 200→220 — **with no neck-finish, resin or colour column at all.** | **THEIR NUMBERS MATCH OUR §6.1a FIGURES NUMBER-FOR-NUMBER** — 1 grade token + 5 concentrations = the 6, now placed inside a 61-row RM population, and the 12 structured-capacity packaging rows now carry the brimful caveat. **The finding is unchanged in kind and much sharper in use: most of their master is writable ONLY at `'substance'` grain, and the PM half is not reliably writable at either** — a brimful capacity is not the item's nominal size, so a specification claim keyed on it would be **precise and wrong**. **Still no schema change implied**, and the register does not make one. |
| **OF 21 REQUIRED FIELDS, EXACTLY ONE IS SOURCED FROM THEIR BOM** | The other 20 are **ours, or authored at adjudication time.** Their earlier prose-based read had assumed C9 demanded fields from their master; **it mostly does not.** | **RECORD IT, BECAUSE IT CHANGES WHAT THEIR SIDE OF THE WORK ACTUALLY IS.** The build in front of them is **an adjudication surface, not a master-data extension** — one join column out of their BOM and twenty fields that come into existence when a human rules. **That is a smaller data ask and a larger process ask than either platform had been assuming**, and it is the second time in this arc that reading the artifact made a task *different* rather than *bigger*. |
| **ADJUDICATION FIELDS ABSENT — AND THEY ARE NOT ASKING FOR RELIEF** | Their master carries no confidence and no adjudication provenance. **They do not propose that C9 relax.** | **C9 KEEPING THEM REQUIRED ON EVERY ROW, WHOEVER WRITES IT, IS CORRECT — and it is now confirmed by the party it costs.** Consistent with A-8: those fields are **a shape they can build, not data they hold**, and the absence is defensible precisely because **no adjudication has occurred.** No change; recorded because a requirement the burdened party declines to contest is a requirement that has been tested. |
| **OPACITY CLEAN AT A-7's WIDENED SCOPE** | All three populations — 88 material, 17 bulk, 17 finished-good — **zero hits.** Prefixes remain authoring convention only. | **NO CHANGE, AND THE ASYMMETRY STANDS: the clause is PREVENTATIVE on their side and CORRECTIVE on ours.** `inferBpom` still parses `AI-`/`FR-` and still fails open (§7.3), blocked on D-COMP-BPOM. **We remain the only party in breach of a clause we proposed**, now against a second clean sweep. |
| **THEIR DECLARED LIMIT, per the canon we both adopted** | **Their prose-side census was HAND-COUNTED**, so **71% is SOUND IN DIRECTION AND APPROXIMATE IN PRECISION.** | **RECORDED AS THEY STATED IT — they would rather say so than quote it cleanly**, which is `CENSUS-DERIVE-BILATERAL-01` and `STATED-LIMIT-DOES-NOT-DISCHARGE-01` working in the same sentence: **the method is disclosed, and disclosing it does not discharge it.** Booked as an open question below rather than treated as closed by the disclosure. **The class above does not depend on the precision** — 15-of-21 could be 14 or 16 and the *direction* of the loss, which is the finding, is unaffected. |

### Booked OPEN — four questions, **NOT answered in this batch**

| # | The question | Why it is not answered here |
| --- | --- | --- |
| **Q-1 · LIVENESS VOCABULARY** | `MaterialCodeSpace.liveness` and `AdjudicationProvenance.evidenceLiveness` import **`Tier` from OUR registry** (`services/liveness/registry`); **SOMO speak `ContractState`.** **C7 established a ONE-LINE VOCABULARY MAP as the whole translation; C9 states none.** **Which tier does `seed-illustrative` map to, and is that map theirs to propose?** | **Answering it edits C9** — a mapping is a clause, and the pin does not move in a register batch. Also genuinely open on the merits: the map's author matters, since **whoever writes it decides whether their seed data can ever back a `'CERTAIN'` row.** |
| **Q-2 · R-6, THE GRAIN OF THEIR CANONICAL-S/4 CROSSWALK** | **Unanswerable from either tree alone: their side does not exist yet**, and **when it does, its grain must be DECLARED or the composition is unsound.** A crosswalk composed with a crosswalk of unstated grain yields an assertion of unknown grain, which C9 has no way to write. | Unchanged and correctly open since A-6 narrowed it. **It is one question with `C9-GRAIN-MISMATCH-01`'s route** (*'SOMO check-1 report, at a declared grain'*) — the report landed, **the declared grain of the S/4 crosswalk did not, because the crosswalk does not exist.** |
| **Q-3 · `EA`/`PCS` NORMALIZATION (§7.7)** | **Dormant for us** — every strong substance pair to date is `KG` — and **likelier to arise from their BOM first**, now that PM is known to be the half with structured capacity and no reliable discriminators. | Filed as an early-warning re-pointing, not a resolution: **§7.7 says this schema does not resolve it, and this batch does not either.** What changed is **who is likely to hit it first.** |
| **Q-4 · THEIR HAND-COUNTED CENSUS** | The 71% is hand-counted **by their own declaration.** A derived count would settle the precision. | **Theirs to run or decline**, on their side of the boundary. **Recorded OPEN rather than closed by the disclosure** — that is exactly `STATED-LIMIT-DOES-NOT-DISCHARGE-01`, and it would be the fastest way to have this batch's own class come apart if it went unrecorded. |

### Constraints discharged, in writing

- **REGISTER ONLY. C9's BYTES ARE UNTOUCHED AND THE PIN STAYS `f492b5c`.**
  Verified by blob hash, not by inspection: the contract, the types module and
  the derived field list are byte-identical at `f492b5c` and at this branch's
  base `00aad61`. **`docs/contracts/` is unmodified.** Every item above that
  would amend C9 — the substance-rollup premise, **the §7.4 / §6.1a composition
  failure**, the liveness map, §6.1a's D-1 sentence — is **filed here and
  explicitly deferred to the next amendment, WHEN ONE IS WARRANTED AND NOT
  BEFORE**, because a new SHA is a new ratification and this batch has nothing
  worth one.
- **ONE FILE CHANGED: this register.** No schema, no rows, no master edit.
  `MATERIAL_MASTER` untouched; **2B remains blocked on D-1 and D-COMP-BPOM**, and
  nothing here pre-empts either.
- **NOTHING RECORDED AS `VERIFIED` THAT WE DID NOT READ OURSELVES.** SOMO's five
  re-verified items are `REPORTED-MEASURED` at the tier and marked as such
  (§3.4). What IS ours and verified in this tree: the byte-identity across three
  SHAs, `SubstanceRef` as a bare alias, `substanceRef`'s absence from
  `MaterialMasterEntry`, the first issue's silence on `spaceId` retirement, the
  A-1 quotation's absence from the first issue, and `977ce25`'s unreachability
  from any remote ref.
- **NO TESTS ADDED, DELIBERATELY.** There is nothing here to pin: the register
  is not a checked artifact, and the two items that WOULD pin — the liveness map
  and the substance field — are the ones being deferred. **Floor 2070/2070
  across 175 files, unchanged**; `npm run gates` green end to end, and **CI runs
  the same command on this PR** (CP-3a) — a Linux-only failure would itself be a
  finding.

---

## CP-3b · §7 COMPOSITION CHECK — **investigated, MEASURED, and REFUSED in the form asked for** (refs @ `5a40ca4`)

**THE CHECK THE DISPATCH ASKED FOR CANNOT BE BUILT HONESTLY TODAY, AND THE
REASON IS NOT DIFFICULTY — IT IS THAT THE FAILURE IT EXISTS FOR IS INVISIBLE TO
IT.** `LEDGER-UNCOMPOSED-01` asked for a guard that a §7 ledger row's subject is
not simultaneously claimed as true in the body. It was **built as a probe, run
against C9 at `f492b5c`, and measured before anything was written for keeps.**

> **28 FIRINGS. 0 TRUE POSITIVES. AND THE ONE DEFECT IT WAS BUILT FOR IS NOT
> AMONG THE 28.**

**Why it misses:** §6.1a asserts the substance rollup *"is the axis on which any
row sourced from their master can be written at all"* **without ever naming
`substanceRef`** — it cites `(§2.4)` in prose. §7.4's only machine-readable
subject is the symbol. **The contradicting sentence and the ledger row share no
token a checker can join on.** The check would have run green through the exact
failure that commissioned it.

**Why the 28 are all false:** the symbol-bearing rows are 7.3 (`inferBpom`, 6
body hits), 7.4 (`substanceRef` / `MaterialMasterEntry`, 4) and 7.6 / 7.10
(`routeToResolution`, 9 each). **Every one of those sites is a correct
disclosure** — §2.4 declaring the rollup RESERVED, §3.1 declaring our own
opacity breach, §4.2 defining the required field. **A ledger row's subject MUST
appear in the body; that is what a contract is.** Firing on the appearance is
firing on the contract working.

**This is our own argument against the CLAUDE.md floor regex
(`FLOOR-IN-PROSE-01`, CP-3a), and it binds harder here.** A 28-to-0 check gets
muted inside one batch, and a muted check is worse than none — it converts an
open question into a closed one at no cost to anybody.

### The structural finding underneath — **why the check had nothing to bind to**

| # | The census | Measured on C9 @ `f492b5c` |
| --- | --- | --- |
| **1** | **§7 rows** | **12** (7.1–7.12) |
| **2** | **Rows carrying a machine-readable subject** (a backticked symbol in the *"what we ship"* cell) | **5** — 7.3, 7.4, 7.6, 7.7, 7.10 |
| **3** | **Rows carrying NO derivable subject at all** | **7** — counts (7.5), section references (7.6's invariants), a tree we cannot read (7.8), and four records of *retracted* claims (7.9–7.12) |
| **4** | **§7 rows citing the section they contradict** | **8 of 12 — and NOT 7.4**, the row at the centre of the failure. **§7.4 does not cite §2.4, and §2.4 does not cite §7.4. The link is absent in both directions.** |

### `LEDGER-SUBJECT-UNTYPED-01` — **the class, and it is the answer to the dispatch's hard question**

| Class | The mechanism | Why it is not a drafting nit |
| --- | --- | --- |
| **`LEDGER-SUBJECT-UNTYPED-01`** | **A LEDGER ROW WRITTEN FOR A READER AND A LEDGER ROW WRITTEN FOR A CHECK ARE DIFFERENT ARTIFACTS, AND ONLY ONE OF THEM WAS EVER AUTHORED.** §7's rows are prose pairs — *what the contract states* against *what we ship*. They read perfectly and **join on nothing.** | **§7 IS NOT ONE KIND OF ROW.** The measurement above found **three**: live divergences (7.1–7.7), a permanently unverifiable statement (7.8), and **retraction records** (7.9–7.12). The intended check is coherent only over the first kind. **Applied to a retraction record it INVERTS: §7.11 says *"SOMO builds against this"* is false, and §8 point 3 STILL CARRIES that sentence — deliberately, annotated in place.** A checker sees a §7 subject asserted in the body and fires. **It would be correct by the letter and wrong about the document.** |

### The C9 amendment this needs — **PROPOSED, NOT MADE** (a new SHA is a new ratification)

**Do not read the items below as landed. C9's bytes are untouched at `f492b5c`,
and the one `docs/contracts/` change in this batch is the README, not C9.**

| # | The amendment | What it buys |
| --- | --- | --- |
| **P-1** | **Every §7 row carries a typed `kind`** — `DIVERGENCE` · `UNVERIFIABLE` · `RETRACTION`. | **The precondition for any check at all.** Without it the intended rule inverts on a third of the ledger. This is the cheap half and it is worth doing on its own. |
| **P-2** | **Every `DIVERGENCE` row carries a machine-readable `subject:`** — the code symbol(s) **and** the § that defines the thing. §7.4's would be `substanceRef`, `MaterialMasterEntry`, `§2.4`. | Gives the check something to join on. **Costs the author one field per row; the alternative is inferring a subject from prose, and a subject stated for the reader is not a subject stated for the check.** |
| **P-3** | **A required back-link: every § named as a `DIVERGENCE` subject carries `(§7.N)` at its head.** | **This is the one that would have caught it.** With `§2.4` back-linked, an author writing §6.1a's *"not an additive convenience"* while citing `(§2.4)` lands on a section headed *"⚠️ NOT BUILT — §7.4"*. **Measured cost on today's document: §2.4 has exactly 2 citation sites, both legitimate disclosure points.** |
| **P-4 — COSTED AND NOT RECOMMENDED** | Extend P-3 to *all* §7 subject sections, not just the not-built ones. | **Measured: ~47 citation sites across §3.1 / §4.1 / §4.2 / §8 / §5.3 / §6.3 / §6.4.** That is the muted-check outcome by arithmetic. **Recorded so it is not re-proposed as an obvious improvement.** |

**Sequencing, stated because it is the part that is easy to get backwards:
P-1…P-3 ride the next C9 amendment WHEN ONE IS WARRANTED ON ITS OWN MERITS —
they do not warrant one.** The composition check is built *after* they land, and
**not one line of it is written on speculation that they will.**

### BUILT INSTEAD — the half that IS derivable, with a zero false-positive rate by construction

`src/services/contracts/__tests__/ledgerTruth.test.ts` — **10 tests, and it does
not check prose.** The distinction the C9 pin already drew (*"prose is not
mechanically checkable and pretending otherwise would be its own dishonesty"*)
is held to here.

| What it asserts | Direction it guards |
| --- | --- |
| **The code-anchored ledger rows are STILL TRUE** — C9 §7.1 (importer set), §7.2 (`MaterialRefJoinPolicy` has no consumer), §7.3 (`inferBpom` still parses the prefix), §7.4 (`substanceRef` ∉ `MaterialMasterEntry`), plus **C7-FIND-03** (`shortfall` ∉ `PrIntakeLine`) and **C8-FIND-03** (the VOID `lock → firm` mapping still in code). Each reads the CLAIM from the contract, then measures the TREE. | **BOTH.** Delete the disclosure and it fails; **repair the divergence and it also fails** — leaving a contract declaring a defect it no longer has. **That second direction is the C7/C8 eleven-divergence shape running backwards, and nothing in this repo caught it before.** |
| **§7 is well-formed** — rows uniquely numbered, contiguous from 7.1, both cells populated. | A deleted row is a deleted disclosure. A one-celled row is a claim without its counter-claim. |
| **A summary of the ledger names every row in it** (`docs/contracts/README.md`). | The finding below. |

### `SUMMARY-LOSS-IS-DIRECTIONAL-01` — **REPRODUCING ITSELF ONE LAYER IN, INSIDE THE ARTIFACT** (operator ruling, CP-3b)

**Filed as the existing class recurring, NOT as a separate README defect.** That
framing is the finding: the class was measured at the boundary to SOMO — 15 of
21 required fields lost, and lost *in a direction* — and **it is filed here
because the same mechanism ran again with no boundary to cross.**

> **`docs/contracts/README.md` summarised C9 §7 as *"(7.1–7.8) … eight
> non-conformances"* WHILE §7 CARRIED TWELVE.**

**Four rows added by amendment never reached the index**, and the index is what a
reader meets first. **THE FOUR DROPPED WERE 7.9, 7.10, 7.11, 7.12 — and THREE of
them run the direction ADD-3 said the ledger was not being read in.**

> **THE SUMMARY KEPT EVERY ROW THAT UNDERSTATED OUR IMPLEMENTATION AND LOST THE
> ONES WHERE WE HAD OVERSTATED A DEFECT IN SOMO'S** — plus the mislaid required
> field, the ratification against prose, and **the contract never delivered at
> all.**

**Nobody selected for that**, and that is exactly why it belongs to this class
rather than beside it. The parent class found the loss falling on enumerations,
nested structures and invariants — **the enforceable half — while the headline
and the argument carried.** Here the loss falls on the rows recording *our own
overstatements*, while the rows recording our understatements carried. **Same
shape: prose keeps what a sentence was already about and silently drops what
arrived later.** The eight that stayed are simply the eight that were there when
the sentence was written. **A summary does not decay by being edited badly — it
decays by not being edited at all.**

**AND THE TWO LAYERS COMPOSE, WHICH IS THE PART THAT COSTS SOMETHING.** A-9
established that SOMO ratified against our prose. **That prose was drawn from a
package index which had ALREADY LOST A THIRD OF THE LEDGER** — so the summary
delta they measured was taken against a source that was itself lossy in the same
direction. **`COUNTERPARTY-RATIFYING-A-SUMMARY-01` was filed about the boundary
to SOMO; `STATED-LIMIT-DOES-NOT-DISCHARGE-01` and `CONTRACT-NOT-PINNED-01` were
too. THIS INSTANCE NEVER CROSSED A BOUNDARY — it is A-9 committed by the ledger's
own table of contents, one file from the artifact, inside our own repository.**

**The README is CORRECTED here and the assertion is on the floor**, so the next
amendment cannot add a §7 row without the index moving. **C9 itself is
untouched** — the README is the package index, not a contract, and not under the
pin.

### Mutation-verified — **the checks were confirmed to FAIL, not assumed to work**

`npm run gates` green is not evidence a new check does anything (CP-3a's own
argument). Seven mutations, each applied to the working tree, run, and reverted:

| # | Mutation | Result |
| --- | --- | --- |
| **M1** | `substanceRef` lands on `MaterialMasterEntry` | **DETECTED** (1 failed) |
| **M2** | `inferBpom` stops parsing the prefix | **DETECTED** (1 failed) |
| **M3** | `shortfall` lands on `PrIntakeLine` | **DETECTED** (1 failed) |
| **M4** | a real consumer imports the inert module | **DETECTED** (2 failed) |
| **M5** | C9 §7 row 7.12 is deleted | **DETECTED** (2 failed) |
| **M6** | the README summary drops row 7.11 again | **DETECTED** (1 failed) |
| **M7** | the VOID `lock → firm` mapping is cleaned up | **DETECTED** (1 failed) |

### `DESCRIBE-DONT-RENDER-01`, live — **the check reported ITSELF as the defect**

**On its first run the two *"nothing consumes this"* sweeps failed, and the extra
consumer they found was the checking file.** It names `materialMasterRef.types`
and `MaterialRefJoinPolicy` **in order to grep for them**, and thereby became a
site. **The class says a description can recreate its subject; here the
description was a grep and the subject was the grep's own text.**

**Fixed by excluding one path, and the narrowness is deliberate:** excluding all
`*.test.ts` would blind the sweep to a real consumer introduced in a test, which
is **exactly where inert registry data acquires its first fake consumer.**

### What this batch does NOT do — stated, not implied

- **IT DOES NOT CATCH `LEDGER-UNCOMPOSED-01`.** The §7.4 / §6.1a contradiction
  would still ship today. **That is the honest outcome and the finding stands
  either way** — a named, costed, unbuilt guard beats a noisy one.
- **It does not touch C9.** Verified by blob hash, not by inspection: the
  contract and the types module are byte-identical at `f492b5c` and on this
  branch, **including across the M5 mutation probe, which was reverted and
  re-hashed.**
- **It does not generalise to "§7" across the package, and the dispatch's premise
  that it would is CORRECTED: C7 §7 and C8 §7 are DECISION REGISTERS, not
  divergence ledgers.** Their non-conformances are `C7-FIND-0N` / `C8-FIND-0N`
  rows mixed in among RATIFIED decisions and open co-design items. **A check
  treating every C7 §7 row as a declared non-conformance would fire on
  `C7-SCOPE`, `C7-INTAKE` and `C7-PROV` immediately.** What generalised was the
  **code-truth** half, row by row, applied to the two C7/C8 rows that carry a
  derivable subject — **not the section number.**
- **It does not resolve D-1 or D-COMP-BPOM. 2B remains blocked on both.**

### Constraints discharged, in writing

- **C9'S BYTES ARE UNTOUCHED AND THE PIN STAYS `f492b5c`.** Blob hash
  `f5c17be9…` before, during and after the mutation probe. **`docs/contracts/`
  carries exactly one change and it is the README**, which is the package index,
  not a contract, and not under the pin.
- **NO SCHEMA, NO ROWS, NO MASTER EDIT.** `MATERIAL_MASTER` untouched.
- **THE FALSE-POSITIVE RATE OF WHAT SHIPPED IS ZERO ON TODAY'S TREE, BY
  CONSTRUCTION** — every assertion is a boolean about a file, derived, not a
  prose match against a claim. **The one prose-adjacent assertion is the README
  row-id enumeration, and it is DERIVED from C9 §7 rather than hand-listed** —
  `CENSUS-MUST-DERIVE-01` applied to the checker's own population, because
  hand-listing the ids would have reproduced the exact defect being caught.
- **FLOOR BUMPED AS THE GATE ASKED: 2070/175 → 2080/176.** `npm run gates` green
  end to end; **CI runs the same command on this PR** (CP-3a), and a Linux-only
  failure would itself be a finding.

---

## CP-2 · 2B-0 — THE LANE SET DERIVES (refs @ `a009db4`)

The batch that had to come before any adoption. **No adoption, no master edit,
no C9 byte.** Its whole deliverable is that the census which 2B plans against
can now see the tree it is reporting on.

**STATE THE HEADLINE RESULT FIRST, so the widening is not misread as a
regression report: over the whole non-test tree — THREE spaces, 44 codes, 12
bearing modules — BOTH DIRECTIONAL INVARIANTS HOLD.** `ONE CODE, ONE MEANING`
and `ONE MEANING, ONE CODE` survived a scope increase from four hand-picked
modules to every module in the repository. **B2a's property is intact. Every
finding below is a SCOPE, VOCABULARY or REGULATORY-MECHANISM defect — not one
of them is an identity collision.**

| Finding | What it is | Disposition |
| --- | --- | --- |
| **DERIVED-OVER-A-CHOSEN-SCOPE-01** *(refs @ `a009db4` — **the class, and it is `CENSUS-MUST-DERIVE-01` turned on its author one level up**)* | **DERIVING A POPULATION FROM A HAND-PICKED SET OF SOURCES IS STILL A SHAPE ASSUMPTION, ONE LEVEL UP.** `materialIdentity.test.ts` built `REFS` by importing FOUR fixture modules **by name**. The population was derived; the LANE SET was a literal — and an import list reads like a fact rather than a claim, which is exactly why nobody re-read it. **What it cost, concretely: `mockRfqs.ts` was not in the list, so the file's own assertion that the B2a-freed codes were "no longer squatted on by the document lane" PASSED WHILE `RM-EMUL-3310` SAT AT `mockRfqs.ts:113`.** The general form: **AN ASSERTION THAT A THING IS ABSENT IS ONLY AS STRONG AS THE SCOPE IT SEARCHED.** **The second half is worse than the miss and is the part worth carrying:** `materialIds` is a bare `string[]` and carries NO meaning, so a code reached only through it **cannot contradict anything** — both directional checks were STRUCTURALLY BLIND to that lane. `RM-EMUL-3310` had not left the document lane; it had left the part of the lane capable of disagreeing. **A clean census is not evidence of a clean tree if the dirty half is mute by construction.** | **FIXED IN THIS BATCH.** The lane set now DERIVES: a glob over every non-test module in `src/`, walked generically for the code-bearing field names the TYPE SYSTEM declares. **And deliberately NOT a glob of `src/data/` — A GLOB OF ONE DIRECTORY IS THE SAME HAND-PICK ONE DIRECTORY UP**, which is how the third space stayed invisible. Backed by a RAW-SOURCE guard that does not depend on the walk reaching anything: every literal written under a code-bearing key in any non-test `.ts` **or `.tsx`** source must appear in the derived population. **The ONE exclusion — test modules — is named and argued in the file header rather than left in a regex** (spoof codes like `RM-SPOOF` / `PK-UITEST-1` exist to be unresolvable; folding them in would make every census report a tree that does not exist). Mutation-verified: narrowing the lane set back to the B2a four fails **11** tests; planting a code literal in a `.tsx` the walk never imports fails the raw-source guard. |
| **MAT-SPACE-UNDECLARED-01** *(refs @ `a009db4` — **the headline finding of the batch**)* | **A THIRD PARAGON CODE SPACE EXISTS AND NO DECLARATION NAMES IT — SO IT IS COVERED BY NONE OF THE RULES WRITTEN ABOUT THE TWO THAT WERE.** Nine codes in two modules: `MAT-30110` · `MAT-40220` · `MAT-55022` · `MAT-55031` · `MAT-77014` · `MAT-88201` · `MAT-88207` (`services/data/mock/fixtures/supplierShipments.ts`) and `MAT-10234` · `MAT-20500` (`services/channel/outboundFixtures.ts`). It is **not** in `C8-MASTER-DECL`, which declared `src/data/mock*.ts` as THE non-master space; **not** in `MOCK-RETIREMENT-01`'s blast radius, which is scoped to the same glob; **not** in C9 §5, which builds the whole `spaceId` argument on Paragon holding exactly **TWO** spaces; and — until this batch — **not** in the pin. `MOCK_ASNS` there seeds `asnStore`, so these codes reach a rendered surface. **THE CONSEQUENCE FOR 2B, STATED PLAINLY: 30 IS THE DOCUMENT LANE'S ANSWER, NOT THE TREE'S. THE TREE'S MASTER-ABSENT POPULATION IS 39 (30 + 9).** | **FILED — a DECLARATION is owed before anything else touches it, and that is `2B-1`'s third question.** Retired, adopted, or named as a legitimate third space — each answer changes something different (`MOCK-RETIREMENT-01`'s scope, 2B's input list, C9 §5's per-party count and the `MaterialCodeSpace` seed). **NOT ANSWERED HERE**, per the dispatch. Pinned in `materialIdentity.test.ts` by MODULE, never by prefix — `materialCode` is contractually opaque, so membership of a space is decided by which file declares the code, and the shared `MAT-` prefix is authoring convention, not the test. |
| **BPOM-OFF-BY-SPACE-01** *(refs @ `a009db4` — **LIVE, NOT LATENT; strictly worse than what [[INFERBPOM-REGULATORY-01]] filed**)* | **EVERY CODE IN THE UNDECLARED SPACE SILENTLY ESCAPES THE BPOM LOT CHECK TODAY, AND THE WIZARD RENDERS IT.** `MOCK_ASNS` seeds `asnStore`, which feeds `GRInspectionWizard.buildDraftFromAsn` (`:150-165`), which sets `bpomRequired: inferBpom(li.materialCode)` — and `inferBpom` (`:129-131`) fires on `AI-` / `FR-` only. **Not one of the nine fires.** The pair that makes it impossible to argue with: **`MAT-88201` "Fragrance concentrate – Rose Oud" → `bpomRequired: false`; `FR-WARD-4440` "Wardah EDP Parfum Concentrate — Rose & Oud" → `true`. Two fragrance concentrates, opposite regulatory treatment, decided entirely by WHICH FIXTURE SPACE THE CODE WAS AUTHORED IN.** `INFERBPOM-REGULATORY-01`'s disposition predicted that a code-space **CHANGE** would switch a compliance check off. **No change is required. It is already off across a whole live vocabulary.** THE SHARPENED RULE: **A PREFIX RULE DOES NOT FAIL OPEN ON UNKNOWN PREFIXES ONLY. IT FAILS OPEN ON ENTIRE VOCABULARIES.** | **FILED AT FULL WEIGHT; `INFERBPOM-REGULATORY-01` AMENDED IN PLACE to point here.** Pinned three ways in `materialIdentity.test.ts`: the firing set over the derived population (now 16 — `AI-CENT-6900` joins, not because anything changed but because the RFQ lane was invisible before), the assertion that no code in the undeclared space fires, and the two-concentrate pair rendered as the wizard renders it. **Its FIX is `D-COMP-BPOM` (ruled PROVISIONAL below) and it lands at `2B-4`, not here — see the `2B-4` GATE.** Sibling, already named inside `INFERBPOM-REGULATORY-01` and NOT re-opened: `inferHalal` reads the DESCRIPTION for the substring `halal`, so those same nine lines are `halalRequired: false` too. **⚠️ AMENDED IN PLACE at 2B-5a — THE BLAST RADIUS IS SEVEN, NOT NINE OR TWELVE**; the census population and the regulatory exposure are different quantities and were conflated. **⚠️ AMENDED IN PLACE AGAIN at 2B-5b-i — AND THIS ONE CHANGES THE KIND OF CLAIM, NOT THE COUNT. The `false` is ASSERTED AGAINST IN-TREE EVIDENCE, NOT MERELY IN ITS ABSENCE.** `doc-201` (`supplierDocuments.ts`) is a **BPOM Notification — TD.02.02.66.10.23.0311**, category `BPOM Regulatory`, issued by BPOM, for `sup-005`, carrying `linkedTo: 'PO-2025-00131'` — the PO whose ASN (`ASN-2025-00302`) carries **`MAT-40220`**, for which `inferBpom` returns **`false`**. **THE TREE ALREADY STATES THAT A BPOM REGISTRATION GOVERNS THIS SUPPLY.** As originally filed this finding was a SILENCE — a prefix rule failing open where nothing contradicted it; it is now a CONTRADICTION, which is materially worse. `doc-202` (*REACH Compliance / Safety Data Sheet — Emulgade*, BASF SE Regulatory Affairs, `linkedTo: 'All emulsifier grades'`) independently corroborates BASF ownership and a REACH-not-halal frame — the same datum that separates `MAT-40220` from `RM-EMUL-9410` *(Glyceryl Stearate SE (Halal Emulsifier))*. Pinned in `asnRefIntegrity.test.ts`. **Radius unchanged at SEVEN. Does not close until 2B-4b.** **⚠️ AMENDED IN PLACE A THIRD TIME at 2B-5b-ii — THE SPACE THIS FINDING IS NAMED AFTER NO LONGER EXISTS, AND THE FINDING DOES.** The seven were authored as canonical master rows and the ASN lines retired onto them, so `UNDECLARED_SPACE` is empty and nothing escapes *by space* any more. **A FINDING NAMED AFTER ITS CAUSE OUTLIVES ITS CAUSE.** Four of the seven received lines still get `false` from the prefix rule — two correctly (packaging) and two not — and the two are now WORSE than before: `RM-EMUL-9440` has `bpomApplicable: 'APPLICABLE'` on `doc-201` while the wizard says no (**the first answerable row in the tree on which the two mechanisms disagree at all**), and `RM-PSTN-7150` records `UNDETERMINED` against the prefix rule's confident negative. The blast radius is still **SEVEN**. **2B-4b closes this, at seven, as a CONTRADICTION rather than a silence.** |
| **MG-COLLISION-21-01** *(refs @ `a009db4` — **`ONE CODE, ONE MEANING` failing on the GROUP vocabulary, with one meaning in RATIFIED SEED DATA**)* | **`MG-21` MEANS TWO DIFFERENT THINGS.** The master assigns `PK-CAPF-8820` *Flip-Top Cap 24mm* to `materialGroup: 'MG-21'`, commented `// closures` (`sdc/fixtures.ts:93-99`). The should-cost taxonomy declares **`MG-21 · Glass packaging`**, sole member `sc-glass-bottle`, `materialClass: 'PM_GLASS'` (`commodityBaskets.ts:317`) — and puts caps/closures in **`MG-20`** (`sc-pp-cap`, `PM_PLASTIC`). So a plastic flip-top cap sits in the glass group, inside the ratified master. The two vocabularies agree on `MG-02` / `MG-03` / `MG-04` / `MG-20`; `MG-21` is the sole divergence, which is what makes it look like a typo rather than a reconciliation nobody performed. | **FILED — and it BLOCKS EVERY PACKAGING ADOPTION IN `2B-2` AND `2B-3`.** Adopting a packaging code means assigning a `materialGroup`; while `MG-21` carries two meanings, every such assignment encodes the contradiction again — seven packaging codes await adoption, so the cost of ruling late is seven wrong rows rather than one. **CLOSED AT 2B-1 (R-1): the TAXONOMY moved and the master stood — glass took `MG-25`, and `sc-pp-cap` moved to `MG-21` so the collision could not simply run in the other direction. The structural cause is filed separately as [[MG-REGISTRY-ABSENT-01]] and fixed by `sdc/materialGroups.ts`.** The original question was: If the master's does, the taxonomy moves; if the taxonomy's does, **a ratified seed row is edited**, which is not a refactor. Pinned in `materialIdentity.test.ts` so the block is visible from a test run and not only from a document — including an assertion that none of the seven is in the master yet. |
| **INSTANCE-DATA-IN-A-TYPE-LABEL-01** *(refs @ `a009db4` — **its own class, not a note on two codes**)* | **A LOT AND A BATCH ARE INSTANCES, NOT TYPES.** Two document-lane meanings carry instance identifiers inside what a `2B-2` adoption would make a master label: `FR-WARD-4410` → *"Wardah Signature Floral Compound **— Lot A**"*, `FR-MKOV-5520` → *"Make Over Oud & Amber Accord **— Batch Q2-2025**"*. **Adopting these faithfully would make a batch number part of a material identity — permanently, in the master, on a code meant to outlive every batch of it.** It also sharpens under the PROVISIONAL `D-IDENTITY-GRAIN = SPECIFICATION`: a spec-grain key must name a purchasable item, and a lot is not a specification of one. **THE CAVEAT TO THE SPLIT'S OWN FRAMING, carried verbatim from the 2B pre-work report: "7a ratifies a stated meaning" is true for 23 of 25 — FOR THESE TWO, RATIFYING THE STATED MEANING IS EXACTLY THE WRONG ACT, AND ADOPTING IT FAITHFULLY IS HOW THE DEFECT BECOMES PERMANENT.** | **FILED — `2B-2` must TRIM before it adopts.** Both labels pinned, plus a DERIVED guard so the class cannot grow silently: any new fixture description carrying a lot/batch marker turns the pin red and names it. **Mutation-verified, and the probe taught something the finding did not say: trimming `— Lot A` in ONE lane fails BOTH the instance-data pin AND `ONE CODE, ONE MEANING` — because the other lanes still carry the untrimmed string. The trim must be COMPLETE, not partial, and the pin already enforces that.** **⚠️ CLOSED AT 2B-2.** Both labels trimmed at every site — seven across four modules — in one edit, master and lane together. The pin was **inverted rather than deleted**, and widened: it now asserts that **no stated meaning anywhere in the tree** carries a lot or batch marker, including the undeclared space. Re-verified from the failure side (**M3**): restoring `— Lot A` in ONE lane turns SIX tests red, the top-level identity property among them. Where the trimmed fact is operationally real, see [[INSTANCE-DATA-HAS-NO-HOME-01]]. |
| **RECODE-ORPHANS-CLASSIFICATION-01** *(refs @ `a009db4`)* | **RE-CODING A MATERIAL MOVES ITS IDENTITY BUT NOT THE MAPS KEYED ON IT.** `commodityMaterialMap.ts:29-30` states *"The material codes on the left are the fixture RFQ materialIds"*. Measured against the RFQ lane today it is false: **`'PK-PETB-8810': 'sc-pet-bottle'` is a DEAD KEY** — B2a re-coded RFQ-2026-002 to `PK-PETB-8803`, and `PK-PETB-8810` is no longer any RFQ's materialId. The meaning that moved (`PK-PETB-8803`) has **no classification** and resolves `silent: 'unmapped'`; `PK-PETB-8825` and `PK-ALCP-2441` likewise. **Nothing failed, and that is the interesting part: the only consumer was already silent for an unrelated reason** — `PRICED-SURFACE-MASKED-01`'s PCS unit gate returns `unit-mismatch` for both the old key and the new one, so a capability regression hid behind a masking gate. | **FILED — NOT FIXED, and deliberately.** Re-keying the map is the thing `commodityMaterialMap.ts:16-22` already books to B2b, because seven of its eleven keys are master-absent and re-keying now would **settle 2B by implication**. The dead key is the same act on a code that is master-PRESENT, so it could be fixed here — it is not, because the header sentence and the key set should be corrected together by the batch that owns the map. **Whichever batch re-keys it must also true up that header sentence, which is `SEAM-DOC-DRIFT-01`'s shape inside a fixture header, introduced by the batch that was cleaning up identity.** **⚠️ AMENDED IN PLACE AT 2B-3 — ITS STATED BLOCKER IS GONE AND IT IS STILL NOT FIXED.** The header books the re-key to B2b because *"SEVEN of the eleven keys"* are master-absent; **after 2B-3 that number is ZERO.** The re-key is unblocked and deliberately still not done — the dead key and the false header sentence belong to the batch that owns the map, together. **Recorded because a blocker that quietly expires is how a booked item becomes a forgotten one.** |
| **SCHEDULED-RUN-UNOBSERVED-01** *(refs @ `a009db4`; **sibling to [[NOTIFICATION-UNCONFIRMED-01]] — same shape, same rule: a mechanism is not proven by its own configuration**)* | **THE DAILY HALF OF CP-3a HAS NEVER BEEN OBSERVED TO FIRE.** `.github/workflows/gates.yml:28-32` declares `cron: '17 0 * * *'`. The workflow landed 2026-08-04 05:03 UTC, so the first scheduled opportunity was 2026-08-05 00:17 UTC. Checked at 01:00 UTC on 2026-08-05: the workflow's entire run history is **10 runs, every one of them `push` or `pull_request`. Zero `schedule`-event runs.** **Queueing delay and an unarmed schedule are INDISTINGUISHABLE from here** — GitHub delays cron under load and does not report that it did — so nothing is diagnosed and nothing is fixed. **The half of CP-3a that catches a clock-decay break with no commit involved is the half that has never run.** | **OPEN — closes ONLY when a run with `event: schedule` actually appears on `main`.** Not closable by re-reading the YAML: **a schedule that is correctly configured and a schedule that never fires produce identical evidence at the source**, which is precisely why `NOTIFICATION-UNCONFIRMED-01` refuses to accept a configured mechanism as a working one. Recorded against our own interest — CP-3a presented the daily run as a delivered capability, and it is delivered as *configuration*, not yet as *observed behaviour*. **✅ CLOSED 2026-08-05 @ `46883c4` — A `schedule`-EVENT RUN FIRED ON `main` AT `2026-08-05T03:33:18Z`, conclusion `success`.** The cron is armed and the daily half of CP-3a is now delivered as OBSERVED BEHAVIOUR, not configuration. It fired **~3h16m after its declared `17 0 * * *` slot** — ordinary GitHub cron drift under load, and exactly the delay that made the 01:00 and 02:32 UTC checks read as absence.

**WHY THE PHRASING OF THE ORIGINAL ROW WAS WORTH THE CARE, recorded because it is the transferable part:** this was filed as **A MISSED WINDOW, NOT AN UNARMED CRON**, and it explicitly refused to diagnose — *"queueing delay and an unarmed schedule are INDISTINGUISHABLE from here"*. So when the answer arrived three hours late, **NOTHING HAD TO BE UNDONE**: no fix was shipped against a defect that did not exist, no YAML was 'corrected', and the close is a single observation appended to a row that was already true. **A finding written to the limit of what was observed survives its own resolution; one written to the most likely explanation would have had to be retracted.** |

### The two PROVISIONAL rulings — **NOT RATIFIED, and nobody may read them as ratified**

Recorded as **PROVISIONAL — STRATEGIST-RULED ON BEST PRACTICE, PENDING TEAM
RATIFICATION**, each with the condition that disposes of it. **Neither is a C9
amendment yet: both are PROPOSED for the next SHA and neither has been made.**

| Ruling | What was ruled, and on what grounds | Disposal condition |
| --- | --- | --- |
| **P-1 · `D-IDENTITY-GRAIN` = SPECIFICATION** *(PROVISIONAL)* | **A master entry names a PURCHASABLE ITEM, not a chemical.** Grounds recorded so the ruling can be argued with rather than merely obeyed: it matches S/4 `MATNR` semantics; it matches **what the tree already does** — PO lines, GR inspection lines and forecast confirmations are spec-grain today, and the fixture convention already distinguishes grades by code (`AI-NIAC-6601` USP 99.5% vs `AI-NIAC-6605` Feed Grade 98%); and SDC invariant #4 fans material×period totals that become **UNALLOCATABLE** if two bottle sizes merge into one record. **Substance is the ROLLUP, not the key.** **CONSEQUENCE: `substanceRef` GETS BUILT — an OPTIONAL rollup field, NEVER a key.** It is how SOMO's 55 bare-substance rows become writable at all, and how should-cost keeps a substance to price against without the master merging records to get one. **This closes [[ANSWER-ABOUT-NOTHING-01]]'s open half** and discharges C9 **§7.4**. Two consequences that follow immediately and are NOT separately ruled: the master's silence on grade for `AI-NIAC-6601` and `RM-EMUL-3320` becomes a **defect** rather than an open question, and [[INSTANCE-DATA-IN-A-TYPE-LABEL-01]] sharpens from a style objection into a grain violation. | **Ratified or overturned by the team.** Until then no batch may cite it as settled canon. It is a **C9 amendment → NEXT SHA, NEW RATIFICATION** — proposed, not made. |
| **P-2 · `D-COMP-BPOM` = MASTER FIELD, FAILS CLOSED** *(PROVISIONAL)* | **MECHANISM:** a per-entry `bpomApplicable` on `MaterialMasterEntry`, populated at seed, **NEVER derived from a code prefix** — `materialCode` is contractually opaque and a prefix rule contradicts our own ratified contract. **BEHAVIOUR:** an unknown or unresolvable material **REFUSES THE INSPECTION BY NAME**. It does not silently skip the check. **A REGULATORY GATE THAT FAILS OPEN IS WORSE THAN ONE THAT FAILS LOUD.** **THE `UNDETERMINED` VALUE — APPROVED, and the distinction is recorded here so it is not re-litigated: this is NOT the quarantine `D-OPS-MASTERMISS` rejected. QUARANTINE STORES AN UNTRUSTWORTHY FACT AND LETS WORK PROCEED ON IT; `UNDETERMINED` STORES AN EXPLICIT ABSENCE OF DETERMINATION AND REFUSES IDENTICALLY TO AN UNKNOWN CODE. NOTHING DOWNSTREAM MAY TREAT IT AS A DETERMINATION.** Forcing a required boolean instead would make someone **invent a regulatory determination thirty times**, which is the fabrication this platform refuses everywhere else. **SEED CONTENT — proposed from material CLASS, every value provisional, no chemistry invented:** actives (MG-04) `true`; fragrance (MG-05) `true`; botanical extracts (MG-06) `true` (**new — no code fires today**); packaging (VERP, MG-20…24) `false`; **the 13 bulk oleochemical / glycol RM codes `UNDETERMINED` — the class that will NOT be guessed.** Today's prefix rule says `false` for all of them and several are pharmacopeial-grade (`Glycerin USP`, `Propylene Glycol USP`); setting `true` is a regulatory expansion with no standing behind it, and setting `false` preserves an unratified prefix convention in better clothes — the exact substitution `INFERBPOM-REGULATORY-01` warns against. **Compliance's call.** | **Ratified or overturned by the team; the SEED CONTENT additionally needs compliance.** The mechanism may be AUTHORED early; **its behaviour may NOT be wired early — see the `2B-4` GATE.** C9 amendment → NEXT SHA. |

### ⚠️ THE `2B-4` GATE — **written here because this is where the next dispatch will read it**

**`D-COMP-BPOM`'s BEHAVIOUR HALF CANNOT SHIP UNTIL `2B-2` AND `2B-3` HAVE
LANDED AND THE `MAT-*` SPACE IS RULED.** The constraint, and it is arithmetic
rather than judgement:

- `bpomApplicable` lives on `MaterialMasterEntry`. Under **fails-closed**, a
  material the master cannot resolve **REFUSES THE INSPECTION**.
- `GRInspectionWizard` reads `mockShipments` (**30 master-absent codes**) and
  `asnStore` ← `MOCK_ASNS` (**9 more**).
- **Therefore: wire fail-closed today and the GR inspection wizard refuses on
  essentially every line it can be given.**

**Mechanism may be authored early. Behaviour may not be wired early.** The gate
lifts when the master resolves what the wizard is handed — which is exactly what
`2B-2` (25 codes, four of five document lanes) and `2B-3` (5 RFQ-only codes)
deliver, plus a ruling on the nine. **This constraint is stated in no contract
and would otherwise have been discovered by shipping it.**

### The ratified split, recorded so the order is not re-derived

**`2B-0` → `2B-1` (ruling) → `2B-2` → `2B-3` → `2B-4`.** Accepted as proposed,
both amendments (operator ruling, 2B pre-work).

- **`2B-0`** *(this batch)* — the lane set derives. No adoption.
- **`2B-1`** — the vocabulary adjudication. **Three questions, and they go to the
  operator AFTER this merges; they are NOT answered here:** (1) `MG-21` — closures
  or glass? (2) the five upstream oleochemical **feedstocks** (`RM-COCO-8200`,
  `RM-LAURIC-7200`, `RM-MYRST-7310`, `RM-PALM-7100`, `RM-STEAR-7300`) have **no
  fitting group** — MG-01 is surfactants, MG-02 emollients, MG-03 humectants, and
  several of these appear in the same taxonomy as ROOT BENCHMARKS rather than as
  modelled materials; forcing them into MG-02 would encode a category error in
  five rows. (3) the `MAT-*` space — retired, adopted, or declared?
- **`2B-2`** — adopt the 25 codes whose meaning the lane already states.
  **The capability boundary is the primary argument: it makes FOUR OF FIVE
  document lanes 100 % master-resolvable** (Inventory, PO, GR, Shipments), so
  `SDC_MATERIAL_KNOWN` stops refusing and `requireUom` stops throwing across every
  transacting surface. Blocked on `2B-1` for packaging groups; must TRIM per
  [[INSTANCE-DATA-IN-A-TYPE-LABEL-01]] before adopting two of them.
- **`2B-3`** — adopt the 5 RFQ-only codes, where a meaning must be **AUTHORED**,
  not ratified. Clears the sourcing lane. Per-code procurement decision.
  `PK-PETB-8825` remains genuinely un-adoptable until someone rules on identity
  by declared ownership — a parent RFQ title is not a meaning on a code.
- **`2B-4`** — `D-COMP-BPOM` mechanism + seed, and `substanceRef`. **LAST AND
  GATED**, per the `2B-4` GATE above.
- **If the split is ever merged, `2B-3` folds into `2B-2` and never the reverse**
  — `2B-2` is the one that must not be held hostage.

### The C9 NEXT-SHA queue — six items, PROPOSED, **not made**

**C9 is PINNED at `f492b5c` and its bytes are untouched by this batch.** All six
ride ONE next SHA and ONE new ratification. Nothing below is an amendment yet.

| # | Item | Lands in |
| --- | --- | --- |
| **P-1** | `D-IDENTITY-GRAIN = SPECIFICATION`; `substanceRef` built as an OPTIONAL rollup, never a key. Closes [[ANSWER-ABOUT-NOTHING-01]]'s open half; discharges **§7.4**. | §2.4 / §7.4 |
| **P-2** | `D-COMP-BPOM` = master field, fails closed, `UNDETERMINED` admitted. Discharges **§7.3** once `inferBpom` retires. | §3 / §7.3 |
| **P-3** | The §7.4 / §6.1a composition failure, carried forward from CP-3b. | §7 |
| **D-2** | §6.4 states the document lane names **"34 distinct material codes"**. A derived measurement says **33**. **NOT CORRECTABLE IN PLACE — the number is inside ratified, pinned bytes**, so it is filed as a §7 ledger row for the next SHA rather than edited. | §7 ledger row |
| **NEW-1** | **§5's per-party space count is factually wrong for Paragon: THREE spaces, not two** ([[MAT-SPACE-UNDECLARED-01]]). Note this **STRENGTHENS** the `spaceId`-is-permanent argument rather than weakening it — a party that cannot enumerate its own spaces is not a party about to collapse them to one. **DECLARED AT 2B-1 (R-3) as `paragon.asn_chase_lane`, 9 codes, booked for retirement — so the §5 amendment now has a NAME to carry rather than a description.** | §5 |
| **NEW-2** | §7.5 states *"the master holds 5 of the 35 codes that transact"*. That counts the document lane only; the tree's figure is **5 of 44**. | §7.5 |

### Constraints discharged, in writing

- **NO ADOPTION, NO MASTER EDIT.** `MATERIAL_MASTER` is byte-identical to
  `a009db4`. **No fixture file is touched by this batch at all** — the diff is one
  test file, this register, and the floor.
- **C9'S BYTES ARE UNTOUCHED AND THE PIN STAYS `f492b5c`.** All three pinned paths
  verified blob-identical before and after. Every C9 correction this batch found
  is QUEUED for the next SHA, not applied.
- **MUTATION-VERIFIED — the checks were confirmed to FAIL, not assumed to work.**
  Seven probes, seven DETECTED: narrowing the lane set back to the B2a four (**11
  tests red**); a code literal planted in a `.tsx` the walk never imports (the
  raw-source guard); a duplicated meaning (**both** directions red); adopting a
  `MAT-*` code into the master; trimming the `— Lot A` marker; flipping the
  master's `MG-21` to `MG-20`; adopting a packaging code before `2B-1` (**6 tests
  red**).
- **`2B-1`'s THREE QUESTIONS ARE NOT ANSWERED HERE**, per the dispatch. They are
  recorded above so the next dispatch inherits them stated, not re-derived.

---

## CP-2 · 2B-1 — THE VOCABULARY ADJUDICATION (refs @ `fe25a7b`)

A ruling batch. **No code adoption — the 30 stay master-absent. No C9 byte.**
**And no edit to `sdc/fixtures.ts`: R-1 as ruled required none**, which is
recorded as a checked assertion rather than a claim (`materialGroups.test.ts`).

### R-1 · `MG-21` — THE TAXONOMY MOVED, NOT THE MASTER

**Ruled and built.** `MG-21` means **Closures** everywhere. `sc-glass-bottle`
moved to a new **`MG-25 · Glass packaging`**. Reasoning on record, both halves
operator-stated: **(a) the master is the DECLARED OWNER of material identity and
material group is part of identity — declared ownership decides, the same rule
that settled every code collision in B2a; (b) the taxonomy's `MG-21` had ONE
member while the master's is assigned to a real adopted code, so this is one
edit against one member rather than a change to RATIFIED SEED DATA.**

**THE CHECK THAT WAS ASKED FOR — MERGE OR STAY SPLIT: STAY SPLIT.** The
argument, and it turns on an axis clash rather than a preference:

- `MG-20 / 22 / 23 / 24` classify packaging by **SUBSTRATE** — and by form, since
  `MG-20` is rigid plastic and `MG-24` flexible plastic. They map one-to-one onto
  the taxonomy's own `materialClass` (`PM_PLASTIC` / `PM_METAL` / `PM_PAPER`).
- `MG-21 = Closures` classifies by **FUNCTION**. That is a genuinely different
  axis in the same number series.
- **Merging is not available.** Folding closures into `MG-20` (rigid *plastic*)
  breaks on the first metal one — and the tree already holds two:
  **`PK-ALCP-2441` *"Aluminium Cap 24/410"*** (2B-3 queue) and **`MAT-77014`
  *"Aluminium closure 24/410"*** (the third space). Under a pure substrate axis
  they land in `MG-22`, away from the plastic closures they are sourced
  alongside. **This decides real rows in 2B-3, not a hypothetical.**
- Split it is — **but the split had to be COMPLETED, and the ruling as written
  named only the glass move.** Moving glass alone leaves `sc-pp-cap`
  (*"PP caps/closures"*) at `MG-20` while the master's flip-top cap sits at
  `MG-21`: **`MG-COLLISION-21-01` running in the other direction, reduced but not
  closed.** *"`MG-21` means closures everywhere"* dictates the second move, so
  `sc-pp-cap` moved with it. **Flagged rather than assumed** — it is the one step
  beyond the literal words of R-1.

**`sc-airless-pump` was NOT moved, and that is an open question, not a ruling —
see [[MG-AIRLESS-AXIS-01]].**

### R-2 · THE FIVE OLEOCHEMICAL FEEDSTOCKS — `MG-10`

**Ruled and built. Exact label: `Oleochemical feedstocks (upstream of the
formulation grain)`.** Declared, **member-less until 2B-2** — deliberately: a
group declared ahead of its members is a decision recorded; a group invented
during an adoption is a decision smuggled.

Reasoning on record: **SOMO gave us the grain boundary from their side — their
master is a COSMETIC FORMULATION BOM holding what ENTERS a formula, and these sit
UPSTREAM of that grain.** Corroborated independently inside our own tree: several
of them already appear in the taxonomy as **ROOT BENCHMARKS**
(`fatty_acid_coconut`, `cpo`, `myristic_acid`) — inputs *to* should-cost models
rather than modelled materials. **Two independent readings agreeing is the
evidence**, and forcing a feedstock into *"emollients / oils / esters"* would
encode a category error in five rows to make a batch tidy.

**⚠️ ONE DEPARTURE FROM THE LITERAL DISPATCH, FLAGGED: the number is `MG-10`,
not the next free integer `MG-07`.** The tens digit already encodes KIND —
`MG-0x` formulation ingredients, `MG-2x` packaging, with `07..19` an existing
gap. `MG-07` would place a feedstock as the **seventh sort of ingredient**, one
number along, when R-2's whole point is that it is one **level** along. `MG-10`
opens the band the numbering already implied and is pinned as a band invariant.
**If strict next-free is preferred, it is a one-line change** — say so and it
moves.

### R-3 · THE `MAT-*` SPACE — DECLARED, THEN BOOKED FOR RETIREMENT

| Declaration | Value |
| --- | --- |
| **Space id** | **`paragon.asn_chase_lane`** |
| **Name** | The ASN + chase lane |
| **Party** | Paragon |
| **Modules** | `src/services/data/mock/fixtures/supplierShipments.ts` (`MOCK_ASNS` → `asnStore`) · `src/services/channel/outboundFixtures.ts` (`OUTBOUND_REQUEST_SEED`) |
| **Population** | 9 codes — `MAT-10234` · `MAT-20500` · `MAT-30110` · `MAT-40220` · `MAT-55022` · `MAT-55031` · `MAT-77014` · `MAT-88201` · `MAT-88207` |
| **Liveness** | SIMULATED, like both other Paragon spaces |
| **Status** | **REAL THIRD SPACE — declared. BOOKED FOR RETIREMENT, not retired.** |

**Why declare rather than absorb or delete.** Declaring is free and immediately
true; **retiring is a batch with a LIVE REGULATORY BLAST RADIUS**
([[BPOM-OFF-BY-SPACE-01]]) — all nine codes escape the BPOM lot check today, so a
code-space change there is a compliance change until proven otherwise. Exactly
the reasoning that keeps [[MOCK-RETIREMENT-01]] investigation-first, now
inherited explicitly rather than by assumption. **With a name and a row, every
rule written about the other two spaces can be extended to it deliberately:
`C8-MASTER-DECL` (non-master status), `MOCK-RETIREMENT-01` (retire, do not
reconcile — a crosswalk between two spaces WE control carries no information),
and `C8-ADOPTION` (any match with the document lane would be an ADOPTION, not a
DISCOVERY — `MAT-77014` *"Aluminium closure 24/410"* and `PK-ALCP-2441`
*"Aluminium Cap 24/410"* are the live temptation, and the answer is no).**

**IT STRENGTHENS C9'S `spaceId` ARGUMENT AND THAT GOES IN THE QUEUE.** We told
SOMO the field is permanent because neither party can collapse to one space. **We
now have a third of our own — discovered, not designed.** A party that cannot
enumerate its own spaces is not a party about to reduce them to one. → §5.

### The two reports the dispatch asked for

| Question | Answer |
| --- | --- |
| **`MG-20` / `MG-21` — merge or stay split?** | **STAY SPLIT**, and the split had to be completed (`sc-pp-cap` moved too). Full argument above: the two groups sit on different axes, and merging breaks on the aluminium closures already in the tree. |
| **`RM-EMUL-9430` (Polysorbate 80) — `MG-01` or `MG-02`?** | **`MG-02`, and it is NOT genuinely ambiguous — no ruling needed.** Three converging grounds. **(1) Function:** `MG-01` is *"Surfactants / **cleansing actives** (lauric-oleochemical core)"* and its four members are SLES / SLS / CAPB / decyl glucoside — cleansers, every basket built on `fatty_alcohol_c12_14` or `fatty_acid_coconut`. Polysorbate 80 is an emulsifier and solubiliser, not a cleanser, and is oleic-derived rather than lauric. **(2) Chemistry:** it is an ethoxylated sorbitan **ester**, and `MG-02` is literally *"emollients / oils / **esters**"*. **(3) Precedent in the tree:** emulsifiers already live at `MG-02` — the ratified master puts `RM-EMUL-3320` Cetearyl Alcohol there, the taxonomy puts `sc-cetearyl` there, and `RM-EMUL-9410` Glyceryl Stearate SE is the same functional class. **The honest caveat, since it is why the question felt open: `MG-02` fits by chemistry, not by function — there is NO EMULSIFIER GROUP in the vocabulary at all**, even though three of the master's five codes are emulsifier-adjacent and the document lane uses an `RM-EMUL-` authoring convention. That gap is real and is filed below; it does not change the answer for this code, and `MG-02` is where the tree already puts its emulsifiers. |

### Filed in this batch

| Finding | What it is | Disposition |
| --- | --- | --- |
| **MG-REGISTRY-ABSENT-01** *(refs @ `fe25a7b` — **the structural cause under `MG-COLLISION-21-01`, and duller than the collision**)* | **THE MG VOCABULARY HAD NO DECLARATION SITE.** It existed only as string literals on materials and as prose in two files' section comments. **A vocabulary with no declaration site cannot disagree with itself out loud — there is nothing for a second definition to contradict.** That is why `MG-21` carried two meanings for as long as both files existed, and why the collision was found by a human reading two files side by side rather than by a failing test. **A collision that only a careful reader can find is not caught; it is survived.** | **FIXED — `src/services/sdc/materialGroups.ts` is the missing site**, the ONE place an `MG-xx` acquires a meaning, with both consumers pinned against it (`materialGroups.test.ts`). Lives in `sdc/` on R-1's own reasoning (a): the master owns identity, group is part of identity. Every group set in the pin is **DERIVED from the consumers, never hand-listed** — a hand-listed set would pass while a new fixture quietly introduced `MG-31` (mutation-verified: it does not). `groupLabel()` returns `null` for an undeclared group — the `uomOf` refusal shape, never a fallback label. |
| **MG-UNREAD-BY-ANYTHING-01** *(refs @ `fe25a7b`)* | **`materialGroup` IS READ BY NO CODE IN THE TREE.** The only references are the master's own five literals, the `MaterialMasterEntry` type declaration, and the taxonomy's `group` field — which `shouldCostSpread` never consults (it keys off `MATERIAL_BASKET_CLASSIFICATION` → `sc-*` id). **So the vocabulary is declarative-only today, and no behaviour test could ever have caught the collision.** It also means R-1's edit has **zero** behavioural consequence — which is a reason it was cheap now and expensive later. | **RECORDED, NOT "FIXED" — there is nothing to fix yet.** The point is the trajectory: **2B-2 takes stored `materialGroup` values from 5 to 30, all still read by nothing, so a wrong group would sit undetected indefinitely.** That is precisely why the vocabulary had to be settled BEFORE the adoptions rather than during them, and it is the strongest argument the `2B-1`-before-`2B-2` ordering has. **⚠️ AMENDED IN PLACE AT 2B-2 — THE PREDICTED EVENT HAPPENED, in the operator's own words, which are sharper than the sentence above: THIRTY ROWS OF A VALUE NOBODY VALIDATES WOULD HAVE CALCIFIED SILENTLY.** They did not, and what stopped it is not this batch — it is the ordering and the registry it built. Every one of the 30 stored group values is checked against a declaration site, and `materialType` is now **derived from the group's axis**, which makes `materialGroup` load-bearing on a second field for the first time. **It is still read by no PRODUCT code.** |
| **MG-AIRLESS-AXIS-01** *(refs @ `fe25a7b` — **an OPEN QUESTION, deliberately not answered**)* | **`sc-airless-pump` ("Airless pump systems, multi-component") has no clean home under R-1.** A dispensing pump is arguably a **closure** (`MG-21`, the functional group R-1 just created) and arguably a **multi-component rigid-plastic assembly** (`MG-20`); its own basket carries polypropylene AND spring steel, so it is not purely either. It is the first case where R-1's functional axis and the substrate axis both have a claim. | **LEFT AT `MG-20`, AND SAID SO IN THE FIXTURE.** The status quo is not an answer — **it is the absence of one, recorded so the next reader does not mistake silence for a ruling.** Not folded into R-1: R-1 ruled on glass and on what `MG-21` means, and extending it to a genuinely two-sided case would be picking rather than applying. **Operator's, whenever a batch next needs the answer** — nothing is blocked on it, because the pump is a taxonomy basket and not a code awaiting adoption. |
| **MG-NO-EMULSIFIER-GROUP-01** *(refs @ `fe25a7b` — **surfaced by the `RM-EMUL-9430` question, and it is the reason that question felt open**)* | **THE VOCABULARY HAS NO EMULSIFIER GROUP**, though emulsifiers are a first-class procurement category here: `RM-EMUL-3320` (master, `MG-02`), `RM-EMUL-9410`, `RM-EMUL-9430`, and the document lane's whole `RM-EMUL-` authoring convention. They are currently classified by CHEMISTRY (esters → `MG-02`) rather than by function, which works for each of them individually and states nothing about the category. | **FILED, NOT ACTED ON.** It does not change `RM-EMUL-9430`'s answer — `MG-02` is where the tree already puts its emulsifiers, and consistency with the ratified master outranks a tidier taxonomy. **Raising it now, before 2B-2 assigns 30 groups, rather than after** — but a second new group inside a ruling batch that was scoped to three questions would be exactly the scope creep this arc keeps refusing. Whoever wants it should want it on its own evidence. **⚠️ AMENDED IN PLACE AT 2B-3 — A SECOND ROW NOW LEANS ON IT.** `RM-HUMEC-3405` (Propylene Glycol USP) was authored into `MG-03`, against three RFQs that all say `materialCategory: 'Emulsifiers'`. That is NOT a collision — `RFQCategory` is a six-value UI facet with no glycol member, so it gave a COERCED value, not a competing declaration (`RFQ-FACET-CANNOT-EXPRESS-THE-GROUP-01`). But it is the second time the missing emulsifier group has made an answered question look open. |

### Constraints discharged, in writing

- **NO ADOPTION. `MATERIAL_MASTER` IS BYTE-IDENTICAL TO `fe25a7b`** — asserted in
  the suite, not just claimed: `materialGroups.test.ts` pins `PK-CAPF-8820`'s
  group and label, and both `materialIdentity.test.ts` and the new suite assert
  that the five feedstocks and the seven packaging codes remain master-absent.
  **The 30 stay master-absent after this batch.**
- **R-1 REQUIRED NO EDIT TO `sdc/fixtures.ts`, so none was made.** The dispatch
  said to stop and say so if it did; it did not, because R-1 ruled the master
  stands and every group the master already carried was already correct.
  Mutation-verified from the other side: changing the master's closure group
  turns the suite red (**N6**).
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`.** All three paths verified
  blob-identical. R-3's consequence is QUEUED against §5, not applied.
- **MUTATION-VERIFIED — six probes, six DETECTED:** glass reverted to `MG-21`
  (**3 red**); `sc-pp-cap` reverted to `MG-20` (**2 red**); `MG-10` removed from
  the registry; the taxonomy pointed at an undeclared `MG-31` (**2 red**); the
  registry re-labelled `MG-21` as glass; the master's closure group changed
  (**2 red**).
- **2B-2 IS NEXT — the 25 adoptions.** Its packaging blocker is cleared; its
  `MG-10` group exists; its two instance-data labels
  ([[INSTANCE-DATA-IN-A-TYPE-LABEL-01]]) must be trimmed COMPLETELY or not at all.

---

## CP-2 · 2B-2 — THE 25 ADOPTIONS (refs @ `4ce8d2f`)

**The capability boundary.** `MATERIAL_MASTER` goes from 5 codes to 30. The
declared document lane's master-absent population falls **30 → 5**; the tree's
falls **39 → 14**. Four of the five document lanes — PO, GR, Inventory,
Shipments — are now **100% master-resolvable**; only the RFQ lane is not, and
every code left there is one that states no meaning at all (2B-3's population).

**What adoption IS, restated because the whole batch turns on it: RATIFYING A
MEANING THE LANE ALREADY STATES.** Every one of the 25 labels is the lane's own
`description` / `materialDescription` string and every `canonicalUom` is the
unit the lane's own quantity rows already carried — **measured, not chosen.**
Each of the 25 shows exactly ONE unit across every module that names it, **zero
collisions**; nothing needed a rounding call, so nothing got one. The pin
(`materialMasterAdoption.test.ts`) **re-derives both from the tree on every
run** rather than tabulating them, because a hand-written table of 25 rows is a
second copy of the master and the failure mode of a second copy is that it
drifts and agrees with nothing.

**Groups came from the 2B-1 registry, not from this batch.** `MG-04` actives (8)
· `MG-05` fragrance (6) · `MG-02` esters/emollients (2) · `MG-10` oleochemical
feedstocks (5) · `MG-20` rigid plastic (2) · `MG-23` paper & board (2).
`materialType` is **derived from the group's axis** rather than asserted per row
— packaging is `VERP`, everything that enters or feeds a formula is `ROH` — so a
row whose type and group disagree is a red test rather than a plausible-looking
entry nobody re-reads.

**`MG-21` and `MG-22` gained NO members**, and that is worth saying out loud:
R-1's substrate-vs-function split was argued over the aluminium closures, and
neither of them is here (`PK-ALCP-2441` is RFQ-mute, `MAT-77014` is the third
space). **R-1 decided 2B-3 rows, not 2B-2 rows.** The consequence of the ruling
is still ahead of it.

### The two exceptions — trimmed, completely

| code | the lane said | the master says |
| --- | --- | --- |
| `FR-WARD-4410` | Wardah Signature Floral Compound **— Lot A** | Wardah Signature Floral Compound |
| `FR-MKOV-5520` | Make Over Oud & Amber Accord **— Batch Q2-2025** | Make Over Oud & Amber Accord |

**The trim was applied to the lane in the SAME edit — seven sites across four
modules** (`FR-WARD-4410` at six, `FR-MKOV-5520` at one). Mutation-verified from
the failure side (**M3**): restoring `— Lot A` in ONE lane turns **six** tests
red, including the top-level `ONE CODE, ONE MEANING` property, because the
untrimmed string survives as a second meaning on the same code. **A partial trim
is not a smaller version of this change; it is a different and worse one.**

### New findings

| ID | Finding | Disposition |
| --- | --- | --- |
| **INSTANCE-DATA-HAS-NO-HOME-01** *(refs @ `4ce8d2f` — **and the answer is not hypothetical**)* | The dispatch asked where the trimmed instance data should live instead. **No record type in the DECLARED document lane carries a lot or batch field** — not `InspectionResult` (it has `bpomLotCheck`, which is a CHECK RESULT, not a lot identity), not `InventoryRecord`, not the shipment line, not the PO line. **But the right shape already exists one space over: `ASNLineItem.lotNumber` (`services/data/types.ts:395`), rendered at `SupplierShipments.tsx:479` and captured by the ASN wizard — and the space using it correctly is the UNDECLARED one.** `MAT-88201` carries `description: 'Fragrance concentrate – Rose Oud'` **and** `lotNumber: 'LOT-A4481'`: **type in the description, instance in its own field.** The document lane welded the two together because it had nowhere else to put one. **This is a sharper version of what `MAT-SPACE-UNDECLARED-01` already taught: undeclared is not the same as worse.** | **REPORTED, NOT BUILT** (the dispatch said report). The honest home is a `lotNumber` on the receipt / shipment / inventory line, modelled on `ASNLineItem`, and **authoring it is a document-lane schema change that belongs in its own batch.** Pinned executable so the gap is not prose: `materialIdentity.test.ts` asserts no lot field exists in those four modules, and goes **red** the day one lands, at which point the trimmed facts can be re-homed. **One of the two was never operationally real anyway:** "Batch Q2-2025" sat on ONE purchase-order line (`li-012a`, `confirmedQty: 0`) and nowhere else — **a PO is a forward order, and the batch it will be filled from does not exist when the PO is raised.** That marker was a copied string, not a fact, so trimming it discards nothing. `— Lot A` is the one with a genuine claim, at the GR / shipment / inventory sites. |
| **IDENTITY-GRAIN-ASYMMETRY-01** *(refs @ `4ce8d2f` — **created by the adoption, measured rather than listed**)* | Of the 28 codes the master and the document lane now share, 27 state a meaning and **exactly TWO disagree — both of them SDC-0 SEED entries, and in both THE DOCUMENT LANE IS MORE SPECIFIC THAN THE MASTER**: `AI-NIAC-6601` (master *"Niacinamide (Vitamin B3)"* vs lane *"Niacinamide USP Grade 99.5% (Vitamin B3)"*) and `RM-EMUL-3320` (*"Cetearyl Alcohol"* vs *"Cetearyl Alcohol — Vegetable Origin"*). **The asymmetry is the finding, not the two rows.** The adopted labels ratified stated grades — *"Feed Grade 98%"*, *"99.5% — BHA"*, *"High MW"* — so **the master now names a grade everywhere EXCEPT on the five codes it was seeded with.** The pair `AI-NIAC-6601` / `AI-NIAC-6605` makes it unmissable: two niacinamides, one distinguished by grade in its label and the other silent about it. Under the PROVISIONAL `D-IDENTITY-GRAIN = SPECIFICATION` that silence is a **defect**, not an open question. | **PINNED AND REPORTED, NOT CORRECTED.** Seed data is outside 2B-2's scope ("the 25 adoptions"), and amending a ratified master entry on the builder's own initiative is exactly the act this arc refuses. The pin is **derived** — it computes the disagreeing set rather than listing it — so if a later batch corrects the two, this goes red and the correction has to be deliberate. **Operator's: either confirm `D-IDENTITY-GRAIN = SPECIFICATION` and correct the two seed labels, or record that seed entries are grain-exempt.** Nothing is blocked on it. |
| **SHOULD-COST-DECOUPLED-FROM-MASTER-01** *(refs @ `4ce8d2f` — **a MEASURED NEGATIVE, and the dispatch asked for it by name**)* | The dispatch anticipated that "25 codes becoming resolvable will move should-cost silence reasons and possibly classifications". **It did not, and the reason is structural: the should-cost engine has NO coupling to the material master at all.** `shouldCostSpread.ts`, `shouldCost.ts` and `BuyerSourcing.tsx` reference neither `MATERIAL_MASTER` nor `isKnownMaterial` / `uomOf` / `labelOf`. Silence is decided solely by `MATERIAL_BASKET_CLASSIFICATION` (absent → `unmapped`, tail basket → `tail`), which is keyed on the **document lane** and is unchanged by this batch. **Every silence reason and every classification is byte-for-byte what it was before the adoption.** | **REPORTED AS A RESULT.** Recorded rather than dropped because *"we checked and nothing moved"* and *"we did not check"* are indistinguishable in a PR body that says nothing. It also sharpens the open item in `commodityMaterialMap.ts`: that file's header says seven of its eleven keys name codes the master does not contain, **and after 2B-2 only ONE does** (`RM-HUMEC-3405`, RFQ-mute → 2B-3). Re-keying the classification onto master codes is now nearly free — **still deliberately not done here**, since it would settle B2b by implication, but the blocker is almost gone. |
| **PARSER-MEMBERSHIP-WIDENED-01** *(refs @ `4ce8d2f` — **the one behavioural change a person can actually observe**)* | `knownMaterialCodes()` is the membership set the Comm Hub reply parser consults for its precedence rule — **a token that IS a material can never be read as a quantity** — and `BuyerChannelTriage.tsx:184` feeds it into every parse as `knownMaterials`. **Adoption grows that set from 5 to 30.** So 25 tokens that a supplier reply could previously have had classified as something else are now recognised as materials first. This is a *widening* of a correctness rule and the expected direction of travel, but it is a **behaviour change in a parser**, and it was not named in the dispatch's own list of consequences. | **REPORTED AND BROWSER-QA'd.** No code change: the widening is the point of the rule. Note the shape carefully — **the triage material DROPDOWN did not change**, because it is built from `ownCollaboratedMaterials(relationships, publications)`, which the master does not gate. Adoption widens what the parser RECOGNISES, not what a supplier is offered. The nine-of-twelve empty dropdowns recorded in the triage smoke pair are **unchanged and still legitimate** — that is a relationship/publication question, not a master one, and anyone reading "four lanes now resolve" as "the dropdowns fill up" will be wrong. |

### Findings amended in place

| ID | Amendment |
| --- | --- |
| **MASTER-STRADDLE-01** | **NARROWED, NOT CLOSED — 30 codes wide → 5.** Its executable pin (`masterMissRefusal.test.ts`) used `PK-PETB-8801` as the witness that "the SDC master and the document lane are DIFFERENT identity spaces". **2B-2 adopted the witness.** The assertion was rewritten rather than bumped, and the replacement witness is the code a receipt actually arrives carrying at runtime: `asnStore` is seeded from `MOCK_ASNS`, whose vocabulary is the `MAT-*` space, and the master resolves none of those nine. **The assertion survives its own witness being fixed** — which is what "narrowed, not closed" means in practice. |
| **ADOPTION-QUEUE-01** | **DISCHARGED for 25 of 30.** Its remaining population is the five RFQ-mute codes (`AI-CENT-6900`, `PK-ALCP-2441`, `PK-PETB-8803`, `PK-PETB-8825`, `RM-HUMEC-3405`) — and its character changed with its size: **the queue was a COVERAGE problem and what is left is an AUTHORING problem.** The 25 could be ratified because the lane stated a meaning; the 5 cannot, because `materialIds: string[]` states none. |
| **INSTANCE-DATA-IN-A-TYPE-LABEL-01** | **CLOSED.** Both labels trimmed at every site, in one edit, master and lane together. The pin was inverted rather than deleted — it now asserts the trimmed form and, crucially, that **no stated meaning ANYWHERE in the tree** carries a lot or batch marker (widened from the document lane to the whole population, including the undeclared space). |
| **MG-UNREAD-BY-ANYTHING-01** | **THE PREDICTED EVENT HAPPENED: stored `materialGroup` values went from 5 to 30, and they are still read by no code in the tree.** Recorded in the operator's own words, because they are sharper than the original row: **THIRTY ROWS OF A VALUE NOBODY VALIDATES WOULD HAVE CALCIFIED SILENTLY.** What stopped that is not this batch — it is the 2B-1-before-2B-2 ordering and the registry it built: every one of the 30 group values is now checked against a declaration site (`materialMasterAdoption.test.ts` asserts no master entry names an undeclared group; mutation-verified with `MG-77`), and `materialType` is derived from the group's axis, which makes the group **load-bearing on a second field** for the first time. It is still read by no PRODUCT code. |
| **INFERBPOM-REGULATORY-01 / BPOM-OFF-BY-SPACE-01** | **UNCHANGED BY THIS BATCH, asserted rather than assumed.** `inferBpom` reads a PREFIX; adoption writes the MASTER. Disjoint mechanisms, so 25 adoptions moved the firing set by **zero** — pinned explicitly (`2B-2 adopted 25 codes and moved the firing set by ZERO`). The live fail-open is still the `MAT-*` one. |

### Filed at 2B-2 — one observation each, neither diagnosed

| ID | Finding | Disposition |
| --- | --- | --- |
| **GATES-FLAKE-01** *(refs @ `46883c4` — **ONE data point, filed so a second has a first to pair with**)* | **A `npm run gates` run failed with `vitest — the suite exited 1` and `vitest — no JSON report was written — there is no evidence the suite ran at all`, and NAMED NO FAILING TEST.** Two immediate re-runs of the identical working tree were fully green at identical counts (2125/178/7), as was the CI run on PR #173. Local only; not reproduced. The gate script's own second assertion is what surfaced it — the run did not silently pass, it reported that it could not prove it had run. | **FILED, NOT DIAGNOSED — deliberately.** One occurrence, three plausible causes (a Windows file-handle race on `node_modules/.cache/gates/vitest.json`, a vitest worker crash, an OS-level interruption) and **no evidence that separates them.** Picking one would be inventing a mechanism to make a row feel finished, which is the failure mode this register exists to avoid. **The value of the row is that a SECOND occurrence now has a FIRST to pair with**, and two data points can carry a pattern that one cannot. If it recurs: capture the full `gates` stdout and check whether the cache file exists and is truncated. **Note what did NOT happen: the flake was loud.** A gate that had asserted only "the suite passed" would have had nothing to say here — CP-3a's "assert that it RAN" clause is what turned an invisible non-event into a reportable one. |

### The 2B-4 gate — restated, and now MEASURED rather than argued

`bpomApplicable` is **absent from all 30 master entries**, asserted in the suite
(mutation-verified, **M4**) rather than trusted — because the tempting version of
this batch adds the field as an inert column and calls it harmless. It is not
harmless, and 2B-2 sharpens exactly why:

> **The GR FIXTURE lane is now 100% master-resolvable. The GR RUNTIME INPUT is
> not.** The wizard is fed `asnStore`, seeded from `MOCK_ASNS` in the
> `paragon.asn_chase_lane` space — **nine codes the master still cannot name.**

So the capability headline and the gate are not in tension; they are about two
different populations, and conflating them is the mistake the gate exists to
prevent. **Mechanism may be authored early. Behaviour may not be wired early.**

### Post-merge browser QA (built bundle, EN + ID) — measured, including the null results

Run on the merged `main` bundle at `46883c4`, both languages, ~50 route loads.
**Console: 0 errors, 0 warnings, across the whole session.** No raw i18n keys on
any surface in either language.

- **THE SILENCE-REASON QUESTION, ANSWERED BY MEASUREMENT RATHER THAN BY ARGUMENT.**
  The pre-2B-2 fixtures were checked out, rebuilt, and the should-cost panel of
  **all 12 RFQs** captured; then the same for merged `main`. **ZERO silence-reason
  changes.** The reasons rendered — *"tail material (supplier-quoted only)"*,
  *"material not yet mapped to a basket"*, *"priced per unit, not by weight"* — are
  byte-identical before and after. Baseline validity was itself verified (the
  baseline bundle carries the untrimmed `— Lot A` label; the merged one does not).
  See [[SHOULD-COST-DECOUPLED-FROM-MASTER-01]] for why.
- **THE PARSER WIDENING IS VISIBLE AS A THREE-TIER CONFIDENCE SPLIT** — the clearest
  render of `PARSER-MEMBERSHIP-WIDENED-01`: an ADOPTED code (`PK-PETB-8801`,
  `RM-STEAR-7300`, `FR-WARD-4410`) and a SEED code (`PK-PETB-8810`) both parse at
  **95%** (membership); an RFQ-MUTE code (`PK-PETB-8803`) and a CHASE-LANE code
  (`MAT-88201`) parse at **90%** (shape). **The tiers are the three spaces, priced
  by how well the master knows them.**
- **EVERY em-dash on a material-bearing surface was classified, and NONE is an
  unresolved material.** The two candidates: the delivery-agreement `NEXT DUE`
  column (a missing DATE) and the triage `TOTAL QUANTITY (—)` — which is the
  SUBJECT's unit, not the master's, and fills to `(PCS)` the instant the operator
  picks the material the record will bind to. **The unit follows the BOUND
  material, never the MENTIONED one**; taking it from the master for a material
  this supplier does not supply would fabricate relevance.
- Units verified per material against the master on every rendered row: **KG for
  every chemical and fragrance, PCS for every packaging code, zero mismatches.**
- `PO-2025-00103` and `GR-2026-013` both read `FR-WARD-4410 · Wardah Signature
  Floral Compound` — same material, same label, same line.
- **Nothing on screen claims a lot or batch it no longer carries**, in either
  language, across every route.

### Constraints discharged, in writing

- **THE FIVE NO-MEANING RFQ CODES WERE NOT ADOPTED**, and the pin says so by
  name in three places. **The nine `MAT-*` codes were not adopted** — the third
  space is untouched, and `materialMasterAdoption.test.ts` asserts every adopted
  code came from the DECLARED lane, so adopting one from the chase lane names it.
- **NOTHING WAS INVENTED TO COMPLETE A SET.** The dispatch's escape hatch — "if a
  code cannot be adopted honestly, LEAVE IT AND SAY SO" — was used for exactly
  the five it was written for, and for no others.
- **ZERO UOM COLLISIONS**, so the "STOP AND REPORT" branch never fired. The
  measurement is now permanent: a second unit appearing on any adopted code
  turns the suite red rather than being resolved by whichever row the walk
  reached last.
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`.** All three paths verified
  blob-identical before commit.
- **MUTATION-VERIFIED — seven probes, seven DETECTED:** a master label drifting
  from its lane (**2 red**); an invented canonical unit (**2 red**); **the
  PARTIAL TRIM (6 red — the headline)**; `bpomApplicable` wired early; a
  `materialType` contradicting its group axis; a 26th code adopted with an
  invented meaning (**15 red**); an undeclared group number (**5 red**).
- **FLOOR 2106/177 → 2125/178.** `npm run gates` green.

---

## CP-2 · 2B-3 — THE FIVE MUTE RFQ CODES (refs @ `710cf06`)

**`MATERIAL_MASTER` 30 → 35. The declared document lane's master-absent
population is now ZERO; the tree's is 9, and all nine are the third space.**

**This batch is a different KIND of act from 2B-2, and the register keeps them
apart.** An adoption RATIFIES a meaning the lane already states. There was
nothing to ratify here: these five are reached only through
`RFQ.materialIds: string[]`, and `meaningsOf(code)` returns `[]` for every one
of them — **before this batch and after it.** Authoring made the codes
RESOLVABLE; it did not make the lane DESCRIBE them. Those are different facts,
and `materialMasterAuthoring.test.ts` asserts both rather than letting the second
be inferred from the first.

### The evidence tier — DERIVED, not stamped

The dispatch required the tier recorded per row. It is **not** a field on
`MaterialMasterEntry`: a hand-written `evidenceTier: 'T2'` is a stamp, and a
stamp drifts from what it describes (`MG-UNREAD-BY-ANYTHING-01`, the same
shape). It is computed from the tree instead. Three tiers exist here:

| tier | what it is | how many of the five |
|---|---|---|
| **T1** · code-bound line | one record carrying the code, a description AND a qty+unit | **0** — all 25 of 2B-2's adoptions had one |
| **T2** · code-bound header | the RFQ: code in `materialIds`, meaning in `title`, unit in the header `uom` | **5** |
| **T3** · name-only corroboration | a PR / storefront / marketplace / remittance row stating the meaning with **no code at all** | `PK-PETB-8803` ×5 · `AI-CENT-6900` ×2 · the other three ×0 |

⚠️ **WHY T2 IS GENUINELY WEAKER — measured, not hedged.** `RFQ.uom` **is not a
per-material field**: its arity is ONE while `materialIds`'s is N. Three RFQs in
this tree (`RFQ-2026-003/-004/-005`) carry TWO codes under ONE `uom`, so for
those the header unit is attributable to neither code. **That is not a
hypothetical weakness described in prose — it is three live rows**, pinned. None
of the five rides that route, which makes the mapping unambiguous **for these
rows, as a property of the rows and not of the field.** A sixth code arriving as
the second element of a `materialIds` array gets no unit from here and **must not
be given one by analogy.**

### `EVIDENCE-REPLICATION-NOT-CORROBORATION-01` *(new — **ELEVATED TO A CLASS at 2B-4a; see that section**)*

| | |
|---|---|
| **Finding** | The dispatch asked that `RM-HUMEC-3405` be noted as the only one of the five with evidence from THREE RFQs rather than one. **Measured, the count overstates the independence.** `RFQ-2026-013` is a **declared clone** of `RFQ-2026-012` — the fixture's own header says *"rfq-012 with a recorded FX ledger and NOTHING else changed"* — and the pin verifies it: same `materialIds`, same `totalQty`, same `uom`, same `estimatedValue`, same title head. **A copy agrees with its original by construction.** So the best-evidenced-looking row of the five is two sources and one replication. |
| **Disposition** | **RECORDED, NOT DOWNGRADED.** All three do agree on KG, which is worth something — it is just worth less than three independent agreements, and the difference should be visible to whoever next leans on this row. **THE TRANSFERABLE PART: a count of agreeing sources is not a measure of evidence until the sources are known to be independent.** The clone check is executable, so if `rfq-013` ever diverges the claim goes red rather than quietly becoming true. |

### The label rule — the em-dash split is DERIVED, and `RM-HUMEC-3405` is the proof

Every RFQ title reads `<material> — <sourcing event>`, and the tail is trimmed.
The argument is **not** tidiness; it is forced by the data:

> `'Propylene Glycol USP — imported, USD-quoted'` · `'— dual-currency bid
> comparison'` · `'— dual-currency, rate on record'`
>
> **ONE head. THREE tails.** If the tail were part of the meaning, this code
> would state three meanings and be **unadoptable under ONE CODE, ONE MEANING.**
> It states one meaning and three sourcing contexts.

This is 2B-2's `— Lot A` trim again with a different intruder: there the tail was
an INSTANCE in a type label, here it is an EVENT. **The brands are not treated
inconsistently:** `PET Bottle 200ml Frosted — Wardah Series` kept its brand at
2B-2 because the lane's own DESCRIPTION said so; `— Wardah Q3 launch` is trimmed
because it is the reason an RFQ was raised. Same word, different role.

### `RFQ-FACET-CANNOT-EXPRESS-THE-GROUP-01` *(new)* — and why it is NOT a second MG collision

| | |
|---|---|
| **Finding** | All three of `RM-HUMEC-3405`'s RFQs carry `materialCategory: 'Emulsifiers'`. The master files it at **`MG-03` (humectants / glycols)**. That looks like `MG-COLLISION-21-01` and is not. **`RFQCategory` is a SIX-VALUE UI FACET** — Fragrance · Active Ingredients · Packaging · Emulsifiers · Botanical · Other — **with no humectant or glycol member at all.** 'Emulsifiers' is a **coerced value**, the nearest available bucket. **A vocabulary that cannot express an answer has not given a different one.** |
| **Why MG-03 is right** | The master already ruled this exact shape once, on seed data: **`RM-EMUL-3310` (Glycerin USP 99.5%) is `MG-03`** — a code whose prefix says EMUL, grouped as the glycol it is. `materialCode` is contractually OPAQUE, so the `RM-HUMEC` prefix decides nothing either; it agrees here **by luck, and is not the reason.** Propylene Glycol USP sits beside glycerin, and MG-03 now has exactly two members, both USP-grade glycols. |
| **Disposition** | **APPLIED AND PINNED.** It also sharpens **`MG-NO-EMULSIFIER-GROUP-01`**: the vocabulary has no emulsifier group, which is exactly why this row keeps *looking* like an open question. It is not one — but the finding it points at is still open, and now has a second row leaning on it. |

### R-1 PAYS OUT — the row the split was argued over, two batches later

`PK-ALCP-2441` is an **aluminium** cap. Under a pure substrate axis it lands in
`MG-22` (metal packaging), away from the plastic closures it is sourced
alongside; under R-1's **functional** axis it lands in `MG-21` with them. R-1
chose function at 2B-1 and recorded the cost in an `axis` field.

> **`MG-22` still has ZERO members.** That is the payout stated from the other
> side: the tree's one metal closure did not go to the metal group. The other
> candidate (`MAT-77014`) is third space and no batch adopts it.

**The ordering is the whole point, and it is the second time it has paid:**
`MG-10` was declared member-less at 2B-1 and spent at 2B-2; `MG-21`'s axis was
argued at 2B-1 and spent here. **A group declared ahead of its members is a
decision RECORDED; one invented during an adoption is a decision SMUGGLED.**
`materialGroups.test.ts` inverted its 2B-1 assertion rather than deleting it —
the pin that said "neither aluminium closure is adopted" now says where the
adopted one went.

`MG-06` gains its **first** master member (`AI-CENT-6900`), confirmed present in
the registry before use rather than assumed, per the dispatch.

### `SAPCODE-INVISIBLE-TO-THE-CENSUS-01` *(new — and it makes the dispatch's closing number too small)*

| | |
|---|---|
| **Finding** | **The census's MODULE scope derives; its FIELD-NAME scope does not.** `materialIdentity.test.ts` walks two keys — `materialCode` and `materialIds` — and its raw-source guard greps for exactly those two. **`CatalogItem.sapCode` (`services/data/types.ts:422`) is a THIRD declared code-bearing field**, and `supplierStorefront.ts` puts five values in it. **Three of them (`MAT-10045/10046/10089`) appear NOWHERE else in the tree** — so they are not in `CODES`, not in the master-absent count, not in the identity property, and not in the BPOM firing pin. Found while sourcing the label for `PK-PETB-8803`: the RFQ names that code, and the sup-007 storefront states the SAME MEANING against `sapCode: 'MAT-10045'`. |
| **Why it is not a tidy-up** | The other two values (`MAT-30110`, `MAT-40220`) are **already in the undeclared third space**. So the storefront field is not holding some unrelated vocabulary — **it OVERLAPS `MAT-*`.** Either the third space is bigger than nine codes, or the storefront is a FOURTH space that happens to share two, **and nothing in the tree says which.** C9 §5 requires a `MaterialRef` to name its space; this field names none, and *its own name does not say whose SAP it means.* |
| **The consequence, stated** | **The dispatch's closing line — "the tree-wide master-absent population drops to 9" — is the TWO-FIELD answer.** Nine is right for the census as scoped. **Twelve is the answer if `sapCode` counts.** Which is true is a DECLARATION, and no batch has made one. Both numbers are now asserted side by side so neither can be quoted as the other. |
| **Disposition** | **MEASURED AND PINNED, NOT CLOSED — deliberately.** Widening the walk would silently move a headline figure, and deciding whether a supplier catalogue's `sapCode` is Paragon identity **is a space declaration, which 2B-1's R-3 established is the operator's act and not the builder's.** The pin is mutation-verified (**M9**: change one `sapCode` literal and it goes red). **This is `DERIVED-OVER-A-CHOSEN-SCOPE-01` one level further in than that finding reached** — it caught a hand-picked MODULE list and left a hand-picked FIELD list underneath it, which reads like a fact because it is written as a regex. |

### Behavioural change — every claim MEASURED, including the nulls

**A/B on the BUILT BUNDLE**, two origins served simultaneously (ports 4191/4192)
so the 2B-2 cache trap could not recur. Baseline validity verified first: each of
the five codes occurs **2× more** in the 2B-3 bundle than in `main`'s.

⚠️ **THE FIRST A/B WAS INVALID AND WAS THROWN AWAY.** `main` rendered in
Indonesian and 2B-3 in English — separate origins have separate `localStorage`,
so the locale did not carry. It was caught because the diff was absurdly large,
not because anything checked. **Both runs now set `paragon.lang` explicitly.**
Recorded because the failure mode is the same one that invalidated the 2B-2 A/B
(a stale-state difference masquerading as a code difference) wearing a new face.

- **29 routes, EN, both builds: ZERO rendered difference.**
- **`AUTHORED-CODES-RENDER-NOWHERE-01`** — and it is why the zero is trustworthy
  rather than suspicious. **Not one of the five CODES is rendered on ANY list
  surface.** The RFQ lane displays TITLES; `labelOf` has no RFQ consumer at all
  (its four consumers are SDC surfaces keyed on seed materials). **So the master
  label had nothing to compete with. Resolvability here is a CAPABILITY, not a
  rendering** — a "zero delta" is only worth reporting alongside whether the
  surface could have shown one.
- **SHOULD-COST SILENCE MOVED BY ZERO — and this is the run that actually tested
  it.** All **13** RFQ comparison panels captured on both builds by clicking
  every row. Every panel differed by exactly one line, `0h`; **dumping the SAME
  build twice produced that same line**, proving it render noise. Excluding it:
  **0 real panel diffs of 13.** 2B-2 established the decoupling structurally
  (`SHOULD-COST-DECOUPLED-FROM-MASTER-01`) but over codes that never reach an
  RFQ panel; **these five ARE the RFQ materials**, so the claim was re-measured
  on the surface it is about rather than inherited.
- **THE ONE REAL BEHAVIOURAL CHANGE, measured on both builds:** the Comm Hub
  reply parser. `knownMaterialCodes()` widens 30 → 35, and membership beats
  shape. `STOCK PK-ALCP-2441 80000 PCS` · `PK-PETB-8825` · `RM-HUMEC-3405` all
  read **90% on `main` → 95% on 2B-3**. **`STOCK MAT-88201 500 KG` stays at
  90%** — the widening is scoped exactly to the master and did not leak into the
  third space.
- **EN + ID**: chrome translates, all five material titles correctly do NOT, no
  raw i18n keys in either language. **Console: 0 errors, 0 warnings across the
  entire session.**

### The 2B-4 gate — unchanged, and this batch removes the half that was never operative

`bpomApplicable` is absent from all **35** entries (**M5**). What 2B-3 sharpens:

> **`MASTER-STRADDLE-01` is now ZERO codes wide against the declared lane, and
> the gate still cannot be a master check.** Two populations used to refuse; one
> does now. The RFQ-mute five were never the operative half — **an RFQ material
> is not a received line, and the GR wizard never saw one.** The nine `MAT-*`
> codes seeded into `asnStore` always were, and they are untouched.

Also asserted: **every BPOM-firing code is now master-resolvable** (`AI-CENT-6900`
was the last one outside) **and the firing set did not move by one code.** That
is the cleanest available statement of why a prefix rule is not a master rule —
total coverage of the firing set changed nothing, because the master is not
consulted.

### Amended in place

| | |
|---|---|
| **`MASTER-STRADDLE-01`** | **NARROWED TO ZERO against the declared lane** (30 → 5 → 0). Not closed: the third space is untouched. Its assertion has now survived **two** rounds of its own witness being adopted. |
| **`ADOPTION-QUEUE-01`** | **DISCHARGED IN FULL.** The queue was a COVERAGE problem, then an AUTHORING problem, and is now neither. |
| **`RECODE-ORPHANS-CLASSIFICATION-01`** | **ITS STATED BLOCKER IS GONE, AND IT IS STILL NOT FIXED.** `commodityMaterialMap.ts` books its re-key to B2b because *"SEVEN of the eleven keys name codes `MATERIAL_MASTER` does not contain"*. **After 2B-3 that number is ZERO — all eleven keys are master-present.** The re-key is therefore unblocked, and is still not done here: the dead key (`PK-PETB-8810`) and the false header sentence must be corrected by the batch that owns the map, together. **Recorded because a blocker that quietly expires is how a booked item becomes a forgotten one.** |
| **`MG-NO-EMULSIFIER-GROUP-01`** | Still open, now with a **second** row leaning on it — see `RFQ-FACET-CANNOT-EXPRESS-THE-GROUP-01`. |
| **`IDENTITY-GRAIN-ASYMMETRY-01`** | **Unchanged and still the operator's.** ⚠️ **But 2B-3 fits its shape a third time:** `RM-HUMEC-3405`'s authored label states a grade (**USP**) that several seed entries do not. The master now names a grade on 30 of its 35 rows — every adopted and every authored one — **and stays silent on the five it was seeded with.** Not corrected: seed data is the operator's. |

### Constraints

- **NOTHING WAS INVENTED TO COMPLETE THE SET.** Five is small and completing it
  was explicitly not a goal; all five had a stated head and a sole-code header
  unit, so the escape hatch was not needed. **Had `MG-06` been absent from the
  registry it would have been reported, not created** — it was confirmed present
  before use, per the dispatch, not assumed.
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`.** All three paths verified
  blob-identical before commit.
- **MUTATION-VERIFIED — ten probes, ten DETECTED:** a label drifting from its
  RFQ head (**1 red**); an invented unit (**4 red**); **the substrate axis
  winning — the alu cap sent to MG-22 (3 red)**; a surviving sourcing-event tail
  (**2 red**); `bpomApplicable` wired early (**2 red**); `PK-PETB-8825` merged as
  an alias of 8810 (**2 red**); **a sixth code adopted out of the `MAT-*` space
  (7 red — the partition check)**; propylene glycol filed under the RFQ facet
  (**1 red**); a `sapCode` literal changed (**1 red**); `rfq-013` stopped being a
  clone (**1 red**).
- ⚠️ **ONE SELF-INFLICTED NEAR-MISS, RECORDED.** The first run of
  `materialMasterAuthoring.test.ts` derived an **EMPTY** population — it excluded
  the master by MODULE PATH, and the master is re-exported through several
  modules — **and NINETEEN assertions passed vacuously**, because every one is a
  `for (const c of AUTHORED)` or a `.filter(...).toEqual([])`. Only two literal
  count assertions caught it. Fixed two ways: the master is now skipped **by
  REFERENCE**, and both this file and the 2B-2 pin now guard the population **the
  assertions iterate**, not just the raw walk that feeds it. **A population guard
  that does not guard the derived set is decoration.**

  ⚠️ **AMENDED AT 2B-4a — TWO THINGS THIS ENTRY UNDERSTATED, AND THE SECOND IS
  THE SHARPER ONE.**

  **(1) IT IS THE `--passWithNoTests` SHAPE, ONE LAYER IN.** That flag is the
  canonical form of the failure: a runner told to be green when it finds nothing
  to run, so an empty selector reports success. Nineteen assertions over an empty
  derived population are the same object one level down — **green because they
  found nothing to do**, and indistinguishable in the output from nineteen
  assertions that examined thirty-five rows and were satisfied. Naming it that
  way matters because the mitigation is not "be careful with globs": it is that
  **every derived population needs a floor asserted on the set the assertions
  actually iterate**, exactly as `--passWithNoTests` needs a minimum test count.
  `scripts/floor.json` is the same instrument at the suite level, and CP-3a's
  ruling about it applies here verbatim.

  **(2) IT WAS CAUGHT BY THE SEAT, NOT BY A GATE — AND THE GATES WOULD HAVE
  SHIPPED IT.** `npm run build` typechecks a vacuous loop happily. `npx vitest
  run` reports nineteen passes. `npm run test:gate` never touches `src/`. **CP-3a
  asserted that the three gates RAN and DID SOMETHING; nothing asserts that a
  test did something.** The suite would have grown by nineteen green assertions,
  cleared the floor, and gone to `main` — and the batch would have read as
  *better* covered than before, because the count went up. **THE CATCH WAS A
  HUMAN NOTICING THAT TWO COUNT ASSERTIONS DISAGREED WITH SEVENTEEN SILENT
  ONES, WHICH IS NOT A MECHANISM.** Recorded in this register rather than as a
  passing remark in a batch note, because "our gates would not have caught this"
  is the single most load-bearing fact about the incident and the only one that
  generalises to the next batch.

  ⚠️ **THIS IS A LIVE HOLE IN CI, NOT A HISTORICAL NOTE (operator ruling, at the
  #176 merge).** Nothing was fixed by finding it. `.github/workflows/gates.yml`
  runs `npm run gates` and nothing else, on every PR and every push to `main` and
  daily at 00:17 UTC — and **the next vacuous suite to arrive will pass all three
  gates exactly as this one did.** `scripts/gates.mjs` asserts that the BUILD
  emitted a bundle, that the SUITE collected at least the floor, and that the
  GATE suite passed its count. **Not one of those three asks whether a test
  examined anything.** A file of `.filter(...).toEqual([])` over an empty derived
  set raises the collected-test count, clears the floor, prints the bump note,
  and is indistinguishable from coverage. **CP-3a closed the "did the gates run"
  hole and left the "did the tests do anything" hole open, one level in — which
  is `SCOPE-DERIVATION-IS-RECURSIVE-01` on the gates themselves.**

  ⚠️ **AND IT IS THE SECOND APPEARANCE OF THE SHAPE IN THIS REPOSITORY, WHICH IS
  WHY IT IS A SHAPE AND NOT AN INCIDENT.** First `--passWithNoTests` — a runner
  told to be green when its selector matches nothing. Now nineteen assertions
  green because their population was empty. **GREEN BECAUSE IT FOUND NOTHING TO
  DO, twice, at two different levels, and in both cases the output is
  byte-identical to the output of having done the work.** A third appearance
  should be assumed, not awaited: the standing question for any new check is
  **what does this report when its input is empty**, and the answer must be
  RED, not silence. **NOT FIXED HERE.** The candidate is a fourth assertion in
  `scripts/gates.mjs` — a floor on assertions-executed rather than
  tests-collected — and it is a batch of its own, argued and costed, not
  smuggled in beside a register.
- **FLOOR 2125/178 → 2147/179.** `npm run gates` green.

---

## CP-2 · 2B-4a — THE BPOM MECHANISM, AND THE FIELD SET THAT DERIVES (refs @ `5cca23d`)

**`bpomApplicable` lands on all 35 master rows and NOTHING READS IT. The census
widens from two hand-picked field names to a DERIVED field set, and the tree's
master-absent population goes 9 → 12 without a single code being added.**

Two halves, and the second one was the dispatch's real question. The mechanism
half is small and was specified in full. The census half was an operator ruling
executed as a derivation, and it surfaced a level nobody had looked at.

### The three queued filings, discharged HERE and not in a register PR

Nothing crossed the batch boundary as an IOU. The vacuous-19 amendment is in the
2B-3 section above (`--passWithNoTests` one layer in; **the gates would have
shipped it**); the two class elevations are immediately below.

### Elevated to CLASSES (operator ruling, 2B-4a)

| | |
|---|---|
| **`EVIDENCE-REPLICATION-NOT-CORROBORATION-01`** *(class; instance = `RM-HUMEC-3405`'s three RFQs, 2B-3 — **elevated because a rule buried in one batch's block gets read as being about that batch**)* | **A COUNT OF AGREEING SOURCES IS NOT A MEASURE OF EVIDENCE UNTIL THE SOURCES ARE KNOWN TO BE INDEPENDENT.** `RFQ-2026-013` is a DECLARED CLONE of `-012` — the fixture's own header says *"rfq-012 with a recorded FX ledger and NOTHING else changed"* — so the row that looked best-evidenced of 2B-3's five is **two sources and one replication.** A copy agrees with its original **by construction**, and nothing in the count says which agreements were free. | **BEFORE QUOTING A COUNT OF CORROBORATING SOURCES, ESTABLISH THAT THEY ARE INDEPENDENT — AND WHERE THE INDEPENDENCE IS CHECKABLE, CHECK IT EXECUTABLY.** The clone check is a real assertion, so if `rfq-013` ever diverges the claim goes red rather than quietly becoming true. **Why it belongs beside `CENSUS-MUST-DERIVE-01` and `DERIVED-OVER-A-CHOSEN-SCOPE-01` rather than under 2B-3:** all three are about A MEASUREMENT THAT LOOKS COMPLETE BECAUSE OF HOW IT WAS TAKEN. A shape-matched census misses what it never looked for; a scoped assertion is only as strong as the scope; **a replication count inflates without anybody overstating anything.** In each case the number is arrived at honestly and means less than it reads. ⚠️ **The bilateral half is live and NOT yet contracted:** C9 §3.3 already requires both platforms to state HOW a population was obtained. This adds the second question — **how many of the sources behind a figure are copies of each other** — and it is booked to the C9 next-SHA queue, PROPOSED, not made. |
| **`SCOPE-DERIVATION-IS-RECURSIVE-01`** *(class; instances = **all four levels below, one per batch**)* | **DERIVE THE POPULATION. DERIVE THE LANE SET. DERIVE THE FIELD SET.** Three batches, three fixes, and **EACH TIME A LEVEL WAS FIXED THE NEXT LEVEL UP WAS STILL A HAND-PICK** — invisible each time, because the surviving literal was written in a form that reads as a fact. ① `CENSUS-MUST-DERIVE-01` (2a) fixed the POPULATION: stop matching a code shape, enumerate from the data. **The MODULE LIST stayed a hand-picked import list.** ② `DERIVED-OVER-A-CHOSEN-SCOPE-01` (2B-0) fixed the LANE SET: glob the tree, not four named modules. **The FIELD NAMES stayed a literal pair, written as a regex — which is why nobody re-read them.** ③ 2B-4a fixes the FIELD SET: close it over the tree from the master's own keys. ④ **AND THE MEANING SET IS STILL A LITERAL** — `/description/i` — filed below as `MEANING-SCOPE-IS-A-HAND-PICK-01` and **NOT closed.** | **WHEN YOU DERIVE A SCOPE, THE THING THAT CHOSE THAT SCOPE IS THE NEXT SCOPE — AND IT IS ALWAYS ONE LEVEL LESS VISIBLE THAN THE ONE YOU JUST FIXED.** A population reads as data; a module list reads as an import; a field-name regex reads as a definition; a meaning rule reads as a convention. **Each is a claim wearing the clothes of a fact, and the clothes get better as you go up.** Standing practice: after deriving any scope, WRITE DOWN what selected it and whether that selector is itself derived or chosen — **in the file, not in a batch note.** `materialIdentity.test.ts`'s header now carries the whole ladder, including the rung it has not climbed. ⚠️ **This class does NOT promise the ladder terminates.** Four levels are known; nobody has shown there is no fifth. The honest claim is that **each level is cheaper to find once the one below it is derived** — not that we are done. |

### The operator ruling — `sapCode` COUNTS, and the census DERIVES it

> **"A field holding `MAT-*` values that overlap the third space IS material
> identity, whatever the field is named."**

Executed as a mechanism, not as a third literal. The field set is **closed over
the tree from `MATERIAL_MASTER`'s own key set**: a field is code-bearing if any
of its values is a known code, and its values then become known codes.
`sapCode` is admitted on the **second** round — it holds no master code, and two
of its five values are already in the `MAT-*` space `materialCode` reaches.
**A fourth code-bearing key arriving anywhere widens the census with nobody
editing the file**, which is the only version of this fix that does not need
making again.

| | before (2B-3) | after (2B-4a) |
|---|---|---|
| code-bearing fields | 2, literal | **3, derived** |
| tree population | 44 | **47** |
| master-absent | 9 (two-field scope) · 12 (if `sapCode` counts) | **12, full stop** |
| BPOM firing set | 16 | **16 — unchanged** |

⚠️ **THE MASTER-ABSENT FIGURE WENT UP, AND THAT IS THE RESULT.** No code was
added to the tree; the three arrivals have been sitting in
`supplierStorefront.ts` all along. **A figure that improves every batch while its
scope stays narrower than the tree is a figure improving about itself.** On the
batch that widens the scope, the honest direction of that number is UP — and the
pin says so in its own title rather than leaving a reader to notice.

⚠️ **WHAT THE RULING DID NOT SETTLE, kept open on purpose.** The POPULATION
question is answered; the SPACE question is not. Nine of the twelve are in the
two modules `MAT-SPACE-UNDECLARED-01` names, three are in the storefront, and
whether that is ONE space of twelve or TWO sharing two codes is still a
declaration nobody has made. **Counting a code is not placing it.**

### `FIELD-SET-CLOSURE-OVERRUNS-01` *(new — the derivation's own failure mode, found by building it)*

| | |
|---|---|
| **Finding** | **A TRANSITIVE CLOSURE OVER FIELD NAMES IS UNSOUND, AND IT FAILS BIG.** Run as a bare closure the derivation admits `SupplierDocument.linkedTo` on the FIRST round — one of its thirteen values is `'PK-PETB-8801'`. Its other twelve then become "material codes", and two rounds later the census has swallowed `poNumber` and `poReference` and is reporting **26 purchase-order numbers as material identity: 83 codes and 48 master-absent, instead of 47 and 12.** |
| **Why it happens** | `linkedTo` is a **free-text reference field** — its values include `'All materials'`, `'PK-PETB-8801, PK-PETB-8810'` and `'PO-2025-00107 / PK-PETB-8801'`. **ONE FREE-TEXT FIELD IS A BRIDGE BETWEEN TWO IDENTIFIER SPACES, and a closure walks across it without noticing.** The general form: **DERIVING A SCOPE TRANSITIVELY IS NOT THE SAME ACT AS DERIVING A POPULATION.** A population is closed under *is a member*; a scope is not closed under *mentions a member*. |
| **The disqualifier, and it is not a shape rule** | A field is rejected if **any of its values PROPERLY CONTAINS a known code without BEING one.** That asserts nothing about what a code looks like — C9 §3 forbids that, and this rule does not need it. It asserts that a cell holding `'PO-2025-00107 / PK-PETB-8801'` is **not one identifier under any reading of what identifiers look like.** **A CELL THAT CONTAINS AN IDENTIFIER IS A REFERENCE; ONLY A CELL THAT IS ONE IS IDENTITY.** |
| **Disposition** | **APPLIED, AND THE REJECTION IS PINNED BY NAME AND BY VALUE** rather than buried in a filter nobody reads — `linkedTo` and its three impure values are asserted, so a fourth one arriving is a red test rather than a silent narrowing. Also pinned: **no admitted code properly contains another**, so the rule is measured to be non-vacuous instead of assumed harmless. ⚠️ **The honest limit:** the disqualifier is all-or-nothing. A field that is 95% identity and 5% prose is rejected outright, and this tree has no such field to calibrate against. If one arrives, the rule needs re-arguing — **not a threshold**, which would be a magic number doing the deciding. |

### `MEANING-SCOPE-IS-A-HAND-PICK-01` *(new — **the fourth level, and the dispatch asked for it now**)*

| | |
|---|---|
| **Finding** | **THE POPULATION DERIVES, THE LANE SET DERIVES, THE FIELD SET NOW DERIVES — AND WHAT COUNTS AS A MEANING IS STILL `/description/i`.** That is a shape-match on a field NAME: the same defect as the code-field literal, one field over. The three codes 2B-4a admitted enter the census **MUTE**, because `supplierStorefront.ts` states its meaning under a key called `material`. So they are counted by the master-absent figure and are **structurally incapable of contradicting anything** — precisely what `DERIVED-OVER-A-CHOSEN-SCOPE-01` said about `materialIds` at 2B-0, on a new set of codes. |
| **⚠️ AND IT IS NOT AN EMPTY BLIND SPOT — THREE LIVE VIOLATIONS, MEASURED** | Read `material` as a meaning too and the identity property breaks in **both** directions, on rows no batch has ever seen. **ONE MEANING, TWO CODES:** `'PET Bottle 100ml Airless Pump'` is the storefront's `MAT-10045` **and** the master's `PK-PETB-8803` — the label 2B-3 authored, having noticed this collision in prose while sourcing it. **ONE CODE, TWO MEANINGS, twice:** `MAT-30110` is *'Specialty fat blend — RBD stearin'* in the shipment lane and *'RBD Palm Stearin — Specialty Fat'* in the storefront; `MAT-40220` is *'Emulgade SE-PF emulsifier'* vs *'Emulgade SE-PF **E**mulsifier'* — **a case difference, which is worse rather than better, because it is exactly what a reader skims past.** |
| **Disposition** | **MEASURED AND PINNED, NOT APPLIED** — the 2B-3 treatment of `sapCode`, for the same reason: applying it silently moves a headline result, and **whether a supplier catalogue's prose is a Paragon MEANING is the same class of declaration as whether its `sapCode` is Paragon identity.** The wider rule runs on every row and its output is asserted; only its effect on the identity property is withheld. Mutation-verified (**M7**: rename the storefront's `material` key and the pin goes red). **This is the operator's next ruling, and it is a bigger one than `sapCode` was — that one moved a count; this one turns a green property red.** |

### `PREFIX-RULE-ASSERTS-A-NEGATIVE-01` *(new — the mechanism half's real result)*

| | |
|---|---|
| **Finding** | **`inferBpom` FAILS OPEN IN TWO DIFFERENT WAYS AND ONLY ONE OF THEM WAS KNOWN.** `BPOM-OFF-BY-SPACE-01` is the known half — an entire undeclared vocabulary escapes, now **twelve** codes rather than nine. The half 2B-4a measures is **INSIDE the master's own population**: a prefix rule has no way to say *undetermined*, so every code it does not recognise comes back `false` — and **`false` IS AN ASSERTION**, "this lot needs no BPOM lot check". |
| **The measurement** | On the master's 35 rows the two mechanisms **agree on 25 and disagree on TEN**: `RM-COCO-8200` · `RM-EMUL-3310` · `RM-EMUL-3320` · `RM-EMUL-9410` · `RM-EMUL-9430` · `RM-HUMEC-3405` · `RM-LAURIC-7200` · `RM-MYRST-7310` · `RM-PALM-7100` · `RM-STEAR-7300`. The master resolves every one; the prefix rule states a confident negative for every one; **nobody has ruled on any of them.** |
| **⚠️ AND THE AGREEMENT ON THE OTHER 25 IS NOT EVIDENCE THE PREFIX RULE WAS RIGHT** | The sixteen the class rule marks `APPLICABLE` are **exactly** the sixteen the prefix rule fires on. That is not corroboration — it is `EVIDENCE-REPLICATION-NOT-CORROBORATION-01` surfacing somewhere new: these fixtures were **authored** with prefixes that track class (`AI-` actives, `FR-` fragrance, `PK-` packaging), so the two mechanisms are not independent witnesses. **A rule that is right about the data it was written against, wrong about the data it was not, and unable to say which is which, is a shape-matched census wearing regulatory clothes.** Stated the useful way round: **on every row the new mechanism can answer at all, it answers what the old one answers. THE ENTIRE VALUE OF THE SWAP IS IN THE ROWS IT REFUSES.** |
| **Disposition** | **MEASURED AND PINNED. NOT ACTED ON — `inferBpom` is live and untouched**, which is the 2B-4 gate. Sharpens `INFERBPOM-REGULATORY-01` rather than replacing it: that finding said the mechanism was the retired class and failed open; this says **the fail-open has a second mouth, and it is pointed at material the master fully resolves.** |

### The mechanism — built exactly as dispatched, with ONE encoding decision recorded

- **`bpomApplicable` on `MaterialMasterEntry`, REQUIRED on all 35 rows.** An
  entry that may omit it is an entry whose silence has to be interpreted, and
  the whole point of `UNDETERMINED` is that an absence of determination is
  **written down** rather than inferred from a missing key.
- **`UNDETERMINED` REFUSES IDENTICALLY TO AN UNKNOWN CODE.** Same discriminant,
  same absent `applicable`, same consequence: nothing to proceed on. The
  `reason` differs so a refusal can NAME what is missing — the `uomOf`
  precedent, *a refusal that cannot say WHICH is half a refusal* — **and no
  caller may branch on it to proceed.** Pinned as a property over the whole
  master: **not one of the ten undetermined rows yields an `ok` outcome.**
- **IT IS NOT QUARANTINE, and the register keeps the two apart.** Quarantine
  **stores an untrustworthy fact and lets work proceed on it**; `UNDETERMINED`
  **stores an explicit absence of determination and refuses on it.**
  `D-OPS-MASTERMISS` already ruled against quarantine for the master miss; this
  is that ruling applied one field in.
- **SEEDED FROM CLASS, NEVER FROM A PREFIX.** `materialCode` is contractually
  opaque (C9 §3) and a prefix rule contradicts our own ratified contract. Values
  come from the row's declared GROUP via `PROVISIONAL_BPOM_BY_GROUP` — and
  **that rule DERIVES too**: packaging is `NOT_APPLICABLE` **by the 2B-1
  registry's own `axis` field**, not by a typed `MG-20..24`. ⚠️ **Not pedantry —
  `MG-25` (glass) was declared at 2B-1, AFTER the enumeration a dispatch would
  carry, and it is covered without anyone editing a list.** Everything outside
  the three ruled ingredient groups is `UNDETERMINED` **by default**, so a group
  added tomorrow is fail-CLOSED without being remembered.
- **ALL 35 VALUES ARE PROVISIONAL — STRATEGIST-RULED ON BEST PRACTICE, PENDING
  TEAM RATIFICATION.** 16 `APPLICABLE` (MG-04/05/06) · 9 `NOT_APPLICABLE`
  (packaging) · 10 `UNDETERMINED` (MG-02/03/10). `D-COMP-BPOM` stays open; this
  field is the shape its answer lands in, **not the answer.**
- ⚠️ **ONE BUILDER'S DECISION OVER AN OPERATOR'S SPELLING, RECORDED RATHER THAN
  TAKEN QUIETLY.** The dispatch specified the states as `true | false |
  UNDETERMINED`. **The semantics shipped are exactly those; the ENCODING is a
  three-member string union.** In a `boolean | 'UNDETERMINED'` union the string
  member is **truthy**, so `if (entry.bpomApplicable)` compiles, reads as
  obviously correct, and **silently converts an absence of determination into a
  determination** — the one thing the dispatch forbids, in the one shape nobody
  re-reads. As three strings that mistake is wrong for **every** value and fails
  on first contact instead of on the case it was built for. Pinned (`typeof` is
  `'string'` on all 35). **Reversible in one edit if the operator prefers the
  literal spelling.**

### The gate — AUTHORED, NOT WIRED, and it got WIDER

`inferBpom` (`GRInspectionWizard.tsx:129-131`) is **live and untouched**.
Nothing in the tree imports `sdc/bpom.ts`. Both facts are asserted, not
promised — a future batch that wires it must **delete an assertion
deliberately**, which is the point.

> ⚠️ **THE BATCH THAT AUTHORED THE MECHANISM ALSO ENLARGED THE POPULATION THAT
> BLOCKS IT.** The unresolvable codes the GR wizard can be fed went **9 → 12**
> when the census reached the field they were hiding in. **2B-4b inherits
> twelve, not nine.**

### `PROSE-COUNTS-AS-A-SITE-01` *(observation, filed not diagnosed)*

`ledgerTruth.test.ts`'s C9 §7.1 pin ("zero consumers") greps the tree for the
FILE NAME `materialMasterRef.types` and **cannot tell an import from a
sentence.** Naming that module in a code COMMENT turned the assertion red during
this batch. The comment was reworded and the batch moved on — but **a check that
a comment can redden is a check that will eventually be "fixed" by deleting the
comment rather than by tightening the check**, and that is a worse outcome than
the false positive itself. Filed; not diagnosed here.

### Mutation-verified — nine probes, EIGHT detected, and the ninth is reported

| probe | result |
|---|---|
| **M1** drop the containment disqualifier | **13 red** — `linkedTo` admitted, PO numbers in the population |
| **M2** change one `sapCode` literal | **1 red** — the raw guard now covers the derived field |
| **M3** one master row disagrees with its group rule | **5 red** |
| **M4** name `bpomApplicable` inside the GR wizard | **3 red**, across all three not-wired pins |
| **M5** rule `MG-10` APPLICABLE | **2 red** — the firing-set equality breaks |
| **M6** make `UNDETERMINED` return `ok: true` | **5 red** — the quarantine pin |
| **M7** rename the storefront's `material` key | **1 red** — the fourth-level pin |
| **M8b** collect nothing | **22 red** — the vacuity floor holds |
| **M9** narrow the field set back to the 2B-0 pair | **8 red** |

⚠️ **M8 — SEED THE CLOSURE FROM AN EMPTY SET — WAS *NOT* DETECTED, AND THE
REASON IS REPORTED RATHER THAN THE PROBE QUIETLY REPLACED.** The derivation
**re-seeds from the master every round**, so the initial seed is not
load-bearing: an empty start recovers on round one and produces the identical
field set. That is a robustness property, not a hole — **but a probe that passes
is a probe that proved something other than what it set out to**, and saying so
is cheaper than swapping in M8b and reporting nine of nine.

### Constraints discharged, in writing

- **NOTHING WAS WIRED.** `inferBpom` untouched, no GR-wizard change, no
  `MaterialMasterRef` row, no fixture code added or removed. The only fixture
  edit in the batch is **35 inserted lines, one per master row.**
- **NO CHEMISTRY WAS INVENTED.** Every value came from a declared group. Where
  the dispatch's enumeration and the registry disagreed (`MG-25`), **the
  registry won and the divergence is stated** rather than resolved silently.
- **THE FIRING SET MOVED BY ZERO** — asserted against the prefix predicate in
  two files, with the three newly-admitted codes checked individually rather
  than assumed from their shape.
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`.**
- **FLOOR 2147/179 → 2167/180.** `npm run gates` green.

---

## CP-2 · 2B-5a — THE POINTER DECLARED, THE REFERENCES REPAIRED (refs @ `eb40656`)

**`sapCode` is a POINTER, not a space. Six chase-reference mismatches are fixed.
The meaning scope DERIVES. And the master-absent count is NINE again — a
DIFFERENT nine.**

⚠️ **CARRIED FROM THE 2B-5 INVESTIGATION, VERBATIM AND UNSOFTENED:**

> **The census currently reports the third space as CLEAN on the identity
> property, AND THAT IS AN ARTEFACT OF THE MEANING SCOPE, NOT A FACT ABOUT THE
> SPACE. No statement of the form "the third space is internally consistent" is
> supported today.**
>
> **NOR IS ANY STATEMENT THAT THE THIRD SPACE'S REFERENCES RESOLVE** — six of
> six chase-reference axes were wrong, and three of five storefront pointers
> dangled.

Both were true when written. **2B-5a makes the second one false and leaves the
first one true**, which is the honest state and is why B and C stay open.

### ⚠️ CORRECTING OUR OWN REGULATORY FIGURE — `BPOM-OFF-BY-SPACE-01` IS **SEVEN**

The register said NINE at 2B-0/2B-1 and TWELVE at 2B-4a. **Both are wrong.**
The GR wizard's two draft builders read `Shipment` (master codes throughout) and
`ASN`. The ASN lane is `MOCK_ASNS` — **seven line items, all `MAT-*`**. The two
chase-lane codes and the storefront pointers **cannot reach a receiving surface
at all**, and never could.

| | |
|---|---|
| **Severity** | **UNCHANGED. Seven received lines silently skip a BPOM lot check, today, rendered.** |
| **What was wrong** | The number, in a regulatory finding. |
| **The error's mechanism, recorded because it generalises** | **THE CENSUS POPULATION AND THE REGULATORY EXPOSURE ARE DIFFERENT QUANTITIES, AND WE CONFLATED THEM.** The census counts every code the tree names; the exposure counts codes that can reach the receiving surface. They were the same set once, so one number served both — and it kept serving both after they diverged. 2B-4a's line *"the unresolvable codes the GR wizard can be fed went 9 → 12"* is the clearest instance: the widening was a CENSUS event and was reported as an EXPOSURE event. |
| **Disposition** | **CORRECTED HERE, IN THE BATCH THAT FOUND IT.** The pin now asserts the two quantities separately (`UNDECLARED_SPACE` = 7, tree master-absent = 9) so they cannot be restated as one another. **A wrong number in a regulatory row is corrected by the seat that wrote it, not left for the batch that acts on it.** |

### R-D — the storefront is a POINTER SPACE, and four of five pointers are wrong

The 2B-4a ruling (`sapCode` counts) **stands**; what the values ARE is the
2B-5a correction. The field is named `sapCode` not `materialCode`; the supplier's
own form labels it **"SAP code (optional)"** — Paragon runs the SAP, and an
OPTIONAL field cannot be an identity; and **two of the five pointed at codes in
`paragon.asn_chase_lane` UNDER THE MATCHING SUPPLIER ON BOTH SIDES**, which is
what a pointer looks like when it works.

> **THE STOREFRONT DOES NOT ADD CODES TO A SPACE. IT ADDS FIVE CLAIMS ABOUT A
> SPACE, AND THREE OF THEM ARE UNBACKED.**

| pointer | resolves | disposition |
|---|---|---|
| `c1` → **`PK-PETB-8803`** | the MASTER | **REPAIRED at 2B-5a (R-D)** — read `MAT-10045`, a code no Paragon space contains |
| `c101` → `MAT-30110` · `c201` → `MAT-40220` | the ASN lane | correct pointers into a space booked for retirement — **repoint at 2B-5b** |
| `c2` → `MAT-10046` · `c3` → `MAT-10089` | **nowhere** | unbacked; repairing them means AUTHORING master rows from a supplier's catalogue prose, which is an adoption and not 2B-5a's |

⚠️ **A DECLARATION THAT ONLY EVER ARRIVES WITH ITS OWN COMPLIANCE IS A
DECLARATION WRITTEN TO FIT.** Four of five rows fail the rule they were just
given, and the pin asserts each bucket as an **exact set** plus a **partition
check**, so the three cannot overlap or leave a remainder.

⚠️ **AND NO POINTER MAY BE JOINED ON.** C9 §4 unchanged: a claim entered by one
party about another party's space is an adoption at best. This one has no
`method`, no `sourceOfTruth`, no `evidenceLiveness`, no `routeToResolution` —
asserted *structurally*, because the shape has nowhere to put them, and **a
field that cannot record how it was decided must not be read as a decision.**

### `T3-WAS-CODE-BOUND-01` *(new)* — 2B-3's evidence tier was computed over a blind scope

| | |
|---|---|
| **Finding** | 2B-3 authored `PK-PETB-8803` and recorded its evidence as **T2 + T3 ×5** — "the best-corroborated MEANING of the five". All five T3 rows were checked at 2B-5a. Four (`PR-2026-00342`, the Marketplace card, the `PO-2025-00107` remittance note, `SupplierShipments`) carry **no code**. **The fifth — the sup-007 storefront line — carried `sapCode: 'MAT-10045'`, and was classified NAME-ONLY because the census could not read the field that made it CODE-BOUND.** |
| **What it does and does not change** | **The label is unaffected** — five independent sources state that meaning and they agree. **The TIER is wrong**, and worse, the "no conflicting code" property was **never checked for any of the five**, because the check could not see codes in that field. |
| **The transferable part** | **AN EVIDENCE TIER IS A MEASUREMENT OVER A SCOPE, AND INHERITS THAT SCOPE'S BLIND SPOTS SILENTLY.** 2B-3 derived its tiers rather than stamping them, precisely to avoid drift — and the derivation was correct over a field set that could not see the contradicting code. **Deriving a claim does not make it scope-independent.** |
| **Disposition** | **RECORDED, NOT RE-TIERED.** Re-tiering would need the 2B-5b ruling on whether a supplier's catalogue claim is evidence about a Paragon code at all. |

### The chase lane — six mismatches, and they are why R-A needed a second leg

⚠️ **THE FOURTH VIOLATION CLASS, and R-A's proof could not have found it.** R-A
folds the meaning derivation inside 2B-5 as the proof the space was resolved.
**`MAT-10234` and `MAT-20500` STATE NO MEANING ANYWHERE**, under any field-name
rule — so no widening of what counts as a meaning reaches them, and **a mute code
cannot collide with anything.** Yet both contradicted the object they named:

| chase | addressed to | named | itemSeq | material | real owner | real seqs | real material |
|---|---|---|---|---|---|---|---|
| `obr-0001` | sup-005 | `sa-0002` | 1 | `MAT-10234` | **sup-007** | **10, 20** | **`PK-PETB-8810`** |
| `obr-0002` | sup-007 | `sa-1001` | 1 | `MAT-20500` | **sup-001** | **10** | **`RM-EMUL-3310`** |

> **A REFERENCE THAT RESOLVES TO NOTHING ASSERTS NOTHING, AND IS THEREFORE
> INVISIBLE TO EVERY CHECK THAT LOOKS FOR CONTRADICTIONS.**

**FIXED — a defect fix, not an adoption.** `supplierId` is AUTHORITATIVE (scoping
is enforced on it, so a chase addressed to one tenant about another tenant's
commitment is wrong in the direction that matters), so the refs moved to match
it. `subjectRefIntegrity.test.ts` re-derives all five axes from the agreement
fixtures on every run. **The two `MAT-*` codes were never this space's
vocabulary — they were two wrong answers to a question the agreement had already
answered.**

⚠️ **AND THE CHECK ITSELF MET THE SHAPE ON ITS FIRST RUN — THIRD APPEARANCE.**
Axes 4 and 5 both filter on the referenced ITEM being found. On the broken
fixture the item was NOT found, so **both examined ZERO refs and passed GREEN
while the data was wrong** — in the batch whose subject is checks that pass
because they found nothing to do. Every axis now states how many refs it
examined and the count is asserted. (`--passWithNoTests`; the vacuous-19; this.)

### The meaning scope DERIVES — `MEANING-SCOPE-IS-A-HAND-PICK-01` CLOSED

Seeded from the master's own **labels**, exactly as the code closure is seeded
from its keys. Building it falsified two things, and both are reported rather
than smoothed.

**(1) THE CONTAINMENT GATE IS SOUND FOR IDENTIFIERS AND UNSOUND FOR MEANINGS.**

> `'PO-2025-00107 / PK-PETB-8801'` contains a code and **is not one**.
> `'Cetearyl Alcohol — Vegetable Origin'` contains a label and **is one**.
>
> **MEANINGS COMPOSE BY REFINEMENT; IDENTIFIERS DO NOT.**

Run over meanings, the identifier gate **rejects `description`** — the most
load-bearing meaning field in the tree — because a more specific lane meaning
properly contains the master's. That is `IDENTITY-GRAIN-ASYMMETRY-01`, a pinned
deliberate state, not contamination. The gate is **OFF** for meanings, and what
keeps `RFQ.title` out is **ARITY**, which is already canon (2B-3: a header field
whose arity is ONE against `materialIds`'s N). It falls out of the shape: a bare
`string[]` is not an object, so a code reached through one **has no siblings to
read a meaning from**. The RFQ lane stays mute, and that is a fact about the
shape rather than a gap in the scope.

**(2) R-B DECLINED `material`, CORRECTLY, AND THE FIX WAS NOT TO DECLARE MORE.**
The same key appears in `buyerRequisitions.ts`, which no declaration names. A
purchase requisition carries a material NAME and no material CODE — **a meaning
source with nothing to be a meaning OF.** So the meaning closure runs over the
sibling values of **code-bearing objects only**: a meaning field is a field that
states meanings **for codes**.

### R-B implemented — and implementing it falsified half the story it was ratified on

R-B shipped with the caveat that it was argued from ONE contaminant. It was, and
here is what building it found:

| | |
|---|---|
| **R-B does NOT catch `linkedTo`** | The PO numbers it leaks live in `mockPurchaseOrders.ts`, which **IS a declared space**, so a space-based boundary waves them straight through. What actually stops them is the **CONTAINMENT DISQUALIFIER — a property of CELLS, not of spaces.** `FIELD-SET-CLOSURE-OVERRUNS-01` credited R-B with work the containment rule was doing. **They are two INDEPENDENT gates: soundness on cells, authority on modules.** |
| **R-B's strict form rejects `materialCode` ITSELF** | Applied to every module a field touches, the gate rejects the census's primary field, because it is re-exported through barrel modules (`channel/index.ts`) that declare nothing and own nothing. **A barrel is not a space.** The gate is on the **VALUE** — each NEW value must live in a declared space, reachable through at least one module a declaration names. |
| ⚠️ **R-B, strictly applied, would have BLOCKED the operator's own 2B-4a ruling** | Admitting `sapCode` **necessarily enters `supplierStorefront.ts`**, which no declaration named at the time. The letter of R-B forbids it; the 2B-4a ruling requires it. **The resolution is the point: a closure may not enter a new space ON ITS OWN AUTHORITY — the operator may declare one, and the declaration is DATA the closure reads.** |
| **AND THAT INDICTS 2B-4a** | **2B-4a's closure widened silently. It should have HALTED AND REPORTED, and the ruling should have arrived as a declaration.** The mechanism did not ask; the ruling happened to sanction it afterwards. **That is luck, not governance.** |

**`materialSpaces.ts` is the missing declaration site** — the same shape
`materialGroups.ts` was for MG codes, and for the same reason (*a vocabulary with
no declaration site cannot disagree with itself out loud*). Four spaces, each
carrying the ruling that authorised it. ⚠️ **The caveat is NOT discharged:** they
are still hand-written module patterns, so **the boundary is one rung less
derived than it looks** — named here rather than discovered in 2B-6.

### The fourth level, measured — FOUR offenders, not two

| code | meanings | disposition |
|---|---|---|
| `AI-NIAC-6601` | *Niacinamide (Vitamin B3)* / *Niacinamide USP Grade 99.5% (Vitamin B3)* | `IDENTITY-GRAIN-ASYMMETRY-01` — SDC-0 seed, **the operator's** |
| `RM-EMUL-3320` | *Cetearyl Alcohol* / *Cetearyl Alcohol — Vegetable Origin* | same |
| `MAT-30110` | *Specialty fat blend — RBD stearin* / *RBD Palm Stearin — Specialty Fat* | **R-E → 2B-5b** |
| `MAT-40220` | *Emulgade SE-PF emulsifier* / *Emulgade SE-PF **E**mulsifier* | **R-E → 2B-5b** |

**The extra pair is a finding the derived scope SUBSUMES rather than creates.**
`IDENTITY-GRAIN-ASYMMETRY-01` was previously visible only through a bespoke
master-vs-lane comparison; once `label` is an admitted meaning field it becomes an
instance of the **general** property. **That is what a derived scope is for, and
it is worth more than the bespoke check it absorbs.**

⚠️ **THIS IS AN EXACT SET, NOT A WHITELIST, AND THE DIFFERENCE IS THE POINT.**
A whitelist says *ignore these* and grows; this says *there are EXACTLY these
four, here is what each says, and here is which finding owns it*. **A fifth
offender is red. One of these four silently vanishing is ALSO red.**
`ADOPTION-QUEUE-01`'s shape was a list that absorbed new members for three
batches; this cannot absorb anything. **Direction A — ONE MEANING, ONE CODE — is
GREEN over the derived scope**, because R-D repaired the only offender.

⚠️ **C's TRAP IS PINNED AS AN EXECUTABLE ASSERTION**, not as advice: the two
`MAT-40220` strings differ by ONE CAPITAL LETTER, and the test asserts they are
unequal **and** equal under `toLowerCase`. **NORMALISING CASE MAKES THIS
DISAPPEAR WITHOUT ANYONE DECIDING WHETHER THE TWO LANES DESCRIBE THE SAME
PURCHASABLE ITEM** — a shipped line carrying lot `LOT-B5540` and a catalogue
offer with a 45-day lead time. They probably do. **"Probably" is an adoption, and
the easiest fix is the wrong one.**

### The space is DEAD BY THE CODE, not by policy — R-3 now EVIDENCED

`MockCommandService.ts:147-152` — the one ASN creation path — builds line items
**from the parent PO**, and every PO line is master-resolvable since 2B-3.
**NO DISPATCHED ASN CAN CARRY A `MAT-*` CODE.** The seven are a frozen legacy
seed; the write path migrated before anybody ruled on it. R-3's *booked for
retirement* is confirmed by the code rather than only by policy — recorded in the
registry entry so 2B-5b inherits the evidence, not the assumption.

### ⚠️ NINE AGAIN — AND IT IS A DIFFERENT NINE

| | 2B-3 | 2B-4a | **2B-5a** |
|---|---|---|---|
| tree population | 44 | 47 | **44** |
| master-absent | 9 | 12 | **9** |
| ASN/chase third space | 9 | 9 | **7** |
| storefront unbacked | — | 3 | **2** |

**The count landed back where R-3 left it while the MEMBERSHIP changed** — the
two chase codes left, the two unbacked pointers arrived, and one pointer was
repaired. **A COUNT THAT RETURNS TO ITS OLD VALUE WHILE ITS MEMBERS CHANGE is
the thing this arc keeps finding**, so the pin asserts both halves and names the
two codes that left.

### Behavioural change — measured on the BUILT bundle, EN + ID

- **`BuyerSupplierProfile` → sup-007 → Catalog, row 1 SAP Code: `MAT-10045` → `PK-PETB-8803`.** The R-D render change, confirmed rendered. Rows 2 and 3 **still show `MAT-10046` / `MAT-10089`** — the declared-but-unrepaired state, visible rather than hidden.
- **Comm Hub: ZERO `MAT-*` codes remain.** The chase subjects now render `AI-NIAC-6601` and `PK-PETB-8810` — the corrected references, and the one user-visible consequence of the six-axis fix.
- **EN + ID both**: chrome translates (*SAP Code* → *Kode SAP*, *Lead time* → *Waktu tunggu*), material names correctly do NOT, no raw i18n keys.
- **Console: 0 errors, 0 warnings across the session.**

### Mutation-verified — five probes, five DETECTED

| probe | result |
|---|---|
| **M1** revert R-D (`sapCode` → `MAT-10045`) | **8 red** |
| **M2** revert one chase ref to `sa-0002`/`itemSeq 1` | **4 red** |
| **M3** remove the storefront space declaration | **10 red** — R-B declines `sapCode`, exactly as it should have at 2B-4a |
| **M4** turn the containment gate ON for meanings | **3 red** — `description` rejected |
| **M5** case-normalise `MAT-40220` | **2 red** — C's trap holds |

### `CLOSURE-WIDENED-ON-ITS-OWN-AUTHORITY-01` *(new — the 2B-4a indictment, filed plainly)*

| | |
|---|---|
| **Finding** | **2B-4a's field-set closure ENTERED AN UNDECLARED MODULE AND NOBODY ASKED.** Admitting `CatalogItem.sapCode` necessarily brings `supplierStorefront.ts` into the census, and at the time **no declaration named that module** — not `C8-MASTER-DECL`, not R-3, not anything. The closure did it silently, reported a widened population as a result, and the operator's ruling (*"sapCode counts"*) arrived **afterwards** and happened to sanction it. |
| **Why this is the more useful half** | The batch read as a success: a hand-picked field list replaced by a derivation, a blind spot closed, a number corrected upward. **All of that is true. It is also true that the mechanism took a decision that was not its to take, and the only reason no harm followed is that the operator agreed.** A control that produces the right answer because somebody happened to agree with it afterwards has not been exercised. **THAT IS LUCK, NOT GOVERNANCE**, and luck is not repeatable. |
| **The resolution, ratified at the #177 merge** | **A CLOSURE MAY NOT ENTER A NEW SPACE ON ITS OWN AUTHORITY. THE OPERATOR MAY DECLARE ONE, AND THE DECLARATION IS DATA THE CLOSURE READS.** That is the whole shape: it converts a **retroactive blessing into an input**. `materialSpaces.ts` is where the input lives, each row carrying the ruling that authorised it, and the closure now HALTS AND REPORTS the space it declined rather than widening into it. Mutation-verified (**M3**: remove the storefront declaration and `sapCode` is declined — which is exactly what should have happened at 2B-4a). |
| **Disposition** | **CLOSED BY MECHANISM, RECORDED AS A NEAR-MISS.** ⚠️ Note the asymmetry that makes this worth a row of its own: **a closure that widens too far produces a visible wrong number** (`FIELD-SET-CLOSURE-OVERRUNS-01` — 26 PO numbers as material identity, impossible to miss). **A closure that widens by exactly the right amount without authority produces a CORRECT number and no signal at all.** The failure mode with no symptom is the one that needs a mechanism. |

### `EVIDENCE-TIER-INHERITS-THE-CENSUS-01` *(class — generalised from `T3-WAS-CODE-BOUND-01`)*

| | |
|---|---|
| **The class** | **AN EVIDENCE TIER ASSIGNED BY A CENSUS INHERITS THE CENSUS'S BLIND SPOTS.** 2B-3 deliberately DERIVED its evidence tiers rather than stamping them, precisely so they could not drift — and the derivation was correct over a field set that could not see the contradicting code. **The tier was wrong for a reason the tiering could not see.** |
| **The instance** | `PK-PETB-8803`'s storefront row was tiered **T3 · name-only corroboration** because the census read `materialCode` and `materialIds`. It carried `sapCode: 'MAT-10045'` — **code-bound all along.** And the second half is worse than the misclassification: **"no conflicting code" was never checked for ANY of the five T3 rows**, because the check had no way to see a code in that field. A property nobody could evaluate was reported as satisfied by omission. |
| **Standing consequence** | **A DERIVED TIER IS ONLY AS STRONG AS THE SCOPE IT DERIVED OVER, AND MUST STATE THAT SCOPE.** Deriving a claim removes drift; it does not make the claim scope-independent, and the two are easy to confuse because both feel like rigour. Sibling of `DERIVED-OVER-A-CHOSEN-SCOPE-01` (an absence assertion is only as strong as the scope searched) — **this is the same rule for a PRESENCE assertion about evidence.** |

### `EMPTY-INPUT-REPORTS-CLEAN-01` *(class, operator ruling at the #177 merge — **THREE instances, and the third is in the batch about it**)*

| | |
|---|---|
| **The class** | **THE STANDING QUESTION FOR ANY CHECK: WHAT DOES IT REPORT WHEN ITS INPUT IS EMPTY?** The answer must be **RED**, not silence. A check whose input is empty and which reports success is **indistinguishable in the output from a check that examined everything and was satisfied** — and it arrives wearing the appearance of coverage, so it is not merely useless, it is **anti-informative**. |
| **Instance 1 · `--passWithNoTests`** | A runner told to be green when its selector matches nothing. The canonical form, and the one everybody already knows about. |
| **Instance 2 · the vacuous-19 (2B-3)** | `materialMasterAuthoring.test.ts` derived an EMPTY population; **nineteen assertions passed** because every one was a `for (const c of …)` or a `.filter(…).toEqual([])`. Caught by a human noticing that two count assertions disagreed with seventeen silent ones. |
| **Instance 3 · this batch's axes 4 and 5** | `subjectRefIntegrity.test.ts` — both axes filter on the referenced ITEM being found. On the broken fixture it was not found, so **both examined ZERO refs and passed GREEN while the data was wrong.** ⚠️ **In the batch whose subject is checks that pass because they found nothing to do**, written by an author who had just filed instance 2. **THE SHAPE IS NOT AVOIDED BY KNOWING ABOUT IT.** |
| **⚠️ CP-3a CANNOT ANSWER THIS AND IT IS IMPORTANT THAT THE REGISTER SAYS SO** | `npm run gates` asserts the build emitted a bundle, the suite collected at least the floor, and the gate suite passed its count. **The gates assert THEY RAN. Nothing asserts a test EXAMINED anything.** The three instances above all clear every gate. CP-3a closed the "did the gates run" hole and left this one open **one level in** — `SCOPE-DERIVATION-IS-RECURSIVE-01` applied to the gates themselves. |
| **Standing practice, effective now** | **EVERY DERIVED POPULATION CARRIES A FLOOR ASSERTED ON THE SET THE ASSERTIONS ACTUALLY ITERATE** — not on the raw walk that feeds it, and not on a sibling collection. Applied in this batch to `materialIdentity.test.ts` (`CELLS`, `CODE_FIELDS`, `REFS`, `CODES`), `storefrontPointer.test.ts`, and every axis of `subjectRefIntegrity.test.ts`. |
| **The candidate fix — NAMED AND BOOKED, DELIBERATELY NOT BUILT** | **A FOURTH GATE ASSERTION: a floor on ASSERTIONS EXECUTED rather than TESTS COLLECTED.** `scripts/floor.json` would carry an `assertions` count beside `tests` and `files`, and `scripts/gates.mjs` would fail when the suite's executed-expectation count falls below it — the same floor-not-equality ruling as CP-3a, one level down. ⚠️ **BOOKED AS ITS OWN BATCH, ARGUED AND COSTED, NOT SMUGGLED IN BESIDE A REGISTER.** It changes what "green" means in CI, which is exactly the class of change that must not ride another batch's PR. **Open questions it must answer, recorded so the batch starts from them rather than rediscovering them:** whether vitest exposes an executed-expectation count without a reporter plugin; whether the number is stable across parallelism; and whether a floor on assertions has the same "trains people to edit the number" failure CP-3a rejected exact-matching for. |

### Constraints discharged, in writing

- **ZERO REGULATORY SURFACE.** `inferBpom` untouched. `MOCK_ASNS` untouched — all
  seven ASN codes stand. Nothing imports `sdc/bpom.ts`. **2B-5a does NOT unblock
  2B-4b**, and `BPOM-OFF-BY-SPACE-01` does not close until it does.
- **NOTHING WAS ADOPTED.** One pointer repaired to a row that already existed;
  two references moved onto values **read from** the agreement fixture. No master
  row added, moved or relabelled; the master is byte-identical.
- **NO RED PROPERTY WAS WHITELISTED TO CLOSE THE BATCH.** The four code→meaning
  offenders are an exact set, partitioned by owning finding, and one direction of
  the property is fully green.
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`.**
- **FLOOR 2167/180 → 2182/182.** `npm run gates` green.

---

## CP-2 · 2B-5b-i — THE REFERENTIAL LEG, SECOND LANE

**The batch that was dispatched to retire seven codes and retired none, because
the evidence base the retirement rule reads is broken.**

### The governing line

> **A REFERENCE THAT RESOLVES TO THE WRONG OBJECT IS NOT WEAKER EVIDENCE THAN NO
> REFERENCE. IT IS EVIDENCE POINTING THE WRONG WAY, AND A RETIREMENT RULE THAT
> READS IT WILL RETIRE ONTO THE WRONG CODE.**

2B-5b was dispatched to retire the seven `MAT-*` ASN codes onto master rows under
R-1's declared-ownership rule. That rule needs a **matching master row**, and the
strongest available evidence of what an ASN line IS would be the PO line it ships
against. **ONE OF SIX ASNs NAMED A PO ITS OWN SUPPLIER OWNED. ZERO NAMED A PO
CARRYING THE MATERIAL THEY SHIP.** The batch stopped before executing and split
by remedy: **5b-i** repairs references (this block); **5b-ii** owns the codes.

### `ASN-REF-INTEGRITY-01` *(new — the defect, and it is the second lane of a known shape)*

| | |
|---|---|
| **Finding** | **FIVE OF SIX `ASN.poReference` VALUES RESOLVED TO THE WRONG OBJECT OR TO NOTHING.** `ASN-2025-00211` (sup-007) → `PO-2025-00112`, owned by **sup-003**; `ASN-2025-00201` (sup-007) → `PO-2025-00109`, owned by **sup-008**; `ASN-2025-00215` (sup-007) → `PO-2025-00115`, owned by **sup-009**; `ASN-2025-00301` (sup-002) → `PO-2025-00120`, owned by **sup-011**; `ASN-2025-00302` (sup-005) → `PO-2025-00131`, **which did not exist.** Only `ASN-2025-00198` named a PO its own addressee owned — and its material still disagreed. |
| **⚠️ WHY IT IS NOT COSMETIC** | **FOUR WERE CROSS-TENANT.** `poReference` renders to the addressee (`SupplierShipments.tsx:331`) and flows into the GR wizard's draft as `poNumber` (`GRInspectionWizard.tsx:181`) — a Givaudan document number was being shown to PT Berlina. Identity scoping is enforced on `supplierId` (`applySupplierScope`), so the ASN was correctly scoped **to** the right tenant while carrying **another tenant's identifier inside it**. **A SCOPE CHECK CANNOT SEE A FOREIGN IDENTIFIER IN A STRING FIELD.** Same axis 2B-5a called the one that matters most, one lane over. |
| **Disposition** | **REPAIRED ON EXISTENCE AND TENANT; PINNED OPEN ON MATERIAL.** `asnRefIntegrity.test.ts`, nine tests. Axes 1–3 green over an asserted population; axis 4 is an **INVERTED** assertion stating the defect that REMAINS (7 of 7 lines), so 5b-ii closing it turns the pin red and forces a rewrite. Not a whitelist — `ADOPTION-QUEUE-01` was a list that absorbed members for three batches; this absorbs nothing. |

### `REPAIR-IS-NOT-ALWAYS-DERIVABLE-01` *(new class — the honest limit of the 2B-5a method)*

| | |
|---|---|
| **The class** | **A REFERENCE CAN BE REPAIRED BY DERIVATION ONLY WHERE THE TREE CONTAINS THE ANSWER. WHERE IT DOES NOT, THE REPAIR IS AUTHORED — AND MUST SAY SO.** 2B-5a repaired the chase lane by moving each ref onto values **read from** the agreement fixture: the agreement already stated the item, the material and the release date. The ASN lane has no such record. The PO lane holds **no sup-007 order for a fragrance, a 50 ml bottle, an aluminium closure or an active emulsion** — so nothing to read the answer off. |
| **What was done instead** | An **ORDERED SELECTION RULE**, stated in the fixture header and applied in code so it re-derives rather than being trusted: **(1)** same `supplierId` · **(2)** the PO is at or past confirmation · **(3)** `orderDate ≤ eta` · **(4)** not determinately complete. First level yielding a unique answer wins; all five moves are unique at level 2, 3 or 4. |
| **⚠️ The caveat ships labelled, not smoothed** | **THE RULE NARROWS A CANDIDATE SET TO ONE. IT DOES NOT READ AN ANSWER OFF A RECORD.** The axis it repairs (tenant) is determined by the tree; **the axis it does not repair (material) is pinned open rather than quietly satisfied.** Same treatment as R-B's two undischarged caveats — a limit stated is a limit that can be attacked. |

### `LEGALITY-BEATS-PLAUSIBILITY-01` *(new — and a failing test earned it)*

| | |
|---|---|
| **Finding** | **A CONSTRAINT READ OFF THE WRITE PATH BEATS A PLAUSIBILITY HEURISTIC, AND THE DIFFERENCE WAS ONLY VISIBLE BECAUSE SOMETHING WENT RED.** The selection rule first ran without level 2 and sent the Draft `ASN-2025-00215` to `PO-2025-00108` on an outstanding-quantity heuristic. `SupplierShipments.test.tsx` failed: `PO-2025-00108` is **SENT**, not CONFIRMED, and `SupplierShipments.tsx:533` queries `POStatus.CONFIRMED` — **an ASN against an unconfirmed order is a state the product cannot produce.** Consuming it also emptied the "awaiting ASN" panel the create affordance lives in. |
| **Why it is filed rather than just fixed** | The heuristic and the legality rule agreed on four of five rows. **A HEURISTIC THAT IS RIGHT 80% OF THE TIME LOOKS EXACTLY LIKE A RULE UNTIL SOMETHING INDEPENDENT DISAGREES WITH IT.** The failing test was **evidence, not an obstacle**, and it is the only reason the rule now derives the answer instead of guessing it. Sibling of `EVIDENCE-TIER-INHERITS-THE-CENSUS-01`: both are cases where a defensible method was applied over the wrong input. **⚠️ THE RATIO IS THE FINDING, AND IT STAYS IN THIS ROW: FOUR OF FIVE. MOSTLY RIGHT IS WHAT LETS A HEURISTIC SURVIVE LONG ENOUGH TO BE WRONG ONCE.** A rule that failed often would have been replaced; one that failed on the fifth row had already been trusted on four. And what the heuristic proposed was not merely a worse answer — **it was A STATE THE PRODUCT CANNOT PRODUCE** (an ASN against an unconfirmed order), which is the sharpest available test of a selection rule and one no amount of plausibility supplies. |

### `EMPTY-INPUT-REPORTS-CLEAN-01` — ⚠️ **FOURTH INSTANCE, INSIDE THIS BATCH'S OWN SELECTION RULE**

| | |
|---|---|
| **Instance 4 · the three-valued filter (2B-5b-i)** | Level 4 of the selection rule was first written `lineItems.some(l => l.confirmedQty < l.quantity)`. For a PO with **no lines** that returns `false` — silently converting **"undetermined"** into **"fully received"** — and it eliminated `PO-2025-00131`, **the very row R-4 had just authored**. Caught by the pin that asserts the rule re-derives every reference. **⚠️ AND THIS INSTANCE MOVES THE CLASS. Instances 1–3 were CHECKS reporting clean on an empty input — a testing problem. THIS IS A DECISION RULE TREATING AN ABSENCE OF DATA AS A NEGATIVE ANSWER — a LOGIC problem, in code that selects, not code that verifies.** `EMPTY-INPUT-REPORTS-CLEAN-01` is therefore no longer a class about tests: it governs **any predicate whose input can be empty**, anywhere in the tree. And the shape had already been solved here — `bpomApplicable`'s `UNDETERMINED` (2B-4a) exists precisely so an absence of determination cannot be read as a determination. **We authored the three-valued type three batches ago and then wrote the two-valued version of it in a `.some()`.** Knowing the class does not confer immunity to it; the answer is a TYPE that cannot express the mistake, not a habit of remembering. |
| **What makes this instance worth its own row** | Instances 1–3 were checks reporting clean on an empty input. **THIS ONE IS A DECISION RULE TREATING AN ABSENCE OF DATA AS A NEGATIVE ANSWER** — the same shape as `bpomApplicable`'s `UNDETERMINED` (2B-4a), where a three-state field was chosen precisely so an absence of determination could not be read as a determination. **We authored that field to prevent this, then wrote the two-valued version of it three batches later, in a `.some()`.** The class is not about tests. It is about **any** predicate whose input can be empty. |
| **Standing practice, widened** | The 2B-5a practice (*every derived population carries a floor on the set the assertions iterate*) now extends to **decision rules**: a predicate over a collection that can be empty must state which of the three answers an empty collection gets. The gate-level fix remains booked as its own batch. |

### `HEADER-DISAGREES-WITH-LINES-01` *(new — measured, not repaired, and my own claim was the wrong one)*

| | |
|---|---|
| **Finding** | **SEVEN OF 21 POs HAVE A `totalValue` THAT DISAGREES WITH `Σ(quantity × unitPrice)` OVER THEIR OWN LINES** — `PO-2025-00101` (+140 000 000), `00103` (−360 000 000), `00105` (+200 000 000), `00108` (−50 000), `00112` (−150 000 000), `00114` (+100), `00116` (−3 000 000). The spread is the finding: **Rp 100 is a rounding artefact and Rp 360 000 000 is a third of the document's value**, and nothing in the tree distinguishes them. |
| **⚠️ How it was found — an error of mine, filed as one** | A pin in this batch asserted `totalValue === Σ(lines)` **as a fixture-wide invariant**, to justify authoring `PO-2025-00131` with `totalValue: 0`. The property was **verified on three rows and generalised to twenty-one.** It went red immediately. `DERIVED-OVER-A-CHOSEN-SCOPE-01`, committed by the seat, in the pin written to justify a value — and, more precisely, **`EVIDENCE-REPLICATION-NOT-CORROBORATION-01` IN A NEW DRESS: A SAMPLE IS NOT A POPULATION.** Three rows agreeing is three instances of one observation, not evidence of a law over twenty-one; the earlier class said re-reading the same fact in three places is not three facts, and this says checking three members of a population is not checking the population. **The tell is identical in both: AGREEMENT AMONG THE THINGS YOU HAPPENED TO LOOK AT FEELS LIKE CONFIRMATION AND CARRIES NO INFORMATION ABOUT THE THINGS YOU DID NOT.** |
| **Disposition** | **MEASURED AND PINNED AS AN EXACT SET; NOT REPAIRED — pre-existing, and not 5b-i's.** The justification for `totalValue: 0` narrowed to what is actually true: **0 is the sum over an empty line set, of that row.** An exact set is what stops the seven drifting before somebody rules on them. |

### R-4 discharged — `PO-2025-00131` is AUTHORED, and what it deliberately omits

Three independent fixtures referenced this PO and none authored it: invoice
`inv-basf-1180` (`poId: 'po-131'`), supplier document `doc-201`
(`linkedTo: 'PO-2025-00131'`), and `ASN-2025-00302`. The ruling:
**REPOINTING THREE REFERENCES TO HIDE A MISSING OBJECT IS WORSE THAN THE GAP.**

| | |
|---|---|
| **What the three references DETERMINE** | Supplier (`sup-005`, BASF), currency (IDR), and that the supply was delivered. Authored to match, with `orderDate` before the ASN's eta so the ASN's own selection rule holds. |
| **⚠️ What they DO NOT determine, and is therefore NOT invented** | **NO LINE ITEM.** The invoice carries no lines, `doc-201` names no material, and the ASN's lines are the ASN's. Authoring one means choosing between `MAT-40220` — **widening a space R-3 declared dead INTO the declared document lane** — and a master code, **which is the retirement R-1 sent to 5b-ii**. Both forbidden here, so the line set is **empty and pinned**, not silently plausible. A pin also asserts **no `MAT-*` code entered the document lane** by way of this authoring. |
| **Disagreement 1 · MONEY (reported, not resolved)** | `inv-basf-1180` bills **1 120 000 000 IDR**. The storefront's own offer for what the ASN shipped (`c201`, 210 000 IDR/KG × 2 400 KG) is **504 000 000** — a 2.2× gap. **The invoice already states this**: `matchStatus: 'Price Variance'`, `status: 'Disputed'`. No authored total can make them agree without erasing the dispute. |
| **Disagreement 2 · TIME (reported, not resolved)** | The ASN delivered **2025-04-18**; the invoice was submitted **2026-05-14**, thirteen months later. Left as found. |

### R-2 recorded as a **DECISION**, so nobody re-proposes it as an obvious tidy-up

**`MAT-77014` ≠ `PK-ALCP-2441`. NOT MERGED.** *Aluminium closure 24/410* and
*Aluminium Cap 24/410*, same substrate, same neck finish, same UoM, and R-1's own
registry files aluminium caps under **MG-21 closures** — so "closure" and "cap"
are not even different categories in our own vocabulary. `RFQ-2026-011` invited
`sup-005` **and `sup-007`**, and `sup-007` shipped `MAT-77014`. **It looks right.**

| | |
|---|---|
| **Why it is not ruled equal** | **`PK-ALCP-2441` rests on T2-only evidence from an OPEN 2026 RFQ that never awarded** (`RFQ-2026-011`, created 2026-04-22, status Open). **`MAT-77014` shipped on a DELIVERED 2025 ASN** (`ASN-2025-00198`, eta 2025-03-22). **AN OPEN 2026 RFQ IS NOT EVIDENCE ABOUT WHAT WAS RECEIVED THIRTEEN MONTHS EARLIER.** |
| **And the specification argument** | **24/410 fixes the NECK FINISH ONLY** — not liner, colour or closure format. That is the exact axis `PK-PETB-8810` vs `PK-PETB-8825` was split on by operator ruling: same substrate, same 250 ml volume, different closure format, **two items**. Under specification-grain identity, **LOOKS THE SAME IS NOT THE SAME PURCHASABLE ITEM.** `RFQ-2026-011` also carries a programme qualifier the ASN line does not: *"— Wardah serum line"*. |
| **Why it is a DECISION and not a finding** | A finding can be closed by evidence. **This one will be re-proposed as an obvious tidy-up by the next person who reads the two labels**, and 2B-3 already flagged it once in passing (*"the only other metal-substrate candidate is `MAT-77014` … which no batch adopts"*). Recorded with its reasoning so the reasoning is what gets attacked, not the conclusion. |

### R-3 recorded — `MAT-88201`: the contradiction IS the finding

| source | says the material is |
|---|---|
| its own `description` | *Fragrance concentrate – Rose Oud* → `FR-WARD-4440` |
| its `poReference` (pre-repair, `PO-2025-00112`) | `FR-MKOV-5520` + `FR-WARD-4430` — **Givaudan, sup-003** |
| its `supplierId` (`sup-007`) | PT Berlina **Packaging**; its master relationships are `PK-PETB-8810`, `PK-CAPF-8820` |

`FR-WARD-4440`'s only PO is `PO-2025-00118`, **sup-004 Firmenich Malaysia**.
Retiring `MAT-88201` onto it asserts that **A PACKAGING CONVERTER SHIPPED A
FRAGRANCE HOUSE'S CONCENTRATE — not an adoption, a fabrication.** Three sources,
three answers, and a census built on meanings alone reports the mute ones clean.

### ⚠️ CORRECTION AGAINST THE OPERATOR'S OWN PREMISE — B AND C DO **NOT** DISSOLVE

The 2B-5b dispatch held that violations B (`MAT-30110`) and C (`MAT-40220`) would
dissolve *"the moment one lane stops existing."* **The premise is wrong, and the
result is recorded against the premise rather than only as an outcome: THE LANE
CANNOT STOP EXISTING, BECAUSE THERE IS NOTHING TO RETIRE ONTO.** Neither code has
a master row — `RM-PALM-7100` is *Palm Kernel Oil*, `RM-STEAR-7300` is *Stearic
Acid*, and `RM-EMUL-9410` is a **Halal** emulsifier whose qualifier `c201`'s cert
list (REACH, ISO 9001) contradicts. **Both violations stand**, and C's trap —
equal under `toLowerCase`, unequal as written — stands with them.

### ⚠️ `BPOM-OFF-BY-SPACE-01` — AMENDED IN PLACE. The `false` is asserted AGAINST evidence

**This is the strongest finding of the 2B-5b investigation and it is not a prefix
argument.** `doc-201` — **"BPOM Notification — TD.02.02.66.10.23.0311"**, category
`BPOM Regulatory`, issuer BPOM, supplier `sup-005` — carries
`linkedTo: 'PO-2025-00131'`. That is the PO whose ASN (`ASN-2025-00302`) carries
**`MAT-40220`**, for which `inferBpom` returns **`false`**.

> **THE TREE ALREADY STATES THAT A BPOM REGISTRATION GOVERNS THIS SUPPLY. THAT
> `false` IS ASSERTED AGAINST IN-TREE EVIDENCE, NOT MERELY IN ITS ABSENCE — WHICH
> IS A MATERIALLY WORSE CLAIM THAN THE FAIL-OPEN WE FILED.**

The original finding was that a prefix rule fails open on entire vocabularies —
bad, but a **silence**: nothing in the tree contradicted the `false`. Something
does. `doc-202` (*REACH Compliance / Safety Data Sheet — Emulgade*, issued by
**BASF SE Regulatory Affairs**, `linkedTo: 'All emulsifier grades'`)
independently corroborates BASF ownership and a **REACH-not-halal** regulatory
frame — the same datum that separates `MAT-40220` from `RM-EMUL-9410`
*(Glyceryl Stearate SE (Halal Emulsifier))*. Pinned in
`asnRefIntegrity.test.ts`. **Blast radius remains SEVEN. The finding does not
close until 2B-4b.**

### Constraints discharged, in writing

- **ZERO REGULATORY SURFACE.** `inferBpom` untouched and unedited. Nothing wired.
  **No `MAT-*` code retired, no master row authored** (R-1/R-2/R-3). The seven
  ASN codes stand, all seven. **`BPOM-OFF-BY-SPACE-01` does not close here.**
- **NOTHING WAS ADOPTED.** One PO authored because three lanes already referenced
  it; five references moved within the existing PO population; the master is
  **byte-identical**.
- **NO RED PROPERTY WAS WHITELISTED.** The open material axis is an **inverted**
  assertion over an exact set of seven, which goes red when 5b-ii fixes it.
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`.**
- **FLOOR 2182/182 → 2192/183.** `npm run gates` green.

### `SCOPE-CANNOT-SEE-INSIDE-A-STRING-01` *(new class, operator ruling at the #178 merge)*

| | |
|---|---|
| **The class** | **AN IDENTITY-SCOPING CHECK GUARDS THE ROWS IT RETURNS. IT CANNOT SEE A FOREIGN TENANT'S IDENTIFIER CARRIED INSIDE ONE OF THOSE ROWS.** `applySupplierScope` filters on `supplierId` and is correct: every ASN it returned to PT Berlina *was* PT Berlina's ASN. **Four of those correctly-scoped rows carried another tenant's purchase-order number in a `string` field**, and `poReference` renders to the addressee (`SupplierShipments.tsx:331`) and flows into the GR wizard's draft as `poNumber` (`GRInspectionWizard.tsx:181`). A Givaudan document number reached PT Berlina **through a scope check that did its job.** |
| **Why it generalises well past this lane** | Scoping is enforced at the ROW boundary; **cross-tenant leakage happens at the FIELD granularity**, and the two are different resolutions of the same question. Every field that stores a foreign object's identifier as an opaque string is a candidate: `poReference`, `poNumber`, `prReference`, `sourceOfSupply`, `linkedTo`, `agreementId`, `trackingNumber`, `sapFiDoc`. **A SCOPE CHECK IS A FILTER OVER ROWS; AN IDENTIFIER IS A CLAIM ABOUT AN OBJECT. NOTHING RECONCILES THE TWO UNLESS SOMETHING RESOLVES THE REFERENCE.** |
| **What actually catches it** | Referential integrity, not scoping — which is why `ASN-REF-INTEGRITY-01`'s axis 2 is the one that mattered, and why 2B-5a called the same axis the one that mattered in the chase lane. **Two lanes, two independent discoveries, same axis.** The remaining string-identifier fields above are **not audited**; that is a sweep, not a batch, and it is unbooked. |
| **Disposition** | **FILED AS A CLASS.** Repaired in the ASN lane (2B-5b-i) and the chase lane (2B-5a). Neither repair generalises on its own — what generalises is the question: *which fields hold another tenant's identifier, and what resolves them?* |

### `PROBE-NEEDS-PROBING-01` *(new — **SECOND TIME**, and the shape is by now familiar)*

| | |
|---|---|
| **Finding** | **A MUTATION PROBE SILENTLY DID NOT APPLY AND REPORTED A FALSE ALL-CLEAR.** M1 (revert `ASN-2025-00211` to the cross-tenant Givaudan PO) targeted an anchor string that did not exist in the file, so the edit was a no-op, the suites passed, and the run printed `26 passed` — **which reads exactly like "the pin does not detect this mutation."** Re-run correctly: **3 red.** The pin was fine the whole time; the probe was not. |
| **⚠️ Why it is its own row** | **THE PROBE MET THE CLASS IT WAS PROBING FOR.** A mutation probe whose edit fails is a check whose input is empty — `EMPTY-INPUT-REPORTS-CLEAN-01` one level up, in the apparatus that verifies the pins rather than in the pins. And the failure direction is the dangerous one: a probe that does not apply looks like a **gap in coverage**, so the honest response (report it undetected) would have libelled a working pin, and the convenient response (assume the probe applied) would have hidden a broken one. **Second appearance** — 2B-4a's M8 was reported undetected and the operator ruled *A PROBE THAT CANNOT BITE IS DISCLOSED, NEVER CONTORTED*; that one genuinely could not bite. **This one could, and lied about it.** The two are not the same and the register should not blur them. |
| **The cheap fix, and it is not booked as a batch** | **EVERY PROBE ASSERTS ITS OWN EDIT LANDED** before running anything — a `str.count()` check, or a diff that must be non-empty. One line per probe. Applied ad-hoc here (the corrected M1 asserted the occurrence count first, which is how the miscount surfaced); **not yet standing practice, and it should be.** |

### What 5b-ii inherits

Five codes with **no master row** (`MAT-88207`, `MAT-55022`, `MAT-55031`,
`MAT-30110`, `MAT-40220`) plus two the operator has now ruled **not** retirable
(`MAT-77014` per R-2, `MAT-88201` per R-3). The material axis of
`asnRefIntegrity.test.ts` is its acceptance test: **it is inverted today and must
be rewritten when it goes green.** `PO-2025-00131`'s empty line set is the second
thing it owns.

---

## CP-2 · 2B-5b-ii — AUTHORING THE SEVEN. **THE THIRD SPACE IS EMPTY.**

`MAT-SPACE-UNDECLARED-01` opened at 2B-0 with nine codes in a Paragon space no
declaration named. It closes here at seven, by authoring rather than by
adjudication — and the four batches between it and this one are what made the
authoring honest rather than a guess.

### `MAT-SPACE-UNDECLARED-01` — **CLOSED**

| | |
|---|---|
| **What closes it** | Seven canonical master rows authored from the ASN lane, and the ASN lines retired onto them. `UNDECLARED_SPACE` is `[]`, asserted **inverted rather than deleted** so re-introducing the vocabulary turns the pin red. |
| **⚠️ The prefix survives and the SPACE does not, and the register must not blur them** | `MAT-10046` and `MAT-10089` remain — the two **unbacked storefront pointers**, on which no operator has ruled. Under R-D the storefront is a POINTER surface, not a code space: these are supplier CLAIMS about Paragon codes that do not exist. Pinned as two separate assertions (`UNDECLARED_SPACE === []` and `CODES.filter(startsWith('MAT-'))`) so neither can stand in for the other. |
| **The arc, in one line each** | 2B-0 derived the lane set and found the space · 2B-1 declared it (R-3) and booked its retirement · 2B-2/2B-3 emptied the *declared* lanes around it · 2B-4a measured the regulatory exposure and built the mechanism · 2B-5a repaired the pointers into it · 2B-5b-i repaired the references and proved nothing could be retired onto · **2B-5b-ii authored what was missing.** |

### The population, and how each row was tiered

**Tiers are COMPUTED, never stamped** (2B-3's rule, unchanged — a stamp drifts
from the thing it describes). `asnMasterAuthoring.test.ts` counts, per row,
code-bound meanings · unit statements · reference-bound documents · contradicting
sources, and asserts the whole table exactly.

| code | was | rests on |
|---|---|---|
| `FR-ROUD-4470` | `MAT-88201` | **its own description, and nothing else — with TWO sources contradicting it** |
| `PK-PETB-8804` | `MAT-88207` | its own description; supplier corroborates (sup-007 is a declared PET manufacturer) |
| `PK-ALCP-2450` | `MAT-77014` | its own description |
| `AI-NIAC-6612` | `MAT-55022` | its own description; cool-chain handling distinguishes it from the powders |
| `AI-HYALU-6615` | `MAT-55031` | its own description |
| `RM-PSTN-7150` | `MAT-30110` | description **+ a storefront row stating `uom: 'KG'`** |
| `RM-EMUL-9440` | `MAT-40220` | description **+ a unit + `doc-201`**, and `doc-202` by name |

⚠️ **`AsnLineItem` HAS NO `uom` FIELD** — asserted structurally, not by
inspection. So **no ASN line states a unit for anything**, five rows take
`canonicalUom` from their group's convention and say so, and the two that do
better do it through a **pointer** (R-D), which is corroboration and not identity.

### `EVIDENCE-STANDARD-SURVIVED-THE-REPAIR-01` *(new — the batch's own discipline, asserted)*

| | |
|---|---|
| **The rule** | **A REPAIRED REFERENCE TELLS YOU WHO AND WHEN. IT DOES NOT TELL YOU WHAT.** 5b-i fixed the tenant axis of every `ASN.poReference`; the temptation this batch had to refuse was to read the now-resolving parent PO as material evidence. **NO LABEL IN THIS BATCH IS TAKEN FROM A PO LINE**, and the pin proves it the hard way: for `FR-ROUD-4470` it asserts that the repaired parent orders `PK-PETB-8801` and **not** this code. |
| **Why it needed a rule** | The repair made the references *look* authoritative. A reference that resolves is not a reference that agrees — the material axis is still open at 7 of 7 — and the gap between "resolves" and "agrees" is exactly where a plausible-looking label would have come from. |

### R-2 and R-3, recorded as DECISIONS and made executable

**`PK-ALCP-2450` ≠ `PK-ALCP-2441`.** *Aluminium Closure 24/410* and *Aluminium
Cap 24/410* — same substrate, same neck finish, same unit, and R-1's registry
files both under **MG-21 closures**, so "closure" and "cap" are not even
different categories in our vocabulary. **It will be re-proposed as an obvious
tidy-up**, so the reasons are assertions rather than prose: the source ASN's
`status` is `Delivered` and its `eta` **precedes `RFQ-2026-011`'s creation date**
— *an open 2026 RFQ is not evidence about what was received thirteen months
earlier* — and `PK-PETB-8810`/`PK-PETB-8825`'s labels are pinned beside them as
the standing precedent that **24/410 fixes the neck finish only**. The code is
deliberately **not** `2442`: an adjacent number invites the merge.

**`FR-ROUD-4470` rests on its description alone.** Its supplier is a packaging
converter; its repaired parent PO orders PET bottles; and `FR-WARD-4440` — the
row R-3 refused to retire it onto — belongs to **sup-004 Firmenich**. All three
asserted. **THE CONTRADICTION IS PART OF THE ROW'S PROVENANCE AND AUTHORING DOES
NOT ERASE IT.** ⚠️ And the mnemonic is a signal, not a gap: every other `FR-*`
mnemonic is a **brand**; this one is a scent, because no record attributes it to
one. A code shaped unlike its siblings is the honest rendering of a row whose
siblings have provenance it lacks.

**`RM-PSTN-7150` — stearin is not stearic acid.** `RM-STEAR-7300` shares four
letters and is a fatty acid; `RM-PALM-7100` shares the RBD process word and is a
different feedstock. Two plausible merges, both wrong, both available to anyone
reading labels. All three are MG-10, which makes the pin's point: **SHARING A
GROUP IS NOT AN ARGUMENT FOR SHARING AN IDENTITY** — the same sentence the two
aluminium closures need. The mnemonic `STEAR` was deliberately not reused.

### Groups — the dispatch's question, answered by R-2's own criterion

**No group was invented, and the refusal is the assertion.** MG-10 exists because
2B-1 refused to force feedstocks into a formulation group, so this registry
demonstrably *does* grow when a set needs it to.

- **`RM-PSTN-7150` → MG-10**, by R-2's written test: members are *"INPUTS TO the
  materials in MG-01..06, not members of them"*. A palm fraction is; `RM-PALM-7100`
  is already there. **This is the first batch to APPLY a group declared ahead of
  its members, and the test of such a declaration is whether a later batch can
  apply it without re-arguing it.** It could.
- **The two emulsions → MG-04.** A dosed active emulsion **enters** the
  formulation grain, so it is not upstream of it; and the MG-01..06 axes are
  **functional** — they separate surfactant from emollient from active, never
  powder from emulsion. **THERE IS NO PHYSICAL-FORM AXIS AND THIS SET SUPPLIES NO
  REASON TO ADD ONE**: they differ from `AI-NIAC-6605` in concentration and form,
  which is ITEM grain under D-IDENTITY-GRAIN, not group grain.

### ⚠️ `MG-NO-EMULSIFIER-GROUP-01` — now **THREE rows deep**, escalated not fixed

`RM-EMUL-9440` goes to **MG-02 *(Emollients / oils / esters)*, and it is wrong
for all three of MG-02's emulsifiers.** An emulsifier is not an emollient, an oil
or an ester. Placed with its siblings rather than somewhere better because moving
them is a **registry ruling** (the MG-10 shape: declare the group, then populate
it) and inventing MG-07 inside an authoring diff is the decision-smuggling 2B-1
named. **The finding grows by one and is put to the operator; the diff does not
quietly resolve it.**

### ⚠️ THE BPOM FIRING SET MOVED — 16 → 19, and the CAUSE is the finding

Reported line by line as the dispatch required, and asserted rather than
described.

| was | → now | prefix rule | master says |
|---|---|---|---|
| `MAT-88201` | `FR-ROUD-4470` | **fires (new)** | APPLICABLE |
| `MAT-55022` | `AI-NIAC-6612` | **fires (new)** | APPLICABLE |
| `MAT-55031` | `AI-HYALU-6615` | **fires (new)** | APPLICABLE |
| `MAT-88207` | `PK-PETB-8804` | no | NOT_APPLICABLE ✅ agree |
| `MAT-77014` | `PK-ALCP-2450` | no | NOT_APPLICABLE ✅ agree |
| `MAT-30110` | `RM-PSTN-7150` | no | **UNDETERMINED** ⚠️ |
| `MAT-40220` | `RM-EMUL-9440` | no | **APPLICABLE** ⚠️ |

> **NO COMPLIANCE RULE WAS CONSULTED. A NAMING CONVENTION MOVED THREE LOTS'
> REGULATORY TREATMENT.** Three of the seven took `AI-`/`FR-` mnemonics because
> of their material GROUP, and `inferBpom` parses the first three characters.

Movement is in the direction of MORE checking, never less — asserted, because a
batch that turned a BPOM check **off** would be a regression regardless of its
reasons. And the standing "the firing set moved by zero" assertion **breaks here
deliberately**: 2B-2 and 2B-3 made **thirty** codes resolvable and moved it by
**zero**; 2B-5b-ii made **seven** resolvable and moved it by **three**. The
difference is not evidence, or care, or lane — it is three characters.

### ⚠️ `INFERBPOM-MUST-BE-RETIRED-01` — **THE CASE, DEMONSTRATED RATHER THAN ARGUED.** *(ratified at the #179 merge — THE ROW 2B-4b READS FIRST)*

| | |
|---|---|
| **The demonstration** | **A REGULATORY CHECK CHANGED BECAUSE OF A NAMING CONVENTION.** The BPOM firing set moved **16 → 19** at 2B-5b-ii. Three of the seven authored rows took `AI-`/`FR-` mnemonics **because of their material GROUP**; `inferBpom` parses the first three characters of a code; **NO COMPLIANCE RULE WAS CONSULTED, AND NOBODY DECIDED THAT THREE LOTS NOW NEED A BPOM LOT CHECK.** Every prior argument for retiring this rule was a description of a hazard. This is the hazard happening, in a merged diff, measured. |
| **Why the contrast is the proof, not the count** | 2B-2 and 2B-3 made **THIRTY** codes master-resolvable, on carefully ratified evidence, across two batches — and moved the firing set by **ZERO**. 2B-5b-ii made **SEVEN** resolvable and moved it by **THREE**. **THE DIFFERENCE IS NOT EVIDENCE, OR CARE, OR LANE. IT IS THREE CHARACTERS.** A mechanism that is unmoved by thirty ratifications and moved by one naming choice is not reading the thing it claims to read. |
| **And it cuts both ways, which is worse** | `PREFIX-RULE-SUCCEEDS-BY-ACCIDENT-01` (below): the 2B-0 pair that proved the fail-open now **AGREES** — both fragrance concentrates fire — and that is also nobody's decision. **A RULE THAT CAN BE ACCIDENTALLY RIGHT CANNOT BE AUDITED**, because a correct output is not evidence the reasoning existed. |
| **What 2B-4b inherits, stated so it does not have to re-derive it** | The gate is **DISCHARGED** — every code `asnStore` can hand the wizard is master-resolvable, so a fail-closed master rule refuses nothing legitimate. The master already carries the replacement (`bpomApplicable`, 2B-4a, three-valued, fail-closed) on all 42 rows. **TWO ROWS ALREADY DISAGREE WITH THE WIZARD IN WRITING**: `RM-EMUL-9440` (`APPLICABLE` on `doc-201`) and `RM-PSTN-7150` (`UNDETERMINED` against a confident negative). Retiring `inferBpom` is now a swap with a measured before-and-after, not a redesign. |
| **The standing assertion was BROKEN DELIBERATELY, not relaxed** | *"The firing set moved by zero"* held through 2B-2, 2B-3 and 2B-4a and is the property this arc protected. 2B-5b-ii is the first batch that could move it, and it did — so the pin was **rewritten to assert the new set exactly, with the three new members annotated by cause**, rather than loosened to a count or a range. **A STANDING ASSERTION THAT STOPS BEING TRUE IS REWRITTEN WITH ITS REASON, NEVER WIDENED UNTIL IT PASSES AGAIN.** |

### `PREFIX-RULE-SUCCEEDS-BY-ACCIDENT-01` *(new — the other half of the fail-open)*

The 2B-0 pair that made `BPOM-OFF-BY-SPACE-01` impossible to argue with —
`MAT-88201` false, `FR-WARD-4440` true, two fragrance concentrates with opposite
regulatory treatment — **now agrees.** Both fire. **Nobody decided that.**

> **A PREFIX RULE DOES NOT ONLY FAIL OPEN. IT ALSO SUCCEEDS BY ACCIDENT, AND THE
> TWO ARE INDISTINGUISHABLE FROM THE OUTPUT.** The pin keeps both rows and adds
> the master's own determination beside each, so the row is now correct twice
> over and the wizard still cannot tell you why.

### ⚠️ `BPOM-OFF-BY-SPACE-01` — the SPACE is gone, the FAIL-OPEN is not

**It does not close here.** Its blast radius was corrected to **SEVEN** at 2B-5a,
and those same seven lines still receive the wrong answer — they simply no longer
receive it for the reason the finding is named after.

> **A FINDING NAMED AFTER ITS CAUSE OUTLIVES ITS CAUSE.**

Of the seven received lines, four still get `false` from the prefix rule: **two
correctly** (packaging) and **two not**. And the two are now worse than before:

- **`RM-EMUL-9440` — the master says `APPLICABLE` and the wizard says no.** It is
  the **only row in 42** whose `bpomApplicable` rests on a **document** rather
  than a class default (`doc-201`, BPOM Notification TD.02.02.66.10.23.0311,
  linked to `PO-2025-00131`, this line's own parent). Until now the two
  mechanisms had **never disagreed on an answerable row** — the fail-open was
  always visible as a silence. **It is a contradiction in writing now**, pinned
  as an exact set of one in `bpomApplicability.test.ts`.
- **`RM-PSTN-7150` — the master records `UNDETERMINED` and the prefix rule
  asserts a confident negative.** `PREFIX-RULE-ASSERTS-A-NEGATIVE-01`'s eleventh
  row, and the first of them that **arrives on the receiving surface**.

**The class-rule exception is recorded, not loosened.** `provisionalBpomForGroup('MG-02')`
returns `UNDETERMINED`; this row is `APPLICABLE` on evidence. **A CLASS DEFAULT IS
WHAT YOU USE WHEN NOBODY HAS DECIDED. IT IS NOT EVIDENCE, AND IT DOES NOT OUTRANK
EVIDENCE.** The exception is an exact set of one so a second cannot arrive quietly
and turn a recorded ratification into an undocumented second mechanism.

### `DOCUMENT-NAMES-A-CATEGORY-NOT-A-THING-01` *(new — and it corrected my own count)*

The tier table first claimed `RM-EMUL-9440` had **two** documents. It has **one**.
`doc-202` (*REACH SDS — Emulgade*, BASF SE Regulatory Affairs) carries
`linkedTo: 'All emulsifier grades'` — **prose, not a document reference** — so
nothing RESOLVES it to this supply the way `doc-201` resolves through
`PO-2025-00131`. It corroborates by NAME and by nothing structural.

> **A DOCUMENT THAT NAMES A CATEGORY IS NOT A DOCUMENT THAT NAMES A THING.**

The count was corrected rather than the predicate loosened, and doc-202 is
asserted separately with its prose target spelled out. Cousin of
`PROSE-COUNTS-AS-A-SITE-01`: a string that reads like a reference and resolves to
nothing.

### `PROSE-COUNTS-AS-A-SITE-01` — **THIRD APPEARANCE**, met while writing this batch

`asnMasterAuthoring.test.ts` originally re-asserted that the GR wizard does not
mention `bpomOf` — and **naming the mechanism in a string literal ADDED A SITE TO
THE THING BEING COUNTED**, turning the canonical "no consumer" pin red. The fix
was to **delete the duplicate**, not to widen the exact set: a second copy of one
check is one check (`EVIDENCE-REPLICATION-NOT-CORROBORATION-01`), and this copy
would have cost the original its accuracy.

### `PROBE-NEEDS-PROBING-01` — the fix from #178 applied, and CONTROLLED

Every probe in this batch **asserts its own edit landed before running anything**,
and a ninth **control probe with a deliberately non-existent anchor** was run to
confirm the guard fires. It reported **`PROBE FAILED TO APPLY — NOT A RESULT`**
rather than a green suite. **A guard that has never been seen to fire is a guard
you are trusting, not one you have tested.** **RATIFIED AS STANDING PRACTICE AT
THE #179 MERGE**, in both halves and not just the first:

1. **EVERY MUTATION PROBE ASSERTS ITS OWN EDIT LANDED** before running anything —
   an occurrence count, or a diff that must be non-empty. One line per probe.
2. **AND AT LEAST ONE CONTROL PROBE PER BATCH DELIBERATELY FAILS TO APPLY**, so
   the guard is observed firing rather than assumed present.

The second half is the one that is easy to skip and is the reason the practice
exists: a guard that only ever runs on probes that work is indistinguishable
from no guard at all. It is the same shape as
`EMPTY-INPUT-REPORTS-CLEAN-01` one level up — **the apparatus that verifies the
pins needs the same question asked of it that the pins ask of the code.**

### The partition pin caught it first

`materialMasterAdoption.test.ts`'s *"no master code arrived from a fourth route"*
named all seven new rows, by code, before anything else in the suite noticed
them. **The fix was a FOURTH BUCKET with its own derived definition** —
`AUTHORED_ASN`, codes whose only non-master source is the ASN lane module — not a
widened filter, and not adding them to `AUTHORED`, which would have made
"authored from the RFQ lane" quietly untrue. `5 + 25 + 5 + 7 = 42` is asserted as
arithmetic so a row cannot go missing between two counts that each look right.

⚠️ And `ADOPTED` correctly excluded the seven **with no edit at all**: its
`laneRefs` scope is `/src/data/mock*.ts`, the declared document lane, and the ASN
fixtures are not in it. **A scope drawn carefully three batches ago prevented a
batch authoring from an undeclared lane from being counted as ratifying the
declared one.**

### The 2B-4 gate — DISCHARGED

Every code `asnStore` can hand the GR wizard is now in the master, so a
fail-closed rule keyed on master membership would refuse **nothing** that is
legitimately received. That was `2B-4b`'s one precondition.
`masterMissRefusal.test.ts`'s *"it is NOT CLOSED"* assertion is **inverted**, and
derived from the runtime input rather than from three codes typed by hand.
**Mechanism early (2B-4a) · precondition discharged (here) · behaviour late
(2B-4b)** — three separate facts, and 2B-4b changes only the third.

### Violations B and C — DISSOLVED, and C's trap the right way round

5b-i reported they could **not** dissolve because there was nothing to retire
onto. Authoring supplied it. The master declares one meaning per code and both
lanes read it, so the code→meaning offenders go **four → two** — what survives is
exactly `IDENTITY-GRAIN-ASYMMETRY-01`'s seed pair, which no batch of this arc was
chartered to touch.

⚠️ **C's trap was pinned as two strings unequal as written and EQUAL under
`toLowerCase`**, precisely so nobody could make it vanish by normalising a
capital. **They were not made equal. A third record declared which one is the
meaning, and the other two now quote it.** Normalisation hides a disagreement;
declaration ends one. The difference is invisible in a diff and total in the
reasoning, which is why it is asserted rather than described.

### `RETIRE-THE-CODE-RETIRE-THE-MEANING-01` *(new — the step that was nearly missed)*

Changing `materialCode` alone would have left all seven ASN lines stating a
description that disagrees with their own new master row — **seven brand-new
one-code-two-meanings violations, manufactured by the fix**, in the batch whose
job was to remove two. Under R-1 the master's meaning wins, so the lane took it.

> **A RETIREMENT THAT MOVES THE IDENTIFIER AND LEAVES THE MEANING BEHIND HAS
> SPLIT ONE ROW INTO TWO CLAIMS.** Caught because the census asserts the property
> generally rather than listing known offenders.

### Constraints discharged, in writing

- **`inferBpom` UNTOUCHED AND UNEDITED. NOTHING WIRED.** The wizard still runs
  the prefix rule, asserted in the batch with the most reason to break it.
  **`BPOM-OFF-BY-SPACE-01` does not close here** — 2B-4b closes it, at seven.
- **NO GROUP INVENTED.** The registry is still 2B-1's thirteen, asserted.
- **SEVEN WAS NOT A TARGET.** Every row that could not be authored honestly would
  have been left; all seven could, and each says what it rests on.
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`.**
- **FLOOR 2192/183 → 2209/184.** `npm run gates` green.

### What is left

`MAT-10046` / `MAT-10089` — two unbacked storefront pointers, no ruling ·
`IDENTITY-GRAIN-ASYMMETRY-01`'s seed pair, the operator's ·
`MG-NO-EMULSIFIER-GROUP-01`, now three rows deep · the ASN→PO **material** axis,
still open at 7 of 7 and now for a PO-lane reason rather than a master one ·
`2B-4b`, which is reachable.

---

## CP-2 · 2B-4b — RETIRING `inferBpom`. **THE REGULATORY GATE FAILS CLOSED.**

`inferBpom` is deleted. The GR wizard reads `bpomApplicable` from the material
master through `bpomOf`, and a line the master cannot answer for **REFUSES BY
NAME** rather than passing silently. **CP-2 closes here.**

> **A REGULATORY GATE THAT FAILS OPEN IS WORSE THAN ONE THAT FAILS LOUD.**

### ⚠️ `BPOM-OFF-BY-SPACE-01` — **CLOSED. At seven, as a CONTRADICTION.**

Filed at 2B-0 as a vocabulary escaping a check. Corrected at 2B-5a from nine to
seven (population ≠ exposure). Amended twice in place. Closed here, and the shape
it closed in is not the shape it opened in:

| | |
|---|---|
| **Opened as** | An entire code space (`MAT-*`) that no `AI-`/`FR-` test could ever match, so every line in it silently reported "no BPOM check required". |
| **Closed as** | A **contradiction between two mechanisms on an answerable row** — `RM-EMUL-9440`, master `APPLICABLE` on `doc-201`, prefix `false` — plus two rows where the master records an explicit absence of determination against a confident negative. |
| **Why the difference matters** | **A FINDING NAMED AFTER ITS CAUSE OUTLIVES ITS CAUSE.** 2B-5b-ii emptied the space and the finding did not close, because the seven lines still got the wrong answer for a different reason. Closing it required removing the MECHANISM, not the vocabulary. Had the finding been retired when its name stopped applying, the fail-open would have survived under a heading nobody read. |
| **Radius** | **SEVEN**, unchanged from the 2B-5a correction. |

### The before-and-after, line by line — every line the wizard can be fed

Nine lines across eight receivable documents, from **both** shipment lanes.
*(`inferBpom` = the retired prefix rule; `bpomOf` = the master lookup now wired.)*

| lane | document | code | `inferBpom` | `bpomOf` | moved |
|---|---|---|---|---|---|
| shipment | `ASN-2026-012` | `PK-PETB-8801` | false | not required | — |
| shipment | `ASN-2026-013` | `PK-PETB-8802` | false | not required | — |
| shipment | `ASN-2026-014` | `RM-COCO-8200` | false | **REFUSES** (UNDETERMINED) | ⚠️ |
| shipment | `ASN-2026-015` | `FR-WARD-4410` | **true** | **REQUIRED** | — |
| ASN | `ASN-2025-00211` | `FR-ROUD-4470` | **true** | **REQUIRED** | — |
| ASN | `ASN-2025-00211` | `PK-PETB-8804` | false | not required | — |
| ASN | `ASN-2025-00198` | `PK-ALCP-2450` | false | not required | — |
| ASN | `ASN-2025-00301` | `RM-PSTN-7150` | false | **REFUSES** (UNDETERMINED) | ⚠️ |
| ASN | `ASN-2025-00302` | `RM-EMUL-9440` | false | **REQUIRED** | ⚠️ |

**Three of nine moved, and all three in the same direction: toward more
checking.** Nothing moved from checked to unchecked — asserted, not observed,
because a batch that turned a BPOM check OFF would be a regulatory regression
regardless of its reasons.

**On the master's 42 rows the two mechanisms agree on 30 and differ on 12** —
eleven where the prefix asserts a negative and the master records no ruling, and
**one where they contradict each other outright** (`RM-EMUL-9440`).

### `INFERBPOM-MUST-BE-RETIRED-01` — **DISCHARGED**

The row 2B-4b was told to read first. Its case was *a regulatory check changed
because of a naming convention* — the firing set moving 16 → 19 at 2B-5b-ii for
reasons that had nothing to do with BPOM. **The mechanism that made that possible
no longer exists.** `RM-EMUL-9440` was the settlement case, and it settled the
way the row said it should: **where the master and the wizard disagreed, the
master won**, and the disagreement was between a document and three characters.

### ⚠️ `DERIVED-OVER-A-CHOSEN-SCOPE-01` — **FIFTH INSTANCE, AND IT IS MY OWN GATE**

**The 2B-4 gate was discharged over the wrong population, and I am the one who
discharged it.** The wording carried from 2B-5b-ii through the #179 close report
was *"every code `asnStore` can hand the wizard is master-resolvable"* — measured
honestly, asserted, true. **The GR wizard's source list is `shipments ∪ asns`.**
`asnStore` is one of the two, and `mockShipments.ts` — the `ASN-2026-*` lane
feeding four of the eight receivable documents — was never in the measurement.

| | |
|---|---|
| **The scope was CHOSEN, not derived** | 5b-i scoped itself to `MOCK_ASNS` and nobody asked whether that was the only ASN lane. The gate then inherited that scope without re-deriving it from the consumer. **A GATE IS A MEASUREMENT, AND A MEASUREMENT INHERITS THE POPULATION OF WHOEVER TOOK IT LAST.** |
| **⚠️ It held anyway — and that is the uncomfortable part** | Re-measured over the true population: **9 reachable lines · 9 distinct codes · ZERO unresolvable.** All four shipment-lane codes happen to be in the master. **The gate was RIGHT AND UNJUSTIFIED**, which is indistinguishable from right until it isn't — the same sentence `PREFIX-RULE-SUCCEEDS-BY-ACCIDENT-01` carries, applied to my own verification instead of to the code. |
| **What the widened measurement DID find** | `RM-COCO-8200` on `ASN-2026-014` — a **second** UNDETERMINED refusal, on a dock arrival, invisible to the ASN-only scope. So the wiring blocks **two** receivable documents, not one. Reported before building, not discovered after. |
| **Fix** | The gate is now asserted **over the wizard's own source rule** (`GRInspectionWizard.test.tsx` derives its eligible set from `mockShipments` by status, exactly as the component does) rather than over a lane somebody named. |

### ⚠️ THE THIRD ASN LANE — 3 of 18 references point into another tenant's PO

Filed, not fixed (dispatch: its own batch). Same defect as `ASN-REF-INTEGRITY-01`,
same disclosure shape as `SCOPE-CANNOT-SEE-INSIDE-A-STRING-01`, and the same root
cause as the gate above: **nobody asked whether `MOCK_ASNS` was the only ASN lane.**

```
mockShipments.ts — 18 rows · 15 tenant-correct · 3 WRONG
  shp-002 (sup-007) → PO-2025-00114, owned by sup-006 (Evonik)      [ASN-2026-002]
  shp-011 (sup-010) → PO-2025-00115, owned by sup-009 (Zhejiang)    [ASN-2026-011]
  shp-018 (sup-006) → PO-2025-00118, owned by sup-004 (Firmenich)   [ASN-2026-018]
```

**Zero unresolved references** — every `poNumber` names a real PO. The failure is
purely on the tenant axis, which is why `applySupplierScope` cannot see it: it
filters ROWS, and this is a foreign tenant's identifier sitting INSIDE a string
field on a row that is correctly scoped. None of the three is currently receivable
(`Pending ASN` / `Customs Clearance` / `Delayed`), so this batch's surface is
unaffected — that is a fact about fixture statuses, not a mitigation.

### `INFERHALAL-READS-PROSE-01` *(new — reported, NOT folded in)*

`inferHalal(description)` survives. It is the same defect and on two axes it is
**worse**, and it is left standing for a reason that is not "it is safer".

| | |
|---|---|
| **Worse, axis 1** | `inferBpom` parsed a code **we** author. This reads `description`, which on the ASN lane is a **supplier-submitted free-text field**. A regulatory check keyed on prose a counterparty types is weaker than one keyed on a code space we control. |
| **Worse, axis 2 — MEASURED** | Across both lanes the halal check fires on `RM-EMUL-9410` (*"Glyceryl Stearate SE (Halal Emulsifier)"*) and `RM-EMUL-9430` (*"Polysorbate 80 — Halal, …"*) and **NOT on `RM-EMUL-9440`** (*"Emulgade SE-PF Emulsifier"*). **Three emulsifiers, one material group, and the check fires on two of them because a fixture author wrote a word into a product name.** `RM-PSTN-7150` — RBD palm stearin, the single most halal-load-bearing row in the master — does not fire either. |
| **The one thing it does NOT do** | **No code gets two different halal answers**: 0 of 19 distinct codes carry descriptions that disagree with each other. And the 5b-ii description rewrite moved the halal firing set by **ZERO** — none of the seven old strings contained the word. Checked rather than assumed, because that rewrite is exactly the act that moved the BPOM set by three. |
| **⚠️ WHY IT NEEDS ITS OWN BATCH** | **Retiring it requires a field that does not exist.** `MaterialMasterEntry` has no `halalApplicable`. Authoring one — plus its class rule, its provisional seed on all 42 rows, and a `D-COMP-HALAL` escalation — is a **2B-4a-shaped batch**. Doing it inside a wiring batch is the decision-smuggling `MG-NO-EMULSIFIER-GROUP-01` was held back from. **Cost: one authoring batch, the same shape as 2B-4a, plus a wiring batch the same shape as this one.** |

### `MATERIALTYPE-CANNOT-SAY-HALB-01` *(new — the LIMIT filed, not a fix)*

`MaterialType = 'ROH' | 'VERP'` has exactly two members. **The master's type
vocabulary cannot express a semi-finished good at all** — SAP's `HALB` has no
representation. Current split: 31 ROH · 11 VERP, because every row so far is
bought in. The two active emulsions authored at 2B-5b-ii are `ROH` on the type's
own stated procurement semantics and **that call stands**; what is recorded here
is that the vocabulary had no third option to reject.

### `C9-STALE-BY-FIX-01` *(new — and the pin that found it wrote its own report)*

C9 §7.3 says **WE PARSE IT** and cites `GRInspectionWizard.tsx:129-131`. That is
now false: the code is clean and the **contract document understates our
conformance.** C9's bytes are frozen by this dispatch, so the divergence stands
until the amendment.

> `SEAM-DOC-DRIFT-01` **running in the direction that flatters us, which is the
> direction nobody checks.** A doc that overstates conformance gets caught by
> anyone who reads the code. One that understates it gets caught by nobody,
> because the discrepancy is in our favour and reads as caution.

**How it was caught is the transferable part.** `ledgerTruth.test.ts`'s §7.3 pin
was written at 2B-4a to fail with the message: *"inferBpom no longer parses the
prefix — C9 §7.3 and D-COMP-BPOM are now STALE and must be corrected at the next
C9 amendment. **This is a contract-truth failure, not a code defect.**"* It fired
exactly as designed and named its own cause.

> **A PIN THAT EXPLAINS ITS OWN GREEN-TO-RED IS WORTH MORE THAN ONE THAT MERELY
> DETECTS IT.** Both halves are now asserted — the code is clean AND the contract
> still describes the breach — so the amendment closes this row deliberately.

### ⚠️ `REQUIRED-OPENS-PRE-ANSWERED-01` — **CLOSED AT CP-3** *(booked here at the #180 merge; the batch that closed it is at the foot of this file)*

**A BPOM check the system decides is REQUIRED opens with `Pass` already
selected.** Observed in the browser on `ASN-2025-00302` / `RM-EMUL-9440`:
`bpom-0` radio, value `Pass`, `checked: true`, before an inspector touches
anything. Pre-existing behaviour (`inferBpom(...) ? 'Pass' : undefined`), carried
forward verbatim.

> **A DERIVED FACT HAND-STAMPED, ON A REGULATORY CONTROL — THE THING THIS
> PLATFORM REFUSES EVERYWHERE ELSE.** *(operator ruling, #180 merge)*

| | |
|---|---|
| **The classification** | This is `MG-UNREAD-BY-ANYTHING-01`'s shape — a **stamped** value where a **derived** one belongs — on the one surface where the platform is least entitled to it. Every other axis of this arc refuses exactly this: tiers are computed and never stamped, header dispositions are rolled up and never asserted, the BPOM determination itself was just moved from a guess to a lookup. **The inspection OUTCOME is the one field left that arrives pre-filled with an answer nobody gave.** |
| **The verdict** | ⚠️ **THE MECHANISM IS RIGHT; THE DEFAULT IS WRONG.** 2B-4b's gate correctly decides *whether the question is asked*. It does not, and was never scoped to, make anyone answer it. The two halves are separable and only the first shipped. |
| **Why it did NOT ride this batch** | Fixing it **BLOCKS EVERY `REQUIRED` LINE UNTIL A HUMAN TICKS A BOX.** That is a workflow change with operational consequences for the receiving dock — not a default flipped in a diff. **It needs its own batch and its own smoke**, because the failure mode of getting it wrong is a warehouse that cannot post receipts. |
| **Scope when it runs** | ⚠️ **`halalSealCheck` HAS THE IDENTICAL DEFECT** (`inferHalal(...) ? 'Pass' : undefined`) and must be in the same dispatch. Fixing one and not the other would leave a receiving form where one regulatory check demands an answer and its neighbour supplies one. |
| **Status** | ✅ **CLOSED at CP-3** — its own dispatch, as ruled. Recorded at full weight so it would not later be read as a cosmetic default and closed by someone changing a `useState` initialiser; it was not. **Measured cost: 3 lines, 3 sources, one tick each — no dead end.** `halalSealCheck` went with it and blocked ZERO lines (`PRE-ANSWERED-HAS-NO-REACH-YET-01`). `visualCheck` / `packagingCheck` carry the same shape at a different size and are newly booked as `SEED-IS-AN-ANSWER-01`. |

### The wiring, and why the refusal is one branch and not two

`bpomOf` returns `UNKNOWN_MATERIAL` or `UNDETERMINED_APPLICABILITY`. The gate
reads **`if (!l.bpom.ok) return false;`** — one branch, both reasons. `reason`
reaches only the message, which names *which absence* was hit; nothing branches on
it to proceed. Asserted at the surface: both produce the same `role="alert"`
block, the same disabled Next, and no Pass/Fail control.

**`'UNDETERMINED' IS NOT QUARANTINE` is a claim about EFFECT**, and this is the
first batch where it is checked as one rather than as a property of a lookup.

⚠️ **The `UNKNOWN_MATERIAL` half is unreachable from real data** — no fixture
anywhere feeds the wizard an unresolvable code, which IS the discharged gate,
observed rather than asserted. So the spec **constructs** one, and that is the
only place in the tree that path is exercised at all.

### Browser QA — built bundle, EN + ID, console 0/0

| document · code | rendered |
|---|---|
| `ASN-2026-012` · `PK-PETB-8801` | Visual · Packaging · **nothing** — Next **enabled**. The positive twin: a determination, and it looks nothing like a refusal. |
| `ASN-2026-015` · `FR-WARD-4410` | Visual · Packaging · **BPOM LOT TRACKING** — Next enabled. |
| ⚠️ `ASN-2025-00302` · `RM-EMUL-9440` | Visual · Packaging · **BPOM LOT TRACKING**. **At 2B-5b-ii this exact line showed NO BPOM row, under a section headed *"Visual, kemasan, halal, BPOM"*.** The contradiction, resolved on screen. |
| ⚠️ `ASN-2026-014` · `RM-COCO-8200` | *"BPOM applicability cannot be determined. The material master names RM-COCO-8200 but records no BPOM determination for it."* · `role="alert"` · **Next DISABLED**. |
| ⚠️ `ASN-2025-00301` · `RM-PSTN-7150` | Same refusal, same block. In ID: *"Master material memuat RM-PSTN-7150 tetapi tidak mencatat penetapan BPOM untuknya."* |

Both refusals were read in **Indonesian** as well as English; chrome translates,
material names correctly do not, no raw keys. **Console: 0 errors, 0 warnings.**

### ⚠️ THE REACHABILITY GAP, NAMED AND COSTED — `AI-NIAC-6612` / `AI-HYALU-6615`

`ASN-2025-00201` carries status `Discrepancy`, which is not in
`RECEIVABLE_ASN_STATUSES`, so it never reaches the wizard's source list. Its two
active emulsions **cannot be witnessed in the browser.** That is the 2e-c-6
reachability problem one lane over:

> **A REFUSAL THAT CANNOT BE WITNESSED IS NOT A DELIVERED REFUSAL.**

**What honestly narrows it:** both codes are `APPLICABLE`, and the **REQUIRED**
state IS witnessed — three times, on `FR-WARD-4410`, `FR-ROUD-4470` and
`RM-EMUL-9440`. The unwitnessable pair are additional **instances** of a rendered
state, not an unrendered state. **No state of this gate is unwitnessed.**

**Is a reachable fixture needed? NOT FOR THIS GATE, and it is not free.** Costs,
so the operator can rule rather than re-derive: flipping `ASN-2025-00201` to a
receivable status **destroys the Discrepancy fixture** other surfaces read;
authoring a new ASN is **authoring a document**, which under R-4 needs evidence
this batch does not have. **Neither is free, so neither was built.** The gap is a
property of one fixture's status, and it is now written down.

### Mutation-verified — eight probes, seven detected, **plus a control**

| | probe | result |
|---|---|---|
| **M1** | the fail-closed guard REMOVED (a refusal becomes a skip) | **3 red** |
| **M2** | the PREFIX RULE reinstated in place of the master lookup | **10 red**, across 6 files |
| **M3** | `RM-EMUL-9440` loses its document-backed `APPLICABLE` | **13 red** |
| **M3b** | `RM-PSTN-7150`'s `UNDETERMINED` silently becomes a NEGATIVE | **9 red** |
| **M4** | the refusal MESSAGE deleted, the gate kept | **3 red** |
| **M5** | the two refusal reasons made INDISTINGUISHABLE | **1 red** |
| **M6** | the BPOM row renders for a REFUSED line too | **1 red** *(see below)* |
| **M7** | **CONTROL** — a deliberately non-existent anchor | **PROBE FAILED TO APPLY — NOT A RESULT** |

### ⚠️ `PROBE-NEEDS-PROBING-01` — **THIRD APPEARANCE, AND A NEW VARIETY**

The standing practice from #179 — *every probe asserts its own edit landed, and at
least one control probe deliberately fails to apply* — caught a failure mode
neither earlier appearance had:

- **#178: the edit did not land** (anchor absent) and reported a false all-clear.
- **2B-5b-ii: the control worked**, reporting `PROBE FAILED TO APPLY`.
- **Here: THE EDIT LANDED AND MUTATED NOTHING.** M3b's first form inserted
  `bpomApplicable: 'NOT_APPLICABLE'` at the head of the `RM-PSTN-7150` object —
  where the row's **existing later key overwrites it**. The assert-it-landed guard
  passed (the file genuinely changed) and the suite went green, which reads
  identically to *"this mutation is undetected"*.

> **A PROBE THAT APPLIES IS NOT A PROBE THAT MUTATES.** Re-anchored on the actual
> `bpomApplicable` line, M3b reddens **9**. The guard to add is not another
> assertion on the edit — it is the reflex that **a probe returning zero is a
> claim about the probe first and the suite second.**

The same run's first M3 had the same shape for a different reason: it renamed the
`materialCode` FIELD while `MATERIAL_MASTER` is keyed by its map KEY, so it tested
a self-consistency pin rather than the regulatory path.

#### ⚠️ THE BASE RATE, RECORDED — **TWO OF EIGHT PROBES WERE INERT ON FIRST WRITING**

*(operator instruction, #180 merge — record the rate, not just the instances.)*

**25%.** Not a mistake made once and learned from: **a quarter of a carefully
written probe set silently measured nothing**, in a batch whose author already
knew about this class and had applied its fix. Both inert probes reported a
**green suite**, which is byte-identical to *"this mutation is undetected"* — the
most reassuring output the exercise can produce, and the one it produces when it
has failed.

> **THE RATE IS THE FINDING, NOT THE TWO INSTANCES.** A failure mode at 25% is not
> caught by care. It is caught by treating **every zero-red probe as unproven
> until the probe itself has been shown to bite** — which is what the control
> probe does for the apply step, and what nothing yet does for the mutate step.

**What earns its keep, measured on the other side of the same run:** M6 flipped a
render condition, reddened nothing, and turned out to be a **real spec gap** — a
refused line offering a Pass/Fail control. **THE PRACTICE PAID FOR ITSELF IN THE
SAME BATCH IT COST 25% IN**, which is the honest reason to keep it standing rather
than an appeal to rigour.

### The self-catch M6 found

M6 flipped the render condition so the Pass/Fail control appeared **beside** the
refusal, and **nothing went red.** A refused line would have offered an inspector
a box to tick Pass on an applicability the system had just said it could not
determine — a determination with extra steps. The spec was tightened (a refused
line must offer no check to record), not the code loosened; M6 now reddens 1.

### Inverted, never deleted — the pins that carry the swap

Six standing assertions were the exact negation of what is now true, and each was
**rewritten to assert the opposite with its reason** rather than removed:
`bpomApplicability.test.ts` (*"AUTHORED, NOT WIRED"* → *"WIRED, and the prefix
rule is GONE"*, including *"nothing in the tree imports the mechanism"* →
*"exactly one non-test importer, and it is the receiving surface"*),
`ledgerTruth.test.ts` §7.3, `materialMasterAuthoring.test.ts`,
`materialMasterAdoption.test.ts`, `asnMasterAuthoring.test.ts`, and
`materialIdentity.test.ts`'s *"the fail-open is LIVE, not latent"*.

⚠️ **The retired predicate is kept as a LOCAL RESTATEMENT in four test files, and
that was a decision.** `wouldRequireBpom` was always a deliberate copy rather than
an import — originally so a regulatory pin was not coupled to a component's export
surface. **That choice is why the before-and-after survives the retirement at
all**: an imported predicate would have taken the whole historical record with it
when the function was deleted. The tree-wide pin therefore asserts a property
rather than a list — **every remaining prefix parse is in a `.test.ts` file** —
because a restatement that proves a rule is retired is the opposite of the defect.

### One existing spec changed its fixture, and the reason is the gate

`BuyerGoodsReceipt.test.tsx` seeded a live ASN carrying `PK-UITEST-1`, an invented
code. **It can no longer reach step 4**, because the wizard now refuses a code the
master cannot resolve. It takes a real master row (`PK-PETB-8804`) so the receipt
path it tests is unchanged. **The fail-closed rule's first catch was a test
fixture, and the only unresolvable code the wizard can be fed anywhere in the tree
is one a test invents.**

### Constraints discharged, in writing

- **`inferBpom` RETIRED.** No prefix parse survives on any path a receipt can
  travel; asserted as a derived tree-wide property, not a list of files.
- **FAIL-CLOSED, AND UNDETERMINED REFUSES IDENTICALLY TO UNKNOWN.** One branch,
  two messages, no way through either.
- **`inferHalal` REPORTED, NOT FOLDED IN** — measured, filed, and costed above.
- **THE FIRING SET REPORTED LINE BY LINE**, over the **widened** population, and
  the widening is itself filed as a finding against my own gate.
- **BROWSER QA DONE**, EN + ID, all three states, both refusals, console 0/0.
- **C9 BYTES UNTOUCHED, PIN STAYS `f492b5c`** — and the staleness that creates is
  filed rather than silently accepted.
- **FLOOR 2209/184 → 2219/184.** `npm run gates` green.

### What is left

`inferHalal` — its own batch, costed above · the **third ASN lane**, 3 of 18
tenant-wrong, its own dispatch · `MAT-10046` / `MAT-10089`, two unbacked
storefront pointers, no ruling · `REQUIRED-OPENS-PRE-ANSWERED-01`, RULED and BOOKED
as its own dispatch (with `halalSealCheck`, the identical defect) — **✅ both CLOSED at CP-3** ·
`MATERIALTYPE-CANNOT-SAY-HALB-01`, a recorded limit ·
`C9-STALE-BY-FIX-01`, closes at the C9 amendment · `D-COMP-BPOM`, still
unanswered — and now standing between an operator and two receivable lines.

---

## CP-2 · C9 AMENDMENT 3 — **`C9-STALE-BY-FIX-01`: THE CONTRACT WENT STALE BY BEING FIXED**

Docs only. No schema change, no rows, no master edit, no code change. **C9's bytes move for the
first time since `f492b5c`, so the pin moves and a new ratification is owed** (A-13).

> **A CONTRACT CAN GO STALE BY BEING FIXED, AND THAT DIRECTION IS THE UNCHECKED ONE.**

### `C9-STALE-BY-FIX-01` *(new class — filed at 2B-4b, discharged here)*

| | |
|---|---|
| **What happened** | 2B-4b deleted `inferBpom`. **Four contract documents went on describing it as live** — C9 §7.3 (*"WE PARSE IT"*), C7 §6.1, C8 §4.6 / `MOCK-RETIREMENT-01`, and the package README's `C7-MATERIAL-JOIN` row. Three of them gave the deleted function as the **stated reason** for a live design position, citing a `file:line` that no longer holds a prefix parse. |
| **Why it is the unchecked direction** | **A DOCUMENT THAT OVERSTATES OUR CONFORMANCE IS CAUGHT BY ANYONE WHO READS THE CODE. ONE THAT UNDERSTATES IT IS CAUGHT BY NOBODY** — the discrepancy is in our favour and reads as caution. Nothing about a stale *"we are still in breach"* looks wrong. |
| **The ancestry, and it is uncomfortable** | This is **ADD-3 with the polarity reversed.** SOMO told us *a divergence log that only ever runs one direction is not being read hard enough*, and we recorded it as a lesson about finding defects we had **understated**. §7.9–§7.12 are all that shape. **The direction still unread was the one where a divergence CLOSES and the ledger keeps declaring it** — and it took a year-zero repair to surface it. |
| **⚠️ The asymmetry — NAMED, NOT CLOSED, AND NOT PERMANENT** | Only **C9's** §7 is pinned to the floor. The other three were corrected by hand and **nothing will fail if they go stale again.** ⚠️ **DO NOT READ THIS AS CLOSED.** The pin that would close it is **buildable and booked** (`CITATION-CONVENTION-BLOCKS-THE-PIN-01`), blocked on a **documentation chore, not a design problem** — and it **would have caught all four stale sites.** The asymmetry holds until that chore runs, and the chore is not booked to a batch. |
| **The provenance ratio** | ⚠️ **0 of 7 amendment items found by SOMO; 6 of 7 are corrections to statements WE MADE ABOUT OUR OWN TREE.** Every prior issue's corrections came from the counterparty. **And the ratio is evidence about the READING, not the writing:** most of the six had been true-and-uncorrected for four issues, nothing in the tree changed to reveal them, and what changed is that somebody looked in a direction the ledger had not been kept in. §7.9's lesson, turned into a measurement. |

### The amendment — seven items, ALL ours, riding ONE re-ratification

**Everything queued since `f492b5c` was folded into one amendment** so there is one SHA and one
re-ratification rather than six.

| # | Clause | What changed |
|---|---|---|
| **A-15** | §7.3 | ✅ **DISCHARGED.** The longest-standing row in the ledger, and the first to close. |
| **A-16** | §7.13 *(new)* | The ledger row for the stale-by-fix direction. |
| **A-17** | §6.2 | D-COMP-BPOM: **mechanism SHIPPED, content UNANSWERED.** |
| **A-18** | §2.4 · §7.4 · §6.1a | `substanceRef` — **P-3 / `LEDGER-UNCOMPOSED-01` answered in the document that caused it.** |
| **A-19** | §5 | Paragon's space count — **wrong when written AND changed since.** |
| **A-20** | §6.4 | D-2 restated with today's measurement **and how it was obtained.** |
| **A-21** | §7.5 | The master now holds 42 — restated, not deleted. |

⚠️ **Not one of the seven was found by SOMO, and six correct statements we made about our own
tree.** Recorded as such, because §7.9's lesson was that a ledger kept by one party about itself
finds the kinds of thing that party looks for.

### A-17 — the honest conformance statement is BETTER than the one it replaces

`D-COMP-BPOM` splits cleanly and the split is the value: **part 2 (mechanism) is ours and is done;
part 3 (content) is compliance's and is not.** All 42 values remain **PROVISIONAL** —
**20 `APPLICABLE` · 11 `NOT_APPLICABLE` · 11 `UNDETERMINED`** — and **two of the eleven undetermined
rows block a receivable line at goods receipt.**

> **AN UNANSWERED ESCALATION THAT BLOCKS WORK IS IN BETTER SHAPE THAN ONE THAT SILENTLY DOES NOT.**
> The ruling is no closer. What changed is that its absence is now visible to the person it
> protects, instead of rendering as a confident *"no check required"*.

### A-18 — P-3 answered **in prose**, because the check that would catch it was measured and refused

C9 §7.4 says `substanceRef` is not built. C9 §6.1a calls the substance rollup *"the axis on which
any row sourced from their master can be written at all"* and rests a live procurement escalation
on it. **Same document, both shipped in every issue since the fourth, nothing composed them.**

- **§6.1a now carries the contradiction inline**, and **§2.4 says plainly what the alias is**: `SubstanceRef` is `= string` — **a reserved NAME, not a shape** — so anything an adopter wrote would satisfy it. **Five master-authoring batches have run since the reservation and none approached it: it is not unscheduled, it is undecided.**
- **D-1 is restated for procurement:** it decides **whether the field is BUILT**, not only how it is used. The answer *"substance carries no commercial meaning"* closes the escalation **and deletes the axis §6.1a depends on** — the two were never separable, only written apart.
- **The guard was NOT built, and that is CP-3b's measured refusal standing:** 28 firings, 0 true positives, **and this defect not among them** — §6.1a never names `substanceRef`, it cites `(§2.4)` in prose, so the contradicting sentence and the ledger row **share no token a checker can join on.** Prose is the weaker fix and the honest one.

### A-19 — the space count was wrong AND has since changed, and both belong in the record

§5 said Paragon holds **two** spaces. There were **three**: the undeclared **ASN chase lane**, a
`MAT-*` vocabulary no master row resolved — and the prefix rule then deciding BPOM applicability
could match no code in it, so **an entire vocabulary silently escaped a compliance check**
(`BPOM-OFF-BY-SPACE-01`). It is now **retired and empty**. A fourth surface, the
**supplier-catalogue pointer**, is declared **NOT an identity space**: supplier *assertions* about
our codes, on which nothing may join.

> **Correcting only the present state would hide the error; correcting only the error would hide
> the change.** Both are written.

⚠️ **And the generalisable part: we did not find the third space by counting.** We found it because
a **regulatory check behaved oddly**, and the count was a consequence. **A party can be wrong about
how many spaces it holds while being confident about it** — which is precisely the condition a row
without a `spaceId` cannot survive.

### A-20 — the number was wrong because it had no method attached

§6.4 said the document lane names **34** codes. **It was 33 when written.** It was taken by
inspection, and inspection is why it was wrong; **a number in a contract carries an obligation to
say how it was got** (§3.3), and this one carried none — which is why nobody could tell it was off
by one for four issues. Today, by **derived census** (walks every non-test module, derives the
code-bearing field set rather than naming it, one named exclusion):

**master 42 · document lane 33 with ZERO master-absent · tree-wide 44 distinct, TWO unresolvable —
and neither of the two is a Paragon code.**

⚠️ **The population moved in BOTH directions and only one is flattering:** tree-wide master-absent
went **39 → 14 → 9 → 12 → 9 → 2**, and the rise from 9 to 12 came from a batch that added no code —
it **widened the census**. **A figure that only ever improves while its scope stays narrower than
the tree is a figure improving about itself.**

### The derived README check caught its own half

Adding §7.13 turned `ledgerTruth.test.ts` red — the README summary row still said `7.1–7.12`.
**That is the CP-3b mechanism working exactly as built**: the row-id enumeration is *derived* from
C9 §7 rather than hand-listed, so a ledger row that never reaches the index fails the floor. The
defect it was built for — `SUMMARY-LOSS-IS-DIRECTIONAL-01`, four rows silently dropped across two
amendments — **could not recur here.**

### ⚠️ REPORTED, NOT BUILT — can the `ledgerTruth` pin generalise to C7 and C8?

**Answer: a SUBSET, and it is smaller than it looks and needs a documentation-convention change
first. Measured before answering, per CP-3b.**

**The two halves separate, and only one travels:**

| half | generalises? | evidence |
|---|---|---|
| **Code-truth** — *does this symbol/file exist?* | ⚠️ **PARTLY** | Measured below. |
| **Prose-composition** — *does the body contradict the ledger?* | ❌ **NO** | CP-3b: **28 firings, 0 true positives**, and the one defect it was built for not among them. Unchanged. |

**And the structural blocker, which is not effort:** C9 §7 is an **enumerated ledger with row ids**,
so its population **derives**. **C7 §7 and C8 §7 are DECISION REGISTERS** — `C7-FIND-0N` rows mixed
in among RATIFIED decisions and open co-design items. A check treating every row as a declared
non-conformance fires on `C7-SCOPE`, `C7-INTAKE` and `C7-PROV` immediately. **There is no derivable
population to check, so any C7/C8 pin needs a HAND-PICKED list of claims — which is
`MEANING-SCOPE-IS-A-HAND-PICK-01` rebuilt on purpose.**

**⚠️ THE ONE DERIVABLE SUBSET, PROBED AND MEASURED.** These documents use a citation convention:
`` `symbol` (`path`) ``. That pairing **is** machine-joinable, and a probe was written and run:

```
C7  — 13 pairs, 9 distinct  →  6 resolve, 3 DO NOT
C8  —  6 pairs, 4 distinct  →  1 resolve, 3 DO NOT
RDM —  2 pairs, 2 distinct  →  1 resolve, 1 DO NOT
C9  —  1 pair,  1 distinct  →  1 resolve, 0 DO NOT
```

**Every single one of the seven non-resolving pairs is a FALSE POSITIVE.** All four symbols
(`PrIntakeLine`, `purchaseRequisitionTarget.create`, `suggestedQty`, `acknowledgment`,
`Allocation.materialPeriodTotal`, `ForecastLine.materialCode`) **exist in the tree.** They fail to
resolve because **C7 and C8 cite BARE BASENAMES** — `types.ts`, `MockCommandService.ts` — and there
are **four `types.ts` files in `src/`**. **C9 cites full repo-relative paths and scores 1 of 1.**

> **A 47% FALSE-POSITIVE RATE, AND NOT ONE OF THEM IS A DOCUMENT ERROR.** The probe is measuring a
> **citation convention**, not conformance. Shipping it would train a reader to ignore it — the
> exact outcome `CI-LINUX-PARITY-01` warns about.

**COSTED, in the order the work actually has to happen:**

1. **Convention first — C7/C8/README adopt full repo-relative paths.** ~40 citations across three documents, mechanical, no judgement. **Without this, nothing downstream is worth building.**
2. **Then the code-truth pin — ~1 spec file, the shape `ledgerTruth` already has.** It would assert that every `` `symbol` (`path`) `` pair in the contract package resolves. **This is the pin that would have caught all four stale sites**, because every one of them named `inferBpom` beside a path.
3. **Not step 3: the ledger-row semantics.** C7/C8 §7 stay unpinnable as *ledgers* until they are restructured into enumerated non-conformance rows, and **that is a document redesign, not a test.**

**So `C9-STALE-BY-FIX-01` does NOT stand as a permanent asymmetry — but it stands until step 1
happens.** Recorded that way rather than as "generalises: yes", because the honest answer is *yes,
after a chore that is invisible from the test's side.* **Booked below.**

### `CITATION-CONVENTION-BLOCKS-THE-PIN-01` *(new — BOOKED as its own chore, operator ruling at the #181 merge)*

> **THE PROBE MEASURED A CITATION CONVENTION, NOT CONFORMANCE — AND THAT IS THE WHOLE OF WHY THE
> PIN CANNOT SHIP TODAY.**

| | |
|---|---|
| **The blocker** | C7, C8 and the package README cite **bare basenames** — `` (`types.ts`) ``, `` (`MockCommandService.ts`) `` — where C9 cites **full repo-relative paths**. Our tree holds **four `types.ts` files**. A mechanical resolver therefore cannot join a citation to a file, and its failures are ambiguities rather than findings. |
| **Measured, before deciding** | **15 distinct `` `symbol` (`path`) `` pairs across the three documents; 7 do not resolve; ALL SEVEN ARE FALSE POSITIVES** — every symbol exists in the tree. **47%, and not one of them is a document error.** C9, on its full-path convention, scores **1 of 1**. |
| **⚠️ The payoff, and it is not hypothetical** | **THE CONVERTED PIN WOULD HAVE CAUGHT ALL FOUR STALE SITES.** Every one of them named `inferBpom` **beside a path** — C9 §7.3, C7 §6.1, C8 §4.6, the README's `C7-MATERIAL-JOIN`. A resolver asserting *this symbol still exists in this file* reddens on all four the moment the function is deleted. **The defect that took a manual re-read to find is exactly the shape this check is good at.** |
| **Cost, in the order the work has to happen** | **1 · ~40 citations** in C7/C8/README converted to repo-relative paths — mechanical, no judgement, and worthless to skip. **2 · ~1 spec file**, the shape `ledgerTruth.test.ts` already has: every `` `symbol` (`path`) `` pair in `docs/contracts/` must resolve. |
| **⚠️ WHAT DOES NOT FOLLOW, and it is the part most likely to be over-read** | **C7 §7 AND C8 §7 STAY UNPINNABLE *AS LEDGERS* REGARDLESS OF THIS CHORE.** They are **DECISION REGISTERS** — `C7-FIND-0N` rows mixed among RATIFIED decisions and open co-design items — so there is **no derivable population** of declared non-conformances to check. A pin there needs a **hand-picked list of claims**, which rebuilds `MEANING-SCOPE-IS-A-HAND-PICK-01` on purpose. Restructuring them into enumerated rows is a **document redesign, not a test**, and is not booked. |
| **Status** | **BOOKED — its own chore.** Until it runs, `C9-STALE-BY-FIX-01`'s asymmetry stands: **only C9's ledger is on the floor, and the other three documents can go stale again with nothing failing.** |

### `SUMMARY-LOSS-IS-DIRECTIONAL-01` — **CLOSED BY MECHANISM, and it proved it here**

Filed at CP-3b: the README summarised C9 §7 as *"(7.1–7.8) … eight"* while §7 carried twelve, and
**the four dropped rows were the ones running the direction we were not reading.** The fix was not
a corrected number — it was a **derived** check: the range and the row-id list come from C9 §7
itself, so an index that omits a ledger row fails the floor.

**Amendment 3 was its first real test and it fired.** Adding §7.13 turned the pin red because the
README still said `7.1–7.12`.

> **A CLASS CLOSED BY MECHANISM RATHER THAN BY VIGILANCE IS THE ONLY DURABLE KIND.** Nobody had to
> remember the index existed. The build refused, named the missing row, and the correction was
> forced rather than noticed — which is the difference between a fix and a resolution.

### Constraints discharged, in writing

- **DOCS ONLY.** No code, no schema, no rows, no master edit. The types module and
  `C9-required-fields.md` are **byte-identical** to the fourth issue.
- **THE THREE UNPINNED DOCUMENTS CORRECTED** — C7 §6.1 + its §7 row, C8 §4.6 +
  `MOCK-RETIREMENT-01` + `C8-RECIPROCAL-HAZARD`, README's `C7-MATERIAL-JOIN` + C9 §7 index.
- ⚠️ **C8 §4.6's ORIGINAL DISCLOSURE IS LEFT VERBATIM AND UPDATED IN PLACE, NOT DELETED.** SOMO's
  reciprocal disclosure exists *because we volunteered ours*; editing the original out would make
  the exchange unreadable. **A CLOSED HAZARD IS UPDATED IN PLACE, NEVER DELETED.**
- **NOT TOUCHED, all booked:** `inferHalal`, the third ASN lane, `REQUIRED-OPENS-PRE-ANSWERED-01`,
  the ASN→PO material axis.
- **FLOOR 2219/184, unchanged.** `npm run gates` green.

### What the operator sends to SOMO

The **new SHA** and the **three paths** (§ the citation block): the contract, the types module, and
the derived field list. **A-15…A-21 are a new ratification** even though the schema did not move.

---

## CP-3 · `REQUIRED-OPENS-PRE-ANSWERED-01` — **THE FORM ANSWERED THE QUESTION IT HAD JUST DECIDED TO ASK**

2B-4b made the system read the material master and decide that a received lot
**requires** a BPOM check. The same commit's form then **ticked `Pass` on it**
before an inspector looked. `bpomOf` replaced `inferBpom`, correctly — and the
line right underneath it kept the old seed verbatim:

```ts
bpomLotCheck: bpom.ok && bpom.applicable ? 'Pass' : undefined
```

> **A DERIVED FACT HAND-STAMPED, ON A REGULATORY CONTROL — THE THING THIS
> PLATFORM REFUSES EVERYWHERE ELSE.** *(operator ruling, #180 merge)*

**The mechanism was right and the default was wrong**, and the two were
separable: 2B-4b shipped the half that decides *whether the question is asked*
and left the half that makes someone *answer it*. This batch is that second half.

### ⚠️ THE GATE WAS ALREADY WRITTEN. IT COULD NEVER FIRE.

`qualityValid` is **byte-identical** to what #180 shipped:

```ts
if (l.halalRequired && !l.halalSealCheck) return false;
if (l.bpom.applicable && !l.bpomLotCheck) return false;
```

Both clauses were present, both correct, and **neither could ever be reached**,
because the draft builders stamped an answer into every line the clauses applied
to. **A guard is only a guard over a value that can be absent** — the same
sentence 2f-a wrote about quantities, one field over and wearing regulatory
clothes. The fix is upstream, in the seed; what changed at the gate is that it
can now say no.

This is a distinct failure shape from the one 2B-4b closed, and it deserves its
own name: **not a gate that fails open, but a gate that cannot fail at all**,
because something upstream guarantees its condition is never met. A pin on
`qualityValid` would have been green throughout. A pin on the *rendered form*
would not have been — which is where the new specs sit.

### THE BLAST RADIUS, MEASURED BEFORE THE FIX WAS WRITTEN

The dispatch asked how many lines this blocks, on which fixtures, and whether
any reachable path becomes a dead end. Derived from the wizard's own source
rules (`ELIGIBLE_STATUSES` ∪ `RECEIVABLE_ASN_STATUSES`), not from a guess:

**8 receivable GR sources · 9 lines.**

| Source | Material | Before | After |
|---|---|---|---|
| SHIP `ASN-2026-012` | `PK-PETB-8801` | not applicable | unchanged |
| SHIP `ASN-2026-013` | `PK-PETB-8802` | not applicable | unchanged |
| SHIP `ASN-2026-014` | `RM-COCO-8200` | **refuses** (2B-4b) | unchanged |
| SHIP `ASN-2026-015` | `FR-WARD-4410` | ⚠️ **pre-ticked `Pass`** | 1 tick |
| ASN `ASN-2025-00211` | `FR-ROUD-4470` | ⚠️ **pre-ticked `Pass`** | 1 tick |
| ASN `ASN-2025-00211` | `PK-PETB-8804` | not applicable | unchanged |
| ASN `ASN-2025-00198` | `PK-ALCP-2450` | not applicable | unchanged |
| ASN `ASN-2025-00301` | `RM-PSTN-7150` | **refuses** (2B-4b) | unchanged |
| ASN `ASN-2025-00302` | `RM-EMUL-9440` | ⚠️ **pre-ticked `Pass`** | 1 tick |

**THREE LINES, ON THREE SOURCES, ONE TICK EACH.** Including `RM-EMUL-9440` —
the row this whole arc fought for, on the PO whose linked `doc-201` is a BPOM
Notification, and the row the browser observation was recorded against.

**NO REACHABLE PATH BECOMES A DEAD END.** Every newly-blocked line renders an
answerable `Pass`/`Fail` control; five of the eight sources are untouched; three
need one tick. **A gate nobody can pass is not a gate**, and this one is passed
by doing the job — verified end to end in the browser below, not argued.

⚠️ **THE TWO DEAD ENDS THAT DO EXIST ARE NOT OURS AND ARE NOT TOUCHED.**
`ASN-2026-014` / `RM-COCO-8200` and `ASN-2025-00301` / `RM-PSTN-7150` cannot be
received at all today. That is **2B-4b's fail-closed refusal working as
designed** — an undetermined applicability, correctly blocking — and it is
recorded here only so that nobody later reads "2 of 8 sources unreceivable" off
this branch and bills it to this batch. It clears when `D-COMP-BPOM` is ratified.

### `PRE-ANSWERED-HAS-NO-REACH-YET-01` *(new — the halal half, and it blocks ZERO lines)*

`halalSealCheck` carried the identical seed and was in scope for the identical
reason: fixing one would leave a receiving form where one regulatory check
demands an answer and its neighbour supplies one.

**It blocks nothing today, and that is measured rather than assumed.**
`inferHalal` fires on **four** fixture lines — `shp-004` (×2, In Transit),
`shp-011` (Customs Clearance), `shp-016` (Delivered) — and **not one of them is
a receivable GR source**, since only `At Dock` / `Unloading` are eligible. The
halal pre-tick was a live defect **with no reach**.

> **THE CHEAPEST MOMENT TO CLOSE A DEFECT IS WHILE ITS BLAST RADIUS IS STILL
> ZERO.** `INFERHALAL-READS-PROSE-01`'s arc exists to give this mechanism reach.
> Had the seed still been there when it landed, the check would have started
> answering real questions on real lots, and the batch that gave it reach would
> have been blamed for a defect it merely exposed.

The new spec pins this as a **pair**: zero receivable hits AND non-zero total
hits. The first alone would also pass if `inferHalal` were simply broken. When
it goes red nothing is wrong — a fixture line has become receivable with `halal`
in its prose, the halal gate has acquired live reach for the first time, and it
needs the operator smoke the BPOM gate just got.

### THE MIDDLE STATE HAD NEVER RENDERED

Three states have always existed. Only two had ever been on screen:

| | Shape | Next |
|---|---|---|
| **NOT REQUIRED** | no row at all | enabled |
| **REQUIRED, UNANSWERED** | row · nothing selected · marker | ⚠️ **disabled** |
| **REQUIRED, ANSWERED** | row · a selection · no marker | enabled |
| *(REFUSED — 2B-4b, unchanged)* | `role="alert"` block · **no control** | disabled |

**NO FOURTH TOKEN WAS INVENTED.** No `'Pending'`, no third radio, no `null`
sentinel — **absence is absence**, and the states are told apart by the SHAPE of
the surface. A third radio option would have been the fastest way to make
"nobody has answered" look like an answer again, which is the defect with an
extra step.

⚠️ **THE UNANSWERED MARKER IS `role="status"`, NOT `role="alert"` — and the BPOM
refusal keeps `role="alert"`.** They are different facts. A refusal is a **fault
in the data**: the master cannot answer, and someone must go fix a row. An
unanswered check is an **outstanding obligation**: nothing is wrong, a clerk
simply has not got there yet. Announcing the second as an error tells a warehouse
supervisor they have done something wrong by opening a form. Two facts, two
announcements — a mutation probe (M6) confirms conflating them goes red.

### ONE CONTROL, BOTH CHECKS — so they cannot drift apart again

The halal check and the BPOM check were two hand-rolled radio pairs with two
hand-rolled seeds, **and that is exactly how one of them ended up demanding an
answer while the other supplied one.** They now render through a single
`RegulatoryCheck` component. "Unanswered looks like this" is one fact in one
place, and the two checks share ONE i18n sentence rather than two — deliberately,
because giving them separate wording is the first step back toward them behaving
separately.

The radios also gained `aria-label` (a line renders up to four `Pass`/`Fail`
pairs; an accessible name of just "Pass" is ambiguous four times over) and
`aria-required`. The row only renders when the check applies, so `aria-required`
is never a lie: a check that does not apply has no control to be required.

### ⚠️ REPORTED, NOT FIXED — `SEED-IS-AN-ANSWER-01` on the NON-regulatory checks

`visualCheck` and `packagingCheck` **still open pre-ticked `Pass`**, on every one
of the nine lines. Observed in the browser this batch: `vis-0`/`Pass`
`checked: true`, `pkg-0`/`Pass` `checked: true`.

It is **the same shape**, and it is left because it is **not the same size**.
This dispatch scoped the regulatory pair — the controls where a stamped answer
is a compliance claim nobody made. Removing these two seeds would block **all
nine lines, two ticks each, 18 ticks across every receipt the dock posts**,
against a defect that is a data-quality concern rather than a regulatory one.

> **THAT IS AN OPERATOR'S CALL AND NOT A BUILDER'S.** It is filed at full weight
> so it cannot later be read as an oversight, and costed so the decision can be
> made from a number instead of a principle. **Recommendation: it should ride
> its own batch, with its own dock smoke** — the failure mode of getting it
> wrong is the same one that kept this batch off 2B-4b.

### Mutation-verified — eight probes, seven detected, plus a control

| Probe | What it restores or breaks | Detected |
|---|---|---|
| **M1** | the BPOM pre-tick — **THE defect** | ✅ 5 specs red |
| **M2** | the halal pre-tick, both builders | ✅ 1 red |
| **M3** | marker renders always, even when answered | ✅ 2 red |
| **M4** | the gate accepts only `Pass` | ✅ 1 red |
| **M5** | `aria-required` dropped | ✅ 1 red |
| **M6** | marker becomes `role="alert"` | ✅ 2 red |
| **M7** | the halal clause deleted from `qualityValid` | ✅ 1 red |
| **M8 · CONTROL** | a comment reworded — behaviour untouched | ✅ **stayed green** |

⚠️ **M4 IS THE PROBE THAT MATTERS MOST, AND IT IS NOT OBVIOUS.** A gate that
clears only on `Pass` would be **the same fabrication wearing a workflow** —
quietly redefining "record what you found" as "record that it was fine". An
inspector who finds a bad lot must be able to say so and move on; the receipt
then rolls up Rejected, which is the point. `FAIL UN-BLOCKS IT TOO` is the spec,
and it is load-bearing.

⚠️ **M5 FAILED TO APPLY TWICE BEFORE IT DETECTED** — the probe's regex anchored
on `$` against CRLF line endings and silently matched nothing, so the run came
back green and *looked* like a hole in the suite. **`PROBE-NEEDS-PROBING-01`'s
THIRD VARIETY** (fourth appearance) — **and the first with an ENVIRONMENTAL
cause**; see the dedicated entry below. The same broken-grep run also made two
passing probes print nothing at all, which is how it was caught. **Every probe
here was re-confirmed to have actually changed the file.**

### ⚠️ `PROBE-NEEDS-PROBING-01` — **THIRD VARIETY, AND THE FIRST WITH AN ENVIRONMENTAL CAUSE** *(operator ruling, #182 merge)*

The two earlier varieties were mistakes **in the probe** — a pattern that was
wrong, a control that was missing. This one is neither. The pattern was correct
**for the file the author believed they were editing**:

```
perl -pi -e "s/^(\s*)aria-required$//"     # matches nothing. CRLF.
perl -pi -e "s/^(\s*)aria-required(\r?)$/$1$2/"   # matches.
```

**`$` sits before the `\r`, so the anchor never fires.** The substitution reports
success, changes nothing, and the suite then correctly passes — **which reads
exactly like a spec that failed to detect the mutation.**

> **A PROBE THAT DOESN'T MUTATE LOOKS EXACTLY LIKE A SUITE THAT DOESN'T DETECT.**
> *(operator, #182)*

⚠️ **THIS WILL RECUR, AND THAT IS THE WHOLE REASON IT IS FILED SEPARATELY.** The
first two varieties were errors a careful author stops making. This one is a
property of the machine — **Windows line endings, `core.autocrlf = true`, every
file in the tree** — so it is waiting for every future probe written with a `$`
anchor, including ones written by someone who has read both earlier entries.

**The standing practice, extended:** a probe must assert its own edit landed
(#179) — **and the assertion must be on the FILE, not on the exit status of the
tool that edited it.** `perl` exits 0 on a substitution that matched nothing.
Diff against a backup, or `grep` the mutated site, before believing any probe
result — green or red.

**Its sibling, filed the same day:** `HASH-IS-PLATFORM-DEPENDENT-01`, where the
same CRLF/LF split makes a `sha256` describe the checkout rather than the commit.
**Both are the verification apparatus lying rather than the thing under
verification**, and both come from the same two-line git config.

### Inverted, never deleted — the pin that carries the swap

`an APPLICABLE line asks for the check, and the wizard proceeds` ended
`expect(next()).toBeEnabled()`. **It was green, and the behaviour it described
was the defect** — the form had already answered the check. It now ends
`toBeDisabled()`, **and the tick that un-blocks it is asserted in the same
spec**, so the inversion cannot be read as "the gate blocks everything now".

**+7 specs.** Six on the BPOM path (the defect directly — neither radio checked
on open; the lock; `Fail` un-blocks; the three states; `aria-required`), one on
the constructed halal path, plus the measured-reach pin.

### Browser QA — built bundle, EN + ID, console 0/0

Served from `dist/` on a **fresh port**: a stale preview server was already
holding the usual one and answering `200` with older bytes. Bundle identity
confirmed by grepping both new strings out of the served chunk before trusting a
single screenshot — **cache-bust or the result is a lie.**

- ⚠️ **THE OBSERVATION, INVERTED.** `ASN-2025-00302` / `RM-EMUL-9440`, the row
  the finding was recorded against: `bpom-0`, value `Pass`, **`checked: false`**,
  `aria-required="true"`, marker `role="status"`, **Next disabled**. The
  original observation read `checked: true`.
- **ID** — `PELACAKAN LOT BPOM`, both radios blank, marker reads *"Belum
  dijawab… sampai inspektur memilih Lulus atau Gagal."* The sentence names
  **Lulus / Gagal**, which is what the radios actually render in ID
  (`priorityLabel.ENUM_ID`) — copy that names a button the user cannot find is
  its own small lie.
- **EN** — `ASN-2026-015` / `FR-WARD-4410`, the shipment lane: same shape, same
  block.
- **NOT REQUIRED, verified distinct** — `ASN-2026-012` / `PK-PETB-8801`: no row,
  no marker, no refusal, Next **enabled**.
- ✅ **OPERATOR SMOKE — THE DOCK CAN STILL POST.** Full clerk path in EN: select
  → receipt → tick BPOM `Pass` → derived `Approved` → **Create GR**. Result:
  **`GR-2026-901`, disposition Accept, Posted to SAP, `MAT-DOC-…` assigned.**
  One tick between the old flow and the new one.
- **Console: 0 errors, 0 warnings.**

### Constraints discharged, in writing

- **No fabricated default anywhere.** Both seeds are `undefined`; no replacement
  token was invented.
- **The three states are distinguishable**, and the middle one now renders —
  verified in the browser in both languages, pinned by spec, probed by M3.
- ⚠️ **`inferHalal`'s APPLICABILITY MECHANISM IS UNTOUCHED.** Its prose parse is
  still wrong in the ways `INFERHALAL-READS-PROSE-01` measures; only the
  fabricated ANSWER is gone. Whether the check is asked stays its own arc.
- **Browser QA in EN and ID + an operator smoke** — above.
- **C9 pinned at `af7f0b4`** — no contract byte touched; this batch changes no
  declared field, no master row, no schema.
- **FLOOR 2219 → 2226/184.** `npm run gates` green; `scripts/floor.json` bumped
  as the gate's note asked.

---

## CP-3 · THE C9 HASHES, THE MIRROR SCOPE, AND THE CITED-SHA SWEEP

Three items, dispatched together after `#182`. They turned out to compose: the
first produced a number that only the second explains, and the third found the
mechanism that makes both recur.

### 1 · `C9-ISSUE-HASHES-01` — THE HASHES AT `af7f0b4`

**Every C9 issue from now on ships all three hashes IN THE MESSAGE ITSELF.**

SOMO could not run the diff we asked for. They hold **no byte-level mirror**, and
their entire ratification record for `f492b5c` is one prose line reading
*"3 files hashed"* — **with the hashes not written down.**

> **A RATIFICATION RECORDED IN PROSE IS A PROMISE WITH NO VERIFIER.** *(theirs,
> credited)* It is `SUMMARY-LOSS-IS-DIRECTIONAL-01` applied to the evidence
> rather than to the claim: the hashing *happened*, and the record of it retained
> the fact that it happened while discarding the only part that could be
> re-checked. **A record that cannot be re-checked is indistinguishable from a
> record that was never made.**

**The hashes at `af7f0b4`** — verified byte-identical at `af7f0b4` and at
`adc26e0` (today's main), so this pin is current, not historical:

| Path | git blob (canonical) | sha256 (normalised bytes) | bytes |
|---|---|---|---|
| `docs/contracts/C9-material-master-ref.md` | `2b4f38ddd19c8e68d9bfa1525443d3a8fff4c65c` | `9b381dcadf32425e6b7cac5409759ed28cdc73d9f49bf02980d2b76beff605a0` | 93 276 |
| `src/services/sdc/materialMasterRef.types.ts` | `7718f9e98b4f84a2045cb7fb9b7a234d0d3a8ce5` | `eb5a4e593e51370786db75d0c88c20b6f6deaf8ad5dedab1e95e4af18bb50084` | 21 882 |
| `docs/contracts/C9-required-fields.md` | `e6ddd94aa24980a0eed9be7c1019d7934250f8ed` | `e6acfd772d52d2cce2da9f351407db26d43802818d04525905a38ed92e5eae8f` | 4 295 |

Reproducible on any platform:
`git rev-parse af7f0b4:<path>` · `git show af7f0b4:<path> | sha256sum`

#### ⚠️ `HASH-IS-PLATFORM-DEPENDENT-01` *(new — and it would have wasted SOMO's next week)*

**A BARE `sha256` OF A C9 FILE IS NOT A FACT ABOUT THE COMMIT.** This repo has
`core.autocrlf = true` and **no `.gitattributes`**, so a Windows checkout holds
CRLF while the stored blob holds LF. The same commit yields two different digests
depending on who checks out:

| Path | sha256 of the **blob** (LF) | sha256 of a **Windows checkout** (CRLF) |
|---|---|---|
| `C9-material-master-ref.md` | `9b381dca…` (93 276 B) | `becd68b5…` (94 489 B) |
| `materialMasterRef.types.ts` | `eb5a4e59…` (21 882 B) | `2cd46f7e…` (22 271 B) |
| `C9-required-fields.md` | `e6acfd77…` (4 295 B) | `2e993f0b…` (4 419 B) |

Had we sent the working-tree digests, **SOMO would have hashed their own
checkout, got a clean mismatch on all three, and correctly concluded the contract
had drifted.** A false positive on a byte-identical file, generated entirely by
the verification step.

> **THE GIT BLOB ID IS THE ONLY PLATFORM-INDEPENDENT ANSWER**, because git
> normalises before hashing. **Both columns are published above rather than
> picking one**, with the reproduction command, so a mismatch tells SOMO
> *which* mismatch they have instead of just that they have one.

⚠️ It is worth naming what this shares with `PROBE-NEEDS-PROBING-01`, filed the
same day two items down: **both are the verification apparatus lying, not the
thing under verification.** A probe that never mutated and a hash that never
described the bytes are the same failure wearing different clothes.

#### ⚠️ THE FACT SOMO NEEDS MOST, AND IT ONLY APPEARS WHEN YOU LINE THE PINS UP

Against `f492b5c` — the tree SOMO actually ratified:

| Path | at `f492b5c` | at `af7f0b4` | |
|---|---|---|---|
| `C9-material-master-ref.md` | `f5c17be9…` | `2b4f38dd…` | ⚠️ **CHANGED** (Amendment 3, `#181`) |
| `materialMasterRef.types.ts` | `7718f9e9…` | `7718f9e9…` | **IDENTICAL** |
| `C9-required-fields.md` | `e6ddd94a…` | `e6ddd94a…` | **IDENTICAL** |

**TWO OF THE THREE FILES ARE BYTE-IDENTICAL TO WHAT THEY RATIFIED. EXACTLY ONE
MOVED — AND IT IS THE ONE THEY DO NOT HOLD.** See `MIRROR-SCOPE-GAP-01` below.
That composition is not a coincidence and it is not rhetoric: the authority
document is the one that carries amendments, so it is the one most likely to
move, and it is the one that fell outside the mirror. **The gap was widest
exactly where the drift was.**

### 2 · `MIRROR-SCOPE-GAP-01` *(new class)* — RATIFYING THREE PATHS WHILE HOLDING TWO

`docs/contracts/C9-material-master-ref.md` — **THE AUTHORITY** — is not in SOMO's
mirror and never was. **Across five issues. Neither side noticed.**

> **A RATIFICATION'S SCOPE AND A COUNTERPARTY'S CAPACITY TO HOLD IT ARE DIFFERENT
> FACTS, AND ONLY ONE OF THEM WAS EVER STATED.**

**OURS AS MUCH AS THEIRS, and the asymmetry runs our way.** We asked for a pin —
five times — **without ever asking what they could hold.** We specified the
scope of the obligation and never once checked the capacity to meet it, then
read five clean ratifications as confirmation that all three paths had been
checked. They had not been. Two had.

This is a class, not an incident, and it generalises past C9:

- **Every ratification protocol has two halves** — what is to be checked, and
  what the checker can actually reach. **We have only ever written down the
  first.** `C9-ISSUE-HASHES-01` above fixes the symptom (send the hashes) and
  **does not fix this**: a counterparty can receive three hashes and still hold
  only two files, and will then verify two and report three.
- ⚠️ **A CLEAN RATIFICATION IS EVIDENCE ABOUT WHAT WAS CHECKED, NOT ABOUT WHAT
  WAS ASKED.** Five clean returns looked like five confirmations of a
  three-path pin. They were five confirmations of a two-path pin, and nothing in
  the return distinguished the two — which is the same shape as
  `EMPTY-INPUT-REPORTS-CLEAN-01`, one counterparty out: **a check that silently
  skips its missing input reports success.**
- **The remedy is a capacity statement, not a stricter ask.** The next C9 issue
  must ask SOMO to **enumerate what their mirror holds** and return that list
  with the ratification, so scope and capacity are stated in the same document.
  **Booked, not built here** — it is an issue to be sent, and the operator sends
  issues.

### 3 · `CITED-SHA-SWEEP-01` — THE SWEEP, AND THE COUNT IS 2

`CITED-SHA-MUST-BE-REACHABLE-01` was found **by accident** after `977ce25` turned
out to be a deleted branch tip, and we had **never swept for others.** Now swept:
every hex token in `docs/` and `CLAUDE.md`, resolved against `origin/main`.

| | Count |
|---|---|
| hex candidates found | **57** |
| resolve as **commits** | 52 — **51 reachable on `main`**, ⚠️ **1 NOT** |
| resolve as **blobs** (the C9 pin convention) | 4 — **all 4 reachable** |
| resolve as **nothing at all** | ⚠️ **1** |
| **UNREACHABLE CITATIONS, TOTAL** | ⚠️ **2** |

> **A CITATION IS A CLAIM ABOUT REACHABILITY, NOT ONLY ABOUT CONTENT** *(theirs,
> and better than ours, credited)* — and **A DOC CITING AN UNREACHABLE SHA READS
> AS MORE RIGOROUS THAN ONE CITING NOTHING**, which is §7.13's flattering
> direction one layer out. **A SHA ON A BRANCH IS A PROMISE WITH A DELETION
> DATE.** Their composition, also theirs: **A CITATION THAT CANNOT BE RE-CHECKED
> IS THE SAME DEFECT AS ONE THAT CANNOT BE REACHED.**

**The two, and they are not the same severity:**

- **`977ce25`** *(findings.md — the known one)*. A deleted branch tip. Still in
  the local object store, so `git show` works **here** and would fail on a fresh
  clone. `git branch -a --contains` returns nothing. **Unreachable, recoverable
  only by accident of local history.**
- ⚠️ **`4623881`** *(findings.md, `VITE-BASE-01`: "Resolved in Batch 1.3 PR-B
  (`4623881`)"). **NEW, AND WORSE.** It is not an unreachable object — **it is
  not an object.** `git cat-file` does not know it, no prefix matches anything
  reachable from any ref, and it has presumably never existed in this repository
  since the day the branch was squashed. **A citation that was never true**,
  reading for months as a precise provenance claim.

#### ⚠️ THE MECHANISM, AND IT IS OUR OWN MERGE POLICY

Both instances have the same cause, and it is not carelessness:

> **THIS REPO SQUASH-MERGES AND DELETES THE BRANCH.** A squash merge **mints a
> new commit**; the branch's own SHAs never appear on `main` and are collected.
> **So a SHA copied off a pre-merge branch is unreachable BY CONSTRUCTION, not by
> accident** — it is guaranteed wrong the moment the PR merges, and it looks
> perfectly valid to whoever wrote it, because at the time they wrote it, it was.

That upgrades the rule from hygiene to a mechanical one:

**ONLY A POST-MERGE `main` SHA MAY BE CITED. A SHA READ OFF A BRANCH, A PR PAGE,
OR A LOCAL COMMIT IS A CITATION WITH A KNOWN EXPIRY**, and under squash-merge the
expiry is *the merge itself*.

**Recorded, not fixed.** The two citations are historical prose about closed
findings; **rewriting them would edit the record**, which this file does not do
(`A CLOSED HAZARD IS UPDATED IN PLACE, NEVER DELETED`). They are annotated in
place instead, and the rule above governs everything written from here.

⚠️ **THE SWEEP IS NOT A GATE AND IS NOT CLAIMED AS ONE.** It is a one-off census
run by hand; nothing re-runs it, so a bad SHA written tomorrow is invisible again.
**A derived check belongs here** — resolve every cited SHA against `origin/main`
and fail on a miss — and it is **booked, not built**: it needs a decision about
false positives (`4623881` was found only because a 7-hex token in prose happened
to be a real citation, and four legitimate blob hashes look identical to commit
SHAs at a glance). Building it inside a docs batch would be the
decision-smuggling this arc keeps refusing.

### Constraints discharged, in writing

- **DOCS ONLY.** No code, no schema, no fixture, no master row.
- **C9's BYTES ARE UNTOUCHED.** The three pinned paths are byte-identical at
  `af7f0b4` and at `adc26e0` — asserted above by blob hash, which is the point of
  the item.
- **THE COUNT IS REPORTED WHATEVER IT IS: 2.** One known, one new and worse. The
  sweep's own limits are stated rather than implied.
- **Both of SOMO's generalisations are credited to them**, and their
  ratification-in-prose finding is credited as theirs.
- **FLOOR 2226/184, unchanged.** `npm run gates` green.

---

## CP-3 · BOOKED, NOT BUILT — `SEAM-BIDIRECTIONAL-01` + `ADAPTATION-COST-IS-A-FIELD-01`

**Settled with SOMO and recorded here as an agreement, not a proposal.** Nothing
below is implemented: no contract object, no schema, no field, no code. This
entry exists so that the next batch to touch the seam is *agreeing with something
written down* rather than discovering what a conversation assumed — the same
reason `PROVISIONALLY_APPLICABLE_GROUPS` was written out at 2B-4a.

### `SEAM-BIDIRECTIONAL-01` — THE SEAM IS TWO-DIRECTIONAL BY AGREEMENT

**We define our master data, they consume it. THEY define their EMISSION, we
build to it.**

**BOTH DIRECTIONS GET THE SAME APPARATUS**, and it is the C9 apparatus by name:

- a **contract**
- a **pinned SHA**
- **hashes in the message** (`C9-ISSUE-HASHES-01`, and with them the
  which-bytes statement — `HASH-IS-PLATFORM-DEPENDENT-01`)
- an **amendment ledger**
- ⚠️ **SCOPE STATED WITH EVERY VERDICT** — `MIRROR-SCOPE-GAP-01`'s remedy,
  promoted from a fix for one incident to a standing property of both
  directions. A verdict that does not say what it covered is a verdict about an
  unknown set.

#### ⚠️ THE STRUCTURAL FACT: THE CONTRACT PACKAGE HAS NINE OBJECTS AND ALL NINE POINT ONE WAY

C1–C9 are **ours**: things we declare and SOMO consumes. **There is no object in
the package for a SOMO-DECLARED emission**, and there never has been. C7 and C8
name SOMO as a *producer* — but they are still **our** documents describing what
we will accept, which is not the same artifact as **their** document declaring
what they will send.

That asymmetry is why `C8-FIND-01` reads the way it does: a SOMO-emitted shape
lived in an **unratified proposal of ours** while our code hardened past it.
**A shape one party emits and the other documents has no owner**, and the
document then drifts in whichever direction that party's code moves.

⚠️ **THE OBJECT IDENTITY FOR THE INBOUND DIRECTION IS UNASSIGNED, AND IS NOT
ASSIGNED HERE.** Whether the SOMO emission contract becomes `C10`, lives in
their package, or is mirrored into ours is a decision with a ratification model
attached, and picking one inside a booking entry would be exactly the
decision-smuggling this arc keeps refusing. **Booked as open.**

#### THE EMISSION CONTRACT AND THE SHARED SEAM DOC ARE DIFFERENT OBJECTS

> **ONE IS DECLARED AND RATIFIED. THE OTHER IS NEGOTIATED.**

They fail differently and must not be merged for convenience:

| | Emission contract | Shared seam doc |
|---|---|---|
| Authored by | **the emitter**, unilaterally | **both**, jointly |
| Changes by | declaration + ratification | negotiation |
| A disagreement is | a **ratification failure** (below) | an **open item** |
| Silence means | the declared shape stands | nothing is settled |

Collapsing them would make every disagreement look like a negotiation — which is
precisely how a shape nobody can build gets accepted by attrition, and how a
shape nobody objected to gets read as agreed.

⚠️ **WHICH FILE IS "THE SHARED SEAM DOC" IS ALSO UNASSIGNED ON OUR SIDE.**
`C5-seams.md` is **not** it: C5 is our internal swap-point register (mock →
real), not a negotiated bilateral document. Recorded so nobody later reads C5's
title and assumes the slot is already filled.

#### RATIFICATION CAN FAIL — RARELY, AND SPECIFICALLY

**A ratification that can only succeed is not a ratification.** Every C9 return
so far has been clean, which is exactly the condition under which a rubber stamp
is indistinguishable from a check (`MIRROR-SCOPE-GAP-01` — five clean returns
covering two files of three).

A failure is **not** a rejection and **not** a negotiation. It carries two
things, both mandatory:

1. **THE FIELD, NAMED.** Not "the shape is wrong."
2. **WHAT WOULD MAKE IT BUILDABLE.** A refusal that cannot say what would fix it
   is half a refusal — the `uomOf` / `bpomOf` precedent, applied to a
   counterparty instead of a lookup.

**Rarely** is load-bearing. Tier 3 below is the only path that reaches here.

---

### `ADAPTATION-COST-IS-A-FIELD-01` — AND THE MIDDLE TIER IS THE ONE THAT DECAYS

Our three-tier response to their emission shape:

| Tier | Response | When |
|---|---|---|
| **1** | **Build to it.** | Default. |
| **2** | ⚠️ **Buildable but awkward — TELL THEM BEFORE WE BUILD.** | The tier that decays. |
| **3** | **Refuse**, with the specific field and what would fix it. | Genuinely unbuildable. |

#### ⚠️ TIER 2 IS THE WHOLE FINDING

> **TELL THEM BEFORE WE BUILD, NOT AFTER. THEY MAY SIMPLY CHANGE IT.**
> **ADAPTING FIRST AND REPORTING LATER IS HOW A CORRECTABLE DESIGN ERROR BECOMES
> PERMANENT.**

Once the compensating transform exists, the cost is sunk on our side and the
motivation to raise it is gone — so the conversation that would have fixed the
emission never happens. The window in which a tier-2 finding is *cheap for both
parties* closes at the moment we start building, not at the moment we ship.

#### THE COST RECORD IS A FIELD OF THE RATIFICATION, NOT A COURTESY BESIDE IT

> **"Built as specified" and "built with a compensating transform on field X"
> ARE DIFFERENT VERDICTS AND MUST RENDER DIFFERENTLY.**

A cost recorded in the covering prose is a cost that will be summarised away —
`SUMMARY-LOSS-IS-DIRECTIONAL-01`, and the direction is toward *cleaner than the
truth*. The same mechanism that turned *"3 files hashed"* into a ratification
with no verifier turns *"we adapted field X"* into *"built as specified."*
**A field survives summarisation. A sentence does not.**

#### SOMO'S REASONING, CREDITED — WHY THIS IS THEIR PROBLEM AND NOT OUR ADMIN

> **ADAPTATION COSTS ARE PAID ONCE AND THEN NORMALISE**, so the seam **LOOKS**
> clean while the cost goes invisible — and **A PILE OF SILENT ADAPTATIONS ON
> OUR SIDE IS EVIDENCE THEIR EMISSION SHAPE IS WRONG. IF THEY NEVER SEE THE
> COST, THEY NEVER LEARN IT.** *(theirs)*

This is the better argument and it belongs to them. Ours would have framed the
cost record as fairness — *we did extra work, note it.* Theirs frames it as
**instrumentation**: the count of compensating transforms is a **measurement of
their emission design**, and suppressing it destroys the only signal that would
have told them to change it. **It is a diagnostic we are currently discarding,
not a favour we are declining to ask for.**

⚠️ And it is the same shape as `FLOOR-IN-PROSE-01` one organisation out: **a
number that nothing forces anybody to look at stops being true without anything
failing.** An adaptation ledger that lives in prose decays exactly like a test
floor that lived in prose.

#### `plantCode` IS THE PRECEDENT — THE MIDDLE TIER WORKING OUT LOUD

Absent field **flagged**, **MEDIUM** priority, **degraded-not-broken** default,
**nothing fabricated**. Tier 2 executed correctly: the gap was named *before* it
was worked around, the workaround did not invent a value, and the degradation was
declared rather than hidden behind a plausible default.

⚠️ **`plantCode` DOES NOT EXIST IN THIS TREE**, and is recorded here as a
**seam-negotiation precedent**, not as a field of ours. A future reader grepping
for it will find nothing, and that is not a defect — it is the point at which
this entry stops describing our code and starts describing an agreement.

**It is also the tier-2 default done right, which is worth stating alongside
everything CP-3 just closed:** a degraded-not-broken default is legitimate
*precisely because it was declared*. `REQUIRED-OPENS-PRE-ANSWERED-01` was the
same mechanical act — supply a value nobody gave — and it was a defect **because
it was silent and asserted an answer**. The dividing line is not "did we default"
but **"did we say so, and does the default claim to be an answer."**

### Constraints discharged, in writing

- ⚠️ **BOOKED, NOT BUILT — and nothing was smuggled.** No contract object, no
  schema, no field, no type, no code. The two object-identity questions (what
  the inbound contract is called; which file is the shared seam doc) are
  **recorded as OPEN rather than answered**.
- **`plantCode` is disclosed as absent from this tree**, so the precedent cannot
  be mistaken for an implemented field.
- **SOMO's reasoning is credited to them**, and our weaker framing of the same
  point is stated so the difference is legible.
- **C9's bytes untouched**; pin `af7f0b4` unaffected.
- **FLOOR 2226/184, unchanged.** `npm run gates` green.

---

## CP-3 · THE C7 FREEZE THAT WAS NEVER HASHED — and the sweep that passed it

**Found by SOMO's sweep, not ours, and the reason ours could not have found it
is the finding.** Docs only; no code, schema, fixture or contract byte changed.

### `C7-FROZEN-CLAIM-IS-FALSE-01` — SOMO HAS READ HALF A DOCUMENT FOR THREE WEEKS

SOMO's corpus has carried, since 2026-07-14, the claim that
`docs/contracts/C7-pr-intake.md` is **"frozen on main @ `768b863`"**. They
raised it because they cannot verify it — it is our repository.

⚠️ **THE ANCHOR IS CORRECT. IT IS THE WORD "FROZEN" THAT IS FALSE.**

`768b863bb243991aaf0c1b937c1fdcd343a03613` is an object, is an ancestor of
`origin/main`, sits on main's **first-parent** line, has a **single parent**
(`dc059fc`) — i.e. it **already is** the squash-merge commit — and it is the
commit that **introduced** the C7 contract (PR **#68**, +304 lines).
**There is nothing to re-anchor. SOMO cited the merge commit correctly the
first time.**

The contract has moved **TWICE** since, and neither move reached them:

| Anchor | What landed | Bytes |
|---|---|---|
| `768b863` · #68 · 2026-07-14 | the contract, as SOMO cites it | **19 029** |
| `f82c63a` · #159 · 2026-08-03 | CP-1 close — C7 + C8 corrected | 38 603 |
| `af7f0b4` · #181 · 2026-08-06 | C9 Amendment 3 sync (= current main) | **40 329** |

**+309 / −52 lines. THE CONTRACT HAS MORE THAN DOUBLED.**

And the first thing added is the part that makes it unarguable:

> `## Correction record (2026-08-03) — read this before the contract`

**They have never seen the line instructing them to read it first.** Also
unseen by the counterparty: **`C7-FIND-02` and `C7-FIND-03`, both carrying
`(DEFECT, OPEN)` in their own headings**; §3.1's *"five payload keys no
document stated"*; and §6.1 **GG-4**, the material-join finding.

⚠️ This is `C9-STALE-BY-FIX-01` one contract over, and **worse in the way that
matters**: C9 went stale while carrying an amendment ledger and a pin protocol,
so the staleness was detectable and was detected. C7 carried **a citation with
no hash**, so **nothing failed when the text changed** — and the text changed by
109%.

### THE HASHES, at every anchor — `docs/contracts/C7-pr-intake.md`

| Anchor | git blob (canonical) | sha256 (normalised LF) | bytes |
|---|---|---|---|
| **`768b863`** *(SOMO's)* | `d826cb0dadd257b5ce2be6f82789c2f15d08c456` | `b68dad7572a0251ada87310d6822a35d3a8e1c230ba57adf345760acd5d49e77` | 19 029 |
| `f82c63a` | `d74a5f604d7c58a2330a6a34791629d8a485783a` | `95e01422b156b9dd4261d4ce8dbd22932dff793ffeaa845317590c08ebe257d4` | 38 603 |
| **`af7f0b4` = current main `47ad8cc`** | `c92b8f849feb71d3ae39411afc41aaf24c99a7d3` | `51c918bc229d575256bad536d23c82aa341a94f36189c24b6247b0dd7f5a668b` | 40 329 |

Reproducible anywhere: `git rev-parse <sha>:docs/contracts/C7-pr-intake.md` ·
`git show <sha>:docs/contracts/C7-pr-intake.md | sha256sum`.

⚠️ **`HASH-IS-PLATFORM-DEPENDENT-01` APPLIED, AND BOTH COLUMNS PUBLISHED.** The
figures above are the **git-normalised (LF)** bytes. A **Windows checkout** of
current main yields `e25bf63c3caae8423e87229252893254e2ce08815c2f3ed2c0b9e4fb64cd5987`
over **40 890 B** — a different digest over byte-identical content, because
this repo runs `core.autocrlf = true` with no `.gitattributes`. **Both are
published so that a mismatch tells the reader WHICH mismatch they have**, rather
than handing a counterparty a clean false positive on an unchanged file.

---

### `SWEEP-TESTS-REACHABILITY-NOT-TRUTH-01` — THE CLASS, AND IT INDICTS THE SWEEP'S DESIGN

The dispatch filed this as a coverage gap — *our sweep missed a citation of
ours living in their corpus.* **MEASURED, AND THAT IS NOT WHAT HAPPENED.**

**`768b863` IS in our corpus — twice** (`docs/g0-2-engine-scorecard.md:4` and
`:287`). `CITED-SHA-SWEEP-01` saw it, tested it, and **PASSED IT CORRECTLY.**
It is one of the 51 reachable commits that sweep reported as fine. It was never
missed and it is not a coverage failure.

> ⚠️ **A REACHABLE SHA CARRYING A FALSE CLAIM PASSES A REACHABILITY SWEEP
> CLEANLY.** `768b863` is a live object on main, and *"frozen on main @
> `768b863`"* is false anyway. **NO SWEEP OF SHAs CAN TEST A CLAIM ABOUT TEXT.
> That needs a HASH, and the hash was never recorded.**

It is `C9-ISSUE-HASHES-01` arriving from the opposite direction. There: a
**ratification** recorded in prose, with the hashes discarded. Here: a **FREEZE**
recorded in prose, with the hashes never taken. Same defect, same remedy, and
the two together make the general form plain — **an assertion about bytes,
recorded without bytes, is unverifiable by anyone on either side.**

⚠️ **AND THE ANCHOR BEING PERFECTLY VALID IS WHAT LET IT SIT SINCE JULY.** A
broken citation announces itself the first time somebody runs `git show`. A
*correct* citation attached to a *false* claim survives every check either side
possesses, indefinitely. **The half of the claim we could test was the half that
was true.**

**Consequence for the sweep, recorded not built:** `CITED-SHA-SWEEP-01`'s
derived-check successor is scoped to reachability and would inherit this hole.
A citation that asserts CONTENT ("frozen at", "ratified at", "unchanged since")
is a different object from one that asserts PROVENANCE ("landed in"), and only
the second is answerable by resolving a SHA.

---

### `SMOKE-ANCHOR-NAMES-THE-BATCH-NOT-THE-BYTES-01` — OUR INVERTED TWIN

Exposure swept across the register: **6 real instances** (7 raw matches, one a
false positive — `1f3e457` at `findings.md:87`, where *"stored as accepted"* is
defect prose, not an acceptance record).

| Anchor | Kind | Reachable? |
|---|---|---|
| `0a11733` | found on the 2f-b smoke | ✅ |
| `32778e4` | found on the 2f-c smoke | ✅ |
| `86ff895` | operator smoke on the BUILT BUNDLE | ✅ |
| `f2eeed8` | 2e-c-6 ID smoke | ✅ |
| `cf09e70` | on the documented smoke path | ✅ |
| `3860fe4` | SOMO's refinement, *accepted and built* | ✅ |

**All six reachable. All six post-merge main SHAs, first-parent on main. ZERO
decay exposure.** ⚠️ **And that is not the good news it looks like.**

Our smokes run against a **branch build, by construction** — the workflow smokes
before the PR merges, because merging is what the smoke gates. But `refs @`
cites the **merge commit of the batch the finding was filed in**. Therefore:

> **THEIR ACCEPTANCE CITED THE RIGHT OBJECT AND IT WAS DELETED. OURS CITE AN
> OBJECT THAT WAS NEVER THE ONE UNDER TEST.**
>
> Both fail the same practical test: **YOU CANNOT RE-RUN THE SMOKE AGAINST THE
> CITED COMMIT AND GET WHAT WAS SMOKED.** Theirs because the commit is gone;
> ours because the commit is not it.

⚠️ **OURS IS THE MORE INSIDIOUS OF THE TWO, PRECISELY BECAUSE IT PASSES EVERY
CHECK WE HAVE.** It is **not a false claim** — `refs @` honestly anchors *which
batch*, and never claimed to anchor *which bytes were smoked*. It is **A CLAIM
THAT CANNOT SUPPORT THE WEIGHT A READER WOULD PUT ON IT**, which a reachability
sweep is structurally unable to distinguish from one that can. Same shape as
`SWEEP-TESTS-REACHABILITY-NOT-TRUTH-01` above, turned on ourselves.

**THE FIX — STATED, NOT BUILT:**

> **AN ACCEPTANCE ANCHOR MUST NAME THE ARTIFACT TESTED, AND IF THAT ARTIFACT IS
> A BRANCH BUILD IT NEEDS A HASH, BECAUSE THE SHA WILL NOT SURVIVE.**

Not built here: it changes how every future smoke is recorded, and the shape of
that record (bundle digest? blob ids of the touched files? both?) is a decision,
not a detail. **Booked.**

---

### `ACCEPTANCE-ANCHOR-MUST-BE-REANCHORED-01` — FROM SOMO, WITH ATTRIBUTION

> **A SHA CITED AT ACCEPTANCE MUST BE RE-ANCHORED TO ITS MERGE COMMIT WHEN IT
> LANDS.** *(theirs)*

Their reasoning indicts the workflow rather than the author, and it is the part
worth keeping: **ACCEPTANCE HAPPENS AT A BRANCH TIP BY DEFINITION, BECAUSE THAT
IS WHAT IS BEING ACCEPTED.** So our own standing rule — *only a post-merge main
SHA may be cited* — is **UNFOLLOWABLE AT THE EXACT MOMENT CITATION MATTERS
MOST.** A rule that cannot be obeyed when it counts is not a rule, it is a
reprimand issued in advance.

Their instance: an operator acceptance smoke for a major arc close, anchored to
a commit deliberately reset away — **THE EVIDENCE FOR THE THING THAT MATTERED
MOST IS THE EVIDENCE THAT DECAYED.**

⚠️ **AND `768b863` IS NOT AN INSTANCE OF IT.** Recorded plainly so no later
reader takes it as the worked example: `768b863` was never a branch tip, never
decayed, and needs no re-anchoring — it is a squash-merge commit on main that
has been correct since the day it was written. **The rule is real and we need
it; this is simply not its case.** Filing a valid citation under a decay rule
would teach the wrong lesson twice — that the anchor was the problem, and that
hashing was optional.

---

### THE CROSS-CORPUS RULE — STANDS, WITH THE CREDIT CORRECTED

> **NEITHER SIDE'S SWEEP IS COMPLETE ALONE.** A citation of ours living in a
> counterparty's corpus is invisible to a sweep of ours, and the reverse.

This holds on its own merits and is worth acting on independently. ⚠️ **But the
credit for THIS find belongs elsewhere, and saying so is the point:
THEY DID NOT FIND A CITATION WE LOST. THEY FOUND A CLAIM WE NEVER HASHED.**
Attributing it to cross-corpus coverage would leave us building a bigger sweep
against a defect no sweep of that kind can see — the `EMPTY-INPUT-REPORTS-CLEAN-01`
trap one layer up, where the remedy is scoped to the wrong mechanism and
therefore reports success.

It also composes with `MIRROR-SCOPE-GAP-01`: there, a counterparty verified two
files of three and reported three. Here, a counterparty read one version of one
file and reported it frozen. **In both cases the returned verdict was clean, and
in both cases what it actually covered had never been stated.** `SCOPE STATED
WITH EVERY VERDICT` (`SEAM-BIDIRECTIONAL-01`) is the standing remedy for both,
and this is its second independent justification in three batches.

---

### Constraints discharged, in writing

- **DOCS ONLY.** No code, schema, fixture, contract byte or master row. The C7
  contract itself is **NOT edited** — this entry records what it says at three
  anchors, and correcting the counterparty's copy is an issue to send, which the
  operator sends.
- **The dispatched class was CORRECTED rather than filed as given** —
  `768b863` was in our corpus and our sweep passed it correctly. Filing it as a
  coverage miss would have been a false record in a register whose whole value
  is that it isn't one.
- **`ACCEPTANCE-ANCHOR-MUST-BE-REANCHORED-01` is credited to SOMO and
  explicitly marked NOT instanced here.**
- **`HASH-IS-PLATFORM-DEPENDENT-01` applied**: LF and Windows-checkout figures
  both published, with the reproduction command and byte counts.
- **C9's bytes untouched**; pin `af7f0b4` unaffected (blob
  `2b4f38ddd19c8e68d9bfa1525443d3a8fff4c65c`).
- **FLOOR 2226/184, unchanged.** `npm run gates` green.

### Status pointer — `INFERHALAL-READS-PROSE-01`

**ACCEPTED, ROUTED TO SEAT 3, AND SEAT 3 HAS RULED.** Landed in full in the next
entry, with two corrections against the investigation's own adjudication and the
numbered `D-COMP-HALAL` register. ⚠️ **Read that entry, not this line** — the
investigation's "two facts at two grains" and its reading of the empty
intersection as a *precondition gap* are both **superseded there** (three facts,
and the intersection is the honesty contract working). **`D-COMP-HALAL-4` is the
one open gate; `H1 → H2 → H3` are buildable, `H4` is not.**

---

## CP-3 · `INFERHALAL-READS-PROSE-01` — THE INVESTIGATION LANDED, TWO CORRECTIONS, AND SEAT 3'S RULING

**The investigation was reported, accepted in full, and routed to Seat 3.** Its
findings lived only in the report until this entry — including a decision
register that other documents were about to cite by number. **Landing it is the
point: a numbered register that exists only in a conversation is
`FLOOR-IN-PROSE-01` wearing a decision's clothes.**

Nothing is built. `inferHalal` is untouched, the "easy half" deliberately not
started.

### THE DEFECT, in one line

`inferHalal` (`GRInspectionWizard.tsx:272-275`) decides whether a received lot
needs a halal check by testing `description.toLowerCase().includes('halal')` —
a **regulatory determination made from free-text prose**. It is called at `:314`
(shipment lane) and `:333` (ASN lane), the only two writers of `halalRequired`.
**It fires on ZERO of the 9 receivable lines today**, and there is a **second,
undiscovered prose parse** doing the same job on a different field:
`AdaptiveContext.tsx:86-100`, where
`isHalal = cat.includes('halal') || 'food' || 'raw' || 'packaging'` selects which
halal certificate a supplier is told to provide (exposed at `:163`, no consumer
today).

**Both failure directions are live.** It fails OPEN silently — `false` is an
assertion, the row does not render, and `qualityValid`'s clause can never
engage. It fails CLOSED too: `.includes` has no word boundary and no negation
handling, so **`"non-halal"`, `"not halal certified"` and `"halal audit failed"`
all turn the check ON.**

---

### ⚠️ CORRECTION 1 — `sup-007` IS ON FIVE OF NINE, NOT THREE

Reported as three. **Measured again: FIVE receivable lines across FOUR of the
eight sources** — `shp-012` (`PK-PETB-8801`), `shp-013` (`PK-PETB-8802`),
`ASN-2025-00211` (`FR-ROUD-4470` **and** `PK-PETB-8804` — two lines on one ASN),
`ASN-2025-00198` (`PK-ALCP-2450`).

**The undercount UNDERSTATED the finding, and that is the direction that
matters.** `HALAL-XPERSONA-01`'s whitelisted contradiction does not sit on a
corner of the receiving surface — **it sits on the MAJORITY of it.** Whichever
surface is chosen as authoritative decides the halal answer for **more than half
of every line a goods receipt can be fed.**

Root cause, recorded because it will recur: **sources were counted where lines
were owed.** `ASN-2025-00211` carries two lines and was counted once. The same
conflation `BPOM-OFF-BY-SPACE-01` corrected when its blast radius went from nine
to seven — **a census population and an exposure count are different quantities.**

### ⚠️ CORRECTION 2 — `doc-001`, AND THE ADJUDICATION WAS WRONG, NOT JUST THE FACT

**Recorded against the ruling, per operator instruction, and not merely as a
data correction.**

The investigation reported `doc-001` (`supplierDocuments.ts:12`) as evidence
that *a halal certificate governs `PK-PETB-8801`, and the wizard asks nothing* —
filed as a fail-open **contradiction**. **The evidentiary half stands. The
adjudication of what the evidence MEANS was wrong.**

| Fact | Value | Reading |
|---|---|---|
| `doc-001` `expiryDate` | **`2026-05-15`** | ⚠️ **EXPIRED — 83 days ago** (today 2026-08-06) |
| `doc-001` `status` | `'Expiring Soon'` | ⚠️ **a decayed clock literal** — the exact `HALAL-CLOCK-STATE-01` shape (law 0.5), stored where it must be derived |
| `doc-011` | *BPJPH Halal Certificate Application — In Progress*, `'Under Review'`, `expiryDate: null` | ⚠️ **AN APPLICATION, NOT A CERTIFICATE** |

**The wizard asking nothing is still wrong. The correct verdict is not
`REQUIRED AND SATISFIED` — it is `REQUIRED AND NOT SATISFIED`:** a halal
certificate is required for this material, the only one ever held has expired,
and its replacement is an application under review.

⚠️ **AND THAT VERDICT IS ONLY EXPRESSIBLE IN THE REGISTRY'S VOCABULARY.**
`ComplianceLifecycleState` + `computeStatus` distinguish
`Missing / Under Review / Valid / Expiring / Expired`
(`complianceProjection.ts:48-58`); `schemeValid` (`:66-71`) adds the issuer axis
that would separately disqualify a MUI-legacy cert after 2026-10-17. **The GR
wizard's `halalSealCheck: 'Pass' | 'Fail' | undefined` cannot say any of it.**

**The correction is more damaging to the current design than the original
finding was.** As first filed, the wizard's silence contradicted a valid
certificate. As corrected, **the wizard has no vocabulary in which the true
answer can be written at all** — it can ask an inspector to tick a box, and the
real state is *the certificate expired in May and the replacement is in
review*. `SUMMARY-LOSS-IS-DIRECTIONAL-01`: the mis-adjudication ran toward
**tidier than the truth**, and a decayed status literal is precisely what made
the tidy reading available.

---

### ⚠️ `D-COMP-HALAL` — THE DECISION REGISTER, NUMBERED AND ON MAIN

**Landed here because other documents are about to cite these by number.**
Modelled on `D-COMP-BPOM` (P-2), whose **content** half remains unanswered after
CP-2. Items 1–3 and 5 are ruled below; **4 is the only one still open.**

| ID | The decision |
|---|---|
| **D-COMP-HALAL-1** | **APPLICABILITY CONTENT** — which material groups require a halal check at receipt. ⚠️ **It will NOT mirror BPOM.** BPOM rules packaging `NOT_APPLICABLE` by registry axis (`bpom.ts:100-101`); `doc-001` links a halal certificate to PET bottles and `AdaptiveContext:89` puts `packaging` inside `isHalal`. **Packaging is where the two regimes visibly disagree in-tree — and it is 4 of the 9 receivable lines.** |
| **D-COMP-HALAL-2** | **GRAIN** — material (master field) or supplier × material (registry). Decides whether the BPOM template is reusable at all. |
| **D-COMP-HALAL-3** | **WHAT IS BEING ATTESTED** — "Halal Seal Check" names a physical seal on a drum. Seal verification, certificate confirmation, or both as separate checks? One Pass/Fail currently conflates them. |
| **D-COMP-HALAL-4** | ⚠️ **THE DEAD-END RULING — THE ONLY ITEM STILL OPEN.** If applicability lands before the harvest, a required check has no certificate to verify against. Block · block with a recorded override · or stay unwired until R0.1. **Must be answered BEFORE any wire, not discovered during one.** **H4 is gated on this.** |
| **D-COMP-HALAL-5** | **SOURCE OF TRUTH** — which of the seven halal vocabularies governs a receiving decision. **RULED below.** |
| **D-OPS-PENDINGCAST** | The `'Pending' as OptionalCheck` cast (`mockGoodsReceipts.ts:79,293`) — legitimate fourth stored state (the display already renders it, `BuyerGoodsReceipt.tsx:90`) or fixture error? Mine to fix once ruled; not a compliance question. |

---

### SEAT 3'S RULING — ACCEPTED IN FULL

#### 1 · THREE FACTS, NOT TWO — the refinement, and it is the load-bearing one

The investigation decomposed the problem into two facts. **Seat 3 split the
receipt-time half in two, and the split is not cosmetic:**

| Fact | Grain | Clock | Who answers | How it fails |
|---|---|---|---|---|
| **APPLICABILITY** | material | **none** | compliance, once, per group | fails OPEN silently — no row renders |
| **SEAL CHECK** | received lot | none | **a human, at the dock** | fails on attestation — a tick nobody earned |
| **CERTIFICATE VERIFICATION** | supplier × material × cert | ⚠️ **yes** | a **lookup + projection** | fails on staleness, scheme, or absence |

**Applicability governs BOTH receipt-time halves.** `halalSealCheck` already IS
the second fact and is honestly shaped for it. **The third is performed nowhere
in this product today.**

> ⚠️ **NAME THEM SEPARATELY OR THE WIRING BATCH SMUGGLES ONE INSIDE THE OTHER.**

That is exactly what `doc-001` demonstrates: an inspector ticking *Pass* on a
physical seal would have recorded a satisfied halal check on a lot whose
certificate **expired 83 days earlier**. **A human's tick and a certificate's
validity are different facts with different answerers, and one Pass/Fail cannot
hold both.**

#### 2 · ⚠️ THE EMPTY INTERSECTION IS THE HONESTY CONTRACT WORKING, NOT A DATA BUG

The investigation measured it and read it as a precondition gap. **Seat 3's
reading is better and it reverses the conclusion.**

The master's 42 codes and the registry's 17 `RM-SAMPLE-*` codes are disjoint
**because the registry fixture's own header mandates placeholder codes as an
honesty device** (`complianceRegistry.ts:1-38`: placeholder supplier names,
`SAMPLE-` cert numbers, `RM-SAMPLE-` material codes, every issuer
"(illustrative)", no real certifying body ever named — *"the single most
sensitive fixture in the build"*). **The codes do not join because they are not
allowed to look real.**

> **So a wired gate today is NOT fail-closed honesty. IT IS AN OUTAGE WEARING
> COMPLIANCE CLOTHES.** *(Seat 3)*

And the consequence is the part that settles `H4`:

> ⚠️ **IT FORCES R0.1'S SCHEDULE THROUGH THE RECEIVING DOCK — A SCHEDULE
> DECISION SMUGGLED AS A GATE.** *(Seat 3)*

R0.1 is `NOT STARTED`, "THE long pole. No technical mitigation."
(`track-r-status.md:15`). Wiring the verification leg would make every receipt
in the product wait on a certificate harvest — **an operational decision about
Track R's pace, taken by a receiving-surface refactor, visible to nobody as
such.** This is `SEED-IS-AN-ANSWER-01`'s class at organisational scale.
**That is why H4 waits, and the reason is now written down rather than assumed.**

#### 3 · SOURCE OF TRUTH — THE REGISTRY GOVERNS RECEIVING (`D-COMP-HALAL-5`, RULED)

⚠️ **THE CONTRADICTION WAS NEVER A STALEMATE, AND TREATING IT AS ONE WAS THE
ERROR.** Four surfaces, and they do not carry equal weight:

| Surface | Keyed by | Says of sup-007 | Corroboration |
|---|---|---|---|
| Supplier master (`mockSuppliers.ts:219`) | **id** | `halalCertified: false` | — |
| Storefront (`supplierStorefront.ts:34`) | **id** | *BPJPH Halal Cert — **missing*** | — |
| Documents (`supplierDocuments.ts:12,22`) | **id** | MUI cert **EXPIRED**, BPJPH **application under review** | — |
| ⚠️ `c-008` (`buyerCompliance.ts:41`) | ⚠️ **NAME** | *BPJPH Halal Certificate — **Valid** to 2027-09-01* | ⚠️ **NONE** |

**THREE ID-KEYED SURFACES AGREE: not certified, remediation in flight.** The
single outlier is **name-keyed** — the exact defect `HALAL-XPERSONA-01`
registers — and it **stores `daysRemaining: 873` as a literal**, which is the
`HALAL-CLOCK-STATE-01` violation the DTO-v2 read exists to end.

**Measured: `873` was last true on 2025-04-11.** From today it should read
**391**. ⚠️ **The outlier overstates by 482 days, and is corroborated by NO
DOCUMENT ANYWHERE** — no `SupplierDocument`, no registry row, nothing.

> **A name-keyed row storing a clock literal 482 days stale, backed by no
> document, is not the other side of a contradiction. It is a stale surface,
> and the registry governs receiving.**

#### 4 · THE WHITELIST CONVERTS — IT DOES NOT CLOSE BY FIAT

`halalXpersona.invariant.test.ts:36-39` whitelists sup-007 and sup-003 as KNOWN
contradictions. **The ruling does not delete them.** It changes what they are:

> **FROM "two contradictions we tolerate" TO "TWO STALE SURFACES WITH A NAMED
> REPLACEMENT".** *(Seat 3)*

⚠️ **The mechanism OUTLIVES the close, and that is the reason to convert rather
than close.** The invariant's contract is `found ⊆ allowed` (`:19-23`) — a NEW
contradiction, on a supplier not on the list, still FAILS the gate. Deleting the
whitelist because the ruling settled these two would **retire the guard against
the next split** at the moment its subject matter was proven live. Same shape as
`BPOM-OFF-BY-SPACE-01`'s third amendment: **a finding named after its cause
outlives its cause.**

#### 5 · THE BATCHES

**`H1 → H2 → H3` are buildable now with no further operator input. `H4` is the
only WIRE, and it is gated on `D-COMP-HALAL-4`.** Their contents are Seat 3's
and are not restated here — recorded so the dependency and the single open gate
are on main before H1 is dispatched.

---

### Constraints discharged

- ⚠️ **NOTHING BUILT.** `inferHalal` untouched; the "easy half" deliberately not
  started — **retiring the prose parse needs somewhere to read FROM, and there
  is nowhere yet.** That is `D-COMP-HALAL-4`.
- **Both corrections recorded against the RULING, not only the fact** — the
  `doc-001` adjudication was wrong in the direction of tidier-than-true, and the
  sup-007 undercount understated its own finding.
- **`D-COMP-HALAL-1..5` now exist on main** and may be cited by number.
- **Seat 3's reasoning is attributed to Seat 3**, including the two formulations
  that changed our conclusion: *an outage wearing compliance clothes*, and
  *a schedule decision smuggled as a gate*.
- **C9's bytes untouched**; pin `af7f0b4` unaffected.
- **FLOOR 2226/184, unchanged.** `npm run gates` green.

---

## CP-3 · H1 — HALAL APPLICABILITY, AUTHORED AND NOT WIRED

The 2B-4a template, applied one regulation over. `INFERHALAL-READS-PROSE-01`
gets its named replacement: **applicability as a MASTER FIELD, read through ONE
refusal-shaped lookup.** Nothing is wired. `inferHalal` is live and untouched —
that is H2, and it needs its own smoke.

### What landed

| Artifact | What it is |
|---|---|
| `HalalApplicability` (`sdc/types.ts`) | `'REQUIRED' \| 'NOT_REQUIRED' \| 'UNDETERMINED'` — a three-member STRING union, on 2B-4a's recorded encoding decision (in `boolean \| 'UNDETERMINED'` the string member is truthy, so `if (e.halalApplicable)` compiles and converts an absence into a determination). |
| `MaterialMasterEntry.halalApplicable` | **REQUIRED on all 42 rows.** An entry that can omit it is an entry whose silence has to be interpreted. |
| `halalOf(code, master?)` (`sdc/halal.ts`) | `{ ok: true; required: boolean }` or `{ ok: false; reason; materialCode }`. **The reason reaches only the message — no caller may branch on it to proceed.** ONE refusal branch in every consumer. |
| `PROVISIONAL_HALAL_BY_GROUP` | The class rule, **derived from `MATERIAL_GROUPS`** — keys are the registry's groups, so a group added tomorrow appears automatically as `'UNDETERMINED'`, which refuses. |
| `halalApplicability.test.ts` | 18 tests. |

### THE RULE READS THE `axis`, AND NOTHING ELSE

`bpom.ts` derives its packaging half from the registry `axis` and names its
applicable half as **three quoted group numbers**. This rule has **no group
number in it at all** — asserted, not claimed: the test greps this module's own
source for a quoted `'MG-…'` literal (none) and `bpom.ts` for one (three), so the
difference is measured. The reason is not tidiness:

> **HALAL CRITICALITY IN A COSMETIC ATTACHES TO WHAT ENTERS THE FORMULA.**

The critical routes — animal-derived fats and their derivatives, alcohol as a
carrier or extraction solvent — run through the formulation grain **as a class**
rather than through three groups of it. So: `'formulation-ingredient'` and
`'upstream-input'` become `REQUIRED`; everything else `UNDETERMINED`.
**No chemistry is invented.** The rule states that a determination is NEEDED,
never what the determination is.

⚠️ **THE COST, RECORDED RATHER THAN DISCOVERED LATER:** a rule that reads only
the axis **cannot express a per-group ruling**, and `D-COMP-HALAL-1` will answer
per group. The shape gains a group layer when it does — a **NARROWING**, on
`bpomApplicability.test.ts`'s precedent, recorded as a ratification. Never a
loosening flag.

### ⚠️ PACKAGING IS `UNDETERMINED`, NOT THE BPOM AXIS RULE — SEAT 3

The single line in this batch that could not have been taken back. BPOM rules
packaging `NOT_APPLICABLE` by the same registry axis, on a regulation that
**excludes** packaging. Halal may not, and the tree says so twice:

| In-tree evidence | Says |
|---|---|
| `doc-001` (`supplierDocuments.ts:12`) | an **MUI halal certificate** whose `linkedTo` is a **PET bottle** material |
| `AdaptiveContext.tsx:89` | `packaging` sits **inside** the `isHalal` selector |

**We do not know whether they are right — so the seed says we do not know.**
Copying the neighbouring rule would have been the cheapest line in the file and
the only irreversible one: **eleven packaging rows would have acquired a
confident negative no compliance officer ever gave**, in a field whose entire
purpose is that nobody invents determinations. `D-COMP-HALAL-1` is compliance's
to answer, and the disagreement is now asserted per packaging group — halal
`UNDETERMINED` **and** BPOM `NOT_APPLICABLE`, side by side, so a later tidy-up
that aligns them goes red.

### ⚠️ `HALAL-PROSE-READS-AN-ANSWER-01` — THE NEW FINDING

Pointed at the master's own 42 labels, the prose parse
(`description.toLowerCase().includes('halal')`) and the class rule agree on
**four** rows and disagree on **thirty-eight**. ⚠️ A **counterfactual**, stated
rather than glossed: `inferHalal` reads a line `description`, never a master
label — this measures the MECHANISM on the master's population, the same
counterfactual `bpomApplicability.test.ts` runs with the prefix rule.

**And the four it fires on are the finding, not the thirty-eight:**

| Code | Label | What the word *halal* is doing there |
|---|---|---|
| `RM-EMUL-9410` | Glyceryl Stearate SE **(Halal Emulsifier)** | a CLAIM OF COMPLIANCE |
| `RM-EMUL-9430` | Polysorbate 80 — **Halal**, Food & Cosmetic Grade | a CLAIM OF COMPLIANCE |
| `RM-LAURIC-7200` | Lauric Acid 99% — **Halal Certified** | a CLAIM OF COMPLIANCE |
| `RM-STEAR-7300` | Stearic Acid — Double Pressed **(Halal)** | a CLAIM OF COMPLIANCE |

> **THE RULE READS AN ANSWER AND RETURNS A QUESTION.** Every label it matches
> asserts the material **already is** halal. A check being REQUIRED and a check
> being SATISFIED are different facts, and a substring cannot tell them apart in
> either direction — the same predicate returns `true` for *"non-halal"* and
> *"halal audit failed"*.

This is a **third** defect on the same line, distinct from the two already filed
(fails open on silence; fails closed on negation). It is also the sharpest
instance yet of `PREFIX-RULE-SUCCEEDS-BY-ACCIDENT-01`'s class: the mechanism
looks calibrated *because the rows it hits are the rows somebody wrote a
compliance claim into* — and a compliance claim is exactly the thing that would
make a check unnecessary rather than necessary.

**The rest of the measurement:**

- **27** rows the class rule says `REQUIRED` and the prose parse states a
  confident negative on — including `RM-PSTN-7150` (RBD Palm Stearin), the
  single most halal-load-bearing row in the master, whose label happens not to
  contain the word.
- **11** rows the master REFUSES on and the prose parse **answers anyway**,
  `false` on every one — the exact eleven `doc-001` gives us reason to doubt.
  That is `PREFIX-RULE-ASSERTS-A-NEGATIVE-01` one regulation over: a mechanism
  with no way to say *undetermined* converts every non-match into a
  determination it has no basis for.
- ⚠️ **THE FIRING SET MOVED BY ZERO**, asserted against the predicate rather
  than inferred from what the diff touched. The two mechanisms are disjoint.
  Containment runs one way: everything the parse fires on is also `REQUIRED`, so
  **H2 can only add checks, never remove one.**

### ⚠️ ZERO `NOT_REQUIRED`, AND THAT IS AN ASSERTION

The split over 42 rows is **31 / 0 / 11**. No row in this master has a basis for
saying a halal determination is unnecessary, and the one group where it could
have been argued by analogy — packaging, which BPOM excludes — is precisely the
group Seat 3 ruled `UNDETERMINED`. **A state left unused is honest; a state
filled in so the enum looks exercised is a fabricated determination.** The
consequence is pinned where a reader hits it: **`halalOf` cannot return
`{ ok: true, required: false }` against today's master.**

There is also **no deviation row**. `bpomApplicable` carries one
(`RM-EMUL-9440`, on `doc-201` — a determination somebody actually made). Nothing
in this tree is a halal determination about a MATERIAL: `doc-001` is a
certificate about a **supplier's** material, which is `D-COMP-HALAL-2`'s grain
question and not this field's answer. **No deviation is authored to make the
seed look better-evidenced than it is.**

### ALL 42 VALUES ARE PROVISIONAL — AND THE DISPOSAL CONDITION

**STRATEGIST-RULED ON BEST PRACTICE, PENDING COMPLIANCE RATIFICATION.** Recorded
as a decision *taken*, so ratification is an act of agreeing with something
written down rather than discovering what the fixtures quietly assumed. They are
**disposed of — not amended** — when `D-COMP-HALAL-1` is answered:

1. **Compliance's answer REPLACES the rule.** Every row is reseeded in the same
   edit and the word PROVISIONAL leaves the module with the values it qualified.
   A per-group ratification narrows the pin; it does not open a per-row override.
2. ⚠️ **IF A WIRE IS PROPOSED WHILE THIS IS STILL PROVISIONAL, THE PROVISIONAL
   SEED IS WHAT WOULD BE ENFORCED.** A `REQUIRED` here does not mean compliance
   asked for a check; it means nobody has said otherwise and the strategist ruled
   conservatively. Enforcing it against a certificate corpus that does not exist
   (R0.1 `NOT STARTED`) is the *outage wearing compliance clothes* Seat 3 named —
   the reason H4 is gated on `D-COMP-HALAL-4` and this batch wires nothing.
3. **If `D-COMP-HALAL-2` rules the grain is supplier × material, this field and
   this module are DELETED rather than migrated.** A master field at the wrong
   grain is not salvageable by adding a key.

### THE EXACT-KEY PIN FIRED, AND IT FIRED FIRST

`materialMasterAuthoring.test.ts:402` holds an **exact** key list for one master
entry, written at 2B-4a so *"a field added to the entry shape lands here first."*
It did: `halalApplicable` reddened that assertion **before any halal test
existed**, and the list was extended deliberately rather than by red-test reflex.
⚠️ The entry it guards (`PK-PETB-8825`) is **one of the eleven packaging rows the
seed leaves `UNDETERMINED`** — so the field announced itself on exactly the row
class the ruling is about.

### ⚠️ `H1-FALSIFIES-A-LIVE-COMMENT-01` — **CLOSED IN THIS PR, BY DISPATCH**

**This batch made a comment in a production file false, and did not touch it.**
`GRInspectionWizard.tsx:252-257` explains why `inferHalal` survives:

> *"It is left because RETIRING IT REQUIRES A FIELD THAT DOES NOT EXIST. There is
> no `halalApplicable` on `MaterialMasterEntry`; authoring one (plus its class
> rule, its provisional seed on all 42 rows and its `D-COMP-HALAL` escalation) is
> a 2B-4a-shaped batch…"*

**Every clause of that is now wrong**: the field exists, the class rule exists,
the seed covers all 42 rows, and the register is on main. This is
`C9-STALE-BY-FIX-01` exactly — **an artifact going stale by being FIXED**, one
file over and inside a comment rather than a contract.

⚠️ **The reason it was raised rather than carried:** the comment does not merely
describe the code, it **justifies leaving a live regulatory fail-open in place**.
A justification that has stopped being true is the one kind of stale comment that
can survive review on its own authority — the reader checks that the reasoning is
sound, not that the premise still holds. Between H1 and H2, a reviewer would read
it as a defensible reason to do nothing.

#### ⚠️ THE FENCE WAS MOVED BY DISPATCH, NOT BY THE SEAT

The batch was fenced (*`inferHalal` STAYS LIVE AND UNTOUCHED — that is H2*), so
the seat **asked instead of editing**, and the operator ruled: the fence holds
for **BEHAVIOUR**; it does not protect a false sentence about the master. The
paragraph is corrected **in the batch that falsified it**. Recorded this way on
purpose — *who moved the fence* is exactly the provenance a later reader needs,
and a comment edit inside a fence made silently is indistinguishable from a
builder deciding where the fence is.

**COMMENT ONLY. No logic, no consumer change, `inferHalal` stays live** — the
function body, both call sites and every behaviour in that file are untouched,
and the H1 test suite pins the wizard as still running the parse and still not
calling `halalOf`. The correction replaces a false premise with the true one:

> *`halalApplicable` is AUTHORED BUT UNRATIFIED — all 42 values PROVISIONAL
> pending `D-COMP-HALAL-1`, and wiring it against a certificate corpus that does
> not exist (R0.1 NOT STARTED) is an outage wearing compliance clothes. Retiring
> the parse is H2; the certificate leg is H4, gated on `D-COMP-HALAL-4`.*

⚠️ And the old paragraph is **quoted inside the new one** rather than deleted, on
the standing precedent (`bpomApplicability.test.ts`'s inversions): the file
records the SWAP, so a reader can see that a justification once existed and what
falsified it, instead of finding a comment that has simply always said this.

### Constraints discharged

- ⚠️ **NO WIRING, AND NO CONSUMER CHANGE.** `inferHalal`'s body and both call
  sites are byte-identical — the only edit in that file is the COMMENT the
  operator ruled on above;
  `GRInspectionWizard` still writes `halalRequired: inferHalal(li.description)`
  on both draft builders. Asserted, not promised: the test pins the wizard as
  still containing the parse, **not** containing `halalOf(`, and pins the module
  as having **zero** production importers and no barrel re-export (`bpom.ts`'s
  precedent). ⚠️ The scan's limit is stated in the test: `import.meta.glob`
  cannot see the file it is written in.
- **No prefix or substring rule decides anything** (C9 §3, ratified) — asserted
  over the module's own source, which contains no `startsWith(`.
- **The `D-COMP-HALAL-1..5` register was already on main** (previous entry); it
  is cited by number here and **not re-landed**.
- ⚠️ **NO KNOWN FALSEHOOD LEFT STANDING.**
  `H1-FALSIFIES-A-LIVE-COMMENT-01` was raised rather than edited (the file was
  fenced) and **the operator moved the fence**: comment retired in this PR, and
  the record says by whom.
- **C9's bytes untouched**; pin `af7f0b4` unaffected.
- **FLOOR 2226/184 → 2244/185**, bumped in `scripts/floor.json` because the gate
  printed the note asking for it. `npm run gates` green: build emitted a bundle ·
  2244 tests across 185 files · 7 gate tests.

---

## CP-3 · BOOKED, NOT BUILT — `RULE-NOT-POINTED-AT-THE-INBOUND-PATH-01` + `DISCLOSURE-TRAVELS-WITH-THE-VALUE-01`

Two classes out of this morning's SOMO exchange, booked on the standing rule:
**a class named in a conversation is not a class on main.** Nothing is built —
no code, no schema, no type, no field. The live instance below is **cited and
verified, not fixed.**

---

### `RULE-NOT-POINTED-AT-THE-INBOUND-PATH-01`

> **A RULE ADOPTED IN ONE DIRECTION OF A SEAM IS NOT ADOPTED IN THE OTHER, AND
> NOTHING MAKES THAT VISIBLE.**

Our lane refuses substituted values, and has for five batches. It is not a
preference — it is the thing CP-2 and CP-3 have been about:

| Rule | Where |
|---|---|
| An unresolvable material **refuses by name**, never silently skips | `uomOf` / `bpomOf` / `halalOf` (`sdc/materialMaster.ts`, `sdc/bpom.ts`, `sdc/halal.ts`) |
| An absence of determination is **stored as an absence** and refuses identically to an unknown code | `'UNDETERMINED'` (`bpomApplicable`, `halalApplicable`) |
| A derived fact is **never hand-stamped** into a control | `REQUIRED-OPENS-PRE-ANSWERED-01` |
| An unresolved correspondence is **written as unresolved**, never as a verdict | C9 §5.3 `ADJUDICATED_UNRESOLVED` |

**THE RULE WAS NEVER POINTED AT THE INBOUND PATH.** Every one of those governs a
value we READ or STORE. Not one of them was ever asked of a value arriving from
a counterparty through a creation payload.

#### THE LIVE INSTANCE, IN OUR OWN TREE

`MockCommandService.ts:615-616` — the `t_pr_create` creation handler:

```ts
const priority: PRPriority =
  payload.priority === 'High' || payload.priority === 'Low' ? payload.priority : 'Medium';
```

**Everything that is not `'High'` or `'Low'` becomes `'Medium'`** — a malformed
value, an unrecognised vocabulary, and **an absent field**, all three
indistinguishable afterwards from a priority somebody chose.

⚠️ **AND THE CORRECT RULE IS THREE LINES ABOVE IT, IN THE SAME FUNCTION**
(`:609-614`):

```ts
// `source` persists ONLY when it is a recognised producer token — an unknown
// or absent value leaves the PR without a producer mark (honest, not guessed).
```

**Same function, same author, same batch, opposite treatments — and the honest
one is commented as a principle.** That is what makes this a CLASS rather than a
lapse: **it is not ignorance of the rule. The rule was simply never pointed at
this path**, so it was applied where somebody was thinking about it and not
where they were not. The same asymmetry is visible in the type: `prSource` is
**optional** with a comment explaining why absence is honest, and `priority` is
**required** with no absence available — `PurchaseRequisition`, `types.ts:657`,
`PRPriority = 'High' | 'Medium' | 'Low'`.

#### WHY NOTHING MAKES IT VISIBLE

Our refusal discipline is asserted by tests **over the read path** — a lookup
that returns an outcome, a field with three states, a census that derives. A
creation payload has none of that shape to hang an assertion on: it is a bag of
`unknown`, coerced field by field, and **a coercion that substitutes looks
exactly like a coercion that refuses** at the call site. Nothing fails when the
rule is not applied, so nothing announced that it had not been.

**BOTH PLATFORMS HAVE NOW HIT THIS CLASS.** That is the argument for booking it
as a class rather than fixing one field: a defect two independent teams reach
from opposite directions is a property of seams, not of a handler.

**SHAPE OF THE FIX, NAMED AND NOT BUILT** (`CENSUS-MUST-DERIVE-01`'s own
medicine): a **derived** check over every creation payload — for each field the
handler reads, it either refuses, or records the absence, or is a declared
exception with a reason. Argued and costed in its own batch. **A list of
handlers somebody remembers to extend is the thing that failed here.**

---

### `DISCLOSURE-TRAVELS-WITH-THE-VALUE-01` — **SOMO's, and credited to them**

> **A DISCLOSURE HAS TO TRAVEL WITH THE VALUE, NOT WITH THE CONTRACT.** *(SOMO)*

**It is the missing half of the `plantCode` ruling** (this register, *"`plantCode`
IS THE PRECEDENT — the middle tier working out loud"*). That entry said a
degraded-not-broken default is legitimate *precisely because it was declared*.
SOMO's refinement says **where** it has to be declared, and the two cases split
on exactly that:

| | `plantCode` | `priority` |
|---|---|---|
| Degradation declared? | **yes** | **yes — in a contract** |
| Visible **in the record**? | ⚠️ **YES** — the flag travels with the row | ⚠️ **NO** — invisible at the moment of substitution |
| Can a reader of the record tell? | **yes** | ⚠️ **NO — a chosen `Medium` and a defaulted `Medium` are the same bytes** |

`REQUIRED-OPENS-PRE-ANSWERED-01` set the dividing line as *"did we say so, and
does the default claim to be an answer."* **This sharpens the first half: SAID SO
WHERE.** A disclosure that lives in a contract is read once, at integration
time, by the person building the seam — and never again by anyone reading a row.
**A default disclosed only in a document is silent everywhere the value is
actually used.** Same family as `FLOOR-IN-PROSE-01` and
`GOVERNANCE-INSIDE-THE-GOVERNED-01`: a rule whose only home is a document binds
only that document's readers.

#### STRATEGIST LEAN — ON RECORD, NOT RULED

> **THE DEFAULT SHOULD NOT EXIST.** An omitted priority should be an **ABSENCE**
> — recorded as absent, rendered as absent, never substituted.

Recorded as a **LEAN, not a ruling**, and deliberately not acted on: making
absence expressible means `PRPriority` gains an absence (optional field, on the
`prSource` precedent three lines away) and every render of `priority` has to say
what absent looks like. **That is a build**, and this entry is a booking.

⚠️ **AND THE EXPOSURE IS NOT AN EDGE CASE.** SOMO are verifying whether they emit
`priority` **at all**. If they do not:

> **EVERY REQUIREMENT THEY HAVE NOTIONALLY SENT WOULD HAVE CARRIED A `Medium`
> NOBODY CHOSE.**

Not some rows — **100% of inbound rows**, each one arriving as a field the
receiving system asserts and the sending system never wrote. The substitution
would be the only thing that had ever set that field. **The measurement is
pending on their side and is not assumed here**; what is recorded is that the
class's blast radius is *all of it or none of it*, which is precisely why the
answer is worth waiting for rather than defaulting past.

---

### Constraints discharged, in writing

- ⚠️ **BOOKED, NOT BUILT.** No code, schema, field, type or fixture. The live
  instance is **cited and left standing**; the shape of its fix is named, not
  written.
- **The live instance is VERIFIED IN THIS TREE**, with file and line
  (`MockCommandService.ts:615-616`, `types.ts:657`) — not carried from the
  conversation. The adjacent correct treatment (`:609-614`) is quoted because it
  is what makes the class legible.
- **SOMO's formulation is credited to SOMO**, and it is the half our own
  `plantCode` precedent was missing — stated that way round rather than as a
  point we had.
- **The strategist lean is recorded AS A LEAN**, with the build it would require
  named so nobody mistakes a booking for a decision.
- **C9's bytes untouched**; pin `af7f0b4` unaffected.
- **FLOOR 2244/185, unchanged.** `npm run gates` green.

---

## CP-3 · H2 — THE PROSE PARSES ARE RETIRED, AND THE APPLICABILITY IS WIRED

`INFERHALAL-READS-PROSE-01` **CLOSED.** Both parses are gone — the one on the
receiving surface and the one nobody had found — and `halalOf` is what the goods
receipt reads. **The behaviour moved on every one of the nine receivable lines,
in one direction.**

### What changed

| | Before | After |
|---|---|---|
| `LineDraft` | `halalRequired: boolean`, from `description.toLowerCase().includes('halal')` on each builder | `halal: HalalOutcome`, from `halalOf(materialCode)` through ONE seed |
| `qualityValid` | `halalRequired && !halalSealCheck` — a clause that could never see an absence | `!l.halal.ok` **then** `l.halal.required && !l.halalSealCheck` |
| Refusal | none — a miss was a silent `false` | a named banner, `role="alert"`, EN + ID |
| `AdaptiveContext` | `isHalal = cat.includes('halal') \|\| 'food' \|\| 'raw' \|\| 'packaging'` | **retired**; the country-level requirement stays, the per-category discrimination goes |

**One refusal branch, both reasons.** `reason` reaches the message and nothing
else — `GR_HALAL_REFUSAL_KEY` is a lookup for a sentence, not a fork. ⚠️ The
order in `qualityValid` is load-bearing and the compiler enforces it: `required`
does not exist on a refusal, so `!ok` must be tested first. That is why the
outcome is a discriminated union rather than a boolean plus a flag.

---

### ⚠️ THE DELTA, LINE BY LINE — all nine, measured

| # | Source | Material | Was | Now |
|---|---|---|---|---|
| 1 | `shp-012` | `PK-PETB-8801` | silent `false` | ⚠️ **REFUSES** |
| 2 | `shp-013` | `PK-PETB-8802` | silent `false` | ⚠️ **REFUSES** |
| 3 | `shp-014` | `RM-COCO-8200` | silent `false` | **asks** (already BPOM-refused) |
| 4 | `shp-015` | `FR-WARD-4410` | silent `false` | **asks** |
| 5 | `ASN-2025-00211` | `FR-ROUD-4470` | silent `false` | **asks** |
| 6 | `ASN-2025-00211` | `PK-PETB-8804` | silent `false` | ⚠️ **REFUSES** |
| 7 | `ASN-2025-00198` | `PK-ALCP-2450` | silent `false` | ⚠️ **REFUSES** |
| 8 | `ASN-2025-00301` | `RM-PSTN-7150` | silent `false` | **asks** (already BPOM-refused) |
| 9 | `ASN-2025-00302` | `RM-EMUL-9440` | silent `false` | **asks** |

**FIVE gain a question · FOUR refuse · ZERO lose a question.** The parse said
`false` on all nine, so the delta is one-directional **by measurement, not by
argument** — nothing moved from checked to unchecked, and H2 could only add.

⚠️ **AND THE OPERATOR'S EXPECTATION WAS NOT MET — RECORDED, NOT SMOOTHED.** The
dispatch expected `RM-COCO-8200` and `RM-PSTN-7150` to refuse. **They do not.**
Both are MG-10, which the halal class rule marks `REQUIRED`; what they refuse
under is **BPOM**, a different regime and a state they were already in. The four
halal refusals are **all packaging** — which is Seat 3's `D-COMP-HALAL-1` ruling
landing exactly where it said it would. A dispatch expectation quietly not met
is a finding, so it is written here rather than absorbed.

### ⚠️ THE CONSEQUENCE NOBODY HAD STATED: THERE IS NO QUIET MATERIAL LEFT

In today's master **BPOM-`NOT_APPLICABLE` ⇔ packaging ⇔ halal-`UNDETERMINED`**.
Composed, that means:

> **NO MATERIAL IN THE MASTER CLEARS THE QUALITY STEP WITHOUT A HUMAN ANSWER,
> and four of the nine receivable lines cannot clear it at all.**

It surfaced as test pressure rather than as analysis: `BuyerGoodsReceipt.test.tsx`
had to move its material for the **second** time (`PK-UITEST-1` → `PK-PETB-8804`
at 2B-4b → `AI-NIAC-6601` here) and then tick two radios, because there was no
third option. Both moves are recorded inline at the fixture.

---

### `HALAL-PROSE-READS-AN-ANSWER-01` — the retirement, and what it took with it

The deleted line carried **three defects in three directions**, and the header
comment that replaces it keeps all three:

1. **FAILS OPEN** — a substring miss is a confident `false`, silently.
2. **FAILS CLOSED ON NEGATION** — `"non-halal"`, `"not halal certified"` and
   `"halal audit failed"` all turn the check ON.
3. **READS AN ANSWER AND RETURNS A QUESTION** — the four master labels it fired
   on are the four CLAIMING THE MATERIAL ALREADY IS HALAL.

And it read `description`, which on the ASN lane is **supplier-submitted free
text**. C9 §3 forbids deriving semantics from `materialCode` because we do not
promise its shape; deriving them from prose a counterparty types is the same
class on a weaker input.

**Asserted as a DERIVED TREE-WIDE PROPERTY**, the way C9 §7.3's discharge was —
not a file list. The scan is per-line over every non-test module, and **comments
are exempt by construction**: the retired rules are restated in comments on
purpose, and a check that cannot tell code from record would force deleting the
evidence along with the defect.

⚠️ **THE SCAN FOUND A THIRD PARSE, AND IT IS NAMED RATHER THAN REGEXED AWAY** —
`DISCOVERY-CHIP-PROSE-FILTER-01`, `BuyerDiscovery.tsx:213`:
`certifications.filter((c) => !c.toLowerCase().includes('halal'))`. It is a
**display dedupe** — the halal chip already renders from `halalCertified`, and
this stops it appearing twice. It decides nothing regulatory and sits on no path
a receipt can travel, so it is out of H2's scope; it is still a prose test over a
cert string, so it is pinned as an **exact set of one**. A second cannot arrive
quietly.

---

### THE SECOND OPINION: `AdaptiveContext`'s `isHalal` — RESHAPED, NOT RETIRED

It decided **which halal certificate a supplier is told to provide** by
substring-matching a category label, and it returned `true` for a PET bottle —
an unlicensed second opinion on exactly the question `D-COMP-HALAL-1` leaves
open. Zero consumers, which is why it survived review; but it is **exposed on the
context value and reachable by any caller**, so "dormant" was a property of
today's callers, not of the code.

**Deleting the halal entries outright was the other candidate and was rejected**:
it removes a TRUE statement along with a false discrimination and leaves the
Indonesian list *quieter than the truth*. The false part was never *"Indonesia
has a halal certification regime"* — it was the **per-category discrimination**.
So the discrimination goes and the country-level fact stays, which is the shape
`SA` in that same function always had (`GCC Halal Certificate (mandatory)`,
unconditional). **Three countries, three shapes, and one of them was already
right.**

⚠️ **RESHAPING IT TO "READ THE MASTER" WAS NOT AVAILABLE**: the function is given
a CATEGORY, not a material code, so a master lookup would have required inventing
a category→material join — the fabrication this whole arc refuses. What it may
say is now written down at the call site: a country-level regime, never a
material-level determination. **No behaviour changes today** — still zero
consumers.

---

### ⚠️ `H2-NOT-REQUIRED-IS-UNREACHABLE-01` — FOUND BY A MUTATION PROBE

Widening the render condition from `halal.ok && halal.required` to `halal.ok` —
which would ask an inspector for a **seal check on a material ruled
`NOT_REQUIRED`** — **SURVIVES THE ENTIRE SUITE.**

It survives because it is currently UNREACHABLE, not because the suite is
careless: **no row in the master is `'NOT_REQUIRED'`** (H1's 31/0/11 split). The
BPOM gate has this twin covered only because packaging gives it one.

Pinned as the fact that makes the gap true, so it **self-invalidates**: the day
`D-COMP-HALAL-1` rules any group `NOT_REQUIRED`, the assertion goes red and
whoever lands that ruling writes the UI twin that cannot be written today. Not
skipped, not a placeholder — it asserts something real about the master.

---

### BROWSER QA — EN and ID, on the built bundle

Served from `dist/` (`vite preview`), HashRouter, buyer persona. ⚠️ `npm run dev`
does not boot this app — `app/index.html` carries `src="../src/main.tsx"`, which
the dev server resolves to an HTML 200 and the browser rejects as a module, so
the page renders blank. **QA is on the build, which is what Vercel ships.**

| # | What was witnessed | EN | ID |
|---|---|---|---|
| 1 | `ASN-2026-012` / `PK-PETB-8801` — halal refusal names the code, `role="alert"`, **Next disabled**, no seal control offered, **no BPOM refusal** (so the block is unambiguously halal) | ✅ | ✅ |
| 2 | `ASN-2026-015` / `FR-WARD-4410` — **both** checks render unanswered (`role="status"`), Next disabled; answering both clears both markers and **enables Next** | — | ✅ |
| 3 | `ASN-2025-00211` — **two lines, two verdicts**: line 0 (`FR-ROUD-4470`) asks both questions, line 1 (`PK-PETB-8804`) refuses on halal only | ✅ | — |
| 4 | `ASN-2025-00301` / `RM-PSTN-7150` — **halal ASKS and BPOM REFUSES on the same line**, separately named | — | ✅ |

**NO REACHABILITY GAP.** All eight receivable sources (nine lines) appear in the
wizard's own source picker, so **every refusal this batch creates can be
witnessed by a clerk** — unlike `ASN-2025-00201`'s Discrepancy status, which had
no surface. A refusal that cannot be witnessed is not a delivered refusal; these
are delivered.

⚠️ **ONE PRE-EXISTING GAP OBSERVED, NOT INTRODUCED AND NOT FIXED:** the shared
`Wizard` component hard-codes its nav buttons — `Cancel` / `Back` / `Next` stay
English under ID (`ui-v2/Wizard.tsx:122-136`, unchanged since #42). The step
labels, the check labels, both markers and both refusals all localise correctly.
Reported because it was seen, out of scope because it belongs to the wizard
chrome and to every batch that ever used it.

### Operator smoke — 4 judgement steps

Everything a machine can confirm is burned down above. What is left is judgement:

1. **`ASN-2026-012` → Quality.** Read the refusal as a receiving clerk. Does it
   tell you what to do next, or only that you are stuck? (It names the code and
   says "until someone rules on it" — it does not say *who*.)
2. **Same screen in ID.** Is *"Penerapan halal tidak dapat ditentukan"* the right
   register for a warehouse audience, or too legal?
3. **`ASN-2026-015` → Quality.** Two required checks stacked on one line. Is the
   density acceptable, or does the second control read as a repeat of the first?
4. ⚠️ **`ASN-2025-00301`.** Halal asks, BPOM refuses, on ONE line. **Is it
   defensible to ask an inspector for a halal seal answer on a line the receipt
   cannot be completed for anyway?** The alternative — suppressing questions on a
   refused line — hides work that will be owed the moment the refusal clears.

---

### SMOKE PASSED — and the two operator outcomes it produced

Four steps plus the EN repeat, console clean. Two of the four steps returned
something the batch did not have before it ran: a **ruling** on the step-4
judgement, and a **finding** on the step-1 message. Both are the operator's and
both are recorded here rather than in the conversation they were made in.

| Step | Subject | Result |
|---|---|---|
| 1 | `ASN-2026-012` / `PK-PETB-8801` | refusal verbatim, Next disabled — and the **Lab-sample toggle correctly does not unstick it** |
| 2 | the same, in ID | full chrome, banner verbatim, **identical** enable/disable. Register accepted as OK for now |
| 3 | `ASN-2026-015` / `FR-WARD-4410` | both controls unanswered with markers, Next disabled; Pass on both clears the markers and enables Next. **Verified ID and EN** |
| 4 | `ASN-2025-00301` / `RM-PSTN-7150` | halal ASKS, BPOM REFUSES, two messages never merged, and **NEXT STAYS DISABLED AFTER THE HALAL ANSWER** |

⚠️ **Step 4 is Seat 3's three-fact split holding ON SCREEN** — and it does so on
the one material where the retired parse returned a confident `false`. The
`Cancel / Back / Next` chrome staying English is known, pre-existing, and not
this batch (`ui-v2/Wizard.tsx`, unchanged since #42).

---

### ⚠️ OPERATOR RULING — ASKING ON A REFUSED LINE IS DEFENSIBLE

The step-4 judgement, ruled:

> **THE WORK IS GENUINELY OWED, AND IT IS RECORDED THE MOMENT THE OTHER REGIME
> CLEARS. SUPPRESSING IT WOULD HIDE WORK THAT WILL BE DEMANDED LATER.**

So a line refused by one regime still ASKS the other regime's question. The
alternative — rendering only the refusal and hiding every outstanding question
behind it — would make the visible workload of a line depend on which gate
happens to fail first, and would spring the hidden work on whoever clears the
refusal.

⚠️ **AND THE COUNTER-ARGUMENT, RECORDED BESIDE IT SO A FUTURE READER KNOWS THE
COST WAS WEIGHED RATHER THAN MISSED:**

> **A CHECK PEOPLE CLICK THROUGH IS WORSE THAN NO CHECK.**

An inspector who meets a question on a line they already know cannot be completed
learns that answering is ceremonial. That habit does not stay on refused lines —
it is carried to the ones that matter, and a regulatory control answered by
reflex is a fabricated attestation with a human's name on it. The ruling accepts
that cost against the certainty of hidden work; **it does not deny it.** If the
click-through habit is ever observed in the operator lane, this is the entry that
says the trade was made deliberately and can be remade.

---

### ⚠️ `HALAL-REFUSAL-DEAD-ENDS-01` — FILED BY THE OPERATOR, NOT FIXED HERE

**The refusal is HONEST BUT NOT ACTIONABLE.** It names the material and says a
ruling is missing. It does not say **who rules, where, or what the clerk does
with the delivery meanwhile.**

> **A clerk at a dock with a truck waiting has a blocked line and no route. THE
> MESSAGE ENDS THE CONVERSATION INSTEAD OF ROUTING IT.**

This is the honest half of the fix arriving without the useful half. `bpomOf`'s
refusal has carried the same shape since 2B-4b and nobody had named it; H2
doubled its reach, which is what made it visible.

#### WHY IT IS NOT FIXED IN THIS BATCH — THE DESTINATION DOES NOT EXIST

There is **no compliance surface today where `halalApplicable` is set.** A message
saying *"raise this with Compliance"* would **point at nothing** — a sentence that
reads as helpful and cannot bear what a reader would do with it, which is the
class this register keeps retiring (`ANSWER-ABOUT-NOTHING-01`,
`FLOOR-IN-PROSE-01`, the `plantCode` disclosure line). **The routing batch builds
the destination and the message TOGETHER**, or it ships a second dead end with
better manners.

#### THE OPERATOR RULINGS THAT SHAPE THAT BATCH

1. **THE UNRULED THING IS A POLICY DETERMINATION ON THE MATERIAL MASTER**, made
   once per material or group — **NOT a per-receipt approval.** A manager
   approving one line would be approving a regulatory classification they do not
   own, one receipt at a time, forever.
2. **IT BELONGS ON THE COMPLIANCE SURFACE, NOT THE DOCK.** The dock's job is to
   report that it is blocked; it is not the place a classification is decided.
3. ⚠️ **AN EMAIL UNLOCK IS AN OVERRIDE, AND OVERRIDES ON REGULATORY GATES
   NORMALISE** — the first is deliberate, the fiftieth is a reflex. If one is ever
   built it must be a **NAMED, AUDITED EVENT WITH AN OWNER AND A REVIEW CADENCE**,
   not an unlock. That is `D-COMP-HALAL-4` option (b), **and it is not taken.**
4. ⚠️ **THE CHEAPER ANSWER FIRST: ALL FOUR BLOCKED LINES ARE PACKAGING.** Ruling
   `D-COMP-HALAL-1` — *is contact packaging in scope for halal* — **unblocks all
   four with no override mechanism at all.** Get the ruling before building a way
   around its absence.

⚠️ Point 4 is the one to re-read in six months. The expensive artifact (an
override path, an audit event, an owner, a cadence) would have been built to
route around a single unanswered question that **the same four lines are waiting
on anyway** — `SEED-IS-AN-ANSWER-01`'s shape at process scale: a mechanism
standing in for a decision, and outliving the decision once it is finally made.

---

### Constraints discharged

- **NO REGISTRY READ, NO CERTIFICATE LOGIC.** Seat 3's three-fact split is held
  in the type: `halalSealCheck`'s doc comment states it is a HUMAN's attestation
  about a physical seal and **not** certificate verification, and the refusal copy
  says "halal check", never "halal certificate". H3/H4 are untouched, and H4
  stays gated on `D-COMP-HALAL-4`.
- **The two refusal banners are never merged.** A line can be refused by one
  regime and answerable by the other — four of the nine are exactly that — and
  one shared "compliance cannot be determined" message would delete which
  regulator has not ruled.
- **No prefix or substring rule decides anything** (C9 §3, ratified).
- **C9's bytes untouched**; pin `af7f0b4` unaffected.
- **FLOOR 2244/185 → 2251/185.** `npm run gates` green: bundle emitted · 2251
  tests across 185 files · 7 gate tests.
- **Mutation-probed, both directions**: removing the `!l.halal.ok` branch fails 3
  specs; widening the render condition fails NOTHING, and that is filed above
  rather than left as coverage.
- **The smoke's two outcomes are ON MAIN, in this entry** — the step-4 ruling
  *with its counter-argument*, and `HALAL-REFUSAL-DEAD-ENDS-01` filed and NOT
  fixed. A ruling that exists only in the conversation it was made in is
  `FLOOR-IN-PROSE-01` wearing a decision's clothes.

---

## CP-3 · H3 — CERTIFICATE VERIFICATION, BUILT HEADLESS

Seat 3's three-fact split is now three things. `verifyHalalAtReceipt` is the
third — **a pure function, with no consumer, deliberately.** H4 wires it and H4
is gated on `D-COMP-HALAL-4`.

| | Fact | Grain | Clock | Answerer | Status |
|---|---|---|---|---|---|
| 1 | APPLICABILITY | material | **none** | compliance policy (master field) | wired at H2 |
| 2 | SEAL CHECK | receipt line | receipt | the inspector, by hand | wired at H2 |
| 3 | **CERTIFICATE VERIFICATION** | supplier × material × instant | **receipt instant** | the certifier, via the registry | **built here, WIRED NOWHERE** |

```
verifyHalalAtReceipt(supplierId, materialCode, registry, receiptInstant)
  → { verdict: 'SATISFIED';     certId; certType; expiryDate }
  | { verdict: 'NOT_SATISFIED'; reason: 'NO_CERT' | 'EXPIRED'
                                      | 'SCHEME_INVALID' | 'UNDER_REVIEW' }
```

`registry` is an ARGUMENT, not an import — the module never reaches for
`COMPLIANCE_REGISTRY`, so it cannot widen a `QueryScope`. `receiptInstant` is an
ARGUMENT, never a clock read: the question is *was this lot covered when it
arrived*, which stops being the same question the moment a certificate lapses
between receipt and review.

---

### 1. DOES THE EXISTING PROJECTION ANSWER EVERY CASE? — NO. TWO GAPS, FILED

`daysRemaining` / `computeStatus` / `schemeValid` are reused verbatim and
nothing is reimplemented. The verdict mapping is **total by construction rather
than by a second rule**: `schemeValid` is false for exactly four situations —
Missing, Under Review, Expired, mandate-retired scheme — and `computeStatus`
names the first three, so the `else` is the fourth and only the fourth.

⚠️ **Two cases the existing projection genuinely cannot answer. Neither is
patched here; writing a second projection beside the first is the thing this
batch was told not to do.**

#### ⚠️ `HALAL-VERIFY-FOREIGN-RECOGNITION-01` — a foreign cert reads SATISFIED with its own row saying otherwise

`schemeValid` tests exactly one scheme clause: `HALAL_MUI_LEGACY` after
`BPJPH_MANDATE_DATE`. `HALAL_FOREIGN` passes unconditionally. But **creg-0007's
own `scopeText` says "foreign halal scheme (recognition pending)"** — the row
records, in prose, a condition the projection has no field for and no rule
about. So `verifyHalalAtReceipt('sup-007', 'RM-SAMPLE-BOT-01', …)` returns
SATISFIED naming a certificate whose domestic recognition its own record calls
pending.

**NOT FIXED, and the reason is the point.** Under GR 42/2024 a foreign halal
certificate satisfies the Indonesian mandate only via a *mutual-recognition
agreement between BPJPH and the foreign body* — **which body, and whether an
MRA is in force, is a fact about the real world that this tree does not have**
and that the fixture is forbidden from inventing (every issuer is "Foreign
scheme body (illustrative)", precisely so no real body is ever named). Adding a
`recognitionStatus` field would mean seeding rows with recognitions nobody
granted — `SEED-IS-AN-ANSWER-01` exactly. ⚠️ **The condition is currently
recorded in `scopeText`, i.e. in PROSE, which is the shape `C9 §3` and
`INFERHALAL-READS-PROSE-01` both exist to keep out of decision paths.** The
honest state today is: the rule is absent, the test asserts the absent-rule
answer so it is visible in the suite, and the field arrives with the R0.1
harvest or with a compliance ruling — not with a fixture edit.

#### ⚠️ `HALAL-VERIFY-NOT-IN-FORCE-AT-RECEIPT-01` — `issueDate` is consulted by nothing

`computeStatus` looks only at `expiryDate`. **No function in
`complianceProjection.ts` reads `issueDate` at all.** For a *display* status
that is fine — a certificate you are looking at today was necessarily issued by
today. For a **receipt-instant** verification it is not: a certificate issued
2026-06-01 will report SATISFIED for a lot received 2026-01-15, because nothing
in the chain asks whether the document existed yet.

The fixture cannot currently exhibit it (every halal row's `issueDate` precedes
every plausible receipt), so **this is a latent defect that only bites once real
receipts and real certificates meet — which is exactly H4.** The fix is one
clause (`issueDate === null || issueDate <= day(receiptInstant)`) and it belongs
in `complianceProjection.ts` beside the others, **not in a second projection
here**, and it needs a ruling on the `issueDate: null` case (creg-0013,
creg-0006 and creg-0004/0009 all carry it) before it can be written: *is an
undated certificate in force, or unknown?* The register does not answer that,
and guessing it in a helper would be the fail-open direction.

#### One thing that is NOT a shortfall

`schemeValid` collapses "date-lapsed" and "scheme-retired" into one boolean, so
this module re-consults `computeStatus` to name WHICH. **That is composition,
not duplication** — and it is load-bearing: `EXPIRED` sends an operator to chase
a renewal, `SCHEME_INVALID` sends them to chase a BPJPH migration on a document
that has not expired. One reason for both would send half of them to the wrong
place.

---

### 2. ⚠️ THE REGISTRY HOLDS NO DISPLAY STATUS, SO IT CANNOT HOLD A STALE ONE

**THE CENSUS INVERTS THE QUESTION, AND THAT IS THE FINDING.** A contradiction
census was asked for; what came back is proof that **the design forbids the
contradiction**. This is recorded as a design property — **NOT as a correction
to a defect that was never there.**

Censused at `2026-08-07` against `computeStatus`. The dispatch expected three
certs "marked `Valid` with expiries in 2024 and 2025", and the three are there —

| id | supplier | certType | stored | expiry | days | projects |
|---|---|---|---|---|---|---|
| creg-0011 | sup-002 | ISO | `Valid` | 2024-11-30 | −615 | **Expired** |
| creg-0005 | sup-005 | ISO | `Valid` | 2025-04-30 | −464 | **Expired** |
| creg-0016 | sup-005 | HALAL_FOREIGN | `Valid` | 2025-08-01 | −371 | **Expired** |

— ⚠️ **and none of the three is a contradiction. Calling them one reads the
registry backwards, and the distinction is the whole of law 0.5.**
`lifecycleState` is a TRANSITION state (`Missing` / `Under Review` / `Valid`);
**`Expired` is not one of its values and never can be.** A row storing `Valid`
with a lapsed expiry is **THE MECHANISM WORKING**: the substrate says *this
supplier was granted a certificate*, and the clock decay is derived at read.
**THE REGISTRY CANNOT HOLD A STALE DISPLAY STATUS BECAUSE IT HOLDS NO DISPLAY
STATUS.** There are **ZERO** contradicting rows in it, and that is a design
property, not luck — the property law 0.5 was written to produce.

The three are seeded on purpose — the fixture header promises "≥2 exemplars of
every computed display status", and these are the `Expired` two-plus.

#### THE CONTRADICTIONS ARE IN THE FIXTURES THAT DO STORE A DISPLAY STATUS

Same census, run over the two pre-DTO-v2 fixtures — the layer that predates the
rule. **This is the corpse count, and it is larger than the dispatch's three.**

⚠️ **`supplierDocuments.ts` — ON THE LIVE READ PATH** (`MockProcurementService.ts:14`
→ the My Documents surface). One contradiction, rendered to users today:

| id | stored | expiry | days | true |
|---|---|---|---|---|
| doc-001 | `Expiring Soon` | 2026-05-15 | **−84** | Expired |

⚠️ **`buyerCompliance.ts` — OFF the read path** (I3.2 closed
`COMPLIANCE-CARVEOUT-01`; `COMPLIANCE_ITEMS` is now imported by exactly one
file, `halalXpersona.invariant.test.ts`). **Different exposure, same defect** —
its damage is contained where doc-001's is rendered. But it is the sharper
specimen, and **it is not filed here: it is its own class, `STALE-BY-HALVES-01`,
in the register above.** What follows is the evidence that row is drawn from.
**All ten of its dated rows are wrong, and they are wrong by two different
amounts:**

| id | stored | storedDays | implied authoring date | true days | true status |
|---|---|---|---|---|---|
| c-001 | Expired | −346 | 2026-04-11 | −464 | Expired |
| c-002 | Expiring | 70 | 2026-04-10 | **−49** | **Expired** |
| c-003 | Expiring | 85 | 2026-04-10 | **−34** | **Expired** |
| c-004 | Valid | 697 | **2025-04-11** | 214 | Valid |
| c-005 | Valid | 153 | 2026-04-10 | 34 | **Expiring** |
| c-006 | Valid | 873 | **2025-04-11** | 390 | Valid |
| c-007 | Valid | 671 | **2025-04-13** | 190 | Valid |
| c-008 | Valid | 873 | **2025-04-11** | 390 | Valid |
| c-009 | Valid | 636 | **2025-04-13** | 155 | Valid |
| c-010 | Valid | 143 | 2026-04-10 | 24 | **Expiring** |

**⚠️ THE FINDING NOBODY WAS LOOKING FOR: THE FIXTURE HAS TWO AUTHORING DATES.**
Back-solving `expiryDate − daysRemaining` per row recovers the day each row was
typed, and it gives **2025-04-11/13 for five rows and 2026-04-10/11 for five
others.** Somebody refreshed half this file a year later and left the other
half. The general form, and it is the class:

> **A STORED CLOCK VALUE GOES STALE UNEVENLY, AND A PARTIAL REFRESH IS
> INDISTINGUISHABLE FROM A CORRECT FILE BY INSPECTION.**

⚠️ **And the clause that carries the argument: UNIFORM STALENESS ANNOUNCES
ITSELF.** Without it this reads as though doc-001 and `buyerCompliance.ts` are
equally bad, and they are not. **One is stale and says so by being wrong
everywhere; the other is HALF RIGHT, which is what makes it invisible.** Every
row looks plausible on its own, no two halves agree on what day it is, and the
correctness of the refreshed half is precisely what conceals the staleness of
the other — there is no row you can spot-check that reveals it. This is the
strongest argument on main for law 0.5 that is not a paragraph, and it was
invisible until somebody divided.

Also corrected while here: the dispatch's figures were **482 days stale and 83
days**; measured at `2026-08-07` they are **483 and 84**. `c-006`/`c-008`'s
`daysRemaining: 873` was last true on **2025-04-11**.

**NOT FIXED — by dispatch, and it would be wrong to fix here anyway.** Both
fixtures are pre-DTO-v2 shapes whose retirement is a read-path batch, not a
number edit. Re-typing `daysRemaining` today buys a file that is correct for one
day and then resumes decaying, which is the defect, performed once more. Filed
as **`STALE-BY-HALVES-01`**, with the detection method (the back-solve) recorded
there as the reusable part.

#### AND A DECAY THAT HAS NOT HAPPENED YET — `FIXTURE-EXEMPLAR-HOLE-01`

⚠️ **LINEAGE, STATED FIRST BECAUSE IT IS THE EXPENSIVE PART TO GET WRONG: the
parent is `FIXTURE-PRESENT-01`, NOT CP-3a's clock-decay shape.**
`FIXTURE-PRESENT-01`'s consequence (2) — *"demo rows cross thresholds
unremarked"* — **already names these four rows by id**; this is that consequence
carried further and given dates. **WRONG LINEAGE IS WORSE THAN A MISSING ROW: a
reader chasing that family looks for exactly this case and does not find it, SO
THE CLASS LOOKS SMALLER THAN IT IS — which is how a class stops being a class.**
CP-3a's shape does apply (a green thing goes wrong on a calendar boundary with
no commit involved) and is cross-referenced, but it is the cousin. The parent is
the one that owns the fixture's unowned present.

The registry cannot store a stale status, but its **coverage** still decays. All
four `Expiring` exemplars are inside their 90-day windows *now*:

| id | Expiring from | until |
|---|---|---|
| creg-0008 | 2026-05-22 | **2026-08-20** |
| creg-0015 | 2026-06-02 | **2026-08-31** |
| creg-0003 | 2026-06-17 | **2026-09-15** |
| creg-0012 | 2026-07-02 | **2026-09-30** |

The next row to enter an Expiring window is **creg-0002, on 2027-03-03.** So:
the header's "≥2 exemplars of every computed display status" **stops being true
on 2026-09-16**, and from **2026-09-30 to 2027-03-03 the fixture has ZERO
`Expiring` rows — a five-month hole**, during which every KPI and filter that
reads plural reads empty. ⚠️ **The registry is law-0.5-clean and the promise
dies anyway, because the ILLUSTRATION has a clock even where the DATA does
not** — nothing is stored wrong and the fixture still degrades. **And nothing
catches it:** no spec asserts the header's promise, so the daily scheduled
`npm run gates` — the half built precisely to catch a clock-decay break with no
commit involved — stays green straight through it. **Filed with its dates so it
is actionable rather than ominous**, and NOT fixed: (a) a census test pinning
the promise goes red on **2026-09-16**, which is the point; (b) a re-seed alone
is `FIXTURE-PRESENT-01` option (c), a manual re-anchor that buys the same hole
further out with nobody owning the cadence. Choosing belongs to
`FIXTURE-PRESENT-01`, not to a batch.

Related, same axis: **`supplierDocuments.ts` doc-005 crosses into Expiring on
2026-08-11** — four days out — with `status: 'Valid'` stored. It is not
contradicting today. It will be on Tuesday.

---

### 3. WHAT H4 WOULD NEED BEYOND THIS FUNCTION — COSTED BEFORE IT IS RULED ON

⚠️ **The blocker is not code.** `verifyHalalAtReceipt` is complete and tested.
What H4 needs is data and four rulings.

#### THE HARD PRECONDITION — R0.1, AND THERE IS NO WAY ROUND IT

`COMPLIANCE_REGISTRY` names **17 material codes, every one `RM-SAMPLE-…`**;
`MATERIAL_MASTER` names **42, none of them**. **THE INTERSECTION IS EMPTY — now
asserted in the suite, not claimed in a header.** The consequence, also
asserted: **`verifyHalalAtReceipt` returns `NO_CERT` for every one of the 42
real materials, against all three tenants, at every instant.** A wire today
would refuse 100% of real receipts.

The three "mitigations" and why each is disqualified: seeding `RM-SAMPLE-…`
aliases onto real codes, or adding real-looking rows, **breaks the fixture's
honesty header** — the placeholders exist so nothing in the tree reads as real
certificate tracking pre-harvest; matching supplier-to-certificate **by name**
breaks **C9 §3** (`materialCode` is contractually opaque) and re-opens
`HALAL-XPERSONA-01`, the name-vs-id split the `supplierId` FK was added to
close. **There is no honest technical mitigation. The bridge is real
certificate data at R0.1, which is NOT STARTED, and that is the operator's
schedule, not a gate's.**

#### FOUR RULINGS, none of which this function can make

1. ⚠️ **WHAT A `NOT_SATISFIED` DOES.** Hard block, or a named-and-audited
   proceed? `D-COMP-HALAL-4` option (b) — *an email unlock* — **is not taken**,
   and the H2 entry already recorded why: overrides on regulatory gates
   normalise, the first is deliberate and the fiftieth is a reflex. A block on
   `NO_CERT` today blocks everything; a proceed-with-warning is a gate that does
   not gate.
2. **WHERE THE INSTANT COMES FROM.** `receiptInstant` must be *the moment the
   lot arrived*, and the GR wizard has no such field on its draft today — only a
   posting date. Reading `new Date()` at render would reintroduce the exact
   defect this signature exists to prevent, one layer up.
3. **THE `issueDate` NULL RULING** (`HALAL-VERIFY-NOT-IN-FORCE-AT-RECEIPT-01`
   above): is an undated certificate in force, or unknown?
4. **HOW THE THREE FACTS COMPOSE.** Fact 1 refuses on `UNDETERMINED` (11 rows),
   fact 3 refuses on `NO_CERT` (42 rows today). ⚠️ **A line can be refused by
   both, and the two refusals must not merge** — the H2 discipline on the
   BPOM/halal banners applies unchanged: one message saying "compliance cannot
   be determined" deletes *which question is unanswered and who answers it*.

#### AND THE CHEAPER ANSWER FIRST — THE H2 POINT-4 SHAPE, AGAIN

`D-COMP-HALAL-1` is still unanswered, and **11 of the 42 master rows are
`UNDETERMINED`.** Those 11 never reach fact 3 at all: fact 1 refuses them first.
⚠️ **Building an override path, an audit event, an owner and a cadence to route
around a certificate corpus that R0.1 will simply deliver is the same mechanism-
standing-in-for-a-decision the H2 entry flagged for re-reading in six months.**
Get R0.1 and `D-COMP-HALAL-1`; then wire; then rule on the override if one is
still wanted.

**Non-blocking, cheap, and worth doing before H4 either way:** the registry has
**no halal-class `Under Review` row at all** — both `Under Review` rows
(creg-0004, creg-0009) are BPOM notifications, so the `UNDER_REVIEW` verdict is
unreachable through the fixture and its test has to build the row. Filed as
`HALAL-VERIFY-NO-UNDERREVIEW-EXEMPLAR-01`; the gap is asserted, so a future
seed turns it red rather than leaving a stale comment behind.

---

### Constraints discharged

- **NO WIRING.** `verifyHalalAtReceipt` appears in code in exactly ONE file —
  itself — asserted by census over `/src/**`, comments exempt. The GR wizard is
  untouched and is separately asserted not to reference `COMPLIANCE_REGISTRY`,
  `getComplianceRegistry` or `halalVerification`. ⚠️ **The limit of that census
  is stated in the test**, on the `halalApplicability.test.ts` precedent:
  `import.meta.glob` excludes the module it is written in, so the scan cannot
  see its own file, which is why the expected list has one entry and not two.
- **NO BRIDGE BETWEEN THE TWO CODE SPACES.** No alias seeded, no registry row
  added, no name or prose match. The empty intersection is *asserted* instead.
- **NO CLOCK READ.** Asserted over the module's code lines: no `Date.now`, no
  `new Date`. Comments are exempt on the H2 precedent — this module's header
  discusses the stale stored values above, and a check that cannot tell code
  from record would force deleting the evidence with the defect.
- **NO SECOND PROJECTION.** `daysRemaining` / `computeStatus` / `schemeValid`
  are imported, not restated; `BPJPH_MANDATE_DATE` is not re-declared here — a
  statutory date with two homes has one wrong one.
- **No prefix or substring rule decides anything** (C9 §3, ratified) — asserted
  twice: over the source (`startsWith` / `endsWith` absent) and behaviourally
  (`RM-SAMPLE-BOT` and `RM-SAMPLE-BOT-03` both `NO_CERT` against a row covering
  `RM-SAMPLE-BOT-01`/`-02`).
- **C9's bytes untouched**; pin `af7f0b4` unaffected.
- **FLOOR 2251/185 → 2283/186.** `npm run gates` green: bundle emitted · 2283
  tests across 186 files · 7 gate tests. `scripts/floor.json` bumped as the note
  asked.
- **Mutation-probed, four ways, each confirmed to have actually changed the
  file** (the CRLF-trap discipline): dropping the halal-class filter fails 1
  spec; membership → `startsWith` fails 2; `schemeValid` → clock-only fails
  **9**; reversing `REASON_PRECEDENCE` fails 3. Module restored byte-identical
  (sha256 `a8981eb69220f1a39e8305f6951416bec29f807c0118626fd81c77fedcaf30fa`,
  of the working-tree bytes on Windows) and re-run green before commit.

---

## CP-3 · E1 — THE ENFORCEMENT VOCABULARY, BUILT HEADLESS

The operator's ruling this answers: during implementation we must be able to
relax rules and, step by step, turn them all on. **The governing distinction is
not "how much enforcement" but WHICH THING IS BEING RELAXED:**

> **RELAXING ENFORCEMENT IS LEGITIMATE; RELAXING HONESTY IS NOT.** A gate that
> lets a receipt through WHILE TELLING YOU IT DID is an operational choice. A
> gate that lets it through SILENTLY is a lie.

`src/lib/enforcement.ts` is the words for that and nothing else — **no store, no
fixture, no dispatcher transition, no consumer, and not one seeded setting.**
Those are E2 and E3. The GR wizard is untouched; H4 stays gated.

```
ENFORCEMENT_MODES = ['OBSERVE', 'BLOCK_OVERRIDABLE', 'BLOCK']   // ORDER IS RIGOUR
effectiveMode(setting, dispatchInstant) → { mode, source: 'AS_SET' | 'EXPIRY_TIGHTENED' }
GovernedCheckId = 'halal.seal' | 'halal.certificate' | 'bpom.lot'
GovernedVerdict = 'PASS' | 'ADVERSE' | 'UNANSWERED'             // NO REFUSAL IN IT
```

Seat 3's correction is built as ruled: **the precedent is the FX pin, not
`currencyPolicy`.** `currencyPolicy` holds deploy-edited constants and says so in
its own voice, and "moved by a recorded act" and "deploy-edited constant" cannot
share one artifact. So the VOCABULARY is code (this file) and the SETTING is
data behind the seam (`FxPin`-shaped, E2). `EnforcementSetting` is DECLARED here
and INSTANTIATED nowhere — asserted, not promised: no line of the module assigns
a value to `checkId` / `setBy` / `setAt` / `reviewBy`.

---

### 1. THE ANSWER TO THE REPORT QUESTION — YES, AND HERE IS THE TEST

**Is the ratchet's determinism provable with the instant as an argument?
YES, and the proof is a test that could not otherwise be written:**

```ts
it('⚠️ and the AMBIENT CLOCK MOVED 79 YEARS between calls changes nothing', () => {
  vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
  const early = effectiveMode(s, DAY_AFTER);      // BLOCK_OVERRIDABLE / EXPIRY_TIGHTENED
  const earlyInForce = effectiveMode(s, BEFORE);  // OBSERVE / AS_SET
  vi.setSystemTime(new Date('2099-01-01T00:00:00.000Z'));
  expect(effectiveMode(s, DAY_AFTER)).toEqual(early);
  expect(effectiveMode(s, BEFORE)).toEqual(earlyInForce);
  expect(early).not.toEqual(earlyInForce);        // …and the pair is not one constant
});
```

The last line matters: without it the test would pass on a function that
returned the same answer to everything. **Mutation-probed:** replacing
`dispatchInstant.slice(0, 10)` with `new Date().toISOString().slice(0, 10)` kills
this spec on its own, as well as six ratchet specs and the no-clock census — the
determinism spec is not leaning on the census to do its work.

The ratchet itself, ruled at D-ENF-3 and built exactly so:

| set mode | `reviewBy` state | effective | source |
|---|---|---|---|
| `OBSERVE` | in force | `OBSERVE` | `AS_SET` |
| `OBSERVE` | ON the review day, 23:59:59.999 | `OBSERVE` | `AS_SET` |
| `OBSERVE` | the day after | `BLOCK_OVERRIDABLE` | `EXPIRY_TIGHTENED` |
| `OBSERVE` | **ten years after** | `BLOCK_OVERRIDABLE` | `EXPIRY_TIGHTENED` |
| `BLOCK_OVERRIDABLE` | lapsed | `BLOCK` | `EXPIRY_TIGHTENED` |
| `BLOCK` | lapsed, or `null` | `BLOCK` | **`AS_SET`** |

Three rulings were needed to build it and each is written into the module rather
than left to a reader:

1. **THE DAY BOUNDARY.** "Past `reviewBy`" has two defensible readings. Ruled
   strictly-greater: a review due BY the 30th is in force THROUGH the 30th and
   lapses on the 31st. Both boundaries are pinned; flipping `>` to `>=` kills a
   spec.
2. **TEN YEARS IS STILL ONE STEP.** It is a ratchet, not a decay ladder. A
   calendar lapse must not close a dock — but the relaxation no longer outlives
   the last deliberate decision about it, because at `BLOCK_OVERRIDABLE` nothing
   passes silently any more; it passes by a named person, on the record.
3. **`AS_SET` AT THE CEILING.** `source` names whether the returned mode DIFFERS
   from the recorded one. A lapsed review on a `BLOCK` changed nothing, and
   reporting `EXPIRY_TIGHTENED` would **ANNOUNCE AN EVENT THAT DID NOT OCCUR** —
   a true-sounding statement about a tightening that never happened.
   ⚠️ **THE REASONING, RECORDED RATHER THAN THE BEHAVIOUR** (operator, at merge):
   this is **honest-by-construction applied to a STATUS FIELD rather than to a
   VALUE.** The lane's usual discipline guards the number a surface shows; here
   the guarded thing is the field that EXPLAINS the number. A `mode` of `BLOCK`
   is correct either way — the lie would have been in `source`, which is exactly
   the field an operator reads to decide whether somebody needs to go and renew
   something. A provenance field that overstates is worse than an absent one,
   because it is actionable.

---

### 2. THE BOUNDARY, AND WHY IT IS STRUCTURE RATHER THAN POLICY

> **ENFORCEMENT MODE RELAXES THE CONSEQUENCE OF AN ANSWER; NOTHING MAY RELAX THE
> ABSENCE OF A QUESTION.**

Three non-passing shapes exist. The mode governs exactly two:

| shape | example | governed? |
|---|---|---|
| answered-and-adverse | the certificate is `EXPIRED` | **yes** — `ADVERSE` |
| asked-and-unanswered | nobody ticked the seal | **yes** — `UNANSWERED` |
| **refusal** | `UNKNOWN_MATERIAL`, `UNDETERMINED_APPLICABILITY` | **NO — outside the domain** |

The reasoning is `OBSERVE`'s own promise, *record instead of block*: **a refusal
is the statement that the question could not be posed**, so there is no answer
to record and nothing to observe. A refusal admitted under `OBSERVE` would be NO
CHECK, ANNOTATED.

**Built as absence, not as a rule.** The refusal shapes are simply not members
of `GovernedVerdict`, so no mode can be applied to one without inventing a value
the union does not contain — and `REFUSALS_OUTSIDE_ENFORCEMENT` is
`Object.keys` of a `satisfies Record<HalalRefusalReason | BpomRefusalReason,
true>` census, so **a third refusal reason authored in `halalOf` or `bpomOf`
breaks the build here** rather than drifting in as a verdict. Pinned four ways:
the two vocabularies are disjoint; `GovernedCheckId` contains no refusal shape;
`isGovernedVerdict` answers `false` for both refusals AT EVERY MODE, identically;
and each refusal name appears in the module's CODE exactly once — inside the
census that derives it — so **no branch anywhere decides what to do with an
absence.**

Same shape, one level up: **THERE IS DELIBERATELY NO FOURTH MODE BELOW
`OBSERVE`.** An `OFF` is the exact fail-open `inferBpom` and `inferHalal` were
retired for — a regulatory answer produced without a regulatory question. Its
absence from the union IS the mechanism, on the `HALAL_CERT_TYPES` fail-closed
precedent, and it is pinned by count, by first member, by a fail-open lexicon
over the member names, and by a census over the module's code lines. Prepending
`'OFF'` to the array kills five specs.

---

### 3. FOUR FINDINGS

#### `ENF-NO-PERSON-IN-IDENTITY-01` — **THE PORTAL HAS NO NOTION OF A PERSON**

⚠️ **OPEN, AND IT IS E3'S PREREQUISITE.** `overriddenBy` must be A NAMED PERSON,
NEVER A ROLE. A type cannot check personhood, and a blocklist of role words
would be a PROSE PARSE — the class this lane just retired twice. What the shape
does is make a role AWKWARD rather than natural: `ActingPerson` requires both a
stable `personId` and the `displayName` captured at the moment of the act, so
there is no single field into which "Buyer" fits. The real check is E3's
session — **and the session has no person in it:**

```ts
export interface CurrentIdentity {          // src/context/CurrentIdentityContext.tsx
  personaType: 'buyer' | 'supplier';
  supplierId: string | null;
  supplierName: string | null;
}
```

A persona, a tenant and a company name. **No user, no name, no id.** E3 cannot
source an `ActingPerson` from anything that exists today, and the honest options
are (a) wait for F1's OIDC, or (b) capture the name at the override with a
disclosed marker saying it is typed rather than authenticated. **Recorded, not
resolved** — the choice is the operator's, and it is worth knowing BEFORE E3
rather than at the moment somebody needs to override a live block.

#### `CENSUS-COUNTS-TYPE-IMPORTS-01` — **A CENSUS THAT COULD NOT TELL A CALL FROM AN ERASED REFERENCE**

**FOUND BY BEING TRIPPED, AND FIXED.** `halalApplicability.test.ts` and
`bpomApplicability.test.ts` each assert "exactly one NON-TEST importer, and it
is the GR wizard" — a genuinely good guard. Both went red on this batch: the new
module's `import type { HalalRefusalReason }` counted as a production importer,
because the scan matched TEXT and text cannot distinguish a CALL from a
reference that erases at build.

Both censuses now split `production` into `callers` and `typeOnly` and **name
both**: the caller list is unchanged (`GRInspectionWizard.tsx`) and the type-only
list is exactly `['/src/lib/enforcement.ts']`. Merging them upward would let a
real wire hide behind the word "type"; merging them downward would widen
"consumer" to mean "mentions". ⚠️ The limit is stated in both files: the check
reads whole LINES, so a multi-line `import type` reads as a value import and
fails LOUDLY rather than passing quietly. Probed: turning the type-only import
into a value import turns the halal census red.

⚠️ **WHY THE OTHER FIX WAS REFUSED** (operator, at merge). The cheap way out was
to drop the compile-time refusal census and hand-list the two refusal reasons in
`enforcement.ts`, which would have left both guards untouched. That **trades a
MECHANISM for a CONVENTION**: the `satisfies Record<HalalRefusalReason |
BpomRefusalReason, true>` is what makes the boundary structural — a third
refusal reason cannot become a governed verdict without breaking the build —
and a hand-list is a copy that goes stale in silence, which is the
`FLOOR-IN-PROSE-01` shape. Amending the two censuses cost more and kept the
mechanism.

#### `ENF-UNKNOWN-MODE-FAILS-OPEN-01` — **CAUGHT IN THIS BATCH, FIXED IN IT**

`rigour` was `ENFORCEMENT_MODES.indexOf(mode)`, and `indexOf` returns **−1** for
a string that is not a member. `blocks` is `rigour(mode) >= rigour('BLOCK_OVERRIDABLE')`,
so **−1 blocks nothing.** The mode cannot be a non-member through the TYPE — but
it arrives from behind a seam at E2 as JSON, and JSON has no unions. **A TYPO IN
A SETTING WOULD HAVE TURNED THE GATE OFF SILENTLY**, which is the precise
fail-open the module exists to make unrepresentable, reintroduced by an
`indexOf` default nobody chose.

⚠️ **AND IT IS THE MODULE'S OWN THESIS FAILING INSIDE THE MODULE** (operator, at
merge). The file exists to make a silent pass unrepresentable, and it shipped a
silent pass — not through a rule anybody wrote, but through the default value of
a standard-library call.

Fixed: an unrecognised mode ranks at the CEILING, so it blocks and cannot be
overridden — the only direction that is safe to be wrong in — and
`isEnforcementMode` / `isGovernedCheckId` are the narrowing boundaries E2 must
use instead of guessing (the `isBidCurrency` precedent).

**THE RULE THIS ESTABLISHES, STATED AS A CLASS** (operator ruling, at merge —
it is not about enforcement modes):

> **AN UNRECOGNISED MEMBER OF A GOVERNING ENUM RANKS AT THE CEILING. UNKNOWN
> MEANS MAXIMUM RIGOUR, NEVER MINIMUM.**

It applies to **every enum that arrives across a seam** — a mode, a check id, a
lifecycle state, a scheme, a role, a status. The failure shape is always the
same and is never a rule somebody chose: a lookup returns a MISS
(`indexOf` → `-1`, `Record[key]` → `undefined`, `Map.get` → `undefined`,
`switch` → the `default` arm), and the miss then flows into a comparison or a
coalesce whose natural neutral element is the PERMISSIVE end. Nobody writes
"unknown means allow"; it is what `-1`, `undefined` and `?? false` mean by
default, and JSON across a seam is where unknown members come from.

The test for a new one is a single question: **what does this function do with a
string that is not in the union?** If the answer is "the same as the weakest
member", it is this defect. Two in-tree instances already read the right way and
were not derived from this ruling — `provisionalHalalForGroup` (an undeclared
group is `'UNDETERMINED'`, which refuses) and `provisionalHalalForAxis` (a new
axis defaults `'UNDETERMINED'`) — so the class is a generalisation of a habit
this lane already had, now written down so it stops depending on the habit.

#### `ENF-OVERRIDE-VOCAB-PROVISIONAL-01` — **FOUR REASONS, STRATEGIST-RULED**

The override reason vocabulary is CLOSED and has **no catch-all** — one `OTHER`
collapses a closed vocabulary into free text wearing an enum's clothes, and a
reason nobody can count is a reason nobody can review. The four are chosen to be
four DIFFERENT OPERATOR BEHAVIOURS: `EVIDENCE_HELD_OUTSIDE_PORTAL` (the R0.1
corpus hole — chase the document, not the lot) · `CERTIFIER_CONFIRMED_DIRECTLY` ·
`ACCEPTED_TO_QUARANTINE` (received, NOT released — an override of the block, not
of the question) · `COMMERCIAL_RISK_ACCEPTED` (the uncomfortable one, in the list
precisely so it must be NAMED rather than disguised as one of the other three).

⚠️ **PROVISIONAL pending operator ratification**, on the `sdc/halal.ts`
precedent: recorded as a decision TAKEN, so ratification is an act of agreeing
with something written down rather than discovering what the code assumed.

---

### 4. WHAT THE TYPE SHAPE FORECLOSES FOR E2 / E3 — **NOTHING, BUT FOUR THINGS TO DECIDE**

Asked in the dispatch, answered honestly. Nothing below is blocked; each is a
decision E2 or E3 must take deliberately rather than inherit.

1. ⚠️ **`EnforcementSetting` IS ONE RECORD, NOT A LEDGER — and the FX-pin
   precedent says it must become one.** `FxPin`'s discipline is an APPEND-ONLY
   ledger with `effectivePin` DERIVED, so "which basis is current" cannot drift
   from the record that justifies it. E1 declares the record and
   `effectiveMode` takes ONE. **E2 must supply `readonly EnforcementSetting[]`
   and derive the effective one** (ordered by `setAt`, later array position
   breaking a tie — `effectivePin` exactly), and must NOT add an edit path. The
   type is ready for that: it has no `supersedes` / `supersededBy` field and
   should not acquire one, because superseding on an append-only ledger means
   appending.
2. ⚠️ **THE SETTING'S KEY IS `checkId` ALONE.** There is no tenant, supplier,
   plant or material dimension, so today a relaxation is portal-wide for that
   check. *"Relax `halal.certificate` for sup-007 only"* is a plausible
   operational want and it does not fit. Widening the key later is a
   NARROWING-shaped change (more specific settings win), not a migration — but
   **it is an operator ruling, not a build decision**, and it is cheaper to ask
   than to discover.
3. **THE STAMP HAS NO SUBJECT.** `GovernedCheckStamp` names the check, the
   verdict, the mode and where the mode came from — but not WHAT it was about
   (which GR line, which lot, which material). That is deliberate: a stamp is a
   VALUE the receiving line carries, so the subject is the thing holding it. If
   E3 wants stamps as standalone audit events in the DR-10 taxonomy, they need a
   subject key added at that point.
4. **NO `overriddenAt`.** This module has no clock and would have to take the
   instant from a caller that does not exist yet. Adding the field at E2
   alongside the store that can supply it is a widening, not a migration — noted
   so the absence reads as a boundary rather than an oversight.

One further honesty note about the mechanism itself: **the absent fourth mode is
enforced by a TEST, not by the compiler.** Appending a member to
`ENFORCEMENT_MODES` compiles cleanly — everything derives from the order, which
is the property that makes the ramp single-sourced. A fourth mode ABOVE `BLOCK`
would be a widening of rigour and safe; one BELOW `OBSERVE` is the fail-open, and
only `enforcement.test.ts` stands between it and the tree. That is the same
standing the no-wiring censuses have, and it is stated rather than assumed.

---

### Constraints discharged

- **NO STORE, NO CONSUMER, NO DISPATCHER, NO SETTING.** The enforcement surface
  appears in code in exactly ONE file — itself — by census over `/src/**`
  (comments exempt; `import.meta.glob` cannot see the test's own file, and the
  test says so). The module names no `useDataService`, `mockDataService`,
  `COMPLIANCE_REGISTRY`, `MockCommandService`, `CommandTarget`, `AuditSink` or
  `QueryScope`, and its import list is asserted to be exactly two TYPE-ONLY
  lines. The GR wizard is separately asserted untouched.
- **NO CLOCK READ.** No `Date.now`, no `new Date` in the module's code lines.
  `Date.parse` of a SUPPLIED string is not a clock read (`complianceProjection`
  precedent).
- **FAIL CLOSED EVERYWHERE THE INPUT IS DOUBTFUL** — an unreadable `reviewBy` or
  `dispatchInstant` is LAPSED; a relaxation that arrives with NO review date is
  LAPSED (the type rule made to bite at runtime, because a type guarantee is
  only as strong as the authoring on the other side of a seam); an unrecognised
  mode ranks at the CEILING.
- **C9's bytes untouched**; pin `af7f0b4` unaffected. H4 gated; nothing in the
  GR wizard moves.
- **FLOOR 2283/186 → 2329/187.** `npm run gates` green. `scripts/floor.json`
  bumped as the note asked.
- **Mutation-probed, ten ways, each confirmed to have actually changed the file
  before the run** (the CRLF-trap discipline), module restored byte-identical
  and re-run green: a fourth mode below `OBSERVE` kills 5 · a hard-stop ratchet
  kills 6 · the day boundary flipped kills 1 · a missing review date holding
  kills 1 · a refusal admitted as a verdict kills 7 · every stamp coherent kills
  1 · the ambient clock read kills 8 · an unreadable date holding kills 1 · an
  override at every blocking mode kills 2 · a type-only import turned into a
  value import kills the amended halal census.
