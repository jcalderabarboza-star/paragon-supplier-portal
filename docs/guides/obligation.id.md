---
entity: obligation
locale: id
title: Kewajiban kontrak
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_obligation_track
  - t_obligation_complete
---

<!-- section:summary -->
## 1 · Apa proses ini

Sebuah janji yang tertulis dalam perjanjian — volume, potongan, tingkat layanan — dilacak agar ada yang menyadari apakah janji itu benar-benar ditepati. Kewajiban mengikuti kontraknya: ia dibuka terhadap sebuah id kontrak dan hidup dalam satu status kerja, **In Progress** (Sedang Berlangsung), sampai ditandai **Completed** (Selesai). Itulah seluruh mesinnya: dua status, satu tepi. Pengadaan memegang kedua atomnya.

**Proses ini dimodelkan tetapi tidak aktif.** Berbeda dari kontrak yang menaunginya, tidak satu pun verbanya dinyatakan sebagai fakta eksternal — alurnya menyatakan keduanya dapat disediakan dan tidak menyebut pemilik luar — tetapi tidak ada target perintah di balik `obligation`, sehingga `t_obligation_track` dan `t_obligation_complete` tidak dapat dijalankan dan tidak ada apa pun di produk yang menulis penyelesaian. Kewajiban adalah rollup dari substrat kontrak: ia dibaca di mana pun kontraknya dibaca, dan bukan sesuatu yang dapat ditindaklanjuti siapa pun di portal hari ini. Modul rollup mengatakannya langsung: *"`obligation` tidak punya CommandTarget, sehingga `t_obligation_complete` tidak dapat dijalankan dan tidak ada apa pun di produk yang menulis `completedDate`. Penghitungnya jujur tentang penyimpanannya; penyimpanannya masih fixture semata."*

Apa yang ditampilkan portal hari ini: di `/buyer/contracts`, membuka sebuah kontrak mendaftar kewajibannya dengan judul, pemilik (Pembeli / Pemasok / Keduanya), tanggal jatuh tempo, dan status tampilan yang dihitung, dan judul panel menghitung **N dari M terpenuhi** dari `completedDate`. Status tampilan yang dilihat pembaca adalah **Upcoming** (Mendatang), **Overdue** (Jatuh Tempo), dan **Completed** (Selesai), diturunkan saat baca; **In Progress** milik mesin sengaja tidak ditampilkan, karena tidak ada kolom tersimpan yang mencatat bahwa pekerjaan sudah dimulai. KPI **Kewajiban Jatuh Tempo** di halaman yang sama adalah turunan yang sama dilipat untuk semua kontrak.

<!-- src: src/services/transitions/flows/obligation.flow.ts:1-12; src/services/data/obligationRollup.ts:81-86; src/services/data/obligationProjection.ts:23-42,144-200; src/pages-v2/BuyerContracts.tsx:41,1261; src/lib/i18n/contracts.ts:395-404 -->

<!-- section:lifecycle -->
## 2 · Jalan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → In Progress | pembuatan · dimodelkan, tidak aktif (tanpa target) | pengadaan | `t_obligation_track` |
| 2 | In Progress → Completed (akhir) | tindakan operator · dimodelkan, tidak aktif (tanpa target) | pengadaan | `t_obligation_complete` |

**Percabangan**

- Tidak ada. Satu status punya satu jalan keluar. Yang tampak seperti percabangan di halaman — Upcoming lawan Overdue — adalah jam yang membaca tanggal jatuh tempo baris In Progress, bukan cabang mesin.

<!-- src: src/services/transitions/flows/obligation.flow.ts:141-144; src/services/data/obligationProjection.ts:188-200; src/lib/statusLabel.ts:21,48,54,58 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_obligation_track — Mulai mengawasi satu komitmen <!-- transition:t_obligation_track -->

- **Jenis langkah:** pembuatan · dimodelkan, tidak aktif (tanpa target)
- **Peran:** pengadaan (atom `obligation:track`)
- **Dari → ke:** ∅ → In Progress
- **Operator — di mana:** tidak disediakan di mana pun hari ini. Panduan **Kontrak Baru** di `/buyer/contracts` punya langkah **Kewajiban** yang mengumpulkan kewajiban yang disarankan atau kustom, tetapi panduan itu berakhir tanpa membuat apa pun (lihat panduan kontrak).
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** alur mensyaratkan id kontrak; tidak ada apa pun di portal yang menyerahkannya ke dispatcher.
- **Penguji — status yang diharapkan:** In Progress — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_obligation_track` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** verba ini mencatat bahwa kewajiban ada, tidak pernah bahwa pekerjaan dimulai; modul proyeksi mengukur bahwa menyambungkan target ini saja tidak akan memberi halaman sebuah **In Progress** nyata untuk ditampilkan, karena setiap baris fixture tanpa tanggal penyelesaian adalah In Progress secara konstruksi.
<!-- src: src/services/transitions/flows/obligation.flow.ts:147-156; src/services/data/obligationProjection.ts:73-100; src/lib/i18n/contracts.ts:190-191,235-246 -->

### t_obligation_complete — Komitmen sudah dipenuhi <!-- transition:t_obligation_complete -->

- **Jenis langkah:** tindakan operator · dimodelkan, tidak aktif (tanpa target)
- **Peran:** pengadaan (atom `obligation:complete`)
- **Dari → ke:** In Progress → Completed (akhir)
- **Operator — di mana:** tidak disediakan di mana pun hari ini. Tidak ada kontrol di `/buyer/contracts` atau `/buyer/contracts/:id` yang menandai kewajiban selesai; baris yang dilihat pembaca sebagai **Completed** membawa `completedDate` yang ditulis tangan di fixture.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Completed — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_obligation_complete` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** tidak ada apa pun di produk yang menulis `completedDate`; penghitung **N dari M terpenuhi** jujur tentang penyimpanan yang hanya fixture.
<!-- src: src/services/transitions/flows/obligation.flow.ts:158-167; src/services/data/obligationRollup.ts:81-86; src/data/mockObligations.ts:74-82 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Tidak ada di mesin.** Tidak ada tepi sengketa, pembebasan, atau pembatalan; kewajiban itu masih terbuka atau sudah dipenuhi. Pengecualian yang dilihat pembaca adalah **Overdue** — baris In Progress yang tanggal jatuh temponya lewat tanpa tanggal penyelesaian — dan itu diturunkan saat baca, bukan status yang dimasuki apa pun.
<!-- src: src/services/transitions/flows/obligation.flow.ts:126-133; src/services/data/obligationProjection.ts:188-200 -->

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku pada | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Overdue / Jatuh Tempo | digerakkan waktu, diturunkan saat baca | In Progress (tanpa `completedDate`) | tanggal jatuh tempo sebelum tanggal kini yang dinyatakan (31 Agu 2026) | pil baris di panel samping kontrak; KPI **Kewajiban Jatuh Tempo** di `/buyer/contracts` |
| Upcoming / Mendatang | digerakkan waktu, diturunkan saat baca | In Progress (tanpa `completedDate`) | tanggal jatuh tempo pada atau setelah tanggal kini yang dinyatakan | pil baris di panel samping kontrak |
<!-- src: src/services/data/obligationProjection.ts:182-200; src/pages-v2/BuyerContracts.tsx:1261; src/lib/i18n/contracts.ts:313-314 -->

<!-- section:linked -->
## 6 · Objek terkait

**Apa yang dibaca portal hari ini:** fixture `mockObligations` melalui `useObligations()`, selalu dalam konteks sebuah kontrak. Baris perwakilan: `obl-001a` (*Submit BPJPH halal certificate renewal*, kontrak `ctr-001`, pemilik Supplier, pengulangan Annual). Tidak ada status mesin yang mengatur baris-baris ini: literal `status` tersimpan hanya dipertahankan sebagai acuan pengujian proyeksi, dan bukan yang ditampilkan halaman.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Kontrak | `contractId` | induknya; kewajiban hanya pernah didaftar di bawah kontraknya |
| Penyelesaian | `completedDate` | satu-satunya fakta yang menjadi sumber **Completed**; hanya tampilan, tidak ada yang menulisnya |
| Pemilik | `owner` (Buyer / Supplier / Both) | hanya tampilan |
| Kategori · pengulangan | `category`, `recurrence` | hanya tampilan |

Tanggal kewajiban berbagi jangkar keluarga kontrak (`SHARED_CONTRACT_ANCHOR`, 2026-05-24), sehingga kewajiban dan kontraknya tidak pernah dibandingkan lintas dua jam.
<!-- src: src/data/mockObligations.ts:25-49; src/services/data/obligationProjection.ts:126-133; src/services/data/fixturePresent.ts:267,403 -->

<!-- section:history -->
## 7 · Riwayat status

Tidak ada. Tidak ada yang mendispatch verba kewajiban — entitasnya tidak punya target perintah, sehingga dispatch yang menyebut `obligation` ditolak sebagai `UNKNOWN_ENTITY` sebelum ada peristiwa.

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| — | — | — | tidak ada yang mendispatch | tidak ada peristiwa |
<!-- src: src/services/transitions/dispatcher.ts:548 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Baris kewajiban tampak menawarkan penyelesaian, atau KPI menyiratkan ada yang bisa dituntaskan | baris hanya menampilkan pil dan tanggal jatuh tempo; tidak ada tombol padanya | ini tampilan hanya-baca: kewajiban adalah rollup data kontrak fixture dan tidak ada verba yang tersambung untuk menandainya terpenuhi | tidak ada yang perlu diselesaikan di portal; kewajiban mengikuti kontraknya, dan kontraknya milik S/4HANA |
<!-- src: src/services/data/obligationRollup.ts:81-86; src/pages-v2/BuyerContracts.tsx:1261 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| all | — | — | semua — tidak ada fixture — dimodelkan, tidak aktif. Baris di bawah tiap kontrak di `/buyer/contracts` adalah fixture tampilan (`obl-001a` dan saudara-saudaranya) yang tidak diatur status mesin mana pun; tidak ada yang dapat dipindahkan. |
<!-- src: src/data/mockObligations.ts:39-49; _derived/guidefacts.json (obligation.fixtures = "no store") -->
