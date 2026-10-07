# C1 — Method Surface

Three distinct axes. **71** (service surface) · **138** (transition catalog) · **23** (wired
targets). They measure different things; this file keeps them separate.

> ⚠️ **THIS DOCUMENT IS PINNED TO THE TREE, AND THE PIN IS WHY THE NUMBERS ABOVE ARE ALLOWED TO
> BE NUMBERS.** `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` derives every
> figure and every name below from the AST and the flow registry, and fails when the tree drifts
> **or when this document goes stale**. A count written in prose is normally forbidden here
> (`FLOOR-IN-PROSE-01`); a contract sent to a counterparty must nevertheless carry concrete
> figures, and a re-derivation on every run is what makes that safe. **Do not hand-edit a number
> below — change the tree, or correct the document and let the pin agree.**
>
> ⚠️ **AND BEING PINNED IS NOT BEING RIGHT.** The pin compares NAMES, COUNTS and MEMBERSHIP. It
> cannot see a method whose SIGNATURE changed shape, one that is present in both places and wrong
> in BEHAVIOUR, or any prose claim on this page. Those are stated in full under
> [What the pin cannot see](#what-the-pin-cannot-see) rather than left for a reader to assume.

> **RE-HARVEST (2026-09-02).** This document had not been re-harvested since I3.1 and was stale by
> half its shape. Corrected, as SETS rather than as counts: the service surface gained
> `ICollaborationService`, `IDeliveryService`, `IChaseService` and `IEnforcementService` (four
> sub-services this page never named), `IProcurementService` gained `getIntakeLines` (spelled `getPrIntake` until A2) and
> `getSupplierApplications`, and `CommandInput` gained `expectedState` (1c) and `decision`. It
> **lost** `IEngagementService` — a seven-method sub-service this page described and the tree has
> never contained since — and `IDiscoveryService.getGlobalSuppliers`, which was removed
> deliberately (`types.ts` records the removal). The transition catalog went 72 → **97** across
> 14 → **20** flows, and the wired-target axis 6 → **14**. Every figure on this page is now
> re-derived on every test run, which is the point of the batch that corrected it.

> **RE-HARVEST (2026-09-21, R8).** The material-request lane landed: `IProcurementService`
> gained `getMaterialRequests`, the transition catalog went 98 → **102** across 20 → **21** flows,
> and the wired-target axis 14 → **15**. Every figure was moved BY THE PIN going red, not by
> anybody remembering to edit this page — which is what the paragraph above promises and this
> line is the evidence for.

> **RE-HARVEST (2026-09-23, PSL P4).** The supplier-facing half of the preferred-supplier lane
> landed. `IProcurementService` gained **one** method — `getMyPslListings` — and it is deliberately
> a SECOND method rather than a persona branch inside `getPslListings`: the two return DIFFERENT
> TYPES (`PslListing` vs `SupplierPslView`), because a supplier is shown a projected subset of a
> listing and never the record. A counterparty implementing this surface must implement both, and
> must not satisfy one with the other. No transition and no target moved — P4 adds no verb.

> **RE-HARVEST (2026-09-21, PSL P3).** The preferred-supplier lane landed, and it is the first
> batch to add TWO machines at once: `IProcurementService` gained `getPslListings`, the transition
> catalog went 102 → **111** across 21 → **23** flows, and the wired-target axis 15 → **17**.
> Re-harvested again at call-off step 1: the delivery lane's two machines took the catalog to
> **115** across **25** flows and the wired-target axis to **19**. Re-harvested again at **A2**:
> the `intakeLine` triage machine took the catalog to **118** across **26** flows and the
> wired-target axis to **20**, and `IProcurementService`'s `getPrIntake` became `getIntakeLines`
> — a rename with a return-type change, since the read now carries the machine's recorded triage
> beside the producer's row. `CommandTarget.create` also gained a fourth parameter (Axis 3).
> Every figure moved BY THE PIN going red — twelve assertions across three axes plus C5's borrowed
> figure — which is the fourth consecutive batch where this document was corrected by the gate
> rather than by anybody remembering it exists.

> **RE-HARVEST (2026-09-29, A3).** Supplier answers stay honest: `requirementResponse` gained
> `t_requirementresponse_revise` (the supplier's exit from `Disputed` / `Accepted`) and
> `t_requirementresponse_supersede` (its automation consequence), taking the catalog to **120**
> across the same **26** flows. No service method and no wired target moved — the verbs ride the
> target that already existed. Moved by the pin going red, again.

> **RE-HARVEST (2026-09-29, B1).** The planning read seam landed: `IDataService` gained a tenth
> read sub-service, `IPlanningService`, with ONE method — `getPlanningFacts(scope, { horizon,
> measures, materialCodes? })`, returning long-form `PlanningFact` rows plus an additive
> `horizonRefusal` when the horizon cannot be parsed (a mixed grain is refused by name, never
> answered empty). The service surface went 66 → **67**. No transition and no target moved — B1
> adds no verb. Moved by the pin going red.

> **RE-HARVEST (2026-09-29, B4a).** The forecast publication became a machine
> (`forecastPublication.flow.ts`, Design 2 §2.1): six transitions — `open` (creation),
> `allocate` and `approve_firm` (statePreserving on Draft), `publish`, `supersede` (the publish
> cascade) and `withdraw` — and a wired target. `ICollaborationService` gained ONE method,
> `getPublications(scope, { includeSimulatedSample? })`: buyer → every published publication;
> supplier → LIVE only, own lines only, and the SIMULATED sample only when asked for by name
> (`sample: true` on the page). Service surface 67 → **68**, catalog 120 → **126** across 26 →
> **27** flows, wired targets 20 → **21**. Moved by the pin going red.

> **RE-HARVEST (2026-09-30, B4b-1).** Publish from the grid (Design 2 §2.3). `ICollaborationService`
> gained ONE method, `getPublicationWorkspace(scope)`: BUYER-ONLY — every publication in every
> state, drafts and ledgers included, and the SOMO plan versions a draft may be opened from; a
> supplier scope reads an empty workspace. Service surface 68 → **69**. The catalog and the wired
> targets did not move: the flow gained hooks (`PUB_SUPPLIER_COLLABORATED`,
> `PUB_CLASS_PROJECTION_PRESENT`, `PUB_CARRY_FROM_CURRENT`), not transitions. Moved by the pin
> going red.

> **RE-HARVEST (2026-09-30, M1).** Module activation (Design 5 Part A). `IDataService` gained an
> eleventh read sub-service, `IModuleService`, with TWO methods: `getModuleActivation(scope)` — what
> is switched ON, derived from the ledger at read, readable by EVERY seat (a supplier's own pages go
> read-only when a module is off) and carrying no attribution — and `getModuleLedger(scope)` — the
> append-only acts with who and why, BUYER-ONLY (a supplier scope is `SCOPE_DENIED`, the
> enforcement ledger's rule). A new machine, `moduleActivation.flow.ts` (one state, one
> `statePreserving` verb `t_module_set`, `t_enforcement_set`'s shape), and its wired target. The
> dispatcher gained the `MODULE_INACTIVE` refusal (pipeline step 3 below). Service surface 69 →
> **71**, catalog 126 → **127** across 27 → **28** flows, wired targets 21 → **22**. Moved by the
> pin going red.

> **RE-HARVEST (2026-10-05, SDC-3).** The requirement-response machine gained TWO policy hooks and
> moved ONE cascade; no transition, no target and no service method moved.
> `rr_review_actor_attributed` (operator ruling) refuses `t_requirementresponse_accept` and
> `t_requirementresponse_dispute` from a seat carrying no person — `POLICY_REJECTED:rr_review_actor_attributed:
> RR_REVIEW_ACTOR_UNATTRIBUTED`, the `delivery_actor_attributed` shape; a sample person is admitted.
> `rr_revise_no_open_draft` refuses a second `t_requirementresponse_revise` of an answer a draft revision
> already answers — `POLICY_REJECTED:rr_revise_no_open_draft:RR_REVISION_ALREADY_DRAFTED`. The
> `t_requirementresponse_supersede` cascade is now fired by `t_requirementresponse_promote` of a revision
> (it was fired by `_revise`, so an unsent draft retired the answer it revised), and its from-states gain
> `UnderReview`. `rr_submit_no_open_sibling` no longer counts an acknowledgment as an open answer.

> **RE-HARVEST (2026-10-05, SDC-4).** No verb, hook, target or service method moved. One refusal is
> new, and it is a DRAFT refusal, before any dispatch: `normalizeInventoryDeclarationDraft` refuses a batch
> row that carries a quantity or an expiry but no batch number with `MISSING_BATCH_NUMBER` (the code the
> ingest adapter already used), where it used to drop the row. The channel-reply parser emits one row per
> body line of a multi-line reply; its single-line output is unchanged.

> **RE-HARVEST (2026-10-06, SDC-5).** The forecast publication gained ONE transition and ONE state:
> `t_publication_discard` (Draft → **Discarded**, terminal; atom `publication:draft`, no required field, no
> policy hook) — the draft's second way out, so `pub_one_open_draft` no longer holds a grain behind a draft
> nobody will publish. Catalog 127 → **128**; no flow, target or service method moved. No refusal is new.
> `sdc_material_known` now asks the master a plan line is PUBLISHED from (`publishedMaterialMaster`: the
> material master ∪ the generated sample materials), the same master `pub_material_known` asks — a code
> neither names is still `UNKNOWN_MATERIAL`. The buyer's coverage and the planning `incoming` fact read
> `stillIncoming`: a to-paragon leg whose ASN is `Delivered` is no longer counted.

> **RE-HARVEST (2026-10-06, SRC-1).** The quotation gained ONE transition and ONE state:
> `t_quotation_withdraw` (Submitted | Under Review → **Withdrawn**, terminal; `cascade`, atom
> `quotation:withdraw` on the automation grant) — fired by a NEW cascade link from `t_rfq_cancel`, onto
> every quotation of the cancelled event still Submitted or Under Review. Catalog 128 → **129**.
> `t_rfq_close` is re-declared: `trigger: 'user'`, `surfaced: true`, and its atom `rfq:close` moves from
> the automation grant to the `procurement` lane (it had no caller). **Two refusals are new**, both
> `POLICY_REJECTED`:
> `RFQ_ACTOR_UNATTRIBUTED` (hook `rfq_actor_attributed`, first in `policyHooks` on `t_rfq_publish`,
> `t_rfq_cancel` and `t_rfq_award`) — the seat carries no person; a sample person is admitted — and
> `AWARD_FX_UNPINNED` (hook `rfq_award_fx_basis` on `t_rfq_award`) — the event's quotations are priced in
> more than one currency and a foreign one has no recorded rate; a stale recorded rate is admitted.
> `RFQ.respondedSupplierIds` is no longer stored: it is derived from the quotations on every read
> (`rfqResponses.respondedSupplierIdsOf`), and the fixture authors none. `RFQ.awardedAt` is new and
> store-assigned at `t_rfq_award` (the day of the act). No service method moved.

> **RE-HARVEST (2026-10-06, SRC-2).** No transition, state or service method moved; the catalog is
> unchanged. **Four refusals are new on `t_quotation_submit`**, all `POLICY_REJECTED`, evaluated after
> `quotation_submit_currency_permitted` in this order:
> `QUOTE_EVENT_NOT_OPEN` (hook `quotation_submit_event_open`) — the event the payload names is not `Open`;
> `QUOTE_DEADLINE_PASSED` (hook `quotation_submit_before_deadline`) — its `responseDeadline` is before the
> declared present, compared by day; the deadline day itself is admitted;
> `QUOTE_ALREADY_SUBMITTED` (hook `quotation_submit_one_per_supplier`) — the submitting supplier already
> holds a quotation on the event, in any state. A second quotation is REFUSED, not taken as a revision:
> no field links a quotation to one it replaces;
> `QUOTE_VALIDITY_PAST` (hook `quotation_submit_validity_current`) — a stated `validUntil` is before the
> declared present or is not a date. An absent `validUntil` is admitted (it is not a required field).
> **`Quotation` gains three OPTIONAL fields**, written only when the payload states them:
> `sampleBatch` (`'yes' | 'no'`), `sampleLeadTime` (free text, kept only beside `'yes'`) and
> `attachmentName` (the NAME of an attached document; no file crosses the boundary).
> **`getRFQs` under a SUPPLIER scope now returns a projection** (`rfqSupplierView.toSupplierRfqView`), an
> allowlist: `invitedSupplierIds` and `respondedSupplierIds` hold the reader's own id or nothing,
> `awardedSupplierId` / `awardedQuotationId` are present only for the winner, and `fxPins` and
> `estimatedValue` are never present. The method's signature and its buyer-scope answer are unchanged.
> The RFQ and quotation fixtures are anchored to the declared present (families `rfq` and `quotation`,
> one anchor), so their dates are no longer the authored literals.

> **RE-HARVEST (2026-10-06, RFx-1).** The sourcing event gained stages (design A: ONE event, a `stage`
> field — `RFI` | `RFP` | `RFQ`; an event that states none is at `RFQ`). Catalog 129 → **132** across
> 28 → **29** flows, wired targets 22 → **23**. Moved by the pin going red.
> **`rfq` gained TWO transitions and ONE state.** `t_rfq_advance` (Closed → Open; atom `rfq:advance`,
> procurement; required `shortlistSupplierIds`, `responseDeadline`; optional `shortlistReason`,
> `awardDeadline`) moves the event to its next stage, replaces `invitedSupplierIds` with the shortlist and
> appends to `RFQ.stageHistory`. `t_rfq_conclude` (Open | Closed → **Concluded**, terminal; atom
> `rfq:conclude`, procurement; required `concludeReason`) ends the event with no award and cascades
> `t_quotation_withdraw` onto every quotation still Submitted or Under Review (a NEW cascade link).
> **`stageResponse` is a NEW flow and wired target**: one state `Submitted`, one creation verb
> `t_stageresponse_submit` (atom `stageresponse:submit`, supplier commercial; required `rfqId`; payload
> `supplierId`, optional `note`). The stage is store-assigned from the event, never payload-supplied.
> **Sixteen refusals are new, all `POLICY_REJECTED`:**
> on `t_rfq_create` — `STAGE_UNKNOWN` (hook `rfq_create_stage_known`): a stated `stage` is none of the three;
> on `t_rfq_publish`, evaluated last — `PUBLISH_DEADLINE_PAST` (hook `rfq_publish_deadline_current`): the
> `responseDeadline` is before the declared present, by day, or is not stated;
> on `t_rfq_award`, evaluated second — `AWARD_STAGE_NOT_RFQ` (hook `rfq_award_at_rfq_stage`);
> on `t_rfq_advance`, after `rfq_actor_attributed`, in this order — `STAGE_IS_FINAL`
> (`rfq_advance_has_next_stage`), `SHORTLIST_EMPTY` (`rfq_advance_shortlist_stated`),
> `SHORTLIST_NOT_A_RESPONDER` (`rfq_advance_shortlist_responded`), `SHORTLIST_UNDER_FLOOR`
> (`rfq_advance_shortlist_competitive` — the publish decision over the shortlist),
> `SHORTLIST_REASON_MISSING` (`rfq_advance_reason_stated` — required when an invited supplier is left out),
> `STAGE_DEADLINE_PAST` (`rfq_advance_deadline_current`);
> on `t_rfq_conclude` — `CONCLUDE_REASON_MISSING` (hook `rfq_conclude_reason_stated`): whitespace only;
> on `t_rfq_reopen` — `REOPEN_CARRIES_SHORTLIST` (hook `rfq_reopen_not_an_advance`): the payload carries
> `shortlistSupplierIds`. Reopen and advance share the Closed → Open edge and the target applies an
> advance by that edge plus the shortlist, so the other verb on the edge refuses one;
> on `t_quotation_submit`, evaluated third — `QUOTE_STAGE_NOT_RFQ` (hook `quotation_submit_at_rfq_stage`);
> on `t_stageresponse_submit`, in this order — `INTEREST_EVENT_NOT_OPEN` (`stage_response_event_open`),
> `INTEREST_STAGE_TAKES_QUOTATIONS` (`stage_response_stage_takes_interest`), `INTEREST_DEADLINE_PASSED`
> (`stage_response_before_deadline`), `INTEREST_ALREADY_RECORDED` (`stage_response_one_per_stage`).
> `rfq_actor_attributed` now also guards `t_rfq_advance` and `t_rfq_conclude`.
> **`RFQ` gains four OPTIONAL stored fields** — `stage`, `stageHistory` (append-only: `from`, `to`,
> `advancedAt`, `shortlistedSupplierIds`, `notShortlistedSupplierIds`, `reason?`), `concludedAt`,
> `concludeReason` — **and one field derived at read**, `stageResponses`. `respondedSupplierIds` is now
> stage-aware: quotation holders at `RFQ`, stage responders at the current stage otherwise.
> **`getRFQs` under a SUPPLIER scope** now also returns an event the reader was left off at an advance
> (`rfqSupplierView.supplierMayRead`), and the projection carries `stage`, `stageHistory` narrowed to the
> reader (`reason` only when the reader is the one left out), `concludedAt` (never `concludeReason`) and
> the reader's own `stageResponses`. No service method was added.

> **RE-HARVEST (2026-10-07, RFx-2).** The RFI stage gained a questionnaire. Catalog 132 → **136**; the
> flow count (29) and the wired-target count (23) are unchanged. Moved by the pin going red.
> **`CommandTarget.applyTransition` gained a FIFTH, OPTIONAL parameter, `transitionId`** — the id of the
> verb being applied. The dispatcher passes it on every non-creation apply. **The `rfq` target now
> writes a guarded field ONLY for the verb that guards it** — the awardee and `awardedAt` for
> `t_rfq_award`, a rate for `t_rfq_fx_pin`, the stage / invite list / advance ledger for `t_rfq_advance`,
> the conclude reason and day for `t_rfq_conclude`, the questionnaire for `t_rfq_questionnaire_set` —
> and never from the shape of the payload. Before this, a `quote` key on ANY rfq verb appended a rate
> and an `awardedSupplierId` key on any verb recorded an awardee, with none of the owning verb's hooks
> run. `rfx2StorePayload.test.ts` derives every (verb, field group) pair from the flow. No refusal was
> added for it: a foreign key is ignored, not refused. `REOPEN_CARRIES_SHORTLIST` still refuses.
> **`rfq` gained ONE transition and no state.** `t_rfq_questionnaire_set` (Draft → Draft,
> state-preserving; atom `rfq:create`, procurement; no required field; payload `questions`, the whole
> list — an empty list removes the questionnaire). Legal on a Draft only, so a published event's
> questions do not move.
> **`stageResponse` gained ONE state and THREE transitions**, all on the atom `stageresponse:submit`.
> States `Draft`, `Submitted` (initial `Draft`; `Submitted` the only terminal). `t_stageresponse_save`
> (creation, ∅ → Draft; required `rfqId`; payload `supplierId`, optional `answers`, `note`),
> `t_stageresponse_resave` (Draft → Draft, state-preserving; payload `answers`, `note` — the whole draft,
> not a patch) and `t_stageresponse_send` (Draft → Submitted; payload `answers`, `note` — what is checked
> is what is stored, never the draft as last saved). `t_stageresponse_submit` now also takes `answers`.
> On the two verbs that act on a draft the event is the DRAFT'S OWN, read from the row; an `rfqId` in the
> payload is not read. A CREATION is judged on the event its payload names: which of the two applies is
> decided by whether the dispatch has a current state, so an `entityId` carried beside a creation is not read.
> **Five refusals are new, all `POLICY_REJECTED`:**
> on `t_rfq_questionnaire_set`, in this order — `QUESTIONNAIRE_STAGE_NOT_RFI`
> (hook `rfq_questionnaire_at_rfi`): the event does not start at RFI; `QUESTIONNAIRE_MALFORMED`
> (hook `rfq_questionnaire_well_formed`): names the question (`Q<n>`) and one of `NOT_A_LIST`,
> `ID_MISSING`, `ID_DUPLICATE`, `PROMPT_MISSING`, `TYPE_UNKNOWN`, `OPTIONS_TOO_FEW`, `UNIT_MISSING`,
> `KNOCKOUT_NOT_TAKEN`, `KNOCKOUT_NOT_AN_ANSWER`, `KNOCKOUT_NOT_REQUIRED`;
> on `t_stageresponse_resave` and `t_stageresponse_send`, evaluated second — `RESPONSE_DRAFT_STAGE_OVER`
> (hook `stage_response_draft_stage_current`): the event has left the stage the draft was written at;
> on all four stage-response verbs — `RESPONSE_ANSWER_INVALID`
> (hook `stage_response_answers_well_formed`): `answers` is not a map, names a question the event does not
> ask at this stage, or holds an answer not of its question's kind;
> on `t_stageresponse_submit` and `t_stageresponse_send`, evaluated last — `RESPONSE_QUESTION_REQUIRED`
> (hook `stage_response_required_answered`): names each unanswered required question by `Q<n>` and wording.
> The four RFx-1 stage-response refusals are unchanged; `stage_response_event_open` and
> `stage_response_before_deadline` now also guard the two verbs on a draft, and
> `INTEREST_ALREADY_RECORDED` now also refuses a second row beside a Draft.
> **A knock-out answer is NOT a refusal.** It is a fact the buyer reads (`rfiQuestionnaire.
> knockoutFailuresOf`); no verb refuses a response or an advance on it.
> **`RFQ` gains ONE optional stored field**, `questionnaire` — a list of `RfiQuestion`
> (`id`, `prompt`, `type`: `yes_no` | `single_choice` | `multi_choice` | `number` | `text` | `document`,
> `required`, `options?`, `unit?`, `knockout?`) — **and one field derived at read on a SUPPLIER read
> only**, `myStageDraft`. **`StageResponse` gains two optional stored fields**: `status` (`Draft`; absent =
> `Submitted`) and `answers` (question id → `yes` | `no`, an option, a list of options, a number, text, or
> — for a document question — the FILE NAME ONLY; no file is uploaded or stored).
> **`RFQ.stageResponses` and `respondedSupplierIds` carry SUBMITTED responses only**: a Draft is filtered
> out in `rfqStore`, so no buyer read holds one. **`getRFQs` under a SUPPLIER scope** now carries
> `questionnaire` with every question's `knockout` REMOVED (an allowlist per question,
> `rfqSupplierView.toSupplierQuestion`) and the reader's own unsent draft at the current stage as
> `myStageDraft`. No service method was added.
> **Questionnaire templates are NOT in this contract.** They are a browser-local list
> (`localStorage`, key `paragon.rfiTemplates`): no flow, no verb, no target, no event.
>
> **RE-HARVEST (2026-10-07, RFx-3).** The RFP stage gained criteria, a proposal and scores. Catalog
> 136 → **138**; the flow count (29) and the wired-target count (23) are unchanged. Moved by the pin
> going red.
> **`rfq` gained TWO transitions and no state.** `t_rfq_criteria_set` (Draft → Draft, state-preserving;
> atom `rfq:create`, procurement; no required field; payload `criteria`, the whole list — an empty list
> removes them). Legal on a Draft only. `t_rfq_proposal_score` (Closed → Closed, state-preserving; atom
> **`rfq:evaluate`, NEW, procurement**; required `supplierId`, `scores`; payload `scores` is a WHOLE
> sheet, one `{ criterionId, score, comment? }` per criterion). Legal on Closed only.
> **WHO SCORED IS NOT A PAYLOAD FIELD.** The `rfq` target writes `scoredBy` from `scope.actor`, and
> `scoredBy` joined `ATTRIBUTION_KEYS`: a payload carrying it is refused `ACTOR_IN_PAYLOAD` by the
> dispatcher before any hook. A sheet is found by (supplier, acting person), so a person replaces their
> own sheet and no request reaches another's. `CommandTarget.applyTransition`'s fourth parameter, the
> scope, is now read by the `rfq` target for that one write.
> **The `rfq` target writes `criteria` only for `t_rfq_criteria_set` and `proposalScores` only for
> `t_rfq_proposal_score`** — the RFx-2 rule, two fields on; `rfx2StorePayload.test.ts` derives the pairs.
> **Ten refusals are new, all `POLICY_REJECTED`:**
> on `t_rfq_criteria_set`, in this order — `CRITERIA_NO_RFP_STAGE` (hook `rfq_criteria_on_rfp_path`):
> the event starts at RFQ; `CRITERIA_MALFORMED` (hook `rfq_criteria_well_formed`): names the criterion
> (`C<n>`) and one of `NOT_A_LIST`, `ID_MISSING`, `ID_DUPLICATE`, `NAME_MISSING`, `WEIGHT_INVALID`,
> `GROUP_UNKNOWN`; `CRITERIA_WEIGHTS_NOT_100` (hook `rfq_criteria_weights_total`): states the sum;
> on `t_rfq_proposal_score`, in this order — `SCORE_EVALUATOR_UNATTRIBUTED`
> (hook `rfq_score_evaluator_named`): the seat names nobody (a sample person is admitted);
> `SCORES_LOCKED` (hook `rfq_score_not_locked`): the event has advanced from its RFP stage;
> `SCORE_STAGE_NOT_RFP` (hook `rfq_score_at_rfp_stage`); `SCORE_NO_PROPOSAL`
> (hook `rfq_score_proposal_held`): the supplier named holds no SUBMITTED response at this RFP stage;
> `SCORE_SHEET_INVALID` (hook `rfq_score_sheet_well_formed`): names the criterion and one of
> `NO_CRITERIA`, `NOT_A_LIST`, `NOT_A_SCORE`, `UNKNOWN_CRITERION`, `CRITERION_TWICE`, `OUT_OF_RANGE`
> (a score is a whole number from 1 to 5), `COMMENT_NOT_TEXT`, `CRITERION_UNSCORED`;
> on all four stage-response verbs, appended after the RFx-2 hooks — `PROPOSAL_INVALID`
> (hook `stage_response_proposal_well_formed`): `proposal` is not a map, names a criterion the event
> does not set at this stage, holds a response that is not text, or `documents` is not a list of names
> (or names a document at a stage that takes no proposal);
> on `t_stageresponse_submit` and `t_stageresponse_send`, evaluated last — `PROPOSAL_CRITERION_REQUIRED`
> (hook `stage_response_criteria_answered`): names each required criterion with no response by `C<n>`
> and name.
> **`SHORTLIST_UNDER_FLOOR` is unchanged in when it refuses; its reason now names the remedy** —
> shortlist another supplier that responded, reopen the stage, or conclude without an award.
> **A rank is NOT a refusal.** No verb refuses an advance on a score; the top-N and at-or-above
> pre-selections are surface conveniences over `rfpEvaluation.rankingOf`.
> **`RFQ` gains TWO optional stored fields**: `criteria` — a list of `RfpCriterion` (`id`, `name`,
> `weight` a percentage above 0, the weights of an event summing to 100, `required`, `group?`:
> `technical` | `commercial`) — and `proposalScores` — a list of sheets (`supplierId`, `scoredBy` an
> `ActorAttribution`, `scoredAt`, `scores`). **`StageResponse` gains two optional stored fields**:
> `proposal` (criterion id → text) and `documents` (FILE NAMES ONLY; no file is uploaded or stored).
> **A supplier's weighted total is the average, over the evaluators who scored it, of each evaluator's
> own weighted total**, on the 1–5 scale, to two decimals; equal totals share a rank. Derived at read,
> never stored.
> **`getRFQs` under a SUPPLIER scope** carries `criteria` from the RFP stage on (an allowlist per
> criterion, `rfqSupplierView.toSupplierCriterion`: weights are shown) and **never `proposalScores`** —
> the field is not on the supplier allowlist, so no score, total, rank or evaluator crosses, the
> reader's own included. No service method was added.

Source of truth: `src/services/data/types.ts` (service + command types),
`src/services/transitions/` (schema, dispatcher, flows).

---

## Axis 1 — the 71-method service surface (`IDataService`)

The single interface the Phase-F1 real adapter implements; pages call it through
`useDataService()` and do not change when the mock is swapped for `httpDataService`. Every method
takes `QueryScope` as its first argument (the scoping contract — a supplier only ever sees its
own data; the buyer sees the superset).

`IDataService` is eleven read sub-services + one command sub-service + one top-level method:

```ts
interface IDataService {
  suppliers: ISupplierService;
  procurement: IProcurementService;
  risk: IRiskService;
  discovery: IDiscoveryService;
  analytics: IAnalyticsService;
  collaboration: ICollaborationService;
  delivery: IDeliveryService;
  chase: IChaseService;
  enforcement: IEnforcementService;
  planning: IPlanningService;
  modules: IModuleService;
  commands: ICommandService;
  getCapabilities(scope: QueryScope): Promise<CapabilitySet>;
}
```

| Sub-service | Count | Methods |
|---|---|---|
| `ISupplierService` | 3 | `list`, `getById`, `getCurrent` |
| `IProcurementService` | 27 | `getPurchaseOrders`, `getPurchaseOrder`, `getInventory`, `getRFQs`, `getQuotations`, `getShipments`, `getASNs`, `getGoodsReceipts`, `getBuyerInvoices`, `getSupplierInvoices`, `getContracts`, `getObligations`, `getDocuments`, `getStorefrontCatalog`, `getStorefrontCerts`, `getStorefrontProducts`, `getKpis`, `getPerformanceTrend`, `getSupplierScorecards`, `getRequisitions`, `getIntakeLines`, `getSupplierApplications`, `getMaterialRequests`, `getPslListings`, `getMyPslListings`, `getProductionLines`, `getSupplierHealth` |
| `IRiskService` | 7 | `getRiskAlerts`, `getGeoRisks`, `getExposure`, `getScenarios`, `getCompliance`, `getComplianceRegistry`, `getCommodities` |
| `IDiscoveryService` | 4 | `getRecommended`, `getQualifications`, `getMarketIntel`, `getSingleSourceItems` |
| `IAnalyticsService` | 7 | `getSummary`, `getSpendByCategory`, `getTopSuppliers`, `getOtifTrend`, `getPoVolumeTrend`, `getChannelMix`, `getSupplierPerformance` |
| `ICollaborationService` | 10 | `getOwnRequirementResponses`, `getOwnInventoryDeclarations`, `getOwnIncomingShipments`, `getOwnSupplierAsns`, `getConsolidation`, `getCoverage`, `getChase`, `getRollups`, `getPublications`, `getPublicationWorkspace` |
| `IDeliveryService` | 4 | `getAgreements`, `releaseLines`, `confirmMatch`, `editPolicy` |
| `IChaseService` | 1 | `getUnifiedChase` |
| `IEnforcementService` | 1 | `getEnforcementSettings` |
| `IPlanningService` | 1 | `getPlanningFacts` |
| `IModuleService` | 2 | `getModuleActivation`, `getModuleLedger` |
| **read subtotal** | **67** | |
| `ICommandService` | 3 | `dispatch`, `getCommandStatus`, `settle` |
| top-level | 1 | `getCapabilities` |
| **TOTAL** | **71** | |

**Return contract:** list reads return `Page<T>` (DR-5 — see C2); single reads return `T | null`;
`getSummary` returns a summary object or `null` (buyer-populated, supplier-null). Failure is
signalled by **throwing** `DataError` (DR-4 — see C2), matching TanStack Query's `queryFn`-throws
model. Command methods report outcome as a status, not a throw, except hard authorization
failures (`NOT_FOUND` / `SCOPE_DENIED`) which throw `DataError` on the same channel as reads.

**Status:** **LIVE** (mock-backed: `mockDataService.ts` wires the mock read services +
`MockCommandService` + `capabilitiesFor`). The real adapter is **RESERVED** — **no module in
`src/` implements `httpDataService`** (C5). Several files under `src/` name it, every one of them as a reserved
future seam or a comment; the pin asserts the ABSENCE OF AN IMPLEMENTATION, never the absence of
the string, because those are different claims and only the first is the contract's.

---

## Axis 2 — the 138-transition catalog (29 flows)

Every authored state-machine edge across the registered flows (`id: 't_<entity>_<verb>'`). Derived
from `getKnownFlows()` — the seeded registry — never from a grep over the flow files, because a
transition id can be assembled at a call site rather than written as a literal (§83). This is the
*verb* surface and is **not** the service-method count.

| Flow file | Entity | Transitions | Transition ids | Wiring |
|---|---|---|---|---|
| `purchaseOrder.flow.ts` | `purchaseOrder` | 7 | `t_po_issue`, `t_po_view`, `t_po_acknowledge`, `t_po_confirm`, `t_po_partial_deliver`, `t_po_deliver`, `t_po_close` | **wired** |
| `advanceShipNotice.flow.ts` | `advanceShipNotice` | 6 | `t_asn_create`, `t_asn_submit`, `t_asn_in_transit`, `t_asn_deliver`, `t_asn_discrepancy`, `t_asn_resolve_discrepancy` | **wired** |
| `goodsReceipt.flow.ts` | `goodsReceipt` | 8 | `t_gr_create`, `t_gr_start_inspection`, `t_gr_hold`, `t_gr_request_retest`, `t_gr_approve`, `t_gr_partial_approve`, `t_gr_reject`, `t_gr_post` | **wired** |
| `goodsReceiptLine.flow.ts` | `goodsReceiptLine` | 6 | `t_grline_inspect`, `t_grline_accept`, `t_grline_reject`, `t_grline_quarantine`, `t_grline_release`, `t_grline_return` | sub-flow (rollup) |
| `invoice.flow.ts` | `invoice` | 8 | `t_invoice_create`, `t_invoice_submit`, `t_invoice_match`, `t_invoice_approve`, `t_invoice_release_payment`, `t_invoice_remit`, `t_invoice_dispute`, `t_invoice_resolve` | **wired** |
| `invoiceMatch.flow.ts` | `invoiceMatch` | 4 | `t_invmatch_await_gr`, `t_invmatch_matched`, `t_invmatch_qty_variance`, `t_invmatch_price_variance` | sub-flow (rollup) |
| `rfq.flow.ts` | `rfq` | 12 | `t_rfq_create`, `t_rfq_questionnaire_set`, `t_rfq_criteria_set`, `t_rfq_publish`, `t_rfq_close`, `t_rfq_award`, `t_rfq_fx_pin`, `t_rfq_proposal_score`, `t_rfq_advance`, `t_rfq_conclude`, `t_rfq_cancel`, `t_rfq_reopen` | **wired** |
| `quotation.flow.ts` | `quotation` | 5 | `t_quotation_submit`, `t_quotation_review`, `t_quotation_award`, `t_quotation_reject`, `t_quotation_withdraw` | **wired** |
| `stageResponse.flow.ts` | `stageResponse` | 4 | `t_stageresponse_submit`, `t_stageresponse_save`, `t_stageresponse_resave`, `t_stageresponse_send` | **wired** |
| `shipment.flow.ts` | `shipment` | 8 | `t_shipment_create`, `t_shipment_asn_received`, `t_shipment_depart`, `t_shipment_arrive_port`, `t_shipment_customs`, `t_shipment_dock`, `t_shipment_unload`, `t_shipment_deliver` | inert |
| `contract.flow.ts` | `contract` | 4 | `t_contract_draft`, `t_contract_activate`, `t_contract_renew`, `t_contract_terminate` | inert |
| `obligation.flow.ts` | `obligation` | 2 | `t_obligation_track`, `t_obligation_complete` | inert |
| `purchaseRequisition.flow.ts` | `purchaseRequisition` | 7 | `t_pr_create`, `t_pr_submit`, `t_pr_approve`, `t_pr_reject`, `t_pr_revise`, `t_pr_source`, `t_pr_convert` | **wired** |
| `intakeLine.flow.ts` | `intakeLine` | 3 | `t_intake_dismiss`, `t_intake_restore`, `t_intake_commit` | **wired** |
| `supplierDocument.flow.ts` | `supplierDocument` | 5 | `t_supplierdoc_request`, `t_supplierdoc_declare`, `t_supplierdoc_submit`, `t_supplierdoc_verify`, `t_supplierdoc_reject` | **wired** |
| `compliance.flow.ts` | `compliance` | 3 | `t_compliance_submit`, `t_compliance_verify`, `t_compliance_reject` | inert |
| `requirementResponse.flow.ts` | `requirementResponse` | 9 | `t_requirementresponse_submit`, `t_requirementresponse_acknowledge`, `t_requirementresponse_promote`, `t_requirementresponse_review`, `t_requirementresponse_accept`, `t_requirementresponse_dispute`, `t_requirementresponse_resolve`, `t_requirementresponse_revise`, `t_requirementresponse_supersede` | **wired** |
| `inventoryDeclaration.flow.ts` | `inventoryDeclaration` | 2 | `t_inventorydeclaration_declare`, `t_inventorydeclaration_record` | **wired** |
| `incomingShipment.flow.ts` | `incomingShipment` | 4 | `t_incomingshipment_report`, `t_incomingshipment_ship`, `t_incomingshipment_arrive`, `t_incomingshipment_cancel` | **wired** |
| `enforcement.flow.ts` | `enforcement` | 1 | `t_enforcement_set` | **wired** |
| `role.flow.ts` | `role` | 1 | `t_role_grant` | **wired** |
| `supplierApplication.flow.ts` | `supplierApplication` | 4 | `t_application_submit`, `t_application_start_review`, `t_application_approve`, `t_application_reject` | **wired** |
| `materialRequest.flow.ts` | `materialRequest` | 4 | `t_materialrequest_submit`, `t_materialrequest_start_review`, `t_materialrequest_approve`, `t_materialrequest_reject` | **wired** |
| `psl.flow.ts` | `psl` | 8 | `t_psl_propose`, `t_psl_grant`, `t_psl_reject`, `t_psl_change_status`, `t_psl_renew`, `t_psl_withdraw`, `t_psl_publish`, `t_psl_cap_override` | **wired** |
| `pslCapSetting.flow.ts` | `pslCapSetting` | 1 | `t_psl_cap_set` | **wired** |
| `deliveryRelease.flow.ts` | `deliveryRelease` | 3 | `t_delivery_release`, `t_delivery_adjust`, `t_delivery_confirm` | **wired** |
| `deliveryPolicy.flow.ts` | `deliveryPolicy` | 1 | `t_delivery_policy_set` | **wired** |
| `forecastPublication.flow.ts` | `forecastPublication` | 7 | `t_publication_open`, `t_publication_allocate`, `t_publication_approve_firm`, `t_publication_publish`, `t_publication_discard`, `t_publication_supersede`, `t_publication_withdraw` | **wired** |
| `moduleActivation.flow.ts` | `moduleActivation` | 1 | `t_module_set` | **wired** |
| **TOTAL** | | **138** | | |

**Flow shape** (`schema.ts`, `FlowDefinition` / `TransitionDef`): each transition declares
`from[]` / `to` / `trigger` / `requiredRole` / `requiredFields[]` / `policyHooks[]` /
`sapBoundary?` / `version`. `trigger ∈ { user, system, cascade, creation }` — **`clock` is
type-level impossible** (law 0.5: clock-derived states are read-time projections, never
transitions; enforced by a compile-time `AssertNever<Extract<TransitionTrigger,'clock'>>` guard
that fails `tsc` if `clock` ever leaks in). Registration is a one-time module side-effect;
importing the transitions barrel seeds the singleton registry.

**SAP-boundary verbs (Option B) — exactly 2 today:** `t_gr_post` and `t_invoice_release_payment`
carry `sapBoundary: true`. The dispatcher returns `submitted` (not `done`) for these; the real
system reference is minted only on `settle` (see C5, SAP boundary).

---

## Axis 3 — the 23 wired CommandTargets

A `CommandTarget` is the per-entity adapter the dispatcher reads/writes through. **23 exist**, the
runtime export `WIRED_COMMAND_TARGETS` (`MockCommandService.ts` `TARGETS`):

- **wired:** `purchaseOrder`, `advanceShipNotice`, `goodsReceipt`, `invoice`, `rfq`, `quotation`, `stageResponse`, `purchaseRequisition`, `intakeLine`, `supplierDocument`, `requirementResponse`, `inventoryDeclaration`, `incomingShipment`, `enforcement`, `role`, `supplierApplication`, `materialRequest`, `psl`, `pslCapSetting`, `deliveryRelease`, `deliveryPolicy`, `forecastPublication`, `moduleActivation`

The interface is **7 members** (`dispatcher.ts`, `CommandTarget`):

```ts
interface CommandTarget {
  readState(entityId: string): string | null;         // current state, or null if absent
  readScopeOwner(entityId: string): string | null;    // owning supplierId, or null
  readEntity(entityId: string): unknown;              // full entity for policy hooks
  applyTransition(entityId, toState, payload): void;  // the store mutation
  creationOwner?(payload): string | null;             // creation scope from payload's parent
  requireCreationOwner?: boolean;                     // refuse an owner-less creation
  create?(payload, toState, scope, decision?): { entityId: string };  // mint, return assigned id
}
```

The first four serve non-creation transitions (entity exists). The last three serve `creation`
transitions — scope is derived from the payload's **parent** (`creationOwner`, e.g.
`poReference → PO.supplierId`) and `create` mints the entity + returns its store-assigned id
(canonical creation pattern: ASN drafted against its own PO).

⚠️ **`create`'s FOURTH PARAMETER IS THE RECORDED GOVERNED DECISION (A2), AND IT ARRIVES FOR
`scope`'s REASON, ONE RULING LATER.** A creation that must record an override on the DOCUMENT — not
only on the DR-10 event — has no other way to reach it, and the alternative is a caller-supplied
payload field, which is `setBy`'s shape. What the target receives is the decision the DISPATCHER
completed: `wasAdjusted` is derived there and is **not a key any caller has** (A1-R2a, C6 §8.3
Amendment 1a), so a target cannot be handed a boolean that disagrees with the pair beside it. Every
pre-A2 target ignores the parameter.

⚠️ **`readScopeOwner` returning `null` means "NO SUPPLIER MAY ACT ON THIS", not "nothing to
compare"** (§86). The dispatcher's supplier arm compares `owner !== scope.supplierId`
unconditionally; a target that wants a supplier to reach a verb must NAME that supplier.

### Wiring census (29 flows → 3 states)

- **23 behavior-wired** — have a `CommandTarget`, dispatch runs against in-memory stores. Named
  above.
- **2 rolled-up sub-flows** — authored, participate via terminal rollup (`grRollup.ts` /
  `invoiceRollup.ts`), **no standalone target**: `goodsReceiptLine`, `invoiceMatch`.
- **4 inert** — registry data only: **no CommandTarget**: `shipment`, `contract`, `obligation`,
  `compliance`. Contract-complete, NOT behavior-complete (FORK-2 hybrid — each machine's
  `CommandTarget` + verb wiring rides its Stage-2 surface). ⚠️ **`compliance` is READ-complete and
  WRITE-inert**: `BuyerCompliance` reads through the seam, and `t_compliance_submit` / `_verify` /
  `_reject` can never fire. It wires against the real cert registry post Track-R harvest, which
  flips its LivenessRegistry tier SIMULATED → LIVE.

**The target-less set is a SET DIFFERENCE, never a list:** `getKnownFlows()` ∖
`WIRED_COMMAND_TARGETS`. It has gone stale in both directions before — written as four when it
was seven, then silently wrong again when `supplierDocument` was wired — which is why the pin
derives it rather than reading the bullet above.

---

## The dispatcher pipeline (single validator/executor)

One dispatcher for every command (`dispatcher.ts`). It validates in order, then applies + emits:

1. **Transition exists** in the registry, and the entity has a `CommandTarget`.
2. **`QueryScope` on every command exactly as reads** — a supplier can only command its own
   entity, else `DataError('SCOPE_DENIED')`; a non-existent OR foreign entity both resolve to
   `SCOPE_DENIED` for a supplier (no existence leak); a missing entity for the buyer is
   `NOT_FOUND` (DR-6 amended). Creation derives the owner from the payload's parent.
3. **Module gate (M1, Design 5 §A.3)** — when the verb's module, the part governing it, or the
   commanding side is switched OFF, the command is refused `MODULE_INACTIVE:<switch>` (`SHP`,
   `GRC.qualityHold`, `side:supplier`). AFTER the scope pair, so a caller outside the tenancy
   learns nothing; BEFORE the role gate, so a caller inside it learns the module is off before
   anything about its role. A cascade into an OFF module returns this refusal and is recorded —
   it is not one of the two throwing exits the fan-out swallows. The switch set is injected
   (`moduleGate`), read from the activation ledger's derived view.
4. **`requiredRole ∈` the scope's roles** — resolved from the seat's `businessRoles` (§64); there
   is no persona fallback, and a command scope without `businessRoles` is refused.
5. **Ingress replay (H2a)** — when `CommandInput.idempotencyKey` is supplied and that key has
   already raised an act **under the same tenancy**, the dispatcher returns the FIRST result
   (same `correlationId`, same `entityId`) and raises nothing. It is a RESULT and not a
   refusal: a refusal is `status: 'failed'`, and an at-least-once transport's correct response
   to a failure is to redeliver — so refusing a replay would turn one duplicate into an
   unbounded retry loop. `COMMAND_REFUSALS` therefore gains no member. It sits AFTER the role
   gate (a caller without the atom learns nothing about which keys have been seen) and BEFORE
   the state precondition, which is the half that cannot move: the first command changed the
   state, so a replay reaching `expectedState` first would always be refused `STALE_STATE`.
   Optional: omitted, nothing changes. Only outcomes that RAISED an act are recorded, so a
   redelivery after a failure is free to try again. C7-FIND-05.
6. **State precondition (1c)** — when `CommandInput.expectedState` is supplied it must equal the
   entity's current state, else `STALE_STATE`. Optional: omitted, nothing changes. It sits AFTER
   the role gate (a caller without the atom learns nothing about the document) and BEFORE
   legality (a stale caller is told *why*, not merely that the act is illegal).
7. **Transition legality** — `currentState ∈ transition.from` (creation skips: empty `from`).
8. **`requiredFields`** present & non-empty in the payload.
9. **`policyHooks`** (resolved by registered name — never closures) all pass.

Then it applies the store mutation and **emits ONE event** (C3). `sapBoundary` transitions
resolve `submitted` and settle later. **Hard authorization failures throw `DataError`** (same
channel as reads); **domain rejections resolve `status: 'failed'`** with a machine-readable
reason and a `failed` event — every outcome is auditable. The module is framework-agnostic:
roles, targets, hooks, sink, id/clock are **injected**, so the mock and the Phase-F1 real adapter
share it unchanged.

**Command types** (`types.ts`): `CommandInput` (`transitionId` / `entity` / `entityId?` /
`payload?` / `expectedState?` / `idempotencyKey?` / `decision?`), `CommandResult` (`correlationId` / `transitionId` /
`status` / `reason?` / `entityId?`), `CommandStatus` (`correlationId` / `transitionId` / `status`
/ `ts`), `CommandOutcome = 'done' | 'submitted' | 'failed'`.

⚠️ **`expectedState` is a STATE precondition, not a REVISION precondition.** It is blind to
content staleness — a payload revised under you while the state held — and blind by construction
to `statePreserving` verbs, which leave the state where it was. Both blind sets are derived and
pinned in `staleState.test.ts`; neither is restated here.

**Cascades** are post-apply, best-effort fan-outs (a denied/illegal cascade never breaks the
source command), running under an `automation` grant. See C3 for how a cascade groups under the
source command via `causationId`.

---

## What the pin cannot see

`c1MethodSurface.contract.test.ts` compares **names, counts and membership**, derived from the AST
and the flow registry against this document's tables. Stated plainly, in the same form 1c's
header states its blindness, so that no reader mistakes a green floor for a correct contract:

| Class | Caught? | Why |
|---|---|---|
| a method added to / removed from a sub-service | **YES** | both directions, per sub-service |
| a sub-service added, removed or renamed | **YES** | composition block and table, both directions |
| a method moved between sub-services | **YES** | the sets are per-interface, not flattened |
| a transition added, removed or renamed | **YES** | derived from `getKnownFlows()` |
| a flow wired or unwired | **YES** | derived from `WIRED_COMMAND_TARGETS` |
| a `CommandTarget` member added or removed | **YES** | AST, methods **and** properties |
| **a SIGNATURE that changed shape** | **NO** | parameters and return types are not rendered on this page, so there is nothing to compare against. A method that keeps its name and changes its arguments is invisible here. |
| **a method present in both and wrong in BEHAVIOUR** | **NO** | the pin reads shape, never conduct. `getKpis` returning the wrong tenant's rows passes every assertion below. |
| **every prose claim on this page** | **NO** | the return contract, the scoping sentence, the pipeline narrative, the `Status` lines and this table itself are not mechanically checkable. C9 makes the same admission and it is the honest one: pretending prose is checkable would be its own dishonesty. |
| **whether the counterparty implements any of it** | **NO** | this is our shape, not their conformance. |

**If you are checking an implementation against this page, you have checked the shape. You have
not yet checked the behaviour.**

---

## Pin reach

**Pinned by** `src/services/contracts/__tests__/c1MethodSurface.contract.test.ts` and `src/handoverFigures.pin.test.ts`.

**GUARDED — these assertions, and nothing else on this page:**

- C1 — the instruments examined something, both ways
- C1 Axis 1 — the composition of IDataService
- C1 Axis 1 — every method, per sub-service, both directions
- C1 Axis 1 — the removals are recorded, not silently dropped
- C1 Axis 2 — the transition catalog
- C1 Axis 3 — the wired CommandTargets
- C1 — the command types are documented field for field
- C5 — the figures C5 borrows from C1 agree with C1’s derivation
- C1 — `httpDataService` is RESERVED, and that is a claim about an IMPLEMENTATION
- H1 · the populations are real before any figure is believed
- H1 · the figures D1 §1 states
- H1 · the contracts README carries the C1 figures, and C1 is pinned to the tree


⚠️ **THIS INSTRUMENT IS SHARED, AND THE REACH BELOW IS THE INSTRUMENT'S RATHER THAN THIS
PAGE'S.** It also asserts over `C5-seams.md`, so entries naming another document are its assertions about
that sibling. They are listed here rather than filtered because **the thing a reader needs is
what the instrument checks**, and a filtered list would quietly re-introduce the judgement this
block exists to remove.

⚠️ **NOT GUARDED — EVERYTHING ELSE ON THIS PAGE, AND THAT HALF IS WHY THIS BLOCK EXISTS.**
A list of guarded things reads as completeness. It is not: **a reader who assumes the pin
covers a clause it does not reach is the failure this block is built against**, and it has
happened in this corpus — a DTO field whose MEANING was assumed pinned by a method-surface
pin, and a repaired defect still asserted as current in a document whose pin passed because
it only checks that an unenforced row SAYS it is unenforced.

Most of what is not guarded **cannot be**, and that is a property of a contract rather than
a backlog: a clause describing a system outside this repository has nothing here to compare
against, and a clause stating WHY a boundary exists has no truth-value to decay. See C12
for the statement of that property.

⚠️ **THIS BLOCK IS SELF-PINNED** (`src/services/contracts/__tests__/pinReach.contract.test.ts`).
The GUARDED list is asserted EQUAL to the pin’s own `describe` titles, **both directions**:
widen the pin without listing the new assertion and it reddens; drop a line here without
narrowing the pin and it reddens too. A reach statement that can drift is the overclaim one
layer up.

