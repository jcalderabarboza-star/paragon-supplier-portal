import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1b · THE ONE TABLE.
//
// Every table in the portal is a list of COLUMNS over a list of ROWS. A column
// states its KIND, and the kind — not the page — fixes how the cell reads:
//
//   id       a document number or code      mono · semibold · data-navy · no wrap
//   text     names, descriptions            sans · primary
//   number   quantities, counts, scores     mono · data-navy · right
//   money    currency amounts               mono · data-navy · right · no wrap
//   date     dates and times                mono · data-navy · no wrap
//   status   a StatusPill or a marker       left
//   actions  row controls                   right · no wrap
//
// The audit (9 October 2026) found five styles for a document number and four
// for a header cell across thirty routes; each was a page choosing for itself.
// A cell still renders whatever the page hands it — a second line, an icon, a
// chip — but the first line takes its type from here.
//
// `density="compact"` is for a table inside a drawer or a card, where the page
// header's rhythm does not apply. `card={false}` is for a table that already
// sits inside a bordered surface.
// ─────────────────────────────────────────────────────────────────────────────

export type ColumnKind = 'id' | 'text' | 'number' | 'money' | 'date' | 'status' | 'actions';

export interface Column<T> {
  /** Stable key for the column. */
  id: string;
  /** The header label. An empty header still needs `ariaLabel`. */
  header: React.ReactNode;
  kind: ColumnKind;
  cell: (row: T, index: number) => React.ReactNode;
  /** Extra classes for the body cell — a width, a wrap rule. Not a type size. */
  className?: string;
  headerClassName?: string;
  /** Accessible name when `header` is empty or an icon. */
  ariaLabel?: string;
  /**
   * The cell holds controls of its own inside a clickable row: a click in it,
   * padding included, does not open the row.
   */
  stopRowClick?: boolean;
}

const SUB_TONE = {
  neutral: 'text-text-tertiary',
  critical: 'text-critical',
  warning: 'text-warning-hover',
  success: 'text-success',
  info: 'text-info',
} as const;

/**
 * The second line of a cell — a description under a code, a reference under a
 * name, "2d overdue" under a date. ONE style on every list: sans, 12px, regular.
 * `tone` is for a line that states the row's condition; the default is the
 * neutral grey. A cell never dresses a second line by hand.
 */
export const CellSub: React.FC<{
  children: React.ReactNode;
  tone?: keyof typeof SUB_TONE;
  className?: string;
  'data-testid'?: string;
}> = ({ children, tone = 'neutral', className = '', 'data-testid': testId }) => (
  <div
    data-testid={testId}
    data-cell-sub=""
    // A second line wraps even inside a no-wrap cell — unless the page asks it to
    // truncate, and then `whitespace-normal` must not be there to win the cascade.
    className={`mt-0.5 ${/(truncate|whitespace-nowrap)/.test(className) ? '' : 'whitespace-normal'} font-sans text-xs font-normal ${SUB_TONE[tone]} ${className}`}
  >
    {children}
  </div>
);

type RowAttrs = React.HTMLAttributes<HTMLTableRowElement> & { [dataAttr: `data-${string}`]: string | undefined };

export interface DataTableProps<T> {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  /** Makes the row a control: pointer, hover, click. */
  onRowClick?: (row: T, index: number) => void;
  /** Per-row attributes: a test id, a tone class, an aria state. */
  rowProps?: (row: T, index: number) => RowAttrs;
  /** A full-width row rendered BEFORE this row — a group heading. */
  groupHeader?: (row: T, index: number) => React.ReactNode;
  /** A full-width row rendered AFTER this row — an expansion. */
  rowDetail?: (row: T, index: number) => React.ReactNode;
  /** What an empty table says. Rendered across every column. */
  empty?: React.ReactNode;
  /** Rows for the table foot — totals. Pass `<tr>` elements. */
  footer?: React.ReactNode;
  density?: 'comfortable' | 'compact';
  /** The white bordered card around the table. Default true. */
  card?: boolean;
  /** Accessible name for the table. */
  ariaLabel?: string;
  testId?: string;
  className?: string;
}

const RIGHT: Record<ColumnKind, boolean> = {
  id: false,
  text: false,
  number: true,
  money: true,
  date: false,
  status: false,
  actions: true,
};

/** The body cell's type, by kind. The ONLY place a table cell's type is chosen. */
export const CELL_KIND_CLASS: Record<ColumnKind, string> = {
  id: 'font-mono font-semibold text-data-navy whitespace-nowrap',
  text: 'font-sans font-normal text-text-primary',
  number: 'font-mono font-normal tabular-nums text-data-navy text-right',
  money: 'font-mono font-normal tabular-nums text-data-navy text-right whitespace-nowrap',
  date: 'font-mono font-normal text-data-navy whitespace-nowrap',
  status: 'font-sans font-normal text-text-primary',
  actions: 'text-right whitespace-nowrap',
};

const DENSITY = {
  // 12px at the sides, not the 16px the old primitives used: a document number
  // no longer wraps, and the four pixels a side are what pays for it on a
  // nine-column list at 1600px (measured: purchase orders, invoices).
  comfortable: { table: 'text-sm', th: 'py-3 px-3', td: 'py-4 px-3' },
  compact: { table: 'text-xs', th: 'py-2 px-3', td: 'py-2 px-3' },
} as const;

function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowProps,
  groupHeader,
  rowDetail,
  empty,
  footer,
  density = 'comfortable',
  card = true,
  ariaLabel,
  testId,
  className = '',
}: DataTableProps<T>): React.ReactElement {
  const d = DENSITY[density];
  const table = (
    <table
      className={`w-full border-collapse font-sans font-normal text-text-primary ${d.table} ${card ? '' : className}`}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <thead className="bg-bg-hover border-b border-border-subtle">
        <tr>
          {columns.map((c) => (
            <th
              key={c.id}
              scope="col"
              aria-label={c.ariaLabel}
              className={`text-label text-text-tertiary uppercase ${d.th} ${RIGHT[c.kind] ? 'text-right' : 'text-left'} ${c.headerClassName ?? ''}`}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const key = rowKey(row, i);
          const { className: rowClass = '', ...attrs } = rowProps?.(row, i) ?? {};
          const before = groupHeader?.(row, i);
          const after = rowDetail?.(row, i);
          return (
            <React.Fragment key={key}>
              {before ? (
                <tr className="border-b border-border-subtle bg-bg-hover">
                  <td colSpan={columns.length} className={d.th}>
                    {before}
                  </td>
                </tr>
              ) : null}
              <tr
                className={`border-b border-border-subtle hover:bg-bg-hover transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${rowClass}`}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                {...attrs}
              >
                {columns.map((c) => (
                  <td
                    key={c.id}
                    data-kind={c.kind}
                    className={`align-middle ${d.td} ${CELL_KIND_CLASS[c.kind]} ${c.className ?? ''}`}
                    onClick={c.stopRowClick ? (e) => e.stopPropagation() : undefined}
                  >
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
              {after ? (
                <tr className="border-b border-border-subtle">
                  <td colSpan={columns.length} className={d.td}>
                    {after}
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          );
        })}
        {rows.length === 0 && empty !== undefined ? (
          <tr>
            <td colSpan={columns.length} className="py-10 text-center text-sm text-text-tertiary">
              {empty}
            </td>
          </tr>
        ) : null}
      </tbody>
      {footer ? <tfoot>{footer}</tfoot> : null}
    </table>
  );
  if (!card) return table;
  return (
    <div className={`overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface shadow-sm ${className}`}>{table}</div>
  );
}

export default DataTable;
