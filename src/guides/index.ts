// ────────────────────────────────────────────────────────────────────────────
// G1 · THE GUIDE REGISTRY — the typed accessor over `generated/guides.json`.
//
// ⚠️ **THE JSON IS GENERATED; NEVER EDIT IT.** Edit `docs/guides/*.md` and run
// `node scripts/guides/build.mjs` (it also runs first in `npm run build`).
// `guides.test.ts` re-parses the markdown and fails if the committed JSON
// differs, so a hand edit here is red, not shipped.
//
// ── THE CITATION KEYS (SE-20, Design 5 §B.3) ───────────────────────────────
// `guide://<entity>/<locale>#<transitionId>` for a step and
// `guide://<entity>/<locale>#<section>` for a section. Stable because both
// halves are: the entity and transition ids are the registry's own, and the
// section keys are the nine fixed markers. The co-pilot cites one on every
// sentence that states a fact; `resolveGuideCitation` is how a key is checked.
// A transition id always starts `t_` and no section key does, so the two
// anchor spaces cannot collide.
// ────────────────────────────────────────────────────────────────────────────

import registryJson from './generated/guides.json';
import type { GuideLocale, GuideRegistry, GuideSectionKey, GuideStep, ProcessGuide } from './types';

export type { GuideLocale, GuideSectionKey, GuideStep, GuideStepKind, ProcessGuide } from './types';

/**
 * The JSON as the build wrote it. The cast is the one unchecked step between the
 * build and the app; `guides.test.ts` closes it by asserting every closed-union
 * field (`locale`, `owner`, `stepKind`, the section keys) holds a member.
 */
const REGISTRY = registryJson as unknown as GuideRegistry;

export const GUIDES: readonly ProcessGuide[] = REGISTRY.guides;

export const GUIDE_SECTION_KEYS: readonly GuideSectionKey[] = Object.freeze([
  'summary',
  'lifecycle',
  'steps',
  'forks',
  'flags',
  'linked',
  'history',
  'troubleshooting',
  'testdata',
]);

/** The guide locale a seat reads: Indonesian for `id…`, English otherwise. */
export const guideLocaleFor = (language: string | undefined): GuideLocale =>
  language?.startsWith('id') ? 'id' : 'en';

export function getGuide(entity: string, locale: GuideLocale): ProcessGuide | undefined {
  return GUIDES.find((g) => g.entity === entity && g.locale === locale);
}

/**
 * The locales whose guides are still DRAFTS — the page says so on every guide
 * in one of them. G2 lands the Indonesian guides as translations awaiting the
 * locale pass; that pass removes `'id'` here, and the banner goes with it.
 */
export const GUIDE_DRAFT_LOCALES: readonly GuideLocale[] = Object.freeze(['id']);

/**
 * The route that LISTS a guided entity's documents — where a fixture id in the
 * test-data tab links to. Every flow has a guide (G2), so every flow has an
 * entry; the gate holds each route to the router and to the module that owns
 * the flow, so a route here can never point outside the flow's own module.
 */
export const GUIDE_LIST_ROUTE: Readonly<Record<string, string>> = Object.freeze({
  advanceShipNotice: '/buyer/shipments',
  compliance: '/buyer/compliance',
  contract: '/buyer/contracts',
  deliveryPolicy: '/buyer/delivery-agreements',
  deliveryRelease: '/buyer/delivery-agreements',
  enforcement: '/buyer/goods-receipt',
  forecastPublication: '/buyer/collaboration',
  goodsReceipt: '/buyer/goods-receipt',
  goodsReceiptLine: '/buyer/goods-receipt',
  incomingShipment: '/buyer/collaboration',
  intakeLine: '/buyer/intake-review',
  inventoryDeclaration: '/buyer/collaboration',
  invoice: '/buyer/invoices',
  invoiceMatch: '/buyer/invoices',
  materialRequest: '/buyer/material-requests',
  moduleActivation: '/buyer/platform/modules/admin',
  obligation: '/buyer/contracts',
  psl: '/buyer/preferred-suppliers',
  pslCapSetting: '/buyer/preferred-suppliers',
  purchaseOrder: '/buyer/orders',
  purchaseRequisition: '/buyer/purchase-requisition',
  quotation: '/buyer/sourcing',
  requirementResponse: '/buyer/collaboration',
  rfq: '/buyer/sourcing',
  role: '/buyer/roles',
  shipment: '/buyer/shipments',
  stageResponse: '/buyer/sourcing',
  supplierApplication: '/buyer/supplier-applications',
  supplierDocument: '/buyer/compliance',
});

export const guideCitationKey = (entity: string, locale: GuideLocale, anchor: string): string =>
  `guide://${entity}/${locale}#${anchor}`;

/** Every citation key one guide answers — its sections, then its steps in order. */
export function guideCitations(guide: ProcessGuide): readonly string[] {
  return [
    ...GUIDE_SECTION_KEYS.map((s) => guideCitationKey(guide.entity, guide.locale, s)),
    ...guide.transitions.map((t) => guideCitationKey(guide.entity, guide.locale, t)),
  ];
}

export type ResolvedCitation =
  | { readonly kind: 'section'; readonly guide: ProcessGuide; readonly section: GuideSectionKey; readonly text: string }
  | { readonly kind: 'step'; readonly guide: ProcessGuide; readonly step: GuideStep };

const CITATION = /^guide:\/\/([A-Za-z]+)\/(en|id)#([A-Za-z0-9_]+)$/;

/** A key back to what it cites, or `null` — never a nearest match. */
export function resolveGuideCitation(key: string): ResolvedCitation | null {
  const m = CITATION.exec(key);
  if (!m) return null;
  const guide = getGuide(m[1], m[2] as GuideLocale);
  if (!guide) return null;
  const anchor = m[3];
  if ((GUIDE_SECTION_KEYS as readonly string[]).includes(anchor)) {
    const section = anchor as GuideSectionKey;
    return { kind: 'section', guide, section, text: guide.sections[section] };
  }
  const step = guide.steps[anchor];
  return step ? { kind: 'step', guide, step } : null;
}
