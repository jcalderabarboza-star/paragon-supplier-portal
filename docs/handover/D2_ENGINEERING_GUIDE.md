# Engineering Guide — how the code works, for humans

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a.
**What this is:** a distillation of `CLAUDE.md` (1,580 lines at the pin, `wc -l`, written for the automated seats that built the tree) into the parts an engineer needs. Every claim names a file. A number either names the test that pins it or says it is not pinned; re-derive before relying on it.

---

## 1 · The stack in one paragraph

React 18 + TypeScript 5.6 + Vite 6, HashRouter (`src/router/AppRouter.tsx`), TanStack Query v5 for server state, Tailwind 3.4, react-i18next with English and Indonesian bundles (`src/lib/i18n/`), Vitest 3 with Testing Library. Node 24 (`package.json` `engines`, `.nvmrc`). The planning grid renders on `react-datasheet-grid` (`package.json:28`); AG Grid is not installed (SE-1). Vite's root is `app/` (`vite.config.ts`); never edit `app/index.html` by hand. `npm run build` first compiles the process guides (`scripts/guides/build.mjs` → `src/guides/generated/guides.json`). Data is served by `mockDataService` (`src/services/data/mock/mockDataService.ts`) through `DataServiceContext.tsx`; pages call `useDataService()` and the scoped query hooks in `src/services/query/`. There is no ESLint config and no `lint` script, deliberately.

---

## 2 · The command spine

Everything that changes state is a **command**: `{ transitionId, entity, entityId, payload, expectedState?, idempotencyKey?, decision? }` (`CommandInput`, `src/services/data/types.ts`). It goes through one function, the **dispatcher** (`src/services/transitions/dispatcher.ts`, built by `createDispatcher`), and returns a result; it never throws for a business refusal.

### 2.1 Flows and transitions

A **flow** is a state machine for one entity type: `{ entity, states, initial, terminals, transitions, version }` (`FlowDefinition`, `src/services/transitions/schema.ts`). A **transition** ("verb") is an edge: `id` (always `t_<entity>_<verb>`), `from`, `to` (or `statePreserving: true` for a verb that appends a record without moving state), `trigger` (`user` | `system` | `cascade` | `creation`; a `clock` trigger is refused at the type level, law 0.5), `requiredRole` (one permission atom, §3), `requiredFields`, `policyHooks`, and `surfaceable` (whether a screen is intended at all, and if not, who owns the fact). Flows live in `src/services/transitions/flows/*.flow.ts` and self-register on import (`src/services/transitions/index.ts`); `getKnownFlows()` is the only honest way to count them (29 at the pin, pinned by C1; v1: 28). `validate.ts` rejects a flow whose declared terminals have exits or whose exit-less states are undeclared; `flowGraph.test.ts` holds the catalogue against the loose-end census (`looseEndCensus.ts`), which lists holes that ship deliberately and can only shrink.

### 2.2 CommandTargets

A flow can exist without being writable. A **CommandTarget** is the per-entity adapter the dispatcher writes through: `readState`, `readScopeOwner`, `readEntity`, `applyTransition`, and for creation verbs `creationOwner?`, `requireCreationOwner?`, `create?(payload, toState, scope, decision?)` (C1 Axis 3). All wired targets are in the `TARGETS` map in `src/services/data/mock/MockCommandService.ts`; `WIRED_COMMAND_TARGETS` is the exported census (23, pinned by C1; v1: 22, `stageResponse` was added at RFx-1). Since RFx-2 (#408) the dispatcher tells a target which verb it is applying, and the RFQ target writes each guarded field (an awardee, a rate, an advance, a conclude reason) only for its own verb; before that a guarded key on any RFQ verb was written by payload shape (`src/services/data/mock/rfx2StorePayload.test.ts` reproduces the defect). The unwired set is `compliance`, `contract`, `goodsReceiptLine`, `invoiceMatch`, `obligation`, `shipment`.

### 2.3 The dispatcher's order of refusals

`COMMAND_REFUSALS` (`src/services/transitions/refusals.ts:61-114`) is order-pinned to the dispatcher's construction sequence, and a test asserts the order:

```
UNKNOWN_TRANSITION → UNKNOWN_ENTITY → MISSING_ENTITY_ID → MODULE_INACTIVE
→ ROLE_NOT_PERMITTED → STALE_STATE → ILLEGAL_TRANSITION → ACTOR_IN_PAYLOAD
→ MISSING_FIELDS → UNBOUND_HOOK → POLICY_REJECTED → UNSUPPORTED_CREATION
```

- **`MODULE_INACTIVE`** (PR #388): the module gate (`moduleActivationTarget.ts`, `moduleGate`) refuses a verb whose side, module or part is switched off; the detail names it (`SHP`, `GRC.qualityHold`, `side:supplier`). It runs after the thrown tenancy pair (`SCOPE_DENIED` / `NOT_FOUND`) and before role.
- **Role before state:** a caller without the atom learns nothing about the document.
- **`STALE_STATE`** is the optional compare-and-set on `expectedState`, checked before legality so a stale caller is told why. It is not a content-revision check.
- **Tenancy:** the supplier arm compares `readScopeOwner()` to `scope.supplierId` unconditionally, so a target that returns `null` denies every supplier (`ownerlessScope.test.ts`).
- **`ACTOR_IN_PAYLOAD`** refuses any payload key declared as attribution (`src/services/identity/attributionKeys.ts`); who acted comes from the session, never the payload (C10 Amendment 1).
- **`idempotencyKey`** is a per-tenant replay guard: a redelivery returns the first result. The intake cascade uses the intake line id as its key, which is one of the two reasons one line raises at most one requisition (`intakeCommitIdempotency.test.ts`).

### 2.4 Policy hooks

A transition names hooks by key in `policyHooks: [...]`; keys are members of `POLICY_HOOKS` (`src/services/transitions/policyHooks.ts`) and implementations are bound in `src/services/transitions/policies.ts`. A hook receives `{ entityId, currentState, toState, payload, target, scope }` and reads the document through `target.readEntity`, never by importing a store. A named hook with no binding refuses `UNBOUND_HOOK`. Families added since v1: `INTAKE_ONE_GRAIN` (one material × period commits at most once across grains, PLN-2); the RFQ hooks (a named person to publish, cancel, award, advance or conclude, `RFQ_ACTOR_UNATTRIBUTED`; `PUBLISH_DEADLINE_PAST`; `AWARD_FX_UNPINNED`; `SHORTLIST_UNDER_FLOOR`; the questionnaire, criteria and score-sheet checks); four on `t_quotation_submit` (`QUOTE_EVENT_NOT_OPEN`, `QUOTE_DEADLINE_PASSED`, `QUOTE_ALREADY_SUBMITTED`, `QUOTE_VALIDITY_PAST`); and two on payment release (`INVOICE_RELEASER_IS_APPROVER`, `INVOICE_RELEASER_UNNAMED`). The refusal names are taken from PRs #396 and #405–#410; the guides `rfq`, `quotation`, `stageResponse` and `invoice` list each with its meaning. Earlier families: `INTAKE_*` (A2), `PUB_*` (publication: one open draft per grain, firm lines, supplier collaborated, actor attributed), `MODULE_*` (nine, on `t_module_set`, including "a sample person may not switch modules in production").

### 2.5 Cascades and rollups

Some verbs fire other verbs (`src/services/transitions/cascades.ts`): `t_gr_reject` / `t_gr_partial_approve` → `t_asn_discrepancy`; `t_gr_post` → `t_invoice_match`; since OPS-1 also `t_invoice_submit` → `t_invoice_match` and `t_invoice_resolve` → `t_invoice_match` (so an invoice that arrives after its receipt is matched); `t_rfq_create` → `t_pr_source`; `t_rfq_award` → `t_quotation_award` / `t_quotation_reject`; since SRC-1 and RFx-1 `t_rfq_cancel` → `t_quotation_withdraw` and `t_rfq_conclude` → `t_quotation_withdraw`; `t_intake_commit` → `t_pr_create`; `t_requirementresponse_revise` → `t_requirementresponse_supersede`; `t_publication_publish` → `t_publication_supersede`. The fan-out runs under an `automation` grant (`AUTOMATION_ATOMS`) and re-dispatches inside a `catch {}`, so it is the one path where a narrowed grant deletes an act silently. The goods-receipt header verb is derived, not chosen (`grRollup.ts`); a grep for a literal transition id will miss it. Resolve non-literal ids before concluding a verb is dead.

### 2.6 The SAP boundary (Option B)

Two verbs, `t_gr_post` and `t_invoice_release_payment`, land in an interim state and `settle(correlationId)` finalises them (`settleFaults.ts`, `sapBoundary.test.ts`). The real implementation is a SAP settlement webhook (C5, SE-6). No source may construct a governed document number (`PO-`, `GR-`, `INV-`, `CTR-`, `SA-`) outside the mock backend: `src/lib/documentNumberGate/documentNumberGate.test.ts` (C11 V15, PR #392).

---

## 3 · Atoms, lanes, seats and modules

A **permission atom** is the `requiredRole` string on a transition, `<entity>:<verb>` (for example `po:confirm`, `publication:approve`, `module:set`). There is no separate permission table: the transition IS the atom (C10 §3.3, C11 V3). `catalogRoles()` derives the vocabulary from the registry.

A **system role** is a named bundle of atoms (`SYSTEM_ROLES`, `src/services/transitions/businessRoles.ts`), built from `LANE_BUNDLES`. Thirteen at the pin (pinned by `src/handoverFigures.pin.test.ts` since H1): `procurement`, `receiving`, `finance`, `compliance`, `planning`, `requisitioner`, `buyer`, `supplier`, `commercial`, `fulfilment`, `back_office`, `buyer_all`, `admin`. **After the `handover-v2` tag (ADM-1): fourteen.** `super_admin` was added, and `admin` no longer spans the tenancies: both administrator roles hold every buyer-side atom and no supplier-side one. `super_admin` is the one seat the four-eyes checks stand aside for, with a recorded reason (`src/services/identity/superAdmin.ts`; C1, RE-HARVEST ADM-1). `buyer` and `supplier` are zero-atom **tenancy anchors** so a custom role can be as narrow as nothing. `businessRoles.test.ts` pins both directions between the bundles and the derived atoms. Notable placements: `module:set`, `delivery:policy-set` and `role:grant` sit in `compliance` (whoever is measured by a setting may not set it); `publication:approve` (signing firm lines) sits in `procurement`; `delivery:confirm` (accepting an inferred drawdown) is a buyer act in `procurement`. Three atoms are new since v1: `intake:triage` (the planning lane commits, dismisses and restores an intake line; before PLN-3 these carried `pr:create`), `rfq:evaluate` (scoring an RFP proposal; procurement) and `stageresponse:submit` (a supplier's answer at the RFI and RFP stages), all in `LANE_BUNDLES`, `businessRoles.ts`.

A **seat** is what a session holds: `CurrentIdentity = { personaType, supplierId, supplierName, businessRoles, actor }` (`src/context/CurrentIdentityContext.tsx`, `identitySources.ts`). `personaType` is tenancy only; authorisation comes from `businessRoles` resolved by `atomsForSeat`; a seat with no `businessRoles` is refused. The demo seat opens holding every lane on its side and can be narrowed in the identity panel. **Custom roles** are `{ parent, adds }`, additive only, persisted in `localStorage['paragon.customRoles']`, granted through the audited verb `t_role_grant`.

A **module** is a switchable slice of the platform (`src/services/modules/registry.ts`: 16 codes, `PLT` always on, all `Active` by default in `activation.ts`). The ledger of switch acts is append-only and in memory (`moduleActivationStore.ts`; no browser storage, so a reload returns the defaults); what is in force is derived at read (`effectiveActivation`). Every route is wrapped in `<ModuleGate>` (`src/context/ModuleActivationContext.tsx`): an OFF module's pages still render, read-only, and guarded verb slots show a module-off notice before any role notice (`src/services/modules/availability.ts`).

**Cross-role handoff.** When a seat cannot fire a verb but another lane can, the surface renders a notice naming the owning lane instead of a gap (`handoff.ts`, `useVerbAvailability`, `HandoffNotice`). The unit of coverage is (surface × verb × entrance).

---

## 4 · The audit trail (DR-10)

Every dispatch outcome, accepted or refused, emits one `TransitionEvent` (`src/services/transitions/events.ts`): `event`, `actor` (a seat key), `scope`, `correlationId`, `causationId?`, `outcome`, `reason?`, `ts`, and three optional fields: `decision?` (governed-decision provenance), `attribution?` (which person acted, taken from the session and set only on `user`-trigger transitions; `attributionFor` in `dispatcher.ts`, emitted at `:431-432` at the pin), `subject?` (`{ entity, entityId, from, to }`, added at G1). Cascaded commands share a `correlationId` and carry `causationId`; the planning grid's push uses the first dispatch's `correlationId` as the causation anchor for every row. The shipped sink is in-memory; the SE Team's durable sink persists this exact shape (C3, pinned by `c3Events.contract.test.ts`).

---

## 5 · Liveness and honesty instruments

`src/services/liveness/registry.ts` declares 27 **capabilities** (pinned by `src/handoverFigures.pin.test.ts` since H1), each with a `backing` (a wired target key or `null`) and an optional harvest gate. The tier is computed: `LIVE` if the backing is wired, `SIMULATED` otherwise, `SPEC` for a capability with no producer (`somoPlanParameters`, added at B1). A capability renders green only if it is `LIVE` and no harvest is pending: five at the pin (purchase orders, ASNs, goods receipts, invoices, RFQs; pinned by name in the same test). Unwire a target and its capability flips with no edit. `LivenessPill` renders the tier in 17 source files (16 pages and the shared `IllustrativeRegion`).

Honesty guards you will meet:

| Guard | Holds |
|---|---|
| `src/pages-v2/toastHonesty.guard.test.tsx` | a toast branch with no real act must admit it, in EN and ID |
| `src/pages-v2/externalClaimHonesty.guard.test.tsx` (PR #376) | a toast that claims an external effect (file produced, party notified, record stored) needs a real act or copy that admits it did not happen; scans `pages-v2` and `components` |
| `src/pages-v2/deadAffordance.guard.test.tsx` | no enabled, action-labelled control without a handler; the residue list is empty and two tests hold it empty (PR #377) |
| `src/lib/documentNumberGate/documentNumberGate.test.ts` | C11 V15 |
| `src/lib/numberConvention.gate.test.ts` | every rupiah renders through `formatIDR`, identically on every machine |
| `src/readmeNoPersonalNames.guard.test.ts` | no personal names in the README, in code comments or, since H1, under `docs/` |
| `src/handoverIndex.guard.test.ts` (H1) | the handover package is what its index says: every listed file exists, every recorded blob id matches, no file in the three directories is unlisted |
| `src/handoverFigures.pin.test.ts` (H1) | the figures of D1 §1 that C1 does not pin |
| `src/guides/guides.test.ts` | every flow has an EN and ID guide whose transitions, routes and structure match the registry |

---

## 6 · The declared present

Fixtures carry dates. The tree has **one declared present**: `DECLARED_PRESENT` in `src/services/data/fixturePresent.ts`, computed as `BPJPH_MANDATE_DATE` (`2026-10-17`, `complianceProjection.ts`) minus `MANDATE_LEAD_DAYS` (47) = `2026-08-31`, with `SDC_SIMULATED_NOW = 2026-08-31T12:00:00Z` (`src/services/sdc/clock.ts`). Fixture families are shifted onto per-family anchors (`shiftFields`); display states that depend on a date are computed at read (law 0.5, C11 V9/V10) and never stored; the suite pins its clock. `npm run drift` reports how far each family has moved from the wall clock; it is a report, not a gate. Since SRC-2 (#406) the RFQ and quotation fixtures are two more anchored families (`rfq`, `quotation`); before that every seeded open event read about a hundred days overdue. A quotation is judged against the event's response deadline at the declared present, while the day of an award, an advance, a conclude and a response is stamped from the browser clock (PR #407 records the mismatch; it is in `SE_BACKLOG_v2.md`). Since E2E-1 (#417) an exchange rate's age, its staleness refusal and its future-date check read the declared present too. Consequence for the backend: never persist a projected status (`Expiring`, `Overdue`, `Delayed`, a publication line's OVERDUE); persist the date and let the read decide.

---

## 7 · Identity and sample users

There is no sign-in. `src/pages/auth/Login.tsx` picks a persona and seeds a seat; it collects no email and no password (removed at A1 and H3). The edge gate in front of the deployed app (`middleware.js`, `gate/`) is separate and does not know who you are inside the app.

The actor is `UNATTRIBUTED: NO_PERSON_IN_SESSION` unless the user opts into a **sample person**: one of 18 `sim-usr-*` rows in `src/services/identity/sampleRoster.ts` (procurement ×2, receiving, finance, compliance, planning, requisitioner, buyer-all, admin, super-admin, supplier ×8 — 16 at the `handover-v2` tag, the two administrator rows added at ADM-1; the count is pinned by `src/handoverFigures.pin.test.ts`). Picking one makes `actor` `{ kind: 'RESOLVED', person: { personId } }`. `ActingPerson` is `{ personId }` only; labels are resolved at read (C10 D-ID-7). Verbs that need a named decider refuse an unattributed seat: PR approval (`PR_APPROVAL_ATTRIBUTED`), publication signing (`PUB_ACTOR_ATTRIBUTED`), module switching (`MODULE_SET_ATTRIBUTED`), delivery acts (`DELIVERY_ACTOR_ATTRIBUTED`). Added since v1: accepting or disputing a supplier's requirement response (SDC-3 ruling, #402); publishing, cancelling, awarding, advancing and concluding a sourcing event (`RFQ_ACTOR_UNATTRIBUTED`; raising a draft stays open); scoring a proposal (`SCORE_EVALUATOR_UNATTRIBUTED`). Payment release is refused to the named person who approved the invoice, and to an unnamed seat once the approval is named; an invoice approval by an unnamed seat is refused since OPS-2 (#411). Since SUP-1, FIN-1 and E2E-1 (#414, #416, #417) the same holds for supplier-application, certificate, preferred-supplier, material-request, role-grant, stock-record and default-cap decisions, for approving or rejecting a requisition, for publishing, discarding or withdrawing a forecast publication, and for accepting, part-accepting or rejecting a goods receipt; `sup1NamedSeat.test.ts` holds the list both ways, and D6 §2 lists the acts still open. A sample person is marked as sample wherever rendered, may not accept governance risk (C10 §6.3a), and may not switch modules on the production deployment (`MODULE_SET_NOT_SAMPLE_IN_PROD`, `src/services/modules/deployment.ts`).

---

## 8 · Gates and the floor

`npm run gates` (`scripts/gates.mjs`) runs exactly four checks, in order, and asserts each did something:

1. `npm run build` (guides, `tsc`, `vite build`), and asserts a bundle was emitted;
2. `tsc -p tsconfig.vitest.json --noEmit`, the typecheck of the spec files, and asserts the `"exclude": []` override is present;
3. `npx vitest run`, and asserts the collected test and file counts are at least the **floor** in `scripts/floor.json` (8,686 tests across 481 files at the pin; a floor, not an equality);
4. `npm run test:gate`, the edge-gate suite in `gate/` (floor 7 tests).

CI (`.github/workflows/gates.yml`) runs this one command on every pull request whatever its base (`types: [opened, synchronize, reopened, edited]`), on every push to `main`, and daily at 00:17 UTC. `CLEAN` on a PR is not evidence; read the check list by name. The suite no longer depends on the clone directory's name (PR #375). Not re-measured in this refresh: full-suite duration and the two whole-tree scans that timed out under load on 2026-09-25. Two timing notes from the week, both from the PRs and not re-run here: the intake view's first render over the whole population carries an explicit 15 s timeout by ruling (PLN-4, #398), and `personNamingRefusal.test.ts` timed out once at 5,000 ms inside `npm run gates` and passed on every other run (RFx-2 state note).

---

## 9 · The derivation discipline, in plain words

- **Derive populations; never work an inherited list.** The census helpers (`looseEndCensus.ts`, `WIRED_COMMAND_TARGETS`, `ALL_CAPABILITIES`, `catalogRoles()`, `GUIDES`, `MODULE_CODES`) exist for this.
- **A suspiciously small or round result is a bug in the matcher.** Assert a known-true member is present and a known-false one absent before believing any census.
- **Do not restate counts in prose** unless a test re-derives them on every run (C1 is the model).
- **Probe a guard both ways.** Assert a known-good input passes before trusting a known-bad failure.
- **A clean result taken right after a fix is a report about the fix.** Fire a new gate at the defect it was written for.
- **Before an irreversible act** (merge, push, publish, delete), assert the object exists at the site the action names.

---

## 10 · How to add a verb, end to end

1. **The edge.** Add a `TransitionDef` to `src/services/transitions/flows/<entity>.flow.ts`. If the entity is new, add the flow file, register it in `src/services/transitions/index.ts`, and declare `terminals`.
2. **The atom.** Put the atom in the right lane bundle in `businessRoles.ts`; `businessRoles.test.ts` fails until every atom is held by some lane.
3. **The module.** Make sure the verb's entity belongs to a module in `src/services/modules/registry.ts`, so `MODULE_INACTIVE` can reach it.
4. **The target.** If the entity has no `CommandTarget`, add one in `MockCommandService.ts` and register it in `TARGETS` in the same commit.
5. **The hook.** Add a key to `POLICY_HOOKS` and its binding in `policies.ts`; read the document through `target.readEntity`.
6. **The hook for the page.** Add a mutation in `src/services/query/commandHooks.ts` (or the `sdc*Hooks` family) that calls `svc.commands.dispatch(...)` and invalidates the scoped keys.
7. **The surface.** Wire the control; render `HandoffNotice` for seats that cannot fire it; toast only what happened (the two toast gates will check).
8. **The guide.** Add the verb's block to `docs/guides/<entity>.en.md` and `.id.md`, in registry order; `guides.test.ts` fails otherwise.
9. **Locale.** Add EN and ID strings in `src/lib/i18n/`.
10. **Run `npm run gates`.** If C1 goes red, update `docs/contracts/C1-methods.md` and let the pin agree, never the other way round.
