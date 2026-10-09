// UI-1c-2 · the one form.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Checkbox,
  FieldLabel,
  FormField,
  FORM_ERROR_CLASS,
  FORM_HINT_CLASS,
  FORM_LABEL_CLASS,
  Radio,
  Select,
  TextArea,
  TextInput,
  controlClass,
} from './Form';

const has = (el: Element, classes: string): void => {
  for (const c of classes.split(' ').filter(Boolean)) expect(el).toHaveClass(c);
};

describe('form controls', () => {
  it('an input and a select are 40px high; a text area grows from 80', () => {
    render(
      <>
        <TextInput aria-label="name" />
        <Select aria-label="type">
          <option>a</option>
        </Select>
        <TextArea aria-label="note" />
      </>,
    );
    expect(screen.getByLabelText('name')).toHaveClass('h-10');
    expect(screen.getByLabelText('type')).toHaveClass('h-10');
    expect(screen.getByLabelText('note')).toHaveClass('min-h-[80px]');
    expect(screen.getByLabelText('note')).not.toHaveClass('h-10');
  });

  it('there is no second height: nothing in the control class offers one', () => {
    for (const opts of [{}, { mono: true }, { invalid: true }]) {
      expect(controlClass(opts).split(' ').filter((c) => /^h-/.test(c))).toEqual(['h-10']);
    }
  });

  it('all three are the same box and the same type', () => {
    render(
      <>
        <TextInput aria-label="a" />
        <Select aria-label="b" />
        <TextArea aria-label="c" />
      </>,
    );
    for (const name of ['a', 'b', 'c']) {
      expect(screen.getByLabelText(name)).toHaveClass('rounded-md', 'border', 'border-border-input', 'px-3', 'font-sans', 'text-sm', 'font-normal', 'text-text-primary');
    }
  });

  it('a code or a figure is mono; a refused value has a critical border and says so', () => {
    render(
      <>
        <TextInput aria-label="code" mono />
        <TextInput aria-label="bad" invalid />
      </>,
    );
    expect(screen.getByLabelText('code')).toHaveClass('font-mono');
    expect(screen.getByLabelText('code')).not.toHaveClass('font-sans');
    expect(screen.getByLabelText('bad')).toHaveClass('border-critical');
    expect(screen.getByLabelText('bad')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('code')).not.toHaveAttribute('aria-invalid');
  });

  it('takes every native attribute and a ref', () => {
    const onChange = vi.fn();
    const ref = { current: null as HTMLInputElement | null };
    render(<TextInput ref={ref} aria-label="qty" type="number" min={1} placeholder="0" data-testid="q" onChange={onChange} className="w-32" />);
    const el = screen.getByTestId('q');
    expect(el).toHaveAttribute('type', 'number');
    expect(el).toHaveAttribute('min', '1');
    expect(el).toHaveClass('w-32', 'h-10');
    fireEvent.change(el, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalled();
    expect(ref.current).toBe(el);
  });
});

describe('FormField', () => {
  it('names its control by wrapping it, with no id needed', () => {
    render(
      <FormField label="Supplier">
        <TextInput />
      </FormField>,
    );
    expect(screen.getByLabelText('Supplier').tagName).toBe('INPUT');
    has(screen.getByText('Supplier'), FORM_LABEL_CLASS);
  });

  it('names its control by id when the two sit apart', () => {
    render(
      <FormField label="Reason" htmlFor="r">
        <TextArea id="r" />
      </FormField>,
    );
    expect(screen.getByLabelText('Reason').tagName).toBe('TEXTAREA');
  });

  it('a hint is grey; an error is critical and announced', () => {
    render(
      <FormField label="Qty" hint="In kilograms" error="Enter a quantity">
        <TextInput invalid />
      </FormField>,
    );
    has(screen.getByText('In kilograms'), FORM_HINT_CLASS);
    const err = screen.getByRole('alert');
    expect(err).toHaveTextContent('Enter a quantity');
    has(err, FORM_ERROR_CLASS);
  });

  it('a required field shows a mark the reader sees and a screen reader does not', () => {
    render(
      <FormField label="Material" required>
        <TextInput />
      </FormField>,
    );
    const star = screen.getByText('*', { exact: false, selector: 'span[aria-hidden="true"]' });
    expect(star).toHaveClass('text-critical');
    expect(screen.getByLabelText(/Material/).tagName).toBe('INPUT');
  });

  it('every label is the same label, wrapped or apart', () => {
    render(
      <>
        <FormField label="A">
          <TextInput />
        </FormField>
        <FormField label="B" htmlFor="b">
          <TextInput id="b" />
        </FormField>
        <FieldLabel htmlFor="c">C</FieldLabel>
      </>,
    );
    for (const name of ['A', 'B', 'C']) has(screen.getByText(name), FORM_LABEL_CLASS);
    expect(FORM_LABEL_CLASS).toBe('font-sans text-xs font-medium text-text-primary');
  });
});

describe('Checkbox and Radio', () => {
  it('the words beside the box are body text, and name it', () => {
    render(
      <>
        <Checkbox>Lab sample required</Checkbox>
        <Radio name="v" value="pass">
          Pass
        </Radio>
      </>,
    );
    const box = screen.getByLabelText('Lab sample required');
    expect(box).toHaveAttribute('type', 'checkbox');
    expect(box.closest('label')).toHaveClass('font-sans', 'text-sm', 'font-normal', 'text-text-primary');
    expect(screen.getByLabelText('Pass')).toHaveAttribute('type', 'radio');
  });

  it('a box with no words takes its name from aria-label', () => {
    render(<Checkbox aria-label="Select row" />);
    expect(screen.getByLabelText('Select row')).toHaveAttribute('type', 'checkbox');
  });
});
