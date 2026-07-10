import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  FileText,
  ScrollText,
  AlertTriangle,
  Wallet,
  Plus,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CalendarDays,
  PenSquare,
  Handshake,
  CheckCircle2,
  Activity,
  Bell,
  Archive,
  Download,
  ShieldCheck,
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
import ScoreBadge from '../components/ui-v2/ScoreBadge';
import Data from '../components/ui-v2/Data';
import Timeline, { TimelineEvent } from '../components/ui-v2/Timeline';
import Button from '../components/ui-v2/Button';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import { useToast } from '../hooks/useToast';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useContracts, useObligations, useSuppliers } from '../services/query/hooks';
import type {
  ContractObligation,
  ObligationStatus,
} from '../data/mockObligations';
import type {
  Contract,
  ContractStatus,
  ContractType,
} from '../data/mockContracts';
import type { Supplier } from '../services/data/types';

type GroupTab =
  | 'all'
  | 'active'
  | 'expiring'
  | 'expired'
  | 'renewed'
  | 'draft'
  | 'terminated';

const TYPE_OPTIONS: ContractType[] = [
  'Supply',
  'Service',
  'Framework',
  'NDA',
  'Quality',
  'Pricing',
];

const STATUS_VARIANT: Record<
  ContractStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Draft: 'neutral',
  Active: 'success',
  Expiring: 'warning',
  Expired: 'danger',
  Renewed: 'info',
  Terminated: 'neutral',
};

const COUNTRY_FLAG: Record<string, string> = {
  ID: 'ID',
  MY: 'MY',
  DE: 'DE',
  FR: 'FR',
  CN: 'CN',
  SG: 'SG',
  IN: 'IN',
};


// Display-label maps: the underlying value stays the English enum literal
// (used for logic / storage / round-trip); only the visible label localizes.
const TYPE_LABEL_KEY: Record<ContractType, string> = {
  Supply: 'contracts.type.supply',
  Service: 'contracts.type.service',
  Framework: 'contracts.type.framework',
  NDA: 'contracts.type.nda',
  Quality: 'contracts.type.quality',
  Pricing: 'contracts.type.pricing',
};
const typeLabel = (t: TFunction, v: ContractType | string): string =>
  TYPE_LABEL_KEY[v as ContractType] ? t(TYPE_LABEL_KEY[v as ContractType]) : String(v);

const OWNER_LABEL_KEY: Record<string, string> = {
  Buyer: 'contracts.owner.buyer',
  Supplier: 'contracts.owner.supplier',
  Both: 'contracts.owner.both',
};
const ownerLabel = (t: TFunction, v: string): string =>
  OWNER_LABEL_KEY[v] ? t(OWNER_LABEL_KEY[v]) : v;

const CATEGORY_LABEL_KEY: Record<string, string> = {
  'Raw Material': 'contracts.category.rawMaterial',
  'Active Ingredient': 'contracts.category.activeIngredient',
  Fragrance: 'contracts.category.fragrance',
  Packaging: 'contracts.category.packaging',
  Other: 'contracts.category.other',
};
const catLabel = (t: TFunction, v: string): string =>
  CATEGORY_LABEL_KEY[v] ? t(CATEGORY_LABEL_KEY[v]) : v;

const formatIDR = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMonth = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const expiryTone = (days: number): string => {
  if (days < 0) return 'text-danger font-semibold';
  if (days < 30) return 'text-danger font-semibold';
  if (days < 90) return 'text-warning-hover font-semibold';
  return 'text-success';
};

const OBLIGATION_VARIANT: Record<
  ObligationStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Upcoming: 'info',
  'In Progress': 'warning',
  Completed: 'success',
  Overdue: 'danger',
};

const OBLIGATION_RANK: Record<ObligationStatus, number> = {
  Overdue: 0,
  'In Progress': 1,
  Upcoming: 2,
  Completed: 3,
};

const sortObligations = (a: ContractObligation, b: ContractObligation) => {
  const r = OBLIGATION_RANK[a.status] - OBLIGATION_RANK[b.status];
  if (r !== 0) return r;
  return a.dueDate.localeCompare(b.dueDate);
};

const shiftDays = (iso: string, days: number): string => {
  if (!iso) return iso;
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const buildContractTimeline = (c: Contract, t: TFunction): TimelineEvent[] => {
  const isDraft = c.status === 'Draft';
  const isActive = c.status === 'Active';
  const isExpiring = c.status === 'Expiring';
  const isExpired = c.status === 'Expired';
  const isRenewed = c.status === 'Renewed';
  const isTerminated = c.status === 'Terminated';

  const finalLabel = isExpired
    ? t('contracts.timeline.expired')
    : isRenewed
      ? t('contracts.timeline.renewed')
      : isTerminated
        ? t('contracts.timeline.terminated')
        : t('contracts.timeline.expiryRenewal');
  const finalIcon = isTerminated ? Archive : isRenewed ? RefreshCw : Archive;

  return [
    {
      id: 'drafted',
      title: t('contracts.timeline.drafted'),
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -14)) : undefined,
      status: 'completed',
      icon: PenSquare,
    },
    {
      id: 'negotiated',
      title: t('contracts.timeline.negotiated'),
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -7)) : undefined,
      status: isDraft ? 'current' : 'completed',
      icon: Handshake,
    },
    {
      id: 'signed',
      title: t('contracts.timeline.signed'),
      timestamp: c.signedDate ? formatDate(c.signedDate) : undefined,
      status: isDraft ? 'pending' : 'completed',
      icon: CheckCircle2,
    },
    {
      id: 'active',
      title: t('contracts.timeline.activePeriod'),
      timestamp: `${formatDate(c.startDate)} → ${formatDate(c.endDate)}`,
      status: isActive || isExpiring
        ? 'current'
        : isExpired || isRenewed || isTerminated
          ? 'completed'
          : 'pending',
      icon: Activity,
    },
    {
      id: 'renewal-decision',
      title: t('contracts.timeline.renewalDecision'),
      timestamp:
        c.endDate && c.noticeRequiredDays
          ? t('contracts.timeline.noticeBy', {
              date: formatDate(shiftDays(c.endDate, -c.noticeRequiredDays)),
            })
          : undefined,
      status: isExpiring
        ? 'current'
        : isExpired || isRenewed || isTerminated
          ? 'completed'
          : 'pending',
      icon: Bell,
    },
    {
      id: 'final',
      title: finalLabel,
      timestamp: isExpired || isRenewed || isTerminated
        ? formatDate(c.endDate)
        : undefined,
      status: isExpired || isRenewed || isTerminated ? 'completed' : 'pending',
      icon: finalIcon,
    },
  ];
};

const FOOTER_PRIMARY_LABEL = (c: Contract, t: TFunction): string => {
  if (c.status === 'Active' && c.daysUntilExpiry <= 90)
    return t('contracts.footer.initiateRenewal');
  if (c.status === 'Active') return t('contracts.footer.viewFull');
  if (c.status === 'Expiring') return t('contracts.footer.initiateRenewal');
  if (c.status === 'Expired') return t('contracts.footer.viewRenewalOptions');
  if (c.status === 'Draft') return t('contracts.footer.continueEditing');
  if (c.status === 'Renewed') return t('contracts.footer.viewPrevious');
  if (c.status === 'Terminated') return t('contracts.footer.viewTermination');
  return t('contracts.footer.viewFull');
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
        {t('contracts.wizard.review.edit')}
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

const BRAND_OPTIONS = ['Wardah', 'Emina', 'Make Over', 'Instaperfect', 'Kahf'];

const CATEGORY_OPTIONS = [
  'Raw Material',
  'Active Ingredient',
  'Fragrance',
  'Packaging',
  'Other',
];

const PAYMENT_TERMS_OPTIONS = [
  'Net 30',
  'Net 45',
  'Net 60',
  'Letter of Credit',
  'Advance Payment',
];

const INCOTERMS_OPTIONS = ['FOB', 'CIF', 'EXW', 'DDP', 'FCA'];

// i18n-defer: obligation-template seed titles. These strings are not just
// displayed — the selected title is stored verbatim as the obligation's
// `title` (and flows into the created contract / the Review + Selected tables),
// so they are seed DATA, not static scaffolding. Translating only the suggestion
// label would desync it from the stored/echoed value. Localize when obligations
// gain stable keys (real persistence), not in this string-sweep batch.
const OBLIGATION_SUGGESTIONS: Record<
  ContractType,
  { title: string; owner: 'Buyer' | 'Supplier' | 'Both' }[]
> = {
  Supply: [
    { title: 'Quarterly delivery performance report', owner: 'Supplier' },
    { title: 'Annual halal certificate renewal', owner: 'Supplier' },
    { title: 'Quality audit access', owner: 'Both' },
  ],
  Service: [
    { title: 'Monthly service review', owner: 'Both' },
    { title: 'SLA reporting', owner: 'Supplier' },
    { title: 'Annual contract review', owner: 'Both' },
  ],
  Framework: [
    { title: 'Quarterly volume review', owner: 'Both' },
    { title: 'Annual price benchmarking', owner: 'Buyer' },
    { title: 'Innovation pipeline review', owner: 'Supplier' },
  ],
  NDA: [
    { title: 'Annual confidentiality acknowledgment', owner: 'Both' },
    { title: 'Renewal decision before expiry', owner: 'Buyer' },
  ],
  Quality: [
    { title: 'Semi-annual on-site audit', owner: 'Both' },
    { title: 'Non-conformance closure SLA', owner: 'Supplier' },
    { title: 'Annual quality scorecard', owner: 'Both' },
  ],
  Pricing: [
    { title: 'Monthly price index publication', owner: 'Supplier' },
    { title: 'Quarterly business review', owner: 'Both' },
    { title: 'Annual price adjustment review', owner: 'Both' },
  ],
};

interface DraftObligation {
  title: string;
  owner: 'Buyer' | 'Supplier' | 'Both';
  dueDate: string;
}

interface DraftContract {
  title: string;
  type: ContractType | '';
  supplierId: string;
  category: string;
  brands: string[];
  startDate: string;
  endDate: string;
  autoRenewal: boolean;
  noticeRequiredDays: string;
  value: string;
  paymentTerms: string;
  incoterms: string;
  obligations: DraftObligation[];
}

const EMPTY_DRAFT: DraftContract = {
  title: '',
  type: '',
  supplierId: '',
  category: '',
  brands: [],
  startDate: '',
  endDate: '',
  autoRenewal: false,
  noticeRequiredDays: '90',
  value: '',
  paymentTerms: 'Net 30',
  incoterms: 'CIF Jakarta',
  obligations: [],
};

const PLACEHOLDER_DOCS = (c: Contract): {
  name: string;
  status: 'valid' | 'expiring' | 'expired';
}[] => {
  const docs: { name: string; status: 'valid' | 'expiring' | 'expired' }[] = [];
  if (c.category.toLowerCase().includes('raw') || c.category.toLowerCase().includes('fragrance')) {
    docs.push({ name: 'BPJPH Halal Certificate', status: 'valid' });
  }
  docs.push({ name: 'ISO 9001:2015', status: 'valid' });
  if (c.type === 'Quality' || c.type === 'Supply') {
    docs.push({ name: 'BPOM Registration', status: 'expiring' });
  }
  return docs;
};

const matchesGroup = (c: Contract, g: GroupTab): boolean => {
  if (g === 'all') return true;
  if (g === 'active') return c.status === 'Active';
  if (g === 'expiring')
    return c.status === 'Expiring' || (c.status === 'Active' && c.daysUntilExpiry <= 90 && c.daysUntilExpiry >= 0);
  if (g === 'expired') return c.status === 'Expired';
  if (g === 'renewed') return c.status === 'Renewed';
  if (g === 'draft') return c.status === 'Draft';
  if (g === 'terminated') return c.status === 'Terminated';
  return true;
};

interface ContractsWorkspaceProps {
  baseContracts: Contract[];
  obligations: ContractObligation[];
  suppliers: Supplier[];
}

const ContractsWorkspace: React.FC<ContractsWorkspaceProps> = ({
  baseContracts,
  obligations,
  suppliers,
}) => {
  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );
  const [group, setGroup] = useState<GroupTab>('all');
  const [selectedTypes, setSelectedTypes] = useState<ContractType[]>([]);
  const [search, setSearch] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );
  const [docsOpen, setDocsOpen] = useState(false);
  const [extraContracts, setExtraContracts] = useState<Contract[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState<DraftContract>(EMPTY_DRAFT);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [customObligationTitle, setCustomObligationTitle] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();

  const contracts = useMemo(
    () => [...extraContracts, ...baseContracts],
    [extraContracts, baseContracts],
  );

  const updateDraft = <K extends keyof DraftContract>(
    key: K,
    value: DraftContract[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const openWizard = () => {
    setDraft(EMPTY_DRAFT);
    setWizardStep(0);
    setSupplierSearch('');
    setCustomObligationTitle('');
    setWizardOpen(true);
  };

  const closeWizard = () => setWizardOpen(false);

  const toggleBrand = (b: string) =>
    setDraft((d) => ({
      ...d,
      brands: d.brands.includes(b)
        ? d.brands.filter((x) => x !== b)
        : [...d.brands, b],
    }));

  const toggleSuggestedObligation = (title: string, owner: DraftObligation['owner']) =>
    setDraft((d) => {
      const idx = d.obligations.findIndex((o) => o.title === title);
      if (idx >= 0) {
        return {
          ...d,
          obligations: d.obligations.filter((_, i) => i !== idx),
        };
      }
      return {
        ...d,
        obligations: [...d.obligations, { title, owner, dueDate: '' }],
      };
    });

  const addCustomObligation = () => {
    if (!customObligationTitle.trim()) return;
    setDraft((d) => ({
      ...d,
      obligations: [
        ...d.obligations,
        { title: customObligationTitle.trim(), owner: 'Both', dueDate: '' },
      ],
    }));
    setCustomObligationTitle('');
  };

  const removeObligation = (i: number) =>
    setDraft((d) => ({
      ...d,
      obligations: d.obligations.filter((_, idx) => idx !== i),
    }));

  const updateObligation = <K extends keyof DraftObligation>(
    i: number,
    key: K,
    value: DraftObligation[K],
  ) =>
    setDraft((d) => ({
      ...d,
      obligations: d.obligations.map((o, idx) =>
        idx === i ? { ...o, [key]: value } : o,
      ),
    }));

  const supplierTableFiltered = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q),
    );
  }, [supplierSearch, suppliers]);

  const isStepValid = (step: number): boolean => {
    if (step === 0) {
      return (
        draft.title.trim().length > 0 &&
        draft.type !== '' &&
        draft.supplierId !== '' &&
        draft.category !== ''
      );
    }
    if (step === 1) {
      if (!draft.startDate || !draft.endDate) return false;
      if (new Date(draft.endDate) <= new Date(draft.startDate)) return false;
      return Number(draft.value) > 0;
    }
    return true;
  };

  const submitWizard = () => {
    const yr = new Date().getFullYear();
    const nextNum = baseContracts.length + extraContracts.length + 1;
    const todayIso = new Date().toISOString().slice(0, 10);
    const end = new Date(draft.endDate);
    const today = new Date(todayIso);
    const daysUntilExpiry = Math.round(
      (end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );
    const newContract: Contract = {
      id: `ctr-new-${Date.now()}`,
      contractNumber: `CTR-${yr}-${String(nextNum).padStart(3, '0')}`,
      supplierId: draft.supplierId,
      title: draft.title.trim(),
      type: draft.type as ContractType,
      status: 'Draft',
      startDate: draft.startDate,
      endDate: draft.endDate,
      autoRenewal: draft.autoRenewal,
      noticeRequiredDays: Number(draft.noticeRequiredDays) || 0,
      value: Number(draft.value) || 0,
      currency: 'IDR',
      paymentTerms: draft.paymentTerms,
      incoterms: draft.incoterms,
      signedByBuyer: '—',
      signedBySupplier: '—',
      signedDate: '',
      obligationCount: draft.obligations.length,
      obligationsMet: 0,
      daysUntilExpiry,
      category: draft.category,
      brands: draft.brands,
      performanceScore: 0,
    };
    setExtraContracts((prev) => [newContract, ...prev]);
    setWizardOpen(false);
    toast({
      variant: 'success',
      title: t('contracts.toast.created.title', {
        number: newContract.contractNumber,
      }),
      description: t('contracts.toast.created.desc'),
    });
  };

  const wizardSteps: WizardStep[] = [
    {
      id: 'basics',
      title: t('contracts.wizard.step.basics.title'),
      shortTitle: t('contracts.wizard.step.basics.title'),
      description: t('contracts.wizard.step.basics.desc'),
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('contracts.wizard.field.title')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft('title', e.target.value)}
              placeholder={t('contracts.wizard.placeholder.title')}
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('contracts.wizard.field.type')} <span className="text-danger">*</span>
              </label>
              <select
                value={draft.type}
                onChange={(e) =>
                  updateDraft('type', e.target.value as ContractType)
                }
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                <option value="">{t('contracts.wizard.select.type')}</option>
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {typeLabel(t, opt)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('contracts.wizard.field.category')} <span className="text-danger">*</span>
              </label>
              <select
                value={draft.category}
                onChange={(e) => updateDraft('category', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                <option value="">{t('contracts.wizard.select.category')}</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {catLabel(t, c)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('contracts.wizard.field.supplier')} <span className="text-danger">*</span>
            </label>
            <div className="mb-2">
              <SearchBar
                value={supplierSearch}
                onChange={setSupplierSearch}
                placeholder={t('contracts.wizard.search.supplier')}
              />
            </div>
            <div className="border border-border-subtle rounded-md overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {supplierTableFiltered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => updateDraft('supplierId', s.id)}
                      className={`border-t border-border-subtle cursor-pointer hover:bg-bg-hover ${
                        draft.supplierId === s.id ? 'bg-action-soft' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="radio"
                          name="supplier"
                          checked={draft.supplierId === s.id}
                          onChange={() => updateDraft('supplierId', s.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-teal"
                        />
                      </td>
                      <td className="px-3 py-2 text-text-primary">{s.name}</td>
                      <td className="px-3 py-2 text-text-secondary">
                        {s.country} · {s.category}
                      </td>
                    </tr>
                  ))}
                  {supplierTableFiltered.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-sm text-text-tertiary py-6"
                      >
                        {t('contracts.wizard.supplier.noMatch')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('contracts.wizard.field.brands')}
            </label>
            <div className="flex flex-wrap gap-2">
              {BRAND_OPTIONS.map((b) => {
                const selected = draft.brands.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBrand(b)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selected
                        ? 'bg-action text-white border border-action'
                        : 'bg-bg-surface text-text-secondary border border-border-input hover:border-action'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'terms',
      title: t('contracts.wizard.step.terms.title'),
      shortTitle: t('contracts.wizard.step.terms.short'),
      description: t('contracts.wizard.step.terms.desc'),
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('contracts.wizard.field.startDate')} <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => updateDraft('startDate', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('contracts.wizard.field.endDate')} <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) => updateDraft('endDate', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              {draft.startDate &&
                draft.endDate &&
                new Date(draft.endDate) <= new Date(draft.startDate) && (
                  <p className="text-xs text-danger mt-1">
                    {t('contracts.wizard.endBeforeStart')}
                  </p>
                )}
            </div>
          </div>
          <div>
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoRenewal}
                onChange={(e) => updateDraft('autoRenewal', e.target.checked)}
                className="accent-teal w-4 h-4"
              />
              <span className="text-sm text-text-primary font-medium">
                {t('contracts.wizard.field.autoRenewal')}
              </span>
              <span className="text-xs text-text-tertiary">
                {t('contracts.wizard.autoRenewalHint')}
              </span>
            </label>
            {draft.autoRenewal && (
              <div className="mt-3 max-w-xs">
                <label className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('contracts.wizard.field.noticeDays')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={draft.noticeRequiredDays}
                  onChange={(e) =>
                    updateDraft('noticeRequiredDays', e.target.value)
                  }
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('contracts.wizard.field.value')} <span className="text-danger">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={draft.value}
              onChange={(e) => updateDraft('value', e.target.value)}
              placeholder="0"
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('contracts.wizard.field.paymentTerms')}
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
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                {t('contracts.wizard.field.incoterms')}
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
          </div>
        </div>
      ),
    },
    {
      id: 'obligations',
      title: t('contracts.wizard.step.obligations.title'),
      shortTitle: t('contracts.wizard.step.obligations.title'),
      description: t('contracts.wizard.step.obligations.desc'),
      content: (
        <div className="space-y-5">
          {draft.type && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">
                {t('contracts.wizard.obl.suggestedFor', {
                  type: typeLabel(t, draft.type),
                })}
              </h4>
              <div className="space-y-2">
                {OBLIGATION_SUGGESTIONS[draft.type as ContractType].map(
                  (s) => {
                    const selected = draft.obligations.some(
                      (o) => o.title === s.title,
                    );
                    return (
                      <label
                        key={s.title}
                        className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                          selected
                            ? 'bg-bg-surface border-action'
                            : 'bg-bg-surface border-border-subtle hover:border-action'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            toggleSuggestedObligation(s.title, s.owner)
                          }
                          className="mt-0.5 accent-teal"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary">
                            {s.title}
                          </div>
                          <div className="text-xs text-text-tertiary">
                            {t('contracts.wizard.obl.ownerLabel', {
                              owner: ownerLabel(t, s.owner),
                            })}
                          </div>
                        </div>
                      </label>
                    );
                  },
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-2">
              {t('contracts.wizard.obl.addCustom')}
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={customObligationTitle}
                onChange={(e) => setCustomObligationTitle(e.target.value)}
                placeholder={t('contracts.wizard.obl.customPlaceholder')}
                className="flex-1 bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              <Button
                variant="secondary"
                icon={Plus}
                onClick={addCustomObligation}
                disabled={!customObligationTitle.trim()}
              >
                {t('contracts.wizard.obl.add')}
              </Button>
            </div>
          </div>

          {draft.obligations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">
                {t('contracts.wizard.obl.selected', {
                  count: draft.obligations.length,
                })}
              </h4>
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs">
                    <tr>
                      <th className="text-left px-3 py-2">{t('contracts.wizard.obl.col.title')}</th>
                      <th className="text-left px-3 py-2">{t('contracts.wizard.obl.col.owner')}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">
                        {t('contracts.wizard.obl.col.dueDate')}
                      </th>
                      <th className="text-right px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.obligations.map((o, i) => (
                      <tr key={i} className="border-t border-border-subtle">
                        <td className="px-3 py-2 text-text-primary">
                          {o.title}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={o.owner}
                            onChange={(e) =>
                              updateObligation(
                                i,
                                'owner',
                                e.target.value as DraftObligation['owner'],
                              )
                            }
                            className="bg-white border border-border-input rounded-md px-2 h-8 text-xs focus:outline-none focus:border-action"
                          >
                            <option value="Buyer">{t('contracts.owner.buyer')}</option>
                            <option value="Supplier">{t('contracts.owner.supplier')}</option>
                            <option value="Both">{t('contracts.owner.both')}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={o.dueDate}
                            onChange={(e) =>
                              updateObligation(i, 'dueDate', e.target.value)
                            }
                            className="bg-white border border-border-input rounded-md px-2 h-8 text-xs focus:outline-none focus:border-action"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeObligation(i)}
                            className="text-text-tertiary hover:text-danger text-xs"
                            aria-label={t('contracts.wizard.obl.removeAria')}
                          >
                            {t('contracts.wizard.obl.remove')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'review',
      title: t('contracts.wizard.step.review.title'),
      shortTitle: t('contracts.wizard.step.review.short'),
      description: t('contracts.wizard.step.review.desc'),
      content: (
        <div className="space-y-5 text-sm">
          <ReviewSection
            label={t('contracts.wizard.review.section.basics')}
            onEdit={() => setWizardStep(0)}
            rows={[
              [t('contracts.wizard.review.row.title'), draft.title || '—'],
              [
                t('contracts.wizard.review.row.type'),
                draft.type ? typeLabel(t, draft.type) : '—',
              ],
              [
                t('contracts.wizard.review.row.supplier'),
                draft.supplierId
                  ? (supplierById.get(draft.supplierId)?.name ??
                    draft.supplierId)
                  : '—',
              ],
              [
                t('contracts.wizard.review.row.category'),
                draft.category ? catLabel(t, draft.category) : '—',
              ],
              [t('contracts.wizard.review.row.brands'), draft.brands.join(', ') || '—'],
            ]}
          />
          <ReviewSection
            label={t('contracts.wizard.review.section.terms')}
            onEdit={() => setWizardStep(1)}
            rows={[
              [t('contracts.wizard.review.row.startDate'), draft.startDate || '—'],
              [t('contracts.wizard.review.row.endDate'), draft.endDate || '—'],
              [
                t('contracts.wizard.review.row.autoRenewal'),
                draft.autoRenewal ? t('contracts.common.yes') : t('contracts.common.no'),
              ],
              ...(draft.autoRenewal
                ? ([
                    [
                      t('contracts.wizard.review.row.noticeRequired'),
                      t(
                        Number(draft.noticeRequiredDays) === 1
                          ? 'contracts.panel.noticeDays.one'
                          : 'contracts.panel.noticeDays.other',
                        { count: Number(draft.noticeRequiredDays) },
                      ),
                    ],
                  ] as [string, React.ReactNode][])
                : []),
              [
                t('contracts.wizard.review.row.value'),
                draft.value ? formatIDR(Number(draft.value)) : '—',
              ],
              [t('contracts.wizard.review.row.paymentTerms'), draft.paymentTerms],
              [t('contracts.wizard.review.row.incoterms'), draft.incoterms],
            ]}
          />
          <ReviewSection
            label={t('contracts.wizard.review.section.obligations')}
            onEdit={() => setWizardStep(2)}
            rows={[
              [
                t('contracts.wizard.review.row.count'),
                t(
                  draft.obligations.length === 1
                    ? 'contracts.wizard.review.oblCount.one'
                    : 'contracts.wizard.review.oblCount.other',
                  { count: draft.obligations.length },
                ),
              ],
              [
                t('contracts.wizard.review.row.titles'),
                draft.obligations.map((o) => o.title).join(', ') || '—',
              ],
            ]}
          />
        </div>
      ),
    },
  ];

  const obligationsForSelected = useMemo<ContractObligation[]>(() => {
    if (!selectedContract) return [];
    return obligations
      .filter((o) => o.contractId === selectedContract.id)
      .sort(sortObligations);
  }, [selectedContract, obligations]);

  const closePanel = () => {
    setSelectedContract(null);
    setDocsOpen(false);
  };

  const lastUpdated = useMemo(() => {
    return contracts.reduce(
      (acc, c) => (c.signedDate && c.signedDate > acc ? c.signedDate : acc),
      contracts[0]?.signedDate ?? '',
    );
  }, [contracts]);

  const counts = useMemo(() => {
    return {
      all: contracts.length,
      active: contracts.filter((c) => c.status === 'Active').length,
      expiring: contracts.filter((c) => c.status === 'Expiring').length,
      expired: contracts.filter((c) => c.status === 'Expired').length,
      renewed: contracts.filter((c) => c.status === 'Renewed').length,
      draft: contracts.filter((c) => c.status === 'Draft').length,
      terminated: contracts.filter((c) => c.status === 'Terminated').length,
    };
  }, [contracts]);

  const kpis = useMemo(() => {
    const active = counts.active;
    const expiringSoon = contracts.filter(
      (c) =>
        c.status === 'Expiring' ||
        (c.status === 'Active' && c.daysUntilExpiry <= 90 && c.daysUntilExpiry >= 0),
    ).length;
    const totalValue = contracts
      .filter((c) => c.status === 'Active')
      .reduce((sum, c) => sum + c.value, 0);
    return { active, expiringSoon, totalValue };
  }, [contracts, counts.active]);

  const overdueObligations = useMemo(
    () => obligations.filter((o) => o.status === 'Overdue').length,
    [obligations],
  );

  const filtered = useMemo(() => {
    return contracts
      .filter((c) => matchesGroup(c, group))
      .filter((c) =>
        selectedTypes.length === 0 ? true : selectedTypes.includes(c.type),
      )
      .filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          c.contractNumber.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (supplierById.get(c.supplierId)?.name ?? '')
            .toLowerCase()
            .includes(q)
        );
      });
  }, [contracts, group, selectedTypes, search]);

  const renewalPipeline = useMemo(() => {
    const upcoming = contracts.filter(
      (c) =>
        (c.status === 'Active' || c.status === 'Expiring') &&
        c.daysUntilExpiry >= 0 &&
        c.daysUntilExpiry <= 180,
    );
    const groups = new Map<string, Contract[]>();
    for (const c of upcoming) {
      const key = formatMonth(c.endDate);
      const existing = groups.get(key) ?? [];
      existing.push(c);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const ad = new Date(a[1][0].endDate).getTime();
      const bd = new Date(b[1][0].endDate).getTime();
      return ad - bd;
    });
  }, [contracts]);

  const toggleType = (t: ContractType) =>
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('contracts.crumb.acquire'), t('contracts.crumb.contracts')]}
        title={t('contracts.header.title')}
        subtitle={t('contracts.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              { label: t('contracts.action.export'), icon: FileSpreadsheet },
              { label: t('contracts.action.templates'), icon: ScrollText },
            ]}
            primary={{ label: t('contracts.action.newContract'), icon: Plus, onClick: openWizard }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          contracts.length === 1
            ? 'contracts.meta.summary.one'
            : 'contracts.meta.summary.other',
          { count: contracts.length, date: formatDate(lastUpdated) },
        )}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow={t('contracts.kpi.active.eyebrow')}
          value={kpis.active.toString()}
          subtitle={t('contracts.kpi.active.subtitle')}
          icon={ScrollText}
        />
        <KpiCard
          eyebrow={t('contracts.kpi.expiring.eyebrow')}
          value={kpis.expiringSoon.toString()}
          subtitle={t('contracts.kpi.expiring.subtitle')}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('contracts.kpi.overdue.eyebrow')}
          value={overdueObligations.toString()}
          subtitle={t('contracts.kpi.overdue.subtitle')}
          icon={FileText}
        />
        <KpiCard
          eyebrow={t('contracts.kpi.value.eyebrow')}
          value={formatIDR(kpis.totalValue)}
          subtitle={t('contracts.kpi.value.subtitle')}
          icon={Wallet}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: t('contracts.tab.all'), count: counts.all },
          { id: 'active', label: t('contracts.tab.active'), count: counts.active },
          { id: 'expiring', label: t('contracts.tab.expiring'), count: counts.expiring },
          { id: 'expired', label: t('contracts.tab.expired'), count: counts.expired },
          { id: 'renewed', label: t('contracts.tab.renewed'), count: counts.renewed },
          { id: 'draft', label: t('contracts.tab.draft'), count: counts.draft },
          { id: 'terminated', label: t('contracts.tab.terminated'), count: counts.terminated },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('contracts.filter.byType')}
          </div>
          <FilterChipsBar
            options={TYPE_OPTIONS.map((opt) => ({ id: opt, label: typeLabel(t, opt) }))}
            value={selectedTypes}
            onChange={toggleType}
            multiSelect
          />
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('contracts.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('contracts.table.col.number')}</TableHeaderCell>
            <TableHeaderCell>{t('contracts.table.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('contracts.table.col.type')}</TableHeaderCell>
            <TableHeaderCell>{t('contracts.table.col.period')}</TableHeaderCell>
            <TableHeaderCell>{t('contracts.table.col.expiry')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('contracts.table.col.value')}</TableHeaderCell>
            <TableHeaderCell>{t('contracts.table.col.performance')}</TableHeaderCell>
            <TableHeaderCell>{t('contracts.table.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('contracts.table.col.actions')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((c) => {
              const supplier = supplierById.get(c.supplierId);
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedContract(c)}
                >
                  <TableCell>
                    <Data as="div" className="font-semibold text-text-primary">
                      {c.contractNumber}
                    </Data>
                    <div className="text-xs text-text-tertiary mt-0.5 max-w-[18rem] truncate">
                      {c.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-primary">
                      {supplier?.name ?? c.supplierId}
                    </div>
                    {supplier && (
                      <div className="text-xs text-text-tertiary mt-0.5">
                        {COUNTRY_FLAG[supplier.country] ?? supplier.country}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant="neutral">{typeLabel(t, c.type)}</StatusPill>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-secondary whitespace-nowrap">
                      <Data>{formatDate(c.startDate)}</Data> →{' '}
                      <Data>{formatDate(c.endDate)}</Data>
                    </div>
                    {c.autoRenewal && (
                      <div className="text-xs text-info mt-0.5 inline-flex items-center gap-1">
                        <RefreshCw size={10} /> {t('contracts.table.autoRenew')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm whitespace-nowrap ${expiryTone(c.daysUntilExpiry)}`}>
                      {c.daysUntilExpiry < 0
                        ? t('contracts.expiry.daysAgo', {
                            count: Math.abs(c.daysUntilExpiry),
                          })
                        : c.daysUntilExpiry === 0
                          ? t('contracts.expiry.today')
                          : t('contracts.expiry.daysLeft', {
                              count: c.daysUntilExpiry,
                            })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{c.value > 0 ? formatIDR(c.value) : '—'}</Data>
                  </TableCell>
                  <TableCell>
                    {c.performanceScore > 0 ? (
                      <div className="w-32">
                        <ScoreBadge
                          score={c.performanceScore}
                          size="sm"
                          variant="bar"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[c.status]}>
                      {c.status}
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
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('contracts.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Renewal pipeline */}
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle">
          <div className="text-label text-text-tertiary uppercase">
            {t('contracts.pipeline.eyebrow')}
          </div>
          <h2 className="text-section text-text-primary mt-1">
            {t('contracts.pipeline.title')}
          </h2>
          <p className="text-meta text-text-tertiary">
            {t('contracts.pipeline.subtitle')}
          </p>
        </div>
        {renewalPipeline.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-text-tertiary">
            {t('contracts.pipeline.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {renewalPipeline.map(([month, items]) => (
              <li key={month} className="px-6 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={14} className="text-teal" />
                  <h3 className="text-section text-text-primary">
                    {month}
                  </h3>
                  <span className="text-xs text-text-tertiary">
                    {t(
                      items.length === 1
                        ? 'contracts.pipeline.count.one'
                        : 'contracts.pipeline.count.other',
                      { count: items.length },
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((c) => {
                    const supplier = supplierById.get(c.supplierId);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContract(c)}
                        className="text-left flex items-start gap-3 p-3 rounded-md border border-border-subtle hover:border-teal hover:shadow-sm transition-all"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.daysUntilExpiry < 30
                              ? 'bg-danger-soft text-danger'
                              : c.daysUntilExpiry < 90
                                ? 'bg-warning-soft text-warning-hover'
                                : 'bg-info-soft text-info'
                          }`}
                        >
                          {c.daysUntilExpiry}d
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">
                            {supplier?.name ?? c.supplierId}
                          </div>
                          <div className="text-xs text-text-tertiary mt-0.5">
                            <Data>{c.contractNumber}</Data> · {typeLabel(t, c.type)}
                          </div>
                        </div>
                        {c.autoRenewal && (
                          <RefreshCw
                            size={14}
                            className="text-info shrink-0 mt-0.5"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SidePanel
        open={selectedContract !== null}
        onClose={closePanel}
        title={
          selectedContract
            ? t('contracts.panel.title', {
                number: selectedContract.contractNumber,
                title: selectedContract.title,
              })
            : ''
        }
        footerActions={
          selectedContract && (
            <>
              <Button
                variant="secondary"
                icon={Download}
                onClick={() =>
                  toast({
                    variant: 'info',
                    title: t('contracts.toast.pdfQueued.title'),
                    description: t('contracts.toast.pdfQueued.desc'),
                  })
                }
              >
                {t('contracts.panel.exportPdf')}
              </Button>
              <Button variant="outline">
                {FOOTER_PRIMARY_LABEL(selectedContract, t)}
              </Button>
            </>
          )
        }
      >
        {selectedContract && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('contracts.panel.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.supplier')}</dt>
                  <dd className="text-text-primary font-medium">
                    {supplierById.get(selectedContract.supplierId)?.name ??
                      selectedContract.supplierId}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.type')}</dt>
                  <dd>
                    <StatusPill variant="neutral">
                      {typeLabel(t, selectedContract.type)}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.status')}</dt>
                  <dd>
                    <StatusPill
                      variant={STATUS_VARIANT[selectedContract.status]}
                    >
                      {selectedContract.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.autoRenewal')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.autoRenewal
                      ? t('contracts.common.yes')
                      : t('contracts.common.no')}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.startDate')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedContract.startDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.endDate')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedContract.endDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.noticeRequired')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {t(
                      selectedContract.noticeRequiredDays === 1
                        ? 'contracts.panel.noticeDays.one'
                        : 'contracts.panel.noticeDays.other',
                      { count: selectedContract.noticeRequiredDays },
                    )}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.daysUntilExpiry')}</dt>
                  <dd
                    className={`font-semibold ${expiryTone(selectedContract.daysUntilExpiry)}`}
                  >
                    {selectedContract.daysUntilExpiry < 0
                      ? t('contracts.expiry.daysAgo', {
                          count: Math.abs(selectedContract.daysUntilExpiry),
                        })
                      : t('contracts.expiry.days', {
                          count: selectedContract.daysUntilExpiry,
                        })}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.value')}</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {selectedContract.value > 0
                      ? formatIDR(selectedContract.value)
                      : '—'}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.currency')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.paymentTerms')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.paymentTerms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.incoterms')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.incoterms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.signedByBuyer')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.signedByBuyer}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.signedBySupplier')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.signedBySupplier}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.signedDate')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {selectedContract.signedDate
                      ? formatDate(selectedContract.signedDate)
                      : '—'}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('contracts.panel.field.category')}</dt>
                  <dd className="text-text-primary font-medium">
                    {catLabel(t, selectedContract.category)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-text-tertiary">{t('contracts.panel.field.brands')}</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {selectedContract.brands.length === 0 ? (
                      <span className="text-text-tertiary text-sm">—</span>
                    ) : (
                      selectedContract.brands.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center rounded-full bg-bg-hover text-text-secondary text-xs px-2 py-0.5"
                        >
                          {b}
                        </span>
                      ))
                    )}
                  </dd>
                </div>
                <div className="col-span-2 pt-2 flex items-center gap-3">
                  <dt className="text-text-tertiary text-sm">
                    {t('contracts.panel.field.performanceScore')}
                  </dt>
                  <dd>
                    {selectedContract.performanceScore > 0 ? (
                      <ScoreBadge
                        score={selectedContract.performanceScore}
                        size="md"
                        variant="circular"
                      />
                    ) : (
                      <span className="text-text-tertiary text-sm">
                        {t('contracts.panel.notRated')}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('contracts.panel.obligations', {
                  count: obligationsForSelected.length,
                })}
              </h3>
              {obligationsForSelected.length === 0 ? (
                <p className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
                  {t('contracts.panel.noObligations')}
                </p>
              ) : (
                <div className="border border-border-subtle rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">
                          {t('contracts.panel.obl.col.title')}
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          {t('contracts.panel.obl.col.owner')}
                        </th>
                        <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                          {t('contracts.panel.obl.col.due')}
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          {t('contracts.panel.obl.col.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {obligationsForSelected.map((o) => (
                        <tr
                          key={o.id}
                          className="border-t border-border-subtle"
                        >
                          <td className="px-3 py-2">
                            <div className="text-text-primary font-medium">
                              {o.title}
                            </div>
                            <div className="text-text-tertiary text-[10px] uppercase tracking-wider mt-0.5">
                              {o.category}
                              {o.recurrence ? ` · ${o.recurrence}` : ''}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-text-secondary">
                            {ownerLabel(t, o.owner)}
                          </td>
                          <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                            <Data>{formatDate(o.dueDate)}</Data>
                          </td>
                          <td className="px-3 py-2">
                            <StatusPill
                              variant={OBLIGATION_VARIANT[o.status]}
                            >
                              {o.status}
                            </StatusPill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('contracts.panel.lifecycle')}
              </h3>
              <Timeline events={buildContractTimeline(selectedContract, t)} />
            </section>

            <section>
              <button
                type="button"
                onClick={() => setDocsOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-teal hover:text-teal-hover"
              >
                {docsOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {t(
                  docsOpen ? 'contracts.panel.docsHide' : 'contracts.panel.docsShow',
                  { count: PLACEHOLDER_DOCS(selectedContract).length },
                )}
              </button>
              {docsOpen && (
                <ul className="mt-3 space-y-2">
                  {PLACEHOLDER_DOCS(selectedContract).map((d) => (
                    <li
                      key={d.name}
                      className="flex items-center justify-between gap-3 p-3 border border-border-subtle rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          size={14}
                          className="text-text-tertiary"
                        />
                        <span className="text-sm text-text-primary">
                          {d.name}
                        </span>
                      </div>
                      <StatusPill
                        variant={
                          d.status === 'valid'
                            ? 'success'
                            : d.status === 'expiring'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {d.status === 'valid'
                          ? 'Valid'
                          : d.status === 'expiring'
                            ? 'Expiring'
                            : 'Expired'}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              )}
            </section>
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
            completeLabel={t('contracts.wizard.complete')}
          />
        </div>
      )}
    </AppShellV2>
  );
};

// Wrapper: reads the buyer-side contract portfolio (contracts + obligations
// scoped via parent contract) through the scoped hooks and renders the four
// honest states; the workspace inner keeps its local (Phase-2′, non-persisting)
// contract-creation wizard state seeded from the resolved reads.
const BuyerContracts: React.FC = () => {
  const { t } = useTranslation();
  const contractsQuery = useContracts();
  const obligationsQuery = useObligations();
  const suppliersQuery = useSuppliers();
  const CONTRACTS_CRUMB = [
    t('contracts.crumb.acquire'),
    t('contracts.crumb.contracts'),
  ];

  if (
    contractsQuery.isPending ||
    obligationsQuery.isPending ||
    suppliersQuery.isPending
  )
    return <LoadingState breadcrumb={CONTRACTS_CRUMB} />;
  if (
    contractsQuery.isError ||
    obligationsQuery.isError ||
    suppliersQuery.isError
  )
    return (
      <ErrorState
        breadcrumb={CONTRACTS_CRUMB}
        error={
          contractsQuery.error ??
          obligationsQuery.error ??
          suppliersQuery.error
        }
        onRetry={() => {
          contractsQuery.refetch();
          obligationsQuery.refetch();
          suppliersQuery.refetch();
        }}
      />
    );

  const baseContracts = contractsQuery.data?.items ?? [];
  if (baseContracts.length === 0)
    return (
      <EmptyState
        breadcrumb={CONTRACTS_CRUMB}
        title={t('contracts.state.empty.title')}
        subtitle={t('contracts.state.empty.subtitle')}
        message={t('contracts.state.empty.message')}
      />
    );

  return (
    <ContractsWorkspace
      baseContracts={baseContracts}
      obligations={obligationsQuery.data?.items ?? []}
      suppliers={suppliersQuery.data?.items ?? []}
    />
  );
};

export default BuyerContracts;
