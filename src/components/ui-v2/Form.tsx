import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1c-2 · THE ONE FORM.
//
// Every place the portal asks for something — a wizard step, a dialog, a filter
// — uses the same controls and the same label (operator rulings, 9 October
// 2026: 40px everywhere, no compact tier):
//
//   control   TextInput · Select · TextArea    40px high (a text area grows),
//                                              Inter 14 regular, one border,
//                                              one radius, one focus ring
//   label     FormField / FieldLabel           Inter 12 medium, primary
//   hint                                       Inter 12 regular, grey
//   error                                      Inter 12 regular, critical
//   choice    Checkbox · Radio                 Inter 14 regular beside the box
//
// The inventory found 276 controls written by hand in 45 files, rendering in 25
// different boxes from 20px to 40px high, under labels in 18 styles.
//
// A control takes every native attribute. `className` is for layout — a width,
// a flex rule — never a height, a size or a colour. `mono` is for a control
// that holds a code or a figure.
// ─────────────────────────────────────────────────────────────────────────────

export const FORM_LABEL_CLASS = 'font-sans text-xs font-medium text-text-primary';
export const FORM_HINT_CLASS = 'font-sans text-xs font-normal text-text-tertiary';
export const FORM_ERROR_CLASS = 'font-sans text-xs font-normal text-critical';

const CONTROL_BASE =
  'rounded-md border bg-bg-surface px-3 text-sm font-normal text-text-primary ' +
  'placeholder:text-text-tertiary focus:outline-none focus:border-action ' +
  'disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-tertiary';

/** The control's box and type. The ONLY place a form control is dressed. */
export function controlClass(opts: { mono?: boolean; invalid?: boolean; area?: boolean; width?: string } = {}): string {
  return [
    CONTROL_BASE,
    // A control fills its field unless the page gives it a width. `w-full` is
    // left out then, not overridden: in the built CSS it sorts after `w-32`,
    // and a class that loses the cascade is a width the page asked for and did
    // not get.
    /(?:^|\s)w-/.test(opts.width ?? '') ? '' : 'w-full',
    opts.area ? 'min-h-[80px] py-2' : 'h-10',
    opts.mono ? 'font-mono' : 'font-sans',
    opts.invalid ? 'border-critical' : 'border-border-input',
  ].join(' ');
}

interface Dressing {
  /** The control holds a code or a figure. */
  mono?: boolean;
  /** The value was refused. */
  invalid?: boolean;
}

export type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & Dressing;

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ mono, invalid, className = '', ...rest }, ref) => (
    <input
      ref={ref}
      type="text"
      aria-invalid={invalid || undefined}
      data-control="input"
      className={`${controlClass({ mono, invalid, width: className })} ${className}`}
      {...rest}
    />
  ),
);
TextInput.displayName = 'TextInput';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & Dressing;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ mono, invalid, className = '', children, ...rest }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      data-control="select"
      className={`${controlClass({ mono, invalid, width: className })} ${className}`}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & Dressing;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ mono, invalid, className = '', ...rest }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      data-control="textarea"
      className={`${controlClass({ mono, invalid, area: true, width: className })} ${className}`}
      {...rest}
    />
  ),
);
TextArea.displayName = 'TextArea';

/** A label that stands apart from its control. Give it `htmlFor`. */
export const FieldLabel: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
> = ({ required, className = '', children, ...rest }) => (
  <label className={`block ${FORM_LABEL_CLASS} ${className}`} {...rest}>
    {children}
    {required ? (
      <span aria-hidden="true" className="text-critical">
        {' '}
        *
      </span>
    ) : null}
  </label>
);

interface FormFieldProps {
  label: React.ReactNode;
  /** The control (and anything that sits with it). */
  children: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  /** What was refused, in words. Announced. */
  error?: React.ReactNode;
  /**
   * The control's id. Without it the label WRAPS the control, which names it
   * with no id at all; with it the label points at the control and the two can
   * sit apart.
   */
  htmlFor?: string;
  /** Layout only. */
  className?: string;
  'data-testid'?: string;
}

const announcesItself = (node: React.ReactNode): boolean =>
  React.isValidElement<{ role?: string }>(node) && typeof node.props.role === 'string';

/** A label, its control, and what is said about it. */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  children,
  required,
  hint,
  error,
  htmlFor,
  className = '',
  'data-testid': testId,
}) => {
  const text = (
    <>
      {label}
      {required ? (
        <span aria-hidden="true" className="text-critical">
          {' '}
          *
        </span>
      ) : null}
    </>
  );
  const notes = (
    <>
      {hint ? <span className={`mt-1 block ${FORM_HINT_CLASS}`}>{hint}</span> : null}
      {error ? (
        // An error element that already announces itself (it carries its own
        // `role`) is not wrapped in a second alert: a refusal is said once.
        <span role={announcesItself(error) ? undefined : 'alert'} className={`mt-1 block ${FORM_ERROR_CLASS}`}>
          {error}
        </span>
      ) : null}
    </>
  );
  if (htmlFor) {
    return (
      <div className={className} data-testid={testId} data-form-field="">
        <label htmlFor={htmlFor} className={`mb-1 block ${FORM_LABEL_CLASS}`}>
          {text}
        </label>
        {children}
        {notes}
      </div>
    );
  }
  return (
    <label className={`block ${className}`} data-testid={testId} data-form-field="">
      <span className={`mb-1 block ${FORM_LABEL_CLASS}`}>{text}</span>
      {children}
      {notes}
    </label>
  );
};

type ChoiceProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  /** The words beside the box. */
  children?: React.ReactNode;
};

const choice =
  (type: 'checkbox' | 'radio', name: string) =>
  // eslint-disable-next-line react/display-name
  React.forwardRef<HTMLInputElement, ChoiceProps>(({ children, className = '', ...rest }, ref) => (
    <label className={`inline-flex items-center gap-2 font-sans text-sm font-normal text-text-primary ${className}`} data-choice={name}>
      <input ref={ref} type={type} className="h-4 w-4 shrink-0 accent-action" {...rest} />
      {children ? <span>{children}</span> : null}
    </label>
  ));

export const Checkbox = choice('checkbox', 'checkbox');
Checkbox.displayName = 'Checkbox';
export const Radio = choice('radio', 'radio');
Radio.displayName = 'Radio';

type ChoiceCardProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  type: 'checkbox' | 'radio';
  /** What the card says: a title, a line under it, a chip. */
  children: React.ReactNode;
};

/**
 * A choice drawn as a CARD: the whole card is the label, so a click anywhere on
 * it — its padding included — makes the choice. A selected card takes the
 * action border and tint. For a row of options each with more to say than a few
 * words (a registration type, a suggested obligation, a channel).
 */
export const ChoiceCard = React.forwardRef<HTMLInputElement, ChoiceCardProps>(
  ({ type, children, className = '', checked, disabled, ...rest }, ref) => (
    <label
      data-choice="card"
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-sans text-sm font-normal text-text-primary transition-colors ${
        checked ? 'border-action bg-action-soft' : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
    >
      <input ref={ref} type={type} checked={checked} disabled={disabled} className="mt-0.5 h-4 w-4 shrink-0 accent-action" {...rest} />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  ),
);
ChoiceCard.displayName = 'ChoiceCard';
