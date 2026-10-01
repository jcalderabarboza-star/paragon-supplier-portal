---
entity: contract
locale: id
title: Kontrak
wired: false
owner: s4hana
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_contract_draft
  - t_contract_activate
  - t_contract_renew
  - t_contract_terminate
---

<!-- section:summary -->
## 1 · Apa proses ini

Perjanjian tetap yang menjadi dasar pembelian dari seorang pemasok — harga, volume, dan syarat yang diwarisi setiap pesanan alih-alih dirundingkan ulang tiap kali. Sebuah kontrak disusun sebagai draf, diberlakukan, boleh diperbarui untuk periode berikutnya, dan diakhiri; penghentian dapat dicapai dari setiap status yang bukan akhir. Pengadaan adalah jalur yang memegang semua atom kontrak.

**Proses ini dimodelkan tetapi tidak aktif.** Keempat langkahnya adalah fakta eksternal milik S/4HANA, berdasarkan keputusan operator. Berkas alurnya menjelaskan alasannya: *"Perjanjian induk adalah dokumen SAP persis seperti pesanan pembelian, dan alur ini dahulu menyatakan keempat verba tersedia — janji tetap bahwa Paragon menyusun, memberlakukan, memperbarui, dan menghentikan kontrak. Kenyataannya tidak, dan `BuyerContracts` tidak pernah mendispatch satu pun: halaman membaca fixture dan tidak ada CommandTarget di baliknya."* Tidak ada seorang pun di portal yang dapat memindahkan kontrak antar status ini, dan tidak ada peristiwa yang pernah ditulis untuknya.

Apa yang ditampilkan portal hari ini: `/buyer/contracts` (**Manajemen Kontrak**) membaca fixture berisi tiga belas kontrak beserta kewajibannya, dengan masa berlaku yang dihitung (**Akan Kedaluwarsa** / **Kedaluwarsa** diturunkan saat baca dari tanggal akhir dan masa pemberitahuan kontrak itu sendiri, tidak pernah disimpan), alur pembaruan, dan halaman rincian di `/buyer/contracts/:id`. Halaman ini membawa penanda provenans **Data contoh** karena kapabilitas `contracts` tidak berlandaskan sumber apa pun. Panduan **Kontrak Baru** mengumpulkan permintaan dan berakhir pada panel berjudul **Tidak ada kontrak yang dibuat**, yang menyebut S/4HANA sebagai pemiliknya — ia tidak lagi membuat nomor kontrak di sisi klien; fabrikasi itu sudah dihapus dari halaman.

<!-- src: src/services/transitions/flows/contract.flow.ts:1-32; src/pages-v2/BuyerContracts.tsx:41,580-620,1376,1629; src/services/liveness/registry.ts:221; src/services/data/contractExpiry.ts:119-133; _derived/surfaces.md:30,55 -->

<!-- section:lifecycle -->
## 2 · Jalan siklus hidup

Label Indonesia untuk status (dari peta label pusat): Draft = Draf · Active = Aktif · Renewed = Diperbarui · Terminated = Dihentikan · Expiring = Akan Kedaluwarsa · Expired = Kedaluwarsa.

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Draft | fakta eksternal (S/4HANA) · pembuatan | pengadaan memegang atomnya; S/4HANA melakukan tindakannya | `t_contract_draft` |
| 2 | Draft → Active | fakta eksternal (S/4HANA) | pengadaan / S/4HANA | `t_contract_activate` |
| 3 | Active → Renewed | fakta eksternal (S/4HANA) | pengadaan / S/4HANA | `t_contract_renew` |
| 4 | Draft, Active, Renewed → Terminated (akhir) | fakta eksternal (S/4HANA) | pengadaan / S/4HANA | `t_contract_terminate` |

**Percabangan**

- **Pada Draft:** `t_contract_activate` — S/4HANA — saat perjanjian diberlakukan; `t_contract_terminate` — S/4HANA — saat dibatalkan sebelum mengikat.
- **Pada Active:** `t_contract_renew` — S/4HANA — saat periode berlaku baru diberikan; `t_contract_terminate` — S/4HANA — saat berakhir pada atau sebelum masanya.
- **Pada Renewed:** hanya `t_contract_terminate` — tidak ada tepi pembaruan kedua dan tidak ada jalur aktivasi ulang.

<!-- src: src/services/transitions/flows/contract.flow.ts:39-42,101-105; src/lib/statusLabel.ts:26-96 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_contract_draft — Syarat mulai disusun <!-- transition:t_contract_draft -->

- **Jenis langkah:** fakta eksternal (S/4HANA) · pembuatan · dimodelkan, tidak aktif (tanpa target)
- **Peran:** pengadaan (atom `contract:draft`); tindakannya milik S/4HANA
- **Dari → ke:** ∅ → Draft
- **Operator — di mana:** tidak ada yang menekan ini di portal. `/buyer/contracts` → **Kontrak Baru** membuka panduan yang dijaga atom `contract:draft` (kursi tanpa atom itu melihat pemberitahuan serah-terima); langkah terakhirnya berakhir pada **Tidak ada kontrak yang dibuat** — *"perjanjian induk dibuat di S/4HANA dan masuk ke Paragon sebagai fakta."*
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** alur mensyaratkan id pemasok dan judul; panduan mengumpulkannya dan tidak mencatat apa pun.
- **Penguji — status yang diharapkan:** Draft — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_contract_draft` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Perjanjian induk dibuat di S/4HANA, yang memiliki dokumen kontrak. Paragon menerimanya dan berkolaborasi di sekitarnya; Paragon tidak pernah menjadi tempat perjanjian itu dibuat."* Panduan ini dahulu membuat `CTR-<thn>-<n>` dan sebuah baris di sisi klien; itu sudah tidak ada.
<!-- src: src/services/transitions/flows/contract.flow.ts:45-62; src/pages-v2/BuyerContracts.tsx:444,580-620,1356; src/pages-v2/contracts/RaisedElsewhere.tsx:31-104; src/lib/i18n/contracts.ts:432-441 -->

### t_contract_activate — Syarat mulai berlaku <!-- transition:t_contract_activate -->

- **Jenis langkah:** fakta eksternal (S/4HANA) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** pengadaan (atom `contract:activate`); tindakannya milik S/4HANA
- **Dari → ke:** Draft → Active
- **Operator — di mana:** tidak ada yang menekan ini di portal. Satu-satunya fixture pada Draft (`ctr-011`) hanya dapat dibaca.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Active — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_contract_activate` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Aktivasi adalah perubahan status pada perjanjian induk S/4HANA. Portal membaca hasilnya; tidak ada seorang pun di sini yang memberlakukan kontrak."*
<!-- src: src/services/transitions/flows/contract.flow.ts:64-81; src/data/mockContracts.ts:322-327 -->

### t_contract_renew — Periode berikutnya <!-- transition:t_contract_renew -->

- **Jenis langkah:** fakta eksternal (S/4HANA) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** pengadaan (atom `contract:renew`); tindakannya milik S/4HANA
- **Dari → ke:** Active → Renewed
- **Operator — di mana:** tidak ada yang menekan ini di portal. **Alur Pembaruan** di `/buyer/contracts` mendaftar kontrak yang masih berjalan dan berakhir dalam cakrawala 180 hari, dikelompokkan per bulan — pembacaan untuk perencanaan, bukan tindakan pembaruan.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Renewed — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_contract_renew` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Pembaruan memperpanjang perjanjian induk S/4HANA — periode berlaku baru pada dokumen SAP. Paragon mengetahuinya; Paragon tidak memberikannya."*
<!-- src: src/services/transitions/flows/contract.flow.ts:83-100; src/services/data/contractExpiry.ts:156-163; src/lib/i18n/contracts.ts:84-91 -->

### t_contract_terminate — Perjanjian berakhir <!-- transition:t_contract_terminate -->

- **Jenis langkah:** fakta eksternal (S/4HANA) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** pengadaan (atom `contract:terminate`); tindakannya milik S/4HANA
- **Dari → ke:** Draft, Active, Renewed → Terminated (akhir)
- **Operator — di mana:** tidak ada yang menekan ini di portal.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Terminated — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_contract_terminate` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Penghentian dicatat terhadap perjanjian induk S/4HANA. Keputusan komersialnya boleh diambil di sini, tetapi tindakan yang mengakhiri kontrak adalah milik SAP."* Baris Terminated tidak pernah dilabeli ulang oleh jam: hanya baris Active, Expiring, dan Renewed yang dapat terbaca Expiring atau Expired.
<!-- src: src/services/transitions/flows/contract.flow.ts:103-120; src/services/data/contractExpiry.ts:97-106 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Hentikan (pada Draft, Active, Renewed).** `t_contract_terminate` — **Kapan:** S/4HANA mencatat berakhirnya perjanjian induk, pada masanya atau sebelumnya. Ini satu-satunya jalur pengecualian dalam mesin dan bukan milik portal untuk mengambilnya.
- **Perbarui atau biarkan lewat (pada Active).** `t_contract_renew` — **Kapan:** SAP memberikan periode berlaku baru. Jika tidak, tidak ada yang bergerak; jam hanya melabeli ulang baris menjadi **Akan Kedaluwarsa** atau **Kedaluwarsa** (lihat §5) tanpa status mesin berubah.
<!-- src: src/services/transitions/flows/contract.flow.ts:4-7; src/services/data/contractExpiry.ts:119-133 -->

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku pada | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Expiring / Akan Kedaluwarsa | digerakkan waktu, diturunkan saat baca | Active, Renewed | hari menuju tanggal akhir ≤ `noticeRequiredDays` kontrak itu sendiri | pil di `/buyer/contracts`, tab **Akan Kedaluwarsa**, KPI **Segera Kedaluwarsa** |
| Expired / Kedaluwarsa | digerakkan waktu, diturunkan saat baca | Active, Renewed | tanggal akhir sebelum tanggal kini yang dinyatakan (31 Agu 2026) | pil di `/buyer/contracts`, tab **Kedaluwarsa** |
| Data contoh · contracts | eksternal / provenans | seluruh halaman | selalu — `contracts` tidak berlandaskan sumber apa pun | baris meta `/buyer/contracts` |
<!-- src: src/services/data/contractExpiry.ts:97-133; src/pages-v2/BuyerContracts.tsx:1376; src/services/liveness/registry.ts:221 -->

<!-- section:linked -->
## 6 · Objek terkait

**Apa yang dibaca portal hari ini:** fixture `mockContracts` melalui `useContracts()`, digabungkan dengan `mockObligations` dan `mockSuppliers`. Ini kontrak fixture yang tidak diatur status mesin mana pun — `status` tersimpan adalah literal yang ditulis tangan memakai nama status alur ini (Active, Renewed, Draft, Terminated), dan halaman menambahkan Expiring / Expired saat baca. Baris perwakilan: `ctr-001` (`CTR-2026-001`, *Halal Emulsifier Master Supply Agreement 2026*, tersimpan Active).

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pemasok | `supplierId` | nama dan negara dibaca dari `useSuppliers()` |
| Kewajiban | `ContractObligation.contractId` | panel mendaftarnya dan menghitung **N dari M terpenuhi** dari `completedDate`; tidak ada hitungan tersimpan yang tersisa |
| Perjanjian pengiriman | id kontrak, di `/buyer/contracts/:id` | tab **Perjanjian Pengiriman** di halaman rincian mendispatch verba `deliveryRelease` — proses terpisah yang sudah tersambung |
| Dokumen kepatuhan | ditampilkan sebagai *dokumen kepatuhan tertaut* di panel | hanya tampilan |
| Nomor kontrak | `contractNumber` | hanya tampilan; SAP memiliki identitas kontrak dan halaman tidak lagi membuatnya |

Tanggal kontrak dan kewajiban berbagi satu jangkar (`SHARED_CONTRACT_ANCHOR`, 2026-05-24) dan disesuaikan ulang ke tanggal kini yang dinyatakan.
<!-- src: src/data/mockContracts.ts:19-68,65-70; src/pages-v2/BuyerContracts.tsx:41,453,1261; src/services/data/obligationRollup.ts:107; src/pages-v2/BuyerContractDetail.tsx:329-358; src/services/data/fixturePresent.ts:267,391; _derived/surfaces.md:55-56 -->

<!-- section:history -->
## 7 · Riwayat status

Tidak ada. Tidak ada yang mendispatch verba kontrak — entitasnya tidak punya target perintah, sehingga dispatch yang menyebut `contract` ditolak sebagai `UNKNOWN_ENTITY` sebelum ada peristiwa. Garis waktu **Siklus hidup** di panel samping (Disusun · Dirundingkan · Ditandatangani · Periode Aktif · Keputusan Pembaruan · Kedaluwarsa / Pembaruan) digambar dari tanggal tersimpan, bukan dari peristiwa.

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| — | — | — | tidak ada yang mendispatch | tidak ada peristiwa |
<!-- src: src/services/transitions/dispatcher.ts:548; src/lib/i18n/contracts.ts:154-164 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Sebuah tombol tampak menawarkan salah satu langkah ini | **Kontrak Baru** membuka panduan; langkah terakhirnya berbunyi **Tidak ada kontrak yang dibuat** dan *"tidak ada yang dikirim, dan tidak ada seorang pun yang diberi tahu"* | ini halaman hanya-baca untuk kontrak itu sendiri: menyusun, memberlakukan, memperbarui, dan menghentikan perjanjian induk adalah tindakan S/4HANA | buat atau ubah perjanjian di S/4HANA; portal membaca hasilnya saat sambungan F2 hadir |
<!-- src: src/pages-v2/BuyerContracts.tsx:580-620,1629; src/lib/i18n/contracts.ts:434-438 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| all | — | — | semua — tidak ada fixture — dimodelkan, tidak aktif. Halaman kontrak menampilkan kontrak fixture (`ctr-001` … `ctr-013`) yang tidak diatur status mesin mana pun: `ctr-011` tersimpan Draft, `ctr-010` Renewed, `ctr-012` Terminated, sisanya Active; tidak ada yang dapat dipindahkan. |
<!-- src: src/data/mockContracts.ts:65-381; _derived/guidefacts.json (contract.fixtures = "no store") -->
