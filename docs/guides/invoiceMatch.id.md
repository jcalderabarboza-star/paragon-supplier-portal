---
entity: invoiceMatch
locale: id
title: Pencocokan 3 arah faktur (substrat)
wired: false
owner: substrate
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_invmatch_await_gr
  - t_invmatch_matched
  - t_invmatch_qty_variance
  - t_invmatch_price_variance
---

<!-- section:summary -->
## 1 · Apa proses ini

Pemeriksaan tiga arah di balik sebuah tagihan: apa yang dipesan, apa yang datang, dan berapa yang ditagihkan. Inilah sebabnya tagihan yang keliru tertangkap sebelum uang berpindah, bukan sesudahnya. Pencocokan dimodelkan sebagai mesin kecilnya sendiri, ortogonal terhadap siklus hidup faktur: dimulai di **Pending**, dapat menunggu di **Pending GR** selagi belum ada penerimaan barang, dan menetap pada salah satu dari tiga verdict — **Matched** (satu-satunya akhir), **Qty Mismatch**, atau **Price Variance**. Dua status varians tidak punya sisi pencocokan ulang dan sengaja bukan akhir.

**Proses ini dimodelkan tetapi tidak aktif.** Tidak ada target perintah di balik `invoiceMatch`, sehingga tak satu pun dari empat verbanya dapat terpicu; dispatch yang menyebut entitas ini ditolak `UNKNOWN_ENTITY` sebelum event ada. Setiap verba dinyatakan terhitung dan membawa atom otomasi `invoice:match`, yang tidak dipegang jalur manusia mana pun. Yang nyata adalah **verdict**-nya, dan ia dihasilkan di tempat lain: ketika penerimaan barang dicatat (`t_gr_post`), platform menurunkan verdict dari purchase order, penerimaan, dan setiap faktur Submitted pada PO yang sama, menuliskannya pada faktur sebagai `matchStatus`, dan memicu langkah header faktur sendiri `t_invoice_match` hanya bila verdict-nya `Matched`. Verdict varians ditulis dan faktur tetap Submitted — no-op yang jujur. Panduan faktur menjelaskan kaskade itu; panduan ini menjelaskan kosakata yang ditulisnya.

Kosakata itulah yang dilihat petugas keuangan. Di `/buyer/invoices` kolom "Pencocokan 3 arah" dan bagian di drawer menampilkan salah satu dari lima nilai dengan penjelasan satu baris: "Pencocokan belum dimulai." (Pending), "Menunggu pencatatan penerimaan barang di SAP sebelum pencocokan dapat selesai." (Pending GR), "Kuantitas + harga PO, GR, dan faktur semuanya cocok." (Matched), "Kuantitas yang dikirim tidak cocok dengan kuantitas yang difakturkan. Nota kredit diperlukan." (Qty Mismatch), "Harga satuan faktur melebihi harga PO di atas ambang toleransi." (Price Variance). Header faktur sendiri hanya boleh maju dari Submitted ke Matched bila sumbu ini berbunyi `Matched` — hook `invoice_rollup_matched` pada flow faktur membaca kolom yang sama, sehingga header diturunkan dari pencocokan, tidak pernah ditegaskan di atasnya.

Penanda kejujuran: faktur demo adalah fixture **SIMULASI**; faktur yang dibuat saat runtime dimulai di `Pending` dan mencapai verdict hanya bila penerimaan pada PO-nya dicatat; `Pending GR` hanya muncul pada baris seed, karena langkah yang seharusnya menuliskannya adalah salah satu dari empat verba yang belum tersambung di sini. Toleransi harga adalah placeholder sementara **1%**, bukan kebijakan hutang usaha. Pemasangan berjalan satu arah saja, penerimaan → faktur; faktur yang dikirim setelah penerimaannya sudah dicatat tidak dicocokkan oleh apa pun, dan penerimaan berikutnya pada PO yang sama menimpa verdict sebelumnya tanpa event.

<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:304-403; src/services/transitions/invoiceRollup.ts:15-54; src/services/transitions/invoiceRollup.ts:56-110; src/services/data/mock/MockCommandService.ts:2745-2886; src/services/transitions/cascades.ts:31-38; src/services/transitions/flows/invoice.flow.ts:76-94; src/services/transitions/policies.ts:151-164; src/services/transitions/dispatcher.ts:548; src/lib/i18n/buyerInvoices.ts:306-315; src/services/data/types.ts:617-622; _derived/surfaces.md:23 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | Pending → Pending GR | digerakkan sistem · dimodelkan, tidak aktif (tanpa target) | automation (`invoice:match`) | `t_invmatch_await_gr` |
| 2 | Pending, Pending GR → Matched (terminal) | digerakkan sistem · dimodelkan, tidak aktif (tanpa target) | automation (`invoice:match`) | `t_invmatch_matched` |
| 3 | Pending, Pending GR → Qty Mismatch | digerakkan sistem · dimodelkan, tidak aktif (tanpa target) | automation (`invoice:match`) | `t_invmatch_qty_variance` |
| 4 | Pending, Pending GR → Price Variance | digerakkan sistem · dimodelkan, tidak aktif (tanpa target) | automation (`invoice:match`) | `t_invmatch_price_variance` |

**Percabangan**

- **Di Pending dan di Pending GR:** tiga verdict adalah satu keputusan dengan tiga hasil, diambil dalam urutan ini oleh derivasi yang dikirimkan: `t_invmatch_qty_variance` — automation — ketika penerimaan yang dicatat membawa kuantitas yang ditolak; `t_invmatch_matched` — automation — ketika jumlah yang difakturkan berada dalam 1% dari Σ(kuantitas terkonfirmasi × harga satuan) pada purchase order; `t_invmatch_price_variance` — automation — selainnya (termasuk PO yang nilai harapannya nol). `t_invmatch_await_gr` — automation — ketika belum ada penerimaan; dinyatakan, dan tidak ditulis oleh apa pun saat runtime.
- **Di Qty Mismatch dan Price Variance:** tanpa jalan keluar. Mesin ini sengaja tidak punya sisi pencocokan ulang; penerimaan berikutnya menimpa verdict yang tersimpan secara langsung, di luar mesin ini.

<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:324-403; src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:94-99 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_invmatch_await_gr — Menunggu penerimaan barang <!-- transition:t_invmatch_await_gr -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** automation (atom `invoice:match`; tanpa jalur manusia)
- **Dari → ke:** Pending → Pending GR
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini; tidak ada yang menekannya dan tidak ada yang memicunya. Tagihannya belum bisa diperiksa sebelum barangnya tercatat masuk — ini adalah masa tunggu, ditampilkan terang-terangan alih-alih tampak seperti mandek.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Pending GR — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_invmatch_await_gr` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** satu-satunya baris yang berbunyi **Pending GR** adalah seed (`inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`); faktur yang dibuat saat runtime tetap di **Pending** ("Pencocokan belum dimulai.") sampai penerimaan pada PO-nya dicatat, karena langkah ini belum tersambung.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:333-350; src/services/data/mock/MockCommandService.ts:442; src/services/data/mock/fixtures/invoices.ts:50; src/services/data/mock/fixtures/invoices.ts:80; src/services/data/mock/fixtures/invoices.ts:195; src/lib/i18n/buyerInvoices.ts:309-311 -->

### t_invmatch_matched — Pesanan, penerimaan, dan tagihan sejalan <!-- transition:t_invmatch_matched -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** automation (atom `invoice:match`; tanpa jalur manusia)
- **Dari → ke:** Pending, Pending GR → Matched (terminal)
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini. Verdict diturunkan oleh kaskade pencatatan penerimaan: penerima mencatat penerimaan barang di `/buyer/goods-receipt` (**Post to SAP**), platform menulis `Matched` pada setiap faktur Submitted di PO yang sama yang jumlahnya berada dalam 1% dari nilai terkonfirmasi PO, dan memicu `t_invoice_match` milik faktur. Tidak ada lagi yang menghalangi pembayaran; petugas keuangan lalu melihat **Setujui untuk pembayaran**.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Matched — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_invmatch_matched` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** verba ini tidak pernah terpicu; nilai yang disebutnya ditulis langsung pada faktur oleh resolver kaskade. Kemajuan header faktur dijaga oleh `invoice_rollup_matched`, yang membaca kolom yang sama ("match axis is 'Qty Mismatch', not 'Matched'"). Toleransi 1% adalah placeholder.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:351-367; src/services/transitions/invoiceRollup.ts:26-54; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/policies.ts:151-164; src/lib/i18n/buyerInvoices.ts:307-308 -->

### t_invmatch_qty_variance — Ditagih lebih dari yang diterima <!-- transition:t_invmatch_qty_variance -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** automation (atom `invoice:match`; tanpa jalur manusia)
- **Dari → ke:** Pending, Pending GR → Qty Mismatch
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini. Kaskade menulis `Qty Mismatch` ketika penerimaan yang dicatat membawa kuantitas yang ditolak; faktur tetap **Submitted** (label pembeli **Menunggu Pencocokan**) dan drawer berbunyi "Kuantitas yang dikirim tidak cocok dengan kuantitas yang difakturkan. Nota kredit diperlukan." Seseorang harus memastikan hitungan mana yang benar; jalur manusianya adalah **Sengketakan** di `/buyer/invoices`.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Qty Mismatch — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_invmatch_qty_variance` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** verdict varians adalah no-op yang jujur pada header faktur — tidak ada yang maju dan tidak ada yang ditolak; petugas keuangan yang memutuskan. Tidak ada sisi pencocokan ulang; penerimaan berikutnya pada PO yang sama menimpa verdict tanpa event.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:368-384; src/services/transitions/invoiceRollup.ts:45-50; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:41; src/lib/i18n/buyerInvoices.ts:312-313 -->

### t_invmatch_price_variance — Harga di atas kesepakatan <!-- transition:t_invmatch_price_variance -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** automation (atom `invoice:match`; tanpa jalur manusia)
- **Dari → ke:** Pending, Pending GR → Price Variance
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini. Kaskade menulis `Price Variance` ketika penerimaan tidak punya penolakan tetapi jumlah yang difakturkan berbeda dari Σ(kuantitas terkonfirmasi × harga satuan) lebih dari 1% — atau ketika nilai harapan itu nol. Faktur tetap **Submitted**; drawer berbunyi "Harga satuan faktur melebihi harga PO di atas ambang toleransi." Percakapan itu milik pembelian, bukan keuangan.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Price Variance — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_invmatch_price_variance` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** derivasi yang dikirimkan adalah uji relatif atas seluruh jumlah, dua arah, bukan perbandingan harga satuan per baris seperti yang disiratkan kalimat penjelasannya; dan faktur yang ditagih terlalu rendah di luar 1% juga mendarat di sini. Tidak diukur lebih jauh dari fungsinya sendiri.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:385-401; src/services/transitions/invoiceRollup.ts:45-54; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:155; src/lib/i18n/buyerInvoices.ts:314-315 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Satu keputusan (di Pending / Pending GR), diambil oleh kaskade pencatatan penerimaan, bukan oleh mesin ini.** Penerimaan membawa kuantitas yang ditolak — **Kapan:** ada baris inspeksi dengan `qtyRejected > 0` → Qty Mismatch. Jumlah dalam toleransi — **Kapan:** |difakturkan − harapan| ⁄ harapan ≤ 0,01 → Matched, dan header faktur maju. Selainnya — **Kapan:** selisih melebihi 1%, atau nilai harapan PO nol → Price Variance. Cabang varians membiarkan faktur Submitted; jalur pengecualian manusianya adalah **Sengketakan** pada faktur.
- **Masa tunggu (di Pending).** `t_invmatch_await_gr` dinyatakan untuk "belum ada penerimaan" dan tidak ditulis oleh apa pun; faktur runtime berbunyi Pending sampai penerimaan dicatat.
- **Tanpa pencocokan ulang.** Qty Mismatch dan Price Variance tidak punya jalan keluar di mesin. Penerimaan kedua pada PO yang sama menimpa verdict yang tersimpan; menyelesaikan sengketa mengembalikan faktur ke Submitted dengan verdict sebelumnya.

<!-- src: src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:94-104; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/flows/invoiceMatch.flow.ts:329-331 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Verdict pencocokan 3 arah — Pending / Pending GR / Matched / Qty Mismatch / Price Variance | diturunkan (ditulis oleh kaskade pencatatan penerimaan; di-seed pada fixture) | faktur, dalam status apa pun | Pending pada faktur runtime; Pending GR pada baris Submitted seed; verdict ketika penerimaan pada PO dicatat | kolom "Pencocokan 3 arah" dan bagian drawer di `/buyer/invoices` dengan penjelasan satu barisnya; ubin "Ringkasan Pencocokan 3 Arah" di tab Analitik Belanja |
| Ditulis — belum tersambung | penanda kejujuran | flow itu sendiri | selalu | `/buyer/process-flows`, pada setiap langkah `invoiceMatch` |

<!-- src: src/lib/i18n/buyerInvoices.ts:245; src/lib/i18n/buyerInvoices.ts:306-315; src/pages-v2/BuyerInvoices.tsx:955; src/lib/i18n/processFlows.ts:186 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Apa yang dibaca portal hari ini:** kolom `matchStatus` pada faktur, lewat pembacaan faktur. Tidak ada entitas pencocokan, tidak ada store, dan tidak ada id sendiri. Faktur perwakilan: `inv-fir-0325` (INV-2026-FIR-0325, Submitted, status pencocokan Pending GR) — satu-satunya pasangan seed yang penerimaannya (GR-2026-012 pada PO-2025-00104) menghasilkan `Matched` saat dicatat.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| `matchStatus` faktur | entitas yang sama | satu-satunya tempat verdict berada; bertipe `InvoiceMatchStatus`, tepat lima status mesin ini |
| Purchase order `PO-2025-00104` | `poNumber` faktur = `poNumber` PO | nilai harapan adalah Σ(`confirmedQty` × `unitPrice`) atas barisnya (200 KG × 2.700.000 = 540.000.000) |
| Penerimaan barang `GR-2026-012` | `poNumber` penerimaan = `poNumber` faktur; `inspectionResults[].qtyRejected` penerimaan | penolakan menentukan Qty Mismatch; pemasangan hanya penerimaan → faktur Submitted |
| Header faktur `t_invoice_match` | hook `invoice_rollup_matched` membaca `matchStatus` | header hanya maju pada `Matched` |

<!-- src: src/services/data/types.ts:617-622; src/services/transitions/invoiceRollup.ts:112-177; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/data/mock/fixtures/invoices.ts:195; src/services/transitions/policies.ts:151-164 -->

<!-- section:history -->
## 7 · Riwayat status

Tidak ada untuk mesin ini. Tidak ada yang mendispatch verba `invoiceMatch` — entitas ini tidak punya target perintah, sehingga dispatch yang menyebutnya ditolak `UNKNOWN_ENTITY` sebelum event ada. Satu-satunya jejak verdict adalah event `t_invoice_match` milik faktur (pada verdict `Matched`), yang `causationId`-nya adalah correlationId pencatatan penerimaan; verdict varians tidak meninggalkan event sama sekali.

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| — | — | — | tidak ada yang mendispatch | tidak ada event `t_invmatch_*`; lihat panduan faktur untuk `t_invoice_match` |

<!-- src: src/services/transitions/dispatcher.ts:548; src/services/data/mock/MockCommandService.ts:2869-2880 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Kolom pencocokan berbunyi Pending atau Pending GR lama setelah faktur dikirim | kolom "Pencocokan 3 arah" di `/buyer/invoices` | belum ada penerimaan pada PO itu yang dicatat sejak saat itu; atau penerimaan dicatat **sebelum** faktur dikirim (pemasangan berjalan satu arah) | catat penerimaan di `/buyer/goods-receipt`; bila sudah dicatat, tidak ada jalur pencocokan ulang hari ini |
| Kolom berbunyi Qty Mismatch atau Price Variance dan faktur tetap Menunggu Pencocokan | penjelasan drawer menyebut varians | verdict ditulis dan header dengan jujur tidak maju | keuangan menyengketakan faktur atau menunggu penerimaan yang dikoreksi pada PO yang sama |
| Verdict berubah tanpa ada yang bertindak | kolom berpindah di antara dua pembacaan | penerimaan berikutnya pada PO yang sama menimpanya (tanpa event) | periksa penerimaan pada PO itu |
| Sesuatu mencoba memicu `t_invmatch_*` | penolakan `UNKNOWN_ENTITY:invoiceMatch` | mesin ini tidak punya target perintah | bukan kesalahan; verdict ditulis oleh kaskade pencatatan penerimaan |
| — (belum dapat terjadi) | `MODULE_INACTIVE:INV` | alur ini belum punya target perintah, sehingga dispatch buatan tangan ditolak `UNKNOWN_ENTITY` sebelum pemeriksaan modul berjalan; setelah tersambung, menonaktifkan modul Faktur & pembayaran menolak setiap verba dengan nama ini | tidak ada yang perlu dilakukan sekarang; sakelar modul ada di `/buyer/platform/modules/admin` |

<!-- src: src/services/transitions/invoiceRollup.ts:56-110; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/dispatcher.ts:548 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| all | — | — | semua — tidak ada fixture — dimodelkan, tidak aktif. Lima nilai hanya muncul sebagai `matchStatus` pada faktur: Pending pada `inv-brl-0055` (Draft) dan pada faktur runtime mana pun; Pending GR pada `inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`; Matched pada baris Approved dan Payment Released; Qty Mismatch pada `inv-brl-0043`; Price Variance pada `inv-smpl-1180`. Untuk menghasilkan `Matched` saat runtime, catat GR-2026-012 dengan `inv-fir-0325` berstatus Submitted. |

<!-- src: src/services/data/mock/fixtures/invoices.ts:25-233; src/services/data/mock/MockCommandService.ts:442; _derived/guidefacts.json (invoiceMatch.fixtures = "no store") -->
