import React from 'react';
import { Calendar } from 'lucide-react';

export interface TimeRangeOption<T extends string> {
  id: T;
  label: string;
}

interface TimeRangeToggleProps<T extends string> {
  options: TimeRangeOption<T>[];
  value: T;
  onChange: (id: T) => void;
}

function TimeRangeToggle<T extends string>({
  options,
  value,
  onChange,
}: TimeRangeToggleProps<T>) {
  return (
    <div className="inline-flex items-center gap-1 bg-bg-hover border border-border-subtle rounded-md p-1">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[6px] transition-all duration-150 cursor-pointer ${
              active
                ? 'bg-white text-text-primary shadow-sm'
                : 'bg-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {active && <Calendar size={14} className="text-text-tertiary" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default TimeRangeToggle;
