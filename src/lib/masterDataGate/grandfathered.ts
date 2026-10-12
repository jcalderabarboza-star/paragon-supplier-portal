// ─────────────────────────────────────────────────────────────────────────────
// MD-2 · THE MASTER-DATA GATE — what is still allowed, by name, with its reason.
//
// Both lists are held EQUAL to the tree (`masterDataGate.test.ts`), so each can
// only shrink: a file that stops importing a fixture, or a list that moves to
// its reference table, must leave here in the same change.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The files that import a master-data fixture directly.
 *
 * `MATERIAL_MASTER` is down to its two legitimate readers: the seed, which
 * turns the fixture into replica records, and the view, which takes the two
 * portal annotations (halal and BPOM applicability) from it.
 *
 * `mockSuppliers` still has direct readers. Each is a place where a supplier's
 * NAME or the roster is read from the fixture instead of the replica; moving
 * them is the supplier half of "one truth" and is not done in this batch.
 */
export const FIXTURE_IMPORTERS: Readonly<Record<string, readonly string[]>> = {
  MATERIAL_MASTER: ['services/masterData/materialMasterView.ts', 'services/masterData/seed.ts'],
  mockSuppliers: [
    'components/layout-v2/IdentityPanel.tsx',
    'components/layout-v2/SidebarV2.tsx',
    'context/identitySources.ts',
    'pages-v2/BuyerCollaboration.tsx',
    'pages-v2/BuyerPreferredSuppliers.tsx',
    'pages/auth/Login.tsx',
    'services/data/mock/MockCommandService.ts',
    'services/data/mock/MockDeliveryService.ts',
    'services/data/mock/MockSupplierService.ts',
    'services/data/rfqSourcingGate.ts',
    'services/masterData/seed.ts',
    'services/planning/somoFixture.ts',
    'services/transitions/policies.ts',
  ],
};

export interface StandingOptionList {
  /** The reference table the list's values belong to. */
  readonly table: string;
  readonly reason: string;
}

/** The option lists that still stand, keyed `file::NAME`. */
export const OPTION_LISTS: Readonly<Record<string, StandingOptionList>> = {
  'lib/currencyPolicy.ts::BID_CURRENCIES': {
    table: 'currency',
    reason:
      'The currencies a bid may be placed in: a portal POLICY over the currency table, and a closed union the money formatter is typed on. It equals the table today; the day SAP sends a fourth currency the table grows and this list does not, by design.',
  },
  'pages-v2/BuyerRequisitions.tsx::UOM_OPTIONS': {
    table: 'unit',
    reason:
      'The requisition form offers MT and BOX, which are outside the unit union the replica holds. Which units a requisition may be raised in is a ruling the operator has not made; the list is left as it is until then.',
  },
  'pages-v2/SupplierMyStorefront.tsx::CURRENCY_OPTIONS': {
    table: 'currency',
    reason:
      'The supplier storefront form. Its catalogue is component state that is lost on reload; the form is replaced, not repaired, when the supplier-proposed catalogue is built (SE list).',
  },
  'pages-v2/SupplierMyStorefront.tsx::UOM_OPTIONS': {
    table: 'unit',
    reason:
      'The supplier storefront form, as above: replaced with the supplier-proposed catalogue (SE list), so its unit list is not moved here.',
  },
  'pages-v2/SupplierRegistration.tsx::COUNTRIES': {
    table: 'country',
    reason:
      'The registration walkthrough lists country NAMES, three of which the country table does not hold, and its province field is keyed on one of them. The page has no write path; it is rebuilt with supplier onboarding (arc 3).',
  },
  'pages-v2/sourcing/requisitionPrefill.ts::RFQ_UOM_OPTIONS': {
    table: 'unit',
    reason:
      'The units a sourcing event may be raised in, a typed union on the RFQ that includes MT. Same open ruling as the requisition form.',
  },
  'services/data/mock/MockCommandService.ts::RFQ_UOMS': {
    table: 'unit',
    reason: "The command target's membership check for the RFQ unit union above; it moves when that union does.",
  },
  'services/sdc/bpom.ts::PROVISIONALLY_APPLICABLE_GROUPS': {
    table: 'materialGroup',
    reason:
      "Not an option list: the material groups a provisional BPOM ruling applies to, a portal annotation over the group table and Compliance's to change.",
  },
  'services/sdc/materialGroups.ts::MATERIAL_GROUPS': {
    table: 'materialGroup',
    reason:
      "The material-group register the seed builds the group table FROM, with the portal's own axis beside each group. It is the table's source in the fixture, not a copy of it.",
  },
};
