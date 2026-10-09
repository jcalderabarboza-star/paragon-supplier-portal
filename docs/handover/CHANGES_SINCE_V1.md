# Changes since handover v1 — for the Lead Engineer

**Status:** v2, final pass, for Seat 2's commit · 2026-10-09 · consultant seat (Seat 3), read-only.
**From:** `handover-v1` (tag at `9cc535b`; its documents described `main` @ `6f1da15a…`, PR #392).
**To:** `main` @ `166a5611303121eb509675dbe19ff78edf786899` (merge of PR #418). `handover-v2` is tagged on Friday 9 October.

A review went through the platform one module at a time and fixed what it found, in twenty-four pull requests (#395–#418). The last two fix what a final review found when it walked one material through the whole chain. This note says what is different for someone who read v1. It is written from the pull-request descriptions and checked against the pinned tree where a figure or a file is named.

---

## The numbers that moved

| | v1 | Now | Why |
|---|---|---|---|
| State machines (flows) | 28 | 30 | one for a supplier's answer at the RFI and RFP stages; one for Compliance's rulings on whether halal and BPOM apply to a material |
| States | 112 | 118 | six added, none removed (not pinned by a test; from the census, D7 §6) |
| Verbs | 127 | 141 | sourcing stages, questionnaire, criteria, scoring; discarding a draft publication; withdrawing a quotation; recording an inspection; approving an invoice again; ruling on a material |
| Flows a verb can write through | 22 | 24 | the same two new flows |
| Process guides | 56 | 60 | one English and one Indonesian guide for each |
| Tests the gates require | 7,262 in 430 files | 8,686 in 481 files | every batch added its own |
| Service methods | 71 | 72 | one added with receiving (OPS-2) |
| Routes, modules, roles | 51 / 16 / 13 | unchanged | — |
| Sample persons | 11 | 16 | five more supplier persons, so every sourcing category has two suppliers a tester can sit as |
| SE work packages | 21 | 23 | SE-22 and SE-23, ruled on 9 October |

All but the states and work-package rows are pinned by a test (D7 §3 says which).

---

## Planning (PLN-1 to PLN-5)

- **Who does what changed.** A planner now commits a line from the grid, and that raises the requisition; procurement approves it. In v1 the same seat's "create requisition" right did both. The planner's right is new and is called `intake:triage`.
- **Intake Review is no longer a separate page.** It is a view inside the planning grid, and it lists exactly the lines the grid can commit. The old address redirects.
- **One material is planned at one grain.** Raw materials monthly, packaging weekly. Committing the same material and period at both grains is refused.
- **A requisition's value is unit price × the quantity committed.** Before, it carried the value of the suggestion even when the planner changed the quantity.
- **The grid is usable at volume.** A push of 50 rows runs as one operation and shows progress; one reason can be applied to many rows; the requisitions list has bulk actions. The grid starts at the top of the screen, and typing, Delete, undo and copy behave as a spreadsheet user expects.
- **For the SE Team:** what v1 already listed (the AG Grid move and the Excel-grade features), plus two things the review ranked P2 — a flat view (one row per material and period, measures as columns) and bulk "accept as delivered" / "dismiss selected" on intake — and a few small items.

## Supplier Collaboration (SDC-1 to SDC-5)

- **Weekly and monthly plans now live side by side.** Publishing a weekly plan used to retire the monthly one and its open answers. Each grain now has its own current plan.
- **The buyer and the supplier see the same thing about a line**: one deadline, the same meaning of "carried over" and "overdue".
- **A supplier's revision replaces the earlier answer only when it is sent**, not while it is a draft. Accepting or disputing an answer now needs a named person.
- **Nothing a supplier types is silently dropped**: a stock batch with no number is refused at its row, and a reply of several lines becomes several rows.
- **Every state has a way out**: a draft plan can be discarded; a sample material can be answered; a shipment Paragon has already received is no longer counted as on its way.
- **Ruled, and worth knowing:** a supplier never marks a shipment as arrived at Paragon. The goods receipt records arrival.
- **This module has the longest list for the SE Team** in `SE_BACKLOG_v2.md`. The largest are the missing bulk path for confirmations (already SE-15), the acknowledgment path, and several screens that go stale or lose sight of an answer when a plan is replaced.

## Sourcing (SRC-1, SRC-2, RFx-1 to RFx-3)

- **v1 said RFI and RFP were absent. They are built.** One sourcing event moves through RFI, then RFP, then RFQ. The buyer chooses where it starts.
  - At **RFI** the buyer can ask a questionnaire (six question types; an answer can be marked as one that takes a supplier out).
  - At **RFP** the buyer sets weighted criteria that add up to 100; suppliers send a proposal per criterion; evaluators score each proposal from 1 to 5 and the platform ranks them.
  - Between stages the buyer closes bidding and **advances with a shortlist**, giving one reason to the suppliers left out. The buyer can also **conclude without an award**. Award happens only at the RFQ stage.
- **The award path now works on an event made on the platform.** In v1 only pre-written sample events could be awarded, because "who has responded" was a stored list that nothing updated. It is now worked out from the quotations.
- **Quotations are held to the rules**: refused on an event that is not open, after the deadline, a second time from the same supplier, or with a validity date in the past.
- **A supplier sees only what it should** of an event: never another supplier, never the scores.
- **Publishing, cancelling, awarding, advancing and concluding need a named person.**
- **Both sides now say "sourcing event"** (the supplier side since OPS-3); "RFQ" is kept for the stage and the document number.
- **For the SE Team:** exports of the answer matrix and the ranking (SE-9); notifying suppliers of outcomes (SE-7); real file upload — a document is only a file name today (SE-8); shared templates (SE-18); blind scoring, inviting a supplier to a running event, line items for an event with several materials, and letting a supplier decline, revise or withdraw a quotation (SE-17). Seven buttons still only show a message. Auctions are still not built and still an open scope decision.

## Operations — money (OPS-1)

- **The invoice match is real now.** In v1 an invoice was "matched" if its total equalled the order's. The review released Rp 4.0B against a Rp 2.0B order with half the goods received. An invoice now matches only up to what was received and accepted, less what earlier invoices already claimed, with a 1% tolerance.
- **An invoice that arrives after its goods receipt is matched**; before, it never was.
- **Approval and payment release record who decided**, and the named person who approved cannot also release.
- **The supplier is no longer told a payment was credited** when it was only released.
- **What moved out of SE-12:** the portal's side of the match. **What stays in SE-12:** receipts and invoice lines from SAP, and e-Faktur. (Since 9 October an invoice made in the portal states its lines; the match still compares totals, so it cannot yet tell a price difference from a quantity difference.)
- **Closed the next day (OPS-2):** an approval needs a named person. An invoice approved by nobody is approved again by a named person before its payment can be released.

## Operations — receiving (OPS-2, OPS-2b)

- **An existing receipt can be worked from the list.** Before, "Start inspection" opened the form for a new receipt. Now it opens that receipt: record the results, then accept, part-accept, reject, or place a hold with a reason.
- **Compliance rules whether halal and BPOM apply to a material**, on a ledger: each ruling has a reason and a named person, and a later ruling replaces an earlier one without erasing it. Halal applies to packaging unless ruled otherwise.
- **Receiving now stops, where it used to warn.** Where halal applies, the supplier needs a valid certificate on file for that material; where BPOM applies, the lot check must be answered. Goods cannot be accepted until then. This is enforced where goods are accepted, not only on the form, and both read the same day (the declared present, 31 August 2026).
- **The certificates and rulings that make this passable are SAMPLE data**, marked as such. One supplier and material pair and one material are left stopped on purpose, to show the block.
- **For the SE Team:** goods stopped at the quality step cannot be held or rejected through the form; a partly delivered order cannot take a further ship notice; "Override hold" still only shows a message.

## Operations — what the supplier typed (OPS-3)

- **An order confirmation keeps everything**: the confirmed date, the note and the quantity per line are stored and shown to both sides, with the time of the act.
- **A ship notice carries every order line**, at the confirmed quantity, with packages, weight, batch, lots and notes, and the buyer's shipments page lists it. The packing list is still only a file name.
- **The three delivery-agreement findings the review ranked P1 are fixed**: a line delivered late is no longer called overdue; the "flag over 10%" setting now flags; a past-dated draft line no longer offers a Release.

## Suppliers and figures (SUP-1, SUP-2, FIN-1)

- **A named person decides.** Approving or refusing a supplier application, requesting, confirming or refusing a certificate, every preferred-supplier decision, accepting or declining a material request, granting a role, and a buyer recording a supplier's stock are refused from a seat that names nobody. A certificate confirmation records who and when.
- **Figures that are not measured say so.** Analytics, Scorecard, Risk, a supplier's grade and score and the storefront statistics carry "Illustrative — not measured". Nothing was recomputed.
- **The supplier's briefing is about that supplier**: its own order, days counted from the declared present, in the reader's language.

## State-machine census (9 October)

The state machines were re-counted at the new commit and compared with v1 (D7 §6).

- **Nothing new strands.** On the flows that can write, one state has no way out, and it is the one v1 named: a requisition waiting on a purchase order that only S/4 can create.
- **None of the fourteen verbs added since v1 lacks a screen** where one was intended.
- **The one gap it found is closed.** Approving a requisition from a seat that names nobody was accepted and recorded against nobody. It is refused since #417, and the census was re-run at the final commit to confirm it.
- Rejecting a requisition, accepting or rejecting goods, and publishing, discarding or withdrawing a forecast now need a named person too. A shorter set of acts still carries no such check (disputing an invoice, holding goods, closing bidding, and others). D6 §2 lists them for the operator.

## Final review — one material, end to end (E2E-1, E2E-2)

On 8 and 9 October one material (Niacinamide) was walked through every hand-off, from the planning grid to the supplier's remittance, in English and then in Indonesian. It found no P0 and nine P1 breaks.

- **Fixed (#417):** the approval note no longer says "unattributed" when a named person approves; the sourcing wizard stores the incoterm it shows; the supplier's event card shows the criteria the buyer set and the event's own delivery date, not sample weights and the award deadline; an exchange rate's age is judged on the same day as every deadline on the page; the sample roster has enough suppliers for an event to leave RFI.
- **Fixed (#418):** the order and the ship notice show what was received, on both sides, and Create ASN is no longer offered for an order that is fully received. The order's official status stays SAP's, and the page says so. The invoice form opens on the order's lines at the accepted quantity; the supplier may invoice less, never more.
- **Given to the SE Team by ruling:** an award does not reach the forecast split (SE-22), and an intake line has no material code, so it does not join the planning grid (SE-23).
- **Still open, smaller:** five P2 breaks (for example, the receipt does not record the person who received) and a list of observations, several of them Indonesian wording. They are rows 99–118 of `SE_BACKLOG_v2.md`.

---

## The documents themselves

- Every file of the handover set is re-issued as v2 against the new commit. The package list is now **twenty-three** SE work packages (v1: twenty-one); D1 §4 marks what moved in or out of each.
- Two new files: `SE_BACKLOG_v2.md` (118 numbered rows, of which 8 are closed and kept for one issue, so 110 are open; two are P1 and are the new packages SE-22 and SE-23; each with its package) and this note.
- **Most of the corrections v1 asked for in repository documents were applied** in the commit that created v1 (D8 §0 lists each one and what is still open). v1's own text did not say so; v2 does.
- The six design documents and the five review documents are **unchanged** (same content hashes). They describe an older commit; D8 §7 lists what they say that is no longer true.

## Three things to know before trusting this set

1. **The backlog is built from a compilation, not from the review reports.** The four reviews' lists were compiled from the reports as delivered; the Operations P2 list is cut off mid-item, and part of the Supplier Collaboration report arrived truncated. Rows that only a pull request names carry a severity the compiling seat assigned, and are marked.
2. **Rulings made this week live partly outside the repository** — in pull-request descriptions and a working state file. D6 §3a names the source of each.
3. **The last two days' fixes were not walked by the seat that wrote these documents.** #417 and #418 are described from their pull requests and checked against the code. The seat that built them walked them in a browser; the screenshots are outside the repository.
