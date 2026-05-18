import React from 'react';

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`border-b border-border-subtle ${className}`}>
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
