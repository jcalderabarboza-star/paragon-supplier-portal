import React from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
//
// ⚠️ **THE DEFAULTS ARE RESOLVED IN THE BODY, NOT IN THE PARAMETER LIST, AND
// THAT IS THE ENTIRE FIX.** They used to read `({ title = 'Loading…' })`, which
// evaluates when the component is CALLED — before the body runs, and `t()` is a
// hook binding that exists only while the body is running. So the i18n layer
// could not reach them however complete it got, and an EN-only suite passed on
// every one of them because English is what it asked for. `ErrorState` is the
// precedent this copies.
const LoadingState: React.FC<LoadingStateProps> = ({
  breadcrumb,
  title,
  subtitle,
  message,
}) => {
  const { t } = useTranslation();
  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={breadcrumb ?? [t('loadingState.crumb')]}
        title={title ?? t('loadingState.title')}
        subtitle={subtitle ?? t('loadingState.subtitle')}
      />
      <div className="py-16 px-6 flex flex-col items-center text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
          <Loader2 size={24} className="text-text-tertiary animate-spin" />
        </div>
        <div className="text-sm text-text-tertiary max-w-md">
          {message ?? t('loadingState.message')}
        </div>
      </div>
    </AppShellV2>
  );
};

export default LoadingState;
