// BuyerRisk i18n fragment (Batch 3). Namespace: risk.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// Count-dependent phrases would use explicit `.one` / `.other` sibling keys
// selected in-component by a `count === 1` ternary; this page's static chrome has
// no such live count phrase, so none are declared.
// Canonical StatusPill children (risk/priority SEVERITY tokens like
// critical/high/medium/low, and status tokens Expired/Expiring soon/Valid) are
// localized centrally via statusLabel.ts + priorityLabel.ts and are NOT re-keyed
// here. A handful of non-enum labels that sit *inside* a StatusPill child
// ("Probability: …%", "AI-Powered", "{feasibility} feasibility") are left as-is
// per the central-maps rule. Fixture-derived narrative (alert bodies, geo/scenario
// card copy, the ARIA recommendation blurb, commodity names) is i18n-defer and
// stays EN in the page.
export const riskEn: Record<string, string> = {
  // — Breadcrumb —
  'risk.crumb.intelligence': 'INTELLIGENCE',
  'risk.crumb.supplyRisk': 'SUPPLY RISK',
  // — Page header —
  'risk.header.title': 'Supply Risk & Scenario Intelligence',
  // The old subtitle ended "· live alerts." — a liveness claim that contradicted
  // the SIMULATED marker one line below it. Reworded to illustrative framing.
  'risk.header.subtitle':
    'Geopolitical · single-source · compliance · financial risk — illustrative scenario intelligence.',
  'risk.action.exportReport': 'Export Report',
  'risk.action.configureAlerts': 'Configure Alerts',
  'risk.toast.exportStarting': 'Risk report export starting',
  'risk.toast.alertConfig.title': 'Alert configuration',
  'risk.toast.alertConfig.desc': 'Channel rules editor coming in Phase 2A.',
  // — Meta line (honest illustrative caption; the LivenessPill carries the SIMULATED marker) —
  'risk.meta.illustrative': 'Illustrative risk intelligence — no live feed',
  // Replaces the former 'risk.meta.lastUpdated' footer, which stamped
  // `new Date()` under static fixtures — a manufactured freshness claim. The
  // honest footer names the real-later capability instead of a fake timestamp.
  'risk.meta.futureCapability':
    'Every figure on this page is illustrative. It is the specification for supply-risk intelligence (Stage-2 · I3) — to be derived from real spend, supplier, and commodity data when that capability lands.',
  // — Region enclosures (IllustrativeRegion captions) —
  'risk.illustrative.alerts': 'Illustrative scenario alerts — no live feed',
  'risk.illustrative.geo': 'Illustrative geopolitical intelligence — no live feed',
  'risk.illustrative.exposure': 'Illustrative supply-exposure figures — no live feed',
  'risk.illustrative.scenario': 'Illustrative scenario model — no live feed',
  'risk.illustrative.compliance': 'Illustrative compliance-risk records — no live feed',
  'risk.illustrative.commodity': 'Illustrative commodity prices — no live feed',
  'risk.illustrative.map': 'Illustrative supplier risk map — no live feed',
  // — Alert banner —
  'risk.alert.dismiss': 'Dismiss alert',
  // — KPI cards (values are illustrative demo data; every card is marked illustrative) —
  'risk.kpi.events.eyebrow': 'Active Risk Events',
  'risk.kpi.exposed.eyebrow': 'Spend Exposed',
  'risk.kpi.singleSource.eyebrow': 'Single-Source Critical',
  'risk.kpi.expiring.eyebrow': 'Compliance Expiring',
  'risk.kpi.illustrative': 'Illustrative — no live source',
  // — Risk map —
  'risk.map.title': 'Supplier risk map',
  'risk.map.region.taiwan': 'Taiwan',
  'risk.map.region.china': 'China',
  'risk.map.region.redSea': 'Red Sea',
  'risk.map.region.ukraine': 'Ukraine',
  'risk.map.region.saudiArabia': 'Saudi Arabia',
  'risk.map.region.germany': 'Germany',
  'risk.map.region.mexico': 'Mexico',
  'risk.map.region.dallas': 'Dallas (DC)',
  'risk.map.legend.critical': 'Critical risk',
  'risk.map.legend.high': 'High / medium risk',
  'risk.map.legend.low': 'Low risk',
  'risk.map.legend.hub': 'DC / hub',
  // — Sub-tabs —
  'risk.tab.geo': 'Geopolitical',
  'risk.tab.exposure': 'Supply Exposure',
  'risk.tab.scenario': 'Scenario Modeling',
  'risk.tab.compliance': 'Compliance Risks',
  'risk.tab.commodity': 'Commodity Prices',
  // — Geopolitical tab (card labels) —
  'risk.geo.riskScore': 'Risk score',
  'risk.geo.impact': 'Impact',
  'risk.geo.affectedSuppliers': 'Affected suppliers',
  'risk.geo.mitigation': 'Mitigation',
  // — Alternative / scenario StatusPill labels —
  'risk.alt.probability': 'Probability',
  'risk.alt.feasibility': 'feasibility',
  // — Supply Exposure tab —
  'risk.exposure.totalExposed': 'Total exposed spend',
  'risk.exposure.singleSourceCritical': 'Single-source critical',
  'risk.exposure.categoriesAtRisk': 'Categories at risk',
  'risk.exposure.dualSourced': 'Dual-sourced',
  'risk.exposure.col.category': 'Category',
  'risk.exposure.col.supplier': 'Supplier',
  'risk.exposure.col.region': 'Region',
  'risk.exposure.col.annualSpend': 'Annual spend',
  'risk.exposure.col.daysOfStock': 'Days of stock',
  'risk.exposure.col.risk': 'Risk',
  'risk.exposure.col.dualSource': 'Dual source',
  // — Scenario tab —
  'risk.scenario.lib.me': 'Middle East conflict',
  'risk.scenario.lib.tw': 'Taiwan Strait closure',
  'risk.scenario.lib.pa': 'Pandemic resurgence',
  'risk.scenario.sendWarRoom': 'Send to War Room',
  'risk.scenario.sent': '✓ Sent',
  'risk.scenario.responseAlternatives': 'Response alternatives',
  'risk.scenario.activatePlan': 'Activate plan',
  'risk.scenario.viewFullAnalysis': 'View full analysis',
  'risk.scenario.ariaRecommendation': 'ARIA Recommendation',
  // — Scenario toasts —
  'risk.toast.warRoomForwarded.title': 'Scenario forwarded to War Room',
  'risk.toast.warRoomForwarded.desc':
    '{{title}} dispatched to procurement leadership.',
  'risk.toast.activationInitiated': '{{name}} activation initiated',
  'risk.toast.openingAnalysis': 'Opening full analysis for {{id}}',
  // — Compliance Risks tab —
  'risk.compliance.actionRequired': 'Action required: ',
  'risk.compliance.certWarnPrefix': "{{supplier}}'s {{type}} expires in ",
  'risk.compliance.certWarnDays': '{{days}} days',
  'risk.compliance.certWarnSuffix':
    ' ({{expires}}). Renew immediately to maintain export compliance to GCC markets.',
  'risk.compliance.col.supplier': 'Supplier',
  'risk.compliance.col.certRequirement': 'Certificate / requirement',
  'risk.compliance.col.expiryDate': 'Expiry date',
  'risk.compliance.col.daysLeft': 'Days left',
  'risk.compliance.col.status': 'Status',
  'risk.compliance.col.action': 'Action',
  'risk.compliance.overdue': '{{days}}d overdue',
  'risk.compliance.noAction': 'No action',
  'risk.compliance.urgentRenewal': 'Urgent renewal',
  'risk.compliance.sendReminder': 'Send reminder',
  'risk.compliance.dismissBanner': 'Dismiss banner',
  'risk.compliance.differentAnglePrefix': 'Different angle from ',
  'risk.compliance.complianceTracker': 'Compliance Tracker',
  'risk.compliance.differentAngleSuffix':
    ': this view focuses on expiry urgency for risk-exposed suppliers only.',
  // — Compliance toasts —
  'risk.toast.urgentRenewal': 'Urgent renewal requested for {{supplier}}',
  'risk.toast.reminderSent': 'Reminder sent to {{supplier}}',
  // — Commodity Prices tab —
  'risk.commodity.alertIf': 'Alert if {{dir}}:',
  'risk.commodity.dirAbove': 'above',
  'risk.commodity.dirBelow': 'below',
  'risk.commodity.thresholdBreached': '⚠ Threshold breached',
  'risk.commodity.withinRange': '✓ Within range',
  'risk.commodity.impactAlertsTitle': 'Procurement impact alerts',
  'risk.commodity.alertTriggered':
    'Alert triggered: current value {{current}} exceeds threshold {{threshold}}',
  'risk.commodity.withinThreshold':
    'Within threshold ({{current}} / {{threshold}} {{unit}})',
  // — Empty state (all-empty early return) —
  'risk.empty.title': 'No risk intelligence yet',
  'risk.empty.subtitle': 'Supply-risk monitoring is a buyer-side view.',
  'risk.empty.message':
    'Geopolitical, exposure, scenario, and commodity signals appear here for buyer accounts.',
};

export const riskId: Record<string, string> = {
  // — Breadcrumb —
  'risk.crumb.intelligence': 'INTELIJEN',
  'risk.crumb.supplyRisk': 'RISIKO PASOKAN',
  // — Page header —
  'risk.header.title': 'Intelijen Risiko Pasokan & Skenario',
  'risk.header.subtitle':
    'Geopolitik · sumber tunggal · kepatuhan · risiko finansial — intelijen skenario ilustratif.',
  'risk.action.exportReport': 'Ekspor Laporan',
  'risk.action.configureAlerts': 'Konfigurasi Peringatan',
  'risk.toast.exportStarting': 'Ekspor laporan risiko dimulai',
  'risk.toast.alertConfig.title': 'Konfigurasi peringatan',
  'risk.toast.alertConfig.desc': 'Editor aturan kanal hadir pada Fase 2A.',
  // — Meta line (honest illustrative caption; the LivenessPill carries the SIMULATED marker) —
  'risk.meta.illustrative': 'Intelijen risiko ilustratif — tanpa umpan langsung',
  'risk.meta.futureCapability':
    'Setiap angka di halaman ini bersifat ilustratif. Ini adalah spesifikasi untuk intelijen risiko pasokan (Tahap-2 · I3) — akan diturunkan dari data belanja, pemasok, dan komoditas yang sebenarnya saat kapabilitas itu hadir.',
  // — Penanda wilayah (caption IllustrativeRegion) —
  'risk.illustrative.alerts': 'Peringatan skenario ilustratif — tanpa umpan langsung',
  'risk.illustrative.geo': 'Intelijen geopolitik ilustratif — tanpa umpan langsung',
  'risk.illustrative.exposure': 'Angka eksposur pasokan ilustratif — tanpa umpan langsung',
  'risk.illustrative.scenario': 'Model skenario ilustratif — tanpa umpan langsung',
  'risk.illustrative.compliance': 'Catatan risiko kepatuhan ilustratif — tanpa umpan langsung',
  'risk.illustrative.commodity': 'Harga komoditas ilustratif — tanpa umpan langsung',
  'risk.illustrative.map': 'Peta risiko pemasok ilustratif — tanpa umpan langsung',
  // — Alert banner —
  'risk.alert.dismiss': 'Tutup peringatan',
  // — KPI cards (nilai ilustratif; setiap kartu ditandai ilustratif) —
  'risk.kpi.events.eyebrow': 'Peristiwa Risiko Aktif',
  'risk.kpi.exposed.eyebrow': 'Belanja Terekspos',
  'risk.kpi.singleSource.eyebrow': 'Sumber Tunggal Kritis',
  'risk.kpi.expiring.eyebrow': 'Kepatuhan Akan Kedaluwarsa',
  'risk.kpi.illustrative': 'Ilustratif — tanpa sumber langsung',
  // — Risk map —
  'risk.map.title': 'Peta risiko pemasok',
  'risk.map.region.taiwan': 'Taiwan',
  'risk.map.region.china': 'Tiongkok',
  'risk.map.region.redSea': 'Laut Merah',
  'risk.map.region.ukraine': 'Ukraina',
  'risk.map.region.saudiArabia': 'Arab Saudi',
  'risk.map.region.germany': 'Jerman',
  'risk.map.region.mexico': 'Meksiko',
  'risk.map.region.dallas': 'Dallas (DC)',
  'risk.map.legend.critical': 'Risiko kritis',
  'risk.map.legend.high': 'Risiko tinggi / sedang',
  'risk.map.legend.low': 'Risiko rendah',
  'risk.map.legend.hub': 'DC / hub',
  // — Sub-tabs —
  'risk.tab.geo': 'Geopolitik',
  'risk.tab.exposure': 'Eksposur Pasokan',
  'risk.tab.scenario': 'Pemodelan Skenario',
  'risk.tab.compliance': 'Risiko Kepatuhan',
  'risk.tab.commodity': 'Harga Komoditas',
  // — Geopolitical tab (card labels) —
  'risk.geo.riskScore': 'Skor risiko',
  'risk.geo.impact': 'Dampak',
  'risk.geo.affectedSuppliers': 'Pemasok terdampak',
  'risk.geo.mitigation': 'Mitigasi',
  // — Alternative / scenario StatusPill labels —
  'risk.alt.probability': 'Probabilitas',
  'risk.alt.feasibility': 'kelayakan',
  // — Supply Exposure tab —
  'risk.exposure.totalExposed': 'Total belanja terekspos',
  'risk.exposure.singleSourceCritical': 'Sumber tunggal kritis',
  'risk.exposure.categoriesAtRisk': 'Kategori berisiko',
  'risk.exposure.dualSourced': 'Sumber ganda',
  'risk.exposure.col.category': 'Kategori',
  'risk.exposure.col.supplier': 'Pemasok',
  'risk.exposure.col.region': 'Wilayah',
  'risk.exposure.col.annualSpend': 'Belanja tahunan',
  'risk.exposure.col.daysOfStock': 'Hari stok',
  'risk.exposure.col.risk': 'Risiko',
  'risk.exposure.col.dualSource': 'Sumber ganda',
  // — Scenario tab —
  'risk.scenario.lib.me': 'Konflik Timur Tengah',
  'risk.scenario.lib.tw': 'Penutupan Selat Taiwan',
  'risk.scenario.lib.pa': 'Kebangkitan pandemi',
  'risk.scenario.sendWarRoom': 'Kirim ke War Room',
  'risk.scenario.sent': '✓ Terkirim',
  'risk.scenario.responseAlternatives': 'Alternatif respons',
  'risk.scenario.activatePlan': 'Aktifkan rencana',
  'risk.scenario.viewFullAnalysis': 'Lihat analisis lengkap',
  'risk.scenario.ariaRecommendation': 'Rekomendasi ARIA',
  // — Scenario toasts —
  'risk.toast.warRoomForwarded.title': 'Skenario diteruskan ke War Room',
  'risk.toast.warRoomForwarded.desc':
    '{{title}} dikirim ke pimpinan pengadaan.',
  'risk.toast.activationInitiated': 'Aktivasi {{name}} dimulai',
  'risk.toast.openingAnalysis': 'Membuka analisis lengkap untuk {{id}}',
  // — Compliance Risks tab —
  'risk.compliance.actionRequired': 'Tindakan diperlukan: ',
  'risk.compliance.certWarnPrefix': '{{type}} milik {{supplier}} kedaluwarsa dalam ',
  'risk.compliance.certWarnDays': '{{days}} hari',
  'risk.compliance.certWarnSuffix':
    ' ({{expires}}). Perbarui segera untuk menjaga kepatuhan ekspor ke pasar GCC.',
  'risk.compliance.col.supplier': 'Pemasok',
  'risk.compliance.col.certRequirement': 'Sertifikat / persyaratan',
  'risk.compliance.col.expiryDate': 'Tanggal kedaluwarsa',
  'risk.compliance.col.daysLeft': 'Hari tersisa',
  'risk.compliance.col.status': 'Status',
  'risk.compliance.col.action': 'Tindakan',
  'risk.compliance.overdue': 'terlambat {{days}} hari',
  'risk.compliance.noAction': 'Tanpa tindakan',
  'risk.compliance.urgentRenewal': 'Pembaruan mendesak',
  'risk.compliance.sendReminder': 'Kirim pengingat',
  'risk.compliance.dismissBanner': 'Tutup spanduk',
  'risk.compliance.differentAnglePrefix': 'Sudut pandang berbeda dari ',
  'risk.compliance.complianceTracker': 'Pelacak Kepatuhan',
  'risk.compliance.differentAngleSuffix':
    ': tampilan ini berfokus pada urgensi kedaluwarsa hanya untuk pemasok yang berisiko.',
  // — Compliance toasts —
  'risk.toast.urgentRenewal': 'Pembaruan mendesak diminta untuk {{supplier}}',
  'risk.toast.reminderSent': 'Pengingat dikirim ke {{supplier}}',
  // — Commodity Prices tab —
  'risk.commodity.alertIf': 'Peringatan jika {{dir}}:',
  'risk.commodity.dirAbove': 'di atas',
  'risk.commodity.dirBelow': 'di bawah',
  'risk.commodity.thresholdBreached': '⚠ Ambang batas terlampaui',
  'risk.commodity.withinRange': '✓ Dalam rentang',
  'risk.commodity.impactAlertsTitle': 'Peringatan dampak pengadaan',
  'risk.commodity.alertTriggered':
    'Peringatan terpicu: nilai saat ini {{current}} melebihi ambang batas {{threshold}}',
  'risk.commodity.withinThreshold':
    'Dalam ambang batas ({{current}} / {{threshold}} {{unit}})',
  // — Empty state (all-empty early return) —
  'risk.empty.title': 'Belum ada intelijen risiko',
  'risk.empty.subtitle': 'Pemantauan risiko pasokan adalah tampilan sisi pembeli.',
  'risk.empty.message':
    'Sinyal geopolitik, eksposur, skenario, dan komoditas muncul di sini untuk akun pembeli.',
};
