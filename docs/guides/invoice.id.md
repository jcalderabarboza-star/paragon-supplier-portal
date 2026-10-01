---
entity: invoice
locale: id
title: Faktur
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_invoice_create
  - t_invoice_submit
  - t_invoice_match
  - t_invoice_approve
  - t_invoice_release_payment
  - t_invoice_remit
  - t_invoice_dispute
  - t_invoice_resolve
---

<!-- section:summary -->
## 1 · Apa proses ini

Klaim pemasok untuk dibayar, dan keputusan Paragon atasnya. Satu dokumen per klaim, dari sisi mana pun ia dilihat. Faktur adalah SATU catatan kanonis di portal: halaman pemasok (`/supplier/invoices`, "Faktur Saya") dan halaman pembeli (`/buyer/invoices`, "Faktur & Pembayaran") membaca baris yang sama dan menampilkannya lewat label status masing-masing, sehingga kedua sisi tidak pernah berbeda pendapat tentang posisi sebuah tagihan.

Dua peran menyentuhnya. **Narahubung administrasi pemasok** (lajur `back_office`) membuat draf faktur atas salah satu pesanan pembelian miliknya yang sudah dikonfirmasi, lalu mengajukannya. **Petugas keuangan** Paragon (lajur `finance`) menyetujuinya, merilis pembayaran, dan dapat menyengketakannya atau menyelesaikan sengketa. Tidak ada yang menekan pencocokan 3 arah: ia dihitung oleh platform ketika penerimaan barang pada pesanan pembelian yang sama diposting. Tidak ada pula yang menekan langkah bukti pembayaran: uang yang tiba adalah fakta bank, bukan tindakan portal.

Proses dimulai saat pemasok membuat draf dan berakhir di **Remittance Received (Bukti Pembayaran Diterima)**, satu-satunya status akhir. Di antaranya dokumen melewati Submitted (Diajukan), Matched (Cocok), Approved (Disetujui), status antara SAP **Releasing Payment (Merilis Pembayaran)**, dan **Payment Released (Pembayaran Dirilis)**. **Disputed (Disengketakan)** adalah jalur pengecualian, dapat dicapai dari Submitted, Matched dan Approved, dan mengembalikan dokumen ke Submitted.

Penanda kejujuran yang perlu dibaca sebelum memakai panduan ini. Pelepasan pembayaran melintasi batas SAP: tindakan di portal nyata dan tercatat, tetapi callback penyelesaian SAP yang menerbitkan dokumen FI bersifat **SIMULASI** pada build ini; tidak ada dana yang keluar dari bank mana pun. Langkah bukti pembayaran (`t_invoice_remit`) sudah ditulis dan dimiliki oleh umpan penyelesaian bank/SAP; **tidak ada umpan** yang tersambung, sehingga tidak ada faktur pada build ini yang pernah mencapai Remittance Received. Faktur demo adalah fixture **SIMULASI**, digeser ke tanggal "hari ini" yang dideklarasikan (31 Agu 2026) agar pembacaan umur dan jatuh tempo tetap koheren. Setiap tindakan manusia pada build ini dicatat tanpa nama orang (`UNATTRIBUTED: NO_PERSON_IN_SESSION`); toast persetujuan menyatakannya.

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Draft (Draf) | tindakan operator (pembuatan) | pemasok · back_office | `t_invoice_create` |
| 2 | Draft → Submitted (Diajukan) | tindakan operator | pemasok · back_office | `t_invoice_submit` |
| 3 | Submitted → Matched (Cocok) | kaskade (dari `t_gr_post`, hanya pada vonis `Matched`) | otomasi | `t_invoice_match` |
| 4 | Matched → Approved (Disetujui) | tindakan operator | pembeli · finance | `t_invoice_approve` |
| 5 | Approved → Releasing Payment (Merilis Pembayaran) ⇒ Payment Released (Pembayaran Dirilis) | tindakan operator, batas SAP (diselesaikan) | pembeli · finance | `t_invoice_release_payment` |
| 6 | Payment Released → Remittance Received (Bukti Pembayaran Diterima) | fakta eksternal (bank) — belum ada umpan | otomasi | `t_invoice_remit` |
| 7 | Submitted, Matched, Approved → Disputed (Disengketakan) | tindakan operator (pengecualian) | pembeli · finance | `t_invoice_dispute` |
| 8 | Disputed → Submitted | tindakan operator (pengecualian) | pembeli · finance | `t_invoice_resolve` |

<!-- src: src/services/transitions/flows/invoice.flow.ts:34-210; src/services/transitions/cascades.ts:36-38 -->

**Percabangan**

- **Di Submitted:** `t_invoice_match` — otomasi — ketika penerimaan barang pada PO yang sama diposting dan vonis turunannya `Matched`; `t_invoice_dispute` — keuangan — ketika Paragon tidak menerima klaim apa adanya.
- **Di Matched:** `t_invoice_approve` — keuangan — ketika klaim memang terutang; `t_invoice_dispute` — keuangan — ketika ada varians atau soal nota kredit yang menghalangi.
- **Di Approved:** `t_invoice_release_payment` — keuangan — ketika instruksi pembayaran akan dikirim ke SAP; `t_invoice_dispute` — keuangan — ketika keputusan membayar ditarik sebelum uang berpindah.
- **Di Disputed:** hanya satu jalan keluar, `t_invoice_resolve` — keuangan — ketika perselisihan tuntas; klaim kembali ke Submitted untuk dicocokkan ulang.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_invoice_create — Membuat draf faktur <!-- transition:t_invoice_create -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** pemasok · back_office (atom `invoice:submit`)
- **Dari → ke:** ∅ → Draft (Draf)
- **Operator — di mana:** `/supplier/invoices` → tombol tajuk **Faktur baru** → panel "Faktur baru" → **Buat draf**. Jika kursi Anda tidak memegang `invoice:submit`, slot tombol itu menampilkan "Menunggu Administrasi Pemasok".
- **Operator — lakukan:** Pemasok mulai menyusun tagihan atas pesanan yang telah dipenuhinya, selagi angkanya masih bisa mereka perbaiki. Pilih pesanan pembelian dari daftar "Pesanan pembelian" (hanya PO milik Anda sendiri berstatus Confirmed yang ditawarkan; jika tidak ada, daftar berbunyi "Tidak ada PO dikonfirmasi yang tersedia untuk difakturkan."), ketik jumlahnya, tekan Buat draf. Portal menetapkan nomor faktur (bentuk `INV-2026-9001`, `INV-2026-9002`…) dan menampilkan "INV-… dibuat · Draf dibuat untuk PO-…. cmd_… tercatat."
- **Operator — isi:** referensi pesanan pembelian (wajib menurut mesin: `poReference`); jumlah dalam IDR (wajib menurut formulir — angka saja; kolom kosong, bukan angka, atau "1.500" yang ambigu ditolak dengan pesannya masing-masing, dan jumlah harus lebih besar dari nol).
- **Penguji — status yang diharapkan:** Draft (Draf)
- **Penguji — konfirmasi:** baris baru muncul di puncak daftar pemasok dengan pil status Draf dan tombol **Kirim**; Antrean Faktur pembeli TIDAK menampilkannya (pembacaan pembeli menyaring Draft). Fakta utama panel menunjukkan "Dokumen SAP FI — menunggu —" dan "Ref pembayaran — menunggu —".
- **Penguji — peristiwa pemicu:** `t_invoice_create`
- **Pemeriksaan yang dapat menolak:** `invoice_create_po_confirmed` — PO induk harus ada dan berstatus Confirmed ("PO … is not Confirmed" / "parent PO not found"). Lingkup — pemasok hanya boleh membuat draf atas PO MILIKNYA SENDIRI; PO pemasok lain ditolak `SCOPE_DENIED` sebelum pemeriksaan lain.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Kejujuran:** Tanggal diisi bawaan oleh store, bukan jam dinding: tanggal pengajuan = "hari ini" yang dideklarasikan, jatuh tempo = +30 hari (Net 30), sehingga draf baru tidak pernah lahir dalam keadaan jatuh tempo. Faktur baru berawal dengan status pencocokan `Pending`. Dokumen SAP FI dan referensi pembayaran tetap kosong sampai penyelesaian.
<!-- src: src/services/transitions/flows/invoice.flow.ts:52-64; src/pages-v2/SupplierInvoices.tsx:254-310; src/pages-v2/SupplierInvoices.tsx:399-420; src/services/data/mock/MockCommandService.ts:380-468; src/services/query/commandHooks.ts:760-777; src/lib/i18n/supplierInvoices.ts:226-247; src/lib/i18n.ts:1047-1051; src/services/data/mock/stores/invoiceStore.ts:45-48 -->

### t_invoice_submit — Mengajukan faktur <!-- transition:t_invoice_submit -->

- **Jenis langkah:** tindakan operator
- **Peran:** pemasok · back_office (atom `invoice:submit`)
- **Dari → ke:** Draft → Submitted (Diajukan)
- **Operator — di mana:** `/supplier/invoices` → baris Draf → **Kirim** (di kolom Tindakan). Kursi tanpa atom melihat "Menunggu Administrasi Pemasok" di slot itu.
- **Operator — lakukan:** Pemasok resmi meminta pembayaran; hitungan tempo pembayaran mulai berjalan dari sini. Tekan Kirim pada draf. Toast berbunyi "INV-… dikirim untuk persetujuan · cmd_… tercatat. Menunggu pencocokan 3 arah dan persetujuan."
- **Operator — isi:** tidak ada yang baru diketik — jumlah pada baris dikirim sebagai `amount` yang wajib.
- **Penguji — status yang diharapkan:** Submitted (Diajukan)
- **Penguji — konfirmasi:** pil pemasok berubah dari Draf menjadi **Menunggu Persetujuan** (label pemasok untuk Submitted dan Matched); Antrean Faktur pembeli kini mencantumkannya dengan label **Menunggu Pencocokan** dan kolom "Pencocokan 3 arah" berbunyi Menunggu; footer laci pembeli berbunyi "Tinjau pencocokan".
- **Penguji — peristiwa pemicu:** `t_invoice_submit`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib.
- **Glosarium:** `ILLEGAL_TRANSITION`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Menekan "Tinjau pencocokan" di sisi pembeli tidak mengubah apa pun: toast berbunyi "Menunggu pencocokan 3 arah — Tidak ada yang berubah di sini. Pencocokan 3 arah selesai saat penerimaan barang diposting di SAP." Pencocokan adalah kaskade, bukan tombol.
<!-- src: src/services/transitions/flows/invoice.flow.ts:65-75; src/pages-v2/SupplierInvoices.tsx:229-252; src/pages-v2/SupplierInvoices.tsx:574-588; src/services/query/commandHooks.ts:779-797; src/services/data/invoiceProjection.ts:55-93; src/lib/i18n.ts:1052-1056; src/lib/i18n.ts:1084-1086 -->

### t_invoice_match — Pencocokan 3 arah (dihitung) <!-- transition:t_invoice_match -->

- **Jenis langkah:** kaskade (digerakkan sistem); dipicu oleh `t_gr_post`
- **Peran:** otomasi (atom `invoice:match`; tidak ada lajur manusia yang memegangnya)
- **Dari → ke:** Submitted → Matched (Cocok)
- **Operator — di mana:** tidak ada yang menekan ini di portal. Penerima memposting penerimaan barang di `/buyer/goods-receipt` (wizard inspeksi GR, **Post to SAP**); pencocokan mengikuti tindakan itu.
- **Operator — lakukan:** Paragon mencocokkan tagihan dengan apa yang dipesan dan apa yang diterima. Saat sebuah penerimaan diposting, platform mencari setiap faktur Submitted pada nomor PO yang sama, menurunkan vonis dan menuliskannya ke status pencocokan faktur: penerimaan yang memuat kuantitas ditolak → **Qty Mismatch (Selisih Kuantitas)**; jumlah yang difakturkan dalam 1% dari Σ(kuantitas terkonfirmasi × harga satuan) PO → **Matched (Cocok)**; selain itu → **Price Variance (Varians Harga)**. Hanya vonis `Matched` yang memajukan tajuk faktur; vonis varians dituliskan dan faktur tetap Submitted (tanpa tindakan yang jujur, bukan cacat).
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Matched (Cocok) — label pembeli tetap **Menunggu Pencocokan**; label pemasok tetap **Menunggu Persetujuan**
- **Penguji — konfirmasi:** bagian "Pencocokan 3 arah" pada laci pembeli berbunyi "Kuantitas + harga PO, GR, dan faktur semuanya cocok." dan slot utama footer kini berbunyi **Setujui untuk pembayaran**. Gunakan `inv-fir-0325` (INV-2026-FIR-0325, PO-2025-00104, 540.000.000) dengan penerimaan `GR-2026-012` (Approved, 900 diterima, 0 ditolak) — satu-satunya pasangan tersemai yang vonisnya `Matched`.
- **Penguji — peristiwa pemicu:** `t_invoice_match` (peristiwanya membawa `causationId` = correlationId posting GR)
- **Pemeriksaan yang dapat menolak:** `invoice_rollup_matched` — tajuk hanya boleh maju bila status pencocokan faktur itu sendiri `Matched` ("match axis is 'Qty Mismatch', not 'Matched'"). Penyelesai kaskade tidak pernah memicu verba ini pada varians, jadi hook ini hanya menggigit dispatch buatan tangan.
- **Glosarium:** `POLICY_REJECTED`; status pencocokan Pending, Pending GR, Matched, Qty Mismatch, Price Variance.
- **Kejujuran:** Pemasangan berjalan satu arah saja: posting penerimaan menemukan fakturnya. Faktur yang diajukan SETELAH penerimaannya sudah diposting tidak dicocokkan oleh apa pun (fungsi cerminnya ada dan tidak punya pemanggil). Penerimaan berikutnya pada PO yang sama menimpa vonis sebelumnya tanpa peristiwa. Toleransi 1% adalah pengganti sementara, bukan kebijakan AP. `Pending GR` hanya muncul pada baris tersemai — faktur yang dibuat saat runtime menampilkan `Pending` sampai sebuah penerimaan diposting, karena verba sub-alur yang akan menulis `Pending GR` belum tersambung.
<!-- src: src/services/transitions/flows/invoice.flow.ts:76-94; src/services/data/mock/MockCommandService.ts:2851-2881; src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:83-104; src/services/transitions/invoiceRollup.ts:153-177; src/services/transitions/policies.ts:156-164; src/services/data/mock/fixtures/invoices.ts:161-200; src/data/mockGoodsReceipts.ts:355-379; src/lib/i18n/buyerInvoices.ts:306-315 -->

### t_invoice_approve — Menyetujui untuk pembayaran <!-- transition:t_invoice_approve -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · finance (atom `invoice:approve`)
- **Dari → ke:** Matched → Approved (Disetujui)
- **Operator — di mana:** `/buyer/invoices` → Antrean Faktur → buka faktur → tombol utama footer **Setujui untuk pembayaran**. Kursi pengadaan melihat "Menunggu Keuangan" di slot itu, bukan tombol.
- **Operator — lakukan:** Keuangan menyetujui bahwa klaimnya memang terutang; keputusan untuk membayar diambil di sini, uangnya berpindah kemudian. Tekan Setujui untuk pembayaran. Sengaja tidak ada langkah konfirmasi kedua untuk verba ini. Toast berbunyi "INV-… — disetujui untuk pembayaran · Dicatat tanpa nama penyetuju — tidak ada orang yang dikenali dalam sesi ini. Pembayaran kini dapat dirilis."
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Approved (Disetujui)
- **Penguji — konfirmasi:** pil pembeli berbunyi **Disetujui** (atau **Jatuh Tempo** jika tanggal jatuh temponya sudah lewat); footer kini menawarkan **Rilis pembayaran**; pil pemasok berbunyi **Disetujui**; chip filter "Disetujui" dan KPI "Menunggu Persetujuan" di halaman pembeli bergeser.
- **Penguji — peristiwa pemicu:** `t_invoice_approve`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** Tidak ada faktur tersemai di Matched, jadi tombol ini hanya terjangkau setelah kaskade di atas berjalan. Persetujuan dicatat atas `UNATTRIBUTED: NO_PERSON_IN_SESSION`. Kursi keuangan bawaan memegang `invoice:approve` DAN `invoice:pay`; empat mata dapat dipisahkan lewat konfigurasi dua peran kustom, tidak diberlakukan secara bawaan.
<!-- src: src/services/transitions/flows/invoice.flow.ts:95-147; src/pages-v2/BuyerInvoices.tsx:482-510; src/pages-v2/BuyerInvoices.tsx:1081-1141; src/pages-v2/invoices/invoiceActionModel.ts:68-106; src/services/query/commandHooks.ts:799-816; src/lib/i18n.ts:1070-1073; src/lib/i18n/buyerInvoices.ts:279-284 -->

### t_invoice_release_payment — Merilis pembayaran (batas SAP) <!-- transition:t_invoice_release_payment -->

- **Jenis langkah:** tindakan operator · batas SAP (diselesaikan)
- **Peran:** pembeli · finance (atom `invoice:pay`)
- **Dari → ke:** Approved → Releasing Payment (Merilis Pembayaran) ⇒ Payment Released (Pembayaran Dirilis) saat penyelesaian
- **Operator — di mana:** `/buyer/invoices` → buka faktur Disetujui → footer **Rilis pembayaran** → panel konfirmasi "Konfirmasi pelepasan pembayaran" → **Konfirmasi rilis — Rp …**.
- **Operator — lakukan:** Mengirim instruksi pembayaran ke SAP; sebelum SAP mengonfirmasi, jangan ada yang memberi tahu pemasok bahwa mereka sudah dibayar. Panel konfirmasi memperingatkan "Tindakan ini tidak dapat dibatalkan. Pembayaran sebesar … akan ditransfer ke …. Verifikasi detail bank sebelum mengonfirmasi." dan menyatakan bahwa callback penyelesaian bersifat simulasi. Setelah dikonfirmasi, toast pertama berbunyi "merilis pembayaran — Dikirim ke SAP untuk pembayaran — menunggu callback dokumen FI. Belum ada pembayaran."; sekitar 1,2 detik kemudian penyelesaian mendarat dan toast kedua berbunyi "pembayaran dirilis — SAP menetapkan dokumen FI saat penyelesaian."
- **Operator — isi:** tidak ada yang diisi; klik konfirmasi adalah tindakannya.
- **Penguji — status yang diharapkan:** Releasing Payment seketika (label pembeli **Pembayaran Dirilis**, label pemasok **Disetujui**), lalu Payment Released setelah penyelesaian (kedua label **Pembayaran Dirilis**)
- **Penguji — konfirmasi:** selagi berjalan, footer berbunyi "Menunggu penyelesaian SAP — dokumen FI belum ada". Setelah penyelesaian, "Dokumen SAP" pada laci menampilkan dokumen FI yang diterbitkan (`FI-5100011001`…) dan referensi pembayaran (`PAY-2026-95001`…) dengan tanggal pembayaran = "hari ini" yang dideklarasikan; baris pemasok menampilkan tindakan **Bukti Pembayaran** dan panelnya menawarkan "Lihat bukti pembayaran". Fixture awal: `inv-giv-0892` (INV-2025-GIV-0892) dan `inv-evo-0188` (INV-2025-EVO-0188), keduanya Approved.
- **Penguji — peristiwa pemicu:** `t_invoice_release_payment` (hasil `submitted`, lalu correlationId yang sama diselesaikan menjadi `done`)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib saat dispatch. Penyelesaian dapat gagal secara terpisah (`REFUSED` / `TRANSPORT` / `UNGOVERNED`); footer lalu menampilkan **Coba selesaikan lagi** hanya untuk kegagalan yang jawabannya bisa berbeda pada permintaan kedua, selain itu "Penyelesaian ditolak. Mengulang permintaan tidak akan mengubah jawabannya…".
- **Glosarium:** `REFUSED`, `TRANSPORT`, `UNGOVERNED` (kegagalan penyelesaian), `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Pelepasan itu sendiri diatur dan nyata: perintahnya terkirim, jejaknya tercatat, dan faktur berpindah ke Merilis Pembayaran. Callback penyelesaian SAP yang menerbitkan dokumen FI bersifat **SIMULASI** — tidak ada dana yang keluar dari bank mana pun. Dokumen FI, referensi pembayaran dan tanggal pembayaran hanya diterbitkan saat penyelesaian, tidak pernah sebelumnya. Pemasok sengaja diperlihatkan **Disetujui**, bukan sudah dibayar, selagi pembayaran berjalan.
<!-- src: src/services/transitions/flows/invoice.flow.ts:148-164; src/pages-v2/BuyerInvoices.tsx:515-583; src/pages-v2/BuyerInvoices.tsx:1101-1160; src/services/query/commandHooks.ts:862-896; src/services/data/mock/MockCommandService.ts:2972-2988; src/services/data/invoiceProjection.ts:55-93; src/lib/i18n/buyerInvoices.ts:273-277; src/lib/i18n/buyerInvoices.ts:316-324; src/lib/i18n.ts:1074-1083; src/lib/glossary/refusals.glossary.ts:139-152 -->

### t_invoice_remit — Bukti pembayaran diterima (fakta bank) <!-- transition:t_invoice_remit -->

- **Jenis langkah:** fakta eksternal (bank) — belum ada umpan tersambung
- **Peran:** otomasi (atom `invoice:pay`, lajur keuangan; pemilik: bank)
- **Dari → ke:** Payment Released → Remittance Received (Bukti Pembayaran Diterima)
- **Operator — di mana:** tidak ada yang menekan ini di portal; tidak ditawarkan di mana pun hari ini.
- **Operator — lakukan:** Pemasok mengakui penerimaan uang beserta nota yang menyertainya, dan klaim ini selesai. Dalam proses sesungguhnya ini dikonfirmasi oleh umpan penyelesaian bank/SAP: pembeli merilis pembayaran; uang yang tiba bukan tindakan mereka.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Remittance Received — tidak terjangkau pada build ini.
- **Penguji — konfirmasi:** tidak ada fixture di Remittance Received dan tidak ada layar yang dapat menghasilkannya. Yang ditawarkan layar di sekitarnya: tindakan **Bukti Pembayaran** / "Lihat bukti pembayaran" milik pemasok pada faktur yang sudah dibayar (pembacaan bukti pembayaran; "Unduh PDF" adalah toast yang menyatakan tidak ada PDF yang diunduh), dan "Kirim bukti pembayaran" → **Kirim ke pemasok** milik pembeli, yang berupa toast: "Tidak ada yang dibuat dan tidak ada yang dikirim ke pemasok melalui …".
- **Penguji — peristiwa pemicu:** `t_invoice_remit` (tidak pernah terpicu hari ini)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib.
- **Glosarium:** pemilik fakta eksternal "bank" (`processFlows.owner.bank`).
- **Kejujuran:** Ini fakta bank tanpa umpan. Di halaman alur proses ia membawa "Dimiliki bank". Kedua layar bukti pembayaran adalah pratinjau: "Bukti pembayaran ini adalah pratinjau — tidak ada pembayaran yang diproses dan tidak ada notifikasi yang dikirim ke pemasok."
<!-- src: src/services/transitions/flows/invoice.flow.ts:165-184; src/pages-v2/BuyerInvoices.tsx:652-660; src/pages-v2/BuyerInvoices.tsx:1181-1195; src/pages-v2/SupplierInvoices.tsx:640-660; src/lib/i18n/buyerInvoices.ts:331-338; src/lib/i18n.ts:1087-1089; src/lib/i18n/processFlows.ts:189-193; src/lib/i18n/externalFactOwner.ts:26-30 -->

### t_invoice_dispute — Menyengketakan faktur <!-- transition:t_invoice_dispute -->

- **Jenis langkah:** tindakan operator (jalur pengecualian)
- **Peran:** pembeli · finance (atom `invoice:dispute`)
- **Dari → ke:** Submitted, Matched, Approved → Disputed (Disengketakan)
- **Operator — di mana:** `/buyer/invoices` → buka faktur → footer **Sengketa** → panel "Ajukan sengketa" → ketik alasan → **Ajukan sengketa**. Tombol Sengketa ditawarkan persis di tempat mesin menyatakannya sah (Submitted, Matched, Approved), termasuk faktur Approved yang sudah lewat jatuh tempo; kursi tanpa atom melihat "Menunggu Keuangan".
- **Operator — lakukan:** Paragon tidak menerima klaim itu apa adanya, dan menyatakan alasannya; ini menghentikan hitungan pembayaran dan mengembalikan bola ke pemasok. Isi alasannya (placeholder: "Alasan (mis. selisih kuantitas vs GR, varians harga)…"; panel mencatat "Nota kredit akan diperlukan sebelum pembayaran dapat dirilis."). Toast: "INV-… disengketakan · cmd_… tercatat. Nota kredit diperlukan sebelum pembayaran."
- **Operator — isi:** alasan sengketa (`disputeReason`, wajib; kolom kosong dihentikan di permukaan dengan "Alasan sengketa wajib diisi.").
- **Penguji — status yang diharapkan:** Disputed (Disengketakan)
- **Penguji — konfirmasi:** pil pembeli **Disengketakan**, spanduk sengketa di halaman pembeli, KPI Disengketakan; pil pemasok **Disengketakan** dengan catatan "Faktur ini disengketakan. Hubungi Pengawas Keuangan Paragon untuk menyelesaikannya sebelum pembayaran dapat dirilis." dan spanduk sengketa pemasok. Footer pembeli kini menawarkan **Selesaikan sengketa**.
- **Penguji — peristiwa pemicu:** `t_invoice_dispute`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib.
- **Glosarium:** `MISSING_FIELDS`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** Sengketa tidak mengubah status pencocokan; `inv-brl-0043` membawa Qty Mismatch dan `inv-smpl-1180` membawa Price Variance sebagai fakta tersemai. Tombol **Selesaikan** milik pemasok pada baris yang disengketakan hanya toast: "Penyelesaian sengketa belum tersedia — Tidak ada yang diubah — hubungi Pengawas Keuangan Paragon." Penyelesaian adalah tindakan keuangan.
<!-- src: src/services/transitions/flows/invoice.flow.ts:185-196; src/pages-v2/BuyerInvoices.tsx:585-624; src/pages-v2/BuyerInvoices.tsx:1085-1100; src/pages-v2/BuyerInvoices.tsx:1161-1180; src/pages-v2/SupplierInvoices.tsx:589-601; src/services/query/commandHooks.ts:818-836; src/lib/i18n/buyerInvoices.ts:325-330; src/lib/i18n.ts:1057-1061; src/lib/i18n/supplierInvoices.ts:171-175; src/lib/i18n/supplierInvoices.ts:212-214 -->

### t_invoice_resolve — Menyelesaikan sengketa <!-- transition:t_invoice_resolve -->

- **Jenis langkah:** tindakan operator (jalur pengecualian)
- **Peran:** pembeli · finance (atom `invoice:dispute`)
- **Dari → ke:** Disputed → Submitted (Diajukan)
- **Operator — di mana:** `/buyer/invoices` → buka faktur Disengketakan → footer **Selesaikan sengketa**. Kursi pengadaan melihat "Menunggu Keuangan" di slot itu.
- **Operator — lakukan:** Perselisihannya sudah dituntaskan dan klaimnya dikembalikan untuk diperiksa; tanpa ini, tagihan yang dipersoalkan tidak punya jalan ke mana pun. Tekan Selesaikan sengketa. Toast: "Sengketa INV-… diselesaikan · cmd_… tercatat. Dikembalikan untuk pencocokan ulang."
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Submitted (Diajukan)
- **Penguji — konfirmasi:** pil pembeli kembali ke **Menunggu Pencocokan** (footer "Tinjau pencocokan"); pil pemasok kembali ke **Menunggu Persetujuan**; spanduk sengketa hilang. Fixture: `inv-brl-0043` (INV-2025-BRL-0043), `inv-smpl-1180` (INV-2026-SMPL-1180).
- **Penguji — peristiwa pemicu:** `t_invoice_resolve`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib.
- **Glosarium:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Menyelesaikan tidak menjalankan ulang pencocokan. Faktur kembali ke Submitted dengan membawa status pencocokan sebelumnya; vonis baru hanya dituliskan bila sebuah penerimaan pada PO yang sama diposting setelah titik ini (pintu kedua menuju Submitted adalah kasus yang diketahui dan belum diputuskan).
<!-- src: src/services/transitions/flows/invoice.flow.ts:197-208; src/pages-v2/BuyerInvoices.tsx:626-650; src/pages-v2/BuyerInvoices.tsx:286-300; src/services/query/commandHooks.ts:838-856; src/services/transitions/invoiceRollup.ts:100-104; src/lib/i18n.ts:1062-1065 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Cocokkan atau sengketakan (di Submitted).** Cabang A — `t_invoice_match` — **Kapan:** penerimaan barang pada PO yang sama diposting dan vonis turunannya `Matched`; platform yang memicunya, tidak ada yang menekan. Cabang B — `t_invoice_dispute` — **Kapan:** keuangan tidak menerima klaim (vonis varians dituliskan, nota kredit diperlukan, angkanya keliru). Vonis varians saja membiarkan faktur di Submitted dengan vonis terlihat; pilihan manusianya lalu menyengketakan atau menunggu penerimaan yang dikoreksi.
- **Setujui atau sengketakan (di Matched).** Cabang A — `t_invoice_approve` — **Kapan:** klaim memang terutang. Cabang B — `t_invoice_dispute` — **Kapan:** ada hal di luar pemeriksaan 3 arah yang menghalangi.
- **Rilis atau sengketakan (di Approved).** Cabang A — `t_invoice_release_payment` — **Kapan:** instruksi pembayaran akan dikirim ke SAP; inilah satu-satunya komitmen tak terbatalkan di permukaan pembeli dan memerlukan langkah konfirmasi. Cabang B — `t_invoice_dispute` — **Kapan:** keputusan membayar ditarik sebelum uang berpindah. Faktur Approved yang jatuh temponya sudah lewat menampilkan label **Jatuh Tempo** tetapi mempertahankan kedua cabang.
- **Sengketa → selesaikan (di Disputed).** `t_invoice_resolve` — **Kapan:** perselisihan tuntas; satu-satunya jalan keluar, dan ia mengembalikan tagihan ke Submitted untuk diperiksa ulang, bukan ke posisi semula.
- **Menunggu penyelesaian (di Releasing Payment).** Tidak ada verba yang sah di sini. **Kapan** penyelesaian gagal dengan kegagalan `TRANSPORT`, footer menawarkan **Coba selesaikan lagi**; **kapan** gagal `REFUSED` atau `UNGOVERNED`, footer menyatakan mengulang tidak akan mengubah jawabannya dan faktur tetap di sana sampai penolakan itu diselesaikan.

<!-- src: src/services/transitions/flows/invoice.flow.ts:51-208; src/pages-v2/BuyerInvoices.tsx:1101-1141; src/services/data/mock/MockCommandService.ts:2869-2877 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| **Jatuh Tempo (Overdue)** | berbasis waktu, diturunkan saat dibaca | Submitted, Matched, Approved, Releasing Payment | tanggal jatuh tempo sebelum hari pembacaan; tidak pernah disimpan | pil status pembeli dan pemasok; spanduk pembeli "N faktur jatuh tempo: … (lewat N hr)"; KPI dan chip filter Jatuh Tempo pembeli; catatan pemasok "Pembayaran telah jatuh tempo. Keuangan Paragon telah dieskalasi." |
| **Disengketakan (Disputed)** | diangkat operator | Disputed | keuangan mengajukan sengketa | kedua pil; spanduk sengketa pembeli; spanduk dan catatan sengketa pemasok; KPI Disengketakan |
| **Vonis pencocokan 3 arah** — Pending / Pending GR / Matched / Qty Mismatch / Price Variance | diturunkan (ditulis oleh kaskade posting GR) | status mana pun; ditindaklanjuti di Submitted | Pending pada draf baru; Pending GR pada baris tersemai; tiga vonis saat penerimaan pada PO itu diposting | kolom "Pencocokan 3 arah" dan bagian laci pembeli dengan satu baris penjelasan per vonis; ubin "Ringkasan Pencocokan 3 Arah" pembeli (tab Analitik Belanja) |
| **Menunggu penyelesaian SAP** | eksternal (batas SAP, SIMULASI) | Releasing Payment | setelah Konfirmasi rilis, sampai penyelesaian mendarat | footer pembeli "Menunggu penyelesaian SAP — dokumen FI belum ada"; "Coba selesaikan lagi" atau catatan tidak-dapat-diulang setelah penyelesaian gagal |
| **Menunggu Pencocokan (Pending Match)** | label turunan | Draft (pembeli tidak pernah melihat), Submitted, Matched | label pembeli yang meringkas status pra-persetujuan | pil dan chip filter pembeli; footer "Tinjau pencocokan" (toast informatif) |
| **Menunggu Keuangan / Menunggu Administrasi Pemasok** | serah-terima turunan | di mana pun verba sah tetapi kursi tidak memegang atomnya | kursi tanpa `invoice:approve` / `invoice:pay` / `invoice:dispute` (pembeli) atau `invoice:submit` (pemasok) membuka permukaan | di slot tombol itu sendiri (`handoff-commit`, `handoff-dispute`, `handoff-invoice-create`, `handoff-invoice-submit`) |
| **Penyelesaian SIMULASI / persetujuan tanpa atribusi** | penanda kejujuran | Approved → Releasing Payment; Matched → Approved | pada panel konfirmasi dan toast persetujuan | teks panel konfirmasi rilis; toast "Dicatat tanpa nama penyetuju…" |

<!-- src: src/services/data/invoiceProjection.ts:30-93; src/lib/i18n/buyerInvoices.ts:210-217; src/lib/i18n/buyerInvoices.ts:273-277; src/lib/i18n/buyerInvoices.ts:306-324; src/lib/i18n/supplierInvoices.ts:154-157; src/lib/i18n/supplierInvoices.ts:212-216; src/pages-v2/BuyerInvoices.tsx:1085-1141; src/pages-v2/SupplierInvoices.tsx:399-420; src/pages-v2/SupplierInvoices.tsx:574-588; src/lib/i18n/roles.ts:264-279 -->

<!-- section:linked -->
## 6 · Objek terkait

**Entitas representatif:** `inv-fir-0325` (INV-2026-FIR-0325) — satu-satunya faktur Submitted yang penerimaannya masih dapat diposting dan vonisnya kembali `Matched`.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pesanan pembelian `po-004` / PO-2025-00104 | `poNumber`, `poId` | hook pembuatan mensyaratkan PO ini berstatus Confirmed; pencocokan membaca Σ(confirmedQty × unitPrice) dari barisnya (200 KG × 2.700.000 = 540.000.000) |
| Penerimaan barang `gr-012` / GR-2026-012 (ASN-2026-008) | `poNumber` yang sama | dipasangkan oleh kaskade posting GR (penerimaan → faktur); penerimaan harus dapat diposting (Approved / Partially Approved) |
| Pemasok `sup-004` | `supplierId`, `supplierName` | pemilik lingkup — pemasok hanya melihat fakturnya sendiri; pembeli melihat semua kecuali Draft |
| `matchStatus` | ditulis oleh penyelesai kaskade | tampilan vonis 3 arah; nilai runtime, bukan kolom khusus fixture |
| `sapFiDoc`, `paymentRef`, `paymentDate` | diterbitkan saat penyelesaian | milik SAP; portal tidak pernah menulisnya sebelum penyelesaian |
| `sapGrDoc`, `approver`, `buyerContact`, `bankAccount`, `channel`, `paymentTerms`, `remittanceNote` | kolom fixture | hanya tampilan — tidak ada di portal yang menulisnya saat runtime; faktur yang dibuat membawa nilai kosong |
| `dueDate`, `submittedDate` | diisi bawaan store saat pembuatan | digeser ke "hari ini" yang dideklarasikan untuk baris tersemai; dipakai proyeksi Jatuh Tempo saat dibaca |

<!-- src: src/services/data/mock/fixtures/invoices.ts:161-233; src/services/data/mock/MockCommandService.ts:380-459; src/services/data/mock/MockCommandService.ts:2851-2881; src/services/data/mock/MockCommandService.ts:2972-2988; src/services/transitions/invoiceRollup.ts:144-177; src/services/data/mock/MockProcurementService.ts:385-396 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `supplier:<supplierId>` untuk kursi pemasok atau `buyer:all` untuk kursi pembeli, `ts`, `outcome` (`done` / `submitted` / `failed`), `correlationId` (`cmd_…`, ditampilkan pada toast sukses), dan `causationId` pada peristiwa berkaskade (correlationId perintah yang menyebabkannya). Peristiwa `failed` membawa `reason` penolakan. Tindakan manusia juga membawa atribusi pelaku sesi, yang pada build ini selalu `UNATTRIBUTED: NO_PERSON_IN_SESSION`. Urutan kerja untuk `inv-fir-0325`, seperti yang akan dihasilkan penguji:

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | (tersemai) Submitted, status pencocokan Pending GR | — | fixture, tanpa peristiwa | — |
| T+1 | penerimaan GR-2026-012: Approved → Posting to SAP ⇒ Posted to SAP | pembeli · receiving (`buyer:all`) | **Post to SAP** di wizard GR | `t_gr_post` (hasil `submitted`, lalu diselesaikan) |
| T+1 | Submitted → Matched; status pencocokan → Matched | otomasi (`buyer:all`, kaskade) | sebaran dari posting penerimaan | `t_invoice_match` (`causationId` = correlationId `t_gr_post`) |
| T+2 | Matched → Approved | pembeli · finance (`buyer:all`) | **Setujui untuk pembayaran** | `t_invoice_approve` |
| T+3 | Approved → Releasing Payment | pembeli · finance (`buyer:all`) | **Rilis pembayaran** → **Konfirmasi rilis** | `t_invoice_release_payment` (hasil `submitted`) |
| T+3 +1,2 dtk | Releasing Payment ⇒ Payment Released; dokumen FI + ref pembayaran diterbitkan | batas SAP (SIMULASI) | penyelesaian correlationId yang sama | status perintah berbalik `submitted` → `done` |
| (alt.) T+2′ | Matched → Disputed | pembeli · finance | **Sengketa** → **Ajukan sengketa** | `t_invoice_dispute` |
| (alt.) T+3′ | Disputed → Submitted | pembeli · finance | **Selesaikan sengketa** | `t_invoice_resolve` |

<!-- src: src/services/transitions/events.ts:26-61; src/services/transitions/events.ts:127-129; src/services/transitions/dispatcher.ts:459-532; src/services/data/mock/MockCommandService.ts:2851-2881; src/pages-v2/BuyerInvoices.tsx:515-583 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tombol digantikan "Menunggu Keuangan" / "Menunggu Administrasi Pemasok" | sebuah pemberitahuan berada di slot tombol | kursi Anda tidak memegang atom verba itu (`ROLE_NOT_PERMITTED` jika tetap didispatch) | pemegang peran yang disebutkan yang melakukannya; panel identitas menunjukkan peran kursi Anda |
| "Tidak dapat membuat faktur" dengan "Tidak ada PO dikonfirmasi yang tersedia untuk difakturkan." | daftar PO kosong | tidak satu pun PO Anda berstatus Confirmed (`invoice_create_po_confirmed` akan menolak) | konfirmasi pesanan dulu di `/supplier/orders` |
| "Tidak dapat membuat faktur" — pesan jumlah | toast menyebut aturan jumlah | kosong, bukan angka, pemisah ambigu, atau nol | ketik angka saja, mis. 250000000 |
| Pembuatan ditolak padahal PO tampak benar | teks penolakan menyebut lingkup / "di luar jangkauan akun Anda" | PO milik pemasok lain (`SCOPE_DENIED`) | buat draf hanya atas PO Anda sendiri |
| "Dokumen tidak berada dalam status yang memungkinkan tindakan ini" | penolakan menyebut status saat ini (`ILLEGAL_TRANSITION`) | laci terbuka selagi status bergerak, atau verba dipicu dari status yang salah | tutup dan buka kembali dokumen; bertindak dari status yang ditampilkan |
| "Satu atau beberapa nilai yang diperlukan tindakan ini kosong" (`MISSING_FIELDS`) | penolakan menyebut kolomnya | `amount` (kirim), `disputeReason` (sengketa), `poReference` (buat) | permukaan menghentikannya lebih dulu; jika terlihat, isi ulang dan coba lagi |
| Faktur tetap **Menunggu Pencocokan** setelah penerimaan diposting | kolom pencocokan 3 arah berbunyi Selisih Kuantitas atau Varians Harga | vonisnya varians, sehingga tajuk tidak maju (tanpa tindakan yang jujur) | sengketakan faktur, atau tunggu penerimaan yang dikoreksi diposting pada PO yang sama |
| Faktur tetap **Menunggu Pencocokan** dan pencocokan berbunyi Menunggu / Menunggu GR | belum ada penerimaan pada PO itu yang diposting sejak faktur diajukan | kaskade hanya berjalan saat posting GR; faktur yang diajukan setelah penerimaannya diposting tidak dicocokkan oleh apa pun | posting penerimaan di `/buyer/goods-receipt`; jika sudah diposting, belum ada jalur pencocokan ulang hari ini |
| "Tinjau pencocokan" tidak melakukan apa pun | toast info "Menunggu pencocokan 3 arah — Tidak ada yang berubah di sini." | footer pada baris Menunggu Pencocokan bersifat informatif | bukan kesalahan; pencocokan adalah kaskade |
| Faktur tertahan di **Releasing Payment** | footer "Menunggu penyelesaian SAP — dokumen FI belum ada" atau catatan kegagalan | penyelesaian belum mendarat atau gagal | **Coba selesaikan lagi** jika ditawarkan; kegagalan `REFUSED` / `UNGOVERNED` memerlukan penyebab yang disebutkan diperbaiki; laporkan dengan referensi `cmd_…` |
| "Eskalasi" / "Kirim ke pemasok" / "Unduh PDF" / "Ekspor" tidak melakukan apa pun | toast info menyatakan tidak ada yang diteruskan / dibuat / diunduh | kontrol ini belum tersambung ke kanal nyata | bukan kesalahan; gunakan kanal di luar portal |
| **Selesaikan** milik pemasok pada baris sengketa tidak melakukan apa pun | toast "Penyelesaian sengketa belum tersedia" | penyelesaian adalah tindakan keuangan di sisi pembeli | keuangan memakai **Selesaikan sengketa** di `/buyer/invoices` |
| Toast persetujuan berbunyi "Dicatat tanpa nama penyetuju" | teks toast sukses | tidak ada orang yang dikenali dalam sesi ini (disengaja) | bukan kesalahan; penyedia identitas nyata mengisinya kelak |
| `STALE_STATE` | penolakan menyebut status yang diharapkan dan yang ditemukan | pemanggil menyertakan `expectedState` dan dokumen bergerak | belum ada layar faktur yang menyertakannya hari ini; buka kembali dan putuskan lagi |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:INV`, atau `MODULE_INACTIVE:INV.disputes` bila hanya *Sengketa* yang dinonaktifkan, atau `MODULE_INACTIVE:INV.paymentRelease` bila hanya *Pelepasan pembayaran* yang dinonaktifkan; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Faktur & pembayaran"* | modul Faktur & pembayaran (atau salah satu bagiannya) dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61-114; src/lib/glossary/refusals.glossary.ts:32-130; src/pages-v2/SupplierInvoices.tsx:254-310; src/pages-v2/BuyerInvoices.tsx:409-480; src/pages-v2/BuyerInvoices.tsx:1101-1141; src/services/data/mock/MockCommandService.ts:2851-2881; src/services/transitions/invoiceRollup.ts:83-104; src/lib/i18n/buyerInvoices.ts:273-277; src/lib/i18n/buyerInvoices.ts:339-343; src/lib/i18n/supplierInvoices.ts:171-176 -->

<!-- section:testdata -->
## 9 · Data uji

Fixture bersifat SIMULASI dan digeser ke "hari ini" yang dideklarasikan (31 Agu 2026). Pemasok tersemai dalam korpus faktur: sup-007, sup-002, sup-001, sup-003, sup-005, sup-006, sup-004.

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Draft | `inv-brl-0055` | INV-2026-BRL-0055 | *Draf* — sup-007; satu-satunya draf tersemai — tekan **Kirim** di sisi pemasok. Draf yang dibuat diberi nomor `INV-2026-9001`… |
| Submitted | `inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325` | INV-2026-BRL-0051, INV-2026-MSM-0224, INV-2025-MUS-0214, INV-2026-FIR-0325 | *Diajukan* — semuanya membawa status pencocokan Pending GR; hanya `inv-fir-0325` (PO-2025-00104 + GR-2026-012) yang mencapai `Matched` saat penerimaannya diposting |
| Matched | — | — | *Cocok* — tidak ada fixture; capai lewat `inv-fir-0325` + memposting GR-2026-012 |
| Approved | `inv-giv-0892`, `inv-evo-0188` | INV-2025-GIV-0892, INV-2025-EVO-0188 | *Disetujui* — keduanya sudah cocok; `inv-evo-0188` adalah baris Jatuh Tempo yang dimaksudkan korpus pada "hari ini" yang dideklarasikan |
| Releasing Payment | — | — | *Merilis Pembayaran* — tidak ada fixture; status antara yang dicapai lewat **Rilis pembayaran**, selesai ~1,2 dtk kemudian |
| Payment Released | `inv-brl-0042`, `inv-msm-0210`, `inv-eco-0341`, `inv-bas-0561`, `inv-fir-0309` | INV-2025-BRL-0042, INV-2025-MSM-0210, INV-2025-ECO-0341, INV-2025-BAS-0561, INV-2025-FIR-0309 | *Pembayaran Dirilis* — membawa dokumen FI dan referensi pembayaran; tindakan **Bukti Pembayaran** di sisi pemasok |
| Remittance Received | — | — | *Bukti Pembayaran Diterima* — tidak ada fixture dan tidak ada pemanggil — fakta bank tanpa umpan |
| Disputed | `inv-brl-0043`, `inv-smpl-1180` | INV-2025-BRL-0043, INV-2026-SMPL-1180 | *Disengketakan* — masing-masing Qty Mismatch dan Price Variance; **Selesaikan sengketa** mengembalikannya ke Submitted |

<!-- src: src/services/data/mock/fixtures/invoices.ts:25-233; src/services/data/mock/stores/invoiceStore.ts:45-58; _derived/guidefacts.json (invoice.fixtures) -->
