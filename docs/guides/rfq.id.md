---
entity: rfq
locale: id
title: Permintaan penawaran (acara pengadaan)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_rfq_create
  - t_rfq_publish
  - t_rfq_close
  - t_rfq_award
  - t_rfq_fx_pin
  - t_rfq_cancel
  - t_rfq_reopen
---

<!-- section:summary -->
## 1 · Apa proses ini

Sebuah acara pengadaan: Paragon meminta penawaran dari beberapa pemasok atas kebutuhan yang sama, agar perbandingannya setara. RFQ adalah dokumen milik pembeli. Ia menyebut apa yang dicari (judul, kategori material, satu atau lebih kode material, total kuantitas dan satuan), siapa yang diundang, kapan tanggapan jatuh tempo, kapan pemenangan jatuh tempo, dan dengan syarat komersial apa (Incoterms, syarat pembayaran, mata uang). Pemasok tidak pernah menyuntingnya; mereka menjawabnya dengan penawaran (quotation), yang merupakan dokumen terpisah dengan panduannya sendiri.

Satu peran menggerakkannya dari awal sampai akhir: **pembeli** Paragon (jalur `procurement`) menyusun draf acara, menerbitkannya kepada pemasok yang diundang, mencatat dasar kurs ketika penawaran masuk dalam lebih dari satu mata uang, dan akhirnya memenangkannya untuk satu penawaran, atau membatalkannya. Acara yang sudah ditutup dapat dibuka kembali oleh peran yang sama. **Kontak penjualan** pemasok (jalur `commercial`) baru melihat acara setelah diterbitkan, dan hanya bila diundang; tindakan mereka — mengirim penawaran — dijelaskan di panduan quotation. Tidak ada yang menekan langkah penutupan: langkah itu dinyatakan sebagai berakhirnya jendela tanggapan, dan tidak ada apa pun di build ini yang memicunya.

Prosesnya dimulai di **Draft**, menjadi terlihat oleh pemasok di **Open**, dan berakhir di **Awarded** atau **Cancelled**, dua status terminal. **Closed** adalah status yang disediakan mesin untuk jendela tanggapan yang sudah lewat; setiap RFQ Closed di build ini adalah data seed, karena langkah yang seharusnya menghasilkannya tidak punya pemanggil. Pemenangan menyebar ke penawaran-penawaran di bawah grant otomasi platform: penawaran yang dipilih menjadi Awarded dan setiap penawaran lain pada acara yang sama menjadi Rejected, dalam satu tindakan yang sama.

Penanda kejujuran yang perlu diketahui pembaca sebelum memakai panduan ini. RFQ dan penawaran demo adalah fixture **SIMULASI**; masa kini yang dinyatakan (declared present) yang dipakai papan pembeli untuk mengukur tenggat adalah **31 Agu 2026**, dan setiap tenggat respons di berkas fixture jatuh sebelumnya, sehingga semua acara Open yang di-seed terbaca terlambat — satu-satunya pengecualian adalah Draft yang dibuat platform untuk dirinya sendiri saat boot, yang tenggatnya November 2026. Pemenangan mencatat penawaran dan pemasok pemenang pada RFQ dan **tidak mencetak apa pun di hilir** — tidak ada purchase order, tidak ada kontrak; tab pemenangan di sisi pemasok dengan jujur menampilkan "PO diterbitkan —". Pencatatan kurs disimpan dengan liveness `SIMULATED` baik diketik manual maupun diberi label kurs SAP, karena tidak ada umpan kurs yang tersambung. Setiap tindakan manusia dicatat tanpa nama orang (`UNATTRIBUTED: NO_PERSON_IN_SESSION`). Dua aturan yang menjaga penerbitan — kelayakan undangan dan ambang kompetisi — nyata dan menolak di mesin; pengecualian yang mengangkat ambang itu dibaca dari daftar pemasok pilihan (PSL), yang juga di-seed saat boot.

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Draft | tindakan operator (pembuatan); berkaskade ke permintaan (requisition) asalnya | buyer · procurement | `t_rfq_create` |
| 2 | Draft → Open | tindakan operator; dua pemeriksaan kebijakan | buyer · procurement | `t_rfq_publish` |
| 3 | Open → Closed | dinyatakan terhitung (jendela tanggapan berakhir) — tanpa pemanggil | automation | `t_rfq_close` |
| 4 | Open, Closed → Awarded | tindakan operator; berkaskade ke penawaran | buyer · procurement | `t_rfq_award` |
| 5 | Open, Closed → status sama | mencatat fakta (mempertahankan status): dasar kurs | buyer · procurement | `t_rfq_fx_pin` |
| 6 | Draft, Open, Closed → Cancelled | tindakan operator (pengecualian) | buyer · procurement | `t_rfq_cancel` |
| 7 | Closed → Open | tindakan operator (pengecualian) | buyer · procurement | `t_rfq_reopen` |

<!-- src: src/services/transitions/flows/rfq.flow.ts:20-196; src/services/transitions/cascades.ts:54-60 -->

**Percabangan**

- **Di Draft:** `t_rfq_publish` — procurement — ketika daftar undangan sudah pasti dan acara siap disodorkan ke pemasok; `t_rfq_cancel` — procurement — ketika kebutuhan atau anggaran hilang sebelum siapa pun diminta.
- **Di Open:** `t_rfq_award` — procurement — ketika semua pemasok yang diundang sudah menjawab dan satu penawaran dipilih; `t_rfq_fx_pin` — procurement — ketika penawaran masuk dalam lebih dari satu mata uang dan perbandingan memerlukan kurs tercatat (RFQ tetap Open); `t_rfq_cancel` — procurement — ketika acara dibatalkan sebelum pemenangan; `t_rfq_close` — automation — dinyatakan untuk lewatnya tenggat respons, tidak dipicu apa pun hari ini.
- **Di Closed:** `t_rfq_reopen` — procurement — ketika tanggapan tambahan diinginkan atau kebutuhan bergeser; `t_rfq_award` — procurement — sah di mesin, tetapi permukaan pembeli hanya menawarkan panel pemenangan pada acara Open, jadi dalam praktiknya buka kembali dulu; `t_rfq_fx_pin` — procurement — kurs masih bisa dicatat (RFQ tetap Closed); `t_rfq_cancel` — procurement — ketika acara yang sudah ditutup tidak akan dimenangkan.

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_rfq_create — Simpan draf RFQ <!-- transition:t_rfq_create -->

- **Jenis langkah:** tindakan operator (pembuatan); sumber kaskade (`t_pr_source` pada permintaan asalnya, bila dipilih)
- **Peran:** buyer · procurement (atom `rfq:create`)
- **Dari → ke:** ∅ → Draft
- **Operator — di mana:** `/buyer/sourcing` ("Sumber & RFQ") → tombol header **RFQ Baru** → wizard empat langkah **Tentukan Cakupan** · **Undang Pemasok** · **Syarat & Tenggat** · **Tinjau & Kirim** → **Simpan draf RFQ**. Kursi tanpa `rfq:create` melihat "Menunggu Pengadaan" di slot tombol itu, bukan tombolnya.
- **Operator — lakukan:** Pembelian mulai menyusun permintaan — apa yang dibutuhkan, dalam kategori apa, sebanyak apa — selagi masih bersifat internal. Langkah 1: opsional, pilih permintaan yang disetujui di "Ajukan dari permintaan" (data yang bisa dibawa akan terisi; langkah tinjau mencantumkan yang "Tidak dibawa"), ketik judul RFQ, pilih kategori material, centang material spesifik, ketik total kuantitas (angka saja — "mis. 2400") dan satuan, serta opsional anggaran perkiraan dalam IDR. Langkah 2: centang pemasok yang diundang; langkah ini menolak maju selama himpunan undangan akan gagal diterbitkan (undangan tidak layak, atau kurang dari dua undangan layak tanpa pengecualian) dan pemberitahuan yang sama dengan yang akan diberikan langkah terbit ditampilkan di sini, selagi daftar masih bisa diubah. Langkah 3: tenggat respons, tenggat pemenangan (harus setelah tenggat respons), Incoterms, syarat pembayaran, mata uang. Langkah 4: tinjau dan tekan Simpan draf RFQ. Toast: "RFQ-2026-9xx disimpan sebagai draf · Belum dikirim — terbitkan untuk membukanya ke N pemasok yang diundang".
- **Operator — isi:** judul (`title`), kategori material (`materialCategory`) dan total kuantitas (`totalQty`) wajib menurut mesin; wizard juga mewajibkan minimal satu material, himpunan undangan yang sah, dan kedua tenggat. Kuantitas dan anggaran melewati satu parser: kuantitas kosong, bukan angka, atau "2.400" yang ambigu ditolak dengan pesannya sendiri; anggaran kosong disimpan sebagai tidak ada ("Tidak ditentukan"), bukan Rp 0.
- **Penguji — status yang diharapkan:** Draft
- **Penguji — konfirmasi:** baris baru muncul di papan (hanya terlihat di tab **Semua** — Draft tidak cocok dengan grup lain), dengan nomor yang ditetapkan store dalam rentang `RFQ-2026-9xx` dan pil status **Draf**; membukanya menampilkan **Terbitkan RFQ** dan **Batalkan RFQ** di bawah "Tindakan siklus hidup" serta pemberitahuan gerbang pemasok pilihan untuk acara itu. Di sisi pemasok belum ada yang muncul: pembacaan pemasok mengecualikan Draft. Jika permintaan dipilih, `/buyer/purchase-requisition` kini menampilkan permintaan itu di **Sourcing Event** dengan nomor RFQ baru sebagai dokumen tertautnya.
- **Penguji — peristiwa pemicu:** `t_rfq_create` (dan, bila diajukan dari permintaan yang disetujui, `t_pr_source` berkaskade pada permintaan itu dengan `causationId` = correlationId pembuatan)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib. Cakupan: pembuatan RFQ adalah tindakan pembeli — kursi pemasok ditolak `SCOPE_DENIED` sebelum gerbang peran, karena target RFQ tidak punya pemilik pemasok. Gerbang wizard sendiri menghentikan sebagian besar masukan buruk lebih dulu: kuantitas yang tak terbaca menghasilkan "RFQ tidak dibuat — periksa angkanya".
- **Glosarium:** `MISSING_FIELDS`, `SCOPE_DENIED`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`.
- **Kejujuran:** Menyimpan tidak mengirim apa pun — labelnya dulu terbaca seolah mengirim dan sudah dikoreksi. Daftar undangan ditulis sekali, saat pembuatan; tidak ada verba yang menambah atau menghapus undangan sesudahnya, itulah sebabnya wizard menolak himpunan yang tak dapat diterbitkan di langkah 2 alih-alih membiarkan penerbitan menolaknya nanti. Material yang dipilih tanpa kode master tidak menaruh kode apa pun pada acara: acara itu lalu tidak dapat diperiksa untuk pengecualian pemasok pilihan dan akan memerlukan tender kompetitif (wizard mengatakannya dan menawarkan untuk mengajukan permintaan material setelah RFQ ada). Platform sendiri mengajukan satu Draft lewat verba ini saat boot — `RFQ-2026-901`, acara milik seed permintaan material — itulah sebabnya sesi baru sudah menampilkan sebuah Draft yang tidak ada di berkas fixture.
<!-- src: src/services/transitions/flows/rfq.flow.ts:58-67; src/pages-v2/BuyerSourcing.tsx:1067-1069; src/pages-v2/BuyerSourcing.tsx:1660-1698; src/pages-v2/BuyerSourcing.tsx:1699-1760; src/pages-v2/BuyerSourcing.tsx:2676-2723; src/pages-v2/sourcing/rfqCreateModel.ts:363-463; src/services/query/commandHooks.ts:355-370; src/services/data/mock/MockCommandService.ts:535-586; src/services/data/mock/MockCommandService.ts:2893-2934; src/services/transitions/cascades.ts:54-56; src/services/transitions/flows/purchaseRequisition.flow.ts:162-176; src/services/data/mock/MockProcurementService.ts:299-328; src/lib/i18n/sourcing.ts:435-438; src/lib/i18n/sourcing.ts:633-666; src/lib/i18n/sourcing.ts:768-781; src/services/data/mock/materialRequestSeed.ts:76-85; src/services/data/mock/materialRequestSeed.ts:183-190; src/main.tsx:99-108 -->

### t_rfq_publish — Terbitkan RFQ <!-- transition:t_rfq_publish -->

- **Jenis langkah:** tindakan operator
- **Peran:** buyer · procurement (atom `rfq:publish`)
- **Dari → ke:** Draft → Open
- **Operator — di mana:** `/buyer/sourcing` → buka Draft → "Tindakan siklus hidup" → **Terbitkan RFQ**. Kursi tanpa atom melihat "Menunggu Pengadaan" di slot itu (`handoff-rfq-publish`); slot itu hanya ada pada Draft.
- **Operator — lakukan:** Menyodorkan permintaan itu kepada para pemasok yang diundang. Sebelum ini tidak ada yang terlihat oleh mereka, jadi inilah saat pengadaan benar-benar dimulai. Baca dulu pemberitahuan gerbang di panel — ia menyebut apakah acara memerlukan tender kompetitif, apakah tepat berada di ambang ("Dua pemasok yang memenuhi syarat diundang. Tiga adalah standar untuk acara kompetitif."), atau apakah status pemasok pilihan tidak dapat diperiksa — lalu tekan Terbitkan RFQ. Toast: "RFQ-… diterbitkan · Kini terbuka untuk N pemasok yang diundang."
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Open
- **Penguji — konfirmasi:** pil berbunyi **Terbuka** dan baris berpindah dari Draft (hanya di Semua) ke tab **Terbuka** (atau **Menunggu Pemenangan** bila fixture sudah mencatat semua undangan telah merespons); "Tindakan siklus hidup" di panel kini hanya menampilkan **Batalkan RFQ**; langkah "Dikirim ke N pemasok" di lini masa selesai. Di sisi pemasok, `/supplier/rfqs` ("Acara Sourcing Saya") → **Acara terbuka** milik setiap pemasok yang diundang kini mencantumkan acara itu dengan **Kirim penawaran**.
- **Penguji — peristiwa pemicu:** `t_rfq_publish`
- **Pemeriksaan yang dapat menolak:** dua hook, dievaluasi dalam urutan ini. `rfq_publish_invitees_eligible` — setiap pemasok yang diundang harus berada dalam status yang boleh diundang; hari ini satu-satunya status yang menolak adalah **Suspended** (pemasok Onboarding boleh menawar), dan id pemasok yang tidak ada di roster tidak ditolak dan tidak dihitung. Penolakan berbunyi `INVITEE_NOT_ELIGIBLE: <id pemasok> (Suspended) may not be invited to a sourcing event`. `rfq_publish_competition` — setelah kelayakan, acara harus punya minimal **2 undangan layak** kecuali ada pengecualian; daftar pemasok pilihan **Mandatory** atau **Sole Source** yang berlaku, dipegang oleh pemasok mana pun yang diundang untuk material mana pun pada acara, menghapus keharusan itu. Penolakan berbunyi `COMPETITION_UNDER_FLOOR: N eligible supplier(s) invited, a competitive event needs at least 2`. Tepat dua diizinkan dengan catatan bahwa tiga adalah standar; acara yang kode materialnya tidak dikenal daftar mana pun tidak ditolak — pengecualiannya tak dapat diputuskan dan acara sekadar ditenderkan.
- **Glosarium:** `INVITEE_NOT_ELIGIBLE`, `COMPETITION_UNDER_FLOOR`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Penerbitan adalah yang membuat acara terlihat; tidak ada kolom lain yang berubah. Tidak ada ambang nilai di mana pun dalam pohon kode, sehingga setiap acara yang tidak dikecualikan memerlukan kompetisi berapa pun nilainya. `rfq-008` (RFQ-2026-008) adalah Draft tanpa undangan dan sengaja dipertahankan sebagai spesimen draf yang tidak dapat diterbitkan — penolakannya `COMPETITION_UNDER_FLOOR` dengan 0 layak, dan tidak ada verba yang bisa menambahkan undangan. `rfq-014` (RFQ-2026-014) terbit dengan pemberitahuan bahwa tender kompetitif tidak diperlukan, karena sup-005 memegang daftar Mandatory yang berlaku untuk `AI-NIAC-6601` dan diundang. Pengecualian diputuskan sama baik daftar itu sudah maupun belum dipublikasikan ke pemasok; pemberitahuan secara terpisah menyebut apakah pemasok sudah diberi tahu.
<!-- src: src/services/transitions/flows/rfq.flow.ts:84-96; src/services/transitions/policies.ts:957-997; src/services/data/rfqSourcingGate.ts:82-118; src/services/data/rfqSourcingGate.ts:171-185; src/services/data/rfqSourcingGate.ts:252-287; src/services/data/rfqSourcingGate.ts:318-365; src/pages-v2/BuyerSourcing.tsx:1265-1314; src/pages-v2/BuyerSourcing.tsx:3175-3183; src/pages-v2/BuyerSourcing.tsx:3308-3326; src/components/v2-features/PslGateNotice.tsx:79-162; src/lib/i18n/psl.ts:342-351; src/lib/i18n/sourcing.ts:615-616; src/lib/i18n/sourcing.ts:773-778; src/services/data/mock/MockProcurementService.ts:299-328; src/data/mockRfqs.ts:243-262; src/data/mockRfqs.ts:471-530; src/data/mockSuppliers.ts:361-368; src/services/data/mock/pslSeed.ts:209-218; src/lib/glossary/refusals.glossary.ts:244-252 -->

### t_rfq_close — Jendela tanggapan berakhir (dinyatakan, tidak dipicu) <!-- transition:t_rfq_close -->

- **Jenis langkah:** tidak aktif (tanpa pemanggil) — dinyatakan terhitung
- **Peran:** automation (atom `rfq:close`; tidak ada jalur manusia yang memegangnya)
- **Dari → ke:** Open → Closed
- **Operator — di mana:** tidak ditawarkan di mana pun hari ini. Tidak ada yang menekan ini di portal, dan tidak ada apa pun di platform yang memicunya.
- **Operator — lakukan:** Jendela tanggapan berakhir. Penawaran yang terlambat tidak ikut dibandingkan, dan itulah yang membuat perbandingannya adil bagi semua yang menjawab tepat waktu. Di mesin ini adalah lewatnya tenggat pemenangan; dimodelkan sebagai langkah sistem karena jam tidak boleh berada di dalam tabel transisi (hukum 0.5) — dan tidak ada penjadwal atau peristiwa batas yang tersambung untuk memicunya.
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Closed — tidak dapat dicapai dari Open di build ini.
- **Penguji — konfirmasi:** tidak ada RFQ Open yang menjadi Closed dengan sendirinya; dua fixture Closed (`rfq-004`, `rfq-005`) di-seed sebagai Closed. Kolom tenggat di papan pembeli menampilkan "Nh terlambat" pada setiap acara Open yang di-seed pada masa kini yang dinyatakan, dan statusnya tetap **Open**. Lini masa panel menampilkan langkah "Ditutup" hanya untuk acara Closed atau Cancelled.
- **Penguji — peristiwa pemicu:** `t_rfq_close` (tidak pernah terpicu hari ini)
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib — dan perannya adalah grant otomasi, yang tak dapat dipegang orang.
- **Glosarium:** tidak ada yang khusus; halaman alur proses menandai langkah ini sebagai terhitung.
- **Kejujuran:** Karena tidak ada yang menutup acara, delapan RFQ Open yang di-seed hanya bisa meninggalkan Open dengan seseorang memenangkan atau membatalkannya. Pembacaan "terlambat" diturunkan saat dibaca terhadap masa kini yang dinyatakan (31 Agu 2026) dan tidak pernah disimpan; ia tidak mengubah status. Komentar di berkas flow sendiri mengatakan permukaan menawarkan Pemenangan "dari Open DAN Closed" karena celah ini — hasil pengukuran: panel pemenangan hanya dirender pada acara Open (lihat langkah pemenangan), jadi fixture Closed dibuka kembali dulu.
<!-- src: src/services/transitions/flows/rfq.flow.ts:100-117; _derived/surfaces.md:25; src/pages-v2/BuyerSourcing.tsx:2902-2918; src/pages-v2/BuyerSourcing.tsx:632-660; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/data/mockRfqs.ts:159-198 -->

### t_rfq_award — Menangkan penawaran yang dipilih <!-- transition:t_rfq_award -->

- **Jenis langkah:** tindakan operator; sumber kaskade (`t_quotation_award` pada pemenang, `t_quotation_reject` pada setiap penawaran lain di acara itu)
- **Peran:** buyer · procurement (atom `rfq:award`)
- **Dari → ke:** Open, Closed → Awarded (permukaan menawarkannya dari Open saja)
- **Operator — di mana:** `/buyer/sourcing` → buka RFQ → "Perbandingan penawaran" → centang **Menangkan** pada kolom satu penawaran → bagian "Tindakan pemenangan" → **Menangkan yang dipilih**. Bagian itu hanya muncul bila RFQ berstatus Open, setiap pemasok yang diundang tercatat telah merespons, dan minimal ada satu penawaran; sebelum satu penawaran dicentang ia berbunyi "Pilih penawaran di atas untuk mengaktifkan tindakan pemenangan." Kursi tanpa `rfq:award` melihat "Menunggu Pengadaan" di slot tombol (`handoff-rfq-award`).
- **Operator — lakukan:** Pembelian memilih penawaran pemenang dan mencatat alasannya. Semua yang ikut menawar tahu posisinya, lewat satu tindakan, bukan lewat kabar burung. Bandingkan penawaran pada baris kriteria (harga satuan, harga total, waktu tunggu — bertanda "Perkiraan" —, kuantitas pesanan minimum, syarat pembayaran, kepatuhan, skor, komposit), perhatikan kolom "Peringkat teratas", centang yang dipilih dan tekan Menangkan yang dipilih. Toast: "RFQ-… dimenangkan · <pemasok> dimenangkan — penawaran lain ditolak."
- **Operator — isi:** tidak ada yang diketik; centangan memasok dua kolom wajib, id penawaran (`awardedQuotationId`) dan pemasoknya (`awardedSupplierId`).
- **Penguji — status yang diharapkan:** Awarded
- **Penguji — konfirmasi:** panel tertutup; baris berpindah ke tab **Dimenangkan** dan "Riwayat Pemenangan" mencantumkannya dengan pemasok pemenang; membuka panel lagi menampilkan "Ringkasan pemenangan" (Dimenangkan oleh, Nilai yang dimenangkan, Tanggal pemenangan, PO diterbitkan) tanpa tindakan siklus hidup. Penawaran diturunkan ulang dalam pembacaan yang sama: yang dipilih berbunyi **Awarded**, setiap saudaranya **Rejected**. Di sisi pemasok, `/supplier/rfqs` → **Pemenangan & riwayat** menampilkan "Dimenangkan — penawaran Anda dipilih" untuk pemenang dan "Tidak dimenangkan — penawaran lain dipilih" untuk yang lain, dengan "PO diterbitkan —".
- **Penguji — peristiwa pemicu:** `t_rfq_award`, diikuti satu event `t_quotation_award` dan N−1 event `t_quotation_reject` yang `causationId`-nya adalah correlationId pemenangan
- **Pemeriksaan yang dapat menolak:** `rfq_award_awardee_integrity` — penawaran yang disebut harus diajukan oleh pemasok yang disebut, dan pemasok itu harus ada di daftar undangan. Penolakan berbunyi `AWARDEE_NOT_THE_QUOTING_SUPPLIER: the award names <pemasok>, but <penawaran> was submitted by <pemasok lain>` (atau "(no such quotation)") dan `AWARDEE_NOT_INVITED: <pemasok> was not invited to this event`. Permukaan selalu mengirim pasangan yang cocok, jadi keduanya hanya mengena pada dispatch buatan tangan; toast lalu berbunyi "Pemenangan gagal" dengan remedi dari glosarium.
- **Glosarium:** `AWARDEE_NOT_THE_QUOTING_SUPPLIER`, `AWARDEE_NOT_INVITED`, `POLICY_REJECTED`, `ILLEGAL_TRANSITION`, `FX_UNPINNED`, `FX_STALE`.
- **Kejujuran:** Pemenangan mencatat penawaran dan pemasok terpilih pada RFQ dan **tidak mencetak purchase order maupun kontrak**; kolom "PO diterbitkan" di sisi pemasok dengan jujur berisi "—", dan "Tanggal pemenangan" di sisi pemasok adalah tenggat pemenangan RFQ, bukan saat tindakan terjadi. Kondisi bagian pemenangan tidak membaca verdict kurs: acara berbeda mata uang yang perbandingannya berbunyi "Tidak diperingkat" tetap bisa dimenangkan, atas penawaran yang ditampilkan sesuai yang diajukan. "Semua pemasok merespons" dibaca dari daftar respons milik RFQ sendiri, yang **tidak** diperbarui oleh pengiriman penawaran langsung dari pemasok — jadi acara yang dijawab saat runtime tidak menjadi dapat dimenangkan lewat jalur itu (temuan terdaftar). Acara Closed tidak punya panel pemenangan dan dibuka kembali dulu. Kaskade didispatch ulang di bawah grant otomasi di dalam `catch {}` upaya-terbaik; saudara yang sudah berada di status terminal ditolak `ILLEGAL_TRANSITION` — tercatat, tidak pernah merusak pemenangan.
<!-- src: src/services/transitions/flows/rfq.flow.ts:123-136; src/services/transitions/policies.ts:1000-1023; src/services/data/rfqSourcingGate.ts:402-452; src/pages-v2/BuyerSourcing.tsx:366-368; src/pages-v2/BuyerSourcing.tsx:1181-1226; src/pages-v2/BuyerSourcing.tsx:3728-3794; src/pages-v2/SupplierRFQs.tsx:163-195; src/pages-v2/SupplierRFQs.tsx:786-796; src/services/query/commandHooks.ts:386-406; src/services/data/mock/MockCommandService.ts:485-500; src/services/data/mock/MockCommandService.ts:2935-2953; src/services/transitions/cascades.ts:57-60; src/services/transitions/dispatcher.ts:838-907; src/lib/i18n/sourcing.ts:512-517; src/lib/i18n/sourcing.ts:607-612; src/lib/i18n/sourcing.ts:746-752; src/lib/i18n/rfqs.ts:262-273; src/lib/glossary/refusals.glossary.ts:253-259 -->

### t_rfq_fx_pin — Catat dasar kurs <!-- transition:t_rfq_fx_pin -->

- **Jenis langkah:** mencatat fakta (mempertahankan status)
- **Peran:** buyer · procurement (atom `rfq:fx-pin`, sengaja dibedakan dari `rfq:award`)
- **Dari → ke:** Open, Closed → status sama
- **Operator — di mana:** `/buyer/sourcing` → buka RFQ → "Dasar kurs" (di dalam perbandingan penawaran) → **Catat kurs USD** (atau **Ganti kurs USD** bila sudah ada yang berlaku) → dialog "Catat kurs USD" / "Ganti kurs USD" → **Catat kurs** / **Catat kurs baru**. Kursi tanpa `rfq:fx-pin` melihat "Menunggu Pengadaan" di samping tombol Batal dialog (`handoff-rfq-fxpin`).
- **Operator — lakukan:** Mencatat dasar kurs yang dipakai membandingkan penawaran bermata uang asing, agar keputusan hari ini masih bisa dijelaskan setahun kemudian. Ketika perbandingan menolak memberi peringkat — "Tidak diperingkat — penawaran dihargai dalam USD dan belum ada kurs yang dicatat untuk RFQ ini" atau "… kurs tercatat untuk USD (per <tanggal>) lebih lama daripada yang diizinkan perbandingan ini" — buka dialog, ketik kurs sebagai "IDR per 1 USD" (angka saja, mis. 17250), isi tanggal kurs itu berlaku, pilih sumber (**Dimasukkan manual** atau **Kurs SAP**, yang terakhir dengan jenis kurs SAP opsional), lalu konfirmasi. Toast: "Kurs USD tercatat · Perbandingan kini diperingkat berdasarkan kurs itu." atau "Kurs USD baru tercatat · Kurs sebelumnya tetap tersimpan pada RFQ; perbandingan kini memakai kurs baru."
- **Operator — isi:** mata uang yang dikonversi (`quote`: USD atau EUR — tidak pernah IDR, mata uang dasar), kurs (`rate`, bilangan hingga di atas nol), tanggal kurs (`asOf`, tanggal terbaca yang bukan masa depan) dan sumber (`source`: `MANUAL` atau `SAP_EXHGRATE`). Dialog menonaktifkan tombolnya sendiri pada isian kosong, bukan angka, ambigu ("17.250"), nol, tanggal kosong, tanggal tak terbaca, atau tanggal masa depan, masing-masing dengan pesannya sendiri.
- **Penguji — status yang diharapkan:** tidak berubah (Open tetap Open; Closed tetap Closed)
- **Penguji — konfirmasi:** blok "Dasar kurs" kini menampilkan kurs, "per <tanggal>", sumbernya, dan — setelah penggantian — "1 kurs sebelumnya disimpan"; perbandingan memberi peringkat dan kolom "Peringkat teratas" muncul. Gunakan `rfq-012` (RFQ-2026-012: satu penawaran IDR, satu USD, tanpa catatan kurs) untuk melihat `FX_UNPINNED` lalu catat kurs; gunakan `rfq-013` (RFQ-2026-013: dua catatan kurs bertanggal 9 dan 16 Mei 2026) untuk melihat `FX_STALE` pada masa kini yang dinyatakan lalu menggantinya.
- **Penguji — peristiwa pemicu:** `t_rfq_fx_pin`
- **Pemeriksaan yang dapat menolak:** `rfq_fx_pin_well_formed` — mata uang quote harus mata uang penawaran yang diizinkan (IDR, USD, EUR) dan bukan IDR sebagai dasar ("IDR is the comparison base — it has no rate to pin"); kurs harus bilangan hingga lebih besar dari 0; `asOf` harus tanggal terbaca; `source` harus `MANUAL` atau `SAP_EXHGRATE`. Setiap cabang sudah ditolak oleh dialog; hook adalah kembaran strukturalnya.
- **Glosarium:** `FX_UNPINNED`, `FX_STALE`, `EMPTY_QTY`, `NOT_NUMERIC`, `AMBIGUOUS_QTY`, `POLICY_REJECTED`.
- **Kejujuran:** Catatan kurs **ditambahkan, tidak pernah disunting**: buku besar pada RFQ menyimpan setiap kurs yang pernah dicatat, kurs yang berlaku diturunkan sebagai yang paling baru dicatat untuk mata uang itu, dan "Ganti" adalah satu-satunya cara memindahkan kurs. Kedaluwarsa diukur dari tanggal kurs itu sendiri, bukan dari kapan dicatat: kurs yang lebih tua dari **7 hari** pada saat dibaca menolak `FX_STALE`, itulah sebabnya catatan kurs `rfq-013` yang di-seed sengaja kedaluwarsa dan hasil berperingkat dicapai dengan mencatat kurs terkini. Setiap catatan — manual maupun berlabel SAP — disimpan dengan liveness `SIMULATED`; tidak ada umpan kurs yang tersambung. Cap waktu pencatatan ditetapkan store. Acara satu mata uang tidak pernah memerlukan catatan kurs.
<!-- src: src/services/transitions/flows/rfq.flow.ts:156-170; src/services/transitions/policies.ts:208-248; src/pages-v2/BuyerSourcing.tsx:1128-1180; src/pages-v2/BuyerSourcing.tsx:3898-3978; src/pages-v2/sourcing/fxRateInput.ts:39-76; src/services/query/commandHooks.ts:413-456; src/services/data/mock/MockCommandService.ts:501-532; src/lib/fxPin.ts:100-140; src/lib/currencyPolicy.ts:38-49; src/lib/currencyPolicy.ts:60-80; src/lib/quoteScore.ts:246-270; src/lib/i18n/sourcing.ts:518-572; src/data/mockRfqs.ts:355-470; src/lib/glossary/refusals.glossary.ts:155-165 -->

### t_rfq_cancel — Batalkan RFQ <!-- transition:t_rfq_cancel -->

- **Jenis langkah:** tindakan operator (jalur pengecualian)
- **Peran:** buyer · procurement (atom `rfq:cancel`)
- **Dari → ke:** Draft, Open, Closed → Cancelled
- **Operator — di mana:** `/buyer/sourcing` → buka RFQ → "Tindakan siklus hidup" → **Batalkan RFQ** (ditawarkan pada Draft, Open dan Closed; tidak ada pada Awarded dan Cancelled). Kursi tanpa atom melihat "Menunggu Pengadaan" di slot itu (`handoff-rfq-cancel`).
- **Operator — lakukan:** Pembelian membatalkan acaranya sebelum memilih siapa pun — kebutuhannya berubah, atau anggarannya hilang. Tekan Batalkan RFQ; tidak ada langkah konfirmasi dan tidak ada kolom alasan. Toast: "RFQ-… dibatalkan · Acara sumber telah dibatalkan."
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Cancelled
- **Penguji — konfirmasi:** panel tertutup; baris muncul di tab **Ditutup** (tab itu mengelompokkan Closed dan Cancelled bersama) dengan pil **Dibatalkan**; membuka lagi tidak menampilkan tindakan siklus hidup, dan lini masa menampilkan langkah "Ditutup". Tidak ada fixture yang di-seed sebagai Cancelled, jadi batalkan salah satu Draft (`rfq-008`) atau acara Open untuk melihatnya.
- **Penguji — peristiwa pemicu:** `t_rfq_cancel`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Kalimat tujuannya menyebut para pemasok "diberi tahu, bukan dibiarkan menunggu"; di build ini tidak ada yang memberi tahu mereka. Pembatalan tidak berkaskade: penawaran pada acara yang dibatalkan mempertahankan statusnya, sehingga penawaran pemasok tetap berbunyi **Sedang Ditinjau** di "Penawaran Saya", dan acara yang dibatalkan sekadar hilang dari daftar Acara terbuka mereka (tab itu hanya menampilkan Open). Draft yang belum pernah diterbitkan dapat dibatalkan tanpa pernah dilihat pemasok mana pun.
<!-- src: src/services/transitions/flows/rfq.flow.ts:173-182; src/pages-v2/BuyerSourcing.tsx:1318-1350; src/pages-v2/BuyerSourcing.tsx:3278-3290; src/pages-v2/BuyerSourcing.tsx:3348-3363; src/pages-v2/BuyerSourcing.tsx:883-892; src/services/query/commandHooks.ts:477-494; src/services/transitions/cascades.ts:24-86; src/pages-v2/SupplierRFQs.tsx:1543; src/lib/i18n/sourcing.ts:617-618; src/lib/i18n/sourcing.ts:756-760 -->

### t_rfq_reopen — Buka kembali RFQ yang ditutup <!-- transition:t_rfq_reopen -->

- **Jenis langkah:** tindakan operator (jalur pengecualian)
- **Peran:** buyer · procurement (atom `rfq:reopen`)
- **Dari → ke:** Closed → Open
- **Operator — di mana:** `/buyer/sourcing` → tab **Ditutup** → buka RFQ → "Tindakan siklus hidup" → **Buka kembali RFQ** (ditawarkan pada Closed saja; eksklusif-status dengan Terbitkan). Kursi tanpa atom melihat "Menunggu Pengadaan" di slot itu (`handoff-rfq-reopen`).
- **Operator — lakukan:** Membuka kembali acara yang sudah berakhir untuk tanggapan tambahan — jawabannya terlalu sedikit, atau kebutuhannya bergeser. Permintaan yang sama dipakai ulang alih-alih membuat yang baru. Tekan Buka kembali RFQ. Toast: "RFQ-… dibuka kembali · Acara sumber kembali terbuka untuk penawaran."
- **Operator — isi:** tidak ada yang diisi.
- **Penguji — status yang diharapkan:** Open
- **Penguji — konfirmasi:** panel tertutup; baris meninggalkan tab Ditutup menuju **Terbuka** atau **Menunggu Pemenangan** (kedua acara Closed yang di-seed mencatat semua undangan telah merespons, jadi keduanya mendarat di Menunggu Pemenangan); membuka panel lagi kini menawarkan Batalkan RFQ dan, karena semua undangan telah merespons, bagian "Tindakan pemenangan". Pemasok yang diundang melihat acara itu lagi di Acara terbuka kecuali mereka sudah menawarnya (acara yang sudah ditawar dipangkas dari tab itu).
- **Penguji — peristiwa pemicu:** `t_rfq_reopen`
- **Pemeriksaan yang dapat menolak:** tidak ada selain peran, legalitas, dan kolom wajib.
- **Glosarium:** `ILLEGAL_TRANSITION`, `ROLE_NOT_PERMITTED`.
- **Kejujuran:** Membuka kembali tidak menggeser tenggat respons maupun tenggat pemenangan — keduanya tetap sesuai yang ditulis (Maret 2026 pada kedua fixture), jadi acara yang dibuka kembali langsung terbaca terlambat. Karena permukaan hanya memenangkan dari Open, membuka kembali adalah jalur praktis untuk memenangkan fixture Closed (`rfq-004` RFQ-2026-004, `rfq-005` RFQ-2026-005).
<!-- src: src/services/transitions/flows/rfq.flow.ts:185-194; src/pages-v2/BuyerSourcing.tsx:1352-1385; src/pages-v2/BuyerSourcing.tsx:3328-3347; src/pages-v2/BuyerSourcing.tsx:883-892; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/services/query/commandHooks.ts:521-536; src/pages-v2/SupplierRFQs.tsx:786-796; src/data/mockRfqs.ts:159-198; src/lib/i18n/sourcing.ts:619-620; src/lib/i18n/sourcing.ts:761-765 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Terbitkan atau batalkan (di Draft).** Cabang A — `t_rfq_publish` — **Kapan:** himpunan undangan lolos kedua gerbang (tidak ada undangan Suspended; minimal dua undangan layak, atau daftar Mandatory / Sole Source yang berlaku pada pemasok yang diundang untuk material acara). Cabang B — `t_rfq_cancel` — **Kapan:** kebutuhan hilang, atau draf tidak akan pernah bisa diterbitkan — `rfq-008` tidak punya undangan dan tidak ada verba yang bisa menambahkannya, jadi pembatalan satu-satunya jalan keluar.
- **Menangkan, catat kurs, batalkan, atau tunggu (di Open).** Cabang A — `t_rfq_award` — **Kapan:** setiap pemasok yang diundang tercatat telah merespons dan satu penawaran dipilih; pemenang dan yang kalah diputuskan dalam satu tindakan. Cabang B — `t_rfq_fx_pin` — **Kapan:** perbandingan menolak `FX_UNPINNED` atau `FX_STALE`; RFQ tetap Open dan catatan kurs ditambahkan. Cabang C — `t_rfq_cancel` — **Kapan:** acara ditinggalkan sebelum pemenangan. Cabang D — `t_rfq_close` — **Kapan:** jendela tanggapan berakhir; dinyatakan, dan tidak dipicu apa pun, sehingga acara Open menunggu seseorang.
- **Buka kembali, menangkan, catat kurs, atau batalkan (di Closed).** Cabang A — `t_rfq_reopen` — **Kapan:** tanggapan tambahan diinginkan, atau pembeli ingin memenangkan (panel pemenangan hanya untuk Open di permukaan). Cabang B — `t_rfq_award` — sah di mesin dari Closed; tidak ditawarkan di permukaan pembeli. Cabang C — `t_rfq_fx_pin` — **Kapan:** kurs dicatat pada acara Closed; status dipertahankan. Cabang D — `t_rfq_cancel` — **Kapan:** acara yang ditutup tidak akan dimenangkan.
- **Penyebaran pemenangan.** Setelah `t_rfq_award` berhasil, platform mendispatch `t_quotation_award` untuk penawaran terpilih dan `t_quotation_reject` untuk setiap penawaran lain pada acara itu, di bawah grant otomasi. Saudara yang sudah Awarded atau Rejected ditolak `ILLEGAL_TRANSITION` dan penolakan dicatat dengan `causationId` pemenangan; pemenangan itu sendiri tidak pernah dibatalkan oleh saudara yang gagal.
- **Kaskade permintaan.** Setelah `t_rfq_create` berhasil dengan `sourceRequisitionId`, platform mendispatch `t_pr_source` pada permintaan itu. **Kapan** permintaan berstatus Approved ia berpindah ke Sourcing Event dengan nomor RFQ baru sebagai dokumen tertautnya; **kapan** ia berada di status lain kaskade ditolak `ILLEGAL_TRANSITION` dan dicatat; **kapan** tidak ada permintaan yang dipilih (kasus umum) tidak ada yang didispatch.
- **Ambang kompetisi juga gerbang wizard.** Keputusan yang sama yang diambil hook penerbitan dirender di langkah 2 wizard dan di panel: undangan tidak layak atau kurang dari dua undangan layak menghentikan langkah untuk maju (kotak centang tetap aktif agar himpunannya bisa dibetulkan); tepat dua maju dengan catatan bahwa tiga adalah standar; acara yang dikecualikan maju dengan satu undangan.

<!-- src: src/services/transitions/flows/rfq.flow.ts:20-196; src/pages-v2/BuyerSourcing.tsx:1660-1698; src/pages-v2/BuyerSourcing.tsx:3756-3759; src/services/data/mock/MockCommandService.ts:2893-2956; src/services/transitions/dispatcher.ts:838-907; src/services/data/rfqSourcingGate.ts:318-365 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| **Tenggat: "Nh terlambat" / "Jatuh tempo hari ini" / "Nh tersisa"** | berbasis waktu, diturunkan saat dibaca (terhadap masa kini yang dinyatakan, 31 Agu 2026) | Open (setiap baris non-terminal) | tenggat respons sebelum / pada / setelah masa kini yang dinyatakan; setiap acara Open yang di-seed terbaca terlambat | kolom "Tenggat respons" di papan pembeli, diwarnai menurut kedekatan; KPI "Menunggu Respons — Tenggat dalam 7 hari" |
| **"N hari tersisa" (mendesak di bawah 7)** | berbasis waktu, diturunkan saat dibaca (terhadap jam peramban, dibatasi di 0) | Open, pada kartu pemasok | hari menuju tenggat respons; tenggat yang sudah lewat dirender "0 hari tersisa" | `/supplier/rfqs` → Acara terbuka → pil kartu |
| **Menunggu Pemenangan / Siap Dimenangkan** | diturunkan | Open | setiap pemasok yang diundang tercatat di daftar respons RFQ | tab papan pembeli **Menunggu Pemenangan**; KPI "Siap Dimenangkan — Semua pemasok merespons"; bagian "Tindakan pemenangan" |
| **Tender kompetitif tidak diperlukan** | diturunkan (daftar pemasok pilihan, berlaku pada masa kini yang dinyatakan) | Draft (langkah 2 wizard, panel), Open | pemasok yang diundang memegang daftar Mandatory atau Sole Source yang berlaku untuk material acara | `PslGateNotice` di panel dan di wizard, menyebut pemasok, status dan kode, serta apakah pemasok sudah diberi tahu |
| **Di ambang** | diturunkan | Draft | tepat dua undangan layak | pemberitahuan yang sama: "Dua pemasok yang memenuhi syarat diundang. Tiga adalah standar untuk acara kompetitif." |
| **Di bawah ambang / undangan tidak layak** | diturunkan, ditolak saat terbit | Draft | kurang dari dua undangan layak; undangan Suspended | pemberitahuan (langkah 2 wizard tidak bisa maju); toast "Penerbitan gagal" dengan remedi |
| **Status tidak dapat diperiksa** | diturunkan | Draft, Open | kode material acara tidak dikenal daftar mana pun (atau acara tanpa kode) | pemberitahuan: "…tidak dapat diperiksa untuk acara ini: <kode>. Acara akan ditenderkan seperti biasa." |
| **Tidak diperingkat — `FX_UNPINNED` / `FX_STALE`** | diturunkan saat dibaca | Open, Closed | penawaran dalam lebih dari satu mata uang tanpa kurs tercatat, atau kurs lebih tua dari 7 hari | header perbandingan penawaran; blok "Dasar kurs" dengan **Catat / Ganti kurs** |
| **Perkiraan** (waktu tunggu) | penanda kejujuran | semua | selalu, pada baris waktu tunggu | tanda pada baris "Waktu Tunggu" perbandingan: "Bersifat indikatif pada tahap penawaran — pemasok mengonfirmasi tanggal pengiriman pasti saat PO." |
| **Simulasi** (kepatuhan, keandalan) | penanda kejujuran | semua | selalu, pada dua baris skor bersumber eksternal | perbandingan penawaran: "Latihan — menunggu sumber langsung (data kepatuhan & keandalan)" |
| **Menunggu Pengadaan** | handoff turunan | di mana pun verba sah tetapi kursi tidak memegang atomnya | kursi tanpa `rfq:create` / `rfq:publish` / `rfq:reopen` / `rfq:cancel` / `rfq:award` / `rfq:fx-pin` membuka permukaan | di slot tombol itu sendiri (`handoff-rfq-create`, `-publish`, `-reopen`, `-cancel`, `-award`, `-fxpin`) |
| **PARTLY REAL (penanda provenans)** | penanda kejujuran | halaman | selalu | baris meta di bawah judul halaman: pemenangan didispatch lewat target yang tersambung di atas himpunan RFQ fixture |

<!-- src: src/pages-v2/BuyerSourcing.tsx:192; src/pages-v2/BuyerSourcing.tsx:366-368; src/pages-v2/BuyerSourcing.tsx:883-892; src/pages-v2/BuyerSourcing.tsx:2724-2758; src/pages-v2/BuyerSourcing.tsx:2902-2918; src/pages-v2/SupplierRFQs.tsx:700-737; src/pages-v2/SupplierRFQs.tsx:1502; src/components/v2-features/PslGateNotice.tsx:79-162; src/lib/i18n/psl.ts:342-351; src/lib/i18n/sourcing.ts:443-450; src/lib/i18n/sourcing.ts:518-531; src/lib/i18n/sourcing.ts:573-580; src/lib/i18n/roles.ts:251; src/lib/i18n/roles.ts:277 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `rfq-003` (RFQ-2026-003, "Halal Glycerin 99.5% Kosher — Annual contract") — Open, tiga diundang, tiga merespons, tiga penawaran Under Review, semuanya dalam IDR: satu-satunya acara yang di-seed di mana panel pemenangan dapat dicapai tanpa persiapan apa pun.

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Penawaran `qt-003a` (sup-001), `qt-003b` (sup-002), `qt-003c` (sup-010) | `Quotation.rfqId` = `rfq-003` | penyebaran pemenangan membaca himpunan ini dari store: yang dicentang menjadi Awarded, dua lainnya Rejected |
| Pemasok `sup-001`, `sup-002`, `sup-010` | `invitedSupplierIds` | ditulis sekali saat pembuatan; penerbitan membuat acara terlihat tepat oleh id-id ini; sup-010 berstatus Onboarding dan tetap layak |
| `respondedSupplierIds` | kolom fixture | menggerakkan "semua merespons" di papan pembeli; tidak diperbarui oleh pengiriman penawaran saat runtime (hanya-tampilan dalam arti itu) |
| Material `RM-EMUL-3310`, `RM-EMUL-3320` | `materialIds` | kode master material nyata; pengecualian pemasok pilihan dicari lewat kode ini — tidak ada daftar yang menyebutnya, jadi acara ditenderkan |
| Daftar pemasok pilihan | pemasok × kode material, berlaku pada masa kini yang dinyatakan | dibaca oleh gerbang penerbitan dan pemberitahuan panel; di-seed saat boot, tidak ada pada RFQ ini |
| `awardedQuotationId`, `awardedSupplierId` | ditulis oleh `t_rfq_award` | metadata pemenangan saja; tidak ada yang dibuat di hilir |
| `fxPins` | ditambahkan oleh `t_rfq_fx_pin` | tidak ada pada RFQ ini (satu mata uang); ada pada `rfq-013` (dua catatan kurs) |
| `estimatedValue`, `incoterms`, `paymentTerms`, `currency` (`IDR`), `responseDeadline`, `awardDeadline`, `buyerId` | kolom fixture / wizard | hanya-tampilan setelah pembuatan — tidak ada verba yang menyunting syarat, material, atau undangan sebuah RFQ |
| Permintaan pembelian (opsional) | `sourceRequisitionId` di payload pembuatan → `PurchaseRequisition.linkedDoc` | hanya untuk RFQ yang diajukan dari permintaan yang disetujui; `rfq-003` tidak memilikinya |

<!-- src: src/data/mockRfqs.ts:49-89; src/data/mockRfqs.ts:139-158; src/data/mockQuotations.ts:149-204; src/services/data/mock/stores/quotationStore.ts:84-87; src/services/data/mock/MockCommandService.ts:485-532; src/services/data/mock/MockCommandService.ts:2893-2956; src/services/data/rfqSourcingGate.ts:252-287; src/pages-v2/SupplierRFQs.tsx:786-796 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all` untuk kursi pembeli (setiap verba RFQ adalah verba pembeli), `ts`, `outcome` (`done` / `failed`), `correlationId` (`cmd_…`), dan `causationId` pada event berkaskade — correlationId perintah yang menyebabkannya. Penyebaran pemenangan berjalan di bawah grant otomasi dengan cakupan pembeli yang sama, sehingga event-nya juga membawa `actor` = `buyer:all`, dapat dibedakan dari pemenangan hanya lewat `causationId`-nya dan ketiadaan atribusi. Event `failed` membawa `reason` penolakan. Tindakan manusia juga membawa atribusi aktor sesi, yang di build ini selalu `UNATTRIBUTED: NO_PERSON_IN_SESSION`. Urutan kerja untuk `rfq-003`, sebagaimana akan dihasilkan seorang penguji:

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Event |
|---|---|---|---|---|
| T+0 | (seed) Open; tiga penawaran Under Review | — | fixture, tanpa event | — |
| T+1 | Open → Open (status dipertahankan) | buyer · procurement (`buyer:all`) | tidak diperlukan di sini — satu mata uang; pada `rfq-012` ini adalah **Catat kurs USD** | `t_rfq_fx_pin` (hanya pada acara beda mata uang) |
| T+2 | Open → Awarded; `awardedQuotationId` = `qt-003a`, `awardedSupplierId` = `sup-001` | buyer · procurement (`buyer:all`) | centang **Menangkan** pada `qt-003a` → **Menangkan yang dipilih** | `t_rfq_award` |
| T+2 | penawaran `qt-003a`: Under Review → Awarded | automation (`buyer:all`, kaskade) | penyebaran pemenangan | `t_quotation_award` (`causationId` = correlationId pemenangan) |
| T+2 | penawaran `qt-003b`, `qt-003c`: Under Review → Rejected | automation (`buyer:all`, kaskade) | penyebaran pemenangan | `t_quotation_reject` × 2 (`causationId` sama) |
| (alt.) T+2′ | Open → Cancelled | buyer · procurement | **Batalkan RFQ** | `t_rfq_cancel` (tanpa kaskade; ketiga penawaran tetap Under Review) |
| (alt., sebuah Draft) T+0″ | ∅ → Draft | buyer · procurement | wizard → **Simpan draf RFQ** | `t_rfq_create` (+ `t_pr_source` pada permintaan yang dipilih, bila ada) |
| (alt., sebuah Draft) T+1″ | Draft → Open | buyer · procurement | **Terbitkan RFQ** | `t_rfq_publish` |

<!-- src: src/services/transitions/events.ts:26-61; src/services/transitions/events.ts:127-129; src/services/transitions/dispatcher.ts:453-532; src/services/transitions/dispatcher.ts:838-907; src/services/data/mock/MockCommandService.ts:2935-2953 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengetahui | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tombol diganti oleh "Menunggu Pengadaan" | pemberitahuan berada di slot tombol | kursi Anda tidak memegang atom verba itu (`ROLE_NOT_PERMITTED` bila tetap didispatch); ketujuh atom RFQ milik procurement | kursi procurement yang melakukannya; panel identitas menampilkan peran kursi Anda |
| Langkah 2 wizard tidak mau maju | pemberitahuan gerbang di bawah daftar pemasok menyebut undangan tidak layak atau "memerlukan setidaknya 2 pemasok yang memenuhi syarat" | undangan Suspended, atau kurang dari dua undangan layak tanpa pengecualian | hapus centang pemasok Suspended / centang pemasok layak lain; acara yang dikecualikan tidak memerlukan ambang |
| "Penerbitan gagal" | toast menyebut `INVITEE_NOT_ELIGIBLE` atau `COMPETITION_UNDER_FLOOR` (`POLICY_REJECTED:rfq_publish_…`) | himpunan undangan draf gagal di gerbang — `rfq-008` tidak punya undangan | tidak ada verba yang menyunting daftar undangan; batalkan draf dan ajukan yang baru |
| "RFQ tidak dibuat — periksa angkanya" | toast menyebut aturan kuantitas atau anggaran | kuantitas kosong / bukan angka / ambigu ("2.400"); anggaran bukan angka atau ambigu | ketik angka saja, mis. 2400 |
| Pembuatan ditolak dengan pesan cakupan | "di luar jangkauan akun Anda" | kursi pemasok mencoba mengajukan RFQ (`SCOPE_DENIED`: target RFQ tidak punya pemilik pemasok) | RFQ diajukan oleh pembeli |
| Tidak ada bagian "Tindakan pemenangan" pada acara Open | perbandingan menampilkan penawaran tetapi tanpa panel pemenangan | tidak semua pemasok yang diundang ada di daftar respons RFQ, atau tidak ada penawaran; pengiriman penawaran saat runtime tidak memperbarui daftar itu | gunakan fixture yang semua merespons (`rfq-003`, `rfq-009`, `rfq-012`, `rfq-013`); temuan sudah terdaftar |
| Tidak ada bagian "Tindakan pemenangan" pada acara Closed | panel hanya menawarkan Buka kembali RFQ dan Batalkan RFQ | permukaan merender panel pemenangan hanya untuk Open, meski mesin mengizinkan pemenangan dari Closed | **Buka kembali RFQ**, lalu menangkan |
| "Menangkan yang dipilih" nonaktif | prompt "Pilih penawaran di atas untuk mengaktifkan tindakan pemenangan." | belum ada penawaran yang dicentang | centang **Menangkan** pada satu kolom |
| "Pemenangan gagal" | toast dengan remedi integritas pemenang (`POLICY_REJECTED:rfq_award_awardee_integrity`) | penawaran dan pemasok di payload tidak cocok, atau pemasok tidak diundang — tak dapat dicapai dari permukaan | hanya dispatch buatan tangan; kirim pemasok milik penawaran itu sendiri |
| Perbandingan berbunyi "Tidak diperingkat — … belum ada kurs yang dicatat" | header perbandingan penawaran menyebut mata uang | penawaran beda mata uang tanpa catatan kurs (`FX_UNPINNED`) — `rfq-012` | **Catat kurs USD**; sementara itu penawaran tetap ditampilkan sesuai yang diajukan |
| Perbandingan berbunyi "Tidak diperingkat — … lebih lama daripada yang diizinkan" | header menyebut tanggal "per" kurs | catatan kurs yang berlaku lebih tua dari 7 hari saat dibaca (`FX_STALE`) — `rfq-013` pada masa kini yang dinyatakan | **Ganti kurs USD** dengan tanggal terkini; kurs lama tetap disimpan |
| Tombol dialog kurs tetap nonaktif | pesan kolom di bawah Kurs atau Tanggal kurs | kurs kosong / bukan angka / ambigu / nol; tanggal kosong, tak terbaca, atau masa depan | ketik mis. 17250; isi tanggal kurs itu berlaku |
| "Kurs tidak tercatat" | toast dengan alasan kebijakan | `rfq_fx_pin_well_formed` — mata uang quote tidak diizinkan, IDR sebagai quote, kurs tidak positif, tanggal tak terbaca, sumber tak dikenal | hanya dapat dicapai lewat dispatch buatan tangan; dialog sudah menolak masing-masing |
| "Dokumen tidak berada dalam status yang memungkinkan tindakan ini" (`ILLEGAL_TRANSITION`) | penolakan menyebut status saat ini | panel terbuka saat status berpindah, atau verba dipicu dari status yang salah | tutup dan buka kembali RFQ; bertindak dari status yang ditampilkan |
| Acara Open tidak pernah tertutup | kolom tenggat berbunyi "Nh terlambat", status tetap Open | `t_rfq_close` tidak punya pemanggil | menangkan atau batalkan secara manual |
| Pemasok tidak dapat melihat acara yang diterbitkan | tab Acara terbuka mereka kosong atau tidak memuatnya | tidak ada di `invitedSupplierIds`; masih Draft; atau sudah menawarnya (acara yang ditawar hilang dari tab Terbuka) | periksa daftar undangan di panel; terbitkan; lihat di "Penawaran Saya" |
| Penawaran pemasok masih berbunyi Sedang Ditinjau setelah RFQ dibatalkan | tab "Penawaran Saya" | pembatalan tidak berkaskade ke penawaran | bukan kesalahan mesin; pemasok tidak diberi tahu di build ini |
| "Ekspor perbandingan belum tersedia" / "Ekspor belum tersedia" / "Templat belum tersedia" | toast info menyebut tidak ada berkas atau templat yang dihasilkan | kontrol ini belum tersambung | bukan kesalahan; gunakan kanal di luar |
| `STALE_STATE` | penolakan menyebut status yang diharapkan dan yang ditemukan | pemanggil memasok `expectedState` dan dokumen berpindah | tidak ada layar pengadaan yang memasoknya hari ini; buka kembali dan putuskan lagi |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:SRC`, atau `MODULE_INACTIVE:SRC.fxPin` bila hanya *Kunci kurs* yang dinonaktifkan; bila permukaan memeriksa lebih dulu, kontrol terbaca *"Dinonaktifkan — Pengadaan & RFQ"* | modul Pengadaan & RFQ (atau salah satu bagiannya) dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin`; perubahan peran tidak membantu, karena pemeriksaan modul berjalan sebelum pemeriksaan peran |

<!-- src: src/services/transitions/refusals.ts:61-114; src/lib/glossary/refusals.glossary.ts:32-98; src/lib/glossary/refusals.glossary.ts:155-165; src/lib/glossary/refusals.glossary.ts:244-259; src/pages-v2/BuyerSourcing.tsx:1128-1385; src/pages-v2/BuyerSourcing.tsx:1660-1760; src/pages-v2/BuyerSourcing.tsx:3756-3794; src/services/transitions/policies.ts:208-248; src/services/transitions/policies.ts:957-1023; src/services/data/mock/MockCommandService.ts:470-484; src/services/data/mock/MockProcurementService.ts:299-328; src/pages-v2/SupplierRFQs.tsx:786-796; src/lib/i18n/sourcing.ts:563-572; src/lib/i18n/sourcing.ts:746-781 -->

<!-- section:testdata -->
## 9 · Data uji

Fixture bersifat SIMULASI. Tanggal RFQ adalah literal yang ditulis (keluarga RFQ tidak digeser ke masa kini yang dinyatakan), sehingga setiap tenggat respons di berkas fixture jatuh sebelum 31 Agu 2026. Satu Draft tidak ada di berkas fixture: seed permintaan material mengajukannya lewat `t_rfq_create` saat boot.

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Draft | `RFQ-2026-901`, `rfq-008`, `rfq-014` | RFQ-2026-901, RFQ-2026-008, RFQ-2026-014 | `RFQ-2026-901`: di-seed saat boot (Packaging, tanpa kode material, mengundang sup-002 / sup-005 / sup-007, tenggat Nov 2026) — dapat diterbitkan, ditenderkan seperti biasa. `rfq-008`: tanpa undangan — penerbitan menolak `COMPETITION_UNDER_FLOOR`; pembatalan satu-satunya jalan keluar. `rfq-014`: mengundang sup-005 / sup-006 / sup-009; terbit dengan "Tender kompetitif tidak diperlukan" (daftar Mandatory pada `AI-NIAC-6601`). Draf yang dibuat wizard melanjutkan rentang `RFQ-2026-9xx` |
| Open | `rfq-001`, `rfq-002`, `rfq-003`, `rfq-009`, `rfq-010`, `rfq-011`, `rfq-012`, `rfq-013` | RFQ-2026-001, -002, -003, -009, -010, -011, -012, -013 | semua merespons (panel pemenangan dapat dicapai): `rfq-003` (3 penawaran IDR), `rfq-009` (2 penawaran USD — satu mata uang, berperingkat tanpa catatan kurs), `rfq-012` (IDR + USD, tanpa catatan → `FX_UNPINNED`), `rfq-013` (IDR + USD, dua catatan kedaluwarsa → `FX_STALE`). Tidak semua merespons: `rfq-001` (3 dari 4), `rfq-002` (2 dari 3; undangan sup-012 berstatus Suspended — penerbitannya di-seed, tidak melewati gerbang), `rfq-010` (0 dari 2; persona pemasok sup-007 dapat menawarnya), `rfq-011` (1 dari 2; satu penawaran Submitted — spesimen langkah tinjauan) |
| Closed | `rfq-004`, `rfq-005` | RFQ-2026-004, RFQ-2026-005 | di-seed Closed; keduanya mencatat semua undangan telah merespons — **Buka kembali RFQ** menempatkannya di Menunggu Pemenangan dengan panel pemenangan tersedia |
| Awarded | `rfq-006`, `rfq-007` | RFQ-2026-006, RFQ-2026-007 | dimenangkan oleh `qt-006a` (sup-001) dan `qt-007a` (sup-005); "Ringkasan pemenangan" menampilkan "PO diterbitkan" kosong |
| Cancelled | — | — | tidak ada fixture; batalkan acara Draft, Open, atau Closed mana pun untuk menghasilkannya |

<!-- src: src/data/mockRfqs.ts:91-531; src/data/mockQuotations.ts:50-578; src/services/data/mock/stores/rfqStore.ts:43-47; src/services/data/mock/materialRequestSeed.ts:76-85; src/data/mockSuppliers.ts:361-368; _derived/guidefacts.json (rfq.fixtures) -->
