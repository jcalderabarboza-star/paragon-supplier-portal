import React, { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ScenarioId = 'po' | 'asn' | 'inventory' | 'invoice';

interface SimMessage {
  id: string;
  from: 'bot' | 'supplier';
  content: string;
  time: string;
}

// ─── Scenario definitions ────────────────────────────────────────────────────
const SCENARIOS: Record<ScenarioId, {
  label: string;
  icon: string;
  initial: SimMessage[];
  quickReplies?: string[];
  inputDefault?: string;
  inputPlaceholder?: string;
}> = {
  po: {
    label: 'Confirm a PO', icon: '✓',
    initial: [{
      id: 'bot-init', from: 'bot',
      content: 'Selamat pagi! 👋\n*PO-2025-00108* diterbitkan:\n📦 PET Bottle 100ml — 50,000 PCS\n💰 Rp 185.000.000\n📅 Delivery: 15 Apr 2026\n\nBalas: KONFIRMASI / TOLAK / UBAH',
      time: '09:00',
    }],
    quickReplies: ['KONFIRMASI', 'TOLAK', 'UBAH'],
  },
  asn: {
    label: 'Submit ASN', icon: '→',
    initial: [{
      id: 'bot-init', from: 'bot',
      content: '🚚 *Pengingat ASN*\nPO-2025-00108 delivery dalam 3 hari.\nFormat ASN:\n*ASN [PO] [tgl kirim] [carrier] [resi]*\n\nContoh:\nASN PO-00108 2026-04-12 JNE JNE123456',
      time: '09:00',
    }],
    inputDefault: 'ASN PO-00108 2026-04-12 JNE JNE123456',
    inputPlaceholder: 'ASN PO-00108 2026-04-12 JNE JNE123456',
  },
  inventory: {
    label: 'Update Inventory', icon: '↑',
    initial: [{
      id: 'bot-init', from: 'bot',
      content: '📊 *Update Stok Diperlukan*\nStok Niacinamide B3 Anda di sistem kami: 24 hari.\nMohon update posisi stok terkini.\n\nFormat: *STOK [material code] [qty] [unit]*',
      time: '13:00',
    }],
    inputDefault: 'STOK MAT-10234 2400 KG',
    inputPlaceholder: 'STOK MAT-10234 2400 KG',
  },
  invoice: {
    label: 'Invoice Query', icon: '?',
    initial: [{
      id: 'bot-init', from: 'bot',
      content: '💰 *Status Invoice INV-2026-00234*\nStatus: ✅ Approved\nSAP Document: 5105000234\nEstimasi pembayaran: 5 Mei 2026\nBank: BCA ****4521\n\nAda pertanyaan? Balas chat ini.',
      time: '10:00',
    }],
    inputDefault: 'Kapan transfer dilakukan?',
    inputPlaceholder: 'Kapan transfer dilakukan?',
  },
};

// ─── Bot reply logic ──────────────────────────────────────────────────────────
const BOT_REPLIES: Record<ScenarioId, Record<string, string>> = {
  po: {
    'KONFIRMASI': '✅ *Dikonfirmasi!*\nPO-2025-00108 confirmed 09:03\nSAP updated automatically ✓\nASN reminder in 5 days 🙏',
    'TOLAK': 'Noted. Alasan penolakan?\n1️⃣ Stok tidak tersedia\n2️⃣ Harga tidak sesuai\n3️⃣ Kapasitas penuh\n4️⃣ Lainnya',
    'UBAH': 'Apa yang ingin diubah?\n📅 *TANGGAL* — ubah delivery date\n📊 *QTY* — ubah kuantitas\n💰 *HARGA* — diskusi harga',
    '1️⃣': 'Dipahami — stok tidak tersedia. Kami akan cari alternatif supplier. Tim akan menghubungi Anda untuk reschedule. 🙏',
    '2️⃣': 'Dipahami — harga tidak sesuai. Tim procurement akan menghubungi untuk negosiasi. 🙏',
    '3️⃣': 'Dipahami — kapasitas penuh. Kapan jadwal Anda tersedia? Balas dengan tanggal. 🙏',
    '4️⃣': 'Silakan jelaskan alasan penolakan Anda. Tim kami akan segera merespons. 🙏',
    'TANGGAL': 'Balas dengan tanggal baru:\nFormat: *DATE YYYY-MM-DD*\nContoh: DATE 2026-04-20',
    'QTY': 'Balas dengan kuantitas baru:\nFormat: *QTY [jumlah] [unit]*\nContoh: QTY 45000 PCS',
    'HARGA': 'Balas dengan harga usulan:\nFormat: *HARGA [amount] per [unit]*\nContoh: HARGA 3800 per PCS',
    'default': 'Terima kasih! Tim Paragon akan menindaklanjuti pesan Anda. 🙏',
  },
  asn: {
    'default': '✅ *ASN Diterima!*\nASN-2026-001 dibuat otomatis.\n🚚 Carrier: JNE\n📋 Resi: JNE123456\n📅 ETA: 12 Apr 2026\n\n*Slot dock:* Dock 1 — 09:00 WIB NDC Jatake 6\nMohon tiba 15 menit lebih awal. 🙏',
  },
  inventory: {
    'default': '✅ Stok diperbarui: 2,400 KG (24 hari).\nIBP diperbarui otomatis. 🙏',
  },
  invoice: {
    'default': 'Transfer dilakukan setiap Jumat.\nInvoice Anda dijadwalkan: Jumat 2 Mei 2026. 🙏',
  },
};

const FOLLOW_UP_REPLIES: Record<string, string[]> = {
  'TOLAK': ['1️⃣', '2️⃣', '3️⃣', '4️⃣'],
  'UBAH': ['TANGGAL', 'QTY', 'HARGA'],
};

const getTime = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// ─── Format bold *text* ───────────────────────────────────────────────────────
const FormatMsg: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*[^*]+\*)/g);
        return (
          <React.Fragment key={li}>
            {parts.map((p, pi) =>
              p.startsWith('*') && p.endsWith('*')
                ? <strong key={pi}>{p.slice(1, -1)}</strong>
                : <span key={pi}>{p}</span>
            )}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
};

// ─── Phone Chat Bubble ────────────────────────────────────────────────────────
const PhoneBubble: React.FC<{ msg: SimMessage; animateIn?: boolean }> = ({ msg, animateIn }) => {
  const isBot = msg.from === 'bot';
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isBot ? 'flex-start' : 'flex-end',
      marginBottom: 6,
      animation: animateIn ? 'fadeSlideIn 0.3s ease-out' : undefined,
    }}>
      <div style={{
        maxWidth: '82%',
        background: isBot ? '#FFFFFF' : '#DCF8C6',
        borderRadius: isBot ? '0 10px 10px 10px' : '10px 0 10px 10px',
        padding: '7px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
      }}>
        <div style={{ fontSize: 12, color: '#0D1B2A', lineHeight: 1.5 }}>
          <FormatMsg text={msg.content} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 3 }}>
          <span style={{ fontSize: 9, color: '#94A3B8' }}>{msg.time}</span>
          {!isBot && <span style={{ fontSize: 10, color: '#53BDEB' }}>✓✓</span>}
        </div>
      </div>
    </div>
  );
};

// ─── Phone Mockup ─────────────────────────────────────────────────────────────
const PhoneMockup: React.FC<{
  scenario: ScenarioId;
  messages: SimMessage[];
  onQuickReply: (text: string) => void;
  onSend: (text: string) => void;
  inputValue: string;
  setInputValue: (v: string) => void;
  quickReplies: string[];
  isTyping: boolean;
  newMsgIds: Set<string>;
}> = ({ scenario, messages, onQuickReply, onSend, inputValue, setInputValue, quickReplies, isTyping, newMsgIds }) => {
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const hasInput = SCENARIOS[scenario].inputDefault !== undefined;

  return (
    <div style={{ width: 300, margin: '0 auto', position: 'relative' }}>
      {/* CSS animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Phone outer frame */}
      <div style={{
        background: '#1A1A1A', borderRadius: 36, padding: '12px 8px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)',
      }}>
        {/* Notch */}
        <div style={{ width: 100, height: 20, background: '#1A1A1A', borderRadius: 10, margin: '0 auto 8px', position: 'relative', zIndex: 1 }} />

        {/* Screen */}
        <div style={{ borderRadius: 24, overflow: 'hidden', background: '#ECE5DD' }}>
          {/* WhatsApp header */}
          <div style={{ background: '#075E54', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#107E3E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0 }}>PC</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Paragon Corp ✅</div>
              <div style={{ fontSize: 9, color: '#B2DFDB' }}>Business Account</div>
            </div>
            <span style={{ fontSize: 16 }}>📞</span>
          </div>

          {/* Chat area */}
          <div ref={chatRef} style={{ height: 340, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column' }}>
            {messages.map(m => (
              <PhoneBubble key={m.id} msg={m} animateIn={newMsgIds.has(m.id)} />
            ))}
            {isTyping && (
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ background: '#fff', borderRadius: '0 10px 10px 10px', padding: '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#94A3B8', animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          {quickReplies.length > 0 && !isTyping && (
            <div style={{ background: '#F0F0F0', padding: '6px 8px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #E0E0E0' }}>
              {quickReplies.map(r => (
                <button key={r} onClick={() => onQuickReply(r)}
                  style={{ padding: '4px 10px', borderRadius: 14, border: '1px solid #107E3E', background: '#fff', color: '#075E54', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {r}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{ background: '#F0F0F0', padding: '6px 8px', display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid #E0E0E0' }}>
            {hasInput ? (
              <>
                <input value={inputValue} onChange={e => setInputValue(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 18, border: 'none', fontSize: 11, background: '#fff', outline: 'none' }} />
                <button onClick={() => onSend(inputValue)}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: '#107E3E', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ➤
                </button>
              </>
            ) : (
              <div style={{ flex: 1, padding: '6px 10px', borderRadius: 18, background: '#fff', fontSize: 11, color: '#94A3B8' }}>
                Use quick reply buttons above ↑
              </div>
            )}
          </div>
        </div>

        {/* Home indicator */}
        <div style={{ width: 80, height: 4, background: '#444', borderRadius: 2, margin: '8px auto 0' }} />
      </div>
    </div>
  );
};

// ─── Flow Diagram ─────────────────────────────────────────────────────────────
const FlowDiagram: React.FC = () => {
  const box = (bg: string, title: string, sub: string) => (
    <div style={{ background: bg, borderRadius: 10, padding: '14px 18px', textAlign: 'center' as const, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
  const arrow = (label?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', margin: '6px 0' }}>
      {label && <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600, marginBottom: 2 }}>{label}</span>}
      <div style={{ width: 2, height: 20, background: '#CBD5E1' }} />
      <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #CBD5E1' }} />
    </div>
  );

  return (
    <div style={{ padding: '0 20px' }}>
      {box('#0D1B2A', 'SAP S/4HANA Event', 'PO created, delivery approaching, invoice overdue...')}
      {arrow('Triggers')}
      {box('#0097A7', 'Paragon AI Engine', 'Selects language, formats message, chooses template')}
      {arrow('Sends via')}
      {box('#075E54', '360dialog WhatsApp API', 'Delivers to supplier\'s WhatsApp. Interactive buttons. Read receipts.')}
      {arrow('Supplier replies')}
      {box('#0097A7', 'AI Response Parser', 'Understands: KONFIRMASI, ASN format, STOK update, free text')}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: '#107E3E', fontWeight: 600 }}>Automated</div>
            <div style={{ width: 2, height: 16, background: '#86EFAC' }} />
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #86EFAC' }} />
          </div>
          <div style={{ background: '#107E3E', borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Auto-Execute</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>Updates SAP, creates ASN, logs in portal, sends confirmation</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: '#E9730C', fontWeight: 600 }}>Needs Human</div>
            <div style={{ width: 2, height: 16, background: '#FCD34D' }} />
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #FCD34D' }} />
          </div>
          <div style={{ background: '#E9730C', borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Escalate to Buyer</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>Disputes, deviations &gt;5%, halal issues, no response 24h</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Capabilities List ────────────────────────────────────────────────────────
const CAPABILITIES = [
  ['✅', 'Confirm Purchase Orders', 'Reply KONFIRMASI to any PO notification'],
  ['🚚', 'Submit ASN', 'Send structured message: ASN PO-XXXXX date carrier tracking'],
  ['📊', 'Update Inventory', 'STOK [code] [qty] [unit] — updates IBP automatically'],
  ['📄', 'Request Documents', 'DOKUMEN [PO number] — bot sends PDF instantly'],
  ['💰', 'Check Payment Status', 'BAYAR [invoice number] — get real-time payment info'],
  ['🔔', 'Report Delays', 'DELAY [PO] [new date] [reason] — auto-notifies buyer'],
  ['📋', 'Submit RFQ Response', 'QUOTE [RFQ] [price] [leadtime] — logs in portal'],
  ['❓', 'Get Help', 'BANTUAN — bot sends command list in Bahasa Indonesia'],
];

const LANGUAGES = [
  ['🇮🇩', 'Bahasa Indonesia'],
  ['🇺🇸', 'English'],
  ['🇨🇳', 'Mandarin'],
  ['🇩🇪', 'German'],
  ['🇸🇦', 'Arabic'],
  ['🇧🇷', 'Portuguese'],
];

// ─── Email Simulator ──────────────────────────────────────────────────────────
type EmailScenarioId = 'po' | 'asn' | 'inventory' | 'invoice';

const EMAIL_SCENARIOS: Record<EmailScenarioId, {
  label: string;
  icon: string;
  subject: string;
  preheader: string;
}> = {
  po:        { label: 'PO Notification', icon: '✓', subject: 'PO-2025-00108 — Action Required',                preheader: 'Please confirm or request changes' },
  asn:       { label: 'ASN Reminder',    icon: '→', subject: 'ASN Required — PO-2025-00108',                   preheader: 'Delivery in 3 days, submit ASN' },
  inventory: { label: 'Inventory Alert', icon: '↑', subject: 'Stock Update Request — Niacinamide B3',          preheader: 'Current stock level check' },
  invoice:   { label: 'Invoice Status',  icon: '?', subject: 'INV-2026-00234 — Payment Scheduled',             preheader: 'Payment timeline update' },
};

const EmailFlowDiagram: React.FC = () => {
  const box = (bg: string, title: string, sub: string) => (
    <div style={{ background: bg, borderRadius: 10, padding: '14px 18px', textAlign: 'center' as const, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
  const arrow = (label?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', margin: '6px 0' }}>
      {label && <span style={{ fontSize: 10, color: '#64748B', fontWeight: 600, marginBottom: 2 }}>{label}</span>}
      <div style={{ width: 2, height: 20, background: '#CBD5E1' }} />
      <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #CBD5E1' }} />
    </div>
  );

  return (
    <div style={{ padding: '0 20px' }}>
      {box('#0D1B2A', 'SAP S/4HANA Event', 'PO created, delivery alert, invoice scheduled...')}
      {arrow('Triggers')}
      {box('#0097A7', 'Email Template Engine', 'Selects template, formats HTML, attaches PDF')}
      {arrow('Sends via')}
      {box('#006064', 'SendGrid / SMTP Gateway', 'Delivers to supplier inbox. HTML + plain text fallback.')}
      {arrow('Supplier replies')}
      {box('#0097A7', 'Email Reply Parser', 'Supplier replies via email — or clicks action button')}

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: '#107E3E', fontWeight: 600 }}>Structured reply</div>
            <div style={{ width: 2, height: 16, background: '#86EFAC' }} />
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #86EFAC' }} />
          </div>
          <div style={{ background: '#107E3E', borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Auto-Execute</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>Parses structured reply, updates SAP, logs action</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: '#E9730C', fontWeight: 600 }}>Needs Human</div>
            <div style={{ width: 2, height: 16, background: '#FCD34D' }} />
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #FCD34D' }} />
          </div>
          <div style={{ background: '#E9730C', borderRadius: 10, padding: '12px 14px', textAlign: 'center' as const }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 3 }}>Escalate to Buyer</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>Unstructured reply, dispute, no response 48h</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailBody: React.FC<{
  scenario: EmailScenarioId;
  onAction: (label: string) => void;
  successMsg: string | null;
}> = ({ scenario, onAction, successMsg }) => {
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 };
  const valueStyle: React.CSSProperties = { fontSize: 13, color: '#0D1B2A', fontWeight: 500, marginTop: 2 };
  const cardStyle: React.CSSProperties = { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, marginTop: 10 };
  const primaryBtn: React.CSSProperties = { padding: '10px 18px', borderRadius: 6, border: 'none', background: '#0097A7', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
  const secondaryBtn: React.CSSProperties = { padding: '10px 18px', borderRadius: 6, border: '1px solid #0097A7', background: '#fff', color: '#0097A7', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

  if (scenario === 'po') {
    return (
      <>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#0D1B2A', lineHeight: 1.5 }}>
          Dear PT Berlina team,<br /><br />
          A new purchase order has been issued. Please review and confirm receipt, or request changes within 24 hours.
        </p>
        <div style={cardStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 10, columnGap: 16 }}>
            <div><div style={labelStyle}>PO Number</div><div style={valueStyle}>PO-2025-00108</div></div>
            <div><div style={labelStyle}>Delivery Date</div><div style={valueStyle}>15 Apr 2026</div></div>
            <div><div style={labelStyle}>Item</div><div style={valueStyle}>PET Bottle 100ml</div></div>
            <div><div style={labelStyle}>Quantity</div><div style={valueStyle}>50,000 PCS</div></div>
            <div><div style={labelStyle}>Total Value</div><div style={valueStyle}>Rp 185,000,000</div></div>
            <div><div style={labelStyle}>Delivery To</div><div style={valueStyle}>NDC Jatake 6</div></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button style={primaryBtn} onClick={() => onAction('Order confirmed — SAP updated automatically')}>CONFIRM ORDER</button>
          <button style={secondaryBtn} onClick={() => onAction('Change request received — buyer notified')}>REQUEST CHANGES</button>
        </div>
        {successMsg && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, color: '#15803D', fontSize: 12, fontWeight: 600 }}>
            ✓ {successMsg}
          </div>
        )}
      </>
    );
  }

  if (scenario === 'asn') {
    return (
      <>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#0D1B2A', lineHeight: 1.5 }}>
          Reminder: delivery for <strong>PO-2025-00108</strong> is due in 3 days (15 Apr 2026).<br /><br />
          Please submit your Advance Shipping Notice below so the receiving dock can be reserved.
        </p>
        <div style={cardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={labelStyle}>Carrier</div>
              <div style={{ marginTop: 4, padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, color: '#0D1B2A', background: '#fff' }}>JNE</div>
            </div>
            <div>
              <div style={labelStyle}>Tracking Number</div>
              <div style={{ marginTop: 4, padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, color: '#0D1B2A', background: '#fff' }}>JNE123456</div>
            </div>
            <div>
              <div style={labelStyle}>Ship Date</div>
              <div style={{ marginTop: 4, padding: '8px 10px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, color: '#0D1B2A', background: '#fff' }}>12 Apr 2026</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button style={primaryBtn} onClick={() => onAction('ASN-2026-001 created — Dock 1 @ 09:00 reserved')}>SUBMIT ASN</button>
        </div>
        {successMsg && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, color: '#15803D', fontSize: 12, fontWeight: 600 }}>
            ✓ {successMsg}
          </div>
        )}
      </>
    );
  }

  if (scenario === 'inventory') {
    return (
      <>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#0D1B2A', lineHeight: 1.5 }}>
          Our IBP shows <strong>Niacinamide B3</strong> at 24 days of supply. Please confirm or update the latest on-hand quantity so forecasts stay accurate.
        </p>
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current Stock Level</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0097A7', lineHeight: 1, marginTop: 6 }}>24 days</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>2,400 KG · Material MAT-10234</div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button style={primaryBtn} onClick={() => onAction('Stock confirmed at 2,400 KG — IBP refreshed')}>UPDATE STOCK</button>
        </div>
        {successMsg && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, color: '#15803D', fontSize: 12, fontWeight: 600 }}>
            ✓ {successMsg}
          </div>
        )}
      </>
    );
  }

  // invoice
  const steps: { label: string; done: boolean }[] = [
    { label: 'Submitted', done: true },
    { label: 'Approved',  done: true },
    { label: 'Scheduled', done: true },
    { label: 'Paid',      done: false },
  ];
  return (
    <>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#0D1B2A', lineHeight: 1.5 }}>
        Your invoice <strong>INV-2026-00234</strong> has been approved and scheduled for payment.
      </p>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: s.done ? '#0097A7' : '#E2E8F0',
                  color: s.done ? '#fff' : '#94A3B8',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px',
                }}>{s.done ? '✓' : i + 1}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: s.done ? '#0D1B2A' : '#94A3B8' }}>{s.label}</div>
              </div>
              {i < steps.length - 1 && <div style={{ height: 2, flex: 1, background: steps[i + 1].done ? '#0097A7' : '#E2E8F0', marginBottom: 16 }} />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
          <div><div style={labelStyle}>SAP Document</div><div style={valueStyle}>5105000234</div></div>
          <div style={{ textAlign: 'right' }}><div style={labelStyle}>Estimated Payment</div><div style={valueStyle}>2 May 2026</div></div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <button style={primaryBtn} onClick={() => onAction('Payment confirmation requested — finance team notified')}>ACKNOWLEDGE</button>
      </div>
      {successMsg && (
        <div style={{ marginTop: 14, padding: '10px 12px', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 6, color: '#15803D', fontSize: 12, fontWeight: 600 }}>
          ✓ {successMsg}
        </div>
      )}
    </>
  );
};

const EmailSimulator: React.FC = () => {
  const [scenario, setScenario] = useState<EmailScenarioId>('po');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchScenario = (s: EmailScenarioId) => {
    setScenario(s);
    setSuccessMsg(null);
  };

  const SCENARIO_LIST: { id: EmailScenarioId; label: string; icon: string }[] = [
    { id: 'po',        label: 'PO Notification', icon: '✓' },
    { id: 'asn',       label: 'ASN Reminder',    icon: '→' },
    { id: 'inventory', label: 'Inventory Alert', icon: '↑' },
    { id: 'invoice',   label: 'Invoice Status',  icon: '?' },
  ];

  const meta = EMAIL_SCENARIOS[scenario];

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* LEFT PANEL */}
      <div style={{ width: '42%', flexShrink: 0 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 4 }}>✉️ Email Procurement Simulator</div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Experience how suppliers respond to procurement notifications via email</div>

          {/* Scenario selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Choose a scenario:</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SCENARIO_LIST.map(s => (
                <button key={s.id} onClick={() => switchScenario(s.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: scenario === s.id ? '#0097A7' : '#F0F4F8',
                    color: scenario === s.id ? '#fff' : '#64748B',
                    border: `1px solid ${scenario === s.id ? '#0097A7' : '#E2E8F0'}`,
                    transition: 'all 0.15s',
                  }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email mockup */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
            {/* Subject bar */}
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A' }}>{meta.subject}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{meta.preheader}</div>
            </div>
            {/* Paragon Corp header */}
            <div style={{ background: '#0D1B2A', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: '#0097A7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>PC</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Paragon Corp</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>procurement@paragoncorp.com</div>
              </div>
            </div>
            {/* Sender row */}
            <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #F1F5F9', fontSize: 11, color: '#64748B' }}>
              <span style={{ color: '#0D1B2A', fontWeight: 600 }}>To:</span> supplier@ptberlina.co.id &nbsp;·&nbsp; <span style={{ color: '#0D1B2A', fontWeight: 600 }}>Sent:</span> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            {/* Body */}
            <div style={{ padding: '18px 18px 20px', background: '#fff' }}>
              <EmailBody scenario={scenario} onAction={setSuccessMsg} successMsg={successMsg} />
            </div>
            {/* Footer */}
            <div style={{ padding: '12px 16px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>
              Paragon Corp · Jl. Swadarma Raya No. 1, Jakarta · <a href="#" style={{ color: '#94A3B8', textDecoration: 'underline' }}>Unsubscribe</a>
            </div>
          </div>

          {/* Reset */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => switchScenario(scenario)}
              style={{ padding: '7px 18px', borderRadius: 20, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 12, cursor: 'pointer', color: '#64748B', fontWeight: 500 }}>
              🔄 Reset Email
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 16 }}>How Paragon's Email Commerce Engine Works</div>
          <EmailFlowDiagram />
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const WhatsAppSimulator: React.FC = () => {
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'wechat'>('whatsapp');
  const [scenario, setScenario] = useState<ScenarioId>('po');
  const [messages, setMessages] = useState<SimMessage[]>(SCENARIOS['po'].initial);
  const [quickReplies, setQuickReplies] = useState<string[]>(SCENARIOS['po'].quickReplies ?? []);
  const [inputValue, setInputValue] = useState<string>(SCENARIOS['po'].inputDefault ?? '');
  const [isTyping, setIsTyping] = useState(false);
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());

  const switchScenario = (s: ScenarioId) => {
    setScenario(s);
    setMessages(SCENARIOS[s].initial);
    setQuickReplies(SCENARIOS[s].quickReplies ?? []);
    setInputValue(SCENARIOS[s].inputDefault ?? '');
    setIsTyping(false);
    setNewMsgIds(new Set());
  };

  const addMessage = (from: 'bot' | 'supplier', content: string) => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    const msg: SimMessage = { id, from, content, time: getTime() };
    setMessages(prev => [...prev, msg]);
    setNewMsgIds(prev => new Set([...prev, id]));
    return id;
  };

  const getBotReply = (text: string): string => {
    const replies = BOT_REPLIES[scenario];
    return replies[text] ?? replies['default'] ?? 'Terima kasih! 🙏';
  };

  const handleReply = (text: string) => {
    if (isTyping) return;

    // Add supplier message
    addMessage('supplier', text);
    setQuickReplies([]);
    setIsTyping(true);

    // After delay, add bot response
    setTimeout(() => {
      setIsTyping(false);
      const botReply = getBotReply(text);
      addMessage('bot', botReply);

      // Set follow-up quick replies if any
      const followUp = FOLLOW_UP_REPLIES[text];
      if (followUp) {
        setQuickReplies(followUp);
      }
    }, 1500);
  };

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;
    handleReply(text.trim());
    setInputValue('');
  };

  const SCENARIO_LIST: { id: ScenarioId; label: string; icon: string }[] = [
    { id: 'po', label: 'Confirm a PO', icon: '✓' },
    { id: 'asn', label: 'Submit ASN', icon: '→' },
    { id: 'inventory', label: 'Update Inventory', icon: '↑' },
    { id: 'invoice', label: 'Invoice Query', icon: '?' },
  ];

  return (
    <div style={{ padding: '24px 28px', background: '#F0F4F8', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0D1B2A' }}>Communication Tools</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Conversational commerce channels — WhatsApp, Email, and WeChat — for supplier engagement</p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', marginBottom: '1.25rem' }}>
        {([
          { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
          { id: 'email',    label: 'Email',    color: '#0097A7' },
          { id: 'wechat',   label: 'WeChat',   color: '#07C160' },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setChannel(tab.id)}
            style={{ padding: '10px 24px', border: 'none',
              borderBottom: channel === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
              background: 'transparent',
              color: channel === tab.id ? tab.color : '#64748B',
              fontWeight: channel === tab.id ? 700 : 500,
              fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -2 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {channel === 'whatsapp' && (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── LEFT PANEL ─────────────────────────────────────────── */}
        <div style={{ width: '42%', flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 4 }}>📱 WhatsApp Procurement Simulator</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>Experience how suppliers interact with Paragon without logging into any portal</div>

            {/* Scenario selector */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Choose a scenario:</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SCENARIO_LIST.map(s => (
                  <button key={s.id} onClick={() => switchScenario(s.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: scenario === s.id ? '#0097A7' : '#F0F4F8',
                      color: scenario === s.id ? '#fff' : '#64748B',
                      border: `1px solid ${scenario === s.id ? '#0097A7' : '#E2E8F0'}`,
                      transition: 'all 0.15s',
                    }}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone mockup */}
            <PhoneMockup
              scenario={scenario}
              messages={messages}
              onQuickReply={handleReply}
              onSend={handleSend}
              inputValue={inputValue}
              setInputValue={setInputValue}
              quickReplies={quickReplies}
              isTyping={isTyping}
              newMsgIds={newMsgIds}
            />

            {/* Reset button */}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={() => switchScenario(scenario)}
                style={{ padding: '7px 18px', borderRadius: 20, background: '#F0F4F8', border: '1px solid #E2E8F0', fontSize: 12, cursor: 'pointer', color: '#64748B', fontWeight: 500 }}>
                🔄 Reset Conversation
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Flow diagram */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 16 }}>How Paragon's WhatsApp Commerce Engine Works</div>
            <FlowDiagram />
          </div>

          {/* Capabilities */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 4 }}>What suppliers can do via WhatsApp</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>No app download, no portal login required:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CAPABILITIES.map(([icon, title, desc]) => (
                <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1B2A' }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1B2A', marginBottom: 4 }}>Languages Supported</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Language auto-detected from supplier's country profile</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {LANGUAGES.map(([flag, lang]) => (
                <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9999, padding: '5px 12px' }}>
                  <span style={{ fontSize: 16 }}>{flag}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#0D1B2A' }}>{lang}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {channel === 'email' && <EmailSimulator />}
      {channel === 'wechat' && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
          WeChat channel coming in Task 2.
        </div>
      )}
    </div>
  );
};

export default WhatsAppSimulator;
