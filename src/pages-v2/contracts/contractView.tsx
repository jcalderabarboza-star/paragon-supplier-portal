// ─────────────────────────────────────────────────────────────────────────────
// Contract detail — shared view pieces for the nested /buyer/contracts/:id route.
//
// The detail that used to live inside the list page's SidePanel drawer now renders
// full-width in the contract-detail route, split across tabs. This module owns the
// tab bodies (`ContractDetailBody` = Overview, `ContractDocsList` = Docs) plus the
// small display helpers they need. The list page keeps its own copies of the
// list/wizard helpers; these are the detail-only render helpers, co-located with
// the body that uses them so the route is self-contained.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  PenSquare,
  Handshake,
  CheckCircle2,
  Activity,
  Bell,
  Archive,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import StatusPill from '../../components/ui-v2/StatusPill';
import ScoreBadge from '../../components/ui-v2/ScoreBadge';
import Data from '../../components/ui-v2/Data';
import Timeline, { TimelineEvent } from '../../components/ui-v2/Timeline';
import type {
  Contract,
  ContractStatus,
  ContractType,
} from '../../data/mockContracts';
import type { ContractObligation, ObligationStatus } from '../../data/mockObligations';
import type { Supplier } from '../../services/data/types';

// ─── Display helpers (detail-only) ───────────────────────────────────────────

export const STATUS_VARIANT: Record<
  ContractStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Draft: 'neutral',
  Active: 'success',
  Expiring: 'warning',
  Expired: 'danger',
  Renewed: 'info',
  Terminated: 'neutral',
};

const OBLIGATION_VARIANT: Record<
  ObligationStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Upcoming: 'info',
  'In Progress': 'warning',
  Completed: 'success',
  Overdue: 'danger',
};

const OBLIGATION_RANK: Record<ObligationStatus, number> = {
  Overdue: 0,
  'In Progress': 1,
  Upcoming: 2,
  Completed: 3,
};

const sortObligations = (a: ContractObligation, b: ContractObligation) => {
  const r = OBLIGATION_RANK[a.status] - OBLIGATION_RANK[b.status];
  if (r !== 0) return r;
  return a.dueDate.localeCompare(b.dueDate);
};

const TYPE_LABEL_KEY: Record<ContractType, string> = {
  Supply: 'contracts.type.supply',
  Service: 'contracts.type.service',
  Framework: 'contracts.type.framework',
  NDA: 'contracts.type.nda',
  Quality: 'contracts.type.quality',
  Pricing: 'contracts.type.pricing',
};
export const typeLabel = (t: TFunction, v: ContractType | string): string =>
  TYPE_LABEL_KEY[v as ContractType] ? t(TYPE_LABEL_KEY[v as ContractType]) : String(v);

const OWNER_LABEL_KEY: Record<string, string> = {
  Buyer: 'contracts.owner.buyer',
  Supplier: 'contracts.owner.supplier',
  Both: 'contracts.owner.both',
};
const ownerLabel = (t: TFunction, v: string): string =>
  OWNER_LABEL_KEY[v] ? t(OWNER_LABEL_KEY[v]) : v;

const CATEGORY_LABEL_KEY: Record<string, string> = {
  'Raw Material': 'contracts.category.rawMaterial',
  'Active Ingredient': 'contracts.category.activeIngredient',
  Fragrance: 'contracts.category.fragrance',
  Packaging: 'contracts.category.packaging',
  Other: 'contracts.category.other',
};
const catLabel = (t: TFunction, v: string): string =>
  CATEGORY_LABEL_KEY[v] ? t(CATEGORY_LABEL_KEY[v]) : v;

const formatIDR = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const expiryTone = (days: number): string => {
  if (days < 0) return 'text-danger font-semibold';
  if (days < 30) return 'text-danger font-semibold';
  if (days < 90) return 'text-warning-hover font-semibold';
  return 'text-success';
};

const shiftDays = (iso: string, days: number): string => {
  if (!iso) return iso;
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const buildContractTimeline = (c: Contract, t: TFunction): TimelineEvent[] => {
  const isDraft = c.status === 'Draft';
  const isActive = c.status === 'Active';
  const isExpiring = c.status === 'Expiring';
  const isExpired = c.status === 'Expired';
  const isRenewed = c.status === 'Renewed';
  const isTerminated = c.status === 'Terminated';

  const finalLabel = isExpired
    ? t('contracts.timeline.expired')
    : isRenewed
      ? t('contracts.timeline.renewed')
      : isTerminated
        ? t('contracts.timeline.terminated')
        : t('contracts.timeline.expiryRenewal');
  const finalIcon = isTerminated ? Archive : isRenewed ? RefreshCw : Archive;

  return [
    {
      id: 'drafted',
      title: t('contracts.timeline.drafted'),
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -14)) : undefined,
      status: 'completed',
      icon: PenSquare,
    },
    {
      id: 'negotiated',
      title: t('contracts.timeline.negotiated'),
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -7)) : undefined,
      status: isDraft ? 'current' : 'completed',
      icon: Handshake,
    },
    {
      id: 'signed',
      title: t('contracts.timeline.signed'),
      timestamp: c.signedDate ? formatDate(c.signedDate) : undefined,
      status: isDraft ? 'pending' : 'completed',
      icon: CheckCircle2,
    },
    {
      id: 'active',
      title: t('contracts.timeline.activePeriod'),
      timestamp: `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`,
      status: isActive || isExpiring
        ? 'current'
        : isExpired || isRenewed || isTerminated
          ? 'completed'
          : 'pending',
      icon: Activity,
    },
    {
      id: 'renewal-decision',
      title: t('contracts.timeline.renewalDecision'),
      timestamp:
        c.endDate && c.noticeRequiredDays
          ? t('contracts.timeline.noticeBy', {
              date: formatDate(shiftDays(c.endDate, -c.noticeRequiredDays)),
            })
          : undefined,
      status: isExpiring
        ? 'current'
        : isExpired || isRenewed || isTerminated
          ? 'completed'
          : 'pending',
      icon: Bell,
    },
    {
      id: 'final',
      title: finalLabel,
      timestamp: isExpired || isRenewed || isTerminated
        ? formatDate(c.endDate)
        : undefined,
      status: isExpired || isRenewed || isTerminated ? 'completed' : 'pending',
      icon: finalIcon,
    },
  ];
};

// ─────────────────────────────────────────────────────────────────────────────
// D-CENSUS-8 — PLACEHOLDER_DOCS is DELETED, not marked.
//
// What stood here MANUFACTURED regulatory status. It read a free-text category
// string and, if it contained "raw" or "fragrance", emitted a row that said
// "BPJPH Halal Certificate — Valid" under a shield icon in success green. It did
// the same for "BPOM Registration — Expiring" off the contract TYPE. No such
// certificate was ever looked up; a contract categorised "Raw Materials" was
// simply asserted to hold a valid halal certificate.
//
// This is why a marker was not the fix. DISCLOSURE-TRAVELS-WITH-THE-VALUE-01: a
// page-level "Sample data" pill does not travel with a green Valid chip beside a
// named Indonesian regulator, and a reader deciding whether a supplier may ship
// reads the chip, not the pill. A disclosed fabrication of compliance status is
// still a fabrication of compliance status.
//
// The honest render for "the portal holds no documents for this contract" is
// zero rows and an empty state that says so. When real linked documents land
// (Track-R harvest / F1 document store), they arrive as data, not as a function
// of a category substring.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Docs-tab count badge. Zero by construction: the portal links no documents
 * to a contract today. Kept as a function (rather than inlining 0) so the day a
 * real document relation lands there is one place to read it from.
 */
export const docCount = (_c: Contract): number => 0;

// ─── Overview tab — key facts + obligations + lifecycle timeline ─────────────

export const ContractDetailBody: React.FC<{
  contract: Contract;
  obligations: ContractObligation[];
  suppliers: Supplier[];
}> = ({ contract, obligations, suppliers }) => {
  const { t } = useTranslation();
  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );
  const obligationsForContract = useMemo<ContractObligation[]>(
    () =>
      obligations.filter((o) => o.contractId === contract.id).sort(sortObligations),
    [obligations, contract.id],
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-label text-text-tertiary uppercase mb-3">
          {t('contracts.panel.keyFacts')}
        </h3>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.supplier')}</dt>
            <dd className="text-text-primary font-medium">
              {supplierById.get(contract.supplierId)?.name ?? contract.supplierId}
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.type')}</dt>
            <dd>
              <StatusPill variant="neutral">{typeLabel(t, contract.type)}</StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.status')}</dt>
            <dd>
              <StatusPill variant={STATUS_VARIANT[contract.status]}>
                {contract.status}
              </StatusPill>
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.autoRenewal')}</dt>
            <dd className="text-text-primary font-medium">
              {contract.autoRenewal ? t('contracts.common.yes') : t('contracts.common.no')}
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.startDate')}</dt>
            <Data as="dd" className="text-text-primary font-medium">
              {formatDate(contract.startDate)}
            </Data>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.endDate')}</dt>
            <Data as="dd" className="text-text-primary font-medium">
              {formatDate(contract.endDate)}
            </Data>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.noticeRequired')}</dt>
            <Data as="dd" className="text-text-primary font-medium">
              {t(
                contract.noticeRequiredDays === 1
                  ? 'contracts.panel.noticeDays.one'
                  : 'contracts.panel.noticeDays.other',
                { count: contract.noticeRequiredDays },
              )}
            </Data>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.daysUntilExpiry')}</dt>
            <dd className={`font-semibold ${expiryTone(contract.daysUntilExpiry)}`}>
              {contract.daysUntilExpiry < 0
                ? t('contracts.expiry.daysAgo', {
                    count: Math.abs(contract.daysUntilExpiry),
                  })
                : t('contracts.expiry.days', { count: contract.daysUntilExpiry })}
            </dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.value')}</dt>
            <Data as="dd" className="text-text-primary font-semibold">
              {contract.value > 0 ? formatIDR(contract.value) : '—'}
            </Data>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.currency')}</dt>
            <dd className="text-text-primary font-medium">{contract.currency}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.paymentTerms')}</dt>
            <dd className="text-text-primary font-medium">{contract.paymentTerms}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.incoterms')}</dt>
            <dd className="text-text-primary font-medium">{contract.incoterms}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.signedByBuyer')}</dt>
            <dd className="text-text-primary font-medium">{contract.signedByBuyer}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.signedBySupplier')}</dt>
            <dd className="text-text-primary font-medium">{contract.signedBySupplier}</dd>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.signedDate')}</dt>
            <Data as="dd" className="text-text-primary font-medium">
              {contract.signedDate ? formatDate(contract.signedDate) : '—'}
            </Data>
          </div>
          <div>
            <dt className="text-text-tertiary">{t('contracts.panel.field.category')}</dt>
            <dd className="text-text-primary font-medium">{catLabel(t, contract.category)}</dd>
          </div>
          <div className="col-span-2 md:col-span-3">
            <dt className="text-text-tertiary">{t('contracts.panel.field.brands')}</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {contract.brands.length === 0 ? (
                <span className="text-text-tertiary text-sm">—</span>
              ) : (
                contract.brands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center rounded-full bg-bg-hover text-text-secondary text-xs px-2 py-0.5"
                  >
                    {b}
                  </span>
                ))
              )}
            </dd>
          </div>
          <div className="col-span-2 md:col-span-3 pt-2 flex items-center gap-3">
            <dt className="text-text-tertiary text-sm">
              {t('contracts.panel.field.performanceScore')}
            </dt>
            <dd>
              {contract.performanceScore > 0 ? (
                <ScoreBadge score={contract.performanceScore} size="md" variant="circular" />
              ) : (
                <span className="text-text-tertiary text-sm">
                  {t('contracts.panel.notRated')}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-label text-text-tertiary uppercase mb-3">
          {t('contracts.panel.obligations', { count: obligationsForContract.length })}
        </h3>
        {obligationsForContract.length === 0 ? (
          <p className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
            {t('contracts.panel.noObligations')}
          </p>
        ) : (
          <div className="border border-border-subtle rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">
                    {t('contracts.panel.obl.col.title')}
                  </th>
                  <th className="text-left px-3 py-2 font-semibold">
                    {t('contracts.panel.obl.col.owner')}
                  </th>
                  <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                    {t('contracts.panel.obl.col.due')}
                  </th>
                  <th className="text-left px-3 py-2 font-semibold">
                    {t('contracts.panel.obl.col.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {obligationsForContract.map((o) => (
                  <tr key={o.id} className="border-t border-border-subtle">
                    <td className="px-3 py-2">
                      <div className="text-text-primary font-medium">{o.title}</div>
                      <div className="text-text-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                        {o.category}
                        {o.recurrence ? ` · ${o.recurrence}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{ownerLabel(t, o.owner)}</td>
                    <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                      <Data>{formatDate(o.dueDate)}</Data>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill variant={OBLIGATION_VARIANT[o.status]}>{o.status}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-label text-text-tertiary uppercase mb-3">
          {t('contracts.panel.lifecycle')}
        </h3>
        <Timeline events={buildContractTimeline(contract, t)} />
      </section>
    </div>
  );
};

// ─── Docs tab — no linked documents exist (see the PLACEHOLDER_DOCS note) ────

export const ContractDocsList: React.FC<{ contract: Contract }> = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6 border border-border-subtle rounded-md text-center">
      <ShieldCheck
        size={20}
        className="text-text-tertiary mx-auto mb-2"
        aria-hidden="true"
      />
      <div className="text-sm font-semibold text-text-primary mb-1">
        {t('contracts.docs.empty.title')}
      </div>
      <p className="text-meta text-text-tertiary max-w-md mx-auto">
        {t('contracts.docs.empty.body')}
      </p>
    </div>
  );
};
