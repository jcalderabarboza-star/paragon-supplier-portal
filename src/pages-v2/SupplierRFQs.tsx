import React, { useMemo, useState } from 'react';
import {
  Inbox,
  Send,
  Trophy,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  MessageCircle,
  Globe,
  Upload,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import FormSection from '../components/ui-v2/FormSection';
import Data from '../components/ui-v2/Data';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import {
  useCurrentSupplier,
  useRFQs,
  useQuotations,
} from '../services/query/hooks';
import type { RFQ, Quotation, Supplier } from '../services/data/types';
import { CHART_SERIES } from '../lib/chartPalette';
import { formatIDR, formatDate } from '../lib/format';

interface OpenRFQ {
  id: string;
  rfqNumber: string;
  material: string;
  category: string;
  qty: string;
  deliveryLocation: string;
  requestedDelivery: string;
  deadline: string;
  daysRemaining: number;
  specialRequirements: string;
  evaluationCriteria: {
    price: number;
    quality: number;
    leadTime: number;
    sustainability: number;
    risk: number;
  };
  status: string;
  receivedVia: string;
  receivedDate: string;
}

interface SubmittedQuote {
  rfqNumber: string;
  quoteNumber?: string;
  material: string;
  submittedDate: string;
  unitPrice: string;
  totalPrice: string;
  leadTime: string;
  validUntil: string;
  status: string;
  score: number | null;
  rankPosition: string | null;
}

const SUBMITTED_QUOTE: SubmittedQuote = {
  rfqNumber: 'RFQ-2026-005',
  quoteNumber: 'QT-2026-0897',
  material: 'Folding Carton 150gsm Wardah',
  submittedDate: '2026-03-27',
  unitPrice: 'Rp 420/PCS',
  totalPrice: 'Rp 84jT',
  leadTime: '10 days',
  validUntil: '2026-04-27',
  status: 'Under Review',
  score: 92,
  rankPosition: '1 of 4 quotes',
};

interface AwardRow {
  rfqNumber: string;
  material: string;
  result: 'Awarded' | 'Not Awarded';
  awardDate: string;
  contractValue: string;
  poIssued: string;
  notes: string;
}

// Award outcome is a REAL read (batch iv): the supplier's own quotations that
// reached a terminal award decision (Awarded / Rejected via the RFQ-award
// cascade), joined to their RFQ for display. `poIssued` is honestly always '—' —
// award mints NO PO (PO issuance is a separate buyer verb, a future batch).
const buildAwardRows = (
  quotations: Quotation[],
  rfqById: Map<string, RFQ>,
): AwardRow[] =>
  quotations
    .filter((q) => q.status === 'Awarded' || q.status === 'Rejected')
    .map((q) => {
      const rfq = rfqById.get(q.rfqId);
      const won = q.status === 'Awarded';
      return {
        rfqNumber: rfq?.rfqNumber ?? q.rfqId,
        material: rfq?.title ?? '—',
        result: won ? 'Awarded' : 'Not Awarded',
        awardDate: rfq ? formatDate(rfq.awardDeadline) : '—',
        contractValue: won ? formatIDR(q.totalPrice) : '—',
        poIssued: '—',
        notes: won
          ? 'Awarded — your quotation was selected'
          : 'Not awarded — another quotation was selected',
      };
    });

type TabKey = 'open' | 'quotes' | 'history';

const EVAL_SEGMENTS: {
  key: keyof OpenRFQ['evaluationCriteria'];
  label: string;
  color: string;
}[] = [
  // DP-2: single teal→navy ramp (chartPalette CHART_SERIES), not a rainbow.
  { key: 'price', label: 'Price', color: CHART_SERIES[0] },
  { key: 'quality', label: 'Quality', color: CHART_SERIES[1] },
  { key: 'leadTime', label: 'Lead Time', color: CHART_SERIES[2] },
  { key: 'sustainability', label: 'Sustainability', color: CHART_SERIES[3] },
  { key: 'risk', label: 'Risk', color: CHART_SERIES[4] },
];

const CHANNEL_ICON: Record<string, LucideIcon> = {
  'Web Portal': Globe,
  Web: Globe,
  Email: Mail,
  WhatsApp: MessageCircle,
  API: Send,
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

const RFQS_CRUMB = ['ACQUIRE', 'MY RFQS & QUOTES'];

interface QuoteForm {
  unitPrice: string;
  currency: string;
  leadTimeNum: string;
  leadTimeUnit: string;
  validUntil: string;
  moq: string;
  notes: string;
  canSample: 'yes' | 'no';
  sampleLeadTime: string;
}

const emptyQuoteForm: QuoteForm = {
  unitPrice: '',
  currency: 'IDR',
  leadTimeNum: '',
  leadTimeUnit: 'days',
  validUntil: '',
  moq: '',
  notes: '',
  canSample: 'yes',
  sampleLeadTime: '',
};

const EvalBar: React.FC<{ criteria: OpenRFQ['evaluationCriteria'] }> = ({
  criteria,
}) => (
  <div>
    <div className="flex h-2 rounded-full overflow-hidden mb-2">
      {EVAL_SEGMENTS.map((seg) => (
        <div
          key={seg.key}
          style={{ width: `${criteria[seg.key]}%`, background: seg.color }}
          title={`${seg.label}: ${criteria[seg.key]}%`}
        />
      ))}
    </div>
    <div className="flex flex-wrap gap-3">
      {EVAL_SEGMENTS.map((seg) => (
        <span
          key={seg.key}
          className="inline-flex items-center gap-1.5 text-[10px] text-text-tertiary"
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: seg.color }}
          />
          {seg.label} {criteria[seg.key]}%
        </span>
      ))}
    </div>
  </div>
);

interface RFQCardProps {
  rfq: OpenRFQ;
  onSubmitQuote: (rfq: OpenRFQ) => void;
  onDecline: (rfqNumber: string) => void;
  onAskQuestion: (rfqNumber: string) => void;
}

const RFQCard: React.FC<RFQCardProps> = ({
  rfq,
  onSubmitQuote,
  onDecline,
  onAskQuestion,
}) => {
  const [expanded, setExpanded] = useState(false);
  const urgent = rfq.daysRemaining <= 7;
  const Icon = CHANNEL_ICON[rfq.receivedVia] ?? Inbox;
  const accentClass = urgent ? 'border-l-warning' : 'border-l-teal';
  const showLongReqs = rfq.specialRequirements.length > 80;

  return (
    <div
      className={`bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4 border-l-2 ${accentClass} overflow-hidden`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle flex-wrap">
        <Data className="text-sm font-bold text-text-primary">
          {rfq.rfqNumber}
        </Data>
        <StatusPill variant={urgent ? 'warning' : 'info'}>
          {urgent
            ? `${rfq.daysRemaining} days remaining`
            : `${rfq.daysRemaining} days to deadline`}
        </StatusPill>
        <StatusPill variant="neutral">Sample detail</StatusPill>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-tertiary">
          <Icon size={12} />
          via {rfq.receivedVia}
        </span>
        <span className="text-xs text-text-tertiary">
          Received {rfq.receivedDate}
        </span>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="text-base font-bold text-text-primary">
            {rfq.material}
          </span>
          <StatusPill variant="info">{rfq.category}</StatusPill>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-tertiary mb-3">
          <span>
            Qty:{' '}
            <strong className="text-text-primary">{rfq.qty}</strong>
          </span>
          <span>
            Location:{' '}
            <strong className="text-text-primary">
              {rfq.deliveryLocation}
            </strong>
          </span>
          <span>
            Req. Delivery:{' '}
            <strong className="text-text-primary">
              {rfq.requestedDelivery}
            </strong>
          </span>
          <span>
            Deadline:{' '}
            <strong className={urgent ? 'text-danger' : 'text-text-primary'}>
              {rfq.deadline}
            </strong>
          </span>
        </div>

        <div className="bg-bg-hover rounded-md px-3 py-2 mb-3">
          <div className="text-label text-text-tertiary uppercase mb-1">
            Special requirements
          </div>
          <div className="text-xs text-text-secondary leading-relaxed">
            {expanded || !showLongReqs
              ? rfq.specialRequirements
              : rfq.specialRequirements.slice(0, 80) + '…'}
          </div>
          {showLongReqs && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-semibold text-teal hover:text-teal-hover inline-flex items-center gap-1"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp size={11} />
                </>
              ) : (
                <>
                  Show more <ChevronDown size={11} />
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="text-label text-text-tertiary uppercase mb-2">
            Evaluation criteria
          </div>
          <EvalBar criteria={rfq.evaluationCriteria} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => onSubmitQuote(rfq)}>
            Submit quote
          </Button>
          <Button
            variant="secondary"
            icon={MessageSquare}
            onClick={() => onAskQuestion(rfq.rfqNumber)}
          >
            Ask question
          </Button>
          <button
            type="button"
            onClick={() => onDecline(rfq.rfqNumber)}
            className="ml-auto text-xs text-danger hover:underline font-semibold"
          >
            Decline RFQ
          </button>
        </div>
      </div>
    </div>
  );
};

const OpenRFQsTab: React.FC<{
  rfqs: OpenRFQ[];
  onSubmitQuote: (rfq: OpenRFQ) => void;
  onDecline: (rfqNumber: string) => void;
  onAskQuestion: (rfqNumber: string) => void;
}> = ({ rfqs, onSubmitQuote, onDecline, onAskQuestion }) => {
  if (rfqs.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Inbox size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          No open RFQs at this time
        </div>
        <div className="text-sm text-text-tertiary">
          New RFQs from Paragon will appear here.
        </div>
      </div>
    );
  }
  return (
    <div>
      {rfqs.map((rfq) => (
        <RFQCard
          key={rfq.id}
          rfq={rfq}
          onSubmitQuote={onSubmitQuote}
          onDecline={onDecline}
          onAskQuestion={onAskQuestion}
        />
      ))}
    </div>
  );
};

const MyQuotesTab: React.FC<{
  extra: string[];
  onWithdraw: (rfqNumber: string) => void;
}> = ({ extra, onWithdraw }) => {
  const today = new Date().toISOString().slice(0, 10);
  const allQuotes: SubmittedQuote[] = [
    SUBMITTED_QUOTE,
    ...extra.map((num) => ({
      rfqNumber: num,
      material: 'Recently submitted quote',
      submittedDate: today,
      unitPrice: '—',
      totalPrice: '—',
      leadTime: '—',
      validUntil: '—',
      status: 'Under Review',
      score: null,
      rankPosition: null,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <StatusPill variant="neutral">Sample data</StatusPill>
        Quote detail (score, rank, line items) is illustrative pending the
        supplier quotation read.
      </div>
      {allQuotes.map((q, i) => (
        <div
          key={i}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">
                  {q.rfqNumber}
                </Data>
                {q.quoteNumber && (
                  <Data className="text-xs bg-bg-hover text-text-secondary rounded-full px-2 py-0.5 font-semibold">
                    {q.quoteNumber}
                  </Data>
                )}
              </div>
              <div className="text-base font-semibold text-text-primary mt-1">
                {q.material}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusPill variant="neutral">{q.status}</StatusPill>
              {q.score !== null && (
                <StatusPill variant="success">{q.score}/100</StatusPill>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            {[
              { label: 'Quote #', value: q.quoteNumber ?? 'Auto-assigned' },
              { label: 'Submitted', value: q.submittedDate },
              { label: 'Unit price', value: q.unitPrice },
              { label: 'Total price', value: q.totalPrice },
              { label: 'Lead time', value: q.leadTime },
              { label: 'Valid until', value: q.validUntil },
            ].map((d) => (
              <div key={d.label} className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">
                  {d.label}
                </dt>
                <Data as="dd" className="text-sm font-semibold text-text-primary">
                  {d.value}
                </Data>
              </div>
            ))}
          </dl>

          {q.rankPosition && (
            <div className="bg-success-soft border-l-2 border-success rounded px-3 py-2 mb-3 text-sm font-semibold text-success">
              <Trophy size={14} className="inline-block mr-1.5" />
              Ranked {q.rankPosition} received
            </div>
          )}

          <div className="mb-3">
            <div className="text-label text-text-tertiary uppercase mb-2">
              Compliance documents submitted with this quote
            </div>
            <div className="flex flex-wrap gap-2">
              {['Halal Certificate', 'BPOM Registration', 'ISO 9001'].map((d) => (
                <StatusPill key={d} variant="success">
                  ✓ {d}
                </StatusPill>
              ))}
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => onWithdraw(q.rfqNumber)}
          >
            Withdraw quote
          </Button>
        </div>
      ))}
    </div>
  );
};

const AwardsTab: React.FC<{ rows: AwardRow[] }> = ({ rows }) => {
  const awarded = rows.filter((r) => r.result === 'Awarded').length;
  const total = rows.length;
  const pct = total > 0 ? Math.round((awarded / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Trophy size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          No award decisions yet
        </div>
        <div className="text-sm text-text-tertiary">
          Award outcomes appear here once Paragon awards an RFQ you quoted on.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>RFQ #</TableHeaderCell>
            <TableHeaderCell>Material</TableHeaderCell>
            <TableHeaderCell>Result</TableHeaderCell>
            <TableHeaderCell>Award date</TableHeaderCell>
            <TableHeaderCell className="text-right">Contract value</TableHeaderCell>
            <TableHeaderCell>PO issued</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
          </TableHeader>
          <tbody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Data className="text-xs font-bold text-text-primary">
                    {row.rfqNumber}
                  </Data>
                </TableCell>
                <TableCell className="text-text-primary">
                  {row.material}
                </TableCell>
                <TableCell>
                  <StatusPill
                    variant={row.result === 'Awarded' ? 'success' : 'neutral'}
                  >
                    {row.result === 'Awarded' ? '✓ ' : '✗ '}
                    {row.result}
                  </StatusPill>
                </TableCell>
                <TableCell className="text-text-tertiary text-sm whitespace-nowrap">
                  <Data>{row.awardDate}</Data>
                </TableCell>
                <TableCell
                  className={`text-right font-semibold whitespace-nowrap ${
                    row.contractValue !== '—'
                      ? 'text-success'
                      : 'text-text-tertiary'
                  }`}
                >
                  <Data>{row.contractValue}</Data>
                </TableCell>
                <TableCell
                  className={`text-xs ${
                    row.poIssued !== '—' ? 'text-info' : 'text-text-tertiary'
                  }`}
                >
                  <Data>{row.poIssued}</Data>
                </TableCell>
                <TableCell className="text-xs text-text-secondary max-w-[16rem]">
                  {row.notes}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-5 py-4 flex items-center gap-5 flex-wrap">
        <div className="flex-1 min-w-[16rem]">
          <div className="text-sm text-text-primary mb-2">
            Your win rate:{' '}
            <strong>
              {awarded} of {total} decided RFQ{total === 1 ? '' : 's'} awarded ({pct}%)
            </strong>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="text-center shrink-0">
          <div className="text-kpi font-mono tabular-nums text-success">{pct}%</div>
          <div className="text-xs text-text-tertiary">Win rate</div>
        </div>
      </div>
    </div>
  );
};

const SAMPLE_EVAL: OpenRFQ['evaluationCriteria'] = {
  price: 40,
  quality: 25,
  leadTime: 15,
  sustainability: 10,
  risk: 10,
};

// Adapter: canonical RFQ → the page's OpenRFQ display shape. Real fields come
// from the read (number, material, category, qty, deadline, received date);
// the supplier-facing detail the RFQ entity does NOT carry — evaluation weights,
// special requirements, delivery location, received-via — is illustrative
// sample, flagged with a "Sample detail" pill per card (partial migration).
const RFQ_TODAY_MS = new Date('2026-04-25').getTime();

const toOpenRfq = (r: RFQ): OpenRFQ => {
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(r.responseDeadline).getTime() - RFQ_TODAY_MS) / 86_400_000,
    ),
  );
  return {
    id: r.id,
    rfqNumber: r.rfqNumber,
    material: r.title,
    category: r.materialCategory,
    qty: `${r.totalQty.toLocaleString()} ${r.uom}`,
    deliveryLocation: 'NDC Jatake 6',
    requestedDelivery: r.awardDeadline,
    deadline: r.responseDeadline,
    daysRemaining,
    specialRequirements:
      'Full RFQ specifics arrive with the Paragon sourcing packet (illustrative sample).',
    evaluationCriteria: SAMPLE_EVAL,
    status: r.status === 'Open' ? 'Open — Awaiting Your Quote' : r.status,
    receivedVia: 'Web Portal',
    receivedDate: r.createdAt,
  };
};

interface RfqWorkspaceProps {
  mySupplier: Supplier;
  initialRfqs: OpenRFQ[];
  quoteCount: number;
  awardRows: AwardRow[];
}

const RfqWorkspace: React.FC<RfqWorkspaceProps> = ({
  mySupplier,
  initialRfqs,
  quoteCount,
  awardRows,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const [openRFQs, setOpenRFQs] = useState<OpenRFQ[]>(initialRfqs);
  const [quotePanelRFQ, setQuotePanelRFQ] = useState<OpenRFQ | null>(null);
  const [submittedNums, setSubmittedNums] = useState<string[]>([]);
  const [form, setForm] = useState<QuoteForm>(emptyQuoteForm);
  const [submitting, setSubmitting] = useState(false);

  const openCount = openRFQs.length;
  const submittedCount = quoteCount + submittedNums.length;
  const awaitingCount = 1;

  const handleSubmitQuote = (rfq: OpenRFQ) => {
    setQuotePanelRFQ(rfq);
    setForm(emptyQuoteForm);
    setSubmitting(false);
  };

  const handleDecline = (rfqNumber: string) => {
    toast({
      variant: 'info',
      title: `RFQ ${rfqNumber} declined`,
      description: 'Paragon team has been notified.',
    });
  };

  const handleAskQuestion = (rfqNumber: string) => {
    toast({
      title: `Message sent for ${rfqNumber}`,
      description: 'Paragon procurement team will respond via Web Portal.',
    });
  };

  const handleWithdraw = (rfqNumber: string) => {
    toast({
      variant: 'info',
      title: `Withdrawal request sent for ${rfqNumber}`,
      description: 'Paragon team has been notified.',
    });
  };

  const totalPrice = useMemo(() => {
    if (!quotePanelRFQ) return '—';
    const up = parseFloat(form.unitPrice.replace(/,/g, ''));
    const qty = parseFloat(quotePanelRFQ.qty.replace(/[^0-9]/g, ''));
    if (!isNaN(up) && !isNaN(qty)) return (up * qty).toLocaleString();
    return '—';
  }, [form.unitPrice, quotePanelRFQ]);

  const submitQuote = () => {
    if (!quotePanelRFQ) return;
    const missing: string[] = [];
    if (!form.unitPrice.trim() || !(parseFloat(form.unitPrice) > 0)) missing.push('Unit price');
    if (!form.leadTimeNum.trim() || !(parseFloat(form.leadTimeNum) > 0)) missing.push('Lead time');
    if (!form.validUntil.trim()) missing.push('Quote valid until');
    if (missing.length > 0) {
      toast({
        variant: 'error',
        title: 'Required fields missing',
        description: `Please fill: ${missing.join(', ')}.`,
      });
      return;
    }
    setSubmitting(true);
    toast({
      variant: 'success',
      title: `Quotation submitted for ${quotePanelRFQ.rfqNumber}`,
      description: `Paragon procurement team will review by ${quotePanelRFQ.deadline}.`,
    });
    setTimeout(() => {
      const rfq = quotePanelRFQ;
      setSubmittedNums((prev) => [...prev, rfq.rfqNumber]);
      setOpenRFQs((prev) => prev.filter((r) => r.id !== rfq.id));
      setQuotePanelRFQ(null);
      setSubmitting(false);
      setActiveTab('quotes');
    }, 600);
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={RFQS_CRUMB}
        title="My Sourcing Events"
        subtitle={`RFQs received from Paragon Corp procurement team — ${mySupplier.name}.`}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {openCount} open event{openCount !== 1 ? 's' : ''} · {submittedCount}{' '}
        quote{submittedCount !== 1 ? 's' : ''} pending evaluation
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <KpiCard
          eyebrow="Open Events"
          value={openCount.toString()}
          subtitle="Awaiting your quotation"
          icon={Inbox}
        />
        <KpiCard
          eyebrow="Quotes Submitted"
          value={submittedCount.toString()}
          subtitle="Pending evaluation"
          icon={Send}
        />
        <KpiCard
          eyebrow="Awaiting Award"
          value={awaitingCount.toString()}
          subtitle={<span className="text-warning">Decision pending</span>}
          icon={Trophy}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'open', label: 'Open events', count: openCount },
          { id: 'quotes', label: 'My responses', count: submittedCount },
          { id: 'history', label: 'Awards & history', count: awardRows.length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {activeTab === 'open' && (
        <OpenRFQsTab
          rfqs={openRFQs}
          onSubmitQuote={handleSubmitQuote}
          onDecline={handleDecline}
          onAskQuestion={handleAskQuestion}
        />
      )}
      {activeTab === 'quotes' && (
        <MyQuotesTab extra={submittedNums} onWithdraw={handleWithdraw} />
      )}
      {activeTab === 'history' && <AwardsTab rows={awardRows} />}

      <SidePanel
        open={quotePanelRFQ !== null}
        onClose={() => setQuotePanelRFQ(null)}
        title={
          quotePanelRFQ ? `Submit quotation — ${quotePanelRFQ.rfqNumber}` : ''
        }
        footerActions={
          <>
            <Button
              variant="secondary"
              onClick={() => setQuotePanelRFQ(null)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              icon={Send}
              disabled={submitting}
              onClick={submitQuote}
            >
              {submitting ? 'Submitting…' : 'Submit quotation'}
            </Button>
          </>
        }
      >
        {quotePanelRFQ && (
          <div className="space-y-5">
            <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
              <div className="text-sm font-semibold text-text-primary">
                {quotePanelRFQ.material}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
                <span>
                  Qty:{' '}
                  <strong className="text-text-primary">
                    {quotePanelRFQ.qty}
                  </strong>
                </span>
                <span>
                  Deadline:{' '}
                  <strong
                    className={
                      quotePanelRFQ.daysRemaining <= 7
                        ? 'text-danger'
                        : 'text-text-primary'
                    }
                  >
                    {quotePanelRFQ.deadline}
                  </strong>
                </span>
              </div>
            </section>

            <FormSection
              eyebrow="Step 1"
              title="Pricing"
              description="Unit price drives total. Currency defaults to IDR."
            >
              <div>
                <label className={labelClass}>Unit price *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={form.unitPrice}
                    onChange={(e) =>
                      setForm({ ...form, unitPrice: e.target.value })
                    }
                    className={inputClass}
                  />
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                    className={inputClass}
                    style={{ width: 100 }}
                  >
                    <option>IDR</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Total price (auto-calculated)
                </label>
                <div
                  className={`px-3 py-2 bg-bg-hover border border-border-subtle rounded-md text-sm font-semibold ${
                    totalPrice === '—' ? 'text-text-tertiary' : 'text-text-primary'
                  }`}
                >
                  {totalPrice === '—' ? '—' : `${form.currency} ${totalPrice}`}
                </div>
              </div>
            </FormSection>

            <FormSection
              eyebrow="Step 2"
              title="Timing & quantity"
              description="Lead time and validity window."
            >
              <div>
                <label className={labelClass}>Lead time *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    value={form.leadTimeNum}
                    onChange={(e) =>
                      setForm({ ...form, leadTimeNum: e.target.value })
                    }
                    className={inputClass}
                  />
                  <select
                    value={form.leadTimeUnit}
                    onChange={(e) =>
                      setForm({ ...form, leadTimeUnit: e.target.value })
                    }
                    className={inputClass}
                    style={{ width: 100 }}
                  >
                    <option>days</option>
                    <option>weeks</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Quote valid until *</label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={(e) =>
                    setForm({ ...form, validUntil: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Minimum order quantity (optional)
                </label>
                <input
                  type="number"
                  placeholder="Leave blank if same as RFQ qty"
                  value={form.moq}
                  onChange={(e) => setForm({ ...form, moq: e.target.value })}
                  className={inputClass}
                />
              </div>
            </FormSection>

            <FormSection
              eyebrow="Step 3"
              title="Compliance documents"
              description="Documents already on file will be submitted with this quote."
            >
              <div className="bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-text-secondary flex flex-col gap-1">
                {['Halal Certificate', 'ISO 9001', 'BPOM Registration'].map(
                  (d) => (
                    <div
                      key={d}
                      className="inline-flex items-center gap-2"
                    >
                      <span className="text-success font-bold">✓</span>
                      <span className="font-semibold text-text-primary">
                        {d}
                      </span>
                      <span className="text-text-tertiary">— On file</span>
                    </div>
                  ),
                )}
              </div>
            </FormSection>

            <FormSection
              eyebrow="Step 4"
              title="Notes & samples"
              description="Optional context and sample availability."
            >
              <div>
                <label className={labelClass}>Comments / notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Add any notes, conditions, or alternative options for Paragon procurement team…"
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Can provide sample batch?
                </label>
                <div className="flex gap-2">
                  {(['yes', 'no'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, canSample: v })}
                      className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition-colors ${
                        form.canSample === v
                          ? 'bg-action-soft border-action text-action-hover'
                          : 'bg-bg-surface border-border-input text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                {form.canSample === 'yes' && (
                  <div className="mt-2">
                    <label className={labelClass}>Sample lead time</label>
                    <input
                      type="text"
                      placeholder="e.g. 5 days"
                      value={form.sampleLeadTime}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sampleLeadTime: e.target.value,
                        })
                      }
                      className={inputClass}
                      style={{ width: 200 }}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  Quotation PDF (optional)
                </label>
                <div className="border-2 border-dashed border-border-input rounded-md p-4 text-center text-xs text-text-tertiary bg-bg-hover">
                  <Upload size={20} className="text-teal mx-auto mb-1" />
                  Click to attach quotation PDF or drag &amp; drop
                </div>
              </div>
            </FormSection>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

// Wrapper: reads the supplier + invited RFQs + quotations through the scoped
// hooks and renders the four honest states; the workspace inner holds the local
// (Phase-2′, non-persisting) quote-submission state seeded from the mapped read.
// Partial migration (ruling B): the open-RFQ list + counts are wired; the RFQ
// entity's missing supplier-facing detail is sampled and pilled per card, and
// the quote/award tabs stay illustrative (pilled).
const SupplierRFQs: React.FC = () => {
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const rfqsQuery = useRFQs();
  const quotationsQuery = useQuotations();

  if (!supplierId) return <NoSupplierIdentity />;
  if (
    supplierQuery.isPending ||
    rfqsQuery.isPending ||
    quotationsQuery.isPending
  )
    return <LoadingState breadcrumb={RFQS_CRUMB} />;
  if (supplierQuery.isError || rfqsQuery.isError || quotationsQuery.isError)
    return (
      <ErrorState
        breadcrumb={RFQS_CRUMB}
        error={
          supplierQuery.error ?? rfqsQuery.error ?? quotationsQuery.error
        }
        onRetry={() => {
          supplierQuery.refetch();
          rfqsQuery.refetch();
          quotationsQuery.refetch();
        }}
      />
    );

  const mySupplier = supplierQuery.data ?? null;
  if (!mySupplier) return <NoSupplierIdentity />;

  const rfqs = rfqsQuery.data?.items ?? [];
  const quotations = quotationsQuery.data?.items ?? [];
  const quoteCount = quotations.length;
  if (rfqs.length === 0 && quoteCount === 0)
    return (
      <EmptyState
        breadcrumb={RFQS_CRUMB}
        title="No sourcing events yet"
        subtitle={`No RFQ invitations on file for ${mySupplier.name}.`}
        message="RFQ invitations from Paragon Corp appear here."
      />
    );

  const initialRfqs = rfqs
    .filter((r) => r.status === 'Open')
    .map(toOpenRfq);

  // Award outcome is a real read: the supplier's terminal quotations joined to
  // their RFQ. Awarding an RFQ (buyer) flips this supplier's quote to Awarded /
  // Rejected via the cascade, so this re-derives after the buyer's award.
  const rfqById = new Map(rfqs.map((r) => [r.id, r]));
  const awardRows = buildAwardRows(quotations, rfqById);

  return (
    <RfqWorkspace
      mySupplier={mySupplier}
      initialRfqs={initialRfqs}
      quoteCount={quoteCount}
      awardRows={awardRows}
    />
  );
};

export default SupplierRFQs;
