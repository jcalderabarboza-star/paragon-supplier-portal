---
entity: flowVersion
locale: id
title: Perubahan pada proses (versi alur)
wired: true
owner: portal
source_sha: 0531e094d401b8c51e320fd3151da6b72963ba47
transitions:
  - t_flowversion_create
  - t_flowversion_save
---

<!-- section:summary -->
## 1 · Apa proses ini

Perubahan pada sebuah proses adalah dokumen tersendiri. Perubahan menyebut satu proses dan mendaftar apa yang akan ditambahkannya di depan tindakan yang sudah dimiliki proses itu: langkah yang diselesaikan orang, pemeriksaan yang dinilai platform, dan percabangan yang menentukan langkah mana yang berlaku. Perubahan dapat menambah penolakan. Perubahan tidak pernah dapat menghilangkannya, dan tidak dapat menambah status, mengalihkan tindakan, atau memindahkan lajur.

Setiap perubahan adalah sebuah **versi**. Labelnya `<versi bawaan>.<n>`: perubahan pertama yang dirancang terhadap proses dengan versi bawaan 2 adalah `2.1`, berikutnya `2.2`. Angkanya dihitung per proses dan tidak pernah dipakai ulang. Id-nya `fv-<n>`. Store menetapkan id, label, dan setiap cap; orang yang merancang hanya menyebut proses mana dan apa nama perubahannya.

Siapa yang menyentuhnya: **lajur Kepatuhan pembeli** merancang perubahan (izin `flow:draft`). Sebuah lajur tidak boleh menjadi pihak yang mengubah proses yang mengikatnya, sehingga pengadaan, penerimaan, keuangan, perencanaan, dan pemohon tidak memegangnya. Admin dan Super Admin memegangnya sebagaimana mereka memegang setiap izin sisi pembeli. Setiap kursi dapat membaca tab **Perubahan**; hanya merancang yang merupakan tindakan satu lajur.

Penanda kejujuran, dinyatakan apa adanya:

- **Tidak ada isi versi yang berlaku.** Belum ada versi yang dapat diusulkan, disetujui, atau diaktifkan. Setiap proses berjalan seperti bawaannya, dan halaman menyatakannya.
- **Hanya membuat rancangan yang memiliki layar.** Menyimpan isi rancangan (`t_flowversion_save`) sudah dibangun dan belum memiliki layar; penyusun yang menyimpan rancangan hadir pada batch berikutnya (FB-2).
- **`Draft` belum memiliki jalan keluar.** Tindakan yang mengusulkan perubahan hadir bersama peninjauan dan persetujuan (FB-3). Sampai saat itu rancangan tetap rancangan. Hal ini dicatat sebagai sisi yang masih terbuka di sensus ujung-lepas, tidak disembunyikan.
- **Versi hanya berada di peramban ini** (`localStorage`, kunci `paragon.flowVersions`). Versi tetap ada setelah dimuat ulang. Versi tidak dibagikan kepada siapa pun, tidak berada di server, dan hilang bila data situs dihapus.
- **Tidak ada yang di-seed.** Daftar dibuka kosong; setiap versi di dalamnya dirancang di peramban ini.
- Perubahan dicatat atas nama orang yang merancangnya. Belum ada direktori pengguna, sehingga orang itu adalah identitas contoh yang dipilih di panel identitas, dan perubahan yang dirancang oleh orang contoh adalah peragaan. Kursi yang tidak menyebut siapa pun ditolak.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:1-65; src/services/flowBuilder/flowVersion.ts:1-15,92-150; src/services/flowBuilder/flowVersionStore.ts:1-24,41; src/services/transitions/businessRoles.ts:363-366; src/services/transitions/looseEndCensus.ts:328-340; src/lib/i18n/flowBuilder.ts:134-154; src/lib/i18n/processFlowPurpose.ts:713-714 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Draft | pembuatan (tindakan operator) | buyer · compliance | `t_flowversion_create` |
| 2 | Draft → Draft | mencatat fakta (mempertahankan status) · tidak aktif (belum ada layar) | buyer · compliance | `t_flowversion_save` |

**Percabangan**

- **Di Draft:** `t_flowversion_save` — kepatuhan — menggantikan isi rancangan; rancangan tetap rancangan. Tidak ada tindakan lain. `Draft` tidak memiliki jalan keluar dan mesin ini tidak memiliki akhir: mengusulkan perubahan hadir bersama FB-3.

Kedua tindakan ditolak bagi kursi yang tidak menyebut siapa pun (`flowversion_author_named`).
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:28-64; src/services/transitions/looseEndCensus.ts:328-340 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_flowversion_create — Buat rancangan <!-- transition:t_flowversion_create -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** buyer · compliance (atom `flow:draft`; Admin dan Super Admin juga memegangnya)
- **Dari → ke:** ∅ → Draft
- **Operator — di mana:** `/buyer/process-flows` → tab **Perubahan** → **Perubahan baru** (kanan atas kepala halaman) → pop-up **Perubahan baru** → **Buat rancangan**. Pop-up itu adalah dialog: ia mengambil fokus, dan Escape, tombol tutup, atau klik di luar menutupnya. Tombol itu berdiri di kepala halaman hanya selama tab **Perubahan** terbuka. Kursi yang tidak memegang `flow:draft` melihat, di tempat yang sama, **Mengubah proses adalah tindakan Kepatuhan** dengan notis serah-terima *Menunggu Kepatuhan*, dan tidak ada pop-up.
- **Operator — lakukan:** pilih proses dan beri nama perubahan, lalu tekan **Buat rancangan**. Perubahan dibuat sebagai rancangan kosong terhadap proses seperti bawaannya hari ini. Tidak ada yang berjalan berbeda.
- **Operator — isi:** **Proses** (`flow`) — daftarnya hanya menawarkan proses yang dapat ditulis oleh perintah, dengan tindakan yang dilakukan orang di layar, masing-masing ditampilkan dengan judul panduannya. **Judul** (`title`) — untuk apa perubahan ini, dalam beberapa kata; tidak boleh kosong. Tidak ada lagi yang ditanyakan: id, label, versi bawaan yang menjadi dasar rancangan, dan siapa yang merancang bukanlah isian.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** toast *"Versi {label} dari {process} dibuat sebagai rancangan."*; pop-up tertutup; baris baru di tabel pada tab **Perubahan** dengan **Versi** (`<versi bawaan>.<n>`), **Proses**, **Judul**, **Status** *Rancangan*, **Menambahkan** *0 elemen*, **Dirancang oleh** (orang contoh yang sedang diperankan kursi) dan **Dirancang**. Baris *"Belum ada perubahan yang dirancang."* hilang. Versinya ada di `localStorage` di bawah `paragon.flowVersions` dan masih terdaftar setelah dimuat ulang. Membuka sebuah alur di tab **Katalog** tetap berbunyi *"Bawaan · versi {version} — berlaku"* — rancangan itu tidak mengubah apa pun.
- **Penguji — peristiwa pemicu:** `t_flowversion_create`
- **Pemeriksaan yang dapat menolak:** `flowversion_author_named` — kursinya harus menyebut seseorang (`FLOWVERSION_AUTHOR_UNATTRIBUTED`). Di atas **Buat rancangan**, pop-up menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. Tombol tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* `flowversion_process_writable` — diperiksa dalam urutan ini: prosesnya harus terdaftar (`FLOWVERSION_PROCESS_UNKNOWN`); prosesnya tidak boleh `flowVersion` itu sendiri (`FLOWVERSION_PROCESS_SELF`, toast *"Ditolak: perubahan tidak dapat dirancang terhadap proses yang digunakan untuk mengubah proses."*); harus ada perintah yang dapat menulis melaluinya (`FLOWVERSION_PROCESS_NOT_WRITABLE`); dan judul tidak boleh kosong (`FLOWVERSION_TITLE_BLANK`, toast *"Ditolak: perubahan memerlukan judul agar dapat ditemukan kembali."*). Judul yang dibiarkan tanpa isi ditolak lebih awal, oleh dispatcher, sebagai `MISSING_FIELDS:title`. Pada setiap penolakan, pop-up tetap terbuka dan tidak ada yang dibuat.
- **Glosarium:** `ROLE_NOT_PERMITTED` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Kejujuran:** pop-up menyatakan sebelum tindakan di mana rancangan berada — *"Rancangan disimpan di peramban ini dan tetap ada setelah dimuat ulang — hanya di peramban ini, tidak dibagikan, tidak di server."* — dan apa yang dilakukannya: *"Perubahan dibuat sebagai rancangan kosong terhadap proses seperti bawaannya hari ini; tidak ada yang berjalan berbeda."* Rancangan yang dibuat kosong dan tetap kosong, karena belum ada layar yang menyimpan isi ke dalamnya. Tanggal **Dirancang** adalah waktu kini yang dinyatakan portal, bukan jam dinding. Formulir tidak dapat menyebut proses yang tidak terdaftar atau tidak dapat ditulis, maupun proses yang digunakan untuk mengubah proses; tindakan tetap menolak masing-masing.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:38-50; src/services/data/mock/flowVersionTarget.ts:16-36,55-69; src/services/transitions/policies.ts:2864-2873,2949-2956; src/services/transitions/dispatcher.ts:824-837; src/services/flowBuilder/flowVersionStore.ts:246-264; src/services/query/commandHooks.ts:1383-1399; src/pages-v2/ProcessFlows.tsx:316-337,364-378,603-613; src/pages-v2/process-flows/ChangesView.tsx:105-195; src/pages-v2/process-flows/flowVersionRefusal.ts:10-28; src/lib/i18n/flowBuilder.ts:165-190; src/lib/i18n/identity.ts:143-147 -->

### t_flowversion_save — Simpan rancangan <!-- transition:t_flowversion_save -->

- **Jenis langkah:** mencatat fakta (mempertahankan status) · tidak aktif (belum ada layar)
- **Peran:** buyer · compliance (atom `flow:draft`; Admin dan Super Admin juga memegangnya)
- **Dari → ke:** Draft → status yang sama
- **Operator — di mana:** belum ada layar hari ini. Di `/buyer/process-flows` → tab **Perubahan**, rancangan dapat dibuat dan didaftar; rancangan tidak dapat dibuka atau disunting. Penyusun yang menyimpan rancangan hadir pada batch berikutnya (FB-2).
- **Operator — lakukan:** belum ada. Ketika penyusun hadir, menyimpan menggantikan seluruh isi rancangan — langkah, percabangan, dan pemeriksaannya — dengan yang disusun. Menyimpan bukan memutuskan: rancangan tetap rancangan dan tidak ada yang mulai berlaku.
- **Operator — isi:** `content` — seluruh daftar langkah, percabangan, dan pemeriksaan, beserta proses dan versi bawaan yang menjadi pokok perubahan. Keduanya ditetapkan saat rancangan dibuat dan penyimpanan tidak dapat mengubahnya. Belum ada layar yang mengisinya hari ini.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** belum dapat dikonfirmasi di layar hari ini. Setelah penyimpanan berjalan, hitungan **Menambahkan** pada baris menunjukkan jumlah langkah, percabangan, dan pemeriksaan yang disimpan, dan catatannya membawa siapa yang menyimpan dan kapan (`savedBy`, `savedAt`); label, id, dan siapa yang merancang tidak berubah.
- **Penguji — peristiwa pemicu:** `t_flowversion_save`
- **Pemeriksaan yang dapat menolak:** `flowversion_author_named` — kursinya harus menyebut seseorang (`FLOWVERSION_AUTHOR_UNATTRIBUTED`). `flowversion_content_well_formed` — isinya harus berupa daftar langkah, percabangan, dan pemeriksaan (`FLOWVERSION_CONTENT_MALFORMED`), dan harus tetap mengenai proses dan versi bawaan tempat perubahan itu dibuat (`FLOWVERSION_CONTENT_MOVED`). Id yang bukan versi di peramban ini adalah `NOT_FOUND`. Aturan R01–R19 pada tab **Perubahan** **tidak** menolak penyimpanan: rancangan boleh belum selesai.
- **Glosarium:** `ROLE_NOT_PERMITTED` · `NOT_FOUND` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Kejujuran:** tindakan ini sudah dibangun dan **belum memiliki layar**; tidak ada apa pun di portal yang menjalankannya hari ini. Rancangan tersimpan yang melanggar aturan prosesnya tetap disimpan dan disebut di bawah **Sebagian perubahan tidak lagi mematuhi aturan prosesnya** — dilaporkan, tidak ditolak dan tidak dibuang. Apa pun isi sebuah rancangan, tidak satu pun berlaku.
<!-- src: src/services/transitions/flows/flowVersion.flow.ts:51-63; src/services/data/mock/flowVersionTarget.ts:38-53,70-72; src/services/transitions/policies.ts:2864-2873,2949-2956; src/services/flowBuilder/flowVersion.ts:92-131,217-230; src/services/flowBuilder/flowVersionStore.ts:265-273; src/services/flowBuilder/liveWorld.ts:59-83; src/pages-v2/process-flows/ChangesView.tsx:225-233,286-310; src/lib/i18n/flowBuilder.ts:187-190 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Kursi memegang `flow:draft` atau tidak (sebelum tindakan).** Cabang A — kursi memegangnya: **Perubahan baru** berdiri di kepala halaman pada tab **Perubahan**. Cabang B — tidak memegangnya: kepala halaman berbunyi **Mengubah proses adalah tindakan Kepatuhan** dengan *Menunggu Kepatuhan*, dan tidak ada pop-up bagi kursi itu. Tab itu sendiri, daftarnya, dan aturannya dapat dibaca setiap kursi.
- **Kursi tidak menyebut siapa pun (pengecualian).** `POLICY_REJECTED:flowversion_author_named` (`FLOWVERSION_AUTHOR_UNATTRIBUTED`) — **Buat rancangan** ditekan dari kursi sebagaimana dibuka, tanpa pengguna contoh yang dipilih di panel identitas. Tidak ada yang dibuat dan tidak ada yang dicap. Pilih pengguna contoh, lalu buat rancangannya lagi.
- **Judul kosong atau tidak ada (pengecualian).** Judul yang hanya berisi spasi ditolak oleh `flowversion_process_writable` (`FLOWVERSION_TITLE_BLANK`). Judul yang dibiarkan tanpa isi ditolak oleh dispatcher sebagai `MISSING_FIELDS:title`, sebelum pemeriksaan mana pun berjalan.
- **Proses yang tidak dapat diubah (pengecualian).** Proses yang tidak dimiliki platform (`FLOWVERSION_PROCESS_UNKNOWN`) atau yang tidak dapat ditulis oleh perintah mana pun (`FLOWVERSION_PROCESS_NOT_WRITABLE`). Formulir tidak menawarkan keduanya; payload buatan tangan yang menyebutnya ditolak.
- **Perubahan terhadap proses yang mengubah proses (pengecualian).** Payload yang menyebut `flowVersion` itu sendiri ditolak (`FLOWVERSION_PROCESS_SELF`): perubahan tidak dapat dirancang terhadap proses yang digunakan untuk mengubah proses. Daftar **Proses** tidak menawarkannya; tindakan tetap menolaknya.
- **Payload yang menyebut siapa yang bertindak, atau id atau label (pengecualian).** Payload yang membawa kunci yang disimpan platform untuk orang yang bertindak ditolak oleh dispatcher (`ACTOR_IN_PAYLOAD`). Id atau label di dalam payload diabaikan: store yang menetapkan keduanya.
- **Penyimpanan yang memindahkan perubahan (pengecualian, belum ada layar hari ini).** Isi yang menyebut proses lain, atau versi bawaan lain, ditolak (`FLOWVERSION_CONTENT_MOVED`); isi yang bukan daftar langkah, percabangan, dan pemeriksaan ditolak (`FLOWVERSION_CONTENT_MALFORMED`).
- **Versi yang tidak lagi mematuhi aturannya (diturunkan, bukan tindakan).** Setiap kali daftar dibaca, setiap versi tersimpan diperiksa terhadap aturan sebagaimana adanya sekarang. Versi yang melanggar aturan berjenis *Kesalahan* tetap disimpan, didaftar, dan disebut beserta aturan yang dilanggarnya. Tidak ada yang ditolak dan tidak ada yang dihapus.
- **Baris tersimpan yang bukan versi (diturunkan, bukan tindakan).** Baris yang id, label, status, judul, atau capnya tidak saling cocok ditolak saat dibaca, disebut beserta alasannya, dan tetap disimpan di penyimpanan. Id dan labelnya tidak diberikan lagi.
- **Mengusulkan, menyetujui, mengaktifkan, mengembalikan.** Belum dibangun. Tidak ada tindakan dan tidak ada layar untuk satu pun di antaranya.
<!-- src: src/pages-v2/ProcessFlows.tsx:364-378; src/services/data/mock/flowVersionTarget.ts:16-53; src/services/transitions/dispatcher.ts:824-837; src/services/flowBuilder/flowVersionStore.ts:96-110,163-202; src/services/flowBuilder/liveWorld.ts:59-83; src/services/transitions/looseEndCensus.ts:328-340 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| **Disimpan di peramban ini** — *"Perubahan disimpan di peramban ini dan tetap ada setelah dimuat ulang. Perubahan tidak dibagikan kepada siapa pun dan tidak berada di server. Perubahan yang dirancang oleh orang contoh adalah peragaan."* | notis tetap | — | selalu | puncak tab **Perubahan** |
| *"Tidak ada yang berlaku di sini: setiap proses berjalan seperti bawaannya."* | pernyataan tetap | — | selalu | di bawah **Perubahan pada proses** pada tab **Perubahan** |
| *"Bawaan · versi {version} — berlaku"* | diturunkan saat dibaca | — | selalu, pada setiap proses | setiap kartu alur dan kepala alur pada tab **Katalog** |
| **Perubahan tersimpan tidak dapat dibaca** | diturunkan saat dibaca | — | `localStorage` memuat data di bawah `paragon.flowVersions` yang tidak dapat diurai; tidak ada versi yang didaftar (tidak sama dengan tidak memiliki satu pun) | notis pada tab **Perubahan** |
| **Sebagian perubahan tersimpan tidak dimuat** | diturunkan saat dibaca | — | baris tersimpan ditolak saat dibaca; masing-masing didaftar beserta alasannya dan tetap disimpan | notis pada tab **Perubahan** |
| **Sebagian perubahan tidak lagi mematuhi aturan prosesnya** | diturunkan saat dibaca | Draft | versi tersimpan melanggar aturan berjenis *Kesalahan* hari ini; masing-masing disebut sebagai *"Versi {label} dari {process} — {code}: {element}"* beserta kalimat aturannya | notis pada tab **Perubahan** |
| Menunggu Kepatuhan (serah-terima) | diturunkan saat dibaca | — | kursi tidak memegang `flow:draft` | kepala halaman, di tempat **Perubahan baru** |
| *"Ini akan dicatat atas nama {person}."* | diturunkan saat dibaca (kursi) | ∅ | kursi memegang `flow:draft` dan bertindak sebagai pengguna contoh | pop-up, di atas **Buat rancangan** |
| *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."* | diturunkan saat dibaca (kursi); penolakan (`flowversion_author_named`) | ∅ | kursi memegang `flow:draft` dan tidak menyebut siapa pun | pop-up, di atas **Buat rancangan**; saat ditekan, toast kegagalan |
| Pembacaan ditangguhkan | diturunkan saat dibaca | — | penyimpanan dibaca sebelum ada proses yang terdaftar, sehingga baris tidak diterima maupun ditolak | tanpa permukaan (status baca store `suspended`) |
<!-- src: src/pages-v2/process-flows/ChangesView.tsx:171-175,187-195,248-311; src/services/flowBuilder/flowVersionStore.ts:45-54,117-161; src/services/flowBuilder/liveWorld.ts:63-83; src/lib/i18n/flowBuilder.ts:133-163; src/lib/i18n/identity.ts:143-147; src/lib/i18n/roles.ts:283-284 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** tidak ada yang di-seed. Versi pertama yang dirancang di sebuah peramban adalah `fv-1`; labelnya bergantung pada proses yang dipilih (`<versi bawaan>.1`).

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Proses yang diubahnya (registri alur) | `content.entity` | dibaca dari registri; perubahan tidak pernah menulis ke sana, sehingga katalog bawaan tetap seperti yang dinyatakan kode |
| Versi bawaan yang menjadi dasar rancangan | `content.baseVersion` | dibaca dari proses saat rancangan dibuat, tidak pernah diambil dari payload; ia adalah angka pertama pada label |
| Nama proses di layar | judul panduan proses | daftar **Proses** dan kolom **Proses** menampilkan judul panduan dalam bahasa pembaca |
| Siapa yang merancang, siapa yang terakhir menyimpan | `createdBy`, `savedBy` | orang pada kursi saat tindakan dilakukan; ditampilkan melalui satu penyelesai label orang, sehingga orang contoh membawa penanda contoh |
| Penyimpanan peramban | `paragon.flowVersions` | `{ v, versions, counters }`; penghitungnya menjaga agar angka per proses tidak pernah berjalan mundur |
| Aturan yang harus dipatuhi perubahan | kode aturan R01–R08, R12–R19 | didaftar pada tab **Perubahan** di bawah **Aturan yang harus dipatuhi perubahan**; aturan menghasilkan temuan, bukan penolakan |
| Tautan ke satu versi | `?view=changes&version=<id>` | membuka tab **Perubahan** dengan baris itu ditandai sebagai yang sedang dituju; versi yang tidak dimiliki peramban ini membuka tab **Katalog** |
| Jejak audit | `TransitionEvent` untuk setiap tindakan | satu peristiwa per pembuatan dan per penyimpanan, termasuk penolakan |
| Sensus ujung-lepas | `flowVersion` · `Draft` | jalan keluar dari `Draft` yang belum ada dicatat di sana sebagai sisi yang belum ditulis |

Hanya tampilan: **Menambahkan** dihitung saat dibaca dari langkah, percabangan, dan pemeriksaan yang dimuat versi. **Status** menampilkan *Rancangan*. Id, label, urutan, dan cap ditetapkan store, tidak pernah menjadi isian.
<!-- src: src/services/flowBuilder/flowVersion.ts:92-150; src/services/flowBuilder/flowVersionStore.ts:41,204-215,246-264; src/services/data/mock/flowVersionTarget.ts:61-69; src/services/flowBuilder/validateVersion.ts:33-50; src/pages-v2/process-flows/ChangesView.tsx:52-56,210-246; src/pages-v2/ProcessFlows.tsx:316-337; src/services/data/mock/documentIds.ts:79-80; src/guides/index.ts:73 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` (kursi, bukan orang), `ts`, `outcome`, satu `correlationId` per perintah. Kolom terpisah `attribution` mencatat siapa yang dapat disebut. Penolakan juga ditulis, beserta alasannya. Versinya sendiri membawa `createdBy` dan `createdAt`, serta `savedBy` dan `savedAt` setelah pernah disimpan. Tidak ada tampilan riwayat per versi; tab **Perubahan** menampilkan setiap versi sebagaimana adanya sekarang.

Urutan kerja, sebagaimana akan dihasilkan penguji yang memegang Kepatuhan di peramban yang belum memiliki versi:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ (ditolak) | buyer · compliance, kursi tidak menyebut siapa pun | **Perubahan baru** → pilih proses, tulis judul → **Buat rancangan** | `t_flowversion_create`, `outcome: failed`, `POLICY_REJECTED:flowversion_author_named` |
| T+1 | ∅ → Draft | buyer · compliance, bertindak sebagai pengguna contoh | sama, setelah memilih pengguna contoh di panel identitas | `t_flowversion_create` — versi `fv-1`, label `<versi bawaan>.1` |
| T+2 | Draft (tidak berubah) | — | muat ulang halaman dan buka tab **Perubahan**: baris masih terdaftar, dibaca kembali dari `paragon.flowVersions` dan diperiksa lagi | — (tanpa peristiwa) |
| T+3 | ∅ → Draft | buyer · compliance, bertindak sebagai pengguna contoh | rancangan kedua terhadap proses yang sama | `t_flowversion_create` — versi `fv-2`, label `<versi bawaan>.2` |

Tidak ada langkah dalam urutan ini yang menyimpan rancangan: `t_flowversion_save` belum memiliki layar hari ini.
<!-- src: src/services/transitions/events.ts:26-61,98; src/services/flowBuilder/flowVersion.ts:116-131; src/services/flowBuilder/flowVersionStore.ts:246-273 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada tombol **Perubahan baru** | kepala halaman tidak menampilkan apa pun di kanan | tab **Katalog** sedang terbuka | buka tab **Perubahan**; tombol itu milik tab tersebut |
| **Mengubah proses adalah tindakan Kepatuhan** dengan *Menunggu Kepatuhan* di tempat tombol | kepala halaman pada tab **Perubahan** | kursi tidak memegang `flow:draft` | buka avatar dan pilih Kepatuhan (kontrol demo) |
| Toast *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* | `POLICY_REJECTED:flowversion_author_named` (`FLOWVERSION_AUTHOR_UNATTRIBUTED`); baris di atas **Buat rancangan** sudah menyatakannya | kursi tidak menyebut siapa pun | pilih pengguna contoh di panel identitas, lalu tekan **Buat rancangan** lagi; tidak ada yang dibuat |
| Toast *"Ditolak: perubahan memerlukan judul agar dapat ditemukan kembali."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_TITLE_BLANK`) | judul hanya berisi spasi | tulis judul |
| Toast kegagalan yang menyebut judul belum diisi | `MISSING_FIELDS:title` | judul dibiarkan tanpa isi | tulis judul |
| Toast *"Ditolak: perubahan tidak dapat dirancang terhadap proses yang digunakan untuk mengubah proses."* | `POLICY_REJECTED:flowversion_process_writable` (`FLOWVERSION_PROCESS_SELF`) | payload buatan tangan menyebut `flowVersion` sebagai prosesnya; daftar **Proses** tidak menawarkannya | pilih proses lain; proses ini tidak dapat diubah melalui sebuah perubahan |
| Proses yang diinginkan tidak ada di daftar **Proses** | daftarnya lebih pendek daripada tab **Katalog** | tidak ada perintah yang dapat menulis melalui proses itu, proses itu tidak memiliki tindakan yang dilakukan orang di layar, atau proses itu adalah proses yang mengubah proses | wajar; langkah di sana tidak akan pernah dapat dipenuhi |
| Rancangan tidak dapat dibuka, disunting, atau diberi langkah | baris pada tab **Perubahan** bukan tautan dan **Menambahkan** berbunyi *0 elemen* | menyimpan rancangan belum memiliki layar (FB-2) | wajar hari ini |
| Tidak ada cara mengusulkan, menyetujui, atau mengaktifkan perubahan | tidak ada tombol seperti itu di mana pun | belum dibangun (FB-3 dan seterusnya); `Draft` tidak memiliki jalan keluar | wajar hari ini; setiap proses berjalan seperti bawaannya |
| Sebuah proses tetap berperilaku seperti sebelumnya setelah rancangan dibuat | tab **Katalog** berbunyi *"Bawaan · versi {version} — berlaku"* | tidak ada isi versi yang berlaku | wajar hari ini |
| Daftar kosong di peramban lain atau di komputer lain | *"Belum ada perubahan yang dirancang."* | versi berada di peramban yang merancangnya; tidak ada yang di-seed dan tidak ada yang dibagikan | rancang lagi di peramban itu |
| Daftar kosong setelah data situs dihapus | *"Belum ada perubahan yang dirancang."* | menghapus data situs menghapus `paragon.flowVersions` | wajar; versinya sudah hilang |
| Rancangan hilang setelah dimuat ulang, tanpa notis | rancangan terdaftar sampai halaman dimuat ulang | peramban tidak mengizinkan penulisan ke penyimpanan (penyimpanan dinonaktifkan atau penuh), sehingga rancangan hanya hidup selama halaman itu terbuka | izinkan penyimpanan situs untuk portal, lalu rancang lagi |
| Notis **Perubahan tersimpan tidak dapat dibaca** | tab **Perubahan** | data di bawah `paragon.flowVersions` tidak dapat diurai | merancang perubahan akan menggantikan yang tidak dapat dibaca |
| Notis **Sebagian perubahan tersimpan tidak dimuat** | tab **Perubahan**, baris didaftar beserta alasan | penyimpanan yang disunting tangan: sebuah baris bukan versi, atau id, label, status, judul, atau capnya tidak saling cocok | perbaiki baris itu di penyimpanan atau biarkan; baris tetap disimpan, dan id serta labelnya tidak dipakai ulang |
| Notis **Sebagian perubahan tidak lagi mematuhi aturan prosesnya** | tab **Perubahan**, masing-masing disebut dengan kode aturan | prosesnya bergeser di bawah perubahan itu, atau isi tersimpan melanggar aturan berjenis *Kesalahan* | baca aturannya di bawah **Aturan yang harus dipatuhi perubahan**; versi tetap disimpan dan tidak ada yang berlaku dalam keadaan mana pun |
| Tautan ke sebuah versi membuka tab **Katalog** | alamatnya membawa `?view=changes&version=<id>` | peramban ini tidak memiliki versi itu | buka tautan di peramban yang merancangnya |
<!-- src: src/pages-v2/ProcessFlows.tsx:316-337,364-378; src/pages-v2/process-flows/ChangesView.tsx:119-150,256-329; src/services/data/mock/flowVersionTarget.ts:16-53; src/services/flowBuilder/flowVersionStore.ts:117-142,204-215; src/services/modules/registry.ts:125-136; src/lib/i18n/flowBuilder.ts:138-140,156-163,177-190 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Draft | — | — | tidak ada fixture — tidak ada yang di-seed dan store dibuka kosong. Buat satu: ambil Kepatuhan, pilih pengguna contoh, lalu **Perubahan** → **Perubahan baru** → **Buat rancangan**. Versi pertama di sebuah peramban adalah `fv-1` dengan label `<versi bawaan>.1`; ia berada di `localStorage` peramban itu di bawah `paragon.flowVersions` |
<!-- src: src/services/data/mock/documentIds.ts:79-80; src/services/flowBuilder/flowVersionStore.ts:41,246-264 -->
