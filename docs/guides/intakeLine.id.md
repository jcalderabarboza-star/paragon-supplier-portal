---
entity: intakeLine
locale: id
title: Baris usulan (triase kebutuhan)
wired: true
owner: portal
source_sha: 08e00f854463fde2d0bd333ec5c89e1e845c1746
transitions:
  - t_intake_dismiss
  - t_intake_restore
  - t_intake_commit
---

<!-- section:summary -->
## 1 · Apa proses ini

Kebutuhan yang diusulkan perencanaan dan belum diputuskan siapa pun — antrean tempat perencana menentukan kebutuhan mana yang masuk beban kerja pembelian dan mana yang dikesampingkan. Setiap baris usulan dipancarkan oleh sebuah produsen, yaitu SOMO atau grid perencanaan internal (*Grid Internal*), dan membawa material, jumlah yang disarankan, jumlah yang benar-benar dikirim produsen, periode perencanaan, dan alasan dari produsen (*Alasan (defisit)*). Paragon tidak mengarang baris itu; Paragon hanya mencatat apa yang diputuskan perencana atasnya.

Satu peran yang memutuskan. Ketiga tindakan — mengesampingkan baris, mengembalikannya, mengomitnya — memerlukan izin `intake:triage`, yang berada di jalur **perencanaan** (planning): perencana yang memutuskan rencana yang mengomitnya (ketetapan R1, PLN-3). Mengabaikan dianggap sama konsekuensialnya dengan mengomit, sehingga ketiganya berbagi satu izin. Kursi yang tidak memegangnya melihat *"Menunggu Perencanaan"* alih-alih tombol. Permintaan yang dibuat oleh komit disetujui oleh **pengadaan**, tidak pernah oleh perencanaan.

Baris lahir dalam keadaan **Pending** (menunggu) — tidak ada langkah pembuatan, karena produsen sudah memancarkannya. Dari Pending perencana **mengabaikannya** (→ **Dismissed**, diabaikan, yang dapat dibatalkan dengan **Pulihkan**) atau **mengomitnya** (→ **Committed**, dikomit, final). Mengomit adalah satu-satunya cara kebutuhan terencana menjadi permintaan sungguhan: tindakan ini otomatis membuat permintaan pembelian Draft melalui `t_pr_create`, paling banyak sekali per baris. Mengubah jumlah lebih dulu bukan langkah tersendiri — itu bagian dari komit, dan meninggalkan jumlah yang dikirim produsen memerlukan alasan tertulis.

Penanda kejujuran. Datanya **SIMULASI**: grid perencanaan membawa pil *"Sampel — menunggu produsen PR live (SOMO / Grid)"*, dan empat baris yang ditulis tangan serta usulan SOMO hasil generasi — semuanya terdaftar di tampilan *Tinjauan usulan* grid — adalah data sampel — baris yang dikomit tidak pernah menjadi instruksi pengadaan langsung. Setiap tindakan dicatat dan bertahan setelah muat ulang (triase disimpan di peramban dengan kunci `paragon.intakeTriage`), tetapi permintaan yang dihasilkannya hidup di store dalam memori yang di-seed ulang saat muat ulang, sehingga setelah muat ulang baris yang dikomit dapat menampilkan *"Dikomit — permintaannya tidak ada di penyimpanan sesi ini"*. Tidak ada orang yang masuk sesi, sehingga tindakan diatribusikan ke kursi, bukan ke orang yang disebut namanya. Tidak ada yang diberitahukan ke hulu: produsen tidak diberi tahu tentang pengabaian.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:1-73; src/services/transitions/flows/intakeLine.flow.ts:82-86; src/services/transitions/flows/intakeLine.flow.ts:139; src/lib/i18n/processFlowPurpose.ts:603-611; src/services/transitions/businessRoles.ts:389-391; src/services/transitions/cascades.ts:75-77; src/services/data/mock/stores/intakeLineStore.ts:64; src/pages-v2/plan-grid/IntakeReviewView.tsx; src/lib/i18n/intakeReview.ts:64-65; src/lib/i18n/intakeReview.ts:93-94; src/lib/i18n/widget.ts:206; src/services/liveness/registry.ts:281-284; src/lib/i18n/roles.ts:269; src/lib/i18n/roles.ts:277 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Pending | produsen memancarkan baris (tanpa verba, tanpa peristiwa) | — (SOMO / Grid Internal) | — |
| 1a | Pending → Dismissed | tindakan operator | planning | `t_intake_dismiss` |
| 1b | Dismissed → Pending | tindakan operator | planning | `t_intake_restore` |
| 2 | Pending → Committed | tindakan operator; sumber kaskade (memicu `t_pr_create`) | planning | `t_intake_commit` |

**Percabangan**

- **Di Pending:** `t_intake_commit` — planning — ketika kebutuhan harus masuk beban kerja pembelian, pada jumlah yang dikirim atau pada jumlah yang diubah disertai alasan; `t_intake_dismiss` — planning — ketika tidak ada yang perlu bertindak atas baris itu sekarang.
- **Di Dismissed:** `t_intake_restore` — planning — satu-satunya jalan keluar; mengembalikan baris ke Pending. Baris yang diabaikan tidak dapat langsung dikomit.
- **Di Committed:** tidak ada jalan keluar. Perubahan pikiran ditangani pada permintaan pembelian, yang punya langkah tolak dan revisinya sendiri.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:55-61; src/services/transitions/flows/intakeLine.flow.ts:124-197 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_intake_dismiss — Abaikan baris <!-- transition:t_intake_dismiss -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · planning (izin `intake:triage`)
- **Dari → ke:** Pending → Dismissed
- **Operator — di mana:** `/buyer/plan-grid` → tab **Tinjauan usulan** (tautan lama `/buyer/intake-review` mendarat di sini) → baris yang menunggu, ditemukan lewat *Tampilkan: Menunggu* dan kotak pencarian (material, kode, atau periode) → sel *Triase*-nya → **Abaikan**. Setiap baris terdaftar di sana — empat baris yang ditulis tangan dan setiap baris SOMO hasil generasi yang dikomit tab perencanaan.
- **Operator — lakukan:** kesampingkan kebutuhan itu agar tidak ada yang bertindak atasnya sekarang. Baris tetap ada di antrean, diredupkan, dengan chip *Diabaikan*, sehingga rekan yang membuka antrean yang sama tahu ada orang yang sudah menilainya. Produsen tidak diberi tahu.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Dismissed
- **Penguji — konfirmasi:** sel *Triase* baris menampilkan *Diabaikan* dengan tombol **Pulihkan** (dengan *Tampilkan: Menunggu* baris itu keluar dari daftar; *Tampilkan: Diabaikan* menampilkannya); baris ringkasan memindahkan satu dari *menunggu* ke *diabaikan*; muat ulang halaman — baris itu tetap diabaikan. Untuk baris hasil generasi, selnya di tab **Kemasan** atau **Bahan baku** berbunyi *Diabaikan* dan tidak dapat disunting. Kolom *Asal* tetap berbunyi *Direncanakan*: mengesampingkan baris tidak memutuskan apa pun tentang rencana.
- **Penguji — peristiwa pemicu:** `t_intake_dismiss`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan modul. Verba ini tidak mendeklarasikan kolom maupun aturan.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `MODULE_INACTIVE`.
- **Kejujuran:** pengabaian adalah tindakan yang dicatat (bertahan setelah muat ulang dan terlihat oleh kursi berikutnya di peramban yang sama); yang dicatat hanya statusnya, tidak pernah alasan. Antrean dan tab perencanaan membaca baris yang sama, sehingga baris yang diabaikan di antrean juga terbaca diabaikan di sel tab perencanaannya.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:141-153; src/pages-v2/plan-grid/IntakeReviewView.tsx; src/pages-v2/plan-grid/TimePhasedGrid.tsx; src/pages-v2/plan-grid/planGridModel.ts; src/services/data/mock/planningFacts.ts; src/pages-v2/intake-review/intakeReviewModel.ts:74-86; src/services/query/commandHooks.ts:1930-1946; src/services/data/mock/MockCommandService.ts:2618-2624; src/services/data/mock/stores/intakeLineStore.ts:224-271; src/services/data/intakeLineProjection.ts:38-46; src/lib/i18n/intakeReview.ts:59-60; src/lib/i18n/intakeReview.ts:85; src/lib/i18n/intakeReview.ts:95; src/services/planning/somoIntake.ts:21-27 -->

### t_intake_restore — Pulihkan baris yang diabaikan <!-- transition:t_intake_restore -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · planning (izin `intake:triage`)
- **Dari → ke:** Dismissed → Pending
- **Operator — di mana:** `/buyer/plan-grid` → tab **Tinjauan usulan** → *Tampilkan: Diabaikan* → sel *Triase* baris → **Pulihkan**.
- **Operator — lakukan:** kembalikan kebutuhan yang dikesampingkan ke antrean — pilihan yang keliru tidak boleh menjadi jalan buntu. Ini kebalikan persis dari abaikan.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Pending
- **Penguji — konfirmasi:** baris kembali menampilkan **Terima sesuai kiriman** dan **Abaikan**; ringkasan memindahkan satu dari *diabaikan* kembali ke *menunggu*; sel tab perencanaan baris hasil generasi dapat disunting lagi.
- **Penguji — peristiwa pemicu:** `t_intake_restore`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan modul.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `MODULE_INACTIVE`.
- **Kejujuran:** store menyimpan satu catatan per baris dan menggantinya di tempat; riwayat abaikan → pulihkan → abaikan hanya ada di peristiwa audit, tidak pada baris.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:154-165; src/pages-v2/plan-grid/IntakeReviewView.tsx; src/services/query/commandHooks.ts:1949-1965; src/services/data/mock/MockCommandService.ts:2618-2624; src/services/data/mock/stores/intakeLineStore.ts:261-271; src/lib/i18n/intakeReview.ts:86 -->

### t_intake_commit — Komit baris ke beban kerja pengadaan <!-- transition:t_intake_commit -->

- **Jenis langkah:** tindakan operator; sumber kaskade (memicu `t_pr_create` pada permintaan pembelian)
- **Peran:** buyer · planning (izin `intake:triage`, ketetapan R1). Permintaan yang dihasilkannya dibuat di bawah hibah otomasi (`pr:create`); menyetujui permintaan itu tetap milik **pengadaan** — kursi perencanaan tidak dapat menyetujuinya.
- **Dari → ke:** Pending → Committed (dan, melalui kaskade, ∅ → Draft pada permintaan pembelian baru)
- **Operator — di mana:** tiga pintu masuk, semuanya memicu verba yang sama.
  1. `/buyer/plan-grid` → tab **Tinjauan usulan** → baris yang menunggu → **Terima sesuai kiriman**. Mengomit jumlah yang dikirim produsen; tidak ada yang ditanyakan.
  2. `/buyer/plan-grid` → tab **Tinjauan usulan** → **Sesuaikan** pada sebuah baris → bagian *Sesuaikan & kirim — baris terpilih* → ubah *Diterima* bila perlu (dan *Alasan* bila berbeda) → **Kirim ke PR**.
  3. `/buyer/plan-grid` → tab **Bahan baku** atau **Kemasan** → ketik atau tempel jumlah yang diterima ke sebuah sel → panel perubahan terencana di atas grid → **Kirim** pada barisnya, **Kirim pilihan (n)** atau **Kirim semua (n)**. Sel-sel ini adalah usulan SOMO hasil generasi; satu komit dikirim per baris, dikelompokkan di bawah satu jangkar kausalitas.
- **Operator — lakukan:** ubah usulan kebutuhan menjadi permintaan sungguhan bagi tim pembelian, pada angka yang berani Anda pertanggungjawabkan — dan hanya sekali, agar satu kebutuhan tidak pernah menjadi beberapa permintaan. Menerima jumlah yang dikirim tidak membawa keputusan dan tidak perlu alasan; mengubahnya adalah keputusan Anda sendiri dan wajib menyebut alasannya.
- **Operator — isi:** jumlah yang diterima — angka saja, tanpa pemisah ribuan (misalnya 4500). Yang wajib di balik layar: angkanya dan teks persis yang Anda ketik, yang dibaca ulang platform untuk memastikan keduanya sepakat. **Alasan** wajib hanya bila jumlahnya berbeda dari yang dikirim produsen (*"Alasan diperlukan untuk mengirim override"*). Di grid, perubahan terencana menampilkan *"Sesuai kiriman — tidak perlu alasan"* bila jumlahnya sama.
- **Penguji — status yang diharapkan:** Committed (dan permintaan baru dalam Draft)
- **Penguji — konfirmasi:** di tampilan *Tinjauan usulan* sel *Triase* berbunyi *"Dikomit → PR-2026-9xx"* dan *Asal* berbunyi *Dikomit*; di laci, kaki bagian berbunyi *"Terkirim → PR-2026-9xx"* dan tombolnya nonaktif; pada tab perencanaan sel terbaca dikomit dan perubahan terencananya hilang. Di `/buyer/purchase-requisition` Draft baru menampilkan *Dari baris usulan* = id baris, *Ember perencanaan* = periode baris, dan — hanya bila Anda mengubah jumlahnya — *Penyesuaian jumlah* dengan dari → ke dan alasan Anda. Di jejak audit, peristiwa `t_pr_create` membawa `causationId` yang sama dengan `correlationId` komit ini.
- **Penguji — peristiwa pemicu:** `t_intake_commit`
- **Pemeriksaan yang dapat menolak:**
  - kolom wajib `acceptedQty` dan `acceptedQtyRaw` harus ada (`MISSING_FIELDS`);
  - `intake_qty_floor` — jumlah harus berupa angka hingga yang lebih besar dari nol; nol adalah komitmen atas ketiadaan, bukan kolom kosong;
  - `intake_qty_agrees` — teks yang diketik harus terbaca, melalui satu-satunya parser jumlah platform, persis sebagai angka yang dikomit (inilah yang mencegah "4.500" dikomit sebagai 4,5); token yang ambigu ditolak alih-alih ditebak;
  - `intake_override_reasoned` — jumlah yang dikomit dibandingkan dengan jumlah yang dikirim produsen, yang dibaca dari baris itu sendiri (tidak pernah dari permintaan); bila berbeda, alasan yang tidak kosong wajib ada. Baris yang tidak dapat ditemukan ditolak, bukan diloloskan;
  - `intake_one_grain` — baris hasil generasi yang material dan periodenya sudah dikomit pada grain lain (minggu di dalam bulan yang dikomit, atau bulan yang memuat minggu yang dikomit) ditolak, dengan menyebut baris yang sudah mewakilinya; baris yang diabaikan tidak memblokir apa pun (PLN-2);
  - legalitas: hanya baris Pending yang dapat dikomit, sehingga tekanan kedua, atau pengiriman baris yang diabaikan dari laci grid perencanaan, ditolak `ILLEGAL_TRANSITION`.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`, `MODULE_INACTIVE`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Kejujuran:** permintaan yang dihasilkan bersifat **SIMULASI** dan tidak pernah menjadi instruksi pengadaan langsung. Baris yang dikomit bersifat final — tidak ada pembatalan komit. Dua pengaman menjaga satu baris menghasilkan paling banyak satu permintaan: legalitas menolak orang yang menekan dua kali (dan memberitahunya), dan kunci replay kaskade (id baris itu sendiri) mengembalikan permintaan pertama kepada pengiriman ulang alih-alih membuat yang kedua. Nomor permintaan tidak disimpan pada baris; nomor itu ditemukan dengan mencari permintaan yang menyebut baris tersebut, sehingga setelah muat ulang (yang men-seed ulang permintaan tetapi menyimpan triase) baris berbunyi *"Dikomit — permintaannya tidak ada di penyimpanan sesi ini"*.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:95-117; src/services/transitions/flows/intakeLine.flow.ts:166-197; src/services/transitions/policies.ts:1759-1894; src/services/transitions/cascades.ts:61-77; src/services/transitions/businessRoles.ts:613-632; src/services/data/mock/MockCommandService.ts:2625-2646; src/services/data/mock/MockCommandService.ts:2762-2808; src/services/data/mock/MockCommandService.ts:824-830; src/services/data/intakeLineProjection.ts:67-90; src/pages-v2/plan-grid/IntakeReviewView.tsx; src/services/data/mock/intakeLines.ts; src/services/planning/somoIntake.ts; src/pages-v2/intake-review/intakeReviewModel.ts:50-56; src/pages-v2/PlanGrid.tsx:202-216; src/pages-v2/PlanGrid.tsx:357-361; src/pages-v2/PlanGrid.tsx:457-468; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:112-161; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:262-280; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:296-318; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:105-123; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:169-203; src/pages-v2/plan-grid/planDraft.ts:321-380; src/services/planning/measures.ts:113-121; src/services/query/commandHooks.ts:1894-1927; src/pages-v2/BuyerRequisitions.tsx:1306-1358; src/lib/i18n/intakeReview.ts:83; src/lib/i18n/intakeReview.ts:92-94; src/lib/i18n/planGrid.ts:341-348; src/lib/i18n/planGrid.ts:360; src/lib/i18n/planGrid.ts:424-428; src/lib/i18n/planGrid.ts:455-457; src/lib/i18n/planGrid.ts:471; src/lib/i18n/requisitions.ts:356-362; src/services/planning/views.ts:35-47; src/services/planning/views.ts:70-101 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Komit atau kesampingkan (di Pending).** Cabang A — `t_intake_commit` — **Kapan:** kebutuhan harus masuk beban kerja pembelian. Pada jumlah yang dikirim, tidak ada keputusan yang dibawa; pada jumlah lain, alasan tertulis wajib dan ikut ke permintaan sebagai *Penyesuaian jumlah*. Cabang B — `t_intake_dismiss` — **Kapan:** tidak ada yang perlu bertindak atas baris itu sekarang; tidak ada yang dibuat dan tidak ada yang diberitahukan ke hulu.
- **Pengabaian yang keliru (di Dismissed).** `t_intake_restore` — **Kapan:** baris dikesampingkan karena keliru atau keadaan berubah. Ini satu-satunya jalan keluar dari Dismissed; untuk mengomit baris yang diabaikan, pulihkan dulu.
- **Produsen sudah memangkasnya (di Pending).** Bila produsen mengirim lebih sedikit atau lebih banyak daripada yang disarankannya (`pil-somo-002`: 5.000 disarankan, 4.500 dikirim; `pil-grid-002`: 80.000 disarankan, 90.000 dikirim), perubahan itu milik produsen sendiri — ditampilkan di bawah jumlah sebagai *"{producer} menyesuaikan {from} → {to}"* dan tidak pernah dibebankan kepada perencana. Patokan setiap alasan adalah jumlah yang dikirim, bukan sarannya.
- **Committed bersifat final.** Tidak ada sisi keluar dari Committed. Perubahan pikiran ditangani pada permintaan pembelian (tolak / revisi di sana).
- **Komit yang ditolak.** Penolakan apa pun — dikembalikan maupun dilempar — membiarkan baris tetap Pending dengan alasannya ditampilkan di bawah baris (*"Ditolak: …"*, *"Pengiriman gagal: …"*). Pada tab perencanaan, perubahan yang wajib beralasan tetapi alasannya kosong tidak dikirim sama sekali (*"Tidak dikirim — alasan wajib karena jumlahnya berbeda dari yang dikirim produsen."*).
- **Perubahan grid yang belum dikirim.** Perubahan terencana di grid bukan fakta: ia hanya hidup di halaman dan muat ulang menghapusnya. Hanya pengiriman yang mencatat sesuatu.
<!-- src: src/services/transitions/flows/intakeLine.flow.ts:35-53; src/services/transitions/flows/intakeLine.flow.ts:124-139; src/services/data/mock/fixtures/prIntake.ts:58-101; src/services/data/intakeLineProjection.ts:48-60; src/pages-v2/plan-grid/planDraft.ts:321-380; src/lib/i18n/planGrid.ts:324; src/lib/i18n/planGrid.ts:454; src/lib/i18n/planGrid.ts:484 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| SIMULASI — *"Sampel — menunggu produsen PR live (SOMO / Grid)"* | eksternal (registri liveness) | semua status | selalu, sampai produsen usulan sungguhan tiba | pil kepala halaman `/buyer/plan-grid`; *Simulasi* di kolom *Asal* |
| *Direncanakan* / *Dikomit* | diturunkan saat dibaca (dari status) | Pending dan Dismissed terbaca *Direncanakan*; Committed terbaca *Dikomit* | selalu | kolom *Asal* di tampilan *Tinjauan usulan* grid perencanaan |
| *"{producer} menyesuaikan {from} → {to}"* | diturunkan saat dibaca (dikirim ≠ disarankan) | semua status | produsen mengirim jumlah yang berbeda dari sarannya | di bawah jumlah yang dikirim di tampilan *Tinjauan usulan*; *Dikirim produsen* di laci |
| *Diabaikan* | diangkat operator, dicatat | Dismissed | setelah `t_intake_dismiss` | kolom *Triase* di tampilan *Tinjauan usulan*; sel baris di tab Bahan baku / Kemasan (hanya-baca) |
| *"Dikomit → {pr}"* / *"Terkirim → {pr}"* | diturunkan saat dibaca (permintaan yang menyebut baris) | Committed | setelah komit, selama permintaannya ada di store sesi ini | kolom *Triase* *Tinjauan usulan*; kaki laci |
| *"Dikomit — permintaannya tidak ada di penyimpanan sesi ini"* | diturunkan saat dibaca | Committed | setelah muat ulang — triase tersimpan, store permintaan tidak | tempat yang sama |
| *"Menunggu Perencanaan"* | diturunkan saat dibaca (kursi vs. izin) | Pending, Dismissed | kursi tidak memegang `intake:triage` | kepala tampilan *Tinjauan usulan*; kaki laci; panel perubahan terencana |
| *"Dinonaktifkan — Perencanaan"* | diangkat operator (sakelar modul) | semua status | modul PLN dinonaktifkan | slot yang sama seperti di atas; halaman tetap dapat dibaca |
| *Direncanakan* / *Eksternal* (lapisan grid) | diangkat operator, hanya di halaman | Pending | sel diketik (*Direncanakan*) atau ditempel dari luar portal (*Eksternal*) dan belum dikirim | panel perubahan terencana dan sel pada tab perencanaan |
| *"Ditolak: {alasan}"* / *"Pengiriman gagal: {alasan}"* | diturunkan saat dibaca (penolakan terakhir, hanya di halaman) | Pending, Dismissed | sebuah dispatch ditolak | di bawah baris di tampilan *Tinjauan usulan*; kaki laci; panel perubahan terencana |
<!-- src: src/lib/i18n/widget.ts:206; src/pages-v2/plan-grid/IntakeReviewView.tsx; src/pages-v2/plan-grid/TimePhasedGrid.tsx; src/pages-v2/PlanGrid.tsx:333; src/pages-v2/plan-grid/PlanCellMarker.tsx:44-55; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:296-318; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:89-104; src/pages-v2/plan-grid/PlannedChangesPanel.tsx:148-160; src/components/ui-v2/HandoffNotice.tsx:41-45; src/services/modules/registry.ts:179-184; src/lib/i18n/modules.ts:164; src/lib/i18n/modules.ts:225-226; src/lib/i18n/planGrid.ts:465-466; src/lib/i18n/intakeReview.ts:92-96 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `pil-somo-002` — *Niacinamide USP*, SOMO, 5.000 KG disarankan / 4.500 KG dikirim, periode `2026-08`, dalam **Pending** saat seed.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Baris produsen | `id` (fixture `PR_INTAKE_LINES`, atau id SOMO hasil generasi `pil-somo-<material>@<bucket>`) | Hanya-baca. Baris produsen tidak pernah disalin atau disunting; kumpulan baris yang dipancarkan produsen yang menentukan id mana yang ada. |
| Catatan triase | `lineId` di store peramban `paragon.intakeTriage` | Hanya memuat hasil tindakan: status, jumlah yang dikomit, alasan (hanya bila jumlahnya diubah) dan saat komit. Satu catatan per baris, diganti di tempat. |
| Permintaan pembelian | `intakeLineId` pada permintaan = id baris ini | Nomor permintaan baris **diturunkan** dengan mencari permintaan yang menyebut baris itu — tidak pernah disimpan pada baris. Ditampilkan pada permintaan sebagai *Dari baris usulan*. |
| Tanda produsen | `source` permintaan = `SOMO` atau `INTERNAL_GRID` | Disalin dari baris ke permintaan oleh kaskade. |
| Ember perencanaan | `periodBucket` permintaan = periode baris | Bulan (`2026-08`) atau minggu ISO (`2026-W36`), bukan tanggal wajib. |
| Penyesuaian jumlah | `decision` permintaan (dari → ke, alasan) | Hanya ada bila perencana meninggalkan jumlah yang dikirim; platform yang menghitung apakah jumlahnya disesuaikan. Ditampilkan sebagai *Penyesuaian jumlah*. |
| Sel grid perencanaan | sumber fakta `acceptedQty` = id baris hasil generasi | Hanya untuk baris SOMO hasil generasi; terbaca jumlah yang dikomit setelah dikomit, dan *Diabaikan* (hanya-baca) selama barisnya dikesampingkan. Empat baris yang ditulis tangan tidak menyumbang fakta grid perencanaan. |
| Jejak audit | `subject` peristiwa = intakeLine + id baris | Lihat §7. |
<!-- src: src/services/data/mock/fixtures/prIntake.ts:43-102; src/services/data/mock/intakeLines.ts:16-22; src/services/planning/somoIntake.ts:40-80; src/services/data/mock/stores/intakeLineStore.ts:1-84; src/services/data/intakeLineProjection.ts:1-27; src/services/data/intakeLineProjection.ts:67-90; src/services/data/types.ts:1081-1115; src/services/data/types.ts:1188-1222; src/pages-v2/requisitions/prCreatePayload.ts:133-150; src/services/data/mock/planningFacts.ts:10-20; src/services/data/mock/planningFacts.ts:255-265; src/lib/i18n/requisitions.ts:356-362 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` untuk setiap kursi pembeli (kursinya, bukan orang), `ts`, `outcome`, satu `correlationId` per perintah, `subject` = {`entity`: `intakeLine`, `entityId`: id baris, `from`, `to`}, dan pada kaskade sebuah `causationId` yang menunjuk perintah penyebabnya. Ketiga verba usulan adalah tindakan pengguna, sehingga peristiwanya juga membawa `attribution` dari sesi — hari ini tanpa atribusi kecuali identitas contoh dipilih. Penyesuaian jumlah dicatat sebagai `decision` pada peristiwa `t_pr_create` hasil kaskade, bukan pada peristiwa komit. Perintah yang ditolak juga dicatat, beserta alasannya. Lahir dalam Pending tidak menulis peristiwa: produsen memancarkan baris dan belum ada yang bertindak.

Urutan kerja untuk `pil-somo-002` sebagaimana dihasilkan penguji di `/buyer/plan-grid` → *Tinjauan usulan*:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Pending | — (dipancarkan SOMO) | seed — tanpa peristiwa | — |
| T+1 | Pending → Dismissed | planning (`buyer:all`) | **Abaikan** di tampilan *Tinjauan usulan* | `t_intake_dismiss` |
| T+2 | Dismissed → Pending | planning (`buyer:all`) | **Pulihkan** di tampilan *Tinjauan usulan* | `t_intake_restore` |
| T+3 | Pending → Committed | planning (`buyer:all`) | tampilan *Tinjauan usulan* grid perencanaan → **Sesuaikan** → *Diterima* 4000, sebuah alasan → **Kirim ke PR** | `t_intake_commit` |
| T+3 | ∅ → Draft (permintaan pembelian) | automation (`buyer:all`), `causationId` = `correlationId` komit | kaskade; `decision` dari 4500 ke 4000 beserta alasannya | `t_pr_create` |

Penguji yang menekan **Kirim ke PR** lagi di T+4 akan mendapati tombolnya nonaktif; komit kedua yang dibuat tangan dicatat sebagai `t_intake_commit` yang gagal dengan `ILLEGAL_TRANSITION`.
<!-- src: src/services/transitions/events.ts:26-122; src/services/transitions/dispatcher.ts:469-495; src/services/transitions/dispatcher.ts:882-903; src/services/data/mock/MockCommandService.ts:2762-2808; src/services/transitions/flows/intakeLine.flow.ts:55-61 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada **Terima sesuai kiriman** / **Abaikan** / **Pulihkan**; kepala menampilkan *"Menunggu Perencanaan"* | notis serah-terima di kepala tampilan *Tinjauan usulan* (juga di kaki laci dan panel perubahan terencana) | kursi tidak memegang `intake:triage` — sejak PLN-3 kursi yang hanya pemohon tidak lagi memegangnya (R1) | bertindak dari kursi yang memegang jalur perencanaan (mis. pilih orang contoh perencanaan di panel identitas) |
| Ditolak dengan menyebut `intake:triage` | `ROLE_NOT_PERMITTED:intake:triage` | dispatch buatan tangan dari kursi tanpa jalur perencanaan — permukaan menyembunyikan tombolnya | bertindak dari kursi perencanaan |
| *"Dinonaktifkan — Perencanaan"* menggantikan tombol; dispatch ditolak dengan menyebut `PLN` | `MODULE_INACTIVE:PLN` | modul Perencanaan dinonaktifkan; halaman tetap dapat dibaca | aktifkan kembali modulnya (`/buyer/platform/modules/admin`); tidak ada hal lain yang membantu, apa pun perannya |
| **Kirim ke PR** tetap nonaktif dengan *"Alasan diperlukan untuk mengirim override"* | kotak *Alasan* di bawah *Diterima* kosong | jumlah yang diterima berbeda dari yang dikirim produsen | tulis alasannya, atau kembalikan jumlah yang dikirim |
| Teks merah di bawah *Diterima* pada laci | *"Masukkan jumlah yang diterima…"* / *"Itu bukan jumlah…"* / *"Ini bisa dibaca dua cara…"* | jumlah kosong, bukan angka, atau ambigu karena pemisah | ketik angka saja, mis. 4500 |
| Ditolak dengan menyebut `intake_qty_floor` | `POLICY_REJECTED:intake_qty_floor` | jumlah yang dikomit 0 atau kurang (mengetik 0 lolos di kolom, lalu aturan menolaknya) | komit jumlah di atas nol, atau abaikan barisnya |
| Ditolak dengan menyebut `intake_qty_agrees` | `POLICY_REJECTED:intake_qty_agrees` | teks yang diketik dan angkanya tidak sepakat, atau teksnya tak terbaca — hanya dispatch buatan tangan yang mencapainya | kirim teks persis seperti yang diketik di samping angkanya |
| Ditolak dengan menyebut `intake_override_reasoned` | `POLICY_REJECTED:intake_override_reasoned` | jumlah yang diubah tanpa alasan, dikirim memutari permukaan | sertakan alasannya |
| *"Tidak dikirim — alasan wajib…"* di panel perubahan terencana | baris tetap *Direncanakan* | perubahan grid berbeda dari jumlah yang dikirim dan *Alasan*-nya kosong — tidak ada yang dikirim | isi alasannya, lalu kirim lagi |
| *"Tidak terkirim — {material} sudah dikomit untuk {periode}, yang tumpang tindih dengan {minggu atau bulan} — …"* di panel perubahan terencana | `POLICY_REJECTED:intake_one_grain` (jejak pengembang menyebut baris yang dikomit) | material dan periode yang sama sudah dikomit pada grain lain (PLN-2) | tidak ada yang perlu dikirim: kebutuhannya sudah punya permintaan. Bila harus berubah, revisi permintaan itu |
| Ditolak sebagai *"tidak berada dalam status yang memungkinkan tindakan ini"* | `ILLEGAL_TRANSITION:Committed->Committed` atau `Dismissed->Committed` | baris sudah dikomit, atau baris yang diabaikan dikirim dari laci grid perencanaan | tidak ada yang perlu dilakukan untuk baris yang dikomit; pulihkan baris yang diabaikan di tampilan *Tinjauan usulan* lebih dulu |
| Sel tab perencanaan berbunyi *Diabaikan* dan tidak terbuka untuk disunting | judul sel menyebut baris itu disisihkan di Tinjauan usulan | baris usulannya diabaikan — di antrean, oleh siapa pun | pulihkan baris itu di tampilan *Tinjauan usulan* (*Tampilkan: Diabaikan*), lalu rencanakan |
| *"Dikomit — permintaannya tidak ada di penyimpanan sesi ini"* | baris Committed tetapi tidak menampilkan nomor PR | halaman dimuat ulang: triase tersimpan, permintaan dalam memori di-seed ulang | wajar dalam demo; permintaannya sudah dibuat, sesi ini tidak lagi menyimpannya |
| Perubahan grid terencana hilang | panel perubahan terencana tidak ada | muat ulang menghapus setiap perubahan yang belum dikirim | masukkan lagi lalu kirim |
| *"Ditolak: NOT_FOUND"* / *"Ditolak: SCOPE_DENIED"* | dilempar sebelum aturan apa pun berjalan | id baris tidak menyebut apa pun yang dipancarkan produsen, atau kursi pemasok mencapai verba | baris usulan bersifat internal pembeli; gunakan baris yang terdaftar |
<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/dispatcher.ts:612-637; src/services/transitions/dispatcher.ts:735-737; src/services/transitions/dispatcher.ts:798; src/services/transitions/policies.ts:1777-1894; src/services/data/mock/MockCommandService.ts:2597-2609; src/pages-v2/plan-grid/IntakeReviewView.tsx; src/services/data/mock/intakeLines.ts; src/pages-v2/plan-grid/PlannedChangesPanel.tsx; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:58-62; src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx:309-318; src/lib/glossary/refusals.glossary.ts:47-50; src/lib/i18n/planGrid.ts:341; src/lib/i18n/planGrid.ts:346-356; src/lib/i18n/planGrid.ts:454; src/lib/i18n/planGrid.ts:484; src/lib/i18n/modules.ts:225-226; src/router/AppRouter.tsx:167 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Pending | `pil-somo-001`; `pil-somo-002`; `pil-grid-001`; `pil-grid-002` | — | setiap baris dibuka dalam Pending karena store triase dimulai kosong. SOMO · Glycerin USP (Halal) 12.000 KG dikirim sesuai saran; SOMO · Niacinamide USP 5.000 disarankan / 4.500 KG dikirim (dipangkas produsen); Grid Internal · PET Bottle 200ml 200.000 PCS sesuai saran; Grid Internal · Folding Carton 80.000 disarankan / 90.000 PCS dikirim, satu-satunya baris berperiode minggu (2026-W36) |
| Dismissed | — | — | tidak ada fixture — tekan **Abaikan** pada baris yang menunggu mana pun di `/buyer/plan-grid` → *Tinjauan usulan* |
| Committed | — | — | tidak ada fixture — tekan **Terima sesuai kiriman** di tampilan *Tinjauan usulan*, atau **Kirim ke PR** di lacinya; kaskade membuat permintaan Draft dengan nomor yang ditetapkan store dalam rentang PR-2026-9xx |

Semua baris adalah data sampel SIMULASI. Tab perencanaan Bahan baku dan Kemasan juga memuat baris SOMO hasil generasi yang id-nya dibentuk dari kode material dan periode; baris-baris itu tidak dienumerasi di fixture mana pun, tetapi setiap baris terdaftar di tampilan *Tinjauan usulan* (cari dengan kode, mis. `SIM-PM-0068`) dan dapat diabaikan, dipulihkan, atau dikomit di sana. Id baris tidak punya nomor dokumen. Triase disimpan di peramban, jadi hapus entri `paragon.intakeTriage` untuk mengembalikan setiap baris ke Pending.
<!-- src: src/services/data/mock/fixtures/prIntake.ts:43-102; src/services/data/mock/stores/intakeLineStore.ts:64; src/services/data/mock/stores/intakeLineStore.ts:249-260; src/services/data/mock/MockProcurementService.ts:546-570; src/services/planning/somoIntake.ts:21-27; src/services/planning/somoIntake.ts:90-115; src/services/data/mock/stores/purchaseRequisitionStore.ts:41-45 -->
