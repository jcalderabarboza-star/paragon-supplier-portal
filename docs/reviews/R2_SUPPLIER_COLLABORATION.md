# R2 · Supplier Collaboration (SDC) — both seats, against the RFP's #1 pain

**Pinned:** `main` @ `81c98403a83a674df80959f7d2290898ddd822fa`. Read from a `git archive` export; the working copy and the sibling were never opened or written.
**Seat:** Seat 3, consultant, Ops Project #11. Read-only. 2026-09-28.
**Structure of this file:** §A is the browser walk (own build on port 4290, native clock asserted, screenshots in `review-drafts\screens\Q2_*.png`). §0–§9 that follow are the code-and-runtime review (every claim with file:line; probes A–E run with `vite-node` over the export's own in-memory stores and reproduced verbatim in §8). Where the two disagree, the browser is what a user sees and the code is why.

---

## A · The browser walk — what each seat actually sees and gets

### Planner seat — `/buyer/collaboration` (`Q2_01`, `Q2_07`, `Q2_08`, `Q2_09`, `Q2_10`)

| What is on screen | What a click does | Measured |
|---|---|---|
| Header: "7 published lines · 3 suppliers · plan PV-2026-08.2 — sample clock, as of 31 Aug 2026"; marker **SAMPLE — AWAITING SOMO C8 FEED** | — | honest; the publication is a fixture (§SDC-R1) |
| Period filter: All periods · 2026-08 🔒 FIRM · 2026-09 Semi-firm · 2026-10 Visibility only | filters the consolidation | works; the only filter on the page |
| **Consolidation** grid (DataSheetGrid, read-only): Supplier · Material · Period · Class · Demand · Confirmed · Deficit · Response state · Coverage; 7 rows | none (locked) | states rendered: Confirmed / Short + Disputed / Awaiting / "Stale — answered 120.000, now 150.000" / Acknowledged; coverage "Covered · 1.67×" or *No declaration* — never a fabricated zero |
| **Chase list**: "Suppliers to nudge — worked manually via WhatsApp until chase rules land"; Responded 1 · Partial 2 · Silent 0; two suppliers **Overdue · Due 22 Aug 2026** | **nothing** — no button on a chase row | the copy is honest; the act does not exist (§SDC-R2) |
| **Responses awaiting your review** — three rows, **Start review** | **DISPATCH** `t_requirementresponse_review`: toast *"Under review — RM-EMUL-3310 · PT Sample Specialty Fats can see that you have taken their response up."*; row moves to "Under review — accept or dispute" with **Accept / Dispute** | `Q2_09` — a real state change, read back on the supplier side |
| **Disputes awaiting your resolution** — one row, **Resolve** | opens *"Resolve dispute — RM-EMUL-3310"* with the dispute ledger ("PARAGON DISPUTED THIS 17 Aug 2026 … WHAT THE SUPPLIER SAID …") and a **required** answer textarea; Cancel / Resolve dispute | `Q2_10` — a resolution with nothing said is refused by the form |
| `/buyer/chase` (`Q2_02`) | "Push via WhatsApp / email. This is a derived chase list over simulated fixture data — no message is sent from here." 7 suppliers, worst first, delivery commitments + forecast overdue | **no handler**; the only button is a link to the comm hub |
| `/buyer/delivery-agreements` (`Q2_03`) | "Read-only overview … Releasing happens inside a contract, not here." 11 rows, status chips, supplier filter chips | read-only by design |

### Supplier seat — `/supplier/forecasts` as PT Sample Packaging Indonesia (sup-007) (`Q2_04`, `Q2_11`–`Q2_16`)

| What is on screen | What a click does | Measured |
|---|---|---|
| Banner **"Sample forecast — no live publication yet"** (amber) above every tab | — | permanent: `supplier-visible (LIVE) publications: 0` at runtime (§8) |
| Tab **Published lines 3**: PK-PETB-8810 (Firm, 40.000 PCS, 2026-08) **Confirm**; PK-CAPF-8820 (Semi-firm) **Confirm**; AI-NIAC-6601 (Visibility only) **Acknowledge** | Confirm opens a 3-step drawer: confirmed quantity (digits only; "0 is a valid answer"), committed date + capacity constraint (optional), root cause category (5 codes) + note ("required when you confirm below the requested quantity"); footer **Cancel / Save draft** | `Q2_11` — lands on **Draft**, not Submitted; the supplier must then find it on "My responses" and promote it (§SDC-R9) |
| Tab **Stock (SOH) 1**: marker *SAMPLE — AWAITING LIVE SUPPLIER FEED*; one declaration "45.000 PCS as of 05 Aug 2026 · Total only … expiry bridgeability is not assessable"; **Bulk stock entry** · **Declare stock** | both open write paths (`t_inventorydeclaration_declare`); bulk = the DSG grid + XLSX pre-fill | `Q2_12` — the one object with a mass-upload path |
| Tab **Shipments 0**: "No shipments reported yet"; **Report shipment** | opens the incoming-shipment form (`t_incomingshipment_report`) | `Q2_13` |
| Tab **My responses 1**: rr-0005 · AI-NIAC-6601 · **Submitted** · "Awaiting Paragon — nothing needed from you" · Response *Acknowledged* · Version v1 · Submitted 18 Aug 2026 | read; a Draft would carry "Submit draft" here | `Q2_14` — tenancy holds: sup-007 sees only its own row while the buyer's consolidation shows rr-0001/0002/0004/0005 |
| No response **deadline** anywhere on the supplier page | — | the buyer's chase computes "Due 22 Aug 2026" from the same publication; the supplier never sees it (§SDC-R14) |
| ID locale (`Q2_16`) | tabs "Baris terbit · Stok (SOH) · Pengiriman · Respons Saya", buttons "Konfirmasi / Tanggapi", banner translated | parity exact (§5.7) |
| `/supplier/delivery-agreements` (`Q2_06`) | "Read-only. … Releasing schedules and confirming deliveries are Paragon's actions." 2 overdue · 1 upcoming, "Paragon is waiting on this delivery." | the supplier is told Paragon is waiting **and given nothing to press** (§SDC-R3) |
| `/supplier/inventory` (`Q2_05`, `Q2_15`) — **Sync now** | toast *"Inventory sync not available yet — nothing was synced."* | honest (post-#376) |
| `/supplier/inventory` — **Export EDI 846** | toast title *"EDI export not available yet — no file was generated."* **and body "EDI 846 format download starting."** in the same toast | **a self-contradicting toast** — the body survived PR #376's sweep. `src/lib/i18n/supplierInventory.ts:28-30`. Small, but it is exactly the class #376 closed, one line below where it looked. |
| `/supplier/dashboard` header (`Q5_09`) | "Paragon Corp Supplier Portal · **Last login: 5 April 2026** · Channel: WhatsApp" | a **fabricated session fact**: `SupplierDashboard.tsx:483` passes the literal `'5 April 2026'`; no login exists in the tree |

**Browser verdict, both seats.** The review loop and the three supplier objects are real and round-trip (this is the best-built lane in the portal). The supplier's daily experience still breaks at the four points the RFP cares about most: nothing is ever *published* to them, nothing *asks* or *reminds* them, a *dispute* gives them nothing to press, and a *call-off* tells them Paragon is waiting with no way to answer. The consolidation is a table, not a tool (one filter, no sort, no exception-first), and confirmations are one drawer per line landing on Draft.

---

## 0 · What was measured vs read

| Instrument | What it established |
|---|---|
| **Runtime** (`vite-node` over the export's own in-memory stores; script `scratchpad/export/q2_probe.ts`) | fixture census; consolidation states at seed; chase list at seed; **Probe A** (supplier re-submits over a Disputed v1), **Probe B** (over an Accepted v1), **Probe C** (Accepted has no exit), **Probe D** (supplier lane split), **Probe E** (orphan responses). Output reproduced verbatim in §8. |
| **Read** (grep + source) | every verb → target → lane → surface → call site; every surface handler (hoisted `handleX`, `useMutation`, `dispatch`); EN/ID key parity; the RFP Appendix-2 text (extracted from the ZIP-in-a-PDF, pages 14–15); the coverage matrix; D10/D5 drafts. |
| **Not measured** | browser rendering (done separately by the parent seat); the drift table; the 15 RFP page images. |

Bilateral controls on the dispatch census: a verb known dispatched (`t_incomingshipment_ship`, `SupplierForecasts.tsx:800`) was FOUND by the literal scan; a verb known undispatched (`t_incomingshipment_*` has no non-literal source) was ABSENT elsewhere; the four buyer RR verbs are dispatched NON-literally through `useRequirementResponseCommand(transitionId)` (`sdcBuyerHooks.ts:~200-233`) and were resolved by hand — the literal scan alone under-reports them as dead (RESOLVE-NON-LITERAL-IDS-01, again).

---

## 1 · The one-page verdict

The SDC lane is the most complete write path in the portal: **7 + 2 + 4 = 13 supplier/planner verbs all have a CommandTarget, all are surfaced, and all are dispatched by a surface** (§3). The planner's review loop (review → accept / dispute → resolve) and the supplier's three objects (confirmation, SOH with batches, incoming shipment) round-trip through one store and both seats read it back. That half of RFP Functional #2 is BUILT-E2E, and the coverage matrix's *"unbuilt"* (line 98) is stale.

**What is not built is the half the RFP calls the #1 pain**, in this order of user impact:

1. **There is no publication. Nothing publishes.** `FORECAST_PUBLICATIONS` is a frozen fixture (`sdc/fixtures.ts:891`), no flow has a publish verb (grep `t_forecast|t_publication` over `flows/` → 0), the supplier hook reads the fixture constant directly and not the service (`sdcSupplierHooks.ts:72-81`), and `supplierVisiblePublications` returns **0** LIVE publications at runtime, so every supplier renders the *"Sample forecast — no live publication yet"* banner (`SupplierForecasts.tsx:1549`, copy at `sdcSupplier.ts:15-17`). A planner cannot publish, revise, or re-version demand from any surface. **ABSENT.**
2. **Reminders / chase are derived and shown; never sent, never recorded.** `outboundRequestStore.append` (`channel/outboundStore.ts`) has **zero callers** outside its seed; `BuyerChase` has no handler at all — its one button is a `<Link to="/buyer/comm-hub">` (`BuyerChase.tsx:166-170`); `BuyerCommHub` has zero handlers. The chase list on `/buyer/collaboration` is a read-only `<ul>` (`BuyerCollaboration.tsx:866-916`). Due date is a constant, `RESPONSE_DUE_DAYS = 7` (`consolidation.ts:46`), not configurable. **UI-ONLY.**
3. **The supplier has no call-off feedback verb.** `delivery:confirm` sits in the BUYER `procurement` lane (`businessRoles.ts:254-256`) and means "accept an inferred drawdown match", not "supplier confirms qty + date" (`deliveryRelease.flow.ts:43-46`). `/supplier/delivery-agreements` tells the supplier it is read-only (`SupplierDeliveryAgreements.tsx:97`). Appendix-2 #4's supplier half is **ABSENT**, and D10 A2.4 (which says the opposite) is wrong (§7).
4. **Versioning has two integrity holes, both measured** (§8, Probes A–B): a supplier re-submission silently supersedes a *Disputed* response (the dispute vanishes from the buyer's queue, unresolved, still `Disputed` in the store) and an *Accepted* commitment (6 000 accepted → 100 re-submitted; the row drops to `short` with no flag that an accepted figure was cut). Version numbers restart at v1 per publication, and the consolidation's "latest" tie-break is decided by store insertion order (`add` prepends, `requirementResponseStore.ts:57`; `consolidation.ts:182` strict `>`).
5. **Line-by-line, twice.** A forecast confirmation is one panel per line (`SupplierForecasts.tsx:313`), lands as **Draft** with a *"draft saved"* toast (`:1242`), and must then be promoted from the Responses tab (`:511`). No grid, no paste, no template, no mass upload for confirmations or incoming shipments; the only workbook path is SOH batches for ONE material (`XlsxImportPanel.tsx` header; `BulkStockEntryGrid` mounted at `:1603`). The operator's 2026-09-10 ruling (mass upload for every input) is met for one of three objects.

Fraction of **Appendix-2 must-haves BUILT-E2E: 2 of 6** (#1 SOH, #2 incoming schedules). #3 root cause: forecast side only. #4 call-off feedback: buyer half only. #5 tracking: SE-SCOPE. #6 notifications: ABSENT. Full table in §6.

---

## 2 · Capability matrix — both seats

Legend: **E2E** = surface → dispatch → store → read back on the other seat. **UI** = surface with toast / local state / read only. **ABS** = absent.

| Capability | Supplier seat | Planner seat | Class | Evidence |
|---|---|---|---|---|
| Published requirement (demand lines, class, allocation) | reads a fixture; sees the "sample" banner | reads the same fixture; cannot publish, revise or version | **ABS** (write) / UI (read) | `fixtures.ts:891-1145`; no publish verb; `sdcSupplierHooks.ts:72-81` reads `FORECAST_PUBLICATIONS` directly, not `svc.collaboration` — the publication is **outside `ICollaborationService`** (`data/types.ts:1822-1833`), so the F1 `httpDataService` swap does not cover it |
| Supplier confirmation (qty, committed date, capacity note) | `t_requirementresponse_submit` → Draft; `_promote` → Submitted | sees `confirmed-full` / `short` + status chip | **E2E** | `SupplierForecasts.tsx:1198-1249`, `:511-531`; `sdcSupplierHooks.ts:159,224`; `BuyerCollaboration.tsx:619-660` |
| Visibility acknowledgement (no qty) | `t_requirementresponse_acknowledge` | sees `acknowledged` | **E2E** | `sdcSupplierHooks.ts:189`; flow `:137` |
| Partial / reject / propose alternative date | partial = short qty + mandatory root cause (`:1188`); alternative date = `committedDate` free field; **no explicit reject** | reads deficit | **E2E (partial)**, **ABS (reject as a verb)** | a supplier who cannot supply at all submits qty 0 with a root cause — allowed by `RR_SUBMIT_QTY_FLOOR` (`MockCommandService.ts:1019-1027`, `q < 0` refused, 0 admitted) |
| Buyer review → accept / dispute → resolve | sees status chip, `NextActorLine`, and the dispute ledger (`:593`) | four verbs, each with its own `HandoffNotice` | **E2E** | `BuyerCollaboration.tsx:955,1016,1037,1100`; `sdcBuyerHooks.ts` |
| Supplier answers a dispute | **no verb** — only re-submit (a new version) | resolve is the buyer's | **ABS** | flow has no supplier exit from `Disputed` (`requirementResponse.flow.ts:250` is buyer-role `requirementresponse:dispute`) |
| Stock-on-hand (batch + expiry) | `t_inventorydeclaration_declare`; per-batch grid; XLSX pre-fill | `t_inventorydeclaration_record` from a chat message (triage); coverage column | **E2E** | `sdcSupplierHooks.ts:335`; `BuyerChannelTriage.tsx:276`; `consolidation.ts:supplierCoverageEntries` |
| Incoming schedules (qty, ETD/ETA, AWB, direction) | `report` → `ship` → `arrive` / `cancel` | coverage counts Booked+Shipped as incoming | **E2E** | `SupplierForecasts.tsx:800-816`, `:1502`; `incomingShipment.flow.ts:52-96` |
| Root cause L1 / L2 | L1 = 5 hard-coded codes (`:133`), L2 = free note; mandatory when short (`:1188`) | reads it in the row detail | **E2E** on forecast; **ABS** on call-off (no supplier call-off verb) | `RootCause { level1, level2?, note? }` — the page never fills `level2`; it fills `note` |
| Versioning (republish) | no signal of a new version; re-confirm is a new response | `carriedForward` / `stale-against-current` derived per row | **UI** (derivation only; no publish act) | `consolidation.ts:208-260`; Probes A–B in §8 |
| Reminders / chase | sees nothing (no inbound reminder object) | chase list + severity cards; **no send, no record** | **UI** | `BuyerChase.tsx:166`; `outboundStore.append` 0 callers; `BuyerCommHub.tsx` 0 handlers |
| Planner consolidation view | — | read-only `DataSheetGrid` (`lockRows`, `:851-858`), 10 columns, one period filter (`:342`); no sort, no search, no supplier/material filter, no exception-first ordering | **E2E read** | rows in publication order; 7 rows in fixtures |
| Mass upload / templates | SOH batches only, one material per import (`XlsxImportPanel.tsx` header: "materialCode/totalQty are NOT here") | none | **partial** | no forecast-confirmation or shipment workbook; `grep -i template SupplierForecasts.tsx XlsxImportPanel.tsx` → 0 |
| Capacity / MOQ / lead time (RFP F3) | type only | — | **ABS** | `CapacityProfile` has **no consumer** (`grep CapacityProfile src` → only `types.ts` and one comment at `consolidation.ts:364`) |
| Call-off (delivery release) feedback | read-only page | release / adjust / confirm / policy on `BuyerContractDetail` | **E2E buyer**, **ABS supplier** | `BuyerContractDetail.tsx:77-80`; `SupplierDeliveryAgreements.tsx:97` |

**Do both seats read the same store?** Yes for the three objects: `MockCollaborationService` reads `requirementResponseStore` / `inventoryDeclarationStore` / `incomingShipmentStore` for both `getOwn*` (supplier-scoped) and `getConsolidation` / `getCoverage` (buyer-gated) (`MockCollaborationService.ts:59-153`); mutations invalidate both the supplier key and the buyer key (`sdcSupplierHooks.ts useInvalidateSdc`, `sdcBuyerHooks.ts isRecordedDeclarationInvalidation`). The **publication** is the exception: both read the module constant.

---

## 3 · Verb census (derived, not inherited)

| Verb | Flow | Target wired | Lane (atom) | Surfaced | Dispatched by (call site) |
|---|---|---|---|---|---|
| `t_requirementresponse_submit` | RR `:80` | ✅ `MockCommandService.ts:828` | supplier `commercial` (`businessRoles.ts:404`) | ✅ | `sdcSupplierHooks.ts:159` ← `SupplierForecasts.tsx:1226` |
| `t_requirementresponse_acknowledge` | RR `:137` | ✅ | supplier `back_office` (`:460`) | ✅ | `sdcSupplierHooks.ts:189` ← `:1293` |
| `t_requirementresponse_promote` | RR `:166` | ✅ | supplier `commercial` (`requirementresponse:submit`) | ✅ | `sdcSupplierHooks.ts:224` ← `:1261` |
| `t_requirementresponse_review` | RR `:179` | ✅ | buyer `planning` (`:342`) | ✅ | non-literal: `useReviewRequirementResponse` ← `BuyerCollaboration.tsx:961` |
| `t_requirementresponse_accept` | RR `:191` | ✅ | buyer `planning` | ✅ | `useAcceptRequirementResponse` ← `:1023` |
| `t_requirementresponse_dispute` | RR `:220` | ✅ | buyer `planning` | ✅ | `useDisputeRequirementResponse` ← `:1231` |
| `t_requirementresponse_resolve` | RR `:250` | ✅ | buyer `planning` (`requirementresponse:dispute`) | ✅ | `useResolveRequirementDispute` ← `:1186` |
| `t_inventorydeclaration_declare` | INV `:79` | ✅ `:1208` | supplier `fulfilment` (`:427`) | ✅ | `sdcSupplierHooks.ts:335` ← `SupplierForecasts.tsx:1395`, `BulkStockEntryGrid.tsx:359`, `CommHubInbound.tsx:254` |
| `t_inventorydeclaration_record` | INV `:101` | ✅ | buyer `planning` (`:344`) | ✅ | `sdcBuyerHooks.ts:144` ← `BuyerChannelTriage.tsx:276` |
| `t_incomingshipment_report` | ISH `:52` | ✅ `:1295` | supplier `fulfilment` (`:425`) | ✅ | `sdcSupplierHooks.ts:365` ← `:1502` |
| `t_incomingshipment_ship` / `_arrive` / `_cancel` | ISH `:70/84/96` | ✅ | supplier `fulfilment` | ✅ | `SupplierForecasts.tsx:800/808/816` |
| `t_delivery_release` / `_adjust` / `_confirm` | DR `:81/110/133` | ✅ `:2283` | **buyer** `procurement` (`:254-256`) | ✅ | `MockDeliveryService.ts:168,221` + `deliveryHooks.ts:138` ← `BuyerContractDetail.tsx:77-80` |
| `t_delivery_policy_set` | DP `:56` | ✅ `:2371` | buyer `compliance` (`:336`) | ✅ | `MockDeliveryService.ts:250` ← `BuyerContractDetail.tsx:80` |

**Zero SDC verbs are dead or unreachable.** What is missing is not a verb without a caller but **acts with no verb**: publish, remind/ask, supplier-answers-dispute, supplier-confirms-call-off, supplier-declines.

**Structural notes on the RR machine** (`requirementResponse.flow.ts`):
- `initial: 'Submitted'` (`:57`) while the creation verb lands on `Draft` (`:80-84`): the declared initial is not the state a creation produces. Harmless today (nothing reads `initial` for RR) but it is a false statement in the registry a Flow Builder will render.
- `terminals: ['Accepted']` (`:60`); `Disputed` is not terminal but its only exit is `resolve → UnderReview` (buyer). **A supplier has no exit from any post-submit state**; their only move is a new response, which is exactly what produces Probe A/B.
- No `Submitted → Draft` (withdraw) and no `Accepted → *` (reopen). Probe C: `ILLEGAL_TRANSITION:Accepted->Disputed`.

---

## 4 · Findings, ranked by user impact

Sizing: 1 batch ≈ one PR of this repo's usual size (design + write path + i18n + gate + browser QA). Confidence is about the *diagnosis*, not the estimate.

### P1 — the planner cannot do the job the RFP describes

**SDC-R1 · No publication write path.** *Impact:* the planner cannot put demand in front of a supplier; every supplier sees the "sample" banner forever; versioning, chase due dates and staleness all hang off `publishedAt` of a fixture. *Evidence:* `fixtures.ts:891` frozen array; no `t_*publish*` in any flow; `sdcSupplierHooks.ts:72-81` reads the constant; runtime: `supplier-visible (LIVE) publications: 0`. *Fix shape:* a `forecastPublication` flow (`Draft → Published`, `t_publication_publish` under a `planning` atom, statePreserving `t_publication_revise` that mints a new `planVersion`), a store, a `CommandTarget`, a planner surface that builds a publication from the Plan Grid rows (this is the seam Q1 §d names), and `getPublications(scope)` on `ICollaborationService` so the supplier hook stops importing a fixture. **3 batches** (machine + store + target; planner surface; supplier read through the service + FLAG-2 flip). Confidence: high on the diagnosis; medium on 3 because the allocation approval (`Allocation.approvedBy` REQUIRED on firm lines, `types.ts:255-262`) needs a named human, which today is `UNATTRIBUTED`.

**SDC-R2 · Chase is a read, not an act.** *Impact:* "half the current manual pain" (matrix line 149) is untouched: planners still chase on WhatsApp by hand and the portal cannot even record that they did. *Evidence:* `outboundRequestStore.append` has 0 callers; `BuyerChase.tsx:166` links away; `BuyerCommHub.tsx` no handlers; `sdc.chase.subtitle` says so honestly ("worked manually via WhatsApp until chase rules land"). *Fix shape:* (a) a `t_chase_ask` verb (append-only, `planning` atom) that writes an `OutboundRequestRecord` — the C3 model already exists and is honest about "composed, not sent"; (b) surface it on the chase card and in the comm hub; (c) the supplier's inbound shows the ask. Transport (WhatsApp / email) stays SE-SCOPE. **2 batches** for the record + surfaces; the scheduler that fires "N days after demand updated" is SE-SCOPE (needs a job runner the platform has never had — D5 `RFP-NOTIFICATION-ENGINE`). Confidence: high.

**SDC-R3 · Supplier cannot feed back on a call-off.** *Impact:* Appendix-2 #4's supplier half; the supplier page says read-only. *Evidence:* `delivery:confirm` in `procurement` (`businessRoles.ts:254-256`) with the header's own reasoning (`deliveryRelease.flow.ts:43-46`); `SupplierDeliveryAgreements.tsx:97`. *Fix shape:* a supplier verb on the released line — `t_delivery_acknowledge` (qty + date + optional root cause, supplier `fulfilment` atom) — distinct from the buyer's drawdown `confirm`; the planner's chase already derives "unconfirmed call-off" (`deriveDeliveryChase`) so it has a consumer on day one. **2 batches.** Confidence: high. *Open decision:* the call-off triple point (D6) — the operator ruled "the call-off is the SAP release", so the ack may need to post back; the portal-side ack is buildable regardless.

### P2 — the loop works but loses or misstates work

**SDC-R4 · A re-submission silently orphans a Disputed response** (Probe A). Buyer disputes rr-0002; supplier submits again; consolidation now shows `confirmed-full rr-9001 v1 Submitted`; rr-0002 is still `Disputed` in the store, listed by no surface, and the buyer's objection is never answered — the ledger the design insists on ("a dispute that was answered is not the same as one never raised", `types.ts:344-354`) is bypassed by the version mechanism one row up. *Fix shape:* either a supplier `t_requirementresponse_revise` from `Disputed` (new version linked to the disputed one; the dispute carries over as `resolved: superseded`), or refuse `submit` while a `Disputed` sibling is open. **1 batch.** Confidence: high (measured).

**SDC-R5 · An Accepted commitment is cut with no trace** (Probe B). 6 000 accepted → 100 re-submitted; row flips to `short`, awaiting review, no marker that an accepted figure was revised downward, and the Accepted v1 is terminal so the buyer cannot even dispute it. *Fix shape:* consolidation state gains `revised-after-accept` (derived: latest Submitted has an Accepted sibling of lower version), chased as `hard`. **1 batch.** Confidence: high (measured).

**SDC-R6 · Version numbering restarts per publication and the "latest" pick is decided by insertion order.** `submissionVersion` = max over `forResponseKey(…, publicationId)` + 1 (`MockCommandService.ts:924-984`), so the first answer to a re-published plan is v1 again; `latestSubmittedByLine` keys by supplier|material|period ignoring publication (`consolidation.ts:174-184`) and breaks ties by whichever row `add` put first (`requirementResponseStore.ts:57` prepends). It picks the right one today by accident of `add`'s order. *Fix shape:* order by `(publishedAt of publicationId, submissionVersion, submittedAt)` and pin it with a spec where the tie exists. **½ batch.** Confidence: high (measured: two v1 rows on one line after Probe A).

**SDC-R7 · The publication read is outside the service seam.** `useOwnForecastLines` imports `FORECAST_PUBLICATIONS` (`sdcSupplierHooks.ts:72-81`); `ICollaborationService` has no publication read (`data/types.ts:1822-1833`). When F1's `httpDataService` lands, the supplier's demand lines will still come from the bundled fixture. Folds into SDC-R1; called out separately because the handover (D3) claims pages do not change when the swap lands. **part of SDC-R1.**

**SDC-R8 · One visit, three lanes.** Confirm is `commercial`, acknowledge is `back_office`, SOH and shipments are `fulfilment` (`businessRoles.ts:404,427,460`). Probe D: a seat holding only `commercial` is refused `declare` and `acknowledge` at the dispatcher — correctly — so a narrowed supplier seat sees three handoff notices on one page for what the RFP calls one submission. The seeded supplier seat holds all three so the default demo hides it. Whether a supplier really has three people is an operator question; if not, the atom split is friction with no beneficiary. **0 batches (a ruling)**, then ½ batch. Confidence: high on the mechanism.

**SDC-R9 · Line-by-line ×2, no template, no bulk.** Per-line panel → Draft → Responses tab → Submit draft (`SupplierForecasts.tsx:313, 1242-1249, 511`). At RFP volume (RM monthly via distributors, PM weekly) this is dozens of panels per visit. *Fix shape:* a confirmation grid over the supplier's lines (`react-datasheet-grid` is already a dependency and `ingest.ts` is explicitly "Excel-ready", header lines 19-22), batch dispatch per row under one `SubmissionSession` (partial success per object is already the envelope's contract, `types.ts:547-556`), plus a downloadable template. **2 batches** (grid + workbook import for confirmations; same for shipments). Confidence: high. *Note:* the design deliberately lands on Draft first (un-falsifiability); a grid can keep that by promoting in bulk.

**SDC-R10 · Consolidation is a table, not a tool.** 10 columns, one period filter, no sort/search/supplier filter, no exception-first ordering; rows in publication order (`BuyerCollaboration.tsx:342, 520-790, 851-858`). At 7 rows it reads fine; at 500 it is the RFP page-13 spreadsheet again. **Ties to Q1's grid recommendation** — whichever grid the planner gets, this view should be the same component with the same sort/filter/group. **1 batch once Q1's grid lands.**

### P3 — polish and honesty

**SDC-R11 · Untranslated status pill on the supplier's Responses tab.** `SupplierForecasts.tsx:500` renders `{r.status}` raw (`UnderReview`, unspaced, both locales) while `:364` two components up uses `statusLabelKey`. **¼ batch.**

**SDC-R12 · `RootCause.level2` is never written.** The page fills `level1` + `note` (`:1216-1222`); `level2` exists in the type only. The RFP asks for L1 *and* L2. Either build the L2 taxonomy or rename the field. **¼ batch** (+ the taxonomy is an operator input).

**SDC-R13 · Registry says `initial: 'Submitted'`, creation lands `Draft`** (`requirementResponse.flow.ts:57,80-84`). A Flow Builder rendering the registry will draw the wrong entry state. **¼ batch**, best folded into Q3/Q4's registry hygiene.

**SDC-R14 · Response deadline invisible to the supplier.** `dueAt = publishedAt + 7d` is computed for the buyer's chase (`consolidation.ts:326-335`) and never shown on `/supplier/forecasts` (grep `dueAt|overdue` → 0 hits in the file). **¼ batch.**

**SDC-R15 · No "decline" verb.** A supplier who cannot supply submits `confirmedQty: 0` + root cause; the buyer reads it as `short` with a 100% deficit. Semantically fine, but the RFP vocabulary (confirm / partial / reject) is not the machine's. **0 batches** unless the operator wants the word.

---

## 5 · Where the supplier experience breaks

1. **Everything is "sample".** The banner is honest and permanent (SDC-R1).
2. **Two clicks per line, then find your draft.** Confirm → "draft saved" → switch tab → Submit draft (SDC-R9). The toast copy is honest post-#376, but the flow is the defect.
3. **Disputed, and nothing to press.** The supplier sees the buyer's objection in the ledger (`:593`) and `NextActorLine` says the next move is the buyer's; the only way to answer is to confirm again, which orphans the dispute (SDC-R4).
4. **No deadline, no reminder, no receipt.** Nothing tells the supplier when a response is due (SDC-R14), nothing arrives when they are late (SDC-R2), and nothing tells them the buyer accepted (the status chip is the only signal; no event feed).
5. **Materials they can declare are a fixture.** `ownCollaboratedMaterials` derives from `SUPPLIER_MATERIAL_RELATIONSHIPS` (4 rows) ∪ publication lines (`sdcSupplierHooks.ts:258-275`); a supplier outside that set gets an empty dropdown (the Comm-Hub smoke pair memory records 9 of 12 suppliers in that state). Follows SDC-R1.
6. **Call-offs are read-only** (SDC-R3).
7. **EN/ID:** key parity is exact — `sdcSupplier` 259/259, `sdcConsolidation` 106/106 (derived by counting `'key':` lines per export block). One raw status literal (SDC-R11).

---

## 6 · RFP Appendix-2 (pages 14–15, text layer) — row by row

| # | Must-have (RFP text, abridged) | Status | Evidence |
|---|---|---|---|
| 1 | Supplier provides updated FG stock on hand: quantity, batch number, expiry (RM) | **BUILT-E2E** | `t_inventorydeclaration_declare` with `batches[]` (`types.ts:451-456`), Σ-batch = total enforced (`INV_DECLARE_BATCH_TOTAL`), XLSX pre-fill, buyer coverage read |
| 2 | Incoming shipment schedules, local + imported: qty, ETA, airway bill | **BUILT-E2E** | `incomingShipment` with `etd/eta/awb/direction/asnRef` (`types.ts:504-522`), report/ship/arrive/cancel dispatched |
| 3 | Root cause L1 and L2 on fulfilment issues (forecast AND call-off) | **PARTIAL** — forecast L1 + note E2E; L2 never written; call-off side ABSENT | SDC-R12, SDC-R3 |
| 4 | SCH provides call-off qty; supplier feeds back qty + delivery date | **PARTIAL** — SCH half E2E (`t_delivery_release`, buyer); supplier feedback ABSENT | SDC-R3; D10 A2.4 is wrong |
| 5 | Real-time shipment tracking from the supplier's AWB | **SE-SCOPE** (TMS) | `awb` captured; `shipment` flow unwired; `INT-TMS-01` |
| 6 | Real-time notifications: delay, shortage vs commitment, regulation/geopolitical, updated demand, reminder after N days | **ABSENT** as acts; the *conditions* are derived at read (chase severity, `short`, `stale-against-current`) | SDC-R2; no transport, no scheduler, no ask record |
| NTH | Supplier performance report incl. SOH and incoming vs demand | **UI-ONLY** | `/supplier/performance` on fixtures; the coverage entries are the nearest real derivation |

**BUILT-E2E: 2 of 6 must-haves; 2 partial; 1 SE-scope; 1 absent.**

---

## 7 · Documents that disagree with the code (the code is the fact)

| Document | Says | Code says | Consequence |
|---|---|---|---|
| Coverage Matrix v2 line 98 (Functional #2) | "the whole supplier-confirm + planner-consolidation + reminder machinery is ours and **unbuilt**" | confirm + consolidation are built E2E (§3); reminders are not | stale in the flattering AND the unflattering direction; D10 line 9 already flags rows 2/3/4 as stale |
| D10 §6 A2.4 | "BUILT-E2E … `t_delivery_confirm` (**supplier**, `delivery:confirm` atom)" | `delivery:confirm` is in the buyer `procurement` lane (`businessRoles.ts:254-256`); the supplier page is read-only (`SupplierDeliveryAgreements.tsx:97`) | **the supplier half of A2.4 is ABSENT, not built** — this row would ship a false claim to SE |
| D10 §2 F3 | "`CapacityProfile … is read by consolidation.ts`" | `consolidation.ts` never imports or reads it (one comment at `:364`); no consumer in `src/` | F3 capacity is ABSENT, not UI-ONLY |
| D10 §6 A2.3 | "call-off side NOT MEASURED" | measured now: no supplier call-off verb exists, so no root cause can attach to one | resolve the NOT MEASURED to ABSENT |
| D10 §6 A2.1/A2.2 | BUILT-E2E | agreed | — |
| D10 §2 row 1 | "forecast: `requirementResponse` flow (7 verbs) … the plan feed is SOMO via C8, SIMULATED" | agreed, but "SIMULATED feed" understates: there is **no publish act at all**, not merely a simulated source | D10 should say ABSENT (write) for the publication object, which the matrix §5 item 4 named as "ours … and it doesn't exist" — still true |
| `sdc/types.ts:290-300` header | "FLAG-2: a SIMULATED publication is NEVER supplier-visible" | `useOwnForecastLines` falls back to the SIMULATED set when the LIVE set is empty (`sdcSupplierHooks.ts:77-81`) and renders it under a banner | the flag is honoured by copy, not by structure — acceptable for a demo, but the type comment overstates |

---

## 8 · Runtime probe output (verbatim, `q2_probe.ts`, export @ 81c9840)

```
## CENSUS (runtime)
publications: 2 → PUB-2026-08-RM/PV-2026-08.1/lines=7/liveness=SIMULATED ; PUB-2026-08-RM-R2/PV-2026-08.2/lines=7/liveness=SIMULATED
supplier-visible (LIVE) publications: 0
current publication PUB-2026-08-RM-R2: lines by supplier sup-002=2, sup-005=2, sup-007=3; classes {"firm":3,"semi-firm":3,"visibility-only":1}
seed responses 5; declarations 3; incoming shipments 2; relationships 4; outbound asks seeded 2
sdcClock.now() = 2026-08-31T12:00:00.000Z
consolidation at seed: 7 rows, states {"confirmed-full":1,"short":1,"awaiting":3,"stale-against-current":1,"acknowledged":1}
chase at seed: [{"supplierId":"sup-007","reason":"overdue","awaitingLines":2,"dueAt":"2026-08-22T00:00:00.000Z"},{"supplierId":"sup-002","reason":"overdue","awaitingLines":1,"dueAt":"2026-08-22T00:00:00.000Z"}]
rows answered against the OLD plan version: sup-002|RM-EMUL-3310|2026-08:confirmed-full/carried=true | sup-005|RM-EMUL-3310|2026-08:short/carried=true | sup-005|PK-PETB-8810|2026-09:stale-against-current

## PROBE A — supplier re-submits over a Disputed v1
line in CURRENT publication? yes qty=3500 class=firm
responses before: rr-0002 v1 Disputed pub=PUB-2026-08-RM
submit v2 → done rr-9001
promote v2 → done
responses after: rr-9001 v1 Submitted pub=PUB-2026-08-RM-R2 | rr-0002 v1 Disputed pub=PUB-2026-08-RM
buyer consolidation row now: kind=confirmed-full response=rr-9001 v1 Submitted
rr-0002 still Disputed in store? Disputed — reachable from any consolidation row? false
buyer resolve rr-0002 by id (no surface offers it now) → done

## PROBE B — supplier re-submits over an Accepted v1
review rr-0001 → done ; accept → done ; store status now Accepted
supplier submit v2 (qty 100 against an Accepted commitment) → done rr-9002
promote → done
buyer consolidation row now: kind=short response=rr-9002 v1 Submitted — Accepted v1 (rr-0001) still Accepted, any event/flag on the row that it was superseded? keys=kind,response,deficitQty,carriedForward

## PROBE C — exits from Accepted / Disputed
dispute an Accepted response → failed ILLEGAL_TRANSITION:Accepted->Disputed

## PROBE D — supplier lane split
commercial-only seat declares SOH → failed ROLE_NOT_PERMITTED:inventorydeclaration:declare
commercial-only seat acknowledges → failed ROLE_NOT_PERMITTED:requirementresponse:acknowledge

## PROBE E — responses whose line is not in the current publication
responses with no line in current publication (invisible to consolidation): none
```

Notes on the probe as an instrument: the first run threw `SCOPE_DENIED` out of the dispatcher (a creation without `supplierId` in the payload is *thrown*, not returned, `dispatcher.ts:86`) — the surfaces always supply it, so this is not a product defect, but a caller that only handles `res.status === 'failed'` would miss it. The second run recursed because my wrapper called itself; both are recorded so the third run's clean output is not mistaken for a first-run result.

---

## 9 · Batch plan (ordered by impact; sizes from §4)

| Order | Batch | Closes | Size | Confidence |
|---|---|---|---|---|
| 1 | Publication machine + store + target + `getPublications` on the service | SDC-R1, R7 | 1 | high |
| 2 | Planner "publish from grid" surface (Q1's seam) + supplier read via service + FLAG-2 flip on LIVE | SDC-R1 | 2 | medium (allocation approval needs a named human) |
| 3 | Versioning integrity: revise-from-Disputed, revised-after-accept, ordered latest pick | SDC-R4, R5, R6 | 1 | high |
| 4 | Chase ask record (`t_chase_ask`) + card action + supplier inbound view | SDC-R2 | 2 | high (transport stays SE) |
| 5 | Supplier call-off acknowledgement verb + surface | SDC-R3 | 2 | high (needs the triple-point ruling for SAP post-back) |
| 6 | Confirmation + shipment grid with workbook import + template | SDC-R9 | 2 | high |
| 7 | Consolidation on the Q1 grid (sort/filter/exception-first) | SDC-R10 | 1 | medium (depends on Q1) |
| 8 | Polish: status pill, L2, deadline on supplier side, registry `initial` | R11–R14 | 1 | high |

Decisions the operator must make for this lane: (a) whether a supplier is one person or three (SDC-R8); (b) whether "decline" is a word the machine should have (SDC-R15); (c) the L2 taxonomy (SDC-R12); (d) whether the supplier call-off ack posts back to SAP (SDC-R3 / D6 triple point); (e) whether `RESPONSE_DUE_DAYS` becomes a governed setting (a candidate for the Flow Builder's configurables, Q4).
