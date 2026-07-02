// ────────────────────────────────────────────────────────────────────────────
// Buyer WhatsApp Hub fixtures.
//
// Relocated from src/pages-v2/BuyerWhatsAppHub.tsx in Phase 1B Batch 2.
// Buyer-side messaging-bus snapshots — conversations, threads, automation
// rules, daily message volume, and response analytics. Not per-supplier-id
// scoped in the leak sense (the conversations span multiple suppliers).
// ────────────────────────────────────────────────────────────────────────────

import type {
  Conversation,
  ChatMessage,
  AutomationRule,
  DailyMessageRow,
  RuleRate,
  ResponseRow,
  EngagementSummary,
} from '../../types';

// Transitional re-exports — the entity types now live in the data contract
// (types.ts). Kept here only until BuyerWhatsAppHub repoints its imports; drop
// once the page migration lands.
export type {
  Conversation,
  ChatMessage,
  AutomationRule,
  RuleRate,
} from '../../types';

export const CONVERSATIONS: Conversation[] = [
  { id: 'wa-001', supplier: 'PT Berlina Packaging 🇮🇩', lastMsg: 'Siap, PO-2025-00107 kami konfirmasi dalam perjalanan...', time: '2 min ago', unread: 0, status: 'active' },
  { id: 'wa-002', supplier: 'Zhejiang NHU Vitamins 🇨🇳', lastMsg: '库存更新：烟酰胺B3 2,400 KG...', time: '18 min ago', unread: 0, status: 'active' },
  { id: 'wa-003', supplier: 'PT Halal Emulsifier 🇮🇩', lastMsg: 'Mohon konfirmasi waktu pengiriman...', time: '1 hr ago', unread: 2, status: 'awaiting' },
  { id: 'wa-004', supplier: 'PT Musim Mas Specialty 🇮🇩', lastMsg: 'ASN sudah dikirim untuk PO-00115', time: '2 hr ago', unread: 0, status: 'resolved' },
  { id: 'wa-005', supplier: 'PT Ecogreen Oleochemicals 🇮🇩', lastMsg: 'Stok Centella Asiatica: 850 KG tersedia', time: '3 hr ago', unread: 0, status: 'active' },
  { id: 'wa-006', supplier: 'Givaudan Fragrance SG 🇸🇬', lastMsg: 'RFQ-2026-004 quotation submitted...', time: '5 hr ago', unread: 1, status: 'awaiting' },
];

export const BERLINA_THREAD: ChatMessage[] = [
  { id: '1', from: 'bot', content: 'Selamat pagi! 👋 Purchase Order *PO-2025-00107* telah diterbitkan.\n📦 Material: PET Bottle 100ml Airless Pump\n📊 Qty: 50,000 PCS\n💰 Nilai: Rp 185,000,000\n📅 Tanggal pengiriman: 8 April 2026\n📍 Tujuan: NDC Jatake 6\n\nMohon konfirmasi dengan membalas:\n✅ *KONFIRMASI* — untuk menerima PO\n❌ *TOLAK* — untuk menolak\n✏️ *UBAH* — untuk meminta perubahan', time: '09:00' },
  { id: '2', from: 'supplier', content: 'KONFIRMASI', time: '09:03' },
  { id: '3', from: 'bot', content: '✅ *PO Dikonfirmasi!*\nPO-2025-00107 telah dikonfirmasi pukul 09:03.\nSAP telah diperbarui secara otomatis.\nSistem kami akan mengirim pengingat ASN 3 hari sebelum tanggal pengiriman. 🙏', time: '09:03' },
  { id: '4', from: 'supplier', content: 'Terima kasih. Apakah bisa kirim dokumen PO lengkap?', time: '09:05' },
  { id: '5', from: 'bot', content: 'Tentu! Berikut dokumen PO lengkap: 📄\n[PO-2025-00107.pdf]\nFile telah dikirim. Ada pertanyaan lain?', time: '09:05' },
  { id: '6', from: 'supplier', content: 'Halo, kami sudah siap kirim barang besok. Bagaimana cara submit ASN?', time: '14:30' },
  { id: '7', from: 'bot', content: 'Untuk submit ASN, balas dengan format:\n*ASN [nomor PO] [tanggal kirim] [carrier] [no resi]*\n\nContoh:\nASN PO-2025-00107 2026-04-07 JNE JNE20260012345\n\nAtau klik link portal: [LINK PORTAL ASN]', time: '14:30' },
  { id: '8', from: 'supplier', content: 'ASN PO-2025-00107 2026-04-07 JNE JNE20260012345', time: '14:35' },
  { id: '9', from: 'bot', content: '✅ *ASN Diterima!*\nASN-2026-001 telah dibuat secara otomatis.\n🚚 Carrier: JNE\n📋 No Resi: JNE20260012345\n📅 Estimasi tiba: 8 April 2026\n\nTim NDC Jatake 6 telah diberitahu.\n*Slot dock:* Dock 1 — 09:00 WIB\nMohon tiba 15 menit lebih awal. 🙏', time: '14:35' },
  { id: '10', from: 'supplier', content: 'Oke siap! Terima kasih banyak 🙏', time: '14:37' },
  { id: '11', from: 'bot', content: 'Sama-sama! Selamat pengiriman 🚚\nJika ada kendala di jalan, balas chat ini kapan saja.', time: '14:37' },
  { id: '12', from: 'bot', content: '📦 *Pengingat Pengiriman*\nPesanan PO-2025-00107 dijadwalkan tiba hari ini.\nSlot dock: Dock 1 — 09:00 WIB NDC Jatake 6\nTim kami siap menerima. ✅', time: '08:00' },
  { id: '13', from: 'supplier', content: 'Siap, PO-2025-00107 kami konfirmasi dalam perjalanan, ETA 08:45', time: '08:05' },
];

export const OTHER_THREADS: Record<string, ChatMessage[]> = {
  'wa-002': [
    { id: '1', from: 'bot', content: '您好！📊 *库存更新请求*\n烟酰胺B3 (MAT-10234)\n当前库存: 24天\n\n请回复: STOK MAT-10234 [数量] KG', time: '17:00' },
    { id: '2', from: 'supplier', content: 'STOK MAT-10234 2400 KG', time: '17:15' },
    { id: '3', from: 'bot', content: '✅ 库存已更新\n烟酰胺B3: 2,400 KG (24天)\nIBP已自动更新 🙏', time: '17:15' },
    { id: '4', from: 'supplier', content: '库存更新：烟酰胺B3 2,400 KG 已确认', time: '17:18' },
  ],
  'wa-003': [
    { id: '1', from: 'bot', content: 'Halo! 🚚 PO-2025-00112 delivery dalam 3 hari.\nMohon submit ASN.\nFormat: ASN PO-00112 [tgl] [carrier] [resi]', time: '09:00' },
    { id: '2', from: 'supplier', content: 'Mohon konfirmasi waktu pengiriman yang bisa diterima', time: '10:30' },
  ],
  'wa-004': [
    { id: '1', from: 'bot', content: '📦 PO-2025-00115 diterbitkan.\nPalm Kernel Oil RBD 5,000 KG\nDelivery: 8 April 2026', time: '08:00' },
    { id: '2', from: 'supplier', content: 'KONFIRMASI', time: '08:05' },
    { id: '3', from: 'bot', content: '✅ Dikonfirmasi! SAP diperbarui.', time: '08:05' },
    { id: '4', from: 'supplier', content: 'ASN sudah dikirim untuk PO-00115', time: '10:00' },
    { id: '5', from: 'bot', content: '✅ ASN-2026-006 dibuat. Dock 2 — 13:00 WIB. 🙏', time: '10:00' },
  ],
  'wa-005': [
    { id: '1', from: 'bot', content: 'Halo! Stok Centella Asiatica di sistem kami: 18 hari.\nMohon update: STOK MAT-10067 [qty] KG', time: '13:00' },
    { id: '2', from: 'supplier', content: 'Stok Centella Asiatica: 850 KG tersedia', time: '14:00' },
    { id: '3', from: 'bot', content: '✅ Stok diperbarui: 850 KG. IBP diperbarui otomatis.', time: '14:00' },
  ],
  'wa-006': [
    { id: '1', from: 'bot', content: 'Hello! RFQ-2026-004 for Fragrance Compounds FG-2847.\nDeadline: 10 April 2026.\nReply: QUOTE RFQ-2026-004 [price/KG] [lead time days]', time: '09:00' },
    { id: '2', from: 'supplier', content: 'RFQ-2026-004 quotation submitted: SGD 285/KG, 21 days lead time', time: '11:00' },
    { id: '3', from: 'bot', content: '✅ Quote received. Reference: QT-2026-0892. Evaluation in progress. 🙏', time: '11:00' },
  ],
};

export const AUTOMATION_RULES: AutomationRule[] = [
  { rule: 'PO Confirmation', trigger: 'New PO created in SAP', action: 'Send WhatsApp notification + collect confirmation', autoHandle: true, escalateIf: 'Supplier rejects or requests >5% price change', successRate: '94%' },
  { rule: 'ASN Collection', trigger: 'PO confirmed + 5 days before delivery', action: 'Request ASN via WhatsApp, parse reply, create ASN in portal', autoHandle: true, escalateIf: 'No response within 24 hours', successRate: '87%' },
  { rule: 'Inventory Update Request', trigger: 'Material DOS drops below 21 days', action: 'WhatsApp supplier requesting stock position update', autoHandle: true, escalateIf: 'Supplier reports stock <14 days', successRate: '91%' },
  { rule: 'Delivery Reminder', trigger: '3 days before requested delivery date', action: 'Send reminder with dock slot details', autoHandle: true, escalateIf: 'Never — always automated', successRate: '99%' },
  { rule: 'Invoice Reminder', trigger: '30 days after GR with no invoice', action: 'Remind supplier to submit invoice via portal or WhatsApp', autoHandle: true, escalateIf: 'No response within 7 days', successRate: '82%' },
  { rule: 'Halal Cert Expiry Alert', trigger: '90 days before certificate expiry', action: 'Alert supplier to initiate renewal + share renewal guide', autoHandle: true, escalateIf: '30 days before expiry with no action', successRate: '78%' },
  { rule: 'Dispute Resolution', trigger: '3-way match fails >5%', action: 'Notify supplier of discrepancy with details', autoHandle: false, escalateIf: 'Always escalates to AP team', successRate: 'N/A' },
  { rule: 'New Supplier Welcome', trigger: 'SAP BP created for new supplier', action: 'Send welcome message + portal registration link + quick guide', autoHandle: true, escalateIf: 'Never — always automated', successRate: '96%' },
];

const OUTBOUND = [12, 18, 15, 9, 21, 16, 8, 14, 11, 19, 22, 13, 17, 10];
const INBOUND = [9, 14, 12, 7, 16, 12, 6, 11, 9, 14, 18, 10, 13, 8];

export const DAILY_MSGS: DailyMessageRow[] = OUTBOUND.map((v, i) => ({
  day: `${i + 26 > 31 ? i - 5 : i + 26} Mar`,
  outbound: v,
  inbound: INBOUND[i],
}));

export const RULE_RATES: RuleRate[] = [
  { rule: 'PO Confirm', rate: 94 },
  { rule: 'ASN Collect', rate: 87 },
  { rule: 'Inventory Upd', rate: 91 },
  { rule: 'Delivery Rem', rate: 99 },
  { rule: 'Invoice Rem', rate: 82 },
  { rule: 'Halal Alert', rate: 78 },
];

export const RESPONSE_TABLE: ResponseRow[] = [
  { supplier: 'PT Berlina 🇮🇩', avg: '3 min', fastest: '45 sec', slowest: '18 min', automation: '92%' },
  { supplier: 'PT Musim Mas 🇮🇩', avg: '5 min', fastest: '1 min', slowest: '32 min', automation: '88%' },
  { supplier: 'PT Halal Emulsifier 🇮🇩', avg: '8 min', fastest: '2 min', slowest: '45 min', automation: '85%' },
  { supplier: 'PT Ecogreen 🇮🇩', avg: '12 min', fastest: '4 min', slowest: '1.2 hr', automation: '79%' },
  { supplier: 'Givaudan SG 🇸🇬', avg: '22 min', fastest: '8 min', slowest: '3.5 hr', automation: '45%' },
];

// Channel KPI cards — relocated from the inline JSX in BuyerWhatsAppHub. The
// first four feed the WhatsApp hub header; the last four feed the Channel
// Analytics tab.
export const ENGAGEMENT_SUMMARY: EngagementSummary = {
  activeConversations: { value: '6', subtitle: 'Across supplier network', tone: 'neutral' },
  pendingResponses: { value: '3', subtitle: 'Awaiting supplier reply', tone: 'warning' },
  automatedToday: { value: '18', subtitle: 'No human intervention', tone: 'success' },
  hubAvgResponse: { value: '4 min', subtitle: 'End-to-end channel response', tone: 'neutral' },
  messagesThisMonth: { value: '247', subtitle: 'Across 6 active suppliers', tone: 'neutral' },
  automatedActions: { value: '183', subtitle: '74% automated', tone: 'success' },
  analyticsAvgResponse: { value: '4.2 min', subtitle: 'End-to-end channel response', tone: 'neutral' },
  satisfaction: { value: '4.6/5.0', subtitle: 'Channel NPS proxy', tone: 'neutral' },
};
