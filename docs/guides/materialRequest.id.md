---
entity: materialRequest
locale: id
title: Permintaan material
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_materialrequest_submit
  - t_materialrequest_start_review
  - t_materialrequest_approve
  - t_materialrequest_reject
---

<!-- section:summary -->
## 1 · Apa proses ini

Catatan bahwa seorang pembeli membutuhkan material yang belum memiliki kode di Paragon, siapa yang menanganinya, dan apa keputusannya. Empat belas material yang ditawarkan wizard RFQ tidak memiliki kode di master; tanpa ini tidak ada tempat untuk memintanya, sehingga celah itu tetap terbuka tanpa ada yang bisa menyatakan bahwa hal itu sudah diajukan. Permintaan material adalah catatan pembeli kepada pengelola master material. Ia tidak menerbitkan kode, tidak menulis apa pun ke katalog, dan tidak mengubah acara sourcing.

Dua jalur pembeli menyentuhnya. **Pengadaan** (procurement) mengajukan permintaan — dari wizard sourcing, ketika material yang dipilih ternyata tidak punya kode master, atau langsung dari halaman *Permintaan material*. **Perencanaan** (planning, jalur yang memegang pertanyaan master data) mengambil permintaan (*Mulai tinjauan*) dan memutuskan: *Setujui untuk dibuat*, atau *Tolak* dengan alasan tertulis. Pemohon adalah pembeli yang punya kursi, sehingga membaca hasilnya sendiri di halaman yang sama.

Prosesnya dimulai di **Submitted** (Menunggu tinjauan) dan berakhir di **Approved** (Disetujui untuk dibuat) atau **Rejected** (Ditolak) — keduanya akhir yang sesungguhnya. Tidak ada draf: formulir dan wizard adalah drafnya. Permintaan yang ditolak tidak dibuka kembali; deskripsi yang lebih baik adalah permintaan baru, sehingga alasan penolakan tim master data tetap bisa dihitung. Persetujuan hanya mencatat keputusan: materialnya sendiri dibuat di S/4HANA, tempat identitas material berada, dan katalog memuatnya setelah SAP punya kode. Label statusnya menyatakan persis itu — keadaan mesin *Approved* ditampilkan sebagai **Disetujui untuk dibuat**, tidak pernah "dibuat".

Penanda kejujuran. Antrean ini bersifat **SIMULASI** — pilnya berbunyi *"Sampel — menunggu master material S/4"*, dan warna hijau akan keliru berarti "materialnya kini ada". Dua baris di tumpukan ditumbuhkan saat aplikasi dimulai melalui verba sungguhan, dengan label yang jelas fiktif bertanda *(illustrative)*; yang pertama diajukan dari acara sourcing yang dibuat seed itu sendiri agar asalnya nyata. Menyetujui atau menolak hanya diambil oleh kursi yang menyebut seseorang — kursi yang belum memilih pengguna contoh ditolak (`materialrequest_decider_named`) — sedangkan mengajukan dan mengambil tetap terbuka bagi kursi sebagaimana dibuka. Karena itu aturan empat mata (pemohon tidak boleh memutuskan permintaannya sendiri) selalu punya pemutus bernama pada sebuah keputusan: ia menolak bila pemohonnya juga orang yang bernama dan orangnya sama, dan meloloskan permintaan yang diajukan kursi yang tidak menyebut siapa pun. Tidak ada permukaan yang menampilkan lama menunggu dalam hari, berdasarkan keputusan operator.

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Submitted | pembuatan (tindakan operator) | procurement | `t_materialrequest_submit` |
| 2 | Submitted → Under Review | tindakan operator | planning | `t_materialrequest_start_review` |
| 3a | Under Review → Approved | tindakan operator (terminal) | planning | `t_materialrequest_approve` |
| 3b | Under Review → Rejected | tindakan operator (terminal) | planning | `t_materialrequest_reject` |

**Percabangan**

- **Di Under Review:** `t_materialrequest_approve` — planning — ketika master data menerima permintaan untuk dibuat di SAP; `t_materialrequest_reject` — planning — ketika master data menolak, dengan alasan tertulis (material sudah ada dengan nama lain, atau sama sekali bukan material). Keduanya ditolak bagi kursi yang tidak menyebut siapa pun (`materialrequest_decider_named`).

Tidak ada keadaan lain dengan dua jalan keluar.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_materialrequest_submit — Kirim permintaan <!-- transition:t_materialrequest_submit -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** buyer · procurement
- **Dari → ke:** ∅ → Submitted
- **Operator — di mana:** dua pintu masuk, satu payload.
  1. `/buyer/material-requests` → **Ajukan permintaan material** (kepala halaman) → panel *Ajukan permintaan material* → **Kirim permintaan** (atau **Batal**).
  2. `/buyer/sourcing` → wizard RFQ → pada langkah material pilih material yang tidak punya kode di katalog dan tandai untuk permintaan → selesaikan wizard. Permintaan dikirim *setelah* RFQ dibuat, satu permintaan per pilihan tanpa kode, dengan menyebut RFQ baru itu sebagai asalnya.
- **Operator — lakukan:** tuliskan material apa yang hilang dan mengapa penting. Master data menilai apakah ini sudah ada dengan nama lain; teks *Mengapa dibutuhkan* adalah yang mereka baca. Dari wizard, acara sourcing tetap berjalan tanpa perubahan dan tetap memerlukan tender kompetitif — permintaan adalah catatan terpisah kepada master data, bukan suntingan pada acara.
- **Operator — isi:** *Nama material* (dengan kata-kata Anda; tidak ada yang memeriksanya terhadap master — itulah gunanya permintaan ini), *Kategori* (salah satu dari `Fragrance`, `Active Ingredients`, `Packaging`, `Emulsifiers`, `Botanical`, `Other`) dan *Mengapa dibutuhkan* wajib. Opsional: *Spesifikasi atau tautan*, *Satuan yang diharapkan* (dicatat sebagaimana dinyatakan, tidak divalidasi terhadap daftar satuan mana pun). Wizard juga membawa alasan katalog mengapa pilihan itu tidak berkode dan RFQ asalnya; halaman tidak mengirim keduanya.
- **Penguji — status yang diharapkan:** Submitted (ditampilkan sebagai *Menunggu tinjauan*)
- **Penguji — konfirmasi:** baris baru dengan nomor `MR-2026-000n` yang ditetapkan store di puncak `/buyer/material-requests`; *Diajukan dari* berbunyi *Diajukan langsung* atau nomor RFQ; toast *"Permintaan {nomor} tercatat — Master data akan meninjaunya. Material belum ada."* Dari wizard, toast berbunyi *"{nomorRfq} diajukan — permintaan material tercatat"*, dan detail RFQ membawa baris *"Permintaan material tertunda untuk: {material}. Acara ini tidak berubah dan akan tetap memerlukan tender kompetitif."* Tidak ada yang berubah di kursi pemasok mana pun.
- **Penguji — peristiwa pemicu:** `t_materialrequest_submit`
- **Pemeriksaan yang dapat menolak:** `materialrequest_category_known` — kategori harus salah satu dari enam, dan alasan katalog, bila ada, salah satu dari lima yang dikenal katalog; `materialrequest_need_authored` — *Mengapa dibutuhkan* harus berupa string yang tidak kosong; `materialrequest_rfq_resolved` — bila RFQ asal disebut, ia harus ada di store RFQ (tidak disebut tidak apa-apa — permintaan mandiri tidak menyebut apa pun).
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** panel pengajuan menyatakan *"Permintaan ini akan dicatat tanpa nama orang…"* sebelum tindakan. Antrean bersifat **SIMULASI** (*"Sampel — menunggu master material S/4"*). Bila RFQ dibuat tetapi permintaannya ditolak, acara tetap berdiri dan toast menyatakannya — *"{nomorRfq} diajukan — permintaan material tidak"* — dan permintaan bisa diajukan lagi dari halaman ini.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:111; src/services/transitions/flows/materialRequest.flow.ts:94; src/services/transitions/policies.ts:728; src/services/transitions/policies.ts:760; src/services/transitions/policies.ts:794; src/pages-v2/BuyerMaterialRequests.tsx:445; src/pages-v2/BuyerMaterialRequests.tsx:595; src/pages-v2/BuyerMaterialRequests.tsx:706; src/pages-v2/BuyerSourcing.tsx:1780; src/pages-v2/sourcing/materialRequest.ts:88; src/services/data/mock/MockCommandService.ts:2134; src/services/data/mock/MockCommandService.ts:2142; src/services/data/mock/stores/materialRequestStore.ts:175; src/data/mockRfqs.ts:36; src/data/materialCatalogReason.ts:61; src/lib/i18n/materialRequests.ts:512; src/lib/i18n/materialRequests.ts:530; src/lib/i18n/materialRequests.ts:576; src/lib/i18n/sourcing.ts:674; src/lib/i18n/sourcing.ts:682 -->

### t_materialrequest_start_review — Mulai tinjauan <!-- transition:t_materialrequest_start_review -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · planning
- **Dari → ke:** Submitted → Under Review
- **Operator — di mana:** `/buyer/material-requests` → buka baris *Menunggu tinjauan* → panel samping → **Mulai tinjauan**.
- **Operator — lakukan:** ambil permintaan dari tumpukan dan cantumkan nama Anda, sehingga antrean dapat membedakan permintaan yang belum dibuka siapa pun dari yang sudah dikerjakan.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Under Review (ditampilkan sebagai *Sedang ditinjau*)
- **Penguji — konfirmasi:** chip status *Sedang ditinjau*; bagian *Keputusan* pada panel mendapat stempel waktu *Diambil*; baris berpindah dari tab *Menunggu tinjauan* ke *Sedang ditinjau*; toast *"Tinjauan dimulai"*. Kursi tanpa `materialrequest:review` melihat *"Menunggu Perencanaan"* di slot itu.
- **Penguji — peristiwa pemicu:** `t_materialrequest_start_review`
- **Pemeriksaan yang dapat menolak:** `materialrequest_decider_not_requester` — orang yang mengajukan permintaan tidak boleh ikut mengambilnya. Hook membandingkan *Diajukan oleh* pada permintaan dengan aktor sesi dan hanya menolak bila keduanya menyebut orang yang sama; tanpa orang dalam sesi, ia meloloskan.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `POLICY_REJECTED`.
- **Kejujuran:** hook empat mata sudah dibangun dan bertipe siap pakai, dan tidak bisa menyala dari sesi tanpa atribusi — tindakan tanpa atribusi bukan bukti persetujuan diri sendiri. Dua baris yang di-seed diajukan di bawah identitas sampel (seseorang berperan pengadaan dari daftar demo); kursi yang mengambil identitas sampel yang sama ditolak di sini, dan itulah satu-satunya cara melihat aturan ini bekerja hari ini.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:131; src/services/transitions/policies.ts:874; src/services/transitions/policyHooks.ts:421; src/pages-v2/BuyerMaterialRequests.tsx:880; src/services/query/commandHooks.ts:1536; src/services/data/mock/MockCommandService.ts:2086; src/services/data/mock/materialRequestSeed.ts:150; src/lib/i18n/materialRequests.ts:557; src/lib/i18n/materialRequests.ts:581 -->

### t_materialrequest_approve — Setujui untuk dibuat <!-- transition:t_materialrequest_approve -->

- **Jenis langkah:** tindakan operator (terminal)
- **Peran:** buyer · planning
- **Dari → ke:** Under Review → Approved
- **Operator — di mana:** `/buyer/material-requests` → buka baris *Sedang ditinjau* → **Setujui untuk dibuat** → konfirmasi *"Ini mencatat bahwa permintaan disetujui. Ini tidak membuat materialnya."* → **Konfirmasi persetujuan** (atau **Kembali**).
- **Operator — lakukan:** setujui permintaan untuk dibuat di SAP. Yang dicatat hanyalah keputusannya — material dibuat di S/4HANA, tempat identitas material berada, dan portal ini tidak pernah menerbitkan kode.
- **Operator — isi:** tidak ada yang diisi — sengaja tidak ada kotak teks pada persetujuan.
- **Penguji — status yang diharapkan:** Approved (ditampilkan sebagai *Disetujui untuk dibuat*)
- **Penguji — konfirmasi:** chip status *Disetujui untuk dibuat*; panel menampilkan *"Disetujui untuk dibuat di SAP. Material belum ada — kode diterbitkan oleh SAP, bukan oleh portal ini, dan katalog akan memuat material tersebut setelah kode terbit."*; *Diputuskan* dan *Diputuskan oleh* terisi (yang terakhir label peran pengguna contoh, dengan tanda sampelnya); baris berpindah ke tab *Disetujui*; toast *"Disetujui untuk dibuat — Tercatat. Pembuatan material di SAP dilakukan di luar portal ini."* RFQ asalnya, bila ada, kini berbunyi *"Permintaan material untuk {material} telah diputuskan ({status}). Acara ini tidak berubah dalam kedua kasus."* Katalog material tidak berubah.
- **Penguji — peristiwa pemicu:** `t_materialrequest_approve`
- **Pemeriksaan yang dapat menolak:** `materialrequest_decider_named` — kursinya harus menyebut seseorang (`MATERIALREQUEST_DECIDER_UNATTRIBUTED`); permintaan tetap Under Review dan tidak ada yang dicap. Di atas tombol, panel menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. Tombol tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast kegagalan berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* `materialrequest_decider_not_requester` — pemohon tidak boleh menyetujui permintaannya sendiri; pemutusnya selalu bernama di sini, sehingga hook menolak bila *Diajukan oleh* juga menyebut seseorang dan orangnya sama, dan meloloskan permintaan yang diajukan kursi yang tidak menyebut siapa pun.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `POLICY_REJECTED`.
- **Kejujuran:** terminal dan tidak menerbitkan apa pun. Tidak ada tanggal kapan material akan ada yang ditampilkan di mana pun, karena tidak ada bagian portal yang mengamati S/4HANA menerbitkan kode. Labelnya *Disetujui untuk dibuat*, tidak pernah *dibuat*.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:153; src/services/transitions/policies.ts:874; src/pages-v2/BuyerMaterialRequests.tsx:897; src/pages-v2/BuyerMaterialRequests.tsx:920; src/services/data/mock/MockCommandService.ts:2093; src/lib/i18n/materialRequests.ts:558; src/lib/i18n/materialRequests.ts:566; src/lib/i18n/materialRequests.ts:571; src/lib/i18n/materialRequests.ts:582; src/lib/i18n/sourcing.ts:684 -->

### t_materialrequest_reject — Tolak <!-- transition:t_materialrequest_reject -->

- **Jenis langkah:** tindakan operator (terminal)
- **Peran:** buyer · planning
- **Dari → ke:** Under Review → Rejected
- **Operator — di mana:** `/buyer/material-requests` → buka baris *Sedang ditinjau* → **Tolak** → kotak *Mengapa ditolak* → **Konfirmasi penolakan** (atau **Kembali**).
- **Operator — lakukan:** tolak permintaan dan catat alasannya. Petunjuknya menyatakan untuk apa teks itu: *"Seluruh catatan keputusan ini. Pembeli hanya membaca ini."* Tombol tetap nonaktif sampai kotak berisi teks.
- **Operator — isi:** justifikasi (wajib, tidak kosong).
- **Penguji — status yang diharapkan:** Rejected (ditampilkan sebagai *Ditolak*)
- **Penguji — konfirmasi:** chip status *Ditolak*; panel menampilkan *"Ditolak. Alasan di bawah adalah seluruh catatan keputusan ini."* beserta teksnya; *Diputuskan* dan *Diputuskan oleh* terisi; baris berpindah ke tab *Ditolak*; toast *"Permintaan ditolak — Alasannya sudah tercatat."*
- **Penguji — peristiwa pemicu:** `t_materialrequest_reject`
- **Pemeriksaan yang dapat menolak:** `materialrequest_decider_named` — kursinya harus menyebut seseorang (`MATERIALREQUEST_DECIDER_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_materialrequest_approve`; tercantum pertama. `materialrequest_refusal_authored` — justifikasi harus berupa string yang tidak kosong; `materialrequest_decider_not_requester` — pemohon tidak boleh menolak permintaannya sendiri.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`.
- **Kejujuran:** terminal berdasarkan keputusan operator: *"Ini tidak dapat dibatalkan. Permintaan baru akan menjadi catatan baru."* Alasan itulah yang memberi tahu pembeli apakah perlu mengajukan lagi dengan deskripsi yang lebih baik atau berhenti meminta.
<!-- src: src/services/transitions/flows/materialRequest.flow.ts:172; src/services/transitions/policies.ts:822; src/services/transitions/policies.ts:874; src/pages-v2/BuyerMaterialRequests.tsx:945; src/services/data/mock/MockCommandService.ts:2100; src/lib/i18n/materialRequests.ts:559; src/lib/i18n/materialRequests.ts:563; src/lib/i18n/materialRequests.ts:568; src/lib/i18n/materialRequests.ts:585 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Keputusan (di Under Review).** Cabang A — `t_materialrequest_approve` — **Kapan:** master data menerima bahwa materialnya baru dan harus dibuat di SAP; tidak ada yang diketik. Cabang B — `t_materialrequest_reject` — **Kapan:** material sudah ada dengan nama lain, deskripsinya tidak bisa dipastikan, atau itu bukan material; alasan tertulis wajib.
- **Penolakan bersifat final.** Tidak ada revisi, buka kembali, tarik, atau batal pada keadaan mana pun. **Kapan** pembeli punya deskripsi yang lebih baik: ajukan permintaan baru; yang ditolak menyimpan alasannya.
- **Dua pintu, satu catatan (di ∅ → Submitted).** **Kapan** diajukan dari wizard: permintaan membawa alasan katalog mengapa pilihan itu tidak berkode (salah satu dari `AMBIGUOUS_IN_MASTER`, `UNCONFIRMED_LOOSE_MATCH`, `NARROWS_THE_MEANING`, `NO_MASTER_TARGET`, `NOT_A_MATERIAL`) dan RFQ tempat ia ditemukan. **Kapan** diajukan dari halaman: keduanya tidak ada dan *Diajukan dari* berbunyi *Diajukan langsung*.
- **Acara tidak pernah disentuh.** **Kapan** RFQ dibuat tetapi permintaan ditolak: acara tetap berdiri, toast menyatakannya, dan permintaan diajukan lagi dari halaman. **Kapan** RFQ itu sendiri ditolak: tidak ada permintaan yang dikirim sama sekali (*"Acara sourcing tidak dibuat, jadi tidak ada yang tercatat."*).
- **Memutuskan sendiri.** **Kapan** kursi pemutus adalah orang yang sama yang mengajukan (hari ini hanya mungkin dengan mengambil identitas sampel yang sama): tinjau, setujui dan tolak semuanya ditolak berdasarkan nama. Permintaan yang diajukan kursi yang tidak menyebut siapa pun diloloskan untuk pemutus bernama mana pun.
- **Orang yang bernama yang memutuskan (di Under Review).** **Kapan** kursi tidak menyebut siapa pun — kursi sebagaimana dibuka, tanpa pengguna contoh yang dipilih di panel identitas — setujui dan tolak sama-sama ditolak oleh `materialrequest_decider_named`: tidak ada yang disimpan atau dicap dan permintaan tetap Under Review. Pilih pengguna contoh di panel identitas, lalu putuskan. Mengajukan permintaan dan memulai tinjauan tetap terbuka bagi kursi yang tidak menyebut siapa pun.

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| SIMULASI — *"Sampel — menunggu master material S/4"* | eksternal (registri liveness) | semua keadaan | selalu, sampai master data tiba kembali dari S/4HANA | baris meta `/buyer/material-requests` (penanda provenans) |
| *"Diajukan dari wizard RFQ saat material yang dipilih tidak memiliki kode master, atau di sini. Permintaan tidak pernah mengubah acara sourcing."* | catatan kejujuran yang ditulis | semua keadaan | selalu | baris meta `/buyer/material-requests` |
| *"Menunggu Pengadaan"* / *"Menunggu Perencanaan"* | diturunkan saat dibaca (kursi vs. atom) | ∅ → Submitted (ajukan); Submitted (tinjau); Under Review (putuskan) | kursi tidak memegang atom verba itu | kepala halaman; badan panel pengajuan; slot tindakan panel samping |
| *"Tanpa atribusi — tidak ada orang dalam sesi ini"* atau label orang bertanda *(SAMPLE)* | diturunkan saat dibaca | semua keadaan | *Tanpa atribusi* hanya pada *Diajukan oleh*, bila permintaan diajukan kursi yang tidak menyebut siapa pun; *Diputuskan oleh* selalu menyebut seseorang; baris yang di-seed membawa pemohon sampel | *Diajukan oleh*, *Diputuskan oleh* pada panel; notis pra-tindakan pada panel pengajuan |
| **Tanpa pemutus bernama** — *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."* | diturunkan saat dibaca (kursi); penolakan (`materialrequest_decider_named`) | Under Review | kursi memegang `materialrequest:decide` dan tidak menyebut siapa pun; dengan pengguna contoh terpilih barisnya berbunyi *"Ini akan dicatat atas nama {person}."* | panel samping, di atas **Setujui untuk dibuat** / **Tolak**; saat salah satunya dikonfirmasi, toast kegagalan *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* |
| *"Permintaan material tertunda untuk: …"* / *"… telah diputuskan ({status}) …"* | diturunkan saat dibaca | Submitted, Under Review / Approved, Rejected | detail RFQ dari acara tempat permintaan diajukan | detail RFQ `/buyer/sourcing` |
| *Mengapa katalog tidak memiliki kode* | ditulis (alasan katalog) | semua keadaan | hanya pada permintaan yang diajukan dari wizard | *Permintaan* pada panel |
| *Menunggu tinjauan* / *Sedang ditinjau* / *Disetujui untuk dibuat* / *Ditolak* | diturunkan saat dibaca (label keadaan) | satu per keadaan | selalu | ubin KPI, tab, chip status |

Tidak ada penanda berbasis waktu dan tidak ada yang diizinkan: store dibuka kosong, setiap tanggal ditulis pada saat tindakan, dan menampilkan lama menunggu dalam hari ditolak oleh keputusan operator.

<!-- src: src/services/liveness/registry.ts:322; src/lib/i18n/widget.ts:213; src/lib/i18n/materialRequests.ts:470; src/lib/i18n/materialRequests.ts:476; src/lib/i18n/materialRequests.ts:502; src/lib/i18n/materialRequests.ts:540; src/lib/i18n/sourcing.ts:682; src/lib/i18n/roles.ts:277; src/services/data/mock/stores/materialRequestStore.ts:130 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `mr-0001` (MR-2026-0001) — *PET Bottle 100ml*, kategori `Packaging`, alasan katalog `AMBIGUOUS_IN_MASTER`, diajukan dari acara sourcing yang dibuat seed, dalam **Submitted**.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| RFQ (acara sourcing) | `raisedFromRfqId`, dicocokkan dengan store RFQ saat lahir | Asal-usul, bukan ketergantungan: RFQ tidak membacanya dan tidak bisa berubah karenanya — material RFQ tidak dapat diubah setelah dibuat. `null` pada permintaan mandiri. Detail RFQ membaca permintaan yang menunjuk padanya. |
| Master material | `materialCode` — selalu `null` (tipenya menyatakan itu secara harfiah) | Baris ini ada karena tidak ada kode. Tidak pernah memuat kode; ketika SAP menerbitkan kode, katalog yang berubah, bukan catatan ini. |
| Alasan katalog tanpa kode | `catalogReason` | Salah satu dari lima alasan yang diberikan katalog sendiri; `null` bila diajukan dari halaman. |
| Kategori | `category` | Himpunan kategori tertutup milik wizard RFQ, dipakai ulang. |
| Pemohon / pemutus | `submittedBy`, `decidedBy` (atribusi aktor) | Ditulis dari sesi. Dua baris yang di-seed membawa identitas sampel berperan pengadaan sebagai pemohon; permintaan yang diajukan kursi yang tidak menyebut siapa pun membawa *tanpa atribusi*; `decidedBy` selalu menyebut seseorang, karena kursi yang tidak menyebut siapa pun tidak dapat memutuskan. |
| Tenant / pemilik | tidak ada (`readScopeOwner` bernilai null) | Permintaan tidak punya pemilik pemasok; tidak ada kursi pemasok yang dapat melihat atau bertindak padanya, termasuk pemasok yang diundang ke acara asalnya. |
| Stempel waktu | `submittedAt`, `reviewStartedAt`, `decidedAt` | Ditetapkan store pada tiap tindakan; `null` sebelum itu. |
| Satuan yang diharapkan, spesifikasi | `expectedUom`, `specification` | Klaim pemohon, dicatat sebagaimana dinyatakan; `null` bila tidak diberikan. |

<!-- src: src/services/data/types.ts:2446; src/services/data/mock/MockCommandService.ts:2134; src/services/data/mock/MockCommandService.ts:2142; src/services/data/mock/materialRequestSeed.ts:100 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` (kursi, bukan orang), `ts`, `outcome`, satu `correlationId` per perintah; tidak ada kaskade yang menyentuh mesin ini, sehingga tidak ada `causationId`. Kolom terpisah `attribution` mencatat siapa yang bisa disebutkan. Penolakan dicatat beserta alasannya.

Urutan kerja untuk `mr-0001` (MR-2026-0001) — seed menjalankan T+0 di bawah kursi pengadaan yang bertindak sebagai identitas sampel; kursi perencanaan melanjutkan, mulai T+2 bertindak sebagai identitas sampel selain pemohon (keputusan ditolak bagi kursi yang tidak menyebut siapa pun):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| T+0 | (RFQ) ∅ → Draft | procurement (`buyer:all`) | seed mengajukan acara sourcing yang akan disebut permintaan | `t_rfq_create` |
| T+0 | ∅ → Submitted | procurement (`buyer:all`, identitas sampel) | kirim — *PET Bottle 100ml*, `Packaging`, alasan `AMBIGUOUS_IN_MASTER`, diajukan dari RFQ itu | `t_materialrequest_submit` |
| T+1 (penguji) | Submitted → Under Review | planning (`buyer:all`) | **Mulai tinjauan** | `t_materialrequest_start_review` |
| T+2 (penguji) | Under Review → Approved | planning (`buyer:all`, identitas sampel) | **Setujui untuk dibuat** → **Konfirmasi persetujuan** | `t_materialrequest_approve` |

Untuk cabang penolakan, jalani `mr-0002` (MR-2026-0002, permintaan mandiri) dan pilih **Tolak** pada T+2 dengan alasan; event-nya `t_materialrequest_reject`. Setelah T+2 tidak ada event lanjutan yang mungkin pada kedua baris.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:127; src/services/data/mock/materialRequestSeed.ts:150; src/services/data/mock/materialRequestSeed.ts:190 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada tombol **Ajukan permintaan material**; kepala halaman berbunyi *"Menunggu Pengadaan"* | notis serah-terima di kepala halaman (dan di dalam panel pengajuan bila sudah terbuka) | kursi tidak memegang `materialrequest:submit` | bertindak dari kursi yang memegang jalur pengadaan |
| Tidak ada **Mulai tinjauan** / **Setujui untuk dibuat** / **Tolak**; panel berbunyi *"Menunggu Perencanaan"* | notis serah-terima di slot tindakan panel | kursi tidak memegang `materialrequest:review` / `materialrequest:decide` | alihkan ke kursi perencanaan |
| **Kirim permintaan** tetap nonaktif | formulir belum lengkap | nama material, kategori, atau *Mengapa dibutuhkan* kosong | isi tiga kolom wajib |
| Toast *"Permintaan tidak tercatat"* menyebut *category* atau *catalogReason* | `POLICY_REJECTED:materialrequest_category_known` | dispatch buatan tangan mengirim kategori di luar enam, atau alasan katalog di luar lima | gunakan kontrol halaman sendiri |
| Toast *"Permintaan tidak tercatat"* menyebut *need* | `MISSING_FIELDS:need` / `POLICY_REJECTED:materialrequest_need_authored` | *Mengapa dibutuhkan* kosong atau hanya spasi | tulis kebutuhannya |
| Toast menyebut *raisedFromRfqId* | `POLICY_REJECTED:materialrequest_rfq_resolved` | acara sourcing yang disebut tidak ada di store | ajukan dari halaman (tanpa acara) atau dari acara yang nyata |
| Toast *"{nomorRfq} diajukan — permintaan material tidak"* | toast RFQ, varian galat | acara dibuat dan permintaan ditolak setelahnya | acara tetap berdiri; ajukan permintaan dari `/buyer/material-requests` |
| Toast *"Tidak ada permintaan material yang diajukan"* | setelah wizard | RFQ itu sendiri ditolak, sehingga tidak ada permintaan yang dikirim | perbaiki dulu penolakan RFQ |
| *"Tindakan itu tidak berhasil"* dengan penolakan yang menyebut pemohon | `POLICY_REJECTED:materialrequest_decider_not_requester` | kursi pemutus bertindak sebagai identitas sampel yang sama dengan yang mengajukan permintaan | putuskan dari identitas sampel lain — pada setujui dan tolak, kursi yang tidak menyebut siapa pun justru ditolak oleh `materialrequest_decider_named`; **Mulai tinjauan** tetap terbuka baginya |
| Toast kegagalan saat mengonfirmasi persetujuan atau penolakan: *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* | `POLICY_REJECTED:materialrequest_decider_named` (`MATERIALREQUEST_DECIDER_UNATTRIBUTED`); baris di atas tombol sudah menyatakannya | kursi tidak menyebut siapa pun — belum ada pengguna contoh yang dipilih di panel identitas | pilih pengguna contoh di panel identitas, lalu ulangi tindakannya; permintaan masih Under Review dan tidak ada yang dicap |
| Toast *"Tindakan itu tidak berhasil"* menyebut *justification* | `MISSING_FIELDS:justification` / `POLICY_REJECTED:materialrequest_refusal_authored` | *Mengapa ditolak* kosong | tulis alasannya |
| *"…tidak berada dalam status yang memungkinkan tindakan ini"* | `ILLEGAL_TRANSITION` | bertindak pada baris yang sudah berpindah | buka kembali baris dan ambil tindakan yang ditawarkan keadaannya |
| Disetujui, tetapi material masih belum ada di katalog | tidak ada kode baru di pemilih material | wajar — persetujuan mencatat keputusan; SAP menerbitkan kode, dan tidak ada bagian portal yang mengamatinya | tidak ada yang perlu dilakukan di portal |
| Ingin mengubah permintaan yang ditolak | baris yang ditolak bersifat terminal | sesuai rancangan — tidak ada buka kembali | ajukan permintaan baru |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:MAT`; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Permintaan material"* | modul Permintaan material dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:324; src/services/transitions/policies.ts:728; src/services/transitions/policies.ts:874; src/lib/i18n/materialRequests.ts:579; src/lib/i18n/sourcing.ts:670 -->

<!-- section:testdata -->
## 9 · Data uji

| Keadaan | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Submitted | `mr-0001`; `mr-0002` | MR-2026-0001; MR-2026-0002 | ditumbuhkan saat aplikasi dimulai oleh seed melalui `t_materialrequest_submit` di bawah kursi pengadaan: *PET Bottle 100ml* (`Packaging`, alasan `AMBIGUOUS_IN_MASTER`, diajukan dari acara sourcing milik seed); *Sample Amber Dropper 30ml (illustrative)* (`Packaging`, diajukan langsung) |
| Under Review | — | — | tidak ada fixture — tekan **Mulai tinjauan** pada salah satu baris |
| Approved | — | — | tidak ada fixture — setujui baris yang sedang ditinjau, dari kursi yang bertindak sebagai pengguna contoh |
| Rejected | — | — | tidak ada fixture — tolak baris yang sedang ditinjau dengan alasan, dari kursi yang bertindak sebagai pengguna contoh |

Store dibuka kosong berdasarkan keputusan operator (belum pernah ada yang meminta material); setiap baris dihasilkan oleh verba. Seed juga membuat satu RFQ tambahan agar `mr-0001` punya asal yang nyata. Semua data bersifat SIMULASI (lihat §5).

<!-- src: src/services/data/mock/stores/materialRequestStore.ts:110; src/services/data/mock/materialRequestSeed.ts:100; src/services/data/mock/materialRequestSeed.ts:75 -->
