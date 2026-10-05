// ────────────────────────────────────────────────────────────────────────────
// PLN-5 · gridKeys — WHAT A KEY DOES IN THE PLAN GRID, as a pure decision.
//
// The grid's key handler runs in the capture phase, before the engine's own,
// and asks this module what to do; it then does it. Pure so a spec reaches every
// rule without the engine (which lays out no rows under jsdom) and a mutation
// probe can aim at one rule at a time. The browser QA proves the wiring.
//
// The rules (R-PLN P1 "keyboard truth"):
//  · ENTER mode (an editor opened by typing or Enter): ←/→ COMMIT the cell and
//    MOVE — the engine kept them as caret keys, so "Enter, →, 7" wrote the 7 into
//    the cell just left and the next cell never received it.
//  · CARET mode (opened by F2 or a click): ←/→ move the caret, as the planner
//    asked for by pointing into the text.
//  · A printable key on a read-only or committed cell is REFUSED with its reason
//    — it was swallowed in silence.
//  · Delete / Backspace remove PLANNED changes in the selection, never a seam figure.
//  · Ctrl+Z (⌘Z) undoes the last change to the overlay — but inside an open
//    editor it is the editor's own undo.
// ────────────────────────────────────────────────────────────────────────────

import { formatNumber } from '../../lib/format';
import type { BucketId } from '../../services/planning/bucket';
import type { PlanDraftEntry } from './planDraft';
import type { PlanRow } from './planGridModel';

export type EditMode = 'enter' | 'caret';

export interface KeyInput {
  readonly key: string;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
}

export interface KeyContext {
  /** A cell's editor is open in the grid. */
  readonly editorOpen: boolean;
  readonly mode: EditMode;
  /** The active cell takes edits (the registry says so, and an anchor exists). */
  readonly editable: boolean;
}

export type KeyAction =
  | { readonly kind: 'pass' }
  | { readonly kind: 'mode'; readonly mode: EditMode }
  | { readonly kind: 'commitMove'; readonly dir: -1 | 1 }
  | { readonly kind: 'refuse' }
  | { readonly kind: 'delete' }
  | { readonly kind: 'undo' };

const PASS: KeyAction = { kind: 'pass' };

export function decideKey(k: KeyInput, c: KeyContext): KeyAction {
  const mod = k.ctrl || k.meta;
  if (mod && !k.shift && !k.alt && k.key.toLowerCase() === 'z') return c.editorOpen ? PASS : { kind: 'undo' };
  if (c.editorOpen) {
    if ((k.key === 'ArrowLeft' || k.key === 'ArrowRight') && c.mode === 'enter' && !mod && !k.shift && !k.alt) {
      return { kind: 'commitMove', dir: k.key === 'ArrowRight' ? 1 : -1 };
    }
    return PASS;
  }
  if (k.key === 'F2') return { kind: 'mode', mode: 'caret' };
  if (k.key === 'Enter' && !mod && !k.alt) return { kind: 'mode', mode: 'enter' };
  if (k.key === 'Delete' || k.key === 'Backspace') return { kind: 'delete' };
  const printable = k.key.length === 1 && !mod && !k.alt;
  if (!printable) return PASS;
  return c.editable ? { kind: 'mode', mode: 'enter' } : { kind: 'refuse' };
}

/**
 * What Ctrl+C copies for one cell: what it DISPLAYS — the planned value where one
 * is planned, else the seam's — formatted as shown. A dash is no value, so it
 * copies as an empty cell rather than as "—".
 */
export function copyText(row: PlanRow, bucket: BucketId, entries: ReadonlyMap<string, PlanDraftEntry> | undefined): string {
  const ref = row.seamRefs?.[bucket];
  const planned = ref ? entries?.get(ref) : undefined;
  const v = planned ? planned.value : row.cells[bucket];
  return v === null || v === undefined ? '' : formatNumber(v);
}
