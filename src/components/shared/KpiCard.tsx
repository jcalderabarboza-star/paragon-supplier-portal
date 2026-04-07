import React from 'react';
import { KpiItem } from '../../types/kpi.types';

// ─── New typed props ──────────────────────────────────────────────────────────

export interface KpiCardNewProps {
  title: string;
  value: string | number;
  unit?: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  status: 'success' | 'warning' | 'error' | 'neutral';
  icon: string;
  subtitle?: string;
}

// ─── Legacy props (kept for backward compat with SupplierDashboard) ───────────

interface KpiCardLegacyProps {
  kpi: KpiItem;
}

type KpiCardProps = KpiCardNewProps | KpiCardLegacyProps;

// ─── Status / trend helpers ───────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  success: '#107E3E',
  warning: '#E9730C',
  error: '#BB0000',
  neutral: '#0097A7',
};

const TREND_SYMBOL: Record<string, string> = {
  up: '▲',
  down: '▼',
  flat: '→',
};

// ─── Component ────────────────────────────────────────────────────────────────

const KpiCard: React.FC<KpiCardProps> = (props) => {
  // Legacy branch — derive display values from KpiItem
  if ('kpi' in props) {
    const { kpi } = props;
    const isPositive = typeof kpi.trend === 'number' && kpi.trend > 0;
    const trendColor = isPositive ? '#107E3E' : kpi.trend === 0 ? '#6c757d' : '#BB0000';
    return (
      <div style={{
        background: 'white', borderRadius: '8px', minWidth: '200px', flex: 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        borderLeft: '4px solid #0097A7', overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            {kpi.label}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0097A7', lineHeight: 1 }}>
            {kpi.value}
            {kpi.unit && <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748B', marginLeft: '4px' }}>{kpi.unit}</span>}
          </div>
          {typeof kpi.trend === 'number' && kpi.trend !== 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: trendColor, fontWeight: 500 }}>
              {kpi.trend > 0 ? '▲' : '▼'} {Math.abs(kpi.trend)}%
            </div>
          )}
        </div>
      </div>
    );
  }

  // New typed branch
  const { title, value, unit, trend, trendValue, status, subtitle } = props;
  const statusColor = STATUS_COLORS[status] ?? '#0097A7';
  const trendSymbol = TREND_SYMBOL[trend];
  const trendColor =
    trend === 'up' ? '#107E3E' : trend === 'down' ? '#BB0000' : '#6c757d';

  return (
    <div style={{
      background: 'white', borderRadius: '8px', flex: 1, minWidth: '200px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      borderLeft: `4px solid ${statusColor}`, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: statusColor, lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>{unit}</span>}
        </div>
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: trendColor, fontSize: '12px', fontWeight: 600 }}>
            {trendSymbol} {trendValue}
          </span>
          {subtitle && (
            <span style={{ color: '#94A3B8', fontSize: '11px' }}>{subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KpiCard;
