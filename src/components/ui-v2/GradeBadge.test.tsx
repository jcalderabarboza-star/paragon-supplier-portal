// UI-1c-4 · the one grade.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GradeBadge, GradeChip, GRADE_TONE, type GradeLetter } from './GradeBadge';
import { CHART_TEXT_SIZE, CHART_TICK, CHART_LEGEND_STYLE, CHART_TOOLTIP_STYLE, CHART_AXIS, chartLabel } from '../../lib/chartPalette';

const GRADES: GradeLetter[] = ['A', 'B', 'C', 'D', 'F'];

describe('the grade ramp', () => {
  it('is written once, in tokens: success, info, warning, critical', () => {
    expect(GRADE_TONE).toEqual({
      A: { box: 'bg-success-soft border-success', text: 'text-success', pill: 'success' },
      B: { box: 'bg-info-soft border-info', text: 'text-info', pill: 'info' },
      C: { box: 'bg-warning-soft border-warning', text: 'text-warning-hover', pill: 'warning' },
      D: { box: 'bg-critical-soft border-critical', text: 'text-critical', pill: 'danger' },
      F: { box: 'bg-critical-soft border-critical', text: 'text-critical', pill: 'danger' },
    });
  });

  it('grade C is the warning SPLIT — the bright amber is never the letter', () => {
    expect(GRADE_TONE.C.text).toBe('text-warning-hover');
    for (const g of GRADES) expect(GRADE_TONE[g].text).not.toBe('text-warning');
  });

  it('no grade is spelled in a raw colour', () => {
    expect(JSON.stringify(GRADE_TONE)).not.toMatch(/#[0-9A-Fa-f]{3,8}|rgb/);
  });
});

describe('GradeBadge', () => {
  it('draws every grade in its own tone, as a dial by default', () => {
    for (const g of GRADES) {
      const { unmount } = render(<GradeBadge grade={g} data-testid="b" />);
      const el = screen.getByTestId('b');
      expect(el).toHaveTextContent(g);
      expect(el).toHaveAttribute('data-grade', g);
      for (const c of `${GRADE_TONE[g].box} ${GRADE_TONE[g].text}`.split(' ')) expect(el).toHaveClass(c);
      expect(el).toHaveClass('h-20', 'w-20', 'rounded-full', 'border-4', 'text-kpi');
      unmount();
    }
  });

  it('is a tile on a dashboard, and a small tile in a row', () => {
    render(
      <>
        <GradeBadge grade="A" shape="tile" data-testid="md" />
        <GradeBadge grade="A" shape="tile" size="sm" data-testid="sm" />
      </>,
    );
    expect(screen.getByTestId('md')).toHaveClass('h-16', 'w-16', 'rounded-md', 'text-kpi');
    expect(screen.getByTestId('sm')).toHaveClass('h-10', 'w-10', 'rounded-md', 'text-section');
    expect(screen.getByTestId('sm')).not.toHaveClass('text-kpi');
  });
});

describe('GradeChip', () => {
  it('is one month of a history: a label, the letter, a figure — in the grade tone', () => {
    const { container } = render(<GradeChip grade="C" label="Mar" figure={74} />);
    const chip = container.firstElementChild!;
    expect(chip).toHaveAttribute('data-grade', 'C');
    expect(chip).toHaveClass('bg-warning-soft', 'border-warning', 'text-warning-hover', 'rounded-md', 'border');
    expect(screen.getByText('Mar')).toHaveClass('text-label');
    expect(screen.getByText('C')).toHaveClass('text-sm', 'font-semibold');
    expect(screen.getByText('74')).toHaveClass('text-xs');
  });

  it('leaves the figure out when there is none', () => {
    const { container } = render(<GradeChip grade="A" label="Apr" />);
    expect(container.firstElementChild!.children).toHaveLength(2);
  });
});

describe('chart text', () => {
  it('nothing in a chart is under 11px', () => {
    expect(CHART_TEXT_SIZE).toBe(11);
    expect(CHART_TICK).toEqual({ fontSize: 11, fill: CHART_AXIS });
    expect(CHART_LEGEND_STYLE).toEqual({ fontSize: 11 });
    expect(CHART_TOOLTIP_STYLE.fontSize).toBe(12);
  });

  it('the axis grey is the text-tertiary grey, which clears 4.5:1 on white', () => {
    expect(CHART_AXIS).toBe('#5A6675');
  });

  it('a label keeps what is particular to it and cannot set its own size', () => {
    expect(chartLabel({ value: 'Target', position: 'insideTopRight' })).toEqual({
      value: 'Target',
      position: 'insideTopRight',
      fill: CHART_AXIS,
      fontSize: 11,
    });
    // a state colour passes through; a size does not
    expect(chartLabel({ fill: '#107E3E', fontSize: 8 } as { fill: string; fontSize: number })).toEqual({ fill: '#107E3E', fontSize: 11 });
  });
});
