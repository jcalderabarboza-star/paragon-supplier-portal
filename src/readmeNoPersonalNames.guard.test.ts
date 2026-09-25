// ─────────────────────────────────────────────────────────────────────────────
// THE GUARD — the README refers to people by ROLE, never by name.
//
// ⚠️ **THE DEFECT THIS EXISTS FOR IS ON RECORD.** The previous README's persona
// table read `Buyer | … | Paragon procurement team — James Chen` and
// `Supplier | … | PT Berlina Packaging Indonesia — Sri Kusuma`. The operator's
// standing rule is roles only, and a document that hands a reader a person's
// name teaches them to think in people where the platform thinks in ROLES —
// which is C10's whole argument: a `TransitionRole` is the permission atom, and
// this platform deliberately contains no persons.
//
// ── ⚠️ TWO DIRECTIONS, BECAUSE NEITHER ONE CATCHES BOTH KINDS OF NAME ────────
//   Measured before this was written, not assumed:
//
//     · **An INVENTED name** — `James Chen` occurs NOWHERE in this repository
//       except the README that carried it. So it is caught by ATTESTATION: a
//       capitalised multi-word phrase that appears nowhere else in the tree is
//       not part of this project's vocabulary. `Paragon Corp`, `Bahasa
//       Indonesia` and every other legitimate phrase in this file IS attested.
//     · **A FIXTURE person** — `Budi Santoso` and eleven siblings are real
//       `contactName` values in `src/data/mockSuppliers.ts`, so attestation
//       ACQUITS them. They are caught by the other direction: the population of
//       person names is DERIVED FROM THE TREE'S OWN PERSON DATA, and none may
//       appear here.
//
//   ⚠️ **A WORD LIST WOULD HAVE BEEN WRONG IN BOTH DIRECTIONS**, which is why
//   there is none. It cannot contain a name nobody has invented yet, and it goes
//   stale the day a fixture gains a contact. Both populations above RE-DECIDE
//   THEMSELVES: add a supplier contact and it joins direction A with nobody
//   editing this file; write a new proper noun into the tree and it becomes
//   attested for direction B the same way.
//
// ── REACH LIMITS, STATED ────────────────────────────────────────────────────
//   · Direction B sees multi-word title-case phrases ON ONE LINE. A single-word
//     name is outside it, and is covered only if the tree holds it as a person.
//   · Attestation is against the WHOLE repository, so a name written into a doc
//     AND into the README is acquitted by B. Direction A still catches it if it
//     is person data; a name that is neither is outside this guard, and is named
//     here rather than left to be assumed covered.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/treeMutationGate/derive';

const README = join(REPO_ROOT, 'README.md');

/** A capitalised phrase of two or more words, on ONE line. */
const TITLE_PHRASE = /\b[A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+\b/g;

/** Person-shaped fixture fields. Derived from source, never listed. */
const PERSON_FIELD = /\b(?:contactName|contactPerson|personName|displayName|fullName)\s*:\s*'([^']+)'/g;

/**
 * This spec is the ONE place in the repository allowed to write the historic
 * names down, because documenting the defect requires naming it.
 *
 * ⚠️ **AND THAT MAKES IT SELF-DISARMING IF IT IS LEFT IN THE CORPUS — MEASURED,
 * NOT FORESEEN.** Direction B convicts a phrase that appears nowhere else in the
 * tree. The moment this file was COMMITTED it became a tracked file, `James
 * Chen` became attested by the very guard that exists to catch it, and both the
 * conviction probe and its own corpus control went red. In the working copy the
 * file was still untracked, so `git ls-files` did not list it and everything was
 * green — **a guard validated against a tree that did not yet contain it.** The
 * clean clone is what found this, which is precisely what a clean clone is for.
 */
const SELF = 'src/readmeNoPersonalNames.guard.test.ts';

/** Every tracked file except the README itself and the things that cannot attest. */
function attestationCorpus(): string {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const parts: string[] = [];
  for (const rel of out.split('\n')) {
    if (!rel || rel === 'README.md' || rel === SELF) continue;
    if (/\.(png|ico|svg|xlsx|woff2?)$/i.test(rel) || rel === 'package-lock.json') continue;
    try {
      parts.push(readFileSync(join(REPO_ROOT, rel), 'utf8'));
    } catch {
      // A path git lists but this process cannot open is not attestation either
      // way; skipping it can only make the guard STRICTER, never laxer.
    }
  }
  return parts.join('\n');
}

/** Every person name the tree itself holds, derived from its own person data. */
export function personNamesInTree(corpus: string): string[] {
  return [...new Set([...corpus.matchAll(PERSON_FIELD)].map((m) => m[1]))];
}

/** Capitalised phrases in `text` that appear nowhere in `corpus`. */
export function unattestedPhrases(text: string, corpus: string): string[] {
  return [...new Set(text.match(TITLE_PHRASE) ?? [])].filter((p) => !corpus.includes(p));
}

describe('README person references · THE POPULATIONS, before any claim', () => {
  const corpus = attestationCorpus();

  it('⚠️ the attestation corpus is real, and attests known-true phrases', () => {
    // An empty or truncated corpus would make EVERY phrase unattested and the
    // claim below would convict this README of everything
    // (`EMPTY-INPUT-REPORTS-CLEAN-01`, in the direction that manufactures work).
    expect(corpus.length).toBeGreaterThan(1_000_000);
    expect(corpus).toContain('Paragon Corp');
    expect(corpus).toContain('Odyssey');
    // …and it is NOT attesting the historic defect, which is what makes
    // direction B able to catch it at all.
    expect(corpus).not.toContain('James Chen');
  });

  it('⚠️ the corpus excludes exactly TWO files, and this one really holds the specimen', () => {
    // The exclusion is the load-bearing part and the easiest to widen by
    // accident, so it is pinned rather than trusted. If the specimen ever left
    // this file, the exclusion would be buying nothing and should go with it.
    const tracked = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }).split('\n');
    expect(tracked).toContain(SELF);
    expect(tracked).toContain('README.md');
    expect(readFileSync(join(REPO_ROOT, SELF), 'utf8')).toContain('James Chen');
    // Everything else is IN the corpus — asserted by a member that could only
    // come from a third file.
    expect(corpus).toContain('Budi Santoso'); // src/data/mockSuppliers.ts
  });

  it('⚠️ the person population is DERIVED and holds a known member BY NAME', () => {
    const people = personNamesInTree(corpus);
    expect(people.length).toBeGreaterThan(5);
    expect(people).toContain('Budi Santoso'); // src/data/mockSuppliers.ts
    expect(people).not.toContain('Paragon Corp'); // a company is not a person field
  });
});

describe('README person references · THE MATCHER, probed both ways', () => {
  const corpus = attestationCorpus();

  it('⚠️ CONVICTS the invented name this README used to carry', () => {
    // `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`: the shipped matcher, fired at the
    // geometry the tree really occupied, returning the member BY NAME.
    expect(unattestedPhrases('Paragon procurement team — James Chen', corpus)).toEqual([
      'James Chen',
    ]);
  });

  it('⚠️ ACQUITS a legitimate proper noun — on the merits, not by not looking', () => {
    // The same call, the same corpus, the opposite verdict. Without this, the
    // conviction above is satisfied by a matcher that convicts everything.
    expect(unattestedPhrases('Paragon Corp runs the Odyssey Program', corpus)).toEqual([]);
  });

  it('⚠️ and the FIXTURE-person direction catches what attestation cannot', () => {
    // Measured: `Budi Santoso` IS attested (it is a real fixture value), so
    // direction B acquits it and only direction A can convict. This is the
    // assertion that justifies there being two directions at all.
    //
    // (The phrase matcher is GREEDY across adjacent capitalised words, so the
    // name is given here with a lower-case word in front of it. `Contact Budi
    // Santoso` is a three-word phrase that is itself unattested, and would have
    // convicted for the wrong reason — a probe input, not a matcher defect, but
    // the kind that gets read as one.)
    expect(unattestedPhrases('the contact is Budi Santoso', corpus)).toEqual([]);
    expect(personNamesInTree(corpus)).toContain('Budi Santoso');
  });
});

describe('README person references · THE CLAIM', () => {
  const corpus = attestationCorpus();
  const readme = readFileSync(README, 'utf8');

  it('⚠️ the README names NO person the tree holds', () => {
    const named = personNamesInTree(corpus).filter((n) => readme.includes(n));
    expect(
      named,
      'The README refers to a person by name. The operator’s standing rule is ' +
        'roles only — "the buyer", "the requisitioner", "the supplier" — because ' +
        'this platform deliberately contains no persons and a name teaches the ' +
        'reader to think in people where the permission model thinks in roles.',
    ).toEqual([]);
  });

  it('⚠️ and every capitalised phrase in it is ATTESTED elsewhere in the tree', () => {
    const unattested = unattestedPhrases(readme, corpus);
    expect(
      unattested,
      'A capitalised phrase the README uses and nothing else in this repository ' +
        'does is, on the evidence, not part of this project’s vocabulary — which ' +
        'is exactly the shape an invented personal name has (`James Chen` ' +
        'occurred nowhere but the README that carried it). If it is a real term, ' +
        'the tree should be saying it somewhere too.',
    ).toEqual([]);
  });
});
