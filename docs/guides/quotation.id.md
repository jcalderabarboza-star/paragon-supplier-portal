---
entity: quotation
locale: id
title: Penawaran (quotation pemasok)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_quotation_submit
  - t_quotation_review
  - t_quotation_award
  - t_quotation_reject
  - t_quotation_withdraw
---

<!-- section:summary -->
## 1 · Apa proses ini

Penawaran seorang pemasok atas satu permintaan pengadaan — harga dan janji pengiriman yang siap mereka pertanggungjawabkan. Sebuah penawaran (quotation) milik tepat satu RFQ dan satu pemasok. Ia membawa harga satuan dan mata uang penawarannya, perkiraan waktu tunggu dalam hari bulat, kuantitas pesanan minimum opsional, tanggal penawaran berlaku, syarat pembayaran yang ditawarkan, catatan bebas, apakah batch sampel dapat disediakan dan berapa lama waktunya, serta nama dokumen penawaran yang dilampirkan (namanya saja — portal tidak menyimpan berkas). Harga totalnya adalah aritmetika yang dilakukan platform saat pengiriman: harga satuan × total kuantitas RFQ, dalam mata uang penawaran itu sendiri.

Dua peran menyentuhnya, satu di tiap sisi. **Kontak penjualan** pemasok (jalur `commercial`) mengajukan penawaran dari portal pemasok, atas acara yang mengundangnya; itulah satu-satunya verba pembuatan milik pemasok di jalur pengadaan. **Pembeli** Paragon (jalur `procurement`) membaca setiap penawaran pada satu acara berdampingan, dapat memindahkan penawaran yang baru dikirim ke tahap evaluasi, dan memutuskan acara itu pada RFQ. Tidak ada yang menekan dua langkah terakhir: ketika pembeli memenangkan RFQ, platform menandai penawaran terpilih **Awarded** dan setiap penawaran lain pada acara itu **Rejected**, di bawah grant otomasinya, dalam tindakan yang sama.

Prosesnya dimulai di **Submitted** — dokumen lahir sudah terkirim; tidak ada draf di sisi pemasok — melewati **Under Review** ketika pembeli membawanya ke evaluasi, dan berakhir di **Awarded**, **Rejected**, atau **Withdrawn**, tiga status terminal. Awarded dan Rejected adalah konsekuensi pemenangan RFQ; Withdrawn adalah konsekuensi pembatalan RFQ. Tak satu pun dapat dimasukkan secara manual pada satu penawaran, dan tidak ada verba bagi pemasok untuk menarik, merevisi, atau menolak penawaran.

Penanda kejujuran yang perlu diketahui pembaca sebelum memakai panduan ini. Penawaran yang di-seed adalah fixture **SIMULASI** atas RFQ SIMULASI. Penawaran yang dibuat saat runtime disimpan dengan **baseline SIMULASI datar sebesar 50** untuk skor kepatuhan dan keandalannya — tidak ada sumber kepatuhan atau ketepatan pengiriman yang hidup — dan skor harga, waktu tunggu, dan kompositnya dihitung oleh perbandingan pembeli saat dibaca, tidak pernah disimpan; perbandingan menandai sumbu-sumbu itu "Simulasi" dan waktu tunggu "Perkiraan". Pemasok hanya melihat penawarannya sendiri dan hanya fakta serta statusnya — tidak pernah skor, peringkat, atau penawaran pesaing. Pemenangan tidak membuat purchase order; riwayat pemenangan pemasok berbunyi "PO diterbitkan —". Kontrol "Tolak RFQ" dan "Ajukan pertanyaan" di samping tombol kirim adalah toast yang menyatakan tidak ada yang ditolak dan tidak ada yang dikirim. Setiap tindakan manusia dicatat tanpa nama orang.

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Submitted | tindakan operator (pembuatan); lima pemeriksaan kebijakan | supplier · commercial | `t_quotation_submit` |
| 2 | Submitted → Under Review | tindakan operator | buyer · procurement | `t_quotation_review` |
| 3 | Submitted, Under Review → Awarded | kaskade (dari `t_rfq_award`, penawaran terpilih) | automation | `t_quotation_award` |
| 4 | Submitted, Under Review → Rejected | kaskade (dari `t_rfq_award`, setiap penawaran lain pada acara itu) | automation | `t_quotation_reject` |
| 5 | Submitted, Under Review → Withdrawn | kaskade (dari `t_rfq_cancel`, setiap penawaran yang masih ditimbang) | automation | `t_quotation_withdraw` |

<!-- src: src/services/transitions/flows/quotation.flow.ts:215-303; src/services/transitions/cascades.ts:57-60 -->

**Percabangan**

- **Di Submitted:** `t_quotation_review` — procurement — ketika pembeli mulai mengevaluasi penawaran ini; `t_quotation_award` — automation — ketika pembeli memenangkan RFQ untuk penawaran ini; `t_quotation_reject` — automation — ketika pembeli memenangkan RFQ untuk penawaran lain pada acara yang sama; `t_quotation_withdraw` — automation — ketika pembeli membatalkan RFQ. Tinjauan bersifat opsional: penawaran Submitted dapat langsung dimenangkan, ditolak, atau ditarik.
- **Di Under Review:** `t_quotation_award` — automation — penawaran ini dipilih pada RFQ; `t_quotation_reject` — automation — penawaran lain yang dipilih; `t_quotation_withdraw` — automation — RFQ dibatalkan. Tidak ada jalan kembali ke Submitted dan tidak ada penolakan satu penawaran di sisi pembeli.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_quotation_submit — Kirim penawaran <!-- transition:t_quotation_submit -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** supplier · commercial (atom `quotation:submit`)
- **Dari → ke:** ∅ → Submitted
- **Operator — di mana:** `/supplier/rfqs` ("Acara Sourcing Saya") → tab **Acara terbuka** → kartu RFQ → **Kirim penawaran** → panel samping "Kirim penawaran — RFQ-…" → **Kirim penawaran**. Kursi fulfilment atau back office melihat "Menunggu Komersial Pemasok" di slot tombol itu (`handoff-quotation-submit`); bila kursi dipersempit saat panel terbuka, panel menutup kembali ke kartu.
- **Operator — lakukan:** Pemasok mengajukan penawarannya: berapa biayanya, dalam mata uang apa, dan berapa lama pengirimannya. Ketiganya, karena harga tanpa tanggal tidak bisa dibandingkan. Langkah 1 "Harga": ketik harga satuan (angka saja — "misalnya 15000"), pilih **Mata uang penawaran** (IDR, USD, atau EUR; IDR adalah default) dan baca total yang dihitung otomatis. Langkah 2 "Waktu & kuantitas": ketik **Perkiraan waktu tunggu** dalam hari atau minggu bulat (0 berarti pengiriman di hari yang sama dan memerlukan centang konfirmasi "Saya konfirmasi penawaran ini menawarkan pengiriman di hari yang sama."), isi **Penawaran berlaku hingga** (hari ini atau sesudahnya — tanggal yang sudah lewat ditolak di kolomnya dan tombol ditahan), dan opsional **Kuantitas pesanan minimum** (kosong berarti "sama dengan kuantitas RFQ"). Langkah 3 mencantumkan dokumen halal, BPOM, dan mutu milik pemasok itu sendiri dari Dokumen Saya, masing-masing dalam keadaannya hari ini (Berlaku, Segera Kedaluwarsa, Kedaluwarsa, Menunggu Unggahan, Sedang Ditinjau, Ditolak) beserta tanggal berakhirnya; pemasok yang tidak memiliki satu pun membaca "Belum ada dokumen halal, BPOM, atau mutu di berkas. Tambahkan di Dokumen Saya." Langkah 4 menerima catatan, apakah batch sampel dapat disediakan beserta waktu tunggunya, dan PDF penawaran opsional — nama berkasnya disimpan bersama penawaran; berkasnya sendiri tidak disimpan, dan baris di bawah kotak mengatakannya. Tekan Kirim penawaran. Toast: "Penawaran dikirim untuk RFQ-… · Tim pengadaan Paragon akan meninjau paling lambat <tenggat respons>."
- **Operator — isi:** wajib menurut mesin: RFQ (`rfqId`, dari kartu), harga satuan (`unitPrice`), waktu tunggu dalam hari (`leadTimeDays`) dan mata uang (`currency`). Wajib menurut formulir: tanggal berlaku hingga ("Kolom wajib belum diisi — Harap isi: Penawaran berlaku hingga."). Setiap angka melewati satu parser dan ditolak dengan kalimatnya sendiri: harga kosong, bukan angka, ambigu ("1.500"), atau nol; waktu tunggu kosong, bukan angka, ambigu, atau pecahan (sebagian hari bukan janji); kuantitas minimum bukan angka, ambigu, atau nol (kosong sah).
- **Penguji — status yang diharapkan:** Submitted
- **Penguji — konfirmasi:** panel tertutup dan halaman beralih ke **Penawaran Saya**, tempat baris baru menampilkan nomor yang ditetapkan store (`QUO-2026-901`, `-902`…), tanggal dikirim, harga satuan dan total dalam mata uang penawaran, waktu tunggu "N hari", minimum ("Sama dengan jml RFQ" bila tidak ada), tanggal berlaku hingga, dan pil **Diajukan**; RFQ hilang dari tab Acara terbuka (acara yang sudah Anda tawar dipangkas darinya) dan KPI "Menunggu Pemenangan" menghitungnya. Di sisi pembeli, `/buyer/sourcing` → panel RFQ → "Perbandingan penawaran" mendapat kolom dengan pil **Submitted** dan tautan **Pindahkan ke tinjauan**, dan baris **Berlaku hingga**, **Batch sampel** ("Dapat menyediakan" / "Tidak dapat menyediakan"), **Waktu tunggu sampel**, **Catatan pemasok**, dan **Dokumen penawaran** (bertanda "Nama saja") membaca apa yang diketik pemasok; jawaban yang tidak diberikan siapa pun berbunyi "Tidak dinyatakan". Gunakan `rfq-011` (RFQ-2026-011) dengan persona pemasok seed sup-007: satu-satunya acara Open yang mengundangnya, belum ditawarnya, dan masih di dalam tenggat responsnya. `rfq-010` (RFQ-2026-010) adalah spesimen kasus sebaliknya — tenggat responsnya 28 Agu 2026, sehingga kartunya berbunyi "Tenggat tanggapan telah lewat" dan tidak menawarkan formulir.
- **Penguji — peristiwa pemicu:** `t_quotation_submit` (aktor `supplier:<supplierId>`)
- **Pemeriksaan yang dapat menolak:** `quotation_submit_currency_permitted` — mata uang harus salah satu mata uang penawaran yang diizinkan (IDR, USD, EUR), berdasarkan keanggotaan, bukan sekadar ada; penolakan berbunyi `currency 'X' is not permitted (IDR, USD, EUR)` dan toast berbunyi "“X” bukan mata uang yang diterima Paragon untuk penawaran. Yang diizinkan: IDR, USD, EUR. Penawaran Anda tidak dikirim." Cakupan — pemilik penawaran baru adalah pemasok yang mengirim **hanya bila ia ada di daftar undangan RFQ**; pemasok yang tidak diundang, atau yang menyebut id pemasok lain, ditolak `SCOPE_DENIED` sebelum pemeriksaan lain. Kursi pembeli lolos cakupan dan ditolak di gerbang peran. Lalu empat pemeriksaan atas acara dan penawarannya, dalam urutan ini, masing-masing ditolak dengan namanya dan toast-nya sendiri. `quotation_submit_event_open` — acara harus Open; berbunyi `QUOTE_EVENT_NOT_OPEN: RFQ-… is Closed. Quotations are taken only while a sourcing event is Open.`; toast "Acara sourcing ini tidak lagi terbuka, sehingga penawaran tidak diterima. Penawaran Anda tidak dikirim." `quotation_submit_before_deadline` — tenggat respons belum boleh lewat pada masa kini yang dinyatakan (hari tenggat itu sendiri masih terbuka); berbunyi `QUOTE_DEADLINE_PASSED: the response deadline of RFQ-… was <tanggal> (today is 2026-08-31). …`; toast "Tenggat tanggapan acara ini telah lewat. Penawaran Anda tidak dikirim." `quotation_submit_one_per_supplier` — satu penawaran per pemasok per acara, apa pun yang terjadi pada yang pertama; berbunyi `QUOTE_ALREADY_SUBMITTED: <pemasok> already holds quotation <id> on this event. …`; toast "Anda sudah mengirim penawaran untuk acara ini. Satu penawaran per acara; penawaran yang sudah dikirim tidak dapat direvisi atau diganti." `quotation_submit_validity_current` — tanggal berlaku-hingga yang dinyatakan harus hari ini atau sesudahnya, dan harus berupa tanggal; berbunyi `QUOTE_VALIDITY_PAST: the quotation is stated valid until '<nilai>', which is not a date on or after today (2026-08-31). …`; toast "Tanggal berlaku-hingga sudah lewat. Pilih tanggal mulai hari ini lalu kirim lagi."
- **Glosarium:** `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`, `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Penawaran lahir sebagai Submitted — tidak ada draf pemasok dan tidak ada penyuntingan atau penarikan sesudahnya. Total adalah harga satuan × kuantitas RFQ, dihitung sekali saat pembuatan dalam mata uang penawaran. Kepatuhan dan keandalan disimpan pada baseline SIMULASI 50; skor harga, waktu tunggu, dan komposit disimpan sebagai 0 dan dihitung oleh perbandingan pembeli saat dibaca. Tanggal dikirim adalah tanggal peramban, bukan masa kini yang dinyatakan. Siapa yang sudah menjawab suatu acara diturunkan dari penawarannya, sehingga hitungan "Respons" pembeli bergerak begitu penawaran masuk. Hitungan hari pada kartu dan setiap penolakan bertanggal diukur terhadap masa kini yang dinyatakan (31 Agu 2026), saat yang sama yang dipakai papan pembeli. Penawaran kedua ditolak, bukan dianggap revisi: tidak ada yang menautkan penawaran baru ke penawaran yang digantikannya, sehingga dua baris berarti dua penawaran yang sama-sama dapat dimenangkan dari satu pemasok. Penawaran yang sama sekali tidak menyatakan tanggal berlaku-hingga tidak ditolak mesin; formulirlah yang mewajibkannya. Dokumen di langkah 3 dibaca dari Dokumen Saya dan tidak disalin ke penawaran. Dari PDF yang dilampirkan hanya nama berkasnya yang disimpan: portal ini tidak punya penyimpanan berkas, dan perbandingan pembeli menandai barisnya "Nama saja".
<!-- src: src/services/transitions/flows/quotation.flow.ts:237-253; src/services/transitions/policies.ts:189-206; src/pages-v2/SupplierRFQs.tsx:325-345; src/pages-v2/SupplierRFQs.tsx:430-460; src/pages-v2/SupplierRFQs.tsx:766-796; src/pages-v2/SupplierRFQs.tsx:830-1025; src/pages-v2/SupplierRFQs.tsx:1090-1125; src/pages-v2/SupplierRFQs.tsx:1195-1215; src/pages-v2/SupplierRFQs.tsx:1338; src/pages-v2/rfqs/quotationSubmitModel.ts:116-208; src/pages-v2/rfqs/quotationPrice.ts:67; src/pages-v2/rfqs/quotationLeadTime.ts:80; src/pages-v2/rfqs/quotationMoq.ts:78; src/services/query/commandHooks.ts:554-569; src/services/data/mock/MockCommandService.ts:589-672; src/services/data/mock/stores/quotationStore.ts:96-100; src/lib/currencyPolicy.ts:38-49; src/lib/i18n/rfqs.ts:240-242; src/lib/i18n/rfqs.ts:277-374; src/data/mockRfqs.ts:293-354 -->

### t_quotation_review — Pindahkan ke tinjauan <!-- transition:t_quotation_review -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · procurement (atom `quotation:review`)
- **Dari → ke:** Submitted → Under Review
- **Operator — di mana:** `/buyer/sourcing` → buka RFQ → "Perbandingan penawaran" → baris **Status** → **Pindahkan ke tinjauan** di bawah pil penawaran. Tautan hanya ada di bawah penawaran **Submitted**; kursi tanpa `quotation:review` melihat "Menunggu Pengadaan" di sel itu (`handoff-rfq-review`), satu pemberitahuan per penawaran.
- **Operator — lakukan:** Pembelian membawa penawaran itu ke tahap penilaian. Ini memisahkan yang sudah dibaca dari yang masih menumpuk. Tekan Pindahkan ke tinjauan pada kolomnya. Toast: "Penawaran dipindahkan ke tinjauan · Penawaran kini sedang dievaluasi."
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Under Review
- **Penguji — konfirmasi:** pil di baris Status perbandingan berubah di tempat dari **Submitted** (netral) menjadi **Under Review** (info) dan tautannya hilang; di sisi pemasok baris di **Penawaran Saya** kini berbunyi **Sedang Ditinjau** dan KPI "Menunggu Pemenangan" tidak berubah (ia menghitung Submitted dan Under Review bersama). Fixture: `qt-011a` pada `rfq-011` (RFQ-2026-011) adalah satu-satunya penawaran seed berstatus Submitted.
- **Penguji — peristiwa pemicu:** `t_quotation_review` (aktor `buyer:all`)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Tinjauan mengubah status dan tidak ada yang lain — tidak ada skor yang dihitung atau disimpan olehnya, dan pemenangan tidak memerlukannya (penawaran Submitted dapat langsung dimenangkan atau ditolak). Tidak ada jalan kembali ke Submitted dan tidak ada verba "tolak yang ini" di sisi pembeli; satu-satunya jalan keluar dari Under Review adalah dua kaskade. Setiap penawaran seed pada acara Open selain `qt-011a` sudah Under Review.
<!-- src: src/services/transitions/flows/quotation.flow.ts:256-265; src/pages-v2/BuyerSourcing.tsx:1227-1258; src/pages-v2/BuyerSourcing.tsx:3688-3728; src/pages-v2/SupplierRFQs.tsx:814-828; src/services/query/commandHooks.ts:572-591; src/services/data/mock/MockCommandService.ts:611-617; src/lib/i18n/sourcing.ts:594; src/lib/i18n/sourcing.ts:752-755; src/data/mockQuotations.ts:436-462 -->

### t_quotation_award — Penawaran dimenangkan (kaskade) <!-- transition:t_quotation_award -->

- **Jenis langkah:** kaskade (digerakkan sistem); dipicu oleh `t_rfq_award`
- **Peran:** automation (atom `quotation:award`; tidak ada jalur manusia yang memegangnya)
- **Dari → ke:** Submitted, Under Review → Awarded
- **Operator — di mana:** tidak ada yang menekan ini pada sebuah penawaran. Pembeli memenangkan RFQ di `/buyer/sourcing` → panel RFQ → centang **Menangkan** pada kolom penawaran ini → **Menangkan yang dipilih**; platform memicu ini pada penawaran terpilih.
- **Operator — lakukan:** Penawaran ini menang. Ia mengikuti keputusan pembelian atas permintaannya, dan tidak pernah dimasukkan satu per satu secara manual. Platform membaca id penawaran pemenang dari payload pemenangan, menemukannya di antara penawaran RFQ dalam store, dan mendispatch transisi ini padanya di bawah grant otomasi.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Awarded
- **Penguji — konfirmasi:** di sisi pembeli baris Status perbandingan berbunyi **Awarded** pada kolom ini dan "Ringkasan pemenangan" RFQ menyebut pemasok dan nilainya; tab `/supplier/rfqs` → **Pemenangan & riwayat** milik pemasok mencantumkan RFQ dengan hasil **Dimenangkan**, catatan "Dimenangkan — penawaran Anda dipilih", tanggal pemenangan, nilai kontrak dalam mata uang penawaran, dan "PO diterbitkan —", serta baris tingkat kemenangan bergerak. Baris itu keluar dari hitungan menunggu di **Penawaran Saya**. Contoh seed: `qt-006a` (RFQ-2026-006, sup-001), `qt-007a` (RFQ-2026-007, sup-005).
- **Penguji — peristiwa pemicu:** `t_quotation_award` (event-nya membawa `causationId` = correlationId `t_rfq_award`; aktor `buyer:all` di bawah grant otomasi)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib. Penawaran yang sudah berada di status terminal ditolak `ILLEGAL_TRANSITION`; penolakan dicatat dengan `causationId` pemenangan dan tidak pernah membatalkan pemenangan.
- **Glosarium:** `ILLEGAL_TRANSITION`; label status "Awarded" (Dimenangkan).
- **Kejujuran:** Tidak ada yang dibuat di hilir — tidak ada purchase order, tidak ada kontrak; kolom "PO diterbitkan" berisi "—" secara konstruksi. "Tanggal pemenangan" yang ditampilkan ke pemasok adalah tenggat pemenangan RFQ, bukan cap waktu tindakan. Penyebaran berjalan di dalam `catch {}` upaya-terbaik; penolakan peran atau legalitas dicatat pada audit sink, tetapi penawaran yang tidak ditemukan dilewati tanpa jejak (resolver hanya menyerahkan id yang ditemukannya di store). Pemasok tidak diberi tahu lewat kanal apa pun; hasilnya terlihat pada pembacaan berikutnya di tab Pemenangan.
<!-- src: src/services/transitions/flows/quotation.flow.ts:268-283; src/services/transitions/cascades.ts:57-60; src/services/data/mock/MockCommandService.ts:2935-2953; src/services/transitions/dispatcher.ts:838-907; src/pages-v2/BuyerSourcing.tsx:1181-1226; src/pages-v2/BuyerSourcing.tsx:3756-3794; src/pages-v2/SupplierRFQs.tsx:163-195; src/lib/i18n/rfqs.ts:262-276; src/data/mockQuotations.ts:282-300; src/data/mockQuotations.ts:338-356 -->

### t_quotation_reject — Penawaran tidak dimenangkan (kaskade) <!-- transition:t_quotation_reject -->

- **Jenis langkah:** kaskade (digerakkan sistem); dipicu oleh `t_rfq_award`
- **Peran:** automation (atom `quotation:reject`; tidak ada jalur manusia yang memegangnya)
- **Dari → ke:** Submitted, Under Review → Rejected
- **Operator — di mana:** tidak ada yang menekan ini pada sebuah penawaran. Ia mengikuti pemenangan RFQ oleh pembeli untuk penawaran **lain** di `/buyer/sourcing`.
- **Operator — lakukan:** Penawaran ini tidak menang. Ia jatuh pada saat yang sama dengan yang menang, sehingga tak ada yang dibiarkan menerka dan tak seorang pun perlu dikabari satu per satu. Platform mendispatch ini pada setiap penawaran acara yang id-nya bukan milik pemenang, di bawah grant otomasi.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Rejected
- **Penguji — konfirmasi:** di sisi pembeli baris Status perbandingan berbunyi **Rejected** (danger) pada setiap kolom yang kalah; di sisi pemasok tab **Pemenangan & riwayat** mencantumkan RFQ dengan hasil **Tidak Dimenangkan** dan catatan "Tidak dimenangkan — penawaran lain dipilih", nilai kontrak "—", "PO diterbitkan —". Contoh seed: `qt-006b`, `qt-006c` (RFQ-2026-006), `qt-007b`, `qt-007c` (RFQ-2026-007).
- **Penguji — peristiwa pemicu:** `t_quotation_reject` (satu event per penawaran yang kalah, masing-masing dengan `causationId` = correlationId pemenangan)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib. Saudara yang sudah Awarded atau Rejected ditolak `ILLEGAL_TRANSITION` — tercatat, dan pemenangan tetap berlaku.
- **Glosarium:** `ILLEGAL_TRANSITION`; label status "Rejected" (Ditolak, pembeli) dan "Not Awarded" (Tidak Dimenangkan, kolom hasil pemasok).
- **Kejujuran:** Penawaran yang kalah tidak ditolak satu per satu dan memang tidak bisa: tidak ada verba di sisi pembeli yang menolak satu penawaran, dan tidak ada verba di sisi pemasok yang menariknya. Membatalkan RFQ **tidak** memicu ini — pembatalan memicu `t_quotation_withdraw`, dan penawaran berakhir Withdrawn, bukan Rejected. Pemasok tidak diberi tahu; hasilnya muncul pada pembacaan berikutnya.
<!-- src: src/services/transitions/flows/quotation.flow.ts:286-301; src/services/transitions/cascades.ts:24-86; src/services/data/mock/MockCommandService.ts:2935-2953; src/services/transitions/dispatcher.ts:838-907; src/pages-v2/BuyerSourcing.tsx:3673-3686; src/pages-v2/SupplierRFQs.tsx:163-195; src/lib/i18n/rfqs.ts:272-273; src/lib/statusLabel.ts:60; src/lib/statusLabel.ts:72; src/data/mockQuotations.ts:301-336; src/data/mockQuotations.ts:357-392 -->

### t_quotation_withdraw — Permintaan ditarik (kaskade) <!-- transition:t_quotation_withdraw -->

- **Jenis langkah:** kaskade (digerakkan sistem); dipicu oleh `t_rfq_cancel`
- **Peran:** automation (atom `quotation:withdraw`; tidak ada jalur manusia yang memegangnya)
- **Dari → ke:** Submitted, Under Review → Withdrawn
- **Operator — di mana:** tidak ada yang menekan ini pada sebuah penawaran. Ia mengikuti pembatalan RFQ oleh pembeli di `/buyer/sourcing` (**Batalkan RFQ**, lalu **Ya, batalkan acara**).
- **Operator — lakukan:** Paragon membatalkan acaranya sebelum memilih siapa pun, sehingga permintaannya ditarik kembali untuk setiap penawaran yang masih ditimbang. Tidak ada penawaran yang dinilai; pemasok membaca bahwa acaranya berakhir, bukan bahwa mereka kalah.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Withdrawn
- **Penguji — konfirmasi:** di sisi pemasok penawaran keluar dari KPI "Menunggu Pemenangan" dan dari hitungan "penawaran menunggu evaluasi"; **Penawaran Saya** menampilkan pil **Ditarik**; **Pemenangan & riwayat** mencantumkan RFQ dengan hasil **Acara Dibatalkan**, tanggal pemenangan "—", nilai kontrak "—", dan catatan "Paragon membatalkan acara ini — tidak ada keputusan atas penawaran Anda". Tingkat kemenangan tidak berubah: hanya acara yang diputuskan yang dihitung.
- **Penguji — peristiwa pemicu:** `t_quotation_withdraw` (satu event per penawaran yang Submitted atau Under Review, masing-masing dengan `causationId` = correlationId pembatalan)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib. Hanya penawaran yang masih Submitted atau Under Review yang disebut oleh kaskade, sehingga yang sudah Awarded atau Rejected tidak pernah ditanya.
- **Glosarium:** label status "Withdrawn" (Ditarik, penawaran) dan "Event Cancelled" (Acara Dibatalkan, kolom hasil pemasok).
- **Kejujuran:** Withdrawn bukan Rejected. Rejected berarti pembeli membandingkan penawaran itu dan memilih yang lain; acara yang dibatalkan tidak membandingkan apa pun. Kata itu adalah tindakan Paragon, bukan pemasok: pemasok tetap tidak punya verba untuk menarik penawaran. Pemasok tidak diberi tahu; hasilnya muncul pada pembacaan berikutnya.
<!-- src: src/services/transitions/flows/quotation.flow.ts; src/services/transitions/cascades.ts; src/services/data/mock/MockCommandService.ts; src/pages-v2/SupplierRFQs.tsx; src/lib/i18n/rfqs.ts; src/lib/statusLabel.ts -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Tinjau atau putuskan (di Submitted).** Cabang A — `t_quotation_review` — **Kapan:** pembeli ingin menandai penawaran ini sudah dibaca; opsional. Cabang B — `t_quotation_award` — **Kapan:** pembeli memenangkan RFQ untuk penawaran ini; panel pemenangan muncul pada RFQ bila berstatus Open atau Closed dan minimal ada satu penawaran; siapa yang sudah menjawab diturunkan dari penawaran itu sendiri. Cabang C — `t_quotation_reject` — **Kapan:** pembeli memenangkan RFQ untuk penawaran lain pada acara yang sama.
- **Putuskan (di Under Review).** Cabang A — `t_quotation_award` — **Kapan:** dipilih pada RFQ. Cabang B — `t_quotation_reject` — **Kapan:** tidak dipilih. Tidak ada jalan keluar lain.
- **Acaranya dibatalkan.** `t_quotation_withdraw` — **Kapan:** pembeli membatalkan RFQ. Setiap penawaran yang masih Submitted atau Under Review berakhir **Withdrawn**: keluar dari KPI "Menunggu Pemenangan" pemasok dan muncul di **Pemenangan & riwayat** sebagai *Acara Dibatalkan*, di luar tingkat kemenangan.
- **Penawaran sama sekali tidak bisa diajukan.** Pemasok yang tidak ada di daftar undangan RFQ ditolak di cakupan; RFQ yang belum diterbitkan (Draft) tidak ditampilkan ke pemasok mana pun; acara yang sudah ditawar pemasok dipangkas dari Acara terbuka, sehingga penawaran kedua pada acara yang sama tidak ditawarkan permukaan, dan mesin menolaknya dengan nama (`QUOTE_ALREADY_SUBMITTED`). Acara yang tidak lagi Open (`QUOTE_EVENT_NOT_OPEN`), atau yang sudah melewati tenggat responsnya (`QUOTE_DEADLINE_PASSED`), juga tidak menerima penawaran; kartu yang melewati tenggat mengatakannya di slot tombol Kirim penawaran.
- **Formulir menolak sebelum mesin.** Harga, waktu tunggu, kuantitas minimum, dan mata uang masing-masing punya kalimat penolakannya sendiri di formulir pemasok; aturan mata uang dan aturan berlaku-hingga juga merupakan hook kebijakan; toast mata uang menyebut himpunan yang diizinkan, dan baris berlaku-hingga menyebut tanggal hari ini.

<!-- src: src/services/transitions/flows/quotation.flow.ts:215-303; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/pages-v2/SupplierRFQs.tsx:786-796; src/pages-v2/SupplierRFQs.tsx:895-1025; src/services/data/mock/MockCommandService.ts:618-622; src/services/transitions/cascades.ts:24-86 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| **Menunggu Pemenangan / Keputusan tertunda** | diturunkan | Submitted, Under Review | penawaran milik pemasok sendiri yang belum diputuskan | KPI "Menunggu Pemenangan" di `/supplier/rfqs` |
| **Penawaran menunggu evaluasi** | diturunkan | Submitted, Under Review | hitungan penawaran milik pemasok sendiri | baris meta halaman dan KPI "Penawaran Dikirim — Menunggu evaluasi" |
| **Perkiraan** (waktu tunggu) | penanda kejujuran | semua | selalu, pada baris waktu tunggu pembeli | perbandingan penawaran: "Bersifat indikatif pada tahap penawaran — pemasok mengonfirmasi tanggal pengiriman pasti saat PO. Tetap dinilai dan diperingkat." |
| **Simulasi** (kepatuhan, keandalan) | penanda kejujuran | semua | selalu — penawaran runtime menyimpan baseline 50/50 | tanda perbandingan penawaran "Latihan — menunggu sumber langsung (data kepatuhan & keandalan)" |
| **Peringkat teratas** | diturunkan saat dibaca | Submitted, Under Review (pada RFQ Open) | perbandingan dapat memberi peringkat (satu mata uang, atau catatan kurs yang dapat dipakai) | kolom yang disorot di perbandingan penawaran |
| **Tidak diperingkat — `FX_UNPINNED` / `FX_STALE`** | diturunkan saat dibaca | semua, pada acara beda mata uang | RFQ tidak punya kurs tercatat untuk mata uang asing penawaran, atau kursnya lebih tua dari 7 hari | header perbandingan penawaran; penawaran ditampilkan sesuai yang diajukan |
| **Komitmen hari yang sama** | diangkat operator (formulir) | sebelum kirim | waktu tunggu 0 hari | catatan dan centang di bawah kolom waktu tunggu; toast "Konfirmasi komitmen hari yang sama" bila dikirim tanpa centang |
| **Menunggu Komersial Pemasok** | handoff turunan | kartu Acara terbuka | kursi pemasok tanpa `quotation:submit` | di slot tombol Kirim penawaran (`handoff-quotation-submit`) |
| **Tenggat tanggapan telah lewat** | berbasis waktu, diturunkan saat dibaca (terhadap masa kini yang dinyatakan, 31 Agu 2026) | kartu Acara terbuka | tenggat respons acara sebelum masa kini yang dinyatakan | pil kartu, dan di slot tombol Kirim penawaran untuk setiap kursi: "Tenggat tanggapan (…) telah lewat. Penawaran tidak lagi diterima untuk acara ini." (`rfq-deadline-passed`) |
| **Menunggu Pengadaan** | handoff turunan | Submitted (perbandingan pembeli) | kursi pembeli tanpa `quotation:review` | di sel Pindahkan ke tinjauan (`handoff-rfq-review`) |
| **Detail contoh** | penanda kejujuran | kartu Acara terbuka | selalu — lokasi pengiriman, persyaratan khusus, dan kanal pada kartu bersifat ilustratif | pil kartu di `/supplier/rfqs` |
| **PARTLY REAL (penanda provenans)** | penanda kejujuran | halaman | selalu | baris meta: pengiriman didispatch lewat target yang tersambung atas RFQ fixture |

<!-- src: src/pages-v2/SupplierRFQs.tsx:325-355; src/pages-v2/SupplierRFQs.tsx:700-737; src/pages-v2/SupplierRFQs.tsx:814-828; src/pages-v2/SupplierRFQs.tsx:1030-1060; src/pages-v2/BuyerSourcing.tsx:1459; src/lib/i18n/rfqs.ts:209-215; src/lib/i18n/rfqs.ts:312-315; src/lib/i18n/rfqs.ts:361-363; src/lib/i18n/sourcing.ts:517-521; src/lib/i18n/sourcing.ts:573-580; src/lib/i18n/roles.ts:259; src/lib/i18n/roles.ts:277; src/services/data/mock/MockCommandService.ts:589-595 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `qt-003a` (tanpa nomor terpisah — penawaran seed dikunci oleh id; penawaran runtime oleh `QUO-2026-9xx`) — penawaran sup-001 pada `rfq-003` (RFQ-2026-003), Under Review, IDR, satu dari tiga saudara.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| RFQ `rfq-003` / RFQ-2026-003 | `rfqId` | acara yang dijawab penawaran ini; harga total dihitung terhadap `totalQty`-nya (12.000 KG × 44.500 = 534.000.000) |
| Pemasok `sup-001` | `supplierId` | pemilik cakupan — pemasok hanya melihat penawarannya sendiri; pembeli melihat semuanya; hook integritas pemenang memeriksa pemasok pemenang terhadap kolom ini |
| Penawaran saudara `qt-003b` (sup-002), `qt-003c` (sup-010) | `rfqId` yang sama | himpunan yang dipecah penyebaran pemenangan menjadi satu Awarded dan sisanya Rejected |
| RFQ `awardedQuotationId` / `awardedSupplierId` | ditulis oleh `t_rfq_award` | pemenang disebut pada RFQ; penawarannya sendiri hanya berubah status |
| RFQ `respondedSupplierIds` | kolom fixture pada RFQ | menggerakkan gerbang "semua merespons" pembeli; tidak ditulis oleh pengiriman penawaran |
| RFQ `fxPins` | dibaca saat perbandingan | hanya berarti bila `currency` penawaran berbeda dari saudaranya |
| `currency` | kolom sendiri; tidak ada = IDR | penawaran seed yang mendahului kolom mata uang dengan jujur diam dan dibaca sebagai IDR; `qt-009a/b`, `qt-012b`, `qt-013b` membawa USD |
| `unitPrice`, `leadTimeDays`, `moq`, `validUntil`, `paymentTermsOffered`, `notes`, `submittedAt` | fakta mentah yang ditulis saat pembuatan | tidak pernah disunting sesudahnya — tidak ada verba revisi |
| `complianceScore`, `reliabilityScore` | di-seed per fixture; 50 pada penawaran runtime | sumbu SIMULASI, diteruskan lewat mesin pembeli dan ditandai demikian |
| `priceScore`, `leadTimeScore`, `aiCompositeScore`, `aiRecommended` | literal fixture; 0 / false pada penawaran runtime | diturunkan oleh perbandingan pembeli saat dibaca; nilai tersimpan adalah sentinel inert |

<!-- src: src/data/mockQuotations.ts:9-48; src/data/mockQuotations.ts:149-204; src/data/mockRfqs.ts:139-158; src/services/data/mock/MockCommandService.ts:611-672; src/services/data/mock/MockProcurementService.ts:331-343; src/services/data/rfqSourcingGate.ts:402-452; src/services/data/mock/stores/quotationStore.ts:84-87 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `supplier:<supplierId>` untuk pengiriman pemasok atau `buyer:all` untuk tinjauan pembeli, `ts`, `outcome` (`done` / `failed`), `correlationId` (`cmd_…`), dan `causationId` pada event berkaskade — correlationId pemenangan RFQ yang menyebabkannya. Kedua kaskade berjalan di bawah grant otomasi dengan cakupan pembeli, sehingga event-nya berbunyi `actor` = `buyer:all` dan tidak membawa atribusi. Event `failed` membawa `reason` penolakan. Tindakan manusia membawa atribusi aktor sesi, di build ini selalu `UNATTRIBUTED: NO_PERSON_IN_SESSION`. Urutan kerja untuk `qt-003a` dan saudaranya, sebagaimana akan dihasilkan seorang penguji:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| T+0 | (seed) `qt-003a`, `qt-003b`, `qt-003c` Under Review pada RFQ-2026-003 | — | fixture, tanpa event | — |
| T+1 | RFQ-2026-003: Open → Awarded (`awardedQuotationId` = `qt-003a`) | buyer · procurement (`buyer:all`) | centang **Menangkan** pada `qt-003a` → **Menangkan yang dipilih** | `t_rfq_award` |
| T+1 | `qt-003a`: Under Review → Awarded | automation (`buyer:all`, kaskade) | penyebaran pemenangan | `t_quotation_award` (`causationId` = correlationId pemenangan) |
| T+1 | `qt-003b`: Under Review → Rejected | automation (`buyer:all`, kaskade) | penyebaran pemenangan | `t_quotation_reject` (`causationId` sama) |
| T+1 | `qt-003c`: Under Review → Rejected | automation (`buyer:all`, kaskade) | penyebaran pemenangan | `t_quotation_reject` (`causationId` sama) |
| (penawaran baru) T+0′ | ∅ → Submitted (`QUO-2026-901` pada RFQ-2026-011) | supplier · commercial (`supplier:sup-007`) | **Kirim penawaran** → **Kirim penawaran** | `t_quotation_submit` |
| (penawaran baru) T+1′ | Submitted → Under Review | buyer · procurement (`buyer:all`) | **Pindahkan ke tinjauan** | `t_quotation_review` |
| (penawaran baru) T+2′ | RFQ-2026-011: Open → Awarded; `QUO-2026-901` → Awarded | buyer · procurement, orang yang bernama | papan berbunyi 2 / 2 begitu penawaran masuk; centang **Menangkan** → **Menangkan yang dipilih** → **Ya, menangkan** | `t_rfq_award`, lalu `t_quotation_award` |
| (acara yang dibatalkan) | RFQ-2026-002: Open → Cancelled; `qt-002a`, `qt-002b`: Under Review → Withdrawn | buyer · procurement, orang yang bernama; lalu automation (kaskade) | **Batalkan RFQ** → **Ya, batalkan acara** | `t_rfq_cancel`, lalu `t_quotation_withdraw` ×2 (`causationId` = correlationId pembatalan) |

<!-- src: src/services/transitions/events.ts:26-61; src/services/transitions/events.ts:127-129; src/services/transitions/dispatcher.ts:453-532; src/services/transitions/dispatcher.ts:838-907; src/services/data/mock/MockCommandService.ts:2935-2953; src/pages-v2/BuyerSourcing.tsx:366-368; src/pages-v2/SupplierRFQs.tsx:786-796 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| "Kirim penawaran" diganti oleh "Menunggu Komersial Pemasok" | pemberitahuan berada di slot tombol pada kartu | kursi pemasok tidak memegang `quotation:submit` (fulfilment / back office) | kursi komersial yang mengirim; panel identitas menampilkan jalur kursi |
| Panel penawaran menutup sendiri | Anda mempersempit kursi saat panel terbuka | panel diturunkan dari otoritas kursi dan menutup ketika `quotation:submit` hilang | buka lagi dari kartu dengan kursi komersial |
| "Penawaran tidak dikirim — periksa harga satuan" | toast menyebut aturan harga | harga kosong, bukan angka, ambigu ("1.500"), atau nol | ketik angka saja, misalnya 15000 |
| "Penawaran tidak dikirim — periksa waktu tunggu" | toast menyebut aturan waktu tunggu | hari kosong, bukan angka, ambigu, atau pecahan | hari bulat (mis. 14), atau ganti ke minggu |
| "Konfirmasi komitmen hari yang sama" | toast setelah menekan kirim dengan 0 hari | centang hari yang sama belum dicentang | centang "Saya konfirmasi penawaran ini menawarkan pengiriman di hari yang sama." atau masukkan waktu tunggu nyata |
| "Penawaran tidak dikirim — periksa kuantitas pesanan minimum" | toast menyebut aturan minimum | minimum bukan angka, ambigu, atau nol | angka saja, atau kosongkan untuk "sama dengan jml RFQ" |
| "Kolom wajib belum diisi — Harap isi: Penawaran berlaku hingga." | toast | tanggal berlaku hingga kosong | isi tanggalnya |
| "Penawaran tidak dapat dikirim" dengan "“X” bukan mata uang yang diterima Paragon…" | toast menyebut mata uang dan himpunan yang diizinkan | `quotation_submit_currency_permitted` menolak (`POLICY_REJECTED`) — tak dapat dicapai dari pilihan, yang hanya menawarkan IDR / USD / EUR | pilih salah satu mata uang yang diizinkan |
| "Penawaran tidak dapat dikirim" dengan pesan cakupan | "di luar jangkauan akun Anda" | pemasok kursi tidak ada di daftar undangan RFQ, atau payload menyebut pemasok lain (`SCOPE_DENIED`) | hanya pemasok yang diundang yang dapat menawar; periksa undangannya |
| RFQ tidak ada di Acara terbuka | tab kosong atau tidak memuatnya | masih Draft (belum diterbitkan); tidak diundang; sudah ditawar (pindah ke Penawaran Saya); atau RFQ berstatus Closed / Cancelled / Awarded (tab hanya menampilkan Open) | minta pembeli menerbitkan; lihat di Penawaran Saya atau Pemenangan & riwayat |
| "Pindahkan ke tinjauan" tidak ada di perbandingan pembeli | sel Status menampilkan pil tanpa tautan | penawaran bukan Submitted (sudah Under Review, Awarded, atau Rejected) | tidak ada yang perlu dilakukan; tinjauan hanya dari Submitted |
| "Pindahkan ke tinjauan" diganti oleh "Menunggu Pengadaan" | pemberitahuan di sel Status | kursi pembeli tidak memegang `quotation:review` | kursi procurement yang melakukannya |
| "Tinjauan gagal" | toast dengan penolakan | `ILLEGAL_TRANSITION` — penawaran berpindah saat panel terbuka | buka kembali panel RFQ |
| Penawaran tidak pernah menjadi Awarded atau Rejected | tetap Under Review berbulan-bulan | RFQ belum dimenangkan atau dibatalkan | pembeli menetapkan pemenang dari RFQ (Open atau Closed, penawaran apa pun yang diterima) atau membatalkannya, yang menarik penawaran; tidak ada keputusan per penawaran |
| Penawaran berbunyi **Withdrawn** padahal pemasok tidak menariknya | pil "Ditarik" di Penawaran Saya; baris *Acara Dibatalkan* di Pemenangan & riwayat | Paragon membatalkan RFQ sebelum ada pemenang (`t_quotation_withdraw`, kaskade) | tidak ada yang perlu dilakukan; tidak ada keputusan atas penawaran dan tidak dihitung dalam tingkat kemenangan |
| Penawaran pemasok yang kalah masih berbunyi Sedang Ditinjau setelah pemenangan | tab Penawaran Saya | kaskade untuk saudara itu ditolak `ILLEGAL_TRANSITION` (sudah terminal) atau id penawaran tidak ada di store saat penyebaran | baca audit sink untuk `causationId` pemenangan; tidak dapat dicapai dari data seed |
| "Tolak RFQ" / "Ajukan pertanyaan" tidak melakukan apa pun | toast "Penolakan RFQ belum tersedia — … tidak ditolak." / "Pesan tidak terkirim…" | tidak tersambung ke verba atau kanal apa pun | bukan kesalahan; gunakan kanal di luar |
| "Tenggat tanggapan telah lewat" pada kartu, dan tidak ada Kirim penawaran | pil kartu dan baris merah di slot tombol | tenggat respons acara sebelum masa kini yang dinyatakan (31 Agu 2026) | tidak ada yang bisa dikirim untuk acara ini; pembeli dapat membuat acara baru. Spesimen seed: RFQ-2026-010 |
| "Penawaran tidak dapat dikirim" dengan "Tenggat tanggapan acara ini telah lewat…" | toast | `quotation_submit_before_deadline` menolak (`QUOTE_DEADLINE_PASSED`) — terjangkau bila tenggat lewat saat panel masih terbuka, atau lewat dispatch buatan tangan | seperti di atas |
| "Penawaran tidak dapat dikirim" dengan "Acara sourcing ini tidak lagi terbuka…" | toast | `quotation_submit_event_open` menolak (`QUOTE_EVENT_NOT_OPEN`) — pembeli menutup, membatalkan, atau memenangkan acara saat panel masih terbuka | tanyakan kepada pembeli; acara Closed dapat dibuka kembali, acara Cancelled atau Awarded tidak |
| "Penawaran tidak dapat dikirim" dengan "Anda sudah mengirim penawaran untuk acara ini…" | toast | `quotation_submit_one_per_supplier` menolak (`QUOTE_ALREADY_SUBMITTED`) | satu penawaran per pemasok per acara; tidak direvisi atau diganti. Temukan di Penawaran Saya |
| "Tanggal ini sudah lewat (hari ini 31 Agu 2026)…" di bawah Penawaran berlaku hingga, dan Kirim penawaran berwarna abu-abu | baris merah pada kolom | tanggal berlaku-hingga sebelum masa kini yang dinyatakan; mesin menolak hal yang sama (`QUOTE_VALIDITY_PAST`) | pilih hari ini atau tanggal sesudahnya |
| Langkah 3 berbunyi "Belum ada dokumen halal, BPOM, atau mutu di berkas" | baris pada langkah Dokumen kepatuhan | pemasok ini tidak memiliki dokumen dalam ketiga kategori itu | tidak menghalangi penawaran; tambahkan di Dokumen Saya |
| `STALE_STATE` | penolakan menyebut status yang diharapkan dan yang ditemukan | pemanggil memasok `expectedState` dan dokumen berpindah | tidak ada layar penawaran yang memasoknya hari ini; buka kembali dan putuskan lagi |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SRC`; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Pengadaan & RFQ"* | modul Pengadaan & RFQ dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61-114; src/lib/glossary/refusals.glossary.ts:32-130; src/pages-v2/SupplierRFQs.tsx:766-796; src/pages-v2/SupplierRFQs.tsx:830-1025; src/pages-v2/SupplierRFQs.tsx:1543; src/pages-v2/BuyerSourcing.tsx:1227-1258; src/pages-v2/BuyerSourcing.tsx:3688-3728; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/services/transitions/policies.ts:189-206; src/services/data/mock/MockCommandService.ts:618-622; src/services/data/mock/MockProcurementService.ts:299-328; src/lib/i18n/rfqs.ts:350-369 -->

<!-- section:testdata -->
## 9 · Data uji

Fixture bersifat SIMULASI. Penawaran seed dikunci oleh id dan tidak punya nomor terpisah; penawaran runtime dinomori `QUO-2026-901`, `-902`… oleh store. Persona pemasok seed adalah sup-007.

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Submitted | `qt-011a` | — | sup-005 pada RFQ-2026-011 (`rfq-011`, Open): satu-satunya penawaran seed dengan **Pindahkan ke tinjauan**. Pengiriman baru oleh sup-007 pada `rfq-011` membuat yang lain; `rfq-010` sudah melewati tenggat responsnya (28 Agu 2026) dan menolaknya |
| Under Review | `qt-001a`, `qt-001b`, `qt-001c`, `qt-002a`, `qt-002b`, `qt-003a`, `qt-003b`, `qt-003c`, `qt-004a`, `qt-004b`, `qt-005a`, `qt-005b`, `qt-009a`, `qt-009b`, `qt-012a`, `qt-012b`, `qt-013a`, `qt-013b` | — | pada acara Open RFQ-2026-001/002/003/009/012/013 dan acara Closed RFQ-2026-004/005. Dapat dimenangkan dari permukaan hari ini: tiga pada `rfq-003` (IDR), dua pada `rfq-009` (keduanya USD), dua pada `rfq-012` (IDR + USD, tanpa catatan kurs) dan `rfq-013` (IDR + USD, catatan kurs kedaluwarsa). `qt-002a` dan `qt-005a` milik sup-007 — terlihat di Penawaran Saya miliknya |
| Awarded | `qt-006a`, `qt-007a` | — | sup-001 pada RFQ-2026-006; sup-005 pada RFQ-2026-007 |
| Rejected | `qt-006b`, `qt-006c`, `qt-007b`, `qt-007c` | — | saudara yang kalah dari dua acara yang dimenangkan; terbaca sebagai **Tidak Dimenangkan** di Pemenangan & riwayat pemasok |

<!-- src: src/data/mockQuotations.ts:50-578; src/data/mockRfqs.ts:91-531; src/services/data/mock/stores/quotationStore.ts:96-100; src/pages-v2/SupplierRFQs.tsx:163-195; _derived/guidefacts.json (quotation.fixtures) -->
