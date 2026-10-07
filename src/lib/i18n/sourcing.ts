// BuyerSourcing i18n fragment (Batch 1). Namespace: sourcing.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (no reliance on the i18next plural
// resolver, matching the flat-key convention already shipped in i18n.ts).
// Award verbs use the "menang" family (Award → Menangkan, Awarded →
// Dimenangkan) to stay consistent with the status glossary (statusLabel.ts).
// Canonical StatusPill children (Open/Awarded/Draft/…) are localized centrally
// by StatusPill via statusLabel.ts and are NOT re-declared here.
export const sourcingEn: Record<string, string> = {
  // — Breadcrumb —
  'sourcing.crumb.sourcing': 'SOURCING EVENTS',
  // — Page header —
  'sourcing.header.title': 'Sourcing events',
  'sourcing.header.subtitle': 'RFI · RFP · RFQ',
  // — Header actions —
  'sourcing.action.export': 'Export',
  'sourcing.action.templates': 'Event templates',
  'sourcing.action.newRfq': 'New sourcing event',
  // — Meta line —
  'sourcing.meta.summary.one': '{{count}} active RFQ · last updated {{date}}',
  'sourcing.meta.summary.other': '{{count}} active RFQs · last updated {{date}}',
  // — KPI cards —
  'sourcing.kpi.active.eyebrow': 'Active events',
  'sourcing.kpi.byStage': 'RFI {{RFI}} · RFP {{RFP}} · RFQ {{RFQ}}',
  'sourcing.kpi.active.subtitle': 'Open for response',
  'sourcing.kpi.awaiting.eyebrow': 'Awaiting Response',
  'sourcing.kpi.awaiting.subtitle': 'Deadline within 7 days',
  'sourcing.kpi.ready.eyebrow': 'Ready to Award',
  'sourcing.kpi.ready.subtitle': 'At the RFQ stage, all suppliers responded',
  'sourcing.kpi.awarded.eyebrow': 'Awarded (Quarter)',
  'sourcing.kpi.awarded.subtitle': 'Last 90 days',
  // — Group tabs —
  'sourcing.tab.all': 'All',
  'sourcing.tab.open': 'Open',
  'sourcing.tab.pending': 'Pending Award',
  'sourcing.tab.awarded': 'Awarded',
  'sourcing.tab.closed': 'Closed',
  'sourcing.tab.concluded': 'Concluded',
  // — Filter / search —
  'sourcing.filter.byCategory': 'Filter by category',
  'sourcing.filter.byStage': 'Filter by stage',
  'sourcing.search.placeholder': 'Search by RFQ number, title, or material…',
  // — Category labels (value stays the RFQCategory enum for logic) —
  'sourcing.category.fragrance': 'Fragrance',
  'sourcing.category.activeIngredients': 'Active Ingredients',
  'sourcing.category.packaging': 'Packaging',
  'sourcing.category.emulsifiers': 'Emulsifiers',
  'sourcing.category.botanical': 'Botanical',
  'sourcing.category.other': 'Other',
  // — Active table —
  'sourcing.table.col.rfq': 'RFQ #',
  'sourcing.table.col.category': 'Category',
  'sourcing.table.col.stage': 'Stage',
  'sourcing.table.col.responses': 'Responses',
  'sourcing.table.col.qty': 'Qty',
  'sourcing.table.col.estValue': 'Est. Value',
  'sourcing.table.col.responseDeadline': 'Response deadline',
  'sourcing.table.col.status': 'Status',
  'sourcing.table.col.actions': 'Actions',
  'sourcing.table.empty': 'No RFQs match the current filters.',
  // — Deadline compact labels —
  'sourcing.deadline.overdue': '{{count}}d overdue',
  'sourcing.deadline.dueToday': 'Due today',
  'sourcing.deadline.remaining': '{{count}}d remaining',
  // — Awards history —
  'sourcing.awards.title': 'Awards History',
  'sourcing.awards.count.one': '{{count}} awarded RFQ',
  'sourcing.awards.count.other': '{{count}} awarded RFQs',
  'sourcing.awards.col.rfq': 'RFQ #',
  'sourcing.awards.col.title': 'Title',
  'sourcing.awards.col.supplier': 'Awarded supplier',
  'sourcing.awards.col.date': 'Award date',
  'sourcing.awards.col.value': 'Award value',
  'sourcing.awards.col.actions': 'Actions',
  'sourcing.awards.empty': 'No awarded RFQs yet.',
  // — Side panel —
  'sourcing.panel.title': 'RFQ {{number}} — {{title}}',
  'sourcing.panel.exportComparison': 'Export comparison',
  'sourcing.panel.awardSummary': 'Award summary',
  'sourcing.panel.awardedTo': 'Awarded to',
  'sourcing.panel.awardedValue': 'Awarded value',
  'sourcing.panel.awardDate': 'Award date',
  'sourcing.panel.poIssued': 'PO issued',
  'sourcing.panel.summary': 'Summary',
  'sourcing.panel.field.category': 'Category',
  'sourcing.panel.field.status': 'Status',
  'sourcing.panel.field.created': 'Created',
  'sourcing.panel.field.responseDeadline': 'Response deadline',
  'sourcing.panel.field.awardDeadline': 'Award deadline',
  'sourcing.panel.field.totalQty': 'Total qty',
  'sourcing.panel.field.estValue': 'Est. value',
  'sourcing.panel.field.currency': 'Currency',
  'sourcing.panel.field.incoterms': 'Incoterms',
  'sourcing.panel.field.paymentTerms': 'Payment terms',
  'sourcing.panel.lifecycle': 'Lifecycle',
  // — Quote comparison —
  'sourcing.cmp.title.one': 'Quote comparison ({{count}} quote)',
  'sourcing.cmp.title.other': 'Quote comparison ({{count}} quotes)',
  'sourcing.cmp.empty': 'No quotes received yet.',
  'sourcing.cmp.criterion': 'Criterion',
  'sourcing.cmp.topRanked': 'Top-ranked',
  // — 2e-c-3 FX refusals. Both name the currencies and both name the REMEDY:
  //   a refusal a buyer cannot act on is only half a refusal.
  'sourcing.cmp.fx.refused.FX_UNPINNED':
    'Not ranked — quotes are priced in {{currencies}} and no exchange rate has been recorded for this RFQ. Record a rate to compare them; the bids below are shown as quoted.',
  // 2e-c-4 — a STALE refusal names the vintage it is judging. "Too old" without
  // saying how old leaves a buyer unable to tell this morning's rate from
  // January's.
  'sourcing.cmp.fx.refused.FX_STALE':
    'Not ranked — the recorded exchange rate for {{currencies}} (as of {{asOf}}) is older than this comparison allows. Record a current rate; the previous one is kept on the RFQ.',
  // — 2e-c-4 · the recorded FX basis, on screen. A buyer must be able to answer
  //   "what rate ranked this, and how old is it?" without an audit query.
  'sourcing.cmp.fx.basis.title': 'Exchange rate basis',
  'sourcing.cmp.fx.basis.asOf': 'as of {{date}}',
  'sourcing.cmp.fx.basis.none': 'No rate recorded',
  'sourcing.cmp.fx.basis.source.MANUAL': 'Entered manually',
  'sourcing.cmp.fx.basis.source.SAP_EXHGRATE': 'SAP exchange rate',
  // Superseded pins are KEPT (D-1) — saying so makes the preservation visible
  // rather than a claim in a code comment.
  'sourcing.cmp.fx.basis.superseded.one': '{{count}} earlier rate kept',
  'sourcing.cmp.fx.basis.superseded.other': '{{count}} earlier rates kept',
  'sourcing.cmp.fx.basis.record': 'Record {{currency}} rate',
  // "Supersede", never "Edit": the prior rate is not replaced, it is outranked
  // by a newer recorded act, and both stay on the RFQ.
  'sourcing.cmp.fx.basis.supersede': 'Supersede {{currency}} rate',
  // — the pin dialog (confirm-before-commit) —
  'sourcing.fx.dialog.title.record': 'Record the {{currency}} exchange rate',
  'sourcing.fx.dialog.title.supersede': 'Supersede the {{currency}} exchange rate',
  'sourcing.fx.dialog.body.record':
    'This rate is what Paragon will compare {{currency}} bids against. It is recorded on the RFQ and kept with the award decision.',
  'sourcing.fx.dialog.body.supersede':
    'This records a NEW {{currency}} rate. The existing one is not changed or deleted — it stays on the RFQ, so the basis every earlier comparison used remains on record.',
  'sourcing.fx.dialog.prior': 'Currently in force:',
  'sourcing.fx.dialog.rate': 'Rate — {{base}} per 1 {{currency}}',
  'sourcing.fx.dialog.rateHint': 'Digits only — no thousands separators (e.g. 17250)',
  'sourcing.fx.dialog.asOf': 'Rate date',
  'sourcing.fx.dialog.asOfHint':
    'The date this rate was true. Comparisons refuse to rank on a rate older than {{days}} days.',
  'sourcing.fx.dialog.source': 'Source',
  'sourcing.fx.dialog.rateType': 'SAP rate type (optional)',
  'sourcing.fx.dialog.cancel': 'Cancel',
  'sourcing.fx.dialog.confirm.record': 'Record rate',
  'sourcing.fx.dialog.confirm.supersede': 'Record new rate',
  'sourcing.fx.dialog.submitting': 'Recording…',
  // — rate / vintage refusals: each names its own rule —
  'sourcing.fx.refused.EMPTY_QTY': 'Enter the exchange rate — a blank field is not a rate.',
  'sourcing.fx.refused.NOT_NUMERIC': 'That is not a rate — type digits only, e.g. 17250.',
  'sourcing.fx.refused.AMBIGUOUS_QTY':
    'This can be read two ways — "17.250" means seventeen thousand two hundred fifty in Indonesian and seventeen-point-two-five in English. Type it without separators: 17250.',
  'sourcing.fx.refused.ZERO_RATE':
    'Zero is not an exchange rate. It would value every foreign bid at nothing.',
  'sourcing.fx.refused.EMPTY_VINTAGE': 'Give the date this rate was true.',
  'sourcing.fx.refused.UNREADABLE_VINTAGE': 'That date cannot be read.',
  'sourcing.fx.refused.FUTURE_VINTAGE':
    'A rate cannot be true in the future. Enter the date it applied.',
  // — toasts —
  // Names the act, says no file exists, says what is missing. `info`, never
  // `success` — nothing was produced. Same register as `risk.toast.
  // exportStarting` and `buyerInventory.toast.exportStarted.*`.
  'sourcing.toast.exportComparison.title': 'Comparison export not available yet',
  'sourcing.toast.exportComparison.desc':
    'No file was generated — quote comparison export is not wired to a real system.',
  'sourcing.toast.fxPinned.title': '{{currency}} rate recorded',
  'sourcing.toast.fxPinned.desc': 'The comparison now ranks against it.',
  'sourcing.toast.fxSuperseded.title': 'New {{currency}} rate recorded',
  'sourcing.toast.fxSuperseded.desc':
    'The previous rate is kept on the RFQ; comparisons now use the new one.',
  'sourcing.toast.fxPinFailed.title': 'Rate not recorded',
  'sourcing.toast.fxPinFailed.default': 'Please try again.',
  'sourcing.cmp.simulated': 'Simulated',
  'sourcing.cmp.simulatedTitle': 'Rehearsal — awaiting a live source (compliance & reliability data)',
  'sourcing.cmp.row.unitPrice': 'Unit Price',
  'sourcing.cmp.row.totalPrice': 'Total Price',
  'sourcing.cmp.row.leadTime': 'Lead Time',
  // CP-0 2e-b-1a — the quote-stage lead time is a required ESTIMATE, not a
  // commitment. It is still scored and ranked on; the tag only stops the buyer
  // reading it as firmer than it is. The firm date is confirmed at PO.
  'sourcing.cmp.estimated': 'Estimated',
  'sourcing.cmp.estimatedTitle':
    'Indicative at quote stage — the supplier confirms a firm delivery date at PO. Still scored and ranked on.',
  // CP-0 2e-b-2 — the supplier's stated minimum order quantity, surfaced to the
  // buyer for the first time (it was collected on the quote form and dropped).
  // Display only this batch: whether a minimum ABOVE the RFQ quantity should
  // warn, flag or block the award is MOQ-FIND-01, not built here.
  'sourcing.cmp.row.moq': 'Min. Order Qty',
  'sourcing.cmp.moqNone': 'No minimum stated',
  'sourcing.cmp.row.paymentTerms': 'Payment Terms',
  'sourcing.cmp.row.validUntil': 'Valid until',
  'sourcing.cmp.row.sample': 'Sample batch',
  'sourcing.cmp.row.sampleLead': 'Sample lead time',
  'sourcing.cmp.row.notes': 'Supplier notes',
  'sourcing.cmp.row.attachment': 'Quotation document',
  'sourcing.cmp.notStated': 'Not stated',
  'sourcing.cmp.sample.yes': 'Can provide',
  'sourcing.cmp.sample.no': 'Cannot provide',
  'sourcing.cmp.attachment.none': 'None attached',
  'sourcing.cmp.attachment.nameOnly': 'Name only',
  'sourcing.cmp.attachment.nameOnlyTitle':
    'The supplier attached a document and its name is on record. This portal does not hold the file; ask the supplier for it.',
  'sourcing.cmp.row.compliance': 'Compliance',
  'sourcing.cmp.row.priceScore': 'Price Score',
  'sourcing.cmp.row.leadTimeScore': 'Lead Time Score',
  'sourcing.cmp.row.reliability': 'Reliability',
  'sourcing.cmp.row.composite': 'Composite',
  'sourcing.cmp.row.result': 'Result',
  'sourcing.cmp.row.status': 'Status',
  'sourcing.cmp.row.select': 'Select',
  'sourcing.cmp.leadTimeDays': '{{count}} days',
  'sourcing.cmp.award': 'Award',
  'sourcing.cmp.moveToReview': 'Move to review',
  // — CI-2 should-cost-vs-quote spread (read-only, MODELED × SIMULATED) —
  'sourcing.cmp.row.spread': 'vs Should-Cost',
  'sourcing.cmp.spread.range': '{{low}} to {{high}}',
  'sourcing.cmp.spread.vsModel': 'vs modeled ~{{value}}/kg',
  'sourcing.cmp.model': 'Model',
  'sourcing.cmp.modelTitle': 'Modeled should-cost — a computed reference, not an observed price; permanent regardless of feed liveness',
  'sourcing.cmp.fx': 'FX-converted',
  'sourcing.cmp.fxTitle': 'Should-cost pushed through spot FX to the quote currency — more modeled than a same-currency (FX-free) comparison',
  'sourcing.cmp.spread.silent.currency-unsupported': 'No should-cost reference — quoted in a currency the model does not price',
  'sourcing.cmp.spread.silent.tail': 'No should-cost reference — tail material (supplier-quoted only)',
  'sourcing.cmp.spread.silent.unit-mismatch': 'No should-cost reference — priced per unit, not by weight',
  'sourcing.cmp.spread.silent.unmapped': 'No should-cost reference — material not yet mapped to a basket',
  // — Award action panel —
  'sourcing.award.title': 'Award action',
  'sourcing.award.selected': 'Selected: {{name}}',
  'sourcing.award.selectPrompt': 'Select a quote above to enable the award action.',
  'sourcing.award.submit': 'Award to selected',
  'sourcing.award.submitting': 'Awarding…',
  // SRC-1 — the award commits from Open and Closed; it asks a second time.
  'sourcing.award.unanswered':
    '{{responded}} of {{total}} invited suppliers have answered. You can award on the quotations received.',
  'sourcing.award.fxBlocked':
    'This event cannot be awarded yet: quotations are priced in {{currencies}} and no exchange rate is recorded. Record the rate above, then award.',
  'sourcing.award.ask.none':
    'Award {{rfqNumber}} to {{name}} for {{value}}? This cannot be undone. No other quotation was received on this event.',
  'sourcing.award.ask.one':
    'Award {{rfqNumber}} to {{name}} for {{value}}? This cannot be undone: the other quotation is rejected and its supplier is told.',
  'sourcing.award.ask.other':
    'Award {{rfqNumber}} to {{name}} for {{value}}? This cannot be undone: the other {{count}} quotations are rejected and their suppliers are told.',
  'sourcing.award.ask.yes': 'Yes, award',
  'sourcing.award.ask.no': 'Not yet',
  'sourcing.cancel.ask.none':
    'Cancel {{rfqNumber}}? This cannot be undone. No quotation has been received on it.',
  'sourcing.cancel.ask.one':
    'Cancel {{rfqNumber}}? This cannot be undone: the 1 quotation on it is withdrawn and its supplier reads that the event was cancelled.',
  'sourcing.cancel.ask.other':
    'Cancel {{rfqNumber}}? This cannot be undone: the {{count}} quotations on it are withdrawn and their suppliers read that the event was cancelled.',
  'sourcing.cancel.ask.yes': 'Yes, cancel the event',
  'sourcing.cancel.ask.no': 'Keep the event',
  'sourcing.close.submit': 'Close bidding',
  'sourcing.close.submitting': 'Closing…',
  'sourcing.unattributed.note':
    'Publishing, advancing, concluding, cancelling and awarding are recorded against a person, and this seat carries none. Adopt a sample user on the identity panel first.',
  'sourcing.refusal.actorUnattributed':
    'Nothing was recorded. Publishing, advancing, concluding, cancelling or awarding a sourcing event is recorded against the person who decided it, and this seat carries none. Adopt a sample user on the identity panel, then take the act again.',
  'sourcing.refusal.awardFxUnpinned':
    'Not awarded. Quotations on this event are priced in a foreign currency and no exchange rate is recorded for it. Record the rate on the comparison, then award.',
  // — RFx-1 · the staged event: stages, advance with a shortlist, conclude —
  'sourcing.stage.title':
    'Stages',
  'sourcing.stage.name.RFI':
    'Request for information',
  'sourcing.stage.name.RFP':
    'Request for proposal',
  'sourcing.stage.name.RFQ':
    'Request for quotation',
  'sourcing.stage.left':
    'Advanced on',
  'sourcing.stage.state.done':
    'Done',
  'sourcing.stage.state.current':
    'Current stage',
  'sourcing.stage.state.upcoming':
    'Not started',
  'sourcing.stage.outcome.Awarded':
    'Awarded at the {{stage}} stage',
  'sourcing.stage.outcome.Concluded':
    'Concluded without an award at the {{stage}} stage',
  'sourcing.stage.outcome.Cancelled':
    'Cancelled at the {{stage}} stage',
  'sourcing.stage.advanceLine':
    '{{from}} to {{to}} — carried forward: {{names}}',
  'sourcing.stage.notCarriedLine':
    'Not carried: {{names}} — reason given: “{{reason}}”',
  'sourcing.wizard.field.stage':
    'Start at stage',
  'sourcing.wizard.stage.RFI':
    'Ask who is interested and able. Ends in a shortlist.',
  'sourcing.wizard.stage.RFP':
    'Ask the shortlist how they would do it. Ends in a shortlist.',
  'sourcing.wizard.stage.RFQ':
    'Ask for a price. Ends in an award.',
  'sourcing.wizard.deadlinePast':
    'This date has already passed. An event past its response deadline cannot be published.',
  'sourcing.wizard.review.row.stage':
    'Start stage',
  'sourcing.interest.title':
    'Responses at RFI and RFP',
  'sourcing.interest.contentNote':
    'At the RFI stage a supplier answers the event’s questionnaire — or, when the event asks none, records its interest and a note. At the RFP stage it submits a proposal against the event’s evaluation criteria — or, when the event sets none, records its interest and a note.',
  // — RFx-2 · the RFI questionnaire —
  'sourcing.wizard.stage.questionnaireHint':
    'The questionnaire is written on the draft, after this form and before you publish: open the draft and use “Write questionnaire”.',
  // — RFx-3 · the RFP: criteria, proposals, scores —
  'sourcing.wizard.stage.criteriaHint':
    'The RFP evaluation criteria and their weights are set on the draft, after this form and before you publish: open the draft and use “Set criteria”.',
  'sourcing.rfp.title':
    'RFP evaluation criteria',
  'sourcing.rfp.none':
    'This draft sets no evaluation criteria. Published like this, suppliers record their interest and a note at the RFP stage, and nothing is scored.',
  'sourcing.rfp.write':
    'Set criteria',
  'sourcing.rfp.edit':
    'Edit criteria',
  'sourcing.rfp.group.technical':
    'Technical',
  'sourcing.rfp.group.commercial':
    'Commercial',
  'sourcing.rfp.editor.empty':
    'No criteria yet. Add the first one, or save the empty list to set none.',
  'sourcing.rfp.editor.name':
    'Criterion',
  'sourcing.rfp.editor.weight':
    'Weight (%)',
  'sourcing.rfp.editor.group':
    'Part',
  'sourcing.rfp.editor.groupNone':
    'Neither',
  'sourcing.rfp.editor.required':
    'A response is required',
  'sourcing.rfp.editor.add':
    'Add criterion',
  'sourcing.rfp.editor.save':
    'Save criteria',
  'sourcing.rfp.editor.cancel':
    'Cancel',
  'sourcing.rfp.editor.moveUp':
    'Move {{criterion}} up',
  'sourcing.rfp.editor.moveDown':
    'Move {{criterion}} down',
  'sourcing.rfp.editor.remove':
    'Remove {{criterion}}',
  'sourcing.rfp.editor.sumWhole':
    'The weights sum to {{sum}}%.',
  'sourcing.rfp.editor.sumNot':
    'The weights sum to {{sum}}%, and must sum to 100%.',
  'sourcing.rfp.problem.NOT_A_LIST':
    'The criteria could not be read as a list.',
  'sourcing.rfp.problem.ID_MISSING':
    '{{criterion}} has no id.',
  'sourcing.rfp.problem.ID_DUPLICATE':
    '{{criterion}} repeats the id of an earlier criterion.',
  'sourcing.rfp.problem.NAME_MISSING':
    '{{criterion}} has no name.',
  'sourcing.rfp.problem.WEIGHT_INVALID':
    '{{criterion}} needs a weight above 0 and at most 100, with two decimals at most.',
  'sourcing.rfp.problem.GROUP_UNKNOWN':
    '{{criterion}} is in a part that is not technical or commercial.',
  'sourcing.rfp.toast.saved.title':
    'Criteria saved on {{rfqNumber}}',
  'sourcing.rfp.toast.saved.none':
    'The draft now sets no criteria.',
  'sourcing.rfp.toast.saved.one':
    'The draft weighs proposals on {{count}} criterion.',
  'sourcing.rfp.toast.saved.other':
    'The draft weighs proposals on {{count}} criteria.',
  'sourcing.rfp.toast.saveFailed.title':
    'Criteria not saved',
  'sourcing.rfp.toast.saveFailed.default':
    'The request could not be completed. Nothing was changed.',
  'sourcing.refusal.criteriaWeightsNot100':
    'Not saved. The weights sum to {{sum}}%, not 100%. Change the weights until they sum to 100%.',
  'sourcing.refusal.criteriaNoRfpStage':
    'Not saved. This event starts at its RFQ stage and has no RFP stage, so no proposal is ever weighed. Raise the event at RFI or RFP to set criteria.',
  'sourcing.refusal.criteriaMalformed':
    'Not saved. One of the criteria is incomplete: each needs a name and a weight above 0. Correct it and save again.',
  'sourcing.rfp.proposals.title':
    'Proposals',
  'sourcing.rfp.proposals.empty':
    'No supplier has submitted a proposal at the RFP stage yet.',
  'sourcing.rfp.proposals.notYet':
    'Proposals are submitted at the RFP stage, which this event has not reached.',
  'sourcing.rfp.proposals.noResponse':
    'No response',
  'sourcing.rfp.proposals.noDocuments':
    'No documents named.',
  'sourcing.rfp.proposals.documents':
    'Documents named:',
  'sourcing.rfp.proposals.documentsNote':
    'names only; no file is kept by this portal.',
  'sourcing.rfp.score.title':
    'Your scores',
  'sourcing.rfp.score.yoursNew':
    'Scoring as {{person, stop}}. Give each criterion a score from 1 to 5.',
  'sourcing.rfp.score.yoursSaved':
    'Scoring as {{person, stop}}. Your scores are saved; saving again replaces them, and only them.',
  'sourcing.rfp.score.pick':
    'Score',
  'sourcing.rfp.score.comment':
    'Comment',
  'sourcing.rfp.score.commentFor':
    'Comment for {{criterion}}',
  'sourcing.rfp.score.incomplete':
    'Score every criterion to save. A sheet is saved whole.',
  'sourcing.rfp.score.save':
    'Save my scores',
  'sourcing.rfp.score.toast.saved.title':
    'Scores saved for {{supplier}}',
  'sourcing.rfp.score.toast.saved.desc':
    'Only your own scores were written. They can be changed until the event advances.',
  'sourcing.rfp.score.toast.failed.title':
    'Scores not saved',
  'sourcing.rfp.score.locked':
    'Scores were locked when the event advanced on {{date, stop}}.',
  'sourcing.rfp.score.notYetRfp':
    'Proposals are scored at the RFP stage.',
  'sourcing.rfp.score.stillOpen':
    'Scoring opens once bidding on this stage is closed, so no proposal is scored while others are still arriving.',
  'sourcing.rfp.score.ended':
    'This event has ended. Its scores are as they stood.',
  'sourcing.rfp.score.unnamed':
    'A score is kept against the evaluator who gave it, and this seat names nobody. Adopt a sample user on the identity panel to score.',
  'sourcing.refusal.scoreEvaluatorUnattributed':
    'Not saved. A score is kept against the evaluator who gave it, and this seat names nobody. Adopt a sample user on the identity panel, then score again.',
  'sourcing.refusal.scoresLocked':
    'Not saved. The event has advanced from its RFP stage; the scores are what that shortlist was chosen on and are locked.',
  'sourcing.refusal.scoreStageNotRfp':
    'Not saved. Proposals are scored at the RFP stage, once bidding on it is closed.',
  'sourcing.refusal.scoreNoProposal':
    'Not saved. This supplier submitted no proposal at the RFP stage. Only a submitted proposal is scored.',
  'sourcing.refusal.scoreSheetInvalid':
    'Not saved. A score sheet gives every criterion one whole score from 1 to 5.',
  'sourcing.rfp.ranking.title':
    'Ranking',
  'sourcing.rfp.ranking.empty':
    'No proposal to rank yet.',
  'sourcing.rfp.ranking.rank':
    'Rank',
  'sourcing.rfp.ranking.total':
    'Weighted total',
  'sourcing.rfp.ranking.unranked':
    '—',
  'sourcing.rfp.ranking.notScored':
    'Not scored yet',
  'sourcing.rfp.ranking.evaluators.one':
    '{{count}} evaluator',
  'sourcing.rfp.ranking.evaluators.other':
    '{{count}} evaluators',
  'sourcing.rfp.ranking.note':
    'Each cell is the average of the scores given, from 1 to 5. The weighted total is the average of each evaluator’s weighted total. The ranking informs the shortlist; it does not decide it. Suppliers see none of it.',
  'sourcing.rfp.ranking.scoredBy':
    'Scored by: {{people}}',
  'sourcing.advance.rank.note':
    'The shortlist can start from the ranking. Either button below ticks suppliers for you; every supplier that responded stays tickable, and nothing is committed until you advance.',
  'sourcing.advance.rank.top':
    'How many from the top',
  'sourcing.advance.rank.topApply':
    'Tick the top ranked',
  'sourcing.advance.rank.min':
    'Weighted total at or above',
  'sourcing.advance.rank.minApply':
    'Tick those at or above',
  'sourcing.advance.rank.line':
    'Rank {{rank}} · {{total}}',
  'sourcing.advance.rank.unscored':
    'Not scored',
  'sourcing.rfi.title':
    'RFI questionnaire',
  'sourcing.rfi.none':
    'This draft asks no questionnaire. Published like this, suppliers record their interest and a note at the RFI stage.',
  'sourcing.rfi.write':
    'Write questionnaire',
  'sourcing.rfi.edit':
    'Edit questionnaire',
  'sourcing.rfi.type.yes_no':
    'Yes / No',
  'sourcing.rfi.type.single_choice':
    'Single choice',
  'sourcing.rfi.type.multi_choice':
    'Multiple choice',
  'sourcing.rfi.type.number':
    'Number with unit',
  'sourcing.rfi.type.text':
    'Text',
  'sourcing.rfi.type.document':
    'Document requested',
  'sourcing.rfi.required':
    'Required',
  'sourcing.rfi.optional':
    'Optional',
  'sourcing.rfi.yes':
    'Yes',
  'sourcing.rfi.no':
    'No',
  'sourcing.rfi.knockoutIs':
    'Knock-out answer: {{answer}}',
  'sourcing.rfi.editor.prompt':
    'Question',
  'sourcing.rfi.editor.type':
    'Answer type',
  'sourcing.rfi.editor.unit':
    'Unit',
  'sourcing.rfi.editor.options':
    'Choices (one per line)',
  'sourcing.rfi.editor.knockout':
    'Knock-out answer',
  'sourcing.rfi.editor.knockoutNone':
    'None — this question knocks nobody out',
  'sourcing.rfi.editor.required':
    'Required',
  'sourcing.rfi.editor.requiredByKnockout':
    '(a question with a knock-out answer is always required)',
  'sourcing.rfi.editor.add':
    'Add question',
  'sourcing.rfi.editor.save':
    'Save questionnaire',
  'sourcing.rfi.editor.cancel':
    'Cancel',
  'sourcing.rfi.editor.empty':
    'No questions yet. Add one, or load a template.',
  'sourcing.rfi.editor.moveUp':
    'Move {{question}} up',
  'sourcing.rfi.editor.moveDown':
    'Move {{question}} down',
  'sourcing.rfi.editor.remove':
    'Remove {{question}}',
  'sourcing.rfi.problem.NOT_A_LIST':
    'The questionnaire could not be read.',
  'sourcing.rfi.problem.ID_MISSING':
    '{{question}} has no identifier. Remove it and add it again.',
  'sourcing.rfi.problem.ID_DUPLICATE':
    '{{question}} shares its identifier with an earlier question. Remove it and add it again.',
  'sourcing.rfi.problem.PROMPT_MISSING':
    '{{question}} has no wording yet.',
  'sourcing.rfi.problem.TYPE_UNKNOWN':
    '{{question}} has no answer type.',
  'sourcing.rfi.problem.OPTIONS_TOO_FEW':
    '{{question}} needs at least two different choices.',
  'sourcing.rfi.problem.UNIT_MISSING':
    '{{question}} needs the unit the number is asked in.',
  'sourcing.rfi.problem.KNOCKOUT_NOT_TAKEN':
    '{{question}}: a knock-out answer is taken on a Yes / No or a choice question only.',
  'sourcing.rfi.problem.KNOCKOUT_NOT_AN_ANSWER':
    '{{question}}: its knock-out answer is no longer one of its choices.',
  'sourcing.rfi.problem.KNOCKOUT_NOT_REQUIRED':
    '{{question}} has a knock-out answer, so it must be required.',
  'sourcing.rfi.toast.saved.title':
    'Questionnaire saved on {{rfqNumber}}',
  'sourcing.rfi.toast.saved.none':
    'The draft now asks no questionnaire.',
  'sourcing.rfi.toast.saved.one':
    '{{count}} question. Suppliers answer it once the event is published.',
  'sourcing.rfi.toast.saved.other':
    '{{count}} questions. Suppliers answer them once the event is published.',
  'sourcing.rfi.toast.saveFailed.title':
    'Questionnaire not saved',
  'sourcing.rfi.toast.saveFailed.default':
    'The request could not be completed. Nothing was changed.',
  'sourcing.refusal.questionnaireStageNotRfi':
    'This event does not start at RFI, so it has no stage that asks a questionnaire.',
  'sourcing.refusal.questionnaireMalformed':
    'The questionnaire is not complete: one of its questions is missing its wording, its choices or its unit. Nothing was saved.',
  'sourcing.rfi.template.title':
    'Templates',
  'sourcing.rfi.template.local':
    'Templates are kept in this browser only. They are not governed, not shared with colleagues and not recorded in the audit trail.',
  'sourcing.rfi.template.pick':
    'Saved templates',
  'sourcing.rfi.template.choose':
    'Choose a template',
  'sourcing.rfi.template.noneSaved':
    'No template saved yet',
  'sourcing.rfi.template.load':
    'Load into editor',
  'sourcing.rfi.template.remove':
    'Delete template',
  'sourcing.rfi.template.name':
    'Save these questions as',
  'sourcing.rfi.template.save':
    'Save as template',
  'sourcing.rfi.template.unreadable':
    'The saved templates could not be read from this browser.',
  'sourcing.rfi.template.rejected':
    'Some saved entries ({{count}}) were not valid questionnaires and are not listed.',
  'sourcing.rfi.template.toast.saved':
    'Template “{{name}}” saved',
  'sourcing.rfi.template.toast.failed':
    'Template not saved',
  'sourcing.rfi.template.refused.NAME_MISSING':
    'Give the template a name.',
  'sourcing.rfi.template.refused.NO_QUESTIONS':
    'There are no questions to save.',
  'sourcing.rfi.template.refused.MALFORMED':
    'Complete the questions first.',
  'sourcing.rfi.template.refused.NOT_STORED':
    'This browser would not store the template.',
  'sourcing.rfi.matrix.title':
    'Answers',
  'sourcing.rfi.matrix.supplier':
    'Supplier',
  'sourcing.rfi.matrix.empty':
    'No supplier has submitted answers yet.',
  'sourcing.rfi.matrix.knockoutIs':
    'Knock-out: {{answer}}',
  'sourcing.rfi.matrix.passed':
    'Passed every knock-out',
  'sourcing.rfi.matrix.failed':
    'Failed a knock-out: {{questions}}',
  'sourcing.rfi.matrix.knockedOut':
    'Knock-out answer',
  'sourcing.rfi.matrix.noAnswer':
    'Not answered',
  'sourcing.rfi.matrix.note':
    'A knock-out answer removes nobody by itself: you choose the shortlist when you advance the event, where the suppliers who passed every knock-out are pre-selected.',
  'sourcing.rfi.matrix.noteNoKnockout':
    'This questionnaire has no knock-out question. You choose the shortlist when you advance the event.',
  'sourcing.advance.preselected':
    'Pre-selected: the suppliers who passed every knock-out. The list is yours — tick or untick any supplier who answered.',
  'sourcing.advance.failedKnockout':
    'Failed a knock-out: {{questions}}',
  'sourcing.interest.count':
    '{{responded}} of {{total}} invited suppliers have responded at the {{stage}} stage',
  'sourcing.interest.empty':
    'No supplier has responded yet.',
  'sourcing.interest.noNote':
    'No note.',
  'sourcing.cmp.emptyBeforeRfq':
    'Quotations are taken at the RFQ stage. This event has not reached it.',
  'sourcing.publish.deadlinePast':
    'Cannot be published: the response deadline ({{date}}) has passed. Cancel this draft and raise the event again.',
  'sourcing.publish.deadlineMissing':
    'Cannot be published: this draft states no response deadline. Cancel it and raise the event again.',
  'sourcing.advance.submit':
    'Advance to {{stage}}',
  'sourcing.advance.needsClose':
    'Close bidding to advance to {{stage}}',
  'sourcing.advance.intro':
    'Advance {{rfqNumber}} from the {{from}} stage to the {{to}} stage. The suppliers you tick are invited to the next stage; the others are told they were not shortlisted, with your reason.',
  'sourcing.advance.shortlist':
    'Shortlist',
  'sourcing.advance.didNotRespond':
    'did not respond at {{stage}}',
  'sourcing.advance.reason':
    'Reason for the suppliers left out',
  'sourcing.advance.leftOut.none':
    'Every invited supplier is carried forward, so no reason is needed.',
  'sourcing.advance.leftOut.some':
    'They read this reason. Not carried: {{names}}',
  'sourcing.advance.responseDeadline':
    '{{stage}} response deadline',
  'sourcing.advance.awardDeadline':
    'Award deadline (optional)',
  'sourcing.advance.blocked.noResponders':
    'No supplier has responded at the {{stage}} stage, so nobody can be shortlisted. Conclude the event without an award instead.',
  'sourcing.advance.blocked.empty':
    'Tick at least one supplier.',
  'sourcing.advance.blocked.underFloor':
    'The next stage needs at least two eligible suppliers. Tick another supplier that responded, reopen the stage so more invited suppliers can respond, or conclude the event without an award.',
  'sourcing.advance.blocked.reasonMissing':
    'State the reason for the suppliers left out.',
  'sourcing.advance.blocked.deadlineMissing':
    'Set the response deadline of the next stage.',
  'sourcing.advance.blocked.deadlinePast':
    'The response deadline has already passed. Choose a date from today onwards.',
  'sourcing.advance.yes.one':
    'Advance to {{stage}} with 1 supplier',
  'sourcing.advance.yes.other':
    'Advance to {{stage}} with {{count}} suppliers',
  'sourcing.advance.no':
    'Not now',
  'sourcing.conclude.submit':
    'Conclude without award',
  'sourcing.conclude.ask.none':
    'Conclude {{rfqNumber}} without an award? This cannot be undone. Its suppliers read that the event ended with nobody chosen.',
  'sourcing.conclude.ask.one':
    'Conclude {{rfqNumber}} without an award? This cannot be undone: the 1 quotation on it is withdrawn and its supplier reads that nobody was chosen.',
  'sourcing.conclude.ask.other':
    'Conclude {{rfqNumber}} without an award? This cannot be undone: the {{count}} quotations on it are withdrawn and their suppliers read that nobody was chosen.',
  'sourcing.conclude.reason':
    'Reason',
  'sourcing.conclude.reasonNote':
    'Kept on the event. Suppliers are told it ended without an award; they do not read this reason.',
  'sourcing.conclude.ask.yes':
    'Yes, conclude without award',
  'sourcing.conclude.ask.no':
    'Keep the event',
  'sourcing.concluded.title':
    'Concluded without an award',
  'sourcing.concluded.date':
    'Concluded on',
  'sourcing.concluded.stage':
    'At stage',
  'sourcing.concluded.reason':
    'Reason',
  'sourcing.toast.advanced.title':
    '{{rfqNumber}} is now at {{stage}}',
  'sourcing.toast.advanced.desc.one':
    '1 supplier is invited to the next stage.',
  'sourcing.toast.advanced.desc.other':
    '{{count}} suppliers are invited to the next stage.',
  'sourcing.toast.advanceFailed.title':
    'Not advanced',
  'sourcing.toast.advanceFailed.default':
    'The event could not be advanced. Nothing was recorded.',
  'sourcing.toast.advanceFailed.dispatch':
    'The advance could not be sent. Nothing was recorded.',
  'sourcing.toast.concluded.title':
    '{{rfqNumber}} concluded without an award',
  'sourcing.toast.concluded.desc':
    'The reason is kept on the event.',
  'sourcing.toast.concludeFailed.title':
    'Not concluded',
  'sourcing.toast.concludeFailed.default':
    'The event could not be concluded. Nothing was recorded.',
  'sourcing.toast.concludeFailed.dispatch':
    'The act could not be sent. Nothing was recorded.',
  'sourcing.refusal.stageUnknown':
    'Not created. The start stage is not one of RFI, RFP or RFQ.',
  'sourcing.refusal.publishDeadlinePast':
    'Not published. The response deadline of this draft has already passed, so no supplier could answer it. Cancel the draft and raise the event again with a later deadline.',
  'sourcing.refusal.awardStageNotRfq':
    'Not awarded. An award is made at the RFQ stage, and this event has not reached it. Advance it with a shortlist, or conclude it without an award.',
  'sourcing.refusal.stageIsFinal':
    'Not advanced. RFQ is the last stage: the event ends in an award, or is concluded without one.',
  'sourcing.refusal.shortlistEmpty':
    'Not advanced. The shortlist names no supplier. An event with nobody to carry forward is concluded without an award.',
  'sourcing.refusal.shortlistNotResponder':
    'Not advanced. A supplier on the shortlist did not respond at this stage. Only a supplier that responded is shortlisted.',
  'sourcing.refusal.shortlistUnderFloor':
    'Not advanced. The next stage needs at least two eligible suppliers, and the shortlist has fewer. Shortlist another supplier that responded, reopen the stage so more invited suppliers can respond, or conclude the event without an award. A supplier that was never invited is invited on a new event.',
  'sourcing.refusal.shortlistReasonMissing':
    'Not advanced. The shortlist leaves a supplier out and no reason is stated. The reason is what that supplier reads.',
  'sourcing.refusal.stageDeadlinePast':
    'Not advanced. The response deadline of the next stage has already passed. Choose a date from today onwards.',
  'sourcing.refusal.concludeReasonMissing':
    'Not concluded. State why the event ends without an award.',
  // — Lifecycle actions (cancel / reopen) —
  'sourcing.lifecycle.actions': 'Lifecycle actions',
  'sourcing.publish.submit': 'Publish RFQ',
  'sourcing.publish.submitting': 'Publishing…',
  'sourcing.cancel.submit': 'Cancel RFQ',
  'sourcing.cancel.submitting': 'Cancelling…',
  'sourcing.reopen.submit': 'Reopen RFQ',
  'sourcing.reopen.submitting': 'Reopening…',
  // The five `sourcing.footer.*` labels were deleted with the handler-less
  // side-panel button that rendered them. Four named acts this tree has no
  // verb for; the fifth duplicated the live Award control in the same panel.
  // — Lifecycle timeline —
  'sourcing.timeline.drafted': 'RFQ Drafted',
  'sourcing.timeline.sentTo.one': 'Sent to {{count}} supplier',
  'sourcing.timeline.sentTo.other': 'Sent to {{count}} suppliers',
  'sourcing.timeline.responses': 'Responses Received ({{responded}}/{{total}})',
  'sourcing.timeline.latest': 'Latest: {{date}}',
  'sourcing.timeline.evaluation': 'Evaluation',
  'sourcing.timeline.awarded': 'Awarded',
  'sourcing.timeline.closed': 'Closed',
  // — Wizard: chrome —
  // PF-1a — IT DOES NOT SEND. Creation births a Draft (D-1); publishing is a
  // second, deliberate act, and the label said otherwise.
  'sourcing.wizard.complete': 'Save RFQ draft',
  'sourcing.wizard.step.scope.title': 'Define Scope',
  'sourcing.wizard.step.scope.short': 'Scope',
  'sourcing.wizard.step.scope.desc': 'What are you sourcing and how much?',
  'sourcing.wizard.step.suppliers.title': 'Invite Suppliers',
  'sourcing.wizard.step.suppliers.short': 'Suppliers',
  'sourcing.wizard.step.suppliers.desc': 'Pick suppliers to request quotes from.',
  'sourcing.wizard.step.terms.title': 'Terms & Deadlines',
  'sourcing.wizard.step.terms.short': 'Terms',
  'sourcing.wizard.step.terms.desc': 'When are responses due and on what commercial terms?',
  'sourcing.wizard.step.review.title': 'Review & Submit',
  'sourcing.wizard.step.review.short': 'Review',
  // PF-1a — the draft is not sent here; publishing is what sends it.
  'sourcing.wizard.step.review.desc': 'Check the details before saving the draft.',
  // — Wizard: scope —
  // C.2 — the requisition entrance. "Raised from", never "created by": the
  // requisition is where the requirement came from, the buyer in the wizard is
  // who is creating this RFQ.
  'sourcing.wizard.field.sourceRequisition': 'Raise from requisition',
  'sourcing.wizard.sourceRequisition.placeholder': 'Not from a requisition',
  'sourcing.wizard.sourceRequisition.help':
    'Optional. Choosing an approved requisition fills in what it can and moves it to Sourcing Event when this RFQ is raised.',
  'sourcing.wizard.sourceRequisition.none':
    'No approved requisition is waiting. A sourcing event can be raised from an approved requisition; you can also raise this RFQ on its own.',
  'sourcing.wizard.field.title': 'RFQ title',
  'sourcing.wizard.placeholder.title': 'e.g. Q3 2026 Fragrance Sourcing — Floral Compounds',
  'sourcing.wizard.field.category': 'Material category',
  'sourcing.wizard.select.category': 'Select a category…',
  'sourcing.wizard.field.budget': 'Estimated budget (IDR)',
  'sourcing.wizard.placeholder.budget': 'Optional',
  'sourcing.wizard.field.materials': 'Specific material(s)',
  'sourcing.wizard.materials.selectFirst': 'Select a category first to see available materials.',
  // ⚠️ SAID WHILE THE DRAFT IS STILL EDITABLE. A code-less material puts
  // nothing on `materialIds`, and the buyer is the only one who can still
  // change that — no verb edits an RFQ's materials after creation.
  'sourcing.wizard.materials.noMasterCode':
    'Not in the material master: {{materials, stop}}. The event will go ahead and will require competitive bidding — a preferred-supplier exemption cannot be checked without a master code.',
  // ── R8 · THE WIZARD'S MATERIAL-REQUEST OFFER ───────────────────────────────
  //
  // ⚠️ **IT IS OFFERED WHERE THE GAP IS DISCOVERED AND DISPATCHED AFTER THE RFQ
  // EXISTS.** Marking is wizard-local state — a half-filled intent is not a fact
  // about the world, which is the no-`Draft` ruling applied to an offer — and the
  // request is sent in `createMutation`'s `onSuccess`, where `result.entityId` is
  // a real RFQ id the target can RESOLVE rather than echo.
  //
  // ⚠️ **AND EVERY STRING HERE SAYS THE EVENT IS UNCHANGED**, because a request
  // can never make a code-less pick resolve: `codesOfKeys` is a filter and no
  // verb edits an RFQ's materials after creation.
  'sourcing.wizard.materials.requestOffer': 'Ask for these to be created in the material master',
  'sourcing.wizard.materials.requestOffer.marked':
    'A material request will be raised for: {{materials, stop}}. This does not change the event — the RFQ goes ahead and will still require competitive bidding.',
  'sourcing.wizard.materials.requestOffer.undo': 'Do not raise a request',
  'sourcing.wizard.materials.requestNeed': 'Why these are needed (for master data)',
  'sourcing.wizard.materials.requestNeed.hint':
    'Master data decides whether these already exist under another name. This is what they read.',
  // ⚠️ THE FAILURE PATH, NAMED. If `t_rfq_create` refuses, the marked request
  // NEVER DISPATCHES and nothing was recorded — so the buyer must not be told a
  // request exists. This string is what the surface says instead, and it points
  // at the door that still works.
  'sourcing.toast.requestNotRaised.title': 'No material request was raised',
  'sourcing.toast.requestNotRaised.desc':
    'The sourcing event was not created, so nothing was recorded. You can raise the request on its own from Material requests.',
  // The request went through but the RFQ had already been created, so the event
  // stands and only the request failed. Both facts, in that order.
  'sourcing.toast.requestFailed.title': '{{rfqNumber}} raised — material request was not',
  'sourcing.toast.requestFailed.desc':
    'The event is live and unchanged. Nothing was recorded for the material request; raise it from Material requests.',
  // ⚠️ NO REQUEST NUMBER HERE, AND THAT IS THE PRECEDENT RATHER THAN A GAP.
  // The `MR-2026-…` number is minted inside the store and `CommandResult`
  // carries only `entityId`, so naming it would mean either a refetch that has
  // not landed at this instant or a SECOND COPY of `numberFor` on the surface —
  // a number computed on a screen, which is the exact defect deleted from
  // `/register`. Browser QA caught the first draft rendering the internal id
  // ("request mr-0003"). `applications.toast.raised.title` names the company
  // rather than the number for the same reason; this names the event.
  'sourcing.toast.requestRaised.title': '{{rfqNumber}} raised — material request recorded',
  'sourcing.toast.requestRaised.desc':
    'Master data will review it under Material requests. The material does not exist yet, and the event is unchanged.',
  // ── R8 · THE RFQ DETAIL LINE ───────────────────────────────────────────────
  'sourcing.detail.materialRequest.pending':
    'A material request is pending for: {{materials, stop}}. This event is unchanged and will still require competitive bidding.',
  'sourcing.detail.materialRequest.decided':
    'A material request for {{materials}} was decided ({{status}}). This event is unchanged either way — an RFQ’s materials cannot be edited after it is created.',
  'sourcing.wizard.field.totalQty': 'Total quantity',
  // 2e-b-4a — was "0". A placeholder must never model a value the field treats
  // specially: this one modelled the exact number a blank must NOT become.
  'sourcing.wizard.placeholder.qty': 'e.g. 2400',
  'sourcing.wizard.field.uom': 'UoM',
  // — Wizard: the numeric refusals (CP-0 · W1 · 2e-b-4a) —
  'sourcing.wizard.qty.refused.empty':
    'Enter the total quantity you are sourcing — suppliers quote a unit price against it, so an RFQ without it cannot be answered.',
  'sourcing.wizard.qty.refused.notNumeric':
    'That is not a quantity — type digits only, e.g. 2400.',
  'sourcing.wizard.qty.refused.ambiguous':
    'This can be read two ways — "2.400" means two thousand four hundred in Indonesian and two-point-four in English. Type it without separators: 2400.',
  'sourcing.wizard.budget.refused.notNumeric':
    'That is not an amount — type digits only, e.g. 850000000, or leave it blank if the budget is not set.',
  'sourcing.wizard.budget.refused.ambiguous':
    'This can be read two ways — "1.500" means one thousand five hundred in Indonesian and one-point-five in English. Type it without separators: 1500.',
  // — Wizard: suppliers —
  'sourcing.wizard.ai.title': 'AI recommendation',
  'sourcing.wizard.ai.basis': '· Based on category, tier, and OTIF',
  'sourcing.wizard.supplierMeta': '{{country}} · OTIF {{otif}}% · Grade {{grade}}',
  'sourcing.wizard.search.supplier': 'Search suppliers by name or country…',
  'sourcing.wizard.col.supplier': 'Supplier',
  'sourcing.wizard.col.country': 'Country',
  'sourcing.wizard.col.otif': 'OTIF',
  'sourcing.wizard.supplier.noMatch': 'No suppliers match the current search.',
  'sourcing.wizard.supplier.selectCategory': 'Select a category in step 1.',
  'sourcing.wizard.selectedCount.one': '{{count}} supplier selected',
  'sourcing.wizard.selectedCount.other': '{{count}} suppliers selected',
  // — Wizard: terms —
  'sourcing.wizard.field.responseDeadline': 'Response deadline',
  'sourcing.wizard.field.awardDeadline': 'Award deadline',
  'sourcing.wizard.awardAfterResponse': 'Award deadline must be after response deadline.',
  'sourcing.wizard.field.incoterms': 'Incoterms',
  'sourcing.wizard.field.paymentTerms': 'Payment terms',
  'sourcing.wizard.field.currency': 'Currency',
  // — Wizard: review —
  'sourcing.wizard.review.section.scope': 'Scope',
  'sourcing.wizard.review.section.suppliers': 'Suppliers',
  'sourcing.wizard.review.section.terms': 'Terms & Deadlines',
  'sourcing.wizard.review.edit': 'Edit',
  'sourcing.wizard.review.row.sourceRequisition': 'Raised from',
  'sourcing.wizard.review.row.notCarried': 'Not carried over',
  'sourcing.wizard.review.notCarried.category': 'category',
  'sourcing.wizard.review.notCarried.uom': 'unit',
  'sourcing.wizard.review.row.title': 'Title',
  'sourcing.wizard.review.row.category': 'Category',
  'sourcing.wizard.review.row.materials': 'Materials',
  'sourcing.wizard.review.row.quantity': 'Quantity',
  'sourcing.wizard.review.row.budget': 'Budget',
  'sourcing.wizard.review.budgetUnspecified': 'Not specified',
  'sourcing.wizard.review.row.invited': 'Invited',
  'sourcing.wizard.review.row.names': 'Names',
  'sourcing.wizard.review.row.responseDeadline': 'Response deadline',
  'sourcing.wizard.review.row.awardDeadline': 'Award deadline',
  'sourcing.wizard.review.row.incoterms': 'Incoterms',
  'sourcing.wizard.review.row.paymentTerms': 'Payment terms',
  'sourcing.wizard.review.row.currency': 'Currency',
  'sourcing.wizard.review.invited.one': '{{count}} supplier',
  'sourcing.wizard.review.invited.other': '{{count}} suppliers',
  // — Toasts —
  'sourcing.toast.awardFailed.title': 'Award failed',
  'sourcing.toast.awardFailed.default': 'The award could not be completed.',
  'sourcing.toast.awardFailed.dispatch': 'The award could not be dispatched.',
  'sourcing.toast.awarded.title': '{{rfqNumber}} awarded',
  'sourcing.toast.awarded.desc': '{{supplier}} awarded — other quotations rejected.',
  'sourcing.toast.awarded.fallbackSupplier': 'Selected supplier',
  'sourcing.toast.reviewed.title': 'Quote moved to review',
  'sourcing.toast.reviewed.desc': 'The quotation is now under evaluation.',
  'sourcing.toast.reviewFailed.title': 'Review failed',
  'sourcing.toast.reviewFailed.default': 'The quote could not be moved to review.',
  'sourcing.toast.cancelled.title': '{{rfqNumber}} cancelled',
  'sourcing.toast.cancelled.desc': 'The sourcing event was cancelled.',
  'sourcing.toast.closed.title': '{{rfqNumber}} closed to new quotations',
  'sourcing.toast.closed.desc': 'Bidding is closed. Award on the quotations received, reopen, or cancel.',
  // RFx-1 — at RFI and RFP there is no quotation and no award to make.
  'sourcing.toast.closed.titleStage': '{{rfqNumber}} closed to new responses',
  'sourcing.toast.closed.descStage':
    'The {{stage}} stage is closed. Advance with a shortlist, reopen, or conclude without an award.',
  'sourcing.toast.closeFailed.title': 'Close failed',
  'sourcing.toast.closeFailed.default': 'Bidding could not be closed.',
  'sourcing.toast.closeFailed.dispatch': 'The close could not be dispatched.',
  'sourcing.toast.cancelFailed.title': 'Cancel failed',
  'sourcing.toast.cancelFailed.default': 'The RFQ could not be cancelled.',
  'sourcing.toast.cancelFailed.dispatch': 'The cancel could not be dispatched.',
  'sourcing.toast.reopened.title': '{{rfqNumber}} reopened',
  'sourcing.toast.reopened.desc': 'The sourcing event is open for responses again.',
  'sourcing.toast.reopenFailed.title': 'Reopen failed',
  'sourcing.toast.reopenFailed.default': 'The RFQ could not be reopened.',
  'sourcing.toast.reopenFailed.dispatch': 'The reopen could not be dispatched.',
  'sourcing.toast.created.title': '{{rfqNumber}} saved as a draft',
  'sourcing.toast.created.desc.one':
    'Not sent yet — publish to open it to {{count}} invited supplier',
  'sourcing.toast.created.desc.other':
    'Not sent yet — publish to open it to {{count}} invited suppliers',
  'sourcing.toast.published.title': '{{rfqNumber}} published',
  'sourcing.toast.published.desc.one': 'Now open to {{count}} invited supplier.',
  'sourcing.toast.published.desc.other': 'Now open to {{count}} invited suppliers.',
  'sourcing.toast.publishFailed.title': 'Publish failed',
  'sourcing.toast.publishFailed.default': 'The RFQ could not be published.',
  'sourcing.toast.publishFailed.dispatch': 'The publish could not be dispatched.',
  'sourcing.toast.createFailed.title': 'Create failed',
  'sourcing.toast.createFailed.default': 'The RFQ could not be created.',
  'sourcing.toast.createFailed.dispatch': 'The RFQ could not be dispatched.',
  'sourcing.toast.numberRefused.title': 'RFQ not created — check the numbers',
  // — Empty state (wrapper) —
  'sourcing.state.empty.title': 'No sourcing events yet',
  'sourcing.state.empty.subtitle': 'No RFQs are on file.',
  'sourcing.state.empty.message': 'Sourcing events and quote evaluations appear here once RFQs are raised.',
  'sourcing.toast.exportUnavailable.title': 'Export not available yet',
  'sourcing.toast.templatesUnavailable.title': 'Event templates not available yet',
  'sourcing.toast.exportUnavailable.desc':
    'No file was generated — export is not wired to a real system.',
  'sourcing.toast.templatesUnavailable.desc':
    'No event template was opened. Saving a whole sourcing event as a template is not built. Questionnaire templates are kept on the RFI questionnaire editor.',
};

export const sourcingId: Record<string, string> = {
  // — Breadcrumb —
  'sourcing.crumb.sourcing': 'ACARA SUMBER',
  // — Page header —
  'sourcing.header.title': 'Acara sumber',
  'sourcing.header.subtitle': 'RFI · RFP · RFQ',
  // — Header actions —
  'sourcing.action.export': 'Ekspor',
  'sourcing.action.templates': 'Templat acara',
  'sourcing.action.newRfq': 'Acara sumber baru',
  // — Meta line —
  'sourcing.meta.summary.one': '{{count}} RFQ aktif · terakhir diperbarui {{date}}',
  'sourcing.meta.summary.other': '{{count}} RFQ aktif · terakhir diperbarui {{date}}',
  // — KPI cards —
  'sourcing.kpi.active.eyebrow': 'Acara aktif',
  'sourcing.kpi.byStage': 'RFI {{RFI}} · RFP {{RFP}} · RFQ {{RFQ}}',
  'sourcing.kpi.active.subtitle': 'Terbuka untuk respons',
  'sourcing.kpi.awaiting.eyebrow': 'Menunggu Respons',
  'sourcing.kpi.awaiting.subtitle': 'Tenggat dalam 7 hari',
  'sourcing.kpi.ready.eyebrow': 'Siap Dimenangkan',
  'sourcing.kpi.ready.subtitle': 'Pada tahap RFQ, semua pemasok merespons',
  'sourcing.kpi.awarded.eyebrow': 'Dimenangkan (Kuartal)',
  'sourcing.kpi.awarded.subtitle': '90 hari terakhir',
  // — Group tabs —
  'sourcing.tab.all': 'Semua',
  'sourcing.tab.open': 'Terbuka',
  'sourcing.tab.pending': 'Menunggu Pemenangan',
  'sourcing.tab.awarded': 'Dimenangkan',
  'sourcing.tab.closed': 'Ditutup',
  'sourcing.tab.concluded': 'Diakhiri',
  // — Filter / search —
  'sourcing.filter.byCategory': 'Saring menurut kategori',
  'sourcing.filter.byStage': 'Saring menurut tahap',
  'sourcing.search.placeholder': 'Cari berdasarkan nomor RFQ, judul, atau material…',
  // — Category labels —
  'sourcing.category.fragrance': 'Pewangi',
  'sourcing.category.activeIngredients': 'Bahan Aktif',
  'sourcing.category.packaging': 'Kemasan',
  'sourcing.category.emulsifiers': 'Pengemulsi',
  'sourcing.category.botanical': 'Botani',
  'sourcing.category.other': 'Lainnya',
  // — Active table —
  'sourcing.table.col.rfq': 'No. RFQ',
  'sourcing.table.col.category': 'Kategori',
  'sourcing.table.col.stage': 'Tahap',
  'sourcing.table.col.responses': 'Respons',
  'sourcing.table.col.qty': 'Jml',
  'sourcing.table.col.estValue': 'Nilai Est.',
  'sourcing.table.col.responseDeadline': 'Tenggat respons',
  'sourcing.table.col.status': 'Status',
  'sourcing.table.col.actions': 'Tindakan',
  'sourcing.table.empty': 'Tidak ada RFQ yang cocok dengan filter saat ini.',
  // — Deadline compact labels —
  'sourcing.deadline.overdue': '{{count}}h terlambat',
  'sourcing.deadline.dueToday': 'Jatuh tempo hari ini',
  'sourcing.deadline.remaining': '{{count}}h tersisa',
  // — Awards history —
  'sourcing.awards.title': 'Riwayat Pemenangan',
  'sourcing.awards.count.one': '{{count}} RFQ dimenangkan',
  'sourcing.awards.count.other': '{{count}} RFQ dimenangkan',
  'sourcing.awards.col.rfq': 'No. RFQ',
  'sourcing.awards.col.title': 'Judul',
  'sourcing.awards.col.supplier': 'Pemasok pemenang',
  'sourcing.awards.col.date': 'Tanggal pemenangan',
  'sourcing.awards.col.value': 'Nilai pemenangan',
  'sourcing.awards.col.actions': 'Tindakan',
  'sourcing.awards.empty': 'Belum ada RFQ yang dimenangkan.',
  // — Side panel —
  'sourcing.panel.title': 'RFQ {{number}} — {{title}}',
  'sourcing.panel.exportComparison': 'Ekspor perbandingan',
  'sourcing.panel.awardSummary': 'Ringkasan pemenangan',
  'sourcing.panel.awardedTo': 'Dimenangkan oleh',
  'sourcing.panel.awardedValue': 'Nilai yang dimenangkan',
  'sourcing.panel.awardDate': 'Tanggal pemenangan',
  'sourcing.panel.poIssued': 'PO diterbitkan',
  'sourcing.panel.summary': 'Ringkasan',
  'sourcing.panel.field.category': 'Kategori',
  'sourcing.panel.field.status': 'Status',
  'sourcing.panel.field.created': 'Dibuat',
  'sourcing.panel.field.responseDeadline': 'Tenggat respons',
  'sourcing.panel.field.awardDeadline': 'Tenggat pemenangan',
  'sourcing.panel.field.totalQty': 'Total jml',
  'sourcing.panel.field.estValue': 'Nilai est.',
  'sourcing.panel.field.currency': 'Mata uang',
  'sourcing.panel.field.incoterms': 'Incoterms',
  'sourcing.panel.field.paymentTerms': 'Syarat pembayaran',
  'sourcing.panel.lifecycle': 'Siklus hidup',
  // — Quote comparison —
  'sourcing.cmp.title.one': 'Perbandingan penawaran ({{count}} penawaran)',
  'sourcing.cmp.title.other': 'Perbandingan penawaran ({{count}} penawaran)',
  'sourcing.cmp.empty': 'Belum ada penawaran diterima.',
  'sourcing.cmp.criterion': 'Kriteria',
  'sourcing.cmp.topRanked': 'Peringkat teratas',
  'sourcing.cmp.fx.refused.FX_UNPINNED':
    'Tidak diperingkat — penawaran dihargai dalam {{currencies}} dan belum ada kurs yang dicatat untuk RFQ ini. Catat kurs untuk membandingkannya; penawaran di bawah ditampilkan sesuai yang diajukan.',
  'sourcing.cmp.fx.refused.FX_STALE':
    'Tidak diperingkat — kurs tercatat untuk {{currencies}} (per {{asOf}}) lebih lama daripada yang diizinkan perbandingan ini. Catat kurs terkini; kurs sebelumnya tetap tersimpan pada RFQ.',
  // — 2e-c-4 · dasar kurs yang tercatat —
  'sourcing.cmp.fx.basis.title': 'Dasar kurs',
  'sourcing.cmp.fx.basis.asOf': 'per {{date}}',
  'sourcing.cmp.fx.basis.none': 'Belum ada kurs tercatat',
  'sourcing.cmp.fx.basis.source.MANUAL': 'Dimasukkan manual',
  'sourcing.cmp.fx.basis.source.SAP_EXHGRATE': 'Kurs SAP',
  'sourcing.cmp.fx.basis.superseded.one': '{{count}} kurs sebelumnya disimpan',
  'sourcing.cmp.fx.basis.superseded.other': '{{count}} kurs sebelumnya disimpan',
  'sourcing.cmp.fx.basis.record': 'Catat kurs {{currency}}',
  'sourcing.cmp.fx.basis.supersede': 'Ganti kurs {{currency}}',
  // — dialog pencatatan kurs —
  'sourcing.fx.dialog.title.record': 'Catat kurs {{currency}}',
  'sourcing.fx.dialog.title.supersede': 'Ganti kurs {{currency}}',
  'sourcing.fx.dialog.body.record':
    'Kurs ini yang dipakai Paragon untuk membandingkan penawaran {{currency, stop}}. Kurs dicatat pada RFQ dan disimpan bersama keputusan pemenangan.',
  'sourcing.fx.dialog.body.supersede':
    'Ini mencatat kurs {{currency}} BARU. Kurs yang ada tidak diubah atau dihapus — kurs lama tetap tersimpan pada RFQ, sehingga dasar yang dipakai setiap perbandingan sebelumnya tetap tercatat.',
  'sourcing.fx.dialog.prior': 'Yang berlaku saat ini:',
  'sourcing.fx.dialog.rate': 'Kurs — {{base}} per 1 {{currency}}',
  'sourcing.fx.dialog.rateHint': 'Angka saja — tanpa pemisah ribuan (mis. 17250)',
  'sourcing.fx.dialog.asOf': 'Tanggal kurs',
  'sourcing.fx.dialog.asOfHint':
    'Tanggal kurs ini berlaku. Perbandingan menolak memberi peringkat pada kurs yang lebih lama dari {{days}} hari.',
  'sourcing.fx.dialog.source': 'Sumber',
  'sourcing.fx.dialog.rateType': 'Jenis kurs SAP (opsional)',
  'sourcing.fx.dialog.cancel': 'Batal',
  'sourcing.fx.dialog.confirm.record': 'Catat kurs',
  'sourcing.fx.dialog.confirm.supersede': 'Catat kurs baru',
  'sourcing.fx.dialog.submitting': 'Mencatat…',
  // — penolakan kurs / tanggal —
  'sourcing.fx.refused.EMPTY_QTY': 'Masukkan kurs — kolom kosong bukan kurs.',
  'sourcing.fx.refused.NOT_NUMERIC': 'Itu bukan kurs — ketik angka saja, mis. 17250.',
  'sourcing.fx.refused.AMBIGUOUS_QTY':
    'Ini bisa dibaca dua cara — "17.250" berarti tujuh belas ribu dua ratus lima puluh dalam bahasa Indonesia dan tujuh belas koma dua lima dalam bahasa Inggris. Ketik tanpa pemisah: 17250.',
  'sourcing.fx.refused.ZERO_RATE':
    'Nol bukan kurs. Kurs nol membuat setiap penawaran mata uang asing bernilai nihil.',
  'sourcing.fx.refused.EMPTY_VINTAGE': 'Isi tanggal kurs ini berlaku.',
  'sourcing.fx.refused.UNREADABLE_VINTAGE': 'Tanggal itu tidak terbaca.',
  'sourcing.fx.refused.FUTURE_VINTAGE':
    'Kurs tidak bisa berlaku di masa depan. Masukkan tanggal kurs itu berlaku.',
  // — toast —
  'sourcing.toast.exportComparison.title': 'Ekspor perbandingan belum tersedia',
  'sourcing.toast.exportComparison.desc':
    'Tidak ada berkas yang dibuat — ekspor perbandingan penawaran belum tersambung ke sistem nyata.',
  'sourcing.toast.fxPinned.title': 'Kurs {{currency}} tercatat',
  'sourcing.toast.fxPinned.desc': 'Perbandingan kini diperingkat berdasarkan kurs itu.',
  'sourcing.toast.fxSuperseded.title': 'Kurs {{currency}} baru tercatat',
  'sourcing.toast.fxSuperseded.desc':
    'Kurs sebelumnya tetap tersimpan pada RFQ; perbandingan kini memakai kurs baru.',
  'sourcing.toast.fxPinFailed.title': 'Kurs tidak tercatat',
  'sourcing.toast.fxPinFailed.default': 'Silakan coba lagi.',
  'sourcing.cmp.simulated': 'Simulasi',
  'sourcing.cmp.simulatedTitle': 'Latihan — menunggu sumber langsung (data kepatuhan & keandalan)',
  'sourcing.cmp.row.unitPrice': 'Harga Satuan',
  'sourcing.cmp.row.totalPrice': 'Harga Total',
  'sourcing.cmp.row.leadTime': 'Waktu Tunggu',
  'sourcing.cmp.estimated': 'Perkiraan',
  'sourcing.cmp.estimatedTitle':
    'Bersifat indikatif pada tahap penawaran — pemasok mengonfirmasi tanggal pengiriman pasti saat PO. Tetap dinilai dan diperingkat.',
  'sourcing.cmp.row.moq': 'Kuantitas Pesanan Min.',
  'sourcing.cmp.moqNone': 'Tidak ada minimum',
  'sourcing.cmp.row.paymentTerms': 'Syarat Pembayaran',
  'sourcing.cmp.row.validUntil': 'Berlaku hingga',
  'sourcing.cmp.row.sample': 'Batch sampel',
  'sourcing.cmp.row.sampleLead': 'Waktu tunggu sampel',
  'sourcing.cmp.row.notes': 'Catatan pemasok',
  'sourcing.cmp.row.attachment': 'Dokumen penawaran',
  'sourcing.cmp.notStated': 'Tidak dinyatakan',
  'sourcing.cmp.sample.yes': 'Dapat menyediakan',
  'sourcing.cmp.sample.no': 'Tidak dapat menyediakan',
  'sourcing.cmp.attachment.none': 'Tidak ada lampiran',
  'sourcing.cmp.attachment.nameOnly': 'Nama saja',
  'sourcing.cmp.attachment.nameOnlyTitle':
    'Pemasok melampirkan dokumen dan namanya tercatat. Portal ini tidak menyimpan berkasnya; mintalah kepada pemasok.',
  'sourcing.cmp.row.compliance': 'Kepatuhan',
  'sourcing.cmp.row.priceScore': 'Skor Harga',
  'sourcing.cmp.row.leadTimeScore': 'Skor Waktu Tunggu',
  'sourcing.cmp.row.reliability': 'Keandalan',
  'sourcing.cmp.row.composite': 'Komposit',
  'sourcing.cmp.row.result': 'Hasil',
  'sourcing.cmp.row.status': 'Status',
  'sourcing.cmp.row.select': 'Pilih',
  'sourcing.cmp.leadTimeDays': '{{count}} hari',
  'sourcing.cmp.award': 'Menangkan',
  'sourcing.cmp.moveToReview': 'Pindahkan ke tinjauan',
  // — Selisih should-cost vs penawaran CI-2 (hanya-baca, MODELED × SIMULASI) —
  'sourcing.cmp.row.spread': 'vs Should-Cost',
  'sourcing.cmp.spread.range': '{{low}} hingga {{high}}',
  'sourcing.cmp.spread.vsModel': 'vs model ~{{value}}/kg',
  'sourcing.cmp.model': 'Model',
  'sourcing.cmp.modelTitle': 'Should-cost termodelkan — rujukan terhitung, bukan harga teramati; permanen terlepas dari keaktifan umpan',
  'sourcing.cmp.fx': 'Konversi FX',
  'sourcing.cmp.fxTitle': 'Should-cost dikonversi lewat FX spot ke mata uang penawaran — lebih termodelkan daripada perbandingan satu mata uang (tanpa FX)',
  'sourcing.cmp.spread.silent.currency-unsupported': 'Tanpa rujukan should-cost — ditawarkan dalam mata uang yang tidak dihargai model',
  'sourcing.cmp.spread.silent.tail': 'Tanpa rujukan should-cost — material ekor (hanya dari penawaran pemasok)',
  'sourcing.cmp.spread.silent.unit-mismatch': 'Tanpa rujukan should-cost — dihargai per unit, bukan per berat',
  'sourcing.cmp.spread.silent.unmapped': 'Tanpa rujukan should-cost — material belum dipetakan ke basket',
  // — Award action panel —
  'sourcing.award.title': 'Tindakan pemenangan',
  'sourcing.award.selected': 'Dipilih: {{name}}',
  'sourcing.award.selectPrompt': 'Pilih penawaran di atas untuk mengaktifkan tindakan pemenangan.',
  'sourcing.award.submit': 'Menangkan yang dipilih',
  'sourcing.award.unanswered':
    '{{responded}} dari {{total}} pemasok yang diundang telah menjawab. Anda dapat menetapkan pemenang dari penawaran yang diterima.',
  'sourcing.award.fxBlocked':
    'Acara ini belum dapat dimenangkan: penawaran dihargai dalam {{currencies}} dan belum ada kurs yang dicatat. Catat kurs di atas, lalu tetapkan pemenang.',
  'sourcing.award.ask.none':
    'Menangkan {{rfqNumber}} untuk {{name}} senilai {{value}}? Ini tidak dapat diurungkan. Tidak ada penawaran lain yang diterima pada acara ini.',
  'sourcing.award.ask.one':
    'Menangkan {{rfqNumber}} untuk {{name}} senilai {{value}}? Ini tidak dapat diurungkan: penawaran lainnya ditolak dan pemasoknya diberi tahu.',
  'sourcing.award.ask.other':
    'Menangkan {{rfqNumber}} untuk {{name}} senilai {{value}}? Ini tidak dapat diurungkan: {{count}} penawaran lainnya ditolak dan pemasoknya diberi tahu.',
  'sourcing.award.ask.yes': 'Ya, menangkan',
  'sourcing.award.ask.no': 'Belum',
  'sourcing.cancel.ask.none':
    'Batalkan {{rfqNumber}}? Ini tidak dapat diurungkan. Belum ada penawaran yang diterima.',
  'sourcing.cancel.ask.one':
    'Batalkan {{rfqNumber}}? Ini tidak dapat diurungkan: 1 penawaran di dalamnya ditarik dan pemasoknya membaca bahwa acara dibatalkan.',
  'sourcing.cancel.ask.other':
    'Batalkan {{rfqNumber}}? Ini tidak dapat diurungkan: {{count}} penawaran di dalamnya ditarik dan pemasoknya membaca bahwa acara dibatalkan.',
  'sourcing.cancel.ask.yes': 'Ya, batalkan acara',
  'sourcing.cancel.ask.no': 'Pertahankan acara',
  'sourcing.close.submit': 'Tutup penawaran',
  'sourcing.close.submitting': 'Menutup…',
  'sourcing.unattributed.note':
    'Menerbitkan, melanjutkan, mengakhiri, membatalkan, dan menetapkan pemenang dicatat atas nama seseorang, dan kursi ini tidak memilikinya. Pilih pengguna contoh di panel identitas terlebih dahulu.',
  'sourcing.refusal.actorUnattributed':
    'Tidak ada yang dicatat. Menerbitkan, melanjutkan, mengakhiri, membatalkan, atau menetapkan pemenang acara sumber dicatat atas nama orang yang memutuskannya, dan kursi ini tidak memilikinya. Pilih pengguna contoh di panel identitas, lalu ulangi tindakan.',
  'sourcing.refusal.awardFxUnpinned':
    'Tidak dimenangkan. Penawaran pada acara ini dihargai dalam mata uang asing dan belum ada kurs yang dicatat. Catat kurs pada perbandingan, lalu tetapkan pemenang.',
  // — RFx-1 · acara bertahap —
  'sourcing.stage.title':
    'Tahap',
  'sourcing.stage.name.RFI':
    'Permintaan informasi',
  'sourcing.stage.name.RFP':
    'Permintaan proposal',
  'sourcing.stage.name.RFQ':
    'Permintaan penawaran harga',
  'sourcing.stage.left':
    'Dilanjutkan pada',
  'sourcing.stage.state.done':
    'Selesai',
  'sourcing.stage.state.current':
    'Tahap saat ini',
  'sourcing.stage.state.upcoming':
    'Belum dimulai',
  'sourcing.stage.outcome.Awarded':
    'Dimenangkan pada tahap {{stage}}',
  'sourcing.stage.outcome.Concluded':
    'Diakhiri tanpa pemenang pada tahap {{stage}}',
  'sourcing.stage.outcome.Cancelled':
    'Dibatalkan pada tahap {{stage}}',
  'sourcing.stage.advanceLine':
    '{{from}} ke {{to}} — dilanjutkan: {{names}}',
  'sourcing.stage.notCarriedLine':
    'Tidak dilanjutkan: {{names}} — alasan yang diberikan: “{{reason}}”',
  'sourcing.wizard.field.stage':
    'Mulai dari tahap',
  'sourcing.wizard.stage.RFI':
    'Tanyakan siapa yang berminat dan mampu. Berakhir dengan daftar pendek.',
  'sourcing.wizard.stage.RFP':
    'Tanyakan kepada daftar pendek cara mereka mengerjakannya. Berakhir dengan daftar pendek.',
  'sourcing.wizard.stage.RFQ':
    'Minta harga. Berakhir dengan penetapan pemenang.',
  'sourcing.wizard.deadlinePast':
    'Tanggal ini sudah lewat. Acara yang melewati tenggat tanggapannya tidak dapat diterbitkan.',
  'sourcing.wizard.review.row.stage':
    'Tahap awal',
  'sourcing.interest.title':
    'Tanggapan pada RFI dan RFP',
  'sourcing.interest.contentNote':
    'Pada tahap RFI, pemasok menjawab kuesioner acaranya — atau, bila acaranya tidak mengajukan kuesioner, mencatat minatnya dan satu catatan. Pada tahap RFP ia mengirim proposal atas kriteria evaluasi acaranya — atau, bila acaranya tidak menetapkan kriteria, mencatat minatnya dan satu catatan.',
  // — RFx-2 · the RFI questionnaire —
  'sourcing.wizard.stage.questionnaireHint':
    'Kuesioner ditulis pada draf, setelah formulir ini dan sebelum Anda menerbitkannya: buka drafnya lalu gunakan “Tulis kuesioner”.',
  // — RFx-3 · the RFP: criteria, proposals, scores —
  'sourcing.wizard.stage.criteriaHint':
    'Kriteria evaluasi RFP dan bobotnya ditetapkan pada draf, setelah formulir ini dan sebelum Anda menerbitkan: buka draf dan gunakan “Tetapkan kriteria”.',
  'sourcing.rfp.title':
    'Kriteria evaluasi RFP',
  'sourcing.rfp.none':
    'Draf ini tidak menetapkan kriteria evaluasi. Bila diterbitkan seperti ini, pemasok mencatat minat dan satu catatan pada tahap RFP, dan tidak ada yang dinilai.',
  'sourcing.rfp.write':
    'Tetapkan kriteria',
  'sourcing.rfp.edit':
    'Ubah kriteria',
  'sourcing.rfp.group.technical':
    'Teknis',
  'sourcing.rfp.group.commercial':
    'Komersial',
  'sourcing.rfp.editor.empty':
    'Belum ada kriteria. Tambahkan yang pertama, atau simpan daftar kosong untuk tidak menetapkan apa pun.',
  'sourcing.rfp.editor.name':
    'Kriteria',
  'sourcing.rfp.editor.weight':
    'Bobot (%)',
  'sourcing.rfp.editor.group':
    'Bagian',
  'sourcing.rfp.editor.groupNone':
    'Bukan keduanya',
  'sourcing.rfp.editor.required':
    'Tanggapan wajib diisi',
  'sourcing.rfp.editor.add':
    'Tambah kriteria',
  'sourcing.rfp.editor.save':
    'Simpan kriteria',
  'sourcing.rfp.editor.cancel':
    'Batal',
  'sourcing.rfp.editor.moveUp':
    'Naikkan {{criterion}}',
  'sourcing.rfp.editor.moveDown':
    'Turunkan {{criterion}}',
  'sourcing.rfp.editor.remove':
    'Hapus {{criterion}}',
  'sourcing.rfp.editor.sumWhole':
    'Jumlah bobot {{sum}}%.',
  'sourcing.rfp.editor.sumNot':
    'Jumlah bobot {{sum}}%, dan harus berjumlah 100%.',
  'sourcing.rfp.problem.NOT_A_LIST':
    'Kriteria tidak dapat dibaca sebagai daftar.',
  'sourcing.rfp.problem.ID_MISSING':
    '{{criterion}} tidak memiliki id.',
  'sourcing.rfp.problem.ID_DUPLICATE':
    '{{criterion}} mengulang id kriteria sebelumnya.',
  'sourcing.rfp.problem.NAME_MISSING':
    '{{criterion}} tidak memiliki nama.',
  'sourcing.rfp.problem.WEIGHT_INVALID':
    '{{criterion}} memerlukan bobot di atas 0 dan paling banyak 100, dengan paling banyak dua desimal.',
  'sourcing.rfp.problem.GROUP_UNKNOWN':
    '{{criterion}} berada di bagian yang bukan teknis atau komersial.',
  'sourcing.rfp.toast.saved.title':
    'Kriteria disimpan pada {{rfqNumber}}',
  'sourcing.rfp.toast.saved.none':
    'Draf ini kini tidak menetapkan kriteria.',
  'sourcing.rfp.toast.saved.one':
    'Draf ini menimbang proposal atas {{count}} kriteria.',
  'sourcing.rfp.toast.saved.other':
    'Draf ini menimbang proposal atas {{count}} kriteria.',
  'sourcing.rfp.toast.saveFailed.title':
    'Kriteria tidak disimpan',
  'sourcing.rfp.toast.saveFailed.default':
    'Permintaan tidak dapat diselesaikan. Tidak ada yang diubah.',
  'sourcing.refusal.criteriaWeightsNot100':
    'Tidak disimpan. Jumlah bobot {{sum}}%, bukan 100%. Ubah bobot sampai berjumlah 100%.',
  'sourcing.refusal.criteriaNoRfpStage':
    'Tidak disimpan. Acara ini dimulai pada tahap RFQ dan tidak memiliki tahap RFP, sehingga tidak ada proposal yang ditimbang. Buat acara pada tahap RFI atau RFP untuk menetapkan kriteria.',
  'sourcing.refusal.criteriaMalformed':
    'Tidak disimpan. Salah satu kriteria belum lengkap: masing-masing memerlukan nama dan bobot di atas 0. Perbaiki lalu simpan lagi.',
  'sourcing.rfp.proposals.title':
    'Proposal',
  'sourcing.rfp.proposals.empty':
    'Belum ada pemasok yang mengirim proposal pada tahap RFP.',
  'sourcing.rfp.proposals.notYet':
    'Proposal dikirim pada tahap RFP, yang belum dicapai acara ini.',
  'sourcing.rfp.proposals.noResponse':
    'Tidak ada tanggapan',
  'sourcing.rfp.proposals.noDocuments':
    'Tidak ada dokumen yang disebut.',
  'sourcing.rfp.proposals.documents':
    'Dokumen yang disebut:',
  'sourcing.rfp.proposals.documentsNote':
    'hanya nama; tidak ada berkas yang disimpan portal ini.',
  'sourcing.rfp.score.title':
    'Skor Anda',
  'sourcing.rfp.score.yoursNew':
    'Menilai sebagai {{person, stop}}. Beri setiap kriteria skor dari 1 sampai 5.',
  'sourcing.rfp.score.yoursSaved':
    'Menilai sebagai {{person, stop}}. Skor Anda tersimpan; menyimpan lagi menggantinya, dan hanya skor Anda.',
  'sourcing.rfp.score.pick':
    'Skor',
  'sourcing.rfp.score.comment':
    'Komentar',
  'sourcing.rfp.score.commentFor':
    'Komentar untuk {{criterion}}',
  'sourcing.rfp.score.incomplete':
    'Beri skor pada setiap kriteria untuk menyimpan. Lembar skor disimpan utuh.',
  'sourcing.rfp.score.save':
    'Simpan skor saya',
  'sourcing.rfp.score.toast.saved.title':
    'Skor disimpan untuk {{supplier}}',
  'sourcing.rfp.score.toast.saved.desc':
    'Hanya skor Anda sendiri yang ditulis. Skor dapat diubah sampai acara dilanjutkan.',
  'sourcing.rfp.score.toast.failed.title':
    'Skor tidak disimpan',
  'sourcing.rfp.score.locked':
    'Skor dikunci saat acara dilanjutkan pada {{date, stop}}.',
  'sourcing.rfp.score.notYetRfp':
    'Proposal dinilai pada tahap RFP.',
  'sourcing.rfp.score.stillOpen':
    'Penilaian dibuka setelah penawaran pada tahap ini ditutup, agar tidak ada proposal yang dinilai selagi yang lain masih masuk.',
  'sourcing.rfp.score.ended':
    'Acara ini telah berakhir. Skornya tetap seperti adanya.',
  'sourcing.rfp.score.unnamed':
    'Skor dicatat atas nama penilai yang memberikannya, dan kursi ini tidak menyebut siapa pun. Pilih pengguna contoh di panel identitas untuk menilai.',
  'sourcing.refusal.scoreEvaluatorUnattributed':
    'Tidak disimpan. Skor dicatat atas nama penilai yang memberikannya, dan kursi ini tidak menyebut siapa pun. Pilih pengguna contoh di panel identitas, lalu nilai lagi.',
  'sourcing.refusal.scoresLocked':
    'Tidak disimpan. Acara telah dilanjutkan dari tahap RFP; skor itulah dasar daftar pendeknya dan kini terkunci.',
  'sourcing.refusal.scoreStageNotRfp':
    'Tidak disimpan. Proposal dinilai pada tahap RFP, setelah penawaran pada tahap itu ditutup.',
  'sourcing.refusal.scoreNoProposal':
    'Tidak disimpan. Pemasok ini tidak mengirim proposal pada tahap RFP. Hanya proposal yang dikirim yang dinilai.',
  'sourcing.refusal.scoreSheetInvalid':
    'Tidak disimpan. Lembar skor memberi setiap kriteria satu skor bulat dari 1 sampai 5.',
  'sourcing.rfp.ranking.title':
    'Peringkat',
  'sourcing.rfp.ranking.empty':
    'Belum ada proposal untuk diperingkat.',
  'sourcing.rfp.ranking.rank':
    'Peringkat',
  'sourcing.rfp.ranking.total':
    'Total tertimbang',
  'sourcing.rfp.ranking.unranked':
    '—',
  'sourcing.rfp.ranking.notScored':
    'Belum dinilai',
  'sourcing.rfp.ranking.evaluators.one':
    '{{count}} penilai',
  'sourcing.rfp.ranking.evaluators.other':
    '{{count}} penilai',
  'sourcing.rfp.ranking.note':
    'Setiap sel adalah rata-rata skor yang diberikan, dari 1 sampai 5. Total tertimbang adalah rata-rata total tertimbang tiap penilai. Peringkat menjadi masukan bagi daftar pendek; bukan penentunya. Pemasok tidak melihat satu pun dari ini.',
  'sourcing.rfp.ranking.scoredBy':
    'Dinilai oleh: {{people}}',
  'sourcing.advance.rank.note':
    'Daftar pendek dapat dimulai dari peringkat. Kedua tombol di bawah mencentang pemasok untuk Anda; setiap pemasok yang menanggapi tetap dapat dicentang, dan tidak ada yang ditetapkan sampai Anda melanjutkan.',
  'sourcing.advance.rank.top':
    'Berapa banyak dari atas',
  'sourcing.advance.rank.topApply':
    'Centang peringkat teratas',
  'sourcing.advance.rank.min':
    'Total tertimbang minimal',
  'sourcing.advance.rank.minApply':
    'Centang yang memenuhi minimal',
  'sourcing.advance.rank.line':
    'Peringkat {{rank}} · {{total}}',
  'sourcing.advance.rank.unscored':
    'Belum dinilai',
  'sourcing.rfi.title':
    'Kuesioner RFI',
  'sourcing.rfi.none':
    'Draf ini tidak mengajukan kuesioner. Bila diterbitkan seperti ini, pemasok mencatat minat dan satu catatan pada tahap RFI.',
  'sourcing.rfi.write':
    'Tulis kuesioner',
  'sourcing.rfi.edit':
    'Ubah kuesioner',
  'sourcing.rfi.type.yes_no':
    'Ya / Tidak',
  'sourcing.rfi.type.single_choice':
    'Pilihan tunggal',
  'sourcing.rfi.type.multi_choice':
    'Pilihan ganda',
  'sourcing.rfi.type.number':
    'Angka dengan satuan',
  'sourcing.rfi.type.text':
    'Teks',
  'sourcing.rfi.type.document':
    'Dokumen diminta',
  'sourcing.rfi.required':
    'Wajib',
  'sourcing.rfi.optional':
    'Opsional',
  'sourcing.rfi.yes':
    'Ya',
  'sourcing.rfi.no':
    'Tidak',
  'sourcing.rfi.knockoutIs':
    'Jawaban gugur: {{answer}}',
  'sourcing.rfi.editor.prompt':
    'Pertanyaan',
  'sourcing.rfi.editor.type':
    'Jenis jawaban',
  'sourcing.rfi.editor.unit':
    'Satuan',
  'sourcing.rfi.editor.options':
    'Pilihan (satu per baris)',
  'sourcing.rfi.editor.knockout':
    'Jawaban gugur',
  'sourcing.rfi.editor.knockoutNone':
    'Tidak ada — pertanyaan ini tidak menggugurkan siapa pun',
  'sourcing.rfi.editor.required':
    'Wajib',
  'sourcing.rfi.editor.requiredByKnockout':
    '(pertanyaan dengan jawaban gugur selalu wajib)',
  'sourcing.rfi.editor.add':
    'Tambah pertanyaan',
  'sourcing.rfi.editor.save':
    'Simpan kuesioner',
  'sourcing.rfi.editor.cancel':
    'Batal',
  'sourcing.rfi.editor.empty':
    'Belum ada pertanyaan. Tambahkan satu, atau muat templat.',
  'sourcing.rfi.editor.moveUp':
    'Naikkan {{question}}',
  'sourcing.rfi.editor.moveDown':
    'Turunkan {{question}}',
  'sourcing.rfi.editor.remove':
    'Hapus {{question}}',
  'sourcing.rfi.problem.NOT_A_LIST':
    'Kuesioner tidak dapat dibaca.',
  'sourcing.rfi.problem.ID_MISSING':
    '{{question}} tidak memiliki pengenal. Hapus lalu tambahkan lagi.',
  'sourcing.rfi.problem.ID_DUPLICATE':
    '{{question}} memakai pengenal yang sama dengan pertanyaan sebelumnya. Hapus lalu tambahkan lagi.',
  'sourcing.rfi.problem.PROMPT_MISSING':
    '{{question}} belum memiliki kalimat pertanyaan.',
  'sourcing.rfi.problem.TYPE_UNKNOWN':
    '{{question}} belum memiliki jenis jawaban.',
  'sourcing.rfi.problem.OPTIONS_TOO_FEW':
    '{{question}} memerlukan sedikitnya dua pilihan yang berbeda.',
  'sourcing.rfi.problem.UNIT_MISSING':
    '{{question}} memerlukan satuan untuk angkanya.',
  'sourcing.rfi.problem.KNOCKOUT_NOT_TAKEN':
    '{{question}}: jawaban gugur hanya berlaku pada pertanyaan Ya / Tidak atau pertanyaan pilihan.',
  'sourcing.rfi.problem.KNOCKOUT_NOT_AN_ANSWER':
    '{{question}}: jawaban gugurnya tidak lagi termasuk pilihannya.',
  'sourcing.rfi.problem.KNOCKOUT_NOT_REQUIRED':
    '{{question}} memiliki jawaban gugur, sehingga harus wajib.',
  'sourcing.rfi.toast.saved.title':
    'Kuesioner disimpan pada {{rfqNumber}}',
  'sourcing.rfi.toast.saved.none':
    'Draf ini sekarang tidak mengajukan kuesioner.',
  'sourcing.rfi.toast.saved.one':
    '{{count}} pertanyaan. Pemasok menjawabnya setelah acara diterbitkan.',
  'sourcing.rfi.toast.saved.other':
    '{{count}} pertanyaan. Pemasok menjawabnya setelah acara diterbitkan.',
  'sourcing.rfi.toast.saveFailed.title':
    'Kuesioner tidak tersimpan',
  'sourcing.rfi.toast.saveFailed.default':
    'Permintaan tidak dapat diselesaikan. Tidak ada yang berubah.',
  'sourcing.refusal.questionnaireStageNotRfi':
    'Acara ini tidak dimulai pada tahap RFI, sehingga tidak memiliki tahap yang mengajukan kuesioner.',
  'sourcing.refusal.questionnaireMalformed':
    'Kuesioner belum lengkap: salah satu pertanyaannya belum memiliki kalimat, pilihan, atau satuannya. Tidak ada yang disimpan.',
  'sourcing.rfi.template.title':
    'Templat',
  'sourcing.rfi.template.local':
    'Templat hanya disimpan di peramban ini. Templat tidak diatur, tidak dibagikan kepada rekan kerja, dan tidak tercatat dalam jejak audit.',
  'sourcing.rfi.template.pick':
    'Templat tersimpan',
  'sourcing.rfi.template.choose':
    'Pilih templat',
  'sourcing.rfi.template.noneSaved':
    'Belum ada templat tersimpan',
  'sourcing.rfi.template.load':
    'Muat ke penyunting',
  'sourcing.rfi.template.remove':
    'Hapus templat',
  'sourcing.rfi.template.name':
    'Simpan pertanyaan ini sebagai',
  'sourcing.rfi.template.save':
    'Simpan sebagai templat',
  'sourcing.rfi.template.unreadable':
    'Templat tersimpan tidak dapat dibaca dari peramban ini.',
  'sourcing.rfi.template.rejected':
    'Sebagian entri tersimpan ({{count}}) bukan kuesioner yang sah dan tidak ditampilkan.',
  'sourcing.rfi.template.toast.saved':
    'Templat “{{name}}” disimpan',
  'sourcing.rfi.template.toast.failed':
    'Templat tidak tersimpan',
  'sourcing.rfi.template.refused.NAME_MISSING':
    'Beri nama templatnya.',
  'sourcing.rfi.template.refused.NO_QUESTIONS':
    'Tidak ada pertanyaan untuk disimpan.',
  'sourcing.rfi.template.refused.MALFORMED':
    'Lengkapi dulu pertanyaannya.',
  'sourcing.rfi.template.refused.NOT_STORED':
    'Peramban ini tidak dapat menyimpan templat.',
  'sourcing.rfi.matrix.title':
    'Jawaban',
  'sourcing.rfi.matrix.supplier':
    'Pemasok',
  'sourcing.rfi.matrix.empty':
    'Belum ada pemasok yang mengirimkan jawaban.',
  'sourcing.rfi.matrix.knockoutIs':
    'Gugur: {{answer}}',
  'sourcing.rfi.matrix.passed':
    'Lolos semua pertanyaan gugur',
  'sourcing.rfi.matrix.failed':
    'Gagal pada pertanyaan gugur: {{questions}}',
  'sourcing.rfi.matrix.knockedOut':
    'Jawaban gugur',
  'sourcing.rfi.matrix.noAnswer':
    'Tidak dijawab',
  'sourcing.rfi.matrix.note':
    'Jawaban gugur tidak menyingkirkan siapa pun dengan sendirinya: Anda memilih daftar pendek saat melanjutkan acara, dan di sana pemasok yang lolos semua pertanyaan gugur sudah terpilih lebih dulu.',
  'sourcing.rfi.matrix.noteNoKnockout':
    'Kuesioner ini tidak memiliki pertanyaan gugur. Anda memilih daftar pendek saat melanjutkan acara.',
  'sourcing.advance.preselected':
    'Terpilih lebih dulu: pemasok yang lolos semua pertanyaan gugur. Daftarnya milik Anda — centang atau hapus centang pemasok mana pun yang menjawab.',
  'sourcing.advance.failedKnockout':
    'Gagal pada pertanyaan gugur: {{questions}}',
  'sourcing.interest.count':
    '{{responded}} dari {{total}} pemasok yang diundang telah menanggapi pada tahap {{stage}}',
  'sourcing.interest.empty':
    'Belum ada pemasok yang menanggapi.',
  'sourcing.interest.noNote':
    'Tanpa catatan.',
  'sourcing.cmp.emptyBeforeRfq':
    'Penawaran diterima pada tahap RFQ. Acara ini belum sampai ke sana.',
  'sourcing.publish.deadlinePast':
    'Tidak dapat diterbitkan: tenggat tanggapan ({{date}}) sudah lewat. Batalkan draf ini dan buat acaranya lagi.',
  'sourcing.publish.deadlineMissing':
    'Tidak dapat diterbitkan: draf ini tidak menyebut tenggat tanggapan. Batalkan dan buat acaranya lagi.',
  'sourcing.advance.submit':
    'Lanjutkan ke {{stage}}',
  'sourcing.advance.needsClose':
    'Tutup penawaran untuk melanjutkan ke {{stage}}',
  'sourcing.advance.intro':
    'Lanjutkan {{rfqNumber}} dari tahap {{from}} ke tahap {{to}}: pemasok yang Anda centang diundang ke tahap berikutnya; yang lain diberi tahu bahwa mereka tidak masuk daftar pendek, beserta alasan Anda.',
  'sourcing.advance.shortlist':
    'Daftar pendek',
  'sourcing.advance.didNotRespond':
    'tidak menanggapi pada {{stage}}',
  'sourcing.advance.reason':
    'Alasan untuk pemasok yang tidak dilanjutkan',
  'sourcing.advance.leftOut.none':
    'Semua pemasok yang diundang dilanjutkan, sehingga alasan tidak diperlukan.',
  'sourcing.advance.leftOut.some':
    'Mereka membaca alasan ini. Tidak dilanjutkan: {{names}}',
  'sourcing.advance.responseDeadline':
    'Tenggat tanggapan {{stage}}',
  'sourcing.advance.awardDeadline':
    'Tenggat pemenangan (opsional)',
  'sourcing.advance.blocked.noResponders':
    'Belum ada pemasok yang menanggapi pada tahap {{stage}}, sehingga tidak ada yang dapat masuk daftar pendek. Akhiri acara tanpa pemenang.',
  'sourcing.advance.blocked.empty':
    'Centang setidaknya satu pemasok.',
  'sourcing.advance.blocked.underFloor':
    'Tahap berikutnya memerlukan setidaknya dua pemasok yang memenuhi syarat. Centang pemasok lain yang menanggapi, buka kembali tahap ini agar lebih banyak pemasok yang diundang dapat menanggapi, atau akhiri acara tanpa pemenang.',
  'sourcing.advance.blocked.reasonMissing':
    'Sebutkan alasan untuk pemasok yang tidak dilanjutkan.',
  'sourcing.advance.blocked.deadlineMissing':
    'Tetapkan tenggat tanggapan tahap berikutnya.',
  'sourcing.advance.blocked.deadlinePast':
    'Tenggat tanggapan sudah lewat. Pilih tanggal mulai hari ini.',
  'sourcing.advance.yes.one':
    'Lanjutkan ke {{stage}} dengan 1 pemasok',
  'sourcing.advance.yes.other':
    'Lanjutkan ke {{stage}} dengan {{count}} pemasok',
  'sourcing.advance.no':
    'Nanti saja',
  'sourcing.conclude.submit':
    'Akhiri tanpa pemenang',
  'sourcing.conclude.ask.none':
    'Akhiri {{rfqNumber}} tanpa pemenang? Ini tidak dapat diurungkan. Pemasoknya membaca bahwa acara berakhir tanpa ada yang dipilih.',
  'sourcing.conclude.ask.one':
    'Akhiri {{rfqNumber}} tanpa pemenang? Ini tidak dapat diurungkan: 1 penawaran di dalamnya ditarik dan pemasoknya membaca bahwa tidak ada yang dipilih.',
  'sourcing.conclude.ask.other':
    'Akhiri {{rfqNumber}} tanpa pemenang? Ini tidak dapat diurungkan: {{count}} penawaran di dalamnya ditarik dan pemasoknya membaca bahwa tidak ada yang dipilih.',
  'sourcing.conclude.reason':
    'Alasan',
  'sourcing.conclude.reasonNote':
    'Disimpan pada acara. Pemasok diberi tahu bahwa acara berakhir tanpa pemenang; mereka tidak membaca alasan ini.',
  'sourcing.conclude.ask.yes':
    'Ya, akhiri tanpa pemenang',
  'sourcing.conclude.ask.no':
    'Pertahankan acara',
  'sourcing.concluded.title':
    'Diakhiri tanpa pemenang',
  'sourcing.concluded.date':
    'Diakhiri pada',
  'sourcing.concluded.stage':
    'Pada tahap',
  'sourcing.concluded.reason':
    'Alasan',
  'sourcing.toast.advanced.title':
    '{{rfqNumber}} kini pada tahap {{stage}}',
  'sourcing.toast.advanced.desc.one':
    '1 pemasok diundang ke tahap berikutnya.',
  'sourcing.toast.advanced.desc.other':
    '{{count}} pemasok diundang ke tahap berikutnya.',
  'sourcing.toast.advanceFailed.title':
    'Tidak dilanjutkan',
  'sourcing.toast.advanceFailed.default':
    'Acara tidak dapat dilanjutkan. Tidak ada yang dicatat.',
  'sourcing.toast.advanceFailed.dispatch':
    'Tindakan tidak dapat dikirim. Tidak ada yang dicatat.',
  'sourcing.toast.concluded.title':
    '{{rfqNumber}} diakhiri tanpa pemenang',
  'sourcing.toast.concluded.desc':
    'Alasannya disimpan pada acara.',
  'sourcing.toast.concludeFailed.title':
    'Tidak diakhiri',
  'sourcing.toast.concludeFailed.default':
    'Acara tidak dapat diakhiri. Tidak ada yang dicatat.',
  'sourcing.toast.concludeFailed.dispatch':
    'Tindakan tidak dapat dikirim. Tidak ada yang dicatat.',
  'sourcing.refusal.stageUnknown':
    'Tidak dibuat. Tahap awal bukan salah satu dari RFI, RFP, atau RFQ.',
  'sourcing.refusal.publishDeadlinePast':
    'Tidak diterbitkan. Tenggat tanggapan draf ini sudah lewat, sehingga tidak ada pemasok yang dapat menjawabnya. Batalkan draf dan buat acaranya lagi dengan tenggat yang lebih lambat.',
  'sourcing.refusal.awardStageNotRfq':
    'Tidak dimenangkan. Pemenang ditetapkan pada tahap RFQ, dan acara ini belum sampai ke sana. Lanjutkan dengan daftar pendek, atau akhiri tanpa pemenang.',
  'sourcing.refusal.stageIsFinal':
    'Tidak dilanjutkan. RFQ adalah tahap terakhir: acara berakhir dengan pemenang, atau diakhiri tanpa pemenang.',
  'sourcing.refusal.shortlistEmpty':
    'Tidak dilanjutkan. Daftar pendek tidak menyebut pemasok mana pun. Acara tanpa pemasok untuk dilanjutkan diakhiri tanpa pemenang.',
  'sourcing.refusal.shortlistNotResponder':
    'Tidak dilanjutkan. Ada pemasok di daftar pendek yang tidak menanggapi pada tahap ini. Hanya pemasok yang menanggapi yang masuk daftar pendek.',
  'sourcing.refusal.shortlistUnderFloor':
    'Tidak dilanjutkan. Tahap berikutnya memerlukan setidaknya dua pemasok yang memenuhi syarat, dan daftar pendeknya kurang dari itu. Masukkan pemasok lain yang menanggapi, buka kembali tahap ini agar lebih banyak pemasok yang diundang dapat menanggapi, atau akhiri acara tanpa pemenang. Pemasok yang belum pernah diundang diundang pada acara baru.',
  'sourcing.refusal.shortlistReasonMissing':
    'Tidak dilanjutkan. Daftar pendek meninggalkan seorang pemasok dan alasannya tidak disebut. Alasan itulah yang dibaca pemasok tersebut.',
  'sourcing.refusal.stageDeadlinePast':
    'Tidak dilanjutkan. Tenggat tanggapan tahap berikutnya sudah lewat. Pilih tanggal mulai hari ini.',
  'sourcing.refusal.concludeReasonMissing':
    'Tidak diakhiri. Sebutkan mengapa acara berakhir tanpa pemenang.',
  'sourcing.award.submitting': 'Memenangkan…',
  // — Lifecycle actions (batal / buka kembali) —
  'sourcing.lifecycle.actions': 'Tindakan siklus hidup',
  'sourcing.publish.submit': 'Terbitkan RFQ',
  'sourcing.publish.submitting': 'Menerbitkan…',
  'sourcing.cancel.submit': 'Batalkan RFQ',
  'sourcing.cancel.submitting': 'Membatalkan…',
  'sourcing.reopen.submit': 'Buka kembali RFQ',
  'sourcing.reopen.submitting': 'Membuka kembali…',
  // The five `sourcing.footer.*` labels were deleted with the handler-less
  // side-panel button that rendered them (see the EN bundle).
  // — Lifecycle timeline —
  'sourcing.timeline.drafted': 'RFQ Dibuat',
  'sourcing.timeline.sentTo.one': 'Dikirim ke {{count}} pemasok',
  'sourcing.timeline.sentTo.other': 'Dikirim ke {{count}} pemasok',
  'sourcing.timeline.responses': 'Respons Diterima ({{responded}}/{{total}})',
  'sourcing.timeline.latest': 'Terbaru: {{date}}',
  'sourcing.timeline.evaluation': 'Evaluasi',
  'sourcing.timeline.awarded': 'Dimenangkan',
  'sourcing.timeline.closed': 'Ditutup',
  // — Wizard: chrome —
  'sourcing.wizard.complete': 'Simpan draf RFQ',
  'sourcing.wizard.step.scope.title': 'Tentukan Cakupan',
  'sourcing.wizard.step.scope.short': 'Cakupan',
  'sourcing.wizard.step.scope.desc': 'Apa yang Anda sumberkan dan berapa banyak?',
  'sourcing.wizard.step.suppliers.title': 'Undang Pemasok',
  'sourcing.wizard.step.suppliers.short': 'Pemasok',
  'sourcing.wizard.step.suppliers.desc': 'Pilih pemasok untuk diminta penawaran.',
  'sourcing.wizard.step.terms.title': 'Syarat & Tenggat',
  'sourcing.wizard.step.terms.short': 'Syarat',
  'sourcing.wizard.step.terms.desc': 'Kapan respons jatuh tempo dan dengan syarat komersial apa?',
  'sourcing.wizard.step.review.title': 'Tinjau & Kirim',
  'sourcing.wizard.step.review.short': 'Tinjau',
  'sourcing.wizard.step.review.desc': 'Periksa detail sebelum menyimpan draf.',
  // — Wizard: scope —
  'sourcing.wizard.field.sourceRequisition': 'Ajukan dari permintaan',
  'sourcing.wizard.sourceRequisition.placeholder': 'Bukan dari permintaan',
  'sourcing.wizard.sourceRequisition.help':
    'Opsional. Memilih permintaan yang disetujui akan mengisi data yang bisa dibawa dan memindahkannya ke Acara Sourcing saat RFQ ini diajukan.',
  'sourcing.wizard.sourceRequisition.none':
    'Tidak ada permintaan disetujui yang menunggu. Acara sourcing dapat diajukan dari permintaan yang disetujui; Anda juga bisa mengajukan RFQ ini secara mandiri.',
  'sourcing.wizard.field.title': 'Judul RFQ',
  'sourcing.wizard.placeholder.title': 'mis. Sumber Pewangi Q3 2026 — Senyawa Floral',
  'sourcing.wizard.field.category': 'Kategori material',
  'sourcing.wizard.select.category': 'Pilih kategori…',
  'sourcing.wizard.field.budget': 'Anggaran perkiraan (IDR)',
  'sourcing.wizard.placeholder.budget': 'Opsional',
  'sourcing.wizard.field.materials': 'Material spesifik',
  'sourcing.wizard.materials.selectFirst': 'Pilih kategori terlebih dahulu untuk melihat material yang tersedia.',
  'sourcing.wizard.materials.noMasterCode':
    'Tidak ada di master material: {{materials, stop}}. Acara tetap berjalan dan akan memerlukan tender kompetitif — pengecualian pemasok terdaftar tidak dapat diperiksa tanpa kode master.',
  // — R8 · penawaran permintaan material di wizard —
  'sourcing.wizard.materials.requestOffer': 'Minta ini dibuatkan di master material',
  'sourcing.wizard.materials.requestOffer.marked':
    'Permintaan material akan diajukan untuk: {{materials, stop}}. Ini tidak mengubah acara — RFQ tetap berjalan dan akan tetap memerlukan tender kompetitif.',
  'sourcing.wizard.materials.requestOffer.undo': 'Jangan ajukan permintaan',
  'sourcing.wizard.materials.requestNeed': 'Mengapa ini dibutuhkan (untuk master data)',
  'sourcing.wizard.materials.requestNeed.hint':
    'Master data menilai apakah ini sudah ada dengan nama lain. Inilah yang mereka baca.',
  'sourcing.toast.requestNotRaised.title': 'Tidak ada permintaan material yang diajukan',
  'sourcing.toast.requestNotRaised.desc':
    'Acara sourcing tidak dibuat, jadi tidak ada yang tercatat. Anda dapat mengajukan permintaan itu sendiri dari Permintaan material.',
  'sourcing.toast.requestFailed.title':
    '{{rfqNumber}} diajukan — permintaan material tidak',
  'sourcing.toast.requestFailed.desc':
    'Acara aktif dan tidak berubah. Tidak ada yang tercatat untuk permintaan material; ajukan dari Permintaan material.',
  'sourcing.toast.requestRaised.title':
    '{{rfqNumber}} diajukan — permintaan material tercatat',
  'sourcing.toast.requestRaised.desc':
    'Master data akan meninjaunya di Permintaan material. Material belum ada, dan acara tidak berubah.',
  'sourcing.detail.materialRequest.pending':
    'Permintaan material tertunda untuk: {{materials, stop}}. Acara ini tidak berubah dan akan tetap memerlukan tender kompetitif.',
  'sourcing.detail.materialRequest.decided':
    'Permintaan material untuk {{materials}} telah diputuskan ({{status}}). Acara ini tidak berubah dalam kedua kasus — material sebuah RFQ tidak dapat diubah setelah dibuat.',
  'sourcing.wizard.field.totalQty': 'Total kuantitas',
  'sourcing.wizard.placeholder.qty': 'mis. 2400',
  // — Wizard: penolakan numerik (CP-0 · W1 · 2e-b-4a) —
  'sourcing.wizard.qty.refused.empty':
    'Masukkan total kuantitas yang Anda cari — pemasok menawarkan harga satuan terhadap angka ini, jadi RFQ tanpa kuantitas tidak dapat dijawab.',
  'sourcing.wizard.qty.refused.notNumeric':
    'Itu bukan kuantitas — ketik angka saja, misalnya 2400.',
  'sourcing.wizard.qty.refused.ambiguous':
    'Ini bisa dibaca dua cara — "2.400" berarti dua ribu empat ratus dalam bahasa Indonesia dan dua koma empat dalam bahasa Inggris. Ketik tanpa pemisah: 2400.',
  'sourcing.wizard.budget.refused.notNumeric':
    'Itu bukan nominal — ketik angka saja, misalnya 850000000, atau kosongkan jika anggaran belum ditetapkan.',
  'sourcing.wizard.budget.refused.ambiguous':
    'Ini bisa dibaca dua cara — "1.500" berarti seribu lima ratus dalam bahasa Indonesia dan satu koma lima dalam bahasa Inggris. Ketik tanpa pemisah: 1500.',
  'sourcing.wizard.field.uom': 'Satuan',
  // — Wizard: suppliers —
  'sourcing.wizard.ai.title': 'Rekomendasi AI',
  'sourcing.wizard.ai.basis': '· Berdasarkan kategori, tingkat, dan OTIF',
  'sourcing.wizard.supplierMeta': '{{country}} · OTIF {{otif}}% · Grade {{grade}}',
  'sourcing.wizard.search.supplier': 'Cari pemasok berdasarkan nama atau negara…',
  'sourcing.wizard.col.supplier': 'Pemasok',
  'sourcing.wizard.col.country': 'Negara',
  'sourcing.wizard.col.otif': 'OTIF',
  'sourcing.wizard.supplier.noMatch': 'Tidak ada pemasok yang cocok dengan pencarian saat ini.',
  'sourcing.wizard.supplier.selectCategory': 'Pilih kategori di langkah 1.',
  'sourcing.wizard.selectedCount.one': '{{count}} pemasok dipilih',
  'sourcing.wizard.selectedCount.other': '{{count}} pemasok dipilih',
  // — Wizard: terms —
  'sourcing.wizard.field.responseDeadline': 'Tenggat respons',
  'sourcing.wizard.field.awardDeadline': 'Tenggat pemenangan',
  'sourcing.wizard.awardAfterResponse': 'Tenggat pemenangan harus setelah tenggat respons.',
  'sourcing.wizard.field.incoterms': 'Incoterms',
  'sourcing.wizard.field.paymentTerms': 'Syarat pembayaran',
  'sourcing.wizard.field.currency': 'Mata uang',
  // — Wizard: review —
  'sourcing.wizard.review.section.scope': 'Cakupan',
  'sourcing.wizard.review.section.suppliers': 'Pemasok',
  'sourcing.wizard.review.section.terms': 'Syarat & Tenggat',
  'sourcing.wizard.review.edit': 'Sunting',
  'sourcing.wizard.review.row.sourceRequisition': 'Diajukan dari',
  'sourcing.wizard.review.row.notCarried': 'Tidak dibawa',
  'sourcing.wizard.review.notCarried.category': 'kategori',
  'sourcing.wizard.review.notCarried.uom': 'satuan',
  'sourcing.wizard.review.row.title': 'Judul',
  'sourcing.wizard.review.row.category': 'Kategori',
  'sourcing.wizard.review.row.materials': 'Material',
  'sourcing.wizard.review.row.quantity': 'Kuantitas',
  'sourcing.wizard.review.row.budget': 'Anggaran',
  'sourcing.wizard.review.budgetUnspecified': 'Tidak ditentukan',
  'sourcing.wizard.review.row.invited': 'Diundang',
  'sourcing.wizard.review.row.names': 'Nama',
  'sourcing.wizard.review.row.responseDeadline': 'Tenggat respons',
  'sourcing.wizard.review.row.awardDeadline': 'Tenggat pemenangan',
  'sourcing.wizard.review.row.incoterms': 'Incoterms',
  'sourcing.wizard.review.row.paymentTerms': 'Syarat pembayaran',
  'sourcing.wizard.review.row.currency': 'Mata uang',
  'sourcing.wizard.review.invited.one': '{{count}} pemasok',
  'sourcing.wizard.review.invited.other': '{{count}} pemasok',
  // — Toasts —
  'sourcing.toast.awardFailed.title': 'Pemenangan gagal',
  'sourcing.toast.awardFailed.default': 'Pemenangan tidak dapat diselesaikan.',
  'sourcing.toast.awardFailed.dispatch': 'Pemenangan tidak dapat dikirim.',
  'sourcing.toast.awarded.title': '{{rfqNumber}} dimenangkan',
  'sourcing.toast.awarded.desc': '{{supplier}} dimenangkan — penawaran lain ditolak.',
  'sourcing.toast.awarded.fallbackSupplier': 'Pemasok terpilih',
  'sourcing.toast.reviewed.title': 'Penawaran dipindahkan ke tinjauan',
  'sourcing.toast.reviewed.desc': 'Penawaran kini sedang dievaluasi.',
  'sourcing.toast.reviewFailed.title': 'Tinjauan gagal',
  'sourcing.toast.reviewFailed.default': 'Penawaran tidak dapat dipindahkan ke tinjauan.',
  'sourcing.toast.cancelled.title': '{{rfqNumber}} dibatalkan',
  'sourcing.toast.cancelled.desc': 'Acara sumber telah dibatalkan.',
  'sourcing.toast.closed.title': '{{rfqNumber}} ditutup untuk penawaran baru',
  'sourcing.toast.closed.desc': 'Penawaran ditutup. Tetapkan pemenang dari penawaran yang diterima, buka kembali, atau batalkan.',
  'sourcing.toast.closed.titleStage': '{{rfqNumber}} ditutup untuk tanggapan baru',
  'sourcing.toast.closed.descStage':
    'Tahap {{stage}} ditutup. Lanjutkan dengan daftar pendek, buka kembali, atau akhiri tanpa pemenang.',
  'sourcing.toast.closeFailed.title': 'Penutupan gagal',
  'sourcing.toast.closeFailed.default': 'Penawaran tidak dapat ditutup.',
  'sourcing.toast.closeFailed.dispatch': 'Penutupan tidak dapat dikirim.',
  'sourcing.toast.cancelFailed.title': 'Pembatalan gagal',
  'sourcing.toast.cancelFailed.default': 'RFQ tidak dapat dibatalkan.',
  'sourcing.toast.cancelFailed.dispatch': 'Pembatalan tidak dapat dikirim.',
  'sourcing.toast.reopened.title': '{{rfqNumber}} dibuka kembali',
  'sourcing.toast.reopened.desc': 'Acara sumber kembali terbuka untuk penawaran.',
  'sourcing.toast.reopenFailed.title': 'Pembukaan kembali gagal',
  'sourcing.toast.reopenFailed.default': 'RFQ tidak dapat dibuka kembali.',
  'sourcing.toast.reopenFailed.dispatch': 'Pembukaan kembali tidak dapat dikirim.',
  'sourcing.toast.created.title': '{{rfqNumber}} disimpan sebagai draf',
  'sourcing.toast.created.desc.one':
    'Belum dikirim — terbitkan untuk membukanya ke {{count}} pemasok yang diundang',
  'sourcing.toast.created.desc.other':
    'Belum dikirim — terbitkan untuk membukanya ke {{count}} pemasok yang diundang',
  'sourcing.toast.published.title': '{{rfqNumber}} diterbitkan',
  'sourcing.toast.published.desc.one':
    'Kini terbuka untuk {{count}} pemasok yang diundang.',
  'sourcing.toast.published.desc.other':
    'Kini terbuka untuk {{count}} pemasok yang diundang.',
  'sourcing.toast.publishFailed.title': 'Penerbitan gagal',
  'sourcing.toast.publishFailed.default': 'RFQ tidak dapat diterbitkan.',
  'sourcing.toast.publishFailed.dispatch': 'Penerbitan tidak dapat dikirim.',
  'sourcing.toast.createFailed.title': 'Pembuatan gagal',
  'sourcing.toast.createFailed.default': 'RFQ tidak dapat dibuat.',
  'sourcing.toast.createFailed.dispatch': 'RFQ tidak dapat dikirim.',
  'sourcing.toast.numberRefused.title': 'RFQ tidak dibuat — periksa angkanya',
  // — Empty state (wrapper) —
  'sourcing.state.empty.title': 'Belum ada acara sumber',
  'sourcing.state.empty.subtitle': 'Belum ada RFQ yang tercatat.',
  'sourcing.state.empty.message': 'Acara sumber dan evaluasi penawaran muncul di sini setelah RFQ diajukan.',
  'sourcing.toast.exportUnavailable.title': 'Ekspor belum tersedia',
  'sourcing.toast.templatesUnavailable.title': 'Templat acara belum tersedia',
  'sourcing.toast.exportUnavailable.desc':
    'Tidak ada berkas yang dibuat — ekspor belum tersambung ke sistem nyata.',
  'sourcing.toast.templatesUnavailable.desc':
    'Tidak ada templat acara yang dibuka. Menyimpan satu acara pengadaan utuh sebagai templat belum dibangun. Templat kuesioner disimpan di penyunting kuesioner RFI.',
};
