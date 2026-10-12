// ────────────────────────────────────────────────────────────────────────────
// FB-1 · A FLOW VERSION — a list of ADDITIONS to one process that already runs.
//
// The rule the Flow Builder rests on (operator ruling, 12 October 2026):
//
//   > AN ACTIVE VERSION CAN ADD A REFUSAL. IT CAN NEVER REMOVE ONE.
//
// It holds here by construction: nothing below can name a state, re-route an
// act, drop a check, drop a required field or move a lane. A version is a step
// in front of an existing act, a check on an existing act, or a fork that
// decides which steps apply — and nothing else. `validateVersion.ts` asserts it
// as well, because a sentence is not a guard.
//
// TYPES AND THE LABEL RULE ONLY. No store, no registry write, no dispatch.
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';

export const STEP_KINDS = ['approval', 'confirmation', 'capture', 'scan'] as const;
export type StepKind = (typeof STEP_KINDS)[number];

export const STEP_FIELD_TYPES = ['text', 'number', 'quantity', 'money', 'date', 'boolean', 'choice'] as const;
export type StepFieldType = (typeof STEP_FIELD_TYPES)[number];

export const COMPARISON_OPS = ['=', '!=', '<', '<=', '>', '>=', 'in'] as const;
export type ComparisonOp = (typeof COMPARISON_OPS)[number];

export interface Comparison {
  readonly field: string;
  readonly op: ComparisonOp;
  readonly value: string | number | boolean | readonly string[];
}

/** Every label and instruction is written in both languages from birth. */
export interface Bilingual {
  readonly en: string;
  readonly id: string;
}

export interface StepField {
  readonly name: string;
  readonly label: Bilingual;
  readonly type: StepFieldType;
  readonly required: boolean;
  readonly options?: readonly string[];
}

/** A step a person completes before the act behind it may be taken. */
export interface AddedStep {
  /** `s_<slug>`, unique within the version. */
  readonly id: string;
  readonly kind: StepKind;
  /** The transition id this step stands in front of. */
  readonly before: string;
  readonly order: number;
  /** The one buyer-side lane that completes it. */
  readonly lane: string;
  readonly label: Bilingual;
  readonly instruction: Bilingual;
  readonly fields?: readonly StepField[];
  /** A field-catalogue path the scanned value must equal. */
  readonly scan?: { readonly matches: string };
  /** Step ids whose completer may not complete this one. */
  readonly differentFrom?: readonly string[];
  /** Whoever completes this step may not then take the act. */
  readonly completerMayNotAct?: boolean;
  readonly when?: { readonly fork: string; readonly branch: 'yes' | 'no' };
}

/** A condition on the document that decides which steps apply. */
export interface AddedFork {
  readonly id: string;
  readonly before: string;
  readonly condition: Comparison;
  readonly label: Bilingual;
}

export type AddedCheckRule =
  | { readonly kind: 'named-person' }
  | { readonly kind: 'value'; readonly condition: Comparison; readonly message: Bilingual }
  | { readonly kind: 'different-person'; readonly step: string };

/** A rule the platform evaluates when the act is attempted. */
export interface AddedCheck {
  readonly id: string;
  /** The transition id the check stands on. */
  readonly on: string;
  readonly rule: AddedCheckRule;
}

/** What a version says. The whole change is this list — there is no diff. */
export interface FlowVersionContent {
  /** A flow with a command target. */
  readonly entity: string;
  /** The shipped `FlowDefinition.version` it was composed against. */
  readonly baseVersion: number;
  readonly steps: readonly AddedStep[];
  readonly forks: readonly AddedFork[];
  readonly checks: readonly AddedCheck[];
}

export const emptyContent = (entity: string, baseVersion: number): FlowVersionContent => ({
  entity,
  baseVersion,
  steps: [],
  forks: [],
  checks: [],
});

/**
 * The record around the content. Everything outside `title` and `content` is
 * minted by the store: the id, the label, the sequence and every stamp. No
 * stamp is ever a payload field — the dispatcher refuses an actor in a payload
 * by key, and the store ignores an id or a label a payload carries.
 */
export interface FlowVersion {
  /** `fv-<n>`. */
  readonly id: string;
  /** `<shipped version>.<n>` — see `versionLabel`. */
  readonly label: string;
  /** `n`: per process, never reused. */
  readonly seq: number;
  readonly title: string;
  readonly state: string;
  readonly content: FlowVersionContent;
  readonly createdBy: ActorAttribution;
  readonly createdAt: string;
  /** The last save, or `null` while the draft is as it was created. */
  readonly savedBy: ActorAttribution | null;
  readonly savedAt: string | null;
}

// ── THE LABEL RULE (Design 6 v2 §6.1) ───────────────────────────────────────

/** The shipped process itself: `2`. It is always there. */
export const shippedLabel = (shippedVersion: number): string => String(shippedVersion);

/** The n-th change made to a shipped version: `2.1`. */
export const versionLabel = (baseVersion: number, seq: number): string => `${baseVersion}.${seq}`;

/** The stamp an event will carry once versions are in force: `<entity>@<label>`. */
export const versionStamp = (entity: string, label: string): string => `${entity}@${label}`;

const LABEL_RE = /^([1-9]\d*)\.([1-9]\d*)$/;

/** Read a change's label back into its two numbers, or `null` if it is not one. */
export function parseVersionLabel(label: string): { baseVersion: number; seq: number } | null {
  const m = LABEL_RE.exec(label);
  return m ? { baseVersion: Number(m[1]), seq: Number(m[2]) } : null;
}

// ── SHAPE ───────────────────────────────────────────────────────────────────
// Structural only. Whether a well-shaped version OBEYS THE RULES of its process
// is `validateVersion`'s question, and a draft is allowed to fail that one.

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';
const isBilingual = (v: unknown): v is Bilingual => isRecord(v) && isText(v.en) && isText(v.id);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  isText(v) && (list as readonly string[]).includes(v);

function isComparison(v: unknown): v is Comparison {
  if (!isRecord(v) || !isText(v.field) || !oneOf(COMPARISON_OPS, v.op)) return false;
  const value = v.value;
  return (
    isText(value) ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every(isText))
  );
}

function isStepField(v: unknown): v is StepField {
  return (
    isRecord(v) &&
    isText(v.name) &&
    isBilingual(v.label) &&
    oneOf(STEP_FIELD_TYPES, v.type) &&
    typeof v.required === 'boolean' &&
    (v.options === undefined || (Array.isArray(v.options) && v.options.every(isText)))
  );
}

function isStep(v: unknown): v is AddedStep {
  if (!isRecord(v)) return false;
  return (
    isText(v.id) &&
    oneOf(STEP_KINDS, v.kind) &&
    isText(v.before) &&
    typeof v.order === 'number' &&
    Number.isFinite(v.order) &&
    isText(v.lane) &&
    isBilingual(v.label) &&
    isBilingual(v.instruction) &&
    (v.fields === undefined || (Array.isArray(v.fields) && v.fields.every(isStepField))) &&
    (v.scan === undefined || (isRecord(v.scan) && isText(v.scan.matches))) &&
    (v.differentFrom === undefined || (Array.isArray(v.differentFrom) && v.differentFrom.every(isText))) &&
    (v.completerMayNotAct === undefined || typeof v.completerMayNotAct === 'boolean') &&
    (v.when === undefined ||
      (isRecord(v.when) && isText(v.when.fork) && (v.when.branch === 'yes' || v.when.branch === 'no')))
  );
}

const isFork = (v: unknown): v is AddedFork =>
  isRecord(v) && isText(v.id) && isText(v.before) && isComparison(v.condition) && isBilingual(v.label);

function isCheck(v: unknown): v is AddedCheck {
  if (!isRecord(v) || !isText(v.id) || !isText(v.on) || !isRecord(v.rule)) return false;
  const rule = v.rule;
  if (rule.kind === 'named-person') return true;
  if (rule.kind === 'value') return isComparison(rule.condition) && isBilingual(rule.message);
  return rule.kind === 'different-person' && isText(rule.step);
}

/** Is this the shape a version's content has? */
export function isContentShaped(v: unknown): v is FlowVersionContent {
  return (
    isRecord(v) &&
    isText(v.entity) &&
    typeof v.baseVersion === 'number' &&
    Number.isInteger(v.baseVersion) &&
    Array.isArray(v.steps) &&
    v.steps.every(isStep) &&
    Array.isArray(v.forks) &&
    v.forks.every(isFork) &&
    Array.isArray(v.checks) &&
    v.checks.every(isCheck)
  );
}
