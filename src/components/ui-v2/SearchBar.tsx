import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  /** Accessible name for the input. Optional and additive (GL-1): a placeholder
   *  is a hint, not a label, and a search box whose only name is its hint loses
   *  that name the moment a reader types. Existing callers are unaffected. */
  ariaLabel?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  ariaLabel,
}) => {
  return (
    <div
      className={`flex items-center h-10 w-full bg-white border border-border-input rounded-md px-3 gap-2 focus-within:border-teal transition-colors ${className}`}
    >
      <Search size={16} className="text-text-tertiary shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="text-text-tertiary hover:text-text-secondary shrink-0"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
