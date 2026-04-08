// Country intelligence profiles — drives ALL adaptive behaviour
export const COUNTRY_PROFILES = {
  ID: {
    name: 'Indonesia', flag: '🇮🇩', language: 'id', languageLabel: 'Bahasa Indonesia',
    primaryChannel: 'whatsapp', fallbackChannel: 'email',
    timezone: 'Asia/Jakarta', currency: 'IDR',
    businessHours: { start: '08:00', end: '17:00' },
    tone: 'conversational', dateFormat: 'DD/MM/YYYY',
    complianceFrameworks: ['BPOM', 'BPJPH', 'SNI'],
    taxLabel: 'PPN', taxRate: 11,
    withholdingTax: { label: 'PPh 23', rate: 2 },
    invoiceFields: ['NPWP', 'NIB', 'Faktur Pajak Number'],
    poGreeting: 'Dengan hormat',
    culturalNotes: 'Relationship-first culture. Use formal Bahasa for first contact, conversational after relationship established. Avoid sending messages during prayer times (Friday 11:30-13:00).',
    whatsappAvailable: true, wechatAvailable: false, ediPreferred: false,
  },
  MY: {
    name: 'Malaysia', flag: '🇲🇾', language: 'ms', languageLabel: 'Bahasa Malaysia / English',
    primaryChannel: 'whatsapp', fallbackChannel: 'email',
    timezone: 'Asia/Kuala_Lumpur', currency: 'MYR',
    businessHours: { start: '09:00', end: '18:00' },
    tone: 'formal', dateFormat: 'DD/MM/YYYY',
    complianceFrameworks: ['JAKIM', 'MeSTI', 'NPBD'],
    taxLabel: 'SST', taxRate: 6, withholdingTax: null,
    invoiceFields: ['SST Registration', 'Company Registration No.'],
    poGreeting: 'Dear',
    culturalNotes: 'Bilingual market — English widely used in B2B. JAKIM halal certification is the gold standard. Avoid contact during Eid and public holidays.',
    whatsappAvailable: true, wechatAvailable: false, ediPreferred: false,
  },
  CN: {
    name: 'China', flag: '🇨🇳', language: 'zh', languageLabel: 'Mandarin (简体中文)',
    primaryChannel: 'wechat', fallbackChannel: 'email',
    timezone: 'Asia/Shanghai', currency: 'CNY',
    businessHours: { start: '09:00', end: '18:00' },
    tone: 'formal', dateFormat: 'YYYY/MM/DD',
    complianceFrameworks: ['CIQ', 'NMPA', 'GB Standards'],
    taxLabel: 'VAT', taxRate: 13, withholdingTax: null,
    invoiceFields: ['Unified Social Credit Code', 'VAT Registration'],
    poGreeting: '尊敬的',
    culturalNotes: 'Use WeChat Work (WeCom) for B2B. Very formal written communication expected. Precise technical specifications required. Allow extra lead time around Chinese New Year (Jan-Feb). Golden Week (Oct 1-7).',
    whatsappAvailable: false, wechatAvailable: true, ediPreferred: true,
  },
  DE: {
    name: 'Germany', flag: '🇩🇪', language: 'de', languageLabel: 'German / English',
    primaryChannel: 'edi', fallbackChannel: 'email',
    timezone: 'Europe/Berlin', currency: 'EUR',
    businessHours: { start: '08:00', end: '17:00' },
    tone: 'formal', dateFormat: 'DD.MM.YYYY',
    complianceFrameworks: ['REACH', 'EU Cosmetics Regulation', 'ISO 9001', 'GMP'],
    taxLabel: 'MwSt', taxRate: 19, withholdingTax: null,
    invoiceFields: ['Steuernummer', 'USt-IdNr', 'IBAN', 'BIC/SWIFT'],
    poGreeting: 'Sehr geehrte Damen und Herren',
    culturalNotes: 'Highly formal and documentation-heavy. Full technical specifications and safety data sheets (SDS) expected with every shipment. Punctuality is critical — late deliveries damage relationships severely.',
    whatsappAvailable: false, wechatAvailable: false, ediPreferred: true,
  },
  FR: {
    name: 'France', flag: '🇫🇷', language: 'fr', languageLabel: 'French / English',
    primaryChannel: 'email', fallbackChannel: 'api',
    timezone: 'Europe/Paris', currency: 'EUR',
    businessHours: { start: '09:00', end: '17:30' },
    tone: 'formal', dateFormat: 'DD/MM/YYYY',
    complianceFrameworks: ['REACH', 'EU Cosmetics Regulation', 'IFRA'],
    taxLabel: 'TVA', taxRate: 20, withholdingTax: null,
    invoiceFields: ['SIRET', 'TVA Number', 'IBAN', 'BIC'],
    poGreeting: 'Madame, Monsieur',
    culturalNotes: 'Relationship-oriented despite formal tone. French suppliers may prefer French language even if English proficiency is high. Avoid August (vacation month). Fragrance compliance (IFRA standards) critical.',
    whatsappAvailable: false, wechatAvailable: false, ediPreferred: false,
  },
  SG: {
    name: 'Singapore', flag: '🇸🇬', language: 'en', languageLabel: 'English',
    primaryChannel: 'email', fallbackChannel: 'api',
    timezone: 'Asia/Singapore', currency: 'SGD',
    businessHours: { start: '09:00', end: '18:00' },
    tone: 'formal', dateFormat: 'DD/MM/YYYY',
    complianceFrameworks: ['HSA', 'AVA', 'Singapore Standards'],
    taxLabel: 'GST', taxRate: 9, withholdingTax: null,
    invoiceFields: ['UEN', 'GST Registration No.'],
    poGreeting: 'Dear',
    culturalNotes: 'Highly efficient and tech-savvy. API and digital channels preferred. English is the business language. FTZ advantages relevant for re-export to SEA markets.',
    whatsappAvailable: true, wechatAvailable: false, ediPreferred: false,
  },
  SA: {
    name: 'Saudi Arabia', flag: '🇸🇦', language: 'ar', languageLabel: 'Arabic / English',
    primaryChannel: 'whatsapp', fallbackChannel: 'email',
    timezone: 'Asia/Riyadh', currency: 'SAR',
    businessHours: { start: '08:00', end: '17:00' },
    tone: 'formal', dateFormat: 'DD/MM/YYYY',
    complianceFrameworks: ['SFDA', 'SASO', 'GCC Halal', 'Saudi Standards'],
    taxLabel: 'VAT', taxRate: 15, withholdingTax: null,
    invoiceFields: ['VAT Registration No.', 'CR Number', 'IBAN'],
    poGreeting: 'عزيزي',
    culturalNotes: 'Arabic RTL interface required for suppliers. Halal certification is mandatory and non-negotiable. Working week is Sunday-Thursday. Avoid contact during Ramadan daytime and major Islamic holidays.',
    whatsappAvailable: true, wechatAvailable: false, ediPreferred: false,
    rtl: true,
  },
  IN: {
    name: 'India', flag: '🇮🇳', language: 'en', languageLabel: 'English / Hindi',
    primaryChannel: 'whatsapp', fallbackChannel: 'email',
    timezone: 'Asia/Kolkata', currency: 'INR',
    businessHours: { start: '10:00', end: '19:00' },
    tone: 'formal', dateFormat: 'DD/MM/YYYY',
    complianceFrameworks: ['CDSCO', 'BIS', 'FSSAI'],
    taxLabel: 'GST', taxRate: 18, withholdingTax: null,
    invoiceFields: ['GSTIN', 'PAN', 'HSN Code'],
    poGreeting: 'Dear',
    culturalNotes: 'WhatsApp is the dominant B2B channel across all company sizes. English universally used in business. India has a large halal cosmetics manufacturing base. Follow up promptly — high communication frequency expected.',
    whatsappAvailable: true, wechatAvailable: false, ediPreferred: false,
  },
  US: {
    name: 'United States', flag: '🇺🇸', language: 'en', languageLabel: 'English',
    primaryChannel: 'email', fallbackChannel: 'edi',
    timezone: 'America/New_York', currency: 'USD',
    businessHours: { start: '09:00', end: '17:00' },
    tone: 'formal', dateFormat: 'MM/DD/YYYY',
    complianceFrameworks: ['FDA', 'USP', 'EPA', 'cGMP'],
    taxLabel: 'Tax', taxRate: 0, withholdingTax: null,
    invoiceFields: ['EIN/TIN', 'W-9', 'DUNS Number'],
    poGreeting: 'Dear',
    culturalNotes: 'Process and SLA driven. Written agreements and clear scope are essential. EDI X12 widely used. FDA compliance documentation (CoA, SDS) expected with every shipment.',
    whatsappAvailable: false, wechatAvailable: false, ediPreferred: true,
  },
  JP: {
    name: 'Japan', flag: '🇯🇵', language: 'ja', languageLabel: 'Japanese',
    primaryChannel: 'email', fallbackChannel: 'edi',
    timezone: 'Asia/Tokyo', currency: 'JPY',
    businessHours: { start: '09:00', end: '18:00' },
    tone: 'formal', dateFormat: 'YYYY/MM/DD',
    complianceFrameworks: ['PMDA', 'JCIA', 'JIS Standards'],
    taxLabel: 'Consumption Tax', taxRate: 10, withholdingTax: null,
    invoiceFields: ['Corporate Number', 'Qualified Invoice Number (T-number)'],
    poGreeting: '拝啓',
    culturalNotes: 'Extreme precision and formality expected. Zero tolerance for quality deviations. Documentation must be perfect. Relationship development takes time. Avoid Golden Week (late April-early May) and Obon (August).',
    whatsappAvailable: false, wechatAvailable: false, ediPreferred: true,
  },
  BR: {
    name: 'Brazil', flag: '🇧🇷', language: 'pt', languageLabel: 'Portuguese',
    primaryChannel: 'whatsapp', fallbackChannel: 'email',
    timezone: 'America/Sao_Paulo', currency: 'BRL',
    businessHours: { start: '09:00', end: '18:00' },
    tone: 'conversational', dateFormat: 'DD/MM/YYYY',
    complianceFrameworks: ['ANVISA', 'INMETRO', 'ABNT'],
    taxLabel: 'ICMS/IPI', taxRate: 12, withholdingTax: null,
    invoiceFields: ['CNPJ', 'Nota Fiscal Number'],
    poGreeting: 'Prezado(a)',
    culturalNotes: 'WhatsApp is the primary B2B communication tool across all company sizes in Brazil. Relationship and trust are key before transactions begin. Portuguese required — English proficiency varies widely.',
    whatsappAvailable: true, wechatAvailable: false, ediPreferred: false,
  },
} as const;

export type CountryCode = keyof typeof COUNTRY_PROFILES;

// Channel definitions
export const CHANNEL_CONFIG = {
  whatsapp: { label: 'WhatsApp',    icon: '📱', color: '#25D366', description: 'Real-time messaging, interactive buttons, document sharing' },
  wechat:   { label: 'WeChat Work', icon: '💬', color: '#07C160', description: 'WeCom for Chinese business suppliers, formal B2B messaging' },
  email:    { label: 'Email',       icon: '📧', color: '#EA4335', description: 'Structured email with reply parsing, DKIM/DMARC secured' },
  api:      { label: 'REST API',    icon: '⚙️', color: '#0A6ED1', description: 'System-to-system, OAuth 2.0, CloudEvents webhooks' },
  edi:      { label: 'EDI',         icon: '🔗', color: '#5B21B6', description: 'X12 / EDIFACT via AS2/SFTP through Cleo Integration Cloud' },
  portal:   { label: 'Web Portal',  icon: '🌐', color: '#354A5F', description: 'Browser-based portal, PWA mobile support' },
} as const;

// Multilingual PO notification templates
export const MESSAGE_TEMPLATES = {
  po_notification: {
    id: (supplier: string, poNum: string, amount: string) =>
      `Halo ${supplier}! 👋 Purchase Order ${poNum} senilai ${amount} telah diterbitkan oleh Paragon Corp. Mohon konfirmasi penerimaan dalam 24 jam. Klik link untuk detail: [LINK]`,
    en: (supplier: string, poNum: string, amount: string) =>
      `Dear ${supplier}, Purchase Order ${poNum} for ${amount} has been issued by Paragon Corp. Please confirm receipt within 24 hours. View details: [LINK]`,
    zh: (supplier: string, poNum: string, amount: string) =>
      `尊敬的${supplier}，Paragon Corp已发出采购订单${poNum}，金额为${amount}。请在24小时内确认收到。查看详情：[LINK]`,
    de: (supplier: string, poNum: string, amount: string) =>
      `Sehr geehrte Damen und Herren von ${supplier}, die Bestellung ${poNum} über ${amount} wurde von Paragon Corp ausgestellt. Bitte bestätigen Sie den Eingang innerhalb von 24 Stunden. Details: [LINK]`,
    ar: (supplier: string, poNum: string, amount: string) =>
      `عزيزي ${supplier}، تم إصدار أمر الشراء ${poNum} بقيمة ${amount} من Paragon Corp. يرجى تأكيد الاستلام خلال 24 ساعة. [LINK]`,
    fr: (supplier: string, poNum: string, amount: string) =>
      `Madame, Monsieur de ${supplier}, le bon de commande ${poNum} d'un montant de ${amount} a été émis par Paragon Corp. Merci de confirmer réception dans les 24 heures. Détails: [LINK]`,
    pt: (supplier: string, poNum: string, amount: string) =>
      `Prezado(a) ${supplier}, o Pedido de Compra ${poNum} no valor de ${amount} foi emitido pela Paragon Corp. Por favor, confirme o recebimento em 24 horas. Detalhes: [LINK]`,
    ja: (supplier: string, poNum: string, amount: string) =>
      `拝啓 ${supplier} 様、Paragon Corpより発注書${poNum}（金額：${amount}）を発行いたしました。24時間以内にご確認をお願いいたします。詳細：[LINK]`,
    ms: (supplier: string, poNum: string, amount: string) =>
      `Salam ${supplier}, Pesanan Pembelian ${poNum} berjumlah ${amount} telah dikeluarkan oleh Paragon Corp. Sila sahkan penerimaan dalam masa 24 jam. Pautan: [LINK]`,
  },
  asn_reminder: {
    id: (supplier: string, poNum: string, dueDate: string) =>
      `Halo ${supplier}! Pengiriman untuk PO ${poNum} seharusnya tiba ${dueDate}. Mohon kirimkan Advance Ship Notice (ASN) sebelum pengiriman. Terima kasih! 🙏`,
    en: (supplier: string, poNum: string, dueDate: string) =>
      `Dear ${supplier}, delivery for PO ${poNum} is due ${dueDate}. Please submit your Advance Ship Notice (ASN) prior to dispatch. Thank you.`,
    zh: (supplier: string, poNum: string, dueDate: string) =>
      `尊敬的${supplier}，采购订单${poNum}的交货日期为${dueDate}。请在发货前提交预先发货通知(ASN)。谢谢。`,
    de: (supplier: string, poNum: string, dueDate: string) =>
      `Sehr geehrte Damen und Herren, die Lieferung für Bestellung ${poNum} ist für ${dueDate} geplant. Bitte übermitteln Sie die Lieferankündigung (ASN) vor dem Versand.`,
    ar: (supplier: string, poNum: string, dueDate: string) =>
      `عزيزي ${supplier}، موعد تسليم الطلب ${poNum} هو ${dueDate}. يرجى إرسال إشعار الشحن المسبق قبل الإرسال.`,
    fr: (supplier: string, poNum: string, dueDate: string) =>
      `Madame, Monsieur de ${supplier}, la livraison pour la commande ${poNum} est prévue le ${dueDate}. Merci de soumettre l'avis d'expédition avancé (ASN) avant l'envoi.`,
    pt: (supplier: string, poNum: string, dueDate: string) =>
      `Prezado(a) ${supplier}, a entrega do Pedido ${poNum} está prevista para ${dueDate}. Por favor, envie o Aviso de Envio Antecipado (ASN) antes da expedição.`,
    ja: (supplier: string, poNum: string, dueDate: string) =>
      `${supplier}様、発注書${poNum}の納期は${dueDate}です。出荷前に事前出荷通知(ASN)の提出をお願いいたします。`,
    ms: (supplier: string, poNum: string, dueDate: string) =>
      `Salam ${supplier}, penghantaran untuk PO ${poNum} dijadualkan pada ${dueDate}. Sila hantar Notis Penghantaran Awal (ASN) sebelum penghantaran.`,
  },
} as const;
