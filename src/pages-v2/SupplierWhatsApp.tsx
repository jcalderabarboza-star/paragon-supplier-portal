import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw,
  Phone,
  Send,
  CheckCircle2,
  Info,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import Button from '../components/ui-v2/Button';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import Data from '../components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';

const WHATSAPP_GREEN_HEADER = '#075E54';
const WHATSAPP_BG = '#ECE5DD';
const WHATSAPP_BUBBLE = '#DCF8C6';
const WHATSAPP_GREEN_DOT = '#107E3E';
const WECHAT_GREEN = '#07C160';
const WECHAT_BG = '#EDEDED';
// NOTE: the messenger-chrome consts above are used ONLY by the LEFT channel
// mockups (PhoneMockup / WeChat frame) — the D-2 authentic-channel exemption.
// The RIGHT-side process-flow bands no longer consume them: they use DP2-FLAG-01
// accent-edge classes (border-l-navy/teal/text-tertiary/success/warning) instead,
// so the mockups stay pixel-identical while the bands calm to the portal register.

const PULSE_CSS = `
@keyframes wa-fade-slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes wa-typing-dot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
.wa-msg-in { animation: wa-fade-slide-in 0.3s ease-out; }
.wa-typing-dot { animation: wa-typing-dot 1.2s ease-in-out infinite; }
`;

type Channel = 'whatsapp' | 'email' | 'wechat';
type ScenarioId = 'po' | 'asn' | 'inventory' | 'invoice';

interface SimMessage {
  id: string;
  from: 'bot' | 'supplier';
  content: string;
  time: string;
}

interface ScenarioConfig {
  label: string;
  initial: SimMessage[];
  quickReplies?: string[];
  inputDefault?: string;
}

const SCENARIOS: Record<ScenarioId, ScenarioConfig> = {
  po: {
    label: 'Confirm a PO',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          'Selamat pagi! 👋\n*PO-2025-00108* diterbitkan:\n📦 PET Bottle 100ml — 50,000 PCS\n💰 Rp 185.000.000\n📅 Delivery: 15 Apr 2026\n\nBalas: KONFIRMASI / TOLAK / UBAH',
        time: '09:00',
      },
    ],
    quickReplies: ['KONFIRMASI', 'TOLAK', 'UBAH'],
  },
  asn: {
    label: 'Submit ASN',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          '🚚 *Pengingat ASN*\nPO-2025-00108 delivery dalam 3 hari.\nFormat ASN:\n*ASN [PO] [tgl kirim] [carrier] [resi]*\n\nContoh:\nASN PO-00108 2026-04-12 SampleCourier SMPL123456',
        time: '09:00',
      },
    ],
    inputDefault: 'ASN PO-00108 2026-04-12 SampleCourier SMPL123456',
  },
  inventory: {
    label: 'Update Inventory',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          '📊 *Update Stok Diperlukan*\nStok Niacinamide B3 Anda di sistem kami: 24 hari.\nMohon update posisi stok terkini.\n\nFormat: *STOK [material code] [qty] [unit]*',
        time: '13:00',
      },
    ],
    inputDefault: 'STOK MAT-10234 2400 KG',
  },
  invoice: {
    label: 'Invoice Query',
    initial: [
      {
        id: 'bot-init',
        from: 'bot',
        content:
          '💰 *Status Invoice INV-2026-00234*\nStatus: ✅ Approved\nSAP Document: 5105000234\nEstimasi pembayaran: 5 Mei 2026\nBank: BCA ****4521\n\nAda pertanyaan? Balas chat ini.',
        time: '10:00',
      },
    ],
    inputDefault: 'Kapan transfer dilakukan?',
  },
};

const BOT_REPLIES: Record<ScenarioId, Record<string, string>> = {
  po: {
    KONFIRMASI:
      '✅ *Dikonfirmasi!*\nPO-2025-00108 confirmed 09:03\nSAP updated automatically ✓\nASN reminder in 5 days 🙏',
    TOLAK:
      'Noted. Alasan penolakan?\n1️⃣ Stok tidak tersedia\n2️⃣ Harga tidak sesuai\n3️⃣ Kapasitas penuh\n4️⃣ Lainnya',
    UBAH:
      'Apa yang ingin diubah?\n📅 *TANGGAL* — ubah delivery date\n📊 *QTY* — ubah kuantitas\n💰 *HARGA* — diskusi harga',
    '1️⃣':
      'Dipahami — stok tidak tersedia. Kami akan cari alternatif supplier. Tim akan menghubungi Anda untuk reschedule. 🙏',
    '2️⃣':
      'Dipahami — harga tidak sesuai. Tim procurement akan menghubungi untuk negosiasi. 🙏',
    '3️⃣':
      'Dipahami — kapasitas penuh. Kapan jadwal Anda tersedia? Balas dengan tanggal. 🙏',
    '4️⃣':
      'Silakan jelaskan alasan penolakan Anda. Tim kami akan segera merespons. 🙏',
    TANGGAL:
      'Balas dengan tanggal baru:\nFormat: *DATE YYYY-MM-DD*\nContoh: DATE 2026-04-20',
    QTY:
      'Balas dengan kuantitas baru:\nFormat: *QTY [jumlah] [unit]*\nContoh: QTY 45000 PCS',
    HARGA:
      'Balas dengan harga usulan:\nFormat: *HARGA [amount] per [unit]*\nContoh: HARGA 3800 per PCS',
    default: 'Terima kasih! Tim Paragon akan menindaklanjuti pesan Anda. 🙏',
  },
  asn: {
    default:
      '✅ *ASN Diterima!*\nASN-2026-001 dibuat otomatis.\n🚚 Carrier: Sample Courier\n📋 Resi: SMPL123456\n📅 ETA: 12 Apr 2026\n\n*Slot dock:* Dock 1 — 09:00 WIB NDC Jatake 6\nMohon tiba 15 menit lebih awal. 🙏',
  },
  inventory: {
    default:
      '✅ Stok diperbarui: 2,400 KG (24 hari).\nIBP diperbarui otomatis. 🙏',
  },
  invoice: {
    default:
      'Transfer dilakukan setiap Jumat.\nInvoice Anda dijadwalkan: Jumat 2 Mei 2026. 🙏',
  },
};

const FOLLOW_UP_REPLIES: Record<string, string[]> = {
  TOLAK: ['1️⃣', '2️⃣', '3️⃣', '4️⃣'],
  UBAH: ['TANGGAL', 'QTY', 'HARGA'],
};

// Chrome selector + capability + language labels are i18n keys resolved in-
// component via t(); the enum ids / flags stay as data. Scenario command tokens
// inside the capability descriptions (KONFIRMASI, STOK, …) live in the fragment
// values verbatim.
const CAP_KEYS = [
  'confirmPo',
  'submitAsn',
  'updateInventory',
  'requestDocs',
  'checkPayment',
  'reportDelays',
  'submitRfq',
  'getHelp',
] as const;

const LANGUAGES: { flag: string; key: string }[] = [
  { flag: '🇮🇩', key: 'id' },
  { flag: '🇺🇸', key: 'en' },
  { flag: '🇨🇳', key: 'zh' },
  { flag: '🇩🇪', key: 'de' },
  { flag: '🇸🇦', key: 'ar' },
  { flag: '🇧🇷', key: 'pt' },
];

const getTime = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const FormatMsg: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*[^*]+\*)/g);
        return (
          <React.Fragment key={li}>
            {parts.map((p, pi) =>
              p.startsWith('*') && p.endsWith('*') ? (
                <strong key={pi}>{p.slice(1, -1)}</strong>
              ) : (
                <span key={pi}>{p}</span>
              ),
            )}
            {li < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
};

const Bubble: React.FC<{ msg: SimMessage; animateIn?: boolean }> = ({
  msg,
  animateIn,
}) => {
  const isBot = msg.from === 'bot';
  return (
    <div
      className={`flex flex-col mb-1.5 ${isBot ? 'items-start' : 'items-end'} ${animateIn ? 'wa-msg-in' : ''}`}
    >
      <div
        className="max-w-[82%] px-3 py-2 shadow-sm"
        style={{
          background: isBot ? '#FFFFFF' : WHATSAPP_BUBBLE,
          borderRadius: isBot ? '0 10px 10px 10px' : '10px 0 10px 10px',
        }}
      >
        <div className="text-xs text-text-primary leading-relaxed">
          <FormatMsg text={msg.content} />
        </div>
        <div className="flex justify-end items-center gap-1 mt-1">
          <span className="text-[9px] text-text-tertiary">{msg.time}</span>
          {!isBot && <span className="text-[10px] text-info">✓✓</span>}
        </div>
      </div>
    </div>
  );
};

interface PhoneMockupProps {
  scenarioId: ScenarioId;
  messages: SimMessage[];
  inputValue: string;
  setInputValue: (v: string) => void;
  onQuickReply: (text: string) => void;
  onSend: (text: string) => void;
  quickReplies: string[];
  isTyping: boolean;
  newMsgIds: Set<string>;
}

const PhoneMockup: React.FC<PhoneMockupProps> = ({
  scenarioId,
  messages,
  inputValue,
  setInputValue,
  onQuickReply,
  onSend,
  quickReplies,
  isTyping,
  newMsgIds,
}) => {
  const { t } = useTranslation();
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const hasInput = SCENARIOS[scenarioId].inputDefault !== undefined;

  return (
    <div className="w-[300px] mx-auto">
      <div
        className="rounded-[36px] p-3 shadow-2xl"
        style={{ background: '#1A1A1A' }}
      >
        <div className="w-24 h-5 bg-[#1A1A1A] rounded-[10px] mx-auto mb-2" />
        <div
          className="overflow-hidden rounded-3xl"
          style={{ background: WHATSAPP_BG }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ background: WHATSAPP_GREEN_HEADER }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: WHATSAPP_GREEN_DOT }}
            >
              PC
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white leading-tight">
                Paragon Corp ✅
              </div>
              <div className="text-[9px] text-white/70">Business Account</div>
            </div>
            <Phone size={14} className="text-white/80" />
          </div>

          <div
            ref={chatRef}
            className="h-[340px] overflow-y-auto px-2 py-2.5 flex flex-col"
          >
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} animateIn={newMsgIds.has(m.id)} />
            ))}
            {isTyping && (
              <div className="flex items-start mb-1.5">
                <div
                  className="bg-white rounded-[0_10px_10px_10px] px-3 py-2 shadow-sm flex gap-1 items-center"
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="wa-typing-dot w-1.5 h-1.5 rounded-full bg-text-tertiary"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {quickReplies.length > 0 && !isTyping && (
            <div className="bg-bg-hover px-2 py-1.5 flex gap-1.5 flex-wrap border-t border-border-subtle">
              {quickReplies.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onQuickReply(r)}
                  className="px-2.5 py-1 rounded-full border text-[11px] font-semibold bg-white whitespace-nowrap"
                  style={{
                    borderColor: WHATSAPP_GREEN_DOT,
                    color: WHATSAPP_GREEN_HEADER,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <div className="bg-bg-hover px-2 py-1.5 flex gap-1.5 items-center border-t border-border-subtle">
            {hasInput ? (
              <>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-full bg-white text-[11px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => onSend(inputValue)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: WHATSAPP_GREEN_DOT }}
                  aria-label={t('supplierWhatsApp.aria.send')}
                >
                  <Send size={13} />
                </button>
              </>
            ) : (
              <div className="flex-1 px-3 py-1.5 rounded-full bg-white text-[11px] text-text-tertiary">
                Use quick reply buttons above ↑
              </div>
            )}
          </div>
        </div>
        <div className="w-20 h-1 bg-[#444] rounded mx-auto mt-2" />
      </div>
    </div>
  );
};

// DP2-FLAG-01 accent-edge — exactly the dashboard-widget signature: a light card,
// thin border, and a 3px LEFT edge keyed to the stage's role (navy = SAP source,
// teal = engine/parser, neutral = channel, success/warning = the fork). Replaces
// the saturated solid fills; the messenger-chrome greens/reds are now used ONLY
// by the LEFT channel mockups (D-2), never by these right-side bands.
const FlowBox: React.FC<{
  accent: string;
  title: string;
  sub: string;
}> = ({ accent, title, sub }) => (
  <div
    className={`bg-bg-surface border border-border-subtle border-l-[3px] ${accent} rounded-lg px-4 py-3`}
  >
    <div className="text-sm font-bold text-text-primary">{title}</div>
    <div className="text-xs leading-snug mt-0.5 text-text-secondary">{sub}</div>
  </div>
);

const FlowArrow: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex flex-col items-center my-1">
    {label && (
      <span className="text-[10px] text-text-tertiary font-semibold mb-1">
        {label}
      </span>
    )}
    <div className="w-0.5 h-4 bg-border-input" />
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '7px solid #D1D8E0',
      }}
    />
  </div>
);

const WhatsAppFlow: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <FlowBox
        accent="border-l-navy"
        title={t('supplierWhatsApp.wa.flow.sap.title')}
        sub={t('supplierWhatsApp.wa.flow.sap.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.triggers')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.wa.flow.engine.title')}
        sub={t('supplierWhatsApp.wa.flow.engine.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.sendsVia')} />
      <FlowBox
        accent="border-l-text-tertiary"
        title={t('supplierWhatsApp.wa.flow.api.title')}
        sub={t('supplierWhatsApp.wa.flow.api.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.supplierReplies')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.wa.flow.parser.title')}
        sub={t('supplierWhatsApp.wa.flow.parser.sub')}
      />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <FlowBox
          accent="border-l-success"
          title={t('supplierWhatsApp.wa.flow.autoExecute.title')}
          sub={t('supplierWhatsApp.wa.flow.autoExecute.sub')}
        />
        <FlowBox
          accent="border-l-warning"
          title={t('supplierWhatsApp.wa.flow.escalate.title')}
          sub={t('supplierWhatsApp.wa.flow.escalate.sub')}
        />
      </div>
    </div>
  );
};

const WhatsAppPanel: React.FC = () => {
  const { t } = useTranslation();
  const scenarioOptions: { id: ScenarioId; label: string }[] = [
    { id: 'po', label: t('supplierWhatsApp.wa.scenario.po') },
    { id: 'asn', label: t('supplierWhatsApp.wa.scenario.asn') },
    { id: 'inventory', label: t('supplierWhatsApp.wa.scenario.inventory') },
    { id: 'invoice', label: t('supplierWhatsApp.wa.scenario.invoice') },
  ];
  const [scenario, setScenario] = useState<ScenarioId>('po');
  const [messages, setMessages] = useState<SimMessage[]>(SCENARIOS.po.initial);
  const [quickReplies, setQuickReplies] = useState<string[]>(
    SCENARIOS.po.quickReplies ?? [],
  );
  const [inputValue, setInputValue] = useState<string>(
    SCENARIOS.po.inputDefault ?? '',
  );
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

  const addMessage = (from: 'bot' | 'supplier', content: string): string => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    const msg: SimMessage = { id, from, content, time: getTime() };
    setMessages((prev) => [...prev, msg]);
    setNewMsgIds((prev) => new Set([...prev, id]));
    return id;
  };

  const getBotReply = (text: string): string => {
    const replies = BOT_REPLIES[scenario];
    return replies[text] ?? replies.default ?? 'Terima kasih! 🙏';
  };

  const handleReply = (text: string) => {
    if (isTyping) return;
    addMessage('supplier', text);
    setQuickReplies([]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = getBotReply(text);
      addMessage('bot', reply);
      const followUp = FOLLOW_UP_REPLIES[text];
      if (followUp) setQuickReplies(followUp);
    }, 1500);
  };

  const handleSend = (text: string) => {
    if (!text.trim() || isTyping) return;
    handleReply(text.trim());
    setInputValue('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-6">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-1">
          {t('supplierWhatsApp.wa.simulator.title')}
        </h3>
        <p className="text-xs text-text-tertiary mb-4">
          {t('supplierWhatsApp.wa.simulator.subtitle')}
        </p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {t('supplierWhatsApp.common.chooseScenario')}
          </div>
          <FilterChipsBar<ScenarioId>
            options={scenarioOptions}
            value={scenario}
            onChange={switchScenario}
          />
        </div>

        <PhoneMockup
          scenarioId={scenario}
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onQuickReply={handleReply}
          onSend={handleSend}
          quickReplies={quickReplies}
          isTyping={isTyping}
          newMsgIds={newMsgIds}
        />

        <div className="text-center mt-4">
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => switchScenario(scenario)}
          >
            {t('supplierWhatsApp.action.resetConversation')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
          <h3 className="text-section text-text-primary mb-4">
            {t('supplierWhatsApp.wa.flow.title')}
          </h3>
          <WhatsAppFlow />
        </section>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
          <h3 className="text-section text-text-primary">
            {t('supplierWhatsApp.wa.capabilities.title')}
          </h3>
          <p className="text-xs text-text-tertiary mb-4">
            {t('supplierWhatsApp.wa.capabilities.subtitle')}
          </p>
          <div className="flex flex-col gap-2">
            {CAP_KEYS.map((k) => (
              <div
                key={k}
                className="flex gap-3 items-start py-1.5 border-b border-border-subtle last:border-b-0"
              >
                <CheckCircle2
                  size={14}
                  className="text-success shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text-primary">
                    {t(`supplierWhatsApp.cap.${k}.title`)}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {t(`supplierWhatsApp.cap.${k}.desc`)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
          <h3 className="text-section text-text-primary">
            {t('supplierWhatsApp.wa.languages.title')}
          </h3>
          <p className="text-xs text-text-tertiary mb-3">
            {t('supplierWhatsApp.wa.languages.subtitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <div
                key={l.key}
                className="flex items-center gap-1.5 bg-bg-hover border border-border-subtle rounded-full px-3 py-1"
              >
                <span className="text-base">{l.flag}</span>
                <span className="text-xs font-medium text-text-primary">
                  {t(`supplierWhatsApp.lang.${l.key}`)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

interface EmailScenarioMeta {
  label: string;
  subject: string;
  preheader: string;
}

const EMAIL_SCENARIOS: Record<ScenarioId, EmailScenarioMeta> = {
  po: {
    label: 'PO Notification',
    subject: 'PO-2025-00108 — Action Required',
    preheader: 'Please confirm or request changes',
  },
  asn: {
    label: 'ASN Reminder',
    subject: 'ASN Required — PO-2025-00108',
    preheader: 'Delivery in 3 days, submit ASN',
  },
  inventory: {
    label: 'Inventory Alert',
    subject: 'Stock Update Request — Niacinamide B3',
    preheader: 'Current stock level check',
  },
  invoice: {
    label: 'Invoice Status',
    subject: 'INV-2026-00234 — Payment Scheduled',
    preheader: 'Payment timeline update',
  },
};

const EmailBody: React.FC<{
  scenario: ScenarioId;
  onAction: (label: string) => void;
  successMsg: string | null;
}> = ({ scenario, onAction, successMsg }) => {
  const labelCls = 'text-xs text-text-tertiary uppercase tracking-wider font-semibold';
  const valueCls = 'text-sm text-text-primary font-medium mt-0.5';
  const cardCls = 'bg-bg-hover border border-border-subtle rounded-md p-4 mt-3';

  const SuccessBanner = () =>
    successMsg ? (
      <div className="mt-3 bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-success font-semibold flex items-center gap-2">
        <CheckCircle2 size={14} />
        {successMsg}
      </div>
    ) : null;

  if (scenario === 'po') {
    return (
      <>
        <p className="text-sm text-text-primary mb-3 leading-relaxed">
          Dear PT Berlina team,
          <br />
          <br />
          A new purchase order has been issued. Please review and confirm
          receipt, or request changes within 24 hours.
        </p>
        <div className={cardCls}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              ['PO Number', 'PO-2025-00108'],
              ['Delivery Date', '15 Apr 2026'],
              ['Item', 'PET Bottle 100ml'],
              ['Quantity', '50,000 PCS'],
              ['Total Value', 'Rp 185,000,000'],
              ['Delivery To', 'NDC Jatake 6'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className={labelCls}>{k}</div>
                <div className={valueCls}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant="primary"
            onClick={() =>
              onAction('Order confirmed — SAP updated automatically')
            }
          >
            CONFIRM ORDER
          </Button>
          <Button
            variant="secondary"
            onClick={() => onAction('Change request received — buyer notified')}
          >
            REQUEST CHANGES
          </Button>
        </div>
        <SuccessBanner />
      </>
    );
  }

  if (scenario === 'asn') {
    return (
      <>
        <p className="text-sm text-text-primary mb-3 leading-relaxed">
          Reminder: delivery for <strong>PO-2025-00108</strong> is due in 3 days
          (15 Apr 2026).
          <br />
          <br />
          Please submit your Advance Shipping Notice so the receiving dock can
          be reserved.
        </p>
        <div className={cardCls}>
          <div className="grid grid-cols-1 gap-3">
            {[
              ['Carrier', 'Sample Courier'],
              ['Tracking Number', 'SMPL123456'],
              ['Ship Date', '12 Apr 2026'],
            ].map(([k, v]) => (
              <div key={k}>
                <div className={labelCls}>{k}</div>
                <div className="mt-1 px-3 py-2 border border-border-input rounded text-sm text-text-primary bg-white">
                  {v}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            onClick={() =>
              onAction('ASN-2026-001 created — Dock 1 @ 09:00 reserved')
            }
          >
            SUBMIT ASN
          </Button>
        </div>
        <SuccessBanner />
      </>
    );
  }

  if (scenario === 'inventory') {
    return (
      <>
        <p className="text-sm text-text-primary mb-3 leading-relaxed">
          Our IBP shows <strong>Niacinamide B3</strong> at 24 days of supply.
          Please confirm or update the latest on-hand quantity so forecasts stay
          accurate.
        </p>
        <div className={cardCls}>
          <div className={labelCls}>Current Stock Level</div>
          <div className="text-kpi font-mono tabular-nums text-text-primary mt-1">24 days</div>
          <div className="text-sm text-text-tertiary mt-0.5">
            2,400 KG · Material MAT-10234
          </div>
        </div>
        <div className="mt-4">
          <Button
            variant="primary"
            onClick={() =>
              onAction('Stock confirmed at 2,400 KG — IBP refreshed')
            }
          >
            UPDATE STOCK
          </Button>
        </div>
        <SuccessBanner />
      </>
    );
  }

  const steps: { label: string; done: boolean }[] = [
    { label: 'Submitted', done: true },
    { label: 'Approved', done: true },
    { label: 'Scheduled', done: true },
    { label: 'Paid', done: false },
  ];
  return (
    <>
      <p className="text-sm text-text-primary mb-3 leading-relaxed">
        Your invoice <strong>INV-2026-00234</strong> has been approved and
        scheduled for payment.
      </p>
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          {steps.map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="text-center flex-1">
                <div
                  className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center mx-auto mb-1 ${
                    s.done
                      ? 'bg-action text-white'
                      : 'bg-bg-hover text-text-tertiary'
                  }`}
                >
                  {s.done ? '✓' : i + 1}
                </div>
                <div
                  className={`text-[10px] font-semibold ${
                    s.done ? 'text-text-primary' : 'text-text-tertiary'
                  }`}
                >
                  {s.label}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mb-4 ${
                    steps[i + 1].done ? 'bg-action' : 'bg-bg-hover'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border-subtle flex justify-between">
          <div>
            <div className={labelCls}>SAP Document</div>
            <div className={valueCls}>5105000234</div>
          </div>
          <div className="text-right">
            <div className={labelCls}>Estimated Payment</div>
            <div className={valueCls}>2 May 2026</div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <Button
          variant="primary"
          onClick={() =>
            onAction('Payment confirmation requested — finance team notified')
          }
        >
          ACKNOWLEDGE
        </Button>
      </div>
      <SuccessBanner />
    </>
  );
};

const EmailFlow: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <FlowBox
        accent="border-l-navy"
        title={t('supplierWhatsApp.email.flow.sap.title')}
        sub={t('supplierWhatsApp.email.flow.sap.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.triggers')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.email.flow.engine.title')}
        sub={t('supplierWhatsApp.email.flow.engine.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.sendsVia')} />
      <FlowBox
        accent="border-l-text-tertiary"
        title={t('supplierWhatsApp.email.flow.gateway.title')}
        sub={t('supplierWhatsApp.email.flow.gateway.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.supplierReplies')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.email.flow.parser.title')}
        sub={t('supplierWhatsApp.email.flow.parser.sub')}
      />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <FlowBox
          accent="border-l-success"
          title={t('supplierWhatsApp.email.flow.autoExecute.title')}
          sub={t('supplierWhatsApp.email.flow.autoExecute.sub')}
        />
        <FlowBox
          accent="border-l-warning"
          title={t('supplierWhatsApp.email.flow.escalate.title')}
          sub={t('supplierWhatsApp.email.flow.escalate.sub')}
        />
      </div>
    </div>
  );
};

const EmailPanel: React.FC = () => {
  const { t } = useTranslation();
  const scenarioOptions: { id: ScenarioId; label: string }[] = [
    { id: 'po', label: t('supplierWhatsApp.email.scenario.po') },
    { id: 'asn', label: t('supplierWhatsApp.email.scenario.asn') },
    { id: 'inventory', label: t('supplierWhatsApp.email.scenario.inventory') },
    { id: 'invoice', label: t('supplierWhatsApp.email.scenario.invoice') },
  ];
  const [scenario, setScenario] = useState<ScenarioId>('po');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchScenario = (s: ScenarioId) => {
    setScenario(s);
    setSuccessMsg(null);
  };

  const meta = EMAIL_SCENARIOS[scenario];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-6">
      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-1">
          {t('supplierWhatsApp.email.simulator.title')}
        </h3>
        <p className="text-xs text-text-tertiary mb-4">
          {t('supplierWhatsApp.email.simulator.subtitle')}
        </p>

        <div className="mb-4">
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {t('supplierWhatsApp.common.chooseScenario')}
          </div>
          <FilterChipsBar<ScenarioId>
            options={scenarioOptions}
            value={scenario}
            onChange={switchScenario}
          />
        </div>

        <div className="border border-border-subtle rounded-lg overflow-hidden shadow-md">
          <div className="bg-bg-hover px-4 py-3 border-b border-border-subtle">
            <div className="text-sm font-bold text-text-primary">
              {meta.subject}
            </div>
            <div className="text-xs text-text-tertiary mt-0.5">
              {meta.preheader}
            </div>
          </div>
          <div className="bg-navy px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-action-muted flex items-center justify-center text-xs font-bold text-white">
              PC
            </div>
            <div>
              <div className="text-sm font-bold text-white">Paragon Corp</div>
              <div className="text-xs text-white/60">
                procurement@paragoncorp.com
              </div>
            </div>
          </div>
          <div className="px-4 py-2.5 bg-bg-surface border-b border-border-subtle text-xs text-text-tertiary">
            <span className="text-text-primary font-semibold">To:</span>{' '}
            supplier@ptberlina.co.id ·{' '}
            <span className="text-text-primary font-semibold">Sent:</span>{' '}
            <Data>
              {new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Data>
          </div>
          <div className="px-5 py-5 bg-bg-surface">
            <EmailBody
              scenario={scenario}
              onAction={setSuccessMsg}
              successMsg={successMsg}
            />
          </div>
          <div className="px-4 py-3 bg-bg-hover border-t border-border-subtle text-xs text-text-tertiary text-center">
            Paragon Corp · Jl. Swadarma Raya No. 1, Jakarta ·{' '}
            <a href="#" className="text-text-tertiary underline">
              Unsubscribe
            </a>
          </div>
        </div>

        <div className="text-center mt-4">
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => switchScenario(scenario)}
          >
            {t('supplierWhatsApp.email.reset')}
          </Button>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-4">
          {t('supplierWhatsApp.email.flow.title')}
        </h3>
        <EmailFlow />
      </div>
    </div>
  );
};

interface WeChatScenario {
  label: string;
  bot: string;
  replies: string[];
  success: string;
}

const WECHAT_SCENARIOS: Record<ScenarioId, WeChatScenario> = {
  po: {
    label: 'Confirm PO',
    bot:
      'Selamat pagi / 早上好\nPurchase Order received:\n📦 PO-2025-00108\nPET Bottle 100ml — 50,000 PCS\nRp 185,000,000\nDelivery: 15 Apr 2026\n\n中文: 采购订单已发出，请确认。\nReply: CONFIRM / REJECT / CHANGE',
    replies: ['CONFIRM', 'REJECT', 'CHANGE'],
    success:
      '✅ PO-2025-00108 Confirmed\nSAP updated automatically.\n已自动更新SAP系统。',
  },
  asn: {
    label: 'Submit ASN',
    bot:
      'ASN Reminder / 发货通知提醒\nPO-2025-00108 delivery in 3 days.\nFormat: ASN [PO] [date] [carrier] [tracking]\n\n中文: 请在3天内提交发货通知。',
    replies: ['SUBMIT ASN'],
    success:
      '✅ ASN received. Dock slot: NDC Jatake 6 — Dock 1, 09:00 WIB\n装货通知已收到。',
  },
  inventory: {
    label: 'Inventory Alert',
    bot:
      'Stock Update / 库存更新\nNiacinamide B3 stock: 24 days\nPlease update current stock level.\n\n中文: 请更新当前库存水平。\nFormat: STOCK [code] [qty] [unit]',
    replies: ['UPDATE STOCK'],
    success:
      '✅ Stock updated: 2,400 KG\nIBP system synced automatically.\n库存已自动同步至IBP系统。',
  },
  invoice: {
    label: 'Invoice Status',
    bot:
      'Invoice Status / 发票状态\nINV-2026-00234: ✅ Approved\nSAP Doc: 5105000234\nPayment est: 5 May 2026\n\n中文: 发票已批准，预计付款日期5月5日。',
    replies: ['VIEW DETAILS'],
    success:
      '💰 Payment scheduled: Friday 2 May 2026\nBank: BCA ****4521\n付款日期：2026年5月2日（星期五）',
  },
};

const WeChatFlow: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <FlowBox
        accent="border-l-navy"
        title={t('supplierWhatsApp.wc.flow.sap.title')}
        sub={t('supplierWhatsApp.wc.flow.sap.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.triggers')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.wc.flow.engine.title')}
        sub={t('supplierWhatsApp.wc.flow.engine.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.sendsVia')} />
      <FlowBox
        accent="border-l-text-tertiary"
        title={t('supplierWhatsApp.wc.flow.api.title')}
        sub={t('supplierWhatsApp.wc.flow.api.sub')}
      />
      <FlowArrow label={t('supplierWhatsApp.flow.arrow.supplierReplies')} />
      <FlowBox
        accent="border-l-teal"
        title={t('supplierWhatsApp.wc.flow.parser.title')}
        sub={t('supplierWhatsApp.wc.flow.parser.sub')}
      />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <FlowBox
          accent="border-l-success"
          title={t('supplierWhatsApp.wc.flow.autoExecute.title')}
          sub={t('supplierWhatsApp.wc.flow.autoExecute.sub')}
        />
        <FlowBox
          accent="border-l-warning"
          title={t('supplierWhatsApp.wc.flow.escalate.title')}
          sub={t('supplierWhatsApp.wc.flow.escalate.sub')}
        />
      </div>
    </div>
  );
};

const WeChatPanel: React.FC = () => {
  const { t } = useTranslation();
  const scenarioOptions: { id: ScenarioId; label: string }[] = [
    { id: 'po', label: t('supplierWhatsApp.wc.scenario.po') },
    { id: 'asn', label: t('supplierWhatsApp.wc.scenario.asn') },
    { id: 'inventory', label: t('supplierWhatsApp.wc.scenario.inventory') },
    { id: 'invoice', label: t('supplierWhatsApp.wc.scenario.invoice') },
  ];
  const [scenario, setScenario] = useState<ScenarioId>('po');
  const [replied, setReplied] = useState(false);

  const switchScenario = (s: ScenarioId) => {
    setScenario(s);
    setReplied(false);
  };

  const current = WECHAT_SCENARIOS[scenario];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[42%_1fr] gap-6">
      <div className="flex flex-col">
        <div className="bg-success-soft border-l-2 border-success rounded px-4 py-3 mb-4 text-xs text-text-secondary">
          <strong className="text-success">
            {t('supplierWhatsApp.wc.banner.label')}
          </strong>
          {t('supplierWhatsApp.wc.banner.text')}
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-text-secondary mb-2">
            {t('supplierWhatsApp.common.chooseScenario')}
          </div>
          <FilterChipsBar<ScenarioId>
            options={scenarioOptions}
            value={scenario}
            onChange={switchScenario}
          />
        </div>

        <div className="rounded-[36px] p-3 shadow-2xl" style={{ background: '#1A1A1A' }}>
          <div className="flex justify-between px-4 pt-1 pb-2 text-[10px] text-white">
            <span>09:00</span>
            <span>●●●</span>
          </div>
          <div
            className="flex items-center gap-2.5 px-4 py-2.5"
            style={{ background: WECHAT_GREEN }}
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-success">
              P
            </div>
            <div>
              <div className="text-white font-bold text-sm">Paragon Corp</div>
              <div className="text-white/80 text-[10px]">
                Official Account · 企业账号
              </div>
            </div>
          </div>

          <div
            className="p-3 min-h-[260px] flex flex-col gap-2.5"
            style={{ background: WECHAT_BG }}
          >
            <div className="flex gap-2 items-start">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: WECHAT_GREEN }}
              >
                P
              </div>
              <div className="bg-white px-3 py-2 rounded-[0_10px_10px_10px] max-w-[75%] text-[11px] text-text-primary leading-relaxed whitespace-pre-line">
                {current.bot}
              </div>
            </div>
            {!replied && (
              <div className="pl-9 flex gap-1.5 flex-wrap">
                {current.replies.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReplied(true)}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold text-white border-0"
                    style={{ background: WECHAT_GREEN }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            {replied && (
              <>
                <div className="flex justify-end">
                  <div
                    className="rounded-[10px_0_10px_10px] px-3 py-2 max-w-[70%] text-[11px] text-white"
                    style={{ background: WECHAT_GREEN }}
                  >
                    {current.replies[0]}
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: WECHAT_GREEN }}
                  >
                    P
                  </div>
                  <div className="bg-white px-3 py-2 rounded-[0_10px_10px_10px] max-w-[75%] text-[11px] text-success leading-relaxed whitespace-pre-line font-semibold">
                    {current.success}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-bg-hover px-3 py-2 rounded-b-3xl flex gap-2 items-center">
            <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[11px] text-text-tertiary">
              Type a message…
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-white"
              style={{ background: WECHAT_GREEN }}
            >
              +
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => switchScenario(scenario)}
          >
            {t('supplierWhatsApp.action.resetConversation')}
          </Button>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-4">
          {t('supplierWhatsApp.wc.flow.title')}
        </h3>
        <WeChatFlow />
      </div>
    </div>
  );
};

const SupplierWhatsApp: React.FC = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const { supplierId, supplierName } = identity;
  const [channel, setChannel] = useState<Channel>('whatsapp');

  const lastUpdated = useMemo(
    () =>
      new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  if (!supplierId) return <NoSupplierIdentity />;

  return (
    <AppShellV2>
      <style>{PULSE_CSS}</style>
      <PageHeader
        breadcrumb={[
          t('supplierWhatsApp.crumb.intelligence'),
          t('supplierWhatsApp.crumb.whatsappHub'),
        ]}
        title={t('supplierWhatsApp.header.title')}
        subtitle={t('supplierWhatsApp.header.subtitle', {
          supplier: supplierName ?? t('supplierWhatsApp.fallback.supplier'),
        })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierWhatsApp.meta.sessionOpened')} <Data>{lastUpdated}</Data>
        {/* D-CENSUS-8 — `messaging` is null-backed. This is a scripted simulator: no
            WhatsApp Business API is connected, no message leaves the browser, and
            the bot replies are authored. The capability copy claiming the bot sends
            documents "instantly" and returns "real-time payment info" is retracted
            in this batch. */}
        <ProvenanceMarker capability="messaging" className="ml-3 align-middle" />
      </PageMetaLine>

      {/* C5 — the demonstration honesty marker: a supplier can never mistake these
          scripted example conversations for their real channel history. JJ's ruling
          keeps the demonstrator; this label makes what it is unmistakable. */}
      <div
        className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary"
        data-testid="supplier-whatsapp-demo-banner"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-warning-hover" aria-hidden="true" />
        <span className="text-text-secondary">{t('supplierWhatsApp.demo.banner')}</span>
      </div>

      <SubTabs<Channel>
        options={[
          { id: 'whatsapp', label: t('supplierWhatsApp.tab.whatsapp') },
          { id: 'email', label: t('supplierWhatsApp.tab.email') },
          { id: 'wechat', label: t('supplierWhatsApp.tab.wechat') },
        ]}
        value={channel}
        onChange={setChannel}
        className="mb-6"
      />

      {channel === 'whatsapp' && <WhatsAppPanel />}
      {channel === 'email' && <EmailPanel />}
      {channel === 'wechat' && <WeChatPanel />}
    </AppShellV2>
  );
};

export default SupplierWhatsApp;
