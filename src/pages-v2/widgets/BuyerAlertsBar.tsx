import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import Data from '../../components/ui-v2/Data';
import type { FlagSeverity } from '../../components/ui-v2/ExpandableWidget';
import {
  useBuyerInvoices,
  usePurchaseOrders,
  useRFQs,
  useQuotations,
  useGoodsReceipts,
  useASNs,
} from '../../services/query/hooks';
import * as d from './buyerDerivations';

// The buyer triage line — the aggregated exception count above the widget grid.
// It reads the SAME derivations the widgets do, so the bar and the widget flags
// can never disagree. LIVE categories only (the sample fixture widgets carry
// their own amber pill and stay out of the honest exception total).

interface Flag {
  label: string;
  count: number;
  severity: FlagSeverity;
  to: string;
}

// DP2-FLAG-01 (Ledger register): severity reads as a small leading DOT on a calm
// neutral chip — consistent with the widget cards, never a colored fill.
const DOT_CLASS: Record<Exclude<FlagSeverity, 'none'>, string> = {
  critical: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-text-tertiary',
};

const BuyerAlertsBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const invoices = useBuyerInvoices();
  const pos = usePurchaseOrders();
  const rfqs = useRFQs();
  const quotes = useQuotations();
  const grs = useGoodsReceipts();
  const asns = useASNs();

  const flags = useMemo<Flag[]>(() => {
    const now = new Date();
    const invItems = invoices.data?.items ?? [];
    const poItems = pos.data?.items ?? [];
    const rfqItems = rfqs.data?.items ?? [];
    const quoteItems = quotes.data?.items ?? [];
    const grItems = grs.data?.items ?? [];
    const asnItems = asns.data?.items ?? [];

    return [
      {
        label: t('widget.alertsBar.flag.overdueInvoices'),
        count: d.overdueInvoices(invItems).length,
        severity: d.invoiceTier(invItems),
        to: '/buyer/invoices',
      },
      {
        label: t('widget.alertsBar.flag.unackPo'),
        count: d.unacknowledgedOver48h(poItems, now).length,
        severity: d.poTier(poItems, now),
        to: '/buyer/orders',
      },
      {
        label: t('widget.alertsBar.flag.rfqAward'),
        count: d.pendingAwardRfqs(rfqItems, quoteItems).length,
        severity: d.rfqAwardTier(rfqItems, quoteItems, now),
        to: '/buyer/sourcing',
      },
      {
        label: t('widget.alertsBar.flag.receiptsReview'),
        count: d.grNeedingAction(grItems).length,
        severity: d.grTier(grItems),
        to: '/buyer/goods-receipt',
      },
      {
        label: t('widget.alertsBar.flag.inboundAsn'),
        count: d.pendingAsns(asnItems).length,
        severity: d.asnTier(asnItems),
        to: '/buyer/shipments',
      },
    ].filter((f) => f.count > 0);
  }, [invoices.data, pos.data, rfqs.data, quotes.data, grs.data, asns.data, t]);

  const total = flags.reduce((s, f) => s + f.count, 0);

  if (total === 0)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-5 py-3 mb-6">
        <CheckCircle2 size={16} className="text-success shrink-0" />
        <span className="text-sm font-medium text-success">
          {t('widget.alertsBar.allClear')}
        </span>
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-5 py-3 shadow-sm mb-6">
      <div className="flex items-center gap-2 shrink-0">
        <AlertTriangle size={16} className="text-warning-hover" />
        <span className="text-sm font-semibold text-text-primary">
          <Data>{total}</Data>{' '}
          {t(
            total === 1
              ? 'widget.alertsBar.exception.one'
              : 'widget.alertsBar.exception.other',
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {flags.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => navigate(f.to)}
            className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-surface pl-2 pr-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                DOT_CLASS[f.severity === 'none' ? 'info' : f.severity]
              }`}
            />
            <Data className="font-semibold text-text-primary">{f.count}</Data>
            <span>{f.label}</span>
            <ChevronRight size={12} className="text-text-tertiary" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BuyerAlertsBar;
