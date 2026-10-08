---
entity: supplierApplication
locale: id
title: Aplikasi pemasok
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_application_submit
  - t_application_start_review
  - t_application_approve
  - t_application_reject
---

<!-- section:summary -->
## 1 · Apa proses ini

Catatan bahwa sebuah perusahaan meminta menjadi pemasok Paragon, siapa yang menanganinya, dan apa keputusannya. Tanpa itu, sebuah perusahaan bisa menyelesaikan formulir pendaftaran lalu diberi nomor rujukan yang tidak berpijak pada catatan apa pun — persis yang dulu dilakukan panduan `/register`. Mesin inilah yang membuat nomor aplikasi menjadi benar: nomor ditetapkan oleh store pada saat baris ditulis, sehingga rujukan yang diberikan kepada pemohon menunjuk baris yang benar-benar ada.

Dua jalur pembeli menyentuhnya, dan pemohon tidak menyentuh apa pun. **Pengadaan** (procurement) mengajukan aplikasi atas nama pemohon — pemohon tidak punya kursi, tidak punya login, dan tidak punya verba pada mesin ini. **Kepatuhan** (compliance) mengambil berkas dari tumpukan (*Mulai tinjau*), lalu memutuskan: setujui, atau tolak dengan alasan tertulis yang bisa diteruskan kepada pemohon. Tidak ada keadaan draf: formulirnya adalah drafnya, dan sebuah aplikasi baru ada sejak seseorang menyimpannya.

Prosesnya dimulai di **Submitted** (Diajukan) dan berakhir di **Approved** (Disetujui) atau **Rejected** (Ditolak) — keduanya akhir yang sesungguhnya. Aplikasi yang ditolak tidak dibuka kembali; upaya kedua adalah aplikasi kedua. Persetujuan hanya mencatat keputusan: tidak membuat catatan pemasok, karena data induk vendor diterbitkan di S/4HANA, tempat identitas pemasok berada.

Penanda kejujuran. Antrean ini bersifat **SIMULASI** — pilnya berbunyi *"Sampel — menunggu identitas pemasok sungguhan"* — dan baris meta halaman menyatakannya: *"Setiap aplikasi di sini diajukan melalui tindakan platform sendiri, oleh kursi Paragon. Tidak ada yang datang dari luar: panduan di /register tidak mencatat apa pun dan tidak sampai ke antrean mana pun."* Dua baris di tumpukan ditumbuhkan saat aplikasi dimulai melalui verba sungguhan, di bawah kursi pengadaan, dengan nama perusahaan yang jelas fiktif dan bertanda *(illustrative)*. Tidak ada orang yang masuk sesi. Aplikasi dapat diajukan dan diambil oleh kursi sebagaimana kursi itu dibuka, sehingga *Diajukan oleh* berbunyi *"Tanpa atribusi — tidak ada orang dalam sesi"* pada kedua baris seed; keputusan hanya diambil oleh kursi yang bertindak sebagai pengguna contoh, sehingga *Diputuskan oleh* berbunyi label peran pengguna itu dengan tanda *(CONTOH)*. Dokumen yang dinyatakan pemohon (NPWP, NIB, halal, ISO) adalah klaim dengan nomor rujukan; tidak ada yang memverifikasinya di sini — itu tugas jalur dokumen pemasok.

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Submitted | pembuatan (tindakan operator) | procurement | `t_application_submit` |
| 2 | Submitted → Under Review | tindakan operator | compliance | `t_application_start_review` |
| 3a | Under Review → Approved | tindakan operator (terminal) | compliance | `t_application_approve` |
| 3b | Under Review → Rejected | tindakan operator (terminal) | compliance | `t_application_reject` |

**Percabangan**

- **Di Under Review:** `t_application_approve` — compliance — ketika Paragon menerima pemohon; `t_application_reject` — compliance — ketika Paragon menolak, dengan alasan berupa kata-kata yang bisa diteruskan kepada pemohon. Keduanya ditolak bagi kursi yang tidak menyebut siapa pun (`application_decider_named`).

Tidak ada keadaan lain dengan dua jalan keluar. *Submitted* punya satu (mulai tinjau); *Approved* dan *Rejected* tidak punya.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_application_submit — Ajukan aplikasi <!-- transition:t_application_submit -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** buyer · procurement
- **Dari → ke:** ∅ → Submitted
- **Operator — di mana:** `/buyer/supplier-applications` → **Ajukan aplikasi** (kepala halaman) → panel *Ajukan aplikasi* → **Periksa sebelum diajukan** → konfirmasi *Ajukan aplikasi ini?* → **Ya, ajukan** (atau **Kembali**).
- **Operator — lakukan:** catat bahwa sebuah perusahaan meminta menjadi pemasok Paragon. Anda mencatat permintaan mereka; pemohon tidak dapat melakukannya sendiri. Periksa ringkasan terhadap apa yang benar-benar dikirim pemohon — tidak ada yang dapat diubah setelahnya.
- **Operator — isi:** *Jenis permintaan* (salah satu dari `External SR` — perusahaan yang belum menjadi pemasok Paragon; `Internal SR` — perluasan vendor yang sudah ada di daftar; `KOL` — kreator atau perorangan) dan *Perusahaan* wajib. Untuk `Internal SR` nama perusahaan tidak diketik: pilih *Vendor yang sudah ada* dari daftar, dan nama perusahaan diambil dari vendor yang Anda pilih. *Dokumen yang dinyatakan* opsional — nomor rujukan untuk NPWP, NIB, halal, ISO; rujukan kosong tidak dicatat sama sekali.
- **Penguji — status yang diharapkan:** Submitted
- **Penguji — konfirmasi:** baris baru muncul di puncak antrean dengan nomor yang ditetapkan store (`APP-2026-0003` untuk yang pertama diajukan setelah aplikasi dimulai); tab *Menunggu* dan KPI *Menunggu diambil* menghitungnya; *Diajukan oleh* pada panel berbunyi *"Tanpa atribusi — tidak ada orang dalam sesi"*. Tidak ada yang muncul di kursi pemasok mana pun — pemohon tidak punya kursi, dan aplikasi tidak terlihat oleh vendor yang disebutnya.
- **Penguji — peristiwa pemicu:** `t_application_submit`
- **Pemeriksaan yang dapat menolak:** `application_request_type_known` — jenis permintaan harus salah satu dari tiga; `application_internal_vendor_resolved` — `Internal SR` harus menyebut vendor yang benar-benar ada di daftar resmi (pemilih hanya bisa menghasilkan nilai seperti itu, sehingga penolakan ini hanya terjangkau oleh dispatch buatan tangan); `application_declarations_well_formed` — bila ada dokumen yang dinyatakan, setiap entri harus menyebut jenis dokumen yang dikenal dan membawa rujukan yang tidak kosong; daftar yang cacat ditolak seluruhnya, tidak pernah dipangkas.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** langkah konfirmasi menyatakan *"Ini akan dicatat tanpa nama orang…"* sebelum Anda menyimpan. Antrean bersifat **SIMULASI** dan tidak ada pihak luar yang dapat mencapainya lewat jalur mana pun; dua baris yang sudah ada ditumbuhkan oleh seed awal. Toast keberhasilan menyebut pengajuannya, bukan nomornya — nomor ditetapkan di store dan dibaca dari baris di bawahnya.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:174; src/services/transitions/flows/supplierApplication.flow.ts:80; src/services/transitions/flows/supplierApplication.flow.ts:114; src/services/transitions/policies.ts:607; src/services/transitions/policies.ts:641; src/services/transitions/policies.ts:690; src/pages-v2/BuyerSupplierApplications.tsx:496; src/pages-v2/BuyerSupplierApplications.tsx:253; src/pages-v2/BuyerSupplierApplications.tsx:632; src/services/data/mock/MockCommandService.ts:2006; src/services/data/mock/MockCommandService.ts:2021; src/services/data/mock/stores/supplierApplicationStore.ts:88; src/lib/i18n/supplierApplications.ts:249; src/lib/i18n/supplierApplications.ts:269; src/lib/i18n/supplierApplications.ts:276 -->

### t_application_start_review — Mulai tinjau <!-- transition:t_application_start_review -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · compliance
- **Dari → ke:** Submitted → Under Review
- **Operator — di mana:** `/buyer/supplier-applications` → buka baris *Diajukan* → panel samping → **Mulai tinjau**.
- **Operator — lakukan:** ambil berkas dari tumpukan dan cantumkan nama Anda, sehingga antrean dapat membedakan aplikasi yang belum dibuka siapa pun dari yang sudah dikerjakan.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Under Review
- **Penguji — konfirmasi:** chip status *Sedang Ditinjau*; bagian *Keputusan* pada panel mendapat stempel waktu *Diambil*; baris berpindah dari tab *Menunggu* ke *Ditinjau*; toast *"Tinjauan {nomor} dimulai — Kini ada di meja Anda, bukan di antrean."* Kursi tanpa `application:review` melihat *"Menunggu Kepatuhan"* di slot itu.
- **Penguji — peristiwa pemicu:** `t_application_start_review`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas dan kolom wajib.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** waktu *Diambil* ditulis store pada saat tindakan; tidak ada nama yang dicatat untuknya — catatan menyimpan siapa yang mengajukan dan siapa yang memutuskan, bukan siapa yang mengambilnya, dan tindakan ini tetap terbuka bagi kursi yang tidak menyebut siapa pun.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:195; src/pages-v2/BuyerSupplierApplications.tsx:930; src/services/query/commandHooks.ts:1357; src/services/data/mock/MockCommandService.ts:1959; src/lib/i18n/supplierApplications.ts:217; src/lib/i18n/supplierApplications.ts:236 -->

### t_application_approve — Setujui <!-- transition:t_application_approve -->

- **Jenis langkah:** tindakan operator (terminal)
- **Peran:** buyer · compliance
- **Dari → ke:** Under Review → Approved
- **Operator — di mana:** `/buyer/supplier-applications` → buka baris *Sedang Ditinjau* → **Setujui** → konfirmasi *Setujui pemohon ini?* → **Ya, setujui** (atau **Batal**).
- **Operator — lakukan:** terima pemohon. Konfirmasi menyatakan apa yang dilakukan dan tidak dilakukan langkah ini: *"Ini mencatat keputusan untuk {perusahaan}. Tidak dapat dibatalkan, dan tidak membuat catatan pemasok — data induk vendor diterbitkan di S/4HANA."*
- **Operator — isi:** tidak ada yang diisi — sengaja tidak ada kotak teks pada persetujuan.
- **Penguji — status yang diharapkan:** Approved
- **Penguji — konfirmasi:** chip status *Disetujui*; *Diputuskan* dan *Diputuskan oleh* terisi (yang terakhir label peran pengguna contoh yang sedang diperankan kursi, bertanda *(CONTOH)*); baris berpindah ke tab *Diputuskan*; toast *"{nomor} disetujui — Keputusan tercatat. Tidak ada catatan pemasok yang dibuat."* Direktori pemasok tidak berubah.
- **Penguji — peristiwa pemicu:** `t_application_approve`
- **Pemeriksaan yang dapat menolak:** `application_decider_named` — kursinya harus menyebut seseorang (`APPLICATION_DECIDER_UNATTRIBUTED`); aplikasi tetap Under Review dan tidak ada yang dicap. Di atas tombol, panel menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. Tombol tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast kegagalan berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."*
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `POLICY_REJECTED`.
- **Kejujuran:** terminal dan tidak menerbitkan apa pun. Membuat catatan induk vendor adalah tindakan S/4HANA; kaskade dari sini ke baris pemasok berarti portal ini mengarang data induk yang bukan miliknya. Konsumennya disebut dan sisinya tidak dibangun.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:211; src/pages-v2/BuyerSupplierApplications.tsx:948; src/pages-v2/BuyerSupplierApplications.tsx:977; src/services/data/mock/MockCommandService.ts:1964; src/lib/i18n/supplierApplications.ts:222; src/lib/i18n/supplierApplications.ts:239 -->

### t_application_reject — Tolak <!-- transition:t_application_reject -->

- **Jenis langkah:** tindakan operator (terminal)
- **Peran:** buyer · compliance
- **Dari → ke:** Under Review → Rejected
- **Operator — di mana:** `/buyer/supplier-applications` → buka baris *Sedang Ditinjau* → **Tolak** → konfirmasi *Tolak pemohon ini?* → kotak *Alasan* → **Ya, tolak** (atau **Batal**).
- **Operator — lakukan:** tolak, dan nyatakan alasannya dengan kata-kata yang bisa diteruskan kepada pemohon. Tombol tetap nonaktif sampai kotak berisi teks. Petunjuk di bawahnya menjelaskan mengapa: *"Pemohon tidak punya kursi di sini, sehingga teks ini adalah satu-satunya keterangan atas keputusan tersebut."*
- **Operator — isi:** alasan penolakan (wajib, tidak kosong).
- **Penguji — status yang diharapkan:** Rejected
- **Penguji — konfirmasi:** chip status *Ditolak*; *Diputuskan*, *Diputuskan oleh* dan *Alasan yang diberikan* terisi; baris berpindah ke tab *Diputuskan*; toast *"{nomor} ditolak — Keputusan dan alasannya tercatat."*
- **Penguji — peristiwa pemicu:** `t_application_reject`
- **Pemeriksaan yang dapat menolak:** `application_decider_named` — kursinya harus menyebut seseorang (`APPLICATION_DECIDER_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_application_approve`; tercantum pertama. `application_refusal_authored` — alasan harus berupa string yang tidak kosong; pemeriksaan kolom wajib saja akan menerima string berisi spasi.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`.
- **Kejujuran:** terminal berdasarkan keputusan operator. Tidak ada pengajuan ulang dan tidak ada pembukaan kembali — pemohon tidak memegang verba, dan sisi keluar dari penolakan berarti orang Paragon menyunting keputusan yang sudah dibuat Paragon. Upaya kedua adalah aplikasi kedua lewat pintu yang sama, dan yang ditolak tetap persis seperti diputuskan.
<!-- src: src/services/transitions/flows/supplierApplication.flow.ts:227; src/services/transitions/flows/supplierApplication.flow.ts:41; src/services/transitions/policies.ts:670; src/pages-v2/BuyerSupplierApplications.tsx:1002; src/services/data/mock/MockCommandService.ts:1972; src/lib/i18n/supplierApplications.ts:226; src/lib/i18n/supplierApplications.ts:232; src/lib/i18n/supplierApplications.ts:243 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Keputusan (di Under Review).** Cabang A — `t_application_approve` — **Kapan:** kepatuhan menerima pemohon; tidak ada yang diketik, dan catatan menyebut pengguna contoh yang sedang diperankan kursi. Cabang B — `t_application_reject` — **Kapan:** kepatuhan menolak; alasan tertulis wajib dan menjadi satu-satunya keterangan yang akan pernah diterima pemohon.
- **Orang yang bernama yang memutuskan (di Under Review).** **Kapan** kursi tidak menyebut siapa pun — kursi sebagaimana dibuka, tanpa pengguna contoh yang dipilih di panel identitas — kedua cabang ditolak oleh `application_decider_named`: tidak ada yang disimpan atau dicap dan aplikasi tetap Under Review. Pilih pengguna contoh di panel identitas, lalu putuskan. Mengajukan aplikasi dan memulai tinjauan tetap terbuka bagi kursi yang tidak menyebut siapa pun.
- **Penolakan bersifat final.** Tidak ada revisi, buka kembali, tarik, atau batal pada keadaan mana pun. **Kapan** perusahaan yang ditolak mendaftar lagi: pengadaan mengajukan aplikasi baru, yang mendapat nomor baru; baris yang ditolak menyimpan alasannya.
- **Perluasan vendor yang sudah ada (di ∅ → Submitted).** **Kapan** jenis permintaannya `Internal SR`: vendor dipilih dari daftar dan platform mencocokkannya; aplikasi mencatat apa yang dinyatakan (`s4Vendor`) dan hasil pencocokannya (`resolvedSupplierId`). Ini tidak membuat aplikasi terlihat oleh pemasok tersebut.
- **Tidak ada draf, tidak ada setengah aplikasi.** **Kapan** panel pengajuan ditutup sebelum **Ya, ajukan**: tidak ada yang tercatat di mana pun.

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| SIMULASI — *"Sampel — menunggu identitas pemasok sungguhan"* | eksternal (registri liveness) | semua keadaan | selalu, sampai identitas pemasok sungguhan tiba (Tahap F1) | baris meta `/buyer/supplier-applications` (penanda provenans) |
| *"Setiap aplikasi di sini diajukan melalui tindakan platform sendiri, oleh kursi Paragon. Tidak ada yang datang dari luar…"* | catatan kejujuran yang ditulis | semua keadaan | selalu | baris meta `/buyer/supplier-applications` |
| *"Menunggu Pengadaan"* / *"Menunggu Kepatuhan"* | diturunkan saat dibaca (kursi vs. atom) | ∅ → Submitted (ajukan); Submitted (tinjau); Under Review (putuskan) | kursi tidak memegang atom verba itu | kepala halaman; badan panel pengajuan; slot tindakan panel samping |
| *"Tanpa atribusi — tidak ada orang dalam sesi"* | diturunkan saat dibaca | semua keadaan | aplikasi diajukan oleh kursi yang tidak menyebut siapa pun (kedua baris seed); tidak pernah pada keputusan, yang tidak dapat diambil kursi yang tidak menyebut siapa pun | *Diajukan oleh* pada panel; notis pra-tindakan pada langkah konfirmasi pengajuan |
| **Tanpa pemutus bernama** — *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."* | diturunkan saat dibaca (kursi); penolakan (`application_decider_named`) | Under Review | kursi memegang `application:decide` dan tidak menyebut siapa pun; dengan pengguna contoh terpilih barisnya berbunyi *"Ini akan dicatat atas nama {person}."* | panel samping, di atas **Setujui** / **Tolak**; saat salah satunya ditekan, toast kegagalan *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* |
| *"Ini adalah pernyataan pemohon sendiri. Tidak ada yang sudah diverifikasi…"* | catatan kejujuran yang ditulis | semua keadaan | setiap kali dokumen yang dinyatakan ditampilkan | *Dokumen yang dinyatakan* pada panel |
| *Menunggu diambil* / *Sedang ditinjau* / *Sudah diputuskan* | diturunkan saat dibaca (hitungan keadaan) | Submitted / Under Review / Approved+Rejected | selalu | ubin KPI dan tab |

Tidak ada penanda berbasis waktu yang diturunkan: stempel waktu *Diajukan*, *Diambil* dan *Diputuskan* ditampilkan, dan tidak ada yang membandingkannya dengan jam (terukur — jalur ini tidak bergabung dengan keluarga tanggal berjangkar mana pun).

<!-- src: src/services/liveness/registry.ts:312; src/lib/i18n/widget.ts:212; src/lib/i18n/supplierApplications.ts:165; src/lib/i18n/supplierApplications.ts:211; src/lib/i18n/supplierApplications.ts:214; src/lib/i18n/roles.ts:277; src/pages-v2/BuyerSupplierApplications.tsx:505 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `app-0001` (APP-2026-0001) — `External SR`, *PT Sample Emulsifiers (illustrative)*, tiga dokumen dinyatakan, dalam **Submitted**.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Daftar pemasok (vendor yang sudah ada) | `resolvedSupplierId` ← `s4Vendor` dicocokkan pada nomor business partner SAP vendor atau id-nya | Hanya untuk `Internal SR`; `null` untuk dua jenis lainnya. Dicocokkan saat lahir oleh target, tidak pernah disalin dari formulir. Menyatakan pemasok mana yang *menjadi pokok* aplikasi, bukan siapa pemilik barisnya. |
| Tenant / pemilik | `supplierId` — selalu `null` (tipenya menyatakan itu secara harfiah) | Pemohon bukan tenant; tidak ada kursi pemasok yang dapat melihat atau bertindak pada aplikasi, termasuk vendor yang disebut oleh perluasan. |
| Dokumen pemasok (NPWP, NIB, halal, ISO) | `declarations[].kind` + `reference` | Klaim dengan nomor rujukan. Tanpa status, tanpa tanda terverifikasi, tanpa masa berlaku — verifikasi milik jalur `supplierDocument`; tidak ada yang menautkan kedua catatan lewat kunci. |
| Data induk vendor (S/4HANA) | tidak ada | Harapan yang hanya tampilan: persetujuan mencatat keputusan; catatan vendor diterbitkan di S/4HANA dan tidak pernah tiba kembali di sini. |
| Aktor | `submittedBy`, `decidedBy` (atribusi aktor, bukan nama) | Ditulis dari sesi, tidak pernah dari formulir. `submittedBy` tanpa atribusi bila kursi yang mengajukan tidak menyebut siapa pun (kedua baris seed); `decidedBy` selalu menyebut pengguna contoh, karena kursi yang tidak menyebut siapa pun tidak dapat memutuskan. |
| Stempel waktu | `submittedAt`, `reviewStartedAt`, `decidedAt` | Ditetapkan store pada saat tiap tindakan; `null` sebelum itu. |

<!-- src: src/services/data/types.ts:2330; src/services/data/mock/MockCommandService.ts:2006; src/services/data/mock/MockCommandService.ts:2021; src/services/data/mock/applicationSeed.ts:70 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` (kursi, bukan orang), `ts`, `outcome`, satu `correlationId` per perintah; tidak ada kaskade pada mesin ini, sehingga tidak ada event yang membawa `causationId`. Penolakan dicatat beserta alasannya.

Urutan kerja untuk `app-0001` (APP-2026-0001) — seed mengajukannya saat aplikasi dimulai di bawah kursi pengadaan; kursi kepatuhan melanjutkan, bertindak sebagai pengguna contoh mulai T+2 (keputusan ditolak bagi kursi yang tidak menyebut siapa pun):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| T+0 | ∅ → Submitted | procurement (`buyer:all`) | ajukan — `External SR`, *PT Sample Emulsifiers (illustrative)*, dokumen NPWP · NIB · halal | `t_application_submit` |
| T+1 (penguji) | Submitted → Under Review | compliance (`buyer:all`) | **Mulai tinjau** | `t_application_start_review` |
| T+2 (penguji) | Under Review → Approved | compliance, bertindak sebagai pengguna contoh (`buyer:all`) | **Setujui** → **Ya, setujui** | `t_application_approve` |

Untuk cabang penolakan, jalani `app-0002` (APP-2026-0002) dengan cara yang sama dan pilih **Tolak** pada T+2 dengan alasan tertulis; event-nya `t_application_reject`. Setelah T+2 tidak ada event lanjutan yang mungkin pada kedua baris.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:127; src/services/data/mock/applicationSeed.ts:128 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada tombol **Ajukan aplikasi**; kepala halaman berbunyi *"Menunggu Pengadaan"* | notis serah-terima di kepala halaman (dan di dalam panel pengajuan bila sudah terbuka) | kursi tidak memegang `application:submit` | bertindak dari kursi yang memegang jalur pengadaan |
| Tidak ada **Mulai tinjau** / **Setujui** / **Tolak**; panel berbunyi *"Menunggu Kepatuhan"* | notis serah-terima di slot tindakan panel | kursi tidak memegang `application:review` / `application:decide` | alihkan ke kursi kepatuhan |
| **Ya, ajukan** tetap nonaktif | formulir belum lengkap | jenis permintaan atau perusahaan belum diisi; untuk `Internal SR`, vendor belum dipilih | lengkapi formulir; pilih vendor dari daftar |
| Toast *"Tidak dapat mengajukan aplikasi"* menyebut *requestType* | `POLICY_REJECTED:application_request_type_known` | dispatch buatan tangan mengirim jenis permintaan di luar ketiganya | gunakan salah satu dari `External SR`, `Internal SR`, `KOL` |
| Toast *"Tidak dapat mengajukan aplikasi"* menyebut *s4Vendor* | `POLICY_REJECTED:application_internal_vendor_resolved` | `Internal SR` menyebut vendor yang tidak ada di daftar (tidak terjangkau dari pemilih) | pilih dari daftar |
| Toast menyebut *declarations* | `POLICY_REJECTED:application_declarations_well_formed` | pernyataan dengan jenis tak dikenal atau rujukan kosong mencapai dispatcher | perbaiki atau buang entri yang cacat; permukaan tidak pernah mengirim yang kosong |
| Toast *"Tidak dapat menolak {nomor}"* | `MISSING_FIELDS:rejectionReason` atau `POLICY_REJECTED:application_refusal_authored` | kotak alasan kosong atau hanya spasi | tulis alasannya |
| Toast kegagalan pada **Ya, setujui** atau **Ya, tolak**: *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* | `POLICY_REJECTED:application_decider_named` (`APPLICATION_DECIDER_UNATTRIBUTED`); baris di atas tombol sudah menyatakannya | kursi tidak menyebut siapa pun — belum ada pengguna contoh yang dipilih di panel identitas | pilih pengguna contoh di panel identitas, lalu ulangi tindakannya; aplikasi masih Under Review dan tidak ada yang dicap |
| *"…tidak berada dalam status yang memungkinkan tindakan ini"* | `ILLEGAL_TRANSITION` | bertindak pada baris yang sudah berpindah (mis. menyetujui baris *Submitted* tanpa memulai tinjauan) | buka kembali baris dan ambil tindakan yang ditawarkan keadaannya |
| Disetujui, tetapi perusahaan tidak ada di direktori pemasok | tidak ada perubahan di `/buyer/suppliers` | wajar — persetujuan mencatat keputusan dan tidak menerbitkan apa pun; data induk vendor milik S/4HANA | tidak ada yang perlu dilakukan di portal |
| Perusahaan yang ditolak ingin mencoba lagi | baris yang ditolak bersifat terminal | sesuai rancangan — tidak ada buka kembali | ajukan aplikasi baru |
| Pemohon menyelesaikan `/register` dan tidak ada apa pun di tumpukan | antrean tidak berubah | `/register` adalah panduan; tidak mencatat apa pun dan tidak sampai ke antrean | pengadaan mengajukan aplikasi atas nama mereka |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SUP`, atau `MODULE_INACTIVE:SUP.applications` bila hanya *Pengajuan* yang dinonaktifkan; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Jaringan pemasok"* | modul Jaringan pemasok (atau salah satu bagiannya) dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:324; src/services/transitions/policies.ts:607; src/services/transitions/policies.ts:641; src/lib/i18n/supplierApplications.ts:165 -->

<!-- section:testdata -->
## 9 · Data uji

| Keadaan | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Submitted | `app-0001`; `app-0002` | APP-2026-0001; APP-2026-0002 | ditumbuhkan saat aplikasi dimulai oleh seed melalui `t_application_submit` di bawah kursi pengadaan: `External SR` *PT Sample Emulsifiers (illustrative)* dengan tiga dokumen dinyatakan; `KOL` *PT Sample Creator Studio (illustrative)* dengan satu |
| Under Review | — | — | tidak ada fixture — tekan **Mulai tinjau** pada salah satu baris |
| Approved | — | — | tidak ada fixture — setujui baris yang sedang ditinjau, dari kursi yang bertindak sebagai pengguna contoh |
| Rejected | — | — | tidak ada fixture — tolak baris yang sedang ditinjau dengan alasan, dari kursi yang bertindak sebagai pengguna contoh |

Store dibuka kosong berdasarkan keputusan operator (belum pernah ada yang mendaftar); setiap baris dihasilkan oleh verba. Tidak ada baris `Internal SR` yang di-seed — memilih vendor mana yang diperluas adalah tindakan orang, jadi ajukan satu dari pintu untuk melihat vendor dicocokkan. Semua data bersifat SIMULASI (lihat §5).

<!-- src: src/services/data/mock/stores/supplierApplicationStore.ts:36; src/services/data/mock/applicationSeed.ts:70; src/services/data/mock/applicationSeed.ts:37 -->
