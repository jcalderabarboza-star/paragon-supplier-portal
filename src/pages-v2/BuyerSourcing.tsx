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
import Button from '../components/ui-v2/Button';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import { useToast } from '../hooks/useToast';
import { mockRfqs, RFQ, RFQCategory, RFQStatus } from '../data/mockRfqs';
import { mockQuotations } from '../data/mockQuotations';
import { mockSuppliers } from '../data/mockSuppliers';

type GroupTab = 'all' | 'open' | 'pending' | 'awarded' | 'closed';

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

const supplierNameById = new Map(
  mockSuppliers.map((s) => [s.id, s.name]),
);

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

const buildTimeline = (r: RFQ): TimelineEvent[] => {
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
      title: 'RFQ Drafted',
      timestamp: formatDate(r.createdAt),
      status: 'completed',
      icon: FileText,
    },
    {
      id: 'sent',
      title: `Sent to ${totalInvited} supplier${totalInvited === 1 ? '' : 's'}`,
      timestamp: isDraft ? undefined : formatDate(r.createdAt),
      status: isDraft ? 'pending' : 'completed',
      icon: Send,
    },
    {
      id: 'responses',
      title: `Responses Received (${responded}/${totalInvited})`,
      timestamp:
        responded > 0 ? `Latest: ${formatDate(r.responseDeadline)}` : undefined,
      status: isDraft
        ? 'pending'
        : allResponded || isAwarded || isClosed
          ? 'completed'
          : 'current',
      icon: CheckCircle2,
    },
    {
      id: 'evaluation',
      title: 'Evaluation',
      status: isAwarded || isClosed
        ? 'completed'
        : allResponded && isOpen
          ? 'current'
          : 'pending',
      icon: ClipboardCheck,
    },
    {
      id: 'awarded',
      title: 'Awarded',
      timestamp: isAwarded ? formatDate(r.awardDeadline) : undefined,
      status: isAwarded ? 'completed' : isClosed ? 'pending' : 'pending',
      icon: Trophy,
    },
    {
      id: 'closed',
      title: 'Closed',
      status: isClosed ? 'completed' : 'pending',
      icon: Archive,
    },
  ];
};

const FOOTER_LABEL = (r: RFQ): string => {
  if (r.status === 'Open') {
    return isAllResponded(r) ? 'Award RFQ' : 'Send reminder';
  }
  if (r.status === 'Awarded') return 'View award details';
  if (r.status === 'Closed' || r.status === 'Cancelled')
    return 'View final report';
  return 'Continue draft';
};

const ReviewSection: React.FC<{
  label: string;
  rows: [string, React.ReactNode][];
  onEdit: () => void;
}> = ({ label, rows, onEdit }) => (
  <section className="border border-border-subtle rounded-md">
    <header className="flex items-center justify-between px-4 py-2 bg-bg-hover">
      <span className="text-label text-text-tertiary uppercase">{label}</span>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-medium text-teal hover:text-teal-hover"
      >
        Edit
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

const ComparisonRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <tr className="border-t border-border-subtle">
    <th
      scope="row"
      className="text-left px-2 py-2 font-medium text-text-tertiary uppercase tracking-wider text-[10px] sticky left-0 bg-bg-surface z-10 align-middle"
    >
      {label}
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
      highlight ? 'border-x-2 border-teal bg-teal-soft/40' : ''
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

const BuyerSourcing: React.FC = () => {
  const [group, setGroup] = useState<GroupTab>('all');
  const [selectedCats, setSelectedCats] = useState<RFQCategory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  const [awardsOpen, setAwardsOpen] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [extraRfqs, setExtraRfqs] = useState<RFQ[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState<DraftRfq>(EMPTY_DRAFT);
  const [supplierSearch, setSupplierSearch] = useState('');
  const { toast } = useToast();

  const openRfq = (r: RFQ) => {
    setSelectedRfq(r);
    setSelectedQuoteId(null);
  };

  const closePanel = () => {
    setSelectedRfq(null);
    setSelectedQuoteId(null);
  };

  const quotesForSelected = useMemo(() => {
    if (!selectedRfq) return [];
    return mockQuotations.filter((q) => q.rfqId === selectedRfq.id);
  }, [selectedRfq]);

  const rfqs = useMemo(() => [...extraRfqs, ...mockRfqs], [extraRfqs]);

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

  const submitWizard = () => {
    const yr = new Date().getFullYear();
    const nextNum = mockRfqs.length + extraRfqs.length + 1;
    const newRfq: RFQ = {
      id: `rfq-new-${Date.now()}`,
      rfqNumber: `RFQ-${yr}-${String(nextNum).padStart(3, '0')}`,
      title: draft.title.trim(),
      materialCategory: draft.category as RFQCategory,
      materialIds: draft.materials,
      buyerId: 'buyer-001',
      status: 'Open',
      createdAt: new Date().toISOString().slice(0, 10),
      responseDeadline: draft.responseDeadline,
      awardDeadline: draft.awardDeadline,
      invitedSupplierIds: draft.invitedSupplierIds,
      respondedSupplierIds: [],
      totalQty: Number(draft.totalQty),
      uom: draft.uom,
      estimatedValue: Number(draft.budget) || 0,
      currency: 'IDR',
      incoterms: draft.incoterms,
      paymentTerms: draft.paymentTerms,
    };
    setExtraRfqs((prev) => [newRfq, ...prev]);
    setWizardOpen(false);
    toast({
      variant: 'success',
      title: `${newRfq.rfqNumber} created`,
      description: `Sent to ${newRfq.invitedSupplierIds.length} supplier${newRfq.invitedSupplierIds.length === 1 ? '' : 's'}`,
    });
  };

  const aiRecommendedSuppliers = useMemo(() => {
    if (!draft.category) return [];
    const cats = CATEGORY_TO_SUPPLIER_CATEGORY[draft.category];
    return mockSuppliers
      .filter((s) => cats.includes(s.category))
      .sort((a, b) => b.otif - a.otif)
      .slice(0, 4);
  }, [draft.category]);

  const supplierTableFiltered = useMemo(() => {
    if (!draft.category) return [];
    const cats = CATEGORY_TO_SUPPLIER_CATEGORY[draft.category];
    return mockSuppliers
      .filter((s) => cats.includes(s.category))
      .filter((s) => {
        if (!supplierSearch) return true;
        const q = supplierSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q)
        );
      });
  }, [draft.category, supplierSearch]);

  const wizardSteps: WizardStep[] = [
    {
      id: 'scope',
      title: 'Define Scope',
      shortTitle: 'Scope',
      description: 'What are you sourcing and how much?',
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              RFQ title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft('title', e.target.value)}
              placeholder="e.g. Q3 2026 Fragrance Sourcing — Floral Compounds"
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Material category <span className="text-danger">*</span>
              </label>
              <select
                value={draft.category}
                onChange={(e) => {
                  updateDraft('category', e.target.value as RFQCategory);
                  updateDraft('materials', []);
                }}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
              >
                <option value="">Select a category…</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Estimated budget (IDR)
              </label>
              <input
                type="number"
                value={draft.budget}
                onChange={(e) => updateDraft('budget', e.target.value)}
                placeholder="Optional"
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
              />
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              Specific material(s) <span className="text-danger">*</span>
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
                          ? 'bg-teal text-white border border-teal'
                          : 'bg-bg-surface text-text-secondary border border-border-input hover:border-teal'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">
                Select a category first to see available materials.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Total quantity <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={draft.totalQty}
                onChange={(e) => updateDraft('totalQty', e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                UoM
              </label>
              <select
                value={draft.uom}
                onChange={(e) =>
                  updateDraft(
                    'uom',
                    e.target.value as (typeof UOM_OPTIONS)[number],
                  )
                }
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
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
      title: 'Invite Suppliers',
      shortTitle: 'Suppliers',
      description: 'Pick suppliers to request quotes from.',
      content: (
        <div className="space-y-5">
          {aiRecommendedSuppliers.length > 0 && (
            <div className="bg-teal-soft border border-teal/20 rounded-md p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-teal" />
                <h4 className="text-sm font-semibold text-text-primary">
                  AI recommendation
                </h4>
                <span className="text-xs text-text-tertiary">
                  · Based on category, tier, and OTIF
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
                          ? 'bg-bg-surface border-teal'
                          : 'bg-bg-surface border-border-subtle hover:border-teal'
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
                          {s.country} · OTIF {s.otif}% · Grade{' '}
                          {s.scorecardGrade}
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
              placeholder="Search suppliers by name or country…"
            />
          </div>

          <div className="border border-border-subtle rounded-md overflow-hidden max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold w-10"></th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Supplier
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Country
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">OTIF</th>
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
                        ? 'No suppliers match the current search.'
                        : 'Select a category in step 1.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-text-secondary">
            <span className="inline-flex items-center gap-1.5 bg-teal-soft text-teal rounded-full px-3 py-1 text-xs font-semibold">
              {draft.invitedSupplierIds.length} supplier
              {draft.invitedSupplierIds.length === 1 ? '' : 's'} selected
            </span>
          </div>
        </div>
      ),
    },
    {
      id: 'terms',
      title: 'Terms & Deadlines',
      shortTitle: 'Terms',
      description: 'When are responses due and on what commercial terms?',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Response deadline <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={draft.responseDeadline}
                onChange={(e) =>
                  updateDraft('responseDeadline', e.target.value)
                }
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
              />
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Award deadline <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={draft.awardDeadline}
                onChange={(e) => updateDraft('awardDeadline', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
              />
              {draft.responseDeadline &&
                draft.awardDeadline &&
                new Date(draft.awardDeadline) <=
                  new Date(draft.responseDeadline) && (
                  <p className="text-xs text-danger mt-1">
                    Award deadline must be after response deadline.
                  </p>
                )}
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Incoterms
              </label>
              <select
                value={draft.incoterms}
                onChange={(e) => updateDraft('incoterms', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
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
                Payment terms
              </label>
              <select
                value={draft.paymentTerms}
                onChange={(e) => updateDraft('paymentTerms', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-teal"
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
              Currency
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
      title: 'Review & Submit',
      shortTitle: 'Review',
      description: 'Check the details before sending to suppliers.',
      content: (
        <div className="space-y-5 text-sm">
          <ReviewSection
            label="Scope"
            onEdit={() => setWizardStep(0)}
            rows={[
              ['Title', draft.title || '—'],
              ['Category', draft.category || '—'],
              ['Materials', draft.materials.join(', ') || '—'],
              [
                'Quantity',
                draft.totalQty
                  ? `${formatNumber(Number(draft.totalQty))} ${draft.uom}`
                  : '—',
              ],
              [
                'Budget',
                draft.budget ? formatIDR(Number(draft.budget)) : 'Not specified',
              ],
            ]}
          />
          <ReviewSection
            label="Suppliers"
            onEdit={() => setWizardStep(1)}
            rows={[
              [
                'Invited',
                draft.invitedSupplierIds.length > 0
                  ? `${draft.invitedSupplierIds.length} supplier${draft.invitedSupplierIds.length === 1 ? '' : 's'}`
                  : '—',
              ],
              [
                'Names',
                draft.invitedSupplierIds
                  .map((id) => supplierNameById.get(id) ?? id)
                  .join(', ') || '—',
              ],
            ]}
          />
          <ReviewSection
            label="Terms & Deadlines"
            onEdit={() => setWizardStep(2)}
            rows={[
              ['Response deadline', draft.responseDeadline || '—'],
              ['Award deadline', draft.awardDeadline || '—'],
              ['Incoterms', draft.incoterms],
              ['Payment terms', draft.paymentTerms],
              ['Currency', draft.currency],
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
        breadcrumb={['ACQUIRE', 'SOURCING & RFQ']}
        title="Sourcing & RFQ"
        subtitle="Active sourcing events, quote evaluation, and award history."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet },
              { label: 'Templates', icon: FileText },
            ]}
            primary={{ label: 'New RFQ', icon: Plus, onClick: openWizard }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {kpis.active} active RFQs · last updated {formatDate(lastUpdated)}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow="Active RFQs"
          value={kpis.active.toString()}
          subtitle="Open for response"
          icon={FileText}
        />
        <KpiCard
          eyebrow="Awaiting Response"
          value={kpis.awaiting.toString()}
          subtitle="Deadline within 7 days"
          icon={Clock}
        />
        <KpiCard
          eyebrow="Ready to Award"
          value={kpis.readyToAward.toString()}
          subtitle="All suppliers responded"
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow="Awarded (Quarter)"
          value={kpis.awardedQuarter.toString()}
          subtitle="Last 90 days"
          icon={Award}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'open', label: 'Open', count: counts.open },
          { id: 'pending', label: 'Pending Award', count: counts.pending },
          { id: 'awarded', label: 'Awarded', count: counts.awarded },
          { id: 'closed', label: 'Closed', count: counts.closed },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            Filter by category
          </div>
          <FilterChipsBar
            options={CATEGORY_OPTIONS.map((c) => ({ id: c, label: c }))}
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
          placeholder="Search by RFQ number, title, or material…"
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableHeaderCell>RFQ #</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Responses</TableHeaderCell>
            <TableHeaderCell className="text-right">Qty</TableHeaderCell>
            <TableHeaderCell className="text-right">
              Est. Value
            </TableHeaderCell>
            <TableHeaderCell>Response deadline</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
                      ? 'text-warning font-semibold'
                      : 'text-text-secondary';
              return (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => openRfq(r)}
                >
                  <TableCell>
                    <div className="font-semibold text-text-primary">
                      {r.rfqNumber}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5 max-w-[20rem] truncate">
                      {r.title}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {r.materialCategory}
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
                    {formatNumber(r.totalQty)} {r.uom}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {formatIDR(r.estimatedValue)}
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm whitespace-nowrap ${deadlineTone}`}>
                      {formatDate(r.responseDeadline)}
                    </div>
                    {r.status === 'Open' && (
                      <div
                        className={`text-xs mt-0.5 ${
                          days < 0
                            ? 'text-danger'
                            : days < 3
                              ? 'text-danger'
                              : days < 7
                                ? 'text-warning'
                                : 'text-text-tertiary'
                        }`}
                      >
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                            ? 'Due today'
                            : `${days}d remaining`}
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
                  No RFQs match the current filters.
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
            <h2 className="text-base font-semibold text-text-primary">
              Awards History
            </h2>
            <p className="text-meta text-text-tertiary">
              {awarded.length} awarded RFQ{awarded.length === 1 ? '' : 's'}
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
              <TableHeaderCell>RFQ #</TableHeaderCell>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Awarded supplier</TableHeaderCell>
              <TableHeaderCell>Award date</TableHeaderCell>
              <TableHeaderCell className="text-right">
                Award value
              </TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableHeader>
            <tbody>
              {awarded.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => openRfq(r)}
                >
                  <TableCell className="font-semibold text-text-primary">
                    {r.rfqNumber}
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
                    {formatDate(r.awardDeadline)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {formatIDR(r.estimatedValue)}
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
                    No awarded RFQs yet.
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
            ? `RFQ ${selectedRfq.rfqNumber} — ${selectedRfq.title}`
            : ''
        }
        footerActions={
          selectedRfq && (
            <>
              <Button variant="secondary" icon={Download}>
                Export comparison
              </Button>
              <Button
                variant="primary"
                disabled={
                  selectedRfq.status === 'Open' &&
                  isAllResponded(selectedRfq) &&
                  !selectedQuoteId
                }
              >
                {FOOTER_LABEL(selectedRfq)}
              </Button>
            </>
          )
        }
      >
        {selectedRfq && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Summary
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Category</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.materialCategory}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selectedRfq.status]}>
                      {selectedRfq.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Created</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedRfq.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Response deadline</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedRfq.responseDeadline)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Award deadline</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedRfq.awardDeadline)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Total qty</dt>
                  <dd className="text-text-primary font-medium">
                    {formatNumber(selectedRfq.totalQty)} {selectedRfq.uom}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Est. value</dt>
                  <dd className="text-text-primary font-semibold">
                    {formatIDR(selectedRfq.estimatedValue)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Currency</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Incoterms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.incoterms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment terms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedRfq.paymentTerms}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Lifecycle
              </h3>
              <Timeline events={buildTimeline(selectedRfq)} />
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Quote comparison ({quotesForSelected.length} quote
                {quotesForSelected.length === 1 ? '' : 's'})
              </h3>
              {quotesForSelected.length === 0 ? (
                <div className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
                  No quotes received yet.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-2 py-2 font-semibold text-text-tertiary uppercase tracking-wider align-bottom w-32 sticky left-0 bg-bg-surface z-10">
                          Criterion
                        </th>
                        {quotesForSelected.map((q) => {
                          const supplier =
                            supplierNameById.get(q.supplierId) ?? q.supplierId;
                          return (
                            <th
                              key={q.id}
                              className={`align-bottom px-2 pt-2 pb-2 font-semibold text-text-primary text-left min-w-[10rem] ${
                                q.aiRecommended
                                  ? 'border-2 border-teal rounded-t-md bg-teal-soft/40'
                                  : ''
                              }`}
                            >
                              {q.aiRecommended && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal uppercase tracking-wider mb-1">
                                  <Sparkles size={10} /> AI recommended
                                </span>
                              )}
                              <div className="text-sm">{supplier}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="text-text-secondary">
                      <ComparisonRow label="Unit Price">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <span className="font-semibold text-text-primary whitespace-nowrap">
                              {formatIDR(q.unitPrice)}/{selectedRfq.uom}
                            </span>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Total Price">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <span className="font-semibold text-text-primary whitespace-nowrap">
                              {formatIDR(q.totalPrice)}
                            </span>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Lead Time">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <span className="whitespace-nowrap">
                              {q.leadTimeDays} days
                            </span>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Payment Terms">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            {q.paymentTermsOffered}
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Compliance">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.complianceScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Price Score">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.priceScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Lead Time Score">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.leadTimeScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Reliability">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.reliabilityScore}
                              size="sm"
                              variant="bar"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="AI Composite">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
                            <ScoreBadge
                              score={q.aiCompositeScore}
                              size="md"
                              variant="circular"
                            />
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                      <ComparisonRow label="Select">
                        {quotesForSelected.map((q) => (
                          <ComparisonCell key={q.id} highlight={q.aiRecommended}>
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
                                Award
                              </span>
                            </label>
                          </ComparisonCell>
                        ))}
                      </ComparisonRow>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {selectedRfq.status === 'Open' &&
              isAllResponded(selectedRfq) &&
              quotesForSelected.length > 0 && (
                <section className="bg-teal-soft border border-teal/20 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Award action
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    {selectedQuoteId
                      ? `Selected: ${supplierNameById.get(quotesForSelected.find((q) => q.id === selectedQuoteId)?.supplierId ?? '') ?? '—'}`
                      : 'Select a quote above to enable the award action.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      icon={Trophy}
                      disabled={!selectedQuoteId}
                    >
                      Award to selected
                    </Button>
                    <Button variant="secondary">Reject all & resource</Button>
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
            completeLabel="Create & Send RFQ"
          />
        </div>
      )}
    </AppShellV2>
  );
};

export default BuyerSourcing;
