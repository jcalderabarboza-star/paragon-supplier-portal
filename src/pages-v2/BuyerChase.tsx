import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Info, MessageCircle } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import LoadingState from '../components/ui-v2/LoadingState';
import EmptyState from '../components/ui-v2/EmptyState';
import ErrorState from '../components/ui-v2/ErrorState';
import StatusPill from '../components/ui-v2/StatusPill';
import Data from '../components/ui-v2/Data';
import { useUnifiedChase } from '../services/query/chaseHooks';
import { useSuppliers } from '../services/query/hooks';
import type { ChaseSeverityLevel } from '../services/chase';
import { SDC_SIMULATED_NOW } from '../services/sdc';
import { formatDate } from '../lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// BuyerChase (SDC-5d) — the buyer/planner UNIFIED chase surface.
//
// The first VISIBLE chase surface: one card per supplier, WORST-FIRST (the
// reducer already sorts hard > soft, then chaseCount, then supplierId), carrying
// BOTH families — forecast-response staleness (data chase) AND delivery-commitment
// exceptions (nudge / alert / drift × firm/semi-firm). The hard/soft split is
// visible: a firm (JIT) miss reads Urgent (danger); a semi-firm (FRC) or a data
// non-response reads Advisory (warning). RENDER-ONLY — reads the hook, derives
// nothing (the composition runs in the service via the pure 5c reducer).
//
// HONEST + SIMULATED: LivenessPill "Sample" (no live channel send, no SAP). The
// chase is a DERIVED assessment over real fulfillment + real consolidation
// staleness, never fabricated urgency. Channel DISPATCH is DEFERRED — the planner
// pushes through the EXISTING WhatsApp/email chrome; the callout + the per-card
// "Push via WhatsApp" link frame that honestly and open that chrome (no sender is
// built here). Buyer-gated: a supplier persona resolves an empty chase list.
// ─────────────────────────────────────────────────────────────────────────────

/** Severity → the quiet StatusPill tone. hard = Urgent (danger); soft = Advisory
 *  (warning); none never appears (a listed supplier always has ≥1 live reason). */
const SEVERITY_VARIANT: Record<ChaseSeverityLevel, 'danger' | 'warning' | 'neutral'> = {
  hard: 'danger',
  soft: 'warning',
  none: 'neutral',
};

const BuyerChase: React.FC = () => {
  const { t } = useTranslation();
  const query = useUnifiedChase();
  const suppliersQuery = useSuppliers();
  const views = query.data ?? [];

  const CRUMB = [t('chase.crumb.settle'), t('chase.title')];

  // Display join — supplierId → name (falls back to the id for a supplier with no
  // master row). A plain lookup, not a derivation.
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of suppliersQuery.data?.items ?? []) map.set(s.id, s.name);
    return (id: string) => map.get(id) ?? id;
  }, [suppliersQuery.data]);

  if (query.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (query.isError)
    return <ErrorState breadcrumb={CRUMB} error={query.error} onRetry={() => query.refetch()} />;
  if (views.length === 0)
    return (
      <EmptyState
        breadcrumb={CRUMB}
        title={t('chase.title')}
        subtitle={t('chase.subtitle')}
        message={t('chase.empty')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('chase.title')}
        subtitle={t('chase.subtitle')}
        actions={<LivenessPill capability="deliveryAgreements" />}
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>{t('chase.meta.summary', { count: views.length, date: formatDate(SDC_SIMULATED_NOW) })}</span>
        <LivenessPill capability="deliveryAgreements" />
      </PageMetaLine>

      {/* Honest framing — a derived chase list; push happens through the existing
          WhatsApp/email chrome, nothing is sent from here. */}
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('chase.honestyTitle')}</strong> {t('chase.honestyBody')}
        </span>
      </div>

      <div className="space-y-4">
        {views.map((view) => (
          <div
            key={view.supplierId}
            className="border border-border-subtle rounded-lg bg-white overflow-hidden"
            data-testid="chase-card"
          >
            {/* Card header — supplier + overall severity + count. */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle bg-bg-subtle">
              <span className="text-sm font-semibold text-text-primary">{nameOf(view.supplierId)}</span>
              <StatusPill variant={SEVERITY_VARIANT[view.overallSeverity]}>
                {t(`chase.severity.${view.overallSeverity}`)}
              </StatusPill>
              <span className="ml-auto text-xs text-text-tertiary">
                {t('chase.count', { n: view.chaseCount })}
              </span>
            </div>

            <div className="px-4 py-3 flex flex-col gap-4">
              {/* Forecast-response staleness (the data family). */}
              {view.dataReasons.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-text-tertiary mb-1.5">
                    {t('chase.section.forecast')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {view.dataReasons.map((reason, i) => (
                      <StatusPill key={`${reason}-${i}`} variant="warning">
                        {t(`chase.data.${reason}`)}
                      </StatusPill>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery commitments (the commitment family) — mode × type ×
                  severity, material, due date. The per-row tone carries the
                  hard/soft split (a firm miss reads danger). */}
              {view.commitmentEntries.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-text-tertiary mb-1.5">
                    {t('chase.section.commitment')}
                  </div>
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {view.commitmentEntries.map((e) => (
                      <li
                        key={`${e.agreementId}-${e.itemSeq}-${e.mode}-${e.releaseSeq ?? 'drift'}`}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                      >
                        <StatusPill variant={SEVERITY_VARIANT[e.severity]}>
                          {t(`chase.mode.${e.mode}`)}
                        </StatusPill>
                        <StatusPill variant="neutral">{t(`chase.type.${e.type}`)}</StatusPill>
                        <Data className="text-sm">{e.materialCode}</Data>
                        <span className="text-text-tertiary text-xs">
                          {t('chase.due', { date: formatDate(e.dueDate) })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Push affordance — opens the EXISTING WhatsApp chrome; no sender
                  is built here (channel dispatch deferred). */}
              <div>
                <Link
                  to="/buyer/comm-hub"
                  className="inline-flex items-center gap-1.5 rounded-md border border-action px-3 py-1.5 text-sm font-medium text-action hover:bg-action-soft transition-colors"
                >
                  <MessageCircle size={14} />
                  {t('chase.pushWhatsApp')}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppShellV2>
  );
};

export default BuyerChase;
