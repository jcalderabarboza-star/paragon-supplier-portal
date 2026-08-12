// Glossary (GL-1) i18n fragment. Namespace: glossary.*
//
// ⚠️ EVERY STRING HERE IS PAGE CHROME. **NOT ONE OF THEM DEFINES A TERM.** The
// definitions live in `lib/glossary/*.glossary.ts`, EN and ID side by side on
// each entry, `satisfies`-pinned to the union they define — which is what makes
// a vocabulary correction ONE edit in ONE place. Copying a definition into this
// file would be the second copy, in the one file a coverage sweep would never
// flag, because it would look exactly like every other translated string.
//
// EN+ID from birth (MARKER-I18N-HOLE-01).
export const glossaryEn: Record<string, string> = {
  // — Page chrome —
  'glossary.crumb.platform': 'Platform',
  'glossary.crumb.glossary': 'Glossary',
  'glossary.header.title': 'Glossary',
  'glossary.header.subtitle':
    'What the portal means by each word it refuses, governs or classifies with.',
  'glossary.meta.summary':
    '{{terms}} terms across {{vocabularies}} vocabularies · English and Indonesian',

  // — The honest marker for this route (D-CENSUS-8) —
  'glossary.honesty.title': 'What this page is',
  'glossary.honesty.derived':
    'Real: the terms. Every word listed is a member of a closed type the portal actually ships, read from that type at build time — so a word cannot appear here unless the code has it, and cannot survive here once the code drops it. Where a word also occurs in a lifecycle machine, that list is read from the transition registry as the page loads.',
  'glossary.honesty.authored':
    'Authored, not derived: every definition. No sentence below is computed from anything; each was written by hand, in both languages, next to the type it defines.',
  'glossary.honesty.provisional':
    'Provisional, and offered for correction: these are the portal\'s words, not yet the procurement team\'s. The review under way is being run to elicit the right vocabulary, so nothing here should be read as settled. "That is not what we call it" is the useful answer, and acting on it is one edit in one place.',
  'glossary.honesty.matching':
    'How the appearance lists are matched: by exact spelling, and nothing else. So the same word standing for two different ideas in two machines is shown as what it is — one word in two places — rather than quietly separated. That collision is a finding, not a defect in the list.',

  // — The open half (HALAL-REFUSAL-DEAD-ENDS-01 / D-COMP-HALAL-4) —
  'glossary.remedy.title': 'What this page still does not tell you',
  'glossary.remedy.body':
    'This page says what a word means. It does not say what to do next. For a refusal at the loading dock — who rules on it, where that happens, and what becomes of the delivery meanwhile — there is no answer here, because there is not yet an answer anywhere. That route is an open question, deliberately left blank rather than filled with a plausible-looking destination.',

  // — Search and filters —
  'glossary.search.label': 'Search terms and definitions',
  'glossary.search.placeholder': 'Search a word, or a phrase from a definition…',
  'glossary.search.clear': 'Clear',
  'glossary.filter.title': 'Vocabularies',
  'glossary.filter.aria': 'Filter by vocabulary',
  'glossary.filter.all': 'All terms',
  'glossary.count.showing': 'Showing {{shown}} of {{total}} terms',
  'glossary.empty.noMatch': 'No term and no definition contains “{{query}}”.',

  // — One term —
  'glossary.term.definedBy': 'Defined by',
  'glossary.term.aria': 'Definition of {{term}}',
  'glossary.appears.title': 'Appears in these flows',
  'glossary.appears.kind.state': 'state',
  'glossary.appears.kind.transition': 'step',
  'glossary.appears.kind.field': 'required field',
  'glossary.appears.kind.hook': 'rule',
  'glossary.appears.initial': 'starts here',
  'glossary.appears.terminal': 'declared ending',
  'glossary.appears.edges': '{{count}} step(s) touch it',
  'glossary.appears.seeFlows': 'Open in Process Flows',
  'glossary.related.title': 'Related terms',
  'glossary.related.sharedWord': 'the same word in another vocabulary — a separate type, deliberately',
  'glossary.related.outsideEnforcement':
    'declared outside the enforcement domain: this is why a check reads unanswered rather than adverse',

  // — The chip that sits beside a refusal —
  'glossary.chip.aria': 'What “{{term}}” means, in the glossary',
  'glossary.chip.label': 'What this means',
};

export const glossaryId: Record<string, string> = {
  // — Chrome halaman —
  'glossary.crumb.platform': 'Platform',
  'glossary.crumb.glossary': 'Glosarium',
  'glossary.header.title': 'Glosarium',
  'glossary.header.subtitle':
    'Apa yang portal maksud dengan setiap kata yang dipakainya untuk menolak, mengatur, atau menggolongkan.',
  'glossary.meta.summary':
    '{{terms}} istilah dalam {{vocabularies}} kosakata · bahasa Inggris dan Indonesia',

  // — Penanda kejujuran untuk rute ini (D-CENSUS-8) —
  'glossary.honesty.title': 'Halaman ini sebenarnya apa',
  'glossary.honesty.derived':
    'Nyata: istilahnya. Setiap kata di sini adalah anggota tipe tertutup yang benar-benar dikirim portal, dibaca dari tipe itu saat build — jadi sebuah kata tidak bisa muncul di sini kalau kodenya tidak punya, dan tidak bisa bertahan di sini setelah kodenya menghapusnya. Bila sebuah kata juga muncul dalam mesin siklus hidup, daftarnya dibaca dari registri transisi saat halaman dimuat.',
  'glossary.honesty.authored':
    'Ditulis, bukan diturunkan: semua definisinya. Tidak satu pun kalimat di bawah dihitung dari apa pun; masing-masing ditulis tangan, dalam dua bahasa, bersebelahan dengan tipe yang didefinisikannya.',
  'glossary.honesty.provisional':
    'Sementara, dan memang untuk dikoreksi: ini kata-kata portal, belum kata-kata tim pengadaan. Peninjauan yang sedang berjalan dijalankan untuk menggali kosakata yang benar, jadi tidak ada di sini yang boleh dibaca sebagai sudah final. "Bukan itu sebutan kami" adalah jawaban yang berguna, dan menindaklanjutinya cukup satu suntingan di satu tempat.',
  'glossary.honesty.matching':
    'Cara daftar kemunculan dicocokkan: persis ejaannya, tidak lebih. Jadi kata yang sama yang mewakili dua gagasan berbeda di dua mesin ditampilkan apa adanya — satu kata di dua tempat — bukan diam-diam dipisahkan. Tabrakan itu adalah temuan, bukan cacat pada daftarnya.',

  // — Bagian yang masih terbuka (HALAL-REFUSAL-DEAD-ENDS-01 / D-COMP-HALAL-4) —
  'glossary.remedy.title': 'Yang belum diberitahukan halaman ini',
  'glossary.remedy.body':
    'Halaman ini menjelaskan arti sebuah kata. Halaman ini tidak menjelaskan apa langkah berikutnya. Untuk sebuah penolakan di dermaga bongkar — siapa yang memutuskan, di mana keputusan itu diambil, dan apa yang terjadi pada kiriman sementara itu — tidak ada jawabannya di sini, karena jawabannya memang belum ada di mana pun. Rute itu masih pertanyaan terbuka, sengaja dibiarkan kosong alih-alih diisi tujuan yang sekadar terlihat masuk akal.',

  // — Pencarian dan penyaring —
  'glossary.search.label': 'Cari istilah dan definisi',
  'glossary.search.placeholder': 'Cari sebuah kata, atau potongan kalimat definisi…',
  'glossary.search.clear': 'Bersihkan',
  'glossary.filter.title': 'Kosakata',
  'glossary.filter.aria': 'Saring menurut kosakata',
  'glossary.filter.all': 'Semua istilah',
  'glossary.count.showing': 'Menampilkan {{shown}} dari {{total}} istilah',
  'glossary.empty.noMatch': 'Tidak ada istilah maupun definisi yang memuat “{{query}}”.',

  // — Satu istilah —
  'glossary.term.definedBy': 'Didefinisikan oleh',
  'glossary.term.aria': 'Definisi {{term}}',
  'glossary.appears.title': 'Muncul dalam alur berikut',
  'glossary.appears.kind.state': 'status',
  'glossary.appears.kind.transition': 'langkah',
  'glossary.appears.kind.field': 'kolom wajib',
  'glossary.appears.kind.hook': 'aturan',
  'glossary.appears.initial': 'dimulai di sini',
  'glossary.appears.terminal': 'akhir yang dinyatakan',
  'glossary.appears.edges': '{{count}} langkah menyentuhnya',
  'glossary.appears.seeFlows': 'Buka di Alur Proses',
  'glossary.related.title': 'Istilah terkait',
  'glossary.related.sharedWord': 'kata yang sama di kosakata lain — tipe terpisah, dan itu disengaja',
  'glossary.related.outsideEnforcement':
    'dinyatakan berada di luar ranah penegakan: inilah sebabnya sebuah pemeriksaan terbaca belum terjawab, bukan merugikan',

  // — Cip yang mendampingi sebuah penolakan —
  'glossary.chip.aria': 'Arti “{{term}}” di glosarium',
  'glossary.chip.label': 'Apa artinya ini',
};
