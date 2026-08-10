// SupplierInventory i18n fragment (Batch 6). Namespace: supplierInventory.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases use explicit `.one` / `.other` sibling keys selected
// in-component by a `count === 1` ternary (the flat-key convention already
// shipped in i18n.ts — no reliance on the i18next plural resolver).
//
// StatusPill children stay canonical EN and localize centrally: the stock-status
// pill (Critical/Low via priorityLabel enum map, Normal/Excess via statusLabel)
// and the data-source pill (API Push / EDI 846 / Manual via statusLabel). The
// FILTER-chip labels for the same four stock statuses are NOT re-keyed here —
// they resolve through the same central maps in-component (statusLabelKey ??
// enumLabelKey), so the chip reads byte-identical to the pill in both locales;
// only the page-specific 'All' option carries a key. Filter `id`s stay canonical
// StockStatus values (data). Mono DATA (quantities, days-of-supply `{n}d`, dates
// via <Data>/formatters, material codes, UoM, supplier names) stays EN.
export const supplierInventoryEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierInventory.crumb.transact': 'TRANSACT',
  'supplierInventory.crumb.myInventory': 'MY INVENTORY',
  // — Page header —
  'supplierInventory.header.title': 'My Inventory',
  'supplierInventory.header.subtitle':
    'Stock visibility · days-of-supply tracking · Paragon minimum thresholds.',
  // — Header actions —
  'supplierInventory.action.exportEdi': 'Export EDI 846',
  'supplierInventory.action.syncNow': 'Sync now',
  // — Toasts —
  'supplierInventory.toast.exportPreparing.title': 'Export preparing',
  'supplierInventory.toast.exportPreparing.desc':
    'EDI 846 format download starting.',
  'supplierInventory.toast.syncing.title':
    'Syncing inventory from supplier API feeds',
  // — Meta line —
  'supplierInventory.meta.materials.one': '{{count}} material',
  'supplierInventory.meta.materials.other': '{{count}} materials',
  'supplierInventory.meta.lastSync': 'last sync',
  // — KPI cards —
  'supplierInventory.kpi.critical.eyebrow': 'Critical stock',
  'supplierInventory.kpi.low.eyebrow': 'Low stock',
  'supplierInventory.kpi.normal.eyebrow': 'Normal',
  'supplierInventory.kpi.excess.eyebrow': 'Excess',
  'supplierInventory.kpi.pctOfMaterials': '{{pct}}% of materials',
  // — Critical-stock banner (embeds a <strong> count via <Trans>) —
  'supplierInventory.banner.critical.one':
    '<strong>{{count}} material</strong> at critical stock level.',
  'supplierInventory.banner.critical.other':
    '<strong>{{count}} materials</strong> at critical stock level.',
  // — Search / filters —
  'supplierInventory.search.placeholder': 'Search material, code, or supplier…',
  'supplierInventory.filter.all': 'All',
  'supplierInventory.filter.countOf': '{{shown}} of {{total}} materials',
  // — Table columns —
  'supplierInventory.col.material': 'Material',
  'supplierInventory.col.supplier': 'Supplier',
  'supplierInventory.col.onHand': 'On hand',
  'supplierInventory.col.available': 'Available',
  'supplierInventory.col.inTransit': 'In transit',
  'supplierInventory.col.uom': 'UoM',
  'supplierInventory.col.daysSupply': 'Days supply',
  'supplierInventory.col.status': 'Status',
  'supplierInventory.col.source': 'Source',
  'supplierInventory.col.lastUpdated': 'Last updated',
  'supplierInventory.table.empty': 'No materials match the current filter.',
  // — Footer info panels —
  'supplierInventory.info.dataSources.label': 'Data sources:',
  'supplierInventory.info.dataSources.body':
    'The Source column shows the ingestion channel each record is DESIGNED to arrive on — API Push, EDI 846, or Manual. None is connected yet: every row shown is sample data. SAP MM stock pull and VMI signals are planned alongside the live feed.',
  'supplierInventory.info.thresholds.label': 'Thresholds:',
  'supplierInventory.info.thresholds.body':
    'Critical <7 days · Low 7–14 days · Normal 14–30 days · Excess >30 days. These bands classify the rows shown; Paragon minimum stock requirements are not enforced from this page.',
  // — Empty state (all-empty early return) —
  'supplierInventory.empty.title': 'No inventory yet',
  'supplierInventory.empty.subtitle':
    'No stock records on file for {{supplier}}.',
  'supplierInventory.empty.thisSupplier': 'this supplier',
  'supplierInventory.empty.message':
    'Stock positions will appear here once inventory is reported.',
};

export const supplierInventoryId: Record<string, string> = {
  // — Breadcrumb —
  'supplierInventory.crumb.transact': 'TRANSAKSI',
  'supplierInventory.crumb.myInventory': 'INVENTARIS SAYA',
  // — Page header —
  'supplierInventory.header.title': 'Inventaris Saya',
  'supplierInventory.header.subtitle':
    'Visibilitas stok · pelacakan hari pasokan · ambang batas minimum Paragon.',
  // — Header actions —
  'supplierInventory.action.exportEdi': 'Ekspor EDI 846',
  'supplierInventory.action.syncNow': 'Sinkronkan sekarang',
  // — Toasts —
  'supplierInventory.toast.exportPreparing.title': 'Menyiapkan ekspor',
  'supplierInventory.toast.exportPreparing.desc':
    'Unduhan format EDI 846 dimulai.',
  'supplierInventory.toast.syncing.title':
    'Menyinkronkan inventaris dari umpan API pemasok',
  // — Meta line —
  'supplierInventory.meta.materials.one': '{{count}} material',
  'supplierInventory.meta.materials.other': '{{count}} material',
  'supplierInventory.meta.lastSync': 'sinkronisasi terakhir',
  // — KPI cards —
  'supplierInventory.kpi.critical.eyebrow': 'Stok kritis',
  'supplierInventory.kpi.low.eyebrow': 'Stok rendah',
  'supplierInventory.kpi.normal.eyebrow': 'Normal',
  'supplierInventory.kpi.excess.eyebrow': 'Berlebih',
  'supplierInventory.kpi.pctOfMaterials': '{{pct}}% dari material',
  // — Critical-stock banner (embeds a <strong> count via <Trans>) —
  'supplierInventory.banner.critical.one':
    '<strong>{{count}} material</strong> pada tingkat stok kritis.',
  'supplierInventory.banner.critical.other':
    '<strong>{{count}} material</strong> pada tingkat stok kritis.',
  // — Search / filters —
  'supplierInventory.search.placeholder': 'Cari material, kode, atau pemasok…',
  'supplierInventory.filter.all': 'Semua',
  'supplierInventory.filter.countOf': '{{shown}} dari {{total}} material',
  // — Table columns —
  'supplierInventory.col.material': 'Material',
  'supplierInventory.col.supplier': 'Pemasok',
  'supplierInventory.col.onHand': 'Stok fisik',
  'supplierInventory.col.available': 'Tersedia',
  'supplierInventory.col.inTransit': 'Dalam perjalanan',
  'supplierInventory.col.uom': 'Satuan',
  'supplierInventory.col.daysSupply': 'Hari pasokan',
  'supplierInventory.col.status': 'Status',
  'supplierInventory.col.source': 'Sumber',
  'supplierInventory.col.lastUpdated': 'Terakhir diperbarui',
  'supplierInventory.table.empty':
    'Tidak ada material yang cocok dengan filter saat ini.',
  // — Footer info panels —
  'supplierInventory.info.dataSources.label': 'Sumber data:',
  'supplierInventory.info.dataSources.body':
    'Kolom Sumber menunjukkan saluran masuk yang DIRANCANG untuk setiap catatan — API Push, EDI 846, atau Manual. Belum ada yang terhubung: semua baris yang ditampilkan adalah data sampel. Penarikan stok SAP MM dan sinyal VMI direncanakan bersama umpan live.',
  'supplierInventory.info.thresholds.label': 'Ambang batas:',
  'supplierInventory.info.thresholds.body':
    'Kritis <7 hari · Rendah 7–14 hari · Normal 14–30 hari · Berlebih >30 hari. Ambang ini mengklasifikasikan baris yang ditampilkan; persyaratan stok minimum Paragon tidak diberlakukan dari halaman ini.',
  // — Empty state (all-empty early return) —
  'supplierInventory.empty.title': 'Belum ada inventaris',
  'supplierInventory.empty.subtitle':
    'Tidak ada catatan stok untuk {{supplier}}.',
  'supplierInventory.empty.thisSupplier': 'pemasok ini',
  'supplierInventory.empty.message':
    'Posisi stok akan muncul di sini setelah inventaris dilaporkan.',
};
