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
//
// DP2-DATA-NAVY-01: mono data tokens render in `data-navy` (#1E3A5F) — a
// recognizably-blue navy a full lightness tier off action-blue, so a value
// never reads as clickable (mono + no underline + no hover keeps "identifiers,
// not links" intact; navy is deliberately NOT the interactive `action` colour).
// The colour is applied centrally here: the near-black `text-text-primary`
// default AND the no-colour inherit case both LIFT to data-navy, while an
// explicit muted (secondary/tertiary) or semantic (success/danger/warning/info)
// colour on a token is PRESERVED — placeholder "—" refs and pass/fail state
// keep their meaning. Supplier company names are sans (never wrapped here) and
// stay `text-text-primary` black: mono = data = navy, sans = names = black.
interface DataProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  children: React.ReactNode;
}

// A muted or semantic text colour on the token is intentional and wins over the
// data-navy default; the near-black primary default is stripped so it lifts.
const OVERRIDE_COLOR =
  /\btext-(text-(secondary|tertiary)|success|danger|warning-hover|warning|info|action|teal|white)\b/;

const Data: React.FC<DataProps> = ({
  as = 'span',
  className = '',
  children,
  ...rest
}) => {
  const Tag = as as React.ElementType;
  const cleaned = className.replace(/\btext-text-primary\b/g, '').replace(/\s+/g, ' ').trim();
  const colorClass = OVERRIDE_COLOR.test(className) ? '' : 'text-data-navy';
  const classes = `font-mono tabular-nums ${colorClass} ${cleaned}`.replace(/\s+/g, ' ').trim();
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
};

export default Data;
