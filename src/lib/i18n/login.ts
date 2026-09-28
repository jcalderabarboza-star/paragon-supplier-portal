// Login i18n fragment (H3). Namespace: login.*
// Flat dot-keys, mirrors src/lib/i18n.ts.
//
// ⚠️ **THIS FRAGMENT EXISTS BECAUSE THE PAGE HAD NO KEYS AT ALL.** `/login` was
// the last reader-facing surface in the tree still written entirely in inline
// English literals — the i18n sweep never reached it because it lives under
// `src/pages/auth/`, outside `pages-v2` where every batch has been working. The
// moment this file exports an `En`/`Id` pair it joins `fragments.test.ts`'s
// DERIVED population, so its parity, its plural categories, its interpolation
// variables and its wiring into `resources` are all checked with nobody editing
// that suite.
//
// ⚠️ **WHAT IS DELIBERATELY *NOT* KEYED, AND THE RULE IS "NAMES ARE NOT PROSE".**
// `PARAGON CORP`, the Indonesian tagline `Portal Kolaborasi Pemasok` and the
// legal entity `PT Paragon Technology and Innovation` stay as they are written
// on the page. A brand, a tagline and a registered company name are the same
// bytes in both locales, and DP-3 already draws that line for rendering (mono =
// data, sans = names/prose). Keying them would invite a "translation" of a name.
//
// ⚠️ **AND `login.demo.note` IS THE LOAD-BEARING STRING, NOT DECORATION.** The
// page collects an email and hands it to nothing: `handleSignIn` reads neither
// the email nor (before H3) the password — it sets a persona and navigates. The
// note is what makes that true on screen rather than merely true in the source,
// so it says plainly that nothing typed here is checked. If the email field is
// ever wired to a real identity provider, this string is the first thing that
// must change, and it must change BEFORE the wiring, not after.
export const loginEn: Record<string, string> = {
  // — Brand block —
  'login.brand.portal': 'Supplier Portal',
  // — Persona tabs —
  'login.tab.buyer': 'Paragon Team',
  'login.tab.supplier': 'Supplier',
  // — Form —
  'login.field.email': 'Email',
  'login.field.emailPlaceholder': 'you@example.com',
  // — The demo sign-in, and the sentence that makes it honest —
  'login.demo.signIn': 'Enter the demo',
  'login.demo.note':
    'Demo sign-in. Nothing you type here is checked and no password is asked for — the tab above chooses the seat you browse as.',
  // — Supplier self-registration —
  'login.register': 'New supplier? Register here →',
  // — Direct persona entry —
  'login.divider': 'Demo Mode',
  'login.viewAsBuyer': 'View as Buyer',
  'login.viewAsSupplier': 'View as Supplier',
  // — Footer —
  'login.footer': '© 2026 PT Paragon Technology and Innovation. All rights reserved.',
};

export const loginId: Record<string, string> = {
  // — Brand block —
  'login.brand.portal': 'Portal Pemasok',
  // — Persona tabs —
  'login.tab.buyer': 'Tim Paragon',
  'login.tab.supplier': 'Pemasok',
  // — Form —
  'login.field.email': 'Email',
  // ⚠️ `.example`, NOT `.com` — `thirdPartyIdentifiers.test.ts` convicted the
  // first draft of this line. `contoh.com` is a REGISTRABLE domain that somebody
  // owns; `example.com` is RFC 2606-reserved and so is every `.example` host, and
  // the guard's stated preference is the latter. A placeholder that can resolve is
  // a placeholder that can one day send mail to a stranger.
  'login.field.emailPlaceholder': 'anda@contoh.example',
  // — The demo sign-in, and the sentence that makes it honest —
  'login.demo.signIn': 'Masuk ke demo',
  'login.demo.note':
    'Masuk demo. Tidak ada yang Anda ketik di sini yang diperiksa dan tidak ada kata sandi yang diminta — tab di atas memilih kursi yang Anda gunakan untuk menjelajah.',
  // — Supplier self-registration —
  'login.register': 'Pemasok baru? Daftar di sini →',
  // — Direct persona entry —
  'login.divider': 'Mode Demo',
  'login.viewAsBuyer': 'Lihat sebagai Pembeli',
  'login.viewAsSupplier': 'Lihat sebagai Pemasok',
  // — Footer —
  'login.footer': '© 2026 PT Paragon Technology and Innovation. Seluruh hak dilindungi.',
};
