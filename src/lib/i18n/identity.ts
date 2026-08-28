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
};
