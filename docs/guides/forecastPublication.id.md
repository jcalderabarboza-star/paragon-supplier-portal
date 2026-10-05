---
entity: forecastPublication
locale: id
title: Publikasi prakiraan
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_publication_open
  - t_publication_allocate
  - t_publication_approve_firm
  - t_publication_publish
  - t_publication_supersede
  - t_publication_withdraw
---

<!-- section:summary -->
## 1 · Apa proses ini

Publikasi prakiraan adalah rencana yang diminta untuk dijawab pemasok: material apa, pada periode apa, dan berapa yang diharapkan dari tiap pemasok — versi yang menjadi acuan setiap konfirmasi. SOMO memberi Paragon total per material per periode; portal membagi total itu ke pemasok, dan setiap baris yang dihasilkan (satu pemasok × satu material × satu periode) membawa kelas komitmen — **Firm** pada periode pertama horizon (periode terkunci), **Semi-firm** sesudahnya. Requirement response pemasok terikat pada publikasi dan versi rencana persis yang dijawabnya; itulah sebabnya rencana yang sudah dikirim tidak pernah diubah: revisi adalah publikasi baru yang menggantikan yang lama.

Dua jalur pembeli menyentuhnya, dan pemisahan di antara keduanya disengaja. Perencana (jalur `planning`) membuka draf dari sebuah versi rencana SOMO, membagi total ke pemasok di grid perencanaan, lalu menerbitkannya. Pengadaan (jalur `procurement`) menandatangani setiap pembagian Firm sebelum dapat dikirim, karena baris Firm adalah dasar pemasok menyiapkan stok — perencana membagi, orang lain yang menandatangani. Penerbitan memensiunkan publikasi sebelumnya dengan satuan waktu yang sama secara otomatis (kaskade yang tidak ditekan siapa pun). Pemasok tidak pernah bertindak atas publikasi; mereka membaca baris milik mereka sendiri di `/supplier/forecasts` dan menjawabnya (lihat panduan requirement response). Kursi pembeli bawaan memegang kedua jalur, sehingga di demo satu kursi dapat membagi dan menandatangani; dua jalur membuat penyempitan menjadi mungkin, bukan memaksakannya.

Publikasi dimulai sebagai **Draft**, memuat total SOMO dan — kecuali perencana memilih memulai dari pembagian publikasi saat ini — tanpa baris pemasok. **Published** adalah rencana yang dijawab pemasok. **Superseded** (digantikan oleh publikasi berikutnya) dan **Withdrawn** (ditarik kembali beserta alasannya) sama-sama status akhir; keduanya tidak dibuka kembali, dan rencana berikutnya adalah draf baru. Tidak ada verba yang membuang draf. **Satu rencana berlaku per grain:** rencana bahan baku bulanan dan rencana kemasan mingguan berdiri berdampingan, dan menerbitkan pada satu grain hanya menggantikan rencana sebelumnya dari grain itu — rencana grain lain, barisnya, dan respons terbukanya tetap di tempatnya, di `/buyer/collaboration` dan di halaman setiap pemasok. Rencana yang ditarik tidak mengembalikan apa pun: grain-nya tidak punya rencana berlaku sampai penerbitan berikutnya.

Penanda kejujuran. Setiap versi rencana yang ditawarkan bersifat SIMULATED: publikasi seed dan fixture SOMO yang dibangkitkan adalah data sampel, sehingga grid perencanaan membawa **Rencana SOMO sampel — simulasi** dan pil liveness berbunyi *Sampel — menunggu feed data C8 SOMO*. Publikasi SIMULATED tidak pernah ditampilkan kepada pemasok live; halaman pemasok menampilkan set sampel hanya di bawah **Prakiraan sampel — belum ada publikasi live**. Keenam verba milik tulang punggung perintah portal sendiri — tidak ada yang dimiliki S/4HANA, TMS, atau bank. Publikasi disimpan di penyimpanan dalam memori: memuat ulang halaman mengisi ulang seed-nya, sehingga draf yang dibuka dalam satu sesi hilang setelah dimuat ulang. Stempel waktu berasal dari satu jam simulasi bersama ("hari ini" aplikasi adalah 31 Agu 2026, 12:00 UTC), bukan jam dinding. Penarikan sudah dimodelkan dan tersambung, tetapi tidak ada layar yang menawarkannya.

<!-- src: src/lib/i18n/processFlowPurpose.ts:613-627; src/services/transitions/flows/forecastPublication.flow.ts:1-65; src/services/transitions/businessRoles.ts:156-162; src/services/transitions/businessRoles.ts:381-386; src/services/transitions/businessRoles.ts:747-758; src/services/sdc/publication.ts:40-42; src/services/data/mock/stores/forecastPublicationStore.ts:1-20; src/services/data/mock/MockCollaborationService.ts:126-155; src/services/liveness/registry.ts:340-347; src/lib/i18n/planGrid.ts:429-430; src/lib/i18n/sdcSupplier.ts:404; src/lib/i18n/widget.ts:211; src/services/sdc/clock.ts:55 -->

<!-- section:lifecycle -->
## 2 · Jalan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Draft | tindakan operator (pembuatan) | pembeli · planning | `t_publication_open` |
| 2 | Draft → Draft (status sama) | tindakan operator, mempertahankan status, dapat diulang | pembeli · planning | `t_publication_allocate` |
| 3 | Draft → Draft (status sama) | tindakan operator, mempertahankan status, satu per baris Firm | pembeli · procurement | `t_publication_approve_firm` |
| 4 | Draft → Published | tindakan operator | pembeli · planning | `t_publication_publish` |
| 5 | Published → Superseded | kaskade (dipicu penerbitan berikutnya pada satuan waktu yang sama) | otomasi | `t_publication_supersede` |
| 6 | Published → Withdrawn | tidak aktif (tanpa pemanggil) | pembeli · planning | `t_publication_withdraw` |

**Percabangan**

- **Di Draft:** `t_publication_allocate` — perencana — sesering yang diperlukan selama membagi; `t_publication_approve_firm` — pengadaan — sekali per baris Firm, setelah pembagiannya final; `t_publication_publish` — perencana — satu-satunya jalan keluar, hanya bila setiap baris Firm sudah ditandatangani.
- **Di Published:** `t_publication_supersede` — otomasi — bila publikasi yang lebih baru dengan satuan waktu yang sama diterbitkan; `t_publication_withdraw` — perencana — bila rencana yang sudah dikirim harus ditarik kembali (belum ada layar yang menawarkannya).

<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:37-170; src/services/transitions/cascades.ts:82-85 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_publication_open — Buka draf <!-- transition:t_publication_open -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** pembeli · planning (perencana)
- **Dari → ke:** ∅ → Draft
- **Operator — di mana:** `/buyer/plan-grid` → tab **Bahan baku** (satuan waktu bulanan) atau **Kemasan** (satuan waktu mingguan) → panel **Publikasi prakiraan** → pilih **Versi rencana** → bila perlu centang **Mulai dari pembagian {id} (tanda tangan tidak ikut terbawa)** → **Buka draf**
- **Operator — lakukan:** Mulai rencana berikutnya dari sebuah versi rencana SOMO. Draf memuat total SOMO untuk setiap material pada setiap periode horizon; bila dicentang, draf juga menyalin pembagian publikasi saat ini sebagai titik awal, sehingga Anda hanya membagi ulang yang berubah.
- **Operator — isi:** versi rencana (daftar menawarkan setiap versi SOMO yang punya horizon pada satuan waktu ini, ditampilkan sebagai *versi · periode pertama–terakhir*; versi publikasi saat ini terpilih lebih dulu). Satuan waktu, horizon, dan emisi SOMO diambil dari versi yang dipilih, tidak pernah diketik. Kotak centang pembagian hanya muncul selama ada publikasi Published pada satuan waktu ini.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** panel beralih ke draf: *Draf* {id} (dibuat oleh penyimpanan dengan pola `PUB-<grain>-<planVersion>-r<n>`, mis. `PUB-month-PV-2026-08.2-r2` bila dibuka dari `PV-2026-08.2`), *Versi rencana*, *Satuan waktu · horizon* (*Bulanan* / *Mingguan*), *Batas tanggapan* *{date} jika diterbitkan sekarang*, baris cakupan *{n} periode-material teralokasi · {n} belum teralokasi · {n} baris pemasok* dan, bila dibawa, *pembagian dibawa dari {id}*. **Riwayat publikasi** mendapat baris **Dibuka** dengan peran *Perencanaan* dan orangnya (atau *Tidak ada orang yang disebut*). Tidak ada yang berubah di `/supplier/forecasts` — draf tidak pernah ditampilkan kepada pemasok.
- **Penguji — peristiwa pemicu:** `t_publication_open`
- **Pemeriksaan yang dapat menolak:** `pub_horizon_one_grain` — horizon harus terbaca sebagai satu satuan waktu dan cocok dengan satuan waktu yang dinyatakan; `pub_planversion_known` — SOMO harus telah menerbitkan versi rencana itu, dalam emisi yang disebut; `pub_carry_from_current` — sumber pembagian yang dibawa harus publikasi Published saat ini dengan satuan waktu yang sama, bukan yang lain; `pub_one_open_draft` — tidak boleh ada draf lain yang terbuka pada satuan waktu itu (terbitkan draf itu, atau biarkan, sebelum membuka yang lain).
- **Glosarium:** `POLICY_REJECTED`; `MISSING_FIELDS`; `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Setiap versi rencana yang ditawarkan bersifat SIMULATED, dan draf mewarisi asal tersebut. Baris yang dibawa mempertahankan kelasnya tetapi kehilangan tanda tangannya dan diberi dasar *carried-forward*; periode-material yang pembagian bawaannya akan melebihi total baru tidak dibawa sama sekali dan dimulai tanpa alokasi. Kursi tanpa jalur planning melihat *Menunggu Perencanaan* di tempat kontrol itu.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:67-87; src/services/data/mock/publicationTarget.ts:82-113; src/services/data/mock/publicationTarget.ts:209-234; src/services/data/mock/publicationTarget.ts:373-395; src/services/data/mock/publicationFeed.ts:42-91; src/services/sdc/publication.ts:47-49; src/services/sdc/publication.ts:90-130; src/pages-v2/plan-grid/PublicationPanel.tsx:66-109; src/pages-v2/plan-grid/PublicationPanel.tsx:162-199; src/pages-v2/plan-grid/PublicationPanel.tsx:239-269; src/pages-v2/PlanGrid.tsx:357-369; src/services/planning/views.ts:70-89; src/lib/i18n/planGrid.ts:491-506; src/services/query/commandHooks.ts:2043-2056 -->

### t_publication_allocate — Alokasikan bagian pemasok <!-- transition:t_publication_allocate -->

- **Jenis langkah:** tindakan operator (mempertahankan status — draf tetap Draft)
- **Peran:** pembeli · planning (perencana)
- **Dari → ke:** Draft → Draft (status sama)
- **Operator — di mana:** `/buyer/plan-grid` → tab **Bahan baku** atau **Kemasan** (dengan draf terbuka untuk satuan waktu itu) → baris **Alokasi** milik pemasok di bawah material → pilih sel periode, tekan Enter lalu ketik (atau tempel) → panel perubahan terencana → **Kirim**, **Kirim pilihan ({n})** atau **Kirim semua ({n})**
- **Operator — lakukan:** Beri satu pemasok bagiannya dari total sebuah material untuk satu periode. Perubahan disimpan di halaman sebagai perubahan terencana sampai Anda mengirimnya; nilai nol mengeluarkan pemasok itu dari baris.
- **Operator — isi:** jumlah, angka saja (mis. `12000`). Tidak diminta alasan: pembagian adalah tindakan perencana sendiri, tanpa angka produsen yang ditinggalkan. Pemasok, material, dan periode berasal dari sel; dasarnya dicatat sebagai *planner-split*.
- **Penguji — status yang diharapkan:** Draft (tidak berubah)
- **Penguji — konfirmasi:** sel menampilkan nilai terencana dengan penanda *Direncanakan* (*Renc*) sampai dikirim; setelah pengiriman berhasil, entri hilang dari panel perubahan terencana dan sel membaca nilai draf. Di panel publikasi, baris cakupan dan *Baris tetap menunggu tanda tangan: {n}* dihitung ulang. **Riwayat publikasi** tidak mendapat baris — alokasi bukan tindakan buku besar.
- **Penguji — peristiwa pemicu:** `t_publication_allocate`
- **Pemeriksaan yang dapat menolak:** di sel, sebelum apa pun dikirim — *tidak ada draf terbuka untuk angka ini — buka draf di panel publikasi untuk membaginya*, *melebihi total SOMO — pemasok akan memegang {sum} dari {total}*, dan penolakan kuantitas (kosong, bukan angka, ambigu). Saat dikirim: `pub_material_known` — material harus ada di master perencanaan; `pub_basis_known` — dasar harus planner-split, quota, atau award-history (carried-forward hanya dibuat oleh pembagian yang dibawa); `pub_line_in_horizon` — periode harus ada di horizon draf dan SOMO harus memberi total untuknya; `pub_supplier_collaborated` — pemasok harus sudah bekerja sama dengan Paragon untuk material itu (hubungan, baris di publikasi sebelumnya, atau sumber pasokan fixture yang dibangkitkan) — pasangan baru tidak dibuka dari rencana; `pub_qty_floor` — bilangan terhingga ≥ 0; `pub_qty_agrees` — teks yang diketik harus terbaca ulang sebagai angka yang sama; `pub_alloc_within_total` — semua pemasok bersama-sama tidak boleh melebihi total SOMO.
- **Glosarium:** `POLICY_REJECTED`; `EMPTY_QTY`; `NOT_NUMERIC`; `AMBIGUOUS_QTY`; `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Membagi ulang baris yang sudah ditandatangani menghapus tanda tangannya — persetujuan diberikan untuk jumlah yang lama — jadi bagi dulu dan tandatangani terakhir. Perubahan terencana hanya ada di halaman ini: memuat ulang menghapus setiap perubahan yang belum dikirim. Kursi tanpa jalur planning melihat *Menunggu Perencanaan* di panel perubahan terencana, bukan tombol kirim.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:88-108; src/services/data/mock/publicationTarget.ts:53-68; src/services/data/mock/publicationTarget.ts:149-179; src/services/data/mock/publicationTarget.ts:236-302; src/services/data/mock/publicationTarget.ts:352-362; src/services/data/mock/publicationFeed.ts:93-128; src/services/planning/measures.ts:128-147; src/pages-v2/plan-grid/planDraft.ts:24-38; src/pages-v2/plan-grid/planDraft.ts:130-190; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:59-123; src/services/query/commandHooks.ts:1979-2017; src/lib/i18n/planGrid.ts:382; src/lib/i18n/planGrid.ts:444; src/lib/i18n/planGrid.ts:453-470; src/lib/i18n/planGrid.ts:486-490 -->

### t_publication_approve_firm — Tandatangani baris tetap <!-- transition:t_publication_approve_firm -->

- **Jenis langkah:** tindakan operator (mempertahankan status — draf tetap Draft)
- **Peran:** pembeli · procurement (bukan planning — tanda tangan adalah otoritas kedua)
- **Dari → ke:** Draft → Draft (status sama)
- **Operator — di mana:** `/buyer/plan-grid` → tab **Bahan baku** atau **Kemasan** → panel **Publikasi prakiraan** → baris *Baris tetap menunggu tanda tangan: {n}* → **Tandatangani baris tetap ({n})**
- **Operator — lakukan:** Bubuhkan nama seseorang pada setiap pembagian Firm di draf. Satu tekan menandatangani setiap baris Firm yang belum ditandatangani, satu tanda tangan per baris.
- **Operator — isi:** tidak ada yang perlu diisi — tetapi seseorang harus disebut dalam sesi terlebih dahulu: pilih satu orang di panel identitas (avatar). Tanda tangan adalah orang dalam sesi, ditulis oleh portal, tidak pernah kolom yang Anda ketik.
- **Penguji — status yang diharapkan:** Draft (tidak berubah)
- **Penguji — konfirmasi:** *Baris tetap menunggu tanda tangan* turun ke 0 dan tombol terbaca **Tandatangani baris tetap (0)**, nonaktif; penghalang terbit *Belum bisa: {n} baris tetap menunggu tanda tangan pengadaan — …* hilang. Setiap baris yang ditandatangani kini membawa id orang penanda tangan dan waktunya; **Riwayat publikasi** tidak mendapat baris.
- **Penguji — peristiwa pemicu:** `t_publication_approve_firm`
- **Pemeriksaan yang dapat menolak:** `pub_line_is_firm` — alokasi harus ada dan Firm (hanya pembagian Firm yang ditandatangani); `pub_actor_attributed` — seseorang harus disebut dalam sesi (orang contoh diterima dan ditandai sebagai contoh). Panel menjaga tombol tetap nonaktif, dengan *Pembagian tetap ditandatangani oleh seseorang — pilih satu orang di panel identitas terlebih dahulu (orang contoh ditandai sebagai contoh).*, selama belum ada orang yang disebut.
- **Glosarium:** `POLICY_REJECTED`; `NO_PERSON_IN_SESSION`; `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Baris ditandatangani satu pengiriman per baris, dikelompokkan di bawah id korelasi yang pertama; penolakan menghentikan rangkaian pada baris itu. Di demo, penanda tangan adalah orang SAMPEL dan diberi label demikian di mana pun ditampilkan. Kursi pembeli bawaan memegang procurement sekaligus planning, sehingga kursi yang sama dapat membagi dan menandatangani; kursi tanpa procurement melihat *Menunggu Pengadaan* di tempat tombol (hanya ditampilkan selama masih ada baris Firm yang belum ditandatangani).
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:109-122; src/services/transitions/businessRoles.ts:156-162; src/services/data/mock/publicationTarget.ts:181-196; src/services/data/mock/publicationTarget.ts:304-326; src/services/sdc/publication.ts:62-64; src/pages-v2/plan-grid/PublicationPanel.tsx:111-128; src/pages-v2/plan-grid/PublicationPanel.tsx:271-294; src/lib/i18n/planGrid.ts:507-512; src/services/query/commandHooks.ts:2057-2063; src/lib/glossary/governance.glossary.ts:96-99 -->

### t_publication_publish — Terbitkan <!-- transition:t_publication_publish -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · planning (perencana)
- **Dari → ke:** Draft → Published
- **Operator — di mana:** `/buyer/plan-grid` → tab **Bahan baku** atau **Kemasan** → panel **Publikasi prakiraan** → **Terbitkan**
- **Operator — lakukan:** Kirim rencana kepada pemasok. Penerbitan mencap waktu terbit dan tanggal jawaban pemasok jatuh tempo, dan memensiunkan rencana yang digantikannya pada saat yang sama.
- **Operator — isi:** tidak ada yang perlu diisi. Tombol tetap nonaktif, dengan alasannya tercantum di sampingnya, sampai draf dapat lolos setiap pemeriksaan.
- **Penguji — status yang diharapkan:** Published (dan publikasi Published sebelumnya dengan satuan waktu yang sama → Superseded)
- **Penguji — konfirmasi:** panel kembali ke *Belum ada draf terbuka untuk satuan waktu ini…* dan kepalanya terbaca *Terbit saat ini: {id} ({version}) · tanggapan jatuh tempo {date}* — tanggal jam bersama + 7 hari (07 Sep 2026 di build ini). **Riwayat publikasi** mendapat **Diterbitkan** (peran *Perencanaan*) dan, untuk publikasi yang digantikan, **Digantikan** (peran *Platform (oleh publikasi berikutnya)*). Di `/supplier/forecasts` (mode sampel) rencana baru menjadi yang ditampilkan: spanduk versi terbaca *Rencana {version} terbit {date} — {n} baris berubah, {n} terbawa*, setiap kartu baris membawa *Terbawa — tidak perlu konfirmasi ulang*, *Berubah — sebelumnya {qty} {uom}* atau *Berubah — baru di rencana ini*, dan label tab **Baris terbit** serta kolom *Tanggapi sebelum* menampilkan batas waktu. `/buyer/collaboration` mengonsolidasikan terhadap publikasi baru.
- **Penguji — peristiwa pemicu:** `t_publication_publish`
- **Pemeriksaan yang dapat menolak:** `pub_has_lines` — draf harus mengalokasikan sesuatu ke pemasok tertentu; `pub_firm_lines_approved` — setiap baris Firm harus membawa tanda tangannya; `pub_class_projection_present` — setiap baris harus membawa kelas komitmen. Panel mencantumkan ketiganya sebagai baris *Belum bisa: …* (predikat yang sama dengan pemeriksaan), sehingga penolakan setelah menekan seharusnya tidak terjadi dari layar.
- **Glosarium:** `POLICY_REJECTED`; `ILLEGAL_TRANSITION`; `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Rencana yang diterbitkan tetap SIMULATED, sehingga pemasok live tetap tidak melihat publikasi; halaman pemasok menampilkannya hanya di dalam spanduk sampel. Selisih batas waktu (7 hari) adalah konstanta yang sama dengan daftar kejar, belum menjadi pengaturan yang diatur. Kursi tanpa jalur planning melihat *Menunggu Perencanaan* di tempat tombol.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:123-139; src/services/data/mock/publicationTarget.ts:118-127; src/services/data/mock/publicationTarget.ts:328-371; src/services/sdc/publication.ts:10-20; src/services/sdc/publication.ts:51-88; src/services/sdc/consolidation.ts:46; src/pages-v2/plan-grid/PublicationPanel.tsx:130-160; src/pages-v2/plan-grid/PublicationPanel.tsx:296-315; src/lib/i18n/planGrid.ts:492-493; src/lib/i18n/planGrid.ts:510-513; src/pages-v2/SupplierForecasts.tsx:336-357; src/pages-v2/SupplierForecasts.tsx:436-461; src/pages-v2/SupplierForecasts.tsx:1793-1859; src/lib/i18n/sdcSupplier.ts:409-423; src/services/data/mock/MockCollaborationService.ts:143-155; src/services/query/commandHooks.ts:2064-2075 -->

### t_publication_supersede — Digantikan oleh publikasi berikutnya <!-- transition:t_publication_supersede -->

- **Jenis langkah:** kaskade (dipicu oleh `t_publication_publish`)
- **Peran:** otomasi
- **Dari → ke:** Published → Superseded
- **Operator — di mana:** tidak ada yang menekan ini di portal — langkah ini berjalan ketika publikasi yang lebih baru dengan satuan waktu yang sama diterbitkan.
- **Operator — lakukan:** Tidak ada. Rencana lama ditandai sebagai sudah diganti, agar pemasok menjawab rencana yang berlaku sementara jawaban terhadap rencana lama tetap terbaca terhadap apa yang mereka jawab.
- **Operator — isi:** tidak ada yang perlu diisi.
- **Penguji — status yang diharapkan:** Superseded (pada publikasi Published sebelumnya dengan satuan waktu itu)
- **Penguji — konfirmasi:** di **Riwayat publikasi** (di `/buyer/plan-grid` dan di `/buyer/collaboration`) muncul baris **Digantikan** untuk publikasi lama dengan peran *Platform (oleh publikasi berikutnya)* dan tanda pisah untuk orangnya; catatan itu membawa id publikasi yang menggantikannya. Publikasi pertama pada suatu satuan waktu tidak menggantikan apa pun.
- **Penguji — peristiwa pemicu:** `t_publication_supersede`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib — kaskade hanya menyasar catatan yang telah dipastikan Published dan bersatuan waktu sama.
- **Glosarium:** `ILLEGAL_TRANSITION`.
- **Kejujuran:** Tindakan mesin: tidak ada orang yang dicatat dan atomnya bukan milik jalur yang dapat ditugaskan. Peristiwanya membawa id korelasi penerbitan sebagai id kausasi, sehingga keduanya dapat dibaca bersama. Publikasi yang digantikan tetap ada dalam apa yang dibaca pemasok dan konsolidasi — jawaban sebelumnya tetap menunjuk kepadanya.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:140-156; src/services/transitions/cascades.ts:82-85; src/services/data/mock/MockCommandService.ts:2806-2822; src/services/data/mock/publicationTarget.ts:128-138; src/services/data/mock/publicationTarget.ts:200-202; src/services/transitions/businessRoles.ts:650-653; src/services/transitions/dispatcher.ts:838-907; src/pages-v2/plan-grid/PublicationLedger.tsx:26-30; src/pages-v2/plan-grid/PublicationLedger.tsx:99-109; src/lib/i18n/planGrid.ts:524-526; src/services/data/mock/stores/forecastPublicationStore.ts:99-102 -->

### t_publication_withdraw — Tarik publikasi <!-- transition:t_publication_withdraw -->

- **Jenis langkah:** tidak aktif (tanpa pemanggil) — verba tersambung dan dapat dikirim, tetapi tidak ada layar yang menawarkannya
- **Peran:** pembeli · planning (izin yang sama dengan menerbitkan)
- **Dari → ke:** Published → Withdrawn
- **Operator — di mana:** belum ditawarkan di mana pun.
- **Operator — lakukan:** (Bila ada layar yang menawarkannya) tarik kembali rencana yang sudah dikirim dan jelaskan alasannya, agar tidak ada pemasok yang menjawab rencana yang tidak berlaku lagi.
- **Operator — isi:** alasan dalam kata-kata — wajib.
- **Penguji — status yang diharapkan:** Withdrawn
- **Penguji — konfirmasi:** hanya melalui pengiriman langsung: catatan berpindah ke Withdrawn dengan alasan tersimpan, **Riwayat publikasi** menampilkan **Ditarik — "{alasan}"** dengan peran *Perencanaan*, dan publikasi keluar dari apa yang dibaca pemasok dan konsolidasi.
- **Penguji — peristiwa pemicu:** `t_publication_withdraw`
- **Pemeriksaan yang dapat menolak:** `pub_text_authored` — alasan harus berupa teks minimal tiga karakter setelah dipangkas, bukan spasi kosong.
- **Glosarium:** `POLICY_REJECTED`; `MISSING_FIELDS`; `ILLEGAL_TRANSITION`.
- **Kejujuran:** Tabel riwayat dan labelnya sudah ada untuk tindakan ini, tetapi tidak ada halaman yang mengirimnya — perencana belum dapat menarik rencana dari portal.
<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:157-168; src/services/data/mock/publicationTarget.ts:139-147; src/services/data/mock/publicationTarget.ts:344-348; src/services/data/mock/stores/forecastPublicationStore.ts:13-16; src/services/data/mock/stores/forecastPublicationStore.ts:99-102; src/services/query/commandHooks.ts:2019-2075; src/pages-v2/plan-grid/PublicationLedger.tsx:92-95; src/lib/i18n/planGrid.ts:525 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Mulai kosong atau mulai dari pembagian saat ini (saat membuka).** Cabang A — `t_publication_open` dengan kotak pembagian dicentang — **Kapan:** ada publikasi Published pada satuan waktu itu dan sebagian besar pembagiannya masih berlaku; baris disalin tanpa tanda tangan dan ditandai *carried-forward*. Cabang B — `t_publication_open` tanpa centang (atau tanpa publikasi saat ini) — **Kapan:** rencana harus dibagi dari awal; draf dimulai tanpa baris.
- **Bagi, tandatangani, lalu terbitkan (di dalam Draft).** `t_publication_allocate` — **Kapan:** bagian seorang pemasok harus ditetapkan atau diubah; mengubah baris Firm yang sudah ditandatangani menghapus tanda tangannya. `t_publication_approve_firm` — **Kapan:** setiap pembagian Firm sudah final; pengadaan menandatangani. `t_publication_publish` — **Kapan:** panel tidak mencantumkan alasan *Belum bisa* apa pun.
- **Ganti atau tarik kembali (di Published).** Cabang A — draf baru diterbitkan di atasnya, yang memicu `t_publication_supersede` — **Kapan:** rencana berubah dan pemasok harus menjawab versi baru; jawaban yang tidak bergeser dibawa maju. Cabang B — `t_publication_withdraw` — **Kapan:** rencana sama sekali tidak boleh dijawab; belum ditawarkan oleh layar mana pun.
- **Draf yang tidak lagi diinginkan.** Tidak ada transisi yang menghapus atau membuang draf, dan draf kedua dengan satuan waktu yang sama ditolak selama satu draf masih terbuka (`pub_one_open_draft`). Satu-satunya jalan keluar adalah menerbitkannya; di build ini memuat ulang halaman juga menghapusnya, karena penyimpanan mengisi ulang seed-nya.

<!-- src: src/services/transitions/flows/forecastPublication.flow.ts:60-168; src/services/data/mock/publicationTarget.ts:153-179; src/services/data/mock/publicationTarget.ts:373-382; src/services/sdc/publication.ts:90-130; src/services/data/mock/stores/forecastPublicationStore.ts:18-19 -->

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Belum bisa: draf belum mengalokasikan apa pun ke pemasok mana pun / Belum bisa: {n} baris tetap menunggu tanda tangan pengadaan / Belum bisa: {n} baris tidak memiliki kelas komitmen | diturunkan saat dibaca | Draft | pemeriksaan terbit yang bersesuaian akan menolak | panel publikasi `/buyer/plan-grid`, di samping **Terbitkan** |
| Baris tetap menunggu tanda tangan: {n} | diturunkan saat dibaca | Draft | baris Firm tanpa tanda tangan | panel publikasi |
| Pembagian tetap ditandatangani oleh seseorang — pilih satu orang di panel identitas terlebih dahulu | diturunkan saat dibaca | Draft | kursi memegang procurement tetapi tidak menyebut orang | panel publikasi, di samping **Tandatangani baris tetap** |
| Menunggu Perencanaan / Menunggu Pengadaan | serah terima peran | kontrol mana pun | kursi tidak memegang atom verba | di slot kontrol itu sendiri (panel publikasi; panel perubahan terencana untuk pengiriman alokasi) |
| {date} jika diterbitkan sekarang | berbasis waktu, diturunkan saat dibaca | Draft | selalu — jam bersama + 7 hari | panel publikasi, *Batas tanggapan* |
| tidak ada draf terbuka untuk angka ini / melebihi total SOMO | diturunkan saat dibaca (penolakan sel) | Draft (atau tanpa draf) | suntingan sel Alokasi tanpa draf terbuka, atau pembagian di atas total SOMO | sel grid dan panel perubahan terencana |
| Tanggapi sebelum {date} / Terlambat | berbasis waktu, diturunkan saat dibaca | Published | batas waktu yang dicap saat terbit — atau, pada publikasi tanpa cap (seed), tanggal terbit + 7 hari, tanggal yang sama yang dibaca daftar kejar pembeli; **Terlambat** hanya menandai baris yang masih menunggu jawaban setelah tanggal itu lewat | kartu baris `/supplier/forecasts` dan label tab **Baris terbit** (*tanggapi sebelum* / *terlambat sejak* / *semua terjawab*) |
| Terbawa — tidak perlu konfirmasi ulang / Tidak berubah — menunggu konfirmasi (atau tanda terima) Anda / Berubah — sebelumnya {qty} {uom} / Berubah — baru di rencana ini | diturunkan saat dibaca | Published (terhadap publikasi yang digantikannya) | jumlah dan kelas baris sama dengan, berbeda dari, atau tidak ada di publikasi sebelumnya; baris yang tidak berubah terbaca *Terbawa* hanya selama jawaban atasnya masih berlaku menurut aturan pembeli sendiri, selain itu *Tidak berubah — menunggu…* | kartu baris `/supplier/forecasts`; jumlahnya di spanduk versi |
| Catatan contoh — tidak diterbitkan melalui portal | penanda SAMPEL | Published, Superseded (seed) | baris buku besar berasal dari seed, bukan ditulis verba | **Riwayat publikasi** |
| Tidak ada orang yang disebut | diturunkan saat dibaca | baris buku besar oleh jalur seseorang | kursi tidak menyebut orang saat bertindak | **Riwayat publikasi**, *Orang* |
| Rencana SOMO sampel — simulasi / Prakiraan sampel — belum ada publikasi live / Sampel — menunggu feed data C8 SOMO | penanda SIMULATED | seluruh halaman | setiap versi rencana bersifat SIMULATED | spanduk `/buyer/plan-grid`; spanduk `/supplier/forecasts`; pil liveness di keduanya |

<!-- src: src/services/sdc/publication.ts:18-29; src/services/sdc/publication.ts:62-88; src/services/sdc/publication.ts:132-192; src/pages-v2/plan-grid/PublicationPanel.tsx:136-144; src/pages-v2/plan-grid/PublicationPanel.tsx:233-318; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:59-110; src/pages-v2/plan-grid/PublicationLedger.tsx:99-110; src/lib/i18n/planGrid.ts:429; src/lib/i18n/planGrid.ts:486-528; src/lib/i18n/roles.ts:264-268; src/lib/i18n/roles.ts:277-278; src/lib/i18n/sdcSupplier.ts:404-423; src/pages-v2/SupplierForecasts.tsx:336-357; src/pages-v2/SupplierForecasts.tsx:436-447; src/pages-v2/SupplierForecasts.tsx:1793-1859; src/lib/i18n/widget.ts:211 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `PUB-2026-08-RM-R2` (tanpa nomor dokumen terpisah — id publikasi adalah nomornya; versi rencana `PV-2026-08.2`, terbit 2026-08-15, horizon bulanan 2026-08 · 2026-09 · 2026-10, status Published).

| Bergabung ke | Melalui | Catatan |
|---|---|---|
| Versi rencana SOMO `PV-2026-08.2` | `planVersion` + `sourceRef` | catatan seed menyebut versi rencana sebagai sumbernya; draf yang dibuka di portal menyebut emisi SOMO asalnya (`somo-emission@PV-2026-08.2` untuk versi ini) |
| Total periode-material SOMO | `totals` (material \| periode) | enam total di sini, mis. RM-EMUL-3310 pada 2026-08 = 10 000 KG; jumlah baris tidak boleh melebihinya |
| Baris prakiraan (pemasok × material × periode) | `lines[]` — `supplierId` + `materialCode` + `periodBucket` | tujuh baris untuk sup-002, sup-005, dan sup-007; tiga baris 2026-08 berkelas Firm dan membawa persetujuan yang dicap dengan kata peran *planner* bertanggal 2026-07-30; baris 2026-09 Semi-firm; satu baris 2026-10 (AI-NIAC-6601, sup-007) Visibilitas saja |
| Alokasi | `lines[].allocation` — `materialPeriodTotal`, `basis`, `approvedBy`, `approvedAt` | dasar planner-split, quota, atau award-history pada seed; alokasi dari portal menulis planner-split, pembagian yang dibawa menulis carried-forward |
| Publikasi yang digantikan `PUB-2026-08-RM` | `supersededBy` miliknya | `PV-2026-08.1`, terbit 2026-08-01; RM-EMUL-3320 dan PK-PETB-8810 pada 2026-09 bergeser di antara kedua versi (2 000 → 2 600 KG; 120 000 → 150 000 PCS) |
| Requirement response | `publicationId` + `planVersion` pada setiap respons | `rr-0005` (tanggapan visibilitas sup-007) terikat pada publikasi ini; `rr-0001` sampai `rr-0004` terikat pada `PUB-2026-08-RM` dan dibaca terhadap publikasi ini sebagai dibawa maju atau kedaluwarsa |
| Master material / master perencanaan | `materialCode` | satuan baris disalin dari master saat alokasi; kode yang tidak dikenal ditolak |
| Buku besar publikasi | `ledger[]` | hanya baris buka, terbit, digantikan, dan tarik — alokasi dan tanda tangan bukan baris buku besar |
| Batas tanggapan | `responseDueAt` | tidak ada pada kedua seed (tidak pernah diterbitkan melalui verba); kedua kursi lalu membaca tanggal terbit + 7 hari — 22 Agu 2026 untuk `PUB-2026-08-RM-R2` |

Hanya-tampil: `provenance` (`SOMO` · `SIMULATED` · `PLANNED`) dibawa pada publikasi dan setiap baris; `segment` dan `suggestedSource` pada sebagian baris seed adalah anotasi perencanaan SOMO, dan tidak ada verba yang menulisnya.

<!-- src: src/services/sdc/fixtures.ts:36-40; src/services/sdc/fixtures.ts:886-1142; src/services/sdc/fixtures.ts:1149-1265; src/services/sdc/types.ts:240-330; src/services/sdc/types.ts:332-390; src/services/data/mock/stores/forecastPublicationStore.ts:39-71; src/services/data/mock/publicationFeed.ts:42-58; src/services/data/mock/publicationTarget.ts:149-178 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap pengiriman perintah menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` untuk kursi pembeli, `ts` dari jam bersama, `outcome` (done / failed, dengan penolakan sebagai `reason` bila gagal), `correlationId`, dan `subject` = {`entity` `forecastPublication`, `entityId`, `from`, `to`} — untuk alokasi dan tanda tangan, `to` adalah status yang sama. Tindakan pengguna juga membawa `attribution` (orang dalam sesi, bila ada yang disebut); penggantian, sebagai kaskade, membawa `correlationId` penerbitan sebagai `causationId`-nya dan tanpa orang. Menandatangani beberapa baris Firm dalam satu tekan mengelompokkannya dengan cara yang sama: `correlationId` tanda tangan pertama menjadi `causationId` tanda tangan berikutnya.

Publikasi menyimpan buku besarnya sendiri di samping peristiwa: satu baris untuk masing-masing dibuka, diterbitkan, digantikan, dan ditarik, dengan `at`, `seq` yang terus naik (jam bersama dibekukan, sehingga pembukaan, penerbitannya, dan penggantian yang dipicunya dapat berbagi satu waktu — `seq` yang mengurutkannya), `personId` (atau kosong) dan, untuk penarikan, alasannya. Peran tidak disimpan; **Riwayat publikasi** menurunkannya dari jalur yang memegang setiap verba. Baris seed ditandai sebagai seed.

Riwayat seed `PUB-2026-08-RM-R2`: **Diterbitkan** 2026-08-15 (seq 3, seed); `PUB-2026-08-RM` menampilkan **Diterbitkan** 2026-08-01 (seq 1) dan **Digantikan** 2026-08-15 (seq 4). Urutan contoh yang dihasilkan penguji dari titik itu di tab **Bahan baku**:

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Draft (`PUB-month-PV-2026-08.2-r2`) | pembeli · planning | **Buka draf** dari `PV-2026-08.2`, kotak pembagian dicentang (7 baris dibawa, 3 Firm belum ditandatangani) | `t_publication_open` |
| T+1 | Draft → Draft | pembeli · planning | sunting sel **Alokasi**, **Kirim** (opsional) | `t_publication_allocate` |
| T+2 | Draft → Draft (×3) | pembeli · procurement, orang sudah dipilih | **Tandatangani baris tetap (3)** | `t_publication_approve_firm` |
| T+3 | Draft → Published | pembeli · planning | **Terbitkan** (batas waktu dicap) | `t_publication_publish` |
| T+3 | Published → Superseded pada `PUB-2026-08-RM-R2` | otomasi | kaskade, `causationId` = `correlationId` T+3 | `t_publication_supersede` |

<!-- src: src/services/transitions/events.ts:24-124; src/services/transitions/events.ts:126-129; src/services/transitions/dispatcher.ts:838-907; src/services/data/mock/publicationTarget.ts:44-51; src/services/data/mock/stores/forecastPublicationStore.ts:36-76; src/services/sdc/types.ts:337-367; src/pages-v2/plan-grid/PublicationLedger.tsx:43-63; src/pages-v2/plan-grid/PublicationPanel.tsx:111-128 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada **Buka draf** / **Terbitkan**, hanya *Menunggu Perencanaan* | pemberitahuan serah terima di slot kontrol | kursi tidak memegang jalur planning (`publication:draft` / `publication:publish`) | kursi yang memegang planning bertindak (`ROLE_NOT_PERMITTED` bila dipaksakan) |
| Tidak ada **Tandatangani baris tetap**, hanya *Menunggu Pengadaan* | pemberitahuan serah terima di samping *Baris tetap menunggu tanda tangan* | kursi tidak memegang jalur procurement (`publication:approve`) | kursi yang memegang procurement menandatangani |
| **Tandatangani baris tetap** nonaktif dengan *Pembagian tetap ditandatangani oleh seseorang…* | teks peringatan di samping tombol | sesi tidak menyebut orang; `POLICY_REJECTED:pub_actor_attributed` bila dipaksakan | pilih satu orang di panel identitas (avatar), lalu tandatangani |
| **Terbitkan** nonaktif dengan baris *Belum bisa: …* | alasan tercantum di samping tombol | belum ada alokasi, baris Firm belum ditandatangani, atau baris tanpa kelas | alokasikan, minta pengadaan menandatangani, lalu terbitkan |
| *SOMO belum menerbitkan versi rencana pada satuan waktu ini.* | tidak ada daftar versi rencana di panel | tidak ada versi feed dengan horizon pada satuan waktu ini | pindah tab (bulanan / mingguan) |
| `POLICY_REJECTED:pub_one_open_draft` | penolakan di bawah panel yang menyebut draf terbuka | draf satuan waktu ini sudah terbuka (mis. dibuka di tab lain) | terbitkan draf itu; tidak ada verba buang (memuat ulang mengisi ulang seed penyimpanan) |
| `POLICY_REJECTED:pub_carry_from_current` / `pub_planversion_known` / `pub_horizon_one_grain` | penolakan di bawah panel | sumber pembagian bukan publikasi saat ini, atau versi / emisi / horizon tidak cocok dengan feed SOMO | buka ulang dari panel agar kuncinya berasal dari tawaran yang ditampilkan |
| Sel ditolak: *tidak ada draf terbuka untuk angka ini…* | penolakan di sel Alokasi | tidak ada draf terbuka untuk satuan waktu ini | buka draf di panel publikasi terlebih dahulu |
| Sel ditolak: *melebihi total SOMO — pemasok akan memegang {sum} dari {total}* | penolakan di sel; saat dikirim `POLICY_REJECTED:pub_alloc_within_total` | bagian para pemasok akan melebihi total periode-material SOMO | turunkan bagian pemasok ini atau pemasok lain |
| `POLICY_REJECTED:pub_supplier_collaborated` | pengiriman ditolak dengan menyebut pemasok dan material | pemasok tidak punya hubungan dengan material itu dan belum pernah dialokasikan | pasangan baru tidak dibuka dari rencana; bangun hubungannya terlebih dahulu |
| `POLICY_REJECTED:pub_line_in_horizon` / `pub_material_known` / `pub_basis_known` / `pub_qty_floor` / `pub_qty_agrees` | pengiriman ditolak dengan pemeriksaan itu | periode di luar horizon atau tanpa total SOMO, material tidak dikenal, dasar salah, jumlah negatif atau salah baca | sunting dari sel grid; ketik angka saja |
| *Tidak terkirim — perubahan ini tidak tertambat pada draf terbuka.* | baris tetap direncanakan (belum dikirim) dengan alasan ini | draf tempat perubahan dibuat tidak lagi terbuka (sudah terbit atau dimuat ulang) | buka draf baru dan masukkan ulang pembagiannya |
| `POLICY_REJECTED:pub_line_is_firm` | penolakan saat menandatangani | baris tidak ada atau bukan Firm | hanya baris Firm yang ditandatangani; panel menandatangani tepat baris Firm yang belum ditandatangani |
| `ILLEGAL_TRANSITION` | mis. menerbitkan catatan yang sudah bukan Draft | publikasi berpindah sejak layar dirender | muat ulang panel dan bertindak pada draf saat ini |
| `MODULE_INACTIVE` yang menyebut SDC | penolakan di bawah panel, untuk setiap kursi | modul Kolaborasi pemasok dinonaktifkan; `/buyer/plan-grid` milik modul perencanaan, yang dapat tetap aktif | minta modul diaktifkan kembali di `/buyer/platform/modules/admin` |
| `SCOPE_DENIED` | dilempar untuk kursi pemasok | pemasok tidak pernah bertindak atas publikasi; pemeriksaan berjalan sebelum pemeriksaan peran | pemasok membaca dan menjawab di `/supplier/forecasts` |
| `STALE_STATE` | tidak pernah muncul di permukaan ini | panel dan grid tidak mengirim status yang diharapkan | t/a — dicantumkan demi kelengkapan |
| Pemasok masih melihat *Prakiraan sampel — belum ada publikasi live* setelah terbit | spanduk di `/supplier/forecasts` | setiap publikasi bersifat SIMULATED; pemasok live hanya melihat publikasi LIVE | tidak ada di build ini — feed SOMO yang sebenarnya belum tersedia |
| Pemasok melihat *terlambat sejak 22 Agu 2026* pada rencana seed | label tab **Baris terbit** | seed tidak membawa cap, sehingga batas waktunya tanggal terbit + 7 hari — tanggal yang selalu dipakai daftar kejar pembeli; baris yang masih menunggu jawaban terlambat | jawab baris bertanda **Terlambat**; setelah semua baris terjawab tab terbaca *semua terjawab* |
| Draf hilang setelah halaman dimuat ulang | panel menampilkan *Belum ada draf terbuka untuk satuan waktu ini…* | penyimpanan publikasi ada di memori dan mengisi ulang seed saat dimuat ulang | buka ulang draf; kirim dan terbitkan dalam satu sesi |
| Tidak ada cara menarik rencana yang sudah terbit | tidak ada kontrol di halaman mana pun | `t_publication_withdraw` tidak punya pemanggil | belum tersedia di portal |

<!-- src: src/services/transitions/refusals.ts:56-111; src/services/transitions/dispatcher.ts:573-636; src/services/transitions/dispatcher.ts:737; src/services/transitions/dispatcher.ts:777-800; src/services/data/mock/publicationTarget.ts:10-12; src/services/data/mock/publicationTarget.ts:209-395; src/pages-v2/plan-grid/PublicationPanel.tsx:162-216; src/lib/i18n/planGrid.ts:487-495; src/lib/i18n/planGrid.ts:509-513; src/lib/i18n/roles.ts:277-278; src/services/modules/registry.ts:179-198; src/lib/i18n/modules.ts:165; src/services/data/mock/MockCollaborationService.ts:126-155; src/services/data/mock/stores/forecastPublicationStore.ts:18-19 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Draft | — | — | tidak ada fixture; capai dengan **Buka draf** di `/buyer/plan-grid` (tab Bahan baku, `PV-2026-08.2`, pembagian dicentang → `PUB-month-PV-2026-08.2-r2` dengan 7 baris dibawa, 3 Firm belum ditandatangani) |
| Published | `PUB-2026-08-RM-R2` | — | `PV-2026-08.2`, terbit 2026-08-15, horizon 2026-08 / 2026-09 / 2026-10, 7 baris; baris buku besar seed; tanpa batas tanggapan; publikasi bulanan saat ini |
| Superseded | `PUB-2026-08-RM` | — | `PV-2026-08.1`, terbit 2026-08-01, digantikan oleh `PUB-2026-08-RM-R2`; empat respons seed (`rr-0001` sampai `rr-0004`) masih terikat padanya |
| Withdrawn | — | — | tidak ada fixture dan tidak ada layar yang mencapainya; hanya pengiriman langsung `t_publication_withdraw` pada catatan Published |

Konteks untuk penguji: penyimpanan diisi dari dua publikasi fixture — yang terakhir menurut tanggal terbit berstatus Published, yang lebih awal Superseded. Keduanya SIMULATED dan bulanan; tidak ada publikasi mingguan saat seed, sehingga panel di tab **Kemasan** dimulai tanpa publikasi saat ini. Versi rencana yang ditawarkan adalah kedua versi seed dan versi fixture SOMO yang dibangkitkan (`PV-SIM-…`). Baris buku besar draf baru berlanjut dari seq 5. Kursi pembeli demo memegang planning dan procurement; menandatangani juga memerlukan orang yang dipilih di panel identitas.

<!-- src: src/services/data/mock/stores/forecastPublicationStore.ts:39-76; src/services/data/mock/stores/forecastPublicationStore.ts:92-120; src/services/sdc/fixtures.ts:891-1142; src/services/sdc/fixtures.ts:1149-1265; src/services/data/mock/publicationFeed.ts:42-91; src/services/planning/somoFixture.ts:40-41; src/services/transitions/businessRoles.ts:747-758 -->
