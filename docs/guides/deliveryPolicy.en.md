---
entity: deliveryPolicy
locale: en
title: Drawdown tolerance (delivery policy)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_delivery_policy_set
---

<!-- section:summary -->
## 1 · What this process is

How much a delivery may differ from what was agreed before anybody is told about it. It is the check the delivery lane is measured against, so it is deliberately not the delivery lane that sets it — and it is kept as a record of decisions rather than a number somebody edits, because "nobody has chosen yet" and "somebody chose this" are different facts.

The entity is one **agreement item's governed tolerance** — the drawdown policy of one material line of a scheduling agreement. It has two knobs: a tolerance percentage (a fraction such as 10%, or *unlimited*) and an enforcement mode (`flag`, `ignore`, or `block`). Every item is born with a **contract default** at signing that is never changed, and an **active** policy that starts equal to it. The drawdown ledger reads the active policy: an item whose active mode is `ignore` reads *Reference envelope — not enforced*; one whose mode is `flag` reads *Governed — flag over N%*; and whenever active differs from the contract default the ledger marks a deviation and shows the when and why.

Who touches it: the **buyer's compliance lane** — the same lane that already decides what a supplier's paperwork must satisfy — records a tolerance change. Procurement, which releases the schedules, cannot: if the lane that transmits could also relax the tolerance it is measured against, the check would not be a check. The supplier sees the mode chip on its read-only mirror but not the deviation history.

Honest markers. A single-state machine: the item's tolerance is always `Governed`, and recording a change appends a decision without moving the state. Every change is a portal record — never posted to S/4HANA — over SIMULATED agreements. A change must be recorded against a named sample identity; a **loosening** (a weaker mode or a wider band) additionally refuses a sample identity by name, because a sample person cannot accept commercial risk — so in the demo today a tolerance can be tightened but not loosened. The `block` mode can be recorded but is not yet enforced anywhere; the editor's label says so.
<!-- src: src/services/transitions/flows/deliveryPolicy.flow.ts:1-76; src/services/delivery/types.ts:96-131; src/services/delivery/ledger.ts:21-34,56-96; src/lib/i18n/processFlowPurpose.ts:400-401; src/lib/i18n.ts:256-258,409 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Governed | born with the item at contract signing (no creation verb) | — | — |
| 1 | Governed → Governed | records a fact (state-preserving): the active tolerance is re-pointed with a reason | buyer · compliance | `t_delivery_policy_set` |

**Forks**

- **At Governed:** `t_delivery_policy_set` — compliance — when the tolerance on one material should be tightened or relaxed, or reset to the contract default. There is no other exit; the state never changes.
<!-- src: src/services/transitions/flows/deliveryPolicy.flow.ts:46-76; src/services/data/mock/MockCommandService.ts:2560-2581 -->

<!-- section:steps -->
## 3 · Step by step

### t_delivery_policy_set — Edit tolerance <!-- transition:t_delivery_policy_set -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · compliance (atom `delivery:policy-set`)
- **From → to:** Governed → same state
- **Operator — where:** `/buyer/contracts/:id` → tab **Delivery Agreements** → on an agreement item's header, **Edit tolerance** → the inline **Drawdown tolerance** editor → **Save tolerance** (or **Reset to contract default**, offered only when the active policy has deviated).
- **Operator — do:** Record how much over- or under-delivery is tolerated on this material and why it is changing. Choose a preset — *Soft envelope (10%, flag)* or *Reference only (unlimited)* — or set the two knobs directly. The ledger re-derives the deviation, the enforced/reference chip and any over-envelope exception on the next read.
- **Operator — fill:** **Tolerance** (a percentage, or *Unlimited*), **Enforcement** (*Flag*, *Ignore*, or *Block (recorded — not yet enforced)*) and **Reason (required)**. Only `reason` is a required field at the verb; the knobs are validated by policy, because *unlimited* is a legal value and a required-field check would refuse it.
- **Tester — expected state:** Governed
- **Tester — confirm:** the item's chip changes (*Governed — flag over N%* or *Reference envelope — not enforced*); *Active policy changed from contract default* appears with the contract default, the date and the reason; the **Change history** gains a *Tolerance changed* row with the reason in italics; the supplier mirror shows the new chip but no deviation history.
- **Tester — trigger event:** `t_delivery_policy_set`
- **Checks that can refuse:** `delivery_actor_attributed` — a named sample user is required. `delivery_policy_governed` — the enforcement value must be one of the three modes; the tolerance must be a finite non-negative number or unlimited; the reason must have substance (spaces do not count); the change must change something (recording the same values again is refused before anything is written); and if the change is a **loosening** — a weaker mode (block → flag → ignore) or a wider band (10% → 25%, or anything → unlimited) — the actor must be a named person who is not a sample identity. Tightening stays available to any attributed seat.
- **Glossary:** ROLE_NOT_PERMITTED · POLICY_REJECTED · SCOPE_DENIED · NOT_FOUND · NO_PERSON_IN_SESSION
- **Honesty:** portal-only and SIMULATED — the toast reads *Tolerance updated in the portal (simulated) — not posted to SAP.* The contract default is immutable and is spread through untouched, so a deviation is always measured against the original. `block` is recorded as a stance but no code refuses a release on it. Because the only named identities in the demo are sample ones, a loosening is unreachable today by design: the refusal names the sample user and says tightening is still available.
<!-- src: src/services/transitions/flows/deliveryPolicy.flow.ts:55-74; src/services/transitions/policies.ts:1618-1757; src/services/delivery/policy.ts:109-164; src/services/data/mock/MockDeliveryService.ts:239-263; src/services/data/mock/MockCommandService.ts:2560-2581; src/services/query/deliveryHooks.ts:222-251; src/pages-v2/BuyerContractDetail.tsx:199-216; src/components/delivery/AgreementDrawdown.tsx:280-300,405-460; src/lib/i18n.ts:388-423 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Tighten or loosen (at Governed).** Branch A — tightening (`t_delivery_policy_set` with a stricter mode or a narrower band) — **When:** an item should be watched more closely; any attributed seat holding the atom may record it. Branch B — loosening — **When:** the business accepts a wider deviation on this material; refused for an unattributed seat (`DELIVERY_POLICY_LOOSENING_UNATTRIBUTED`) and for a sample identity (`SAMPLE_ACTOR_CANNOT_LOOSEN`), so it needs a real signed-in person, which the platform does not have yet.
- **Reset to contract default (at Governed).** The same verb with the contract default's values and the fixed reason *Reset to contract default* — **When:** the active policy has deviated and should return. Whether the reset counts as a loosening is judged the same way as any other change.
- **No change (exception).** Recording the values already in force is refused (`DELIVERY_POLICY_NO_CHANGE`) — a stamp that changed nothing would fabricate a decision.
- **Blank reason (exception).** A reason of spaces is refused (`DELIVERY_POLICY_REASON_BLANK`); the required-field check only proves the key is present.
- **Unknown mode / bad number (exception).** `DELIVERY_POLICY_MODE_UNKNOWN` and `DELIVERY_POLICY_TOLERANCE_NOT_A_NUMBER` guard a hand-crafted payload; the editor cannot construct either.
<!-- src: src/services/transitions/policies.ts:1641-1757; src/components/delivery/AgreementDrawdown.tsx:291-297 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Governed — flag over N% | derived at read | Governed | active enforcement is not `ignore` (tolerance is the active band) | item header chip, both seats |
| Reference envelope — not enforced | derived at read | Governed | active enforcement is `ignore` | item header chip, both seats |
| Active policy changed from contract default | derived at read (`policyDeviation`) | Governed | active differs from the contract default in either knob; detail shows the default, the change date and the reason | item header, buyer only |
| Over-envelope exception | derived at read | Governed | enforced with a finite tolerance and released quantity exceeds agreed × (1 + tolerance) — only reachable after a line adjustment | drawdown ledger `exceptions` |
| Block (recorded — not yet enforced) | operator-raised, unenforced | Governed | the active mode is `block`; nothing refuses a release on it | editor label |
| SIMULATED / Sample | external (liveness) | Governed | always | `LivenessPill` on the Delivery Agreements tab |
| Awaiting Compliance (handoff) | derived at read | Governed | the seat does not hold `delivery:policy-set` | the **Edit tolerance** slot |
<!-- src: src/services/delivery/ledger.ts:56-96; src/services/delivery/types.ts:84-95; src/components/delivery/AgreementDrawdown.tsx:405-460; src/lib/i18n.ts:256-258,388-409 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `sa-0001/10` in the fact pack — command address `sa-0001#10` (SAP agreement 5500000123, item 10, PET bottles `PK-PETB-8810`, contract default *10% · Flag*).

| Joins to | By | Note |
|---|---|---|
| Scheduling agreement `sa-0001` | first segment of the item address | over contract `ctr-003` (CTR-2025-018), supplier `sup-007` |
| Agreement item 10 | `lineSeq` | the policy lives on the item (`drawdownPolicy.contractDefault` / `.active`), not on a line |
| Schedule lines `ctr-003/sa-0001/10/1…12` | the item's calendar | the ledger sums their released and confirmed quantities against this tolerance |
| Drawdown ledger | derived per item | `activePolicy`, `policyDeviation`, `enforced`, `exceptions` are all computed on read |
| Change history | `activeChangedAt` / `activeChangedBy` / `activeChangeReason` | one *Tolerance changed* row per item, carrying the latest change only (the model holds one stamp, not a list) |

Display-only: the contract default is a seeded audit reference and is never written by any verb. `activeChangedBy` is written from the session by the target, never from the form.
<!-- src: src/services/delivery/addressing.ts:64-76,97-104; src/services/delivery/fixtures.ts:50-77,108-117; src/services/delivery/types.ts:108-131; src/services/delivery/history.ts:72-83; src/services/delivery/policy.ts:151-163 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent` (`event` = `t_delivery_policy_set`, `actor` = `buyer:all`, `ts`, `outcome`, `correlationId`); refusals are written too. The item itself keeps only the latest stamp (`activeChangedAt`, `activeChangedBy`, `activeChangeReason`), which the **Change history** shows as one *Tolerance changed* row with the reason beneath it. An earlier change is superseded on the item; the audit trail still holds its event.

Worked sequence for `sa-0001#10` (contract default 10% · Flag), as a tester holding compliance and acting as a sample user would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | Governed → Governed | buyer · compliance (sample user) | **Edit tolerance** → Tolerance 5%, Flag, reason "tighter watch on PET bottles" → **Save tolerance** (a tightening — accepted) | `t_delivery_policy_set` |
| T+1 | Governed (refused) | buyer · compliance (sample user) | **Reset to contract default** back to 10% · Flag — a loosening by a sample identity | `t_delivery_policy_set` with `outcome: failed`, reason `POLICY_REJECTED:delivery_policy_governed:SAMPLE_ACTOR_CANNOT_LOOSEN…` |
| T+2 | Governed → Governed | buyer · compliance (sample user) | **Edit tolerance** → 5%, Block, same band, stricter mode → **Save tolerance** (a tightening — accepted; recorded, not enforced) | `t_delivery_policy_set` |
<!-- src: src/services/transitions/events.ts:127-129; src/services/delivery/history.ts:72-83; src/services/transitions/policies.ts:1641-1757; src/components/delivery/ChangeHistory.tsx:72-80 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Edit tolerance** button; a notice reads *Awaiting Compliance* | notice in the tolerance slot on the item header | the seat does not hold `delivery:policy-set` (procurement does not, by ruling) | adopt a seat holding compliance on the identity panel |
| Toast *Tolerance not changed* — "Relaxing a tolerance has to be recorded against a person…" | `POLICY_REJECTED:delivery_policy_governed` (`DELIVERY_POLICY_LOOSENING_UNATTRIBUTED`) | the seat carries no person and the change is a loosening | pick a sample user; note that a sample user can still only tighten |
| Toast — "… is a sample identity and may not relax a governed setting … tightening is still available" | `SAMPLE_ACTOR_CANNOT_LOOSEN` | a sample identity attempted a loosening (weaker mode or wider band, including a reset that widens) | expected today; needs a real signed-in person, which does not exist yet |
| Toast — "This seat is not acting as anyone…" | `POLICY_REJECTED:delivery_actor_attributed` | no sample user adopted | adopt one and save again |
| Toast — "The tolerance already carries those values" | `DELIVERY_POLICY_NO_CHANGE` | nothing changed | change a knob, or cancel |
| Toast — "Write why it is changing" | `DELIVERY_POLICY_REASON_BLANK` (or `MISSING_FIELDS:reason` if the key is absent) | blank reason | write a reason |
| Toast — "That is not a drawdown enforcement mode" / "… not negative, or unlimited" | `DELIVERY_POLICY_MODE_UNKNOWN` / `DELIVERY_POLICY_TOLERANCE_NOT_A_NUMBER` | a hand-crafted payload | use the editor |
| "That agreement item could not be found" | `UNKNOWN_ITEM` from the service or `NOT_FOUND` from the dispatcher | the address `agreementId#lineSeq` does not resolve | reload the contract page |
| Supplier seat sees the chip but cannot edit | supplier mirror | every delivery verb denies a supplier scope; the mirror hides the deviation history by design | expected |
| Setting Block did not stop a release | over-envelope is flagged, never blocked | `block` is declared but not enforced at release | expected; recorded as a known-unimplemented arm |
<!-- src: src/services/transitions/policies.ts:1450-1463,1681-1757; src/components/delivery/deliveryRefusal.ts:52-66; src/lib/i18n.ts:335-343,419-423; src/services/data/mock/MockDeliveryService.ts:244-248; src/services/delivery/types.ts:84-95 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Governed | `sa-0001#10`, `sa-0001#20`, `sa-0002#10` | 5500000123 (sa-0001), 5500000456 (sa-0002) | item address form shown (the page writes `sa-0001/10`); 11 items in the fact pack. `sa-0001/10` and `sa-0002/10` seed at *10% · Flag* (Case B); `sa-0001/20` and `sa-0002/20` seed at *Unlimited · Ignore* (Case C — reference envelope). No item deviates from its contract default at seed. The remaining items belong to `sa-1001`–`sa-1007`; their presets are set per agreement in `demoFixturesScale.ts`. |
<!-- src: src/services/delivery/fixtures.ts:52-106; src/services/delivery/demoFixtures.ts:64-122; src/services/delivery/ledger.ts:21-34; src/services/delivery/demoFixturesScale.ts:55-70 -->
