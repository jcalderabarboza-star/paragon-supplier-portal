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
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
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
import Button from '../components/ui-v2/Button';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import { useToast } from '../hooks/useToast';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useRFQs, useQuotations, useSuppliers } from '../services/query/hooks';
import { useRfqCreate, useRfqAward, useRfqCancel, useRfqReopen } from '../services/query/commandHooks';
import { buildRfqCreatePayload } from './sourcing/rfqCreateModel';
import {
  scoreQuotations,
  AXIS_LIVENESS,
  COMPOSITE_LIVENESS,
} from '../lib/quoteScore';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { RFQ, RFQCategory, RFQStatus } from '../data/mockRfqs';
import type { Quotation } from '../data/mockQuotations';
import type { Supplier } from '../services/data/types';

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
    'Givaudan Citrus Compound',
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

const formatIDR = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number): string =>
  new Intl.NumberFormat('id-ID').format(value);

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

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

const FOOTER_LABEL = (r: RFQ, t: TFunction): string => {
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
  // A declared-SIMULATED axis (compliance/reliability/composite): the value is
  // shown but honestly marked as a rehearsal awaiting a live source. LIVE axes
  // (price/leadTime) render plain.
  sim?: boolean;
  simLabel?: string;
  simTitle?: string;
  children: React.ReactNode;
}> = ({ label, sim, simLabel, simTitle, children }) => (
  <tr className="border-t border-border-subtle">
    <th
      scope="row"
      className="text-left px-2 py-2 font-medium text-text-tertiary uppercase tracking-wider text-[10px] w-36 min-w-[9rem] align-middle"
    >
      {label}
      {sim && (
        <span
          title={simTitle}
          className="ml-1.5 inline-block normal-case tracking-normal text-[9px] font-medium text-text-tertiary border border-border-subtle rounded px-1 py-px align-middle"
        >
          {simLabel}
        </span>
      )}
    </th>
    {children}
  </tr>
);

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
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  const [awardsOpen, setAwardsOpen] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState<DraftRfq>(EMPTY_DRAFT);
  const [supplierSearch, setSupplierSearch] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  const createMutation = useRfqCreate();
  const awardMutation = useRfqAward();
  const cancelMutation = useRfqCancel();
  const reopenMutation = useRfqReopen();

  const openRfq = (r: RFQ) => {
    setSelectedRfq(r);
    setSelectedQuoteId(null);
  };

  // Award the selected quotation (fires the cascade source t_rfq_award): the
  // winner is awarded, every other quotation on the RFQ is rejected, and the
  // reads re-derive. Honest toast; a failed dispatch surfaces its reason.
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
    setSelectedRfq(null);
    setSelectedQuoteId(null);
  };

  const quotesForSelected = useMemo(() => {
    if (!selectedRfq) return [];
    return quotations.filter((q) => q.rfqId === selectedRfq.id);
  }, [selectedRfq, quotations]);

  // The actually-awarded quotation (Awarded RFQs only), resolved from the real
  // award metadata — NOT the AI-recommended pick, which may differ. Drives the
  // award-summary block so the panel names the true winner at a glance.
  const awardedQuote = useMemo(() => {
    if (!selectedRfq || selectedRfq.status !== 'Awarded') return null;
    return quotesForSelected.find((q) => q.id === selectedRfq.awardedQuotationId) ?? null;
  }, [selectedRfq, quotesForSelected]);

  // Governed derived scores (F0.3 quote-scoring primitive): the drawer COMPUTES
  // the comparison axes via `scoreQuotations` instead of reading the hand-authored
  // fixture literals (the fabricated-score root cause). price/leadTime are LIVE
  // (ratio-to-best over this RFQ's set), compliance/reliability are declared
  // SIMULATED, the composite carries weakest-link liveness, and topRanked =
  // argmax(composite) — replacing the old fixture `aiRecommended` flag.
  const quoteScores = useMemo(
    () => scoreQuotations(quotesForSelected),
    [quotesForSelected],
  );
  const scoreById = useMemo(
    () => new Map(quoteScores.map((s) => [s.quoteId, s])),
    [quoteScores],
  );
  const topRankedId = quoteScores.find((s) => s.topRanked)?.quoteId ?? null;

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

  const isStepValid = (step: number): boolean => {
    if (step === 0) {
      return (
        draft.title.trim().length > 0 &&
        draft.category !== '' &&
        draft.materials.length > 0 &&
        Number(draft.totalQty) > 0
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
    const invitedCount = draft.invitedSupplierIds.length;
    createMutation.mutate(
      { payload: buildRfqCreatePayload(draft) },
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
              <input
                type="number"
                value={draft.budget}
                onChange={(e) => updateDraft('budget', e.target.value)}
                placeholder={t('sourcing.wizard.placeholder.budget')}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
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
              <input
                type="number"
                min="0"
                value={draft.totalQty}
                onChange={(e) => updateDraft('totalQty', e.target.value)}
                placeholder={t('sourcing.wizard.placeholder.qty')}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
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
              [
                t('sourcing.wizard.review.row.quantity'),
                draft.totalQty
                  ? `${formatNumber(Number(draft.totalQty))} ${draft.uom}`
                  : '—',
              ],
              [
                t('sourcing.wizard.review.row.budget'),
                draft.budget
                  ? formatIDR(Number(draft.budget))
                  : t('sourcing.wizard.review.budgetUnspecified'),
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
          <BulkActionsBar
            actions={[
              { label: t('sourcing.action.export'), icon: FileSpreadsheet },
              { label: t('sourcing.action.templates'), icon: FileText },
            ]}
            primary={{
              label: t('sourcing.action.newRfq'),
              icon: Plus,
              onClick: openWizard,
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          kpis.active === 1
            ? 'sourcing.meta.summary.one'
            : 'sourcing.meta.summary.other',
          { count: kpis.active, date: formatDate(lastUpdated) },
        )}
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
                variant="primary"
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
                      {awardedQuote ? formatIDR(awardedQuote.totalPrice) : '—'}
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
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data as="span" className="font-semibold text-text-primary whitespace-nowrap">
                              {formatIDR(q.unitPrice)}/{selectedRfq.uom}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.totalPrice')}>
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data as="span" className="font-semibold text-text-primary whitespace-nowrap">
                              {formatIDR(q.totalPrice)}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.leadTime')}>
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <Data as="span" className="whitespace-nowrap">
                              {t('sourcing.cmp.leadTimeDays', {
                                count: q.leadTimeDays,
                              })}
                            </Data>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label={t('sourcing.cmp.row.paymentTerms')}>
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            {q.paymentTermsOffered}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.priceScore')}
                      >
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreBadge
                              score={scoreById.get(q.id)?.priceScore ?? 0}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.leadTimeScore')}
                      >
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreBadge
                              score={scoreById.get(q.id)?.leadTimeScore ?? 0}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.compliance')}
                        sim={AXIS_LIVENESS.compliance === 'simulated'}
                        simLabel={t('sourcing.cmp.simulated')}
                        simTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreBadge
                              score={scoreById.get(q.id)?.complianceScore ?? 0}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.reliability')}
                        sim={AXIS_LIVENESS.reliability === 'simulated'}
                        simLabel={t('sourcing.cmp.simulated')}
                        simTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreBadge
                              score={scoreById.get(q.id)?.reliabilityScore ?? 0}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow
                        label={t('sourcing.cmp.row.composite')}
                        sim={COMPOSITE_LIVENESS === 'simulated'}
                        simLabel={t('sourcing.cmp.simulated')}
                        simTitle={t('sourcing.cmp.simulatedTitle')}
                      >
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.id === topRankedId}>
                            <ScoreBadge
                              score={scoreById.get(q.id)?.composite ?? 0}
                              size="md"
                              variant="circular"
                            />
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
                      variant="primary"
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
