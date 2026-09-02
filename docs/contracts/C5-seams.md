# C5 — Seams

The swap-points where the mock becomes the real system. Each is tiered **LIVE** / **RESERVED** /
**SPEC** (README legend). The design rule throughout: the seam is an **interface**, so landing the
real implementation is **additive** — pages and the contract do not change.

Source of truth: `DataServiceContext.tsx`, `types.ts`, `MockCommandService.ts`, `roles.ts`,
`events.ts`, `docs/findings.md`.

---

## Seam status at a glance

| Seam | Tier | Swap-point |
|---|---|---|
| `IDataService` / `useDataService` | **LIVE** (mock) | `DataServiceContext.tsx` — replace the `service` prop |
| `ICommandService` (dispatch / status / settle) | **LIVE** (in-memory) | `MockCommandService` → real adapter |
| `getCapabilities` / DNA-SEED-01 | **LIVE-PARTIAL** | capability surface LIVE; `guidance?` slot RESERVED |
| SAP boundary (Option B) | **LIVE** (2 verbs) | `settleFinalize` → real SAP settlement webhook |
| `AuditSink` / `TransitionEvent` (DR-10) | **LIVE** in-memory / durable **RESERVED** | `AuditSink` interface (C3) |
| `httpDataService` | **RESERVED** | `DataServiceContext` service prop |
| OIDC / real IdP | **RESERVED** | persona→role map (`roles.ts`) |
| INT-TMS-01 (Portal↔TMS ASN boundary) | **RESERVED** | `advanceShipNotice` system-trigger transitions |
| Backend / datastore | **RESERVED** (greenfield) | in-memory stores |
| Snowflake clean-data layer | **SPEC** (C4) | durable `AuditSink` tee |
| LivenessRegistry | **SPEC** | — (named, no code) |

---

## `IDataService` — the read/write seam · **LIVE (mock)**

```ts
export const useDataService = (): IDataService => { … }   // throws outside a provider
```

One Provider, one hook. Pages read exclusively through `useDataService()` (TanStack Query v5 over
scoped query hooks — per-supplier cache isolation via `scopeKey`). The implementation is the
`service` prop on `DataServiceProvider` (mounted in `main.tsx` above the router). Swapping the mock
for the real adapter is a **one-line prop change**; pages do not change
(`DataServiceContext.tsx:1–10`, 22–38).

**Carve-out — CLOSED (I3.2).** `BuyerCompliance` (+ `BuyerComplianceWidget`) formerly imported the
`COMPLIANCE_ITEMS` fixture directly (`COMPLIANCE-CARVEOUT-01`). I3.1 landed the target read
(`risk.getComplianceRegistry` → `ComplianceRegistryEntry`, fixture-first/SIMULATED); **I3.2
re-pointed both surfaces to `useComplianceRegistry()`** — status/daysRemaining computed-at-read,
scheme-aware BPJPH KPI, SIMULATED rendered via `<LivenessPill capability="compliance">`. Every
portal page is now on `useDataService()`. (The `halalXpersona.invariant.test.ts` retains its own
independent `COMPLIANCE_ITEMS` read as a deliberate name-vs-id guard — not a page carve-out.)

---

## `httpDataService` — the Phase-F1 swap · **RESERVED**

The designed real adapter. **No file exists** (glob-confirmed). It implements the **same**
`IDataService` (all 63 methods, C1) against the real backend core (NestJS/SAP per the Stage-F1
plan: `httpDataService`, OIDC, durable audit). Named as the intended swap in
`DataServiceContext.tsx:5`. Because the interface is frozen, landing it is additive.

---

## `ICommandService` + the SAP boundary (Option B) · **LIVE (2 verbs)**

The single write seam (C1): `dispatch` / `getCommandStatus` / `settle`. The mock wires the
framework-agnostic dispatcher to the mock stores, the persona→role map, the bound policy hooks,
and the in-memory `AuditSink` (`MockCommandService.ts`).

**Option B — SAP settlement.** A `sapBoundary: true` transition does not claim completion
synchronously. Exactly **two** carry it today:

- **`t_gr_post`** — dispatcher returns `submitted`, interim `Posting to SAP` (no document). On
  `settle`, `settleFinalize` advances → `Posted to SAP` and mints the **real** material document
  (`goodsReceiptStore.nextMatDoc()`) — never fabricated client-side (closes `GR-FABRICATION-01`).
- **`t_invoice_release_payment`** — interim `Releasing Payment`. On `settle`, advances →
  `Payment Released` and assigns the **real** FI document + payment ref + date — no "paid" claim
  before it is true (law 0.6).

The `settleFinalize` seam **is** the SAP settlement callback. In the mock it is called directly;
the Phase-F2 real system implements it as the integration webhook (S/4HANA Event Mesh + OData),
under the **same** `correlationId`. Swap-point: `MockCommandService.ts` `settleFinalize`.

---

## `getCapabilities` / DNA-SEED-01 · **LIVE-PARTIAL — do NOT round to LIVE**

```ts
getCapabilities(scope: QueryScope): Promise<CapabilitySet>   // { roles, transitions }
```

- **LIVE:** `getCapabilities` is reserved on `IDataService` and **mock-backed** — `capabilitiesFor`
  computes it as the **persona-role map × the flow catalog** (`roles.ts`): the roles a persona
  holds and the transition ids it may initiate. `PERSONA_ROLES` is the **DATA** placeholder for
  the real IdP claim set (Phase-4′ OIDC swaps the table, never the transition metadata).
- **RESERVED (the partial):** the **`guidance?` prop slot** on the inline-state / deferred-action
  primitives is **NOT built** — those primitives (`STATE-PRIM-01` / `DEFER-ACTION-01`) have not
  landed (still full-page-only states; no action-layer primitive). The seed is co-located with the
  primitive when it is first built (Phase 2′ action layer), so it is not an orphan type.

**DNA-SEED-01 is PARTIAL**: capability surface LIVE, guidance slot unbuilt. It must not be reported
as fully seeded.

**Catalog-coverage note:** the 5 inert F0.4 flows have their roles mapped in `PERSONA_ROLES`
(`contract:*`, `obligation:*`, `pr:*`, `shipment:*`, `supplierdoc:*`) **for catalog-coverage only**
— a contract-level permission surface (DNA-SEED-01) with **no UI consumer and no CommandTarget**.
The capability set is honest about what *could* be initiated once wired; it does not imply the
verbs are behavior-wired (they are not — C1 wiring census).

---

## OIDC / real IdP · **RESERVED**

The persona→transition-role table (`PERSONA_ROLES`, `roles.ts`) is the placeholder. Phase-4′ OIDC
swaps it for a real IdP claim set; the transition metadata (`requiredRole` strings) and the
dispatcher are untouched. System/cascade transitions (Paragon-side automation) map to `buyer`.

---

## INT-TMS-01 — Portal↔TMS ASN boundary · **RESERVED**

Once an ASN is `Submitted`, its logistics lifecycle (`In Transit` / `Delivered` — the
`system`-trigger transitions on `advanceShipNotice.flow.ts`, **authored but unwired**) belongs to
the **TMS Control Tower** (the Odyssey platform sibling), not the Supplier Portal. There is **no
integration seam** handing the submitted ASN to the TMS and **no inbound channel** for TMS-driven
logistics events. Phase-4′ wire: the `asn:carry` transitions become TMS-driven, mirroring how
`t_gr_post` is SAP-driven. Until then, In-Transit / Delivered stay authored-unwired. The
`shipment.flow.ts` machine (8 transitions, inert F0.4) is the TMS-owned lifecycle this boundary
eventually feeds. (`docs/findings.md` INT-TMS-01.)

---

## LivenessRegistry · **SPEC**

Named as a forward seam ("LivenessRegistry-to-come") with **zero code** (grep-confirmed). Its
intended job is to record which flows/verbs are behavior-wired vs. inert (the C1 wiring census,
made queryable at runtime) so a surface can honestly render "wired / authored-unwired" instead of
the census living only in docs. **SPEC** — appears here only as a pointer; the SE-Team builds it.

---

## Backend / datastore · **RESERVED (greenfield)**

Zero server code, zero datastore clients. Data is in-memory fixtures behind `mockDataService`
(`src/main.tsx`); the mutable command stores (`purchaseOrderStore`, `asnStore`,
`goodsReceiptStore`, `invoiceStore`, `rfqStore`, `quotationStore`) hold command results in memory.
Tenant scoping is enforced client-side. The real backend core is the Phase-F1 build (behind
`httpDataService`); fixtures are multi-tenant (sup-002 / sup-005 / sup-007) and a service-level
scoping contract guards buyer-superset / per-supplier-isolation / `SCOPE_DENIED`.
