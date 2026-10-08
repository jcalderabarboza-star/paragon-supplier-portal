---
entity: purchaseOrder
locale: id
title: Pesanan pembelian
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_po_issue
  - t_po_view
  - t_po_acknowledge
  - t_po_confirm
  - t_po_partial_deliver
  - t_po_deliver
  - t_po_close
---

<!-- section:summary -->
## 1 · Apa proses ini

Komitmen Paragon untuk membeli — apa yang dipesan, dengan harga berapa, untuk kapan. Setiap pengiriman, penerimaan, dan tagihan di hilir bergantung pada satu dokumen ini. Pesanan pembelian (PO) adalah jangkar yang dirujuk semua dokumen berikutnya: advance ship notice menyebutnya di `poReference`, penerimaan barang membawa nomornya, dan faktur menagih terhadapnya.

Portal adalah tempat pemasok **menerima** PO, bukan tempat Paragon menerbitkannya. Dokumen ini lahir di S/4HANA dan tiba di sini sebagai fakta (`Sent`). Dari situ kontak **pemenuhan** (fulfilment) pemasok melakukan dua hal yang ditawarkan portal: mengakui bahwa pesanan sudah sampai ke seseorang, dan mengonfirmasi kuantitas yang benar-benar akan dikirim. Setelah dikonfirmasi, semua yang menggerakkan pesanan ke depan — pengiriman sebagian, pengiriman penuh, penutupan — kembali menjadi tindakan S/4HANA, dibaca portal dan ditampilkan sebagai penantian ("Menunggu S/4HANA"). Di sisi pembeli tidak ada yang menekan apa pun pada PO; pembeli membacanya di `/buyer/orders`.

Penanda kejujuran yang perlu dibawa pembaca sepanjang panduan ini: baris pesanan dalam demo adalah **fixture TERSIMULASI** (`mockPurchaseOrders.ts`), dan halaman membawa penanda provenans yang menyatakannya; dua kata kerja pemasok (`t_po_acknowledge`, `t_po_confirm`) benar-benar dikirim melalui tulang punggung perintah dan menulis jejak audit; `t_po_view` ada di mesin tetapi **tidak ada layar yang memicunya** — dua fixture `Viewed` adalah satu-satunya cara melihat status itu; lencana `+Nh terlambat` pada daftar pembeli membaca angka fixture yang tersimpan, bukan jam.

<!-- section:lifecycle -->
## 2 · Perjalanan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Sent | fakta eksternal (S/4HANA) | otomasi | `t_po_issue` |
| 2 | Sent → Viewed | tidak aktif (tanpa pemanggil) | pemasok · pemenuhan | `t_po_view` |
| 3 | Sent, Viewed → Acknowledged | tindakan operator | pemasok · pemenuhan | `t_po_acknowledge` |
| 4 | Sent, Viewed, Acknowledged → Confirmed | tindakan operator | pemasok · pemenuhan | `t_po_confirm` |
| 5 | Confirmed → Partially Delivered | fakta eksternal (S/4HANA) | otomasi | `t_po_partial_deliver` |
| 6 | Confirmed, Partially Delivered → Delivered | fakta eksternal (S/4HANA) | otomasi | `t_po_deliver` |
| 7 | Delivered → Closed | fakta eksternal (S/4HANA) | otomasi | `t_po_close` |
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:35-145 -->

**Percabangan**

- **Di Sent:** `t_po_view` — pemenuhan — tidak pernah (tanpa pemanggil); `t_po_acknowledge` — pemenuhan — saat pemasok ingin menyatakan "sudah diterima, sedang dikerjakan" sebelum berkomitmen pada angka; `t_po_confirm` — pemenuhan — saat pemasok siap langsung berkomitmen pada kuantitas tiap baris.
- **Di Viewed:** `t_po_acknowledge` — pemenuhan — seperti di atas; `t_po_confirm` — pemenuhan — seperti di atas.
- **Di Confirmed:** `t_po_partial_deliver` — S/4HANA — saat pergerakan barang mencakup sebagian pesanan; `t_po_deliver` — S/4HANA — saat pergerakan barang mencakup seluruhnya.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_po_issue — Pesanan diterbitkan di S/4HANA <!-- transition:t_po_issue -->

- **Jenis langkah:** fakta eksternal (S/4HANA) · pembuatan
- **Peran:** otomasi (S/4HANA memiliki tindakan ini)
- **Dari → ke:** ∅ → Sent
- **Operator — di mana:** tidak ada yang menekan ini di portal. Pembeli membaca hasilnya di `/buyer/orders`; pemasok membacanya di `/supplier/orders` (**Pesanan Saya**).
- **Operator — lakukan:** tidak ada di portal. Pembelian menjadikan keputusannya mengikat di S/4HANA; sebelum dokumen ini ada, pemasok tidak punya dasar yang aman untuk mulai berproduksi.
- **Operator — isi:** mesin mewajibkan `supplierId` dan `lineItems` pada catatan; keduanya berasal dari S/4HANA, bukan dari formulir di sini.
- **Penguji — status yang diharapkan:** Sent
- **Penguji — konfirmasi:** baris muncul di **Pesanan Saya** milik pemasok dengan chip `Dikirim` dan di tab **Perlu tindakan**; widget dasbor pemasok **Pesanan untuk dikonfirmasi** menghitungnya.
- **Penguji — peristiwa pemicu:** `t_po_issue`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib — dan tidak ada pemanggil di portal yang bisa ditolak.
- **Glosarium:** `UNSUPPORTED_CREATION` (jawaban dispatcher bila sesuatu mencoba membuat PO di sini).
- **Kejujuran:** tidak ada jalur tulis untuk PO di portal ini. Dalam demo setiap pesanan `Sent` adalah **fixture TERSIMULASI**; penguji tidak dapat mencetak yang baru.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:36-54; src/data/mockPurchaseOrders.ts:131-142; src/lib/i18n/processFlows.ts:63 -->

### t_po_view — Pesanan dibuka oleh seseorang <!-- transition:t_po_view -->

- **Jenis langkah:** tidak aktif (tanpa pemanggil)
- **Peran:** pemasok · pemenuhan (atom `po:view`)
- **Dari → ke:** Sent → Viewed
- **Operator — di mana:** tidak disediakan di mana pun hari ini. Membuka panel samping pesanan di `/supplier/orders` **tidak** memicunya.
- **Operator — lakukan:** tidak ada — kata kerja ini memberi tahu pembeli bahwa pesanan sampai ke seseorang, bukan sekadar ke kotak masuk, tetapi tidak ada layar yang mencatat momen itu.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Viewed (hanya fixture)
- **Penguji — konfirmasi:** dua fixture `po-006` / `po-020` menampilkan chip `Dilihat` di kedua kursi; tidak ada tindakan penguji yang memindahkan pesanan `Sent` ke `Viewed`.
- **Penguji — peristiwa pemicu:** `t_po_view` (tidak pernah dipancarkan oleh permukaan)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `ILLEGAL_TRANSITION` (jawaban untuk pengiriman buatan tangan dari status selain `Sent`).
- **Kejujuran:** **WIRED-NO-CALLER.** Transisi terdaftar dan dapat dikirim, tetapi tidak ada hook dan tidak ada halaman yang memanggilnya. Permukaan tetap menawarkan **Akui penerimaan** pada pesanan `Viewed` karena mesin menyatakan itu legal.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:55-65; src/pages-v2/SupplierOrders.tsx:422-433; _derived/surfaces.md:8 -->

### t_po_acknowledge — Akui penerimaan <!-- transition:t_po_acknowledge -->

- **Jenis langkah:** tindakan operator
- **Peran:** pemasok · pemenuhan (atom `po:acknowledge`)
- **Dari → ke:** Sent, Viewed → Acknowledged
- **Operator — di mana:** `/supplier/orders` → klik baris `Sent` atau `Viewed` (atau tombol **Lihat**) → footer panel samping → **Akui penerimaan** (menampilkan **Mengakui…** selagi diproses).
- **Operator — lakukan:** memberi tahu Paragon bahwa pesanan sudah dilihat dan sedang ditelaah, tanpa mengikat diri pada kuantitas apa pun. Berguna ketika jawaban sungguhan butuh berhari-hari. Tombol hanya muncul di tempat mesin menyatakan kata kerja ini legal; pada pesanan `Sent` ia berdampingan dengan **Konfirmasi pesanan** di slotnya sendiri.
- **Operator — isi:** tidak ada yang diisi — kata kerja ini sengaja tanpa muatan.
- **Penguji — status yang diharapkan:** Acknowledged
- **Penguji — konfirmasi:** toast **"PO-… diakui — Paragon dapat melihat Anda telah menerima pesanan. Konfirmasi kuantitas masih terbuka."**; chip status di panel dan baris berbunyi `Diakui`; pesanan tetap di **Perlu tindakan**; daftar `/buyer/orders` pembeli menampilkan chip yang sama; widget **Pesanan untuk dikonfirmasi** di dasbor pemasok masih menghitungnya (widget menghitung `Sent` dan `Acknowledged`).
- **Penguji — peristiwa pemicu:** `t_po_acknowledge`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `SCOPE_DENIED`.
- **Kejujuran:** kursi tanpa `po:acknowledge` (komersial atau administrasi) melihat **Menunggu Pemenuhan Pemasok** di slot footer itu alih-alih tombol. Kuantitas baris tidak tersentuh oleh tindakan ini.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:66-76; src/pages-v2/SupplierOrders.tsx:430-463,658-674; src/services/query/commandHooks.ts:224-240; src/lib/i18n/supplierOrders.ts:193-201 -->

### t_po_confirm — Konfirmasi pesanan <!-- transition:t_po_confirm -->

- **Jenis langkah:** tindakan operator
- **Peran:** pemasok · pemenuhan (atom `po:confirm`)
- **Dari → ke:** Sent, Viewed, Acknowledged → Confirmed
- **Operator — di mana:** dua pintu, keduanya di `/supplier/…`:
  1. `/supplier/orders` → tombol baris **Konfirmasi** (atau **Konfirmasi pesanan** di footer panel) membuka panel dalam mode penyuntingan → **Item baris — konfirmasi kuantitas** → **Konfirmasi pesanan**.
  2. `/supplier/dashboard` → widget **Pesanan untuk dikonfirmasi** → **Confirm** pada baris, atau **Konfirmasi pesanan** pada kepala widget. Pintu ini mengonfirmasi **sesuai pesanan** (setiap baris pada kuantitas yang dipesan) tanpa penyuntingan.
- **Operator — lakukan:** berkomitmen pada jumlah tiap baris yang benar-benar akan dikirim. Inilah janji yang dipakai pabrik untuk merencanakan produksi, dan angka pembanding bagi setiap kekurangan di kemudian hari. Di panel penyuntingan setiap baris punya sel **Dikonfirmasi** yang sudah terisi kuantitas pesanan; ketik angka lebih kecil untuk konfirmasi sebagian. **Tanggal pengiriman dikonfirmasi** (terisi tanggal yang diminta) dan **Catatan untuk Paragon** dikirim bersama kuantitas dan disimpan pada pesanan; spanduk memperingatkan "Nilai yang dikonfirmasi berbeda dari PO asli" bila ada yang berubah. **Minta perubahan sebagai gantinya** membuka permintaan perubahan teks bebas — lihat Kejujuran.
- **Operator — isi:** `confirmedQuantities` — satu angka per baris, masing-masing antara 1 dan kuantitas yang dipesan. Panel menolak sebelum pengiriman pada sel kosong, bukan angka, atau pemisah yang ambigu ("1.500"), dan membuat tombol abu-abu selagi ada baris di luar batas. `confirmedDeliveryDate` — opsional, satu hari kalender (YYYY-MM-DD) pada atau setelah tanggal pesanan; konfirmasi yang tidak menyebut tanggal membiarkan tanggal tersimpan apa adanya. `confirmationNote` — teks opsional, paling banyak 500 karakter.
- **Penguji — status yang diharapkan:** Confirmed
- **Penguji — konfirmasi:** toast **"PO-… dikonfirmasi — <correlationId> tercatat. Notifikasi pengadaan menunggu kanal langsung."**; panel berganti ke ringkasan **Pesanan dikonfirmasi** (Pengiriman · Total kuantitas · Berikutnya: Buat ASN); baris berpindah dari **Perlu tindakan** ke **Sedang berjalan**; ringkasan membaca pesanan yang tersimpan, sehingga menampilkan waktu **Dikonfirmasi pada**, tanggal pengiriman yang dikonfirmasi, dan catatan persis seperti tercatat, dan membuka pesanan itu lagi kemudian menampilkan ketiganya ditambah kuantitas **Dikonfirmasi** per baris; baris `/buyer/orders` pembeli berbunyi `Dikonfirmasi`, dan panelnya menampilkan **Pengiriman dikonfirmasi**, **Waktu konfirmasi**, **Catatan dari pemasok**, kolom **Dikonfirmasi** pada baris (kuning bila di bawah kuantitas pesanan), dan entri siklus hidup **Dikonfirmasi oleh Pemasok** yang memuat waktu tindakan itu; baris **Berikutnya** di bawah status kini berbunyi **Menunggu S/4HANA**; di `/supplier/shipments` pesanan muncul di panel "pesanan pembelian terkonfirmasi menunggu ASN".
- **Penguji — peristiwa pemicu:** `t_po_confirm`
- **Pemeriksaan yang dapat menolak:** `po_confirm_qty_within_ordered` — konfirmasi harus mencakup setiap baris, dan setiap kuantitas yang dikonfirmasi harus berupa angka berhingga lebih dari 0 dan tidak melebihi kuantitas pesanan. `MISSING_FIELDS` dari dispatcher menyala lebih dulu bila `confirmedQuantities` tidak ada. Lalu `po_confirm_terms_well_formed`, yang membaca tanggal dan catatan opsional: `PO_CONFIRM_DATE_INVALID` (tanggal bukan hari kalender nyata bertulis YYYY-MM-DD), `PO_CONFIRM_DATE_BEFORE_ORDER` (tanggal sebelum tanggal pesanan), `PO_CONFIRM_NOTE_INVALID` (catatan bukan teks, atau lebih panjang dari 500 karakter). Konfirmasi yang ditolak tidak mengubah apa pun pada pesanan.
- **Glosarium:** `POLICY_REJECTED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Kejujuran:** pintu dasbor tidak punya penyuntingan per baris — selalu mengonfirmasi kuantitas pesanan. **Minta perubahan sebagai gantinya → Kirim permintaan perubahan** **bukan** pengiriman perintah: toast berbunyi "Permintaan perubahan untuk PO-… tidak dikirim — tidak ada yang dikirim — permintaan perubahan belum tersambung ke kanal nyata." Tombol **Buat ASN** / **Buat ASN sekarang** di halaman ini juga hanya toast ("Pembuatan ASN tidak tersedia dari panel ini — tidak ada yang dibuat"); pintu sebenarnya adalah **Pengiriman & ASN**. Kursi tanpa `po:confirm` melihat tombol baris berganti label **Lihat** dan **Menunggu Pemenuhan Pemasok** di footer; mode penyuntingan itu sendiri runtuh ke mode detail untuk kursi seperti itu, sehingga tidak ada pintu masuk yang melewati pemberitahuan.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:77-90; src/services/transitions/policies.ts:97-133; src/pages-v2/SupplierOrders.tsx:289-337,358-370,466-473,684-731; src/pages-v2/widgets/OrdersToConfirmWidget.tsx:31-62,102-115,130-133; src/services/query/commandHooks.ts:182-198; src/lib/i18n.ts:985-992; src/lib/i18n/supplierOrders.ts:213-251 -->

### t_po_partial_deliver — Sebagian pesanan tiba (S/4HANA) <!-- transition:t_po_partial_deliver -->

- **Jenis langkah:** fakta eksternal (S/4HANA)
- **Peran:** otomasi (S/4HANA memiliki tindakan ini; atom `po:fulfil`, tidak dipegang jalur mana pun)
- **Dari → ke:** Confirmed → Partially Delivered
- **Operator — di mana:** tidak ada yang menekan ini di portal. Pergerakan barang diposting di S/4HANA terhadap PO.
- **Operator — lakukan:** tidak ada di sini. Sebagian pesanan sudah tiba secara fisik; pesanan yang baru terpenuhi sebagian masih menyisakan kewajiban, dan sisa itulah yang dikejar tim pembelian.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Partially Delivered
- **Penguji — konfirmasi:** hanya fixture (`po-003`, `po-016`) — chip berbunyi `Terkirim Sebagian` di kedua kursi dan baris **Berikutnya** masih berbunyi **Menunggu S/4HANA**.
- **Penguji — peristiwa pemicu:** `t_po_partial_deliver` (tidak dipancarkan oleh permukaan mana pun)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** tidak ada yang khusus.
- **Kejujuran:** penerimaan barang yang diposting penerima di portal ini (`t_gr_post`) **tidak** memajukan PO; status PO adalah milik S/4HANA. Baris demo dalam status ini TERSIMULASI.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:91-108; src/services/transitions/nextAct.ts:194-202 -->

### t_po_deliver — Seluruh pesanan tiba (S/4HANA) <!-- transition:t_po_deliver -->

- **Jenis langkah:** fakta eksternal (S/4HANA)
- **Peran:** otomasi (S/4HANA memiliki tindakan ini; atom `po:fulfil`)
- **Dari → ke:** Confirmed, Partially Delivered → Delivered
- **Operator — di mana:** tidak ada yang menekan ini di portal.
- **Operator — lakukan:** tidak ada di sini. Seluruh pesanan sudah tiba secara fisik; pembelian berhenti mengejar dan keuangan mulai menunggu tagihan.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Delivered
- **Penguji — konfirmasi:** hanya fixture — chip `Terkirim`; di `/supplier/orders` baris berada di **Selesai** dan dihitung pada KPI **Terkirim**; baris **Berikutnya** berbunyi **Menunggu S/4HANA** (penutupan masih milik S/4HANA).
- **Penguji — peristiwa pemicu:** `t_po_deliver` (tidak dipancarkan oleh permukaan mana pun)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** tidak ada yang khusus.
- **Kejujuran:** baris TERSIMULASI. ASN yang mencapai `Delivered` (fakta TMS) dan PO yang mencapai `Delivered` (fakta S/4HANA) adalah dua fakta berbeda pada dua dokumen berbeda; tidak ada yang menggerakkan yang lain di pohon ini.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:109-126; src/pages-v2/SupplierOrders.tsx:80-101 -->

### t_po_close — Pesanan ditutup (S/4HANA) <!-- transition:t_po_close -->

- **Jenis langkah:** fakta eksternal (S/4HANA)
- **Peran:** otomasi (S/4HANA memiliki tindakan ini; atom `po:close`)
- **Dari → ke:** Delivered → Closed
- **Operator — di mana:** tidak ada yang menekan ini di portal.
- **Operator — lakukan:** tidak ada di sini. PO ditutup di S/4HANA setelah pengiriman dan penagihan direkonsiliasi; portal membaca hasilnya. Pesanan tidak lagi muncul dalam daftar pekerjaan siapa pun.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Closed (terminal)
- **Penguji — konfirmasi:** hanya fixture (`po-011`, `po-015`) — chip `Ditutup`; tidak ada kata kerja footer, tidak ada pemberitahuan serah terima, dan baris **Berikutnya** tidak menampilkan apa pun karena dokumen sudah berakhir.
- **Penguji — peristiwa pemicu:** `t_po_close` (tidak dipancarkan oleh permukaan mana pun)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** tidak ada yang khusus.
- **Kejujuran:** baris TERSIMULASI; satu-satunya terminal mesin ini.
<!-- src: src/services/transitions/flows/purchaseOrder.flow.ts:33-34,127-144; src/services/transitions/nextAct.ts:170 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Akui atau konfirmasi (di Sent dan di Viewed).** Cabang A — `t_po_acknowledge` — **Kapan:** pemasok bisa menyatakan "diterima" hari ini tetapi butuh beberapa hari sebelum berkomitmen pada kuantitas. Cabang B — `t_po_confirm` — **Kapan:** pemasok siap berkomitmen pada setiap baris sekarang; mengakui lebih dulu bersifat opsional, bukan wajib. Cabang C — `t_po_view` — **Kapan:** tidak pernah dalam praktik; tanpa pemanggil.
- **Konfirmasi sebagian versus permintaan perubahan (di dalam `t_po_confirm`).** Cabang A — ketik kuantitas yang dikurangi per baris lalu tekan **Konfirmasi pesanan** — **Kapan:** pemasok akan mengirim kurang dari yang dipesan tetapi sisa pesanan tetap berlaku; kebijakan mengizinkan kuantitas berapa pun dari 1 sampai jumlah pesanan. Cabang B — **Minta perubahan sebagai gantinya** — **Kapan:** pemasok menginginkan tanggal berbeda atau pesanan berbeda; **cabang ini tidak mengubah apa pun** (toast: tidak dikirim, tidak ada kanal yang tersambung). PO tetap di status pra-konfirmasinya.
- **Pengiriman sebagian atau penuh (di Confirmed).** Cabang A — `t_po_partial_deliver` — **Kapan:** S/4HANA memposting pergerakan barang yang mencakup sebagian pesanan. Cabang B — `t_po_deliver` — **Kapan:** pergerakan barang mencakup seluruhnya. Keduanya dibaca, tidak pernah ditekan.
- **Tidak ada pembatalan, penolakan, atau penarikan** pada mesin ini. Pemasok yang tidak dapat memenuhi tidak punya kata kerja penolakan di sini; jalur jujur hari ini adalah teks permintaan perubahan, yang tidak dikirim ke mana pun.

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Perlu tindakan Anda / "N pesanan memerlukan konfirmasi Anda" | diturunkan saat dibaca | Sent, Acknowledged | ada pesanan milik pemasok kursi ini di `Sent` atau `Acknowledged` | `/supplier/orders` — subjudul KPI **Pesanan Terbuka**, tab **Perlu tindakan**, spanduk di atas tabel |
| "N menunggu konfirmasi" (info di bawah 3, peringatan pada 3 atau lebih) | diturunkan saat dibaca | Sent, Acknowledged | seperti di atas, dihitung untuk widget | `/supplier/dashboard` — widget **Pesanan untuk dikonfirmasi** |
| Menunggu Pemenuhan Pemasok | diturunkan saat dibaca (serah terima) | Sent, Viewed, Acknowledged | kursi tidak memegang `po:acknowledge` / `po:confirm` | slot footer panel `/supplier/orders`; sel tindakan widget |
| Menunggu S/4HANA | diturunkan saat dibaca (tindakan berikutnya, eksternal) | Confirmed, Partially Delivered, Delivered | setiap jalan keluar dari status itu adalah fakta S/4HANA | baris **Berikutnya** di bawah chip status pada `/supplier/orders` dan `/buyer/orders` |
| Giliran Anda | diturunkan saat dibaca (tindakan berikutnya) | Sent, Viewed, Acknowledged | kursi memegang kata kerja yang legal | baris **Berikutnya** yang sama, kursi pemenuhan pemasok |
| `+Nh terlambat` | **kolom fixture tersimpan** (`daysOverdue`), hanya tampilan | status terbuka mana pun | `daysOverdue > 0` pada baris fixture | baris `/buyer/orders` dan KPI **Jatuh Tempo** |
| Penanda provenans | penanda TERSIMULASI | semua | selalu | baris meta `/supplier/orders` |
<!-- src: src/pages-v2/SupplierOrders.tsx:80-101,494-504; src/pages-v2/widgets/OrdersToConfirmWidget.tsx:39-40,129-130; src/pages-v2/BuyerOrders.tsx:99-100,555-557; src/services/transitions/nextAct.ts:165-207; src/data/mockPurchaseOrders.ts:18,55 -->

<!-- section:linked -->
## 6 · Objek terkait

**Entitas perwakilan:** `po-007` (PO-2025-00107, pemasok `sup-007`, status `Confirmed`).

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pemasok | `supplierId` = `sup-007` | pemilik cakupan: kursi pemasok hanya melihat PO miliknya; ketidakcocokan pada perintah melempar `SCOPE_DENIED` |
| Advance ship notice | `poReference` ASN = `PO-2025-00107` | empat ASN fixture menunjuk ke sini (`ASN-2025-00211`, `-00198`, `-00201`, `-00215`); cakupan pembuatan ASN diturunkan dari pemasok PO ini |
| Penerimaan barang | `poNumber` GR = `PO-2025-00107` | `gr-002` (GR-2026-002) merujuknya melalui pengiriman `shp-012`; status GR tidak pernah menulis balik ke PO |
| Faktur | `poNumber` faktur | pencocokan 3 arah saat GR diposting membaca `confirmedQty × unitPrice` dari baris PO ini |
| Item baris | `lineItems[i].confirmedQty` | hanya ditulis oleh `t_po_confirm`; `t_po_acknowledge` tidak menyentuhnya |
| `confirmedDeliveryDate`, `daysOverdue` | kolom fixture | hanya tampilan: **Tanggal pengiriman dikonfirmasi** di panel penyuntingan tidak dikirim dalam muatan dan tidak ada yang menulis kedua kolom ini |
| `channel` | kolom fixture | hanya tampilan |
<!-- src: src/services/data/mock/MockCommandService.ts:150-169,192; src/services/data/mock/fixtures/supplierShipments.ts:86-167; src/data/mockGoodsReceipts.ts:88-93; src/services/data/mock/MockCommandService.ts:2856-2860; src/services/query/commandHooks.ts:182-198 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap pengiriman perintah menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `personaType:supplierId` (kursi pemasok menulis `supplier:sup-007`; kursi pembeli menulis `buyer:all`), `ts`, `outcome` (`done` / `submitted` / `failed`), `correlationId`, dan `causationId` hanya pada perintah berantai (cascade). Perintah yang ditolak juga dicatat, beserta `reason`. Tidak ada yang berantai atau diselesaikan (settle) dalam alur ini, sehingga setiap peristiwa PO adalah satu `done` atau `failed`. Sink-nya berada di memori dalam demo.

Urutan kerja untuk `po-008` (PO-2025-00108, `sup-007`, status fixture `Sent`), sebagaimana dihasilkan penguji pada kursi pemenuhan pemasok:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Sent | S/4HANA (fixture) | diunggulkan | `t_po_issue` (tanpa peristiwa di sink demo) |
| T+1 | Sent → Acknowledged | pemasok · pemenuhan (`supplier:sup-007`) | **Akui penerimaan** | `t_po_acknowledge` · done |
| T+2 | Acknowledged → Confirmed | pemasok · pemenuhan (`supplier:sup-007`) | **Konfirmasi pesanan** dengan kuantitas | `t_po_confirm` · done |
| T+3 | Confirmed → (Partially) Delivered → Closed | S/4HANA | tidak dapat direproduksi di portal | `t_po_partial_deliver` / `t_po_deliver` / `t_po_close` |
<!-- src: src/services/transitions/events.ts:25-129; src/services/transitions/dispatcher.ts:397-450 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Footer menampilkan **Menunggu Pemenuhan Pemasok** alih-alih tombol; tombol baris berbunyi **Lihat** | pemberitahuan berada di tempat **Akui penerimaan** / **Konfirmasi pesanan** seharusnya | kursi tidak memegang `po:acknowledge` / `po:confirm` (`ROLE_NOT_PERMITTED` bila dipaksa) | bertindak dari kursi di jalur **pemenuhan** pemasok |
| "Tidak dapat mengonfirmasi PO-… — Sebuah aturan yang mengatur menolak tindakan ini (…po_confirm_qty_within_ordered…)" | toast saat konfirmasi | ada kuantitas 0, di atas jumlah pesanan, atau larik tidak mencakup setiap baris | perbaiki barisnya; pesan per baris di panel menyebut batasnya (1 sampai jumlah pesanan) |
| "Tidak dapat mengonfirmasi PO-… — Sebuah aturan yang mengatur menolak tindakan ini (…po_confirm_terms_well_formed: PO_CONFIRM_DATE_BEFORE_ORDER…)" (atau `PO_CONFIRM_DATE_INVALID`, `PO_CONFIRM_NOTE_INVALID`) | toast saat konfirmasi; pesanan tetap belum dikonfirmasi | tanggal pengiriman yang dikonfirmasi sebelum tanggal pesanan atau bukan hari kalender, atau catatan lebih panjang dari 500 karakter | pilih tanggal pada atau setelah tanggal pesanan, pendekkan catatan, lalu konfirmasi lagi |
| "Masukkan kuantitas yang Anda konfirmasi" / "Itu bukan kuantitas" / "Ini bisa dibaca dua cara" | sebaris di bawah sel Dikonfirmasi; tombol abu-abu | masukan kosong, bukan angka, atau ambigu | ketik angka saja, tanpa pemisah |
| "Dokumen tidak berada dalam status yang memungkinkan tindakan ini" | toast (`ILLEGAL_TRANSITION`) | pesanan sudah dikonfirmasi (tab lain, widget dasbor) | buka kembali pesanan; chip status adalah kebenarannya |
| "Tindakan ini disiapkan untuk status yang berbeda…" | toast (`STALE_STATE`) | pemanggil menyertakan `expectedState` dan barisnya sudah berpindah | tidak dimunculkan oleh permukaan PO yang dirilis (mereka tidak menyertakan `expectedState`); buka kembali dan putuskan lagi |
| "Ini di luar jangkauan akun Anda — atau memang tidak ada datanya" | kesalahan (`SCOPE_DENIED`) | perintah menyebut PO pemasok lain | bertindak hanya pada pesanan Anda sendiri |
| **Kirim permintaan perubahan** menampilkan "tidak dikirim" | toast info | permintaan perubahan belum tersambung ke kanal | hubungi pembeli di luar portal; PO tidak berubah |
| **Buat ASN** di sini berbunyi "tidak ada yang dibuat" | toast info | pembuatan ASN berada di **Pengiriman & ASN** | buka `/supplier/shipments` |
| Pesanan tetap `Confirmed` setelah barang tiba | **Berikutnya: Menunggu S/4HANA** | pengiriman dan penutupan adalah fakta S/4HANA | tidak ada yang perlu dilakukan di portal; tunggu pembaruan S/4HANA |
| Ada pesanan `Viewed` tetapi Anda tidak bisa menghasilkannya | hanya fixture yang menampilkannya | `t_po_view` tanpa pemanggil | wajar; akui atau konfirmasi dari `Viewed` tetap berfungsi |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:ORD`; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Pesanan pembelian"* | modul Pesanan pembelian dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |
<!-- src: src/lib/glossary/refusals.glossary.ts:32-97; src/lib/i18n/supplierOrders.ts:213-251; src/services/transitions/refusals.ts:61-114 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Sent | `po-005`, `po-008`, `po-012`, `po-019` | PO-2025-00105, -00108, -00112, -00119 | `po-008` milik `sup-007` dan menjadi spesimen alami untuk akui/konfirmasi; `po-005` milik `sup-005` |
| Viewed | `po-006`, `po-020` | PO-2025-00106, -00120 | status hanya fixture (tanpa pemanggil); akui dan konfirmasi legal dari sini |
| Acknowledged | `po-004`, `po-010`, `po-014` | PO-2025-00104, -00110, -00114 | konfirmasi adalah satu-satunya tindakan pemasok yang tersisa |
| Confirmed | `po-002`, `po-007`, `po-017` | PO-2025-00102, -00107, -00117 | `po-002` (`sup-002`) belum punya ASN, sehingga tampil di "menunggu ASN"; `po-007` (`sup-007`) sudah punya empat ASN |
| Partially Delivered | `po-003`, `po-016` | PO-2025-00103, -00116 | status milik S/4HANA; hanya baca |
| Delivered | `po-001`, `po-009`, `po-013`, `po-018`, `po-131` | PO-2025-00101, -00109, -00113, -00118, -00131 | `po-131` adalah induk yang ditulis untuk `ASN-2025-00302` |
| Closed | `po-011`, `po-015` | PO-2025-00111, -00115 | terminal; tanpa kata kerja footer, tanpa baris tindakan berikutnya |
<!-- src: src/data/mockPurchaseOrders.ts:5-556,596-604; _derived/guidefacts.json (purchaseOrder.fixtures) -->
