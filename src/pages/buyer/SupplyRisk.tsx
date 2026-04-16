import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
} from 'recharts';

const TEAL = '#0097A7';
const NAVY = '#0D1B2A';
const RED = '#DC2626';
const AMBER = '#D97706';
const GREEN = '#16A34A';
const BLUE = '#2563EB';
const BORDER = '#E2E8F0';
const MUTED = '#64748B';
const BG = '#F0F4F8';

// ─── Alert Banners ────────────────────────────────────────────────────────────
interface Alert { id: string; level: 'critical' | 'warning' | 'info'; title: string; body: string; }
const ALERTS: Alert[] = [
  { id: 'a1', level: 'critical', title: 'Critical: Taiwan Strait tensions escalating',
    body: 'Risk of semiconductor supply disruption — 43% of electronic components sourced from affected region.' },
  { id: 'a2', level: 'warning', title: 'Warning: Red Sea shipping delays',
    body: 'Average lead time +18 days for APAC routes. 6 active POs affected. Estimated $240K cost impact.' },
  { id: 'a3', level: 'info', title: 'Info: Brazil port strike resolved',
    body: 'Santos port operations restored. Backlog clearance expected within 5–7 business days.' },
];

// ─── Geopolitical Risk Cards ──────────────────────────────────────────────────
const GEO_RISKS = [
  {
    region: 'Asia Pacific',
    country: 'Taiwan / China',
    flag: '🇹🇼',
    severity: 'critical',
    score: 87,
    trend: 'rising',
    event: 'Military exercises intensifying near Taiwan Strait',
    impact: 'Semiconductor & electronics supply disruption',
    exposure: '$4.2M spend exposed',
    suppliers: ['NanoFab Ltd', 'PrecisionTech Asia', 'SemCo Electronics'],
    mitigation: 'Qualifying EU and US alternate suppliers',
    probability: 78,
    timeline: '0–3 months',
  },
  {
    region: 'Middle East',
    country: 'Yemen / Red Sea',
    flag: '🌊',
    severity: 'high',
    score: 72,
    trend: 'stable',
    event: 'Houthi attacks on commercial shipping lanes',
    impact: 'Extended lead times, increased freight costs',
    exposure: '$1.8M annual freight re-routing cost',
    suppliers: ['Gulf Logistics Co', 'APAC Freight Partners'],
    mitigation: 'Rerouting via Cape of Good Hope (+12 days)',
    probability: 91,
    timeline: 'Ongoing',
  },
  {
    region: 'Eastern Europe',
    country: 'Ukraine / Moldova',
    flag: '🇺🇦',
    severity: 'medium',
    score: 54,
    trend: 'declining',
    event: 'Ongoing conflict affecting logistics corridors',
    impact: 'Grain, steel, and industrial component sourcing',
    exposure: '$890K spend exposed',
    suppliers: ['UkrSteel Inc', 'EastEuro Parts'],
    mitigation: 'Alternative sourcing from Turkey and Romania in place',
    probability: 45,
    timeline: 'Long-term',
  },
];

// ─── Supply Exposure Table ────────────────────────────────────────────────────
const EXPOSURE_DATA = [
  { category: 'Semiconductors',   supplier: 'NanoFab Ltd',        region: 'Taiwan',     spend: 2100, dos: 18, risk: 'critical', dualSource: false },
  { category: 'PCB Assemblies',   supplier: 'PrecisionTech Asia', region: 'China',      spend: 1380, dos: 31, risk: 'high',     dualSource: false },
  { category: 'Freight/Logistics',supplier: 'Gulf Logistics',     region: 'Red Sea',    spend: 720,  dos: 45, risk: 'high',     dualSource: true  },
  { category: 'Steel Components', supplier: 'UkrSteel Inc',       region: 'Ukraine',    spend: 540,  dos: 62, risk: 'medium',   dualSource: true  },
  { category: 'Rare Earth Metals',supplier: 'SinoMinerals',       region: 'China',      spend: 910,  dos: 22, risk: 'high',     dualSource: false },
  { category: 'Plastics / Resin', supplier: 'PetroChemCo',        region: 'Saudi Arabia', spend: 430, dos: 55, risk: 'medium', dualSource: true  },
  { category: 'Packaging',        supplier: 'PackagePro EU',       region: 'Germany',    spend: 280,  dos: 78, risk: 'low',      dualSource: true  },
  { category: 'Machined Parts',   supplier: 'PrecisionMex SA',    region: 'Mexico',     spend: 370,  dos: 66, risk: 'low',      dualSource: true  },
];

// ─── Scenario Modeling ────────────────────────────────────────────────────────
const SCENARIOS = [
  { id: 'me', label: '🌊 Middle East Conflict', active: true },
  { id: 'tw', label: '🇹🇼 Taiwan Strait Closure', active: false },
  { id: 'pa', label: ' Pandemic Resurgence', active: false },
];

const SCENARIO_ME = {
  title: 'Middle East Conflict Escalation',
  description: 'Full closure of Suez Canal + Red Sea routes. All APAC → EU/US freight diverted.',
  impact: { revenue: '-$3.2M', delay: '+24 days avg', costIncrease: '+38%', suppliersAffected: 6 },
  alternatives: [
    {
      id: 's1',
      name: 'Alternative A — Cape of Good Hope Rerouting',
      cost: '+$420K/month',
      leadTime: '+18 days',
      feasibility: 'high',
      details: 'Redirect all inbound APAC freight via southern African routing. Carrier agreements with Maersk and MSC already in place. Inventory buffer required: +3 weeks safety stock. Begin pre-positioning in Singapore and Rotterdam hubs.',
    },
    {
      id: 's2',
      name: 'Alternative B — Air Freight for Critical SKUs',
      cost: '+$1.1M one-time',
      leadTime: '2 days',
      feasibility: 'medium',
      details: 'Prioritize top 40 critical SKUs by unit value × DOS risk. Air freight via Dubai and Frankfurt. Feasibility constrained by cargo capacity — pre-book immediately. Suitable for semiconductors and high-value components only.',
    },
    {
      id: 's3',
      name: 'Alternative C — Regional Safety Stock Build',
      cost: '+$640K inventory',
      leadTime: 'Immediate',
      feasibility: 'high',
      details: 'Accelerate POs to build 90-day buffer stock at Dallas and Rotterdam DCs. Requires financing approval. Best for mid-value, high-velocity items. Works in parallel with Alternative A.',
    },
  ],
};

// ─── Compliance Risks ─────────────────────────────────────────────────────────
const COMPLIANCE_DATA = [
  { supplier: 'NanoFab Ltd',        type: 'ISO 9001',        expires: '2026-03-15', daysLeft: -24, status: 'expired'  },
  { supplier: 'PrecisionTech Asia', type: 'REACH / RoHS',    expires: '2026-04-30', daysLeft: 22,  status: 'expiring' },
  { supplier: 'Gulf Logistics',     type: 'C-TPAT',          expires: '2026-09-01', daysLeft: 146, status: 'ok'       },
  { supplier: 'UkrSteel Inc',       type: 'Conflict Minerals (3TG)', expires: '2026-05-31', daysLeft: 53, status: 'ok' },
  { supplier: 'SinoMinerals',       type: 'Halal Cert',      expires: '2026-04-15', daysLeft: 7,   status: 'expiring' },
  { supplier: 'PetroChemCo',        type: 'ISO 14001',       expires: '2026-07-20', daysLeft: 103, status: 'ok'       },
  { supplier: 'PackagePro EU',      type: 'EU CSRD',         expires: '2026-12-31', daysLeft: 267, status: 'ok'       },
  { supplier: 'PrecisionMex SA',    type: 'USMCA Certificate', expires: '2026-06-30', daysLeft: 83, status: 'ok'     },
];

// ─── Commodity Prices ─────────────────────────────────────────────────────────
const mkSparkData = (base: number, volatility: number, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    v: +(base + (Math.sin(i * 0.7 + Math.random()) * volatility + (Math.random() - 0.45) * volatility)).toFixed(2),
  }));

const COMMODITIES = [
  { name: 'Copper (LME)',    unit: '$/mt',   current: 9_240, change: +4.2,  alert: 9500, alertDir: 'above', color: '#B45309', spark: mkSparkData(9240, 180) },
  { name: 'Brent Crude',     unit: '$/bbl',  current: 83.40, change: -1.8,  alert: 90,   alertDir: 'above', color: '#1D4ED8', spark: mkSparkData(83.4, 3.5) },
  { name: 'Aluminum (LME)',  unit: '$/mt',   current: 2_310, change: +1.1,  alert: 2500, alertDir: 'above', color: '#6B7280', spark: mkSparkData(2310, 60) },
  { name: 'Rare Earth Index',unit: 'Index',  current: 142.7, change: +8.9,  alert: 150,  alertDir: 'above', color: '#7C3AED', spark: mkSparkData(142.7, 6) },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────
const severityColor = (s: string) =>
  s === 'critical' ? RED : s === 'high' ? AMBER : s === 'medium' ? '#CA8A04' : GREEN;

const severityBg = (s: string) =>
  s === 'critical' ? '#FEF2F2' : s === 'high' ? '#FFFBEB' : s === 'medium' ? '#FEFCE8' : '#F0FDF4';

const dosBg = (dos: number) =>
  dos < 30 ? '#FEF2F2' : dos < 50 ? '#FFFBEB' : '#F0FDF4';

const dosColor = (dos: number) =>
  dos < 30 ? RED : dos < 50 ? AMBER : GREEN;

// ─── Alert Banner ─────────────────────────────────────────────────────────────
const AlertBanner: React.FC<{ alert: Alert; onDismiss: () => void }> = ({ alert, onDismiss }) => {
  const bg = alert.level === 'critical' ? '#FEF2F2' : alert.level === 'warning' ? '#FFFBEB' : '#EFF6FF';
  const border = alert.level === 'critical' ? RED : alert.level === 'warning' ? AMBER : BLUE;
  const icon = alert.level === 'critical' ? '' : alert.level === 'warning' ? '!' : 'ℹ️';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${border}`,
      borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10,
      marginBottom: 8, position: 'relative' }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: NAVY, marginBottom: 2 }}>{alert.title}</div>
        <div style={{ fontSize: 12, color: '#374151' }}>{alert.body}</div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer',
        color: MUTED, fontSize: 16, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}>✕</button>
    </div>
  );
};

// ─── Risk Stat Tile ───────────────────────────────────────────────────────────
const RiskTile: React.FC<{ label: string; value: string | number; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div style={{ background: 'white', borderRadius: 8, padding: '14px 18px', flex: 1, minWidth: 140,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}` }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>
  </div>
);

// ─── SVG World Map (simplified bounding boxes for major regions) ──────────────
const WorldMap: React.FC = () => {
  const dots = [
    { label: 'Taiwan',       cx: 745, cy: 185, color: RED,   size: 8  },
    { label: 'China',        cx: 720, cy: 175, color: RED,   size: 6  },
    { label: 'Red Sea',      cx: 590, cy: 210, color: AMBER, size: 7  },
    { label: 'Ukraine',      cx: 555, cy: 140, color: AMBER, size: 5  },
    { label: 'Saudi Arabia', cx: 600, cy: 220, color: '#CA8A04', size: 5 },
    { label: 'Germany',      cx: 510, cy: 135, color: GREEN, size: 4  },
    { label: 'Mexico',       cx: 195, cy: 225, color: GREEN, size: 4  },
    { label: 'Dallas (DC)',  cx: 190, cy: 215, color: BLUE,  size: 5  },
  ];
  return (
    <div style={{ background: 'white', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 10 }}>Supplier Risk Map</div>
      <svg viewBox="0 0 900 440" style={{ width: '100%', height: 'auto', maxHeight: 320 }}>
        <rect width="900" height="440" fill="#EFF6FF" rx="6" />
        {/* North America */}
        <path d="M80 80 L280 80 L310 140 L290 200 L260 240 L200 260 L160 250 L120 230 L80 200 L60 160 Z"
          fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        {/* South America */}
        <path d="M170 270 L240 270 L250 290 L240 360 L200 400 L170 390 L155 350 L150 310 Z"
          fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        {/* Europe */}
        <path d="M460 80 L580 80 L585 120 L570 160 L540 165 L490 160 L460 140 Z"
          fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        {/* Africa */}
        <path d="M490 180 L580 180 L595 230 L580 340 L540 380 L500 370 L475 320 L470 250 Z"
          fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        {/* Middle East */}
        <path d="M575 185 L640 185 L645 230 L610 245 L575 240 Z"
          fill="#FDE68A" stroke="#F59E0B" strokeWidth="1" />
        {/* Asia */}
        <path d="M640 80 L810 80 L820 160 L800 200 L760 210 L700 200 L655 170 L645 130 Z"
          fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        {/* Southeast Asia */}
        <path d="M700 210 L770 210 L775 250 L740 270 L700 255 Z"
          fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        {/* Australia */}
        <path d="M720 300 L820 300 L830 380 L770 400 L720 380 Z"
          fill="#DBEAFE" stroke="#93C5FD" strokeWidth="1" />
        {/* Dots */}
        {dots.map(d => (
          <g key={d.label}>
            <circle cx={d.cx} cy={d.cy} r={d.size + 4} fill={d.color} opacity={0.2} />
            <circle cx={d.cx} cy={d.cy} r={d.size} fill={d.color} />
            <title>{d.label}</title>
          </g>
        ))}
        {/* Legend */}
        {[
          { color: RED, label: 'Critical Risk' },
          { color: AMBER, label: 'High Risk' },
          { color: '#CA8A04', label: 'Medium Risk' },
          { color: GREEN, label: 'Low Risk' },
          { color: BLUE, label: 'DC / Hub' },
        ].map((l, i) => (
          <g key={l.label} transform={`translate(20, ${350 + i * 16})`}>
            <circle r={4} cx={6} cy={0} fill={l.color} />
            <text x={14} y={4} fontSize={11} fill={MUTED}>{l.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};


// ─── Tab 1: Geopolitical Risks ────────────────────────────────────────────────
const GeopoliticalTab: React.FC = () => (
  <div>
    {GEO_RISKS.map(r => (
      <div key={r.country} style={{ background: 'white', borderRadius: 8, marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: severityBg(r.severity), borderBottom: `1px solid ${severityColor(r.severity)}22`,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{r.flag}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{r.country}</span>
              <span style={{ background: severityColor(r.severity), color: 'white',
                borderRadius: 9999, padding: '1px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                {r.severity}
              </span>
              <span style={{ fontSize: 11, color: MUTED }}>{r.region}</span>
            </div>
            <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{r.event}</div>
          </div>
          {/* Risk Score */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: severityColor(r.severity), lineHeight: 1 }}>{r.score}</div>
            <div style={{ fontSize: 10, color: MUTED }}>Risk Score</div>
          </div>
        </div>
        {/* Body */}
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Impact</div>
            <div style={{ fontSize: 12, color: '#374151' }}>{r.impact}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: severityColor(r.severity), marginTop: 4 }}>{r.exposure}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Affected Suppliers</div>
            {r.suppliers.map(s => (
              <div key={s} style={{ fontSize: 12, color: NAVY, marginBottom: 2 }}>• {s}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginBottom: 4 }}>Mitigation</div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>{r.mitigation}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, background: '#F1F5F9', borderRadius: 4, padding: '2px 8px', color: MUTED }}>
                Probability: {r.probability}%
              </span>
              <span style={{ fontSize: 11, background: '#F1F5F9', borderRadius: 4, padding: '2px 8px', color: MUTED }}>
                {r.timeline}
              </span>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Tab 2: Supply Exposure ────────────────────────────────────────────────────
const ExposureTab: React.FC = () => {
  const totalExposed = useMemo(() => EXPOSURE_DATA.filter(r => r.risk !== 'low').reduce((s, r) => s + r.spend, 0), []);
  return (
    <div>
      <div style={{ background: 'white', borderRadius: 8, padding: 16, marginBottom: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {[
            { label: 'Total Exposed Spend', value: `$${(totalExposed / 1000).toFixed(1)}M`, color: RED },
            { label: 'Single-Source Critical', value: EXPOSURE_DATA.filter(r => !r.dualSource && r.risk === 'critical').length.toString(), color: RED },
            { label: 'Categories at Risk', value: EXPOSURE_DATA.filter(r => r.risk !== 'low').length.toString(), color: AMBER },
            { label: 'Dual-Sourced', value: EXPOSURE_DATA.filter(r => r.dualSource).length.toString(), color: GREEN },
          ].map(t => (
            <div key={t.label} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRight: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.color }}>{t.value}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{t.label}</div>
            </div>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
              {['Category', 'Supplier', 'Region', 'Annual Spend', 'Days of Stock', 'Risk', 'Dual Source'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: MUTED, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXPOSURE_DATA.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
                <td style={{ padding: '9px 10px', fontWeight: 600, color: NAVY }}>{row.category}</td>
                <td style={{ padding: '9px 10px', color: '#374151' }}>{row.supplier}</td>
                <td style={{ padding: '9px 10px', color: MUTED }}>{row.region}</td>
                <td style={{ padding: '9px 10px', fontWeight: 600 }}>${(row.spend / 1000).toFixed(1)}M</td>
                <td style={{ padding: '9px 10px' }}>
                  <span style={{ background: dosBg(row.dos), color: dosColor(row.dos),
                    borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {row.dos}d
                  </span>
                </td>
                <td style={{ padding: '9px 10px' }}>
                  <span style={{ background: severityBg(row.risk), color: severityColor(row.risk),
                    borderRadius: 9999, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                    {row.risk}
                  </span>
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 15 }}>
                  {row.dualSource ? '✓' : '✗'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ─── Tab 3: Scenario Modeling ─────────────────────────────────────────────────
const ScenarioTab: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState('me');
  const [expandedAlt, setExpandedAlt] = useState<string | null>('s1');
  const [warRoomSent, setWarRoomSent] = useState(false);

  const feasBg = (f: string) => f === 'high' ? '#F0FDF4' : f === 'medium' ? '#FFFBEB' : '#FEF2F2';
  const feasColor = (f: string) => f === 'high' ? GREEN : f === 'medium' ? AMBER : RED;

  return (
    <div>
      {/* Scenario Selector Pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => setActiveScenario(s.id)}
            style={{ padding: '8px 16px', borderRadius: 9999, border: `2px solid ${activeScenario === s.id ? TEAL : BORDER}`,
              background: activeScenario === s.id ? TEAL : 'white',
              color: activeScenario === s.id ? 'white' : NAVY,
              fontWeight: activeScenario === s.id ? 700 : 500, fontSize: 13, cursor: 'pointer',
              transition: 'all 0.15s' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Scenario Header Card */}
      <div style={{ background: '#FEF2F2', border: `1px solid ${RED}33`, borderLeft: `4px solid ${RED}`,
        borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, marginBottom: 4 }}>
              {SCENARIO_ME.title}
            </div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 12 }}>{SCENARIO_ME.description}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {Object.entries(SCENARIO_ME.impact).map(([k, v]) => (
                <div key={k} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: RED }}>{v}</div>
                  <div style={{ fontSize: 10, color: MUTED, textTransform: 'capitalize' }}>
                    {k.replace(/([A-Z])/g, ' $1')}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setWarRoomSent(true); setTimeout(() => setWarRoomSent(false), 4000); }}
            style={{ background: RED, color: 'white', border: 'none', borderRadius: 6,
              padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0 }}>
            {warRoomSent ? '✓ Sent!' : ' Send to War Room'}
          </button>
        </div>
      </div>

      {/* Alternatives Accordion */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
          Response Alternatives
        </div>
        {SCENARIO_ME.alternatives.map(alt => {
          const open = expandedAlt === alt.id;
          return (
            <div key={alt.id} style={{ background: 'white', borderRadius: 8, marginBottom: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${open ? TEAL : BORDER}`,
              overflow: 'hidden', transition: 'border-color 0.15s' }}>
              <div onClick={() => setExpandedAlt(open ? null : alt.id)}
                style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{alt.name}</span>
                  <span style={{ fontSize: 11, background: feasBg(alt.feasibility), color: feasColor(alt.feasibility),
                    borderRadius: 9999, padding: '1px 8px', fontWeight: 600 }}>
                    {alt.feasibility.charAt(0).toUpperCase() + alt.feasibility.slice(1)} Feasibility
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: AMBER, fontWeight: 600 }}>{alt.cost}</span>
                  <span style={{ fontSize: 12, color: BLUE, fontWeight: 600 }}>{alt.leadTime}</span>
                  <span style={{ color: MUTED, fontSize: 14 }}>{open ? '▲' : '▼'}</span>
                </div>
              </div>
              {open && (
                <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ fontSize: 12, color: '#374151', marginTop: 10, lineHeight: 1.6 }}>
                    {alt.details}
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button style={{ background: TEAL, color: 'white', border: 'none', borderRadius: 6,
                      padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Activate Plan
                    </button>
                    <button style={{ background: 'white', color: NAVY, border: `1px solid ${BORDER}`,
                      borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                      View Full Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ARIA Recommendation Box */}
      <div style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1E3A5F 100%)', borderRadius: 8,
        padding: '16px 20px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>i</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: TEAL }}>ARIA Recommendation</span>
          <span style={{ fontSize: 10, background: `${TEAL}33`, color: TEAL, borderRadius: 9999,
            padding: '1px 8px', fontWeight: 600 }}>AI-Powered</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: '#CBD5E1' }}>
          Based on current inventory levels, open PO positions, and freight capacity availability, ARIA recommends
          combining <strong style={{ color: 'white' }}>Alternative A + Alternative C</strong> simultaneously.
          Activate Cape rerouting now for continuity, while building 90-day safety stock for your top 12 critical SKUs.
          Estimated total cost: <strong style={{ color: TEAL }}>$1.06M</strong> vs. $3.2M revenue-at-risk if no action taken.
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#64748B' }}>
          Confidence: 84% · Based on 6 similar disruption scenarios · Last updated 2 hours ago
        </div>
      </div>
    </div>
  );
};

// ─── Tab 4: Compliance Risks ──────────────────────────────────────────────────
const ComplianceTab: React.FC = () => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const halalItem = COMPLIANCE_DATA.find(r => r.type === 'Halal Cert');

  return (
    <div>
      {/* Halal Countdown Banner */}
      {!bannerDismissed && halalItem && (
        <div style={{ background: '#FFFBEB', border: `1px solid ${AMBER}`, borderLeft: `4px solid ${AMBER}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>Action Required: </span>
            <span style={{ fontSize: 13, color: '#374151' }}>
              {halalItem.supplier}'s {halalItem.type} expires in{' '}
              <strong style={{ color: AMBER }}>{halalItem.daysLeft} days</strong> ({halalItem.expires}).
              Renew immediately to maintain export compliance to GCC markets.
            </span>
          </div>
          <button onClick={() => setBannerDismissed(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Compliance Table */}
      <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: `2px solid ${BORDER}` }}>
              {['Supplier', 'Certificate / Requirement', 'Expiry Date', 'Days Left', 'Status', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: MUTED, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPLIANCE_DATA.map((row, i) => {
              const statusColor = row.status === 'expired' ? RED : row.status === 'expiring' ? AMBER : GREEN;
              const statusBg = row.status === 'expired' ? '#FEF2F2' : row.status === 'expiring' ? '#FFFBEB' : '#F0FDF4';
              const statusLabel = row.status === 'expired' ? 'Expired' : row.status === 'expiring' ? 'Expiring Soon' : 'Valid';
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: NAVY }}>{row.supplier}</td>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{row.type}</td>
                  <td style={{ padding: '10px 14px', color: MUTED }}>{row.expires}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: statusColor, fontWeight: 700 }}>
                      {row.daysLeft < 0 ? `${Math.abs(row.daysLeft)}d overdue` : `${row.daysLeft}d`}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: statusBg, color: statusColor, borderRadius: 9999,
                      padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                      {statusLabel}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {row.status !== 'ok' ? (
                      <button style={{ background: row.status === 'expired' ? RED : AMBER, color: 'white',
                        border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11,
                        fontWeight: 600, cursor: 'pointer' }}>
                        {row.status === 'expired' ? 'Urgent Renewal' : 'Send Reminder'}
                      </button>
                    ) : (
                      <span style={{ color: MUTED, fontSize: 11 }}>✓ No action</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ─── Tab 5: Commodity Prices ──────────────────────────────────────────────────
const CommodityTab: React.FC = () => (
  <div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
      {COMMODITIES.map(c => {
        const up = c.change > 0;
        return (
          <div key={c.name} style={{ background: 'white', borderRadius: 8, padding: '14px 16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${c.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>{c.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{c.unit}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>
                  {typeof c.current === 'number' && c.current > 1000
                    ? c.current.toLocaleString()
                    : c.current}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: up ? RED : GREEN }}>
                  {up ? '▲' : '▼'} {Math.abs(c.change)}% YTD
                </div>
              </div>
            </div>
            {/* Sparkline */}
            <div style={{ height: 56, marginBottom: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={c.spark} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <Line type="monotone" dataKey="v" stroke={c.color} dot={false} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, padding: '4px 8px' }}
                    formatter={(v: number) => [`${v} ${c.unit}`, c.name]}
                    labelFormatter={() => ''}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Alert threshold */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ color: MUTED }}>Alert if {c.alertDir}:</span>
              <span style={{ fontWeight: 700, color: c.color }}>
                {typeof c.alert === 'number' && c.alert > 1000
                  ? c.alert.toLocaleString()
                  : c.alert} {c.unit}
              </span>
              <span style={{ marginLeft: 'auto', color: MUTED }}>
                {c.alertDir === 'above' && c.current >= c.alert
                  ? <span style={{ color: RED, fontWeight: 600 }}>⚠ Threshold breached</span>
                  : <span style={{ color: GREEN }}>✓ Within range</span>
                }
              </span>
            </div>
          </div>
        );
      })}
    </div>

    {/* Alert Thresholds Summary Card */}
    <div style={{ background: 'white', borderRadius: 8, padding: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 12 }}>
        Procurement Impact Alerts
      </div>
      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.8 }}>
        {COMMODITIES.map(c => {
          const over = c.alertDir === 'above' && c.current >= c.alert;
          return (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: over ? RED : GREEN, fontSize: 13 }}>{over ? '⚠' : '✓'}</span>
              <span style={{ fontWeight: 600, color: NAVY }}>{c.name}</span>
              <span style={{ color: MUTED }}>—</span>
              <span style={{ color: over ? RED : '#374151' }}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'geo',        label: '🌍 Geopolitical Risks' },
  { id: 'exposure',   label: ' Supply Exposure' },
  { id: 'scenario',   label: ' Scenario Modeling' },
  { id: 'compliance', label: '🛡️ Compliance Risks' },
  { id: 'commodity',  label: ' Commodity Prices' },
];

const SupplyRisk: React.FC = () => {
  const [activeTab, setActiveTab] = useState('geo');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const visibleAlerts = ALERTS.filter(a => !dismissedAlerts.includes(a.id));

  return (
    <div style={{ padding: '24px 28px', background: BG, minHeight: '100%' }}>
      {/* Pulse animation style */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .live-pulse::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #DC2626;
          animation: pulse-ring 1.4s ease-out infinite;
        }
      `}</style>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: NAVY }}>
              Supply Risk & Scenario Intelligence
            </h1>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
              Geopolitical · Single-source · Compliance · Financial risk · Live alerts
            </div>
            {/* Live dot */}
            <div style={{ position: 'relative', width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="live-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: RED, position: 'relative' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: RED, letterSpacing: '1px', textTransform: 'uppercase' }}>
              LIVE
            </span>
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
            Real-time risk monitoring · {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6,
            padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: NAVY }}>
            Export Report
          </button>
          <button style={{ background: TEAL, border: 'none', borderRadius: 6,
            padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'white' }}>
            Configure Alerts
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {visibleAlerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {visibleAlerts.map(a => (
            <AlertBanner key={a.id} alert={a} onDismiss={() => setDismissedAlerts(prev => [...prev, a.id])} />
          ))}
        </div>
      )}

      {/* Risk Stat Tiles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <RiskTile label="Active Risk Events"    value={9}      sub="3 critical, 4 high"         color={RED}   />
        <RiskTile label="Spend Exposed"         value="$6.1M"  sub="38% of total indirect spend" color={AMBER} />
        <RiskTile label="Single-Source Critical" value={3}     sub="No backup supplier"          color={RED}   />
        <RiskTile label="Compliance Expiring"   value={2}      sub="Within 30 days"              color={AMBER} />
      </div>

      {/* World Map */}
      <div style={{ marginBottom: 20 }}>
        <WorldMap />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${BORDER}`, marginBottom: 20, gap: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '10px 18px', border: 'none', borderBottom: activeTab === t.id ? `3px solid ${TEAL}` : '3px solid transparent',
              marginBottom: -2, background: 'transparent', cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 400,
              color: activeTab === t.id ? TEAL : MUTED,
              transition: 'color 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'geo'        && <GeopoliticalTab />}
      {activeTab === 'exposure'   && <ExposureTab />}
      {activeTab === 'scenario'   && <ScenarioTab />}
      {activeTab === 'compliance' && <ComplianceTab />}
      {activeTab === 'commodity'  && <CommodityTab />}
    </div>
  );
};

export default SupplyRisk;
