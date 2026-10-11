import React, { useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import Button from '../../components/ui-v2/Button';
import Dialog from '../../components/ui-v2/Dialog';

// ────────────────────────────────────────────────────────────────────────────
// FullScreenSection (Stage G · G1.3.2) — the shared per-section full-screen
// wrapper for the plan grid (award / intake / drawer).
//
// Collapsed, it renders its child inline at `normalHeight`. Expanded, it lifts
// the child into the shared `Dialog` in its full-screen form (PG-1 — it drew its
// own overlay until then) and hands it a viewport-tall height
// (`innerHeight − chrome`) that reuses the SAME DSG height-pin the trembling fix
// introduced (`--plan-dsg-h`, planGrid.css) — so a virtualized grid fills the
// screen without structural rework. The child is a render-prop receiving
// `{ expanded, dsgHeight }`; a DSG section pipes `dsgHeight` into both its
// `height` prop and the pin, while the plain-DOM drawer simply ignores it.
// No data path changes on expand — this is pure presentation.
// ────────────────────────────────────────────────────────────────────────────

// The dialog's own chrome (its inset, header and body padding) reserved around
// the child when expanded.
const OVERLAY_CHROME_PX = 176;

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


  const expandedHeight = Math.max(240, viewportH - OVERLAY_CHROME_PX);
  const dsgHeight = expanded ? expandedHeight : normalHeight;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <SectionHeading as="h2">{title}</SectionHeading>
        {!expanded && (
          <Button
            variant="secondary"
            icon={Maximize2}
            onClick={() => setExpanded(true)}
            aria-label={t('planGrid.fullscreen.expand')}
          >
            {t('planGrid.fullscreen.expand')}
          </Button>
        )}
      </div>
      {/* ONE place at a time: the child is in the page or in the dialog, never both. */}
      {expanded ? (
        <Dialog
          open
          fill
          title={title}
          onClose={() => setExpanded(false)}
          closeLabel={t('planGrid.fullscreen.collapse')}
        >
          {children({ expanded: true, dsgHeight })}
        </Dialog>
      ) : (
        children({ expanded: false, dsgHeight })
      )}
    </div>
  );
};

export default FullScreenSection;
