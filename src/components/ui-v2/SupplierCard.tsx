import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import StatusPill from './StatusPill';

export interface SupplierCardCompliance {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

interface SupplierCardProps {
  name: string;
  country: string;
  countryFlag?: string;
  tier?: string;
  categories?: string[];
  otif?: number | null;
  compliance?: SupplierCardCompliance[];
  description?: string;
  onView?: () => void;
  className?: string;
}

const SupplierCard: React.FC<SupplierCardProps> = ({
  name,
  country,
  countryFlag,
  tier,
  categories = [],
  otif,
  compliance = [],
  description,
  onView,
  className = '',
}) => {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`flex flex-col bg-bg-surface border border-border-subtle rounded-lg shadow-sm hover:shadow-md transition-shadow p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 shrink-0 rounded-md bg-action-soft text-action-hover flex items-center justify-center font-semibold text-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {name}
            </h3>
          </div>
          <div className="text-meta text-text-tertiary mt-0.5 flex items-center gap-1.5">
            <span>{countryFlag ?? country}</span>
            <span>·</span>
            <span>{country}</span>
            {tier && (
              <>
                <span>·</span>
                <span>{tier}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {description && (
        <p className="mt-3 text-meta text-text-secondary line-clamp-3">
          {description}
        </p>
      )}

      {categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <span
              key={c}
              className="inline-flex items-center rounded-full bg-bg-hover text-text-secondary text-xs px-2 py-0.5"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4">
        {typeof otif === 'number' && (
          <div>
            <div className="text-label text-text-tertiary uppercase">OTIF</div>
            <div className="text-base font-semibold text-text-primary">
              {otif}%
            </div>
          </div>
        )}
        {compliance.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {compliance.map((c) => (
              <StatusPill key={c.label} variant={c.variant ?? 'neutral'}>
                {c.label}
              </StatusPill>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:text-teal-hover transition-colors"
        >
          View profile
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default SupplierCard;
