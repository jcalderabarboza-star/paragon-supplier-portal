---
entity: pslCapSetting
locale: en
title: Preferred-supplier validity cap
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_psl_cap_set
---

<!-- section:summary -->
## 1 · What this process is

The portal-wide ceiling on how long a pre-qualification may stand before it has to be re-taken, kept as a ledger of decisions rather than a value somebody edits. An unrecorded setting and a chosen one are different facts, and a surface that could not tell them apart would report a default as though somebody had picked it. The setting bounds every preferred-supplier listing that carries no cap of its own: a listing's *Effective until* is the earlier of its authored end date and *Valid from* plus the cap in force, and a renewal may not run past that.

One buyer lane touches it. **Compliance** holds the only atom, `psl:cap-set` — the same atom that records a per-listing cap override — and procurement must not hold it, because whoever sets the portal default can extend every designation they proposed. There is one setting key, `psl.default_cap_days`, and the entity *is* that key: it is never created, only recorded against. Every recording is appended; the last entry wins; nothing ever lapses back.

The machine has a single state, **Governed**, which it never leaves. Its one verb is a state-preserving append. **The verb has no caller.** It is wired, gated and tested, and no screen in the portal fires it: there is no portal-settings surface to host it, and declaring it surfaced without a screen would turn a truthful backlog into a false claim. So today the ledger is empty and the cap in force everywhere is the compiled fallback of **365 days**, reported honestly on every listing card as *"Portal default — no cap has been set"*. The absolute ceiling is **730 days**; both this verb and the per-listing override refuse anything above it.

Honest markers. Nothing here is seeded — an empty ledger is the ruling, not an oversight, because seeding a value would put a decision on the record that nobody took. The only way to exercise the verb today is a hand-crafted dispatch under a compliance scope, which is what the command spec does. Any recording is attributed to *no identified person* unless the dispatching scope carries a sample identity. The preferred-supplier list it governs is SIMULATED (see the `psl` guide).

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 1 | Governed → same state | records a fact (state-preserving) · not active (no caller) | compliance | `t_psl_cap_set` |

There is no creation step: `Governed` is the initial state and the only state, and the target answers it for the one known key. The step repeats each time a new default is decided; every recording stays on the ledger.

**Forks**

No state has two exits. The one branch that matters is outside the machine: **with no entry**, the compiled 365-day fallback applies (`NO_SETTING_RECORDED`); **with an entry**, the latest recorded value applies (`PORTAL_DEFAULT`); **in either case** a value above the 730-day ceiling would be bounded at read (`CEILING_BOUNDED`), an arm the verbs make unreachable but a later lowering of the ceiling would not.

<!-- src: src/services/transitions/flows/pslCapSetting.flow.ts:45; src/services/data/mock/stores/pslCapSettingStore.ts:115; src/services/data/pslProjection.ts:208 -->

<!-- section:steps -->
## 3 · Step by step

### t_psl_cap_set — Record the portal default cap <!-- transition:t_psl_cap_set -->

- **Step kind:** records a fact (state-preserving) · not active (no caller)
- **Role:** buyer · compliance
- **From → to:** Governed → same state
- **Operator — where:** *not offered anywhere today.* No page, panel or button dispatches this verb; `/buyer/process-flows` lists it with its stated reason (the exact badge wording is not measured here). The only dispatch site in the tree is the command spec.
- **Operator — do:** nothing can be done from a screen. The act this verb exists for is: record the number of days a pre-qualification may stand portal-wide, so that *"nobody has decided"* stops being the answer and a later reader can see that a value was chosen and when.
- **Operator — fill:** *days* — a whole number greater than zero and at most 730. The entity id is the setting key `psl.default_cap_days`; who decided comes from the session and when from the store, so neither is a field.
- **Tester — expected state:** Governed (unchanged)
- **Tester — confirm:** only by a hand-crafted dispatch under a scope holding the compliance lane (`entity: 'pslCapSetting'`, `entityId: 'psl.default_cap_days'`, `payload: { days }`). Afterwards: the ledger holds one more entry with a store-assigned `setAt`; on `/buyer/suppliers/{supplierId}` → *Preferred list*, every listing **without** its own override changes its *Validity cap* line to *"{days} days · Portal default — a cap has been set"* and recomputes *Effective until*; a **Renew** on such a listing is now bounded by the new value; a listing with its own override is untouched. A shorter default can move a listed row's display status to `Expiring` or `Expired` without any act on that row.
- **Tester — trigger event:** `t_psl_cap_set`
- **Checks that can refuse:** `psl_default_cap_within_ceiling` — *days* must be a positive whole number (`PSL_DEFAULT_CAP_NOT_A_DURATION`) and no more than the 730-day ceiling (`PSL_DEFAULT_CAP_ABOVE_CEILING`: *"A default above the ceiling would be bounded on every read, which is a setting nobody could act on"*).
- **Glossary:** `NO_SETTING_RECORDED`, `PORTAL_DEFAULT`, `CEILING_BOUNDED`, `LISTING_OVERRIDE`, `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `NOT_FOUND`, `SCOPE_DENIED`.
- **Honesty:** wired but **not active** — no caller. The ledger ships empty by ruling, so the 365-day figure on every card is a fallback and is labelled as one. A recording is attributed to *no identified person* unless the scope carries a sample identity. An unknown setting key is refused as `NOT_FOUND` rather than silently created; a supplier scope is refused at scope. There is no update and never will be — superseding a cap means appending another entry.
<!-- src: src/services/transitions/flows/pslCapSetting.flow.ts:67; src/services/transitions/flows/pslCapSetting.flow.ts:76; src/services/transitions/policies.ts:1402; src/services/data/mock/MockCommandService.ts:2409; src/services/data/mock/MockCommandService.ts:2693; src/services/data/mock/stores/pslCapSettingStore.ts:47; src/services/data/mock/stores/pslCapSettingStore.ts:77; src/services/data/mock/stores/pslCapSettingStore.ts:93; src/services/data/pslProjection.ts:98; src/services/data/pslProjection.ts:125; src/services/data/pslProjection.ts:208; src/components/v2-features/PslListingsSection.tsx:282; src/lib/i18n/psl.ts:76; src/services/data/mock/pslCommand.test.ts:580; src/services/transitions/businessRoles.ts:328 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **No fork inside the machine.** One state, one verb, no exit.
- **Which cap binds a listing (derived at read, no transition).** **When** the listing carries its own override: that value (`LISTING_OVERRIDE`) — this ledger is not consulted. **When** it does not and this ledger is empty: 365 days (`NO_SETTING_RECORDED`) — today's answer on every row. **When** it does not and this ledger holds entries: the latest entry (`PORTAL_DEFAULT`). **When** the value that would apply exceeds 730: 730 (`CEILING_BOUNDED`) — unreachable through the verbs, kept for the day a ruling lowers the ceiling.
- **Superseding.** **When** a new default is decided: append again; the earlier entries stay on the ledger and the newest wins. There is no lapse and no review date — a cap stands until another is recorded.
- **Refusal.** **When** *days* is zero, negative, fractional or above 730: refused by name, nothing recorded. **When** the scope lacks the compliance lane (procurement included): `ROLE_NOT_PERMITTED`. **When** the entity id is not `psl.default_cap_days`: `NOT_FOUND`.

<!-- src: src/services/data/pslProjection.ts:155; src/services/data/pslProjection.ts:208; src/services/data/mock/stores/pslCapSettingStore.ts:105; src/services/transitions/policies.ts:1402; src/services/data/mock/pslCommand.test.ts:639 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| *"Portal default — no cap has been set"* | derived at read | Governed (ledger empty) | on every listing without its own override, today | `/buyer/suppliers/{supplierId}` → *Preferred list* → *Validity cap* |
| *"Portal default — a cap has been set"* | derived at read | Governed (ledger non-empty) | only after this verb has fired at least once | same card line |
| *"Bounded by the platform ceiling"* | derived at read | any | a recorded value above the ceiling (unreachable through the verbs today) | same card line |
| *"Awaiting Compliance"* | derived at read (seat vs. atom) | — | would appear beside any control for this verb; no such control exists | — |

The setting has no liveness pill of its own; the listings it bounds carry the SIMULATED marker (see the `psl` guide).

<!-- src: src/lib/i18n/psl.ts:67; src/lib/i18n/psl.ts:76; src/components/v2-features/PslListingsSection.tsx:282; src/services/data/pslProjection.ts:155 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `psl.default_cap_days` — the one setting key. No ledger entry exists; the row below describes the shape an entry would have.

| Joins to | By | Note |
|---|---|---|
| Preferred-supplier listing | read by `effectiveCap` for every listing whose `capDaysOverride` is `null` | Not a stored link — a projection reads the ledger. A listing with its own override never consults it. |
| Ledger entry | `settingId`, `days`, `setBy`, `setAt` | `setAt` is store-assigned and is also the ledger's ordering key; `setBy` is an attribution from the session, never a name. Append-only; no update. |
| Ceiling | `PSL_CAP_CEILING_DAYS` (730) | A compiled constant, ruled rather than placeholder. Both cap verbs quote it in their refusal. |
| Fallback | `PSL_DEFAULT_CAP_DAYS` (365) | The value in force over an empty ledger. Display-only in the sense that nobody chose it, and the card says so. |
| Tenant / owner | none (`readScopeOwner` is null) | A portal setting is a buyer governance record; a supplier scope is refused at scope, identically for the real key and for a string that is not one. |

<!-- src: src/services/data/mock/stores/pslCapSettingStore.ts:62; src/services/data/mock/MockCommandService.ts:2409; src/services/data/pslProjection.ts:98; src/services/data/pslProjection.ts:125; src/services/data/pslProjection.ts:208 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent`: `event` = `t_psl_cap_set`, `actor` = `buyer:all`, `ts`, `outcome`, one `correlationId`; no cascade, so no `causationId`. The ledger itself (`pslCapSettingStore`) is the setting's own history, oldest first. **No event exists today** — the verb has never fired outside the test suite, and the store opens empty.

The only sequence a tester can produce, by hand-crafted dispatch under a compliance scope:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 (tester) | Governed → Governed | compliance (`buyer:all`) | dispatch `{ days: 200 }` against `psl.default_cap_days` | `t_psl_cap_set` |
| T+1 (tester) | Governed → Governed | compliance (`buyer:all`) | dispatch `{ days: 400 }` — supersedes T+0; both entries remain | `t_psl_cap_set` |

After T+0 every listing without an override reads *200 days · Portal default — a cap has been set*; after T+1, 400. A dispatch of `{ days: 800 }` at any point is refused and leaves the ledger unchanged.

<!-- src: src/services/transitions/events.ts:26; src/services/data/mock/stores/pslCapSettingStore.ts:83; src/services/data/mock/pslCommand.test.ts:580 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| Cannot find where to set the portal cap | no control on any page | the verb has no caller — no settings surface exists | expected; a per-listing cap can still be recorded on the listing card (`t_psl_cap_override`) |
| Every listing card says *"Portal default — no cap has been set"* | the *Validity cap* line | the ledger is empty; the 365-day fallback applies | expected today; it changes only when this verb fires |
| Hand-crafted dispatch refused: *"…exceeds the platform ceiling of 730 days"* | `POLICY_REJECTED:psl_default_cap_within_ceiling` (`PSL_DEFAULT_CAP_ABOVE_CEILING`) | *days* above 730 | record a value within the ceiling |
| Refused: *"…a whole number of days greater than zero"* | `POLICY_REJECTED:psl_default_cap_within_ceiling` (`PSL_DEFAULT_CAP_NOT_A_DURATION`) | zero, negative or fractional *days* | use a positive integer |
| Refused: `ROLE_NOT_PERMITTED:psl:cap-set` | the reason string | the scope lacks the compliance lane (procurement must not hold it) | dispatch under a compliance scope |
| Thrown `NOT_FOUND` | `DataError` code | the entity id is not `psl.default_cap_days` | use the one setting key |
| Thrown `SCOPE_DENIED` | `DataError` code | a supplier scope | buyer-side only |
| Refused: `MISSING_FIELDS:days` | the reason string | payload without *days* | supply it |
| A renewal that used to fit is now refused | `POLICY_REJECTED:psl_renewal_within_cap` on a listing | a shorter default was recorded and the listing has no override | record a per-listing override, or renew within the new cap |
| An action on this flow is refused for every seat, whatever the role | the refusal names `MODULE_INACTIVE:PSL`; where the surface checks first, the control reads *"Switched off — Preferred suppliers"* | the Preferred suppliers module is switched off; its pages stay readable | have it switched back on at `/buyer/platform/modules/admin`; no role change helps, because the module check runs before the role check |

<!-- src: src/services/transitions/policies.ts:1402; src/services/transitions/refusals.ts:61; src/services/data/mock/pslCommand.test.ts:580; src/services/data/mock/MockCommandService.ts:2409; src/services/transitions/policies.ts:1327 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Governed | `psl.default_cap_days` | — | the setting key is the entity: it is addressable and reads `Governed`, but no setting is recorded against it — the ledger ships empty by ruling; the key exists as vocabulary, not as a row. The verb is wired but has no caller; exercise it only by hand-crafted dispatch. |

<!-- src: src/services/data/mock/stores/pslCapSettingStore.ts:47; src/services/data/mock/stores/pslCapSettingStore.ts:77; src/services/transitions/flows/pslCapSetting.flow.ts:76 -->
