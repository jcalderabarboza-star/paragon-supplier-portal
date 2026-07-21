// ─────────────────────────────────────────────────────────────────────────────
// BuyerContractDetail — the nested full-page contract detail (/buyer/contracts/:id).
//
// The traceability spine's leaf: Supplier → their Contracts → THIS contract →
// its Delivery Agreements. The detail that used to open in the list page's 480px
// drawer now renders full-width here, split across tabs (Overview | Delivery
// Agreements | Docs) — the release calendar needs a page, not a drawer. The DA tab
// reads the delivery seam scoped to this contract's id (read-only, SIMULATED); the
// cross-contract roll-up lives at /buyer/delivery-agreements and deep-links back in.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Info } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import SubTabs from '../components/ui-v2/SubTabs';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import LivenessPill from '../components/ui-v2/LivenessPill';
import NotFound from './NotFound';
import { useContracts, useObligations, useSuppliers } from '../services/query/hooks';
import { useDeliveryAgreements } from '../services/query/deliveryHooks';
import {
  ContractDetailBody,
  ContractDocsList,
  docCount,
  typeLabel,
} from './contracts/contractView';
import AgreementCard from '../components/delivery/AgreementDrawdown';
import type { Contract } from '../data/mockContracts';
import type { ContractObligation } from '../data/mockObligations';
import type { Supplier } from '../services/data/types';

type DetailTab = 'overview' | 'delivery' | 'docs';

// ─── Inner view (contract resolved) — tabs + the per-contract DA read ─────────

const ContractDetailView: React.FC<{
  contract: Contract;
  obligations: ContractObligation[];
  suppliers: Supplier[];
}> = ({ contract, obligations, suppliers }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailTab>('overview');
  const daQuery = useDeliveryAgreements(contract.id);
  const agreements = daQuery.data ?? [];

  const supplierName = useMemo(
    () => suppliers.find((s) => s.id === contract.supplierId)?.name ?? contract.supplierId,
    [suppliers, contract.supplierId],
  );

  const CRUMB = [t('contracts.crumb.acquire'), t('contracts.crumb.contracts')];

  return (
    <AppShellV2>
      <Link
        to="/buyer/contracts"
        className="inline-flex items-center gap-1 text-sm text-action hover:underline mb-3"
      >
        <ChevronLeft size={14} /> {t('contracts.detail.back')}
      </Link>

      <PageHeader
        breadcrumb={CRUMB}
        title={`${contract.contractNumber} — ${contract.title}`}
        subtitle={`${supplierName} · ${typeLabel(t, contract.type)}`}
      />

      <SubTabs<DetailTab>
        options={[
          { id: 'overview', label: t('contracts.detail.tab.overview') },
          {
            id: 'delivery',
            label: t('contracts.detail.tab.delivery'),
            count: agreements.length,
          },
          { id: 'docs', label: t('contracts.detail.tab.docs'), count: docCount(contract) },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'overview' && (
        <ContractDetailBody
          contract={contract}
          obligations={obligations}
          suppliers={suppliers}
        />
      )}

      {tab === 'delivery' && (
        <div>
          {/* Honest framing — the DA read is read-only + SIMULATED. */}
          <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
            <Info size={14} className="text-info shrink-0 mt-0.5" />
            <span>
              <strong className="text-info">{t('delivery.honesty.title')}</strong>{' '}
              {t('delivery.honesty.body')}
            </span>
            <span className="ml-auto shrink-0">
              <LivenessPill capability="deliveryAgreements" />
            </span>
          </div>

          {daQuery.isPending ? (
            <LoadingState />
          ) : agreements.length === 0 ? (
            <p className="text-sm text-text-tertiary p-6 border border-border-subtle rounded-lg text-center">
              {t('contracts.detail.deliveryEmpty')}
            </p>
          ) : (
            <div className="space-y-8">
              {agreements.map((view) => (
                <AgreementCard key={view.agreement.id} view={view} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'docs' && <ContractDocsList contract={contract} />}
    </AppShellV2>
  );
};

// ─── Wrapper — resolve the contract by :id across the four honest states ──────

const BuyerContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const contractsQuery = useContracts();
  const obligationsQuery = useObligations();
  const suppliersQuery = useSuppliers();
  const CRUMB = [t('contracts.crumb.acquire'), t('contracts.crumb.contracts')];

  if (contractsQuery.isPending || obligationsQuery.isPending || suppliersQuery.isPending)
    return <LoadingState breadcrumb={CRUMB} />;
  if (contractsQuery.isError || obligationsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={CRUMB}
        error={contractsQuery.error ?? obligationsQuery.error ?? suppliersQuery.error}
        onRetry={() => {
          contractsQuery.refetch();
          obligationsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );

  const contract = (contractsQuery.data?.items ?? []).find((c) => c.id === id);
  // Unknown / out-of-scope contract id → the real 404 (mirrors AppRouter's *).
  if (!contract) return <NotFound />;

  return (
    <ContractDetailView
      contract={contract}
      obligations={obligationsQuery.data?.items ?? []}
      suppliers={suppliersQuery.data?.items ?? []}
    />
  );
};

export default BuyerContractDetail;
