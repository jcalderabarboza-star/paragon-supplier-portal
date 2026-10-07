---
entity: stageResponse
locale: id
title: Tanggapan tahap (jawaban RFI; minat pada RFI dan RFP)
wired: true
owner: portal
source_sha: a18da1b65c172dc400ead1fe8c7cb4a539e4a27a
transitions:
  - t_stageresponse_submit
  - t_stageresponse_save
  - t_stageresponse_resave
  - t_stageresponse_send
---

<!-- section:summary -->
## 1 · Apa proses ini

Tanggapan tahap adalah jawaban pemasok pada tahap **RFI** atau **RFP** suatu acara pengadaan — tahap sebelum harga diminta. Pada RFI yang acaranya memuat **kuesioner**, jawabannya adalah jawaban pemasok atas kuesioner itu, dengan catatan opsional; pada RFP yang acaranya menetapkan **kriteria evaluasi**, jawabannya adalah **proposal** — tanggapan atas tiap kriteria dan nama dokumen yang dirujuknya; pada tahap yang tidak meminta keduanya, jawabannya berupa **pernyataan minat** dan satu **catatan** opsional. Kartu pemasok menyebut mana dari ketiganya yang diminta tahapnya. Para penilai Paragon menilai proposal setelah RFP ditutup; pemasok tidak pernah diperlihatkan skor, peringkat, atau proposal pemasok lain.

Satu peran yang menulisnya: **kontak penjualan** pemasok (lajur `commercial`), di `/supplier/rfqs`, pada kartu acara yang Open di RFI atau RFP dan mengundang pemasok itu. Pembeli tidak pernah mengubahnya. Pembeli membaca jawaban di `/buyer/sourcing`, di panel acara pada "Tanggapan pada RFI dan RFP" — dan, untuk kuesioner, pada matriks jawaban di bawah "Kuesioner RFI" — dan memilih daftar pendek tahap berikutnya dari pemasok yang menjawab — itulah yang membuat menjawab berarti: pemasok yang diam tidak dapat masuk daftar pendek.

Dua status. Tanggapan menjadi **Submitted** dalam satu tindakan, atau lebih dahulu disimpan sebagai **Draft** yang dapat disimpan ulang pemasok sesering yang ia mau lalu dikirim. Draft adalah milik pemasok sendiri: bacaan pembeli tidak memuatnya, ia tidak dihitung sebagai tanggapan, dan pemasok yang hanya pernah menyimpan draf tidak dapat masuk daftar pendek. Tidak ada yang meninggalkan **Submitted** — jawaban yang terkirim adalah catatan dan tidak diubah maupun ditarik. Pemasok menjawab setiap tahap satu kali: jawaban atas RFI tidak menghalanginya menjawab RFP yang menyusul. Apakah pemasok kemudian dilanjutkan adalah fakta tentang acaranya, dibaca dari riwayat kelanjutan acara, bukan status tanggapan.

Penanda kejujuran. Tanggapan yang di-seed adalah fixture SIMULASI pada satu acara (`rfq-018`). Tenggat tanggapan diukur terhadap masa kini yang dinyatakan, 31 Agu 2026; hari tanggapan dicatat dicap dari jam peramban. Tidak ada yang dikirim ke Paragon di luar portal, dan tidak ada yang diberi tahu. Tidak ada tindakan di sini yang menjadi milik S/4HANA, TMS, atau bank. Pertanyaan dokumen, dan dokumen yang disebut pada proposal, hanya mencatat nama berkas: tidak ada berkas yang diunggah atau disimpan. Draf berada di store dalam memori yang sama dengan setiap catatan lain pada build ini dan hilang ketika tab peramban dimuat ulang.

<!-- section:lifecycle -->
## 2 · Jalur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Submitted | tindakan operator (pembuatan) | supplier · commercial | `t_stageresponse_submit` |
| 2 | ∅ → Draft | tindakan operator (pembuatan) | supplier · commercial | `t_stageresponse_save` |
| 3 | Draft → Draft | tindakan operator (mempertahankan status): draf sebagaimana adanya sekarang | supplier · commercial | `t_stageresponse_resave` |
| 4 | Draft → Submitted | tindakan operator | supplier · commercial | `t_stageresponse_send` |

<!-- src: src/services/transitions/flows/stageResponse.flow.ts:1-51; src/data/rfqStage.ts:1-100 -->

**Percabangan**

- **Di Draft:** `t_stageresponse_resave` — commercial — ketika lebih banyak yang sudah dijawab dan pemasok ingin menyimpannya (tanggapan tetap Draft); `t_stageresponse_send` — commercial — ketika setiap pertanyaan wajib — atau, pada proposal, setiap kriteria wajib — sudah dijawab dan jawabannya perlu sampai ke Paragon.
- **Di Submitted:** tidak ada jalan keluar. Submitted adalah satu-satunya status terminal alur ini.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_stageresponse_submit — Kirim tanggapan dalam satu tindakan (minat, atau jawaban atas kuesioner) <!-- transition:t_stageresponse_submit -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** supplier · commercial (atom `stageresponse:submit`)
- **Dari → ke:** ∅ → Submitted
- **Operator — di mana:** `/supplier/rfqs` → tab **Acara terbuka** → kartu acara pada tahap RFI atau RFP (kartunya memuat pil "Tahap RFI" atau "Tahap RFP" dan linimasa "Tahap") → **Catat minat** → kotak catatan pada kartu → **Catat minat pada <tahap>** (atau **Batal**, yang tidak mencatat apa pun). Kursi fulfilment atau back-office melihat "Menunggu Komersial Pemasok" di slot tombol (`handoff-stageresponse-submit`). Pada RFI yang mengajukan kuesioner tombolnya terbaca **Jawab kuesioner** dan membuka formulir jawaban pada kartu; **Kirim jawaban** pada formulir itu, tanpa draf yang tersimpan sebelumnya, menjalankan verba ini. Pada RFP yang menetapkan kriteria tombolnya terbaca **Tulis proposal Anda** dan membuka formulir proposal; **Kirim proposal** pada formulir itu, tanpa draf yang tersimpan sebelumnya, juga menjalankan verba ini. Kartu mencantumkan kriteria acara itu sendiri beserta bobotnya di bawah "Kriteria evaluasi", dan menyebut "Paragon menilai proposal setelah tahap ditutup. Skor, peringkat, dan proposal pemasok lain tidak ditampilkan di portal ini."
- **Operator — lakukan:** Beri tahu Paragon bahwa Anda ingin dipertimbangkan pada tahap ini. Tambahkan catatan bila ada yang perlu diketahui pembeli saat memilih daftar pendek. Pada RFI dengan kuesioner, jawab pertanyaannya: setiap pertanyaan bertanda Wajib harus dijawab sebelum jawaban dapat dikirim. Pada RFP dengan kriteria, tanggapi tiap kriteria; setiap kriteria bertanda Wajib memerlukan tanggapan sebelum proposal dapat dikirim.
- **Operator — isi:** *Catatan untuk Paragon (opsional)* — teks bebas. Tidak ada yang lain: acara dan pemasok Anda berasal dari kartu, dan tahapnya adalah tahap acara itu sendiri. Pada formulir jawaban: satu isian per pertanyaan, sesuai jenis pertanyaannya — Ya / Tidak, salah satu pilihan yang tercantum, beberapa dari pilihan yang tercantum, angka dalam satuan yang disebut, teks bebas, atau berkas (hanya nama berkasnya yang dicatat). Pada formulir proposal: satu kotak teks per kriteria, menampilkan bobot, bagian, dan Wajib / Opsional; *Dokumen yang dirujuk proposal Anda (opsional)* — satu berkas atau lebih, yang hanya namanya dicatat.
- **Penguji — status yang diharapkan:** Submitted
- **Penguji — konfirmasi:** toast "Minat tercatat pada RFQ-…" / "Paragon kini dapat mempertimbangkan Anda untuk daftar pendek pada tahap <tahap> ini." Tombol kartu diganti "Minat tercatat pada <tahap> tanggal <tanggal>"; hitungan "RFQ Terbuka" turun satu. Sebagai pembeli, panel acara mencantumkan pemasok itu pada "Tanggapan pada RFI dan RFP" beserta tahap, hari, dan catatannya (atau "Tanpa catatan."), dan "N dari M pemasok yang diundang telah menanggapi pada tahap <tahap>" naik satu. Tanggapan yang dibuat bernomor mulai `RSP-2026-901`. Untuk kuesioner: toast "Jawaban dikirim pada RFQ-…"; slotnya terbaca "Jawaban dikirim pada tahap RFI tanggal <tanggal>" dan kartu mencantumkan jawaban pemasok itu sendiri di bawah catatan tahap. Sebagai pembeli, pemasok itu menjadi satu baris matriks jawaban. Untuk proposal: toast "Proposal dikirim pada RFQ-…"; slotnya terbaca "Proposal dikirim pada tahap RFP tanggal <tanggal>" dan kartu mencantumkan tanggapan pemasok itu sendiri per kriteria dan "Dokumen yang disebut: …". Sebagai pembeli, pemasok itu menjadi satu blok di bawah **Proposal** dan satu baris peringkat.
- **Penguji — peristiwa pemicu:** `t_stageresponse_submit` (aktor `supplier:<supplierId>`)
- **Pemeriksaan yang dapat menolak:** delapan hook, dalam urutan ini. `stage_response_event_open` — `INTEREST_EVENT_NOT_OPEN` bila acara tidak Open (pembeli menutup penawaran, atau acara berakhir). `stage_response_stage_takes_interest` — `INTEREST_STAGE_TAKES_QUOTATIONS` bila acara berada pada tahap RFQ, yang dijawab dengan penawaran. `stage_response_before_deadline` — `INTEREST_DEADLINE_PASSED` bila tenggat tanggapan tahap itu sebelum masa kini yang dinyatakan; hari tenggat itu sendiri masih terbuka. `stage_response_one_per_stage` — `INTEREST_ALREADY_RECORDED` bila pemasok sudah menjawab tahap ini. `stage_response_answers_well_formed` — `RESPONSE_ANSWER_INVALID` bila suatu jawaban ditujukan pada pertanyaan yang tidak diajukan acara pada tahap ini, atau tidak sesuai jenis pertanyaannya. `stage_response_required_answered` — `RESPONSE_QUESTION_REQUIRED`, menyebut masing-masing dengan nomor dan kalimatnya, bila ada pertanyaan wajib kuesioner RFI yang belum dijawab; toastnya terbaca "Wajib dan belum dijawab: Q4 “…”…" dan masing-masing ditandai pada formulir. `stage_response_proposal_well_formed` — `PROPOSAL_INVALID` bila suatu tanggapan ditujukan pada kriteria yang tidak ditetapkan acara pada tahap ini, bukan teks, atau dokumennya bukan daftar nama. `stage_response_criteria_answered` — `PROPOSAL_CRITERION_REQUIRED`, menyebut masing-masing dengan nomor dan namanya, bila ada kriteria wajib RFP yang belum ditanggapi; toastnya terbaca "Wajib dan belum ditanggapi: C2 “…”…" dan masing-masing ditandai pada formulir. Sebelum semuanya, cakupan: pemasok harus ada di daftar undangan acara, jika tidak `SCOPE_DENIED` — sehingga pemasok yang ditinggalkan dari daftar pendek tidak dapat menjawab tahap berikutnya. Kartu menyatakan setiap aturan lebih dahulu: setelah tenggat lewat tidak ada tombol, dan setelah dijawab kartu menampilkan catatannya.
- **Glosarium:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Isi tanggapan bergantung pada tahapnya: jawaban atas kuesioner pada RFI yang mengajukannya, proposal pada RFP yang menetapkan kriteria, minat dan satu catatan selain itu; kartu menyebut yang mana. Dokumen pada proposal hanyalah namanya. Jawaban gugur bukan penolakan — pemasok tidak diberi tahu jawaban mana yang menggugurkan, dan mengirimkannya berhasil; pembeli membacanya di matriks. Tanggapan tidak dapat diubah atau ditarik. Tahapnya ditulis store dari acara, tidak pernah diambil dari permintaan. Paragon tidak diberi tahu; pembeli membaca tanggapan pada kunjungan berikutnya ke acara itu.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

### t_stageresponse_save — Simpan draf jawaban <!-- transition:t_stageresponse_save -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** supplier · commercial (atom `stageresponse:submit`)
- **Dari → ke:** ∅ → Draft
- **Operator — di mana:** `/supplier/rfqs` → tab **Acara terbuka** → kartu acara pada tahap RFI yang mengajukan kuesioner → **Jawab kuesioner** → formulir jawaban pada kartu → **Simpan draf**. Kursi fulfilment atau back-office melihat "Menunggu Komersial Pemasok" di slot tombol dan tidak mendapat formulir.
- **Operator — lakukan:** Simpan apa yang sudah Anda jawab sejauh ini. Tidak ada yang dikirim ke Paragon: draf adalah milik Anda sampai Anda mengirimkannya.
- **Operator — isi:** pertanyaan mana pun, tidak ada yang wajib pada titik ini; *Catatan untuk Paragon (opsional)*.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** toast "Draf disimpan pada RFQ-…" / "Paragon tidak melihat draf. Kirimkan sebelum tenggat tanggapan." Formulir menutup; tombolnya kini terbaca **Lanjutkan jawaban Anda** dan di sampingnya "Draf disimpan pada <tanggal>. Belum dikirim — Paragon tidak melihat draf." Hitungan "RFQ Terbuka" tidak turun. Sebagai pembeli, tidak ada yang berubah: pemasok itu tidak ada dalam hitungan tanggapan, tidak ada di matriks jawaban, dan tidak dapat dicentang pada daftar pendek.
- **Penguji — peristiwa pemicu:** `t_stageresponse_save` (aktor `supplier:<supplierId>`)
- **Pemeriksaan yang dapat menolak:** enam hook, dalam urutan ini: `stage_response_event_open` (`INTEREST_EVENT_NOT_OPEN`), `stage_response_stage_takes_interest` (`INTEREST_STAGE_TAKES_QUOTATIONS`), `stage_response_before_deadline` (`INTEREST_DEADLINE_PASSED`), `stage_response_one_per_stage` (`INTEREST_ALREADY_RECORDED` — pemasok sudah memegang draf atau tanggapan terkirim pada tahap ini), `stage_response_answers_well_formed` (`RESPONSE_ANSWER_INVALID` — jawaban yang tidak sesuai jenis pertanyaannya ditolak bahkan dalam draf), `stage_response_proposal_well_formed` (`PROPOSAL_INVALID` — tanggapan atas kriteria yang tidak ditetapkan acara, atau yang bukan teks, ditolak bahkan dalam draf). Pertanyaan wajib dan kriteria wajib tidak diperiksa. Cakupan seperti pada pengiriman: hanya pemasok yang diundang.
- **Glosarium:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Draf hilang ketika tab peramban dimuat ulang, seperti setiap catatan yang dibuat pada build ini. Pertanyaan dokumen hanya menyimpan nama berkas. Mesin juga menerima draf pada RFP atau pada RFI tanpa kuesioner (draf berisi catatan saja); kartu menawarkan **Simpan draf** hanya bila ada kuesioner atau proposal untuk ditulis.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

### t_stageresponse_resave — Simpan draf lagi <!-- transition:t_stageresponse_resave -->

- **Jenis langkah:** tindakan operator (mempertahankan status)
- **Peran:** supplier · commercial (atom `stageresponse:submit`)
- **Dari → ke:** Draft → Draft
- **Operator — di mana:** kartu yang sama → **Lanjutkan jawaban Anda** → formulir terbuka berisi drafnya → **Simpan draf**.
- **Operator — lakukan:** Tambah atau ubah jawaban Anda lalu simpan. Draf diganti dengan isi formulir saat ini: jawaban yang Anda kosongkan hilang, tidak dipertahankan.
- **Operator — isi:** seperti pada penyimpanan pertama.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** toast yang sama; catatan di samping tombol menampilkan hari penyimpanan ini. Membuka kembali formulir menampilkan jawaban sebagaimana terakhir disimpan. Tanggapan tetap memakai nomor `RSP-`-nya.
- **Penguji — peristiwa pemicu:** `t_stageresponse_resave` (aktor `supplier:<supplierId>`)
- **Pemeriksaan yang dapat menolak:** lima hook, dalam urutan ini: `stage_response_event_open` (`INTEREST_EVENT_NOT_OPEN`), `stage_response_draft_stage_current` (`RESPONSE_DRAFT_STAGE_OVER` — acara sudah berpindah ke tahap berikutnya sejak draf ditulis), `stage_response_before_deadline` (`INTEREST_DEADLINE_PASSED`), `stage_response_answers_well_formed` (`RESPONSE_ANSWER_INVALID`), `stage_response_proposal_well_formed` (`PROPOSAL_INVALID`). Acaranya adalah milik draf itu sendiri, dibaca dari drafnya: menyebut acara lain dalam permintaan tidak mengubah apa pun. Cakupan: hanya pemasok pemilik draf (`SCOPE_DENIED` selain itu). Pada tanggapan yang sudah Submitted verba ini `ILLEGAL_TRANSITION`.
- **Glosarium:** `POLICY_REJECTED`, `SCOPE_DENIED`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Seluruh draf diganti, tidak pernah ditambal. Penyimpanan sebelumnya tidak dipertahankan pada draf; setiap penyimpanan adalah satu peristiwa dalam jejak.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

### t_stageresponse_send — Kirim draf <!-- transition:t_stageresponse_send -->

- **Jenis langkah:** tindakan operator
- **Peran:** supplier · commercial (atom `stageresponse:submit`)
- **Dari → ke:** Draft → Submitted
- **Operator — di mana:** kartu yang sama → **Lanjutkan jawaban Anda** → **Kirim jawaban**.
- **Operator — lakukan:** Selesaikan jawabannya dan kirimkan ke Paragon. Setelah ini jawaban tidak dapat diubah.
- **Operator — isi:** setiap pertanyaan bertanda Wajib; sisanya sesuai keinginan Anda.
- **Penguji — status yang diharapkan:** Submitted
- **Penguji — konfirmasi:** toast "Jawaban dikirim pada RFQ-…" / "Paragon kini dapat membaca jawaban Anda dan mempertimbangkan Anda untuk daftar pendek." Slotnya terbaca "Jawaban dikirim pada tahap RFI tanggal <tanggal>", kartu mencantumkan jawabannya, dan hitungan "RFQ Terbuka" turun satu. Tidak ada tanggapan kedua yang dibuat: draf itu sendiri menjadi jawabannya, dengan nomor `RSP-` yang sama. Sebagai pembeli, pemasok itu dihitung, muncul di matriks jawaban, dan dapat dicentang pada daftar pendek.
- **Penguji — peristiwa pemicu:** `t_stageresponse_send` (aktor `supplier:<supplierId>`)
- **Pemeriksaan yang dapat menolak:** tujuh hook, dalam urutan ini: `stage_response_event_open` (`INTEREST_EVENT_NOT_OPEN`), `stage_response_draft_stage_current` (`RESPONSE_DRAFT_STAGE_OVER`), `stage_response_before_deadline` (`INTEREST_DEADLINE_PASSED`), `stage_response_answers_well_formed` (`RESPONSE_ANSWER_INVALID`), `stage_response_required_answered` (`RESPONSE_QUESTION_REQUIRED` — toastnya menyebut setiap pertanyaan wajib yang belum dijawab, masing-masing ditandai pada formulir, dan draf tetap Draft dengan isi terakhir yang tersimpan), `stage_response_proposal_well_formed` (`PROPOSAL_INVALID`), `stage_response_criteria_answered` (`PROPOSAL_CRITERION_REQUIRED` — toastnya menyebut setiap kriteria wajib yang belum ditanggapi, masing-masing ditandai pada formulir, dan draf tetap Draft). Jawaban yang diperiksa dan disimpan adalah yang ada dalam permintaan — formulir sebagaimana adanya — tidak pernah draf sebagaimana terakhir disimpan.
- **Glosarium:** `POLICY_REJECTED`, `SCOPE_DENIED`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Mengirim jawaban gugur tidak ditolak dan pemasok tidak diberi tahu bahwa itu jawaban gugur. Paragon tidak diberi tahu; pembeli membaca jawabannya pada kunjungan berikutnya ke acara itu.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:36-126; src/services/transitions/policies.ts:296-420; src/services/data/mock/MockCommandService.ts:690-770; src/services/data/rfqSourcingGate.ts:478-510; src/data/rfiQuestionnaire.ts:186-290; src/pages-v2/rfqs/RfiAnswerForm.tsx:1-300; src/pages-v2/rfqs/rfiAnswerModel.ts:1-130; src/pages-v2/SupplierRFQs.tsx:425-700; src/services/query/commandHooks.ts:670-740; src/lib/i18n/rfqs.ts:183-245 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Minat atau penawaran (menurut tahap acara).** Cabang A — `t_stageresponse_submit` — **Kapan:** acara berada di RFI atau RFP. Cabang B — `t_quotation_submit` (panduan penawaran) — **Kapan:** acara berada di RFQ. Masing-masing verba menolak tahap milik yang lain dengan menyebut namanya (`INTEREST_STAGE_TAKES_QUOTATIONS`, `QUOTE_STAGE_NOT_RFQ`), dan kartu hanya menawarkan yang berlaku.
- **Apa yang terjadi setelah jawaban.** Bukan transisi alur ini. Pembeli menutup penawaran dan melanjutkan acara (`t_rfq_advance`) dengan daftar pendek dari pemasok yang menjawab: pemasok yang masuk daftar pendek menemukan acaranya di kartu pada tahap berikutnya dan menjawab lagi; pemasok yang ditinggalkan menemukan kartu "Tidak masuk daftar pendek" dengan alasan pembeli. Atau pembeli mengakhiri acara tanpa pemenang (`t_rfq_conclude`).
- **Proposal, dan skornya.** Bukan transisi alur ini. Pada RFP yang menetapkan kriteria, tanggapan pemasok adalah proposal; setelah pembeli menutup penawaran, para penilai Paragon menilainya per kriteria (`t_rfq_proposal_score`, panduan RFQ) dan pembeli dapat memulai daftar pendek dari peringkat. Tidak satu pun dari itu ditampilkan kepada pemasok: bacaannya atas acara memuat proposalnya sendiri dan kriteria beserta bobotnya, dan tidak memuat skor, total, peringkat, penilai, atau pemasok lain.
- **Tidak menjawab.** Bukan transisi. Pemasok yang tidak mencatat apa pun tidak dapat masuk daftar pendek; saat acara dilanjutkan ia membaca "Tidak masuk daftar pendek" seperti pemasok lain yang ditinggalkan.
- **Simpan draf atau kirim (pada formulir jawaban).** Cabang A — `t_stageresponse_save` (belum ada draf) / `t_stageresponse_resave` (sudah ada draf) — **Kapan:** jawabannya belum selesai; tidak ada yang sampai ke Paragon. Cabang B — `t_stageresponse_submit` (belum ada draf) / `t_stageresponse_send` (sudah ada draf) — **Kapan:** setiap pertanyaan wajib sudah dijawab. Formulir memilih verbanya dari ada tidaknya draf; pemasok menekan dua tombol yang sama.
- **Jawaban gugur.** Bukan transisi dan bukan penolakan. Pembeli dapat menandai satu jawaban pada pertanyaan Ya / Tidak atau pertanyaan pilihan sebagai jawaban gugur; bacaan pemasok atas kuesioner tidak memuatnya. Pemasok yang memberinya tetap terkirim seperti yang lain, ditandai di matriks pembeli, dan dibiarkan tidak tercentang saat pembeli membuka daftar pendek — yang masih dapat diubah pembeli.

<!-- src: src/services/transitions/flows/rfq.flow.ts:186-233; src/services/data/rfqSupplierView.ts:60-89; src/pages-v2/SupplierRFQs.tsx:693-722 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Tahap RFI / Tahap RFP | kolom tersimpan pada acara | acara yang jalurnya lebih dari satu tahap | selalu, pada acara semacam itu | pil kartu `/supplier/rfqs`; linimasa "Tahap" pada kartu |
| Minat tercatat pada <tahap> tanggal <tanggal> | diturunkan saat dibaca | Submitted | pemasok memegang tanggapan pada tahap acara saat ini | kartu, di slot tombol |
| Tenggat tanggapan telah lewat | digerakkan waktu, diturunkan saat dibaca (masa kini yang dinyatakan) | acara Open yang melewati tenggat tanggapannya | tenggat tahap itu sebelum 31 Agu 2026 | pil kartu, dan catatan di slot tombol — tidak ada jalan masuk, untuk kursi mana pun |
| Tidak masuk daftar pendek | diturunkan dari riwayat kelanjutan acara | setelah kelanjutan yang meninggalkan pemasok | pemasok diundang pada suatu tahap dan tidak dilanjutkan ke tahap berikutnya | kartunya sendiri di `/supplier/rfqs`, dengan alasan dan tanpa tindakan |
| Apa yang diminta tahap ini | penanda kejujuran | RFI, RFP | selalu | kartu pemasok: "…mengajukan kuesioner berisi N pertanyaan…" / "…tidak mengajukan kuesioner…" / pada RFP, "Proposal belum dibangun di portal ini." |
| Draf disimpan pada <tanggal>. Belum dikirim — Paragon tidak melihat draf. | diturunkan saat dibaca | Draft | pemasok memegang draf yang belum dikirim pada tahap acara saat ini | kartu, di samping **Lanjutkan jawaban Anda** |
| Pertanyaan ini wajib dan belum dijawab. | diturunkan, setelah pengiriman ditolak | formulir jawaban | ada pertanyaan wajib yang belum dijawab saat **Kirim jawaban** ditekan | di bawah pertanyaan itu pada formulir |
| Hanya nama berkas yang dicatat. | penanda kejujuran | formulir jawaban, pertanyaan dokumen | selalu | di bawah isian berkas |
| Menunggu Komersial Pemasok | handoff peran | slot tombol kartu | kursi tidak memegang `stageresponse:submit` | menggantikan **Catat minat** |

<!-- src: src/pages-v2/SupplierRFQs.tsx:440-470; src/pages-v2/SupplierRFQs.tsx:693-722; src/pages-v2/BuyerSourcing.tsx:4040-4090; src/pages-v2/sourcing/StageTimeline.tsx:1-87; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:linked -->
## 6 · Objek terkait

**Entitas contoh:** `rsp-001` (pemasok `sup-002`, acara `rfq-018`, tahap RFI, dengan catatan).

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Acara pengadaan | `rfqId` | `rfq-018`, mulai di RFI dan kini Open di RFP; acara memuat tahap, tenggat, dan riwayat kelanjutan |
| Tahap | `stage` | ditulis store dari acara pada saat jawaban; satu tanggapan per pemasok per tahap |
| Pemasok | `supplierId` | pemiliknya: pemasok hanya membaca tanggapannya sendiri, dilekatkan pada acara yang dibacanya |
| Hasil daftar pendek | `stageHistory` acara | `sup-002` menjawab RFI (`rsp-001`) dan tidak dilanjutkan ke RFP; alasannya ada pada acara, bukan pada tanggapan |
| Kuesioner | `questionnaire` acara | ditulis pembeli pada acara draf (`t_rfq_questionnaire_set`, panduan rfq); pemasok membaca pertanyaannya tanpa jawaban gugurnya |
| Jawaban | `answers`, berkunci id pertanyaan | ada pada tanggapan atas RFI yang mengajukan kuesioner; jawaban dokumen berupa nama berkas |

Hanya tampilan: "N dari M pemasok yang diundang telah menanggapi" milik pembeli menghitung tanggapan pada tahap acara saat ini, sehingga mulai lagi ketika acara dilanjutkan. `respondedAt` dicap oleh store. `status` disimpan hanya pada Draft; tanggapan yang tidak menyebutnya adalah Submitted.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/rfqStore.ts:30-50; src/services/data/rfqSupplierView.ts:30-89 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisinya (`t_stageresponse_submit`, `_save`, `_resave`, atau `_send`), `actor` = `supplier:<supplierId>`, cap waktu, hasil, dan `correlationId`. Tanggapan yang dikirim dalam satu tindakan punya satu peristiwa; yang dibuat sebagai draf punya penyimpanannya, setiap penyimpanan ulang, dan pengirimannya; kisah seorang pemasok pada suatu acara adalah tanggapannya di tiap tahap, di samping kelanjutan acara itu sendiri.

Urutan contoh untuk `sup-005` pada `rfq-018`:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Submitted (`rsp-002`, di-seed, RFI) | supplier · commercial | **Catat minat** pada tahap RFI | `t_stageresponse_submit` |
| T+1 | (acaranya) Closed → Open di RFP | buyer · procurement | **Lanjutkan ke RFP** dengan sup-005 dan sup-007 di daftar pendek | `t_rfq_advance` |
| T+2 | ∅ → Submitted (`rsp-004`, di-seed, RFP) | supplier · commercial | **Catat minat** pada tahap RFP | `t_stageresponse_submit` |

<!-- src: src/services/transitions/events.ts:26-60; src/services/data/mock/MockCommandService.ts:651-685 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| "Proposal tidak dikirim" dengan "Wajib dan belum ditanggapi: C2 “…”…" | kriteria yang disebut ditandai pada formulir: "Kriteria ini wajib dan belum memiliki tanggapan." | `PROPOSAL_CRITERION_REQUIRED` | tulis tanggapannya lalu kirim lagi, atau **Simpan draf** |
| "Salah satu tanggapan tidak dapat dibaca sebagai teks, atau menjawab kriteria yang tidak ditetapkan acara ini…" | toast setelah Simpan draf atau Kirim proposal | `PROPOSAL_INVALID` — hanya tercapai lewat permintaan buatan tangan; formulir mengirim teks untuk kriteria acara itu sendiri | perbaiki permintaannya |
| Kartu tidak menampilkan skor untuk proposal yang dikirim | "Paragon menilai proposal setelah tahap ditutup. Skor, peringkat, dan proposal pemasok lain tidak ditampilkan di portal ini." | memang demikian: skor adalah milik pembeli | tanyakan kepada pembeli Paragon Anda |
| Tidak ada **Catat minat**, hanya "Menunggu Komersial Pemasok" | pemberitahuan handoff di slot tombol | kursi tidak memegang `stageresponse:submit` (commercial) | kursi yang memegang lajur commercial mencatatnya (`ROLE_NOT_PERMITTED` bila dipaksa) |
| Tidak ada **Catat minat**, hanya "Tenggat tanggapan (…) sudah lewat." | pil kartu terbaca "Tenggat tanggapan telah lewat" | `INTEREST_DEADLINE_PASSED` — tenggat tahap itu sebelum masa kini yang dinyatakan | tidak ada yang dapat dilakukan pada tahap ini; pembeli dapat membuka kembali atau melanjutkan acara |
| Kartu menampilkan **Kirim penawaran** | pil terbaca "Tahap RFQ", atau kartu tidak punya pil tahap | acara berada di RFQ, yang menerima penawaran (`INTEREST_STAGE_TAKES_QUOTATIONS` bila dipaksa) | kirim penawaran |
| "Minat tidak tercatat" dengan "Minat Anda sudah tercatat pada tahap ini…" | kartu sudah terbaca "Minat tercatat pada <tahap> tanggal <tanggal>" | `INTEREST_ALREADY_RECORDED` — satu tanggapan per tahap | tidak ada yang perlu dilakukan; jawab lagi saat acara mencapai tahap berikutnya |
| "Minat tidak tercatat" dengan "Acara sourcing ini tidak lagi terbuka, sehingga tanggapan tidak diterima…" | papan pembeli menampilkan acara Closed, Awarded, Concluded, atau Cancelled | `INTEREST_EVENT_NOT_OPEN` — penawaran ditutup selagi kartu terbuka | muat ulang; pembeli dapat membuka kembali tahapnya |
| Acara ada di daftar kartu sebagai "Tidak masuk daftar pendek" | kartu menyebut tahap, hari, dan alasannya | pembeli melanjutkan acara dan tidak membawa pemasok ini | tidak ada di portal; alasannya milik pembeli |
| `SCOPE_DENIED` (dilempar; tampil di toast) | pemasok menjawab acara yang tidak mengundangnya, atau yang meninggalkannya | gerbang cakupan mendahului gerbang peran | jawab hanya acara di daftar kartu Anda sendiri |
| `MISSING_FIELDS` | dispatch tanpa `rfqId` | pemanggil di luar halaman | gunakan kartu |
| `ILLEGAL_TRANSITION` | penyimpanan atau pengiriman yang ditujukan pada tanggapan yang sudah Submitted | pemanggil di luar halaman; kartu tidak menawarkan keduanya setelah jawaban terkirim | tidak ada yang perlu dilakukan — jawaban yang terkirim tidak diubah |
| "Jawaban tidak terkirim" dengan "Wajib dan belum dijawab: Q… “…”" | pertanyaan yang disebut ditandai pada formulir | `RESPONSE_QUESTION_REQUIRED` — ada pertanyaan wajib yang belum dijawab | jawab lalu kirim lagi, atau **Simpan draf** |
| "Draf tidak tersimpan" / "Jawaban tidak terkirim" dengan "Salah satu jawaban tidak sesuai dengan jenis yang diminta pertanyaannya…" | isian angka berisi sesuatu yang bukan angka | `RESPONSE_ANSWER_INVALID` | perbaiki jawabannya |
| "Draf ini ditulis untuk tahap yang sudah ditinggalkan acaranya…" | kartu menampilkan acara pada tahap berikutnya, atau sebagai "Tidak masuk daftar pendek" | `RESPONSE_DRAFT_STAGE_OVER` — draf tidak pernah dikirim dan pembeli melanjutkan acaranya | tidak ada yang dapat dilakukan; draf bukan jawaban |
| Pembeli tidak melihat jawabannya | kartu terbaca "Draf disimpan … Belum dikirim" | tanggapan masih Draft | **Lanjutkan jawaban Anda** → **Kirim jawaban** |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SRC`; bila permukaan memeriksa lebih dahulu, kontrol terbaca *"Dimatikan — Sourcing & RFQ"* | modul Sourcing & RFQ dimatikan; halamannya tetap dapat dibaca | minta dinyalakan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/policies.ts:286-342; src/pages-v2/SupplierRFQs.tsx:127-143; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:testdata -->
## 9 · Data uji

Fixture bersifat SIMULASI dan berada pada satu acara, `rfq-018` (RFQ-2026-018, "PET Bottle 250ml Flip-Top — refill programme, new formats"), yang mulai di RFI dan Open di RFP dengan tenggat tanggapan 14 Sep 2026.

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Submitted | `rsp-001`, `rsp-002`, `rsp-003`, `rsp-004` | — | `rsp-001`: sup-002 di RFI, dengan catatan — tidak dilanjutkan ke RFP, sehingga kursi sup-002 terbuka pada kartu "Tidak masuk daftar pendek" dengan alasannya. `rsp-002`: sup-005 di RFI. `rsp-003`: sup-007 di RFI, tanpa catatan. `rsp-004`: sup-005 di RFP — kursi sup-005 membaca "Minat tercatat pada RFP". Kursi sup-007 belum menjawab RFP dan dapat **Catat minat** |
| Draft | — | — | tidak ada fixture; sebagai pemasok yang diundang, buka kuesioner pada suatu RFI lalu tekan **Simpan draf** |

Tanggapan yang dibuat langsung bernomor mulai `RSP-2026-901`. Untuk menghasilkan RFI dari nol: sebagai pembeli (dengan orang contoh dipilih), buat acara dengan "Mulai dari tahap" RFI, terbitkan, lalu catat minat sebagai tiap kursi pemasok yang diundang. Untuk mengajukan kuesioner: sebelum menerbitkan, buka drafnya dan gunakan **Tulis kuesioner** (panduan rfq, `t_rfq_questionnaire_set`). Tidak ada acara ter-seed yang memuatnya.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/stageResponseStore.ts:1-46 -->
