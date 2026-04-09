import React, { useState } from 'react';
import { mockInventory } from '../../data/mockInventory';
import { StockStatus } from '../../types/supplier.types';

const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MID    = '#354A5F';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

const STATUS_CFG: Record<StockStatus, { bg: string; color: string; label: string; bar: string }> = {
  [StockStatus.CRITICAL]: { bg: '#FEE2E2', color: '#991B1B', label: 'Critical', bar: '#BB0000' },
  [StockStatus.LOW]:      { bg: '#FEF3C7', color: '#92400E', label: 'Low',      bar: '#E9730C' },
  [StockStatus.NORMAL]:   { bg: '#DCFCE7', color: '#166534', label: 'Normal',   bar: '#107E3E' },
  [StockStatus.EXCESS]:   { bg: '#EDE9FE', color: '#5B21B6', label: 'Excess',   bar: '#5B21B6' },
};

const SOURCE_STYLE: Record<string, [string, string]> = {
  'API Push': ['#EFF6FF', '#1E40AF'],
  'EDI 846':  ['#F0FDF4', '#166534'],
  'Manual':   ['#F8FAFC', '#475569'],
};

function fmt(n: number): string { return n.toLocaleString('id-ID'); }
function fmtDate(s: string): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ background: bg, color, borderRadius: 9999, padding: '2px 9px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
}
function DaysBar({ days }: { days: number }) {
  const status: StockStatus = days < 7 ? StockStatus.CRITICAL : days < 14 ? StockStatus.LOW : days <= 30 ? StockStatus.NORMAL : StockStatus.EXCESS;
  const cfg = STATUS_CFG[status];
  const pct = Math.min((days / 45) * 100, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 4, height: 6, minWidth: 60 }}>
        <div style={{ width: `${pct}%`, background: cfg.bar, height: 6, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>{days}d</span>
    </div>
  );
}

const MyInventory: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<StockStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const allInventory = mockInventory;
  const filtered = allInventory.filter(r => {
    const matchStatus = filterStatus === 'All' || r.stockStatus === filterStatus;
    const matchSearch = search === '' ||
      r.materialDescription.toLowerCase().includes(search.toLowerCase()) ||
      r.materialCode.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    critical: allInventory.filter(r => r.stockStatus === StockStatus.CRITICAL).length,
    low:      allInventory.filter(r => r.stockStatus === StockStatus.LOW).length,
    normal:   allInventory.filter(r => r.stockStatus === StockStatus.NORMAL).length,
    excess:   allInventory.filter(r => r.stockStatus === StockStatus.EXCESS).length,
  };

  const STATUSES: Array<StockStatus | 'All'> = ['All', StockStatus.CRITICAL, StockStatus.LOW, StockStatus.NORMAL, StockStatus.EXCESS];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: NAVY, color: 'white', padding: '0.75rem 1.25rem', borderRadius: 8, zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontSize: 13, borderLeft: `3px solid ${TEAL}` }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 4 }}>My Inventory</div>
          <div style={{ fontSize: 13, color: MUTED }}>Live stock visibility · Days-of-supply tracking · Paragon minimum thresholds</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('Syncing inventory from supplier API feeds...')} style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: MID, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Sync Now</button>
          <button onClick={() => showToast('Export preparing... EDI 846 format download starting')} style={{ background: TEAL, border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>📥 Export EDI 846</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {([
          { label: 'Critical Stock', count: counts.critical, color: '#BB0000', bg: '#FEE2E2', filter: StockStatus.CRITICAL },
          { label: 'Low Stock',      count: counts.low,      color: '#E9730C', bg: '#FEF3C7', filter: StockStatus.LOW },
          { label: 'Normal',         count: counts.normal,   color: '#107E3E', bg: '#DCFCE7', filter: StockStatus.NORMAL },
          { label: 'Excess',         count: counts.excess,   color: '#5B21B6', bg: '#EDE9FE', filter: StockStatus.EXCESS },
        ] as const).map(({ label, count, color, bg, filter }) => (
          <div key={label} onClick={() => setFilterStatus(filterStatus === filter ? 'All' : filter as StockStatus)} style={{ background: filterStatus === filter ? bg : 'white', border: `1px solid ${filterStatus === filter ? color : BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: 8, padding: '14px 18px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{count}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{((count / allInventory.length) * 100).toFixed(0)}% of materials</div>
          </div>
        ))}
      </div>

      {counts.critical > 0 && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#991B1B' }}>
          <span>⚠️</span>
          <span><strong>{counts.critical} material{counts.critical > 1 ? 's' : ''}</strong> at critical stock level. Paragon procurement team has been automatically notified.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search material, code, supplier..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 13, color: NAVY, fontFamily: 'inherit', outline: 'none' }} />
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 6, padding: 3, gap: 2 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '5px 12px', border: 'none', borderRadius: 4, background: filterStatus === s ? 'white' : 'transparent', color: filterStatus === s ? NAVY : MUTED, fontWeight: filterStatus === s ? 700 : 500, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', boxShadow: filterStatus === s ? '0 1px 3px rgba(0,0,0,0.1)' : undefined }}>{s}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: MUTED }}>{filtered.length} of {allInventory.length} materials</span>
      </div>

