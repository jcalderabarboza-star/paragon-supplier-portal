// BuyerDashboard i18n fragment (Batch 6) — CHROME ONLY. Namespace: buyerDashboard.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
//
// SCOPE: the page SHELL only — breadcrumb, header, time-range toggle, the KPI strip,
// the empty state, and the two fixed panels (Production Line Risk, Supplier Health
// Index) that are rendered inline (NOT widget components). The expandable dashboard
// widgets localize centrally via the shared widget.* fragment and are untouched here.
//
// Category tokens (production-line category cell) localize CENTRALLY via
// useCategoryLabel(). StatusPill children (risk-level pills, the hardcoded
// "2 lines at risk" demo chip) render via the central resolver chain / verbatim and
// are NOT re-keyed. Currency/percentage/grade data (Rp 14.0B, 75%, 12d, grade
// letters A–D) stay EN as mono DATA.
export const buyerDashboardEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerDashboard.crumb.dashboards': 'DASHBOARDS',
  'buyerDashboard.crumb.commandCenter': 'PROCUREMENT COMMAND CENTER',
  // — Page header —
  'buyerDashboard.header.title': 'Procurement Command Center',
  'buyerDashboard.header.subtitle':
    'Paragon Corp · Odyssey Program · Live operational view',
  // — Time-range toggle —
  'buyerDashboard.range.today': 'Today',
  'buyerDashboard.range.week': 'This week',
  'buyerDashboard.range.month': 'This month',
  // — KPI strip —
  'buyerDashboard.kpi.spend.eyebrow': 'Total Spend YTD',
  'buyerDashboard.kpi.illustrative': 'Illustrative — no live source',
  'buyerDashboard.kpi.otif.eyebrow': 'Portfolio OTIF',
  'buyerDashboard.kpi.activeSuppliers.eyebrow': 'Active Suppliers',
  'buyerDashboard.kpi.activeSuppliers.subtitle':
    '/ {{total}} total · {{onboarding}} onboarding',
  'buyerDashboard.kpi.openPo.eyebrow': 'Open POs',
  'buyerDashboard.kpi.openPo.unack': '{{count}} unacknowledged >48h',
  'buyerDashboard.kpi.openPo.allAck': 'All acknowledged',
  // — Empty state —
  'buyerDashboard.empty.title': 'No command-center data',
  'buyerDashboard.empty.subtitle':
    'Production-line and supplier-health data is available to buyer accounts.',
  // — Production Line Risk panel —
  'buyerDashboard.lines.eyebrow': 'Operations',
  'buyerDashboard.lines.title': 'Production Line Risk',
  'buyerDashboard.lines.col.line': 'Line',
  'buyerDashboard.lines.col.category': 'Category',
  'buyerDashboard.lines.col.cover': 'Cover (days)',
  'buyerDashboard.lines.col.risk': 'Risk',
  'buyerDashboard.lines.blockedSku.one': '{{count}} blocked SKU',
  'buyerDashboard.lines.blockedSku.other': '{{count}} blocked SKUs',
  // — Supplier Health Index panel —
  'buyerDashboard.health.eyebrow': 'Intelligence',
  'buyerDashboard.health.title': 'Supplier Health Index',
};

export const buyerDashboardId: Record<string, string> = {
  // — Breadcrumb —
  'buyerDashboard.crumb.dashboards': 'DASBOR',
  'buyerDashboard.crumb.commandCenter': 'PUSAT KOMANDO PENGADAAN',
  // — Page header —
  'buyerDashboard.header.title': 'Pusat Komando Pengadaan',
  'buyerDashboard.header.subtitle':
    'Paragon Corp · Odyssey Program · Tampilan operasional langsung',
  // — Time-range toggle —
  'buyerDashboard.range.today': 'Hari ini',
  'buyerDashboard.range.week': 'Minggu ini',
  'buyerDashboard.range.month': 'Bulan ini',
  // — KPI strip —
  'buyerDashboard.kpi.spend.eyebrow': 'Total Belanja YTD',
  'buyerDashboard.kpi.illustrative': 'Ilustratif — tanpa sumber langsung',
  'buyerDashboard.kpi.otif.eyebrow': 'OTIF Portofolio',
  'buyerDashboard.kpi.activeSuppliers.eyebrow': 'Pemasok Aktif',
  'buyerDashboard.kpi.activeSuppliers.subtitle':
    '/ {{total}} total · {{onboarding}} onboarding',
  'buyerDashboard.kpi.openPo.eyebrow': 'PO Terbuka',
  'buyerDashboard.kpi.openPo.unack': '{{count}} belum diakui >48j',
  'buyerDashboard.kpi.openPo.allAck': 'Semua diakui',
  // — Empty state —
  'buyerDashboard.empty.title': 'Tidak ada data pusat komando',
  'buyerDashboard.empty.subtitle':
    'Data lini produksi dan kesehatan pemasok tersedia untuk akun pembeli.',
  // — Production Line Risk panel —
  'buyerDashboard.lines.eyebrow': 'Operasi',
  'buyerDashboard.lines.title': 'Risiko Lini Produksi',
  'buyerDashboard.lines.col.line': 'Lini',
  'buyerDashboard.lines.col.category': 'Kategori',
  'buyerDashboard.lines.col.cover': 'Cakupan (hari)',
  'buyerDashboard.lines.col.risk': 'Risiko',
  'buyerDashboard.lines.blockedSku.one': '{{count}} SKU diblokir',
  'buyerDashboard.lines.blockedSku.other': '{{count}} SKU diblokir',
  // — Supplier Health Index panel —
  'buyerDashboard.health.eyebrow': 'Intelijen',
  'buyerDashboard.health.title': 'Indeks Kesehatan Pemasok',
};
