import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';

export interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
}

export interface PrimaryAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  /**
   * ⚠️ §68 — `solid?: boolean` WAS HERE AND IS GONE. DP2-BUTTON-01 used to
   * reserve solid action-blue for the irreversible commit and this prop was the
   * opt-in. The reserved-solid register is retired portal-wide (operator
   * ruling): outline is the only primary register, so the prop promised a
   * rendering that no longer exists.
   *
   * ⚠️ **AND IT WAS ALREADY DEAD WHEN IT WAS REMOVED — no caller passed it.**
   * That is why the `variant="primary"` scan came back complete and was not:
   * this slot could render solid from a PROP, and a matcher keyed on the
   * literal could never have seen it. It was the model layer
   * (`invoiceActionModel`) that still carried the flag, one seam further in.
   */
}

interface BulkActionsBarProps {
  actions?: BulkAction[];
  primary?: PrimaryAction;
  className?: string;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  actions = [],
  primary,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {actions.map((a) => (
        <Button
          key={a.label}
          variant="secondary"
          icon={a.icon}
          onClick={a.onClick}
        >
          {a.label}
        </Button>
      ))}
      {primary && (
        <Button
          variant="outline"
          icon={primary.icon}
          onClick={primary.onClick}
        >
          {primary.label}
        </Button>
      )}
    </div>
  );
};

export default BulkActionsBar;
