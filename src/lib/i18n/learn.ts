// Learn / guided-walkthrough i18n fragment. Namespace: learn.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
//
// I3.4 (FORK-1=(c)) — the minimal scripted halal-renewal walkthrough. GOVERNING
// PRINCIPLE: the walkthrough is a SCAFFOLD that guides steps, NOT an authority that
// states regulatory procedure. Every step describes what the supplier DOES at the
// authoritative source (halal.go.id / SIHALAL / a registered LPH) and routes any
// specific regulatory fact (document lists, timelines, fees) to that source — it
// never asserts an unratified requirement. The team's Compliance session fills the
// ratified specifics; this is the honest frame around them.
//
// The dual-trigger reality (GR 42/2024) is named ONCE in the first step: BPJPH
// certs are permanent (re-certify only on composition/PPH change); legacy MUI/GR-39
// certs carry a fixed expiry and must migrate. All steps then share ONE SIHALAL
// path (no per-certificate branching — D-A deleted `certBasis`, so there is no
// longer a field to branch on). The disclaimer + source link render on EVERY step.
export const learnEn: Record<string, string> = {
  // — Lesson chrome —
  'learn.halalRenewal.title': 'Halal certificate renewal — a guide',
  'learn.halalRenewal.entry': 'How to renew — step-by-step guide',
  // — Persistent honest boundary (shown on every step) —
  'learn.halalRenewal.disclaimer':
    'This is a guide, not an official submission. Your renewal completes through SIHALAL and your registered LPH — Paragon does not submit or track it on your behalf.',
  'learn.halalRenewal.source.label': 'Official BPJPH portal (halal.go.id)',
  // — Navigation —
  'learn.halalRenewal.nav.back': 'Back',
  'learn.halalRenewal.nav.next': 'Next',
  'learn.halalRenewal.nav.done': 'Done',
  'learn.halalRenewal.nav.step': 'Step {{current}} of {{total}}',
  // — Step 1: confirm whether action is needed (names both triggers) —
  'learn.halalRenewal.step.basis.title': 'Confirm whether action is needed',
  'learn.halalRenewal.step.basis.body':
    'Start by confirming which situation applies to you. Certificates differ: some carry a fixed expiry and must move to BPJPH, while a BPJPH certificate has permanent validity and needs action only when your product’s composition or Halal Product Process (PPH) changes. Confirm your certificate’s basis and your current obligation with BPJPH before you begin.',
  // — Step 2: prepare documentation —
  'learn.halalRenewal.step.prepare.title': 'Prepare your halal documentation',
  'learn.halalRenewal.step.prepare.body':
    'Gather the documentation your registered Halal Inspection Body (LPH) will review — typically your product and ingredient information and your Halal Product Process (PPH) records. The exact checklist is set by BPJPH and your LPH; confirm the current list at the source before you apply.',
  // — Step 3: apply via SIHALAL + engage LPH —
  'learn.halalRenewal.step.apply.title': 'Apply through SIHALAL and engage an LPH',
  'learn.halalRenewal.step.apply.body':
    'Submit your application through SIHALAL, the official BPJPH system (ptsp.halal.go.id), and engage a registered Halal Inspection Body (LPH) to carry out the audit. SIHALAL is the authoritative channel — Paragon cannot submit on your behalf.',
  // — Step 4: allow time for the audit —
  'learn.halalRenewal.step.track.title': 'Allow time for the LPH audit',
  'learn.halalRenewal.step.track.body':
    'Halal recertification runs months, not weeks — start early. Track your application’s progress in SIHALAL; certificate status is confirmed there, not in this portal.',
  // — Step 5: upload the issued certificate —
  'learn.halalRenewal.step.upload.title': 'Upload your issued certificate',
  'learn.halalRenewal.step.upload.body':
    'Once BPJPH issues your certificate, upload it in My Documents so Paragon’s records stay current. Uploading here keeps your buyer relationship up to date — it does not submit anything to BPJPH.',
};

export const learnId: Record<string, string> = {
  // — Lesson chrome —
  'learn.halalRenewal.title': 'Pembaruan sertifikat halal — panduan',
  'learn.halalRenewal.entry': 'Cara memperbarui — panduan langkah demi langkah',
  // — Persistent honest boundary (shown on every step) —
  'learn.halalRenewal.disclaimer':
    'Ini panduan, bukan pengajuan resmi. Pembaruan Anda diselesaikan melalui SIHALAL dan LPH terdaftar Anda — Paragon tidak mengajukan atau melacaknya atas nama Anda.',
  'learn.halalRenewal.source.label': 'Portal resmi BPJPH (halal.go.id)',
  // — Navigation —
  'learn.halalRenewal.nav.back': 'Kembali',
  'learn.halalRenewal.nav.next': 'Berikutnya',
  'learn.halalRenewal.nav.done': 'Selesai',
  'learn.halalRenewal.nav.step': 'Langkah {{current}} dari {{total}}',
  // — Step 1: confirm whether action is needed (names both triggers) —
  'learn.halalRenewal.step.basis.title': 'Pastikan apakah tindakan diperlukan',
  'learn.halalRenewal.step.basis.body':
    'Mulailah dengan memastikan situasi mana yang berlaku bagi Anda. Sertifikat berbeda-beda: sebagian memiliki masa berlaku tetap dan harus dialihkan ke BPJPH, sedangkan sertifikat BPJPH berlaku permanen dan baru memerlukan tindakan bila komposisi produk atau Proses Produk Halal (PPH) Anda berubah. Pastikan dasar sertifikat dan kewajiban Anda saat ini kepada BPJPH sebelum memulai.',
  // — Step 2: prepare documentation —
  'learn.halalRenewal.step.prepare.title': 'Siapkan dokumentasi halal Anda',
  'learn.halalRenewal.step.prepare.body':
    'Kumpulkan dokumentasi yang akan ditinjau oleh Lembaga Pemeriksa Halal (LPH) terdaftar Anda — umumnya informasi produk dan bahan serta catatan Proses Produk Halal (PPH). Daftar persisnya ditetapkan oleh BPJPH dan LPH Anda; pastikan daftar terkini di sumbernya sebelum mengajukan.',
  // — Step 3: apply via SIHALAL + engage LPH —
  'learn.halalRenewal.step.apply.title': 'Ajukan melalui SIHALAL dan libatkan LPH',
  'learn.halalRenewal.step.apply.body':
    'Ajukan permohonan Anda melalui SIHALAL, sistem resmi BPJPH (ptsp.halal.go.id), dan libatkan Lembaga Pemeriksa Halal (LPH) terdaftar untuk melakukan audit. SIHALAL adalah kanal resmi — Paragon tidak dapat mengajukan atas nama Anda.',
  // — Step 4: allow time for the audit —
  'learn.halalRenewal.step.track.title': 'Beri waktu untuk audit LPH',
  'learn.halalRenewal.step.track.body':
    'Resertifikasi halal berlangsung berbulan-bulan, bukan berminggu-minggu — mulailah lebih awal. Lacak perkembangan permohonan Anda di SIHALAL; status sertifikat dipastikan di sana, bukan di portal ini.',
  // — Step 5: upload the issued certificate —
  'learn.halalRenewal.step.upload.title': 'Unggah sertifikat yang telah terbit',
  'learn.halalRenewal.step.upload.body':
    'Setelah BPJPH menerbitkan sertifikat Anda, unggah di Dokumen Saya agar catatan Paragon tetap mutakhir. Mengunggah di sini menjaga hubungan Anda dengan pembeli tetap terbarui — bukan pengajuan apa pun ke BPJPH.',
};
