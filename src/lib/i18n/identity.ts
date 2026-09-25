// Seat-identity guard i18n fragment. Namespace: identity.*
//
// ⚠️ **ONE COMPONENT, TWO STATES, AND THE OLD STRING WAS RIGHT FOR ONLY ONE.**
// `NoSupplierIdentity` is reached from 18 sites through two guard expressions,
// and both funnel two DIFFERENT facts into one screen:
//
//   · **buyer persona** — `supplierId` is `null` BY CONSTRUCTION (every buyer
//     setter writes it that way). The remedy really is the persona toggle.
//   · **supplier persona, unresolvable tenant** — `tenantFromStorage` maps an
//     id the supplier master does not hold to `{ supplierId: null }`
//     (`identitySources.ts`), so a seat that IS in supplier mode lands on the
//     SAME `!supplierId` guard and was told to "switch to Supplier mode".
//
// The second is the residual this fragment exists for, and the honesty rule is
// that the copy STATES THE REASON rather than only the absence: the seat names
// a supplier this portal cannot resolve, so there is no tenancy to read under.
//
// The buyer arm's TITLE is byte-identical to the pre-i18n string on purpose —
// it was the arm that was correct, and two shipped specs assert it.
//
// EN+ID from birth (MARKER-I18N-HOLE-01).
export const identityEn: Record<string, string> = {
  // — buyer persona: no supplier identity at all —
  'identity.noSupplier.title': 'No supplier identity in session',
  'identity.noSupplier.subtitle':
    'Supplier pages require a supplier identity. Use the persona toggle in the sidebar to switch to Supplier mode.',
  'identity.noSupplier.heading': 'Switch to the supplier persona',
  'identity.noSupplier.body':
    'Toggle Supplier in the sidebar to load your supplier workspace.',
  // — supplier persona: the seat names a tenant that cannot be resolved —
  'identity.unresolvedTenant.title': 'Supplier identity could not be resolved',
  'identity.unresolvedTenant.subtitle':
    'This seat is already in Supplier mode, but the supplier it names is not one this portal knows. Without a resolved supplier there is no tenancy to read under, so nothing was loaded.',
  'identity.unresolvedTenant.heading': 'The supplier on this seat is not recognised',
  'identity.unresolvedTenant.body':
    'Switch to Buyer and back to Supplier in the sidebar to reset the seat to a known supplier. Nothing was changed and nothing was recorded.',

  // ── SAMPLE IDENTITIES (2026-09-24) ────────────────────────────────────────
  //
  // ⚠️ `identity.actor.sample` IS THE LOAD-BEARING STRING IN THIS FILE. It is
  // the ONLY way a person's label reaches a reader (`personLabel`), so the
  // "(SAMPLE)" suffix travels WITH the name and cannot be lost by a surface
  // that renders the label without the pill beside it. Removing the suffix here
  // silently un-marks every rendered person in the portal;
  // `personLabelGuard.test.ts` asserts the marker text is present in both
  // locales for exactly that reason.
  'identity.actor.sample': '{{label}} (SAMPLE)',
  // An id the person registry cannot resolve. NOT the raw id (an internal token
  // on a governed surface) and NOT a guess (manufactured provenance).
  'identity.actor.unknown': 'Unrecognised person',

  // — the switcher —
  'identity.switcher.title': 'Acting as',
  'identity.switcher.help':
    'Pick a sample user so acts are recorded against a named role. Paragon has no sign-in yet — these are demonstration identities, not people.',
  'identity.switcher.none': 'No sample user',
  'identity.switcher.noneHint':
    'Acts are recorded without an identified person, exactly as before.',
  'identity.switcher.sampleBadge': 'SAMPLE',
  // ⚠️ THE NARROWING NOTICE (R3). The roster SEEDS the roles and the toggles may
  // narrow them afterwards; this states the divergence rather than preventing
  // it. Silence here would leave a seat labelled "Compliance 1" holding only
  // procurement, which is a label naming an authority it does not have.
  // ⚠️ **THREE ARMS, BECAUSE ONE OF THEM WAS MEASURED WRONG IN THE BROWSER.**
  // A single `identity.narrowed` string rendered "Roles narrowed from
  // Procurement 1" on a seat that had just been GIVEN a second lane — a label
  // naming the opposite of what happened, which is `label-names-wrong-verb`
  // with a person attached. The divergence is what matters; the DIRECTION is
  // what the reader checks against the list directly above it, so it has to be
  // right.
  'identity.narrowed': 'Roles narrowed from {{label}}',
  'identity.widened': 'Roles widened beyond {{label}}',
  'identity.rolesChanged': 'Roles changed from {{label}}',
  'identity.narrowedHint':
    'This seat no longer holds exactly the roles the sample user opens with. Acts are still recorded against that user.',

  // — what a sample identity may NOT do (R2) —
  // The pre-act line when a SAMPLE user is selected. The lane's own
  // "no person in session" copy is untouched and still used when none is.
  'identity.preAct.sample': 'This will be recorded against {{label, stop}}.',
  'identity.sample.cannotAcceptRisk':
    'A sample identity cannot accept governance risk. Loosening a governed check or completing an override needs a real signed-in person, and Paragon has no sign-in yet.',

  // — a refusal that NAMES A PERSON (2026-09-24) —
  //
  // ⚠️ **`{{person}}` IS FILLED BY `personLabel` AND BY NOTHING ELSE.** The
  // service refusal behind this key interpolates a `personId`, and browser QA
  // caught that id reaching a reader verbatim. The copy below is what a reader
  // sees instead: a ROLE LABEL carrying the SAMPLE marker, in their language.
  // A call site that filled this from the raw id would re-create the defect
  // with a translated sentence around it — `personIdNeverRendered.test.ts`
  // fires the real composition at the real refusal to hold that closed.
  'identity.refusal.deciderIsRequester':
    '{{person}} raised this request and may not also decide it. Raising a material request and ruling on it are two authorities — route it to somebody else.',
  // Call-off step 1 — `SAMPLE_ACTOR_CANNOT_LOOSEN` became reader-facing when the
  // drawdown-tolerance editor started dispatching a verb whose hook emits it.
  'identity.refusal.sampleCannotLoosen':
    '{{person}} is a sample identity and may not relax a governed setting. Accepting that risk needs a real signed-in person, and Paragon has no sign-in yet — tightening is still available.',
};

export const identityId: Record<string, string> = {
  'identity.noSupplier.title': 'Tidak ada identitas pemasok dalam sesi',
  'identity.noSupplier.subtitle':
    'Halaman pemasok memerlukan identitas pemasok. Gunakan pengalih persona di bilah sisi untuk beralih ke mode Pemasok.',
  'identity.noSupplier.heading': 'Beralih ke persona pemasok',
  'identity.noSupplier.body':
    'Alihkan ke Pemasok di bilah sisi untuk memuat ruang kerja pemasok Anda.',
  'identity.unresolvedTenant.title': 'Identitas pemasok tidak dapat dikenali',
  'identity.unresolvedTenant.subtitle':
    'Kursi ini sudah berada dalam mode Pemasok, tetapi pemasok yang disebutnya tidak dikenal portal ini. Tanpa pemasok yang dikenali tidak ada tenansi untuk dibaca, sehingga tidak ada yang dimuat.',
  'identity.unresolvedTenant.heading': 'Pemasok pada kursi ini tidak dikenali',
  'identity.unresolvedTenant.body':
    'Beralihlah ke Pembeli lalu kembali ke Pemasok di bilah sisi untuk mengatur ulang kursi ke pemasok yang dikenal. Tidak ada yang diubah dan tidak ada yang dicatat.',

  // ── SAMPLE IDENTITIES (2026-09-24) ────────────────────────────────────────
  // ⚠️ `CONTOH` is the ID marker and is deliberately NOT the English word: a
  // probe keyed on a token spelled identically in both locales is an assertion
  // that cannot fail, which is why the locale specs key on this pair.
  'identity.actor.sample': '{{label}} (CONTOH)',
  'identity.actor.unknown': 'Orang tidak dikenali',

  'identity.switcher.title': 'Bertindak sebagai',
  'identity.switcher.help':
    'Pilih pengguna contoh agar tindakan tercatat atas nama sebuah peran. Paragon belum memiliki proses masuk — ini identitas demonstrasi, bukan orang.',
  'identity.switcher.none': 'Tanpa pengguna contoh',
  'identity.switcher.noneHint':
    'Tindakan dicatat tanpa identitas orang, persis seperti sebelumnya.',
  'identity.switcher.sampleBadge': 'CONTOH',
  'identity.narrowed': 'Peran dipersempit dari {{label}}',
  'identity.widened': 'Peran diperluas melampaui {{label}}',
  'identity.rolesChanged': 'Peran diubah dari {{label}}',
  'identity.narrowedHint':
    'Kursi ini tidak lagi memegang persis peran bawaan pengguna contoh tersebut. Tindakan tetap dicatat atas nama pengguna itu.',

  'identity.preAct.sample': 'Ini akan dicatat atas nama {{label, stop}}.',
  'identity.sample.cannotAcceptRisk':
    'Identitas contoh tidak dapat menerima risiko tata kelola. Melonggarkan pemeriksaan yang diatur atau menyelesaikan penggantian memerlukan orang sungguhan yang telah masuk, dan Paragon belum memiliki proses masuk.',

  'identity.refusal.deciderIsRequester':
    '{{person}} mengajukan permintaan ini dan tidak boleh sekaligus memutuskannya. Mengajukan permintaan material dan memutuskannya adalah dua kewenangan — alihkan kepada orang lain.',
  'identity.refusal.sampleCannotLoosen':
    '{{person}} adalah identitas contoh dan tidak boleh melonggarkan pengaturan yang diatur. Menerima risiko itu memerlukan orang sungguhan yang telah masuk, dan Paragon belum memiliki proses masuk — memperketat tetap tersedia.',
};
