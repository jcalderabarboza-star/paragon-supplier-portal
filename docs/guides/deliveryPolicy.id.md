---
entity: deliveryPolicy
locale: id
title: Toleransi penarikan (kebijakan pengiriman)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_delivery_policy_set
---

<!-- section:summary -->
## 1 · Apa proses ini

Seberapa jauh sebuah pengiriman boleh menyimpang dari yang disepakati sebelum ada yang diberi tahu. Ini adalah pemeriksaan yang mengukur jalur pengiriman, sehingga sengaja bukan jalur pengiriman yang menetapkannya — dan disimpan sebagai riwayat keputusan alih-alih angka yang disunting seseorang, karena "belum ada yang memilih" dan "seseorang memilih ini" adalah dua fakta berbeda.

Entitasnya adalah **toleransi yang diatur pada satu item perjanjian** — kebijakan penarikan dari satu baris material sebuah perjanjian penjadwalan. Ia memiliki dua tuas: persentase toleransi (pecahan seperti 10%, atau *tanpa batas*) dan mode penegakan (`flag`, `ignore`, atau `block`). Setiap item lahir dengan **default kontrak** saat penandatanganan yang tidak pernah diubah, dan kebijakan **aktif** yang bermula sama dengannya. Buku penarikan membaca kebijakan aktif: item yang mode aktifnya `ignore` terbaca *Amplop referensi — tidak ditegakkan*; yang modenya `flag` terbaca *Terkendali — tandai di atas N%*; dan setiap kali yang aktif berbeda dari default kontrak, buku penarikan menandai penyimpangan dan menampilkan kapan dan mengapa.

Siapa yang menyentuhnya: **jalur kepatuhan pembeli** — jalur yang sama yang sudah memutuskan apa yang harus dipenuhi dokumen seorang pemasok — mencatat perubahan toleransi. Pengadaan, yang merilis jadwal, tidak bisa: bila jalur yang mengirimkan juga dapat melonggarkan toleransi yang mengukurnya, pemeriksaan itu bukan lagi pemeriksaan. Pemasok melihat chip mode pada cermin hanya-bacanya, tetapi tidak melihat riwayat penyimpangan.

Penanda kejujuran. Mesin satu-status: toleransi item selalu `Governed`, dan mencatat perubahan menambahkan keputusan tanpa memindahkan status. Setiap perubahan adalah catatan portal — tidak pernah diposkan ke S/4HANA — atas perjanjian SIMULASI. Perubahan harus dicatat atas identitas contoh yang disebut namanya; **pelonggaran** (mode yang lebih lemah atau pita yang lebih lebar) selain itu menolak identitas contoh dengan menyebut namanya, karena orang contoh tidak dapat menerima risiko komersial — sehingga dalam demo hari ini toleransi dapat diperketat tetapi tidak dilonggarkan. Mode `block` dapat dicatat tetapi belum ditegakkan di mana pun; label penyuntingnya menyatakannya.
<!-- src: src/services/transitions/flows/deliveryPolicy.flow.ts:1-76; src/services/delivery/types.ts:96-131; src/services/delivery/ledger.ts:21-34,56-96; src/lib/i18n/processFlowPurpose.ts:400-401; src/lib/i18n.ts:256-258,409 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Governed | lahir bersama item saat penandatanganan kontrak (tanpa verba pembuatan) | — | — |
| 1 | Governed → Governed | mencatat fakta (mempertahankan status): toleransi aktif diarahkan ulang dengan alasan | buyer · compliance | `t_delivery_policy_set` |

**Percabangan**

- **Di Governed:** `t_delivery_policy_set` — kepatuhan — ketika toleransi pada satu material harus diperketat atau dilonggarkan, atau disetel ulang ke default kontrak. Tidak ada jalan keluar lain; statusnya tidak pernah berubah.
<!-- src: src/services/transitions/flows/deliveryPolicy.flow.ts:46-76; src/services/data/mock/MockCommandService.ts:2560-2581 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_delivery_policy_set — Ubah toleransi <!-- transition:t_delivery_policy_set -->

- **Jenis langkah:** mencatat fakta (mempertahankan status)
- **Peran:** buyer · compliance (atom `delivery:policy-set`)
- **Dari → ke:** Governed → status yang sama
- **Operator — di mana:** `/buyer/contracts/:id` → tab **Perjanjian Pengiriman** → pada header item perjanjian, **Ubah toleransi** → penyunting sebaris **Toleransi penarikan** → **Simpan toleransi** (atau **Setel ulang ke default kontrak**, hanya ditawarkan ketika kebijakan aktif telah menyimpang).
- **Operator — lakukan:** Catat seberapa besar kelebihan atau kekurangan pengiriman yang ditoleransi pada material ini dan mengapa itu berubah. Pilih preset — *Amplop lunak (10%, tandai)* atau *Hanya referensi (tanpa batas)* — atau atur kedua tuas secara langsung. Buku penarikan menurunkan ulang penyimpangan, chip ditegakkan/referensi dan pengecualian di atas amplop pada pembacaan berikutnya.
- **Operator — isi:** **Toleransi** (persentase, atau *Tanpa batas*), **Penegakan** (*Tandai*, *Abaikan*, atau *Blokir (dicatat — belum ditegakkan)*) dan **Alasan (wajib)**. Hanya `reason` yang menjadi kolom wajib di verba; tuasnya divalidasi oleh kebijakan, karena *tanpa batas* adalah nilai yang sah dan pemeriksaan kolom wajib akan menolaknya.
- **Penguji — status yang diharapkan:** Governed
- **Penguji — konfirmasi:** chip item berubah (*Terkendali — tandai di atas N%* atau *Amplop referensi — tidak ditegakkan*); *Kebijakan aktif berubah dari default kontrak* muncul beserta default kontrak, tanggal dan alasannya; **Riwayat perubahan** bertambah baris *Toleransi diubah* dengan alasan dicetak miring; cermin pemasok menampilkan chip baru tetapi tanpa riwayat penyimpangan.
- **Penguji — peristiwa pemicu:** `t_delivery_policy_set`
- **Pemeriksaan yang dapat menolak:** `delivery_actor_attributed` — pengguna contoh yang disebut namanya diwajibkan. `delivery_policy_governed` — nilai penegakan harus salah satu dari tiga mode; toleransi harus angka berhingga tak-negatif atau tanpa batas; alasan harus berisi (spasi tidak dihitung); perubahan harus mengubah sesuatu (mencatat nilai yang sama lagi ditolak sebelum ada yang ditulis); dan bila perubahan itu **pelonggaran** — mode yang lebih lemah (block → flag → ignore) atau pita yang lebih lebar (10% → 25%, atau apa pun → tanpa batas) — aktor harus orang yang disebut namanya dan bukan identitas contoh. Pengetatan tetap tersedia bagi kursi mana pun yang teratribusi.
- **Glosarium:** ROLE_NOT_PERMITTED · POLICY_REJECTED · SCOPE_DENIED · NOT_FOUND · NO_PERSON_IN_SESSION
- **Kejujuran:** portal-saja dan SIMULASI — toast berbunyi *Toleransi diperbarui di portal (simulasi) — belum diposkan ke SAP.* Default kontrak tidak dapat diubah dan diteruskan tanpa disentuh, sehingga penyimpangan selalu diukur terhadap yang asli. `block` dicatat sebagai sikap tetapi tidak ada kode yang menolak rilis atas dasar itu. Karena satu-satunya identitas bernama dalam demo adalah identitas contoh, pelonggaran tidak terjangkau hari ini berdasarkan rancangan: penolakannya menyebut pengguna contoh dan menyatakan pengetatan masih tersedia.
<!-- src: src/services/transitions/flows/deliveryPolicy.flow.ts:55-74; src/services/transitions/policies.ts:1618-1757; src/services/delivery/policy.ts:109-164; src/services/data/mock/MockDeliveryService.ts:239-263; src/services/data/mock/MockCommandService.ts:2560-2581; src/services/query/deliveryHooks.ts:222-251; src/pages-v2/BuyerContractDetail.tsx:199-216; src/components/delivery/AgreementDrawdown.tsx:280-300,405-460; src/lib/i18n.ts:388-423 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Perketat atau longgarkan (di Governed).** Cabang A — pengetatan (`t_delivery_policy_set` dengan mode yang lebih ketat atau pita yang lebih sempit) — **Kapan:** sebuah item harus diawasi lebih dekat; kursi teratribusi mana pun yang memegang atom dapat mencatatnya. Cabang B — pelonggaran — **Kapan:** bisnis menerima penyimpangan yang lebih lebar pada material ini; ditolak untuk kursi tanpa atribusi (`DELIVERY_POLICY_LOOSENING_UNATTRIBUTED`) dan untuk identitas contoh (`SAMPLE_ACTOR_CANNOT_LOOSEN`), sehingga memerlukan orang sungguhan yang masuk, yang belum dimiliki platform.
- **Setel ulang ke default kontrak (di Governed).** Verba yang sama dengan nilai default kontrak dan alasan tetap *Setel ulang ke default kontrak* — **Kapan:** kebijakan aktif telah menyimpang dan harus kembali. Apakah penyetelan ulang terhitung pelonggaran dinilai dengan cara yang sama seperti perubahan lainnya.
- **Tanpa perubahan (pengecualian).** Mencatat nilai yang sudah berlaku ditolak (`DELIVERY_POLICY_NO_CHANGE`) — stempel yang tidak mengubah apa pun akan mengarang sebuah keputusan.
- **Alasan kosong (pengecualian).** Alasan berisi spasi ditolak (`DELIVERY_POLICY_REASON_BLANK`); pemeriksaan kolom wajib hanya membuktikan kuncinya ada.
- **Mode tak dikenal / angka buruk (pengecualian).** `DELIVERY_POLICY_MODE_UNKNOWN` dan `DELIVERY_POLICY_TOLERANCE_NOT_A_NUMBER` menjaga terhadap payload buatan tangan; penyunting tidak dapat membentuk keduanya.
<!-- src: src/services/transitions/policies.ts:1641-1757; src/components/delivery/AgreementDrawdown.tsx:291-297 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Terkendali — tandai di atas N% | diturunkan saat dibaca | Governed | penegakan aktif bukan `ignore` (toleransinya adalah pita aktif) | chip header item, kedua kursi |
| Amplop referensi — tidak ditegakkan | diturunkan saat dibaca | Governed | penegakan aktif adalah `ignore` | chip header item, kedua kursi |
| Kebijakan aktif berubah dari default kontrak | diturunkan saat dibaca (`policyDeviation`) | Governed | yang aktif berbeda dari default kontrak pada salah satu tuas; rinciannya menampilkan default, tanggal perubahan dan alasan | header item, pembeli saja |
| Pengecualian di atas amplop | diturunkan saat dibaca | Governed | ditegakkan dengan toleransi berhingga dan jumlah dirilis melebihi disepakati × (1 + toleransi) — hanya terjangkau setelah penyesuaian baris | `exceptions` buku penarikan |
| Blokir (dicatat — belum ditegakkan) | diangkat operator, tidak ditegakkan | Governed | mode aktif adalah `block`; tidak ada yang menolak rilis atas dasar itu | label penyunting |
| SIMULASI / Sampel | eksternal (liveness) | Governed | selalu | `LivenessPill` pada tab Perjanjian Pengiriman |
| Menunggu Kepatuhan (serah-terima) | diturunkan saat dibaca | Governed | kursi tidak memegang `delivery:policy-set` | slot **Ubah toleransi** |
<!-- src: src/services/delivery/ledger.ts:56-96; src/services/delivery/types.ts:84-95; src/components/delivery/AgreementDrawdown.tsx:405-460; src/lib/i18n.ts:256-258,388-409 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `sa-0001/10` dalam paket fakta — alamat perintah `sa-0001#10` (perjanjian SAP 5500000123, item 10, botol PET `PK-PETB-8810`, default kontrak *10% · Tandai*).

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Perjanjian penjadwalan `sa-0001` | segmen pertama alamat item | atas kontrak `ctr-003` (CTR-2025-018), pemasok `sup-007` |
| Item perjanjian 10 | `lineSeq` | kebijakan hidup pada item (`drawdownPolicy.contractDefault` / `.active`), bukan pada baris |
| Baris jadwal `ctr-003/sa-0001/10/1…12` | kalender item | buku penarikan menjumlahkan jumlah dirilis dan terkonfirmasinya terhadap toleransi ini |
| Buku penarikan | diturunkan per item | `activePolicy`, `policyDeviation`, `enforced`, `exceptions` semuanya dihitung saat dibaca |
| Riwayat perubahan | `activeChangedAt` / `activeChangedBy` / `activeChangeReason` | satu baris *Toleransi diubah* per item, membawa perubahan terbaru saja (model menyimpan satu stempel, bukan daftar) |

Hanya tampilan: default kontrak adalah rujukan audit bawaan dan tidak pernah ditulis oleh verba mana pun. `activeChangedBy` ditulis dari sesi oleh target, tidak pernah dari formulir.
<!-- src: src/services/delivery/addressing.ts:64-76,97-104; src/services/delivery/fixtures.ts:50-77,108-117; src/services/delivery/types.ts:108-131; src/services/delivery/history.ts:72-83; src/services/delivery/policy.ts:151-163 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent` (`event` = `t_delivery_policy_set`, `actor` = `buyer:all`, `ts`, `outcome`, `correlationId`); penolakan juga ditulis. Item itu sendiri hanya menyimpan stempel terbaru (`activeChangedAt`, `activeChangedBy`, `activeChangeReason`), yang ditampilkan **Riwayat perubahan** sebagai satu baris *Toleransi diubah* dengan alasan di bawahnya. Perubahan sebelumnya tergantikan pada item; jejak audit masih menyimpan peristiwanya.

Urutan kerja untuk `sa-0001#10` (default kontrak 10% · Tandai), sebagaimana akan dihasilkan penguji yang memegang kepatuhan dan bertindak sebagai pengguna contoh:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | Governed → Governed | buyer · compliance (pengguna contoh) | **Ubah toleransi** → Toleransi 5%, Tandai, alasan "pengawasan lebih ketat pada botol PET" → **Simpan toleransi** (pengetatan — diterima) | `t_delivery_policy_set` |
| T+1 | Governed (ditolak) | buyer · compliance (pengguna contoh) | **Setel ulang ke default kontrak** kembali ke 10% · Tandai — pelonggaran oleh identitas contoh | `t_delivery_policy_set` dengan `outcome: failed`, alasan `POLICY_REJECTED:delivery_policy_governed:SAMPLE_ACTOR_CANNOT_LOOSEN…` |
| T+2 | Governed → Governed | buyer · compliance (pengguna contoh) | **Ubah toleransi** → 5%, Blokir, pita sama, mode lebih ketat → **Simpan toleransi** (pengetatan — diterima; dicatat, tidak ditegakkan) | `t_delivery_policy_set` |
<!-- src: src/services/transitions/events.ts:127-129; src/services/delivery/history.ts:72-83; src/services/transitions/policies.ts:1641-1757; src/components/delivery/ChangeHistory.tsx:72-80 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada tombol **Ubah toleransi**; notis berbunyi *Menunggu Kepatuhan* | notis di slot toleransi pada header item | kursi tidak memegang `delivery:policy-set` (pengadaan tidak memegangnya, berdasarkan keputusan) | adopsi kursi yang memegang kepatuhan di panel identitas |
| Toast *Toleransi tidak diubah* — "Melonggarkan toleransi harus tercatat atas nama seseorang…" | `POLICY_REJECTED:delivery_policy_governed` (`DELIVERY_POLICY_LOOSENING_UNATTRIBUTED`) | kursi tidak membawa orang dan perubahannya adalah pelonggaran | pilih pengguna contoh; perhatikan bahwa pengguna contoh tetap hanya dapat memperketat |
| Toast — "… is a sample identity and may not relax a governed setting … tightening is still available" | `SAMPLE_ACTOR_CANNOT_LOOSEN` | identitas contoh mencoba pelonggaran (mode lebih lemah atau pita lebih lebar, termasuk penyetelan ulang yang melebarkan) | wajar hari ini; memerlukan orang sungguhan yang masuk, yang belum ada |
| Toast — "Kursi ini tidak bertindak atas nama siapa pun…" | `POLICY_REJECTED:delivery_actor_attributed` | tidak ada pengguna contoh yang diadopsi | adopsi satu dan simpan lagi |
| Toast — "Toleransi sudah bernilai seperti itu" | `DELIVERY_POLICY_NO_CHANGE` | tidak ada yang berubah | ubah salah satu tuas, atau batalkan |
| Toast — "Tuliskan alasan perubahannya" | `DELIVERY_POLICY_REASON_BLANK` (atau `MISSING_FIELDS:reason` bila kuncinya tidak ada) | alasan kosong | tulis alasannya |
| Toast — "Itu bukan mode penegakan penarikan" / "… tidak negatif, atau tanpa batas" | `DELIVERY_POLICY_MODE_UNKNOWN` / `DELIVERY_POLICY_TOLERANCE_NOT_A_NUMBER` | payload buatan tangan | gunakan penyuntingnya |
| "Item perjanjian itu tidak ditemukan" | `UNKNOWN_ITEM` dari layanan atau `NOT_FOUND` dari dispatcher | alamat `agreementId#lineSeq` tidak tercocok | muat ulang halaman kontrak |
| Kursi pemasok melihat chip tetapi tidak dapat menyunting | cermin pemasok | setiap verba pengiriman menolak scope pemasok; cermin menyembunyikan riwayat penyimpangan berdasarkan rancangan | wajar |
| Mengatur Blokir tidak menghentikan rilis | di atas amplop ditandai, tidak pernah diblokir | `block` dinyatakan tetapi tidak ditegakkan saat rilis | wajar; dicatat sebagai cabang yang diketahui belum diimplementasikan |
<!-- src: src/services/transitions/policies.ts:1450-1463,1681-1757; src/components/delivery/deliveryRefusal.ts:52-66; src/lib/i18n.ts:335-343,419-423; src/services/data/mock/MockDeliveryService.ts:244-248; src/services/delivery/types.ts:84-95 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Governed | `sa-0001#10`, `sa-0001#20`, `sa-0002#10` | 5500000123 (sa-0001), 5500000456 (sa-0002) | bentuk alamat item yang ditampilkan (halaman menulis `sa-0001/10`); 11 item dalam paket fakta. `sa-0001/10` dan `sa-0002/10` di-seed pada *10% · Tandai* (Kasus B); `sa-0001/20` dan `sa-0002/20` di-seed pada *Tanpa batas · Abaikan* (Kasus C — amplop referensi). Tidak ada item yang menyimpang dari default kontraknya saat seed. Item sisanya milik `sa-1001`–`sa-1007`; presetnya diatur per perjanjian di `demoFixturesScale.ts`. |
<!-- src: src/services/delivery/fixtures.ts:52-106; src/services/delivery/demoFixtures.ts:64-122; src/services/delivery/ledger.ts:21-34; src/services/delivery/demoFixturesScale.ts:55-70 -->
