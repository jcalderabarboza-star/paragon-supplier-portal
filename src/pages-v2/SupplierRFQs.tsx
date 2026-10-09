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
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
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
  useDocuments,
  useRFQs,
  useQuotations,
} from '../services/query/hooks';
import { useQuotationSubmit, useStageResponseSubmit } from '../services/query/commandHooks';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import {
  buildQuotationSubmitPayload,
  isCurrencyRefusal,
} from './rfqs/quotationSubmitModel';
import { readBidPrice, type PriceRefusalReason } from './rfqs/quotationPrice';
import {
  BASE_CURRENCY,
  BID_CURRENCIES,
  isBidCurrency,
  type BidCurrency,
} from '../lib/currencyPolicy';
import {
  readLeadTimeDays,
  type LeadTimeRefusalReason,
  type LeadTimeUnit,
} from './rfqs/quotationLeadTime';
import { readMoq, type MoqRefusalReason } from './rfqs/quotationMoq';
import { daysUntil } from '../services/data/dayProjection';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';
import {
  responseDeadlinePassed,
  validityAlreadyPast,
} from '../services/data/quotationSubmitGate';
import {
  documentDisplayState,
  DISPLAY_STATE_LABEL_KEY,
  DISPLAY_STATE_TONE,
} from '../services/data/documentDisplayState';
import { POLICY_HOOKS } from '../services/transitions/policyHooks';
import { refusedByPolicy } from '../services/transitions/refusalMessage';
import type { SupplierDocumentCategory } from '../services/data/types';
import type { RFQ, Quotation, Supplier } from '../services/data/types';
import { formatDate, formatMoney, formatNumber } from '../lib/format';
import { useRefusalText } from '../hooks/useRefusalText';
import { notShortlistedAdvanceOf, stageOf, stagePathOf, type RfqStage } from '../data/rfqStage';
import StageTimeline from './sourcing/StageTimeline';
import RfiAnswerForm from './rfqs/RfiAnswerForm';
import RfpProposalForm from './rfqs/RfpProposalForm';
import { criterionLabel } from '../data/rfpEvaluation';
import { answerText, interestRefusalKey, yesNoWords } from './rfqs/rfiAnswerModel';
import { questionLabel } from '../data/rfiQuestionnaire';

// SRC-2 — THE PAGE READS THE DECLARED PRESENT, as `BuyerSourcing` does. It read
// the wall clock while the buyer's board read `DECLARED_PRESENT`, so one
// deadline gave two day-counts depending on who was looking; and the submit
// verb now refuses a quotation after the deadline AT the declared present, so a
// card that counted from any other instant would promise days the machine does
// not give.
const TODAY = DECLARED_PRESENT;

// SRC-2 — the documents a quotation's reader cares about. The step listed three
// hard-coded names, "on file", for every supplier, whatever it actually held.
const QUOTE_CERTIFICATE_CATEGORIES: readonly SupplierDocumentCategory[] = [
  'Halal Compliance',
  'BPOM Regulatory',
  'Quality',
];

/**
 * SRC-2 — the four submit refusals in the supplier's own words. Keyed on the
 * HOOK (`refusedByPolicy`), never on the text inside its reason: the machine's
 * sentence names ids and is for the audit trail.
 */
function quoteRefusalKey(reason: string | undefined): string | null {
  if (refusedByPolicy(reason, POLICY_HOOKS.QUOTATION_SUBMIT_EVENT_OPEN)) {
    return 'rfqs.refusal.eventNotOpen';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.QUOTATION_SUBMIT_BEFORE_DEADLINE)) {
    return 'rfqs.refusal.deadlinePassed';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.QUOTATION_SUBMIT_ONE_PER_SUPPLIER)) {
    return 'rfqs.refusal.alreadySubmitted';
  }
  if (refusedByPolicy(reason, POLICY_HOOKS.QUOTATION_SUBMIT_VALIDITY_CURRENT)) {
    return 'rfqs.refusal.validityPast';
  }
  // RFx-1 — a quotation offered to an event that is still at RFI or RFP.
  if (refusedByPolicy(reason, POLICY_HOOKS.QUOTATION_SUBMIT_AT_RFQ_STAGE)) {
    return 'rfqs.refusal.stageNotRfq';
  }
  return null;
}

// RFx-2 — the stage response's refusals moved to `rfqs/rfiAnswerModel.ts`
// (`interestRefusalKey`): the answer form reads the same map this page does.

interface OpenRFQ {
  id: string;
  rfqNumber: string;
  material: string;
  category: string;
  /** The RFQ quantity formatted for display ("200,000 PCS"). Presentation only. */
  qty: string;
  /** The same quantity as a number — what the total-price preview multiplies. */
  totalQty: number;
  deliveryLocation: string;
  /** E2E-1 — the event's own requested delivery date; absent = none stated. */
  requestedDelivery?: string;
  deadline: string;
  daysRemaining: number;
  /** SRC-2 — the response deadline has gone; the event takes no quotation. */
  deadlinePassed: boolean;
  /** RFx-1 — the stage the event is at. At RFI and RFP the answer is interest. */
  stage: RfqStage;
  /** RFx-1 — the event itself, for the stage timeline. */
  event: RFQ;
  /** RFx-1 — the day this supplier answered the CURRENT stage, if it has. */
  interestRecordedAt?: string;
  /** RFx-1 — the payment terms the buyer asked for; the quote form starts from them. */
  paymentTerms: string;
  specialRequirements: string;
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
  /** The stated minimum order quantity, or the "same as RFQ qty" default (2e-b-2). */
  moq: string;
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
      // COS-05, CLOSED (2e-c-2). These were unconditional `formatIDR`, so a
      // supplier who quoted USD 2.85 read their own bid back as "Rp 3" — the
      // platform overruling the currency the supplier had just chosen. Latent
      // until now only because `identitySources` seeds sup-007 alone; it goes
      // live the moment a foreign supplier has a persona, and this batch is what
      // makes foreign bids storable in the first place.
      //
      // A supplier must read their bid back in the SAME format the buyer scores
      // it in — one ruling, both surfaces — so this is the shared `formatMoney`,
      // not a second currency-aware formatter living on the supplier side.
      unitPrice: formatMoney(q.unitPrice, q.currency ?? BASE_CURRENCY),
      totalPrice: formatMoney(q.totalPrice, q.currency ?? BASE_CURRENCY),
      // 2e-b-3 (COS-07) — the day count goes through i18n's plural selection
      // like every other counted noun on this page (`rfqs.meta.event.*`), and
      // through `formatNumber` like every other quantity. It was raw string
      // interpolation: "1 days" in EN, and an ungrouped number for a lead time
      // long enough to need grouping. The buyer side already reads this axis
      // through a count form; the supplier's own record of the same quote did not.
      leadTime: t(
        q.leadTimeDays === 1
          ? 'rfqs.quotes.leadTimeDays.one'
          : 'rfqs.quotes.leadTimeDays.other',
        { count: q.leadTimeDays, days: formatNumber(q.leadTimeDays) },
      ),
      // 2e-b-2 — the minimum the supplier stated, read back to them. An ABSENT
      // minimum renders the default it means ("same as RFQ qty"), never a 0 and
      // never a dash: the supplier said something, and it was "no minimum".
      moq:
        q.moq === undefined
          ? t('rfqs.quotes.moqNone')
          : `${formatNumber(q.moq)} ${rfq?.uom ?? ''}`.trim(),
      validUntil: formatDate(q.validUntil),
      status: q.status,
    };
  });

interface AwardRow {
  rfqNumber: string;
  material: string;
  result: 'Awarded' | 'Not Awarded' | 'Event Cancelled' | 'No Award';
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
    // SRC-1 — a quotation `Withdrawn` with a cancelled event is history too,
    // and it is NOT a lost decision: nobody compared it with anything.
    .filter((q) => q.status === 'Awarded' || q.status === 'Rejected' || q.status === 'Withdrawn')
    .map((q) => {
      const rfq = rfqById.get(q.rfqId);
      const won = q.status === 'Awarded';
      return {
        rfqNumber: rfq?.rfqNumber ?? q.rfqId,
        material: rfq?.title ?? '—',
        // RFx-1 — a quotation is withdrawn when its event is cancelled AND
        // when it is concluded with no award. The event says which.
        result: won
          ? 'Awarded'
          : q.status !== 'Withdrawn'
            ? 'Not Awarded'
            : rfq?.status === 'Concluded'
              ? 'No Award'
              : 'Event Cancelled',
        // SRC-1 — the day the award was made, never the deadline it was due by.
        awardDate: rfq?.awardedAt ? formatDate(rfq.awardedAt) : '—',
        // COS-05, same leg: an awarded foreign quote's contract value is stated
        // in the currency it was awarded in. Rupiah here would misprice the
        // award itself, which is the row a supplier is most likely to act on.
        contractValue: won ? formatMoney(q.totalPrice, q.currency ?? BASE_CURRENCY) : '—',
        poIssued: '—',
      };
    });

type TabKey = 'open' | 'quotes' | 'history';

const CHANNEL_ICON: Record<string, LucideIcon> = {
  'Web Portal': Globe,
  Web: Globe,
  Email: Mail,
  WhatsApp: MessageCircle,
  API: Send,
};

// CP-0 · W1 · 2e-a — each bid-price refusal names its own rule. A supplier who
// typed something unreadable, a supplier who typed nothing, and a supplier who
// typed 0 have made three different mistakes and need three different answers.
const PRICE_REFUSAL_KEY: Record<PriceRefusalReason, string> = {
  EMPTY_QTY: 'rfqs.panel.price.refused.empty',
  NOT_NUMERIC: 'rfqs.panel.price.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.price.refused.ambiguous',
  ZERO_PRICE: 'rfqs.panel.price.refused.zero',
};

// CP-0 · W1 · 2e-b-1a — the lead-time refusals. `EMPTY_QTY` is BACK: a blank is
// a refusal again, because a bid with no delivery promise is incomplete.
const LEAD_TIME_REFUSAL_KEY: Record<LeadTimeRefusalReason, string> = {
  EMPTY_QTY: 'rfqs.panel.leadTime.refused.empty',
  NOT_NUMERIC: 'rfqs.panel.leadTime.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.leadTime.refused.ambiguous',
  FRACTIONAL_DAYS: 'rfqs.panel.leadTime.refused.fractional',
};

// CP-0 · W1 · 2e-b-2 — the minimum-order-quantity refusals. There is no
// `EMPTY_QTY` entry because the type has no such member: a blank is this field's
// documented default ("same as RFQ qty"), so it is answered, not refused.
const MOQ_REFUSAL_KEY: Record<MoqRefusalReason, string> = {
  NOT_NUMERIC: 'rfqs.panel.moq.refused.notNumeric',
  AMBIGUOUS_QTY: 'rfqs.panel.moq.refused.ambiguous',
  ZERO_MOQ: 'rfqs.panel.moq.refused.zero',
};

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface QuoteForm {
  unitPrice: string;
  // 2e-c-1 — narrowed from `string`. It was wider than the three options the
  // select actually renders, so the type permitted currencies the UI never
  // offered and the entity could never hold. It is now the same `BidCurrency`
  // the options are generated from and the Quotation field is typed as: one
  // list, one type, three places that cannot disagree.
  currency: BidCurrency;
  leadTimeNum: string;
  // The unit is half of what the typed lead-time number means, so the parse
  // boundary takes it as a closed type rather than free text.
  leadTimeUnit: LeadTimeUnit;
  /** The same-day (0-day) acknowledgement — see `requiresSameDayAck`. */
  sameDayAck: boolean;
  validUntil: string;
  /** RFx-1 — the payment terms the supplier offers. Starts as the buyer's. */
  paymentTerms: string;
  moq: string;
  notes: string;
  canSample: 'yes' | 'no';
  sampleLeadTime: string;
  /** SRC-2 — the NAME of the attached quotation document; '' when none. */
  attachmentName: string;
}

const emptyQuoteForm: QuoteForm = {
  unitPrice: '',
  currency: BASE_CURRENCY,
  leadTimeNum: '',
  leadTimeUnit: 'days',
  sameDayAck: false,
  validUntil: '',
  paymentTerms: '',
  moq: '',
  notes: '',
  canSample: 'yes',
  sampleLeadTime: '',
  attachmentName: '',
};

interface RFQCardProps {
  rfq: OpenRFQ;
  onSubmitQuote: (rfq: OpenRFQ) => void;
  onRecordInterest: (rfq: OpenRFQ, note: string) => Promise<boolean>;
  onDecline: (rfqNumber: string) => void;
  onAskQuestion: (rfqNumber: string) => void;
}

const RFQCard: React.FC<RFQCardProps> = ({
  rfq,
  onSubmitQuote,
  onRecordInterest,
  onDecline,
  onAskQuestion,
}) => {
  const { t } = useTranslation();
  const quoteAvailability = useVerbAvailability('quotation:submit');
  // RFx-1 — at RFI and RFP the answer is interest and a note, its own verb.
  const interestAvailability = useVerbAvailability('stageresponse:submit');
  const takesInterest = rfq.stage !== 'RFQ';
  // RFx-2 — AT AN RFI THAT ASKS A QUESTIONNAIRE the answer is the answers to
  // it, and the note form below gives way to the answer form. The questions
  // are the event's own; an RFP, and an RFI that asks none, read as at RFx-1.
  const { identity } = useCurrentIdentity();
  const questions = rfq.stage === 'RFI' ? (rfq.event.questionnaire ?? []) : [];
  const asksQuestionnaire = questions.length > 0;
  const draft = rfq.event.myStageDraft;
  const submitted = (rfq.event.stageResponses ?? []).find((a) => a.stage === rfq.stage);
  const submittedAnswers = submitted?.answers;
  // RFx-3 — AT AN RFP THAT SETS CRITERIA the answer is a proposal against them,
  // on the same footing: its own form, a draft, a submit. An RFP that sets
  // none reads as at RFx-1.
  const criteria = rfq.stage === 'RFP' ? (rfq.event.criteria ?? []) : [];
  const asksProposal = criteria.length > 0;
  // E2E-1 — what the card LISTS is whatever criteria the read carries: the ones
  // the buyer set, at any stage the read hands them over. Nothing else.
  const shownCriteria = rfq.event.criteria ?? [];
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestNote, setInterestNote] = useState('');
  const [interestSending, setInterestSending] = useState(false);
  // The form is gated on the atom, not only the button that opens it: a seat
  // narrowed while it stands open loses it (`ENTRANCE-IS-THE-UNIT-01`).
  const interestFormShown =
    takesInterest &&
    interestOpen &&
    interestAvailability.kind === 'held' &&
    rfq.interestRecordedAt === undefined &&
    !rfq.deadlinePassed;
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
        {rfq.deadlinePassed ? (
          <StatusPill variant="danger">{t('rfqs.card.deadlinePassed')}</StatusPill>
        ) : (
          <StatusPill variant={urgent ? 'warning' : 'info'}>
            {urgent
              ? t('rfqs.card.daysRemaining', { count: rfq.daysRemaining })
              : t('rfqs.card.daysToDeadline', { count: rfq.daysRemaining })}
          </StatusPill>
        )}
        {/* RFx-1 — only on an event that has stages; a plain RFQ reads as before. */}
        {stagePathOf(rfq.event).length > 1 && (
          <StatusPill variant="neutral">{t('rfqs.card.stage', { stage: rfq.stage })}</StatusPill>
        )}
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
            <strong className="text-text-primary" data-testid={`rfq-req-delivery-${rfq.id}`}>
              {rfq.requestedDelivery ?? t('rfqs.card.reqDeliveryNone')}
            </strong>
          </span>
          <span>
            {t('rfqs.card.deadline')}{' '}
            <strong className={urgent ? 'text-critical' : 'text-text-primary'}>
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
              className="mt-1 text-xs font-semibold text-teal-text hover:text-teal-hover inline-flex items-center gap-1"
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
          {/* RFx-3 — the event's OWN criteria and weights where it sets them.
              E2E-1 — and where it sets none the card says so: the sample bar
              that stood here listed five weights nobody had set. */}
          {shownCriteria.length > 0 ? (
            <ol className="space-y-1" data-testid={`rfp-own-criteria-${rfq.id}`}>
              {shownCriteria.map((c, i) => (
                <li key={c.id} className="text-xs text-text-secondary flex items-baseline gap-2">
                  <span className="font-mono">{criterionLabel(i + 1)}</span>
                  <span className="flex-1 text-text-primary">
                    {c.name}
                    {c.group ? (
                      <span className="text-text-tertiary"> · {t(`rfqs.rfp.group.${c.group}`)}</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-data-navy">{formatNumber(c.weight)}%</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-text-tertiary" data-testid={`rfq-no-criteria-${rfq.id}`}>
              {t('rfqs.card.evalCriteriaNone')}
            </p>
          )}
        </div>

        {stagePathOf(rfq.event).length > 1 && (
          <div className="mb-4">
            <div className="text-label text-text-tertiary uppercase mb-2">{t('rfqs.card.stages')}</div>
            <StageTimeline event={rfq.event} testId={`rfq-stage-timeline-${rfq.id}`} />
          </div>
        )}
        {/* RFx-1 — WHAT THIS STAGE ASKS FOR, SAID HONESTLY: interest and a note.
            The questionnaire and the proposal are not built yet. */}
        {takesInterest && (
          <p className="text-xs text-text-tertiary mb-3" data-testid={`rfq-stage-content-note-${rfq.id}`}>
            {asksQuestionnaire
              ? t(
                  questions.length === 1
                    ? 'rfqs.interest.contentNote.questionnaire.one'
                    : 'rfqs.interest.contentNote.questionnaire.other',
                  { count: questions.length },
                )
              : asksProposal
                ? t(
                    criteria.length === 1
                      ? 'rfqs.interest.contentNote.proposal.one'
                      : 'rfqs.interest.contentNote.proposal.other',
                    { count: criteria.length },
                  )
                : t(rfq.stage === 'RFI' ? 'rfqs.interest.contentNote.rfi' : 'rfqs.interest.contentNote.rfp')}
          </p>
        )}
        {/* RFx-3 — said before the supplier writes anything: what it will and
            will not be shown. */}
        {asksProposal && (
          <p className="text-xs text-text-tertiary mb-3" data-testid={`rfp-scores-note-${rfq.id}`}>
            {t('rfqs.rfp.scoresNote')}
          </p>
        )}
        {/* RFx-3 — the supplier's own submitted proposal, read back. */}
        {asksProposal && rfq.interestRecordedAt !== undefined && (
          <div className="mb-3" data-testid={`rfp-own-proposal-${rfq.id}`}>
            <ol className="space-y-1">
              {criteria.map((c, i) => (
                <li key={c.id} className="text-xs text-text-secondary">
                  <span className="font-mono mr-1.5">{criterionLabel(i + 1)}</span>
                  {c.name}{' '}
                  <span className="text-text-primary font-semibold whitespace-pre-wrap">
                    {submitted?.proposal?.[c.id] ?? t('rfqs.rfp.notAnswered')}
                  </span>
                </li>
              ))}
            </ol>
            {(submitted?.documents ?? []).length > 0 && (
              <div className="text-xs text-text-secondary mt-1">
                {t('rfqs.rfp.documents.named')}{' '}
                <span className="font-mono text-text-primary">{(submitted?.documents ?? []).join(', ')}</span>
              </div>
            )}
          </div>
        )}
        {/* RFx-2 — the supplier's own submitted answers, read back. */}
        {asksQuestionnaire && rfq.interestRecordedAt !== undefined && (
          <ol className="mb-3 space-y-1" data-testid={`rfi-own-answers-${rfq.id}`}>
            {questions.map((q, i) => (
              <li key={q.id} className="text-xs text-text-secondary">
                <span className="font-mono mr-1.5">{questionLabel(i + 1)}</span>
                {q.prompt}{' '}
                <span className="text-text-primary font-semibold">
                  {answerText(q, submittedAnswers?.[q.id], yesNoWords(t)) ?? t('rfqs.rfi.notAnswered')}
                </span>
              </li>
            ))}
          </ol>
        )}
        {interestFormShown && asksQuestionnaire && (
          <RfiAnswerForm
            rfq={rfq.event}
            supplierId={identity.supplierId ?? ''}
            onClose={() => setInterestOpen(false)}
          />
        )}
        {interestFormShown && asksProposal && (
          <RfpProposalForm
            rfq={rfq.event}
            supplierId={identity.supplierId ?? ''}
            onClose={() => setInterestOpen(false)}
          />
        )}
        {interestFormShown && !asksQuestionnaire && !asksProposal && (
          <div
            className="border border-border-subtle bg-bg-hover rounded-md p-3 mb-3"
            data-testid={`rfq-interest-form-${rfq.id}`}
          >
            <label className={labelClass} htmlFor={`rfq-interest-note-${rfq.id}`}>
              {t('rfqs.interest.note')}
            </label>
            <textarea
              id={`rfq-interest-note-${rfq.id}`}
              rows={2}
              value={interestNote}
              onChange={(e) => setInterestNote(e.target.value)}
              className={`${inputClass} h-auto py-2`}
              data-testid={`rfq-interest-note-${rfq.id}`}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant="outline"
                icon={Send}
                disabled={interestSending}
                onClick={async () => {
                  setInterestSending(true);
                  const ok = await onRecordInterest(rfq, interestNote);
                  setInterestSending(false);
                  if (ok) setInterestOpen(false);
                }}
                data-testid={`rfq-interest-yes-${rfq.id}`}
              >
                {t('rfqs.interest.confirm', { stage: rfq.stage })}
              </Button>
              <Button variant="secondary" onClick={() => setInterestOpen(false)}>
                {t('rfqs.panel.cancel')}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {/* ⚠️ `quotation:submit` IS COMMERCIAL'S. A fulfilment or back-office
              seat reads the wait with the lane named, in the slot the button
              occupied — the ENTRY into the quote panel, so the panel's own
              commit stays unreachable behind one statement rather than two.
              Asking a question is UNGOVERNED and stays live beside it: a lane
              that cannot quote can still talk to procurement. */}
          {/* SRC-2 — AN EVENT PAST ITS RESPONSE DEADLINE OFFERS NO WAY IN, for any
              seat. The machine refuses the quotation (`QUOTE_DEADLINE_PASSED`);
              the card says so in the slot the button occupied rather than
              letting a supplier fill a form to be told at the end. It comes
              before the lane notice: "awaiting Supplier Commercial" on an event
              nobody can answer would send the wrong person looking. */}
          {rfq.deadlinePassed ? (
            <span
              data-testid="rfq-deadline-passed"
              className="text-xs text-critical font-semibold"
            >
              {t('rfqs.card.deadlinePassed.note', { date: formatDate(rfq.deadline) })}
            </span>
          ) : takesInterest ? (
            // RFx-1 — the RFI / RFP slot: answered, or the way in, or the lane
            // that holds the verb. Never the quote button: the machine refuses
            // a quotation at these stages (`QUOTE_STAGE_NOT_RFQ`).
            rfq.interestRecordedAt !== undefined ? (
              <span
                className="text-xs text-success font-semibold"
                data-testid={`rfq-interest-recorded-${rfq.id}`}
              >
                {t(
                  asksQuestionnaire
                    ? 'rfqs.rfi.submittedOn'
                    : asksProposal
                      ? 'rfqs.rfp.submittedOn'
                      : 'rfqs.interest.recorded',
                  {
                    stage: rfq.stage,
                    date: formatDate(rfq.interestRecordedAt),
                  },
                )}
              </span>
            ) : interestAvailability.kind === 'held' ? (
              <>
                <Button
                  variant="outline"
                  disabled={interestOpen}
                  onClick={() => setInterestOpen(true)}
                  data-testid={`rfq-interest-open-${rfq.id}`}
                >
                  {t(
                    asksProposal
                      ? draft
                        ? 'rfqs.rfp.continue'
                        : 'rfqs.rfp.open'
                      : !asksQuestionnaire
                        ? 'rfqs.interest.open'
                        : draft
                          ? 'rfqs.rfi.continue'
                          : 'rfqs.rfi.open',
                  )}
                </Button>
                {/* RFx-2 — a saved draft is the supplier's own. Said here so
                    nobody takes "saved" to mean "sent". */}
                {(asksQuestionnaire || asksProposal) && draft && (
                  <span className="text-xs text-text-tertiary" data-testid={`rfi-draft-saved-${rfq.id}`}>
                    {t('rfqs.rfi.draftSaved', { date: formatDate(draft.respondedAt) })}
                  </span>
                )}
              </>
            ) : (
              <HandoffNotice
                availability={interestAvailability}
                testId="handoff-stageresponse-submit"
              />
            )
          ) : quoteAvailability.kind === 'held' ? (
            <Button variant="outline" onClick={() => onSubmitQuote(rfq)}>
              {t('rfqs.card.submitQuote')}
            </Button>
          ) : (
            <HandoffNotice
              availability={quoteAvailability}
              testId="handoff-quotation-submit"
            />
          )}
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
            className="ml-auto text-xs text-critical hover:underline font-semibold"
          >
            {t('rfqs.card.decline')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * RFx-1 — AN EVENT THIS SUPPLIER WAS NOT CARRIED FORWARD ON. It says which
 * stage ended for it, on what day, and the reason the buyer gave — the buyer's
 * words, unedited. No action: the event is not open to this supplier any more.
 * Who WAS carried is not this supplier's to read, and the read does not send it.
 */
const NotShortlistedCard: React.FC<{ rfq: RFQ; supplierId: string }> = ({ rfq, supplierId }) => {
  const { t } = useTranslation();
  const advance = notShortlistedAdvanceOf(rfq, supplierId);
  if (advance === null) return null;
  return (
    <div
      className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm mb-4 border-l-2 border-l-border-subtle overflow-hidden"
      data-testid={`rfq-not-shortlisted-${rfq.id}`}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle flex-wrap">
        <Data className="text-sm font-bold text-text-primary">{rfq.rfqNumber}</Data>
        <StatusPill variant="neutral">{t('rfqs.notShortlisted.pill')}</StatusPill>
      </div>
      <div className="px-4 py-4">
        <div className="text-base font-bold text-text-primary mb-2">{rfq.title}</div>
        <p className="text-sm text-text-secondary mb-1">
          {t('rfqs.notShortlisted.line', { from: advance.from, to: advance.to })}{' '}
          <Data>{formatDate(advance.advancedAt)}</Data>
        </p>
        <p className="text-sm text-text-primary mb-3" data-testid={`rfq-not-shortlisted-reason-${rfq.id}`}>
          <span className="text-text-tertiary">{t('rfqs.notShortlisted.reasonLabel')}</span>{' '}
          {advance.reason ?? t('rfqs.notShortlisted.noReason')}
        </p>
        <StageTimeline event={rfq} testId={`rfq-stage-timeline-${rfq.id}`} />
      </div>
    </div>
  );
};

const OpenRFQsTab: React.FC<{
  rfqs: OpenRFQ[];
  notShortlisted: RFQ[];
  onSubmitQuote: (rfq: OpenRFQ) => void;
  onRecordInterest: (rfq: OpenRFQ, note: string) => Promise<boolean>;
  onDecline: (rfqNumber: string) => void;
  onAskQuestion: (rfqNumber: string) => void;
}> = ({ rfqs, notShortlisted, onSubmitQuote, onRecordInterest, onDecline, onAskQuestion }) => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const supplierId = identity.supplierId ?? '';
  if (rfqs.length === 0 && notShortlisted.length === 0) {
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
          onRecordInterest={onRecordInterest}
          onDecline={onDecline}
          onAskQuestion={onAskQuestion}
        />
      ))}
      {notShortlisted.map((rfq) => (
        <NotShortlistedCard key={rfq.id} rfq={rfq} supplierId={supplierId} />
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

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {[
              { label: t('rfqs.quotes.col.quoteNo'), value: q.quoteNumber },
              { label: t('rfqs.quotes.col.submitted'), value: q.submittedDate },
              { label: t('rfqs.quotes.col.unitPrice'), value: q.unitPrice },
              { label: t('rfqs.quotes.col.totalPrice'), value: q.totalPrice },
              { label: t('rfqs.quotes.col.leadTime'), value: q.leadTime },
              // 2e-b-2 — the minimum order quantity appears here for the first
              // time. It was collected on the form and dropped before this card
              // existed, so the supplier's own record of their quote silently
              // omitted a term they had stated.
              { label: t('rfqs.quotes.col.moq'), value: q.moq },
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
  // SRC-1 — the win rate is over DECIDED events. A cancelled event decided
  // nothing, so it is listed below and counted in neither half.
  const total = rows.filter((r) => r.result !== 'Event Cancelled').length;
  const pct = total > 0 ? Math.round((awarded / total) * 100) : 0;

  if (rows.length === 0) {
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
                  {t(
                    row.result === 'Awarded'
                      ? 'rfqs.awards.note.won'
                      : row.result === 'Event Cancelled'
                        ? 'rfqs.awards.note.cancelled'
                        : 'rfqs.awards.note.lost',
                  )}
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

// Adapter: canonical RFQ → the page's OpenRFQ display shape. Real fields come
// from the read (number, material, category, qty, deadline, received date);
// the supplier-facing detail the RFQ entity does NOT carry — evaluation weights,
// special requirements, delivery location, received-via — is illustrative
// sample, flagged with a "Sample detail" pill per card (partial migration).
// ⚠️ `RFQ_TODAY_MS = new Date('2026-04-25')` IS DELETED. It was the SECOND pin
// in this app and it disagreed with `BuyerSourcing`'s by 23 days, so the same
// RFQ deadline produced two different day-counts depending on which persona was
// looking. `now` is injected from the component and the arithmetic lives in
// `services/data/dayProjection`.
//
// SRC-2 — THE CLAMP NO LONGER SPEAKS FOR A PAST DEADLINE. `Math.max(0, …)` made
// a deadline 111 days gone read "0 days remaining", which is *due today*. A
// deadline that has passed is now its own fact (`deadlinePassed`) and the card
// says it in words; the clamp is left only as the floor of a count that is
// never shown for such an event.
const toOpenRfq = (r: RFQ, nowIso: string): OpenRFQ => {
  const daysRemaining = Math.max(0, daysUntil(r.responseDeadline, nowIso) ?? 0);
  const deadlinePassed = responseDeadlinePassed(r.responseDeadline, nowIso);
  return {
    id: r.id,
    rfqNumber: r.rfqNumber,
    material: r.title,
    category: r.materialCategory,
    // 2e-b-3 (COS-02) — `formatNumber` (pinned id-ID), not bare
    // `toLocaleString()`, whose grouping followed the RUNTIME locale. The same
    // card rendered this quantity one way and the minimum order quantity
    // another (`formatNumber`, 40 lines below), so two quantities side by side
    // could disagree about what a thousands separator looks like.
    qty: `${formatNumber(r.totalQty)} ${r.uom}`,
    // The quantity as the NUMBER it is, carried alongside its display form so
    // the total-price preview never has to parse `qty` back out of its own
    // formatting (CP-0 2e-a).
    totalQty: r.totalQty,
    deliveryLocation: 'NDC Jatake 6',
    // E2E-1 — the event's delivery date and nothing else. It used to be the
    // award deadline, which is the day the buyer decides, not the day goods land.
    ...(r.requestedDeliveryDate ? { requestedDelivery: r.requestedDeliveryDate } : {}),
    deadline: r.responseDeadline,
    daysRemaining,
    deadlinePassed,
    stage: stageOf(r),
    event: r,
    // The read carries this supplier's own answers only (`rfqSupplierView`).
    interestRecordedAt: (r.stageResponses ?? []).find((a) => a.stage === stageOf(r))?.respondedAt,
    paymentTerms: r.paymentTerms,
    specialRequirements:
      'Full RFQ specifics arrive with the Paragon sourcing packet (illustrative sample).',
    status: r.status === 'Open' ? 'Open — Awaiting Your Quote' : r.status,
    receivedVia: 'Web Portal',
    receivedDate: r.createdAt,
  };
};

interface RfqWorkspaceProps {
  mySupplier: Supplier;
  supplierId: string;
  initialRfqs: OpenRFQ[];
  /** RFx-1 — events an advance left this supplier off. */
  notShortlisted: RFQ[];
  quotations: Quotation[];
  rfqById: Map<string, RFQ>;
  awardRows: AwardRow[];
}

const RfqWorkspace: React.FC<RfqWorkspaceProps> = ({
  mySupplier,
  supplierId,
  initialRfqs,
  notShortlisted,
  quotations,
  rfqById,
  awardRows,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const crumb = [t('rfqs.crumb.page')];
  const submitMutation = useQuotationSubmit();
  const [activeTab, setActiveTab] = useState<TabKey>('open');
  const quoteAvailability = useVerbAvailability('quotation:submit');
  const [quotePanelRFQ, setQuotePanelRFQ] = useState<OpenRFQ | null>(null);
  // ⚠️ **THE PANEL IS DERIVED, NOT READ — `SupplierOrders.effectivePanelMode`'s
  // CONSTRUCTION, NOT A SECOND ONE.** `quotation:submit` is COMMERCIAL's, and
  // the entrance is correctly guarded: `RFQCard` renders the handoff notice in
  // the button's own slot for a seat that does not hold it. But the OPEN panel
  // is component state in THIS component, and component state outlives the
  // seat — a seat narrowed WHILE the panel stands open kept a live `submitQuote`
  // behind a door that was already shut. Reachable, not a dead branch, and
  // `SupplierShipments` states the same reason for gating its wizard TAB rather
  // than the button that opens it.
  //
  // Collapsing to `null` answers every entrance in ONE statement and keeps §76
  // intact: the seat lands back on the card, where the notice for this verb
  // ALREADY IS, rather than meeting a second one inside the panel. `open=`, the
  // title, the body and `submitQuote`'s own early return all read the derived
  // value, so there is no door left that reads the raw one. The raw state is
  // left alone rather than cleared: a seat that is widened again finds its
  // panel where it left it, which is `effectivePanelMode`'s behaviour too.
  const effectiveQuotePanelRFQ =
    quoteAvailability.kind === 'held' ? quotePanelRFQ : null;
  const [form, setForm] = useState<QuoteForm>(emptyQuoteForm);
  // SRC-2 — the supplier's OWN documents (the read is scoped to this seat), for
  // the quote form's certificate step. A failed read does not stop a quotation:
  // nothing in the payload depends on it.
  const docsQuery = useDocuments();
  const certificateDocs = useMemo(
    () =>
      (docsQuery.data?.items ?? []).filter((d) =>
        QUOTE_CERTIFICATE_CATEGORIES.includes(d.category),
      ),
    [docsQuery.data],
  );

  // The supplier's OWN submitted quotations (real read) drive My-Quotes AND prune
  // the open list — an RFQ this supplier has already quoted drops from "Open" (the
  // honest replacement for the retired local-state fake; after a real submit the
  // invalidated useQuotations re-read re-derives both). The open-list prune
  // reads the supplier's own quotes; the RFQ's `respondedSupplierIds` is derived
  // from the same quotations at read (SRC-1), so the two cannot disagree.
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

  // RFx-1 — an RFI or RFP this supplier has already answered stays on the
  // list (there is no quotation to move it to "My Quotes"), but it no longer
  // counts as waiting for an answer.
  const openCount = openRFQs.filter((r) => r.interestRecordedAt === undefined).length;
  const submittedCount = submittedQuotes.length;
  // 2e-b-3 (COS-03) — DERIVED, not a literal. This was `= 1`: a hardcoded
  // number rendered as a live KPI reading "Awaiting Award · Decision pending".
  // It is display-only — nothing is stored, ranked or dispatched from it — but a
  // fabricated figure on a KPI tile is the same honesty class as a fabricated
  // score, just cheaper: it told every supplier the same thing regardless of
  // what they had actually submitted, including a supplier with none.
  //
  // The honest reading is the supplier's own quotations that have been submitted
  // and NOT yet decided. `Awarded` / `Rejected` are the terminal states (the
  // pair `buildAwardRows` reads), so awaiting = the other two, filtered
  // explicitly rather than by subtraction — a subtraction would silently absorb
  // any future status that belongs in neither bucket.
  const awaitingCount = useMemo(
    () =>
      quotations.filter(
        (q) => q.status === 'Submitted' || q.status === 'Under Review',
      ).length,
    [quotations],
  );

  const handleSubmitQuote = (rfq: OpenRFQ) => {
    setQuotePanelRFQ(rfq);
    // RFx-1 — the payment terms start as the ones the buyer asked for: the
    // field was never on this form, so every quotation made here reached the
    // comparison with a blank Payment Terms cell.
    setForm({ ...emptyQuoteForm, paymentTerms: rfq.paymentTerms });
  };

  // RFx-1 — record interest at an RFI or RFP stage (fires
  // t_stageresponse_submit). The stage is the event's own; the payload names
  // the event and this supplier, and carries the note if one was typed.
  const interestMutation = useStageResponseSubmit();
  const handleRecordInterest = async (rfq: OpenRFQ, note: string): Promise<boolean> => {
    try {
      const res = await interestMutation.mutateAsync({
        payload: { rfqId: rfq.id, supplierId, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      if (res.status === 'failed') {
        const key = interestRefusalKey(res.reason);
        toast({
          variant: 'error',
          title: t('rfqs.toast.interestFailed.title'),
          description: key
            ? t(key)
            : (refusalText(res.reason) ?? res.reason ?? t('rfqs.toast.interestFailed.default')),
        });
        return false;
      }
      toast({
        variant: 'success',
        title: t('rfqs.toast.interestRecorded.title', { rfq: rfq.rfqNumber }),
        description: t('rfqs.toast.interestRecorded.body', { stage: rfq.stage }),
      });
      return true;
    } catch {
      toast({
        variant: 'error',
        title: t('rfqs.toast.interestFailed.title'),
        description: t('rfqs.toast.interestFailed.default'),
      });
      return false;
    }
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

  // ── CP-0 · W1 · 2e-a — the ONE read of the bid price ──────────────────────
  // The total preview, the submit gate, and the dispatched payload ALL read this
  // one result. Before, each re-read `form.unitPrice` with its own recipe, so the
  // number the supplier was shown, the number the gate approved, and the number
  // the award engine ranked could be three different numbers.
  const bidPrice = readBidPrice(form.unitPrice);

  // CP-0 · W1 · 2e-b-1 — the ONE read of the lead time. Four states, and the
  // hard gate: a stated 0 is legal and BEST on the axis, so it may not reach the
  // payload until the supplier affirms they meant same-day. Blank owes nothing.
  const leadTime = readLeadTimeDays(form.leadTimeNum, form.leadTimeUnit);
  const sameDayAckOwed = leadTime.ok && leadTime.requiresSameDayAck && !form.sameDayAck;

  // CP-0 · W1 · 2e-b-2 — the ONE read of the minimum order quantity. Blank is
  // LEGAL and resolves to an absence; only a stated-but-unreadable minimum
  // blocks, because a constraint nobody can read is worse than the default it
  // would otherwise fall back to.
  const moq = readMoq(form.moq);

  // SRC-2 — a validity that has already passed is refused by the machine
  // (`QUOTE_VALIDITY_PAST`); the field says so the moment it is typed, by the
  // same comparison at the same instant.
  const validityPast =
    form.validUntil.trim() !== '' && validityAlreadyPast(form.validUntil, TODAY);

  const submitBlocked = !leadTime.ok || sameDayAckOwed || !moq.ok || validityPast;

  // A price nobody can read has no total. The preview is only ASKABLE of a price
  // that exists — it never renders a product of a guessed value. The RFQ quantity
  // is the NUMBER it already is; it used to be re-parsed out of the formatted
  // display string ("200,000 PCS" → strip → 200000), a fact round-tripping
  // through its own presentation.
  //
  // 2e-b-3 (COS-01) — the DISPLAY half of the :686 residue. The parse half
  // closed at 2e-a; this `.toLocaleString()` is the retired expression's last
  // surviving fragment, and its grouping followed the RUNTIME locale rather than
  // the app's. `formatNumber` pins id-ID, as every other quantity on the page does.
  //
  // COS-01 (label half), CLOSED (2e-c-2). 2e-b-3 fixed the GROUPING half and
  // deliberately stopped short of `formatIDR`, because the value was labelled
  // with `form.currency` — a label the payload then discarded, so hardcoding
  // "Rp" would have made the platform contradict itself. The register entry said
  // it plainly: "the label cannot be made honest until the field it names
  // survives the submit." It survives now, so the preview renders through the
  // same currency-aware formatter as the stored quote and the buyer's
  // comparison — one rendering of a bid, from preview to award.
  const totalPrice =
    effectiveQuotePanelRFQ && bidPrice.ok
      ? formatMoney(bidPrice.value * effectiveQuotePanelRFQ.totalQty, form.currency)
      : '—';

  // REAL submit — dispatches t_quotation_submit through the command spine (the
  // ONE supplier-owned creation verb). Persists RAW FACTS only; the engine scores
  // at read (#78). On a non-failed outcome the hook invalidates → the supplier's
  // quotations re-read, the quote lands in My-Quotes, and its RFQ leaves the open
  // list. Replaces the retired local-state masquerade.
  const submitQuote = async () => {
    if (!effectiveQuotePanelRFQ) return;
    // The price gate fires FIRST and alone, and it BLOCKS: a price that cannot be
    // read — or a zero, which reads fine but is not a bid — must never become a
    // submitted quotation, because a submitted quotation is immediately a
    // scoreable fact that re-anchors every rival's price score. The refusal is
    // named rather than folded into the generic "required fields missing" list:
    // "we cannot tell which number you mean" and "zero is not a price" ask the
    // supplier for different things, and neither is "you left this blank".
    if (!bidPrice.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.priceRefused.title'),
        description: t(PRICE_REFUSAL_KEY[bidPrice.reason]),
      });
      return;
    }
    // The lead-time gate. It used to be a `parseFloat(...) > 0` presence check
    // that only ever said "you left this blank" — so an unreadable lead time
    // fell through to `Number(...) || 0` and became a 0-day promise, the best
    // score on the axis. Blank is deliberately NOT gated here: it is legal.
    if (!leadTime.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.leadTimeRefused.title'),
        description: t(LEAD_TIME_REFUSAL_KEY[leadTime.reason]),
      });
      return;
    }
    // The hard gate on a stated 0. The submit control is disabled while the ack
    // is owed; this is the second lock, so a programmatic or race-y submit
    // cannot slip a same-day commitment through unaffirmed.
    if (sameDayAckOwed) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.sameDayAck.title'),
        description: t('rfqs.toast.sameDayAck.body'),
      });
      return;
    }
    // The minimum-order-quantity gate (2e-b-2). It fires ONLY on a stated value
    // that cannot be read — a blank falls through, because blank is the field's
    // answer, not its absence. Refusing rather than dropping is the whole point:
    // the retired path discarded every value here, readable or not.
    if (!moq.ok) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.moqRefused.title'),
        description: t(MOQ_REFUSAL_KEY[moq.reason]),
      });
      return;
    }
    const missing: string[] = [];
    if (!form.validUntil.trim()) missing.push(t('rfqs.field.validUntil'));
    if (missing.length > 0) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.missing.title'),
        description: t('rfqs.toast.missing.body', { fields: missing.join(', ') }),
      });
      return;
    }
    if (validityPast) {
      toast({
        variant: 'error',
        title: t('rfqs.toast.validityRefused.title'),
        description: t('rfqs.panel.validUntil.past', { today: formatDate(TODAY) }),
      });
      return;
    }
    const payload = buildQuotationSubmitPayload({
      rfqId: effectiveQuotePanelRFQ.id,
      supplierId,
      // The SAME parsed value the gate above judged — the builder can no longer
      // re-read the string and reach a different number (CP-0 §4).
      unitPrice: bidPrice.value,
      // 2e-c-2 — the argument that makes the price a price. The form has offered
      // this selector since before the spine existed and the builder was never
      // given it, so the platform asked a supplier to name their currency and
      // then stored every bid as rupiah. Same class as the moq drop (FIND-02),
      // worse in consequence: a dropped minimum loses a constraint, a dropped
      // currency RESTATES the number as a different amount of money.
      currency: form.currency,
      // The days/weeks conversion already happened inside the ONE parse above,
      // so the builder receives the whole number of days the gate judged — or
      // `null`, which it omits rather than flattening to a 0-day promise.
      leadTimeDays: leadTime.days,
      // The SAME parsed value the gate above judged (2e-b-2). This argument is
      // the fix: the form has always had this number and the builder has never
      // been given it, so the minimum a supplier stated died here.
      moq: moq.moq,
      validUntil: form.validUntil,
      paymentTermsOffered: form.paymentTerms.trim(),
      notes: form.notes,
      // SRC-2 — asked for on this form since it was built, and dropped here.
      sampleBatch: form.canSample,
      sampleLeadTime: form.sampleLeadTime,
      attachmentName: form.attachmentName,
    });
    try {
      const res = await submitMutation.mutateAsync({ payload });
      if (res.status === 'failed') {
        // SRC-2 — the four submit refusals read in the supplier's own words.
        const refusalKey = quoteRefusalKey(res.reason);
        toast({
          variant: 'error',
          title: t('rfqs.toast.submitFailed.title'),
          // 2e-c-2 — the currency refusal REFUSES BY NAME, in the supplier's
          // language. Every other reason still falls through to the machine
          // string, which is the pre-existing behaviour and its own finding
          // (2e-c-2-FIND-01) — this batch translates the refusal it introduces
          // rather than leaving a supplier to read a dispatcher constant.
          description: isCurrencyRefusal(res.reason)
            ? t('rfqs.toast.currencyRefused.body', {
                // Named from the form's OWN state, not scraped back out of the
                // error string: the token the supplier chose is already here.
                currency: form.currency,
                permitted: BID_CURRENCIES.join(', '),
              })
            : refusalKey
              ? t(refusalKey)
              : (refusalText(res.reason) ?? res.reason ?? t('rfqs.toast.submitFailed.body')),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('rfqs.toast.submitted.title', { rfq: effectiveQuotePanelRFQ.rfqNumber }),
        description: t('rfqs.toast.submitted.body', { date: effectiveQuotePanelRFQ.deadline }),
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
        {awaitingCount}{' '}
        {t(awaitingCount !== 1 ? 'rfqs.meta.quote.other' : 'rfqs.meta.quote.one')}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. Quotation submit dispatches through
            the wired `quotation` target and drives the real RFQ→award cascade; the
            RFQs being answered are fixtures. */}
        <ProvenanceMarker capability="rfqs" className="ml-3 align-middle" />
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
          notShortlisted={notShortlisted}
          onSubmitQuote={handleSubmitQuote}
          onRecordInterest={handleRecordInterest}
          onDecline={handleDecline}
          onAskQuestion={handleAskQuestion}
        />
      )}
      {activeTab === 'quotes' && (
        <MyQuotesTab quotes={submittedQuotes} />
      )}
      {activeTab === 'history' && <AwardsTab rows={awardRows} />}

      <SidePanel
        open={effectiveQuotePanelRFQ !== null}
        onClose={() => setQuotePanelRFQ(null)}
        title={
          effectiveQuotePanelRFQ
            ? t('rfqs.panel.title', { rfq: effectiveQuotePanelRFQ.rfqNumber })
            : ''
        }
        // ⚠️ **THE FOOTER IS MOUNTED BY THE DERIVED VALUE, NOT BY `open`, BECAUSE
        //    `SidePanel` KEEPS ITS SUBTREE IN THE DOM WHEN CLOSED.** Closing is a
        //    `translate-x-full` plus `aria-hidden` — the overlay takes
        //    `pointer-events-none`, the `aside` does not — so a "closed" panel
        //    still holds a live, clickable submit button. Deriving `open=` alone
        //    would have moved the commit off-screen and called it gated, which is
        //    the same shape as gating one door out of three. The BODY below was
        //    already conditional; the footer now matches it.
        footerActions={
          effectiveQuotePanelRFQ ? (
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
                // 2e-b-1 — disabled while an unreadable lead time stands, and
                // while a same-day acknowledgement is owed. `submitQuote` re-checks
                // both; this is the visible half of the same gate.
                disabled={submitMutation.isPending || submitBlocked}
                onClick={submitQuote}
              >
                {submitMutation.isPending ? t('rfqs.panel.submitting') : t('rfqs.panel.submit')}
              </Button>
            </>
          ) : undefined
        }
      >
        {effectiveQuotePanelRFQ && (
          <div className="space-y-5">
            <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
              <div className="text-sm font-semibold text-text-primary">
                {effectiveQuotePanelRFQ.material}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
                <span>
                  {t('rfqs.card.qty')}{' '}
                  <strong className="text-text-primary">
                    {effectiveQuotePanelRFQ.qty}
                  </strong>
                </span>
                <span>
                  {t('rfqs.card.deadline')}{' '}
                  <strong
                    className={
                      effectiveQuotePanelRFQ.daysRemaining <= 7
                        ? 'text-critical'
                        : 'text-text-primary'
                    }
                  >
                    {effectiveQuotePanelRFQ.deadline}
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
                  {/* Ruling 6.2 — `type="number"` filtered the input space to what
                      `Number` happens to accept, which is what made the parse look
                      optional: the browser silently ate "15.000,50" before any of
                      our code could refuse it, and let the catastrophic "1.500"
                      through untouched. Text + inputmode lets the supplier type
                      what they actually type, and makes the parser load-bearing. */}
                  <input
                    type="text"
                    inputMode="decimal"
                    // Not "0" / "0.00": a placeholder must never model a value the
                    // field refuses, and it must not model a separator either.
                    placeholder="15000"
                    aria-label={t('rfqs.field.unitPrice')}
                    aria-invalid={form.unitPrice.trim() !== '' && !bidPrice.ok}
                    value={form.unitPrice}
                    onChange={(e) =>
                      setForm({ ...form, unitPrice: e.target.value })
                    }
                    className={inputClass}
                  />
                  {/* 2e-c-1 — the options ARE the policy list, not a copy of it
                      that drifted from it. They used to be three hand-written
                      <option> tags, which is how the form came to offer a
                      currency the Quotation entity could not represent. */}
                  <select
                    // The control had no accessible name at all: a screen reader
                    // announced an unlabelled combobox next to the price.
                    aria-label={t('rfqs.field.currency')}
                    value={form.currency}
                    onChange={(e) => {
                      // The DOM types a select's value as `string`, so the
                      // narrowing is stated rather than asserted. Total in
                      // practice — every option came from BID_CURRENCIES — and
                      // structural insurance if that ever stops being true.
                      const next = e.target.value;
                      if (isBidCurrency(next)) {
                        setForm({ ...form, currency: next });
                      }
                    }}
                    className={inputClass}
                    style={{ width: 100 }}
                  >
                    {BID_CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('rfqs.panel.price.hint')}
                </div>
                {/* An untouched blank does not nag; a TYPED price that cannot be
                    read — or a zero, which can — says so, and says what to do. */}
                {form.unitPrice.trim() !== '' && !bidPrice.ok && (
                  <div
                    role="alert"
                    data-testid="quote-price-refusal"
                    className="mt-1 text-[11px] text-critical"
                  >
                    {t(PRICE_REFUSAL_KEY[bidPrice.reason])}
                  </div>
                )}
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
                  {/* The currency is IN the formatted value now — the manual
                      `${form.currency} ` prefix was the half of COS-01 that
                      compensated for a formatter that could not say it. */}
                  {totalPrice}
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
                  {/* Ruling 6.2, carried into 2e-b-1 because the refusal DEPENDS
                      on it: `type="number"` erases "abc" to "" before React sees
                      it, and blank is now legal — so the browser would silently
                      convert an unreadable lead time into an honest-looking
                      absence, and the supplier would never be told. The
                      placeholder was "0" — a field modelling the one value that
                      now scores best and needs an explicit acknowledgement. */}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="14"
                    aria-label={t('rfqs.field.leadTime')}
                    aria-invalid={!leadTime.ok}
                    value={form.leadTimeNum}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        leadTimeNum: e.target.value,
                        // Editing the number retracts any same-day affirmation —
                        // an ack belongs to the value it was given for.
                        sameDayAck: false,
                      })
                    }
                    className={inputClass}
                  />
                  <select
                    value={form.leadTimeUnit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        leadTimeUnit: e.target.value as LeadTimeUnit,
                        sameDayAck: false,
                      })
                    }
                    className={inputClass}
                    style={{ width: 100 }}
                  >
                    <option value="days">{t('rfqs.unit.days')}</option>
                    <option value="weeks">{t('rfqs.unit.weeks')}</option>
                  </select>
                </div>
                {/* The estimate framing, stated once on the field itself
                    (2e-b-1a): required so the bid is comparable, indicative
                    because a firm date cannot honestly be given before final
                    quantity, PO date and capacity are known. */}
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('rfqs.panel.leadTime.hint')}
                </div>
                {/* An untouched blank does not nag on sight — it refuses at the
                    gate, and says so on the field once the supplier has engaged
                    with the form (the price precedent, 2e-a). */}
                {!leadTime.ok && form.unitPrice.trim() !== '' && (
                  <div
                    role="alert"
                    data-testid="quote-leadtime-refusal"
                    className="mt-1 text-[11px] text-critical"
                  >
                    {t(LEAD_TIME_REFUSAL_KEY[leadTime.reason])}
                  </div>
                )}
                {/* THE HARD GATE — inline, in the flow of the form (no modal:
                    every other guard on this surface is inline). Submit stays
                    disabled until this is ticked. */}
                {leadTime.ok && leadTime.requiresSameDayAck && (
                  <div
                    data-testid="quote-leadtime-sameday"
                    className="mt-2 rounded border border-warning bg-warning-soft px-3 py-2"
                  >
                    <div className="text-[11px] text-warning-hover">
                      {t('rfqs.panel.leadTime.sameDay.note')}
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-[11px] text-text-secondary">
                      <input
                        type="checkbox"
                        checked={form.sameDayAck}
                        aria-label={t('rfqs.panel.leadTime.sameDay.ack')}
                        onChange={(e) =>
                          setForm({ ...form, sameDayAck: e.target.checked })
                        }
                      />
                      {t('rfqs.panel.leadTime.sameDay.ack')}
                    </label>
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>{t('rfqs.panel.validUntil')}</label>
                <input
                  type="date"
                  aria-label={t('rfqs.field.validUntil')}
                  aria-invalid={validityPast}
                  // The picker greys out the days that have gone; the line
                  // below is what refuses one that is typed.
                  min={TODAY}
                  value={form.validUntil}
                  onChange={(e) =>
                    setForm({ ...form, validUntil: e.target.value })
                  }
                  className={inputClass}
                />
                {validityPast && (
                  <div
                    role="alert"
                    data-testid="quote-validity-refusal"
                    className="mt-1 text-[11px] text-critical"
                  >
                    {t('rfqs.panel.validUntil.past', { today: formatDate(TODAY) })}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>{t('rfqs.panel.paymentTerms')}</label>
                <input
                  type="text"
                  aria-label={t('rfqs.field.paymentTerms')}
                  value={form.paymentTerms}
                  onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                  className={inputClass}
                  data-testid="quote-payment-terms"
                />
                <div className="mt-1 text-[11px] text-text-tertiary" data-testid="quote-payment-terms-note">
                  {t('rfqs.panel.paymentTerms.note', { terms: effectiveQuotePanelRFQ.paymentTerms })}
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  {t('rfqs.panel.moq')}
                </label>
                {/* Ruling 6.2, and load-bearing here for the same reason as the
                    lead time: `type="number"` erases an unreadable token to ""
                    before React sees it, and "" is LEGAL on this field — so the
                    browser would quietly convert a minimum the supplier typed
                    into the "no minimum" default, and nobody would be told. */}
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={t('rfqs.panel.moqPlaceholder')}
                  aria-label={t('rfqs.field.moq')}
                  aria-invalid={!moq.ok}
                  value={form.moq}
                  onChange={(e) => setForm({ ...form, moq: e.target.value })}
                  className={inputClass}
                />
                {/* The default, stated on the field rather than hidden in the
                    placeholder — a placeholder disappears the moment anyone
                    types, which is exactly when "blank means X" stops being
                    readable. */}
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('rfqs.panel.moq.hint')}
                </div>
                {!moq.ok && (
                  <div
                    role="alert"
                    data-testid="quote-moq-refusal"
                    className="mt-1 text-[11px] text-critical"
                  >
                    {t(MOQ_REFUSAL_KEY[moq.reason])}
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection
              eyebrow={t('rfqs.panel.step3.eyebrow')}
              title={t('rfqs.panel.step3.title')}
              description={t('rfqs.panel.step3.desc')}
            >
              {/* SRC-2 — THE SUPPLIER'S OWN DOCUMENTS, EACH IN THE STATE IT IS IN
                  TODAY. This was three hard-coded names with a green tick and
                  "On file", for every supplier — including one whose halal
                  certificate had lapsed, and one holding none of the three. The
                  state is the one My Documents shows (`documentDisplayState`,
                  same instant), so the two pages cannot disagree. */}
              <div
                data-testid="quote-certificates"
                className="border border-border-subtle rounded px-3 py-2 text-xs text-text-secondary flex flex-col gap-1.5"
              >
                {docsQuery.isPending ? (
                  <span className="text-text-tertiary">{t('rfqs.panel.certs.loading')}</span>
                ) : docsQuery.isError ? (
                  <span className="text-warning-hover" data-testid="quote-certificates-error">
                    {t('rfqs.panel.certs.error')}
                  </span>
                ) : certificateDocs.length === 0 ? (
                  <span className="text-text-tertiary" data-testid="quote-certificates-none">
                    {t('rfqs.panel.certs.none')}
                  </span>
                ) : (
                  certificateDocs.map((doc) => {
                    const state = documentDisplayState(doc, TODAY);
                    return (
                      <div
                        key={doc.id}
                        data-testid={`quote-cert-${doc.id}`}
                        className="flex items-center gap-2 flex-wrap"
                      >
                        <span className="font-semibold text-text-primary">{doc.name}</span>
                        <StatusPill variant={DISPLAY_STATE_TONE[state]}>
                          {t(DISPLAY_STATE_LABEL_KEY[state])}
                        </StatusPill>
                        {doc.expiryDate && (
                          <span className="text-text-tertiary">
                            {t('rfqs.panel.certs.expires', { date: formatDate(doc.expiryDate) })}
                          </span>
                        )}
                      </div>
                    );
                  })
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
                {/* SRC-2 — THE DROP ZONE TAKES A FILE NOW. It was a dashed box with
                    no input behind it: "click to attach" attached nothing. The
                    input covers the box, so a click and a drop both land on it.
                    What is kept is the file's NAME — this build has nowhere to
                    put the bytes, and the line under the box says so before the
                    supplier relies on it. */}
                <div className="relative border-2 border-dashed border-border-input rounded-md p-4 text-center text-xs text-text-tertiary bg-bg-hover">
                  <Upload size={20} className="text-teal mx-auto mb-1" />
                  {form.attachmentName ? (
                    <span className="font-semibold text-text-primary" data-testid="quote-attachment-name">
                      {t('rfqs.panel.pdfChosen', { name: form.attachmentName })}
                    </span>
                  ) : (
                    t('rfqs.panel.pdfDrop')
                  )}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    aria-label={t('rfqs.panel.pdf')}
                    data-testid="quote-attachment-input"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) =>
                      setForm({ ...form, attachmentName: e.target.files?.[0]?.name ?? '' })
                    }
                  />
                </div>
                {form.attachmentName && (
                  <button
                    type="button"
                    data-testid="quote-attachment-remove"
                    onClick={() => setForm({ ...form, attachmentName: '' })}
                    className="mt-1 text-xs font-semibold text-teal-text hover:text-teal-hover"
                  >
                    {t('rfqs.panel.pdfRemove')}
                  </button>
                )}
                <div className="mt-1 text-[11px] text-text-tertiary" data-testid="quote-attachment-note">
                  {t('rfqs.panel.pdfNote')}
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
  const crumb = [t('rfqs.crumb.page')];
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const rfqsQuery = useRFQs();
  const quotationsQuery = useQuotations();
  // SRC-2 — the declared present (see `TODAY`), no longer a wall-clock read.
  const nowIso = TODAY;

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
  // (an event this supplier was left off is in `rfqs`, so the page still opens)
  if (rfqs.length === 0 && quoteCount === 0)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('rfqs.empty.title')}
        subtitle={t('rfqs.empty.subtitle', { supplier: mySupplier.name })}
        message={t('rfqs.empty.message')}
      />
    );

  // RFx-1 — an advance narrows the invite list to the shortlist, and a supplier
  // left off still reads the event (`supplierMayRead`), to be told so. Those
  // events are not open to it: they go to their own list, with the reason.
  const leftOff = (r: RFQ): boolean => notShortlistedAdvanceOf(r, supplierId) !== null;
  const notShortlisted = rfqs.filter(leftOff);
  const initialRfqs = rfqs
    .filter((r) => r.status === 'Open' && !leftOff(r))
    .map((r) => toOpenRfq(r, nowIso));

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
      notShortlisted={notShortlisted}
      quotations={quotations}
      rfqById={rfqById}
      awardRows={awardRows}
    />
  );
};

export default SupplierRFQs;
