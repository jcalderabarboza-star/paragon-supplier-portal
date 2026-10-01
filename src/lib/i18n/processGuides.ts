// G1 · Process guides on `/buyer/process-flows` (Design 5 §B.2). Namespace:
// processGuides.*
//
// ⚠️ PAGE CHROME ONLY — tab names, pane labels, the honest markers and the
// status-history table. The guides' own prose is NOT here: it is authored in
// `docs/guides/<entity>.<locale>.md` and parsed at build (D6), so a correction
// to a guide is a prose edit, never a code change.
//
// EN+ID from birth (MARKER-I18N-HOLE-01).
export const processGuidesEn: Record<string, string> = {
  'processGuides.tablist': 'Process guide sections',
  'processGuides.tab.overview': 'Overview',
  'processGuides.tab.lifecycle': 'Lifecycle walk',
  'processGuides.tab.steps': 'Step by step',
  'processGuides.tab.forks': 'Forks & exceptions',
  'processGuides.tab.flags': 'Exception flags',
  'processGuides.tab.linked': 'Linked objects',
  'processGuides.tab.history': 'Status history',
  'processGuides.tab.troubleshooting': 'Troubleshooting',
  'processGuides.tab.testdata': 'Test data',

  'processGuides.title': 'Process guide',
  'processGuides.authored':
    'Authored guide: written by the team, held to the registry by tests (every transition, fixture, route and source commit is checked) · source commit {{sha}}',
  'processGuides.citation': 'Cite as',
  'processGuides.pending':
    'The guide for this process has not landed yet. The catalogue on this page is complete; the authored explanation follows in a later batch.',
  'processGuides.catalog.guide': 'Guide',
  'processGuides.catalog.pending': 'Guide pending',

  'processGuides.lifecycle.walkNote':
    'The interactive walk sits under the diagram above. This is the guide’s account of the same lifecycle, step by step.',
  'processGuides.lifecycle.kinds': 'Each step, by what moves it',

  'processGuides.stepKind.operator-action': 'Operator action',
  'processGuides.stepKind.system-driven': 'System-driven',
  'processGuides.stepKind.cascade': 'Cascade',
  'processGuides.stepKind.external-fact': 'External fact',
  'processGuides.stepKind.records-fact': 'Records a fact',
  'processGuides.stepKind.not-active': 'Not active (no caller)',
  'processGuides.stepKind.modelled-not-active': 'Modelled, not active',

  'processGuides.step.role': 'Role',
  'processGuides.step.fromTo': 'From → to',
  'processGuides.step.operator': 'Operator',
  'processGuides.step.tester': 'Tester',
  'processGuides.step.where': 'Where',
  'processGuides.step.do': 'Do',
  'processGuides.step.fill': 'Fill',
  'processGuides.step.expected': 'Expected state',
  'processGuides.step.confirm': 'Confirm',
  'processGuides.step.trigger': 'Trigger event',
  'processGuides.step.checks': 'Checks that can refuse',
  'processGuides.step.glossary': 'Glossary',
  'processGuides.step.honesty': 'Honesty',
  'processGuides.step.yourSeat': 'Your seat',

  'processGuides.flags.derivedTitle': 'Derived from the registry',
  'processGuides.flags.derivedNone':
    'No transition of this machine records a fact, crosses the SAP boundary, fans out or is fired by another.',
  'processGuides.flags.guideTitle': 'From the guide',

  'processGuides.linked.openList': 'Open the list where these documents live',

  'processGuides.history.sinkNote':
    'Read from the demo’s in-memory audit sink: it holds what this browser session dispatched, and empties on reload.',
  'processGuides.history.pick': 'Document',
  'processGuides.history.refresh': 'Refresh',
  'processGuides.history.seeded': 'No events yet — this document was seeded before the audit began.',
  'processGuides.history.noDocuments': 'No document of this process is listed in its guide or in the audit sink yet.',
  'processGuides.history.worked': 'The guide’s worked sequence',
  'processGuides.history.group': 'Act {{anchor}}',
  'processGuides.history.col.time': 'Time',
  'processGuides.history.col.edge': 'From → to',
  'processGuides.history.col.actor': 'Actor',
  'processGuides.history.col.trigger': 'Trigger',
  'processGuides.history.col.event': 'Event',
  'processGuides.history.col.outcome': 'Outcome',
  'processGuides.history.machine': 'machine act',
  'processGuides.history.unattributed': 'no person in session',
  'processGuides.history.elsewhere': 'on {{entity}} {{id}}',
  'processGuides.history.creation': 'new',

  'processGuides.testdata.col.state': 'State',
  'processGuides.testdata.col.fixtures': 'Fixture ids',
  'processGuides.testdata.col.number': 'Number',
  'processGuides.testdata.col.note': 'Note',
  'processGuides.testdata.none': 'No fixture — modelled, not active.',
  'processGuides.testdata.openAria': 'Open {{id}} in its list',
};

export const processGuidesId: Record<string, string> = {
  'processGuides.tablist': 'Bagian panduan proses',
  'processGuides.tab.overview': 'Ikhtisar',
  'processGuides.tab.lifecycle': 'Perjalanan siklus hidup',
  'processGuides.tab.steps': 'Langkah demi langkah',
  'processGuides.tab.forks': 'Percabangan & pengecualian',
  'processGuides.tab.flags': 'Bendera pengecualian',
  'processGuides.tab.linked': 'Objek terkait',
  'processGuides.tab.history': 'Riwayat status',
  'processGuides.tab.troubleshooting': 'Pemecahan masalah',
  'processGuides.tab.testdata': 'Data uji',

  'processGuides.title': 'Panduan proses',
  'processGuides.authored':
    'Panduan yang ditulis: disusun oleh tim, dijaga terhadap registri oleh pengujian (setiap transisi, fixture, rute, dan commit sumber diperiksa) · commit sumber {{sha}}',
  'processGuides.citation': 'Kutip sebagai',
  'processGuides.pending':
    'Panduan untuk proses ini belum tersedia. Katalog di halaman ini lengkap; penjelasan tertulisnya menyusul pada batch berikutnya.',
  'processGuides.catalog.guide': 'Panduan',
  'processGuides.catalog.pending': 'Panduan menyusul',

  'processGuides.lifecycle.walkNote':
    'Penelusuran interaktif ada di bawah diagram di atas. Ini adalah uraian panduan tentang siklus hidup yang sama, langkah demi langkah.',
  'processGuides.lifecycle.kinds': 'Setiap langkah, menurut apa yang menggerakkannya',

  'processGuides.stepKind.operator-action': 'Tindakan operator',
  'processGuides.stepKind.system-driven': 'Digerakkan sistem',
  'processGuides.stepKind.cascade': 'Kaskade',
  'processGuides.stepKind.external-fact': 'Fakta eksternal',
  'processGuides.stepKind.records-fact': 'Mencatat fakta',
  'processGuides.stepKind.not-active': 'Tidak aktif (tanpa pemanggil)',
  'processGuides.stepKind.modelled-not-active': 'Dimodelkan, tidak aktif',

  'processGuides.step.role': 'Peran',
  'processGuides.step.fromTo': 'Dari → ke',
  'processGuides.step.operator': 'Operator',
  'processGuides.step.tester': 'Penguji',
  'processGuides.step.where': 'Di mana',
  'processGuides.step.do': 'Lakukan',
  'processGuides.step.fill': 'Isi',
  'processGuides.step.expected': 'Status yang diharapkan',
  'processGuides.step.confirm': 'Konfirmasi',
  'processGuides.step.trigger': 'Peristiwa pemicu',
  'processGuides.step.checks': 'Pemeriksaan yang dapat menolak',
  'processGuides.step.glossary': 'Glosarium',
  'processGuides.step.honesty': 'Kejujuran',
  'processGuides.step.yourSeat': 'Kursi Anda',

  'processGuides.flags.derivedTitle': 'Diturunkan dari registri',
  'processGuides.flags.derivedNone':
    'Tidak ada transisi mesin ini yang mencatat fakta, melintasi batas SAP, menyebar ke entitas lain, atau dipicu oleh transisi lain.',
  'processGuides.flags.guideTitle': 'Dari panduan',

  'processGuides.linked.openList': 'Buka daftar tempat dokumen ini berada',

  'processGuides.history.sinkNote':
    'Dibaca dari audit sink dalam memori milik demo: berisi apa yang dikirim sesi peramban ini, dan kosong kembali saat dimuat ulang.',
  'processGuides.history.pick': 'Dokumen',
  'processGuides.history.refresh': 'Muat ulang',
  'processGuides.history.seeded': 'Belum ada peristiwa — dokumen ini dibuat dari data awal sebelum audit dimulai.',
  'processGuides.history.noDocuments': 'Belum ada dokumen proses ini yang tercantum di panduannya atau di audit sink.',
  'processGuides.history.worked': 'Urutan contoh dari panduan',
  'processGuides.history.group': 'Tindakan {{anchor}}',
  'processGuides.history.col.time': 'Waktu',
  'processGuides.history.col.edge': 'Dari → ke',
  'processGuides.history.col.actor': 'Pelaku',
  'processGuides.history.col.trigger': 'Pemicu',
  'processGuides.history.col.event': 'Peristiwa',
  'processGuides.history.col.outcome': 'Hasil',
  'processGuides.history.machine': 'tindakan mesin',
  'processGuides.history.unattributed': 'tidak ada orang dalam sesi',
  'processGuides.history.elsewhere': 'pada {{entity}} {{id}}',
  'processGuides.history.creation': 'baru',

  'processGuides.testdata.col.state': 'Status',
  'processGuides.testdata.col.fixtures': 'Id fixture',
  'processGuides.testdata.col.number': 'Nomor',
  'processGuides.testdata.col.note': 'Catatan',
  'processGuides.testdata.none': 'Tanpa fixture — dimodelkan, tidak aktif.',
  'processGuides.testdata.openAria': 'Buka {{id}} di daftarnya',
};
