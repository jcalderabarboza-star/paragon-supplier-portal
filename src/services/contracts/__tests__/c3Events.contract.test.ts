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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildRepoProgram } from '../../../lib/storedFieldGate/derive';
import { deriveInterfaceMembers } from './deriveC1Surface';
import { getKnownFlows } from '../../transitions';

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
