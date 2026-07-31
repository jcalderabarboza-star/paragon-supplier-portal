// ────────────────────────────────────────────────────────────────────────────
//  currencyPolicy (CP-0 · 2e-c-1) — the ONE place that says which currencies a
//  supplier may bid in.
//
//  WHY THIS FILE EXISTS. Before this batch the answer was written down three
//  times, in three shapes, and the three had drifted:
//
//    • the supplier's quote form  hand-listed IDR / USD / EUR   (SupplierRFQs)
//    • the Quotation entity        held      IDR / USD          (mockQuotations)
//    • the should-cost spread axis held      IDR / USD          (shouldCostSpread)
//
//  A supplier could therefore SELECT a currency the entity could not REPRESENT.
//  Nothing caught it, because nothing connected the three: each was an
//  independent literal that happened to agree until it didn't.
//
//  The fix is direction, not duplication. The LIST is the source of truth and the
//  TYPE derives from it — so the form's options, the entity's field and any
//  future currency-shaped axis are all downstream of one edit. Adding CNY is a
//  one-line change here; it cannot be a migration, because there is no second
//  copy left to migrate.
//
//  SCOPE — this file states POLICY (which currencies are permissible), never
//  CAPABILITY (which currencies a given engine can actually price in). Those are
//  different facts and they are deliberately allowed to differ: the should-cost
//  engine's `SpreadCurrency` is narrower than `BidCurrency` and stays narrower,
//  because a currency being legal to bid in does not conjure a commodity basket
//  to price it against. Where the two meet, the surface renders honest silence
//  rather than pricing a bid against the wrong currency's model.
// ────────────────────────────────────────────────────────────────────────────

/**
 * The currencies a supplier may price a bid in — the binding operator ruling
 * (D-1 lane, 2e-c). ORDER IS THE UI ORDER: the form renders these in sequence,
 * so the base currency leads and the list reads as a deliberate sequence rather
 * than an alphabetical accident.
 */
export const BID_CURRENCIES = ['IDR', 'USD', 'EUR'] as const;

/** The bid currencies as a type. DERIVED — never hand-written beside the list. */
export type BidCurrency = (typeof BID_CURRENCIES)[number];

/**
 * The portal's base currency — the one a quote is priced in when it says
 * nothing. ABSENT IS LEGAL and reads as this: every quotation minted before the
 * currency field existed is honestly silent about it, and silence has always
 * meant rupiah. No fixture is migrated to make the field look mandatory.
 */
export const BASE_CURRENCY = 'IDR' as const satisfies BidCurrency;

/**
 * Narrow an arbitrary string to a bid currency. The DOM hands back `string` from
 * a `<select>` even when every `<option>` came from `BID_CURRENCIES`, so this is
 * the boundary that makes the widening honest instead of a cast.
 */
export function isBidCurrency(value: string): value is BidCurrency {
  return (BID_CURRENCIES as readonly string[]).includes(value);
}
