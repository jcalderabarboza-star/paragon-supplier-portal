import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  eyebrow: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  eyebrow,
  value,
  subtitle,
  icon: Icon,
  className = '',
}) => {
  return (
    <div
      className={`relative bg-bg-surface rounded-lg p-6 shadow-sm border border-border-subtle ${className}`}
    >
      {Icon ? (
        <Icon
          size={18}
          className="absolute top-5 right-5 text-text-tertiary"
        />
      ) : null}
      <div className="text-eyebrow text-text-tertiary uppercase">{eyebrow}</div>
      <div className="text-4xl font-bold text-text-primary mt-3 leading-tight">
        {value}
      </div>
      {subtitle ? (
        <div className="text-meta text-text-secondary mt-2">{subtitle}</div>
      ) : null}
    </div>
  );
};

export default KpiCard;
