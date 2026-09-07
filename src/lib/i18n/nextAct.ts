// ─────────────────────────────────────────────────────────────────────────────
// NEXT-ACT ARM → i18n KEY. The third map on the `stepKind.ts` pattern (§52),
// and the shape is copied deliberately rather than re-invented.
//
// A `Record<Kind, string | null>` over the arms is exhaustive BY TYPE: add an
// arm to `NextAct` and `tsc` fails at THIS FILE until it is decided. The
// alternative — a ternary chain or a lookup with a fall-through — makes a new
// arm a SILENT MISLABEL on every surface in both locales, which is the exact
// trap `stepKind.ts` was written to remove and the exact trap the two-arm
// persona ternary fell into before `HandoffNotice`.
//
// ⚠️ **`null` IS A DECISION AND IS WHY THE VALUE TYPE IS NULLABLE.** Three arms
// render NOTHING, and they must be distinguishable from an arm somebody forgot:
//
//   · `ended`  — the document is done. Saying "nobody is acting" over a closed
//                document is the same defect as the silence this file exists to
//                remove, pointed forward instead of backward.
//   · `silent` — we cannot name it honestly (operator ruling). A dead end gets
//                no invented sentence; the census carries it.
//   · `theirs` — NOT null-because-nothing, but null HERE: it renders through
//                the handoff copy that already exists (`roles.handoff.awaiting`
//                × `ROLE_LABEL_KEY`), and duplicating it would be a second
//                vocabulary for a fact one map already states.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextAct } from '../../services/transitions/nextAct';

/**
 * ⚠️ **DO NOT WIDEN TO `Partial<Record<…>>` AND DO NOT ADD A DEFAULT.** Both
 * restore the silent fall-through this map exists to remove.
 */
export const NEXT_ACT_KEY: Record<NextAct['kind'], string | null> = {
  mine: 'nextAct.mine',
  external: 'nextAct.external',
  settling: 'nextAct.settling',
  computed: 'nextAct.computed',
  // Renders through the existing handoff copy — see the header.
  theirs: null,
  // Render nothing, deliberately — see the header.
  ended: null,
  silent: null,
};
