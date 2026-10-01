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
import { readFileSync, readdirSync, statSync } from 'node:fs';
import ts from 'typescript';
import { join } from 'node:path';

import { REPO_ROOT } from './lib/treeMutationGate/derive';
import { personNamesInTree } from './lib/personNames';

const README = join(REPO_ROOT, 'README.md');

/** A capitalised phrase of two or more words, on ONE line. */
const TITLE_PHRASE = /\b[A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+\b/g;


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

// The person population lives in `lib/personNames.ts` since G1, so the process
// guides' gate reads the same denylist rather than a copy of its matcher.
export { personNamesInTree };

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

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTION C · THE RENDERED SURFACE, NOT THE README — H3 addendum.
//
// ⚠️ **THE RULE WAS RIGHT AND ITS REACH WAS ONE FILE.** Directions A and B are
// both scoped to `README.md`, which is how `IdentityPanel.tsx` shipped this:
//
//     const initials = persona === 'supplier' ? 'PS' : 'JJ';
//
// rendered into the avatar in the top bar of EVERY ROUTE IN THE PORTAL. `JJ` is
// a person's initials — the operator's — so the one place in this product where
// a reader looks to find out WHO THEY ARE was answering with a name, while a
// guard existed whose entire subject is that this platform names no persons. A
// document was covered and the screen was not.
//
// ── WHY A LITERAL IS THE THING CONVICTED, RATHER THAN THE LETTERS `JJ` ──────
//
// A matcher for `JJ` would be a word list of exactly one entry, wrong the moment
// somebody authors different initials, and it could never have been written
// before the defect existed. The property that is actually wrong is structural:
// **an identity glyph must be DERIVED from the identity, never authored beside
// it.** So the population is every declaration in the rendered tree whose name
// says it holds initials, and the claim is that none of them contains a string
// literal. `IdentityPanel` now reads
// `t(`nav.persona.${persona}`).trim().charAt(0).toUpperCase()` — no literal, and
// it cannot drift from the label the panel prints in full one line below.
//
// ⚠️ **THIS IS THE SAME SHAPE AS `moduleScopeLiteralGate`'S DISCRIMINATOR AND
// DELIBERATELY SO: IT RE-DECIDES ITSELF.** The day somebody adds an `initials`
// helper anywhere under `src/`, it joins this population with nobody editing
// this file — which is the one property a name list can never have.
//
// REACH LIMITS, stated rather than left to be assumed:
//   · It reads DECLARATION NAMES. An authored glyph assigned to a variable
//     called something else, or inlined straight into JSX, is outside it.
//   · It forbids a literal in the initializer, so a derivation that happens to
//     contain a legitimate literal (a separator, a fallback `'?'`) would be
//     convicted. There is none today; if one is ever needed, the right answer is
//     to narrow this to string literals of 1–3 LETTERS, not to exempt the file.
//   · Directions A and B still cover the README only. Nothing here extends them.
// ═══════════════════════════════════════════════════════════════════════════

/** Every `.tsx` under `src/` — the rendered tree, excluding its own specs. */
function renderedFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) renderedFiles(p, out);
    else if (/\.tsx$/.test(p) && !/\.(test|smoke)\.tsx$/.test(p)) out.push(p);
  }
  return out;
}

interface InitialsDecl {
  readonly file: string;
  readonly line: number;
  readonly name: string;
  readonly init: string;
}

/**
 * Declarations that hold an identity glyph, by NAME, with their initializer text.
 * Exported so the probe below fires the SHIPPED matcher rather than a copy of it.
 */
export function initialsDeclarations(file: string, raw: string): InitialsDecl[] {
  const sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = file.split('\\').join('/').replace(/^.*\/src\//, 'src/');
  const out: InitialsDecl[] = [];
  const visit = (n: ts.Node): void => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      /initials?$/i.test(n.name.text) &&
      n.initializer
    ) {
      out.push({
        file: rel,
        line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
        name: n.name.text,
        init: n.initializer.getText(sf),
      });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/**
 * A quoted run of ONE TO THREE LETTERS is an authored glyph. Anything else is not.
 *
 * ⚠️ **NARROWED FROM "ANY LITERAL" BECAUSE "ANY LITERAL" CONVICTED TWO
 * CORRECT DERIVATIONS ON THE FIRST RUN, AND THE COMMENT ABOVE HAD ALREADY NAMED
 * THIS AS THE RIGHT REMEDY IF IT HAPPENED — so it is taken rather than argued.**
 * Measured:
 *
 *   src/components/ui-v2/SupplierCard.tsx:37
 *   src/pages-v2/BuyerSupplierProfile.tsx:234
 *     initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('')
 *
 * Both DERIVE the glyph from a supplier's own name — a company, not a person —
 * which is the exact behaviour this rule wants. They were convicted for the `''`
 * they hand to `join`, a separator that names nobody. **Derivation rule 2: the
 * wide form manufactured accusations against the two files already doing the
 * right thing, while the defect it was written for is a two-letter token.**
 *
 * So the unit is the SHAPE of an authored glyph rather than the presence of a
 * literal: `'JJ'` and `'PS'` are convicted; `''`, `'?'`, a regex separator and a
 * template literal carrying an i18n key are not.
 */
const AUTHORED_GLYPH = /(['"])[A-Za-z]{1,3}\1/;

describe('rendered identity chrome · NO AUTHORED PERSONAL GLYPH (direction C)', () => {
  const FILES = renderedFiles(join(REPO_ROOT, 'src'));
  const DECLS = FILES.flatMap((f) => initialsDeclarations(f, readFileSync(f, 'utf8')));

  it('⚠️ the population is real and REACHES the declaration this rule was written for', () => {
    // Anti-vacuity, and the specific kind that matters here: a population derived
    // by declaration NAME goes silently empty if somebody renames the variable,
    // and an empty population passes the claim below over nothing
    // (`EMPTY-INPUT-REPORTS-CLEAN-01`). So the avatar's own declaration is named.
    expect(FILES.length).toBeGreaterThan(100);
    expect(DECLS.length).toBeGreaterThan(0);
    expect(DECLS.map((d) => `${d.file}::${d.name}`)).toContain(
      'src/components/layout-v2/IdentityPanel.tsx::initials',
    );
  });

  it('⚠️ no identity glyph is AUTHORED — every one is derived', () => {
    const authored = DECLS.filter((d) => AUTHORED_GLYPH.test(d.init)).map(
      (d) => `${d.file}:${d.line} ${d.name} = ${d.init.replace(/\s+/g, ' ').slice(0, 80)}`,
    );
    expect(
      authored,
      'An identity glyph is written as a literal beside the identity instead of derived from it. ' +
        'The operator’s standing rule is roles only, never personal names, and an authored glyph is ' +
        'how `JJ` — a real person’s initials — reached the top bar of every route in the portal. ' +
        'Derive it from the same localized label the surface already prints.',
    ).toEqual([]);
  });

  it('⚠️ CONVICTS the declaration this repository shipped at 81c9840', () => {
    // `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01` — the SHIPPED matcher, fired at the
    // geometry the tree really occupied, naming the member. Not a synthetic
    // subject: this is `IdentityPanel.tsx`'s line as `main` carried it when this
    // branch was cut, and it is the only place that line now survives.
    const shipped = `
      const IdentityPanel = () => {
        const initials = persona === 'supplier' ? 'PS' : 'JJ';
        return <button>{initials}</button>;
      };
    `;
    const decls = initialsDeclarations('C:/history/src/IdentityPanel.tsx', shipped);
    expect(decls.map((d) => d.name)).toEqual(['initials']);
    expect(AUTHORED_GLYPH.test(decls[0].init), 'the authored pair must be convicted').toBe(true);
  });

  it('⚠️ ACQUITS the derivation that replaced it — on the merits, not by not looking', () => {
    // The same matcher, the opposite verdict. Without this the conviction above
    // is satisfied by a rule that convicts every initializer there is.
    const fixed = `
      const IdentityPanel = () => {
        const initials = t(\`nav.persona.\${persona}\`).trim().charAt(0).toUpperCase();
        return <button>{initials}</button>;
      };
    `;
    const decls = initialsDeclarations('C:/history/src/IdentityPanel.tsx', fixed);
    expect(decls.map((d) => d.name)).toEqual(['initials']);
    expect(AUTHORED_GLYPH.test(decls[0].init), 'the derived glyph must be acquitted').toBe(false);
  });
});
