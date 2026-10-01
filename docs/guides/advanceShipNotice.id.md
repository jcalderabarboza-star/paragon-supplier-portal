---
entity: advanceShipNotice
locale: id
title: Advance ship notice
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_asn_create
  - t_asn_submit
  - t_asn_in_transit
  - t_asn_deliver
  - t_asn_discrepancy
  - t_asn_resolve_discrepancy
---

<!-- section:summary -->
## 1 · Apa proses ini

Pemberitahuan awal dari pemasok bahwa barang sedang dalam perjalanan, beserta isinya. Inilah yang memungkinkan gudang menjadwalkan waktu bongkar, bukan mendadak menemukan truk di depan pintu. Advance ship notice (ASN) selalu bergantung pada satu pesanan pembelian yang **Confirmed**: pemasok membuat drafnya terhadap PO, mengisi siapa yang membawa barang, bagaimana menelusurinya, dan kapan harus ditunggu, lalu mengajukannya. Sejak saat itu pemberitahuan menjadi milik dunia logistik.

Dua kursi menyentuhnya. Kontak **pemenuhan** (fulfilment) pemasok membuat draf dan mengajukan (`/supplier/shipments`, **Pengiriman & ASN**). Jalur **penerimaan** (receiving) pembeli tidak pernah menyunting ASN, tetapi jalur inilah yang menuntaskan selisih — karena selisih hanya pernah dimunculkan oleh disposisi penerimaan barang, dan otoritas yang memunculkan masalah adalah otoritas yang menuntaskannya (`/buyer/goods-receipt`, **Selisih pengiriman → Rekonsiliasi**).

Penanda kejujuran: **In Transit** dan **Delivered** adalah fakta pengangkut milik **TMS** (INT-TMS-01); tidak ada yang menekannya di portal dan baris demo dalam status itu adalah **fixture TERSIMULASI**. **Discrepancy** tidak dinyatakan oleh siapa pun — ia adalah rantai (cascade) yang menyala ketika penerima menolak atau menyetujui sebagian sebuah penerimaan. Tombol **Ekspor EDI 856** dan tab **Janji Temu Dermaga** hanya tampilan (toast ekspor menyatakan tidak ada berkas yang dibuat; teks dermaga adalah salinan statis). Baris meta halaman membawa penanda provenans: buat dan ajukan benar-benar dikirim; PO yang menjadi dasar pengiriman adalah fixture.

<!-- section:lifecycle -->
## 2 · Perjalanan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Draft | tindakan operator · pembuatan | pemasok · pemenuhan | `t_asn_create` |
| 2 | Draft → Submitted | tindakan operator | pemasok · pemenuhan | `t_asn_submit` |
| 3 | Submitted → In Transit | fakta eksternal (TMS) | otomasi | `t_asn_in_transit` |
| 4 | In Transit → Delivered | fakta eksternal (TMS) | otomasi | `t_asn_deliver` |
| 5 | Submitted, In Transit, Delivered → Discrepancy | rantai (dari `t_gr_reject` / `t_gr_partial_approve`) | otomasi (atom `asn:flag`, dipegang penerimaan) | `t_asn_discrepancy` |
| 6 | Discrepancy → Delivered | tindakan operator | pembeli · penerimaan | `t_asn_resolve_discrepancy` |
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:48-159 -->

Mesin ini **tidak mendeklarasikan terminal**: setiap status setelah `Draft` punya jalan keluar (`Delivered` ditinggalkan oleh rantai selisih; `Discrepancy` ditinggalkan oleh rekonsiliasi).

**Percabangan**

- **Di Submitted:** `t_asn_in_transit` — TMS — saat umpan pengangkut melaporkan keberangkatan; `t_asn_discrepancy` — rantai — saat penerima sudah mendisposisi penerimaan terhadap ASN ini dengan ketidaksesuaian (ASN yang masih `Submitted` pada saat itu sudah tidak konsisten dengan penerimaannya sendiri).
- **Di In Transit:** `t_asn_deliver` — TMS — saat umpan pengangkut melaporkan penyerahan; `t_asn_discrepancy` — rantai — seperti di atas.
- **Di Delivered:** `t_asn_discrepancy` — rantai — kasus biasa: barang diterima dan penerimaan menemukan ketidaksesuaian.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_asn_create — Buat ASN <!-- transition:t_asn_create -->

- **Jenis langkah:** tindakan operator · pembuatan
- **Peran:** pemasok · pemenuhan (atom `asn:create`)
- **Dari → ke:** ∅ → Draft
- **Operator — di mana:** `/supplier/shipments` (**Pengiriman & ASN**) → dua pintu:
  1. Tab **Pengiriman Saya** → panel kuning "N pesanan pembelian terkonfirmasi menunggu ASN" → **Buat ASN** pada baris PO. Ini membuat draf ASN kosong (kurir, pelacakan, dan ETA kosong) dan menempatkannya di daftar sebagai `Draft`.
  2. Tab **Buat ASN** → wizard tiga langkah **Pilih PO → Detail pengiriman → Konfirmasi & ajukan** → **Kirim ASN**. Pintu ini membuat draf **dan** mengajukan sekaligus (lihat `t_asn_submit`).
- **Operator — lakukan:** mulai memberi tahu Paragon apa yang akan dikirim, selagi rinciannya masih bisa diubah pemasok. Pilih PO terkonfirmasi; penyimpanan menetapkan nomor ASN dan menyalin baris PO (kuantitas dikirim bawaan sama dengan kuantitas dipesan).
- **Operator — isi:** `poReference` — nomor PO terkonfirmasi (dipilih, tidak pernah diketik). Pintu wizard juga membawa kurir, nomor pelacakan, dan ETA ke dalam draf.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** toast **"ASN-… dibuat — Draf dibuat dari PO-…. <correlationId> tercatat."**; daftar menampilkan baris baru dengan chip `Draf` dan tombol **Kirim**; ubin KPI **Draf** bertambah; PO meninggalkan panel "menunggu ASN". Di sisi pembeli ASN baru terlihat oleh wizard `/buyer/goods-receipt` setelah berstatus Submitted, In Transit, atau Delivered.
- **Penguji — peristiwa pemicu:** `t_asn_create`
- **Pemeriksaan yang dapat menolak:** `asn_create_po_confirmed` — PO induk harus ada dan berstatus `Confirmed` ("PO PO-… is not Confirmed" jika tidak). Sebelum itu, cakupan pembuatan: pemasok PO harus sama dengan pemasok kursi, atau dispatcher melempar `SCOPE_DENIED`.
- **Glosarium:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** panel "menunggu ASN" hanya memuat PO terkonfirmasi yang **belum** punya ASN; langkah **Pilih PO** di wizard memuat **setiap** PO terkonfirmasi milik pemasok, sehingga ASN kedua untuk PO yang sama mungkin dibuat lewat wizard. Kursi tanpa `asn:create` melihat **Menunggu Pemenuhan Pemasok** di baris PO dan sama sekali tidak melihat tab **Buat ASN** (tab itu memerlukan atom buat dan ajukan sekaligus). Gudang tujuan dan suhu pada draf adalah nilai contoh tetap yang ditulis penyimpanan.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:49-61; src/services/data/mock/MockCommandService.ts:171-233; src/pages-v2/SupplierShipments.tsx:252-307,697-728,769-813,1204-1211; src/services/query/commandHooks.ts:254-272; src/lib/i18n.ts:994-999 -->

### t_asn_submit — Kirim ASN <!-- transition:t_asn_submit -->

- **Jenis langkah:** tindakan operator
- **Peran:** pemasok · pemenuhan (atom `asn:submit`)
- **Dari → ke:** Draft → Submitted
- **Operator — di mana:** `/supplier/shipments` → **Pengiriman Saya** → **Kirim** pada baris `Draft` → panel samping **Kirim ASN-…** → isi **Kurir**, **Nomor pelacakan**, **Perkiraan tiba** → **Kirim ASN**. Atau langkah terakhir wizard (**Konfirmasi & ajukan → Kirim ASN**), yang mengajukan draf yang baru saja dibuatnya.
- **Operator — lakukan:** menyerahkan rincian pengapalan ke gudang Paragon — siapa yang membawa, bagaimana menelusurinya, dan kapan harus ditunggu. Baris pengantar menyebut PO-nya ("Isi kurir, nomor pelacakan, dan ETA untuk PO-…").
- **Operator — isi:** `carrier` (pilihan; kurir contoh plus **Lainnya**), `trackingNumber` (teks bebas), `eta` (tanggal). Ketiganya diwajibkan mesin. Wizard juga mewajibkan tanggal kirim dan nomor batch sebelum mengizinkan Anda mencapai langkah terakhir, serta kotak centang "Saya mengonfirmasi semua detail pengiriman akurat…"; kolom tambahan itu tidak dikirim ke mesin.
- **Penguji — status yang diharapkan:** Submitted
- **Penguji — konfirmasi:** toast **"ASN-… dikirim — <correlationId> tercatat. Transmisi WMS menunggu kanal langsung."**; chip baris berbunyi `Diajukan`, kolom kurir / pelacakan / ETA terisi, ubin KPI **Diajukan** bertambah dan tombol **Kirim** hilang. Di sisi pembeli ASN kini muncul di `/buyer/goods-receipt` → **GR Baru** → **Pemilihan sumber** (berlabel "No dock appointment · Scheduled via TMS") dan dikenali di **Masukkan nomor ASN**.
- **Penguji — peristiwa pemicu:** `t_asn_submit`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib — kurir, nomor pelacakan, atau ETA yang kosong ditolak sebagai `MISSING_FIELDS`, dan panel menampilkan "Kurir, nomor pelacakan, dan ETA wajib diisi. (…)" dengan menyebut kunci yang kurang.
- **Glosarium:** `MISSING_FIELDS`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** "Transmisi WMS menunggu kanal langsung" adalah pengakuan toast itu sendiri: tidak ada yang ditransmisikan ke sistem gudang. **Ekspor EDI 856** hanya toast ("Tidak ada berkas yang dibuat"). Kursi tanpa `asn:submit` melihat **Menunggu Pemenuhan Pemasok** di sel tindakan baris.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:62-72; src/pages-v2/SupplierShipments.tsx:387-401,647-695,758-764,1261-1331; src/services/query/commandHooks.ts:280-298; src/lib/i18n.ts:1000-1009; src/lib/i18n/supplierShipments.ts:331-332 -->

### t_asn_in_transit — Pengangkut melaporkan keberangkatan (TMS) <!-- transition:t_asn_in_transit -->

- **Jenis langkah:** fakta eksternal (TMS)
- **Peran:** otomasi (TMS memiliki tindakan ini; atom `asn:carry`, tidak dipegang jalur mana pun)
- **Dari → ke:** Submitted → In Transit
- **Operator — di mana:** tidak ada yang menekan ini di portal. Umpan pengangkut melaporkan keberangkatan (INT-TMS-01).
- **Operator — lakukan:** tidak ada di sini. Barang sudah meninggalkan pemasok; sejak titik ini tanggal kedatangan menjadi urusan logistik, bukan lagi urusan produksi.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** In Transit
- **Penguji — konfirmasi:** hanya fixture (`ASN-2025-00211`, `ASN-2025-00301`) — chip `Dalam Perjalanan` (nada peringatan) dan ubin KPI **Dalam Perjalanan**; wizard GR pembeli memuatnya di **Pemilihan sumber**.
- **Penguji — peristiwa pemicu:** `t_asn_in_transit` (tidak dipancarkan oleh permukaan mana pun)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** tidak ada yang khusus.
- **Kejujuran:** TERSIMULASI. Tidak ada layar atau umpan di pohon ini yang memajukan ASN `Submitted`; penguji yang mengajukan draf akan melihatnya tetap `Submitted`. Inilah kata kerja yang dipakai komentar alur itu sendiri untuk menjelaskan bahwa "system" menggambarkan sambungannya, bukan tindakannya.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:73-92; src/services/data/mock/fixtures/supplierShipments.ts:86-95,178-190 -->

### t_asn_deliver — Pengangkut melaporkan penyerahan (TMS) <!-- transition:t_asn_deliver -->

- **Jenis langkah:** fakta eksternal (TMS)
- **Peran:** otomasi (TMS memiliki tindakan ini; atom `asn:carry`)
- **Dari → ke:** In Transit → Delivered
- **Operator — di mana:** tidak ada yang menekan ini di portal; pemasok yang secara fisik menyerahkannya juga tidak menekannya.
- **Operator — lakukan:** tidak ada di sini. Barang sampai di Paragon; pemberitahuan ini berhenti menjadi perkiraan dan menjadi acuan yang bisa dicocokkan tim penerimaan.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Delivered
- **Penguji — konfirmasi:** hanya fixture (`ASN-2025-00198`, `ASN-2025-00302`) — chip `Terkirim` (nada sukses) dan ubin KPI **Terkirim**. `Delivered` juga tempat mendaratnya selisih yang telah direkonsiliasi.
- **Penguji — peristiwa pemicu:** `t_asn_deliver` (tidak dipancarkan oleh permukaan mana pun)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** tidak ada yang khusus.
- **Kejujuran:** TERSIMULASI. Penerimaan barang yang dibuat di portal **tidak** menandai ASN sebagai terkirim; penerimaan dan fakta pengangkut adalah dokumen yang berbeda.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:93-110; src/services/data/mock/fixtures/supplierShipments.ts:109-119,203-216 -->

### t_asn_discrepancy — Penerimaan menandai pemberitahuan <!-- transition:t_asn_discrepancy -->

- **Jenis langkah:** kaskade (rantai)
- **Peran:** otomasi (dijalankan dengan hak otomasi; atom `asn:flag` milik pembeli · penerimaan)
- **Dari → ke:** Submitted, In Transit, Delivered → Discrepancy
- **Operator — di mana:** tidak ada yang menekan ini. Ia menyala ketika penerimaan barang milik penerima terhadap ASN ini mendarat di `t_gr_reject` atau `t_gr_partial_approve` (`/buyer/goods-receipt` → langkah terakhir wizard GR). Dispatcher menyebarkannya ke ASN yang disebut `asnNumber` pada penerimaan.
- **Operator — lakukan:** tidak ada secara langsung. Yang datang tidak sesuai dengan yang diberitahukan; ini mengikuti temuan tim penerimaan, dan menjadi tanda bagi pemasok bahwa ada yang harus dijelaskan.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Discrepancy
- **Penguji — konfirmasi:** di `/supplier/shipments` chip baris berbunyi `Selisih` (nada bahaya), ubin KPI **Selisih** menghitungnya, dan sel tindakan berbunyi **Menunggu Penerimaan**; di `/buyer/goods-receipt` bagian **Selisih pengiriman** muncul di atas tab yang memuat ASN itu dengan tombol **Rekonsiliasi**. Peristiwa audit membawa `causationId` = id korelasi penerimaan.
- **Penguji — peristiwa pemicu:** `t_asn_discrepancy` (dipicu oleh `t_gr_reject` / `t_gr_partial_approve`)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib — dan rantai berjalan di dalam `catch {}`, sehingga penolakan (ASN yang masih `Draft`, atau nomor ASN yang tidak ada di penyimpanan) diam-diam menjadi tanpa efek; penerimaan itu sendiri tetap selesai.
- **Glosarium:** `ILLEGAL_TRANSITION`, `NOT_FOUND` (kasus tanpa efek yang diam).
- **Kejujuran:** untuk melihatnya menyala dalam demo, penerimaan harus dibuat **terhadap ASN di penyimpanan** (`ASN-2025-…`). Pengiriman dermaga yang dimuat wizard GR (`ASN-2026-0xx`) tidak ada di penyimpanan ASN, sehingga penolakan terhadap salah satunya berantai ke kehampaan. `ASN-2025-00201` yang diunggulkan sudah berada di `Discrepancy` untuk jalur rekonsiliasi.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:111-128; src/services/transitions/cascades.ts:24-30; src/services/data/mock/MockCommandService.ts:2884-2889; src/pages-v2/SupplierShipments.tsx:402-421; src/pages-v2/BuyerGoodsReceipt.tsx:845-870 -->

### t_asn_resolve_discrepancy — Rekonsiliasi <!-- transition:t_asn_resolve_discrepancy -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · penerimaan (atom `asn:flag`)
- **Dari → ke:** Discrepancy → Delivered
- **Operator — di mana:** `/buyer/goods-receipt` (**Penerimaan Barang & Kontrol Kualitas**) → bagian **Selisih pengiriman** ("Disposisi penerimaan menandai pemberitahuan pengiriman berikut. Rekonsiliasi masing-masing untuk mengembalikannya ke Terkirim.") → **Rekonsiliasi** pada baris ASN (menampilkan **Merekonsiliasi…** selagi diproses).
- **Operator — lakukan:** mencatat bahwa ketidaksesuaiannya sudah dibicarakan dan dituntaskan, sehingga pemberitahuan ini tidak lagi menumpuk sebagai perkara terbuka. Penerima yang melakukannya, bukan pemasok — tidak ada jalur pemasok yang memegang `asn:flag`.
- **Operator — isi:** tidak ada yang diisi — sengaja tanpa muatan; penerimaan yang memunculkan selisih sudah mencatat alasannya.
- **Penguji — status yang diharapkan:** Delivered
- **Penguji — konfirmasi:** toast **"ASN-… direkonsiliasi — Pengiriman kembali ke status Terkirim."**; baris meninggalkan bagian **Selisih pengiriman** (bagian itu hilang bila kosong); di `/supplier/shipments` chip berbunyi `Terkirim` dan ubin **Selisih** berkurang.
- **Penguji — peristiwa pemicu:** `t_asn_resolve_discrepancy`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** ia mendarat di `Delivered` apa pun status ASN saat ditandai — mesin tidak mengingat status sebelumnya, dan selisih hanya pernah dimunculkan oleh penerimaan, yang hanya ada untuk barang yang sudah tiba. Kursi pembeli di luar **penerimaan** melihat **Menunggu Penerimaan** di sel tombol; baris milik pemasok menampilkan penantian yang sama.
<!-- src: src/services/transitions/flows/advanceShipNotice.flow.ts:129-158; src/pages-v2/BuyerGoodsReceipt.tsx:290-340,871-936; src/services/query/commandHooks.ts:323-346; src/lib/i18n/goodsReceipt.ts:530-543 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Dua pintu menuju draf (di ∅).** Cabang A — panel "menunggu ASN" → **Buat ASN** — **Kapan:** pemasok ingin draf sekarang dan rincian kurir nanti. Cabang B — wizard tab **Buat ASN** — **Kapan:** pemasok sudah memegang kurir, pelacakan, ETA, tanggal kirim, dan nomor batch; wizard membuat draf dan mengajukan dalam satu klik.
- **Meninggalkan Submitted / In Transit.** Cabang A — `t_asn_in_transit` / `t_asn_deliver` — **Kapan:** TMS melaporkan pergerakan (tidak pernah dalam demo). Cabang B — `t_asn_discrepancy` — **Kapan:** penerima menolak atau menyetujui sebagian penerimaan terhadap ASN ini sebelum umpan pengangkut menyusul.
- **Discrepancy (jalur pengecualian).** Dimasuki hanya lewat rantai. Jalan keluar — `t_asn_resolve_discrepancy` — **Kapan:** penerimaan puas bahwa ketidaksesuaian sudah dijelaskan; kembali ke `Delivered`, tidak pernah ke `Submitted` atau `In Transit`.
- **Tidak ada pembatalan atau penarikan** untuk ASN, dan tidak ada cara di sisi pemasok untuk menyunting pemberitahuan yang sudah diajukan.

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Chip / ubin KPI Selisih | dimunculkan operator (oleh disposisi penerima, lewat rantai) | Discrepancy | ASN ditandai oleh `t_gr_reject` / `t_gr_partial_approve` | chip baris dan ubin **Selisih** di `/supplier/shipments`; bagian **Selisih pengiriman** di `/buyer/goods-receipt` |
| "N pesanan pembelian terkonfirmasi menunggu ASN" | diturunkan saat dibaca | (sisi PO) Confirmed | PO terkonfirmasi milik pemasok belum dirujuk ASN mana pun | panel kuning di atas daftar `/supplier/shipments` |
| Menunggu Pemenuhan Pemasok | diturunkan saat dibaca (serah terima) | ∅, Draft | kursi tidak memegang `asn:create` / `asn:submit` | tindakan baris PO; tindakan baris Draft; badan wizard bila dipersempit di tengah alur |
| Menunggu Penerimaan | diturunkan saat dibaca (serah terima) | Discrepancy | kursi tidak memegang `asn:flag` (setiap kursi pemasok; kursi pembeli di luar penerimaan) | sel tindakan `/supplier/shipments`; sel rekonsiliasi `/buyer/goods-receipt` |
| Penanda provenans | penanda TERSIMULASI | semua | selalu | baris meta `/supplier/shipments` |
| Pemberitahuan janji temu dermaga | salinan statis | — | selalu | tab **Janji Temu Dermaga** (teks fixture; tidak ada yang menurunkannya) |
<!-- src: src/pages-v2/SupplierShipments.tsx:63-69,252-261,297-304,395-421,1191-1199,1236-1241; src/pages-v2/BuyerGoodsReceipt.tsx:871-936; src/lib/i18n/supplierShipments.ts:200-204,245-258 -->

Halaman ASN tidak menampilkan baris tindakan berikutnya; chip status dan pemberitahuan serah terima adalah satu-satunya petunjuk status di sisi pemasok.

<!-- section:linked -->
## 6 · Objek terkait

**Entitas perwakilan:** `ASN-2025-00201` (pemasok `sup-007`, status `Discrepancy`). Id sebuah ASN **adalah** nomornya; penyimpanan tidak punya kolom `id` terpisah.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pesanan pembelian | `poReference` = `PO-2025-00107` (`po-007`, Confirmed) | cakupan pembuatan diturunkan dari `supplierId` PO ini; `asn_create_po_confirmed` membaca statusnya |
| Pemasok | `supplierId` = `sup-007` | pemilik cakupan untuk setiap perintah berikutnya pada ASN |
| Penerimaan barang | `asnNumber` GR = nomor ASN | kunci rantai: `t_gr_reject` / `t_gr_partial_approve` menyebar ke `gr.asnNumber`. Tidak ada GR yang diunggulkan merujuk `ASN-2025-00201` (GR unggulan merujuk pengiriman `ASN-2026-0xx`), sehingga selisih baris ini ditulis, bukan dihasilkan |
| Item baris | `lineItems[]` (`materialCode`, `orderedQty`, `shippedQty`, `lotNumber`) | disalin dari PO saat pembuatan; hook `gr_inspection_materials_declared` di wizard GR memeriksa baris penerimaan terhadap ini |
| `carrier`, `trackingNumber`, `eta` | ditulis oleh `t_asn_submit` | draf fixture memuat placeholder `—` yang dikosongkan panel kirim |
| `details` (asal, gudang tujuan, karton, berat, suhu) | konstanta fixture / penyimpanan | hanya tampilan; kata kerja pembuatan menulis nilai contoh tetap |
| Pengiriman (`/buyer/shipments`, `mockShipments`) | tidak ada | dokumen yang **berbeda**: baris pengiriman membawa nomor `ASN-2026-0xx` yang tidak ada di penyimpanan ASN |
<!-- src: src/services/data/mock/fixtures/supplierShipments.ts:132-141; src/services/data/mock/MockCommandService.ts:192-226,313-362,2884-2889; src/pages-v2/BuyerGoodsReceipt.tsx:853-863 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap pengiriman perintah menulis satu `TransitionEvent` (`event`, `actor` = `supplier:<id>` atau `buyer:all`, `ts`, `outcome`, `correlationId`). `t_asn_discrepancy` yang berantai membawa `causationId` = id korelasi perintah penerimaan dan berjalan dengan hak otomasi; rantai yang ditolak tetap meninggalkan peristiwa `failed` beserta `reason`-nya. Tidak ada yang diselesaikan (settle) dalam alur ini.

Urutan kerja yang dapat dihasilkan penguji dari awal sampai akhir, mulai dari `po-002` (PO-2025-00102, `sup-002`, Confirmed, belum ada ASN):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Draft | pemasok · pemenuhan (`supplier:sup-002`) | **Buat ASN** pada baris menunggu-ASN | `t_asn_create` · done (nomor `ASN-…` baru dikembalikan) |
| T+1 | Draft → Submitted | pemasok · pemenuhan (`supplier:sup-002`) | **Kirim** → kurir, pelacakan, ETA → **Kirim ASN** | `t_asn_submit` · done |
| T+2 | Submitted → In Transit → Delivered | TMS | tidak dapat direproduksi di portal | `t_asn_in_transit` / `t_asn_deliver` |
| T+3 | Submitted → Discrepancy | otomasi (rantai; `causationId` = id korelasi GR) | penerima membuat GR lewat **Masukkan nomor ASN** dengan ASN ini, menolak satu baris, menekan **Buat GR** | `t_asn_discrepancy` · done |
| T+4 | Discrepancy → Delivered | pembeli · penerimaan (`buyer:all`) | **Rekonsiliasi** | `t_asn_resolve_discrepancy` · done |
<!-- src: src/services/transitions/events.ts:25-129; src/services/transitions/dispatcher.ts:453-473; src/services/data/mock/MockCommandService.ts:2884-2889 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| "Tidak dapat membuat ASN — Sebuah aturan yang mengatur menolak tindakan ini (…asn_create_po_confirmed: PO … is not Confirmed)" | toast kesalahan | PO belum `Confirmed` | konfirmasi PO dulu di **Pesanan Saya** |
| "Ini di luar jangkauan akun Anda — atau memang tidak ada datanya" | kesalahan (`SCOPE_DENIED`) | PO yang disebut milik pemasok lain, atau pemiliknya tidak dapat diselesaikan | buat draf hanya terhadap PO terkonfirmasi milik Anda |
| "Tidak dapat mengirim ASN-… — Kurir, nomor pelacakan, dan ETA wajib diisi. (carrier,eta)" | toast peringatan yang menyebut kunci kosong (`MISSING_FIELDS`) | kolom wajib dibiarkan kosong (spasi dihitung kosong) | isi ketiganya lalu kirim lagi |
| **Menunggu Pemenuhan Pemasok** di tempat **Buat ASN** / **Kirim** seharusnya; tidak ada tab **Buat ASN** | pemberitahuan serah terima | kursi tidak memegang `asn:create` dan/atau `asn:submit` | gunakan kursi pemenuhan pemasok |
| Baris menampilkan **Menunggu Penerimaan** dan tidak ada yang bisa ditekan | baris Discrepancy di halaman pemasok | `asn:flag` adalah atom penerimaan | penerima merekonsiliasi di `/buyer/goods-receipt`; bicarakan ketidaksesuaian dengan mereka |
| ASN tetap `Submitted` selamanya | chip tidak berubah | In Transit / Delivered adalah fakta TMS tanpa umpan dalam demo | wajar; pembeli tetap dapat menerima terhadapnya |
| Menolak penerimaan tetapi tidak ada selisih yang muncul | baris pemasok tak berubah; tidak ada bagian **Selisih pengiriman** | GR dibuat dari pengiriman dermaga (`ASN-2026-0xx`), bukan ASN penyimpanan, atau ASN masih `Draft` | buat penerimaan lewat **Masukkan nomor ASN** dengan `ASN-2025-…` berstatus Submitted / In Transit / Delivered |
| "Dokumen tidak berada dalam status yang memungkinkan tindakan ini" pada **Rekonsiliasi** | toast (`ILLEGAL_TRANSITION`) | seseorang sudah merekonsiliasinya | muat ulang; bagian itu diturunkan kembali |
| **Ekspor EDI 856** tidak melakukan apa pun | toast "Tidak ada berkas yang dibuat" | ekspor belum tersambung ke sistem nyata | tidak ada; kontrol hanya tampilan |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SHP`; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Pengiriman & ASN"* | modul Pengiriman & ASN dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |
<!-- src: src/lib/glossary/refusals.glossary.ts:32-117; src/lib/i18n.ts:994-1011; src/pages-v2/SupplierShipments.tsx:672-680; src/services/data/mock/MockCommandService.ts:228-233 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Draft | `ASN-2025-00215` | ASN-2025-00215 | `sup-007`, PO-2025-00107; kurir/pelacakan/ETA berupa placeholder `—` — spesimen alami untuk **Kirim** |
| Submitted | tidak ada | — | capai dengan mengajukan `ASN-2025-00215` atau membuat draf baru dari `po-002` (PO-2025-00102, `sup-002`) |
| In Transit | `ASN-2025-00211`, `ASN-2025-00301` | ASN-2025-00211, ASN-2025-00301 | `sup-007` / PO-2025-00107 dan `sup-002` / PO-2025-00116; status TMS TERSIMULASI; dapat diterima oleh wizard GR pembeli |
| Delivered | `ASN-2025-00198`, `ASN-2025-00302` | ASN-2025-00198, ASN-2025-00302 | `sup-007` / PO-2025-00107 dan `sup-005` / PO-2025-00131; dapat diterima oleh wizard GR |
| Discrepancy | `ASN-2025-00201` | ASN-2025-00201 | `sup-007`, PO-2025-00107; spesimen **Rekonsiliasi** yang diunggulkan di `/buyer/goods-receipt` |
<!-- src: src/services/data/mock/fixtures/supplierShipments.ts:84-216; _derived/guidefacts.json (advanceShipNotice.fixtures) -->
