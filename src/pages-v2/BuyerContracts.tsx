import React, { useMemo, useState } from 'react';
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
  if (days < 90) return 'text-warning font-semibold';
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

const buildContractTimeline = (c: Contract): TimelineEvent[] => {
  const isDraft = c.status === 'Draft';
  const isActive = c.status === 'Active';
  const isExpiring = c.status === 'Expiring';
  const isExpired = c.status === 'Expired';
  const isRenewed = c.status === 'Renewed';
  const isTerminated = c.status === 'Terminated';

  const finalLabel = isExpired
    ? 'Expired'
    : isRenewed
      ? 'Renewed'
      : isTerminated
        ? 'Terminated'
        : 'Expiry / Renewal';
  const finalIcon = isTerminated ? Archive : isRenewed ? RefreshCw : Archive;

  return [
    {
      id: 'drafted',
      title: 'Drafted',
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -14)) : undefined,
      status: 'completed',
      icon: PenSquare,
    },
    {
      id: 'negotiated',
      title: 'Negotiated',
      timestamp: c.signedDate ? formatDate(shiftDays(c.signedDate, -7)) : undefined,
      status: isDraft ? 'current' : 'completed',
      icon: Handshake,
    },
    {
      id: 'signed',
      title: 'Signed',
      timestamp: c.signedDate ? formatDate(c.signedDate) : undefined,
      status: isDraft ? 'pending' : 'completed',
      icon: CheckCircle2,
    },
    {
      id: 'active',
      title: 'Active Period',
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
      title: 'Renewal Decision',
      timestamp:
        c.endDate && c.noticeRequiredDays
          ? `Notice by ${formatDate(shiftDays(c.endDate, -c.noticeRequiredDays))}`
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

const FOOTER_PRIMARY_LABEL = (c: Contract): string => {
  if (c.status === 'Active' && c.daysUntilExpiry <= 90)
    return 'Initiate renewal';
  if (c.status === 'Active') return 'View full contract';
  if (c.status === 'Expiring') return 'Initiate renewal';
  if (c.status === 'Expired') return 'View renewal options';
  if (c.status === 'Draft') return 'Continue editing';
  if (c.status === 'Renewed') return 'View previous contract';
  if (c.status === 'Terminated') return 'View termination notice';
  return 'View full contract';
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
      title: `Contract ${newContract.contractNumber} created`,
      description: 'Saved as Draft. Sign workflow coming in Phase 2A.',
    });
  };

  const wizardSteps: WizardStep[] = [
    {
      id: 'basics',
      title: 'Basics',
      shortTitle: 'Basics',
      description: 'Set the contract type, supplier, and brand scope.',
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              Contract title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft('title', e.target.value)}
              placeholder="e.g. Halal Emulsifier Master Supply Agreement 2027"
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Contract type <span className="text-danger">*</span>
              </label>
              <select
                value={draft.type}
                onChange={(e) =>
                  updateDraft('type', e.target.value as ContractType)
                }
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                <option value="">Select a type…</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Category <span className="text-danger">*</span>
              </label>
              <select
                value={draft.category}
                onChange={(e) => updateDraft('category', e.target.value)}
                className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              >
                <option value="">Select a category…</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              Supplier <span className="text-danger">*</span>
            </label>
            <div className="mb-2">
              <SearchBar
                value={supplierSearch}
                onChange={setSupplierSearch}
                placeholder="Search suppliers by name or country…"
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
                        No suppliers match the current search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              Brands
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
      title: 'Terms & Duration',
      shortTitle: 'Terms',
      description: 'Set the term, value, and commercial terms.',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-label text-text-tertiary uppercase block mb-1.5">
                Start date <span className="text-danger">*</span>
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
                End date <span className="text-danger">*</span>
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
                    End date must be after start date.
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
                Auto-renewal
              </span>
              <span className="text-xs text-text-tertiary">
                Contract renews unless notice is given.
              </span>
            </label>
            {draft.autoRenewal && (
              <div className="mt-3 max-w-xs">
                <label className="text-label text-text-tertiary uppercase block mb-1.5">
                  Notice required (days)
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
              Total contract value (IDR) <span className="text-danger">*</span>
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
                Payment terms
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
                Incoterms
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
      title: 'Obligations',
      shortTitle: 'Obligations',
      description: 'Pick suggested obligations or add custom ones.',
      content: (
        <div className="space-y-5">
          {draft.type && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">
                Suggested for {draft.type} contracts
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
                            Owner: {s.owner}
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
              Add custom obligation
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={customObligationTitle}
                onChange={(e) => setCustomObligationTitle(e.target.value)}
                placeholder="e.g. Submit annual sustainability report"
                className="flex-1 bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
              />
              <Button
                variant="secondary"
                icon={Plus}
                onClick={addCustomObligation}
                disabled={!customObligationTitle.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {draft.obligations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-2">
                Selected obligations ({draft.obligations.length})
              </h4>
              <div className="border border-border-subtle rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider text-xs">
                    <tr>
                      <th className="text-left px-3 py-2">Title</th>
                      <th className="text-left px-3 py-2">Owner</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">
                        Due date
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
                            <option value="Buyer">Buyer</option>
                            <option value="Supplier">Supplier</option>
                            <option value="Both">Both</option>
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
                            aria-label="Remove obligation"
                          >
                            Remove
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
      title: 'Review & Submit',
      shortTitle: 'Review',
      description: 'Check the details before creating the contract draft.',
      content: (
        <div className="space-y-5 text-sm">
          <ReviewSection
            label="Basics"
            onEdit={() => setWizardStep(0)}
            rows={[
              ['Title', draft.title || '—'],
              ['Type', draft.type || '—'],
              [
                'Supplier',
                draft.supplierId
                  ? (supplierById.get(draft.supplierId)?.name ??
                    draft.supplierId)
                  : '—',
              ],
              ['Category', draft.category || '—'],
              ['Brands', draft.brands.join(', ') || '—'],
            ]}
          />
          <ReviewSection
            label="Terms & Duration"
            onEdit={() => setWizardStep(1)}
            rows={[
              ['Start date', draft.startDate || '—'],
              ['End date', draft.endDate || '—'],
              ['Auto-renewal', draft.autoRenewal ? 'Yes' : 'No'],
              ...(draft.autoRenewal
                ? ([['Notice required', `${draft.noticeRequiredDays} days`]] as [
                    string,
                    React.ReactNode,
                  ][])
                : []),
              [
                'Value',
                draft.value ? formatIDR(Number(draft.value)) : '—',
              ],
              ['Payment terms', draft.paymentTerms],
              ['Incoterms', draft.incoterms],
            ]}
          />
          <ReviewSection
            label="Obligations"
            onEdit={() => setWizardStep(2)}
            rows={[
              [
                'Count',
                `${draft.obligations.length} obligation${draft.obligations.length === 1 ? '' : 's'}`,
              ],
              [
                'Titles',
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
        breadcrumb={['ACQUIRE', 'CONTRACTS']}
        title="Contract Management"
        subtitle="Active contracts, renewal pipeline, and obligation tracking across your supplier network."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet },
              { label: 'Templates', icon: ScrollText },
            ]}
            primary={{ label: 'New Contract', icon: Plus, onClick: openWizard }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {contracts.length} contracts · last updated {formatDate(lastUpdated)}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow="Active Contracts"
          value={kpis.active.toString()}
          subtitle="Currently in force"
          icon={ScrollText}
        />
        <KpiCard
          eyebrow="Expiring Soon"
          value={kpis.expiringSoon.toString()}
          subtitle="Within next 90 days"
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow="Overdue Obligations"
          value={overdueObligations.toString()}
          subtitle="Across all contracts"
          icon={FileText}
        />
        <KpiCard
          eyebrow="Total Active Value"
          value={formatIDR(kpis.totalValue)}
          subtitle="Sum of active contracts"
          icon={Wallet}
        />
      </div>

      <SubTabs
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'active', label: 'Active', count: counts.active },
          { id: 'expiring', label: 'Expiring', count: counts.expiring },
          { id: 'expired', label: 'Expired', count: counts.expired },
          { id: 'renewed', label: 'Renewed', count: counts.renewed },
          { id: 'draft', label: 'Draft', count: counts.draft },
          { id: 'terminated', label: 'Terminated', count: counts.terminated },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            Filter by type
          </div>
          <FilterChipsBar
            options={TYPE_OPTIONS.map((t) => ({ id: t, label: t }))}
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
          placeholder="Search by contract number, supplier, or title…"
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden mb-8">
        <Table>
          <TableHeader>
            <TableHeaderCell>Contract #</TableHeaderCell>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Period</TableHeaderCell>
            <TableHeaderCell>Expiry</TableHeaderCell>
            <TableHeaderCell className="text-right">Value</TableHeaderCell>
            <TableHeaderCell>Performance</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
                    <StatusPill variant="neutral">{c.type}</StatusPill>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-text-secondary whitespace-nowrap">
                      <Data>{formatDate(c.startDate)}</Data> →{' '}
                      <Data>{formatDate(c.endDate)}</Data>
                    </div>
                    {c.autoRenewal && (
                      <div className="text-xs text-info mt-0.5 inline-flex items-center gap-1">
                        <RefreshCw size={10} /> Auto-renew
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={`text-sm whitespace-nowrap ${expiryTone(c.daysUntilExpiry)}`}>
                      {c.daysUntilExpiry < 0
                        ? `${Math.abs(c.daysUntilExpiry)}d ago`
                        : c.daysUntilExpiry === 0
                          ? 'Today'
                          : `${c.daysUntilExpiry}d left`}
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
                  No contracts match the current filters.
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
            Intelligence
          </div>
          <h2 className="text-section text-text-primary mt-1">
            Renewal Pipeline
          </h2>
          <p className="text-meta text-text-tertiary">
            Contracts expiring in the next 6 months, grouped by month.
          </p>
        </div>
        {renewalPipeline.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-text-tertiary">
            No renewals due in the next 6 months.
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
                    · {items.length} contract{items.length === 1 ? '' : 's'}
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
                                ? 'bg-warning-soft text-warning'
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
                            <Data>{c.contractNumber}</Data> · {c.type}
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
            ? `Contract ${selectedContract.contractNumber} — ${selectedContract.title}`
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
                    title: 'PDF export queued',
                    description: 'PDF export coming in Phase 2A.',
                  })
                }
              >
                Export PDF
              </Button>
              <Button variant="primary">
                {FOOTER_PRIMARY_LABEL(selectedContract)}
              </Button>
            </>
          )
        }
      >
        {selectedContract && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Key facts
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Supplier</dt>
                  <dd className="text-text-primary font-medium">
                    {supplierById.get(selectedContract.supplierId)?.name ??
                      selectedContract.supplierId}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Type</dt>
                  <dd>
                    <StatusPill variant="neutral">
                      {selectedContract.type}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
                  <dd>
                    <StatusPill
                      variant={STATUS_VARIANT[selectedContract.status]}
                    >
                      {selectedContract.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Auto-renewal</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.autoRenewal ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Start date</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedContract.startDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">End date</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedContract.endDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">Notice required</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {selectedContract.noticeRequiredDays} days
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">Days until expiry</dt>
                  <dd
                    className={`font-semibold ${expiryTone(selectedContract.daysUntilExpiry)}`}
                  >
                    {selectedContract.daysUntilExpiry < 0
                      ? `${Math.abs(selectedContract.daysUntilExpiry)}d ago`
                      : `${selectedContract.daysUntilExpiry}d`}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Value</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {selectedContract.value > 0
                      ? formatIDR(selectedContract.value)
                      : '—'}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">Currency</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment terms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.paymentTerms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Incoterms</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.incoterms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Signed by buyer</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.signedByBuyer}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Signed by supplier</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.signedBySupplier}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Signed date</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {selectedContract.signedDate
                      ? formatDate(selectedContract.signedDate)
                      : '—'}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">Category</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedContract.category}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-text-tertiary">Brands</dt>
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
                    Performance score
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
                        Not yet rated
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Obligations ({obligationsForSelected.length})
              </h3>
              {obligationsForSelected.length === 0 ? (
                <p className="text-sm text-text-tertiary p-4 border border-border-subtle rounded-md text-center">
                  No obligations defined for this contract.
                </p>
              ) : (
                <div className="border border-border-subtle rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-bg-hover text-text-tertiary uppercase tracking-wider">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">
                          Title
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Owner
                        </th>
                        <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">
                          Due
                        </th>
                        <th className="text-left px-3 py-2 font-semibold">
                          Status
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
                            {o.owner}
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
                Lifecycle
              </h3>
              <Timeline events={buildContractTimeline(selectedContract)} />
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
                {docsOpen ? 'Hide' : 'Show'} linked compliance documents (
                {PLACEHOLDER_DOCS(selectedContract).length})
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
            completeLabel="Create Contract"
          />
        </div>
      )}
    </AppShellV2>
  );
};

const CONTRACTS_CRUMB = ['ACQUIRE', 'CONTRACTS'];

// Wrapper: reads the buyer-side contract portfolio (contracts + obligations
// scoped via parent contract) through the scoped hooks and renders the four
// honest states; the workspace inner keeps its local (Phase-2′, non-persisting)
// contract-creation wizard state seeded from the resolved reads.
const BuyerContracts: React.FC = () => {
  const contractsQuery = useContracts();
  const obligationsQuery = useObligations();
  const suppliersQuery = useSuppliers();

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
        title="No contracts yet"
        subtitle="No contracts are on file across your supplier network."
        message="Contracts, obligations, and the renewal pipeline appear here once agreements are signed."
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
