import React from 'react';
import { Title } from '@ui5/webcomponents-react';
import DataTable from '../../components/shared/DataTable';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

const columns = [
  { Header: 'SKU', accessor: 'sku' },
  { Header: 'Description', accessor: 'description' },
  { Header: 'On Hand', accessor: 'quantityOnHand' },
  { Header: 'On Order', accessor: 'quantityOnOrder' },
  { Header: 'Unit', accessor: 'unit' },
  { Header: 'Last Updated', accessor: 'lastUpdated' },
];

const MyInventory: React.FC = () => {
  const { inventory } = useSupplierPortal();

  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>My Inventory</Title>
      <DataTable columns={columns} data={inventory} title="Managed Inventory" />
    </div>
  );
};

export default MyInventory;
