import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration: number;
}

export interface ToastInput {
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface UseToastReturn {
  toast: (input: ToastInput) => string;
  toasts: Toast[];
  dismiss: (id: string) => void;
}

type Action =
  | { type: 'add'; toast: Toast }
  | { type: 'dismiss'; id: string };

const reducer = (state: Toast[], action: Action): Toast[] => {
  if (action.type === 'add') return [...state, action.toast];
  if (action.type === 'dismiss')
    return state.filter((t) => t.id !== action.id);
  return state;
};

const generateId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const ToastContext = createContext<UseToastReturn | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, dispatch] = useReducer(reducer, [] as Toast[]);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'dismiss', id });
  }, []);

  const toast = useCallback((input: ToastInput): string => {
    const next: Toast = {
      id: generateId(),
      variant: input.variant ?? 'info',
      title: input.title,
      description: input.description,
      duration: input.duration ?? 4500,
    };
    dispatch({ type: 'add', toast: next });
    return next.id;
  }, []);

  const value = useMemo<UseToastReturn>(
    () => ({ toast, toasts, dismiss }),
    [toast, toasts, dismiss],
  );

  return React.createElement(
    ToastContext.Provider,
    { value },
    children,
  );
};

export const useToast = (): UseToastReturn => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
