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
  'roles.owner.supplier': 'the supplier',

  // — THE HANDOFF LINE. "Awaiting Finance", never a missing button. —
  //   The operator's binding constraint, in one string: a verb this seat does
  //   not hold renders as PENDING WITH AN OWNER, so a procurement user reads
  //   that payment is somebody's next act rather than that nothing happens.
  'roles.handoff.awaiting': 'Awaiting {{owner}}',
  'roles.handoff.awaitingHint': 'Your role cannot take this action.',
  // An act NOBODY assignable holds. Deliberately different copy: "Awaiting
  // <nobody>" would be worse than silence, and this is a FINDING, not a wait.
  'roles.handoff.unowned': 'No role holds this action',
};

export const rolesId: Record<string, string> = {
  'roles.owner.procurement': 'Pengadaan',
  'roles.owner.receiving': 'Penerimaan',
  'roles.owner.finance': 'Keuangan',
  'roles.owner.compliance': 'Kepatuhan',
  'roles.owner.planning': 'Perencanaan',
  'roles.owner.requisitioner': 'Pemohon',
  'roles.owner.supplier': 'pemasok',

  'roles.handoff.awaiting': 'Menunggu {{owner}}',
  'roles.handoff.awaitingHint': 'Peran Anda tidak dapat melakukan tindakan ini.',
  'roles.handoff.unowned': 'Tidak ada peran yang memegang tindakan ini',
};
