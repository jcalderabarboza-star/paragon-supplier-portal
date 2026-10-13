# SE backlog v3 — what the reviews and the batches since found and did not fix

**Status:** v3 · 2026-10-13 · written read-only. Tree pin: `main` @ `aac5f8588d55e851d0d530e3454ee1f4b649137c` (merge of PR #439, MD-4 + MD-5; first drafted at `3021f3d6…`, the merge of PR #438, and re-pinned). It carries `SE_BACKLOG_v2.md` forward: every open row keeps its number; rows a pull request since the v2 tag closed are struck and name the pull request; rows 119 onward are new (§6b: rows 119–173, from PRs #420–#438; §6c: rows 174–184, from PR #439, and rows 185–193, the findings of the v3 state-machine census). **No row carried from v2 was re-checked at this pin** unless its line says so: the "Open at pin" marks in §2 to §6a are v2's, made at `166a5611…`.
**Audience:** the Lead Engineer and the SE Team. Each row is a finding from the module-by-module review of 2026-10-02 to 2026-10-08 that was left open, a break of the final review of 8 and 9 October that was not fixed, or an item a pull request recorded as "not in this batch", "not built", "not covered", "for the SE list" or "for a ruling" — now including PRs #420–#439 — or a finding of the v3 state-machine census (D7 §6).
**What this is not:** it is not the defect register (D5) and not the work packages (D1 §4). A row here is a ticket-sized item; its last column names the package it belongs to.

---

## 1 · Sources, and their limits

| Source | What it gave | Limit |
|---|---|---|
| `qaHandover\REVIEW_P2P3_LISTS.md` (cited below as **LISTS**) | the P2/P3 lists of all four module reviews (R-PLN, R-SDC, R-SRC, R-OPS), compiled by the Strategist from the review reports as delivered in chat; items a later batch fixed are marked there with the PR | a compilation, not the reports themselves. **R-OPS's P2 list is truncated** (it ends at "Change request co…"), and the file says parts of R-SDC arrived truncated too. Some lines carry no P-level |
| `qaHandover\STATE_2026-10-06.md` and `STATE_2026-10-05.md` (cited as **STATE**) | Seat 2's own Supplier Collaboration list after SDC-5, and what closed | Supplier Collaboration only |
| PRs #395–#418, sections "Not in this batch", "Not built", "For the SE list", "For the operator to rule on" | items no review list repeats | a pull request carries no P-level; those rows are marked ‡ |
| `qaHandover\review-pln\`, `review-sdc\`, `review-src\`, `review-ops\` | screenshots (49, 82, 94 and 153 PNG files) | evidence only |
| `qaHandover\e2e\E2E_REPORT.md` (cited as **E2E**) | the final review: one material walked through 27 hand-offs on `fc65bf2`, English then Indonesian; its ranked breaks and smaller observations | written before #417 and #418. A row from it is marked ✓ only where one of those pull requests says it is still open; the rest are carried as reported |
| The supplier-module review (R-SUP) | no list of its own reached this seat. By the Strategist's word its P2/P3 items are the "Not in this batch" sections of PRs #414 and #415 | of those four items, two were fixed in #415 and #416; the two still open are rows 89 and 97. `qaHandover\review-sup\` holds screenshots only |
| PRs #420–#439 (ADM-1, UI-1a to UI-1e, PG-1 to PG-3, FB-1 to FB-4, MD-1, MD-2, MD-2b, MD-4 + MD-5), sections "Not in this batch", "Not built", "Not covered — said plainly", "Not done — each needs a ruling", "For a ruling", "SE list", "Decided here, not ruled", and PR #439's "SE list (not built, by ruling or by cut)" (new in v3) | rows 119 onward (§6b, and rows 174–184 of §6c) | a pull request carries no P-level; every such row is marked ‡. Each is carried as the pull request states it; none was re-checked in the tree or in a browser by this draft, except where "Open at pin" says what was read |
| `C13-master-data.md` §7, §8, §9 and C1's dated notes (new in v3) | what the fixture does against what the SE Team builds, for master data and the Flow Builder | contracts in the tree; read at the pin |
| `docs/designs/DESIGN_6_v2.md` §9, `docs/designs/FB_BUILD_PLAN.md` and `docs/designs/FB_OPEN_DECISIONS.md` (committed with v3) | the scope of the unbuilt Flow Builder batches FB-5 to FB-7 | a design and a plan, not the tree; the plan is pinned at `0af62ddd` (PG-1), so PG-2, PG-3 and FB-1 itself merged after it and its figures are older than the pin's (PR #433 says so) |
| `docs/designs/MD_BUILD_PLAN.md` and `docs/designs/MD_OPEN_DECISIONS.md` (committed with v3) | what MD-4 and MD-5 were planned to be, and what the plan lists after them (MD-3, MD-6) | a plan and a list of recommendations, pinned at `0531e094…` (PG-3), written before the build. A row taken from the plan is a planned item that PR #439 did not build; it says so, and says whether PR #439 names it |
| `CENSUS_v3.md` (cited as **census v3**; folded into D7 §6) | the state-machine census Seat 3 ran at `aac5f858…` with `vite-node` and controls: rows 185–193 | it reads the flow definitions, not screens; guards are read by hook name; its decision-verb list is a word list; a policy that refuses by deployment is not visible in a trigger. It ranks nothing: every severity on those rows is this seat's (‡). Where it and C1 disagree, C1's pinned test is the authority |

**How the three were merged.** Where LISTS and a ‡ row named the same thing, the LISTS row replaced it and the severity is LISTS's. Where LISTS and STATE named the same Supplier Collaboration item, there is one row citing both. Where they disagree on whether an item is open, the later and more specific source wins and the row says so: one item LISTS shows open is closed by STATE (§9, first row).

**Columns.** *Sev*: as the review gave it. ‡ = no review list ranks it; assigned by this seat. *Size*: S = up to a day, M = two to five days, L = more than a week; an estimate by this seat, not measured. *Open at pin*: ✓ = this seat confirmed it in the pinned source by grep; blank = carried as reported, not re-checked. *Package*: the SE work package of D1 §4; † = no package names this kind of work (screen copy, locale, page accessibility), and the Lead Engineer assigns it.

**Ranking rule.** P1, then P2, then P3. Inside a level: a screen that tells a user something false, or an act that duplicates or loses a record, first; then an act with no way out; then stale or missing reads; then wording and locale; then ergonomics. The severity is the review's; the order inside a level is this seat's.

---

## 2 · P1 — the two open P1 rows are the final review's and are packages SE-22 and SE-23 (§6a, rows 99 and 100)

Rows 1, 2, 3 and 82 were closed in v2 and kept for one issue so their numbers were not reused. They have left this table and are in §9; the numbers stay retired. The same holds for rows 20, 42, 64 and 83 in the sections below.

*(no open row in this section)*

## 3 · P2

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 4 | An acknowledgment goes through the commitment review lane: accepting one toasts "is committed", and a disputed acknowledgment cannot be answered | Supplier Collaboration | P2 | M | | LISTS R-SDC 1; STATE | SE-17 |
| 5 | The Acknowledge button stays live after acknowledging, and repeats create duplicates | Supplier Collaboration | P2 | S | | LISTS R-SDC 9; STATE | SE-4 (idempotency on the verb) |
| 6 | The ASN picker allows another material's ASN or an already-delivered one, and the same ASN can be linked twice | Supplier Collaboration | P2 | M | | LISTS R-SDC 12; STATE | SE-17; SE-10 for the ASN facts |
| 7 | A leg to Paragon on a new ASN stays "incoming" in coverage: no surface or feed moves an ASN to `Delivered`. Decided: the supplier never marks arrival; receipt records it | Supplier Collaboration | P2 | M | | STATE (SDC-5); LISTS "DECIDED, SE list"; PR #404 | SE-10 (TMS feed), or a receipt cascade under SE-17 |
| 8 | Counts disagree on one seat: the dashboard says "9 to award", the sourcing list "Ready to award 4" | Sourcing | P2 | S | | LISTS R-SRC | † |
| 9 | ~~The supplier's event card shows evaluation weights (Quality, Sustainability, Risk) that are sample values the buyer's score does not use~~ — **CLOSED, PR #417 (E2E-1), before the v2 tag; v2 carried the row open in error. The card lists the criteria the buyer set or says none were shared, and the five sample weights are gone (PR #417, item 3). Read at this pin: `src/pages-v2/SupplierRFQs.tsx:482-505` renders the event's own criteria or `rfqs.card.evalCriteriaNone`. Kept one issue so the number is not reused** | Sourcing | P2 | S | | LISTS R-SRC; PR #417 | closed |
| 10 | After a rate is recorded, a USD quotation still shows only USD; the IDR equivalent appears nowhere but the price score | Sourcing | P2 | S | | LISTS R-SRC | † |
| 11 | Two clocks on one row ("Created 06 Oct", deadline 14 Nov, "75d remaining"); the day of an award, an advance, a conclude and a response is stamped from the browser clock while deadlines are judged at the declared present | Sourcing | P2 | S | | LISTS R-SRC; PR #407 | SE-4 (one server clock) |
| 12 | Money abbreviations mix conventions: EN "Rp 1.3B" beside "Rp 410.0jt"; ID "Rp 2.0M" for two billion | Operations | P2 | S | | LISTS R-OPS | † (one formatter; `formatIDR` is the rule) |
| 13 | Dates: Indonesian pages mix "31 Aug", "30 Sep" and "31 Agu"; orders live in 2025 while shipments and receipts live in 2026. *v3: the second half is addressed by PG-3 (#432) — purchase orders and ship notices are anchored to the declared present; the order numbers still read `PO-2025-…` (row 139). The date-format half is as reported* | Operations | P2 | M | | LISTS R-OPS | † for the format; D4 for the fixture years |
| 14 | Receipt quantities carry no unit; the confirm panel sums mixed units as "units" | Operations | P2 | S | | LISTS R-OPS | SE-17 (receipt lane) |
| 15 | The language switch resets the receipt wizard to step 1 and discards what was entered | Operations | P2 | S | | LISTS R-OPS | † |
| 16 | The supplier is not told why an invoice is held as a variance | Operations (money) | P2 ‡ | M | | LISTS R-OPS "From OPS-1" (no level given); PR #410 | SE-17 |
| 17 | No dispute-outcome ledger and no accept-variance verb (Design 3 §3.7) | Operations (money) | P2 ‡ | L | | LISTS R-OPS "From OPS-1" (no level given); PR #410 | SE-17 |
| 18 | The match compares totals and does not read an invoice's lines, so it cannot tell a price difference from a quantity difference (since #418 an invoice made from the form does store its lines) | Operations (money) | P2 ‡ | L | | PR #410 | SE-12 |
| 19 | `t_invoice_remit` has no feed: no invoice reaches `Remittance Received` except by fixture | Operations (money) | P2 ‡ | M | ✓ no hook or page names it | PR #410 | SE-6 |
| 21 | Toast-only buttons: Export, Export comparison, Event templates, Ask question, Decline RFQ, Start qualification, Invite to RFQ | Sourcing | P2 | M | ✓ `SupplierRFQs.tsx:416-417`, `sourcing.ts:951`, `discovery.ts:65`, `:122` name them; that each only toasts is as reported. *v3: two more buttons of this kind are row 128* | LISTS R-SRC; PRs #406–#409 | SE-9 (the two exports); SE-18 (templates); SE-17 (decline, qualification, invite); SE-7 (ask question) |
| 22 | No verb adds an invitee to a published event (operator ruling: SE list) | Sourcing | P2 | M | | LISTS R-SRC; PR #409 | SE-17 |
| 23 | Blind scoring is not built: evaluators see each other's averages (operator ruling: SE list) | Sourcing | P2 | M | | LISTS R-SRC; PR #409 | SE-17 |
| 24 | A multi-material event carries one quantity and one unit price: line items are not built | Sourcing | P2 | L | | LISTS R-SRC | SE-17; SE-21 for what a line names |
| 25 | Wizard: a requisition prefill does not select its material, so Next is disabled with no reason; the modal has no dialog role. *v3: the dialog-role half is still open, read at this pin. Since PG-1 (#430) `role="dialog"` is written only in the shared `Dialog` and `SidePanel`, and the guard holds where the role is written, not that every overlay has one. The sourcing wizard is mounted in a plain fixed overlay (`src/pages-v2/BuyerSourcing.tsx:4937`), not in `Dialog`, so it has no dialog role (its focus handling was not read). The prefill half is as reported* | Sourcing | P2 | S | ✓ the dialog-role half | LISTS R-SRC | † |
| 26 | No confirm-by date on supplier orders | Operations | P2 | M | | LISTS R-OPS | SE-17; SE-6 if the date is S/4's |
| 27 | Withdrawing a publication has no surface (`t_publication_withdraw` has no caller). The latent restore defect was fixed in SDC-1 | Supplier Collaboration | P2 | M | ✓ no query hook names it | LISTS R-SDC 5; STATE | SE-17 |
| 28 | A response draft against a superseded plan cannot be rebased or discarded | Supplier Collaboration | P2 | M | | LISTS R-SDC 6; STATE | SE-17 |
| 29 | Open responses on lines dropped from the current publication vanish from the buyer's queues | Supplier Collaboration | P2 | M | | LISTS R-SDC 2; STATE | SE-17 |
| 30 | The review and accept queues do not flag an answer to an older plan version as stale | Supplier Collaboration | P2 | M | | LISTS R-SDC 3; STATE | SE-17 |
| 31 | The carried-answer line can name a superseded or disputed answer as still counting. LISTS asks for a re-check after SDC-2/3; STATE, written after SDC-5, still lists it open | Supplier Collaboration | P2 | S | | LISTS R-SDC 7; STATE | SE-17 |
| 32 | Weekly coverage never fires "unbridgeable": the week bucket computes NaN | Supplier Collaboration | P2 | S | ✓ `src/services/sdc/consolidation.ts:81`, `:775` | LISTS R-SDC 4; STATE | SE-5 (planning facts) |
| 33 | Stale reads across seats and pages for up to 30 s after a write (the read cache). R-OPS ranks it P2; R-SDC ranked the same cache P3 | Operations, Supplier Collaboration, Sourcing | P2 | M | | LISTS R-OPS and R-SDC P3; STATE P3; PR #405 | SE-4 |
| 34 | The packaging line inside the monthly raw-material publication appears in no grid view, so it cannot be re-split | Planning / Supplier Collaboration | P2 | M | | LISTS R-SDC 14; STATE | SE-14 (grid views) |
| 35 | Open panels stay usable after the seat is narrowed (the entrance rule) | Supplier Collaboration | P2 | M | | LISTS R-SDC 13; STATE | SE-3 (server-side authorisation is the real gate); † for the panels |
| 36 | The flat view (material × bucket rows, measures as columns) is not built. *v3: PG-2 (#431) built something else — one row per material, opened to the measures chosen in a measures menu. The flat view is still not built* | Planning | P2 | M | | LISTS R-PLN | SE-14 |
| 37 | Bulk "accept as delivered" and "dismiss selected" on intake are not built | Planning | P2 | M | | LISTS R-PLN | SE-14; SE-15 for the pattern |
| 38 | Shipment advance refusals show raw English developer strings | Supplier Collaboration | P2 | S | | LISTS R-SDC 11; STATE | † |
| 39 | The next-actor copy offers "revise" on an acknowledgment, where revise does not exist | Supplier Collaboration | P2 | S | | LISTS R-SDC 8; STATE | † |
| 40 | While a revision is a draft, the prior answer still reads "Awaiting Paragon — or revise your answer yourself" | Supplier Collaboration | P2 | S | | STATE P2; LISTS "later additions"; PR #402 | † |
| 41 | A line whose class changed at the same quantity reads "Changed — was 800 KG" | Supplier Collaboration | P2 | S | | STATE P2; LISTS "later additions"; PR #402 | † |
| 43 | The supplier inbox is worded for an operator ("Paste the supplier's reply") | Supplier Collaboration | P2 | S | | LISTS R-SDC 16; STATE | SE-7 |
| 44 | In Indonesian, "Firm", "Semi-firm", "FIRM — periode terkunci" and "MODEL" stay English | Supplier Collaboration | P2 | S | ✓ `src/lib/i18n/sdcConsolidation.ts:203` | LISTS R-SDC 17; STATE | † (locale review) |
| 45 | Accessibility: axe flags eyebrow-label contrast on every Supplier Collaboration page; the consolidation grid cannot be reached by keyboard. *v3: UI-1a (#421) measured zero text under 4.5:1 on 49 routes and gates the token pairs, so the contrast half is probably closed; not re-run with axe. The keyboard half is as reported* | Supplier Collaboration | P2 | M | | LISTS R-SDC 18; STATE | † (page accessibility); SE-14 for the grid |
| 46 | A 20-line confirmation takes 5–6 actions per line; no bulk path (Design 2 B6) | Supplier Collaboration | P2 | L | | LISTS R-SDC 19 (tagged SE-15); STATE | SE-15 |
| — | **R-OPS's P2 list is truncated after "Change request co…"**; whatever followed is not in this backlog | Operations | P2 | — | | LISTS R-OPS | — |

## 4 · P3

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 47 | Double-clicking Accept or Review raises a false failure toast | Supplier Collaboration | P3 | S | | LISTS R-SDC P3; STATE | SE-4 (idempotency); † for the button |
| 48 | Promote can be double-submitted | Supplier Collaboration | P3 | S | | LISTS R-SDC P3; STATE | SE-4 |
| 49 | Awards History shows the estimate, not the awarded value | Sourcing | P3 | S | | LISTS R-SRC P3 | † |
| 50 | The Marketplace says "3 active RFQs" (a fixed figure) | Sourcing | P3 | S | | LISTS R-SRC P3 | † |
| 51 | A losing supplier is given no debrief reason | Sourcing | P3 | M | | LISTS R-SRC P3 | SE-17 |
| 52 | The publication history shows no row for procurement's signature | Planning | P3 | S | | LISTS R-PLN | SE-18 (ledger surfaces) |
| 53 | The award what-if is hard-coded to one event (`rfq-003`) | Planning / Sourcing | P3 | S | | LISTS R-PLN | † |
| 54 | A supplier seat can open `/buyer/plan-grid` (its data is correctly limited to its own materials) | Planning | P3 | S | | LISTS R-PLN | SE-3 (route authorisation) |
| 55 | A cut-after-accept chase row shows "0 awaiting" with a past due date | Supplier Collaboration | P3 | S | | LISTS R-SDC P3; STATE | SE-19 |
| 56 | The period filter stays on a bucket that no longer exists | Supplier Collaboration | P3 | S | | LISTS R-SDC P3; STATE | † |
| 57 | The publication panel still offers the superseded PV-2026-08.1 | Planning / Supplier Collaboration | P3 | S | | LISTS R-SDC P3; STATE | SE-5 (plan-version feed) |
| 58 | A multi-line inbox reply keeps a high confidence when a line yields a shape-guessed material (for example "50ml") | Supplier Collaboration | P3 | S | | STATE P3 (found in SDC-4); not in LISTS | SE-7 |
| 59 | The supplier's event card prints its dates as raw ISO (`YYYY-MM-DD`) | Sourcing | P3 | S | | LISTS R-SRC P3; PRs #406, #407 | † |
| 60 | A toast says "mr-0003" where the list says "MR-2026-0003" | Sourcing | P3 | S | | LISTS R-SRC P3 | † |
| 61 | The breadcrumb repeats "Preferred suppliers" | Sourcing | P3 | S | | LISTS R-SRC P3 | † |
| 62 | Refusals of the publication and requirement-response lanes (`PUB_…`, `RR_…`) show raw English in Indonesian | Supplier Collaboration | P3 | S | | LISTS R-SDC P3; STATE | † (locale) |
| 63 | `/supplier/inventory` dates are hard-coded to an English format, and its "last sync" is the fixture's date | Supplier Collaboration | P3 | S | ✓ `src/pages-v2/SupplierInventory.tsx:67` | LISTS R-SDC P3; STATE | †; SE-6 for a real sync time |
| 65 | "Draft" appears in the Indonesian plan-grid copy | Planning | P3 | S | | LISTS R-SDC P3; STATE | † (locale) |

## 5 · Listed by a review without a P-level

Concrete items a review list names but does not rank. They are placed after P3 because no level was given, not because they are smaller.

| # | Item | Module | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|
| 66 | Indonesian terms disagree between the two sides and within one: "Acara sumber" (buyer) vs "Acara Sourcing" (supplier); "Pemasok preferensi" vs "Pemasok pilihan"; "SAMPEL" vs "CONTOH"; "material ekor"; "should-cost" untranslated | Sourcing | S | ✓ `src/lib/i18n/modules.ts:167` vs `requisitions.ts:268`; `sourcing.ts:1149` | LISTS R-SRC "ID" | † (locale review) |
| 67 | A supplier cannot decline, revise or withdraw a quotation (a second quotation is refused by ruling, so a mistake cannot be corrected) | Sourcing | M | | LISTS R-SRC "Missing (ours)"; PR #406 | SE-17 |
| 68 | Clarification questions on an event | Sourcing | M | | LISTS R-SRC "Missing (ours)" | SE-17; SE-7 |
| 69 | Landed cost in the comparison | Sourcing | M | | LISTS R-SRC "Missing (ours)" | SE-17 |
| 70 | Templates and bulk upload for sourcing events | Sourcing | M | ✓ questionnaire templates are per browser (`src/pages-v2/sourcing/rfiTemplates.ts`) | LISTS R-SRC "Missing (ours)"; PRs #408, #409 | SE-18 (templates); SE-15 (bulk) |
| 71 | The response deadline of a publication as a governed setting | Supplier Collaboration | M | | LISTS R-SDC "Missing (ours)" | SE-18 |
| 72 | Six seeded receipts carry a material their purchase order does not hold (GR-2026-004, -006, -007, -009, -010, -011) | Operations / sample data | S | | LISTS R-OPS "From OPS-1"; PR #410 | no batch up to #416 changed them; D4 (sample-data replacement) unless ruled otherwise |

## 6 · Rows no review list carries (from pull requests only; severity by this seat)

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 73 | The invoice submit verb accepts any number; a non-positive amount gets no verdict and claims nothing, but is not refused | Operations (money) | P3 ‡ | S | | PR #410 | SE-4 |
| 74 | A supplier cannot edit or take back a recorded interest at RFI or RFP | Sourcing | P3 ‡ | M | | PR #407 | SE-17 (with row 67) |
| 75 | A "Not shortlisted" card stays on the supplier's list after the event ends | Sourcing | P3 ‡ | S | | PR #407 | † |
| 76 | RFI answers are not scored | Sourcing | P3 ‡ | M | | PR #408 | SE-17 |
| 77 | Questions, criteria and scores cannot be edited after publication (by decision: cancel and raise again) | Sourcing | P3 ‡ | M | | PRs #408, #409 | SE-17, only if the decision is reversed |
| 78 | In the Indonesian requisition drawer the planning bucket is labelled "Ember perencanaan" | Planning | P3 ‡ | S | ✓ `src/lib/i18n/requisitions.ts:397` | PR #395 | † (locale) |
| 79 | A generated intake line's "why" is producer data in English with plain digits | Planning | P3 ‡ | S | | PR #397 | SE-5 |
| 80 | Material-row labels in the grid still truncate when long. *v3: changed by PG-2 and PG-3 — a long label now wraps and is never cut on the monthly view; on the weekly view at 1366×768 a long packaging label takes three lines and is cut top and bottom by its row (PR #432)* | Planning | P3 ‡ | S | | PR #396 | SE-14 |
| 81 | A triage record written before PLN-2 for a monthly packaging line no longer emitted is refused on read | Planning | P3 ‡ | S | | PR #396 | SE-4 (a migration note; browser storage only) |
| 84 | No named-person check on: disputing or resolving an invoice; picking up or resolving a disputed supplier answer; the planner's intake commit; holding, re-testing or posting a goods receipt; closing or re-opening bidding; closing an order; the two ship-notice discrepancy acts; cancelling an incoming shipment; taking a quotation into review. (Closed out of this row by #417: rejecting a requisition; accepting, part-accepting or rejecting a goods receipt) | several | P2 ‡ | M | ✓ the flows' `policyHooks`; census probe at this pin | census 2026-10-09; PR #417 ("Left open, for the operator to rule on") | SE-3, for whichever are ruled decisions (D6 §2) |
| 85 | A requisition in `Sourcing Event` has no exit: purchase-order creation is S/4's and nothing fires `t_pr_convert`. One sample requisition rests there. Carried from v1 (R3) | Planning (requisitions) | P2 ‡ | M | ✓ census | census 2026-10-09; `looseEndCensus.ts` | SE-6 |
| 86 | Goods stopped at the quality step cannot be held or rejected through the receiving form (the dispatcher allows both) | Operations | P2 ‡ | S | | PR #412 | SE-17 |
| 87 | A Partially Delivered order cannot take a further ship notice (seen on PO-2025-00116; cause not sought) | Operations | P2 ‡ | M | | PR #412 | SE-17 |
| 88 | Override hold on a goods receipt is still a message | Operations | P2 | M | ✓ `src/pages-v2/BuyerGoodsReceipt.tsx:572` | PRs #411, #412 (ruled: SE list, P2) | SE-17 |
| 89 | Figures on Analytics, Scorecard, Risk, My Performance, My Storefront and the supplier dashboard are marked "Illustrative — not measured"; none is computed | Analytics / Supplier | P2 ‡ | L | | PR #415 | SE-5 (data) † |
| 90 | The packing list on a ship notice is a file name only; no file is stored | Operations | P3 ‡ | M | | PR #413 | SE-8 |
| 91 | An order confirmation made from the dashboard widget carries no date and no note | Operations | P3 ‡ | S | | PR #413 | † |
| 92 | The delivery-agreement over-tolerance flag reports and does not stop a release | Operations | P3 ‡ | S | | PR #413 | SE-18 |
| 93 | Supplier briefing: the time estimates are authored text, and the action buttons only dismiss the card | Supplier | P3 ‡ | S | | PR #416 | † |
| 94 | The portal default validity cap has a named-person check and no screen (`t_psl_cap_set`, ruled unsurfaced) | Suppliers (preferred list) | P3 ‡ | S | ✓ census | PR #416 | SE-18 |
| 95 | `t_po_view` (the supplier "viewed" fact) is declared for a screen and nothing fires it; the forecast-publication withdraw is the same (still no screen after #417, which gave it a named-person check) and is already the Withdraw row of §3 | Operations | P3 ‡ | S | ✓ census | census 2026-10-09; carried from v1 (R3) | SE-17 |
| 96 | The shipped census of "declared for a screen, offered by none" (`surfaceable.test.ts`) lists five verbs that screens do fire; its gate checks the other direction only | Platform (tests) | P3 ‡ | S | ✓ census | census 2026-10-09; D7 §6 | † |

## 6a · Added at the final pass — the supplier-module review, the final review (E2E), and PRs #417 and #418

Same columns. Severity is the final review's where it ranked the item (its report's "Breaks, ranked"), and this seat's (‡) elsewhere. The number in brackets is the walk's hand-off.

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 97 | Analytics period chips change the label only; no figure follows the period (the page now says so) | Analytics | P2 ‡ | M | | PR #415 | SE-5 (data) † |
| 98 | The channel demo is a scripted demo: nothing is sent and nothing changes (labelled as such since #415) | Supplier | P3 ‡ | L | | PR #415 | SE-7 |
| 99 | An award does not reach the forecast split: the awarded supplier is not made eligible for the awarded material and no control adds it [13] | Sourcing → Supplier Collaboration | P1 | L | ✓ ruled to the SE Team on 2026-10-09 | E2E; D1 §4 | **SE-22** |
| 100 | An intake line carries a material name and no master code, so it and the plan-grid row for the same material are two records, and a committed quantity has no row on the grid [1] | Planning | P1 | M | ✓ ruled to the SE Team on 2026-10-09 | E2E; D1 §4 | **SE-23** |
| 101 | ~~A receipt does not record who received: "Received by" is a dropdown value ("Warehouse Supervisor"), not the person in the seat [22a]~~ — **CLOSED, PR #420 (ADM-1): `t_gr_create` refuses a seat that names nobody (`GR_RECEIVER_UNATTRIBUTED`) and stamps `receivedByPerson` and `receivedAt`; kept one issue so the number is not reused** | Operations (receiving) | P2 | S | | E2E; PR #417; PR #420 | closed |
| 102 | The awards history shows award value "—" for an award not in rupiah, while the event panel shows the value [11a] | Sourcing | P2 | S | | E2E | SE-17 |
| 103 | The estimated value differs between the intake line (Rp 990.0jt) and the requisition raised from it (Rp 891.0jt); the requester reads "Planning lane", not the planning person who committed [2] | Planning | P2 | S | | E2E | SE-17; the person: SE-3 |
| 104 | A sourcing event raised from a requisition does not show which requisition it came from, and does not carry its estimated value, category or bucket [5] | Sourcing | P2 | S | | E2E | SE-17 |
| 105 | On a receipt opened from a ship notice, "Expected" shows the ordered quantity, not the confirmed or shipped one, and the lot numbers typed on the notice are not shown [20] | Operations (receiving) | P2 | S | | E2E | SE-17 |
| 106 | ~~An invoice created with no lines is not examined and is admitted with any amount; the match judges it~~ — **CLOSED, PR #420 (ADM-1): refused `INVOICE_LINES_REQUIRED`; kept one issue so the number is not reused** | Operations (money) | P2 ‡ | S | | PR #418; PR #420 | closed |
| 107 | An invoice line's ceiling is the accepted quantity (since ADM-1, the confirmed quantity until a receipt is posted) and does not subtract what earlier invoices already claimed (earlier invoices carry no lines); the match is what catches an order claimed twice | Operations (money) | P2 ‡ | M | ✓ PR #418 | PR #418 | SE-12 |
| 108 | Seeded ship notices and seeded receipts do not name each other, so a ship notice shows its receipt only when it was received in the session | Operations / sample data | P3 ‡ | S | ✓ PR #418 | PR #418 | SE-4 (D4) |
| 109 | The order's lifecycle timeline still follows the order's own status: after receipt, invoice and payment its later steps stay unstamped. The "Received" block is a read beside it [23] | Operations | P2 ‡ | M | ✓ PR #418 | E2E; PR #418 | SE-6 (the status is SAP's) |
| 110 | An order that carries one material on two lines is not supported by an invoice's lines (a line is keyed by material); no seeded order has one and a spec pins that | Operations (money) | P3 ‡ | S | ✓ PR #418 | PR #418 | SE-12 |
| 111 | Seeded sourcing events state no requested delivery date, so their supplier cards read "not stated"; the walk's halal certificate is valid to 31 Aug 2026, the declared present itself | Sourcing / sample data | P3 ‡ | S | ✓ PR #417 (the first half) | PR #417; E2E [21] | SE-4 (D4) |
| 112 | A rate dated on the reader's own calendar day is refused as a future date while the declared present is 31 Aug 2026; the sentence shown is "A rate cannot be true in the future" | Sourcing | P3 ‡ | S | ✓ PR #417 | PR #417 | SE-4 (one server clock) |
| 113 | An invoice in Draft already reads "Submitted 31 Aug 2026" in its lifecycle; the finance drawer shows "GR document — pending" after the receipt has a material document | Operations (money) | P3 | S | | E2E ("Smaller observations") | † |
| 114 | Session stamps use two clocks: an order confirmation is stamped on the wall clock, an invoice and a payment on the declared present | Operations | P3 | S | | E2E | SE-4 (one server clock) |
| 115 | A sourcing event allows a response deadline after its award deadline | Sourcing | P3 | S | | E2E | SE-17 |
| 116 | Screen copy seen on the walk: an order confirmation's "Total qty 4,800 units" adds kilograms of two materials; a receipt shows "Lab sample required" and later "No lab required"; the ship-notice form opens with ship date 2026-04-07; the buyer orders page reads "last updated 04 Apr 2025"; "Awaiting Planning" appears twice on the forecast draft for a procurement seat | Operations / Supplier Collaboration | P3 | S | | E2E | † |
| 117 | Reads that stop short: the supplier sees an order's total and no unit price [16]; no person is shown for the supplier's confirmation and "Acknowledged by Supplier" has no time [17]; the supplier's forecast note is not on the consolidation page before a review is started [15] | Operations / Supplier Collaboration | P3 | S | | E2E | †; the person: SE-3 |
| 118 | Indonesian: English left in place (the intake line's reason, the supplier card's "Full RFQ specifics…" line, "Custom material — specify in notes", "Warehouse Supervisor", carrier names); month forms mixed on one screen ("31 Agu 2026" beside "31 Aug 2026"); "Ember perencanaan" for planning bucket; "81h tersisa" reads as hours; "Dikirim" and "Terkirim" in one status column | all (locale) | P3 | M | | E2E ("Indonesian only") | † |

## 6b · Added in v3 — what PRs #420–#438 recorded as not built, not covered or for a ruling

Same columns. Every severity is this seat's (‡); every size is an estimate. "Open at pin" is ✓ only where this draft read the thing in the tree at `3021f3d6…`, the first pin; otherwise the row is carried as the pull request states it. At the re-pin the master-data rows were read again at `aac5f858…`: C13's "what the fixture does" table is §9 there (it was §8), and row 172 is closed.

**Administration (ADM-1, #420)**

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 119 | A module switch applies on Save, with its reason, not on the toggle. If "immediately" meant the toggle, that is a different change | Platform (modules) | P3 ‡ | S | | PR #420 ("needs a ruling") | decide (D6 §2) |
| 120 | The Super Admin activity view reads this session's audit trail, which is in memory: it is empty after a reload (the page says so) | Platform | P2 ‡ | M | | PR #420 | SE-4 (durable audit) |
| 121 | A sample Super Admin is not exempt on a production deployment; in production the exemption needs a real signed-in person | Platform (identity) | P2 ‡ | — | | PR #420 | SE-3 |
| 122 | `C10-identity.md` is not amended for the two administrator roles or the exemption; the record is in C1 and C3 | Contracts | P3 ‡ | S | ✓ C10's blob is unchanged since v2 | PR #420; D8 §11 | † (a contract amendment is a new ratification) |

**Interface (UI-1a to UI-1e, #421–#429)**

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 123 | Tables still written by hand: the quote comparison (its columns are the quotations), the RFI answers matrix, the RFP ranking, the order drawer's merged total row, the guide's markdown table | Sourcing, Operations, Guides | P3 ‡ | M | ✓ `RAW_TABLE_GRANDFATHERED` in `src/lib/uiGate/grandfathered.ts` names five files: `BuyerOrders`, `BuyerSourcing`, `GuideMarkdown`, `RfiAnswerMatrix`, `RfpEvaluation` | PRs #422, #427, #428 (`RAW_TABLE_GRANDFATHERED`) | †; SE-9 will touch the two sourcing matrices for export |
| 124 | The channel (messenger) demo is exempt by name from the type and colour gates; on that one page text under 11 px and heavier than semibold remains | Supplier (channel demo) | P3 ‡ | S | | PRs #427, #428 | SE-7 (the demo goes when transports are real) |
| 125 | The third-party datasheet grid draws its own inputs (bulk stock entry's "add rows", the award what-if cells), outside the 40 px form standard; the library draws them, so the source guard does not see them (since #427 they read at 14 px with a 12 px header). Separately, three hand-written controls are exempt by name in `RAW_CONTROL_EXEMPT`: the plan grid's bucket editor and the top bar's global search (by ruling), and one in the channel demo | Planning, Supplier Collaboration | P3 ‡ | — | ✓ `RAW_CONTROL_EXEMPT` in `src/lib/uiGate/derive.ts` names three files | PRs #425, #427 | SE-1 (the engine swap replaces the grid) |
| 126 | Hand-written buttons remain in the shell and the messenger demo, by name; boxes that are not cards (chart tooltips, grid and table frames, drop zones, diagram nodes, code boxes) remain in `RAW_BOX_GRANDFATHERED`, each with its reason | Platform (shell) | P3 ‡ | M | ✓ the buttons: `RAW_BUTTON_EXEMPT` names the identity panel, the language menu, the sidebar and the channel demo (13 buttons). The box list was not re-read | PRs #426, #428 (`RAW_BUTTON_EXEMPT`, `RAW_BOX_GRANDFATHERED`) | † |
| 127 | The one-solid-button count runs only on a state somebody opens: a drawer, dialog or wizard state that no spec and no walk reaches has never been counted. In a production build a second solid button is logged, not refused | Platform (tests) | P3 ‡ | M | | PRs #429, #430, #431 | † |
| 128 | "Create RFQ" on a supplier's profile and "Request RFQ" on a storefront only raise a message that says they are not available yet | Sourcing, Marketplace | P2 ‡ | M | | PRs #428, #429 | SE-17 (with row 21) |
| 129 | Three tables are wider than their card at 1600 px and scroll: contracts, the dock schedule, requisitions | Operations, Planning | P3 ‡ | S | | PR #422 | † |
| 130 | Not reached by the forms walk: the later steps of the sourcing, registration, shipment-notice and contract wizards, and the RFI questionnaire and RFP criteria editors (the source guard covers them). A wizard's last step was not reached by the UI-1e walk either (a spec holds it) | several | P3 ‡ | S | | PRs #425, #429 | † (walk them once) |

**Planning grid and dashboard (PG-1 to PG-3, #430–#432)**

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 131 | With "About this data" open the grid is pushed down again (66% of the screen above the grid at 1600×900; 84% on the intake view at 1366×768). It is closed by default | Planning | P3 ‡ | S | | PRs #430, #431 | SE-14 |
| 132 | At 1366×768 the weekly view gives up its horizon-totals pane; demand and confirmed totals over the horizon are no longer in the totals pane at any size (they are per month inside the material; the sort by them still works) | Planning | P3 ‡ | M | | PRs #431, #432 | SE-14 (totals bar) |
| 133 | The marks beside the colour in a narrow cell are 9 px and were checked at 1366×768 and 1600×900 on a display scaled to 67%, not on a high-density display | Planning | P3 ‡ | S | | PRs #432, #433 | SE-1 |
| 134 | The planned-changes footer reason goes onto changes that have none; it does not overwrite a reason already written in a row | Planning | P3 ‡ | S | | PR #432 | † (behaviour as built; listed so nobody files it as a defect) |
| 135 | Not re-walked after PG-2 and PG-3: the publication drawer, the FX-rate dialog, the dashboard widget, and the supplier-side order and shipment pages whose dates moved | several | P3 ‡ | S | | PRs #431, #432 | † (walk them once) |
| 136 | Everything PG-1 to PG-3 built lives on the current grid engine and must survive the move to AG Grid: one row per material with a measures menu, the fit steps, the place kept on a re-mount, the marks, the drawers | Planning | P2 ‡ | L | ✓ `package.json` still names `react-datasheet-grid` | PRs #430–#432; D1 §4 | SE-1, SE-14 |
| 137 | One ground of the ruling that `PK-ALCP-2450` is not `PK-ALCP-2441` no longer holds on the dates a reader sees (the delivery now reads 11 days after the RFQ); the ruling stands on its other two grounds | Compliance (material ruling) | P3 ‡ | S | | PR #432 | decide (D6 §2) |
| 138 | On the inventory heat map a material with no brand in its name counts for every brand; with fourteen brands it shows as twelve rows that read the same | Inventory | P3 ‡ | S | | PR #433 | SE-21 (data) |
| 139 | Purchase-order numbers still read `PO-2025-…` after the orders were anchored to the declared present: a number is an identifier and was not rewritten | Operations / sample data | P3 ‡ | S | | PR #432 | SE-6 (the numbers are S/4's); D4 |

**Flow Builder (FB-1 to FB-4, #433, #435, #438)**

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 140 | **FB-5:** forks, checks and scans are not built — rules R09–R11, the field catalogue, and the three generic rules an added check may use (a named person, a value, a different person). They cannot be composed, and a version that holds one is refused at proposal (`FLOWVERSION_ELEMENT_NOT_BUILT`) | Process changes | P2 ‡ | L | ✓ C1 (RE-HARVEST FB-3 + FB-4, "NOT BUILT") | PRs #433, #435, #438; `FB_BUILD_PLAN.md` FB-5 | SE-16 |
| 141 | **FB-6 remainder:** export of a version as one file and import that re-mints the id and stamps and validates again | Process changes | P2 ‡ | M | ✓ C1 ("NOT BUILT … an export of a version") | PR #438; `FB_BUILD_PLAN.md` FB-6 | SE-16; SE-9 (no download primitive exists) |
| 142 | **FB-6 remainder:** a side-by-side of two versions | Process changes | P3 ‡ | M | ✓ C1 | PR #438 | SE-16 |
| 143 | **FB-7:** supplier-side steps — a step can be given to a buyer-side lane only; no supplier seat may act on a step (a supplier seat is refused at scope). The step line is on seven buyer pages and on no supplier page. Optional in the plan: built only if the operator rules for it (`FB_OPEN_DECISIONS.md`, decision 9) | Process changes | P2 ‡ | L | ✓ the `processStep` guide | PR #438; `FB_BUILD_PLAN.md` FB-7 | SE-16 |
| 144 | **FB-7:** an "open steps" queue — a step is found by opening its document; no list shows a lane every step waiting for it | Process changes | P2 ‡ | M | | PR #438; `FB_BUILD_PLAN.md` FB-7 | SE-16 |
| 145 | The "Versions" guide tab, and drawing the active version on the live diagram, are not built; the flow header says which version runs and lists what it adds in sentences | Process changes | P3 ‡ | M | | PR #438; both were in the plan's FB-4 scope (`FB_BUILD_PLAN.md`) | SE-16 |
| 146 | Versions are kept in one browser's `localStorage` (`paragon.flowVersions`): not shared between people or devices | Process changes | P1 ‡ for production | L | ✓ `flowVersionStore.ts:46` | PRs #433, #438 | SE-4 |
| 147 | Step records are in memory: lost on reload with the documents, while the version stays in force | Process changes | P1 ‡ for production | M | ✓ the `processStep` guide | PR #438 | SE-4 |
| 148 | A sample person may approve, activate and restore on a demo or preview deployment and is refused on production; every named person today is a sample person | Process changes | P1 ‡ for production | — | ✓ C1 (`FLOWVERSION_SAMPLE_IN_PRODUCTION`) | PR #438 | SE-3 |
| 149 | Camera or device scanning (a scan, when built, is a typed or wedge-scanned code) | Process changes | P3 ‡ | M | | `DESIGN_6_v2.md` §9 | SE-16 (with row 140) |
| 150 | Nothing tells a lane that a step is waiting, beyond the line on the document and the refusal on the act | Process changes | P2 ‡ | M | | `DESIGN_6_v2.md` §9 | SE-7 |
| 151 | A change to the shape of a machine cannot be made at runtime: a new state, a re-routed or removed act, a different lane or required field on an existing act, a new document type. It is generated, reviewed code | Process changes | — | L | ✓ the `flowVersion` guide §1 | `docs/designs/DESIGN_6_FLOW_BUILDER.md` §7; `DESIGN_6_v2.md` §9 | SE-16; SE-11 if versions must coexist |
| 152 | Rule R16 (a step in front of an act that refuses, cancels or withdraws) is derived and coarse: it warns on nine acts and misses `t_pr_reject` and `t_psl_withdraw`. A ruled list of protected acts would replace it | Process changes | P3 ‡ | S | | PRs #433, #435 | decide (D6 §2); SE-16 |
| 153 | A data-capture field of type "one of a list" has no place to write the list | Process changes | P3 ‡ | S | | PR #435 | SE-16 |
| 154 | A draft's title cannot be changed after it is created | Process changes | P3 ‡ | S | | PR #435 | SE-16 |
| 155 | The diagram of a large process scrolls sideways inside its card, in the composer as on the live page | Process flows | P3 ‡ | M | | PR #435 | † |
| 156 | The step line was walked in a browser on Requisitions only; the other six buyer pages that carry it are covered by the shared line's spec, not by a walk. The walk was taken before `main` was merged into the branch, and the merged tree was not walked | Process changes | P3 ‡ | S | | PR #438 ("Not run") | † (walk it once) |
| 157 | An existing check cannot be reused on another act; the builder is to offer three generic rules instead (not built, row 140) | Process changes | P3 ‡ | L | | `FB_OPEN_DECISIONS.md`; `DESIGN_6_v2.md` §9 | SE-16 |
| 158 | A change cannot be drafted against the change process itself (`FLOWVERSION_PROCESS_SELF`); decided in the batch, not ruled | Process changes | P3 ‡ | — | ✓ C1 (RE-HARVEST FB-1) | PR #433 | decide (D6 §2) |
| 159 | The boot seeds run with the overlay standing down, so sample data is grown as the processes shipped; a server-side seed or migration needs the same decision | Process changes | P3 ‡ | S | ✓ `stepsDue.ts` | PR #438 | SE-4 |

**Master data (MD-1, MD-2, MD-2b, #434, #436, #437)**

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 160 | No feed fills the replica: every record is stamped `SAMPLE`. Build the initial load, change events and a periodic full reconciliation from S/4HANA, stamped `SAP_S4` | Master data | P1 ‡ for production | L | ✓ C13 §9 | PR #434; C13 | SE-6 |
| 161 | The replica's store and sync log are in memory | Master data | P1 ‡ for production | M | ✓ C13 §9 | C13 | SE-4 |
| 162 | Reference codes for payment terms, plants, storage locations and cost centres are sample codes, not SAP's keys | Master data | P2 ‡ | M | ✓ C13 §9 | C13 | SE-6 |
| 163 | The two freshness ages (24 hours for materials and suppliers, 7 days for reference tables) are placeholders until the feed's cadence is known | Master data | P3 ‡ | S | ✓ C13 §3 | C13 | SE-6; decide (D6 §2) |
| 164 | Search and paging run in the page over the whole list (1,200 materials after MD-2b, per PR #437) | Master data | P3 ‡ | M | ✓ C13 §9 | C13; PR #437 | SE-4 |
| 165 | The readers of the supplier fixture are not turned round to the replica; the gate names them | Master data | P2 ‡ | M | ✓ C13 §7 ("Not yet turned round") | PRs #436, #437, #439 (listed again, "from MD-2"); `src/lib/masterDataGate/` | SE-6 / SE-21 |
| 166 | The category mapping (the category vocabularies) is not turned round | Master data | P2 ‡ | M | ✓ C13 §7 | PRs #436, #437, #439 | SE-21 |
| 167 | The supplier record is not split. The plan's split: master fields (the ones C13 §2 replicates: names, country, city, tax id, payment term, incoterm) come from the replica, and performance figures move to the scorecard read; today one supplier record holds both. On the SE list by ruling | Master data | P2 ‡ | M | | PRs #436, #437, #439 (named only); `docs/designs/MD_BUILD_PLAN.md` MD-2 and `MASTER_DATA_DESIGN.md` say what the split is | SE-6 |
| 168 | Documents store texts where a key exists: payment term and receiving location store the text; incoterm and cost centre store the key | Master data | P2 ‡ | M | ✓ C13 §7 | PRs #436, #437, #439; C13 | SE-4 |
| 169 | Supplier × material views, purchasing info records and source lists (named MD-3 in the pull requests). The plan's scope for it is `docs/designs/MD_BUILD_PLAN.md` MD-3: replica objects for info records and source lists, a pair view of one supplier and one material, and the storefront's buyer-side view reading them | Master data | P2 ‡ | L | ✓ C13 §9 ("not built") | PRs #434, #437, #439 ("SE list"); C13 | SE-21 |
| 170 | The supplier-proposed catalogue (named MD-6 in the pull requests). The plan's scope for it is `docs/designs/MD_BUILD_PLAN.md` MD-6: a supplier proposes an item for itself as an info-record proposal (with a paired new-material request when the item has no code), Paragon reviews it in the Change requests view, a bulk template, and the supplier's own record and its own contact and address changes on the storefront. It needs rows 169 and 180 first | Master data | P2 ‡ | L | | PRs #434, #437, #439 ("SE list"); `MD_BUILD_PLAN.md` MD-6 | SE-21 (R2); SE-15 (the bulk template) |
| 171 | Indirect materials and services as a class; a supplier's own read of the materials it is party to | Master data | P2 ‡ | L | ✓ C13 §9 | C13 | SE-21 (R1, R3) |
| 172 | ~~Change requests and the hand-off to SAP are not built and C13 does not specify them~~ — **CLOSED, PR #439 (MD-4 + MD-5): the `masterDataRequest` flow (propose, review under four eyes, agree, send to SAP as a package, SAP's answer) and C13 §8. What it left open is rows 174–184; kept one issue so the number is not reused** | Master data | — | — | ✓ C13 §8; C1 Axis 2 (`masterDataRequest`, nine verbs) | PR #434 ("No change requests (MD-4/MD-5)"); PR #439 | closed |
| 173 | The Compliance applicability panel lists authored materials only and says how many generated samples it left out | Compliance | P3 ‡ | — | ✓ C13 §7 | PR #437 | † (behaviour as built; goes when sample materials go) |


## 6c · Added at the re-pin — what PR #439 left open, and the findings of the v3 state-machine census

Same columns. Every severity is this seat's (‡); every size is an estimate. "Open at pin" is ✓ where this draft read the thing in the tree at `aac5f858…`, or, for the census rows, where the census derived it there.

**Master data: change requests (MD-4 + MD-5, #439)**

PR #439's own list is "SE list (not built, by ruling or by cut)". Rows 181 to 183 are not on it: each is something `docs/designs/MD_BUILD_PLAN.md` planned for MD-4 or MD-5 that this draft did not find in the tree. What that list repeats from MD-2 is rows 165 to 168; MD-3 and MD-6 are rows 169 and 170.

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 174 | "Send to SAP" stops at the package: the call to SAP MDG at hand-off is not built. `t_mdr_hand_off` checks the request against the replica once more, moves it to `Sent to SAP`, and nothing leaves the portal. The package is the specification of the call: the request number (SAP's external reference), the kind, the proposed fields, the reason, who proposed and who agreed, and the base | Master data | P1 ‡ for production | L | ✓ C13 §8 ("For the SE Team (SE-6)") | PR #439; C13 §8 | SE-6 |
| 175 | The feed that brings SAP's answer is not built. `t_mdr_sap_complete` and `t_mdr_sap_decline` are to be fired by the feed under the automation grant, with the request number as the idempotency key. In the fixture they are a person's acts (atom `masterdata:record-sap-answer`, procurement) that accept only an answer marked as a sample (`MDR_SAP_NOT_CONNECTED` otherwise); on production a sample answer is refused, so a request waits in `Sent to SAP` | Master data | P1 ‡ for production | L | ✓ `masterDataRequest.flow.ts`; `masterDataRequestTarget.ts` | PR #439; C13 §8; census v3 §2.3 | SE-6 |
| 176 | Requests are kept in memory for the session: a request, its agreement and its hand-off are gone on reload and are not shared between people or devices (the page says so). The plan had kept them in the browser across reloads | Master data | P1 ‡ for production | M | ✓ `src/services/data/mock/stores/masterDataRequestStore.ts` | PR #439; C13 §8 ("requests are not persisted"); `MD_BUILD_PLAN.md` MD-4 | SE-4 |
| 177 | The earlier material-request lane is not folded into the request flow, by ruling. `materialRequest` and `/buyer/material-requests` stand beside it, so there are two ways to ask for a new material: one whose approval changes nothing, and one that ends at a hand-off package. The plan had folded it in (its rows becoming new-material requests, its page the Change requests view filtered to materials, the sourcing wizard's "request this material" raising the new request) | Master data / Material requests | P2 ‡ | M | ✓ C1 Axis 2 lists both flows | PR #439; C13 §8 ("Not built, by ruling"); `MD_BUILD_PLAN.md` MD-4; `MD_OPEN_DECISIONS.md` decision 5 | SE-21 (R5; its decision C5) |
| 178 | An approved supplier application does not raise a request, by ruling. The plan had one supplier-create request per approved application, raised automatically and waiting for hand-off | Suppliers / Master data | P2 ‡ | M | ✓ C13 §8 | PR #439; C13 §8; `MD_BUILD_PLAN.md` MD-4; `MD_OPEN_DECISIONS.md` decision 17 | SE-21; SE-6 |
| 179 | A blocked or deletion-flagged record does not yet refuse new documents. The sample sync blocks a supplier and nothing downstream refuses a new document that names it. The plan also had stale and blocked markers on records and in pickers; whether those are shown was not read for this draft | Master data / Operations | P2 ‡ | M | ✓ C13 §8 | PR #439; C13 §8; `MD_BUILD_PLAN.md` MD-5; `MD_OPEN_DECISIONS.md` decision 11 | SE-17; SE-6 |
| 180 | Kinds of request not built: supplier create and supplier extend (PR #439). The plan also had a buyer-raised info-record proposal and a source-list proposal, which go with row 169. Three kinds exist: a new material, a change to a material, a change to a supplier | Master data | P2 ‡ | L | ✓ `MDR_KINDS` in `src/services/masterData/changeRequest.ts` | PR #439; `MD_BUILD_PLAN.md` MD-4 | SE-21 |
| 181 | The request's own acts have no production bar for a sample person. Each act asks only that the seat names a person (`mdr_actor_named`), so a sample person may propose, review, agree and send on any deployment; every named person today is a sample person. The plan had "a sample person may approve on a demo deployment and is refused on production". What **is** refused on production is the sample answer from SAP and the sample sync. PR #439 does not list this either way | Master data (identity) | P1 ‡ for production | — | ✓ `policies.ts` (`namedSeatHook`, bound to `mdr_actor_named`); no deployment check in the flow's other hooks | this draft's reading of the tree; `MD_BUILD_PLAN.md` MD-4; `MD_OPEN_DECISIONS.md` decision 14 | SE-3; decide (D6 §2) |
| 182 | The hand-off package is shown on the request and cannot be downloaded. The plan had it "viewable and downloadable"; no download primitive exists anywhere in `src/` | Master data | P3 ‡ | S | ✓ `handOffPackage` is rendered in `ChangeRequests.tsx`; no `Blob` or `download` there | `MD_BUILD_PLAN.md` MD-5; PR #439 does not name it | SE-9 |
| 183 | A request that SAP has overtaken (a sync run moved a proposed field) cannot be agreed or sent, and cannot be confirmed and carried on: it is withdrawn and proposed again. The plan had it held "until the proposer confirms" | Master data | P3 ‡ | — | ✓ C13 §8 ("SAP changes the record first") | C13 §8; `MD_BUILD_PLAN.md` MD-4 | † (behaviour as built; listed so nobody files it as a defect) |
| 184 | Text PR #439 left stale in the tree: C13 §9's closing paragraph still says change requests are not built; C1's MD-4 and MD-5 note carries the branch's pre-merge figures (152 verbs, 32 flows, 26 targets, where the header reads 163 / 33 / 27) and cites "C13 §9" for §8; the header of `mdrRefusal.ts` names a spec file that does not exist | Contracts | P3 ‡ | S | ✓ D8 §11, rows 11.14 to 11.16 | D8 §11 | † (C1's figures are pinned by its header; the note is prose) |

**The v3 state-machine census (census v3; D7 §6)**

Each row states the finding as the census does, with the census's own definition. The census ranks nothing. Row 191 is not a defect row and stands in its own table below.

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 185 | **Dead ends** (a non-ending state with no verb out of it): `invoiceMatch.Qty Mismatch` and `invoiceMatch.Price Variance`. The flow has no command target; the match verdict is rolled up into the invoice | Operations (money) | P3 ‡ | S | ✓ census v3 | census v3 §2.1; D7 §6.3, finding 1 | SE-12 |
| 186 | **No ending reachable** (a way out exists, but no path reaches a declared ending): `flowVersion.Active` and `flowVersion.Retired`. The flow's only declared ending is `Rejected`; an active version can be retired or superseded, and a retired one restored, but none of those states is declared an ending. For the FB owner: either `Retired` (or a superseded state) is an ending and should be declared, or a version is meant to have none | Process changes | P3 ‡ | S | ✓ census v3 | census v3 §2.2; D7 §6.3, finding 2 | SE-16; decide (D6 §2) |
| 187 | `advanceShipNotice` declares no ending at all (the census lists it apart for that reason; its five states are not counted in row 186) | Operations | P3 ‡ | S | ✓ census v3 | census v3 §1.1, §2.2; D7 §6.3, finding 3 | SE-17 |
| 188 | **No exit a person or a cascade can fire today**: 25 non-ending states whose every way out is a verb on a flow with no command target, a `system` verb (an external fact, or SAP's answer), or a verb declared not surfaced. `purchaseOrder`: Confirmed, Partially Delivered, Delivered. `goodsReceipt`: Approved, Partially Approved (exit `t_gr_post`, the SAP boundary). `invoice`: Payment Released (exit `t_invoice_remit`, the bank's fact). `purchaseRequisition`: Sourcing Event (exit `t_pr_convert`, a cascade verb with no cascade link; row 85). `goodsReceiptLine`: Pending, Inspected, Quarantined. `invoiceMatch`: Pending, Pending GR. `shipment`: Pending ASN, ASN Received, In Transit, Arrived at Port, Customs Clearance, At Dock, Unloading. `contract`: Draft, Active, Renewed. `obligation`: In Progress. `compliance`: Missing, Under Review. The document waits on something outside the portal, or on work the SE Team has. Nothing in the three new flows is here | several | — (the census ranks none; row 85 is one of them, P2 ‡) | L | ✓ census v3 | census v3 §2.3; D7 §6.3, finding 4 | SE-6 (orders, receipt posting, the requisition, the bank's fact); SE-12 (`invoiceMatch`); SE-10 (`shipment`); SE-17 (`goodsReceiptLine`, `contract`, `obligation`, `compliance`) |
| 189 | **Two decision verbs carry no policy hook at all.** `t_incomingshipment_cancel` (atom `incomingshipment:cancel`): the role gate and the scope check are the only checks. `t_intake_restore` (atom `intake:triage`): the role gate is the only check. Cancelling an incoming shipment is already named in row 84 | Supplier Collaboration; Planning | P2 ‡ | S | ✓ census v3 | census v3 §3.1; D7 §6.4, finding 5 | SE-3, if ruled decisions (D6 §2) |
| 190 | **Decision verbs with no hook that requires a named person** (seven, the two of row 189 included). The census's reading is that the verbs to look at are `t_invoice_release_payment` (atom `invoice:pay`; its separation hook `invoice_releaser_not_approver` compares persons, and there is no separate named-person hook) and the two of row 189. The others are a set-up act (`t_rfq_questionnaire_set`, `t_rfq_criteria_set`), an unsurfaced verb (`t_enforcement_set`) or a false positive of the name-based reading (`t_material_ruling_set`, named inside its hook) | Operations (money) | P2 ‡ | S | ✓ census v3 | census v3 §3.2; D7 §6.4, finding 6; D6 §2 ("Which other acts are decisions") | SE-3, if ruled (D6 §2) |
| 192 | **Decision-shaped verbs on flows with no command target** (4): `t_grline_accept`, `t_grline_reject`, `t_grline_release`, `t_obligation_complete`. They cannot be dispatched, so no guard on them can fire | Operations; Contracts | P3 ‡ | — | ✓ census v3 | census v3 §3.4; D7 §6.4, finding 8 | SE-17 (when those flows are wired) |
| 193 | **Atoms held by no lane** (15): `po:issue`, `po:fulfil`, `po:close`, `asn:carry`, `invoice:match`, `quotation:award`, `quotation:reject`, `quotation:withdraw`, `shipment:create`, `shipment:advance`, `pr:source`, `pr:convert`, `requirementresponse:supersede`, `publication:supersede`, `flow:supersede`. No business role holds these, so no person can take the verb; the automation grant or a cascade does, or the verb is not surfaced | Platform (roles) | — | — | ✓ census v3 | census v3 §4; D7 §6.6 | † (as built; listed so nobody files it as a defect). A feed that fires one of these needs the automation grant: SE-6, SE-10, SE-12 |

**For a ruling by Paragon — not a defect row**

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 191 | **Decide against raise.** Fifteen approve / reject / grant / award / verify / activate verbs carry a named-person hook and no separation hook: each names who decided; none checks that the decider is a different person from whoever raised the document. `t_gr_approve`, `t_gr_partial_approve`, `t_gr_reject`; `t_invoice_approve`; `t_rfq_award`; `t_pr_approve`; `t_pr_reject`; `t_supplierdoc_verify`, `t_supplierdoc_reject`; `t_role_grant`; `t_application_approve`, `t_application_reject`; `t_publication_approve_firm`; `t_flowversion_reject`, `t_flowversion_activate`. (Eight verbs do carry a separation hook: `t_invoice_release_payment`, `t_materialrequest_approve`, `t_materialrequest_reject`, `t_psl_grant`, `t_psl_reject`, `t_flowversion_approve`, `t_mdr_approve`, `t_mdr_reject`.) Whether each of the fifteen **should** have a separation check is a ruling, not a defect by itself: several are separated by lane, and the open finding `SEGREGATION-CROSSED-IN-ONE-DRAWER-01` is about the requisition pair specifically. This list is the population that ruling would be made over | several | — (a ruling, not a defect) | — | ✓ census v3 | census v3 §3.3; D7 §6.4, finding 7 | decide (D6 §2, open decision for Paragon); SE-3 for whichever are ruled in |

## 7 · Package scope the reviews restated

Not tickets: each is already a work package in D1 §4. Listed so the Lead Engineer can see that the review confirmed the gap and where.

| Package | What the review named | Source |
|---|---|---|
| SE-14 | grouping and subtotals, a totals status bar, fill handle, range edit, set filters, column chooser, resize / reorder / pin, saved layouts, Excel export, the full ARIA keyboard set (the grid has `role=grid` since PLN-5 but no row or column indices; those come with SE-1), engine locale, server-side row model; consolidation on the shared grid | LISTS R-PLN, R-SDC; PR #399 |
| SE-9 | CSV export of the current grid view; export of the RFI answer matrix and the RFP ranking | LISTS R-PLN; PRs #408, #409 |
| SE-15 | bulk confirmation and shipment grids | LISTS R-SDC |
| SE-19 | chase as an act; call-off acknowledgement | LISTS R-SDC |
| SE-7 | notifications and scheduler; notification transport for sourcing (nothing tells a supplier of a stage advance, a conclude or a shortlist outcome) | LISTS R-SDC, R-SRC; PR #407 |
| SE-10 | AWB tracking | LISTS R-SDC |
| SE-8 | file storage (an RFI document answer and an RFP proposal document are a file name only) | LISTS R-SRC; PRs #408, #409 |
| Design 2 B8, B9 (SE Team) | the "Declined" label and level-2 root cause; supplier capacity | LISTS R-SDC |
| SE-22, SE-23 (new, 2026-10-09) | award → the forecast split; intake material codes (rows 99 and 100) | E2E; operator ruling |
| SE-16 (changed in v3) | the Flow Builder is built in the fixture for additive changes; what remains is rows 140–159 | PRs #433, #435, #438; D1 §4 |
| SE-21, SE-6 (changed in v3) | the master-data replica is built on SAMPLE records, and a change request runs to a hand-off package that is not sent; what remains is rows 160–171, 173 and 174–184 | PRs #434, #436, #437, #439; C13 |
| SE-1, SE-14 (v3) | the plan grid was re-framed on the current engine (PG-1 to PG-3); the move to AG Grid must carry it (row 136) | PRs #430–#432 |
| SE-11 (v3) | every event carries the version in force; a per-document version and a multi-version registry are not built and not needed while a version cannot change a state | C3; D1 §4 |
| no package yet | auctions; sealed bids; award → contract and PO feed (nearest: SE-6); network discovery and qualification | LISTS R-SRC "SE"; auctions and network discovery are open scope decisions in D6 |

## 8 · Where the late items went

| Item | Module | Status |
|---|---|---|
| What OPS-2 and OPS-2b left for the SE Team | Operations | rows 86–88; the real certificates and rulings are Compliance's to enter (D4) |
| What OPS-3 left | Operations | rows 90–92 |
| The decision on row 82 (requisition approval by an unnamed seat) | Planning | ruled and built: PR #417; row 82 is closed |
| The R-SUP review's P2/P3 items | Suppliers | they are the "Not in this batch" items of PRs #414 and #415 (§1): the role toast and the briefing's English text and 2025 dates are fixed (#415, #416); the default cap is row 94; the unmeasured figures are rows 89 and 97; the scripted channel demo is row 98; the briefing's remaining gaps are row 93 |
| Findings of the final review | all | §6a: P1 rows 99 and 100 (SE-22, SE-23), P2 rows 101–105 and 109 (row 101 since closed by ADM-1), P3 rows 111 and 113–118. Its other seven P1 breaks are closed (§9) |
| What ADM-1 left | Platform | rows 119–122; rows 101 and 106 closed by it |
| What UI-1a to UI-1e left | all pages | rows 123–130 |
| What PG-1 to PG-3 left | Planning, dashboard | rows 131–139 |
| What FB-1 to FB-4 left | Process changes | rows 140–159 |
| What MD-1 to MD-2b left | Master data | rows 160–171 and 173 |
| What MD-4 + MD-5 left | Master data | rows 174–184 (§6c); row 172 closed by it |
| What the v3 state-machine census found | all flows | rows 185–190, 192 and 193 (§6c); row 191 is a decision for Paragon (D6 §2) |

## 9 · Closed — do not re-file

| Item | Closed by | Note |
|---|---|---|
| A blank batch quantity reported as "Total quantity required" | SDC-4 (#403) | **LISTS R-SDC 10 shows it open; STATE lists it closed since R-SDC.** STATE is later and names the batch, so it is closed here. Not re-checked in the browser by this seat |
| The unattributed accept and dispute | SDC-3 (#402) | LISTS R-SDC 15 and STATE agree |
| A supplier's read of an event carried competitor ids | SRC-2 (#406) | LISTS "Integrity"; allowlist projection |
| A published sample (`SIM-*`) material could not be answered; "1 lines"; a draft publication could not be discarded; a delivered leg counted as incoming | SDC-5 (#404) | STATE |
| The quotation verb read neither the event's state nor its deadline | SRC-2 (#406) | PR |
| The RFQ store applied a rate or award fields by payload shape | RFx-2 (#408) | PR |
| Sample suppliers 1 and 2 had no event to quote; an event could be published past its deadline; the quote form had no payment-terms field | RFx-1 (#407) | PR |
| The intake guide and C7 did not name the one-grain refusal | PLN-3 | `docs/guides/intakeLine.en.md` names it at the pin |
| "The handover package states 127 verbs" | the v2 set | 141 at v2's pin; 163 at this pin (C1) |
| Rows 1–3: the three delivery-agreement P1 findings | OPS-3 (#413) | per the pull request; not re-walked by this seat |
| Row 20: an approval by an unnamed seat is not guarded | OPS-2 (#411) | ruled and built; `INVOICE_APPROVER_UNATTRIBUTED`, measured by the census probe |
| Row 42: supplier-side "RFQ" wording and the unlinked wizard guide | OPS-3 (#413) | per the pull request. The Indonesian marketplace teaser still reads "Peluang RFQ Terbuka" (`src/lib/i18n/marketplace.ts:78`) |
| Row 64: publication panel plurals | OPS-3 (#413) | per the pull request |
| An existing receipt cannot be resumed; packaging cannot pass the quality step; what the supplier typed does not arrive | OPS-2, OPS-2b, OPS-3 (#411–#413) | D5 §J |
| `t_gr_hold` and `t_rfq_close` have no caller (R3) | OPS-2 (#411); SRC-1 (#405) | census 2026-10-09 |
| "May a supplier mark a to-Paragon leg shipped or arrived itself?" | ruled: no | row 7 keeps the consequence |
| Rows 82 and 83: requisition approval, and forecast publish / discard / withdraw, by an unnamed seat | E2E-1 (#417) | measured by the census probe at this pin |
| Final review [4, 5a, 6a, 6b, 10a]: approval copy said "unattributed"; wizard incoterm not the one saved; no event could leave RFI with the sample roster; supplier card showed criteria nobody set and the award deadline as delivery date; exchange-rate age on the wall clock | E2E-1 (#417) | per the pull request; not re-walked by this seat. The supplier-card item is row 9, struck in v3 and read in the source at this pin |
| Final review [23, 24]: the order and the ship notice never learned of the receipt and Create ASN stayed offered; the invoice amount was free-typed | E2E-2 (#418) | per the pull request; the order's status itself stays SAP's (row 109) |
| Row 101: a receipt does not record who received | ADM-1 (#420) | `gr_receiver_named`; `receivedByPerson`, `receivedAt`; per the pull request and C1 |
| Row 106: an invoice created with no lines is admitted | ADM-1 (#420) | `INVOICE_LINES_REQUIRED`; per the pull request and C1 |
| "An invoice can no longer be drafted before a receipt is posted" (#418) | ADM-1 (#420) | allowed again by ruling, up to the confirmed quantity |
| UI-1d's two questions (two solid buttons that lead to "not available yet"; the commit inside a container) | UI-1e (#429) | ruled; row 128 keeps the two unbuilt actions |
| UI-1e: four pop-ups were not the shared `Dialog` | PG-1 (#430) | PG-1 put the FX-rate confirmation, the full-screen section, the expanded dashboard widget and the identity panel on it. UI-1e's own list named a collaboration panel, not the identity panel; read at this pin, `role="dialog"` is written only in `Dialog.tsx` and `SidePanel.tsx`, so no panel writes its own. Not covered: the sourcing wizard's overlay (row 25) |
| UI-1c-3 and UI-1c-4: five boxes needed a `Card` state; the guide tabs were chips; the legacy stylesheet held its own variables; `Field` blocks tinted by their page | UI-1d (#428) | card states, `Tabs`, the stylesheet on the tokens, inset cards |
| PG-1: months in view did not move; PG-2: two reason fields in the drawer, colour alone in a narrow column, a resize lost the place, the weekly view scrolled at 1366×768 | PG-2 (#431), PG-3 (#432) | per the pull requests |
| PG-3: the dashboard's sourcing window note was stale; a typed change in a narrow column was told by its tint alone | FB-1 (#433) | the window counts; a pencil mark |
| FB-1: saving a draft had no screen; `Draft` had no way out | FB-2 (#435), FB-3 (#438) | the composer; the whole machine |
| FB-2: the composer could not be opened read-only; closing it did not ask; "Save draft" was the solid button until proposing existed | FB-3 + FB-4 (#438) | the review drawer; the composer asks before discarding (operator ruling); read at this pin, "Save draft" is solid only while there is unsaved work and "Propose" is solid once the draft is saved (`ChangeComposer.tsx:517-527`) |
| MD-1: "Readers still read the fixtures" | MD-2 (#436) | lookups and pickers read the replica |
| MD-2: the planning fixture's generated sample materials and suppliers; the unit lists on the requisition and sourcing forms | MD-2b (#437) | replica records; the forms read the unit table |
| Row 172: change requests and the hand-off to SAP are not built and C13 does not specify them | MD-4 + MD-5 (#439) | the `masterDataRequest` flow and C13 §8; per the pull request, C1 and the flow read at this pin. The call to SAP and SAP's answer are rows 174 and 175 |
| MD-1 to MD-2b: "no change request" | MD-4 + MD-5 (#439) | three kinds of request; supplier create and extend are row 180 |
