---
entity: compliance
locale: id
title: Kepatuhan sertifikat
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_compliance_submit
  - t_compliance_verify
  - t_compliance_reject
---

<!-- section:summary -->
## 1 · Apa proses ini

Apakah seorang pemasok memegang sertifikat yang benar-benar dituntut oleh sebuah bahan — halal, BPOM, dan lainnya — serta posisi tiap persyaratan hari ini. Satuannya adalah satu sel dari kisi persyaratan: pemasok × material × sertifikat. Sebuah sel lahir **Missing** (Hilang) tanpa langkah pembuatan (matriks persyaratan menyiratkannya), menjadi **Under Review** (Sedang Ditinjau) saat pemasok menyerahkan sertifikat, dan berakhir **Valid** (Berlaku) saat pemeriksaan terbukti sah — atau kembali ke Missing bila tidak. Jalur administrasi pemasok (`back_office`) memegang atom penyerahan; jalur kepatuhan pembeli memegang verifikasi dan penolakan.

**Proses ini dimodelkan tetapi tidak aktif, dan sudah diputuskan untuk dipensiunkan.** Berkas alurnya menyebut dirinya *"INERT: TIDAK ADA CommandTarget, tidak ada kaskade — mendispatch verba apa pun gagal pada penyelesaian target."* Verifikasi dan penolakan sengaja dinyatakan tidak disediakan: *"I3.1 memodelkan verifikasi sebagai pipeline di balik registri kepatuhan, bukan sebagai layar operator."* Paket fakta mencatat keputusan bahwa mesin ini dipensiunkan demi **dokumen pemasok** — satu-satunya proses kepatuhan yang benar-benar mendispatch (`t_supplierdoc_*`, di `/buyer/compliance` dan `/supplier/documents`). Teks keputusan itu tidak ada dalam ekspor; hanya kalimat paket fakta yang terukur.

Apa yang ditampilkan portal hari ini: `/buyer/compliance` (**Pelacak Kepatuhan**) menampilkan **proyeksi** registri kepatuhan — enam belas baris sintetis yang status tampilannya (**Akan Kedaluwarsa**, **Kedaluwarsa**) dan sisa harinya dihitung saat baca dari tanggal kedaluwarsa, tidak pernah disimpan. Halaman ditandai **Sampel — menunggu panen data Track-R**, menyatakan tanggal regulasi BPJPH (17 Okt 2026) sebagai fakta eksternal, dan menawarkan tombol konfirmasi / tolak — tetapi tombol-tombol itu bekerja pada **dokumen pemasok**, bukan pada mesin ini. Registri juga dibaca oleh gerbang penerimaan di dalam wizard penerimaan barang, yang menampilkan pemberitahuan sertifikat; ia memberi tahu, tidak menghentikan.

<!-- src: src/services/transitions/flows/compliance.flow.ts:1-29,63-70; _derived/surfaces.md:37-39; src/pages-v2/BuyerCompliance.tsx:159,340-344,448,616-642; src/services/data/complianceProjection.ts:50,66-76; src/components/v2-features/GRInspectionWizard.tsx:848; src/lib/i18n/widget.ts:22 -->

<!-- section:lifecycle -->
## 2 · Jalan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| — | (lahir) Missing | status-lahir, tanpa verba pembuatan | — | — |
| 1 | Missing → Under Review | tindakan operator · dimodelkan, tidak aktif (tanpa target) | pemasok · back_office | `t_compliance_submit` |
| 2a | Under Review → Valid (akhir) | digerakkan sistem · dimodelkan, tidak aktif (tanpa target) | otomasi (atom kepatuhan) | `t_compliance_verify` |
| 2b | Under Review → Missing | digerakkan sistem · dimodelkan, tidak aktif (tanpa target) | otomasi (atom kepatuhan) | `t_compliance_reject` |

**Percabangan**

- **Pada Under Review:** `t_compliance_verify` — pipeline verifikasi — saat sertifikat terbukti sah; `t_compliance_reject` — pipeline verifikasi — saat tidak memenuhi persyaratan, mengembalikan sel ke Missing untuk penyerahan baru.

Expiring dan Expired bukan jalan keluar dari Valid: alurnya mengatakan *"Kedaluwarsa adalah proyeksi saat baca (hukum 0.5), tidak pernah menjadi tepi keluar dari Valid."*

<!-- src: src/services/transitions/flows/compliance.flow.ts:36-40; src/services/transitions/looseEndCensus.ts:181-191; src/lib/statusLabel.ts:29,41,62,67,97 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_compliance_submit — Pemasok menyerahkan sertifikat <!-- transition:t_compliance_submit -->

- **Jenis langkah:** tindakan operator · dimodelkan, tidak aktif (tanpa target)
- **Peran:** pemasok · back_office (atom `compliance:submit`)
- **Dari → ke:** Missing → Under Review
- **Operator — di mana:** tidak disediakan di mana pun hari ini. Alur menandai verba ini dapat disediakan, tetapi tidak ada layar yang menjalankannya dan tidak ada target yang dapat menerimanya. Yang dapat dilakukan pemasok hari ini adalah menyatakan dan mengajukan **dokumen pemasok** di `/supplier/documents` (`t_supplierdoc_declare` / `t_supplierdoc_submit`).
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Under Review — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_compliance_submit` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** fixture memuat dua sel yang tersimpan Missing (`creg-0013`, `creg-0006`) dan tidak ada yang dapat memindahkannya.
<!-- src: src/services/transitions/flows/compliance.flow.ts:43-53; _derived/surfaces.md:38-39; src/services/data/mock/fixtures/complianceRegistry.ts:279-289,315-325 -->

### t_compliance_verify — Sertifikat terbukti sah <!-- transition:t_compliance_verify -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `compliance:verify`, di jalur kepatuhan)
- **Dari → ke:** Under Review → Valid (akhir)
- **Operator — di mana:** tidak ada yang menekan ini di portal. Tombol **Konfirmasi** dalam antrean *Sertifikat yang dinyatakan, menunggu tinjauan* di `/buyer/compliance` mendispatch `t_supplierdoc_verify` pada dokumen pemasok — mesin yang berbeda.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Valid — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_compliance_verify` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"I3.1 memodelkan verifikasi sebagai pipeline di balik registri kepatuhan, bukan sebagai layar operator. Berubah saat Track R memutuskan jalur operatornya, bukan saat seseorang sempat membangunnya."*
<!-- src: src/services/transitions/flows/compliance.flow.ts:55-72; src/pages-v2/BuyerCompliance.tsx:616-625; src/lib/i18n/compliance.ts:265,278 -->

### t_compliance_reject — Sertifikat tidak memenuhi persyaratan <!-- transition:t_compliance_reject -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `compliance:reject`, di jalur kepatuhan)
- **Dari → ke:** Under Review → Missing
- **Operator — di mana:** tidak ada yang menekan ini di portal. Tombol **Tolak** / **Catat penolakan** dalam antrean yang sama mendispatch `t_supplierdoc_reject` dengan alasan tertulis yang dibaca pemasok kata demi kata — lagi-lagi mesin dokumen pemasok.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Missing — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_compliance_reject` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"I3.1 memodelkan verifikasi sebagai pipeline di balik registri kepatuhan, bukan sebagai layar operator."* Dua sel fixture berada di Under Review (`creg-0009`, `creg-0004`) dan tidak ada yang dapat menuntaskannya.
<!-- src: src/services/transitions/flows/compliance.flow.ts:74-90; src/pages-v2/BuyerCompliance.tsx:633-642,681-698; src/lib/i18n/compliance.ts:279-281; src/services/data/mock/fixtures/complianceRegistry.ts:173-183,209-219 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Verifikasi atau tolak (pada Under Review).** `t_compliance_verify` — **Kapan:** pipeline mengonfirmasi sertifikat. `t_compliance_reject` — **Kapan:** sertifikat tidak mencakup persyaratan; sel kembali ke Missing dan pemasok menyerahkan lagi. Keduanya tidak dapat terjadi hari ini.
- **Kedaluwarsa (bukan jalur).** Sel Valid terbaca **Akan Kedaluwarsa** dalam 90 hari sebelum tanggal kedaluwarsanya dan **Kedaluwarsa** setelah lewat; sel tanpa tanggal kedaluwarsa (sertifikat BPJPH berlaku permanen) tetap Valid. Sertifikat halal MUI-legacy selain itu berhenti sah menurut skema sejak tanggal mandat BPJPH meski tanggalnya sendiri terbaca Valid.
<!-- src: src/services/data/complianceProjection.ts:29,50,66-76,84-104 -->

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku pada | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Akan Kedaluwarsa · Kedaluwarsa | digerakkan waktu, diturunkan saat baca | Valid | hari menuju `expiryDate` ≤ 90, atau negatif, pada tanggal kini yang dinyatakan (31 Agu 2026) | pil, KPI, dan filter status di `/buyer/compliance` |
| Sampel — menunggu panen data Track-R | eksternal / provenans (SIMULATED) | seluruh halaman | selalu — `compliance` tidak punya target tersambung dan dijaga panen data; hijau secara struktural tidak terjangkau | pil liveness dan spanduk kesiapan di `/buyer/compliance` |
<!-- src: src/services/data/complianceProjection.ts:29,66-76; src/pages-v2/BuyerCompliance.tsx:445-467; src/services/liveness/registry.ts:144-149; src/lib/i18n/compliance.ts:206-208 -->

<!-- section:linked -->
## 6 · Objek terkait

**Apa yang dibaca portal hari ini:** `COMPLIANCE_REGISTRY` melalui `useComplianceRegistry()`, diproyeksikan saat baca. Sel perwakilan: `creg-0001` — pemasok `sup-007`, material `FR-ROUD-4470`, jenis `HALAL_BPJPH`, nomor sertifikat `SAMPLE-HALAL-0007A`, penerbit *BPJPH (illustrative)*, tanpa kedaluwarsa (dasar permanen), `lifecycleState` tersimpan Valid. Kepala berkas fixture itu sendiri adalah pernyataan kejujurannya: pemasok dan material adalah baris platform yang nyata; **pemasok mana yang memegang sertifikat mana adalah rekaan**, setiap nomor adalah token `SAMPLE-…` dan tidak ada lembaga sertifikasi nyata yang disebut.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pemasok | `supplierId` / `supplierName` | diambil apa adanya dari daftar pemasok; pembacaan dibatasi tenansi |
| Material | `materialCodes[]` | kode `MATERIAL_MASTER` nyata yang benar-benar ditransaksikan pemasok itu |
| Jenis sertifikat | `certType` | salah satu dari HALAL_BPJPH · HALAL_MUI_LEGACY · HALAL_FOREIGN · BPOM · ISO · OTHER (glosarium) |
| Sinkronisasi SAP | `sapSync` | fakta tersimpan, ditampilkan agar pembaca tahu belum ada transportasi |
| Penerimaan barang | `verifyHalalAtReceipt` di wizard GR | gerbang membaca registri yang sama dan menampilkan pemberitahuan; ia tidak menolak penerimaan |
| Dokumen pemasok | tidak ada melalui kolom | antrean tinjauan di halaman yang sama adalah mesin lain (`supplierDocument`) |
<!-- src: src/services/data/mock/fixtures/complianceRegistry.ts:1-60,100-118; src/lib/glossary/governance.glossary.ts:159-183; src/pages-v2/BuyerCompliance.tsx:159,905-921; src/components/v2-features/GRInspectionWizard.tsx:848 -->

<!-- section:history -->
## 7 · Riwayat status

Tidak ada. Tidak ada yang mendispatch verba kepatuhan — entitasnya tidak punya target perintah, sehingga dispatch yang menyebut `compliance` ditolak sebagai `UNKNOWN_ENTITY` sebelum ada peristiwa. Tanggal *terakhir diperbarui* di halaman adalah tanggal kini yang dinyatakan, bukan waktu peristiwa.

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| — | — | — | tidak ada yang mendispatch | tidak ada peristiwa |
<!-- src: src/services/transitions/dispatcher.ts:548; src/services/transitions/flows/compliance.flow.ts:25-26 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Sebuah tombol tampak menawarkan salah satu langkah ini | **Konfirmasi** / **Tolak** berada di antrean *Sertifikat yang dinyatakan, menunggu tinjauan*; **Ingatkan** pada baris Valid membuka toast bahwa pengingat belum tersambung | tabel registri adalah proyeksi hanya-baca; tombol antrean bekerja pada dokumen pemasok, bukan pada mesin ini, dan tindakan memverifikasi sel registri milik pipeline yang belum diputuskan Track R | verifikasi atau tolak dokumen pemasoknya; registri sendiri berubah hanya saat panen data Track-R hadir |
<!-- src: src/pages-v2/BuyerCompliance.tsx:616-642,946-960; src/lib/i18n/compliance.ts:278-281,261 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| all | — | — | semua — tidak ada fixture — dimodelkan, tidak aktif. Enam belas baris `creg-*` di `/buyer/compliance` adalah registri sintetis yang tidak diatur status mesin mana pun (`creg-0013` dan `creg-0006` tersimpan Missing, `creg-0009` dan `creg-0004` Under Review, sisanya Valid); tidak ada yang dapat dipindahkan. |
<!-- src: src/services/data/mock/fixtures/complianceRegistry.ts:102-376; _derived/guidefacts.json (compliance.fixtures = "no store") -->
