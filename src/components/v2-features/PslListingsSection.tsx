import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import StatusPill from '../ui-v2/StatusPill';
import { statusLabelKey } from '../../lib/statusLabel';
import Data from '../ui-v2/Data';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { recordAnchorId } from '../../lib/recordDeepLink';
import {
  effectiveCap,
  effectiveValidUntil,
  pslDisplayStatus,
  pslScopeCodes,
  PSL_CAP_CEILING_DAYS,
} from '../../services/data/pslProjection';
import {
  isPublished,
  PSL_STATUSES,
  type PslListing,
  type PslStatus,
} from '../../services/data/pslListing';
import type { ActorAttribution } from '../../lib/enforcement';
import Button from '../ui-v2/Button';
import { HandoffNotice } from '../ui-v2/HandoffNotice';
import { useVerbAvailabilities } from '../../hooks/useVerbAvailability';
import { useToast } from '../../hooks/useToast';
import { useRefusalText, useDataErrorText } from '../../hooks/useRefusalText';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { atomsForSeat } from '../../services/transitions/customRoles';
import { restrictiveDecisionVerdict } from '../../services/data/pslLeadCheck';
import { pslRefusalKey } from '../../pages-v2/psl/pslRefusal';
import {
  usePslChangeStatus,
  usePslRenew,
  usePslWithdraw,
  usePslPublish,
  usePslCapOverride,
} from '../../services/query/commandHooks';
import { DataError, type CommandResult } from '../../services/data/types';

// ─────────────────────────────────────────────────────────────────────────────
// THE SUPPLIER PROFILE'S PSL SECTION — every listing, with what decided it.
//
// ⚠️ **IT WAS READ-ONLY AND IT NO LONGER IS — THE OLD PARAGRAPH IS RETRACTED
// RATHER THAN EDITED.** It read: *"READ-ONLY, AND IT SAYS SO. P1 ships no verb:
// there is no propose, no grant, no withdraw, no publish and no cap edit. The
// subtitle states that listings are raised off-portal…"* **Every clause of that
// is false as of P3.** A comment is gated by nothing, which is exactly how
// `SupplierOrders` shipped a live commit behind a comment asserting it was
// unreachable — so this one is corrected in the same commit as the verbs.
//
// This section now carries the five LISTED-ROW verbs: change designation,
// renew, withdraw, publish and the per-listing cap override. **Proposing and
// deciding a NEW listing are deliberately NOT here** (operator ruling g) —
// they live on `/buyer/preferred-suppliers`, so no surface walks one seat from
// *raise* to *approve* in a single panel.
//
// ⚠️ **GATED PER VERB, AND THE MODE RATHER THAN THE DOOR**
// (`ENTRANCE-IS-THE-UNIT-01`). Three atoms in two lanes reach this card —
// `psl:decide`, `psl:publish`, `psl:cap-set` — and a seat may hold any one
// without the others, so one card-level check would be *(surface → imports the
// guard?)*, which `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` names as not
// coverage at all.
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

/** The one input style, named once so five forms cannot drift apart. */
const INPUT =
  'border border-border-subtle rounded px-2 py-1.5 text-sm text-text-primary bg-white';

/** Which inline form is open on this card. `null` is the resting state. */
type CardMode = 'changeStatus' | 'renew' | 'withdraw' | 'cap' | null;

const PslListingCard: React.FC<{ listing: PslListing; nowIso: string; highlighted: boolean }> = ({
  listing,
  nowIso,
  highlighted,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();
  const { identity } = useCurrentIdentity();
  const shown = pslDisplayStatus(listing, nowIso);
  const cap = effectiveCap(listing);
  const effective = effectiveValidUntil(listing);
  const published = isPublished(listing);

  const [mode, setMode] = useState<CardMode>(null);
  const [reason, setReason] = useState('');
  const [nextStatus, setNextStatus] = useState<PslStatus>(listing.status);
  const [newUntil, setNewUntil] = useState('');
  const [capDays, setCapDays] = useState('');
  const [capWhy, setCapWhy] = useState('');

  // ⚠️ ONE AVAILABILITY PER VERB, FROM THAT VERB'S OWN ATOM. Three atoms, two
  // lanes: `psl:decide` and `psl:cap-set` are `compliance`'s and `psl:publish`
  // is `procurement`'s, so a narrowed seat legitimately holds one and not the
  // others — which is the segregation `/buyer/roles` renders.
  const {
    decide: decideAvailability,
    publish: publishAvailability,
    cap: capAvailability,
  } = useVerbAvailabilities({
    decide: 'psl:decide',
    publish: 'psl:publish',
    cap: 'psl:cap-set',
  } as const);

  // ⚠️ Recomputed every render from the SEAT, so narrowing the seat while a
  // form stands open re-gates the form rather than leaving a stale verdict
  // behind it. `atomsForSeat`, never `atomsFor` — only the first honours a
  // custom role's parent reference.
  const seatAtoms = atomsForSeat(identity.businessRoles);

  const changeStatus = usePslChangeStatus();
  const renew = usePslRenew();
  const withdraw = usePslWithdraw();
  const publish = usePslPublish();
  const capOverride = usePslCapOverride();
  const busy =
    changeStatus.isPending ||
    renew.isPending ||
    withdraw.isPending ||
    publish.isPending ||
    capOverride.isPending;

  /** A refusal the dispatcher RETURNED, in the reader's language. */
  const describeRefused = (result: CommandResult): string => {
    const key = pslRefusalKey(result.reason);
    return (
      (key ? t(key, { ceiling: PSL_CAP_CEILING_DAYS }) : null) ??
      refusalText(result.reason) ??
      result.reason ??
      t('psl.refusal.decisionBlank')
    );
  };

  /** A refusal the dispatcher THREW — `SCOPE_DENIED` and its siblings arrive
   *  as prose, which `useRefusalText` cannot read. */
  const describeThrown = (e: unknown): string =>
    dataErrorText(e instanceof DataError ? e.code : undefined) ??
    (e instanceof DataError ? e.message : t('psl.refusal.decisionBlank'));

  /**
   * Fire one verb and render what came back.
   *
   * ⚠️ **A REFUSAL IS RENDERED, NEVER ABSORBED.** The mutation RESOLVES
   * carrying `{status:'failed', reason}` — it does not throw — so a handler
   * that only caught exceptions would report a refusal as a success. That is
   * the `BuyerRequisitions` defect (`variant:'success'` on no dispatch at all),
   * and it is the reason every branch below is explicit.
   */
  const act = async (verb: Exclude<CardMode, null> | 'publish'): Promise<void> => {
    try {
      let result: CommandResult;
      if (verb === 'changeStatus') {
        result = await changeStatus.mutateAsync({
          listingId: listing.id,
          status: nextStatus,
          reason,
        });
      } else if (verb === 'renew') {
        result = await renew.mutateAsync({
          listingId: listing.id,
          validUntil: newUntil,
          reason,
        });
      } else if (verb === 'withdraw') {
        result = await withdraw.mutateAsync({ listingId: listing.id, reason });
      } else if (verb === 'cap') {
        result = await capOverride.mutateAsync({
          listingId: listing.id,
          capDaysOverride: Number(capDays),
          capJustification: capWhy,
        });
      } else {
        result = await publish.mutateAsync({ listingId: listing.id });
      }

      if (result.status === 'failed') {
        toast({ variant: 'error', title: describeRefused(result) });
        return;
      }

      if (verb === 'changeStatus') {
        toast({
          variant: 'success',
          title: t('psl.toast.statusChanged', {
            id: listing.id,
            status: t(statusLabelKey(nextStatus) ?? '', { defaultValue: nextStatus }),
          }),
        });
      } else if (verb === 'renew') {
        toast({
          variant: 'success',
          title: t('psl.toast.renewed', { id: listing.id, date: formatDate(newUntil) }),
        });
      } else if (verb === 'withdraw') {
        toast({ variant: 'success', title: t('psl.toast.withdrawn', { id: listing.id }) });
      } else if (verb === 'cap') {
        toast({
          variant: 'success',
          title: t('psl.toast.capSet', { id: listing.id, days: Number(capDays) }),
        });
      } else {
        toast({ variant: 'success', title: t('psl.toast.published', { id: listing.id }) });
      }

      setMode(null);
      setReason('');
      setNewUntil('');
      setCapDays('');
      setCapWhy('');
    } catch (e) {
      toast({ variant: 'error', title: describeThrown(e) });
    }
  };

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
              {/* ⚠️ THE SAME KEY THE PILL ABOVE RESOLVES — ONE WORD, ONE KEY.
                  This line used to render `{h.lifecycle}` RAW, outside any
                  `StatusPill`, so it had no key at all: `StatusPill` is what
                  reads the central map, and text that never passes through one
                  is never localised. Registering the lifecycle words fixed the
                  PILL and would have left this line in English — two sites
                  disagreeing about one word, which is worse than both being
                  wrong. `statusLabelKey` is the map's own resolver, so the pill
                  and this line cannot drift.
                  The `?? h.lifecycle` arm is the honest render for an
                  unregistered word (never a blank); `statusLabel.test.ts` is
                  what makes it unreachable. */}
              <Data className="text-xs">{formatDate(h.at)}</Data> ·{' '}
              {t(statusLabelKey(h.lifecycle) ?? '', { defaultValue: h.lifecycle })} — {h.reason}
            </li>
          ))}
        </ol>
      </div>

      {/* ── PSL P3 · THE LISTED-ROW VERBS ────────────────────────────────────
          ⚠️ **THE MODE IS GATED, NOT THE DOOR** (`ENTRANCE-IS-THE-UNIT-01`).
          Every form below is rendered INSIDE its own availability check, so a
          seat narrowed while a form stands open loses the form rather than
          keeping a live commit behind a stale decision. Component state
          outlives the seat — `SupplierShipments` says so in its own comment and
          is the precedent copied here.

          ⚠️ **AND THE VERBS ARE GATED PER VERB, NEVER PER CARD.** `psl:decide`,
          `psl:publish` and `psl:cap-set` are three atoms in two lanes, and a
          seat may hold any one without the others. One card-level check would
          be (surface → imports the guard?), which is the shape
          `IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01` names as not coverage. */}
      {listing.lifecycle === 'Listed' ? (
        <div
          className="mt-4 pt-3 border-t border-border-subtle flex flex-col gap-3"
          data-testid={`psl-actions-${listing.id}`}
        >
          {/* ⚠️ BEFORE THE ACT, NEVER AFTER IT. Every verb here records against
              `UNATTRIBUTED: NO_PERSON_IN_SESSION`, and a person should meet
              that before they commit rather than discover it in a ledger. */}
          <p className="text-xs text-text-tertiary">{t('psl.notice.unattributed')}</p>

          {/* ── PUBLISH — its own atom, its own lane (`procurement`) ───────
              ⚠️ ONCE ONLY AND NEVER UNDONE (rulings b and c). When the listing
              is already published there is NO affordance and a SENTENCE
              instead — an absent verb with no explanation reads as a broken
              screen, and an "unpublish" button would offer an act this
              platform refuses to build. */}
          {published ? (
            <p
              className="text-xs text-text-secondary"
              data-testid={`psl-published-notice-${listing.id}`}
            >
              {t('psl.notice.published', {
                date: listing.publishedAt ? formatDate(listing.publishedAt) : '',
              })}
            </p>
          ) : publishAvailability.kind === 'held' ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void act('publish')}
                data-testid={`psl-publish-${listing.id}`}
              >
                {t('psl.verb.publish')}
              </Button>
              <span className="text-xs text-text-tertiary">
                {t('psl.notice.notPublished')}
              </span>
            </div>
          ) : (
            <HandoffNotice
              availability={publishAvailability}
              testId="handoff-psl-publish"
            />
          )}

          {/* ── THE DECIDE VERBS — change designation · renew · withdraw ─── */}
          {decideAvailability.kind === 'held' ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setMode(mode === 'changeStatus' ? null : 'changeStatus')}
                  data-testid={`psl-open-change-${listing.id}`}
                >
                  {t('psl.verb.changeStatus')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setMode(mode === 'renew' ? null : 'renew')}
                  data-testid={`psl-open-renew-${listing.id}`}
                >
                  {t('psl.verb.renew')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setMode(mode === 'withdraw' ? null : 'withdraw')}
                  data-testid={`psl-open-withdraw-${listing.id}`}
                >
                  {t('psl.verb.withdraw')}
                </Button>
              </div>

              {mode === 'changeStatus' ? (
                <div className="flex flex-col gap-2" data-testid={`psl-change-${listing.id}`}>
                  <select
                    className={INPUT}
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as PslStatus)}
                    data-testid={`psl-change-status-${listing.id}`}
                  >
                    {PSL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(statusLabelKey(s) ?? '', { defaultValue: s })}
                      </option>
                    ))}
                  </select>
                  {/* ⚠️ THE SEAT-SEGREGATION MIRROR, on the DESIGNATION BEING
                      MOVED TO — the same pure function the policy hook asks, so
                      the panel cannot promise what the dispatcher will refuse. */}
                  {restrictiveDecisionVerdict(nextStatus, seatAtoms).kind ===
                  'SEAT_HOLDS_BOTH' ? (
                    <p
                      className="text-xs text-warning-hover"
                      data-testid={`psl-seat-holds-both-${listing.id}`}
                    >
                      {t('psl.notice.seatHoldsBoth', {
                        status: t(statusLabelKey(nextStatus) ?? '', {
                          defaultValue: nextStatus,
                        }),
                      })}
                    </p>
                  ) : (
                    <>
                      <textarea
                        className={INPUT}
                        rows={2}
                        placeholder={t('psl.form.reason')}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        data-testid={`psl-change-reason-${listing.id}`}
                      />
                      <Button
                        variant="outline"
                        disabled={busy || reason.trim() === ''}
                        onClick={() => void act('changeStatus')}
                        data-testid={`psl-commit-change-${listing.id}`}
                      >
                        {t('psl.verb.changeStatus')}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}

              {mode === 'renew' ? (
                <div className="flex flex-col gap-2" data-testid={`psl-renew-${listing.id}`}>
                  <input
                    type="date"
                    className={INPUT}
                    value={newUntil}
                    onChange={(e) => setNewUntil(e.target.value)}
                    data-testid={`psl-renew-until-${listing.id}`}
                  />
                  {/* A renewal extends a designation for another term, so the
                      Lead check applies to the designation ALREADY held
                      (ruling e): extending an exemption is granting one. */}
                  {restrictiveDecisionVerdict(listing.status, seatAtoms).kind ===
                  'SEAT_HOLDS_BOTH' ? (
                    <p
                      className="text-xs text-warning-hover"
                      data-testid={`psl-renew-seat-holds-both-${listing.id}`}
                    >
                      {t('psl.notice.seatHoldsBoth', {
                        status: t(statusLabelKey(listing.status) ?? '', {
                          defaultValue: listing.status,
                        }),
                      })}
                    </p>
                  ) : (
                    <>
                      <textarea
                        className={INPUT}
                        rows={2}
                        placeholder={t('psl.form.reason')}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        data-testid={`psl-renew-reason-${listing.id}`}
                      />
                      <Button
                        variant="outline"
                        disabled={busy || reason.trim() === '' || newUntil === ''}
                        onClick={() => void act('renew')}
                        data-testid={`psl-commit-renew-${listing.id}`}
                      >
                        {t('psl.verb.renew')}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}

              {mode === 'withdraw' ? (
                <div
                  className="flex flex-col gap-2"
                  data-testid={`psl-withdraw-${listing.id}`}
                >
                  <textarea
                    className={INPUT}
                    rows={2}
                    placeholder={t('psl.form.reason')}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    data-testid={`psl-withdraw-reason-${listing.id}`}
                  />
                  <Button
                    variant="secondary"
                    disabled={busy || reason.trim() === ''}
                    onClick={() => void act('withdraw')}
                    data-testid={`psl-commit-withdraw-${listing.id}`}
                  >
                    {t('psl.verb.withdraw')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <HandoffNotice availability={decideAvailability} testId="handoff-psl-decide" />
          )}

          {/* ── THE CAP OVERRIDE — its own atom (`psl:cap-set`, compliance) ─ */}
          {capAvailability.kind === 'held' ? (
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => setMode(mode === 'cap' ? null : 'cap')}
                data-testid={`psl-open-cap-${listing.id}`}
              >
                {t('psl.verb.capOverride')}
              </Button>
              {mode === 'cap' ? (
                <div className="flex flex-col gap-2" data-testid={`psl-cap-${listing.id}`}>
                  <input
                    type="number"
                    className={INPUT}
                    placeholder={t('psl.form.capDays')}
                    value={capDays}
                    onChange={(e) => setCapDays(e.target.value)}
                    data-testid={`psl-cap-days-${listing.id}`}
                  />
                  <textarea
                    className={INPUT}
                    rows={2}
                    placeholder={t('psl.form.capJustification')}
                    value={capWhy}
                    onChange={(e) => setCapWhy(e.target.value)}
                    data-testid={`psl-cap-why-${listing.id}`}
                  />
                  <Button
                    variant="outline"
                    disabled={busy || capDays.trim() === '' || capWhy.trim() === ''}
                    onClick={() => void act('cap')}
                    data-testid={`psl-commit-cap-${listing.id}`}
                  >
                    {t('psl.verb.capOverride')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <HandoffNotice availability={capAvailability} testId="handoff-psl-cap-set" />
          )}
        </div>
      ) : null}
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
