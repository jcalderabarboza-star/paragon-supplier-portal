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
  // ⚠️ COUNTRY NAMES ARE DISPLAY COPY; THE `<option value>` IS NOT (S2b).
  // `form.country === 'Indonesia'` gates whether the province field renders, so
  // the STORED value stays canonical EN and only these labels localize — the
  // same value/label split `BANKS` already ships a few lines below, and the
  // contract every central label map in this tree states in its own header.
  // Four of the six are identical in both arms (endonyms that do not change);
  // that is deliberate, and the guard asserts the ID arm holds its own row for
  // each rather than inferring it from output no fallback could be told apart from.
  'registration.country.indonesia': 'Indonesia',
  'registration.country.malaysia': 'Malaysia',
  'registration.country.singapore': 'Singapore',
  'registration.country.thailand': 'Thailand',
  'registration.country.vietnam': 'Vietnam',
  'registration.country.philippines': 'Philippines',
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

  // — End of the walkthrough —
  //
  // ⚠️ **NINE KEYS BECAME THREE, AND THE ONE THAT SURVIVED IS THE ONE THAT WAS
  // TRUE.** D-CENSUS-8 had already retracted a 3–5 business-day review promise
  // here and replaced it with `next.1` — an honest sentence, placed FIRST in a
  // numbered list whose items 2, 3 and 4 promised an email, onboarding
  // credentials and a support line to quote an application number at, under a
  // green tick, beside a randomly generated `APP-2026-…`.
  //
  // ⚠️ **THAT IS WHY A HONEST SENTENCE ADDED TO FALSE ONES IS NOT A FIX.** The
  // reader is not summing the claims; they are reading the heading and the
  // tick. `title`, `subtitle`, `appNumberLabel`, `nextTitle`, `next.1`–`next.4`
  // and `questions` are all deleted. `next.1`'s content is now the heading —
  // reworded from what did NOT happen into what this page IS, because a page
  // that only denies is still a page you have to read to the end to trust.
  //
  // `registration.success.next.2` and `.next.3` were
  // `FORWARD-PROMISE-HAS-NO-HANDLER-01` under EVERY option, not just this one:
  // approving an application mints nothing and sends nothing (B4 parked,
  // C10 §1). Nothing in this platform can send that email.
  'registration.success.headline':
    'That is the end of the walkthrough — nothing was submitted.',
  'registration.success.body':
    'This page shows what Paragon’s supplier registration asks for. What you entered was not recorded, no application exists, and nobody has been notified. Real applications are raised inside the portal by a Paragon buyer.',
  'registration.success.restart': 'Start again',

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
  // Singapore → Singapura and Philippines → Filipina are the two that actually
  // change; the other four are the same word in Bahasa Indonesia.
  'registration.country.indonesia': 'Indonesia',
  'registration.country.malaysia': 'Malaysia',
  'registration.country.singapore': 'Singapura',
  'registration.country.thailand': 'Thailand',
  'registration.country.vietnam': 'Vietnam',
  'registration.country.philippines': 'Filipina',
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

  // — Akhir panduan —
  'registration.success.headline':
    'Panduan ini selesai — tidak ada yang dikirim.',
  'registration.success.body':
    'Halaman ini memperlihatkan apa yang ditanyakan pendaftaran pemasok Paragon. Apa yang Anda isi tidak dicatat, tidak ada aplikasi yang terbentuk, dan tidak ada seorang pun yang diberi tahu. Aplikasi yang sebenarnya diajukan di dalam portal oleh pembeli Paragon.',
  'registration.success.restart': 'Mulai lagi',

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
};
