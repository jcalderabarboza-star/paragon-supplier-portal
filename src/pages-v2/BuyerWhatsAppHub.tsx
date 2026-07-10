import React, { useState } from 'react';
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
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import { CHART_SERIES, CHART_SEMANTIC, CHART_GRID } from '../lib/chartPalette';
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
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useToast } from '../hooks/useToast';
import {
  useEngagementSummary,
  useConversations,
  useConversationThread,
  useAutomationRules,
  useDailyMessages,
  useRuleRates,
  useResponseTimes,
} from '../services/query/hooks';
import type {
  Conversation,
  ConvStatus,
  ChatMessage,
  AutomationRule,
  RuleRate,
  ResponseRow,
  DailyMessageRow,
  EngagementSummary,
  EngagementKpi,
  KpiTone,
} from '../services/data/types';

type Channel = 'whatsapp' | 'email' | 'wechat';
type WhatsAppTab = 'conversations' | 'automation' | 'analytics';

const ENGAGEMENT_CRUMB = ['INTELLIGENCE', 'COMMUNICATIONS HUB'];

// DP2-PALETTE-01: sourced from the central palette (SSoT), not page-local hex.
// Values unchanged — pure de-dup. (Messenger chrome below stays exempt, D-2.)
const TOKEN_TEAL = CHART_SERIES[0];
const TOKEN_NAVY = CHART_SERIES[1];
const TOKEN_SUCCESS = CHART_SEMANTIC.success;
const TOKEN_WARNING = CHART_SEMANTIC.warning;
const TOKEN_MUTED = CHART_SEMANTIC.neutral;
const TOKEN_BORDER = CHART_GRID;

// Messenger-chrome brand colors are intentionally exempt from DP-1 (D-2):
// WhatsApp / WeChat headers stay on-brand so the channel is recognizable.
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

const TONE_CLASS: Record<KpiTone, string> = {
  success: 'text-success',
  warning: 'text-warning-hover',
  danger: 'text-danger',
  neutral: '',
};

// Neutral cards render the plain subtitle (default color); toned cards wrap it.
const kpiSubtitle = (kpi: EngagementKpi): React.ReactNode =>
  kpi.tone === 'neutral' ? (
    kpi.subtitle
  ) : (
    <span className={TONE_CLASS[kpi.tone]}>{kpi.subtitle}</span>
  );

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

// Small inline marker for the static channel panels (WeChat / Email) that are
// not yet wired to the engagement service (D-2 / Marketplace precedent).
const SampleDataNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 mb-1">
    <StatusPill variant="neutral">Sample data</StatusPill>
    <span className="text-xs text-text-tertiary">{children}</span>
  </div>
);

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

const ChatThread: React.FC<{
  conv: Conversation;
  messages: ChatMessage[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}> = ({ conv, messages, loading, error, onRetry }) => {
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
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 px-6">
            <AlertTriangle size={20} className="text-danger" aria-hidden="true" />
            <div className="text-sm text-text-secondary">
              Couldn't load this conversation.
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-teal font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-tertiary text-sm gap-2">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Loading conversation…
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <Bubble key={m.id} msg={m} />
            ))}
            <div className="bg-teal-soft border border-teal/30 rounded-md px-3 py-2 mt-2 text-xs text-text-primary">
              ℹ️ This conversation was handled{' '}
              <strong>100% automatically</strong> by Paragon's WhatsApp AI. No
              human intervention required. All SAP updates completed in real-time.
            </div>
          </>
        )}
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

const ConversationsTab: React.FC<{ conversations: Conversation[] }> = ({
  conversations,
}) => {
  const [selectedId, setSelectedId] = useState<string>(conversations[0]?.id ?? '');
  const selected =
    conversations.find((c) => c.id === selectedId) ?? conversations[0];
  const threadQuery = useConversationThread(selected.id);
  const messages = threadQuery.data?.items ?? [];

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
        {conversations.map((conv) => (
          <ConvItem
            key={conv.id}
            conv={conv}
            selected={selected.id === conv.id}
            onClick={() => setSelectedId(conv.id)}
          />
        ))}
      </div>
      <div className="flex flex-col overflow-hidden">
        <ChatThread
          conv={selected}
          messages={messages}
          loading={threadQuery.isPending}
          error={threadQuery.isError}
          onRetry={() => threadQuery.refetch()}
        />
      </div>
    </div>
  );
};

const AutomationTab: React.FC<{ rules: AutomationRule[] }> = ({ rules }) => {
  const { toast } = useToast();
  // Toggle state stays page-local — real mutation lands in Phase 2′.
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(rules.map((r) => [r.rule, r.autoHandle])),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-section text-text-primary">
          WhatsApp automation rules
        </h3>
        <p className="text-sm text-text-tertiary mt-1">
          Configure what Paragon AI handles automatically vs. escalates to
          humans.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {rules.map((rule) => {
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
                <div className="inline-block bg-warning-soft rounded px-2 py-1 text-[11px] text-warning-hover">
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

const AnalyticsTab: React.FC<{
  summary: EngagementSummary;
  dailyMsgs: DailyMessageRow[];
  ruleRates: RuleRate[];
  responseTable: ResponseRow[];
}> = ({ summary, dailyMsgs, ruleRates, responseTable }) => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      <KpiCard
        eyebrow="Messages Sent (Month)"
        value={summary.messagesThisMonth.value}
        subtitle={kpiSubtitle(summary.messagesThisMonth)}
        icon={Send}
      />
      <KpiCard
        eyebrow="Automated Actions"
        value={summary.automatedActions.value}
        subtitle={kpiSubtitle(summary.automatedActions)}
        icon={Bot}
      />
      <KpiCard
        eyebrow="Avg Response Time"
        value={summary.analyticsAvgResponse.value}
        subtitle={kpiSubtitle(summary.analyticsAvgResponse)}
        icon={Clock}
      />
      <KpiCard
        eyebrow="Supplier Satisfaction"
        value={summary.satisfaction.value}
        subtitle={kpiSubtitle(summary.satisfaction)}
        icon={Sparkles}
      />
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
        <h3 className="text-section text-text-primary mb-4">
          Daily message volume (last 14 days)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyMsgs} barSize={10}>
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
        <h3 className="text-section text-text-primary mb-4">
          Automation success rate by rule
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={ruleRates} layout="vertical" barSize={14}>
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
              {ruleRates.map((r) => (
                <Cell key={r.rule} fill={rateColor(r.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>

    <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle">
        <h3 className="text-section text-text-primary">
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
          {responseTable.map((r) => {
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
                <TableCell className="text-warning-hover">{r.slowest}</TableCell>
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
      <SampleDataNote>
        WeChat channel wires to the engagement service in a later batch.
      </SampleDataNote>
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
      <SampleDataNote>
        Email channel wires to the engagement service in a later batch.
      </SampleDataNote>
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
          <div className="bg-bg-surface border-b-2 border-teal px-5 py-3 flex items-center justify-between">
            <span className="text-navy font-bold text-sm tracking-widest">
              PARAGONCORP
            </span>
            <span className="text-text-tertiary text-xs">
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

  const summaryQuery = useEngagementSummary();
  const conversationsQuery = useConversations();
  const rulesQuery = useAutomationRules();
  const dailyQuery = useDailyMessages();
  const ruleRatesQuery = useRuleRates();
  const responseQuery = useResponseTimes();

  const summary = summaryQuery.data ?? null;
  const conversations = conversationsQuery.data?.items ?? [];
  const rules = rulesQuery.data?.items ?? [];
  const dailyMsgs = dailyQuery.data?.items ?? [];
  const ruleRates = ruleRatesQuery.data?.items ?? [];
  const responseTable = responseQuery.data?.items ?? [];

  const queries = [
    summaryQuery,
    conversationsQuery,
    rulesQuery,
    dailyQuery,
    ruleRatesQuery,
    responseQuery,
  ];
  const anyPending = queries.some((q) => q.isPending);
  const anyError = queries.some((q) => q.isError);
  const allEmpty =
    !summary &&
    conversations.length === 0 &&
    rules.length === 0 &&
    dailyMsgs.length === 0 &&
    ruleRates.length === 0 &&
    responseTable.length === 0;

  const lastUpdated = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (anyPending) return <LoadingState breadcrumb={ENGAGEMENT_CRUMB} />;
  if (anyError)
    return (
      <ErrorState
        breadcrumb={ENGAGEMENT_CRUMB}
        error={queries.find((q) => q.isError)?.error}
        onRetry={() => queries.forEach((q) => q.refetch())}
      />
    );
  if (allEmpty || !summary)
    return (
      <EmptyState
        breadcrumb={ENGAGEMENT_CRUMB}
        title="No conversations yet"
        subtitle="The communications hub is a buyer-side view."
        message="Supplier WhatsApp, Email, and WeChat threads appear here for buyer accounts."
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={ENGAGEMENT_CRUMB}
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
            {/* WA-CONNECT-01: no live 360dialog BSP connection exists yet, so
                this is an honest "simulated" marker (amber, static) rather than
                a green CONNECTED badge that would claim a live Business API link. */}
            <div className="inline-flex items-center gap-2 bg-bg-surface border border-border-subtle rounded-full px-3 py-1.5 shadow-sm">
              <span
                className="inline-block w-2 h-2 rounded-full bg-warning"
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-text-secondary">
                Simulated — 360dialog (Phase 4′)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
            <KpiCard
              eyebrow="Active Conversations"
              value={summary.activeConversations.value}
              subtitle={kpiSubtitle(summary.activeConversations)}
              icon={MessageCircle}
            />
            <KpiCard
              eyebrow="Pending Responses"
              value={summary.pendingResponses.value}
              subtitle={kpiSubtitle(summary.pendingResponses)}
              icon={Clock}
            />
            <KpiCard
              eyebrow="Automated Today"
              value={summary.automatedToday.value}
              subtitle={kpiSubtitle(summary.automatedToday)}
              icon={Bot}
            />
            <KpiCard
              eyebrow="Avg Response Time"
              value={summary.hubAvgResponse.value}
              subtitle={kpiSubtitle(summary.hubAvgResponse)}
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

          {waTab === 'conversations' &&
            (conversations.length > 0 ? (
              <ConversationsTab conversations={conversations} />
            ) : (
              <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm px-6 py-10 text-center text-sm text-text-tertiary">
                No active conversations.
              </div>
            ))}
          {waTab === 'automation' && <AutomationTab rules={rules} />}
          {waTab === 'analytics' && (
            <AnalyticsTab
              summary={summary}
              dailyMsgs={dailyMsgs}
              ruleRates={ruleRates}
              responseTable={responseTable}
            />
          )}
        </>
      )}

      {channel === 'email' && <EmailPanel />}
      {channel === 'wechat' && <WeChatPanel />}
    </AppShellV2>
  );
};

export default BuyerWhatsAppHub;
