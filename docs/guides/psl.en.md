---
entity: psl
locale: en
title: Preferred supplier listing
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_psl_propose
  - t_psl_grant
  - t_psl_reject
  - t_psl_change_status
  - t_psl_renew
  - t_psl_withdraw
  - t_psl_publish
  - t_psl_cap_override
---

<!-- section:summary -->
## 1 · What this process is

The record of which suppliers Paragon has pre-qualified, for which materials, and on what terms — the master data other modules read before they decide whether an event has to go out to competitive bidding at all. Before this existed the answer lived in a deck and a shared drive, so nothing in the platform could act on it. A listing is one governance decision about one supplier for a set of material codes: a **designation** (`Sole Source`, `Mandatory` or `Validated`), a validity window, a written justification, and a ledger of every move since. `Sole Source` and `Mandatory` suspend competitive bidding; `Validated` is pre-qualification that still competes.

Two buyer lanes touch it and they are kept apart on purpose. **Procurement** raises a listing (*New listing* on the *Preferred suppliers* queue) and, once it is decided, is the lane that tells the supplier (*Share with supplier*). **Compliance** decides: *Approve* or *Refuse* a proposal, and on a listed row *Change designation*, *Renew*, *Withdraw*, and *Set a cap for this listing*. No supplier seat holds any verb in this machine; the supplier only reads their own published standing on `/supplier/performance`.

It starts at **Proposed** and ends at **Withdrawn** or **Rejected**. **Listed** is where a designation lives and where the four state-preserving acts (change designation, renew, publish, cap override) append to the record without moving it. Whether a listed designation is *in force today* is a separate question the clock answers at read: the surface shows `Scheduled`, `Expiring` or `Expired` on top of the stored state, never stores them. A withdrawn or refused listing is not reopened; a return goes back through a new proposal. Publication is a separate axis again — a listing is internal until procurement shares it, and once shared it stays shared (there is no unpublish; a listing that must stop is withdrawn).

Honest markers. The list is **SIMULATED** — the queue's provenance pill reads *"Sample — awaiting an operator-entered preferred supplier list"*, because every row was grown at start-up by the seed through the real verbs, not entered by an operator. Every act is recorded against *"no identified person"* unless the seat has adopted a sample identity; the seeded rows carry a sample procurement proposer and a sample compliance decider. The four-eyes rule (the proposer may not decide) is built and admits every act while nobody is signed in — it can only refuse once two persons can be compared. What *does* refuse today is the seat check: a seat holding both the proposing and the deciding atom (the default buyer seat holds all six lanes) may not approve, re-designate to, or renew a `Mandatory` or `Sole Source` designation. The validity cap in force is the compiled default of 365 days, because the portal-wide setting verb (`t_psl_cap_set`, its own guide) has never fired; the absolute ceiling is 730 days. The declared present is 31 Aug 2026 and every date the seed authored has been re-anchored onto it.

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | ∅ → Proposed | creation (operator action) | procurement | `t_psl_propose` |
| 2a | Proposed → Listed | operator action | compliance | `t_psl_grant` |
| 2b | Proposed → Rejected | operator action (terminal) | compliance | `t_psl_reject` |
| 3 | Listed → same state | records a fact (state-preserving) | compliance | `t_psl_change_status` |
| 4 | Listed → same state | records a fact (state-preserving) | compliance | `t_psl_renew` |
| 5 | Listed → same state | records a fact (state-preserving) | procurement | `t_psl_publish` |
| 6 | Listed → same state | records a fact (state-preserving) | compliance | `t_psl_cap_override` |
| 7 | Listed → Withdrawn | operator action (terminal) | compliance | `t_psl_withdraw` |

Steps 3–6 happen in any order and any number of times (publish once only) while the listing stays Listed.

**Forks**

- **At Proposed:** `t_psl_grant` — compliance — when the case is accepted and the designation should start to bite; `t_psl_reject` — compliance — when the case is declined, with a written reason the next proposer will read.
- **At Listed:** `t_psl_change_status` — compliance — when the supplier's standing moves up or down; `t_psl_renew` — compliance — when the designation is carried into another term; `t_psl_publish` — procurement — when the team decides to tell the supplier; `t_psl_cap_override` — compliance — when this one relationship should run to a different cap; `t_psl_withdraw` — compliance — when the designation must stop before it runs out.

<!-- src: src/services/transitions/flows/psl.flow.ts:126; src/services/transitions/flows/psl.flow.ts:19 -->

<!-- section:steps -->
## 3 · Step by step

### t_psl_propose — New listing <!-- transition:t_psl_propose -->

- **Step kind:** operator action (creation)
- **Role:** buyer · procurement
- **From → to:** ∅ → Proposed
- **Operator — where:** `/buyer/preferred-suppliers` → **New listing** (page header) → the panel *Propose a preferred-supplier listing* → **New listing** (or **Cancel**).
- **Operator — do:** put a supplier forward for a set of materials and write down what qualifies them. This grants nothing on its own — it opens the case so compliance has something to rule on, and the claim is on the record before anybody acts on it. The hint under *Justification* says why the text matters: *"A Mandatory or Sole Source listing suspends competitive bidding."*
- **Operator — fill:** *Supplier* (pick from the directory list), *Material codes* (one or more catalog codes, comma separated), *Designation* (`Sole Source` / `Mandatory` / `Validated`; the form opens on `Validated`), *Valid from*, *Valid until*, *Justification*, and *Reason* (the first ledger entry) are all required. Optional: *Evidence references* (supplier document ids, comma separated). Dates already in the past are accepted — a day-one backfill of an existing list is normal, not a defect.
- **Tester — expected state:** Proposed
- **Tester — confirm:** toast *"Listing {id} raised for {supplier}. It is waiting on a decision."*; a new store-assigned `psl-NNN` row appears under the *Awaiting decision* tab with the designation chip and a *Proposed* state chip; on `/buyer/suppliers/{supplierId}` → *Preferred list* tab the card shows *Decided by: Not yet decided*. Nothing changes on any supplier seat — a proposal is never in force and never published.
- **Tester — trigger event:** `t_psl_propose`
- **Checks that can refuse:** `psl_supplier_resolved` — the supplier id must be on the roster; `psl_scope_well_formed` — at least one non-blank code, and every code must exist in the material master; `psl_status_known` — the designation must be one of the three; `psl_validity_ordered` — both dates must be real days and *Valid from* may not be after *Valid until* (no comparison against today); `psl_justification_authored` — the justification must not be blank or spaces.
- **Glossary:** `Sole Source`, `Mandatory`, `Validated`, `Proposed`, `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Honesty:** the panel says *"This decision will be recorded without an identified person. Paragon has no signed-in identity yet."* before the act (or names the sample identity with its *(SAMPLE)* marker if one is adopted). The list is **SIMULATED**. A seat without `psl:propose` sees *"Awaiting Procurement"* in the header slot instead of the button. Only a material-code scope can be raised; group and category scopes exist in the type with no producer.
<!-- src: src/services/transitions/flows/psl.flow.ts:138; src/services/transitions/flows/psl.flow.ts:116; src/services/transitions/policies.ts:1064; src/services/transitions/policies.ts:1082; src/services/transitions/policies.ts:1116; src/services/transitions/policies.ts:1133; src/services/transitions/policies.ts:1159; src/pages-v2/BuyerPreferredSuppliers.tsx:414; src/pages-v2/BuyerPreferredSuppliers.tsx:624; src/pages-v2/BuyerPreferredSuppliers.tsx:321; src/services/query/commandHooks.ts:1639; src/services/data/mock/MockCommandService.ts:2340; src/services/data/mock/stores/pslStore.ts:91; src/lib/i18n/psl.ts:148; src/lib/i18n/psl.ts:159; src/lib/i18n/psl.ts:184; src/lib/i18n/psl.ts:197; src/lib/i18n/widget.ts:38; src/services/data/pslListing.ts:151 -->

### t_psl_grant — Approve <!-- transition:t_psl_grant -->

- **Step kind:** operator action
- **Role:** buyer · compliance
- **From → to:** Proposed → Listed
- **Operator — where:** `/buyer/preferred-suppliers` → *Awaiting decision* tab → click the row → side panel → *Reason* → **Approve**.
- **Operator — do:** accept the case. From here the designation is on the list and bites for its validity window: an in-force `Mandatory` or `Sole Source` listing removes the need to compete a sourcing event that names this supplier and one of these materials. The *Reason* hint says what the text is for: *"Recorded in the listing ledger. A silent change of designation is not allowed."* The button stays disabled until a reason is written.
- **Operator — fill:** *Reason* (required).
- **Tester — expected state:** Listed (the state chip then reads `Listed`, `Scheduled`, `Expiring` or `Expired` depending on the window and the declared present)
- **Tester — confirm:** toast *"Listing {id} approved. It is now in force for its validity."*; the row leaves *Awaiting decision* and stays under *All listings*; on the supplier profile's *Preferred list* tab the card gains *Decided by*, a ledger line, and the *Internal* chip with the five listed-row controls. The Directory column on `/buyer/suppliers` and the sourcing wizard's gate now read the new standing (if the window has opened). The supplier still sees nothing — nothing is published yet.
- **Tester — trigger event:** `t_psl_grant`
- **Checks that can refuse:** `psl_decider_not_proposer` — the person who proposed may not decide; it compares the row's *Proposed by* with the session actor and refuses only when both name the same person; `psl_restrictive_status_approved` — a `Mandatory` or `Sole Source` designation may not be approved by a seat that holds both `psl:propose` and `psl:decide`; `psl_decision_authored` — the reason must not be blank.
- **Glossary:** `Listed`, `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `POLICY_REJECTED`.
- **Honesty:** the panel renders the seat verdict *before* the act: with the default buyer seat on a restrictive proposal it shows *"A {designation} designation suspends competitive bidding, so it cannot be decided by a seat that also raises listings. Narrow this seat to the deciding lane on the identity panel…"* and offers **Refuse** only. Narrow the seat to compliance on the identity panel to see **Approve**. The four-eyes hook admits every unattributed act; the seeded proposals carry a sample procurement proposer, so a seat that adopts that same sample identity is refused by name — the one way to see it bite today. Approval is recorded against no identified person unless a sample identity is adopted.
<!-- src: src/services/transitions/flows/psl.flow.ts:159; src/services/transitions/policies.ts:1207; src/services/transitions/policies.ts:1248; src/services/transitions/policies.ts:1170; src/services/data/pslLeadCheck.ts:119; src/pages-v2/BuyerPreferredSuppliers.tsx:234; src/pages-v2/BuyerPreferredSuppliers.tsx:487; src/pages-v2/BuyerPreferredSuppliers.tsx:541; src/pages-v2/BuyerPreferredSuppliers.tsx:592; src/pages-v2/BuyerPreferredSuppliers.tsx:285; src/services/query/commandHooks.ts:1666; src/services/data/mock/MockCommandService.ts:2280; src/lib/i18n/psl.ts:149; src/lib/i18n/psl.ts:171; src/lib/i18n/psl.ts:191; src/lib/i18n/psl.ts:198; src/services/data/mock/pslSeed.ts:510 -->

### t_psl_reject — Refuse <!-- transition:t_psl_reject -->

- **Step kind:** operator action (terminal)
- **Role:** buyer · compliance
- **From → to:** Proposed → Rejected
- **Operator — where:** `/buyer/preferred-suppliers` → *Awaiting decision* tab → click the row → side panel → *Reason* → **Refuse**.
- **Operator — do:** decline the case and say why in words the next person to put the same supplier forward will read. That text is the whole account of the decision; a later attempt is a fresh proposal, not a reopening.
- **Operator — fill:** *Reason* (required).
- **Tester — expected state:** Rejected
- **Tester — confirm:** toast *"Listing {id} refused. A later attempt is a new listing."*; the row leaves *Awaiting decision*; under *All listings* and on the supplier profile it shows a `Rejected` state chip and the reason as the last ledger line; no controls are offered on the card. Sourcing ignores it entirely — a refused proposal grants nothing even inside its dates.
- **Tester — trigger event:** `t_psl_reject`
- **Checks that can refuse:** `psl_decider_not_proposer` — as on Approve; `psl_decision_authored` — the reason must not be blank. The seat check does not sit on a refusal: refusing grants nothing, so a seat holding both atoms may refuse.
- **Glossary:** `Rejected`, `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`.
- **Honesty:** terminal by ruling — there is no reopen. `Rejected` is distinct from `Withdrawn`: this one was never listed. Recorded against no identified person unless a sample identity is adopted.
<!-- src: src/services/transitions/flows/psl.flow.ts:179; src/services/transitions/policies.ts:1207; src/services/transitions/policies.ts:1170; src/pages-v2/BuyerPreferredSuppliers.tsx:303; src/pages-v2/BuyerPreferredSuppliers.tsx:567; src/pages-v2/BuyerPreferredSuppliers.tsx:602; src/services/query/commandHooks.ts:1687; src/services/data/mock/MockCommandService.ts:2288; src/lib/i18n/psl.ts:150; src/lib/i18n/psl.ts:199; src/lib/glossary/governance.glossary.ts:257 -->

### t_psl_change_status — Change designation <!-- transition:t_psl_change_status -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · compliance
- **From → to:** Listed → same state
- **Operator — where:** `/buyer/suppliers/{supplierId}` → *Preferred list* tab → the listing card → **Change designation** → pick the new designation → *Reason* → **Change designation**. (The queue's *Open the supplier profile* link lands here with the card highlighted.)
- **Operator — do:** move the supplier between designations without the record starting over — standing is dynamic, and the ledger keeps every move so the history reads as one relationship. Moving *up* to `Mandatory` or `Sole Source` faces the same seat check as approving one.
- **Operator — fill:** *Designation* (must differ from the current one) and *Reason* (required).
- **Tester — expected state:** Listed (unchanged); the designation chip changes
- **Tester — confirm:** toast *"Listing {id} is now {designation}."*; the card's first chip and a new *Status history* line (`Listed — {reason}`) change; the queue row's *Designation* column changes; the Directory badge and the sourcing gate read the new designation. If the listing is published, the supplier's `/supplier/performance` row shows the new designation *without* a new share — the *Shared with the supplier on {date}* line does not move.
- **Tester — trigger event:** `t_psl_change_status`
- **Checks that can refuse:** `psl_status_known` — one of the three designations; `psl_status_actually_changes` — refused if the picked designation equals the current one (*"A ledger entry with no change in it records nothing"*); `psl_restrictive_status_approved` — on the designation being moved *to*, a seat holding both atoms may not choose `Mandatory` or `Sole Source`; `psl_decision_authored` — the reason must not be blank.
- **Glossary:** `Sole Source`, `Mandatory`, `Validated`, `POLICY_REJECTED`.
- **Honesty:** the card shows the seat notice instead of the reason box when the picked designation is restrictive and the seat holds both atoms. No compare-and-set protects this verb: two seats changing a designation concurrently both succeed and the ledger records both. The card is offered on a Listed row even when its display status reads `Expired` — the stored state is still Listed.
<!-- src: src/services/transitions/flows/psl.flow.ts:196; src/services/transitions/policies.ts:1116; src/services/transitions/policies.ts:1274; src/services/transitions/policies.ts:1248; src/services/transitions/policies.ts:1170; src/components/v2-features/PslListingsSection.tsx:411; src/components/v2-features/PslListingsSection.tsx:434; src/components/v2-features/PslListingsSection.tsx:451; src/components/v2-features/PslListingsSection.tsx:217; src/services/query/commandHooks.ts:1708; src/services/data/mock/MockCommandService.ts:2296; src/pages-v2/BuyerSupplierProfile.tsx:542; src/lib/i18n/psl.ts:151; src/lib/i18n/psl.ts:200; src/services/transitions/flows/psl.flow.ts:31 -->

### t_psl_renew — Renew <!-- transition:t_psl_renew -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · compliance
- **From → to:** Listed → same state
- **Operator — where:** `/buyer/suppliers/{supplierId}` → *Preferred list* tab → the listing card → **Renew** → *New end date* → *Reason* → **Renew**.
- **Operator — do:** carry the designation into another term. Extending a position that removes competitive bidding is the same decision as granting one, so it faces the same seat check, and the platform refuses a date past the cap in force rather than quietly shortening what was recorded.
- **Operator — fill:** *New end date* (must be later than the current effective end and no later than *Valid from* + the cap in force) and *Reason* (required).
- **Tester — expected state:** Listed (unchanged); *Until* and *Effective until* move
- **Tester — confirm:** toast *"Listing {id} now runs to {date}."*; the card's *Validity* end and *Effective until* update, a ledger line is appended; a row that read `Expiring` or `Expired` returns to `Listed` on the queue and on the two dashboard alert cards. A published listing's supplier row shows the new *Until* without a new share.
- **Tester — trigger event:** `t_psl_renew`
- **Checks that can refuse:** `psl_renewal_extends` — the new date must be a real day and later than today's effective end (*"to shorten a validity, record a cap override … instead"*); `psl_renewal_within_cap` — the new date may not exceed *Valid from* plus the cap in force (the listing's own override if any, else the portal default of 365 days) — the refusal states the latest date allowed; `psl_restrictive_status_approved` — on the designation already held; `psl_decision_authored`.
- **Glossary:** Expiring, Expired, `LISTING_OVERRIDE`, `NO_SETTING_RECORDED`, `POLICY_REJECTED`.
- **Honesty:** the cap is measured from *Valid from*, not from today, so a listing that started long ago may have no room to renew at all until a cap override is recorded first. The compiled default cap applies because no portal-wide cap has ever been recorded. Concurrent renewals both succeed.
<!-- src: src/services/transitions/flows/psl.flow.ts:222; src/services/transitions/policies.ts:1288; src/services/transitions/policies.ts:1327; src/services/transitions/policies.ts:1248; src/services/transitions/policies.ts:1170; src/services/data/pslProjection.ts:208; src/services/data/pslProjection.ts:249; src/services/data/pslProjection.ts:98; src/components/v2-features/PslListingsSection.tsx:418; src/components/v2-features/PslListingsSection.tsx:486; src/components/v2-features/PslListingsSection.tsx:225; src/services/query/commandHooks.ts:1738; src/services/data/mock/MockCommandService.ts:2309; src/lib/i18n/psl.ts:152; src/lib/i18n/psl.ts:174; src/lib/i18n/psl.ts:201; src/lib/i18n/psl.ts:234 -->

### t_psl_withdraw — Withdraw <!-- transition:t_psl_withdraw -->

- **Step kind:** operator action (terminal)
- **Role:** buyer · compliance
- **From → to:** Listed → Withdrawn
- **Operator — where:** `/buyer/suppliers/{supplierId}` → *Preferred list* tab → the listing card → **Withdraw** → *Reason* → **Withdraw**.
- **Operator — do:** stop the designation before it runs out and say why. A supplier that stops being suitable must not keep an exemption until an expiry date arrives; this is the difference between a position that lapsed and one somebody took away. It is also the only way to stop a published listing — there is no unpublish.
- **Operator — fill:** *Reason* (required).
- **Tester — expected state:** Withdrawn
- **Tester — confirm:** toast *"Listing {id} withdrawn. It grants nothing from now on."*; the state chip reads `Withdrawn` (never `Expired`, even past its dates); the card's controls disappear; the Directory and sourcing gate no longer count it; if it was published, the supplier's row shows *"This designation was withdrawn on {date} and no longer applies."*
- **Tester — trigger event:** `t_psl_withdraw`
- **Checks that can refuse:** `psl_decision_authored` — the reason must not be blank. No seat check: withdrawing removes an exemption rather than granting one.
- **Glossary:** `Withdrawn`, `POLICY_REJECTED`.
- **Honesty:** terminal by ruling. A return to the list goes back through **New listing** and a fresh decision — a `Withdrawn → Listed` shortcut was refused because it would be a cheaper route to a designation held entirely by the deciding lane. Continuity is recovered on the profile, which groups a supplier's listings, not in the machine.
<!-- src: src/services/transitions/flows/psl.flow.ts:240; src/services/transitions/flows/psl.flow.ts:66; src/services/transitions/policies.ts:1170; src/components/v2-features/PslListingsSection.tsx:425; src/components/v2-features/PslListingsSection.tsx:533; src/components/v2-features/PslListingsSection.tsx:231; src/services/query/commandHooks.ts:1762; src/services/data/mock/MockCommandService.ts:2292; src/pages-v2/SupplierPerformance.tsx:283; src/lib/i18n/psl.ts:153; src/lib/i18n/psl.ts:202; src/lib/i18n/psl.ts:276; src/lib/glossary/governance.glossary.ts:253 -->

### t_psl_publish — Share with supplier <!-- transition:t_psl_publish -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · procurement
- **From → to:** Listed → same state
- **Operator — where:** `/buyer/suppliers/{supplierId}` → *Preferred list* tab → the listing card → **Share with supplier** (beside the line *"This listing has not been shared with the supplier."*).
- **Operator — do:** deliberately tell the supplier where they stand. Until this happens the position is internal — acted on inside Paragon and unknown outside — and telling somebody is an act a person takes, not a side effect of a decision. It happens once and the date is kept; later designation changes reach the supplier without sharing again.
- **Operator — fill:** nothing to fill — the date is store-assigned and the actor comes from the session.
- **Tester — expected state:** Listed (unchanged); the publication chip flips from *Internal* to *Published*
- **Tester — confirm:** toast *"Listing {id} shared with the supplier."*; the card's third chip reads *Published*, the button is replaced by *"Shared with the supplier on {date}. Later changes reach them without sharing again."*; on the sourcing wizard, an exemption produced by this listing now carries the *Published* chip instead of *Internal · Not yet shared with the supplier.*; on the supplier seat, `/supplier/performance` → *Your preferred-supplier standing* gains a row with *Shared with you on {date}*. No ledger line is appended — `publishedAt` is the record.
- **Tester — trigger event:** `t_psl_publish`
- **Checks that can refuse:** `psl_not_already_published` — a second share is refused; the first date is not overwritten.
- **Glossary:** Published, Internal, `POLICY_REJECTED`.
- **Honesty:** publication decides who has been *told*, never what is *true*: the sourcing gate exempts an in-force `Mandatory`/`Sole Source` listing whether or not it is published, and the wizard says so beside the verdict. A listing whose validity has lapsed can still be shared (the stored state is still Listed). A seat without `psl:publish` sees *"Awaiting Procurement"* in this slot. The supplier view hides the justification, evidence, cap fields and history by ruling.
<!-- src: src/services/transitions/flows/psl.flow.ts:264; src/services/transitions/flows/psl.flow.ts:37; src/services/transitions/policies.ts:1353; src/components/v2-features/PslListingsSection.tsx:377; src/components/v2-features/PslListingsSection.tsx:238; src/services/query/commandHooks.ts:1793; src/services/data/mock/MockCommandService.ts:2330; src/services/data/pslListing.ts:291; src/components/v2-features/PslGateNotice.tsx:118; src/pages-v2/BuyerSourcing.tsx:168; src/services/data/mock/MockProcurementService.ts:615; src/pages-v2/SupplierPerformance.tsx:220; src/services/data/pslSupplierView.ts:40; src/lib/i18n/psl.ts:154; src/lib/i18n/psl.ts:193; src/lib/i18n/psl.ts:203; src/lib/i18n/psl.ts:270 -->

### t_psl_cap_override — Set a cap for this listing <!-- transition:t_psl_cap_override -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · compliance
- **From → to:** Listed → same state
- **Operator — where:** `/buyer/suppliers/{supplierId}` → *Preferred list* tab → the listing card → **Set a cap for this listing** → *Cap, in days* → *Why this listing runs to a different cap* → **Set a cap for this listing**.
- **Operator — do:** hold this one relationship to a shorter or longer term than the portal default, with the case for the exception written down and owned. The cap bounds the designation's *effective* end: whichever comes first of *Valid until* and *Valid from* + cap days.
- **Operator — fill:** *Cap, in days* (a whole number above zero, at most the 730-day ceiling) and *Why this listing runs to a different cap* (required).
- **Tester — expected state:** Listed (unchanged); *Effective until* and the *Validity cap* line change
- **Tester — confirm:** toast *"A {days}-day cap is recorded for listing {id}."*; the card's *Validity cap* reads *{days} days · Override recorded for this listing* (instead of *Portal default — no cap has been set*), *Cap justification* and *Cap decided by* appear, *Effective until* recomputes; the display status may move (a shorter cap can turn `Listed` into `Expiring` or `Expired`); a later **Renew** is bounded by this cap. No ledger line is appended — the four cap fields are the record.
- **Tester — trigger event:** `t_psl_cap_override`
- **Checks that can refuse:** `psl_cap_within_ceiling` — a positive whole number of days, no more than the 730-day ceiling (the refusal quotes the ceiling); `psl_cap_justification_authored` — the justification must not be blank.
- **Glossary:** `LISTING_OVERRIDE`, `NO_SETTING_RECORDED`, `PORTAL_DEFAULT`, `CEILING_BOUNDED`, `POLICY_REJECTED`.
- **Honesty:** recording a second override replaces the first — there is no per-listing cap ledger, only the four fields. A cap can be recorded on an *unpublished* or *expired* Listed row. The policy's "or the signed contract term if longer" exception is not built: contracts carry no material codes, so nothing can say which contract covers which listed material. `psl:cap-set` is a compliance atom that procurement must not hold — whoever sets caps can extend every designation they proposed.
<!-- src: src/services/transitions/flows/psl.flow.ts:289; src/services/transitions/policies.ts:1371; src/services/transitions/policies.ts:1391; src/services/data/pslProjection.ts:125; src/services/data/pslProjection.ts:208; src/services/data/pslProjection.ts:249; src/services/data/pslListing.ts:220; src/components/v2-features/PslListingsSection.tsx:562; src/components/v2-features/PslListingsSection.tsx:282; src/components/v2-features/PslListingsSection.tsx:290; src/components/v2-features/PslListingsSection.tsx:233; src/services/query/commandHooks.ts:1821; src/services/data/mock/MockCommandService.ts:2315; src/services/transitions/businessRoles.ts:328; src/lib/i18n/psl.ts:155; src/lib/i18n/psl.ts:172; src/lib/i18n/psl.ts:204; src/lib/i18n/psl.ts:240 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **The decision (at Proposed).** Branch A — `t_psl_grant` — **When:** compliance accepts the case; on a `Mandatory` or `Sole Source` proposal only from a seat that does not also hold `psl:propose`. Branch B — `t_psl_reject` — **When:** the case does not hold (the seeded refusal's reason: a second qualified supplier exists, so the monopoly ground fails); a written reason is required and the refusal is final.
- **Standing moves (at Listed).** `t_psl_change_status` — **When:** the supplier earns a stronger position or loses one; refused when nothing changes; moving *to* a restrictive designation needs a segregated seat. `t_psl_renew` — **When:** the term should run longer; refused when the date does not extend or breaks the cap in force. `t_psl_cap_override` — **When:** this relationship should be re-taken sooner (or later) than the default; it is the remedy the renewal refusals point to.
- **Telling the supplier (at Listed).** `t_psl_publish` — **When:** procurement decides the supplier should know. Once. **When** the designation later changes: nothing to do, the supplier sees the current one. **When** it must stop: withdraw — there is no unpublish.
- **Stopping early (at Listed).** `t_psl_withdraw` — **When:** the supplier stops being suitable before *Valid until*; the record reads `Withdrawn`, not `Expired`.
- **Lapse without an act.** No transition. **When** the effective end passes while still Listed: the surface reads `Expired` and the sourcing gate stops counting it; the row sits under the queue's *Expired, still listed* tab and the dashboard card until somebody renews or withdraws it. **When** *Valid from* is still ahead: `Scheduled`, and it grants nothing yet.
- **The sourcing consequence (no transition here).** **When** an RFQ invites a supplier holding an in-force `Mandatory` or `Sole Source` listing for any of its materials: the wizard and the RFQ panel say *"Competitive bidding is not required: {supplier} holds a {designation} listing for {code}."* with a *Published* / *Internal* chip, and `t_rfq_publish` is not held to the two-invitee floor. **When** no listing exempts it: at least two eligible invitees are required (a refusal at fewer; a note at exactly two that three is the standard). **When** the event's materials carry no code any listing names: the standing could not be checked and the event competes as usual.
- **Self-decision.** **When** the deciding seat is acting as the same sample person who proposed the row: approve and refuse are both refused by name. From an unattributed seat the check admits.

<!-- src: src/services/transitions/flows/psl.flow.ts:66; src/services/data/pslProjection.ts:298; src/services/data/rfqSourcingGate.ts:252; src/services/data/rfqSourcingGate.ts:318; src/services/data/rfqSourcingGate.ts:82; src/services/transitions/policies.ts:982; src/components/v2-features/PslGateNotice.tsx:93; src/lib/i18n/psl.ts:103; src/services/data/mock/pslSeed.ts:285 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| `Scheduled` | time-driven, derived at read | Listed | *Valid from* is after the declared present | state chip on the queue, the profile card, the RFQ invite column |
| `Expiring` | time-driven, derived at read | Listed | the effective end is within 90 days of the declared present | state chip; queue tab *Expiring*; dashboard card *Preferred-supplier listings expiring*; supplier row *"Your preferred-supplier status for {codes} lapses on {date}."* |
| `Expired` | time-driven, derived at read | Listed | the effective end has passed | state chip; queue tab *Expired, still listed*; dashboard card *Preferred-supplier listings expired but still listed — sourcing no longer treats them as in force*; supplier row *"This designation ran until {date}."* |
| *Published* / *Internal* | operator-raised (publication axis) | Listed, Withdrawn | always on a decided listing; *Internal · Not yet shared with the supplier.* beside a sourcing exemption whose listing is unshared | profile card chip; `PslGateNotice` on the wizard and the RFQ panel |
| *Validity cap* source line | derived at read | all states | always on the card: *Portal default — no cap has been set* (today's answer on every row without an override) / *Override recorded for this listing* / *Portal default — a cap has been set* / *Bounded by the platform ceiling* | profile card |
| *"Awaiting Procurement"* / *"Awaiting Compliance"* | derived at read (seat vs. atom) | ∅ (propose); Proposed (decide); Listed (decide, publish, cap) | the seat does not hold the verb's atom | queue header; decide panel; each verb's own slot on the card |
| Seat-holds-both notice | derived at read (seat atoms) | Proposed (grant); Listed (change to, renew) | the designation is restrictive and the seat holds both `psl:propose` and `psl:decide` | decide panel; change and renew forms |
| *"Recorded without an identified person"* / a person marked *(SAMPLE)* | derived at read | all states | always in the demo | *Proposed by*, *Decided by*, *Cap decided by*; pre-act notice on every form |
| SIMULATED — *"Sample — awaiting an operator-entered preferred supplier list"* | external (liveness registry) | all states | always, until an operator-entered list exists | `/buyer/preferred-suppliers` meta line; supplier standing tier |
| *Competitive bidding is not required* / *Two eligible suppliers invited…* / *A competitive event needs at least 2…* / *…could not be checked…* | derived at read (sourcing gate) | RFQ draft and RFQ panel | per the exemption and the eligible-invitee count | `/buyer/sourcing` |

Nothing time-driven is stored: `Expired` is absent from the stored state on purpose, and every clock comparison runs at the declared present (31 Aug 2026), never the wall clock.

<!-- src: src/services/data/pslProjection.ts:146; src/services/data/pslProjection.ts:298; src/services/data/pslProjection.ts:466; src/services/data/pslProjection.ts:485; src/pages-v2/BuyerPreferredSuppliers.tsx:266; src/pages-v2/BuyerDashboard.tsx:254; src/lib/i18n/buyerDashboard.ts:55; src/lib/i18n/psl.ts:67; src/lib/i18n/psl.ts:279; src/lib/i18n/roles.ts:48; src/services/liveness/registry.ts:331; src/services/data/fixturePresent.ts:198 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `psl-004` — `Mandatory`, supplier `sup-005`, materials `AI-NIAC-6601`, `AI-PANTO-6640`, in **Listed**, published, with a 150-day cap override. After re-anchoring its validity reads 2026-08-01 → 2027-03-19, but the cap measured from *Valid from* ends it on 2026-12-29, so *Effective until* is earlier than *Until* — the row exists to show that a reader ignoring the cap would show it running months longer than it does.

| Joins to | By | Note |
|---|---|---|
| Supplier roster | `supplierId` | Checked against the roster at proposal. The listing has no *owner*: no supplier seat may act on it, and a supplier scope is refused at scope regardless of whose listing it is. The supplier reads only their own published rows. |
| Material master | `scope.materialCodes` (`kind: 'material'`) | Every code must exist in the master; the same key the halal registry uses, so a listing and a certificate are comparable. `group` and `category` scopes exist in the type with no producer. |
| Designation | `status` + `statusHistory[]` | Append-only ledger: `at` (store-assigned), `from`, `to`, `lifecycle`, `reason`, `by`. The grant appends a line with `from === to`; publish appends nothing. |
| Validity | `validFrom`, `validUntil` (authored) | What a reader sees is `effectiveValidUntil` = the earlier of `validUntil` and `validFrom` + cap days. Computed, never stored. |
| Cap | `capDaysOverride`, `capJustification`, `capDecidedBy`, `capDecidedAt` | All four written by one act or all `null`. With none, the portal-wide cap applies — today the compiled 365-day default, because `pslCapSettingStore` is empty. |
| Publication | `publishedAt`, `publishedBy` | `null` = internal. Write-once. Independent of state and of the clock. |
| Actors | `proposedBy`, `decidedBy`, `capDecidedBy`, `publishedBy` | Attributions from the session, never names. Seeded rows: a sample procurement identity proposed and published; a sample compliance identity decided and capped. |
| Evidence | `evidenceRefs` | Supplier document ids, as stated by the proposer — a reference to a claim, not to a file. `psl-004` cites `doc-201`, `doc-202`. Display-only. |
| Sourcing event (RFQ) | read at publish time by `decideSourcing` | Not a stored link. An in-force `Mandatory`/`Sole Source` listing for an invited supplier on an event material produces the exemption; the exemption carries the listing id so the surface can show *Published* / *Internal*. |
| Supplier Directory | `bestPslStatus` per supplier | `/buyer/suppliers` shows the most restrictive in-force designation, or *Not Listed* / *Expired*; display-only. |

<!-- src: src/services/data/pslListing.ts:203; src/services/data/pslListing.ts:188; src/services/data/mock/pslSeed.ts:210; src/services/data/mock/pslSeed.ts:510; src/services/data/mock/MockCommandService.ts:2252; src/services/data/pslProjection.ts:249; src/services/data/pslProjection.ts:358; src/services/data/rfqSourcingGate.ts:189; src/services/data/mock/stores/pslCapSettingStore.ts:77; src/services/data/mock/MockProcurementService.ts:615 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = the transition id, `actor` = `buyer:all` (the seat, not a person), `ts`, `outcome`, one `correlationId` per command; no cascade touches this machine, so no `causationId` appears. A separate `attribution` field records who could be named. The listing's own *Status history* on the profile card is a second, narrower record: one line per designation act (propose, grant, reject, change, renew, withdraw) — publish and cap override leave no line there.

Worked sequence for `psl-004` — the seed runs T+0 at start-up under two narrow scopes (procurement, then compliance), each acting as a sample identity; a tester continues on the profile card:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | ∅ → Proposed | procurement (`buyer:all`, sample identity) | seed proposes `Mandatory` for `sup-005`, two actives codes, reason *"Raised under the approved 2026 actives strategy."* | `t_psl_propose` |
| T+0 | Proposed → Listed | compliance (`buyer:all`, sample identity) | seed approves, reason *"Approved with a shortened validity, justification recorded."* | `t_psl_grant` |
| T+0 | Listed → Listed | compliance (`buyer:all`, sample identity) | seed records a 150-day cap with its justification | `t_psl_cap_override` |
| T+0 | Listed → Listed | procurement (`buyer:all`, sample identity) | seed shares it with the supplier | `t_psl_publish` |
| T+1 (tester) | Listed → Listed | compliance (`buyer:all`) | **Change designation** → `Validated` + reason (the seat check does not apply to `Validated`) | `t_psl_change_status` |
| T+2 (tester) | Listed → Listed | compliance (`buyer:all`) | **Renew** to a date no later than 2026-12-29 (150 days from 2026-08-01) — anything later is refused until the cap is raised | `t_psl_renew` |
| T+3 (tester) | Listed → Withdrawn | compliance (`buyer:all`) | **Withdraw** + reason; the supplier's row then reads *withdrawn on {date}* | `t_psl_withdraw` |

For the refusal branch, walk `psl-008` (the one seeded proposal) and choose **Refuse** with a reason; the event is `t_psl_reject`. For the seat check, try **Approve** on `psl-008` from the default buyer seat: the panel shows the seat notice and offers **Refuse** only; narrow the seat to compliance to approve.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:98; src/services/data/mock/pslSeed.ts:640; src/services/data/mock/pslSeed.ts:672; src/services/data/mock/pslSeed.ts:703; src/services/data/mock/pslSeed.ts:714; src/services/data/mock/pslSeed.ts:732; src/services/data/mock/MockCommandService.ts:2263; src/main.tsx:120 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No **New listing** button; header reads *"Awaiting Procurement"* | handoff notice in the page header | the seat does not hold `psl:propose` | act from a seat holding the procurement lane |
| Panel reads *"Awaiting Compliance"* instead of Approve/Refuse, or the card's change/renew/withdraw or cap slot shows it | handoff notice in that verb's slot | the seat lacks `psl:decide` (or `psl:cap-set`) | route to a compliance seat |
| Card shows *"Awaiting Procurement"* where **Share with supplier** should be | handoff notice in the publish slot | the seat lacks `psl:publish` | route to a procurement seat |
| Only **Refuse** is offered on a proposal, with a note about a seat that "also raises listings" | `psl-seat-holds-both` notice; or toast *"This seat both raises and decides listings…"* | `POLICY_REJECTED:psl_restrictive_status_approved` — the seat holds both atoms and the designation is `Mandatory`/`Sole Source` (the default buyer seat) | narrow the seat to compliance on the identity panel, or route the decision |
| Toast *"That supplier is not on the roster…"* | `POLICY_REJECTED:psl_supplier_resolved` | a hand-crafted dispatch typed an id | pick the supplier from the form's list |
| Toast *"A listing must name at least one material code"* / *"…not a material this platform carries"* | `MISSING_FIELDS:materialCodes` / `POLICY_REJECTED:psl_scope_well_formed` | codes blank, or not in the material master | use real catalog codes; raise a material request for one that does not exist |
| Toast *"The designation would end before it begins"* / *"…must both be real days"* | `POLICY_REJECTED:psl_validity_ordered` | dates inverted or unreadable | correct the dates (past dates are fine) |
| Toast *"A listing needs a written justification…"* / *"Every entry in a listing ledger carries a reason"* | `POLICY_REJECTED:psl_justification_authored` / `psl_decision_authored`, or `MISSING_FIELDS:reason` | blank or whitespace text | write it; the buttons stay disabled until it is non-blank |
| Toast *"Whoever proposed this listing may not also decide it"* | `POLICY_REJECTED:psl_decider_not_proposer` | the deciding seat is acting as the same sample identity that proposed the row | decide from a different identity, or unattributed |
| Toast *"This listing already carries that designation"* | `POLICY_REJECTED:psl_status_actually_changes` | the picked designation equals the current one | pick a different one or leave it |
| Toast *"A renewal moves the end date later…"* | `POLICY_REJECTED:psl_renewal_extends` | the new date is not after today's effective end | pick a later date; to shorten, record a cap override |
| Toast *"That end date is beyond the validity cap in force…"* | `POLICY_REJECTED:psl_renewal_within_cap` | the date exceeds *Valid from* + cap (365 by default; the override if set) | record a longer cap override first (up to 730), or renew within it |
| Toast *"This listing has already been shared with the supplier…"* | `POLICY_REJECTED:psl_not_already_published` | a second publish | nothing to do — changes reach the supplier without sharing again |
| Toast *"That cap exceeds the platform ceiling of 730 days"* / *"…a whole number of days greater than zero"* | `POLICY_REJECTED:psl_cap_within_ceiling` | cap above 730, zero, negative or fractional | record a cap within the ceiling |
| Toast *"An override with no justification is an unexplained exception"* | `POLICY_REJECTED:psl_cap_justification_authored` | blank cap justification | write why |
| *"…not in a state this action can be taken from"* | `ILLEGAL_TRANSITION` | acting on a row that already moved (e.g. deciding a listing another tab already decided) | reopen the row and take the act its state offers |
| A supplier seat gets *"This is outside what your account may see — or there is no such record"* | `SCOPE_DENIED` (thrown) | every PSL atom is buyer-side; a supplier may not act on a listing | expected; the supplier reads `/supplier/performance` only |
| Supplier's *Your preferred-supplier standing* is empty | `/supplier/performance` shows *"Paragon has not shared a preferred-supplier designation with you."* | no listing for that supplier is published | **Share with supplier** on a Listed row |
| Card reads `Expired` but the sourcing wizard still competes / Directory reads *Expired* | display status | the effective end has passed (the cap may have ended it before *Until*) | renew within the cap, raise the cap, or withdraw |
| Two people changed the designation at once and both succeeded | two ledger lines | no compare-and-set protects state-preserving verbs | expected; read the ledger and re-designate if needed |
| Wants to unpublish | no such button | by ruling — publication is write-once | withdraw the listing |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:PSL`; where the surface checks first, the control reads *"Switched off — Preferred suppliers"* | the Preferred suppliers module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:52; src/lib/glossary/refusals.glossary.ts:114; src/pages-v2/psl/pslRefusal.ts:47; src/lib/i18n/psl.ts:212; src/services/transitions/policies.ts:1248; src/services/data/mock/MockCommandService.ts:2252; src/lib/i18n/psl.ts:263; src/services/transitions/flows/psl.flow.ts:31 -->

<!-- section:testdata -->
## 9 · Test data

The store opens empty and the seed grows every row through the real verbs at start-up, in id order; ids are store-assigned. Dates below are the re-anchored values a reader sees at the declared present (31 Aug 2026); the display status is what the chip shows beside the stored state.

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Proposed | `psl-008` | — | `sup-007`, `Sole Source`, `FR-ROUD-4470`, 2026-09-05 → 2027-09-05, internal. The one row the decide panel opens on; approving it from the default seat is refused by the seat check |
| Listed | `psl-001` | — | `sup-002`, `Sole Source`, `RM-PSTN-7150` + `RM-STEAR-7300`, 2026-06-02 → 2027-06-07, **published**; shows `Listed` — drives the Directory's Sole Source badge for `sup-002` |
| Listed | `psl-002` | — | `sup-002`, `Validated`, `RM-MYRST-7310`, 2026-07-02 → 2026-10-15, internal; shows `Expiring` (in force and unshared) |
| Listed | `psl-003` | — | `sup-002`, `Mandatory`, `RM-EMUL-9410`, 2025-11-04 → 2026-08-01, **published**; shows `Expired` — under *Expired, still listed*; grants nothing |
| Listed | `psl-004` | — | `sup-005`, `Mandatory`, `AI-NIAC-6601` + `AI-PANTO-6640`, 2026-08-01 → 2027-03-19, 150-day cap → effective 2026-12-29, **published**; shows `Listed` |
| Listed | `psl-005` | — | `sup-005`, `Validated`, `AI-HYALU-6610`, 2026-08-11 → 2029-02-16, internal; shows `Listed` (effective end bounded to 2027-08-11 by the 365-day default) |
| Listed | `psl-009` | — | `sup-005`, `Mandatory`, `RM-EMUL-9440`, 2026-10-10 → 2028-01-13, internal; shows `Scheduled` — not yet in force |
| Listed | `psl-010` | — | `sup-007`, `Mandatory`, `PK-PETB-8810` + `PK-CAPF-8820`, 2026-04-01 → 2026-10-01, **published**; shows `Expiring` — the supplier's lapse line has a subject |
| Withdrawn | `psl-006` | — | `sup-007`, `Validated`, `PK-PETB-8804`, 2026-02-12 → 2026-08-26, internal; past its dates yet reads `Withdrawn`, not `Expired` |
| Withdrawn | `psl-011` | — | `sup-007`, `Validated`, `PK-CART-9901`, 2026-04-29 → 2027-03-19, **published then withdrawn** — the supplier's row shows the withdrawn line |
| Withdrawn | `psl-012` | — | `sup-008`, `Validated`, `PK-CART-9910`, 2026-02-01 → 2026-11-01, internal; the lapsed supplier for the Directory's third cell |
| Rejected | `psl-007` | — | `sup-007`, `Mandatory`, `PK-ALCP-2450`, 2026-04-03 → 2027-06-27, internal; inside its dates yet grants nothing |

Listings carry no document number — the `psl-NNN` id is the identifier and a deep-link target (`/buyer/suppliers/{supplierId}?id=psl-NNN`). No row exercises the *Bounded by the platform ceiling* cap source: the verbs refuse a cap above 730, so that arm is covered synthetically in tests only. All data is SIMULATED (see §5).

<!-- src: src/services/data/mock/pslSeed.ts:155; src/services/data/mock/pslSeed.ts:440; src/services/data/mock/stores/pslStore.ts:60; src/services/data/fixturePresent.ts:267; src/services/data/fixturePresent.ts:472; src/services/data/pslProjection.ts:298; src/services/data/mock/pslSeed.ts:63 -->
