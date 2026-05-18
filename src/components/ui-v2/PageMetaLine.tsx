import React from 'react';

interface PageMetaLineProps {
  children: React.ReactNode;
  className?: string;
}

const PageMetaLine: React.FC<PageMetaLineProps> = ({
  children,
  className = '',
}) => {
  return (
    <p className={`text-meta text-text-tertiary ${className}`}>{children}</p>
  );
};

export default PageMetaLine;
