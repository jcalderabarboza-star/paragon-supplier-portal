# Flow Builder — build plan

**Seat 3, consultant, Ops Project #11 · 2026-10-12 · for the building seat. Read with `DESIGN_6_v2.md` (section numbers below refer to it).**
**Pinned tree:** `main` @ `0af62ddd9ca85c59a822896770d8cead736bfaff`. Floor at the pin: 8,961 tests in 494 files, 7 gate tests.

Seven batches. FB-1 to FB-6 deliver the operator's four requirements; FB-7 is optional and waits on a ruling. Each batch is one pull request, merged with `--merge`.

## Order, and why

| # | Batch | Requirement | Depends on | Size |
|---|---|---|---|---|
| FB-1 | Versions exist, and the rules a change must obey can be read | 2, 4 | — | 1 |
| FB-2 | Compose a change | 1, 2 | FB-1 | 1.5 |
| FB-3 | Propose, review, approve | 3, 4 | FB-2 | 1.5 |
| FB-4 | Activate: the process obeys the change | 1, 3 | FB-3 | 2 |
| FB-5 | Forks, checks and scans | 2 | FB-4 | 1.5 |
| FB-6 | Rollback, history, export | 4 | FB-4 | 1 |
| FB-7 | *Optional:* supplier-side steps and a queue of open steps | — | FB-5, a ruling | 1 |

Two constraints are consequences, not preferences. The validation library (FB-1) comes before the composer (FB-2), because a composer with no validator is a form that produces invalid changes. Approval (FB-3) comes before activation (FB-4), because an activation with no approval in front of it is an override with no gate.

**Nothing a change does reaches a running process before FB-4.** FB-1 to FB-3 can be merged and shown with no risk to any existing page.

## In every batch

- English and Indonesian from the first commit, in the `flowBuilder` fragment.
- Only the shared components; no new exemption in the UI gate.
- The floor is raised when `npm run gates` asks. No test is written to clear a floor.
- Every new guard is probed both ways, and a population it derives is not derived through the code it guards.
- Browser walk in the visible browser, before and after, in both languages, with the console read for the one-solid-button count. Confirm `Date` is native before the first reading.
- The sample deployment rule: every walk below is on a preview build, where a sample person may act.

---

## FB-1 · Versions exist, and the rules a change must obey can be read

**Scope**
- `src/services/flowBuilder/flowVersion.ts` — the content and record types (§3.5), the label rule (§6.1).
- `validateVersion.ts` — the pure library, rules R01 to R08 and R12 to R19 (R09 to R11 arrive with their elements in FB-5), and the applier `applyVersion(flow, content)` that the "never removes a refusal" test runs (§4.1).
- `flowVersionStore.ts` — persisted under one key, on the custom-roles pattern: absent, corrupt and unparseable are told apart from empty; every row is validated again on read; ids, labels and stamps are minted by the store.
- The `flowVersion` flow with **create** and **save** only, its command target, the `flow:draft` permission in the Compliance bundle, the guide pair for the new flow, and the contract figures the new flow moves (C1).
- Process Flows: the **Catalogue | Changes** views; the version in force on each flow card and in the flow header; the Changes list (empty state and rows); a "Rules a change must obey" reference in the Changes view, rendered from the library's own rule table.

**Acceptance tests** (by title)
- `a known-good version passes every rule` — first in the file.
- one test per rule, each asserting the rule code and the element id by name.
- `R04 refuses a step in front of t_quotation_award and accepts one in front of t_pr_approve`.
- `an applied version never removes a refusal — every act keeps its from, to, lane, fields and shipped checks in order`, over the real catalogue; and its probe: `an applier that drops a shipped check is caught, by act`.
- `absent, corrupt and unparseable are distinguished from empty`; `a stored row that fails today's rules is reported on read, not absorbed`; `id, label and stamps are store-minted — a payload value is ignored`.
- `no flow-builder module calls the registry's register door`, with its control: the same scan finds the call in `flows/index.ts`.
- `create refuses a seat that names nobody` and admits a named one.
- `an unknown view or version id falls back to the catalogue and renders no blank body`.

**The operator sees**
- *Before:* Process Flows is one page of flows and diagrams. Nothing says which version of a process is running.
- *After:* each flow reads "Shipped · version 2 — in force". A **Changes** view exists, empty, with **New change** and the list of rules a change must obey, in both languages. A seat that is not Compliance, Admin or Super Admin sees who holds the right instead of the button.

---

## FB-2 · Compose a change

**Scope**
- The composer in `Dialog fill` (§8): pick a process, select an act on the diagram, add in front of it an **approval**, a **confirmation** or a **data capture** step; lane, order, label and instruction in both languages, capture fields, the two separation options.
- Findings live as the author works; warnings acknowledged in place; **Save draft**.
- The diagram draws a draft's elements on the edges they gate, inside the composer only.
- The act picker offers only acts R04 accepts, and says why the others are not offered.
- "Start a draft from this version".

**Acceptance tests**
- `the act picker offers exactly the person-fired, surfaced acts of the process` — derived from the registry in the test, with a named member present and a cascade-fired one absent.
- `a step with a label in one language cannot be saved as valid — R07 names the step`.
- `a personal name in an instruction is refused` (the roster's labels are the denylist).
- `the saved draft survives a reload and reads back equal`.
- `the composer's only write is the version store` — a scan of its imports, with a control.
- `the dialog holds one solid button in every state it can show`.
- `the live process page never draws a draft's elements`.

**The operator sees**
- *Before:* **New change** opens nothing useful.
- *After:* choose *Purchase requisition*, click *Approve requisition* on the diagram, add "Finance approval" in front of it, write the instruction in both languages, watch a missing Indonesian label appear as an error and clear, save, reload, and find the draft in the Changes list. The requisitions page itself is unchanged.

---

## FB-3 · Propose, review, approve

**Scope**
- The rest of the `flowVersion` machine except activation: propose, withdraw, return for changes, approve, reject (§5.1); the `flow:decide` permission; the checks with their refusal heads; the refusal sentences in both languages, keyed on the head, with any person filled in through the label resolver.
- The review drawer (§5.3): the change in sentences, the element table, the validation report run at that moment, the count of documents it will meet, the history.
- Four eyes, the Super Admin exemption through the existing reason dialog, the production bar for sample persons.

**Acceptance tests**
- `propose refuses an error finding, an unacknowledged warning and a moved base — each by head`.
- `approve refuses the proposer, by name through the label resolver`.
- `approve admits a different named person`.
- `a Super Admin who proposed may approve only with a reason; the event carries the rule and the reason` — and `an Admin who proposed is refused`.
- `approve refuses a sample person on production and admits one on preview` (the deployment probe, both ways).
- `reject and return admit any one named holder — the safe direction stays reachable`.
- `content cannot be saved once the version has left Draft`.
- `every refusal head that names a person is owned by a key map` (the existing derived guard must stay green with the new heads).
- Page test: the drawer's footer has one solid button in each state, and the reject confirm is the solid critical one.

**The operator sees**
- *Before:* a draft can only be saved.
- *After:* as Compliance, propose the draft with a reason; it reads *In Review*. Still as Compliance, **Approve** is refused: "the person who proposed a change may not approve it". Switch to Admin: approve with a reason; it reads *Approved*, and the history shows who proposed, who approved, when and why. As Super Admin on a change they proposed, the reason dialog appears, and the act shows on the Super Admin activity view. The requisitions page is still unchanged.

---

## FB-4 · Activate: the process obeys the change

**Scope**
- Activate and supersede, with the cascade that retires the previous active version; the `flow:activate` permission; the supersede permission on the automation grant.
- The dispatcher's `flowOverlay` dependency, `STEP_PENDING` in the closed refusal list at its stated position with its glossary sentence, and `flowVersion` on every event; the C3 contract document and its pin moved in the same commit (§7.1, §6.3).
- The `processStep` ledger flow, its target, `step:complete` in every buyer-side lane, complete and decline, `stepOpenFor` as the one lane rule (§7.2).
- `NextActLine` announces a due step and opens the step dialog; the Versions guide tab; the active version drawn on the live diagram (§7.3).
- Decision 1 (documents in flight) is built as ruled.

**Acceptance tests**
- `with no overlay injected the dispatcher behaves exactly as before` — the existing dispatcher suites, unchanged and green.
- `an act with a due step is refused STEP_PENDING naming the step, and the document does not move`.
- `the refusal order holds: a seat without the lane is refused on the lane, an illegal act on legality, and only then on the step` (the order pin in `refusals.test.ts` extended).
- `completing the step lets the act through, and the completion is used up — the next time round the step is due again`.
- `a seat outside the step's lane cannot complete it; the surface and the hook give the same answer` (both call `stepOpenFor`).
- `a declined approval keeps the act refused and names the reason`.
- `the completer-may-not-act rule refuses the same person at the act, and a Super Admin passes it with a recorded reason`.
- `a cascade-fired act is never gated` — fired at `t_rfq_award`'s fan-out with a version active on quotation: the fan-out completes.
- `every event carries the version in force` — `…@2` before activation, `…@2.1` after, and the C3 pin lists the field.
- `activating a second version retires the first by cascade; at most one is active per process`.
- `a preview of a gated act reports the pending step and consumes nothing`.
- Page tests on two surfaces that mount `NextActLine`: the line announces the step; the page's own button is refused with the step's sentence in the reader's language.

**The operator sees**
- *Before:* on Requisitions, a requisition in *Pending Approval* is approved by Procurement in one act.
- *After:* as Admin, **Activate** version 2.1 with a reason. The flow reads "Version 2.1 — in force since …". Open the same requisition as Procurement: the line reads "Added step — Finance approval. Waiting for Finance", and **Approve** answers with that sentence. Switch to Finance: **Open step**, read the instruction, **Complete**. Back as Procurement: **Approve** now succeeds. The status history shows the step, who completed it, and "version 2.1" on each row.

---

## FB-5 · Forks, checks and scans

**Scope**
- The field catalogue for the processes that will use it first (requisition, invoice, goods receipt, order), with its both-ways test (§3.4).
- Fork, scan and check in the composer palette and in the overlay; rules R09 to R11; the three generic rules (§3.2, §3.3); the `added_check` refusal and its sentences.
- The review's "change in sentences" extended to forks and checks.

**Acceptance tests**
- `every catalogued field exists on every seeded document of its process with the stated type`, and `a catalogue row for an unknown process or field is refused`.
- `a fork sends a document over the threshold to the step and one under it past the step` — two named seeded requisitions, chosen by value in the test.
- `a condition on a date field is refused — R10`.
- `a scan step refuses a value that does not equal the document's field and accepts the one that does`.
- `an added value check refuses after the shipped checks, never before` — a document that fails a shipped check is told the shipped reason.
- `an added check is refused under added_check, and its sentence renders in both languages`.
- `the applied version still never removes a refusal` — FB-1's test, now with forks and checks in the version.

**The operator sees**
- *Before:* a step applies to every document, or to none.
- *After:* change the Finance approval to apply only "when the estimated value is at least Rp 500,000,000". After approval and activation, a small requisition is approved in one act and a large one waits for Finance. On goods receipt, add a scan step in front of *Accept*: Receiving types the order number; a wrong number is refused with the reason, the right one completes the step.

---

## FB-6 · Rollback, history, export

**Scope**
- Retire and restore (§6.2); the set-aside behaviour when the shipped base moves (§6.5); the version history on `Timeline`; a side-by-side of two versions' element tables.
- Export of a version as one deterministic JSON document (content, record, validation report, the pinned commit and catalogue counts), and import that re-mints the id and stamps and validates again (Design 6 §5.4, smaller).
- The handover documents that say "no runtime override" corrected in the same pull request (D1's SE-16 row, the decision register's flow-override row, D3's "flows are code" line).

**Acceptance tests**
- `retiring the active version returns the process to the shipped default at once — the gated act succeeds with no step`.
- `restore validates again and retires the current version by cascade`.
- `restore refuses a version whose base has moved`, and `an active version whose base moved is set aside on read, by name, and the process runs on the default`.
- `the same version exports byte-identically twice`; `an import never keeps the file's id or stamps`; `an export from a different catalogue is reported as such`.
- `a version is never deleted and never edited after Draft` — the store exposes no such door (a scan, with a control).

**The operator sees**
- *Before:* an active change can only be replaced by another.
- *After:* **Retire** version 2.1 with a reason: the requisition that was waiting for Finance can be approved again in one act, and the flow reads "Shipped · version 2 — in force". **Restore** 2.1: the step is back. The history lists every act on the change, with person, time and reason. **Export** downloads the file the SE Team will receive.

---

## FB-7 · Optional — supplier-side steps and a queue of open steps

Built only if ruled (decision 9).

**Scope**
- A second pair of step acts for the supplier side, scoped to the supplier that owns the document; supplier lanes in the lane picker; R06 widened.
- An **Open steps** view listing the steps due for the seat's lanes across processes, so a lane does not have to find the document first.

**Acceptance tests**
- `a supplier completes a step only on its own document; another supplier is denied at scope, identically for a document that exists and one that does not`.
- `the open-steps view lists exactly the steps stepOpenFor admits for the seat`.

**The operator sees**
- *Before:* only buyer lanes can be given a step, and a step is found by opening its document.
- *After:* a step in front of *Submit ship notice* is completed by the supplier's fulfilment lane; Finance opens one list and sees every step waiting for Finance.

---

## Also available, not on the path

The lane column and the "who acts next" matrix on the Process Flows page (Design 6 §3.2, §3.3). They serve reading, not the four requirements, and can be taken in any quiet batch.

## What this plan does not include

Durable storage, real sign-in, camera scanning, notifications, and any change to the shape of a machine. These are listed with their owners in `DESIGN_6_v2.md` §9.
