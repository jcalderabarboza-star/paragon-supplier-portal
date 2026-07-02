# Open Findings

Findings surfaced during the build that are not yet actioned, registered here so
they survive the session boundary. Each carries a disposition (where/when it
lands). Code references are `file:line` against `main @ 248ca75`.

| ID | Finding | Disposition |
|---|---|---|
| **ENV-BADGE-01** | Header shows a `PREVIEW` badge even on the production canonical domain (cosmetic). | Fold-in Batch 1.1a. |
| **NAV-01** | Persona toggle does not navigate to the matching dashboard when switched. | Fold-in Batch 1.1a. |
| **NAV-02** | Unknown `/buyer/*` (and other) paths fall through to the buyer dashboard — no 404. Catch-all `*` → `/buyer/dashboard` at `src/router/AppRouter.tsx:81`. | Fold-in Batch 1.1a. |
| **INV-SEED-01** | `BuyerInvoices` view seeds its editable state once from the server list and does not re-seed on refetch (stale after background refresh). | Revisit Phase 2A. |
| **STATE-PRIM-01** | Inline (section-level) state-primitive variants are needed for partial loading/error — today only full-page states exist. | Build when the first page needs one. |
| **DOC-01** | `README.md` is materially stale vs code: GH-Pages live-demo URL, SAP-UI5 stack table (the dependency does not exist in `package.json`), old route paths (`/buyer/purchase-orders`, `/supplier/ship-notices`), old `pages/`+`data/` project structure. Explicitly out of scope for the D-5 docs true-up. | Owner: Phase 5 (full README true-up). |
| **DOC-02** | No true Current State of Truth document exists in the repo — both `docs/` plan files are build plans (one was misnamed `Supplier_Portal_Current_State_of_Truth_v1.md`; it holds Build Plan v1.1, now renamed + superseded-banner'd). Fresh CST authoring (Mode 2, investigation-grounded) is due at a natural post-Phase-1′ boundary. | Post-Phase-1′. |
