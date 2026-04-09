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
