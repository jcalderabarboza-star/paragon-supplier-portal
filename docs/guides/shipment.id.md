---
entity: shipment
locale: id
title: Pengiriman masuk
wired: false
owner: tms
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_shipment_create
  - t_shipment_asn_received
  - t_shipment_depart
  - t_shipment_arrive_port
  - t_shipment_customs
  - t_shipment_dock
  - t_shipment_unload
  - t_shipment_deliver
---

<!-- section:summary -->
## 1 · Apa proses ini

Rute masuk sebagaimana dilihat logistik — satu perpindahan fisik yang dilacak dari gerbang pemasok sampai halaman Paragon. Sebuah catatan pengiriman dibuka untuk barang yang ditunggu Paragon, menerima pemberitahuan awal dari pemasok, lalu bergerak melalui tonggak-tonggak fisik: keberangkatan, tiba di pelabuhan, bea cukai, dok, bongkar muat, terkirim. Catatan penerimaan (goods receipt) mengambil alih di titik proses ini berakhir.

**Proses ini dimodelkan tetapi tidak aktif.** Kedelapan langkahnya adalah fakta eksternal yang dimiliki TMS (Odyssey Control Tower, integrasi INT-TMS-01). Berkas alurnya mengatakannya dengan jelas: siklus hidup logistiknya *"milik TMS Control Tower … sehingga setiap kemajuan dipicu sistem dan TIDAK ADA verba yang tersambung pada tahap ini."* Tidak ada target perintah di balik pengiriman, tidak ada seorang pun di portal yang menekan apa pun untuk memindahkannya, dan tidak ada peristiwa yang pernah ditulis untuknya. Perencana dan penerima di sini adalah pembaca, bukan pelaku.

Apa yang ditampilkan portal hari ini: `/buyer/shipments` (**Pengiriman & ASN**) menampilkan fixture beku berisi delapan belas pengiriman dengan pil status, garis waktu, jadwal dermaga, dan panel samping. Halaman ini membawa penanda provenans **Data contoh** karena kapabilitas `shipments` tidak berlandaskan sumber apa pun (null-backed) — tidak ada umpan logistik di belakangnya. `Delayed` (Terlambat) bukan status mesin ini; halaman menghitungnya saat dibaca dari ETA dan tanggal kini yang dinyatakan.

<!-- src: src/services/transitions/flows/shipment.flow.ts:1-15; src/pages-v2/BuyerShipments.tsx:579; src/services/liveness/registry.ts:222; src/services/data/shipmentDisplayState.ts:126 -->

<!-- section:lifecycle -->
## 2 · Jalan siklus hidup

Label Indonesia untuk status (dari peta label pusat): Pending ASN = Menunggu ASN · ASN Received = ASN Diterima · In Transit = Dalam Perjalanan · Arrived at Port = Tiba di Pelabuhan · Customs Clearance = Proses Bea Cukai · At Dock = Di Dok · Unloading = Bongkar Muat · Delivered = Terkirim.

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Pending ASN | fakta eksternal (TMS) · pembuatan | otomasi | `t_shipment_create` |
| 2 | Pending ASN → ASN Received | fakta eksternal (TMS) | otomasi | `t_shipment_asn_received` |
| 3 | ASN Received → In Transit | fakta eksternal (TMS) | otomasi | `t_shipment_depart` |
| 4 | In Transit → Arrived at Port | fakta eksternal (TMS) | otomasi | `t_shipment_arrive_port` |
| 5 | Arrived at Port → Customs Clearance | fakta eksternal (TMS) | otomasi | `t_shipment_customs` |
| 6 | Customs Clearance → At Dock | fakta eksternal (TMS) | otomasi | `t_shipment_dock` |
| 7 | At Dock → Unloading | fakta eksternal (TMS) | otomasi | `t_shipment_unload` |
| 8 | Unloading → Delivered (akhir) | fakta eksternal (TMS) | otomasi | `t_shipment_deliver` |

**Percabangan**

- Tidak ada. Mesinnya satu rantai; tidak ada status dengan dua jalan keluar. `Delayed` adalah proyeksi saat baca (ETA lewat, belum ada kedatangan aktual), bukan cabang.

<!-- src: src/services/transitions/flows/shipment.flow.ts:22-34; src/lib/statusLabel.ts:19-88 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_shipment_create — Catatan pengiriman dibuka <!-- transition:t_shipment_create -->

- **Jenis langkah:** fakta eksternal (TMS) · pembuatan · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:create`; tidak ada jalur portal yang memegangnya)
- **Dari → ke:** ∅ → Pending ASN
- **Operator — di mana:** tidak ada yang menekan ini di portal.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** catatannya memerlukan nomor PO dan id pemasok; tidak ada yang mengisinya di portal.
- **Penguji — status yang diharapkan:** Pending ASN — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_create` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Catatan pengiriman berasal dari TMS (INT-TMS-01); Paragon menerimanya."* Kepala berkas alur menambahkan bahwa kaskade "dibuat oleh konfirmasi PO" ditangguhkan dan tidak ditulis.
<!-- src: src/services/transitions/flows/shipment.flow.ts:39-55 -->

### t_shipment_asn_received — Pemberitahuan awal pemasok sudah masuk <!-- transition:t_shipment_asn_received -->

- **Jenis langkah:** fakta eksternal (TMS) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:advance`)
- **Dari → ke:** Pending ASN → ASN Received
- **Operator — di mana:** tidak ada yang menekan ini di portal. Pemasok mengajukan ASN di `/supplier/shipments`; itu proses `advanceShipNotice`.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** ASN Received — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_asn_received` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"TMS mencatat bahwa pemasok mengajukan ASN terhadap pengiriman ini. Paragon mengetahuinya; tidak ada yang menyatakannya di sini."* Tidak ada pengiriman fixture yang berada di ASN Received.
<!-- src: src/services/transitions/flows/shipment.flow.ts:57-74; src/data/mockShipments.ts:71-520 -->

### t_shipment_depart — Barang meninggalkan pemasok <!-- transition:t_shipment_depart -->

- **Jenis langkah:** fakta eksternal (TMS) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:advance`)
- **Dari → ke:** ASN Received → In Transit
- **Operator — di mana:** tidak ada yang menekan ini di portal.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** In Transit — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_depart` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Keberangkatan adalah pemindaian kurir yang dilaporkan melalui TMS. Pembeli yang memantau pengiriman tidak punya apa pun untuk ditekan."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:76-92 -->

### t_shipment_arrive_port — Tiba di pelabuhan masuk <!-- transition:t_shipment_arrive_port -->

- **Jenis langkah:** fakta eksternal (TMS) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:advance`)
- **Dari → ke:** In Transit → Arrived at Port
- **Operator — di mana:** tidak ada yang menekan ini di portal. Tombol **Lacak pengiriman** di panel samping pada status ini membuka toast yang mengatakan pelacakan kurir belum tersedia; ia tidak memindahkan pengiriman.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Arrived at Port — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_arrive_port` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Kedatangan di pelabuhan adalah peristiwa kurir/terminal yang dilaporkan melalui TMS, bukan fakta yang dinyatakan siapa pun di portal ini."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:94-110; src/pages-v2/BuyerShipments.tsx:452-470; src/lib/i18n/shipments.ts:247-248,256 -->

### t_shipment_customs — Di tangan otoritas perbatasan <!-- transition:t_shipment_customs -->

- **Jenis langkah:** fakta eksternal (TMS) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:advance`)
- **Dari → ke:** Arrived at Port → Customs Clearance
- **Operator — di mana:** tidak ada yang menekan ini di portal. Baris tindakan-berikutnya di panel samping berbunyi **Menunggu TMS** untuk pengiriman pada status ini.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Customs Clearance — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_customs` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Pengurusan bea cukai adalah hasil dari otoritas yang diteruskan forwarder melalui TMS."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:112-128; src/pages-v2/BuyerShipments.tsx:274; src/lib/i18n/roles.ts:283 -->

### t_shipment_dock — Di gerbang Paragon, menunggu giliran <!-- transition:t_shipment_dock -->

- **Jenis langkah:** fakta eksternal (TMS) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:advance`)
- **Dari → ke:** Customs Clearance → At Dock
- **Operator — di mana:** tidak ada yang menekan ini di portal. Tindakan **Jadwal Dermaga** di halaman memperluas bagian jadwal dengan sebuah toast; itu bukan verba ini.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** At Dock — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_dock` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Penugasan dermaga adalah peristiwa penjadwalan gudang/TMS. Halaman pembeli menawarkan toast jadwal dermaga pada status ini; itu bukan verba ini."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:130-146; src/pages-v2/BuyerShipments.tsx:424-429; src/lib/i18n/shipments.ts:152,239-240 -->

### t_shipment_unload — Peti kemas sedang dikosongkan <!-- transition:t_shipment_unload -->

- **Jenis langkah:** fakta eksternal (TMS) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:advance`)
- **Dari → ke:** At Dock → Unloading
- **Operator — di mana:** tidak ada yang menekan ini di portal. Pada At Dock dan Unloading panel samping menawarkan **Mulai proses GR**, yang berpindah ke `/buyer/goods-receipt` — proses milik penerima sendiri.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Unloading — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_unload` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Bongkar muat dicatat gudang melalui TMS. Tindakan Paragon yang mengikutinya adalah penerimaan barang, yang punya alurnya sendiri."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:149-165; src/pages-v2/BuyerShipments.tsx:472-480; src/lib/i18n/shipments.ts:257 -->

### t_shipment_deliver — Barang sudah masuk secara fisik <!-- transition:t_shipment_deliver -->

- **Jenis langkah:** fakta eksternal (TMS) · dimodelkan, tidak aktif (tanpa target)
- **Peran:** otomasi (atom `shipment:advance`)
- **Dari → ke:** Unloading → Delivered (akhir)
- **Operator — di mana:** tidak ada yang menekan ini di portal. Pada Delivered panel samping menawarkan **Lihat GR**, sebuah navigasi ke `/buyer/goods-receipt`.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Delivered — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_shipment_deliver` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** *"Halaman pembeli menampilkan tombol pada beberapa status ini; semuanya navigasi atau toast, tidak pernah verba ini."*
<!-- src: src/services/transitions/flows/shipment.flow.ts:168-184; src/pages-v2/BuyerShipments.tsx:482-489; src/lib/i18n/shipments.ts:258 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Tidak ada di mesin.** Tidak ada tepi tahan, batal, atau ketidaksesuaian pada pengiriman; **Delayed** (Terlambat) adalah proyeksi saat baca dari status tersimpan (lihat §5), dan ketidaksesuaian di dok milik proses penerimaan barang dan ASN (`t_gr_reject` berkaskade ke `t_asn_discrepancy`).
<!-- src: src/services/transitions/flows/shipment.flow.ts:13-14; src/services/data/shipmentDisplayState.ts:126-146; _derived/surfaces.md:12 -->

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku pada | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Delayed / Terlambat (`+N h terlambat`) | digerakkan waktu, diturunkan saat baca | status apa pun yang belum tiba | tidak ada kedatangan aktual dan ETA sebelum tanggal kini yang dinyatakan (31 Agu 2026) | pil status di `/buyer/shipments`, tab **Terlambat** dan KPI |
| Data contoh · shipments | eksternal / provenans | seluruh halaman | selalu — kapabilitas `shipments` tidak berlandaskan sumber apa pun | baris meta `/buyer/shipments` |
<!-- src: src/services/data/shipmentDisplayState.ts:126-170; src/pages-v2/BuyerShipments.tsx:83-98,579; src/services/liveness/registry.ts:222 -->

<!-- section:linked -->
## 6 · Objek terkait

**Apa yang dibaca portal hari ini:** fixture `mockShipments` melalui `useShipments()`. Tidak ada status mesin yang mengatur baris-baris ini — `status` tersimpan adalah literal yang ditulis tangan dan kebetulan memakai delapan nama status alur ini. Baris perwakilan adalah `shp-018` (`ASN-2026-018` terhadap `PO-2025-00118`), tersimpan **Customs Clearance** dan ditampilkan **Delayed** pada tanggal kini yang dinyatakan.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pesanan pembelian | `poId` / `poNumber` | hanya tampilan; PO adalah dokumen S/4HANA |
| Pemberitahuan pengiriman di muka | `asnNumber` | hanya tampilan; ASN pemasok adalah prosesnya sendiri (`advanceShipNotice`) |
| Pemasok | `supplierId` | cakupan tenansi; halaman menggabungkan ke `useSuppliers()` untuk namanya |
| Penerimaan barang | tidak ada melalui kolom — hanya navigasi | **Mulai proses GR** / **Lihat GR** menuju `/buyer/goods-receipt` |
| Dermaga | `dockAssignment` / `dockTime` | hanya tampilan; jadwal dermaga adalah pembacaan fixture yang sama |

Tanggal dalam keluarga ini disesuaikan ulang ke tanggal kini yang dinyatakan oleh `shiftFields`, sehingga hitungan hari stabil antar sesi.
<!-- src: src/data/mockShipments.ts:47-68,510-520; src/services/data/fixturePresent.ts:364; src/pages-v2/BuyerShipments.tsx:156,453 -->

<!-- section:history -->
## 7 · Riwayat status

Tidak ada. Riwayat status adalah urutan `TransitionEvent` yang ditulis dispatcher, dan tidak ada yang mendispatch verba pengiriman: entitasnya tidak punya target perintah, sehingga dispatch apa pun yang menyebut `shipment` ditolak sebagai `UNKNOWN_ENTITY` sebelum sebuah peristiwa dapat ditulis. Garis waktu di panel samping digambar dari status dan tanggal tersimpan, bukan dari peristiwa.

| Waktu | Dari → ke | Pelaku (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| — | — | — | tidak ada yang mendispatch | tidak ada peristiwa |
<!-- src: src/services/transitions/dispatcher.ts:548; src/pages-v2/BuyerShipments.tsx:276-365 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Sebuah tombol di panel pengiriman tampak menawarkan salah satu langkah ini | labelnya **Kirim pengingat ke pemasok**, **Lacak pengiriman**, **Hubungi kurir**, **Mulai proses GR**, atau **Lihat GR** | ini halaman hanya-baca: tiga yang pertama membuka toast bahwa kemampuannya belum tersedia, dua terakhir berpindah ke penerimaan barang; tindakan memindahkan pengiriman adalah milik TMS | tidak ada yang perlu diselesaikan di portal; tonggaknya datang dari TMS saat INT-TMS-01 hadir |
| — (belum dapat terjadi) | `MODULE_INACTIVE:SHP` | alur ini belum punya target perintah, sehingga dispatch buatan tangan ditolak `UNKNOWN_ENTITY` sebelum pemeriksaan modul berjalan; setelah tersambung, menonaktifkan modul Pengiriman & ASN menolak setiap verba dengan nama ini | tidak ada yang perlu dilakukan sekarang; sakelar modul ada di `/buyer/platform/modules/admin` |
<!-- src: src/pages-v2/BuyerShipments.tsx:434-506; src/lib/i18n/shipments.ts:235-259 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| all | — | — | semua — tidak ada fixture — dimodelkan, tidak aktif. Baris di `/buyer/shipments` adalah fixture tampilan yang tidak diatur status mesin mana pun; tidak ada yang dapat dipindahkan antar status. |
<!-- src: src/services/transitions/flows/shipment.flow.ts:9-10; _derived/guidefacts.json (shipment.fixtures = "no store") -->
