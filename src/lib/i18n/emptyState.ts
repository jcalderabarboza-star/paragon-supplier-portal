// ────────────────────────────────────────────────────────────────────────────
// EmptyState — the "loaded, and there is nothing" surface.
//
// ⚠️ **ONE KEY, AND THE NARROWNESS IS THE POINT.** `EmptyState` has four
// defaults; three of them (`breadcrumb`, `title`, `subtitle`) are passed at 29
// of 29 call sites and therefore cannot render. Keying those would add three
// resource keys with no reader — the stored-field shape — so they stay
// literals, with the reason stated at the site rather than here.
//
// `message` is omitted at 2 of 29: `BuyerDashboard` and `BuyerInvoices`. Both
// pass `title` and `subtitle` through `t()` and then rendered this sentence in
// English underneath them — **a screen where some strings translate and others
// do not, which teaches the reader they are different kinds of text.** That is
// the harm, and those two sites are the whole population of it.
//
// ⚠️ The 29-of-29 acquittal is DERIVED at gate time, never trusted from this
// comment: the module-scope-literal gate re-counts the call sites every run, so
// the day someone adds a site that omits `title`, that literal becomes a defect
// with nobody re-reading this paragraph. The EN arm is byte-identical to the
// string it replaces (see `errorState.ts` for why, and for what it costs).
// ────────────────────────────────────────────────────────────────────────────

export const emptyStateEn: Record<string, string> = {
  'emptyState.message': 'When records appear, they will show up here.',
};

export const emptyStateId: Record<string, string> = {
  'emptyState.message': 'Saat ada data, data akan tampil di sini.',
};
