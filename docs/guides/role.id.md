---
entity: role
locale: id
title: Peran khusus (salin-dan-tambah)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_role_grant
---

<!-- section:summary -->
## 1 · Apa proses ini

Salinan satu paket izin dengan izin tambahan di atasnya, disimpan sebagai catatan tentang apa yang disalin dan oleh siapa — sehingga kursi yang dibuat seseorang Selasa lalu terbaca berbeda dari kursi standar.

Entitasnya adalah **peran sistem yang disalin** (induk). Peran sistem portal adalah paket izin yang terkompilasi — di sisi pembeli `buyer` (jangkar yang tidak memberikan apa pun), enam jalur `procurement`, `receiving`, `finance`, `compliance`, `planning`, `requisitioner`, dan `buyer_all`; di sisi pemasok `supplier` (jangkar), `commercial`, `fulfilment`, `back_office`; serta `admin`, yang menjangkau kedua tenansi dan merupakan satu-satunya peran yang tidak pernah dapat disalin. Sebuah **peran khusus** disimpan sebagai `{ parent, adds }` — rujukan ke induknya ditambah izin yang ditambahkan — tidak pernah sebagai potret izin, sehingga ketika induk memperoleh izin baru, setiap salinannya ikut memperolehnya. Aturan penggabungannya adalah gabungan (union): peran khusus selalu merupakan superset dari induknya. Memperluas tidak pernah menghapus apa pun; peran khusus tidak dapat menjangkau sisi lain.

Siapa yang menyentuhnya: **jalur kepatuhan pembeli** membuat peran khusus. Siapa pun yang dapat menyunting peran dapat memberikan tindakan apa pun kepada dirinya sendiri, sehingga pengadaan tidak memegang ini — itu akan membuat pihak yang sama menurunkan standar yang mengukurnya. Setiap kursi dapat membaca katalog di `/buyer/roles`; membuat adalah tindakan satu jalur, dan panelnya menyebut jalur siapa.

Penanda kejujuran. Mesin satu-status (`Defined`): verba menambahkan catatan pemberian dan tidak mengubah apa pun pada induk. Peran khusus **disimpan di peramban ini saja** (`localStorage`, kunci `paragon.customRoles`) — bertahan setelah dimuat ulang, tidak dibagikan kepada siapa pun, tidak berada di server, dan hilang bila data situs dihapus; peran sistem tidak pernah ditulis ke sana. Pemberian dicatat atas nama orang yang melakukannya: belum ada direktori pengguna, sehingga orang itu adalah identitas contoh yang dipilih di panel identitas, dan kursi yang tidak menyebut siapa pun ditolak (`role_granter_named`); panel menyatakan yang mana dari keduanya kursi ini sebelum tindakan. **Menugaskan peran khusus ke sebuah kursi belum dibangun** — panel identitas hanya mendaftar peran sistem — sehingga peran khusus hari ini adalah definisi yang terkatalog dan tercatat, bukan kursi yang dibuka seseorang.
<!-- src: src/services/transitions/flows/role.flow.ts:1-99; src/services/transitions/customRoles.ts:1-104,154,427-433; src/services/transitions/businessRoles.ts:484-510,582-583,700-707; src/lib/i18n/processFlowPurpose.ts:332-336; src/lib/i18n/roles.ts:195-244 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Defined | peran sistem ada karena terkompilasi (tanpa verba pembuatan; induk yang tak dikenal adalah `NOT_FOUND`) | — | — |
| 1 | Defined → Defined | mencatat fakta (mempertahankan status): peran khusus yang menyalin induk ini diberikan | buyer · compliance | `t_role_grant` |

**Percabangan**

- **Di Defined:** `t_role_grant` — kepatuhan — ketika dibutuhkan kursi yang memegang satu paket ditambah beberapa izin dari tempat lain di sisi yang sama. Induk tidak berubah; hanya buku catatannya yang bertambah. Tidak ada jalan keluar lain. Ditolak bagi kursi yang tidak menyebut siapa pun (`role_granter_named`).
<!-- src: src/services/transitions/flows/role.flow.ts:56-99; src/services/data/mock/MockCommandService.ts:1644-1663 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_role_grant — Buat peran <!-- transition:t_role_grant -->

- **Jenis langkah:** mencatat fakta (mempertahankan status)
- **Peran:** buyer · compliance (atom `role:grant`)
- **Dari → ke:** Defined → status yang sama
- **Operator — di mana:** `/buyer/roles` → panel **Buat peran khusus** (hanya ditampilkan kepada kursi yang memegang `role:grant`; setiap kursi lain melihat **Mengubah peran adalah tindakan kepatuhan** dengan notis *Menunggu Kepatuhan* dan satu baris yang menjelaskan bahwa pengganti kursi demo memungkinkan Anda mengambil peran itu sendiri) → **Buat peran**.
- **Operator — lakukan:** Salin satu peran sistem dan tambahkan izin padanya. Pilih induk di bawah **Salin dari**; chip **Izin yang ditambahkan** hanya menawarkan izin di sisi yang sama yang belum dipegang induk. Peran baru muncul di katalog dengan lencana **Peran khusus** dan terbuka di `/buyer/roles/:roleId` seperti peran lainnya.
- **Operator — isi:** **Salin dari** (induk — ia adalah entitasnya, bukan kolom), **Kode peran** (`roleId`: huruf kecil, angka dan tanda hubung, 2–48 karakter), **Nama tampilan** dan **Deskripsi** (masing-masing 2–80 karakter, teks pengguna, ditampilkan apa adanya dalam kedua bahasa), dan sekurang-kurangnya satu izin di bawah **Izin yang ditambahkan** (`adds` — daftar kosong ditolak sebagai kolom yang kurang, karena salinan yang tidak menambahkan apa pun hanyalah nama kedua bagi induknya).
- **Penguji — status yang diharapkan:** Defined
- **Penguji — konfirmasi:** toast *Peran {id} dibuat…*; ubin **Peran** dan hitungan pemisahnya di katalog naik; baris membawa **Peran khusus**; halaman rincian mendaftar izin induk ditambah tambahannya; definisinya ada di `localStorage` di bawah `paragon.customRoles` dan masih ada setelah dimuat ulang.
- **Penguji — peristiwa pemicu:** `t_role_grant`
- **Pemeriksaan yang dapat menolak:** `role_granter_named` — kursinya harus menyebut seseorang (`ROLE_GRANTER_UNATTRIBUTED`); tidak ada peran yang disimpan dan tidak ada yang dicap. Di atas **Buat peran**, panel menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. Tombol tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast kegagalan berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* `role_grant_governed` — induk harus peran sistem dan harus berada di satu sisi (`admin` menjangkau keduanya dan tidak dapat disalin); kode peran harus slug yang valid, bukan id peran sistem, bukan `automation`, dan belum pernah diberikan; nama tampilan dan deskripsi harus 2–80 karakter dan tidak boleh diawali namespace terjemahan aplikasi; setiap izin yang ditambahkan harus izin yang dibutuhkan oleh suatu transisi, belum dipegang induk, memiliki pemilik manusia (izin khusus-mesin ditolak), dan berada di sisi induk (izin lintas-tenansi ditolak dengan menyebut namanya); dan scope harus membawa aktor — hook ini sendiri akan menerima `UNATTRIBUTED` yang eksplisit, tetapi `role_granter_named` berjalan lebih dulu dan menolaknya.
- **Glosarium:** ROLE_NOT_PERMITTED · MISSING_FIELDS · POLICY_REJECTED · SCOPE_DENIED · NOT_FOUND · NO_PERSON_IN_SESSION
- **Kejujuran:** pemberian dicatat atas nama identitas contoh yang sedang diperankan kursi — panel menyebutnya sebelum tindakan, atau menyatakan bahwa kursi ini tidak menyebut siapa pun dan akan ditolak. Baris terpisah di panel menyatakan di mana pemberian itu berada: *"Pemberian ini disimpan di peramban ini dan akan bertahan setelah dimuat ulang — lokal untuk peramban ini saja, tidak dibagikan kepada siapa pun, tidak disimpan di server."* Toast keberhasilan menyatakan hal yang sama: *Peran {id} dibuat. Berlaku sekarang dan tersimpan di peramban ini.* Store memvalidasi ulang setiap baris tersimpan saat dibaca dengan predikat yang sama yang dipakai verba, dan katalog menampilkan notis bila data tersimpan tidak terbaca atau ada baris yang ditolak. Tidak ada layar yang menugaskan peran baru ke sebuah kursi.
<!-- src: src/services/transitions/flows/role.flow.ts:65-97; src/services/transitions/policies.ts:389-470; src/services/transitions/customRoles.ts:468-553; src/services/data/mock/MockCommandService.ts:1644-1663; src/services/query/commandHooks.ts:972-997; src/pages-v2/roles/CreateRolePanel.tsx:74-266; src/pages-v2/RolesCatalogue.tsx:80,185-200; src/lib/i18n/roles.ts:208-256 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Tambahan sesisi atau lintas-tenansi (di Defined).** Cabang A — `t_role_grant` dengan izin sesisi — **Kapan:** tambahannya dipegang oleh suatu peran di sisi induk; diterima. Cabang B — induk sisi pembeli dengan izin sisi pemasok (atau sebaliknya) — **Kapan:** payload buatan tangan menyebutnya; ditolak per izin dengan menyebut namanya (`'<atom>' is a supplier-side permission and '<parent>' is buyer-side`). Formulir tidak dapat membentuk kasus ini; verba tetap menolaknya.
- **Menyalin `admin` (pengecualian).** Ditolak: `admin` menjangkau kedua tenansi dan salinannya pun akan begitu.
- **Menambahkan yang sudah dipegang induk (pengecualian).** Ditolak: tambahan harus menambahkan sesuatu.
- **Menambahkan izin khusus-mesin (pengecualian).** Ditolak: izin yang hanya dipegang oleh grant otomasi (target kaskade dan fakta eksternal) tidak memiliki pemilik manusia.
- **Tambahan kosong (pengecualian).** `MISSING_FIELDS:adds` dari dispatcher, sebelum kebijakan mana pun berjalan.
- **Kode duplikat atau terpesan (pengecualian).** Kode yang sudah diberikan, id peran sistem, atau `automation` ditolak dengan menyebut namanya.
- **Kursi tidak menyebut siapa pun (pengecualian).** `POLICY_REJECTED:role_granter_named` (`ROLE_GRANTER_UNATTRIBUTED`) — **Buat peran** ditekan dari kursi sebagaimana dibuka, tanpa pengguna contoh yang dipilih di panel identitas. Tidak ada yang disimpan ke `paragon.customRoles` dan tidak ada yang dicap; pilih pengguna contoh, lalu buat perannya lagi.
- **Pergeseran induk (diturunkan, bukan verba).** Bila induk suatu saat kehilangan izin lintas deploy, peran khusus mempertahankannya dan menyebutnya sebagai dipertahankan (`parentAtomsAtGrant` adalah garis dasarnya). Tidak terjangkau hari ini — paket adalah konstanta beku — dan tidak memiliki permukaan berdasarkan keputusan.
<!-- src: src/services/transitions/policies.ts:405-470; src/services/transitions/customRoles.ts:26-42,415-425,495-553; src/services/transitions/flows/role.flow.ts:77-83 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Lencana Peran khusus | diturunkan saat dibaca | Defined | peran bukan peran sistem | baris `/buyer/roles` dan `/buyer/roles/:roleId` |
| Peran tersimpan tidak dapat dibaca | diturunkan saat dibaca | — | `localStorage` memuat data yang tidak dapat diurai; tidak ada peran khusus yang dimuat (berbeda dari tidak memiliki satu pun) | notis `/buyer/roles` |
| Sebagian peran tersimpan tidak dimuat | diturunkan saat dibaca | — | baris tersimpan gagal pada predikat verba saat dibaca; baris dan alasannya didaftar | notis `/buyer/roles` |
| Validasi ditangguhkan | diturunkan saat dibaca | — | katalog izin kosong saat dibaca (alur belum terdaftar), sehingga baris tidak diterima maupun ditolak | status baca store (`suspended`) |
| Menunggu Kepatuhan (serah-terima) | diturunkan saat dibaca | Defined | kursi tidak memegang `role:grant` | gerbang panel pembuatan |
| Dicatat atas nama identitas contoh — *"Ini akan dicatat atas nama {person}."* | tercatat | Defined | setiap pemberian yang diambil di bawah aturan ini; peran yang tersimpan di peramban ini sebelum aturan itu masih dapat membawa `UNATTRIBUTED: NO_PERSON_IN_SESSION` | dinyatakan di panel sebelum tindakan, di atas **Buat peran** |
| Tanpa pemberi bernama — *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."* | diturunkan saat dibaca (kursi); penolakan (`role_granter_named`) | Defined | kursi memegang `role:grant` dan tidak menyebut siapa pun | panel pembuatan, di atas **Buat peran**; saat ditekan, toast kegagalan *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* |
| Dipertahankan dari induk | diturunkan saat dibaca | Defined | induk melepas sebuah izin setelah pemberian; kosong di setiap status yang terjangkau hari ini | tanpa permukaan (berdasarkan keputusan) |
<!-- src: src/services/transitions/customRoles.ts:160-181,415-425; src/pages-v2/RolesCatalogue.tsx:80,185-200; src/pages-v2/roles/CreateRolePanel.tsx:97-130,253-255; src/lib/i18n/roles.ts:97-98,251-256 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `compliance` (id peran sistem induk; tidak ada nomor dokumen dan tidak ada store fixture).

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Definisi peran sistem (`SYSTEM_ROLES`) | `entityId` = id induk | izin induk sebagaimana adanya sekarang — dicocokkan saat dibaca, tidak pernah disalin |
| Definisi peran khusus | `parent` | `{ id, parent, displayName, description, adds, parentAtomsAtGrant, grantedBy, grantedAt }` di `localStorage` |
| Katalog izin | `adds[]` | setiap izin yang dibutuhkan suatu transisi yang terdaftar; penawaran dan penolakan membaca fungsi yang sama |
| Tampilan katalog peran | `deriveRoleViews()` | peran sistem dan khusus dalam satu daftar; sisi baris khusus adalah sisi induknya |
| Resolusi kursi | `atomsForSeat` | kursi yang memegang id peran khusus akan tercocok ke gabungannya — tetapi tidak ada layar yang menugaskannya hari ini |
| Jejak audit | `TransitionEvent` untuk `t_role_grant` | satu-satunya tindakan pemberian hak istimewa di platform yang memiliki peristiwa, berdasarkan rancangan |

Hanya tampilan: nama tampilan dan deskripsi peran khusus adalah teks pengguna yang dilewatkan ke penerjemah sebagai kuncinya sendiri, sehingga dirender apa adanya dalam kedua bahasa. `grantedAt` dan `parentAtomsAtGrant` ditetapkan store, tidak pernah menjadi kolom.
<!-- src: src/services/transitions/customRoles.ts:91-104,404-458; src/pages-v2/roles/roleModel.ts:96-150; src/services/transitions/businessRoles.ts:582-583,700-707 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent` (`event` = `t_role_grant`, `actor` = `buyer:all`, `ts`, `outcome`, `correlationId`); penolakan juga ditulis. Definisinya sendiri membawa `grantedBy` (orang dalam sesi — tidak pernah kolom payload) dan `grantedAt`. Tidak ada tampilan riwayat per peran; katalog menampilkan himpunan yang berlaku saat ini.

Urutan kerja untuk induk `compliance`, sebagaimana akan dihasilkan penguji yang memegang kepatuhan dan bertindak sebagai pengguna contoh (dari kursi yang tidak menyebut siapa pun, T+1 ditolak oleh `role_granter_named`):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | Defined (ditolak) | buyer · compliance | **Buat peran** tanpa izin yang dicentang | `t_role_grant`, `outcome: failed`, `MISSING_FIELDS:adds` |
| T+1 | Defined → Defined | buyer · compliance | **Salin dari** Kepatuhan, kode `compliance-plus-psl`, nama dan deskripsi diisi, satu izin sesisi dicentang → **Buat peran** | `t_role_grant` |
| T+2 | Defined (tidak berubah) | — | muat ulang halaman: baris masih terdaftar dengan lencana **Peran khusus**, dibaca kembali dari `paragon.customRoles` dan divalidasi ulang | — (tanpa peristiwa) |
<!-- src: src/services/transitions/events.ts:127-129; src/services/transitions/customRoles.ts:91-104,258-336; src/pages-v2/roles/CreateRolePanel.tsx:132-156 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada panel pembuatan; **Mengubah peran adalah tindakan kepatuhan** dengan *Menunggu Kepatuhan* | bagian gerbang di puncak `/buyer/roles` | kursi tidak memegang `role:grant` | buka avatar dan pilih Kepatuhan (kontrol demo) |
| Toast *Ditolak: 'x' is already held by 'procurement'* | `POLICY_REJECTED:role_grant_governed` | tambahan yang sudah dibawa induk | hapus centangnya; chip biasanya menyembunyikannya |
| *Ditolak: '…' is a supplier-side permission and '…' is buyer-side* | `POLICY_REJECTED:role_grant_governed` | tambahan lintas-tenansi (payload buatan tangan) | pertahankan tambahan di sisi induk |
| *Ditolak: 'admin' spans both tenancies and cannot be copied* | `POLICY_REJECTED:role_grant_governed` | `admin` dipilih sebagai induk (tidak ditawarkan formulir) | pilih induk yang bersisi |
| *Ditolak: '…' is not a role id* / *is already a system role* / *has already been granted* | `POLICY_REJECTED:role_grant_governed` | kode buruk atau duplikat | pilih slug huruf kecil yang belum dipakai |
| *Ditolak: displayName must be 2-80 characters of text* | `POLICY_REJECTED:role_grant_governed` | terlalu pendek atau terlalu panjang | perpendek atau perpanjang |
| Toast *Ditolak: MISSING_FIELDS:adds* | dispatcher | tidak ada yang dicentang | centang sekurang-kurangnya satu izin |
| Toast *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* | `POLICY_REJECTED:role_granter_named` (`ROLE_GRANTER_UNATTRIBUTED`); baris di atas **Buat peran** sudah menyatakannya | kursi tidak menyebut siapa pun — belum ada pengguna contoh yang dipilih di panel identitas | pilih pengguna contoh di panel identitas, lalu tekan **Buat peran** lagi; tidak ada yang disimpan |
| *Peran ini sudah memegang setiap izin di sisinya* | catatan panel di bawah **Izin yang ditambahkan** | induknya `buyer_all` atau superset lain | pilih induk yang lebih sempit (`buyer` tidak memegang apa pun dan merupakan dasar yang wajar) |
| Notis **Peran tersimpan tidak dapat dibaca** | `/buyer/roles` | `localStorage` rusak | membuat peran menimpa data yang tidak terbaca |
| Notis **Sebagian peran tersimpan tidak dimuat** | `/buyer/roles`, baris didaftar beserta alasan | data tersimpan yang disunting tangan gagal pada predikat verba | perbaiki atau hapus barisnya; aturannya milik verba |
| Tidak dapat memberikan peran baru ke sebuah kursi | panel identitas hanya mendaftar peran sistem | penugasan belum dibangun | wajar hari ini |
<!-- src: src/services/transitions/policies.ts:405-470; src/services/transitions/customRoles.ts:495-553; src/pages-v2/roles/CreateRolePanel.tsx:97-130,141-150,216-219; src/lib/i18n/roles.ts:211-256 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Defined | `buyer`, `procurement`, `receiving`, `finance`, `compliance`, `planning`, `requisitioner`, `buyer_all`, `supplier`, `commercial`, `fulfilment`, `back_office`, `admin` | — | tanpa store — id entitasnya adalah id peran sistem, masing-masing terbaca `Defined`; ditawarkan sebagai induk: sisi pembeli `buyer` … `buyer_all`, sisi pemasok `supplier` … `back_office` (`admin` ada tetapi tidak dapat disalin); tidak ada peran khusus yang di-seed; peran khusus mana pun yang ada dibuat di peramban ini dan hidup di `localStorage` di bawah `paragon.customRoles` |
<!-- src: src/services/transitions/businessRoles.ts:484-510,582-583,700-707; src/services/transitions/customRoles.ts:154; src/services/transitions/customRoles.ts:495-508 -->
