// ─────────────────────────────────────────────────────────────────────────────
// C2 — the channel-side PROVENANCE store (append-only).
//
// After a confirmed inbound reply dispatches through the spine, its linkage —
// channelMessageId → sessionId / causationAnchor (C1a's `ChannelProvenanceRef`) —
// is recorded HERE, on the channel side. Provenance points INTO sdc's stable ids;
// sdc types stay untouched, and the ref never enters a payload (so it cannot spoof
// identity). Same store shape as `outboundRequestStore`: append-only + reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { ChannelProvenanceRef } from './types';

let rows: ChannelProvenanceRef[] = [];

export const channelProvenanceStore = {
  /** Every recorded message→dispatch linkage. */
  all(): readonly ChannelProvenanceRef[] {
    return rows;
  },
  /** The linkages recorded for one inbound message. */
  forMessage(channelMessageId: string): readonly ChannelProvenanceRef[] {
    return rows.filter((r) => r.channelMessageId === channelMessageId);
  },
  /** IMMUTABLE APPEND — a new array; refs are never edited. */
  append(ref: ChannelProvenanceRef): void {
    rows = [...rows, ref];
  },
  /** Clear all recorded linkages (test isolation — the seed is empty). */
  reset(): void {
    rows = [];
  },
};
