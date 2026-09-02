// ────────────────────────────────────────────────────────────────────────────
// Wizard — the shared multi-step chrome, in both languages.
//
// ⚠️ **THREE KEYS, AND THE FOURTH LITERAL IS DELIBERATELY NOT ONE.** The footer
// rendered `Cancel` / `Back` / `Next` as English literals INSIDE the component
// body. That is ordinary untranslated JSX — `t()` reaches there — so it is not
// the module-scope-literal gate's class at all, and no instrument in this tree
// was ever watching it. It shipped English on an Indonesian page through five
// consumers: registration, contracts, sourcing, shipments, and the GR wizard.
//
// `completeLabel` was the fourth literal (`completeLabel = 'Submit'`) and is NOT
// keyed here, because it never rendered: it is passed at 5 of 5 call sites, all
// five through `t()`. Keying it would have added a resource key with no reader —
// the stored-field shape this project refuses, and the module-scope gate's own
// header names this exact prop as the worked example of an unreachable default.
// The prop is now REQUIRED instead, so the dead default cannot come back.
//
// ── THE COPY IS DERIVED, NOT INVENTED ───────────────────────────────────────
//   Each ID term is the one the tree already uses, taken from the existing
//   fragments rather than chosen here — `Batal` (4 keys, unanimous), `Kembali`
//   (3 keys, unanimous), `Berikutnya` (2 keys, unanimous). A shared component
//   that coins its own word for Cancel teaches the reader that its buttons are
//   a different kind of button.
//
//   ⚠️ All three pairs are LOCALE-DIVERGENT, which is what makes a browser probe
//   able to fail. A term spelled identically in both locales produces an
//   assertion that passes whether or not the fix exists — that has already
//   shipped once in this register.
//
// The EN arm is byte-identical to the literals it replaces, so no existing spec
// had to be touched — and so no EN assertion anywhere is evidence for this
// batch. The ID arm is the half that could not pass before.
// ────────────────────────────────────────────────────────────────────────────

export const wizardEn: Record<string, string> = {
  'wizard.cancel': 'Cancel',
  'wizard.back': 'Back',
  'wizard.next': 'Next',
};

export const wizardId: Record<string, string> = {
  'wizard.cancel': 'Batal',
  'wizard.back': 'Kembali',
  'wizard.next': 'Berikutnya',
};
