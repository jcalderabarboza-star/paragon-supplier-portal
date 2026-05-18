import React from 'react';

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface FilterChipsBarProps<T extends string> {
  options: FilterChipOption<T>[];
  value: T | T[];
  onChange: (next: T) => void;
  multiSelect?: boolean;
  className?: string;
}

function FilterChipsBar<T extends string>({
  options,
  value,
  onChange,
  multiSelect = false,
  className = '',
}: FilterChipsBarProps<T>) {
  const isActive = (id: T): boolean => {
    if (Array.isArray(value)) return value.includes(id);
    return value === id;
  };

  return (
    <div
      role={multiSelect ? 'group' : 'radiogroup'}
      className={`inline-flex flex-wrap items-center gap-1 bg-bg-hover border border-border-subtle rounded-md p-1 ${className}`}
    >
      {options.map((opt) => {
        const active = isActive(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            role={multiSelect ? 'checkbox' : 'radio'}
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[6px] transition-all duration-150 cursor-pointer ${
              active
                ? 'bg-white text-text-primary shadow-sm'
                : 'bg-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                  active ? 'text-text-tertiary' : 'text-text-tertiary'
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

export default FilterChipsBar;
