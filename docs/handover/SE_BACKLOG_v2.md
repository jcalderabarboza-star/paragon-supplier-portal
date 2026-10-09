# SE backlog v2 — what the module review found and did not fix

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09, fourth issue (re-pinned; PRs #417 and #418 applied; the final review added; the census re-run) · consultant seat (Seat 3), read-only. Tree pin: `main` @ `166a5611303121eb509675dbe19ff78edf786899` (merge of PR #418, E2E-2).
**Audience:** the Lead Engineer and the SE Team. Each row is a finding from the module-by-module review of 2026-10-02 to 2026-10-08 that was left open, an item a pull request recorded as "not in this batch" or "not built", or a break of the final review of 8 and 9 October that was not fixed.
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

**How the three were merged.** Where LISTS and a ‡ row named the same thing, the LISTS row replaced it and the severity is LISTS's. Where LISTS and STATE named the same Supplier Collaboration item, there is one row citing both. Where they disagree on whether an item is open, the later and more specific source wins and the row says so: one item LISTS shows open is closed by STATE (§7).

**Columns.** *Sev*: as the review gave it. ‡ = no review list ranks it; assigned by this seat. *Size*: S = up to a day, M = two to five days, L = more than a week; an estimate by this seat, not measured. *Open at pin*: ✓ = this seat confirmed it in the pinned source by grep; blank = carried as reported, not re-checked. *Package*: the SE work package of D1 §4; † = no package names this kind of work (screen copy, locale, page accessibility), and the Lead Engineer assigns it.

**Ranking rule.** P1, then P2, then P3. Inside a level: a screen that tells a user something false, or an act that duplicates or loses a record, first; then an act with no way out; then stale or missing reads; then wording and locale; then ergonomics. The severity is the review's; the order inside a level is this seat's.

---

## 2 · P1 — rows 1–3 and 82 are closed; the two open P1 rows are the final review's and are new packages (§6a, rows 99 and 100)

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 1 | ~~Delivery agreements: the supplier is told "Overdue — Paragon is waiting" for a line already delivered late~~ — **CLOSED at this pin, PR #413; kept one issue so the number is not reused** | Operations | P1 | S | | LISTS R-OPS; `qaHandover\review-ops\` | SE-19 if not fixed this week |
| 2 | ~~Delivery agreements: "Governed — flag over 10%" flags nothing~~ — **CLOSED at this pin, PR #413; kept one issue so the number is not reused** | Operations | P1 | M | | LISTS R-OPS | SE-18 (governed settings) if not fixed this week |
| 3 | ~~Delivery agreements: past-dated draft lines offer a Release that always refuses~~ — **CLOSED at this pin, PR #413; kept one issue so the number is not reused** | Operations | P1 | S | | LISTS R-OPS | SE-17 if not fixed this week |
| 82 | ~~A requisition approval by a seat that names nobody is admitted and recorded against nobody~~ — **CLOSED at this pin, PR #417 (`pr_decider_named`); the census probe now reads refused; kept one issue so the number is not reused** | Planning (requisitions) | P1 ‡ | S | | census 2026-10-09; PR #417 | closed |

## 3 · P2

| # | Item | Module | Sev | Size | Open at pin | Evidence | Package |
|---|---|---|---|---|---|---|---|
| 4 | An acknowledgment goes through the commitment review lane: accepting one toasts "is committed", and a disputed acknowledgment cannot be answered | Supplier Collaboration | P2 | M | | LISTS R-SDC 1; STATE | SE-17 |
| 5 | The Acknowledge button stays live after acknowledging, and repeats create duplicates | Supplier Collaboration | P2 | S | | LISTS R-SDC 9; STATE | SE-4 (idempotency on the verb) |
| 6 | The ASN picker allows another material's ASN or an already-delivered one, and the same ASN can be linked twice | Supplier Collaboration | P2 | M | | LISTS R-SDC 12; STATE | SE-17; SE-10 for the ASN facts |
| 7 | A leg to Paragon on a new ASN stays "incoming" in coverage: no surface or feed moves an ASN to `Delivered`. Decided: the supplier never marks arrival; receipt records it | Supplier Collaboration | P2 | M | | STATE (SDC-5); LISTS "DECIDED, SE list"; PR #404 | SE-10 (TMS feed), or a receipt cascade under SE-17 |
| 8 | Counts disagree on one seat: the dashboard says "9 to award", the sourcing list "Ready to award 4" | Sourcing | P2 | S | | LISTS R-SRC | † |
| 9 | The supplier's event card shows evaluation weights (Quality, Sustainability, Risk) that are sample values the buyer's score does not use | Sourcing | P2 | S | | LISTS R-SRC | † (remove, or drive from the event's criteria as an RFP already does) |
| 10 | After a rate is recorded, a USD quotation still shows only USD; the IDR equivalent appears nowhere but the price score | Sourcing | P2 | S | | LISTS R-SRC | † |
| 11 | Two clocks on one row ("Created 06 Oct", deadline 14 Nov, "75d remaining"); the day of an award, an advance, a conclude and a response is stamped from the browser clock while deadlines are judged at the declared present | Sourcing | P2 | S | | LISTS R-SRC; PR #407 | SE-4 (one server clock) |
| 12 | Money abbreviations mix conventions: EN "Rp 1.3B" beside "Rp 410.0jt"; ID "Rp 2.0M" for two billion | Operations | P2 | S | | LISTS R-OPS | † (one formatter; `formatIDR` is the rule) |
| 13 | Dates: Indonesian pages mix "31 Aug", "30 Sep" and "31 Agu"; orders live in 2025 while shipments and receipts live in 2026 | Operations | P2 | M | | LISTS R-OPS | † for the format; D4 for the fixture years |
| 14 | Receipt quantities carry no unit; the confirm panel sums mixed units as "units" | Operations | P2 | S | | LISTS R-OPS | SE-17 (receipt lane) |
| 15 | The language switch resets the receipt wizard to step 1 and discards what was entered | Operations | P2 | S | | LISTS R-OPS | † |
| 16 | The supplier is not told why an invoice is held as a variance | Operations (money) | P2 ‡ | M | | LISTS R-OPS "From OPS-1" (no level given); PR #410 | SE-17 |
| 17 | No dispute-outcome ledger and no accept-variance verb (Design 3 §3.7) | Operations (money) | P2 ‡ | L | | LISTS R-OPS "From OPS-1" (no level given); PR #410 | SE-17 |
| 18 | The match compares totals and does not read an invoice's lines, so it cannot tell a price difference from a quantity difference (since #418 an invoice made from the form does store its lines) | Operations (money) | P2 ‡ | L | | PR #410 | SE-12 |
| 19 | `t_invoice_remit` has no feed: no invoice reaches `Remittance Received` except by fixture | Operations (money) | P2 ‡ | M | ✓ no hook or page names it | PR #410 | SE-6 |
| 20 | ~~An approval by an unnamed seat is not guarded: such an invoice can be released by any seat holding the pay right~~ — **CLOSED at this pin, PR #411; kept one issue so the number is not reused** | Operations (money) | P2 ‡ | S once sign-in exists | | PR #410 | SE-3; decision in D6 |
| 21 | Toast-only buttons: Export, Export comparison, Event templates, Ask question, Decline RFQ, Start qualification, Invite to RFQ | Sourcing | P2 | M | ✓ `SupplierRFQs.tsx:416-417`, `sourcing.ts:951`, `discovery.ts:65`, `:122` name them; that each only toasts is as reported | LISTS R-SRC; PRs #406–#409 | SE-9 (the two exports); SE-18 (templates); SE-17 (decline, qualification, invite); SE-7 (ask question) |
| 22 | No verb adds an invitee to a published event (operator ruling: SE list) | Sourcing | P2 | M | | LISTS R-SRC; PR #409 | SE-17 |
| 23 | Blind scoring is not built: evaluators see each other's averages (operator ruling: SE list) | Sourcing | P2 | M | | LISTS R-SRC; PR #409 | SE-17 |
| 24 | A multi-material event carries one quantity and one unit price: line items are not built | Sourcing | P2 | L | | LISTS R-SRC | SE-17; SE-21 for what a line names |
| 25 | Wizard: a requisition prefill does not select its material, so Next is disabled with no reason; the modal has no dialog role | Sourcing | P2 | S | | LISTS R-SRC | † |
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
| 36 | The flat view (material × bucket rows, measures as columns) is not built | Planning | P2 | M | | LISTS R-PLN | SE-14 |
| 37 | Bulk "accept as delivered" and "dismiss selected" on intake are not built | Planning | P2 | M | | LISTS R-PLN | SE-14; SE-15 for the pattern |
| 38 | Shipment advance refusals show raw English developer strings | Supplier Collaboration | P2 | S | | LISTS R-SDC 11; STATE | † |
| 39 | The next-actor copy offers "revise" on an acknowledgment, where revise does not exist | Supplier Collaboration | P2 | S | | LISTS R-SDC 8; STATE | † |
| 40 | While a revision is a draft, the prior answer still reads "Awaiting Paragon — or revise your answer yourself" | Supplier Collaboration | P2 | S | | STATE P2; LISTS "later additions"; PR #402 | † |
| 41 | A line whose class changed at the same quantity reads "Changed — was 800 KG" | Supplier Collaboration | P2 | S | | STATE P2; LISTS "later additions"; PR #402 | † |
| 42 | ~~The supplier side still says "RFQ" where it means the event, and the wizard names its guide without linking it~~ — **CLOSED at this pin, PR #413; kept one issue so the number is not reused** | Sourcing | P2 | S | ✓ `src/lib/i18n/marketplace.ts:78` (supplier-side "RFQ") | LISTS R-SRC; PR #409 | † |
| 43 | The supplier inbox is worded for an operator ("Paste the supplier's reply") | Supplier Collaboration | P2 | S | | LISTS R-SDC 16; STATE | SE-7 |
| 44 | In Indonesian, "Firm", "Semi-firm", "FIRM — periode terkunci" and "MODEL" stay English | Supplier Collaboration | P2 | S | ✓ `src/lib/i18n/sdcConsolidation.ts:203` | LISTS R-SDC 17; STATE | † (locale review) |
| 45 | Accessibility: axe flags eyebrow-label contrast on every Supplier Collaboration page; the consolidation grid cannot be reached by keyboard | Supplier Collaboration | P2 | M | | LISTS R-SDC 18; STATE | † (page accessibility); SE-14 for the grid |
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
| 64 | ~~The publication panel's counts are uncounted in English: "1 supplier lines", "1 firm lines await", "1 material-periods allocated"~~ — **CLOSED at this pin, PR #413; kept one issue so the number is not reused** | Planning | P3 | S | ✓ `src/lib/i18n/planGrid.ts:279`, `:287`, `:318` | STATE P3; LISTS "later additions"; PR #404 | † |
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
| 80 | Material-row labels in the grid still truncate when long | Planning | P3 ‡ | S | | PR #396 | SE-14 |
| 81 | A triage record written before PLN-2 for a monthly packaging line no longer emitted is refused on read | Planning | P3 ‡ | S | | PR #396 | SE-4 (a migration note; browser storage only) |
| 83 | ~~Publishing, discarding and withdrawing a forecast publication carry no named-person check~~ — **CLOSED at this pin, PR #417 (`publication_actor_named`); kept one issue so the number is not reused** | Supplier Collaboration | P2 ‡ | S | | census 2026-10-09; PR #417 | closed |
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
| 101 | A receipt does not record who received: "Received by" is a dropdown value ("Warehouse Supervisor"), not the person in the seat [22a] | Operations (receiving) | P2 | S | ✓ PR #417 says it is still open | E2E; PR #417 | SE-3; decide (D6 §2) |
| 102 | The awards history shows award value "—" for an award not in rupiah, while the event panel shows the value [11a] | Sourcing | P2 | S | | E2E | SE-17 |
| 103 | The estimated value differs between the intake line (Rp 990.0jt) and the requisition raised from it (Rp 891.0jt); the requester reads "Planning lane", not the planning person who committed [2] | Planning | P2 | S | | E2E | SE-17; the person: SE-3 |
| 104 | A sourcing event raised from a requisition does not show which requisition it came from, and does not carry its estimated value, category or bucket [5] | Sourcing | P2 | S | | E2E | SE-17 |
| 105 | On a receipt opened from a ship notice, "Expected" shows the ordered quantity, not the confirmed or shipped one, and the lot numbers typed on the notice are not shown [20] | Operations (receiving) | P2 | S | | E2E | SE-17 |
| 106 | An invoice created with no lines is not examined and is admitted with any amount; the match judges it | Operations (money) | P2 ‡ | S | ✓ PR #418 | PR #418 | decide (D6 §2); SE-12 |
| 107 | An invoice line's ceiling is the accepted quantity and does not subtract what earlier invoices already claimed (earlier invoices carry no lines); the match is what catches an order claimed twice | Operations (money) | P2 ‡ | M | ✓ PR #418 | PR #418 | SE-12 |
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
| no package yet | auctions; sealed bids; award → contract and PO feed (nearest: SE-6); network discovery and qualification | LISTS R-SRC "SE"; auctions and network discovery are open scope decisions in D6 |

## 8 · Where the late items went

| Item | Module | Status |
|---|---|---|
| What OPS-2 and OPS-2b left for the SE Team | Operations | rows 86–88; the real certificates and rulings are Compliance's to enter (D4) |
| What OPS-3 left | Operations | rows 90–92 |
| The decision on row 82 (requisition approval by an unnamed seat) | Planning | ruled and built: PR #417; row 82 is closed |
| The R-SUP review's P2/P3 items | Suppliers | they are the "Not in this batch" items of PRs #414 and #415 (§1): the role toast and the briefing's English text and 2025 dates are fixed (#415, #416); the default cap is row 94; the unmeasured figures are rows 89 and 97; the scripted channel demo is row 98; the briefing's remaining gaps are row 93 |
| Findings of the final review | all | §6a: P1 rows 99 and 100 (SE-22, SE-23), P2 rows 101–105 and 109, P3 rows 111 and 113–118. Its other seven P1 breaks are closed (§9) |

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
| "The handover package states 127 verbs" | this v2 set | 141 |
| Rows 1–3: the three delivery-agreement P1 findings | OPS-3 (#413) | per the pull request; not re-walked by this seat |
| Row 20: an approval by an unnamed seat is not guarded | OPS-2 (#411) | ruled and built; `INVOICE_APPROVER_UNATTRIBUTED`, measured by the census probe |
| Row 42: supplier-side "RFQ" wording and the unlinked wizard guide | OPS-3 (#413) | per the pull request. The Indonesian marketplace teaser still reads "Peluang RFQ Terbuka" (`src/lib/i18n/marketplace.ts:78`) |
| Row 64: publication panel plurals | OPS-3 (#413) | per the pull request |
| An existing receipt cannot be resumed; packaging cannot pass the quality step; what the supplier typed does not arrive | OPS-2, OPS-2b, OPS-3 (#411–#413) | D5 §J |
| `t_gr_hold` and `t_rfq_close` have no caller (R3) | OPS-2 (#411); SRC-1 (#405) | census 2026-10-09 |
| "May a supplier mark a to-Paragon leg shipped or arrived itself?" | ruled: no | row 7 keeps the consequence |
| Rows 82 and 83: requisition approval, and forecast publish / discard / withdraw, by an unnamed seat | E2E-1 (#417) | measured by the census probe at this pin |
| Final review [4, 5a, 6a, 6b, 10a]: approval copy said "unattributed"; wizard incoterm not the one saved; no event could leave RFI with the sample roster; supplier card showed criteria nobody set and the award deadline as delivery date; exchange-rate age on the wall clock | E2E-1 (#417) | per the pull request; not re-walked by this seat |
| Final review [23, 24]: the order and the ship notice never learned of the receipt and Create ASN stayed offered; the invoice amount was free-typed | E2E-2 (#418) | per the pull request; the order's status itself stays SAP's (row 109) |
