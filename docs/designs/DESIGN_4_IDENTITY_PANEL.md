# DESIGN 4 · The avatar and the identity panel — the simplest honest version

**Seat 3, consultant, Ops Project #11 · 2026-09-28 · DRAFT FOR OPERATOR RULING · READ-ONLY session (nothing written in the repo).**
**Pinned tree:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa`, read from the reviewer's `git archive` export; every file:line is against that tree.
**What this document is:** the fourth design draft, on the R4 lane as the operator confirmed on 2026-09-28: the top-right avatar, the "Acting as" panel, the persona switch, the lane toggles, the sample-user picker, the narrowing notice and the language menu — made simpler and cleaner **without removing a guarantee** (opt-in sample users, the SAMPLE marker, narrowing shown). It builds on `R4_AVATAR_IDENTITY.md` and `_q5_code.md` (markers 1–20 on screens `Q5_A1…A4`).
**Standing rulings applied:** roles, never personal names; the panel is the ONE role control (§65); a sample identity may never accept governance risk; every batch that changes a rendered surface carries browser QA.

> ⚠️ **Coordination note.** Seat 2's H3 batch (dispatched 2026-09-28, in flight at the time of writing) rules on the dead controls in the residue table, including the top bar's nav toggle and bell. Design 4's B1 takes whatever H3 leaves and must be rebased on the merged tree; it does not pre-empt H3's rulings.

---

## 0 · The one-page version

1. **Three questions in three lines.** The panel opens on *who am I* (the role, with the SAMPLE marker on the headline when a person is chosen), *what is my scope*, *what may I do* (the role names, linking to `/buyer/roles`). Nothing else is above the fold.
2. **Everything that lets a seat change itself is demo machinery and goes behind one collapsed disclosure** titled *Demonstration seat*: the persona switch (moved from the sidebar, pending the ruling), the sample-user roster (collapsed, tenant names on supplier rows), the role toggles with their two notices, the atom count, and a one-line marker. The IdP batch later deletes the disclosure whole.
3. **Two silent side effects become announced.** Picking a sample person narrows the seat; picking a supplier person flips the tenant. Both get a one-line notice in a live region and a line in the divergence notice, so a user is told what changed the moment it changes.
4. **Chrome honesty.** The hardcoded `JJ` / `PS` initials go (a role glyph or the persona's initial from i18n); the fabricated bell count, the dead search and the dead nav toggle are deleted or ruled (in step with H3); `/login` becomes a demo landing or is deleted; the supplier dashboard's fabricated *Last login* goes; the two contradictory grant strings on the roles page are fixed with `ActorPreActNotice`.
5. **Two guarantees held by prose alone get a spec each**: the *No sample user* item always offered, and *one role control* (no second writer of `businessRoles` outside the panel and the disclosure). Every existing identity, roster and lock spec stays green; every `data-testid` is kept.
6. **Four batches, all of them the SE Team's (SE-18) under the operator's ruling of 28 Sep 2026**, including moving the persona pill out of the sidebar (B3) and the post-IdP deletion (B4).

---

## 1 · What is kept, exactly

| Guarantee | Holder | Status after this design |
|---|---|---|
| Sample users are opt-in; the seat opens `UNATTRIBUTED: NO_PERSON_IN_SESSION` | `identitySources.ts`, `identitySourcesActor.test.ts` | unchanged |
| The SAMPLE marker on every rendered person, through the one resolver | `personLabel.ts`, `personLabelGuard.test.ts`, `personIdNeverRendered.test.ts` | unchanged; the marker moves UP to the headline because the headline renders through the same resolver |
| Narrowing is shown — divergence line and every `handoff-…` site | `IdentityPanelDivergence.test.tsx`, the handoff specs | unchanged; gains the two announced side effects |
| No persona fallback; every scope carries `businessRoles` | `commandHooks.ts`, `businessRoles.test.ts` | unchanged |
| Last role cannot be removed | `IdentityPanel.test.tsx`, `identityPanelBuyerAll.test.tsx` | unchanged (moves into the disclosure with the toggles) |
| Roster membership, never a `sim-usr-` prefix | `sampleRoster.ts`, `simUsrNamespace.test.ts` | unchanged |
| The two opposite-direction locks (a sample actor cannot loosen or complete an override; a real one passes) | `sampleIdentityLocks.test.ts` | unchanged |
| Custom roles persisted and re-validated on read | `customRoles.ts`, `customRoles.test.ts` | unchanged |
| Tenant name from the master, never storage; cross-persona person refused on reload | `identityTenancy.test.ts`, `identitySourcesActor.test.ts` | unchanged |
| Persona switch navigates to the side's dashboard (NAV-01) | `SidebarV2.test.tsx` | rewritten against the new location in B3 only; unchanged in B1/B2 |
| Every `data-testid` the specs address | `IdentityPanel.tsx` | kept byte-for-byte; new ids are added, none renamed |

---

## 2 · The panel, top to bottom

### 2.1 Layout

```
[avatar]  ── role glyph (buyer: shield · supplier: building) or the persona label's initial from i18n — never an authored token

┌ identity-panel (role="dialog", focus lands on the headline on open, Esc closes inner-then-outer as today) ┐
│ HEADLINE   identity-acting-as / identity-current-role                                                       │
│   with a person:  "Acting as: Planning 1 (SAMPLE)"        — one line, the marker on it (personLabel)         │
│   without:        "Role: Procurement +5"                   — role names only; no atom count here             │
│ SCOPE      identity-scope   "All suppliers" | "PT Sample Packaging Indonesia only"                           │
│            identity-scope-handoff  "Changing your scope is your administrator's act."                        │
│ CAN DO     identity-roles-summary  "Procurement · Receiving · Finance · Compliance · Planning · Requisitioner"│
│            → link "What each role may do" → /buyer/roles (read-only catalogue)                               │
│ NOTICES    identity-narrowed (divergence, unchanged) · identity-changed (new, live region, see §2.3)         │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────────────── │
│ ▸ Demonstration seat   (identity-demo-disclosure, collapsed by default, remembered for the session only)     │
│     header line: "Roles are enforced on every governed act. Switching here is a demo control saved in       │
│                   this browser; there is no user directory yet."                                            │
│     [Buyer | Supplier]  persona switch (B3, from the sidebar) — identity-persona-switch                      │
│     Sample user  ▾  identity-people-list (collapsed; "No sample user" first, always; supplier rows read      │
│                     "Supplier 1 · PT Sample Specialty Fats")                                                 │
│     Roles        ▾  identity-roles-list (the toggles; identity-roles-redundant · identity-roles-last as today)│
│     "N permissions across these roles" → /buyer/roles                                                        │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

`identity-persona` (SIGNED IN AS · Buyer) is retired from the fold: the side is stated once, by the scope line and by the disclosure's switch. The `data-testid` stays on a visually-hidden element until B3 rewrites its spec, so no test goes red for a reason that is not a behaviour change.

### 2.2 Copy — the jargon that goes

| Today | After (EN) | Why |
|---|---|---|
| SIGNED IN AS · Buyer | (retired from the fold) | "Buyer" is a side and a zero-atom role two blocks down; one word, two meanings |
| ACTING AS · No sample user / "Acts are recorded without an identified person, exactly as before." | Role: Procurement +5 | the honest absence stays available in the disclosure; it is not the first thing a user reads |
| All suppliers (buyer-side) | All suppliers | "buyer-side" is our jargon |
| 6 role(s) · 51 permissions | six role names | the atom count is meaningless without the catalogue; it moves beside the link to it |
| Demonstration seat, three sentences | one line as the disclosure header | said once, where the demo controls are |
| Supplier 1 · Supplier 2 · Supplier 3 | Supplier 1 · PT Sample Specialty Fats, … | the tenant name from the master beside the ordinal — the reader knows which tenant before clicking |

ID copy follows in the same batch; parity is asserted by the existing locale instrument; the marker stays `CONTOH`.

### 2.3 The two announced side effects

- **Picking a sample person** replaces `businessRoles` with the row's roles (today: silent). After: the divergence line renders as it does, **and** a one-line notice `identity-changed` (`role="status"`, `aria-live="polite"`) says *Roles now: Planning*. On the dashboard the lane chips already shrink; the notice is what tells the user why.
- **Picking a supplier person** replaces `supplierId` (today: silent, only the scope line moves). After: the same notice says *Scope changed to PT Sample Specialty Fats only*; the scope line updates as today.
- Both notices are derived from the before/after identity in `selectPerson`, never stored; they clear when the panel closes.

### 2.4 Keyboard and screen reader

- Focus moves to the headline on open; `Esc` closes the innermost open list first, then the panel (today's order, kept).
- `identity-people-list` and `identity-roles-list` get roving `ArrowUp` / `ArrowDown` / `Home` / `End`, copied from `LanguageMenu.tsx`'s handler, and `aria-activedescendant`.
- The disclosure is a `<button aria-expanded>` controlling a region; its state is session-only (React state), not persisted.

---

## 3 · Chrome outside the panel

> ⚠️ **MEASURED AFTER PR #377 MERGED (2026-09-28 10:38, `main` @ `de101c67`) — H3 closed part of this table.** Derived from `git diff 81c98403 origin/main`: the avatar initials now derive from the persona label (`t('nav.persona.*').charAt(0)`) — F3 closed; the nav toggle and the bell with its `3` are **deleted** — F4 closed for those two (the search input remains and is ruled in H3's residue table); `/login` lost its password field and its "Forgot password?" and gained a demo disclosure under the button — F6 is now the demo landing this design recommended (D3); the supplier dashboard's *Last login* literal is **gone** in both locales. Still open from this table: the roles-page grant strings (F9, `roles.ts` untouched), the seeded supplier name authored twice (F11), and the sidebar pill (B3). B1's remaining scope is F9, F11 and whatever the search input's ruling leaves.

| Item | Change | Batch | Note |
|---|---|---|---|
| Avatar initials `JJ` / `PS` (`IdentityPanel.tsx:230`) | role glyph or `t('nav.persona.*')[0]`; no authored token; a guard extends the roles-only rule to the avatar (a source assertion that the avatar's text derives from i18n) | B1 | roles-only standing rule |
| Bell with literal `3`, dead search, dead nav toggle (`TopBarV2.tsx`) | delete, or rule each in the dead-affordance residue table — **whichever H3 has not already done** | B1, rebased on H3 | the `3` is a value claim no gate sees |
| `/login` (`Login.tsx`) | reduce to a demo landing with the two *View as* buttons and no password field, or delete the route (D3) | B1 | any credentials work today; "Forgot password?" is a no-op |
| Supplier dashboard *Last login: 5 April 2026* | delete; no login exists | B1 | fabricated session fact |
| Roles page grant strings (`roles.ts` `createOk`, `createGrantedBy`) | `createOk` stops saying *gone on reload* (the store persists); `createGrantedBy` becomes an `ActorPreActNotice` (the sample arm names the person through `personLabel`, the unattributed arm keeps the lane's own line) | B1 | F9; both locales |
| Seeded supplier name authored twice (`identitySources.ts:20` vs the master) | one master lookup | B1 | F11 |
| Sidebar persona pill (`SidebarV2.tsx:190-235`) | moves into the disclosure; the sidebar becomes navigation only; `identity.noSupplier.*` and `identity.unresolvedTenant.*` stop pointing at the sidebar | **B3, ruling** | NAV-01 rewritten against the new location; the switch keeps navigating to the side's dashboard |

---

## 4 · What stays exactly as is

The resolver (`personLabel.ts`), the roster module, the two locks, `handoff.ts` and every `HandoffNotice`, `customRoles`, `identitySources` and its storage keys (`paragon.identity`, `paragon.lang`, `paragon.customRoles`), the divergence derivation, `LanguageMenu`, every `data-testid`. The zero-atom anchors (`buyer`, `supplier`) remain offered as toggles unless the operator rules otherwise (D2) — hiding them changes the last-role arithmetic on the supplier seat, which is a ruling, not a polish.

---

## 5 · Specs that must be added, and what must not move

| New spec | Asserts | Direction it did not have |
|---|---|---|
| `identity-person-none` always offered | the item exists with the roster expanded, on both personas, and selecting it returns the actor to `NO_PERSON` with roles and tenant untouched | prose-only today |
| One role control | the set of `setIdentity` callers that write `businessRoles` is exactly `{ IdentityPanel (toggles), IdentityPanel (roster), IdentityPanel (persona switch after B3), Login (until deleted) }`, derived from source; a chip block or a second writer is red | prose-only today (§65) |
| Disclosure collapsed by default | on open, `identity-demo-disclosure` is collapsed and the roster and toggles are not in the accessibility tree | new |
| Side effects announced | picking a person renders `identity-changed` with the roles; picking a supplier person renders it with the tenant name from the master | new |
| Avatar derives from i18n | the avatar text is not a string literal in source | new (roles-only, extended) |
| Roving focus | `ArrowDown` from the first roster item focuses the second; `Home` returns | new |

**Must not change (run before and after each batch):** `personLabelGuard`, `personIdNeverRendered`, `sampleRoster`, `sampleIdentityLocks`, `identitySourcesActor`, `identityTenancy`, `simUsrNamespace`, `customRoles`, `IdentityPanelDivergence` (with an *open the disclosure first* step), `identityPanelBuyerAll` (same), `IdentityPanel.test.tsx` (structure only where the fold changes).

Browser QA both locales, both personas, with a sample person and without; screenshots of the four states delivered.

---

## 6 · Batch plan

### Ownership after the handover ruling (28 Sep 2026) — RULED

Handover to the SE Team is on **28 Oct 2026**. Our team builds only what defines the specification; the SE Team builds everything else from this design, after handover, at its own pace.

| Owner | Batches |
|---|---|
| **OURS** | none — this design is a specification handed over whole |
| **SE TEAM (SE-18)** | **The entire design:** B1 chrome and copy honesty · B2 panel restructure (headline, scope, can-do, disclosure, announced side effects, keyboard) · B3 one identity control, **including moving the persona pill out of the sidebar** · B4 post-IdP deletion (the disclosure, `Login.tsx`, the roster from the panel; the roster stays for seeds and tests; the locks stay) |

| # | Batch | Content | Tests that change | Size | Depends on |
|---|---|---|---|---|---|
| **B1** | Chrome and copy honesty | avatar; bell/search/nav (delete or rule, rebased on H3); `/login` per D3; *Last login*; grant strings + `ActorPreActNotice`; seeded name one-liner; the avatar guard | `TopBarV2.test.tsx`, dead-affordance residue rulings, roles i18n smoke | 1 | H3 merged |
| **B2** | Panel restructure | §2 in full; the new specs of §5; ID copy; browser QA four states × two locales | `IdentityPanel.test.tsx` (fold), `IdentityPanelDivergence` and `identityPanelBuyerAll` gain the open-disclosure step; every `data-testid` kept | 1 | — |
| **B3** *(ruling D1)* | One identity control | persona switch into the disclosure; sidebar navigation-only; the two guard copies repointed; NAV-01 rewritten | `SidebarV2.test.tsx`, `IdentityPanel.test.tsx` persona case | 1 | B2, D1 |
| **B4** *(SE, post-IdP)* | Deletion | as above | many, by design | — | F1 |

---

## 7 · Decisions the operator must make (recommendation first)

| # | Decision | Recommendation |
|---|---|---|
| D1 | **Move the persona pill out of the sidebar** into the disclosure (a ruled surface with its own test) | **RULED (operator, 28 Sep 2026): it moves, built by the SE Team (SE-18).** Two identity controls in two chrome regions is the confusion R4 measured; the sidebar becomes navigation only. |
| D2 | **Zero-atom anchors as toggles** (`buyer`, `supplier`): hide, or keep and explain | Keep and explain with one line ("names the side; grants nothing"); hiding changes the last-role rule on the supplier seat. |
| D3 | **`/login`:** demo landing with the two *View as* buttons, or delete the route | Demo landing; handover readers will find the URL and a page that says what it is beats a 404. |
| D4 | **The three dead top-bar controls:** delete now or rule in the residue table | Delete the bell and the nav toggle; rule the search as *not available yet* only if a search is planned for wave 1, else delete. Follow H3 where it has already ruled. |
| D5 | **Ownership split (§6)** | **RULED:** entirely the SE Team's (SE-18). |

---

## 8 · Traceability

| R4 / `_q5_code` finding | Where it closes |
|---|---|
| F1 two identity controls | §3 sidebar row; B3, D1 |
| F2 demo machinery dominates the panel | §2.1; B2 |
| F3 hardcoded initials | §3; B1 |
| F4 three dead affordances, fabricated `3` | §3; B1 with H3 |
| F5 supplier sample user flips the tenant silently | §2.3; B2 |
| F6 fake `/login` | §3, D3; B1 |
| F7 zero-atom anchors as toggles | §4, D2 |
| F8 panel a11y below the language menu's bar | §2.4; B2 |
| F9 contradictory grant strings | §3; B1 |
| F10 supplier roster rows named by ordinal | §2.2; B2 |
| F11 seeded supplier name authored twice | §3; B1 |
| F12 jargon on the normal-user path | §2.2; B2 |
| Prose-only guarantees (None item; one role control) | §5; B2 |
| R4 §5 decisions 1–4 | D1, D2, D4, D3 |

*Source file: `C:\Users\<operator>\review-drafts\DESIGN_4_IDENTITY_PANEL.md` (2026-09-28).*
