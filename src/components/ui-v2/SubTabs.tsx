export interface SubTabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface SubTabsProps<T extends string> {
  options: SubTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  /**
   * PG-1: `chips` draws the same tabs as a row of chips — a set of VIEWS of one
   * list, chosen by the task, where the underline form is a set of sections. The
   * roles are the same either way: a `tablist` of `tab`s, one selected.
   */
  variant?: 'underline' | 'chips';
}

function SubTabs<T extends string>({
  options,
  value,
  onChange,
  className = '',
  variant = 'underline',
}: SubTabsProps<T>) {
  const chips = variant === 'chips';
  return (
    <div
      role="tablist"
      data-variant={variant}
      className={`flex items-center ${chips ? 'flex-wrap gap-2' : 'gap-6 border-b border-border-subtle'} ${className}`}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.id)}
            className={
              chips
                ? `flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? 'border-action bg-action-soft font-semibold text-action-text'
                      : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
                  }`
                : `-mb-px flex items-center gap-2 py-3 text-sm transition-colors ${
                    active
                      ? 'text-action-hover font-semibold border-b-2 border-action'
                      : 'text-text-tertiary border-b-2 border-transparent hover:text-text-secondary'
                  }`
            }
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 h-5 text-xs font-semibold ${
                  active
                    ? 'bg-action-soft text-action-hover'
                    : 'bg-bg-hover text-text-tertiary'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SubTabs;
