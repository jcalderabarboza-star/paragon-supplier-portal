// ────────────────────────────────────────────────────────────────────────────
// RFx-2 · QUESTIONNAIRE TEMPLATES — a buyer keeps a questionnaire to use again.
//
// A LOCAL STORE, NOT A GOVERNED ONE, and the surface says so. A template lives
// in this browser's `localStorage` under `paragon.rfiTemplates`: no machine, no
// verb, no role, no audit entry, and another seat on another browser does not
// see it. Governing templates (who may write one, who may change one a
// colleague uses) is a store, a verb and a ruling, and none of it is built.
//
// What IS held to the machine's standard is the content: a template is saved
// and read back through `questionnaireProblemOf`, the same predicate
// `t_rfq_questionnaire_set` runs — so a template can only ever hand the editor
// a questionnaire the verb would accept, and a row edited by hand in storage is
// dropped on read and counted, not trusted.
//
// The read fails honestly, as `customRoles` does: absent, empty and unreadable
// are different facts, and `unreadable` says which.
// ────────────────────────────────────────────────────────────────────────────

import {
  normalizeQuestionnaire,
  questionnaireProblemOf,
  type RfiQuestion,
} from '../../data/rfiQuestionnaire';

export const RFI_TEMPLATES_KEY = 'paragon.rfiTemplates';

export interface RfiTemplate {
  readonly name: string;
  readonly questions: readonly RfiQuestion[];
}

export interface RfiTemplateRead {
  readonly templates: readonly RfiTemplate[];
  /** Rows that were stored and are not templates (no name, or not a well-formed questionnaire). */
  readonly rejected: number;
  /** The stored value could not be read or parsed at all. */
  readonly unreadable: boolean;
}

const EMPTY: RfiTemplateRead = { templates: [], rejected: 0, unreadable: false };

const storage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
};

/** One stored row as a template, or `null` when it is not one. */
function asTemplate(raw: unknown): RfiTemplate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (name === '' || !Array.isArray(row.questions) || row.questions.length === 0) return null;
  if (questionnaireProblemOf(row.questions) !== null) return null;
  return { name, questions: normalizeQuestionnaire(row.questions) };
}

/** Every template this browser holds, in the order they were saved. */
export function readRfiTemplates(): RfiTemplateRead {
  const store = storage();
  if (store === null) return EMPTY;
  let raw: string | null;
  try {
    raw = store.getItem(RFI_TEMPLATES_KEY);
  } catch {
    return { ...EMPTY, unreadable: true };
  }
  if (raw === null) return EMPTY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...EMPTY, unreadable: true };
  }
  if (!Array.isArray(parsed)) return { ...EMPTY, unreadable: true };
  const templates: RfiTemplate[] = [];
  let rejected = 0;
  for (const row of parsed) {
    const template = asTemplate(row);
    // A second row under a name already read is dropped: one name, one template.
    if (template === null || templates.some((t) => t.name === template.name)) rejected += 1;
    else templates.push(template);
  }
  return { templates, rejected, unreadable: false };
}

export type RfiTemplateRefusal = 'NAME_MISSING' | 'NO_QUESTIONS' | 'MALFORMED' | 'NOT_STORED';

/**
 * Keep `questions` under `name`. A template already under that name is
 * REPLACED — the buyer is saving it again. Returns the refusal, or `null`.
 */
export function saveRfiTemplate(name: string, questions: readonly unknown[]): RfiTemplateRefusal | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'NAME_MISSING';
  if (questions.length === 0) return 'NO_QUESTIONS';
  if (questionnaireProblemOf(questions) !== null) return 'MALFORMED';
  const store = storage();
  if (store === null) return 'NOT_STORED';
  const kept = readRfiTemplates().templates.filter((t) => t.name !== trimmed);
  const next: RfiTemplate[] = [...kept, { name: trimmed, questions: normalizeQuestionnaire(questions) }];
  try {
    store.setItem(RFI_TEMPLATES_KEY, JSON.stringify(next));
  } catch {
    return 'NOT_STORED';
  }
  return null;
}

/** Remove the template under `name`. Removing one that is not there is not an error. */
export function removeRfiTemplate(name: string): void {
  const store = storage();
  if (store === null) return;
  const kept = readRfiTemplates().templates.filter((t) => t.name !== name);
  try {
    if (kept.length === 0) store.removeItem(RFI_TEMPLATES_KEY);
    else store.setItem(RFI_TEMPLATES_KEY, JSON.stringify(kept));
  } catch {
    /* nothing to undo: the read will still show it */
  }
}
