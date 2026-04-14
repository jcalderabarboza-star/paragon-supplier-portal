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
  active: '#107E3E', awaiting: '#F59E0B', resolved: '#94A3B8',
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
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, zIndex: 9999, borderLeft: '3px solid #107E3E' }}>{toast}</div>
      )}

      {/* Thread header */}
      <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#107E3E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
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
            style={{ padding: '7px 14px', borderRadius: 20, background: '#107E3E', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
        <div style={{ position: 'fixed', bottom: 80, right: 24, background: '#0D1B2A', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, zIndex: 9999, borderLeft: '3px solid #107E3E' }}>{toast}</div>
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
              <div style={{ background: '#FEF3C7', borderRadius: 4, padding: '5px 10px', fontSize: 11, color: '#E9730C', display: 'inline-block' }}>
                ⚡ Escalate if: {rule.escalateIf}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div onClick={() => setToggles(t => ({ ...t, [rule.rule]: !t[rule.rule] }))}
                style={{ width: 52, height: 28, borderRadius: 14, background: toggles[rule.rule] ? '#107E3E' : '#E2E8F0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 4, left: toggles[rule.rule] ? 28 : 4, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: toggles[rule.rule] ? '#107E3E' : '#94A3B8' }}>
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
        ['Avg Response Time','4.2 min','#0097A7'],
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

// ─── Buyer WeChat Hub ─────────────────────────────────────────────────────────
const WECHAT_GREEN = '#07C160';

const WECHAT_CONVS = [
  { id:'wc-001', supplier:'Zhejiang NHU Vitamins 🇨🇳', lastMsg:'库存更新：烟酰胺B3 2,400 KG 已确认', time:'18 min ago', status:'confirmed' },
  { id:'wc-002', supplier:'Anhui Salicylics & Niacinamide 🇨🇳', lastMsg:'BPJPH申请材料已提交 / BPJPH docs submitted', time:'2 hr ago', status:'pending' },
  { id:'wc-003', supplier:'Shanghai Berlina Packaging 🇨🇳', lastMsg:'报价单 RFQ-2026-004 已提交 / Quote submitted', time:'1 day ago', status:'confirmed' },
];

const WECHAT_THREAD = [
  { id:'1', from:'bot' as const, cn:'您好！📊 库存更新请求', en:'Stock Update Request', sub:'烟酰胺B3 (MAT-10234) · Current: 24 days\nReply: STOCK MAT-10234 [qty] KG', time:'17:00' },
  { id:'2', from:'supplier' as const, cn:'STOK MAT-10234 2400 KG', en:'', sub:'', time:'17:15' },
  { id:'3', from:'bot' as const, cn:'✅ 库存已更新', en:'Stock Updated', sub:'烟酰胺B3: 2,400 KG (24 days)\nIBP auto-synced · IBP已自动同步 🙏', time:'17:15' },
  { id:'4', from:'supplier' as const, cn:'库存更新：烟酰胺B3 2,400 KG 已确认', en:'Confirmed', sub:'', time:'17:18' },
];

const BuyerWeChatHub: React.FC = () => {
  const [selected, setSelected] = useState('wc-001');
  const NAVY = '#0D1B2A'; const BORDER = '#E2E8F0'; const MUTED = '#64748B';
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(null), 3000); };

  const STATUS_COLOR: Record<string, string> = {
    confirmed: '#107E3E', pending: '#E9730C',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {toast && <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:NAVY, color:'white', padding:'12px 20px', borderRadius:8, zIndex:600, fontSize:13, borderLeft:`3px solid ${WECHAT_GREEN}` }}>{toast}</div>}
      <div>
        <div style={{ fontSize:20, fontWeight:700, color:NAVY, marginBottom:4 }}>WeChat Hub</div>
        <div style={{ fontSize:13, color:MUTED }}>Chinese supplier communications · Bilingual CN/EN · Official Account</div>
      </div>

      {/* Note banner */}
      <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:8, padding:'10px 16px', fontSize:12, color:'#166534' }}>
        <strong>WeChat channel</strong> targets Chinese suppliers — packaging components, active ingredients, fragrance compounds. Messages delivered via WeChat Official Account with bilingual CN/EN content.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'35% 65%', gap:16, alignItems:'flex-start' }}>

        {/* Conversation list */}
        <div style={{ background:'white', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', background:'#F8FAFC', borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:600, color:MUTED, textTransform:'uppercase', letterSpacing:'0.8px' }}>
            Conversations ({WECHAT_CONVS.length})
          </div>
          {WECHAT_CONVS.map(conv => (
            <div key={conv.id} onClick={() => setSelected(conv.id)}
              style={{ padding:'12px 14px', borderBottom:`1px solid ${BORDER}`, cursor:'pointer', borderLeft: selected === conv.id ? `3px solid ${WECHAT_GREEN}` : '3px solid transparent', background: selected === conv.id ? '#F0FDF4' : 'white' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY }}>{conv.supplier}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:MUTED, whiteSpace:'nowrap' }}>{conv.time}</span>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:STATUS_COLOR[conv.status], flexShrink:0 }} />
                </div>
              </div>
              <div style={{ fontSize:11, color:'#354A5F', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{conv.lastMsg}</div>
            </div>
          ))}
        </div>

        {/* Chat panel */}
        <div style={{ background:'white', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden' }}>
          {/* WeChat header */}
          <div style={{ background:WECHAT_GREEN, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:WECHAT_GREEN }}>P</div>
            <div>
              <div style={{ color:'white', fontWeight:700, fontSize:13 }}>Paragon Corp Official Account</div>
              <div style={{ color:'rgba(255,255,255,0.8)', fontSize:10 }}>企业公众号 · Zhejiang NHU Vitamins</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ background:'#EDEDED', padding:16, minHeight:280, display:'flex', flexDirection:'column', gap:10 }}>
            {WECHAT_THREAD.map(msg => (
              <div key={msg.id} style={{ display:'flex', flexDirection: msg.from === 'supplier' ? 'row-reverse' : 'row', gap:8, alignItems:'flex-start' }}>
                {msg.from === 'bot' && (
                  <div style={{ width:30, height:30, borderRadius:6, background:WECHAT_GREEN, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>P</div>
                )}
                <div style={{ background: msg.from === 'supplier' ? WECHAT_GREEN : 'white', borderRadius: msg.from === 'supplier' ? '10px 0 10px 10px' : '0 10px 10px 10px', padding:'8px 12px', maxWidth:'72%', fontSize:11, color: msg.from === 'supplier' ? 'white' : '#1A1A1A', lineHeight:1.6 }}>
                  {msg.cn && <div style={{ fontWeight:700 }}>{msg.cn}</div>}
                  {msg.en && <div style={{ color: msg.from === 'supplier' ? 'rgba(255,255,255,0.85)' : '#0097A7', fontSize:10, marginTop:1 }}>{msg.en}</div>}
                  {msg.sub && <div style={{ marginTop:4, fontSize:10, color: msg.from === 'supplier' ? 'rgba(255,255,255,0.8)' : '#64748B', whiteSpace:'pre-line' }}>{msg.sub}</div>}
                  <div style={{ fontSize:9, color: msg.from === 'supplier' ? 'rgba(255,255,255,0.6)' : '#999', marginTop:4, textAlign:'right' }}>{msg.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div style={{ padding:'12px 16px', borderTop:`1px solid ${BORDER}`, display:'flex', gap:8 }}>
            <button onClick={() => showToast('Sending WeChat message to Zhejiang NHU Vitamins...')}
              style={{ background:WECHAT_GREEN, color:'white', border:'none', borderRadius:6, padding:'7px 16px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Send Message
            </button>
            <button onClick={() => showToast('Exporting WeChat conversation to SAP...')}
              style={{ background:'white', color:'#354A5F', border:`1px solid ${BORDER}`, borderRadius:6, padding:'7px 16px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Export to SAP
            </button>
          </div>

          {/* SAP note */}
          <div style={{ background:'#F0FDF4', borderTop:`1px solid #86EFAC`, padding:'10px 16px', fontSize:11, color:'#166534', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight:700 }}>SAP</span>
            <span>IBP inventory auto-updated from WeChat reply · MAT-10234 stock: 2,400 KG</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Buyer Email Hub ──────────────────────────────────────────────────────────
const BUYER_EMAILS = [
  { id:'em-001', supplier:'PT Berlina Packaging 🇮🇩', subject:'RE: PO-2025-00108 — Order Confirmed', time:'2 min ago', status:'confirmed', preview:'Konfirmasi PO-2025-00108 diterima. Pengiriman dijadwalkan 15 Apr 2026.' },
  { id:'em-002', supplier:'Zhejiang NHU Vitamins 🇨🇳', subject:'Invoice INV-2026-00234 Submitted', time:'1 hr ago', status:'pending', preview:'Please find attached invoice for PO-2025-00103. Amount: Rp 540,000,000.' },
  { id:'em-003', supplier:'Firmenich Malaysia Sdn. Bhd. 🇲🇾', subject:'ISO 9001 Certificate — Renewal Notice', time:'3 hr ago', status:'action', preview:'Our ISO 9001:2015 certificate expires 19 Jun 2026. Renewal in progress.' },
  { id:'em-004', supplier:'PT Musim Mas Specialty 🇮🇩', subject:'ASN Submitted — PO-2025-00115', time:'5 hr ago', status:'confirmed', preview:'ASN-2026-006 submitted. Carrier: Pos Logistik. ETA: 8 Apr 2026.' },
  { id:'em-005', supplier:'Evonik Specialty FR 🇫🇷', subject:'Quote Submitted — RFQ-2026-004', time:'1 day ago', status:'pending', preview:'Please find our quotation for RFQ-2026-004. Unit price: EUR 145/KG.' },
];

const EMAIL_STATUS_DOT: Record<string, string> = {
  confirmed: '#107E3E', pending: '#E9730C', action: '#BB0000',
};

const BERLINA_EMAIL = {
  from: 'procurement@berlina.co.id',
  to: 'procurement@paragoncorp.com',
  subject: 'RE: PO-2025-00108 — Order Confirmed',
  date: 'Mon, 14 Apr 2026, 09:03',
  body: [
    { type: 'text', content: 'Dear Paragon Procurement Team,' },
    { type: 'text', content: 'We confirm receipt and acceptance of PO-2025-00108. Details below:' },
    { type: 'table', rows: [
      ['PO Number', 'PO-2025-00108'],
      ['Material', 'PET Bottle 100ml — Natural Transparent'],
      ['Quantity', '50,000 PCS'],
      ['Unit Price', 'Rp 3,700 / PCS'],
      ['Total Value', 'Rp 185,000,000'],
      ['Delivery Date', '15 April 2026'],
      ['Ship To', 'Paragon DC — Cikande, Serang'],
    ]},
    { type: 'text', content: 'We will submit the ASN 3 days before the delivery date. Please confirm dock slot availability.' },
    { type: 'text', content: 'Best regards,\nPT Berlina Packaging Indonesia' },
  ],
  sapNote: 'SAP auto-updated — PO-2025-00108 confirmed at 09:03 · Order Confirmation Key updated',
};

const BuyerEmailHub: React.FC = () => {
  const [selected, setSelected] = useState('em-001');
  const TEAL = '#0097A7'; const NAVY = '#0D1B2A';
  const BORDER = '#E2E8F0'; const MUTED = '#64748B';
  const [toast, setToast] = useState<string|null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(null), 3000); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {toast && <div style={{ position:'fixed', bottom:'2rem', right:'2rem', background:NAVY, color:'white', padding:'12px 20px', borderRadius:8, zIndex:600, fontSize:13, borderLeft:`3px solid ${TEAL}` }}>{toast}</div>}
      <div>
        <div style={{ fontSize:20, fontWeight:700, color:NAVY, marginBottom:4 }}>Email Hub</div>
        <div style={{ fontSize:13, color:MUTED }}>Supplier email communications · Template-driven · Auto-parsed responses</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'35% 65%', gap:16, alignItems:'flex-start' }}>
        {/* Inbox list */}
        <div style={{ background:'white', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', background:'#F8FAFC', borderBottom:`1px solid ${BORDER}`, fontSize:11, fontWeight:600, color:MUTED, textTransform:'uppercase', letterSpacing:'0.8px' }}>Inbox ({BUYER_EMAILS.length})</div>
          {BUYER_EMAILS.map(em => (
            <div key={em.id} onClick={() => setSelected(em.id)}
              style={{ padding:'12px 14px', borderBottom:`1px solid ${BORDER}`, cursor:'pointer', borderLeft: selected === em.id ? `3px solid ${TEAL}` : '3px solid transparent', background: selected === em.id ? '#F0F9FF' : 'white' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                <div style={{ fontSize:12, fontWeight:700, color:NAVY }}>{em.supplier}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:MUTED, whiteSpace:'nowrap' }}>{em.time}</span>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:EMAIL_STATUS_DOT[em.status], flexShrink:0 }} />
                </div>
              </div>
              <div style={{ fontSize:11, fontWeight:600, color:'#354A5F', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{em.subject}</div>
              <div style={{ fontSize:10, color:MUTED, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{em.preview}</div>
            </div>
          ))}
        </div>
        {/* Email preview */}
        <div style={{ background:'white', border:`1px solid ${BORDER}`, borderRadius:8, overflow:'hidden' }}>
          {/* Paragon header */}
          <div style={{ background:NAVY, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ color:'white', fontWeight:700, fontSize:14, letterSpacing:'2px' }}>PARAGONCORP</span>
            <span style={{ color:'#8DA4BC', fontSize:11 }}>Supplier Portal · Odyssey Program</span>
          </div>
          {/* Email meta */}
          <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BORDER}`, background:'#F8FAFC' }}>
            {[['From', BERLINA_EMAIL.from],['To', BERLINA_EMAIL.to],['Subject', BERLINA_EMAIL.subject],['Date', BERLINA_EMAIL.date]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', gap:12, marginBottom:4, fontSize:12 }}>
                <span style={{ color:MUTED, width:52, flexShrink:0 }}>{k}</span>
                <span style={{ color:NAVY, fontWeight: k==='Subject' ? 600 : 400 }}>{v}</span>
              </div>
            ))}
          </div>
          {/* Email body */}
          <div style={{ padding:'20px' }}>
            {BERLINA_EMAIL.body.map((block, i) => {
              if (block.type === 'text') return <p key={i} style={{ fontSize:13, color:'#354A5F', marginBottom:12, lineHeight:1.6, whiteSpace:'pre-line' }}>{block.content as string}</p>;
              if (block.type === 'table') return (
                <table key={i} style={{ width:'100%', borderCollapse:'collapse', marginBottom:16, fontSize:12 }}>
                  <tbody>
                  {(block.rows as string[][]).map(([label, value]) => (
                    <tr key={label} style={{ borderBottom:`1px solid ${BORDER}` }}>
                      <td style={{ padding:'7px 12px', color:MUTED, width:'40%', background:'#F8FAFC' }}>{label}</td>
                      <td style={{ padding:'7px 12px', color:NAVY, fontWeight:500 }}>{value}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              );
              return null;
            })}
            {/* Action buttons */}
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              {[['Reply','#0097A7','white'],['Forward','white','#354A5F'],['Archive','white','#64748B']].map(([label,bg,color]) => (
                <button key={label} onClick={() => showToast(`${label} action — ${BERLINA_EMAIL.subject}`)}
                  style={{ padding:'7px 18px', border:`1px solid #E2E8F0`, borderRadius:6, background:bg, color:color, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* SAP note */}
          <div style={{ background:'#E0F7FA', borderTop:`1px solid #0097A744`, padding:'10px 20px', fontSize:11, color:'#006064', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight:700 }}>SAP</span>
            <span>{BERLINA_EMAIL.sapNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const WhatsAppHub: React.FC = () => {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'wechat'>('whatsapp');
  const [tab, setTab] = useState(0);
  const [pulse, setPulse] = useState(true);
  useEffect(() => { const t = setInterval(() => setPulse(p => !p), 1200); return () => clearInterval(t); }, []);

  const tabs = ['Active Conversations', 'Automation Rules', 'Channel Analytics'];
  const kpis = [
    { label:'Active Conversations', value:'6', color:'#0097A7' },
    { label:'Pending Responses', value:'3', color:'#E9730C' },
    { label:'Automated Today', value:'18', color:'#107E3E' },
    { label:'Avg Response Time', value:'4 min', color:'#0097A7' },
  ];

  return (
    <div style={{ padding: '24px 28px', background: '#F0F4F8', minHeight: '100vh' }}>
      {/* Channel tab switcher */}
      <div style={{ display:'flex', borderBottom:'2px solid #E2E8F0', marginBottom:'1.25rem' }}>
        {([
          { id:'whatsapp', label:'WhatsApp', color:'#25D366' },
          { id:'email',    label:'Email',    color:'#0097A7' },
          { id:'wechat',   label:'WeChat',   color:'#07C160' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setChannel(tab.id)}
            style={{ padding:'10px 24px', border:'none',
              borderBottom: channel === tab.id
                ? `2px solid ${tab.color}`
                : '2px solid transparent',
              background:'transparent',
              color: channel === tab.id ? tab.color : '#64748B',
              fontWeight: channel === tab.id ? 700 : 500,
              fontSize:13, cursor:'pointer',
              fontFamily:'inherit', marginBottom:-2 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {channel === 'whatsapp' && (
      <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0D1B2A' }}>WhatsApp Procurement Hub</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>All supplier WhatsApp conversations — powered by 360dialog + Paragon AI</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 14px', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#107E3E', opacity: pulse ? 1 : 0.3, transition: 'opacity 0.6s' }} />
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
      </>
      )}

      {channel === 'email' && <BuyerEmailHub />}
      {channel === 'wechat' && <BuyerWeChatHub />}
    </div>
  );
};

export default WhatsAppHub;
