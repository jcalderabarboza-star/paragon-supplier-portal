import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import LoadingState from '../components/ui-v2/LoadingState';
import EmptyState from '../components/ui-v2/EmptyState';
import AgreementCard from '../components/delivery/AgreementDrawdown';
import { useDeliveryAgreements } from '../services/query/deliveryHooks';
import { SDC_SIMULATED_NOW } from '../services/sdc';
import { formatDate } from '../lib/format';

// The cross-contract ROLL-UP: every scheduling agreement in scope, across all
// suppliers' contracts, so a buyer sees the whole drawdown/fulfillment picture in
// one place. Each card's contract ref deep-links into that contract's detail →
// Delivery Agreements tab (the nested home). The per-contract view is the same
// render block scoped to one contract; this is the un-scoped superset.
const BuyerDeliveryAgreements: React.FC = () => {
  const { t } = useTranslation();
  const query = useDeliveryAgreements();
  const agreements = query.data ?? [];

  if (query.isPending) return <LoadingState />;
  if (agreements.length === 0) {
    return (
      <EmptyState
        breadcrumb={[t('delivery.crumb.settle'), t('delivery.crumb.title')]}
        title={t('delivery.header.title')}
        subtitle={t('delivery.header.subtitle')}
        message={t('delivery.empty')}
      />
    );
  }

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('delivery.crumb.settle'), t('delivery.crumb.title')]}
        title={t('delivery.header.title')}
        subtitle={t('delivery.header.subtitle')}
        actions={<LivenessPill capability="deliveryAgreements" />}
      />

      <PageMetaLine className="-mt-6 mb-6 flex items-center gap-3">
        <span>
          {t('delivery.meta.summary', {
            count: agreements.length,
            date: formatDate(SDC_SIMULATED_NOW),
          })}
        </span>
        <LivenessPill capability="deliveryAgreements" />
      </PageMetaLine>

      {/* Honest framing — this OVERVIEW is read-only + simulated; releasing lives
          in each contract's own DA tab (the callout points there). The shared
          delivery.honesty.* is deliberately NOT reused here: it says "nothing
          releases", which is now false product-wide. The card's contract ref
          deep-links into the contract's own Delivery Agreements tab. */}
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('delivery.rollup.honestyTitle')}</strong>{' '}
          {t('delivery.rollup.honestyBody')} {t('delivery.rollup.hint')}
        </span>
      </div>

      <div className="space-y-8">
        {agreements.map((view) => (
          <AgreementCard key={view.agreement.id} view={view} linkContract />
        ))}
      </div>
    </AppShellV2>
  );
};

export default BuyerDeliveryAgreements;
