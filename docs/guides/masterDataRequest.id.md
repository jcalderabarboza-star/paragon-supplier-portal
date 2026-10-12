---
entity: masterDataRequest
locale: id
title: Permintaan perubahan data master
wired: true
owner: portal
source_sha: b9b092eecc359fadde205154ea3d46352d6ff87f
transitions:
  - t_mdr_propose
  - t_mdr_start_review
  - t_mdr_return
  - t_mdr_approve
  - t_mdr_reject
  - t_mdr_withdraw
  - t_mdr_hand_off
  - t_mdr_sap_complete
  - t_mdr_sap_decline
---

<!-- section:summary -->
## 1 · Apa proses ini

Usulan untuk mengubah data master yang dimiliki SAP S/4HANA: material baru, perubahan pada material, atau perubahan pada pemasok. Portal menyimpan replika data master SAP dan tidak pernah mengubah catatan. Portal mengusulkan, orang kedua meninjau, pengadaan menyerahkan permintaan yang disetujui ke SAP, dan permintaan berakhir pada jawaban SAP.

**Disetujui tidak sama dengan sudah ada.** *Disetujui — belum dikirim* berarti Paragon setuju untuk meminta ke SAP. Tidak ada langkah dalam proses ini yang menulis catatan master: catatan baru berubah setelah proses sinkronisasi membawanya, dan halaman menyatakannya pada setiap status.

Tiga lini pembeli menyentuhnya. **Pengadaan** dan **Perencanaan** memegang `masterdata:propose`. **Perencanaan** dan **Kepatuhan** memegang `masterdata:review`, dan satu pemeriksaan menahan masing-masing pada jenisnya: material milik Perencanaan, pemasok milik Kepatuhan. **Pengadaan** memegang `masterdata:handoff` dan `masterdata:record-sap-answer`. Orang yang memutuskan permintaan tidak pernah orang yang mengusulkannya; Super Admin dapat melewati satu pemeriksaan itu dengan alasan yang dinyatakan, dan alasan itu dicatat.

Penanda kejujuran. SAP tidak terhubung: **Kirim ke SAP** menghasilkan paket penyerahan lalu berhenti. Pada deployment demo atau pratinjau seseorang dapat mencatat jawaban **sampel**, yang membawa catatannya melalui proses sinkronisasi bertanda sampel; di produksi hal itu ditolak. Permintaan disimpan di memori selama sesi dan hilang saat dimuat ulang.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/masterData/changeRequest.ts:1-290; src/services/data/mock/masterDataRequestTarget.ts:1-190 -->

<!-- section:lifecycle -->
## 2 · Alur siklus hidup

| Langkah | Dari → ke | Jenis | Peran | Transisi |
|---|---|---|---|---|
| 1 | ∅ → Proposed | pembuatan (tindakan operator) | pembeli · pengadaan, perencanaan | `t_mdr_propose` |
| 2 | Proposed → In Review | mengubah status (tindakan operator) | pembeli · perencanaan, kepatuhan | `t_mdr_start_review` |
| 3 | In Review → Proposed | mengubah status (tindakan operator) | pembeli · perencanaan, kepatuhan | `t_mdr_return` |
| 4 | In Review → Approved | mengubah status (tindakan operator) | pembeli · perencanaan, kepatuhan | `t_mdr_approve` |
| 5 | In Review → Rejected | mengubah status (tindakan operator) | pembeli · perencanaan, kepatuhan | `t_mdr_reject` |
| 6 | Proposed, Approved → Withdrawn | mengubah status (tindakan operator) | pembeli · pengadaan, perencanaan | `t_mdr_withdraw` |
| 7 | Approved → Sent to SAP | mengubah status (tindakan operator) | pembeli · pengadaan | `t_mdr_hand_off` |
| 8 | Sent to SAP → Completed in SAP | fakta eksternal (tindakan operator) | pembeli · pengadaan | `t_mdr_sap_complete` |
| 9 | Sent to SAP → Declined by SAP | fakta eksternal (tindakan operator) | pembeli · pengadaan | `t_mdr_sap_decline` |

Permintaan yang dikembalikan kembali ke Proposed dan dapat ditinjau lagi. Rejected, Withdrawn, Completed in SAP, dan Declined by SAP adalah akhir.

**Percabangan**

- **Di Proposed:** `t_mdr_start_review` (lini peninjau menanganinya) atau `t_mdr_withdraw` (pengusul menariknya).
- **Di In Review:** `t_mdr_approve`, `t_mdr_return`, atau `t_mdr_reject`.
- **Di Approved:** `t_mdr_hand_off` atau `t_mdr_withdraw`.
- **Di Sent to SAP:** `t_mdr_sap_complete` atau `t_mdr_sap_decline`.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150 -->

<!-- section:steps -->
## 3 · Langkah demi langkah

### t_mdr_propose — Usulkan perubahan, atau minta material baru <!-- transition:t_mdr_propose -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · pengadaan, perencanaan (atom `masterdata:propose`)
- **Dari → ke:** ∅ → Proposed
- **Operator — di mana:** `/buyer/master-data` → header **Minta material baru**; atau buka material atau pemasok → **Usulkan perubahan**. Permintaan lalu terbuka di `/buyer/master-data/requests`.
- **Operator — lakukan:** nyatakan apa yang diminta dan mengapa. Untuk perubahan, ubah hanya kolom yang perlu berubah; formulir hanya mengirim kolom itu.
- **Operator — isi:** `kind` (ditentukan oleh tempat formulir dibuka), `subjectKey` (catatannya, untuk perubahan; tidak pernah untuk material baru), `proposed` (kolom-kolomnya), `reason` (wajib).
- **Penguji — status yang diharapkan:** Proposed
- **Penguji — konfirmasi:** toast **"Permintaan diajukan. Menunggu peninjauan; tidak ada data master yang berubah."**; permintaan terbuka dengan nomornya, nilai usulan di samping nilai di SAP, dan satu baris riwayat.
- **Penguji — peristiwa pemicu:** `t_mdr_propose`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named` (`MDR_ACTOR_UNATTRIBUTED`); `mdr_proposal_valid`, sembilan penolakan — `MDR_KIND_UNKNOWN`, `MDR_REASON_BLANK`, `MDR_CREATE_CARRIES_KEY`, `MDR_SUBJECT_UNKNOWN`, `MDR_FIELD_NOT_PROPOSABLE`, `MDR_FIELD_MISSING`, `MDR_VALUE_NOT_IN_TABLE`, `MDR_NOTHING_CHANGES`, `MDR_DUPLICATE_OPEN`.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** permintaan material baru tidak membawa kunci: SAP yang memberi kunci. Material sampel hasil pembangkitan tidak memiliki catatan SAP, sehingga tidak ada perubahan yang dapat diusulkan untuknya.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_start_review — Mulai peninjauan <!-- transition:t_mdr_start_review -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · perencanaan, kepatuhan (atom `masterdata:review`)
- **Dari → ke:** Proposed → In Review
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → **Mulai peninjauan**.
- **Operator — lakukan:** tangani permintaan, agar pengusul melihat permintaannya sedang ditinjau.
- **Operator — isi:** tidak ada.
- **Penguji — status yang diharapkan:** In Review
- **Penguji — konfirmasi:** toast **"Peninjauan dimulai."**; status terbaca *Sedang ditinjau*.
- **Penguji — peristiwa pemicu:** `t_mdr_start_review`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_reviewer_lane` (`MDR_WRONG_LANE`: permintaan material ditinjau Perencanaan, permintaan pemasok ditinjau Kepatuhan).
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** kursi tanpa atom peninjauan membaca siapa yang ditunggu di tempat tombol seharusnya berada.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_return — Kembalikan ke pengusul <!-- transition:t_mdr_return -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · perencanaan, kepatuhan (atom `masterdata:review`)
- **Dari → ke:** In Review → Proposed
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → tulis catatan → **Kembalikan ke pengusul**.
- **Operator — lakukan:** nyatakan apa yang kurang atau belum jelas.
- **Operator — isi:** `note` (wajib).
- **Penguji — status yang diharapkan:** Proposed
- **Penguji — konfirmasi:** toast **"Dikembalikan kepada pengusul."**; catatan ada di riwayat.
- **Penguji — peristiwa pemicu:** `t_mdr_return`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_reviewer_lane`; `mdr_note_authored` (`MDR_NOTE_BLANK`).
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** tombol tetap nonaktif sampai catatan ditulis.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_approve — Setujui untuk diminta ke SAP <!-- transition:t_mdr_approve -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · perencanaan, kepatuhan (atom `masterdata:review`)
- **Dari → ke:** In Review → Approved
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → **Setujui untuk diminta ke SAP**.
- **Operator — lakukan:** putuskan bahwa Paragon perlu meminta hal ini ke SAP. Orang yang mengusulkan permintaan tidak dapat.
- **Operator — isi:** tidak ada; Super Admin yang menyetujui permintaannya sendiri menyatakan alasan satu baris.
- **Penguji — status yang diharapkan:** Approved
- **Penguji — konfirmasi:** toast **"Disetujui. Permintaan menunggu dikirim ke SAP; catatan belum berubah."**; status terbaca *Disetujui — belum dikirim* dan bagian penyerahan muncul.
- **Penguji — peristiwa pemicu:** `t_mdr_approve`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_reviewer_lane`; `mdr_approver_not_proposer` (`MDR_APPROVER_IS_PROPOSER`); `mdr_base_unchanged` (`MDR_SAP_CHANGED_FIRST`).
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** persetujuan adalah persetujuan untuk meminta. Catatan tetap persis seperti sebelumnya.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_reject — Tolak permintaan <!-- transition:t_mdr_reject -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · perencanaan, kepatuhan (atom `masterdata:review`)
- **Dari → ke:** In Review → Rejected
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → tulis catatan → **Tolak**.
- **Operator — lakukan:** tolak permintaan dan nyatakan alasannya.
- **Operator — isi:** `note` (wajib).
- **Penguji — status yang diharapkan:** Rejected
- **Penguji — konfirmasi:** toast **"Permintaan ditolak. Tidak ada yang dikirim ke SAP."**
- **Penguji — peristiwa pemicu:** `t_mdr_reject`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_reviewer_lane`; `mdr_note_authored`; `mdr_approver_not_proposer`.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** sebuah akhir. Permintaan baru dapat diajukan.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_withdraw — Tarik permintaan <!-- transition:t_mdr_withdraw -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · pengadaan, perencanaan (atom `masterdata:propose`)
- **Dari → ke:** Proposed, Approved → Withdrawn
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → tulis catatan → **Tarik**.
- **Operator — lakukan:** tarik kembali permintaan sebelum dikirim ke SAP, dengan alasannya.
- **Operator — isi:** `note` (wajib).
- **Penguji — status yang diharapkan:** Withdrawn
- **Penguji — konfirmasi:** toast **"Permintaan ditarik."**
- **Penguji — peristiwa pemicu:** `t_mdr_withdraw`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_note_authored`.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** beginilah permintaan yang tertahan karena SAP mengubah catatan lebih dulu dibersihkan.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_hand_off — Kirim ke SAP <!-- transition:t_mdr_hand_off -->

- **Jenis langkah:** tindakan operator
- **Peran:** pembeli · pengadaan (atom `masterdata:handoff`)
- **Dari → ke:** Approved → Sent to SAP
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → baca **Penyerahan ke SAP** → **Kirim ke SAP**.
- **Operator — lakukan:** kirim permintaan yang disetujui. Permintaan diperiksa lagi terhadap catatan sebagaimana adanya sekarang.
- **Operator — isi:** tidak ada.
- **Penguji — status yang diharapkan:** Sent to SAP
- **Penguji — konfirmasi:** toast **"Dikirim ke SAP (sampel: SAP tidak terhubung)."**; paket menampilkan referensi eksternal, siapa yang menyetujui, dan proses sinkronisasi yang menjadi dasarnya.
- **Penguji — peristiwa pemicu:** `t_mdr_hand_off`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_base_unchanged`.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** tidak ada yang dikirimkan: SAP tidak terhubung. Paket itulah yang akan dikirim.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_sap_complete — Catat jawaban SAP: selesai <!-- transition:t_mdr_sap_complete -->

- **Jenis langkah:** fakta eksternal, dicatat di sini oleh operator sebagai jawaban SAMPEL
- **Peran:** pembeli · pengadaan (atom `masterdata:record-sap-answer`)
- **Dari → ke:** Sent to SAP → Completed in SAP
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → **Catat jawaban SAP (sampel): selesai**. Hanya tampil pada deployment demo dan pratinjau.
- **Operator — lakukan:** catat bahwa SAP melakukan perubahan.
- **Operator — isi:** `sapRequestNumber` dan `sample` (keduanya diisi oleh tombol).
- **Penguji — status yang diharapkan:** Completed in SAP
- **Penguji — konfirmasi:** toast **"Jawaban sampel dicatat: selesai…"**; sebuah pemberitahuan menyebut catatannya dan menyatakan *Jawaban sampel — SAP tidak ditanya.*; catatan di **Material** atau **Pemasok** menampilkan nilai baru, bertanda sampel, dan **Log sinkronisasi** memiliki proses baru.
- **Penguji — peristiwa pemicu:** `t_mdr_sap_complete`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_sap_answer_admissible` (`MDR_SAP_NUMBER_BLANK`, `MDR_SAMPLE_ANSWER_IN_PRODUCTION`, `MDR_SAP_NOT_CONNECTED`).
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** catatan tiba melalui proses sinkronisasi tersendiri, tidak pernah dari permintaan. Material baru tiba dengan kunci sampel.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

### t_mdr_sap_decline — Catat jawaban SAP: ditolak <!-- transition:t_mdr_sap_decline -->

- **Jenis langkah:** fakta eksternal, dicatat di sini oleh operator sebagai jawaban SAMPEL
- **Peran:** pembeli · pengadaan (atom `masterdata:record-sap-answer`)
- **Dari → ke:** Sent to SAP → Declined by SAP
- **Operator — di mana:** `/buyer/master-data/requests` → buka permintaan → tulis alasan SAP pada catatan → **Catat jawaban SAP (sampel): ditolak**.
- **Operator — lakukan:** catat bahwa SAP menolak, dengan alasan SAP.
- **Operator — isi:** `sapRequestNumber`, `sample`, `note` (wajib).
- **Penguji — status yang diharapkan:** Declined by SAP
- **Penguji — konfirmasi:** toast **"Jawaban sampel dicatat: ditolak oleh SAP."**; pemberitahuan menampilkan alasannya.
- **Penguji — peristiwa pemicu:** `t_mdr_sap_decline`
- **Pemeriksaan yang dapat menolak:** `mdr_actor_named`; `mdr_sap_answer_admissible`; `mdr_note_authored`.
- **Glosarium:** `ROLE_NOT_PERMITTED`, `POLICY_REJECTED`, `MISSING_FIELDS`, `NOT_FOUND`, `SCOPE_DENIED`, `NO_PERSON_IN_SESSION`.
- **Kejujuran:** tidak ada yang berubah pada data master. Permintaan baru dapat diajukan.
<!-- src: src/services/transitions/flows/masterDataRequest.flow.ts:1-150; src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/services/transitions/policies.ts:2880-2930 -->

<!-- section:forks -->
## 4 · Percabangan keputusan dan jalur pengecualian

- **Lini mana yang meninjau (di Proposed).** Permintaan material milik Perencanaan; permintaan pemasok milik Kepatuhan. Lini lainnya ditolak `MDR_WRONG_LANE`.
- **Setujui, kembalikan, atau tolak (di In Review).** Setujui bila Paragon perlu meminta ke SAP; kembalikan bila ada yang kurang; tolak bila tidak perlu diminta.
- **Pengusul dan pemutus adalah satu orang (pengecualian).** Ditolak `MDR_APPROVER_IS_PROPOSER`. Super Admin dapat melewatinya dengan alasan satu baris; peristiwa mencatat pemeriksaan dan alasannya. Admin tidak dapat.
- **SAP mengubah catatan lebih dulu (pengecualian).** Proses sinkronisasi mengubah kolom yang diusulkan permintaan. Menyetujui dan mengirim ditolak `MDR_SAP_CHANGED_FIRST`; tarik lalu usulkan lagi.
- **Permintaan yang sama masih terbuka (pengecualian).** Ditolak `MDR_DUPLICATE_OPEN`, dengan menyebut permintaan yang terbuka.
- **SAP menyelesaikan atau menolak (di Sent to SAP).** Selesai: catatan dibaca kembali oleh sinkronisasi. Ditolak: alasan SAP ditampilkan dan permintaan baru dapat diajukan.
<!-- src: src/services/masterData/changeRequest.ts:1-290; src/services/data/mock/masterDataRequestTarget.ts:1-190 -->

<!-- section:flags -->
## 5 · Penanda pengecualian

| Penanda | Jenis | Berlaku pada | Kapan muncul | Tempat ditampilkan |
|---|---|---|---|---|
| *"Permintaan hanya disimpan untuk sesi ini…"* | pernyataan tetap | — | selalu | bagian atas **Permintaan perubahan**; formulir usulan |
| *"SAP mengubah catatan ini setelah permintaan ditulis"* | diturunkan saat dibaca | Proposed, In Review, Approved | proses sinkronisasi mengubah kolom yang diusulkan | laci permintaan |
| *"Jawaban sampel — SAP tidak ditanya."* | diturunkan saat dibaca | Completed in SAP, Declined by SAP | jawaban dicatat sebagai sampel | pemberitahuan jawaban di laci |
| *Di SAP: {value}* | diturunkan saat dibaca | setiap status | permintaan mengenai catatan yang sudah ada | di bawah setiap nilai usulan |
| *Menunggu {lane}* | diturunkan saat dibaca (kursi vs. atom) | — | kursi tidak memegang atom untuk tindakan berikutnya | di tempat tombol seharusnya berada |
| *(SAMPEL)* setelah nama orang | diturunkan saat dibaca | setiap status | tindakan dilakukan oleh orang sampel | pengusul, riwayat, disetujui oleh |
<!-- src: src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/lib/i18n/masterData.ts:150-290 -->

<!-- section:linked -->
## 6 · Objek tertaut

**Entitas perwakilan:** tidak ada yang di-seed. Permintaan pertama dalam satu sesi adalah `mdr-0001`, nomor `MDR-2026-0001`.

| Terhubung ke | Melalui | Catatan |
|---|---|---|
| Catatan master | `subjectKey` | kunci SAP untuk material atau pemasok; null untuk material baru. Permintaan tidak pernah menulis catatan. |
| Tabel referensi | nilai yang diusulkan | satuan, jenis, grup, negara, syarat pembayaran, atau incoterm harus ada di tabelnya. |
| Proses sinkronisasi | `base.syncRun` | dasar penulisan permintaan; dibandingkan lagi sebelum disetujui dan dikirim. |
| Permintaan perubahan SAP | `sap.sapRequestNumber` | nomor SAP sendiri, beserta kunci catatan yang diubah SAP atau alasan penolakannya. |
| Penyewa / pemilik | tidak ada (`readScopeOwner` bernilai null) | dokumen pembeli: cakupan pemasok ditolak pada cakupan. |
<!-- src: src/services/masterData/changeRequest.ts:1-290; src/services/data/mock/masterDataRequestTarget.ts:1-190 -->

<!-- section:history -->
## 7 · Riwayat status

Setiap dispatch menulis satu `TransitionEvent`: `event` = id transisi, `actor` = `buyer:all`, `ts`, `outcome`, `correlationId` tersendiri, orang pada sesi sebagai `attribution`, dan `subject` = `{ entity: 'masterDataRequest', entityId }`. Permintaan juga menyimpan riwayatnya sendiri, yang ditampilkan di laci.

| Waktu | Dari → ke | Aktor (peran) | Pemicu | Peristiwa |
|---|---|---|---|---|
| T+0 | ∅ (ditolak) | pembeli · pengadaan, kursi tidak menyebut siapa pun | **Usulkan perubahan** → **Ajukan permintaan** | `t_mdr_propose` |
| T+1 | ∅ → Proposed | pembeli · pengadaan, orang sampel | hal yang sama, setelah memilih pengguna sampel | `t_mdr_propose` |
| T+2 | Proposed → In Review | pembeli · perencanaan, orang sampel kedua | **Mulai peninjauan** | `t_mdr_start_review` |
| T+3 | In Review → Approved | pembeli · perencanaan | **Setujui untuk diminta ke SAP** | `t_mdr_approve` |
| T+4 | Approved → Sent to SAP | pembeli · pengadaan | **Kirim ke SAP** | `t_mdr_hand_off` |
| T+5 | Sent to SAP → Completed in SAP | pembeli · pengadaan | **Catat jawaban SAP (sampel): selesai** | `t_mdr_sap_complete` |
<!-- src: src/services/data/mock/masterDataRequestTarget.ts:1-190; src/services/transitions/flows/masterDataRequest.flow.ts:1-150 -->

<!-- section:troubleshooting -->
## 8 · Pemecahan masalah

| Gejala | Cara mengenali | Kemungkinan penyebab | Penyelesaian |
|---|---|---|---|
| Tidak ada **Usulkan perubahan** atau **Minta material baru**; yang ada pemberitahuan menunggu | teks serah-terima di tempat kontrol seharusnya berada | kursi tidak memegang `masterdata:propose` | bertindak dari kursi yang memegang pengadaan atau perencanaan |
| "Kursi ini tidak menyebut siapa pun…" | toast peringatan; formulir sudah menyatakannya lebih dulu | `MDR_ACTOR_UNATTRIBUTED` | pilih pengguna sampel pada panel identitas |
| "Jenis permintaan ini ditinjau oleh lini lain…" | toast galat | `MDR_WRONG_LANE` | tinjau material dari Perencanaan, pemasok dari Kepatuhan |
| "Orang yang mengusulkan permintaan tidak boleh memutuskannya…" | toast galat | `MDR_APPROVER_IS_PROPOSER` | minta orang kedua memutuskan |
| "SAP mengubah catatan ini setelah permintaan ditulis…" | toast galat dan pemberitahuan di laci | `MDR_SAP_CHANGED_FIRST` | tarik permintaan lalu usulkan lagi |
| "Sudah ada permintaan terbuka untuk hal ini…" | toast galat | `MDR_DUPLICATE_OPEN` | buka permintaan yang sudah ada |
| Tidak ada tombol untuk mencatat jawaban SAP | laci terbaca *Dikirim ke SAP. Jawaban dicatat saat SAP memberikannya…* | deployment produksi: jawaban sampel tidak dicatat di sana | tidak ada; SAP menjawab melalui feed setelah terhubung |
| Tindakan pada alur ini ditolak untuk setiap kursi, apa pun perannya | penolakan menyebut `MODULE_INACTIVE:MAT` | modul Permintaan material dinonaktifkan; halamannya tetap dapat dibaca | minta modul diaktifkan kembali di `/buyer/platform/modules/admin` |
| Semua permintaan hilang | daftar kosong | halaman dimuat ulang; permintaan disimpan di memori | wajar pada demo |
<!-- src: src/services/data/mock/masterDataRequestTarget.ts:1-190; src/pages-v2/master-data/ChangeRequests.tsx:1-420; src/pages-v2/BuyerMasterData.tsx:1-470 -->

<!-- section:testdata -->
## 9 · Data uji

| Status | Id fixture | Nomor | Catatan |
|---|---|---|---|
| Proposed | — | — | tidak ada fixture — tidak ada yang di-seed dan store dibuka kosong. Ajukan satu: pilih pengguna sampel yang memegang pengadaan, buka material di `/buyer/master-data`, tekan **Usulkan perubahan**, ubah deskripsinya, beri alasan, **Ajukan permintaan**. |
<!-- src: src/services/data/mock/stores/masterDataRequestStore.ts:1-35; src/services/data/mock/documentIds.ts:79-84 -->
