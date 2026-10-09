---
entity: psl
locale: id
title: Pencatatan pemasok preferensi
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_psl_propose
  - t_psl_grant
  - t_psl_reject
  - t_psl_change_status
  - t_psl_renew
  - t_psl_withdraw
  - t_psl_publish
  - t_psl_cap_override
---

<!-- section:summary -->
## 1 · Apa proses ini

Catatan tentang pemasok mana yang telah dikualifikasi Paragon, untuk material apa, dan dengan ketentuan apa — data induk yang dibaca modul lain sebelum memutuskan apakah sebuah acara perlu ditenderkan sama sekali. Sebelum ini ada, jawabannya tersimpan di sebuah paparan dan sebuah drive bersama, sehingga tidak ada bagian platform yang bisa bertindak atasnya. Satu pencatatan adalah satu keputusan tata kelola tentang satu pemasok untuk sekumpulan kode material: sebuah **penetapan** (`Sole Source`, `Mandatory`, atau `Validated`), jendela masa berlaku, justifikasi tertulis, dan riwayat setiap perpindahan sejak itu. `Sole Source` dan `Mandatory` menangguhkan tender kompetitif; `Validated` adalah prakualifikasi yang tetap bersaing.

Dua jalur pembeli menyentuhnya dan keduanya sengaja dipisahkan. **Pengadaan** (procurement) mengajukan pencatatan (*Pencatatan baru* pada antrean *Pemasok preferensi*) dan, setelah diputuskan, menjadi jalur yang memberi tahu pemasok (*Bagikan ke pemasok*). **Kepatuhan** (compliance) memutuskan: *Setujui* atau *Tolak* sebuah pengajuan, dan pada baris yang terdaftar *Ubah penetapan*, *Perpanjang*, *Tarik*, serta *Tetapkan batas untuk pencatatan ini*. Tidak ada kursi pemasok yang memegang verba apa pun di mesin ini; pemasok hanya membaca kedudukannya sendiri yang telah dipublikasikan di `/supplier/performance`.

Prosesnya dimulai di **Proposed** dan berakhir di **Withdrawn** atau **Rejected**. **Listed** adalah tempat sebuah penetapan hidup dan tempat empat tindakan yang mempertahankan keadaan (ubah penetapan, perpanjang, publikasikan, pengesampingan batas) menambah catatan tanpa memindahkannya. Apakah penetapan yang terdaftar *berlaku hari ini* adalah pertanyaan terpisah yang dijawab waktu saat dibaca: permukaan menampilkan `Scheduled`, `Expiring`, atau `Expired` di atas keadaan yang tersimpan, tidak pernah menyimpannya. Pencatatan yang ditarik atau ditolak tidak dibuka kembali; kembalinya melalui pengajuan baru. Publikasi adalah sumbu terpisah lagi — pencatatan bersifat internal sampai pengadaan membagikannya, dan setelah dibagikan tetap dibagikan (tidak ada pembatalan publikasi; pencatatan yang harus dihentikan ditarik).

Penanda kejujuran. Daftar ini bersifat **SIMULASI** — pil asal-usul di antrean berbunyi *"Sampel — menunggu daftar pemasok pilihan yang dimasukkan operator"*, karena setiap baris ditumbuhkan saat aplikasi dimulai oleh seed melalui verba sungguhan, bukan dimasukkan operator. Pengajuan dicatat *"tanpa identitas orang"* kecuali kursi telah mengadopsi identitas sampel; setiap tindakan sesudahnya — setujui, tolak, ubah penetapan, perpanjang, tarik, bagikan, pengesampingan batas — hanya diambil oleh kursi yang menyebut seseorang, dan kursi yang belum mengadopsi identitas sampel ditolak (`psl_decider_named`). Baris-baris seed membawa pengaju sampel dari pengadaan dan pemutus sampel dari kepatuhan. Karena itu aturan empat mata (pengaju tidak boleh memutuskan) selalu punya pemutus bernama untuk dibandingkan: ia menolak bila pengajunya juga orang yang bernama dan orangnya sama, dan meloloskan pengajuan yang dibuat kursi yang tidak menyebut siapa pun. Pemeriksaan kursi juga menolak: kursi yang memegang atom pengajuan sekaligus atom pemutusan (kursi pembeli bawaan memegang keenam jalur) tidak boleh menyetujui, mengubah ke, atau memperpanjang penetapan `Mandatory` atau `Sole Source`. Batas masa berlaku yang berlaku adalah bawaan terkompilasi 365 hari, karena verba pengaturan seluruh portal (`t_psl_cap_set`, panduannya sendiri) belum pernah dijalankan; plafon mutlaknya 730 hari. Waktu kini yang dinyatakan adalah 31 Agu 2026 dan setiap tanggal yang ditulis seed telah dijangkarkan ulang ke sana.

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Proposed | pembuatan (tindakan operator) | procurement | `t_psl_propose` |
| 2a | Proposed → Listed | tindakan operator | compliance | `t_psl_grant` |
| 2b | Proposed → Rejected | tindakan operator (terminal) | compliance | `t_psl_reject` |
| 3 | Listed → keadaan sama | mencatat fakta (mempertahankan keadaan) | compliance | `t_psl_change_status` |
| 4 | Listed → keadaan sama | mencatat fakta (mempertahankan keadaan) | compliance | `t_psl_renew` |
| 5 | Listed → keadaan sama | mencatat fakta (mempertahankan keadaan) | procurement | `t_psl_publish` |
| 6 | Listed → keadaan sama | mencatat fakta (mempertahankan keadaan) | compliance | `t_psl_cap_override` |
| 7 | Listed → Withdrawn | tindakan operator (terminal) | compliance | `t_psl_withdraw` |

Langkah 3–6 terjadi dalam urutan apa pun dan berapa kali pun (publikasi hanya sekali) selama pencatatan tetap Listed.

**Percabangan**

- **Di Proposed:** `t_psl_grant` — compliance — ketika perkara diterima dan penetapan harus mulai berlaku; `t_psl_reject` — compliance — ketika perkara ditolak, dengan alasan tertulis yang akan dibaca pengaju berikutnya.
- **Di Listed:** `t_psl_change_status` — compliance — ketika kedudukan pemasok naik atau turun; `t_psl_renew` — compliance — ketika penetapan dibawa ke periode berikutnya; `t_psl_publish` — procurement — ketika tim memutuskan untuk memberi tahu pemasok; `t_psl_cap_override` — compliance — ketika satu hubungan ini harus memakai batas yang berbeda; `t_psl_withdraw` — compliance — ketika penetapan harus dihentikan sebelum habis. Setiap tindakan di sini dan di Proposed ditolak bagi kursi yang tidak menyebut siapa pun (`psl_decider_named`); mengajukan tidak.

<!-- src: src/services/transitions/flows/psl.flow.ts:126; src/services/transitions/flows/psl.flow.ts:19 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_psl_propose — Pencatatan baru <!-- transition:t_psl_propose -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** buyer · procurement
- **Dari → ke:** ∅ → Proposed
- **Operator — di mana:** `/buyer/preferred-suppliers` → **Pencatatan baru** (kepala halaman) → panel *Ajukan pencatatan pemasok preferensi* → **Pencatatan baru** (atau **Batal**).
- **Operator — lakukan:** ajukan seorang pemasok untuk sekumpulan material dan catat apa yang membuat mereka layak. Ini belum memberikan apa pun — ini membuka perkaranya agar kepatuhan punya sesuatu untuk diputuskan, dan klaimnya tercatat sebelum ada yang bertindak atasnya. Petunjuk di bawah *Justifikasi* menyatakan mengapa teksnya penting: *"Pencatatan Wajib atau Sumber Tunggal menangguhkan tender kompetitif."*
- **Operator — isi:** *Pemasok* (pilih dari daftar direktori), *Kode material* (satu atau beberapa kode katalog, dipisahkan koma), *Penetapan* (`Sole Source` / `Mandatory` / `Validated`; formulir terbuka pada `Validated`), *Berlaku dari*, *Berlaku sampai*, *Justifikasi*, dan *Alasan* (entri riwayat pertama) semuanya wajib. Opsional: *Rujukan bukti* (id dokumen pemasok, dipisahkan koma). Tanggal yang sudah lewat diterima — pemuatan ulang daftar yang sudah ada pada hari pertama adalah hal wajar, bukan cacat.
- **Penguji — status yang diharapkan:** Proposed
- **Penguji — konfirmasi:** toast *"Pencatatan {id} diajukan untuk {pemasok}. Menunggu keputusan."*; baris `psl-NNN` baru yang idnya ditetapkan store muncul di tab *Menunggu keputusan* dengan chip penetapan dan chip keadaan *Diajukan*; di `/buyer/suppliers/{supplierId}` → tab *Daftar preferensi*, kartu menunjukkan *Diputuskan oleh: Belum diputuskan*. Tidak ada yang berubah di kursi pemasok mana pun — pengajuan tidak pernah berlaku dan tidak pernah dipublikasikan.
- **Penguji — peristiwa pemicu:** `t_psl_propose`
- **Pemeriksaan yang dapat menolak:** `psl_supplier_resolved` — id pemasok harus ada dalam daftar pemasok; `psl_scope_well_formed` — setidaknya satu kode tidak kosong, dan setiap kode harus ada di master material; `psl_status_known` — penetapan harus salah satu dari tiga; `psl_validity_ordered` — kedua tanggal harus hari yang nyata dan *Berlaku dari* tidak boleh setelah *Berlaku sampai* (tidak dibandingkan dengan hari ini); `psl_justification_authored` — justifikasi tidak boleh kosong atau hanya spasi.
- **Glosarium:** `Sole Source`, `Mandatory`, `Validated`, `Proposed`, `MISSING_FIELDS`, `POLICY_REJECTED`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** panel menyatakan *"Keputusan ini akan dicatat tanpa identitas orang. Paragon belum memiliki identitas yang masuk sesi."* sebelum tindakan (atau menyebut identitas sampel beserta penanda *(SAMPLE)* bila ada yang diadopsi). Daftar bersifat **SIMULASI**. Kursi tanpa `psl:propose` melihat *"Menunggu Pengadaan"* di slot kepala halaman alih-alih tombol. Hanya cakupan kode material yang bisa diajukan; cakupan grup dan kategori ada di tipe tanpa penghasil.
<!-- src: src/services/transitions/flows/psl.flow.ts:138; src/services/transitions/flows/psl.flow.ts:116; src/services/transitions/policies.ts:1064; src/services/transitions/policies.ts:1082; src/services/transitions/policies.ts:1116; src/services/transitions/policies.ts:1133; src/services/transitions/policies.ts:1159; src/pages-v2/BuyerPreferredSuppliers.tsx:414; src/pages-v2/BuyerPreferredSuppliers.tsx:624; src/pages-v2/BuyerPreferredSuppliers.tsx:321; src/services/query/commandHooks.ts:1639; src/services/data/mock/MockCommandService.ts:2340; src/services/data/mock/stores/pslStore.ts:91; src/lib/i18n/psl.ts:384; src/lib/i18n/psl.ts:395; src/lib/i18n/psl.ts:415; src/lib/i18n/psl.ts:423; src/lib/i18n/widget.ts:209; src/services/data/pslListing.ts:151 -->

### t_psl_grant — Setujui <!-- transition:t_psl_grant -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · compliance
- **Dari → ke:** Proposed → Listed
- **Operator — di mana:** `/buyer/preferred-suppliers` → tab *Menunggu keputusan* → klik baris → panel samping → *Alasan* → **Setujui**.
- **Operator — lakukan:** terima perkaranya. Sejak itu penetapan ada di daftar dan berlaku selama jendela masa berlakunya: pencatatan `Mandatory` atau `Sole Source` yang berlaku meniadakan keharusan menenderkan acara pengadaan yang menyebut pemasok ini dan salah satu material ini. Petunjuk *Alasan* menyatakan gunanya teks itu: *"Dicatat dalam riwayat pencatatan. Perubahan penetapan tanpa alasan tidak diizinkan."* Tombol tetap nonaktif sampai alasan ditulis.
- **Operator — isi:** *Alasan* (wajib).
- **Penguji — status yang diharapkan:** Listed (chip keadaan lalu berbunyi `Listed`, `Scheduled`, `Expiring`, atau `Expired` tergantung jendela dan waktu kini yang dinyatakan)
- **Penguji — konfirmasi:** toast *"Pencatatan {id} disetujui. Kini berlaku selama masa berlakunya."*; baris keluar dari *Menunggu keputusan* dan tetap ada di *Semua pencatatan*; pada tab *Daftar preferensi* profil pemasok, kartu mendapat *Diputuskan oleh*, satu baris riwayat, dan chip *Internal* beserta lima kontrol baris terdaftar. Kolom Direktori di `/buyer/suppliers` dan gerbang wizard pengadaan kini membaca kedudukan baru (bila jendelanya sudah terbuka). Pemasok masih tidak melihat apa pun — belum ada yang dipublikasikan.
- **Penguji — peristiwa pemicu:** `t_psl_grant`
- **Pemeriksaan yang dapat menolak:** `psl_decider_named` — kursinya harus menyebut seseorang (`PSL_DECIDER_UNATTRIBUTED`); pencatatan tetap Proposed dan tidak ada yang dicap. Sebelum tombol, panel menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. Tombol tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast kegagalan berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* `psl_decider_not_proposer` — orang yang mengajukan tidak boleh memutuskan; pemutusnya kini selalu bernama, sehingga hook menolak bila *Diajukan oleh* pada baris juga menyebut seseorang dan orangnya sama, dan meloloskan pengajuan yang dibuat kursi yang tidak menyebut siapa pun; `psl_restrictive_status_approved` — penetapan `Mandatory` atau `Sole Source` tidak boleh disetujui oleh kursi yang memegang `psl:propose` sekaligus `psl:decide`; `psl_decision_authored` — alasan tidak boleh kosong.
- **Glosarium:** `Listed`, `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`, `POLICY_REJECTED`.
- **Kejujuran:** panel menampilkan putusan kursi *sebelum* tindakan: dengan kursi pembeli bawaan pada pengajuan yang restriktif, panel menunjukkan *"Penetapan {penetapan} menangguhkan tender kompetitif, sehingga tidak dapat diputuskan oleh kursi yang juga mengajukan pencatatan. Persempit kursi ini ke jalur pemutus pada panel identitas…"* dan hanya menawarkan **Tolak**. Persempit kursi ke compliance pada panel identitas untuk melihat **Setujui**. Pengajuan hasil seed membawa pengaju sampel dari pengadaan, sehingga kursi yang mengadopsi identitas sampel yang sama ditolak dengan menyebut nama oleh hook empat mata; identitas sampel yang lain diloloskan. Persetujuan selalu dicatat atas nama identitas sampel yang sedang diperankan kursi — kursi yang tidak menyebut siapa pun tidak dapat menyetujui.
<!-- src: src/services/transitions/flows/psl.flow.ts:159; src/services/transitions/policies.ts:1207; src/services/transitions/policies.ts:1248; src/services/transitions/policies.ts:1170; src/services/data/pslLeadCheck.ts:119; src/pages-v2/BuyerPreferredSuppliers.tsx:234; src/pages-v2/BuyerPreferredSuppliers.tsx:487; src/pages-v2/BuyerPreferredSuppliers.tsx:541; src/pages-v2/BuyerPreferredSuppliers.tsx:592; src/pages-v2/BuyerPreferredSuppliers.tsx:285; src/services/query/commandHooks.ts:1666; src/services/data/mock/MockCommandService.ts:2280; src/lib/i18n/psl.ts:385; src/lib/i18n/psl.ts:407; src/lib/i18n/psl.ts:417; src/lib/i18n/psl.ts:424; src/services/data/mock/pslSeed.ts:510 -->

### t_psl_reject — Tolak <!-- transition:t_psl_reject -->

- **Jenis langkah:** tindakan operator (terminal)
- **Peran:** buyer · compliance
- **Dari → ke:** Proposed → Rejected
- **Operator — di mana:** `/buyer/preferred-suppliers` → tab *Menunggu keputusan* → klik baris → panel samping → *Alasan* → **Tolak**.
- **Operator — lakukan:** tolak perkaranya dan nyatakan alasannya dengan kata-kata yang akan dibaca orang berikutnya yang mengajukan pemasok yang sama. Teks itu adalah seluruh keterangan atas keputusan tersebut; upaya berikutnya adalah pengajuan baru, bukan pembukaan kembali.
- **Operator — isi:** *Alasan* (wajib).
- **Penguji — status yang diharapkan:** Rejected
- **Penguji — konfirmasi:** toast *"Pencatatan {id} ditolak. Upaya berikutnya adalah pencatatan baru."*; baris keluar dari *Menunggu keputusan*; di *Semua pencatatan* dan pada profil pemasok, baris menunjukkan chip keadaan `Rejected` dan alasannya sebagai baris riwayat terakhir; tidak ada kontrol yang ditawarkan pada kartu. Pengadaan mengabaikannya sepenuhnya — pengajuan yang ditolak tidak memberikan apa pun bahkan di dalam tanggalnya.
- **Penguji — peristiwa pemicu:** `t_psl_reject`
- **Pemeriksaan yang dapat menolak:** `psl_decider_named` — kursinya harus menyebut seseorang (`PSL_DECIDER_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_psl_grant`; `psl_decider_not_proposer` — seperti pada Setujui; `psl_decision_authored` — alasan tidak boleh kosong. Pemeriksaan kursi tidak melekat pada penolakan: menolak tidak memberikan apa pun, sehingga kursi yang memegang kedua atom boleh menolak.
- **Glosarium:** `Rejected`, `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`.
- **Kejujuran:** terminal berdasarkan keputusan operator — tidak ada pembukaan kembali. `Rejected` berbeda dari `Withdrawn`: yang ini tidak pernah tercatat. Selalu dicatat atas nama identitas sampel yang sedang diperankan kursi — kursi yang tidak menyebut siapa pun tidak dapat menolak.
<!-- src: src/services/transitions/flows/psl.flow.ts:179; src/services/transitions/policies.ts:1207; src/services/transitions/policies.ts:1170; src/pages-v2/BuyerPreferredSuppliers.tsx:303; src/pages-v2/BuyerPreferredSuppliers.tsx:567; src/pages-v2/BuyerPreferredSuppliers.tsx:602; src/services/query/commandHooks.ts:1687; src/services/data/mock/MockCommandService.ts:2288; src/lib/i18n/psl.ts:386; src/lib/i18n/psl.ts:425; src/lib/glossary/governance.glossary.ts:257 -->

### t_psl_change_status — Ubah penetapan <!-- transition:t_psl_change_status -->

- **Jenis langkah:** mencatat fakta (mempertahankan keadaan)
- **Peran:** buyer · compliance
- **Dari → ke:** Listed → keadaan sama
- **Operator — di mana:** `/buyer/suppliers/{supplierId}` → tab *Daftar preferensi* → kartu pencatatan → **Ubah penetapan** → pilih penetapan baru → *Alasan* → **Ubah penetapan**. (Tautan *Buka profil pemasok* di antrean mendarat di sini dengan kartu yang disorot.)
- **Operator — lakukan:** pindahkan pemasok antar penetapan tanpa catatannya dimulai dari awal — kedudukan itu dinamis, dan riwayat menyimpan setiap perpindahan agar sejarahnya terbaca sebagai satu hubungan. Berpindah *naik* ke `Mandatory` atau `Sole Source` menghadapi pemeriksaan kursi yang sama seperti menyetujuinya.
- **Operator — isi:** *Penetapan* (harus berbeda dari yang sekarang) dan *Alasan* (wajib).
- **Penguji — status yang diharapkan:** Listed (tidak berubah); chip penetapan berubah
- **Penguji — konfirmasi:** toast *"Pencatatan {id} kini berstatus {penetapan}."*; chip pertama kartu dan satu baris *Riwayat status* baru (`Listed — {alasan}`) berubah; kolom *Penetapan* pada baris antrean berubah; lencana Direktori dan gerbang pengadaan membaca penetapan baru. Bila pencatatan sudah dipublikasikan, baris `/supplier/performance` pemasok menunjukkan penetapan baru *tanpa* pembagian baru — baris *Dibagikan kepada pemasok pada {tanggal}* tidak bergeser.
- **Penguji — peristiwa pemicu:** `t_psl_change_status`
- **Pemeriksaan yang dapat menolak:** `psl_decider_named` — kursinya harus menyebut seseorang (`PSL_DECIDER_UNATTRIBUTED`); tidak ada yang ditambahkan ke riwayat. Satu baris di bagian atas blok tindakan kartu menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau *"Ini akan dicatat atas nama {person}."* setelah pengguna contoh dipilih. Tombol tetap aktif; bila ditekan dari kursi yang tidak menyebut siapa pun, toast kegagalan berbunyi *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* `psl_status_known` — salah satu dari tiga penetapan; `psl_status_actually_changes` — ditolak bila penetapan yang dipilih sama dengan yang sekarang (*"Entri riwayat tanpa perubahan tidak mencatat apa pun"*); `psl_restrictive_status_approved` — pada penetapan yang *dituju*, kursi yang memegang kedua atom tidak boleh memilih `Mandatory` atau `Sole Source`; `psl_decision_authored` — alasan tidak boleh kosong.
- **Glosarium:** `Sole Source`, `Mandatory`, `Validated`, `POLICY_REJECTED`.
- **Kejujuran:** kartu menampilkan pemberitahuan kursi alih-alih kotak alasan ketika penetapan yang dipilih restriktif dan kursi memegang kedua atom. Tidak ada compare-and-set yang melindungi verba ini: dua kursi yang mengubah penetapan bersamaan sama-sama berhasil dan riwayat mencatat keduanya. Kartu ditawarkan pada baris Listed bahkan ketika status tampilannya `Expired` — keadaan tersimpan masih Listed.
<!-- src: src/services/transitions/flows/psl.flow.ts:196; src/services/transitions/policies.ts:1116; src/services/transitions/policies.ts:1274; src/services/transitions/policies.ts:1248; src/services/transitions/policies.ts:1170; src/components/v2-features/PslListingsSection.tsx:411; src/components/v2-features/PslListingsSection.tsx:434; src/components/v2-features/PslListingsSection.tsx:451; src/components/v2-features/PslListingsSection.tsx:217; src/services/query/commandHooks.ts:1708; src/services/data/mock/MockCommandService.ts:2296; src/pages-v2/BuyerSupplierProfile.tsx:542; src/lib/i18n/psl.ts:387; src/lib/i18n/psl.ts:426; src/services/transitions/flows/psl.flow.ts:31 -->

### t_psl_renew — Perpanjang <!-- transition:t_psl_renew -->

- **Jenis langkah:** mencatat fakta (mempertahankan keadaan)
- **Peran:** buyer · compliance
- **Dari → ke:** Listed → keadaan sama
- **Operator — di mana:** `/buyer/suppliers/{supplierId}` → tab *Daftar preferensi* → kartu pencatatan → **Perpanjang** → *Tanggal akhir baru* → *Alasan* → **Perpanjang**.
- **Operator — lakukan:** bawa penetapan ke satu periode berikutnya. Memperpanjang posisi yang meniadakan tender kompetitif adalah keputusan yang sama dengan memberikannya, sehingga menghadapi pemeriksaan kursi yang sama, dan platform menolak tanggal yang melewati batas yang berlaku alih-alih diam-diam memendekkan apa yang telah dicatat.
- **Operator — isi:** *Tanggal akhir baru* (harus lebih lambat dari akhir efektif saat ini dan tidak lebih lambat dari *Berlaku dari* + batas yang berlaku) dan *Alasan* (wajib).
- **Penguji — status yang diharapkan:** Listed (tidak berubah); *Sampai* dan *Berlaku efektif sampai* bergeser
- **Penguji — konfirmasi:** toast *"Pencatatan {id} kini berlaku sampai {tanggal}."*; akhir *Masa berlaku* dan *Berlaku efektif sampai* pada kartu diperbarui, satu baris riwayat ditambahkan; baris yang tadinya `Expiring` atau `Expired` kembali menjadi `Listed` di antrean dan pada dua kartu peringatan dasbor. Baris pemasok untuk pencatatan yang dipublikasikan menunjukkan *Sampai* yang baru tanpa pembagian baru.
- **Penguji — peristiwa pemicu:** `t_psl_renew`
- **Pemeriksaan yang dapat menolak:** `psl_decider_named` — kursinya harus menyebut seseorang (`PSL_DECIDER_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_psl_change_status`; `psl_renewal_extends` — tanggal baru harus hari yang nyata dan lebih lambat dari akhir efektif hari ini (*"untuk memperpendek masa berlaku, catat pengesampingan batas … "*); `psl_renewal_within_cap` — tanggal baru tidak boleh melampaui *Berlaku dari* ditambah batas yang berlaku (pengesampingan milik pencatatan bila ada, jika tidak bawaan portal 365 hari) — penolakan menyebut tanggal terakhir yang diizinkan; `psl_restrictive_status_approved` — pada penetapan yang sudah dipegang; `psl_decision_authored`.
- **Glosarium:** Expiring, Expired, `LISTING_OVERRIDE`, `NO_SETTING_RECORDED`, `POLICY_REJECTED`.
- **Kejujuran:** batas diukur dari *Berlaku dari*, bukan dari hari ini, sehingga pencatatan yang dimulai lama sekali mungkin sama sekali tidak punya ruang untuk diperpanjang sampai pengesampingan batas dicatat lebih dulu. Batas bawaan terkompilasi berlaku karena batas seluruh portal belum pernah dicatat. Perpanjangan bersamaan sama-sama berhasil.
<!-- src: src/services/transitions/flows/psl.flow.ts:222; src/services/transitions/policies.ts:1288; src/services/transitions/policies.ts:1327; src/services/transitions/policies.ts:1248; src/services/transitions/policies.ts:1170; src/services/data/pslProjection.ts:208; src/services/data/pslProjection.ts:249; src/services/data/pslProjection.ts:98; src/components/v2-features/PslListingsSection.tsx:418; src/components/v2-features/PslListingsSection.tsx:486; src/components/v2-features/PslListingsSection.tsx:225; src/services/query/commandHooks.ts:1738; src/services/data/mock/MockCommandService.ts:2309; src/lib/i18n/psl.ts:388; src/lib/i18n/psl.ts:410; src/lib/i18n/psl.ts:427; src/lib/i18n/psl.ts:455 -->

### t_psl_withdraw — Tarik <!-- transition:t_psl_withdraw -->

- **Jenis langkah:** tindakan operator (terminal)
- **Peran:** buyer · compliance
- **Dari → ke:** Listed → Withdrawn
- **Operator — di mana:** `/buyer/suppliers/{supplierId}` → tab *Daftar preferensi* → kartu pencatatan → **Tarik** → *Alasan* → **Tarik**.
- **Operator — lakukan:** hentikan penetapan sebelum masanya habis dan nyatakan mengapa. Pemasok yang tidak lagi sesuai tidak boleh mempertahankan pengecualian sampai tanggal berakhirnya tiba; inilah perbedaan antara posisi yang habis dengan sendirinya dan posisi yang dicabut seseorang. Ini juga satu-satunya cara menghentikan pencatatan yang sudah dipublikasikan — tidak ada pembatalan publikasi.
- **Operator — isi:** *Alasan* (wajib).
- **Penguji — status yang diharapkan:** Withdrawn
- **Penguji — konfirmasi:** toast *"Pencatatan {id} ditarik. Mulai sekarang tidak memberikan apa pun."*; chip keadaan berbunyi `Withdrawn` (tidak pernah `Expired`, bahkan setelah tanggalnya lewat); kontrol pada kartu hilang; Direktori dan gerbang pengadaan tidak lagi menghitungnya; bila sudah dipublikasikan, baris pemasok menunjukkan *"Penetapan ini ditarik pada {tanggal} dan tidak lagi berlaku."*
- **Penguji — peristiwa pemicu:** `t_psl_withdraw`
- **Pemeriksaan yang dapat menolak:** `psl_decider_named` — kursinya harus menyebut seseorang (`PSL_DECIDER_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_psl_change_status`; `psl_decision_authored` — alasan tidak boleh kosong. Tidak ada pemeriksaan kursi: menarik menghapus pengecualian alih-alih memberikannya.
- **Glosarium:** `Withdrawn`, `POLICY_REJECTED`.
- **Kejujuran:** terminal berdasarkan keputusan operator. Kembali ke daftar melalui **Pencatatan baru** dan keputusan baru — jalan pintas `Withdrawn → Listed` ditolak karena akan menjadi rute yang lebih murah menuju penetapan dan dipegang sepenuhnya oleh jalur pemutus. Kesinambungan dipulihkan di profil, yang mengelompokkan pencatatan seorang pemasok, bukan di mesin.
<!-- src: src/services/transitions/flows/psl.flow.ts:240; src/services/transitions/flows/psl.flow.ts:66; src/services/transitions/policies.ts:1170; src/components/v2-features/PslListingsSection.tsx:425; src/components/v2-features/PslListingsSection.tsx:533; src/components/v2-features/PslListingsSection.tsx:231; src/services/query/commandHooks.ts:1762; src/services/data/mock/MockCommandService.ts:2292; src/pages-v2/SupplierPerformance.tsx:283; src/lib/i18n/psl.ts:389; src/lib/i18n/psl.ts:428; src/lib/i18n/psl.ts:482; src/lib/glossary/governance.glossary.ts:253 -->

### t_psl_publish — Bagikan ke pemasok <!-- transition:t_psl_publish -->

- **Jenis langkah:** mencatat fakta (mempertahankan keadaan)
- **Peran:** buyer · procurement
- **Dari → ke:** Listed → keadaan sama
- **Operator — di mana:** `/buyer/suppliers/{supplierId}` → tab *Daftar preferensi* → kartu pencatatan → **Bagikan ke pemasok** (di samping baris *"Pencatatan ini belum dibagikan kepada pemasok."*).
- **Operator — lakukan:** secara sengaja beri tahu pemasok di mana posisi mereka. Sebelum ini terjadi posisinya bersifat internal — ditindaklanjuti di dalam Paragon tanpa diketahui pihak luar — dan memberi tahu seseorang adalah tindakan yang diambil orang, bukan efek samping sebuah keputusan. Ini terjadi satu kali dan tanggalnya disimpan; perubahan penetapan berikutnya sampai kepada pemasok tanpa dibagikan ulang.
- **Operator — isi:** tidak ada yang diisi — tanggal ditetapkan store dan aktor berasal dari sesi.
- **Penguji — status yang diharapkan:** Listed (tidak berubah); chip publikasi berubah dari *Internal* ke *Dipublikasikan*
- **Penguji — konfirmasi:** toast *"Pencatatan {id} dibagikan kepada pemasok."*; chip ketiga pada kartu berbunyi *Dipublikasikan*, tombolnya diganti dengan *"Dibagikan kepada pemasok pada {tanggal}. Perubahan berikutnya sampai kepada mereka tanpa dibagikan ulang."*; di wizard pengadaan, pengecualian yang dihasilkan pencatatan ini kini membawa chip *Dipublikasikan* alih-alih *Internal · Belum dibagikan kepada pemasok.*; di kursi pemasok, `/supplier/performance` → *Status pemasok pilihan Anda* mendapat satu baris dengan *Dibagikan kepada Anda pada {tanggal}*. Tidak ada baris riwayat yang ditambahkan — `publishedAt` adalah catatannya.
- **Penguji — peristiwa pemicu:** `t_psl_publish`
- **Pemeriksaan yang dapat menolak:** `psl_decider_named` — kursinya harus menyebut seseorang (`PSL_DECIDER_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_psl_change_status`; `psl_not_already_published` — pembagian kedua ditolak; tanggal pertama tidak ditimpa.
- **Glosarium:** Published, Internal, `POLICY_REJECTED`.
- **Kejujuran:** publikasi menentukan siapa yang telah *diberi tahu*, bukan apa yang *benar*: gerbang pengadaan mengecualikan pencatatan `Mandatory`/`Sole Source` yang berlaku terlepas dari dipublikasikan atau tidak, dan wizard menyatakannya di samping putusan. Pencatatan yang masa berlakunya sudah lewat masih bisa dibagikan (keadaan tersimpan masih Listed). Kursi tanpa `psl:publish` melihat *"Menunggu Pengadaan"* di slot ini. Tampilan pemasok menyembunyikan justifikasi, bukti, kolom batas, dan riwayat berdasarkan keputusan operator.
<!-- src: src/services/transitions/flows/psl.flow.ts:264; src/services/transitions/flows/psl.flow.ts:37; src/services/transitions/policies.ts:1353; src/components/v2-features/PslListingsSection.tsx:377; src/components/v2-features/PslListingsSection.tsx:238; src/services/query/commandHooks.ts:1793; src/services/data/mock/MockCommandService.ts:2330; src/services/data/pslListing.ts:291; src/components/v2-features/PslGateNotice.tsx:118; src/pages-v2/BuyerSourcing.tsx:168; src/services/data/mock/MockProcurementService.ts:615; src/pages-v2/SupplierPerformance.tsx:220; src/services/data/pslSupplierView.ts:40; src/lib/i18n/psl.ts:390; src/lib/i18n/psl.ts:419; src/lib/i18n/psl.ts:429; src/lib/i18n/psl.ts:479 -->

### t_psl_cap_override — Tetapkan batas untuk pencatatan ini <!-- transition:t_psl_cap_override -->

- **Jenis langkah:** mencatat fakta (mempertahankan keadaan)
- **Peran:** buyer · compliance
- **Dari → ke:** Listed → keadaan sama
- **Operator — di mana:** `/buyer/suppliers/{supplierId}` → tab *Daftar preferensi* → kartu pencatatan → **Tetapkan batas untuk pencatatan ini** → *Batas, dalam hari* → *Mengapa pencatatan ini memakai batas yang berbeda* → **Tetapkan batas untuk pencatatan ini**.
- **Operator — lakukan:** pegang satu hubungan ini pada periode yang lebih pendek atau lebih panjang dari bawaan portal, dengan dasar pengecualiannya tertulis dan ada yang bertanggung jawab. Batas membatasi akhir *efektif* penetapan: mana yang lebih dulu antara *Berlaku sampai* dan *Berlaku dari* + hari batas.
- **Operator — isi:** *Batas, dalam hari* (bilangan bulat di atas nol, paling banyak plafon 730 hari) dan *Mengapa pencatatan ini memakai batas yang berbeda* (wajib).
- **Penguji — status yang diharapkan:** Listed (tidak berubah); *Berlaku efektif sampai* dan baris *Batas masa berlaku* berubah
- **Penguji — konfirmasi:** toast *"Batas {hari} hari tercatat untuk pencatatan {id}."*; *Batas masa berlaku* pada kartu berbunyi *{hari} hari · Pengesampingan tercatat untuk pencatatan ini* (alih-alih *Bawaan portal — belum ada batas yang ditetapkan*), *Justifikasi batas* dan *Batas diputuskan oleh* muncul, *Berlaku efektif sampai* dihitung ulang; status tampilan bisa bergeser (batas yang lebih pendek dapat mengubah `Listed` menjadi `Expiring` atau `Expired`); **Perpanjang** berikutnya dibatasi oleh batas ini. Tidak ada baris riwayat yang ditambahkan — keempat kolom batas adalah catatannya.
- **Penguji — peristiwa pemicu:** `t_psl_cap_override`
- **Pemeriksaan yang dapat menolak:** `psl_decider_named` — kursinya harus menyebut seseorang (`PSL_DECIDER_UNATTRIBUTED`), dengan baris dan toast yang ditampilkan pada `t_psl_change_status`; `psl_cap_within_ceiling` — bilangan bulat hari yang positif, tidak lebih dari plafon 730 hari (penolakan mengutip plafonnya); `psl_cap_justification_authored` — justifikasi tidak boleh kosong.
- **Glosarium:** `LISTING_OVERRIDE`, `NO_SETTING_RECORDED`, `PORTAL_DEFAULT`, `CEILING_BOUNDED`, `POLICY_REJECTED`.
- **Kejujuran:** mencatat pengesampingan kedua menggantikan yang pertama — tidak ada riwayat batas per pencatatan, hanya empat kolom. Batas bisa dicatat pada baris Listed yang *belum dipublikasikan* atau *kedaluwarsa*. Pengecualian kebijakan "atau masa kontrak yang ditandatangani bila lebih panjang" tidak dibangun: kontrak tidak membawa kode material, sehingga tidak ada yang bisa menyatakan kontrak mana yang mencakup material terdaftar yang mana. `psl:cap-set` adalah atom compliance yang tidak boleh dipegang procurement — siapa pun yang menetapkan batas dapat memperpanjang setiap penetapan yang mereka ajukan.
<!-- src: src/services/transitions/flows/psl.flow.ts:289; src/services/transitions/policies.ts:1371; src/services/transitions/policies.ts:1391; src/services/data/pslProjection.ts:125; src/services/data/pslProjection.ts:208; src/services/data/pslProjection.ts:249; src/services/data/pslListing.ts:220; src/components/v2-features/PslListingsSection.tsx:562; src/components/v2-features/PslListingsSection.tsx:282; src/components/v2-features/PslListingsSection.tsx:290; src/components/v2-features/PslListingsSection.tsx:233; src/services/query/commandHooks.ts:1821; src/services/data/mock/MockCommandService.ts:2315; src/services/transitions/businessRoles.ts:328; src/lib/i18n/psl.ts:391; src/lib/i18n/psl.ts:408; src/lib/i18n/psl.ts:430; src/lib/i18n/psl.ts:461 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Keputusan (di Proposed).** Cabang A — `t_psl_grant` — **Kapan:** kepatuhan menerima perkaranya; pada pengajuan `Mandatory` atau `Sole Source` hanya dari kursi yang tidak juga memegang `psl:propose`. Cabang B — `t_psl_reject` — **Kapan:** perkaranya tidak berdasar (alasan penolakan hasil seed: ada pemasok kedua yang memenuhi syarat, sehingga dasar monopoli gugur); alasan tertulis wajib dan penolakan bersifat final.
- **Perpindahan kedudukan (di Listed).** `t_psl_change_status` — **Kapan:** pemasok memperoleh posisi yang lebih kuat atau kehilangannya; ditolak bila tidak ada yang berubah; berpindah *ke* penetapan restriktif memerlukan kursi yang terpisah. `t_psl_renew` — **Kapan:** periode harus lebih panjang; ditolak bila tanggalnya tidak memperpanjang atau melanggar batas yang berlaku. `t_psl_cap_override` — **Kapan:** hubungan ini harus dikualifikasi ulang lebih cepat (atau lebih lambat) dari bawaan; inilah penyelesaian yang dirujuk penolakan perpanjangan.
- **Memberi tahu pemasok (di Listed).** `t_psl_publish` — **Kapan:** pengadaan memutuskan pemasok harus tahu. Sekali. **Kapan** penetapan kemudian berubah: tidak ada yang perlu dilakukan, pemasok melihat yang terkini. **Kapan** harus dihentikan: tarik — tidak ada pembatalan publikasi.
- **Menghentikan lebih awal (di Listed).** `t_psl_withdraw` — **Kapan:** pemasok tidak lagi sesuai sebelum *Berlaku sampai*; catatan berbunyi `Withdrawn`, bukan `Expired`.
- **Kedaluwarsa tanpa tindakan.** Tidak ada transisi. **Kapan** akhir efektif lewat selagi masih Listed: permukaan berbunyi `Expired` dan gerbang pengadaan berhenti menghitungnya; baris berada di tab antrean *Kedaluwarsa, masih terdaftar* dan kartu dasbor sampai seseorang memperpanjang atau menariknya. **Kapan** *Berlaku dari* masih di depan: `Scheduled`, dan belum memberikan apa pun.
- **Konsekuensi pengadaan (tidak ada transisi di sini).** **Kapan** sebuah RFQ mengundang pemasok yang memegang pencatatan `Mandatory` atau `Sole Source` yang berlaku untuk salah satu materialnya: wizard dan panel RFQ menyatakan *"Tender kompetitif tidak diperlukan: {pemasok} memiliki daftar {penetapan} untuk {kode}."* dengan chip *Dipublikasikan* / *Internal*, dan `t_rfq_publish` tidak dikenai ambang dua undangan. **Kapan** tidak ada pencatatan yang mengecualikannya: setidaknya dua undangan yang memenuhi syarat diperlukan (ditolak bila kurang; catatan pada tepat dua bahwa tiga adalah standarnya). **Kapan** material acara tidak membawa kode yang disebut pencatatan mana pun: kedudukan tidak dapat diperiksa dan acara ditenderkan seperti biasa.
- **Keputusan sendiri.** **Kapan** kursi pemutus bertindak sebagai orang sampel yang sama yang mengajukan baris: setujui dan tolak sama-sama ditolak dengan menyebut nama. Kursi yang tidak menyebut siapa pun tidak pernah sampai ke pemeriksaan ini — `psl_decider_named` menolaknya lebih dulu — dan pengajuan yang dibuat kursi yang tidak menyebut siapa pun diloloskan untuk pemutus bernama mana pun.
- **Orang yang bernama yang memutuskan (di Proposed dan Listed).** **Kapan** kursi tidak menyebut siapa pun — kursi sebagaimana dibuka, tanpa pengguna contoh yang dipilih di panel identitas — setujui, tolak, ubah penetapan, perpanjang, tarik, bagikan dan pengesampingan batas masing-masing ditolak oleh `psl_decider_named`: tidak ada yang disimpan atau dicap, tidak ada baris riwayat yang ditambahkan dan keadaan tidak berpindah. Pilih pengguna contoh di panel identitas, lalu ulangi tindakannya. **Pencatatan baru** tetap terbuka bagi kursi yang tidak menyebut siapa pun, dan pengaturan batas seluruh portal (`t_psl_cap_set`, panduannya sendiri) tidak diperiksa dengan cara ini.

<!-- src: src/services/transitions/flows/psl.flow.ts:66; src/services/data/pslProjection.ts:298; src/services/data/rfqSourcingGate.ts:252; src/services/data/rfqSourcingGate.ts:318; src/services/data/rfqSourcingGate.ts:82; src/services/transitions/policies.ts:982; src/components/v2-features/PslGateNotice.tsx:93; src/lib/i18n/psl.ts:342; src/services/data/mock/pslSeed.ts:285 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Ditampilkan di |
|---|---|---|---|---|
| `Scheduled` | berbasis waktu, diturunkan saat dibaca | Listed | *Berlaku dari* setelah waktu kini yang dinyatakan | chip keadaan di antrean, kartu profil, kolom undangan RFQ |
| `Expiring` | berbasis waktu, diturunkan saat dibaca | Listed | akhir efektif dalam 90 hari dari waktu kini yang dinyatakan | chip keadaan; tab antrean *Akan kedaluwarsa*; kartu dasbor *Pencatatan pemasok pilihan akan kedaluwarsa*; baris pemasok *"Status pemasok pilihan Anda untuk {kode} berakhir pada {tanggal}."* |
| `Expired` | berbasis waktu, diturunkan saat dibaca | Listed | akhir efektif sudah lewat | chip keadaan; tab antrean *Kedaluwarsa, masih terdaftar*; kartu dasbor *Pencatatan pemasok pilihan kedaluwarsa tetapi masih terdaftar — pengadaan tidak lagi memperlakukannya sebagai berlaku*; baris pemasok *"Penetapan ini berlaku sampai {tanggal}."* |
| *Dipublikasikan* / *Internal* | diangkat operator (sumbu publikasi) | Listed, Withdrawn | selalu pada pencatatan yang sudah diputuskan; *Internal · Belum dibagikan kepada pemasok.* di samping pengecualian pengadaan yang pencatatannya belum dibagikan | chip kartu profil; `PslGateNotice` pada wizard dan panel RFQ |
| Baris sumber *Batas masa berlaku* | diturunkan saat dibaca | semua keadaan | selalu pada kartu: *Bawaan portal — belum ada batas yang ditetapkan* (jawaban hari ini pada setiap baris tanpa pengesampingan) / *Pengesampingan tercatat untuk pencatatan ini* / *Bawaan portal — batas telah ditetapkan* / *Dibatasi oleh plafon platform* | kartu profil |
| *"Menunggu Pengadaan"* / *"Menunggu Kepatuhan"* | diturunkan saat dibaca (kursi vs. atom) | ∅ (ajukan); Proposed (putuskan); Listed (putuskan, publikasikan, batas) | kursi tidak memegang atom verba itu | kepala antrean; panel keputusan; slot masing-masing verba pada kartu |
| Pemberitahuan kursi memegang keduanya | diturunkan saat dibaca (atom kursi) | Proposed (setujui); Listed (ubah ke, perpanjang) | penetapan restriktif dan kursi memegang `psl:propose` sekaligus `psl:decide` | panel keputusan; formulir ubah dan perpanjang |
| *"Tercatat tanpa identitas orang"* / orang bertanda *(SAMPLE)* | diturunkan saat dibaca | semua keadaan | *Tercatat tanpa identitas orang* hanya pada *Diajukan oleh*, bila pengajuan dibuat kursi yang tidak menyebut siapa pun; setiap keputusan, pembagian dan batas menyebut seseorang | *Diajukan oleh*, *Diputuskan oleh*, *Batas diputuskan oleh*; pemberitahuan pra-tindakan pada formulir **Pencatatan baru** |
| **Tanpa pemutus bernama** — *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."* | diturunkan saat dibaca (kursi); penolakan (`psl_decider_named`) | Proposed (setujui, tolak); Listed (ubah, perpanjang, tarik, bagikan, batas) | kursi tidak menyebut siapa pun; dengan pengguna contoh terpilih barisnya berbunyi *"Ini akan dicatat atas nama {person}."* | panel keputusan, sebelum **Setujui** / **Tolak**; bagian atas blok tindakan kartu pencatatan; saat tombol ditekan, toast kegagalan *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* |
| SIMULASI — *"Sampel — menunggu daftar pemasok pilihan yang dimasukkan operator"* | eksternal (registri liveness) | semua keadaan | selalu, sampai ada daftar yang dimasukkan operator | baris meta `/buyer/preferred-suppliers`; tingkat kedudukan pemasok |
| *Tender kompetitif tidak diperlukan* / *Dua pemasok yang memenuhi syarat diundang…* / *Acara kompetitif memerlukan setidaknya 2…* / *…tidak dapat diperiksa…* | diturunkan saat dibaca (gerbang pengadaan) | draf RFQ dan panel RFQ | sesuai pengecualian dan jumlah undangan yang memenuhi syarat | `/buyer/sourcing` |

Tidak ada yang berbasis waktu disimpan: `Expired` sengaja tidak ada dalam keadaan tersimpan, dan setiap perbandingan waktu dijalankan pada waktu kini yang dinyatakan (31 Agu 2026), tidak pernah pada jam dinding.

<!-- src: src/services/data/pslProjection.ts:146; src/services/data/pslProjection.ts:298; src/services/data/pslProjection.ts:466; src/services/data/pslProjection.ts:485; src/pages-v2/BuyerPreferredSuppliers.tsx:266; src/pages-v2/BuyerDashboard.tsx:254; src/lib/i18n/buyerDashboard.ts:186; src/lib/i18n/psl.ts:321; src/lib/i18n/psl.ts:484; src/lib/i18n/roles.ts:277; src/services/liveness/registry.ts:331; src/services/data/fixturePresent.ts:198 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `psl-004` — `Mandatory`, pemasok `sup-005`, material `AI-NIAC-6601`, `AI-PANTO-6640`, dalam **Listed**, dipublikasikan, dengan pengesampingan batas 150 hari. Setelah dijangkarkan ulang masa berlakunya terbaca 2026-08-01 → 2027-03-19, tetapi batas yang diukur dari *Berlaku dari* mengakhirinya pada 2026-12-29, sehingga *Berlaku efektif sampai* lebih awal dari *Sampai* — baris ini ada untuk menunjukkan bahwa pembaca yang mengabaikan batas akan melihatnya berjalan berbulan-bulan lebih lama dari kenyataannya.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Daftar pemasok | `supplierId` | Diperiksa terhadap daftar saat pengajuan. Pencatatan tidak punya *pemilik*: tidak ada kursi pemasok yang boleh bertindak atasnya, dan scope pemasok ditolak pada tahap scope terlepas dari pencatatan siapa itu. Pemasok hanya membaca barisnya sendiri yang telah dipublikasikan. |
| Master material | `scope.materialCodes` (`kind: 'material'`) | Setiap kode harus ada di master; kunci yang sama dipakai registri halal, sehingga pencatatan dan sertifikat dapat dibandingkan. Cakupan `group` dan `category` ada di tipe tanpa penghasil. |
| Penetapan | `status` + `statusHistory[]` | Riwayat hanya-tambah: `at` (ditetapkan store), `from`, `to`, `lifecycle`, `reason`, `by`. Persetujuan menambah baris dengan `from === to`; publikasi tidak menambah apa pun. |
| Masa berlaku | `validFrom`, `validUntil` (ditulis) | Yang dilihat pembaca adalah `effectiveValidUntil` = yang lebih awal antara `validUntil` dan `validFrom` + hari batas. Dihitung, tidak pernah disimpan. |
| Batas | `capDaysOverride`, `capJustification`, `capDecidedBy`, `capDecidedAt` | Keempatnya ditulis oleh satu tindakan atau semuanya `null`. Tanpa itu, batas seluruh portal berlaku — hari ini bawaan terkompilasi 365 hari, karena `pslCapSettingStore` kosong. |
| Publikasi | `publishedAt`, `publishedBy` | `null` = internal. Ditulis sekali. Tidak bergantung pada keadaan maupun waktu. |
| Aktor | `proposedBy`, `decidedBy`, `capDecidedBy`, `publishedBy` | Atribusi dari sesi, bukan nama. Baris seed: identitas sampel pengadaan mengajukan dan mempublikasikan; identitas sampel kepatuhan memutuskan dan membatasi. |
| Bukti | `evidenceRefs` | Id dokumen pemasok, sebagaimana dinyatakan pengaju — rujukan ke sebuah klaim, bukan ke berkas. `psl-004` merujuk `doc-201`, `doc-202`. Hanya tampilan. |
| Acara pengadaan (RFQ) | dibaca saat penerbitan oleh `decideSourcing` | Bukan tautan tersimpan. Pencatatan `Mandatory`/`Sole Source` yang berlaku untuk pemasok yang diundang pada material acara menghasilkan pengecualian; pengecualian membawa id pencatatan agar permukaan dapat menampilkan *Dipublikasikan* / *Internal*. |
| Direktori pemasok | `bestPslStatus` per pemasok | `/buyer/suppliers` menampilkan penetapan berlaku yang paling restriktif, atau *Tidak Terdaftar* / *Kedaluwarsa*; hanya tampilan. |

<!-- src: src/services/data/pslListing.ts:203; src/services/data/pslListing.ts:188; src/services/data/mock/pslSeed.ts:210; src/services/data/mock/pslSeed.ts:510; src/services/data/mock/MockCommandService.ts:2252; src/services/data/pslProjection.ts:249; src/services/data/pslProjection.ts:358; src/services/data/rfqSourcingGate.ts:189; src/services/data/mock/stores/pslCapSettingStore.ts:77; src/services/data/mock/MockProcurementService.ts:615 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` (kursi, bukan orang), `ts`, `outcome`, satu `correlationId` per perintah; tidak ada cascade yang menyentuh mesin ini, sehingga tidak ada `causationId`. Kolom `attribution` terpisah mencatat siapa yang dapat disebut. *Riwayat status* milik pencatatan pada kartu profil adalah catatan kedua yang lebih sempit: satu baris per tindakan penetapan (ajukan, setujui, tolak, ubah, perpanjang, tarik) — publikasi dan pengesampingan batas tidak meninggalkan baris di sana.

Urutan kerja untuk `psl-004` — seed berjalan pada T+0 saat aplikasi dimulai di bawah dua scope sempit (pengadaan, lalu kepatuhan), masing-masing bertindak sebagai identitas sampel; penguji melanjutkan pada kartu profil, bertindak sebagai identitas sampel (dari kursi yang tidak menyebut siapa pun setiap tindakan ditolak oleh `psl_decider_named`):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| T+0 | ∅ → Proposed | procurement (`buyer:all`, identitas sampel) | seed mengajukan `Mandatory` untuk `sup-005`, dua kode bahan aktif, alasan *"Raised under the approved 2026 actives strategy."* | `t_psl_propose` |
| T+0 | Proposed → Listed | compliance (`buyer:all`, identitas sampel) | seed menyetujui, alasan *"Approved with a shortened validity, justification recorded."* | `t_psl_grant` |
| T+0 | Listed → Listed | compliance (`buyer:all`, identitas sampel) | seed mencatat batas 150 hari beserta justifikasinya | `t_psl_cap_override` |
| T+0 | Listed → Listed | procurement (`buyer:all`, identitas sampel) | seed membagikannya kepada pemasok | `t_psl_publish` |
| T+1 (penguji) | Listed → Listed | compliance (`buyer:all`, identitas sampel) | **Ubah penetapan** → `Validated` + alasan (pemeriksaan kursi tidak berlaku untuk `Validated`) | `t_psl_change_status` |
| T+2 (penguji) | Listed → Listed | compliance (`buyer:all`, identitas sampel) | **Perpanjang** ke tanggal tidak lebih lambat dari 2026-12-29 (150 hari dari 2026-08-01) — yang lebih lambat ditolak sampai batas dinaikkan | `t_psl_renew` |
| T+3 (penguji) | Listed → Withdrawn | compliance (`buyer:all`, identitas sampel) | **Tarik** + alasan; baris pemasok lalu berbunyi *ditarik pada {tanggal}* | `t_psl_withdraw` |

Untuk cabang penolakan, jalankan `psl-008` (satu-satunya pengajuan hasil seed) dan pilih **Tolak** dengan alasan, bertindak sebagai identitas sampel selain pengajunya; eventnya `t_psl_reject`. Untuk pemeriksaan kursi, coba **Setujui** pada `psl-008` dari kursi pembeli bawaan: panel menampilkan pemberitahuan kursi dan hanya menawarkan **Tolak**; persempit kursi ke compliance dan bertindaklah sebagai identitas sampel selain pengajunya untuk menyetujui.

<!-- src: src/services/transitions/events.ts:26; src/services/transitions/events.ts:98; src/services/data/mock/pslSeed.ts:640; src/services/data/mock/pslSeed.ts:672; src/services/data/mock/pslSeed.ts:703; src/services/data/mock/pslSeed.ts:714; src/services/data/mock/pslSeed.ts:732; src/services/data/mock/MockCommandService.ts:2263; src/main.tsx:120 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada tombol **Pencatatan baru**; kepala halaman berbunyi *"Menunggu Pengadaan"* | pemberitahuan alih tangan di kepala halaman | kursi tidak memegang `psl:propose` | bertindak dari kursi yang memegang jalur pengadaan |
| Panel berbunyi *"Menunggu Kepatuhan"* alih-alih Setujui/Tolak, atau slot ubah/perpanjang/tarik atau batas pada kartu menunjukkannya | pemberitahuan alih tangan di slot verba itu | kursi tidak punya `psl:decide` (atau `psl:cap-set`) | alihkan ke kursi kepatuhan |
| Kartu menunjukkan *"Menunggu Pengadaan"* di tempat **Bagikan ke pemasok** seharusnya berada | pemberitahuan alih tangan di slot publikasi | kursi tidak punya `psl:publish` | alihkan ke kursi pengadaan |
| Hanya **Tolak** yang ditawarkan pada pengajuan, dengan catatan tentang kursi yang "juga mengajukan pencatatan" | pemberitahuan `psl-seat-holds-both`; atau toast *"Kursi ini mengajukan sekaligus memutuskan pencatatan…"* | `POLICY_REJECTED:psl_restrictive_status_approved` — kursi memegang kedua atom dan penetapannya `Mandatory`/`Sole Source` (kursi pembeli bawaan) | persempit kursi ke compliance pada panel identitas, atau alihkan keputusan |
| Toast *"Pemasok tersebut tidak ada dalam daftar…"* | `POLICY_REJECTED:psl_supplier_resolved` | dispatch buatan tangan mengetik id | pilih pemasok dari daftar pada formulir |
| Toast *"Pencatatan harus menyebut setidaknya satu kode material"* / *"…bukan material yang dibawa platform ini"* | `MISSING_FIELDS:materialCodes` / `POLICY_REJECTED:psl_scope_well_formed` | kode kosong, atau tidak ada di master material | gunakan kode katalog yang nyata; ajukan permintaan material untuk yang belum ada |
| Toast *"Penetapan akan berakhir sebelum dimulai"* / *"…harus berupa hari yang nyata"* | `POLICY_REJECTED:psl_validity_ordered` | tanggal terbalik atau tidak terbaca | perbaiki tanggal (tanggal lampau tidak masalah) |
| Toast *"Pencatatan memerlukan justifikasi tertulis…"* / *"Setiap entri dalam riwayat pencatatan memuat alasan"* | `POLICY_REJECTED:psl_justification_authored` / `psl_decision_authored`, atau `MISSING_FIELDS:reason` | teks kosong atau hanya spasi | tulis; tombol tetap nonaktif sampai teks tidak kosong |
| Toast *"Pihak yang mengajukan pencatatan ini tidak boleh ikut memutuskannya"* | `POLICY_REJECTED:psl_decider_not_proposer` | kursi pemutus bertindak sebagai identitas sampel yang sama yang mengajukan baris | putuskan dari identitas sampel lain — kursi yang tidak menyebut siapa pun justru ditolak oleh `psl_decider_named` |
| Pop-up "Super Admin — nyatakan alasannya" terbuka saat keputusan pencantuman | pop-up menyebut pemeriksaannya ("Orang yang mengusulkan pencantuman tidak boleh memutuskannya") dan menerima satu baris; bila dibatalkan, tindakan tetap ditolak dengan "Tindakan ini melewati pemeriksaan empat-mata dengan pengecualian Super Admin, dan tidak diambil tanpa alasan satu baris…" (`POLICY_REJECTED:super_admin_bypass_reasoned:SUPER_ADMIN_REASON_REQUIRED`) | kursinya adalah Super Admin, satu-satunya kursi yang dilewatkan pemeriksaan ini; tindakan dicatat sebagai "Super Admin — empat-mata dilewati" beserta pemeriksaan dan alasannya, dan dokumennya memuat catatan itu. Admin (operasional) tidak dikecualikan dan ditolak seperti sebelumnya | nyatakan alasannya dan lanjutkan, atau batalkan dan alihkan tindakan kepada orang yang diterima pemeriksaan itu. Setiap tindakan semacam ini tercantum di **Platform → Aktivitas Super Admin** |
| Toast kegagalan pada **Setujui**, **Tolak**, **Ubah penetapan**, **Perpanjang**, **Tarik**, **Bagikan ke pemasok** atau **Tetapkan batas untuk pencatatan ini**: *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* | `POLICY_REJECTED:psl_decider_named` (`PSL_DECIDER_UNATTRIBUTED`); baris di panel keputusan atau di bagian atas blok tindakan kartu sudah menyatakannya | kursi tidak menyebut siapa pun — belum ada pengguna contoh yang dipilih di panel identitas | pilih pengguna contoh di panel identitas, lalu ulangi tindakannya; tidak ada yang disimpan dan pencatatan tidak berpindah |
| Toast *"Pencatatan ini sudah memakai penetapan tersebut"* | `POLICY_REJECTED:psl_status_actually_changes` | penetapan yang dipilih sama dengan yang sekarang | pilih yang lain atau biarkan |
| Toast *"Perpanjangan memundurkan tanggal akhir…"* | `POLICY_REJECTED:psl_renewal_extends` | tanggal baru tidak setelah akhir efektif hari ini | pilih tanggal yang lebih lambat; untuk memperpendek, catat pengesampingan batas |
| Toast *"Tanggal akhir itu melampaui batas masa berlaku yang berlaku…"* | `POLICY_REJECTED:psl_renewal_within_cap` | tanggal melampaui *Berlaku dari* + batas (365 secara bawaan; pengesampingan bila ada) | catat pengesampingan batas yang lebih panjang lebih dulu (hingga 730), atau perpanjang di dalamnya |
| Toast *"Pencatatan ini sudah dibagikan kepada pemasok…"* | `POLICY_REJECTED:psl_not_already_published` | publikasi kedua | tidak ada yang perlu dilakukan — perubahan sampai kepada pemasok tanpa dibagikan ulang |
| Toast *"Batas itu melebihi plafon platform sebesar 730 hari"* / *"…bilangan bulat hari yang lebih besar dari nol"* | `POLICY_REJECTED:psl_cap_within_ceiling` | batas di atas 730, nol, negatif, atau pecahan | catat batas dalam plafon |
| Toast *"Pengesampingan tanpa justifikasi adalah pengecualian yang tidak dijelaskan"* | `POLICY_REJECTED:psl_cap_justification_authored` | justifikasi batas kosong | tulis alasannya |
| *"…tidak berada dalam status yang memungkinkan tindakan ini"* | `ILLEGAL_TRANSITION` | bertindak pada baris yang sudah berpindah (mis. memutuskan pencatatan yang sudah diputuskan tab lain) | buka kembali baris dan ambil tindakan yang ditawarkan keadaannya |
| Kursi pemasok mendapat *"Ini di luar jangkauan akun Anda — atau memang tidak ada datanya"* | `SCOPE_DENIED` (dilempar) | setiap atom PSL ada di sisi pembeli; pemasok tidak boleh bertindak atas pencatatan | wajar; pemasok hanya membaca `/supplier/performance` |
| *Status pemasok pilihan Anda* milik pemasok kosong | `/supplier/performance` menunjukkan *"Paragon belum membagikan penetapan pemasok pilihan kepada Anda."* | tidak ada pencatatan pemasok itu yang dipublikasikan | **Bagikan ke pemasok** pada baris Listed |
| Kartu berbunyi `Expired` tetapi wizard pengadaan tetap menenderkan / Direktori berbunyi *Kedaluwarsa* | status tampilan | akhir efektif sudah lewat (batas mungkin mengakhirinya sebelum *Sampai*) | perpanjang di dalam batas, naikkan batas, atau tarik |
| Dua orang mengubah penetapan bersamaan dan keduanya berhasil | dua baris riwayat | tidak ada compare-and-set yang melindungi verba pemertahan keadaan | wajar; baca riwayat dan tetapkan ulang bila perlu |
| Ingin membatalkan publikasi | tidak ada tombol seperti itu | berdasarkan keputusan operator — publikasi ditulis sekali | tarik pencatatannya |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:PSL`; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Pemasok pilihan"* | modul Pemasok pilihan dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61; src/lib/glossary/refusals.glossary.ts:52; src/lib/glossary/refusals.glossary.ts:114; src/pages-v2/psl/pslRefusal.ts:47; src/lib/i18n/psl.ts:433; src/services/transitions/policies.ts:1248; src/services/data/mock/MockCommandService.ts:2252; src/lib/i18n/psl.ts:472; src/services/transitions/flows/psl.flow.ts:31 -->

<!-- section:testdata -->
## 9 · Data uji

Store terbuka dalam keadaan kosong dan seed menumbuhkan setiap baris melalui verba sungguhan saat aplikasi dimulai, dalam urutan id; id ditetapkan store. Tanggal di bawah adalah nilai yang telah dijangkarkan ulang yang dilihat pembaca pada waktu kini yang dinyatakan (31 Agu 2026); status tampilan adalah yang ditunjukkan chip di samping keadaan tersimpan.

| Keadaan | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Proposed | `psl-008` | — | `sup-007`, `Sole Source`, `FR-ROUD-4470`, 2026-09-05 → 2027-09-05, internal. Satu-satunya baris tempat panel keputusan terbuka; menyetujuinya dari kursi bawaan ditolak oleh pemeriksaan kursi |
| Listed | `psl-001` | — | `sup-002`, `Sole Source`, `RM-PSTN-7150` + `RM-STEAR-7300`, 2026-06-02 → 2027-06-07, **dipublikasikan**; menunjukkan `Listed` — mendorong lencana Sole Source Direktori untuk `sup-002` |
| Listed | `psl-002` | — | `sup-002`, `Validated`, `RM-MYRST-7310`, 2026-07-02 → 2026-10-15, internal; menunjukkan `Expiring` (berlaku dan belum dibagikan) |
| Listed | `psl-003` | — | `sup-002`, `Mandatory`, `RM-EMUL-9410`, 2025-11-04 → 2026-08-01, **dipublikasikan**; menunjukkan `Expired` — di bawah *Kedaluwarsa, masih terdaftar*; tidak memberikan apa pun |
| Listed | `psl-004` | — | `sup-005`, `Mandatory`, `AI-NIAC-6601` + `AI-PANTO-6640`, 2026-08-01 → 2027-03-19, batas 150 hari → efektif 2026-12-29, **dipublikasikan**; menunjukkan `Listed` |
| Listed | `psl-005` | — | `sup-005`, `Validated`, `AI-HYALU-6610`, 2026-08-11 → 2029-02-16, internal; menunjukkan `Listed` (akhir efektif dibatasi ke 2027-08-11 oleh bawaan 365 hari) |
| Listed | `psl-009` | — | `sup-005`, `Mandatory`, `RM-EMUL-9440`, 2026-10-10 → 2028-01-13, internal; menunjukkan `Scheduled` — belum berlaku |
| Listed | `psl-010` | — | `sup-007`, `Mandatory`, `PK-PETB-8810` + `PK-CAPF-8820`, 2026-04-01 → 2026-10-01, **dipublikasikan**; menunjukkan `Expiring` — baris peringatan kedaluwarsa pemasok punya subjek |
| Withdrawn | `psl-006` | — | `sup-007`, `Validated`, `PK-PETB-8804`, 2026-02-12 → 2026-08-26, internal; sudah melewati tanggalnya namun berbunyi `Withdrawn`, bukan `Expired` |
| Withdrawn | `psl-011` | — | `sup-007`, `Validated`, `PK-CART-9901`, 2026-04-29 → 2027-03-19, **dipublikasikan lalu ditarik** — baris pemasok menunjukkan baris penarikan |
| Withdrawn | `psl-012` | — | `sup-008`, `Validated`, `PK-CART-9910`, 2026-02-01 → 2026-11-01, internal; pemasok yang kedaluwarsa untuk sel ketiga Direktori |
| Rejected | `psl-007` | — | `sup-007`, `Mandatory`, `PK-ALCP-2450`, 2026-04-03 → 2027-06-27, internal; di dalam tanggalnya namun tidak memberikan apa pun |

Pencatatan tidak membawa nomor dokumen — id `psl-NNN` adalah pengenalnya dan target tautan langsung (`/buyer/suppliers/{supplierId}?id=psl-NNN`). Tidak ada baris yang menguji sumber batas *Dibatasi oleh plafon platform*: verba menolak batas di atas 730, sehingga cabang itu hanya diliput secara sintetis dalam pengujian. Semua data bersifat SIMULASI (lihat §5).

<!-- src: src/services/data/mock/pslSeed.ts:155; src/services/data/mock/pslSeed.ts:440; src/services/data/mock/stores/pslStore.ts:60; src/services/data/fixturePresent.ts:267; src/services/data/fixturePresent.ts:472; src/services/data/pslProjection.ts:298; src/services/data/mock/pslSeed.ts:63 -->
