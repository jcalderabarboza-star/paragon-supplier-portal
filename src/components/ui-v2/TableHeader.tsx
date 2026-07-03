import React from 'react';

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

// DP-3 (TMS alignment): a light grey header band over the thin bottom border.
// Row grammar (thin borders, generous height) already lives in TableRow/TableCell.
const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-bg-hover border-b border-border-subtle ${className}`}>
      <tr>{children}</tr>
    </thead>
  );
};

interface TableHeaderCellProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeaderCell: React.FC<TableHeaderCellProps> = ({
  children,
  className = '',
}) => {
  return (
    <th
      scope="col"
      className={`text-left text-label text-text-tertiary uppercase py-3 px-4 ${className}`}
    >
      {children}
    </th>
  );
};

export default TableHeader;
