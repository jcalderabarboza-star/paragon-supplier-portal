# DESIGN 5 · Module Activation and Process Guides — switch the platform on step by step, and explain every process end to end

**Seat 3, consultant, Ops Project #11 · 2026-09-28 · DRAFT FOR OPERATOR RULING · READ-ONLY session (nothing written in the repo).**
**Pinned tree:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa` — re-pinned today: `git ls-remote origin refs/heads/main` returned the same object, so the reviewer's `git archive` export of that SHA (with its own `npm ci`) is the tree every fact below is read from. Every file:line is against it.
**What this document is:** the fifth design draft, dispatched by the Strategist on the operator's request on 2026-09-28. Part A designs **Module Activation** (the platform switched on step by step); Part B designs the **Process Guide registry** (every process explained end to end, for users and for the operations co-pilot, SE-20); Part C reports the **guide content** authored in `review-drafts\guides\`. Both are built by our team before handover on 28 Oct 2026 (Week 4).
**The TMS pattern was shown by the operator and is adapted, not copied**: a roadmap board and an admin page for activation; a catalogue and a per-flow guide with lifecycle walk, step-by-step operator and tester lines, forks, exception flags, linked objects, status history, troubleshooting and test data. The TMS guide names a driver personally; ours names roles only, everywhere.

---

## 0 · The one-page version

1. **Fourteen modules, derived from the tree** — every route in `AppRouter.tsx` and every flow in the registry belongs to exactly one module, and a test says so in both directions. Each module carries a code, an EN/ID name, its routes, its flows and verbs, the read capabilities it consumes, and its **dependencies** (an invoice needs a purchase order; the planning grid needs intake; forecast publication needs the planning object). The dependency graph is acyclic and enforced (§A.1).
2. **The "channel" analogue is the SIDE** — Buyer side and Supplier side, each a top-level toggle with a one-line description, exactly where TMS puts its channel toggles. Modules carry a scope chip: **cross-cutting** (both sides) or **side-split**. Raw material vs packaging is *not* a switch, because no route or verb in the tree is grain-specific (§A.1.4).
3. **Phases mean something concrete**: Active = on and in production use · Activating = on with a visible banner, being configured or piloted · Planned = off and scheduled, on the board · Backlog = off and not scheduled. **Default is everything ON, Active**, as the operator's TMS does (§A.2).
4. **OFF is honest and strands nothing.** An OFF module's routes leave the navigation and render read-only with a notice naming the module and who can switch it on; its write verbs are refused **by name** at the dispatcher (`MODULE_INACTIVE:<code>`, a new refusal in the order-pinned list); a module may not be switched OFF while a module that depends on it is ON; existing documents stay readable everywhere they are referenced (§A.3).
5. **Activation is a governed act**: a single-state ledger flow on the `t_enforcement_set` pattern, `t_module_set`, attributed from the session, reason required, append-only, rendered as *Last updated by <role> at <time>*. The atom sits with the platform's other governance atoms. A sample identity may act in the demo and is marked; four-eyes waits for the IdP with the template hook copied, said plainly on the surface (§A.4).
6. **Two screens** — the roadmap board and the admin page — EN/ID, with tests for every invariant above; **1.5 batches** for our team (§A.6).
7. **The guide registry is keyed to the real flow registry.** A guide file per flow (EN authoritative, ID draft) with fixed section markers and one block per transition; a build step parses them into typed JSON; bilateral tests refuse a guide that names a transition the tree does not have and a transition the guides do not explain. `/buyer/process-flows` grows tabs from it; the co-pilot reads the JSON and cites by step id (§B).
8. **All 25 guides are authored** in `review-drafts\guides\` — the 19 wired flows in full, the 6 unwired as short honest guides — EN plus an ID draft, every fact from the tree with a hidden source note (§C, counts reported there).

---

# PART A · MODULE ACTIVATION

## A.1 The module map — derived

### A.1.1 Instruments

Routes: `src/router/AppRouter.tsx:78-166` (44 `<Route>` elements including `/`, `*`). Navigation: `SidebarV2.tsx:53-175` (`BUYER_NAV`, `SUPPLIER_NAV`). Flows: `getKnownFlows()` (25). Verb → surface: `guides/_derived/surfaces.md` (from the R3 census, non-literal sources resolved). Read capabilities: `src/services/liveness/registry.ts:53-…` (`Capability` union) with the capability → flow map at `:150-170`. Cascades: `cascades.ts`. Hand-offs and required references (`poReference`, `asnReference`, `rfqId`, `publicationId`, `contractId`): the flow files.

A module is the smallest set of routes, flows and reads a person would switch on together. The grouping below is a **judgement over derived facts**; the facts (which route, which flow, which capability) are not.

### A.1.2 The modules

| Code | Module (EN · ID) | Scope | Routes | Flows (verbs) | Reads (capabilities) | Depends on |
|---|---|---|---|---|---|---|
| **PLT** | Platform · Platform | cross-cutting, **always on** | `/buyer/dashboard`, `/supplier/dashboard`, `/buyer/roles`, `/buyer/roles/:roleId`, `/buyer/process-flows`, `/glossary`, `/login`, `/` and `*`, **`/buyer/platform/modules` and `/admin` (new, §A.5)** | `role` (1), **`moduleActivation` (1, new)** | identity, dashboard | — |
| **SUP** | Supplier network · Jaringan pemasok | cross-cutting | `/buyer/suppliers`, `/buyer/suppliers/:id`, `/buyer/discovery`, `/marketplace`, `/marketplace/supplier/:id`, `/buyer/supplier-applications`, `/register`, `/supplier/storefront` | `supplierApplication` (4) | suppliers, supplierDiscovery, supplierApplications, supplierRegistration | PLT |
| **CMP** | Compliance & documents · Kepatuhan & dokumen | cross-cutting | `/buyer/compliance`, `/supplier/documents` | `supplierDocument` (5); `compliance` (3, inert — ruled for retirement, Design 3 D2) | compliance, supplierDocuments | SUP |
| **PSL** | Preferred suppliers · Pemasok pilihan | buyer | `/buyer/preferred-suppliers` | `psl` (8), `pslCapSetting` (1) | psl | SUP |
| **MAT** | Material requests · Permintaan material | buyer | `/buyer/material-requests` | `materialRequest` (4) | materialRequests | PLT |
| **REQ** | Requisitions · Permintaan pembelian | buyer | `/buyer/purchase-requisition` | `purchaseRequisition` (7) | purchaseRequisitions | PLT |
| **PLN** | Planning · Perencanaan | buyer | `/buyer/intake-review`, `/buyer/plan-grid` | (the intake machine, Design 1; today the three `t_pr_create` entrances) | purchaseRequisitions | REQ, SUP |
| **SDC** | Supplier collaboration · Kolaborasi pemasok | cross-cutting | `/buyer/collaboration`, `/buyer/chase`, `/supplier/forecasts`, `/supplier/inventory` | `requirementResponse` (7), `inventoryDeclaration` (2), `incomingShipment` (4); the publication machine (Design 2) | forecastPublications, inventory | SUP; PLN (publication, once Design 2 lands) |
| **COM** | Communication hub · Pusat komunikasi | cross-cutting | `/buyer/comm-hub`, `/supplier/comm-hub`, `/supplier/whatsapp` | none of its own (channel ingestion dispatches SDC's `t_inventorydeclaration_record` / `_declare`) | messaging | SDC |
| **SRC** | Sourcing & RFQ · Pengadaan & RFQ | cross-cutting | `/buyer/sourcing`, `/supplier/rfqs` | `rfq` (7), `quotation` (4) | rfqs | SUP; PSL (the sourcing gates read it — soft); REQ and MAT (link only — soft) |
| **CTR** | Contracts & delivery agreements · Kontrak & perjanjian pengiriman | cross-cutting | `/buyer/contracts`, `/buyer/contracts/:id`, `/buyer/delivery-agreements`, `/supplier/delivery-agreements` | `deliveryRelease` (3), `deliveryPolicy` (1); `contract` (4, inert S/4 facts), `obligation` (2, inert) | contracts, deliveryAgreements | SUP; SRC (award → contract, Design 3 — soft until the feed) |
| **ORD** | Purchase orders · Pesanan pembelian | cross-cutting | `/buyer/orders`, `/supplier/orders` | `purchaseOrder` (7) | purchaseOrders | SUP |
| **SHP** | Shipments & ASN · Pengiriman & ASN | cross-cutting | `/buyer/shipments`, `/supplier/shipments` | `advanceShipNotice` (6); `shipment` (8, inert TMS facts) | advanceShipNotices, shipments | ORD |
| **GRC** | Goods receipt & inspection · Penerimaan barang & inspeksi | buyer | `/buyer/goods-receipt` | `goodsReceipt` (8), `goodsReceiptLine` (6, substrate), `enforcement` (1) | goodsReceipts | SHP; CMP (halal / BPOM checks read the registry) |
| **INV** | Invoices & payment · Faktur & pembayaran | cross-cutting | `/buyer/invoices`, `/supplier/invoices` | `invoice` (8), `invoiceMatch` (4, substrate) | invoices | ORD; GRC (the match cascade) |
| **INT** | Intelligence · Intelijen | cross-cutting | `/buyer/analytics`, `/buyer/scorecard`, `/buyer/risk`, `/buyer/inventory`, `/supplier/performance` | none | analytics, scorecards, risk, commodityIntel | reads ORD, INV, GRC, SDC (soft: tiles render *module off*) |

That is fifteen rows including PLT; **fourteen switchable modules**. Every route above appears once; the bilateral test (§A.6) fails if a route or a flow is unassigned or assigned twice.

**Hard vs soft dependencies.** *Hard* = the dependant's verbs need the dependency's documents or verbs to exist (INV → ORD; SHP → ORD; GRC → SHP; PLN → REQ; COM → SDC; everything → PLT). *Soft* = the dependant reads the dependency for a gate or a link and degrades honestly when it is off (SRC → PSL; INT → anything). The registry records the kind; the OFF rule (§A.3) applies to hard dependencies.

### A.1.3 Parts (sub-toggles)

A module with separable parts exposes them as sub-toggles, each mapped to the verbs or surfaces it governs:

| Module | Part | Governs |
|---|---|---|
| SDC | Confirmations · Stock on hand · Incoming shipments · Chase | `requirementResponse` verbs · `inventoryDeclaration` verbs and the bulk grid · `incomingShipment` verbs · `/buyer/chase` and the chase card |
| GRC | Inspection wizard · Halal certificate notice · Quality hold | the wizard route and `t_gr_create…post` · the `verifyHalalAtReceipt` notice (H4) · `t_gr_hold` / `t_gr_request_retest` |
| SRC | FX pin · Sourcing gates | `t_rfq_fx_pin` · the PSL-driven publish gates |
| INV | Disputes · Payment release | `t_invoice_dispute` / `_resolve` · `t_invoice_release_payment` |
| CTR | Delivery releases · Drawdown policy | `t_delivery_release` / `_adjust` / `_confirm` · `t_delivery_policy_set` |
| SUP | Applications · Discovery & marketplace · Self-registration | `supplierApplication` verbs and its route · `/buyer/discovery`, `/marketplace/*` · `/register` |
| COM | WhatsApp demo | `/supplier/whatsapp` |
| CMP | Buyer requests · Supplier uploads | `t_supplierdoc_request` / `_verify` / `_reject` · `t_supplierdoc_declare` / `_submit` |

### A.1.4 The "channel" analogue — the side, and why not the material grain

TMS toggles channels at the top of the admin page. Our platform's equivalent axis is the one every read and every command is already scoped by: **the side** — `personaType: 'buyer' | 'supplier'` in `QueryScope`. Two top-level toggles, each with a one-line description (*Buyer side — Paragon's planners, buyers, receivers, finance and compliance* / *Supplier side — the supplier organisations' sales, logistics and admin contacts*). Switching the supplier side OFF hides every `/supplier/*` route and refuses every supplier-lane verb by name; the buyer side cannot be switched off while PLT is always on (the admin page lives there).

Raw materials vs packaging was considered and rejected as a toggle: no route, flow, verb or capability in the tree is grain-specific; the grain is a *view* (Design 1's `rm-plan` / `pm-plan`) and a bucket cadence, not a module. A grain toggle would be three words no code enforces — the false-affordance class this project removes. Recorded as decision D1.

## A.2 The registry, the phases, the state

```ts
export type ModuleCode = 'PLT' | 'SUP' | 'CMP' | 'PSL' | 'MAT' | 'REQ' | 'PLN' | 'SDC' | 'COM' | 'SRC' | 'CTR' | 'ORD' | 'SHP' | 'GRC' | 'INV' | 'INT';
export type ModuleScope = 'cross-cutting' | 'buyer' | 'supplier';
export type ModulePhase = 'Active' | 'Activating' | 'Planned' | 'Backlog';
export type DependencyKind = 'hard' | 'soft';

export interface ModulePart { readonly id: string; readonly nameKey: string; readonly verbs: readonly TransitionId[]; readonly routes: readonly string[] }

export interface ModuleSpec {
  readonly code: ModuleCode;
  readonly nameKey: string;                 // modules.name.<code> — EN and ID in src/lib/i18n/modules.ts
  readonly descriptionKey: string;
  readonly scope: ModuleScope;
  readonly routes: readonly string[];       // exact AppRouter paths; bilateral with the router
  readonly flows: readonly string[];        // entity keys; bilateral with getKnownFlows()
  readonly capabilities: readonly Capability[];
  readonly dependsOn: readonly { readonly code: ModuleCode; readonly kind: DependencyKind }[];
  readonly parts: readonly ModulePart[];
  readonly alwaysOn?: true;                 // PLT only
}

/** The ledger row — store-minted stamps, never payload fields (the setAt/pinnedAt discipline). */
export interface ModuleActivationSetting {
  readonly code: ModuleCode;
  readonly phase: ModulePhase;
  readonly enabled: boolean;
  readonly parts: Readonly<Record<string, boolean>>;
  readonly reason: string;
  readonly setBy: ActorAttribution;         // from scope.actor, refused in the payload (ACTOR_IN_PAYLOAD)
  readonly setAt: string;                   // sdcClock / the dispatcher clock
}
```

**Derived, never stored:** a module's verbs (from its flows), its side toggles' effect (from scope), whether it *may* be switched off (from the dependants' current state), and the board column (from `phase`).

**Phase semantics (rendered as help text on the admin page):**

| Phase | `enabled` | What a user sees | When to use |
|---|---|---|---|
| **Active** | on | the module, with no banner | in production use |
| **Activating** | on | the module, with a banner *Activating — being configured; data may be sample* and a link to its guide | a pilot group, a configuration window, or a module whose feed is still SIMULATED |
| **Planned** | off | not in navigation; a read-only notice with the phase and *scheduled* | scheduled for a later wave; shows on the board's Planned column |
| **Backlog** | off | not in navigation; read-only notice with the phase | not scheduled |

`enabled` is derivable from the phase and is stored anyway because the ledger records the fact as switched, and a phase can be set on an ON module without switching it (Active ↔ Activating).

**Defaults:** every module `Active`, `enabled: true`, every part on — the operator's ruling and the TMS pattern. The registry's defaults are the "Reset" target.

## A.3 What OFF means — honestly

| Effect | Mechanism | Never |
|---|---|---|
| **Navigation** | `SidebarV2` filters nav items whose route belongs to an OFF module; the persona's dashboard stays | never a dead link |
| **Routes** | the router wraps each module's routes in a `ModuleGate`: OFF ⇒ the page renders **read-only** — its lists and detail views with every action control replaced by a `ModuleOffNotice` naming the module, its phase, and the role that can switch it on (the `NoSupplierIdentity` pattern: remedy derived from the seat, not passed in) | never a 404, never a blank; a document already in flight stays readable |
| **Write verbs** | the dispatcher gains `moduleOf(transitionId)` (derived from `ModuleSpec.flows`) and refuses `MODULE_INACTIVE:<code>` when the module or the governing part is OFF; the refusal joins `COMMAND_REFUSALS` **after `SCOPE_DENIED` and before `ROLE_NOT_PERMITTED`** (a caller outside the tenancy learns nothing; a caller inside it learns the module is off before learning about its role); the order pin test moves with it | never a silent no-op, never a toast that claims the act |
| **Cascades** | a cascade whose target is in an OFF module would be swallowed by the fan-out's `catch {}` — so the rule below makes it unreachable rather than trusting the catch | never a swallowed refusal |
| **Dependants** | switching a module OFF is **refused** (`MODULE_HAS_ACTIVE_DEPENDANTS:<codes>`) while any hard dependant is ON; the admin page shows the dependants and offers to switch them off first, most-dependent first; soft dependants render *depends on <module>, currently off* on the affected control and continue | never a dependant left ON over an OFF dependency |
| **Reads** | read capabilities of an OFF module keep answering (a list of POs still loads for an invoice's link); the liveness registry is untouched — activation is availability, not liveness | never a fabricated empty list |
| **Side toggle OFF** | every module scoped to that side, and the side's routes, behave as OFF; cross-cutting modules lose that side's routes and verbs only | never the buyer side while PLT is on |

**The rule that strands nothing, stated once:** *an OFF module hides its doors and refuses new acts; it never hides a document.* Every reference from an ON module to a document in an OFF module still resolves and renders read-only.

## A.4 Governance — an audited, attributed act

```
moduleActivation   single state 'Governed' · statePreserving · append-only ledger (t_enforcement_set's shape)
  t_module_set     creation → Governed    user   atom module:set
       fields: code · phase · enabled · parts · reason
       hooks:  MODULE_KNOWN (code in the registry; PLT refused) · MODULE_PHASE_CONSISTENT (Active/Activating ⇒ enabled; Planned/Backlog ⇒ disabled)
               MODULE_ACTUALLY_CHANGES · MODULE_REASON_AUTHORED · MODULE_NO_ACTIVE_HARD_DEPENDANTS (when disabling) · MODULE_DEPENDENCIES_ENABLED (when enabling: every hard dependency ON)
               MODULE_SET_ATTRIBUTED (a RESOLVED actor from scope; the UNATTRIBUTED arm refuses — the act must be answerable)
       target: appends ModuleActivationSetting { …, setBy: scope.actor, setAt: clock }; readState always 'Governed'; readScopeOwner: null (buyer-only governance)
```

- **The atom.** `module:set` joins the **`compliance`** lane, beside `role:grant`, `delivery:policy-set` and `psl:cap-set` — the platform's governance atoms already live there, and the header of `deliveryRelease.flow.ts` gives the reason (*the same party cannot both set the bar and be governed by it*). `admin` spans tenancies and is not offered to a seat; a governance act should not require it.
- **Attribution.** The act requires a RESOLVED actor. Today that is a sample person (opt-in, marked SAMPLE on the ledger row and in *Last updated by Compliance 1 (SAMPLE)*); after the IdP, a real one. The unattributed seat is refused with the honest reason — the same shape as the PR approval.
- **Sample identities and loosening.** Switching a module ON widens what the platform will do; switching it OFF narrows it. Neither is an *enforcement* loosening in the sense the two existing locks guard (they guard governed checks and overrides), so the locks are untouched. **Recommendation (D3):** admit a sample actor in both directions **in the demo build only**, marked; production requires a non-sample actor by the same `isSampleActor` roster test the locks use — a one-line hook, `MODULE_SET_NOT_SAMPLE_IN_PROD`, gated on the deployment badge.
- **Four-eyes.** Recommended for switching a module OFF that has any dependants (soft included) and for switching the supplier side OFF: propose then approve by a different person, on the `PSL_DECIDER_NOT_PROPOSER` template. It is unusable until the IdP (two unattributed actors satisfy the template), so the design ships the single verb now with the hook copied and the surface saying *four-eyes applies once sign-in exists* — the same honesty the material-request lane already renders.
- **Audit.** One `TransitionEvent` per change; the admin page's *Last updated by … at …* reads the latest ledger row, never a stored label; the whole ledger renders on the module's detail drawer.
- **Persistence.** The ledger is a store behind the service (`moduleActivationStore`), swapped by `httpDataService` at F1. It is **not** browser storage: activation is platform state shared by everyone, the opposite of a per-user preference (Design 1 §6.2 draws the same line the other way).

## A.5 The two screens

### A.5.1 Roadmap board — `/buyer/platform/modules`

Four columns — **Active · Activating · Planned · Backlog** — derived from the ledger's latest phase per module (registry default where no row exists). Each card: code, EN/ID name, scope chip (cross-cutting / buyer / supplier), a one-line description, the count of routes and verbs (derived), a dependency line (*needs ORD, SHP*), and the SIMULATED / LIVE pill of its main capability. Clicking a card opens the module's detail drawer: routes, flows and verbs, parts, dependants, the activation ledger, and a link to each flow's process guide (§B). Read-only for every seat; the admin page is one click away for a seat holding `module:set`, a `HandoffNotice` naming `compliance` otherwise.

### A.5.2 Admin page — `/buyer/platform/modules/admin`

- **Side toggles** at the top: *Buyer side*, *Supplier side*, each with its one-line description and its ON/OFF; the buyer side's toggle is disabled with the reason while PLT is always on.
- **One row per module**: name · code · scope chip · routes (chips linking to the route when ON) · **phase** select (four values, help text per §A.2) · **ON/OFF** toggle · sub-toggles for parts · *Last updated by <role> (SAMPLE) at <time>* from the ledger · dependants shown on hover and named in the refusal when a switch-off is blocked.
- **Reset** returns the form to the registry defaults; **Save changes** dispatches one `t_module_set` per changed row under one causation anchor (the SubmissionSession pattern), with a single reason field for the batch and a per-row override; a refusal on one row leaves the others applied and the refused row marked with its reason and glossary chip.
- **The identity rule applies here first:** an UNATTRIBUTED seat sees the page read-only with the `ActorPreActNotice`'s sample arm telling it to adopt a sample user before acting (demo) and, after the IdP, to sign in.
- EN/ID: `modules.*` fragment; phase names, scope chips and every notice in both locales from birth; the locale-parity instrument covers it.

## A.6 Tests, and the batch plan

| Instrument | Asserts | Both ways |
|---|---|---|
| Route ↔ module | every `AppRouter` path is in exactly one `ModuleSpec.routes` (derived from the router source, the `allRoutes.smoke` precedent) | a route in no module is red; a route in two is red; a registry route the router lacks is red |
| Flow ↔ module | every `getKnownFlows()` entity is in exactly one module | same shape |
| Dependency graph | acyclic; PLT has no dependencies; every dependency names a registered code | a cycle inserted by a mutant is red |
| OFF refuses by name | with SHP OFF, `t_asn_submit` returns `MODULE_INACTIVE:SHP`; with SHP ON it does not | known-good / known-bad |
| Refusal order | `COMMAND_REFUSALS` places `MODULE_INACTIVE` after `SCOPE_DENIED` and before `ROLE_NOT_PERMITTED`, and the dispatcher's construction order agrees | the existing order pin extended |
| Dependants block | disabling ORD while INV is ON is refused naming INV; after INV is off it succeeds | — |
| Routes render read-only | an OFF module's route renders the notice and no action control (derived from the dead-affordance census's control population) | ON renders the controls |
| Ledger | append-only, attributed, `setAt` store-minted; a payload `setBy` is refused (`ACTOR_IN_PAYLOAD`) | — |
| Board columns | four columns equal the phase union; every module appears once | — |
| Browser QA | both locales; ON → OFF → ON on one cross-cutting module with a dependant, screenshots delivered | — |

| # | Batch | Delivers | Size |
|---|---|---|---|
| **M1** | Registry, ledger, gates | `ModuleSpec` registry + i18n fragment; `moduleActivation` flow, store, target, hooks; `MODULE_INACTIVE` in the dispatcher and the refusal order; `ModuleGate` + `ModuleOffNotice`; nav filtering; the eight instruments | 1 |
| **M2** | The two screens | board + admin page + detail drawer; EN/ID; browser QA | 0.5 |

**Ownership:** ours, Week 4 (operator, 28 Sep 2026). What the SE Team inherits: the `httpDataService` implementation of the ledger store, the production `MODULE_SET_NOT_SAMPLE_IN_PROD` flip, four-eyes once the IdP exists.

---

# PART B · PROCESS GUIDES

## B.1 The guide registry — keyed to the flow registry

**Source format:** one markdown file per flow and locale, `guides/<entity>.<locale>.md`, with YAML front matter and nine fixed sections identified by HTML-comment markers (`<!-- section:summary -->` … `<!-- section:testdata -->`) and one block per transition identified by `<!-- transition:<id> -->`. The complete shape and the authoring rules are `review-drafts\guides\_README.md` (binding for the content in Part C) and `_TEMPLATE.en.md`.

**Why markdown as the source, not TypeScript:** the guide's audience and its future editors are the procurement team and the SE Team's writers, not engineers; a `Record<TransitionId, string>` in `src/lib/i18n/` would make every correction a code change reviewed by an engineer. The tree's own precedent for authored prose about the machine — `processFlowPurpose.ts` — is small enough to live as keys; a nine-section guide per flow is not. Recorded as decision D6.

**Build step:** `scripts/guides/build.mjs` parses `docs/guides/**.md` (the repo home of Part C's files after landing) into `src/guides/generated/guides.json` and a typed accessor:

```ts
export interface GuideStep {
  readonly transitionId: TransitionId;
  readonly label: string;
  readonly stepKind: 'operator-action' | 'system-driven' | 'cascade' | 'external-fact' | 'records-fact' | 'not-active' | 'modelled-not-active';
  readonly role: string;                          // lane(s) as text
  readonly operator: { where: string; do: string; fill: string };
  readonly tester:   { expectedState: string; confirm: string; triggerEvent: TransitionId };
  readonly checks: string;                        // policy hooks, plain
  readonly glossary: readonly string[];
  readonly honesty: string;
  readonly sources: readonly string[];            // the hidden src notes, kept for the reviewer and the co-pilot
}
export interface ProcessGuide {
  readonly entity: string; readonly locale: 'en' | 'id'; readonly title: string; readonly wired: boolean; readonly owner: string; readonly sourceSha: string;
  readonly sections: Record<'summary' | 'lifecycle' | 'steps' | 'forks' | 'flags' | 'linked' | 'history' | 'troubleshooting' | 'testdata', string>; // rendered markdown per section
  readonly steps: Record<TransitionId, GuideStep>;
  readonly testData: readonly { state: string; fixtureIds: readonly string[]; number?: string; note?: string }[];
}
```

**The bilateral gates (`guides.test.ts`):**

| Assertion | Direction it did not have |
|---|---|
| every `getKnownFlows()` entity has a guide in EN and in ID | a flow without a guide is red |
| every guide's `entity` is a registered flow | a guide for a retired flow is red |
| every guide's front-matter `transitions` equals the flow's transition ids, in order, in both locales | a guide naming a transition the tree lacks, or missing one, is red — **this is the rule the dispatch asked for** |
| every `<!-- transition:ID -->` block exists for every id, once | a duplicated or missing block is red |
| every `tester.triggerEvent` equals its block's id | a copy-paste error is red |
| every fixture id in `testdata` resolves in its store at seed (derived at test time, `guidefacts.ts`'s store map) | a stale id is red the day a fixture is renamed |
| every route named in an `operator.where` exists in `AppRouter` | a moved page is red |
| no personal name: the roster's labels, `sim-usr-`, and the README guard's denylist are absent from every guide | roles-only, extended to the guides |
| EN and ID guides have identical section markers, transition ids, table row counts in `testdata` | a translation that drifts structurally is red |
| the source SHA in every guide is a commit the repository holds (`git cat-file -e`) | a guide written against a tree that never existed is red |

Content is never asserted (prose stays prose); structure and identity are.

## B.2 How `/buyer/process-flows` grows into the guides

The page already builds `buildCatalogView(getKnownFlows())` and renders, per flow, the diagram, the transition table (step kind, owner, personas, fields, hooks, flags), the purpose sentences, the loose ends and a `LifecycleWalk` that dispatches nothing (R3 §4.1). The guide registry adds, per flow, **tabs under the existing diagram** — nothing on the page is removed:

| Tab | Source | Notes |
|---|---|---|
| **Overview** | the current page + `sections.summary` | catalogue cards gain the summary's first paragraph and the derived counts |
| **Lifecycle walk** | `LifecycleWalk` (kept) + `sections.lifecycle` | each step badged operator action / system-driven / cascade / external fact from `stepKind`; forks listed with role and *when* |
| **Step by step** | `steps` | two panes per transition — **Operator** (where / do / fill) and **Tester** (expected / confirm / trigger) — with the glossary chips and the honesty line; the transition's `HandoffNotice` for the current seat beside it (`useVerbAvailability`) |
| **Forks & exceptions** | `sections.forks` | — |
| **Exception flags** | `sections.flags` | rendered beside the flags the page already derives (`recordsFact`, `sapBoundary`, `fansOutTo`, `firedBy`) |
| **Linked objects** | `sections.linked` | representative entity with links to its routes |
| **Status history** | the audit sink | **real**: `InMemoryAuditSink` events for a chosen entity id, grouped by `correlationId` and `causationId`, rendered time · from → to · actor role · trigger · event; a fixture-born document shows *no events yet — this document was seeded before the audit began*, and the guide's worked sequence beside it |
| **Troubleshooting** | `sections.troubleshooting` | — |
| **Test data** | `testData` | each fixture id a link to the route that lists it |

The state labels the page lacks (R3 §4.3) are not added by the guides — states render as the registry spells them, and the guide's prose refers to them by that spelling. A state-label registry is the Flow Builder's (Design 6).

## B.3 How the co-pilot (SE-20) reads it

- **Machine-readable:** `guides.json` is the artefact; each step carries a stable citation key `guide://<entity>/<locale>#<transitionId>` and each section `guide://<entity>/<locale>#<section>`. The co-pilot answers a process question **only** from the registry and cites the key on every sentence that states a fact; a question the registry does not answer gets *not in the guides* and a pointer to the nearest section — the honesty rule, applied to an answer.
- **Grounding:** the registry is generated from the same tree the flows come from, so the co-pilot cannot describe a transition that does not exist (the bilateral gate). Its answers about *which state a document is in* come from the store, never from the guide; the guide tells it what the state means and who acts next (`nextActFor` is the instrument, the guide the explanation).
- **Locale:** the co-pilot answers in the seat's locale from that locale's guide; the ID draft is marked as a draft in its front matter until the locale pass ratifies it.

## B.4 Batch plan

| # | Batch | Delivers | Size |
|---|---|---|---|
| **G1** | Structure and rendering | `ProcessGuide` types, the build step, `guides.test.ts` with every gate above, the tabs on `/buyer/process-flows`, the status-history reader over the audit sink, EN/ID chrome, browser QA | 1 |
| **G2** | Content landing | Part C's 50 files copied to `docs/guides/`, the build run, the gates green, the ID drafts marked, browser QA of three flows in both locales | 1 |

**Ownership:** ours, Week 4. The SE Team inherits the co-pilot (SE-20), the state-label registry (Design 6) and the guides' maintenance rule: a flow change is not merged until its guide's gate is green.

---

# PART C · THE CONTENT — `review-drafts\guides\`

Authored today against the pinned tree by six parallel authoring passes, one lane each, from `_derived/guidefacts.json` (states, transitions, roles, fields, hooks, cascades, fixture ids per state, purpose sentences EN/ID — produced read-only by `_derived/guidefacts.ts` over the export) and `_derived/surfaces.md` (transition → route). Every file follows `_README.md`; every transition block ends with a hidden `<!-- src: … -->` note.

**Coverage and status are reported in the delivery message, derived by the verification script over the folder** (file count, flows covered in EN and ID, transition-id sets equal to the registry in both locales, no personal names, no placeholders). This section deliberately carries no counts in prose: the folder is the count.

**Order of authoring, as ruled:** the 19 wired flows in full (`purchaseOrder`, `advanceShipNotice`, `goodsReceipt`, `invoice`, `rfq`, `quotation`, `purchaseRequisition`, `supplierDocument`, `requirementResponse`, `inventoryDeclaration`, `incomingShipment`, `enforcement`, `role`, `supplierApplication`, `materialRequest`, `psl`, `pslCapSetting`, `deliveryRelease`, `deliveryPolicy`); then the 6 unwired as short honest guides (`goodsReceiptLine`, `invoiceMatch`, `shipment`, `contract`, `obligation`, `compliance`) naming the owner (S/4HANA, TMS, bank, or a substrate rollup).

**What the ID files are:** faithful structural translations reusing the tree's existing Indonesian vocabulary (`src/lib/i18n/*.ts`, the glossary's `id` definitions); marked `locale: id` and to be ratified by the locale pass before G2 lands them.

---

## D · Decisions the operator must make (recommendation first)

> ⚠️ **RULED — OPERATOR, 28 SEPTEMBER 2026. D1–D8 ARE ADOPTED AS RECOMMENDED, ALL EIGHT.**
> Stated as the ruling states them, so no reader has to reconstruct them from the
> recommendation column: **side toggles** (buyer / supplier), never a material grain ·
> **`module:set` sits in the `compliance` lane** beside `role:grant` · **sample identities may
> switch modules in the demo**, marked, and **production requires a real person**, with
> **four-eyes after the IdP** · **OFF renders read-only, never hidden** · **fourteen switchable
> modules + PLT as proposed** · **guides authored as markdown**, parsed at build · **unwired flows
> are included in the guide catalogue with their owner named** · **the repo home is
> `docs/guides/`**.
>
> The table below is therefore a record of what was decided, not a question. Each row keeps its
> recommendation verbatim — the ruling adopted these words, and rewriting them into imperatives
> would put the seat's paraphrase where the operator's decision is.


| # | Decision | Recommendation |
|---|---|---|
| D1 | **The channel analogue:** side toggles (buyer / supplier) vs a material-grain toggle (RM / PM) | Side; nothing in the tree is grain-specific and the side is the axis every scope already carries. **· RULED as recommended (operator, 28 Sep 2026).** |
| D2 | **Where `module:set` sits:** `compliance` (with the other governance atoms) or a new admin-only lane | `compliance`; `admin` is not offered to a seat and a governance act should not require it. **· RULED as recommended (operator, 28 Sep 2026).** |
| D3 | **Sample identities:** admit for switching modules in the demo (marked) and require a real person in production | Yes, with the production hook gated on the deployment badge; four-eyes deferred to the IdP and said so on the surface. **· RULED as recommended (operator, 28 Sep 2026).** |
| D4 | **OFF renders read-only routes** (recommended) vs OFF hides routes entirely as TMS does | Read-only; hiding a route hides the documents in it, and the rule is that nothing strands. **· RULED as recommended (operator, 28 Sep 2026).** |
| D5 | **Module codes and grouping** in §A.1.2 (fourteen switchable + PLT) | As proposed; the bilateral tests make any regrouping a one-file edit. **· RULED as recommended (operator, 28 Sep 2026).** |
| D6 | **Guide source format:** markdown files parsed at build vs TypeScript records | Markdown; the editors are not engineers and the gates hold the structure. **· RULED as recommended (operator, 28 Sep 2026).** |
| D7 | **Unwired flows in the guide catalogue** | Yes, with the honesty marker and the owner; a reader who meets *Contracts* in the navigation should find the guide that says who owns the act. **· RULED as recommended (operator, 28 Sep 2026).** |
| D8 | **Repo home for the guides** | `docs/guides/` with the build step reading it; not `src/`, so a prose edit never touches the floor except through the gates. **· RULED as recommended (operator, 28 Sep 2026).** |

## E · Confirmation

> ⚠️ **`main` MOVED AFTER THE RE-PIN.** At 10:33 the remote head was `81c98403`; PR #377 (H3, *"Every enabled control works, says honestly that it cannot, or is gone"*) merged at 10:38 and `main` is now `de101c67`. Everything in this design and every guide is pinned to `81c98403` and says so in its front matter. Derived from `git diff --stat 81c98403 origin/main`: #377 touched **no flow file, no dispatcher, no policy, no store and no fixture** — the facts the guides derive from are unchanged; it did touch page files the guides cite by line (`BuyerOrders`, `BuyerSourcing`, `BuyerRequisitions`, `BuyerContracts`, `SupplierDashboard`, `Marketplace`, `SupplierStorefront`, `IdentityPanel`, `TopBarV2`, `Login`) and turned several dead controls on those pages into honest notices or deletions, so a few `<!-- src: page:line -->` notes will drift by a handful of lines and a few "this button toasts" honesty lines on the buyer sourcing, orders and contracts pages may now read as "says it is not available". The G2 gate recomputes both against the tree it lands on; nothing here needs re-authoring before that.

Nothing was written in the repository. Reads came from the reviewer's `git archive` export of `81c98403…`; the one runtime derivation (`guidefacts.ts`) ran with `vite-node` inside that export's own `node_modules`, and its output was copied to `review-drafts\guides\_derived\`. The working copy was touched only by `git ls-remote`, `git fetch`, `git log`, `git branch --show-current` and `git status`.

*Source file: `C:\Users\<operator>\review-drafts\DESIGN_5_MODULE_ACTIVATION_AND_GUIDES.md` (2026-09-28).*
