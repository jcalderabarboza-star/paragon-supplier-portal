# Contract Package v1

**Status:** SE-Team Stage-1 kickoff artifact · generated from code-truth at `main` (Phase 2′
stamped contract-complete, F0.4/#58) · additive, docs-only.
**Re-issued 2026-10-02 at H1, against `main` @ `5826c9f` (PR #393).** Re-verified in this pass:
**C1** (its three axes are pinned to the tree by `c1MethodSurface.contract.test.ts`, and the table
below is held to C1 by `src/handoverFigures.pin.test.ts`), **C5** (the LivenessRegistry and OIDC
rows, corrected and quoted in place), **C7** (C7-FIND-02's heading), **C10** (its header and
§8.4/§8.5, by dated errata) and **C12** (the C3 row). **C2, C3, C4, C6, C8, C9 and C11 were not
re-verified in this pass** beyond the pins they already carry. The previous header read:
*"Partially corrected 2026-08-03 at `main` #157 (`063adca`) — C7 re-harvested, C8 issued, the
wired-target count fixed (6 → 10). … C1–C5 have NOT been re-verified in this pass and should be
assumed to carry the same class of drift."* The cause it named still holds: **these documents
drift in one direction — toward understating the implementation** — which is why the figures
below are pinned rather than restated (see the correction record at the top of
[C7](./C7-pr-intake.md)). The handover package that reads this index is `docs/handover/`
(`D7_CONTRACTS_INDEX.md` is its contract-by-contract status).

This package is the **contract the real backend implements**. Every count, shape, and seam
below is harvested from the shipped code, not narrated from memory. The portal today runs
entirely on in-memory fixtures behind `mockDataService`; this package names exactly which
surfaces are BUILT, which are RESERVED swap-points, and which are SE-Team build targets with
zero code yet — so the backend work is additive against a frozen contract, never a refactor.

## Components

| File | Scope |
|---|---|
| [C1 — Method surface](./C1-methods.md) | The `IDataService` service contract, the transition catalog, the command spine (dispatcher + `CommandTarget`) |
| [C2 — Schemas + DTO-v2](./C2-schemas.md) | Entity type shapes, `Page<T>` envelope (DR-5), `DataError` (DR-4), the read-projection boundary (G1) |
| [C3 — Events](./C3-events.md) | The single `TransitionEvent` taxonomy (DR-10), correlation/causation grouping |
| [C4 — Snowflake](./C4-snowflake.md) | The clean-data-layer seam — **SPEC / target architecture, zero code today** |
| [C5 — Seams](./C5-seams.md) | `IDataService` / `getCapabilities` (DNA-SEED-01) / SAP boundary (Option B) / INT-TMS-01 / LivenessRegistry |
| [C6 — Planning](./C6-planning.md) | PLANNED-as-axis doctrine (Stage G): PlanDraft shape · overlay rule · push pipeline · causation-grouped audit · source-tier × plan-state honesty matrix |
| [C7 — PR intake](./C7-pr-intake.md) | The shared PR-intake seam for two producers (internal Grid + external SOMO/IBP via F2 Event Mesh): `PrIntakeLine` → `t_pr_create` · source×liveness provenance (reuses C6) · RM/PM-leaf scope · grain-gap register. **Corrected 2026-08-03** |
| [C9 — `material_master_ref`](./C9-material-master-ref.md) | The **material-identity crosswalk** between Paragon's master and SOMO's codes: identity keys on **SPECIFICATION** (S/4 MATNR semantics) on an **irreversibility** argument · every row carries a **`grain` tag** (`substance`/`specification`) + confidence + adjudication provenance · **`materialCode` OPAQUE, permanently** · **adoption ≠ discovery**, enforced structurally · **absence is UNKNOWN**, so an empty map is an honest one. **SCHEMA + TYPES ONLY — zero rows, zero consumers.** Awaiting SOMO ratification (R-1…R-6). **First issue 2026-08-03 · current issue: FIFTH — AMENDMENT 3, 2026-08-06** (A-15…A-21; **docs only, no schema change**, so the types module and the derived field list are byte-identical to the fourth issue — **but a new SHA and a new ratification regardless**, per A-13). |
| [C10 — Identity, authority and approval](./C10-identity.md) | The **identity contract** for a platform that **contains no persons**: `PersonaType` demoted to **tenancy only** · `Person` × IdP **subject binding** (not a credential store) · `BusinessRole` as **data, not schema** · **`TransitionRole` IS the permission atom** (no parallel `Permission` table — the `FLOOR-IN-PROSE-01` shape) · four append-only ledgers (approval policy · approval · delegation · assignment), in-force **derived** · **approval is a LEDGER + a POLICY over the EXISTING machine, never a new machine** (states-per-approver makes escalation a clock-fired transition — a `tsc` error here) · escalation is a **read-time projection**. Five PROVISIONAL rulings (**D-ID-1** portal-minted permanent `personId` — the one irreversible decision · **D-ID-3** no typed-name attribution · **D-ID-4** recorded acts stand, requirement re-derives, each act keeps its policy basis · **D-ID-6** opening role vocabulary · **D-ID-7** UU PDP, the stamp carries `personId` ONLY — **overrides Seat 3 and contradicts shipped code**). **MODEL + PRECONDITIONS ONLY — ZERO CODE, ZERO TYPES, ZERO FIXTURE PERSONS.** **First issue 2026-08-10** |
| [C8 — Forecast publication](./C8-forecast-publication.md) | The forecast-publication sibling to C7 (Supplier Data Collaboration lane): SOMO emits material×period totals, **the portal owns the supplier fan-out** · `commitmentClass` projected by us (**mapping UNRATIFIED**) · bucket-native grain · supplier-response feedback → Snowflake commons. **First issue 2026-08-03**; supersedes the unratified proposal |
| [C11 — Invariant pointer](./C11-invariants.md) | The properties every implementation must hold, each naming the instrument that fails the build when it stops being true. **Pinned bilaterally**: a retired enforcer reddens the document, and an invariant with no enforcer must say so in its own row. Read it with C5 — it says which invariants a conformance factory carries across the seam and which are enforced HERE and merely asserted THERE. |
| [C12 — Backend spec](./C12-backend-spec.md) | **A map of what is ABSENT.** The five seams in three columns — what the tree specifies, what it assumes, and what nothing answers — plus what an SE team must never build, the invariants they inherit as work, the idempotency contract including its ordering, and the seam-code gap. **Partly pinned**: the never-originate table, the seam-code table and the inherited-invariant list are all derived, and every artefact it names is asserted to exist. The rest is prose and says so. |

---

## Honesty legend (three-tier — applied rigorously)

Every seam and surface in this package carries exactly one tier. **Do not read a lower tier as
a higher one.** Partial truths are stated as partial, never rounded up to LIVE.

| Tier | Meaning |
|---|---|
| **LIVE** | Code exists and runs — mock / in-memory implementation shipped. |
| **RESERVED** | Named seam with a defined swap-point (interface / prop / context) but no implementation. Landing it is additive: the contract does not change. |
| **SPEC** | SE-Team build target. **Zero code today.** Appears in this package only as a pointer to what gets built. |

**PARTIAL truths — carried explicitly, NOT rounded to LIVE:**

- **DNA-SEED-01** — `getCapabilities(scope)` is **LIVE** (mock-backed via `capabilitiesFor` =
  persona-role map × flow catalog). The **`guidance?` prop slot is NOT built** — the inline
  state / deferred-action primitives it belongs on have not landed. The seed is therefore
  **half-present**: capability surface LIVE, guidance slot RESERVED.
- **`Page<T>`** — the **envelope shape is frozen** (`items` / `cursor?` / `total?`), every list
  read returns it. **Pagination machinery is deferred**: the mock returns everything in `items`
  and leaves `cursor` null. Shape LIVE, pagination RESERVED.

**C4 Snowflake is SPEC.** It is the target architecture the SE-Team realizes — the clean-data
moat named in the benchmarking report. It **does not exist in code** (grep-confirmed: zero
matches). It must never read as an existing seam.

---

## The three counts (distinct axes — never collapsed)

These are **three different measurements** of the command/data layer. They are not the same
number seen three ways.

| Count | Axis | What it measures | Where |
|---|---|---|---|
| **71** | C1 Axis 1 | The `IDataService` **service surface** — every method of the composed service contract, per sub-service. | `src/services/data/types.ts`; C1 Axis 1 |
| **138** | C1 Axis 2 | The **transition catalog** — every authored state-machine edge across the registered flows (`getKnownFlows()`). This is the *verb* surface, distinct from the service surface. | `src/services/transitions/flows/*.ts`; C1 Axis 2 |
| **23** | C1 Axis 3 | The **wired CommandTargets** — entities with a live per-entity adapter the dispatcher writes through. The list is `WIRED_COMMAND_TARGETS`, not a sentence. | `src/services/data/mock/MockCommandService.ts`; C1 Axis 3 |

**The three numbers are C1's, at `5826c9f`, and they are pinned twice:** C1 to the tree by
`src/services/contracts/__tests__/c1MethodSurface.contract.test.ts`, and this table to C1 by
`src/handoverFigures.pin.test.ts`. They are different measurements and are never collapsed: the
first is the read/write API a page calls, the second is how many transitions exist in the schema,
the third is how many entities are behavior-wired.

> **⚠️ CORRECTED 2026-10-02 (H1, D8 §1.1–1.4) — this table read `55` / `72` across 14 flows / `10`,
> followed by the line "55 ≠ 72 ≠ 10."** All three were true at I3.1 and stale since; the tree
> had moved to 71 / 127 across 28 flows / 22. Corrected to C1's figures and pinned rather than
> rewritten as three newer numbers in prose.

> **⚠️ CORRECTED 2026-08-03 (C7 D-10) — the wired count read `6`, and its prose was wrong twice.**
> The census has moved **6 → 7** (G1.1 PR intake) **→ 8** (SDC-2a RequirementResponse) **→ 10**
> (SDC-3a InventoryDeclaration + IncomingShipment); the code tracks the evolution itself at
> `MockCommandService.ts:989-991`. The prior prose additionally listed **`purchaseRequisition`
> among "the 6 inert machines"** — it is wired (`:983`) and has been since G1.1. Both the number
> and the classification were stale in the same direction: understating the implementation.
> See the C7 correction record for the systematic cause.

Still NOT behavior-wired, at `5826c9f`: the 2 rolled-up sub-flows (`goodsReceiptLine`,
`invoiceMatch`) and the inert machines `compliance`, `contract`, `obligation`, `shipment`. The set
is `getKnownFlows()` ∖ `WIRED_COMMAND_TARGETS` — derive it; C1's "Wiring census" is the pinned
statement. *(Corrected 2026-10-02, D8 §1.5: this line listed `supplierDocument` among the inert
machines; it was wired in August.)*

> **I3.1 delta (historical).** At I3.1 the service surface moved 54 → 55
> (`risk.getComplianceRegistry`) and the transition catalog 69 → 72 across 13 → 14 flows
> (`compliance.flow.ts`); the compliance machine was, and is, inert (SIMULATED via the
> LivenessRegistry until the Track-R harvest). *(Corrected 2026-10-02, D8 §1.4: this note closed
> with "wired targets unchanged at **6**", which read as a current figure.)*

---

## Open findings carried forward

These are OPEN at generation time (verified against `docs/findings.md`). The contract must not
imply they are closed.

| Finding | State |
|---|---|
| **F0.2-FIND-01** | Action-layer honest-render gap: "Review match" renders as an active primary affordance at `matchStatus = 'Pending GR'` but can only inform. Minor; fix-pack candidate. |
| **F0.3-FIND-01** | `t_quotation_submit` / `t_quotation_review` authored-unwired — blocked on a quote-scoring primitive (the score axes the canonical `Quotation` requires). Do not fabricate scores. |
| **SUPPLIER-SOURCING-01** | Read half **CLOSED** (`SupplierRFQs` — invited-membership + supplier-scoped quotations + award-history re-derive). Write half **OPEN** — gated behind F0.3-FIND-01. |
| **F0.4-FIND-01** | Fixtures store clock-projected status as literals (`Expiring`/`Expired`/`Upcoming`/`Overdue`/`Expiring Soon`/`Renewed`) — violates law 0.5 (computed-never-stored). Home: read / DTO-v2 layer. |
| **Compliance (I3.1 + I3.2)** | The ONE canonical compliance machine (census #11–15) is **authored** (`compliance.flow.ts`, 14th flow, inert/SIMULATED) with the `ComplianceRegistryEntry` DTO-v2 read + `complianceProjection.ts`; **I3.2 re-pointed `BuyerCompliance` + widget onto it** (`useComplianceRegistry`, SIMULATED via `<LivenessPill>`). **CLOSED:** `HALAL-CLOCK-STATE-01`, `HALAL-UNDERREVIEW-01`, `HALAL-XPERSONA-01` (reconciliation), `F0.4-FIND-01` (cert literals) — all fixture-first mechanism; **`COMPLIANCE-CARVEOUT-01`** (page now on the seam). **Still OPEN:** `HALAL-ISSUER-BLIND-01` (downgraded — scheme-aware KPI renders, needs REAL issuer data), `HALAL-REMIND-01` (real channel), the `BuyerRisk` compliance re-point (rides the F0.6 risk-page sweep). Whole surface stays **SIMULATED-until-harvest**. |
| **DNA-SEED-01** | **PARTIAL** — `getCapabilities` LIVE; `guidance?` prop slot unbuilt (see legend). |
| **E2E-SUITE-01** | No committed Playwright suite. The two crown invariants (no cross-supplier leak · four honest states) are backstopped **in-floor by vitest** (`scoping.mock.test.ts` + `withChaos` suites). |
| **G0.1-FIND-01** | One-`causationId`-per-plan-push is INTENT, not a present capability: the public `ICommandService.dispatch(scope, input)` seam (`types.ts:1080`) accepts no caller-supplied correlation, so N push-dispatches cannot be grouped today. Seam extension (caller-supplied correlation OR model-push-as-cascade-source) is a **G1/G2 dependency** (C6 §4). Do not read the grouping as existing. |
| **C7-FIND-01 / -01a** | **BOTH CLOSED (corrected 2026-08-03).** `purchaseRequisition` **is** a wired `CommandTarget` (`MockCommandService.ts:547-593, :983`) and `t_pr_create` dispatches. **-01a closed DIFFERENTLY than prescribed**: the capability is backed **structurally** to the wired entity (`registry.ts:78`) with gate-2 harvest gating holding it SIMULATED — not the `null` backing this package specified. The shipped resolution is stronger (unwire-to-honest is structural). See C7 §3. |
| **C7-FIND-02** | **CLOSED AT A2** (C7's register). The cascade writes `intakeLineId` / `periodBucket` / `decision` onto the requisition and `BuyerRequisitions`' drawer renders them; `wasAdjusted` is derived at dispatch (A1-R2a). *(Corrected 2026-10-02, D8 §1.7: this row read "DEFECT, OPEN — `suggestedQty` + `wasAdjusted` are documented as stored but `create` reads neither …"; C7's own register had closed it at A2.)* |
| **C7-FIND-03** | **DEFECT, OPEN** — `shortfall` was promised RESERVED so the shape would not change; it was never added to `PrIntakeLine` (`types.ts:636-653`). Landing it IS a shape change (C7 §2.2). |
| **C7-FIND-05** | **CLOSED AT A2** (C7's register) — the cascade `t_intake_commit` → `t_pr_create` carries `idempotencyKey` = the intake line id, so a redelivery is answered with the first result. *(Corrected 2026-10-02, D8 §1.7: this row read "OPEN — no idempotency contract at the intake; F2 Event Mesh is at-least-once, so a redelivered SOMO event mints a duplicate PR".)* |
| **C8-FIND-03** | **OPEN** — the VOID `locked → firm` `commitmentClass` mapping remains in code (`sdc/types.ts:23`) until its booked code batch; the C8 contract is authority in the interim (C8 §2.1). |
| **C7-MATERIAL-JOIN** | **OPEN** — C7 (display string) and C8 (code) material spaces do not join. Recommendation: collapse, do not crosswalk. ⚠️ **CORRECTED 2026-08-06 — THIS ROW'S STATED REASON NO LONGER EXISTS.** It read: *not built, because `inferBpom` derives BPOM applicability from the code prefix (`GRInspectionWizard.tsx:129-163`), so a format change moves compliance behaviour.* **`inferBpom` is deleted**; applicability is a master field and an unresolvable code is **refused** at goods receipt, so a format change no longer moves compliance behaviour **silently** — which is the property that made it a hazard. **The row stays OPEN on its remaining reasons** (it rewrites identity across two spaces and interacts with `MOCK-RETIREMENT-01`), and the linkage is now **master-membership**, not prefix. `C9-STALE-BY-FIX-01` (C9 §7.13). |
| **C9 §7 (7.1–7.13)** | **THIRTEEN non-conformances declared BY the contract about itself — TWELVE OPEN, ONE DISCHARGED (7.3, Amendment 3).** *(Corrected CP-3b: this row read `7.1–7.8` / "eight" for two amendments while §7 carried twelve — the four rows added by A-3/A-4/A-9/A-13 never reached the index. **`SUMMARY-LOSS-IS-DIRECTIONAL-01` reproducing itself one layer in, inside the artifact:** the summary kept every row understating our implementation and lost the ones where we had **overstated a defect in SOMO's.** A summary that silently drops items reads as complete. Now on the floor — `src/services/contracts/__tests__/ledgerTruth.test.ts`.)* ✅ **AND IT HELD, at the first opportunity it had: Amendment 3's new §7.13 turned that pin RED because this row still said `7.1–7.12`.** The range and the row-id list are **DERIVED from C9 §7**, not hand-listed, so a ledger row that never reaches the index fails the floor. **`SUMMARY-LOSS-IS-DIRECTIONAL-01` COULD NOT RECUR — the class is closed by MECHANISM, not by vigilance, which is the only durable kind of closure.** Nobody had to remember; the build refused.* C9 states a shape we do not yet run: zero rows / zero consumers (7.1), no policy engine (7.2), ✅ **the opacity violation — DISCHARGED at Amendment 3 (7.3): `inferBpom` is DELETED and no prefix parse survives on any path a receipt can travel; `D-COMP-BPOM`'s MECHANISM shipped, its CONTENT is still unanswered**, `substanceRef` RESERVED-not-built and now **contradicted by §6.1a of the same document** (7.4), the master **now holds 42 codes and zero document-lane codes are master-absent — restated, not deleted, because the crosswalk itself still has no rows and no consumers** (7.5), the per-row invariants are type-level only and never exercised (7.6), `EA`/`PCS` unresolved (7.7), and **SOMO's side is unverifiable by us** (7.8). **The four added by earlier amendments, and note that THREE ran the direction the ledger was not being read in** (ADD-3): we published a hazard SOMO had only undertaken to look for (7.9), two of our own clauses collided so `routeToResolution` had nowhere to live (7.10), **SOMO were ratifying our prose and not the artifact** (7.11), and **the contract was never delivered and never pinned** (7.12). ⚠️ **AND ONE ADDED AT AMENDMENT 3, which runs a direction the ledger had never recorded at all: `C9-STALE-BY-FIX-01` (7.13) — A CONTRACT CAN GO STALE BY BEING FIXED.** We repaired 7.3 and four documents went on declaring the defect, citing a `file:line` that no longer held one; **a document that overstates our conformance is caught by anyone who reads the code, and one that understates it is caught by nobody, because the discrepancy is in our favour and reads as caution.** None blocks ratification of the SHAPE; all block any claim the crosswalk is operational — **except 7.12, which made ratification impossible until the contract was pinned.** |
| **D-1 · substance vs specification** | **ESCALATED to Paragon procurement, NOT DEFAULTED** (C9 §6.1). The schema does not foreclose either answer: the key takes the reversible direction, the grain tag lets a row assert at one grain and stay silent at the other, and the ruling lands in `MaterialRefJoinPolicy.joinableGrains` — **either answer leaves every stored row unchanged.** Blocks CP-2 · B2b, which applies D-1 ~31 times. |
| **D-COMP-BPOM** | **WITH COMPLIANCE — BLOCKS CP-2 · B2b** (C9 §6.2). BPOM applicability is derived from a string prefix and **fails open**. The MECHANISM is ours to fix; the RULE CONTENT is compliance's to state. B2a could guarantee neutrality because every re-code preserved its first segment (pinned, `src/data/materialIdentity.test.ts`); **2B cannot** — the pin will detect a firing-set change but cannot say whether it is correct. |

| **C10 §8 (8.1–8.8)** | **EIGHT non-conformances declared BY the contract about itself, ALL OPEN** — and the whole of C10 is **model only: zero code, zero types, zero fixture persons** (8.1). The load-bearing one is **8.2: `ActingPerson` REQUIRES `displayName` and its own doc-comment states the ruling D-ID-7 reverses** (*"Captured, never resolved at read"*, `src/lib/enforcement.ts:339-345`) — **the shipped shape contradicts the contract, and it is free to correct today and only today**, because **zero `RESOLVED` attributions exist on any record this platform has written** (C10 §2.3, measured). Also open: `setBy` is a payload field — **attribution by assertion** (8.3) · `TransitionEvent` carries no attribution and the sink is still in-memory, which is the only reason it is still fixable (8.4) · `PersonaType` is still the authorisation object (8.5) · no `sim-usr-*` namespace and no pin (8.6) · **the "ten capabilities" figure is the external census's, carried as a DISCLOSURE and NOT re-derived by us** (8.7) · the single-permission-atom rule is a clause, not yet a mechanism (8.8). |
| **`ENF-NO-PERSON-IN-IDENTITY-01` / `ENF-EVENT-ACTOR-IS-A-PERSONA-01`** | **BOTH STILL OPEN — C10 ANSWERS THEM ON PAPER AND CLOSES NEITHER IN CODE.** The DR-10 actor is `buyer:all` (pinned, `enforcementSetCommand.test.ts:354`) and `CurrentIdentity` is `{ personaType, supplierId, supplierName }`. The override lane stays **fully built and unusable by design** (`overrideCompletes` is `false` for every override this tree can construct). Filed as a pair so neither is read alone. |
| **D-ID-2 · supplier-side identity provider** | **OPEN — UNPROCURED.** Paragon staff authenticate against the corporate IdP; **supplier staff have no identity provider and one has not been bought.** Whichever answer lands supplies a `SubjectBinding` and nothing else — it never mints a `personId` and never becomes a second authorisation path, so **the C10 model is complete without it** (C10 §7.1). |
| **D-ID-5 · registration-review scope** | **OPEN, provisionally portal — a leaning, not a ruling** (C10 §7.2). ⚠️ **The dependency runs ONE WAY:** resolving it toward the supplier side is blocked on D-ID-2; resolving it toward the portal is not. |

**Out of scope (non-contract, design-debt):** `DP3-FONT-02`, `DP2-PALETTE-01`, `DP3-CHIP-01` are
visual-conformance sweeps, not data-contract items. Noted here only so they are not mistaken for
contract gaps.

---

## Provenance

Generated FORK-3 (machine-harvest from code-truth + thin connecting prose). Every artifact
traces to a `file:line` in the shipped tree. The backend is greenfield: zero server code, zero
datastore clients — data is in-memory fixtures behind `mockDataService` (`src/main.tsx`), tenant
scoping enforced client-side. `httpDataService` is the designed swap (see C5).

---

## ⚠️ Which contracts have an instrument, and which are read by trust

**A contract with a pin goes red when the tree moves under it. A contract without one is
correct until somebody notices it is not.** That difference is not visible from the page, so it
is stated here.

| Contract | Instrument |
|---|---|
| C1 · C3 · C5 · C7 · C8 · C9 · C11 · C12 | **pinned** — a spec reads the document and asserts it against code-truth |
| **C2 · C4 · C6 · C10** | **no instrument** |

⚠️ **AND THE FOUR ARE NOT UNPINNED FOR THE SAME REASON, WHICH DECIDES WHETHER IT IS WORTH
FIXING.**

- **C4 (Snowflake) and C10 (identity)** describe systems that **do not exist in code**. A pin
  needs two populations; these have one. C10 is the sharper case: its central types
  `SubjectBinding` and `AssignmentAct` have **zero occurrences in `src/`** — it is a ratified
  design for a system nobody has built, and that is what it is *for*. **Pinning them is not
  deferred work; it is not possible until the code exists.**
- **C2 (schemas) and C6 (planning)** describe things the tree **does** carry. They are unpinned
  because nobody has written the instrument. **That is deferred work, and it is the honest place
  to spend the next contract batch.**

The distinction was measured when C3 was pinned (H3): C3 had been recorded as *"prose against
prose, not pinnable"*, and the pin found **three undocumented fields** on the interface the whole
page is about. **A "not pinnable" verdict ages**, because the tree grows halves that did not
exist when the verdict was taken. C2 and C6 deserve the same re-measurement before anyone
repeats it about them.
