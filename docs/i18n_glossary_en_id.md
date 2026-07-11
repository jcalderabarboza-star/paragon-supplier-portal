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

## Batch 2 additions (WhatsApp hubs + Sourcing + RFQs)
Chrome terms; authentic channel message templates were NOT translated (D-2).

| EN | ID | EN | ID |
|---|---|---|---|
| Communications Hub | Pusat Komunikasi | Award (verb/CTA) | Menangkan |
| Communication Tools | Alat Komunikasi | Awarding (in progress) | Memenangkan |
| Conversation | Percakapan | Award / awarding (noun) | Pemenangan |
| Response | Respons | Awards History | Riwayat Pemenangan |
| Automation / Automated | Otomatisasi / Otomatis | Sourcing event | Acara Sourcing |
| Trigger | Pemicu | Quote / Quotation | Penawaran |
| Escalate | Eskalasi | Unit Price | Harga Satuan |
| Auto-Execute | Eksekusi Otomatis | Lead Time | Waktu Tunggu |
| Simulator / Simulated | Simulator / Simulasi | Reliability | Keandalan |
| Scenario | Skenario | Criterion | Kriteria |
| Inbox | Kotak Masuk | Deadline | Tenggat |
| Reply / Forward / Archive | Balas / Teruskan / Arsipkan | Estimated budget | Anggaran perkiraan |
| Deviation | Deviasi | UoM | Satuan |
| Bilingual | Dwibahasa | Quantity | Kuantitas |
| Official Account | Akun Resmi | Win rate | Tingkat kemenangan |
| Parser / Engine / Template | Pengurai / Mesin / Templat | Sustainability | Keberlanjutan |
| Read receipts | Tanda terima baca | Special requirements | Persyaratan khusus |
| Real-time | Waktu nyata | Evaluation criteria | Kriteria evaluasi |
| Free text | Teks bebas | Satisfaction | Kepuasan |
| Fastest / Slowest | Tercepat / Terlama | AI Composite | Komposit AI |
| Emulsifiers / Botanical | Pengemulsi / Botani | Auto-assigned | Otomatis |

**Language names:** English→Inggris, German→Jerman, Arabic→Arab, Portuguese→Portugis
(Mandarin, Bahasa Indonesia unchanged). **Kept as loanwords/codes:** Online, Bot,
Manual, Email, WhatsApp, WeChat, RFQ, PO, ASN, IBP, SAP, OTIF, Grade, Incoterms,
HTML, PDF, Mini Program, "Order Confirmation Key" (SAP field).

## Batch 3 additions (Requisitions + Orders + Goods Receipt + Discovery)

| EN | ID | EN | ID |
|---|---|---|---|
| Requestor | Pemohon | Quality Control | Kontrol Kualitas |
| Approver | Penyetuju | Rejection Rate | Tingkat Penolakan |
| Cost center | Pusat biaya | Disposition | Disposisi |
| Justification | Justifikasi | Warehouse | Gudang |
| Source of supply | Sumber pasokan | Visual Inspection | Inspeksi Visual |
| Procurement flow | Alur pengadaan | Packaging Integrity | Integritas Kemasan |
| Section Head | Kepala Seksi | Halal Seal Check | Pemeriksaan Segel Halal |
| Linked document | Dokumen tertaut | BPOM Lot Tracking | Pelacakan Lot BPOM |
| Cleared for sourcing | Siap untuk sourcing | Lab sample | Sampel lab |
| Converted to order | Dikonversi ke pesanan | Retest | Uji ulang |
| Bulk download | Unduh massal | Override hold | Timpa penahanan |
| Key facts | Fakta utama | Dock | Dermaga |
| Line items / Line total | Item baris / Total baris | Accepted | Disetujui |
| Track shipment | Lacak pengiriman | Region | Wilayah |
| Show / Hide | Tampilkan / Sembunyikan | Match Score | Skor Kecocokan |
| Communication history | Riwayat komunikasi | Dual-source | Sumber ganda |
| PO Created | PO Dibuat | Market validated by | Divalidasi pasar oleh |
| Acknowledged by Supplier | Diakui oleh Pemasok | Capability | Kapabilitas |
| Goods Received | Barang Diterima | Relevance | Relevansi |
| Payment Posted | Pembayaran Diposting | Covers | Mencakup |

**Regions:** Asia Pacific→Asia Pasifik, Europe→Eropa, Americas→Amerika, Middle
East→Timur Tengah. **Kept as codes/loanwords:** PR, PIR, OA, ME21N, S/4HANA (Phase
→Fase), cost-center codes (CC-…), UoM codes (KG/L/PCS/MT/BOX), warehouse/role codes.

### Known gap — priority/severity enums (cross-cutting, needs central map)
`High / Medium / Low / Critical` (priority, risk-level, qualification-status) render
untranslated in ID. They are a shared semantic vocabulary — like status labels but
excluded from `statusTone.ts` because their *tone* is context-dependent (severity vs
priority vs stock). Their *label* is not context-dependent, so the fix is a small
central priority/severity-label map (analogous to `statusLabel.ts`) resolved wherever
these chips render, rather than inconsistent per-page keys. Recommended as a dedicated
follow-up (touches Requisitions, Risk, Scorecard, Discovery, Inventory).
