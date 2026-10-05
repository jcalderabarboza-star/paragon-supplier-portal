// ────────────────────────────────────────────────────────────────────────────
// PLN-5 · useGridRoles — the plan grid says it is a grid.
//
// The engine renders `div`s with no roles, so a screen reader met a grid of
// figures as an unstructured run of text. The roles are put on the engine's own
// elements — the container `grid`, each row `row`, each header cell
// `columnheader`, each key cell `rowheader`, every other cell `gridcell` — and
// re-put whenever the engine re-renders its (virtualised) rows. `aria-rowcount`
// states the whole row count, since only the rows in view are in the DOM.
//
// Nothing here changes what the engine does; it labels what it drew.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, type RefObject } from 'react';

/** Apply the roles to one engine container. Exported so a spec reaches it without the engine. */
export function applyGridRoles(root: HTMLElement, o: { label: string; rowCount: number }): void {
  const grid = root.querySelector<HTMLElement>('.dsg-container') ?? root;
  if (grid.getAttribute('role') !== 'grid') grid.setAttribute('role', 'grid');
  if (grid.getAttribute('aria-label') !== o.label) grid.setAttribute('aria-label', o.label);
  const count = String(o.rowCount + 1); // + the header row
  if (grid.getAttribute('aria-rowcount') !== count) grid.setAttribute('aria-rowcount', count);
  for (const row of Array.from(grid.querySelectorAll<HTMLElement>('.dsg-row'))) {
    if (row.getAttribute('role') !== 'row') row.setAttribute('role', 'row');
    const header = row.classList.contains('dsg-row-header');
    for (const cell of Array.from(row.querySelectorAll<HTMLElement>(':scope > .dsg-cell'))) {
      const role = header ? 'columnheader' : cell.classList.contains('dsg-cell-gutter') ? 'rowheader' : 'gridcell';
      if (cell.getAttribute('role') !== role) cell.setAttribute('role', role);
    }
  }
}

export function useGridRoles(ref: RefObject<HTMLElement | null>, o: { label: string; rowCount: number }): void {
  const { label, rowCount } = o;
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    applyGridRoles(root, { label, rowCount });
    if (typeof MutationObserver === 'undefined') return;
    // The engine adds and drops rows as it scrolls; each new row gets its roles.
    const mo = new MutationObserver(() => applyGridRoles(root, { label, rowCount }));
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [ref, label, rowCount]);
}
