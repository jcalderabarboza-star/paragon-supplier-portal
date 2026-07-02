// ────────────────────────────────────────────────────────────────────────────
// Buyer analytics fixtures.
//
// Relocated from src/pages-v2/BuyerAnalytics.tsx in Phase 1B Batch 2.
// Aggregate buyer-side reporting data — not per-supplier-scoped.
// ────────────────────────────────────────────────────────────────────────────

import type {
  SpendCategoryRow,
  TopSupplierSpend,
  MonthlyOtifRow,
  MonthlyPoRow,
  MonthlyChannelMix,
  AnalyticsPerfRow,
  AnalyticsSummary,
} from '../../types';

const TOKEN_TEAL = '#0097A7';
const TOKEN_NAVY = '#0D1B2A';
const TOKEN_MID = '#354A5F';
const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_INFO = '#1E5BAE';
const TOKEN_MUTED = '#6B7785';

export const SPEND_CAT: SpendCategoryRow[] = [
  { category: 'Active Ingredients', value: 1260, color: TOKEN_TEAL },
  { category: 'Fragrance', value: 840, color: TOKEN_MID },
  { category: 'Packaging Primary', value: 630, color: TOKEN_SUCCESS },
  { category: 'Natural/Botanical', value: 504, color: TOKEN_WARNING },
  { category: 'Packaging Secondary', value: 420, color: TOKEN_INFO },
  { category: 'Halal Emulsifiers', value: 336, color: TOKEN_NAVY },
  { category: 'Other', value: 210, color: TOKEN_MUTED },
];

export const TOP_SUPPLIERS: TopSupplierSpend[] = [
  { supplier: 'PT Berlina Packaging', spend: 820 },
  { supplier: 'Zhejiang NHU Vitamins', spend: 680 },
  { supplier: 'BASF Personal Care DE', spend: 540 },
  { supplier: 'PT Musim Mas Specialty', spend: 420 },
  { supplier: 'PT Halal Emulsifier Nusantara', spend: 380 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const OTIF_VALS = [82, 84, 83, 85, 86, 84, 87, 88, 86, 87, 88, 87, 87, 88, 87];
const OTDR_VALS = [85, 86, 87, 88, 87, 89, 90, 91, 89, 91, 92, 91, 91, 92, 91];

export const OTIF_DATA: MonthlyOtifRow[] = OTIF_VALS.map((v, i) => ({
  month: MONTHS[i],
  otif: v,
  otdr: OTDR_VALS[i],
}));

const PO_VOLS = [3, 4, 3, 5, 4, 6, 5, 4, 5, 6, 4, 5, 4, 5, 3];
const CYCLE_VALS = [48, 42, 38, 35, 32, 30, 28, 26, 28, 25, 24, 23, 22, 21, 22];

export const PO_VOL_DATA: MonthlyPoRow[] = PO_VOLS.map((v, i) => ({
  month: MONTHS[i],
  pos: v,
  cycleTime: CYCLE_VALS[i],
}));

export const CHANNEL_DATA: MonthlyChannelMix[] = [
  { month: 'Oct', whatsapp: 20, web: 15, email: 55, api: 10 },
  { month: 'Nov', whatsapp: 25, web: 18, email: 47, api: 10 },
  { month: 'Dec', whatsapp: 30, web: 20, email: 40, api: 10 },
  { month: 'Jan', whatsapp: 35, web: 22, email: 33, api: 10 },
  { month: 'Feb', whatsapp: 40, web: 24, email: 26, api: 10 },
  { month: 'Mar', whatsapp: 45, web: 25, email: 20, api: 10 },
];

export const PERF_TABLE: AnalyticsPerfRow[] = [
  { supplier: 'PT Berlina Packaging Indonesia', category: 'Packaging Primary', otif: 88, otdr: 91, ackSpeed: '18h', invoiceMatch: '98%', grade: 'B', trend: '↑' },
  { supplier: 'Zhejiang NHU Vitamins Co.', category: 'Active Ingredients', otif: 94, otdr: 96, ackSpeed: '6h', invoiceMatch: '100%', grade: 'A', trend: '↑' },
  { supplier: 'BASF Personal Care DE', category: 'Active Ingredients', otif: 78, otdr: 82, ackSpeed: '42h', invoiceMatch: '85%', grade: 'C', trend: '↓' },
  { supplier: 'PT Musim Mas Specialty Fats', category: 'Halal Emulsifier', otif: 92, otdr: 94, ackSpeed: '12h', invoiceMatch: '97%', grade: 'A', trend: '→' },
  { supplier: 'PT Halal Emulsifier Nusantara', category: 'Halal Emulsifier', otif: 85, otdr: 88, ackSpeed: '24h', invoiceMatch: '95%', grade: 'B', trend: '↑' },
  { supplier: 'Givaudan Fragrance SG', category: 'Fragrance', otif: 91, otdr: 93, ackSpeed: '8h', invoiceMatch: '99%', grade: 'A', trend: '→' },
  { supplier: 'PT Ecogreen Oleochemicals', category: 'Natural Botanical', otif: 82, otdr: 85, ackSpeed: '30h', invoiceMatch: '92%', grade: 'B', trend: '↑' },
  { supplier: 'Evonik Specialty FR', category: 'Active Ingredients', otif: 72, otdr: 76, ackSpeed: '56h', invoiceMatch: '88%', grade: 'C', trend: '↓' },
];

// Headline KPI cards — relocated from the inline JSX in BuyerAnalytics so the
// summary reads through the service like every other analytics surface.
export const ANALYTICS_SUMMARY: AnalyticsSummary = {
  totalSpend: {
    value: 'Rp 4.2B',
    subtitle: '+12% vs last year · 8 categories',
    tone: 'success',
  },
  activeSuppliers: {
    value: '12',
    subtitle: '2 onboarding · 8 Grade A or B',
    tone: 'success',
  },
  portfolioOtif: {
    value: '87%',
    subtitle: '-3pp vs target 90% · 15-mo avg',
    tone: 'danger',
  },
  avgCycleTime: {
    value: '28h',
    subtitle: '-42% vs 6 months ago',
    tone: 'success',
  },
};
