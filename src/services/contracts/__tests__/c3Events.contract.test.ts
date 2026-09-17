// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// C3 — THE EVENT TAXONOMY AND THE TREE ARE PINNED TOGETHER.
//
// ⚠️ **"C3 IS NOT PINNABLE" WAS MEASURED IN SEPTEMBER AND IS FALSE.** The
// finding was that C3 is prose against prose. It is not: the page publishes TWO
// INTERFACES VERBATIM, a closed union, a method ARITY, five named artefacts and
// four transition ids. Every one of those has a tree half. What made the earlier
// reading plausible is that C3's *narrative* — cascade grouping, best-effort
// fan-out — really is behavioural prose; the mistake was letting the narrative
// stand for the page.
//
// ⚠️ **AND THE PIN FOUND A LIVE DEFECT ON ITS FIRST RUN.** `TransitionEvent`
// carried TEN fields while C3 documented SEVEN — `reason`, `decision` and
// `attribution` were live and undocumented, under a paragraph promising the
// taxonomy was "frozen at one shape". That is the #307 staleness class
// (a signature restated in prose) with three instances instead of one.
//
// ── THE SHAPE, AND IT IS C9'S NOT A NEW ONE ─────────────────────────────────
//   `materialMasterRef.contract.test.ts` derives the tree's facts and asserts
//   they APPEAR IN THE MARKDOWN; `ledgerTruth` does the inverse per row. C3's
//   claims are the first kind: the document must name what the tree has. The
//   REVERSE direction is asserted too — a field the document names that the tree
//   lacks is equally a defect, and a one-way pin ratifies whichever half it does
//   not check.
//
// ── §86 — THE HALVES ARE INDEPENDENT ────────────────────────────────────────
//   The document half is markdown text; the tree half is the TypeScript AST via
//   `buildRepoProgram`. Mutating `events.ts` cannot shrink the document's claim
//   set, so the pin can always tell "I caught it" from "I have nothing to read".
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildRepoProgram } from '../../../lib/storedFieldGate/derive';
import { deriveInterfaceMembers } from './deriveC1Surface';
import { getKnownFlows } from '../../transitions';
import { stripSourceComments } from '../../../lib/sourceScan/stripComments';

const ROOT = process.cwd();
const CONTRACT = readFileSync(join(ROOT, 'docs', 'contracts', 'C3-events.md'), 'utf8');
const EVENTS_PATH = join(ROOT, 'src', 'services', 'transitions', 'events.ts');
const TYPES_PATH = join(ROOT, 'src', 'services', 'data', 'types.ts');

const program = buildRepoProgram(ROOT);

/** Fields the document's `TransitionEvent` code block declares. */
function documentedFields(iface: string): string[] {
  const block = new RegExp(`interface ${iface} \\{([\\s\\S]*?)\\n\\}`).exec(CONTRACT)?.[1] ?? '';
  return [...block.matchAll(/^\s*readonly\s+([A-Za-z][A-Za-z0-9]*)\??:/gm)].map((m) => m[1]).sort();
}

describe('POPULATION + PARSER CONTROLS — before any comparison is believed', () => {
  it('the contract page was read and is not a stub', () => {
    expect(CONTRACT.length).toBeGreaterThan(2000);
  });

  it('the AST program resolved the events module — not an empty derivation', () => {
    const { properties } = deriveInterfaceMembers(program, EVENTS_PATH, 'TransitionEvent');
    expect(properties.length).toBeGreaterThan(5);
    expect(properties).toContain('correlationId');
  });

  // ⚠️ Written expecting `[]` and corrected on the first run: the deriver THROWS
  // on a name it cannot find. That is the better behaviour and the stronger
  // control — an empty return would be indistinguishable from an interface that
  // genuinely has no members, which is exactly how a derivation reports on its
  // own matcher instead of on the tree.
  it('KNOWN-BAD CONTROL — an interface that does not exist THROWS, it does not return empty', () => {
    expect(() => deriveInterfaceMembers(program, EVENTS_PATH, 'NotARealInterfaceName')).toThrow(
      /not declared in/,
    );
  });

  it('the document parser found a field list, not silence', () => {
    expect(documentedFields('TransitionEvent').length).toBeGreaterThan(5);
  });

  it('KNOWN-BAD CONTROL — the document parser returns [] for an absent block', () => {
    expect(documentedFields('NoSuchInterfaceInTheDocument')).toEqual([]);
  });
});

describe('⚠️ TransitionEvent is documented FIELD FOR FIELD, both directions', () => {
  const tree = deriveInterfaceMembers(program, EVENTS_PATH, 'TransitionEvent').properties.slice().sort();
  const doc = documentedFields('TransitionEvent');

  it('every field the TREE has is documented — this is what caught reason/decision/attribution', () => {
    expect(tree.filter((f) => !doc.includes(f))).toEqual([]);
  });

  it('and every field the DOCUMENT names is really on the type — the reverse half', () => {
    expect(doc.filter((f) => !tree.includes(f))).toEqual([]);
  });
});

describe('AuditSink — the seam the whole contract rests on', () => {
  it('the documented method set IS the interface', () => {
    const { methods } = deriveInterfaceMembers(program, EVENTS_PATH, 'AuditSink');
    expect([...methods].sort()).toEqual(['emit']);
    expect(CONTRACT).toContain('emit(event: TransitionEvent): void;');
  });

  it('`InMemoryAuditSink` really implements it, and really has the methods C3 names', () => {
    const src = readFileSync(EVENTS_PATH, 'utf8');
    expect(src).toMatch(/class InMemoryAuditSink implements AuditSink/);
    for (const m of ['all', 'byEvent', 'clear']) {
      expect(src, `InMemoryAuditSink.${m} is named by C3`).toMatch(
        new RegExp(`^\\s+${m}\\(`, 'm'),
      );
    }
  });
});

describe('⚠️ THE #307 CLASS — a signature restated in prose', () => {
  // C3 says `getCommandStatus(scope, correlationId)` and `settle(scope, correlationId)`
  // are 1:1 with the correlation id. That arity went stale once already, by hand.
  it('both methods take (scope, correlationId) — the arity C3 states', () => {
    const src = readFileSync(TYPES_PATH, 'utf8');
    for (const m of ['getCommandStatus', 'settle']) {
      expect(src, `${m}'s arity`).toMatch(
        new RegExp(`${m}\\(scope: QueryScope, correlationId: string\\)`),
      );
      expect(CONTRACT, `C3 states ${m}'s arity`).toContain(`${m}(scope, correlationId)`);
    }
  });

  it('`CommandOutcome`’s members are exactly the three C3 prints', () => {
    const src = readFileSync(TYPES_PATH, 'utf8');
    const decl = /export type CommandOutcome = ([^;]+);/.exec(src)?.[1] ?? '';
    const members = [...decl.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    expect(members).toEqual(['done', 'failed', 'submitted']);
    expect(CONTRACT).toContain("'done' | 'submitted' | 'failed'");
  });
});

describe('the artefacts and transitions C3 names all exist', () => {
  const src = readFileSync(EVENTS_PATH, 'utf8');

  it('`actorKey` is exported from the module C3 cites as source of truth', () => {
    expect(src).toMatch(/export function actorKey\(/);
    expect(CONTRACT).toContain('actorKey(scope)');
  });

  it('⚠️ the worked cascade example names REAL transitions — a stale example is a wrong spec', () => {
    const ids = new Set(getKnownFlows().flatMap((f) => f.transitions).map((t) => t.id));
    expect(ids.size).toBeGreaterThan(50); // the registry is seeded
    const cited = [...CONTRACT.matchAll(/`(t_[a-z0-9_]+)`/g)].map((m) => m[1]);
    expect(cited.length).toBeGreaterThan(3);
    expect(cited.filter((t) => !ids.has(t))).toEqual([]);
  });

  it('KNOWN-BAD CONTROL — the registry really would reject an invented id', () => {
    const ids = new Set(getKnownFlows().flatMap((f) => f.transitions).map((t) => t.id));
    expect(ids.has('t_not_a_real_transition')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ WHAT THIS PIN DELIBERATELY DOES NOT ASSERT, so the gap is visible.
//
// C3's cascade narrative — "post-apply, best-effort", "a sibling already
// terminal simply no-ops", the DR-10 grouping argument — is BEHAVIOUR, and this
// file does not touch it. Asserting it here would re-implement the dispatcher's
// own specs beside them, and a re-implementation that disagrees with the
// instrument is the thing under test (`REIMPLEMENTATION-CONTRADICTS-THE-
// INSTRUMENT-01`). Those properties are covered where they belong, by the
// dispatcher and cascade specs.
//
// The claim THIS file makes is narrow and true: **every shape, signature, name
// and id C3 prints is the one the tree has.** That is the class that went stale
// at #307, and it is the class a document can be wrong about silently.
// ─────────────────────────────────────────────────────────────────────────────

// -----------------------------------------------------------------------------
// ⚠️ THE INSTANT — C3's DEV HALF, MADE CHECKABLE.
//
// C3 already carries the clause: *"`ts` is caller-supplied, never read inside
// the pure dispatcher … In the mock it is `() => new Date().toISOString()`; the
// real adapter supplies its own clock."* **That sentence was PROSE and nothing
// checked it.** It is the shape this corpus keeps finding — a contract clause a
// pin cannot see, which is how one gets contradicted by shipped code while
// everything reads green.
//
// ⚠️ **IT IS PINNED RATHER THAN RESTATED BECAUSE IT IS DECIDABLE.** A clock read
// is a CALL SHAPE, not a meaning: the spine either reads one or it does not.
// Most semantic clauses in this corpus cannot be checked at all; this one can,
// so it gets a guard instead of another paragraph.
//
// ⚠️ **THE DISCRIMINATION THE MATCHER MUST GET RIGHT.** `new Date()` reads the
// clock. `new Date(asOf)` PARSES A SUPPLIED STRING and is not a clock read at
// all — `policies.ts` does exactly that, validating an FX pin's `asOf`. A
// matcher that cannot tell them apart accuses the spine of the very thing this
// assertion exists to deny, which is heuristic rule 2 widening into a false
// accusation. Both directions are controlled below, and the known-GOOD control
// runs FIRST (rule 4): the matcher must find clock reads where they really are
// before its silence over the spine means anything.
// -----------------------------------------------------------------------------
const SPINE_DIR = join(ROOT, 'src', 'services', 'transitions');
const MOCK_COMMAND = join(ROOT, 'src', 'services', 'data', 'mock', 'MockCommandService.ts');

/**
 * Comments blanked LENGTH-PRESERVINGLY, so a clock read QUOTED in a comment
 * cannot count. `contractDraftOwner.ts` quotes `Date.now()` while describing a
 * retired defect, and an unstripped matcher would convict the spine on it.
 *
 * The fifth private stripper in this tree — the absence of a shared helper is
 * filed, not fixed here.
 */
const codeOnly = (s: string): string => stripSourceComments(s, 'blank');

/** Zero-argument `new Date()` and `Date.now()` — clock READS, never parses. */
const CLOCK_READ = /\bDate\.now\s*\(|\bnew\s+Date\s*\(\s*\)/g;

function spineFiles(): string[] {
  const found: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name)) found.push(p);
    }
  };
  walk(SPINE_DIR);
  return found;
}

const clockReadsIn = (file: string): number =>
  (codeOnly(readFileSync(file, 'utf8')).match(CLOCK_READ) ?? []).length;

/** C3's prose, whitespace-flattened — the clause wraps across lines. */
const FLAT = CONTRACT.replace(/\s+/g, ' ');

describe('⚠️ the instant is INJECTED, and the shared spine holds no clock', () => {
  const files = spineFiles();

  it('CONTROL — the spine was really read', () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((f) => f.endsWith('dispatcher.ts'))).toBe(true);
  });

  it('⚠️ KNOWN-GOOD FIRST — the matcher FINDS clock reads where they really are', () => {
    // The mock service reads the wall clock many times over. A zero here means
    // the matcher is broken and every assertion below is vacuous.
    expect(clockReadsIn(MOCK_COMMAND)).toBeGreaterThan(5);
  });

  it('⚠️ and it does NOT count a PARSE — `new Date(asOf)` is not a clock read', () => {
    expect('const t = new Date(asOf).getTime();'.match(CLOCK_READ)).toBeNull();
    expect('const t = new Date().toISOString();'.match(CLOCK_READ)).not.toBeNull();
  });

  it('a clock read quoted inside a COMMENT does not count', () => {
    expect(codeOnly('// it minted ctr-new plus Date.now() and toasted').match(CLOCK_READ)).toBeNull();
  });

  it('THE CLAIM — no file in the shared spine reads a clock', () => {
    const offenders = files
      .filter((f) => clockReadsIn(f) > 0)
      .map((f) => f.slice(ROOT.length + 1).replace(/\\/g, '/'));
    expect(offenders).toEqual([]);
  });

  it('the dispatcher DECLARES the instant as a dependency', () => {
    expect(readFileSync(join(SPINE_DIR, 'dispatcher.ts'), 'utf8')).toMatch(/now:\s*\(\)\s*=>\s*string/);
  });

  it('⚠️ the DEV supplier is the one C3 documents, at the one wiring site', () => {
    expect(readFileSync(MOCK_COMMAND, 'utf8')).toContain('now: () => new Date().toISOString()');
    expect(FLAT).toContain('() => new Date().toISOString()');
  });

  it('and C3 states the PRODUCTION origin beside it — both halves, or it is not a DEV half', () => {
    expect(FLAT).toContain('caller-supplied');
    expect(FLAT).toContain('the real adapter supplies its own clock');
  });
});
