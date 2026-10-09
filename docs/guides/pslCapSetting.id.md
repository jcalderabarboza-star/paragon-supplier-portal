---
entity: pslCapSetting
locale: id
title: Batas masa berlaku pemasok preferensi
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_psl_cap_set
---

<!-- section:summary -->
## 1 · Apa proses ini

Plafon seluruh portal atas berapa lama sebuah kualifikasi boleh berlaku sebelum harus diambil ulang, disimpan sebagai riwayat keputusan alih-alih nilai yang disunting seseorang. Pengaturan yang belum dicatat dan pengaturan yang dipilih adalah dua fakta berbeda, dan permukaan yang tidak dapat membedakannya akan melaporkan bawaan seolah-olah ada yang memilihnya. Pengaturan ini membatasi setiap pencatatan pemasok preferensi yang tidak membawa batasnya sendiri: *Berlaku efektif sampai* sebuah pencatatan adalah yang lebih awal antara tanggal akhir yang ditulis dan *Berlaku dari* ditambah batas yang berlaku, dan perpanjangan tidak boleh melewatinya.

Satu jalur pembeli menyentuhnya. **Kepatuhan** (compliance) memegang satu-satunya atom, `psl:cap-set` — atom yang sama yang mencatat pengesampingan batas per pencatatan — dan pengadaan tidak boleh memegangnya, karena siapa pun yang menetapkan bawaan portal dapat memperpanjang setiap penetapan yang mereka ajukan. Ada satu kunci pengaturan, `psl.default_cap_days`, dan entitasnya *adalah* kunci itu: tidak pernah dibuat, hanya dicatat. Setiap pencatatan ditambahkan; entri terakhir yang berlaku; tidak ada yang pernah kembali ke bawaan dengan sendirinya.

Mesin ini punya satu keadaan, **Governed**, yang tidak pernah ditinggalkannya. Satu-satunya verba adalah penambahan yang mempertahankan keadaan. **Verba ini tidak punya pemanggil.** Ia tersambung, terjaga, dan teruji, dan tidak ada layar di portal yang menjalankannya: tidak ada permukaan pengaturan portal untuk menampungnya, dan menyatakannya tersurfakan tanpa layar akan mengubah daftar tunggu yang jujur menjadi klaim palsu. Maka hari ini riwayatnya kosong dan batas yang berlaku di mana-mana adalah cadangan terkompilasi **365 hari**, dilaporkan secara jujur pada setiap kartu pencatatan sebagai *"Bawaan portal — belum ada batas yang ditetapkan"*. Plafon mutlaknya **730 hari**; verba ini maupun pengesampingan per pencatatan menolak apa pun di atasnya.

Penanda kejujuran. Tidak ada yang di-seed di sini — riwayat kosong adalah keputusan operator, bukan kelalaian, karena men-seed sebuah nilai akan menaruh keputusan yang tidak pernah diambil siapa pun ke dalam catatan. Satu-satunya cara menjalankan verba ini hari ini adalah dispatch buatan tangan di bawah scope kepatuhan yang menyebut seseorang, yaitu yang dilakukan spesifikasi perintah. Scope yang tidak menyebut siapa pun ditolak (`psl_cap_setter_named`), sehingga setiap pencatatan memuat orang yang menetapkannya — hari ini sebuah identitas sampel, karena direktori pengguna belum ada. Daftar pemasok preferensi yang diaturnya bersifat SIMULASI (lihat panduan `psl`).

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | Governed → keadaan sama | mencatat fakta (mempertahankan keadaan) · tidak aktif (tanpa pemanggil) | compliance | `t_psl_cap_set` |

Tidak ada langkah pembuatan: `Governed` adalah keadaan awal dan satu-satunya keadaan, dan target menjawabnya untuk satu kunci yang dikenal. Langkah ini berulang setiap kali bawaan baru diputuskan; setiap pencatatan tetap ada di riwayat.

**Percabangan**

Tidak ada keadaan dengan dua jalan keluar. Satu cabang yang penting berada di luar mesin: **tanpa entri**, cadangan terkompilasi 365 hari berlaku (`NO_SETTING_RECORDED`); **dengan entri**, nilai terakhir yang dicatat berlaku (`PORTAL_DEFAULT`); **dalam kedua kasus** nilai di atas plafon 730 hari akan dibatasi saat dibaca (`CEILING_BOUNDED`), cabang yang tidak dapat dicapai lewat verba tetapi tidak tertutup bila plafon kelak diturunkan.

<!-- src: src/services/transitions/flows/pslCapSetting.flow.ts:45; src/services/data/mock/stores/pslCapSettingStore.ts:115; src/services/data/pslProjection.ts:208 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_psl_cap_set — Catat batas bawaan portal <!-- transition:t_psl_cap_set -->

- **Jenis langkah:** mencatat fakta (mempertahankan keadaan) · tidak aktif (tanpa pemanggil)
- **Peran:** buyer · compliance
- **Dari → ke:** Governed → keadaan sama
- **Operator — di mana:** *tidak ditawarkan di mana pun hari ini.* Tidak ada halaman, panel, atau tombol yang mengirim verba ini; `/buyer/process-flows` mencantumkannya dengan alasan yang dinyatakan (kata-kata lencana persisnya tidak diukur di sini). Satu-satunya tempat dispatch di pohon kode adalah spesifikasi perintah.
- **Operator — lakukan:** tidak ada yang bisa dilakukan dari layar. Tindakan yang menjadi tujuan verba ini adalah: mencatat jumlah hari sebuah kualifikasi boleh berlaku di seluruh portal, sehingga *"belum ada yang memutuskan"* berhenti menjadi jawabannya dan pembaca berikutnya dapat melihat bahwa sebuah nilai dipilih dan kapan.
- **Operator — isi:** *days* — bilangan bulat lebih besar dari nol dan paling banyak 730. Id entitas adalah kunci pengaturan `psl.default_cap_days`; siapa yang memutuskan berasal dari sesi dan kapan dari store, sehingga keduanya bukan kolom.
- **Penguji — status yang diharapkan:** Governed (tidak berubah)
- **Penguji — konfirmasi:** hanya melalui dispatch buatan tangan di bawah scope yang memegang jalur kepatuhan dan menyebut seseorang (`entity: 'pslCapSetting'`, `entityId: 'psl.default_cap_days'`, `payload: { days }`). Sesudahnya: riwayat memuat satu entri lagi dengan `setAt` yang ditetapkan store; di `/buyer/suppliers/{supplierId}` → *Daftar preferensi*, setiap pencatatan **tanpa** pengesampingan sendiri mengubah baris *Batas masa berlaku* menjadi *"{hari} hari · Bawaan portal — batas telah ditetapkan"* dan menghitung ulang *Berlaku efektif sampai*; **Perpanjang** pada pencatatan semacam itu kini dibatasi oleh nilai baru; pencatatan dengan pengesampingan sendiri tidak tersentuh. Bawaan yang lebih pendek dapat menggeser status tampilan baris terdaftar menjadi `Expiring` atau `Expired` tanpa tindakan apa pun pada baris itu.
- **Penguji — peristiwa pemicu:** `t_psl_cap_set`
- **Pemeriksaan yang dapat menolak:** `psl_cap_setter_named` — scope harus menyebut seseorang (`PSL_CAP_SETTER_UNATTRIBUTED`); pemeriksaan ini berjalan lebih dulu, tidak ada yang ditambahkan ke riwayat, dan jumlah hari tidak diperiksa. `psl_default_cap_within_ceiling` — *days* harus bilangan bulat positif (`PSL_DEFAULT_CAP_NOT_A_DURATION`) dan tidak lebih dari plafon 730 hari (`PSL_DEFAULT_CAP_ABOVE_CEILING`: *"Bawaan di atas plafon akan dibatasi pada setiap pembacaan, yaitu pengaturan yang tidak dapat ditindaklanjuti siapa pun"*).
- **Glosarium:** `NO_SETTING_RECORDED`, `PORTAL_DEFAULT`, `CEILING_BOUNDED`, `LISTING_OVERRIDE`, `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `NOT_FOUND`, `SCOPE_DENIED`.
- **Kejujuran:** tersambung tetapi **tidak aktif** — tanpa pemanggil. Riwayat dikirim kosong berdasarkan keputusan operator, sehingga angka 365 hari pada setiap kartu adalah cadangan dan diberi label demikian. Scope yang tidak menyebut siapa pun ditolak dengan menyebut nama, sehingga pencatatan selalu memuat siapa yang menetapkannya. Kunci pengaturan yang tidak dikenal ditolak sebagai `NOT_FOUND` alih-alih dibuat diam-diam; scope pemasok ditolak pada tahap scope. Tidak ada pembaruan dan tidak akan pernah ada — menggantikan batas berarti menambahkan entri lain.
<!-- src: src/services/transitions/flows/pslCapSetting.flow.ts:67; src/services/transitions/flows/pslCapSetting.flow.ts:76; src/services/transitions/policies.ts:1402; src/services/data/mock/MockCommandService.ts:2409; src/services/data/mock/MockCommandService.ts:2693; src/services/data/mock/stores/pslCapSettingStore.ts:47; src/services/data/mock/stores/pslCapSettingStore.ts:77; src/services/data/mock/stores/pslCapSettingStore.ts:93; src/services/data/pslProjection.ts:98; src/services/data/pslProjection.ts:125; src/services/data/pslProjection.ts:208; src/components/v2-features/PslListingsSection.tsx:282; src/lib/i18n/psl.ts:323; src/services/data/mock/pslCommand.test.ts:580; src/services/transitions/businessRoles.ts:328 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Tidak ada percabangan di dalam mesin.** Satu keadaan, satu verba, tanpa jalan keluar.
- **Batas mana yang mengikat sebuah pencatatan (diturunkan saat dibaca, tanpa transisi).** **Kapan** pencatatan membawa pengesampingannya sendiri: nilai itu (`LISTING_OVERRIDE`) — riwayat ini tidak dikonsultasikan. **Kapan** tidak dan riwayat ini kosong: 365 hari (`NO_SETTING_RECORDED`) — jawaban hari ini pada setiap baris. **Kapan** tidak dan riwayat ini memuat entri: entri terakhir (`PORTAL_DEFAULT`). **Kapan** nilai yang seharusnya berlaku melebihi 730: 730 (`CEILING_BOUNDED`) — tidak dapat dicapai lewat verba, dipertahankan untuk hari ketika sebuah keputusan menurunkan plafon.
- **Penggantian.** **Kapan** bawaan baru diputuskan: tambahkan lagi; entri sebelumnya tetap ada di riwayat dan yang terbaru berlaku. Tidak ada kedaluwarsa dan tidak ada tanggal tinjauan — batas berlaku sampai batas lain dicatat.
- **Penolakan.** **Kapan** scope tidak menyebut siapa pun: ditolak dengan menyebut nama (`PSL_CAP_SETTER_UNATTRIBUTED`) sebelum hal lain diperiksa, tidak ada yang dicatat. **Kapan** *days* nol, negatif, pecahan, atau di atas 730: ditolak dengan menyebut nama, tidak ada yang dicatat. **Kapan** scope tidak memegang jalur kepatuhan (termasuk pengadaan): `ROLE_NOT_PERMITTED`. **Kapan** id entitas bukan `psl.default_cap_days`: `NOT_FOUND`.

<!-- src: src/services/data/pslProjection.ts:155; src/services/data/pslProjection.ts:208; src/services/data/mock/stores/pslCapSettingStore.ts:105; src/services/transitions/policies.ts:1402; src/services/data/mock/pslCommand.test.ts:639 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Ditampilkan di |
|---|---|---|---|---|
| *"Bawaan portal — belum ada batas yang ditetapkan"* | diturunkan saat dibaca | Governed (riwayat kosong) | pada setiap pencatatan tanpa pengesampingan sendiri, hari ini | `/buyer/suppliers/{supplierId}` → *Daftar preferensi* → *Batas masa berlaku* |
| *"Bawaan portal — batas telah ditetapkan"* | diturunkan saat dibaca | Governed (riwayat terisi) | hanya setelah verba ini dijalankan setidaknya sekali | baris kartu yang sama |
| *"Dibatasi oleh plafon platform"* | diturunkan saat dibaca | mana pun | nilai tercatat di atas plafon (tidak dapat dicapai lewat verba hari ini) | baris kartu yang sama |
| *"Menunggu Kepatuhan"* | diturunkan saat dibaca (kursi vs. atom) | — | akan muncul di samping kontrol mana pun untuk verba ini; kontrol semacam itu tidak ada | — |

Pengaturan ini tidak punya pil liveness sendiri; pencatatan yang dibatasinya membawa penanda SIMULASI (lihat panduan `psl`).

<!-- src: src/lib/i18n/psl.ts:322; src/lib/i18n/psl.ts:323; src/components/v2-features/PslListingsSection.tsx:282; src/services/data/pslProjection.ts:155 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `psl.default_cap_days` — satu-satunya kunci pengaturan. Tidak ada entri riwayat; baris di bawah menjelaskan bentuk yang akan dimiliki sebuah entri.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pencatatan pemasok preferensi | dibaca oleh `effectiveCap` untuk setiap pencatatan yang `capDaysOverride`-nya `null` | Bukan tautan tersimpan — sebuah proyeksi membaca riwayat. Pencatatan dengan pengesampingan sendiri tidak pernah mengonsultasikannya. |
| Entri riwayat | `settingId`, `days`, `setBy`, `setAt` | `setAt` ditetapkan store dan juga kunci pengurutan riwayat; `setBy` adalah atribusi dari sesi, bukan nama, dan selalu orang yang bernama: scope tanpa atribusi ditolak. Hanya-tambah; tanpa pembaruan. |
| Plafon | `PSL_CAP_CEILING_DAYS` (730) | Konstanta terkompilasi, hasil keputusan dan bukan pengganti sementara. Kedua verba batas mengutipnya dalam penolakan. |
| Cadangan | `PSL_DEFAULT_CAP_DAYS` (365) | Nilai yang berlaku atas riwayat kosong. Hanya tampilan dalam arti tidak ada yang memilihnya, dan kartu menyatakannya. |
| Tenant / pemilik | tidak ada (`readScopeOwner` bernilai null) | Pengaturan portal adalah catatan tata kelola pembeli; scope pemasok ditolak pada tahap scope, sama persis untuk kunci yang nyata maupun string yang bukan kunci. |

<!-- src: src/services/data/mock/stores/pslCapSettingStore.ts:62; src/services/data/mock/MockCommandService.ts:2409; src/services/data/pslProjection.ts:98; src/services/data/pslProjection.ts:125; src/services/data/pslProjection.ts:208 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = `t_psl_cap_set`, `actor` = `buyer:all`, `ts`, `outcome`, satu `correlationId`; tanpa cascade, sehingga tanpa `causationId`. Riwayat itu sendiri (`pslCapSettingStore`) adalah sejarah pengaturan ini, dari yang tertua. **Tidak ada event yang ada hari ini** — verba ini belum pernah dijalankan di luar rangkaian pengujian, dan store terbuka dalam keadaan kosong.

Satu-satunya urutan yang dapat dihasilkan penguji, melalui dispatch buatan tangan di bawah scope kepatuhan yang menyebut seseorang:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| T+0 (penguji) | Governed → Governed | compliance (`buyer:all`) | dispatch `{ days: 200 }` terhadap `psl.default_cap_days` | `t_psl_cap_set` |
| T+1 (penguji) | Governed → Governed | compliance (`buyer:all`) | dispatch `{ days: 400 }` — menggantikan T+0; kedua entri tetap ada | `t_psl_cap_set` |

Setelah T+0 setiap pencatatan tanpa pengesampingan berbunyi *200 hari · Bawaan portal — batas telah ditetapkan*; setelah T+1, 400. Dispatch `{ days: 800 }` kapan pun ditolak dan membiarkan riwayat tidak berubah.

<!-- src: src/services/transitions/events.ts:26; src/services/data/mock/stores/pslCapSettingStore.ts:83; src/services/data/mock/pslCommand.test.ts:580 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak menemukan tempat menetapkan batas portal | tidak ada kontrol di halaman mana pun | verba tidak punya pemanggil — tidak ada permukaan pengaturan | wajar; batas per pencatatan tetap bisa dicatat pada kartu pencatatan (`t_psl_cap_override`) |
| Setiap kartu pencatatan berbunyi *"Bawaan portal — belum ada batas yang ditetapkan"* | baris *Batas masa berlaku* | riwayat kosong; cadangan 365 hari berlaku | wajar hari ini; hanya berubah bila verba ini dijalankan |
| Dispatch buatan tangan ditolak: *"…melebihi plafon platform sebesar 730 hari"* | `POLICY_REJECTED:psl_default_cap_within_ceiling` (`PSL_DEFAULT_CAP_ABOVE_CEILING`) | *days* di atas 730 | catat nilai dalam plafon |
| Ditolak: *"…bilangan bulat hari yang lebih besar dari nol"* | `POLICY_REJECTED:psl_default_cap_within_ceiling` (`PSL_DEFAULT_CAP_NOT_A_DURATION`) | *days* nol, negatif, atau pecahan | gunakan bilangan bulat positif |
| Ditolak: alasan berbahasa Inggris *"…this seat carries no person, and setting the portal default validity cap is recorded against the person who set it"* | `POLICY_REJECTED:psl_cap_setter_named` (`PSL_CAP_SETTER_UNATTRIBUTED`) | scope yang mengirim tidak menyebut siapa pun | dispatch di bawah scope yang membawa orang sampel |
| Ditolak: `ROLE_NOT_PERMITTED:psl:cap-set` | string alasan | scope tidak memegang jalur kepatuhan (pengadaan tidak boleh memegangnya) | dispatch di bawah scope kepatuhan |
| Dilempar `NOT_FOUND` | kode `DataError` | id entitas bukan `psl.default_cap_days` | gunakan satu-satunya kunci pengaturan |
| Dilempar `SCOPE_DENIED` | kode `DataError` | scope pemasok | hanya sisi pembeli |
| Ditolak: `MISSING_FIELDS:days` | string alasan | payload tanpa *days* | sertakan |
| Perpanjangan yang tadinya muat kini ditolak | `POLICY_REJECTED:psl_renewal_within_cap` pada sebuah pencatatan | bawaan yang lebih pendek dicatat dan pencatatan tidak punya pengesampingan | catat pengesampingan per pencatatan, atau perpanjang dalam batas baru |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:PSL`; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Pemasok pilihan"* | modul Pemasok pilihan dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/policies.ts:1402; src/services/transitions/refusals.ts:61; src/services/data/mock/pslCommand.test.ts:580; src/services/data/mock/MockCommandService.ts:2409; src/services/transitions/policies.ts:1327 -->

<!-- section:testdata -->
## 9 · Data uji

| Keadaan | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Governed | `psl.default_cap_days` | — | kunci pengaturan adalah entitasnya: dapat dialamatkan dan terbaca `Governed`, tetapi belum ada pengaturan yang dicatat untuknya — riwayat dikirim kosong berdasarkan keputusan operator; kunci itu ada sebagai kosakata, bukan sebagai baris. Verba tersambung tetapi tidak punya pemanggil; jalankan hanya lewat dispatch buatan tangan. |

<!-- src: src/services/data/mock/stores/pslCapSettingStore.ts:47; src/services/data/mock/stores/pslCapSettingStore.ts:77; src/services/transitions/flows/pslCapSetting.flow.ts:76 -->
