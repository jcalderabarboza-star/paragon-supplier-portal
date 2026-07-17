import React, { useMemo, useState } from 'react';
import { ArrowLeft, Info, Send, Upload } from 'lucide-react';
import {
  DataSheetGrid,
  keyColumn,
  textColumn,
  intColumn,
  isoDateColumn,
  type Column,
} from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './plan-grid/planGrid.css';
import './bulkStockGrid.css';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import FullScreenSection from './plan-grid/FullScreenSection';
import { useToast } from '../hooks/useToast';
import { useInventoryDeclare, type CollaboratedMaterialView } from '../services/query/sdcSupplierHooks';
import {
  parseGrid,
  BATCH_COLUMN,
  type GridRow,
  type GridContext,
  type ParseReason,
  type InventoryDeclaration,
  type SdcObjectKind,
} from '../services/sdc';
import type { CommandResult } from '../services/data/types';
import { formatNumber } from '../lib/format';
import XlsxImportPanel from './XlsxImportPanel';
import type { BatchGridRow } from './xlsxImportMap';

// ────────────────────────────────────────────────────────────────────────────
// SDC-3c-b — the EDITABLE bulk stock-entry grid (DEC-MAGIC-LINK-GRID, visible).
//
// The batch-grain SOH path the R-4 note named: painful over chat (one batch per
// message), natural in a grid. A supplier picks a collaborated material, states
// a TOTAL (total-first — an independent header floor), enters N batch rows, and
// submits the whole set as ONE governed declaration.
//
// It owns NO parse logic: the SDC-3c-a adapter `parseGrid(rows, context)` folds
// the rows into a DispatchUnit (batch-fold → exactly one). This surface converts
// the DSG's typed rows into the adapter's source-agnostic `GridRow` shape, runs
// the adapter for BOTH the live Σ-vs-total check (the tinted rows are its
// `{ ok:false, rowRefs }`) AND the dispatch, then reports the outcome. The
// INV_DECLARE_BATCH_TOTAL hook stays the real server gate; the grid only
// warn-and-blocks for UX.
//
// REUSE, no fork: the react-datasheet-grid engine, the `--plan-dsg-h` height
// pin (planGrid.css), and FullScreenSection are the Stage-G primitives verbatim;
// this surface just makes the columns editable and pipes rows→adapter.
//
// HONESTY: own-facts-only (materials + prior batches come from the supplier's
// own scoped reads; supplierId rides `context`, never a cell); uom from the
// master (shown read-only, never typed); total-first (Σ≠total blocks, hook
// gates); honest-silence (a row the adapter can't fold surfaces as the reason,
// nothing is fabricated). This is the FIXTURE-FIRST magic-link surface — real
// token/delivery/identity is Comm Hub / F1+ (stamped in the header note).
// ────────────────────────────────────────────────────────────────────────────

// BatchGridRow is shared with the import panel + mapping helpers (xlsxImportMap):
// the engine clears a cell to null; the adapter reads the source-agnostic string
// shape, so we coerce null→'' at the boundary.
const blankRow = (): BatchGridRow => ({ batchNumber: null, qty: null, expiryDate: null });

// Fixed DSG height (px) — pinned via `--plan-dsg-h` (planGrid.css) so the
// container cannot auto-shrink to few-row content (the trembling fix).
const DSG_H = 264;
const dsgVar = (h: number) => ({ '--plan-dsg-h': `${h}px` }) as React.CSSProperties;

// The parse-failure reason → the summary message key (honest-silence surfaced).
const REASON_KEY: Record<ParseReason, string> = {
  EMPTY_TOTAL: 'sdcSup.bulk.reason.emptyTotal',
  MISSING_MATERIAL: 'sdcSup.bulk.reason.missingMaterial',
  MISSING_BATCH_NUMBER: 'sdcSup.bulk.reason.missingBatchNumber',
  INVALID_QTY: 'sdcSup.bulk.reason.invalidQty',
  BATCH_TOTAL_MISMATCH: 'sdcSup.bulk.reason.batchMismatch',
  NO_ROWS: 'sdcSup.bulk.reason.noRows',
};

const labelClass = 'block text-label text-text-tertiary uppercase mb-1';
const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';

/** DSG rows → the adapter's source-agnostic string rows (null→'', num→string). */
const toGridRows = (rows: readonly BatchGridRow[]): GridRow[] =>
  rows.map((r) => ({
    [BATCH_COLUMN.batchNumber]: r.batchNumber ?? '',
    [BATCH_COLUMN.qty]: r.qty == null ? '' : String(r.qty),
    [BATCH_COLUMN.expiryDate]: r.expiryDate ?? '',
  }));

interface BulkStockEntryGridProps {
  supplierId: string;
  materials: readonly CollaboratedMaterialView[];
  declarations: readonly InventoryDeclaration[];
  /** The visit's audit anchor for the NEXT dispatch (the shared session seam). */
  causationId: () => string | undefined;
  /** Record the settled dispatch on the shared SubmissionSession envelope. */
  recordAttempt: (kind: SdcObjectKind, res: CommandResult) => void;
  /** Back to the SOH list without declaring. */
  onClose: () => void;
  /** A declaration landed — close the grid; the list re-derives via invalidation. */
  onDeclared: () => void;
}

const BulkStockEntryGrid: React.FC<BulkStockEntryGridProps> = ({
  supplierId,
  materials,
  declarations,
  causationId,
  recordAttempt,
  onClose,
  onDeclared,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const declareMutation = useInventoryDeclare();

  const [materialCode, setMaterialCode] = useState('');
  const [totalQty, setTotalQty] = useState('');
  const [rows, setRows] = useState<BatchGridRow[]>([blankRow()]);
  const [importOpen, setImportOpen] = useState(false);

  const selectedMaterial = materials.find((m) => m.materialCode === materialCode) ?? null;
  const uom = selectedMaterial?.uom ?? '';

  // Pre-fill (own-facts-only): seeding the grid from THIS supplier's latest
  // declaration for the chosen material — the re-declare starting point. The
  // declarations prop is already own-scoped (useOwnInventoryDeclarations).
  const applyMaterial = (code: string) => {
    setMaterialCode(code);
    const prior = declarations.find((d) => d.materialCode === code);
    if (prior?.batches && prior.batches.length > 0) {
      setTotalQty(String(prior.totalQty));
      setRows(
        prior.batches.map((b) => ({
          batchNumber: b.batchNumber,
          qty: b.qty,
          expiryDate: b.expiryDate ?? null,
        })),
      );
    } else if (prior) {
      // A prior total-only declaration: seed the total, leave batches to enter.
      setTotalQty(String(prior.totalQty));
      setRows([blankRow()]);
    } else {
      setTotalQty('');
      setRows([blankRow()]);
    }
  };

  // The adapter drives the live check: build its context + run it on the current
  // rows. batch-fold yields exactly ONE unit — ok, or an honest failure whose
  // rowRefs tint the offending rows and whose reason lines the summary.
  const buildContext = (): GridContext => ({
    supplierId,
    spec: { kind: 'InventoryDeclaration', mode: 'batch-fold', materialCode, totalQty },
  });
  const gridRows = useMemo(() => toGridRows(rows), [rows]);
  const liveUnit = useMemo(
    () => parseGrid(gridRows, buildContext())[0],
    // buildContext is a pure function of these primitives (+ gridRows).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gridRows, supplierId, materialCode, totalQty],
  );
  const badRows = useMemo(
    () => (liveUnit && !liveUnit.ok ? new Set(liveUnit.rowRefs) : new Set<number>()),
    [liveUnit],
  );

  // Σ-vs-total readout (display only; the adapter owns the gate). Sum the qty of
  // rows that carry a batch number — the batches the fold would itemise.
  const filled = rows.filter((r) => (r.batchNumber ?? '').trim() !== '');
  const batchSum = filled.reduce((s, r) => s + (typeof r.qty === 'number' ? r.qty : 0), 0);
  const totalNum = Number(totalQty.replace(/,/g, ''));

  const columns = useMemo<Column<BatchGridRow>[]>(
    () => [
      {
        ...keyColumn<BatchGridRow, 'batchNumber'>('batchNumber', textColumn),
        title: t('sdcSup.bulk.col.batchNumber'),
        grow: 2,
        minWidth: 160,
      },
      {
        ...keyColumn<BatchGridRow, 'qty'>('qty', intColumn),
        title: t('sdcSup.bulk.col.qty', { uom: uom || '—' }),
        minWidth: 120,
      },
      {
        ...keyColumn<BatchGridRow, 'expiryDate'>('expiryDate', isoDateColumn),
        title: t('sdcSup.bulk.col.expiry'),
        minWidth: 150,
      },
    ],
    [t, uom],
  );

  const cellClassName = ({ rowIndex }: { rowIndex: number }) =>
    badRows.has(rowIndex) ? 'sdc-bulk-cell-danger' : undefined;

  const canSubmit = materialCode !== '' && !!liveUnit && liveUnit.ok && !declareMutation.isPending;

  // Import is a PRE-FILL source: it fills batch rows UNDER an already-picked
  // material + total (both header fields, never mapped from the file). The
  // imported rows land in this same grid for review — never a dispatch path.
  const importReady = materialCode !== '' && totalQty.trim() !== '';
  const handleImport = (imported: BatchGridRow[]) => {
    setRows(imported.length > 0 ? imported : [blankRow()]);
    setImportOpen(false);
    toast({
      variant: 'success',
      title: t('sdcSup.bulk.import.toast.title'),
      description: t('sdcSup.bulk.import.toast.body', { count: imported.length }),
    });
  };

  const submit = async () => {
    if (!materialCode) {
      toast({
        variant: 'error',
        title: t('sdcSup.stock.toast.missingMaterial.title'),
        description: t('sdcSup.stock.toast.missingMaterial.body'),
      });
      return;
    }
    // Re-fold at submit (the same adapter, same context). batch-fold is atomic —
    // one unit; an ok:false here is the whole-declaration block (never partial).
    const [unit] = parseGrid(toGridRows(rows), buildContext());
    if (!unit || !unit.ok) {
      toast({
        variant: 'error',
        title: t('sdcSup.bulk.toast.blocked.title'),
        description: unit ? t(REASON_KEY[unit.reason]) : t('sdcSup.bulk.reason.noRows'),
      });
      return;
    }
    try {
      const res = await declareMutation.mutateAsync({
        payload: unit.payload,
        causationId: causationId(),
      });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.stock.toast.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body'),
        });
        return;
      }
      recordAttempt('InventoryDeclaration', res);
      toast({
        variant: 'success',
        title: t('sdcSup.stock.toast.declared.title', {
          material: selectedMaterial?.label ?? materialCode,
        }),
        description: t('sdcSup.bulk.toast.declared.body'),
      });
      onDeclared();
    } catch {
      toast({
        variant: 'error',
        title: t('sdcSup.stock.toast.failed.title'),
        description: t('sdcSup.toast.failed.body'),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="sdcsup-bulk-grid">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-secondary">{t('sdcSup.bulk.subtitle')}</p>
        <Button variant="secondary" icon={ArrowLeft} onClick={onClose}>
          {t('sdcSup.bulk.back')}
        </Button>
      </div>

      {/* Header note (R-4 flow-note grammar): fixture-first magic-link surface. */}
      <div className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('sdcSup.bulk.note.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('sdcSup.bulk.note.body')}</p>
        </div>
      </div>

      {/* Material + total header (total-first — the total is an independent
          floor, NOT derived from Σ). uom is read-only, from the master. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
        <div>
          <label className={labelClass} htmlFor="sdcsup-bulk-material">
            {t('sdcSup.stock.panel.materialLabel')}
          </label>
          <select
            id="sdcsup-bulk-material"
            value={materialCode}
            onChange={(e) => applyMaterial(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('sdcSup.stock.panel.materialSelect')}</option>
            {materials.map((m) => (
              <option key={m.materialCode} value={m.materialCode}>
                {m.materialCode} — {m.label} ({m.uom})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="sdcsup-bulk-total">
            {t('sdcSup.stock.panel.totalLabel', { uom: uom || '—' })}
          </label>
          <input
            id="sdcsup-bulk-total"
            type="number"
            min={0}
            placeholder="0"
            value={totalQty}
            onChange={(e) => setTotalQty(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Import from Excel — a pre-fill SOURCE for the grid (SDC-3c-c-b). Gated
          on an already-picked material + total; the file only fills batch rows
          under them. When open, the confirmable import flow replaces this row. */}
      {importOpen ? (
        <XlsxImportPanel onImport={handleImport} onCancel={() => setImportOpen(false)} />
      ) : (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-label text-text-tertiary">
            {importReady ? '' : t('sdcSup.bulk.import.needMaterial')}
          </span>
          <Button
            variant="outline"
            icon={Upload}
            disabled={!importReady}
            onClick={() => setImportOpen(true)}
            data-testid="sdcsup-import-open"
          >
            {t('sdcSup.bulk.import.open')}
          </Button>
        </div>
      )}

      {/* The editable batch grid (full-screen-capable). REUSE the engine — the
          columns are the library editable types; nothing forks. */}
      <FullScreenSection title={t('sdcSup.bulk.gridTitle')} normalHeight={DSG_H}>
        {({ dsgHeight }) => (
          <div
            className="plan-dsg sdc-bulk-grid overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
            style={dsgVar(dsgHeight)}
          >
            <DataSheetGrid<BatchGridRow>
              // Re-mount on material change so the engine picks up the new
              // uom-bearing column titles (DSG does not re-render a header when
              // only a column `title` changes). Harmless: a material change
              // already reseeds `rows`, and value is externally controlled.
              key={materialCode || 'none'}
              value={rows}
              columns={columns}
              onChange={setRows}
              createRow={blankRow}
              cellClassName={cellClassName}
              height={dsgHeight}
            />
          </div>
        )}
      </FullScreenSection>

      {/* Live Σ-vs-total summary (mirrors the SOH panel's sohBatchMismatch line);
          when the adapter rejects the fold, its honest reason is appended. */}
      {materialCode && (
        <div
          className={`text-sm ${
            liveUnit && !liveUnit.ok ? 'text-danger' : 'text-text-secondary'
          }`}
          data-testid="sdcsup-bulk-summary"
        >
          {t('sdcSup.stock.panel.batchSum', {
            sum: formatNumber(batchSum),
            total: formatNumber(Number.isNaN(totalNum) ? 0 : totalNum),
            uom: uom || '—',
          })}
          {liveUnit && !liveUnit.ok && ` — ${t(REASON_KEY[liveUnit.reason])}`}
        </div>
      )}

      {/* Submit — plain-DOM OUTLINE, BELOW the grid (SOH is routine; the solid
          primary stays the forecast commitment, DP2-BUTTON-01). */}
      <div className="flex justify-end">
        <Button variant="outline" icon={Send} disabled={!canSubmit} onClick={submit}>
          {declareMutation.isPending
            ? t('sdcSup.stock.panel.submitting')
            : t('sdcSup.bulk.submit')}
        </Button>
      </div>
    </div>
  );
};

export default BulkStockEntryGrid;
