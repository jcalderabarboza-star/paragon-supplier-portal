# Changes since handover v2 — for the Lead Engineer

**Status:** v3 · 2026-10-13 · written read-only.
**From:** `handover-v2` (tag at `b0f9a97b`, 2026-10-09; its documents described `main` @ `166a5611…`, PR #418).
**To:** `main` @ `aac5f8588d55e851d0d530e3454ee1f4b649137c` (merge of PR #439, MD-4 + MD-5). This note was first written at `3021f3d6…` (merge of PR #438) and re-pinned once.

Twenty pull requests merged after the tag (#420–#439), in five lanes: administration, the interface, the planning grid, the Flow Builder, and master data. This note says what is different for someone who read v2. It is written from the pull-request descriptions, `CLAUDE.md`'s dated paragraphs and the contracts, and checked against the pinned tree where a figure or a file is named. Nothing was built, run or walked for it.

`CHANGES_SINCE_V1.md` does the same for v1 → v2 and is not repeated here.

---

## The numbers that moved

| | v2 | Now | Source of the "now" figure | Why |
|---|---|---|---|---|
| State machines (flows) | 30 | 33 | C1's Axis 2 heading and "Wiring census" (`docs/contracts/C1-methods.md`), pinned by `c1MethodSurface.contract.test.ts` | one for a change to a process (`flowVersion`); one ledger for the steps a change adds (`processStep`); one for a change to master data (`masterDataRequest`) |
| Verbs | 141 | 163 | C1's header (`:3-4`) | two at FB-1 (create and save a draft); eleven at FB-3 + FB-4 (nine more acts on a change, two on a step); nine at MD-4 + MD-5 (the acts of a master-data request) |
| Flows a verb can write through | 24 | 27 | C1's header | the same three flows |
| Flows authored and not wired | 6 | 6 | C1 "Wiring census" | the same six |
| Service methods | 72 | 76 | C1's header | four read methods for master data (MD-1) |
| Kinds of command refusal | 12 | 13 | `src/services/transitions/refusals.ts` (order pinned by a test) | `STEP_PENDING`: a step a change added is due |
| Routes | 51 | 54 | `src/handoverFigures.pin.test.ts` | the Super Admin activity view (ADM-1); the master-data page (MD-1); the same page on its Change requests view, `/buyer/master-data/requests` (MD-4). The Flow Builder added none |
| Business roles | 13 | 14 | `src/handoverFigures.pin.test.ts` | `super_admin` (ADM-1) |
| Sample persons | 16 | 18 | `src/handoverFigures.pin.test.ts` | one Admin, one Super Admin (ADM-1) |
| Liveness capabilities | 27 | 28 | `src/handoverFigures.pin.test.ts` (5 green and 1 `SPEC`, by name, unchanged) | `masterData`, which is not green |
| Modules | 16 | 16 | `src/handoverFigures.pin.test.ts` | — |
| Process guides | 60 | 66 | `ls docs/guides` (33 pairs); `guides.test.ts` requires a pair per flow | English and Indonesian for each of the three new flows |
| Tests the gates require | 8,686 in 481 files | 9,464 in 517 files | `scripts/floor.json` at the tag and at the pin (a floor, not an equality) | every batch added its own |
| Edge-gate tests | 7 | 7 | `scripts/floor.json` | — |
| Contracts | C1–C12 | C1–C13 | `docs/contracts/` | C13, master data |
| Browser storage keys | 6 | 9 | the grep in D4's method line; no test pins it | process-change versions; two plan-grid view preferences. PR #439 added none: master-data requests are in memory |
| Declared loose ends | 14 | 15 | the rows of `looseEndCensus.ts` at the pin (held both ways by `flowGraph.test.ts`; not re-run) | the step ledger has no creation verb. PR #439 did not touch the file |
| SE work packages | 23 | 23 | D1 §4 | none added; SE-16, SE-21 and SE-11 changed |

**The state-machine census was run again for v3**, by Seat 3 at this pin, with `vite-node` and controls (`CENSUS_v3.md`; folded into D7 §6). It reads 33 flows, 133 states, 163 verbs, 27 wired targets, 172 policy hooks registered and all 172 in use, 15 cascade links from 14 sources, and 103 atoms of which 15 are held by no lane. v2's census read 30 flows, 118 states, 141 verbs, 24 wired targets, 152 hooks in use, 13 cascade links and 94 atoms. They are two instruments (v2's also walked every dispatch site to a screen; v3's reads the flow definitions only), no test pins either set, and where the census and C1 disagree C1's test is the authority. Its findings are backlog rows 185–193 and one open decision in D6 §2.

A reader of the files at `main` between the tag and this pin will have seen some of these figures already: ADM-1, MD-1 and MD-4 + MD-5 edited nine files under `docs/handover/` in place (`git diff --stat handover-v2 aac5f858 -- docs/handover`). They were brought only part of the way (D7 still said 72 methods where D1 said 76). v3 makes them agree.

---

## Administration (ADM-1, #420)

**Unlearn:** "the tree holds one administrator role, and no role is exempt from any four-eyes check" (v2 D6 §2). "An invoice created with no lines is admitted." "The receipt does not record the person who received." "An invoice cannot be drafted before a receipt is posted."

**Built**
- **Two administrator roles.** `super_admin` is new; `admin` changed. Both hold every buyer-side permission and no supplier-side act.
- **The Super Admin is exempt from five refusals:** the three same-person checks (releasing a payment one approved; deciding a preferred-supplier proposal one made; deciding a material request one raised), the preferred-supplier check that one seat holds both authorities (`PSL_SEAT_HOLDS_BOTH_AUTHORITIES`), and the lock that stops a sample person loosening a governed setting. Each such act needs a one-line reason, is refused by name without one (`SUPER_ADMIN_REASON_REQUIRED`), and is recorded on the event (`bypass`, with the check and the reason). Where the act has a document (an invoice, a preferred-supplier decision, a material request) the document shows a note as well; a loosened setting has no document and shows only on the activity view. The Admin is not exempt. The exemption belongs to the role, not to a permission: a custom role copied from `super_admin` does not carry it.
- **A Super Admin activity view** under Platform lists every such act. Only the Super Admin and Compliance can read it. It is the first page that gates a read on role.
- **Three rulings of 9 October are built:** an invoice must state its lines; invoicing before a receipt is allowed up to the confirmed quantity, and the match waits for the receipt; a goods receipt records the named person who received and the instant.
- **Surfaces:** "New role" opens the creation form as a pop-up; the buyer dashboard's lane chips filter the alerts as well as the action queue.

**Left for the SE Team**
- The activity view reads the session's in-memory audit trail and is empty after a reload (SE-4).
- A sample Super Admin is not exempt on production; the exemption needs real sign-in there (SE-3).
- `C10-identity.md` was not amended; the record is in C1 and C3.
- One question for the operator: a module switch applies on Save, with its reason, and not when the toggle is pressed. If "immediately" was meant to be the toggle, that is a further change (backlog row 119).
- All four items above are backlog rows 119–122.

---

## The interface (UI-1a to UI-1e, #421–#429)

**Unlearn:** "solid action-blue buttons are retired; outline is the only primary register" (v2 D6 §3). And the habit of styling a table, a field or a button in the page.

**Built**
- **One of each thing.** A table is `DataTable` (a column says what kind it is — id, text, number, money, date, status, actions — and the kind decides how the cell looks). A list page is `ListPage`. A fact in a drawer is a `Field`. A form control is 40 px high, everywhere. A box is a `Card` or a `Notice`. Something pressed is a `Button`, one of four small siblings (`LinkButton`, `IconButton`, `ToggleChip`, `RowButton`), or a `CardButton`. A pop-up is `Dialog` or the drawer `SidePanel` (every pop-up since PG-1, #430; the sourcing wizard's overlay is not on either, backlog row 25).
- **A gate holds it** (`src/lib/uiGate/`). A page that writes its own `<table>`, `<button>`, `<input>`, heading, border, colour or font size fails a test, and so fails `npm run gates`, unless the file is on a named list with a reason. Those lists can only shrink.
- **Colour and type.** Text and fill are separate colour tokens, so no text sits under 4.5:1 contrast. Nothing renders under 11 px and the heaviest weight is semibold (the channel demo page is exempt by name, backlog row 124). Sample and illustrative markers are neutral and dashed; amber means a real warning. The red token is called `critical`.
- **Solid buttons are back, with a rule.** A page has at most one solid button: its main action. Inside a drawer, a wizard or a dialog, the final commit is the one solid button (UI-1e, #429); a destructive final commit is solid red (PG-1, #430), and the first press that only asks is a red outline. Everything else is an outline. The container counts its solid buttons when it renders and refuses a second: it throws in development and in every test, and only logs in a production build.

**Left for the SE Team**
- A handful of things are still written by hand, each listed with its reason: three sourcing matrices, the order drawer's total row, the guide's markdown table, the shell's own buttons, the channel demo.
- The third-party datasheet grid (bulk stock entry, the award what-if) draws its own inputs, which the form guard does not reach. The move to AG Grid (SE-1) replaces that grid; the new grid will have to be themed from the same tokens (this draft's inference, not a pull request's statement).
- The solid-button count only runs on a state somebody opens.
- All of the above are backlog rows 123–130.

D2 §11 is the engineer's page for all of this.

---

## The planning grid and the dashboard (PG-1 to PG-3, #430–#432)

**Unlearn:** the grid as several rows per material under three notices and a folded panel; the publication panel above the grid; a push that was refused because no reason had been asked for.

**Built**
- **It opens on "Shortages this month"**, with the views as a row of chips and one summary strip above the grid. The sandbox and sample statements moved into "About this data".
- **A material is one row** — its shortfall per period. Pressing its label opens it to the measures chosen in a measures menu.
- **Twelve months fit without sideways scroll**; sixteen weeks fit at 1366×768 by taking steps (tighter figures, then giving up the totals pane). A figure is never clipped; where nothing fits, the grid scrolls.
- **The forecast publication and the planned changes open in drawers.** The reason for a push is asked once, before the push, in the drawer's footer.
- **In a narrow column a state is never colour alone**: a committed, pasted, dismissed or typed figure carries a small mark.
- **A window resize keeps the planner's place.**
- **Dashboard:** the Procurement row of the action queue counts; what is not built is one line at the foot of the page. Purchase orders and ship notices are now dated relative to the declared present, like the sourcing events.

**Left for the SE Team**
- All of this is on the current grid engine. The move to AG Grid (SE-1) and the Excel-grade features (SE-14) are unchanged as work, and must carry what these batches built.
- Small items the batches named: the grid is pushed down when "About this data" is open; a long packaging label is cut on the weekly view at 1366×768; the marks were not checked on a high-density display. These and the rest are backlog rows 131–139.
- One question for the operator: one of the three grounds of the ruling that `PK-ALCP-2450` is not `PK-ALCP-2441` no longer holds on the dates a reader sees; is the ruling still sound on the other two? (PR #432; backlog row 137.)

---

## The Flow Builder (FB-1 to FB-4, #433, #435, #438)

**Unlearn — this is the largest reversal in the set.** v2 said: D1, SE-16, *"Not built (no authoring surface, no draft object, no generator)"*; D3, *"No Flow Builder (SE-16); flows are code"*; D6, the flow-override engine *"specified as Design 6 (Flow Builder: promotion as reviewed code, no runtime override)"*. On 12 October 2026 the operator reversed that. `docs/designs/DESIGN_6_FLOW_BUILDER.md` is the older design and still says "no runtime override". The design that was built is `docs/designs/DESIGN_6_v2.md` (committed with v3). D1 §4, row SE-16, says what remains for the SE Team.

**What it is**
- **A change to a process is a document, called a version.** It lists additions to one process that already runs: steps in front of acts the process already has. It cannot add a state, re-route or remove an act, move a lane or drop a check. So an active version can add a refusal and can never remove one. That sentence is tested against the real catalogue.
- **Nothing is registered.** The catalogue of processes is still exactly what the code declares. The dispatcher has one new optional dependency, the overlay, which it asks: what does the version in force add in front of this act?

**Built**
- **FB-1 (#433).** Versions, kept in the browser across reloads. The rules a change must obey, as one library (sixteen rules listed on the page). A **Changes** view on the Process Flows page, beside the **Catalogue**.
- **FB-2 (#435).** A composer: pick an act, put a step in front of it, say which lane completes it and what the lane is told, in English and Indonesian. Three kinds of step: approval, confirmation, data capture. The rules answer as the author writes.
- **FB-3 + FB-4 (#438, one pull request).**
  - Propose a draft with a reason. Review it in a drawer. Approve, return or reject. **The approver may not be the proposer.** A Super Admin passes that check only with a recorded reason; an Admin does not.
  - **Activate** is a separate act from approval. From then, an act with an added step in front of it is refused (`STEP_PENDING`) until the step's lane completes the step. The step is completed or declined on the document's own panel and recorded on a ledger. The step line is on seven buyer pages (requisitions, purchase orders, goods receipts, invoices, sourcing events, material requests, supplier applications) and on no supplier page.
  - **Roll back:** retire returns the process to the shipped default at once; restore brings an earlier version back and checks it against the rules again.
  - Every event now says which version of the process the act was taken under (`flowVersion`).
- **Who may:** Compliance holds the three rights (draft, decide, activate); Admin and Super Admin hold them too. A sample person may approve, activate and restore on a demo or preview deployment and not on production.

**Left for the SE Team** (SE-16, and backlog rows 140–159)
- **FB-5:** forks, checks and scans, with rules R09–R11 and the field catalogue. A version that holds one is refused when it is proposed, so it can never be approved and then ignored.
- **FB-6 remainder:** export and import of a version; a side-by-side of two versions.
- **FB-7:** supplier-side steps; an "open steps" queue.
- The "Versions" guide tab, and drawing the active version on the live diagram.
- Smaller gaps in the composer: a data-capture field of type "one of a list" has no editor for its options, and a draft's title cannot be edited (rows 153, 154).
- **Durable storage.** Versions live in one browser's storage; step records live in memory and are lost on reload (SE-4).
- **Real sign-in** (SE-3); camera scanning; notifying a lane that a step waits (SE-7).
- **Any change that alters the shape of a machine** — a new state, a re-routed or removed act, a different lane or required field on an existing act, a new document type — is not possible at runtime. It stays generated, reviewed code, as the older Design 6 §7 describes.
- **SE-11 (per-document versions):** the cheap half is built — every event is stamped. A multi-version registry is not needed while a version cannot change a state.

Start with `docs/guides/flowVersion.en.md` and `docs/guides/processStep.en.md`; they describe the built Flow Builder for an operator. The design, the build plan and the decisions put to the operator are `docs/designs/DESIGN_6_v2.md`, `docs/designs/FB_BUILD_PLAN.md` and `docs/designs/FB_OPEN_DECISIONS.md` (committed with v3).

---

## Master data (MD-1, MD-2, MD-2b, MD-4 + MD-5; #434, #436, #437, #439)

**Unlearn:** v2 D1, SE-21, *"Requirements and open decisions only. Today's material catalog is the RFQ wizard's picker over a frozen material master"*; v2 D3 and D4, a second resolver for generated sample materials (`planning/publishedMaterial.ts`); every lookup reading a frozen fixture. And from this set's own first draft, written one pull request earlier: *"no change request exists at this pin"*, and the placeholder line it carried for MD-4 and MD-5.

**Built**
- **MD-1 (#434). SAP is the system of record for master data, and the portal holds a replica it never writes.** Materials, suppliers and eleven reference tables. Every record carries a stamp — where it came from, when it was read, which run delivered it — and every screen that shows a record shows the stamp. One page, `/buyer/master-data`. One contract, C13. One writer, the sync applier. Every record today is stamped SAMPLE.
- **MD-2 (#436). One truth.** Material lookups and form pickers (incoterms, payment terms, cost centres, receiving locations) read the replica. Brands are a reference table, seeded from the ruled list of fourteen brands in `src/data/paragonBrands.ts` (one file since FB-1, #433; before it the contract form and the inventory page each held five names). A gate names every file that still reads a fixture directly.
- **MD-2b (#437). One resolver.** The planning fixture's generated sample materials and suppliers are replica records. The second resolver is deleted. `MT` and `BOX` are units.
- **MD-4 + MD-5 (#439, one pull request, combined by ruling). A change to master data is a request.** The portal proposes and never writes a record.
  - **The request:** propose → review → agree → send to SAP → SAP's answer, with return, reject and withdraw. Nine acts, eight states. Three kinds: a new material, a change to a material, a change to a supplier. A new material carries every field and no key: SAP gives the key.
  - **Who:** procurement and planning propose; planning reviews materials and compliance reviews suppliers; procurement sends and records SAP's answer.
  - **Four eyes:** the proposer cannot decide their own request. A Super Admin can, with a stated reason that is recorded on the event and shown on the Super Admin activity view. An Admin cannot. Every act names a person.
  - **SAP wins:** a request whose field a sync run has changed cannot be agreed or sent; it is withdrawn and proposed again.
  - **Agreed is not the same as existing.** The hand-off is a package: the request number, the kind, the proposed fields, the reason, who proposed and who agreed, and what the request was written against. No act writes a master record. SAP is not connected, so "Send to SAP" produces the package and stops.
  - **On a demo or preview deployment only:** a person may record a sample answer, which delivers its record through the sync applier as a run of its own, marked sample; and may run one prepared sample sync that changes a description, adds an incoterm, blocks a supplier and refuses one record by name. Both are refused on production.
  - **Screens:** Change requests and Sync log views on Master data; "Propose a change" on a record; "Ask for a new material" in the header. `/buyer/master-data/requests` is the same page on its requests view, owned by the Material requests module.
  - A guide in English and Indonesian (`docs/guides/masterDataRequest.en.md`), C13 §8, refusal copy in both languages.

**Left for the SE Team** (SE-6, SE-4, SE-21; backlog rows 160–171, 173 and 174–184)
- The feed from S/4HANA: initial load, change events, a periodic full reconciliation; SAP's own keys for the reference tables.
- **The call to SAP MDG at hand-off, and the feed that fires the two answer acts** under the automation grant, with the request number as the idempotency key (SE-6). In the fixture a person records a marked sample answer; on production nothing can be recorded and a request waits in "Sent to SAP".
- A durable store and sync log; durable requests (they are in memory for the session); server-side search and paging.
- By ruling or by cut, not built (PR #439's list): MD-3 (supplier × material: info records, source lists) and MD-6 (the supplier-proposed catalogue); the earlier material-request lane is not folded into the request flow; an approved supplier application does not raise a request; a blocked or deletion-flagged record does not yet refuse new documents; supplier create and extend requests; and, from MD-2, the readers of the supplier fixture, the category mapping, the supplier record split and documents storing keys instead of texts.
- Not in C13: purchasing info records and source lists, indirect materials and services, a supplier's own read of its materials.
- One thing this draft read in the tree that no pull request states: the request's own acts have no production bar for a sample person. The plan had one (backlog row 181; D6 §2).
- Every requirement in `SE21_PRODUCT_CATALOG.md` still stands; its §6 maps the batches onto them. The design, the build plan (MD-1 to MD-6) and the open decisions are `docs/designs/MASTER_DATA_DESIGN.md`, `docs/designs/MD_BUILD_PLAN.md` and `docs/designs/MD_OPEN_DECISIONS.md` (committed with v3).

The plan (`MD_BUILD_PLAN.md`) had six batches. Built: MD-1, MD-2 (with MD-2b), and MD-4 and MD-5 together. Not built and on the SE list: MD-3 and MD-6. Where MD-4 and MD-5 were built differently from the plan is listed in D8 §11 (row 11.18).

---

## The documents themselves

- Every file of the handover set is re-issued as a v3 draft against the new commit. The package list is still **twenty-three** SE work packages; D1 §4 marks what moved in or out of each.
- Two new files: `SE_BACKLOG_v3.md` (the v2 backlog carried forward; rows 119 to 193 are new: 119 to 173 from PRs #420–#438, 174 to 184 from PR #439, 185 to 193 from the v3 census) and this note.
- D2 has three new sections: the process-change overlay (§2.7), the master-data replica and the change request (§2.8) and the shared UI components (§11). D6 has a new §3b for the rulings of 9 to 12 October. D5 has a new §K. D8 has a new §11.
- A new contract, C13, is indexed in D7; PR #439 added its §8 (change requests).
- The six design documents and the five review documents that v2 carried are **unchanged** (`git diff handover-v2 aac5f858 -- docs/designs docs/reviews` is empty). Design 6 now needs reading with care: its central decision is reversed. Six files are added under `docs/designs/` and committed with v3: `DESIGN_6_v2.md`, `FB_BUILD_PLAN.md`, `FB_OPEN_DECISIONS.md`, `MASTER_DATA_DESIGN.md`, `MD_BUILD_PLAN.md`, `MD_OPEN_DECISIONS.md`.
- D7 §6 is the **v3 state-machine census**, run by Seat 3 at this pin (`CENSUS_v3.md`). v2's census is kept there as one line. Its findings: two dead-end states on `invoiceMatch`; `flowVersion` declares no ending its `Active` and `Retired` states can reach; `advanceShipNotice` declares no ending; 25 states whose only way out is outside the portal or is SE work; two decision verbs with no policy hook (`t_incomingshipment_cancel`, `t_intake_restore`); and fifteen decision verbs that name who decided without checking the decider is not the raiser, which is a decision for Paragon (D6 §2), not a defect.

## Three things to know before trusting this set

1. **Nothing was run for this set, with one exception.** No build, no test suite, no browser. Figures come from C1's header, the pin test, `scripts/floor.json` and the files named. The exception is the census: Seat 3 ran two read-only scripts at the pin and deleted them. The gate record this set read is the check on PR #438, for the tree it was first pinned to; PR #439's check list was not read, and its description reports three clean full suite runs.
2. **Rows carried from v2 were not re-checked.** The backlog's "open at pin" marks, the defect register's line numbers and D8's dispositions are v2's, except where a row says it was read at this pin.
3. **The set was re-pinned once.** It was written and fact-checked at `3021f3d6…` (PR #438) and then brought to `aac5f858…` (PR #439). MD-4 and MD-5, which the first draft carried as a placeholder line, are folded in from PR #439, C13 §8, C1 and the tree; no placeholder remains. The re-pin re-read every figure and the master-data text; it did not re-read rows that PR #439 did not touch. MD-3 (supplier × material) and MD-6 (the supplier-proposed catalogue) are not pending batches: they are SE work (backlog rows 169, 170).
