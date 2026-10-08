---
entity: materialRuling
locale: id
title: Keputusan penerapan material
wired: true
owner: portal
source_sha: 852444f6d370948d9ded319a92231da3f0849a8a
transitions:
  - t_material_ruling_set
---

<!-- section:summary -->
## 1 · Apa proses ini

Apakah halal, atau BPOM, berlaku untuk suatu material — diputuskan oleh Kepatuhan, dengan penjelasannya, dan disimpan sebagai catatan siapa yang memutuskan dan kapan. Penerimaan membacanya: bila suatu rezim berlaku, formulir penerimaan meminta pemeriksaan rezim itu (dan, untuk halal, sertifikat yang berlaku untuk pemasok dan materialnya); bila tidak berlaku, baris lolos dan menampilkan keputusannya; bila belum ada yang menjawab, baris tidak dapat diterima dan menyebut siapa yang memutuskan.

Keputusan adalah **tindakan pada buku besar**, bukan nilai yang disunting. Setiap tindakan menyebut satu material dan satu rezim (halal atau BPOM), menyatakan *berlaku* atau *tidak berlaku*, memuat alasan, dan dicatat atas nama orang yang membuatnya. Tindakan berikutnya untuk material dan rezim yang sama menggantikan yang sebelumnya; tidak ada yang dihapus, dan riwayatnya tetap pada barisnya. Apa yang berlaku diturunkan saat dibaca: keputusan terakhir bila ada, bila tidak ada maka apa yang dikatakan **master material**.

Satu jalur pembeli menyentuhnya. **Kepatuhan** memegang satu-satunya atom, `material:rule`. Penerimaan tidak: penerimaan adalah jalur yang diikat oleh keputusan, sehingga tidak boleh menjadi jalur yang membuatnya. Setiap kursi pembeli dapat membaca tabel di `/buyer/compliance` (**Penerapan material — halal dan BPOM**); kursi tanpa atom itu melihat *Menunggu Kepatuhan* di tempat kontrol **Putuskan**.

Penanda kejujuran. Buku besar terbuka **kosong** — baris tersemai akan mengklaim Kepatuhan memutuskan sesuatu yang tidak diputuskan siapa pun — sehingga hari ini setiap jawaban berasal dari master material: **halal berlaku untuk setiap material secara bawaan, termasuk kemasan**; BPOM berlaku untuk kelompok formulasi yang disebut master, tidak berlaku untuk kemasan, dan **menunggu** untuk bahan baku yang tidak punya penetapan di master. Material yang menunggu itu tidak dapat diterima sampai Kepatuhan memutuskan. Buku besar berada di mock dalam memori di balik layanan: memuat ulang mengembalikan jawaban master. Keputusan harus **diatribusikan kepada seseorang**: kursi tanpa atribusi ditolak, sehingga dalam demo pengguna CONTOH dipilih lebih dulu, dan setiap baris yang ditulis orang contoh membawa penanda *(CONTOH)*. Master material adalah fixture; keputusan tidak menulis ulang master.
<!-- src: src/services/sdc/materialRuling.ts:1-40,95-135; src/services/transitions/flows/materialRuling.flow.ts:1-50; src/services/data/mock/stores/materialRulingStore.ts:1-30; src/services/sdc/halal.ts:104-125; src/services/sdc/bpom.ts:60-80; src/services/transitions/businessRoles.ts:357-362; src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:1-20 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Governed | material ada karena tercantum di master material (tanpa verba pembuatan; kode yang tidak dikenal adalah `NOT_FOUND`) | — | — |
| 1 | Governed → status yang sama | mencatat fakta (mempertahankan status): satu keputusan ditambahkan ke buku besar | pembeli · kepatuhan | `t_material_ruling_set` |

Langkah ini berulang setiap kali Kepatuhan memutuskan, atau mengubah keputusan, untuk suatu material pada suatu rezim.

**Percabangan**

Tidak ada status yang punya dua jalan keluar. Keputusannya ada di payload: rezimnya (halal atau BPOM) dan apakah berlaku.
<!-- src: src/services/transitions/flows/materialRuling.flow.ts:28-50; src/services/data/mock/materialRulingTarget.ts:17-34 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_material_ruling_set — Memutuskan apakah halal atau BPOM berlaku <!-- transition:t_material_ruling_set -->

- **Jenis langkah:** mencatat fakta (mempertahankan status) · tindakan operator
- **Peran:** pembeli · kepatuhan (atom `material:rule`)
- **Dari → ke:** Governed → status yang sama
- **Operator — di mana:** `/buyer/compliance` → bagian **Penerapan material — halal dan BPOM** → filter **Menunggu keputusan**, **Diputuskan Kepatuhan**, atau **Semua material** → pada baris materialnya, di bawah **Halal** atau **BPOM**, tekan **Putuskan** → pilih *berlaku* atau *tidak berlaku* → tulis **Alasan (wajib)** → **Catat keputusan**.
- **Operator — lakukan:** putuskan apakah rezim itu berlaku untuk material ini dan jelaskan mengapa. Formulir menyatakan, sebelum tindakan, atas nama siapa keputusan akan dicatat. Untuk mengubah keputusan, putuskan lagi ke arah sebaliknya dengan alasan baru; keputusan sebelumnya tetap ada di riwayat barisnya.
- **Operator — isi:** `regime` (halal atau BPOM — ditentukan oleh **Putuskan** mana yang ditekan), `applicable` (ya atau tidak), `reason` (wajib; kosong atau hanya spasi ditolak). Siapa yang memutuskan berasal dari sesi dan kapan dari store; keduanya bukan kolom, dan payload yang mencoba menyebut pelaku ditolak.
- **Penguji — status yang diharapkan:** Governed (tidak berubah)
- **Penguji — konfirmasi:** toast **"Keputusan tercatat untuk {material}"** beserta apa yang kini dilakukan penerimaan; sel pada barisnya berbunyi **Berlaku** atau **Tidak berlaku** dengan *Diputuskan oleh {person} pada {date}* (orang contoh membawa penanda *(CONTOH)*); kolom **Keputusan** menghitung tindakan itu dan membuka riwayat dengan rezim, jawaban, orang, tanggal, dan alasan. Di `/buyer/goods-receipt`, langkah kualitas formulir penerimaan menampilkan keputusan pada baris material itu — "Halal tidak berlaku — diputuskan oleh Kepatuhan…" dengan siapa, kapan, dan mengapa — dan tidak meminta pemeriksaan segel maupun sertifikat; material yang menunggu BPOM dan sudah diputuskan tidak lagi terblokir.
- **Penguji — peristiwa pemicu:** `t_material_ruling_set`
- **Pemeriksaan yang dapat menolak:** `material_ruling_governed`, lima penolakan dalam urutan ini — `RULING_REGIME_UNKNOWN` (rezimnya bukan halal atau BPOM); `RULING_MALFORMED` (`applicable` bukan ya atau tidak); `RULING_REASON_BLANK` (tanpa alasan); `RULING_UNCHANGED` (material sudah diputuskan demikian — keputusan mencatat perubahan); `RULING_ACTOR_UNATTRIBUTED` (kursi tidak menyebut siapa pun). Sebelum itu: kursi pemasok ditolak pada lingkup, kode yang tidak ada di master material adalah `NOT_FOUND`, kursi tanpa `material:rule` mendapat `ROLE_NOT_PERMITTED`, payload yang membawa kunci pelaku mendapat `ACTOR_IN_PAYLOAD`, dan kolom yang hilang mendapat `MISSING_FIELDS`.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `ACTOR_IN_PAYLOAD`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`, `UNDETERMINED_APPLICABILITY`, `UNKNOWN_MATERIAL`.
- **Kejujuran:** keputusan pertama atas material yang membaca bawaan master diterima bahkan bila isinya sama dengan bawaan itu — ia mengubah bawaan menjadi keputusan yang dipertanggungjawabkan seseorang. Orang contoh diterima di sini (buku besar menyatakannya pada barisnya); gerbang pelonggaran pada buku besar penegakan, yang menolak orang contoh, adalah catatan yang berbeda dan tidak disentuh oleh keputusan. Keputusan mengubah apa yang DIMINTA penerimaan; ia tidak membuat atau mengubah sertifikat. Keputusan diberi tanggal hari ini menurut portal (31 Agu 2026), bukan jam nyata. Buku besar berada di memori: memuat ulang mengembalikannya ke sepuluh keputusan CONTOH dan setiap material lain ke jawaban master.
<!-- src: src/services/transitions/flows/materialRuling.flow.ts:36-48; src/services/data/mock/materialRulingTarget.ts:17-66; src/services/transitions/policyHooks.ts:146-150; src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:60-160,190-330; src/services/query/commandHooks.ts:1052-1085; src/services/query/hooks.ts:232-238; src/components/v2-features/GRInspectionWizard.tsx:905-925,1470-1500; src/lib/i18n/compliance.ts:264-321; src/lib/i18n/goodsReceipt.ts:540-556 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Berlaku atau tidak berlaku (di Governed).** Cabang A — `t_material_ruling_set` dengan *berlaku* — **Kapan:** rezim itu menjangkau material ini; penerimaan lalu meminta pemeriksaannya (dan, untuk halal, sertifikat yang berlaku). Cabang B — dengan *tidak berlaku* — **Kapan:** tidak menjangkau; penerimaan meloloskan baris dan menampilkan keputusannya.
- **Halal atau BPOM (di Governed).** Satu tindakan memutuskan satu rezim. Suatu material dapat diputuskan untuk keduanya, dengan dua tindakan.
- **Material yang menunggu (jalur pengecualian).** **Kapan:** master tidak punya penetapan dan belum ada yang memutuskan — hari ini bahan baku tanpa penetapan BPOM. Penerimaan menolak barisnya sebagai *menunggu — Kepatuhan yang memutuskan*. Keputusan ke arah mana pun menyelesaikannya.
- **Mengubah keputusan (jalur pengecualian).** **Kapan:** Kepatuhan memutuskan lain. Putuskan lagi ke arah sebaliknya; tindakan yang lebih baru berlaku dan yang sebelumnya tetap di buku besar.
- **Tidak ada yang berubah (pengecualian).** **Kapan:** tindakan mengulang keputusan yang berlaku. Ditolak (`RULING_UNCHANGED`), bukan dicatat.
- **Siapa yang boleh bertindak (pengecualian).** **Kapan:** kursi tidak menyebut siapa pun — ditolak dengan menyebut sebabnya; pilih pengguna contoh di panel identitas.
<!-- src: src/services/sdc/materialRuling.ts:57-135; src/services/data/mock/materialRulingTarget.ts:36-66 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| *Menunggu — Kepatuhan yang memutuskan* · *Belum ada keputusan — penerimaan material ini diblokir* | diturunkan saat dibaca | Governed (tanpa keputusan, tanpa penetapan master) | suatu rezim tidak punya jawaban untuk material itu | sel material di `/buyer/compliance`; dihitung di **Menunggu keputusan** |
| *Berlaku* / *Tidak berlaku* · *Diputuskan oleh {person} pada {date}* | diturunkan saat dibaca | Governed (ada keputusan yang berlaku) | Kepatuhan sudah memutuskan material itu untuk rezim tersebut | sel material; dihitung di **Diputuskan Kepatuhan** |
| *Berlaku* / *Tidak berlaku* · *Master material* (atau baris bawaan halal) | diturunkan saat dibaca | Governed (tanpa keputusan) | master yang menjawab | sel material |
| *Tidak ada di master material* | diturunkan saat dibaca | — | kode yang tidak ada di master | sel material; tidak ada keputusan yang dapat menjawabnya |
| *(CONTOH)* setelah nama orang | diturunkan saat dibaca | Governed | keputusan dicatat oleh orang contoh | baris dasar pada sel; riwayat baris; catatan keputusan di formulir penerimaan |
| *Menunggu Kepatuhan* | diturunkan saat dibaca (kursi vs. atom) | — | kursi tidak memegang `material:rule` | kepala bagian, di tempat **Putuskan** |
| *Kursi ini tidak menyebut siapa pun, sehingga keputusan akan ditolak…* | diturunkan saat dibaca (sesi) | — | kursi tidak menyebut siapa pun | formulir keputusan, sebelum tindakan |
| *BPOM: menunggu — Kepatuhan yang memutuskan.* / *Halal tidak berlaku — diputuskan oleh Kepatuhan…* | diturunkan saat dibaca | (penerimaan) | material suatu baris menunggu, atau sudah diputuskan | langkah kualitas formulir penerimaan di `/buyer/goods-receipt` |
<!-- src: src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:150-215,300-325; src/lib/i18n/compliance.ts:264-321; src/components/v2-features/GRInspectionWizard.tsx:1470-1560 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `PK-CART-9901` — karton lipat. Belum ada keputusan untuknya hari ini; halal membaca bawaan master (berlaku) dan BPOM membaca master (tidak berlaku).

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Master material | `materialCode` | id entitasnya ADALAH kode material; `halalApplicable` dan `bpomApplicable` milik master menjawab bila tidak ada keputusan, dan tidak ditulis ulang oleh keputusan |
| Tindakan buku besar | `materialCode`, `regime`, `applicable`, `reason`, `setBy`, `setAt`, `seq` | `setBy` adalah atribusi sesi (id orang, ditampilkan lewat penyelesai label, bukan nama yang disimpan), `setAt` jam saat tindakan, `seq` urutan kedatangan di store — tindakan yang lebih baru untuk suatu material dan rezim yang berlaku. Hanya tambah; tanpa pembaruan |
| Penerimaan barang | `materialCode` pada baris penerimaan | formulir penerimaan membaca keputusan yang berlaku di atas jawaban master, per baris, saat ditampilkan — sehingga keputusan yang dibuat ketika penerimaan sedang terbuka tetap sampai |
| Registri kepatuhan | pemasok × material × sertifikat | dibaca penerimaan hanya bila halal berlaku; keputusan tidak membuat maupun mengubah sertifikat |
| Penyewa / pemilik | tidak ada (`readScopeOwner` null) | catatan tata kelola pembeli: lingkup pemasok ditolak pada lingkup dan pembacaannya menjawab pemasok dengan `SCOPE_DENIED`, bukan halaman kosong |
<!-- src: src/services/sdc/materialRuling.ts:42-135; src/services/data/mock/materialRulingTarget.ts:17-34; src/services/data/mock/MockRiskService.ts:63-68; src/services/sdc/fixtures.ts:130-180 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = `t_material_ruling_set`, `actor` = `buyer:all`, `ts`, `outcome` (dengan `reason` bila ditolak), `correlationId`-nya sendiri, orang dalam sesi sebagai `attribution`, dan `subject` = `{ entity: 'materialRuling', entityId: <kode material>, from: 'Governed', to: 'Governed' }`. Buku besar itu sendiri adalah riwayat materialnya, ditampilkan pada barisnya.

Urutan contoh untuk `PK-CART-9901`, sebagaimana dihasilkan penguji:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | — | penguji memilih pengguna contoh yang memegang kepatuhan di panel identitas | tanpa tindakan; **Putuskan** muncul di setiap baris | — |
| T+1 | Governed → Governed | pembeli · kepatuhan, orang contoh | **Putuskan** di bawah Halal → *Halal tidak berlaku* → alasan → **Catat keputusan** | `t_material_ruling_set` |
| T+2 | Governed → Governed (ditolak) | pembeli · kepatuhan | keputusan yang sama lagi — `outcome: failed`, `POLICY_REJECTED:material_ruling_governed:RULING_UNCHANGED:…` | `t_material_ruling_set` |
| T+3 | Governed → Governed | pembeli · kepatuhan | **Putuskan** di bawah Halal → *Halal berlaku* → alasan baru — tindakan yang lebih baru berlaku; riwayat baris memuat keduanya | `t_material_ruling_set` |

Setelah T+1, baris penerimaan untuk `PK-CART-9901` menampilkan keputusan dan tidak meminta pemeriksaan segel halal maupun sertifikat. Setelah T+3 keduanya diminta lagi.
<!-- src: src/services/transitions/events.ts:26-60,85-123; src/services/data/mock/materialRulingTarget.ts:22-66; src/services/sdc/materialRuling.ts:57-80 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada kontrol **Putuskan** di baris mana pun; *Menunggu Kepatuhan* di kepala bagian | teks serah terima di tempat kontrol | kursi tidak memegang `material:rule` | bertindak dari kursi yang memegang jalur kepatuhan |
| "Kursi ini tidak menyebut siapa pun, dan keputusan dicatat atas nama orang yang membuatnya…" | toast peringatan; formulir sudah menyatakannya sebelum tindakan | kursi tidak menyebut siapa pun (`NO_PERSON_IN_SESSION`) — `RULING_ACTOR_UNATTRIBUTED` | pilih pengguna contoh di panel identitas, lalu putuskan lagi |
| "Material ini sudah diputuskan demikian. Keputusan mencatat suatu perubahan." | toast peringatan | `RULING_UNCHANGED` — tindakan mengulang keputusan yang berlaku | tidak ada yang perlu dilakukan; untuk mengubahnya, putuskan ke arah sebaliknya |
| "Keputusan harus memuat alasannya…" | toast peringatan (tombol tetap nonaktif selama alasan kosong, jadi ini memerlukan dispatch buatan tangan) | `RULING_REASON_BLANK` | tuliskan mengapa berlaku atau tidak |
| Ditolak: *a ruling is made under halal or bpom* / *applicable must be yes or no* | `POLICY_REJECTED:material_ruling_governed:RULING_REGIME_UNKNOWN` / `…RULING_MALFORMED` | payload buatan tangan | gunakan halal atau bpom, dan true atau false |
| Baris penerimaan masih berbunyi *menunggu — Kepatuhan yang memutuskan* setelah diputuskan | langkah kualitas formulir penerimaan | keputusan dibuat untuk rezim yang lain, atau untuk material lain | putuskan rezim yang disebut baris itu, untuk material baris itu |
| Baris halal masih dihentikan setelah BPOM diputuskan | "Sertifikat halal — perlu tindakan…" pada baris | keputusan tidak membuat sertifikat; halal tetap berlaku dan tidak ada sertifikat yang berlaku | catatkan sertifikatnya, atau putuskan halal tidak berlaku untuk material itu |
| `NOT_FOUND` dilempar | kode `DataError` | id entitasnya bukan kode yang ada di master material | gunakan kode master |
| `SCOPE_DENIED` dilempar | kode `DataError`, atau penolakan pembacaan | lingkup pemasok | hanya sisi pembeli |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:CMP` | modul Kepatuhan & dokumen dimatikan; halamannya tetap dapat dibaca | minta diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |
| Semua keputusan hilang | setiap baris kembali membaca jawaban master | halaman dimuat ulang; buku besar berada di memori | wajar dalam demo |
<!-- src: src/services/data/mock/materialRulingTarget.ts:36-66; src/pages-v2/compliance/MaterialApplicabilityPanel.tsx:60-75,110-150; src/services/transitions/dispatcher.ts:600-637; src/lib/i18n/compliance.ts:311-321; src/services/data/mock/stores/materialRulingStore.ts:1-30 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Governed | `PK-CART-9901`, `PK-PETB-8801`, `RM-COCO-8200`, `RM-EMUL-3320`, `AI-NIAC-6601` | — | setiap kode di master material menjawab Governed. Buku besar terbuka dengan sepuluh keputusan BPOM CONTOH — masing-masing *berlaku*, dicatat oleh orang contoh dari Kepatuhan, dengan alasan yang diawali "SAMPLE ruling" — mencakup setiap bahan baku yang tidak ditentukan master kecuali `RM-COCO-8200`. Jadi: `PK-CART-9901` dan `PK-PETB-8801` (kemasan) — halal berlaku secara bawaan, BPOM tidak berlaku (master); `RM-EMUL-3320` (bahan baku) — halal berlaku, BPOM berlaku menurut keputusan CONTOH; `RM-COCO-8200` (bahan baku) — halal berlaku, BPOM **menunggu**; `AI-NIAC-6601` (bahan aktif) — halal dan BPOM keduanya berlaku (master). Memutuskan BPOM untuk `RM-COCO-8200` menghapus blokir BPOM pada penerimaan `gr-001`; sertifikat halal sebuah baris adalah pemeriksaan yang terpisah. |
<!-- src: src/services/sdc/fixtures.ts:130-600; src/services/data/mock/materialRulingTarget.ts:17-21; src/services/data/mock/stores/materialRulingStore.ts:9-12 -->
