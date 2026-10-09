// UI-1c-1 · the one detail field and the one section heading.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field, FieldList, FIELD_KIND_CLASS, FIELD_LABEL_CLASS, type FieldKind } from './Field';
import SectionHeading, { HEADING_CLASS } from './SectionHeading';
import { CELL_KIND_CLASS } from './DataTable';

const has = (el: HTMLElement, classes: string): void => {
  for (const c of classes.split(' ').filter(Boolean)) expect(el).toHaveClass(c);
};

describe('Field', () => {
  it('is a term and its description', () => {
    render(
      <FieldList>
        <Field label="Order date" kind="date">
          01 Mar 2025
        </Field>
      </FieldList>,
    );
    expect(screen.getByText('Order date').tagName).toBe('DT');
    expect(screen.getByText('01 Mar 2025').tagName).toBe('DD');
    expect(screen.getByText('Order date').closest('dl')).not.toBeNull();
  });

  it('every label is the same label', () => {
    render(
      <FieldList>
        <Field label="A" kind="id">
          1
        </Field>
        <Field label="B" kind="money">
          2
        </Field>
      </FieldList>,
    );
    has(screen.getByText('A'), FIELD_LABEL_CLASS);
    has(screen.getByText('B'), FIELD_LABEL_CLASS);
    expect(screen.getByText('A')).toHaveClass('text-xs', 'font-normal', 'text-text-tertiary');
  });

  it.each<[FieldKind, string]>([
    ['text', 'PT Sample'],
    ['id', 'PO-1'],
    ['number', '10'],
    ['money', 'Rp 1.000'],
    ['date', '01 Mar 2025'],
  ])('the KIND fixes the value: %s', (kind, value) => {
    render(
      <FieldList>
        <Field label="L" kind={kind}>
          {value}
        </Field>
      </FieldList>,
    );
    has(screen.getByText(value), FIELD_KIND_CLASS[kind]);
    expect(screen.getByText(value)).toHaveAttribute('data-kind', kind);
  });

  it('a value is regular weight — only a document number is semibold', () => {
    const kinds = Object.keys(FIELD_KIND_CLASS) as FieldKind[];
    expect(kinds.filter((k) => /font-semibold/.test(FIELD_KIND_CLASS[k]))).toEqual(['id']);
    for (const k of kinds) expect(FIELD_KIND_CLASS[k]).toMatch(/text-sm/);
  });

  it('a fact reads the same in a drawer field and in a table cell', () => {
    // family, weight and colour agree kind for kind; the table sets its size on the table
    const type = (cls: string): string[] =>
      cls
        .split(' ')
        .filter((c) => /^(font-(mono|sans|normal|semibold)|text-(data-navy|text-primary))$/.test(c))
        .sort();
    for (const kind of ['text', 'id', 'number', 'money', 'date'] as const) {
      expect(type(FIELD_KIND_CLASS[kind])).toEqual(type(CELL_KIND_CLASS[kind]));
    }
  });

  it('a second line is the one second line', () => {
    render(
      <FieldList>
        <Field label="Total" kind="money" sub="incl. VAT">
          Rp 1.000
        </Field>
      </FieldList>,
    );
    expect(screen.getByText('incl. VAT')).toHaveClass('font-sans', 'text-xs', 'font-normal', 'text-text-tertiary');
  });

  it('stack puts the label over the value; row puts them side by side', () => {
    const { rerender } = render(
      <FieldList data-testid="fl" columns={3}>
        <Field label="A">1</Field>
      </FieldList>,
    );
    expect(screen.getByTestId('fl')).toHaveClass('grid', 'grid-cols-3');
    rerender(
      <FieldList data-testid="fl" layout="row">
        <Field label="A">1</Field>
      </FieldList>,
    );
    expect(screen.getByTestId('fl')).toHaveClass('flex', 'flex-col');
    expect(screen.getByText('1')).toHaveClass('text-right');
    expect(screen.getByText('A').parentElement).toHaveClass('flex', 'justify-between');
  });

  it('carries a test id on the value', () => {
    render(
      <FieldList>
        <Field label="A" data-testid="v">
          1
        </Field>
      </FieldList>,
    );
    expect(screen.getByTestId('v').tagName).toBe('DD');
  });
});

describe('SectionHeading', () => {
  it('has two levels and no third', () => {
    expect(Object.keys(HEADING_CLASS)).toEqual(['section', 'group']);
  });

  it('a section is 16 semibold; a group is 11 caps grey', () => {
    render(
      <>
        <SectionHeading>Line items</SectionHeading>
        <SectionHeading level="group">Key facts</SectionHeading>
      </>,
    );
    const section = screen.getByRole('heading', { name: 'Line items' });
    const group = screen.getByRole('heading', { name: 'Key facts' });
    expect(section.tagName).toBe('H2');
    expect(section).toHaveClass('text-section', 'text-text-primary');
    expect(group.tagName).toBe('H3');
    expect(group).toHaveClass('text-label', 'text-text-tertiary', 'uppercase');
  });

  it('the element is the outline, not the look', () => {
    render(<SectionHeading as="h4">Deep</SectionHeading>);
    has(screen.getByRole('heading', { name: 'Deep', level: 4 }), HEADING_CLASS.section);
  });
});
