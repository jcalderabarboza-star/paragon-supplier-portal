# EN/ID i18n Census — Supplier Portal

_SEAT 2 investigation, captured on branch `seat2/i18n-batch0-infra`. Snapshot of
state **before** Batch 0 (infra unlock). No page-body extraction at census time._

## Bottom line
The react-i18next pipeline exists and works, but coverage is a thin vertical
seam (command/toast verbs only). All page **chrome** was hardcoded EN, and there
was **no working language toggle** — the UI could not switch to ID even for the
externalized strings. A large, proven ID procurement term-base is reachable in
sibling repos (see `docs/i18n_glossary_en_id.md`), so ID copy is a lookup, not a
re-derivation. Workload ≈ **~1,800–2,000 hardcoded strings across 31 pages**, 28
of them "heavy."

## 1. Infra
| Item | State (pre-Batch-0) |
|---|---|
| `i18next` / `react-i18next` | Installed (`^26.3.4` / `^17.0.8`) |
| Config | `src/lib/i18n.ts` — `initReactI18next`, `lng:'en'`, `fallbackLng:'en'`, flat-key inline resources (no `locales/` JSON) |
| Provider | Mounted in `src/main.tsx` + `src/test/test-utils.tsx` |
| Language toggle | **None.** `TopBarV2` had a decorative `<Languages>` icon + hardcoded `EN` span, no `onClick`/`changeLanguage` |
| Seeded seam | Command/mutation/toast layer only: `po.confirm.*`, `asn.*`, `gr.*`, `invoice.*` (both EN + real ID). ~85 keys. |
| Components on `t()` | 7 source files: `TopBarV2` (`app.title`), `GRInspectionWizard`, `BuyerGoodsReceipt`, `BuyerInvoices`, `SupplierInvoices`, `SupplierOrders`, `SupplierShipments` — all toasts/verb-forms, no page chrome |

## 2. Locales
No JSON files; ~85 keys inline in `i18n.ts`, 100% real ID, but scoped to the verb/toast seam only.

## 3. Term-base (reachable, reuse as glossary)
Sibling repos under `projects/` (separate repos, not a monorepo): `paragon-b8-i18n`
(~10.3k key-lines), `Paragon-TMS-…` (~12.3k), `tms-s1-i18n-plumbing` (~11.9k),
`paragon-somo` (~940, most procurement-relevant). They use **next-intl** (nested
`messages/*.json`) — reuse as vocabulary, **not** drop-in files. Extracted glossary:
`docs/i18n_glossary_en_id.md`.

## 4. Scope map (31 pages · 28 heavy · 2 many · 1 few · 0 none)
Buckets: none(0) · few(1–9) · many(10–30) · heavy(31+). ✅ = already partial `t()`.

| Page | Bucket | ~strings | t()? |
|---|---|---|---|
| BuyerContracts | heavy | ~90+ (1,778 lines — outlier) | — |
| BuyerSourcing | heavy | ~90 | — |
| BuyerWhatsAppHub | heavy | ~85 | — |
| BuyerShipments | heavy | ~75 | — |
| BuyerSupplierProfile | heavy | ~75 | — |
| BuyerRisk | heavy | ~70 | — |
| BuyerRequisitions | heavy | ~50 | — |
| BuyerGoodsReceipt | heavy | ~50 | ✅ ~9 |
| Marketplace | heavy | ~50 | — |
| BuyerCompliance | heavy | ~48 | — |
| BuyerDiscovery | heavy | ~45 | — |
| BuyerOrders | heavy | ~45 | — |
| BuyerInvoices | heavy | ~45 | ✅ ~25 |
| BuyerAnalytics | heavy | ~41 | — |
| BuyerInventory | heavy | ~40 | — |
| BuyerScorecard | heavy | ~34 | — |
| BuyerSuppliers | many | ~29 | — |
| BuyerDashboard | many | ~24 | — |
| NotFound | few | ~5 | — |
| SupplierRegistration | heavy | ~120 (heaviest — wizard + validators) | — |
| SupplierRFQs | heavy | ~90 | — |
| SupplierWhatsApp | heavy | ~90 (EN chrome; ID/CN sim bodies excluded) | — |
| SupplierMyStorefront | heavy | ~80 | — |
| SupplierShipments | heavy | ~80 | ✅ ~28 |
| SupplierInvoices | heavy | ~60 | ✅ ~13 |
| SupplierDashboard | heavy | ~55 | — |
| SupplierDocuments | heavy | ~55 | — |
| SupplierOrders | heavy | ~55 | ✅ ~8 |
| SupplierPerformance | heavy | ~50 | — |
| SupplierStorefront | heavy | ~45 | — |
| SupplierInventory | heavy | ~40 | — |

The 5 partially-migrated pages remain heavy — migration touched only command-result
toasts, never the static scaffolding (headers, KPI eyebrows, table columns, side
panels, empty states, placeholders).

Watch-outs: split/interpolated fragments need `<Trans>` (Compliance, Dashboard,
Contracts); mock-data-as-literals inflate three files (Marketplace RFQ rows, both
WhatsApp hubs' messenger bodies, cert names) — policy decision required.

## 5. Formatting (`src/lib/format.ts`)
Number/currency were id-ID (`Rp`, dot grouping, `jt`/`rb`). Gaps (fixed in Batch 0):
billion suffix was English `B` (ID = `M` miliar); dates were hardcoded `en-GB` months
(ID = `Agu/Okt/Des`). Now locale-aware off the active `i18n.language`.

## 6. Shared chrome
Sidebar nav (one config array), TopBar, Button — centralized (translate-once).
StatusPill centralizes tone but label text was passed as `children` per-page; the
~75 canonical status terms are now translated once via `src/lib/statusLabel.ts`.
PageHeader / EmptyState / BulkActionsBar / TableHeader are shells — text passed
per-page (the ~1,800-string bulk, handled in later page batches).

## Sprint sizing
~28 heavy pages → ~9–11 page batches (2–4 pages each, heaviest-first), **after**
Batch 0 (this batch): toggle + locale-aware format + glossary + sidebar/status/topbar
translate-once. Two policies to lock before page batches: (a) localize mock/sample
channel data? (b) `<Trans>` handling for interpolated fragments.
