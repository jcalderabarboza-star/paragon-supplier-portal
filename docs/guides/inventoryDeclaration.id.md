---
entity: inventoryDeclaration
locale: id
title: Deklarasi stok di tangan (SOH)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_inventorydeclaration_declare
  - t_inventorydeclaration_record
---

<!-- section:summary -->
## 1 · Apa proses ini

Deklarasi stok di tangan (SOH) adalah apa yang dinyatakan pemasok sedang dipegangnya saat ini, untuk satu barang. Inilah angka yang dipakai Paragon untuk merencanakan ketika ia tidak bisa melihat stok pemasok sendiri. Setiap deklarasi adalah potret bertanggal untuk satu pemasok dan satu material: kuantitas **total** (dasarnya) dan, opsional, **batch-batch** penyusunnya, masing-masing dengan nomor batch, kuantitas, dan tanggal kedaluwarsa. Bila batch diberikan, jumlahnya harus sama dengan total; total yang tidak sesuai dengan rinciannya sendiri ditolak.

Dua peran menulisnya, melalui dua verba berbeda yang mendarat di tempat yang sama. Kontak logistik pemasok (jalur `fulfilment`) mendeklarasikan stoknya sendiri di `/supplier/forecasts` → **Stok (SOH)**, satu material sekali jalan, melalui grid massal (satu baris per batch, dengan impor Excel opsional), atau dengan mengonfirmasi balasan kanal yang terurai di `/supplier/comm-hub`. Perencana (`planning`) mencatat stok yang dilaporkan pemasok lewat WhatsApp, email, atau WeChat di `/buyer/comm-hub` → **Triase balasan kanal**; catatan itu dijaga agar selamanya dapat dibedakan dari pernyataan pemasok sendiri, karena siapa yang mengatakannya jadi penting ketika angkanya ternyata keliru.

Tidak ada siklus hidup yang dijalani. Deklarasi lahir dalam satu-satunya statusnya, **Declared**, dan tidak pernah meninggalkannya: hitungan baru adalah deklarasi baru, ditambahkan, tidak pernah mengubah yang lama. "Stok saat ini" diturunkan saat dibaca sebagai deklarasi yang paling akhir ditambahkan per pemasok dan material, dan setiap deklarasi sebelumnya disimpan untuk dibandingkan. Pembeli tidak pernah mengubah, memverifikasi, atau menolak deklarasi; ia membaca yang terkini ke dalam indikator cakupan pemasok di `/buyer/collaboration`.

Penanda kejujuran. Setiap deklarasi yang diunggah bersifat SIMULATED; tab Stok membawa pil *Sampel — menunggu feed pemasok live*, dan grid massal menyatakan dirinya pengganti fixture-first bagi grid magic-link terhosting (pengiriman tautan, token, dan identitas pemasok yang sesungguhnya hadir bersama Communication Hub / backend). Kedua halaman kotak masuk kanal diisi operator: Anda menempel balasannya; tidak ada yang dikirim atau diterima secara langsung. Semua cap berasal dari jam simulasi bersama ("hari ini" aplikasi adalah 31 Agu 2026). Tidak ada tindakan di sini yang dimiliki S/4HANA, TMS, atau bank.

<!-- section:lifecycle -->
## 2 · Jalan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1a | ∅ → Declared | tindakan operator (pembuatan) | pemasok · fulfilment | `t_inventorydeclaration_declare` |
| 1b | ∅ → Declared | tindakan operator (pembuatan, dicatat oleh Paragon) | pembeli · planning | `t_inventorydeclaration_record` |

**Percabangan**

- **Siapa yang menyatakan angka (saat pembuatan):** `t_inventorydeclaration_declare` — kontak logistik pemasok — bila pemasok mendeklarasikan di portal, grid massal, atau kotak masuk kanalnya sendiri; `t_inventorydeclaration_record` — perencana — bila kata-kata pemasok tiba lewat kanal yang tidak terkelola dan Paragon mencatatnya. Penyimpanan sama, status sama, pemeriksaan sama; hanya verba, peran, dan pelaku yang tercatat yang berbeda.
- **Di Declared:** tidak ada jalan keluar. Declared adalah status awal sekaligus satu-satunya status akhir alur.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_inventorydeclaration_declare — Deklarasikan stok Anda <!-- transition:t_inventorydeclaration_declare -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** pemasok · fulfilment (kontak logistik pemasok)
- **Dari → ke:** ∅ → Declared
- **Operator — di mana:** tiga pintu menuju satu verba. (1) `/supplier/forecasts` → tab **Stok (SOH)** → **Deklarasikan stok** → panel *Deklarasikan stok saat ini* → **Deklarasikan stok**. (2) Tab yang sama → **Entri stok massal** → pilih material dan total, isi grid (opsional **Impor dari Excel**) → **Deklarasikan stok**. (3) `/supplier/comm-hub` → tempel balasan yang Anda terima (contoh di kotak berbunyi `STOK MAT-10234 2.400 KG`; kodenya harus salah satu material kolaborasi Anda) → **Urai balasan** → periksa baris yang diusulkan → **Konfirmasi & catat**.
- **Operator — lakukan:** Nyatakan total yang saat ini Anda pegang untuk salah satu material yang dikolaborasikan Paragon dengan Anda, dan — bila ada — rincian batch di bawahnya, agar Paragon dapat menilai kedaluwarsa selain kuantitas.
- **Operator — isi:** Langkah 1 *Material* — salah satu material kolaborasi Anda; satuan ditetapkan oleh material, Anda tidak pernah memilihnya. Langkah 2 *Total stok di tangan* — angka saja (mis. `2400`); `0` sah bila Anda tidak memegang apa pun. Langkah 3 (opsional) *Rincian batch* — *Nomor batch*, *Kuantitas*, *Tanggal kedaluwarsa* per baris; banner *Total batch: {sum} dari {total} {uom}* harus seimbang. Di grid massal, material dan total adalah kolom header dan grid hanya memuat baris batch; spreadsheet yang diimpor mengisi baris batch setelah Anda mencocokkan kolom (*Nomor batch ← kolom Anda*, *Kuantitas ← kolom Anda*, *Tanggal kedaluwarsa ← kolom Anda (opsional)*). Di kotak masuk kanal, material dan total dibaca dari pesan dan ditampilkan untuk Anda konfirmasi atau koreksi.
- **Penguji — status yang diharapkan:** Declared
- **Penguji — konfirmasi:** toast *Stok dideklarasikan — {material}* / *Stok Anda saat ini tercatat di Stok (SOH).* (massal: *Stok grain-batch Anda tercatat di Stok (SOH).*; kotak masuk: *Tercatat dari {channel}*). Tab Stok menampilkan kartu baru (`inv-9001`, `inv-9002`, …) dengan chip **Rincian batch** atau **Total saja**, *per {tanggal}* dari jam bersama, dan setiap batch dengan *kedaluwarsa {tanggal}* atau *tanpa kedaluwarsa*; kartu total-saja membawa petunjuk bahwa keterjembatanan kedaluwarsa tidak dapat dinilai. Di `/buyer/collaboration` sel *Cakupan* untuk pemasok × material itu diturunkan ulang dari deklarasi ini — **Tercakup / Berisiko / Tak tercakup** dengan rasionya, bertanda *Model*, ditambah *buta-kedaluwarsa* bila deklarasi total-saja.
- **Penguji — peristiwa pemicu:** `t_inventorydeclaration_declare`
- **Pemeriksaan yang dapat menolak:** `sdc_material_known` — kode harus ada di master material (jika tidak, `UNKNOWN_MATERIAL`; satuan tidak pernah ditebak); `inv_declare_batch_total` — bila batch ada, kuantitasnya harus berjumlah tepat sama dengan total. Sebelum keduanya, cakupan: material harus salah satu yang dikolaborasikan Paragon dengan Anda (ada relasi, atau suatu publikasi pernah menujukannya kepada Anda), jika tidak `SCOPE_DENIED`. Halaman dan grid memeriksa hal yang sama lebih dulu dan menolak dengan alasan bernama sebelum mengirim (total kosong, nomor batch hilang, kuantitas tidak valid atau ambigu, batch tidak berjumlah sama, tidak ada baris).
- **Glosarium:** `EMPTY_QTY` · `NOT_NUMERIC` · `AMBIGUOUS_QTY` (penolakan kuantitas); `POLICY_REJECTED`; `SCOPE_DENIED`.
- **Kejujuran:** Deklarasi yang diunggah bersifat SIMULATED dan pil tab berbunyi *Sampel — menunggu feed pemasok live*. Grid massal adalah permukaan magic-link fixture-first yang berjalan pada sesi login Anda. Kotak masuk kanal diisi operator — tanpa kanal langsung. Deklarasi total-saja jujur tentang dasarnya tetapi buta-kedaluwarsa; cakupan pembeli menandainya demikian alih-alih mengasumsikan tanpa risiko kedaluwarsa. File Excel tidak pernah meninggalkan peramban; ia hanya mengisi awal baris batch, dan kuantitas yang tidak dapat dibaca parser diimpor kosong dan dicantumkan sebelum Anda mengimpor.
<!-- src: src/services/transitions/flows/inventoryDeclaration.flow.ts:79-91; src/services/data/mock/MockCommandService.ts:1397-1482; src/services/data/mock/MockCommandService.ts:1352-1389; src/pages-v2/SupplierForecasts.tsx:794-904; src/pages-v2/SupplierForecasts.tsx:1623-1684; src/pages-v2/SupplierForecasts.tsx:2198-2370; src/pages-v2/BulkStockEntryGrid.tsx:132-140; src/pages-v2/BulkStockEntryGrid.tsx:349-384; src/pages-v2/BulkStockEntryGrid.tsx:455-464; src/pages-v2/XlsxImportPanel.tsx:20-45; src/pages-v2/XlsxImportPanel.tsx:315-319; src/pages-v2/CommHubInbound.tsx:130-142; src/pages-v2/CommHubInbound.tsx:254-262; src/services/sdc/ingest.ts:189-252; src/services/sdc/parseWorkbook.ts:41-45; src/services/sdc/parseWorkbook.ts:166-182; src/lib/i18n/sdcSupplier.ts:550-670; src/services/query/sdcSupplierHooks.ts:370-396; src/services/sdc/inventory.ts:19-25 -->

### t_inventorydeclaration_record — Catat balasan kanal pemasok <!-- transition:t_inventorydeclaration_record -->

- **Jenis langkah:** tindakan operator (pembuatan, dicatat oleh Paragon atas nama pemasok)
- **Peran:** pembeli · planning (perencana)
- **Dari → ke:** ∅ → Declared
- **Operator — di mana:** `/buyer/comm-hub` → panel **Triase balasan kanal** → *Ini percakapan siapa?* (pilih pemasok) → *Kanal* (WhatsApp / Email / WeChat) → *Teks pesan* → **Urai balasan** → *Konfirmasi yang akan dicatat* (material dan total per baris) → **Konfirmasi & catat**
- **Operator — lakukan:** Catat stok yang dilaporkan pemasok kepada Anda lewat obrolan atau surel, sebagai catatan Paragon atas kata-kata pemasok. Anda memilih pemasok sebelum menempel; pilihan itu mengikat pesan dan tidak dapat diubah saat konfirmasi.
- **Operator — isi:** pemasok (pengikat), kanal, pesan apa adanya (mis. `STOK PK-PETB-8810 2.400 PCS`), lalu per baris usulan *Material* (dari material kolaborasi pemasok itu; token tak dikenal tetap tak terpetakan dan memblokir konfirmasi) dan *Total kuantitas* dalam satuan material itu sendiri. Triase mencatat satu total per material; rincian batch tidak dimasukkan di sini.
- **Penguji — status yang diharapkan:** Declared
- **Penguji — konfirmasi:** baris hasil *Dicatat oleh Paragon dari {channel}: {material} — {qty}* dan toast *Tercatat dari {channel}* / *Balasan pemasok dicatat oleh Paragon sebagai deklarasi terkelola.* Tab Stok (SOH) milik pemasok subjek menampilkan deklarasi baru sebagai stok terkininya tanpa memuat ulang (pencatatan menyegarkan bacaan pemasok itu dan konsolidasi pembeli, tidak pihak lain). Sel *Cakupan* pembeli diturunkan ulang. Di aliran peristiwa pelakunya adalah `buyer:all`, bukan pemasok.
- **Penguji — peristiwa pemicu:** `t_inventorydeclaration_record`
- **Pemeriksaan yang dapat menolak:** `sdc_material_known` — `UNKNOWN_MATERIAL` bila kode tidak ada di master (halaman menampilkan *Master material tidak mengenal kode ini…*); `inv_declare_batch_total` — batch, bila ada, harus berjumlah sama dengan total. Cakupan: target ini mewajibkan pemilik yang dapat diselesaikan bahkan untuk pembeli, sehingga mencatat untuk pemasok × material yang tidak pernah disebut data terkelola adalah `SCOPE_DENIED`. Kursi tanpa jalur planning melihat *Menunggu Perencanaan* menggantikan **Konfirmasi & catat**.
- **Glosarium:** `POLICY_REJECTED`; `SCOPE_DENIED`; `ROLE_NOT_PERMITTED`; `AMBIGUOUS_QTY`.
- **Kejujuran:** Diisi operator — tanpa kanal langsung; tidak ada yang dikirim atau diterima. Hasilnya dibingkai *Dicatat oleh Paragon*, tidak pernah *pemasok mengirimkannya*, dan kedua verba tetap dapat dibedakan selamanya di aliran peristiwa berdasarkan verba, peran, dan pelaku — tidak ada bendera yang disimpan pada deklarasi. Balasan yang terurai hanyalah usulan sampai Anda mengonfirmasinya.
<!-- src: src/services/transitions/flows/inventoryDeclaration.flow.ts:33-57; src/services/transitions/flows/inventoryDeclaration.flow.ts:101-110; src/services/data/mock/MockCommandService.ts:1407-1418; src/pages-v2/BuyerChannelTriage.tsx:43-69; src/pages-v2/BuyerChannelTriage.tsx:157-173; src/pages-v2/BuyerChannelTriage.tsx:275-302; src/pages-v2/BuyerChannelTriage.tsx:576-588; src/lib/i18n/buyerCommHub.ts:126-155; src/lib/i18n/commHubInbound.ts:125-126; src/services/query/sdcBuyerHooks.ts:108-177; src/services/channel/types.ts:30-39; src/services/transitions/dispatcher.ts:556-568 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Siapa yang mendeklarasikan (saat pembuatan).** Cabang A — `t_inventorydeclaration_declare` — **Kapan:** pemasok menyatakan stoknya sendiri melalui portal, grid massal, atau kotak masuk kanalnya sendiri; pelaku yang tercatat adalah pemasok. Cabang B — `t_inventorydeclaration_record` — **Kapan:** pemasok membalas lewat kanal tak terkelola dan perencana menyalinnya; pelaku yang tercatat adalah pembeli.
- **Total saja atau rincian batch (di dalam deklarasi).** Cabang A — total saja — **Kapan:** Anda tahu dasarnya tetapi tidak batch-batchnya; sah dan jujur, tetapi cakupan pembeli ditandai *buta-kedaluwarsa*. Cabang B — batch diberikan — **Kapan:** Anda dapat merincinya; kuantitas batch harus berjumlah sama dengan total atau deklarasi ditolak (`inv_declare_batch_total`), dan bacaan cakupan menjadi sadar-kedaluwarsa.
- **Mengoreksi angka yang salah.** Bukan transisi. Tidak ada ubah, verifikasi, atau tolak: deklarasikan lagi. Deklarasi terbaru menjadi yang terkini; yang sebelumnya tetap tercatat.
- **Penolakan grid massal (sebelum pengiriman).** *Masukkan total stok di tangan* (total kosong) · *Sebuah baris memiliki kuantitas tetapi tanpa nomor batch* · *Sebuah kuantitas batch bukan angka yang valid* · *Sebuah kuantitas dapat dibaca dua cara (1.800 = 1.800 atau 1,8)* · *batch harus berjumlah sama dengan total* · *Masukkan total, atau satu batch atau lebih.* — **Kapan:** adapter grid tidak dapat melipat baris menjadi satu deklarasi; baris yang bermasalah diwarnai dan tidak ada yang dikirim.
- **Penolakan impor Excel (sebelum grid).** *File itu bukan workbook .xlsx yang bisa dibaca* · *tidak punya lembar yang bisa dipakai* · *tidak punya baris data* · *tidak punya baris header* — **Kapan:** tingkat file gagal; nol baris diimpor dan grid tidak tersentuh.

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Total saja / Rincian batch | diturunkan saat dibaca | Declared | apakah deklarasi membawa batch | chip kartu Stok (SOH) `/supplier/forecasts` |
| buta-kedaluwarsa | diturunkan saat dibaca | Declared (cakupan pembeli) | deklarasi terkini total-saja, sehingga keterjembatanan kedaluwarsa tidak dapat dinilai | sel *Cakupan* `/buyer/collaboration`, penanda miring; petunjuk kartu pemasok |
| Tanpa deklarasi | diturunkan saat dibaca | tidak ada deklarasi untuk pasangan | pemasok × material dengan permintaan Firm / Semi-firm dan SOH belum pernah dideklarasikan — kekosongan yang jujur, bukan nol | sel *Cakupan* `/buyer/collaboration` |
| Tercakup · Berisiko · Tak tercakup | diturunkan saat dibaca (model) | Declared | (total terkini + rute masuk Booked/Shipped) ÷ permintaan berkomitmen: ≥ 1 tercakup, ≥ 0,8 berisiko, di bawahnya tak tercakup | chip *Cakupan* `/buyer/collaboration` dengan rasio, bertanda *Model* |
| waktu tunggu tak terjembatani | diturunkan saat dibaca | berisiko / tak tercakup, distributor saja | waktu tunggu prinsipal terpendek melebihi sisa hari hingga akhir horizon berkomitmen | ditambahkan ke chip cakupan |
| Sampel — menunggu feed pemasok live | penanda SIMULATED | seluruh tab | deklarasi yang diunggah adalah simulasi | pil tab Stok (SOH) `/supplier/forecasts` |
| Grid fixture-first | penanda SIMULATED | grid massal | selalu di build ini — pengiriman magic-link, token, dan identitas belum dibangun | catatan grid massal |
| Kotak masuk diisi operator — tanpa kanal langsung | penanda SIMULATED | kotak masuk kanal | selalu di build ini | spanduk `/supplier/comm-hub`; catatan kejujuran triase `/buyer/comm-hub` |
| Menunggu Pemenuhan Pemasok / Menunggu Perencanaan | serah terima peran | kontrol mana pun | kursi tidak memegang `inventorydeclaration:declare` / `:record` | menggantikan **Deklarasikan stok**, **Entri stok massal**, atau **Konfirmasi & catat** |

<!-- src: src/services/sdc/inventory.ts:19-25; src/services/sdc/consolidation.ts:54; src/services/sdc/consolidation.ts:539-672; src/pages-v2/BuyerCollaboration.tsx:728-790; src/pages-v2/SupplierForecasts.tsx:1896-1900; src/lib/i18n/sdcSupplier.ts:555-561; src/lib/i18n/sdcSupplier.ts:603-605; src/lib/i18n/sdcConsolidation.ts:231-244; src/lib/i18n/widget.ts:214; src/lib/i18n/commHubInbound.ts:90-92; src/lib/i18n/buyerCommHub.ts:150-151; src/lib/i18n/roles.ts:277-279 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `inv-0001` (tanpa nomor dokumen — id penyimpanan adalah nomornya; pemasok `sup-002`, material `RM-EMUL-3310` Glycerin USP 99.5%, dideklarasikan 2026-08-03, total 4 000 KG).

| Bergabung ke | Melalui | Catatan |
|---|---|---|
| Entri master material | `materialCode` | satuan (KG) pada total dan pada setiap batch disalin dari master saat pembuatan; payload tidak pernah membawa satuan |
| Relasi pemasok-material | `supplierId` + `materialCode` | sup-002 adalah manufaktur untuk material ini; keanggotaan (relasi atau baris terbit mana pun) adalah yang meloloskan deklarasi di gerbang cakupan |
| Batch (anak) | `batches[]` | `GLY-24A` 1 800 KG kedaluwarsa 2027-06-30; `GLY-24B` 2 200 KG kedaluwarsa 2027-09-30; 1 800 + 2 200 = 4 000 — invarian yang ditegakkan kait kebijakan |
| Indikator cakupan pemasok | `supplierId` + `materialCode` | proyeksi hanya-tampil: 4 000 terdeklarasi + 6 000 masuk (`ish-0001`, Shipped) ÷ 6 000 permintaan Firm → **Tercakup · 1.67×**, sadar-kedaluwarsa |
| Pengiriman masuk | `supplierId` + `materialCode`, siklus hidup Booked atau Shipped | ditambahkan ke total terdeklarasi dalam bacaan cakupan; rute Arrived dan Cancelled tidak pernah dihitung |
| Sesi pengajuan `ss-0001` | `attempted[].objectId` | kunjungan yang juga mengonfirmasi `rr-0001` dan melaporkan `ish-0001`; korelasi audit saja |
| Pesan kanal (jalur pencatatan saja) | `ChannelMessage.supplierId` | untuk `t_inventorydeclaration_record` pemasok subjek diikat dari pesan yang ditangkap, tidak pernah dari kolom formulir |

Hanya-tampil: `declaredAt` dicap oleh penyimpanan dari jam bersama; "terkini" diputuskan oleh urutan penyisipan penyimpanan, bukan oleh tanggal ini, sehingga deklarasi baru selalu mengungguli data awal bertanggal masa depan. `provenance` (`SUPPLIER` · `SIMULATED` · `committed`) dibawa dan tidak pernah ditulis ulang. Tidak ada kolom status pada objek ini.

<!-- src: src/services/sdc/fixtures.ts:1283-1296; src/services/sdc/fixtures.ts:862-868; src/services/sdc/fixtures.ts:1335-1348; src/services/sdc/fixtures.ts:1371-1381; src/services/sdc/types.ts:578-610; src/services/sdc/inventory.ts:44-66; src/services/sdc/consolidation.ts:609-650; src/services/data/mock/MockCommandService.ts:1426-1458 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap pengiriman perintah menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `supplier:<supplierId>` untuk deklarasi pemasok sendiri atau `buyer:all` untuk pencatatan perencana, `ts` dari jam bersama, `outcome`, dan `correlationId`. Dalam kunjungan pemasok multi-objek, `correlationId` perintah pertama menjadi jangkar dan perintah berikutnya membawanya sebagai `causationId`. Karena objek ini punya satu status dan tanpa jalan keluar, riwayatnya adalah satu peristiwa per deklarasi; kisah stok suatu material adalah urutan deklarasi, masing-masing disimpan.

Urutan kerja untuk material `inv-0001` (sup-002 × RM-EMUL-3310) sebagaimana akan dihasilkan penguji:

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Declared (`inv-0001`, data awal) | pemasok · fulfilment | **Deklarasikan stok** dengan dua batch berjumlah 4 000 KG | `t_inventorydeclaration_declare` |
| T+1 | ∅ → Declared (`inv-9001`) | pemasok · fulfilment | **Deklarasikan stok** lagi, total saja, mis. 3 000 KG — menjadi SOH terkini; `inv-0001` tetap tercatat | `t_inventorydeclaration_declare` |
| T+2 | ∅ → Declared (`inv-9002`) | pembeli · planning | **Konfirmasi & catat** di `/buyer/comm-hub` setelah menempel balasan obrolan pemasok — pelaku `buyer:all`; menjadi SOH terkini | `t_inventorydeclaration_record` |

<!-- src: src/services/transitions/events.ts:26-60; src/services/transitions/events.ts:127-129; src/services/sdc/session.ts:15-27; src/services/sdc/inventory.ts:44-66; src/services/data/mock/MockCommandService.ts:1403-1406 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada **Deklarasikan stok** / **Entri stok massal**, hanya *Menunggu Pemenuhan Pemasok* | pemberitahuan serah terima di slot tombol | kursi pemasok tidak memegang `inventorydeclaration:declare` (fulfilment) | kursi yang memegang jalur fulfilment mendeklarasikan (`ROLE_NOT_PERMITTED` bila dipaksa) |
| Tidak ada **Konfirmasi & catat** di panel triase, hanya *Menunggu Perencanaan* | pemberitahuan serah terima di bawah baris | kursi pembeli tidak memegang `inventorydeclaration:record` (planning) | beralih ke kursi planning |
| Toast *Total kuantitas wajib diisi* dengan pesan "bisa dibaca dua cara" | mengetik `2.400` atau `2,400` | `AMBIGUOUS_QTY` — parser tunggal menolak, bukan menebak | ketik `2400` |
| Toast *Batch tidak berjumlah sama dengan total* | *Total batch: {sum} dari {total}* tidak seimbang | pra-pemeriksaan halaman atas aturan yang sama dengan yang ditegakkan kait | perbaiki kuantitas batch atau totalnya |
| Toast *Stok tidak dideklarasikan* + *batch harus berjumlah sama dengan total* (grid massal) | baris bermasalah diwarnai | adapter grid menolak lipatan | rekonsiliasi; total adalah dasar yang dinyatakan, tidak pernah diturunkan dari batch |
| Toast *Stok tidak dideklarasikan* + *Sebuah baris memiliki kuantitas tetapi tanpa nomor batch* | baris grid terisi sebagian | setiap batch yang dirinci memerlukan nomor | tambahkan nomor batch atau kosongkan baris |
| Impor mencantumkan *Kuantitas yang tidak dapat dibaca: N* | baris dinamai dengan *tidak ada kuantitas* / *bukan angka* / *bisa berarti dua angka berbeda* | sel yang ditolak parser diimpor kosong | ketik ulang di grid; jika sebagian besar baris tercantum, periksa pemetaan kolom Kuantitas |
| *File itu bukan workbook .xlsx yang bisa dibaca* / *tidak punya lembar yang bisa dipakai* / *tidak punya baris data* / *tidak punya baris header* | pesan panel impor, nol baris | penolakan tingkat file | perbaiki file; grid tidak tersentuh |
| `POLICY_REJECTED:sdc_material_known` — *UNKNOWN_MATERIAL* | material menampilkan tanda pisah untuk satuannya | kode kolaborasi yang tidak dikenal master | minta kode ditambahkan ke master; tidak ada yang disimpan dengan satuan tebakan |
| `POLICY_REJECTED:inv_declare_batch_total` | hanya tercapai oleh pemanggil yang melewati pra-pemeriksaan halaman | jumlah batch ≠ total | kirim ulang dengan angka yang seimbang |
| `MISSING_FIELDS` | pengiriman tanpa materialCode atau totalQty | pemanggil di luar halaman | gunakan halaman atau grid |
| `SCOPE_DENIED` (dilempar; tampil di toast) | pemasok mendeklarasikan material yang tidak dikolaborasikan Paragon dengannya; perencana mencatat untuk pemasok × material yang tidak pernah disebut data | gerbang cakupan mendahului gerbang peran | pilih material dari daftar yang ditawarkan — daftar itu persis himpunan yang diterima verba |
| `ILLEGAL_TRANSITION` / `STALE_STATE` | tidak pernah dihasilkan di sini | alur tidak punya verba non-pembuatan dan tidak ada pemanggil yang menyertakan `expectedState` | t/a |
| Cakupan pembeli masih menampilkan angka lama | sel *Cakupan* tidak berubah setelah pemasok mendeklarasikan | bacaan di-cache per kursi; deklarasi pemasok sendiri menyegarkan cakupannya dan cakupan pembeli dalam sesi yang sama | muat ulang halaman pembeli; pergantian persona membaca ulang penyimpanan langsung |
| Cakupan menampilkan *Tanpa deklarasi* untuk material yang menurut pemasok sudah dideklarasikan | pasangan membawa permintaan Firm / Semi-firm dan tidak ada deklarasi di penyimpanan | deklarasi dibuat untuk kode material berbeda, atau ditolak | periksa tab Stok untuk kode persisnya; deklarasikan lagi |
| Cakupan terbaca *Tercakup* tetapi membawa *buta-kedaluwarsa* | deklarasi terkini total-saja | keterjembatanan kedaluwarsa tidak dapat dinilai dari total | deklarasikan rincian batch (panel Langkah 3, atau grid massal) |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SDC`, atau `MODULE_INACTIVE:SDC.stockOnHand` bila hanya *Stok tersedia* yang dinonaktifkan; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Kolaborasi pemasok"* | modul Kolaborasi pemasok (atau salah satu bagiannya) dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/dispatcher.ts:556-568; src/lib/i18n/sdcSupplier.ts:496-501; src/lib/i18n/sdcSupplier.ts:586-670; src/lib/i18n/commHubInbound.ts:125-126; src/services/data/mock/MockCommandService.ts:1375-1389; src/services/data/mock/MockCommandService.ts:1466-1482; src/services/query/sdcSupplierHooks.ts:117-136; src/services/query/sdcBuyerHooks.ts:99-118; src/pages-v2/BuyerChannelTriage.tsx:153-157 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Declared | `inv-0001` | — | sup-002 · RM-EMUL-3310 (Glycerin USP 99.5%) · 4 000 KG · rincian batch (`GLY-24A` 1 800 kedaluwarsa 2027-06-30, `GLY-24B` 2 200 kedaluwarsa 2027-09-30) · dideklarasikan 2026-08-03; cakupan pembeli untuk pasangan **Tercakup · 1.67×** (dengan `ish-0001` 6 000 KG Shipped) |
| Declared | `inv-0002` | — | sup-005 (distributor, waktu tunggu prinsipal 45 hari) · RM-EMUL-3310 · 1 500 KG · satu batch `DST-1180` kedaluwarsa 2027-03-31 · dideklarasikan 2026-08-03; cakupan **Tercakup · 1.57×** (dengan `ish-0002` 4 000 KG Booked terhadap permintaan 3 500 KG) |
| Declared | `inv-0003` | — | sup-007 · PK-PETB-8810 (PET Bottle 250ml) · 45 000 PCS · **Total saja** · dideklarasikan 2026-08-05; cakupan **Tercakup · 1.13×** terhadap permintaan Firm 40 000 PCS, bertanda *buta-kedaluwarsa* |

Pasangan dengan permintaan berkomitmen dan tanpa deklarasi pada jam bersama (kekosongan jujur di grid pembeli): sup-002 × RM-EMUL-3320, sup-005 × PK-PETB-8810, sup-007 × PK-CAPF-8820. Deklarasi yang dibuat langsung dinomori mulai `inv-9001` dan mengungguli setiap data awal sebagai SOH terkini terlepas dari tanggal. Untuk triase pembeli, contoh kerja di kotak pesan adalah `STOK PK-PETB-8810 2.400 PCS` dengan sup-007 sebagai pemasok subjek. Kursi pemasok sampel memegang ketiga jalur pemasok.

<!-- src: src/services/sdc/fixtures.ts:1283-1324; src/services/sdc/fixtures.ts:862-884; src/services/sdc/fixtures.ts:1328-1363; src/services/sdc/consolidation.ts:576-672; src/services/sdc/inventory.ts:27-47; src/lib/i18n/buyerCommHub.ts:137; src/services/identity/sampleRoster.ts:132-134 -->
