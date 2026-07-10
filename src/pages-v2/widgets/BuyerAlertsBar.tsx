import React, { useMemo } from 'react';
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

const CHIP_CLASS: Record<Exclude<FlagSeverity, 'none'>, string> = {
  danger: 'bg-danger-soft text-danger border-danger/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  success: 'bg-success-soft text-success border-success/30',
};

const BuyerAlertsBar: React.FC = () => {
  const navigate = useNavigate();
  const invoices = useBuyerInvoices();
  const pos = usePurchaseOrders();
  const rfqs = useRFQs();
  const quotes = useQuotations();
  const grs = useGoodsReceipts();
  const asns = useASNs();

  const flags = useMemo<Flag[]>(() => {
    const now = new Date();
    const inv = d.overdueInvoices(invoices.data?.items ?? []);
    const unack = d.unacknowledgedOver48h(pos.data?.items ?? [], now);
    const award = d.pendingAwardRfqs(
      rfqs.data?.items ?? [],
      quotes.data?.items ?? [],
    );
    const awardLate = d.awardOverdue(award, now).length;
    const gr = d.grNeedingAction(grs.data?.items ?? []);
    const grVar = d.grVariance(grs.data?.items ?? []).length;
    const asn = d.pendingAsns(asns.data?.items ?? []);
    const asnDisc = d.discrepancyAsns(asns.data?.items ?? []).length;

    return [
      {
        label: 'Overdue invoices',
        count: inv.length,
        severity: d.band(d.maxDaysOutstanding(inv) >= 30, inv.length > 0),
        to: '/buyer/invoices',
      },
      {
        label: 'Unacknowledged POs >48h',
        count: unack.length,
        severity: d.band(unack.length > 0, false),
        to: '/buyer/orders',
      },
      {
        label: 'RFQs awaiting award',
        count: award.length,
        severity: d.band(awardLate > 0, award.length > 0),
        to: '/buyer/sourcing',
      },
      {
        label: 'Receipts to review',
        count: gr.length,
        severity: d.band(grVar > 0, gr.length > 0),
        to: '/buyer/goods-receipt',
      },
      {
        label: 'Inbound ASNs',
        count: asn.length,
        severity: d.band(asnDisc > 0, asn.length > 0),
        to: '/buyer/shipments',
      },
    ].filter((f) => f.count > 0);
  }, [invoices.data, pos.data, rfqs.data, quotes.data, grs.data, asns.data]);

  const total = flags.reduce((s, f) => s + f.count, 0);

  if (total === 0)
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-5 py-3 mb-6">
        <CheckCircle2 size={16} className="text-success shrink-0" />
        <span className="text-sm font-medium text-success">
          All clear — no open exceptions
        </span>
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-5 py-3 shadow-sm mb-6">
      <div className="flex items-center gap-2 shrink-0">
        <AlertTriangle size={16} className="text-warning" />
        <span className="text-sm font-semibold text-text-primary">
          <Data>{total}</Data> open exception{total === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {flags.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => navigate(f.to)}
            className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${
              CHIP_CLASS[f.severity === 'none' ? 'warning' : f.severity]
            }`}
          >
            <Data>{f.count}</Data>
            <span>{f.label}</span>
            <ChevronRight size={12} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BuyerAlertsBar;
