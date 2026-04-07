import React from 'react';
import { Title } from '@ui5/webcomponents-react';
import KpiCard from '../../components/shared/KpiCard';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

const Dashboard: React.FC = () => {
  const { buyerKpis } = useSupplierPortal();

  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>Buyer Dashboard</Title>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {buyerKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
      <Title level="H4">Welcome to the Paragon Supplier Portal</Title>
    </div>
  );
};

export default Dashboard;
