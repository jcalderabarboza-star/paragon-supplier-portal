import React from 'react';
import { AlertTriangle } from 'lucide-react';
import AppShellV2 from '../layout-v2/AppShellV2';
import PageHeader from './PageHeader';
import Button from './Button';
import { DataError } from '../../services/data/types';

interface ErrorStateProps {
  error?: unknown;
  breadcrumb?: string[];
  title?: string;
  onRetry?: () => void;
}

function describe(error: unknown): string {
  if (error instanceof DataError) return `${error.code}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// Full-page error state — renders the thrown DataError (code + message).
// Mirrors NoSupplierIdentity's shell + centered layout.
const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  breadcrumb = ['ERROR'],
  title = 'Something went wrong',
  onRetry,
}) => (
  <AppShellV2>
    <PageHeader
      breadcrumb={breadcrumb}
      title={title}
      subtitle="The data could not be loaded."
    />
    <div className="py-16 px-6 flex flex-col items-center text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-danger" />
      </div>
      <div className="text-base font-semibold text-text-primary mb-1">
        Unable to load this page
      </div>
      <div className="text-sm text-text-tertiary max-w-md mb-4">
        {describe(error)}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  </AppShellV2>
);

export default ErrorState;
