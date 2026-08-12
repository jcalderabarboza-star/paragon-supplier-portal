// BuyerInventory i18n fragment (Batch 6). Namespace: buyerInventory.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (matching the flat-key convention).
//
// Category tokens (material / supplier category) localize CENTRALLY via
// useCategoryLabel() — never re-keyed here. DOS-range legend chips, the `{dos}d`
// StatusPill child, the heatmap `{avg}d` cells, quantities/dates/codes rendered
// through <Data>/formatNumber, the synthetic `14 days` lead-time placeholder, the
// `Source` data-ingestion enum (API Push / EDI 846 / WhatsApp / Email / Manual —
// loanwords/protocols/proper-nouns), and formatRelativeTime output all stay EN as
// mono DATA / i18n-defer.
export const buyerInventoryEn: Record<string, string> = {
  // — Breadcrumb —
  'buyerInventory.crumb.transact': 'TRANSACT',
  'buyerInventory.crumb.inventory': 'INVENTORY VISIBILITY',
  // — Page header —
  'buyerInventory.header.title': 'Inventory Visibility',
  'buyerInventory.header.subtitle':
    'Upstream supplier inventory positions, days of supply, and critical material alerts.',
  // — Header actions —
  'buyerInventory.action.export': 'Export',
  'buyerInventory.action.syncNow': 'Sync now',
  // — Meta line —
  'buyerInventory.meta.materials.one':
    '{{count}} material tracked · last sync {{sync}}',
  'buyerInventory.meta.materials.other':
    '{{count}} materials tracked · last sync {{sync}}',
  // — KPI cards —
  'buyerInventory.kpi.totalMaterials.eyebrow': 'Total Materials Tracked',
  'buyerInventory.kpi.totalMaterials.subtitle': 'Across all upstream suppliers',
  'buyerInventory.kpi.critical.eyebrow': 'Critical (<14 days DOS)',
  'buyerInventory.kpi.critical.subtitle': 'Immediate replenishment needed',
  'buyerInventory.kpi.warning.eyebrow': 'Warning (14–30 days)',
  'buyerInventory.kpi.warning.subtitle': 'Monitor closely',
  'buyerInventory.kpi.avgDos.eyebrow': 'Avg Days of Supply',
  'buyerInventory.kpi.avgDos.value': '{{n}} days',
  'buyerInventory.kpi.avgDos.subtitle': 'Portfolio mean',
  // — Sub-tabs —
  'buyerInventory.tab.all': 'All',
  'buyerInventory.tab.critical': 'Critical',
  'buyerInventory.tab.warning': 'Warning',
  'buyerInventory.tab.healthy': 'Healthy',
  'buyerInventory.tab.excess': 'Excess',
  // — Search —
  'buyerInventory.search.placeholder':
    'Search by material code, name, or supplier...',
  // — DOS heatmap —
  'buyerInventory.heatmap.eyebrow': 'Coverage Overview',
  'buyerInventory.heatmap.title': 'DOS heatmap by category × brand',
  'buyerInventory.heatmap.col.category': 'Category',
  // — Main table —
  'buyerInventory.table.col.material': 'Material',
  'buyerInventory.table.col.supplier': 'Supplier',
  'buyerInventory.table.col.category': 'Category',
  'buyerInventory.table.col.onHand': 'On-Hand',
  'buyerInventory.table.col.available': 'Available',
  'buyerInventory.table.col.dos': 'DOS',
  'buyerInventory.table.col.lastUpdated': 'Last Updated',
  'buyerInventory.table.col.source': 'Source',
  'buyerInventory.table.empty': 'No materials match the current filters.',
  // — Side panel: key facts —
  'buyerInventory.panel.keyFacts': 'Key facts',
  'buyerInventory.panel.material': 'Material',
  'buyerInventory.panel.category': 'Category',
  'buyerInventory.panel.description': 'Description',
  'buyerInventory.panel.supplier': 'Supplier',
  'buyerInventory.panel.otif': 'OTIF',
  'buyerInventory.panel.leadTime': 'Lead Time',
  'buyerInventory.panel.moq': 'MOQ',
  'buyerInventory.panel.safetyStock': 'Safety Stock',
  'buyerInventory.panel.reorderPoint': 'Reorder Point',
  // — Side panel: sections —
  'buyerInventory.panel.recentUpdates': 'Recent inventory updates',
  'buyerInventory.panel.activePos': 'Active POs',
  'buyerInventory.panel.noActivePos':
    'No open purchase orders for this material.',
  'buyerInventory.panel.col.po': 'PO #',
  'buyerInventory.panel.col.qty': 'Qty',
  'buyerInventory.panel.col.eta': 'ETA',
  // — Toasts —
  'buyerInventory.toast.syncQueued.title': 'Inventory sync not available yet',
  'buyerInventory.toast.syncQueued.desc': 'Nothing was synced. Last update shown: {{time}}',
  'buyerInventory.toast.exportStarted.title': 'Inventory export not available yet',
  'buyerInventory.toast.exportStarted.desc':
    'No snapshot was generated — inventory export is not wired to a real system.',
  // — Side panel timeline —
  'buyerInventory.timeline.stockUpdate.title': 'Stock update from {{source}}',
  'buyerInventory.timeline.stockUpdate.desc': 'On-hand {{qty}} {{uom}}',
  'buyerInventory.timeline.reservation.title': 'Reservation posted',
  'buyerInventory.timeline.reservation.desc':
    '{{qty}} {{uom}} reserved for open POs',
  'buyerInventory.timeline.reconciliation.title': 'Previous reconciliation',
  'buyerInventory.timeline.reconciliation.desc':
    'Cycle count complete · no variance',
  // — Empty state (all-empty early return) —
  'buyerInventory.empty.title': 'No inventory positions yet',
  'buyerInventory.empty.subtitle':
    'Upstream supplier inventory positions appear here.',
  'buyerInventory.empty.message':
    'When suppliers report stock, their days-of-supply positions show up here.',
};

export const buyerInventoryId: Record<string, string> = {
  // — Breadcrumb —
  'buyerInventory.crumb.transact': 'TRANSAKSI',
  'buyerInventory.crumb.inventory': 'VISIBILITAS INVENTARIS',
  // — Page header —
  'buyerInventory.header.title': 'Visibilitas Inventaris',
  'buyerInventory.header.subtitle':
    'Posisi inventaris pemasok hulu, hari pasokan, dan peringatan material kritis.',
  // — Header actions —
  'buyerInventory.action.export': 'Ekspor',
  'buyerInventory.action.syncNow': 'Sinkronkan sekarang',
  // — Meta line —
  'buyerInventory.meta.materials.one':
    '{{count}} material dilacak · sinkronisasi terakhir {{sync}}',
  'buyerInventory.meta.materials.other':
    '{{count}} material dilacak · sinkronisasi terakhir {{sync}}',
  // — KPI cards —
  'buyerInventory.kpi.totalMaterials.eyebrow': 'Total Material Dilacak',
  'buyerInventory.kpi.totalMaterials.subtitle': 'Di seluruh pemasok hulu',
  'buyerInventory.kpi.critical.eyebrow': 'Kritis (<14 hari DOS)',
  'buyerInventory.kpi.critical.subtitle': 'Pengisian ulang segera diperlukan',
  'buyerInventory.kpi.warning.eyebrow': 'Peringatan (14–30 hari)',
  'buyerInventory.kpi.warning.subtitle': 'Pantau dengan cermat',
  'buyerInventory.kpi.avgDos.eyebrow': 'Rata-rata Hari Pasokan',
  'buyerInventory.kpi.avgDos.value': '{{n}} hari',
  'buyerInventory.kpi.avgDos.subtitle': 'Rata-rata portofolio',
  // — Sub-tabs —
  'buyerInventory.tab.all': 'Semua',
  'buyerInventory.tab.critical': 'Kritis',
  'buyerInventory.tab.warning': 'Peringatan',
  'buyerInventory.tab.healthy': 'Sehat',
  'buyerInventory.tab.excess': 'Berlebih',
  // — Search —
  'buyerInventory.search.placeholder':
    'Cari berdasarkan kode material, nama, atau pemasok...',
  // — DOS heatmap —
  'buyerInventory.heatmap.eyebrow': 'Ikhtisar Cakupan',
  'buyerInventory.heatmap.title': 'Peta panas DOS menurut kategori × merek',
  'buyerInventory.heatmap.col.category': 'Kategori',
  // — Main table —
  'buyerInventory.table.col.material': 'Material',
  'buyerInventory.table.col.supplier': 'Pemasok',
  'buyerInventory.table.col.category': 'Kategori',
  'buyerInventory.table.col.onHand': 'Stok Fisik',
  'buyerInventory.table.col.available': 'Tersedia',
  'buyerInventory.table.col.dos': 'DOS',
  'buyerInventory.table.col.lastUpdated': 'Terakhir Diperbarui',
  'buyerInventory.table.col.source': 'Sumber',
  'buyerInventory.table.empty': 'Tidak ada material yang cocok dengan filter saat ini.',
  // — Side panel: key facts —
  'buyerInventory.panel.keyFacts': 'Fakta utama',
  'buyerInventory.panel.material': 'Material',
  'buyerInventory.panel.category': 'Kategori',
  'buyerInventory.panel.description': 'Deskripsi',
  'buyerInventory.panel.supplier': 'Pemasok',
  'buyerInventory.panel.otif': 'OTIF',
  'buyerInventory.panel.leadTime': 'Waktu Tunggu',
  'buyerInventory.panel.moq': 'MOQ',
  'buyerInventory.panel.safetyStock': 'Stok Pengaman',
  'buyerInventory.panel.reorderPoint': 'Titik Pemesanan Ulang',
  // — Side panel: sections —
  'buyerInventory.panel.recentUpdates': 'Pembaruan inventaris terbaru',
  'buyerInventory.panel.activePos': 'PO Aktif',
  'buyerInventory.panel.noActivePos':
    'Tidak ada pesanan pembelian terbuka untuk material ini.',
  'buyerInventory.panel.col.po': 'PO #',
  'buyerInventory.panel.col.qty': 'Kuantitas',
  'buyerInventory.panel.col.eta': 'ETA',
  // — Toasts —
  'buyerInventory.toast.syncQueued.title': 'Sinkronisasi inventaris belum tersedia',
  'buyerInventory.toast.syncQueued.desc': 'Tidak ada yang disinkronkan. Pembaruan terakhir yang ditampilkan: {{time}}',
  'buyerInventory.toast.exportStarted.title': 'Ekspor inventaris belum tersedia',
  'buyerInventory.toast.exportStarted.desc':
    'Tidak ada snapshot yang dibuat — ekspor inventaris belum tersambung ke sistem nyata.',
  // — Side panel timeline —
  'buyerInventory.timeline.stockUpdate.title': 'Pembaruan stok dari {{source}}',
  'buyerInventory.timeline.stockUpdate.desc': 'Stok fisik {{qty}} {{uom}}',
  'buyerInventory.timeline.reservation.title': 'Reservasi diposting',
  'buyerInventory.timeline.reservation.desc':
    '{{qty}} {{uom}} dicadangkan untuk PO terbuka',
  'buyerInventory.timeline.reconciliation.title': 'Rekonsiliasi sebelumnya',
  'buyerInventory.timeline.reconciliation.desc':
    'Perhitungan siklus selesai · tanpa selisih',
  // — Empty state (all-empty early return) —
  'buyerInventory.empty.title': 'Belum ada posisi inventaris',
  'buyerInventory.empty.subtitle':
    'Posisi inventaris pemasok hulu muncul di sini.',
  'buyerInventory.empty.message':
    'Saat pemasok melaporkan stok, posisi hari-pasokan mereka muncul di sini.',
};
