import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /**
   * UI-1d: what a tab that OWNS A PANEL states — the element id the panel's
   * `aria-labelledby` names, the panel it controls, and a test id. A tab that
   * only filters a list leaves all three out.
   */
  domId?: string;
  controls?: string;
  testId?: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  /** Names the tab list for a screen reader. */
  ariaLabel?: string;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange, ariaLabel, className = '' }) => {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-6 border-b border-border-subtle ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            id={tab.domId}
            data-testid={tab.testId}
            aria-controls={tab.controls}
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex items-center gap-2 py-3 text-sm transition-colors ${
              isActive
                ? 'text-action-hover font-semibold border-b-2 border-action'
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
