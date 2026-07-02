import React from 'react';
import { Inbox } from 'lucide-react';
import AppShellV2 from '../layout-v2/AppShellV2';
import PageHeader from './PageHeader';

interface EmptyStateProps {
  breadcrumb?: string[];
  title?: string;
  subtitle?: string;
  message?: string;
}

// Full-page empty state — data loaded successfully but the scoped result is
// empty. Mirrors NoSupplierIdentity's shell + centered layout.
const EmptyState: React.FC<EmptyStateProps> = ({
  breadcrumb = ['EMPTY'],
  title = 'Nothing here yet',
  subtitle = 'There is no data to show for this view.',
  message = 'When records appear, they will show up here.',
}) => (
  <AppShellV2>
    <PageHeader breadcrumb={breadcrumb} title={title} subtitle={subtitle} />
    <div className="py-16 px-6 flex flex-col items-center text-center">
      <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
        <Inbox size={24} className="text-text-tertiary" />
      </div>
      <div className="text-sm text-text-tertiary max-w-md">{message}</div>
    </div>
  </AppShellV2>
);

export default EmptyState;
