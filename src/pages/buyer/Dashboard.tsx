import React, { useMemo } from 'react';
import {
  Title,
  Card,
  CardHeader,
  MessageStrip,
  Text,
  Link,
} from '@ui5/webcomponents-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

import KpiCard from '../../components/shared/KpiCard';
import StatusBadge from '../../components/shared/StatusBadge';

// ─── Mock data imports ────────────────────────────────────────────────────────
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { mockInventory } from '../../data/mockInventory';
import {
  mockPortalOverallKpis,
  mockAlerts,
  mockKpisByCategory,
  mockChannelAdoption,
  mockOnboardingFunnel,
} from '../../data/mockKpis';

// ─── Type imports ─────────────────────────────────────────────────────────────
import { SupplierStatus, StockStatus } from '../../types/supplier.types';
import { POStatus, ChannelType } from '../../types/purchaseOrder.types';

// ─── Colour palettes ──────────────────────────────────────────────────────────
const PO_STATUS_COLORS: Record<string, string> = {
  [POStatus.CONFIRMED]: '#107E3E',
  [POStatus.ACKNOWLEDGED]: '#0A6ED1',
  [POStatus.SENT]: '#E9730C',
  [POStatus.DELIVERED]: '#354A5F',
  [POStatus.PARTIALLY_DELIVERED]: '#0097A7',
  [POStatus.VIEWED]: '#6c757d',
  [POStatus.CLOSED]: '#aaaaaa',
};

const CHANNEL_COLORS: Record<string, string> = {
  WhatsApp: '#25D366',
  Email: '#EA4335',
  Web: '#0A6ED1',
  API: '#354A5F',
};

const CHANNEL_EMOJI: Record<ChannelType, string> = {
  [ChannelType.WHATSAPP]: '📱',
  [ChannelType.EMAIL]: '📧',
  [ChannelType.WEB]: '🌐',
  [ChannelType.API]: '⚙️',
};

const FUNNEL_COLORS = ['#B2EBF2', '#0097A7', '#354A5F', '#1A2B3C'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86_400_000
  );
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  // ── Derived data ────────────────────────────────────────────────────────────
  const activeSupplierCount = useMemo(
    () => mockSuppliers.filter((s) => s.status === SupplierStatus.ACTIVE).length,
    []
  );

  const openPOCount = useMemo(
    () => mockPurchaseOrders.filter((po) => po.status !== POStatus.CLOSED).length,
    []
  );

  const poStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const po of mockPurchaseOrders) {
      counts[po.status] = (counts[po.status] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  const channelData = useMemo(
    () => [
      { name: 'WhatsApp', value: mockChannelAdoption.whatsapp },
      { name: 'Email', value: mockChannelAdoption.email },
      { name: 'Web', value: mockChannelAdoption.web },
      { name: 'API', value: mockChannelAdoption.api },
    ],
    []
  );

  const alertInventory = useMemo(
    () =>
      mockInventory
        .filter(
          (inv) =>
            inv.stockStatus === StockStatus.CRITICAL ||
            inv.stockStatus === StockStatus.LOW
        )
        .slice(0, 6),
    []
  );

  const recentPOs = useMemo(
    () =>
      [...mockPurchaseOrders]
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
        .slice(0, 6),
    []
  );

  const funnelSteps = useMemo(
    () => [
      { label: 'Invited', count: mockOnboardingFunnel.invited, color: FUNNEL_COLORS[0] },
      { label: 'Registered', count: mockOnboardingFunnel.registered, color: FUNNEL_COLORS[1] },
      { label: 'Verified', count: mockOnboardingFunnel.verified, color: FUNNEL_COLORS[2] },
      { label: 'Active', count: mockOnboardingFunnel.active, color: FUNNEL_COLORS[3] },
    ],
    []
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Title level="H2">Buyer Dashboard</Title>

      {/* ── Section 1: KPI headline row ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <KpiCard
          title="OTIF"
          value={mockPortalOverallKpis.otif}
          unit="%"
          trend="up"
          trendValue="+1% vs last month"
          status="warning"
          icon="task"
          subtitle="Target: 90%"
        />
        <KpiCard
          title="OTDR"
          value={mockPortalOverallKpis.otdr}
          unit="%"
          trend="up"
          trendValue="+1% vs last month"
          status="success"
          icon="shipping-status"
          subtitle="Target: 90%"
        />
        <KpiCard
          title="Active Suppliers"
          value={activeSupplierCount}
          trend="flat"
          trendValue="No change"
          status="success"
          icon="group"
        />
        <KpiCard
          title="Open POs"
          value={openPOCount}
          trend="up"
          trendValue="+2 this week"
          status="neutral"
          icon="document"
        />
      </div>

      {/* ── Section 2: Alert banners ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {mockAlerts.unacknowledgedPOs > 0 && (
          <MessageStrip design="Negative" hideCloseButton>
            {mockAlerts.unacknowledgedPOs} purchase order
            {mockAlerts.unacknowledgedPOs !== 1 ? 's' : ''} unacknowledged for more than 48
            hours — action required
          </MessageStrip>
        )}
        {mockAlerts.expiringCertificates > 0 && (
          <MessageStrip design="Critical" hideCloseButton>
            {mockAlerts.expiringCertificates} supplier compliance certificate
            {mockAlerts.expiringCertificates !== 1 ? 's' : ''} expiring within 30 days
          </MessageStrip>
        )}
      </div>

      {/* ── Section 3: Two-column layout ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* LEFT — 60% */}
        <div style={{ flex: '3 1 480px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card A — PO Status Overview (donut) */}
          <Card header={<CardHeader titleText="PO Status Overview" />}>
            <div style={{ padding: '1rem' }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={poStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {poStatusData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PO_STATUS_COLORS[entry.name] ?? '#cccccc'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} POs`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Card B — Supplier Performance by Category (grouped bar) */}
          <Card header={<CardHeader titleText="Supplier Performance by Category" />}>
            <div style={{ padding: '1rem' }}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={mockKpisByCategory}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend />
                  <ReferenceLine
                    y={90}
                    stroke="#BB0000"
                    strokeDasharray="6 3"
                    label={{ value: '90% target', position: 'right', fontSize: 11, fill: '#BB0000' }}
                  />
                  <Bar dataKey="otif" name="OTIF" fill="#0097A7" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="otdr" name="OTDR" fill="#354A5F" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* RIGHT — 40% */}
        <div style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Card C — Channel Adoption (horizontal bar) */}
          <Card header={<CardHeader titleText="Channel Adoption" />}>
            <div style={{ padding: '1rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={channelData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 20, bottom: 4 }}
                >
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="value" name="Share" radius={[0, 3, 3, 0]}>
                    {channelData.map((entry) => (
                      <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] ?? '#999'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Card D — Onboarding Funnel */}
          <Card header={<CardHeader titleText="Onboarding Funnel" />}>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {funnelSteps.map((step) => {
                const ratio = step.count / mockOnboardingFunnel.invited;
                return (
                  <div key={step.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <Text style={{ fontSize: '0.875rem', fontWeight: '600' }}>{step.label}</Text>
                      <Text style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                        {step.count} ({Math.round(ratio * 100)}%)
                      </Text>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        borderRadius: '4px',
                        background: '#e9ecef',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${ratio * 100}%`,
                          background: step.color,
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Section 4: Full-width, two cards side by side ──────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Card E — Critical & Low Stock Alerts */}
        <Card
          header={<CardHeader titleText="Critical & Low Stock Alerts" />}
          style={{ flex: '1 1 480px' }}
        >
          <div style={{ padding: '0 1rem 1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: 600 }}>
                    Material
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: 600 }}>
                    Supplier
                  </th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: 600 }}>
                    Days of Supply
                  </th>
                  <th style={{ textAlign: 'center', padding: '0.5rem 0.25rem', color: '#6c757d', fontWeight: 600 }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {alertInventory.map((inv) => (
                  <tr
                    key={inv.id}
                    style={{
                      background:
                        inv.stockStatus === StockStatus.CRITICAL
                          ? '#fff0f0'
                          : '#fff8f0',
                      borderBottom: '1px solid #dee2e6',
                    }}
                  >
                    <td style={{ padding: '0.5rem 0.25rem' }}>
                      <div>{inv.materialDescription}</div>
                      <div style={{ color: '#6c757d', fontSize: '0.75rem' }}>{inv.materialCode}</div>
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', color: '#354A5F' }}>
                      {inv.supplierName}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem 0.25rem',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: inv.stockStatus === StockStatus.CRITICAL ? '#BB0000' : '#E9730C',
                      }}
                    >
                      {inv.daysOfSupply}d
                    </td>
                    <td style={{ padding: '0.5rem 0.25rem', textAlign: 'center' }}>
                      <StatusBadge status={inv.stockStatus.toLowerCase()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
              <Link href="#/buyer/inventory">View All Inventory →</Link>
            </div>
          </div>
        </Card>

        {/* Card F — Recent PO Activity */}
        <Card
          header={<CardHeader titleText="Recent Purchase Orders" />}
          style={{ flex: '1 1 380px' }}
        >
          <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {recentPOs.map((po, idx) => (
              <div
                key={po.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 0',
                  borderBottom: idx < recentPOs.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                  {CHANNEL_EMOJI[po.channel]}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {po.supplierName}
                  </div>
                  <div style={{ color: '#6c757d', fontSize: '0.75rem' }}>{po.poNumber}</div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <StatusBadge status={po.status.toLowerCase().replace(' ', '_')} />
                </div>
                <div style={{ flexShrink: 0, color: '#6c757d', fontSize: '0.75rem', minWidth: '72px', textAlign: 'right' }}>
                  {daysAgo(po.orderDate)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
