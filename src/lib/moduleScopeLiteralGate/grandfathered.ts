// ─────────────────────────────────────────────────────────────────────────────
// S2 · THE GRANDFATHER LIST — the module-scope-literal gate's worklist.
//
// Every module-scope const consumed by `.map()` that carried reader-visible
// literals BEFORE this gate existed, and has not yet been adjudicated.
//
// ── ⚠️ THIS IS A DECOMPOSITION, NOT A DEFERRAL OF CONVENIENCE ───────────────
//   The batch that built the gate fixed shape S1 completely and stopped here on
//   purpose. S2 is not one fix, it is 57 separate rulings on whether a given
//   const is COPY (translate it) or DATA (state why it is not copy) — and a
//   large minority of them are entangled with the central label maps
//   (`statusLabel`, `priorityLabel`, `categoryLabel`), where the remedy is not
//   "add a key" but "route the page through the map". Half-doing that would
//   leave screens where some strings translate and others do not, which teaches
//   the reader that they are different kinds of text. That is the harm, and it
//   is worse than the wait.
//
// ── HOW A ROW LEAVES ────────────────────────────────────────────────────────
//   Adjudicate the const at its own site — `// i18n-defer: <why it is not
//   copy>` — or translate it. Then DELETE the row. The list is asserted
//   BILATERALLY: a row naming no live const fails as loudly as a live const
//   naming no row, so it cannot quietly rot into a list of things that used to
//   be true. **It can only shrink.**
//
// ⚠️ **NO COUNT IS WRITTEN IN THIS COMMENT.** `S2_GRANDFATHERED.length` is the
// count, derived where it cannot drift (§27, `FLOOR-IN-PROSE-01`). The ceiling
// asserted in the spec is the one number, and it is a CEILING precisely so that
// shrinking this list never requires editing a number.
// ─────────────────────────────────────────────────────────────────────────────

/** `file::CONST` — see the header. Sorted; append is not expected, ever. */
export const S2_GRANDFATHERED: readonly string[] = [
  'src/components/delivery/PolicyEditor.tsx::ENFORCEMENTS',
  'src/components/layout-v2/LanguageMenu.tsx::LANGUAGES',
  'src/pages-v2/BuyerAnalytics.tsx::PERIOD_IDS',
  'src/pages-v2/BuyerAnalytics.tsx::SUMMARY_CARDS',
  'src/pages-v2/BuyerChannelTriage.tsx::CHANNELS',
  'src/pages-v2/BuyerCompliance.tsx::CATEGORY_OPTIONS',
  'src/pages-v2/BuyerCompliance.tsx::REQUEST_CATEGORIES',
  'src/pages-v2/BuyerCompliance.tsx::STATUS_OPTIONS',
  'src/pages-v2/BuyerContracts.tsx::BRAND_OPTIONS',
  'src/pages-v2/BuyerContracts.tsx::CATEGORY_OPTIONS',
  'src/pages-v2/BuyerContracts.tsx::INCOTERMS_OPTIONS',
  'src/pages-v2/BuyerContracts.tsx::PAYMENT_TERMS_OPTIONS',
  'src/pages-v2/BuyerContracts.tsx::TYPE_OPTIONS',
  'src/pages-v2/BuyerDiscovery.tsx::STAGE_LABEL_KEYS',
  'src/pages-v2/BuyerInventory.tsx::BRANDS',
  'src/pages-v2/BuyerInvoices.tsx::AGING_DATA',
  'src/pages-v2/BuyerInvoices.tsx::STATUS_OPTIONS',
  'src/pages-v2/BuyerRequisitions.tsx::COST_CENTERS',
  'src/pages-v2/BuyerRequisitions.tsx::PRIORITY_OPTIONS',
  'src/pages-v2/BuyerRequisitions.tsx::UOM_OPTIONS',
  'src/pages-v2/BuyerRisk.tsx::SCENARIO_LIBRARY_IDS',
  'src/pages-v2/BuyerRisk.tsx::TAB_DEFS',
  'src/pages-v2/BuyerShipments.tsx::DOCKS',
  'src/pages-v2/BuyerShipments.tsx::TIME_SLOTS',
  'src/pages-v2/BuyerSourcing.tsx::INCOTERMS_OPTIONS',
  'src/pages-v2/BuyerSourcing.tsx::MATERIAL_CATALOG',
  'src/pages-v2/BuyerSourcing.tsx::PAYMENT_TERMS_OPTIONS',
  'src/pages-v2/BuyerSupplierProfile.tsx::MSG_LOG',
  'src/pages-v2/CommHubInbound.tsx::CHANNELS',
  'src/pages-v2/Marketplace.tsx::CATEGORIES',
  'src/pages-v2/Marketplace.tsx::OPEN_RFQS',
  'src/pages-v2/SupplierDocuments.tsx::CATEGORY_FILTERS',
  'src/pages-v2/SupplierDocuments.tsx::CERT_TYPES',
  'src/pages-v2/SupplierForecasts.tsx::ADVANCE_VERBS',
  'src/pages-v2/SupplierForecasts.tsx::ROOT_CAUSE_LEVELS',
  'src/pages-v2/SupplierInventory.tsx::STATUS_FILTER_IDS',
  'src/pages-v2/SupplierMyStorefront.tsx::CATEGORY_OPTIONS',
  'src/pages-v2/SupplierMyStorefront.tsx::CERT_OPTIONS',
  'src/pages-v2/SupplierMyStorefront.tsx::COMPLETENESS_ITEMS',
  'src/pages-v2/SupplierMyStorefront.tsx::CURRENCY_OPTIONS',
  'src/pages-v2/SupplierMyStorefront.tsx::UOM_OPTIONS',
  'src/pages-v2/SupplierPerformance.tsx::GRADE_HISTORY',
  'src/pages-v2/SupplierRFQs.tsx::EVAL_SEGMENTS',
  'src/pages-v2/SupplierRegistration.tsx::BANKS',
  'src/pages-v2/SupplierRegistration.tsx::CHANNELS',
  'src/pages-v2/SupplierRegistration.tsx::CONTACT_ROLES',
  'src/pages-v2/SupplierRegistration.tsx::COUNTRIES',
  'src/pages-v2/SupplierRegistration.tsx::DOCUMENTS',
  'src/pages-v2/SupplierRegistration.tsx::INDONESIAN_PROVINCES',
  'src/pages-v2/SupplierRegistration.tsx::REQUEST_TYPES',
  'src/pages-v2/SupplierRegistration.tsx::SUPPLY_CATEGORIES',
  'src/pages-v2/SupplierShipments.tsx::CARRIER_OPTIONS',
  'src/pages-v2/SupplierStorefront.tsx::TABS',
  'src/pages-v2/SupplierStorefront.tsx::TRACK_RECORD',
  'src/pages-v2/SupplierWhatsApp.tsx::CAP_KEYS',
  'src/pages-v2/SupplierWhatsApp.tsx::LANGUAGES',
  'src/pages-v2/process-flows/FlowDiagram.tsx::MARKERS',
];

export function grandfatheredKeys(): ReadonlySet<string> {
  return new Set(S2_GRANDFATHERED);
}
