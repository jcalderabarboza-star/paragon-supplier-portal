---
entity: goodsReceipt
locale: id
title: Penerimaan barang
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_gr_create
  - t_gr_start_inspection
  - t_gr_hold
  - t_gr_request_retest
  - t_gr_approve
  - t_gr_partial_approve
  - t_gr_reject
  - t_gr_post
---

<!-- section:summary -->
## 1 · Apa proses ini

Catatan Paragon tentang apa yang benar-benar datang dan apakah layak dipakai. Inilah fakta yang menjadi dasar pembayaran keuangan, sehingga kekeliruan di sini akan berubah menjadi perselisihan tagihan di kemudian hari. Penerimaan barang (GR) adalah dokumen **sisi pembeli**: gudang menerima pengiriman masuk atau advance ship notice, memeriksanya baris demi baris, lalu mendisposisinya. Hasil header — Approved, Partially Approved, atau Rejected — **tidak pernah dipilih**; ia digulung (rollup) dari baris-baris yang diinspeksi, dan mesin menurunkan ulang gulungan itu sebelum meloloskan kata kerjanya.

Satu jalur mengerjakan semuanya: **penerimaan** (receiving) pembeli (atom `gr:receive`, `gr:inspect`, `gr:disposition`, `gr:post`). Satu-satunya pintu adalah `/buyer/goods-receipt` (**Penerimaan Barang & Kontrol Kualitas**): tombol **GR Baru** dan footer **Mulai inspeksi** sama-sama membuka wizard empat langkah yang sama — **Pemilihan sumber → Detail penerimaan → Pemeriksaan kualitas → Disposisi & kirim** — yang tombol terakhirnya, **Buat GR**, memicu seluruh rantai sekaligus: buat, mulai inspeksi, disposisi yang digulung, dan (bila dicentang) **Kirim ke SAP**. Pemasok tidak pernah menyentuh GR; pemasok merasakannya lewat ASN, yang ditandai selisih oleh penerimaan yang ditolak atau disetujui sebagian.

Penanda kejujuran: empat belas penerimaan unggulan adalah **fixture TERSIMULASI** dan penanda provenans halaman menyatakannya; **Posting to SAP → Posted to SAP** adalah batas SAP dua tindakan yang nyata di tulang punggung perintah, tetapi "SAP" yang menyelesaikannya adalah mock di memori, yang mencetak nomor dokumen material; `t_gr_hold` terdaftar dan **tidak ada layar yang memicunya** (satu baris `Quality Hold` adalah fixture); tombol footer **Kirim hasil inspeksi**, **Timpa penahanan**, **Lihat di SAP**, **Ekspor**, dan **Hasil Lab** adalah toast yang terus terang menyatakan tidak melakukan apa pun; **pemberitahuan sertifikat** halal pada langkah kualitas memberi tahu penerima ada yang tidak beres tetapi tidak menghentikan penerimaan.

<!-- section:lifecycle -->
## 2 · Perjalanan siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Pending Inspection | tindakan operator · pembuatan | pembeli · penerimaan | `t_gr_create` |
| 2 | Pending Inspection → Under Inspection | tindakan operator (dipicu oleh satu komit wizard) | pembeli · penerimaan | `t_gr_start_inspection` |
| 3 | Under Inspection → Quality Hold | tidak aktif (tanpa pemanggil) | pembeli · penerimaan | `t_gr_hold` |
| 4 | Quality Hold → Under Inspection | tindakan operator | pembeli · penerimaan | `t_gr_request_retest` |
| 5a | Under Inspection → Approved | tindakan operator (digulung) | pembeli · penerimaan | `t_gr_approve` |
| 5b | Under Inspection → Partially Approved | tindakan operator (digulung) · berantai `t_asn_discrepancy` | pembeli · penerimaan | `t_gr_partial_approve` |
| 5c | Under Inspection → Rejected | tindakan operator (digulung) · berantai `t_asn_discrepancy` | pembeli · penerimaan | `t_gr_reject` |
| 6 | Approved, Partially Approved → Posting to SAP ⇒ Posted to SAP | batas SAP (diajukan, lalu diselesaikan) · berantai `t_invoice_match` | pembeli · penerimaan | `t_gr_post` |
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:57-188; src/services/transitions/grRollup.ts:49-72 -->

Terminal: `Rejected` dan `Posted to SAP`. `Quality Hold` sengaja bukan terminal — ia penahanan dengan satu jalan keluar (uji ulang).

**Percabangan**

- **Di Under Inspection:** `t_gr_approve` — penerimaan — saat setiap baris tergulung Accepted; `t_gr_partial_approve` — penerimaan — saat baris-barisnya campuran; `t_gr_reject` — penerimaan — saat setiap baris tergulung Rejected; `t_gr_hold` — penerimaan — tidak pernah dalam praktik (tanpa pemanggil). Penerima tidak memilih di antara tiga yang pertama: wizard membaca baris dan menawarkan satu yang disebut gulungan.
- **Di Approved / Partially Approved:** `t_gr_post` — penerimaan — saat penerima mencentang **Kirim otomatis ke SAP** di wizard, atau kemudian menekan **Kirim ke SAP** di footer penerimaan. Tidak ada jalan keluar lain; penerimaan yang disetujui tetapi tidak pernah diposting tetap di tempatnya.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_gr_create — Buat GR <!-- transition:t_gr_create -->

- **Jenis langkah:** tindakan operator · pembuatan
- **Peran:** pembeli · penerimaan (atom `gr:receive`)
- **Dari → ke:** ∅ → Pending Inspection
- **Operator — di mana:** `/buyer/goods-receipt` → **GR Baru** (kepala halaman) atau **Mulai inspeksi** (footer penerimaan `Pending Inspection`, yang membuka wizard dengan pengiriman penerimaan itu sudah terpilih) → langkah 1 wizard **Pemilihan sumber**: **Pilih kedatangan di dermaga** (daftar pengiriman **At Dock** / **Unloading** ditambah setiap ASN hidup berstatus Submitted / In Transit / Delivered, yang terakhir berlabel "No dock appointment · Scheduled via TMS") atau **Masukkan nomor ASN** (hanya dikenali terhadap penyimpanan ASN hidup). Lalu langkah 2 **Detail penerimaan**, langkah 3 **Pemeriksaan kualitas**, langkah 4 **Disposisi & kirim** → **Buat GR**.
- **Operator — lakukan:** membuka catatan penerimaan untuk kiriman yang sudah sampai di dermaga, agar barangnya tercatat sebelum ada yang menyentuhnya. Di langkah 2 catat **Tanggal Penerimaan**, **Diterima Oleh** (teks bebas), **Lokasi Gudang**, **Catatan** opsional, dan per baris kuantitas **Diterima** dan **Disetujui** (Ditolak diturunkan; alasan penolakan wajib pada setiap baris dengan kuantitas ditolak). Di langkah 3 jawab **Inspeksi Visual** dan **Integritas Kemasan** per baris, ditambah **Pemeriksaan Segel Halal** dan **Pelacakan Lot BPOM** bila master material menyatakan material itu memerlukannya; centang **Sampel lab diperlukan** bila sampel lab diambil.
- **Operator — isi:** `asnReference` (nomor pengiriman atau ASN yang dipilih). Wizard juga mengirim `inspectionResults` (satu baris per item: material, kuantitas diharapkan / diterima / disetujui / ditolak, empat pemeriksaan, alasan penolakan), `receivedDate`, `receivedBy`, `notes`.
- **Penguji — status yang diharapkan:** Pending Inspection — hanya sesaat. Klik **Buat GR** yang sama langsung berlanjut ke `t_gr_start_inspection` dan disposisi yang digulung, sehingga status yang dilihat penguji setelah wizard tertutup adalah Approved / Partially Approved / Rejected (atau Posting to SAP / Posted to SAP dengan kirim otomatis).
- **Penguji — konfirmasi:** baris baru **GR-2026-0xx** (ditetapkan penyimpanan) muncul di puncak daftar dengan nomor ASN dan PO yang dipilih; toast **"GR-… — <disposisi> — <correlationId> tercatat. Disposisi header diturunkan dari baris yang diinspeksi."** (atau toast posting, di bawah). Langkah 4 wizard menampilkan pratinjau hasilnya: **Disposisi Header (diturunkan dari baris)** — "Digulung dari N baris — X disetujui, Y ditolak. Tidak dapat diedit".
- **Penguji — peristiwa pemicu:** `t_gr_create`
- **Pemeriksaan yang dapat menolak:** `gr_create_shipment_received` — pengiriman yang dirujuk harus At Dock, Unloading, atau Delivered, atau rujukannya harus ASN yang ada di penyimpanan ("no arrived shipment or ASN found for …" jika tidak); `gr_inspection_materials_declared` — setiap kode material yang diinspeksi harus dinyatakan oleh pengiriman atau ASN ("UNDECLARED_MATERIAL: … the parent document never declared this material"). Cakupan pembuatan ada di sisi pembeli: pembeli menerima kedatangan pemasok mana pun.
- **Glosarium:** `POLICY_REJECTED`, `MISSING_FIELDS`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`, `UNKNOWN_MATERIAL`, `UNDETERMINED_APPLICABILITY`, `halal.seal`, `bpom.lot`, `BLOCK`.
- **Kejujuran:** **Mulai inspeksi** pada baris `Pending Inspection` unggulan **tidak** memajukan baris itu — wizard selalu membuat penerimaan **baru**, sehingga fixture tetap `Pending Inspection` di samping yang baru. **Masukkan nomor ASN** tidak mengenali nomor pengiriman dermaga (`ASN-2026-0xx`): hanya nomor penyimpanan ASN (`ASN-2025-…`) yang dikenali di sana. Pada langkah kualitas, material yang entri masternya tidak dikenal atau tidak punya penetapan halal / BPOM **memblokir barisnya** ("tidak dapat diinspeksi sampai…"); pemeriksaan wajib yang belum dijawab memblokir di bawah mode bawaan `BLOCK` ("Belum dijawab. Pemeriksaan ini wajib…"). **Pemberitahuan sertifikat halal** ("Sertifikat halal — perlu tindakan." beserta alasannya: tidak ada sertifikat, kedaluwarsa, skema tidak sah, sedang ditinjau) **memberi tahu dan tidak menghentikan**; penerimaan tetap berjalan. Baris penerimaan dan teks `Diterima Oleh` dicatat apa adanya; tidak ada orang yang diselesaikan dari situ.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:58-77; src/services/data/mock/MockCommandService.ts:237-311,313-375; src/components/v2-features/GRInspectionWizard.tsx:226-230,650-670,910-916,951-1037,1230-1330,1415-1463,1524-1583; src/pages-v2/BuyerGoodsReceipt.tsx:480-503,767-808; src/services/query/commandHooks.ts:615-635; src/lib/i18n/goodsReceipt.ts:422-508; src/lib/i18n.ts:1013-1019 -->

### t_gr_start_inspection — Mulai inspeksi <!-- transition:t_gr_start_inspection -->

- **Jenis langkah:** tindakan operator (dipicu sebagai tindakan kedua dari satu komit wizard)
- **Peran:** pembeli · penerimaan (atom `gr:inspect`)
- **Dari → ke:** Pending Inspection → Under Inspection
- **Operator — di mana:** `/buyer/goods-receipt` → tombol **Buat GR** yang sama. Tidak ada kontrol terpisah untuknya; hook finalisasi mengirimnya tepat setelah pembuatan kembali, lalu melanjutkan dengan disposisi yang digulung. Tombol footer **Mulai inspeksi** pada baris unggulan membuka wizard (lihat `t_gr_create`).
- **Operator — lakukan:** tim mutu mengambil alih kiriman dan mulai memeriksanya; sejak titik ini ada orang yang memikul keputusannya. Dalam praktiknya penerima sudah melakukan pemeriksaan di langkah 3 wizard sebelum menekan tombol.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Under Inspection — sementara di jalur wizard; disposisi menyusul dalam klik yang sama.
- **Penguji — konfirmasi:** jejak audit membawa peristiwa `t_gr_start_inspection` dengan id korelasinya sendiri tepat setelah `t_gr_create`; di halaman, baris sudah berada di disposisinya. Baris `Under Inspection` unggulan (`gr-001`, `gr-008`) menampilkan chip status dan footer **Kirim hasil inspeksi**.
- **Penguji — peristiwa pemicu:** `t_gr_start_inspection`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib. Penerimaan yang sudah `Under Inspection` menjawab `ILLEGAL_TRANSITION`, yang sengaja diabaikan hook finalisasi.
- **Glosarium:** `ILLEGAL_TRANSITION`.
- **Kejujuran:** untuk dua penerimaan `Under Inspection` unggulan, footer menawarkan **Kirim hasil inspeksi**, yang hanya toast ("Formulir pengiriman akan tersedia pada rilis mendatang") — penerimaan unggulan dalam status ini **tidak dapat didisposisi** dari halaman; hanya penerimaan buatan wizard yang mencapai kata kerja disposisi.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:78-88; src/services/query/commandHooks.ts:647-675; src/pages-v2/BuyerGoodsReceipt.tsx:504-517; src/lib/i18n/goodsReceipt.ts:361,371-372 -->

### t_gr_hold — Menahan penerimaan karena mutu <!-- transition:t_gr_hold -->

- **Jenis langkah:** tidak aktif (tanpa pemanggil)
- **Peran:** pembeli · penerimaan (atom `gr:inspect`)
- **Dari → ke:** Under Inspection → Quality Hold
- **Operator — di mana:** tidak disediakan di mana pun hari ini.
- **Operator — lakukan:** tidak ada yang bisa dilakukan — kata kerja ini ada agar barang yang tampak tidak beres dapat dibekukan alih-alih diterima atau ditolak, dengan alasan yang dituliskan untuk dijawab pemasok, tetapi tidak ada layar yang memicunya.
- **Operator — isi:** `holdReason` seharusnya wajib (teks bermakna); tidak ada formulir yang mengumpulkannya.
- **Penguji — status yang diharapkan:** Quality Hold (hanya fixture)
- **Penguji — konfirmasi:** `gr-007` unggulan (GR-2026-007) menampilkan chip `Tahan Mutu`, dihitung di KPI **Ditahan Kualitas** ("Dikarantina / uji ulang") dan tab **Ditahan Kualitas**, serta menawarkan **Minta uji ulang lab** dan **Timpa penahanan** di footer.
- **Penguji — peristiwa pemicu:** `t_gr_hold` (tidak pernah dipancarkan oleh permukaan)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `MISSING_FIELDS` (jawaban untuk pengiriman buatan tangan tanpa `holdReason`).
- **Kejujuran:** **WIRED-NO-CALLER.** Kosakata gulungan yang dipakai wizard (Pending / Accepted / Rejected / Partial per baris) tidak punya status penahanan, sehingga wizard tidak bisa mendarat di sini. **Timpa penahanan** pada fixture hanya toast: "Tidak ada yang ditimpa. Penimpaan harus menyebut orang yang menerima risiko, dan platform belum dapat menyebut nama orang."
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:89-99; src/pages-v2/BuyerGoodsReceipt.tsx:519-566; src/data/mockGoodsReceipts.ts:222-247; _derived/surfaces.md:16 -->

### t_gr_request_retest — Minta uji ulang lab <!-- transition:t_gr_request_retest -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · penerimaan (atom `gr:inspect`)
- **Dari → ke:** Quality Hold → Under Inspection
- **Operator — di mana:** `/buyer/goods-receipt` → buka penerimaan `Quality Hold` (atau tab **Ditahan Kualitas**) → footer panel samping → **Minta uji ulang lab** (menampilkan **Melepaskan…** selagi diproses).
- **Operator — lakukan:** menyatakan bahwa masalah yang membekukan barang sudah ditangani dan penerimaan perlu diperiksa ulang. Tanpa ini, stok yang dibekukan tidak punya jalan kembali untuk dipakai.
- **Operator — isi:** tidak ada yang diisi — tanpa muatan; penahanan sudah mencatat alasannya.
- **Penguji — status yang diharapkan:** Under Inspection
- **Penguji — konfirmasi:** toast **"GR-… kembali diperiksa — Penahanan dilepaskan. Catat hasil uji ulang, lalu ambil keputusan disposisi."**; chip berbunyi `Sedang Diinspeksi`; KPI **Ditahan Kualitas** berkurang dan baris berpindah ke tab **Dalam Inspeksi**; lini masa **Alur disposisi** di panel mundur satu langkah.
- **Penguji — peristiwa pemicu:** `t_gr_request_retest`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** ia mendarat di `Under Inspection`, bukan `Pending Inspection`, karena di sanalah keputusan dapat diambil — tetapi untuk penerimaan **unggulan**, footer di sana adalah toast **Kirim hasil inspeksi**, sehingga `gr-007`, setelah dilepaskan, tidak dapat didisposisi dari halaman. Kursi tanpa `gr:inspect` melihat **Menunggu Penerimaan** di slot uji ulang.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:100-129; src/pages-v2/BuyerGoodsReceipt.tsx:519-540,727-750; src/services/query/commandHooks.ts:706-724; src/lib/i18n/goodsReceipt.ts:362,373-378 -->

### t_gr_approve — Menyetujui seluruh kiriman <!-- transition:t_gr_approve -->

- **Jenis langkah:** tindakan operator (kata kerja header yang disebut gulungan)
- **Peran:** pembeli · penerimaan (atom `gr:disposition`)
- **Dari → ke:** Under Inspection → Approved
- **Operator — di mana:** `/buyer/goods-receipt` → langkah 4 wizard **Disposisi & kirim** → **Buat GR**, saat header turunan berbunyi **Approved**.
- **Operator — lakukan:** tim mutu menerima seluruh kiriman; pemasok mendapat penilaian bersih untuk kiriman itu dan barangnya boleh dipakai. Penerima mencapainya dengan memasukkan kuantitas disetujui sama dengan kuantitas diterima pada setiap baris dan meluluskan setiap pemeriksaan.
- **Operator — isi:** tidak ada selain baris yang sudah dicatat saat pembuatan.
- **Penguji — status yang diharapkan:** Approved (atau langsung ke Posting to SAP / Posted to SAP dengan **Kirim otomatis ke SAP** dicentang, yang merupakan bawaan)
- **Penguji — konfirmasi:** toast **"GR-… — Disetujui — … Disposisi header diturunkan dari baris yang diinspeksi."**; chip `Disetujui`; kolom **Disposisi** baris berbunyi Accept; footer menawarkan **Kirim ke SAP**; KPI **Disetujui Hari Ini** menghitungnya. Baris **Berikutnya** di panel berbunyi **Giliran Anda** untuk kursi penerimaan.
- **Penguji — peristiwa pemicu:** `t_gr_approve`
- **Pemeriksaan yang dapat menolak:** `gr_rollup_all_accepted` — baris yang tersimpan harus tergulung ke Approved: setiap baris Accepted, artinya tidak ada kuantitas ditolak dan tidak ada pemeriksaan visual / kemasan / segel halal / BPOM yang gagal, serta tidak ada baris yang masih Pending ("line rollup is '…', not 'Approved'" jika tidak).
- **Glosarium:** `POLICY_REJECTED`, `PASS`, `ADVERSE`.
- **Kejujuran:** tidak ada rantai yang menyala pada persetujuan. Wizard tidak dapat menawarkan Approve saat baris-baris tidak sepakat — ia menghitung gulungan yang sama yang diperiksa ulang hook — sehingga penolakan hanya dapat dicapai lewat pengiriman buatan tangan.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:130-141; src/services/transitions/policies.ts:135-150; src/services/transitions/grRollup.ts:18-33,49-58,61-72; src/components/v2-features/GRInspectionWizard.tsx:705-737,1585-1606; src/lib/i18n.ts:1020-1021 -->

### t_gr_partial_approve — Menyetujui sebagian, menolak sebagian <!-- transition:t_gr_partial_approve -->

- **Jenis langkah:** tindakan operator (kata kerja header yang disebut gulungan) · sumber rantai
- **Peran:** pembeli · penerimaan (atom `gr:disposition`)
- **Dari → ke:** Under Inspection → Partially Approved
- **Operator — di mana:** `/buyer/goods-receipt` → langkah 4 wizard → **Buat GR**, saat header turunan berbunyi **Partially Approved**.
- **Operator — lakukan:** sebagian kiriman layak pakai dan sebagian tidak; Paragon menyimpan yang bisa dipakai, sisanya menjadi klaim terhadap pemasok. Penerima mencapainya dengan menyetujui lebih sedikit unit daripada yang diterima pada satu baris (**Alasan Penolakan** lalu wajib pada baris itu), atau dengan menggagalkan pemeriksaan pada baris yang masih punya unit disetujui, sementara setidaknya satu baris lain bersih.
- **Operator — isi:** tidak ada selain baris yang dicatat; alasan penolakan per baris di wizard ikut di dalam `inspectionResults`, bukan sebagai kolom header.
- **Penguji — status yang diharapkan:** Partially Approved (lalu Posting to SAP / Posted to SAP dengan kirim otomatis)
- **Penguji — konfirmasi:** toast **"GR-… — Disetujui Sebagian — …"**; chip `Disetujui Sebagian`; footer **Kirim ke SAP**. Bila penerimaan menyebut ASN hidup (`ASN-2025-…`), ASN itu kini berbunyi `Selisih` di `/supplier/shipments` dan muncul di bagian **Selisih pengiriman** halaman ini.
- **Penguji — peristiwa pemicu:** `t_gr_partial_approve` (memicu `t_asn_discrepancy` pada ASN terkait)
- **Pemeriksaan yang dapat menolak:** `gr_rollup_mixed` — baris harus tergulung ke Partially Approved: tidak ada baris Pending, tidak semua Accepted, tidak semua Rejected.
- **Glosarium:** `POLICY_REJECTED`, `ADVERSE`.
- **Kejujuran:** rantainya bersifat upaya terbaik dan diam: penerimaan yang dibuat dari pengiriman dermaga (`ASN-2026-0xx`) tidak punya ASN padanan di penyimpanan, sehingga tidak ada yang ditandai dan tidak ada yang mengatakannya. `gr-010` unggulan dalam status ini membawa `sapMaterialDoc` meski tidak pernah diposting — kolom fixture yang tidak ditulis siapa pun.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:142-154; src/services/transitions/policies.ts:135-150; src/services/transitions/cascades.ts:24-30; src/services/data/mock/MockCommandService.ts:2884-2889; src/components/v2-features/GRInspectionWizard.tsx:1191-1215; src/data/mockGoodsReceipts.ts:301-325 -->

### t_gr_reject — Menolak seluruh kiriman <!-- transition:t_gr_reject -->

- **Jenis langkah:** tindakan operator (kata kerja header yang disebut gulungan) · sumber rantai
- **Peran:** pembeli · penerimaan (atom `gr:disposition`)
- **Dari → ke:** Under Inspection → Rejected (terminal)
- **Operator — di mana:** `/buyer/goods-receipt` → langkah 4 wizard → **Alasan Penolakan (wajib)** ("Jelaskan penolakan seluruh lot") → **Buat GR**, saat header turunan berbunyi **Rejected**.
- **Operator — lakukan:** tidak ada bagian kiriman yang layak pakai. Alasan yang ditulis di sini menjadi dasar perundingan pemasok dan pembelian, sekaligus menahan pembayaran untuk seluruh lot. Penerima mencapainya dengan menyetujui nol unit pada setiap baris (atau menggagalkan pemeriksaan pada setiap baris tanpa ada yang disetujui).
- **Operator — isi:** `dispositionReason` — alasan penolakan header; wizard tidak mengaktifkan **Buat GR** pada gulungan Rejected sampai ada teksnya.
- **Penguji — status yang diharapkan:** Rejected
- **Penguji — konfirmasi:** toast **"GR-… — Ditolak — …"**; chip `Ditolak` (nada bahaya); **Disposisi** baris berbunyi Reject; tidak ada kata kerja footer (terminal); KPI **Tingkat Penolakan (30h)** bergerak; ASN hidup terkait (bila ada) berbunyi `Selisih` dan muncul di **Selisih pengiriman**.
- **Penguji — peristiwa pemicu:** `t_gr_reject` (memicu `t_asn_discrepancy` pada ASN terkait)
- **Pemeriksaan yang dapat menolak:** `MISSING_FIELDS` lebih dulu bila `dispositionReason` kosong (halaman menampilkan "Alasan penolakan wajib diisi untuk menolak penerimaan ini."); lalu `gr_rollup_all_rejected` — setiap baris harus tergulung Rejected.
- **Glosarium:** `MISSING_FIELDS`, `POLICY_REJECTED`, `ADVERSE`.
- **Kejujuran:** `Rejected` adalah terminal — tidak ada kata kerja kembalikan-ke-pemasok atau inspeksi-ulang setelahnya pada header (`gr-011` unggulan menampilkan label disposisi "Return to Supplier" yang merupakan data fixture, bukan status). Kirim otomatis tidak pernah menyala pada penerimaan yang ditolak. Peringatan rantai di bawah `t_gr_partial_approve` berlaku.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:155-166; src/services/transitions/policies.ts:135-150; src/components/v2-features/GRInspectionWizard.tsx:921-925,1440-1452,1585-1606; src/lib/i18n.ts:1022-1024; src/data/mockGoodsReceipts.ts:328-353 -->

### t_gr_post — Kirim ke SAP <!-- transition:t_gr_post -->

- **Jenis langkah:** batas SAP — diajukan, lalu diselesaikan (mencatat fakta di SAP) · sumber rantai
- **Peran:** pembeli · penerimaan (atom `gr:post`)
- **Dari → ke:** Approved, Partially Approved → Posting to SAP ⇒ Posted to SAP (terminal, hanya dicapai lewat penyelesaian)
- **Operator — di mana:** `/buyer/goods-receipt` → kotak centang **Kirim otomatis ke SAP** di wizard (aktif secara bawaan; menyala tepat setelah disposisi), atau footer **Kirim ke SAP** pada penerimaan `Approved` / `Partially Approved`.
- **Operator — lakukan:** menyerahkan penerimaan ini ke SAP agar stoknya ada di pembukuan dan bisa dipakai pabrik. Tidak ada yang benar-benar diterima sebelum SAP menyatakannya. Tindakan ini dua bagian: portal **mengajukan** dan menampilkan interim `Posting to SAP` tanpa dokumen material; callback SAP **menyelesaikannya** ke `Posted to SAP` dan menetapkan nomor dokumen material.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Posting to SAP (interim, biasanya sesaat) ⇒ Posted to SAP
- **Penguji — konfirmasi:** toast **"GR-… mengirim ke SAP — Dikirim ke SAP — menunggu callback dokumen material. Belum ada dokumen."** lalu **"GR-… terkirim ke SAP — SAP menetapkan dokumen material saat penyelesaian."**; kolom **Dok SAP** terisi **MAT-DOC-…**; footer menjadi **Lihat di SAP**; lini masa **Alur disposisi** menuntaskan **Terkirim ke SAP**. Selagi interim, footer berbunyi "Menunggu penyelesaian SAP — dokumen material belum ada". Bila ada faktur berstatus Submitted yang berbagi PO dengan penerimaan dan putusan 3 arah adalah Matched, faktur itu maju (`t_invoice_match`); Qty Mismatch / Price Variance ditulis pada faktur tetapi tidak memajukannya.
- **Penguji — peristiwa pemicu:** `t_gr_post` (hasil `submitted`, lalu peristiwa `done` kedua dengan id korelasi yang sama saat penyelesaian; memicu `t_invoice_match` pada faktur yang Matched)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib pada pengajuan. **Penyelesaian** dapat gagal secara terpisah: `REFUSED` (meminta lagi tidak akan membantu), `TRANSPORT` (sistem penyelesai tidak menjawab; mencoba lagi aman), `UNGOVERNED` (tidak terklasifikasi; tidak dapat dicoba lagi).
- **Glosarium:** `REFUSED`, `TRANSPORT`, `UNGOVERNED`, `ROLE_NOT_PERMITTED`, `ILLEGAL_TRANSITION`.
- **Kejujuran:** "SAP"-nya adalah mock di memori; nomor dokumen material dicetak penyimpanan saat penyelesaian, tidak pernah di sisi klien. Penyelesaian yang gagal meninggalkan penerimaan di `Posting to SAP`; halaman ini menawarkan **Coba selesaikan lagi** hanya untuk kegagalan yang dilihat sesi ini dan hanya bila dapat dicoba ulang, dan menyatakan "Penyelesaian ditolak. Mengulang permintaan tidak akan mengubah jawabannya…" untuk selainnya. Penerimaan yang terparkir oleh sesi sebelumnya menampilkan penantian dan tidak menawarkan apa pun. **Lihat di SAP** hanya toast ("Tampilan dokumen SAP belum tersedia"). Memposting penerimaan **tidak** menggerakkan pesanan pembelian; status pengiriman PO adalah fakta S/4HANA sendiri.
<!-- src: src/services/transitions/flows/goodsReceipt.flow.ts:167-187; src/services/data/mock/MockCommandService.ts:2746-2883,2962-2969; src/pages-v2/BuyerGoodsReceipt.tsx:567-620,642-720; src/components/v2-features/GRInspectionWizard.tsx:1608-1678; src/services/query/commandHooks.ts:678-751; src/lib/i18n.ts:1025-1043; src/lib/i18n/goodsReceipt.ts:365-369 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Disposisi yang mana (di Under Inspection).** Bukan pilihan melainkan penurunan, baris demi baris: sebuah baris **Accepted** bila kuantitas disetujuinya sama dengan kuantitas diterima dan setiap pemeriksaan lulus; **Rejected** bila tidak ada yang disetujui dan ada yang ditolak atau pemeriksaan gagal; **Partial** bila sebagian unit disetujui dan sebagian ditolak atau pemeriksaan gagal; **Pending** bila pemeriksaannya masih tertunda dan belum ada kuantitas dimasukkan. Lalu header — Cabang A `t_gr_approve` — **Kapan:** setiap baris Accepted. Cabang B `t_gr_reject` — **Kapan:** setiap baris Rejected (alasan header wajib). Cabang C `t_gr_partial_approve` — **Kapan:** campuran lainnya. Tanpa cabang — **Kapan:** ada baris Pending: wizard tidak mengizinkan Anda menyelesaikan.
- **Kirim sekarang atau nanti (di Approved / Partially Approved).** Cabang A — **Kirim otomatis ke SAP** dicentang — **Kapan:** penerima ingin stok segera masuk pembukuan (bawaan). Cabang B — hapus centang, lalu **Kirim ke SAP** dari footer kemudian — **Kapan:** ada yang harus diperiksa dulu. Keduanya keluar lewat `t_gr_post`.
- **Penahanan mutu (jalur pengecualian).** Masuk — `t_gr_hold` — **Kapan:** tidak pernah hari ini (tanpa pemanggil); fixture `gr-007` adalah satu-satunya spesimen. Keluar — `t_gr_request_retest` — **Kapan:** kondisi penyebab penahanan sudah ditangani; mendarat di `Under Inspection`. **Timpa penahanan** — **Kapan:** tidak pernah hari ini; memerlukan orang yang disebut namanya dan platform belum dapat menyebutnya.
- **Rejected (jalur pengecualian, terminal).** Tanpa jalan keluar. ASN pemasok ditandai `Discrepancy` dan penerima kemudian merekonsiliasinya di halaman yang sama (lihat panduan advance ship notice).
- **Penyelesaian yang gagal (jalur pengecualian di Posting to SAP).** Cabang A — **Coba selesaikan lagi** — **Kapan:** kegagalannya `TRANSPORT` dan sesi ini yang mengajukan posting. Cabang B — tidak ada yang ditawarkan — **Kapan:** kegagalannya `REFUSED` / `UNGOVERNED`, atau posting berasal dari sesi lain.
- **Sertifikat halal yang tidak memenuhi (di dalam wizard).** Tanpa cabang di mesin: pemberitahuan menyebut alasannya (`NO_CERT`, `EXPIRED`, `SCHEME_INVALID`, `UNDER_REVIEW`) dan berbunyi "Hal ini tidak menghentikan penerimaan. Catat dan sampaikan perpanjangannya kepada pemasok dan tim kepatuhan."

<!-- section:flags -->
## 5 · Bendera pengecualian

| Bendera | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Ditahan Kualitas ("Dikarantina / uji ulang") | dimunculkan operator (hanya fixture hari ini) | Quality Hold | ada penerimaan di `Quality Hold` | ubin KPI `/buyer/goods-receipt`, tab **Ditahan Kualitas**, chip nada bahaya |
| Tingkat Penolakan (30h) | diturunkan saat dibaca | semua | kuantitas ditolak dibagi kuantitas diterima | ubin KPI |
| Menunggu Inspeksi ("Menunggu mulai QC") | diturunkan saat dibaca | Pending Inspection | jumlah penerimaan yang belum diinspeksi | ubin KPI, tab **Menunggu** |
| Menunggu penyelesaian SAP — dokumen material belum ada | diturunkan saat dibaca (sedang diselesaikan) | Posting to SAP | posting sudah diajukan dan belum diselesaikan | footer panel samping |
| Penyelesaian ditolak… / Coba selesaikan lagi | eksternal (kegagalan penyelesaian, terklasifikasi) | Posting to SAP | sesi ini melihat penyelesaian gagal | footer panel samping |
| Selisih pengiriman | dimunculkan operator lewat rantai | (sisi ASN) Discrepancy | penolakan / persetujuan sebagian menandai ASN hidup | bagian di atas tab, dengan **Rekonsiliasi** |
| Sertifikat halal — perlu tindakan | diturunkan saat dibaca terhadap registri kepatuhan (sertifikat contoh TERSIMULASI) | langkah 3 wizard | pemasok × material tidak punya sertifikat yang memenuhi pada saat penerimaan | pemberitahuan per baris di **Pemeriksaan kualitas** |
| Penerapan halal / BPOM tidak dapat ditentukan | diturunkan saat dibaca dari master material | langkah 3 wizard | kode material tidak dikenal atau belum ditetapkan | blok penolakan per baris; baris tidak dapat diinspeksi |
| Belum dijawab. Pemeriksaan ini wajib… | diturunkan saat dibaca | langkah 3 wizard | pemeriksaan segel halal / lot BPOM yang wajib belum dijawab di bawah `BLOCK` | penanda per baris; **Buat GR** tetap nonaktif |
| Menunggu Penerimaan | diturunkan saat dibaca (serah terima) | semua | kursi tidak memegang salah satu `gr:receive` / `gr:inspect` / `gr:post` (yang pertama hilang disebut) atau `asn:flag` | kepala halaman di samping **GR Baru**, footer, sel rekonsiliasi |
| Giliran Anda | diturunkan saat dibaca (tindakan berikutnya) | Pending Inspection, Under Inspection, Quality Hold, Approved, Partially Approved | kursi penerimaan memegang kata kerja yang legal dari status itu; di `Posting to SAP` baris ini mengalah pada teks penyelesaian di footer; di dua terminal tidak menampilkan apa pun | baris **Berikutnya** di bawah status di panel |
| Penanda provenans | penanda TERSIMULASI | semua | selalu | baris meta |
<!-- src: src/pages-v2/BuyerGoodsReceipt.tsx:272-287,343-372,567-602,824-870,1146; src/components/v2-features/GRInspectionWizard.tsx:428-534,844-858,1295-1373; src/lib/i18n/goodsReceipt.ts:323-330,366-369,475-501 -->

<!-- section:linked -->
## 6 · Objek terkait

**Entitas perwakilan:** `gr-002` (GR-2026-002, status `Pending Inspection`, pemasok `sup-007`).

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Pengiriman | `asnId` = `shp-012`, `asnNumber` = `ASN-2026-012` (status At Dock) | sumber dermaga yang dipilih wizard dari **Mulai inspeksi**; pengiriman adalah fixture berbentuk TMS, bukan dokumen penyimpanan ASN |
| Advance ship notice | `asnNumber` | kunci rantai untuk `t_asn_discrepancy`; **tidak ada GR unggulan yang menyebut nomor penyimpanan ASN**, sehingga penerimaan unggulan tidak pernah menandai ASN unggulan |
| Pesanan pembelian | `poNumber` = `PO-2025-00107` (`po-007`) | dibaca oleh pencocokan 3 arah saat GR diposting (`confirmedQty × unitPrice`); GR tidak pernah menulis ke PO |
| Pemasok | `supplierId` = `sup-007`, `supplierName` | diturunkan dari pengiriman atau ASN induk saat pembuatan; dipakai untuk cakupan baca per pemasok; panel menampilkan pemasok dari daftar pemasok |
| Faktur | `poNumber` faktur = `poNumber` GR, `status` faktur = Submitted | pada `t_gr_post` resolver menulis `matchStatus` faktur dan memicu `t_invoice_match` hanya saat Matched |
| Baris inspeksi | `inspectionResults[]` (`materialCode`, `qtyExpected`, `qtyReceived`, `qtyAccepted`, `qtyRejected`, `rejectionReason`, `labResultId`, `visualCheck`, `packagingCheck`, `halalSealCheck`, `bpomLotCheck`) | substrat tempat header digulung; ditampilkan di tabel **Item baris** panel dengan legenda V · P · H · B |
| `disposition` | ditulis oleh kata kerja header (Accept / Reject) | nilai unggulan seperti Quarantine / Return to Supplier adalah label fixture yang tidak pernah ditulis mesin |
| `sapMaterialDoc` | ditulis hanya saat penyelesaian | diunggulkan pada `gr-005`, `gr-006`, `gr-014` (Posted) dan, secara tidak konsisten, pada `gr-010` (Partially Approved) — hanya tampilan di sana |
| `receivedBy`, `receivedDate`, `notes` | ditulis saat pembuatan dari kolom wizard | teks bebas; tidak ada orang yang diselesaikan dari `receivedBy` |
<!-- src: src/data/mockGoodsReceipts.ts:27-56,88-112,301-325; src/data/mockShipments.ts:324-347; src/services/data/mock/MockCommandService.ts:252-311,2746-2883,2962-2969; src/lib/i18n/goodsReceipt.ts:387-406 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap pengiriman perintah menulis satu `TransitionEvent` (`event`, `actor` — kursi pembeli menulis `buyer:all` — `ts`, `outcome`, `correlationId`). `t_gr_post` adalah kasus khusus: ia lebih dulu mencatat `submitted`, dan penyelesaian menulis peristiwa **kedua** dengan id korelasi yang **sama** berhasil `done`, yang memungkinkan buku besar membedakan penerimaan yang diselesaikan dari yang diunggulkan. Rantai (`t_asn_discrepancy`, `t_invoice_match`) membawa `causationId` = id korelasi perintah penerimaan. Satu klik wizard karenanya menghasilkan tiga atau empat id korelasi berturut-turut.

Urutan kerja yang dihasilkan penguji dari **GR Baru** dengan **Masukkan nomor ASN** = `ASN-2025-00211` (In Transit, `sup-007`, PO-2025-00107), menolak satu dari dua baris dan membiarkan **Kirim otomatis ke SAP** tercentang:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ → Pending Inspection | pembeli · penerimaan (`buyer:all`) | **Buat GR** | `t_gr_create` · done (`GR-2026-0xx` baru dikembalikan) |
| T+0 | Pending Inspection → Under Inspection | pembeli · penerimaan (`buyer:all`) | klik yang sama (hook finalisasi) | `t_gr_start_inspection` · done |
| T+0 | Under Inspection → Partially Approved | pembeli · penerimaan (`buyer:all`) | klik yang sama (kata kerja header yang digulung) | `t_gr_partial_approve` · done |
| T+0 | (ASN-2025-00211) In Transit → Discrepancy | otomasi (`causationId` = id persetujuan sebagian) | rantai | `t_asn_discrepancy` · done |
| T+0 | Partially Approved → Posting to SAP | pembeli · penerimaan (`buyer:all`) | klik yang sama (kirim otomatis) | `t_gr_post` · submitted |
| T+1 | Posting to SAP ⇒ Posted to SAP | penyelesaian, dicatat dengan cakupan yang sama | callback SAP mock | `t_gr_post` · done (id korelasi sama; `MAT-DOC-…` ditetapkan) |
| T+2 | (ASN-2025-00211) Discrepancy → Delivered | pembeli · penerimaan (`buyer:all`) | **Rekonsiliasi** di **Selisih pengiriman** | `t_asn_resolve_discrepancy` · done |
<!-- src: src/services/transitions/events.ts:9-19,25-129; src/services/transitions/dispatcher.ts:397-473; src/services/query/commandHooks.ts:647-675; src/components/v2-features/GRInspectionWizard.tsx:1524-1690 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| **Menunggu Penerimaan** di samping kepala halaman, tidak ada tombol **GR Baru**; footer menampilkan pemberitahuan | teks serah terima di tempat tombol seharusnya | kursi tidak memegang `gr:receive`, `gr:inspect`, atau `gr:post` (yang pertama hilang disebut) | gunakan kursi pembeli di jalur **penerimaan** |
| "ASN tidak ditemukan di antara pengiriman yang dapat diterima. Masukkan ASN yang diajukan (status Diajukan, Dalam Perjalanan, atau Terkirim)." | teks merah di bawah **Nomor ASN** | nomornya adalah pengiriman dermaga (`ASN-2026-0xx`), ASN `Draft`, atau salah ketik | pilih pengiriman dari **Pilih kedatangan di dermaga**, atau masukkan `ASN-2025-…` yang hidup |
| "Tidak dapat membuat penerimaan barang — … (…gr_create_shipment_received: shipment … has not arrived (In Transit))" | toast kesalahan | pengiriman yang dirujuk tidak At Dock / Unloading / Delivered | terima pengiriman yang sudah tiba |
| "Penerimaan barang tidak dapat dibuat: memeriksa material yang tidak pernah dinyatakan oleh pengiriman atau ASN (…UNDECLARED_MATERIAL…)" | toast kesalahan | sebuah baris menyebut material yang tidak dibawa induknya (hanya dapat dicapai lewat muatan buatan tangan — wizard mengunggulkan baris dari induk) | periksa baris terhadap dokumen pengiriman |
| "Masukkan kuantitas. Jika tidak ada yang tiba untuk baris ini, masukkan 0…" / "Itu bukan kuantitas" | sebaris di bawah sel kuantitas; **Berikutnya** nonaktif | kuantitas kosong, bukan angka, atau ambigu | ketik angka saja; 0 adalah jawaban nyata, kosong bukan |
| "Penerapan halal tidak dapat ditentukan." / "Penerapan BPOM tidak dapat ditentukan." | blok merah pada baris, langkah 3 | master material tidak memuat kodenya atau penetapannya | baris tidak dapat diinspeksi sampai master diputuskan |
| "Belum dijawab. Pemeriksaan ini wajib untuk material tersebut…" | penanda di bawah Pemeriksaan Segel Halal / Pelacakan Lot BPOM | pemeriksaan wajib belum dijawab di bawah `BLOCK` | pilih Lulus atau Gagal |
| **Buat GR** nonaktif di langkah 4 dengan gulungan Rejected | tombol abu-abu | **Alasan Penolakan (wajib)** kosong | tulis alasan penolakan seluruh lot |
| "Tidak dapat menyelesaikan GR-… — Sebuah aturan yang mengatur menolak tindakan ini (…gr_rollup_…: line rollup is '…', not '…')" | toast peringatan setelah pembuatan | kata kerja header tidak cocok dengan baris tersimpan (pengiriman buatan tangan) | biarkan wizard menurunkan kata kerjanya |
| Penerimaan macet di `Posting to SAP`; footer "Menunggu penyelesaian SAP — dokumen material belum ada" | status interim | penyelesaian belum kembali, atau gagal di sesi lain | tunggu; bila sesi ini melihat kegagalan `TRANSPORT`, tekan **Coba selesaikan lagi** |
| "Penyelesaian ditolak. Mengulang permintaan tidak akan mengubah jawabannya…" | teks footer merah | kegagalan penyelesaian `REFUSED` / `UNGOVERNED` | selesaikan yang disebut penolakan; laporkan referensinya untuk `UNGOVERNED` |
| Penerimaan `Under Inspection` unggulan hanya menawarkan **Kirim hasil inspeksi**, yang tidak berbuat apa pun | toast info "Formulir pengiriman akan tersedia pada rilis mendatang" | penerimaan unggulan tidak dapat didisposisi dari halaman | buat penerimaan baru lewat wizard |
| **Mulai inspeksi** membuat GR baru dan membiarkan baris lama `Pending Inspection` | dua baris untuk satu pengiriman | wizard selalu membuat; ia tidak memajukan baris unggulan | wajar dalam demo |
| Menolak penerimaan, tidak ada selisih ASN yang muncul | halaman pemasok tak berubah | penerimaan merujuk pengiriman dermaga, bukan nomor penyimpanan ASN | terima terhadap `ASN-2025-…` yang hidup |
| **Timpa penahanan** / **Lihat di SAP** / **Ekspor** / **Hasil Lab** tidak berbuat apa pun | toast yang menyatakannya | kontrol hanya tampilan | tidak ada |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:GRC`, atau `MODULE_INACTIVE:GRC.inspectionWizard` bila hanya *Wizard inspeksi* yang dinonaktifkan, atau `MODULE_INACTIVE:GRC.qualityHold` bila hanya *Penahanan mutu* yang dinonaktifkan; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Penerimaan barang & inspeksi"* | modul Penerimaan barang & inspeksi (atau salah satu bagiannya) dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |
<!-- src: src/lib/glossary/refusals.glossary.ts:32-152; src/lib/i18n/goodsReceipt.ts:371-386,440,461-486; src/lib/i18n.ts:1013-1045; src/pages-v2/BuyerGoodsReceipt.tsx:567-620 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Pending Inspection | `gr-002`, `gr-009` | GR-2026-002, GR-2026-009 | `gr-002` memilih lebih dulu pengiriman dermaga `shp-012` (At Dock) dari **Mulai inspeksi**; pengiriman `gr-009` yaitu `shp-011` berada di Customs Clearance dan tidak ada di daftar dermaga |
| Under Inspection | `gr-001`, `gr-008` | GR-2026-001, GR-2026-008 | footer berupa toast **Kirim hasil inspeksi**; tidak dapat didisposisi dari halaman |
| Quality Hold | `gr-007` | GR-2026-007 | satu-satunya spesimen penahanan (tidak ada pemanggil yang membuatnya); **Minta uji ulang lab** berfungsi di sini |
| Approved | `gr-003`, `gr-004`, `gr-012`, `gr-013` | GR-2026-003, -004, -012, -013 | **Kirim ke SAP** di footer aktif pada masing-masing |
| Partially Approved | `gr-010` | GR-2026-010 | **Kirim ke SAP** aktif; membawa `sapMaterialDoc` fixture yang tidak pernah diperolehnya |
| Rejected | `gr-011` | GR-2026-011 | terminal; tanpa kata kerja footer |
| Posting to SAP | tidak ada | — | capai dengan memposting; terlihat sesaat, atau menetap setelah penyelesaian gagal |
| Posted to SAP | `gr-005`, `gr-006`, `gr-014` | GR-2026-005, -006, -014 | terminal; **Lihat di SAP** hanya toast |
| Dock sources for a new receipt | — | ASN-2026-012 / -013 / -014 / -015 | sumber dermaga untuk penerimaan baru — pengiriman di dermaga, bukan penerimaan: `shp-012`, `shp-013` (At Dock); `shp-014`, `shp-015` (Unloading); ditambah ASN hidup `ASN-2025-00211`, `-00198`, `-00301`, `-00302` (yang dapat berantai menjadi selisih) |
<!-- src: src/data/mockGoodsReceipts.ts:61-442; src/data/mockShipments.ts:324-488; src/services/data/mock/fixtures/supplierShipments.ts:84-216; _derived/guidefacts.json (goodsReceipt.fixtures) -->
