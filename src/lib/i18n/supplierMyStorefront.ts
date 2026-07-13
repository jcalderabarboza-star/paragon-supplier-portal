// SupplierMyStorefront i18n fragment (Batch 6). Namespace: supplierMyStorefront.*
// Flat dot-keys, mirrors src/lib/i18n.ts. Wired into i18n.ts by the operator.
// The supplier's OWN editable storefront/catalog manager ("My Catalog").
//
// HONEST DISPLAY-vs-DATA boundary:
//  • Category tokens (Packaging Primary/Secondary, item.category, supp.category)
//    render through useCategoryLabel() — the stored value AND every <option value>
//    stay canonical EN; only the visible label localizes.
//  • Cert status pills (Valid/Expiring/Expired/Missing/Pending) auto-localize via
//    StatusPill → statusLabel; NOT re-keyed here.
//  • Mono DATA (MOQ/lead time/unit price/capacity/dates/timezone via <Data>) and
//    UoM/currency/cert CODES (PCS/KG/IDR/ISO 9001/BPOM/SNI/RSPO), the demo
//    marketplace stat figures, plus product/material names, cert names, the
//    company description text, and the shared CHANNEL_CONFIG channel labels +
//    technical descriptions stay EN as data / i18n-defer.
export const supplierMyStorefrontEn: Record<string, string> = {
  // — Breadcrumb —
  'supplierMyStorefront.crumb.acquire': 'ACQUIRE',
  'supplierMyStorefront.crumb.myStorefront': 'MY STOREFRONT',
  // — Page header —
  'supplierMyStorefront.header.title': 'My Catalog',
  'supplierMyStorefront.header.subtitle':
    'Your public profile in the Paragon Supplier Marketplace — {{supplier}}.',
  'supplierMyStorefront.header.preview': 'Preview public profile',
  // — Meta line —
  'supplierMyStorefront.meta.summary':
    '{{materials}} materials · {{certs}} certifications shown · profile {{pct}}% complete',
  // — Profile completeness —
  'supplierMyStorefront.completeness.title': 'Profile completeness',
  'supplierMyStorefront.completeness.complete': 'Complete',
  'supplierMyStorefront.completeness.companyDescription': 'Company description',
  'supplierMyStorefront.completeness.materialsCatalog': 'Materials catalog (3 items)',
  'supplierMyStorefront.completeness.bpomRegistration': 'BPOM Registration',
  'supplierMyStorefront.completeness.iso9001': 'ISO 9001 Certificate',
  'supplierMyStorefront.completeness.bpjphHalal': 'BPJPH Halal Certificate',
  'supplierMyStorefront.completeness.capacity': 'Annual manufacturing capacity',
  'supplierMyStorefront.completeness.references': 'Key clients / references',
  'supplierMyStorefront.completeness.profilePhoto': 'Profile photo / facility image',
  // — Step eyebrow (shared) —
  'supplierMyStorefront.step': 'Step {{n}}',
  // — Shared actions —
  'supplierMyStorefront.action.edit': 'Edit',
  'supplierMyStorefront.action.cancel': 'Cancel',
  'supplierMyStorefront.action.save': 'Save',
  'supplierMyStorefront.action.addMaterial': 'Add material',
  'supplierMyStorefront.action.submitReview': 'Submit for review',
  'supplierMyStorefront.action.uploadNew': 'Upload new',
  // — Step 1: company profile —
  'supplierMyStorefront.step1.title': 'Company profile',
  'supplierMyStorefront.step1.description':
    'Public-facing information shown to buyers in the marketplace.',
  'supplierMyStorefront.field.companyDescription': 'Company description',
  'supplierMyStorefront.field.legalName': 'Legal name',
  'supplierMyStorefront.field.country': 'Country',
  'supplierMyStorefront.field.category': 'Category',
  'supplierMyStorefront.field.established': 'Established',
  'supplierMyStorefront.field.employees': 'Employees',
  'supplierMyStorefront.field.revenue': 'Revenue',
  'supplierMyStorefront.field.description': 'Description',
  'supplierMyStorefront.toast.profileUpdated': 'Company profile updated',
  // — Step 2: materials I supply —
  'supplierMyStorefront.step2.title': 'Materials I supply',
  'supplierMyStorefront.step2.description':
    'Materials you can quote on. Toggle visibility per item to control marketplace listings.',
  'supplierMyStorefront.col.material': 'Material',
  'supplierMyStorefront.col.category': 'Category',
  'supplierMyStorefront.col.moq': 'MOQ',
  'supplierMyStorefront.col.leadTime': 'Lead time',
  'supplierMyStorefront.col.unitPrice': 'Unit price',
  'supplierMyStorefront.col.capacity': 'Capacity/mo',
  'supplierMyStorefront.col.certs': 'Certs',
  'supplierMyStorefront.col.visible': 'Visible',
  'supplierMyStorefront.col.remove': 'Remove',
  'supplierMyStorefront.aria.toggleVisibility': 'Toggle visibility for {{name}}',
  'supplierMyStorefront.aria.removeMaterial': 'Remove {{name}}',
  'supplierMyStorefront.addForm.title': 'Add new material',
  'supplierMyStorefront.addForm.materialName': 'Material name *',
  'supplierMyStorefront.addForm.materialNamePlaceholder': 'e.g. PET Bottle 250ml',
  'supplierMyStorefront.addForm.sapCode': 'SAP code (optional)',
  'supplierMyStorefront.addForm.sapCodePlaceholder': 'e.g. MAT-10099',
  'supplierMyStorefront.addForm.category': 'Category',
  'supplierMyStorefront.addForm.moq': 'MOQ *',
  'supplierMyStorefront.addForm.uom': 'UoM',
  'supplierMyStorefront.addForm.leadTime': 'Lead time (days)',
  'supplierMyStorefront.addForm.unitPrice': 'Unit price',
  'supplierMyStorefront.addForm.ccy': 'CCY',
  'supplierMyStorefront.addForm.capacity': 'Capacity/month',
  'supplierMyStorefront.addForm.certifications': 'Certifications',
  'supplierMyStorefront.toast.materialRemoved': 'Material removed from catalog',
  'supplierMyStorefront.toast.materialNameRequired': 'Material name is required',
  'supplierMyStorefront.toast.materialSubmitted.title':
    'New material submitted for review',
  'supplierMyStorefront.toast.materialSubmitted.desc':
    'Paragon procurement will notify you within 3 business days.',
  // — Step 3: certifications on display —
  'supplierMyStorefront.step3.title': 'Certifications on display',
  'supplierMyStorefront.step3.description':
    'Toggle which certifications appear on your public storefront.',
  'supplierMyStorefront.toast.fileBrowser': 'File browser opened (mock)',
  'supplierMyStorefront.cert.expPrefix': 'Exp:',
  'supplierMyStorefront.cert.shown': 'Shown',
  'supplierMyStorefront.cert.hidden': 'Hidden',
  // — Step 4: preferred communication channels —
  'supplierMyStorefront.step4.title': 'Preferred communication channels',
  'supplierMyStorefront.step4.description':
    'Primary channel is used for time-sensitive notifications; fallback only when primary fails.',
  'supplierMyStorefront.toast.channelUpdated': 'Channel preferences updated',
  'supplierMyStorefront.channel.primary': 'PRIMARY',
  'supplierMyStorefront.channel.fallback': 'FALLBACK',
  // — Step 5: business hours & timezone —
  'supplierMyStorefront.step5.title': 'Business hours & timezone',
  'supplierMyStorefront.step5.description':
    "When you're available to respond. Drives bot escalation timing.",
  'supplierMyStorefront.toast.hoursUpdated': 'Business hours updated',
  'supplierMyStorefront.field.businessHours': 'Business hours',
  'supplierMyStorefront.field.to': 'to',
  'supplierMyStorefront.field.timezone': 'Timezone',
  'supplierMyStorefront.field.currentStatus': 'Current status',
  'supplierMyStorefront.status.open': 'Open — {{time}}',
  'supplierMyStorefront.status.closed': 'Closed — {{time}}',
  // — Step 6: marketplace statistics —
  'supplierMyStorefront.step6.title': 'Marketplace statistics',
  'supplierMyStorefront.step6.description':
    'How buyers are finding and engaging with your storefront.',
  'supplierMyStorefront.stat.profileViews': 'Profile views (month)',
  'supplierMyStorefront.stat.rfqInvitations': 'RFQ invitations',
  'supplierMyStorefront.stat.winRate': 'Win rate',
  'supplierMyStorefront.stat.categoryRank': 'Category rank',
  // — Advisor panel —
  'supplierMyStorefront.advisor.title': 'How to improve your ranking',
  'supplierMyStorefront.advisor.heading': 'Complete your profile ({{pct}}% → 100%):',
  'supplierMyStorefront.advisor.item.halal':
    'Upload BPJPH Halal Certificate (+12 points)',
  'supplierMyStorefront.advisor.item.capacity':
    'Add annual manufacturing capacity data (+8 points)',
  'supplierMyStorefront.advisor.item.images':
    'Upload facility/product images (+5 points)',
  'supplierMyStorefront.advisor.item.materials':
    'Add 2 more materials to catalog (+5 points)',
  'supplierMyStorefront.advisor.item.references':
    'Add key client references (+5 points)',
  // — Catalog table inline units —
  'supplierMyStorefront.days': 'days',
  'supplierMyStorefront.perMonth': '/mo',
};

export const supplierMyStorefrontId: Record<string, string> = {
  // — Breadcrumb —
  'supplierMyStorefront.crumb.acquire': 'PENGADAAN',
  'supplierMyStorefront.crumb.myStorefront': 'ETALASE SAYA',
  // — Page header —
  'supplierMyStorefront.header.title': 'Katalog Saya',
  'supplierMyStorefront.header.subtitle':
    'Profil publik Anda di Pasar Pemasok Paragon — {{supplier}}.',
  'supplierMyStorefront.header.preview': 'Pratinjau profil publik',
  // — Meta line —
  'supplierMyStorefront.meta.summary':
    '{{materials}} material · {{certs}} sertifikasi ditampilkan · profil {{pct}}% lengkap',
  // — Profile completeness —
  'supplierMyStorefront.completeness.title': 'Kelengkapan profil',
  'supplierMyStorefront.completeness.complete': 'Lengkap',
  'supplierMyStorefront.completeness.companyDescription': 'Deskripsi perusahaan',
  'supplierMyStorefront.completeness.materialsCatalog': 'Katalog material (3 item)',
  'supplierMyStorefront.completeness.bpomRegistration': 'Registrasi BPOM',
  'supplierMyStorefront.completeness.iso9001': 'Sertifikat ISO 9001',
  'supplierMyStorefront.completeness.bpjphHalal': 'Sertifikat Halal BPJPH',
  'supplierMyStorefront.completeness.capacity': 'Kapasitas produksi tahunan',
  'supplierMyStorefront.completeness.references': 'Klien utama / referensi',
  'supplierMyStorefront.completeness.profilePhoto': 'Foto profil / gambar fasilitas',
  // — Step eyebrow (shared) —
  'supplierMyStorefront.step': 'Langkah {{n}}',
  // — Shared actions —
  'supplierMyStorefront.action.edit': 'Ubah',
  'supplierMyStorefront.action.cancel': 'Batal',
  'supplierMyStorefront.action.save': 'Simpan',
  'supplierMyStorefront.action.addMaterial': 'Tambah material',
  'supplierMyStorefront.action.submitReview': 'Kirim untuk ditinjau',
  'supplierMyStorefront.action.uploadNew': 'Unggah baru',
  // — Step 1: company profile —
  'supplierMyStorefront.step1.title': 'Profil perusahaan',
  'supplierMyStorefront.step1.description':
    'Informasi publik yang ditampilkan kepada pembeli di pasar.',
  'supplierMyStorefront.field.companyDescription': 'Deskripsi perusahaan',
  'supplierMyStorefront.field.legalName': 'Nama resmi',
  'supplierMyStorefront.field.country': 'Negara',
  'supplierMyStorefront.field.category': 'Kategori',
  'supplierMyStorefront.field.established': 'Didirikan',
  'supplierMyStorefront.field.employees': 'Karyawan',
  'supplierMyStorefront.field.revenue': 'Pendapatan',
  'supplierMyStorefront.field.description': 'Deskripsi',
  'supplierMyStorefront.toast.profileUpdated': 'Profil perusahaan diperbarui',
  // — Step 2: materials I supply —
  'supplierMyStorefront.step2.title': 'Material yang saya pasok',
  'supplierMyStorefront.step2.description':
    'Material yang dapat Anda tawarkan. Alihkan visibilitas per item untuk mengontrol daftar di pasar.',
  'supplierMyStorefront.col.material': 'Material',
  'supplierMyStorefront.col.category': 'Kategori',
  'supplierMyStorefront.col.moq': 'MOQ',
  'supplierMyStorefront.col.leadTime': 'Waktu tunggu',
  'supplierMyStorefront.col.unitPrice': 'Harga satuan',
  'supplierMyStorefront.col.capacity': 'Kapasitas/bln',
  'supplierMyStorefront.col.certs': 'Sertifikat',
  'supplierMyStorefront.col.visible': 'Terlihat',
  'supplierMyStorefront.col.remove': 'Hapus',
  'supplierMyStorefront.aria.toggleVisibility': 'Alihkan visibilitas untuk {{name}}',
  'supplierMyStorefront.aria.removeMaterial': 'Hapus {{name}}',
  'supplierMyStorefront.addForm.title': 'Tambah material baru',
  'supplierMyStorefront.addForm.materialName': 'Nama material *',
  'supplierMyStorefront.addForm.materialNamePlaceholder': 'mis. Botol PET 250ml',
  'supplierMyStorefront.addForm.sapCode': 'Kode SAP (opsional)',
  'supplierMyStorefront.addForm.sapCodePlaceholder': 'mis. MAT-10099',
  'supplierMyStorefront.addForm.category': 'Kategori',
  'supplierMyStorefront.addForm.moq': 'MOQ *',
  'supplierMyStorefront.addForm.uom': 'Satuan',
  'supplierMyStorefront.addForm.leadTime': 'Waktu tunggu (hari)',
  'supplierMyStorefront.addForm.unitPrice': 'Harga satuan',
  'supplierMyStorefront.addForm.ccy': 'Mata uang',
  'supplierMyStorefront.addForm.capacity': 'Kapasitas/bulan',
  'supplierMyStorefront.addForm.certifications': 'Sertifikasi',
  'supplierMyStorefront.toast.materialRemoved': 'Material dihapus dari katalog',
  'supplierMyStorefront.toast.materialNameRequired': 'Nama material wajib diisi',
  'supplierMyStorefront.toast.materialSubmitted.title':
    'Material baru dikirim untuk ditinjau',
  'supplierMyStorefront.toast.materialSubmitted.desc':
    'Pengadaan Paragon akan memberi tahu Anda dalam 3 hari kerja.',
  // — Step 3: certifications on display —
  'supplierMyStorefront.step3.title': 'Sertifikasi yang ditampilkan',
  'supplierMyStorefront.step3.description':
    'Alihkan sertifikasi mana yang muncul di etalase publik Anda.',
  'supplierMyStorefront.toast.fileBrowser': 'Peramban berkas dibuka (tiruan)',
  'supplierMyStorefront.cert.expPrefix': 'Kedaluwarsa:',
  'supplierMyStorefront.cert.shown': 'Ditampilkan',
  'supplierMyStorefront.cert.hidden': 'Disembunyikan',
  // — Step 4: preferred communication channels —
  'supplierMyStorefront.step4.title': 'Kanal komunikasi pilihan',
  'supplierMyStorefront.step4.description':
    'Kanal utama digunakan untuk notifikasi mendesak; cadangan hanya saat kanal utama gagal.',
  'supplierMyStorefront.toast.channelUpdated': 'Preferensi kanal diperbarui',
  'supplierMyStorefront.channel.primary': 'UTAMA',
  'supplierMyStorefront.channel.fallback': 'CADANGAN',
  // — Step 5: business hours & timezone —
  'supplierMyStorefront.step5.title': 'Jam kerja & zona waktu',
  'supplierMyStorefront.step5.description':
    'Saat Anda tersedia untuk merespons. Menentukan waktu eskalasi bot.',
  'supplierMyStorefront.toast.hoursUpdated': 'Jam kerja diperbarui',
  'supplierMyStorefront.field.businessHours': 'Jam kerja',
  'supplierMyStorefront.field.to': 'sampai',
  'supplierMyStorefront.field.timezone': 'Zona waktu',
  'supplierMyStorefront.field.currentStatus': 'Status saat ini',
  'supplierMyStorefront.status.open': 'Buka — {{time}}',
  'supplierMyStorefront.status.closed': 'Tutup — {{time}}',
  // — Step 6: marketplace statistics —
  'supplierMyStorefront.step6.title': 'Statistik pasar',
  'supplierMyStorefront.step6.description':
    'Bagaimana pembeli menemukan dan berinteraksi dengan etalase Anda.',
  'supplierMyStorefront.stat.profileViews': 'Tampilan profil (bulan)',
  'supplierMyStorefront.stat.rfqInvitations': 'Undangan RFQ',
  'supplierMyStorefront.stat.winRate': 'Tingkat kemenangan',
  'supplierMyStorefront.stat.categoryRank': 'Peringkat kategori',
  // — Advisor panel —
  'supplierMyStorefront.advisor.title': 'Cara meningkatkan peringkat Anda',
  'supplierMyStorefront.advisor.heading': 'Lengkapi profil Anda ({{pct}}% → 100%):',
  'supplierMyStorefront.advisor.item.halal':
    'Unggah Sertifikat Halal BPJPH (+12 poin)',
  'supplierMyStorefront.advisor.item.capacity':
    'Tambahkan data kapasitas produksi tahunan (+8 poin)',
  'supplierMyStorefront.advisor.item.images':
    'Unggah gambar fasilitas/produk (+5 poin)',
  'supplierMyStorefront.advisor.item.materials':
    'Tambahkan 2 material lagi ke katalog (+5 poin)',
  'supplierMyStorefront.advisor.item.references':
    'Tambahkan referensi klien utama (+5 poin)',
  // — Catalog table inline units —
  'supplierMyStorefront.days': 'hari',
  'supplierMyStorefront.perMonth': '/bln',
};
