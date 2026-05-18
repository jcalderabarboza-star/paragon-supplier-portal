import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, className = '' }) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-6 border-b border-border-subtle ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex items-center gap-2 py-3 text-sm transition-colors ${
              isActive
                ? 'text-teal font-semibold border-b-2 border-teal'
                : 'text-text-tertiary border-b-2 border-transparent hover:text-text-secondary'
            }`}
          >
            {Icon ? <Icon size={16} /> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
