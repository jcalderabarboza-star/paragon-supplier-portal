// ────────────────────────────────────────────────────────────────────────────
// PLN-5 · useFitHeight — the grid's height is what the viewport has left.
//
// The grid was a fixed 560 px inside a page that scrolls: two scrollbars, and at
// 1600×900 the page had to scroll before the grid's own rows could. Fitted, the
// grid runs from where it starts to the foot of the page's scroll area (less the
// sticky planned-changes bar, which would otherwise sit over its last rows), so
// the page itself does not scroll to work the plan.
//
// ⚠️ IT MEASURES POSITION, NEVER CONTENT. The height is a function of where the
// grid's top is and how tall the scroll area is — not of the grid's own size —
// so setting it cannot re-trigger it (the resize loop `planGrid.css` pins
// against). It re-measures when the window resizes and when anything above the
// grid changes size (a banner unfolded, the publication panel opened).
// ────────────────────────────────────────────────────────────────────────────

import { useLayoutEffect, useState, type RefObject } from 'react';

export interface FitOptions {
  /** The height where nothing can be measured (jsdom lays nothing out). */
  readonly fallback: number;
  /** The floor, so a short window still shows a usable grid (the page then scrolls). */
  readonly min: number;
  /** An element whose height is reserved below the grid — the sticky bar. */
  readonly reserveSelector?: string;
  /** Where `reserveSelector` is looked up, and what is observed for size changes. */
  readonly scope: RefObject<HTMLElement | null>;
}

/** The nearest ancestor that scrolls vertically — the page's own scroll area. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === 'auto' || oy === 'scroll') return p;
  }
  return null;
}

/**
 * The pure rule: what is left from `top` to the foot of the area, less the
 * reserve, the area's own padding and a SLACK of 2 px — measured on the build, a
 * sub-pixel top left the page 1 px taller than its area, which is a second
 * scrollbar however small.
 */
export const FIT_SLACK = 2;
export function fitHeight(m: { top: number; areaBottom: number; paddingBottom: number; reserve: number }, o: Pick<FitOptions, 'min'>): number {
  return Math.max(o.min, Math.floor(m.areaBottom - m.top - m.paddingBottom - m.reserve) - FIT_SLACK);
}

export function useFitHeight(ref: RefObject<HTMLElement | null>, opts: FitOptions): number {
  const [h, setH] = useState(opts.fallback);
  const { min, fallback, reserveSelector, scope } = opts;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const measure = () => {
      const area = scrollParent(el);
      const rect = el.getBoundingClientRect();
      // Nothing laid out (jsdom, or not yet attached): keep the fallback.
      if (rect.width === 0 && rect.height === 0) return;
      const areaRect = area ? area.getBoundingClientRect() : { bottom: window.innerHeight, top: 0 };
      // The grid's top as if the area were scrolled to its top: fitting is about the first view.
      const top = rect.top + (area ? area.scrollTop : window.scrollY);
      const pad = area ? parseFloat(getComputedStyle(area).paddingBottom) || 0 : 0;
      const bar = reserveSelector ? scope.current?.querySelector<HTMLElement>(reserveSelector) : null;
      const reserve = bar ? bar.getBoundingClientRect().height : 0;
      const next = fitHeight({ top, areaBottom: areaRect.bottom, paddingBottom: pad, reserve }, { min });
      setH((cur) => (cur === next ? cur : next));
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    // What sits above the grid in the view, and the sticky bar, change the space left.
    const host = scope.current;
    if (ro && host) {
      for (const child of Array.from(host.children)) if (!child.contains(el)) ro.observe(child);
    }
    const area = scrollParent(el);
    if (ro && area?.firstElementChild) ro.observe(area.firstElementChild);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  });
  return h === 0 ? fallback : h;
}
