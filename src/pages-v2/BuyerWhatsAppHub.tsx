import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  MessageCircle,
  Send,
  Bot,
  Search,
  ChevronDown,
  Clock,
  Activity,
  Sparkles,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import Switch from '../components/ui-v2/Switch';
import { useToast } from '../hooks/useToast';

type Channel = 'whatsapp' | 'email' | 'wechat';
type WhatsAppTab = 'conversations' | 'automation' | 'analytics';
type ConvStatus = 'active' | 'awaiting' | 'resolved';

const TOKEN_TEAL = '#0097A7';
const TOKEN_NAVY = '#0D1B2A';
const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_MUTED = '#6B7785';
const TOKEN_BORDER = '#E5E9EE';

const WHATSAPP_GREEN_HEADER = '#075E54';
const WHATSAPP_GREEN_DOT = '#25D366';
const WHATSAPP_BUBBLE = '#DCF8C6';
const WHATSAPP_BG = '#ECE5DD';
const WECHAT_GREEN = '#07C160';
const WECHAT_BG = '#EDEDED';

const STATUS_VARIANT: Record<ConvStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  awaiting: 'warning',
  resolved: 'neutral',
};

interface Conversation {
  id: string;
  supplier: string;
  lastMsg: string;
  time: string;
  unread: number;
  status: ConvStatus;
}

interface ChatMessage {
  id: string;
  from: 'bot' | 'supplier';
  content: string;
  time: string;
}

interface AutomationRule {
  rule: string;
  trigger: string;
  action: string;
  autoHandle: boolean;
  escalateIf: string;
  successRate: string;
}

const CONVERSATIONS: Conversation[] = [
  { id: 'wa-001', supplier: 'PT Berlina Packaging 🇮🇩', lastMsg: 'Siap, PO-2025-00107 kami konfirmasi dalam perjalanan...', time: '2 min ago', unread: 0, status: 'active' },
  { id: 'wa-002', supplier: 'Zhejiang NHU Vitamins 🇨🇳', lastMsg: '库存更新：烟酰胺B3 2,400 KG...', time: '18 min ago', unread: 0, status: 'active' },
  { id: 'wa-003', supplier: 'PT Halal Emulsifier 🇮🇩', lastMsg: 'Mohon konfirmasi waktu pengiriman...', time: '1 hr ago', unread: 2, status: 'awaiting' },
  { id: 'wa-004', supplier: 'PT Musim Mas Specialty 🇮🇩', lastMsg: 'ASN sudah dikirim untuk PO-00115', time: '2 hr ago', unread: 0, status: 'resolved' },
  { id: 'wa-005', supplier: 'PT Ecogreen Oleochemicals 🇮🇩', lastMsg: 'Stok Centella Asiatica: 850 KG tersedia', time: '3 hr ago', unread: 0, status: 'active' },
  { id: 'wa-006', supplier: 'Givaudan Fragrance SG 🇸🇬', lastMsg: 'RFQ-2026-004 quotation submitted...', time: '5 hr ago', unread: 1, status: 'awaiting' },
];

const BERLINA_THREAD: ChatMessage[] = [
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

const OTHER_THREADS: Record<string, ChatMessage[]> = {
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

const AUTOMATION_RULES: AutomationRule[] = [
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
const DAILY_MSGS = OUTBOUND.map((v, i) => ({
  day: `${i + 26 > 31 ? i - 5 : i + 26} Mar`,
  outbound: v,
  inbound: INBOUND[i],
}));

interface RuleRate {
  rule: string;
  rate: number;
}

const RULE_RATES: RuleRate[] = [
  { rule: 'PO Confirm', rate: 94 },
  { rule: 'ASN Collect', rate: 87 },
  { rule: 'Inventory Upd', rate: 91 },
  { rule: 'Delivery Rem', rate: 99 },
  { rule: 'Invoice Rem', rate: 82 },
  { rule: 'Halal Alert', rate: 78 },
];

const RESPONSE_TABLE = [
  { supplier: 'PT Berlina 🇮🇩', avg: '3 min', fastest: '45 sec', slowest: '18 min', automation: '92%' },
  { supplier: 'PT Musim Mas 🇮🇩', avg: '5 min', fastest: '1 min', slowest: '32 min', automation: '88%' },
  { supplier: 'PT Halal Emulsifier 🇮🇩', avg: '8 min', fastest: '2 min', slowest: '45 min', automation: '85%' },
  { supplier: 'PT Ecogreen 🇮🇩', avg: '12 min', fastest: '4 min', slowest: '1.2 hr', automation: '79%' },
  { supplier: 'Givaudan SG 🇸🇬', avg: '22 min', fastest: '8 min', slowest: '3.5 hr', automation: '45%' },
];

const successVariant = (rate: string): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (rate === 'N/A') return 'neutral';
  const n = parseInt(rate, 10);
  if (n >= 85) return 'success';
  if (n >= 70) return 'warning';
  return 'danger';
};

const rateColor = (rate: number): string => {
  if (rate >= 85) return TOKEN_SUCCESS;
  if (rate >= 70) return TOKEN_WARNING;
  return '#BB0000';
};

const formatMsg = (text: string): React.ReactNode => {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith('*') && p.endsWith('*') ? (
      <strong key={i}>{p.slice(1, -1)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
};

const PULSE_CSS = `
@keyframes wa-connected-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.wa-connected-dot {
  animation: wa-connected-pulse 1.6s ease-in-out infinite;
}
`;

interface ConvItemProps {
  conv: Conversation;
  selected: boolean;
  onClick: () => void;
}

const ConvItem: React.FC<ConvItemProps> = ({ conv, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-4 py-3 border-b border-border-subtle transition-colors ${
      selected
        ? 'bg-teal-soft border-l-2 border-l-teal'
        : 'bg-bg-surface border-l-2 border-l-transparent hover:bg-bg-hover'
    }`}
  >
    <div className="flex items-center justify-between gap-2 mb-1">
      <div className="flex items-center gap-2 min-w-0">
        <StatusPill variant={STATUS_VARIANT[conv.status]} className="!px-1.5 !py-0.5">
          •
        </StatusPill>
        <span className="text-sm font-semibold text-text-primary truncate">
          {conv.supplier}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-text-tertiary">{conv.time}</span>
        {conv.unread > 0 && (
          <span className="bg-danger text-white text-[10px] font-bold rounded-full px-2 py-0.5 min-w-[18px] text-center">
            {conv.unread}
          </span>
        )}
      </div>
    </div>
    <div className="text-xs text-text-secondary truncate pl-6">
      {conv.lastMsg}
    </div>
  </button>
);

const Bubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
  const isBot = msg.from === 'bot';
  return (
    <div
      className={`flex flex-col mb-2 ${isBot ? 'items-start' : 'items-end'}`}
    >
      {isBot && (
        <span className="text-[10px] text-text-tertiary ml-1 mb-0.5">
          🤖 Paragon AI
        </span>
      )}
      <div
        className="max-w-[78%] px-3 py-2 shadow-sm"
        style={{
          background: isBot ? '#FFFFFF' : WHATSAPP_BUBBLE,
          borderRadius: isBot
            ? '0 12px 12px 12px'
            : '12px 0 12px 12px',
        }}
      >
        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
          {formatMsg(msg.content)}
        </div>
        <div className="flex justify-end items-center gap-1 mt-1 text-[10px] text-text-tertiary">
          <span>{msg.time}</span>
          {!isBot && <span className="text-info">✓✓</span>}
        </div>
      </div>
    </div>
  );
};

const BOT_ACTIONS = [
  'Send PO reminder',
  'Request ASN',
  'Request inventory update',
  'Send payment notification',
];

const ChatThread: React.FC<{ conv: Conversation; messages: ChatMessage[] }> = ({
  conv,
  messages,
}) => {
  const { toast } = useToast();
  const [showBotMenu, setShowBotMenu] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: WHATSAPP_GREEN_HEADER }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: WHATSAPP_GREEN_DOT, color: 'white' }}
        >
          {conv.supplier.slice(-2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {conv.supplier}
          </div>
          <div className="text-[11px] text-white/70">
            +62 812 XXXX XXXX · 🟢 Online
          </div>
        </div>
        <span className="text-[11px] text-white/80 bg-white/10 rounded-full px-2 py-1 shrink-0">
          via 360dialog
        </span>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col"
        style={{ background: WHATSAPP_BG }}
      >
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} />
        ))}
        <div className="bg-teal-soft border border-teal/30 rounded-md px-3 py-2 mt-2 text-xs text-text-primary">
          ℹ️ This conversation was handled{' '}
          <strong>100% automatically</strong> by Paragon's WhatsApp AI. No
          human intervention required. All SAP updates completed in real-time.
        </div>
      </div>

      <div className="bg-bg-hover px-4 py-3 border-t border-border-subtle flex gap-2 items-center">
        <input
          className="flex-1 px-3 py-2 rounded-full border-0 text-sm bg-white outline-none text-text-tertiary"
          value="Type a message..."
          readOnly
        />
        <div className="relative">
          <Button
            variant="primary"
            icon={Bot}
            onClick={() => setShowBotMenu((v) => !v)}
            className="!rounded-full !px-4 !py-2 !bg-success !border-success hover:!bg-success/90"
          >
            Bot message
            <ChevronDown size={14} className="ml-1" />
          </Button>
          {showBotMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-bg-surface border border-border-subtle rounded-md shadow-md min-w-[220px] z-10">
              {BOT_ACTIONS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    toast({
                      variant: 'success',
                      title: `Bot message sent to ${conv.supplier}`,
                      description: `${a} dispatched via WhatsApp.`,
                    });
                    setShowBotMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-hover border-b border-border-subtle last:border-b-0"
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConversationsTab: React.FC = () => {
  const [selected, setSelected] = useState<Conversation>(CONVERSATIONS[0]);
  const messages = useMemo(() => {
    if (selected.id === 'wa-001') return BERLINA_THREAD;
    return OTHER_THREADS[selected.id] ?? [];
  }, [selected]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-0 bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden h-[72vh]">
      <div className="border-r border-border-subtle overflow-y-auto bg-bg-page">
        <div className="px-4 py-3 border-b border-border-subtle bg-bg-surface">
          <div className="flex items-center gap-2 bg-bg-surface border border-border-input rounded-full px-3 py-1.5">
            <Search size={14} className="text-text-tertiary" />
            <input
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              placeholder="Search suppliers…"
            />
          </div>
        </div>
        {CONVERSATIONS.map((conv) => (
          <ConvItem
            key={conv.id}
            conv={conv}
            selected={selected.id === conv.id}
            onClick={() => setSelected(conv)}
          />
        ))}
      </div>
      <div className="flex flex-col overflow-hidden">
        <ChatThread conv={selected} messages={messages} />
      </div>
    </div>
  );
};

const AutomationTab: React.FC = () => {
  const { toast } = useToast();
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(AUTOMATION_RULES.map((r) => [r.rule, r.autoHandle])),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          WhatsApp automation rules
        </h3>
        <p className="text-sm text-text-tertiary mt-1">
          Configure what Paragon AI handles automatically vs. escalates to
          humans.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {AUTOMATION_RULES.map((rule) => {
          const on = toggles[rule.rule];
          return (
            <div
              key={rule.rule}
              className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5 flex gap-5 items-start"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <div className="text-sm font-bold text-text-primary">
                    {rule.rule}
                  </div>
                  <StatusPill variant={successVariant(rule.successRate)}>
                    {rule.successRate}
                  </StatusPill>
                </div>
                <div className="text-xs text-text-secondary mb-1">
                  <span className="font-semibold text-text-primary">
                    Trigger:{' '}
                  </span>
                  {rule.trigger}
                </div>
                <div className="text-xs text-text-secondary mb-2">
                  <span className="font-semibold text-text-primary">
                    Action:{' '}
                  </span>
                  {rule.action}
                </div>
                <div className="inline-block bg-warning-soft rounded px-2 py-1 text-[11px] text-warning">
                  ⚡ Escalate if: {rule.escalateIf}
                </div>
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Switch
                  size="md"
                  onColor="success"
                  checked={on}
                  ariaLabel={`${on ? 'Disable' : 'Enable'} ${rule.rule}`}
                  onChange={() =>
                    setToggles((t) => ({ ...t, [rule.rule]: !t[rule.rule] }))
                  }
                />
                <span
                  className={`text-[11px] font-semibold ${
                    on ? 'text-success' : 'text-text-tertiary'
                  }`}
                >
                  {on ? '🤖 Auto' : '👤 Manual'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      title: 'Rule editor coming in Phase 2A',
                    })
                  }
                  className="text-xs text-text-secondary hover:text-text-primary border border-border-input rounded px-2 py-1 bg-bg-hover"
                >
                  Edit rule
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ChartTooltipPayload {
  name: string;
  value: number;
  color?: string;
}
const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-text-primary mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

const AnalyticsTab: React.FC = () => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      <KpiCard
        eyebrow="Messages Sent (Month)"
        value="247"
        subtitle="Across 6 active suppliers"
        icon={Send}
      />
      <KpiCard
        eyebrow="Automated Actions"
        value="183"
        subtitle={<span className="text-success">74% automated</span>}
        icon={Bot}
      />
      <KpiCard
        eyebrow="Avg Response Time"
        value="4.2 min"
        subtitle="End-to-end channel response"
        icon={Clock}
      />
      <KpiCard
        eyebrow="Supplier Satisfaction"
        value="4.6/5.0"
        subtitle="Channel NPS proxy"
        icon={Sparkles}
      />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Daily message volume (last 14 days)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={DAILY_MSGS} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: TOKEN_MUTED }}
              interval={2}
            />
            <YAxis tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="outbound"
              name="Outbound"
              fill={TOKEN_TEAL}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="inbound"
              name="Inbound"
              fill={TOKEN_NAVY}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Automation success rate by rule
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={RULE_RATES} layout="vertical" barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke={TOKEN_BORDER} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: TOKEN_MUTED }}
              unit="%"
            />
            <YAxis
              type="category"
              dataKey="rule"
              width={120}
              tick={{ fontSize: 11, fill: TOKEN_MUTED }}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="rate" name="Success rate" radius={[0, 4, 4, 0]}>
              {RULE_RATES.map((r) => (
                <Cell key={r.rule} fill={rateColor(r.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>

    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle">
        <h3 className="text-sm font-semibold text-text-primary">
          Supplier response times
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableHeaderCell>Supplier</TableHeaderCell>
          <TableHeaderCell>Avg response</TableHeaderCell>
          <TableHeaderCell>Fastest</TableHeaderCell>
          <TableHeaderCell>Slowest</TableHeaderCell>
          <TableHeaderCell>Automation rate</TableHeaderCell>
        </TableHeader>
        <tbody>
          {RESPONSE_TABLE.map((r) => {
            const automationVariant: 'success' | 'warning' =
              parseInt(r.automation, 10) >= 80 ? 'success' : 'warning';
            return (
              <TableRow key={r.supplier}>
                <TableCell>
                  <span className="font-semibold text-text-primary">
                    {r.supplier}
                  </span>
                </TableCell>
                <TableCell className="font-semibold text-text-primary">
                  {r.avg}
                </TableCell>
                <TableCell className="text-success">{r.fastest}</TableCell>
                <TableCell className="text-warning">{r.slowest}</TableCell>
                <TableCell>
                  <StatusPill variant={automationVariant}>
                    {r.automation}
                  </StatusPill>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </section>
  </div>
);

const WeChatPanel: React.FC = () => {
  const { toast } = useToast();
  const [selected, setSelected] = useState('wc-001');

  const convs = [
    { id: 'wc-001', supplier: 'Zhejiang NHU Vitamins 🇨🇳', lastMsg: '库存更新：烟酰胺B3 2,400 KG 已确认', time: '18 min ago', status: 'success' as const, label: 'Confirmed' },
    { id: 'wc-002', supplier: 'Anhui Salicylics & Niacinamide 🇨🇳', lastMsg: 'BPJPH申请材料已提交 / BPJPH docs submitted', time: '2 hr ago', status: 'warning' as const, label: 'Pending' },
    { id: 'wc-003', supplier: 'Shanghai Berlina Packaging 🇨🇳', lastMsg: '报价单 RFQ-2026-004 已提交 / Quote submitted', time: '1 day ago', status: 'success' as const, label: 'Confirmed' },
  ];

  const thread = [
    { id: '1', from: 'bot' as const, cn: '您好！📊 库存更新请求', en: 'Stock update request', sub: '烟酰胺B3 (MAT-10234) · Current: 24 days\nReply: STOCK MAT-10234 [qty] KG', time: '17:00' },
    { id: '2', from: 'supplier' as const, cn: 'STOK MAT-10234 2400 KG', en: '', sub: '', time: '17:15' },
    { id: '3', from: 'bot' as const, cn: '✅ 库存已更新', en: 'Stock updated', sub: '烟酰胺B3: 2,400 KG (24 days)\nIBP auto-synced · IBP已自动同步 🙏', time: '17:15' },
    { id: '4', from: 'supplier' as const, cn: '库存更新：烟酰胺B3 2,400 KG 已确认', en: 'Confirmed', sub: '', time: '17:18' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-success-soft border-l-2 border-success rounded px-4 py-3 text-sm text-text-secondary">
        <strong className="text-success">WeChat channel</strong> targets
        Chinese suppliers — packaging components, active ingredients,
        fragrance compounds. Messages delivered via WeChat Official Account
        with bilingual CN/EN content.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4">
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-bg-hover border-b border-border-subtle text-label text-text-tertiary uppercase">
            Conversations ({convs.length})
          </div>
          {convs.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              className={`w-full text-left px-4 py-3 border-b border-border-subtle transition-colors ${
                selected === c.id
                  ? 'bg-success-soft border-l-2 border-l-success'
                  : 'border-l-2 border-l-transparent hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-text-primary">
                  {c.supplier}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-tertiary">{c.time}</span>
                  <StatusPill variant={c.status} className="!px-2 !py-0.5">
                    {c.label}
                  </StatusPill>
                </div>
              </div>
              <div className="text-xs text-text-secondary truncate">
                {c.lastMsg}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ background: WECHAT_GREEN }}
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-bold text-success">
              P
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                Paragon Corp Official Account
              </div>
              <div className="text-[10px] text-white/80">
                企业公众号 · Zhejiang NHU Vitamins
              </div>
            </div>
          </div>

          <div
            className="p-4 min-h-[280px] flex flex-col gap-3"
            style={{ background: WECHAT_BG }}
          >
            {thread.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 items-start ${
                  msg.from === 'supplier' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {msg.from === 'bot' && (
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: WECHAT_GREEN }}
                  >
                    P
                  </div>
                )}
                <div
                  className="max-w-[72%] px-3 py-2 text-xs leading-relaxed"
                  style={{
                    background: msg.from === 'supplier' ? WECHAT_GREEN : 'white',
                    color: msg.from === 'supplier' ? 'white' : '#1A1A1A',
                    borderRadius:
                      msg.from === 'supplier'
                        ? '10px 0 10px 10px'
                        : '0 10px 10px 10px',
                  }}
                >
                  {msg.cn && <div className="font-bold">{msg.cn}</div>}
                  {msg.en && (
                    <div
                      className={`text-[10px] mt-0.5 ${
                        msg.from === 'supplier' ? 'text-white/85' : 'text-teal'
                      }`}
                    >
                      {msg.en}
                    </div>
                  )}
                  {msg.sub && (
                    <div
                      className={`mt-1 text-[10px] whitespace-pre-line ${
                        msg.from === 'supplier' ? 'text-white/80' : 'text-text-tertiary'
                      }`}
                    >
                      {msg.sub}
                    </div>
                  )}
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      msg.from === 'supplier' ? 'text-white/60' : 'text-text-tertiary'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border-subtle flex gap-2">
            <Button
              variant="primary"
              icon={Send}
              className="!bg-success !border-success hover:!bg-success/90"
              onClick={() =>
                toast({
                  variant: 'success',
                  title: 'WeChat message dispatched',
                  description: 'Delivered to Zhejiang NHU Vitamins.',
                })
              }
            >
              Send message
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  variant: 'info',
                  title: 'Exporting WeChat conversation to SAP',
                })
              }
            >
              Export to SAP
            </Button>
          </div>

          <div className="bg-success-soft px-4 py-3 text-xs text-text-secondary flex items-center gap-2 border-t border-success/30">
            <strong className="text-success">SAP</strong>
            <span>
              IBP inventory auto-updated from WeChat reply · MAT-10234 stock:
              2,400 KG
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailPanel: React.FC = () => {
  const { toast } = useToast();
  const [selected, setSelected] = useState('em-001');

  const emails = [
    { id: 'em-001', supplier: 'PT Berlina Packaging 🇮🇩', subject: 'RE: PO-2025-00108 — Order Confirmed', time: '2 min ago', status: 'success' as const, label: 'Confirmed', preview: 'Konfirmasi PO-2025-00108 diterima. Pengiriman dijadwalkan 15 Apr 2026.' },
    { id: 'em-002', supplier: 'Zhejiang NHU Vitamins 🇨🇳', subject: 'Invoice INV-2026-00234 Submitted', time: '1 hr ago', status: 'warning' as const, label: 'Pending', preview: 'Please find attached invoice for PO-2025-00103. Amount: Rp 540,000,000.' },
    { id: 'em-003', supplier: 'Firmenich Malaysia Sdn. Bhd. 🇲🇾', subject: 'ISO 9001 Certificate — Renewal Notice', time: '3 hr ago', status: 'danger' as const, label: 'Action', preview: 'Our ISO 9001:2015 certificate expires 19 Jun 2026. Renewal in progress.' },
    { id: 'em-004', supplier: 'PT Musim Mas Specialty 🇮🇩', subject: 'ASN Submitted — PO-2025-00115', time: '5 hr ago', status: 'success' as const, label: 'Confirmed', preview: 'ASN-2026-006 submitted. Carrier: Pos Logistik. ETA: 8 Apr 2026.' },
    { id: 'em-005', supplier: 'Evonik Specialty FR 🇫🇷', subject: 'Quote Submitted — RFQ-2026-004', time: '1 day ago', status: 'warning' as const, label: 'Pending', preview: 'Please find our quotation for RFQ-2026-004. Unit price: EUR 145/KG.' },
  ];

  const email = {
    from: 'procurement@berlina.co.id',
    to: 'procurement@paragoncorp.com',
    subject: 'RE: PO-2025-00108 — Order Confirmed',
    date: 'Mon, 14 Apr 2026, 09:03',
    intro: 'Dear Paragon Procurement Team,',
    body: 'We confirm receipt and acceptance of PO-2025-00108. Details below:',
    rows: [
      ['PO Number', 'PO-2025-00108'],
      ['Material', 'PET Bottle 100ml — Natural Transparent'],
      ['Quantity', '50,000 PCS'],
      ['Unit Price', 'Rp 3,700 / PCS'],
      ['Total Value', 'Rp 185,000,000'],
      ['Delivery Date', '15 April 2026'],
      ['Ship To', 'Paragon DC — Cikande, Serang'],
    ] as const,
    outro: 'We will submit the ASN 3 days before the delivery date. Please confirm dock slot availability.',
    sig: 'Best regards,\nPT Berlina Packaging Indonesia',
    sapNote: 'SAP auto-updated — PO-2025-00108 confirmed at 09:03 · Order Confirmation Key updated',
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4">
        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-bg-hover border-b border-border-subtle text-label text-text-tertiary uppercase">
            Inbox ({emails.length})
          </div>
          {emails.map((em) => (
            <button
              key={em.id}
              type="button"
              onClick={() => setSelected(em.id)}
              className={`w-full text-left px-4 py-3 border-b border-border-subtle transition-colors ${
                selected === em.id
                  ? 'bg-teal-soft border-l-2 border-l-teal'
                  : 'border-l-2 border-l-transparent hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-text-primary">
                  {em.supplier}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-tertiary">{em.time}</span>
                  <StatusPill variant={em.status} className="!px-2 !py-0.5">
                    {em.label}
                  </StatusPill>
                </div>
              </div>
              <div className="text-xs font-semibold text-text-secondary truncate mb-0.5">
                {em.subject}
              </div>
              <div className="text-xs text-text-tertiary truncate">
                {em.preview}
              </div>
            </button>
          ))}
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
          <div className="bg-navy px-5 py-3 flex items-center justify-between">
            <span className="text-white font-bold text-sm tracking-widest">
              PARAGONCORP
            </span>
            <span className="text-white/70 text-xs">
              Supplier Portal · Odyssey Program
            </span>
          </div>
          <div className="px-5 py-4 border-b border-border-subtle bg-bg-hover">
            {[
              ['From', email.from],
              ['To', email.to],
              ['Subject', email.subject],
              ['Date', email.date],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 mb-1 text-xs">
                <span className="text-text-tertiary w-14 shrink-0">{k}</span>
                <span
                  className={`text-text-primary ${k === 'Subject' ? 'font-semibold' : ''}`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              {email.intro}
            </p>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              {email.body}
            </p>
            <table className="w-full mb-4 text-xs">
              <tbody>
                {email.rows.map(([label, value]) => (
                  <tr key={label} className="border-b border-border-subtle">
                    <td className="px-3 py-2 text-text-tertiary bg-bg-hover w-2/5">
                      {label}
                    </td>
                    <td className="px-3 py-2 text-text-primary font-medium">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              {email.outro}
            </p>
            <p className="text-sm text-text-secondary whitespace-pre-line">
              {email.sig}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                onClick={() =>
                  toast({
                    variant: 'info',
                    title: `Replying to ${email.subject}`,
                  })
                }
              >
                Reply
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast({
                    title: `Forwarded ${email.subject}`,
                  })
                }
              >
                Forward
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast({
                    title: `Archived ${email.subject}`,
                  })
                }
              >
                Archive
              </Button>
            </div>
          </div>
          <div className="bg-info-soft px-5 py-3 border-t border-info/30 text-xs text-text-secondary flex items-center gap-2">
            <strong className="text-info">SAP</strong>
            <span>{email.sapNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuyerWhatsAppHub: React.FC = () => {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [waTab, setWaTab] = useState<WhatsAppTab>('conversations');
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(t);
  }, []);

  const lastUpdated = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <AppShellV2>
      <style>{PULSE_CSS}</style>
      <PageHeader
        breadcrumb={['INTELLIGENCE', 'COMMUNICATIONS HUB']}
        title="Communications Hub"
        subtitle="WhatsApp · Email · WeChat — all supplier conversations in one place."
      />

      <PageMetaLine className="-mt-6 mb-6">
        Multi-channel supplier comms · last refreshed {lastUpdated}
      </PageMetaLine>

      <SubTabs<Channel>
        options={[
          { id: 'whatsapp', label: 'WhatsApp' },
          { id: 'email', label: 'Email' },
          { id: 'wechat', label: 'WeChat' },
        ]}
        value={channel}
        onChange={setChannel}
        className="mb-6"
      />

      {channel === 'whatsapp' && (
        <>
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="text-sm text-text-secondary">
              All supplier WhatsApp conversations — powered by 360dialog +
              Paragon AI.
            </div>
            <div className="inline-flex items-center gap-2 bg-bg-surface border border-border-subtle rounded-full px-3 py-1.5 shadow-sm">
              <span
                className="wa-connected-dot inline-block w-2 h-2 rounded-full bg-success"
                style={{ opacity: pulse ? 1 : 0.3 }}
                aria-hidden="true"
              />
              <span className="text-xs font-bold text-success">
                CONNECTED — 360dialog Business API
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
            <KpiCard
              eyebrow="Active Conversations"
              value="6"
              subtitle="Across supplier network"
              icon={MessageCircle}
            />
            <KpiCard
              eyebrow="Pending Responses"
              value="3"
              subtitle={<span className="text-warning">Awaiting supplier reply</span>}
              icon={Clock}
            />
            <KpiCard
              eyebrow="Automated Today"
              value="18"
              subtitle={<span className="text-success">No human intervention</span>}
              icon={Bot}
            />
            <KpiCard
              eyebrow="Avg Response Time"
              value="4 min"
              subtitle="End-to-end channel response"
              icon={Activity}
            />
          </div>

          <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 mb-6 text-sm text-text-primary">
            💡 <strong>Paragon's WhatsApp procurement bot</strong> handles PO
            confirmations, ASN submissions, inventory updates, and delivery
            notifications automatically. Human intervention only required for
            disputes, deviations &gt;5%, or halal compliance issues.
          </div>

          <SubTabs<WhatsAppTab>
            options={[
              { id: 'conversations', label: 'Active Conversations' },
              { id: 'automation', label: 'Automation Rules' },
              { id: 'analytics', label: 'Channel Analytics' },
            ]}
            value={waTab}
            onChange={setWaTab}
            className="mb-5"
          />

          {waTab === 'conversations' && <ConversationsTab />}
          {waTab === 'automation' && <AutomationTab />}
          {waTab === 'analytics' && <AnalyticsTab />}
        </>
      )}

      {channel === 'email' && <EmailPanel />}
      {channel === 'wechat' && <WeChatPanel />}
    </AppShellV2>
  );
};

export default BuyerWhatsAppHub;
