---
entity: enforcement
locale: id
title: Mode penegakan (pemeriksaan yang diatur)
wired: true
owner: portal
source_sha: dec17faa4489102fd96492989fb7a67caa770ca0
transitions:
  - t_enforcement_set
---

<!-- section:summary -->
## 1 · Apa proses ini

Seberapa keras tiap aturan menggigit — menghalangi, memperingatkan, atau sekadar mengamati — dicatat sebagai keputusan yang dibuat seseorang, bukan pengaturan tanpa pemilik.

Entitasnya adalah satu **pemeriksaan yang diatur**: aturan yang ditanyakan inspeksi penerimaan barang atas satu baris yang diterima. Ada tiga pemeriksaan — `halal.seal` (seorang pemeriksa benar-benar melihat segel halal pada barang dan mencentangnya), `halal.certificate` (sertifikat halal untuk pemasok dan material ini berlaku pada saat barang diterima) dan `bpom.lot` (lot yang diterima membawa registrasi BPOM yang diperlukan materialnya). Setiap pemeriksaan memiliki **mode penegakan** pada tangga kekerasan yang menaik: `OBSERVE` (ajukan pertanyaannya dan catat jawabannya, tidak pernah menghentikan siapa pun), `BLOCK_OVERRIDABLE` (hentikan, tetapi orang yang disebut namanya dapat melanjutkan dengan mencatat salah satu dari empat alasan penimpaan) dan `BLOCK` (hentikan; tanpa penimpaan). Mode yang berlaku tidak pernah disimpan sebagai status — ia dibaca dari **buku catatan yang hanya bertambah** (append-only) berisi keputusan yang tercatat, dan pelonggaran yang sudah melewati tanggal peninjauannya diperketat satu tingkat saat dibaca (mekanisme pengetatan otomatis, *ratchet*). Buku catatan kosong terbaca `BLOCK / NO_SETTING_RECORDED`: keadaan yang belum diatur adalah keadaan yang ketat.

Siapa yang menyentuhnya: **tidak ada, dari layar.** Verba `t_enforcement_set` memegang atom `enforcement:set` (hari ini di paket pengadaan pembeli; pemindahannya ke kepatuhan sudah diputuskan tetapi menunggu pemanggil) dan hanya dipicu oleh seed pembuka platform, yang mencatat `BLOCK` untuk dua pemeriksaan yang memang sudah memblokir di dermaga (`halal.seal`, `bpom.lot`). Ia diputuskan **tidak disediakan di layar**: melonggarkan pemeriksaan yang diatur adalah tindakan yang harus dapat diatribusikan, platform belum dapat menyebut orang sungguhan, sehingga pelonggaran anonim ditolak alih-alih ditawarkan. Yang dilihat orang adalah akibatnya — wizard penerimaan barang membaca mode itu dan memutuskan apakah pemeriksaan wajib yang belum dijawab menghentikan langkah.

Penanda kejujuran. Mesin satu-status (`Governed`); verba menambahkan sebuah keputusan dan tidak memindahkan apa pun. Aktor seed adalah `UNATTRIBUTED: NO_PERSON_IN_SESSION` — bentuk jujur untuk tindakan yang diambil saat pemuatan, tanpa sesi. `halal.certificate` sengaja **tidak di-seed**: hari ini ia tidak memblokir apa pun, sehingga sebuah baris akan mencatat keputusan yang tidak pernah diambil siapa pun; entrinya yang kosong menurunkan `BLOCK / NO_SETTING_RECORDED`. Setiap mode di bawah `BLOCK` tidak dapat dicatat sampai ada orang sungguhan yang masuk — identitas contoh tidak boleh melonggarkan pemeriksaan yang diatur.
<!-- src: src/services/transitions/flows/enforcement.flow.ts:1-87; src/lib/enforcement.ts:173-287,484-508,715-724; src/services/data/mock/enforcementSeed.ts:1-123; src/lib/i18n/processFlowPurpose.ts:325-329; src/lib/glossary/governance.glossary.ts:23-52 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 0 | ∅ → Governed | pemeriksaan ada karena disebut dalam daftar tertutup id pemeriksaan yang diatur (tanpa verba pembuatan) | — | — |
| 1 | Governed → Governed | mencatat fakta (mempertahankan status): keputusan mode ditambahkan ke buku catatan | buyer · procurement (dipicu seed saja) | `t_enforcement_set` |

**Percabangan**

- **Di Governed:** `t_enforcement_set` — pengadaan, lewat seed — ketika kekerasan sebuah pemeriksaan diputuskan. Pengetatan (menuju `BLOCK`) legal bagi pemanggil mana pun; pelonggaran (menuju `OBSERVE`) memerlukan tanggal peninjauan dan aktor yang disebut namanya dan bukan identitas contoh. Tidak ada jalan keluar lain.
<!-- src: src/services/transitions/flows/enforcement.flow.ts:44-87; src/services/data/mock/MockCommandService.ts:1602-1622 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_enforcement_set — Tetapkan mode penegakan <!-- transition:t_enforcement_set -->

- **Jenis langkah:** mencatat fakta (mempertahankan status) · **tidak aktif dari layar mana pun** (diputuskan tidak disediakan; dipicu seed saja)
- **Peran:** buyer · procurement (atom `enforcement:set`)
- **Dari → ke:** Governed → status yang sama
- **Operator — di mana:** *tidak disediakan di mana pun hari ini* — mode yang dicatatnya dibaca oleh wizard penerimaan di `/buyer/goods-receipt`. Satu-satunya pemanggil adalah `seedEnforcementLedger` di `enforcementSeed.ts`, yang mendispatch `t_enforcement_set` dengan `mode: BLOCK` untuk `halal.seal` dan `bpom.lot` saat mulai, dan melewati pemeriksaan yang sudah memiliki pengaturan. Tidak ada halaman, panel atau tombol.
- **Operator — lakukan:** (sebagaimana dilakukan seed) catat seberapa ketat satu pemeriksaan diterapkan. Kekerasan penuh bukan pelonggaran, sehingga seed tidak memerlukan tanggal peninjauan maupun orang yang disebut namanya.
- **Operator — isi:** `mode` (wajib). `reviewBy` (hari dalam format `YYYY-MM-DD`) wajib setiap kali mode berada di bawah `BLOCK` — aturan bersyarat, sehingga tinggal di kait kebijakan, bukan di kolom wajib. `setBy` tidak pernah menjadi kolom: aktor berasal dari sesi dan dispatcher menolak kunci itu dalam payload. `setAt` ditetapkan oleh store.
- **Penguji — status yang diharapkan:** Governed
- **Penguji — konfirmasi:** buku catatan (`useEnforcementSettings`) memuat baris untuk pemeriksaan itu dengan `setAt`, `setBy` dan modenya; wizard penerimaan barang di `/buyer/goods-receipt` membaca mode yang berlaku dan, pada `BLOCK` atau `BLOCK_OVERRIDABLE`, menolak menyelesaikan baris yang pemeriksaan segel halal atau lot BPOM wajibnya belum dijawab. Tidak ada teks di layar mana pun yang mencetak mode atau sumbernya (tidak terukur di luar perilaku wizard).
- **Penguji — peristiwa pemicu:** `t_enforcement_set`
- **Pemeriksaan yang dapat menolak:** `enforcement_set_governed` — scope harus membawa aktor (sekalipun `UNATTRIBUTED` yang eksplisit); mode di bawah `BLOCK` harus membawa hari `reviewBy` yang terbaca; **pelonggaran** dari mode yang saat ini berlaku (atau dari `BLOCK` ketika tidak ada yang tercatat) memerlukan aktor yang disebut namanya — yang tanpa atribusi ditolak — dan **identitas contoh** ditolak dengan menyebut namanya (`SAMPLE_ACTOR_CANNOT_LOOSEN`); pengetatan selalu legal. Id pemeriksaan yang tak dikenal adalah `NOT_FOUND`.
- **Glosarium:** OBSERVE · BLOCK_OVERRIDABLE · BLOCK · halal.seal · halal.certificate · bpom.lot · NO_PERSON_IN_SESSION · IDENTITY_PROVIDER_UNAVAILABLE · NO_SETTING_RECORDED · EXPIRY_TIGHTENED · AS_RECORDED · UNRECOGNISED_MODE · UNATTRIBUTED_OVERRIDE
- **Kejujuran:** verba ada, mendispatch dan masuk ke jejak audit, tetapi **tidak ada layar yang memicunya** — berdasarkan keputusan, bukan kelalaian. Setiap baris yang tercatat hari ini adalah milik seed, pada kekerasan maksimum, atas nama tidak seorang pun. Pemberitahuan sertifikat pada wizard penerimaan barang (`halal.certificate`) memberi tahu petugas dan tidak menghentikan dermaga; menyambungkannya sebagai klausul pemblokir akan memerlukan seed `OBSERVE`, yang justru ditolak oleh kebijakan ini untuk aktor tanpa atribusi.
<!-- src: src/services/transitions/flows/enforcement.flow.ts:54-85; src/services/transitions/policies.ts:301-387; src/services/data/mock/enforcementSeed.ts:88-179; src/services/data/mock/MockCommandService.ts:1602-1622; src/services/data/mock/stores/enforcementSettingStore.ts:41-58; src/components/v2-features/GRInspectionWizard.tsx:792-801,913-915; src/services/query/hooks.ts:294-310 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Perketat atau longgarkan (di Governed).** Cabang A — pengetatan — **Kapan:** sebuah pemeriksaan harus menggigit lebih keras; legal bagi pemanggil mana pun, tanpa tanggal peninjauan, dan tindakan pembuka seed adalah kasus ini. Cabang B — pelonggaran — **Kapan:** sebuah pemeriksaan harus menggigit lebih ringan; memerlukan `reviewBy`, aktor yang disebut namanya dan bukan identitas contoh — sehingga tidak terjangkau dalam demo (`ENF-NO-PERSON-IN-IDENTITY-01`).
- **Pengetatan otomatis (diturunkan, bukan verba).** Pelonggaran tercatat yang hari `reviewBy`-nya telah lewat terbaca satu tingkat lebih ketat (`OBSERVE` → `BLOCK_OVERRIDABLE` → `BLOCK`) dengan sumber `EXPIRY_TIGHTENED`, dan tetap di sana sampai ada tindakan tercatat baru. Satu tingkat saja, berapa lama pun dibiarkan: lewatnya kalender tidak boleh menutup dermaga. `BLOCK` dengan peninjauan yang lewat tetap terbaca `AS_RECORDED` — tidak ada yang lebih ketat.
- **Penimpaan di dermaga (bersebelahan, bukan verba ini).** Pada `BLOCK_OVERRIDABLE` orang yang disebut namanya dapat mencatat salah satu dari empat alasan — `EVIDENCE_HELD_OUTSIDE_PORTAL`, `CERTIFIER_CONFIRMED_DIRECTLY`, `ACCEPTED_TO_QUARANTINE`, `COMMERCIAL_RISK_ACCEPTED`. Penimpaan oleh aktor tanpa atribusi dapat dicatat tetapi tidak menyelesaikan: mode jatuh ke batas atas dengan sumber `UNATTRIBUTED_OVERRIDE`. Tidak ada mode dalam demo yang `BLOCK_OVERRIDABLE`, sehingga tidak ada penimpaan yang terjangkau hari ini.
- **Sudah tercatat (pengecualian seed).** Seed melewati pemeriksaan yang buku catatannya sudah memuat pengaturan; menambahkan akan menimpa tindakan operator sungguhan dengan nilai bawaan saat boot.
- **Seed ditolak (pengecualian).** Bila dispatch seed ditolak, buku catatan tetap kosong untuk pemeriksaan itu dan menurunkan `BLOCK / NO_SETTING_RECORDED` — provenansnya hilang, penegakannya tidak.
<!-- src: src/lib/enforcement.ts:233-260,600-645,747-763,834-852; src/services/transitions/policies.ts:301-387; src/services/data/mock/enforcementSeed.ts:125-179 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku di | Kapan muncul | Di mana ditampilkan |
|---|---|---|---|---|
| Mode yang berlaku `BLOCK` / `BLOCK_OVERRIDABLE` / `OBSERVE` | diturunkan saat dibaca | Governed | pengaturan terakhir yang tercatat untuk pemeriksaan itu, diperketat otomatis oleh tanggal peninjauannya | dikonsumsi `/buyer/goods-receipt` (wizard) untuk memutuskan apakah pemeriksaan wajib yang belum dijawab memblokir; tidak dicetak sebagai teks (tidak terukur) |
| Sumber `NO_SETTING_RECORDED` | diturunkan saat dibaca | Governed | buku catatan tidak memuat pengaturan untuk pemeriksaan itu — `halal.certificate` hari ini | turunan saja |
| Sumber `EXPIRY_TIGHTENED` | digerakkan waktu, diturunkan saat dibaca | Governed | hari `reviewBy` sebuah pelonggaran telah lewat | turunan saja; tidak ada pelonggaran dalam demo |
| Sumber `UNRECOGNISED_MODE` | diturunkan saat dibaca | Governed | mode tersimpan bukan salah satu yang dikenal build ini; diperingkat di batas atas | turunan saja |
| Sumber `UNATTRIBUTED_OVERRIDE` | diturunkan saat dibaca | Governed (di dermaga) | penimpaan oleh aktor yang tidak menyebut siapa pun | turunan saja |
| Aktor `UNATTRIBUTED: NO_PERSON_IN_SESSION` | tercatat | Governed | setiap baris yang di-seed | `setBy` pada baris buku catatan |
| Istilah glosarium | referensi | — | setiap mode, pemeriksaan, sumber, alasan penimpaan dan alasan tanpa atribusi memiliki definisi EN/ID | `/glossary` |
<!-- src: src/lib/enforcement.ts:520-551,634-645,715-724; src/components/v2-features/GRInspectionWizard.tsx:792-801; src/lib/glossary/governance.glossary.ts:23-131 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** `halal.seal` (id pemeriksaan yang diatur; tidak ada nomor dokumen).

| Tertaut ke | Melalui | Catatan |
|---|---|---|
| Baris buku catatan penegakan | `checkId` | hanya bertambah; pengaturan yang berlaku adalah `setAt` terakhir untuk pemeriksaan itu |
| Inspeksi penerimaan barang (`GRInspectionWizard`) | `effectiveEnforcement(ledger, 'halal.seal', inspectionInstant)` | `blocks(mode)` menggerbang klausul `l.halal.required && !l.halalSealCheck`; sama untuk `bpom.lot` dan `l.bpomLotCheck` |
| Vonis yang diatur atas baris yang diterima | `PASS` / `ADVERSE` / `UNANSWERED` | mode mengatur dua jawaban yang tidak lulus; sebuah penolakan (material tak dikenal, keberlakuan belum ditetapkan) bukan vonis |
| Catatan penimpaan | `overriddenVerdict` terikat pada vonis yang distempel | hanya terjangkau pada `BLOCK_OVERRIDABLE`, oleh orang yang disebut namanya |
| Glosarium | id pemeriksaan, mode, sumber, alasan | `/glossary`, kedua bahasa |

Hanya tampilan: `reviewBy` pada baris `BLOCK` legal tetapi opsional dan dibiarkan `null` oleh seed alih-alih dikarang. `halal.certificate` diatur oleh kosakata tetapi tidak membawa baris — pemberitahuannya di dermaga (`verifyHalalAtReceipt`) membaca registri kepatuhan dan memberi tahu; ia tidak berkonsultasi dengan mode.
<!-- src: src/lib/enforcement.ts:273-322,484-508,667-678,782-800; src/components/v2-features/GRInspectionWizard.tsx:792-801,848,913-915; src/services/data/mock/enforcementSeed.ts:160-171 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent` (`event` = `t_enforcement_set`, `actor` = `buyer:all`, `ts`, `outcome`, `correlationId`). Baris buku catatan itu sendiri membawa `setBy` (sebuah atribusi, tercocokkan atau tanpa atribusi beserta alasannya), `setAt` (ditetapkan store) dan `mode`, ditambah `reviewBy`. Tidak ada yang pernah diperbarui: menggantikan berarti menambahkan, dan seluruh riwayat tetap terbaca.

Urutan kerja untuk `halal.seal`, sebagaimana dihasilkan platform saat mulai (tidak ada tindakan penguji yang mungkin dari layar):

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | Governed → Governed | buyer · procurement, `UNATTRIBUTED: NO_PERSON_IN_SESSION` (seed) | `seedEnforcementLedger` mendispatch `mode: BLOCK`, tanpa `reviewBy` | `t_enforcement_set` |
| T+1 | Governed (dilewati) | seed | jalankan kedua menemukan pengaturan sudah tercatat dan tidak menambahkan apa pun | — |
| T+n | Governed (diturunkan) | — | wizard membaca `BLOCK / AS_RECORDED` untuk `halal.seal` dan menolak menyelesaikan baris yang pemeriksaan segel wajibnya belum dijawab | — (tanpa peristiwa) |

Penguji yang mendispatch `t_enforcement_set` secara manual dengan `mode: OBSERVE` dan sebuah `reviewBy` dari kursi tanpa atribusi atau kursi identitas contoh menghasilkan peristiwa dengan `outcome: failed` dan alasan yang menyebut penolakan pelonggaran.
<!-- src: src/services/transitions/events.ts:127-129; src/services/data/mock/enforcementSeed.ts:153-179; src/lib/enforcement.ts:667-678; src/services/transitions/policies.ts:301-387 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada layar untuk mengubah mode penegakan | tidak ada kontrol di mana pun; `/buyer/process-flows` menandai verba sebagai tidak disediakan | diputuskan tidak disediakan — platform tidak dapat menyebut orang | tidak ada; menunggu penyedia identitas sungguhan |
| Wizard penerimaan barang tidak mau menyelesaikan baris dengan segel halal atau lot BPOM belum dijawab | langkah tetap tidak valid | mode yang berlaku adalah `BLOCK` (di-seed, atau `NO_SETTING_RECORDED`) | jawab pemeriksaannya; tidak ada penimpaan pada `BLOCK` |
| Dispatch manual ditolak: "the commanding scope carries no actor" | `POLICY_REJECTED:enforcement_set_governed` | scope sama sekali tidak memiliki `actor` | sertakan atribusi — `UNATTRIBUTED` beserta alasannya diterima untuk pengetatan |
| Dispatch manual ditolak: "a relaxation to OBSERVE requires reviewBy as a readable YYYY-MM-DD" | `POLICY_REJECTED:enforcement_set_governed` | mode di bawah `BLOCK` tanpa hari peninjauan | tambahkan `reviewBy` |
| Dispatch manual ditolak: "loosening … requires a NAMED actor" | `POLICY_REJECTED:enforcement_set_governed` | kursi tanpa atribusi mencoba pelonggaran | wajar hari ini |
| Dispatch manual ditolak: `SAMPLE_ACTOR_CANNOT_LOOSEN` | `POLICY_REJECTED:enforcement_set_governed` | identitas contoh mencoba pelonggaran | wajar; memerlukan orang sungguhan yang masuk |
| `MISSING_FIELDS:mode` | dispatcher | payload tanpa `mode` | sertakan |
| `ACTOR_IN_PAYLOAD` | dispatcher | payload membawa `setBy` | hapus; aktor dibawa sesi |
| `NOT_FOUND` | dilempar | id pemeriksaan bukan salah satu dari tiga id yang diatur | gunakan `halal.seal`, `halal.certificate` atau `bpom.lot` |
| `ROLE_NOT_PERMITTED:enforcement:set` | dispatcher | kursi tidak memegang pengadaan | wajar untuk setiap jalur lain |
| `halal.certificate` menampilkan pemberitahuan tetapi tidak pernah memblokir | wizard | pemeriksaan itu tidak memiliki pengaturan tercatat dan tidak dikonsultasikan oleh apa pun yang menolak | wajar; pemberitahuannya memberi tahu petugas |
<!-- src: src/services/transitions/policies.ts:301-387; src/services/transitions/refusals.ts:61-114; src/services/data/mock/MockCommandService.ts:1603; src/components/v2-features/GRInspectionWizard.tsx:803-835 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Governed | `halal.seal`, `bpom.lot` | — | dua pemeriksaan yang dibuka seed pada `BLOCK`, aktor `UNATTRIBUTED: NO_PERSON_IN_SESSION`, `reviewBy: null`. `halal.certificate` adalah id entitas yang valid (readState menjawab `Governed`) tetapi sengaja tidak di-seed dan menurunkan `BLOCK / NO_SETTING_RECORDED`. |
<!-- src: src/services/data/mock/enforcementSeed.ts:88-93,160-171; src/lib/enforcement.ts:273-287; src/services/data/mock/MockCommandService.ts:1603 -->
