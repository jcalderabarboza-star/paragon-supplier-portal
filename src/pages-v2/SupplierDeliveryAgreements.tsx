import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import LoadingState from '../components/ui-v2/LoadingState';
import EmptyState from '../components/ui-v2/EmptyState';
import ErrorState from '../components/ui-v2/ErrorState';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import AgreementCard from '../components/delivery/AgreementDrawdown';
import Data from '../components/ui-v2/Data';
import { useDeliveryAgreements } from '../services/query/deliveryHooks';
import { shapeObligations } from '../services/chase';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { SDC_SIMULATED_NOW } from '../services/sdc';
import { formatDate } from '../lib/format';

// ─────────────────────────────────────────────────────────────────────────────
// SupplierDeliveryAgreements — the supplier's OWN-FACTS-ONLY delivery mirror.
//
// A read-only view of THIS supplier's scheduling agreements with Paragon: the
// release calendar + derived fulfillment + drawdown ledger. Own-only by
// construction — `useDeliveryAgreements()` resolves the supplier scope from the
// current identity, and `applySupplierScope` in the service returns only this
// supplier's agreements (never another's, proven by the scoping contract test).
//
// READ-ONLY BY CONSTRUCTION: it reuses the SHARED AgreementCard with NO write
// handlers (release / confirm / policy-edit are all buyer governance actions), so
// no Edit-tolerance, no release toolbar, and no per-line Release/Confirm renders.
// Two supplier-audience tweaks: `showPolicyHistory={false}` keeps the tolerance
// MODE chip (legitimate transparency) but hides the buyer-internal deviation
// history (contract default / edit date / reason); `proposedCaptionKey` glosses an
// inferred match as "awaiting Paragon confirmation" — same honesty guarantee
// (never authoritative, deliveredQty never counts it), supplier-facing wording.
//
// SIMULATED by construction — `deliveryAgreements` has no CommandTarget, so the
// LivenessPill can only ever read amber "Sample" (green is structurally
// unreachable). The read-only callout says so in plain terms.
// ─────────────────────────────────────────────────────────────────────────────

// The supplier's OWN obligations ("what Paragon needs from you", SDC-5e) are now
// shaped by the shared `shapeObligations` (services/chase) — the SAME derivation
// the Comm Hub C5 Channel-Inbox section reuses. See that module for the own-facing
// mapping (overdue/upcoming, drift omitted).

const SupplierDeliveryAgreements: React.FC = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const query = useDeliveryAgreements();
  const views = query.data ?? [];

  // The supplier's OWN obligations — a pure fold over the already-own-scoped views
  // (reuse 5a; no new read). Memoised before the guards so hook order is stable.
  const obligations = useMemo(() => shapeObligations(views, SDC_SIMULATED_NOW), [views]);

  const CRUMB = [t('delivery.crumb.settle'), t('delivery.supplier.title')];

  // A buyer (or a scopeless session) has no supplier workspace here — guard like
  // every other #/supplier/* page.
  if (!identity.supplierId) return <NoSupplierIdentity />;
  if (query.isPending) return <LoadingState breadcrumb={CRUMB} />;
  if (query.isError)
    return <ErrorState breadcrumb={CRUMB} error={query.error} onRetry={() => query.refetch()} />;
  if (views.length === 0)
    return (
      <EmptyState
        breadcrumb={CRUMB}
        title={t('delivery.supplier.title')}
        subtitle={t('delivery.supplier.subtitle')}
        message={t('delivery.supplier.empty')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('delivery.supplier.title')}
        subtitle={t('delivery.supplier.subtitle')}
        actions={<LivenessPill capability="deliveryAgreements" />}
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>
          {t('delivery.meta.summary', { count: views.length, date: formatDate(SDC_SIMULATED_NOW) })}
        </span>
        <LivenessPill capability="deliveryAgreements" />
      </PageMetaLine>

      {/* Honest framing — this mirror is the supplier's own read-only view;
          releasing schedules and confirming deliveries are Paragon's actions. */}
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('delivery.supplier.readonlyTitle')}</strong>{' '}
          {t('delivery.supplier.readonlyBody')}
        </span>
      </div>

      {/* SDC-5e — the supplier's OWN obligations ("what Paragon needs from you"):
          own upcoming + overdue deliveries, read-only, own-facing tone (no chase
          vocabulary). Derived from the same views the cards below render. */}
      <section
        className="border border-border-subtle rounded-lg bg-white overflow-hidden mb-6"
        data-testid="supplier-obligations"
      >
        <div className="px-4 py-3 border-b border-border-subtle bg-bg-subtle flex items-center gap-3">
          <span className="text-sm font-semibold text-text-primary">
            {t('delivery.supplier.obligations.title')}
          </span>
          {obligations.length > 0 && (
            <span className="ml-auto text-xs text-text-tertiary">
              {t('delivery.supplier.obligations.summary', {
                overdue: obligations.filter((o) => o.kind === 'overdue').length,
                upcoming: obligations.filter((o) => o.kind === 'upcoming').length,
              })}
            </span>
          )}
        </div>

        {obligations.length === 0 ? (
          <div className="px-4 py-6 text-sm text-text-tertiary flex items-center gap-2">
            <CheckCircle2 size={16} className="text-success shrink-0" />
            {t('delivery.supplier.obligations.empty')}
          </div>
        ) : (
          <ul className="flex flex-col">
            {obligations.map((o, idx) => (
              <li
                key={o.key}
                className={`px-4 py-3 flex items-start gap-3 border-l-[3px] ${
                  o.kind === 'overdue' ? 'border-l-danger' : 'border-l-warning'
                } ${idx < obligations.length - 1 ? 'border-b border-border-subtle' : ''}`}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-bg-hover">
                  {o.kind === 'overdue' ? (
                    <AlertTriangle size={15} className="text-danger" />
                  ) : (
                    <Clock size={15} className="text-warning-hover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-text-primary">
                      {t(
                        o.kind === 'overdue'
                          ? 'delivery.supplier.obligations.overdue'
                          : 'delivery.supplier.obligations.upcoming',
                      )}
                    </span>
                    <Data className="text-sm">{o.materialCode}</Data>
                    <span className="text-xs text-text-tertiary">
                      {t('delivery.supplier.obligations.due', { date: formatDate(o.dueDate) })}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary">
                    {t(
                      o.kind === 'overdue'
                        ? 'delivery.supplier.obligations.overdueGloss'
                        : 'delivery.supplier.obligations.upcomingGloss',
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-8">
        {views.map((view) => (
          <AgreementCard
            key={view.agreement.id}
            view={view}
            showPolicyHistory={false}
            proposedCaptionKey="delivery.match.proposed.supplier"
          />
        ))}
      </div>
    </AppShellV2>
  );
};

export default SupplierDeliveryAgreements;
