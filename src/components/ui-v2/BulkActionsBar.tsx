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
   * DP2-BUTTON-01: the slot renders OUTLINE by default (the calm register). Set
   * `solid` only when the action is a consequential/irreversible commit (Award,
   * Release payment, Post-to-SAP, Reject) — solid is now that signal.
   */
  solid?: boolean;
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
          variant={primary.solid ? 'primary' : 'outline'}
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
