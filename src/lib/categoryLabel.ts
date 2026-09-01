// ────────────────────────────────────────────────────────────────────────────
// Central category-label map (SEAT2-I18N-CATEGORY-01) — a sibling of
// statusLabel.ts / priorityLabel.ts / modeLabel.ts for material / RFQ / contract
// / compliance-document category tokens.
//
// Category strings render as filter chips AND table/side-panel pills across
// Marketplace, BuyerInventory, SupplierInventory, the storefronts, RFQ/contract
// surfaces, BuyerCompliance, and SupplierDocuments. Batch 4/5 left them canonical
// EN because no central map existed and the filter-chip `id` is matched against
// the stored `category` value (data). This map closes that filter-vs-pill split.
//
// HONEST-BY-CONSTRUCTION: display-only. The stored `category` value and any
// FilterChipsBar `id` stay canonical EN (the id drives filtering); only the
// visible label is resolved through here via `useCategoryLabel()` / the StatusPill
// resolver chain. Never feed the resolved label back into state, a filter id, or a
// mutation.
//
// SCOPE (honest): this maps the Paragon house-of-brands beauty/personal-care
// vocabulary (fragrance / active ingredients / packaging / emulsifiers /
// botanicals / raw materials / vitamins) and the compliance-document taxonomy
// (Halal / BPOM / Tax & Legal / Quality / Contract …). Generic-industrial demo
// residue present in some sample fixtures (Semiconductors, PCB Assemblies, Steel
// Components, Rare Earth Metals, Machined Parts, Plastics / Resin) is intentionally
// NOT mapped — it is out-of-scope sample data and renders verbatim (the resolver
// returns null → caller shows the raw token).
//
// ── ⚠️ THE MARKETPLACE / STOREFRONT VOCABULARY (S2a) ────────────────────────
// Ten tokens were added here, and NOT ONE PAGE WAS EDITED TO GET THEM. Both
// consumers — `Marketplace`'s filter chips and `SupplierMyStorefront`'s
// add-material form — already called `useCategoryLabel()`; the resolver returned
// null and they fell back to the raw EN token, so **10 of 12 Marketplace chips
// and 2 of 4 storefront options rendered English to an Indonesian reader while
// the pages were, by inspection, doing everything right.** The batch that found
// this predicted the remedy was "route the page through the map" and was wrong:
// the map's VOCABULARY was what was incomplete. Derive the fall-through set
// (`categoryLabelKey` over each surface's tokens) before believing any claim
// about which surface is at fault.
//
// ── ⚠️ AND THE ONE FAMILY THAT NEEDED AN ALIAS RATHER THAN A ROW ────────────
// THREE spellings of one concept live in this tree — `Natural & Botanical` (the
// Marketplace chip), `Natural Botanical` and `Natural/Botanical` (both stored in
// fixtures) — and ALL THREE slug to `category.natural_botanical`. They cannot
// all be canonical: the resource spread would collapse them and the slug-uniqueness
// guard would fail. So one is registered and the other two resolve through
// `SPELLING_ALIAS`, exactly the shape `statusLabel.ts` uses for `UnderReview`.
// **This normalizes EN as well as ID** — the two fixture spellings now display as
// `Natural & Botanical` WHEREVER THEY RESOLVE, which browser QA measured as
// BuyerAnalytics' top-supplier pill (via the `StatusPill` resolver chain) and
// BuyerScorecard. That is the point of a canonical vocabulary, but it IS a visible
// EN change and is recorded rather than discovered.
//
// ⚠️ AND `Natural/Botanical` STILL RENDERS RAW ON THE SPEND DONUT — measured, not
// assumed. That surface passes the category straight to a chart label and never
// calls a resolver, so no row or alias here can reach it. **An alias fixes a
// vocabulary, not a surface that never asks.** Do not read the donut as evidence
// that this alias is broken; it is evidence that the donut is a separate finding.
//
// The alias is DISPLAY-ONLY and must stay that way: `requisitionPrefill.ts`
// separately relies on `Natural Botanical` ≠ `Botanical` for MATCHING, and does
// not import this module. Never feed a resolved label back into a filter id, a
// stored value, or a match.
//
// Slugs are namespaced `category.*` so they never collide with
// `status.*` / `enum.*` / `mode.*` / `channel.*`.
// ────────────────────────────────────────────────────────────────────────────

// Canonical category token → Bahasa Indonesia. Keyed by the exact canonical
// string; resolution is case-insensitive and whitespace-trimmed. Several EN
// spelling variants (singular/plural, slash vs paren forms) intentionally map to
// the same natural ID label.
const CATEGORY_ID: Record<string, string> = {
  // — Beauty / personal-care materials —
  Fragrance: 'Pewangi',
  'Fragrance Compounds': 'Senyawa Pewangi',
  'Active Ingredient': 'Bahan Aktif',
  'Active Ingredients': 'Bahan Aktif',
  'Active Ingredients (Vitamins)': 'Bahan Aktif (Vitamin)',
  Vitamin: 'Vitamin',
  Vitamins: 'Vitamin',
  Emulsifier: 'Pengemulsi',
  Emulsifiers: 'Pengemulsi',
  'Halal Emulsifier': 'Pengemulsi Halal',
  'Halal Emulsifiers': 'Pengemulsi Halal',
  Botanical: 'Botani',
  'Raw Material': 'Bahan Baku',
  Packaging: 'Kemasan',
  'Packaging Primary': 'Kemasan Primer',
  'Packaging Secondary': 'Kemasan Sekunder',
  'Packaging (PET)': 'Kemasan (PET)',
  // — Marketplace / storefront supply categories (S2a) —
  // `Primary Packaging` and `Secondary Packaging` are the OTHER WORD ORDER of
  // `Packaging Primary` / `Packaging Secondary` above and deliberately carry the
  // SAME ID string: two EN spellings, one Indonesian label, distinct slugs. That
  // is the pattern this map already uses for Emulsifier(s) and Active Ingredient(s).
  'Natural & Botanical': 'Alami & Botani',
  'Surfactants & Emulsifiers': 'Surfaktan & Pengemulsi',
  'Fragrance & Aroma': 'Pewangi & Aroma',
  Preservatives: 'Pengawet',
  'Primary Packaging': 'Kemasan Primer',
  'Secondary Packaging': 'Kemasan Sekunder',
  'Labels & Print': 'Label & Cetak',
  'Sustainable Packaging': 'Kemasan Berkelanjutan',
  'Testing & Certification': 'Pengujian & Sertifikasi',
  'Contract Manufacturing': 'Manufaktur Kontrak',
  // — Compliance / document taxonomy (closes the BuyerCompliance / SupplierDocuments split) —
  Halal: 'Halal',
  'Halal Compliance': 'Kepatuhan Halal',
  Compliance: 'Kepatuhan',
  'BPOM Regulatory': 'Regulasi BPOM',
  Regulatory: 'Regulasi',
  'Tax & Legal': 'Pajak & Hukum',
  Quality: 'Kualitas',
  Contract: 'Kontrak',
  Documentation: 'Dokumentasi',
  Audit: 'Audit',
  Delivery: 'Pengiriman',
  Environmental: 'Lingkungan',
  'Pricing Review': 'Tinjauan Harga',
  'Freight/Logistics': 'Angkutan/Logistik',
  Other: 'Lainnya',
};

// The canonical set, in declaration order (the resource spread + guard test).
export const CANONICAL_CATEGORIES = Object.keys(CATEGORY_ID);

// Case-insensitive index: normalized token → canonical token.
const BY_NORM = new Map(
  CANONICAL_CATEGORIES.map((k) => [k.trim().toLowerCase(), k]),
);

/** Slug a canonical category into its i18n key: "Tax & Legal" → "category.tax_legal". */
function slug(category: string): string {
  return (
    'category.' +
    category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

/**
 * SPELLING VARIANT → CANONICAL CATEGORY.
 *
 * ⚠️ AN ALIAS, NOT AN ENTRY, AND THE DISTINCTION IS FORCED BY THE SLUG.
 * `Natural Botanical`, `Natural/Botanical` and `Natural & Botanical` all slug to
 * `category.natural_botanical`. Registering more than one collapses the resource
 * spread and fails the slug-uniqueness guard — so one spelling is canonical and
 * the rest resolve to it. Same mechanism, same reason, as `statusLabel.ts`'s
 * `MACHINE_STATE_ALIAS`: an alias resolves to a label that already exists and
 * already localizes, rather than minting a second key for one concept.
 *
 * Keys are pre-normalized (trimmed, lowercased) because that is what the resolver
 * looks them up with.
 */
const SPELLING_ALIAS: Record<string, string> = {
  'natural botanical': 'Natural & Botanical',
  'natural/botanical': 'Natural & Botanical',
};

/**
 * The i18n key for a category label, or null if the token is not part of the
 * mapped vocabulary (the caller then renders it verbatim — see SCOPE note above).
 * Trimmed and case-insensitive.
 *
 * A REGISTERED token always wins over an alias, so registering an aliased
 * spelling later changes behaviour at the map rather than silently here.
 */
export function categoryLabelKey(category: string): string | null {
  const norm = category.trim().toLowerCase();
  const canon = BY_NORM.get(norm) ?? SPELLING_ALIAS[norm];
  return canon ? slug(canon) : null;
}

/** i18n resource fragments — spread into the en/id translation namespaces. */
export const categoryResourcesEn: Record<string, string> = Object.fromEntries(
  CANONICAL_CATEGORIES.map((s) => [slug(s), s]),
);
export const categoryResourcesId: Record<string, string> = Object.fromEntries(
  CANONICAL_CATEGORIES.map((s) => [slug(s), CATEGORY_ID[s]]),
);

// Re-exported for the guard test (coverage + slug-collision checks).
export const __categoryInternals = { CATEGORY_ID, slug, SPELLING_ALIAS };
