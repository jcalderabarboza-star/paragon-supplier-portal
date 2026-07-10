# EN → ID Procurement Glossary (Odyssey term-base)

_Reference vocabulary for the Supplier Portal i18n sprint. Author ID copy to
match these terms so the Portal reads consistently with TMS and SOMO across the
Odyssey family._

## Provenance
Harvested from Seat 2's existing, shipped ID catalogs in sibling repos:
- `paragon-b8-i18n/apps/control-tower/messages/id.json` (~10.3k keys)
- `paragon-somo/apps/control-tower/src/lib/i18n/catalog/id.json` (~940 keys, most procurement-relevant)
- `Paragon-TMS-…/apps/control-tower/messages/id.json`, `tms-s1-i18n-plumbing/…`

⚠️ **Vocabulary reference only.** Those repos use **next-intl** (nested
`messages/*.json`, different key namespaces); this repo is **react-i18next
flat-key**. Do NOT import their files — reuse the terms, not the structure.
Terms below already match this repo's seeded ID keys (`i18n.ts`): `Pemasok`,
`Pesanan`, `Faktur`, `Portal Pemasok Paragon`, `Kurir`, `Nomor pelacakan`.

## Core domain nouns
| EN | ID | Notes |
|---|---|---|
| Supplier | Pemasok | not "pemasuk"/"vendor" |
| Buyer | Pembeli | |
| Purchase Order (PO) | Pesanan Pembelian | keep code "PO" in doc numbers |
| Purchase Requisition | Permintaan Pembelian | |
| Invoice | Faktur | matches seeded `invoice.*` keys |
| Contract | Kontrak | |
| Goods Receipt (GR) | Penerimaan Barang | |
| Shipment / Delivery | Pengiriman | |
| ASN (Advance Ship Notice) | ASN | keep acronym |
| Inventory | Inventaris | "Stok" for stock levels specifically |
| Stock | Stok | |
| RFQ / Sourcing | RFQ / Sumber | keep "RFQ" acronym |
| Marketplace | Pasar | |
| Storefront | Etalase | "Etalase Saya" = My Storefront |
| Document | Dokumen | |
| Carrier | Kurir | |
| Tracking number | Nomor pelacakan | |
| Procurement & Purchasing | Pengadaan & Pembelian | SOMO nav term |
| Compliance | Kepatuhan | |
| Performance | Kinerja | |
| Risk | Risiko | |
| Remittance advice | Bukti pembayaran | matches seeded `invoice.remittance.*` |
| Customs | Bea cukai | |
| Dispute | Sengketa (v. disengketakan) | |
| Three-way match | Pencocokan tiga arah | |

## Nav / section labels (as applied in Batch 0)
| EN | ID |
|---|---|
| Acquire / Transact / Settle / Intelligence | Pengadaan / Transaksi / Penyelesaian / Intelijen |
| Dashboard | Dasbor |
| Discovery | Penemuan |
| Suppliers | Pemasok |
| Inventory Visibility | Visibilitas Inventaris |
| Goods Receipt | Penerimaan Barang |
| Analytics | Analitik |
| Scorecard | Kartu Skor |
| WhatsApp Hub | Pusat WhatsApp |

## Status vocabulary (canonical → ID)
The full ~75-term status map is the SSoT in `src/lib/statusLabel.ts` (guard-tested
against `statusTone.ts`). Representative entries:

| EN | ID | EN | ID |
|---|---|---|---|
| Delivered | Terkirim | Draft | Draf |
| Approved | Disetujui | Sent | Dikirim |
| Rejected | Ditolak | Pending | Menunggu |
| Confirmed | Dikonfirmasi | In Transit | Dalam Perjalanan |
| Submitted | Diajukan | Overdue | Jatuh Tempo |
| Disputed | Disengketakan | Expired | Kedaluwarsa |
| Expiring | Akan Kedaluwarsa | Cancelled | Dibatalkan |
| Payment Released | Pembayaran Dirilis | Posted to SAP | Terkirim ke SAP |
| Completed | Selesai | Resolved | Diselesaikan |
| On Time | Tepat Waktu | Delayed | Terlambat |

**Loanwords kept as-is in ID:** `Onboarding`, `Normal`, `Manual`, `EDI 846`,
`ASN`, `RFQ`, `SAP`, `PO`.

## Conventions
- **Verbs → passive `di-` form** for state chips/toasts: approved → _disetujui_,
  rejected → _ditolak_, delivered → _terkirim_, confirmed → _dikonfirmasi_.
- **Currency:** `Rp` prefix, dot thousands (id-ID). Compact: `rb` (ribu), `jt`
  (juta), `M` (miliar), `T` (triliun) — note ID billion is **M**, not B.
- **Dates:** `dd MMM yyyy`, id-ID months (`Jan Feb Mar Apr Mei Jun Jul Agu Sep
  Okt Nov Des`), Asia/Jakarta.
- **Document numbers / codes / SAP refs stay verbatim** — never translated.

## Batch 1 additions (SupplierRegistration + BuyerContracts)
Terms introduced during page extraction, consistent with the conventions above.

| EN | ID | EN | ID |
|---|---|---|---|
| Contact person | Narahubung | Supply | Pasokan |
| Channel | Kanal | Service | Layanan |
| SME | UKM | Framework | Kerangka Kerja |
| Self-service | Swalayan | Quality | Kualitas |
| Supplier Code of Conduct | Kode Etik Pemasok | Pricing | Harga |
| Terms & Conditions | Syarat & Ketentuan | Both | Keduanya |
| Qualification | Kualifikasi | Raw Material | Bahan Baku |
| Category expansion | Perluasan kategori | Active Ingredient | Bahan Aktif |
| Other | Lainnya | Fragrance | Pewangi |
| All | Semua | Packaging | Kemasan |
| Renewal Pipeline | Alur Pembaruan | Obligation | Kewajiban |
| Auto-renewal | Perpanjangan otomatis | Performance score | Skor kinerja |
| Notice required | Pemberitahuan diperlukan | Lifecycle | Siklus hidup |

**Kept as loanwords / codes:** Onboarding, Vendor (where distinct from Pemasok),
NDA, Incoterms (FOB/CIF/EXW/DDP/FCA), payment-term codes (Net 30/45/60, Letter of
Credit, Advance Payment). `Active/Renewed/Terminated/Expiring/Expired/Draft` reuse
the status glossary (`Aktif/Diperbarui/Dihentikan/Akan Kedaluwarsa/Kedaluwarsa/Draf`).
