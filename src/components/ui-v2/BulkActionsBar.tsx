import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';
import { ModuleOffNotice } from './ModuleOffNotice';
import { useRouteModuleOff } from '../../context/ModuleActivationContext';

// ⚠️ **`onClick` IS REQUIRED ON BOTH DESCRIPTORS, AND THAT IS THE WHOLE POINT OF
// THIS FILE'S CONTRIBUTION TO H3 — §103h's structural fix, finally taken.**
//
// It was `onClick?: () => void`, and an OPTIONAL handler on an action descriptor
// is how thirteen enabled toolbar buttons shipped doing nothing: every page
// header in the portal is built from this component, `{ label, icon }` type-checks
// perfectly, and the bar renders a button that looks exactly like a working one.
// `deadAffordance.guard` caught them, but only after the fact and only as a
// ratchet somebody had to keep naming.
//
// **REQUIRED MOVES THE REFUSAL FROM A TEST TO THE TYPE.** A descriptor with no
// handler is now a `tsc` failure at the CALL SITE, which is where the defect
// actually lives — not a red suite in `pages-v2` naming a file somebody else
// owns. A gate that runs in the compiler cannot be forgotten, cannot be
// re-pointed and cannot go stale, and it fires before the code is ever run.
//
// **THE COST, STATED: there is now no way to render a decorative button here,
// and that is intended.** A control that should not act is not a control; it is
// text, and `Button` is not how you render text. If a caller genuinely has
// nothing for a press to do, the answer is the honest notice every one of those
// thirteen call sites now passes — or not rendering the control.
export interface BulkAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
}

export interface PrimaryAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
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
  // M1 · on a READ-ONLY route (its module, part or side switched off) the
  // PRIMARY slot renders the module notice instead of its control. The primary
  // slot is the page's act by rule — DP2-BUTTON-01: an Export never occupies
  // it — so this is the one place a header's act can be withdrawn without
  // judging each caller. The secondary actions stay: they are the reads
  // (export, view toggles) an OFF module keeps answering (Design 5 §A.3).
  const routeOff = useRouteModuleOff();
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
      {primary && routeOff && (
        <ModuleOffNotice off={routeOff} variant="inline" testId="module-off-primary" />
      )}
      {primary && !routeOff && (
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
