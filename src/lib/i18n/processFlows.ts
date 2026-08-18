// Process Flows (PF-1) i18n fragment. Namespace: processFlows.*
//
// ⚠️ EVERY STRING HERE IS PAGE CHROME. Not one of them describes a particular
// flow, state or verb — those are the schema's own identifiers and are rendered
// untranslated, exactly as a document number is.
//
// ⚠️ **PURPOSE PROSE LIVES NEXT DOOR, IN `processFlowPurpose.ts` (PF-2), AND
// MUST NOT DRIFT BACK INTO THIS FILE.** Those strings are the opposite of these:
// each one explains ONE registered machine or verb, keyed by its transition id
// and bilaterally pinned to the registry. Keeping the two apart is what lets
// this header's first sentence stay literally true — a claim a reader can check
// by reading the file, rather than a claim about intent.
//
// EN+ID from birth (MARKER-I18N-HOLE-01): a late hand-rolled string is exactly
// the class a coverage sweep is blind to, and a brand-new page is nothing but
// late strings.
export const processFlowsEn: Record<string, string> = {
  // — Page chrome —
  'processFlows.crumb.platform': 'Platform',
  'processFlows.crumb.processFlows': 'Process Flows',
  'processFlows.header.title': 'Process Flows',
  'processFlows.header.subtitle':
    'Every lifecycle machine the portal ships, drawn from the transition schema itself.',
  'processFlows.meta.summary':
    '{{flows}} flows · {{states}} states · {{transitions}} transitions · {{forks}} decision points · {{looseEnds}} recorded loose ends',

  // — The honest marker for this route (D-CENSUS-8) —
  'processFlows.honesty.title': 'What this page reads',
  'processFlows.honesty.derived':
    'Real: the catalog. Every state, transition, trigger, role, required field, policy hook, SAP boundary, cascade link, terminal and count below is read from the shipped transition schema at runtime. There is no second copy, so this page cannot show a state the machine does not have — and cannot hide one it does.',
  'processFlows.honesty.notReal':
    'Not real: the lifecycle walk is a local demo cursor. It advances nothing, dispatches nothing, and resets on reload. Whether a machine\'s verbs really dispatch, and where its read surface gets its rows, are marked separately on each flow.',
  // — PF-2: the one thing on this page that is authored rather than read —
  'processFlows.honesty.authored':
    'Authored, not derived: the one-line purpose beside each machine and each verb is written by hand. Purpose is the one thing the transition schema does not carry, and nothing derivable stands in for it — a trigger says a person does something, never why a person would. Each one is pinned to a live transition in both directions, and none of them repeats a state name, role or field, so a sentence here cannot quietly disagree with the machine beside it.',
  'processFlows.honesty.identifiers':
    'State names, transition ids, roles, fields and hook names are the schema\'s own identifiers, and are shown verbatim in both languages. So are the two pieces of recorded English source text below — what the analyzer found, and the census note saying why it ships. Translating a recorded finding would put a second wording of it in the tree.',

  // — The catalog rail —
  'processFlows.catalog.title': 'Flow catalog',
  'processFlows.catalog.aria': 'Registered lifecycle flows',
  'processFlows.catalog.counts': '{{states}} states · {{transitions}} transitions',

  // — Selected flow header —
  'processFlows.flow.counts':
    '{{states}} states · {{transitions}} transitions · {{forks}} decision points · schema v{{version}}',
  'processFlows.flow.initial': 'Initial',
  'processFlows.flow.terminals': 'Declared endings',
  'processFlows.flow.noTerminals': 'none declared',

  // — Per-flow two-axis marker —
  'processFlows.provenance.noReadSurface': 'No read surface',
  'processFlows.provenance.fixtureFeed': 'Sample data · {{capability}}',
  'processFlows.provenance.dispatches': 'Commands dispatch',
  'processFlows.provenance.unwired': 'Authored — unwired',

  // — Step kinds (derived from `trigger` + `surfaceable`, never authored) —
  'processFlows.step.operator': 'Operator action',
  'processFlows.step.system': 'System-driven',
  // A human act with no screen — refused by a standing ruling, not unbuilt.
  // "Not offered" says what a reader can observe; the row's `why` says which
  // ruling, and lifting that ruling is what changes it.
  'processFlows.step.unsurfaced': 'Not offered',
  'processFlows.step.creation': 'Creation',

  // — Node + edge badges —
  'processFlows.badge.birth': 'Born here',
  'processFlows.badge.initial': 'Initial',
  'processFlows.badge.terminal': 'Ending',
  'processFlows.badge.fork': 'Fork',
  'processFlows.badge.fact': 'Fact',
  'processFlows.badge.settles': '(settles)',
  'processFlows.legend.cascade': 'Cascade — fired by another machine',
  'processFlows.legend.settlement': 'Settlement — async SAP boundary',
  'processFlows.diagram.aria':
    'Flow diagram for {{entity}}: {{states}} states, {{transitions}} transitions',

  // — Loose ends: the derived kinds —
  'processFlows.looseEnd.unreachableState': 'Nothing enters this state',
  'processFlows.looseEnd.exitLessState': 'Nothing leaves this state',
  'processFlows.looseEnd.deadTransition': 'This verb can never fire',
  'processFlows.looseEnd.initialIntegrity': 'No verb brings an instance into existence',
  'processFlows.looseEnd.unauthoredCascade': 'Declared a cascade, and nothing fires it',
  'processFlows.looseEnd.title': 'Recorded loose ends ({{total}})',
  'processFlows.looseEnd.body':
    'Each one is derived first and annotated second, so an exemption cannot outlive its subject. A reason token means the hole is a recorded decision, not an omission.',
  'processFlows.looseEnd.censusNote': 'Census note',

  // — Loose ends: the reason vocabulary (glosses; the token itself is shown raw) —
  'processFlows.reason.keyTitle': 'Reason tokens',
  'processFlows.reason.deferredEdge': 'The resolving edge is intended and not yet authored.',
  'processFlows.reason.authoredUnwired':
    'The states and verbs exist; nothing wires the path to them yet.',
  'processFlows.reason.substrateOnly':
    'A sub-flow rolled up by its parent and never instantiated on its own.',
  'processFlows.reason.bornState':
    'The entity exists because its subject does — no creation verb, by design.',
  'processFlows.reason.uncensused': 'no recorded reason',

  // — Transitions table —
  'processFlows.transitions.title': 'Transitions',
  'processFlows.transitions.body':
    'One row per declared transition, in schema order. Every column is read off the definition.',
  'processFlows.col.transition': 'Transition',
  'processFlows.col.edge': 'From → To',
  'processFlows.col.step': 'Step',
  'processFlows.col.role': 'Required role',
  'processFlows.col.contract': 'Fields & hooks',
  'processFlows.col.links': 'Boundary & links',
  'processFlows.role.unmapped': 'no persona mapped',
  'processFlows.flag.recordsFact': 'Records a fact — does not move',
  'processFlows.flag.sapBoundary': 'SAP boundary — settles to {{state}}',
  'processFlows.flag.fansOut': 'Fans out → {{entity}} · {{verb}}',
  'processFlows.flag.firedBy': 'Fired by {{sources}}',
  'processFlows.flag.firedByNothing': 'Nothing fires it',

  // — The lifecycle walk —
  'processFlows.walk.title': 'Lifecycle walk',
  'processFlows.walk.contract':
    'Advancing moves a local demo cursor only; system steps are shown as observed, never performed. Nothing is saved, nothing is dispatched, and the cursor resets on reload.',
  'processFlows.walk.notLearn':
    'This is a reading aid over the diagram above. It is not a guided lesson: no real record is opened and no verb reaches the command spine.',
  'processFlows.walk.reset': 'Reset walk',
  'processFlows.walk.cursor': 'Cursor',
  'processFlows.walk.notStarted': 'not started',
  'processFlows.walk.noCreationVerb':
    'This machine declares no creation verb, so the walk starts at its declared initial state ({{states}}).',
  'processFlows.walk.seedAt': 'Start the walk at',
  'processFlows.walk.advance': 'Advance',
  'processFlows.walk.observe': 'Observe',
  'processFlows.walk.viaSettlement': 'Settlement',
  'processFlows.walk.declaredEnding': 'The flow declares this state an ending. No step leaves it.',
  'processFlows.walk.noExit':
    'No transition leaves this state, and the flow does not declare it an ending — see the recorded loose ends below.',
  'processFlows.walk.factsHere': 'Verbs that record a fact here without moving the entity:',
};

export const processFlowsId: Record<string, string> = {
  // — Page chrome —
  'processFlows.crumb.platform': 'Platform',
  'processFlows.crumb.processFlows': 'Alur Proses',
  'processFlows.header.title': 'Alur Proses',
  'processFlows.header.subtitle':
    'Setiap mesin siklus hidup yang dikirim portal ini, digambar langsung dari skema transisi.',
  'processFlows.meta.summary':
    '{{flows}} alur · {{states}} status · {{transitions}} transisi · {{forks}} titik keputusan · {{looseEnds}} ujung terbuka tercatat',

  // — The honest marker for this route (D-CENSUS-8) —
  'processFlows.honesty.title': 'Apa yang dibaca halaman ini',
  'processFlows.honesty.derived':
    'Nyata: katalognya. Setiap status, transisi, pemicu, peran, bidang wajib, kait kebijakan, batas SAP, tautan kaskade, akhir, dan hitungan di bawah dibaca dari skema transisi yang dikirim, saat aplikasi berjalan. Tidak ada salinan kedua, jadi halaman ini tidak bisa menampilkan status yang tidak dimiliki mesinnya — dan tidak bisa menyembunyikan status yang dimilikinya.',
  'processFlows.honesty.notReal':
    'Tidak nyata: penelusuran siklus hidup hanyalah kursor demo lokal. Ia tidak memajukan apa pun, tidak mengirim perintah apa pun, dan kembali ke awal saat halaman dimuat ulang. Apakah verba sebuah mesin benar-benar mengirim perintah, dan dari mana permukaan bacanya memperoleh barisnya, ditandai terpisah pada tiap alur.',
  // — PF-2: the one thing on this page that is authored rather than read —
  'processFlows.honesty.authored':
    'Ditulis, bukan diturunkan: kalimat tujuan satu baris di samping tiap mesin dan tiap verba ditulis dengan tangan. Tujuan adalah satu-satunya hal yang tidak dibawa skema transisi, dan tidak ada yang bisa diturunkan sebagai penggantinya — sebuah pemicu menyatakan bahwa seseorang melakukannya, tidak pernah mengapa seseorang mau melakukannya. Masing-masing dipautkan pada transisi yang hidup dari dua arah, dan tak satu pun mengulang nama status, peran, atau bidang, sehingga kalimat di sini tidak bisa diam-diam bertentangan dengan mesin di sebelahnya.',
  'processFlows.honesty.identifiers':
    'Nama status, id transisi, peran, bidang, dan nama kait adalah pengenal milik skema itu sendiri, dan ditampilkan apa adanya dalam kedua bahasa. Begitu pula dua potong teks sumber berbahasa Inggris di halaman ini — apa yang ditemukan penganalisis, dan catatan sensus yang menjelaskan mengapa hal itu tetap dikirim. Menerjemahkan sebuah temuan berarti menaruh versi kedua dari kalimat itu di dalam repositori.',

  // — The catalog rail —
  'processFlows.catalog.title': 'Katalog alur',
  'processFlows.catalog.aria': 'Alur siklus hidup yang terdaftar',
  'processFlows.catalog.counts': '{{states}} status · {{transitions}} transisi',

  // — Selected flow header —
  'processFlows.flow.counts':
    '{{states}} status · {{transitions}} transisi · {{forks}} titik keputusan · skema v{{version}}',
  'processFlows.flow.initial': 'Awal',
  'processFlows.flow.terminals': 'Akhir yang dinyatakan',
  'processFlows.flow.noTerminals': 'tidak ada yang dinyatakan',

  // — Per-flow two-axis marker —
  'processFlows.provenance.noReadSurface': 'Tanpa permukaan baca',
  'processFlows.provenance.fixtureFeed': 'Data contoh · {{capability}}',
  'processFlows.provenance.dispatches': 'Perintah terkirim',
  'processFlows.provenance.unwired': 'Ditulis — belum tersambung',

  // — Step kinds (derived from `trigger` + `surfaceable`, never authored) —
  'processFlows.step.operator': 'Tindakan operator',
  'processFlows.step.system': 'Digerakkan sistem',
  'processFlows.step.unsurfaced': 'Tidak disediakan',
  'processFlows.step.creation': 'Pembuatan',

  // — Node + edge badges —
  'processFlows.badge.birth': 'Lahir di sini',
  'processFlows.badge.initial': 'Awal',
  'processFlows.badge.terminal': 'Akhir',
  'processFlows.badge.fork': 'Cabang',
  'processFlows.badge.fact': 'Fakta',
  'processFlows.badge.settles': '(penyelesaian)',
  'processFlows.legend.cascade': 'Kaskade — dipicu mesin lain',
  'processFlows.legend.settlement': 'Penyelesaian — batas SAP asinkron',
  'processFlows.diagram.aria':
    'Diagram alur untuk {{entity}}: {{states}} status, {{transitions}} transisi',

  // — Loose ends: the derived kinds —
  'processFlows.looseEnd.unreachableState': 'Tidak ada yang masuk ke status ini',
  'processFlows.looseEnd.exitLessState': 'Tidak ada yang keluar dari status ini',
  'processFlows.looseEnd.deadTransition': 'Verba ini tidak akan pernah bisa dijalankan',
  'processFlows.looseEnd.initialIntegrity': 'Tidak ada verba yang memunculkan instansi',
  'processFlows.looseEnd.unauthoredCascade': 'Dinyatakan kaskade, tetapi tidak ada yang memicunya',
  'processFlows.looseEnd.title': 'Ujung terbuka tercatat ({{total}})',
  'processFlows.looseEnd.body':
    'Masing-masing diturunkan lebih dulu lalu dianotasi, sehingga sebuah pengecualian tidak bisa hidup lebih lama daripada penyebabnya. Token alasan berarti celah itu adalah keputusan yang dicatat, bukan kelalaian.',
  'processFlows.looseEnd.censusNote': 'Catatan sensus',

  // — Loose ends: the reason vocabulary (glosses; the token itself is shown raw) —
  'processFlows.reason.keyTitle': 'Token alasan',
  'processFlows.reason.deferredEdge': 'Sisi penyelesaiannya memang direncanakan dan belum ditulis.',
  'processFlows.reason.authoredUnwired':
    'Status dan verbanya sudah ada; belum ada yang menyambungkan jalannya.',
  'processFlows.reason.substrateOnly':
    'Sub-alur yang digulung oleh induknya dan tidak pernah dibuat sendiri.',
  'processFlows.reason.bornState':
    'Entitas ada karena subjeknya ada — tanpa verba pembuatan, memang dirancang begitu.',
  'processFlows.reason.uncensused': 'tanpa alasan tercatat',

  // — Transitions table —
  'processFlows.transitions.title': 'Transisi',
  'processFlows.transitions.body':
    'Satu baris per transisi yang dinyatakan, dalam urutan skema. Setiap kolom dibaca dari definisinya.',
  'processFlows.col.transition': 'Transisi',
  'processFlows.col.edge': 'Dari → Ke',
  'processFlows.col.step': 'Langkah',
  'processFlows.col.role': 'Peran wajib',
  'processFlows.col.contract': 'Bidang & kait',
  'processFlows.col.links': 'Batas & tautan',
  'processFlows.role.unmapped': 'tanpa persona terpetakan',
  'processFlows.flag.recordsFact': 'Mencatat fakta — tidak memindahkan',
  'processFlows.flag.sapBoundary': 'Batas SAP — diselesaikan ke {{state}}',
  'processFlows.flag.fansOut': 'Menyebar → {{entity}} · {{verb}}',
  'processFlows.flag.firedBy': 'Dipicu oleh {{sources}}',
  'processFlows.flag.firedByNothing': 'Tidak ada yang memicunya',

  // — The lifecycle walk —
  'processFlows.walk.title': 'Penelusuran siklus hidup',
  'processFlows.walk.contract':
    'Memajukan hanya menggerakkan kursor demo lokal; langkah sistem ditampilkan sebagai teramati, tidak pernah dijalankan. Tidak ada yang disimpan, tidak ada yang dikirim, dan kursor kembali ke awal saat halaman dimuat ulang.',
  'processFlows.walk.notLearn':
    'Ini alat bantu baca untuk diagram di atas. Ini bukan pelajaran terpandu: tidak ada catatan nyata yang dibuka dan tidak ada verba yang sampai ke tulang punggung perintah.',
  'processFlows.walk.reset': 'Atur ulang',
  'processFlows.walk.cursor': 'Kursor',
  'processFlows.walk.notStarted': 'belum dimulai',
  'processFlows.walk.noCreationVerb':
    'Mesin ini tidak menyatakan verba pembuatan, jadi penelusuran dimulai dari status awal yang dinyatakannya ({{states}}).',
  'processFlows.walk.seedAt': 'Mulai penelusuran di',
  'processFlows.walk.advance': 'Majukan',
  'processFlows.walk.observe': 'Amati',
  'processFlows.walk.viaSettlement': 'Penyelesaian',
  'processFlows.walk.declaredEnding':
    'Alur ini menyatakan status tersebut sebagai akhir. Tidak ada langkah yang meninggalkannya.',
  'processFlows.walk.noExit':
    'Tidak ada transisi yang meninggalkan status ini, dan alur tidak menyatakannya sebagai akhir — lihat ujung terbuka tercatat di bawah.',
  'processFlows.walk.factsHere': 'Verba yang mencatat fakta di sini tanpa memindahkan entitas:',
};
