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
//   · `settling` — ⚠️ **THE SAME REASON AS `theirs`, DISCOVERED AT S2a WHEN THE
//                ARM FIRST REACHED A SCREEN.** S1 gave this arm copy and shipped
//                it on two PO surfaces where `purchaseOrder` has no SAP-boundary
//                state, so it never rendered — it was proved by spec and by the
//                M3 mutant, exactly as the operator recorded. S2a put it in
//                front of a reader for the first time, and it landed ON TOP OF a
//                sentence each of those surfaces already renders:
//                `goodsReceipt.settle.inFlight` (*"…no material document yet"*)
//                and `buyerInvoices.settle.inFlight` (*"…no FI document yet"*).
//                Both name the MISSING DOCUMENT, so both say strictly more than
//                a generic line could, and the interim footer ALWAYS speaks —
//                retry, not-retryable, or in-flight — so nothing is lost by
//                deferring to it. **Derived, not assumed: the settling states
//                are exactly the two SAP boundaries, and both carry that
//                footer.** If a settling state ever appears on a surface with no
//                in-flight account of its own, this decision must be revisited —
//                `nextActSurfaces.test.ts` is where that would show up.
// ─────────────────────────────────────────────────────────────────────────────

import type { NextAct } from '../../services/transitions/nextAct';

/**
 * ⚠️ **DO NOT WIDEN TO `Partial<Record<…>>` AND DO NOT ADD A DEFAULT.** Both
 * restore the silent fall-through this map exists to remove.
 */
export const NEXT_ACT_KEY: Record<NextAct['kind'], string | null> = {
  mine: 'nextAct.mine',
  external: 'nextAct.external',
  computed: 'nextAct.computed',
  // Render through copy the surface already owns — see the header.
  theirs: null,
  settling: null,
  // Render nothing, deliberately — see the header.
  ended: null,
  silent: null,
};
