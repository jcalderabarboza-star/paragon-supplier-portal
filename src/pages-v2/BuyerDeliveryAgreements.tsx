import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info, PackageCheck } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import LivenessPill from '../components/ui-v2/LivenessPill';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import TargetBar from '../components/ui-v2/TargetBar';
import Data from '../components/ui-v2/Data';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import LoadingState from '../components/ui-v2/LoadingState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useDeliveryAgreements } from '../services/query/deliveryHooks';
import { SDC_SIMULATED_NOW } from '../services/sdc';
import { formatNumber, formatDate } from '../lib/format';
import type {
  DeliveryAgreementView,
  DeliveryItemView,
  ReleaseFulfillment,
  ReleaseFulfillmentView,
} from '../services/delivery';

// Fulfillment → the quiet outlined StatusPill tone (DP-2 semantic, soft variants):
// fulfilled = delivered on time, late = delivered but after, missed = a real gap,
// pending = the honest default before the date arrives.
const FULFILLMENT_VARIANT: Record<
  ReleaseFulfillment,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  fulfilled: 'success',
  late: 'warning',
  missed: 'danger',
  pending: 'neutral',
};

/** Signed quantity for the variance caption — U+2212 minus, thousands-grouped. */
const signedQty = (n: number): string => {
  const abs = formatNumber(Math.abs(n));
  return n > 0 ? `+${abs}` : n < 0 ? `−${abs}` : abs;
};

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

      {/* Honest framing — read-only, simulated, nothing dispatches. */}
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary flex items-start gap-2">
        <Info size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('delivery.honesty.title')}</strong>{' '}
          {t('delivery.honesty.body')}
        </span>
      </div>

      <div className="space-y-8">
        {agreements.map((view) => (
          <AgreementCard key={view.agreement.id} view={view} />
        ))}
      </div>
    </AppShellV2>
  );
};

// ─── One agreement (header + per-item drawdown) ───────────────────────────────

const AgreementCard: React.FC<{ view: DeliveryAgreementView }> = ({ view }) => {
  const { t } = useTranslation();
  const { agreement, supplierName } = view;
  // All-draft ⇒ no released line has fulfillment (the pristine "nothing
  // transmitted" state). Surfaced honestly rather than shown as an empty drawdown.
  const allDraft = view.items.every((iv) => iv.fulfillment.length === 0);

  return (
    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PackageCheck size={16} className="text-text-tertiary shrink-0" />
            <span className="font-semibold text-text-primary">
              {supplierName ?? agreement.supplierId}
            </span>
            <StatusPill variant="neutral">{agreement.docType}</StatusPill>
          </div>
          <div className="text-xs text-text-tertiary mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            <span>
              {t('delivery.agreement.sapNumber')}:{' '}
              <Data className="text-xs">{agreement.sapAgreementNumber ?? '—'}</Data>
            </span>
            <span>
              {t('delivery.agreement.contract')}:{' '}
              <Data className="text-xs">{agreement.contractId}</Data>
            </span>
          </div>
        </div>
        {allDraft && (
          <span className="text-xs text-text-tertiary italic shrink-0">
            {t('delivery.agreement.draftNote')}
          </span>
        )}
      </div>

      <div className="divide-y divide-border-subtle">
        {view.items.map((iv) => (
          <ItemBlock key={iv.item.lineSeq} iv={iv} />
        ))}
      </div>
    </section>
  );
};

// ─── One item (policy · KPIs · drawdown bar · release calendar) ───────────────

const ItemBlock: React.FC<{ iv: DeliveryItemView }> = ({ iv }) => {
  const { t } = useTranslation();
  const { item, ledger } = iv;
  const uom = item.uom;

  // Fulfillment keyed by releaseSeq — overlaid on the released calendar rows.
  const fulfillmentBySeq = new Map<number, ReleaseFulfillmentView>(
    iv.fulfillment.map((f) => [f.releaseSeq, f]),
  );

  const drawdownPct =
    ledger.agreedTotalQty > 0 ? (ledger.releasedQty / ledger.agreedTotalQty) * 100 : 0;

  return (
    <div className="px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Data className="text-sm font-semibold">{item.materialCode}</Data>
          <span className="text-xs text-text-tertiary">
            {t(`delivery.item.releaseType.${item.releaseType}`)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Policy MODE is always visible (honesty guard 3). Case C reads
              "reference envelope, not enforced", never a governed total. */}
          {ledger.enforced ? (
            <StatusPill variant="info">
              {t('delivery.policy.governed', {
                pct: Math.round((ledger.activePolicy.tolerancePct ?? 0) * 100),
              })}
            </StatusPill>
          ) : (
            <StatusPill variant="neutral">{t('delivery.policy.reference')}</StatusPill>
          )}
          {ledger.policyDeviation && (
            <span className="text-[10px] italic text-warning-hover">
              {t('delivery.policy.deviation')}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <KpiCard eyebrow={t('delivery.kpi.agreed')} value={`${formatNumber(ledger.agreedTotalQty)} ${uom}`} />
        <KpiCard eyebrow={t('delivery.kpi.released')} value={`${formatNumber(ledger.releasedQty)} ${uom}`} />
        <KpiCard eyebrow={t('delivery.kpi.delivered')} value={`${formatNumber(ledger.deliveredQty)} ${uom}`} />
        <KpiCard eyebrow={t('delivery.kpi.remaining')} value={`${formatNumber(ledger.remainingQty)} ${uom}`} />
      </div>

      <div className="mb-5">
        <TargetBar pct={drawdownPct} />
        <div className="text-[10px] text-text-tertiary mt-1">
          {t('delivery.drawdown.label', { pct: Math.round(drawdownPct) })}
        </div>
      </div>

      <div className="text-label text-text-tertiary uppercase mb-2">
        {t('delivery.calendar.title')}
      </div>
      <div className="border border-border-subtle rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('delivery.calendar.seq')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.date')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.planned')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.state')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.fulfillment')}</TableHeaderCell>
            <TableHeaderCell>{t('delivery.calendar.drawdownCol')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {item.scheduleLines.map((line) => {
              const fv = fulfillmentBySeq.get(line.releaseSeq);
              return (
                <TableRow key={line.releaseSeq}>
                  <TableCell>
                    <Data className="text-xs">{line.releaseSeq}</Data>
                  </TableCell>
                  <TableCell>
                    <Data className="text-sm">{formatDate(line.releaseDate)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data className="text-sm">
                      {formatNumber(line.plannedQty)} {uom}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={line.state === 'released' ? 'info' : 'neutral'}>
                      {t(`delivery.state.${line.state}`)}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    {fv ? (
                      <div>
                        <StatusPill variant={FULFILLMENT_VARIANT[fv.fulfillment]}>
                          {t(`delivery.fulfillment.${fv.fulfillment}`)}
                        </StatusPill>
                        {fv.matchedRef && (
                          <Data as="div" className="text-[10px] text-text-tertiary mt-0.5">
                            {fv.matchedRef}
                          </Data>
                        )}
                        {/* The inferred flag MUST be visible — a proposal, never
                            authoritative (mirrors derivedFromAsn). Confirmed
                            (explicit-binding) matches carry no such caption. */}
                        {fv.inferred && (
                          <div className="text-[10px] italic text-text-tertiary">
                            {t('delivery.match.proposed')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fv?.actualQty !== undefined ? (
                      <div>
                        <Data className="text-sm">
                          {formatNumber(fv.actualQty)} {uom}
                        </Data>
                        {fv.qtyVariance !== undefined && fv.qtyVariance !== 0 && (
                          <div
                            className={`text-[10px] mt-0.5 ${
                              fv.qtyVariance < 0 ? 'text-danger' : 'text-warning-hover'
                            }`}
                          >
                            {signedQty(fv.qtyVariance)} {uom} {t('delivery.calendar.varianceSuffix')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>

      {/* eta-proxy known-limitation — recorded, not papered over. */}
      <div className="text-[10px] text-text-tertiary mt-2 italic">
        {t('delivery.calendar.etaFootnote')}
      </div>
    </div>
  );
};

export default BuyerDeliveryAgreements;
