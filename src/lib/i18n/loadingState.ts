// ────────────────────────────────────────────────────────────────────────────
// LoadingState — the read path's waiting surface, in both languages.
//
// ⚠️ **EVERY ONE OF THESE FOUR STRINGS RENDERED IN ENGLISH ON EVERY LOADING
// SCREEN IN THE PORTAL, IN BOTH LOCALES**, and no test could see it. They were
// PARAMETER DEFAULTS — `({ title = 'Loading…' })` — and a parameter default is
// evaluated before the component body runs, which is the only place `t()`
// exists. The i18n layer was complete and irrelevant: there was no site for it
// to act on.
//
// Derived, not assumed: `title` / `subtitle` / `message` are omitted at 37 of
// 37 `<LoadingState` sites, and `breadcrumb` at 5 of 37. So all four defaults
// render, and all four are keyed here. Contrast `ErrorState.breadcrumb`, which
// is omitted at 0 of 32 and therefore stays a literal — a key with no reader is
// the stored-field shape this project refuses.
//
// ── ⚠️ THE EN ARM IS BYTE-IDENTICAL TO THE STRINGS IT REPLACES ──────────────
// Same discipline as `errorState.ts`, and the same cost, stated again because
// it applies again: a spec that passes because the EN text is unchanged CANNOT
// SEE whether the string came from a key or from a hardcode, so no EN spec is
// evidence for this change. `LoadingState.i18n.test.tsx` asserts the ID arm,
// which is the half no EN spec can reach — and the ID arm is the entire defect.
// ────────────────────────────────────────────────────────────────────────────

export const loadingStateEn: Record<string, string> = {
  // The PageHeader breadcrumb — reached only by the 5 sites that omit their own.
  'loadingState.crumb': 'LOADING',
  'loadingState.title': 'Loading…',
  'loadingState.subtitle': 'Fetching the latest data.',
  'loadingState.message': 'One moment.',
};

export const loadingStateId: Record<string, string> = {
  'loadingState.crumb': 'MEMUAT',
  'loadingState.title': 'Memuat…',
  'loadingState.subtitle': 'Mengambil data terbaru.',
  'loadingState.message': 'Mohon tunggu sebentar.',
};
