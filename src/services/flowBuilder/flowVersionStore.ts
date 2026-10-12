// ────────────────────────────────────────────────────────────────────────────
// FB-1 · THE VERSION STORE — kept in this browser, across reloads (operator
// ruling, decision 11), on the custom-roles pattern (`customRoles.ts`).
//
// ── WHAT MUST BE TRUE, AND WHERE EACH HALF LIVES ────────────────────────────
// 1. THE READ FAILS HONESTLY. Absent, corrupt and unparseable storage are told
//    apart from an empty store: "no changes" and "the store could not be read"
//    are different facts, and `readState()` says which.
// 2. EVERY ROW IS VALIDATED AGAIN ON READ. A row that is not a version, names
//    nobody recordable, or contradicts its own label is refused BY NAME and
//    listed — never absorbed. Whether a well-formed version still OBEYS THE
//    RULES of its process is `readFlowVersions()`'s half (`liveWorld.ts`),
//    which reports it and keeps the row: a draft is allowed to be unfinished.
// 3. THE STORE MINTS. The id, the label, the sequence and every stamp are
//    assigned here. Nothing a caller passes can set one.
// 4. A VERSION IS NEVER DELETED AND A LABEL IS NEVER REUSED. A row refused on
//    read stays in storage, and the per-process counter never runs backwards,
//    so a refused `2.1` is not handed out again.
// 5. AN UNSEEDED REGISTRY IS NOT A CORRUPT STORE. With no flow registered the
//    read is suspended, not failed.
//
// THE ONLY WRITERS ARE `create`, `save` AND `move`, AND ALL THREE ARE CALLED BY
// THE COMMAND TARGET — an act on a version goes through the dispatcher and
// leaves an event. THERE IS NO DELETE, AND `save` WRITES A DRAFT ONLY: a version
// that left Draft is never edited (`fb3Lifecycle.test.ts` holds that this
// object has no other door).
// ────────────────────────────────────────────────────────────────────────────

import type { ActorAttribution } from '../../lib/enforcement';
import { asActorAttribution } from '../../lib/enforcement';
import { DECLARED_PRESENT_INSTANT } from '../data/fixturePresent';
import { getKnownFlows } from '../transitions/registry';
import { FLOW_VERSION_STATES } from '../transitions/flows/flowVersion.flow';
import {
  emptyContent,
  isContentShaped,
  parseVersionLabel,
  VERSION_ACTS,
  versionLabel,
  type FlowVersion,
  type FlowVersionContent,
  type VersionAct,
} from './flowVersion';

/** The one key, beside `paragon.customRoles`. */
export const FLOW_VERSIONS_KEY = 'paragon.flowVersions';

const STORE_VERSION = 1;

export interface FlowVersionReadState {
  /** The rows that are versions, in the order they were created. */
  readonly versions: readonly FlowVersion[];
  /** Rows refused on read, each by name with the reason. They stay in storage. */
  readonly rejected: readonly { readonly id: string; readonly reason: string }[];
  /** The store exists but could not be parsed — DISTINCT from "no store". */
  readonly unreadable: boolean;
  /** No flow was registered yet, so the read was suspended, not failed. */
  readonly suspended: boolean;
}

const EMPTY_READ: FlowVersionReadState = Object.freeze({
  versions: Object.freeze([]),
  rejected: Object.freeze([]),
  unreadable: false,
  suspended: false,
});

let rows: FlowVersion[] = [];
/** Rows refused on read, kept verbatim so a write never drops them. */
let refusedRaw: unknown[] = [];
/** The highest sequence ever minted per process. Never runs backwards. */
let counters: Record<string, number> = {};
let nextId = 1;
let readState: FlowVersionReadState = EMPTY_READ;
let hydrated = false;
/** Bumped on every write and every re-read, so a surface can read again. */
let revision = 0;
const listeners = new Set<() => void>();
const notify = (): void => {
  revision += 1;
  for (const l of listeners) l();
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const idNumber = (id: unknown): number => {
  const m = typeof id === 'string' ? /^fv-(\d+)$/.exec(id) : null;
  return m ? Number(m[1]) : 0;
};

/** Structural: is this the shape a stored version has? The rules are below. */
function isVersionShaped(v: unknown): v is FlowVersion {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.seq === 'number' &&
    typeof v.title === 'string' &&
    typeof v.state === 'string' &&
    typeof v.createdAt === 'string' &&
    (v.savedAt === null || typeof v.savedAt === 'string') &&
    // A row written before warnings could be acknowledged carries none.
    (v.acknowledged === undefined ||
      (Array.isArray(v.acknowledged) && v.acknowledged.every((k) => typeof k === 'string'))) &&
    (v.history === undefined || (Array.isArray(v.history) && v.history.every(isActShaped))) &&
    isContentShaped(v.content)
  );
}

function isActShaped(v: unknown): boolean {
  return (
    isRecord(v) &&
    (VERSION_ACTS as readonly unknown[]).includes(v.act) &&
    typeof v.from === 'string' &&
    typeof v.to === 'string' &&
    typeof v.at === 'string' &&
    typeof v.reason === 'string' &&
    (v.bypass === undefined ||
      (isRecord(v.bypass) &&
        typeof v.bypass.reason === 'string' &&
        Array.isArray(v.bypass.rules) &&
        v.bypass.rules.every((r) => typeof r === 'string')))
  );
}

/** A stored history, with every stamp read back as a recorded attribution — or `null`. */
function readHistory(raw: unknown): VersionAct[] | null {
  const out: VersionAct[] = [];
  for (const h of (raw ?? []) as (VersionAct & { by: unknown })[]) {
    const by = h.by === null ? null : asActorAttribution(h.by);
    if (by === undefined) return null;
    out.push({ ...h, by });
  }
  return out;
}

/** Why a well-shaped row is not a version this store minted, or `null`. */
function refusalFor(row: FlowVersion, seenIds: ReadonlySet<string>, seenLabels: ReadonlySet<string>): string | null {
  if (idNumber(row.id) === 0) return `'${row.id}' is not a version id`;
  if (seenIds.has(row.id)) return `'${row.id}' appears twice in the store`;
  if (!(FLOW_VERSION_STATES as readonly string[]).includes(row.state)) {
    return `'${row.state}' is not a state a version can be in`;
  }
  const parsed = parseVersionLabel(row.label);
  if (!parsed || parsed.baseVersion !== row.content.baseVersion || parsed.seq !== row.seq) {
    return `label '${row.label}' does not match version ${row.content.baseVersion}, change ${row.seq}`;
  }
  const key = `${row.content.entity}#${row.label}`;
  if (seenLabels.has(key)) return `${row.content.entity} already has a version ${row.label}`;
  if (row.title.trim() === '') return 'the title is blank';
  return null;
}

interface Envelope {
  readonly versions: readonly unknown[];
  readonly counters: Record<string, number>;
}

function readEnvelope(): { env: Envelope | null; unreadable: boolean } {
  let raw: string | null = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { env: null, unreadable: false };
    raw = window.localStorage.getItem(FLOW_VERSIONS_KEY);
  } catch {
    // Private browsing / disabled storage: an inaccessible store is not a corrupt one.
    return { env: null, unreadable: false };
  }
  if (raw === null) return { env: null, unreadable: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { env: null, unreadable: true };
  }
  if (!isRecord(parsed) || parsed.v !== STORE_VERSION || !Array.isArray(parsed.versions)) {
    return { env: null, unreadable: true };
  }
  const stored = isRecord(parsed.counters) ? parsed.counters : {};
  const kept: Record<string, number> = {};
  for (const [entity, n] of Object.entries(stored)) {
    if (typeof n === 'number' && Number.isInteger(n) && n > 0) kept[entity] = n;
  }
  return { env: { versions: parsed.versions, counters: kept }, unreadable: false };
}

function hydrate(): void {
  if (hydrated) return;
  const { env, unreadable } = readEnvelope();
  rows = [];
  refusedRaw = [];
  counters = {};
  nextId = 1;
  if (env === null) {
    readState = unreadable ? { ...EMPTY_READ, unreadable: true } : EMPTY_READ;
    hydrated = true;
    return;
  }
  if (getKnownFlows().length === 0) {
    // Not latched: a read taken before the flows registered must not leave the
    // store looking empty for the rest of the session.
    readState = { ...EMPTY_READ, suspended: true };
    return;
  }

  const rejected: { id: string; reason: string }[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();
  counters = { ...env.counters };
  const refuse = (row: unknown, id: string, reason: string): void => {
    rejected.push({ id, reason });
    refusedRaw.push(row);
  };
  for (const [i, row] of env.versions.entries()) {
    // A refused row still claims its id and its sequence: neither is minted again.
    if (isRecord(row)) {
      nextId = Math.max(nextId, idNumber(row.id) + 1);
      const entity = isRecord(row.content) ? row.content.entity : undefined;
      if (typeof entity === 'string' && typeof row.seq === 'number' && Number.isInteger(row.seq) && row.seq > 0) {
        counters[entity] = Math.max(counters[entity] ?? 0, row.seq);
      }
    }
    if (!isVersionShaped(row)) {
      refuse(row, `row ${i}`, 'not a version');
      continue;
    }
    const createdBy = asActorAttribution((row as { createdBy: unknown }).createdBy);
    const savedRaw = (row as { savedBy: unknown }).savedBy;
    const savedBy = savedRaw === null ? null : asActorAttribution(savedRaw);
    const history = readHistory((row as { history?: unknown }).history);
    if (!createdBy || savedBy === undefined || history === null) {
      refuse(row, row.id, 'a stamp is not a recorded attribution');
      continue;
    }
    const refusal = refusalFor(row, seenIds, seenLabels);
    if (refusal) {
      refuse(row, row.id, refusal);
      continue;
    }
    // The state a version rests in is the state its last act left it in.
    const rests = history.length > 0 ? history[history.length - 1].to : FLOW_VERSION_STATES[0];
    if (rests !== row.state) {
      refuse(row, row.id, `the state '${row.state}' is not where its history leaves it ('${rests}')`);
      continue;
    }
    seenIds.add(row.id);
    seenLabels.add(`${row.content.entity}#${row.label}`);
    rows.push({ ...row, acknowledged: row.acknowledged ?? [], createdBy, savedBy, history });
  }
  readState = { versions: rows, rejected, unreadable: false, suspended: false };
  hydrated = true;
}

function persist(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      FLOW_VERSIONS_KEY,
      JSON.stringify({ v: STORE_VERSION, versions: [...rows, ...refusedRaw], counters }),
    );
  } catch {
    // Quota / private browsing. The act the dispatcher accepted still stands in
    // this session; what is lost is durability.
  }
}

function publish(next: FlowVersion[]): void {
  rows = next;
  readState = { ...readState, versions: rows };
  persist();
  notify();
}

export const flowVersionStore = {
  /** Every version, oldest first. */
  all(): readonly FlowVersion[] {
    hydrate();
    return rows;
  },
  byId(id: string): FlowVersion | undefined {
    hydrate();
    return rows.find((r) => r.id === id);
  },
  forEntity(entity: string): readonly FlowVersion[] {
    hydrate();
    return rows.filter((r) => r.content.entity === entity);
  },
  /** What the last read found — including what it refused and whether it could be parsed. */
  readState(): FlowVersionReadState {
    hydrate();
    return readState;
  },
  /**
   * A NEW DRAFT. The caller says which process, against which shipped version,
   * and what it is called; the store mints everything else.
   */
  create(
    input: { entity: string; baseVersion: number; title: string; from?: FlowVersionContent },
    actor: ActorAttribution,
  ): FlowVersion {
    hydrate();
    const seq = (counters[input.entity] ?? 0) + 1;
    counters = { ...counters, [input.entity]: seq };
    const version: FlowVersion = {
      id: `fv-${nextId++}`,
      label: versionLabel(input.baseVersion, seq),
      seq,
      title: input.title.trim(),
      state: FLOW_VERSION_STATES[0],
      // "Start a draft from this version": the same elements, against the
      // process as it ships now. Nothing else of the source travels — a new
      // label, no acknowledgement, a new author.
      content: input.from
        ? { ...input.from, entity: input.entity, baseVersion: input.baseVersion }
        : emptyContent(input.entity, input.baseVersion),
      acknowledged: [],
      createdBy: actor,
      createdAt: DECLARED_PRESENT_INSTANT,
      savedBy: null,
      savedAt: null,
      history: [],
    };
    publish([...rows, version]);
    return version;
  },
  /**
   * REPLACE A DRAFT'S CONTENT, and which of its warnings are acknowledged. The
   * record around them is not the caller's to write.
   */
  save(id: string, content: FlowVersionContent, acknowledged: readonly string[], actor: ActorAttribution): void {
    hydrate();
    publish(
      rows.map((r) =>
        // A DRAFT ONLY. The dispatcher refuses the act elsewhere; this is the
        // second lock, on the door itself.
        r.id === id && r.state === FLOW_VERSION_STATES[0]
          ? { ...r, content, acknowledged: [...new Set(acknowledged)], savedBy: actor, savedAt: DECLARED_PRESENT_INSTANT }
          : r,
      ),
    );
  },
  /**
   * AN ACT MOVED THE CHANGE. The state it rests in and the line of history are
   * written together, so neither can say something the other does not. The
   * instant is the store's.
   */
  move(id: string, act: Omit<VersionAct, 'at' | 'from'>): void {
    hydrate();
    publish(
      rows.map((r) =>
        r.id === id
          ? { ...r, state: act.to, history: [...r.history, { ...act, from: r.state, at: DECLARED_PRESENT_INSTANT }] }
          : r,
      ),
    );
  },
  /** Forget everything, in memory AND on disk — test isolation. */
  reset(): void {
    rows = [];
    refusedRaw = [];
    counters = {};
    nextId = 1;
    readState = EMPTY_READ;
    hydrated = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(FLOW_VERSIONS_KEY);
      }
    } catch {
      // nothing to do; the in-memory state is already clear
    }
    notify();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Changes whenever the store was written or read again. */
  revision(): number {
    return revision;
  },
  /** Drop the in-memory copy WITHOUT touching storage — what a reload does. */
  rehydrate(): void {
    hydrated = false;
    hydrate();
    notify();
  },
};
