import React from 'react';
import { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: LucideIcon;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'bg-action text-white border border-action hover:bg-action-hover hover:border-action-hover',
  secondary:
    'bg-bg-surface text-text-primary border border-border-input hover:bg-bg-hover',
  // DP2-BUTTON-01: action-blue OUTLINE — transparent fill, blue border + text.
  // The calm triage CTA weight; solid-fill primary stays reserved for one hero
  // action per view.
  outline:
    'bg-transparent text-action border border-action hover:bg-action-soft',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  ...rest
}) => {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
};

export default Button;
