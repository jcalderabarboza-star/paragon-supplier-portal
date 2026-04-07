import React from 'react';
import { Card, CardHeader, Text, Icon } from '@ui5/webcomponents-react';
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
  neutral: '#354A5F',
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
      <Card
        header={<CardHeader titleText={kpi.label} />}
        style={{ minWidth: '200px' }}
      >
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <Text style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kpi.value}</Text>
          {kpi.unit && <Text style={{ marginLeft: '0.25rem' }}>{kpi.unit}</Text>}
          {typeof kpi.trend === 'number' && kpi.trend !== 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <Text style={{ color: trendColor }}>
                {kpi.trend > 0 ? '▲' : '▼'} {Math.abs(kpi.trend)}%
              </Text>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // New typed branch
  const { title, value, unit, trend, trendValue, status, icon, subtitle } = props;
  const statusColor = STATUS_COLORS[status] ?? '#354A5F';
  const trendSymbol = TREND_SYMBOL[trend];
  const trendColor =
    trend === 'up' ? '#107E3E' : trend === 'down' ? '#BB0000' : '#6c757d';

  return (
    <Card
      header={
        <CardHeader
          titleText={title}
          avatar={<Icon name={icon} style={{ color: statusColor, fontSize: '1.25rem' }} />}
        />
      }
      style={{ flex: 1, minWidth: '200px' }}
    >
      <div style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
          <Text style={{ fontSize: '2rem', fontWeight: 'bold', color: statusColor }}>
            {value}
          </Text>
          {unit && (
            <Text style={{ fontSize: '1rem', color: '#6c757d' }}>{unit}</Text>
          )}
        </div>
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Text style={{ color: trendColor, fontSize: '0.875rem' }}>
            {trendSymbol} {trendValue}
          </Text>
          {subtitle && (
            <Text style={{ color: '#6c757d', fontSize: '0.75rem' }}>{subtitle}</Text>
          )}
        </div>
      </div>
    </Card>
  );
};

export default KpiCard;
