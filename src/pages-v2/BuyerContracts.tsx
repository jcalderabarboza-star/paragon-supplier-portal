import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw,
  CalendarDays,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
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
import ScoreBadge from '../components/ui-v2/ScoreBadge';
import Data from '../components/ui-v2/Data';
import Button from '../components/ui-v2/Button';
import Wizard, { WizardStep } from '../components/ui-v2/Wizard';
import { useToast } from '../hooks/useToast';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useContracts, useObligations, useSuppliers } from '../services/query/hooks';
import type { ContractObligation } from '../data/mockObligations';
import { obligationDisplay } from '../services/data/obligationProjection';
import type {
  Contract,
  ContractStatus,
  ContractType,
} from '../data/mockContracts';
import type { Supplier } from '../services/data/types';
import { daysUntil } from '../services/data/dayProjection';
import {
  contractDisplayStatus,
  inRenewalHorizon,
  CONTRACT_EXPIRY_TONE,
  CONTRACT_EXPIRY_CHIP,
  type ContractDisplayStatus,
} from '../services/data/contractExpiry';
import type { QtyRefusalReason } from '../lib/localeNumber';
import {
  normalizeContractNumbers,
  readContractValue,
  readNoticeRequiredDays,
  seedContractNumber,
  type ContractNumericField,
} from './contracts/contractCreateModel';
// GL-1 - the glossary destination for this surface's refusals.
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';

// ⚠️ ANCHORED — this surface rendered values derived from anchored
// fixture data against the WALL CLOCK, so what a reader saw moved every day
// with no commit involved. Module-scope `DECLARED_PRESENT`, the shipped
// pattern from `BuyerShipments` / `BuyerGoodsReceipt`, and behaviour-
// preserving for the same reason they are: this surface's families shift by
// `DECLARED_PRESENT - anchor` and so does this pin, so every rendered
// day-count is answered at the instant the fixtures were authored for.
//
// ⚠️ SESSION-WRITTEN STATE KEEPS THE WALL CLOCK. This constant is for READ
// projections only. A timestamp stamped onto something the user just did is a
// fact about this session, not about the fixture set, and anchoring one would
// tell the reader their own action happened weeks ago.
const TODAY = DECLARED_PRESENT;

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

// ⚠️ `expiryTone(days)` IS DELETED, not moved. Its three cuts were `< 0` (a
// restatement of the zero boundary `isPast` now owns), `< 30` (a page-local
// width) and `< 90` (a copy of the band this batch removes). The tone is now
// `CONTRACT_EXPIRY_TONE[displayStatus]` — one map, keyed on the same classifier
// the pill and the tab read, so the figure's colour and the pill beside it
// cannot disagree.

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

/** The wizard's default notice period. A NUMBER, seeded through
 *  `seedContractNumber` — see that function's note on why a display formatter
 *  must never seed a parsed field. */
const DEFAULT_NOTICE_DAYS = 90;

const EMPTY_DRAFT: DraftContract = {
  title: '',
  type: '',
  supplierId: '',
  category: '',
  brands: [],
  startDate: '',
  endDate: '',
  autoRenewal: false,
  noticeRequiredDays: seedContractNumber(DEFAULT_NOTICE_DAYS),
  value: '',
  paymentTerms: 'Net 30',
  incoterms: 'CIF Jakarta',
  obligations: [],
};

// CP-0 · W1 · 2f-b — each refusal names what to type instead. "Invalid input"
// would leave an Indonesian buyer staring at a number that reads correctly to
// them, which is exactly how "1.500" became Rp 1.5 in the first place.
const CONTRACT_VALUE_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'contracts.wizard.value.refused.empty',
  NOT_NUMERIC: 'contracts.wizard.value.refused.notNumeric',
  AMBIGUOUS_QTY: 'contracts.wizard.value.refused.ambiguous',
};

const CONTRACT_NOTICE_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'contracts.wizard.noticeDays.refused.empty',
  NOT_NUMERIC: 'contracts.wizard.noticeDays.refused.notNumeric',
  AMBIGUOUS_QTY: 'contracts.wizard.noticeDays.refused.ambiguous',
};

const contractRefusalKey = (
  field: ContractNumericField,
  reason: QtyRefusalReason,
): string =>
  field === 'value'
    ? CONTRACT_VALUE_REFUSAL_KEY[reason]
    : CONTRACT_NOTICE_REFUSAL_KEY[reason];

/** The expiry figure a row shows, derived from the contract's own `endDate`.
 *  Returns `null` when there is no readable end date — rendered as an em dash
 *  rather than as a zero, because "no end date" is not "expires today". */
const ExpiryCell: React.FC<{
  days: number | null;
  display: ContractDisplayStatus;
}> = ({ days, display }) => {
  const { t } = useTranslation();
  if (days === null)
    return <div className="text-sm whitespace-nowrap text-text-tertiary">—</div>;
  return (
    <div className={`text-sm whitespace-nowrap ${CONTRACT_EXPIRY_TONE[display]}`}>
      {/* The FIGURE keeps its three renderings — `today` is a legible way to
          say zero and is not a state claim. The ruled boundary makes zero PAST,
          which the tone above now says (danger, via `Expired`), so the cell
          reads "Today" in red rather than "Today" in amber. */}
      {days < 0
        ? t('contracts.expiry.daysAgo', { count: Math.abs(days) })
        : days === 0
          ? t('contracts.expiry.today')
          : t('contracts.expiry.daysLeft', { count: days })}
    </div>
  );
};

// ⚠️ **EVERY ARM NOW READS THE SAME COMPUTED STATUS, AND THAT IS THE POINT.**
// This used to take `daysToExpiry` and run its own `0..90` band on the
// `expiring` arm while every other arm read the stored literal — so one tab
// answered a clock question and six answered a data question, and the tab BADGE
// (`counts`, below) answered a third. Taking the display status instead means
// the tab, the badge, the tile, the pill and the expiry tone are one predicate
// evaluated once per row.
const matchesGroup = (display: ContractDisplayStatus, g: GroupTab): boolean => {
  if (g === 'all') return true;
  if (g === 'active') return display === 'Active';
  if (g === 'expiring') return display === 'Expiring';
  if (g === 'expired') return display === 'Expired';
  if (g === 'renewed') return display === 'Renewed';
  if (g === 'draft') return display === 'Draft';
  if (g === 'terminated') return display === 'Terminated';
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
  // ONE clock read for the workspace, captured once so every expiry figure on
  // screen is answered against the SAME instant. ⚠️ It sits at the TOP of the
  // body on purpose: this component has no early return today, but a hook below
  // one is a conditional hook, and that is what took 44 specs down in #317.
  const nowIso = TODAY;
  /** This contract's days-to-expiry at that instant. `-Infinity`-free: a row
   *  with no readable end date sorts as "no expiry" rather than as overdue. */
  const expiryDays = (c: Contract): number => daysUntil(c.endDate, nowIso) ?? 0;
  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [s.id, s])),
    [suppliers],
  );
  const [group, setGroup] = useState<GroupTab>('all');
  const [selectedTypes, setSelectedTypes] = useState<ContractType[]>([]);
  const [search, setSearch] = useState('');
  const [extraContracts, setExtraContracts] = useState<Contract[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState<DraftContract>(EMPTY_DRAFT);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [customObligationTitle, setCustomObligationTitle] = useState('');
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Open a contract → the nested full-page detail (/buyer/contracts/:id), where
  // the Delivery Agreements tab lives. Replaces the old in-page SidePanel drawer.
  const openContract = (c: Contract) => navigate(`/buyer/contracts/${c.id}`);

  const contracts = useMemo(
    () => [...extraContracts, ...baseContracts],
    [extraContracts, baseContracts],
  );

  const updateDraft = <K extends keyof DraftContract>(
    key: K,
    value: DraftContract[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  // ── CP-0 · W1 · 2f-b — THE ONE READ of the wizard's two numbers ────────────
  // The composite is what the step gate and the created entity read; the two
  // per-field reads exist so each input can report ITSELF. All three go through
  // the same `normalizeQty` on the same string, so the inline message, the gate
  // and the stored value cannot disagree — which is precisely what the three
  // separate `Number()` calls could not promise.
  const contractNumbers = useMemo(
    () =>
      normalizeContractNumbers({
        value: draft.value,
        noticeRequiredDays: draft.noticeRequiredDays,
      }),
    [draft.value, draft.noticeRequiredDays],
  );
  const valueRead = useMemo(() => readContractValue(draft.value), [draft.value]);
  const noticeRead = useMemo(
    () => readNoticeRequiredDays(draft.noticeRequiredDays),
    [draft.noticeRequiredDays],
  );

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
      // Reads the ONE parse. A refusal on EITHER number holds the step — the
      // notice period had no gate at all before, which is how `|| 0` turned a
      // cleared field into a stated zero-day notice requirement.
      if (!contractNumbers.ok) return false;
      // The pre-existing `> 0` rule, PRESERVED VERBATIM. Whether a zero-value
      // contract should be legal is a commercial question, not a parsing one;
      // this batch only stops the value being misread on the way to it.
      return contractNumbers.value.value > 0;
    }
    return true;
  };

  const submitWizard = () => {
    // The gate above already holds the wizard on step 2 under a refusal, so this
    // is unreachable through the UI. It is here because the alternative to an
    // honest refusal is a fabricated number: there is no dispatcher behind this
    // page to catch one (CTR-FABRICATION-01), so the check cannot be delegated.
    if (!contractNumbers.ok) {
      toast({
        variant: 'error',
        title: t('contracts.toast.numberRefused.title'),
        description: t(
          contractRefusalKey(contractNumbers.field, contractNumbers.reason),
        ),
      });
      return;
    }
    const numbers = contractNumbers.value;
    const yr = new Date().getFullYear();
    const nextNum = baseContracts.length + extraContracts.length + 1;
    // ⚠️ THE MINT IS GONE WITH THE FIELD. This computed `daysUntilExpiry` from
    // `new Date()` and wrote it onto the new contract, so every contract a buyer
    // created was born correct for exactly one day. `endDate` is stored; the
    // difference is derived at read.
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
      // PRESERVED VERBATIM, deliberately: the notice period is written whether
      // or not auto-renewal is on, so a contract created with auto-renewal OFF
      // still carries the untouched 90-day default nobody saw. That is
      // CTR-HIDDEN-SEED-01 — filed, not fixed here. It cannot be decided by a
      // parse change: the fixtures carry `autoRenewal: false` WITH a real notice
      // period (mockContracts ctr-002), so "don't write it" would be wrong, and
      // what a hidden field should contribute to the terms is the operator's
      // call. What changes here is only that the number is READ honestly.
      noticeRequiredDays: numbers.noticeRequiredDays,
      value: numbers.value,
      currency: 'IDR',
      paymentTerms: draft.paymentTerms,
      incoterms: draft.incoterms,
      signedByBuyer: '—',
      signedBySupplier: '—',
      signedDate: '',
      // ⚠️ THE SECOND MINT IS GONE WITH ITS FIELDS. This wrote
      // `obligationCount: draft.obligations.length` and `obligationsMet: 0`
      // onto the new contract — and NOTHING PERSISTED `draft.obligations`, so
      // the number described a collection the store never received. Derived
      // before deleting: there is no obligation write path of any kind (no
      // `extraObligations`, and `obligation` holds no `CommandTarget`, so
      // `t_obligation_track` cannot fire), which is what makes the count a
      // snapshot of an intention rather than a fact. The counters are computed
      // from the obligation store at read.
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
                aria-label={t('contracts.wizard.field.startDate')}
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
                aria-label={t('contracts.wizard.field.endDate')}
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
                aria-label={t('contracts.wizard.field.autoRenewal')}
                className="accent-teal w-4 h-4"
              />
              <span className="text-sm text-text-primary font-medium">
                {t('contracts.wizard.field.autoRenewal')}
              </span>
              <span className="text-xs text-text-tertiary">
                {t('contracts.wizard.autoRenewalHint')}
              </span>
            </label>
            {/* A REFUSAL MUST NEVER BE INVISIBLE. The input belongs to
                auto-renewal, but the draft keeps its value when the box is
                unchecked — so an operator who clears the field and then unchecks
                the box would otherwise be held on this step by a field they
                cannot see. Rendering it while it refuses keeps the gate
                actionable without weakening it. */}
            {(draft.autoRenewal || !noticeRead.ok) && (
              <div className="mt-3 max-w-xs">
                <label className="text-label text-text-tertiary uppercase block mb-1.5">
                  {t('contracts.wizard.field.noticeDays')}{' '}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.noticeRequiredDays}
                  onChange={(e) =>
                    updateDraft('noticeRequiredDays', e.target.value)
                  }
                  placeholder={t('contracts.wizard.placeholder.noticeDays')}
                  aria-label={t('contracts.wizard.field.noticeDays')}
                  aria-invalid={!noticeRead.ok}
                  className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
                />
                {!noticeRead.ok && (
                  <div
                    role="alert"
                    data-testid="contract-notice-refusal"
                    className="mt-1 text-[11px] text-danger"
                  >
                    {t(CONTRACT_NOTICE_REFUSAL_KEY[noticeRead.reason])}{' '}
                    <GlossaryTermChip
                      refTo={{ sourceType: 'QtyRefusalReason', term: noticeRead.reason }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="text-label text-text-tertiary uppercase block mb-1.5">
              {t('contracts.wizard.field.value')} <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={draft.value}
              onChange={(e) => updateDraft('value', e.target.value)}
              placeholder={t('contracts.wizard.placeholder.value')}
              aria-label={t('contracts.wizard.field.value')}
              aria-invalid={draft.value.trim() !== '' && !valueRead.ok}
              className="w-full bg-white border border-border-input rounded-md px-3 h-10 text-sm focus:outline-none focus:border-action"
            />
            {/* An untouched blank does not nag on sight — it refuses at the gate
                (Next stays disabled) and says so on the field once the buyer has
                typed something (the 2e-a price precedent). */}
            {draft.value.trim() !== '' && !valueRead.ok && (
              <div
                role="alert"
                data-testid="contract-value-refusal"
                className="mt-1 text-[11px] text-danger"
              >
                {t(CONTRACT_VALUE_REFUSAL_KEY[valueRead.reason])}{' '}
                <GlossaryTermChip
                  refTo={{ sourceType: 'QtyRefusalReason', term: valueRead.reason }}
                />
              </div>
            )}
            {/* The pre-existing `> 0` gate, finally SAYING SO. It has always
                disabled Next on a typed zero; it did it in silence, which is the
                same family of defect as a misread number. No rule changes. */}
            {valueRead.ok && valueRead.value === 0 && (
              <div
                role="alert"
                data-testid="contract-value-zero"
                className="mt-1 text-[11px] text-danger"
              >
                {t('contracts.wizard.value.mustExceedZero')}
              </div>
            )}
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
              // Both rows read the ONE parse. A refusal renders an em dash rather
              // than a number: the review step is the last place a buyer checks
              // what they are about to commit to, so it must never be the place
              // that shows a coerced reading the gate would not accept.
              ...(draft.autoRenewal
                ? ([
                    [
                      t('contracts.wizard.review.row.noticeRequired'),
                      noticeRead.ok
                        ? t(
                            noticeRead.value === 1
                              ? 'contracts.panel.noticeDays.one'
                              : 'contracts.panel.noticeDays.other',
                            { count: noticeRead.value },
                          )
                        : '—',
                    ],
                  ] as [string, React.ReactNode][])
                : []),
              [
                t('contracts.wizard.review.row.value'),
                valueRead.ok ? formatIDR(valueRead.value) : '—',
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

  const lastUpdated = useMemo(() => {
    return contracts.reduce(
      (acc, c) => (c.signedDate && c.signedDate > acc ? c.signedDate : acc),
      contracts[0]?.signedDate ?? '',
    );
  }, [contracts]);

  // ⚠️ **ONE EVALUATION PER ROW, AND EVERYTHING BELOW READS IT.** The badge,
  // the tab list, the tile, the pill and the expiry tone were five separate
  // reads of three different rules; they are now five reads of this map. A
  // contract cannot appear under a tab whose badge disagrees, because the badge
  // and the tab are `.filter`s over the same values.
  const displayById = useMemo(
    () =>
      new Map<string, ContractDisplayStatus>(
        contracts.map((c) => [c.id, contractDisplayStatus(c, nowIso)]),
      ),
    [contracts, nowIso],
  );
  const displayOf = (c: Contract): ContractDisplayStatus =>
    displayById.get(c.id) ?? c.status;

  const counts = useMemo(() => {
    const by = (s: ContractDisplayStatus) =>
      contracts.filter((c) => displayOf(c) === s).length;
    return {
      all: contracts.length,
      active: by('Active'),
      // ⚠️ THIS LINE IS THE DEFECT THIS BATCH EXISTS FOR. It read
      // `c.status === 'Expiring'` — the one predicate on this page with no
      // clock in it — so the badge counted authored literals while the tab
      // beside it ran a 90-day band. Badge 2, list 4, tile 4, since 2026-05-20.
      expiring: by('Expiring'),
      expired: by('Expired'),
      renewed: by('Renewed'),
      draft: by('Draft'),
      terminated: by('Terminated'),
    };
  }, [contracts, displayById]);

  const kpis = useMemo(() => {
    const active = counts.active;
    // The tile and the tab badge are now literally the same number rather than
    // two predicates that happened to be written twice — the inline copy of
    // `matchesGroup`'s band that used to live here is gone.
    const expiringSoon = counts.expiring;
    const totalValue = contracts
      .filter((c) => displayOf(c) === 'Active')
      .reduce((sum, c) => sum + c.value, 0);
    return { active, expiringSoon, totalValue };
  }, [contracts, displayById, counts.active, counts.expiring]);

  // ⚠️ COMPUTED, not counted off the stored literal. Measured on 2026-09-08,
  // the day this changed: the tile read 5 (the authored `Overdue` count, exactly
  // right at `DECLARED_PRESENT`) while the correct answer against the wall clock
  // was 11 — six obligations past due that the buyer was not being shown. The
  // tile could never have moved, because a stored literal does not.
  const overdueObligations = useMemo(
    () =>
      obligations.filter((o) => obligationDisplay(o, nowIso) === 'Overdue')
        .length,
    [obligations, nowIso],
  );

  const filtered = useMemo(() => {
    return contracts
      .filter((c) => matchesGroup(displayOf(c), group))
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
  }, [contracts, group, selectedTypes, search, displayById]);

  const renewalPipeline = useMemo(() => {
    // The 180 arm SURVIVES and is now `CONTRACT_RENEWAL_HORIZON_DAYS`, named in
    // `contractExpiry.ts` beside the reason: this is a PLANNING horizon grouped
    // by month, and routing it through the classifier would collapse a
    // two-quarter view into a duplicate of the Expiring tab. It is the one
    // window left on this axis, and it is no longer a literal on a page.
    const upcoming = contracts.filter((c) => inRenewalHorizon(c, nowIso));
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
  }, [contracts, nowIso]);

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
        {/* D-CENSUS-8 — `contracts` is null-backed: no contract lifecycle target is
            wired, and SAP owns contract identity. The create wizard on this page
            still mints one client-side (CTR-FABRICATION-01 / CTR-NUMBER-FABRICATION-01,
            filed for the D-CENSUS-3 demotion batch); the marker states the feed
            fact now and does not pretend the wizard's output is a real contract. */}
        <ProvenanceMarker capability="contracts" className="ml-3 align-middle" />
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
                  onClick={() => openContract(c)}
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
                    <ExpiryCell
                      days={daysUntil(c.endDate, nowIso)}
                      display={displayOf(c)}
                    />
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
                    <StatusPill variant={STATUS_VARIANT[displayOf(c)]}>
                      {displayOf(c)}
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
                        onClick={() => openContract(c)}
                        className="text-left flex items-start gap-3 p-3 rounded-md border border-border-subtle hover:border-teal hover:shadow-sm transition-all"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            CONTRACT_EXPIRY_CHIP[displayOf(c)]
                          }`}
                        >
                          {expiryDays(c)}d
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
