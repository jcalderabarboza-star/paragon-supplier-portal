// ────────────────────────────────────────────────────────────────────────────
// PG-3 · useKeepPlace — where the planner was, kept across a re-mount.
//
// The grid engine keeps the column sizes it is mounted with, so the grid is
// mounted afresh whenever its widths change (PG-2) — a window resized. A fresh
// mount starts at the top with nothing selected, so a resize threw the planner
// back to the first row. This hook remembers the scroll position and the
// selection while the grid stands, and puts both back once the new one is up.
// ────────────────────────────────────────────────────────────────────────────

import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';

export interface GridCell {
  readonly col: number;
  readonly row: number;
}

export interface GridPlace {
  readonly top: number;
  readonly left: number;
  readonly active: GridCell | null;
  readonly selection: { readonly min: GridCell; readonly max: GridCell } | null;
}

/** What the hook needs of the engine's ref — the two setters, nothing else. */
export interface PlaceableGrid {
  setActiveCell(cell: GridCell | null): void;
  setSelection(selection: { min: GridCell; max: GridCell } | null): void;
}

export const NO_PLACE: GridPlace = { top: 0, left: 0, active: null, selection: null };

const SCROLLER = '.dsg-container';

/**
 * `mountKey` names the mount: when it changes, the place held under the old
 * key is put back on the new grid. The returned trackers are called from the
 * grid's own events; a grid that reports "nothing selected" while it is being
 * put back is not believed.
 */
export function useKeepPlace(
  mountKey: string,
  wrapRef: RefObject<HTMLElement | null>,
  gridRef: RefObject<PlaceableGrid | null>,
) {
  const live = useRef<GridPlace>(NO_PLACE);
  const pending = useRef<GridPlace | null>(null);
  const restoring = useRef(false);
  const mounted = useRef(mountKey);
  // Taken DURING the render that changes the key: the old grid is still up, and
  // nothing the new one reports on its way in can overwrite what is kept.
  if (mounted.current !== mountKey) {
    mounted.current = mountKey;
    pending.current = live.current;
  }

  useLayoutEffect(() => {
    const keep = pending.current;
    if (!keep) return;
    pending.current = null;
    restoring.current = true;
    live.current = keep;
    const grid = gridRef.current;
    if (keep.selection) grid?.setSelection({ min: { ...keep.selection.min }, max: { ...keep.selection.max } });
    else if (keep.active) grid?.setActiveCell({ ...keep.active });
    const scroll = () => {
      const el = wrapRef.current?.querySelector<HTMLElement>(SCROLLER);
      if (!el) return;
      el.scrollTop = keep.top;
      el.scrollLeft = keep.left;
    };
    scroll();
    // The engine scrolls its active cell into view once it has one; the
    // position is put back after that, and only then are its reports believed.
    const frame = requestAnimationFrame(() => {
      scroll();
      live.current = keep;
      restoring.current = false;
    });
    return () => {
      cancelAnimationFrame(frame);
      restoring.current = false;
    };
  }, [mountKey, gridRef, wrapRef]);

  const onScroll = useCallback((el: { scrollTop: number; scrollLeft: number }) => {
    if (restoring.current) return;
    live.current = { ...live.current, top: el.scrollTop, left: el.scrollLeft };
  }, []);
  const onActive = useCallback((cell: GridCell | null) => {
    if (restoring.current) return;
    live.current = { ...live.current, active: cell ? { col: cell.col, row: cell.row } : null };
  }, []);
  const onSelection = useCallback((selection: { min: GridCell; max: GridCell } | null) => {
    if (restoring.current) return;
    live.current = {
      ...live.current,
      selection: selection
        ? { min: { col: selection.min.col, row: selection.min.row }, max: { col: selection.max.col, row: selection.max.row } }
        : null,
    };
  }, []);

  return useMemo(() => ({ onScroll, onActive, onSelection, place: () => live.current }), [onScroll, onActive, onSelection]);
}
