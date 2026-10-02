# R4 · The avatar and the "Acting as" identity panel

**Pinned:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa`. Read from a `git archive` export; the working copy and the sibling were never opened or written.
**Seat:** Seat 3, consultant, Ops Project #11. Read-only. 2026-09-28.
**Browser:** own build of the export on port 4290, fresh isolated context (`localStorage` empty at first read), clock asserted native before every baseline. Screenshots in `review-drafts\screens\` — the four **annotated** ones are `Q5_A1…A4`; the numbers below refer to their red markers.
**Companion (evidence):** `_q5_code.md` — the mechanism, every guarantee traced to the test that holds it, file:line throughout.

---

## 1 · What a normal user sees — the walk, annotated

### `Q5_A1_panel_default_annotated.png` — buyer seat, panel just opened

| # | Control | What it is | What it does | Verdict |
|---|---|---|---|---|
| 1 | Avatar **"JJ"** | `const initials = persona === 'supplier' ? 'PS' : 'JJ'` — a hardcoded literal (`IdentityPanel.tsx:230`) | opens the panel | **Defect.** Two authored letters that name no role, on the one control the whole session sits behind. The operator's standing rule is roles only, never personal names; the README guard (`readmeNoPersonalNames.guard.test.ts`) does not reach the avatar. "PS" is at least derivable (PT Sample…); "JJ" is not. |
| 2 | SIGNED IN AS · **Buyer** | `nav.persona.*` | states the side | Keep, re-word. "Buyer" is a side here and a zero-atom role two blocks down (6). A reader meets the word twice with two meanings. |
| 3 | ACTING AS · **No sample user** + "Acts are recorded without an identified person, exactly as before." | actor = `UNATTRIBUTED: NO_PERSON_IN_SESSION` | headline | Honest, but reads as a malfunction to a first-time user ("no user?"). |
| 4 | The **sample-user roster**, always expanded, scrolling at `max-h-48` | 8 buyer rows (+ "No sample user") / 3 supplier rows | picking one **replaces the actor AND replaces `businessRoles` with the row's roles** (`IdentityPanel.tsx:179-201`) | **Demo machinery in the most prominent slot.** Only 4 of 9 rows are visible without scrolling; the roles list (6) — the thing the panel exists to state — is collapsed underneath. |
| 5 | ACCESS SCOPE · "All suppliers (buyer-side)" + "Contact your administrator…" | `supplierId` | read-only, deliberately (`IdentityPanel.test.tsx:62`) | **The one line a real user needs.** "buyer-side" is our jargon. |
| 6 | ROLES · "6 role(s) · 51 permissions" · **Procurement +5** ▾ | `held`, `atomsForSeat(held).length` | opens the toggle list (`Q5_A2`) | Keep the role line; the atom count ("permissions") is meaningless without `/buyer/roles`. Rendered value on this build: **51**, while `_q5_code.md` quotes an example of 36 — derive it, do not restate it. |
| 7 | Demo marker, three sentences | `roles.ts:91-92` | — | Honest and necessary; too long for the bottom of every open. |
| 8 | **Buyer / Supplier** pill in the **sidebar** | `SidebarV2.tsx:190-235` | writes the WHOLE seat: re-seeds roles, drops the sample user, resets the tenant, navigates | **Second identity control, in a different chrome region.** Measured: clicking it wiped a selected sample user and any narrowing without a word (`identityAfterSwitchBack` = seeded six roles, `UNATTRIBUTED`). The panel's own guard copy sends users to the sidebar (`identity.ts:26, 36`). |
| 9 | Language menu · EN / Bahasa Indonesia | `LanguageMenu.tsx` | persists `paragon.lang` | Sound; the one top-bar control with proper roving focus. |
| 10 | Bell with a red **3** | `TopBarV2.tsx:60-69` | **nothing** — the `3` is a literal | Dead affordance with a fabricated count, 30 px from the avatar. |
| 11 | Search "(Ctrl K)" | `TopBarV2.tsx:49-53` | **nothing** — no handler; the shortcut is a promise | Dead affordance (`UNRULED` in `deadAffordance.guard.test.tsx:512-513`). |
| 12 | Hamburger | `TopBarV2.tsx:19-25` | **nothing** | Dead affordance. |

### `Q5_A2_roles_menu_annotated.png` — the roles list open

| # | What | Verdict |
|---|---|---|
| 13 | Eight `menuitemcheckbox` rows: Buyer · Procurement ✓ · Receiving ✓ · Finance ✓ · Compliance ✓ · Planning ✓ · Requisitioner ✓ · Buyer Operations Lead | A seat re-widening itself is demo machinery; a real seat cannot do this. The list opens **below the demo marker**, so on a 900-px viewport it is clipped inside the panel's scroll. No arrow-key roving (0 `ArrowDown` handlers vs `LanguageMenu.tsx:87-116`). |
| 14 | **Buyer** (the zero-atom anchor) offered as a toggle | Holds nothing; toggling changes nothing; the redundancy notice is silent on it by construction (`mine.size === 0`, `IdentityPanel.tsx:93`). A control with no effect and no explanation — a ruling, not a polish (`identityPanelBuyerAll.test.tsx:68` asserts the exact offer). |

### `Q5_A3_sample_selected_annotated.png` — after picking "Planning 1"

| # | What | Measured | Verdict |
|---|---|---|---|
| 15 | ACTING AS · **Planning 1 (SAMPLE)**; help text changes to "Pick a sample user so acts are recorded against a named role…" | `paragon.identity.actor = { kind: 'RESOLVED', person: { personId: 'sim-usr-planning-1' } }` | The SAMPLE marker is on the headline — correct, and it is the resolver's doing, not the panel's (`personLabel.ts`). |
| 16 | ROLES collapsed from "6 role(s) · 51 permissions" to **"1 role(s) · 6 permissions · Planning"** | `businessRoles: ['planning']` | **Picking a person silently narrowed the seat.** Nothing in the panel says "you now hold Planning only"; the lane chips on the dashboard shrank to "All lanes · Planning" and `/buyer/purchase-requisition` now shows `handoff-pr-create: Awaiting Requisitioner` where the New PR button was (`Q5_06`). Correct behaviour, unannounced. |
| 17 | "Your last role cannot be removed — a seat with none reads as a broken portal…" | `IdentityPanel.tsx:446-453` | Correct guard; long. |

### `Q5_A4_supplier_persona_annotated.png` — supplier seat

| # | What | Measured | Verdict |
|---|---|---|---|
| 1 | Avatar **"PS"** | literal | as above |
| 18 | ACCESS SCOPE · "PT Sample Packaging Indonesia only" | `supplierId: 'sup-007'` seeded by the sidebar switch | Good. But there is **no tenant picker**: the only way to become sup-002 or sup-005 is to pick "Supplier 1/2/3" in the roster (19), which flips the tenant **and every list in the app** with only this line changing. |
| 19 | Roster rows "Supplier 1 · Supplier 2 · Supplier 3" | ordinal labels (`sampleRoster.ts:131-135`) | The reader cannot tell which tenant a row is until after clicking. |
| 20 | Dashboard header: "Last login: **5 April 2026** · Channel: WhatsApp" | authored literal on the supplier dashboard | **Fabricated fact.** No login exists (the `/login` route accepts any credentials and is unlinked); the date is a fixture string presented as a session fact. Out of the panel but on the same screen the panel opens over. |

**ID locale** (`Q5_10`, `Q5_11`): every panel string is translated; the marker is `CONTOH`, not `SAMPLE`, by design; "Semua pemasok (sisi pembeli)" carries the same "buyer-side" jargon. Parity 20/20 keys (`identity.ts`). No gap in this lane.

---

## 2 · What confuses, what is redundant, what is demo-only

**Confuses a normal user (a planner or supplier clerk after the IdP lands):**
- Two controls in two places decide who you are (sidebar pill, avatar panel), and one silently undoes the other.
- "No sample user" / "Acts are recorded without an identified person" as the first thing under ACTING AS.
- Picking a person changes your roles; nothing says so.
- Jargon on the read path: "buyer-side", "permissions", "Demonstration seat", `Buyer` as a role.
- Three dead controls beside the avatar, one of them showing a fabricated `3`.

**Redundant:** the role is stated twice (the "+5" trigger and the checked list); the persona is stated twice (sidebar pill and SIGNED IN AS); the demo caveat is stated twice (help text under ACTING AS and the marker at the bottom).

**Demo machinery that should be tucked away:** the roster (4), the role toggles (13/14), the persona pill (8), the demo marker (7), the `/login` route (any credentials work; "Forgot password?" is a no-op; unlinked — `Login.tsx:35-63, 198`). All of it is legitimate for a demonstration seat; none of it belongs on the first screen of the panel.

---

## 3 · The guarantees that must survive (and what holds each)

Traced in `_q5_code.md §3`; the ones that decide the proposal:

| Guarantee | Holder | Kind |
|---|---|---|
| Sample users are **opt-in**; the seat opens `UNATTRIBUTED` | `identitySources.ts:42, 49`; `identitySourcesActor.test.ts:129` | test |
| The **SAMPLE marker** at every render site | `personLabel.ts:49-54` is the one resolver; `personLabelGuard.test.ts` derives every `personId` read from source; `personIdNeverRendered.test.ts` fires the refusal in EN and ID | test, bilateral |
| **Narrowing is shown** — panel divergence line and 64 `handoff-…` sites across 23 files | `IdentityPanelDivergence.test.tsx`; `handoff*.test.tsx` | test |
| No persona fallback; every scope carries `businessRoles` | `commandHooks.ts:50-51`; `businessRoles.test.ts` | test |
| The panel is the **one role control**; no sidebar chip block | `IdentityPanel.tsx:29-33` + CLAUDE.md §65 | **prose only** |
| "No sample user" is always offered | `IdentityPanel.tsx:292-310` | **prose + render only** — no spec pins the `identity-person-none` item |
| Last role cannot be removed | `IdentityPanel.test.tsx:134`; `identityPanelBuyerAll.test.tsx:113-135` | test |
| Roster membership, never a `sim-usr-` prefix | `sampleRoster.ts:180-182`; `simUsrNamespace.test.ts` | test |
| Two opposite-direction locks (sample actor cannot loosen enforcement / complete an override; a real actor still passes) | `policies.ts:372-377, 1743-1747`; `enforcement.ts:834-837`; `sampleIdentityLocks.test.ts:65-131` | test, bilateral |
| Custom roles persisted, re-validated on read, corrupt ≠ empty | `customRoles.ts:260-308`; `customRoles.test.ts` | test |
| Persona switch navigates to the side's dashboard (NAV-01) | `SidebarV2.test.tsx:12-37` | test — **any move of the pill rewrites this** |

Two guarantees are held by prose alone (one role control; "None" always offered). A restyle that forgets either will not go red. Both should get a one-line spec in the batch that touches the panel.

**One CLAUDE.md claim is half false and belongs here because it is about attribution:** "`t_role_grant` is recorded against UNATTRIBUTED and the surface says so before the act." The store records `grantedBy: asActorAttribution(scope.actor)` — a selected SAMPLE person **is** recorded — while the copy says "taken by nobody" unconditionally, and a neighbouring string says the grant is "gone on reload" while the store persists (`roles.ts:239-241, 377`; `MockCommandService.ts:1470`). Both locales.

---

## 4 · Proposal — the simplest honest version

**Principle.** The panel answers three questions in its first three lines — *who am I (role, with the SAMPLE marker when acting), what is my scope, what may I do* — and everything that lets a seat CHANGE itself sits behind one collapsed **"Demonstration seat"** disclosure that the IdP batch later deletes whole. Nothing that follows removes a guarantee.

| Today | Proposed | Guarantee touched |
|---|---|---|
| Avatar `JJ` / `PS` (literal) | A role glyph, or the initial of the persona label from i18n — never an authored token | none |
| Sidebar Buyer/Supplier pill (8) | **Moves** into the disclosure; the sidebar becomes navigation only | NAV-01 test rewritten against the new location — **operator ruling** (the pill is a ruled surface) |
| SIGNED IN AS · Buyer | **Headline = "Acting as: Planning 1 (SAMPLE)"** when a person is chosen, else **"Role: Procurement +5"**. One line, the marker on it | SAMPLE marker moves UP; resolver unchanged |
| ACTING AS help + 9-row roster, expanded (3, 4) | **Moves** into the disclosure, collapsed like the roles list; supplier rows show the tenant name; picking a supplier row shows one line "Scope changed to PT … only"; picking any row shows "Roles now: …" | opt-in unchanged (default still None); "None" item pinned by a spec |
| ACCESS SCOPE + "Contact your administrator" (5) | **Stays**, second line, without "buyer-side" | none |
| "6 role(s) · 51 permissions" (6) | Role names only; atom count moves into the disclosure with a link to `/buyer/roles` | none |
| Role toggles + redundancy + last-role notices (13, 14, 17) | **Move** into the disclosure unchanged; add arrow-key roving and focus-on-open | last-role guard unchanged; anchors-as-toggles left to a ruling |
| Demo marker, 3 sentences (7) | One line as the disclosure's header: "Demonstration seat — roles are enforced; switching here is a demo control saved in this browser." | none |
| Bell `3`, search, hamburger (10, 11, 12) | **Go**, or receive rulings in the dead-affordance table (the smaller change) | none |
| `/login` password form | **Goes**; keep a demo landing with the two "View as" buttons, or delete the route | none |
| Supplier dashboard "Last login: 5 April 2026" (20) | **Goes** (no login exists) | none |

**What stays exactly as is:** the resolver, the roster module, the locks, `handoff.ts` and the 64 notices, `customRoles`, storage keys, every `data-testid`.

### Batches

| Batch | Content | Tests that change | Must not change | Confidence |
|---|---|---|---|---|
| **B1 — chrome and copy honesty** | avatar literal; bell/search/hamburger (delete or rule); `/login`; "Last login"; the two contradictory grant strings + an `ActorPreActNotice` on the grant | `TopBarV2.test.tsx`, dead-affordance rulings table, roles i18n smoke | every identity / roster / lock spec | High — 1 PR |
| **B2 — panel restructure** | headline + scope first; disclosure for roster / roles / marker; roster collapsed; tenant name on supplier rows; the two "changed" lines; roving focus; spec for the "None" item and for "one role control" | `IdentityPanel.test.tsx` (structure), `identityPanelBuyerAll.test.tsx` and `IdentityPanelDivergence.test.tsx` (open the disclosure first) — **keep every `data-testid`** | `personLabelGuard`, `personIdNeverRendered`, `sampleRoster`, `sampleIdentityLocks`, `identitySourcesActor`, `identityTenancy`, `simUsrNamespace`, `customRoles` | High — 1 PR, browser QA mandatory |
| **B3 — one identity control** | persona pill out of the sidebar into the disclosure; re-word `identity.noSupplier.*` / `unresolvedTenant.body` which point at the sidebar | `SidebarV2.test.tsx` NAV-01 | as B2 | Medium — 1 PR, **needs the operator's ruling** |
| **B4 — post-IdP** | delete the disclosure, `Login.tsx`, the roster from the panel (roster stays for seeds and tests) | many, by design | locks (a REAL actor still passes) | later |

---

## 5 · Decisions the operator must make (from this file)

1. **Move the persona pill out of the sidebar** (B3) — it is a ruled surface with its own test.
2. **The zero-atom anchors as toggles** (14): hide them, or keep them and explain them.
3. **The three dead top-bar controls**: delete now, or rule them in the dead-affordance table until they are built.
4. **Delete `/login`** or reduce it to a demo landing.
