import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
import { useQuotationSubmit } from '../services/query/commandHooks';
import { buildQuotationSubmitPayload } from './rfqs/quotationSubmitModel';
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
  quoteNumber: string;
  material: string;
  submittedDate: string;
  unitPrice: string;
  totalPrice: string;
  leadTime: string;
  validUntil: string;
  status: string;
}

// The supplier's OWN submitted quotations (Task 3b), joined to their RFQ for
// display. HONEST-BY-CONSTRUCTION (3b-C): own quote facts + status ONLY — NO
// score, NO competitive rank. A score/rank would need the sibling set (rival
// suppliers' quotes), which per-supplier scoping hides; surfacing it would be
// fabrication or a data leak. The BUYER sees scores (engine, at read, #78); the
// supplier sees its own facts. Replaces the retired SUBMITTED_QUOTE fixture.
const buildSubmittedQuotes = (
  quotations: Quotation[],
  rfqById: Map<string, RFQ>,
  t: TFunction,
): SubmittedQuote[] =>
  quotations.map((q) => {
    const rfq = rfqById.get(q.rfqId);
    return {
      rfqNumber: rfq?.rfqNumber ?? q.rfqId,
      quoteNumber: q.id,
      material: rfq?.title ?? '—',
      submittedDate: formatDate(q.submittedAt),
      unitPrice: formatIDR(q.unitPrice),
      totalPrice: formatIDR(q.totalPrice),
      leadTime: `${q.leadTimeDays} ${t('rfqs.unit.days')}`,
      validUntil: formatDate(q.validUntil),
      status: q.status,
    };
  });

interface AwardRow {
  rfqNumber: string;
  material: string;
  result: 'Awarded' | 'Not Awarded';
  awardDate: string;
  contractValue: string;
  poIssued: string;
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
      };
    });

type TabKey = 'open' | 'quotes' | 'history';

const EVAL_SEGMENTS: {
  key: keyof OpenRFQ['evaluationCriteria'];
  labelKey: string;
  color: string;
}[] = [
  // DP-2: single teal→navy ramp (chartPalette CHART_SERIES), not a rainbow.
  { key: 'price', labelKey: 'rfqs.eval.price', color: CHART_SERIES[0] },
  { key: 'quality', labelKey: 'rfqs.eval.quality', color: CHART_SERIES[1] },
  { key: 'leadTime', labelKey: 'rfqs.eval.leadTime', color: CHART_SERIES[2] },
  { key: 'sustainability', labelKey: 'rfqs.eval.sustainability', color: CHART_SERIES[3] },
  { key: 'risk', labelKey: 'rfqs.eval.risk', color: CHART_SERIES[4] },
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
}) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden mb-2">
        {EVAL_SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            style={{ width: `${criteria[seg.key]}%`, background: seg.color }}
            title={`${t(seg.labelKey)}: ${criteria[seg.key]}%`}
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
            {t(seg.labelKey)} {criteria[seg.key]}%
          </span>
        ))}
      </div>
    </div>
  );
};

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
  const { t } = useTranslation();
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
            ? t('rfqs.card.daysRemaining', { count: rfq.daysRemaining })
            : t('rfqs.card.daysToDeadline', { count: rfq.daysRemaining })}
        </StatusPill>
        <StatusPill variant="neutral">{t('rfqs.card.sampleDetail')}</StatusPill>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-tertiary">
          <Icon size={12} />
          {t('rfqs.card.via', { channel: rfq.receivedVia })}
        </span>
        <span className="text-xs text-text-tertiary">
          {t('rfqs.card.received', { date: rfq.receivedDate })}
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
            {t('rfqs.card.qty')}{' '}
            <strong className="text-text-primary">{rfq.qty}</strong>
          </span>
          <span>
            {t('rfqs.card.location')}{' '}
            <strong className="text-text-primary">
              {rfq.deliveryLocation}
            </strong>
          </span>
          <span>
            {t('rfqs.card.reqDelivery')}{' '}
            <strong className="text-text-primary">
              {rfq.requestedDelivery}
            </strong>
          </span>
          <span>
            {t('rfqs.card.deadline')}{' '}
            <strong className={urgent ? 'text-danger' : 'text-text-primary'}>
              {rfq.deadline}
            </strong>
          </span>
        </div>

        <div className="bg-bg-hover rounded-md px-3 py-2 mb-3">
          <div className="text-label text-text-tertiary uppercase mb-1">
            {t('rfqs.card.specialReqs')}
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
                  {t('rfqs.card.showLess')} <ChevronUp size={11} />
                </>
              ) : (
                <>
                  {t('rfqs.card.showMore')} <ChevronDown size={11} />
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-4">
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('rfqs.card.evalCriteria')}
          </div>
          <EvalBar criteria={rfq.evaluationCriteria} />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" onClick={() => onSubmitQuote(rfq)}>
            {t('rfqs.card.submitQuote')}
          </Button>
          <Button
            variant="secondary"
            icon={MessageSquare}
            onClick={() => onAskQuestion(rfq.rfqNumber)}
          >
            {t('rfqs.card.askQuestion')}
          </Button>
          <button
            type="button"
            onClick={() => onDecline(rfq.rfqNumber)}
            className="ml-auto text-xs text-danger hover:underline font-semibold"
          >
            {t('rfqs.card.decline')}
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
  const { t } = useTranslation();
  if (rfqs.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Inbox size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.open.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">
          {t('rfqs.open.emptyBody')}
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

const MyQuotesTab: React.FC<{ quotes: SubmittedQuote[] }> = ({ quotes }) => {
  const { t } = useTranslation();

  if (quotes.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Send size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('rfqs.quotes.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">
          {t('rfqs.quotes.emptyBody')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {quotes.map((q) => (
        <div
          key={q.quoteNumber}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">
                  {q.rfqNumber}
                </Data>
                <Data className="text-xs bg-bg-hover text-text-secondary rounded-full px-2 py-0.5 font-semibold">
                  {q.quoteNumber}
                </Data>
              </div>
              <div className="text-base font-semibold text-text-primary mt-1">
                {q.material}
              </div>
            </div>
            {/* Status only — a competitive score/rank needs the sibling set that
                per-supplier scoping hides (3b-C); the supplier never sees it. */}
            <StatusPill variant="neutral">{q.status}</StatusPill>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: t('rfqs.quotes.col.quoteNo'), value: q.quoteNumber },
              { label: t('rfqs.quotes.col.submitted'), value: q.submittedDate },
              { label: t('rfqs.quotes.col.unitPrice'), value: q.unitPrice },
              { label: t('rfqs.quotes.col.totalPrice'), value: q.totalPrice },
              { label: t('rfqs.quotes.col.leadTime'), value: q.leadTime },
              { label: t('rfqs.quotes.col.validUntil'), value: q.validUntil },
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
        </div>
      ))}
    </div>
  );
};

const AwardsTab: React.FC<{ rows: AwardRow[] }> = ({ rows }) => {
  const { t } = useTranslation();
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
          {t('rfqs.awards.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">
          {t('rfqs.awards.emptyBody')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('rfqs.awards.col.rfq')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.result')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.awardDate')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('rfqs.awards.col.contractValue')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.poIssued')}</TableHeaderCell>
            <TableHeaderCell>{t('rfqs.awards.col.notes')}</TableHeaderCell>
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
                  {t(row.result === 'Awarded' ? 'rfqs.awards.note.won' : 'rfqs.awards.note.lost')}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-5 py-4 flex items-center gap-5 flex-wrap">
        <div className="flex-1 min-w-[16rem]">
          <div className="text-sm text-text-primary mb-2">
            <strong>
              {t(total === 1 ? 'rfqs.awards.winRate.one' : 'rfqs.awards.winRate.other', {
                awarded,
                total,
                pct,
              })}
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
          <div className="text-xs text-text-tertiary">{t('rfqs.awards.winRateLabel')}</div>
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
  supplierId: string;
  initialRfqs: OpenRFQ[];
  quotations: Quotation[];
  rfqById: Map<string, RFQ>;
  awardRows: AwardRow[];
}

const RfqWorkspace: React.FC<RfqWorkspaceProps> = ({
  mySupplier,
  supplierId,
  initialRfqs,
  quotations,
  rfqById,
  awardRows,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const crumb = [t('rfqs.crumb.section'), t('rfqs.crumb.page')];
  const submitMutation = useQuotationSubmit();
  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const [quotePanelRFQ, setQuotePanelRFQ] = useState<OpenRFQ | null>(null);
  const [form, setForm] = useState<QuoteForm>(emptyQuoteForm);

  // The supplier's OWN submitted quotations (real read) drive My-Quotes AND prune
  // the open list — an RFQ this supplier has already quoted drops from "Open" (the
  // honest replacement for the retired local-state fake; after a real submit the
  // invalidated useQuotations re-read re-derives both). respondedSupplierIds on
  // the RFQ is NOT synced this batch (3b-D, registered finding) — the open-list
  // prune reads the supplier's own quotes, not the RFQ roster.
  const submittedQuotes = useMemo(
    () => buildSubmittedQuotes(quotations, rfqById, t),
    [quotations, rfqById, t],
  );
  const quotedRfqIds = useMemo(
    () => new Set(quotations.map((q) => q.rfqId)),
    [quotations],
  );
  const openRFQs = useMemo(
    () => initialRfqs.filter((r) => !quotedRfqIds.has(r.id)),
    [initialRfqs, quotedRfqIds],
  );

  const openCount = openRFQs.length;
  const submittedCount = submittedQuotes.length;
  const awaitingCount = 1;

  const handleSubmitQuote = (rfq: OpenRFQ) => {
    setQuotePanelRFQ(rfq);
    setForm(emptyQuoteForm);
  };

  const handleDecline = (rfqNumber: string) => {
    toast({
      variant: 'info',
      title: t('rfqs.toast.declined.title', { rfq: rfqNumber }),
      description: t('rfqs.toast.notified'),
    });
  };

  const handleAskQuestion = (rfqNumber: string) => {
    toast({
      title: t('rfqs.toast.question.title', { rfq: rfqNumber }),
      description: t('rfqs.toast.question.body'),
    });
  };

  const totalPrice = useMemo(() => {
    if (!quotePanelRFQ) return '—';
    const up = parseFloat(form.unitPrice.replace(/,/g, ''));
    const qty = parseFloat(quotePanelRFQ.qty.replace(/[^0-9]/g, ''));
    if (!isNaN(up) && !isNaN(qty)) return (up * qty).toLocaleString();
    return '—';
  }, [form.unitPrice, quotePanelRFQ]);

  // REAL submit — dispatches t_quotation_submit through the command spine (the
  // ONE supplier-owned creation verb). Persists RAW FACTS only; the engine scores
  // at read (#78). On a non-failed outcome the hook invalidates → the supplier's
  // quotations re-read, the quote lands in My-Quotes, and its RFQ leaves the open
  // list. Replaces the retired local-state masquerade.
  const submitQuote = async () => {
    if (!quotePanelRFQ) return;
    const missing: string[] = [];
    if (!form.unitPrice.trim() || !(parseFloat(form.unitPrice) > 0)) missing.push(t('rfqs.field.unitPrice'));
    if (!form.leadTimeNum.trim() || !(parseFloat(form.leadTimeNum) > 0)) missing.push(t('rfqs.field.leadTime'));
    if (!form.validUntil.trim()) missing.push(t('rfqs.field.validUntil'));
    if (missing.length > 0) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.missing.title'),
        description: t('rfqs.toast.missing.body', { fields: missing.join(', ') }),
      });
      return;
    }
    const payload = buildQuotationSubmitPayload({
      rfqId: quotePanelRFQ.id,
      supplierId,
      unitPrice: form.unitPrice,
      // The form offers days | weeks; the entity stores days.
      leadTimeDays:
        form.leadTimeUnit === 'weeks'
          ? String(Number(form.leadTimeNum) * 7)
          : form.leadTimeNum,
      validUntil: form.validUntil,
      notes: form.notes,
    });
    try {
      const res = await submitMutation.mutateAsync({ payload });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('rfqs.toast.submitFailed.title'),
          description: res.reason ?? t('rfqs.toast.submitFailed.body'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('rfqs.toast.submitted.title', { rfq: quotePanelRFQ.rfqNumber }),
        description: t('rfqs.toast.submitted.body', { date: quotePanelRFQ.deadline }),
      });
      setQuotePanelRFQ(null);
      setForm(emptyQuoteForm);
      setActiveTab('quotes');
    } catch {
      toast({
        variant: 'error',
        title: t('rfqs.toast.submitFailed.title'),
        description: t('rfqs.toast.submitFailed.body'),
      });
    }
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('rfqs.header.title')}
        subtitle={t('rfqs.header.subtitle', { supplier: mySupplier.name })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {openCount}{' '}
        {t(openCount !== 1 ? 'rfqs.meta.event.other' : 'rfqs.meta.event.one')} ·{' '}
        {submittedCount}{' '}
        {t(submittedCount !== 1 ? 'rfqs.meta.quote.other' : 'rfqs.meta.quote.one')}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <KpiCard
          eyebrow={t('rfqs.kpi.open.eyebrow')}
          value={openCount.toString()}
          subtitle={t('rfqs.kpi.open.subtitle')}
          icon={Inbox}
        />
        <KpiCard
          eyebrow={t('rfqs.kpi.submitted.eyebrow')}
          value={submittedCount.toString()}
          subtitle={t('rfqs.kpi.submitted.subtitle')}
          icon={Send}
        />
        <KpiCard
          eyebrow={t('rfqs.kpi.award.eyebrow')}
          value={awaitingCount.toString()}
          subtitle={<span className="text-warning-hover">{t('rfqs.kpi.award.subtitle')}</span>}
          icon={Trophy}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'open', label: t('rfqs.tab.open'), count: openCount },
          { id: 'quotes', label: t('rfqs.tab.quotes'), count: submittedCount },
          { id: 'history', label: t('rfqs.tab.history'), count: awardRows.length },
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
        <MyQuotesTab quotes={submittedQuotes} />
      )}
      {activeTab === 'history' && <AwardsTab rows={awardRows} />}

      <SidePanel
        open={quotePanelRFQ !== null}
        onClose={() => setQuotePanelRFQ(null)}
        title={
          quotePanelRFQ ? t('rfqs.panel.title', { rfq: quotePanelRFQ.rfqNumber }) : ''
        }
        footerActions={
          <>
            <Button
              variant="secondary"
              onClick={() => setQuotePanelRFQ(null)}
            >
              {t('rfqs.panel.cancel')}
            </Button>
            <Button
              variant="outline"
              icon={Send}
              disabled={submitMutation.isPending}
              onClick={submitQuote}
            >
              {submitMutation.isPending ? t('rfqs.panel.submitting') : t('rfqs.panel.submit')}
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
                  {t('rfqs.card.qty')}{' '}
                  <strong className="text-text-primary">
                    {quotePanelRFQ.qty}
                  </strong>
                </span>
                <span>
                  {t('rfqs.card.deadline')}{' '}
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
              eyebrow={t('rfqs.panel.step1.eyebrow')}
              title={t('rfqs.panel.step1.title')}
              description={t('rfqs.panel.step1.desc')}
            >
              <div>
                <label className={labelClass}>{t('rfqs.panel.unitPrice')}</label>
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
                  {t('rfqs.panel.totalPrice')}
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
              eyebrow={t('rfqs.panel.step2.eyebrow')}
              title={t('rfqs.panel.step2.title')}
              description={t('rfqs.panel.step2.desc')}
            >
              <div>
                <label className={labelClass}>{t('rfqs.panel.leadTime')}</label>
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
                    <option value="days">{t('rfqs.unit.days')}</option>
                    <option value="weeks">{t('rfqs.unit.weeks')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('rfqs.panel.validUntil')}</label>
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
                  {t('rfqs.panel.moq')}
                </label>
                <input
                  type="number"
                  placeholder={t('rfqs.panel.moqPlaceholder')}
                  value={form.moq}
                  onChange={(e) => setForm({ ...form, moq: e.target.value })}
                  className={inputClass}
                />
              </div>
            </FormSection>

            <FormSection
              eyebrow={t('rfqs.panel.step3.eyebrow')}
              title={t('rfqs.panel.step3.title')}
              description={t('rfqs.panel.step3.desc')}
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
                      <span className="text-text-tertiary">{t('rfqs.panel.onFile')}</span>
                    </div>
                  ),
                )}
              </div>
            </FormSection>

            <FormSection
              eyebrow={t('rfqs.panel.step4.eyebrow')}
              title={t('rfqs.panel.step4.title')}
              description={t('rfqs.panel.step4.desc')}
            >
              <div>
                <label className={labelClass}>{t('rfqs.panel.notes')}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={3}
                  placeholder={t('rfqs.panel.notesPlaceholder')}
                  className={`${inputClass} resize-y`}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('rfqs.panel.canSample')}
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
                      {v === 'yes' ? t('rfqs.panel.yes') : t('rfqs.panel.no')}
                    </button>
                  ))}
                </div>
                {form.canSample === 'yes' && (
                  <div className="mt-2">
                    <label className={labelClass}>{t('rfqs.panel.sampleLeadTime')}</label>
                    <input
                      type="text"
                      placeholder={t('rfqs.panel.sampleLeadPlaceholder')}
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
                  {t('rfqs.panel.pdf')}
                </label>
                <div className="border-2 border-dashed border-border-input rounded-md p-4 text-center text-xs text-text-tertiary bg-bg-hover">
                  <Upload size={20} className="text-teal mx-auto mb-1" />
                  {t('rfqs.panel.pdfDrop')}
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
  const { t } = useTranslation();
  const crumb = [t('rfqs.crumb.section'), t('rfqs.crumb.page')];
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
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || rfqsQuery.isError || quotationsQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
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
        breadcrumb={crumb}
        title={t('rfqs.empty.title')}
        subtitle={t('rfqs.empty.subtitle', { supplier: mySupplier.name })}
        message={t('rfqs.empty.message')}
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
      supplierId={supplierId}
      initialRfqs={initialRfqs}
      quotations={quotations}
      rfqById={rfqById}
      awardRows={awardRows}
    />
  );
};

export default SupplierRFQs;
