import React from 'react';
import type { CellComponent } from 'react-datasheet-grid';
import Data from '../../components/ui-v2/Data';

// ────────────────────────────────────────────────────────────────────────────
// Shared read-only DSG cell helpers (SDC-1b extraction — second consumer).
//
// Born in PlanGrid (G1.2a); extracted when the SDC consolidation grid became
// the second DataSheetGrid consumer so both surfaces render data cells through
// ONE definition (DP-1: shared primitive over per-page copies). The engine is
// strictly data-in/data-out — these components render `rowData`; they compute
// nothing.
// ────────────────────────────────────────────────────────────────────────────

/** A read-only mono data cell (DP-3: mono + data-navy), right-aligned. */
export function dataCell<T>(get: (r: T) => React.ReactNode): CellComponent<T> {
  return ({ rowData }) => (
    <div className="w-full px-2 text-right">
      <Data className="text-xs">{get(rowData)}</Data>
    </div>
  );
}

/** A read-only sans text cell (names/prose stay `text-primary` black). */
export function textCell<T>(
  get: (r: T) => React.ReactNode,
  // i18n-defer: a Tailwind class name, not copy (DP2-DATA-NAVY-01's sans/black
  // half — the cell's TEXT is `get(rowData)`, which this never touches).
  className = 'text-text-primary',
): CellComponent<T> {
  return ({ rowData }) => (
    <div className={`w-full px-2 truncate text-sm ${className}`}>{get(rowData)}</div>
  );
}
