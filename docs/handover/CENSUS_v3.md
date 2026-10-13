# State-machine census, v3

**Seat 3, Ops Project #11 · 2026-10-13.** For Seat 2 to fold into D7. Read-only: nothing in the repository was changed.

**Pin.** `main` @ `aac5f8588d55e851d0d530e3454ee1f4b649137c` (the merge commit of PR #439, MD-4 + MD-5; equal to `git ls-remote origin refs/heads/main`; `git cat-file -e` accepts it and rejects a SHA one digit away). It includes FB-3 + FB-4 (#438) and the master-data batches (#434, #436, #437, #439).

**How it was derived.** Two scripts run with `vite-node` inside a clean checkout of the pin, importing the shipped modules (`getKnownFlows()`, `WIRED_COMMAND_TARGETS`, `SYSTEM_ROLES`, `CASCADES`, the policy-hook registry, the module and liveness registries). The scripts were deleted after the run and the checkout is clean. No figure below was counted by hand or by `grep`.

**Controls, same run.** `t_gr_post` found; `t_mdr_approve` found; `t_bogus_x` absent; atom `bogus:atom` held by no role; the decision matcher finds `t_mdr_approve` with its person and separation hooks and does not match `t_gr_create`.

**Do not copy a number from this file into a contract without its derivation.** C1 is pinned to the tree by `c1MethodSurface.contract.test.ts`; where this file and C1 disagree, C1's test is the authority.

---

## 1 · Figures

| What | Count | Derivation |
|---|---|---|
| Flows (state machines) | **33** | `getKnownFlows().length` |
| States, summed over flows | **133** | Σ `flow.states.length` |
| Distinct state names | 76 | the set of state names across flows |
| Transitions (verbs) | **163** | Σ `flow.transitions.length` |
| by trigger | user 105 · creation 25 · system 24 · cascade 9 | `transition.trigger` |
| state-preserving | 24 | `statePreserving` |
| SAP-boundary | 2: `t_gr_post`, `t_invoice_release_payment` | `sapBoundary` |
| declared not surfaced | 37 | `surfaceable.surfaced === false` |
| Wired command targets | **27** | `WIRED_COMMAND_TARGETS` |
| Flows with no command target | 6: `goodsReceiptLine`, `invoiceMatch`, `shipment`, `contract`, `obligation`, `compliance` | flows ∖ wired |
| Policy hooks registered / used by a transition | 172 / 172 | the hook registry against Σ `policyHooks`; none registered and unused |
| Cascade sources / links | 14 / 15 | `CASCADES` |
| Atoms named as a required role | 103 | the set of `requiredRole` |
| held by no lane (automation or unsurfaced only) | 15 | `rolesHolding(atom)` is empty; listed in §4 |
| Business roles | 14 | `SYSTEM_ROLES` |
| Sample people | 18 | `SAMPLE_PEOPLE` |
| Modules | 16 | `getModules()` |
| Liveness capabilities | 28; 5 render live (purchase orders, ASNs, goods receipts, invoices, RFQs) | `ALL_CAPABILITIES` × `isLive` |
| Test floor at the pin | 9,464 tests in 517 files; gate suite 7 | `scripts/floor.json` |

**Moved since the v2 census** (30 flows, 24 wired targets at `0531e094…`): three flows added, all wired — `flowVersion` (FB-1, now 6 states and 11 verbs after FB-3 + FB-4), `processStep` (FB-4), `masterDataRequest` (MD-4 + MD-5).

### 1.1 The flows

| Flow | States | Verbs | Target | Module | Endings |
|---|---|---|---|---|---|
| `purchaseOrder` | 7 | 7 | wired | ORD | Closed |
| `advanceShipNotice` | 5 | 6 | wired | SHP | none declared |
| `goodsReceipt` | 8 | 9 | wired | GRC | Rejected, Posted to SAP |
| `goodsReceiptLine` | 6 | 6 | none | GRC | Accepted, Rejected, Returned |
| `invoice` | 8 | 9 | wired | INV | Remittance Received |
| `invoiceMatch` | 5 | 4 | none | INV | Matched |
| `rfq` | 6 | 12 | wired | SRC | Awarded, Concluded, Cancelled |
| `quotation` | 5 | 5 | wired | SRC | Awarded, Rejected, Withdrawn |
| `stageResponse` | 2 | 4 | wired | SRC | Submitted |
| `shipment` | 8 | 8 | none | SHP | Delivered |
| `contract` | 4 | 4 | none | CTR | Terminated |
| `obligation` | 2 | 2 | none | CTR | Completed |
| `purchaseRequisition` | 6 | 7 | wired | REQ | PO Created |
| `supplierDocument` | 4 | 5 | wired | CMP | Valid |
| `compliance` | 3 | 3 | none | CMP | Valid |
| `requirementResponse` | 6 | 9 | wired | SDC | Superseded |
| `inventoryDeclaration` | 1 | 2 | wired | SDC | Declared |
| `incomingShipment` | 4 | 4 | wired | SDC | Arrived, Cancelled |
| `enforcement` | 1 | 1 | wired | GRC | Governed |
| `role` | 1 | 1 | wired | PLT | Defined |
| `supplierApplication` | 4 | 4 | wired | SUP | Approved, Rejected |
| `materialRequest` | 4 | 4 | wired | MAT | Approved, Rejected |
| `psl` | 4 | 8 | wired | PSL | Withdrawn, Rejected |
| `pslCapSetting` | 1 | 1 | wired | PSL | Governed |
| `deliveryRelease` | 2 | 3 | wired | CTR | Released |
| `deliveryPolicy` | 1 | 1 | wired | CTR | Governed |
| `intakeLine` | 3 | 3 | wired | PLN | Committed |
| `forecastPublication` | 5 | 7 | wired | SDC | Superseded, Withdrawn, Discarded |
| `moduleActivation` | 1 | 1 | wired | PLT | Governed |
| `materialRuling` | 1 | 1 | wired | CMP | Governed |
| `flowVersion` | 6 | 11 | wired | PLT | Rejected |
| `masterDataRequest` | 8 | 9 | wired | MAT | Completed in SAP, Declined by SAP, Rejected, Withdrawn |
| `processStep` | 1 | 2 | wired | PLT | Recorded |

---

## 2 · Stranding states

A state strands a document when the machine gives it no way to an ending. Three readings, strictest first. Each is a property of the **flow definitions**; none was walked in a browser.

### 2.1 Dead ends: a non-ending state with no verb out of it (2)

| State | Note |
|---|---|
| `invoiceMatch.Qty Mismatch` | the flow has no command target; the match verdict is rolled up into the invoice |
| `invoiceMatch.Price Variance` | the same |

### 2.2 No ending reachable: a way out exists, but no path reaches a declared ending (2)

| State | Note |
|---|---|
| `flowVersion.Active` | the flow's only declared ending is `Rejected`. An active version can be retired or superseded, and a retired one restored, but none of those states is declared an ending |
| `flowVersion.Retired` | the same |

This is a finding about what `flowVersion` **declares** as an ending, for the FB owner: either `Retired` (or a superseded state) is an ending and should be declared, or a version is meant to have none. `advanceShipNotice` declares no ending at all and is listed apart for that reason (its five states are not counted here).

### 2.3 No exit a person or a cascade can fire today (25)

A non-ending state whose every way out is one of: a verb on a flow with no command target; a `system` verb (an external fact, or SAP's answer); a verb declared not surfaced. The document waits on something outside the portal, or on work the SE Team has.

| Flow | States | Why |
|---|---|---|
| `purchaseOrder` | Confirmed, Partially Delivered, Delivered | exits are `system` verbs, not surfaced (delivery and close are facts from receiving and SAP) |
| `goodsReceipt` | Approved, Partially Approved | exit is `t_gr_post`, the SAP boundary |
| `invoice` | Payment Released | exit is `t_invoice_remit`, the bank's fact |
| `purchaseRequisition` | Sourcing Event | exit is `t_pr_convert`, a cascade verb with no cascade link |
| `goodsReceiptLine` | Pending, Inspected, Quarantined | no command target (rolled up into the receipt) |
| `invoiceMatch` | Pending, Pending GR | no command target; `system` verbs |
| `shipment` | Pending ASN, ASN Received, In Transit, Arrived at Port, Customs Clearance, At Dock, Unloading | no command target; carrier facts |
| `contract` | Draft, Active, Renewed | no command target |
| `obligation` | In Progress | no command target |
| `compliance` | Missing, Under Review | no command target (read-complete, write-inert) |

**Nothing in the three new flows is here.** Every non-ending state of `masterDataRequest` has a surfaced, user-fired exit. Its two SAP-answer verbs are `user` verbs in the fixture (a sample answer on a demo deployment); on production they are refused, so `Sent to SAP` waits there for the feed (SE-6). The derivation above does not see that, because the refusal is a policy, not the trigger.

**Compared with the figure CLAUDE.md carries** ("37 non-terminal states no surface can leave, across 12 of 18 flows", from an earlier tree with 18 flows): this census gives **29** by its three readings (2 + 2 + 25) across 11 flows of 33. The two are different instruments: the older one folded in surface reachability, this one reads the flow definitions only. Do not subtract one from the other.

---

## 3 · Decision verbs and their guards

**Decision verb**, as used here: a `user`-triggered verb on a wired flow whose id ends in one of approve, approve_firm, reject, decline, decide, award, grant, verify, accept, release, release_payment, publish, activate, restore, retire, rollback, conclude, cancel, withdraw, hand_off, override, set, complete, sap_complete, sap_decline. **51** verbs match.

A guard is read **by hook name**: a person hook ends `_named` or `_attributed`; a separation hook ends `not_requester`, `not_proposer` or `not_approver`. A check made inside a broader hook is invisible to this reading; the known cases are marked.

### 3.1 No policy hook at all (2)

| Verb | Atom | Note |
|---|---|---|
| `t_incomingshipment_cancel` | `incomingshipment:cancel` | the role gate and the scope check are the only checks |
| `t_intake_restore` | `intake:triage` | the role gate is the only check |

### 3.2 No hook that requires a named person (7, the two above included)

| Verb | Atom | Other hooks | Note |
|---|---|---|---|
| `t_invoice_release_payment` | `invoice:pay` | `invoice_releaser_not_approver` | the separation hook compares persons; there is no separate named-person hook on this verb |
| `t_rfq_questionnaire_set` | `rfq:create` | two content hooks | sets up an event; not a decision on a document somebody else raised |
| `t_rfq_criteria_set` | `rfq:create` | three content hooks | the same |
| `t_incomingshipment_cancel` | `incomingshipment:cancel` | none | as §3.1 |
| `t_enforcement_set` | `enforcement:set` | `enforcement_set_governed` | **declared not surfaced.** By the project rules its governed hook refuses an unattributed and a sample actor for a loosening; not re-verified here |
| `t_intake_restore` | `intake:triage` | none | as §3.1 |
| `t_material_ruling_set` | `material:rule` | `material_ruling_governed` | **named inside the hook** (`RULING_ACTOR_UNATTRIBUTED`), so guarded in fact; unguarded only by this name-based reading |

The verbs to look at are the first and the two in §3.1. The others are a set-up act, an unsurfaced verb, or a false positive of the name-based reading.

### 3.3 Separation of persons (four eyes)

**Eight verbs carry a separation hook**, from five hooks:

| Hook | Verbs |
|---|---|
| `invoice_releaser_not_approver` | `t_invoice_release_payment` |
| `materialrequest_decider_not_requester` | `t_materialrequest_approve`, `t_materialrequest_reject` |
| `psl_decider_not_proposer` | `t_psl_grant`, `t_psl_reject` |
| `flowversion_approver_not_proposer` | `t_flowversion_approve` |
| `mdr_approver_not_proposer` | `t_mdr_approve`, `t_mdr_reject` |

**Fifteen approve / reject / grant / award / verify / activate verbs carry a named-person hook and no separation hook.** Each names who decided; none checks that the decider is a different person from whoever raised the document.

| Verb | Person hook |
|---|---|
| `t_gr_approve`, `t_gr_partial_approve`, `t_gr_reject` | `gr_disposer_named` |
| `t_invoice_approve` | `invoice_approver_named` |
| `t_rfq_award` | `rfq_actor_attributed` |
| `t_pr_approve` | `pr_decider_named`, `pr_approval_attributed` |
| `t_pr_reject` | `pr_decider_named` |
| `t_supplierdoc_verify`, `t_supplierdoc_reject` | `supplierdoc_actor_named` |
| `t_role_grant` | `role_granter_named` |
| `t_application_approve`, `t_application_reject` | `application_decider_named` |
| `t_publication_approve_firm` | `pub_actor_attributed` |
| `t_flowversion_reject`, `t_flowversion_activate` | `flowversion_decider_named` |

Whether each of these **should** have a separation check is a ruling, not a defect by itself: several are separated by lane (the atom that raises and the atom that decides sit in different lanes), and the open finding `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` is about the requisition pair specifically. This table is the population that ruling would be made over.

### 3.4 Decision-shaped verbs on flows with no command target (4)

`t_grline_accept`, `t_grline_reject`, `t_grline_release`, `t_obligation_complete`. They cannot be dispatched, so no guard on them can fire.

---

## 4 · Atoms held by no lane (15)

No business role holds these, so no person can take the verb; the automation grant or a cascade does, or the verb is not surfaced.

`po:issue`, `po:fulfil`, `po:close`, `asn:carry`, `invoice:match`, `quotation:award`, `quotation:reject`, `quotation:withdraw`, `shipment:create`, `shipment:advance`, `pr:source`, `pr:convert`, `requirementresponse:supersede`, `publication:supersede`, `flow:supersede`.

---

## 5 · What this census does not say

- **It reads definitions, not screens.** "Surfaced" is each transition's own declaration; whether a screen really offers the verb is the dead-affordance and handoff gates' subject, not this file's.
- **Guards are read by hook name.** A hook that checks a person inside a broader rule is not seen (§3.2 marks two). A hook whose name matches and whose body does less is not caught either.
- **The decision-verb list is a word list.** A decision named with another word is not in it, and a non-decision ending in one of the words is (the two `rfq_…_set` verbs are examples).
- **Policies that refuse by deployment** (the sample SAP answer, the sample sync) are not visible in a trigger.
