---
entity: purchaseRequisition
locale: id
title: Permintaan pembelian
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_pr_create
  - t_pr_submit
  - t_pr_approve
  - t_pr_reject
  - t_pr_revise
  - t_pr_source
  - t_pr_convert
---

<!-- section:summary -->
## 1 · Apa proses ini

Permintaan internal yang memulai segalanya: ada orang di pabrik yang butuh sesuatu dibeli, dan menyampaikannya di tempat yang bisa ditelaah dan dilacak. Permintaan pembelian (PR) adalah dokumen internal sisi pembeli. Pemasok tidak pernah melihatnya — catatan ini tidak punya pemilik pemasok, dan kursi pemasok yang mencoba bertindak padanya ditolak bahkan sebelum perannya diperiksa.

Dua peran menyentuhnya. **Pemohon** (requisitioner) membuat permintaan, mengirimnya untuk persetujuan, dan — jika dikembalikan karena ditolak — merevisinya lalu mengirimnya lagi. **Pengadaan** (procurement) memutuskan: setujui atau tolak, dan penolakan wajib membawa alasan tertulis yang bisa dibaca pemohon. Setelah disetujui, pengadaan boleh mengajukan acara sourcing (RFQ) dari permintaan itu; permintaan kemudian bergerak sendiri sebagai akibat RFQ diajukan, bukan karena tombol pada permintaan. Kursi pembeli bawaan memegang semua jalur pembeli, sehingga sejak awal satu kursi dapat membuat dan menyetujui dokumen yang sama; platform mencatat ini sebagai temuan segregasi yang masih terbuka, bukan berpura-pura sudah ditegakkan.

Prosesnya dimulai di **Draft** (Draf) dan, pada pohon kode sebagaimana dibangun, berakhir di **Approved** (Disetujui) atau **Sourcing Event** (Acara Sourcing). Keadaan **PO Created** (PO Dibuat) adalah akhir yang dideklarasikan, tetapi tidak ada yang bisa mencapainya hari ini: langkah yang akan menutup lingkaran (`t_pr_convert`) ditulis sebagai kaskade tanpa tautan di belakangnya — pesanan pembelian dibuat di S/4HANA dan dimaksudkan tiba di sini sebagai fakta. **Rejected** (Ditolak) sengaja bukan akhir: permintaan yang ditolak kembali ke tangan pemohon dan berputar lagi.

Penanda kejujuran. Data demo bersifat **SIMULASI**: permukaan asupan membawa pil *"Sampel — menunggu produsen PR live (SOMO / Grid)"* dan enam baris fixture adalah sampel yang ditulis tangan; satu baris tambahan (`PR-2026-901`) ditumbuhkan melalui verba sungguhan saat aplikasi dimulai. Tidak ada orang yang masuk sesi, sehingga setiap persetujuan dicatat sebagai *"Tanpa atribusi — tidak ada orang dalam sesi"* dan panel menyatakannya sebelum dan sesudah tindakan. Band *"Diarahkan ke"* pada permintaan ditulis pada dokumen, bukan dihitung dari nilainya, dan panel juga menyatakan itu.

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Draft | pembuatan (tindakan operator; atau kaskade dari `t_intake_commit`) | requisitioner (atau automation, lewat kaskade) | `t_pr_create` |
| 2 | Draft → Pending Approval | tindakan operator | requisitioner | `t_pr_submit` |
| 3a | Pending Approval → Approved | tindakan operator | procurement | `t_pr_approve` |
| 3b | Pending Approval → Rejected | tindakan operator | procurement | `t_pr_reject` |
| 4 | Rejected → Draft | tindakan operator | requisitioner | `t_pr_revise` |
| 5 | Approved → Sourcing Event | kaskade (dipicu `t_rfq_create`) | automation | `t_pr_source` |
| 6 | Approved, Sourcing Event → PO Created | kaskade — belum ditulis, tidak dapat menyala | automation | `t_pr_convert` |

**Percabangan**

- **Di Pending Approval:** `t_pr_approve` — procurement — ketika kebutuhan nyata dan ada dananya; `t_pr_reject` — procurement — ketika keputusannya tidak, disertai alasan tertulis.
- **Di Approved:** `t_pr_source` — automation — ketika pengadaan mengajukan RFQ dari permintaan ini di wizard sourcing; `t_pr_convert` — automation — dideklarasikan untuk kasus sumber pasokan sudah ada dan PO dibuat di S/4HANA, tetapi tidak ada tautan yang memicunya hari ini.
- **Di Rejected:** `t_pr_revise` — requisitioner — satu-satunya jalan keluar; mendarat di Draft, dan `t_pr_submit` yang mengembalikannya ke antrean.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_pr_create — Buat permintaan <!-- transition:t_pr_create -->

- **Jenis langkah:** tindakan operator (pembuatan); juga dipicu sebagai kaskade dari `t_intake_commit`
- **Peran:** buyer · requisitioner; `automation` bila dipicu kaskade komit asupan — verba sumbernya memerlukan atom yang sama, `pr:create`
- **Dari → ke:** ∅ → Draft
- **Operator — di mana:** empat pintu masuk, semuanya menuju verba yang sama.
  1. `/buyer/purchase-requisition` → **PR Baru** (kepala halaman) → formulir tiga langkah *Material & kuantitas* · *Waktu & pusat biaya* · *Justifikasi bisnis* → **Buat permintaan**.
  2. `/buyer/intake-review` → pada baris yang menunggu → **Terima sesuai kiriman**. Kuantitasnya adalah yang dikirim produsen; tidak ada yang lain ditanyakan. Ini mengomit baris asupan (`t_intake_commit`), dan kaskade dari komit itulah yang membuat permintaan — lihat panduan baris asupan.
  3. `/buyer/plan-grid` → pilih baris asupan → laci *Sesuaikan & kirim — baris terpilih* → **Kirim ke PR**. Kuantitas yang diterima adalah satu-satunya kolom yang bisa disunting dan dimulai dari kuantitas yang dikirim produsen; bila Anda mengubahnya, alasan wajib diisi sebelum tombol aktif. Ini juga mengomit baris, dan kaskadenya yang membuat permintaan.
  4. `/buyer/plan-grid` → tab **Bahan baku** atau **Kemasan** → ketik atau tempel jumlah yang diterima di sel → panel perubahan terencana → **Kirim** pada baris, **Kirim pilihan (n)** atau **Kirim semua (n)**. Satu komit per baris, masing-masing berantai menjadi permintaannya sendiri; barisnya adalah usulan contoh yang dihasilkan.
- **Operator — lakukan:** tuliskan apa yang dibutuhkan pabrik agar ada sebagai dokumen. Formulir PR Baru adalah pengarangan baru; tiga pintu asupan mengomit baris kebutuhan terencana, dan komit itu membuat satu permintaan Draft — tidak pernah yang kedua untuk baris yang sama. Pintu mana pun yang dipakai, hasilnya adalah Draft di tangan pemohon — belum ada yang sampai ke penyetuju.
- **Operator — isi:** material dan kuantitas wajib. Kuantitas angka saja, tanpa pemisah ribuan (formulir menolak kolom kosong, bukan angka, dan token ambigu seperti "4.500"). Formulir PR Baru juga meminta tanggal dibutuhkan dan pusat biaya sebelum aktif; prioritas dan justifikasi opsional. Pintu asupan membawa satuan, nilai estimasi dan tanda produsen dari barisnya, id baris (`intakeLineId`) dan bucket perencanaannya (`periodBucket` — tidak pernah tanggal dibutuhkan), serta keputusan perencana bila kuantitasnya diubah. Nilai estimasi hanya ditulis bila disediakan — formulir PR Baru tidak punya kolom itu, sehingga permintaan yang dibuat di sana menampilkan tanda hubung, bukan "Rp 0".
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** baris baru dengan nomor yang ditetapkan store dalam rentang `PR-2026-9xx` muncul di puncak `/buyer/purchase-requisition`; toast berbunyi *"{nomor} dibuat — Disimpan sebagai draf. Ajukan bila sudah siap untuk persetujuan."*; baris asupan berbunyi *"Dikomit → {nomor}"* di Tinjauan Asupan dan *"Terkirim → {nomor}"* di laci grid perencanaan. Tidak ada yang muncul di kursi pemasok mana pun — permintaan pembelian bersifat internal pembeli.
- **Penguji — peristiwa pemicu:** `t_pr_create`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib. Kursi pemasok ditolak pada lingkup (`SCOPE_DENIED`) sebelum gerbang peran.
- **Glosarium:** `MISSING_FIELDS`, `SCOPE_DENIED`, `EMPTY_QTY` / `NOT_NUMERIC` / `AMBIGUOUS_QTY` (penolakan kuantitas).
- **Kejujuran:** baris asupan dan permintaan yang dihasilkan bersifat **SIMULASI** — pil *"Sampel — menunggu produsen PR live (SOMO / Grid)"* ada di Tinjauan Asupan dan grid perencanaan, dan baris yang dikirim tidak pernah menjadi instruksi pengadaan langsung. Mengabaikan baris di Tinjauan Asupan adalah tindakan yang dicatat pada baris asupan (`t_intake_dismiss`) — bertahan setelah muat ulang — dan tidak membuat permintaan.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:34; src/pages-v2/BuyerRequisitions.tsx:611; src/pages-v2/BuyerRequisitions.tsx:372; src/pages-v2/BuyerRequisitions.tsx:1433; src/pages-v2/IntakeReview.tsx:117-127; src/pages-v2/IntakeReview.tsx:323-326; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:435; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:579; src/pages-v2/requisitions/prCreatePayload.ts:656; src/services/data/mock/MockCommandService.ts:755; src/services/data/mock/stores/purchaseRequisitionStore.ts:42; src/lib/i18n/requisitions.ts:256; src/lib/i18n/requisitions.ts:392; src/lib/i18n/intakeReview.ts:83-84; src/lib/i18n/planGrid.ts:77-85; src/services/liveness/registry.ts:281; src/services/transitions/flows/intakeLine.flow.ts:184-197; src/services/transitions/cascades.ts:75-77; src/services/data/mock/MockCommandService.ts:2762-2800; src/services/transitions/businessRoles.ts:619-632; src/pages-v2/plan-grid/planGridModel.ts:182-199; src/pages-v2/requisitions/prCreatePayload.ts:139-147; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:105-123; src/lib/i18n/planGrid.ts:164-165,196-198,424-425,455-457 -->

### t_pr_submit — Ajukan untuk persetujuan <!-- transition:t_pr_submit -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · requisitioner
- **Dari → ke:** Draft → Pending Approval
- **Operator — di mana:** `/buyer/purchase-requisition` → buka baris Draft → kaki panel samping → **Ajukan untuk persetujuan**.
- **Operator — lakukan:** kirim permintaan untuk diputuskan. Sebelum ini terjadi, ia hanyalah catatan satu orang, bukan klaim atas anggaran; bagian *"Draf — belum masuk antrean persetujuan"* pada panel menyatakan belum ada yang menunggunya.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Pending Approval
- **Penguji — konfirmasi:** chip status berbunyi *Menunggu Persetujuan*; toast berbunyi *"{nomor} diajukan untuk persetujuan — Sekarang berada di antrean persetujuan dan menunggu Pengadaan."*; tab *Menunggu* dan KPI menghitungnya. Kursi tanpa `pr:submit` melihat *"Menunggu Pemohon"* di slot itu, bukan tombol.
- **Penguji — peristiwa pemicu:** `t_pr_submit`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** verba ini berbulan-bulan ada tanpa pemanggil; ia dimunculkan dengan sengaja sebagai tindakan pemohon pada dokumen yang sudah ada, bukan sebagai cara kedua untuk membuatnya.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:61; src/pages-v2/BuyerRequisitions.tsx:861; src/pages-v2/BuyerRequisitions.tsx:465; src/services/query/commandHooks.ts:1076; src/lib/i18n/requisitions.ts:318; src/lib/i18n/requisitions.ts:376 -->

### t_pr_approve — Setujui <!-- transition:t_pr_approve -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · procurement
- **Dari → ke:** Pending Approval → Approved
- **Operator — di mana:** `/buyer/purchase-requisition` → buka baris *Menunggu Persetujuan* → kaki panel samping → **Setujui**.
- **Operator — lakukan:** setujui bahwa kebutuhannya nyata dan ada dananya. Tidak ada pengadaan atau pemesanan sebelum ini.
- **Operator — isi:** tidak ada yang diisi. Siapa yang menyetujui diambil dari sesi, tidak pernah diketik.
- **Penguji — status yang diharapkan:** Approved
- **Penguji — konfirmasi:** chip status *Disetujui*; panel mendapat baris *Disetujui oleh* yang hari ini berbunyi *"Tanpa atribusi — tidak ada orang dalam sesi"*; bagian *Disetujui — siap disourcing* muncul dengan **Ajukan acara sourcing**. Toast: *"{nomor} disetujui — Dicatat pada permintaan ini tanpa atribusi."* Kursi pemohon melihat *"Menunggu Pengadaan"* alih-alih tombol.
- **Penguji — peristiwa pemicu:** `t_pr_approve`
- **Pemeriksaan yang dapat menolak:** `pr_approval_attributed` — dua paruh dari satu aturan: permintaan tidak boleh mencoba menyebut siapa yang menyetujui (kunci payload `approvedBy` ditolak berdasarkan nama, apa pun nilainya), dan sesi harus membawa aktor. Aktor sesi *tanpa atribusi* diterima — itu catatan jujur bahwa tidak ada yang bisa disebutkan, dan menolaknya akan membuat persetujuan tidak terjangkau.
- **Glosarium:** `POLICY_REJECTED`, `ACTOR_IN_PAYLOAD`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** setiap persetujuan dalam demo dicatat tanpa orang. Band *"Diarahkan ke"* pada dokumen (Section Head / Procurement Head / VP Procurement) ditulis pada fixture — tidak diturunkan dari nilai dan tidak menentukan siapa yang boleh menyetujui.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:87; src/services/transitions/policies.ts:574; src/pages-v2/BuyerRequisitions.tsx:948; src/pages-v2/BuyerRequisitions.tsx:434; src/services/data/mock/MockCommandService.ts:740; src/lib/i18n/requisitions.ts:305; src/lib/i18n/requisitions.ts:382; src/lib/i18n/requisitions.ts:351 -->

### t_pr_reject — Tolak <!-- transition:t_pr_reject -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · procurement
- **Dari → ke:** Pending Approval → Rejected
- **Operator — di mana:** `/buyer/purchase-requisition` → buka baris *Menunggu Persetujuan* → **Tolak** → kotak *Alasan penolakan* → **Konfirmasi penolakan** (atau **Batal**).
- **Operator — lakukan:** keputusannya tidak. Tulis apa yang perlu diubah pemohon; tombol tetap nonaktif sampai kotak berisi teks.
- **Operator — isi:** alasan penolakan (wajib, harus berisi lebih dari sekadar spasi).
- **Penguji — status yang diharapkan:** Rejected
- **Penguji — konfirmasi:** chip status *Ditolak*; panel menampilkan *"Ditolak karena"* dengan teks apa adanya; toast *"{nomor} ditolak — Alasannya dicatat pada permintaan."*
- **Penguji — peristiwa pemicu:** `t_pr_reject`
- **Pemeriksaan yang dapat menolak:** `pr_reject_reason_authored` — alasan harus berupa string yang tidak kosong. Pemeriksaan kolom wajib saja menerima string berisi spasi; hook inilah yang menghentikannya.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`.
- **Kejujuran:** alasan disimpan pada dokumen dan tetap ada selama pemohon merevisinya — hanya penolakan baru yang menggantikannya. Tidak ada yang bisa membuktikan teks itu benar atau relevan; penjaga hanya membuktikan ada sesuatu yang ditulis.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:98; src/services/transitions/policies.ts:485; src/pages-v2/BuyerRequisitions.tsx:937; src/pages-v2/BuyerRequisitions.tsx:967; src/pages-v2/BuyerRequisitions.tsx:563; src/services/data/mock/MockCommandService.ts:718; src/lib/i18n/requisitions.ts:307; src/lib/i18n/requisitions.ts:309 -->

### t_pr_revise — Revisi dan kembalikan ke draf <!-- transition:t_pr_revise -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · requisitioner
- **Dari → ke:** Rejected → Draft
- **Operator — di mana:** `/buyer/purchase-requisition` → buka baris *Ditolak* → **Revisi dan kembalikan ke draf** → kotak *Apa yang berubah* → **Simpan revisi** (atau **Batal**).
- **Operator — lakukan:** ambil kembali permintaan yang ditolak, catat apa yang Anda ubah menanggapi penolakan, lalu ajukan lagi. Membuka kembali langsung ke antrean ditolak oleh keputusan operator: penyetuju akan melihat dokumen yang sama yang sudah mereka tolak.
- **Operator — isi:** catatan revisi (wajib, tidak kosong) — apa yang berubah, bukan mengapa ditolak.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** chip status *Draf*; panel menampilkan *"Direvisi — apa yang berubah"* di samping *"Ditolak karena"* sebelumnya; toast *"{nomor} dikembalikan ke draf — Catatan tersimpan pada permintaan. Ajukan kembali bila sudah siap."*; **Ajukan untuk persetujuan** ditawarkan lagi.
- **Penguji — peristiwa pemicu:** `t_pr_revise`
- **Pemeriksaan yang dapat menolak:** `pr_revision_note_authored` — catatan harus berupa string yang tidak kosong.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** izin yang berbeda (`pr:revise`) dari membuat permintaan; setiap revisi menggantikan catatan sebelumnya. Tidak ada fixture dalam keadaan *Rejected* — capai dengan menolak `PR-2026-00344`.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:143; src/services/transitions/policies.ts:508; src/pages-v2/BuyerRequisitions.tsx:884; src/pages-v2/BuyerRequisitions.tsx:512; src/services/data/mock/MockCommandService.ts:732; src/lib/i18n/requisitions.ts:320; src/lib/i18n/requisitions.ts:322 -->

### t_pr_source — Diajukan sebagai acara sourcing <!-- transition:t_pr_source -->

- **Jenis langkah:** kaskade (dipicu `t_rfq_create`)
- **Peran:** automation (`pr:source` tidak dipegang kursi mana pun; berjalan di bawah izin otomasi)
- **Dari → ke:** Approved → Sourcing Event
- **Operator — di mana:** tidak ada yang menekan ini pada permintaan. Pengadaan memulainya dari `/buyer/purchase-requisition` → baris *Disetujui* → **Ajukan acara sourcing**, yang membuka wizard sourcing di `/buyer/sourcing` dengan permintaan sudah terpilih pada **Ajukan dari permintaan** (kolom pertama wizard, opsional); atau langsung dari wizard, dengan memilih permintaan yang disetujui pada kolom itu. Kaskade menyala ketika RFQ benar-benar dibuat.
- **Operator — lakukan:** kebutuhan ini ditawarkan ke beberapa pemasok sekaligus, bukan langsung ke satu yang sudah dikenal. Lengkapi wizard seperti RFQ lainnya (judul, kategori, material, kuantitas, pemasok yang diundang, tenggat). Membuka wizard lalu menutupnya tidak mengubah apa pun pada permintaan.
- **Operator — isi:** tidak ada pada permintaan itu sendiri. Kolom wizard adalah milik RFQ; prefill dari permintaan membawa apa yang bisa dibawa (kategorinya hanya bila persis merupakan kategori RFQ — `Fragrance`, `Active Ingredients`, `Packaging`, `Emulsifiers`, `Botanical`, `Other`).
- **Penguji — status yang diharapkan:** Sourcing Event
- **Penguji — konfirmasi:** chip status *Acara Sourcing*; kolom *Dok. tertaut* dan baris *Dokumen tertaut* pada panel menampilkan nomor RFQ baru; tab *Sourcing* menghitungnya. Dalam jejak audit, event permintaan membawa `causationId` yang sama dengan `correlationId` pembuatan RFQ. Kursi pemohon melihat *"Menunggu Pengadaan"* menggantikan tombol, karena mengajukan acara sourcing adalah `rfq:create`, atom milik pengadaan.
- **Penguji — peristiwa pemicu:** `t_pr_source`
- **Pemeriksaan yang dapat menolak:** tidak ada miliknya sendiri. Kaskade hanya menyala untuk RFQ yang payload-nya menyebut permintaan yang ada; ditolak oleh legalitas (`ILLEGAL_TRANSITION`) bila permintaan itu bukan *Approved*, dan penolakan itu dicatat. Sebagian besar RFQ tidak diajukan dari permintaan dan tidak berkaskade ke mana pun — itu jalur biasa, bukan kegagalan.
- **Glosarium:** `ILLEGAL_TRANSITION`.
- **Kejujuran:** `/buyer/process-flows` menandai langkah ini sebagai dihitung — diputuskan oleh data sumber pasokan, bukan oleh orang yang memilihnya di sini. Bagian *Sumber pasokan* pada panel (*PIR tersedia* / *Tidak ada sumber*) adalah teks fixture yang ditulis tangan; tidak ada bagian portal yang memeriksa PIR.
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:162; src/services/transitions/cascades.ts:54; src/services/data/mock/MockCommandService.ts:2912; src/services/data/mock/MockCommandService.ts:749; src/pages-v2/BuyerRequisitions.tsx:559; src/pages-v2/BuyerRequisitions.tsx:1137; src/pages-v2/BuyerSourcing.tsx:1889; src/pages-v2/sourcing/requisitionPrefill.ts:145; src/lib/i18n/requisitions.ts:334; src/lib/i18n/sourcing.ts:647; src/services/transitions/businessRoles.ts:619-632 -->

### t_pr_convert — Dikonversi menjadi pesanan pembelian <!-- transition:t_pr_convert -->

- **Jenis langkah:** kaskade — belum ditulis; tidak aktif (tanpa tautan, tanpa pemanggil)
- **Peran:** automation (`pr:convert` tidak dipegang kursi mana pun)
- **Dari → ke:** Approved, Sourcing Event → PO Created
- **Operator — di mana:** tidak disediakan di mana pun hari ini. Teks *Disetujui — siap disourcing* pada panel menyatakannya terang-terangan: *"Konversi PO langsung tidak tersedia di sini: pesanan pembelian dibuat di S/4 dan tiba sebagai fakta."*
- **Operator — lakukan:** tidak ada yang bisa dilakukan di portal. Lingkaran permintaan tertutup ketika S/4HANA membuat pesanan — integrasi yang belum tiba.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** PO Created — **tidak terjangkau oleh tindakan apa pun hari ini**. Dua baris fixture dalam keadaan ini ditulis langsung di sana.
- **Penguji — konfirmasi:** hanya fixture `pr-001` / `pr-006` yang menampilkan *PO Dibuat* dengan nomor PO tertaut; tidak ada dispatch yang akan menghasilkan baris ketiga.
- **Penguji — peristiwa pemicu:** `t_pr_convert` (tidak pernah dipancarkan oleh pohon kode ini)
- **Pemeriksaan yang dapat menolak:** tidak berlaku — tidak ada tautan kaskade di `cascades.ts`, sehingga dispatcher tidak pernah membangun perintah ini.
- **Glosarium:** `UNKNOWN_TRANSITION` tidak berlaku (id-nya terdaftar); langkah ini semata tidak pernah dipicu.
- **Kejujuran:** dideklarasikan, tidak dipancarkan. Registri membawa transisi ini agar `/buyer/process-flows` dapat menunjukkan di mana mesin berakhir, dan target tidak menulis kolom apa pun untuk keadaan ini. Ia menunggu seam event S/4HANA (Tahap F2).
<!-- src: src/services/transitions/flows/purchaseRequisition.flow.ts:180; src/services/transitions/cascades.ts:24; src/services/data/mock/MockCommandService.ts:701; src/lib/i18n/requisitions.ts:335; src/services/data/mock/fixtures/buyerRequisitions.ts:22 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Keputusan (di Pending Approval).** Cabang A — `t_pr_approve` — **Kapan:** pengadaan menerima kebutuhan sebagai nyata dan berdana; tidak ada teks yang diminta, dan catatan menyebut aktor sesi (hari ini: tanpa atribusi). Cabang B — `t_pr_reject` — **Kapan:** jawabannya tidak; alasan tertulis wajib dan ditampilkan apa adanya kepada pemohon.
- **Penolakan dan jalan kembali (di Rejected).** `t_pr_revise` — **Kapan:** pemohon telah mengubah dokumen menanggapi alasan penolakan. Mendarat di Draft, tidak pernah langsung kembali ke antrean, dan `t_pr_submit` adalah paruh kedua dari revisi. Tidak ada jalan keluar lain: permintaan ditolak yang tidak direvisi siapa pun tetap terlihat sebagai *Rejected* dengan alasannya.
- **Yang terjadi setelah persetujuan (di Approved).** Cabang A — `t_pr_source` — **Kapan:** pengadaan mengajukan RFQ dari permintaan (kolom *Ajukan dari permintaan* pada wizard sourcing); permintaan mencatat nomor RFQ sebagai dokumen tertautnya. Cabang B — `t_pr_convert` — **Kapan:** tidak pernah, hari ini. Jalur PO langsung dideklarasikan untuk sumber pasokan yang sudah ada dan dimiliki S/4HANA.
- **Jalan buntu yang nyata.** *Sourcing Event* punya satu jalan keluar yang dideklarasikan (`t_pr_convert`) dan tidak bisa menyala, sehingga permintaan yang mencapai *Sourcing Event* tetap di sana; penghargaan RFQ dan PO yang dihasilkan hidup pada dokumen masing-masing.
- **Tidak ada batal, tidak ada tarik.** Mesin ini tidak punya sisi batal atau tarik pada keadaan mana pun. Draft yang tidak diajukan siapa pun tetap menjadi Draft.

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| SIMULASI — *"Sampel — menunggu produsen PR live (SOMO / Grid)"* | eksternal (registri liveness) | semua keadaan | selalu, sampai produsen asupan sungguhan tiba | pil kepala halaman `/buyer/intake-review`; penanda sel `/buyer/plan-grid` |
| *"Menunggu Pemohon"* / *"Menunggu Pengadaan"* | diturunkan saat dibaca (kursi vs. atom) | keadaan tempat verba yang ditahan bertindak | kursi tidak memegang atom verba itu | kepala halaman `/buyer/purchase-requisition` (PR Baru) dan kaki panel; kepala `/buyer/intake-review`; laci grid perencanaan |
| *"Tanpa atribusi — tidak ada orang dalam sesi"* | diturunkan saat dibaca | Approved dan seterusnya | selalu dalam demo — tidak ada orang yang masuk | baris *Disetujui oleh* panel; toast persetujuan |
| *"Ditulis pada dokumen — bukan hasil perhitungan dari nilai estimasi."* | ditulis tangan (hanya tampilan) | semua keadaan | setiap kali band *Diarahkan ke* ada; *Belum ditetapkan* bila kosong | *Fakta utama* panel |
| *Dikomit → {nomor}* / *Ditolak: {alasan}* (Tinjauan Asupan); *Terkirim → {nomor}* / *Pengiriman gagal: {alasan}* (laci grid perencanaan) | diturunkan saat dibaca — nomornya dari permintaan yang menyebut baris itu; penolakannya hanya untuk sesi ini | ∅ → Draft | setelah komit asupan berhasil atau ditolak; baris yang sudah dikomit tetapi permintaannya tidak ada di penyimpanan sesi ini berbunyi *"Dikomit — permintaannya tidak ada di penyimpanan sesi ini"* | kolom triase `/buyer/intake-review`; kaki laci grid perencanaan |
| *Diabaikan* | diangkat operator (dicatat pada baris asupan — `t_intake_dismiss`) | baris asupan (pra-PR) | baris dikesampingkan di Tinjauan Asupan; bertahan setelah muat ulang sampai **Pulihkan** | `/buyer/intake-review` |

Tidak ada penanda berbasis waktu yang diturunkan untuk permintaan: tanggal dibutuhkan ditampilkan tetapi tidak ada yang membandingkannya dengan jam (terukur — tidak ada pembacaan relasional atas `requiredDate`).

<!-- src: src/services/liveness/registry.ts:281; src/lib/i18n/widget.ts:206; src/lib/i18n/roles.ts:277; src/pages-v2/BuyerRequisitions.tsx:611; src/pages-v2/BuyerRequisitions.tsx:1368; src/lib/i18n/requisitions.ts:330; src/lib/i18n/requisitions.ts:351; src/lib/i18n/intakeReview.ts:92-96; src/lib/i18n/planGrid.ts:343-348; src/services/data/mock/stores/intakeLineStore.ts:1-56 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `pr-003` (PR-2026-00343) — *Sample Floral Accord FG-2847*, 100 KG, dalam **Sourcing Event**, tertaut ke `RFQ-2026-004`.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| RFQ (acara sourcing) | `linkedDoc` = nomor RFQ | Ditulis oleh kaskade `t_pr_source` dari nomor RFQ yang mengajukannya; pada fixture ditulis tangan. RFQ membawa `sourceRequisitionId` hanya dalam payload pembuatannya — catatan RFQ sendiri tidak membaca balik permintaan itu. |
| Pesanan pembelian | `linkedDoc` = nomor PO (`PO-2026-00108` pada `pr-001`) | Hanya tampilan. Tidak ada bagian portal yang menulis nomor PO ke permintaan; dua baris *PO Created* ditulis tangan. |
| Baris asupan (grid perencanaan / Tinjauan Asupan) | `intakeLineId` = id baris; `source` = `INTERNAL_GRID` atau `SOMO`; `periodBucket` | Ditulis hanya bila permintaan datang melalui komit asupan — id baris, tanda produsen dan bucket perencanaan (sebuah bucket, tidak pernah tanggal dibutuhkan). Formulir PR Baru membiarkan ketiganya kosong. Baris yang dikomit menemukan permintaannya lewat `intakeLineId`; baris itu tidak menyimpan nomor PR. |
| Penyetuju | `approvedBy` (atribusi aktor, bukan nama) | Ditulis dari sesi saat persetujuan. Hari ini selalu *tanpa atribusi*. |
| Pusat biaya, pemohon, kategori | kolom biasa | Ditulis pada fixture atau diketik di formulir; tidak ada yang mencocokkannya dengan master. |
| Band persetujuan | `approvalLevel` (*Diarahkan ke*) | Ditulis tangan; `''` berarti *Belum ditetapkan*. Bukan catatan siapa yang menyetujui. |
| Nilai estimasi | `estimatedValue` (opsional) | Ada hanya bila disediakan; tanda hubung bila tidak. Tidak pernah nol buatan. |
| Sumber pasokan | `sourceOfSupply` (*PIR exists* / *No source*) | Teks fixture yang ditulis tangan; portal tidak menanyakan PIR atau outline agreement. |

<!-- src: src/services/data/types.ts:920; src/services/data/mock/fixtures/buyerRequisitions.ts:24; src/services/data/mock/MockCommandService.ts:749; src/services/data/mock/MockCommandService.ts:755 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` untuk setiap kursi pembeli (aktor audit menyebut kursi, bukan orang), `ts`, `outcome`, satu `correlationId` per perintah, dan pada kaskade sebuah `causationId` yang menunjuk perintah penyebabnya. Kolom terpisah `attribution` membawa siapa yang bisa disebutkan — hari ini *tanpa atribusi*. Perintah yang ditolak juga dicatat, beserta alasannya.

Urutan kerja untuk `PR-2026-901`, yang ditumbuhkan seed awal melalui verba sungguhan (dua lingkup — kursi pemohon membuat dan mengajukan, kursi pengadaan menyetujui):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| T+0 | ∅ → Draft | requisitioner (`buyer:all`) | pembuatan — `Wardah Floral Accord`, 250 KG | `t_pr_create` |
| T+1 | Draft → Pending Approval | requisitioner (`buyer:all`) | ajukan | `t_pr_submit` |
| T+2 | Pending Approval → Approved | procurement (`buyer:all`) | setujui, tanpa `approvedBy` dalam payload | `t_pr_approve` |
| T+3 (penguji) | Approved → Sourcing Event | automation, `causationId` = `correlationId` RFQ | pengadaan mengajukan RFQ dengan *Ajukan dari permintaan* = `PR-2026-901` | `t_pr_source` |

Penguji yang melanjutkan dari T+3 tidak akan menemukan event lanjutan: `t_pr_convert` tidak pernah dipancarkan.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:127; src/services/data/mock/requisitionSeed.ts:23; src/services/data/mock/requisitionSeed.ts:119 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada tombol **PR Baru**; kepala halaman menampilkan *"Menunggu Pemohon"* | notis serah-terima di kepala halaman | kursi tidak memegang `pr:create` (mis. kursi khusus pengadaan) | bertindak dari kursi yang memegang jalur pemohon, atau persempit/ambil peran di panel identitas |
| **Setujui** / **Tolak** tidak ada; kaki panel menampilkan *"Menunggu Pengadaan"* | notis serah-terima di kaki panel pada baris *Menunggu Persetujuan* | kursi tidak memegang `pr:approve` / `pr:reject` | alihkan keputusan ke kursi pengadaan |
| Toast *"… tidak disetujui"* dengan *"Peran Anda tidak diizinkan…"* | `ROLE_NOT_PERMITTED:pr:approve` | dispatch buatan tangan tanpa atom (permukaan menahan tombolnya) | sama seperti di atas |
| Toast *"… tidak ditolak"* menyebut *rejectionReason* | `MISSING_FIELDS:rejectionReason` atau `POLICY_REJECTED:pr_reject_reason_authored` | kotak alasan kosong atau hanya spasi | tulis alasannya, lalu konfirmasi |
| Toast *"… tidak direvisi"* | `MISSING_FIELDS:revisionNote` / `POLICY_REJECTED:pr_revision_note_authored` | *Apa yang berubah* dibiarkan kosong | tulis apa yang berubah |
| *"Permintaan ini mencoba menyebut siapa yang melakukannya"* | `ACTOR_IN_PAYLOAD` atau `POLICY_REJECTED:pr_approval_attributed` | pemanggil mengirim `approvedBy` dalam payload | hapus — sesi yang menyebut aktornya |
| *"…tidak berada dalam status yang memungkinkan tindakan ini"* | `ILLEGAL_TRANSITION` | baris berpindah setelah panel dibuka (panel membaca ulang store, tetapi dispatch usang masih bisa tiba) | buka kembali baris dan bertindak pada keadaannya saat ini |
| Kuantitas ditolak berwarna merah di bawah kolom | *"kolom kosong bukan berarti nol"* / *"bukan kuantitas"* / *"bisa dibaca dua cara"* | kuantitas kosong, bukan angka, atau ambigu karena pemisah | ketik angka saja, mis. 4500 |
| RFQ sudah diajukan tetapi permintaan masih *Disetujui* | *Dok. tertaut* kosong; tidak ada event `t_pr_source` | kolom *Ajukan dari permintaan* pada wizard dibiarkan *"Bukan dari permintaan"*, atau permintaan yang dipilih bukan *Approved* (dicatat sebagai `ILLEGAL_TRANSITION` pada kaskade) | ajukan lagi dari tombol **Ajukan acara sourcing** pada permintaan, atau pilih di wizard |
| *"Ini di luar jangkauan akun Anda — atau memang tidak ada datanya"* | `SCOPE_DENIED` | kursi pemasok mencapai verba permintaan | permintaan bersifat internal pembeli; tidak ada yang perlu dilakukan di sisi pemasok |
| Permintaan tertahan di *Acara Sourcing* / tidak pernah *PO Dibuat* | tidak ada jalan keluar yang ditawarkan | `t_pr_convert` tidak punya tautan; konversi PO adalah tindakan S/4HANA | wajar hari ini; bukan cacat yang perlu dikejar |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:REQ`; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Permintaan pembelian"* | modul Permintaan pembelian dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:324; src/lib/i18n/requisitions.ts:402; src/services/data/mock/MockCommandService.ts:2918 -->

<!-- section:testdata -->
## 9 · Data uji

| Keadaan | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Draft | `pr-005` | PR-2026-00345 | *Folding Carton 150gsm Wardah*; pakai untuk menjalani **Ajukan untuk persetujuan** |
| Pending Approval | `pr-004` | PR-2026-00344 | *Halal Glycerin 99.5%*; pakai untuk menjalani **Setujui** atau **Tolak** |
| Approved | `PR-2026-901`; `pr-002` | PR-2026-901; PR-2026-00342 | `PR-2026-901` ditumbuhkan saat aplikasi dimulai melalui buat → ajukan → setujui dan kategorinya (`Fragrance`) bisa dibawa wizard sourcing; `pr-002` (*Packaging Primary*) bisa disourcing tetapi kategorinya tidak diprefill |
| Sourcing Event | `pr-003` | PR-2026-00343 | tertaut ke `RFQ-2026-004` (ditulis tangan) |
| PO Created | `pr-001`; `pr-006` | PR-2026-00341; PR-2026-00340 | akhir yang ditulis tangan; tertaut ke `PO-2026-00108` / `PO-2026-00106`; tidak terjangkau oleh tindakan apa pun |
| Rejected | — | — | tidak ada fixture — tolak `PR-2026-00344` untuk menghasilkannya |

Semua baris adalah data sampel SIMULASI (lihat §5). Nomor yang ditetapkan store untuk permintaan baru berlanjut dari `PR-2026-901` ke atas dalam satu sesi.

<!-- src: src/services/data/mock/fixtures/buyerRequisitions.ts:22; src/services/data/mock/requisitionSeed.ts:60; src/services/data/mock/stores/purchaseRequisitionStore.ts:42 -->
