import React from 'react';

type Size = 'sm' | 'md';
type OnColor = 'teal' | 'success';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
  size?: Size;
  onColor?: OnColor;
  disabled?: boolean;
}

const TRACK_SIZE: Record<Size, string> = {
  sm: 'w-10 h-5',
  md: 'w-12 h-6',
};

const THUMB_SIZE: Record<Size, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
};

const THUMB_OFFSET: Record<Size, { off: string; on: string }> = {
  sm: { off: '2px', on: '22px' },
  md: { off: '4px', on: '24px' },
};

const ON_BG: Record<OnColor, string> = {
  teal: 'bg-teal',
  success: 'bg-success',
};

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  size = 'sm',
  onColor = 'teal',
  disabled = false,
}) => {
  const offset = checked ? THUMB_OFFSET[size].on : THUMB_OFFSET[size].off;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        TRACK_SIZE[size]
      } ${checked ? ON_BG[onColor] : 'bg-bg-hover border border-border-input'}`}
    >
      <span
        className={`absolute top-0.5 rounded-full bg-white shadow-sm transition-all ${THUMB_SIZE[size]}`}
        style={{ left: offset }}
      />
    </button>
  );
};

export default Switch;
