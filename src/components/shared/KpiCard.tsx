import React from 'react';
import { Card, CardHeader, Text } from '@ui5/webcomponents-react';
import { KpiItem } from '../../types/kpi.types';

interface KpiCardProps {
  kpi: KpiItem;
}

const KpiCard: React.FC<KpiCardProps> = ({ kpi }) => {
  return (
    <Card
      header={<CardHeader titleText={kpi.label} />}
      style={{ minWidth: '200px' }}
    >
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <Text style={{ fontSize: '2rem', fontWeight: 'bold' }}>{kpi.value}</Text>
        {kpi.unit && <Text style={{ marginLeft: '0.25rem' }}>{kpi.unit}</Text>}
        {kpi.trend && (
          <div style={{ marginTop: '0.5rem' }}>
            <Text style={{ color: kpi.trend > 0 ? 'green' : 'red' }}>
              {kpi.trend > 0 ? '▲' : '▼'} {Math.abs(kpi.trend)}%
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
};

export default KpiCard;
