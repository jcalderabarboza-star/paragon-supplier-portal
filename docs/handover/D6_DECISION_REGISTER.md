# Decision register — ratified and open

**Status:** DRAFT for Seat 2 review · refreshed 2026-10-01 · from `main` @ `6f1da15aa41c03e38538562ea8e6c250353538a1` (PR #392).
**Rule:** a decision is RATIFIED only where the tree records it (file and section named), or where an operator ruling is recorded in a document committed with this set (named as such). Anything else is OPEN, with the recommendation shown, and must not be read as settled. Roles only, never personal names.

---

## 1 · The four decisions opened on 2026-09-25

| # | Decision | State at 2026-10-01 | Recommendation / consequence |
|---|---|---|---|
| **OD-1** | Handover scope: must-fix only, with should-fix becoming SE backlog? | **OPEN.** The must-fix bucket it pointed at is mostly done: false toasts (#376), dead controls (#377), run artefacts and suite portability (#375). What remains must-fix is documentation (D8) | Yes; the remaining should-fix rows in D5 go to the SE backlog with their D5 text as the ticket |
| **OD-2** | Halal certificate registry write path: should-fix, not a handover gate? | **OPEN.** Unchanged in the tree. Design 3 §4.4 proposes retiring `compliance` as a machine (its decision D2) | Should-fix, not a gate; take it together with Design 3's D2, inside SE-17 |
| **OD-3** | Bulk upload and templates on every data input | **ASSIGNED to the SE Team as SE-15** by the dispatch of 2026-10-01 (supplier bulk entry, Design 2 §3). The template rule (derive from each verb's `requiredFields`) is Design 2 §3.2 | closed as a scope question; the operator ruling of 2026-09-10 stands as the requirement |
| **OD-4** | e-Faktur and three-way invoice matching | **ASSIGNED to the SE Team as SE-12** by the dispatch of 2026-10-01 | closed as a scope question |

## 2 · Other OPEN decisions found in the tree or the designs

| Id | Decision | Where recorded | Recommendation |
|---|---|---|---|
| D-ID-2 | supplier-side identity provider | `C10-identity.md` §7.1 | SE-3 |
| D-ID-5 | which side reviews a registration | C10 §7.2 | resolve toward the portal; not blocked on D-ID-2 |
| D-1 | material identity: substance vs specification | `C9-material-master-ref.md` §6.1 | escalated to procurement; also input to SE-21 |
| D-COMP-BPOM | BPOM applicability rule content | C9 §6.2 | compliance states the rule |
| C8 §2.2 | `commitmentClass` projection | `C8-forecast-publication.md` §2.2; Amendment 1 says it does **not** ratify it (`:20`) | named owners in procurement and finance ratify; the built period-global default stays flagged (C8-FIND-03) |
| SEGREGATION-CROSSED-IN-ONE-DRAWER-01 | may one seat revise, submit and approve the same requisition | `CLAUDE.md` §76d | rule at the sequence level once an IdP can name a person (SE-3) |
| Publication signing segregation (new) | may the seat that allocates a publication also sign its firm lines and publish it? The default buyer seat holds both lanes | `businessRoles.ts` (`publication:approve` in procurement; draft/allocate/publish in planning) | decide with SEGREGATION-…-01; same mechanism |
| Design decisions awaiting the operator | each design's "Decisions the operator must make" section: Design 1 §12, Design 2 §11, Design 3 §8, Design 4 §7, Design 5 §D, Design 6 §12 | `docs/designs/` | each design lists its recommendation first; whatever is unruled at handover transfers to the SE package that builds it |
| Design 2 D6 (call-off post-back) | does the supplier's acknowledgement post back to the SAP scheduling agreement? | Design 2 §6 | the portal records it either way (SE-19); the post-back is SE-6 |
| D-CAL, D-STAFF, D-SAP, D-DPO, D-SSO/D-SEC | Track R operating questions | `docs/track-r-status.md` | non-blocking for the build; D-DPO and D-SSO feed D9 |
| HALAL-WARNS-IS-NOT-YET-A-SETTING-01 | whether WARN becomes a recordable enforcement mode | `docs/findings.md` §62f | with the compliance team; ships with OD-2 |
| MG-AIRLESS-AXIS-01 | taxonomy axis for airless pump systems | findings | leave open |
| FORK-4 | when the runtime default flips EN → ID | `Paragon_World_Class_Build_Plan_v1.md` §8 | at the first external supplier demo; the Indonesian guides must pass locale review first |
| FORK-5 | buy-list (price index, risk feed, e-Faktur provider, OIDC IdP, WhatsApp BSP, CLM/solver) | Build Plan §8 | SE Team with procurement |
| FORK-6 | backend stack | Build Plan §8 | SE Team's choice (SE-4) |
| FORK-7 | design opens (DP2-PALETTE-01, DP3-CHIP-01) | Build Plan §8 | out of contract scope |
| Repository, deployment and `GATE_*` ownership | who owns them at handover | C12 §6.7 says nothing in the repo answers | transfer explicitly (D9 §7, SE-13) |
| Indonesian guide review | who ratifies the 28 Indonesian guides | `GUIDE_DRAFT_LOCALES = ['id']` | a named locale reviewer before FORK-4 flips |
| SE-21 catalog decisions | see `SE21_PRODUCT_CATALOG.md` §5 | this set | operator and procurement |

## 2b · OPEN decisions carried from the SE Handoff v1 and the RFP Coverage Matrix v2

None is ratified in the repository. Where the tree or a later ruling has overtaken one, that is said.

| Id (source) | Decision | State in the tree | Recommendation |
|---|---|---|---|
| SEH-D1 operational store | relational vs document vs hybrid | none (FORK-6) | SE-4 decides; C12 §1 names what persistence must guarantee |
| SEH-D2 eventing backbone | queue vs streaming | none | SE-4; the audit sink's ordering requirement is the constraint |
| SEH-D3 SAP integration pattern | direct OData vs event-driven cache vs hybrid | outbound settlement only; no inbound seam code | SE-6; ratify the API list as a C5 amendment when chosen |
| SEH-D4 AI inference posture | in-boundary (Jakarta) vs third party | no AI code | decide before SE-20 starts; the guides are the only corpus |
| SEH-D5 CLM / e-signature | build vs buy | `contract` unwired; Design 3 §3.2 makes the contract S/4's | buy-integrate, post-handover |
| SEH-D6 marketplace model | private-first vs public+private | marketplace UI only | private-first |
| SEH-D7 flow-override engine | precedence, versioning, persistence | **specified as Design 6** (Flow Builder: promotion as reviewed code, no runtime override) and SE-11 (runtime versions) | SE-16, SE-11 |
| SEH-D8 two-namespace roles | mapping vs unify | **overtaken**: one namespace (C10 §3.3, C11 V3) | close as "unify" |
| SEH-D9 EN/ID architecture | where the locale layer lives | **overtaken**: `src/lib/i18n/`; guides per locale | close |
| SEH-D10 monolith vs services | — | none | SE-4 |
| SEH-D11 PEPPOL / e-invoicing | direct vs via SAP vs provider | no code | with SE-12 |
| SEH stack | NestJS / PostgreSQL / Redis / RabbitMQ / AWS Jakarta | contradicted by FORK-6 | superseded; AWS `ap-southeast-3` survives as a residency requirement (SE-2) |
| SEH compliance rollout | "before Oct 17, 2026", escalation ladder, PO auto-block | contradicted by the operator ruling (halal is a design policy handled offline) | OD-2 governs |
| SEH audit shape | `AuditSink` entries with `before`/`after` | contradicted by C3 | C3 governs; amend C3 if snapshots are wanted |
| SEH Flow Builder, Module Activation, Learn/Co-pilot | net-new capabilities | **Module Activation built** (#388–#389); **guides built** (#390–#391); Flow Builder is SE-16; co-pilot is SE-20 | closed as scope questions |
| MTX §7.2 published-forecast-version governance | who owns the versioned publication object | **built on our side**: `forecastPublication` machine (#385–#387); plan versions are SOMO's (SIMULATED) | ratify cadence and plan-version semantics with SOMO under C8 (SE-5) |
| MTX §7.3 call-off triple point | which system's object is the call-off; who computes ROP | the operator ruled the call-off is the SAP release (Design 2 standing rulings); the portal's release lines are the collaboration document; ROP is SOMO's | the post-back question remains (Design 2 D6) |
| MTX §7.4 two control towers | alert-class ownership between the portal and Odyssey Ops #3 | chase reducers, no transport | rule per alert class before SE-7 wires notifications |
| MTX §7.5 cross-system identity keys | portal supplier id vs SAP vendor vs TMS vs SOMO | C9 covers materials only | assign an owner; likely a C9 sibling (SE-6 / SE-21) |
| MTX §7.6 predictive ETA | ML vs carrier-declared | `eta` is supplier-declared | confirm with TMS (SE-10) |
| MTX §8 adoption and support | enablement, SLA, migration, DR | none | operator / SE (SE-13) |
| RFP Objective 5 | RFI and auctions | ABSENT | decide whether in scope at all |

## 3 · RATIFIED decisions

| Decision | Where |
|---|---|
| Frontend is the specification; build over buy; backend swaps in behind `IDataService` | `docs/Paragon_Platform_Strategic_Spine_v1.md` §2; `Paragon_World_Class_Build_Plan_v1.md` |
| **The SE Team's 21 work packages and their specifications** (D1 §4) | operator dispatch of 2026-10-01, recorded in D1 §4 of this set |
| Handover to the SE Team on 28 October 2026 (likely earlier); our team builds only what defines the specification | operator ruling 2026-09-28, recorded in each design's "Ownership after the handover ruling" table; date restated in the dispatch of 2026-10-01 |
| AG Grid Enterprise, two developer licences (FORK-G1′), superseding FORK-G1's react-datasheet-grid ruling for the grid's future engine | operator ruling 2026-09-28, recorded in Design 1 §8; **not yet recorded in the tree** (C6 records FORK-G1 as ruled react-datasheet-grid on 2026-07-14) — Seat 2 may add the pointer (D8 §5) |
| Planning bucket is `month` or ISO `week`; quarters refused | C7 Amendment 1, A1-R1; `src/services/planning/bucket.ts:14-17, :71` |
| The override baseline is the producer's `acceptedQty`; `wasAdjusted` is derived at dispatch and never authored | C6 Amendment 1 / 1a (A1-R2, A1-R2a) |
| Plan state never persists in the browser; per-seat view state may | C6 §1, A1-R4 |
| The requisition carries its origin (`intakeLineId`, `periodBucket`, `decision`) | C7 Amendment 1, A1-R3 |
| A publication revision is a new publication; publish supersedes the prior one of the same grain; one open draft per grain | `forecastPublication.flow.ts`; `PUB_ONE_OPEN_DRAFT` (B4b-2 ruling) |
| Carried-forward publication lines keep their answer, and only the carry can set that basis | B4b-2 ruling; `supplierNetChange.test.ts:223` |
| A plain number renders in the seat's convention; one rupiah formatter | B4b-2 ruling; `numberConvention.gate.test.ts`; `formatIDR` (#392) |
| Module activation: 16 modules, `PLT` always on, all `Active` by default; the switch is an attributed, append-only act held by `compliance`; a sample person may not switch on production; OFF makes routes read-only, never 404 | `src/services/modules/registry.ts`, `activation.ts`; `moduleActivation.flow.ts`; Design 5 Part A |
| Halal-notice (GRC) and sourcing gates (SRC) are not switchable parts | `src/services/modules/registry.ts:23-27` |
| Process guides: one EN and one ID per flow, EN authoritative, ID draft until locale review | `src/guides/index.ts`; `guides.test.ts` |
| Roles only, never personal names, in code, comments and documents | `sampleRoster.ts` header; `readmeNoPersonalNames.guard.test.ts` (comments since #392) |
| Hosting and real sign-in are SE scope | operator ruling; `C10` §6.3/§6.3a; now SE-2 and SE-3 |
| Halal is a design policy handled offline; the BPJPH date does not drive sequencing | operator ruling of 2026-09-25 (dispatch); supersedes `CLAUDE.md`'s arc-1 sequencing for this handover |
| Merge doctrine: `gh pr merge --merge`, never squash, never `--delete-branch` | `CLAUDE.md` |
| The test floor is a floor, not an equality (CP-3a) | `CLAUDE.md`; `scripts/floor.json` |
| DR-4 `DataError`; DR-5 `Page<T>`; DR-7 one invoice set; DR-10 one `TransitionEvent` taxonomy | `docs/Supplier_Portal_Revised_Build_Plan_v2_2.md`; C2, C3 |
| FORK-1 = (c); FORK-2 = hybrid | `CLAUDE.md` |
| Law 0.5: no clock-projected state stored; no `clock` trigger | C11 V9, V10; `schema.ts` type guard |
| Declared present computed from the BPJPH date minus 47 days | `src/services/data/fixturePresent.ts` |
| Authorisation is atom-based, no persona fallback | `CLAUDE.md`; `roles.ts:8` |
| `readScopeOwner: () => null` denies every supplier | `CLAUDE.md`; `ownerlessScope.test.ts` |
| Custom roles persist in `localStorage['paragon.customRoles']` | `CLAUDE.md` §66 |
| Solid action-blue buttons retired; outline is the only primary register | `CLAUDE.md`; `Button`'s `Variant` union |
| DP-1, DP-2, DP-3 | `CLAUDE.md` |
| Every non-portal channel is design intent, not integration | `src/data/communicationProfiles.ts` |
| C10 Amendment 1 (2026-09-24) | `C10-identity.md` amendment record |
| Delivery lane: three release verbs and a policy verb; `t_delivery_confirm` is procurement's; `delivery:policy-set` is compliance's | `deliveryRelease.flow.ts`; `businessRoles.ts:236-262` |
| Every enabled control works, says honestly that it cannot, or is gone | #377; `deadAffordance.guard.test.tsx` (residue empty) |
| The demo login collects no email and no password | A1 (operator ruling 2026-09-28), H3; `Login.tsx` |
| The suite does not depend on the clone directory's name | #375 |
| Currency: IDR for financial figures, USD for vendor contracts; English documents | operator ruling (dispatch of 2026-09-25) |
| Snowflake is SPEC and must never read LIVE | `docs/contracts/README.md`, C4 |

## 4 · Decisions the 25 September issue listed as open and that are now settled

| Was | Settled by |
|---|---|
| Dead controls: wire, remove or honest refusal | #377: honest refusal or removal; wiring is backlog |
| Demo login password field | A1 / H3: removed |
| Suite directory-name guard | #375: relaxed |
| OD-3, OD-4 | assigned as SE-15 and SE-12 (§1) |
