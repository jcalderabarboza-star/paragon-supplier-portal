// SupplierRegistration i18n fragment (Batch 1). Namespace: registration.*
export const registrationEn: Record<string, string> = {
  // — Page header / footer chrome —
  'registration.header.subtitle': 'Supplier Onboarding',
  'registration.header.needHelp': 'Need help?',

  // — Registration-type selector —
  'registration.selector.title': 'Select registration type',
  'registration.selector.subtitle':
    'Choose the type that matches your supplier situation. This determines the form length and S/4HANA integration path.',
  'registration.selector.steps': '{{count}} steps',
  'registration.selector.continue': 'Continue',

  // — Registration types —
  'registration.type.external.label': 'External Supplier Request',
  'registration.type.external.sub': 'New vendor — never worked with Paragon',
  'registration.type.external.detail':
    'Full 5-step registration: Company Info, Contacts, Categories, Documents, Review. Requires NPWP, NIB, and full qualification. Will be synced to S/4HANA as vendor account group Z002.',
  'registration.type.external.badge': 'Full process',
  'registration.type.external.short': 'External SR',
  'registration.type.internal.label': 'Internal Supplier Request',
  'registration.type.internal.sub': 'Existing vendor — adding new category or commodity',
  'registration.type.internal.detail':
    'Short 3-step update: Category expansion, additional contacts, supplementary documents. Existing S/4HANA vendor record is updated — no new master data creation.',
  'registration.type.internal.badge': 'Short form',
  'registration.type.internal.short': 'Internal SR',
  'registration.type.kol.label': 'KOL — Key Opinion Leader',
  'registration.type.kol.sub': 'Below Rp 7jT — generic vendor at DC level',
  'registration.type.kol.detail':
    'Minimal 2-step form: basic company info and bank details only. No Ariba registration required. Created directly in S/4HANA as a generic DC-level vendor. Invoice processed via Web Tukar Faktur.',
  'registration.type.kol.badge': 'Minimal form',
  'registration.type.kol.short': 'KOL',

  // — Shared step titles (wizard + review) —
  'registration.title.categoriesChannel': 'Categories & channel',
  'registration.title.documentsBank': 'Documents & bank',
  'registration.title.additionalContacts': 'Additional contacts',

  // — Step: Company information —
  'registration.step.company.eyebrow': 'Company',
  'registration.step.company.title': 'Company information',
  'registration.step.company.short': 'Company',
  'registration.step.company.description': 'Legal entity name and registration details.',
  'registration.step.company.field.legalName.label': 'Legal company name',
  'registration.step.company.field.legalName.placeholder': 'PT Maju Bersama Tbk.',
  'registration.step.company.field.npwp.label': 'NPWP number',
  'registration.step.company.field.nib.label': 'NIB (Business registration)',
  'registration.step.company.field.country.label': 'Country',
  'registration.step.company.field.province.label': 'Province',
  'registration.step.company.field.province.placeholder': '— Select province —',
  'registration.step.company.field.city.label': 'City',
  'registration.step.company.field.city.placeholder': 'Jakarta',
  'registration.step.company.field.address.label': 'Business address',
  'registration.step.company.field.address.placeholder': 'Jl. Sudirman No. 123, Gedung A Lt. 5',
  'registration.step.company.field.website.label': 'Website (optional)',

  // — Step: Contact persons —
  'registration.step.contacts.eyebrow': 'Contacts',
  'registration.step.contacts.title': 'Contact persons',
  'registration.step.contacts.short': 'Contacts',
  'registration.step.contacts.description':
    'Up to 3 contacts. The primary contact receives all critical notifications.',
  'registration.contacts.label': 'Contact {{index}}',
  'registration.contacts.remove': 'Remove',
  'registration.contacts.add': 'Add another contact',
  'registration.step.contacts.field.name.label': 'Full name',
  'registration.step.contacts.field.name.placeholder': 'Jane Smith',
  'registration.step.contacts.field.role.label': 'Role',
  'registration.step.contacts.field.email.label': 'Business email',
  'registration.step.contacts.field.whatsapp.label': 'WhatsApp number',
  'registration.step.contacts.field.phone.label': 'Phone (optional)',

  // — Contact roles —
  'registration.role.primary': 'Primary Contact',
  'registration.role.finance': 'Finance',
  'registration.role.operations': 'Operations',
  'registration.role.legal': 'Legal',
  'registration.role.technical': 'Technical',

  // — Step: Supply categories —
  'registration.step.categories.eyebrow': 'What you supply',
  'registration.step.categories.title': 'Supply categories',
  'registration.step.categories.short': 'Categories',
  'registration.step.categories.description': 'Select all categories that apply (at least 1 required).',

  // — Supply categories —
  'registration.category.rawMaterials': 'Raw Materials',
  'registration.category.electronics': 'Electronics',
  'registration.category.mechanicalComponents': 'Mechanical Components',
  'registration.category.packaging': 'Packaging',
  'registration.category.chemicals': 'Chemicals',
  'registration.category.logistics': 'Logistics & Transport',
  'registration.category.itServices': 'IT Services',
  'registration.category.mroSupplies': 'MRO Supplies',
  'registration.category.foodBeverage': 'Food & Beverage',
  'registration.category.textiles': 'Textiles',

  // — Step: Communication channel —
  'registration.step.channel.eyebrow': 'How we communicate',
  'registration.step.channel.title': 'Preferred communication channel',
  'registration.step.channel.description':
    'Paragon will send POs, ASN requests, and other procurement messages via this channel.',

  // — Channels —
  'registration.channel.whatsapp.label': 'WhatsApp',
  'registration.channel.whatsapp.desc': 'Tier 1 — best for SMEs',
  'registration.channel.web.label': 'Web Portal',
  'registration.channel.web.desc': 'Tier 2 — self-service',
  'registration.channel.api.label': 'API Integration',
  'registration.channel.api.desc': 'Tier 3 — automated',
  'registration.channel.edi.label': 'EDI 846',
  'registration.channel.edi.desc': 'Enterprise data exchange',

  // — Step: Compliance documents —
  'registration.step.documents.eyebrow': 'Compliance',
  'registration.step.documents.title': 'Compliance documents',
  'registration.step.documents.short': 'Documents',
  'registration.step.documents.description': 'Upload required certifications. PDF, JPG, PNG accepted.',
  'registration.documents.expiry': 'Expiry',
  'registration.documents.uploaded': 'Uploaded',
  'registration.documents.upload': 'Upload',

  // — Documents —
  'registration.document.npwp': 'NPWP Certificate',
  'registration.document.nib': 'NIB Business License',
  'registration.document.halal': 'Halal Certificate (if applicable)',
  'registration.document.iso': 'ISO 9001 Certificate (if applicable)',

  // — Step: Bank account details —
  'registration.step.bank.eyebrow': 'Payment',
  'registration.step.bank.title': 'Bank account details',
  'registration.step.bank.description': 'Used by Paragon Finance to settle invoices.',
  'registration.step.bank.field.bankName.label': 'Bank name',
  'registration.step.bank.field.bankName.placeholder': '— Select bank —',
  'registration.step.bank.field.accountNumber.label': 'Account number',
  'registration.step.bank.field.accountHolder.label': 'Account holder name',
  'registration.step.bank.field.accountHolder.placeholder': 'PT Maju Bersama',
  'registration.option.other': 'Other',

  // — Step: KOL bank details —
  'registration.step.kolBank.title': 'Bank details',
  'registration.step.kolBank.short': 'Bank',
  'registration.step.kolBank.description':
    'KOL invoices are processed via Web Tukar Faktur. No Ariba registration required.',
  'registration.step.kolBank.field.accountNumber.placeholder': 'e.g. 1234567890',
  'registration.step.kolBank.field.accountHolder.placeholder': 'As per bank records',
  'registration.kolBank.noticeLabel': 'KOL vendor:',
  'registration.kolBank.noticeText':
    'Created directly in S/4HANA at DC level. No Ariba qualification required.',

  // — Step: Internal SR category expansion —
  'registration.step.expansion.eyebrow': 'Expansion',
  'registration.step.expansion.title': 'Category expansion',
  'registration.step.expansion.short': 'Expansion',
  'registration.step.expansion.description':
    'Select the new categories or commodities for this existing vendor.',
  'registration.step.expansion.field.categories.label': 'Additional supply categories',
  'registration.step.expansion.field.s4Vendor.label': 'Existing S/4HANA vendor number',
  'registration.step.expansion.field.s4Vendor.placeholder': 'e.g. 1000456',
  'registration.step.expansion.field.reason.label': 'Reason for category expansion',
  'registration.step.expansion.field.reason.placeholder':
    'Explain why this vendor is being expanded to new categories…',

  // — Step: Review & submit —
  'registration.step.review.title': 'Review & submit',
  'registration.step.review.short': 'Review',
  'registration.review.notice':
    'Please review all information below before submitting. Go back to make any changes.',
  'registration.review.stepEyebrow': 'Step {{number}}',
  'registration.review.field.legalName': 'Legal name',
  'registration.review.field.npwp': 'NPWP',
  'registration.review.field.nib': 'NIB',
  'registration.review.field.country': 'Country',
  'registration.review.field.province': 'Province',
  'registration.review.field.city': 'City',
  'registration.review.field.address': 'Address',
  'registration.review.field.website': 'Website',
  'registration.review.field.name': 'Name',
  'registration.review.field.role': 'Role',
  'registration.review.field.email': 'Email',
  'registration.review.field.whatsapp': 'WhatsApp',
  'registration.review.field.phone': 'Phone',
  'registration.review.field.supplyCategories': 'Supply categories',
  'registration.review.field.channel': 'Preferred channel',
  'registration.review.field.bank': 'Bank',
  'registration.review.field.accountNumber': 'Account number',
  'registration.review.field.accountHolder': 'Account holder',
  'registration.review.field.s4Vendor': 'S/4HANA vendor',
  'registration.review.field.additionalCategories': 'Additional categories',
  'registration.review.field.reason': 'Reason',
  'registration.review.notUploaded': 'Not uploaded',
  'registration.review.expires': 'expires {{date}}',
  'registration.review.agreements.eyebrow': 'Agreements',
  'registration.review.agreements.title': 'Terms & confirmation',
  'registration.review.agreement1.text':
    "I agree to Paragon's <coc>Supplier Code of Conduct</coc> and <terms>Terms & Conditions</terms>.",
  'registration.review.agreement2':
    'I confirm that all information provided is accurate and complete. I understand that providing false information may result in rejection.',

  // — Success screen —
  'registration.success.title': 'Registration submitted',
  'registration.success.subtitle': 'Your application has been received and is under review.',
  'registration.success.appNumberLabel': 'Application number',
  'registration.success.nextTitle': 'What happens next?',
  'registration.success.next.1': 'Our procurement team will review your application within 3–5 business days.',
  'registration.success.next.2': 'You will receive an email at your registered address with the outcome.',
  'registration.success.next.3':
    'If approved, you will receive onboarding instructions and portal access credentials.',
  'registration.success.next.4':
    'For urgent queries, contact supplier-support@paragon.id quoting your application number.',
  'registration.success.questions':
    'Questions? Email <email>supplier-support@paragon.id</email> with your application number.',

  // — Wizard chrome —
  'registration.changeType': 'Change registration type',
  'registration.submit': 'Submit registration',

  // — Validation messages —
  'registration.validation.legalName.required': 'Legal company name is required',
  'registration.validation.npwp.required': 'NPWP is required',
  'registration.validation.city.required': 'City is required',
  'registration.validation.address.required': 'Address is required',
  'registration.validation.province.required': 'Province is required for Indonesia',
  'registration.validation.name.required': 'Name is required',
  'registration.validation.email.required': 'Email is required',
  'registration.validation.email.invalid': 'Invalid email format',
  'registration.validation.whatsapp.required': 'WhatsApp number is required',
  'registration.validation.bankName.required': 'Bank name is required',
  'registration.validation.accountNumber.required': 'Account number is required',
  'registration.validation.accountHolder.required': 'Account holder name is required',
  'registration.validation.agreed1.required': 'You must accept the Terms & Conditions',
  'registration.validation.agreed2.required': 'You must confirm the accuracy of the information',
  'registration.validation.category.required': 'Select at least one supply category',
  'registration.validation.s4Vendor.required': 'S/4HANA vendor number is required',
};

export const registrationId: Record<string, string> = {
  // — Page header / footer chrome —
  'registration.header.subtitle': 'Onboarding Pemasok',
  'registration.header.needHelp': 'Butuh bantuan?',

  // — Registration-type selector —
  'registration.selector.title': 'Pilih jenis pendaftaran',
  'registration.selector.subtitle':
    'Pilih jenis yang sesuai dengan situasi pemasok Anda. Ini menentukan panjang formulir dan jalur integrasi S/4HANA.',
  'registration.selector.steps': '{{count}} langkah',
  'registration.selector.continue': 'Lanjutkan',

  // — Registration types —
  'registration.type.external.label': 'Permintaan Pemasok Eksternal',
  'registration.type.external.sub': 'Vendor baru — belum pernah bekerja sama dengan Paragon',
  'registration.type.external.detail':
    'Pendaftaran lengkap 5 langkah: Info Perusahaan, Kontak, Kategori, Dokumen, Tinjauan. Memerlukan NPWP, NIB, dan kualifikasi lengkap. Akan disinkronkan ke S/4HANA sebagai grup akun vendor Z002.',
  'registration.type.external.badge': 'Proses lengkap',
  'registration.type.external.short': 'External SR',
  'registration.type.internal.label': 'Permintaan Pemasok Internal',
  'registration.type.internal.sub': 'Vendor lama — menambah kategori atau komoditas baru',
  'registration.type.internal.detail':
    'Pembaruan singkat 3 langkah: perluasan kategori, kontak tambahan, dokumen pelengkap. Catatan vendor S/4HANA yang ada diperbarui — tanpa pembuatan data master baru.',
  'registration.type.internal.badge': 'Formulir singkat',
  'registration.type.internal.short': 'Internal SR',
  'registration.type.kol.label': 'KOL — Key Opinion Leader',
  'registration.type.kol.sub': 'Di bawah Rp 7jT — vendor generik di tingkat DC',
  'registration.type.kol.detail':
    'Formulir minimal 2 langkah: hanya info dasar perusahaan dan detail bank. Tidak memerlukan pendaftaran Ariba. Dibuat langsung di S/4HANA sebagai vendor generik tingkat DC. Faktur diproses via Web Tukar Faktur.',
  'registration.type.kol.badge': 'Formulir minimal',
  'registration.type.kol.short': 'KOL',

  // — Shared step titles (wizard + review) —
  'registration.title.categoriesChannel': 'Kategori & kanal',
  'registration.title.documentsBank': 'Dokumen & bank',
  'registration.title.additionalContacts': 'Kontak tambahan',

  // — Step: Company information —
  'registration.step.company.eyebrow': 'Perusahaan',
  'registration.step.company.title': 'Informasi perusahaan',
  'registration.step.company.short': 'Perusahaan',
  'registration.step.company.description': 'Nama badan hukum dan detail pendaftaran.',
  'registration.step.company.field.legalName.label': 'Nama resmi perusahaan',
  'registration.step.company.field.legalName.placeholder': 'PT Maju Bersama Tbk.',
  'registration.step.company.field.npwp.label': 'Nomor NPWP',
  'registration.step.company.field.nib.label': 'NIB (Pendaftaran usaha)',
  'registration.step.company.field.country.label': 'Negara',
  'registration.step.company.field.province.label': 'Provinsi',
  'registration.step.company.field.province.placeholder': '— Pilih provinsi —',
  'registration.step.company.field.city.label': 'Kota',
  'registration.step.company.field.city.placeholder': 'Jakarta',
  'registration.step.company.field.address.label': 'Alamat usaha',
  'registration.step.company.field.address.placeholder': 'Jl. Sudirman No. 123, Gedung A Lt. 5',
  'registration.step.company.field.website.label': 'Situs web (opsional)',

  // — Step: Contact persons —
  'registration.step.contacts.eyebrow': 'Kontak',
  'registration.step.contacts.title': 'Narahubung',
  'registration.step.contacts.short': 'Kontak',
  'registration.step.contacts.description':
    'Maksimal 3 kontak. Kontak utama menerima semua notifikasi penting.',
  'registration.contacts.label': 'Kontak {{index}}',
  'registration.contacts.remove': 'Hapus',
  'registration.contacts.add': 'Tambah kontak lain',
  'registration.step.contacts.field.name.label': 'Nama lengkap',
  'registration.step.contacts.field.name.placeholder': 'Jane Smith',
  'registration.step.contacts.field.role.label': 'Peran',
  'registration.step.contacts.field.email.label': 'Email bisnis',
  'registration.step.contacts.field.whatsapp.label': 'Nomor WhatsApp',
  'registration.step.contacts.field.phone.label': 'Telepon (opsional)',

  // — Contact roles —
  'registration.role.primary': 'Kontak Utama',
  'registration.role.finance': 'Keuangan',
  'registration.role.operations': 'Operasional',
  'registration.role.legal': 'Legal',
  'registration.role.technical': 'Teknis',

  // — Step: Supply categories —
  'registration.step.categories.eyebrow': 'Yang Anda pasok',
  'registration.step.categories.title': 'Kategori pasokan',
  'registration.step.categories.short': 'Kategori',
  'registration.step.categories.description': 'Pilih semua kategori yang sesuai (minimal 1 wajib).',

  // — Supply categories —
  'registration.category.rawMaterials': 'Bahan Baku',
  'registration.category.electronics': 'Elektronik',
  'registration.category.mechanicalComponents': 'Komponen Mekanik',
  'registration.category.packaging': 'Kemasan',
  'registration.category.chemicals': 'Bahan Kimia',
  'registration.category.logistics': 'Logistik & Transportasi',
  'registration.category.itServices': 'Layanan TI',
  'registration.category.mroSupplies': 'Perlengkapan MRO',
  'registration.category.foodBeverage': 'Makanan & Minuman',
  'registration.category.textiles': 'Tekstil',

  // — Step: Communication channel —
  'registration.step.channel.eyebrow': 'Cara kami berkomunikasi',
  'registration.step.channel.title': 'Kanal komunikasi pilihan',
  'registration.step.channel.description':
    'Paragon akan mengirim PO, permintaan ASN, dan pesan pengadaan lainnya melalui kanal ini.',

  // — Channels —
  'registration.channel.whatsapp.label': 'WhatsApp',
  'registration.channel.whatsapp.desc': 'Tingkat 1 — terbaik untuk UKM',
  'registration.channel.web.label': 'Portal Web',
  'registration.channel.web.desc': 'Tingkat 2 — swalayan',
  'registration.channel.api.label': 'Integrasi API',
  'registration.channel.api.desc': 'Tingkat 3 — otomatis',
  'registration.channel.edi.label': 'EDI 846',
  'registration.channel.edi.desc': 'Pertukaran data enterprise',

  // — Step: Compliance documents —
  'registration.step.documents.eyebrow': 'Kepatuhan',
  'registration.step.documents.title': 'Dokumen kepatuhan',
  'registration.step.documents.short': 'Dokumen',
  'registration.step.documents.description': 'Unggah sertifikasi yang diperlukan. PDF, JPG, PNG diterima.',
  'registration.documents.expiry': 'Kedaluwarsa',
  'registration.documents.uploaded': 'Terunggah',
  'registration.documents.upload': 'Unggah',

  // — Documents —
  'registration.document.npwp': 'Sertifikat NPWP',
  'registration.document.nib': 'Izin Usaha NIB',
  'registration.document.halal': 'Sertifikat Halal (jika berlaku)',
  'registration.document.iso': 'Sertifikat ISO 9001 (jika berlaku)',

  // — Step: Bank account details —
  'registration.step.bank.eyebrow': 'Pembayaran',
  'registration.step.bank.title': 'Detail rekening bank',
  'registration.step.bank.description': 'Digunakan oleh Paragon Finance untuk menyelesaikan faktur.',
  'registration.step.bank.field.bankName.label': 'Nama bank',
  'registration.step.bank.field.bankName.placeholder': '— Pilih bank —',
  'registration.step.bank.field.accountNumber.label': 'Nomor rekening',
  'registration.step.bank.field.accountHolder.label': 'Nama pemilik rekening',
  'registration.step.bank.field.accountHolder.placeholder': 'PT Maju Bersama',
  'registration.option.other': 'Lainnya',

  // — Step: KOL bank details —
  'registration.step.kolBank.title': 'Detail bank',
  'registration.step.kolBank.short': 'Bank',
  'registration.step.kolBank.description':
    'Faktur KOL diproses via Web Tukar Faktur. Tidak memerlukan pendaftaran Ariba.',
  'registration.step.kolBank.field.accountNumber.placeholder': 'mis. 1234567890',
  'registration.step.kolBank.field.accountHolder.placeholder': 'Sesuai catatan bank',
  'registration.kolBank.noticeLabel': 'Vendor KOL:',
  'registration.kolBank.noticeText':
    'Dibuat langsung di S/4HANA di tingkat DC. Tidak memerlukan kualifikasi Ariba.',

  // — Step: Internal SR category expansion —
  'registration.step.expansion.eyebrow': 'Perluasan',
  'registration.step.expansion.title': 'Perluasan kategori',
  'registration.step.expansion.short': 'Perluasan',
  'registration.step.expansion.description':
    'Pilih kategori atau komoditas baru untuk vendor yang sudah ada ini.',
  'registration.step.expansion.field.categories.label': 'Kategori pasokan tambahan',
  'registration.step.expansion.field.s4Vendor.label': 'Nomor vendor S/4HANA yang ada',
  'registration.step.expansion.field.s4Vendor.placeholder': 'mis. 1000456',
  'registration.step.expansion.field.reason.label': 'Alasan perluasan kategori',
  'registration.step.expansion.field.reason.placeholder':
    'Jelaskan mengapa vendor ini diperluas ke kategori baru…',

  // — Step: Review & submit —
  'registration.step.review.title': 'Tinjau & kirim',
  'registration.step.review.short': 'Tinjauan',
  'registration.review.notice':
    'Harap tinjau semua informasi di bawah sebelum mengirim. Kembali untuk melakukan perubahan.',
  'registration.review.stepEyebrow': 'Langkah {{number}}',
  'registration.review.field.legalName': 'Nama resmi',
  'registration.review.field.npwp': 'NPWP',
  'registration.review.field.nib': 'NIB',
  'registration.review.field.country': 'Negara',
  'registration.review.field.province': 'Provinsi',
  'registration.review.field.city': 'Kota',
  'registration.review.field.address': 'Alamat',
  'registration.review.field.website': 'Situs web',
  'registration.review.field.name': 'Nama',
  'registration.review.field.role': 'Peran',
  'registration.review.field.email': 'Email',
  'registration.review.field.whatsapp': 'WhatsApp',
  'registration.review.field.phone': 'Telepon',
  'registration.review.field.supplyCategories': 'Kategori pasokan',
  'registration.review.field.channel': 'Kanal pilihan',
  'registration.review.field.bank': 'Bank',
  'registration.review.field.accountNumber': 'Nomor rekening',
  'registration.review.field.accountHolder': 'Pemilik rekening',
  'registration.review.field.s4Vendor': 'Vendor S/4HANA',
  'registration.review.field.additionalCategories': 'Kategori tambahan',
  'registration.review.field.reason': 'Alasan',
  'registration.review.notUploaded': 'Belum diunggah',
  'registration.review.expires': 'kedaluwarsa {{date}}',
  'registration.review.agreements.eyebrow': 'Perjanjian',
  'registration.review.agreements.title': 'Syarat & konfirmasi',
  'registration.review.agreement1.text':
    'Saya menyetujui <coc>Kode Etik Pemasok</coc> dan <terms>Syarat & Ketentuan</terms> Paragon.',
  'registration.review.agreement2':
    'Saya mengonfirmasi bahwa semua informasi yang diberikan akurat dan lengkap. Saya memahami bahwa memberikan informasi palsu dapat mengakibatkan penolakan.',

  // — Success screen —
  'registration.success.title': 'Pendaftaran terkirim',
  'registration.success.subtitle': 'Aplikasi Anda telah diterima dan sedang ditinjau.',
  'registration.success.appNumberLabel': 'Nomor aplikasi',
  'registration.success.nextTitle': 'Apa yang terjadi selanjutnya?',
  'registration.success.next.1': 'Tim pengadaan kami akan meninjau aplikasi Anda dalam 3–5 hari kerja.',
  'registration.success.next.2': 'Anda akan menerima email di alamat terdaftar Anda dengan hasilnya.',
  'registration.success.next.3':
    'Jika disetujui, Anda akan menerima instruksi onboarding dan kredensial akses portal.',
  'registration.success.next.4':
    'Untuk pertanyaan mendesak, hubungi supplier-support@paragon.id dengan menyebutkan nomor aplikasi Anda.',
  'registration.success.questions':
    'Ada pertanyaan? Email <email>supplier-support@paragon.id</email> dengan nomor aplikasi Anda.',

  // — Wizard chrome —
  'registration.changeType': 'Ubah jenis pendaftaran',
  'registration.submit': 'Kirim pendaftaran',

  // — Validation messages —
  'registration.validation.legalName.required': 'Nama resmi perusahaan wajib diisi',
  'registration.validation.npwp.required': 'NPWP wajib diisi',
  'registration.validation.city.required': 'Kota wajib diisi',
  'registration.validation.address.required': 'Alamat wajib diisi',
  'registration.validation.province.required': 'Provinsi wajib diisi untuk Indonesia',
  'registration.validation.name.required': 'Nama wajib diisi',
  'registration.validation.email.required': 'Email wajib diisi',
  'registration.validation.email.invalid': 'Format email tidak valid',
  'registration.validation.whatsapp.required': 'Nomor WhatsApp wajib diisi',
  'registration.validation.bankName.required': 'Nama bank wajib diisi',
  'registration.validation.accountNumber.required': 'Nomor rekening wajib diisi',
  'registration.validation.accountHolder.required': 'Nama pemilik rekening wajib diisi',
  'registration.validation.agreed1.required': 'Anda harus menyetujui Syarat & Ketentuan',
  'registration.validation.agreed2.required': 'Anda harus mengonfirmasi keakuratan informasi',
  'registration.validation.category.required': 'Pilih setidaknya satu kategori pasokan',
  'registration.validation.s4Vendor.required': 'Nomor vendor S/4HANA wajib diisi',
};
