import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

const Table: React.FC<TableProps> = ({ children, className = '', ...rest }) => {
  return (
    <table
      className={`w-full text-sm text-text-primary border-collapse ${className}`}
      {...rest}
    >
      {children}
    </table>
  );
};

export default Table;
