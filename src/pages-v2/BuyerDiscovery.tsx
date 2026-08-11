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
import StatusPill from '../components/ui-v2/StatusPill';
import LivenessPill from '../components/ui-v2/LivenessPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import { useToast } from '../hooks/useToast';
import type {
  SingleSourceItem,
  RecommendedSupplier,
  QualificationItem,
  MarketIntelCard,
} from '../services/data/types';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { readinessNote } from '../services/liveness';
import {
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

// ⚠️ `MAJOR_BRANDS` WAS HERE — seven real corporations, backing a "Claims a
// major brand" filter over `validatedBy` (`DISCOVERY-ENDORSEMENT-01`). The
// filter is gone with the field it filtered. It was the aggravator that made the
// endorsement worse than decoration: a filterable attribute is one the product
// invites a buyer to shortlist on, so the surface did not merely display the
// fabrication, it asked to be trusted with it.

type TabKey = 'gaps' | 'qualification' | 'intelligence' | 'search';
type Region = 'All' | 'Asia Pacific' | 'Europe' | 'Americas' | 'Middle East';
type Category = 'All' | 'Fragrance' | 'Active Ingredient' | 'Raw Material' | 'Packaging' | 'Vitamin' | 'Emollient';
type SortKey = 'relevance' | 'grade' | 'otif' | 'compliance';
type ToggleId = 'halal';

// Filter/sort option labels are built from t() inside the component so they
// re-render on locale change. The `id` values stay enum literals for logic.




const scoreColorClass = (score: number): string => {
  if (score >= 90) return 'text-success';
  if (score >= 80) return 'text-teal';
  return 'text-warning-hover';
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

  // Gate-2 readiness for the global-search tab — the ONE structural home of the
  // "awaiting <source>" text (LIVENESS-DATASOURCE-01), read, never hand-rolled.
  const discoveryReadiness = readinessNote('supplierDiscovery');

  const recommendedQ = useRecommended();
  const qualificationsQ = useQualifications();
  const marketIntelQ = useMarketIntel();
  const singleSourceQ = useSingleSourceItems();

  const RECOMMENDED = recommendedQ.data?.items ?? [];
  const QUALIFICATIONS = qualificationsQ.data?.items ?? [];
  const MARKET_INTEL = marketIntelQ.data?.items ?? [];
  const SINGLE_SOURCE = singleSourceQ.data?.items ?? [];

  // The page LEADS with the gap console (operator ruling, batch C): the tab that
  // is about Paragon's OWN sourcing concentration is the one that is both useful
  // and honest today. Global search moves last and renders a gated empty state.
  const [tab, setTab] = useState<TabKey>('gaps');

  // The search FILTER STATE is gone with the candidate pool it filtered — region,
  // category, halal-only, the sort keys and the free-text query. A filter over an
  // empty read is an affordance that promises a result it cannot produce, which is
  // the same overstatement one layer down from the scores themselves.

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

  // ── TWO KPI TILES WENT WITH THE CANDIDATE POOL, AND BOTH WERE UNSOURCED ─────
  //   `candidates: GLOBAL_SUPPLIERS.length + 10` — the tile read "18 candidates
  //   identified" over a fixture of 8. The `+ 10` was a literal with no referent:
  //   a rounder, larger number, invented at the point of display.
  //   `approved: 2` was a hard-coded constant, not a count of anything.
  //   Both are deleted rather than recomputed — there is nothing to count.
  const counts = {
    qualifying: QUALIFICATIONS.length,
    atRisk: QUALIFICATIONS.filter((q) => q.status === 'At Risk').length,
    gaps: SINGLE_SOURCE.length,
  };

  const anyPending =
    recommendedQ.isPending ||
    qualificationsQ.isPending ||
    marketIntelQ.isPending ||
    singleSourceQ.isPending;
  const anyError =
    recommendedQ.isError ||
    qualificationsQ.isError ||
    marketIntelQ.isError ||
    singleSourceQ.isError;
  const allEmpty =
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
          recommendedQ.error ??
          qualificationsQ.error ??
          marketIntelQ.error ??
          singleSourceQ.error
        }
        onRetry={() => {
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
        {/* Was "{{count}} candidates · last updated …" over the invented 18. The
            meta line now counts the gaps the page is organised around. */}
        {t('discovery.meta.summary', { count: counts.gaps, date: lastUpdated })}
        {/* D-CENSUS-8 — MARKER-SCOPE-01. This page DID carry a LivenessPill, but only
            on the Market-Intelligence tab (capability="commodityIntel"), so the
            candidate pool — the page's actual claim, and the one the header presented
            as externally validated — was unmarked while a sibling tab wore a marker.
            A reader generalises the badge they can see. This states it page-wide. */}
        <ProvenanceMarker capability="supplierDiscovery" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* The tiles that survive all count something. Dual-source gaps leads,
          because it is the figure the page is now organised around. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <KpiCard
          eyebrow={t('discovery.kpi.gaps.eyebrow')}
          value={counts.gaps.toString()}
          subtitle={t('discovery.kpi.gaps.subtitle')}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('discovery.kpi.qualifying.eyebrow')}
          value={counts.qualifying.toString()}
          subtitle={t('discovery.kpi.qualifying.subtitle')}
          icon={ClipboardCheck}
        />
        <KpiCard
          eyebrow={t('discovery.kpi.atRisk.eyebrow')}
          value={counts.atRisk.toString()}
          subtitle={t('discovery.kpi.atRisk.subtitle')}
          icon={CheckCircle2}
        />
      </div>

      {/* Order is the ruling: what is real today leads; global search is last
          because it has no source yet and says so. */}
      <SubTabs<TabKey>
        options={[
          { id: 'gaps', label: t('discovery.tab.gaps'), count: counts.gaps },
          { id: 'qualification', label: t('discovery.tab.qualification'), count: counts.qualifying },
          { id: 'intelligence', label: t('discovery.tab.intelligence') },
          { id: 'search', label: t('discovery.tab.search') },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />

      {/* ── GLOBAL SEARCH — HONEST BY ABSENCE OF A SOURCE ──────────────────────
          `DISCOVERY-REAL-SUBJECTS-01` batch C. This tab used to list eight real
          corporations with invented match scores. Both the fixture and its
          read-model are deleted, and the tab is gated on gate-2 of the liveness
          model (`LIVENESS-DATASOURCE-01`) rather than repopulated: a candidate
          can now only ever arrive FROM A SOURCE.

          It states WHY it is empty and what would fill it — an empty state that
          explains itself is a different object from one that merely renders. The
          `source` and the readiness note come from the registry, not from a
          literal here, so the day a discovery feed lands this text changes in one
          place. */}
      {tab === 'search' && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-bg-hover flex items-center justify-center mb-4">
            <Globe2 size={24} className="text-text-tertiary" />
          </div>
          <div className="text-base font-semibold text-text-primary mb-2">
            {t('discovery.search.noFeed.title')}
          </div>
          <div className="text-sm text-text-tertiary max-w-xl mx-auto mb-4 leading-relaxed">
            {t('discovery.search.noFeed.body')}
          </div>
          {discoveryReadiness && (
            <div className="text-meta text-text-tertiary">
              {t(discoveryReadiness.readinessNoteKey)}
            </div>
          )}
          <div className="mt-5">
            <Button variant="outline" onClick={() => setTab('gaps')}>
              {t('discovery.search.noFeed.toGaps')}
            </Button>
          </div>
        </div>
      )}

      {tab === 'gaps' && (
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
