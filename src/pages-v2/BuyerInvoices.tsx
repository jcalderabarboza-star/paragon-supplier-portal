import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileSpreadsheet,
  Database,
  ChevronRight,
  Send,
  Download,
  MessageCircle,
  Mail,
  Globe,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import { CHART_SERIES, CHART_SEMANTIC } from '../lib/chartPalette';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import { useToast } from '../hooks/useToast';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import type {
  BuyerInvoice,
  BuyerInvoiceStatus as InvStatus,
  InvoiceMatchStatus as MatchStatus,
} from '../services/data/types';
import { useTranslation } from 'react-i18next';
import { statusLabelKey } from '../lib/statusLabel';
import { useBuyerInvoices } from '../services/query/hooks';
import {
  useInvoiceReleasePayment,
  useInvoiceSettlePayment,
  useInvoiceDispute,
  useInvoiceResolve,
} from '../services/query/commandHooks';
import { formatIDR, formatDate } from '../lib/format';
import {
  invoiceActionsFor,
  invoiceCommitAction,
  invoiceActionsForSeat,
} from './invoices/invoiceActionModel';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import type { VerbAvailability } from '../services/transitions/handoff';
import { classifySettleFault, SETTLE_FAULT_RETRYABLE, type SettleFault } from '../services/transitions';
import { useRefusalText } from '../hooks/useRefusalText';

const STATUS_VARIANT: Record<InvStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  'Pending Match': 'neutral',
  Approved: 'success',
  Disputed: 'danger',
  'Payment Released': 'success',
  Overdue: 'danger',
};

const MATCH_VARIANT: Record<MatchStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Matched: 'success',
  'Pending GR': 'neutral',
  Pending: 'neutral',
  'Qty Mismatch': 'danger',
  'Price Variance': 'danger',
};

const CHANNEL_ICON: Record<BuyerInvoice['channel'], LucideIcon> = {
  WhatsApp: MessageCircle,
  Email: Mail,
  Web: Globe,
  API: Send,
};

const AGING_DATA = [
  { bucket: 'Current', amount: 3195, count: 3, risk: 'success' as const, riskLabel: 'Low' },
  { bucket: '1–30d', amount: 320, count: 1, risk: 'warning' as const, riskLabel: 'Medium' },
  { bucket: '31–60d', amount: 410, count: 1, risk: 'danger' as const, riskLabel: 'High' },
  { bucket: '61–90d', amount: 0, count: 0, risk: 'danger' as const, riskLabel: 'High' },
  { bucket: '>90d', amount: 0, count: 0, risk: 'danger' as const, riskLabel: 'High' },
];

const MONTHLY_SPEND = [
  { month: 'Nov 24', paid: 1800, pending: 400 },
  { month: 'Dec 24', paid: 2100, pending: 350 },
  { month: 'Jan 25', paid: 1950, pending: 500 },
  { month: 'Feb 25', paid: 2400, pending: 280 },
  { month: 'Mar 25', paid: 3100, pending: 380 },
  { month: 'Apr 25', paid: 890, pending: 3195 },
];

// i18n keys for the status filter chips + the footer commit verb per status.
// The status/match CHIPS themselves localize centrally via StatusPill; these
// are the separate scaffolding literals (filter labels, footer buttons).
const STATUS_FILTER_KEY: Record<StatusFilter, string> = {
  all: 'buyerInvoices.filter.all',
  'Pending Match': 'buyerInvoices.filter.pendingMatch',
  Approved: 'buyerInvoices.filter.approved',
  'Payment Released': 'buyerInvoices.filter.released',
  Disputed: 'buyerInvoices.filter.disputed',
  Overdue: 'buyerInvoices.filter.overdue',
};

// ⚠️ **THIS MAP NO LONGER CHOOSES A MACHINE VERB, AND THAT IS THE FIX.** It is
// keyed on the DISPLAY LABEL, which is lossy by construction: `toBuyerLabel`
// collapses a past-due `Approved` into `Overdue`, so asking this map "what may I
// do?" answered `Escalate` — a toast — on every invoice the machine declared
// releasable. Both Approved invoices in the tree are past due, so it was 2 of 2,
// decaying in from each due date with no commit involved.
// What remains here are the INFORMATIONAL footers — affordances that are not
// transitions at all (a deferral notice, a remittance advice, an escalation).
// The verbs come from `invoiceActionsFor(lifecycleState)`, derived from the
// machine. See `invoices/invoiceActionModel.ts`.
const FOOTER_ACTION_KEY: Record<InvStatus, string> = {
  'Pending Match': 'buyerInvoices.footer.reviewMatch',
  Approved: 'buyerInvoices.footer.releasePayment',
  Disputed: 'buyerInvoices.footer.resolveDispute',
  'Payment Released': 'buyerInvoices.footer.sendRemittance',
  Overdue: 'buyerInvoices.footer.escalate',
};

const MATCH_DESC_KEY: Record<MatchStatus, string> = {
  Matched: 'buyerInvoices.match.matched',
  'Pending GR': 'buyerInvoices.match.pendingGr',
  Pending: 'buyerInvoices.match.pending',
  'Qty Mismatch': 'buyerInvoices.match.qtyMismatch',
  'Price Variance': 'buyerInvoices.match.priceVariance',
};

// Compact tiles use the shared jt/B/T scale; full amounts and dates delegate
// to the locale utility directly (see call sites).
const fmtCompact = (n: number): string => formatIDR(n, { compact: true });

// DP2-PALETTE-01: chart/UI colour sourced from the central palette (SSoT),
// not page-local hex. Values unchanged — pure de-dup.
const TOKEN_SUCCESS = CHART_SEMANTIC.success;
const TOKEN_WARNING = CHART_SEMANTIC.warning;
const TOKEN_DANGER = CHART_SEMANTIC.danger;
const TOKEN_TEAL = CHART_SERIES[0];
const TOKEN_MUTED = CHART_SEMANTIC.neutral;

interface ChartTooltipPayload {
  name: string;
  value: number;
  color?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
  suffix?: string;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  // i18n-defer: an IDR magnitude unit (`juta`, millions) that renders after
  // `Rp` — already Indonesian, and identical in both locales.
  suffix = 'jT',
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-text-primary mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: Rp {p.value}
          {suffix}
        </div>
      ))}
    </div>
  );
};

type TabKey = 'queue' | 'analytics' | 'aging';
type StatusFilter = InvStatus | 'all';
type PanelMode = 'detail' | 'confirming' | 'remittance' | 'disputing';

const STATUS_OPTIONS: StatusFilter[] = [
  'all',
  'Pending Match',
  'Approved',
  'Payment Released',
  'Disputed',
  'Overdue',
];

// The buyer invoice list re-derives from the ONE canonical store via the query
// layer (3.6 pattern) — NO local seeded copy, NO GR-post localStorage overlay
// (INV-SEED-01 retired; the GR-post → invoice-match auto-advance returns as a
// real cascade under INV-GR-OVERLAY-01, next batch). The selected invoice is
// tracked by id so a background refetch never strands a stale object.
const BuyerInvoicesView: React.FC<{ invoices: BuyerInvoice[] }> = ({ invoices }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const crumb = [t('buyerInvoices.crumb.transact'), t('buyerInvoices.crumb.invoices')];
  const releaseMutation = useInvoiceReleasePayment();
  const settleMutation = useInvoiceSettlePayment();
  const disputeMutation = useInvoiceDispute();
  const resolveMutation = useInvoiceResolve();
  const [tab, setTab] = useState<TabKey>('queue');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const selected = useMemo(
    () => invoices.find((i) => i.id === selectedId) ?? null,
    [invoices, selectedId],
  );
  // The ONE reserved commit for the selected invoice, DERIVED from the
  // machine with the canonical state. `null` whenever no transition is legal —
  // which is what makes the primary slot fall back to an outline informational
  // footer instead of asserting an action that does not exist.
  const commitAction = useMemo(
    () => (selected ? invoiceCommitAction(selected.lifecycleState) : null),
    [selected],
  );
  // ── ⚠️ THE SEAT, AND WHY IT ANNOTATES RATHER THAN FILTERS ─────────────────
  // `invoice:pay` / `invoice:approve` / `invoice:dispute` belong to FINANCE
  // (operator ruling: procurement does not release payment). A procurement seat
  // opening this page must still SEE that a release is due and whose act it is
  // — filtering the verb out would delete the affordance silently, which is the
  // one outcome this batch must not produce. So the population is unchanged and
  // each verb carries its availability.
  const { identity } = useCurrentIdentity();
  const seatActions = useMemo(
    () =>
      selected ? invoiceActionsForSeat(selected.lifecycleState, identity.businessRoles) : [],
    [selected, identity.businessRoles],
  );
  const availabilityOfVerb = (transitionId: string): VerbAvailability =>
    seatActions.find((a) => a.transitionId === transitionId)?.availability ?? { kind: 'held' };
  // ⚠️ **THE FOOTER'S VERB IS NOT ALWAYS THE SOLID COMMIT, AND THE FIRST CUT OF
  // THIS GUARD MISSED THE OTHER ONE.** `handleFooterAction` dispatches the solid
  // commit when there is one and `t_invoice_resolve` when there is not — so a
  // DISPUTED invoice puts a finance-owned verb in the primary slot with
  // `commitAction === null`. Guarding only the commit left that button live for
  // a procurement seat: present, pressable, and refused at the dispatcher. Found
  // in the browser, not by the suite — the list-level sweep is identical for
  // every seat, and only opening a Disputed invoice shows it.
  const footerVerbId: string | null =
    commitAction?.transitionId ??
    (seatActions.some((a) => a.transitionId === 't_invoice_resolve')
      ? 't_invoice_resolve'
      : null);
  const commitAvailability: VerbAvailability = footerVerbId
    ? availabilityOfVerb(footerVerbId)
    : { kind: 'held' };
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');
  // ── THE SETTLE WATCH ──────────────────────────────────────────────────────
  // A settle that fails leaves the command `submitted` and the invoice parked in
  // the interim 'Releasing Payment' — the dispatcher's deliberate design, so the
  // same action genuinely re-attempts. Until now the ONLY trace of that failure
  // was the hook's toast, which a user dismisses and cannot get back; the row
  // then sat in an interim state with no account of itself and no way forward.
  // This holds the correlationId and the classified fault for the settles THIS
  // session started, which is exactly the set we can honestly offer a retry for.
  // We do not fabricate one for an invoice parked by an earlier session — that
  // surface says it is waiting and offers nothing, because that is the truth.
  const [settleWatch, setSettleWatch] = useState<
    Record<string, { correlationId: string; fault: SettleFault | null }>
  >({});
  const watchSettle = (id: string, correlationId: string, fault: SettleFault | null) =>
    setSettleWatch((w) => ({ ...w, [id]: { correlationId, fault } }));
  const clearSettle = (id: string) =>
    setSettleWatch((w) => {
      const { [id]: _done, ...rest } = w;
      return rest;
    });

  // Aging bucket display label — only the 'Current' token localizes; the numeric
  // ranges (1–30d …) are stable data used as chart X-axis keys + React keys.
  const agingBucketLabel = (bucket: string) =>
    bucket === 'Current' ? t('buyerInvoices.aging.current') : bucket;

  const counts = useMemo(() => {
    const by = (s: InvStatus) => invoices.filter((i) => i.status === s).length;
    return {
      all: invoices.length,
      pendingMatch: by('Pending Match'),
      approved: by('Approved'),
      released: by('Payment Released'),
      disputed: by('Disputed'),
      overdue: by('Overdue'),
    };
  }, [invoices]);

  const sums = useMemo(() => {
    const sum = (filter: (i: BuyerInvoice) => boolean) =>
      invoices.filter(filter).reduce((a, b) => a + b.amount, 0);
    return {
      pendingApproval: sum((i) => i.status === 'Pending Match' || i.status === 'Approved'),
      released: sum((i) => i.status === 'Payment Released'),
      disputed: sum((i) => i.status === 'Disputed'),
      overdue: sum((i) => i.status === 'Overdue'),
    };
  }, [invoices]);

  const pendingApprovalCount = counts.pendingMatch + counts.approved;

  const invoiceCount = (n: number) =>
    t(n === 1 ? 'buyerInvoices.kpi.invoiceCount.one' : 'buyerInvoices.kpi.invoiceCount.other', {
      count: n,
    });

  const matchCounts = useMemo(() => {
    const by = (m: MatchStatus) => invoices.filter((i) => i.matchStatus === m).length;
    return {
      matched: by('Matched'),
      pendingGr: by('Pending GR'),
      qtyMismatch: by('Qty Mismatch'),
      priceVariance: by('Price Variance'),
    };
  }, [invoices]);

  const overdueInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'Overdue'),
    [invoices],
  );
  const disputedInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'Disputed'),
    [invoices],
  );

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? invoices
        : invoices.filter((i) => i.status === statusFilter),
    [invoices, statusFilter],
  );

  const lastUpdated = useMemo(() => {
    const latest = invoices.reduce(
      (acc, i) => (i.receivedDate > acc ? i.receivedDate : acc),
      invoices[0]?.receivedDate ?? '',
    );
    return formatDate(latest);
  }, [invoices]);

  const closePanel = () => {
    setSelectedId(null);
    setPanelMode('detail');
    setDisputeReason('');
  };

  const openInvoice = (inv: BuyerInvoice) => {
    setSelectedId(inv.id);
    setPanelMode('detail');
  };

  // ⚠️ ORDER IS THE CONTRACT HERE: THE MACHINE IS ASKED FIRST, WITH THE CANONICAL
  // STATE, AND ONLY WHAT IT DECLINES TO ANSWER FALLS THROUGH TO THE DISPLAY
  // LABEL. Reversing these two blocks reintroduces the defect exactly — a
  // past-due Approved invoice matches `status === 'Overdue'` before it ever
  // reaches the legality question, and the release affordance disappears again.
  const handleFooterAction = () => {
    if (!selected) return;
    const actions = invoiceActionsFor(selected.lifecycleState);
    if (actions.some((a) => a.reservedCommit)) {
      setPanelMode('confirming');
      return;
    }
    if (actions.some((a) => a.transitionId === 't_invoice_resolve')) {
      handleResolve();
      return;
    }
    // Below this line NO transition is legal from the canonical state, so what
    // remains are informational affordances — and those genuinely are about the
    // display label (aging, the remittance advice), which is why they key on it.
    if (selected.lifecycleState === 'Releasing Payment') {
      // In flight at the SAP boundary. The footer renders a notice, not a verb.
      return;
    }
    if (selected.status === 'Payment Released') {
      setPanelMode('remittance');
      return;
    }
    if (selected.status === 'Pending Match') {
      // Honest: match completes on the GR post (INV-GR-OVERLAY-01) — no fabrication.
      toast({
        variant: 'info',
        title: t('invoice.match.deferred.title'),
        description: t('invoice.match.deferred.desc'),
      });
      return;
    }
    if (selected.status === 'Overdue') {
      toast({
        variant: 'warning',
        title: t('buyerInvoices.toast.escalate.title', { invoiceNumber: selected.invoiceNumber }),
        description: t('buyerInvoices.toast.escalate.desc'),
      });
      return;
    }
  };

  // Option B (canonical SAP-boundary pattern): release resolves `submitted` and
  // moves the invoice to the interim 'Releasing Payment' with NO FI document; the
  // async callback SETTLES to 'Payment Released' + a real FI doc. No "paid" claim
  // is shown before it is true (law 0.6 — this replaces the old client-side
  // fabrication that asserted payment immediately).
  const handleReleasePayment = () => {
    if (!selected) return;
    const inv = selected;
    releaseMutation.mutate(
      { invoiceId: inv.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('invoice.pay.failed.title', { invoiceNumber: inv.invoiceNumber }),
              description: refusalText(res.reason) ?? t('invoice.pay.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          setPanelMode('detail');
          toast({
            variant: 'info',
            title: t('invoice.pay.releasing.title', { invoiceNumber: inv.invoiceNumber }),
            description: t('invoice.pay.releasing.desc'),
          });
          const { correlationId } = res;
          watchSettle(inv.id, correlationId, null);
          window.setTimeout(() => {
            settleMutation.mutate(
              { correlationId },
              {
                onSuccess: () => {
                  clearSettle(inv.id);
                  toast({
                    variant: 'success',
                    title: t('invoice.pay.released.title', { invoiceNumber: inv.invoiceNumber }),
                    description: t('invoice.pay.released.desc'),
                  });
                },
                // ⚠️ THE HOOK'S `onError` STILL FIRES — this does not replace it.
                // `useInvoiceSettlePayment` carries `useSettleErrorToast`, which
                // classifies the fault and names its remedy (§43). That handler
                // was built two batches ago and every consumer so far has done
                // nothing but let it toast. This records the fault ON THE ROW, so
                // the account of the failure outlives the toast — TanStack runs
                // the mutation-level callback first, then this one.
                onError: (err) => watchSettle(inv.id, correlationId, classifySettleFault(err)),
              },
            );
          }, 1200);
        },
        onError: () =>
          toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') }),
      },
    );
  };

  // Re-attempt a settle THIS session started and saw fail. Honest because the
  // dispatcher leaves a failed settle `submitted` — the same correlationId is
  // genuinely re-settleable, and `SETTLE_FAULT_RETRYABLE` says which faults can
  // legitimately answer differently on a second ask. A REFUSED or UNGOVERNED
  // fault gets no retry button: asking again cannot change a governed answer,
  // and offering it would be a `PF-1a` affordance promising what it cannot do.
  const retrySettle = (invoiceId: string) => {
    const watch = settleWatch[invoiceId];
    if (!watch) return;
    settleMutation.mutate(
      { correlationId: watch.correlationId },
      {
        onSuccess: () => {
          clearSettle(invoiceId);
          toast({
            variant: 'success',
            title: t('invoice.settle.retried.title'),
            description: t('invoice.settle.retried.desc'),
          });
        },
        onError: (err) => watchSettle(invoiceId, watch.correlationId, classifySettleFault(err)),
      },
    );
  };

  const confirmDispute = () => {
    if (!selected) return;
    const inv = selected;
    if (!disputeReason.trim()) {
      toast({ variant: 'warning', title: t('invoice.dispute.missingReason') });
      return;
    }
    disputeMutation.mutate(
      { invoiceId: inv.id, disputeReason: disputeReason.trim() },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('invoice.dispute.failed.title', { invoiceNumber: inv.invoiceNumber }),
              description: refusalText(res.reason) ?? t('invoice.dispute.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          setPanelMode('detail');
          setDisputeReason('');
          toast({
            variant: 'success',
            title: t('invoice.dispute.success.title', { invoiceNumber: inv.invoiceNumber }),
            description: t('invoice.dispute.success.desc', { correlationId: res.correlationId }),
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') }),
      },
    );
  };

  const handleResolve = () => {
    if (!selected) return;
    const inv = selected;
    resolveMutation.mutate(
      { invoiceId: inv.id },
      {
        onSuccess: (res) => {
          if (res.status === 'failed') {
            toast({
              variant: 'warning',
              title: t('invoice.resolve.failed.title', { invoiceNumber: inv.invoiceNumber }),
              description: refusalText(res.reason) ?? t('invoice.resolve.failed.desc', { reason: res.reason ?? '' }),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('invoice.resolve.success.title', { invoiceNumber: inv.invoiceNumber }),
            description: t('invoice.resolve.success.desc', { correlationId: res.correlationId }),
          });
        },
        onError: () =>
          toast({ variant: 'error', title: t('invoice.denied.title'), description: t('invoice.denied.desc') }),
      },
    );
  };

  const sendRemittance = () => {
    if (!selected) return;
    // Honest: the advice is generated for the supplier to retrieve — not a live
    // external send we cannot verify (law 0.6).
    toast({
      variant: 'success',
      title: t('invoice.remittance.generated.title'),
      description: t('invoice.remittance.generated.desc', { channel: selected.channel }),
    });
    setPanelMode('detail');
  };

  const downloadPdf = () => {
    toast({
      title: t('buyerInvoices.toast.downloadPdf.title'),
      description: t('buyerInvoices.toast.downloadPdf.desc'),
    });
  };

  const panelTitle = selected
    ? t('buyerInvoices.panel.title', { invoiceNumber: selected.invoiceNumber })
    : '';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('buyerInvoices.header.title')}
        subtitle={t('buyerInvoices.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('buyerInvoices.action.sapApExport'),
                icon: Database,
                onClick: () =>
                  toast({
                    title: t('buyerInvoices.toast.sapExport.title'),
                  }),
              },
              {
                label: t('buyerInvoices.action.exportReport'),
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('buyerInvoices.toast.agingReport.title'),
                  }),
              },
            ]}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          invoices.length === 1
            ? 'buyerInvoices.meta.summary.one'
            : 'buyerInvoices.meta.summary.other',
          { count: invoices.length },
        )}{' '}
        {lastUpdated}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. Dispute / Resolve / Release-payment /
            Settle all dispatch through the wired `invoice` target (the Option-B SAP
            boundary is simulated at `settle`, not faked earlier). Feed is fixture. */}
        <ProvenanceMarker capability="invoices" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('buyerInvoices.kpi.pendingApproval.eyebrow')}
          value={fmtCompact(sums.pendingApproval)}
          subtitle={invoiceCount(pendingApprovalCount)}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('buyerInvoices.kpi.released.eyebrow')}
          value={fmtCompact(sums.released)}
          subtitle={invoiceCount(counts.released)}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('buyerInvoices.kpi.disputed.eyebrow')}
          value={fmtCompact(sums.disputed)}
          subtitle={invoiceCount(counts.disputed)}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('buyerInvoices.kpi.overdue.eyebrow')}
          value={fmtCompact(sums.overdue)}
          subtitle={invoiceCount(counts.overdue)}
          icon={AlertOctagon}
        />
      </div>

      {overdueInvoices.length > 0 && (
        <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-3 text-sm text-danger flex items-start gap-2">
          <AlertOctagon size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {t(
                overdueInvoices.length === 1
                  ? 'buyerInvoices.banner.overdue.label.one'
                  : 'buyerInvoices.banner.overdue.label.other',
                { count: overdueInvoices.length },
              )}
            </strong>
            {overdueInvoices
              .map((i) =>
                t('buyerInvoices.banner.overdue.item', {
                  invoice: i.invoiceNumber,
                  days: i.daysOutstanding,
                }),
              )
              .join(' · ')}
          </div>
        </div>
      )}

      {disputedInvoices.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-6 text-sm text-warning-hover flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>{t('buyerInvoices.banner.dispute.label')}</strong>
            {disputedInvoices.map((i) => i.invoiceNumber).join(', ')}
            {t('buyerInvoices.banner.dispute.body')}
          </div>
        </div>
      )}

      <SubTabs<TabKey>
        options={[
          { id: 'queue', label: t('buyerInvoices.tab.queue') },
          { id: 'analytics', label: t('buyerInvoices.tab.analytics') },
          { id: 'aging', label: t('buyerInvoices.tab.aging') },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'queue' && (
        <>
          <div className="mb-4">
            <FilterChipsBar<StatusFilter>
              options={STATUS_OPTIONS.map((id) => ({
                id,
                label: t(STATUS_FILTER_KEY[id]),
                count:
                  id === 'all'
                    ? counts.all
                    : invoices.filter((i) => i.status === id).length,
              }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('buyerInvoices.table.invoiceNo')}</TableHeaderCell>
                <TableHeaderCell>{t('buyerInvoices.table.supplier')}</TableHeaderCell>
                <TableHeaderCell>{t('buyerInvoices.table.poRef')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('buyerInvoices.table.amount')}</TableHeaderCell>
                <TableHeaderCell>{t('buyerInvoices.table.match')}</TableHeaderCell>
                <TableHeaderCell>{t('buyerInvoices.table.status')}</TableHeaderCell>
                <TableHeaderCell>{t('buyerInvoices.table.dueDate')}</TableHeaderCell>
                <TableHeaderCell>{t('buyerInvoices.table.sapFi')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('buyerInvoices.table.actions')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {filtered.map((inv) => {
                  const Channel = CHANNEL_ICON[inv.channel];
                  return (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => openInvoice(inv)}
                    >
                      <TableCell>
                        <Data as="div" className="text-xs font-semibold text-text-primary">
                          {inv.invoiceNumber}
                        </Data>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-text-primary truncate max-w-[14rem]">
                          {inv.supplierName}
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs text-text-tertiary mt-0.5">
                          <Channel size={12} />
                          {t('buyerInvoices.table.via', { channel: inv.channel })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Data className="text-xs text-text-secondary">
                          {inv.poNumber}
                        </Data>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Data as="div" className="font-semibold text-text-primary">
                          {fmtCompact(inv.amount)}
                        </Data>
                        <Data as="div" className="text-xs text-text-tertiary">
                          {formatIDR(inv.amount)}
                        </Data>
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={MATCH_VARIANT[inv.matchStatus]}>
                          {inv.matchStatus}
                        </StatusPill>
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={STATUS_VARIANT[inv.status]}>
                          {inv.status}
                        </StatusPill>
                        {inv.status === 'Overdue' && (
                          <div className="text-xs text-danger mt-1">
                            {t('buyerInvoices.table.daysOverdue', { days: inv.daysOutstanding })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Data as="div" className="text-sm text-text-secondary">
                          {formatDate(inv.dueDate)}
                        </Data>
                        {inv.paymentDate && (
                          <div className="text-xs text-success">
                            {t('buyerInvoices.table.paid')} <Data>{formatDate(inv.paymentDate)}</Data>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Data
                          className={`text-xs ${
                            inv.sapFiDoc ? 'text-success' : 'text-text-tertiary'
                          }`}
                        >
                          {inv.sapFiDoc ?? '—'}
                        </Data>
                      </TableCell>
                      <TableCell className="text-right">
                        <ChevronRight
                          size={16}
                          className="text-text-tertiary inline-block"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center text-sm text-text-tertiary py-10"
                    >
                      {t('buyerInvoices.table.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <h3 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
              {t('buyerInvoices.analytics.monthlyFlow')}
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={MONTHLY_SPEND}
                margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
                <YAxis tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="paid"
                  fill={TOKEN_SUCCESS}
                  name={t('buyerInvoices.chart.released')}
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="pending"
                  fill={TOKEN_TEAL}
                  name={t('buyerInvoices.chart.pending')}
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <h3 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
              {t('buyerInvoices.analytics.matchSummary')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MatchTile
                label={t('buyerInvoices.matchTile.autoMatched')}
                count={matchCounts.matched}
                variant="success"
              />
              <MatchTile
                label={t('buyerInvoices.matchTile.pendingGr')}
                count={matchCounts.pendingGr}
                variant="neutral"
              />
              <MatchTile
                label={t('buyerInvoices.matchTile.qtyMismatch')}
                count={matchCounts.qtyMismatch}
                variant="danger"
              />
              <MatchTile
                label={t('buyerInvoices.matchTile.priceVariance')}
                count={matchCounts.priceVariance}
                variant="danger"
              />
            </div>
          </section>
        </div>
      )}

      {tab === 'aging' && (
        <div className="flex flex-col gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <h3 className="text-section text-text-primary mb-4 pb-3 border-b border-border-subtle">
              {t('buyerInvoices.aging.reportTitle')}
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={AGING_DATA}
                margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis
                  dataKey="bucket"
                  tickFormatter={agingBucketLabel}
                  tick={{ fontSize: 11, fill: TOKEN_MUTED }}
                />
                <YAxis tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="amount"
                  fill={TOKEN_TEAL}
                  name={t('buyerInvoices.chart.amount')}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('buyerInvoices.aging.bucket')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('buyerInvoices.aging.count')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('buyerInvoices.aging.amount')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('buyerInvoices.aging.pctAp')}</TableHeaderCell>
                <TableHeaderCell>{t('buyerInvoices.aging.risk')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {AGING_DATA.map((row) => {
                  const total = AGING_DATA.reduce((a, b) => a + b.amount, 0);
                  const pct =
                    total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={row.bucket}>
                      <TableCell>
                        <span className="font-semibold text-text-primary">
                          {agingBucketLabel(row.bucket)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <Data
                          className={`font-semibold ${
                            row.amount > 0
                              ? 'text-text-primary'
                              : 'text-text-tertiary'
                          }`}
                        >
                          {row.amount > 0 ? `Rp ${row.amount}jT` : '—'}
                        </Data>
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        <Data>{row.amount > 0 ? `${pct}%` : '—'}</Data>
                      </TableCell>
                      <TableCell>
                        {row.amount > 0 && (
                          <StatusPill variant={row.risk}>
                            {row.riskLabel}
                          </StatusPill>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>

          <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
            <Database size={14} className="text-info shrink-0 mt-0.5" />
            <span>
              <strong className="text-info">{t('buyerInvoices.aging.phase2.label')}</strong>{' '}
              {t('buyerInvoices.aging.phase2.body')}
            </span>
          </div>
        </div>
      )}

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selected && (
            <>
              {panelMode === 'detail' && (
                <>
                  <Button variant="secondary" onClick={closePanel}>
                    {t('buyerInvoices.action.close')}
                  </Button>
                  {/* Dispute is offered exactly where the MACHINE says it is legal
                      (Submitted | Matched | Approved) — not where a display label
                      happened to list it. A past-due Approved invoice keeps it. */}
                  {invoiceActionsFor(selected.lifecycleState).some(
                    (a) => a.transitionId === 't_invoice_dispute',
                  ) &&
                    (availabilityOfVerb('t_invoice_dispute').kind === 'held' ? (
                      <Button variant="secondary" onClick={() => setPanelMode('disputing')}>
                        {t('buyerInvoices.action.dispute')}
                      </Button>
                    ) : (
                      <HandoffNotice
                        availability={availabilityOfVerb('t_invoice_dispute')}
                        testId="handoff-dispute"
                      />
                    ))}
                  {selected.lifecycleState === 'Releasing Payment' ? (
                    // AT THE SAP BOUNDARY. No verb is legal from the interim
                    // state; the footer accounts for the wait, or for the failure
                    // if this session saw one, and offers a retry only when the
                    // classified fault says a second ask can answer differently.
                    settleWatch[selected.id]?.fault ? (
                      SETTLE_FAULT_RETRYABLE[settleWatch[selected.id].fault!] ? (
                        <Button variant="outline" onClick={() => retrySettle(selected.id)}>
                          {t('buyerInvoices.action.retrySettle')}
                        </Button>
                      ) : (
                        <span className="text-xs text-danger self-center">
                          {t('buyerInvoices.settle.notRetryable')}
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-text-tertiary self-center">
                        {t('buyerInvoices.settle.inFlight')}
                      </span>
                    )
                  ) : footerVerbId && commitAvailability.kind !== 'held' ? (
                    // ⚠️ THE RESERVED COMMIT IS FINANCE'S. A procurement seat
                    // gets the WAIT in the primary slot — not a disabled button,
                    // and never an empty footer: the machine says a release is
                    // legal from this state, so the surface must say whose it is.
                    // (It used to render SOLID; §68 retired that register, and
                    // the ownership statement is untouched by the change.)
                    <HandoffNotice availability={commitAvailability} testId="handoff-commit" />
                  ) : (
                    <Button
                      variant="outline"
                      disabled={releaseMutation.isPending}
                      onClick={handleFooterAction}
                    >
                      {t(commitAction ? commitAction.labelKey : FOOTER_ACTION_KEY[selected.status])}
                    </Button>
                  )}
                </>
              )}
              {panelMode === 'confirming' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('detail')}
                  >
                    {t('buyerInvoices.action.cancel')}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={releaseMutation.isPending}
                    onClick={handleReleasePayment}
                  >
                    {t('buyerInvoices.action.confirmRelease', { amount: fmtCompact(selected.amount) })}
                  </Button>
                </>
              )}
              {panelMode === 'disputing' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPanelMode('detail');
                      setDisputeReason('');
                    }}
                  >
                    {t('buyerInvoices.action.cancel')}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={disputeMutation.isPending}
                    onClick={confirmDispute}
                  >
                    {t('buyerInvoices.action.raiseDispute')}
                  </Button>
                </>
              )}
              {panelMode === 'remittance' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('detail')}
                  >
                    {t('buyerInvoices.action.back')}
                  </Button>
                  <Button variant="outline" icon={Send} onClick={sendRemittance}>
                    {t('buyerInvoices.action.sendToSupplier')}
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerInvoices.section.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.supplier')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.supplierName}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.poReference')}</dt>
                  <Data as="dd" className="text-text-primary">
                    {selected.poNumber}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.amount')}</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {formatIDR(selected.amount)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.paymentTerms')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.paymentTerms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.dueDate')}</dt>
                  <Data
                    as="dd"
                    className={`font-medium ${
                      selected.status === 'Overdue'
                        ? 'text-danger'
                        : 'text-text-primary'
                    }`}
                  >
                    {formatDate(selected.dueDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.approver')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.approver}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.status')}</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selected.status]}>
                      {selected.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.channel')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.channel}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerInvoices.section.match')}
              </h3>
              <div
                className={`border-l-2 rounded px-3 py-3 text-sm ${
                  MATCH_VARIANT[selected.matchStatus] === 'success'
                    ? 'bg-success-soft border-success text-success'
                    : MATCH_VARIANT[selected.matchStatus] === 'danger'
                      ? 'bg-danger-soft border-danger text-danger'
                      : 'bg-bg-hover border-border-subtle text-text-secondary'
                }`}
              >
                <div className="font-semibold">
                  {(() => {
                    const k = statusLabelKey(selected.matchStatus);
                    return k ? t(k) : selected.matchStatus;
                  })()}
                </div>
                <div className="text-text-secondary mt-1">
                  {t(MATCH_DESC_KEY[selected.matchStatus])}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerInvoices.section.sapDocs')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.fiDocument')}</dt>
                  <Data
                    as="dd"
                    className={`${
                      selected.sapFiDoc ? 'text-success' : 'text-text-tertiary'
                    }`}
                  >
                    {selected.sapFiDoc ?? t('buyerInvoices.field.pending')}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.grDocument')}</dt>
                  <Data
                    as="dd"
                    className={`${
                      selected.sapGrDoc ? 'text-success' : 'text-text-tertiary'
                    }`}
                  >
                    {selected.sapGrDoc ?? t('buyerInvoices.field.pending')}
                  </Data>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('buyerInvoices.section.payment')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.bankAccount')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {selected.bankAccount}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('buyerInvoices.field.paymentDate')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selected.paymentDate)}
                  </Data>
                </div>
              </dl>
            </section>

            {panelMode === 'confirming' && (
              <section className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-warning-hover">
                <div className="font-semibold mb-1">{t('buyerInvoices.confirm.title')}</div>
                <div className="text-text-secondary">
                  {t('buyerInvoices.confirm.body.pre')}
                  <Data as="strong" className="text-text-primary">
                    {formatIDR(selected.amount)}
                  </Data>
                  {t('buyerInvoices.confirm.body.mid')}
                  <Data as="strong" className="text-text-primary">
                    {selected.bankAccount}
                  </Data>
                  {t('buyerInvoices.confirm.body.post')}
                </div>
                <div className="mt-2 pt-2 border-t border-warning/30 text-xs text-text-secondary">
                  {t('buyerInvoices.confirm.simulatedSettle')}
                </div>
              </section>
            )}

            {panelMode === 'disputing' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('buyerInvoices.section.raiseDispute')}
                </h3>
                <label htmlFor="dispute-reason" className="sr-only">
                  {t('buyerInvoices.dispute.srLabel', { invoiceNumber: selected.invoiceNumber })}
                </label>
                <textarea
                  id="dispute-reason"
                  className="w-full text-sm border border-border-subtle rounded-md px-3 py-2 bg-bg-surface text-text-primary"
                  rows={3}
                  placeholder={t('buyerInvoices.dispute.placeholder')}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                />
                <div className="mt-2 text-xs text-text-tertiary">
                  {t('buyerInvoices.dispute.note')}
                </div>
              </section>
            )}

            {panelMode === 'remittance' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('buyerInvoices.section.remittance')}
                </h3>
                <div className="border border-border-subtle rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        [t('buyerInvoices.remit.invoiceNo'), selected.invoiceNumber],
                        [t('buyerInvoices.field.poReference'), selected.poNumber],
                        [t('buyerInvoices.field.amount'), formatIDR(selected.amount)],
                        [t('buyerInvoices.field.paymentDate'), formatDate(selected.paymentDate)],
                        [t('buyerInvoices.field.bankAccount'), selected.bankAccount],
                      ].map(([label, value]) => (
                        <tr
                          key={label}
                          className="border-t border-border-subtle first:border-t-0"
                        >
                          <td className="px-3 py-2 text-text-tertiary uppercase tracking-wider font-semibold w-1/3">
                            {label}
                          </td>
                          <td className="px-3 py-2 font-semibold text-text-primary">
                            <Data>{value}</Data>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    icon={Download}
                    onClick={downloadPdf}
                  >
                    {t('buyerInvoices.remit.downloadPdf')}
                  </Button>
                </div>
                <div className="mt-3 bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-text-secondary">
                  {t('buyerInvoices.remit.note')}
                </div>
              </section>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

interface MatchTileProps {
  label: string;
  count: number;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

const MATCH_TILE_CLASS: Record<MatchTileProps['variant'], string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning-hover',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-bg-hover text-text-secondary',
};

const MatchTile: React.FC<MatchTileProps> = ({ label, count, variant }) => (
  <div
    className={`rounded-md px-4 py-4 text-center ${MATCH_TILE_CLASS[variant]}`}
  >
    <div className="text-label uppercase mb-2">{label}</div>
    <div className="text-kpi font-mono tabular-nums">{count}</div>
  </div>
);

// Query wrapper — resolves the scoped invoice list and renders the four honest
// states. The presentational view (which owns local mutable state seeded from
// the server list) only mounts once real data has resolved.
const BuyerInvoices: React.FC = () => {
  const { t } = useTranslation();
  const crumb = [t('buyerInvoices.crumb.transact'), t('buyerInvoices.crumb.invoices')];
  const invoicesQuery = useBuyerInvoices();
  if (invoicesQuery.isPending) return <LoadingState breadcrumb={crumb} />;
  if (invoicesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={invoicesQuery.error}
        onRetry={() => invoicesQuery.refetch()}
      />
    );
  if (invoicesQuery.data.items.length === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('buyerInvoices.empty.title')}
        subtitle={t('buyerInvoices.empty.subtitle')}
      />
    );
  return <BuyerInvoicesView invoices={invoicesQuery.data.items} />;
};

export default BuyerInvoices;
