// ─────────────────────────────────────────────────────────────────────────────
// channel — the Communication Hub module (DEC-COMMS-PRIMARY).
//
// C1a — the SHARED CHANNEL VOCABULARY. The small typed core BOTH the inbound
// reply parser (C1) and the outbound request model (C3) consume, so neither mints
// its own channel enum / message shape and C4 needs no unification rewrite.
//
// ── MODULE BOUNDARY (ratified, acyclic) ──────────────────────────────────────
//   `channel` imports `sdc` (+ later `chase`), NEVER the reverse. There is no
//   `sdc → channel` and no `chase → channel` edge. Provenance points INTO sdc's
//   stable ids FROM here (see `makeProvenanceRef`) — sdc types stay untouched.
//
// See docs/Communication_Hub_Design_Skeleton_v1.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { SubmissionSession } from '../sdc';

/** The three transport channels DEC-COMMS-PRIMARY spans. NB: the transport itself
 *  does not exist yet (skeleton §0) — this is the vocabulary a message/record is
 *  tagged with, not a live connection. */
export type Channel = 'whatsapp' | 'email' | 'wechat';

/**
 * One inbound channel message — the raw record a reply arrives as. `supplierId`
 * is the APP-RESOLVED conversation binding (who this thread belongs to), the sole
 * legitimate source of the later `GridContext.supplierId`. It is NEVER derived
 * from the message text: the reply PARSER (C1) reads `rawText` only and cannot
 * emit a supplierId (un-falsifiability by construction — skeleton §2c).
 */
export interface ChannelMessage {
  readonly id: string;
  readonly channel: Channel;
  /** The conversation binding — app-resolved, NOT parsed from `rawText`. */
  readonly supplierId: string;
  /** ISO timestamp the message was received (injected — no ambient clock). */
  readonly receivedAt: string;
  /** The verbatim reply text the parser consumes. */
  readonly rawText: string;
}

/**
 * The correlation ref linking a channel message to the governed SDC dispatch it
 * produced (recorded on the channel side at confirm-dispatch in C2). It POINTS
 * INTO sdc's stable ids — `sessionId` and `causationAnchor` are the
 * `SubmissionSession`'s own fields — so provenance lives in the correlation layer,
 * never on a spoofable payload key and never coupling the source-agnostic adapter
 * to one source (skeleton §2c / C1 §5).
 */
export interface ChannelProvenanceRef {
  /** → `ChannelMessage.id`. */
  readonly channelMessageId: string;
  /** → `SubmissionSession.sessionId` (sdc). */
  readonly sessionId: string;
  /** → `SubmissionSession.auditCorrelationId` (sdc), or null before any attempt. */
  readonly causationAnchor: string | null;
}

/**
 * Build the provenance ref from a channel message id + the SDC submission session
 * envelope the confirmed dispatch was recorded on. `auditCorrelationId` is the
 * empty string before any attempt (session.ts) — normalised to null here so the
 * "no dispatch yet" case is an honest absent value, not a blank string.
 */
export function makeProvenanceRef(
  channelMessageId: string,
  session: Pick<SubmissionSession, 'sessionId' | 'auditCorrelationId'>,
): ChannelProvenanceRef {
  return {
    channelMessageId,
    sessionId: session.sessionId,
    causationAnchor: session.auditCorrelationId || null,
  };
}
