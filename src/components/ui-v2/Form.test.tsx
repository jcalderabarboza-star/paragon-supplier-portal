// UI-1c-2 · the one form.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Checkbox,
  ChoiceCard,
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

describe('a control and the width the page gives it', () => {
  it('fills its field by default', () => {
    render(<TextInput aria-label="a" />);
    expect(screen.getByLabelText('a')).toHaveClass('w-full');
  });

  it('takes the page’s width instead — w-full is left out, not overridden', () => {
    render(
      <>
        <TextInput aria-label="a" className="w-32" />
        <Select aria-label="b" className="w-56" />
        <TextArea aria-label="c" className="w-72" />
      </>,
    );
    for (const [name, w] of [['a', 'w-32'], ['b', 'w-56'], ['c', 'w-72']] as const) {
      expect(screen.getByLabelText(name)).toHaveClass(w);
      expect(screen.getByLabelText(name)).not.toHaveClass('w-full');
    }
  });

  it('a flex or max-width rule sits beside w-full', () => {
    render(<TextInput aria-label="a" className="max-w-md flex-1" />);
    expect(screen.getByLabelText('a')).toHaveClass('w-full', 'max-w-md', 'flex-1');
  });

  it('is a text input unless the page says otherwise', () => {
    render(
      <>
        <TextInput aria-label="a" />
        <TextInput aria-label="b" type="date" />
      </>,
    );
    expect(screen.getByLabelText('a')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('b')).toHaveAttribute('type', 'date');
  });
});

describe('FormField · a refusal is announced once', () => {
  it('does not wrap an error that already announces itself in a second alert', () => {
    render(
      <FormField label="Value" error={<span role="alert" data-testid="refusal">Enter a value</span>}>
        <TextInput />
      </FormField>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByTestId('refusal')).toHaveAttribute('role', 'alert');
  });
});

describe('ChoiceCard', () => {
  it('the whole card is the label: a click on the card makes the choice', () => {
    const onChange = vi.fn();
    render(
      <ChoiceCard type="checkbox" checked={false} onChange={onChange} data-testid="box">
        <span>Annual audit</span>
        <span>Due every twelve months</span>
      </ChoiceCard>,
    );
    const card = screen.getByTestId('box').closest('label')!;
    expect(card).toHaveClass('rounded-lg', 'border', 'p-3', 'cursor-pointer');
    fireEvent.click(card);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('a selected card says so with the action border and tint, not with weight', () => {
    const { rerender } = render(
      <ChoiceCard type="radio" checked={false} onChange={() => {}} data-testid="r">
        External
      </ChoiceCard>,
    );
    const card = (): HTMLElement => screen.getByTestId('r').closest('label')!;
    expect(card()).toHaveClass('border-border-subtle');
    rerender(
      <ChoiceCard type="radio" checked onChange={() => {}} data-testid="r">
        External
      </ChoiceCard>,
    );
    expect(card()).toHaveClass('border-action', 'bg-action-soft', 'font-normal');
    expect(screen.getByTestId('r')).toHaveAttribute('type', 'radio');
  });
});
