import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Notice from './Notice';

// ─────────────────────────────────────────────────────────────────────────────
// SUP-2 · "ILLUSTRATIVE — NOT MEASURED" (operator ruling).
//
// The review found pages whose every figure is authored: a scorecard grade
// above KPIs cloned from another supplier, period chips that change a label,
// storefront statistics identical for every supplier. The ruling is to SAY SO
// and patch no figure: one banner at the top of the page, and one marker beside
// each figure, so a number read on its own still says what it is.
//
// Two pieces, one sentence. The banner carries the page's own second sentence
// (what the figures are, and what would replace them); the marker carries only
// the two words, because it sits beside a number.
//
// These are unconditional on purpose. `IllustrativeRegion` and
// `ProvenanceMarker` derive from the liveness registry and come off when a
// capability goes live; the figures marked here are literals in the page or a
// fixture with no reader of real data behind them, so nothing a registry flip
// does would make them measured.
// ─────────────────────────────────────────────────────────────────────────────

export const IllustrativeBanner: React.FC<{
  /** i18n key of the page's own sentence, said after the shared title. */
  bodyKey: string;
}> = ({ bodyKey }) => {
  const { t } = useTranslation();
  return (
    <Notice tone="sample" icon={FlaskConical} title={t('illustrative.banner.title')} className="mb-6" data-testid="illustrative-banner">
      {t(bodyKey)}
    </Notice>
  );
};

export const IllustrativeMark: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
    <span
      data-testid="illustrative-mark"
      title={t('illustrative.mark.title')}
      className={`inline-flex items-center gap-1 align-middle whitespace-nowrap text-label uppercase text-text-secondary border border-dashed border-border-input rounded px-1 py-px ${className}`}
    >
      <FlaskConical size={9} aria-hidden="true" />
      {t('illustrative.mark')}
    </span>
  );
};
