import React from 'react';
import { useTranslation } from 'react-i18next';

import StatusPill from '../ui-v2/StatusPill';
import { statusTone } from '../../lib/statusTone';
import { pslStore } from '../../services/data/mock/stores/pslStore';
import { pslScopeCodes } from '../../services/data/pslProjection';
import { pslStatusFor, type PslStanding } from '../../services/data/pslSourcingSeam';
import type { PslListing } from '../../services/data/pslListing';

// ─────────────────────────────────────────────────────────────────────────────
// THE DIRECTORY'S PSL CELL — one supplier's standing, in one cell.
//
// ⚠️ **THREE OUTCOMES, THREE CELLS, AND THE THIRD IS THE ONE THAT MATTERS.**
//   IN_FORCE   → the most restrictive live designation, as a coloured pill.
//   LAPSED     → `Expired` (danger). The supplier HOLDS listings; none is live.
//   NOT_LISTED → `Not Listed` (neutral). The supplier holds none at all.
//
// **`LAPSED` AND `NOT_LISTED` MUST NEVER RENDER AS THE SAME CELL.** "Never
// qualified" and "qualified, and the qualification lapsed" are different facts
// and only the second implies an act somebody failed to take. The tree already
// argues this one column to the left — `BuyerSuppliers`' compliance cell renders
// a neutral `None` rather than a red one — and `contractExpiry`'s own rule says
// it in general: *absence is a real answer and must not become an alarm.*
//
// ⚠️ `bestPslStatus` alone cannot tell the two apart: it returns `null` for
// both. That is why this reads `pslStatusFor`, whose verdict is a NAMED KIND
// rather than a nullable status — the same reason the seam has three members
// instead of a boolean.
//
// ── ⚠️ THE PILL TEXT IS NOT KEYED HERE, AND THAT IS DELIBERATE ─────────────
//   `StatusPill` localises its own string leaves through the CENTRAL maps
//   (`statusLabel.ts` / `statusTone.ts`). Passing a `t()` result would be the
//   second copy of a word the central map already owns — and the copy that goes
//   wrong is always the one nobody renders in the locale they are testing.
//   So every pill below is handed its CANONICAL string and localises itself.
// ─────────────────────────────────────────────────────────────────────────────

/** The PSL standing a Directory filter narrows on. Derived from the seam's own
 *  kinds so a fourth verdict cannot appear here without a `tsc` failure. */
export type PslFilter = 'any' | PslStanding['kind'];

export function pslStandingOf(
  supplierId: string,
  nowIso: string,
  // ⚠️ B-S4c — THE STORE, NOT A FROZEN FIXTURE. A cell defaulted to a
  // snapshot would render yesterday's designation beside a queue that had
  // just changed it, and nothing would have gone red.
  rows: readonly PslListing[] = pslStore.all(),
): PslStanding {
  return pslStatusFor(supplierId, null, nowIso, rows);
}

const PslStatusCell: React.FC<{
  standing: PslStanding;
  /** Suppress the scope summary line where the surface has no room for it. */
  compact?: boolean;
}> = ({ standing, compact = false }) => {
  const { t } = useTranslation();

  if (standing.kind === 'NOT_LISTED') {
    return (
      <span data-testid="psl-cell-not-listed">
        <StatusPill variant={statusTone('Not Listed')}>Not Listed</StatusPill>
      </span>
    );
  }

  const listings = standing.listings;
  // The scope summary. Codes are DATA (C9 §3 — contractually opaque), so they
  // render verbatim in both locales; only the joining words localise.
  const codes = listings.flatMap((l) => [...pslScopeCodes(l)]);
  const summary =
    codes.length === 0
      ? null
      : codes.length === 1
        ? t('psl.cell.coversOne', { code: codes[0] })
        : t('psl.cell.coversMore', { code: codes[0], count: codes.length - 1 });

  const count =
    listings.length === 1
      ? t('psl.cell.listings.one', { count: listings.length })
      : t('psl.cell.listings.other', { count: listings.length });

  if (standing.kind === 'LAPSED') {
    return (
      <div className="flex flex-col gap-1 items-start" data-testid="psl-cell-lapsed">
        <StatusPill variant={statusTone('Expired')}>Expired</StatusPill>
        {!compact && (
          <span className="text-xs text-text-tertiary" data-testid="psl-cell-summary">
            {count}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-start" data-testid="psl-cell-status">
      <StatusPill variant={statusTone(standing.status)}>{standing.status}</StatusPill>
      {!compact && summary && (
        <span className="text-xs text-text-tertiary" data-testid="psl-cell-summary">
          {summary}
        </span>
      )}
    </div>
  );
};

export default PslStatusCell;
