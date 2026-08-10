import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import LivenessPill from '../components/ui-v2/LivenessPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import type {
  GlobalSupplier,
  SingleSourceItem,
  RecommendedSupplier,
  QualificationItem,
  MarketIntelCard,
} from '../services/data/types';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import {
  useGlobalSuppliers,
  useRecommended,
  useQualifications,
  useMarketIntel,
  useSingleSourceItems,
} from '../services/query/hooks';

// Breadcrumb is built from t() inside the component (see `crumb`).
const STAGE_LABEL_KEYS = [
  'discovery.qual.stage.contact',
  'discovery.qual.stage.docReview',
  'discovery.qual.stage.techEval',
  'discovery.qual.stage.commercial',
  'discovery.qual.stage.approved',
] as const;

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

// Filter/sort option labels are built from t() inside the component so they
// re-render on locale change. The `id` values stay enum literals for logic.
const buildRegionOptions = (t: TFunction): { id: Region; label: string }[] => [
  { id: 'All', label: t('discovery.region.all') },
  { id: 'Asia Pacific', label: t('discovery.region.apac') },
  { id: 'Europe', label: t('discovery.region.europe') },
  { id: 'Americas', label: t('discovery.region.americas') },
  { id: 'Middle East', label: t('discovery.region.middleEast') },
];

const buildCategoryOptions = (t: TFunction): { id: Category; label: string }[] => [
  { id: 'All', label: t('discovery.category.all') },
  { id: 'Fragrance', label: t('discovery.category.fragrance') },
  { id: 'Active Ingredient', label: t('discovery.category.activeIngredient') },
  { id: 'Raw Material', label: t('discovery.category.rawMaterial') },
  { id: 'Packaging', label: t('discovery.category.packaging') },
  { id: 'Vitamin', label: t('discovery.category.vitamin') },
  { id: 'Emollient', label: t('discovery.category.emollient') },
];

const buildSortOptions = (t: TFunction): { id: SortKey; label: string }[] => [
  { id: 'relevance', label: t('discovery.sort.relevance') },
  { id: 'grade', label: t('discovery.sort.grade') },
  { id: 'otif', label: t('discovery.sort.otif') },
  { id: 'compliance', label: t('discovery.sort.compliance') },
];

const buildToggleOptions = (t: TFunction): { id: ToggleId; label: string }[] => [
  { id: 'halal', label: t('discovery.toggle.halal') },
  { id: 'major', label: t('discovery.toggle.major') },
];

const scoreColorClass = (score: number): string => {
  if (score >= 90) return 'text-success';
  if (score >= 80) return 'text-teal';
  return 'text-warning-hover';
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
  const { t } = useTranslation();
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
            {t('discovery.card.meta', {
              country: supplier.country,
              region: supplier.region,
              founded: supplier.founded,
              employees: supplier.employees,
            })}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold ${scoreColorClass(supplier.matchScore)}`}>
            {supplier.matchScore}
            <span className="text-xs font-medium">/100</span>
          </div>
          <div className={`text-[10px] font-semibold ${scoreColorClass(supplier.matchScore)}`}>
            {t('discovery.card.matchScore')}
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed">
        {supplier.description}
      </p>

      <div>
        <div className="text-label text-text-tertiary uppercase mb-2">
          {t('discovery.card.validatedBy')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {/* D-CENSUS-8 · DISCOVERY-ENDORSEMENT-01 — the ✓ is GONE. A check mark beside
              a real corporation's name is an assertion that the corporation vetted
              this supplier; nothing in the portal checks that, and the suppliers here
              are fictional. The brand names themselves remain in the fixture and are
              filed for a fixture batch — retracting the ASSERTION is what marking can
              honestly do; inventing different brand names is not marking. */}
          {supplier.validatedBy.map((brand) => (
            <StatusPill key={brand} variant="neutral">
              {brand}
            </StatusPill>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('discovery.card.categories')}
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
            {t('discovery.card.certifications')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {supplier.halalCertified && (
              <StatusPill variant="success">{t('discovery.card.halal')}</StatusPill>
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
          <Button variant="outline" icon={Mail} onClick={onInvite}>
            {t('discovery.card.invite')}
          </Button>
        ) : (
          <Button variant="secondary" icon={CheckCircle2} onClick={onInNetwork}>
            {t('discovery.card.inNetwork')}
          </Button>
        )}
        <Button variant="secondary" icon={Bot} onClick={onAria}>
          {t('discovery.card.contactAria')}
        </Button>
        <Button variant="secondary" icon={ArrowRight} onClick={onQualify}>
          {t('discovery.action.startQualification')}
        </Button>
      </div>
    </div>
  );
};

const QualificationCard: React.FC<{ item: QualificationItem; onUpdate: () => void }> = ({
  item,
  onUpdate,
}) => {
  const { t } = useTranslation();
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
        {STAGE_LABEL_KEYS.map((labelKey, i) => {
          const label = t(labelKey);
          const stepNum = i + 1;
          const isDone = stepNum < item.stage;
          const isActive = stepNum === item.stage;
          const dotClass = isDone
            ? 'bg-success text-white'
            : isActive
              ? 'bg-action text-white'
              : 'bg-bg-hover text-text-tertiary';
          const labelClass = isActive
            ? 'text-teal font-semibold'
            : 'text-text-tertiary';
          return (
            <React.Fragment key={labelKey}>
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
              {i < STAGE_LABEL_KEYS.length - 1 && (
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
        <span className="font-semibold text-text-primary">{t('discovery.qual.next')} </span>
        {item.nextAction}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-tertiary">
          {t('discovery.qual.due', { date: item.dueDate, owner: item.owner })}
        </span>
        <button
          type="button"
          onClick={onUpdate}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:text-teal-hover"
        >
          {t('discovery.qual.updateStatus')} <ArrowRight size={12} />
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
  const { t } = useTranslation();
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
            {t('discovery.card.matchScore')}
          </div>
        </div>
      </div>
      <p className="text-sm text-text-primary leading-relaxed mb-3">
        {supplier.whyRecommended}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-text-tertiary font-semibold">{t('discovery.rec.covers')}</span>
        <StatusPill variant="info">{supplier.covers}</StatusPill>
      </div>
      {supplier.riskNote && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-3 py-2 mb-3 text-xs text-warning-hover">
          {supplier.riskNote}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" icon={ChevronRight} onClick={onViewStorefront}>
          {t('discovery.rec.viewStorefront')}
        </Button>
        <Button variant="secondary" onClick={onQualify}>
          {t('discovery.action.startQualification')}
        </Button>
        <Button variant="secondary" onClick={onInviteRfq}>
          {t('discovery.rec.inviteRfq')}
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
  return <Minus size={18} className="text-warning-hover" aria-hidden="true" />;
};

const trendColorClass = (dir: MarketIntelCard['priceDir']): string => {
  if (dir === 'up') return 'text-danger';
  if (dir === 'down') return 'text-success';
  return 'text-warning-hover';
};

const BuyerDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const crumb = [t('discovery.crumb.acquire'), t('discovery.crumb.discovery')];

  const REGION_OPTIONS = buildRegionOptions(t);
  const CATEGORY_OPTIONS = buildCategoryOptions(t);
  const SORT_OPTIONS = buildSortOptions(t);
  const TOGGLE_OPTIONS = buildToggleOptions(t);

  const globalQ = useGlobalSuppliers();
  const recommendedQ = useRecommended();
  const qualificationsQ = useQualifications();
  const marketIntelQ = useMarketIntel();
  const singleSourceQ = useSingleSourceItems();

  const GLOBAL_SUPPLIERS = globalQ.data?.items ?? [];
  const RECOMMENDED = recommendedQ.data?.items ?? [];
  const QUALIFICATIONS = qualificationsQ.data?.items ?? [];
  const MARKET_INTEL = marketIntelQ.data?.items ?? [];
  const SINGLE_SOURCE = singleSourceQ.data?.items ?? [];

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
  }, [GLOBAL_SUPPLIERS, search, region, category, halalOnly, majorOnly]);

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
  }, [QUALIFICATIONS]);

  const counts = {
    candidates: GLOBAL_SUPPLIERS.length + 10,
    qualifying: QUALIFICATIONS.length,
    approved: 2,
    gaps: SINGLE_SOURCE.length,
  };

  const anyPending =
    globalQ.isPending ||
    recommendedQ.isPending ||
    qualificationsQ.isPending ||
    marketIntelQ.isPending ||
    singleSourceQ.isPending;
  const anyError =
    globalQ.isError ||
    recommendedQ.isError ||
    qualificationsQ.isError ||
    marketIntelQ.isError ||
    singleSourceQ.isError;
  const allEmpty =
    GLOBAL_SUPPLIERS.length === 0 &&
    RECOMMENDED.length === 0 &&
    QUALIFICATIONS.length === 0 &&
    MARKET_INTEL.length === 0 &&
    SINGLE_SOURCE.length === 0;

  if (anyPending) return <LoadingState breadcrumb={crumb} />;
  if (anyError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={
          globalQ.error ??
          recommendedQ.error ??
          qualificationsQ.error ??
          marketIntelQ.error ??
          singleSourceQ.error
        }
        onRetry={() => {
          globalQ.refetch();
          recommendedQ.refetch();
          qualificationsQ.refetch();
          marketIntelQ.refetch();
          singleSourceQ.refetch();
        }}
      />
    );
  if (allEmpty)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('discovery.empty.title')}
        subtitle={t('discovery.empty.subtitle')}
        message={t('discovery.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('discovery.header.title')}
        subtitle={t('discovery.header.subtitle')}
        actions={
          <Button
            variant="outline"
            icon={Globe2}
            onClick={() => navigate('/marketplace')}
          >
            {t('discovery.action.openMarketplace')}
          </Button>
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('discovery.meta.summary', { count: counts.candidates, date: lastUpdated })}
        {/* D-CENSUS-8 — MARKER-SCOPE-01. This page DID carry a LivenessPill, but only
            on the Market-Intelligence tab (capability="commodityIntel"), so the
            candidate pool — the page's actual claim, and the one the header presented
            as externally validated — was unmarked while a sibling tab wore a marker.
            A reader generalises the badge they can see. This states it page-wide. */}
        <ProvenanceMarker capability="supplierDiscovery" className="ml-3 align-middle" />
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow={t('discovery.kpi.candidates.eyebrow')}
          value={counts.candidates.toString()}
          subtitle={t('discovery.kpi.candidates.subtitle')}
          icon={Users}
        />
        <KpiCard
          eyebrow={t('discovery.kpi.qualifying.eyebrow')}
          value={counts.qualifying.toString()}
          subtitle={t('discovery.kpi.qualifying.subtitle')}
          icon={ClipboardCheck}
        />
        <KpiCard
          eyebrow={t('discovery.kpi.approved.eyebrow')}
          value={counts.approved.toString()}
          subtitle={t('discovery.kpi.approved.subtitle')}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('discovery.kpi.gaps.eyebrow')}
          value={counts.gaps.toString()}
          subtitle={t('discovery.kpi.gaps.subtitle')}
          icon={AlertTriangle}
        />
      </div>

      <SubTabs<TabKey>
        options={[
          { id: 'search', label: t('discovery.tab.search') },
          { id: 'recommendations', label: t('discovery.tab.recommendations') },
          { id: 'qualification', label: t('discovery.tab.qualification'), count: counts.qualifying },
          { id: 'intelligence', label: t('discovery.tab.intelligence') },
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
            placeholder={t('discovery.search.placeholder')}
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
                {t('discovery.filter.clear')}
              </button>
            )}
          </div>

          {hasAnyFilter ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div className="text-meta text-text-tertiary">
                  {sorted.length === 1
                    ? t('discovery.results.count.one', { count: sorted.length })
                    : t('discovery.results.count.other', { count: sorted.length })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-meta text-text-tertiary">{t('discovery.sort.label')}</span>
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
                    {t('discovery.results.empty.title')}
                  </div>
                  <div className="text-sm text-text-tertiary max-w-md mx-auto mb-4">
                    {t('discovery.results.empty.body')}
                  </div>
                  <Button variant="outline" onClick={resetSearch}>
                    {t('discovery.results.empty.clear')}
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
                          title: t('discovery.toast.invited.title', { name: s.name }),
                          description: t('discovery.toast.invited.desc'),
                        })
                      }
                      onInNetwork={() =>
                        toast({
                          title: t('discovery.toast.inNetwork.title', { name: s.name }),
                        })
                      }
                      onAria={() =>
                        toast({
                          title: t('discovery.toast.aria.title'),
                          description: t('discovery.toast.aria.desc', { name: s.name }),
                        })
                      }
                      onQualify={() =>
                        toast({
                          variant: 'info',
                          title: t('discovery.toast.qualStarted.title', { name: s.name }),
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
                {t('discovery.hero.title')}
              </div>
              <div className="text-sm text-text-tertiary max-w-xl mx-auto mb-5 leading-relaxed">
                {t('discovery.hero.body')}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  // i18n-defer: example search seeds — the chip label IS the query
                  // fed to setSearch() and matched against EN supplier data, so
                  // translating it would break search. Left EN by design.
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
            {t('discovery.rec.dualSourceBanner')}
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle">
              <div className="text-sm font-semibold text-text-primary">
                {t('discovery.rec.secondSourceTitle')}
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('discovery.rec.col.material')}</TableHeaderCell>
                <TableHeaderCell>{t('discovery.rec.col.category')}</TableHeaderCell>
                <TableHeaderCell>{t('discovery.rec.col.currentSupplier')}</TableHeaderCell>
                <TableHeaderCell>{t('discovery.rec.col.riskLevel')}</TableHeaderCell>
                <TableHeaderCell>{t('discovery.rec.col.alternatives')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('discovery.rec.col.action')}</TableHeaderCell>
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
                        variant="outline"
                        onClick={() =>
                          toast({
                            variant: 'info',
                            title: t('discovery.toast.qualStarted.title', {
                              name: row.suggestedAlternatives[0],
                            }),
                          })
                        }
                      >
                        {t('discovery.action.startQualification')}
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
              <h3 className="text-section text-text-primary">
                {t('discovery.rec.matchesTitle')}
              </h3>
            </div>
            <p className="text-sm text-text-tertiary mb-4">
              {t('discovery.rec.matchesSubtitle')}
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
                      title: t('discovery.toast.qualStarted.title', { name: s.name }),
                    })
                  }
                  onInviteRfq={() =>
                    toast({
                      variant: 'success',
                      title: t('discovery.toast.rfqInvited.title', { name: s.name }),
                      description: t('discovery.toast.rfqInvited.desc'),
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
          <h3 className="text-section text-text-primary mb-4">
            {t('discovery.qualTab.title')}
          </h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {QUALIFICATIONS.map((q) => (
              <QualificationCard
                key={q.supplier}
                item={q}
                onUpdate={() =>
                  toast({
                    variant: 'success',
                    title: t('discovery.toast.statusUpdated.title', { name: q.supplier }),
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'intelligence' && (
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-section text-text-primary">
              {t('discovery.intel.title')}
            </h3>
            {/* CI-0 — the whole tab reads invented category stats; the shared
                honest-render pill (registry-derived, can only show "Sample")
                declares that up front. */}
            <LivenessPill capability="commodityIntel" />
          </div>
          <p className="text-sm text-text-tertiary mb-4">
            {t('discovery.intel.subtitle')}
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
                    <div className="text-[11px] text-text-tertiary">{t('discovery.intel.global')}</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-teal">
                      {card.suppliersParagon}
                    </div>
                    <div className="text-[11px] text-text-tertiary">{t('discovery.intel.inNetwork')}</div>
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
