// ────────────────────────────────────────────────────────────────────────────
// B4b · PublicationPanel — publish from the grid (Design 2 §2.3), in plain DOM
// beside the grid: the C6-LOCK precedent for a governed act, so every gate is
// provable headless.
//
// It states the open draft (plan version, grain, horizon), how much of SOMO's
// totals is split, which firm lines still need a signature, when responses
// would be due, and Publish — DISABLED WITH THE STATED REASON until the hooks
// would pass, never a toast after a refusal. The reasons are the hooks' own
// predicates (`publishBlockers`), so the panel cannot tell a different story
// from the dispatcher.
//
// ⚠️ THE PLANNER SPLITS; PROCUREMENT SIGNS. "Sign firm lines" is offered to a
// seat holding `publication:approve`; any other seat reads the handoff naming
// the lane that does. A seat that holds it but names no person is told so
// BEFORE it clicks: the signature is a person's (PUB_ACTOR_ATTRIBUTED).
//
// PLN-5 · ON THE GRID IT FOLDS TO ONE LINE. Open, it stood 280 px tall above the
// grid and was most of why the grid began below the fold at 1600×900. Folded
// (`collapsible`, the grid's default) it states the draft in one line — which
// draft is open, how much is split, how many firm lines await a signature — or
// that none is, with what is published now; "Open" unfolds the whole panel.
// Mounted on its own it is the full panel it always was.
//
// SDC-5 · A DRAFT CAN BE DISCARDED. Publish was the only way out of a draft, and
// one open draft per grain is the rule — so a wrong or abandoned draft blocked
// every later one. "Discard draft" asks once more before it acts (it cannot be
// undone) and is the opener's own atom, `publication:draft`.
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useVerbAvailabilities } from '../../hooks/useVerbAvailability';
import { useRefusalText } from '../../hooks/useRefusalText';
import { formatDate, formatNumber } from '../../lib/format';
import { planningSupplierName } from '../../services/planning/somoFixture';
import { usePublicationAct } from '../../services/query/commandHooks';
import { usePublicationWorkspace } from '../../services/query/sdcBuyerHooks';
import {
  publishBlockers,
  responseDueAtFor,
  sdcClock,
  totalKey,
  unsignedFirmLines,
  type ForecastLine,
  type PublicationDocument,
  type PublishBlocker,
} from '../../services/sdc';
import type { BucketGrain } from '../../services/planning/bucket';
import type { VerbAvailability } from '../../services/transitions/handoff';
import PublicationLedger from './PublicationLedger';

// PLN-2 · names from the planning supplier master, one resolver for every planning surface.
const supplierName = planningSupplierName;

/** The working draft of a grain: the LATEST opened (the store's own rule). */
export function draftOfGrain(records: readonly PublicationDocument[], grain: BucketGrain): PublicationDocument | null {
  const drafts = records.filter((r) => r.state === 'Draft' && r.grain === grain);
  return drafts[drafts.length - 1] ?? null;
}

/** Material-periods split to at least one supplier, of those SOMO gave a total for. */
export function allocationCoverage(d: PublicationDocument): { allocated: number; total: number } {
  const keys = Object.keys(d.totals);
  const split = new Set(d.lines.map((l) => totalKey(l.materialCode, l.periodBucket)));
  return { allocated: keys.filter((k) => split.has(k)).length, total: keys.length };
}

const PublicationPanel: React.FC<{
  grain: BucketGrain;
  /** PLN-5 · fold to a one-line summary, unfolded by `onToggle`. */
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}> = ({ grain, collapsible = false, open = true, onToggle }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const ws = usePublicationWorkspace();
  const act = usePublicationAct();
  const { identity } = useCurrentIdentity();
  const avail = useVerbAvailabilities({
    open: 'publication:draft',
    approve: 'publication:approve',
    publish: 'publication:publish',
  });
  const records = ws.data?.records ?? [];
  const offers = useMemo(() => (ws.data?.offers ?? []).filter((o) => o.grain === grain), [ws.data, grain]);
  const draft = draftOfGrain(records, grain);
  const current = records.find((r) => r.state === 'Published' && r.grain === grain) ?? null;
  const [chosen, setChosen] = useState<string | null>(null);
  const [carry, setCarry] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const offer =
    offers.find((o) => o.planVersion === chosen) ??
    offers.find((o) => o.planVersion === current?.planVersion) ??
    offers[0] ??
    null;
  const named = identity.actor.kind === 'RESOLVED';

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setFailure(null);
    try {
      setFailure(await fn());
    } finally {
      setBusy(false);
    }
  };

  const openDraft = () =>
    run(async () => {
      if (!offer) return null;
      const r = await act.mutateAsync({
        kind: 'open',
        planVersion: offer.planVersion,
        grain,
        horizon: offer.horizon,
        sourceRef: offer.sourceRef,
        ...(carry && current ? { carryForwardFrom: current.publicationId } : {}),
      });
      return r.status === 'failed' ? (r.reason ?? 'failed') : null;
    });

  // One `approve_firm` per unsigned firm line, under ONE causation anchor.
  const signFirm = (lines: readonly ForecastLine[], publicationId: string) =>
    run(async () => {
      let anchor: string | undefined;
      for (const l of lines) {
        const r = await act.mutateAsync({
          kind: 'approve',
          publicationId,
          materialCode: l.materialCode,
          periodBucket: l.periodBucket,
          supplierId: l.supplierId,
          ...(anchor ? { causationId: anchor } : {}),
        });
        anchor ??= r.correlationId;
        if (r.status === 'failed') return r.reason ?? 'failed';
      }
      return null;
    });

  const publish = (publicationId: string) =>
    run(async () => {
      const r = await act.mutateAsync({ kind: 'publish', publicationId });
      return r.status === 'failed' ? (r.reason ?? 'failed') : null;
    });

  const discard = (publicationId: string) =>
    run(async () => {
      const r = await act.mutateAsync({ kind: 'discard', publicationId });
      return r.status === 'failed' ? (r.reason ?? 'failed') : null;
    });

  const blockerText = (b: PublishBlocker): string => {
    if (b.kind === 'NO_LINES') return t('planGrid.publication.blocker.NO_LINES');
    const lines = b.lines
      .slice(0, 3)
      .map((l) => `${l.materialCode} ${l.periodBucket} ${supplierName(l.supplierId)}`)
      .join(', ');
    const more = b.lines.length > 3 ? t('planGrid.publication.andMore', { n: formatNumber(b.lines.length - 3) }) : '';
    return t(`planGrid.publication.blocker.${b.kind}`, { n: formatNumber(b.lines.length), lines: lines + more });
  };

  if (ws.isLoading) return null;

  const toggle = collapsible ? (
    <button
      type="button"
      className="shrink-0 text-xs font-medium text-action hover:underline"
      aria-expanded={open}
      onClick={onToggle}
      data-testid="publication-toggle"
    >
      {open ? t('planGrid.publication.fold') : t('planGrid.publication.unfold')}
    </button>
  ) : null;

  if (collapsible && !open) {
    const cover = draft ? allocationCoverage(draft) : null;
    return (
      <section
        className="mb-2 flex items-center gap-3 rounded-md border border-border-subtle bg-bg-surface px-3 py-1.5 text-xs"
        data-testid="publication-panel"
        data-open="false"
      >
        <h3 className="shrink-0 font-semibold text-text-primary">{t('planGrid.publication.title')}</h3>
        <span className="min-w-0 flex-1 truncate text-text-secondary" data-testid="publication-summary">
          {draft && cover
            ? t('planGrid.publication.summaryDraft', {
                id: draft.publicationId,
                allocated: formatNumber(cover.allocated),
                total: formatNumber(cover.total),
                firm: formatNumber(unsignedFirmLines(draft.lines).length),
              })
            : t('planGrid.publication.summaryNoDraft')}
          {current && <> · {t('planGrid.publication.current', { id: current.publicationId, version: current.planVersion })}</>}
        </span>
        {toggle}
      </section>
    );
  }

  return (
    <section className="mb-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm" data-testid="publication-panel" data-open="true">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-text-primary">{t('planGrid.publication.title')}</h3>
        {toggle}
        {current && (
          <span className="text-xs text-text-secondary" data-testid="publication-current">
            {t('planGrid.publication.current', { id: current.publicationId, version: current.planVersion })}
            {current.responseDueAt && (
              <> · {t('planGrid.publication.currentDue', { date: formatDate(current.responseDueAt) })}</>
            )}
          </span>
        )}
      </div>

      {!draft ? (
        <div data-testid="publication-no-draft">
          <p className="mb-2 text-xs text-text-secondary">{t('planGrid.publication.noDraft')}</p>
          {avail.open.kind === 'held' ? (
            offers.length === 0 ? (
              <p className="text-xs text-text-tertiary">{t('planGrid.publication.noOffer')}</p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-label uppercase text-text-tertiary">{t('planGrid.publication.planVersion')}</span>
                  <select
                    data-testid="publication-plan-version"
                    className="rounded-md border border-border-input bg-bg-surface px-2 py-1.5"
                    value={offer?.planVersion ?? ''}
                    onChange={(e) => setChosen(e.target.value)}
                  >
                    {offers.map((o) => (
                      <option key={o.planVersion} value={o.planVersion}>
                        {o.planVersion} · {o.horizon[0]}–{o.horizon[o.horizon.length - 1]}
                      </option>
                    ))}
                  </select>
                </label>
                {current && (
                  <label className="flex items-center gap-2 pb-1.5 text-xs">
                    <input type="checkbox" data-testid="publication-carry" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
                    {t('planGrid.publication.carry', { id: current.publicationId })}
                  </label>
                )}
                <Button variant="outline" disabled={busy || !offer} onClick={() => void openDraft()} data-testid="publication-open">
                  {t('planGrid.publication.open')}
                </Button>
              </div>
            )
          ) : (
            <HandoffNotice availability={avail.open} testId="handoff-publication-open" />
          )}
        </div>
      ) : (
        <DraftBody
          draft={draft}
          busy={busy}
          named={named}
          avail={avail}
          blockerText={blockerText}
          onSign={(lines) => void signFirm(lines, draft.publicationId)}
          onPublish={() => void publish(draft.publicationId)}
          onDiscard={() => void discard(draft.publicationId)}
        />
      )}

      {failure && (
        <p className="mt-2 text-xs text-danger" role="alert" data-testid="publication-failure">
          {refusalText(failure) ?? failure}
        </p>
      )}

      <div className="mt-3 border-t border-border-subtle pt-2">
        <PublicationLedger records={records.filter((r) => r.grain === grain)} testId="publication-ledger-grid" />
      </div>
    </section>
  );
};

const DraftBody: React.FC<{
  draft: PublicationDocument;
  busy: boolean;
  named: boolean;
  avail: Readonly<Record<'open' | 'approve' | 'publish', VerbAvailability>>;
  blockerText: (b: PublishBlocker) => string;
  onSign: (lines: readonly ForecastLine[]) => void;
  onPublish: () => void;
  onDiscard: () => void;
}> = ({ draft, busy, named, avail, blockerText, onSign, onPublish, onDiscard }) => {
  const { t } = useTranslation();
  // SDC-5 · a discard is asked twice — it ends the draft and cannot be undone.
  const [asking, setAsking] = useState(false);
  const cover = allocationCoverage(draft);
  const unsigned = unsignedFirmLines(draft.lines);
  const blockers = publishBlockers(draft.lines);
  const due = responseDueAtFor(sdcClock.now());
  return (
    <div data-testid="publication-draft">
      <dl className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-text-tertiary">{t('planGrid.publication.draft')}</dt>
          <dd><Data>{draft.publicationId}</Data></dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('planGrid.publication.planVersion')}</dt>
          <dd><Data>{draft.planVersion}</Data></dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('planGrid.publication.grainHorizon')}</dt>
          <dd>
            {t(`planGrid.publication.grain.${draft.grain}`)} · <Data>{draft.horizon[0]}</Data>–<Data>{draft.horizon[draft.horizon.length - 1]}</Data>
          </dd>
        </div>
        <div>
          <dt className="text-text-tertiary">{t('planGrid.publication.deadline')}</dt>
          <dd data-testid="publication-deadline">{t('planGrid.publication.dueIfNow', { date: formatDate(due) })}</dd>
        </div>
      </dl>

      <p className="text-xs text-text-secondary" data-testid="publication-coverage">
        {t('planGrid.publication.coverage', {
          allocated: formatNumber(cover.allocated),
          unallocated: formatNumber(cover.total - cover.allocated),
          lines: formatNumber(draft.lines.length),
        })}
        {draft.carriedFrom && <> · {t('planGrid.publication.carriedFrom', { id: draft.carriedFrom })}</>}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-3" data-testid="publication-firm">
        <span className="text-xs text-text-secondary">
          {t('planGrid.publication.firmAwaiting', { n: formatNumber(unsigned.length) })}
        </span>
        {avail.approve.kind === 'held' ? (
          <>
            <Button
              variant="secondary"
              disabled={busy || unsigned.length === 0 || !named}
              onClick={() => onSign(unsigned)}
              data-testid="publication-sign"
            >
              {t('planGrid.publication.sign', { n: formatNumber(unsigned.length) })}
            </Button>
            {unsigned.length > 0 && !named && (
              <span className="text-xs text-warning-hover" data-testid="publication-sign-needs-person">
                {t('planGrid.publication.signNeedsPerson')}
              </span>
            )}
          </>
        ) : (
          unsigned.length > 0 && <HandoffNotice availability={avail.approve} testId="handoff-publication-approve" />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {avail.publish.kind === 'held' ? (
          <>
            <Button variant="outline" disabled={busy || blockers.length > 0} onClick={onPublish} data-testid="publication-publish">
              {t('planGrid.publication.publish')}
            </Button>
            {blockers.length > 0 && (
              <ul className="text-xs text-warning-hover" data-testid="publication-blockers">
                {blockers.map((b) => (
                  <li key={b.kind} data-testid={`publication-blocker-${b.kind}`}>
                    {blockerText(b)}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <HandoffNotice availability={avail.publish} testId="handoff-publication-publish" />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3" data-testid="publication-discard-row">
        {avail.open.kind !== 'held' ? (
          <HandoffNotice availability={avail.open} testId="handoff-publication-discard" />
        ) : asking ? (
          <>
            <span className="text-xs text-text-primary" data-testid="publication-discard-ask">
              {t('planGrid.publication.discardAsk', { id: draft.publicationId })}
            </span>
            <Button variant="outline" disabled={busy} onClick={onDiscard} data-testid="publication-discard-yes">
              {t('planGrid.publication.discardYes')}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setAsking(false)} data-testid="publication-discard-no">
              {t('planGrid.publication.discardNo')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" disabled={busy} onClick={() => setAsking(true)} data-testid="publication-discard">
            {t('planGrid.publication.discard')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PublicationPanel;
