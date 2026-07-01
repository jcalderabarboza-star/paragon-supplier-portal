**The invariant (intact):** `supplierId` is non-null IFF `personaType === 'supplier'`, enforced by construction in `identitySources.ts:13-20`. No code path produces buyer-with-supplierId or supplier-with-null-id. `scoping.ts:17` treats the impossible branch as defence-in-depth.

**`sup-007` classification (full grep):** the seed constant lives at `identitySources.ts:10`. All other hits are legitimate — fixture/mock row data (tagged `supplierId`) or two entry-point *seeders* (`Login.tsx:9` on sign-in, `SidebarV2.tsx:25` on persona-toggle). These create identity; they don't hardcode page data. **No consuming page hardcodes `sup-007` to fetch its own data.** 1A integrity holds.

**Identity consumption:** 10 supplier pages read via `useCurrentIdentity`; supplier pages guard on missing id with `<NoSupplierIdentity/>`. Buyer pages need no supplierId (buyer scope is whole-portfolio).

---

## 4. Spine piece 2 — Data layer (FOUNDATION BUILT, 0% CONSUMED)

### 4.1 What exists (the engine)

- **`IDataService`** (`services/data/types.ts:620`) = 4 sub-services: `suppliers`, `procurement`, `risk`, `discovery`.
- **`IProcurementService`** — 19 methods (POs, inventory, RFQs, quotations, shipments, ASNs, goods receipts, buyer/supplier invoices, contracts, obligations, documents, storefront catalog/certs/products, KPIs, performance trend). All take `QueryScope = {personaType, supplierId}`.
- **`ISupplierService` / `IRiskService` / `IDiscoveryService`** — list/get + buyer-only surfaces returning `[]` for suppliers.
- **Mock implementation:** `mock/mockDataService.ts` wires all four. `MockProcurementService` pipes every per-supplier method through `applySupplierScope`.
- **`applySupplierScope`** (`services/data/scoping.ts:12`): buyer → all rows; supplier-with-null-id → `[]`; supplier → own-`supplierId` rows only. Non-`supplierId` entities scoped indirectly (obligations via parent contract; RFQs via `invitedSupplierIds`).
- **Canonical DTOs:** drift-resolved single-field `PurchaseOrder`/`POLineItem` (`types.ts:111-148`) + ~40 entity types.
- **Fixtures:** 12 files in `services/data/mock/fixtures/`. Every supplier-scoped row carries `supplierId: 'sup-007'`; buyer-aggregate fixtures carry none (correct — whole-portfolio views).

### 4.2 What's missing (the connection)

**Bucket A (reads via `useDataService()`) = 0 pages.** `DataServiceContext.tsx:9` states plainly: *"no page consumes it yet — that begins in Batch 1B.2."* The provider is mounted (`main.tsx:12`); nothing calls the hook.

### 4.3 The pickup-point map (1B work-remaining ground truth)

Every page bypasses the hook in one of three shapes:

- **B** = imports a relocated fixture directly (fixture done, hook not wired) — *one step from the hook.*
- **C-legacy** = imports raw legacy mocks from `src/data/*` and re-implements scoping in-page — *two steps (relocate + wire).*
- **C-inline** = data hardcoded as arrays in the page body — *untouched.*

**Supplier pages (12):**

| Page | Bucket | Data source (file:line) |
|---|---|---|
| SupplierDocuments | B | fixtures/supplierDocuments :36 |
| SupplierInvoices | B + C-legacy | fixtures/supplierInvoices :38 + mockSuppliers :32 |
| SupplierMyStorefront | B + C-legacy | fixtures/supplierStorefront :39 + mockSuppliers, communicationProfiles |
| SupplierPerformance | B + C-legacy | fixtures/supplierPerformance :42 + mockSuppliers, mockPurchaseOrders |
| SupplierShipments | B + C-legacy | fixtures/supplierShipments :39 + mockPurchaseOrders, mockSuppliers |
| SupplierStorefront | B + C-legacy | fixtures/supplierStorefront :28 + mockSuppliers :26 |
| SupplierDashboard | C-legacy | mockSuppliers :26, mockPurchaseOrders :27 |
| SupplierInventory | C-legacy | mockInventory :26, mockSuppliers :27 |
| SupplierOrders | C-legacy | mockPurchaseOrders :24, mockSuppliers :25 |
| SupplierRFQs | C-legacy | mockSuppliers :30 (+ inline RFQ data) |
| SupplierRegistration | C-inline | self-contained wizard, no data import |
| SupplierWhatsApp | C-inline | inline scenario arrays (:157, :666, :1067) |

**Buyer pages (18, incl. Marketplace):**

| Page | Bucket | Data source (file:line) |
|---|---|---|
| BuyerAnalytics | B | fixtures/buyerAnalytics :51 |
| BuyerCompliance | B | fixtures/buyerCompliance :30 |
| BuyerDashboard | B | fixtures/buyerDashboard :27 |
| BuyerDiscovery | B | fixtures/buyerDiscovery :45 |
| BuyerInvoices | B | fixtures/buyerInvoices :46 |
| BuyerRisk | B | fixtures/buyerRisk :58 |
| BuyerWhatsAppHub | B | fixtures/buyerWhatsApp :47 |
| BuyerContracts | C-legacy | mockContracts, mockObligations, mockSuppliers |
| BuyerGoodsReceipt | C-legacy | mockGoodsReceipts, mockSuppliers |
| BuyerInventory | C-legacy | mockInventory, mockSuppliers, mockPurchaseOrders |
| BuyerOrders | C-legacy | mockPurchaseOrders, mockSuppliers |
| BuyerShipments | C-legacy | mockShipments, mockSuppliers |
| BuyerSourcing | C-legacy | mockRfqs, mockQuotations, mockSuppliers |
| BuyerSupplierProfile | C-legacy | mockSuppliers :33 |
| BuyerSuppliers | C-legacy | mockSuppliers :22 |
| Marketplace | C-legacy | mockSuppliers :14 |
| BuyerRequisitions | C-inline | MOCK_PRS inline :60 |
| BuyerScorecard | C-inline | SUPPLIER_DATA/EXTRA_SUPPLIERS inline :112,:245 |

**Migration tally:** A = 0 · B = 13 · C-legacy = 13 · C-inline = 4. All 30 pages bypass the hook.

---

## 5. Spine piece 3 — Action layer (DOES NOT EXIST)

**98 dead actions** across the 30 pages (exact, cross-checked). A "dead action" = a button / menu item / primary-panel CTA that has no `onClick` or whose `onClick` only fires a toast / no-ops (does not mutate, navigate, or open a working flow). Working controls (real wizards, confirm/submit handlers, chat-append, invoice release, storefront edit, navigation, and all pure UI-state controls) are excluded.

**Split by systemic class:**

| Class | Count | Examples (file:line) |
|---|---|---|
| **H · Dead header/bulk actions** | 34 | Export / Bulk upload / Templates / Sync now / New-X — no-onClick (BuyerOrders :339-342, BuyerSuppliers :105-109) or toast-only (BuyerAnalytics :152, SupplierInventory :170,180) |
| **P · Dead panel-primary verbs** | 32 | Post to SAP (BuyerGoodsReceipt:337), Send reminder (BuyerShipments:334), Award RFQ (BuyerSourcing:1242), Create ASN (SupplierOrders:404) |
| **R · Dead row/card inline actions** | 27 | per-row Remind, Invite/Qualify, Submit/Resolve/Withdraw, doc View/Renew |
| **O · Dead menu items** | 5 | WhatsApp bot-action menu, Marketplace "View all", Storefront Upload/Save |

**Fully-dead pages (every action inert):** BuyerOrders (5/5), BuyerSuppliers (4/4), BuyerSupplierProfile (4/4), SupplierStorefront (5/5).

**Fully-live pages (0 dead):** BuyerDashboard, SupplierRegistration (real wizard), SupplierWhatsApp (real chat simulation).

**Sensitivity band:** strict reading = 98; lenient reading (crediting cosmetic self-dismiss/label-flip as "did something") = 88. **Primary figure: 98.** These 98 are the raw scope of Phase 1C plus the pillars — they are the verbs of procurement, and today they are inert.

---

## 6. Type-contract drift (Batch 5 — NOT cleaned up)

Canonical single-field shapes exist in `services/data/types.ts`, but legacy dual-field types in `types/purchaseOrder.types.ts` are still present and actively read by the 13 C-legacy pages. `dto.ts` bridges legacy to canonical only for POs routed through the mock service (which no page uses yet), so the bridge is dormant.

| Field pair | Status | Note |
|---|---|---|
| totalAmount / totalValue | Dual, both read | legacy read by BuyerOrders; canonical by SupplierOrders; DTO coerces |
| quantity / qty | Dual, both read | qty alias read across 7+ pages; DTO coerces |
| uom / unit (POLineItem) | Dual, both present | DTO coerces `uom ?? unit` |
| status / poStatus | Dual, both present | DTO coerces |
| orderDate / createdDate + deliveryDate | Dual + dropped-field | legacy `createdDate` still read; canonical drops `deliveryDate` |
| contactEmail / contactPhone | **Dead (write-only)** | populated in all 12 supplier records, **zero reads** — safe to delete |

**Removal is blocked** by the 13 C-legacy pages reading legacy fields directly. Batch 5 cleanup can only complete after the hook migration (Section 4.3) moves every reader onto canonical names.

---

## 7. Deploy posture (dual, undocumented)

Two live deploy postures coexist:

1. **GitHub Pages** — committed root artifacts (`index.html`, `favicon.ico`, `assets/` tracked at repo root), base path `/paragon-supplier-portal/`. The committed `index.html` is a non-VERCEL `npm run build` artifact.
2. **Vercel** — `vercel.json` present (framework vite, SPA rewrite). Vercel auto-sets `VERCEL=1` → base `/`, builds its own `dist`, ignores the committed root artifacts.

`dist/` is gitignored (untracked). `vite.config.ts`: `root:'app'`, `outDir:'../dist'`, base conditional on `VERCEL`. **`CLAUDE.md` documents only posture (1)** (the GH-Pages build-copy-push flow) and never mentions Vercel. This is a live contradiction: the committed root `index.html` carries the GH-Pages base path and would be wrong at a Vercel root domain.

**Decision surfaced (for the plan):** the project should pick ONE canonical deploy target and retire or reconcile the other. See Decisions Register D-1.

---

## 8. Doc-drift ledger (older docs vs. code)

| Doc | Stale claim | Code truth |
|---|---|---|
| README | "SAP UI5 Web Components 2.5" | No SAP UI5 dep; Tailwind + lucide + recharts |
| README | Project structure (AppShell, PersonaContext, pages/buyer) | `layout-v2`, `CurrentIdentityContext`, `pages-v2/` |
| README | Routes `/buyer/purchase-orders`, `/supplier/ship-notices`; "~11 pages" | Actual `/buyer/orders`, `/supplier/shipments`; 31 pages |
| README | Personas "James Chen" / "Sri Kusuma" | Not in code; sup-007 contact is Hendra Wijaya @ Berlina |
| README / Vision | "28 routes" / "24 pages" | **31 routable pages** (33 `<Route>` incl. 2 redirects) |
| CLAUDE.md | GitHub-Pages build-copy-push is the deploy flow | Dual GH-Pages + Vercel; see Section 7 |
| Migration Summary | debt item: dist committed | dist gitignored; but root `assets/`+`index.html` ARE committed |

**True route count:** 31 routable pages — `/login`, `/register`, 19 `/buyer/*`, `/marketplace` + `/marketplace/supplier/:id`, 10 `/supplier/*`, plus 2 redirects (`/` and `*` → `/buyer/dashboard`).

**Two behavior bugs confirmed present:**

- **persona-toggle-doesn't-navigate** (`SidebarV2.tsx:127-160`): toggle calls `setIdentity` only, no `navigate()`; URL stays on the prior persona's page.
- **buyer-fall-through-no-404** (`AppRouter.tsx:81`): `path="*"` → `/buyer/dashboard`; any unknown route silently redirects, no 404, no persona guard.

---

## 9. Honest ledger (code-verified)

**Real / intact:**

- Identity spine (1A) — context, source, invariant, seed isolated to entry points.
- Data-layer foundation (1B) — interface, 4 mock services, `applySupplierScope`, canonical DTOs, 12 fixtures with `supplierId`, provider mounted.
- A subset of genuinely-wired workflows — registration wizard, WhatsApp chat sim, quote submit, invoice release/remittance, new-RFQ/PR wizards, order-confirm panel, storefront edit.

**Stubbed:**

- 98 dead actions (H 34 / P 32 / R 27 / O 5). 4 fully-dead pages.
- KPI/performance snapshot meaningful only for sup-007; cross-supplier fan-out deferred.

**Deferred / not started:**

- 1B hook migration — 0 of 30 pages on `useDataService`.
- 1C action layer — does not exist.
- Batch 5 type cleanup — blocked by C-legacy pages; `contactEmail`/`contactPhone` dead and deletable.
- No tests, no linter.
- Docs true-up (README, CLAUDE.md) and deploy-posture decision.

---

## 10. Open decisions register (for the plan to resolve)

| ID | Decision | Options | Lean |
|---|---|---|---|
| **D-1** | Canonical deploy target | (a) Vercel only, retire GH-Pages root artifacts + CLAUDE.md flow; (b) GH-Pages only, drop vercel.json; (c) keep both, document both | (a) — Vercel is the live Preview the harness targets |
| **D-2** | Test runner adoption | (a) add Vitest now (before hook migration, so migration lands with coverage); (b) defer to backend phase | (a) — migration is the ideal moment to start the floor |
| **D-3** | 1B migration ordering | (a) B-pages first (13, one-step, fast momentum); (b) by persona (supplier then buyer); (c) by lifecycle cluster | (a) then C — bank the easy 13, then the harder 13, then 4 inline |
| **D-4** | CLAUDE.md branch policy | Current CLAUDE.md says "direct to main, no PRs"; Working Rules mandate branch+PR+JJ-merge | Reconcile to Working Rules (branch+PR); CLAUDE.md is stale |
| **D-5** | Docs true-up timing | (a) now, as a batch; (b) fold into phase closes | (b) — true-up README/CLAUDE.md at 1B close |

---

*End of Current State of Truth v1.0. This is the factual ground. The end-to-end plan builds on it. Recalibrate at phase boundaries; when code and this doc diverge, re-harvest and version this doc.*
