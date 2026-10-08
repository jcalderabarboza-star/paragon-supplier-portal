---
entity: supplierDocument
locale: id
title: Dokumen pemasok (sertifikat)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_supplierdoc_request
  - t_supplierdoc_declare
  - t_supplierdoc_submit
  - t_supplierdoc_verify
  - t_supplierdoc_reject
---

<!-- section:summary -->
## 1 · Apa proses ini

Dokumen yang wajib dipegang Paragon atas seorang pemasok — sertifikat, izin, rincian bank — dan posisi masing-masing.

Sebuah **dokumen pemasok** adalah satu baris pada halaman dokumen seorang pemasok: sertifikat halal, notifikasi BPOM, registrasi pajak, sertifikat ISO, kontrak, atau lainnya. Ia bermula lewat salah satu dari dua jalan. Petugas kepatuhan Paragon **meminta** satu jenis dokumen tertentu dari pemasok, yang membuka sebuah slot pada halaman pemasok itu (*Awaiting Upload* — Menunggu Unggahan); atau pemasok **menyatakan** sertifikat yang tidak diminta siapa pun, yang langsung masuk tinjauan (*Under Review* — Sedang Ditinjau). Pemasok menjawab slot yang terbuka — atau menjawab lagi setelah penolakan — dengan **menyatakan** rincian sertifikatnya: skema, nomor, siapa yang menerbitkan, kapan, sampai kapan, dan apa cakupannya dengan kata-kata pemasok sendiri. Kepatuhan kemudian **mengonfirmasinya** (*Valid* — Berlaku) atau **menolaknya** dengan alasan tertulis (*Rejected* — Ditolak), dan dokumen yang ditolak dapat dinyatakan lagi. Inilah satu-satunya proses kepatuhan di portal; mesin kepatuhan terpisah yang dulu memodelkan gagasan yang sama sedang dipensiunkan.

Siapa yang menyentuhnya: **jalur kepatuhan pembeli** meminta, mengonfirmasi dan menolak; **jalur administrasi pemasok** (back_office) menyatakan dan menjawab. Tidak ada yang mengunggah apa pun: **tidak ada berkas yang dikirim ke Paragon** — portal mencatat apa yang dinyatakan pemasok, dan kepatuhan mencocokkannya dengan sertifikat lewat saluran biasa. Kepatuhan menetapkan kode material Paragon pada saat konfirmasi; pemasok tidak pernah diminta menebaknya.

Penanda kejujuran. Setiap baris bawaan adalah data contoh yang ditulis atas pemasok contoh, dan kapabilitasnya berbunyi **Sampel** — verbanya tersambung dan benar-benar mendispatch, tetapi belum ada identitas pemasok sungguhan di baliknya. Pernyataan pemasok dicatat atas kursi (`UNATTRIBUTED: NO_PERSON_IN_SESSION`) kecuali identitas contoh diadopsi. Tiga tindakan kepatuhan — meminta, mengonfirmasi, menolak — hanya diambil oleh kursi yang menyebut seseorang: kursi yang belum memilih pengguna contoh ditolak, dan layarnya menyatakannya sebelum tindakan. *Expiring* (Akan Kedaluwarsa) dan *Expired* (Kedaluwarsa) tidak pernah disimpan: status kedaluwarsa dokumen *Valid* dihitung dari tanggal kedaluwarsanya saat dibaca (dalam 180 hari → akan kedaluwarsa). Tanggal mandat halal BPJPH, 17 Okt 2026, adalah konstanta di dalam pohon kode; kedua halaman memuat spanduk tentang transisi itu.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:1-48; src/services/data/types.ts:394-447,484-527; src/lib/i18n/processFlowPurpose.ts:259-271; src/lib/i18n/supplierDocuments.ts:95-100; src/services/liveness/registry.ts:152,300-303; src/services/data/dayProjection.ts:134,201-214; src/services/data/complianceProjection.ts:50; src/services/data/mock/fixtures/supplierDocuments.ts:19-25 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1a | ∅ → Awaiting Upload | tindakan operator (pembuatan): Paragon meminta dokumen | buyer · compliance | `t_supplierdoc_request` |
| 1b | ∅ → Under Review | tindakan operator (pembuatan): pemasok menyatakan sertifikat atas inisiatif sendiri | supplier · back_office | `t_supplierdoc_declare` |
| 2 | Awaiting Upload, Rejected → Under Review | tindakan operator: pemasok menyatakan rincian sertifikat atas slot yang terbuka, atau lagi setelah penolakan | supplier · back_office | `t_supplierdoc_submit` |
| 3a | Under Review → Valid | tindakan operator: kepatuhan mengonfirmasi | buyer · compliance | `t_supplierdoc_verify` |
| 3b | Under Review → Rejected | tindakan operator: kepatuhan menolak dengan alasan | buyer · compliance | `t_supplierdoc_reject` |

`Valid` bersifat terminal. `Rejected` sengaja tidak: pemasok dapat menyatakan lagi.

**Percabangan**

- **Di awal (∅):** `t_supplierdoc_request` — kepatuhan — ketika Paragon tahu sebuah dokumen dibutuhkan dan ingin celahnya ada di daftar seseorang; `t_supplierdoc_declare` — administrasi pemasok — ketika pemasok memegang sertifikat yang tidak Paragon ketahui untuk diminta.
- **Di Under Review:** `t_supplierdoc_verify` — kepatuhan — ketika rincian yang dinyatakan cocok dengan sertifikat yang asli dan masih berlaku; `t_supplierdoc_reject` — kepatuhan — ketika tidak cocok (dokumen keliru, kedaluwarsa, cakupan salah, tidak terbaca). Keduanya — dan permintaan di awal — ditolak bagi kursi yang tidak menyebut siapa pun (`supplierdoc_actor_named`).
- **Di Rejected:** `t_supplierdoc_submit` — administrasi pemasok — ketika pemasok sudah memiliki rincian yang diperbaiki; satu-satunya jalan keluar.
- **Di Awaiting Upload:** `t_supplierdoc_submit` — administrasi pemasok — satu-satunya jalan keluar.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:79-159 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_supplierdoc_request — Minta dokumen <!-- transition:t_supplierdoc_request -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** buyer · compliance (atom `supplierdoc:request`)
- **Dari → ke:** ∅ → Awaiting Upload
- **Operator — di mana:** `/buyer/compliance` → kepala halaman **Minta dokumen** → panel **Minta dokumen dari pemasok** → **Periksa kembali** → langkah konfirmasi → **Buka permintaan**. Kursi tanpa atom melihat notis *Menunggu Kepatuhan* di slot kepala halaman sebagai gantinya.
- **Operator — lakukan:** Minta satu jenis dokumen dari satu pemasok, dan nyatakan apa yang dibutuhkan dan mengapa. Ini membuka sebuah slot pada halaman dokumen pemasok itu — tidak ada yang dikirim dan tidak ada berkas yang dipindahkan; pemasok melihat permintaannya saat berikutnya mereka membuka halaman. Langkah konfirmasi menampilkan nama perusahaan yang berhasil dicocokkan: platform dapat membedakan pemasok yang tidak ada dari yang ada, tetapi tidak pemasok yang keliru dari yang tepat.
- **Operator — isi:** **Pemasok** (dipilih dari daftar), **Jenis dokumen** (salah satu dari enam kategori — satu-satunya cara baris *Pajak & Hukum* atau *Kontrak* dapat dibuat, karena pernyataan hanya memetakan ke Halal, BPOM, Kualitas dan Lainnya), dan **Apa yang Anda perlukan, dan alasannya** (catatan; wajib di layar, opsional di verba; ditampilkan kepada pemasok kata demi kata).
- **Penguji — status yang diharapkan:** Awaiting Upload
- **Penguji — konfirmasi:** toast *Permintaan dibuka — {pemasok} melihatnya di halaman dokumen mereka*; pada `/supplier/documents` pemasok itu muncul baris baru dengan nama `—`, kategori yang dipilih, status *Menunggu Unggahan*, catatannya, dan tombol **Nyatakan**; hitungan spanduk menunggu-unggahan naik.
- **Penguji — peristiwa pemicu:** `t_supplierdoc_request`
- **Pemeriksaan yang dapat menolak:** `supplierdoc_actor_named` — kursinya harus menyebut seseorang (`SUPPLIERDOC_ACTOR_UNATTRIBUTED`); tidak ada slot yang dibuka dan tidak ada yang dicap. Langkah konfirmasi menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. **Buka permintaan** tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast kegagalan berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* Selain itu, peran, legalitas dan kolom wajib (`supplierId`, `category`) — ditambah pemeriksaan pemilik saat pembuatan: id pemasok harus ditemukan di daftar, atau dispatcher melempar `SCOPE_DENIED` alih-alih mencetak dokumen untuk tenant yang tidak ada.
- **Glosarium:** ROLE_NOT_PERMITTED · MISSING_FIELDS · SCOPE_DENIED · POLICY_REJECTED · NO_PERSON_IN_SESSION
- **Kejujuran:** hanya diambil oleh kursi yang menyebut seseorang — langkah konfirmasi menyatakan atas nama siapa tindakan itu dicatat, atau bahwa kursi ini akan ditolak. Barisnya sendiri tidak menyimpan siapa yang meminta. Baris dicetak dengan `—` untuk nama, penerbit, jenis berkas, ukuran dan versi — belum ada yang dinamai, dan store menyatakannya alih-alih mengarang judul. Data contoh dari ujung ke ujung.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:87-97; src/services/query/commandHooks.ts:1213-1230; src/services/data/mock/MockCommandService.ts:1800-1865; src/pages-v2/BuyerCompliance.tsx:240-300,1045-1160; src/lib/i18n/compliance.ts:157-186 -->

### t_supplierdoc_declare — Nyatakan sertifikat <!-- transition:t_supplierdoc_declare -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** supplier · back_office (atom `supplierdoc:upload`)
- **Dari → ke:** ∅ → Under Review
- **Operator — di mana:** `/supplier/documents` → kepala halaman **Nyatakan sertifikat** → panel samping **Nyatakan sertifikat** → **Catat pernyataan**. Kursi tanpa atom melihat notis serah-terima di kaki panel.
- **Operator — lakukan:** Nyatakan rincian sertifikat yang tidak diminta siapa pun, sehingga sertifikat yang tidak Paragon ketahui untuk diminta tetap sampai ke pihak yang memeriksanya. Yang Anda nyatakan adalah klaim sampai tim kepatuhan Paragon mengonfirmasinya.
- **Operator — isi:** **Skema sertifikat** (Halal BPJPH / Halal MUI warisan / Halal skema asing / BPOM / ISO / Lainnya), **Nomor sertifikat**, **Diterbitkan oleh**, **Tanggal terbit**, **Berlaku sampai** (kosongkan bila tidak ada masa berlaku — sertifikat halal BPJPH tidak memilikinya) dan **Cakupannya** (dengan kata-kata Anda sendiri: produk, grade, atau lokasi). Semua kolom selain tanggal kedaluwarsa wajib diisi.
- **Penguji — status yang diharapkan:** Under Review
- **Penguji — konfirmasi:** toast *Pernyataan tercatat — menunggu tinjauan tim kepatuhan Paragon*; baris baru di `/supplier/documents` bernama nomor sertifikat, kategori diturunkan dari skema, status *Sedang Ditinjau*; di `/buyer/compliance` antrean **Sertifikat yang dinyatakan, menunggu tinjauan** bertambah baris itu dengan *Diterbitkan oleh*, *Berlaku*, *Mencakup*, *Dinyatakan … oleh pemasok (tanpa nama perorangan)*.
- **Penguji — peristiwa pemicu:** `t_supplierdoc_declare`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib (`supplierId`, `certType`, `certNumber`, `issuer`, `issuedOn`, `scopeText`). Pemasok hanya boleh menyatakan untuk dirinya sendiri: dispatcher membandingkan id pemasok pada payload dengan id kursi.
- **Glosarium:** HALAL_BPJPH · HALAL_MUI_LEGACY · HALAL_FOREIGN · BPOM · ISO · OTHER · ROLE_NOT_PERMITTED · MISSING_FIELDS · SCOPE_DENIED
- **Kejujuran:** *Tidak ada berkas yang dikirim ke Paragon* — panel menyatakannya dalam kotak berjudul. Dicatat atas nama perusahaan Anda, bukan atas nama perorangan. `version` baris adalah `v1` dan jenis serta ukuran berkasnya `—`, yang memang kebenaran harfiahnya. Data contoh.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:99-114; src/services/query/commandHooks.ts:1173-1191; src/services/data/mock/MockCommandService.ts:1867-1908; src/pages-v2/SupplierDocuments.tsx:276-290,396-425,920-945; src/lib/i18n/supplierDocuments.ts:27,84,90-121 -->

### t_supplierdoc_submit — Nyatakan (atas slot yang terbuka, atau ulang) <!-- transition:t_supplierdoc_submit -->

- **Jenis langkah:** tindakan operator
- **Peran:** supplier · back_office (atom `supplierdoc:submit`)
- **Dari → ke:** Awaiting Upload, Rejected → Under Review
- **Operator — di mana:** `/supplier/documents` → pada baris *Awaiting Upload*, **Nyatakan**; pada baris *Rejected*, **Nyatakan ulang** → panel **Nyatakan — {nama}** → **Catat pernyataan**.
- **Operator — lakukan:** Nyatakan rincian atas apa yang diminta, atau nyatakan ulang setelah penolakan. Sejak titik ini keterlambatan ada di pihak Paragon, bukan pada Anda. Pada baris yang ditolak, alasan penolakan di atas baris itulah yang menjadi acuan perbaikan.
- **Operator — isi:** enam kolom sertifikat yang sama seperti pernyataan (skema, nomor, diterbitkan oleh, tanggal terbit, berlaku sampai — opsional — dan cakupannya).
- **Penguji — status yang diharapkan:** Under Review
- **Penguji — konfirmasi:** nama baris menjadi nomor sertifikat, penerbit, tanggal, kategori dan teks *Tertaut* mengikuti pernyataan, dan statusnya berbunyi *Sedang Ditinjau*; blok merah **Ditolak** menghilang (kolom penolakan yang tersimpan tetap ada, tetapi bloknya hanya dirender selama status masih Rejected); antrean tinjauan pembeli bertambah baris itu.
- **Penguji — peristiwa pemicu:** `t_supplierdoc_submit`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib (`certType`, `certNumber`, `issuer`, `issuedOn`, `scopeText`). Baris *Valid* atau *Under Review* ditolak oleh legalitas (`ILLEGAL_TRANSITION`). Kursi pemasok hanya menjangkau barisnya sendiri (`SCOPE_DENIED` bila tidak).
- **Glosarium:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · MISSING_FIELDS · SCOPE_DENIED
- **Kejujuran:** tidak ada berkas yang berpindah; dicatat atas perusahaan, bukan orang. Pernyataan ulang tidak membatalkan penolakan sebelumnya — catatannya tetap ada dan hanya blok yang bersifat kini yang ditarik.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:116-127; src/services/query/commandHooks.ts:1233-1250; src/services/data/mock/MockCommandService.ts:1731-1764; src/pages-v2/SupplierDocuments.tsx:166-230,721-745; src/lib/i18n/supplierDocuments.ts:79,84,91,118 -->

### t_supplierdoc_verify — Konfirmasi <!-- transition:t_supplierdoc_verify -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · compliance (atom `supplierdoc:verify`)
- **Dari → ke:** Under Review → Valid
- **Operator — di mana:** `/buyer/compliance` → **Sertifikat yang dinyatakan, menunggu tinjauan** → pada baris, **Konfirmasi**. Kursi tanpa atom melihat *Menunggu Kepatuhan* di slot itu.
- **Operator — lakukan:** Konfirmasi bahwa rincian yang dinyatakan cocok dengan sertifikat yang asli dan masih berlaku. Tidak ada yang diunggah — cocokkan rinciannya dengan sertifikat aslinya sebelum mengonfirmasi. Baru sekaranglah dokumen itu berarti sesuatu.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Valid
- **Penguji — konfirmasi:** toast *Sertifikat dikonfirmasi*; baris keluar dari antrean tinjauan; di `/supplier/documents` pil status berbunyi *Berlaku* (atau *Akan Kedaluwarsa* / *Kedaluwarsa*, dihitung dari tanggal kedaluwarsa yang dinyatakan saat dibaca); ubin KPI pemasok bergerak, dan baris berbunyi *Dikonfirmasi oleh Paragon pada {date}* dengan penanda stempel sesi (tanggalnya saja — orangnya tidak ditampilkan kepada pemasok). Di `/buyer/compliance`, di bawah antrean tinjauan, daftar **Sertifikat yang dikonfirmasi** mendapat dokumen itu: skema (atau nama baris, pada baris bawaan tanpa rincian yang dinyatakan) · id pemasok · *Dikonfirmasi oleh {person} pada {date}*, dengan penanda stempel sesi.
- **Penguji — peristiwa pemicu:** `t_supplierdoc_verify`
- **Pemeriksaan yang dapat menolak:** `supplierdoc_actor_named` — kursinya harus menyebut seseorang (`SUPPLIERDOC_ACTOR_UNATTRIBUTED`); dokumen tetap Under Review dan tidak ada yang dicap. Kepala antrean tinjauan menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. **Konfirmasi** tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast kegagalan berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* Status apa pun selain *Under Review* adalah `ILLEGAL_TRANSITION`.
- **Glosarium:** Valid · Expiring · Expired · ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · POLICY_REJECTED
- **Kejujuran:** konfirmasi mencatat keputusan, bukan berkas; rincian yang dinyatakan tidak diubah olehnya. Kode material ditetapkan oleh kepatuhan pada titik ini dalam rancangan, tetapi verba tidak menulis satu pun (`linkedTo` yang tersimpan tetap teks cakupan milik pemasok). Verba mencap siapa dan kapan: `verifiedAt` dicetak store dari jam dinding pada saat tindakan (seperti `rejectedAt`) dan `verifiedBy` adalah orang dalam sesi, tidak pernah kolom payload. Konfirmasi bersifat final — tidak ada yang keluar dari Valid.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:129-139; src/services/query/commandHooks.ts:1253-1269; src/services/data/mock/MockCommandService.ts:1731-1738; src/pages-v2/BuyerCompliance.tsx:186-201,610-625; src/lib/i18n/compliance.ts:103-125; src/services/data/documentDisplayState.ts:64-77 -->

### t_supplierdoc_reject — Tolak <!-- transition:t_supplierdoc_reject -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · compliance (atom `supplierdoc:reject`)
- **Dari → ke:** Under Review → Rejected
- **Operator — di mana:** `/buyer/compliance` → antrean tinjauan → **Tolak** → **Alasan penolakan** → **Catat penolakan**.
- **Operator — lakukan:** Nyatakan mengapa dokumen itu tidak memenuhi kebutuhan — keliru, kedaluwarsa, cakupan salah, tidak terbaca — dengan kata-kata yang akan dibaca pemasok kata demi kata di halaman dokumen mereka sendiri, jadi tulislah untuk mereka. Pemasok kemudian diminta lagi.
- **Operator — isi:** **Alasan penolakan** (`rejectionReason`, wajib; spasi tidak dihitung).
- **Penguji — status yang diharapkan:** Rejected
- **Penguji — konfirmasi:** toast *Penolakan tercatat — pemasok melihat alasan dan tanggalnya…*; baris keluar dari antrean tinjauan; di `/supplier/documents` baris menampilkan blok merah **Ditolak pada {tanggal}** dengan **Alasan:** teks Anda, ditambah tombol **Nyatakan ulang** (baris *Dicatat tanpa nama orang…* hanya tampil pada penolakan yang tidak membawa nama orang — `doc-012` bawaan; penolakan yang diambil melalui verba menyebut penolaknya, yang tidak ditampilkan kepada pemasok); hitungan spanduk *ditolak* naik.
- **Penguji — peristiwa pemicu:** `t_supplierdoc_reject`
- **Pemeriksaan yang dapat menolak:** `supplierdoc_actor_named` — kursinya harus menyebut seseorang (`SUPPLIERDOC_ACTOR_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_supplierdoc_verify`; tercantum pertama. `supplierdoc_refusal_authored` — alasan harus berisi; alasan kosong atau hanya spasi ditolak karena pemasok akan membaca penolakan tanpa isi apa pun. Pemeriksaan kolom wajib menangkap alasan yang tidak ada lebih dulu.
- **Glosarium:** ROLE_NOT_PERMITTED · ILLEGAL_TRANSITION · MISSING_FIELDS · POLICY_REJECTED · NO_PERSON_IN_SESSION
- **Kejujuran:** trio penolakan — alasan, stempel waktu, aktor — ditulis bersama-sama; stempel waktu dicetak store pada saat tindakan dan aktornya adalah orang dalam sesi — selalu bernama pada penolakan yang diambil melalui verba, karena kursi yang tidak menyebut siapa pun ditolak. Satu penolakan bawaan (`doc-012`) ditulis tangan, bukan dihasilkan verba; halaman pemasok menandai stempel waktu yang dicetak dalam sesi secara berbeda dari yang bawaan.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:141-157; src/services/transitions/policies.ts:531-545; src/services/query/commandHooks.ts:1282-1299; src/services/data/mock/MockCommandService.ts:1765-1773; src/pages-v2/BuyerCompliance.tsx:203-229,626-700; src/pages-v2/SupplierDocuments.tsx:166-230; src/lib/i18n/compliance.ts:117-128; src/lib/i18n/supplierDocuments.ts:130-136 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Siapa yang membuka dokumen (di ∅).** Cabang A — `t_supplierdoc_request` — **Kapan:** Paragon tahu apa yang dibutuhkannya; slot membawa kategori dan catatan pembeli dan menunggu pemasok. Cabang B — `t_supplierdoc_declare` — **Kapan:** pemasok memegang sertifikat yang belum diminta Paragon; langsung masuk tinjauan.
- **Konfirmasi atau tolak (di Under Review).** Cabang A — `t_supplierdoc_verify` — **Kapan:** skema, nomor, penerbit, tanggal dan cakupan yang dinyatakan cocok dengan sertifikatnya. Cabang B — `t_supplierdoc_reject` — **Kapan:** tidak cocok; alasannya sampai ke pemasok kata demi kata.
- **Penolakan bukan jalan buntu (di Rejected).** `t_supplierdoc_submit` — **Kapan:** pemasok sudah memiliki rincian yang diperbaiki. Penolakan yang tersimpan dipertahankan sebagai riwayat; blok yang bersifat kini ditarik begitu status berubah.
- **Alasan penolakan kosong (pengecualian).** `POLICY_REJECTED:supplierdoc_refusal_authored` — layar menonaktifkan **Catat penolakan** sampai teks dimasukkan; verba menolak payload kosong buatan tangan.
- **Kursi tidak menyebut siapa pun (pengecualian).** `POLICY_REJECTED:supplierdoc_actor_named` (`SUPPLIERDOC_ACTOR_UNATTRIBUTED`) — pada permintaan, konfirmasi atau penolakan yang diambil dari kursi sebagaimana dibuka, tanpa pengguna contoh yang dipilih di panel identitas. Tidak ada yang disimpan atau dicap dan status tidak berpindah; tombol tetap aktif dan baris di dekatnya menyatakannya sebelum tindakan. `t_supplierdoc_declare` dan `t_supplierdoc_submit` milik pemasok tidak diperiksa dengan cara ini.
- **Pemasok tak dikenal pada permintaan (pengecualian).** `SCOPE_DENIED` — id tidak ditemukan di daftar. Pemasok yang keliru-tetapi-nyata tidak tertangkap pemeriksaan mana pun; nama perusahaan pada langkah konfirmasi adalah pengamannya.
- **Kedaluwarsa (diturunkan, bukan verba).** Dokumen *Valid* terbaca *Expiring* dalam 180 hari sebelum tanggal kedaluwarsanya dan *Expired* setelahnya; tidak ada verba yang memindahkannya, dan tidak ada verba pembaruan — tombol **Perbarui** membuka panduan pembaruan halal (petunjuk hanya-baca), dan tombol **Lihat** menyatakan bahwa unduhan belum tersedia.
- **Tidak disediakan: tarik, batal, sunting dokumen yang sudah dikonfirmasi.** Tidak ada satu pun; dokumen terkonfirmasi dengan rincian keliru memerlukan pernyataan baru, yang tidak dijaga oleh pohon kode.
<!-- src: src/services/transitions/flows/supplierDocument.flow.ts:79-159; src/services/transitions/policies.ts:531-545; src/services/data/mock/MockCommandService.ts:1800-1811; src/pages-v2/SupplierDocuments.tsx:166-230,721-770; src/services/data/dayProjection.ts:201-214; src/lib/i18n/supplierDocuments.ts:122-123 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Sampel (liveness) | eksternal | semua status | selalu — verba tersambung (gerbang 1) tetapi belum ada identitas pemasok sungguhan (gerbang 2) | `ProvenanceMarker` / `LivenessPill` di `/supplier/documents` dan `/buyer/compliance` |
| Awaiting Upload | tersimpan | Awaiting Upload | slot yang dibuka oleh permintaan dan belum dijawab | pil baris pemasok; spanduk *dokumen menunggu unggahan*; KPI **Perlu Tindakan** |
| Under Review | tersimpan | Under Review | pernyataan yang menunggu kepatuhan | pil baris pemasok; antrean tinjauan pembeli |
| Ditolak (dengan tanggal dan alasan) | diangkat operator | Rejected | penolakan tercatat; disembunyikan lagi begitu status meninggalkan Rejected | blok baris pemasok; spanduk *dokumen ditolak* |
| Dicatat tanpa nama orang | diturunkan saat dibaca | Rejected / Under Review | pernyataan dibuat oleh kursi pemasok yang tidak menyebut siapa pun; penolakan yang membawa `UNATTRIBUTED` — hanya `doc-012` bawaan, karena penolakan yang diambil melalui verba selalu menyebut seseorang | blok penolakan pemasok; antrean pembeli *Dinyatakan … oleh pemasok (tanpa nama perorangan)* |
| Kursi tanpa orang bernama — *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."* | diturunkan saat dibaca (kursi); penolakan (`supplierdoc_actor_named`) | ∅ (permintaan), Under Review | kursi memegang atom verba itu dan tidak menyebut siapa pun; dengan pengguna contoh terpilih barisnya berbunyi *"Ini akan dicatat atas nama {person}."* | kepala antrean tinjauan `/buyer/compliance`; langkah konfirmasi **Minta dokumen**; saat tombol ditekan, toast kegagalan *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* |
| Dikonfirmasi oleh {person} pada {date} | tersimpan (`verifiedAt`, `verifiedBy`) | Valid | dokumen dikonfirmasi melalui `t_supplierdoc_verify`; baris Valid bawaan tidak membawa cap dan tidak didaftarkan | daftar **Sertifikat yang dikonfirmasi** di `/buyer/compliance`, di bawah antrean tinjauan; baris `/supplier/documents` sebagai *Dikonfirmasi oleh Paragon pada {date}* — tanggalnya saja |
| Penanda stempel yang dicetak dalam sesi | diturunkan saat dibaca | Rejected / Under Review / Valid | `rejectedAt` / `declaredAt` / `verifiedAt` dicetak dalam sesi ini, bukan bawaan | di samping tanggal |
| Expiring | digerakkan waktu, diturunkan saat dibaca | Valid | kedaluwarsa dalam 180 hari dari titik waktu yang dinyatakan | pil baris pemasok; spanduk *akan kedaluwarsa dalam 6 bulan*; KPI **Akan Kedaluwarsa ≤180h**; tombol **Perbarui** |
| Expired | digerakkan waktu, diturunkan saat dibaca | Valid | tanggal kedaluwarsa sudah lewat | pil baris pemasok; spanduk *kedaluwarsa*; KPI **Kedaluwarsa** |
| Tanpa kedaluwarsa | diturunkan saat dibaca | mana pun | `expiryDate` bernilai null (sertifikat BPJPH berlaku permanen) | kolom kedaluwarsa |
| Baris contoh bawaan (tanpa rincian yang dinyatakan) | diturunkan saat dibaca | Under Review | baris bawaan yang masuk tinjauan sebelum pernyataan ada | catatan antrean tinjauan pembeli |
| Spanduk transisi BPJPH | referensi | — | selalu; tanggal mandat 17 Okt 2026 adalah konstanta | kedua halaman |
| Menunggu Kepatuhan / Menunggu Administrasi Pemasok (serah-terima) | diturunkan saat dibaca | mana pun | kursi tidak memegang atom verba itu | slot milik verba itu sendiri |
<!-- src: src/pages-v2/SupplierDocuments.tsx:166-230,690-745; src/pages-v2/BuyerCompliance.tsx:540-640; src/services/data/documentDisplayState.ts:64-77; src/services/data/dayProjection.ts:134,201-214; src/services/data/complianceProjection.ts:50; src/services/liveness/registry.ts:300-303; src/lib/i18n/supplierDocuments.ts:31-52,86-88,130-136 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `doc-012` (tanpa nomor dokumen — baris bernama *Halal Scope Annex — SAMPLE-MUI-SCOPE-0007B*), satu-satunya baris *Rejected* bawaan, pemasok `sup-007` (PT Sample Packaging Indonesia).

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Pemasok `sup-007` | `supplierId` | tenansi: kursi pemasok membaca dan bertindak pada barisnya sendiri saja; kursi pembeli membaca semuanya |
| Kategori *Halal Compliance* | `category` | pada baris yang dinyatakan diturunkan dari skema (`CERT_TYPE_TO_CATEGORY`); pada baris yang diminta, pilihan pembeli |
| Material `PK-PETB-8810` | `linkedTo` (teks bebas) | hanya tampilan: fixture menyebut kode material, tetapi jalur pernyataan menyimpan `scopeText` milik pemasok di sini, tidak pernah daftar kode |
| Catatan penolakan | `rejectionReason`, `rejectedAt`, `rejectedBy` | ditulis tangan pada baris ini; pada penolakan saat runtime, store mencetak stempel waktu dan mengambil aktor dari sesi — selalu orang yang bernama |
| Catatan konfirmasi | `verifiedAt`, `verifiedBy` | tidak ada pada baris ini dan pada setiap baris bawaan; ditulis bersama-sama oleh `t_supplierdoc_verify` — store mencetak stempel waktu dan mengambil orangnya dari sesi, tidak pernah dari payload |
| Pernyataan | `declaration` (tidak ada pada baris bawaan) | `certType`, `certNumber`, `issuer`, `issuedOn`, `expiresOn`, `scopeText`, `declaredAt`, `declaredBy` |
| Status kedaluwarsa | `expiryDate` × titik waktu yang dinyatakan | dihitung saat dibaca; `null` di sini — tanpa kedaluwarsa |
| Registri kepatuhan (tabel `/buyer/compliance`) | tidak ada lewat kolom | mesin terpisah yang hanya-baca atas `COMPLIANCE_REGISTRY`; sedang dipensiunkan; tidak tertaut ke baris dokumen |

Kolom hanya-tampilan yang tidak ditulis apa pun saat runtime: `fileType`, `fileSize` (`—` pada setiap baris yang dinyatakan — tidak ada yang dikirimkan), `version` (`v1` pada pernyataan), `notes` (catatan permintaan pembeli bila ada), dan nama prosa bawaan pada baris fixture.
<!-- src: src/services/data/mock/fixtures/supplierDocuments.ts:60-102; src/services/data/types.ts:484-527; src/services/data/mock/MockCommandService.ts:1712-1720,1731-1764,1867-1908; src/data/mockSuppliers.ts:220-222 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` adalah id transisi, `actor` adalah `supplier:sup-007` untuk kursi pemasok dan `buyer:all` untuk kursi pembeli, ditambah `ts`, `outcome` dan `correlationId`; penolakan juga ditulis. Baris itu sendiri menyimpan pernyataan terbaru (`declaredAt`, `declaredBy`) , penolakan terbaru (`rejectedAt`, `rejectedBy`, `rejectionReason`) dan konfirmasi (`verifiedAt`, `verifiedBy`); penolakan sebelumnya tertimpa pada baris ketika penolakan kedua dicatat, dan hanya bertahan di jejak audit.

Urutan kerja untuk `doc-012` (bawaan *Rejected* dengan alasan yang ditulis tangan), sebagaimana akan dihasilkan oleh penguji administrasi pemasok dan penguji kepatuhan yang bertindak sebagai pengguna contoh (dari kursi yang tidak menyebut siapa pun, T+1 dan T+2 ditolak oleh `supplierdoc_actor_named` dan barisnya tidak berpindah):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | Rejected → Under Review | supplier · back_office (`supplier:sup-007`) | **Nyatakan ulang** → skema Halal (MUI, warisan), nomor, diterbitkan oleh, tanggal terbit, mencakup "PK-PETB-8801 and PK-PETB-8810 grades" → **Catat pernyataan** | `t_supplierdoc_submit` |
| T+1 | Under Review (ditolak) | buyer · compliance (`buyer:all`) | **Tolak** dengan alasan hanya spasi (buatan tangan; tombolnya nonaktif di layar) | `t_supplierdoc_reject`, `outcome: failed`, `POLICY_REJECTED:supplierdoc_refusal_authored` |
| T+2 | Under Review → Valid | buyer · compliance (`buyer:all`) | **Konfirmasi** | `t_supplierdoc_verify`; baris mendapat `verifiedAt` dan `verifiedBy` |
| T+3 | Valid (tidak berubah) | — | pil status berbunyi *Berlaku* — tidak ada masa berlaku yang dinyatakan, sehingga tidak pernah terbaca Expiring | — (diturunkan saat dibaca) |

Untuk separuh permintaan: **Minta dokumen** untuk `sup-002` (PT Sample Specialty Fats), jenis *Pajak & Hukum*, dengan catatan → `t_supplierdoc_request` mencetak id baru dalam *Awaiting Upload* (T+0); administrasi pemasok itu menjawab dengan **Nyatakan** → `t_supplierdoc_submit` (T+1); kepatuhan mengonfirmasi → `t_supplierdoc_verify` (T+2).
<!-- src: src/services/transitions/events.ts:127-129; src/services/data/mock/MockCommandService.ts:1731-1779; src/services/data/mock/fixtures/supplierDocuments.ts:60-102; src/pages-v2/BuyerCompliance.tsx:660-700; src/data/mockSuppliers.ts:90-92 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada tombol **Konfirmasi** / **Tolak**; *Menunggu Kepatuhan* pada baris antrean | notis di slot verba | kursi tidak memegang `supplierdoc:verify` / `supplierdoc:reject` | adopsi kursi yang memegang kepatuhan |
| Tidak ada **Minta dokumen**; *Menunggu Kepatuhan* di kepala halaman | notis di slot kepala halaman | kursi tidak memegang `supplierdoc:request` | sama |
| Kaki panel pemasok menampilkan notis serah-terima alih-alih **Catat pernyataan** | notis di kaki panel | kursi tidak memegang `supplierdoc:upload` (pernyataan baru) atau `supplierdoc:submit` (menjawab slot) | adopsi jalur administrasi pemasok |
| Toast *Pernyataan tidak tercatat* — `MISSING_FIELDS:…` | dispatcher | ada kolom wajib yang kosong (semua kolom selain **Berlaku sampai**) | isi; tombol nonaktif sampai lengkap |
| Toast *Tidak tercatat* — "rejectionReason is blank…" | `POLICY_REJECTED:supplierdoc_refusal_authored` | alasan berisi spasi saja | tulis alasannya |
| Toast *Tidak dibuka* — `SCOPE_DENIED` | panel permintaan | id pemasok tidak ditemukan di daftar (payload buatan tangan) | pilih pemasok dari daftar |
| Permintaan dibuka untuk pemasok yang keliru | slot muncul di halaman pemasok lain | pemasok nyata yang keliru dipilih; tidak ada pemeriksaan yang dapat menangkapnya | tidak ada verba tarik; buka permintaan yang benar dan beri tahu pemasok yang keliru lewat saluran biasa (tidak terukur: tidak ada penyelesaian di dalam portal) |
| `ILLEGAL_TRANSITION` pada Nyatakan | dispatcher | baris berstatus *Valid* atau *Under Review* — hanya *Awaiting Upload* dan *Rejected* yang menerima pernyataan | tidak perlu apa-apa |
| `ILLEGAL_TRANSITION` pada Konfirmasi / Tolak | dispatcher | baris tidak berstatus *Under Review* | tidak perlu apa-apa |
| Toast kegagalan pada **Konfirmasi**, **Catat penolakan** atau **Buka permintaan**: *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* | `POLICY_REJECTED:supplierdoc_actor_named` (`SUPPLIERDOC_ACTOR_UNATTRIBUTED`); baris di kepala antrean tinjauan atau pada langkah konfirmasi sudah menyatakannya | kursi tidak menyebut siapa pun — belum ada pengguna contoh yang dipilih di panel identitas | pilih pengguna contoh di panel identitas, lalu ulangi tindakannya; tidak ada yang disimpan dan status tidak berpindah |
| Dokumen *Valid* tidak ada di **Sertifikat yang dikonfirmasi** | daftar di bawah antrean tinjauan | dokumen itu bawaan *Valid*, bukan dikonfirmasi melalui verba, sehingga tidak membawa `verifiedAt` / `verifiedBy` | wajar; tidak ada yang dikarang untuknya |
| Kursi pemasok tidak dapat melihat atau bertindak pada sebuah baris | `SCOPE_DENIED` / baris tidak ada | baris milik pemasok lain | wajar |
| Blok ditolak masih tampil setelah menyatakan ulang | seharusnya tidak — ia digerbang oleh status | bila terjadi, statusnya tidak berubah (dispatch gagal) | baca toast-nya |
| *Baris contoh bawaan — tidak membawa rincian yang dinyatakan* di antrean | antrean tinjauan pembeli | `doc-010` / `doc-011` masuk tinjauan sebelum pernyataan ada | konfirmasi atau tolak berdasarkan kolom lain pada baris; wajar |
| **Lihat** berbunyi *Unduhan belum tersedia* | baris pemasok | tidak ada berkas yang pernah disimpan | wajar |
| **Perbarui** membuka panduan, bukan formulir | baris pemasok | tidak ada verba pembaruan; panduannya berupa petunjuk | nyatakan sertifikat yang diperbarui sebagai pernyataan baru |
| Status berbunyi *Akan Kedaluwarsa* / *Kedaluwarsa* padahal status tersimpan *Valid* | pil dihitung saat dibaca | tanggal kedaluwarsa dalam 180 hari / sudah lewat, pada titik waktu yang dinyatakan (31 Agu 2026) | wajar; `doc-001` dan `doc-202` terhitung *akan kedaluwarsa* pada titik waktu itu |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:CMP`, atau `MODULE_INACTIVE:CMP.buyerRequests` bila hanya *Permintaan pembeli* yang dinonaktifkan, atau `MODULE_INACTIVE:CMP.supplierUploads` bila hanya *Unggahan pemasok* yang dinonaktifkan; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Kepatuhan & dokumen"* | modul Kepatuhan & dokumen (atau salah satu bagiannya) dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |
<!-- src: src/services/transitions/policies.ts:531-545; src/services/transitions/refusals.ts:61-114; src/pages-v2/SupplierDocuments.tsx:276-290,396-425,721-770; src/pages-v2/BuyerCompliance.tsx:186-300,610-700; src/services/data/mock/MockCommandService.ts:1800-1811; src/services/data/mock/fixtures/supplierDocuments.ts:1-13; src/lib/i18n/supplierDocuments.ts:115-123 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Awaiting Upload | `doc-006` | — | slot COA untuk `sup-007`, penerbit dinyatakan, tanpa berkas (`—`); jawab dengan **Nyatakan** |
| Under Review | `doc-010`, `doc-011` | — | baris halal `sup-007` yang dibawa masuk tinjauan sebelum pernyataan ada — antrean menampilkan *Baris contoh bawaan*; konfirmasi atau tolak |
| Valid | `doc-001`, `doc-002`, `doc-003` | — | 12 baris valid dalam paket fakta lintas `sup-007`, `sup-002`, `sup-005`. `doc-001` (halal MUI, masa berlaku dinyatakan) terhitung *Expiring* pada titik waktu yang dinyatakan, begitu pula `doc-202`; baris dengan `expiryDate: null` tidak pernah kedaluwarsa. Semua tanggal digeser ke titik waktu yang dinyatakan oleh jangkar keluarga. Tidak ada baris bawaan yang membawa `verifiedAt` / `verifiedBy`, sehingga tidak ada yang tampil di **Sertifikat yang dikonfirmasi** — konfirmasikan `doc-010` atau `doc-011` sebagai pengguna contoh untuk melihat baris di sana. |
| Rejected | `doc-012` | — | satu-satunya penolakan bawaan (lampiran cakupan tidak mencakup `PK-PETB-8810`), aktor `UNATTRIBUTED`; baris untuk menguji **Nyatakan ulang** |
<!-- src: src/services/data/mock/fixtures/supplierDocuments.ts:30-127; src/services/data/fixturePresent.ts:198,351-356 -->
