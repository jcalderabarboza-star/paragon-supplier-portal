import React from 'react';
import { Title } from '@ui5/webcomponents-react';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

const columns = [
  { Header: 'PO Number', accessor: 'poNumber' },
  { Header: 'Status', accessor: 'status', Cell: ({ value }: { value: string }) => <StatusBadge status={value} /> },
  { Header: 'Total (USD)', accessor: 'totalAmount', Cell: ({ value }: { value: number }) => `$${value.toLocaleString()}` },
  { Header: 'Created', accessor: 'createdDate' },
  { Header: 'Delivery Due', accessor: 'deliveryDate' },
];

const MyOrders: React.FC = () => {
  const { purchaseOrders } = useSupplierPortal();

  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>My Orders</Title>
      <DataTable columns={columns} data={purchaseOrders} title="Assigned Purchase Orders" />
    </div>
  );
};

export default MyOrders;
