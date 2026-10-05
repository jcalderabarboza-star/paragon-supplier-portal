import React from 'react';
import { useInRouterContext, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { navSectionKeyFor } from '../layout-v2/navModel';

interface PageHeaderProps {
  /** The segments AFTER the section — the section itself is derived (H1). */
  breadcrumb: string[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /**
   * PLN-5 · a working surface's header: one size down and tight below, so the
   * work starts above the fold (the plan grid at 1600×900). Same content.
   */
  compact?: boolean;
}

/**
 * H1 · the sidebar group the current location opens under, translated, or null.
 * Call it only inside a router (every page is).
 */
export function useNavSection(): string | null {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const key = navSectionKeyFor(pathname);
  return key ? t(key) : null;
}

/**
 * The first breadcrumb segment is the sidebar group the page opens under,
 * derived from the nav model by location, never written by the page. A location
 * under no group (the 404) prepends nothing, and so does a render outside a
 * router (a spec mounting the header alone).
 */
const PageHeader: React.FC<PageHeaderProps> = (props) =>
  useInRouterContext() ? <RoutedPageHeader {...props} /> : <PageHeaderView section={null} {...props} />;

const RoutedPageHeader: React.FC<PageHeaderProps> = (props) => (
  <PageHeaderView section={useNavSection()} {...props} />
);

const PageHeaderView: React.FC<PageHeaderProps & { section: string | null }> = ({
  section,
  breadcrumb,
  title,
  subtitle,
  actions,
  compact = false,
}) => {
  const crumbs = section ? [section, ...breadcrumb] : breadcrumb;
  return (
    <div className={`flex items-start justify-between gap-4 ${compact ? 'mb-2' : 'mb-8'}`}>
      <div className="min-w-0">
        <div className="text-eyebrow text-text-tertiary uppercase" data-testid="page-breadcrumb">
          {crumbs.join(' · ')}
        </div>
        <h1 className={compact ? 'mt-0.5 text-xl font-semibold text-text-primary' : 'text-title text-text-primary mt-1'}>
          {title}
        </h1>
        {subtitle ? (
          <p className={compact ? 'mt-0.5 text-sm text-text-secondary' : 'text-base text-text-secondary mt-2 max-w-prose'}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};

export default PageHeader;
