import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1c-1 · THE ONE DETAIL FIELD.
//
// A fact on a drawer or a detail page is a LABEL and a VALUE. The value states
// its KIND, exactly as a table column does, and the kind fixes how it reads —
// so a date is the same date in a row and in the drawer that row opens
// (operator ruling, 9 October 2026: field values regular weight, as table cells).
//
//   label                         Inter 12 regular, grey
//   text     names, words         Inter 14 regular, primary
//   id       document numbers     mono 14 semibold, navy
//   number   quantities           mono 14 regular, navy
//   money    amounts              mono 14 regular, navy
//   date     dates and times      mono 14 regular, navy
//   status   a StatusPill         (the pill owns its type)
//
// The inventory found the value of a field written 14 ways in source and
// rendered 15 ways in drawers — the same amount at four weights.
//
// `FieldList` lays fields out: `stack` puts the label over the value in a grid;
// `row` puts the label left and the value right, one field per line.
// ─────────────────────────────────────────────────────────────────────────────

export type FieldKind = 'text' | 'id' | 'number' | 'money' | 'date' | 'status';

export const FIELD_LABEL_CLASS = 'font-sans text-xs font-normal text-text-tertiary';

/** The value's type, by kind. The ONLY place a field value's type is chosen. */
export const FIELD_KIND_CLASS: Record<FieldKind, string> = {
  text: 'font-sans text-sm font-normal text-text-primary',
  id: 'font-mono text-sm font-semibold text-data-navy',
  number: 'font-mono text-sm font-normal tabular-nums text-data-navy',
  money: 'font-mono text-sm font-normal tabular-nums text-data-navy',
  date: 'font-mono text-sm font-normal text-data-navy',
  status: 'font-sans text-sm font-normal text-text-primary',
};

type Layout = 'stack' | 'row';
const LayoutContext = React.createContext<Layout>('stack');

const COLUMNS = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const;

interface FieldListProps {
  layout?: Layout;
  /** Columns of a `stack` list. Default 2. */
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  /** Layout only. */
  className?: string;
  'data-testid'?: string;
}

export const FieldList: React.FC<FieldListProps> = ({
  layout = 'stack',
  columns = 2,
  children,
  className = '',
  'data-testid': testId,
}) => (
  <LayoutContext.Provider value={layout}>
    <dl
      data-testid={testId}
      data-field-list={layout}
      className={`${layout === 'stack' ? `grid ${COLUMNS[columns]} gap-x-4 gap-y-3` : 'flex flex-col gap-2'} ${className}`}
    >
      {children}
    </dl>
  </LayoutContext.Provider>
);

interface FieldProps {
  label: React.ReactNode;
  kind?: FieldKind;
  children: React.ReactNode;
  /** A second line under the value — Inter 12 regular grey. */
  sub?: React.ReactNode;
  /** Spans the whole width of a `stack` list. */
  wide?: boolean;
  /** Layout only, on the field's wrapper. */
  className?: string;
  /** On the value. */
  'data-testid'?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  kind = 'text',
  children,
  sub,
  wide = false,
  className = '',
  'data-testid': testId,
}) => {
  const layout = React.useContext(LayoutContext);
  const row = layout === 'row';
  return (
    <div className={`${row ? 'flex items-baseline justify-between gap-4' : 'min-w-0'} ${wide && !row ? 'col-span-full' : ''} ${className}`}>
      <dt className={FIELD_LABEL_CLASS}>{label}</dt>
      <dd data-testid={testId} data-kind={kind} className={`${row ? 'text-right' : 'mt-0.5'} min-w-0 ${FIELD_KIND_CLASS[kind]}`}>
        {children}
        {sub ? <div className="mt-0.5 font-sans text-xs font-normal text-text-tertiary">{sub}</div> : null}
      </dd>
    </div>
  );
};

export default Field;
