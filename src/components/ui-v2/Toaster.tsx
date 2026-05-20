import React from 'react';
import Toast from './Toast';
import { useToast } from '../../hooks/useToast';

const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full sm:w-auto">
          <Toast
            id={t.id}
            variant={t.variant}
            title={t.title}
            description={t.description}
            duration={t.duration}
            onDismiss={dismiss}
          />
        </div>
      ))}
    </div>
  );
};

export default Toaster;
