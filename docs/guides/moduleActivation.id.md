---
entity: moduleActivation
locale: id
title: Aktivasi modul
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_module_set
---

<!-- section:summary -->
## 1 · Apa proses ini

Bagian platform mana yang aktif — beserta catatan siapa yang mengubah masing-masing, kapan, dan mengapa. Sebuah **modul** adalah kumpulan terkecil halaman, proses, dan bacaan yang akan diaktifkan seseorang bersama-sama (Jaringan pemasok, Pesanan pembelian, Penerimaan barang & inspeksi, Faktur & pembayaran, dan seterusnya). Sebagian modul memiliki **bagian** yang dapat diubah tersendiri (misalnya *Penahanan mutu* di dalam Penerimaan barang & inspeksi), dan **sisi pemasok** secara keseluruhan dapat dinonaktifkan. Pengubahan disimpan sebagai **buku catatan tindakan** yang hanya bertambah, bukan sebagai nilai yang disunting seseorang: apa yang berlaku diturunkan saat dibaca dari tindakan terakhir per modul atau sisi, dan bila belum ada tindakan, bawaan registri yang berlaku — setiap modul dalam fase *Aktif* dan menyala, setiap bagian menyala, kedua sisi menyala.

Satu jalur pembeli menyentuhnya. **Kepatuhan** (compliance) memegang satu-satunya atom, `module:set`, di samping atom tata kelola platform lainnya, dengan alasan yang dinyatakan pohon kode: pihak yang sama tidak dapat sekaligus menetapkan batas dan diatur olehnya — mengubah modul menentukan apa yang boleh dilakukan setiap jalur. Modul **Platform** (PLT: dasbor, peran, alur proses, glosarium, dan kedua layar modul itu sendiri) **selalu aktif** dan tidak dapat diubah, dan **sisi pembeli** tidak dapat dinonaktifkan selama PLT menyala, karena halaman admin berada di sana. Setiap kursi dapat membaca papan peta jalan; hanya kursi yang memegang `module:set` dengan orang yang teridentifikasi yang dapat mengubah sesuatu.

Menonaktifkan modul tidak pernah menyembunyikan dokumen. Halamannya tetap dapat dibaca tetapi menjadi **hanya-baca**: sebuah banner menyebut modulnya dan siapa yang dapat mengaktifkannya kembali, setiap tindakan yang dijaga di halaman itu diganti dengan pemberitahuan, entri menunya keluar dari navigasi, dan dispatcher menolak setiap tindakan di modul, bagian, atau sisi itu untuk setiap kursi, apa pun perannya (`MODULE_INACTIVE`). Pengaktifan menghormati ketergantungan: sebuah modul tidak dapat dinyalakan selama modul yang *dibutuhkannya* mati, dan tidak dapat dimatikan selama modul yang *membutuhkannya* menyala. Modul yang hanya *membaca* modul lain menurun secara jujur alih-alih memblokir.

Penanda kejujuran. Buku catatan dibuka **kosong** berdasarkan keputusan — baris yang di-seed akan mengklaim seseorang mengubah sesuatu padahal tidak pernah — sehingga hari ini setiap modul membaca bawaan registrinya dan diberi label *Belum pernah diubah — bawaan registri*. Buku catatan berada di mock dalam memori di balik layanan, bukan di peramban: memuat ulang halaman mengembalikan bawaan registri. Sebuah tindakan harus **diatribusikan kepada seseorang**: kursi tanpa atribusi ditolak, sehingga di demo Anda memakai pengguna CONTOH terlebih dahulu; pada deployment produksi (tanpa lencana lingkungan) orang contoh juga ditolak, dan sampai fitur masuk tersedia tidak ada orang lain yang dapat bertindak di sana. Persetujuan empat mata menunggu fitur masuk.
<!-- src: src/lib/i18n/processFlowPurpose.ts:630-633; src/services/modules/registry.ts:1-40,50-74,122-133; src/services/modules/activation.ts:78-112; src/services/data/mock/stores/moduleActivationStore.ts:1-48; src/services/transitions/flows/moduleActivation.flow.ts:1-34; src/services/transitions/businessRoles.ts:290,343-349; src/services/data/mock/moduleActivationTarget.ts:85-95,163-176; src/services/modules/deployment.ts:1-52; src/context/ModuleActivationContext.tsx:60-80; src/lib/i18n/modules.ts:259-261,280,288 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Governed | modul atau sisi ada karena tercantum di registri (tanpa verba pembuatan; kode yang tidak dikenal adalah `NOT_FOUND`) | — | — |
| 1 | Governed → status yang sama | mencatat fakta (mempertahankan status): satu tindakan pengubahan ditambahkan ke buku catatan | buyer · compliance | `t_module_set` |

Langkah ini berulang setiap kali sebuah modul, bagian, atau sisi pemasok diubah; halaman admin mengirim satu tindakan per baris yang berubah, sehingga satu **Simpan perubahan** dapat menghasilkan beberapa tindakan berturut-turut.

**Percabangan**

Tidak ada status dengan dua jalan keluar. Keputusan yang penting berada di payload dan kait kebijakan:

- **Menyala atau mati (di Governed):** `t_module_set` dengan fase *menyala* (Aktif, Sedang diaktifkan) dan `enabled: true` — kepatuhan — ketika modul harus dapat dipakai; setiap modul yang *dibutuhkannya* harus sudah menyala. `t_module_set` dengan fase *mati* (Direncanakan, Belum dijadwalkan) dan `enabled: false` — kepatuhan — ketika modul harus menjadi hanya-baca; setiap modul yang *membutuhkannya* harus sudah mati.
- **Modul, bagian, atau sisi (di Governed):** id entitas adalah kode modul (dengan fase, menyala/mati, dan opsional bagian) atau sisi pemasok (hanya menyala/mati, tanpa fase, tanpa bagian).
<!-- src: src/services/transitions/flows/moduleActivation.flow.ts:39-78; src/services/modules/registry.ts:59-74; src/services/data/mock/moduleActivationTarget.ts:51-71; src/pages-v2/modules/adminModel.ts:95-134 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_module_set — Aktifkan atau nonaktifkan modul <!-- transition:t_module_set -->

- **Jenis langkah:** mencatat fakta (mempertahankan status) · tindakan operator dari halaman admin
- **Peran:** buyer · compliance (atom `module:set`)
- **Dari → ke:** Governed → status yang sama
- **Operator — di mana:** `/buyer/platform/modules` → **Kelola modul** (hanya tampil bagi kursi yang memegang `module:set`; kursi lain melihat *Menunggu Kepatuhan* di tempatnya) → `/buyer/platform/modules/admin` (**Aktivasi modul**) → ubah **Fase** sebuah baris, sakelar **Menyala / mati**-nya, atau sakelar di bawah **Bagian**, atau sakelar **Sisi pemasok** → tulis **Alasan perubahan ini** (dan, opsional, alasan untuk satu modul) → **Simpan perubahan**.
- **Operator — lakukan:** Putuskan bagian platform mana yang boleh dipakai untuk bertindak. Memilih fase sekaligus menetapkan menyala/mati (Aktif dan Sedang diaktifkan berarti menyala; Direncanakan dan Belum dijadwalkan berarti mati), dan membalik sakelar memindahkan fase ke fase terdekat yang sesuai, sehingga formulir tidak pernah memuat pertentangan. Simpan hanya mengirim baris yang berbeda dari yang berlaku, penonaktifan lebih dulu (yang paling bergantung lebih dulu) lalu pengaktifan, sehingga rantai yang diubah bersama tidak ditolak oleh baris pertamanya sendiri. **Kembalikan ke bawaan registri** hanya mengisi ulang formulir; tidak ada yang dicatat sampai **Simpan perubahan**.
- **Operator — isi:** **Alasan perubahan ini** (`reason`, wajib — kosong atau hanya spasi ditolak) dan, per baris yang berubah, fase dan menyala/mati yang baru (`phase`, `enabled`) serta bagiannya (`parts`, opsional — bila dihilangkan, modul mempertahankan bagian yang dimilikinya). Untuk sisi pemasok hanya `enabled`. Siapa yang mengubah berasal dari sesi dan kapan dari jam pada saat tindakan; keduanya bukan kolom, dan payload yang mencoba menyebut aktor ditolak.
- **Penguji — status yang diharapkan:** Governed (tidak berubah)
- **Penguji — konfirmasi:** di bawah baris yang diubah, *Tersimpan.*; baris itu berbunyi *Terakhir diubah oleh {orang} pada {waktu}*, dengan orang contoh membawa penanda *(CONTOH)*; di `/buyer/platform/modules` kartunya pindah ke kolom fase barunya, dan lacinya berbunyi *Berlaku: {fase} · {Menyala/Mati}* dengan tindakan, alasan, dan pelakunya di bawah **Riwayat aktivasi**. Untuk modul yang **dimatikan**: entri menunya hilang, halamannya menampilkan *{modul} ({kode}) sedang dinonaktifkan* beserta fasenya dan *…sampai Kepatuhan mengaktifkannya*, dan tindakan apa pun di dalamnya ditolak dengan `MODULE_INACTIVE` yang menyebut sakelarnya (`SHP`, `GRC.qualityHold`, `side:supplier`). Untuk **Sedang diaktifkan**: halamannya menampilkan *{modul} ({kode}) sedang diaktifkan* dengan tautan ke panduannya.
- **Penguji — peristiwa pemicu:** `t_module_set`
- **Pemeriksaan yang dapat menolak:** `module_known` — subjek harus modul atau sisi; PLT selalu aktif dan tidak dapat diubah; sisi pembeli tidak dapat diubah selama PLT menyala; `enabled` harus true atau false. `module_phase_consistent` — modul harus membawa salah satu dari empat fase dan fase itu harus sesuai dengan `enabled`; sisi tidak boleh membawa fase. `module_parts_known` — setiap bagian yang disebut harus milik modul ini dan bernilai true atau false; sisi tidak punya bagian. `module_reason_authored` — alasan harus berupa teks yang berisi. `module_actually_changes` — tindakan yang tidak mengubah apa pun (fase sama, menyala/mati sama, bagian sama) ditolak alih-alih dicatat. `module_no_active_hard_dependants` — penonaktifan ditolak selama modul yang *membutuhkannya* menyala, dan penolakan menyebutnya. `module_dependencies_enabled` — pengaktifan ditolak selama modul yang *dibutuhkannya* mati, dengan menyebut namanya. `module_set_attributed` — sesi harus menyebut seseorang; kursi tanpa atribusi diminta memakai seseorang. `module_set_not_sample_in_prod` — pada deployment produksi orang contoh ditolak. Sebelum semua itu: kursi pemasok ditolak pada tahap scope, kode yang tidak dikenal adalah `NOT_FOUND`, kursi tanpa `module:set` mendapat `ROLE_NOT_PERMITTED`, payload yang membawa kunci aktor mendapat `ACTOR_IN_PAYLOAD`, dan `enabled` atau `reason` yang tidak ada mendapat `MISSING_FIELDS`.
- **Glosarium:** `MODULE_INACTIVE`, `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `ACTOR_IN_PAYLOAD`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** halaman ini sengaja hanya-baca bagi sebagian besar kursi, dalam tiga cabang yang diperiksa menurut urutan dispatcher: kursi tanpa `module:set` (*Mengubah modul bukan peran Anda.* dengan *Menunggu Kepatuhan*); kursi tanpa atribusi (*Tidak ada yang masuk, sehingga tidak ada yang dapat diubah di sini…*), yang merupakan cara kursi pembeli bawaan dibuka meskipun memegang kepatuhan; dan orang contoh pada deployment produksi (*Ini adalah deployment produksi: orang contoh tidak dapat mengubah modul di sini…*). Kontrol dinonaktifkan di setiap cabang, tidak pernah dihilangkan. Penolakan pada satu baris membiarkan baris lain tetap diterapkan. Buku catatan berada di memori: memuat ulang halaman mengembalikan setiap modul ke bawaan registrinya.
<!-- src: src/services/transitions/flows/moduleActivation.flow.ts:47-76; src/services/data/mock/moduleActivationTarget.ts:44-71,85-176; src/services/transitions/policyHooks.ts:747-769; src/services/transitions/dispatcher.ts:286-290,615-637; src/services/transitions/businessRoles.ts:343-349,487-494,748-758; src/pages-v2/ModulesBoard.tsx:75-103; src/pages-v2/ModulesAdmin.tsx:105-198,201-223,236-360; src/pages-v2/modules/adminModel.ts:66-134; src/services/query/commandHooks.ts:2078-2143; src/pages-v2/modules/ModuleDetailDrawer.tsx:52-57,131-156; src/pages-v2/modules/moduleLedger.ts:21-28; src/components/ui-v2/ModuleOffNotice.tsx:35-76; src/lib/i18n/modules.ts:220-226,241,248,254,265-301; src/lib/i18n/roles.ts:267,277 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Menyalakan atau mematikan (di Governed).** Cabang A — `t_module_set` dengan Aktif atau Sedang diaktifkan — **Kapan:** modul harus dapat dipakai; Sedang diaktifkan juga menaruh banner di halamannya (*sedang dikonfigurasi, data mungkin contoh*). Cabang B — `t_module_set` dengan Direncanakan atau Belum dijadwalkan — **Kapan:** modul harus hanya-baca; Direncanakan berarti dijadwalkan untuk gelombang berikutnya, Belum dijadwalkan berarti belum dijadwalkan.
- **Hanya sebuah bagian (di Governed).** **Kapan:** satu bagian modul harus berhenti sementara sisanya tetap menyala — mis. *Penahanan mutu* atau *Wizard inspeksi* di Penerimaan barang & inspeksi, *Sengketa* atau *Pelepasan pembayaran* di Faktur & pembayaran. Modul tetap dalam fasenya; hanya tindakan (dan rute, bila ada) yang diatur bagian itu yang ditolak. Sakelar bagian dinonaktifkan selama modulnya mati.
- **Sisi pemasok (di Governed).** **Kapan:** tidak ada kontak pemasok yang boleh bertindak sama sekali; setiap tindakan yang dicoba kursi pemasok ditolak dengan `MODULE_INACTIVE` yang menyebut `side:supplier`, dan halaman di bawah `/supplier/…` tampil hanya-baca. Sisi pembeli tidak pernah ditawarkan.
- **Penonaktifan terhalang (pengecualian).** **Kapan:** modul yang *membutuhkan* modul ini masih menyala (Pesanan pembelian selama Pengiriman & ASN atau Faktur & pembayaran menyala). Baris admin memperingatkan *Tidak dapat dinonaktifkan selama {kode} tetap aktif* sebelum Simpan; bila tetap disimpan, baris itu ditolak dan menyebut modul yang bergantung. Selesaikan dengan menonaktifkan modul yang bergantung dalam penyimpanan yang sama — halaman mengurutkannya lebih dulu.
- **Pengaktifan terhalang (pengecualian).** **Kapan:** modul yang *dibutuhkannya* mati (Faktur & pembayaran selama Pesanan pembelian atau Penerimaan barang & inspeksi mati). Ditolak, dengan menyebut modul yang kurang. Aktifkan modul itu dalam penyimpanan yang sama — halaman mengirim pengaktifan mulai dari yang paling sedikit bergantung.
- **Tidak ada yang berubah (pengecualian).** **Kapan:** tindakan akan membiarkan fase, menyala/mati, dan bagian seperti semula. Ditolak alih-alih dicatat; halaman sendiri tidak pernah mengirim baris semacam itu.
- **Siapa yang boleh bertindak (pengecualian).** **Kapan:** tidak ada orang yang disebut dalam sesi, atau orang contoh di produksi — ditolak dengan menyebut alasannya; pakai pengguna contoh di panel identitas (**Bertindak sebagai**) pada deployment dev atau preview.
<!-- src: src/services/modules/registry.ts:134-269; src/services/modules/activation.ts:123-183; src/services/data/mock/moduleActivationTarget.ts:132-176; src/pages-v2/modules/adminModel.ts:95-149; src/pages-v2/ModulesAdmin.tsx:267-271,310-315; src/lib/i18n/modules.ts:233-236,291-292; src/lib/i18n/identity.ts:122 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Ditampilkan di |
|---|---|---|---|---|
| *{modul} ({kode}) sedang dinonaktifkan* · *Fase: {fase}* · *…sampai Kepatuhan mengaktifkannya* | diturunkan saat dibaca | Governed (modul, bagian, atau sisi mati) | modul, bagian, atau sisi halaman itu mati | banner di atas setiap halaman modul itu (`ModuleOffNotice`) |
| *Dinonaktifkan — {nama}* | diturunkan saat dibaca | Governed (mati) | modul atau bagian sebuah tindakan mati | di slot tindakan itu sendiri, menggantikan tombolnya |
| Entri menu disembunyikan | diturunkan saat dibaca | Governed (mati) | modul, bagian, atau sisi sebuah rute mati | bilah samping; rute tetap terbuka hanya-baca bila dicapai |
| *{modul} ({kode}) sedang diaktifkan* · *Baca panduannya* | diturunkan saat dibaca | Governed (fase Sedang diaktifkan) | modul menyala dalam fase Sedang diaktifkan | banner di halamannya |
| *Belum pernah diubah — bawaan registri* / *Belum pernah diubah — bawaan registri yang berlaku.* | diturunkan saat dibaca | Governed (buku catatan belum memuat tindakan untuknya) | setiap modul hari ini | baris admin; **Riwayat aktivasi** di laci |
| *Selalu aktif — tidak dapat diubah.* | registri | PLT; sisi pembeli | selalu | baris admin; kartu sisi pembeli |
| *Tidak dapat dinonaktifkan selama {kode} tetap aktif — nonaktifkan dulu.* | diturunkan saat dibaca (formulir) | Governed | formulir mematikan modul selama modul yang membutuhkannya tetap menyala | di bawah baris admin, sebelum Simpan |
| *Menunggu Kepatuhan* / *Mengubah modul bukan peran Anda.* | diturunkan saat dibaca (kursi vs. atom) | — | kursi tidak memegang `module:set` | kepala papan; gerbang admin |
| *Tidak ada yang masuk…* | diturunkan saat dibaca (sesi) | — | kursi tidak menyebut orang | gerbang admin |
| *Ini adalah deployment produksi…* | diturunkan saat dibaca (lencana deployment) | — | deployment produksi dan orang contoh | gerbang admin |
| *(CONTOH)* setelah nama orang | diturunkan saat dibaca | Governed | tindakan dicatat oleh orang contoh | *Terakhir diubah oleh …*; riwayat di laci |
| *…tidak ditampilkan untuk kursi ini.* | diturunkan saat dibaca | — | kursi pemasok membuka laci (buku catatan adalah catatan tata kelola pembeli) | **Riwayat aktivasi** di laci |
<!-- src: src/components/ui-v2/ModuleOffNotice.tsx:43-76; src/components/layout-v2/AppShellV2.tsx:18-34; src/components/layout-v2/SidebarV2.tsx:191-197; src/context/ModuleActivationContext.tsx:65-80; src/pages-v2/ModulesAdmin.tsx:155-198,218,253,267-271; src/pages-v2/ModulesBoard.tsx:89-102; src/pages-v2/modules/ModuleDetailDrawer.tsx:131-137; src/services/data/mock/MockModuleService.ts:14-20; src/lib/i18n/modules.ts:220-226,259-267,277-288,291; src/lib/i18n/identity.ts:119 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `GRC` — Penerimaan barang & inspeksi. Belum ada tindakan untuknya hari ini; ia membaca bawaan registrinya (Aktif, menyala, kedua bagian menyala).

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Halaman | `routes` — `/buyer/goods-receipt` | Hanya-baca selama GRC mati; tidak pernah disembunyikan sebagai dokumen. |
| Proses | `flows` — penerimaan barang, baris penerimaan barang, penegakan | Setiap tindakan alur-alur ini ditolak dengan `MODULE_INACTIVE` selama GRC mati. |
| Bagian | `parts` — *Wizard inspeksi*, *Penahanan mutu* | Masing-masing mengatur sekumpulan tindakan penerimaan barang yang disebut namanya dan dapat diubah tersendiri. Pemeriksaan halal dan BPOM sengaja bukan bagian: menonaktifkan pemeriksaan kepatuhan tetap menjadi keputusan buku catatan penegakan. |
| Modul yang dibutuhkannya | `dependsOn` — Pengiriman & ASN (membutuhkannya), Kepatuhan & dokumen (membacanya) | GRC tidak dapat dinyalakan selama Pengiriman & ASN mati. |
| Modul yang membutuhkannya | diturunkan — Faktur & pembayaran membutuhkannya; Intelijen membacanya | GRC tidak dapat dimatikan selama Faktur & pembayaran menyala. |
| Tindakan di buku catatan | `code`, `phase`, `enabled`, `parts`, `reason`, `setBy`, `setAt`, `seq` | `parts` mencatat setiap bagian, bukan selisihnya; `setBy` adalah atribusi sesi (id orang, ditampilkan lewat penyelesai label, bukan nama yang disimpan), `setAt` jam pada saat tindakan, `seq` urutan kedatangan di store — tindakan yang lebih akhir menang. Hanya-tambah; tanpa pembaruan. |
| Tenant / pemilik | tidak ada (`readScopeOwner` bernilai null) | Catatan tata kelola pembeli: scope pemasok ditolak pada tahap scope, sama persis untuk kode nyata maupun kode karangan. Apa yang menyala dapat dibaca setiap kursi; siapa yang mengubahnya, hanya kursi pembeli. |
<!-- src: src/services/modules/registry.ts:76-97,240-250,256,267,345-358; src/services/modules/activation.ts:45-58; src/services/data/mock/moduleActivationTarget.ts:51-71; src/services/data/mock/MockModuleService.ts:6-20; src/pages-v2/modules/moduleLedger.ts:25-28; src/lib/i18n/modules.ts:171-172,205-206,256-257 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = `t_module_set`, `actor` = `buyer:all`, `ts`, `outcome` (dengan `reason` bila ditolak), `correlationId`-nya sendiri, orang dari sesi sebagai `attribution`, dan `subject` = `{ entity: 'moduleActivation', entityId: <kode atau sisi>, from: 'Governed', to: 'Governed' }`. Satu **Simpan perubahan** mengirim baris-barisnya satu per satu di bawah satu jangkar: `correlationId` tindakan pertama diteruskan sebagai `causationId` setiap tindakan berikutnya dalam penyimpanan yang sama, sehingga penyimpanan terbaca sebagai satu kelompok sementara setiap tindakan tetap dapat dilacak sendiri. Buku catatan itu sendiri adalah sejarah modul, dari yang tertua, ditampilkan dari yang terbaru di laci.

Urutan contoh untuk `GRC`, sebagaimana dihasilkan penguji pada deployment dev atau preview:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | — | penguji memakai pengguna contoh yang memegang kepatuhan (**Bertindak sebagai**) | tanpa tindakan; halaman admin menjadi dapat disunting | — |
| T+1 | Governed → Governed | buyer · compliance, orang contoh | baris GRC: *Penahanan mutu* dimatikan, alasan diisi, **Simpan perubahan** | `t_module_set` |
| T+2 | Governed → Governed (ditolak) | buyer · compliance | GRC diatur Direncanakan / Mati selama Faktur & pembayaran tetap menyala — `outcome: failed`, `POLICY_REJECTED:module_no_active_hard_dependants:…` | `t_module_set` |
| T+3 | Governed → Governed | buyer · compliance | satu penyimpanan: INV dan GRC diatur Direncanakan / Mati; INV dikirim lebih dulu; tindakan GRC membawa `correlationId` tindakan INV sebagai `causationId` | `t_module_set` ×2 |
| T+4 | Governed → Governed | buyer · compliance | GRC dikembalikan ke Aktif / Menyala (Pengiriman & ASN menyala, sehingga diterima; INV tetap mati) | `t_module_set` |

Setelah T+3, `/buyer/goods-receipt` menampilkan banner nonaktif, entri menunya hilang, dan setiap tindakan penerimaan barang mengembalikan `MODULE_INACTIVE:GRC`. Setelah T+4 halaman itu dapat dipakai lagi; faktur tetap hanya-baca sampai INV dinyalakan.
<!-- src: src/services/transitions/events.ts:26-60,85-123; src/services/query/commandHooks.ts:2078-2143; src/pages-v2/modules/adminModel.ts:121-134; src/services/data/mock/moduleActivationTarget.ts:147-161; src/services/modules/activation.ts:136-153; src/pages-v2/modules/moduleLedger.ts:21-23 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Semua kontrol di halaman admin nonaktif | baris gerbang berbunyi *Tidak ada yang masuk…* | kursi tidak menyebut orang (`NO_PERSON_IN_SESSION`) | pakai pengguna contoh di **Bertindak sebagai** pada panel identitas |
| Papan menampilkan *Menunggu Kepatuhan* alih-alih **Kelola modul** | kepala `/buyer/platform/modules` | kursi tidak memegang `module:set` | bertindak dari kursi yang memegang jalur kepatuhan |
| Kontrol nonaktif dengan *Ini adalah deployment produksi…* | baris gerbang; tidak ada lencana lingkungan di bilah atas | `module_set_not_sample_in_prod` — orang contoh tidak dapat mengubah modul di produksi | ubah pada deployment dev atau preview; produksi menunggu fitur masuk |
| Sebuah baris kembali dengan *Tidak dinonaktifkan: {kode} masih bergantung padanya.* | `POLICY_REJECTED:module_no_active_hard_dependants` | modul yang membutuhkan modul ini masih menyala | nonaktifkan modul itu dulu, atau dalam penyimpanan yang sama |
| Sebuah baris ditolak dengan menyebut modul yang mati | `POLICY_REJECTED:module_dependencies_enabled` | modul yang dibutuhkannya mati | aktifkan modul itu dulu, atau dalam penyimpanan yang sama |
| Dispatch buatan tangan ditolak *…is already {phase}, {on/off}, with these parts* (teks aturan dalam bahasa Inggris) | `POLICY_REJECTED:module_actually_changes` | tindakan tidak mengubah apa pun | tidak perlu apa-apa; halaman tidak pernah mengirim baris yang tidak berubah |
| Ditolak: *PLT is always on…* atau *the buyer side cannot be switched…* | `POLICY_REJECTED:module_known` | percobaan pada PLT atau sisi pembeli | memang tidak dapat diubah |
| Ditolak: *reason is blank…* | `POLICY_REJECTED:module_reason_authored` | alasan kosong atau hanya spasi | tulis mengapa platform berubah |
| Ditolak: fase tidak sesuai dengan menyala/mati, atau *a side has no phase* | `POLICY_REJECTED:module_phase_consistent` | payload buatan tangan | Aktif/Sedang diaktifkan dengan menyala, Direncanakan/Belum dijadwalkan dengan mati; tanpa fase untuk sisi |
| Ditolak: *… is not a part of …* | `POLICY_REJECTED:module_parts_known` | id bagian dari modul lain, atau bagian dikirim untuk sisi | gunakan bagian milik modul itu sendiri |
| Tindakan apa pun di tempat lain ditolak *Bagian platform ini sedang dinonaktifkan…* | `MODULE_INACTIVE:<sakelar>` | modul, bagian, atau sisi yang disebut mati | kursi kepatuhan mengaktifkannya di halaman admin |
| Dilempar `SCOPE_DENIED` | kode `DataError` | scope pemasok | hanya sisi pembeli |
| Dilempar `NOT_FOUND` | kode `DataError` | id entitas bukan kode modul atau sisi | gunakan kode registri |
| Semuanya kembali ke bawaan | setiap baris berbunyi *Belum pernah diubah — bawaan registri* | halaman dimuat ulang; buku catatan berada di memori | wajar di demo |
<!-- src: src/services/data/mock/moduleActivationTarget.ts:85-176; src/services/transitions/dispatcher.ts:600-637,798; src/services/transitions/refusals.ts:66-78; src/services/modules/deployment.ts:24-52; src/pages-v2/ModulesAdmin.tsx:119-128,182-198; src/pages-v2/ModulesBoard.tsx:89-102; src/lib/glossary/refusals.glossary.ts:48-51; src/lib/i18n/modules.ts:277-279,288,292; src/services/data/mock/stores/moduleActivationStore.ts:4-13 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Governed | `PLT`, `SUP`, `CMP`, `PSL`, `MAT`, `REQ`, `PLN`, `SDC`, `COM`, `SRC`, `CTR`, `ORD`, `SHP`, `GRC`, `INV`, `INT` | — | setiap kode modul registri menjawab Governed; kedua sisi (side:buyer, side:supplier) juga menjawab Governed. Buku catatan dibuka kosong, sehingga setiap modul membaca bawaan registrinya — Aktif, Menyala, setiap bagian menyala — dan kedua sisi menyala. PLT selalu aktif dan tidak dapat diubah; sisi pembeli tidak dapat diubah selama PLT menyala. INT tidak dibutuhkan modul mana pun, sehingga paling mudah dimatikan dan dinyalakan kembali. |
<!-- src: src/services/modules/registry.ts:50-54,70; src/services/data/mock/moduleActivationTarget.ts:39,52; src/services/data/mock/stores/moduleActivationStore.ts:11-20; src/services/modules/activation.ts:78-87 -->
