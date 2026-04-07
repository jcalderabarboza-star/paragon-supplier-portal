import React from 'react';
import {
  AnalyticalTable,
} from '@ui5/webcomponents-react';

interface DataTableProps {
  columns: object[];
  data: object[];
  title?: string;
}

const DataTable: React.FC<DataTableProps> = ({ columns, data, title }) => {
  return (
    <AnalyticalTable
      header={title}
      columns={columns}
      data={data}
      visibleRows={10}
      minRows={5}
    />
  );
};

export default DataTable;
