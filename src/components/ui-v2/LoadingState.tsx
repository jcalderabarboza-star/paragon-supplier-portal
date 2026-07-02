import React from 'react';
import { Loader2 } from 'lucide-react';
import AppShellV2 from '../layout-v2/AppShellV2';
import PageHeader from './PageHeader';

interface LoadingStateProps {
  breadcrumb?: string[];
  title?: string;
  subtitle?: string;
  message?: string;
}

// Full-page loading state — the first of the four honest states (loading /
// error / empty / data). Mirrors NoSupplierIdentity's shell + centered layout.
const LoadingState: React.FC<LoadingStateProps> = ({
  breadcrumb = ['LOADING'],
  title = 'Loading…',
  subtitle = 'Fetching the latest data.',
  message = 'One moment.',
}) => (
  <AppShellV2>
    <PageHeader breadcrumb={breadcrumb} title={title} subtitle={subtitle} />
    <div className="py-16 px-6 flex flex-col items-center text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
        <Loader2 size={24} className="text-text-tertiary animate-spin" />
      </div>
      <div className="text-sm text-text-tertiary max-w-md">{message}</div>
    </div>
  </AppShellV2>
);

export default LoadingState;
