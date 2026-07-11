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
// returns null → caller shows the raw token). The compound "Natural Botanical" /
// "Natural/Botanical" spelling variants are likewise unmapped (the base
// `Botanical` → `Botani` carries the concept) to keep every canonical token's slug
// distinct — no two tokens may collapse to the same `category.*` key.
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
 * The i18n key for a category label, or null if the token is not part of the
 * mapped vocabulary (the caller then renders it verbatim — see SCOPE note above).
 * Trimmed and case-insensitive.
 */
export function categoryLabelKey(category: string): string | null {
  const canon = BY_NORM.get(category.trim().toLowerCase());
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
export const __categoryInternals = { CATEGORY_ID, slug };
