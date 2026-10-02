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
import { commentRanges, stripSourceComments } from './lib/sourceScan/stripComments';

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

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTION D · CODE COMMENTS — E1.
//
// ⚠️ **THE RULE REACHED THE README AND THE RENDERED CHROME, AND THE COMMENTS
// STILL CITED A PERSON.** Rulings were attributed by initials across eleven
// source files — `(JJ, commercial)`, `JJ's commercial ruling`, `JJ's Indonesian
// team` — including four in shipped code. A comment is read by every engineer
// who opens the file, which makes it the most-read prose in the repository.
// E1 replaced them with the role (the operator) and this direction keeps them
// out.
//
// ── TWO HALVES, FOR THE SAME REASON A AND B ARE TWO ─────────────────────────
//   · **A fixture person** (`Budi Santoso`) must not appear in any comment — the
//     population derived from the tree's own person data, as direction A.
//   · **Initials** have no person record to derive from, so the instrument is
//     ATTESTATION, as direction B: an uppercase token of two or three letters,
//     written the way a person is CITED in a comment — possessive (`XX's`),
//     parenthetical attribution (`(XX,`), or the subject of a ruling verb (`XX
//     ruled`, `XX named`) — that appears NOWHERE in this tree's code once the
//     comments are removed. `RFQ's`, `SAP's`, `PO's` are attested by the code
//     that names those things; a person's initials are not, because the
//     platform contains no persons.
//
// ⚠️ **NO WORD LIST, FOR THE REASON DIRECTION C GIVES.** A matcher for `JJ` is
// wrong the moment someone else's initials are written, and it could not have
// been authored before the defect existed. Attestation re-decides itself: a new
// abbreviation the code really uses is acquitted with nobody editing this file.
//
// ── REACH LIMITS, STATED ────────────────────────────────────────────────────
//   · Only the three citation shapes above. Bare initials in running prose
//     (`as JJ wrote`) are outside it.
//   · Attestation is against `src/` code with comments removed, excluding this
//     file (which must name the specimen). A person's initials that also occur
//     as a code token would be acquitted.
//   · `.ts` / `.tsx` under `src/` only; the docs corpus is outside this
//     direction, as it is outside A and B.
//   · The fixture-person half reads only names of two or more capitalised
//     words. `personNamesInTree` also returns custom-ROLE display names a spec
//     authors (`'Probe'`, `'Second'`), which are not persons and would convict
//     every comment containing the English word.
// ═══════════════════════════════════════════════════════════════════════════

/** A person cited by initials in prose: `XX's `, `(XX,`, `XX ruled|ruling|named|said|asked|decided`. */
const INITIALS_CITED = /\b([A-Z]{2,3})(?:'s|’s)\s|\(([A-Z]{2,3}),|\b([A-Z]{2,3}) (?:ruled|ruling|named|said|asked|decided)\b/g;

interface SourceText {
  readonly path: string;
  readonly text: string;
}

/** Every tracked `.ts`/`.tsx` under `src/`, except this file. */
function sourceTexts(): SourceText[] {
  return execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', 'src'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\n')
    .filter((p) => /\.(ts|tsx)$/.test(p) && p !== SELF)
    .map((path) => ({ path, text: readFileSync(join(REPO_ROOT, path), 'utf8') }));
}

/** The comment text of one file, through the shared comment-aware scan. */
const commentTextOf = (s: SourceText): string =>
  commentRanges(s.text, s.path)
    .map((r) => s.text.slice(r.pos, r.end))
    .join('\n');

/** The code of every file with its comments removed — the attestation corpus. */
const codeCorpus = (files: readonly SourceText[]): string =>
  files.map((s) => stripSourceComments(s.text, 'space', s.path)).join('\n');

/**
 * Abbreviations a comment cites in the possessive that the code never spells,
 * each with what it names. ⚠️ BILATERAL — an entry no comment still needs is
 * red, so this can only shrink truthfully. It is a list of ACQUITTALS, never of
 * convictions: nothing here can make a person's initials pass unseen except by
 * being written into it, in review.
 */
//
// Empty since H1, and emptied by the rule above rather than by hand: `RFP` was
// acquitted here until `handoverIndex.guard.test.ts` began to name the RFP in
// code, which attests the token, so the bilateral check below turned red on the
// row it no longer needed.
const NOT_A_PERSON: Readonly<Record<string, string>> = {};

/** Initials cited as a person in `comments` that the code never uses: `token`, deduplicated. */
export function unattestedInitials(comments: string, code: string): string[] {
  const tokens = [...comments.matchAll(INITIALS_CITED)].map((m) => m[1] ?? m[2] ?? m[3]);
  return [...new Set(tokens)].filter((tok) => !new RegExp(String.raw`\b${tok}\b`).test(code));
}

describe('code comments · NO PERSON CITED (direction D)', () => {
  const FILES = sourceTexts();
  const CODE = codeCorpus(FILES);
  const COMMENTS = FILES.map((s) => ({ path: s.path, comments: commentTextOf(s) }));
  const PEOPLE = personNamesInTree(attestationCorpus()).filter((n) => /^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/.test(n));

  it('⚠️ the populations are real — files, comments, code, and the attestation reaches a known token', () => {
    expect(FILES.length).toBeGreaterThan(500);
    expect(COMMENTS.filter((c) => c.comments.length > 0).length).toBeGreaterThan(300);
    // The corpus attests what the code really uses, and is NOT attesting the
    // specimen — which is what lets the claim below catch it at all.
    expect(new RegExp(String.raw`\bRFQ\b`).test(CODE)).toBe(true);
    expect(new RegExp(String.raw`\bJJ\b`).test(CODE)).toBe(false);
    expect(PEOPLE).toContain('Budi Santoso');
  }, 60_000);

  it('⚠️ CONVICTS the comment this repository carried at dda8079 — by name', () => {
    // `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`: the shipped matcher, the live code
    // corpus, and a comment the tree really held, read out of git.
    const retired = execFileSync('git', ['show', 'dda8079:src/pages-v2/rfqs/quotationLeadTime.ts'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(unattestedInitials(commentTextOf({ path: 'quotationLeadTime.ts', text: retired }), CODE)).toEqual(['JJ']);
  });

  it('⚠️ ACQUITS an abbreviation the code uses, in the same shapes — on the merits', () => {
    expect(unattestedInitials("// the RFQ's deadline (SAP, external) — the PO ruling stands", CODE)).toEqual([]);
  });

  it('⚠️ no comment cites a person by initials the code never uses', () => {
    const cited = COMMENTS.flatMap((c) =>
      unattestedInitials(c.comments, CODE)
        .filter((tok) => !(tok in NOT_A_PERSON))
        .map((tok) => `${c.path}: ${tok}`),
    );
    expect(
      cited,
      'A comment cites a person by initials. The operator’s standing rule is roles only — ' +
        '"the operator", "the strategist", "the buyer" — in comments as in the README.',
    ).toEqual([]);
  });

  it('every acquittal is still needed, and states what it names', () => {
    const needed = new Set(COMMENTS.flatMap((c) => unattestedInitials(c.comments, CODE)));
    expect(Object.keys(NOT_A_PERSON).filter((k) => !needed.has(k))).toEqual([]);
    expect(Object.entries(NOT_A_PERSON).filter(([, why]) => why.trim().length < 20)).toEqual([]);
  });

  it('⚠️ no comment names a person the tree holds', () => {
    const named = COMMENTS.flatMap((c) => PEOPLE.filter((p) => c.comments.includes(p)).map((p) => `${c.path}: ${p}`));
    expect(named).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DIRECTION E · THE DOCS CORPUS — H1.
//
// ⚠️ **THE HANDOVER PACKAGE ARRIVED CARRYING A PERSON, AND NO DIRECTION ABOVE
// READ `docs/`.** Four of the six designs closed on a "Source file:" footer —
// and Design 6 on a confirmation paragraph — naming a local Windows path whose
// user folder is the operator's personal name. Five lines; H1 replaced the
// folder with the placeholder `<operator>`. Directions A–D reach the README,
// the rendered chrome and code comments; this one reaches every markdown file
// under `docs/`, which is what the engineering team taking the platform over
// reads first.
//
// ── TWO HALVES, ON THE SAME REASONING AS A/B AND D ─────────────────────────
//   · **A local user-folder path** whose folder is not a placeholder —
//     `C:\Users\<folder>\…`, `/Users/<folder>/…`, `/home/<folder>/…`. The
//     folder of a working machine is a person's account name; the property is
//     structural, so no word list is needed and none could have been written
//     before the defect existed.
//   · **A fixture person** the tree holds (direction A's population), in any
//     doc — minus the acquittals below, each stating what it names.
//
// ── REACH LIMITS, STATED ────────────────────────────────────────────────────
//   · Markdown under `docs/` only. A person named in prose with no path and no
//     fixture record is outside it, as it is outside A.
//   · The path half reads three shapes. A UNC share (`\\host\users\…`) or a
//     `%USERPROFILE%` expansion is outside it.
// ═══════════════════════════════════════════════════════════════════════════

/** A user-folder path whose folder is not a `<placeholder>`; the folder is group 1, 2 or 3. */
const USER_FOLDER_PATH = /\b[A-Za-z]:[\\/]Users[\\/](?!<)([^\\/\s`'"*<>|]+)|\/Users\/(?!<)([^/\s`'"*<>|]+)|\/home\/(?!<)([^/\s`'"*<>|]+)/g;

/** Every user folder a text names through a path. Exported so the probes fire the SHIPPED matcher. */
export function userFoldersIn(text: string): string[] {
  return [...new Set([...text.matchAll(USER_FOLDER_PATH)].map((m) => m[1] ?? m[2] ?? m[3]))];
}

/**
 * Names `personNamesInTree` returns that are NOT persons, each with what it is.
 * ⚠️ BILATERAL — an entry no doc still needs is red, so this can only shrink
 * truthfully, and nothing here can let a real person through unseen except by
 * being written into it, in review.
 */
const DOCS_NOT_A_PERSON: Readonly<Record<string, string>> = {
  'Jakarta Night Shift':
    'a custom ROLE display name three specs author (`customRoles.test.ts`); docs/findings.md records the batch that rendered it.',
};

/** Every markdown file under `docs/`, read from disk (an uncommitted doc is still a doc). */
function docsMarkdown(dir = join(REPO_ROOT, 'docs'), out: SourceText[] = []): SourceText[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) docsMarkdown(p, out);
    else if (/\.md$/i.test(e)) {
      out.push({ path: p.slice(REPO_ROOT.length + 1).split('\\').join('/'), text: readFileSync(p, 'utf8') });
    }
  }
  return out;
}

describe('docs · NO PERSON NAMED (direction E)', () => {
  const DOCS = docsMarkdown();
  const PEOPLE = personNamesInTree(attestationCorpus()).filter((n) => /^[A-Z][a-z]+(?: [A-Z][a-z]+)+$/.test(n));

  it('⚠️ the population is real and reaches the package this direction was written for', () => {
    const paths = DOCS.map((d) => d.path);
    expect(paths.length).toBeGreaterThan(50);
    expect(paths).toContain('docs/handover/D1_SE_HANDOVER.md');
    expect(paths).toContain('docs/designs/DESIGN_6_FLOW_BUILDER.md');
    expect(paths).toContain('docs/findings.md');
    expect(PEOPLE).toContain('Budi Santoso');
  });

  it('⚠️ CONVICTS the footer the designs arrived with — the folder, by shape', () => {
    // `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`: Design 3's footer exactly as it was
    // drafted, with only the personal folder swapped for a stand-in — the real
    // folder cannot be written here without committing the defect this
    // direction exists to keep out.
    const drafted = '*Source file: `C:\\Users\\SomeOperatorName\\review-drafts\\DESIGN_3_STATE_MACHINE.md` (2026-09-28).*';
    expect(userFoldersIn(drafted)).toEqual(['SomeOperatorName']);
    expect(userFoldersIn('cwd was /home/someone/repo and /Users/someone-else/x')).toEqual(['someone', 'someone-else']);
  });

  it('⚠️ ACQUITS the placeholder that replaced it — on the merits, not by not looking', () => {
    const committed = '*Source file: `C:\\Users\\<operator>\\review-drafts\\DESIGN_3_STATE_MACHINE.md` (2026-09-28).*';
    expect(userFoldersIn(committed)).toEqual([]);
    expect(DOCS.find((d) => d.path === 'docs/designs/DESIGN_3_STATE_MACHINE.md')!.text).toContain(
      'C:\\Users\\<operator>\\review-drafts\\',
    );
  });

  it('⚠️ no doc names a local user folder', () => {
    const named = DOCS.flatMap((d) => userFoldersIn(d.text).map((f) => `${d.path}: ${f}`));
    expect(
      named,
      'A document names a local user folder — on a working machine that is a person’s account name. ' +
        'Write the folder as `<operator>` (or the role it stands for).',
    ).toEqual([]);
  });

  it('⚠️ no doc names a person the tree holds', () => {
    const named = DOCS.flatMap((d) =>
      PEOPLE.filter((p) => !(p in DOCS_NOT_A_PERSON) && d.text.includes(p)).map((p) => `${d.path}: ${p}`),
    );
    expect(named).toEqual([]);
  });

  it('every acquittal is still needed, and states what it names', () => {
    const needed = new Set(PEOPLE.filter((p) => DOCS.some((d) => d.text.includes(p))));
    expect(Object.keys(DOCS_NOT_A_PERSON).filter((k) => !needed.has(k))).toEqual([]);
    expect(Object.entries(DOCS_NOT_A_PERSON).filter(([, why]) => why.trim().length < 20)).toEqual([]);
  });
});
