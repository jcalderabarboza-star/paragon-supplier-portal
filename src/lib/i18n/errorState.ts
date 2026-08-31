// ────────────────────────────────────────────────────────────────────────────
// ErrorState — the read path's failure surface, in both languages.
//
// ⚠️ **THIS FRAGMENT EXISTS BECAUSE A THIRD OF THE PORTAL HAD NO WORDS IN
// INDONESIAN FOR "THIS DID NOT LOAD".** `ErrorState` is rendered by 31 pages
// (derived from the `<ErrorState` sites, both personas) and carried
// `useTranslation` ZERO times: five English literals, hardcoded, plus a raw
// `${error.code}: ${error.message}` that put a dispatcher constant on screen.
//
// ⚠️ **AND NO CATCH-BASED CENSUS COULD EVER HAVE FOUND IT.** The instrument
// that found the sibling defect walks `catch` bindings whose value reaches a
// user-visible sink. `ErrorState` takes `error` as a PROP and sits in no catch,
// so a matcher of that shape returns nothing for it — and returns nothing
// loudly, which is the shape rule 1 warns about. It was found by asking what
// RENDERS an error, not by asking what CATCHES one.
//
// ── ⚠️ THE EN ARM IS BYTE-IDENTICAL TO THE STRINGS IT REPLACES, ON PURPOSE ──
// 28 specs across 28 files assert `'Unable to load this page'` as a literal —
// they are liveness probes ("the page reached its error state"), not assertions
// about copy. Preserving the EN text exactly means **none of them has to be
// touched**, so this batch changes no spec it does not own. That is a deliberate
// design choice and it has a cost worth stating: a spec that passes because the
// EN string is unchanged CANNOT SEE whether the string came from a key or from
// a hardcode. So it is not evidence for this batch, and `ErrorState.i18n.test.tsx`
// is — it asserts the ID arm, which is the half no existing spec can reach.
// ────────────────────────────────────────────────────────────────────────────

export const errorStateEn: Record<string, string> = {
  // The PageHeader title — the `title` prop's default, not a fixed string. All
  // 31 consumers omit `title` (derived), so this is what every one of them shows.
  'errorState.title': 'Something went wrong',
  'errorState.subtitle': 'The data could not be loaded.',
  'errorState.heading': 'Unable to load this page',
  'errorState.retry': 'Try again',
  // The last-resort branch: a thrown value that is not an `Error` at all, so
  // there is no message to show and nothing to classify.
  'errorState.unexpected': 'An unexpected error occurred.',
};

export const errorStateId: Record<string, string> = {
  'errorState.title': 'Terjadi kesalahan',
  'errorState.subtitle': 'Data tidak dapat dimuat.',
  'errorState.heading': 'Halaman ini tidak dapat dimuat',
  'errorState.retry': 'Coba lagi',
  'errorState.unexpected': 'Terjadi kesalahan yang tidak terduga.',
};
