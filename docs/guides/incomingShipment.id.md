---
entity: incomingShipment
locale: id
title: Pengiriman masuk (rute pasokan)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_incomingshipment_report
  - t_incomingshipment_ship
  - t_incomingshipment_arrive
  - t_incomingshipment_cancel
---

<!-- section:summary -->
## 1 · Apa proses ini

Pengiriman masuk adalah satu rute pasokan yang dilaporkan pemasok kepada Paragon — barang menuju Paragon, atau barang yang berpindah antara prinsipal dan distributor yang menjadi sandaran pasokan Paragon sendiri. Ia membawa arah, material, kuantitas dalam perjalanan, dan, opsional, ETD, ETA, serta air waybill pengangkut. Rute **Ke Paragon** harus ditautkan ke salah satu Advance Ship Notice milik pemasok sendiri (ASN tetap menjadi pelacak resmi; rute ini menautkan, bukan menggandakan). Rute **Prinsipal → distributor** adalah pergerakan penjaminan pasokan milik distributor: Paragon bukan penerima, sehingga tidak membawa ASN, dan hanya pemasok yang relasinya untuk material itu berstatus *distributor* yang boleh melaporkannya.

Satu peran memiliki setiap langkah: kontak logistik pemasok (jalur `fulfilment`) melaporkan rute dan kemudian menandainya dikirim, tiba, atau dibatalkan di `/supplier/forecasts` → **Pengiriman**. Pembeli tidak pernah mengirim perintah apa pun pada objek ini; perencana membacanya. Di `/buyer/collaboration` setiap rute yang masih **Booked** atau **Shipped** — di kedua arah — ditambahkan ke stok terdeklarasi pemasok dalam indikator cakupan pemasok, dan keluar dari hitungan begitu Arrived atau Cancelled.

Siklus hidupnya linier ditambah pembatalan: **Booked → Shipped → Arrived**, dengan **Cancelled** dapat dicapai dari salah satu status dalam perjalanan. Arrived dan Cancelled adalah status akhir. Perubahan ETA bukan status: ETA adalah kolom, dan verba yang akan merevisinya sudah dinamai tetapi belum dibangun di pohon ini. Pada rute Ke Paragon, keberangkatan dan kedatangan dilacak oleh ASN yang tertaut, sehingga portal tidak menawarkan **Tandai dikirim** atau **Tandai tiba** di sana dan mengarahkan Anda ke ASN; **Batalkan pengiriman** tetap tersedia karena tidak ada status ASN yang berarti "dibatalkan".

Penanda kejujuran. Rute yang diunggah bersifat SIMULATED dan halaman berada di bawah spanduk *Prakiraan sampel — belum ada publikasi live* dengan pil *Sampel — menunggu feed data C8 SOMO*. Keempat verba tersambung melalui tulang punggung perintah portal; tidak ada yang merupakan fakta eksternal dari S/4HANA, TMS, atau bank — status In Transit milik ASN di samping rute Ke Paragon adalah pengamatan inbound Paragon, ditampilkan sebagai sumbu kedua, bukan status objek ini. Cap berasal dari jam simulasi bersama ("hari ini" aplikasi adalah 31 Agu 2026).

<!-- section:lifecycle -->
## 2 · Jalan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Booked | tindakan operator (pembuatan) | pemasok · fulfilment | `t_incomingshipment_report` |
| 2 | Booked → Shipped | tindakan operator | pemasok · fulfilment | `t_incomingshipment_ship` |
| 3 | Shipped → Arrived | tindakan operator (akhir) | pemasok · fulfilment | `t_incomingshipment_arrive` |
| 4 | Booked, Shipped → Cancelled | tindakan operator (akhir) | pemasok · fulfilment | `t_incomingshipment_cancel` |

**Percabangan**

- **Di Booked:** `t_incomingshipment_ship` — kontak logistik pemasok — bila rute telah berangkat (rute Prinsipal → distributor; pada rute Ke Paragon keberangkatan ditandai di ASN); `t_incomingshipment_cancel` — kontak logistik pemasok — bila rute dibatalkan sebelum bergerak.
- **Di Shipped:** `t_incomingshipment_arrive` — kontak logistik pemasok — bila rute telah mendarat (lagi-lagi ditandai di ASN untuk rute Ke Paragon); `t_incomingshipment_cancel` — kontak logistik pemasok — bila rute dalam perjalanan dibatalkan.
- **Di Arrived / Cancelled:** tidak ada jalan keluar; kartu berbunyi *Rute ini telah selesai — tidak ada pembaruan lagi.*

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_incomingshipment_report — Laporkan pengiriman masuk <!-- transition:t_incomingshipment_report -->

- **Jenis langkah:** tindakan operator (pembuatan)
- **Peran:** pemasok · fulfilment (kontak logistik pemasok)
- **Dari → ke:** ∅ → Booked
- **Operator — di mana:** `/supplier/forecasts` → tab **Pengiriman** → **Laporkan pengiriman** → panel *Laporkan pengiriman masuk* → **Laporkan pengiriman**
- **Operator — lakukan:** Beri tahu Paragon bahwa ada satu kiriman, apa isinya dan sebanyak apa, agar keterlihatan pasokan dimulai sebelum barangnya datang.
- **Operator — isi:** Langkah 1 *Material & arah* — salah satu material kolaborasi Anda, lalu *Arah*: **Ke Paragon** selalu ditawarkan; **Prinsipal → distributor** ditawarkan hanya bila relasi Anda untuk material itu adalah distributor. Langkah 2 *Rincian pengiriman* — *Kuantitas* (hanya digit, mis. `6000`; satuannya milik material), *ETD* dan *ETA* opsional. Langkah 3 — untuk Ke Paragon, *Tautkan ASN Anda*: pilih salah satu ASN Anda sendiri (Anda tidak pernah mengetik referensinya; AWB digemakan dari nomor pelacakan ASN); untuk Prinsipal → distributor, *AWB* opsional.
- **Penguji — status yang diharapkan:** Booked
- **Penguji — konfirmasi:** toast *Pengiriman dilaporkan — {material}* / *Pengiriman Anda tercatat di Pengiriman.*; tab Pengiriman menampilkan kartu baru (`ish-9001`, `ish-9002`, …) dengan chip arah, pil status **Dipesan**, Kuantitas / ETA / ETD, dan *ASN tertaut* atau *AWB*; kartu Ke Paragon juga menampilkan *Masuk Paragon · {asn}* dengan status ASN itu sendiri. Di `/buyer/collaboration` kuantitas rute kini dihitung sebagai masuk dalam sel *Cakupan* pemasok × material itu.
- **Penguji — peristiwa pemicu:** `t_incomingshipment_report`
- **Pemeriksaan yang dapat menolak:** `sdc_material_known` — kode harus ada di master material (jika tidak, `UNKNOWN_MATERIAL`); `ish_toparagon_asn_linked` — rute Ke Paragon harus membawa referensi ASN yang terselesaikan ke ASN yang dikenal dan milik Anda; `ish_p2d_no_asn` — rute Prinsipal → distributor tidak boleh membawa referensi ASN; `ish_p2d_distributor_only` — Prinsipal → distributor sah hanya bila relasi Anda untuk material itu adalah distributor. Sebelum semua itu, cakupan: material harus salah satu yang dikolaborasikan Paragon dengan Anda, jika tidak `SCOPE_DENIED`. Halaman menolak lebih awal dengan *Material wajib diisi*, *Arah wajib diisi*, *Kuantitas wajib diisi* (kosong, bukan angka, atau bisa dibaca dua cara), dan *ASN wajib diisi — Pengiriman ke Paragon harus menautkan salah satu ASN Anda.*
- **Glosarium:** Ke Paragon · Prinsipal → distributor (arah); `EMPTY_QTY` · `NOT_NUMERIC` · `AMBIGUOUS_QTY`; `POLICY_REJECTED`; `SCOPE_DENIED`.
- **Kejujuran:** Data sampel SIMULATED; ASN yang Anda tautkan adalah salah satu ASN sampel Anda sendiri. Bila Anda tidak memilikinya, panel berkata *Anda tidak memiliki ASN untuk ditautkan. Buat Advance Ship Notice terlebih dahulu.* — ASN dibuat di `/supplier/shipments`, bukan di sini. Kuantitas disimpan hanya bila berupa bilangan terhingga; satuan tidak pernah menjadi pilihan Anda.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:52-67; src/services/data/mock/MockCommandService.ts:1484-1571; src/services/data/mock/MockCommandService.ts:1375-1389; src/pages-v2/SupplierForecasts.tsx:1094-1103; src/pages-v2/SupplierForecasts.tsx:1686-1791; src/pages-v2/SupplierForecasts.tsx:2391-2580; src/lib/i18n/sdcSupplier.ts:703-747; src/services/query/sdcSupplierHooks.ts:400-426; src/services/sdc/objectSubmitModels.ts:191-206; src/services/sdc/consolidation.ts:631-639 -->

### t_incomingshipment_ship — Tandai rute dikirim <!-- transition:t_incomingshipment_ship -->

- **Jenis langkah:** tindakan operator
- **Peran:** pemasok · fulfilment (kontak logistik pemasok)
- **Dari → ke:** Booked → Shipped
- **Operator — di mana:** `/supplier/forecasts` → tab **Pengiriman** → pada kartu **Dipesan** → **Tandai dikirim**. Pada rute Ke Paragon tombol digantikan baris *Keberangkatan dilacak oleh ASN {asn} — Paragon mencatatnya dari pemberitahuan; tidak ada yang perlu ditandai di sini.*
- **Operator — lakukan:** Catat bahwa rute telah berangkat; tanggal tibanya berhenti menjadi rencana dan berubah menjadi perkiraan perjalanan.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Shipped
- **Penguji — konfirmasi:** toast *Pengiriman {id} ditandai dikirim*; pil status kartu terbaca **Dikirim** dan kini menawarkan **Tandai tiba** dan **Batalkan pengiriman**. Cakupan pembeli tidak berubah — Booked dan Shipped sama-sama dihitung sebagai masuk. Rute Ke Paragon berhenti dihitung begitu ASN-nya terbaca **Delivered**: Paragon sudah menerimanya, apa pun yang tertulis pada pil rute itu sendiri.
- **Penguji — peristiwa pemicu:** `t_incomingshipment_ship`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib (`ILLEGAL_TRANSITION` dari status selain Booked; rute milik pemasok lain adalah `SCOPE_DENIED`).
- **Glosarium:** `ILLEGAL_TRANSITION`; `SCOPE_DENIED`; `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Sengaja tidak ditawarkan pada rute Ke Paragon — ASN sudah mencatat keberangkatan dan portal tidak akan menyimpan dua pelacak untuk satu pergerakan. Baris yang menunjuk ke ASN adalah alasan, bukan serah terima peran: kursi memegang izinnya.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:70-79; src/pages-v2/SupplierForecasts.tsx:918-973; src/pages-v2/SupplierForecasts.tsx:1201-1244; src/lib/i18n/sdcSupplier.ts:685-697; src/services/query/sdcSupplierHooks.ts:457-484; src/services/data/mock/MockCommandService.ts:1488-1493 -->

### t_incomingshipment_arrive — Tandai rute tiba <!-- transition:t_incomingshipment_arrive -->

- **Jenis langkah:** tindakan operator (akhir)
- **Peran:** pemasok · fulfilment (kontak logistik pemasok)
- **Dari → ke:** Shipped → Arrived
- **Operator — di mana:** `/supplier/forecasts` → tab **Pengiriman** → pada kartu **Dikirim** → **Tandai tiba**. Pada rute Ke Paragon tombol digantikan *Kedatangan dilacak oleh ASN {asn} — Paragon mencatatnya saat penerimaan; tidak ada yang perlu ditandai di sini.*
- **Operator — lakukan:** Catat bahwa rute telah mendarat. Untuk rute penjaminan pasokan (Prinsipal → distributor), di sinilah risiko Paragon mengendur.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Arrived (akhir)
- **Penguji — konfirmasi:** toast *Pengiriman {id} ditandai tiba*; pil kartu terbaca **Tiba** dan bilah tindakan berbunyi *Rute ini telah selesai — tidak ada pembaruan lagi.* Di `/buyer/collaboration` rute tidak lagi dihitung sebagai masuk, sehingga rasio *Cakupan* pemasok turun kecuali deklarasi stok yang lebih baru menutupinya.
- **Penguji — peristiwa pemicu:** `t_incomingshipment_arrive`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib (`ILLEGAL_TRANSITION` kecuali rute berstatus Shipped).
- **Glosarium:** `ILLEGAL_TRANSITION`; `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Kedatangan tidak membuat penerimaan barang dan tidak menyentuh ASN; untuk rute Ke Paragon mesin ASN tetap pelacak resmi dan rekonsiliasi keduanya adalah pertanyaan tampilan yang sudah dinamai, tidak dibangun di sini.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:84-93; src/pages-v2/SupplierForecasts.tsx:1201-1251; src/lib/i18n/sdcSupplier.ts:686-695; src/services/query/sdcSupplierHooks.ts:486-489; src/services/sdc/consolidation.ts:631-639 -->

### t_incomingshipment_cancel — Batalkan rute <!-- transition:t_incomingshipment_cancel -->

- **Jenis langkah:** tindakan operator (akhir)
- **Peran:** pemasok · fulfilment (kontak logistik pemasok)
- **Dari → ke:** Booked, Shipped → Cancelled
- **Operator — di mana:** `/supplier/forecasts` → tab **Pengiriman** → pada kartu **Dipesan** atau **Dikirim** → **Batalkan pengiriman** (ditawarkan di kedua arah, termasuk Ke Paragon)
- **Operator — lakukan:** Catat bahwa rute dibatalkan di tengah jalan, alih-alih dibiarkan dalam rencana sebagai stok yang tak akan pernah datang.
- **Operator — isi:** tidak ada yang diisi — verba tidak memiliki kolom alasan, dan halaman sengaja tidak mengada-adakannya.
- **Penguji — status yang diharapkan:** Cancelled (akhir)
- **Penguji — konfirmasi:** toast *Pengiriman {id} dibatalkan*; pil terbaca **Dibatalkan** dan bilah berbunyi *Rute ini telah selesai — tidak ada pembaruan lagi.* Rute keluar dari total masuk pembeli di *Cakupan*.
- **Penguji — peristiwa pemicu:** `t_incomingshipment_cancel`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib (`ILLEGAL_TRANSITION` pada rute Arrived atau Cancelled).
- **Glosarium:** `ILLEGAL_TRANSITION`; `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Membatalkan rute Ke Paragon tidak membatalkan atau mengubah ASN yang tertaut; status ASN itu sendiri tetap tampil di samping kartu sebagai pengamatan Paragon.
<!-- src: src/services/transitions/flows/incomingShipment.flow.ts:96-105; src/services/query/sdcSupplierHooks.ts:428-443; src/services/query/sdcSupplierHooks.ts:491-495; src/pages-v2/SupplierForecasts.tsx:943-946; src/pages-v2/SupplierForecasts.tsx:1245-1251; src/lib/i18n/sdcSupplier.ts:688-696 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Arah (saat pembuatan).** Cabang A — **Ke Paragon** — **Kapan:** barang dikonsinyasikan ke Paragon; Anda harus menautkan salah satu ASN Anda sendiri dan keberangkatan/kedatangan rute kemudian ditandai pada ASN itu. Cabang B — **Prinsipal → distributor** — **Kapan:** Anda distributor untuk material itu dan barang berpindah dari prinsipal Anda kepada Anda; tanpa ASN, AWB opsional. Penjaga membuat arah dan tautan ASN cocok satu-satu sejak lahir.
- **Bergerak atau batal (di Booked).** Cabang A — `t_incomingshipment_ship` — **Kapan:** rute berangkat. Cabang B — `t_incomingshipment_cancel` — **Kapan:** rute tidak akan bergerak.
- **Mendarat atau batal (di Shipped).** Cabang A — `t_incomingshipment_arrive` — **Kapan:** rute mendarat. Cabang B — `t_incomingshipment_cancel` — **Kapan:** rute dibatalkan dalam perjalanan.
- **ETA meleset.** Bukan transisi dan belum dibangun: ETA adalah kolom dan tidak ada verba yang merevisinya di pohon ini. Laporkan rute baru bila yang lama tergantikan, dan batalkan yang lama agar cakupan pembeli berhenti menghitungnya.
- **Kuantitas atau material salah.** Bukan transisi: tidak ada pengubahan. Batalkan rute dan laporkan lagi.

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Dipesan · Dikirim · Tiba · Dibatalkan | ditimbulkan operator (status yang dinyatakan) | semua | status rute yang dinyatakan pemasok sendiri | pil kartu Pengiriman `/supplier/forecasts` |
| Masuk Paragon · {asn} + status ASN | pengamatan berbentuk eksternal, diturunkan saat dibaca | rute Ke Paragon dengan ASN yang terselesaikan | status ASN tertaut itu sendiri (Draft / Submitted / In Transit / Delivered / Discrepancy), ditampilkan di samping — tidak pernah menggantikan — status yang dinyatakan | kartu Pengiriman, sumbu kedua |
| Keberangkatan / Kedatangan dilacak oleh ASN {asn} | diturunkan saat dibaca | rute Ke Paragon di Booked / Shipped | pergerakan dicatat pada ASN, sehingga verba tingkat rute ditahan untuk menghindari pelacak kedua | di slot verba pada kartu |
| Rute ini telah selesai — tidak ada pembaruan lagi. | diturunkan saat dibaca | Arrived, Cancelled | tidak ada verba sah yang tersisa | bilah tindakan kartu |
| Dihitung sebagai masuk | diturunkan saat dibaca (model) | Booked, Shipped, kedua arah | kuantitas rute ditambahkan ke stok terdeklarasi dalam indikator cakupan pemasok | *Cakupan* `/buyer/collaboration` (Tercakup / Berisiko / Tak tercakup, bertanda *Model*) |
| waktu tunggu tak terjembatani | diturunkan saat dibaca | berisiko / tak tercakup, distributor saja | waktu tunggu prinsipal terpendek melebihi sisa hari hingga akhir horizon | ditambahkan ke chip cakupan |
| Prakiraan sampel — belum ada publikasi live | penanda SIMULATED | seluruh halaman | setiap publikasi fixture adalah simulasi | spanduk `/supplier/forecasts`; pil *Sampel — menunggu feed data C8 SOMO* |
| Menunggu Pemenuhan Pemasok | serah terima peran | kontrol mana pun | kursi tidak memegang `incomingshipment:report` / `:ship` / `:arrive` / `:cancel` (tiga atom berbeda untuk verba lanjutan) | menggantikan tombol, per verba |

<!-- src: src/pages-v2/SupplierForecasts.tsx:907-916; src/pages-v2/SupplierForecasts.tsx:1132-1155; src/pages-v2/SupplierForecasts.tsx:1201-1251; src/services/sdc/shipment.ts:69-91; src/services/sdc/shipment.ts:105-112; src/services/sdc/consolidation.ts:631-672; src/lib/i18n/sdcSupplier.ts:679-697; src/lib/i18n/roles.ts:277-279 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `ish-0001` (nomor `ASN-2025-00301`, ASN yang tertaut; pemasok `sup-002`, material `RM-EMUL-3310` Glycerin USP 99.5%, Ke Paragon, Shipped, 6 000 KG).

| Bergabung ke | Melalui | Catatan |
|---|---|---|
| Advance Ship Notice `ASN-2025-00301` | `asnRef` = `asnNumber` | ASN milik sup-002 sendiri, status *In Transit*; pelacak resmi untuk rute ini — kartu menampilkan *Masuk Paragon · ASN-2025-00301 · In Transit* di samping status yang dinyatakan **Dikirim** |
| Entri master material | `materialCode` | satuan KG disalin dari master saat pembuatan; item baris fixture ASN memakai ruang kode yang lebih lama, sehingga kepemilikan, bukan material, adalah gabungan yang jujur |
| Relasi pemasok-material | `supplierId` + `materialCode` | sup-002 adalah manufaktur di sini, itulah sebabnya hanya **Ke Paragon** yang ditawarkan untuk material ini |
| Indikator cakupan pemasok | `supplierId` + `materialCode`, siklus hidup Booked / Shipped | 6 000 KG dihitung sebagai masuk bersama 4 000 KG milik `inv-0001` terhadap permintaan Firm 6 000 KG → **Tercakup · 1.67×** |
| Sesi pengajuan `ss-0001` | `attempted[].objectId` | kunjungan yang juga mengonfirmasi `rr-0001` dan mendeklarasikan `inv-0001`; korelasi audit saja |
| Referensi pengangkut | `awb` = `AWB-77120043` | digemakan dari nomor pelacakan ASN pada rute Ke Paragon; referensi TMS — ditautkan, tidak dilacak |

Hanya-tampil: `etd` 2026-08-10 dan `eta` 2026-08-19 adalah kolom fixture yang tidak direvisi oleh apa pun (tidak ada verba ETA). `provenance` (`SUPPLIER` · `SIMULATED` · `committed`) dibawa dan tidak pernah ditulis ulang. Status ASN dibaca dari penyimpanan ASN saat dirender; objek ini tidak pernah menyimpannya.

<!-- src: src/services/sdc/fixtures.ts:1328-1348; src/services/data/mock/fixtures/supplierShipments.ts:178-186; src/services/sdc/fixtures.ts:862-868; src/services/sdc/fixtures.ts:1371-1381; src/services/sdc/types.ts:621-649; src/services/sdc/shipment.ts:105-112; src/services/data/mock/MockCommandService.ts:1501-1532; src/services/sdc/consolidation.ts:609-650 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap pengiriman perintah menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `supplier:<supplierId>` (keempat verba adalah tindakan pemasok), `ts` dari jam bersama, `outcome`, dan `correlationId`. Laporan dapat menjadi salah satu perintah dalam kunjungan multi-objek, dan bila demikian membawa jangkar kunjungan sebagai `causationId`; ketiga verba lanjutan sengaja tidak menumpang amplop itu — mereka mengubah rute yang sudah ada — dan diaudit sendiri-sendiri.

Urutan kerja untuk rute Prinsipal → distributor sebagaimana akan dihasilkan penguji (`ish-0002` yang diunggah, sup-005 × RM-EMUL-3310, 4 000 KG, dimulai di Booked):

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Booked | pemasok · fulfilment | **Laporkan pengiriman**, arah Prinsipal → distributor, 4 000 KG, ETD / ETA | `t_incomingshipment_report` |
| T+1 | Booked → Shipped | pemasok · fulfilment | **Tandai dikirim** | `t_incomingshipment_ship` |
| T+2 | Shipped → Arrived | pemasok · fulfilment | **Tandai tiba** | `t_incomingshipment_arrive` |

Akhir alternatif: pada T+1 atau T+2, **Batalkan pengiriman** → Cancelled (`t_incomingshipment_cancel`). Untuk rute Ke Paragon seperti `ish-0001`, portal hanya mencatat T+0 dan, bila perlu, pembatalan; keberangkatan dan kedatangan adalah peristiwa milik ASN.

<!-- src: src/services/transitions/events.ts:26-60; src/services/transitions/events.ts:127-129; src/services/query/sdcSupplierHooks.ts:428-443; src/services/sdc/fixtures.ts:1351-1362; src/services/data/mock/MockCommandService.ts:1488-1493 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada **Laporkan pengiriman**, hanya *Menunggu Pemenuhan Pemasok* | pemberitahuan serah terima di slot tombol | kursi tidak memegang `incomingshipment:report` (fulfilment) | kursi fulfilment melaporkan (`ROLE_NOT_PERMITTED` bila dipaksa) |
| **Tandai dikirim** / **Tandai tiba** tidak ada pada kartu Ke Paragon | slot berbunyi *Keberangkatan / Kedatangan dilacak oleh ASN {asn} — tandai … di sana.* | memang dirancang begitu: ASN mencatat pergerakan itu | buka `/supplier/shipments` dan majukan ASN |
| Satu tombol lanjutan menampilkan *Menunggu Pemenuhan Pemasok* sementara yang lain aktif | serah terima per verba | ketiga atom lanjutan berbeda; kursi yang dipersempit bisa memegang satu dan tidak yang lain | gunakan kursi yang memegang atom yang hilang |
| *Prinsipal → distributor* tidak ada di daftar Arah | hanya *Ke Paragon* yang ditawarkan | relasi Anda untuk material itu adalah manufaktur; halaman tidak pernah menawarkan pasangan yang tidak sah | pilih Ke Paragon, atau laporkan terhadap material yang Anda distribusikan |
| Toast *ASN wajib diisi — Pengiriman ke Paragon harus menautkan salah satu ASN Anda.* | Ke Paragon dipilih, tidak ada ASN dipilih | halaman menegakkan tautan sebelum pengiriman | pilih salah satu ASN Anda; jika daftarnya kosong, buat ASN dulu |
| `POLICY_REJECTED:ish_toparagon_asn_linked` — *does not resolve* atau *belongs to another supplier* | pengiriman di luar pemilih | referensi ASN menggantung atau milik pihak lain | pilih dari ASN Anda sendiri; ASN pihak lain ditolak dengan nama |
| `POLICY_REJECTED:ish_p2d_no_asn` | payload Prinsipal → distributor membawa referensi ASN | arah dan tautan harus cocok satu-satu | hapus referensi atau ubah arah |
| `POLICY_REJECTED:ish_p2d_distributor_only` | Prinsipal → distributor dari relasi manufaktur | tidak ada rute prinsipal bagi manufaktur | laporkan sebagai Ke Paragon |
| `POLICY_REJECTED:sdc_material_known` — *UNKNOWN_MATERIAL* | material menampilkan tanda pisah untuk satuannya | kode kolaborasi yang tidak dikenal master | minta kode ditambahkan ke master |
| Toast *Kuantitas wajib diisi* dengan pesan "bisa dibaca dua cara" | mengetik `6.000` atau `6,000` | `AMBIGUOUS_QTY` — ditolak, bukan ditebak | ketik `6000` |
| `MISSING_FIELDS` | pengiriman tanpa materialCode, direction, atau qty | pemanggil di luar halaman | gunakan panel |
| `ILLEGAL_TRANSITION` | mis. **Tandai tiba** pada rute Booked, atau lanjutan apa pun pada rute yang sudah selesai | status rute berpindah sejak dirender | muat ulang; kartu hanya menawarkan verba yang sah |
| `SCOPE_DENIED` (dilempar; toast *Pembaruan itu ditolak*) | memajukan rute dengan id yang bukan milik Anda atau tidak ada, atau melaporkan material yang tidak dikolaborasikan Paragon dengan Anda | gerbang cakupan mendahului gerbang peran; milik pihak lain dan tidak ada sengaja terlihat sama | bertindak hanya pada rute Anda sendiri; verba lanjutan memakai id penyimpanan (`ish-…`), tidak pernah nomor ASN |
| `STALE_STATE` | tidak pernah dihasilkan di sini | tidak ada pemanggil SDC yang menyertakan `expectedState` | t/a |
| Cakupan pembeli tidak turun setelah **Tandai tiba** | sel *Cakupan* tidak berubah | bacaan di-cache per kursi dalam satu sesi | muat ulang halaman pembeli; pergantian persona membaca ulang penyimpanan langsung |
| ETA pada kartu salah dan tidak dapat diubah | tidak ada kontrol ubah | tidak ada verba revisi ETA di pohon ini | batalkan dan laporkan rute baru |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SDC`, atau `MODULE_INACTIVE:SDC.incomingShipments` bila hanya *Pengiriman masuk* yang dinonaktifkan; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Kolaborasi pemasok"* | modul Kolaborasi pemasok (atau salah satu bagiannya) dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61-114; src/services/transitions/dispatcher.ts:556-610; src/services/data/mock/MockCommandService.ts:1539-1571; src/pages-v2/SupplierForecasts.tsx:1045-1088; src/pages-v2/SupplierForecasts.tsx:1687-1690; src/pages-v2/SupplierForecasts.tsx:1716-1752; src/pages-v2/SupplierForecasts.tsx:2453-2456; src/lib/i18n/sdcSupplier.ts:717-747; src/services/query/sdcSupplierHooks.ts:445-452; src/services/transitions/flows/incomingShipment.flow.ts:5-13 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Booked | `ish-0002` | — | sup-005 (distributor) · RM-EMUL-3310 · Prinsipal → distributor · 4 000 KG · ETD 2026-08-25 · ETA 2026-10-08 · tanpa ASN; menawarkan **Tandai dikirim** dan **Batalkan pengiriman**; dihitung sebagai masuk dalam cakupan sup-005 (**Tercakup · 1.57×** dengan `inv-0002`) |
| Shipped | `ish-0001` | `ASN-2025-00301` | sup-002 · RM-EMUL-3310 · Ke Paragon · 6 000 KG · ETD 2026-08-10 · ETA 2026-08-19 · AWB `AWB-77120043`; ASN milik sup-002 sendiri, status *In Transit*; kartu hanya menawarkan **Batalkan pengiriman** dan mengarahkan kedatangan ke ASN; dihitung sebagai masuk (**Tercakup · 1.67×** dengan `inv-0001`) |
| Arrived | — | — | tidak ada fixture; capai dengan **Tandai dikirim** lalu **Tandai tiba** pada `ish-0002`, atau pada rute Prinsipal → distributor baru |
| Cancelled | — | — | tidak ada fixture; capai dengan **Batalkan pengiriman** pada salah satu rute yang diunggah |

Rute yang dibuat langsung dinomori mulai `ish-9001`. Untuk uji Ke Paragon, kursi sampel sup-002 adalah yang memiliki ASN sendiri untuk ditautkan (`ASN-2025-00301`); untuk uji Prinsipal → distributor gunakan kursi sup-005 pada RM-EMUL-3310, satu-satunya relasi distributor dalam fixture (waktu tunggu prinsipal 45 hari). Kursi pemasok sampel memegang ketiga jalur pemasok.

<!-- src: src/services/sdc/fixtures.ts:1328-1363; src/services/sdc/fixtures.ts:862-884; src/services/data/mock/fixtures/supplierShipments.ts:178-186; src/services/sdc/consolidation.ts:609-650; src/services/identity/sampleRoster.ts:132-134 -->
