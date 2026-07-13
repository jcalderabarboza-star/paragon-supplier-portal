// ────────────────────────────────────────────────────────────────────────────
// Central channel-label map (SEAT2-I18N-CHANNEL-01) — a sibling of
// statusLabel.ts / modeLabel.ts for the communication-channel enum
// (WhatsApp / Email / Web / API …) that renders as filter chips and side-panel
// pills across the WhatsApp hubs, orders, invoices, and documents surfaces.
//
// PROPER-NOUN / PROTOCOL DECISION (honest, per-token — closes the "Channel enum
// kept canonical" item flagged in Batch 5):
//   • WhatsApp, WeChat  → brand proper nouns — NOT translated (identical EN/ID).
//   • Email             → the universal loanword in Indonesian business use
//                         ("Surel" exists but reads as officialese here) — kept.
//   • API, API Push, EDI→ protocol names — NOT translated (identical EN/ID).
//   • Web               → universal — kept.
//   • Web Portal        → the ONE token with a natural ID display → "Portal Web".
//
// So this map is deliberately mostly-canonical. Its value is threefold: (1) a
// single documented home for the proper-noun decision, (2) case + spelling
// NORMALIZATION — the fixtures store 'whatsapp' / 'api' / 'email' lowercase and
// 'Web Portal' / 'API Push' long-form; the resolver lifts every variant to the
// canonical display casing, and (3) it lets the StatusPill resolver chain and
// filter chips localize 'Web Portal' without page edits.
//
// HONEST-BY-CONSTRUCTION: display-only. The stored channel value and any
// FilterChipsBar `id` stay canonical EN. Slugs are namespaced `channel.*`.
// ────────────────────────────────────────────────────────────────────────────

// Canonical channel token → { en display, id display }. Most rows are identical
// in both locales by the proper-noun / protocol decision above; only 'Web Portal'
// carries a distinct ID label. Resolution is case-insensitive, so the lowercase
// fixture variants ('whatsapp', 'api', 'email', 'wechat', 'edi') all resolve to
// the canonical display casing below.
const CHANNEL: Record<string, { en: string; id: string }> = {
  WhatsApp: { en: 'WhatsApp', id: 'WhatsApp' },
  Email: { en: 'Email', id: 'Email' },
  Web: { en: 'Web', id: 'Web' },
  'Web Portal': { en: 'Web Portal', id: 'Portal Web' },
  API: { en: 'API', id: 'API' },
  'API Push': { en: 'API Push', id: 'API Push' },
  EDI: { en: 'EDI', id: 'EDI' },
  WeChat: { en: 'WeChat', id: 'WeChat' },
};

// The canonical set, in declaration order (the resource spread + guard test).
export const CANONICAL_CHANNELS = Object.keys(CHANNEL);

// Case-insensitive index: normalized token → canonical token.
const BY_NORM = new Map(
  CANONICAL_CHANNELS.map((k) => [k.trim().toLowerCase(), k]),
);

/** Slug a canonical channel into its i18n key: "Web Portal" → "channel.web_portal". */
function slug(channel: string): string {
  return (
    'channel.' +
    channel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
}

/**
 * The i18n key for a channel label, or null if the token is not a known channel
 * (the caller then renders it verbatim). Trimmed and case-insensitive.
 */
export function channelLabelKey(channel: string): string | null {
  const canon = BY_NORM.get(channel.trim().toLowerCase());
  return canon ? slug(canon) : null;
}

/** i18n resource fragments — spread into the en/id translation namespaces. */
export const channelResourcesEn: Record<string, string> = Object.fromEntries(
  CANONICAL_CHANNELS.map((s) => [slug(s), CHANNEL[s].en]),
);
export const channelResourcesId: Record<string, string> = Object.fromEntries(
  CANONICAL_CHANNELS.map((s) => [slug(s), CHANNEL[s].id]),
);

// Re-exported for the guard test (coverage + slug-collision checks).
export const __channelInternals = { CHANNEL, slug };
