import React from 'react';

// DP-3 (TMS alignment): the central data-cell convention. Wraps any DATA value —
// document numbers (PO/GR/RFQ/CTR/SH), SAP refs, material codes, currency
// amounts, dates/times, tracking refs — in the monospace token (JetBrains Mono,
// loaded via src/index.css and wired as `font-mono` in tailwind.config) plus
// tabular-nums so digits align in columns. UI labels, headings, and body copy
// stay in the sans token.
//
// Adoption is OPPORTUNISTIC per touched page (the DP-1 / DP-2 model): this
// primitive establishes the convention centrally so future page touches have one
// consistent thing to reach for. It is deliberately NOT swept across the ~30
// existing pages here (see DP3-MIGRATE-01).
interface DataProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

const Data: React.FC<DataProps> = ({ children, className = '', ...rest }) => {
  return (
    <span className={`font-mono tabular-nums ${className}`} {...rest}>
      {children}
    </span>
  );
};

export default Data;
