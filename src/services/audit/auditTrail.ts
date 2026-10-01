// ────────────────────────────────────────────────────────────────────────────
// G1 · THE AUDIT TRAIL, READ-ONLY — what a surface may see of the DR-10 sink.
//
// The status-history tab on `/buyer/process-flows` reads the events the
// dispatcher emitted. That page must not reach the command spine
// (`ProcessFlows.test.tsx` holds it structurally: the walk dispatches nothing,
// and no file of the page imports a command service), so it reads through this
// module, which exposes ONE function and it only copies the events out. There
// is no emit, no clear and no dispatch here, and nothing to import that has one.
//
// ⚠️ **IN THE DEMO THE SINK IS IN-MEMORY** — it holds what this browser session
// dispatched and empties on reload; the surface says so. The durable sink is
// F1's, and when it lands this function is the one seam that moves.
// ────────────────────────────────────────────────────────────────────────────

import { commandAuditSink } from '../data/mock/MockCommandService';
import type { TransitionEvent } from '../transitions/events';

/** Every event the sink holds, oldest first — a copy, never the sink itself. */
export function readAuditEvents(): readonly TransitionEvent[] {
  return commandAuditSink.all();
}
