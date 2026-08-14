import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({
  open,
  onClose,
  title,
  children,
  footerActions,
}) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 transition-opacity duration-300 ease-out ${
          open
            ? 'bg-[rgba(13,27,42,0.4)] opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-50 h-screen w-full sm:w-[480px] bg-bg-surface shadow-md border-l border-border-subtle flex flex-col transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-text-primary truncate">
            {title}
          </h2>
          <button
            type="button"
            aria-label={t('ui.closePanel')}
            onClick={onClose}
            className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footerActions && (
          <footer className="border-t border-border-subtle px-6 py-4 flex justify-end gap-2">
            {footerActions}
          </footer>
        )}
      </aside>
    </>
  );
};

export default SidePanel;
