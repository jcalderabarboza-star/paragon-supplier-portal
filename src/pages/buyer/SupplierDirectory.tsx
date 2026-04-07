import React from 'react';
import { Title } from '@ui5/webcomponents-react';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

const columns = [
  { Header: 'Name', accessor: 'name' },
  { Header: 'Contact', accessor: 'contactName' },
  { Header: 'Category', accessor: 'category' },
  { Header: 'Country', accessor: 'country' },
  { Header: 'Status', accessor: 'status', Cell: ({ value }: { value: string }) => <StatusBadge status={value} /> },
  { Header: 'Rating', accessor: 'rating' },
];

const SupplierDirectory: React.FC = () => {
  const { suppliers } = useSupplierPortal();

  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>Supplier Directory</Title>
      <DataTable columns={columns} data={suppliers} title="All Suppliers" />
    </div>
  );
};

export default SupplierDirectory;
