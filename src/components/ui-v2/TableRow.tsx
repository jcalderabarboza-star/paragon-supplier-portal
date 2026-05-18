import React from 'react';

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

const TableRow: React.FC<TableRowProps> = ({ children, className = '', ...rest }) => {
  return (
    <tr
      className={`border-b border-border-subtle hover:bg-bg-hover transition-colors ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
};

export default TableRow;
