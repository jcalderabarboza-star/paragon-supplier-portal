import { render, screen, fireEvent } from '@testing-library/react';
import ExpandableWidget from './ExpandableWidget';

// The reusable dashboard widget shell (Ledger Line). The load-bearing guarantee
// is the honest-by-construction lock: the green "● Live" dot-label is UNREACHABLE
// without live===true — a widget can never claim live derived data it lacks.

const baseProps = {
  title: 'Invoices',
  count: 3,
  expandedRows: <div>the real overdue rows</div>,
};

describe('ExpandableWidget — honesty lock', () => {
  it('live=false renders the amber "Sample" dot-label, NEVER "Live"', () => {
    render(<ExpandableWidget {...baseProps} live={false} />);
    expect(screen.getByText('Sample')).toBeInTheDocument();
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  it('live=true renders the green "Live" dot-label, NEVER "Sample"', () => {
    render(<ExpandableWidget {...baseProps} live />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.queryByText('Sample')).not.toBeInTheDocument();
  });
});

describe('ExpandableWidget — compact state (Ledger Line)', () => {
  it('renders the title, the hero count, and the flag detail line', () => {
    render(
      <ExpandableWidget
        {...baseProps}
        live
        flagSeverity="critical"
        flagLabel="3 overdue"
      />,
    );
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('3 overdue')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // hero
  });

  it('shows "All clear" when flagSeverity is none', () => {
    render(<ExpandableWidget {...baseProps} count={0} live flagSeverity="none" />);
    expect(screen.getByText('All clear')).toBeInTheDocument();
  });

  it('fires the 1-click action (text-link CTA)', () => {
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

describe('ExpandableWidget — DP2-FLAG-01 card-edge signature', () => {
  it('the CARD carries a 3px left severity edge (critical=red)', () => {
    const { container } = render(
      <ExpandableWidget {...baseProps} live flagSeverity="critical" />,
    );
    const classes = container.querySelector('section')!.className.split(/\s+/);
    expect(classes).toContain('border-l-[3px]');
    expect(classes).toContain('border-l-danger');
  });

  it('no severity edge when flagSeverity is none', () => {
    const { container } = render(
      <ExpandableWidget {...baseProps} count={0} live flagSeverity="none" />,
    );
    const classes = container.querySelector('section')!.className.split(/\s+/);
    expect(classes).not.toContain('border-l-[3px]');
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

  it('the expanded view carries the same honesty marker (cannot fake live)', () => {
    render(<ExpandableWidget {...baseProps} live={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Invoices' }));
    // two amber markers now (compact header + dialog header), still never "Live".
    expect(screen.getAllByText('Sample').length).toBe(2);
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });
});
