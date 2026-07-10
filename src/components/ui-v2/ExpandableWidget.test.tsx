import { render, screen, fireEvent } from '@testing-library/react';
import ExpandableWidget from './ExpandableWidget';

// The reusable dashboard widget shell. The load-bearing guarantee is the
// honest-by-construction lock: the green "Live" pill is UNREACHABLE without
// live===true — a widget can never claim live derived data it doesn't have.

const baseProps = {
  title: 'Invoices',
  count: 3,
  expandedRows: <div>the real overdue rows</div>,
};

describe('ExpandableWidget — honesty lock', () => {
  it('live=false renders the amber "Sample data" pill, NEVER "Live"', () => {
    render(<ExpandableWidget {...baseProps} live={false} />);
    expect(screen.getByText('Sample data')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('live=true renders the green "Live" pill, NEVER "Sample data"', () => {
    render(<ExpandableWidget {...baseProps} live />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument();
  });
});

describe('ExpandableWidget — compact state', () => {
  it('renders the title, a count badge, and the urgency flag', () => {
    render(
      <ExpandableWidget
        {...baseProps}
        live
        flagSeverity="danger"
        flagLabel="3 overdue"
      />,
    );
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    // count appears in both the header badge and the compact headline.
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('3 overdue')).toBeInTheDocument();
  });

  it('shows "All clear" when flagSeverity is none', () => {
    render(<ExpandableWidget {...baseProps} count={0} live flagSeverity="none" />);
    expect(screen.getByText('All clear')).toBeInTheDocument();
  });

  it('fires the 1-click action', () => {
    const onAction = vi.fn();
    render(
      <ExpandableWidget
        {...baseProps}
        live
        actionLabel="Confirm orders"
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm orders' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('the collapse chevron toggles the compact body', () => {
    render(
      <ExpandableWidget
        {...baseProps}
        live
        actionLabel="Confirm orders"
        onAction={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Confirm orders' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Invoices' }));
    expect(
      screen.queryByRole('button', { name: 'Confirm orders' }),
    ).not.toBeInTheDocument();
  });
});

describe('ExpandableWidget — expanded (fullscreen) state', () => {
  it('expands to a dialog showing the real rows, then Esc closes it', () => {
    render(<ExpandableWidget {...baseProps} live />);
    expect(screen.queryByText('the real overdue rows')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Expand Invoices' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('the real overdue rows')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the expanded view carries the same honesty pill (cannot fake live)', () => {
    render(<ExpandableWidget {...baseProps} live={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Invoices' }));
    // two amber pills now (compact header + dialog header), still never "Live".
    expect(screen.getAllByText('Sample data').length).toBe(2);
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});
