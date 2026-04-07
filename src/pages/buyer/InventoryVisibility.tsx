import React from 'react';
import { Title } from '@ui5/webcomponents-react';
import DataTable from '../../components/shared/DataTable';
import { useSupplierPortal } from '../../hooks/useSupplierPortal';

const columns = [
  { Header: 'SKU', accessor: 'sku' },
  { Header: 'Description', accessor: 'description' },
  { Header: 'Supplier', accessor: 'supplierName' },
  { Header: 'On Hand', accessor: 'quantityOnHand' },
  { Header: 'On Order', accessor: 'quantityOnOrder' },
  { Header: 'Reorder Point', accessor: 'reorderPoint' },
  { Header: 'Last Updated', accessor: 'lastUpdated' },
];

const InventoryVisibility: React.FC = () => {
  const { inventory } = useSupplierPortal();

  return (
    <div>
      <Title level="H2" style={{ marginBottom: '1rem' }}>Inventory Visibility</Title>
      <DataTable columns={columns} data={inventory} title="Inventory Overview" />
    </div>
  );
};

export default InventoryVisibility;
