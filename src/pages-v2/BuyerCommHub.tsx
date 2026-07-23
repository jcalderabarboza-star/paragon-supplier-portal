import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Info, Inbox, Send, Radio, ArrowRight } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import StatusPill from '../components/ui-v2/StatusPill';
import Data from '../components/ui-v2/Data';
import { useUnifiedChase } from '../services/query/chaseHooks';
import { useConsolidationRows } from '../services/query/sdcBuyerHooks';
import { useSuppliers } from '../services/query/hooks';
import {
  deriveOutboundQueue,
  outboundRequestStore,
  channelProvenanceStore,
  type OutboundStatus,
  type SupplierReplyFact,
} from '../services/channel';
import type { ChaseSeverityLevel } from '../services/chase';
import type { ConsolidationRow } from '../services/sdc';
import { sdcClock } from '../services/sdc';
import { formatDate } from '../lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// Comm Hub C4a — the buyer/planner COMMUNICATION HUB (DEC-COMMS-PRIMARY front door).
//
// The honest replacement for the retired WhatsApp-Hub engagement mock. It renders
// ONLY what the spine genuinely produces today — no fabricated threads, no fake
// read-receipts, no presence, no "sent" affordance:
//   · OUTBOUND QUEUE — deriveOutboundQueue (C3) over the buyer-gated unified chase
//     (5a–5e). Per-supplier composed / awaiting / stale, worst-first. SIMULATED via
//     the LivenessRegistry two-gate — every ask reads "composed — not sent" (no
//     transport exists; invariant b).
//   · CHANNEL-SOURCED SUBMISSIONS — the channelProvenanceStore audit trail: replies
//     that were CONFIRMED into the governed ledger (C2), each linked to its channel
//     message + submission session. A true audit trail, not a conversation replay.
//   · TRIAGE — an honest note: no live inbound transport; a reply is triaged on the
//     Channel Inbox (C2) under a supplier's context. Cross-supplier buyer triage +
//     the buyer recording verb arrive in C4b/C4c (adjudicated).
//
// RENDER-ONLY: reads the hooks + the append-only stores, derives the queue via the
// pure C3 selector, and joins supplier names for display. It writes NOTHING and
// dispatches NOTHING (C4a scope — reads + retirement + relabel). Buyer-gated: the
// unified-chase read resolves [] for a supplier persona.
// ─────────────────────────────────────────────────────────────────────────────

/** Severity → quiet StatusPill tone (hard = Urgent; soft = Advisory). */
const SEVERITY_VARIANT: Record<ChaseSeverityLevel, 'danger' | 'warning' | 'neutral'> = {
  hard: 'danger',
  soft: 'warning',
  none: 'neutral',
};

/** Derived request status → tone. awaiting = responsive (success); stale = went
 *  quiet (danger); composed = an ask to compose (neutral). */
const STATUS_VARIANT: Record<OutboundStatus, 'success' | 'danger' | 'neutral'> = {
  awaiting: 'success',
  stale: 'danger',
  composed: 'neutral',
};

/**
 * Fold the buyer-visible reply signal into the channel-agnostic SupplierReplyFact[]
 * the C3 derivation consumes (LAW 4 — "the caller folds every reply store"). The
 * one buyer-readable reply store today is the forecast-response consolidation: each
 * ANSWERED line carries its submitted response; the latest per supplier is that
 * supplier's freshest reply. (As other reply stores become buyer-readable they fold
 * in here the same way — the derivation never changes.)
 */
function foldReplies(rows: readonly ConsolidationRow[]): SupplierReplyFact[] {
  const latest = new Map<string, string>();
  for (const row of rows) {
    if (!('response' in row.state)) continue; // 'awaiting' has no reply
    const at = row.state.response.submittedAt;
    if (!at) continue;
    const cur = latest.get(row.line.supplierId);
    if (cur === undefined || at > cur) latest.set(row.line.supplierId, at);
  }
  return [...latest].map(([supplierId, latestSubmittedAt]) => ({ supplierId, latestSubmittedAt }));
}

const BuyerCommHub: React.FC = () => {
  const { t } = useTranslation();
  const chaseQuery = useUnifiedChase();
  const consolidationQuery = useConsolidationRows();
  const suppliersQuery = useSuppliers();

  const views = useMemo(() => chaseQuery.data ?? [], [chaseQuery.data]);
  const consolidation = useMemo(() => consolidationQuery.data ?? [], [consolidationQuery.data]);

  const now = sdcClock.now();
  // Reads of the append-only stores (buyer sees the whole network — no per-supplier
  // leak concern; these are Paragon's OWN asks + its OWN recorded provenance).
  const queue = useMemo(
    () => deriveOutboundQueue(views, outboundRequestStore.all(), foldReplies(consolidation), now),
    [views, consolidation, now],
  );
  const provenance = channelProvenanceStore.all();

  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of suppliersQuery.data?.items ?? []) map.set(s.id, s.name);
    return (id: string) => map.get(id) ?? id;
  }, [suppliersQuery.data]);

  const CRUMB = [t('buyerCommHub.crumb.intelligence'), t('buyerCommHub.crumb.hub')];

  if (chaseQuery.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (chaseQuery.isError)
    return <ErrorState breadcrumb={CRUMB} error={chaseQuery.error} onRetry={() => chaseQuery.refetch()} />;

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('buyerCommHub.header.title')}
        subtitle={t('buyerCommHub.header.subtitle')}
        actions={<LivenessPill capability="deliveryAgreements" />}
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>{t('buyerCommHub.meta.line', { date: formatDate(now) })}</span>
        <LivenessPill capability="deliveryAgreements" />
      </PageMetaLine>

      {/* Honest framing — no live channel; nothing is sent from here. */}
      <div className="bg-warning-soft border border-warning/30 rounded-lg px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={16} className="text-warning-hover shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <div className="font-semibold text-warning-hover">{t('buyerCommHub.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('buyerCommHub.honesty.body')}</p>
        </div>
      </div>

      {/* ── Outbound requests (chase-derived; composed — not sent) ─────────── */}
      <section className="mb-8" data-testid="commhub-outbound">
        <div className="flex items-center gap-2 mb-1">
          <Send size={16} className="text-teal" aria-hidden="true" />
          <h2 className="text-section text-text-primary">{t('buyerCommHub.outbound.title')}</h2>
        </div>
        <p className="text-sm text-text-tertiary mb-4">{t('buyerCommHub.outbound.subtitle')}</p>

        {queue.length === 0 ? (
          <div className="border border-border-subtle rounded-lg bg-white px-6 py-8 text-center text-sm text-text-tertiary">
            {t('buyerCommHub.outbound.empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((entry) => (
              <div
                key={entry.supplierId}
                className="border border-border-subtle rounded-lg bg-white overflow-hidden"
                data-testid="commhub-outbound-row"
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-subtle">
                  <span className="text-sm font-semibold text-text-primary">{nameOf(entry.supplierId)}</span>
                  <StatusPill variant={SEVERITY_VARIANT[entry.severity]}>
                    {t(`buyerCommHub.severity.${entry.severity}`)}
                  </StatusPill>
                  <StatusPill variant={STATUS_VARIANT[entry.status]}>
                    {t(`buyerCommHub.status.${entry.status}`)}
                  </StatusPill>
                  {/* Honesty: no transport — every ask reads composed, never sent. */}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-warning-hover">
                    <span className="h-1.5 w-1.5 rounded-full border border-warning" aria-hidden="true" />
                    {t('buyerCommHub.outbound.composedNotSent')}
                  </span>
                </div>

                <div className="px-4 py-3 flex flex-col gap-3">
                  {entry.dataReasons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.dataReasons.map((reason, i) => (
                        <StatusPill key={`${reason}-${i}`} variant="warning">
                          {t(`buyerCommHub.reason.${reason}`)}
                        </StatusPill>
                      ))}
                    </div>
                  )}

                  {entry.subjectRefs.length > 0 && (
                    <ul className="flex flex-col divide-y divide-border-subtle">
                      {entry.subjectRefs.map((ref) => (
                        <li
                          key={`${ref.agreementId}-${ref.itemSeq}-${ref.releaseSeq ?? 'item'}`}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                        >
                          <Data className="text-sm">{ref.materialCode}</Data>
                          <span className="text-text-tertiary text-xs">
                            {t('buyerCommHub.outbound.subjectDue', { date: formatDate(ref.dueAt) })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="text-xs text-text-tertiary">
                    {entry.lastSentAt ? (
                      <span>
                        {t('buyerCommHub.outbound.lastAsked', { date: formatDate(entry.lastSentAt) })}
                        {entry.lastChannel && (
                          <> · {t('buyerCommHub.outbound.channel', { channel: t(`buyerCommHub.channel.${entry.lastChannel}`) })}</>
                        )}
                      </span>
                    ) : (
                      <span>{t('buyerCommHub.outbound.neverAsked')}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Channel-sourced submissions (provenance audit trail) ───────────── */}
      <section className="mb-8" data-testid="commhub-provenance">
        <div className="flex items-center gap-2 mb-1">
          <Radio size={16} className="text-teal" aria-hidden="true" />
          <h2 className="text-section text-text-primary">{t('buyerCommHub.provenance.title')}</h2>
        </div>
        <p className="text-sm text-text-tertiary mb-4">{t('buyerCommHub.provenance.subtitle')}</p>

        {provenance.length === 0 ? (
          <div className="border border-border-subtle rounded-lg bg-white px-6 py-8 text-center text-sm text-text-tertiary">
            {t('buyerCommHub.provenance.empty')}
          </div>
        ) : (
          <ul className="space-y-2">
            {provenance.map((ref, i) => (
              <li
                key={`${ref.channelMessageId}-${i}`}
                className="border border-border-subtle rounded-lg bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                data-testid="commhub-provenance-row"
              >
                <StatusPill variant="success">{t('buyerCommHub.provenance.recorded')}</StatusPill>
                <span className="text-text-secondary">
                  {t('buyerCommHub.provenance.message')} <Data className="text-text-primary">{ref.channelMessageId}</Data>
                </span>
                <span className="text-text-tertiary text-xs">
                  {t('buyerCommHub.provenance.session')} <Data className="text-text-secondary">{ref.sessionId}</Data>
                </span>
                <span className="text-text-tertiary text-xs">
                  {ref.causationAnchor
                    ? <>{t('buyerCommHub.provenance.correlation')} <Data className="text-text-secondary">{ref.causationAnchor}</Data></>
                    : t('buyerCommHub.provenance.noCorrelation')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Triage a new reply (honest deep-link — no live transport) ──────── */}
      <section data-testid="commhub-triage">
        <div className="border border-border-subtle rounded-lg bg-bg-subtle px-4 py-4 flex items-start gap-3">
          <Inbox size={18} className="text-action shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-text-primary">{t('buyerCommHub.inbound.title')}</div>
            <p className="mt-0.5 text-sm text-text-secondary">{t('buyerCommHub.inbound.body')}</p>
            <Link
              to="/supplier/comm-hub"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-action px-3 py-1.5 text-sm font-medium text-action hover:bg-action-soft transition-colors"
            >
              {t('buyerCommHub.inbound.cta')}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </AppShellV2>
  );
};

export default BuyerCommHub;
