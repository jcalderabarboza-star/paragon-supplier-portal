// ────────────────────────────────────────────────────────────────────────────
// Central status-label map (Batch 0, SEAT2-I18N-CHROME-01).
//
// Every StatusPill across the portal renders its label through this map, so the
// ~75 canonical status terms localize from ONE place (translate-once). The EN
// value is the canonical string itself — so EN output is byte-identical to the
// pre-i18n hardcoded pills — and the ID value comes from the Odyssey procurement
// term-base (TMS/SOMO glossary, see docs/i18n_glossary_en_id.md).
//
// Tone still lives in statusTone.ts; this file is label only. The two stay in
// sync via CANONICAL_STATUSES (imported below) + the statusLabel guard test.
// ────────────────────────────────────────────────────────────────────────────

import { CANONICAL_STATUSES } from './statusTone';

// canonical EN status → Bahasa Indonesia. Keyed by the exact canonical string.
const STATUS_ID: Record<string, string> = {
  // positive
  Delivered: 'Terkirim',
  Closed: 'Ditutup',
  Completed: 'Selesai',
  Approved: 'Disetujui',
  'Payment Released': 'Pembayaran Dirilis',
  'Remittance Received': 'Bukti Pembayaran Diterima',
  'Posted to SAP': 'Terkirim ke SAP',
  Active: 'Aktif',
  Renewed: 'Diperbarui',
  Awarded: 'Dimenangkan',
  Valid: 'Berlaku',
  Matched: 'Cocok',
  Pass: 'Lulus',
  Resolved: 'Diselesaikan',
  Normal: 'Normal',
  'On Track': 'Sesuai Rencana',
  'PO Created': 'PO Dibuat',
  'On Time': 'Tepat Waktu',
  'In Network': 'Dalam Jaringan',
  'EDI 846': 'EDI 846',
  'Halal Certified': 'Bersertifikat Halal',
  // caution
  Expiring: 'Akan Kedaluwarsa',
  'Expiring Soon': 'Segera Kedaluwarsa',
  'Partially Delivered': 'Terkirim Sebagian',
  'Partially Approved': 'Disetujui Sebagian',
  'Pending Inspection': 'Menunggu Inspeksi',
  'Under Inspection': 'Sedang Diinspeksi',
  'Pending Approval': 'Menunggu Persetujuan',
  'In Progress': 'Sedang Berlangsung',
  'Customs Clearance': 'Proses Bea Cukai',
  'At Dock': 'Di Dok',
  Unloading: 'Bongkar Muat',
  'At Risk': 'Berisiko',
  Onboarding: 'Onboarding',
  Upcoming: 'Mendatang',
  Delayed: 'Terlambat',
  'Needs Attention': 'Perlu Perhatian',
  // critical
  Overdue: 'Jatuh Tempo',
  Disputed: 'Disengketakan',
  Rejected: 'Ditolak',
  Reject: 'Tolak',
  Expired: 'Kedaluwarsa',
  'Quality Hold': 'Tahan Mutu',
  Cancelled: 'Dibatalkan',
  Blocked: 'Diblokir',
  Fail: 'Gagal',
  Missing: 'Hilang',
  Discrepancy: 'Selisih',
  'Qty Mismatch': 'Selisih Kuantitas',
  'Price Variance': 'Varians Harga',
  Suspended: 'Ditangguhkan',
  'Not Awarded': 'Tidak Dimenangkan',
  // info
  Confirmed: 'Dikonfirmasi',
  Acknowledged: 'Diakui',
  Submitted: 'Diajukan',
  'In Transit': 'Dalam Perjalanan',
  'ASN Received': 'ASN Diterima',
  'Arrived at Port': 'Tiba di Pelabuhan',
  Open: 'Terbuka',
  'API Push': 'Kiriman API',
  Inbound: 'Masuk',
  'BPOM Registered': 'Terdaftar BPOM',
  // neutral
  Draft: 'Draf',
  Sent: 'Dikirim',
  Viewed: 'Dilihat',
  'Pending ASN': 'Menunggu ASN',
  'Pending Match': 'Menunggu Pencocokan',
  'Pending GR': 'Menunggu GR',
  Pending: 'Menunggu',
  'Awaiting Upload': 'Menunggu Unggahan',
  'Sourcing Event': 'Acara Sourcing',
  'N/A': 'T/A',
  Excess: 'Berlebih',
  Terminated: 'Dihentikan',
  'Under Review': 'Sedang Ditinjau',
  Manual: 'Manual',
  Outbound: 'Keluar',
};

/** Slug a canonical status into its i18n key: "Payment Released" → "status.payment_released". */
function slug(status: string): string {
  return (
    'status.' +
    status
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

/**
 * The i18n key for a status label, or null if the label is not part of the
 * shared canonical vocabulary (StatusPill then renders it verbatim). Trims and
 * matches the exact canonical casing.
 */
export function statusLabelKey(label: string): string | null {
  const key = label.trim();
  return key in STATUS_ID ? slug(key) : null;
}

/** i18n resource fragments — spread into the en/id translation namespaces. */
export const statusResourcesEn: Record<string, string> = Object.fromEntries(
  CANONICAL_STATUSES.map((s) => [slug(s), s]),
);
export const statusResourcesId: Record<string, string> = Object.fromEntries(
  CANONICAL_STATUSES.map((s) => [slug(s), STATUS_ID[s] ?? s]),
);

// Re-exported for the guard test (coverage + slug-collision checks).
export const __statusInternals = { STATUS_ID, slug };
