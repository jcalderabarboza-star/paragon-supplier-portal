import React from 'react';
import { Title } from '@ui5/webcomponents-react';
import KpiCard from '../../components/shared/KpiCard';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

const SupplierDashboard: React.FC = () => {
  const { supplierKpis } = useSupplierPortal();

  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>Supplier Dashboard</Title>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {supplierKpis.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>
    </div>
  );
};

export default SupplierDashboard;
