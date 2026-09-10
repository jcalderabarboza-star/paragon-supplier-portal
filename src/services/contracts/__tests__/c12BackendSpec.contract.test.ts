// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// C12 — THE BACKEND SPEC AND THE TREE ARE PINNED TOGETHER.
//
// ⚠️ **FOUR SECTIONS ARE CHECKABLE AND THE REST IS PROSE. THAT SPLIT IS STATED
// IN THE DOCUMENT ITSELF, NOT ONLY HERE**, so a reader cannot mistake an
// unchecked paragraph for a checked one.
//
//   §2.1  the never-originate table  ≡  creation ∧ external-fact, from the registry
//   §5    the seam-code table        ≡  the owner union vs C5's seam sections
//   §3    the inherited invariants   ≡  C11's non-FACTORY rows
//   all   every artefact it names in backticks EXISTS
//
// The last one is why this file is worth its weight: a draft of C12 cited
// `sourceSystem` and `externalEventId` as shipped fields and the tree has
// NEITHER. A handover document that names a field which does not exist is a
// forward promise aimed at the people least able to check it.
//
// ⚠️ **ANTI-VACUITY FIRST.** Every assertion below compares two derived sets,
// and two empty sets are equal (`EMPTY-INPUT-REPORTS-CLEAN-01`). The first
// describe proves both halves are populated before any comparison is believed.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';

import {
  C12_PATH,
  backticked,
  c11NonFactoryRows,
  c12InheritedRows,
  citedArtefacts,
  creationExternalFacts,
  knownTransitionIds,
  ownersInUse,
  ownersWithSeamCode,
  readDoc,
  sapBoundaryVerbs,
  section,
  srcText,
} from './deriveC12BackendSpec';

const DOC = readDoc(C12_PATH);

describe('POPULATION CONTROLS — before any comparison is believed', () => {
  it('the document parsed, and is not a stub', () => {
    expect(DOC.length).toBeGreaterThan(4000);
  });

  it('the flow registry is SEEDED — a registry of [] would make every set-equality vacuous', () => {
    const ids = knownTransitionIds();
    expect(ids.size).toBeGreaterThan(50);
    expect(ids.has('t_gr_post')).toBe(true);
    expect(ids.has('t_not_a_real_transition')).toBe(false);
  });

  it('both derived halves are NON-EMPTY — creation∧external-fact, and the owner union', () => {
    expect(creationExternalFacts().length).toBeGreaterThan(0);
    expect(ownersInUse().length).toBeGreaterThan(1);
  });

  it('the section parser returns content, not silence', () => {
    expect(section(DOC, /Never originate these/).length).toBeGreaterThan(200);
    expect(section(DOC, /The seam-code gap/).length).toBeGreaterThan(200);
    expect(section(DOC, /The invariants you inherit as work/).length).toBeGreaterThan(200);
  });

  it('KNOWN-BAD CONTROL — a heading that does not exist yields EMPTY, not the whole file', () => {
    expect(section(DOC, /this heading has never existed/)).toBe('');
  });
});

describe('§2.1 — the never-originate table IS the derived intersection', () => {
  const derived = creationExternalFacts();
  const listed = backticked(section(DOC, /Never originate these/)).filter((t) => /^t_/.test(t));

  it('every DERIVED creation-external-fact is named in the document', () => {
    const missing = derived.map((d) => d.id).filter((id) => !listed.includes(id));
    expect(missing).toEqual([]);
  });

  it('and every transition the document names is REALLY one — no invented row', () => {
    const derivedIds = derived.map((d) => d.id);
    const extra = listed.filter((id) => !derivedIds.includes(id));
    expect(extra).toEqual([]);
  });

  it('each row names its OWNER, so the reason is attributable', () => {
    const md = section(DOC, /Never originate these/);
    for (const { id, owner } of derived) {
      const row = md.split('\n').find((l) => l.includes(`\`${id}\``)) ?? '';
      expect(row, `${id} has no row`).not.toBe('');
      expect(row, `${id}'s row does not name its owner`).toContain(owner);
    }
  });
});

describe('§2.3 — the SAP-boundary verbs are the ones the flows declare', () => {
  it('every sapBoundary verb is named, and none that is not', () => {
    const md = section(DOC, /Never resolve a SAP-boundary verb/);
    const listed = backticked(md).filter((t) => /^t_/.test(t)).sort();
    expect(listed).toEqual(sapBoundaryVerbs());
  });
});

describe('§5 — the seam-code gap is the union against C5, both directions', () => {
  const owners = ownersInUse();
  const covered = ownersWithSeamCode();
  const md = section(DOC, /The seam-code gap/);

  it('CONTROL — at least one owner IS covered and at least one is NOT', () => {
    // Without both, the table below is a list rather than a gap.
    expect(covered.length).toBeGreaterThan(0);
    expect(owners.filter((o) => !covered.includes(o)).length).toBeGreaterThan(0);
  });

  it('every owner in the union has a row', () => {
    const missing = owners.filter((o) => !md.includes(`\`${o}\``));
    expect(missing).toEqual([]);
  });

  it('an owner WITH a seam code is not listed as missing one', () => {
    for (const o of covered) {
      const row = md.split('\n').find((l) => l.includes(`\`${o}\``)) ?? '';
      expect(row, `${o} has no row`).not.toBe('');
      expect(row, `${o} has a seam code but its row says no`).toMatch(/\*\*yes\*\*/);
    }
  });

  it('⚠️ an owner WITHOUT one is listed as missing — the direction that decays when a seam lands', () => {
    for (const o of owners.filter((x) => !covered.includes(x))) {
      const row = md.split('\n').find((l) => l.includes(`\`${o}\``)) ?? '';
      expect(row, `${o} has no row`).not.toBe('');
      expect(row, `${o} has no seam code but its row does not say so`).toMatch(/\*\*no\*\*/);
    }
  });
});

describe('§3 — the inherited list IS C11’s non-FACTORY set', () => {
  it('CONTROL — both sides are populated', () => {
    expect(c11NonFactoryRows().length).toBeGreaterThan(5);
    expect(c12InheritedRows().length).toBeGreaterThan(5);
  });

  it('the two sets are equal — a row reclassified in C11 reddens C12', () => {
    expect(c12InheritedRows().sort()).toEqual(c11NonFactoryRows().sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE HALF THAT EXISTS BECAUSE A DRAFT GOT IT WRONG.
// ─────────────────────────────────────────────────────────────────────────────
describe('⚠️ EVERY ARTEFACT C12 NAMES EXISTS', () => {
  const cited = citedArtefacts();

  it('CONTROL — the extractor found real claims to check', () => {
    expect(cited.length).toBeGreaterThan(4);
    expect(cited.some((c) => c.kind === 'transition')).toBe(true);
    expect(cited.some((c) => c.kind === 'identifier')).toBe(true);
  });

  it('every cited TRANSITION id is in the registry', () => {
    const known = knownTransitionIds();
    const ghosts = cited.filter((c) => c.kind === 'transition' && !known.has(c.token)).map((c) => c.token);
    expect(ghosts).toEqual([]);
  });

  it('every cited FIELD identifier occurs in src/', () => {
    const src = srcText();
    const ghosts = cited
      .filter((c) => c.kind === 'identifier')
      .filter((c) => !src.includes(c.token.split('.').pop() as string))
      .map((c) => c.token);
    expect(ghosts).toEqual([]);
  });

  it('⚠️ KNOWN-BAD CONTROL — the check REJECTS the two names a draft invented', () => {
    // `sourceSystem` and `externalEventId` were cited as shipped fields and the
    // tree has neither. If this control ever passes, the matcher has stopped
    // discriminating and the assertions above prove nothing.
    const src = srcText();
    expect(src.includes('sourceSystem')).toBe(false);
    expect(src.includes('externalEventId')).toBe(false);
  });

  it('and it ACCEPTS the field that really shipped — the other half of the control', () => {
    expect(srcText().includes('idempotencyKey')).toBe(true);
    expect(DOC).toContain('`CommandInput.idempotencyKey`');
  });
});
