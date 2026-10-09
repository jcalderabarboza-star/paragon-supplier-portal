---
entity: enforcement
locale: en
title: Enforcement mode (governed check)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_enforcement_set
---

<!-- section:summary -->
## 1 · What this process is

How hard each rule bites — blocking, warning, or merely watching — recorded as a decision somebody made rather than a setting nobody owns.

The entity is one **governed check**: a rule the goods-receipt inspection asks about a received line. Three checks exist — `halal.seal` (an inspector physically looked at the halal seal and ticked it), `halal.certificate` (a halal certificate for this supplier and material was valid when the goods were received) and `bpom.lot` (the received lot carries the BPOM registration its material requires). Each check has an **enforcement mode** on a ramp of rising rigour: `OBSERVE` (ask the question and record the answer, never stop anyone), `BLOCK_OVERRIDABLE` (stop, but a named person may proceed by recording one of four override reasons) and `BLOCK` (stop; no override). The mode in force is never stored as a state — it is read off an **append-only ledger** of recorded decisions, and a relaxation that has passed its review date is tightened one step at read (the ratchet). An empty ledger reads `BLOCK / NO_SETTING_RECORDED`: the un-governed state is the strict state.

Who touches it: **nobody, from a screen.** The verb `t_enforcement_set` holds the atom `enforcement:set` (in the buyer's procurement bundle today; the move to compliance is ruled but waits on a caller) and is fired only by the platform's opening seed, which records `BLOCK` for the two checks that already block at the dock (`halal.seal`, `bpom.lot`). It is ruled **unsurfaced**: relaxing a governed check is an attributable act, the platform cannot yet name a real person, so an anonymous relaxation is refused rather than offered. What a person does see is the consequence — the goods-receipt wizard reads the mode and decides whether an unanswered required check stops the step.

Honest markers. Single-state machine (`Governed`); the verb appends a decision and moves nothing. The seed's actor is `UNATTRIBUTED: NO_PERSON_IN_SESSION` — the honest form for an act taken at load in no session. `halal.certificate` is deliberately **not seeded**: it blocks nothing today, so a row would record a decision nobody took; its empty entry derives `BLOCK / NO_SETTING_RECORDED`. Every mode below `BLOCK` is unrecordable until a real signed-in person exists — a sample identity may not loosen a governed check.
<!-- src: src/services/transitions/flows/enforcement.flow.ts:1-87; src/lib/enforcement.ts:173-287,484-508,715-724; src/services/data/mock/enforcementSeed.ts:1-123; src/lib/i18n/processFlowPurpose.ts:325-329; src/lib/glossary/governance.glossary.ts:23-52 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Governed | the check exists by being named in the closed list of governed check ids (no creation verb) | — | — |
| 1 | Governed → Governed | records a fact (state-preserving): a mode decision is appended to the ledger | buyer · procurement (fired by the seed only) | `t_enforcement_set` |

**Forks**

- **At Governed:** `t_enforcement_set` — procurement, via the seed — when a check's rigour is decided. Tightening (towards `BLOCK`) is legal for any caller; loosening (towards `OBSERVE`) needs a review date and a named, non-sample actor. No other exit exists.
<!-- src: src/services/transitions/flows/enforcement.flow.ts:44-87; src/services/data/mock/MockCommandService.ts:1602-1622 -->

<!-- section:steps -->
## 3 · Step by step

### t_enforcement_set — Set enforcement mode <!-- transition:t_enforcement_set -->

- **Step kind:** records a fact (state-preserving) · **not active from any screen** (ruled unsurfaced; fired by the seed only)
- **Role:** buyer · procurement (atom `enforcement:set`)
- **From → to:** Governed → same state
- **Operator — where:** *not offered anywhere today* — the mode it records is read by the receipt wizard at `/buyer/goods-receipt`. The only caller is `seedEnforcementLedger` in `enforcementSeed.ts`, which dispatches `t_enforcement_set` with `mode: BLOCK` for `halal.seal` and `bpom.lot` at start-up, and skips a check that already names a setting. There is no page, panel or button.
- **Operator — do:** (as the seed does it) record how strictly one check is applied. Full rigour is not a relaxation, so the seed needs no review date and no named person.
- **Operator — fill:** `mode` (required). `reviewBy` (a `YYYY-MM-DD` day) is required whenever the mode is below `BLOCK` — a conditional rule, so it lives in the policy hook rather than in the required fields. `setBy` is never a field: the actor comes from the session and the dispatcher refuses the key in a payload. `setAt` is assigned by the store.
- **Tester — expected state:** Governed
- **Tester — confirm:** the ledger (`useEnforcementSettings`) holds a row for the check with `setAt`, `setBy` and the mode; the goods-receipt wizard at `/buyer/goods-receipt` reads the mode in force and, at `BLOCK` or `BLOCK_OVERRIDABLE`, refuses to complete a line whose required halal seal or BPOM lot check is unanswered. No text on any screen prints the mode or its source (not measured beyond the wizard's behaviour).
- **Tester — trigger event:** `t_enforcement_set`
- **Checks that can refuse:** `enforcement_set_governed` — the scope must carry an actor (even an explicit `UNATTRIBUTED` one); a mode below `BLOCK` must carry a readable `reviewBy` day; a **loosening** from the mode currently in force (or from `BLOCK` when nothing is recorded) requires a named actor — an unattributed one is refused — and a **sample identity** is refused by name (`SAMPLE_ACTOR_CANNOT_LOOSEN`); tightening is always legal. An unknown check id is `NOT_FOUND`.
- **Glossary:** OBSERVE · BLOCK_OVERRIDABLE · BLOCK · halal.seal · halal.certificate · bpom.lot · NO_PERSON_IN_SESSION · IDENTITY_PROVIDER_UNAVAILABLE · NO_SETTING_RECORDED · EXPIRY_TIGHTENED · AS_RECORDED · UNRECOGNISED_MODE · UNATTRIBUTED_OVERRIDE
- **Honesty:** the verb exists, dispatches and lands in the audit trail, but **no screen fires it** — by ruling, not omission. Every recorded row today is the seed's, at maximum rigour, against nobody. The goods-receipt wizard's certificate notice (`halal.certificate`) tells the clerk and does not stop the dock; wiring it as a blocking clause would have required seeding `OBSERVE`, which this very policy refuses for an unattributed actor.
<!-- src: src/services/transitions/flows/enforcement.flow.ts:54-85; src/services/transitions/policies.ts:301-387; src/services/data/mock/enforcementSeed.ts:88-179; src/services/data/mock/MockCommandService.ts:1602-1622; src/services/data/mock/stores/enforcementSettingStore.ts:41-58; src/components/v2-features/GRInspectionWizard.tsx:792-801,913-915; src/services/query/hooks.ts:294-310 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Tighten or loosen (at Governed).** Branch A — tightening — **When:** a check should bite harder; legal for any caller, no review date needed, and the seed's opening act is this case. Branch B — loosening — **When:** a check should bite less; needs `reviewBy`, a named actor and not a sample identity — so it is unreachable in the demo (`ENF-NO-PERSON-IN-IDENTITY-01`).
- **The ratchet (derived, not a verb).** A recorded relaxation whose `reviewBy` day has passed reads one step stricter (`OBSERVE` → `BLOCK_OVERRIDABLE` → `BLOCK`) with source `EXPIRY_TIGHTENED`, and stays there until a new recorded act. One step only, however long it is left: a calendar lapse must not close a dock. `BLOCK` with a lapsed review still reads `AS_RECORDED` — nothing stricter exists.
- **Override at the dock (adjacent, not this verb).** At `BLOCK_OVERRIDABLE` a named person may record one of four reasons — `EVIDENCE_HELD_OUTSIDE_PORTAL`, `CERTIFIER_CONFIRMED_DIRECTLY`, `ACCEPTED_TO_QUARANTINE`, `COMMERCIAL_RISK_ACCEPTED`. An override by an unattributed actor is recordable but does not complete: the mode falls to the ceiling with source `UNATTRIBUTED_OVERRIDE`. No mode in the demo is `BLOCK_OVERRIDABLE`, so no override is reachable today.
- **Already recorded (seed exception).** The seed skips a check whose ledger already names a setting; appending would supersede a real operator's act with a boot-time default.
- **Refused seed (exception).** If the seed's dispatch is refused, the ledger stays empty for that check and derives `BLOCK / NO_SETTING_RECORDED` — provenance is lost, enforcement is not.
<!-- src: src/lib/enforcement.ts:233-260,600-645,747-763,834-852; src/services/transitions/policies.ts:301-387; src/services/data/mock/enforcementSeed.ts:125-179 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Mode in force `BLOCK` / `BLOCK_OVERRIDABLE` / `OBSERVE` | derived at read | Governed | the last recorded setting for the check, ratcheted by its review date | consumed by `/buyer/goods-receipt` (wizard) to decide whether an unanswered required check blocks; not printed as text (not measured) |
| Source `NO_SETTING_RECORDED` | derived at read | Governed | the ledger names no setting for the check — `halal.certificate` today | derivation only |
| Source `EXPIRY_TIGHTENED` | time-driven, derived at read | Governed | a relaxation's `reviewBy` day has passed | derivation only; no relaxation exists in the demo |
| Source `UNRECOGNISED_MODE` | derived at read | Governed | a stored mode is not one this build knows; ranks at the ceiling | derivation only |
| Source `UNATTRIBUTED_OVERRIDE` | derived at read | Governed (at the dock) | an override by an actor that names nobody | derivation only |
| Actor `UNATTRIBUTED: NO_PERSON_IN_SESSION` | recorded | Governed | every seeded row | ledger row `setBy` |
| Glossary terms | reference | — | every mode, check, source, override reason and unattributed reason has an EN/ID definition | `/glossary` |
<!-- src: src/lib/enforcement.ts:520-551,634-645,715-724; src/components/v2-features/GRInspectionWizard.tsx:792-801; src/lib/glossary/governance.glossary.ts:23-131 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `halal.seal` (a governed check id; there is no document number).

| Joins to | By | Note |
|---|---|---|
| Enforcement ledger rows | `checkId` | append-only; the setting in force is the latest `setAt` for the check |
| Goods-receipt inspection (`GRInspectionWizard`) | `effectiveEnforcement(ledger, 'halal.seal', inspectionInstant)` | `blocks(mode)` gates the clause `l.halal.required && !l.halalSealCheck`; the same for `bpom.lot` and `l.bpomLotCheck` |
| Governed verdict on a received line | `PASS` / `ADVERSE` / `UNANSWERED` | the mode governs the two non-passing answers; a refusal (unknown material, undetermined applicability) is not a verdict |
| Override record | `overriddenVerdict` bound to the stamped verdict | reachable only at `BLOCK_OVERRIDABLE`, by a named person |
| Glossary | check id, mode, source, reason | `/glossary`, both locales |

Display-only: `reviewBy` on a `BLOCK` row is legal but optional and is kept `null` by the seed rather than invented. `halal.certificate` is governed by the vocabulary but carries no row — its notice at the dock (`verifyHalalAtReceipt`) reads the compliance registry and tells; it does not consult the mode.
<!-- src: src/lib/enforcement.ts:273-322,484-508,667-678,782-800; src/components/v2-features/GRInspectionWizard.tsx:792-801,848,913-915; src/services/data/mock/enforcementSeed.ts:160-171 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent` (`event` = `t_enforcement_set`, `actor` = `buyer:all`, `ts`, `outcome`, `correlationId`). The ledger row itself carries `setBy` (an attribution, resolved or unattributed with its reason), `setAt` (store-assigned) and `mode`, plus `reviewBy`. Nothing is ever updated: superseding means appending, and the whole history stays readable.

Worked sequence for `halal.seal`, as the platform produces it at start-up (no tester act is possible from a screen):

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | Governed → Governed | buyer · procurement, `UNATTRIBUTED: NO_PERSON_IN_SESSION` (the seed) | `seedEnforcementLedger` dispatches `mode: BLOCK`, no `reviewBy` | `t_enforcement_set` |
| T+1 | Governed (skipped) | the seed | a second run finds the setting already recorded and appends nothing | — |
| T+n | Governed (derived) | — | the wizard reads `BLOCK / AS_RECORDED` for `halal.seal` and refuses to complete a line whose required seal check is unanswered | — (no event) |

A tester who dispatches `t_enforcement_set` by hand with `mode: OBSERVE` and a `reviewBy` from an unattributed or sample seat produces an event with `outcome: failed` and a reason naming the loosening refusal.
<!-- src: src/services/transitions/events.ts:127-129; src/services/data/mock/enforcementSeed.ts:153-179; src/lib/enforcement.ts:667-678; src/services/transitions/policies.ts:301-387 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| There is no screen to change an enforcement mode | no control anywhere; `/buyer/process-flows` badges the verb as unsurfaced | ruled unsurfaced — the platform cannot name a person | none; awaits a real identity provider |
| The goods-receipt wizard will not complete a line with the halal seal or BPOM lot unanswered | the step stays invalid | mode in force is `BLOCK` (seeded, or `NO_SETTING_RECORDED`) | answer the check; no override exists at `BLOCK` |
| Hand dispatch refused: "the commanding scope carries no actor" | `POLICY_REJECTED:enforcement_set_governed` | scope has no `actor` at all | supply an attribution — `UNATTRIBUTED` with its reason is accepted for a tightening |
| Hand dispatch refused: "a relaxation to OBSERVE requires reviewBy as a readable YYYY-MM-DD" | `POLICY_REJECTED:enforcement_set_governed` | mode below `BLOCK` without a review day | add `reviewBy` |
| Hand dispatch refused: "loosening … requires a NAMED actor" | `POLICY_REJECTED:enforcement_set_governed` | unattributed seat attempting a relaxation | expected today |
| Hand dispatch refused: `SAMPLE_ACTOR_CANNOT_LOOSEN` | `POLICY_REJECTED:enforcement_set_governed` | a sample identity attempting a relaxation | expected; needs a real signed-in person |
| A pop-up "Super Admin — state the reason" opens on a relaxation of a governed check | the pop-up names the check ("A sample identity may not loosen a governed setting") and takes one line; cancelling it leaves the act refused with "This act passes a four-eyes check on the Super Admin exemption, and it is not taken without a one-line reason…" (`POLICY_REJECTED:super_admin_bypass_reasoned:SUPER_ADMIN_REASON_REQUIRED`) | the seat is the Super Admin, the one seat this check stands aside for; the act is recorded as "Super Admin — four-eyes bypassed" with the check and the reason. Admin (operations) is not exempt and is refused as before | state the reason and continue, or cancel and route the act to somebody the check admits. Every such act is listed on **Platform → Super Admin activity** |
| `MISSING_FIELDS:mode` | dispatcher | payload without `mode` | supply it |
| `ACTOR_IN_PAYLOAD` | dispatcher | payload carried `setBy` | remove it; the actor rides the session |
| `NOT_FOUND` | thrown | the check id is not one of the three governed ids | use `halal.seal`, `halal.certificate` or `bpom.lot` |
| `ROLE_NOT_PERMITTED:enforcement:set` | dispatcher | seat does not hold procurement | expected for every other lane |
| `halal.certificate` shows a notice but never blocks | wizard | the check has no recorded setting and is consulted by nothing that refuses | expected; the notice tells the clerk |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:GRC`; where the surface checks first, the control reads *"Switched off — Goods receipt & inspection"* | the Goods receipt & inspection module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |
<!-- src: src/services/transitions/policies.ts:301-387; src/services/transitions/refusals.ts:61-114; src/services/data/mock/MockCommandService.ts:1603; src/components/v2-features/GRInspectionWizard.tsx:803-835 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Governed | `halal.seal`, `bpom.lot` | — | the two checks the seed opens at `BLOCK`, actor `UNATTRIBUTED: NO_PERSON_IN_SESSION`, `reviewBy: null`. `halal.certificate` is a valid entity id (readState answers `Governed`) but is deliberately unseeded and derives `BLOCK / NO_SETTING_RECORDED`. |
<!-- src: src/services/data/mock/enforcementSeed.ts:88-93,160-171; src/lib/enforcement.ts:273-287; src/services/data/mock/MockCommandService.ts:1603 -->
