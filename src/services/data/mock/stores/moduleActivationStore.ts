// ────────────────────────────────────────────────────────────────────────────
// M1 · THE MODULE ACTIVATION LEDGER — behind the service, append-only.
//
// ⚠️ **NOT BROWSER STORAGE, AND THE REASON IS THE OPPOSITE OF `customRoles`'.**
// Activation is PLATFORM state shared by everyone who opens the portal; a
// per-browser copy would let two seats see two different platforms. It lives
// here, behind `IModuleService`, and `httpDataService` replaces it at F1 (Design
// 5 §A.4). A reload returns the registry defaults, which is the honest mock of
// "no act has been recorded on this deployment yet".
//
// THE SEED IS EMPTY. The defaults are the registry's (§A.2 — every module
// Active and ON), and an unrecorded default is the truthful state: a seeded row
// would claim a person switched something on who never did.
// ────────────────────────────────────────────────────────────────────────────

import type { ModuleActivationSetting } from '../../../modules/activation';
import { effectiveActivation, type ModuleActivationView } from '../../../modules/activation';

let rows: ModuleActivationSetting[] = [];
let seq = 0;

export const moduleActivationStore = {
  /** The whole ledger, in arrival order. */
  ledger(): readonly ModuleActivationSetting[] {
    return rows;
  },
  /** Every recorded act for one subject, oldest first. */
  forSubject(code: string): readonly ModuleActivationSetting[] {
    return rows.filter((r) => r.code === code);
  },
  /** What is in force — derived from the ledger at read, never stored. */
  view(): ModuleActivationView {
    return effectiveActivation(rows);
  },
  /** The next arrival number; minted by the store, never by a caller. */
  nextSeq(): number {
    return ++seq;
  },
  /** Record an act. APPEND ONLY; a new array so a memoised read recomputes. */
  append(row: ModuleActivationSetting): void {
    rows = [...rows, row];
  },
  /** Restore the (empty) seed — test isolation. */
  reset(): void {
    rows = [];
    seq = 0;
  },
};
