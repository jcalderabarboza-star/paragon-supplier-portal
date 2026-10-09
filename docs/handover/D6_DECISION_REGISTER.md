# Decision register — ratified and open

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · written by the consultant seat (Seat 3), read-only, from a `git archive` export of `main` @ `166a5611303121eb509675dbe19ff78edf786899` (the merge commit of PR #418, E2E-2; equal to `git ls-remote origin refs/heads/main` on 2026-10-09). v1 of this file was written against `6f1da15a…` (PR #392) and tagged `handover-v1` at `9cc535b`. PRs #395–#418 have merged since. The final review (the end-to-end walk of 8 and 9 October) is in: D5 §J, D6 §2 and §3a, and `SE_BACKLOG_v2.md` §6a.
**Rule:** a decision is RATIFIED only where the tree records it (file and section named), or where an operator ruling is recorded in a document committed with this set (named as such). A ruling this week that is recorded only in a pull-request description or in Seat 2's state file is listed in §3a with that source named, because neither is in the tree. Anything else is OPEN, with the recommendation shown, and must not be read as settled. Roles only, never personal names.

---

## 1 · The four decisions opened on 2026-09-25

| # | Decision | State at 2026-10-08 | Recommendation / consequence |
|---|---|---|---|
| **OD-1** | Handover scope: must-fix only, with should-fix becoming SE backlog? | **OPEN.** The must-fix bucket it pointed at is mostly done: false toasts (#376), dead controls (#377), run artefacts and suite portability (#375). What remains must-fix is documentation (D8) | Yes; the remaining should-fix rows in D5 go to the SE backlog with their D5 text as the ticket. *v2:* the module review's P2/P3 findings now exist as that backlog, `SE_BACKLOG_v2.md` |
| **OD-2** | Halal certificate registry write path: should-fix, not a handover gate? | **OPEN.** Unchanged in the tree. Design 3 §4.4 proposes retiring `compliance` as a machine (its decision D2) | Should-fix, not a gate; take it together with Design 3's D2, inside SE-17 |
| **OD-3** | Bulk upload and templates on every data input | **ASSIGNED to the SE Team as SE-15** by the dispatch of 2026-10-01 (supplier bulk entry, Design 2 §3). The template rule (derive from each verb's `requiredFields`) is Design 2 §3.2 | closed as a scope question; the operator ruling of 2026-09-10 stands as the requirement |
| **OD-4** | e-Faktur and three-way invoice matching | **ASSIGNED to the SE Team as SE-12** by the dispatch of 2026-10-01. *v2:* the portal-side match on received and already-invoiced value was built at OPS-1 (#410) on sample data; SE-12 keeps the S/4 receipts and invoice lines, and e-Faktur | closed as a scope question |

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
| Indonesian guide review | who ratifies the 30 Indonesian guides | `GUIDE_DRAFT_LOCALES = ['id']` | a named locale reviewer before FORK-4 flips |
| SE-21 catalog decisions | see `SE21_PRODUCT_CATALOG.md` §5 | this set | operator and procurement |
| Unnamed invoice approval (new) — **RULED 2026-10-08** | an invoice approval names a person; an unnamed approval is refused, and an Approved invoice with no named approver is approved again before its payment is released | PR #411; the `invoice` guide | closed; moved to §3a |
| Halal applicability for packaging; BPOM for the raw materials that have no ruling (new) — **RULED 2026-10-08** | halal applies to packaging by default; Compliance rules applicability per material and regime on a ledger; SAMPLE rulings and certificates stand in until real ones exist | PRs #411, #412 | closed; moved to §3a. The real rulings and certificates are Compliance's to enter |
| OPS-3 scope (new) — **BUILT** | "what the supplier typed arrives" was built this week | PR #413 | closed |
| Six seeded receipts that carry no material their order holds (new) | correct them, or leave them for the sample-data replacement | PR #410 | still open: no batch up to #418 changed them (D4 §1) |
| Supplier-side wording (new) — **DONE** | the supplier side says "event" where it means the event; the stage is still the "RFQ stage" and the navigation entry reads "Sourcing events" | PR #413 | closed |
| Scoring visibility (new) | evaluators see each other's averages; blind scoring is not built. Criteria weights are shown to suppliers (a one-line change in `rfqSupplierView.toSupplierCriterion` reverses it) | PR #409 | procurement |
| Shortlist of one (new) | with two responders and one failing a knock-out, the pre-selected shortlist is one supplier, under the competition floor; `SHORTLIST_UNDER_FLOOR` stands and names the remedy | PRs #408, #409 | ruled to stand; listed so nobody re-opens it without the reason |
| Sourcing event clock (new) | the day of an award, an advance, a conclude and a response is stamped from the browser clock while deadlines are judged at the declared present | PR #407 | one clock; the backend's (SE-4) |
| Three delivery-agreement P1 findings (new) — **FIXED** | all three were fixed in OPS-3 | PR #413; D5 §J | closed |
| Requisition approval by a seat that names nobody (new, census 2026-10-09) — **RULED and BUILT 2026-10-09** | a named person approves or rejects a requisition; an unnamed seat is refused and nothing is recorded | PR #417; `pr_decider_named` | closed; moved to §3a |
| Which other acts are "decisions" (new, census 2026-10-09; narrowed 2026-10-09) — **RULED 2026-10-09** | ruled in and built at E2E-1: rejecting a requisition; accepting, part-accepting or rejecting a goods receipt; publishing, discarding or withdrawing a forecast publication. **Still without a named-person check at the pin:** disputing or resolving an invoice; picking up or resolving a disputed supplier answer; the planner's intake commit; holding, re-testing or posting a goods receipt; closing or re-opening bidding; closing an order; the two ship-notice discrepancy acts; cancelling an incoming shipment; taking a quotation into review. Payment release refuses unless the approver is named and is someone else, but does not itself refuse an unnamed releaser by name. Supplier-side acts were not examined | PR #417 ("Left open, for the operator to rule on"); the flows' `policyHooks`; D7 §6 | ruled by the operator on 9 October 2026: the acts still listed here go to the SE list and get no further per-verb check in this build, because real sign-in (SE-3) removes the unnamed seat they would refuse. Not built at the pin |
| Sample persons and rulings (new) | a sample person may make a material ruling and every other named decision; only an enforcement loosening and an override refuse a sample person by name | PRs #411, #414 | stands until sign-in exists (SE-3); then decide whether sample-made rows are kept |
| An invoice created with no lines (new, E2E-2) — **RULED 2026-10-09** | such a create is not examined and is admitted with any amount; the match judges it. Close the door, or keep it for callers that state a total only? | PR #418; operator ruling of 9 October 2026 | ruled: an invoice that states no lines is refused. Not built at the pin, where #418 still admits it; assigned to the batch ADM-1 |
| Who received the goods (new, final review, hand-off 22a) — **RULED 2026-10-09** | a receipt's "Received by" is a dropdown value ("Warehouse Supervisor"); the person in the receiving seat is not recorded on the receipt | E2E report; PR #417 ("Not in this batch"); operator ruling of 9 October 2026 | ruled: a receipt records the named person who received the goods. Not built at the pin; assigned to the batch ADM-1 |
| Invoicing before a receipt is posted (new, E2E-2) — **RULED 2026-10-09** | allowed. Before a receipt is posted, each line's ceiling is the order's confirmed quantity, and the match waits for the receipt. At the pin the supplier's form holds the create until a receipt is posted, and the create verb refuses a line above the accepted quantity | PR #418 ("an invoice can no longer be drafted from the form before a receipt is posted"); operator ruling of 9 October 2026 | ruled; not built at the pin; assigned to the batch ADM-1 |
| Four-eyes and the two administrator roles (new) — **RULED 2026-10-09** | the Super Admin (the Architect role) is exempt from four-eyes, and every act made under the exemption is stamped and carries a reason. The Admin (the operations role) is not exempt. At the pin no role is exempt from any four-eyes check, and the tree holds one administrator role (`admin`) | operator ruling of 9 October 2026; `businessRoles.ts` (`admin`) | ruled; not built at the pin; assigned to the batch ADM-1 |
| A rate dated on the reader's own calendar day (new, E2E-1) | it is refused as a future date while the declared present is 31 August 2026; that is the one-clock ruling applied | PR #417 | stands until the backend owns the clock (SE-4) |

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
| RFP Objective 5 | RFI and auctions | **RFI and RFP built** as stages of one sourcing event (PRs #407–#409); auctions ABSENT | auctions: decide whether in scope at all |

## 3 · RATIFIED decisions

| Decision | Where |
|---|---|
| Frontend is the specification; build over buy; backend swaps in behind `IDataService` | `docs/Paragon_Platform_Strategic_Spine_v1.md` §2; `Paragon_World_Class_Build_Plan_v1.md` |
| **The SE Team's 23 work packages and their specifications** (D1 §4) | operator dispatch of 2026-10-01, recorded in D1 §4 of this set; SE-22 and SE-23 added by the operator ruling of 2026-10-09 |
| Handover to the SE Team on 28 October 2026 (likely earlier); our team builds only what defines the specification | operator ruling 2026-09-28, recorded in each design's "Ownership after the handover ruling" table; date restated in the dispatch of 2026-10-01 |
| AG Grid Enterprise, two developer licences (FORK-G1′), superseding FORK-G1's react-datasheet-grid ruling for the grid's future engine | operator ruling 2026-09-28, recorded in Design 1 §8 and in `docs/contracts/C6-planning.md:16` (FORK-G1′). *Correction of v1:* v1 said the ruling was "not yet recorded in the tree"; C6 already named FORK-G1′ at v1's own pin (`git show 6f1da15:docs/contracts/C6-planning.md` holds it twice) |
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
| Delivery lane: three release verbs and a policy verb; `t_delivery_confirm` is procurement's; `delivery:policy-set` is compliance's | `deliveryRelease.flow.ts`; `businessRoles.ts:270` (`delivery:confirm`), `:350` (`delivery:policy-set`) |
| Every enabled control works, says honestly that it cannot, or is gone | #377; `deadAffordance.guard.test.tsx` (residue empty) |
| The demo login collects no email and no password | A1 (operator ruling 2026-09-28), H3; `Login.tsx` |
| The suite does not depend on the clone directory's name | #375 |
| Currency: IDR for financial figures, USD for vendor contracts; English documents | operator ruling (dispatch of 2026-09-25) |
| Snowflake is SPEC and must never read LIVE | `docs/contracts/README.md`, C4 |

## 3a · Ratified or decided in the week of the module review (2026-10-02 to 2026-10-08)

"In the tree" means a contract or a flow records it. "PR" or "state file" means the ruling is recorded only there; Seat 2 may want to move those into a contract or a guide before the tag.

| Decision | Where recorded |
|---|---|
| The planning lane commits, dismisses and restores an intake line (`intake:triage`); the cascade raises the requisition; approval stays procurement's | in the tree: C7 Amendment 2, A2-R1 |
| One intake population: the queue lists every line the grid commits; Intake Review is a view of the plan grid | in the tree: C7 Amendment 2, A2-R2 |
| One material × period commits at most once across grains; raw materials monthly, packaging weekly | in the tree: C7 Amendment 2, A2-R3 (`INTAKE_ONE_GRAIN`) |
| A requisition is priced as unit price × the committed quantity; the intake line carries its unit price | in the tree: C7 (`unitPrice`, "ADDED BY OPERATOR RULING, 2026-10-02") |
| The cascade writes `category` and `requestorRole`; bulk acts on many requisitions | in the tree: C7 Amendment 3, A3-R1 |
| The intake view's first render over the whole population carries an explicit 15 s test timeout | PR #398 ("by ruling") |
| One current forecast publication per grain; a withdrawal brings nothing back | PR #400; `forecastPublication.flow.ts` |
| Accepting and disputing a supplier's answer are a named person's decisions; an acknowledgment never blocks a commitment; a revision replaces only when sent | PR #402 (operator ruling); the `requirementResponse` guide |
| The supplier never marks arrival at Paragon; receipt records it | state file only (`qaHandover\STATE_2026-10-06.md`, R-SRC) |
| RFI, RFP and RFQ are stages of one sourcing event (design option A) | PR #407; `rfq.flow.ts`; the `rfq` guide |
| Publishing, cancelling and awarding an event need a named person; raising a draft does not; closing bidding is a person's act | PR #405; `policies.ts` (`RFQ_ACTOR_UNATTRIBUTED`) |
| Who has responded to an event is derived, never stored | PR #405; `src/data/rfqResponses.ts` |
| A second quotation from one supplier on one event is refused, not a revision | PR #406 |
| A supplier's read of an event is an allowlist projection | PR #406 (operator ruling); `src/services/data/rfqSupplierView.ts` |
| The advance leaves `Closed` only, goes strictly to the next stage, carries one reason for every supplier left out, and its shortlist meets the competition floor | PR #407; `rfq.flow.ts` |
| A questionnaire and criteria are fixed at publication; a knock-out answer is not a refusal; a score sheet is whole; scoring opens when RFP bidding is closed; `rfq:evaluate` is procurement's | PRs #408, #409; the `rfq` and `stageResponse` guides |
| The buyer side says "sourcing event"; "RFQ" is kept for the stage and the document number | PR #409 (addendum) |
| An invoice is matched against what was received and accepted, less what is already invoiced, with a 1% tolerance; an invoice for less than what is payable matches; a rejected quantity is simply not payable | PR #410; the `invoice` and `invoiceMatch` guides |
| A named person who approved an invoice may not release its payment | PR #410; `policies.ts` (`INVOICE_RELEASER_IS_APPROVER`) |
| An invoice approval names a person; an unnamed approval is approved again by a named person before release | PR #411; `policies.ts` (`INVOICE_APPROVER_UNATTRIBUTED`, `INVOICE_APPROVAL_UNNAMED`); the `invoice` guide |
| Receiving checks the real thing: where halal applies, a valid certificate on file; where it does not, the receipt passes with the ruling shown. Compliance rules applicability on a ledger | PRs #411, #412; `src/services/sdc/materialRuling.ts`; the `materialRuling` guide; `CLAUDE.md` (retraction of "it tells, it does not stop") |
| The receipt blocks are enforced when goods are accepted (approve and part-approve), not at create and not at post; rejecting and holding are never refused | PR #412; `src/services/data/receiptCompliance.ts` |
| One clock for receiving and compliance: the declared present | PR #412; `oneClock.guard.test.ts` |
| Sample persons may rule; SAMPLE BPOM rulings take the strict direction (BPOM applies) | PR #412 |
| Override hold stays a message for now (SE list, P2) | PR #412 |
| Only the confirm verb writes an order confirmation | PR #413 |
| A named person decides: application approve and refuse, certificate request, confirm and refuse, every preferred-supplier decision, material-request accept and decline, role grant, a buyer recording a supplier's stock. Raising, picking up, proposing and the supplier's own acts stay open | PR #414; `sup1NamedSeat.test.ts` holds the list both ways |
| Figures that are not measured say so; none is patched | PR #415 |
| The portal default validity cap needs a named person | PR #416; `psl_cap_setter_named` |
| A named person approves or rejects a requisition, publishes, discards or withdraws a forecast publication, and accepts, part-accepts or rejects a goods receipt. A hold is not a decision and stays open. The receiving form refuses at its entrance, so an unnamed seat records nothing | PR #417; `sup1NamedSeat.test.ts` holds the list both ways |
| An exchange rate's age, its staleness refusal and its future-date check read the declared present | PR #417; `e2e1OneClock` spec |
| The supplier's event card shows only what the buyer set: the buyer's criteria or "none shared", and the event's own requested delivery date or "not stated". An event may state a requested delivery date, after its award deadline | PR #417 |
| Inventory Visibility belongs under Collaborate (Supplier collaboration), not Intelligence | PR #417 (operator request during the batch) |
| SAP owns an order's status. The portal shows what was received as a read from posted receipts and changes neither the order nor the ship notice; Create ASN is withheld on the screen for a fully received order and the verb has no new refusal | PR #418; `src/services/data/orderReceipt.ts` |
| An invoice states lines at the order's prices, each up to the accepted quantity; its amount is the lines' total, at create, at submit and when a dispute is resolved | PR #418; `invoice_lines_within_received`, `invoice_amount_is_lines_total` |
| An award makes the awarded supplier eligible for the material in the forecast split and suggests an allocation; the planner decides (SE-22). Intake lines carry their master code (SE-23) | operator ruling of 2026-10-09, recorded by Seat 2 in D1 §4 at #417 |

## 4 · Decisions the 25 September issue listed as open and that are now settled

| Was | Settled by |
|---|---|
| Dead controls: wire, remove or honest refusal | #377: honest refusal or removal; wiring is backlog |
| Demo login password field | A1 / H3: removed |
| Suite directory-name guard | #375: relaxed |
| OD-3, OD-4 | assigned as SE-15 and SE-12 (§1) |
