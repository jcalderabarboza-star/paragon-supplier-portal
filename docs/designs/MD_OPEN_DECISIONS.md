# Master Data module — decisions for the operator

**Seat 3, consultant, Ops Project #11 · 2026-10-12.** Pin: `main` @ `0531e094d401b8c51e320fd3151da6b72963ba47`. Each decision has a recommendation. Section numbers refer to `MASTER_DATA_DESIGN.md`. Decisions marked *SAP owner* or *procurement* need that party as well as the operator.

## Needed before MD-1 (they shape the replica)

| # | Decision | Recommendation |
|---|---|---|
| **1** | **Which objects the replica holds in the first build.** | **Materials, suppliers, purchasing info records, source lists, and the reference tables the tree uses today**: unit, material type, material group, incoterm, payment term, currency, country, plant, storage location, cost centre. Purchasing organisation, purchasing group and company code are declared with sample rows only where a supplier extension needs them. Tax codes wait for the invoice lane (SE-12). §2. |
| **10** | **Freshness: how old may a record be, and does a stale record stop work?** | **Materials and suppliers 24 hours; info records and source lists 24 hours; reference tables 7 days. A stale record warns and does not refuse.** Staleness is a fact about the feed; stopping purchasing because a nightly job failed is the wrong cost. An unknown material still refuses, as today. The figures are placeholders until the feed's real cadence is known (decision 15). §3.1, §3.3. |
| **13** | **Where it lives, and which module.** | **`/buyer/master-data` in the Platform group. Reading belongs to the platform and cannot be switched off; change requests ride module `MAT`, widened from "material requests" to "master-data requests".** A new module for the read would let somebody switch off what every other module depends on. §4, §7. |
| **16** | **The planning fixture's 1,158 sample materials and 28 sample suppliers.** Stay outside the master with their own resolver, or become replica records. | **Become replica records stamped SAMPLE; retire the second resolver.** One question should have one answer, and SE-21 already says a real catalogue must not need a second resolver. The stamp is what keeps a sample row from reading as real. §6.1. |

## Needed before MD-2 (one truth)

| # | Decision | Recommendation |
|---|---|---|
| **6** | **The category axis.** Four vocabularies stand on it today (supplier category, RFQ category, compliance category, material group). | **Material group is the one classification, because it is SAP's. Each other vocabulary becomes a declared mapping from material group, visible as a reference table.** MD-2 builds the mapping; retiring the three unions is later work, because each is read by logic. *Procurement* confirms the mapping. §6.2. |
| **18** | **Copies stored on documents** (supplier name, material description, unit). | **A document the portal originates stores the key and resolves the text at read. A document SAP issued keeps the text SAP issued, and where it differs from the master the page marks it.** At the pin one order line and one inventory row already differ from the master. §6.3. |

## Needed before MD-3 (supplier × material)

| # | Decision | Recommendation |
|---|---|---|
| **3** | **Preferred-supplier list and SAP's source list.** Both say "this supplier may be bought from for this material". Which governs? | **Keep both, owned as they are: the preferred list is Paragon's governance decision in the portal; the source list is SAP's record, replicated read-only. Show them side by side and flag the pairs where they disagree. No check is added.** If the operator later wants a listing to create a source-list row, that is a `sourceList.propose` request raised on grant, not a direct write. §2, §4. |
| **4** | **Halal and BPOM applicability.** A portal annotation, or a classification in SAP's material master. | **A portal annotation, written by Compliance on its existing ledger, shown on the material record under its own stamp.** It was built as a ruling with a reason and a named person, which SAP's classification would not carry. Pushing the result to SAP later is possible and is not designed here. *SAP owner* may hold a view. §2. |

## Needed before MD-4 (change requests)

| # | Decision | Recommendation |
|---|---|---|
| **5** | **The material-request lane.** Fold it into the one request flow, or keep it beside it. | **Fold it in** (SE-21 C5, R5: one path). Its four states map onto the new flow one to one; its page becomes the Change requests view filtered to materials. Keeping both would leave two ways to ask for a material and one of them a dead end. §5.1. |
| **7** | **Who reviews each kind** (SE-21 C3). | **Materials: planning. Suppliers: compliance. Info records and source lists: procurement.** These are the lanes that decide the two existing lanes today. Four eyes separates persons, so a procurement proposal reviewed by procurement is still two people. A material that needs a halal or BPOM ruling gets it from Compliance on the ruling ledger, not as a second approval. §5.2. |
| **8** | **Who hands an approved request to SAP.** | **Procurement, as a separate act by a named person; no second approval.** Approving says the request is right; handing off says it goes now. Two acts allow approval to wait for a batch day. §5.2. |
| **14** | **Sample persons.** May a sample person propose and approve? | **Yes on demo and preview deployments, marked `(SAMPLE)`; refused on production.** The rule module switching follows, and the one recommended for the Flow Builder. Without it the module cannot be shown before sign-in exists. §5.2. |
| **17** | **Supplier applications.** Does an approved application raise a request to create the supplier in SAP? | **Yes: one `supplier.create` request per approved application, raised automatically, waiting for hand-off.** The application stays the qualification decision; the request is what carries it to SAP. The flow's own ruling (the vendor record is SAP's act) is kept: the portal still creates no supplier. §5.1. |
| **21** | **How far the Super Admin exemption reaches.** | **The approver-is-not-proposer check only, with the one-line reason, recorded and shown on the activity view.** Not validation, not a base that SAP changed, not tenancy. §5.2. |

## Needed before MD-5 (hand-off)

| # | Decision | Recommendation |
|---|---|---|
| **9** | **SAP's answer in the fixture.** Requests stop at "Sent to SAP", or a marked sample answer can complete them. | **A marked sample answer on demo and preview deployments only, refused on production; the record it delivers is stamped SAMPLE with a sample key.** Without it an approved request never lands and the module repeats the dead end it is meant to end. The risk is that a sample record is read as SAP's; the stamp on every record and the deployment bar are the controls. If the operator prefers no simulated SAP at all, MD-5 ships the package and the sync demonstration only. §5.3. |
| **11** | **Blocked suppliers and materials flagged for deletion.** | **They stay in the replica, marked. New documents that name them are refused by name; documents already open continue to their end.** Refusing open documents would strand goods in transit. §3.3. |
| **15** | **The SAP side** (SE-21 C9). Which MDG change-request types, which interfaces carry the records and the answers, the cadence of the feed, who owns a request in SAP and how fast it is answered. | **To be answered by the *SAP owner* before SE-6 starts; nothing in the fixture depends on it.** Recommended shape: change events for materials and suppliers, a nightly full reconciliation, the portal's request number as SAP's external reference. The SAP table and service names in design §2 are the usual ones and are unconfirmed. |

## Needed before MD-6 (supplier-proposed catalogue)

| # | Decision | Recommendation |
|---|---|---|
| **2** | **Indirect materials and services** (SE-21 C1, C2). In scope, and does SAP hold them as materials? | **In scope as a class on the material record (direct, indirect, service). In the fixture, a small SAMPLE set. Whether SAP gives each a material number or buys them by material group and text is the *SAP owner's* answer; the design carries both, because an item may be code-less with a declared reason.** Planning and the preferred list keep accepting direct materials only until each is ruled. §2. |
| **19** | **What a supplier's catalogue item is, and what it must carry** (SE-21 C4, C8). | **An info-record proposal for supplier × material: the supplier's item code, unit, minimum quantity and lead time required; price and currency optional; a specification sheet by name.** Price and lead time live on the pair, which is where SAP keeps them. Certificates stay in the document lane. *Procurement* confirms the required fields. §5.4. |
| **20** | **What a supplier sees** (SE-21 C7). | **Its own record, its own proposals with state and rejection reason, and its approved items; it may propose again after a rejection. Never another supplier's items, prices or proposals.** The preferred list and the document lane already work this way. §5.4. |

## Can wait

| # | Decision | Recommendation |
|---|---|---|
| **12** | **Supplier bank details.** | **Not held in the replica and not shown.** No page needs them today (an invoice carries one account string). If the payment lane later needs them, decide with security first (D9): masked display, never editable in the portal. §2. |
| **22** | **Who may read the page.** All buyer seats, or narrower for prices on info records. | **All buyer seats in the first build**, as contracts and quotations are readable today. Narrowing by role is a ruling for when sign-in exists; gating a page by role is the exception in the portal today. §4. |
| **23** | **Material identity: substance or specification** (C9 D-1, SE-21 C6). | **Unchanged and still procurement's.** The replica keys on SAP's material number, which is the specification; the substance axis stays additive. Nothing in this design forecloses either answer. |

## Three things to know that are not decisions

- **Two existing rulings are kept, not reversed.** Both proposal lanes say creating the record is SAP's act and the portal must not invent master data. This design keeps that: the portal hands off and waits; the only portal-side record that appears without SAP is the marked sample answer of decision 9.
- **The handover set describes the old state.** SE-21 is "requirements only", SE-6 says master data is "read, never written", D4 lists the fixtures as stand-ins. They are corrected in MD-6, or earlier if the operator wants the set right from the first merge.
- **`BRAND_OPTIONS`** (five brand names in the contracts page) is a hard-wired list with no SAP counterpart in this design. It is left where it is and named here so it is not mistaken for covered.
