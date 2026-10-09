// UI-1b · the one table and the one list page.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import DataTable, { CELL_KIND_CLASS, CellSub, type Column, type ColumnKind } from './DataTable';
import Data from './Data';
import ListPage from './ListPage';
import { renderWithProviders } from '../../test/test-utils';

interface Row {
  id: string;
  name: string;
  qty: number;
  amount: string;
  due: string;
  status: string;
}

const ROWS: Row[] = [
  { id: 'PO-1', name: 'Alpha', qty: 10, amount: 'Rp 1.000', due: '01 Aug 2026', status: 'Open' },
  { id: 'PO-2', name: 'Beta', qty: 20, amount: 'Rp 2.000', due: '02 Aug 2026', status: 'Closed' },
];

const COLUMNS: Column<Row>[] = [
  { id: 'id', header: 'Order', kind: 'id', cell: (r) => r.id },
  { id: 'name', header: 'Supplier', kind: 'text', cell: (r) => r.name },
  { id: 'qty', header: 'Qty', kind: 'number', cell: (r) => r.qty },
  { id: 'amount', header: 'Value', kind: 'money', cell: (r) => r.amount },
  { id: 'due', header: 'Due', kind: 'date', cell: (r) => r.due },
  { id: 'status', header: 'Status', kind: 'status', cell: (r) => r.status },
  { id: 'actions', header: '', ariaLabel: 'Actions', kind: 'actions', cell: () => <button type="button">Open</button> },
];

describe('DataTable', () => {
  it('draws one header cell per column and one row per record', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} ariaLabel="Orders" />);
    const table = screen.getByRole('table', { name: 'Orders' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(COLUMNS.length);
    // header row + two records
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('the KIND fixes the cell type — the page does not', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS.slice(0, 1)} rowKey={(r) => r.id} />);
    const cells = screen.getAllByRole('cell');
    COLUMNS.forEach((c, i) => {
      for (const cls of CELL_KIND_CLASS[c.kind].split(' ').filter(Boolean)) expect(cells[i]).toHaveClass(cls);
    });
    // a document number is mono and semibold; a name is neither
    expect(cells[0]).toHaveClass('font-mono', 'font-semibold');
    expect(cells[1]).not.toHaveClass('font-mono');
  });

  it('every header cell is the same label, whatever the column', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);
    for (const th of screen.getAllByRole('columnheader')) expect(th).toHaveClass('text-label', 'text-text-tertiary', 'uppercase');
  });

  it('numbers, money and actions sit right, in the header and in the body', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS.slice(0, 1)} rowKey={(r) => r.id} />);
    const right: ColumnKind[] = ['number', 'money', 'actions'];
    const heads = screen.getAllByRole('columnheader');
    const cells = screen.getAllByRole('cell');
    COLUMNS.forEach((c, i) => {
      if (right.includes(c.kind)) {
        expect(heads[i]).toHaveClass('text-right');
        expect(cells[i]).toHaveClass('text-right');
      } else {
        expect(heads[i]).toHaveClass('text-left');
        expect(cells[i]).not.toHaveClass('text-right');
      }
    });
  });

  it('a row is a control only when the page makes it one', () => {
    const onRowClick = vi.fn();
    const { rerender } = render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);
    expect(screen.getAllByRole('row')[1]).not.toHaveClass('cursor-pointer');
    rerender(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    const row = screen.getAllByRole('row')[2];
    expect(row).toHaveClass('cursor-pointer');
    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1], 1);
  });

  it('carries per-row attributes, and keeps its own classes beside the page’s', () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        rowProps={(r) => ({ 'data-testid': `row-${r.id}`, className: 'bg-critical-soft' })}
      />,
    );
    const row = screen.getByTestId('row-PO-2');
    expect(row).toHaveClass('bg-critical-soft', 'border-b');
  });

  it('says what an empty table says, across every column', () => {
    render(<DataTable columns={COLUMNS} rows={[]} rowKey={(r: Row) => r.id} empty="No orders match" />);
    const cell = screen.getByText('No orders match');
    expect(cell).toHaveAttribute('colspan', String(COLUMNS.length));
  });

  it('an empty table with nothing to say draws no body row', () => {
    render(<DataTable columns={COLUMNS} rows={[]} rowKey={(r: Row) => r.id} />);
    expect(screen.getAllByRole('row')).toHaveLength(1);
  });

  it('draws a group heading before a row and a detail after it, each full width', () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        groupHeader={(r) => (r.id === 'PO-1' ? 'Group A' : null)}
        rowDetail={(r) => (r.id === 'PO-2' ? 'Detail of PO-2' : null)}
      />,
    );
    const rows = screen.getAllByRole('row');
    // header, group, PO-1, PO-2, detail
    expect(rows).toHaveLength(5);
    expect(within(rows[1]).getByText('Group A')).toHaveAttribute('colspan', String(COLUMNS.length));
    expect(within(rows[4]).getByText('Detail of PO-2')).toHaveAttribute('colspan', String(COLUMNS.length));
  });

  it('compact is tighter and one size down; the card can be left off', () => {
    const { container, rerender } = render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} />);
    expect(screen.getByRole('table')).toHaveClass('text-sm');
    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.firstElementChild).toHaveClass('rounded-lg', 'border');
    rerender(<DataTable columns={COLUMNS} rows={ROWS} rowKey={(r) => r.id} density="compact" card={false} />);
    expect(screen.getByRole('table')).toHaveClass('text-xs');
    expect(container.firstElementChild?.tagName).toBe('TABLE');
    expect(screen.getAllByRole('cell')[0]).toHaveClass('py-2', 'px-3');
  });

  it('draws a foot when given one', () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(r) => r.id}
        footer={
          <tr>
            <td colSpan={COLUMNS.length}>Total 30</td>
          </tr>
        }
      />,
    );
    expect(screen.getByText('Total 30').closest('tfoot')).not.toBeNull();
  });
});

describe('ListPage', () => {
  const parts = {
    breadcrumb: ['Orders'],
    title: 'Purchase Orders',
    subtitle: 'Every order',
    actions: <button type="button">New PO</button>,
    meta: <span data-testid="p-meta">21 orders</span>,
    notices: <div data-testid="p-notice">Sample data</div>,
    kpis: <div data-testid="p-kpi">KPI</div>,
    tabs: <div data-testid="p-tabs">Tabs</div>,
    filters: <div data-testid="p-filters">Filters</div>,
    search: <div data-testid="p-search">Search</div>,
  };

  it('one title size, from the shared header', () => {
    renderWithProviders(
      <ListPage {...parts}>
        <div data-testid="p-content">Table</div>
      </ListPage>,
    );
    const h1 = screen.getByRole('heading', { level: 1, name: 'Purchase Orders' });
    expect(h1).toHaveClass('text-title');
    expect(screen.getByRole('button', { name: 'New PO' })).toBeInTheDocument();
  });

  it('the parts come in ONE order, whatever order the page names them in', () => {
    renderWithProviders(
      <ListPage {...parts}>
        <div data-testid="p-content">Table</div>
      </ListPage>,
    );
    const order = ['p-meta', 'p-notice', 'p-kpi', 'p-tabs', 'p-filters', 'p-search', 'p-content'].map((id) => screen.getByTestId(id));
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.compareDocumentPosition(order[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('a part the page does not have leaves no gap behind', () => {
    renderWithProviders(
      <ListPage breadcrumb={['Orders']} title="Purchase Orders" testId="lp">
        <div data-testid="p-content">Table</div>
      </ListPage>,
    );
    const root = screen.getByTestId('lp');
    // the header and the content — nothing else
    expect(root.children).toHaveLength(2);
  });
});

describe('Data · a state colour wins over the data navy', () => {
  // UI-1a renamed the red token to `critical` and this list still said `danger`,
  // so an overdue figure in a `<Data>` carried navy AND red and rendered navy.
  it.each(['text-critical', 'text-warning-hover', 'text-success', 'text-info', 'text-action-text', 'text-teal-text', 'text-sample'])(
    '%s is not joined by text-data-navy',
    (cls) => {
      render(<Data className={cls}>42</Data>);
      const el = screen.getByText('42');
      expect(el).toHaveClass(cls, 'font-mono');
      expect(el).not.toHaveClass('text-data-navy');
    },
  );

  it('a value with no colour of its own is navy', () => {
    render(<Data>42</Data>);
    expect(screen.getByText('42')).toHaveClass('text-data-navy');
  });
});

describe('CellSub · the one second line', () => {
  it('is sans, 12px, regular, grey — and says a condition by tone, not by a class', () => {
    render(
      <>
        <CellSub>PR-1</CellSub>
        <CellSub tone="critical">2d overdue</CellSub>
      </>,
    );
    expect(screen.getByText('PR-1')).toHaveClass('font-sans', 'text-xs', 'font-normal', 'text-text-tertiary', 'whitespace-normal');
    const late = screen.getByText('2d overdue');
    expect(late).toHaveClass('text-critical', 'text-xs', 'font-normal');
    expect(late).not.toHaveClass('text-text-tertiary');
  });

  it('truncates when the page asks it to', () => {
    render(<CellSub className="truncate max-w-xs">a long description</CellSub>);
    const el = screen.getByText('a long description');
    expect(el).toHaveClass('truncate');
    expect(el).not.toHaveClass('whitespace-normal');
  });
});

describe('DataTable · the column that names the row', () => {
  const cell = (cols: Column<Row>[]): HTMLElement[] => {
    render(<DataTable columns={cols} rows={ROWS.slice(0, 1)} rowKey={(r) => r.id} />);
    return screen.getAllByRole('cell');
  };

  it('is the first text column when the row is named by a name — and only that one', () => {
    const [name, category] = cell([
      { id: 'name', header: 'Supplier', kind: 'text', cell: (r) => r.name },
      { id: 'status', header: 'Category', kind: 'text', cell: (r) => r.status },
    ]);
    expect(name).toHaveClass('!font-semibold');
    expect(category).not.toHaveClass('!font-semibold');
  });

  it('is the document number when there is one first; the name beside it stays regular', () => {
    const [id, name] = cell([
      { id: 'id', header: 'Order', kind: 'id', cell: (r) => r.id },
      { id: 'name', header: 'Supplier', kind: 'text', cell: (r) => r.name },
    ]);
    expect(id).toHaveClass('font-semibold');
    expect(name).not.toHaveClass('!font-semibold');
  });

  it('skips a leading checkbox or marker column', () => {
    const [box, name] = cell([
      { id: 'pick', header: '', ariaLabel: 'Select', kind: 'status', cell: () => <input type="checkbox" aria-label="pick" /> },
      { id: 'name', header: 'Material', kind: 'text', cell: (r) => r.name },
    ]);
    expect(box).not.toHaveClass('!font-semibold');
    expect(name).toHaveClass('!font-semibold');
  });

  it('a column can take it, and the first column can decline it', () => {
    const [a, b] = cell([
      { id: 'cat', header: 'Category', kind: 'text', cell: (r) => r.status },
      { id: 'name', header: 'Material', kind: 'text', primary: true, cell: (r) => r.name },
    ]);
    expect(a).not.toHaveClass('!font-semibold');
    expect(b).toHaveClass('!font-semibold');
  });
});
