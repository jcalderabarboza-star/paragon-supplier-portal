---
entity: processStep
locale: id
title: Langkah yang ditambahkan perubahan pada proses (langkah proses)
wired: true
owner: portal
source_sha: 8da750995f72eae9967d9961193acdfc8a787077
transitions:
  - t_step_complete
  - t_step_decline
---

<!-- section:summary -->
## 1 · Apa proses ini

Catatan langkah-langkah yang ditambahkan oleh perubahan pada sebuah proses. Sebuah perubahan, setelah berlaku, meletakkan langkah di depan tindakan yang sudah dimiliki proses: persetujuan, konfirmasi, atau langkah yang mengisi data. Selama langkah seperti itu masih terbuka, tindakan di belakangnya ditolak dan dokumennya tidak berpindah. Proses ini adalah tempat sebuah langkah diselesaikan, atau — untuk persetujuan — ditolak. Catatannya disimpan sebagai **buku catatan** yang hanya bertambah: satu catatan per penyelesaian atau penolakan, tidak pernah disunting dan tidak pernah dihapus.

Yang diperintahkan adalah **satu langkah pada satu dokumen**, yang disebut `<proses>:<dokumen>:<langkah>`. Tidak ada isi payload yang menyebut satu pun dari ketiganya, sehingga langkah yang diperintahkan dan langkah yang dicatat tidak dapat berbeda.

**Sebuah langkah jatuh tempo** bila tiga hal terpenuhi: versi yang mendefinisikannya sedang berlaku; dokumennya berada di tempat tindakan di belakang langkah itu dapat dilakukan; dan langkah-langkah yang diurutkan sebelumnya, di depan tindakan yang sama, sudah selesai. Langkah tidak memiliki tenggat. Langkah jatuh tempo karena posisi dokumennya, bukan karena harinya.

Siapa yang menyentuhnya: **setiap lajur sisi pembeli** memegang satu-satunya izin, `step:complete` — pengadaan, penerimaan, keuangan, kepatuhan, perencanaan, dan pemohon — begitu pula Admin dan Super Admin. Izin itu bukan yang menentukan siapa yang boleh mengambil sebuah langkah. **Lajur mana yang boleh mengambil sebuah langkah adalah lajur langkah itu sendiri**, yang ditetapkan oleh orang yang menulis perubahannya. Sebuah kursi memegang lajur sebuah langkah bila kursi itu memegang setiap izin yang dipegang lajur tersebut. Kursi pemasok tidak boleh bertindak di sini.

Penanda kejujuran, dinyatakan apa adanya:

- **Tidak ada langkah sampai seseorang memberlakukan sebuah perubahan.** Tidak ada yang berlaku saat seed, sehingga buku catatan dibuka kosong dan tidak ada dokumen yang menemui langkah.
- **Catatan langkah disimpan di memori.** Catatan itu hilang saat halaman dimuat ulang, bersama dokumen yang memilikinya. Versinya sendiri tetap ada di peramban setelah dimuat ulang; catatan tentang siapa yang memenuhi langkahnya tidak, sampai ada backend.
- **Langkah yang jatuh tempo tampil pada dokumennya.** Di panel dokumen, sebuah baris berbunyi **Langkah tambahan** — *"{step}. Menunggu {lane}."* Kursi yang memegang lajur langkah itu mendapat **Buka langkah**, yang membuka pop-up berisi instruksi, isian bila ada, langkah-langkah sebelumnya beserta siapa yang menyelesaikannya, dan tombol-tombolnya. Baris itu berdiri di tujuh halaman pembeli: permintaan pembelian, pesanan pembelian, penerimaan barang, faktur, acara sourcing, permintaan material, dan aplikasi pemasok. Tombol milik halaman untuk tindakan yang dihalangi tidak berubah; bila ditekan selagi sebuah langkah jatuh tempo, tombol itu menjawab dengan kalimat yang menyebut langkah dan lajurnya.
- **Persetujuan yang ditolak membuat tindakannya tetap ditolak.** Langkah itu dapat diputuskan lagi, dan keputusan terakhir yang dihitung.
- **Penyelesaian terpakai habis ketika tindakan di belakangnya berhasil.** Dokumen yang kembali ke tindakan yang sama menemui langkah itu lagi.
- **Penyelesaian hanya dihitung di bawah versi yang berlaku saat penyelesaian itu dilakukan.** Ketika versi lain mulai berlaku, langkah yang diselesaikan di bawah versi sebelumnya tidak dihitung untuknya.
- Sebuah langkah dicatat atas nama orang yang mengambilnya. Belum ada direktori pengguna, sehingga orang itu adalah identitas contoh yang dipilih di panel identitas. Kursi yang tidak menyebut siapa pun ditolak.
<!-- src: src/services/transitions/flows/processStep.flow.ts:1-58; src/services/data/mock/processStepTarget.ts:1-32,95-116; src/services/flowBuilder/flowOverlay.ts:1-21,63-133,137-149; src/services/flowBuilder/stepLedger.ts:1-40; src/services/transitions/businessRoles.ts:150-155,281-292,309-311,387-391,437-439 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Recorded | sebuah langkah ada karena versi yang berlaku mendefinisikannya dan dokumennya ada (tanpa tindakan pembuatan; kunci lain mana pun adalah `NOT_FOUND`) | — | — |
| 1 | Recorded → status yang sama | mencatat fakta (mempertahankan status): satu penyelesaian ditambahkan ke buku catatan | buyer · lajur langkah itu sendiri | `t_step_complete` |
| 2 | Recorded → status yang sama | mencatat fakta (mempertahankan status): satu penolakan ditambahkan ke buku catatan; hanya langkah persetujuan | buyer · lajur langkah itu sendiri | `t_step_decline` |

Kedua tindakan berulang: sebuah langkah dapat diputuskan lagi, dan langkah yang sudah terpakai jatuh tempo lagi ketika dokumennya kembali ke tindakan yang sama.

**Percabangan**

Tidak ada status dengan dua jalan keluar. Keputusannya terletak pada tindakan mana yang diambil:

- **Di Recorded, langkah persetujuan:** `t_step_complete` — lajur langkah itu — ketika persetujuan diberikan; tindakan di belakang langkah itu lalu dapat dilakukan. `t_step_decline` — lajur langkah itu — ketika persetujuan ditolak, beserta alasannya; tindakan di belakang langkah itu tetap ditolak.
- **Di Recorded, langkah konfirmasi atau pengisian data:** hanya `t_step_complete`. Langkah seperti itu diselesaikan, bukan ditolak.
<!-- src: src/services/transitions/flows/processStep.flow.ts:22-58; src/services/data/mock/processStepTarget.ts:23-32,84-96 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_step_complete — Selesaikan langkah <!-- transition:t_step_complete -->

- **Jenis langkah:** mencatat fakta (mempertahankan status) · tindakan operator
- **Peran:** buyer · lajur langkah itu sendiri (atom `step:complete`, dipegang setiap lajur sisi pembeli serta Admin dan Super Admin; kursi juga harus memegang setiap izin lajur yang disebut langkah itu)
- **Dari → ke:** Recorded → status yang sama
- **Operator — di mana:** halaman dokumen tempat langkah itu berada — `/buyer/purchase-requisition`, `/buyer/orders`, `/buyer/goods-receipt`, `/buyer/invoices`, `/buyer/sourcing`, `/buyer/material-requests`, atau `/buyer/supplier-applications` — → buka dokumennya → di panelnya, baris **Langkah tambahan** → **Buka langkah** → pop-up yang diberi nama langkah itu → **Selesaikan langkah** (pada langkah persetujuan tombolnya berbunyi **Setujui**). **Buka langkah** hanya ditampilkan kepada kursi yang memegang lajur langkah itu; kursi lain membaca lajur mana yang ditunggu langkah itu.
- **Operator — lakukan:** baca pop-upnya: di bawah judul, *"Ditambahkan oleh versi {version} proses ini · diselesaikan oleh {lane}"*, lalu instruksi langkah itu, dan langkah-langkah sebelumnya sebagai *"“{step}” — diselesaikan oleh {person}"*. Kerjakan apa yang diminta instruksinya. Untuk langkah pengisian data, isi isiannya; isian wajib ditandai dengan tanda bintang. Tekan **Selesaikan langkah**, atau **Setujui** pada langkah persetujuan. Tindakan di belakang langkah itu lalu dapat dilakukan dengan tombol milik halamannya.
- **Operator — isi:** `values` — untuk langkah pengisian data, satu nilai per isian yang didefinisikan langkah; setiap isian yang ditandai wajib harus diberikan. Langkah lain tidak memerlukan apa pun. Siapa yang menyelesaikan berasal dari sesi dan kapan dari store; keduanya bukan isian, dan langkah mana serta dokumen mana adalah kunci tempat tindakan diperintahkan.
- **Penguji — status yang diharapkan:** Recorded (tidak berubah)
- **Penguji — konfirmasi:** toast *"Langkah selesai: {step}."*; pop-up tertutup dan baris **Langkah tambahan** hilang dari panel, atau menampilkan langkah berikutnya di depan tindakan yang sama. Buku catatan bertambah satu catatan: proses, dokumen, dan langkahnya, versi yang berlaku saat itu, keputusan *completed*, siapa, kapan, dan nilai yang diberikan. Bila tidak ada langkah lain yang terbuka di depan tindakan yang sama, tombol milik halaman tidak lagi ditolak sebagai `STEP_PENDING`. Setelah tindakan berhasil, catatan itu ditandai terpakai.
- **Penguji — peristiwa pemicu:** `t_step_complete`
- **Pemeriksaan yang dapat menolak:** dalam urutan ini. `step_actor_named` — kursinya harus menyebut seseorang (`STEP_ACTOR_UNATTRIBUTED`). `step_may_be_taken` — kuncinya tidak menyebut langkah dari versi yang berlaku (`STEP_UNKNOWN`); langkah itu tidak jatuh tempo pada dokumen ini — sudah selesai, langkah yang lebih awal masih terbuka, atau dokumennya tidak berada di tempat tindakan di belakangnya dapat dilakukan (`STEP_NOT_DUE`); kursi tidak memegang lajur langkah itu (`STEP_LANE_NOT_HELD`); orang itu menyelesaikan langkah lebih awal yang mengharuskan langkah ini diselesaikan oleh orang yang berbeda (`STEP_COMPLETER_IS_EARLIER_COMPLETER` — alihkan kepada orang lain; Super Admin lolos dengan alasan satu baris yang dicatat, dan tanpa alasan ditolak sebagai `SUPER_ADMIN_REASON_REQUIRED`). `step_fields_given` — isian wajib pada langkah pengisian data dibiarkan kosong; penolakan menyebut masing-masing (`STEP_FIELD_MISSING`). Sebelum itu: kursi pemasok ditolak pada tahap scope; kunci yang tidak menyebut langkah dari versi yang berlaku, atau dokumen yang tidak dimiliki prosesnya, adalah `NOT_FOUND`; kursi tanpa `step:complete` adalah `ROLE_NOT_PERMITTED`; payload yang membawa kunci yang disimpan platform untuk orang yang bertindak adalah `ACTOR_IN_PAYLOAD`.
- **Glosarium:** `STEP_PENDING` · `ROLE_NOT_PERMITTED` · `NOT_FOUND` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Kejujuran:** baris dan pop-up itu tidak memberi hak apa pun: **Buka langkah** ditampilkan menurut aturan lajur yang sama dengan yang dipakai pemeriksaan dispatcher, dan tindakannya tetap diputuskan dispatcher. Penolakan ditampilkan sebagai toast dalam bahasa pembaca dan pop-up tetap terbuka. Di atas tombol, pop-up menyatakan kursi mana ini: *"Kursi ini tidak menyebut siapa pun, sehingga tindakan ini akan ditolak. Pilih pengguna contoh di panel identitas terlebih dahulu."*, atau bahwa tindakan akan dicatat atas nama orang contoh. Catatannya disimpan di memori dan hilang saat dimuat ulang. Waktu yang dicatat adalah waktu kini yang dinyatakan portal, bukan jam dinding. Memegang `step:complete` saja tidak cukup: kursi yang memegang lajur lain ditolak dengan disebut namanya.
<!-- src: src/services/transitions/flows/processStep.flow.ts:30-42; src/services/data/mock/processStepTarget.ts:23-82,95-116; src/services/transitions/policies.ts:2864-2873,2965-2972; src/services/flowBuilder/flowOverlay.ts:63-149,206-212; src/services/flowBuilder/stepLedger.ts:17-70; src/services/identity/superAdmin.ts:36-50 -->

### t_step_decline — Tolak langkah persetujuan <!-- transition:t_step_decline -->

- **Jenis langkah:** mencatat fakta (mempertahankan status) · tindakan operator
- **Peran:** buyer · lajur langkah itu sendiri (atom `step:complete`, dipegang setiap lajur sisi pembeli serta Admin dan Super Admin; kursi juga harus memegang setiap izin lajur yang disebut langkah itu)
- **Dari → ke:** Recorded → status yang sama
- **Operator — di mana:** halaman dokumen tempat langkah itu berada — `/buyer/purchase-requisition`, `/buyer/orders`, `/buyer/goods-receipt`, `/buyer/invoices`, `/buyer/sourcing`, `/buyer/material-requests`, atau `/buyer/supplier-applications` — → buka dokumennya → di panelnya, baris **Langkah tambahan** → **Buka langkah** → pop-up yang diberi nama langkah itu → **Tolak** → tulis **Mengapa ditolak** → **Konfirmasi penolakan**. **Tolak** hanya berdiri pada langkah persetujuan, dan **Buka langkah** hanya bagi kursi yang memegang lajur langkah itu.
- **Operator — lakukan:** tekan **Tolak**; pop-up menanyakan sebabnya. Tulis alasannya dan tekan **Konfirmasi penolakan**, tombol perusaknya; **Batal** kembali ke langkah itu. Tindakan di belakang langkah itu tetap ditolak sampai langkah diputuskan lagi dan diselesaikan.
- **Operator — isi:** **Mengapa ditolak** (`reason`, wajib) — dengan kata-kata. **Konfirmasi penolakan** tetap nonaktif selama alasan kosong.
- **Penguji — status yang diharapkan:** Recorded (tidak berubah)
- **Penguji — konfirmasi:** toast *"Langkah ditolak: {step}."*; pop-up tertutup dan barisnya kini berbunyi *"{step} ditolak. Menunggu {lane} memutuskan lagi."* Dibuka lagi, pop-up menampilkan **Langkah ini ditolak** — *"{person} menolaknya: “{reason}”. Langkah dapat diputuskan lagi."* Buku catatan bertambah satu catatan dengan keputusan *declined*, siapa, kapan, dan alasannya. Tombol milik halaman untuk tindakan itu menjawab *"Belum bisa: langkah “{step}” ditolak oleh {person} — “{reason}”. Langkah menunggu {lane} memutuskan lagi. Tidak ada yang diubah."* (`STEP_PENDING`, dengan rincian yang berakhir `:declined`). Menyelesaikan langkah itu sesudahnya mengangkat penolakan: keputusan terakhir yang dihitung.
- **Penguji — peristiwa pemicu:** `t_step_decline`
- **Pemeriksaan yang dapat menolak:** dalam urutan ini. `step_actor_named` — kursinya harus menyebut seseorang (`STEP_ACTOR_UNATTRIBUTED`). `step_may_be_taken` — empat hal yang sama seperti saat menyelesaikan: `STEP_UNKNOWN`, `STEP_NOT_DUE`, `STEP_LANE_NOT_HELD`, `STEP_COMPLETER_IS_EARLIER_COMPLETER`. `step_decline_reasoned` — langkahnya bukan persetujuan; langkah konfirmasi atau pengisian data diselesaikan, bukan ditolak (`STEP_NOT_AN_APPROVAL`); atau alasannya hanya berisi spasi (`STEP_DECLINE_REASON_BLANK`). Sebelum itu: payload tanpa `reason` adalah `MISSING_FIELDS:reason`; kunci yang tidak menyebut langkah adalah `NOT_FOUND`; kursi tanpa `step:complete` adalah `ROLE_NOT_PERMITTED`.
- **Glosarium:** `STEP_PENDING` · `ROLE_NOT_PERMITTED` · `NOT_FOUND` · `MISSING_FIELDS` · `ACTOR_IN_PAYLOAD` · `POLICY_REJECTED` · `SCOPE_DENIED` · `NO_PERSON_IN_SESSION`
- **Kejujuran:** menolak tidak memindahkan dokumen dan tidak mengakhiri apa pun: tindakan ini mencatat bahwa persetujuan ditolak, dan langkahnya tetap terbuka. Catatannya disimpan di memori dan hilang saat dimuat ulang.
<!-- src: src/services/transitions/flows/processStep.flow.ts:43-56; src/services/data/mock/processStepTarget.ts:34-72,84-116; src/services/transitions/policies.ts:2864-2873,2965-2972; src/services/flowBuilder/flowOverlay.ts:86-113,151-176 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Menyelesaikan atau menolak (di Recorded, langkah persetujuan).** Cabang A — `t_step_complete` — **Kapan:** lajur memberikan persetujuan. Cabang B — `t_step_decline` — **Kapan:** lajur menolaknya; alasan wajib dan tindakan di belakang langkah itu tetap ditolak.
- **Lajur mana yang boleh mengambil langkah (sebelum tindakan).** Langkah menyebut satu lajur. Sebuah kursi memegangnya bila kursi itu memegang setiap izin yang dipegang lajur tersebut: kursi yang memilih lajur itu memegangnya, peran khusus yang dibangun di atas lajur itu memegangnya, dan Admin serta Super Admin memegangnya. Kursi lain mana pun ditolak sebagai `STEP_LANE_NOT_HELD`, meskipun memegang `step:complete`.
- **Langkah tidak jatuh tempo (pengecualian).** Ditolak sebagai `STEP_NOT_DUE` bila langkah sudah selesai, bila langkah yang diurutkan sebelumnya di depan tindakan yang sama masih terbuka, atau bila dokumen tidak berada di status awal tindakan di belakang langkah itu. Langkah-langkah di depan satu tindakan diambil menurut urutannya.
- **Orang yang berbeda dari langkah yang lebih awal (pengecualian).** Bila perubahan menetapkan bahwa langkah ini diselesaikan oleh orang yang berbeda dari yang menyelesaikan langkah lebih awal yang disebut, orang yang sama ditolak sebagai `STEP_COMPLETER_IS_EARLIER_COMPLETER`. Super Admin lolos dengan alasan satu baris yang dicatat; catatan dan peristiwanya menyebut pemeriksaan yang dikesampingkan.
- **Kursi tidak menyebut siapa pun (pengecualian).** Ditolak sebagai `POLICY_REJECTED:step_actor_named` (`STEP_ACTOR_UNATTRIBUTED`). Tidak ada yang dicatat. Pilih pengguna contoh di panel identitas, lalu ulangi tindakannya.
- **Isian wajib dibiarkan kosong (pengecualian).** Menyelesaikan langkah pengisian data tanpa nilai untuk isian wajib ditolak sebagai `STEP_FIELD_MISSING`, dengan menyebut setiap isian.
- **Menolak langkah yang bukan persetujuan (pengecualian).** Ditolak sebagai `STEP_NOT_AN_APPROVAL`. Penolakan dengan alasan yang hanya berisi spasi ditolak sebagai `STEP_DECLINE_REASON_BLANK`; tanpa alasan sama sekali, sebagai `MISSING_FIELDS:reason`.
- **Kunci yang tidak menyebut langkah (pengecualian).** Kunci yang prosesnya tidak terdaftar, yang dokumennya tidak dimiliki proses itu, atau yang langkahnya tidak didefinisikan versi yang berlaku adalah `NOT_FOUND`. Pemeriksaannya memberi jawaban yang sama dengan nama (`STEP_UNKNOWN`). Langkah tidak pernah dibuat dengan menyebutnya.
- **Tindakan yang dihalangi, selama sebuah langkah terbuka (pada tindakan itu, bukan di sini).** Dispatcher menolak tindakan itu sebagai `STEP_PENDING`, dengan `<proses>:<dokumen>:<langkah>` sebagai rinciannya, dan `:declined` sesudahnya bila keputusan terakhir atas langkah itu adalah penolakan. Tombol milik halaman untuk tindakan itu tidak berubah dan menjawab *"Belum bisa: langkah “{step}” harus diselesaikan dahulu. Langkah menunggu {lane}. Tidak ada yang diubah."* Pemeriksaan ini ditanyakan setelah pemeriksaan peran dan setelah keabsahan, sehingga kursi tanpa hak tidak mengetahui apa pun tentang dokumennya, dan sebelum pemeriksaan yang sudah dimiliki proses.
- **Siapa pun yang menyelesaikan langkah tidak boleh kemudian melakukan tindakannya (pada tindakan itu, bukan di sini).** Bila perubahan menetapkannya, orang yang menyelesaikan langkah ditolak melakukan tindakannya sebagai `STEP_COMPLETER_MAY_NOT_ACT`, di bawah nama `added_check`, setelah setiap pemeriksaan yang sudah dimiliki proses lolos. Super Admin lolos dengan alasan satu baris yang dicatat.
- **Versinya dihentikan, digantikan, atau dikesampingkan (diturunkan, bukan tindakan).** Langkah-langkahnya tidak lagi jatuh tempo, dan kunci yang menyebut salah satunya adalah `NOT_FOUND`. Catatan yang sudah ditulis tetap disimpan.
<!-- src: src/services/data/mock/processStepTarget.ts:23-96; src/services/flowBuilder/flowOverlay.ts:36-62,99-133,137-214; src/services/transitions/dispatcher.ts:319,881-889,923-936; src/services/transitions/refusals.ts:108-120; src/services/transitions/policies.ts:2965-2972 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| **Langkah tambahan** — *"{step}. Menunggu {lane}."* dengan **Buka langkah** | diturunkan saat dibaca | Recorded | versi yang mendefinisikan langkah itu berlaku, dokumennya berada di tempat tindakan di belakangnya dapat dilakukan, langkah-langkah sebelumnya selesai, dan langkah itu tidak memiliki penyelesaian yang belum terpakai; **Buka langkah** hanya bagi kursi yang memegang lajur langkah itu | panel dokumen, di depan baris yang menyatakan siapa yang bertindak berikutnya, pada tujuh halaman pembeli |
| **Langkah tambahan** — *"{step} ditolak. Menunggu {lane} memutuskan lagi."* | diturunkan saat dibaca | Recorded | keputusan terakhir atas langkah itu adalah penolakan | panel dokumen; pop-up menambahkan **Langkah ini ditolak** beserta siapa yang menolak dan mengapa |
| *"Belum bisa: langkah “{step}” harus diselesaikan dahulu. Langkah menunggu {lane}. Tidak ada yang diubah."* | penolakan pada tindakan yang dihalangi (`STEP_PENDING` yang menyebut `<proses>:<dokumen>:<langkah>`) | — | tindakan di belakang langkah yang terbuka dicoba dengan tombol milik halaman | toast tindakan itu |
| *"Belum bisa: langkah “{step}” ditolak oleh {person} — “{reason}”. Langkah menunggu {lane} memutuskan lagi. Tidak ada yang diubah."* | penolakan pada tindakan yang dihalangi (`STEP_PENDING` dengan `:declined` setelah langkahnya) | Recorded | keputusan terakhir atas langkah itu adalah penolakan | toast tindakan itu |
| Penyelesaian terpakai | dicatat oleh platform | Recorded | tindakan di belakang langkah berhasil setelah langkah itu diselesaikan | catatan buku (`used`); tanpa permukaan |
| Pemeriksaan yang dikesampingkan untuk Super Admin | dicatat bersama tindakan | Recorded | Super Admin menyelesaikan langkah yang terhalang oleh langkah lebih awal yang diselesaikannya sendiri, dengan alasan satu baris | catatan buku dan peristiwanya |
| Versi langkah, pada setiap catatan | dicatat bersama tindakan | Recorded | selalu | catatan buku (`versionLabel`); penyelesaian hanya dihitung di bawah versi itu |
<!-- src: src/services/flowBuilder/flowOverlay.ts:79-133,151-214; src/services/flowBuilder/stepLedger.ts:17-70; src/services/data/mock/processStepTarget.ts:101-115; src/lib/glossary/refusals.glossary.ts:78-83; src/services/transitions/refusals.ts:108-120 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** tidak ada saat seed. Kunci sebuah langkah adalah `<proses>:<dokumen>:<langkah>`: proses yang diubah, id dokumen dalam proses itu, dan id langkah dalam perubahannya.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Perubahan yang mendefinisikan langkah | versi yang berlaku untuk prosesnya; `versionId`, `versionLabel` pada setiap catatan | lihat panduan *Perubahan pada proses*. Hanya versi yang berlaku yang mendefinisikan langkah; rancangan, versi yang disetujui, atau versi yang dihentikan tidak mendefinisikan apa pun |
| Dokumen tempat langkah berada | bagian tengah kunci | dibaca melalui target perintah prosesnya sendiri; dokumen yang tidak dimiliki proses itu membuat kuncinya `NOT_FOUND` |
| Tindakan yang didahului langkah | `before`, pada langkah | tindakan itu ditolak selama langkah terbuka, dan menghabiskan penyelesaian di depannya ketika berhasil |
| Lajur yang menyelesaikan langkah | `lane`, pada langkah | satu lajur sisi pembeli; kursi harus memegang setiap izin yang dipegang lajur itu |
| Langkah-langkah sebelumnya | `order`, pada setiap langkah di depan tindakan yang sama | diambil menurut urutan; langkah yang lebih akhir tidak jatuh tempo selama yang lebih awal terbuka |
| Siapa yang harus orang berbeda | `differentFrom`, pada langkah | menyebut langkah-langkah lebih awal di depan tindakan yang sama |
| Siapa yang tidak boleh kemudian melakukan tindakannya | `completerMayNotAct`, pada langkah | ditanyakan saat tindakan dilakukan, bukan saat langkah diselesaikan |
| Isian yang diminta langkah pengisian data | `fields`, pada langkah | masing-masing memiliki nama, jenis, dan apakah wajib; nilainya disimpan pada catatan |
| Catatan buku | `entity`, `docId`, `stepId`, `versionId`, `versionLabel`, `decision`, `by`, `at`, `reason`, `values`, `used` | hanya bertambah; `by` adalah orang dari sesi, ditampilkan melalui satu penyelesai label orang, bukan nama yang disimpan; `at` adalah waktu kini yang dinyatakan portal |
| Tenant / pemilik | tidak ada | catatan pembeli: kursi pemasok ditolak pada tahap scope, sama persis untuk langkah yang ada maupun yang tidak ada |
| Jejak audit | `TransitionEvent` untuk setiap tindakan | satu peristiwa per penyelesaian atau penolakan, termasuk yang ditolak dispatcher |
<!-- src: src/services/data/mock/processStepTarget.ts:23-32,95-116; src/services/flowBuilder/flowOverlay.ts:63-133,181-212; src/services/flowBuilder/stepLedger.ts:17-70; src/services/flowBuilder/flowVersion.ts:48-68 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` (kursi, bukan orang), `ts`, `outcome` (dengan alasannya bila ditolak), `correlationId`-nya sendiri, dan orang dari sesi sebagai `attribution`. Buku catatan itu sendiri adalah riwayat setiap langkah: setiap penyelesaian dan setiap penolakan adalah catatan tersendiri, dari yang tertua, dan tidak ada yang ditulis ulang. Tidak ada layar yang mendaftar buku catatan; pop-up langkah berikutnya menyebut siapa yang menyelesaikan langkah-langkah sebelumnya. Buku catatan hilang saat dimuat ulang.

Urutan kerja, untuk langkah persetujuan di depan satu tindakan sebuah proses, setelah perubahan yang mendefinisikannya diberlakukan. Setiap tindakan atas langkah itu dilakukan dari baris di panel dokumen:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | (proses yang dihalangi) | lajur yang memegang tindakan yang dihalangi | melakukan tindakan yang didahului langkah itu | tindakan itu, `outcome: failed`, `STEP_PENDING` yang menyebut langkahnya; dokumennya tidak berpindah |
| T+1 | Recorded (ditolak) | orang yang disebut, di lajur selain lajur langkah itu | menyelesaikan langkah lewat dispatch buatan tangan; baris itu tidak menawarkan **Buka langkah** kepada kursi tersebut | `t_step_complete`, `outcome: failed`, `POLICY_REJECTED:step_may_be_taken` (`STEP_LANE_NOT_HELD`) |
| T+2 | Recorded → Recorded | orang yang disebut, di lajur langkah itu | menolak langkah, dengan alasan | `t_step_decline` — catatan dengan keputusan *declined* |
| T+3 | (proses yang dihalangi) | lajur yang memegang tindakan yang dihalangi | melakukan tindakan itu lagi | tindakan itu, `outcome: failed`, `STEP_PENDING` yang menyebut langkahnya dengan `:declined` |
| T+4 | Recorded → Recorded | orang yang disebut, di lajur langkah itu | menyelesaikan langkah | `t_step_complete` — catatan dengan keputusan *completed*; keputusan terakhir yang dihitung |
| T+5 | (proses yang dihalangi) | lajur yang memegang tindakan yang dihalangi | melakukan tindakan itu lagi | tindakan itu berhasil; penyelesaiannya ditandai terpakai |
| T+6 | Recorded (ditolak) | orang yang disebut, di lajur langkah itu | menyelesaikan langkah lagi ketika dokumen tidak lagi berada di tempat tindakannya dapat dilakukan | `t_step_complete`, `outcome: failed`, `POLICY_REJECTED:step_may_be_taken` (`STEP_NOT_DUE`) |
<!-- src: src/services/transitions/events.ts:26-61,124-131; src/services/data/mock/processStepTarget.ts:34-116; src/services/flowBuilder/flowOverlay.ts:99-113,167-212; src/services/transitions/dispatcher.ts:881-889,991-993 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Baris **Langkah tambahan** tidak menampilkan **Buka langkah** | barisnya berbunyi *"{step}. Menunggu {lane}."* tanpa tautan | kursi tidak memegang lajur langkah itu | bertindak dari kursi yang memegang lajur tersebut |
| Tombol halaman menjawab *"Belum bisa: langkah “{step}” harus diselesaikan dahulu. Langkah menunggu {lane}. Tidak ada yang diubah."* | `STEP_PENDING` dengan `<proses>:<dokumen>:<langkah>` | perubahan yang berlaku menambah langkah di depan tindakan itu, dan langkahnya terbuka | lajur langkah itu menyelesaikan langkahnya dari baris **Langkah tambahan**, lalu tindakan diulangi |
| Tombol halaman menjawab *"Belum bisa: langkah “{step}” ditolak oleh {person} — “{reason}”. Langkah menunggu {lane} memutuskan lagi. Tidak ada yang diubah."* | `STEP_PENDING` dengan `:declined` setelah langkahnya | keputusan terakhir atas langkah persetujuan itu adalah penolakan | lajur langkah itu memutuskannya lagi; penyelesaian mengangkat penolakan |
| Toast *"Ditolak: kursi ini tidak menyebut siapa pun, dan tindakan ini dicatat atas nama orang yang melakukannya. Pilih pengguna contoh di panel identitas, lalu ulangi."* | `POLICY_REJECTED:step_actor_named` (`STEP_ACTOR_UNATTRIBUTED`) | kursi tidak menyebut siapa pun, padahal menyelesaikan atau menolak langkah dicatat atas nama orang yang melakukannya | pilih pengguna contoh di panel identitas, lalu ulangi tindakannya |
| Toast *"Ditolak: perubahan yang berlaku tidak mendefinisikan langkah itu."* | `STEP_UNKNOWN`, atau — lebih dulu, dalam praktiknya — dilempar `NOT_FOUND`: kuncinya bukan langkah yang didefinisikan versi yang berlaku | prosesnya tidak terdaftar, dokumennya bukan milik proses itu, id langkahnya tidak ada di versi yang berlaku, atau tidak ada versi yang berlaku | gunakan kunci langkah yang didefinisikan versi yang berlaku, pada dokumen yang ada |
| Toast *"Ditolak: langkah ini belum waktunya. Langkah sudah selesai, langkah sebelumnya masih terbuka, atau dokumen sudah berpindah."* | `POLICY_REJECTED:step_may_be_taken` (`STEP_NOT_DUE`) | langkah sudah selesai, langkah lebih awal di depan tindakan yang sama masih terbuka, atau dokumen tidak berada di tempat tindakan di belakang langkah itu dapat dilakukan | selesaikan langkah yang lebih awal dulu, atau tunggu sampai dokumen mencapai status awal tindakan itu |
| Toast *"Ditolak: langkah ini diselesaikan oleh lajur lain, yang tidak dipegang kursi ini."* | `POLICY_REJECTED:step_may_be_taken` (`STEP_LANE_NOT_HELD`); barisnya menyebut lajur yang ditunggu langkah itu | kursi tidak memegang setiap izin lajur yang disebut langkah itu; `step:complete` saja tidak cukup | bertindak dari kursi yang memegang lajur langkah itu |
| Toast *"{person} menyelesaikan langkah sebelumnya pada dokumen ini, dan perubahan yang berlaku meminta orang yang berbeda untuk langkah ini. Orang lain yang menyelesaikannya."* | `POLICY_REJECTED:step_may_be_taken` (`STEP_COMPLETER_IS_EARLIER_COMPLETER`); pop-up mendaftar langkah-langkah sebelumnya dan siapa yang menyelesaikannya | orang yang sama menyelesaikan langkah lebih awal, dan perubahan menetapkan bahwa langkah ini diselesaikan oleh orang yang berbeda | alihkan langkah kepada orang lain. Super Admin lolos dengan alasan satu baris |
| Toast *"Ditolak: isi setiap isian yang ditandai wajib oleh langkah ini."* | `POLICY_REJECTED:step_fields_given` (`STEP_FIELD_MISSING`); isian wajib ditandai dengan tanda bintang | isian wajib pada langkah pengisian data dibiarkan kosong | berikan nilai untuk setiap isian wajib |
| Toast *"Ditolak: hanya langkah persetujuan yang dapat ditolak. Langkah ini diselesaikan."* | `POLICY_REJECTED:step_decline_reasoned` (`STEP_NOT_AN_APPROVAL`) | langkah konfirmasi atau pengisian data ditolak lewat dispatch buatan tangan; pop-up hanya menawarkan **Tolak** pada langkah persetujuan | selesaikan langkah itu |
| Toast *"Ditolak: persetujuan yang ditolak menyebutkan sebabnya dengan kata-kata."* | `POLICY_REJECTED:step_decline_reasoned` (`STEP_DECLINE_REASON_BLANK`) | alasan penolakan hanya berisi spasi | nyatakan mengapa persetujuan ditolak |
| Kegagalan yang menyebut alasan belum diisi | `MISSING_FIELDS:reason` | penolakan dikirim tanpa alasan | sertakan alasan bersama penolakannya |
| Tombol halaman menjawab *"{person} menyelesaikan langkah tambahan pada dokumen ini, dan perubahan yang berlaku menetapkan bahwa penyelesainya tidak boleh kemudian melakukan tindakan itu. Orang lain yang melakukannya."* | `POLICY_REJECTED:added_check` (`STEP_COMPLETER_MAY_NOT_ACT`) pada tindakan yang dihalangi | orang itu menyelesaikan langkahnya, dan perubahan menetapkan bahwa siapa pun yang menyelesaikannya tidak boleh kemudian melakukan tindakannya | alihkan tindakan kepada orang lain. Super Admin lolos dengan alasan satu baris |
| Ditolak dengan menyebut `SUPER_ADMIN_REASON_REQUIRED` | penolakan menyebut pemeriksaan yang akan dikesampingkan | Super Admin melewati pemeriksaan dua orang tanpa memberi alasan satu baris | ulangi tindakannya dan nyatakan alasannya |
| Langkah yang sudah diselesaikan diminta lagi | tindakan ditolak sebagai `STEP_PENDING` pada dokumen yang langkahnya pernah selesai | tindakan di belakang langkah itu sudah berhasil sejak itu, sehingga penyelesaiannya terpakai; atau versi lain mulai berlaku, dan penyelesaian hanya dihitung di bawah versi saat dilakukan; atau halaman dimuat ulang | selesaikan langkah itu lagi |
| Catatan langkah hilang | buku catatan kosong | halaman dimuat ulang; catatan langkah disimpan di memori | wajar sampai ada backend |
| Sebuah langkah tidak lagi diminta | tindakan tidak ditolak sebagai `STEP_PENDING` | versi yang mendefinisikan langkah itu dihentikan, digantikan versi lain, atau dikesampingkan karena tidak lagi mematuhi aturan | wajar; proses berjalan menurut versi itu, atau menurut bawaannya |
| Dilempar `SCOPE_DENIED` | kode `DataError` | kursi pemasok | hanya sisi pembeli |
<!-- src: src/services/data/mock/processStepTarget.ts:23-116; src/services/flowBuilder/flowOverlay.ts:36-62,79-133,151-212; src/services/flowBuilder/stepLedger.ts:1-12,62-70; src/services/transitions/policies.ts:2864-2873,2965-2972; src/services/transitions/dispatcher.ts:319,709,881-889,923-936,948-953; src/lib/glossary/refusals.glossary.ts:78-83 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Recorded | — | — | tidak ada fixture — tidak ada versi yang berlaku saat seed, sehingga tidak ada langkah dan buku catatan dibuka kosong. Sebuah langkah ada setelah perubahan yang menambahkannya berlaku dan sebuah dokumen proses itu berada di tempat tindakan di belakang langkah dapat dilakukan; kuncinya lalu `<proses>:<dokumen>:<langkah>`. Baris **Langkah tambahan** di panel dokumen adalah tempat langkah itu dibuka. Catatan langkah hilang saat dimuat ulang |
<!-- src: src/services/flowBuilder/stepLedger.ts:1-12,42-43; src/services/data/mock/processStepTarget.ts:23-32,95-96; src/services/flowBuilder/flowOverlay.ts:47-55 -->
