import React from 'react';
import { Menu, Search, Bell, ChevronDown, Languages } from 'lucide-react';

const TopBarV2: React.FC = () => {
  return (
    <header className="h-14 w-full bg-bg-surface border-b border-border-subtle flex items-center px-4 gap-4">
      {/* Left cluster */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          aria-label="Toggle navigation"
          className="p-2 rounded-md text-text-secondary hover:bg-bg-hover"
        >
          <Menu size={18} />
        </button>
        <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
          Paragon Supplier Portal
        </span>
        <span className="text-label bg-warning-soft text-warning px-2 py-0.5 rounded-full uppercase">
          Preview
        </span>
      </div>

      {/* Center search */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search... (Ctrl K)"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-bg-hover text-sm text-text-primary placeholder:text-text-tertiary border border-transparent focus:outline-none focus:border-border-input focus:bg-bg-surface"
          />
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary px-2 py-1.5 rounded-md hover:bg-bg-hover"
        >
          <Languages size={16} className="text-text-tertiary" />
          <span className="font-medium">EN</span>
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-md text-text-secondary hover:bg-bg-hover"
        >
          <Bell size={18} />
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            3
          </span>
        </button>
        <div
          aria-label="User avatar"
          className="w-8 h-8 rounded-full bg-teal text-white text-xs font-semibold flex items-center justify-center"
        >
          JJ
        </div>
      </div>
    </header>
  );
};

export default TopBarV2;
