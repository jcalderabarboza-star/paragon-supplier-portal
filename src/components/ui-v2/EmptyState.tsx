import React from 'react';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  // Not localized, and unreachable rather than overlooked: all 29 render sites
  // pass these three (derived from the `<EmptyState` sites, and RE-derived by
  // the module-scope-literal gate on every run — so the day a site omits one,
  // it becomes a defect without anyone re-reading this comment). A key with no
  // reader is the stored-field shape, so these stay literals.
  breadcrumb = ['EMPTY'],
  title = 'Nothing here yet',
  subtitle = 'There is no data to show for this view.',
  // `message` is the one that DOES render: omitted at BuyerDashboard and
  // BuyerInvoices, both of which translate their title and subtitle. Resolved
  // in the body, because a parameter default runs before `t()` exists.
  message,
}) => {
  const { t } = useTranslation();
  return (
    <AppShellV2>
      <PageHeader breadcrumb={breadcrumb} title={title} subtitle={subtitle} />
      <div className="py-16 px-6 flex flex-col items-center text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
          <Inbox size={24} className="text-text-tertiary" />
        </div>
        <div className="text-sm text-text-tertiary max-w-md">
          {message ?? t('emptyState.message')}
        </div>
      </div>
    </AppShellV2>
  );
};

export default EmptyState;
