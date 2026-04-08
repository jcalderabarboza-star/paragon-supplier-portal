import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  id: string; supplier: string; lastMsg: string; time: string;
  unread: number; status: 'active' | 'awaiting' | 'resolved';
}

interface ChatMessage {
  id: string; from: 'bot' | 'supplier'; content: string;
  time: string; isBot?: boolean;
}

interface AutomationRule {
  rule: string; trigger: string; action: string; autoHandle: boolean;
  escalateIf: string; successRate: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const CONVERSATIONS: Conversation[] = [
  { id:'wa-001', supplier:'PT Berlina Packaging 🇮🇩', lastMsg:'Siap, PO-2025-00107 kami konfirmasi dalam perjalanan...', time:'2 min ago', unread:0, status:'active' },
  { id:'wa-002', supplier:'Zhejiang NHU Vitamins 🇨🇳', lastMsg:'库存更新：烟酰胺B3 2,400 KG...', time:'18 min ago', unread:0, status:'active' },
  { id:'wa-003', supplier:'PT Halal Emulsifier 🇮🇩', lastMsg:'Mohon konfirmasi waktu pengiriman...', time:'1 hr ago', unread:2, status:'awaiting' },
  { id:'wa-004', supplier:'PT Musim Mas Specialty 🇮🇩', lastMsg:'ASN sudah dikirim untuk PO-00115', time:'2 hr ago', unread:0, status:'resolved' },
  { id:'wa-005', supplier:'PT Ecogreen Oleochemicals 🇮🇩', lastMsg:'Stok Centella Asiatica: 850 KG tersedia', time:'3 hr ago', unread:0, status:'active' },
  { id:'wa-006', supplier:'Givaudan Fragrance SG 🇸🇬', lastMsg:'RFQ-2026-004 quotation submitted...', time:'5 hr ago', unread:1, status:'awaiting' },
];

const BERLINA_THREAD: ChatMessage[] = [
  { id:'1', from:'bot', content:'Selamat pagi! 👋 Purchase Order *PO-2025-00107* telah diterbitkan.\n📦 Material: PET Bottle 100ml Airless Pump\n📊 Qty: 50,000 PCS\n💰 Nilai: Rp 185,000,000\n📅 Tanggal pengiriman: 8 April 2026\n📍 Tujuan: NDC Jatake 6\n\nMohon konfirmasi dengan membalas:\n✅ *KONFIRMASI* — untuk menerima PO\n❌ *TOLAK* — untuk menolak\n✏️ *UBAH* — untuk meminta perubahan', time:'09:00', isBot:true },
  { id:'2', from:'supplier', content:'KONFIRMASI', time:'09:03' },
  { id:'3', from:'bot', content:'✅ *PO Dikonfirmasi!*\nPO-2025-00107 telah dikonfirmasi pukul 09:03.\nSAP telah diperbarui secara otomatis.\nSistem kami akan mengirim pengingat ASN 3 hari sebelum tanggal pengiriman. 🙏', time:'09:03', isBot:true },
  { id:'4', from:'supplier', content:'Terima kasih. Apakah bisa kirim dokumen PO lengkap?', time:'09:05' },
  { id:'5', from:'bot', content:'Tentu! Berikut dokumen PO lengkap: 📄\n[PO-2025-00107.pdf]\nFile telah dikirim. Ada pertanyaan lain?', time:'09:05', isBot:true },
  { id:'6', from:'supplier', content:'Halo, kami sudah siap kirim barang besok. Bagaimana cara submit ASN?', time:'14:30' },
  { id:'7', from:'bot', content:'Untuk submit ASN, balas dengan format:\n*ASN [nomor PO] [tanggal kirim] [carrier] [no resi]*\n\nContoh:\nASN PO-2025-00107 2026-04-07 JNE JNE20260012345\n\nAtau klik link portal: [LINK PORTAL ASN]', time:'14:30', isBot:true },
  { id:'8', from:'supplier', content:'ASN PO-2025-00107 2026-04-07 JNE JNE20260012345', time:'14:35' },
  { id:'9', from:'bot', content:'✅ *ASN Diterima!*\nASN-2026-001 telah dibuat secara otomatis.\n🚚 Carrier: JNE\n📋 No Resi: JNE20260012345\n📅 Estimasi tiba: 8 April 2026\n\nTim NDC Jatake 6 telah diberitahu.\n*Slot dock:* Dock 1 — 09:00 WIB\nMohon tiba 15 menit lebih awal. 🙏', time:'14:35', isBot:true },
  { id:'10', from:'supplier', content:'Oke siap! Terima kasih banyak 🙏', time:'14:37' },
  { id:'11', from:'bot', content:'Sama-sama! Selamat pengiriman 🚚\nJika ada kendala di jalan, balas chat ini kapan saja.', time:'14:37', isBot:true },
  { id:'12', from:'bot', content:'📦 *Pengingat Pengiriman*\nPesanan PO-2025-00107 dijadwalkan tiba hari ini.\nSlot dock: Dock 1 — 09:00 WIB NDC Jatake 6\nTim kami siap menerima. ✅', time:'08:00', isBot:true },
  { id:'13', from:'supplier', content:'Siap, PO-2025-00107 kami konfirmasi dalam perjalanan, ETA 08:45', time:'08:05' },
];

const OTHER_THREADS: Record<string, ChatMessage[]> = {
  'wa-002': [
    { id:'1', from:'bot', content:'您好！📊 *库存更新请求*\n烟酰胺B3 (MAT-10234)\n当前库存: 24天\n\n请回复: STOK MAT-10234 [数量] KG', time:'17:00', isBot:true },
    { id:'2', from:'supplier', content:'STOK MAT-10234 2400 KG', time:'17:15' },
    { id:'3', from:'bot', content:'✅ 库存已更新\n烟酰胺B3: 2,400 KG (24天)\nIBP已自动更新 🙏', time:'17:15', isBot:true },
    { id:'4', from:'supplier', content:'库存更新：烟酰胺B3 2,400 KG 已确认', time:'17:18' },
  ],
  'wa-003': [
    { id:'1', from:'bot', content:'Halo! 🚚 PO-2025-00112 delivery dalam 3 hari.\nMohon submit ASN.\nFormat: ASN PO-00112 [tgl] [carrier] [resi]', time:'09:00', isBot:true },
    { id:'2', from:'supplier', content:'Mohon konfirmasi waktu pengiriman yang bisa diterima', time:'10:30' },
  ],
  'wa-004': [
    { id:'1', from:'bot', content:'📦 PO-2025-00115 diterbitkan.\nPalm Kernel Oil RBD 5,000 KG\nDelivery: 8 April 2026', time:'08:00', isBot:true },
    { id:'2', from:'supplier', content:'KONFIRMASI', time:'08:05' },
    { id:'3', from:'bot', content:'✅ Dikonfirmasi! SAP diperbarui.', time:'08:05', isBot:true },
    { id:'4', from:'supplier', content:'ASN sudah dikirim untuk PO-00115', time:'10:00' },
    { id:'5', from:'bot', content:'✅ ASN-2026-006 dibuat. Dock 2 — 13:00 WIB. 🙏', time:'10:00', isBot:true },
  ],
  'wa-005': [
    { id:'1', from:'bot', content:'Halo! Stok Centella Asiatica di sistem kami: 18 hari.\nMohon update: STOK MAT-10067 [qty] KG', time:'13:00', isBot:true },
    { id:'2', from:'supplier', content:'Stok Centella Asiatica: 850 KG tersedia', time:'14:00' },
    { id:'3', from:'bot', content:'✅ Stok diperbarui: 850 KG. IBP diperbarui otomatis.', time:'14:00', isBot:true },
  ],
  'wa-006': [
    { id:'1', from:'bot', content:'Hello! RFQ-2026-004 for Fragrance Compounds FG-2847.\nDeadline: 10 April 2026.\nReply: QUOTE RFQ-2026-004 [price/KG] [lead time days]', time:'09:00', isBot:true },
    { id:'2', from:'supplier', content:'RFQ-2026-004 quotation submitted: SGD 285/KG, 21 days lead time', time:'11:00' },
    { id:'3', from:'bot', content:'✅ Quote received. Reference: QT-2026-0892. Evaluation in progress. 🙏', time:'11:00', isBot:true },
  ],
};

const AUTOMATION_RULES: AutomationRule[] = [
  { rule:'PO Confirmation', trigger:'New PO created in SAP', action:'Send WhatsApp notification + collect confirmation', autoHandle:true, escalateIf:'Supplier rejects or requests >5% price change', successRate:'94%' },
  { rule:'ASN Collection', trigger:'PO confirmed + 5 days before delivery', action:'Request ASN via WhatsApp, parse reply, create ASN in portal', autoHandle:true, escalateIf:'No response within 24 hours', successRate:'87%' },
  { rule:'Inventory Update Request', trigger:'Material DOS drops below 21 days', action:'WhatsApp supplier requesting stock position update', autoHandle:true, escalateIf:'Supplier reports stock <14 days', successRate:'91%' },
  { rule:'Delivery Reminder', trigger:'3 days before requested delivery date', action:'Send reminder with dock slot details', autoHandle:true, escalateIf:'Never — always automated', successRate:'99%' },
  { rule:'Invoice Reminder', trigger:'30 days after GR with no invoice', action:'Remind supplier to submit invoice via portal or WhatsApp', autoHandle:true, escalateIf:'No response within 7 days', successRate:'82%' },
  { rule:'Halal Cert Expiry Alert', trigger:'90 days before certificate expiry', action:'Alert supplier to initiate renewal + share renewal guide', autoHandle:true, escalateIf:'30 days before expiry with no action', successRate:'78%' },
  { rule:'Dispute Resolution', trigger:'3-way match fails >5%', action:'Notify supplier of discrepancy with details', autoHandle:false, escalateIf:'Always escalates to AP team', successRate:'N/A' },
  { rule:'New Supplier Welcome', trigger:'SAP BP created for new supplier', action:'Send welcome message + portal registration link + quick guide', autoHandle:true, escalateIf:'Never — always automated', successRate:'96%' },
];

// ─── Chart data ───────────────────────────────────────────────────────────────
const DAILY_MSGS = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 26 > 31 ? i - 5 : i + 26} Mar`,
  outbound: 8 + Math.floor(Math.sin(i) * 6 + Math.random() * 8),
  inbound:  6 + Math.floor(Math.cos(i) * 4 + Math.random() * 6),
}));
// fix deterministic-looking data
const OUT = [12,18,15,9,21,16,8,14,11,19,22,13,17,10];
const IN  = [9,14,12,7,16,12,6,11,9,14,18,10,13,8];
DAILY_MSGS.forEach((d, i) => { d.outbound = OUT[i]; d.inbound = IN[i]; });

const RULE_RATES = [
  { rule:'PO Confirm', rate:94, color:'#107E3E' },
  { rule:'ASN Collect', rate:87, color:'#107E3E' },
  { rule:'Inventory Upd', rate:91, color:'#107E3E' },
  { rule:'Delivery Rem', rate:99, color:'#107E3E' },
  { rule:'Invoice Rem', rate:82, color:'#F59E0B' },
  { rule:'Halal Alert', rate:78, color:'#F59E0B' },
];

const RESPONSE_TABLE = [
  { supplier:'PT Berlina 🇮🇩', avg:'3 min', fastest:'45 sec', slowest:'18 min', automation:'92%' },
  { supplier:'PT Musim Mas 🇮🇩', avg:'5 min', fastest:'1 min', slowest:'32 min', automation:'88%' },
  { supplier:'PT Halal Emulsifier 🇮🇩', avg:'8 min', fastest:'2 min', slowest:'45 min', automation:'85%' },
  { supplier:'PT Ecogreen 🇮🇩', avg:'12 min', fastest:'4 min', slowest:'1.2 hr', automation:'79%' },
  { supplier:'Givaudan SG 🇸🇬', avg:'22 min', fastest:'8 min', slowest:'3.5 hr', automation:'45%' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatMsg = (text: string) => {
  // Bold *text* → <strong>
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith('*') && p.endsWith('*')
      ? <strong key={i}>{p.slice(1, -1)}</strong>
      : <span key={i}>{p}</span>
  );
};

const STATUS_DOT: Record<string, string> = {
  active: '#25D366', awaiting: '#F59E0B', resolved: '#94A3B8',
};

// ─── Conversation List Item ───────────────────────────────────────────────────
const ConvItem: React.FC<{
  conv: Conversation; selected: boolean; onClick: () => void;
}> = ({ conv, selected, onClick }) => (
  <div onClick={onClick} style={{
    padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #F0F4F8',
    background: selected ? 'rgba(0,151,167,0.08)' : 'transparent',
    borderLeft: selected ? '3px solid #0097A7' : '3px solid transparent',
    transition: 'background 0.1s',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[conv.status], flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0D1B2A' }}>{conv.supplier}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{conv.time}</span>
        {conv.unread > 0 && (
          <span style={{ background: '#BB0000', color: '#fff', borderRadius: 9999, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
            {conv.unread}
          </span>
        )}
      </div>
    </div>
    <div style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: 16 }}>
      {conv.lastMsg}
    </div>
  </div>
);

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
const Bubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isBot = msg.from === 'bot';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isBot ? 'flex-start' : 'flex-end', marginBottom: 8,
    }}>
      {isBot && <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 4, marginBottom: 2 }}>🤖 Paragon AI</span>}
      <div style={{
        maxWidth: '78%', background: isBot ? '#FFFFFF' : '#DCF8C6',
        borderRadius: isBot ? '0 12px 12px 12px' : '12px 0 12px 12px',
        padding: '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontSize: 13, color: '#0D1B2A', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {formatMsg(msg.content)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>{msg.time}</span>
          {!isBot && <span style={{ fontSize: 11, color: '#53BDEB' }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
};

// ─── Chat Thread ──────────────────────────────────────────────────────────────
const ChatThread: React.FC<{ conv: Conversation; messages: ChatMessage[] }> = ({ conv, messages }) => {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const botActions = ['Send PO Reminder','Request ASN','Request Inventory Update','Send Payment Notification'];
  const [showBotMenu, setShowBotMenu] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, zIndex: 9999, borderLeft: '3px solid #25D366' }}>{toast}</div>
      )}

      {/* Thread header */}
      <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {conv.supplier.slice(-2)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{conv.supplier}</div>
          <div style={{ fontSize: 11, color: '#B2DFDB' }}>+62 812 XXXX XXXX · 🟢 Online</div>
        </div>
        <span style={{ fontSize: 11, color: '#B2DFDB', background: 'rgba(255,255,255,0.1)', borderRadius: 9999, padding: '3px 10px' }}>via 360dialog</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#ECE5DD', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        <div style={{ background: 'rgba(0,151,167,0.1)', border: '1px solid rgba(0,151,167,0.2)', borderRadius: 8, padding: '10px 14px', marginTop: 8, fontSize: 12, color: '#0D1B2A', lineHeight: 1.5 }}>
          ℹ️ This conversation was handled <strong>100% automatically</strong> by Paragon's WhatsApp AI. No human intervention required. All SAP updates completed in real-time.
        </div>
      </div>

      {/* Action bar */}
      <div style={{ background: '#F0F0F0', padding: '10px 14px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: 'none', fontSize: 13, background: '#fff', outline: 'none', color: '#94A3B8' }} value="Type a message..." readOnly />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowBotMenu(m => !m)}
            style={{ padding: '7px 14px', borderRadius: 20, background: '#25D366', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🤖 Bot Message ▾
          </button>
          {showBotMenu && (
            <div style={{ position: 'absolute', bottom: '110%', right: 0, background: '#fff', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 200, zIndex: 100 }}>
              {botActions.map(a => (
                <div key={a} onClick={() => { showToast(`Bot message sent to ${conv.supplier} via WhatsApp`); setShowBotMenu(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, color: '#0D1B2A', borderBottom: '1px solid #F0F4F8' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Tab 1 — Active Conversations ────────────────────────────────────────────
const ConversationsTab: React.FC = () => {
  const [selected, setSelected] = useState<Conversation>(CONVERSATIONS[0]);
  const getThread = (id: string) => id === 'wa-001' ? BERLINA_THREAD : (OTHER_THREADS[id] ?? []);

  return (
    <div style={{ display: 'flex', height: '72vh', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
      {/* Left — conversation list */}
      <div style={{ width: '35%', borderRight: '1px solid #E2E8F0', overflowY: 'auto', background: '#FAFAFA' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', background: '#fff' }}>
          <input style={{ width: '100%', padding: '6px 10px', borderRadius: 20, border: '1px solid #E2E8F0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} placeholder="🔍 Search suppliers..." />
        </div>
        {CONVERSATIONS.map(conv => (
          <ConvItem key={conv.id} conv={conv} selected={selected.id === conv.id} onClick={() => setSelected(conv)} />
        ))}
      </div>
      {/* Right — thread */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ChatThread conv={selected} messages={getThread(selected.id)} />
      </div>
    </div>
  );
};

// ─── Tab 2 — Automation Rules ─────────────────────────────────────────────────
const AutomationTab: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(AUTOMATION_RULES.map(r => [r.rule, r.autoHandle]))
  );
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const rateColor = (r: string) => {
    if (r === 'N/A') return '#94A3B8';
    const n = parseInt(r);
    return n >= 85 ? '#107E3E' : n >= 70 ? '#F59E0B' : '#BB0000';
  };
  const rateBg = (r: string) => {
    if (r === 'N/A') return '#F1F5F9';
    const n = parseInt(r);
    return n >= 85 ? '#DCFCE7' : n >= 70 ? '#FEF3C7' : '#FEE2E2';
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, zIndex: 9999, borderLeft: '3px solid #25D366' }}>{toast}</div>
      )}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A' }}>WhatsApp Automation Rules</div>
        <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Configure what Paragon AI handles automatically vs. escalates to humans</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {AUTOMATION_RULES.map(rule => (
          <div key={rule.rule} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A' }}>{rule.rule}</div>
                <span style={{ background: rateBg(rule.successRate), color: rateColor(rule.successRate), borderRadius: 9999, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{rule.successRate}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: '#0D1B2A' }}>Trigger: </span>{rule.trigger}
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: '#0D1B2A' }}>Action: </span>{rule.action}
              </div>
              <div style={{ background: '#FEF3C7', borderRadius: 4, padding: '5px 10px', fontSize: 11, color: '#92400E', display: 'inline-block' }}>
                ⚡ Escalate if: {rule.escalateIf}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div onClick={() => setToggles(t => ({ ...t, [rule.rule]: !t[rule.rule] }))}
                style={{ width: 52, height: 28, borderRadius: 14, background: toggles[rule.rule] ? '#25D366' : '#E2E8F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 4, left: toggles[rule.rule] ? 28 : 4, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: toggles[rule.rule] ? '#25D366' : '#94A3B8' }}>
                {toggles[rule.rule] ? '🤖 Auto' : '👤 Manual'}
              </span>
              <button onClick={() => showToast('Rule editor coming in Phase 2A')}
                style={{ padding: '4px 12px', borderRadius: 4, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 12, cursor: 'pointer', color: '#64748B' }}>
                Edit Rule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Tab 3 — Analytics ────────────────────────────────────────────────────────
const AnalyticsTab: React.FC = () => (
  <div>
    <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B2A', marginBottom: 16 }}>WhatsApp Channel Performance</div>

    {/* KPI tiles */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
      {[
        ['Messages Sent (Month)','247','#0097A7'],
        ['Automated Actions','183 (74%)','#107E3E'],
        ['Avg Response Time','4.2 min','#0A6ED1'],
        ['Supplier Satisfaction','4.6/5.0 ⭐','#E9730C'],
      ].map(([l,v,c]) => (
        <div key={l} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${c}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: c as string }}>{v}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{l}</div>
        </div>
      ))}
    </div>

    {/* Charts */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Daily Message Volume (Last 14 Days)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={DAILY_MSGS} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="outbound" name="Outbound" fill="#0097A7" radius={[2,2,0,0]} />
            <Bar dataKey="inbound" name="Inbound" fill="#0D1B2A" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Automation Success Rate by Rule</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={RULE_RATES} layout="vertical" barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
            <XAxis type="number" domain={[0,100]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis type="category" dataKey="rule" width={120} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`]} />
            <Bar dataKey="rate" radius={[0,4,4,0]}>
              {RULE_RATES.map((r, i) => <Cell key={i} fill={r.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Response time table */}
    <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Supplier Response Times</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#F0F4F8' }}>
          {['Supplier','Avg Response','Fastest','Slowest','Automation Rate'].map(h => (
            <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748B' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {RESPONSE_TABLE.map(r => (
            <tr key={r.supplier} style={{ borderBottom: '1px solid #E2E8F0' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.supplier}</td>
              <td style={{ padding: '10px 12px', color: '#0D1B2A', fontWeight: 600 }}>{r.avg}</td>
              <td style={{ padding: '10px 12px', color: '#107E3E' }}>{r.fastest}</td>
              <td style={{ padding: '10px 12px', color: '#E9730C' }}>{r.slowest}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ background: parseInt(r.automation) >= 80 ? '#DCFCE7' : '#FEF3C7', color: parseInt(r.automation) >= 80 ? '#107E3E' : '#E9730C', borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{r.automation}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const WhatsAppHub: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [pulse, setPulse] = useState(true);
  useEffect(() => { const t = setInterval(() => setPulse(p => !p), 1200); return () => clearInterval(t); }, []);

  const tabs = ['💬 Active Conversations','🤖 Automation Rules','📊 Channel Analytics'];
  const kpis = [
    { label:'Active Conversations', value:'6', color:'#0097A7' },
    { label:'Pending Responses', value:'3', color:'#E9730C' },
    { label:'Automated Today', value:'18', color:'#107E3E' },
    { label:'Avg Response Time', value:'4 min', color:'#0A6ED1' },
  ];

  return (
    <div style={{ padding: '24px 28px', background: '#F0F4F8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0D1B2A' }}>WhatsApp Procurement Hub</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>All supplier WhatsApp conversations — powered by 360dialog + Paragon AI</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 14px', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#25D366', opacity: pulse ? 1 : 0.3, transition: 'opacity 0.6s' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#107E3E' }}>CONNECTED — 360dialog Business API</span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${k.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(0,151,167,0.1)', border: '1px solid rgba(0,151,167,0.25)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#0D1B2A', lineHeight: 1.6 }}>
        💡 <strong>Paragon's WhatsApp procurement bot</strong> handles PO confirmations, ASN submissions, inventory updates, and delivery notifications automatically. Human intervention only required for disputes, deviations &gt;5%, or halal compliance issues.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: 20 }}>
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: '9px 18px', border: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === i ? 600 : 400, color: tab === i ? '#0097A7' : '#64748B',
            background: 'none', borderBottom: `2px solid ${tab === i ? '#0097A7' : 'transparent'}`, marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && <ConversationsTab />}
      {tab === 1 && <AutomationTab />}
      {tab === 2 && <AnalyticsTab />}
    </div>
  );
};

export default WhatsAppHub;
