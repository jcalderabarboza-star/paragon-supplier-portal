import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X,
  LucideIcon,
} from 'lucide-react';
import { ToastVariant } from '../../hooks/useToast';

interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const VARIANT_BORDER: Record<ToastVariant, string> = {
  success: 'border-l-teal',
  error: 'border-l-danger',
  info: 'border-l-info',
  warning: 'border-l-warning',
};

const VARIANT_ICON: Record<ToastVariant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  success: 'text-teal',
  error: 'text-danger',
  info: 'text-info',
  warning: 'text-warning',
};

const Toast: React.FC<ToastProps> = ({
  id,
  variant = 'info',
  title,
  description,
  duration = 4500,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    const closeTimer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => onDismiss(id), 150);
    }, duration);
    return () => window.clearTimeout(closeTimer);
  }, [id, duration, onDismiss]);

  const handleClose = () => {
    setVisible(false);
    window.setTimeout(() => onDismiss(id), 150);
  };

  const Icon = VARIANT_ICON[variant];

  return (
    <div
      role="status"
      className={`min-w-[320px] max-w-[420px] bg-bg-surface border border-border-subtle border-l-4 ${VARIANT_BORDER[variant]} rounded-md shadow-md p-4 flex items-start gap-3 transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Icon size={18} className={`${VARIANT_ICON_COLOR[variant]} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary">{title}</div>
        {description && (
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleClose}
        className="text-text-tertiary hover:text-text-secondary shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
