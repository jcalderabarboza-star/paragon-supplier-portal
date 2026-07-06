// ────────────────────────────────────────────────────────────────────────────
// i18n primitive (Phase 0.6; extended v2.2 I18N-01).
//
// react-i18next pipeline. Bilingual EN/ID is a platform requirement (I18N-01):
// strings are externalized as keys, ID-first for supplier surfaces. The
// PO-confirm proof (Step 3.10) is the FIRST surface on the pattern — its keys
// carry real EN + an ID stub. The existing-page key sweep is Phase 3′; new
// surfaces use keys from here on. English stays the default runtime locale
// until the sweep flips ID-first.
// ────────────────────────────────────────────────────────────────────────────

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const resources = {
  en: {
    translation: {
      'app.title': 'Paragon Supplier Portal',
      // — PO confirm (Step 3.10 proof surface) —
      'po.confirm.action': 'Confirm order',
      'po.confirm.submitting': 'Confirming…',
      'po.confirm.success.title': '{{poNumber}} confirmed',
      'po.confirm.success.desc': '{{correlationId}} recorded. Procurement notification pending live channel.',
      'po.confirm.failed.title': 'Could not confirm {{poNumber}}',
      'po.confirm.failed.desc': 'The order could not be confirmed ({{reason}}).',
      'po.confirm.denied.title': 'Not authorized',
      'po.confirm.denied.desc': 'You are not authorized to confirm this order.',
      // — ASN create / submit (Step 4 batch i) —
      'asn.create.action': 'Create ASN',
      'asn.submit.action': 'Submit',
      'asn.create.success.title': '{{asnNumber}} drafted',
      'asn.create.success.desc': 'Draft created from {{poNumber}}. {{correlationId}} recorded.',
      'asn.create.failed.title': 'Could not create ASN',
      'asn.create.failed.desc': 'The ASN could not be drafted ({{reason}}).',
      'asn.submit.success.title': '{{asnNumber}} submitted',
      'asn.submit.success.desc': '{{correlationId}} recorded. WMS transmission pending live channel.',
      'asn.submit.failed.title': 'Could not submit {{asnNumber}}',
      'asn.submit.failed.desc': 'Submission was rejected ({{reason}}).',
      'asn.submit.missingFields': 'Carrier, tracking number and ETA are required. ({{code}})',
      'asn.submit.confirm': 'Submit ASN',
      'asn.submit.form.intro': 'Provide the carrier, tracking number, and ETA for {{poNumber}}.',
      'asn.submit.form.carrier': 'Carrier',
      'asn.submit.form.tracking': 'Tracking number',
      'asn.submit.form.eta': 'Estimated arrival',
      'asn.denied.title': 'Not authorized',
      'asn.denied.desc': 'You are not authorized to act on this shipment.',
      'asn.discrepancy.deferred.title': 'Discrepancy handling pending',
      'asn.discrepancy.deferred.desc': 'Opens with goods-receipt reconciliation (pending live channel).',
      // — Goods receipt verbs (Step 4 batch ii) —
      'gr.create.action': 'New GR',
      'gr.create.success.title': '{{grNumber}} received',
      'gr.create.success.desc': '{{correlationId}} recorded. Inspection recorded at receipt.',
      'gr.create.failed.title': 'Could not create goods receipt',
      'gr.create.failed.desc': 'The goods receipt could not be created ({{reason}}).',
      'gr.dispose.success.title': '{{grNumber}} — {{disposition}}',
      'gr.dispose.success.desc': '{{correlationId}} recorded. Header disposition derived from the inspected lines.',
      'gr.dispose.failed.title': 'Could not finalize {{grNumber}}',
      'gr.dispose.failed.desc': 'Disposition was rejected ({{reason}}).',
      'gr.dispose.missingReason': 'A rejection reason is required to reject this receipt.',
      'gr.post.action': 'Post to SAP',
      'gr.post.posting.title': '{{grNumber}} posting to SAP',
      'gr.post.posting.desc': 'Submitted to SAP — awaiting the material-document callback. No document assigned yet.',
      'gr.post.posted.title': '{{grNumber}} posted to SAP',
      'gr.post.posted.desc': 'SAP assigned the material document on settlement.',
      'gr.post.failed.title': 'Could not post {{grNumber}}',
      'gr.post.failed.desc': 'Posting was rejected ({{reason}}).',
      'gr.denied.title': 'Not authorized',
      'gr.denied.desc': 'You are not authorized to act on this goods receipt.',
    },
  },
  id: {
    translation: {
      'app.title': 'Portal Pemasok Paragon',
      // — PO confirm (ID stub — refined in the Phase 3′ ID-first sweep) —
      'po.confirm.action': 'Konfirmasi pesanan',
      'po.confirm.submitting': 'Mengonfirmasi…',
      'po.confirm.success.title': '{{poNumber}} dikonfirmasi',
      'po.confirm.success.desc': '{{correlationId}} tercatat. Notifikasi pengadaan menunggu kanal langsung.',
      'po.confirm.failed.title': 'Tidak dapat mengonfirmasi {{poNumber}}',
      'po.confirm.failed.desc': 'Pesanan tidak dapat dikonfirmasi ({{reason}}).',
      'po.confirm.denied.title': 'Tidak berwenang',
      'po.confirm.denied.desc': 'Anda tidak berwenang mengonfirmasi pesanan ini.',
      // — ASN create / submit (ID stub — refined in the Phase 3′ ID-first sweep) —
      'asn.create.action': 'Buat ASN',
      'asn.submit.action': 'Kirim',
      'asn.create.success.title': '{{asnNumber}} dibuat',
      'asn.create.success.desc': 'Draf dibuat dari {{poNumber}}. {{correlationId}} tercatat.',
      'asn.create.failed.title': 'Tidak dapat membuat ASN',
      'asn.create.failed.desc': 'ASN tidak dapat dibuat ({{reason}}).',
      'asn.submit.success.title': '{{asnNumber}} dikirim',
      'asn.submit.success.desc': '{{correlationId}} tercatat. Transmisi WMS menunggu kanal langsung.',
      'asn.submit.failed.title': 'Tidak dapat mengirim {{asnNumber}}',
      'asn.submit.failed.desc': 'Pengiriman ditolak ({{reason}}).',
      'asn.submit.missingFields': 'Kurir, nomor pelacakan, dan ETA wajib diisi. ({{code}})',
      'asn.submit.confirm': 'Kirim ASN',
      'asn.submit.form.intro': 'Isi kurir, nomor pelacakan, dan ETA untuk {{poNumber}}.',
      'asn.submit.form.carrier': 'Kurir',
      'asn.submit.form.tracking': 'Nomor pelacakan',
      'asn.submit.form.eta': 'Perkiraan tiba',
      'asn.denied.title': 'Tidak berwenang',
      'asn.denied.desc': 'Anda tidak berwenang menindaklanjuti pengiriman ini.',
      'asn.discrepancy.deferred.title': 'Penanganan selisih tertunda',
      'asn.discrepancy.deferred.desc': 'Terbuka saat rekonsiliasi penerimaan barang (menunggu kanal langsung).',
      // — Goods receipt verbs (ID stub — refined in the Phase 3′ ID-first sweep) —
      'gr.create.action': 'GR Baru',
      'gr.create.success.title': '{{grNumber}} diterima',
      'gr.create.success.desc': '{{correlationId}} tercatat. Inspeksi dicatat saat penerimaan.',
      'gr.create.failed.title': 'Tidak dapat membuat penerimaan barang',
      'gr.create.failed.desc': 'Penerimaan barang tidak dapat dibuat ({{reason}}).',
      'gr.dispose.success.title': '{{grNumber}} — {{disposition}}',
      'gr.dispose.success.desc': '{{correlationId}} tercatat. Disposisi header diturunkan dari baris yang diinspeksi.',
      'gr.dispose.failed.title': 'Tidak dapat menyelesaikan {{grNumber}}',
      'gr.dispose.failed.desc': 'Disposisi ditolak ({{reason}}).',
      'gr.dispose.missingReason': 'Alasan penolakan wajib diisi untuk menolak penerimaan ini.',
      'gr.post.action': 'Kirim ke SAP',
      'gr.post.posting.title': '{{grNumber}} mengirim ke SAP',
      'gr.post.posting.desc': 'Dikirim ke SAP — menunggu callback dokumen material. Belum ada dokumen.',
      'gr.post.posted.title': '{{grNumber}} terkirim ke SAP',
      'gr.post.posted.desc': 'SAP menetapkan dokumen material saat penyelesaian.',
      'gr.post.failed.title': 'Tidak dapat mengirim {{grNumber}}',
      'gr.post.failed.desc': 'Pengiriman ditolak ({{reason}}).',
      'gr.denied.title': 'Tidak berwenang',
      'gr.denied.desc': 'Anda tidak berwenang menindaklanjuti penerimaan barang ini.',
    },
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  returnNull: false,
});

export default i18n;
