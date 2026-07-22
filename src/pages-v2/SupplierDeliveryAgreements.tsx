import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import LoadingState from '../components/ui-v2/LoadingState';
import EmptyState from '../components/ui-v2/EmptyState';
import ErrorState from '../components/ui-v2/ErrorState';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import AgreementCard from '../components/delivery/AgreementDrawdown';
import { useDeliveryAgreements } from '../services/query/deliveryHooks';
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

const SupplierDeliveryAgreements: React.FC = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const query = useDeliveryAgreements();
  const views = query.data ?? [];

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
