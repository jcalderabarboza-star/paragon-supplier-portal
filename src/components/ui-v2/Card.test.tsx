// UI-1c-3 · the one card, the one notice, and everything pressed that is not a Button.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { X } from 'lucide-react';
import { Card, CardButton, CARD_PADDING, CARD_TONE, cardClass } from './Card';
import Notice, { NOTICE_BODY, NOTICE_BOX, NOTICE_TITLE, NOTICE_TONE, type NoticeTone } from './Notice';
import { IconButton, LinkButton, RowButton, ToggleChip } from './Actions';
import Button from './Button';
import StatusPill from './StatusPill';

const has = (el: Element, classes: string): void => {
  for (const c of classes.split(' ').filter(Boolean)) expect(el).toHaveClass(c);
};

describe('Card', () => {
  it('is one box: white, one border, one radius, one shadow', () => {
    render(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId('c')).toHaveClass('rounded-lg', 'border', 'border-border-subtle', 'bg-bg-surface', 'shadow-sm', 'p-4');
    expect(screen.getByTestId('c').tagName).toBe('DIV');
  });

  it('has three paddings and no fourth', () => {
    expect(Object.keys(CARD_PADDING)).toEqual(['none', 'md', 'lg']);
    expect(cardClass({ padding: 'none' })).not.toMatch(/(?:^|\s)p[xy]?-/);
    expect(cardClass({ padding: 'lg' })).toContain('p-6');
  });

  it('an inset block is grey and flat — never a second shadowed box', () => {
    expect(Object.keys(CARD_TONE)).toEqual(['surface', 'inset']);
    render(<Card tone="inset" data-testid="c">x</Card>);
    expect(screen.getByTestId('c')).toHaveClass('bg-bg-hover', 'border-border-subtle', 'rounded-lg');
    expect(screen.getByTestId('c')).not.toHaveClass('shadow-sm');
  });

  it('is the element the page names, with every attribute and a ref', () => {
    const ref = { current: null as HTMLElement | null };
    render(
      <Card as="section" ref={ref} aria-label="Totals" className="col-span-2 mt-4" data-testid="c">
        x
      </Card>,
    );
    const el = screen.getByTestId('c');
    expect(el.tagName).toBe('SECTION');
    expect(el).toHaveAttribute('aria-label', 'Totals');
    expect(el).toHaveClass('col-span-2', 'mt-4', 'rounded-lg');
    expect(ref.current).toBe(el);
  });
});

describe('CardButton', () => {
  it('is the same box, pressed', () => {
    const onClick = vi.fn();
    render(<CardButton onClick={onClick}>Open module</CardButton>);
    const b = screen.getByRole('button', { name: 'Open module' });
    expect(b).toHaveClass('rounded-lg', 'border', 'border-border-subtle', 'bg-bg-surface', 'text-left', 'p-4');
    expect(b).toHaveAttribute('type', 'button');
    expect(b).not.toHaveAttribute('aria-pressed');
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a chosen card says so with the action border and tint, and is announced', () => {
    render(
      <>
        <CardButton selected>External</CardButton>
        <CardButton selected={false}>Internal</CardButton>
      </>,
    );
    expect(screen.getByRole('button', { name: 'External' })).toHaveClass('border-action', 'bg-action-soft');
    expect(screen.getByRole('button', { name: 'External' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Internal' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Internal' })).not.toHaveClass('border-action');
  });
});

describe('Notice', () => {
  it('is a left rule on a tint — never a full border', () => {
    render(<Notice data-testid="n">Body</Notice>);
    const n = screen.getByTestId('n');
    has(n, NOTICE_BOX);
    expect(n).toHaveClass('border-l-2', 'rounded-r-sm', 'px-4', 'py-3');
    expect(NOTICE_TONE.info.box).toBe('border-info bg-info-soft');
    expect(n.className.split(' ')).not.toContain('border');
    expect(n).toHaveAttribute('role', 'note');
  });

  it('has six tones, each a rule and a tint', () => {
    expect(Object.keys(NOTICE_TONE)).toEqual(['info', 'warning', 'critical', 'success', 'neutral', 'sample']);
    for (const tone of Object.keys(NOTICE_TONE) as NoticeTone[]) {
      const { unmount } = render(<Notice tone={tone} data-testid="n">x</Notice>);
      has(screen.getByTestId('n'), NOTICE_TONE[tone].box);
      expect(NOTICE_TONE[tone].box).toMatch(/border-\S+ bg-\S+-soft|border-border-input bg-bg-hover/);
      unmount();
    }
  });

  it('a sample notice is neutral and dashed — no amber', () => {
    expect(NOTICE_TONE.sample.box).toBe('border-dashed border-sample-border bg-sample-soft');
    expect(NOTICE_TONE.sample.box).not.toMatch(/warning/);
  });

  it('a title is 14 semibold and the body 14 regular, in one colour each', () => {
    render(
      <Notice tone="warning" title="Pending a ruling" data-testid="n">
        Compliance has not ruled.
      </Notice>,
    );
    expect(NOTICE_TITLE).toBe('font-semibold text-text-primary');
    expect(NOTICE_BODY).toBe('text-text-secondary');
    has(screen.getByText('Pending a ruling'), NOTICE_TITLE);
    has(screen.getByText('Compliance has not ruled.'), NOTICE_BODY);
    expect(screen.getByTestId('n')).toHaveClass('text-sm', 'font-normal', 'font-sans');
  });

  it('carries an action on the right, and the role the page gives it', () => {
    render(
      <Notice tone="critical" role="alert" title="Refused" action={<button type="button">Retry</button>} data-testid="n" />,
    );
    expect(screen.getByRole('alert')).toBe(screen.getByTestId('n'));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('what is pressed', () => {
  it('a Button is 40px — the height of a form control', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('min-h-10', 'py-2', 'px-4', 'text-sm', 'font-medium', 'rounded-md');
  });

  it('a LinkButton reads as a link: action colour, no box', () => {
    const onClick = vi.fn();
    render(
      <>
        <LinkButton onClick={onClick}>Edit</LinkButton>
        <LinkButton tone="critical">Remove</LinkButton>
        <LinkButton tone="muted">Dismiss</LinkButton>
      </>,
    );
    const b = screen.getByRole('button', { name: 'Edit' });
    expect(b).toHaveClass('text-action-text', 'text-sm', 'font-medium', 'bg-transparent', 'p-0', 'hover:underline');
    expect(b.className).not.toMatch(/(?:^|\s)border|rounded/);
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('text-critical');
    expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveClass('text-text-secondary');
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('an IconButton has no words, so it is named', () => {
    render(<IconButton icon={X} aria-label="Close" />);
    const b = screen.getByRole('button', { name: 'Close' });
    expect(b).toHaveClass('h-8', 'w-8', 'rounded-md');
    expect(b.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('a ToggleChip says whether it is on, with the action border and tint', () => {
    render(
      <>
        <ToggleChip selected>Week 36</ToggleChip>
        <ToggleChip selected={false}>Week 37</ToggleChip>
        <ToggleChip selected mono>
          po:confirm
        </ToggleChip>
      </>,
    );
    const on = screen.getByRole('button', { name: 'Week 36' });
    const off = screen.getByRole('button', { name: 'Week 37' });
    expect(on).toHaveAttribute('aria-pressed', 'true');
    expect(on).toHaveClass('border-action', 'bg-action-soft', 'text-action-text', 'rounded-md', 'px-3', 'py-1.5', 'text-sm');
    expect(off).toHaveAttribute('aria-pressed', 'false');
    expect(off).toHaveClass('border-border-subtle', 'bg-bg-surface', 'text-text-secondary');
    expect(screen.getByRole('button', { name: 'po:confirm' })).toHaveClass('font-mono');
  });

  it('a RowButton is the whole row, and says when it is the chosen one', () => {
    render(
      <>
        <RowButton>Published lines</RowButton>
        <RowButton selected padding="sm">
          Bahasa Indonesia
        </RowButton>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Published lines' })).toHaveClass('w-full', 'text-left', 'px-4', 'py-3', 'hover:bg-bg-hover');
    expect(screen.getByRole('button', { name: 'Published lines' })).not.toHaveAttribute('aria-pressed');
    expect(screen.getByRole('button', { name: 'Bahasa Indonesia' })).toHaveClass('bg-action-soft', 'px-2', 'py-1.5');
    expect(screen.getByRole('button', { name: 'Bahasa Indonesia' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('every one of them is a button that does not submit a form', () => {
    render(
      <>
        <LinkButton>a</LinkButton>
        <IconButton icon={X} aria-label="b" />
        <ToggleChip selected>c</ToggleChip>
        <RowButton>d</RowButton>
        <CardButton>e</CardButton>
      </>,
    );
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAttribute('type', 'button');
  });
});

describe('StatusPill sizes', () => {
  it('the default is 12 medium; `sm` is 11 — and there is no third', () => {
    render(
      <>
        <StatusPill>Zeta one</StatusPill>
        <StatusPill size="sm">Kappa two</StatusPill>
      </>,
    );
    expect(screen.getByText('Zeta one')).toHaveClass('text-xs', 'font-medium', 'px-2', 'py-0.5');
    expect(screen.getByText('Kappa two')).toHaveClass('text-label', 'px-1.5', 'py-px');
    expect(screen.getByText('Kappa two')).not.toHaveClass('text-xs');
    for (const t of ['Zeta one', 'Kappa two']) expect(screen.getByText(t)).toHaveClass('rounded-sm', 'border', 'font-sans');
  });
});
