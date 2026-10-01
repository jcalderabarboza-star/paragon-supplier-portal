---
entity: role
locale: en
title: Custom role (duplicate-and-add)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_role_grant
---

<!-- section:summary -->
## 1 · What this process is

A copy of one permission bundle with extra permissions on top of it, kept as a record of what was copied and by whom — so a seat somebody invented last Tuesday reads differently from a standard one.

The entity is the **system role being copied** (the parent). The portal's system roles are compiled-in permission bundles — on the buyer side `buyer` (an anchor that grants nothing), the six lanes `procurement`, `receiving`, `finance`, `compliance`, `planning`, `requisitioner`, and `buyer_all`; on the supplier side `supplier` (anchor), `commercial`, `fulfilment`, `back_office`; and `admin`, which spans both tenancies and is the one role that can never be copied. A **custom role** is stored as `{ parent, adds }` — a reference to its parent plus the permissions added — never as a snapshot of permissions, so when a parent gains a permission every copy gains it too. The merge rule is the union: a custom role is always a superset of its parent. Widening never removes anything; a custom role cannot reach across to the other side.

Who touches it: the **buyer's compliance lane** creates a custom role. Whoever can edit roles can grant themselves any action, so procurement does not hold this — it would let the same party lower the bar it is measured against. Every seat can read the catalogue at `/buyer/roles`; creating is one lane's act, and the panel says whose.

Honest markers. Single-state machine (`Defined`): the verb appends a grant record and changes nothing about the parent. A custom role is **saved in this browser only** (`localStorage`, key `paragon.customRoles`) — it survives a reload, is not shared with anyone, is not on a server, and goes when site data is cleared; system roles are never written there. The grant is recorded against `UNATTRIBUTED: NO_PERSON_IN_SESSION` (or a sample identity if one is adopted) because there is no user directory yet; the panel says so before the act. **Assigning a custom role to a seat is not built** — the identity panel enumerates system roles only — so a custom role today is a catalogued, recorded definition rather than a seat anybody opens with.
<!-- src: src/services/transitions/flows/role.flow.ts:1-99; src/services/transitions/customRoles.ts:1-104,154,427-433; src/services/transitions/businessRoles.ts:484-510,582-583,700-707; src/lib/i18n/processFlowPurpose.ts:332-336; src/lib/i18n/roles.ts:195-244 -->

<!-- section:lifecycle -->
## 2 · Lifecycle walk

| Step | From → to | Kind | Role | Transition |
|---|---|---|---|---|
| 0 | ∅ → Defined | a system role exists by being compiled in (no creation verb; an unknown parent is `NOT_FOUND`) | — | — |
| 1 | Defined → Defined | records a fact (state-preserving): a custom role copying this parent is granted | buyer · compliance | `t_role_grant` |

**Forks**

- **At Defined:** `t_role_grant` — compliance — when a seat is wanted that holds one bundle plus a few permissions from elsewhere on the same side. The parent is unchanged; only its ledger grows. No other exit exists.
<!-- src: src/services/transitions/flows/role.flow.ts:56-99; src/services/data/mock/MockCommandService.ts:1644-1663 -->

<!-- section:steps -->
## 3 · Step by step

### t_role_grant — Create role <!-- transition:t_role_grant -->

- **Step kind:** records a fact (state-preserving)
- **Role:** buyer · compliance (atom `role:grant`)
- **From → to:** Defined → same state
- **Operator — where:** `/buyer/roles` → the panel **Create a custom role** (shown only to a seat holding `role:grant`; every other seat sees **Editing roles is a compliance action** with an *Awaiting Compliance* notice and a line explaining that the demo seat switcher lets you take the role yourself) → **Create role**.
- **Operator — do:** Copy one system role and add permissions to it. Choose the parent under **Copy from**; the **Permissions to add** chips offer only permissions on the same side that the parent does not already hold. The new role appears in the catalogue with a **Custom role** badge and opens at `/buyer/roles/:roleId` like any other.
- **Operator — fill:** **Copy from** (the parent — it is the entity, not a field), **Role code** (`roleId`: lowercase letters, digits and hyphens, 2–48 characters), **Display name** and **Description** (2–80 characters each, user text, shown verbatim in both locales), and at least one permission under **Permissions to add** (`adds` — an empty list is refused as a missing field, because a copy that adds nothing is a second name for the parent).
- **Tester — expected state:** Defined
- **Tester — confirm:** toast *Role {id} created…*; the catalogue's **Roles** tile and split counts climb; the row carries **Custom role**; the detail page lists the parent's permissions plus the additions; the definition is in `localStorage` under `paragon.customRoles` and is still there after a reload.
- **Tester — trigger event:** `t_role_grant`
- **Checks that can refuse:** `role_grant_governed` — the parent must be a system role and must sit on one side (`admin` spans both and cannot be copied); the role code must be a valid slug, not a system role id, not `automation`, and not already granted; display name and description must be 2–80 characters and must not begin with the app's translation namespace; each added permission must be one some transition requires, must not already be held by the parent, must have a human owner (a machine-only permission is refused), and must be on the parent's side (a cross-tenancy permission is refused by name); and the scope must carry an actor — an explicit `UNATTRIBUTED` one is accepted, because a grant that lives in one browser is a demonstrable act rather than a durable ungoverned one.
- **Glossary:** ROLE_NOT_PERMITTED · MISSING_FIELDS · POLICY_REJECTED · SCOPE_DENIED · NOT_FOUND · NO_PERSON_IN_SESSION
- **Honesty:** the grant is recorded against nobody the platform can name (the panel states this before the act). It persists in this browser only. The success toast still reads *…gone on reload*, which is the wording from before persistence was ruled; the panel's own note (*saved in this browser and will survive a reload*) is the accurate one. The store re-validates every saved row on read with the same predicates the verb uses, and the catalogue shows a notice if saved data is unreadable or a row was refused. No screen assigns the new role to a seat.
<!-- src: src/services/transitions/flows/role.flow.ts:65-97; src/services/transitions/policies.ts:389-470; src/services/transitions/customRoles.ts:468-553; src/services/data/mock/MockCommandService.ts:1644-1663; src/services/query/commandHooks.ts:972-997; src/pages-v2/roles/CreateRolePanel.tsx:74-266; src/pages-v2/RolesCatalogue.tsx:80,185-200; src/lib/i18n/roles.ts:208-256 -->

<!-- section:forks -->
## 4 · Decision forks and exception paths

- **Same-side addition or cross-tenancy (at Defined).** Branch A — `t_role_grant` with same-side permissions — **When:** the additions are held by some role on the parent's side; accepted. Branch B — a buyer-side parent with a supplier-side permission (or the reverse) — **When:** a hand-crafted payload names one; refused per permission by name (`'<atom>' is a supplier-side permission and '<parent>' is buyer-side`). The form cannot construct this case; the verb refuses it anyway.
- **Copying `admin` (exception).** Refused: `admin` spans both tenancies and a copy of it would too.
- **Adding what the parent already holds (exception).** Refused: an addition must add something.
- **Adding a machine-only permission (exception).** Refused: permissions held only by the automation grant (cascade targets and external facts) have no human owner.
- **Empty additions (exception).** `MISSING_FIELDS:adds` from the dispatcher, before any policy runs.
- **Duplicate or reserved code (exception).** A code already granted, a system role id, or `automation` is refused by name.
- **Parent drift (derived, not a verb).** If a parent ever loses a permission across a deploy, the custom role keeps it and names it as retained (`parentAtomsAtGrant` is the baseline). Unreachable today — bundles are frozen constants — and it has no surface by ruling.
<!-- src: src/services/transitions/policies.ts:405-470; src/services/transitions/customRoles.ts:26-42,415-425,495-553; src/services/transitions/flows/role.flow.ts:77-83 -->

<!-- section:flags -->
## 5 · Exception flags

| Flag | Kind | Applies at | When it appears | Where shown |
|---|---|---|---|---|
| Custom role badge | derived at read | Defined | a role is not a system role | `/buyer/roles` row and `/buyer/roles/:roleId` |
| Saved roles could not be read | derived at read | — | `localStorage` holds data that could not be parsed; no custom roles are loaded (distinct from having none) | `/buyer/roles` notice |
| Some saved roles were not loaded | derived at read | — | a saved row failed the verb's own predicates on read; the row and its reason are listed | `/buyer/roles` notice |
| Validation suspended | derived at read | — | the permission catalogue was empty at read time (flows not yet registered), so rows are neither accepted nor refused | store read state (`suspended`) |
| Awaiting Compliance (handoff) | derived at read | Defined | the seat does not hold `role:grant` | the create panel's gate |
| Recorded against nobody | recorded | Defined | every grant today (`UNATTRIBUTED: NO_PERSON_IN_SESSION`, or a sample identity) | stated on the panel before the act |
| Retained from parent | derived at read | Defined | a parent dropped a permission after the grant; empty in every reachable state today | no surface (by ruling) |
<!-- src: src/services/transitions/customRoles.ts:160-181,415-425; src/pages-v2/RolesCatalogue.tsx:80,185-200; src/pages-v2/roles/CreateRolePanel.tsx:97-130,253-255; src/lib/i18n/roles.ts:97-98,251-256 -->

<!-- section:linked -->
## 6 · Linked objects

**Representative entity:** `compliance` (a parent system role id; there is no document number and no fixture store).

| Joins to | By | Note |
|---|---|---|
| System role definitions (`SYSTEM_ROLES`) | `entityId` = parent id | the parent's permissions as they are now — resolved at read, never copied |
| Custom role definition | `parent` | `{ id, parent, displayName, description, adds, parentAtomsAtGrant, grantedBy, grantedAt }` in `localStorage` |
| Permission catalogue | `adds[]` | every permission some registered transition requires; the offer and the refusal read the same functions |
| Roles catalogue view | `deriveRoleViews()` | system and custom roles in one list; the custom row's side is its parent's side |
| Seat resolution | `atomsForSeat` | a seat holding a custom role id would resolve to the union — but no screen assigns one today |
| Audit trail | `TransitionEvent` for `t_role_grant` | the only privilege-granting act in the platform with an event, by design |

Display-only: a custom role's display name and description are user text passed through the translator as their own key, so they render verbatim in both languages. `grantedAt` and `parentAtomsAtGrant` are store-assigned, never fields.
<!-- src: src/services/transitions/customRoles.ts:91-104,404-458; src/pages-v2/roles/roleModel.ts:96-150; src/services/transitions/businessRoles.ts:582-583,700-707 -->

<!-- section:history -->
## 7 · Status history

Every dispatch writes one `TransitionEvent` (`event` = `t_role_grant`, `actor` = `buyer:all`, `ts`, `outcome`, `correlationId`); refusals are written too. The definition itself carries `grantedBy` (an attribution) and `grantedAt`. There is no per-role history view; the catalogue shows the current set.

Worked sequence for parent `compliance`, as a tester holding compliance would produce it:

| Time | From → to | Actor (role) | Trigger | Event |
|---|---|---|---|---|
| T+0 | Defined (refused) | buyer · compliance | **Create role** with no permissions ticked | `t_role_grant`, `outcome: failed`, `MISSING_FIELDS:adds` |
| T+1 | Defined → Defined | buyer · compliance | **Copy from** Compliance, code `compliance-plus-psl`, name and description filled, one same-side permission ticked → **Create role** | `t_role_grant` |
| T+2 | Defined (no change) | — | reload the page: the row is still listed with the **Custom role** badge, read back from `paragon.customRoles` and re-validated | — (no event) |
<!-- src: src/services/transitions/events.ts:127-129; src/services/transitions/customRoles.ts:91-104,258-336; src/pages-v2/roles/CreateRolePanel.tsx:132-156 -->

<!-- section:troubleshooting -->
## 8 · Troubleshooting

| Symptom | How to tell | Likely cause | Resolve |
|---|---|---|---|
| No create panel; **Editing roles is a compliance action** with *Awaiting Compliance* | gate section at the top of `/buyer/roles` | the seat does not hold `role:grant` | open the avatar and select Compliance (a demo control) |
| Toast *Refused: 'x' is already held by 'procurement'* | `POLICY_REJECTED:role_grant_governed` | an addition the parent already carries | untick it; the chips normally hide these |
| *Refused: '…' is a supplier-side permission and '…' is buyer-side* | `POLICY_REJECTED:role_grant_governed` | cross-tenancy addition (hand-crafted payload) | keep additions on the parent's side |
| *Refused: 'admin' spans both tenancies and cannot be copied* | `POLICY_REJECTED:role_grant_governed` | `admin` chosen as parent (not offered by the form) | choose a sided parent |
| *Refused: '…' is not a role id* / *is already a system role* / *has already been granted* | `POLICY_REJECTED:role_grant_governed` | bad or duplicate code | choose a lowercase slug not yet used |
| *Refused: displayName must be 2-80 characters of text* | `POLICY_REJECTED:role_grant_governed` | too short or too long | shorten or lengthen |
| Toast *Refused: MISSING_FIELDS:adds* | dispatcher | nothing ticked | tick at least one permission |
| *This role already holds every permission on its side* | panel note under **Permissions to add** | the parent is `buyer_all` or another superset | choose a narrower parent (`buyer` holds nothing and is the natural base) |
| Notice **Saved roles could not be read** | `/buyer/roles` | corrupt `localStorage` | creating a role overwrites the unreadable data |
| Notice **Some saved roles were not loaded** | `/buyer/roles`, rows listed with reasons | hand-edited saved data failed the verb's predicates | fix or remove the row; the rules are the verb's |
| Toast says *gone on reload* but the role is still there | success toast | stale wording from the session-scoped ruling | expected; the panel note is authoritative |
| Cannot give the new role to a seat | identity panel lists system roles only | assignment is not built | expected today |
<!-- src: src/services/transitions/policies.ts:405-470; src/services/transitions/customRoles.ts:495-553; src/pages-v2/roles/CreateRolePanel.tsx:97-130,141-150,216-219; src/lib/i18n/roles.ts:211-256 -->

<!-- section:testdata -->
## 9 · Test data

| State | Fixture id(s) | Number | Note |
|---|---|---|---|
| Defined | `buyer`, `procurement`, `receiving`, `finance`, `compliance`, `planning`, `requisitioner`, `buyer_all`, `supplier`, `commercial`, `fulfilment`, `back_office`, `admin` | — | no store — the entity ids are the system role ids, each read as `Defined`; offered as parents: buyer side `buyer` … `buyer_all`, supplier side `supplier` … `back_office` (`admin` exists but cannot be copied); no custom role is seeded; any custom role present was created in this browser and lives in `localStorage` under `paragon.customRoles` |
<!-- src: src/services/transitions/businessRoles.ts:484-510,582-583,700-707; src/services/transitions/customRoles.ts:154; src/services/transitions/customRoles.ts:495-508 -->
