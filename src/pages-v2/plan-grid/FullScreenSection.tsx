import React, { useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import Button from '../../components/ui-v2/Button';

// ────────────────────────────────────────────────────────────────────────────
// FullScreenSection (Stage G · G1.3.2) — the shared per-section full-screen
// wrapper for the plan grid (award / intake / drawer).
//
// Collapsed, it renders its child inline at `normalHeight`. Expanded, it lifts
// the child into an `inset-0 z-50` overlay and hands it a viewport-tall height
// (`innerHeight − chrome`) that reuses the SAME DSG height-pin the trembling fix
// introduced (`--plan-dsg-h`, planGrid.css) — so a virtualized grid fills the
// screen without structural rework. The child is a render-prop receiving
// `{ expanded, dsgHeight }`; a DSG section pipes `dsgHeight` into both its
// `height` prop and the pin, while the plain-DOM drawer simply ignores it.
// No data path changes on expand — this is pure presentation.
// ────────────────────────────────────────────────────────────────────────────

// Overlay chrome (header + padding) reserved above the child when expanded.
const OVERLAY_CHROME_PX = 128;

interface FullScreenSectionProps {
  title: string;
  /** The child (DSG) height when collapsed; also the pin value inline. */
  normalHeight: number;
  children: (state: { expanded: boolean; dsgHeight: number }) => React.ReactNode;
}

const FullScreenSection: React.FC<FullScreenSectionProps> = ({
  title,
  normalHeight,
  children,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [viewportH, setViewportH] = useState(() =>
    typeof window === 'undefined' ? 768 : window.innerHeight,
  );

  // Track the viewport so the expanded height follows resize/rotate.
  useEffect(() => {
    if (!expanded) return;
    const onResize = () => setViewportH(window.innerHeight);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expanded]);

  // Esc collapses an expanded section.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const expandedHeight = Math.max(240, viewportH - OVERLAY_CHROME_PX);
  const dsgHeight = expanded ? expandedHeight : normalHeight;

  const ToggleButton = (
    <Button
      variant="secondary"
      icon={expanded ? Minimize2 : Maximize2}
      onClick={toggle}
      aria-label={t(expanded ? 'planGrid.fullscreen.collapse' : 'planGrid.fullscreen.expand')}
    >
      {t(expanded ? 'planGrid.fullscreen.collapse' : 'planGrid.fullscreen.expand')}
    </Button>
  );

  if (expanded) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-50 flex flex-col bg-bg-page p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <SectionHeading as="h2">{title}</SectionHeading>
          {ToggleButton}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {children({ expanded: true, dsgHeight })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <SectionHeading as="h2">{title}</SectionHeading>
        {ToggleButton}
      </div>
      {children({ expanded: false, dsgHeight })}
    </div>
  );
};

export default FullScreenSection;
