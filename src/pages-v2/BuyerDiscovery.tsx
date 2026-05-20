import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Globe2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Mail,
  Bot,
  ChevronRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';

interface GlobalSupplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  region: string;
  categories: string[];
  certifications: string[];
  validatedBy: string[];
  matchScore: number;
  description: string;
  employees: string;
  founded: string;
  halalCertified: boolean;
  alreadyInNetwork: boolean;
}

interface SingleSourceItem {
  material: string;
  category: string;
  currentSupplier: string;
  risk: string;
  riskLevel: 'Critical' | 'High' | 'Medium';
  suggestedAlternatives: string[];
}

interface RecommendedSupplier {
  id: string;
  name: string;
  country: string;
  flag: string;
  matchScore: number;
  whyRecommended: string;
  covers: string;
  riskNote?: string;
  storefrontPath: string;
}

interface QualificationItem {
  supplier: string;
  flag: string;
  stage: number;
  stageName: string;
  stageTotal: number;
  startDate: string;
  owner: string;
  nextAction: string;
  dueDate: string;
  status: 'On Track' | 'At Risk' | 'Blocked';
}

interface MarketIntelCard {
  category: string;
  marketStatus: string;
  suppliersGlobal: number;
  suppliersParagon: number;
  priceTrend: string;
  priceDir: 'up' | 'down' | 'flat';
  recommendation: string;
}

const GLOBAL_SUPPLIERS: GlobalSupplier[] = [
  {
    id: 'gs-001', name: 'Givaudan SA', country: 'Switzerland', flag: '🇨🇭', region: 'Europe',
    categories: ['Fragrance', 'Flavor', 'Active Ingredient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'RSPO'],
    validatedBy: ["L'Oréal", 'Unilever', 'P&G', 'Shiseido', 'LVMH'],
    matchScore: 96, employees: '16,000+', founded: '1895',
    description: 'World\'s largest fragrance and flavor company. Supplies to all major global beauty brands. Strong halal portfolio with dedicated Islamic certification team.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-002', name: 'DSM-Firmenich', country: 'Netherlands', flag: '🇳🇱', region: 'Europe',
    categories: ['Active Ingredient', 'Fragrance', 'Vitamin'],
    certifications: ['ISO 9001', 'GMP', 'Halal JAKIM', 'COSMOS Organic'],
    validatedBy: ["L'Oréal", 'Estée Lauder', 'Beiersdorf', 'Henkel'],
    matchScore: 91, employees: '28,000+', founded: '2023',
    description: 'Global leader in vitamins, active ingredients, and fragrances. JAKIM halal certified for SEA markets. Strong sustainability credentials aligned with Paragon ESG goals.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-003', name: 'Ashland Global Holdings', country: 'United States', flag: '🇺🇸', region: 'Americas',
    categories: ['Active Ingredient', 'Raw Material', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'RSPO', 'Halal IFANCA'],
    validatedBy: ['P&G', 'Unilever', 'Colgate-Palmolive', 'Johnson & Johnson'],
    matchScore: 87, employees: '4,300+', founded: '1924',
    description: 'Specialty chemical company supplying personal care actives globally. IFANCA halal certified portfolio covering emollients, thickeners, and conditioning agents.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-004', name: 'Croda International', country: 'United Kingdom', flag: '🇬🇧', region: 'Europe',
    categories: ['Active Ingredient', 'Raw Material', 'Emollient'],
    certifications: ['ISO 9001', 'ISO 14001', 'Halal MUI', 'COSMOS', 'NATRUE'],
    validatedBy: ["L'Oréal", 'Shiseido', 'Amorepacific', 'Beiersdorf', 'LVMH'],
    matchScore: 89, employees: '6,000+', founded: '1925',
    description: 'Premium specialty chemical supplier with strong halal and natural credentials. MUI certified. Key supplier to Asian beauty brands. Extensive portfolio for skin care actives.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-005', name: 'PT Indesso Aroma', country: 'Indonesia', flag: '🇮🇩', region: 'Asia Pacific',
    categories: ['Fragrance', 'Natural Extract', 'Essential Oil'],
    certifications: ['BPJPH Halal', 'ISO 9001', 'RSPO', 'COSMOS Natural'],
    validatedBy: ['Unilever Indonesia', 'Wings Group', 'Indofood'],
    matchScore: 93, employees: '500+', founded: '1968',
    description: 'Indonesia\'s leading fragrance house. BPJPH halal certified. Deep knowledge of Indonesian consumer preferences. 7-day lead time vs 35 days from Europe. Reduces Suez Canal exposure.',
    halalCertified: true, alreadyInNetwork: false,
  },
  {
    id: 'gs-006', name: 'Zhejiang NHU Co. Ltd.', country: 'China', flag: '🇨🇳', region: 'Asia Pacific',
    categories: ['Vitamin', 'Active Ingredient', 'Specialty Chemical'],
    certifications: ['ISO 9001', 'GMP', 'Halal BPJPH', 'USP Grade'],
    validatedBy: ['DSM', 'BASF', 'Korean Beauty Brands', 'Japanese OEM'],
    matchScore: 82, employees: '12,000+', founded: '2000',
    description: 'World\'s largest Vitamin E and Niacinamide producer. Competitive pricing 20-30% below European alternatives. BPJPH halal certified. Key supplier to Korean and Japanese beauty industry.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-007', name: 'Evonik Industries AG', country: 'Germany', flag: '🇩🇪', region: 'Europe',
    categories: ['Active Ingredient', 'Specialty Chemical', 'Silicone'],
    certifications: ['ISO 9001', 'ISO 14001', 'GMP', 'Halal IFANCA'],
    validatedBy: ["L'Oréal", 'Henkel', 'Beiersdorf', 'P&G', 'Unilever'],
    matchScore: 84, employees: '34,000+', founded: '2007',
    description: 'Specialty chemicals leader with strong personal care portfolio. IFANCA halal certified silicones and actives. Established relationship with Paragon for active ingredients.',
    halalCertified: true, alreadyInNetwork: true,
  },
  {
    id: 'gs-008', name: 'Univar Solutions', country: 'Malaysia', flag: '🇲🇾', region: 'Asia Pacific',
    categories: ['Raw Material', 'Active Ingredient', 'Distribution'],
    certifications: ['ISO 9001', 'Halal JAKIM', 'GDP Certified'],
    validatedBy: ['BASF', 'Evonik', 'DSM', 'Croda', 'Ashland'],
    matchScore: 85, employees: '9,800+', founded: '1966',
    description: 'Global chemical distributor with Malaysia hub covering SEA. JAKIM halal certified. Single-point access to 100+ global chemical suppliers without direct import complexity.',
    halalCertified: true, alreadyInNetwork: false,
  },
];

const SINGLE_SOURCE: SingleSourceItem[] = [
  { material: 'Givaudan Floral Accord FG-2847', category: 'Fragrance',
    currentSupplier: 'Givaudan DE', riskLevel: 'Critical',
    risk: 'Critical — Suez disruption',
    suggestedAlternatives: ['PT Indesso Aroma ID', 'PT Mane Indonesia ID'] },
  { material: 'Hyaluronic Acid HA-100', category: 'Active Ingredient',
    currentSupplier: 'Evonik Specialty FR', riskLevel: 'High',
    risk: 'High — single EU source',
    suggestedAlternatives: ['Zhejiang NHU CN', 'Bloomage Biotechnology CN'] },
  { material: 'Panthenol B5 USP', category: 'Active Ingredient',
    currentSupplier: 'BASF Personal Care DE', riskLevel: 'High',
    risk: 'High — quality issues + single source',
    suggestedAlternatives: ['DSM Nutritional SG', 'Univar Solutions MY'] },
  { material: 'Centella Asiatica Extract 10:1', category: 'Natural Botanical',
    currentSupplier: 'PT Ecogreen ID', riskLevel: 'Medium',
    risk: 'Medium — single local source',
    suggestedAlternatives: ['PT Indesso Aroma ID', 'Shaanxi Sciphar CN'] },
  { material: 'Salicylic Acid USP', category: 'Active Ingredient',
    currentSupplier: 'Not yet sourced', riskLevel: 'Critical',
    risk: 'Critical — no qualified supplier',
    suggestedAlternatives: ['Anhui Salicylics CN', 'Seqens FR'] },
];

const RECOMMENDED: RecommendedSupplier[] = [
  { id: 'mkt-001', name: 'PT Indesso Aroma', country: 'Indonesia', flag: '🇮🇩',
    matchScore: 94,
    whyRecommended: 'Indonesian fragrance specialist. BPJPH halal certified. Supplies major local FMCG brands. Would reduce Suez Canal exposure for fragrance compounds. Lead time 7 days vs. 35 days from European suppliers.',
    covers: 'Givaudan Floral Accord gap + Centella gap',
    storefrontPath: '/marketplace/supplier/mkt-001' },
  { id: 'mkt-003', name: 'Univar Solutions Malaysia', country: 'Malaysia', flag: '🇲🇾',
    matchScore: 88,
    whyRecommended: 'Global ingredient distributor with Malaysia hub. Distributes BASF, Evonik, Croda, DSM products across SEA. JAKIM halal certified. Would provide single-point access to multiple European ingredient brands without Suez Canal risk.',
    covers: 'Hyaluronic Acid gap + Panthenol B5 gap',
    storefrontPath: '/marketplace/supplier/mkt-003' },
  { id: 'mkt-004', name: 'Anhui Salicylics China', country: 'China', flag: '🇨🇳',
    matchScore: 79,
    whyRecommended: 'Specialist BHA/salicylic acid manufacturer. GMP certified. Supplies Korean and Japanese beauty brands. Halal certification pending — recommend requesting BPJPH application as qualification condition.',
    covers: 'Salicylic Acid — no current supplier',
    riskNote: 'Halal certification not yet obtained. Add as qualification requirement.',
    storefrontPath: '/marketplace/supplier/mkt-004' },
];

const QUALIFICATIONS: QualificationItem[] = [
  { supplier: 'PT Indesso Aroma', flag: '🇮🇩', stage: 2, stageName: 'Document Review',
    stageTotal: 5, startDate: '2026-03-15', owner: 'Procurement Team',
    nextAction: 'Upload BPJPH certificate', dueDate: '2026-04-15', status: 'On Track' },
  { supplier: 'Univar Solutions MY', flag: '🇲🇾', stage: 1, stageName: 'Initial Contact',
    stageTotal: 5, startDate: '2026-04-01', owner: 'Procurement Team',
    nextAction: 'Schedule capability call', dueDate: '2026-04-12', status: 'On Track' },
  { supplier: 'Anhui Salicylics CN', flag: '🇨🇳', stage: 1, stageName: 'Initial Contact',
    stageTotal: 5, startDate: '2026-04-03', owner: 'Procurement Team',
    nextAction: 'Request halal cert application confirmation', dueDate: '2026-04-17', status: 'At Risk' },
  { supplier: 'Bloomage Biotechnology CN', flag: '🇨🇳', stage: 3, stageName: 'Technical Evaluation',
    stageTotal: 5, startDate: '2026-02-20', owner: 'Quality Team',
    nextAction: 'Receive sample batch results', dueDate: '2026-04-10', status: 'On Track' },
];

const STAGE_LABELS = ['Initial Contact', 'Document Review', 'Technical Eval', 'Commercial', 'Approved'];

const MARKET_INTEL: MarketIntelCard[] = [
  { category: 'Fragrance Compounds', marketStatus: 'Tight supply — high demand from Asian markets',
    suppliersGlobal: 12, suppliersParagon: 3, priceDir: 'up',
    priceTrend: '+2.1% this month (IFRA index)',
    recommendation: 'Expand Indonesian supplier base to reduce European dependency.' },
  { category: 'Active Ingredients (Vitamins)', marketStatus: 'Oversupply from China — favorable pricing',
    suppliersGlobal: 45, suppliersParagon: 2, priceDir: 'down',
    priceTrend: '-3.2% (Niacinamide spot)',
    recommendation: 'Good time to negotiate long-term contracts with Chinese suppliers.' },
  { category: 'Packaging (PET)', marketStatus: 'Stable — moderate demand',
    suppliersGlobal: 89, suppliersParagon: 3, priceDir: 'flat',
    priceTrend: '+1.2% (ICIS PET index)',
    recommendation: 'Evaluate sustainable/recycled PET alternatives for Paragon ESG goals.' },
  { category: 'Halal Emulsifiers', marketStatus: 'Growing supply — Indonesian producers expanding',
    suppliersGlobal: 28, suppliersParagon: 4, priceDir: 'down',
    priceTrend: '-1.5%',
    recommendation: 'Strong Indonesian supplier base — consider expanding VMI arrangements.' },
];

const RISK_VARIANT: Record<SingleSourceItem['riskLevel'], 'danger' | 'warning'> = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'warning',
};

const QUAL_VARIANT: Record<QualificationItem['status'], 'neutral' | 'warning' | 'danger'> = {
  'On Track': 'neutral',
  'At Risk': 'warning',
  'Blocked': 'danger',
};

const MAJOR_BRANDS = ["L'Oréal", 'Unilever', 'P&G', 'Shiseido', 'LVMH', 'Estée Lauder', 'Beiersdorf'];

type TabKey = 'search' | 'recommendations' | 'qualification' | 'intelligence';
type Region = 'All' | 'Asia Pacific' | 'Europe' | 'Americas' | 'Middle East';
type Category = 'All' | 'Fragrance' | 'Active Ingredient' | 'Raw Material' | 'Packaging' | 'Vitamin' | 'Emollient';
type SortKey = 'relevance' | 'grade' | 'otif' | 'compliance';
type ToggleId = 'halal' | 'major';

const REGION_OPTIONS: { id: Region; label: string }[] = [
  { id: 'All', label: 'All regions' },
  { id: 'Asia Pacific', label: 'Asia Pacific' },
  { id: 'Europe', label: 'Europe' },
  { id: 'Americas', label: 'Americas' },
  { id: 'Middle East', label: 'Middle East' },
];

const CATEGORY_OPTIONS: { id: Category; label: string }[] = [
  { id: 'All', label: 'All categories' },
  { id: 'Fragrance', label: 'Fragrance' },
  { id: 'Active Ingredient', label: 'Active Ingredient' },
  { id: 'Raw Material', label: 'Raw Material' },
  { id: 'Packaging', label: 'Packaging' },
  { id: 'Vitamin', label: 'Vitamin' },
  { id: 'Emollient', label: 'Emollient' },
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'grade', label: 'Grade' },
  { id: 'otif', label: 'OTIF' },
  { id: 'compliance', label: 'Compliance' },
];

const TOGGLE_OPTIONS: { id: ToggleId; label: string }[] = [
  { id: 'halal', label: 'Halal certified only' },
  { id: 'major', label: 'Major brand validated' },
];

const scoreColorClass = (score: number): string => {
  if (score >= 90) return 'text-success';
  if (score >= 80) return 'text-teal';
  return 'text-warning';
};

const SuggestionChip: React.FC<{ label: string; onClick: () => void }> = ({
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full border border-border-subtle bg-bg-hover px-3 py-1 text-xs text-text-secondary hover:bg-white hover:text-text-primary transition-colors"
  >
    {label}
  </button>
);

const GlobalSupplierCard: React.FC<{
  supplier: GlobalSupplier;
  onInvite: () => void;
  onAria: () => void;
  onQualify: () => void;
  onInNetwork: () => void;
}> = ({ supplier, onInvite, onAria, onQualify, onInNetwork }) => {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{supplier.flag}</span>
            <span className="text-base font-semibold text-text-primary">
              {supplier.name}
            </span>
            {supplier.alreadyInNetwork && (
              <StatusPill variant="success">In Network</StatusPill>
            )}
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            {supplier.country} · {supplier.region} · Est. {supplier.founded} ·{' '}
            {supplier.employees} employees
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${scoreColorClass(supplier.matchScore)}`}>
            {supplier.matchScore}
            <span className="text-xs font-medium">/100</span>
          </div>
          <div className={`text-[10px] font-semibold ${scoreColorClass(supplier.matchScore)}`}>
            AI Match Score
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        {supplier.description}
      </p>

      <div>
        <div className="text-label text-text-tertiary uppercase mb-2">
          Market validated by
        </div>
        <div className="flex flex-wrap gap-1.5">
          {supplier.validatedBy.map((brand) => (
            <StatusPill key={brand} variant="neutral">
              ✓ {brand}
            </StatusPill>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            Categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {supplier.categories.map((c) => (
              <StatusPill key={c} variant="neutral">
                {c}
              </StatusPill>
            ))}
          </div>
        </div>
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            Certifications
          </div>
          <div className="flex flex-wrap gap-1.5">
            {supplier.halalCertified && (
              <StatusPill variant="success">Halal</StatusPill>
            )}
            {supplier.certifications
              .filter((c) => !c.toLowerCase().includes('halal'))
              .slice(0, 3)
              .map((c) => (
                <StatusPill key={c} variant="neutral">
                  {c}
                </StatusPill>
              ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-border-subtle">
        {!supplier.alreadyInNetwork ? (
          <Button variant="primary" icon={Mail} onClick={onInvite}>
            Invite to Marketplace
          </Button>
        ) : (
          <Button variant="secondary" icon={CheckCircle2} onClick={onInNetwork}>
            Already in Network
          </Button>
        )}
        <Button variant="secondary" icon={Bot} onClick={onAria}>
          Contact via ARIA
        </Button>
        <Button variant="secondary" icon={ArrowRight} onClick={onQualify}>
          Start qualification
        </Button>
      </div>
    </div>
  );
};

const QualificationCard: React.FC<{ item: QualificationItem; onUpdate: () => void }> = ({
  item,
  onUpdate,
}) => {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-sm font-semibold text-text-primary">
          <span className="mr-2 text-base">{item.flag}</span>
          {item.supplier}
        </div>
        <StatusPill variant={QUAL_VARIANT[item.status]}>{item.status}</StatusPill>
      </div>

      <div className="flex items-start gap-1 mb-4">
        {STAGE_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < item.stage;
          const isActive = stepNum === item.stage;
          const dotClass = isDone
            ? 'bg-success text-white'
            : isActive
              ? 'bg-teal text-white'
              : 'bg-bg-hover text-text-tertiary';
          const labelClass = isActive
            ? 'text-teal font-semibold'
            : 'text-text-tertiary';
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center text-center flex-1 min-w-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${dotClass}`}
                >
                  {isDone ? '✓' : stepNum}
                </div>
                <div className={`text-[10px] mt-1 leading-tight ${labelClass}`}>
                  {label}
                </div>
              </div>
              {i < STAGE_LABELS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mt-3 ${
                    isDone ? 'bg-success' : 'bg-border-subtle'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="text-xs text-text-tertiary mb-1">
        <span className="font-semibold text-text-primary">Next: </span>
        {item.nextAction}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">
          Due: {item.dueDate} · {item.owner}
        </span>
        <button
          type="button"
          onClick={onUpdate}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:text-teal-hover"
        >
          Update status <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

const RecommendationCard: React.FC<{
  supplier: RecommendedSupplier;
  onViewStorefront: () => void;
  onQualify: () => void;
  onInviteRfq: () => void;
}> = ({ supplier, onViewStorefront, onQualify, onInviteRfq }) => {
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-text-primary">
            <span className="mr-2 text-lg">{supplier.flag}</span>
            {supplier.name}
          </div>
          <div className="text-xs text-text-tertiary mt-0.5">{supplier.country}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-xl font-bold ${scoreColorClass(supplier.matchScore)}`}>
            {supplier.matchScore}
            <span className="text-xs font-medium">/100</span>
          </div>
          <div className={`text-[10px] font-semibold ${scoreColorClass(supplier.matchScore)}`}>
            AI Match Score
          </div>
        </div>
      </div>
      <p className="text-sm text-text-primary leading-relaxed mb-3">
        {supplier.whyRecommended}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-text-tertiary font-semibold">Covers:</span>
        <StatusPill variant="info">{supplier.covers}</StatusPill>
      </div>
      {supplier.riskNote && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 mb-3 text-xs text-warning">
          {supplier.riskNote}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={ChevronRight} onClick={onViewStorefront}>
          View storefront
        </Button>
        <Button variant="secondary" onClick={onQualify}>
          Start qualification
        </Button>
        <Button variant="secondary" onClick={onInviteRfq}>
          Invite to RFQ
        </Button>
      </div>
    </div>
  );
};

const TrendIcon: React.FC<{ dir: MarketIntelCard['priceDir'] }> = ({ dir }) => {
  if (dir === 'up')
    return <TrendingUp size={18} className="text-danger" aria-hidden="true" />;
  if (dir === 'down')
    return <TrendingDown size={18} className="text-success" aria-hidden="true" />;
  return <Minus size={18} className="text-warning" aria-hidden="true" />;
};

const trendColorClass = (dir: MarketIntelCard['priceDir']): string => {
  if (dir === 'up') return 'text-danger';
  if (dir === 'down') return 'text-success';
  return 'text-warning';
};

const BuyerDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>('search');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<Region>('All');
  const [category, setCategory] = useState<Category>('All');
  const [toggles, setToggles] = useState<ToggleId[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('relevance');

  const halalOnly = toggles.includes('halal');
  const majorOnly = toggles.includes('major');

  const onToggle = (id: ToggleId) => {
    setToggles((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const resetSearch = () => {
    setSearch('');
    setRegion('All');
    setCategory('All');
    setToggles([]);
  };

  const hasAnyFilter =
    search !== '' ||
    region !== 'All' ||
    category !== 'All' ||
    toggles.length > 0;

  const filtered = useMemo(() => {
    return GLOBAL_SUPPLIERS.filter((s) => {
      if (halalOnly && !s.halalCertified) return false;
      if (region !== 'All' && s.region !== region) return false;
      if (category !== 'All' && !s.categories.includes(category)) return false;
      if (majorOnly && !s.validatedBy.some((b) => MAJOR_BRANDS.includes(b)))
        return false;
      if (search) {
        const words = search
          .toLowerCase()
          .split(' ')
          .filter((w) => w.length > 1);
        if (words.length === 0) return true;
        return words.some(
          (w) =>
            s.name.toLowerCase().includes(w) ||
            s.categories.some((c) => c.toLowerCase().includes(w)) ||
            s.description.toLowerCase().includes(w) ||
            s.country.toLowerCase().includes(w) ||
            s.region.toLowerCase().includes(w),
        );
      }
      return true;
    });
  }, [search, region, category, halalOnly, majorOnly]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'grade' || sortBy === 'otif') {
      list.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortBy === 'compliance') {
      const score = (s: GlobalSupplier) =>
        (s.halalCertified ? 2 : 0) + s.certifications.length;
      list.sort((a, b) => score(b) - score(a));
    } else {
      const boost = (s: GlobalSupplier) =>
        (s.halalCertified ? 5 : 0) + s.certifications.length;
      list.sort((a, b) => b.matchScore + boost(b) - (a.matchScore + boost(a)));
    }
    return list;
  }, [filtered, sortBy]);

  const lastUpdated = useMemo(() => {
    const latest = QUALIFICATIONS.reduce((acc, q) =>
      q.dueDate > acc ? q.dueDate : acc, QUALIFICATIONS[0]?.dueDate ?? '');
    if (!latest) return '';
    return new Date(latest).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const counts = {
    candidates: GLOBAL_SUPPLIERS.length + 10,
    qualifying: QUALIFICATIONS.length,
    approved: 2,
    gaps: SINGLE_SOURCE.length,
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['ACQUIRE', 'DISCOVERY']}
        title="Supplier Discovery"
        subtitle="Find and qualify new suppliers globally — market-validated by L'Oréal, Unilever, P&G, Shiseido and more."
        actions={
          <Button
            variant="primary"
            icon={Globe2}
            onClick={() => navigate('/marketplace')}
          >
            Open Marketplace
          </Button>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {counts.candidates} candidates · last updated {lastUpdated}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow="Candidates Identified"
          value={counts.candidates.toString()}
          subtitle="Across global beauty market"
          icon={Users}
        />
        <KpiCard
          eyebrow="In Qualification"
          value={counts.qualifying.toString()}
          subtitle="Active onboarding pipeline"
          icon={ClipboardCheck}
        />
        <KpiCard
          eyebrow="Approved This Month"
          value={counts.approved.toString()}
          subtitle="Net-new qualified suppliers"
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow="Dual-Source Gaps"
          value={counts.gaps.toString()}
          subtitle="Materials with single source"
          icon={AlertTriangle}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'search', label: 'Global Search' },
          { id: 'recommendations', label: 'AI Recommendations' },
          { id: 'qualification', label: 'Qualification Pipeline', count: counts.qualifying },
          { id: 'intelligence', label: 'Market Intelligence' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'search' && (
        <div className="flex flex-col gap-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by material, category, country, or capability…"
          />

          <div className="flex flex-wrap items-center gap-3">
            <FilterChipsBar<Region>
              options={REGION_OPTIONS}
              value={region}
              onChange={setRegion}
            />
            <FilterChipsBar<Category>
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
            />
            <FilterChipsBar<ToggleId>
              options={TOGGLE_OPTIONS}
              value={toggles}
              onChange={onToggle}
              multiSelect
            />
            {hasAnyFilter && (
              <button
                type="button"
                onClick={resetSearch}
                className="text-sm text-teal hover:text-teal-hover font-medium"
              >
                Clear filters
              </button>
            )}
          </div>

          {hasAnyFilter ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="text-meta text-text-tertiary">
                  {sorted.length} supplier{sorted.length !== 1 ? 's' : ''} found
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-meta text-text-tertiary">Sort by</span>
                  <FilterChipsBar<SortKey>
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={setSortBy}
                  />
                </div>
              </div>

              {sorted.length === 0 ? (
                <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
                  <div className="text-base font-semibold text-text-primary mb-1">
                    No suppliers found
                  </div>
                  <div className="text-sm text-text-tertiary max-w-md mx-auto mb-4">
                    No suppliers match your current search. Try different keywords,
                    remove filters, or browse all regions.
                  </div>
                  <Button variant="primary" onClick={resetSearch}>
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {sorted.map((s) => (
                    <GlobalSupplierCard
                      key={s.id}
                      supplier={s}
                      onInvite={() =>
                        toast({
                          variant: 'success',
                          title: `Invitation sent to ${s.name}`,
                          description:
                            'ARIA will follow up via WhatsApp within 24 hours.',
                        })
                      }
                      onInNetwork={() =>
                        toast({
                          title: `${s.name} is already in your supplier network`,
                        })
                      }
                      onAria={() =>
                        toast({
                          title: 'ARIA outreach drafted',
                          description: `Personalized message to ${s.name} ready for review.`,
                        })
                      }
                      onQualify={() =>
                        toast({
                          variant: 'info',
                          title: `Qualification started for ${s.name}`,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-teal-soft flex items-center justify-center mb-4">
                <Globe2 size={24} className="text-teal" />
              </div>
              <div className="text-base font-semibold text-text-primary mb-2">
                Search the global supplier market
              </div>
              <div className="text-sm text-text-tertiary max-w-xl mx-auto mb-5 leading-relaxed">
                Find suppliers already validated by L'Oréal, Unilever, P&G, Shiseido,
                and LVMH. Filter by halal certification, region, and category. Invite
                directly to Paragon Marketplace or contact via ARIA AI agent.
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Fragrance Indonesia',
                  'Niacinamide China',
                  'Halal emulsifier',
                  'Packaging SEA',
                  'Active ingredient Europe',
                ].map((s) => (
                  <SuggestionChip
                    key={s}
                    label={s}
                    onClick={() => setSearch(s)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'recommendations' && (
        <div className="flex flex-col gap-6">
          <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 text-sm text-danger font-medium">
            5 critical materials have only one qualified supplier — dual sourcing
            strongly recommended.
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle">
              <div className="text-sm font-semibold text-text-primary">
                Materials requiring a second source
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableHeaderCell>Material</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Current supplier</TableHeaderCell>
                <TableHeaderCell>Risk level</TableHeaderCell>
                <TableHeaderCell>Suggested alternatives</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableHeader>
              <tbody>
                {SINGLE_SOURCE.map((row) => (
                  <TableRow key={row.material}>
                    <TableCell>
                      <div className="font-semibold text-text-primary">
                        {row.material}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-text-secondary">
                        {row.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm ${
                          row.currentSupplier === 'Not yet sourced'
                            ? 'text-danger font-semibold'
                            : 'text-text-primary'
                        }`}
                      >
                        {row.currentSupplier}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusPill variant={RISK_VARIANT[row.riskLevel]}>
                        {row.riskLevel}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {row.suggestedAlternatives.map((alt) => (
                          <StatusPill key={alt} variant="info">
                            {alt}
                          </StatusPill>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="primary"
                        onClick={() =>
                          toast({
                            variant: 'info',
                            title: `Qualification started for ${row.suggestedAlternatives[0]}`,
                          })
                        }
                      >
                        Start qualification
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-teal" />
              <h3 className="text-base font-semibold text-text-primary">
                AI supplier matches — recommended for Paragon
              </h3>
            </div>
            <p className="text-sm text-text-tertiary mb-4">
              Based on your category requirements, compliance standards, and halal
              certification needs.
            </p>
            <div className="flex flex-col gap-4">
              {RECOMMENDED.map((s) => (
                <RecommendationCard
                  key={s.id}
                  supplier={s}
                  onViewStorefront={() => navigate(s.storefrontPath)}
                  onQualify={() =>
                    toast({
                      variant: 'info',
                      title: `Qualification started for ${s.name}`,
                    })
                  }
                  onInviteRfq={() =>
                    toast({
                      variant: 'success',
                      title: `${s.name} invited to RFQ`,
                      description: 'Invitation sent via email.',
                    })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'qualification' && (
        <div>
          <h3 className="text-base font-semibold text-text-primary mb-4">
            Active qualification processes
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {QUALIFICATIONS.map((q) => (
              <QualificationCard
                key={q.supplier}
                item={q}
                onUpdate={() =>
                  toast({
                    variant: 'success',
                    title: `Status updated for ${q.supplier}`,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'intelligence' && (
        <div>
          <h3 className="text-base font-semibold text-text-primary mb-1">
            Category market intelligence
          </h3>
          <p className="text-sm text-text-tertiary mb-4">
            Current market conditions for Paragon's key procurement categories.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {MARKET_INTEL.map((card) => (
              <div
                key={card.category}
                className="bg-bg-surface border border-border-subtle rounded-lg p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-text-primary">
                      {card.category}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {card.marketStatus}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <TrendIcon dir={card.priceDir} />
                    <div className={`text-[11px] font-semibold mt-1 ${trendColorClass(card.priceDir)}`}>
                      {card.priceTrend}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <div className="text-lg font-bold text-text-primary">
                      {card.suppliersGlobal}
                    </div>
                    <div className="text-[11px] text-text-tertiary">Global</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-teal">
                      {card.suppliersParagon}
                    </div>
                    <div className="text-[11px] text-text-tertiary">In network</div>
                  </div>
                </div>
                <div className="bg-teal-soft border-l-2 border-teal rounded px-3 py-2 text-xs text-text-primary">
                  {card.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShellV2>
  );
};

export default BuyerDiscovery;
