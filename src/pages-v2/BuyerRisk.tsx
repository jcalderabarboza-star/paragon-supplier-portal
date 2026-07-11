import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  FileSpreadsheet,
  BellRing,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import { CHART_SEMANTIC, CHART_IDENTITY } from '../lib/chartPalette';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import { severityTone } from '../lib/statusTone';
import { useToast } from '../hooks/useToast';
import {
  useRiskAlerts,
  useGeoRisks,
  useExposure,
  useScenarios,
  useCompliance,
  useCommodities,
} from '../services/query/hooks';
import type {
  RiskSeverity as Severity,
  RiskAlertLevel as AlertLevel,
  RiskAlert,
  GeoRisk,
  ExposureRow,
  ComplianceRow,
  ComplianceState,
  Commodity,
  Scenario,
  ScenarioAlt,
  ScenarioFeasibility as Feasibility,
} from '../services/data/types';

type TabKey = 'geo' | 'exposure' | 'scenario' | 'compliance' | 'commodity';

// Scenario picker — the modelable library. Only fully-modeled scenarios carry
// detail data (served by useScenarios); the picker lists the wider set. Labels
// are localized in-component; the `id` stays canonical (it is the picker value
// matched against fixture scenario ids).
const SCENARIO_LIBRARY_IDS = ['me', 'tw', 'pa'] as const;

// DP2-PALETTE-01 (Commit 4): chart/map colour sourced from the central palette
// (SSoT), not page-local hex. Values unchanged except the stray categorical blue
// (#1E5BAE) — that TOKEN_INFO is removed; DC/hub markers now use the sanctioned
// identity blue CHART_IDENTITY (#2A6FBF).
const TOKEN_SUCCESS = CHART_SEMANTIC.success;
const TOKEN_WARNING = CHART_SEMANTIC.warning;
const TOKEN_DANGER = CHART_SEMANTIC.danger;
const TOKEN_MUTED = CHART_SEMANTIC.neutral;


const FEASIBILITY_VARIANT: Record<Feasibility, 'success' | 'warning' | 'danger'> = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
};

const COMPLIANCE_VARIANT: Record<ComplianceState, 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  expiring: 'warning',
  expired: 'danger',
};

const dosVariant = (dos: number): 'success' | 'warning' | 'danger' => {
  if (dos < 30) return 'danger';
  if (dos < 50) return 'warning';
  return 'success';
};

const TAB_DEFS: { id: TabKey; labelKey: string }[] = [
  { id: 'geo', labelKey: 'risk.tab.geo' },
  { id: 'exposure', labelKey: 'risk.tab.exposure' },
  { id: 'scenario', labelKey: 'risk.tab.scenario' },
  { id: 'compliance', labelKey: 'risk.tab.compliance' },
  { id: 'commodity', labelKey: 'risk.tab.commodity' },
];

const PULSE_CSS = `
@keyframes risk-pulse-ring {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
}
.risk-live-pulse::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #BB0000;
  animation: risk-pulse-ring 1.4s ease-out infinite;
}
`;

const ALERT_VARIANT: Record<AlertLevel, { bg: string; border: string; text: string; Icon: LucideIcon }> = {
  critical: { bg: 'bg-danger-soft', border: 'border-danger', text: 'text-danger', Icon: AlertOctagon },
  warning: { bg: 'bg-warning-soft', border: 'border-warning', text: 'text-warning-hover', Icon: AlertTriangle },
  info: { bg: 'bg-info-soft', border: 'border-info', text: 'text-info', Icon: Info },
};

const AlertBanner: React.FC<{ alert: RiskAlert; onDismiss: () => void }> = ({
  alert,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const v = ALERT_VARIANT[alert.level];
  const Icon = v.Icon;
  return (
    <div
      className={`${v.bg} border-l-2 ${v.border} rounded px-4 py-3 mb-2 flex items-start gap-3`}
    >
      <Icon size={16} className={`shrink-0 mt-0.5 ${v.text}`} />
      <div className="flex-1 min-w-0">
        {/* i18n-defer: mock/sample data — alert title/body seeded from fixtures */}
        <div className={`text-sm font-semibold ${v.text}`}>{alert.title}</div>
        <div className="text-xs text-text-secondary mt-1">{alert.body}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-text-tertiary hover:text-text-secondary shrink-0"
        aria-label={t('risk.alert.dismiss')}
      >
        <X size={14} />
      </button>
    </div>
  );
};

const WorldMap: React.FC = () => {
  const { t } = useTranslation();
  const dots = [
    { label: t('risk.map.region.taiwan'), cx: 745, cy: 185, color: TOKEN_DANGER, size: 8 },
    { label: t('risk.map.region.china'), cx: 720, cy: 175, color: TOKEN_DANGER, size: 6 },
    { label: t('risk.map.region.redSea'), cx: 590, cy: 210, color: TOKEN_WARNING, size: 7 },
    { label: t('risk.map.region.ukraine'), cx: 555, cy: 140, color: TOKEN_WARNING, size: 5 },
    { label: t('risk.map.region.saudiArabia'), cx: 600, cy: 220, color: TOKEN_WARNING, size: 5 },
    { label: t('risk.map.region.germany'), cx: 510, cy: 135, color: TOKEN_SUCCESS, size: 4 },
    { label: t('risk.map.region.mexico'), cx: 195, cy: 225, color: TOKEN_SUCCESS, size: 4 },
    { label: t('risk.map.region.dallas'), cx: 190, cy: 215, color: CHART_IDENTITY, size: 5 },
  ];
  const continent = '#F4F6F8';
  const continentStroke = '#D1D8E0';
  const accent = '#FEF3D6';
  const accentStroke = '#B45309';
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
      <div className="text-sm font-semibold text-text-primary mb-3">
        {t('risk.map.title')}
      </div>
      <svg viewBox="0 0 900 440" className="w-full h-auto max-h-80">
        <rect width="900" height="440" fill="#FAFBFC" rx="6" />
        <path
          d="M80 80 L280 80 L310 140 L290 200 L260 240 L200 260 L160 250 L120 230 L80 200 L60 160 Z"
          fill={continent}
          stroke={continentStroke}
          strokeWidth="1"
        />
        <path
          d="M170 270 L240 270 L250 290 L240 360 L200 400 L170 390 L155 350 L150 310 Z"
          fill={continent}
          stroke={continentStroke}
          strokeWidth="1"
        />
        <path
          d="M460 80 L580 80 L585 120 L570 160 L540 165 L490 160 L460 140 Z"
          fill={continent}
          stroke={continentStroke}
          strokeWidth="1"
        />
        <path
          d="M490 180 L580 180 L595 230 L580 340 L540 380 L500 370 L475 320 L470 250 Z"
          fill={continent}
          stroke={continentStroke}
          strokeWidth="1"
        />
        <path
          d="M575 185 L640 185 L645 230 L610 245 L575 240 Z"
          fill={accent}
          stroke={accentStroke}
          strokeWidth="1"
        />
        <path
          d="M640 80 L810 80 L820 160 L800 200 L760 210 L700 200 L655 170 L645 130 Z"
          fill={continent}
          stroke={continentStroke}
          strokeWidth="1"
        />
        <path
          d="M700 210 L770 210 L775 250 L740 270 L700 255 Z"
          fill={continent}
          stroke={continentStroke}
          strokeWidth="1"
        />
        <path
          d="M720 300 L820 300 L830 380 L770 400 L720 380 Z"
          fill={continent}
          stroke={continentStroke}
          strokeWidth="1"
        />
        {dots.map((d) => (
          <g key={d.label}>
            <circle cx={d.cx} cy={d.cy} r={d.size + 4} fill={d.color} opacity={0.2} />
            <circle cx={d.cx} cy={d.cy} r={d.size} fill={d.color} />
            <title>{d.label}</title>
          </g>
        ))}
        {[
          { color: TOKEN_DANGER, label: t('risk.map.legend.critical') },
          { color: TOKEN_WARNING, label: t('risk.map.legend.high') },
          { color: TOKEN_SUCCESS, label: t('risk.map.legend.low') },
          { color: CHART_IDENTITY, label: t('risk.map.legend.hub') },
        ].map((l, i) => (
          <g key={l.label} transform={`translate(20, ${360 + i * 16})`}>
            <circle r={4} cx={6} cy={0} fill={l.color} />
            <text x={14} y={4} fontSize={11} fill={TOKEN_MUTED}>
              {l.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

interface SparkTooltipPayload {
  name: string;
  value: number;
}

const GeopoliticalTab: React.FC<{ geoRisks: GeoRisk[] }> = ({ geoRisks }) => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-col gap-4">
    {geoRisks.map((r) => {
      const sevVariant = severityTone(r.severity);
      const sevSoftBg =
        sevVariant === 'danger'
          ? 'bg-danger-soft'
          : sevVariant === 'warning'
            ? 'bg-warning-soft'
            : 'bg-success-soft';
      return (
        <div
          key={r.country}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden"
        >
          <div
            className={`${sevSoftBg} px-5 py-4 flex items-center gap-4 border-b border-border-subtle`}
          >
            <span className="text-2xl leading-none">{r.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-text-primary">
                  {r.country}
                </span>
                <StatusPill variant={sevVariant}>{r.severity}</StatusPill>
                {/* i18n-defer: mock/sample data — geo-risk card copy seeded from fixtures */}
                <span className="text-xs text-text-tertiary">{r.region}</span>
              </div>
              <div className="text-sm text-text-secondary mt-1">{r.event}</div>
            </div>
            <div className="text-right shrink-0">
              <Data
                as="div"
                className={`text-2xl font-semibold leading-none ${
                  sevVariant === 'danger'
                    ? 'text-danger'
                    : sevVariant === 'warning'
                      ? 'text-warning-hover'
                      : 'text-success'
                }`}
              >
                {r.score}
              </Data>
              <div className="text-[10px] text-text-tertiary mt-0.5">{t('risk.geo.riskScore')}</div>
            </div>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="text-label text-text-tertiary uppercase mb-1">
                {t('risk.geo.impact')}
              </div>
              <div className="text-sm text-text-secondary">{r.impact}</div>
              <div
                className={`text-sm font-semibold mt-2 ${
                  sevVariant === 'danger' ? 'text-danger' : 'text-warning-hover'
                }`}
              >
                {r.exposure}
              </div>
            </div>
            <div>
              <div className="text-label text-text-tertiary uppercase mb-1">
                {t('risk.geo.affectedSuppliers')}
              </div>
              {r.suppliers.map((s) => (
                <div key={s} className="text-sm text-text-primary">
                  • {s}
                </div>
              ))}
            </div>
            <div>
              <div className="text-label text-text-tertiary uppercase mb-1">
                {t('risk.geo.mitigation')}
              </div>
              <div className="text-sm text-text-secondary mb-2">
                {r.mitigation}
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill variant="neutral">
                  Probability: {r.probability}%
                </StatusPill>
                <StatusPill variant="neutral">{r.timeline}</StatusPill>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
  );
};

const ExposureTab: React.FC<{ exposure: ExposureRow[] }> = ({ exposure }) => {
  const { t } = useTranslation();
  const totalExposed = useMemo(
    () =>
      exposure.filter((r) => r.risk !== 'low').reduce((s, r) => s + r.spend, 0),
    [exposure],
  );
  const singleSourceCritical = exposure.filter(
    (r) => !r.dualSource && r.risk === 'critical',
  ).length;
  const atRisk = exposure.filter((r) => r.risk !== 'low').length;
  const dualSourced = exposure.filter((r) => r.dualSource).length;

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 px-5 py-4 border-b border-border-subtle">
        <SummaryStat
          label={t('risk.exposure.totalExposed')}
          value={`$${(totalExposed / 1000).toFixed(1)}M`}
          tone="danger"
        />
        <SummaryStat
          label={t('risk.exposure.singleSourceCritical')}
          value={singleSourceCritical.toString()}
          tone="danger"
        />
        <SummaryStat
          label={t('risk.exposure.categoriesAtRisk')}
          value={atRisk.toString()}
          tone="warning"
        />
        <SummaryStat
          label={t('risk.exposure.dualSourced')}
          value={dualSourced.toString()}
          tone="success"
        />
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('risk.exposure.col.category')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.supplier')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.region')}</TableHeaderCell>
          <TableHeaderCell className="text-right">{t('risk.exposure.col.annualSpend')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.daysOfStock')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.risk')}</TableHeaderCell>
          <TableHeaderCell>{t('risk.exposure.col.dualSource')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {exposure.map((row) => (
            <TableRow key={row.category + row.supplier}>
              <TableCell>
                <span className="font-semibold text-text-primary">
                  {row.category}
                </span>
              </TableCell>
              <TableCell className="text-text-secondary">{row.supplier}</TableCell>
              <TableCell className="text-text-tertiary">{row.region}</TableCell>
              <TableCell className="text-right font-semibold text-text-primary">
                <Data>${(row.spend / 1000).toFixed(1)}M</Data>
              </TableCell>
              <TableCell>
                <StatusPill variant={dosVariant(row.dos)}>
                  {row.dos}d
                </StatusPill>
              </TableCell>
              <TableCell>
                <StatusPill variant={severityTone(row.risk)}>
                  {row.risk}
                </StatusPill>
              </TableCell>
              <TableCell>
                {row.dualSource ? (
                  <span className="text-success font-semibold">✓</span>
                ) : (
                  <span className="text-danger font-semibold">✗</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

const SummaryStat: React.FC<{
  label: string;
  value: string;
  tone: 'danger' | 'warning' | 'success';
}> = ({ label, value, tone }) => (
  <div className="text-center py-2 border-r border-border-subtle last:border-r-0">
    <Data
      as="div"
      className={`text-kpi ${
        tone === 'danger'
          ? 'text-danger'
          : tone === 'warning'
            ? 'text-warning-hover'
            : 'text-success'
      }`}
    >
      {value}
    </Data>
    <div className="text-meta text-text-tertiary mt-1">{label}</div>
  </div>
);

const ScenarioTab: React.FC<{ scenarios: Scenario[] }> = ({ scenarios }) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  // Labels localized; `id` stays canonical (the picker value).
  const scenarioLibrary = SCENARIO_LIBRARY_IDS.map((id) => ({
    id,
    label: t(`risk.scenario.lib.${id}`),
  }));
  const [activeScenario, setActiveScenario] = useState<string>('me');
  const [expandedAlt, setExpandedAlt] = useState<string | null>('s1');
  const [warRoomSent, setWarRoomSent] = useState(false);

  // Detail for the picked scenario; falls back to the first modeled one for
  // library entries that are not yet fully modeled.
  const featured =
    scenarios.find((s) => s.id === activeScenario) ?? scenarios[0];
  if (!featured) return null;

  const sendToWarRoom = () => {
    setWarRoomSent(true);
    toast({
      variant: 'success',
      title: t('risk.toast.warRoomForwarded.title'),
      description: t('risk.toast.warRoomForwarded.desc', { title: featured.title }),
    });
    setTimeout(() => setWarRoomSent(false), 4000);
  };

  return (
    <div className="flex flex-col gap-5">
      <FilterChipsBar
        options={scenarioLibrary}
        value={activeScenario}
        onChange={setActiveScenario}
      />

      <section className="bg-danger-soft border-l-2 border-danger rounded-lg px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* i18n-defer: mock/sample data — scenario title/description/impact seeded from fixtures */}
            <div className="text-base font-bold text-text-primary mb-1">
              {featured.title}
            </div>
            <div className="text-sm text-text-secondary mb-4">
              {featured.description}
            </div>
            <div className="flex flex-wrap gap-6">
              {Object.entries(featured.impact).map(([k, v]) => (
                <div key={k}>
                  <div className="text-lg font-bold text-danger">{v}</div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mt-0.5">
                    {k.replace(/([A-Z])/g, ' $1')}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button
            variant="outline"
            icon={Send}
            onClick={sendToWarRoom}
            className="shrink-0"
          >
            {warRoomSent ? t('risk.scenario.sent') : t('risk.scenario.sendWarRoom')}
          </Button>
        </div>
      </section>

      <div>
        <div className="text-label text-text-tertiary uppercase mb-2">
          {t('risk.scenario.responseAlternatives')}
        </div>
        <div className="flex flex-col gap-2">
          {featured.alternatives.map((alt) => {
            const open = expandedAlt === alt.id;
            const feasVariant = FEASIBILITY_VARIANT[alt.feasibility];
            return (
              <div
                key={alt.id}
                className={`bg-bg-surface border rounded-lg shadow-sm overflow-hidden transition-colors ${
                  open ? 'border-action' : 'border-border-subtle'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedAlt(open ? null : alt.id)}
                  className="w-full px-5 py-3 flex items-center justify-between gap-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* i18n-defer: mock/sample data — alternative name/cost/leadTime/details seeded from fixtures */}
                    <span className="font-bold text-sm text-text-primary">
                      {alt.name}
                    </span>
                    <StatusPill variant={feasVariant}>
                      {alt.feasibility} feasibility
                    </StatusPill>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-semibold text-warning-hover">
                      {alt.cost}
                    </span>
                    <span className="text-xs font-semibold text-info">
                      {alt.leadTime}
                    </span>
                    {open ? (
                      <ChevronUp size={14} className="text-text-tertiary" />
                    ) : (
                      <ChevronDown size={14} className="text-text-tertiary" />
                    )}
                  </div>
                </button>
                {open && (
                  <div className="px-5 pb-4 border-t border-border-subtle">
                    <div className="text-sm text-text-secondary leading-relaxed mt-3">
                      {alt.details}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          toast({
                            variant: 'info',
                            title: t('risk.toast.activationInitiated', {
                              name: alt.name.split('—')[0].trim(),
                            }),
                          })
                        }
                      >
                        {t('risk.scenario.activatePlan')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          toast({
                            title: t('risk.toast.openingAnalysis', {
                              id: alt.id.toUpperCase(),
                            }),
                          })
                        }
                      >
                        {t('risk.scenario.viewFullAnalysis')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-teal" />
          <span className="text-sm font-bold text-teal">{t('risk.scenario.ariaRecommendation')}</span>
          {/* "AI-Powered" is a StatusPill child — left as-is per the central-maps rule */}
          <StatusPill variant="info">
            AI-Powered
          </StatusPill>
        </div>
        {/* i18n-defer: mock/sample narrative — illustrative ARIA recommendation with hardcoded demo figures */}
        <p className="text-sm text-text-secondary leading-relaxed">
          Based on current inventory levels, open PO positions, and freight
          capacity availability, ARIA recommends combining{' '}
          <strong className="text-text-primary">
            Alternative A + Alternative C
          </strong>{' '}
          simultaneously. Activate Cape rerouting now for continuity, while
          building 90-day safety stock for your top 12 critical SKUs. Estimated
          total cost: <strong className="text-teal">$1.06M</strong> vs. $3.2M
          revenue-at-risk if no action taken.
        </p>
        <div className="text-xs text-text-tertiary mt-3">
          Confidence: 84% · Based on 6 similar disruption scenarios · Last
          updated 2 hours ago
        </div>
      </section>
    </div>
  );
};

const ComplianceRisksTab: React.FC<{ compliance: ComplianceRow[] }> = ({
  compliance,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const halalItem = compliance.find((r) => r.type === 'Halal Cert');

  return (
    <div className="flex flex-col gap-4">
      {!bannerDismissed && halalItem && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-warning-hover shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-text-primary">
              {t('risk.compliance.actionRequired')}
            </span>
            {/* Interpolated supplier/type/expires/days stay canonical (fixture data) */}
            <span className="text-sm text-text-secondary">
              {t('risk.compliance.certWarnPrefix', {
                supplier: halalItem.supplier,
                type: halalItem.type,
              })}
              <strong className="text-warning-hover">
                {t('risk.compliance.certWarnDays', { days: halalItem.daysLeft })}
              </strong>
              {t('risk.compliance.certWarnSuffix', { expires: halalItem.expires })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-text-tertiary hover:text-text-secondary shrink-0"
            aria-label={t('risk.compliance.dismissBanner')}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('risk.compliance.col.supplier')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.certRequirement')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.expiryDate')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.daysLeft')}</TableHeaderCell>
            <TableHeaderCell>{t('risk.compliance.col.status')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('risk.compliance.col.action')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {compliance.map((row) => {
              const statusLabel =
                row.status === 'expired'
                  ? 'Expired'
                  : row.status === 'expiring'
                    ? 'Expiring soon'
                    : 'Valid';
              return (
                <TableRow key={row.supplier + row.type}>
                  <TableCell>
                    <span className="font-semibold text-text-primary">
                      {row.supplier}
                    </span>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {row.type}
                  </TableCell>
                  <TableCell className="text-text-tertiary">
                    <Data>{row.expires}</Data>
                  </TableCell>
                  <TableCell>
                    <Data
                      className={`font-bold ${
                        row.status === 'expired'
                          ? 'text-danger'
                          : row.status === 'expiring'
                            ? 'text-warning-hover'
                            : 'text-success'
                      }`}
                    >
                      {row.daysLeft < 0
                        ? t('risk.compliance.overdue', { days: Math.abs(row.daysLeft) })
                        : `${row.daysLeft}d`}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={COMPLIANCE_VARIANT[row.status]}>
                      {statusLabel}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === 'ok' ? (
                      <span className="text-meta text-text-tertiary">
                        ✓ {t('risk.compliance.noAction')}
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() =>
                          toast({
                            variant: row.status === 'expired' ? 'warning' : 'info',
                            title:
                              row.status === 'expired'
                                ? t('risk.toast.urgentRenewal', { supplier: row.supplier })
                                : t('risk.toast.reminderSent', { supplier: row.supplier }),
                          })
                        }
                      >
                        {row.status === 'expired'
                          ? t('risk.compliance.urgentRenewal')
                          : t('risk.compliance.sendReminder')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </Table>
      </div>
      <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-meta text-text-secondary">
        {t('risk.compliance.differentAnglePrefix')}
        <strong className="text-info">{t('risk.compliance.complianceTracker')}</strong>
        {t('risk.compliance.differentAngleSuffix')}
      </div>
    </div>
  );
};

const CommoditySparkTooltip: React.FC<{
  active?: boolean;
  payload?: SparkTooltipPayload[];
  unit?: string;
  name?: string;
}> = ({ active, payload, unit, name }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-2 py-1 text-xs">
      <span className="text-text-secondary">{name}: </span>
      <span className="font-semibold text-text-primary">
        {payload[0].value} {unit}
      </span>
    </div>
  );
};

const CommodityTab: React.FC<{ commodities: Commodity[] }> = ({
  commodities,
}) => {
  const { t } = useTranslation();
  return (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* i18n-defer: mock/sample data — commodity name/unit seeded from fixtures */}
      {commodities.map((c) => {
        const up = c.change > 0;
        const breached = c.alertDir === 'above' && c.current >= c.alert;
        return (
          <div
            key={c.name}
            className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5"
            style={{ borderLeft: `4px solid ${c.color}` }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="font-bold text-sm text-text-primary">
                  {c.name}
                </div>
                <div className="text-xs text-text-tertiary">{c.unit}</div>
              </div>
              <div className="text-right shrink-0">
                <Data
                  as="div"
                  className="text-kpi"
                  style={{ color: c.color }}
                >
                  {c.current > 1000 ? c.current.toLocaleString() : c.current}
                </Data>
                <div
                  className={`text-xs font-semibold ${up ? 'text-danger' : 'text-success'}`}
                >
                  {up ? (
                    <TrendingUp size={12} className="inline-block mr-1" />
                  ) : (
                    <TrendingDown size={12} className="inline-block mr-1" />
                  )}
                  {Math.abs(c.change)}% YTD
                </div>
              </div>
            </div>
            <div className="h-14 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={c.spark}
                  margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                >
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={c.color}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Tooltip
                    content={
                      <CommoditySparkTooltip unit={c.unit} name={c.name} />
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-tertiary">
                {t('risk.commodity.alertIf', {
                  dir:
                    c.alertDir === 'above'
                      ? t('risk.commodity.dirAbove')
                      : t('risk.commodity.dirBelow'),
                })}
              </span>
              <span className="font-bold" style={{ color: c.color }}>
                {c.alert > 1000 ? c.alert.toLocaleString() : c.alert} {c.unit}
              </span>
              <span className="ml-auto">
                {breached ? (
                  <span className="text-danger font-semibold">
                    {t('risk.commodity.thresholdBreached')}
                  </span>
                ) : (
                  <span className="text-success font-semibold">
                    {t('risk.commodity.withinRange')}
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>

    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
      <div className="text-sm font-semibold text-text-primary mb-3">
        {t('risk.commodity.impactAlertsTitle')}
      </div>
      <div className="flex flex-col gap-1.5">
        {commodities.map((c) => {
          const over = c.alertDir === 'above' && c.current >= c.alert;
          return (
            <div
              key={c.name}
              className="flex items-center gap-2 text-sm text-text-secondary"
            >
              <span
                className={over ? 'text-danger font-bold' : 'text-success font-bold'}
              >
                {over ? '⚠' : '✓'}
              </span>
              <span className="font-semibold text-text-primary">{c.name}</span>
              <span className="text-text-tertiary">—</span>
              <span className={over ? 'text-danger' : 'text-text-secondary'}>
                {over
                  ? t('risk.commodity.alertTriggered', {
                      current: c.current,
                      threshold: c.alert,
                    })
                  : t('risk.commodity.withinThreshold', {
                      current: c.current,
                      threshold: c.alert,
                      unit: c.unit,
                    })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
  );
};

const BuyerRisk: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const RISK_CRUMB = [t('risk.crumb.intelligence'), t('risk.crumb.supplyRisk')];
  const TABS = TAB_DEFS.map((tb) => ({ id: tb.id, label: t(tb.labelKey) }));
  const alertsQuery = useRiskAlerts();
  const geoQuery = useGeoRisks();
  const exposureQuery = useExposure();
  const scenariosQuery = useScenarios();
  const complianceQuery = useCompliance();
  const commoditiesQuery = useCommodities();

  const [tab, setTab] = useState<TabKey>('geo');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const alerts = alertsQuery.data?.items ?? [];
  const geoRisks = geoQuery.data?.items ?? [];
  const exposure = exposureQuery.data?.items ?? [];
  const scenarios = scenariosQuery.data?.items ?? [];
  const compliance = complianceQuery.data?.items ?? [];
  const commodities = commoditiesQuery.data?.items ?? [];

  const queries = [
    alertsQuery,
    geoQuery,
    exposureQuery,
    scenariosQuery,
    complianceQuery,
    commoditiesQuery,
  ];
  const anyPending = queries.some((q) => q.isPending);
  const anyError = queries.some((q) => q.isError);
  const allEmpty =
    alerts.length === 0 &&
    geoRisks.length === 0 &&
    exposure.length === 0 &&
    scenarios.length === 0 &&
    compliance.length === 0 &&
    commodities.length === 0;

  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id));

  const lastUpdated = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (anyPending) return <LoadingState breadcrumb={RISK_CRUMB} />;
  if (anyError)
    return (
      <ErrorState
        breadcrumb={RISK_CRUMB}
        error={queries.find((q) => q.isError)?.error}
        onRetry={() => queries.forEach((q) => q.refetch())}
      />
    );
  if (allEmpty)
    return (
      <EmptyState
        breadcrumb={RISK_CRUMB}
        title={t('risk.empty.title')}
        subtitle={t('risk.empty.subtitle')}
        message={t('risk.empty.message')}
      />
    );

  return (
    <AppShellV2>
      <style>{PULSE_CSS}</style>
      <PageHeader
        breadcrumb={RISK_CRUMB}
        title={t('risk.header.title')}
        subtitle={t('risk.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              {
                label: t('risk.action.exportReport'),
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: t('risk.toast.exportStarting'),
                  }),
              },
            ]}
            primary={{
              label: t('risk.action.configureAlerts'),
              icon: BellRing,
              onClick: () =>
                toast({
                  title: t('risk.toast.alertConfig.title'),
                  description: t('risk.toast.alertConfig.desc'),
                }),
            }}
          />
        }
      />

      <div className="-mt-6 mb-6 flex items-center gap-3 text-meta text-text-tertiary">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex w-2.5 h-2.5">
            <span
              className="risk-live-pulse absolute inset-0 rounded-full"
              aria-hidden="true"
            />
            <span className="relative inline-block w-2.5 h-2.5 rounded-full bg-danger" />
          </span>
          <span className="text-xs font-bold text-danger uppercase tracking-wider">
            {t('risk.live')}
          </span>
        </div>
        <span>{t('risk.meta.realtime', { date: lastUpdated })}</span>
      </div>

      {visibleAlerts.length > 0 && (
        <div className="mb-6">
          {visibleAlerts.map((a) => (
            <AlertBanner
              key={a.id}
              alert={a}
              onDismiss={() =>
                setDismissedAlerts((prev) => [...prev, a.id])
              }
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('risk.kpi.events.eyebrow')}
          value="9"
          /* i18n-defer: mock/sample data — hardcoded demo counts + severity words */
          subtitle={<span className="text-danger">3 critical · 4 high</span>}
          icon={AlertOctagon}
        />
        <KpiCard
          eyebrow={t('risk.kpi.exposed.eyebrow')}
          value="$6.1M"
          subtitle={t('risk.kpi.exposed.subtitle')}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('risk.kpi.singleSource.eyebrow')}
          value="3"
          subtitle={<span className="text-danger">{t('risk.kpi.singleSource.subtitle')}</span>}
          icon={AlertOctagon}
        />
        <KpiCard
          eyebrow={t('risk.kpi.expiring.eyebrow')}
          value="2"
          subtitle={t('risk.kpi.expiring.subtitle')}
          icon={AlertTriangle}
        />
      </div>

      <div className="mb-6">
        <WorldMap />
      </div>

      <SubTabs<TabKey>
        options={TABS}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'geo' && <GeopoliticalTab geoRisks={geoRisks} />}
      {tab === 'exposure' && <ExposureTab exposure={exposure} />}
      {tab === 'scenario' && <ScenarioTab scenarios={scenarios} />}
      {tab === 'compliance' && <ComplianceRisksTab compliance={compliance} />}
      {tab === 'commodity' && <CommodityTab commodities={commodities} />}

      <PageMetaLine className="mt-6">
        {t('risk.meta.lastUpdated', { date: lastUpdated })}
      </PageMetaLine>
    </AppShellV2>
  );
};

export default BuyerRisk;
