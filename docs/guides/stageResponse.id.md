---
entity: stageResponse
locale: id
title: Tanggapan tahap (minat pada RFI dan RFP)
wired: true
owner: portal
source_sha: c3b7e77d98f5b24811dcbfc654d76b5e185e5f0c
transitions:
  - t_stageresponse_submit
---

<!-- section:summary -->
## 1 · Apa proses ini

Tanggapan tahap adalah jawaban pemasok pada tahap **RFI** atau **RFP** suatu acara pengadaan — tahap sebelum harga diminta. Pada build ini jawabannya berupa **pernyataan minat** dan satu **catatan** opsional, tidak lebih: kuesioner RFI, proposal RFP, dan penilaiannya belum dibangun. Permukaan menyatakannya di kartu pemasok dan di panel pembeli.

Satu peran yang menulisnya: **kontak penjualan** pemasok (lajur `commercial`), di `/supplier/rfqs`, pada kartu acara yang Open di RFI atau RFP dan mengundang pemasok itu. Pembeli tidak pernah mengubahnya. Pembeli membaca jawaban di `/buyer/sourcing`, di panel acara pada "Tanggapan pada RFI dan RFP", dan memilih daftar pendek tahap berikutnya dari pemasok yang menjawab — itulah yang membuat menjawab berarti: pemasok yang diam tidak dapat masuk daftar pendek.

Tidak ada siklus hidup untuk dijalani. Tanggapan lahir pada satu-satunya statusnya, **Submitted**, dan tidak pernah meninggalkannya. Pemasok menjawab setiap tahap satu kali: jawaban atas RFI tidak menghalanginya menjawab RFP yang menyusul. Apakah pemasok kemudian dilanjutkan adalah fakta tentang acaranya, dibaca dari riwayat kelanjutan acara, bukan status tanggapan.

Penanda kejujuran. Tanggapan yang di-seed adalah fixture SIMULASI pada satu acara (`rfq-018`). Tenggat tanggapan diukur terhadap masa kini yang dinyatakan, 31 Agu 2026; hari tanggapan dicatat dicap dari jam peramban. Tidak ada yang dikirim ke Paragon di luar portal, dan tidak ada yang diberi tahu. Tidak ada tindakan di sini yang menjadi milik S/4HANA, TMS, atau bank.

<!-- section:lifecycle -->
## 2 · Jalur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Submitted | tindakan operator (pembuatan) | supplier · commercial | `t_stageresponse_submit` |

<!-- src: src/services/transitions/flows/stageResponse.flow.ts:1-51; src/data/rfqStage.ts:1-100 -->

**Percabangan**

- **Di Submitted:** tidak ada jalan keluar. Submitted adalah status awal dan satu-satunya status terminal alur ini.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_stageresponse_submit — Catat minat pada tahap RFI atau RFP <!-- transition:t_stageresponse_submit -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** supplier · commercial (atom `stageresponse:submit`)
- **Dari → ke:** ∅ → Submitted
- **Operator — di mana:** `/supplier/rfqs` → tab **Acara terbuka** → kartu acara pada tahap RFI atau RFP (kartunya memuat pil "Tahap RFI" atau "Tahap RFP" dan linimasa "Tahap") → **Catat minat** → kotak catatan pada kartu → **Catat minat pada <tahap>** (atau **Batal**, yang tidak mencatat apa pun). Kursi fulfilment atau back-office melihat "Menunggu Komersial Pemasok" di slot tombol (`handoff-stageresponse-submit`).
- **Operator — lakukan:** Beri tahu Paragon bahwa Anda ingin dipertimbangkan pada tahap ini. Tambahkan catatan bila ada yang perlu diketahui pembeli saat memilih daftar pendek.
- **Operator — isi:** *Catatan untuk Paragon (opsional)* — teks bebas. Tidak ada yang lain: acara dan pemasok Anda berasal dari kartu, dan tahapnya adalah tahap acara itu sendiri.
- **Penguji — status yang diharapkan:** Submitted
- **Penguji — konfirmasi:** toast "Minat tercatat pada RFQ-…" / "Paragon kini dapat mempertimbangkan Anda untuk daftar pendek pada tahap <tahap> ini." Tombol kartu diganti "Minat tercatat pada <tahap> tanggal <tanggal>"; hitungan "RFQ Terbuka" turun satu. Sebagai pembeli, panel acara mencantumkan pemasok itu pada "Tanggapan pada RFI dan RFP" beserta tahap, hari, dan catatannya (atau "Tanpa catatan."), dan "N dari M pemasok yang diundang telah menanggapi pada tahap <tahap>" naik satu. Tanggapan yang dibuat bernomor mulai `RSP-2026-901`.
- **Penguji — peristiwa pemicu:** `t_stageresponse_submit` (aktor `supplier:<supplierId>`)
- **Pemeriksaan yang dapat menolak:** empat hook, dalam urutan ini. `stage_response_event_open` — `INTEREST_EVENT_NOT_OPEN` bila acara tidak Open (pembeli menutup penawaran, atau acara berakhir). `stage_response_stage_takes_interest` — `INTEREST_STAGE_TAKES_QUOTATIONS` bila acara berada pada tahap RFQ, yang dijawab dengan penawaran. `stage_response_before_deadline` — `INTEREST_DEADLINE_PASSED` bila tenggat tanggapan tahap itu sebelum masa kini yang dinyatakan; hari tenggat itu sendiri masih terbuka. `stage_response_one_per_stage` — `INTEREST_ALREADY_RECORDED` bila pemasok sudah menjawab tahap ini. Sebelum semuanya, cakupan: pemasok harus ada di daftar undangan acara, jika tidak `SCOPE_DENIED` — sehingga pemasok yang ditinggalkan dari daftar pendek tidak dapat menjawab tahap berikutnya. Kartu menyatakan setiap aturan lebih dahulu: setelah tenggat lewat tidak ada tombol, dan setelah dijawab kartu menampilkan catatannya.
- **Glosarium:** `POLICY_REJECTED`, `SCOPE_DENIED`, `MISSING_FIELDS`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Minat dan satu catatan adalah seluruh isi tanggapan pada build ini; kartu menyatakan "Kuesioner dan proposal belum dibangun di portal ini." Tanggapan tidak dapat diubah atau ditarik. Tahapnya ditulis store dari acara, tidak pernah diambil dari permintaan. Paragon tidak diberi tahu; pembeli membaca tanggapan pada kunjungan berikutnya ke acara itu.
<!-- src: src/services/transitions/flows/stageResponse.flow.ts:30-48; src/services/transitions/policies.ts:286-342; src/services/data/mock/MockCommandService.ts:651-685; src/services/data/rfqSourcingGate.ts:453-492; src/pages-v2/SupplierRFQs.tsx:127-143; src/pages-v2/SupplierRFQs.tsx:560-600; src/pages-v2/SupplierRFQs.tsx:1135-1167; src/services/query/commandHooks.ts:619-642; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Minat atau penawaran (menurut tahap acara).** Cabang A — `t_stageresponse_submit` — **Kapan:** acara berada di RFI atau RFP. Cabang B — `t_quotation_submit` (panduan penawaran) — **Kapan:** acara berada di RFQ. Masing-masing verba menolak tahap milik yang lain dengan menyebut namanya (`INTEREST_STAGE_TAKES_QUOTATIONS`, `QUOTE_STAGE_NOT_RFQ`), dan kartu hanya menawarkan yang berlaku.
- **Apa yang terjadi setelah jawaban.** Bukan transisi alur ini. Pembeli menutup penawaran dan melanjutkan acara (`t_rfq_advance`) dengan daftar pendek dari pemasok yang menjawab: pemasok yang masuk daftar pendek menemukan acaranya di kartu pada tahap berikutnya dan menjawab lagi; pemasok yang ditinggalkan menemukan kartu "Tidak masuk daftar pendek" dengan alasan pembeli. Atau pembeli mengakhiri acara tanpa pemenang (`t_rfq_conclude`).
- **Tidak menjawab.** Bukan transisi. Pemasok yang tidak mencatat apa pun tidak dapat masuk daftar pendek; saat acara dilanjutkan ia membaca "Tidak masuk daftar pendek" seperti pemasok lain yang ditinggalkan.

<!-- src: src/services/transitions/flows/rfq.flow.ts:186-233; src/services/data/rfqSupplierView.ts:60-89; src/pages-v2/SupplierRFQs.tsx:693-722 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Tahap RFI / Tahap RFP | kolom tersimpan pada acara | acara yang jalurnya lebih dari satu tahap | selalu, pada acara semacam itu | pil kartu `/supplier/rfqs`; linimasa "Tahap" pada kartu |
| Minat tercatat pada <tahap> tanggal <tanggal> | diturunkan saat dibaca | Submitted | pemasok memegang tanggapan pada tahap acara saat ini | kartu, di slot tombol |
| Tenggat tanggapan telah lewat | digerakkan waktu, diturunkan saat dibaca (masa kini yang dinyatakan) | acara Open yang melewati tenggat tanggapannya | tenggat tahap itu sebelum 31 Agu 2026 | pil kartu, dan catatan di slot tombol — tidak ada jalan masuk, untuk kursi mana pun |
| Tidak masuk daftar pendek | diturunkan dari riwayat kelanjutan acara | setelah kelanjutan yang meninggalkan pemasok | pemasok diundang pada suatu tahap dan tidak dilanjutkan ke tahap berikutnya | kartunya sendiri di `/supplier/rfqs`, dengan alasan dan tanpa tindakan |
| Hanya minat dan satu catatan | penanda kejujuran | RFI, RFP | selalu | kartu pemasok; panel pembeli di atas daftar tanggapan; wizard di bawah pilihan tahap awal |
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

Hanya tampilan: "N dari M pemasok yang diundang telah menanggapi" milik pembeli menghitung tanggapan pada tahap acara saat ini, sehingga mulai lagi ketika acara dilanjutkan. `respondedAt` dicap oleh store. Tidak ada kolom status yang disimpan pada objek.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/rfqStore.ts:30-50; src/services/data/rfqSupplierView.ts:30-89 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = `t_stageresponse_submit`, `actor` = `supplier:<supplierId>`, cap waktu, hasil, dan `correlationId`. Karena objek ini punya satu status dan tanpa jalan keluar, riwayatnya adalah satu peristiwa per tanggapan; kisah seorang pemasok pada suatu acara adalah tanggapannya di tiap tahap, di samping kelanjutan acara itu sendiri.

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
| Tidak ada **Catat minat**, hanya "Menunggu Komersial Pemasok" | pemberitahuan handoff di slot tombol | kursi tidak memegang `stageresponse:submit` (commercial) | kursi yang memegang lajur commercial mencatatnya (`ROLE_NOT_PERMITTED` bila dipaksa) |
| Tidak ada **Catat minat**, hanya "Tenggat tanggapan (…) sudah lewat." | pil kartu terbaca "Tenggat tanggapan telah lewat" | `INTEREST_DEADLINE_PASSED` — tenggat tahap itu sebelum masa kini yang dinyatakan | tidak ada yang dapat dilakukan pada tahap ini; pembeli dapat membuka kembali atau melanjutkan acara |
| Kartu menampilkan **Kirim penawaran** | pil terbaca "Tahap RFQ", atau kartu tidak punya pil tahap | acara berada di RFQ, yang menerima penawaran (`INTEREST_STAGE_TAKES_QUOTATIONS` bila dipaksa) | kirim penawaran |
| "Minat tidak tercatat" dengan "Minat Anda sudah tercatat pada tahap ini…" | kartu sudah terbaca "Minat tercatat pada <tahap> tanggal <tanggal>" | `INTEREST_ALREADY_RECORDED` — satu tanggapan per tahap | tidak ada yang perlu dilakukan; jawab lagi saat acara mencapai tahap berikutnya |
| "Minat tidak tercatat" dengan "Acara sourcing ini tidak lagi terbuka, sehingga tanggapan tidak diterima…" | papan pembeli menampilkan acara Closed, Awarded, Concluded, atau Cancelled | `INTEREST_EVENT_NOT_OPEN` — penawaran ditutup selagi kartu terbuka | muat ulang; pembeli dapat membuka kembali tahapnya |
| Acara ada di daftar kartu sebagai "Tidak masuk daftar pendek" | kartu menyebut tahap, hari, dan alasannya | pembeli melanjutkan acara dan tidak membawa pemasok ini | tidak ada di portal; alasannya milik pembeli |
| `SCOPE_DENIED` (dilempar; tampil di toast) | pemasok menjawab acara yang tidak mengundangnya, atau yang meninggalkannya | gerbang cakupan mendahului gerbang peran | jawab hanya acara di daftar kartu Anda sendiri |
| `MISSING_FIELDS` | dispatch tanpa `rfqId` | pemanggil di luar halaman | gunakan kartu |
| `ILLEGAL_TRANSITION` / `STALE_STATE` | tidak pernah dihasilkan di sini | alur ini tidak punya verba selain pembuatan | n/a |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SRC`; bila permukaan memeriksa lebih dahulu, kontrol terbaca *"Dimatikan — Sourcing & RFQ"* | modul Sourcing & RFQ dimatikan; halamannya tetap dapat dibaca | minta dinyalakan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/policies.ts:286-342; src/pages-v2/SupplierRFQs.tsx:127-143; src/lib/i18n/rfqs.ts:147-188 -->

<!-- section:testdata -->
## 9 · Data uji

Fixture bersifat SIMULASI dan berada pada satu acara, `rfq-018` (RFQ-2026-018, "PET Bottle 250ml Flip-Top — refill programme, new formats"), yang mulai di RFI dan Open di RFP dengan tenggat tanggapan 14 Sep 2026.

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Submitted | `rsp-001`, `rsp-002`, `rsp-003`, `rsp-004` | — | `rsp-001`: sup-002 di RFI, dengan catatan — tidak dilanjutkan ke RFP, sehingga kursi sup-002 terbuka pada kartu "Tidak masuk daftar pendek" dengan alasannya. `rsp-002`: sup-005 di RFI. `rsp-003`: sup-007 di RFI, tanpa catatan. `rsp-004`: sup-005 di RFP — kursi sup-005 membaca "Minat tercatat pada RFP". Kursi sup-007 belum menjawab RFP dan dapat **Catat minat** |

Tanggapan yang dibuat langsung bernomor mulai `RSP-2026-901`. Untuk menghasilkan RFI dari nol: sebagai pembeli (dengan orang contoh dipilih), buat acara dengan "Mulai dari tahap" RFI, terbitkan, lalu catat minat sebagai tiap kursi pemasok yang diundang.

<!-- src: src/data/mockStageResponses.ts:1-55; src/data/mockRfqs.ts:640-677; src/services/data/mock/stores/stageResponseStore.ts:1-46 -->
