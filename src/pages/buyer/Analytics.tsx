import React from 'react';
import { Title, Card, CardHeader } from '@ui5/webcomponents-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const spendData = [
  { month: 'Jun', spend: 180000 },
  { month: 'Jul', spend: 220000 },
  { month: 'Aug', spend: 195000 },
  { month: 'Sep', spend: 240000 },
  { month: 'Oct', spend: 210000 },
  { month: 'Nov', spend: 260000 },
];

const Analytics: React.FC = () => {
  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>Analytics</Title>
      <Card header={<CardHeader titleText="Monthly Spend (USD)" />} style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="spend" fill="#0070f3" name="Spend" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Analytics;
