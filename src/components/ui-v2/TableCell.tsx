import React from 'react';

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <td className={`py-4 px-4 align-middle ${className}`} {...rest}>
      {children}
    </td>
  );
};

export default TableCell;
