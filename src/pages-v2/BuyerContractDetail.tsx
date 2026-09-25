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
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import NotFound from './NotFound';
import { useContracts, useObligations, useSuppliers } from '../services/query/hooks';
import {
  useAdjustLine,
  useConfirmMatch,
  useDeliveryAgreements,
  useEditPolicy,
  useReleaseLines,
} from '../services/query/deliveryHooks';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useToast } from '../hooks/useToast';
import {
  ContractDetailBody,
  ContractDocsList,
  docCount,
  typeLabel,
} from './contracts/contractView';
import ChangeHistory from '../components/delivery/ChangeHistory';
import { availabilityOfAtom } from '../services/transitions/handoff';
import { deliveryRefusalKey } from '../components/delivery/deliveryRefusal';
import { personNamingRefusalKey } from './personNamingRefusal';
import { useRefusalText } from '../hooks/useRefusalText';
import { personLabel } from '../services/identity/personLabel';
import { SAMPLE_PERSON_PREFIX } from '../services/identity/sampleRoster';
import AgreementCard, {
  type OnAdjust,
  type OnConfirm,
  type OnEditPolicy,
  type OnRelease,
} from '../components/delivery/AgreementDrawdown';
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

  // The release write (the delivery lane's first). BUYER-ONLY: a supplier persona
  // viewing this buyer route gets a read-only card (no onRelease). The service
  // refuses a supplier scope regardless — this just hides the affordance.
  const { identity } = useCurrentIdentity();
  const { toast } = useToast();
  const release = useReleaseLines();
  const adjust = useAdjustLine();
  const confirm = useConfirmMatch();
  const editPolicy = useEditPolicy();
  // ⚠️ **PER-VERB, NOT PER-PERSONA (call-off step 1).** This read
  // `identity.personaType === 'buyer'` and threaded ALL THREE handlers off that
  // one boolean — which was honest while the lane had no atoms, and is not any
  // more. `delivery:release` / `:adjust` / `:confirm` are `procurement`'s and
  // `delivery:policy-set` is `compliance`'s, deliberately so that the lane that
  // transmits schedules cannot relax the tolerance it is measured against. Each
  // verb now answers for itself, and a seat that lacks one sees the WAIT in that
  // verb's own slot rather than a missing control.
  //
  // `personaType` still guards the whole block: a supplier viewing a buyer route
  // gets a read-only card, and the dispatcher denies a supplier scope anyway
  // (`readScopeOwner: () => null`). This only hides affordances.
  const isBuyer = identity.personaType === 'buyer';
  const deliveryAvailability = useMemo(
    () =>
      isBuyer
        ? {
            release: availabilityOfAtom('delivery:release', identity.businessRoles),
            adjust: availabilityOfAtom('delivery:adjust', identity.businessRoles),
            confirm: availabilityOfAtom('delivery:confirm', identity.businessRoles),
            policy: availabilityOfAtom('delivery:policy-set', identity.businessRoles),
          }
        : undefined,
    [isBuyer, identity.businessRoles],
  );
  // The honesty banner speaks for the page, so it asks whether ANY delivery verb
  // is held — a seat holding none is reading, not writing.
  const canRelease =
    deliveryAvailability !== undefined &&
    Object.values(deliveryAvailability).some((a) => a.kind === 'held');

  /**
   * A refusal in the reader's language.
   *
   * ⚠️ **KEYED ON THE HOOK'S REFUSAL HEAD, NEVER ITS PROSE** — `pslRefusal.ts`'s
   * ratified pattern. The dispatcher hands back a developer's English sentence
   * (and, for the sample-actor lock, one with a `personId` in it); rendering it
   * raw is the defect browser QA found in Wave E and the one
   * `personNamingRefusal.ts` exists for. `{{person}}` is filled by the ONE
   * resolver, which is what carries the `(SAMPLE)` marker.
   */
  const refusalText = useRefusalText();
  const refusalCopy = (reason?: string): string => {
    const personKey = personNamingRefusalKey(reason);
    if (personKey) {
      const id = reason?.match(new RegExp(`${SAMPLE_PERSON_PREFIX}[A-Za-z0-9-]+`))?.[0];
      return t(personKey, { person: id ? personLabel(id, t) : t('identity.actor.unknown') });
    }
    const key = deliveryRefusalKey(reason);
    return key ? t(key) : (refusalText(reason) ?? reason ?? '');
  };

  const handleRelease: OnRelease = async (agreementId, itemSeq, selection) => {
    const result = await release.mutateAsync({ agreementId, itemSeq, selection });
    if (result.ok) {
      // ⚠️ **A PARTIAL RELEASE IS REPORTED AS ONE.** The entity is the schedule
      // LINE, so a horizon release is many independent commands and the
      // back-dating guard can refuse some of them. Announcing an unqualified
      // success over a partial outcome is the false-affordance class this batch
      // exists to remove, not to relocate.
      const partial = result.refusals.length > 0;
      toast({
        variant: partial ? 'warning' : 'success',
        title: t('delivery.release.toastOk'),
        description: partial
          ? `${t('delivery.release.toastPartial', {
              released: result.releasedSeqs.length,
              refused: result.refusals.length,
            })} ${refusalCopy(result.refusals[0]?.reason)}`
          : undefined,
      });
    } else {
      // An honest refusal is surfaced (never a silent no-op).
      toast({
        variant: 'warning',
        title: t('delivery.release.toastRefused'),
        description: refusalCopy(result.reason),
      });
    }
  };

  /**
   * Adjust a DRAFT line — the LPA adjustability's first product door, and the
   * remedy the back-dating refusal names. Returns whether it APPLIED, so the
   * inline editor closes on success and stays open on a refusal.
   */
  const handleAdjust: OnAdjust = async (releaseRef, supplierId, patch) => {
    const result = await adjust.mutateAsync({ releaseRef, supplierId, patch });
    if (result.status !== 'failed') {
      toast({ variant: 'success', title: t('delivery.adjust.toastOk') });
      return true;
    }
    toast({
      variant: 'warning',
      title: t('delivery.adjust.toastRefused'),
      description: refusalCopy(result.reason),
    });
    return false;
  };

  // The confirm-match write (the delivery lane's SECOND). Accept an inferred
  // proposal → deliveredQty climbs, the proposal becomes authoritative. The toast
  // is deliberately worded "delivery recorded (portal)" — a confirm is a PORTAL
  // record, never a SAP goods-receipt.
  const handleConfirm: OnConfirm = async (agreementId, itemSeq, releaseSeq) => {
    const result = await confirm.mutateAsync({ agreementId, itemSeq, releaseSeq });
    if (result.ok) {
      toast({ variant: 'success', title: t('delivery.confirm.toastOk') });
    } else {
      // ALREADY_CONFIRMED is an idempotent repeat (info); the rest are warnings.
      toast({
        variant: 'warning',
        title: t('delivery.confirm.toastRefused'),
        description: refusalCopy(result.reason),
      });
    }
  };

  // The policy-edit write (the delivery lane's THIRD — the governance write).
  // Re-points an item's active drawdown tolerance with a required reason. Returns
  // whether the edit was APPLIED, so the inline editor closes on success and stays
  // open on a refusal. Portal-only + SIMULATED — a tolerance change is never posted
  // to SAP. NO_CHANGE is an idempotent repeat (info); the rest are warnings.
  const handleEditPolicy: OnEditPolicy = async (agreementId, itemSeq, patch) => {
    const result = await editPolicy.mutateAsync({ agreementId, itemSeq, patch });
    if (result.ok) {
      toast({ variant: 'success', title: t('delivery.policy.edit.toastOk') });
      return true;
    }
    toast({
      variant: 'warning',
      title: t('delivery.policy.edit.toastRefused'),
      description: refusalCopy(result.reason),
    });
    return false;
  };

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

      {/* D-CENSUS-8 — MARKER-SCOPE-01, the sharpest instance on the portal. The only
          marker on this route was the LivenessPill inside the Delivery-Agreements
          tab. The Docs tab — one tab over, and unmarked — was MANUFACTURING
          "BPJPH Halal Certificate · Valid" from a category substring. The badge was
          literally on a different tab from the fabrication. The fabrication is now
          deleted (contractView.tsx) and the marker is page-level. */}
      <PageMetaLine className="-mt-6 mb-6">
        <ProvenanceMarker capability="contracts" />
      </PageMetaLine>

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
          {/* Honest framing. Read-only for a supplier view; for a buyer (who CAN
              release) the truth changes: a release DOES write, but only to the
              SIMULATED portal store — never posted to SAP. The LivenessPill stays
              amber SIMULATED either way (no CommandTarget backs this capability). */}
          <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
            <Info size={14} className="text-info shrink-0 mt-0.5" />
            <span>
              <strong className="text-info">
                {t(canRelease ? 'delivery.honesty.writeTitle' : 'delivery.honesty.title')}
              </strong>{' '}
              {t(canRelease ? 'delivery.honesty.writeBody' : 'delivery.honesty.body')}
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
                <div key={view.agreement.id}>
                  <AgreementCard
                    view={view}
                    onRelease={isBuyer ? handleRelease : undefined}
                    onConfirm={isBuyer ? handleConfirm : undefined}
                    onEditPolicy={isBuyer ? handleEditPolicy : undefined}
                    onAdjust={isBuyer ? handleAdjust : undefined}
                    availability={deliveryAvailability}
                  />
                  {/* The stamps' first reader. Buyer-side only: a change history
                      is governance history, and the supplier mirror stays
                      read-only in this batch by ruling (its response is step 2). */}
                  <ChangeHistory agreement={view.agreement} />
                </div>
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
