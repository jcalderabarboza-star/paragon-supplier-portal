---
entity: deliveryRelease
locale: id
title: Rilis pengiriman (baris jadwal)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_delivery_release
  - t_delivery_adjust
  - t_delivery_confirm
---

<!-- section:summary -->
## 1 · Apa proses ini

Satu baris bertanggal dari jadwal pengiriman, sejak disusun hingga saat sebuah pengiriman diterima atasnya. Selama masih bersifat internal, Paragon dapat memindahkan tanggal dan jumlahnya tanpa pemasok mengetahui apa pun. Mengirimkannya ke pemasok adalah tindakan yang mengubah rencana menjadi janji yang akan ditagih kepada seseorang, dan karena itulah pertanggungjawaban dimulai di sana, bukan saat penyusunannya.

Dokumen di balik proses ini adalah **perjanjian penjadwalan** — anak dari sebuah kontrak, dimodelkan menurut perjanjian penjadwalan SAP dengan dokumentasi rilis (jenis dokumen LPA). Sebuah perjanjian memuat satu atau lebih **item** (satu per material, dengan total jumlah yang disepakati, sebuah irama dan jumlah per rilis); setiap item memuat kalender **baris jadwal** yang dihasilkan saat penandatanganan. Baris jadwal adalah hal yang memiliki siklus hidup, sehingga itulah entitas di sini. Id-nya adalah `releaseRef` milik portal — `contract/agreement/item/release`, misalnya `ctr-013/sa-0002/10/3` — dan itu sengaja dibedakan dari nomor rilis SAP mana pun: portal tidak pernah menulis `sapReleaseNumber`, SAP yang menetapkannya saat umpan S/4HANA tiba. Call-off itu sendiri adalah rilis SAP, berdasarkan keputusan; yang dicatat portal ini adalah keputusan Paragon untuk mengirimkannya.

Siapa yang menyentuhnya: **jalur pengadaan pembeli** merilis sebuah baris, menyesuaikan baris draf dan mengonfirmasi pengiriman atas baris yang sudah dirilis. **Pemasok** melihat perjanjiannya sendiri pada cermin hanya-baca; merilis dan mengonfirmasi adalah tindakan Paragon, dan belum ada verba pengakuan pemasok (satu sedang dirancang). Toleransi yang menjadi ukuran penarikan adalah milik proses satu-status yang terpisah (`deliveryPolicy`) yang dimiliki jalur kepatuhan — sengaja bukan jalur yang merilis.

Penanda kejujuran. Setiap perjanjian dalam demo bersifat **SIMULASI** (`liveness: 'SIMULATED'`); nomor perjanjian SAP-nya ilustratif. Rilis, penyesuaian dan konfirmasi adalah **catatan portal saja — tidak ada yang diposkan ke S/4HANA**, dan konfirmasi bukan penerimaan barang (tanggal posting SAP, `fulfilledDate`, tidak pernah ditulis portal). Setiap tindakan yang diambil dalam sesi harus dicatat atas identitas contoh yang disebut namanya: kursi yang bertindak atas nama tidak seorang pun ditolak pada ketiga verba. Baris yang dirilis saat data demo dibangun tidak membawa orang, dan riwayat perubahan menyatakannya alih-alih mengarangnya.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:1-55; src/services/delivery/types.ts:144-217; src/services/delivery/generator.ts:79-101; src/lib/i18n/processFlowPurpose.ts:398-406; src/pages-v2/SupplierDeliveryAgreements.tsx:20-40 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Draft | dihasilkan saat penandatanganan (bukan verba — generator kalender memancarkan setiap baris sebagai `draft`) | — | — |
| 1 | Draft → Draft | mencatat fakta (mempertahankan status): tanggal dan/atau jumlah baris draf berubah | buyer · procurement | `t_delivery_adjust` |
| 2 | Draft → Released | tindakan operator: baris dikirimkan ke pemasok | buyer · procurement | `t_delivery_release` |
| 3 | Released → Released | mencatat fakta (mempertahankan status): usulan kecocokan pengiriman diterima sebagai pengirimannya | buyer · procurement | `t_delivery_confirm` |

`Released` (Dirilis) bersifat terminal: tidak ada yang meninggalkannya. Baris yang sudah dirilis terkunci — amendemen akan berupa dokumen rilis baru, dan itu sengaja tidak dibangun.

**Percabangan**

- **Di Draft (Draf):** `t_delivery_adjust` — pengadaan — ketika rencana bergeser dan baris belum dikirimkan (juga penyelesaian ketika rilis ditolak sebagai bertanggal lampau); `t_delivery_release` — pengadaan — ketika tanggalnya hari ini atau sesudahnya dan jumlahnya adalah yang ingin Paragon minta pemasok kirimkan.
- **Di Released:** `t_delivery_confirm` — pengadaan — hanya ketika platform telah mengusulkan kecocokan pengiriman untuk baris itu (kecocokan tersirat, ditampilkan sebagai *usulan*) dan belum dikonfirmasi. Baris yang sudah dirilis tanpa kecocokan tidak memiliki tindakan yang tersedia; ia menunggu.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:68-151; src/services/delivery/generator.ts:96-97; src/services/delivery/release.ts:224-273 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_delivery_release — Rilis <!-- transition:t_delivery_release -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · procurement (atom `delivery:release`)
- **Dari → ke:** Draft → Released
- **Operator — di mana:** `/buyer/contracts/:id` → tab **Perjanjian Pengiriman** → pada item perjanjian, baik bilah alat **Kirim rilis** (**Rilis hingga {tanggal}**, sebuah horizon) maupun tombol **Rilis** per baris di kolom **Aksi** pada kalender rilis. Ikhtisar lintas-kontrak di `/buyer/delivery-agreements` membuka kontrak; ia tidak merilis.
- **Operator — lakukan:** Beri tahu pemasok bahwa jumlah ini diinginkan pada tanggal ini. Sebelum ini baris tersebut adalah rencana internal; sesudahnya, pemasok diharapkan mengirim dan mesin tindak lanjut akan mendorong baris itu. Merilis hingga suatu horizon mengirim satu perintah per baris draf yang bertanggal pada atau sebelum tanggal yang dipilih; baris yang sudah dirilis dalam rentang itu dilewati tanpa pemberitahuan, dan hasil sebagian (sebagian baris dirilis, sebagian ditolak) dilaporkan apa adanya di toast.
- **Operator — isi:** tidak ada yang diisi. Alamat membawa koordinatnya dan sesi membawa aktornya, sehingga tidak ada kolom — dan karena itu tidak ada tempat untuk mengetik nomor dokumen.
- **Penguji — status yang diharapkan:** Released
- **Penguji — konfirmasi:** baris menampilkan status dirilis dan pemenuhannya berbunyi *menunggu* (atau usulan kecocokan bila ada pengiriman yang tiba dalam 7 hari); KPI **Dirilis** pada item naik sebesar jumlah rencana baris dan **Sisa** turun; **Riwayat perubahan** bertambah baris *Dirilis ke pemasok* yang menyebut pengguna contoh; cermin pemasok di `/supplier/delivery-agreements` menampilkan baris itu sebagai dirilis dan, dalam 7 hari sebelum tanggalnya, mendaftarkannya di bawah *Akan datang*.
- **Penguji — peristiwa pemicu:** `t_delivery_release`
- **Pemeriksaan yang dapat menolak:** `delivery_actor_attributed` — kursi harus bertindak sebagai pengguna contoh yang disebut namanya; kursi tanpa orang ditolak dengan penyelesaiannya dinyatakan. `delivery_release_not_backdated` — tanggal baris harus pada atau setelah titik waktu yang dinyatakan (31 Agu 2026); baris bertanggal lampau ditolak, karena mengirimkannya akan menciptakan pengiriman yang langsung terlambat begitu pemasok mendengarnya. Majukan tanggalnya dulu dengan penyesuaian.
- **Glosarium:** ROLE_NOT_PERMITTED · POLICY_REJECTED · SCOPE_DENIED · NOT_FOUND · NO_PERSON_IN_SESSION
- **Kejujuran:** SIMULASI dan portal-saja — toast berbunyi *Dirilis di portal (simulasi) — belum diposkan ke SAP.* Tidak ada nomor rilis SAP yang dicetak. Kursi pemasok ditolak pada scope untuk setiap baris jadwal, ada atau tidaknya baris itu. Dalam perjanjian demo `sa-0002`, dua baris draf tersisa pada item 10 bertanggal 1 Apr dan 1 Mei 2026, sehingga merilisnya apa adanya ditolak sebagai bertanggal lampau; sesuaikan tanggalnya dulu.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:78-97; src/services/transitions/policies.ts:1450-1515; src/services/data/mock/MockDeliveryService.ts:132-200; src/services/data/mock/MockCommandService.ts:2472-2519; src/services/query/deliveryHooks.ts:57-86; src/pages-v2/BuyerContractDetail.tsx:133-160; src/components/delivery/AgreementDrawdown.tsx:497-528,606-632; src/lib/i18n.ts:303-317; src/services/delivery/demoFixtures.ts:61-90 -->

### t_delivery_adjust — Sesuaikan <!-- transition:t_delivery_adjust -->

- **Jenis langkah:** mencatat fakta (mempertahankan status)
- **Peran:** buyer · procurement (atom `delivery:adjust`)
- **Dari → ke:** Draft → status yang sama
- **Operator — di mana:** `/buyer/contracts/:id` → **Perjanjian Pengiriman** → pada baris draf, **Sesuaikan** di kolom **Aksi** → penyunting sebaris **Sesuaikan baris draf ini** → **Simpan penyesuaian**. Baris yang sudah dirilis tidak pernah menawarkannya.
- **Operator — lakukan:** Ubah tanggal pengiriman, jumlah rencana, atau keduanya, pada baris yang belum dikirimkan. Inilah alasan Paragon memakai bentuk perjanjian penjadwalan yang dapat disesuaikan: rencana bergeser, dan menggesernya sebelum ada yang diberi tahu tidak menimbulkan biaya apa pun. Ini juga penyelesaian yang disebut penolakan tanggal-lampau.
- **Operator — isi:** **Tanggal pengiriman** dan/atau **Jumlah rencana** — sekurang-kurangnya salah satu. Keduanya bukan kolom wajib di verba (penyesuaian sah membawa salah satu saja); aturan "sekurang-kurangnya satu" adalah pemeriksaan kebijakan.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** tanggal atau jumlah baris berubah di kalender; **Riwayat perubahan** bertambah baris *Baris draf disesuaikan*; cermin pemasok menampilkan tanggal baru (cache-nya disegarkan saat berhasil). Total **Disepakati** item tidak bergerak — menyesuaikan jumlah sebuah baris dapat membuat jumlah baris-baris berbeda dari amplopnya, dan untuk itulah toleransi penarikan ada.
- **Penguji — peristiwa pemicu:** `t_delivery_adjust`
- **Pemeriksaan yang dapat menolak:** `delivery_actor_attributed` — pengguna contoh yang disebut namanya diwajibkan. `delivery_adjust_patch_valid` — patch harus mengubah sesuatu (patch kosong ditolak); jumlah harus angka berhingga lebih besar dari nol; tanggal harus `YYYY-MM-DD` yang terbaca dan tidak boleh di masa lampau. Legalitas menolak baris yang sudah dirilis sebelum kebijakan mana pun berjalan (`ILLEGAL_TRANSITION`), dan verba murninya menolaknya lagi sebagai terkunci.
- **Glosarium:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · POLICY_REJECTED · SCOPE_DENIED
- **Kejujuran:** portal-saja dan SIMULASI (*Baris draf disesuaikan di portal (simulasi) — tidak diposkan ke SAP*). Didispatch langsung dari hook halaman alih-alih melalui layanan pengiriman, karena ini satu perintah atas satu alamat. Penyunting menutup dirinya sendiri bila kursi berhenti memegang atom saat penyunting terbuka.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:98-128; src/services/transitions/policies.ts:1517-1573; src/services/query/deliveryHooks.ts:124-160; src/services/data/mock/MockCommandService.ts:2520-2534; src/services/delivery/release.ts:242-273; src/pages-v2/BuyerContractDetail.tsx:162-179; src/components/delivery/AgreementDrawdown.tsx:549-600,640-650; src/lib/i18n.ts:345-355 -->

### t_delivery_confirm — Konfirmasi kecocokan <!-- transition:t_delivery_confirm -->

- **Jenis langkah:** mencatat fakta (mempertahankan status)
- **Peran:** buyer · procurement (atom `delivery:confirm`)
- **Dari → ke:** Released → status yang sama
- **Operator — di mana:** `/buyer/contracts/:id` → **Perjanjian Pengiriman** → pada baris yang sudah dirilis yang pemenuhannya berbunyi *usulan — dicocokkan berdasarkan kedekatan*, **Konfirmasi kecocokan** di kolom **Aksi**.
- **Operator — lakukan:** Terima bahwa suatu pengiriman tertentu yang telah tiba adalah pengiriman untuk baris ini. Sampai ada yang menyatakannya, kecocokan itu hanyalah usulan yang dibuat platform karena hari kedatangan pengiriman berada dalam 7 hari dari tanggal rilis, dan ditampilkan sebagai usulan. Menerimanya menggerakkan total **Terkirim** item — angka yang dibaca penarikan — sehingga ini penilaian yang diambil orang.
- **Operator — isi:** tidak ada yang diisi. Rujukan dan jumlah pengiriman yang diterima diturunkan ulang oleh platform dari kumpulan pengiriman yang sama yang dirender layar; pemanggil tidak dapat menyatakan jumlah yang tidak pernah ditampilkan kepada siapa pun.
- **Penguji — status yang diharapkan:** Released
- **Penguji — konfirmasi:** kecocokan baris kehilangan keterangan *usulan* dan menjadi otoritatif; **Terkirim** naik sebesar jumlah pengiriman (pengiriman lebih atau kurang terlihat sebagai varians, tidak pernah disembunyikan); **Riwayat perubahan** bertambah baris *Pengiriman dikonfirmasi*; keterangan *menunggu konfirmasi Paragon* pada cermin pemasok menghilang.
- **Penguji — peristiwa pemicu:** `t_delivery_confirm`
- **Pemeriksaan yang dapat menolak:** `delivery_actor_attributed` — pengguna contoh yang disebut namanya diwajibkan. `delivery_confirm_has_match` — baris tidak boleh sudah membawa pengiriman terkonfirmasi (mengonfirmasi dua kali akan menghitungnya dua kali), dan harus benar-benar ada pengiriman yang dicocokkan dengannya (tanpa kecocokan, tidak ada yang diterima). Baris draf ditolak oleh legalitas sebelum keduanya berjalan.
- **Glosarium:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · POLICY_REJECTED · SCOPE_DENIED
- **Kejujuran:** konfirmasi adalah **catatan portal, tidak pernah penerimaan barang SAP** — toast menyatakannya. Vonis tepat waktu/terlambat dihitung terhadap `eta` pengiriman, sebuah perkiraan, bukan tanggal penerimaan yang diposkan. Dalam demo, `ctr-013/sa-0002/20/2` membawa usulan pengiriman lebih (210.000 terhadap 200.000) dan merupakan baris untuk dikonfirmasi; `ctr-013/sa-0002/20/1` dikonfirmasi saat data demo dibangun.
<!-- src: src/services/transitions/flows/deliveryRelease.flow.ts:130-149; src/services/transitions/policies.ts:1575-1612; src/services/data/mock/MockDeliveryService.ts:209-230; src/services/data/mock/MockCommandService.ts:2535-2547; src/services/delivery/confirm.ts:106-138; src/services/delivery/fulfillment.ts:59-63,194-236; src/pages-v2/BuyerContractDetail.tsx:181-197; src/components/delivery/AgreementDrawdown.tsx:655-675; src/services/delivery/demoFixtures.ts:123-133,163-172 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Sesuaikan atau rilis (di Draft).** Cabang A — `t_delivery_adjust` — **Kapan:** tanggal atau jumlahnya keliru untuk apa yang kini diinginkan Paragon, atau tanggal baris sudah lewat dan tidak dapat dirilis apa adanya. Cabang B — `t_delivery_release` — **Kapan:** baris jatuh tempo hari ini atau sesudahnya dan Paragon siap menjadikannya komitmen. Keduanya tetap tersedia sampai baris dirilis; sesudah itu tidak satu pun.
- **Rilis bertanggal lampau (pengecualian).** `t_delivery_release` pada baris bertanggal lampau — **Kapan:** tanggal baris sebelum titik waktu yang dinyatakan. Dispatcher menolak `POLICY_REJECTED:delivery_release_not_backdated` dan toast menyebut penyelesaiannya: majukan tanggalnya, lalu rilis. Rilis horizon yang menemui sebagian baris lampau dan sebagian mendatang merilis yang mendatang dan melaporkan sisanya sebagai ditolak.
- **Konfirmasi atau tunggu (di Released).** Cabang A — `t_delivery_confirm` — **Kapan:** pengiriman yang telah tiba untuk material yang sama, dari pemasok ini, berada dalam 7 hari dari tanggal rilis dan platform menampilkannya sebagai *usulan*. Cabang B — tanpa tindakan — **Kapan:** belum ada yang tiba: baris berbunyi *menunggu* sampai 3 hari setelah tanggalnya dan *terlewat* sesudahnya, dan mesin tindak lanjut mengangkat peringatan. Tidak ada verba "tandai sebagai terlewat" atau "batal"; keduanya diturunkan saat dibaca.
- **Tidak ada yang dikonfirmasi / sudah dikonfirmasi (pengecualian).** `t_delivery_confirm` ditolak `POLICY_REJECTED:delivery_confirm_has_match` ketika tidak ada pengiriman yang dicocokkan (tidak ada pengiriman untuk diterima) atau ketika baris sudah membawa satu (pengulangan, ditampilkan alih-alih dihitung ganda).
- **Kursi tanpa atribusi (pengecualian pada setiap verba).** Salah satu dari ketiga verba dari kursi tanpa orang ditolak `POLICY_REJECTED:delivery_actor_attributed`; adopsi pengguna contoh di panel identitas dan lakukan tindakan itu lagi.
- **Tidak disediakan: amendemen rilis, blokir di atas amplop.** Mengubah baris yang sudah dirilis adalah dokumen rilis baru dan tidak dibangun. Mode penarikan `block` dinyatakan tetapi tidak ditegakkan saat rilis — merilis baris yang dihasilkan tidak pernah dapat melanggar amplop, sehingga pelanggaran memerlukan baris yang disesuaikan dan ditandai pada buku penarikan, tidak dihentikan.
<!-- src: src/services/transitions/policies.ts:1450-1612; src/services/delivery/fulfillment.ts:59-63,138-143; src/services/delivery/types.ts:84-95; src/services/data/mock/MockDeliveryService.ts:152-199 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| SIMULASI / Sampel | eksternal (liveness) | semua status | selalu — setiap perjanjian membawa `liveness: 'SIMULATED'` dan gerbang kedua kapabilitas menunggu umpan jadwal S/4HANA | `LivenessPill` di `/buyer/contracts/:id` (tab Perjanjian Pengiriman), `/buyer/delivery-agreements`, `/supplier/delivery-agreements` |
| Draf — belum ada rilis yang dikirim | diturunkan saat dibaca | Draft (seluruh item) | ketika tidak ada baris perjanjian yang dirilis | catatan kartu perjanjian |
| Pemenuhan *menunggu* | digerakkan waktu, diturunkan saat dibaca | Released | tidak ada pengiriman yang dicocokkan dan tanggalnya belum lewat 3 hari | kalender rilis; tab ikhtisar **Menunggu** |
| Pemenuhan *terpenuhi* / *terlambat* | diturunkan saat dibaca | Released | pengiriman dicocokkan; hari kedatangan pada atau sebelum tanggal rilis → terpenuhi, sesudahnya → terlambat | kalender rilis; tab ikhtisar **Sesuai jadwal** / **Terlambat** |
| Pemenuhan *terlewat* | digerakkan waktu, diturunkan saat dibaca | Released | tidak ada pengiriman yang dicocokkan dan hari ini lebih dari 3 hari setelah tanggal rilis | kalender rilis; tab ikhtisar **Terlewat** |
| Usulan — dicocokkan berdasarkan kedekatan (tersirat) | diturunkan saat dibaca | Released | pengiriman berada dalam jendela 7 hari tetapi belum ada yang mengonfirmasinya; redaksi pemasok *menunggu konfirmasi Paragon* | keterangan kalender rilis, kedua kursi |
| Kecocokan ambigu | diturunkan saat dibaca | Released | lebih dari satu pengiriman kandidat berada dalam jendela; pilihannya deterministik dan ambiguitasnya ditampilkan | tampilan pemenuhan (`ambiguous`) |
| Varians jumlah | diturunkan saat dibaca | Released | selalu ada pada kecocokan — jumlah pengiriman dikurangi jumlah rencana | kalender rilis |
| Tindak lanjut: Akan datang (dorongan antisipatif) | digerakkan waktu, diturunkan saat dibaca | Released, menunggu | tanggal rilis hari ini sampai 7 hari ke depan | `/buyer/chase`; cermin pemasok sebagai *Akan datang* |
| Tindak lanjut: Terlewat / terlambat (peringatan ketidakpatuhan) | digerakkan waktu, diturunkan saat dibaca | Released | pemenuhan terlambat atau terlewat | `/buyer/chase`; cermin pemasok sebagai *Terlambat* |
| Tindak lanjut: Drift | diturunkan saat dibaca | item | 2 atau lebih baris terlambat-atau-terlewat pada satu item; sisi pembeli saja, tidak pernah ditampilkan ke pemasok | `/buyer/chase` |
| Tingkat Mendesak (keras) / Anjuran (lunak) | diturunkan saat dibaca | entri tindak lanjut mana pun | baris JIT (tetap) keras, baris FRC (semi-tetap) lunak | pil `/buyer/chase` |
| Tidak tercatat — tidak ada orang dalam sesi | diturunkan saat dibaca | tindakan tercatat mana pun | tindakan diambil saat data demo dibangun, tanpa sesi | kolom aktor **Riwayat perubahan** |
| Menunggu Pengadaan (serah-terima) | diturunkan saat dibaca | Draft / Released | kursi tidak memegang `delivery:release`, `delivery:adjust` atau `delivery:confirm` | slot milik verba pada kartu perjanjian |
<!-- src: src/services/delivery/fulfillment.ts:59-63,131-143; src/services/chase/deliveryChase.ts:49-98,142-224; src/services/chase/supplierObligations.ts:11-32; src/services/delivery/history.ts:64-128; src/services/liveness/registry.ts:205,268-271; src/components/delivery/AgreementDrawdown.tsx:497-503,606-680; src/lib/i18n.ts:253,280-283,465-475 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `ctr-013/sa-0002/20/2` (perjanjian SAP 5500000456, item 20, rilis 2). Baris yang sudah dirilis dari perjanjian demo, dicocokkan berdasarkan kedekatan dengan pengiriman lebih dan menunggu konfirmasi.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Perjanjian penjadwalan `sa-0002` | segmen kedua `releaseRef` | header membawa `contractId`, `supplierId`, `sapAgreementNumber`, `docType: 'LPA'`, `liveness` |
| Kontrak `ctr-013` (CTR-2026-021, PT Sample Packaging Scheduling Agreement 2026) | segmen pertama `releaseRef`; diverifikasi terhadap `contractId` milik perjanjian sendiri | rujukan yang salah alamat adalah `NOT_FOUND`, tidak pernah tindakan pada kalender kontrak lain |
| Item perjanjian 20 (`PK-CAPF-8820`, JIT, disepakati 400.000) | segmen ketiga (`lineSeq`) | item memiliki kebijakan penarikan; alamatnya `sa-0002#20` dalam proses `deliveryPolicy` |
| Pemasok `sup-007` (PT Sample Packaging Indonesia) | `agreement.supplierId` | kumpulan pengiriman difilter ke pemasok ini sebelum pencocokan |
| Pengiriman masuk `ish-demo-4` | kecocokan kedekatan turunan (`matchedRef` = `asnRef`-nya bila ada, jika tidak id-nya) | menjadi `fulfilledBy` yang tersimpan hanya saat konfirmasi |
| Buku penarikan (disepakati / dirilis / terkirim / sisa) | diturunkan per item, tidak pernah disimpan | `deliveredQty` menjumlahkan hanya `actualQty` yang terkonfirmasi |
| Entri tindak lanjut | diturunkan dari pemenuhan baris yang sudah dirilis | butiran komitmen: pemasok + perjanjian + item + rilis |

Kolom hanya-tampilan yang dibawa portal tetapi tidak pernah ditulisnya: `sapReleaseNumber` (dinyatakan, tidak pernah di-seed, ditetapkan SAP saat transmisi), `fulfilledDate` (tanggal posting penerimaan barang SAP, dicadangkan untuk umpan S/4HANA), `sapItemNumber` dan `sapAgreementNumber` (literal SIMULASI pada fixture).
<!-- src: src/services/delivery/addressing.ts:52-61,114-123; src/services/delivery/types.ts:144-263; src/services/delivery/ledger.ts:56-96; src/services/delivery/demoFixtures.ts:44-51,96-144,163-172; src/data/mockContracts.ts:376-383; src/data/mockSuppliers.ts:220-222 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` adalah id transisi, `actor` adalah `buyer:all` untuk kursi pembeli (persona dan tenansi, bukan orang), ditambah `ts`, `outcome` dan sebuah `correlationId`. Penolakan juga dicatat. **Riwayat perubahan** halaman adalah tampilan lain yang lebih sempit: ia melipat stempel milik perjanjian sendiri (`releasedAt`/`releasedBy`, `adjustedAt`/`adjustedBy`, `confirmedAt`/`confirmedBy`, dan `activeChangedAt` milik kebijakan) menjadi baris-baris, terbaru di atas, dan mencocokkan label orang saat render — penanda `(SAMPLE)` menyertai identitas contoh. Tindakan yang diambil saat data demo dibangun membawa `UNATTRIBUTED: NO_PERSON_IN_SESSION` dan dirender sebagai *Tidak tercatat — tidak ada orang dalam sesi*.

Urutan kerja untuk `ctr-013/sa-0002/10/1` (baris draf bertanggal 1 Apr 2026, item 10, botol PET), sebagaimana akan dihasilkan penguji yang memegang pengadaan dan bertindak sebagai pengguna contoh:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | Draft → Draft | buyer · procurement (pengguna contoh) | **Sesuaikan** → tanggal dimajukan ke hari pada atau setelah 31 Agu 2026 → **Simpan penyesuaian** | `t_delivery_adjust` |
| T+1 | Draft → Released | buyer · procurement (pengguna contoh) | **Rilis** per baris | `t_delivery_release` |
| T+2 | Released (tidak berubah) | — | tidak ada pengiriman yang tiba dalam 7 hari; pemenuhan berbunyi *menunggu*, lalu *terlewat* 3 hari setelah tanggalnya; daftar tindak lanjut mengangkat peringatan Anjuran (FRC) | — (diturunkan saat dibaca, tanpa peristiwa) |

Seandainya penguji merilis baris itu pada T+0 tanpa menyesuaikan, peristiwanya tetap ditulis — dengan `outcome: failed` dan alasan `POLICY_REJECTED:delivery_release_not_backdated`.

Untuk separuh konfirmasi, `ctr-013/sa-0002/20/2` tidak memerlukan persiapan: **Konfirmasi kecocokan** pada T+0 menulis `t_delivery_confirm`, dan riwayat menampilkan baris *Dirilis ke pemasok* bawaan (tanpa orang) di atas baris *Pengiriman dikonfirmasi* yang baru (pengguna contoh).
<!-- src: src/services/transitions/events.ts:127-129; src/services/delivery/history.ts:64-128; src/components/delivery/ChangeHistory.tsx:69-114; src/services/delivery/seedActor.ts:38-41; src/services/delivery/demoFixtures.ts:61-90; src/services/transitions/policies.ts:1501-1515 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tombol Rilis / Sesuaikan / Konfirmasi tidak ada; notis berbunyi *Menunggu Pengadaan* | notis berada di slot milik verba pada kartu perjanjian | kursi tidak memegang atom (`ROLE_NOT_PERMITTED` akan menjadi jawaban dispatcher) | adopsi kursi yang memegang pengadaan di panel identitas |
| Toast *Rilis tidak diterapkan* — "Kursi ini tidak bertindak atas nama siapa pun…" | `POLICY_REJECTED:delivery_actor_attributed` | kursi tidak membawa orang | pilih pengguna contoh di panel identitas, lalu rilis lagi |
| Toast — "Baris ini sudah melewati tanggal pengirimannya…" | `POLICY_REJECTED:delivery_release_not_backdated` | tanggal baris sebelum 31 Agu 2026 (titik waktu yang dinyatakan) | **Sesuaikan** tanggalnya ke depan, lalu **Rilis** |
| Toast *Dirilis di portal* dengan nada peringatan: "3 dirilis, 2 ditolak" | rilis horizon sebagian | sebagian baris dalam horizon bertanggal lampau | sesuaikan baris yang ditolak, atau biarkan sebagai draf |
| Toast *Penyesuaian tidak diterapkan* — "Ubah jumlahnya, tanggalnya, atau keduanya" / "Tanggal itu sudah lewat" / "…angka yang lebih besar dari nol" | `POLICY_REJECTED:delivery_adjust_patch_valid` | patch kosong, tanggal lampau, atau jumlah buruk | perbaiki kolomnya dan simpan lagi |
| Sesuaikan ditolak pada baris yang sudah dirilis | `ILLEGAL_TRANSITION` (dari `Released`) | baris yang sudah dirilis terkunci | tidak ada — amendemen tidak dibangun; dokumen rilis baru akan diperlukan |
| Toast *Kecocokan tidak dikonfirmasi* — "Belum ada pengiriman yang dicocokkan…" | `POLICY_REJECTED:delivery_confirm_has_match` | tidak ada pengiriman material itu dari pemasok itu yang tiba dalam 7 hari dari tanggalnya | tunggu pengirimannya; belum ada yang dikonfirmasi |
| Toast *Kecocokan tidak dikonfirmasi* — "sudah dikonfirmasi" | `POLICY_REJECTED:delivery_confirm_has_match` | baris sudah membawa `fulfilledBy` / `actualQty` | tidak perlu apa-apa; pengiriman dihitung sekali |
| Kursi pemasok tidak melihat tombol sama sekali | cermin pemasok | setiap verba pengiriman menolak scope pemasok (`SCOPE_DENIED`); cermin bersifat hanya-baca berdasarkan keputusan | wajar; verba pengakuan pemasok sedang dirancang |
| "Baris rilis itu tidak ditemukan" | `UNKNOWN_RELEASE_SEQ` dari layanan, atau `NOT_FOUND` dari dispatcher | alamat tidak tercocok, atau segmen kontraknya tidak sesuai dengan perjanjian | muat ulang perjanjian dan bertindak dari baris kalender |
| Baris berbunyi *terlewat* padahal pemasok mengatakan sudah mengirim | pemenuhan diturunkan saat dibaca dari kumpulan pengiriman | tidak ada pengiriman `to-paragon` material itu yang tiba dalam jendela (atau pengirimannya masih *Shipped*, belum *Arrived*) | pemasok melaporkan dan menandai tiba pengirimannya di `/supplier/forecasts`; kecocokan kemudian diusulkan |
| Riwayat perubahan menampilkan *Tidak tercatat — tidak ada orang dalam sesi* | stempel rilis bawaan | tindakan diambil saat pembangunan fixture, bukan dalam sesi | wajar; tindakan yang diambil dalam sesi menyebut pengguna contoh |
<!-- src: src/services/transitions/policies.ts:1450-1612; src/components/delivery/deliveryRefusal.ts:52-84; src/lib/i18n.ts:310-343,354-355,378-386; src/services/data/mock/MockDeliveryService.ts:138-150,184-193; src/services/delivery/addressing.ts:114-123; src/services/delivery/fulfillment.ts:112-119 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Draft | `ctr-003/sa-0001/10/1`, `ctr-003/sa-0001/10/2`, `ctr-003/sa-0001/10/3` (36 baris draf dalam paket fakta) | 5500000123 | `sa-0001` atas kontrak ctr-003 (CTR-2025-018) adalah perjanjian serba-draf yang masih murni; kalendernya dimulai pada tanggal mulai kontrak, yang digeser ke titik waktu yang dinyatakan oleh jangkar keluarga kontrak, sehingga baris mana yang bertanggal lampau tidak terukur di sini. `ctr-013/sa-0002/10/1` dan `/10/2` adalah draf bertanggal 1 Apr dan 1 Mei 2026 — lampau, sehingga melatih penolakan tanggal-lampau dan penyelesaian lewat penyesuaian. |
| Released | `ctr-013/sa-0002/10/3`, `ctr-013/sa-0002/10/4`, `ctr-013/sa-0002/10/5` (22 baris dirilis dalam paket fakta) | 5500000456 | dirilis saat pembangunan fixture oleh verba sungguhan, tanpa orang tercatat. Pada titik waktu yang dinyatakan: `/10/3` terpenuhi (tersirat), `/10/4` terlambat (tersirat, kurang 5.000), `/10/5` terlewat, `/10/6` menunggu dan berada dalam jendela dorongan 7 hari; `/20/1` terkonfirmasi, `/20/2` usulan pengiriman lebih (baris untuk dikonfirmasi). Perjanjian lanjutan `sa-1001`–`sa-1007` ada untuk ikhtisar (turunkan jumlahnya dari `demoFixturesScale.ts`). |
<!-- src: src/services/delivery/fixtures.ts:35-122; src/services/delivery/demoFixtures.ts:44-172; src/services/delivery/demoFixturesScale.ts:1-30; src/services/data/fixturePresent.ts:198,391-400 -->
