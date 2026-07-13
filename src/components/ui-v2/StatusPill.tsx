import React from 'react';
import { useTranslation } from 'react-i18next';
import { statusLabelKey } from '../../lib/statusLabel';
import { enumLabelKey } from '../../lib/priorityLabel';
import { categoryLabelKey } from '../../lib/categoryLabel';
import { channelLabelKey } from '../../lib/channelLabel';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

// DP-3 (TMS alignment): quiet outlined chips — soft tint background, a thin
// matching-hue border, a small radius, and no solid saturated fills. The soft
// tint + colored text carry the DP-2 semantic; the border + tight radius give
// the TMS "quiet" grammar. All StatusPill sites inherit this centrally.
//
// DP3-FONT-01 chip mapping (ratified): the five canonical tones are
// positive=success, caution=warning, critical=danger, info, neutral. `info` is
// the #0070F2 action-blue family (informational statuses align with the blue
// system) — action-soft fill + action border, with action-hover text for AA
// (4.76:1 on soft; #0070F2 itself fails at ~3.6:1). Tone is resolved from the
// canonical table in src/lib/statusTone.ts — StatusPill never string-matches.
const VARIANT_CLASS: Record<Variant, string> = {
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning-hover border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-action-soft text-action-hover border-action/40',
  neutral: 'bg-bg-hover text-text-secondary border-border-subtle',
};

const StatusPill: React.FC<StatusPillProps> = ({
  variant = 'neutral',
  children,
  className = '',
}) => {
  const { t } = useTranslation();
  // Localize known canonical labels from the central maps; anything else
  // (domain-specific labels) renders verbatim. In EN the resolved value equals
  // the canonical string, so output is unchanged. statusLabel wins for
  // overlapping tokens; priority/risk/enum vocab, then category, then channel
  // are fallbacks (SEAT2-I18N-ENUM/CATEGORY/CHANNEL-01) — disjoint namespaces,
  // so first-match order is immaterial to correctness. A pill is display-only,
  // so this is always an honest display translation.
  //
  // SEAT2-I18N-PILL-CHILDREN-01: a canonical token wrapped alongside an icon
  // (e.g. <span><RefreshCw/>{status}</span>) arrives as a NON-string child, so a
  // plain `typeof children === 'string'` check would leave it in EN. We instead
  // walk the child tree and localize every string LEAF in place, preserving the
  // surrounding icon/markup. Non-canonical strings pass through unchanged, so
  // the plain-string case stays byte-identical.
  const translateLeaf = (s: string): string => {
    const key =
      statusLabelKey(s) ??
      enumLabelKey(s) ??
      categoryLabelKey(s) ??
      channelLabelKey(s);
    return key ? t(key) : s;
  };
  const localize = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') return translateLeaf(node);
    if (Array.isArray(node))
      return node.map((n, i) => (
        <React.Fragment key={i}>{localize(n)}</React.Fragment>
      ));
    if (React.isValidElement(node) && node.props.children != null)
      return React.cloneElement(
        node,
        node.props,
        localize(node.props.children),
      );
    return node;
  };
  const label = localize(children);
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium ${VARIANT_CLASS[variant]} ${className}`}
    >
      {label}
    </span>
  );
};

export default StatusPill;
