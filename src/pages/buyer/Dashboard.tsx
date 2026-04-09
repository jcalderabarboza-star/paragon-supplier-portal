import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockInventory } from '../../data/mockInventory';
import { mockTrendData, mockKpisByCategory } from '../../data/mockKpis';
import { POStatus, ChannelType } from '../../types/purchaseOrder.types';
import { StockStatus, ScorecardGrade } from '../../types/supplier.types';

const NAVY    = '#0D1B2A';
const NAVY2   = '#152236';
const TEAL    = '#0097A7';
const MID     = '#354A5F';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0A6ED1';

function useDerivedData() {
  return useMemo(() => {
    const pos = mockPurchaseOrders;
    const suppliers = mockSuppliers;
    const inventory = mockInventory;

    const openPOs = pos.filter(p => ![POStatus.CLOSED, POStatus.DELIVERED].includes(p.status));
    const unacknowledged = pos.filter(p => p.status === POStatus.SENT && p.acknowledgmentTimeHours > 48);
    const overduePOs = pos.filter(p => p.daysOverdue > 0);
    const totalSpend = pos.reduce((a, b) => a + b.totalValue, 0);
    const deliveredOnTime = pos.filter(p => p.status === POStatus.DELIVERED && p.daysOverdue <= 0).length;
    const delivered = pos.filter(p => p.status === POStatus.DELIVERED).length;
    const otif = delivered > 0 ? Math.round((deliveredOnTime / delivered) * 100) : 0;

    const poFunnel = [
      { status: 'Sent',       count: pos.filter(p => p.status === POStatus.SENT).length,               color: WARNING },
      { status: 'Viewed',     count: pos.filter(p => p.status === POStatus.VIEWED).length,              color: INFO },
      { status: "Ack'd",      count: pos.filter(p => p.status === POStatus.ACKNOWLEDGED).length,        color: '#5B21B6' },
      { status: 'Confirmed',  count: pos.filter(p => p.status === POStatus.CONFIRMED).length,           color: TEAL },
      { status: 'Part. Del.', count: pos.filter(p => p.status === POStatus.PARTIALLY_DELIVERED).length, color: INFO },
      { status: 'Delivered',  count: pos.filter(p => p.status === POStatus.DELIVERED).length,           color: SUCCESS },
      { status: 'Closed',     count: pos.filter(p => p.status === POStatus.CLOSED).length,              color: MUTED },
    ];

    const activeSuppliers = suppliers.filter(s => s.status === 'Active').length;
    const gradeD = suppliers.filter(s => s.scorecardGrade === ScorecardGrade.D || s.scorecardGrade === ScorecardGrade.F);
    const expiringCerts = suppliers.filter(s => {
      const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
      return days <= 180;
    });
    const expiredCerts = suppliers.filter(s => {
      const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
      return days <= 0;
    });
    const avgOTIF = Math.round(suppliers.reduce((a, b) => a + b.otif, 0) / suppliers.length);

    const channelCounts = pos.reduce((acc, p) => {
      acc[p.channel] = (acc[p.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const channelData = Object.entries(channelCounts).map(([name, value]) => ({ name, value }));

    const criticalStock = inventory.filter(i => i.stockStatus === StockStatus.CRITICAL);
    const lowStock = inventory.filter(i => i.stockStatus === StockStatus.LOW);

    const productionRisk = criticalStock.filter(item => {
      const hasCoveringPO = pos.some(p =>
        p.supplierId === item.supplierId &&
        [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED, POStatus.CONFIRMED].includes(p.status) &&
        p.lineItems.some(li => li.materialCode === item.materialCode)
      );
      return !hasCoveringPO;
    });

    const warRoomActive =
      productionRisk.length > 0 ||
      unacknowledged.length > 0 ||
      expiredCerts.length > 0 ||
      gradeD.length > 0 ||
      overduePOs.filter(p => p.daysOverdue > 30).length > 0;

    const actionQueue = [
      ...unacknowledged.map(p => ({
        id: p.id, type: 'PO Unacknowledged' as const,
        severity: 'critical' as const,
        title: `${p.poNumber} unacknowledged ${p.acknowledgmentTimeHours}h`,
        supplier: p.supplierName,
        detail: `Requested delivery: ${p.requestedDeliveryDate}`,
        path: '/buyer/purchase-orders',
      })),
      ...expiredCerts.map(s => ({
        id: s.id, type: 'Cert Expired' as const,
        severity: 'critical' as const,
        title: `${s.name} — cert expired`,
        supplier: s.name,
        detail: `Expired: ${s.certExpiryDate}`,
        path: '/buyer/suppliers',
      })),
      ...productionRisk.map(i => ({
        id: i.id, type: 'Production Risk' as const,
        severity: 'critical' as const,
        title: `${i.materialCode} — ${i.daysOfSupply}d supply left`,
        supplier: i.supplierName,
        detail: `No covering PO · ${i.materialDescription.slice(0, 40)}`,
        path: '/buyer/inventory',
      })),
      ...overduePOs.filter(p => p.daysOverdue > 0 && p.daysOverdue <= 30).map(p => ({
        id: p.id, type: 'PO Overdue' as const,
        severity: 'warning' as const,
        title: `${p.poNumber} ${p.daysOverdue}d overdue`,
        supplier: p.supplierName,
        detail: `Status: ${p.status}`,
        path: '/buyer/purchase-orders',
      })),
      ...expiringCerts.filter(s => {
        const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
        return days > 0 && days <= 90;
      }).map(s => ({
        id: s.id + '-exp', type: 'Cert Expiring' as const,
        severity: 'warning' as const,
        title: `${s.name} — cert expiring soon`,
        supplier: s.name,
        detail: `Expires: ${s.certExpiryDate}`,
        path: '/buyer/suppliers',
      })),
    ];

    return {
      pos, openPOs, unacknowledged, overduePOs, totalSpend,
      otif, avgOTIF, activeSuppliers, gradeD, expiringCerts, expiredCerts,
      criticalStock, lowStock, productionRisk, poFunnel, channelData,
      warRoomActive, actionQueue,
    };
  }, []);
}

function fmt(n: number) { return `Rp ${(n / 1_000_000_000).toFixed(1)}B`; }

function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 9px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function SectionLabel({ children, color = TEAL }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      {children}
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: NAVY }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.color ?? TEAL }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

function KpiTile({ label, value, sub, trend, trendUp, color, alert, onClick }: {
  label: string; value: string | number; sub?: string;
  trend?: string; trendUp?: boolean | null;
  color?: string; alert?: boolean; onClick?: () => void;
}) {
  const c = color ?? TEAL;
  return (
    <div onClick={onClick} style={{
      background: 'white', border: `1px solid ${alert ? ERROR : BORDER}`,
      borderLeft: `4px solid ${alert ? ERROR : c}`,
      borderRadius: 8, padding: '16px 18px',
      boxShadow: alert ? '0 0 0 2px rgba(187,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: alert ? ERROR : c, lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: MUTED }}>{sub}</span>}
      </div>
      {trend && (
        <div style={{ fontSize: 11, color: trendUp === true ? SUCCESS : trendUp === false ? ERROR : MUTED, fontWeight: 500 }}>
          {trendUp === true ? '▲' : trendUp === false ? '▼' : '→'} {trend}
        </div>
      )}
    </div>
  );
}

function WarRoomBanner({ items, onEscalate }: {
  items: ReturnType<typeof useDerivedData>['actionQueue'];
  onEscalate: (id: string) => void;
}) {
  const critical = items.filter(i => i.severity === 'critical');
  const warning  = items.filter(i => i.severity === 'warning');
  return (
    <div style={{ background: 'linear-gradient(135deg, #1a0000 0%, #2d0a0a 100%)', border: `1px solid ${ERROR}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 24px rgba(187,0,0,0.2)' }}>
      <div style={{ background: ERROR, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase' }}>
            WAR ROOM — {critical.length} Critical · {warning.length} Warning
          </span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '1px' }}>
          {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {critical.map(item => (
          <div key={item.id} style={{ background: 'rgba(187,0,0,0.15)', border: '1px solid rgba(187,0,0,0.3)', borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {item.type === 'Production Risk' ? '🏭' : item.type === 'PO Unacknowledged' ? '📄' : item.type === 'Cert Expired' ? '📋' : '⚠️'}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FCA5A5' }}>{item.title}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{item.supplier} · {item.detail}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Pill label={item.type} bg="rgba(187,0,0,0.3)" color="#FCA5A5" />
              <button onClick={() => onEscalate(item.id)} style={{ background: ERROR, color: 'white', border: 'none', borderRadius: 5, padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ESCALATE
              </button>
            </div>
          </div>
        ))}
        {warning.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            {warning.map(item => (
              <div key={item.id} style={{ background: 'rgba(233,115,12,0.15)', border: '1px solid rgba(233,115,12,0.3)', borderRadius: 5, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#FCD34D', fontWeight: 600 }}>⚠ {item.title}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>· {item.supplier}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const d = useDerivedData();
  const [toast, setToast] = useState<string | null>(null);
  const [escalated, setEscalated] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const handleEscalate = (id: string) => {
    setEscalated(prev => new Set([...prev, id]));
    showToast('Escalation sent — WhatsApp + email notification dispatched to supplier and procurement lead');
  };

  const now = new Date();
  const timeStr = now.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const gradeData = ['A', 'B', 'C', 'D'].map(g => ({
    grade: g,
    count: mockSuppliers.filter(s => s.scorecardGrade === g).length,
    color: g === 'A' ? SUCCESS : g === 'B' ? INFO : g === 'C' ? WARNING : ERROR,
  }));

  const catOTIF = mockKpisByCategory.map(c => ({
    name: c.category.replace('Raw Material', 'Raw Mat.').replace('Active Ingredient', 'Active Ing.'),
    otif: c.otif, target: 95,
  }));

  const productionLines = [
    { line: 'Line 1 — Wardah Moisturizing',  risk: d.productionRisk.some(r => r.materialCode.startsWith('FR-WARD')), daysLeft: 5,  sku: 'FR-WARD-4410' },
    { line: 'Line 2 — Emina Bright Stuff',   risk: d.productionRisk.some(r => r.materialCode.startsWith('FR-EMIN')), daysLeft: 3,  sku: 'FR-EMIN-4420' },
    { line: 'Line 3 — Make Over Foundation', risk: false, daysLeft: 18, sku: '' },
    { line: 'Line 4 — Scarlett Body Lotion', risk: d.productionRisk.some(r => r.materialCode === 'RM-EMUL-3320'), daysLeft: 6, sku: 'RM-EMUL-3320' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY, color: 'white', padding: '0.75rem 1.25rem', borderRadius: 8, zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontSize: 13, borderLeft: `3px solid ${TEAL}`, maxWidth: 360 }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 2 }}>Procurement Command Center</div>
          <div style={{ fontSize: 12, color: MUTED }}>
            Paragon Corp · Odyssey Program · Live as of {timeStr}
            <span style={{ marginLeft: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.warRoomActive ? ERROR : SUCCESS, display: 'inline-block' }} />
              <span style={{ color: d.warRoomActive ? ERROR : SUCCESS, fontWeight: 600 }}>
                {d.warRoomActive ? `${d.actionQueue.filter(i => i.severity === 'critical').length} Critical Alerts` : 'All Systems Normal'}
              </span>
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('Executive PDF report generating...')} style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', fontFamily: 'inherit' }}>
            📥 Export Briefing
          </button>
          <button onClick={() => navigate('/buyer/analytics')} style={{ background: TEAL, border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
            📊 Full Analytics
          </button>
        </div>
      </div>

      {d.warRoomActive && <WarRoomBanner items={d.actionQueue} onEscalate={handleEscalate} />}

      <SectionLabel color={NAVY}>Layer 1 — Strategic · C-Level & Directors</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <KpiTile label="Total Spend YTD" value={fmt(d.totalSpend)} trend="+8.4% vs last year" trendUp={true} color={TEAL} onClick={() => navigate('/buyer/analytics')} />
        <KpiTile label="Portfolio OTIF" value={`${d.otif}%`} trend="Target ≥ 95% · 8pp gap" trendUp={false} color={WARNING} alert={d.otif < 90} onClick={() => navigate('/buyer/analytics')} />
        <KpiTile label="Active Suppliers" value={d.activeSuppliers} sub={`/ ${mockSuppliers.length} total`} trend={`${mockSuppliers.filter(s => s.status === 'Onboarding').length} onboarding`} trendUp={null} color={TEAL} onClick={() => navigate('/buyer/suppliers')} />
        <KpiTile label="Open Purchase Orders" value={d.openPOs.length} sub="active" trend={`${d.unacknowledged.length} unacknowledged >48h`} trendUp={d.unacknowledged.length === 0} color={d.unacknowledged.length > 0 ? ERROR : TEAL} alert={d.unacknowledged.length > 0} onClick={() => navigate('/buyer/purchase-orders')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>🏭 Production Line Risk</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>RM/PM supply coverage vs active production schedule</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {productionLines.map(line => (
              <div key={line.line} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: line.risk ? 'rgba(187,0,0,0.04)' : '#F8FAFC', border: `1px solid ${line.risk ? 'rgba(187,0,0,0.2)' : BORDER}`, borderRadius: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{line.line}</div>
                  {line.risk && <div style={{ fontSize: 10, color: ERROR, marginTop: 1 }}>⚠ Critical material {line.sku} — {line.daysLeft}d supply left</div>}
                </div>
                <Pill label={line.risk ? `AT RISK · ${line.daysLeft}d` : 'COVERED'} bg={line.risk ? '#FEE2E2' : '#DCFCE7'} color={line.risk ? ERROR : SUCCESS} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>Phase 3 — Live SAP PP integration · IBP Demand signal sync</div>
        </div>

        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>🏅 Supplier Health Index</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>Portfolio grade distribution · Avg OTIF {d.avgOTIF}%</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {gradeData.map(({ grade, count, color }) => (
              <div key={grade} onClick={() => navigate('/buyer/suppliers')} style={{ flex: 1, textAlign: 'center', cursor: 'pointer', background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 8, padding: '12px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '1px' }}>Grade {grade}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={catOTIF} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 9 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="otif" fill={TEAL} radius={[3, 3, 0, 0]} name="OTIF %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionLabel color={MID}>Layer 2 — Tactical · VP SCM & Procurement Managers</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>📄 PO Pipeline — Live Status</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>{mockPurchaseOrders.length} purchase orders · derived from live data</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {d.poFunnel.map(({ status, count, color }) => {
              const pct = Math.round((count / mockPurchaseOrders.length) * 100);
              return (
                <div key={status} onClick={() => navigate('/buyer/purchase-orders')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div style={{ width: 72, fontSize: 11, color: MUTED, textAlign: 'right', flexShrink: 0 }}>{status}</div>
                  <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                    <div style={{ width: count === 0 ? '0%' : `${Math.max(pct, 4)}%`, background: color, height: '100%', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                      {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>{count}</span>}
                    </div>
                  </div>
                  <div style={{ width: 28, fontSize: 10, color: MUTED, textAlign: 'right', flexShrink: 0 }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>📦 Critical & Low Stock</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>{d.criticalStock.length} critical (&lt;7d) · {d.lowStock.length} low (7–14d)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...d.criticalStock, ...d.lowStock].slice(0, 6).map(item => {
              const isCritical = item.stockStatus === StockStatus.CRITICAL;
              return (
                <div key={item.id} onClick={() => navigate('/buyer/inventory')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: isCritical ? 'rgba(187,0,0,0.04)' : 'rgba(233,115,12,0.04)', border: `1px solid ${isCritical ? 'rgba(187,0,0,0.15)' : 'rgba(233,115,12,0.15)'}`, borderRadius: 5, cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, fontFamily: 'var(--font-mono)' }}>{item.materialCode}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{item.supplierName.split(' ').slice(0, 2).join(' ')}</div>
                  </div>
                  <Pill label={`${item.daysOfSupply}d left`} bg={isCritical ? '#FEE2E2' : '#FEF3C7'} color={isCritical ? ERROR : WARNING} />
                </div>
              );
            })}
          </div>
          <button onClick={() => navigate('/buyer/inventory')} style={{ marginTop: 12, width: '100%', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '6px', fontSize: 11, fontWeight: 600, color: TEAL, cursor: 'pointer', fontFamily: 'inherit' }}>
            View All Inventory →
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>📈 OTIF & OTDR — 6-Month Trend</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>On-time in-full vs on-time delivery rate · Target 95%</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mockTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis domain={[78, 96]} tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="otif" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} name="OTIF %" />
              <Line type="monotone" dataKey="otdr" stroke={NAVY} strokeWidth={2} dot={{ r: 3 }} name="OTDR %" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>📱 Channel Mix</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>PO confirmations by channel</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={d.channelData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" nameKey="name">
                {d.channelData.map((entry, i) => (
                  <Cell key={i} fill={entry.name === ChannelType.WHATSAPP ? '#25D366' : entry.name === ChannelType.EMAIL ? '#EA4335' : entry.name === ChannelType.WEB ? INFO : MID} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} POs`, '']} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionLabel color={MUTED}>Layer 3 — Operational · Procurement Officers · Live Action Queue</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>⚡ Action Queue — Today</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>{d.actionQueue.length} items require attention · click to navigate</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.actionQueue.map(item => (
              <div key={item.id} onClick={() => navigate(item.path)} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 12px', background: item.severity === 'critical' ? 'rgba(187,0,0,0.04)' : 'rgba(233,115,12,0.04)', border: `1px solid ${item.severity === 'critical' ? 'rgba(187,0,0,0.2)' : 'rgba(233,115,12,0.2)'}`, borderLeft: `3px solid ${item.severity === 'critical' ? ERROR : WARNING}`, borderRadius: 5, cursor: 'pointer', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{item.supplier} · {item.detail}</div>
                </div>
                <Pill label={item.type} bg={item.severity === 'critical' ? '#FEE2E2' : '#FEF3C7'} color={item.severity === 'critical' ? ERROR : WARNING} />
              </div>
            ))}
            {d.actionQueue.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: SUCCESS, fontSize: 13 }}>✅ No actions required — all clear</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>📬 Unacknowledged POs (&gt;48h)</div>
            {d.unacknowledged.length === 0 ? (
              <div style={{ color: SUCCESS, fontSize: 12 }}>✅ All POs acknowledged</div>
            ) : d.unacknowledged.map(po => (
              <div key={po.id} onClick={() => navigate('/buyer/purchase-orders')} style={{ padding: '8px 10px', marginBottom: 6, cursor: 'pointer', background: '#FEF9C3', border: '1px solid #FCD34D', borderRadius: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{po.poNumber}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{po.supplierName} · {po.acknowledgmentTimeHours}h since sent</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 14 }}>📋 Compliance Alerts</div>
            {d.expiredCerts.map(s => (
              <div key={s.id} onClick={() => navigate('/buyer/suppliers')} style={{ padding: '8px 10px', marginBottom: 6, cursor: 'pointer', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: ERROR }}>{s.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>Certificate EXPIRED · {s.certExpiryDate}</div>
              </div>
            ))}
            {d.expiringCerts.filter(s => {
              const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
              return days > 0 && days <= 90;
            }).map(s => (
              <div key={s.id + 'exp'} onClick={() => navigate('/buyer/suppliers')} style={{ padding: '8px 10px', marginBottom: 6, cursor: 'pointer', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: WARNING }}>{s.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>Cert expires {s.certExpiryDate}</div>
              </div>
            ))}
            {d.expiredCerts.length === 0 && d.expiringCerts.filter(s => {
              const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
              return days > 0 && days <= 90;
            }).length === 0 && (
              <div style={{ color: SUCCESS, fontSize: 12 }}>✅ All certifications current</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${NAVY2} 0%, #1a2f4a 100%)`, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>IBP Brain Engine — Demand Signal</div>
            <div style={{ fontSize: 10, color: '#8DA4BC' }}>Next S&OP cycle: 14 Apr 2026 · IBP Demand module active · IBP Inventory planned Q3 2026</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill label="IBP Demand — Live" bg="rgba(0,151,167,0.2)" color={TEAL} />
          <Pill label="IBP Inventory — Roadmap" bg="rgba(255,255,255,0.08)" color="#8DA4BC" />
          <Pill label="aATP — Future" bg="rgba(255,255,255,0.05)" color="#64748B" />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
