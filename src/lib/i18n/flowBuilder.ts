// ────────────────────────────────────────────────────────────────────────────
// FB-1 · The Flow Builder — EN/ID, both languages from birth.
//
// `flowBuilder.rule.<code>.text` / `.why` are the sentences of the rule table in
// `services/flowBuilder/validateVersion.ts`: `flowBuilderRules.test.ts` holds
// the two EQUAL, so a rule cannot be enforced without a sentence or described
// without being enforced.
// ────────────────────────────────────────────────────────────────────────────

export const flowBuilderEn: Record<string, string> = {
  'flowBuilder.view.aria': 'Process Flows views',
  'flowBuilder.view.catalogue': 'Catalogue',
  'flowBuilder.view.changes': 'Changes',

  'flowBuilder.inForce.shipped': 'Shipped · version {{version}} — in force',

  'flowBuilder.changes.title': 'Changes to processes',
  'flowBuilder.changes.body':
    'A change adds steps, checks and forks in front of acts a process already has. It can add a refusal and can never take one away. Nothing here is in force: every process runs as it shipped.',
  'flowBuilder.changes.new': 'New change',
  'flowBuilder.changes.empty': 'No change has been drafted yet.',
  'flowBuilder.changes.emptyHint': 'A change starts as a draft against one process.',
  'flowBuilder.changes.col.label': 'Version',
  'flowBuilder.changes.col.process': 'Process',
  'flowBuilder.changes.col.title': 'Title',
  'flowBuilder.changes.col.state': 'State',
  'flowBuilder.changes.col.createdBy': 'Drafted by',
  'flowBuilder.changes.col.createdAt': 'Drafted',
  'flowBuilder.changes.col.elements': 'Adds',
  'flowBuilder.changes.elements_one': '{{count}} element',
  'flowBuilder.changes.elements_other': '{{count}} elements',
  'flowBuilder.changes.aria': 'Changes to processes',
  'flowBuilder.state.Draft': 'Draft',

  'flowBuilder.kept.title': 'Kept in this browser',
  'flowBuilder.kept.body':
    'Changes are saved in this browser and survive a reload. They are not shared with anyone and are not on a server. A change drafted by a sample person is a demonstration.',

  'flowBuilder.store.unreadableTitle': 'Saved changes could not be read',
  'flowBuilder.store.unreadableBody':
    'This browser holds saved changes that could not be read, so none is listed. This is not the same as having none. Drafting a change replaces what could not be read.',
  'flowBuilder.store.rejectedTitle': 'Some saved changes were not loaded',
  'flowBuilder.store.rejectedBody': 'Each row below was refused when it was read, and is still kept.',
  'flowBuilder.store.flaggedTitle': 'Some changes no longer obey the rules of their process',
  'flowBuilder.store.flaggedBody': 'They are kept and listed. Each is named here with the rule it breaks.',
  'flowBuilder.store.flaggedRow': 'Version {{label}} of {{process}} — {{code}}: {{element}}',

  'flowBuilder.create.title': 'New change',
  'flowBuilder.create.intro':
    'Choose the process and name the change. It is created as an empty draft against the process as it ships today; nothing runs differently.',
  'flowBuilder.create.process': 'Process',
  'flowBuilder.create.processHint': 'Only a process a command can write through, with an act a person takes on a screen.',
  'flowBuilder.create.titleField': 'Title',
  'flowBuilder.create.titleHint': 'What the change is for, in a few words.',
  'flowBuilder.create.persistence':
    'The draft is saved in this browser and survives a reload — local to this browser, not shared, not on a server.',
  'flowBuilder.create.submit': 'Create draft',
  'flowBuilder.create.ok': 'Version {{label}} of {{process}} created as a draft.',
  'flowBuilder.create.refused': 'Refused: {{reason}}',
  'flowBuilder.create.gateTitle': 'Changing a process is a Compliance action',
  'flowBuilder.create.gateBody':
    'A lane cannot be the one that changes the process it is held to, so drafting a change sits with Compliance.',

  'flowBuilder.refusal.FLOWVERSION_PROCESS_UNKNOWN': 'Refused: that is not a process this platform has.',
  'flowBuilder.refusal.FLOWVERSION_PROCESS_SELF':
    'Refused: a change cannot be drafted against the process by which processes are changed.',
  'flowBuilder.refusal.FLOWVERSION_PROCESS_NOT_WRITABLE':
    'Refused: no command can write through that process, so a step in front of one of its acts could never be met.',
  'flowBuilder.refusal.FLOWVERSION_TITLE_BLANK': 'Refused: a change needs a title, so it can be found again.',
  'flowBuilder.refusal.FLOWVERSION_CONTENT_MALFORMED':
    'Refused: what was saved is not a list of steps, forks and checks.',
  'flowBuilder.refusal.FLOWVERSION_CONTENT_MOVED':
    'Refused: a change stays about the process and the shipped version it was created against.',

  'flowBuilder.rules.title': 'Rules a change must obey',
  'flowBuilder.rules.body':
    'The platform checks every change against these before it can be proposed, again when it is approved and again when it is switched on. An error blocks the change. A warning blocks it until the person proposing it acknowledges it.',
  'flowBuilder.rules.aria': 'Rules a change must obey',
  'flowBuilder.rules.col.code': 'Rule',
  'flowBuilder.rules.col.severity': 'Kind',
  'flowBuilder.rules.col.text': 'Refuses or flags',
  'flowBuilder.rules.col.why': 'Why',
  'flowBuilder.severity.error': 'Error',
  'flowBuilder.severity.warning': 'Warning',
  'flowBuilder.severity.info': 'Information',

  'flowBuilder.rule.R01.text': 'The process has no command that can write through it.',
  'flowBuilder.rule.R01.why': 'Its acts cannot be taken, so a step could never be met.',
  'flowBuilder.rule.R02.text': 'The change was written against a version of the process that is no longer the shipped one.',
  'flowBuilder.rule.R02.why': 'It was composed against a process that no longer exists.',
  'flowBuilder.rule.R03.text': 'An element names an act the process does not have.',
  'flowBuilder.rule.R03.why': 'There is nothing for it to stand in front of.',
  'flowBuilder.rule.R04.text':
    'The act is fired by a system, by another act or by the creation of a document, or is not offered on a screen.',
  'flowBuilder.rule.R04.why': 'Automation cannot wait for a person, and a step there would stop an act without anyone being told.',
  'flowBuilder.rule.R05.text': 'The process has no screen that can show a step.',
  'flowBuilder.rule.R05.why': 'A step nobody can open would stop the process for good.',
  'flowBuilder.rule.R06.text':
    'The lane given a step is not one of the buyer-side lanes, or holds no permission of its own.',
  'flowBuilder.rule.R06.why': 'Nobody could complete the step.',
  'flowBuilder.rule.R07.text':
    'A label or an instruction is missing in English or in Indonesian, or names a person.',
  'flowBuilder.rule.R07.why': 'Both languages from the start, and roles only.',
  'flowBuilder.rule.R08.text': 'Two elements share an id, or two steps in front of one act share a place in the order.',
  'flowBuilder.rule.R08.why': 'An element must be named once, and steps are completed in one order.',
  'flowBuilder.rule.R12.text':
    'A rule that keeps two people apart names a step that is not earlier in front of the same act, or a step that does not exist.',
  'flowBuilder.rule.R12.why': 'The comparison would have nothing to read.',
  'flowBuilder.rule.R13.text':
    'A field a step asks for uses a name the platform keeps for the person acting, or two fields share a name.',
  'flowBuilder.rule.R13.why': 'Who acted comes from the seat, never from a form.',
  'flowBuilder.rule.R14.text':
    'More than one approval by the same lane stands in front of one act, with nothing to keep the approvers apart.',
  'flowBuilder.rule.R14.why': 'It is the same approval twice.',
  'flowBuilder.rule.R15.text': 'Every way out of a state now waits on an added step.',
  'flowBuilder.rule.R15.why': 'A document there can move only once the step is done. Say so on purpose.',
  'flowBuilder.rule.R16.text':
    'A step stands in front of an act that refuses, cancels or withdraws a document.',
  'flowBuilder.rule.R16.why': 'The safe direction should stay easy to reach.',
  'flowBuilder.rule.R17.text': 'The part of the platform the act belongs to is switched off.',
  'flowBuilder.rule.R17.why': 'The step cannot be met until it is switched on.',
  'flowBuilder.rule.R18.text': 'More than {{limit}} elements stand in front of one act.',
  'flowBuilder.rule.R18.why': 'The screen stops being readable.',
  'flowBuilder.rule.R19.text': 'How many documents rest, now, in a state the change affects.',
  'flowBuilder.rule.R19.why': 'The reviewer sees what the change will meet.',
};

export const flowBuilderId: Record<string, string> = {
  'flowBuilder.view.aria': 'Tampilan Alur Proses',
  'flowBuilder.view.catalogue': 'Katalog',
  'flowBuilder.view.changes': 'Perubahan',

  'flowBuilder.inForce.shipped': 'Bawaan · versi {{version}} — berlaku',

  'flowBuilder.changes.title': 'Perubahan pada proses',
  'flowBuilder.changes.body':
    'Sebuah perubahan menambahkan langkah, pemeriksaan, dan percabangan di depan tindakan yang sudah dimiliki sebuah proses. Perubahan dapat menambah penolakan dan tidak pernah dapat menghilangkannya. Tidak ada yang berlaku di sini: setiap proses berjalan seperti bawaannya.',
  'flowBuilder.changes.new': 'Perubahan baru',
  'flowBuilder.changes.empty': 'Belum ada perubahan yang dirancang.',
  'flowBuilder.changes.emptyHint': 'Perubahan dimulai sebagai rancangan terhadap satu proses.',
  'flowBuilder.changes.col.label': 'Versi',
  'flowBuilder.changes.col.process': 'Proses',
  'flowBuilder.changes.col.title': 'Judul',
  'flowBuilder.changes.col.state': 'Status',
  'flowBuilder.changes.col.createdBy': 'Dirancang oleh',
  'flowBuilder.changes.col.createdAt': 'Dirancang',
  'flowBuilder.changes.col.elements': 'Menambahkan',
  'flowBuilder.changes.elements_other': '{{count}} elemen',
  'flowBuilder.changes.aria': 'Perubahan pada proses',
  'flowBuilder.state.Draft': 'Rancangan',

  'flowBuilder.kept.title': 'Disimpan di peramban ini',
  'flowBuilder.kept.body':
    'Perubahan disimpan di peramban ini dan tetap ada setelah dimuat ulang. Perubahan tidak dibagikan kepada siapa pun dan tidak berada di server. Perubahan yang dirancang oleh orang contoh adalah peragaan.',

  'flowBuilder.store.unreadableTitle': 'Perubahan tersimpan tidak dapat dibaca',
  'flowBuilder.store.unreadableBody':
    'Peramban ini menyimpan perubahan yang tidak dapat dibaca, sehingga tidak ada yang ditampilkan. Ini tidak sama dengan tidak ada perubahan. Merancang perubahan akan menggantikan yang tidak dapat dibaca.',
  'flowBuilder.store.rejectedTitle': 'Sebagian perubahan tersimpan tidak dimuat',
  'flowBuilder.store.rejectedBody': 'Setiap baris di bawah ditolak saat dibaca, dan tetap disimpan.',
  'flowBuilder.store.flaggedTitle': 'Sebagian perubahan tidak lagi mematuhi aturan prosesnya',
  'flowBuilder.store.flaggedBody': 'Perubahan itu disimpan dan ditampilkan. Masing-masing disebut di sini beserta aturan yang dilanggarnya.',
  'flowBuilder.store.flaggedRow': 'Versi {{label}} dari {{process}} — {{code}}: {{element}}',

  'flowBuilder.create.title': 'Perubahan baru',
  'flowBuilder.create.intro':
    'Pilih proses dan beri nama perubahan. Perubahan dibuat sebagai rancangan kosong terhadap proses seperti bawaannya hari ini; tidak ada yang berjalan berbeda.',
  'flowBuilder.create.process': 'Proses',
  'flowBuilder.create.processHint': 'Hanya proses yang dapat ditulis oleh perintah, dengan tindakan yang dilakukan orang di layar.',
  'flowBuilder.create.titleField': 'Judul',
  'flowBuilder.create.titleHint': 'Untuk apa perubahan ini, dalam beberapa kata.',
  'flowBuilder.create.persistence':
    'Rancangan disimpan di peramban ini dan tetap ada setelah dimuat ulang — hanya di peramban ini, tidak dibagikan, tidak di server.',
  'flowBuilder.create.submit': 'Buat rancangan',
  'flowBuilder.create.ok': 'Versi {{label}} dari {{process}} dibuat sebagai rancangan.',
  'flowBuilder.create.refused': 'Ditolak: {{reason}}',
  'flowBuilder.create.gateTitle': 'Mengubah proses adalah tindakan Kepatuhan',
  'flowBuilder.create.gateBody':
    'Sebuah lajur tidak boleh menjadi pihak yang mengubah proses yang mengikatnya, sehingga merancang perubahan berada pada Kepatuhan.',

  'flowBuilder.refusal.FLOWVERSION_PROCESS_UNKNOWN': 'Ditolak: itu bukan proses yang dimiliki platform ini.',
  'flowBuilder.refusal.FLOWVERSION_PROCESS_SELF':
    'Ditolak: perubahan tidak dapat dirancang terhadap proses yang digunakan untuk mengubah proses.',
  'flowBuilder.refusal.FLOWVERSION_PROCESS_NOT_WRITABLE':
    'Ditolak: tidak ada perintah yang dapat menulis melalui proses itu, sehingga langkah di depan salah satu tindakannya tidak akan pernah dapat dipenuhi.',
  'flowBuilder.refusal.FLOWVERSION_TITLE_BLANK': 'Ditolak: perubahan memerlukan judul agar dapat ditemukan kembali.',
  'flowBuilder.refusal.FLOWVERSION_CONTENT_MALFORMED':
    'Ditolak: yang disimpan bukan daftar langkah, percabangan, dan pemeriksaan.',
  'flowBuilder.refusal.FLOWVERSION_CONTENT_MOVED':
    'Ditolak: perubahan tetap mengenai proses dan versi bawaan tempat perubahan itu dibuat.',

  'flowBuilder.rules.title': 'Aturan yang harus dipatuhi perubahan',
  'flowBuilder.rules.body':
    'Platform memeriksa setiap perubahan terhadap aturan ini sebelum dapat diusulkan, sekali lagi saat disetujui, dan sekali lagi saat diaktifkan. Kesalahan menghalangi perubahan. Peringatan menghalanginya sampai orang yang mengusulkan mengakuinya.',
  'flowBuilder.rules.aria': 'Aturan yang harus dipatuhi perubahan',
  'flowBuilder.rules.col.code': 'Aturan',
  'flowBuilder.rules.col.severity': 'Jenis',
  'flowBuilder.rules.col.text': 'Menolak atau menandai',
  'flowBuilder.rules.col.why': 'Alasan',
  'flowBuilder.severity.error': 'Kesalahan',
  'flowBuilder.severity.warning': 'Peringatan',
  'flowBuilder.severity.info': 'Informasi',

  'flowBuilder.rule.R01.text': 'Proses tidak memiliki perintah yang dapat menulis melaluinya.',
  'flowBuilder.rule.R01.why': 'Tindakannya tidak dapat dilakukan, sehingga langkah tidak akan pernah dapat dipenuhi.',
  'flowBuilder.rule.R02.text': 'Perubahan ditulis terhadap versi proses yang bukan lagi versi bawaan.',
  'flowBuilder.rule.R02.why': 'Perubahan disusun terhadap proses yang sudah tidak ada.',
  'flowBuilder.rule.R03.text': 'Sebuah elemen menyebut tindakan yang tidak dimiliki proses.',
  'flowBuilder.rule.R03.why': 'Tidak ada yang dapat didahuluinya.',
  'flowBuilder.rule.R04.text':
    'Tindakan dijalankan oleh sistem, oleh tindakan lain, atau oleh pembuatan dokumen, atau tidak ditawarkan di layar.',
  'flowBuilder.rule.R04.why': 'Otomasi tidak dapat menunggu orang, dan langkah di sana akan menghentikan tindakan tanpa ada yang diberi tahu.',
  'flowBuilder.rule.R05.text': 'Proses tidak memiliki layar yang dapat menampilkan langkah.',
  'flowBuilder.rule.R05.why': 'Langkah yang tidak dapat dibuka siapa pun akan menghentikan proses selamanya.',
  'flowBuilder.rule.R06.text':
    'Lajur yang diberi langkah bukan salah satu lajur sisi pembeli, atau tidak memegang izin miliknya sendiri.',
  'flowBuilder.rule.R06.why': 'Tidak ada yang dapat menyelesaikan langkah itu.',
  'flowBuilder.rule.R07.text':
    'Label atau instruksi tidak ada dalam bahasa Inggris atau bahasa Indonesia, atau menyebut nama orang.',
  'flowBuilder.rule.R07.why': 'Dua bahasa sejak awal, dan hanya peran.',
  'flowBuilder.rule.R08.text': 'Dua elemen memakai id yang sama, atau dua langkah di depan satu tindakan menempati urutan yang sama.',
  'flowBuilder.rule.R08.why': 'Sebuah elemen diberi nama satu kali, dan langkah diselesaikan dalam satu urutan.',
  'flowBuilder.rule.R12.text':
    'Aturan yang memisahkan dua orang menyebut langkah yang tidak lebih dahulu di depan tindakan yang sama, atau langkah yang tidak ada.',
  'flowBuilder.rule.R12.why': 'Perbandingannya tidak memiliki apa pun untuk dibaca.',
  'flowBuilder.rule.R13.text':
    'Isian yang diminta sebuah langkah memakai nama yang disimpan platform untuk orang yang bertindak, atau dua isian bernama sama.',
  'flowBuilder.rule.R13.why': 'Siapa yang bertindak berasal dari kursi, bukan dari formulir.',
  'flowBuilder.rule.R14.text':
    'Lebih dari satu persetujuan oleh lajur yang sama berada di depan satu tindakan, tanpa apa pun yang memisahkan para penyetuju.',
  'flowBuilder.rule.R14.why': 'Itu persetujuan yang sama dua kali.',
  'flowBuilder.rule.R15.text': 'Setiap jalan keluar dari sebuah status kini menunggu langkah tambahan.',
  'flowBuilder.rule.R15.why': 'Dokumen di sana hanya dapat bergerak setelah langkah selesai. Nyatakan itu dengan sengaja.',
  'flowBuilder.rule.R16.text':
    'Sebuah langkah berada di depan tindakan yang menolak, membatalkan, atau menarik dokumen.',
  'flowBuilder.rule.R16.why': 'Arah yang aman harus tetap mudah dicapai.',
  'flowBuilder.rule.R17.text': 'Bagian platform tempat tindakan itu berada sedang dinonaktifkan.',
  'flowBuilder.rule.R17.why': 'Langkah tidak dapat dipenuhi sampai bagian itu diaktifkan.',
  'flowBuilder.rule.R18.text': 'Lebih dari {{limit}} elemen berada di depan satu tindakan.',
  'flowBuilder.rule.R18.why': 'Layar tidak lagi dapat dibaca.',
  'flowBuilder.rule.R19.text': 'Berapa banyak dokumen yang saat ini berada pada status yang terpengaruh perubahan.',
  'flowBuilder.rule.R19.why': 'Peninjau melihat apa yang akan ditemui perubahan itu.',
};
