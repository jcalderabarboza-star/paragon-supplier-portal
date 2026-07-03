import React from 'react';

interface PageHeaderProps {
  breadcrumb: string[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumb,
  title,
  subtitle,
  actions,
}) => {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        <div className="text-eyebrow text-text-tertiary uppercase">
          {breadcrumb.join(' · ')}
        </div>
        <h1 className="text-title text-text-primary mt-1">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-base text-text-secondary mt-2 max-w-prose">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
};

export default PageHeader;
