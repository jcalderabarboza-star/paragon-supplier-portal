import React, { useRef, useState } from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui-v2/Button';
import { parseWorkbook, type FileParseReason, type ParsedWorkbook } from '../services/sdc';
import {
  suggestMapping,
  mappingComplete,
  coerceRows,
  MAP_FIELDS,
  type ColumnMapping,
  type MapField,
  type BatchGridRow,
} from './xlsxImportMap';

// ────────────────────────────────────────────────────────────────────────────
// SDC-3c-c-b — the XLSX import flow (the SURFACE half). A pre-fill SOURCE for the
// BulkStockEntryGrid, never a dispatch path: it turns a spreadsheet into
// BatchGridRow[] and hands them UP (onImport → setRows). The grid stays the
// governance + confirmation + submit surface — the supplier SEES every imported
// row (live parseGrid tint, Σ-vs-total block) and edits before Declare.
//
// THREE honest gates, in order:
//  1. FILE tier — parseWorkbook's FileParseReason: a bad file surfaces an honest
//     message and imports ZERO rows (grid untouched).
//  2. SHEET tier — a multi-sheet book shows a picker; the chosen sheet is
//     re-parsed via {sheet}, never silently sheet 1.
//  3. MAPPING tier — the raw headers and our three fields are shown with an
//     auto-suggested BUT visible/editable mapping; rows populate ONLY on a
//     confirmed, complete mapping. materialCode/totalQty are NOT here (header
//     fields, un-falsifiable) — the file supplies only the batch columns.
// ────────────────────────────────────────────────────────────────────────────

const FILE_REASON_KEY: Record<FileParseReason, string> = {
  NOT_A_WORKBOOK: 'sdcSup.bulk.import.fail.notWorkbook',
  NO_SHEETS: 'sdcSup.bulk.import.fail.noSheets',
  EMPTY_SHEET: 'sdcSup.bulk.import.fail.emptySheet',
  NO_HEADER_ROW: 'sdcSup.bulk.import.fail.noHeaderRow',
};

const FIELD_LABEL: Record<MapField, string> = {
  batchNumber: 'sdcSup.bulk.import.field.batchNumber',
  qty: 'sdcSup.bulk.import.field.qty',
  expiryDate: 'sdcSup.bulk.import.field.expiry',
};

const selectClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface XlsxImportPanelProps {
  /** The confirmed, coerced batch rows — the grid replaces its rows with these. */
  onImport: (rows: BatchGridRow[]) => void;
  onCancel: () => void;
}

const XlsxImportPanel: React.FC<XlsxImportPanelProps> = ({ onImport, onCancel }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [failure, setFailure] = useState<FileParseReason | null>(null);
  const [book, setBook] = useState<ParsedWorkbook | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    batchNumber: '',
    qty: '',
    expiryDate: '',
  });

  // Consume 3c-c-a. On failure: an honest reason, no book, no rows. On success:
  // re-suggest the mapping (a fresh file or a switched sheet has fresh headers).
  const runParse = async (f: File, sheet?: string) => {
    setParsing(true);
    setFailure(null);
    const res = await parseWorkbook(f, sheet ? { sheet } : undefined);
    setParsing(false);
    if (!res.ok) {
      setBook(null);
      setFailure(res.reason);
      return;
    }
    setBook(res);
    setMapping(suggestMapping(res.headers));
  };

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    setFile(f);
    void runParse(f);
  };

  const reset = () => {
    setBook(null);
    setFailure(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const setField = (field: MapField, header: string) =>
    setMapping((m) => ({ ...m, [field]: header }));

  const confirm = () => {
    if (!book || !mappingComplete(mapping)) return;
    onImport(coerceRows(book.rows, mapping));
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-lg border border-action/30 bg-action-soft/40 p-4"
      data-testid="sdcsup-import-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-action" />
          <span className="text-sm font-semibold text-text-primary">
            {t('sdcSup.bulk.import.title')}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('sdcSup.bulk.import.cancel')}
          className="text-text-tertiary hover:text-text-primary"
        >
          <X size={18} />
        </button>
      </div>

      {/* File-tier honest silence: a bad file imports nothing. */}
      {failure && (
        <div
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          data-testid="sdcsup-import-failure"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{t(FILE_REASON_KEY[failure])}</span>
        </div>
      )}

      {/* STEP 1 — file drop / picker (shown until a book parses). */}
      {!book && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border-input bg-white px-4 py-8 text-center"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            data-testid="sdcsup-import-file"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <p className="text-sm text-text-secondary">{t('sdcSup.bulk.import.drop')}</p>
          <Button variant="outline" icon={Upload} onClick={() => inputRef.current?.click()}>
            {t('sdcSup.bulk.import.browse')}
          </Button>
          {parsing && (
            <p className="text-label text-text-tertiary">{t('sdcSup.bulk.import.parsing')}</p>
          )}
        </div>
      )}

      {/* STEP 2 + 3 — sheet picker (if >1) and the confirmable mapping. */}
      {book && (
        <div className="flex flex-col gap-3">
          {book.sheets.length > 1 && (
            <div>
              <label className={labelClass} htmlFor="sdcsup-import-sheet">
                {t('sdcSup.bulk.import.sheetLabel')}
              </label>
              <select
                id="sdcsup-import-sheet"
                className={selectClass}
                value={book.activeSheet}
                onChange={(e) => file && void runParse(file, e.target.value)}
                data-testid="sdcsup-import-sheet"
              >
                {book.sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-text-primary">
              {t('sdcSup.bulk.import.mapTitle')}
            </div>
            <p className="mt-0.5 text-label text-text-tertiary">{t('sdcSup.bulk.import.mapHint')}</p>
          </div>

          {/* The mapping gate: OUR fields ← the supplier's raw headers, visible
              and editable. Nothing populates until this is confirmed. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MAP_FIELDS.map((field) => (
              <div key={field}>
                <label className={labelClass} htmlFor={`sdcsup-map-${field}`}>
                  {t(FIELD_LABEL[field])}
                </label>
                <select
                  id={`sdcsup-map-${field}`}
                  className={selectClass}
                  value={mapping[field]}
                  onChange={(e) => setField(field, e.target.value)}
                  data-testid={`sdcsup-map-${field}`}
                >
                  <option value="">
                    {field === 'expiryDate'
                      ? t('sdcSup.bulk.import.none')
                      : t('sdcSup.bulk.import.selectPlaceholder')}
                  </option>
                  {book.headers.map((h, i) => (
                    <option key={`${h}-${i}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!mappingComplete(mapping) && (
            <p className="text-sm text-warning-hover" data-testid="sdcsup-import-incomplete">
              {t('sdcSup.bulk.import.incomplete')}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={reset}
              className="text-sm text-action hover:underline"
              data-testid="sdcsup-import-another"
            >
              {t('sdcSup.bulk.import.another')}
            </button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onCancel}>
                {t('sdcSup.bulk.import.cancel')}
              </Button>
              <Button
                variant="outline"
                icon={Upload}
                disabled={!mappingComplete(mapping)}
                onClick={confirm}
                data-testid="sdcsup-import-confirm"
              >
                {t('sdcSup.bulk.import.confirm', { count: book.rows.length })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XlsxImportPanel;
