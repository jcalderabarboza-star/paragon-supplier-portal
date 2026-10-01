---
entity: goodsReceiptLine
locale: id
title: Baris penerimaan barang
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_grline_inspect
  - t_grline_accept
  - t_grline_reject
  - t_grline_quarantine
  - t_grline_release
  - t_grline_return
---

<!-- section:summary -->
## 1 · Apa proses ini

Putusan per barang di balik hasil keseluruhan sebuah kiriman. Mutu kiriman hanya sebaik barang terburuknya, dan di sinilah hal itu diputuskan. Setiap baris penerimaan barang dimodelkan sebagai mesin kecilnya sendiri — diperiksa, lalu diterima, ditolak, dikarantina, dilepaskan, atau dikembalikan — dan status header penerimaan (Approved / Partially Approved / Rejected) didefinisikan sebagai **gulungan** (rollup) dari status baris-baris ini, tidak pernah sebagai nilai yang ditegaskan terpisah.

**Proses ini dimodelkan, tidak aktif.** Alurnya ditulis dan terdaftar (kosakatanya tervalidasi dan tampil di `/buyer/process-flows` dengan lencana ditulis-belum-tersambung), tetapi **tidak punya target perintah**: tidak satu pun dari enam kata kerjanya dapat dikirim, tidak ada layar yang menawarkannya, dan tidak ada penyimpanan yang memegang baris sebagai entitas yang dapat dialamatkan. Yang dilakukan portal hari ini adalah mencatat **fakta** inspeksi per baris saat penerimaan dibuat (langkah `Pemeriksaan kualitas` di wizard GR) dan menurunkan status tiap baris dari fakta itu (`Pending` / `Accepted` / `Rejected` / `Partial`) untuk menggulung header. Pemilik tindakan, dalam arti yang dipakai registri ini, adalah **substrat**: mesin baris adalah skema tempat legalitas header dibuktikan, dan perintah per baris ditunda sampai ada permukaan penyuntingan tingkat baris. Jalur yang akan memegang kata kerjanya adalah **penerimaan** (receiving) pembeli (`gr:inspect` untuk memeriksa dan menahan, `gr:disposition` untuk setiap kata kerja yang mendarat pada hasil).

**Tidak ada fixture** untuk baris — fixture GR membawa baris `inspectionResults`, bukan dokumen baris — dan tidak ada yang TERSIMULASI dalam demo pada butir ini karena tidak ada yang menampilkan status mesin sebuah baris.

<!-- section:lifecycle -->
## 2 · Perjalanan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | Pending → Inspected | dimodelkan, tidak aktif (tanpa target) | pembeli · penerimaan (`gr:inspect`) | `t_grline_inspect` |
| 2a | Inspected → Accepted | dimodelkan, tidak aktif (tanpa target) | pembeli · penerimaan (`gr:disposition`) | `t_grline_accept` |
| 2b | Inspected, Quarantined → Rejected | dimodelkan, tidak aktif (tanpa target) | pembeli · penerimaan (`gr:disposition`) | `t_grline_reject` |
| 2c | Inspected → Quarantined | dimodelkan, tidak aktif (tanpa target) | pembeli · penerimaan (`gr:inspect`) | `t_grline_quarantine` |
| 3 | Quarantined → Accepted | dimodelkan, tidak aktif (tanpa target) | pembeli · penerimaan (`gr:disposition`) | `t_grline_release` |
| 2d | Inspected → Returned | dimodelkan, tidak aktif (tanpa target) | pembeli · penerimaan (`gr:disposition`) | `t_grline_return` |
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:19-135 -->

Terminal: `Accepted`, `Rejected`, `Returned`. `Quarantined` adalah status penahanan dengan dua jalan keluar, sengaja bukan terminal. `Pending` tidak punya kata kerja pembuatan — baris lahir bersama penerimaannya.

**Percabangan**

- **Di Inspected:** `t_grline_accept` — penerimaan — saat barang layak pakai; `t_grline_reject` — penerimaan — saat tidak layak, disertai alasan; `t_grline_quarantine` — penerimaan — saat meragukan dan harus dijauhkan dari produksi sampai diputuskan; `t_grline_return` — penerimaan — saat dikembalikan ke pemasok alih-alih dibuang atau disimpan.
- **Di Quarantined:** `t_grline_release` — penerimaan — saat pemeriksaan kedua menyelesaikan keraguan dengan hasil yang menguntungkan barang itu; `t_grline_reject` — penerimaan — saat pemeriksaan kedua memastikan barang tidak layak pakai.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_grline_inspect — Memeriksa barang <!-- transition:t_grline_inspect -->

- **Jenis langkah:** dimodelkan, tidak aktif (tanpa target)
- **Peran:** pembeli · penerimaan (atom `gr:inspect`)
- **Dari → ke:** Pending → Inspected
- **Operator — di mana:** tidak disediakan di mana pun hari ini. Yang paling mendekati adalah langkah **Pemeriksaan kualitas** di wizard GR pada `/buyer/goods-receipt`, yang mencatat dua fakta yang sama per baris saat pembuatan.
- **Operator — lakukan:** seseorang memeriksa satu barang secara fisik — kondisi dan kemasannya — lalu menuliskan apa yang dilihatnya.
- **Operator — isi:** akan memerlukan `visualCheck` dan `packagingCheck`.
- **Penguji — status yang diharapkan:** Inspected — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_grline_inspect` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** alur substrat, tanpa target perintah. Gulungan memperlakukan baris sebagai masih tertunda hanya selagi kedua pemeriksaan `Pending` dan belum ada yang diterima atau ditolak.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:31-41; src/services/transitions/grRollup.ts:18-22 -->

### t_grline_accept — Menerima barang <!-- transition:t_grline_accept -->

- **Jenis langkah:** dimodelkan, tidak aktif (tanpa target)
- **Peran:** pembeli · penerimaan (atom `gr:disposition`)
- **Dari → ke:** Inspected → Accepted (terminal)
- **Operator — di mana:** tidak disediakan di mana pun hari ini.
- **Operator — lakukan:** menyatakan barang layak pakai; ia menambah bobot agar kirimannya bisa diloloskan secara utuh.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Accepted — tidak dapat dicapai lewat perintah. Gulungan menurunkan baris sebagai Accepted bila kuantitas disetujuinya di atas nol, tidak ada yang ditolak, dan tidak ada pemeriksaan yang gagal.
- **Penguji — konfirmasi:** hanya secara tidak langsung: penerimaan yang setiap barisnya diturunkan Accepted tergulung ke `Approved`.
- **Penguji — peristiwa pemicu:** `t_grline_accept` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; `UNKNOWN_ENTITY` lebih dulu.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** alur substrat, tanpa target perintah.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:42-52; src/services/transitions/grRollup.ts:30-32 -->

### t_grline_reject — Menolak barang <!-- transition:t_grline_reject -->

- **Jenis langkah:** dimodelkan, tidak aktif (tanpa target)
- **Peran:** pembeli · penerimaan (atom `gr:disposition`)
- **Dari → ke:** Inspected, Quarantined → Rejected (terminal)
- **Operator — di mana:** tidak disediakan di mana pun hari ini. Kuantitas **Ditolak** dan **Alasan Penolakan** per baris di wizard mencatat fakta yang sama saat pembuatan.
- **Operator — lakukan:** menyatakan barang tidak layak pakai, disertai alasannya. Satu barang seperti ini sudah cukup membuat kirimannya tidak bisa diloloskan seluruhnya. Ini juga hasil gagal dari pemeriksaan kedua sebuah karantina, itulah sebabnya `Quarantined` menjadi status asal.
- **Operator — isi:** akan memerlukan `rejectionReason`.
- **Penguji — status yang diharapkan:** Rejected — tidak dapat dicapai lewat perintah. Gulungan menurunkan baris sebagai Rejected bila tidak ada yang disetujui dan ada yang ditolak atau pemeriksaan gagal.
- **Penguji — konfirmasi:** secara tidak langsung: semua baris Rejected menggulung header ke `Rejected`; campuran menggulungnya ke `Partially Approved`.
- **Penguji — peristiwa pemicu:** `t_grline_reject` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; `UNKNOWN_ENTITY` lebih dulu.
- **Glosarium:** `UNKNOWN_ENTITY`, `MISSING_FIELDS`.
- **Kejujuran:** alur substrat, tanpa target perintah.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:53-71; src/services/transitions/grRollup.ts:24-31 -->

### t_grline_quarantine — Menyisihkan barang <!-- transition:t_grline_quarantine -->

- **Jenis langkah:** dimodelkan, tidak aktif (tanpa target)
- **Peran:** pembeli · penerimaan (atom `gr:inspect`)
- **Dari → ke:** Inspected → Quarantined
- **Operator — di mana:** tidak disediakan di mana pun hari ini.
- **Operator — lakukan:** menyisihkan barang sampai ada yang memutuskan — belum boleh dipakai, belum juga ditolak. Ini menjaga stok yang meragukan tetap jauh dari produksi.
- **Operator — isi:** akan memerlukan `holdReason`.
- **Penguji — status yang diharapkan:** Quarantined — tidak dapat dicapai. Kosakata gulungan tidak punya status karantina, sehingga tidak ada penerimaan hari ini yang menurunkan baris sebagai ditahan.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi.
- **Penguji — peristiwa pemicu:** `t_grline_quarantine` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; `UNKNOWN_ENTITY` lebih dulu.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** alur substrat, tanpa target perintah. Label disposisi "Quarantine" pada fixture `gr-007` adalah string fixture tingkat header, bukan status baris.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:72-82; src/services/transitions/grRollup.ts:15; src/data/mockGoodsReceipts.ts:246 -->

### t_grline_release — Melepaskan barang yang ditahan <!-- transition:t_grline_release -->

- **Jenis langkah:** dimodelkan, tidak aktif (tanpa target)
- **Peran:** pembeli · penerimaan (atom `gr:disposition` — sengaja bukan `gr:inspect`, sehingga kursi yang boleh menahan tetapi tidak boleh mendisposisi tidak punya pintu belakang menuju terminal yang lolos)
- **Dari → ke:** Quarantined → Accepted (terminal)
- **Operator — di mana:** tidak disediakan di mana pun hari ini.
- **Operator — lakukan:** pemeriksaan kedua menyelesaikan keraguan itu dengan hasil yang menguntungkan, sehingga barangnya berhenti ditahan dan bergabung dengan stok yang boleh dipakai pabrik. Ia mendarat di terminal yang lolos, bukan kembali ke inspeksi ulang, karena uji ulang itulah pemeriksaan ulangnya.
- **Operator — isi:** tidak ada yang diisi — penahanan sudah mencatat alasannya.
- **Penguji — status yang diharapkan:** Accepted — tidak dapat dicapai.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi.
- **Penguji — peristiwa pemicu:** `t_grline_release` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; `UNKNOWN_ENTITY` lebih dulu.
- **Glosarium:** `UNKNOWN_ENTITY`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** alur substrat, tanpa target perintah. Ini cermin butir-baris dari `t_gr_request_retest` pada header, dengan status pendaratan yang berlawanan secara sengaja.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:83-123 -->

### t_grline_return — Mengembalikan barang ke pemasok <!-- transition:t_grline_return -->

- **Jenis langkah:** dimodelkan, tidak aktif (tanpa target)
- **Peran:** pembeli · penerimaan (atom `gr:disposition`)
- **Dari → ke:** Inspected → Returned (terminal)
- **Operator — di mana:** tidak disediakan di mana pun hari ini.
- **Operator — lakukan:** mengirim barang kembali ke pemasok alih-alih membuang atau menyimpannya, sehingga tanggung jawab atas masalahnya ikut kembali.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Returned — tidak dapat dicapai. Gulungan tidak punya status Returned; "Return to Supplier" pada fixture `gr-011` adalah label tingkat header.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi.
- **Penguji — peristiwa pemicu:** `t_grline_return` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; `UNKNOWN_ENTITY` lebih dulu.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** alur substrat, tanpa target perintah.
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:124-134; src/data/mockGoodsReceipts.ts:352 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Disposisi satu barang (di Inspected).** Cabang A — `t_grline_accept` — **Kapan:** layak pakai. Cabang B — `t_grline_reject` — **Kapan:** tidak layak, alasan disertakan. Cabang C — `t_grline_quarantine` — **Kapan:** meragukan; tahan. Cabang D — `t_grline_return` — **Kapan:** dikembalikan ke pemasok. Tidak satu pun dapat dikirim hari ini.
- **Setelah karantina (di Quarantined).** Cabang A — `t_grline_release` — **Kapan:** pemeriksaan kedua meloloskannya. Cabang B — `t_grline_reject` — **Kapan:** pemeriksaan kedua menggagalkannya. Tidak dapat dikirim hari ini.
- **Yang sebenarnya terjadi hari ini:** penerima mencatat kuantitas dan pemeriksaan per baris di wizard GR; portal menurunkan Accepted / Rejected / Partial / Pending per baris dan menggulung header. Tidak ada penahanan, pelepasan, atau pengembalian pada butir baris.

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| tidak ada pada butir ini | — | — | status mesin baris tidak pernah ditampilkan; tanda pemeriksaan per baris (V · P · H · B) dan kuantitas ditolak ditampilkan di panel **Item baris** penerimaan sebagai fakta, bukan bendera | panel samping `/buyer/goods-receipt` |
<!-- src: src/pages-v2/BuyerGoodsReceipt.tsx:1158-1247; src/lib/i18n/goodsReceipt.ts:399-406 -->

<!-- section:linked -->
## 6 · Objek terkait

**Entitas perwakilan:** tidak ada — tidak ada fixture dan tidak ada penyimpanan yang memegang baris sebagai entitas. Yang dibaca portal hari ini adalah larik `inspectionResults[]` pada penerimaan barang (misalnya dua baris pada `gr-002` / GR-2026-002).

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Penerimaan barang | `GoodsReceipt.inspectionResults[]` | setiap baris (`materialCode`, `qtyExpected`, `qtyReceived`, `qtyAccepted`, `qtyRejected`, `rejectionReason`, `labResultId`, `visualCheck`, `packagingCheck`, `halalSealCheck`, `bpomLotCheck`) adalah substrat fakta; `deriveLineState` memetakannya ke Pending / Accepted / Rejected / Partial, **kosakata yang berbeda** dari enam status mesin ini |
| Disposisi header | `deriveHeaderDisposition` | ada Pending → header Pending; semua Accepted → Approved; semua Rejected → Rejected; selainnya Partially Approved — hook `gr_rollup_*` menjalankan ulang ini |
| Item baris pengiriman / ASN | `materialCode` | `gr_inspection_materials_declared` menolak penerimaan yang barisnya menyebut material yang tidak pernah dinyatakan induknya |
| Master material | `materialCode` | menentukan apakah pemeriksaan segel halal atau lot BPOM wajib pada baris itu |
<!-- src: src/data/mockGoodsReceipts.ts:27-40; src/services/transitions/grRollup.ts:15-58; src/services/data/mock/MockCommandService.ts:313-362; src/components/v2-features/GRInspectionWizard.tsx:388-404,536-539 -->

<!-- section:history -->
## 7 · Riwayat status

Tidak ada `TransitionEvent` yang pernah ditulis untuk sebuah baris: mesin ini tidak punya target, sehingga tidak ada pengiriman yang mencapai pemancar dispatcher. Fakta per baris ditulis sekali, di dalam peristiwa `t_gr_create` penerimaan, dan tidak pernah berubah setelahnya. Urutan kerja: tidak ada — dimodelkan, tidak aktif.

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| — | — | — | tidak ada peristiwa baris; lihat baris `t_gr_create` pada panduan penerimaan barang | — |
<!-- src: src/services/transitions/flows/goodsReceiptLine.flow.ts:11-14; _derived/surfaces.md:18 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| "Jenis dokumen untuk tindakan ini belum tersambung ke sistem perintah." | `UNKNOWN_ENTITY` pada pengiriman buatan tangan | `goodsReceiptLine` tidak punya target perintah | wajar; bertindak pada header penerimaan sebagai gantinya |
| Kuantitas ditolak atau pemeriksaan gagal pada satu baris tidak mengubah header seperti yang Anda harapkan | header berbunyi Partially Approved / Rejected | header digulung dari **setiap** baris — satu baris buruk menghasilkan campuran, semua baris buruk menghasilkan penolakan | tinjau baris-baris di langkah kualitas wizard sebelum menekan **Buat GR** |
| Anda ingin mengarantina atau mengembalikan satu barang | tidak ada kontrol seperti itu | kata kerja tingkat baris dimodelkan, tidak aktif | catat faktanya di alasan penolakan baris atau catatan penerimaan |
<!-- src: src/lib/glossary/refusals.glossary.ts:37-40; src/services/transitions/grRollup.ts:49-58 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Pending | tidak ada fixture — dimodelkan, tidak aktif | — | Pending pada gulungan diturunkan dari baris `inspectionResults` penerimaan, tidak disimpan |
| Inspected | tidak ada fixture — dimodelkan, tidak aktif | — | |
| Accepted | tidak ada fixture — dimodelkan, tidak aktif | — | |
| Rejected | tidak ada fixture — dimodelkan, tidak aktif | — | |
| Quarantined | tidak ada fixture — dimodelkan, tidak aktif | — | |
| Returned | tidak ada fixture — dimodelkan, tidak aktif | — | |
<!-- src: _derived/guidefacts.json (goodsReceiptLine.fixtures = "no store") -->
