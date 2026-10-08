---
entity: materialRuling
locale: en
title: Material applicability ruling
wired: true
owner: portal
source_sha: da4f1c710ef6ab79023846d67f05eac88b35405b
transitions:
  - t_material_ruling_set
---

<!-- section:summary -->
## 1 · What this process is

Whether halal, or BPOM, applies to a material — decided by Compliance, saying why, and kept as a record of who ruled and when. Receiving reads it: where a regime applies, the receiving form asks for that regime's check (and, for halal, for a valid certificate on file for the supplier and material); where it does not apply, the line passes and shows the ruling; where nobody has answered, the line cannot be received and says who rules.

A ruling is an **act on a ledger**, never a value somebody edits. Each act names one material and one regime (halal or BPOM), says *applies* or *does not apply*, carries a reason, and is recorded under the person who made it. A later act for the same material and regime supersedes the earlier one; nothing is erased, and the history stays on the row. What is in force is derived at read: the latest ruling if there is one, otherwise what the **material master** says.

One buyer lane touches it. **Compliance** holds the only atom, `material:rule`. Receiving does not: receiving is the lane a ruling binds, so it cannot be the lane that makes it. Every buyer seat can read the table on `/buyer/compliance` (**Material applicability — halal and BPOM**); a seat without the atom sees *Awaiting Compliance* where the **Rule** control would be.

Honesty markers. The ledger opens **empty** — a seeded row would claim Compliance ruled something nobody ruled — so today every answer comes from the material master: **halal applies to every material by default, packaging included**; BPOM applies to the formulation groups the master names, does not apply to packaging, and is **pending** for the raw materials the master has no determination for. Those pending materials cannot be received until Compliance rules. The ledger lives in the in-memory mock behind the service: a reload returns to the master's answers. A ruling must be **attributed to a person**: an unattributed seat is refused, so in the demo a SAMPLE user is chosen first, and every row a sample person wrote carries the *(SAMPLE)* marker. The material master is a fixture; a ruling does not rewrite it.
<!-- src: src/services/sdc/materialRuling.ts:1-40,95-135; src/services/transitions/flows/materialRuling.flow.ts:1-50; src/services/data/mock/stores/materialRulingStore.ts:1-30; src/services/sdc/halal.ts:104-125; src/services/sdc/bpom.ts:60-80; src/services/transitions/businessRoles.ts:357-362; src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:1-20 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Governed | a material exists by being in the material master (no creation verb; an unknown code is `NOT_FOUND`) | — | — |
| 1 | Governed → same state | records a fact (state-preserving): one ruling is appended to the ledger | buyer · compliance | `t_material_ruling_set` |

The step repeats every time Compliance rules, or changes a ruling, for a material under a regime.

**Forks**

No state has two exits. The decision sits in the payload: the regime (halal or BPOM) and whether it applies.
<!-- src: src/services/transitions/flows/materialRuling.flow.ts:28-50; src/services/data/mock/materialRulingTarget.ts:17-34 -->

<!-- section:steps -->
## 3 · Step by step

### t_material_ruling_set — Rule whether halal or BPOM applies <!-- transition:t_material_ruling_set -->

- **Step kind:** records a fact (state-preserving) · operator action
- **Role:** buyer · compliance (atom `material:rule`)
- **From → to:** Governed → same state
- **Operator — where:** `/buyer/compliance` → section **Material applicability — halal and BPOM** → filter **Pending a ruling**, **Ruled by Compliance** or **All materials** → on the material's row, under **Halal** or **BPOM**, press **Rule** → choose *applies* or *does not apply* → write **Reason (required)** → **Record ruling**.
- **Operator — do:** decide whether the regime applies to this material and say why. The form states, before the act, whose name the ruling will carry. To change a ruling, rule again the other way with a new reason; the earlier ruling stays in the row's history.
- **Operator — fill:** `regime` (halal or BPOM — set by which **Rule** was pressed), `applicable` (yes or no), `reason` (required; blank or spaces only is refused). Who ruled comes from the session and when from the store; neither is a field, and a payload that tries to name an actor is refused.
- **Tester — expected state:** Governed (unchanged)
- **Tester — confirm:** toast **"Ruling recorded for {material}"** with what receiving will now do; the row's cell reads **Applies** or **Does not apply** with *Ruled by {person} on {date}* (a sample person carries the *(SAMPLE)* marker); the **Rulings** column counts the act and opens the history with regime, answer, person, date and reason. On `/buyer/goods-receipt`, the receiving form's quality step shows the ruling on that material's line — "Halal does not apply — ruled by Compliance…" with who, when and why — and asks for no seal check and no certificate; a BPOM-pending material that has been ruled is no longer blocked.
- **Tester — trigger event:** `t_material_ruling_set`
- **Checks that can refuse:** `material_ruling_governed`, five refusals in this order — `RULING_REGIME_UNKNOWN` (the regime is not halal or BPOM); `RULING_MALFORMED` (`applicable` is not yes or no); `RULING_REASON_BLANK` (no reason); `RULING_UNCHANGED` (the material is already ruled that way — a ruling records a change); `RULING_ACTOR_UNATTRIBUTED` (the seat names no person). Before these: a supplier seat is refused at scope, a code the material master does not hold is `NOT_FOUND`, a seat without `material:rule` gets `ROLE_NOT_PERMITTED`, a payload carrying an actor key gets `ACTOR_IN_PAYLOAD`, and a missing field gets `MISSING_FIELDS`.
- **Glossary:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `ACTOR_IN_PAYLOAD`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`, `UNDETERMINED_APPLICABILITY`, `UNKNOWN_MATERIAL`.
- **Honesty:** the first ruling on a material that reads its master default is taken even when it says the same thing as the default — it turns a default into a decision somebody answers for. A sample person is admitted here (the ledger says so on the row); the enforcement ledger's loosening gate, which refuses sample people, is a different record and is not touched by a ruling. A ruling changes what receiving ASKS; it does not create or change a certificate. The ledger is in memory: a reload returns every material to the master's answer.
<!-- src: src/services/transitions/flows/materialRuling.flow.ts:36-48; src/services/data/mock/materialRulingTarget.ts:17-66; src/services/transitions/policyHooks.ts:146-150; src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:60-160,190-330; src/services/query/commandHooks.ts:1052-1085; src/services/query/hooks.ts:232-238; src/components/v2-features/GRInspectionWizard.tsx:905-925,1470-1500; src/lib/i18n/compliance.ts:103-160; src/lib/i18n/goodsReceipt.ts:246-262 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Applies or does not apply (at Governed).** Branch A — `t_material_ruling_set` with *applies* — **When:** the regime reaches this material; receiving then asks for its check (and, for halal, a valid certificate on file). Branch B — with *does not apply* — **When:** it does not; receiving passes the line and shows the ruling.
- **Halal or BPOM (at Governed).** One act rules one regime. A material may be ruled under both, by two acts.
- **A pending material (exception path).** **When:** the master has no determination and nobody has ruled — today the raw materials with no BPOM determination. Receiving refuses the line as *pending — Compliance to rule*. Either ruling resolves it.
- **Changing a ruling (exception path).** **When:** Compliance decides otherwise. Rule again the other way; the later act is in force and the earlier one stays on the ledger.
- **Nothing changed (exception).** **When:** the act repeats the ruling in force. Refused (`RULING_UNCHANGED`) rather than recorded.
- **Who may act (exception).** **When:** the seat names no person — refused by name; choose a sample user on the identity panel.
<!-- src: src/services/sdc/materialRuling.ts:57-135; src/services/data/mock/materialRulingTarget.ts:36-66 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| *Pending — Compliance to rule* · *No ruling recorded — receipt of this material is blocked* | derived at read | Governed (no ruling, no master determination) | a regime has no answer for the material | the material's cell on `/buyer/compliance`; counted in **Pending a ruling** |
| *Applies* / *Does not apply* · *Ruled by {person} on {date}* | derived at read | Governed (a ruling is in force) | Compliance has ruled the material under that regime | the material's cell; counted in **Ruled by Compliance** |
| *Applies* / *Does not apply* · *Material master* (or the halal default line) | derived at read | Governed (no ruling) | the master answers | the material's cell |
| *Not in the material master* | derived at read | — | a code the master does not hold | the material's cell; no ruling can answer for it |
| *(SAMPLE)* after a person | derived at read | Governed | the ruling was recorded by a sample person | the cell's basis line; the row's history; the receiving form's ruling note |
| *Awaiting Compliance* | derived at read (seat vs. atom) | — | the seat does not hold `material:rule` | header of the section, where **Rule** would be |
| *This seat names no person, so the ruling will be refused…* | derived at read (session) | — | the seat names no person | the ruling form, before the act |
| *BPOM: pending — Compliance to rule.* / *Halal does not apply — ruled by Compliance…* | derived at read | (receiving) | a line's material is pending, or has been ruled | the receiving form's quality step on `/buyer/goods-receipt` |
<!-- src: src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:150-215,300-325; src/lib/i18n/compliance.ts:103-160; src/components/v2-features/GRInspectionWizard.tsx:1470-1560 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `PK-CART-9901` — a folding carton. No ruling exists for it today; halal reads the master default (applies) and BPOM reads the master (does not apply).

| Joins to | By | Note |
|---|---|---|
| Material master | `materialCode` | the entity id IS the material code; the master's `halalApplicable` and `bpomApplicable` answer where there is no ruling, and are not rewritten by one |
| Ledger act | `materialCode`, `regime`, `applicable`, `reason`, `setBy`, `setAt`, `seq` | `setBy` is the session's attribution (a person id, rendered through the label resolver, never a stored name), `setAt` the clock at the act, `seq` the store's arrival order — the later act for a material and regime is in force. Append-only; no update |
| Goods receipt | a receipt line's `materialCode` | the receiving form reads the ruling in force over the master's answer, per line, when it renders — so a ruling made while a receipt is open reaches it |
| Compliance registry | supplier × material × certificate | read by receiving only where halal applies; a ruling neither creates nor changes a certificate |
| Tenant / owner | none (`readScopeOwner` is null) | a buyer governance record: a supplier scope is refused at scope and the read answers a supplier `SCOPE_DENIED`, not an empty page |
<!-- src: src/services/sdc/materialRuling.ts:42-135; src/services/data/mock/materialRulingTarget.ts:17-34; src/services/data/mock/MockRiskService.ts:63-68; src/services/sdc/fixtures.ts:130-180 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = `t_material_ruling_set`, `actor` = `buyer:all`, `ts`, `outcome` (with `reason` when refused), its own `correlationId`, the session's person as `attribution`, and `subject` = `{ entity: 'materialRuling', entityId: <material code>, from: 'Governed', to: 'Governed' }`. The ledger itself is the material's own history, shown on its row.

Worked sequence for `PK-CART-9901`, as a tester produces it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | — | the tester chooses a sample user holding compliance on the identity panel | no act; **Rule** appears on every row | — |
| T+1 | Governed → Governed | buyer · compliance, the sample person | **Rule** under Halal → *Halal does not apply* → reason → **Record ruling** | `t_material_ruling_set` |
| T+2 | Governed → Governed (refused) | buyer · compliance | the same ruling again — `outcome: failed`, `POLICY_REJECTED:material_ruling_governed:RULING_UNCHANGED:…` | `t_material_ruling_set` |
| T+3 | Governed → Governed | buyer · compliance | **Rule** under Halal → *Halal applies* → a new reason — the later act is in force; the row's history holds both | `t_material_ruling_set` |

After T+1, a receipt line for `PK-CART-9901` shows the ruling and asks for no halal seal check and no certificate. After T+3 it asks for both again.
<!-- src: src/services/transitions/events.ts:26-60,85-123; src/services/data/mock/materialRulingTarget.ts:22-66; src/services/sdc/materialRuling.ts:57-80 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **Rule** control on any row; *Awaiting Compliance* in the section header | handoff text where the control would be | the seat does not hold `material:rule` | act from a seat holding the compliance lane |
| "This seat names no person, and a ruling is recorded against the person who made it…" | warning toast; the form said so before the act | the seat names no person (`NO_PERSON_IN_SESSION`) — `RULING_ACTOR_UNATTRIBUTED` | choose a sample user on the identity panel, then rule again |
| "This material is already ruled that way. A ruling records a change." | warning toast | `RULING_UNCHANGED` — the act repeats the ruling in force | nothing to do; to change it, rule the other way |
| "A ruling carries its reason…" | warning toast (the button stays disabled while the reason is empty, so this needs a hand-crafted dispatch) | `RULING_REASON_BLANK` | write why it applies or does not |
| Refused: *a ruling is made under halal or bpom* / *applicable must be yes or no* | `POLICY_REJECTED:material_ruling_governed:RULING_REGIME_UNKNOWN` / `…RULING_MALFORMED` | a hand-crafted payload | use halal or bpom, and true or false |
| A receipt line still reads *pending — Compliance to rule* after ruling | the receiving form's quality step | the ruling was made under the other regime, or for another material | rule the regime the line names, for that line's material |
| A halal line is still stopped after ruling BPOM | "Halal certificate — action needed…" on the line | a ruling does not create a certificate; halal still applies and no valid certificate is on file | have the certificate recorded, or rule halal not applicable to the material |
| Thrown `NOT_FOUND` | `DataError` code | the entity id is not a code the material master holds | use a master code |
| Thrown `SCOPE_DENIED` | `DataError` code, or the read's refusal | a supplier scope | buyer side only |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:CMP` | the Compliance & documents module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |
| Every ruling is gone | every row reads its master answer again | the page was reloaded; the ledger is in memory | expected in the demo |
<!-- src: src/services/data/mock/materialRulingTarget.ts:36-66; src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:60-75,110-150; src/services/transitions/dispatcher.ts:600-637; src/lib/i18n/compliance.ts:150-160; src/services/data/mock/stores/materialRulingStore.ts:1-30 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Governed | `PK-CART-9901`, `PK-PETB-8801`, `RM-COCO-8200`, `RM-EMUL-3320`, `AI-NIAC-6601` | — | every code in the material master answers Governed. The ledger opens empty, so each reads its master answer: `PK-CART-9901` and `PK-PETB-8801` (packaging) — halal applies by default, BPOM does not apply; `RM-COCO-8200` and `RM-EMUL-3320` (raw materials) — halal applies, BPOM **pending**; `AI-NIAC-6601` (active) — halal and BPOM both apply. Ruling BPOM for `RM-EMUL-3320` removes the BPOM block on receipt `gr-007` after its retest; that line's halal certificate is a separate check. |
<!-- src: src/services/sdc/fixtures.ts:130-600; src/services/data/mock/materialRulingTarget.ts:17-21; src/services/data/mock/stores/materialRulingStore.ts:9-12 -->
