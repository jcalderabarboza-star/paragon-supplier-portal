// ────────────────────────────────────────────────────────────────────────────
// Buyer risk fixtures.
//
// Relocated from src/pages-v2/BuyerRisk.tsx in Phase 1B Batch 2. Buyer-side
// aggregate risk views — alerts, geopolitical risks, exposure, scenarios,
// compliance state, commodity prices.
// ────────────────────────────────────────────────────────────────────────────

import type {
  RiskAlert,
  GeoRisk,
  ExposureRow,
  ComplianceRow,
  Commodity,
  Scenario,
} from '../../types';

const TOKEN_TEAL = '#0097A7';
const TOKEN_MID = '#354A5F';
const TOKEN_INFO = '#1E5BAE';
const TOKEN_WARNING = '#B45309';

export const ALERTS: RiskAlert[] = [
  { id: 'a1', level: 'critical',
    title: 'Critical: Taiwan Strait tensions escalating',
    body: 'Risk of semiconductor supply disruption — 43% of electronic components sourced from affected region.' },
  { id: 'a2', level: 'warning',
    title: 'Warning: Red Sea shipping delays',
    body: 'Average lead time +18 days for APAC routes. 6 active POs affected. Estimated $240K cost impact.' },
  { id: 'a3', level: 'info',
    title: 'Info: Brazil port strike resolved',
    body: 'Santos port operations restored. Backlog clearance expected within 5–7 business days.' },
];

export const GEO_RISKS: GeoRisk[] = [
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

export const EXPOSURE_DATA: ExposureRow[] = [
  { category: 'Semiconductors', supplier: 'NanoFab Ltd', region: 'Taiwan', spend: 2100, dos: 18, risk: 'critical', dualSource: false },
  { category: 'PCB Assemblies', supplier: 'PrecisionTech Asia', region: 'China', spend: 1380, dos: 31, risk: 'high', dualSource: false },
  { category: 'Freight/Logistics', supplier: 'Gulf Logistics', region: 'Red Sea', spend: 720, dos: 45, risk: 'high', dualSource: true },
  { category: 'Steel Components', supplier: 'UkrSteel Inc', region: 'Ukraine', spend: 540, dos: 62, risk: 'medium', dualSource: true },
  { category: 'Rare Earth Metals', supplier: 'SinoMinerals', region: 'China', spend: 910, dos: 22, risk: 'high', dualSource: false },
  { category: 'Plastics / Resin', supplier: 'PetroChemCo', region: 'Saudi Arabia', spend: 430, dos: 55, risk: 'medium', dualSource: true },
  { category: 'Packaging', supplier: 'PackagePro EU', region: 'Germany', spend: 280, dos: 78, risk: 'low', dualSource: true },
  { category: 'Machined Parts', supplier: 'PrecisionMex SA', region: 'Mexico', spend: 370, dos: 66, risk: 'low', dualSource: true },
];

// Scenario / ScenarioAlt / ScenarioFeasibility now live in the interface
// contract (services/data/types) so IRiskService.getScenarios can return them.

export const SCENARIO_ME: Scenario = {
  id: 'me',
  label: 'Middle East Conflict',
  title: 'Middle East Conflict Escalation',
  description:
    'Full closure of Suez Canal + Red Sea routes. All APAC → EU/US freight diverted.',
  impact: {
    revenue: '-$3.2M',
    delay: '+24 days avg',
    costIncrease: '+38%',
    suppliersAffected: '6',
  },
  alternatives: [
    {
      id: 's1',
      name: 'Alternative A — Cape of Good Hope rerouting',
      cost: '+$420K/month',
      leadTime: '+18 days',
      feasibility: 'high',
      details:
        'Redirect all inbound APAC freight via southern African routing. Carrier agreements with two ocean carriers already in place. Inventory buffer required: +3 weeks safety stock. Begin pre-positioning in Singapore and Rotterdam hubs.',
    },
    {
      id: 's2',
      name: 'Alternative B — Air freight for critical SKUs',
      cost: '+$1.1M one-time',
      leadTime: '2 days',
      feasibility: 'medium',
      details:
        'Prioritize top 40 critical SKUs by unit value × DOS risk. Air freight via Dubai and Frankfurt. Feasibility constrained by cargo capacity — pre-book immediately. Suitable for semiconductors and high-value components only.',
    },
    {
      id: 's3',
      name: 'Alternative C — Regional safety stock build',
      cost: '+$640K inventory',
      leadTime: 'Immediate',
      feasibility: 'high',
      details:
        'Accelerate POs to build 90-day buffer stock at Dallas and Rotterdam DCs. Requires financing approval. Best for mid-value, high-velocity items. Works in parallel with Alternative A.',
    },
  ],
};

export const COMPLIANCE_DATA: ComplianceRow[] = [
  { supplier: 'NanoFab Ltd', type: 'ISO 9001', expires: '2026-03-15', daysLeft: -24, status: 'expired' },
  { supplier: 'PrecisionTech Asia', type: 'REACH / RoHS', expires: '2026-04-30', daysLeft: 22, status: 'expiring' },
  { supplier: 'Gulf Logistics', type: 'C-TPAT', expires: '2026-09-01', daysLeft: 146, status: 'ok' },
  { supplier: 'UkrSteel Inc', type: 'Conflict Minerals (3TG)', expires: '2026-05-31', daysLeft: 53, status: 'ok' },
  { supplier: 'SinoMinerals', type: 'Halal Cert', expires: '2026-04-15', daysLeft: 7, status: 'expiring' },
  { supplier: 'PetroChemCo', type: 'ISO 14001', expires: '2026-07-20', daysLeft: 103, status: 'ok' },
  { supplier: 'PackagePro EU', type: 'EU CSRD', expires: '2026-12-31', daysLeft: 267, status: 'ok' },
  { supplier: 'PrecisionMex SA', type: 'USMCA Certificate', expires: '2026-06-30', daysLeft: 83, status: 'ok' },
];

const mkSparkData = (base: number, volatility: number, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    v: +(
      base +
      Math.sin(i * 0.7 + Math.random()) * volatility +
      (Math.random() - 0.45) * volatility
    ).toFixed(2),
  }));

export const COMMODITIES: Commodity[] = [
  { name: 'Copper (LME)', unit: '$/mt', current: 9240, change: +4.2, alert: 9500, alertDir: 'above', color: TOKEN_WARNING, spark: mkSparkData(9240, 180) },
  { name: 'Brent Crude', unit: '$/bbl', current: 83.4, change: -1.8, alert: 90, alertDir: 'above', color: TOKEN_INFO, spark: mkSparkData(83.4, 3.5) },
  { name: 'Aluminum (LME)', unit: '$/mt', current: 2310, change: +1.1, alert: 2500, alertDir: 'above', color: TOKEN_MID, spark: mkSparkData(2310, 60) },
  { name: 'Rare Earth Index', unit: 'Index', current: 142.7, change: +8.9, alert: 150, alertDir: 'above', color: TOKEN_TEAL, spark: mkSparkData(142.7, 6) },
];
