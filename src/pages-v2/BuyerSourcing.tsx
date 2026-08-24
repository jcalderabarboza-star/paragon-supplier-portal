import React, { useMemo, useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Award,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  ClipboardCheck,
  Trophy,
  Archive,
  Ban,
  RotateCcw,
  ArrowLeftRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import SidePanel from '../components/ui-v2/SidePanel';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import ScoreBadge from '../components/ui-v2/ScoreBadge';
import Data from '../components/ui-v2/Data';
import LivenessPill from '../components/ui-v2/LivenessPill';
import ModelMarker from '../components/ui-v2/ModelMarker';
import Button from '../components/ui-v2/Button';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import { useToast } from '../hooks/useToast';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useRFQs, useQuotations, useSuppliers } from '../services/query/hooks';
import {
  useRfqCreate,
  useRfqAward,
  useRfqFxPin,
  useRfqCancel,
  useRfqPublish,
  useRfqReopen,
  useQuotationReview,
} from '../services/query/commandHooks';
import {
  buildRfqCreatePayload,
  normalizeRfqCreateDraft,
  readRfqBudget,
  readRfqTotalQty,
  type RfqDraftRefusal,
} from './sourcing/rfqCreateModel';
import type { QtyRefusalReason } from '../lib/localeNumber';
// 2e-b-3 (COS-04) — the canonical formatters, replacing this file's own copies.
import { formatDate, formatIDR, formatMoney, formatNumber } from '../lib/format';
import {
  scoreQuotations,
  AXIS_LIVENESS,
  COMPOSITE_LIVENESS,
} from '../lib/quoteScore';
import {
  spreadForQuote,
  type QuoteSpread,
  type SilentReason,
  type SpreadDeps,
} from '../lib/shouldCostSpread';
import {
  BASE_CURRENCY,
  FX_PIN_MAX_AGE_DAYS,
  type BidCurrency,
} from '../lib/currencyPolicy';
import {
  effectivePin,
  isStalePin,
  pinHistory,
  type FxPin,
  type FxPinSource,
  type FxRefusalReason,
} from '../lib/fxPin';
import {
  readFxRate,
  readFxVintage,
  type FxRateRefusalReason,
  type FxVintageRefusalReason,
} from './sourcing/fxRateInput';
import { MATERIAL_BASKET_CLASSIFICATION } from '../services/data/mock/fixtures/commodityMaterialMap';
import {
  ROOT_BENCHMARKS,
  SHOULD_COST_MATERIALS,
  SIMULATED_SPOT_FX,
} from '../services/data/mock/fixtures/commodityBaskets';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { RFQ, RFQCategory, RFQStatus } from '../data/mockRfqs';
import type { Quotation } from '../data/mockQuotations';
import type { Supplier } from '../services/data/types';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';

type GroupTab = 'all' | 'open' | 'pending' | 'awarded' | 'closed';

// Category label keys — the RFQCategory enum stays the logic value; only the
// rendered label is localized (mirrors the type-label precedent in contracts.ts).
const CATEGORY_LABEL_KEY: Record<RFQCategory, string> = {
  Fragrance: 'sourcing.category.fragrance',
  'Active Ingredients': 'sourcing.category.activeIngredients',
  Packaging: 'sourcing.category.packaging',
  Emulsifiers: 'sourcing.category.emulsifiers',
  Botanical: 'sourcing.category.botanical',
  Other: 'sourcing.category.other',
};

const categoryLabel = (t: TFunction, c: RFQCategory): string =>
  t(CATEGORY_LABEL_KEY[c]);

const CATEGORY_OPTIONS: RFQCategory[] = [
  'Fragrance',
  'Active Ingredients',
  'Packaging',
  'Emulsifiers',
  'Botanical',
  'Other',
];

const CATEGORY_TO_SUPPLIER_CATEGORY: Record<RFQCategory, string[]> = {
  Fragrance: ['Fragrance'],
  'Active Ingredients': ['Active Ingredient'],
  Packaging: ['Packaging'],
  Emulsifiers: ['Raw Material'],
  Botanical: ['Raw Material'],
  Other: ['Raw Material', 'Active Ingredient', 'Packaging', 'Fragrance'],
};

const MATERIAL_CATALOG: Record<RFQCategory, string[]> = {
  Fragrance: [
    'Wardah Floral Accord',
    'Sample Citrus Compound',
    'Make Over Oud Base',
    'Emina Fresh Accord',
  ],
  'Active Ingredients': [
    'Niacinamide USP',
    'Sodium Hyaluronate HMW',
    'Vitamin C Derivative',
    'Retinyl Palmitate',
    'Salicylic Acid',
  ],
  Packaging: [
    'PET Bottle 100ml',
    'PET Bottle 200ml',
    'Airless Pump 15ml',
    'Folding Carton 150gsm',
    'Shipper Box 12-pack',
  ],
  Emulsifiers: [
    'Glyceryl Stearate SE',
    'Polysorbate 80',
    'Cetearyl Alcohol',
    'Lecithin (Soy)',
  ],
  Botanical: [
    'Centella Asiatica Extract',
    'Green Tea Extract',
    'Rice Bran Extract',
    'Mulberry Extract',
  ],
  Other: ['Custom material — specify in notes'],
};

const UOM_OPTIONS = ['KG', 'PCS', 'L', 'MT'] as const;
const INCOTERMS_OPTIONS = ['FOB', 'CIF', 'EXW', 'DDP', 'FCA'];
const PAYMENT_TERMS_OPTIONS = [
  'Net 30',
  'Net 45',
  'Net 60',
  'Letter of Credit',
  'Advance Payment',
];

const STATUS_VARIANT: Record<
  RFQStatus,
  'success' | 'warning' | 'info' | 'neutral' | 'danger'
> = {
  Draft: 'neutral',
  Open: 'info',
  Closed: 'neutral',
  Awarded: 'success',
  Cancelled: 'danger',
};

const REFERENCE_TODAY = new Date('2026-05-18');
const DAY_MS = 24 * 60 * 60 * 1000;

const isAllResponded = (r: RFQ): boolean =>
  r.invitedSupplierIds.length > 0 &&
  r.respondedSupplierIds.length === r.invitedSupplierIds.length;

const daysUntil = (iso: string): number => {
  const d = new Date(iso);
  return Math.round((d.getTime() - REFERENCE_TODAY.getTime()) / DAY_MS);
};

// ── 2e-b-3 (COS-04) — the shadowing locals are retired ───────────────────────
//
// This file carried its own `formatIDR`, `formatNumber` and `formatDate`, each a
// near-copy of the `lib/format` primitive of the same name. Same names, different
// behaviour — which is the whole problem: `formatDate` hardcoded `en-GB`, so the
// buyer's dates stayed English in Indonesian mode while every migrated page
// localised, and it dropped the `Asia/Jakarta` pin, so a date rendered by the
// runner's timezone instead of the business one. All three now come from
// `lib/format` (imported at the top), which is nullish-safe by contract.
//
// `formatMoney` STAYS: it is the currency-aware leg (CI-2) and `lib/format` has
// no equivalent — a quote may be priced in USD. Consolidating it belongs to the
// currency ruling (FIND-01 / 2e-c), not here.
//
// 2e-c-2 — `formatMoney` MOVED to `lib/format`, next to the rest of the app's
// money, and its currency argument is now REQUIRED. It lived here because
// `lib/format` had no currency-aware leg; the comment above recorded that
// consolidating it belonged to the currency ruling. This is that ruling.
// 2e-c-1-FIND-01 (a EUR bid rendering "€3") is closed in the moved
// implementation: EUR renders en-IE "€2.85" by operator ruling.

// A score axis, or honest silence (2e-c-3). The score cells used to read
// `scoreById.get(id)?.priceScore ?? 0`, which was harmless while the engine
// always scored — the map was never missing an entry. Now that a comparison can
// be REFUSED the map is legitimately empty, and `?? 0` would render every axis
// as a real score of 0: the WORST value on each bar, for quotes the engine
// explicitly declined to rank. An absent score is not a bad score.
const ScoreOrSilence: React.FC<{ score: number | undefined }> = ({ score }) =>
  score === undefined ? (
    <span className="text-text-tertiary">—</span>
  ) : (
    <ScoreBadge score={score} size="sm" variant="bar" />
  );

// Field chrome for the FX-pin dialog — same tokens as the supplier quote form,
// so the portal's two governed numeric-entry surfaces read identically.
const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

// ── CP-0 · 2e-c-4 — the recorded FX basis, made visible ─────────────────────
//
// D-1 requires a pin to be auditable. An audit trail nobody can read from the
// screen is an audit trail only an engineer can consult, so this states, per
// foreign currency: the rate IN FORCE, its VINTAGE, its SOURCE, and — when a
// rate has been superseded — that earlier ones exist and are kept.
//
// The vintage is deliberately as prominent as the rate. A rate is not a fact on
// its own; a rate AS OF a date is. Showing 17,250 without saying when it was
// true is the same class of omission as showing a score without its liveness.

/** The draft a buyer confirms before a rate is recorded. */
interface PinDraft {
  currency: BidCurrency;
  rate: string;
  asOf: string;
  source: FxPinSource;
  rateType: string;
  /** The pin this one would supersede, if any — drives the confirm copy. */
  superseding?: FxPin;
}

const blankPinDraft = (currency: BidCurrency, superseding?: FxPin): PinDraft => ({
  currency,
  // Deliberately EMPTY, never seeded from the pin being superseded: a
  // pre-filled rate invites a buyer to accept the old number as if it were the
  // new one, which is precisely the edit-in-place behaviour D-1 forbids.
  rate: '',
  asOf: '',
  source: 'MANUAL',
  rateType: '',
  ...(superseding ? { superseding } : {}),
});

// ── CP-0 · 2e-c-6 — every named cause has a translation, by construction ─────
//
// The arc's five user-facing reason strings were all looked up by CONCATENATION
// (`t(\`sourcing.fx.refused.${reason}\`)`), which means nothing could tell that a
// reason had no key: a new refusal ships, and the buyer reads the raw key on
// screen — in both languages equally. An i18n sweep that only checks today's
// keys is a sweep that has to be run again every time a reason is added.
//
// These are EXACT maps, the same shape and for the same reason as
// `RFQ_QTY_REFUSAL_KEY` below: `Record<Reason, string>` makes a reason with no
// key a COMPILE error rather than a rendering defect. Widening any of these
// unions now fails the build until the EN and ID strings exist. The parity guard
// in `fragments.test.ts` then does the other half — that the ID key is really
// there, and interpolates the same variables.
export const FX_REFUSAL_KEY: Record<FxRefusalReason, string> = {
  FX_UNPINNED: 'sourcing.cmp.fx.refused.FX_UNPINNED',
  FX_STALE: 'sourcing.cmp.fx.refused.FX_STALE',
};

export const FX_RATE_REFUSAL_KEY: Record<FxRateRefusalReason, string> = {
  EMPTY_QTY: 'sourcing.fx.refused.EMPTY_QTY',
  NOT_NUMERIC: 'sourcing.fx.refused.NOT_NUMERIC',
  AMBIGUOUS_QTY: 'sourcing.fx.refused.AMBIGUOUS_QTY',
  ZERO_RATE: 'sourcing.fx.refused.ZERO_RATE',
};

export const FX_VINTAGE_REFUSAL_KEY: Record<FxVintageRefusalReason, string> = {
  EMPTY_VINTAGE: 'sourcing.fx.refused.EMPTY_VINTAGE',
  UNREADABLE_VINTAGE: 'sourcing.fx.refused.UNREADABLE_VINTAGE',
  FUTURE_VINTAGE: 'sourcing.fx.refused.FUTURE_VINTAGE',
};

export const FX_PIN_SOURCE_KEY: Record<FxPinSource, string> = {
  MANUAL: 'sourcing.cmp.fx.basis.source.MANUAL',
  SAP_EXHGRATE: 'sourcing.cmp.fx.basis.source.SAP_EXHGRATE',
};

/** Honest silence on the should-cost cell — one key per named cause. The
 *  `currency-unsupported` member is D-4's fourth reason (2e-c-5). */
export const SPREAD_SILENT_KEY: Record<SilentReason, string> = {
  unmapped: 'sourcing.cmp.spread.silent.unmapped',
  tail: 'sourcing.cmp.spread.silent.tail',
  'unit-mismatch': 'sourcing.cmp.spread.silent.unit-mismatch',
  'currency-unsupported': 'sourcing.cmp.spread.silent.currency-unsupported',
};

/**
 * The refusal key for a typed pin field, or `null` when it reads (and when it is
 * still untouched — an empty field does not nag, it blocks at the button).
 *
 * One parser call, properly narrowed. The retired form called the parser TWICE
 * per render and reached the reason through `as { reason: string }` — a cast
 * that would have gone on compiling if the outcome shape changed underneath it.
 */
const fxRateRefusalKey = (raw: string): string | null => {
  if (raw.trim() === '') return null;
  const outcome = readFxRate(raw);
  return outcome.ok ? null : FX_RATE_REFUSAL_KEY[outcome.reason];
};

const fxVintageRefusalKey = (raw: string): string | null => {
  if (raw.trim() === '') return null;
  const outcome = readFxVintage(raw);
  return outcome.ok ? null : FX_VINTAGE_REFUSAL_KEY[outcome.reason];
};

/** A field-level refusal line in the pin dialog — same DOM as before, so the
 *  `fx-rate-refusal` / `fx-asof-refusal` witnesses are untouched. */
const FieldRefusal: React.FC<{ messageKey: string | null; testId: string; t: TFunction }> = ({
  messageKey,
  testId,
  t,
}) =>
  messageKey === null ? null : (
    <div role="alert" data-testid={testId} className="mt-1 text-[11px] text-danger">
      {t(messageKey)}
    </div>
  );

const FxBasisPanel: React.FC<{
  currencies: readonly BidCurrency[];
  pins: readonly FxPin[] | undefined;
  onPin: (c: BidCurrency) => void;
  t: TFunction;
}> = ({ currencies, pins, onPin, t }) => (
  <div className="mb-3 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-label uppercase text-text-tertiary">
        {t('sourcing.cmp.fx.basis.title')}
      </span>
      <LivenessPill capability="commodityIntel" />
    </div>
    <ul className="flex flex-col gap-1.5">
      {currencies.map((c) => {
        const pin = effectivePin(pins, c);
        const history = pinHistory(pins, c);
        const stale = pin ? isStalePin(pin) : false;
        return (
          <li key={c} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <Data as="span" className="font-semibold">
              1 {c}
            </Data>
            {pin ? (
              <>
                <span className="text-text-tertiary">=</span>
                <Data as="span" className="font-semibold">
                  {formatMoney(pin.rate, pin.base)}
                </Data>
                {/* The vintage, never optional — see the block comment. */}
                <span
                  className={stale ? 'text-warning-hover font-medium' : 'text-text-secondary'}
                  data-testid={`fx-vintage-${c}`}
                >
                  {t('sourcing.cmp.fx.basis.asOf', { date: formatDate(pin.asOf) })}
                </span>
                <span className="text-text-tertiary">
                  {t(FX_PIN_SOURCE_KEY[pin.source])}
                  {pin.rateType ? ` · ${pin.rateType}` : ''}
                </span>
                {/* Superseded pins are KEPT (D-1). Saying how many exist is what
                    makes "the prior basis is preserved" a visible property
                    rather than a claim in a comment. */}
                {history.length > 1 && (
                  <span className="text-text-tertiary" data-testid={`fx-history-${c}`}>
                    {t(
                      history.length === 2
                        ? 'sourcing.cmp.fx.basis.superseded.one'
                        : 'sourcing.cmp.fx.basis.superseded.other',
                      { count: history.length - 1 },
                    )}
                  </span>
                )}
              </>
            ) : (
              <span className="text-warning-hover" data-testid={`fx-missing-${c}`}>
                {t('sourcing.cmp.fx.basis.none')}
              </span>
            )}
            <Button variant="outline" onClick={() => onPin(c)}>
              {/* A supersede is a NEW RECORDED ACT, not an edit, and the label
                  says so — "Edit rate" would describe a mutation that cannot
                  happen and would misrepresent what lands in the audit trail. */}
              {t(pin ? 'sourcing.cmp.fx.basis.supersede' : 'sourcing.cmp.fx.basis.record', {
                currency: c,
              })}
            </Button>
          </li>
        );
      })}
    </ul>
  </div>
);

// 2e-c-5 — the `isSpreadCurrency` guard that lived here is GONE. Policy is still
// wider than capability, but deciding that is the resolver's job now: it runs
// the check as its first gate and returns the same honest silence. The guard was
// only ever here because `SpreadCurrency` was a 2-union the surface had to
// narrow to; with the union retired, a surface that kept its own copy would be a
// second place for the rule to drift.

// CP-0 · W1 · 2e-b-4a — each wizard-number refusal names its own rule. A buyer
// who left the quantity blank, one who typed something unreadable, and one who
// typed a token legal under both conventions have made three different mistakes
// and need three different answers — not one anonymous disabled button.
//
// The maps are EXACT because `RfqDraftRefusal` is discriminated by field:
// `EMPTY_QTY` exists on the quantity (required) and is excluded from the budget
// (optional — a blank there is the answer), so neither map carries an entry it
// can never use.
const RFQ_QTY_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'sourcing.wizard.qty.refused.empty',
  NOT_NUMERIC: 'sourcing.wizard.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'sourcing.wizard.qty.refused.ambiguous',
};

const RFQ_BUDGET_REFUSAL_KEY: Record<
  Exclude<QtyRefusalReason, 'EMPTY_QTY'>,
  string
> = {
  NOT_NUMERIC: 'sourcing.wizard.budget.refused.notNumeric',
  AMBIGUOUS_QTY: 'sourcing.wizard.budget.refused.ambiguous',
};

/** The i18n key for a refusal, chosen by the field it came from. */
const rfqRefusalKey = (refusal: RfqDraftRefusal): string =>
  refusal.field === 'totalQty'
    ? RFQ_QTY_REFUSAL_KEY[refusal.reason]
    : RFQ_BUDGET_REFUSAL_KEY[refusal.reason];

const buildTimeline = (r: RFQ, t: TFunction): TimelineEvent[] => {
  const totalInvited = r.invitedSupplierIds.length;
  const responded = r.respondedSupplierIds.length;
  const allResponded = isAllResponded(r);

  const isDraft = r.status === 'Draft';
  const isOpen = r.status === 'Open';
  const isAwarded = r.status === 'Awarded';
  const isClosed = r.status === 'Closed' || r.status === 'Cancelled';

  return [
    {
      id: 'drafted',
      title: t('sourcing.timeline.drafted'),
      timestamp: formatDate(r.createdAt),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'sent',
      title: t(
        totalInvited === 1
          ? 'sourcing.timeline.sentTo.one'
          : 'sourcing.timeline.sentTo.other',
        { count: totalInvited },
      ),
      timestamp: isDraft ? undefined : formatDate(r.createdAt),
      status: isDraft ? 'pending' : 'completed',
      icon: Send,
    },
    {
      id: 'responses',
      title: t('sourcing.timeline.responses', {
        responded,
        total: totalInvited,
      }),
      timestamp:
        responded > 0
          ? t('sourcing.timeline.latest', {
              date: formatDate(r.responseDeadline),
            })
          : undefined,
      status: isDraft
        ? 'pending'
        : allResponded || isAwarded || isClosed
          ? 'completed'
          : 'current',
      icon: CheckCircle2,
    },
    {
      id: 'evaluation',
      title: t('sourcing.timeline.evaluation'),
      status: isAwarded || isClosed
        ? 'completed'
        : allResponded && isOpen
          ? 'current'
          : 'pending',
      icon: ClipboardCheck,
    },
    {
      id: 'awarded',
      title: t('sourcing.timeline.awarded'),
      timestamp: isAwarded ? formatDate(r.awardDeadline) : undefined,
      status: isAwarded ? 'completed' : isClosed ? 'pending' : 'pending',
      icon: Trophy,
    },
    {
      id: 'closed',
      title: t('sourcing.timeline.closed'),
      status: isClosed ? 'completed' : 'pending',
      icon: Archive,
    },
  ];
};

export const FOOTER_LABEL = (r: RFQ, t: TFunction): string => {
  if (r.status === 'Open') {
    return isAllResponded(r)
      ? t('sourcing.footer.awardRfq')
      : t('sourcing.footer.sendReminder');
  }
  if (r.status === 'Awarded') return t('sourcing.footer.viewAward');
  if (r.status === 'Closed' || r.status === 'Cancelled')
    return t('sourcing.footer.viewReport');
  return t('sourcing.footer.continueDraft');
};

// ⚠️ §68 — THIS USED TO RETURN `'primary'` FOR THE AWARD STATE. DP2-BUTTON-01
// reserved solid action-blue for the irreversible commit and Award was the one
// verb on this surface that qualified. The reserved-solid register is retired
// portal-wide (operator ruling), so every state — Award included — is the calm
// action-blue OUTLINE CTA.
//
// The FUNCTION survives rather than being inlined, and deliberately: it is the
// single place this surface's footer register is decided, so a future state
// that wants a different one has an obvious seat, and the spec that used to
// pin "Award is solid" now pins "nothing is" against the same seam.
export const FOOTER_VARIANT = (_r: RFQ): 'outline' => 'outline';

const ReviewSection: React.FC<{
  label: string;
  rows: [string, React.ReactNode][];
  onEdit: () => void;
}> = ({ label, rows, onEdit }) => {
  const { t } = useTranslation();
  return (
  <section className="border border-border-subtle rounded-md">
    <header className="flex items-center justify-between px-4 py-2 bg-bg-hover">
      <span className="text-label text-text-tertiary uppercase">{label}</span>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-medium text-teal hover:text-teal-hover"
      >
        {t('sourcing.wizard.review.edit')}
      </button>
    </header>
    <dl className="px-4 py-3 divide-y divide-border-subtle">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between py-2 gap-4">
          <dt className="text-text-tertiary">{k}</dt>
          <dd className="text-text-primary text-right">{v}</dd>
        </div>
      ))}
    </dl>
  </section>
  );
};

const ComparisonRow: React.FC<{
  label: string;
  // An honest-marker tag on the row label, with a tooltip explaining it. Two
  // DIFFERENT qualifiers use it, and they must not be conflated:
  //   · "Simulated" — the axis has no live data source yet (compliance /
  //     reliability / the composite that inherits their weakest link);
  //   · "Estimated" — the data is REAL supplier input, but it is indicative at
  //     this stage rather than a commitment (lead time, 2e-b-1a).
  // Generalised from the old `sim`/`simLabel`/`simTitle` triple so the second
  // qualifier reuses the grammar instead of inventing a rival one. Rows with no
  // qualifier render plain.
  tag?: string;
  tagTitle?: string;
  children: React.ReactNode;
}> = ({ label, tag, tagTitle, children }) => (
  <tr className="border-t border-border-subtle">
    <th
      scope="row"
      className="text-left px-2 py-2 font-medium text-text-tertiary uppercase tracking-wider text-[10px] w-36 min-w-[9rem] align-middle"
    >
      {label}
      {tag && (
        <span
          title={tagTitle}
          className="ml-1.5 inline-block normal-case tracking-normal text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px align-middle"
        >
          {tag}
        </span>
      )}
    </th>
    {children}
  </tr>
);

// CI-2 should-cost-vs-quote spread deps — the SIMULATED join + the commodity
// fixtures the resolver reads. Module-level (static fixtures, no per-render cost);
// `materials` is keyed by `sc-*` id for O(1) lookup inside `spreadForQuote`.
const SPREAD_DEPS: SpreadDeps = {
  join: MATERIAL_BASKET_CLASSIFICATION,
  materials: Object.fromEntries(SHOULD_COST_MATERIALS.map((m) => [m.id, m])),
  roots: ROOT_BENCHMARKS,
  fx: SIMULATED_SPOT_FX,
};

// A spread fraction as a signed percent (+8% / −3% / 0%), real minus for polish.
const fmtSignedPct = (frac: number): string => {
  const pct = Math.round(frac * 100);
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct)}%`;
};

// The CI-2 spread cell: a MODELED, banded reference the buyer READS beside the
// quote — never a verdict, never into the score. A spread vs a SIMULATED basket
// is a rehearsal, so it wears BOTH honesty axes (feed = LivenessPill "Sample",
// epistemic = ModelMarker "Model") and honest silence when there is no reference.
const SpreadCell: React.FC<{ result: QuoteSpread; t: TFunction }> = ({
  result,
  t,
}) => {
  if (result.kind === 'silent') {
    // Honest silence — a specific reason, never a fabricated percentage.
    return (
      <span className="text-[10px] text-text-tertiary whitespace-normal">
        {t(SPREAD_SILENT_KEY[result.reason])}
      </span>
    );
  }
  const { spread, shouldCost, currency, basis } = result;
  return (
    <div className="flex flex-col items-start gap-1">
      {/* The spread RANGE — deliberately plain sans, NOT <Data>: the DP-3
          mono + data-navy grammar is reserved for OBSERVED data, and a modeled
          figure must never wear it (build-plan §2). Neutral tone, no semantic
          red/green — a spread vs a SIMULATED basket informs, it does not judge. */}
      <span className="text-xs font-semibold text-text-primary tabular-nums whitespace-nowrap">
        {t('sourcing.cmp.spread.range', {
          low: fmtSignedPct(spread.lowPct),
          high: fmtSignedPct(spread.highPct),
        })}
      </span>
      {/* The modeled anchor renders in the QUOTE's own currency — IDR is never
          shown as the basis for a USD deal (CI-2 currency-leg ruling). */}
      <span className="text-[10px] text-text-tertiary whitespace-nowrap">
        {t('sourcing.cmp.spread.vsModel', {
          value: formatMoney(shouldCost.midPerKg, currency),
        })}
      </span>
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <LivenessPill capability="commodityIntel" />
        <ModelMarker
          label={t('sourcing.cmp.model')}
          title={t('sourcing.cmp.modelTitle')}
        />
        {/* FX-converted marker — ONLY the FX_CONVERTED branch, where the
            should-cost was pushed through the FX pair (the more-modeled path).
            ENGINE_NATIVE reads the FX-free basis and carries no FX marker.
            2e-c-5: reads the BRANCH the engine took, not a boolean that meant
            "not the other branch" and would have claimed an FX conversion for a
            currency with no FX pair at all. */}
        {basis === 'FX_CONVERTED' && (
          <span
            title={t('sourcing.cmp.fxTitle')}
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-text-secondary border border-dashed border-border-input rounded px-1 py-px"
          >
            <ArrowLeftRight size={9} aria-hidden="true" />
            {t('sourcing.cmp.fx')}
          </span>
        )}
      </span>
    </div>
  );
};

const ComparisonCell: React.FC<{
  highlight?: boolean;
  children: React.ReactNode;
}> = ({ highlight, children }) => (
  <td
    className={`px-2 py-2 align-middle ${
      highlight ? 'border-x-2 border-action bg-action-soft/40' : ''
    }`}
  >
    {children}
  </td>
);

const matchesGroup = (r: RFQ, group: GroupTab): boolean => {
  if (group === 'all') return true;
  if (group === 'open') return r.status === 'Open' && !isAllResponded(r);
  if (group === 'pending') return r.status === 'Open' && isAllResponded(r);
  if (group === 'awarded') return r.status === 'Awarded';
  if (group === 'closed')
    return r.status === 'Closed' || r.status === 'Cancelled';
  return true;
};

interface DraftRfq {
  title: string;
  category: RFQCategory | '';
  materials: string[];
  totalQty: string;
  uom: (typeof UOM_OPTIONS)[number];
  budget: string;
  responseDeadline: string;
  awardDeadline: string;
  incoterms: string;
  paymentTerms: string;
  currency: 'IDR' | 'USD';
  invitedSupplierIds: string[];
}

const EMPTY_DRAFT: DraftRfq = {
  title: '',
  category: '',
  materials: [],
  totalQty: '',
  uom: 'KG',
  budget: '',
  responseDeadline: '',
  awardDeadline: '',
  incoterms: 'CIF Jakarta',
  paymentTerms: 'Net 30',
  currency: 'IDR',
  invitedSupplierIds: [],
};

interface SourcingWorkspaceProps {
  baseRfqs: RFQ[];
  quotations: Quotation[];
  suppliers: Supplier[];
}

const SourcingWorkspace: React.FC<SourcingWorkspaceProps> = ({
  baseRfqs,
  quotations,
  suppliers,
}) => {
  const supplierNameById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );
  const [group, setGroup] = useState<GroupTab>('all');
  const [selectedCats, setSelectedCats] = useState<RFQCategory[]>([]);
  const [search, setSearch] = useState('');
  // 2e-c-4 — the panel holds the selected RFQ's ID, and the RFQ itself is
  // DERIVED from the live query result. It used to hold the RFQ OBJECT, which
  // was a snapshot taken when the row was clicked: a command that mutated the
  // RFQ invalidated the query and re-fetched, but the open panel kept rendering
  // the stale copy. Award masked it (the panel closes on award), and the FX pin
  // exposed it — a buyer recorded a rate and the comparison went on refusing,
  // because the panel was still reading an RFQ with no `fxPins` on it.
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [awardsOpen, setAwardsOpen] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  // DERIVED from the live list, so a command that mutates this RFQ is reflected
  // in the OPEN panel — the whole point of holding the id rather than the row.
  const selectedRfq = useMemo(
    () => (selectedRfqId ? (baseRfqs.find((r) => r.id === selectedRfqId) ?? null) : null),
    [baseRfqs, selectedRfqId],
  );
  // 2e-c-4 — the pin draft a buyer confirms before a rate is recorded. Null =
  // no dialog. Recording the basis a contract will be awarded on is a governed
  // act, so it is confirm-before-commit like every other one on this surface.
  const [pinDraft, setPinDraft] = useState<PinDraft | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // §73 — the seat's authority over `t_rfq_create` (atom `rfq:create`,
  // held by `procurement`). One verb, one notice, one placement.
  const rfqCreateAvailability = useVerbAvailability('rfq:create');
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState<DraftRfq>(EMPTY_DRAFT);
  const [supplierSearch, setSupplierSearch] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  const createMutation = useRfqCreate();
  const awardMutation = useRfqAward();
  const cancelMutation = useRfqCancel();
  const reopenMutation = useRfqReopen();
  const publishMutation = useRfqPublish();
  const reviewMutation = useQuotationReview();
  const fxPinMutation = useRfqFxPin();

  const openRfq = (r: RFQ) => {
    setSelectedRfqId(r.id);
    setSelectedQuoteId(null);
  };

  // Award the selected quotation (fires the cascade source t_rfq_award): the
  // winner is awarded, every other quotation on the RFQ is rejected, and the
  // reads re-derive. Honest toast; a failed dispatch surfaces its reason.
  // 2e-c-4 — record (or supersede) the FX basis. The rate and the vintage are
  // both read ONCE here, through the pure gates, and the parsed values are what
  // the dispatch carries: the number the buyer confirmed is the number that
  // lands on the ledger, with no second reading to disagree with it.
  const handlePinConfirm = () => {
    if (!selectedRfq || !pinDraft) return;
    const rate = readFxRate(pinDraft.rate);
    const vintage = readFxVintage(pinDraft.asOf);
    // The dialog's own button is already disabled on a refusal; this is the
    // structural twin, so a keyboard or a future caller cannot route around it.
    if (!rate.ok || !vintage.ok) return;
    const currency = pinDraft.currency;
    const superseding = Boolean(pinDraft.superseding);
    fxPinMutation.mutate(
      {
        rfqId: selectedRfq.id,
        quote: currency,
        rate: rate.value,
        asOf: vintage.value,
        source: pinDraft.source,
        ...(pinDraft.rateType.trim() ? { rateType: pinDraft.rateType.trim() } : {}),
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.fxPinFailed.title'),
              description: result.reason ?? t('sourcing.toast.fxPinFailed.default'),
            });
            return;
          }
          setPinDraft(null);
          // Two distinct messages, because they are two distinct acts. A
          // supersede says the prior basis is KEPT — the buyer has not erased
          // anything, and the trail will show both.
          toast({
            variant: 'success',
            title: t(
              superseding ? 'sourcing.toast.fxSuperseded.title' : 'sourcing.toast.fxPinned.title',
              { currency },
            ),
            description: t(
              superseding ? 'sourcing.toast.fxSuperseded.desc' : 'sourcing.toast.fxPinned.desc',
            ),
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.fxPinFailed.title'),
            description: t('sourcing.toast.fxPinFailed.default'),
          }),
      },
    );
  };

  const handleAward = () => {
    if (!selectedRfq || !selectedQuoteId) return;
    const quote = quotesForSelected.find((q) => q.id === selectedQuoteId);
    if (!quote) return;
    const rfqNumber = selectedRfq.rfqNumber;
    awardMutation.mutate(
      {
        rfqId: selectedRfq.id,
        awardedQuotationId: quote.id,
        awardedSupplierId: quote.supplierId,
      },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.awardFailed.title'),
              description:
                result.reason ?? t('sourcing.toast.awardFailed.default'),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.awarded.title', { rfqNumber }),
            description: t('sourcing.toast.awarded.desc', {
              supplier:
                supplierNameById.get(quote.supplierId) ??
                t('sourcing.toast.awarded.fallbackSupplier'),
            }),
          });
          closePanel();
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.awardFailed.title'),
            description: t('sourcing.toast.awardFailed.dispatch'),
          }),
      },
    );
  };

  // Move a submitted quote into evaluation (fires t_quotation_review, Submitted →
  // Under Review). No cascade, no artifact — a buyer-side lifecycle advance. On a
  // non-failed outcome the quotation reads re-derive and the pill flips in place.
  const handleReview = (quotationId: string) => {
    reviewMutation.mutate(
      { quotationId },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.reviewFailed.title'),
              description:
                result.reason ?? t('sourcing.toast.reviewFailed.default'),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.reviewed.title'),
            description: t('sourcing.toast.reviewed.desc'),
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.reviewFailed.title'),
            description: t('sourcing.toast.reviewFailed.default'),
          }),
      },
    );
  };

  // PF-1a — publish the RFQ (fires t_rfq_publish, Draft → Open). THE ACT THAT
  // MAKES THE EVENT VISIBLE: supplier reads exclude Draft, so until this fires
  // the invited list has not been shown anything. The panel stays open — the
  // buyer's next move (award, cancel, pin a rate) is on this same RFQ, and the
  // board re-derives underneath it.
  const handlePublish = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    const invitedCount = selectedRfq.invitedSupplierIds.length;
    publishMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.publishFailed.title'),
              description:
                result.reason ?? t('sourcing.toast.publishFailed.default'),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.published.title', { rfqNumber }),
            // Manual plural selection, the convention this file already uses for
            // the create toast — not i18next's `_one/_other` suffixes, which are
            // configured nowhere here and would silently fall back.
            description: t(
              invitedCount === 1
                ? 'sourcing.toast.published.desc.one'
                : 'sourcing.toast.published.desc.other',
              { count: invitedCount },
            ),
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.publishFailed.title'),
            description: t('sourcing.toast.publishFailed.dispatch'),
          }),
      },
    );
  };

  // Cancel the RFQ (fires t_rfq_cancel, Draft/Open/Closed → Cancelled). Terminal
  // abandon — no cascade, no artifact. On success the board re-derives and the
  // panel closes (its local snapshot would otherwise show the stale prior status).
  const handleCancel = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    cancelMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.cancelFailed.title'),
              description:
                result.reason ?? t('sourcing.toast.cancelFailed.default'),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.cancelled.title', { rfqNumber }),
            description: t('sourcing.toast.cancelled.desc'),
          });
          closePanel();
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.cancelFailed.title'),
            description: t('sourcing.toast.cancelFailed.dispatch'),
          }),
      },
    );
  };

  // Reopen a closed RFQ (fires t_rfq_reopen, Closed → Open) for further responses.
  const handleReopen = () => {
    if (!selectedRfq) return;
    const rfqNumber = selectedRfq.rfqNumber;
    reopenMutation.mutate(
      { rfqId: selectedRfq.id },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.reopenFailed.title'),
              description:
                result.reason ?? t('sourcing.toast.reopenFailed.default'),
            });
            return;
          }
          toast({
            variant: 'success',
            title: t('sourcing.toast.reopened.title', { rfqNumber }),
            description: t('sourcing.toast.reopened.desc'),
          });
          closePanel();
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.reopenFailed.title'),
            description: t('sourcing.toast.reopenFailed.dispatch'),
          }),
      },
    );
  };

  const closePanel = () => {
    setSelectedRfqId(null);
    setSelectedQuoteId(null);
  };

  const quotesForSelected = useMemo(() => {
    if (!selectedRfq) return [];
    return quotations.filter((q) => q.rfqId === selectedRfq.id);
  }, [selectedRfq, quotations]);

  // 2e-c-4 — the currency is resolved ONCE, here, and every consumer reads the
  // resolved value. It used to be re-derived per cell (`q.currency ??
  // BASE_CURRENCY` at the unit-price, spread and total-price cells), which is
  // the same convention restated three times: three places to forget it, and
  // three places for the engine's view of a quote to drift from the surface's.
  const pricedQuotes = useMemo(
    () => quotesForSelected.map((q) => ({ ...q, currency: q.currency ?? BASE_CURRENCY })),
    [quotesForSelected],
  );

  // The actually-awarded quotation (Awarded RFQs only), resolved from the real
  // award metadata — NOT the AI-recommended pick, which may differ. Drives the
  // award-summary block so the panel names the true winner at a glance.
  const awardedQuote = useMemo(() => {
    if (!selectedRfq || selectedRfq.status !== 'Awarded') return null;
    return pricedQuotes.find((q) => q.id === selectedRfq.awardedQuotationId) ?? null;
  }, [selectedRfq, pricedQuotes]);

  // Governed derived scores (F0.3 quote-scoring primitive): the drawer COMPUTES
  // the comparison axes via `scoreQuotations` instead of reading the hand-authored
  // fixture literals (the fabricated-score root cause). price/leadTime are LIVE
  // (ratio-to-best over this RFQ's set), compliance/reliability are declared
  // SIMULATED, the composite carries weakest-link liveness, and topRanked =
  // argmax(composite) — replacing the old fixture `aiRecommended` flag.
  //
  // 2e-c-3 — the engine now returns a DISCRIMINATED OUTCOME. A multi-currency
  // set with no recorded FX basis (or one too old to rank on) is REFUSED, not
  // approximated: `scoreById` stays empty, `topRankedId` stays null, and the
  // surface says why. This is the operator's ruling (b) on 2e-c-2-FIND-01 —
  // withhold the ranking rather than publish one computed from bare numerals.
  const scoring = useMemo(
    () => scoreQuotations(pricedQuotes, { pins: selectedRfq?.fxPins }),
    [pricedQuotes, selectedRfq?.fxPins],
  );
  /** The non-base currencies actually bid on this RFQ — what needs a basis. */
  const foreignCurrencies = useMemo(
    () => [...new Set(pricedQuotes.map((q) => q.currency))].filter((c) => c !== BASE_CURRENCY),
    [pricedQuotes],
  );
  const scoreById = useMemo(
    () =>
      new Map(
        scoring.kind === 'scored' ? scoring.scores.map((s) => [s.quoteId, s] as const) : [],
      ),
    [scoring],
  );
  // A refused comparison has NO recommendation. Not a fallback to the first
  // quote, not the previous winner — nothing, because there is no basis on
  // which one bid beats another.
  const topRankedId =
    scoring.kind === 'scored'
      ? (scoring.scores.find((s) => s.topRanked)?.quoteId ?? null)
      : null;

  // The board reads the seam list ALONE. A created RFQ arrives here through
  // getRFQs after the create dispatch invalidates — never a client-fabricated
  // peer spread in (the retired `extraRfqs` anti-pattern, C6 §1).
  const rfqs = baseRfqs;

  const openWizard = () => {
    setDraft(EMPTY_DRAFT);
    setWizardStep(0);
    setSupplierSearch('');
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
  };

  const updateDraft = <K extends keyof DraftRfq>(
    key: K,
    value: DraftRfq[K],
  ) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const toggleMaterial = (m: string) => {
    setDraft((d) => ({
      ...d,
      materials: d.materials.includes(m)
        ? d.materials.filter((x) => x !== m)
        : [...d.materials, m],
    }));
  };

  const toggleSupplier = (id: string) => {
    setDraft((d) => ({
      ...d,
      invitedSupplierIds: d.invitedSupplierIds.includes(id)
        ? d.invitedSupplierIds.filter((x) => x !== id)
        : [...d.invitedSupplierIds, id],
    }));
  };

  // ── CP-0 · W1 · 2e-b-4a — the ONE read of the wizard's two numbers ─────────
  // The step gate, the review summary, and the dispatched payload ALL read this
  // one result. Before, each re-read `draft.totalQty` with its own recipe, so
  // the number that unlocked the wizard, the number the buyer confirmed on the
  // review step, and the number the RFQ was minted with could be three different
  // numbers — and "2,400" could be all three at once as NaN.
  const rfqNumbers = useMemo(() => normalizeRfqCreateDraft(draft), [draft]);

  // The two FIELD-LEVEL reads (2e-b-4b). Same parser, same strings — these
  // cannot disagree with the composite above; they exist because the composite
  // is sequential and so can only ever name one field at a time. On a fresh
  // wizard the quantity is blank, so without these the budget input could never
  // report its own refusal.
  const qtyRead = useMemo(() => readRfqTotalQty(draft.totalQty), [draft.totalQty]);
  const budgetRead = useMemo(() => readRfqBudget(draft.budget), [draft.budget]);

  const isStepValid = (step: number): boolean => {
    if (step === 0) {
      return (
        draft.title.trim().length > 0 &&
        draft.category !== '' &&
        draft.materials.length > 0 &&
        // The quantity must be READABLE and positive. The positivity half is the
        // pre-existing `Number(draft.totalQty) > 0` guard, preserved verbatim in
        // meaning: this batch makes the reading honest, it does not relax what
        // the wizard already refused. Whether a zero-quantity RFQ deserves a
        // NAMED refusal (the ZERO_PRICE / ZERO_MOQ precedent) instead of an
        // anonymous disabled button is 4a-FIND-02 — a commercial ruling, not a
        // parsing one, and not taken here.
        rfqNumbers.ok &&
        rfqNumbers.value.totalQty > 0
      );
    }
    if (step === 1) return draft.invitedSupplierIds.length > 0;
    if (step === 2) {
      if (!draft.responseDeadline || !draft.awardDeadline) return false;
      return new Date(draft.awardDeadline) > new Date(draft.responseDeadline);
    }
    return true;
  };

  // Raise the RFQ through the dispatcher (t_rfq_create) — the SAME governed path
  // the award/cancel/reopen verbs use, NOT a client-fabricated peer. The number is
  // store-assigned (honest); a non-failed outcome invalidates the reads so the new
  // Open RFQ arrives on the board via getRFQs. Both failure channels leave the
  // board unchanged and surface an honest toast.
  const submitWizard = () => {
    // The parse gate fires FIRST and it BLOCKS. `isStepValid(0)` already keeps
    // the wizard from reaching this step, so this is the SECOND lock: a
    // programmatic or race-y submit cannot slip an unreadable quantity into a
    // store-minted RFQ, where it would become the multiplicand of every
    // quotation's total price. The refusal is NAMED rather than folded into the
    // generic create-failed toast — "we cannot tell which number you mean" and
    // "you left this blank" ask the buyer for different things.
    if (!rfqNumbers.ok) {
      toast({
        variant: 'error',
        title: t('sourcing.toast.numberRefused.title'),
        description: t(rfqRefusalKey(rfqNumbers)),
      });
      return;
    }
    const invitedCount = draft.invitedSupplierIds.length;
    createMutation.mutate(
      // The SAME parsed values the gate above judged — the builder can no longer
      // re-read the strings and reach a different number (CP-0 §4).
      { payload: buildRfqCreatePayload(draft, rfqNumbers.value) },
      {
        onSuccess: (result) => {
          if (result.status === 'failed') {
            toast({
              variant: 'error',
              title: t('sourcing.toast.createFailed.title'),
              description: result.reason ?? t('sourcing.toast.createFailed.default'),
            });
            return;
          }
          setWizardOpen(false);
          toast({
            variant: 'success',
            title: t('sourcing.toast.created.title', { rfqNumber: result.entityId }),
            description: t(
              invitedCount === 1
                ? 'sourcing.toast.created.desc.one'
                : 'sourcing.toast.created.desc.other',
              { count: invitedCount },
            ),
          });
        },
        onError: () =>
          toast({
            variant: 'error',
            title: t('sourcing.toast.createFailed.title'),
            description: t('sourcing.toast.createFailed.dispatch'),
          }),
      },
    );
  };

  const aiRecommendedSuppliers = useMemo(() => {
    if (!draft.category) return [];
    const cats = CATEGORY_TO_SUPPLIER_CATEGORY[draft.category];
    return suppliers
      .filter((s) => cats.includes(s.category))
      .sort((a, b) => b.otif - a.otif)
      .slice(0, 4);
  }, [draft.category, suppliers]);

  const supplierTableFiltered = useMemo(() => {
    if (!draft.category) return [];
    const cats = CATEGORY_TO_SUPPLIER_CATEGORY[draft.category];
    return suppliers
      .filter((s) => cats.includes(s.category))
      .filter((s) => {
        if (!supplierSearch) return true;
        const q = supplierSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q)
        );
      });
  }, [draft.category, supplierSearch, suppliers]);

  const wizardSteps: WizardStep[] = [
    {
      id: 'scope',
      title: t('sourcing.wizard.step.scope.title'),
      shortTitle: t('sourcing.wizard.step.scope.short'),
      description: t('sourcing.wizard.step.scope.desc'),
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('sourcing.wizard.field.title')}{' '}
              <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft('title', e.target.value)}
              placeholder={t('sourcing.wizard.placeholder.title')}
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.category')}{' '}
                <span className="text-danger">*</span>
              </label>
              <select
                value={draft.category}
                onChange={(e) => {
                  updateDraft('category', e.target.value as RFQCategory);
                  updateDraft('materials', []);
                }}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                <option value="">{t('sourcing.wizard.select.category')}</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(t, c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.budget')}
              </label>
              {/* Ruling 6.2 — and load-bearing here in the worst way, because a
                  blank is LEGAL on this field. `type="number"` erases a token it
                  cannot parse to "" before React sees it, so the browser would
                  quietly convert a budget the buyer typed into the "not
                  specified" default with nobody told — the same silent
                  downgrade the MOQ field was rescued from in 2e-b-2. */}
              <input
                type="text"
                inputMode="decimal"
                value={draft.budget}
                onChange={(e) => updateDraft('budget', e.target.value)}
                placeholder={t('sourcing.wizard.placeholder.budget')}
                aria-label={t('sourcing.wizard.field.budget')}
                aria-invalid={!budgetRead.ok}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              {/* An untouched blank does not nag — it is this field's answer,
                  so `readRfqBudget` never refuses one. */}
              {!budgetRead.ok && (
                <div
                  role="alert"
                  data-testid="rfq-budget-refusal"
                  className="mt-1 text-[11px] text-danger"
                >
                  {t(RFQ_BUDGET_REFUSAL_KEY[budgetRead.reason])}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'QtyRefusalReason', term: budgetRead.reason }}
                  />
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('sourcing.wizard.field.materials')}{' '}
              <span className="text-danger">*</span>
            </label>
            {draft.category ? (
              <div className="flex flex-wrap gap-2">
                {MATERIAL_CATALOG[draft.category as RFQCategory].map((m) => {
                  const selected = draft.materials.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMaterial(m)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selected
                          ? 'bg-action text-white border border-action'
                          : 'bg-bg-surface text-text-secondary border border-border-input hover:border-action'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">
                {t('sourcing.wizard.materials.selectFirst')}
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.totalQty')}{' '}
                <span className="text-danger">*</span>
              </label>
              {/* Ruling 6.2 — the parse CANNOT fire behind `type="number"`,
                  which is what 2e-b-4a's smoke proved on a live id-ID browser:
                  "2.400" reached Review as 2,4 because the number input had
                  already rewritten the value per browser locale before React
                  saw it. The gate cannot refuse what it never sees. `min="0"`
                  goes with it — it was part of the number-input contract and
                  the positivity rule now lives in `isStepValid`, where it is
                  actually enforced. `type="text"` returns `.value` VERBATIM in
                  every locale, which is what makes the parser load-bearing. */}
              <input
                type="text"
                inputMode="decimal"
                value={draft.totalQty}
                onChange={(e) => updateDraft('totalQty', e.target.value)}
                placeholder={t('sourcing.wizard.placeholder.qty')}
                aria-label={t('sourcing.wizard.field.totalQty')}
                aria-invalid={draft.totalQty.trim() !== '' && !qtyRead.ok}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              {/* An untouched blank does not nag on sight — it refuses at the
                  gate (Next stays disabled) and says so on the field once the
                  buyer has typed something (the 2e-a price precedent). */}
              {draft.totalQty.trim() !== '' && !qtyRead.ok && (
                <div
                  role="alert"
                  data-testid="rfq-qty-refusal"
                  className="mt-1 text-[11px] text-danger"
                >
                  {t(RFQ_QTY_REFUSAL_KEY[qtyRead.reason])}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'QtyRefusalReason', term: qtyRead.reason }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.uom')}
              </label>
              <select
                value={draft.uom}
                onChange={(e) =>
                  updateDraft(
                    'uom',
                    e.target.value as (typeof UOM_OPTIONS)[number],
                  )
                }
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                {UOM_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'suppliers',
      title: t('sourcing.wizard.step.suppliers.title'),
      shortTitle: t('sourcing.wizard.step.suppliers.short'),
      description: t('sourcing.wizard.step.suppliers.desc'),
      content: (
        <div className="space-y-5">
          {aiRecommendedSuppliers.length > 0 && (
            <div className="bg-teal-soft border border-teal/20 rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-teal" />
                <h4 className="text-sm font-semibold text-text-primary">
                  {t('sourcing.wizard.ai.title')}
                </h4>
                <span className="text-xs text-text-tertiary">
                  {t('sourcing.wizard.ai.basis')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiRecommendedSuppliers.map((s) => {
                  const selected = draft.invitedSupplierIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        selected
                          ? 'bg-bg-surface border-action'
                          : 'bg-bg-surface border-border-subtle hover:border-action'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSupplier(s.id)}
                        className="mt-0.5 accent-teal"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-text-primary truncate">
                          {s.name}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {t('sourcing.wizard.supplierMeta', {
                            country: s.country,
                            otif: s.otif,
                            grade: s.scorecardGrade,
                          })}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <SearchBar
              value={supplierSearch}
              onChange={setSupplierSearch}
              placeholder={t('sourcing.wizard.search.supplier')}
            />
          </div>

          <div className="border border-border-subtle rounded-md overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold w-10"></th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('sourcing.wizard.col.supplier')}
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    {t('sourcing.wizard.col.country')}
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    {t('sourcing.wizard.col.otif')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplierTableFiltered.map((s) => {
                  const selected = draft.invitedSupplierIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-border-subtle hover:bg-bg-hover cursor-pointer"
                      onClick={() => toggleSupplier(s.id)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSupplier(s.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-teal"
                        />
                      </td>
                      <td className="px-3 py-2 text-text-primary">
                        {s.name}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        {s.country}
                      </td>
                      <td className="px-3 py-2 text-right text-text-secondary">
                        {s.otif}%
                      </td>
                    </tr>
                  );
                })}
                {supplierTableFiltered.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-sm text-text-tertiary py-6"
                    >
                      {draft.category
                        ? t('sourcing.wizard.supplier.noMatch')
                        : t('sourcing.wizard.supplier.selectCategory')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5 bg-teal-soft text-teal rounded-full px-3 py-1 text-xs font-semibold">
              {t(
                draft.invitedSupplierIds.length === 1
                  ? 'sourcing.wizard.selectedCount.one'
                  : 'sourcing.wizard.selectedCount.other',
                { count: draft.invitedSupplierIds.length },
              )}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'terms',
      title: t('sourcing.wizard.step.terms.title'),
      shortTitle: t('sourcing.wizard.step.terms.short'),
      description: t('sourcing.wizard.step.terms.desc'),
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.responseDeadline')}{' '}
                <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={draft.responseDeadline}
                onChange={(e) =>
                  updateDraft('responseDeadline', e.target.value)
                }
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.awardDeadline')}{' '}
                <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={draft.awardDeadline}
                onChange={(e) => updateDraft('awardDeadline', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              {draft.responseDeadline &&
                draft.awardDeadline &&
                new Date(draft.awardDeadline) <=
                  new Date(draft.responseDeadline) && (
                  <p className="text-xs text-danger mt-1">
                    {t('sourcing.wizard.awardAfterResponse')}
                  </p>
                )}
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.incoterms')}
              </label>
              <select
                value={draft.incoterms}
                onChange={(e) => updateDraft('incoterms', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                {INCOTERMS_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('sourcing.wizard.field.paymentTerms')}
              </label>
              <select
                value={draft.paymentTerms}
                onChange={(e) => updateDraft('paymentTerms', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                {PAYMENT_TERMS_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('sourcing.wizard.field.currency')}
            </label>
            <div className="flex gap-4">
              {(['IDR', 'USD'] as const).map((cur) => (
                <label
                  key={cur}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="currency"
                    value={cur}
                    checked={draft.currency === cur}
                    onChange={() => updateDraft('currency', cur)}
                    className="accent-teal"
                  />
                  <span className="text-sm text-text-secondary">{cur}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'review',
      title: t('sourcing.wizard.step.review.title'),
      shortTitle: t('sourcing.wizard.step.review.short'),
      description: t('sourcing.wizard.step.review.desc'),
      content: (
        <div className="space-y-5 text-sm">
          <ReviewSection
            label={t('sourcing.wizard.review.section.scope')}
            onEdit={() => setWizardStep(0)}
            rows={[
              [t('sourcing.wizard.review.row.title'), draft.title || '—'],
              [
                t('sourcing.wizard.review.row.category'),
                draft.category ? categoryLabel(t, draft.category) : '—',
              ],
              [
                t('sourcing.wizard.review.row.materials'),
                draft.materials.join(', ') || '—',
              ],
              // 2e-b-4a — the review reads the SAME parsed numbers the payload
              // ships, so what the buyer confirms here is definitionally what
              // gets minted. It used to re-run `Number(draft.totalQty)`, which
              // is how a buyer could confirm "2.400 KG" on this very screen and
              // raise an event for 2.4 KG.
              [
                t('sourcing.wizard.review.row.quantity'),
                rfqNumbers.ok
                  ? `${formatNumber(rfqNumbers.value.totalQty)} ${draft.uom}`
                  : '—',
              ],
              [
                t('sourcing.wizard.review.row.budget'),
                // "Not specified" is reserved for a genuine blank — an
                // unreadable budget is not an unstated one, so it reads as the
                // em dash. (Unreachable in practice: the step-0 gate blocks a
                // refusal from ever reaching this step.)
                !rfqNumbers.ok
                  ? '—'
                  : rfqNumbers.value.estimatedValue === undefined
                    ? t('sourcing.wizard.review.budgetUnspecified')
                    : formatIDR(rfqNumbers.value.estimatedValue),
              ],
            ]}
          />
          <ReviewSection
            label={t('sourcing.wizard.review.section.suppliers')}
            onEdit={() => setWizardStep(1)}
            rows={[
              [
                t('sourcing.wizard.review.row.invited'),
                draft.invitedSupplierIds.length > 0
                  ? t(
                      draft.invitedSupplierIds.length === 1
                        ? 'sourcing.wizard.review.invited.one'
                        : 'sourcing.wizard.review.invited.other',
                      { count: draft.invitedSupplierIds.length },
                    )
                  : '—',
              ],
              [
                t('sourcing.wizard.review.row.names'),
                draft.invitedSupplierIds
                  .map((id) => supplierNameById.get(id) ?? id)
                  .join(', ') || '—',
              ],
            ]}
          />
          <ReviewSection
            label={t('sourcing.wizard.review.section.terms')}
            onEdit={() => setWizardStep(2)}
            rows={[
              [
                t('sourcing.wizard.review.row.responseDeadline'),
                draft.responseDeadline || '—',
              ],
              [
                t('sourcing.wizard.review.row.awardDeadline'),
                draft.awardDeadline || '—',
              ],
              [t('sourcing.wizard.review.row.incoterms'), draft.incoterms],
              [t('sourcing.wizard.review.row.paymentTerms'), draft.paymentTerms],
              [t('sourcing.wizard.review.row.currency'), draft.currency],
            ]}
          />
        </div>
      ),
    },
  ];

  const lastUpdated = useMemo(
    () =>
      rfqs.reduce(
        (acc, r) => (r.createdAt > acc ? r.createdAt : acc),
        rfqs[0]?.createdAt ?? '',
      ),
    [rfqs],
  );

  const counts = useMemo(() => {
    const open = rfqs.filter(
      (r) => r.status === 'Open' && !isAllResponded(r),
    ).length;
    const pending = rfqs.filter(
      (r) => r.status === 'Open' && isAllResponded(r),
    ).length;
    const awarded = rfqs.filter((r) => r.status === 'Awarded').length;
    const closed = rfqs.filter(
      (r) => r.status === 'Closed' || r.status === 'Cancelled',
    ).length;
    return {
      all: rfqs.length,
      open,
      pending,
      awarded,
      closed,
    };
  }, [rfqs]);

  const kpis = useMemo(() => {
    const active = rfqs.filter((r) => r.status === 'Open').length;
    const awaiting = rfqs.filter((r) => {
      if (r.status !== 'Open') return false;
      const d = daysUntil(r.responseDeadline);
      return d <= 7 && d >= 0;
    }).length;
    const readyToAward = rfqs.filter(
      (r) => r.status === 'Open' && isAllResponded(r),
    ).length;
    const awardedQuarter = rfqs.filter((r) => {
      if (r.status !== 'Awarded') return false;
      const age = -daysUntil(r.createdAt);
      return age <= 90;
    }).length;
    return { active, awaiting, readyToAward, awardedQuarter };
  }, [rfqs]);

  const activeFiltered = useMemo(() => {
    return rfqs
      .filter((r) => r.status !== 'Awarded')
      .filter((r) => matchesGroup(r, group))
      .filter((r) =>
        selectedCats.length === 0
          ? true
          : selectedCats.includes(r.materialCategory),
      )
      .filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          r.rfqNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.materialIds.join(' ').toLowerCase().includes(q)
        );
      });
  }, [rfqs, group, selectedCats, search]);

  const awarded = useMemo(
    () => rfqs.filter((r) => r.status === 'Awarded'),
    [rfqs],
  );

  const toggleCategory = (cat: RFQCategory) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('sourcing.crumb.acquire'), t('sourcing.crumb.sourcing')]}
        title={t('sourcing.header.title')}
        subtitle={t('sourcing.header.subtitle')}
        actions={
          // §73 — the page-level create, WITHHELD rather than disabled. A seat
          // without `rfq:create` reads whose act it is instead of pressing a
          // button that opens a wizard the dispatcher will refuse at the end.
          // Export and Templates are reads holding no atom; they are not gated.
          <div className="flex items-center gap-3">
            <HandoffNotice availability={rfqCreateAvailability} testId="handoff-rfq-create" />
            <BulkActionsBar
              actions={[
                { label: t('sourcing.action.export'), icon: FileSpreadsheet },
                { label: t('sourcing.action.templates'), icon: FileText },
              ]}
              {...(rfqCreateAvailability.kind === 'held'
                ? {
                    primary: {
                      label: t('sourcing.action.newRfq'),
                      icon: Plus,
                      onClick: openWizard,
                    },
                  }
                : {})}
            />
          </div>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          kpis.active === 1
            ? 'sourcing.meta.summary.one'
            : 'sourcing.meta.summary.other',
          { count: kpis.active, date: formatDate(lastUpdated) },
        )}
        {/* D-CENSUS-8 — MARKER-SCOPE-01. The existing pills here are scoped to the
            commodity / market-intel panels; the RFQ pipeline itself was unmarked.
            PARTLY REAL: award genuinely dispatches through the wired `rfq` target
            and drives the quotation cascade, over a fixture RFQ set. */}
        <ProvenanceMarker capability="rfqs" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow={t('sourcing.kpi.active.eyebrow')}
          value={kpis.active.toString()}
          subtitle={t('sourcing.kpi.active.subtitle')}
          icon={FileText}
        />
        <KpiCard
          eyebrow={t('sourcing.kpi.awaiting.eyebrow')}
          value={kpis.awaiting.toString()}
          subtitle={t('sourcing.kpi.awaiting.subtitle')}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('sourcing.kpi.ready.eyebrow')}
          value={kpis.readyToAward.toString()}
          subtitle={t('sourcing.kpi.ready.subtitle')}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('sourcing.kpi.awarded.eyebrow')}
          value={kpis.awardedQuarter.toString()}
          subtitle={t('sourcing.kpi.awarded.subtitle')}
          icon={Award}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: t('sourcing.tab.all'), count: counts.all },
          { id: 'open', label: t('sourcing.tab.open'), count: counts.open },
          {
            id: 'pending',
            label: t('sourcing.tab.pending'),
            count: counts.pending,
          },
          {
            id: 'awarded',
            label: t('sourcing.tab.awarded'),
            count: counts.awarded,
          },
          {
            id: 'closed',
            label: t('sourcing.tab.closed'),
            count: counts.closed,
          },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('sourcing.filter.byCategory')}
          </div>
          <FilterChipsBar
            options={CATEGORY_OPTIONS.map((c) => ({
              id: c,
              label: categoryLabel(t, c),
            }))}
            value={selectedCats}
            onChange={toggleCategory}
            multiSelect
          />
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('sourcing.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('sourcing.table.col.rfq')}</TableHeaderCell>
            <TableHeaderCell>
              {t('sourcing.table.col.category')}
            </TableHeaderCell>
            <TableHeaderCell>
              {t('sourcing.table.col.responses')}
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('sourcing.table.col.qty')}
            </TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('sourcing.table.col.estValue')}
            </TableHeaderCell>
            <TableHeaderCell>
              {t('sourcing.table.col.responseDeadline')}
            </TableHeaderCell>
            <TableHeaderCell>{t('sourcing.table.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">
              {t('sourcing.table.col.actions')}
            </TableHeaderCell>
          </TableHeader>
          <tbody>
            {activeFiltered.map((r) => {
              const responded = r.respondedSupplierIds.length;
              const invited = r.invitedSupplierIds.length;
              const pct = invited === 0 ? 0 : (responded / invited) * 100;
              const days = daysUntil(r.responseDeadline);
              const deadlineTone =
                r.status !== 'Open'
                  ? 'text-text-secondary'
                  : days < 3
                    ? 'text-danger font-semibold'
                    : days < 7
                      ? 'text-warning-hover font-semibold'
                      : 'text-text-secondary';
              return (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => openRfq(r)}
                >
                  <TableCell>
                    <Data as="div" className="font-semibold text-text-primary">
                      {r.rfqNumber}
                    </Data>
                    <div className="text-xs text-text-tertiary mt-0.5 max-w-[20rem] truncate">
                      {r.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {categoryLabel(t, r.materialCategory)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary font-medium">
                      {responded} / {invited}
                    </div>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-bg-hover overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm text-text-secondary whitespace-nowrap">
                    <Data>{formatNumber(r.totalQty)} {r.uom}</Data>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(r.estimatedValue)}</Data>
                  </TableCell>
                  <TableCell>
                    <Data as="div" className={`text-sm whitespace-nowrap ${deadlineTone}`}>
                      {formatDate(r.responseDeadline)}
                    </Data>
                    {r.status === 'Open' && (
                      <div
                        className={`text-xs mt-0.5 ${
                          days < 0
                            ? 'text-danger'
                            : days < 3
                              ? 'text-danger'
                              : days < 7
                                ? 'text-warning-hover'
                                : 'text-text-tertiary'
                        }`}
                      >
                        {days < 0
                          ? t('sourcing.deadline.overdue', {
                              count: Math.abs(days),
                            })
                          : days === 0
                            ? t('sourcing.deadline.dueToday')
                            : t('sourcing.deadline.remaining', { count: days })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[r.status]}>
                      {r.status}
                    </StatusPill>
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
            {activeFiltered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('sourcing.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Awards history */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setAwardsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-hover transition-colors"
        >
          <div className="text-left">
            <h2 className="text-section text-text-primary">
              {t('sourcing.awards.title')}
            </h2>
            <p className="text-meta text-text-tertiary">
              {t(
                awarded.length === 1
                  ? 'sourcing.awards.count.one'
                  : 'sourcing.awards.count.other',
                { count: awarded.length },
              )}
            </p>
          </div>
          {awardsOpen ? (
            <ChevronUp size={16} className="text-text-tertiary" />
          ) : (
            <ChevronDown size={16} className="text-text-tertiary" />
          )}
        </button>
        {awardsOpen && (
          <Table>
            <TableHeader>
              <TableHeaderCell>{t('sourcing.awards.col.rfq')}</TableHeaderCell>
              <TableHeaderCell>
                {t('sourcing.awards.col.title')}
              </TableHeaderCell>
              <TableHeaderCell>
                {t('sourcing.awards.col.supplier')}
              </TableHeaderCell>
              <TableHeaderCell>
                {t('sourcing.awards.col.date')}
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('sourcing.awards.col.value')}
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                {t('sourcing.awards.col.actions')}
              </TableHeaderCell>
            </TableHeader>
            <tbody>
              {awarded.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => openRfq(r)}
                >
                  <TableCell className="font-semibold text-text-primary">
                    <Data>{r.rfqNumber}</Data>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary max-w-md truncate">
                    {r.title}
                  </TableCell>
                  <TableCell className="text-sm text-text-primary">
                    {r.awardedSupplierId
                      ? (supplierNameById.get(r.awardedSupplierId) ?? '—')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    <Data>{formatDate(r.awardDeadline)}</Data>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(r.estimatedValue)}</Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline-block"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {awarded.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center text-sm text-text-tertiary py-10"
                  >
                    {t('sourcing.awards.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </section>

      <SidePanel
        open={selectedRfq !== null}
        onClose={closePanel}
        title={
          selectedRfq
            ? t('sourcing.panel.title', {
                number: selectedRfq.rfqNumber,
                title: selectedRfq.title,
              })
            : ''
        }
        footerActions={
          selectedRfq && (
            <>
              <Button variant="secondary" icon={Download}>
                {t('sourcing.panel.exportComparison')}
              </Button>
              <Button
                variant={FOOTER_VARIANT(selectedRfq)}
                disabled={
                  selectedRfq.status === 'Open' &&
                  isAllResponded(selectedRfq) &&
                  !selectedQuoteId
                }
              >
                {FOOTER_LABEL(selectedRfq, t)}
              </Button>
            </>
          )
        }
      >
        {selectedRfq && (
          <div className="space-y-6">
            {selectedRfq.status === 'Awarded' && (
              <section className="bg-success-soft border border-success/30 rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={16} className="text-success" />
                  <h3 className="text-section text-text-primary">
                    {t('sourcing.panel.awardSummary')}
                  </h3>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-text-tertiary">
                      {t('sourcing.panel.awardedTo')}
                    </dt>
                    <dd className="text-text-primary font-semibold">
                      {selectedRfq.awardedSupplierId
                        ? (supplierNameById.get(selectedRfq.awardedSupplierId) ??
                          selectedRfq.awardedSupplierId)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">
                      {t('sourcing.panel.awardedValue')}
                    </dt>
                    <Data as="dd" className="text-text-primary font-semibold">
                      {/* 2e-c-4 — was an unconditional `formatIDR`, so an awarded USD or
                          EUR quote had its contract value restated in rupiah on
                          the ONE row recording what Paragon actually committed
                          to. The award summary is the last place a currency may
                          be assumed. */}
                      {awardedQuote
                        ? formatMoney(awardedQuote.totalPrice, awardedQuote.currency)
                        : '—'}
                    </Data>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">
                      {t('sourcing.panel.awardDate')}
                    </dt>
                    <Data as="dd" className="text-text-primary font-medium">
                      {formatDate(selectedRfq.awardDeadline)}
                    </Data>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">
                      {t('sourcing.panel.poIssued')}
                    </dt>
                    {/* Award mints no PO — issuance is a separate buyer verb. */}
                    <dd className="text-text-tertiary font-medium">—</dd>
                  </div>
                </dl>
              </section>
            )}

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('sourcing.panel.summary')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.category')}
                  </dt>
                  <dd className="text-text-primary font-medium">
                    {categoryLabel(t, selectedRfq.materialCategory)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.status')}
                  </dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selectedRfq.status]}>
                      {selectedRfq.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.created')}
                  </dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedRfq.createdAt)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.responseDeadline')}
                  </dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedRfq.responseDeadline)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.awardDeadline')}
                  </dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedRfq.awardDeadline)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.totalQty')}
                  </dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatNumber(selectedRfq.totalQty)} {selectedRfq.uom}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.estValue')}
                  </dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {formatIDR(selectedRfq.estimatedValue)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.currency')}
                  </dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.incoterms')}
                  </dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.incoterms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {t('sourcing.panel.field.paymentTerms')}
                  </dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.paymentTerms}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Lifecycle actions (F0.3): the non-award sourcing verbs, gated on
                the machine's legal from-states — cancel from Draft/Open/Closed
                (not a terminal Awarded/Cancelled), reopen from Closed only. */}
            {(selectedRfq.status === 'Draft' ||
              selectedRfq.status === 'Open' ||
              selectedRfq.status === 'Closed') && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  {t('sourcing.lifecycle.actions')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {/* PF-1a — PUBLISH. Wired here and not deferred to the surface
                      batch because D-1 made `Draft` the state EVERY newly-raised
                      RFQ lands in: without this button the buyer creates events
                      only suppliers cannot see, and the draft lane would be a
                      trap whose only exit is cancel.
                      ⚠️ OUTLINE, NOT SOLID (DP2-BUTTON-01, operator-corrected).
                      PF-1a shipped this solid, reasoning that publish "exposes
                      the event to the invited list" and therefore qualifies as
                      the irreversible commit. The reserved list is NAMED —
                      Award, Release payment, Post-to-SAP, Reject/Dispute,
                      Override-hold — and publish is not on it. Award already
                      holds the one solid on this surface. */}
                  {selectedRfq.status === 'Draft' && (
                    <Button
                      variant="outline"
                      icon={Send}
                      disabled={publishMutation.isPending}
                      onClick={handlePublish}
                    >
                      {publishMutation.isPending
                        ? t('sourcing.publish.submitting')
                        : t('sourcing.publish.submit')}
                    </Button>
                  )}
                  {selectedRfq.status === 'Closed' && (
                    <Button
                      variant="outline"
                      icon={RotateCcw}
                      disabled={reopenMutation.isPending}
                      onClick={handleReopen}
                    >
                      {reopenMutation.isPending
                        ? t('sourcing.reopen.submitting')
                        : t('sourcing.reopen.submit')}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    icon={Ban}
                    className="text-danger"
                    disabled={cancelMutation.isPending}
                    onClick={handleCancel}
                  >
                    {cancelMutation.isPending
                      ? t('sourcing.cancel.submitting')
                      : t('sourcing.cancel.submit')}
                  </Button>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('sourcing.panel.lifecycle')}
              </h3>
              <Timeline events={buildTimeline(selectedRfq, t)} />
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t(
                  quotesForSelected.length === 1
                    ? 'sourcing.cmp.title.one'
                    : 'sourcing.cmp.title.other',
                  { count: quotesForSelected.length },
                )}
              </h3>
              {/* 2e-c-3 — the refusal, stated ABOVE the table it applies to.
                  The bids are still shown (they are facts the supplier stated);
                  what is withheld is the RANKING, because ranking them would
                  mean comparing prices in currencies with no recorded basis.
                  Names the currencies, so the buyer knows exactly which pin to
                  record rather than being told something is wrong. */}
              {scoring.kind === 'refused' && (
                <div
                  role="status"
                  data-testid="fx-refusal"
                  className="mb-3 text-xs text-warning-hover bg-warning-soft border border-warning rounded-md px-3 py-2"
                >
                  {t(FX_REFUSAL_KEY[scoring.reason], {
                    currencies: scoring.currencies.join(', '),
                    // 2e-c-4 — a STALE refusal names the vintage it is judging.
                    // "Too old" without saying how old leaves the buyer unable
                    // to tell a rate from this morning apart from one from
                    // January. Empty for FX_UNPINNED, where no pin exists to
                    // have a vintage; that message does not interpolate it.
                    asOf: scoring.currencies
                      .map((c) => effectivePin(selectedRfq.fxPins, c)?.asOf)
                      .filter(Boolean)
                      .map((d) => formatDate(d as string))
                      .join(', '),
                  })}{' '}
                  <GlossaryTermChip
                    refTo={{ sourceType: 'FxRefusalReason', term: scoring.reason }}
                  />
                </div>
              )}
              {/* 2e-c-4 — THE RECORDED BASIS, on screen. A buyer must be able to
                  answer "what rate ranked this comparison, and how old is it?"
                  from the surface, not from an audit query. Rendered whenever a
                  foreign bid exists — including while the comparison is refused,
                  because that is exactly when a buyer needs to see what is
                  missing and act on it. */}
              {foreignCurrencies.length > 0 && (
                <FxBasisPanel
                  currencies={foreignCurrencies}
                  pins={selectedRfq.fxPins}
                  onPin={(c) => setPinDraft(blankPinDraft(c, effectivePin(selectedRfq.fxPins, c)))}
                  t={t}
                />
              )}
              {quotesForSelected.length === 0 ? (
                <div className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
                  {t('sourcing.cmp.empty')}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  {/* RFQ-DRAWER-01: one horizontally-scrolling table, no sticky
                      criterion column. The criterion (row-header) column and the
                      quote columns each carry a min-width and scroll together, so
                      they can never overlap — the pinned column previously
                      collided with the first quote and clipped its composite dial
                      (position:sticky + border-collapse). */}
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-2 py-2 font-semibold text-text-tertiary uppercase tracking-wider align-bottom w-36 min-w-[9rem]">
                          {t('sourcing.cmp.criterion')}
                        </th>
                        {quotesForSelected.map((q) => {
                          const supplier =
                            supplierNameById.get(q.supplierId) ?? q.supplierId;
                          return (
                            <th
                              key={q.id}
                              className={`align-bottom px-2 pt-2 pb-2 font-semibold text-text-primary text-left min-w-[10rem] ${
                                q.id === topRankedId
                                  ? 'border-2 border-action rounded-t-md bg-action-soft/40'
                                  : ''
                              }`}
                            >
                              {q.id === topRankedId && (
                                <span className="flex flex-col items-start gap-0.5 mb-1">
                                  <span className="inline-flex items-center gap-1 text-label text-teal uppercase">
                                    <Trophy size={10} />{' '}
                                    {t('sourcing.cmp.topRanked')}
                                  </span>
                                  {COMPOSITE_LIVENESS === 'simulated' && (
                                    <span
                                      title={t('sourcing.cmp.simulatedTitle')}
                                      className="inline-block normal-case text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px"
                                    >
                                      {t('sourcing.cmp.simulated')}
                                    </span>
                                  )}
                                </span>
                              )}
                              <div className="text-sm">{supplier}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="text-text-secondary">
                      <ComparisonRow label={t('sourcing.cmp.row.unitPrice')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data as="span" className="font-semibold text-text-primary whitespace-nowrap">
                              {formatMoney(q.unitPrice, q.currency)}/{selectedRfq.uom}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {/* CI-2 — the should-cost-vs-quote spread, read-only, right
                          under unit price. Per quote: the resolver joins the RFQ
                          material to a SIMULATED basket and returns a MODELED,
                          banded spread — or honest silence (tail / unit-mismatch /
                          unmapped). Never fed into the score; never a verdict. */}
                      <ComparisonRow label={t('sourcing.cmp.row.spread')}>
                        {pricedQuotes.map((q) => {
                          // 2e-c-1 — the policy/capability gate, ahead of the
                          // resolver. A bid in a currency the engine cannot
                          // price gets the same honest silence every other
                          // missing reference gets, with its OWN reason: the
                          // material is mapped, is not tail, and is priced by
                          // weight, so none of the other three would be true.
                          //
                          // 2e-c-5 — the currency now goes STRAIGHT to the
                          // resolver, which owns the gate. The surface no longer
                          // decides what the engine can price.
                          return (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <SpreadCell
                              result={spreadForQuote(
                                selectedRfq.materialIds[0],
                                selectedRfq.uom,
                                q.unitPrice,
                                q.currency,
                                SPREAD_DEPS,
                              )}
                              t={t}
                            />
                          </ComparisonCell>
                          );
                        })}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.totalPrice')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data as="span" className="font-semibold text-text-primary whitespace-nowrap">
                              {formatMoney(q.totalPrice, q.currency)}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {/* CP-0 2e-b-1a — the lead time is a REQUIRED ESTIMATE at
                          quote stage, not a commitment: a supplier cannot firmly
                          commit before final quantity, PO date and capacity are
                          known, and forcing "firm" here would buy false
                          precision. It is still scored and still ranked on — the
                          buyer simply sees it for what it is. The firm date is
                          confirmed at PO (a separate arc). */}
                      <ComparisonRow
                        label={t('sourcing.cmp.row.leadTime')}
                        tag={t('sourcing.cmp.estimated')}
                        tagTitle={t('sourcing.cmp.estimatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data as="span" className="whitespace-nowrap">
                              {t('sourcing.cmp.leadTimeDays', {
                                count: q.leadTimeDays,
                              })}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {/* CP-0 2e-b-2 (FIND-02) — the supplier's minimum order
                          quantity. It has always been collected on the quote
                          form and dropped before the payload, so until now this
                          comparison could not show it: a buyer weighing two
                          quotes had no way to see that one of them cannot be
                          ordered at the quantity being sourced. Rendered as the
                          fact it is — no verdict, no comparison against
                          `selectedRfq.totalQty`; that ruling is MOQ-FIND-01. */}
                      <ComparisonRow label={t('sourcing.cmp.row.moq')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            {q.moq === undefined ? (
                              // An ABSENT minimum is a real answer ("same as the
                              // RFQ quantity"), not missing data — so it reads as
                              // a sentence, never as a 0 or a dash.
                              <span className="text-text-tertiary">
                                {t('sourcing.cmp.moqNone')}
                              </span>
                            ) : (
                              <Data as="span" className="whitespace-nowrap">
                                {formatNumber(q.moq)} {selectedRfq.uom}
                              </Data>
                            )}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.paymentTerms')}>
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            {q.paymentTermsOffered}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.priceScore')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreOrSilence score={scoreById.get(q.id)?.priceScore} />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.leadTimeScore')}
                        tag={t('sourcing.cmp.estimated')}
                        tagTitle={t('sourcing.cmp.estimatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreOrSilence score={scoreById.get(q.id)?.leadTimeScore} />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.compliance')}
                        tag={
                          AXIS_LIVENESS.compliance === 'simulated'
                            ? t('sourcing.cmp.simulated')
                            : undefined
                        }
                        tagTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreOrSilence score={scoreById.get(q.id)?.complianceScore} />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.reliability')}
                        tag={
                          AXIS_LIVENESS.reliability === 'simulated'
                            ? t('sourcing.cmp.simulated')
                            : undefined
                        }
                        tagTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreOrSilence score={scoreById.get(q.id)?.reliabilityScore} />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.composite')}
                        tag={
                          COMPOSITE_LIVENESS === 'simulated'
                            ? t('sourcing.cmp.simulated')
                            : undefined
                        }
                        tagTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {pricedQuotes.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            {/* The composite is the number the recommendation is
                                argmax'd over, so a refused comparison must be
                                silent HERE above all — a 0 composite would read
                                as "scored, and worst". */}
                            {scoreById.get(q.id) === undefined ? (
                              <span className="text-text-tertiary">—</span>
                            ) : (
                              <ScoreBadge
                                score={scoreById.get(q.id)!.composite}
                                size="md"
                                variant="circular"
                              />
                            )}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      {selectedRfq.status === 'Awarded' ? (
                        // Awarded: the picker is moot — show the ACTUAL outcome
                        // per quote (winner Awarded, others Rejected), winner
                        // column highlighted. No re-award affordance.
                        <ComparisonRow label={t('sourcing.cmp.row.result')}>
                          {quotesForSelected.map((q) => (
                            <ComparisonCell
                              key={q.id}
                              highlight={q.id === selectedRfq.awardedQuotationId}
                            >
                              <StatusPill
                                variant={
                                  q.status === 'Awarded'
                                    ? 'success'
                                    : q.status === 'Rejected'
                                      ? 'danger'
                                      : 'neutral'
                                }
                              >
                                {q.status}
                              </StatusPill>
                            </ComparisonCell>
                          ))}
                        </ComparisonRow>
                      ) : (
                        <>
                        {/* Per-quote lifecycle status + the buyer's review move.
                            A freshly-submitted quote (t_quotation_submit) reads
                            'Submitted'; "Move to review" fires t_quotation_review
                            (Submitted → Under Review) in place. */}
                        <ComparisonRow label={t('sourcing.cmp.row.status')}>
                          {quotesForSelected.map((q) => (
                            <ComparisonCell key={q.id}>
                              <div className="flex flex-col items-center gap-1.5">
                                <StatusPill
                                  variant={q.status === 'Under Review' ? 'info' : 'neutral'}
                                >
                                  {q.status}
                                </StatusPill>
                                {q.status === 'Submitted' && (
                                  <button
                                    type="button"
                                    onClick={() => handleReview(q.id)}
                                    disabled={reviewMutation.isPending}
                                    className="text-xs font-semibold text-action hover:text-action-hover disabled:opacity-50"
                                  >
                                    {t('sourcing.cmp.moveToReview')}
                                  </button>
                                )}
                              </div>
                            </ComparisonCell>
                          ))}
                        </ComparisonRow>
                        <ComparisonRow label={t('sourcing.cmp.row.select')}>
                          {quotesForSelected.map((q) => (
                            <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="award-select"
                                  value={q.id}
                                  checked={selectedQuoteId === q.id}
                                  onChange={() => setSelectedQuoteId(q.id)}
                                  className="accent-teal"
                                />
                                <span className="text-xs text-text-secondary">
                                  {t('sourcing.cmp.award')}
                                </span>
                              </label>
                            </ComparisonCell>
                          ))}
                        </ComparisonRow>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {selectedRfq.status === 'Open' &&
              isAllResponded(selectedRfq) &&
              quotesForSelected.length > 0 && (
                <section className="bg-teal-soft border border-teal/20 rounded-md p-4">
                  <h3 className="text-section text-text-primary mb-2">
                    {t('sourcing.award.title')}
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    {selectedQuoteId
                      ? t('sourcing.award.selected', {
                          name:
                            supplierNameById.get(
                              quotesForSelected.find(
                                (q) => q.id === selectedQuoteId,
                              )?.supplierId ?? '',
                            ) ?? '—',
                        })
                      : t('sourcing.award.selectPrompt')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      icon={Trophy}
                      disabled={!selectedQuoteId || awardMutation.isPending}
                      onClick={handleAward}
                    >
                      {awardMutation.isPending
                        ? t('sourcing.award.submitting')
                        : t('sourcing.award.submit')}
                    </Button>
                    <Button variant="secondary">
                      {t('sourcing.award.rejectAll')}
                    </Button>
                  </div>
                </section>
              )}
          </div>
        )}
      </SidePanel>


      {/* CP-0 · 2e-c-4 — CONFIRM BEFORE COMMIT. Recording the basis a contract
          will be awarded on is a governed act that lands in the DR-10 trail, so
          it gets the same deliberate confirmation every other governed act on
          this surface gets. A SUPERSEDE reads as a NEW RECORDED ACT throughout —
          different title, different body, and an explicit statement that the
          prior basis is kept — because "edit" would describe a mutation that
          cannot happen and would misrepresent what the trail will show. */}
      {pinDraft && selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(13,27,42,0.4)]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t(
              pinDraft.superseding ? 'sourcing.fx.dialog.title.supersede' : 'sourcing.fx.dialog.title.record',
              { currency: pinDraft.currency },
            )}
            data-testid="fx-pin-dialog"
            className="w-full max-w-md bg-white rounded-lg border border-border-subtle p-5"
          >
            <h3 className="text-section text-text-primary mb-1">
              {t(
                pinDraft.superseding
                  ? 'sourcing.fx.dialog.title.supersede'
                  : 'sourcing.fx.dialog.title.record',
                { currency: pinDraft.currency },
              )}
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              {t(
                pinDraft.superseding
                  ? 'sourcing.fx.dialog.body.supersede'
                  : 'sourcing.fx.dialog.body.record',
                { currency: pinDraft.currency, base: BASE_CURRENCY },
              )}
            </p>

            {/* What is being replaced, stated in full — a buyer superseding a
                rate must see the one they are superseding, or they cannot tell
                whether they are correcting a typo or reacting to a real move. */}
            {pinDraft.superseding && (
              <div
                data-testid="fx-supersede-prior"
                className="mb-4 rounded-md border border-border-subtle bg-surface-subtle px-3 py-2 text-xs"
              >
                <span className="text-text-tertiary">
                  {t('sourcing.fx.dialog.prior')}{' '}
                </span>
                <Data as="span" className="font-semibold">
                  {formatMoney(pinDraft.superseding.rate, pinDraft.superseding.base)}
                </Data>
                <span className="text-text-secondary">
                  {' '}
                  {t('sourcing.cmp.fx.basis.asOf', {
                    date: formatDate(pinDraft.superseding.asOf),
                  })}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass} htmlFor="fx-rate">
                  {t('sourcing.fx.dialog.rate', {
                    currency: pinDraft.currency,
                    base: BASE_CURRENCY,
                  })}
                </label>
                {/* type="text", NOT number (Ruling 6.2): a number input lets the
                    BROWSER rewrite the value per its own locale before React
                    sees it, which is how a locale-ambiguous rate would bypass
                    the one parse entirely. */}
                <input
                  id="fx-rate"
                  type="text"
                  inputMode="decimal"
                  // Not "17.250": a placeholder must never model a token the
                  // field would refuse as ambiguous.
                  placeholder="17250"
                  aria-invalid={pinDraft.rate.trim() !== '' && !readFxRate(pinDraft.rate).ok}
                  value={pinDraft.rate}
                  onChange={(e) => setPinDraft({ ...pinDraft, rate: e.target.value })}
                  className={inputClass}
                />
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('sourcing.fx.dialog.rateHint')}
                </div>
                {/* An untouched blank does not nag; a TYPED rate that cannot be
                    read says so, and says what to do about it. */}
                <FieldRefusal
                  messageKey={fxRateRefusalKey(pinDraft.rate)}
                  testId="fx-rate-refusal"
                  t={t}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="fx-asof">
                  {t('sourcing.fx.dialog.asOf')}
                </label>
                <input
                  id="fx-asof"
                  type="date"
                  value={pinDraft.asOf}
                  onChange={(e) => setPinDraft({ ...pinDraft, asOf: e.target.value })}
                  className={inputClass}
                />
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('sourcing.fx.dialog.asOfHint', { days: FX_PIN_MAX_AGE_DAYS })}
                </div>
                <FieldRefusal
                  messageKey={fxVintageRefusalKey(pinDraft.asOf)}
                  testId="fx-asof-refusal"
                  t={t}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="fx-source">
                  {t('sourcing.fx.dialog.source')}
                </label>
                <select
                  id="fx-source"
                  value={pinDraft.source}
                  onChange={(e) =>
                    setPinDraft({ ...pinDraft, source: e.target.value as FxPinSource })
                  }
                  className={inputClass}
                >
                  <option value="MANUAL">{t('sourcing.cmp.fx.basis.source.MANUAL')}</option>
                  <option value="SAP_EXHGRATE">
                    {t('sourcing.cmp.fx.basis.source.SAP_EXHGRATE')}
                  </option>
                </select>
              </div>

              {/* Only meaningful for an SAP-sourced rate: a MANUAL pin has no
                  rate type, and offering the field would invite a buyer to
                  dress a typed number as an SAP-governed one. */}
              {pinDraft.source === 'SAP_EXHGRATE' && (
                <div>
                  <label className={labelClass} htmlFor="fx-ratetype">
                    {t('sourcing.fx.dialog.rateType')}
                  </label>
                  <input
                    id="fx-ratetype"
                    type="text"
                    placeholder="M"
                    value={pinDraft.rateType}
                    onChange={(e) => setPinDraft({ ...pinDraft, rateType: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" onClick={() => setPinDraft(null)}>
                {t('sourcing.fx.dialog.cancel')}
              </Button>
              {/* DP2-BUTTON-01: SOLID is reserved for the irreversible commit,
                  and this is one — an appended pin cannot be taken back, only
                  superseded. */}
              <Button
                variant="outline"
                onClick={handlePinConfirm}
                disabled={
                  !readFxRate(pinDraft.rate).ok ||
                  !readFxVintage(pinDraft.asOf).ok ||
                  fxPinMutation.isPending
                }
              >
                {fxPinMutation.isPending
                  ? t('sourcing.fx.dialog.submitting')
                  : t(
                      pinDraft.superseding
                        ? 'sourcing.fx.dialog.confirm.supersede'
                        : 'sourcing.fx.dialog.confirm.record',
                    )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(13,27,42,0.4)]">
          <Wizard
            steps={wizardSteps}
            currentStep={wizardStep}
            onStepChange={setWizardStep}
            onCancel={closeWizard}
            onComplete={submitWizard}
            isStepValid={isStepValid}
            completeLabel={t('sourcing.wizard.complete')}
          />
        </div>
      )}
    </AppShellV2>
  );
};

// Wrapper: reads the buyer-side sourcing aggregates through the scoped hooks and
// renders the four honest states; the workspace inner keeps its local (Phase-2′,
// non-persisting) RFQ-creation wizard state seeded from the resolved reads.
const BuyerSourcing: React.FC = () => {
  const { t } = useTranslation();
  const sourcingCrumb = [
    t('sourcing.crumb.acquire'),
    t('sourcing.crumb.sourcing'),
  ];
  const rfqsQuery = useRFQs();
  const quotationsQuery = useQuotations();
  const suppliersQuery = useSuppliers();

  if (
    rfqsQuery.isPending ||
    quotationsQuery.isPending ||
    suppliersQuery.isPending
  )
    return <LoadingState breadcrumb={sourcingCrumb} />;
  if (rfqsQuery.isError || quotationsQuery.isError || suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={sourcingCrumb}
        error={
          rfqsQuery.error ?? quotationsQuery.error ?? suppliersQuery.error
        }
        onRetry={() => {
          rfqsQuery.refetch();
          quotationsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );

  const baseRfqs = rfqsQuery.data?.items ?? [];
  if (baseRfqs.length === 0)
    return (
      <EmptyState
        breadcrumb={sourcingCrumb}
        title={t('sourcing.state.empty.title')}
        subtitle={t('sourcing.state.empty.subtitle')}
        message={t('sourcing.state.empty.message')}
      />
    );

  return (
    <SourcingWorkspace
      baseRfqs={baseRfqs}
      quotations={quotationsQuery.data?.items ?? []}
      suppliers={suppliersQuery.data?.items ?? []}
    />
  );
};

export default BuyerSourcing;
