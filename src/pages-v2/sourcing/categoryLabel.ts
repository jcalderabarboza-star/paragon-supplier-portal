// SRC-2 · THE CATEGORY LABEL, ONE MAP. It lived inside `BuyerSourcing`, so the
// material-request page — which renders the same closed union in a table cell,
// a select and a detail line — printed the English member in Indonesian.
// The `RFQCategory` member stays the logic value; only the label is localised.

import type { TFunction } from 'i18next';
import type { RFQCategory } from '../../data/mockRfqs';

export const CATEGORY_LABEL_KEY: Record<RFQCategory, string> = {
  Fragrance: 'sourcing.category.fragrance',
  'Active Ingredients': 'sourcing.category.activeIngredients',
  Packaging: 'sourcing.category.packaging',
  Emulsifiers: 'sourcing.category.emulsifiers',
  Botanical: 'sourcing.category.botanical',
  Other: 'sourcing.category.other',
};

export const categoryLabel = (t: TFunction, c: RFQCategory): string =>
  t(CATEGORY_LABEL_KEY[c]);
