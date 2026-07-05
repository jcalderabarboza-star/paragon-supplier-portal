import React from 'react';

// DP-3 / DP3-FONT-01: the central data-token convention. Wraps any DATA value —
// document numbers (PO/PR/GR/RFQ/CTR/ASN/INV), SAP refs, material codes,
// currency amounts, dates/times, quantities, tracking refs — in the monospace
// token (JetBrains Mono, wired as `font-mono` in tailwind.config) plus
// `tabular-nums` so digits align in columns. UI labels, headings, and body copy
// stay in the sans token.
//
// Polymorphic via `as` so it can BE the surrounding element (div / dd / span /
// p) without adding a wrapper — e.g. a mono <div> becomes <Data as="div">.
// Inside table cells, wrap the value: <TableCell><Data>{v}</Data></TableCell>.
//
// Per DP3-FONT-01 the mono convention is now COMPLETED across data cells (no
// longer opportunistic): every money/date/quantity/doc-number token renders
// through this primitive.
interface DataProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  children: React.ReactNode;
}

const Data: React.FC<DataProps> = ({
  as = 'span',
  className = '',
  children,
  ...rest
}) => {
  const Tag = as as React.ElementType;
  return (
    <Tag className={`font-mono tabular-nums ${className}`} {...rest}>
      {children}
    </Tag>
  );
};

export default Data;
