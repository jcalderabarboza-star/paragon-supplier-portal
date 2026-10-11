// UI-1d · the card's states, the tabs that own a panel, and the one solid button.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CARD_ACCENT, CARD_HIGHLIGHT, CARD_TONE, cardClass, type CardAccent } from './Card';
import Tabs from './Tabs';
import Button, { buttonClass } from './Button';
import BulkActionsBar from './BulkActionsBar';

const ACCENTS: CardAccent[] = ['critical', 'warning', 'info'];
const classes = (s: string): string[] => s.split(' ').filter(Boolean);

describe('Card · accent', () => {
  it('the accents are the three states, written once, in tokens', () => {
    expect(CARD_ACCENT).toEqual({
      critical: { edge: 'border-l-4 border-l-critical', fill: 'bg-critical-soft' },
      warning: { edge: 'border-l-4 border-l-warning', fill: 'bg-warning-soft' },
      info: { edge: 'border-l-4 border-l-info', fill: 'bg-info-soft' },
    });
  });

  it('draws a left edge in the state colour on the same white card', () => {
    for (const accent of ACCENTS) {
      const { unmount } = render(<Card accent={accent} data-testid="c">x</Card>);
      const el = screen.getByTestId('c');
      expect(el).toHaveAttribute('data-accent', accent);
      for (const c of classes(CARD_ACCENT[accent].edge)) expect(el).toHaveClass(c);
      expect(el).toHaveClass('rounded-lg', 'border', 'border-border-subtle', 'bg-bg-surface', 'shadow-sm', 'p-4');
      expect(el).not.toHaveClass(CARD_ACCENT[accent].fill);
      unmount();
    }
  });

  it('`fill` tints the card and takes the white ground and the shadow away — never two grounds', () => {
    for (const accent of ACCENTS) {
      const { unmount } = render(<Card accent={accent} fill padding="lg" data-testid="c">x</Card>);
      const el = screen.getByTestId('c');
      expect(el).toHaveClass(CARD_ACCENT[accent].fill, 'p-6');
      expect(el).not.toHaveClass('bg-bg-surface');
      expect(el).not.toHaveClass('shadow-sm');
      expect(el.className.match(/(?:^|\s)bg-/g)).toHaveLength(1);
      unmount();
    }
  });

  it('a card with no state has no edge, and is the card it always was', () => {
    render(<Card data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(el.className).toBe(`${CARD_TONE.surface} p-4`);
    expect(el).not.toHaveAttribute('data-accent');
    expect(el).not.toHaveAttribute('data-highlighted');
    expect(cardClass({ fill: true })).toBe(`${CARD_TONE.surface} p-4`);
  });
});

describe('Card · highlighted', () => {
  it('takes the info border and a ring, and one border colour only', () => {
    render(<Card highlighted data-testid="c">x</Card>);
    const el = screen.getByTestId('c');
    expect(CARD_HIGHLIGHT).toBe('border-info ring-1 ring-info/40');
    expect(el).toHaveAttribute('data-highlighted', 'true');
    expect(el).toHaveClass('border-info', 'ring-1', 'ring-info/40', 'bg-bg-surface');
    expect(el).not.toHaveClass('border-border-subtle');
  });

  it('`highlighted={false}` is the plain card', () => {
    render(<Card highlighted={false} data-testid="c">x</Card>);
    expect(screen.getByTestId('c').className).toBe(`${CARD_TONE.surface} p-4`);
  });

  it('keeps an accent beside it', () => {
    expect(classes(cardClass({ highlighted: true, accent: 'warning', padding: 'none' }))).toEqual([
      'rounded-lg', 'border', 'border-info', 'ring-1', 'ring-info/40', 'bg-bg-surface', 'shadow-sm', 'border-l-4', 'border-l-warning',
    ]);
  });
});

describe('Tabs · a tab that owns a panel', () => {
  const tabs = [
    { id: 'a', label: 'Overview', domId: 'tab-a', testId: 't-a', controls: 'panel' },
    { id: 'b', label: 'Steps', domId: 'tab-b', testId: 't-b', controls: 'panel' },
  ];

  it('states its id, its test id and the panel it controls, and the list has a name', () => {
    render(<Tabs tabs={tabs} active="a" onChange={() => {}} ariaLabel="Guide sections" />);
    expect(screen.getByRole('tablist', { name: 'Guide sections' })).toBeInTheDocument();
    const a = screen.getByTestId('t-a');
    expect(a).toHaveAttribute('role', 'tab');
    expect(a).toHaveAttribute('id', 'tab-a');
    expect(a).toHaveAttribute('aria-controls', 'panel');
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('t-b')).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the tab pressed', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="a" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('t-b'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('a tab that only filters a list states none of the three', () => {
    render(<Tabs tabs={[{ id: 'x', label: 'All' }]} active="x" onChange={() => {}} />);
    const x = screen.getByRole('tab', { name: 'All' });
    expect(x).not.toHaveAttribute('id');
    expect(x).not.toHaveAttribute('aria-controls');
    expect(x).not.toHaveAttribute('data-testid');
    expect(screen.getByRole('tablist')).not.toHaveAttribute('aria-label');
  });
});

describe('Button · the one solid', () => {
  it('primary is the action fill with a white label, at the one height', () => {
    render(<Button variant="primary">New PO</Button>);
    const b = screen.getByRole('button', { name: 'New PO' });
    expect(b).toHaveClass('bg-action', 'text-white', 'border-action', 'hover:bg-action-hover', 'min-h-10');
    expect(b).not.toHaveClass('bg-transparent');
  });

  it('is never the default, and outline is still an outline', () => {
    render(<Button>Edit</Button>);
    const b = screen.getByRole('button', { name: 'Edit' });
    expect(b).toHaveClass('bg-transparent', 'text-action-text', 'border-action');
    expect(b).not.toHaveClass('bg-action');
    expect(buttonClass()).toBe(buttonClass('outline'));
  });

  it('a destructive act is an outline even when asked to be solid', () => {
    expect(buttonClass('primary', 'critical')).toBe(buttonClass('outline', 'critical'));
    expect(buttonClass('primary', 'critical')).not.toMatch(/bg-action|text-white/);
  });

  it('a page header\'s primary slot is the solid one, and its other actions are not', () => {
    render(
      <BulkActionsBar
        actions={[{ label: 'Export', onClick: () => {} }]}
        primary={{ label: 'New contract', onClick: () => {} }}
      />,
    );
    expect(screen.getByRole('button', { name: 'New contract' })).toHaveClass('bg-action', 'text-white');
    expect(screen.getByRole('button', { name: 'Export' })).not.toHaveClass('bg-action');
  });
});
