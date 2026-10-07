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

**Proses ini dimodelkan tetapi tidak aktif.** Tidak ada target perintah di balik `invoiceMatch`, sehingga tak satu pun dari empat verbanya dapat terpicu; dispatch yang menyebut entitas ini ditolak `UNKNOWN_ENTITY` sebelum event ada. Setiap verba dinyatakan terhitung dan membawa atom otomasi `invoice:match`, yang tidak dipegang jalur manusia mana pun. Yang nyata adalah **verdict**-nya, dan ia dihasilkan di tempat lain: pada tiga peristiwa — penerimaan barang dicatat (`t_gr_post`), faktur diajukan (`t_invoice_submit`), dan sengketa diselesaikan (`t_invoice_resolve`) — platform menghitung ulang verdict setiap faktur Submitted pada PO itu dari purchase order, semua penerimaan padanya yang sedang atau sudah dicatat, dan semua faktur padanya, menuliskannya pada faktur sebagai `matchStatus` bersama angka yang mendasarinya (`matchBasis`), dan memicu langkah header faktur sendiri `t_invoice_match` hanya bila verdict-nya `Matched`. Verdict lain ditulis dan faktur tetap Submitted — no-op yang jujur. Bila tidak ada penerimaan pada PO yang sedang atau sudah dicatat, tidak ada yang ditulis dan faktur tetap Pending. Panduan faktur menjelaskan kaskade itu; panduan ini menjelaskan kosakata yang ditulisnya.

Kosakata itulah yang dilihat petugas keuangan. Di `/buyer/invoices` kolom "Pencocokan 3 arah" menampilkan salah satu dari lima nilai dan bagian di drawer menjelaskannya. Verdict yang ditulis oleh pencocokan menampilkan penyebabnya dan empat angka ("Dipesan (kuantitas dikonfirmasi × harga PO)", "Diterima dan disetujui", "Sudah ditagih", "Faktur ini"): "Faktur berada dalam nilai yang diterima dan disetujui pada pesanan pembelian, setelah faktur sebelumnya." (Matched); "Ditagih melebihi yang diterima dan disetujui: … ditagih dan … dapat dibayar atas yang diterima." atau "Faktur sebelumnya pada pesanan pembelian ini sudah menagih yang diterima: … sudah ditagih dan … tersisa untuk dibayar." (Qty Mismatch); "Faktur melebihi seluruh pesanan pada harga pesanan pembelian: … ditagih terhadap … dipesan. Faktur memuat total tanpa baris, sehingga portal tidak dapat menyebutkan harga atau kuantitas mana yang berbeda." (Price Variance). Bila total yang dinyatakan PO berbeda dari jumlah baris-barisnya sendiri lebih dari 1%, bagian itu menambahkan "Pesanan pembelian menyatakan total …, tetapi baris-barisnya berjumlah …; pencocokan memakai baris." Baris seed tidak memuat angka dan berbunyi "Tercatat cocok. Baris ini tidak memuat angka pencocokan." (Matched), "Tercatat sebagai ketidaksesuaian kuantitas. Baris ini tidak memuat angka pencocokan." (Qty Mismatch), atau "Tercatat sebagai selisih harga. Baris ini tidak memuat angka pencocokan." (Price Variance). Sebelum ada verdict: "Belum dicocokkan: belum ada penerimaan yang diposting untuk pesanan pembelian ini." (Pending), "Menunggu pencatatan penerimaan barang di SAP sebelum pencocokan dapat selesai." (Pending GR). Header faktur sendiri hanya boleh maju dari Submitted ke Matched bila sumbu ini berbunyi `Matched` — hook `invoice_rollup_matched` pada flow faktur membaca kolom yang sama, sehingga header diturunkan dari pencocokan, tidak pernah ditegaskan di atasnya.

Penanda kejujuran: faktur demo adalah fixture **SIMULASI**; faktur yang dibuat saat runtime dimulai di `Pending` dan mencapai verdict saat pertama kali pencocokan berjalan untuk PO-nya dengan penerimaan padanya yang sedang atau sudah dicatat; `Pending GR` hanya muncul pada baris seed, karena langkah yang seharusnya menuliskannya adalah salah satu dari empat verba yang belum tersambung di sini. Toleransinya **1%** dari nilai yang dipesan, placeholder sementara, bukan kebijakan hutang usaha. Pencocokan berjalan dari kedua sisi: pencatatan penerimaan menemukan fakturnya, dan faktur yang dikirim setelah penerimaannya dicatat dicocokkan oleh pengajuannya sendiri. Verdict dihitung ulang setiap kali dari setiap penerimaan yang sedang atau sudah dicatat dan setiap faktur pada PO itu, sehingga faktur yang ditahan dibebaskan oleh penerimaan berikutnya dan sengketa yang diselesaikan dicocokkan lagi; verdict selain `Matched` tidak menulis event.

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

- **Di Pending dan di Pending GR:** tiga verdict adalah satu keputusan dengan tiga hasil, diambil dalam urutan ini oleh derivasi yang dikirimkan: `t_invmatch_matched` — automation — ketika jumlah yang difakturkan muat dalam apa yang diterima dan disetujui pada purchase order, dikurangi apa yang sudah diklaim faktur sebelumnya padanya (toleransi 1% dari nilai yang dipesan); `t_invmatch_price_variance` — automation — ketika jumlahnya melebihi seluruh pesanan pada harga PO; `t_invmatch_qty_variance` — automation — selainnya: melebihi yang diterima dan disetujui, atau sudah diklaim faktur sebelumnya. `t_invmatch_await_gr` — automation — ketika belum ada penerimaan; dinyatakan, dan tidak ditulis oleh apa pun saat runtime.
- **Di Qty Mismatch dan Price Variance:** tanpa jalan keluar di mesin, yang sengaja tidak punya sisi pencocokan ulang. Meski begitu, verdict yang tersimpan dihitung ulang, di luar mesin ini, setiap kali pencocokan berjalan untuk PO itu selama faktur berstatus Submitted.

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
- **Kejujuran:** satu-satunya baris yang berbunyi **Pending GR** adalah seed (`inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`); faktur yang dibuat saat runtime tetap di **Pending** ("Belum dicocokkan: belum ada penerimaan yang diposting untuk pesanan pembelian ini.") sampai pencocokan berjalan dengan penerimaan pada PO-nya yang sedang atau sudah dicatat, karena langkah ini belum tersambung.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:333-350; src/services/data/mock/MockCommandService.ts:442; src/services/data/mock/fixtures/invoices.ts:50; src/services/data/mock/fixtures/invoices.ts:80; src/services/data/mock/fixtures/invoices.ts:195; src/lib/i18n/buyerInvoices.ts:309-311 -->

### t_invmatch_matched — Pesanan, penerimaan, dan tagihan sejalan <!-- transition:t_invmatch_matched -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** automation (atom `invoice:match`; tanpa jalur manusia)
- **Dari → ke:** Pending, Pending GR → Matched (terminal)
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini. Verdict diturunkan oleh kaskade pencocokan, yang berjalan ketika penerimaan barang dicatat di `/buyer/goods-receipt` (**Post to SAP**), ketika faktur diajukan, dan ketika sengketa diselesaikan: platform menulis `Matched` pada setiap faktur Submitted di PO yang sama yang jumlahnya muat dalam apa yang diterima dan disetujui, dikurangi apa yang sudah diklaim faktur sebelumnya pada PO itu, dan memicu `t_invoice_match` milik faktur. Faktur yang nilainya kurang dari yang dapat dibayar tetap cocok (faktur parsial diperbolehkan); faktur diambil dari yang tertua (tanggal pengajuan, lalu nomor faktur) dan faktur yang cocok mengklaim jumlahnya sebelum faktur berikutnya dilihat. Tidak ada lagi yang menghalangi pembayaran; petugas keuangan lalu melihat **Setujui untuk pembayaran**.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Matched — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_invmatch_matched` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** verba ini tidak pernah terpicu; nilai yang disebutnya ditulis langsung pada faktur oleh resolver kaskade. Kemajuan header faktur dijaga oleh `invoice_rollup_matched`, yang membaca kolom yang sama ("match axis is 'Qty Mismatch', not 'Matched'"). Angka yang mendasari verdict disimpan bersamanya (`matchBasis`). Toleransi 1%, diambil dari nilai yang dipesan, adalah placeholder.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:351-367; src/services/transitions/invoiceRollup.ts:26-54; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/policies.ts:151-164; src/lib/i18n/buyerInvoices.ts:307-308 -->

### t_invmatch_qty_variance — Ditagih lebih dari yang diterima <!-- transition:t_invmatch_qty_variance -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** automation (atom `invoice:match`; tanpa jalur manusia)
- **Dari → ke:** Pending, Pending GR → Qty Mismatch
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini. Kaskade menulis `Qty Mismatch` karena dua penyebab: faktur menagih lebih dari yang diterima dan disetujui pada PO, atau faktur itu muat dalam yang diterima tetapi faktur sebelumnya pada PO itu sudah mengklaimnya. Faktur tetap **Submitted** (label pembeli **Menunggu Pencocokan**) dan drawer berbunyi "Ditagih melebihi yang diterima dan disetujui: …" atau "Faktur sebelumnya pada pesanan pembelian ini sudah menagih yang diterima: …", beserta empat angkanya. Kuantitas yang ditolak tidak dapat dibayar, tetapi penerimaan yang memuat penolakan tidak dengan sendirinya menghasilkan verdict ini: faktur atas bagian yang disetujui tetap cocok. Seseorang harus memastikan hitungan mana yang benar; jalur manusianya adalah **Sengketakan** di `/buyer/invoices`.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Qty Mismatch — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_invmatch_qty_variance` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** verdict varians adalah no-op yang jujur pada header faktur — tidak ada yang maju dan tidak ada yang ditolak; petugas keuangan yang memutuskan. Mesin ini tidak punya sisi pencocokan ulang, tetapi verdict yang tersimpan dihitung ulang setiap kali pencocokan berjalan untuk PO itu, sehingga penerimaan berikutnya yang mencakup faktur itu membebaskannya. Dari dua faktur atas barang yang sama, yang lebih tua cocok dan yang lain ditahan di sini.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:368-384; src/services/transitions/invoiceRollup.ts:45-50; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:41; src/lib/i18n/buyerInvoices.ts:312-313 -->

### t_invmatch_price_variance — Harga di atas kesepakatan <!-- transition:t_invmatch_price_variance -->

- **Jenis langkah:** digerakkan sistem · dimodelkan, tidak aktif (tanpa target)
- **Peran:** automation (atom `invoice:match`; tanpa jalur manusia)
- **Dari → ke:** Pending, Pending GR → Price Variance
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini. Kaskade menulis `Price Variance` hanya dalam satu keadaan: jumlah yang difakturkan melebihi seluruh pesanan, Σ(kuantitas terkonfirmasi × harga satuan), lebih dari 1% dari nilai itu, berapa pun yang sudah diterima atau sudah difakturkan. Faktur tetap **Submitted**; drawer berbunyi "Faktur melebihi seluruh pesanan pada harga pesanan pembelian: … ditagih terhadap … dipesan. Faktur memuat total tanpa baris, sehingga portal tidak dapat menyebutkan harga atau kuantitas mana yang berbeda." Percakapan itu milik pembelian, bukan keuangan.
- **Operator — lakukan:** tidak ada di portal — langkah ini dimodelkan, tidak aktif.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Price Variance — tidak dapat dicapai; tidak ada jalur pengiriman.
- **Penguji — konfirmasi:** tidak ada yang dikonfirmasi; status mesin tidak ditampilkan.
- **Penguji — peristiwa pemicu:** `t_invmatch_price_variance` (tidak pernah dipancarkan)
- **Pemeriksaan yang dapat menolak:** tidak ada yang dideklarasikan; dispatcher akan menjawab `UNKNOWN_ENTITY` sebelum pemeriksaan apa pun berjalan.
- **Glosarium:** `UNKNOWN_ENTITY`.
- **Kejujuran:** derivasi yang dikirimkan menguji total faktur terhadap nilai pesanan, satu arah saja; ini bukan perbandingan harga satuan per baris, dan kalimat penjelasannya menyatakan demikian. Faktur yang nilainya kurang dari yang dapat dibayar tidak mendarat di sini — faktur itu cocok.
<!-- src: src/services/transitions/flows/invoiceMatch.flow.ts:385-401; src/services/transitions/invoiceRollup.ts:45-54; src/services/data/mock/MockCommandService.ts:2869-2877; src/services/data/mock/fixtures/invoices.ts:155; src/lib/i18n/buyerInvoices.ts:314-315 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Satu keputusan (di Pending / Pending GR), diambil oleh kaskade pencocokan, bukan oleh mesin ini.** Tiga angka pada harga satuan PO itu sendiri: dipesan = Σ kuantitas terkonfirmasi × harga satuan; diterima = Σ kuantitas yang disetujui × harga satuan atas setiap penerimaan pada PO yang sedang atau sudah dicatat, dengan kuantitas yang disetujui digabung per material dan setiap baris PO dibatasi pada kuantitas terkonfirmasinya; sudah difakturkan = jumlah faktur lain pada PO itu yang berstatus Matched, Approved, Releasing Payment, Payment Released atau Remittance Received. Toleransinya 1% dari nilai yang dipesan. Dalam nilai yang dapat dibayar — **Kapan:** dipesan > 0 dan difakturkan ≤ diterima − sudah difakturkan + toleransi → Matched, dan header faktur maju. Melebihi pesanan — **Kapan:** difakturkan > dipesan + toleransi → Price Variance. Sudah diklaim — **Kapan:** faktur sebelumnya sudah mengklaim sesuatu dan difakturkan ≤ diterima + toleransi → Qty Mismatch. Selainnya — **Kapan:** faktur menagih lebih dari yang diterima dan disetujui → Qty Mismatch. Cabang Qty Mismatch dan Price Variance membiarkan faktur Submitted; jalur pengecualian manusianya adalah **Sengketakan** pada faktur.
- **Masa tunggu (di Pending).** `t_invmatch_await_gr` dinyatakan untuk "belum ada penerimaan" dan tidak ditulis oleh apa pun; faktur runtime berbunyi Pending selama belum ada penerimaan pada PO-nya yang sedang atau sudah dicatat.
- **Pencocokan ulang, di luar mesin.** Qty Mismatch dan Price Variance tidak punya jalan keluar di mesin. Verdict yang tersimpan dihitung ulang setiap kali pencocokan berjalan untuk PO itu — penerimaan dicatat, faktur diajukan, sengketa diselesaikan — sehingga perhitungan pertama dan terakhir sejalan; menyelesaikan sengketa mengembalikan faktur ke Submitted dan mencocokkannya lagi.

<!-- src: src/services/transitions/invoiceRollup.ts:33-54; src/services/transitions/invoiceRollup.ts:94-104; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/flows/invoiceMatch.flow.ts:329-331 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Verdict pencocokan 3 arah — Pending / Pending GR / Matched / Qty Mismatch / Price Variance | diturunkan (ditulis oleh kaskade pencocokan; di-seed pada fixture) | faktur, dalam status apa pun | Pending pada faktur runtime; Pending GR pada baris Submitted seed; verdict setiap kali pencocokan berjalan untuk PO itu (penerimaan dicatat, faktur diajukan, sengketa diselesaikan) | kolom "Pencocokan 3 arah" dan bagian drawer di `/buyer/invoices` dengan kalimat penyebab dan empat angka (satu kalimat "Tercatat …" pada baris seed tanpa angka); ubin "Ringkasan Pencocokan 3 Arah" di tab Analitik Belanja |
| Total PO berbeda dari baris-barisnya | diturunkan | faktur yang memuat angka pencocokan | total yang dinyatakan PO berbeda dari jumlah baris-barisnya sendiri lebih dari 1% | bagian "Pencocokan 3 arah" di drawer: "Pesanan pembelian menyatakan total …, tetapi baris-barisnya berjumlah …; pencocokan memakai baris." |
| Ditulis — belum tersambung | penanda kejujuran | flow itu sendiri | selalu | `/buyer/process-flows`, pada setiap langkah `invoiceMatch` |

<!-- src: src/lib/i18n/buyerInvoices.ts:245; src/lib/i18n/buyerInvoices.ts:306-315; src/pages-v2/BuyerInvoices.tsx:955; src/lib/i18n/processFlows.ts:186 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Apa yang dibaca portal hari ini:** kolom `matchStatus` pada faktur dan, di sampingnya, `matchBasis` (angka yang mendasari verdict hasil perhitungan), lewat pembacaan faktur. Tidak ada entitas pencocokan, tidak ada store, dan tidak ada id sendiri. Faktur perwakilan: `inv-fir-0325` (INV-2026-FIR-0325, Submitted, status pencocokan Pending GR) — satu-satunya pasangan seed yang penerimaannya (GR-2026-012 pada PO-2025-00104) menghasilkan `Matched` saat dicatat.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| `matchStatus` faktur | entitas yang sama | satu-satunya tempat verdict berada; bertipe `InvoiceMatchStatus`, tepat lima status mesin ini |
| `matchBasis` faktur | entitas yang sama | ditulis bersama setiap verdict hasil perhitungan: `orderedValue`, `receivedValue`, `alreadyInvoiced`, `invoiced`, `cause` (`WITHIN`, `EXCEEDS_RECEIVED`, `ALREADY_INVOICED`, `EXCEEDS_ORDER`), `poStatedTotal`, `poLineTotal`; tidak ada pada baris seed |
| Purchase order `PO-2025-00104` | `poNumber` faktur = `poNumber` PO | nilai yang dipesan adalah Σ(`confirmedQty` × `unitPrice`) atas barisnya (200 KG × 2.700.000 = 540.000.000); kuantitas yang diterima dinilai pada harga satuan yang sama |
| Penerimaan barang `GR-2026-012` | `poNumber` penerimaan = `poNumber` faktur; `inspectionResults[].materialCode`, `.qtyAccepted` penerimaan | memuat baris milik PO itu sendiri (FR-MKOV-5510, 200 disetujui, 0 ditolak); kuantitas yang disetujui adalah yang dapat dibayar, dibaca dari setiap penerimaan pada PO yang berstatus Posting to SAP atau Posted to SAP; material yang tidak dimuat PO tidak bernilai apa pun |
| Faktur lain pada PO | `poNumber` yang sama | yang berstatus Matched, Approved, Releasing Payment, Payment Released atau Remittance Received dihitung sebagai sudah difakturkan; Draft, Submitted dan Disputed tidak mengklaim apa pun |
| Header faktur `t_invoice_match` | hook `invoice_rollup_matched` membaca `matchStatus` | header hanya maju pada `Matched` |

<!-- src: src/services/data/types.ts:617-622; src/services/transitions/invoiceRollup.ts:112-177; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/data/mock/fixtures/invoices.ts:195; src/services/transitions/policies.ts:151-164 -->

<!-- section:history -->
## 7 · Riwayat status

Tidak ada untuk mesin ini. Tidak ada yang mendispatch verba `invoiceMatch` — entitas ini tidak punya target perintah, sehingga dispatch yang menyebutnya ditolak `UNKNOWN_ENTITY` sebelum event ada. Satu-satunya jejak verdict adalah event `t_invoice_match` milik faktur (pada verdict `Matched`), yang `causationId`-nya adalah correlationId perintah yang menyebabkannya (pencatatan penerimaan, pengajuan faktur, atau penyelesaian sengketa); verdict Qty Mismatch atau Price Variance tidak meninggalkan event sama sekali.

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| — | — | — | tidak ada yang mendispatch | tidak ada event `t_invmatch_*`; lihat panduan faktur untuk `t_invoice_match` |

<!-- src: src/services/transitions/dispatcher.ts:548; src/services/data/mock/MockCommandService.ts:2869-2880 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Kolom pencocokan berbunyi Pending atau Pending GR lama setelah faktur dikirim | kolom "Pencocokan 3 arah" di `/buyer/invoices` | belum ada penerimaan pada PO itu yang sedang atau sudah dicatat; penerimaan yang sudah diinspeksi tetapi belum dicatat tidak dibaca | catat penerimaan di `/buyer/goods-receipt`; pencocokan berjalan pada pencatatan itu. Faktur yang dikirim setelah penerimaannya dicatat dicocokkan saat diajukan |
| Kolom berbunyi Qty Mismatch atau Price Variance dan faktur tetap Menunggu Pencocokan | penjelasan drawer menyebut penyebabnya dan menampilkan empat angka | verdict ditulis dan header dengan jujur tidak maju | keuangan menyengketakan faktur, atau penerimaan berikutnya pada PO yang sama dicatat — pencocokan berjalan lagi |
| Verdict berubah tanpa ada yang bertindak atas faktur itu | kolom berpindah di antara dua pembacaan | pencocokan berjalan lagi untuk PO itu: penerimaan dicatat, faktur lain diajukan, atau sengketa diselesaikan (tanpa event kecuali verdict barunya `Matched`) | periksa penerimaan dan faktur lain pada PO itu |
| Dari dua faktur atas barang yang sama hanya satu yang Matched | yang lain berbunyi Qty Mismatch, "Faktur sebelumnya pada pesanan pembelian ini sudah menagih yang diterima: …" | faktur diambil dari yang tertua dan faktur yang cocok mengklaim jumlahnya | bukan kesalahan |
| Sesuatu mencoba memicu `t_invmatch_*` | penolakan `UNKNOWN_ENTITY:invoiceMatch` | mesin ini tidak punya target perintah | bukan kesalahan; verdict ditulis oleh kaskade pencocokan |
| — (belum dapat terjadi) | `MODULE_INACTIVE:INV` | alur ini belum punya target perintah, sehingga dispatch buatan tangan ditolak `UNKNOWN_ENTITY` sebelum pemeriksaan modul berjalan; setelah tersambung, menonaktifkan modul Faktur & pembayaran menolak setiap verba dengan nama ini | tidak ada yang perlu dilakukan sekarang; sakelar modul ada di `/buyer/platform/modules/admin` |

<!-- src: src/services/transitions/invoiceRollup.ts:56-110; src/services/data/mock/MockCommandService.ts:2859-2880; src/services/transitions/dispatcher.ts:548 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| all | — | — | semua — tidak ada fixture — dimodelkan, tidak aktif. Lima nilai hanya muncul sebagai `matchStatus` pada faktur: Pending pada `inv-brl-0055` (Draft) dan pada faktur runtime mana pun; Pending GR pada `inv-brl-0051`, `inv-msm-0224`, `inv-mus-0214`, `inv-fir-0325`; Matched pada baris Approved dan Payment Released; Qty Mismatch pada `inv-brl-0043`; Price Variance pada `inv-smpl-1180`. Untuk menghasilkan `Matched` saat runtime, catat GR-2026-012 dengan `inv-fir-0325` berstatus Submitted. |

<!-- src: src/services/data/mock/fixtures/invoices.ts:25-233; src/services/data/mock/MockCommandService.ts:442; _derived/guidefacts.json (invoiceMatch.fixtures = "no store") -->
