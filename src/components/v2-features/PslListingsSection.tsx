import React from 'react';
import { useTranslation } from 'react-i18next';

import StatusPill from '../ui-v2/StatusPill';
import Data from '../ui-v2/Data';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { recordAnchorId } from '../../lib/recordDeepLink';
import {
  effectiveCap,
  effectiveValidUntil,
  pslDisplayStatus,
  pslScopeCodes,
} from '../../services/data/pslProjection';
import { isPublished, type PslListing } from '../../services/data/pslListing';
import type { ActorAttribution } from '../../lib/enforcement';

// ─────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER PROFILE'S PSL SECTION — every listing, with what decided it.
//
// ⚠️ **READ-ONLY, AND IT SAYS SO.** P1 ships no verb: there is no propose, no
// grant, no withdraw, no publish and no cap edit. The subtitle states that
// listings are raised off-portal, because a section with no affordance and no
// explanation reads as a broken screen rather than an honest one.
//
// ⚠️ **PUBLICATION IS RENDERED AS ITS OWN CHIP, BESIDE THE STATUS AND NEVER
// FOLDED INTO IT.** A listing may be published AND expired, or in force AND
// internal. One chip could not say both, and collapsing them would delete
// exactly the states the operator's ruling requires to exist.
//
// ⚠️ **AN ACTOR IS NEVER PRINTED AS A NAME.** `ActorAttribution` is a
// discriminated union and every actor in this tree is `UNATTRIBUTED:
// NO_PERSON_IN_SESSION`, so the surface renders the SENTENCE rather than a name
// it does not have — `SupplierDocument.rejectedBy`'s rule, which is why that
// field is typed and not a `string`.
// ─────────────────────────────────────────────────────────────────────────────

const Actor: React.FC<{ actor: ActorAttribution | null }> = ({ actor }) => {
  const { t } = useTranslation();
  if (actor === null) return <span className="text-text-tertiary">{t('psl.detail.decidedByNone')}</span>;
  if (actor.kind === 'RESOLVED') return <span>{actor.person.displayName}</span>;
  return <span className="text-text-tertiary italic">{t('psl.actor.unattributed')}</span>;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
    <span className="text-sm text-text-secondary">{children}</span>
  </div>
);

const PslListingCard: React.FC<{ listing: PslListing; nowIso: string; highlighted: boolean }> = ({
  listing,
  nowIso,
  highlighted,
}) => {
  const { t } = useTranslation();
  const shown = pslDisplayStatus(listing, nowIso);
  const cap = effectiveCap(listing);
  const effective = effectiveValidUntil(listing);
  const published = isPublished(listing);

  return (
    <div
      id={recordAnchorId(listing.id)}
      data-testid={`psl-listing-${listing.id}`}
      className={`border rounded-lg p-4 bg-bg-surface ${
        highlighted ? 'border-action shadow-sm' : 'border-border-subtle'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StatusPill variant={statusTone(listing.status)}>{listing.status}</StatusPill>
        <StatusPill variant={statusTone(shown)}>{shown}</StatusPill>
        {/* The publication axis, always rendered — an internal listing must be
            as visible as a published one, never an absence the reader infers. */}
        <StatusPill variant={published ? 'info' : 'neutral'}>
          {published ? t('psl.published') : t('psl.internal')}
        </StatusPill>
        <Data as="span" className="text-xs text-text-tertiary ml-auto">
          {listing.id}
        </Data>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label={t('psl.detail.scope')}>
          <Data>{pslScopeCodes(listing).join(', ')}</Data>
        </Field>
        <Field label={t('psl.detail.validity')}>
          <Data>{formatDate(listing.validFrom)}</Data> — <Data>{formatDate(listing.validUntil)}</Data>
        </Field>
        <Field label={t('psl.detail.effectiveUntil')}>
          {effective ? <Data>{formatDate(effective)}</Data> : '—'}
        </Field>
        <Field label={t('psl.detail.cap')}>
          <Data>{t('psl.detail.capDays', { days: cap.days })}</Data>
          <span className="block text-xs text-text-tertiary">
            {t(`psl.detail.capSource.${cap.source}`)}
          </span>
        </Field>
      </div>

      {listing.capJustification && (
        <div className="mb-3">
          <Field label={t('psl.detail.capJustification')}>{listing.capJustification}</Field>
          <span className="text-xs text-text-tertiary">
            {t('psl.detail.capDecidedBy')}: <Actor actor={listing.capDecidedBy} />
          </span>
        </div>
      )}

      <div className="mb-3">
        <Field label={t('psl.detail.justification')}>{listing.justification}</Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Field label={t('psl.detail.proposedBy')}>
          <Actor actor={listing.proposedBy} />
        </Field>
        <Field label={t('psl.detail.decidedBy')}>
          <Actor actor={listing.decidedBy} />
        </Field>
      </div>

      <div className="mb-3">
        <Field label={t('psl.detail.evidence')}>
          {listing.evidenceRefs.length === 0 ? (
            <span className="text-text-tertiary">{t('psl.detail.evidenceNone')}</span>
          ) : (
            <Data>{listing.evidenceRefs.join(', ')}</Data>
          )}
        </Field>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wide text-text-tertiary">
          {t('psl.detail.history')}
        </span>
        <ol className="mt-1 space-y-1">
          {listing.statusHistory.map((h, i) => (
            <li key={`${listing.id}-h${i}`} className="text-sm text-text-secondary">
              <Data className="text-xs">{formatDate(h.at)}</Data> · {h.lifecycle} — {h.reason}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const PslListingsSection: React.FC<{
  /**
   * ⚠️ **ALREADY SELECTED AND ALREADY ORDERED, BY THE PAGE.** This component
   * does NOT call `listingsForSupplier` itself, and the reason is measurable
   * rather than stylistic: `readingInstantGate` attributes a projection call to
   * a family by the TYPES its arguments carry, and asks where its instant came
   * from. A call made in here receives `nowIso` through a destructured prop, so
   * every site the instrument can see is `FORWARDED` and the family resolves to
   * `NO-CALL-SITES` — a read nothing can prove happens at the declared present.
   * With the selection on the page, the deciding site is `listingsForSupplier(
   * PSL_LISTINGS, id, PSL_TODAY)` where `PSL_TODAY` resolves to
   * `DECLARED_PRESENT`, and the family reads `P`.
   */
  listings: readonly PslListing[];
  nowIso: string;
  /** The deep-linked listing id, if the reader arrived on one. */
  highlightId?: string | null;
}> = ({ listings, nowIso, highlightId = null }) => {
  const { t } = useTranslation();

  return (
    <section data-testid="psl-section">
      <h2 className="text-lg font-semibold text-text-primary">{t('psl.section.title')}</h2>
      <p className="text-sm text-text-tertiary mt-1 mb-4">{t('psl.section.subtitle')}</p>

      {listings.length === 0 ? (
        <div
          className="border border-border-subtle rounded-lg p-6 text-center bg-bg-surface"
          data-testid="psl-section-empty"
        >
          <p className="text-sm text-text-secondary">{t('psl.section.empty')}</p>
          <p className="text-xs text-text-tertiary mt-1">{t('psl.section.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => (
            <PslListingCard
              key={l.id}
              listing={l}
              nowIso={nowIso}
              highlighted={l.id === highlightId}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default PslListingsSection;
