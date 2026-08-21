// ─────────────────────────────────────────────────────────────────────────────
// ROLE NAMES + THE CROSS-ROLE HANDOFF LINE. Namespace: roles.*
//
// ⚠️ **ONE KEY PER ROLE, NEVER ONE PER STATE.** This is the whole reason the
// handoff is derived rather than authored (`services/transitions/handoff.ts`):
// `requiredRole` is per-verb and per-state, so the machine already knows whose
// act is next. What it cannot know is what to CALL that role in Indonesian.
// Authoring a line per state — "Awaiting finance" pinned beside `Approved` —
// would be a second vocabulary that keeps saying "finance" the day the atom
// moves to another bundle.
//
// `ROLE_LABEL_KEY` is a TOTAL `Record<SystemRoleId, string>`, so a seventh
// system role is a `tsc` error there and a missing key here is caught by
// `fragments.test.ts` — not a blank chip on a governed surface.
// ─────────────────────────────────────────────────────────────────────────────

export const rolesEn: Record<string, string> = {
  // — The six system roles, plus the supplier seat —
  'roles.owner.procurement': 'Procurement',
  'roles.owner.receiving': 'Receiving',
  'roles.owner.finance': 'Finance',
  'roles.owner.compliance': 'Compliance',
  'roles.owner.planning': 'Planning',
  'roles.owner.requisitioner': 'Requisitioner',
  // ⚠️ A CAPITALISED NOUN, LIKE EVERY OTHER ROLE. It read 'the supplier' —
  // shaped for the sentence "Awaiting the supplier" — and the catalogue then
  // headed a card with it. ONE KEY DOING TWO JOBS: a role NAME and a fragment
  // of a sentence. Caught on the built bundle, not by the suite, because a
  // lowercase heading is valid text. Naming it as a noun serves both.
  'roles.owner.supplier': 'Supplier',
  'roles.owner.admin': 'Super Admin',

  // — THE HANDOFF LINE. "Awaiting Finance", never a missing button. —
  //   The operator's binding constraint, in one string: a verb this seat does
  //   not hold renders as PENDING WITH AN OWNER, so a procurement user reads
  //   that payment is somebody's next act rather than that nothing happens.
  'roles.handoff.awaiting': 'Awaiting {{owner}}',
  'roles.handoff.awaitingHint': 'Your role cannot take this action.',
  // An act NOBODY assignable holds. Deliberately different copy: "Awaiting
  // <nobody>" would be worse than silence, and this is a FINDING, not a wait.
  'roles.handoff.unowned': 'No role holds this action',

  // ── THE IDENTITY PANEL (avatar) ────────────────────────────────────────────
  'identity.panel.title': 'Your identity and access',
  'identity.panel.signedInAs': 'Signed in as',
  'identity.panel.scope': 'Access scope',
  'identity.scope.allSuppliers': 'All suppliers (buyer-side)',
  'identity.scope.oneSupplier': '{{name}} only',
  // The honest handoff, one layer up from the verb-level one. A scope change is
  // somebody else's act, and saying so beats a control that silently does nothing.
  'identity.panel.scopeHandoff': 'Contact your administrator to change your access scope.',
  'identity.panel.roles': 'Roles',
  'identity.panel.rolesSummary': '{{roles}} role(s) · {{permissions}} permissions',
  // D-CENSUS-8 — what is real, what is not, precisely.
  'identity.panel.demoMarker':
    'Demonstration seat. The roles and permissions shown are real — the portal enforces them on every governed action. Switching roles here is a demo control and is saved only in this browser; there is no user directory yet, so no act can name the person who took it.',

  // ── THE ROLES CATALOGUE PAGE ───────────────────────────────────────────────
  'roles.page.title': 'Roles',
  'roles.page.subtitle': 'The permission bundles this portal enforces',
  'roles.page.systemBadge': 'System role',
  'roles.page.customBadge': 'Custom role',
  'roles.page.permissionsHeader': 'Permissions',
  'roles.page.modulesHeader': 'Modules it touches',
  // — THE LIST (TMS format: code · name · description · kind · view) —
  'roles.page.col.code': 'Role code',
  'roles.page.col.name': 'Display name',
  'roles.page.col.description': 'Description',
  'roles.page.col.kind': 'Kind',
  'roles.page.col.scope': 'Reach',
  'roles.page.col.actions': 'Actions',
  'roles.page.view': 'View',
  'roles.page.back': 'Back to roles',
  // i18next selects on `count`; `modules`/`permissions` stay as explicit
  // interpolations so BOTH numbers still render on either arm. "1 modules" was
  // visible on two rows the moment `admin` made the list worth reading closely.
  'roles.page.reach_one': '{{modules}} module · {{permissions}} permissions',
  'roles.page.reach_other': '{{modules}} modules · {{permissions}} permissions',
  // KPI tiles — ONLY the ones we can derive. TMS shows USERS ASSIGNED, LAST
  // MODIFIED and STATUS; we hold no people, no modification record and no
  // activation state, so those columns would be invented rather than empty.
  // ⚠️ IT READ 'System roles' UNTIL A CUSTOM ROLE COULD EXIST. The tile
  // counts `views.length`, and the derivation now yields system AND custom roles
  // — so the label restated a property of the population that the derivation
  // never guaranteed. `FLOOR-IN-PROSE-01` wearing a noun instead of a number. The
  // KIND is on every row and in the split beneath; the tile counts roles.
  'roles.page.kpi.roles': 'Roles',
  // ⚠️ THE SPLIT, DERIVED AND ON SCREEN. "Six" was `PERSONA_SYSTEM_ROLES.buyer`
  // stated as the population. Showing both figures beside the total is what
  // stops the subset being mistaken for the whole a second time.
  'roles.page.kpi.rolesSplit': '{{buyer}} buyer · {{supplier}} supplier · {{both}} cross-tenancy',
  'roles.page.kpi.permissions': 'Distinct permissions',
  'roles.page.kpi.actions': 'Governed actions',
  'roles.page.search': 'Search roles by name or code…',
  'roles.page.noMatch': 'No role matches that search.',
  // — Descriptions. Prose, authored: the permissions stay derived, and a list
  //   with no description is a list nobody can scan. —
  'roles.desc.procurement': 'Sourcing, awards, orders and contracts. Runs RFQs end to end and approves requisitions.',
  'roles.desc.receiving': 'The dock. Receives goods, runs inspection and disposition, and posts the receipt to SAP.',
  'roles.desc.finance': 'Accounts payable. Releases payment, disputes an invoice and resolves the dispute.',
  'roles.desc.compliance': 'Supplier documents and governed-check enforcement. Verification is a pipeline, not a screen.',
  'roles.desc.planning': 'Demand and supply planning. Reviews supplier responses and records stock declarations.',
  'roles.desc.requisitioner': 'Raises and revises purchase requisitions. Deliberately cannot approve one.',
  'roles.desc.supplier': 'The supplier seat. Confirms orders, ships, invoices, quotes and uploads compliance documents.',
  // ⚠️ THE EXCLUSION IS STATED IN THE ROLE'S OWN DESCRIPTION (operator ruling).
  // A super admin bounded by what a human can legitimately do is a role; one
  // bounded by nothing is the wildcard with a name.
  'roles.desc.admin':
    'Every permission a person can hold, on both sides — the union of every other role. It cannot fire the platform’s own acts: goods movements from S/4HANA, carrier and TMS updates and the match cascade have no human owner, and a super admin should not be able to override that invisibly either.',

  'roles.page.verbsHeader': 'Actions it can take',
  'roles.page.holdsNone': 'Holds no action a person can take on a screen today.',
  'roles.page.countSummary': '{{permissions}} permissions · {{verbs}} actions · {{surfaced}} on a screen',
  'roles.page.side.buyer': 'Buyer side',
  'roles.page.side.supplier': 'Supplier side',
  'roles.page.unwiredNote': 'authored, not yet wired to a screen',
  // ⚠️ THE HONEST MARKER. Read-only is a RULING, not an omission, and the page
  // must say why rather than leave a missing Create button to be read as a bug.
  // ⚠️ **THE KEY NAMES ARE HISTORICAL AND THE COPY IS NOT.** This page is no
  // longer read-only. The old text said *nothing in the platform stores one, so a
  // Create button would build a role that vanished on reload* — and the ruling
  // was that whatever ships must make that statement FALSE rather than merely
  // remove it. Something stores one now, it is recorded through the dispatcher,
  // and the reload half is STILL TRUE — so it is still said, in the same breath
  // as the reason it is deliberate.
  'roles.page.readOnlyTitle': 'The role catalogue',
  'roles.page.readOnlyBody':
    'All {{count}} roles here are real: they are read from the same definitions the dispatcher checks on every governed action, so this page cannot drift from what the portal enforces. A custom role copies one system role and adds to it — it can never subtract, so it cannot silently drop a permission the system role was relied on to carry. Every grant is recorded through the same dispatcher as any other governed action and lands in the audit trail. A custom role is saved in this browser and survives a reload; the system roles are not saved anywhere, because they are compiled in. Saved means saved HERE: local to this browser, not shared with anyone, not stored on a server, and gone if you clear site data. Backend storage ships with the real user directory — which is also why no act here can yet name the person who took it.',

  // ── DUPLICATE-AND-NARROW ─ THE FIRST ROLE-GATED SURFACE IN THIS PLATFORM ──
  //
  // ⚠️ **`createGateTitle` / the HandoffNotice beside it are the gate.** No page
  // in this portal has ever gated on role — not one `<Route>` carries a guard,
  // and the only role-conditional rendering in the tree before this batch was the
  // invoice footer. The shape was taken deliberately: the AFFORDANCE is gated,
  // never the route, because the standing ruling is that a withheld verb renders
  // THE WAIT, NOT A GAP. A route guard would have rendered a gap — and it would
  // have hidden the catalogue, which §65 ruled must stay readable by anyone.
  'roles.page.createTitle': 'Create a custom role',
  'roles.page.createIntro':
    'A custom role copies one system role and adds permissions to it. It can never remove one, and it can never reach across to the other side — a buyer role cannot be given supplier permissions, or the reverse.',
  'roles.page.createGateTitle': 'Editing roles is a compliance action',
  'roles.page.createGateBody':
    'Whoever can edit roles can grant themselves any action, so procurement cannot hold this — it would let the same party lower the bar it is measured against. Your seat can read every role on this page; creating one is somebody else’s act.',
  // ⚠️ **THE DEMO FENCE, AND IT IS A SEPARATE KEY BECAUSE IT IS THE PART THAT
  // DIES AT F1.** A reader who cannot see the create affordance must be able to
  // learn from the SURFACE why, and what would change it — the same standard the
  // page already set for "not yet buildable, and why". Saying *"you can take
  // this role yourself"* is only true because role switching is a DEMO control,
  // so the sentence names that in the same breath rather than describing a
  // self-service privilege grant as though it were the design.
  'roles.page.createGateDemo':
    'Demonstration seat: switching roles here is a demo control, so you can take this role yourself — open your avatar and select Compliance. Once a real user directory is connected an administrator assigns roles, the switcher goes away, and this line with it.',
  'roles.page.createParent': 'Copy from',
  'roles.page.createId': 'Role code',
  'roles.page.createIdHint': 'Lowercase letters, digits and hyphens.',
  'roles.page.createName': 'Display name',
  'roles.page.createDescription': 'Description',
  'roles.page.createAdds': 'Permissions to add',
  'roles.page.createAddsHint':
    'Only permissions on the same side as the role you are copying are offered. The rest are already held by it.',
  'roles.page.createAddsNone': 'This role already holds every permission on its side.',
  'roles.page.createSubmit': 'Create role',
  // ⚠️ **BEFORE THE ACT, AND AS PRECISE AS THE PAGE HEADER.** A user who
  // creates a role and reloads must have been told BEFORE they created it, not
  // discover it after they lost it. The earlier wording said only "does not
  // survive a reload"; the header's precision — held in memory, never written to
  // disk — belongs at the point of creation too, because that is where somebody
  // decides whether the act is worth taking.
  'roles.page.createGrantedBy':
    'This grant is saved in this browser and will survive a reload — local to this browser only, not shared with anyone, not stored on a server. It is recorded as taken by nobody the platform can name, because there is no user directory yet.',
  'roles.page.createOk': 'Role {{id}} created. It is enforced now and gone on reload.',
  // The dispatcher’s own words. A refusal that only says “failed” is half a
  // remedy — the reason names the atom, the side, or the field.
  'roles.page.createRefused': 'Refused: {{reason}}',

  // ── THE STORE'S OWN HONESTY ─────────────────────────────────────
  // ⚠️ **"NO CUSTOM ROLES" AND "THE STORE COULD NOT BE READ" ARE DIFFERENT
  // FACTS.** `EMPTY-INPUT-REPORTS-CLEAN-01` is a storage read's exact shape: a
  // parse failure that returns an empty list looks identical to an empty store,
  // and the empty list is the reading that gets believed. Both are stated.
  'roles.page.storeUnreadableTitle': 'Saved roles could not be read',
  'roles.page.storeUnreadableBody':
    'This browser is holding saved role data that could not be parsed, so no custom roles were loaded. That is not the same as having none, which is why it is said here rather than shown as an empty list. Creating a role will overwrite the unreadable data.',
  'roles.page.storeRejectedTitle': 'Some saved roles were not loaded',
  'roles.page.storeRejectedBody':
    'Saved role data is re-checked when it is read, by the same rules that check a role when it is created — so editing the saved data by hand is not a way around them. These were refused, with the reason:',
  'roles.page.usersDeferredTitle': 'No user list yet',
  'roles.page.usersDeferredBody':
    'The portal holds no people. Staff identity comes from the corporate directory and has not been connected, so no role can show who is assigned to it — and every count would read zero.',
};

export const rolesId: Record<string, string> = {
  'roles.owner.procurement': 'Pengadaan',
  'roles.owner.receiving': 'Penerimaan',
  'roles.owner.finance': 'Keuangan',
  'roles.owner.compliance': 'Kepatuhan',
  'roles.owner.planning': 'Perencanaan',
  'roles.owner.requisitioner': 'Pemohon',
  'roles.owner.supplier': 'Pemasok',
  'roles.owner.admin': 'Super Admin',

  'roles.handoff.awaiting': 'Menunggu {{owner}}',
  'roles.handoff.awaitingHint': 'Peran Anda tidak dapat melakukan tindakan ini.',
  'roles.handoff.unowned': 'Tidak ada peran yang memegang tindakan ini',

  // ── PANEL IDENTITAS (avatar) ───────────────────────────────────────────────
  'identity.panel.title': 'Identitas dan akses Anda',
  'identity.panel.signedInAs': 'Masuk sebagai',
  'identity.panel.scope': 'Cakupan akses',
  'identity.scope.allSuppliers': 'Semua pemasok (sisi pembeli)',
  'identity.scope.oneSupplier': 'Hanya {{name}}',
  'identity.panel.scopeHandoff': 'Hubungi administrator Anda untuk mengubah cakupan akses.',
  'identity.panel.roles': 'Peran',
  'identity.panel.rolesSummary': '{{roles}} peran · {{permissions}} izin',
  'identity.panel.demoMarker':
    'Kursi demonstrasi. Peran dan izin yang ditampilkan nyata — portal menegakkannya pada setiap tindakan yang diatur. Mengganti peran di sini adalah kontrol demo dan hanya disimpan di peramban ini; belum ada direktori pengguna, sehingga tidak ada tindakan yang dapat menyebut orang yang melakukannya.',

  // ── HALAMAN KATALOG PERAN ──────────────────────────────────────────────────
  'roles.page.title': 'Peran',
  'roles.page.subtitle': 'Kumpulan izin yang ditegakkan portal ini',
  'roles.page.systemBadge': 'Peran sistem',
  'roles.page.customBadge': 'Peran khusus',
  'roles.page.permissionsHeader': 'Izin',
  'roles.page.modulesHeader': 'Modul yang disentuh',
  'roles.page.col.code': 'Kode peran',
  'roles.page.col.name': 'Nama tampilan',
  'roles.page.col.description': 'Deskripsi',
  'roles.page.col.kind': 'Jenis',
  'roles.page.col.scope': 'Jangkauan',
  'roles.page.col.actions': 'Tindakan',
  'roles.page.view': 'Lihat',
  'roles.page.back': 'Kembali ke peran',
  // Indonesian does not inflect for number — one arm serves every count.
  'roles.page.reach_other': '{{modules}} modul · {{permissions}} izin',
  'roles.page.kpi.roles': 'Peran',
  'roles.page.kpi.rolesSplit': '{{buyer}} pembeli · {{supplier}} pemasok · {{both}} lintas-tenansi',
  'roles.page.kpi.permissions': 'Izin berbeda',
  'roles.page.kpi.actions': 'Tindakan yang diatur',
  'roles.page.search': 'Cari peran berdasarkan nama atau kode…',
  'roles.page.noMatch': 'Tidak ada peran yang cocok dengan pencarian itu.',
  'roles.desc.procurement': 'Pengadaan, pemenangan, pesanan dan kontrak. Menjalankan RFQ dari awal hingga akhir dan menyetujui permintaan pembelian.',
  'roles.desc.receiving': 'Dermaga. Menerima barang, menjalankan inspeksi dan disposisi, serta memposting penerimaan ke SAP.',
  'roles.desc.finance': 'Utang usaha. Merilis pembayaran, menyengketakan faktur dan menyelesaikan sengketa.',
  'roles.desc.compliance': 'Dokumen pemasok dan penegakan pemeriksaan yang diatur. Verifikasi adalah alur, bukan layar.',
  'roles.desc.planning': 'Perencanaan permintaan dan pasokan. Meninjau respons pemasok dan mencatat deklarasi stok.',
  'roles.desc.requisitioner': 'Mengajukan dan merevisi permintaan pembelian. Sengaja tidak dapat menyetujuinya.',
  'roles.desc.supplier': 'Kursi pemasok. Mengonfirmasi pesanan, mengirim, menagih, menawar dan mengunggah dokumen kepatuhan.',
  'roles.desc.admin':
    'Setiap izin yang dapat dipegang seseorang, di kedua sisi — gabungan dari semua peran lain. Tidak dapat menjalankan tindakan platform itu sendiri: pergerakan barang dari S/4HANA, pembaruan pengangkut dan TMS, serta kaskade pencocokan tidak memiliki pemilik manusia, dan super admin pun tidak boleh menimpanya secara tidak terlihat.',

  'roles.page.verbsHeader': 'Tindakan yang dapat dilakukan',
  'roles.page.holdsNone': 'Belum memegang tindakan yang dapat dilakukan seseorang di layar.',
  'roles.page.countSummary': '{{permissions}} izin · {{verbs}} tindakan · {{surfaced}} di layar',
  'roles.page.side.buyer': 'Sisi pembeli',
  'roles.page.side.supplier': 'Sisi pemasok',
  'roles.page.unwiredNote': 'sudah ditulis, belum terhubung ke layar',
  'roles.page.readOnlyTitle': 'Katalog peran',
  'roles.page.readOnlyBody':
    'Semua {{count}} peran di sini nyata: dibaca dari definisi yang sama yang diperiksa dispatcher pada setiap tindakan yang diatur, sehingga halaman ini tidak dapat menyimpang dari yang ditegakkan portal. Peran khusus menyalin satu peran sistem lalu menambahkan padanya — tidak pernah mengurangi, sehingga tidak dapat diam-diam menghapus izin yang diandalkan dari peran sistem itu. Setiap pemberian dicatat melalui dispatcher yang sama seperti tindakan diatur lainnya dan masuk ke jejak audit. Peran khusus disimpan di peramban ini dan bertahan setelah dimuat ulang; peran sistem tidak disimpan di mana pun karena sudah terkompilasi. Disimpan berarti disimpan DI SINI: lokal untuk peramban ini, tidak dibagikan kepada siapa pun, tidak disimpan di server, dan hilang jika Anda menghapus data situs. Penyimpanan backend hadir bersama direktori pengguna sungguhan — yang juga alasan belum ada tindakan di sini yang dapat menyebut nama pelakunya.',

  'roles.page.createTitle': 'Buat peran khusus',
  'roles.page.createIntro':
    'Peran khusus menyalin satu peran sistem dan menambahkan izin padanya. Tidak pernah menghapus izin, dan tidak pernah menjangkau sisi lain — peran pembeli tidak dapat diberi izin pemasok, atau sebaliknya.',
  'roles.page.createGateTitle': 'Mengubah peran adalah tindakan kepatuhan',
  'roles.page.createGateBody':
    'Siapa pun yang dapat mengubah peran dapat memberikan dirinya tindakan apa pun, sehingga pengadaan tidak memegang ini — itu akan membuat pihak yang sama menurunkan standar yang mengukurnya. Kursi Anda dapat membaca setiap peran di halaman ini; membuatnya adalah tindakan orang lain.',
  'roles.page.createGateDemo':
    'Kursi demonstrasi: mengganti peran di sini adalah kontrol demo, sehingga Anda dapat mengambil peran ini sendiri — buka avatar Anda dan pilih Kepatuhan. Setelah direktori pengguna nyata terhubung, administrator yang menetapkan peran, pengganti peran ini hilang, dan baris ini bersamanya.',
  'roles.page.createParent': 'Salin dari',
  'roles.page.createId': 'Kode peran',
  'roles.page.createIdHint': 'Huruf kecil, angka, dan tanda hubung.',
  'roles.page.createName': 'Nama tampilan',
  'roles.page.createDescription': 'Deskripsi',
  'roles.page.createAdds': 'Izin yang ditambahkan',
  'roles.page.createAddsHint':
    'Hanya izin di sisi yang sama dengan peran yang Anda salin yang ditawarkan. Sisanya sudah dipegang olehnya.',
  'roles.page.createAddsNone': 'Peran ini sudah memegang setiap izin di sisinya.',
  'roles.page.createSubmit': 'Buat peran',
  'roles.page.createGrantedBy':
    'Pemberian ini disimpan di peramban ini dan akan bertahan setelah dimuat ulang — lokal untuk peramban ini saja, tidak dibagikan kepada siapa pun, tidak disimpan di server. Pemberian dicatat sebagai dilakukan oleh orang yang tidak dapat disebut namanya oleh platform, karena belum ada direktori pengguna.',
  'roles.page.createOk': 'Peran {{id}} dibuat. Berlaku sekarang dan hilang saat dimuat ulang.',
  'roles.page.createRefused': 'Ditolak: {{reason}}',

  'roles.page.storeUnreadableTitle': 'Peran tersimpan tidak dapat dibaca',
  'roles.page.storeUnreadableBody':
    'Peramban ini menyimpan data peran yang tidak dapat diurai, sehingga tidak ada peran khusus yang dimuat. Itu tidak sama dengan tidak memiliki satu pun, dan karena itu dinyatakan di sini alih-alih ditampilkan sebagai daftar kosong. Membuat peran akan menimpa data yang tidak terbaca itu.',
  'roles.page.storeRejectedTitle': 'Sebagian peran tersimpan tidak dimuat',
  'roles.page.storeRejectedBody':
    'Data peran tersimpan diperiksa ulang saat dibaca, dengan aturan yang sama yang memeriksa peran saat dibuat — sehingga menyunting data tersimpan secara manual bukan jalan pintas. Berikut yang ditolak, beserta alasannya:',
  'roles.page.usersDeferredTitle': 'Belum ada daftar pengguna',
  'roles.page.usersDeferredBody':
    'Portal tidak menyimpan orang. Identitas staf berasal dari direktori korporat dan belum terhubung, sehingga tidak ada peran yang dapat menunjukkan siapa yang ditugaskan — dan setiap hitungan akan menampilkan nol.',
};
