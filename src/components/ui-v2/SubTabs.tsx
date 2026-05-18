import React from 'react';

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
}

function SubTabs<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SubTabsProps<T>) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-6 border-b border-border-subtle ${className}`}
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
            className={`-mb-px flex items-center gap-2 py-3 text-sm transition-colors ${
              active
                ? 'text-teal font-semibold border-b-2 border-teal'
                : 'text-text-tertiary border-b-2 border-transparent hover:text-text-secondary'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`inline-flex items-center justify-center rounded-full px-2 h-5 text-xs font-semibold ${
                  active
                    ? 'bg-teal-soft text-teal'
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
