// ─────────────────────────────────────────────────────────────────────────────
// GL-0 · THE GOVERNANCE VOCABULARY, DEFINED. EN + ID, exhaustiveness-pinned.
//
// These are the terms the procurement review is most likely to correct, because
// they are the ones where the PORTAL'S word and the TEAM'S word are most likely
// to differ. Each is one definition in one place; a correction is an edit here.
// ─────────────────────────────────────────────────────────────────────────────
import type { GlossaryOf } from './types';
import type {
  EnforcementMode,
  EnforcementModeSource,
  GovernedCheckId,
  GovernedVerdict,
  OverrideReason,
  UnattributedReason,
} from '../enforcement';
import type { CertType, ComplianceDisplayStatus } from '../../services/data/types';
import type { HalalApplicability, BpomApplicability } from '../../services/sdc/types';

/** How hard a governed check bites when it comes back adverse. */
export const ENFORCEMENT_MODE_GLOSSARY = {
  OBSERVE: {
    en: 'The check runs and its result is recorded, but it never stops anyone. Used while a rule is being proven — the trail shows what would have been blocked.',
    id: 'Pemeriksaan berjalan dan hasilnya dicatat, tetapi tidak pernah menghentikan siapa pun. Dipakai saat sebuah aturan sedang dibuktikan — jejaknya menunjukkan apa yang akan diblokir.',
  },
  BLOCK_OVERRIDABLE: {
    en: 'An adverse result stops the action, but a named person may proceed anyway by recording a reason. The override is part of the permanent trail, not a way around it.',
    id: 'Hasil yang merugikan menghentikan tindakan, tetapi orang yang disebutkan namanya dapat tetap melanjutkan dengan mencatat alasan. Penimpaan menjadi bagian dari jejak permanen, bukan jalan memutarnya.',
  },
  BLOCK: {
    en: 'An adverse result stops the action and no one may proceed. There is no override, so nothing needs to be attributed.',
    id: 'Hasil yang merugikan menghentikan tindakan dan tidak seorang pun boleh melanjutkan. Tidak ada penimpaan, sehingga tidak ada yang perlu diatribusikan.',
  },
} satisfies GlossaryOf<EnforcementMode>;

/** The checks the platform governs. A closed list, not a category. */
export const GOVERNED_CHECK_GLOSSARY = {
  'halal.seal': {
    en: 'Someone physically looked at the halal seal on the goods and ticked it. An attestation by an inspector, not a lookup.',
    id: 'Seseorang benar-benar melihat segel halal pada barang dan mencentangnya. Sebuah pernyataan pemeriksa, bukan pencarian data.',
  },
  'halal.certificate': {
    en: 'A certificate backing the halal claim for this supplier and material was valid at the moment the goods were received. A lookup against a date, not an opinion.',
    id: 'Sertifikat yang mendukung klaim halal untuk pemasok dan material ini berlaku pada saat barang diterima. Pencarian terhadap tanggal, bukan penilaian.',
  },
  'bpom.lot': {
    en: 'The received lot carries the BPOM registration its material requires. Judged per lot, because registration attaches to what arrived, not to the supplier in general.',
    id: 'Lot yang diterima membawa registrasi BPOM yang diperlukan materialnya. Dinilai per lot, karena registrasi melekat pada apa yang tiba, bukan pada pemasok secara umum.',
  },
} satisfies GlossaryOf<GovernedCheckId>;

/** What a governed check concluded. Three answers, and the third is not a failure. */
export const GOVERNED_VERDICT_GLOSSARY = {
  PASS: {
    en: 'The check ran and was satisfied.',
    id: 'Pemeriksaan berjalan dan terpenuhi.',
  },
  ADVERSE: {
    en: 'The check ran and was not satisfied. This is a real answer about the goods.',
    id: 'Pemeriksaan berjalan dan tidak terpenuhi. Ini jawaban nyata tentang barangnya.',
  },
  UNANSWERED: {
    en: 'The check did not run, or could not reach a conclusion. Deliberately NOT the same as adverse: "we asked and the answer was no" and "nobody asked" are different facts, and collapsing them would let an unasked question look like a clean one.',
    id: 'Pemeriksaan tidak berjalan, atau tidak dapat mencapai kesimpulan. Sengaja TIDAK sama dengan merugikan: "kami bertanya dan jawabannya tidak" dan "tidak ada yang bertanya" adalah dua hal berbeda, dan menyamakannya akan membuat pertanyaan yang belum diajukan tampak bersih.',
  },
} satisfies GlossaryOf<GovernedVerdict>;

/** Why someone proceeded past an adverse check. A closed list on purpose. */
export const OVERRIDE_REASON_GLOSSARY = {
  EVIDENCE_HELD_OUTSIDE_PORTAL: {
    en: 'The evidence satisfying the check exists, but not in this system — a paper file or another team\'s records. The override records where the truth actually lives.',
    id: 'Bukti yang memenuhi pemeriksaan itu ada, tetapi tidak dalam sistem ini — berkas kertas atau catatan tim lain. Penimpaan mencatat di mana kebenarannya sebenarnya berada.',
  },
  CERTIFIER_CONFIRMED_DIRECTLY: {
    en: 'The certifying body was contacted and confirmed the position directly, ahead of the paperwork catching up.',
    id: 'Lembaga sertifikasi dihubungi dan mengonfirmasi posisinya secara langsung, mendahului kelengkapan dokumen.',
  },
  ACCEPTED_TO_QUARANTINE: {
    en: 'The goods were taken in but held apart, not released for use. The override admits the goods, not their use.',
    id: 'Barang diterima tetapi ditahan terpisah, tidak dilepas untuk digunakan. Penimpaan mengizinkan barang masuk, bukan penggunaannya.',
  },
  COMMERCIAL_RISK_ACCEPTED: {
    en: 'No evidence was produced and none is claimed; a named person accepted the consequences. The most exposed of the four, and the one an audit reads first.',
    id: 'Tidak ada bukti yang diberikan dan tidak ada yang diklaim; orang yang disebutkan namanya menerima konsekuensinya. Yang paling terbuka dari keempatnya, dan yang pertama dibaca dalam audit.',
  },
} satisfies GlossaryOf<OverrideReason>;

/**
 * Why an override could not be attributed to a person.
 * ⚠️ An override that cannot name a person CANNOT COMPLETE — these are the two
 * ways that happens, and both are refusals rather than warnings.
 */
export const UNATTRIBUTED_REASON_GLOSSARY = {
  NO_PERSON_IN_SESSION: {
    en: 'The session identifies a role and a company but no individual. An override must name who accepted the risk, so it cannot complete from such a session.',
    id: 'Sesi mengenali peran dan perusahaan tetapi bukan individu. Penimpaan harus menyebut siapa yang menerima risiko, sehingga tidak dapat diselesaikan dari sesi seperti itu.',
  },
  IDENTITY_PROVIDER_UNAVAILABLE: {
    en: 'The system that would name the individual could not be reached. The override is refused rather than recorded anonymously — an anonymous unlock in a permanent trail is worse than no unlock.',
    id: 'Sistem yang akan menyebut individu tidak dapat dihubungi. Penimpaan ditolak alih-alih dicatat tanpa nama — pembukaan tanpa nama dalam jejak permanen lebih buruk daripada tidak ada pembukaan.',
  },
} satisfies GlossaryOf<UnattributedReason>;

/** Where the mode that was applied actually came from. */
export const ENFORCEMENT_MODE_SOURCE_GLOSSARY = {
  // D-B — renamed from `AS_SET` (2026-08-12). `AS_SET` named the MECHANISM
  // (a setting was set); `AS_RECORDED` names what a reader needs — that the
  // recorded mode is the one in force because nothing intervened.
  AS_RECORDED: {
    en: 'The mode someone recorded is the mode in force, because nothing intervened. Note the case that reads oddly and is correct: a full-rigour setting whose review date has passed still reads as recorded, NOT as tightened — nothing was tightened, because there is nothing stricter to tighten to.',
    id: 'Mode yang dicatat seseorang adalah mode yang berlaku, karena tidak ada yang mengintervensi. Perhatikan kasus yang terbaca ganjil namun benar: pengaturan rigor penuh yang tanggal peninjauannya telah lewat tetap terbaca sebagai tercatat, BUKAN diperketat — tidak ada yang diperketat, karena tidak ada yang lebih ketat untuk dituju.',
  },
  EXPIRY_TIGHTENED: {
    en: 'A recorded relaxation had passed its review date, so the stricter mode was applied instead. A relaxation expires by itself rather than lasting until somebody remembers it.',
    id: 'Pelonggaran yang dicatat telah melewati tanggal peninjauan, sehingga mode yang lebih ketat diterapkan. Pelonggaran berakhir dengan sendirinya alih-alih bertahan sampai seseorang mengingatnya.',
  },
  NO_SETTING_RECORDED: {
    en: 'Nobody has recorded a mode for this check, so the default applied. Reported distinctly so an unconfigured check never looks like a chosen one.',
    id: 'Belum ada yang mencatat mode untuk pemeriksaan ini, sehingga mode bawaan diterapkan. Dilaporkan secara terpisah agar pemeriksaan yang belum dikonfigurasi tidak pernah tampak seperti pilihan.',
  },
  UNRECOGNISED_MODE: {
    en: 'A stored value is not one of the modes this system knows. The strictest mode is applied and the fact is surfaced, rather than the value being quietly treated as the default.',
    id: 'Nilai tersimpan bukan salah satu mode yang dikenali sistem ini. Mode paling ketat diterapkan dan faktanya ditampilkan, alih-alih nilai itu diam-diam dianggap bawaan.',
  },
  UNATTRIBUTED_OVERRIDE: {
    en: 'A relaxation was found that no person can be attached to, so it was not honoured. See the unattributed reasons for the two ways this arises.',
    id: 'Ditemukan pelonggaran yang tidak dapat dikaitkan dengan siapa pun, sehingga tidak dihormati. Lihat alasan tanpa atribusi untuk dua cara hal ini terjadi.',
  },
} satisfies GlossaryOf<EnforcementModeSource>;

/** What a compliance cell shows a reader. */
export const COMPLIANCE_DISPLAY_GLOSSARY = {
  Missing: {
    en: 'A certificate is required and none is held. The natural starting state — a cell exists because the requirement matrix says this supplier and scheme need one.',
    id: 'Sertifikat diperlukan dan tidak ada yang dimiliki. Status awal yang wajar — sebuah sel ada karena matriks persyaratan menyatakan pemasok dan skema ini memerlukannya.',
  },
  'Under Review': {
    en: 'A certificate has been submitted and no determination has been made.',
    id: 'Sertifikat telah diajukan dan belum ada penetapan.',
  },
  Valid: {
    en: 'A certificate is held and is current.',
    id: 'Sertifikat dimiliki dan masih berlaku.',
  },
  Expiring: {
    en: 'A valid certificate whose expiry is near enough to act on. Derived from today\'s date rather than stored, so it is never stale.',
    id: 'Sertifikat sah yang masa berlakunya cukup dekat untuk ditindaklanjuti. Diturunkan dari tanggal hari ini, bukan disimpan, sehingga tidak pernah usang.',
  },
  Expired: {
    en: 'A certificate is held and its date has passed. Distinct from Missing: something was submitted once, which changes what has to be chased.',
    id: 'Sertifikat dimiliki dan tanggalnya sudah lewat. Berbeda dari Tidak Ada: sesuatu pernah diajukan, dan itu mengubah apa yang harus ditindaklanjuti.',
  },
} satisfies GlossaryOf<ComplianceDisplayStatus>;

/** The kinds of certificate the portal recognises. */
export const CERT_TYPE_GLOSSARY = {
  HALAL_BPJPH: {
    en: 'A halal certificate issued by BPJPH, the Indonesian state body that now issues them.',
    id: 'Sertifikat halal yang diterbitkan BPJPH, badan negara Indonesia yang kini menerbitkannya.',
  },
  HALAL_MUI_LEGACY: {
    en: 'A halal certificate issued by MUI before BPJPH took over issuance. Still recognised, on a fixed transitional term rather than indefinitely.',
    id: 'Sertifikat halal yang diterbitkan MUI sebelum BPJPH mengambil alih penerbitan. Masih diakui, dengan jangka transisi tetap, bukan tanpa batas.',
  },
  HALAL_FOREIGN: {
    en: 'A halal certificate from an overseas body, recognised through a mutual arrangement rather than issued domestically.',
    id: 'Sertifikat halal dari lembaga luar negeri, diakui melalui kesepakatan timbal balik, bukan diterbitkan di dalam negeri.',
  },
  BPOM: {
    en: 'A registration with BPOM, the Indonesian food and drug authority. A registration of a product, not an attestation about a process.',
    id: 'Registrasi pada BPOM, otoritas obat dan makanan Indonesia. Registrasi sebuah produk, bukan pernyataan tentang sebuah proses.',
  },
  ISO: {
    en: 'An ISO management-system certificate. It says how a supplier works, not what any particular lot contains.',
    id: 'Sertifikat sistem manajemen ISO. Menyatakan bagaimana pemasok bekerja, bukan apa isi lot tertentu.',
  },
  OTHER: {
    en: 'A certificate the portal holds but does not model. Deliberately not folded into a neighbouring type — a wrong type is worse than an unclassified one.',
    id: 'Sertifikat yang disimpan portal tetapi tidak dimodelkan. Sengaja tidak digabungkan ke jenis terdekat — jenis yang salah lebih buruk daripada yang tidak terklasifikasi.',
  },
} satisfies GlossaryOf<CertType>;

/** Whether a material needs a halal determination at all. */
export const HALAL_APPLICABILITY_GLOSSARY = {
  REQUIRED: {
    en: 'This material needs a halal determination.',
    id: 'Material ini memerlukan penetapan halal.',
  },
  NOT_REQUIRED: {
    en: 'This material does not need one — a positive finding, not an absence of information.',
    id: 'Material ini tidak memerlukannya — sebuah temuan positif, bukan ketiadaan informasi.',
  },
  UNDETERMINED: {
    en: 'Nobody has decided yet. Kept separate from "not required" so an undecided material is never treated as a cleared one.',
    id: 'Belum ada yang memutuskan. Dipisahkan dari "tidak diperlukan" agar material yang belum diputuskan tidak pernah dianggap sudah bebas.',
  },
} satisfies GlossaryOf<HalalApplicability>;

/** Whether a material falls under BPOM registration. */
export const BPOM_APPLICABILITY_GLOSSARY = {
  APPLICABLE: {
    en: 'This material falls under BPOM registration.',
    id: 'Material ini termasuk dalam registrasi BPOM.',
  },
  NOT_APPLICABLE: {
    en: 'This material does not — a positive finding, not an absence of information.',
    id: 'Material ini tidak termasuk — sebuah temuan positif, bukan ketiadaan informasi.',
  },
  UNDETERMINED: {
    en: 'Nobody has decided yet. Kept separate from "not applicable" for the same reason as its halal twin.',
    id: 'Belum ada yang memutuskan. Dipisahkan dari "tidak berlaku" dengan alasan yang sama seperti pasangan halalnya.',
  },
} satisfies GlossaryOf<BpomApplicability>;
