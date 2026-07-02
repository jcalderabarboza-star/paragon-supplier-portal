import React, { useMemo, useState } from 'react';
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
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
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

const RISK_CRUMB = ['INTELLIGENCE', 'SUPPLY RISK'];

// Scenario picker — the modelable library. Only fully-modeled scenarios carry
// detail data (served by useScenarios); the picker lists the wider set.
const SCENARIO_LIBRARY: { id: string; label: string }[] = [
  { id: 'me', label: 'Middle East conflict' },
  { id: 'tw', label: 'Taiwan Strait closure' },
  { id: 'pa', label: 'Pandemic resurgence' },
];

const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_DANGER = '#BB0000';
const TOKEN_INFO = '#1E5BAE';
const TOKEN_MUTED = '#6B7785';

const SEVERITY_VARIANT: Record<Severity, 'danger' | 'warning' | 'success'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'success',
};

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

const TABS: { id: TabKey; label: string }[] = [
  { id: 'geo', label: 'Geopolitical' },
  { id: 'exposure', label: 'Supply Exposure' },
  { id: 'scenario', label: 'Scenario Modeling' },
  { id: 'compliance', label: 'Compliance Risks' },
  { id: 'commodity', label: 'Commodity Prices' },
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
  warning: { bg: 'bg-warning-soft', border: 'border-warning', text: 'text-warning', Icon: AlertTriangle },
  info: { bg: 'bg-info-soft', border: 'border-info', text: 'text-info', Icon: Info },
};

const AlertBanner: React.FC<{ alert: RiskAlert; onDismiss: () => void }> = ({
  alert,
  onDismiss,
}) => {
  const v = ALERT_VARIANT[alert.level];
  const Icon = v.Icon;
  return (
    <div
      className={`${v.bg} border-l-2 ${v.border} rounded px-4 py-3 mb-2 flex items-start gap-3`}
    >
      <Icon size={16} className={`shrink-0 mt-0.5 ${v.text}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${v.text}`}>{alert.title}</div>
        <div className="text-xs text-text-secondary mt-1">{alert.body}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-text-tertiary hover:text-text-secondary shrink-0"
        aria-label="Dismiss alert"
      >
        <X size={14} />
      </button>
    </div>
  );
};

const WorldMap: React.FC = () => {
  const dots = [
    { label: 'Taiwan', cx: 745, cy: 185, color: TOKEN_DANGER, size: 8 },
    { label: 'China', cx: 720, cy: 175, color: TOKEN_DANGER, size: 6 },
    { label: 'Red Sea', cx: 590, cy: 210, color: TOKEN_WARNING, size: 7 },
    { label: 'Ukraine', cx: 555, cy: 140, color: TOKEN_WARNING, size: 5 },
    { label: 'Saudi Arabia', cx: 600, cy: 220, color: TOKEN_WARNING, size: 5 },
    { label: 'Germany', cx: 510, cy: 135, color: TOKEN_SUCCESS, size: 4 },
    { label: 'Mexico', cx: 195, cy: 225, color: TOKEN_SUCCESS, size: 4 },
    { label: 'Dallas (DC)', cx: 190, cy: 215, color: TOKEN_INFO, size: 5 },
  ];
  const continent = '#F4F6F8';
  const continentStroke = '#D1D8E0';
  const accent = '#FEF3D6';
  const accentStroke = '#B45309';
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
      <div className="text-sm font-semibold text-text-primary mb-3">
        Supplier risk map
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
          { color: TOKEN_DANGER, label: 'Critical risk' },
          { color: TOKEN_WARNING, label: 'High / medium risk' },
          { color: TOKEN_SUCCESS, label: 'Low risk' },
          { color: TOKEN_INFO, label: 'DC / hub' },
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

const GeopoliticalTab: React.FC<{ geoRisks: GeoRisk[] }> = ({ geoRisks }) => (
  <div className="flex flex-col gap-4">
    {geoRisks.map((r) => {
      const sevVariant = SEVERITY_VARIANT[r.severity];
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
                <span className="text-xs text-text-tertiary">{r.region}</span>
              </div>
              <div className="text-sm text-text-secondary mt-1">{r.event}</div>
            </div>
            <div className="text-right shrink-0">
              <div
                className={`text-2xl font-extrabold leading-none ${
                  sevVariant === 'danger'
                    ? 'text-danger'
                    : sevVariant === 'warning'
                      ? 'text-warning'
                      : 'text-success'
                }`}
              >
                {r.score}
              </div>
              <div className="text-[10px] text-text-tertiary mt-0.5">Risk score</div>
            </div>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="text-label text-text-tertiary uppercase mb-1">
                Impact
              </div>
              <div className="text-sm text-text-secondary">{r.impact}</div>
              <div
                className={`text-sm font-semibold mt-2 ${
                  sevVariant === 'danger' ? 'text-danger' : 'text-warning'
                }`}
              >
                {r.exposure}
              </div>
            </div>
            <div>
              <div className="text-label text-text-tertiary uppercase mb-1">
                Affected suppliers
              </div>
              {r.suppliers.map((s) => (
                <div key={s} className="text-sm text-text-primary">
                  • {s}
                </div>
              ))}
            </div>
            <div>
              <div className="text-label text-text-tertiary uppercase mb-1">
                Mitigation
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

const ExposureTab: React.FC<{ exposure: ExposureRow[] }> = ({ exposure }) => {
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
          label="Total exposed spend"
          value={`$${(totalExposed / 1000).toFixed(1)}M`}
          tone="danger"
        />
        <SummaryStat
          label="Single-source critical"
          value={singleSourceCritical.toString()}
          tone="danger"
        />
        <SummaryStat
          label="Categories at risk"
          value={atRisk.toString()}
          tone="warning"
        />
        <SummaryStat
          label="Dual-sourced"
          value={dualSourced.toString()}
          tone="success"
        />
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Supplier</TableHeaderCell>
          <TableHeaderCell>Region</TableHeaderCell>
          <TableHeaderCell className="text-right">Annual spend</TableHeaderCell>
          <TableHeaderCell>Days of stock</TableHeaderCell>
          <TableHeaderCell>Risk</TableHeaderCell>
          <TableHeaderCell>Dual source</TableHeaderCell>
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
                ${(row.spend / 1000).toFixed(1)}M
              </TableCell>
              <TableCell>
                <StatusPill variant={dosVariant(row.dos)}>
                  {row.dos}d
                </StatusPill>
              </TableCell>
              <TableCell>
                <StatusPill variant={SEVERITY_VARIANT[row.risk]}>
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
    <div
      className={`text-2xl font-bold ${
        tone === 'danger'
          ? 'text-danger'
          : tone === 'warning'
            ? 'text-warning'
            : 'text-success'
      }`}
    >
      {value}
    </div>
    <div className="text-meta text-text-tertiary mt-1">{label}</div>
  </div>
);

const ScenarioTab: React.FC<{ scenarios: Scenario[] }> = ({ scenarios }) => {
  const { toast } = useToast();
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
      title: 'Scenario forwarded to War Room',
      description: `${featured.title} dispatched to procurement leadership.`,
    });
    setTimeout(() => setWarRoomSent(false), 4000);
  };

  return (
    <div className="flex flex-col gap-5">
      <FilterChipsBar
        options={SCENARIO_LIBRARY}
        value={activeScenario}
        onChange={setActiveScenario}
      />

      <section className="bg-danger-soft border-l-2 border-danger rounded-lg px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
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
            variant="primary"
            icon={Send}
            onClick={sendToWarRoom}
            className="shrink-0"
          >
            {warRoomSent ? '✓ Sent' : 'Send to War Room'}
          </Button>
        </div>
      </section>

      <div>
        <div className="text-label text-text-tertiary uppercase mb-2">
          Response alternatives
        </div>
        <div className="flex flex-col gap-2">
          {featured.alternatives.map((alt) => {
            const open = expandedAlt === alt.id;
            const feasVariant = FEASIBILITY_VARIANT[alt.feasibility];
            return (
              <div
                key={alt.id}
                className={`bg-bg-surface border rounded-lg shadow-sm overflow-hidden transition-colors ${
                  open ? 'border-teal' : 'border-border-subtle'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedAlt(open ? null : alt.id)}
                  className="w-full px-5 py-3 flex items-center justify-between gap-4 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-sm text-text-primary">
                      {alt.name}
                    </span>
                    <StatusPill variant={feasVariant}>
                      {alt.feasibility} feasibility
                    </StatusPill>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs font-semibold text-warning">
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
                        variant="primary"
                        onClick={() =>
                          toast({
                            variant: 'info',
                            title: `${alt.name.split('—')[0].trim()} activation initiated`,
                          })
                        }
                      >
                        Activate plan
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          toast({
                            title: `Opening full analysis for ${alt.id.toUpperCase()}`,
                          })
                        }
                      >
                        View full analysis
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
          <span className="text-sm font-bold text-teal">ARIA Recommendation</span>
          <StatusPill variant="info" className="!bg-teal-soft !text-teal">
            AI-Powered
          </StatusPill>
        </div>
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
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const halalItem = compliance.find((r) => r.type === 'Halal Cert');

  return (
    <div className="flex flex-col gap-4">
      {!bannerDismissed && halalItem && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-text-primary">
              Action required:{' '}
            </span>
            <span className="text-sm text-text-secondary">
              {halalItem.supplier}'s {halalItem.type} expires in{' '}
              <strong className="text-warning">
                {halalItem.daysLeft} days
              </strong>{' '}
              ({halalItem.expires}). Renew immediately to maintain export
              compliance to GCC markets.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="text-text-tertiary hover:text-text-secondary shrink-0"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>Supplier</TableHeaderCell>
            <TableHeaderCell>Certificate / requirement</TableHeaderCell>
            <TableHeaderCell>Expiry date</TableHeaderCell>
            <TableHeaderCell>Days left</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell className="text-right">Action</TableHeaderCell>
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
                    {row.expires}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-bold ${
                        row.status === 'expired'
                          ? 'text-danger'
                          : row.status === 'expiring'
                            ? 'text-warning'
                            : 'text-success'
                      }`}
                    >
                      {row.daysLeft < 0
                        ? `${Math.abs(row.daysLeft)}d overdue`
                        : `${row.daysLeft}d`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={COMPLIANCE_VARIANT[row.status]}>
                      {statusLabel}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.status === 'ok' ? (
                      <span className="text-meta text-text-tertiary">
                        ✓ No action
                      </span>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() =>
                          toast({
                            variant: row.status === 'expired' ? 'warning' : 'info',
                            title:
                              row.status === 'expired'
                                ? `Urgent renewal requested for ${row.supplier}`
                                : `Reminder sent to ${row.supplier}`,
                          })
                        }
                      >
                        {row.status === 'expired' ? 'Urgent renewal' : 'Send reminder'}
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
        Different angle from{' '}
        <strong className="text-info">Compliance Tracker</strong>: this view
        focuses on expiry urgency for risk-exposed suppliers only.
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
}) => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div
                  className="text-xl font-extrabold"
                  style={{ color: c.color }}
                >
                  {c.current > 1000 ? c.current.toLocaleString() : c.current}
                </div>
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
              <span className="text-text-tertiary">Alert if {c.alertDir}:</span>
              <span className="font-bold" style={{ color: c.color }}>
                {c.alert > 1000 ? c.alert.toLocaleString() : c.alert} {c.unit}
              </span>
              <span className="ml-auto">
                {breached ? (
                  <span className="text-danger font-semibold">
                    ⚠ Threshold breached
                  </span>
                ) : (
                  <span className="text-success font-semibold">
                    ✓ Within range
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
        Procurement impact alerts
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
                  ? `Alert triggered: current value ${c.current} exceeds threshold ${c.alert}`
                  : `Within threshold (${c.current} / ${c.alert} ${c.unit})`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const BuyerRisk: React.FC = () => {
  const { toast } = useToast();
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
        title="No risk intelligence yet"
        subtitle="Supply-risk monitoring is a buyer-side view."
        message="Geopolitical, exposure, scenario, and commodity signals appear here for buyer accounts."
      />
    );

  return (
    <AppShellV2>
      <style>{PULSE_CSS}</style>
      <PageHeader
        breadcrumb={RISK_CRUMB}
        title="Supply Risk & Scenario Intelligence"
        subtitle="Geopolitical · single-source · compliance · financial risk · live alerts."
        actions={
          <BulkActionsBar
            actions={[
              {
                label: 'Export Report',
                icon: FileSpreadsheet,
                onClick: () =>
                  toast({
                    variant: 'info',
                    title: 'Risk report export starting',
                  }),
              },
            ]}
            primary={{
              label: 'Configure Alerts',
              icon: BellRing,
              onClick: () =>
                toast({
                  title: 'Alert configuration',
                  description: 'Channel rules editor coming in Phase 2A.',
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
            LIVE
          </span>
        </div>
        <span>Real-time risk monitoring · {lastUpdated}</span>
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
          eyebrow="Active Risk Events"
          value="9"
          subtitle={<span className="text-danger">3 critical · 4 high</span>}
          icon={AlertOctagon}
        />
        <KpiCard
          eyebrow="Spend Exposed"
          value="$6.1M"
          subtitle="38% of total indirect spend"
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow="Single-Source Critical"
          value="3"
          subtitle={<span className="text-danger">No backup supplier</span>}
          icon={AlertOctagon}
        />
        <KpiCard
          eyebrow="Compliance Expiring"
          value="2"
          subtitle="Within 30 days"
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
        Last updated {lastUpdated}
      </PageMetaLine>
    </AppShellV2>
  );
};

export default BuyerRisk;
