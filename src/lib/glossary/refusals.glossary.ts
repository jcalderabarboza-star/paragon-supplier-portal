// ─────────────────────────────────────────────────────────────────────────────
// GL-0 · THE REFUSAL VOCABULARY, DEFINED. EN + ID, exhaustiveness-pinned.
//
// Every union here is a REFUSAL: a machine saying no. `HALAL-REFUSAL-DEAD-
// ENDS-01` is about exactly these — Monday's smoke found a refusal that tells
// you only that you are STUCK. A refusal could not acquire a definition until
// something could name the set; `services/transitions/refusals.ts` named the
// command set, and these registries define all of them.
//
// ⚠️ `HalalNotSatisfiedReason` HAS NEVER HAD USER-FACING PROSE IN THIS TREE —
// fully typed, precedence-ordered, and rendered NOWHERE. **This file is its
// first surface**, which is the sharpest single argument for the batch: a
// vocabulary can be complete, correct, ordered and invisible.
// ─────────────────────────────────────────────────────────────────────────────
import type { GlossaryOf } from './types';
import type { CommandRefusal } from '../../services/transitions/refusals';
import type { SettleFault } from '../../services/transitions/settleFaults';
import type { FxRefusalReason } from '../fxPin';
import type { QtyRefusalReason } from '../localeNumber';
import type { HalalNotSatisfiedReason } from '../../services/data/halalVerification';
import type { HalalRefusalReason } from '../../services/sdc/halal';
import type { BpomRefusalReason } from '../../services/sdc/bpom';
import type { DataErrorCode } from '../../services/data/types';

/** The dispatcher's nine. A command was refused before anything changed. */
export const COMMAND_REFUSAL_GLOSSARY = {
  UNKNOWN_TRANSITION: {
    en: 'The action requested does not exist in the system. No document was changed. This is a wiring fault, not something you did — report it.',
    id: 'Tindakan yang diminta tidak ada dalam sistem. Tidak ada dokumen yang diubah. Ini kesalahan penyambungan, bukan kesalahan Anda — laporkan.',
  },
  UNKNOWN_ENTITY: {
    en: 'The kind of document this action belongs to is not connected to the command system. The action cannot run at all yet. Nothing was changed.',
    id: 'Jenis dokumen untuk tindakan ini belum tersambung ke sistem perintah. Tindakan belum dapat dijalankan. Tidak ada yang diubah.',
  },
  MISSING_ENTITY_ID: {
    en: 'The action arrived without saying which document it applies to. Nothing was changed. Re-open the document and try from there.',
    id: 'Tindakan datang tanpa menyebut dokumen mana yang dimaksud. Tidak ada yang diubah. Buka kembali dokumen dan coba dari sana.',
  },
  ROLE_NOT_PERMITTED: {
    en: 'Your role is not allowed to perform this action. Nothing was changed. Someone holding the named role must do it.',
    id: 'Peran Anda tidak diizinkan melakukan tindakan ini. Tidak ada yang diubah. Tindakan harus dilakukan oleh pemegang peran yang disebutkan.',
  },
  ILLEGAL_TRANSITION: {
    en: 'The document is not in a state this action can be taken from. Nothing was changed. The refusal names the state it is actually in.',
    id: 'Dokumen tidak berada dalam status yang memungkinkan tindakan ini. Tidak ada yang diubah. Penolakan menyebut status dokumen yang sebenarnya.',
  },
  MISSING_FIELDS: {
    en: 'One or more values the action requires were blank. Nothing was changed. The refusal names each missing field.',
    id: 'Satu atau beberapa nilai yang diperlukan tindakan ini kosong. Tidak ada yang diubah. Penolakan menyebut setiap kolom yang kurang.',
  },
  UNBOUND_HOOK: {
    en: 'The action names a rule the system could not find, so it refused rather than skip the rule. Nothing was changed. This is a wiring fault — report it.',
    id: 'Tindakan menyebut aturan yang tidak ditemukan sistem, sehingga ditolak alih-alih melewati aturan itu. Tidak ada yang diubah. Ini kesalahan penyambungan — laporkan.',
  },
  POLICY_REJECTED: {
    en: 'A governing rule refused the action. Nothing was changed. The refusal names which rule and, where the rule gave one, why.',
    id: 'Sebuah aturan yang mengatur menolak tindakan ini. Tidak ada yang diubah. Penolakan menyebut aturan mana dan, bila aturan itu memberikannya, alasannya.',
  },
  UNSUPPORTED_CREATION: {
    en: 'This kind of document cannot yet be created through the portal, though the rest of its lifecycle exists. Nothing was changed.',
    id: 'Jenis dokumen ini belum dapat dibuat melalui portal, meskipun sisa siklus hidupnya sudah ada. Tidak ada yang diubah.',
  },
} satisfies GlossaryOf<CommandRefusal>;

/** Read-layer failures surfaced to a page. */
export const DATA_ERROR_GLOSSARY = {
  NOT_FOUND: {
    en: 'The record asked for does not exist. It may have been removed, or the link that led here is stale.',
    id: 'Data yang diminta tidak ada. Mungkin sudah dihapus, atau tautan yang membawa Anda ke sini sudah usang.',
  },
  SCOPE_DENIED: {
    en: 'The record exists but is outside what your account may see. A supplier can only see its own records; this answer is deliberately the same whether the record is foreign or absent, so that nothing leaks.',
    id: 'Data ada tetapi di luar jangkauan akun Anda. Pemasok hanya dapat melihat datanya sendiri; jawaban ini sengaja sama baik data milik pihak lain maupun tidak ada, agar tidak ada kebocoran.',
  },
  UPSTREAM: {
    en: 'A system this page depends on did not answer. The data is not wrong — it is absent. Retrying later is the normal response.',
    id: 'Sistem yang menjadi sumber halaman ini tidak menjawab. Data bukan salah — melainkan tidak ada. Mencoba lagi nanti adalah respons yang wajar.',
  },
  CHAOS: {
    en: 'A failure produced on purpose by the development-only fault injector, to prove the page handles failure honestly. It never occurs in a real deployment.',
    id: 'Kegagalan yang sengaja dibuat oleh penyuntik gangguan khusus pengembangan, untuk membuktikan halaman menangani kegagalan dengan jujur. Tidak pernah terjadi di lingkungan nyata.',
  },
  UNKNOWN: {
    en: 'A failure the read layer could not classify. It is reported as unknown rather than folded into a neighbouring cause, because a wrong cause is worse than an honest gap.',
    id: 'Kegagalan yang tidak dapat diklasifikasikan lapisan baca. Dilaporkan sebagai tidak diketahui alih-alih digabungkan ke penyebab terdekat, karena penyebab yang salah lebih buruk daripada kekosongan yang jujur.',
  },
} satisfies GlossaryOf<DataErrorCode>;

/**
 * §43 · The settle boundary's three. A `sapBoundary` command is TWO acts — the
 * submission and the settlement that lands it — and these classify a failure of
 * the SECOND. Each entry says the same three things, because a refusal that
 * omits any of them is the dead end `HALAL-REFUSAL-DEAD-ENDS-01` names: what
 * happened, what state the document is now in, and whether asking again helps.
 */
export const SETTLE_FAULT_GLOSSARY = {
  REFUSED: {
    en: 'The settlement was refused by a governing rule — the same kind of no a command gives before anything changes. The document is unchanged and still awaiting settlement. Asking again produces the same refusal; what the refusal names has to change first.',
    id: 'Penyelesaian ditolak oleh aturan yang mengatur — penolakan sejenis yang diberikan sebuah perintah sebelum ada yang berubah. Dokumen tidak berubah dan masih menunggu penyelesaian. Meminta lagi menghasilkan penolakan yang sama; yang disebut penolakan itu harus diubah lebih dulu.',
  },
  TRANSPORT: {
    en: 'The system that completes the settlement did not answer. The document is unchanged and still awaiting settlement — nothing was written by halves. This is the one class where trying again is the normal response.',
    id: 'Sistem yang menuntaskan penyelesaian tidak menjawab. Dokumen tidak berubah dan masih menunggu penyelesaian — tidak ada yang tertulis setengah jalan. Ini satu-satunya kelas yang wajar untuk dicoba lagi.',
  },
  UNGOVERNED: {
    en: 'The settlement stopped on a failure that never entered the governed failure channel at all, so the system can say that something broke but not that the next attempt would pass. The document is unchanged and still awaiting settlement. It is deliberately NOT offered as retryable — a fault a retry cannot fix must not read as a passing blip. Report it with the command reference.',
    id: 'Penyelesaian berhenti karena kegagalan yang sama sekali tidak masuk ke saluran kegagalan yang diatur, sehingga sistem dapat mengatakan ada yang rusak tetapi tidak bahwa percobaan berikutnya akan berhasil. Dokumen tidak berubah dan masih menunggu penyelesaian. Sengaja TIDAK ditawarkan untuk dicoba lagi — kesalahan yang tidak dapat diperbaiki dengan mengulang tidak boleh terbaca sebagai gangguan sesaat. Laporkan dengan referensi perintah.',
  },
} satisfies GlossaryOf<SettleFault>;

/** A quoted price could not be judged because its exchange rate was unusable. */
export const FX_REFUSAL_GLOSSARY = {
  FX_UNPINNED: {
    en: 'No exchange rate was pinned to this quotation, so a foreign-currency price cannot be compared with any other. The quote is not rejected — it is uncomparable until a rate is pinned.',
    id: 'Tidak ada kurs yang dipatok pada penawaran ini, sehingga harga mata uang asing tidak dapat dibandingkan dengan penawaran lain. Penawaran tidak ditolak — hanya tidak dapat dibandingkan sampai kurs dipatok.',
  },
  FX_STALE: {
    en: 'The pinned exchange rate is older than the comparison allows, so using it would understate or overstate the price. The rate must be re-pinned before the quote can be ranked.',
    id: 'Kurs yang dipatok lebih lama dari yang diizinkan perbandingan, sehingga penggunaannya akan membuat harga terlalu rendah atau terlalu tinggi. Kurs harus dipatok ulang sebelum penawaran dapat diperingkat.',
  },
} satisfies GlossaryOf<FxRefusalReason>;

/** A typed quantity could not be read as a number. */
export const QTY_REFUSAL_GLOSSARY = {
  EMPTY_QTY: {
    en: 'The quantity box was left blank. Blank is not read as zero — a zero you meant and a number you never typed are different facts, and the system refuses to guess between them.',
    id: 'Kolom kuantitas dibiarkan kosong. Kosong tidak dibaca sebagai nol — nol yang Anda maksud dan angka yang tidak pernah Anda ketik adalah dua hal berbeda, dan sistem menolak menebak di antaranya.',
  },
  NOT_NUMERIC: {
    en: 'What was typed is not a number at all. Nothing was saved.',
    id: 'Yang diketik sama sekali bukan angka. Tidak ada yang disimpan.',
  },
  AMBIGUOUS_QTY: {
    en: 'The number could be read two ways depending on whether the separator means thousands or decimals — 1.500 is fifteen hundred in Indonesian and one-and-a-half in English. The system refuses rather than pick one.',
    id: 'Angka dapat dibaca dua cara tergantung apakah pemisah berarti ribuan atau desimal — 1.500 berarti seribu lima ratus dalam bahasa Indonesia dan satu setengah dalam bahasa Inggris. Sistem menolak alih-alih memilih salah satu.',
  },
} satisfies GlossaryOf<QtyRefusalReason>;

/**
 * A halal-applicability lookup refused. Shared shape with BPOM — the two
 * unions are separate types with identical members BY DESIGN, so a halal
 * refusal can never be passed where a BPOM refusal is meant.
 */
export const HALAL_REFUSAL_GLOSSARY = {
  UNKNOWN_MATERIAL: {
    en: 'The material master does not list this code at all, so whether it needs a halal determination is not merely unknown — it has never been asked. No assumption is made either way.',
    id: 'Data induk material sama sekali tidak memuat kode ini, sehingga apakah ia memerlukan penetapan halal bukan sekadar tidak diketahui — pertanyaannya belum pernah diajukan. Tidak ada asumsi ke arah mana pun.',
  },
  UNDETERMINED_APPLICABILITY: {
    en: 'The material master lists this code but records no halal determination against it. The gap is deliberate and visible rather than defaulted to "not required".',
    id: 'Data induk material memuat kode ini tetapi tidak mencatat penetapan halal untuknya. Kekosongan ini disengaja dan terlihat, bukan disetel diam-diam menjadi "tidak diperlukan".',
  },
} satisfies GlossaryOf<HalalRefusalReason>;

/** The BPOM twin of the above. Separate union, deliberately identical members. */
export const BPOM_REFUSAL_GLOSSARY = {
  UNKNOWN_MATERIAL: {
    en: 'The material master does not list this code at all, so whether it falls under BPOM registration has never been asked. No assumption is made either way.',
    id: 'Data induk material sama sekali tidak memuat kode ini, sehingga apakah ia termasuk registrasi BPOM belum pernah ditanyakan. Tidak ada asumsi ke arah mana pun.',
  },
  UNDETERMINED_APPLICABILITY: {
    en: 'The material master lists this code but records no BPOM determination against it. The gap is deliberate and visible rather than defaulted to "not applicable".',
    id: 'Data induk material memuat kode ini tetapi tidak mencatat penetapan BPOM untuknya. Kekosongan ini disengaja dan terlihat, bukan disetel diam-diam menjadi "tidak berlaku".',
  },
} satisfies GlossaryOf<BpomRefusalReason>;

/**
 * ⚠️ **THE FIRST USER-FACING PROSE THESE FOUR HAVE EVER HAD.** They are
 * precedence-ordered in `halalVerification.ts` — the first that applies is the
 * one reported — and that ordering is a fact about the check, so the definitions
 * below say where each sits rather than describing four independent states.
 */
export const HALAL_NOT_SATISFIED_GLOSSARY = {
  NO_CERT: {
    en: 'No halal certificate is held for this supplier and material at all. Checked first, because the absence of a certificate makes every question about its contents moot.',
    id: 'Tidak ada sertifikat halal sama sekali untuk pemasok dan material ini. Diperiksa pertama, karena ketiadaan sertifikat membuat semua pertanyaan tentang isinya tidak relevan.',
  },
  EXPIRED: {
    en: 'A certificate exists but had lapsed at the moment the goods were received. The receipt date is what is judged, not today — a certificate renewed since does not make a past receipt covered.',
    id: 'Sertifikat ada tetapi sudah kedaluwarsa pada saat barang diterima. Yang dinilai adalah tanggal penerimaan, bukan hari ini — sertifikat yang telah diperbarui tidak membuat penerimaan di masa lalu menjadi tercakup.',
  },
  SCHEME_INVALID: {
    en: 'A certificate exists and was current, but was issued under a scheme that does not cover this material. Held valid in time yet not in scope.',
    id: 'Sertifikat ada dan masih berlaku, tetapi diterbitkan di bawah skema yang tidak mencakup material ini. Sah secara waktu namun tidak secara cakupan.',
  },
  UNDER_REVIEW: {
    en: 'A certificate has been submitted and no determination has been made yet. Reported last: it is the only one of the four that may resolve without anybody submitting anything new.',
    id: 'Sertifikat telah diajukan dan belum ada penetapan. Dilaporkan terakhir: hanya inilah dari keempatnya yang dapat selesai tanpa siapa pun mengajukan sesuatu yang baru.',
  },
} satisfies GlossaryOf<HalalNotSatisfiedReason>;
