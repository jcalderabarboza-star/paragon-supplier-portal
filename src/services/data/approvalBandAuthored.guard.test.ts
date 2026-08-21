// ────────────────────────────────────────────────────────────────────────────
// §69 — THE APPROVAL BAND IS AUTHORED, AND THE TREE STAYS THAT WAY.
//
// `approvalLevel` carries 'Section Head' / 'Procurement Head' / 'VP Procurement'
// on fixture rows whose `estimatedValue` rises with them. It READS as a computed
// band. Nothing computes it — measured — and the surface now says so.
//
// This gate exists because the honest label is only honest while it is TRUE. The
// day somebody writes `approvalLevel: bandFor(pr.estimatedValue)` the label
// becomes the lie it was written to prevent, and no type can object: the field
// is `string`, and a derived string is a string.
//
// ⚠️ **TWO MATCHERS, AND THE FIRST IS THE ONE THE CLAIM REQUIRES (§42).** "Is the
// band derived?" is a question about the WRITE site, not the read site. A scan
// that finds `estimatedValue` being read has found a call; only an assignment to
// `approvalLevel` can make the band computed. The read-side matcher below is a
// SECOND, weaker net over the same claim — kept because a derivation could be
// staged (bucket in one file, assign in another) — and its limits are stated
// rather than implied.
//
// ⚠️ RULE 4 — BOTH matchers are probed in BOTH directions, on the same
// instrument, before either is believed about the tree. A source scan returning
// an empty set is indistinguishable from a scan that read no files, and "your
// codebase is clean" is the reading that gets believed.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REQUISITIONS } from './mock/fixtures/buyerRequisitions';
import { requisitionsEn, requisitionsId } from '../../lib/i18n/requisitions';

const SRC = join(process.cwd(), 'src');

/** Every shipped .ts/.tsx under src/ — specs excluded; they name what they guard. */
function shipped(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) shipped(full, out);
    else if (/\.tsx?$/.test(name) && !name.includes('.test.')) out.push(full);
  }
  return out;
}

/** Comments stripped: a rule stated in the file it governs reads as a violation
 *  of itself (§68's gate tripped on its own explanation twice). */
const withoutProse = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// ── MATCHER 1 · the WRITE site ──────────────────────────────────────────────
// Every `approvalLevel:` assignment must have a QUOTED STRING LITERAL on the
// right. A call, a variable, a ternary or a template literal all mean something
// decided it, and "something decided it" is exactly what the surface denies.
// The DTO's own `approvalLevel: string;` declaration is the one legal
// non-literal and is allowlisted BY FILE, bilaterally (asserted present below,
// so the exemption cannot rot into a vacuous one).
const TYPE_DECL_FILE = 'services/data/types.ts';

function bandWrites(source: string): string[] {
  return [...withoutProse(source).matchAll(/\bapprovalLevel:\s*([^\n,;]*)/g)].map((m) =>
    m[1].trim(),
  );
}

const isLiteral = (rhs: string): boolean => /^'[^']*'$/.test(rhs) || /^"[^"]*"$/.test(rhs);

// ── MATCHER 2 · the READ site ───────────────────────────────────────────────
// A relational or arithmetic use of `estimatedValue`. `===` / `!==` are NOT
// threshold shapes (a presence check is one — `BuyerSourcing.tsx`), and `=>` is
// excluded explicitly: an arrow returning the field is not a comparison, and
// widening to catch it would accuse every accessor. Rule 2 — a widened matcher
// manufactures false accusations exactly as readily as a narrow one hides truths.
const THRESHOLD =
  /\bestimatedValue\s*(?:>=|<=|>|<|\+|-|\*|\/)[^=]|(?<![=!<>+\-*/])(?:>=|<=|>|<|\+|\*|\/)\s*[\w.]*\bestimatedValue\b/;

const comparesValue = (source: string): boolean => THRESHOLD.test(withoutProse(source));

describe('⚠️ §69 · THE MATCHERS, BEFORE ANY CLAIM ABOUT THE TREE', () => {
  it('✅ WRITE matcher fires on a derived band — the known-GOOD probe', () => {
    expect(bandWrites('const pr = { approvalLevel: bandFor(pr.estimatedValue), x: 1 };')).toEqual([
      'bandFor(pr.estimatedValue)',
    ]);
    expect(bandWrites('{ approvalLevel: v > 1e8 ? A : B, y: 2 }')[0]).not.toBe('');
    expect(isLiteral('bandFor(x)')).toBe(false);
    expect(isLiteral('v > 1e8 ? A : B')).toBe(false);
    expect(isLiteral('BAND')).toBe(false);
    expect(isLiteral('`${band}`')).toBe(false);
  });

  it('and does NOT fire on the authored form — the known-BAD probe', () => {
    expect(isLiteral("'Section Head'")).toBe(true);
    expect(isLiteral("''")).toBe(true);
    // …nor on an i18n KEY that merely contains the field name. The quote before
    // the colon is what separates them, and it is asserted rather than assumed.
    expect(bandWrites("  'requisitions.panel.field.approvalLevel': 'Routes to',")).toEqual([]);
    expect(bandWrites("  'requisitions.panel.approvalLevel.authored': 'x',")).toEqual([]);
  });

  it('✅ READ matcher fires on a threshold — the known-GOOD probe', () => {
    expect(comparesValue('if (pr.estimatedValue >= 100_000_000) return VP;')).toBe(true);
    expect(comparesValue('const over = THRESHOLD < pr.estimatedValue;')).toBe(true);
    expect(comparesValue('const each = pr.estimatedValue / pr.quantity;')).toBe(true);
  });

  it('and does NOT fire on a render, a presence check, or an accessor', () => {
    expect(comparesValue('formatIDR(pr.estimatedValue, { compact: true })')).toBe(false);
    expect(comparesValue('r.value.estimatedValue === undefined')).toBe(false);
    expect(comparesValue('estimatedValue: line.estimatedValue,')).toBe(false);
    expect(comparesValue('(r) => formatIDR(r.estimatedValue)')).toBe(false);
    // Prose naming the forbidden shape is not the shape (§68's lesson, kept).
    expect(comparesValue('// never write estimatedValue >= 100_000_000 here')).toBe(false);
  });

  it('⚠️ AND THE POPULATION IS NON-EMPTY — an empty scan reports clean either way', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: a right answer from an instrument that
    // examined nothing looks exactly like a right answer. Membership, never a
    // count — the file list grows and a count would rot.
    const files = shipped(SRC).map((f) => relative(SRC, f).replace(/\\/g, '/'));
    expect(files).toContain('services/data/mock/fixtures/buyerRequisitions.ts');
    expect(files).toContain('services/data/mock/MockCommandService.ts');
    expect(files).toContain('pages-v2/BuyerRequisitions.tsx');
    expect(files).toContain(TYPE_DECL_FILE);
    // …and the field is actually THERE to be found. Without this the zero-offender
    // assertions below could both pass over a tree that had renamed it away.
    const allWrites = files.flatMap((f) => bandWrites(readFileSync(join(SRC, f), 'utf-8')));
    expect(allWrites.length).toBeGreaterThan(5);
    expect(allWrites).toContain("'Section Head'");
  });
});

describe('§69 · nothing in the portal derives the approval band', () => {
  it('⚠️ EVERY `approvalLevel` write is an authored string literal', () => {
    const offenders = shipped(SRC)
      .map((f) => ({ f: relative(SRC, f).replace(/\\/g, '/'), src: readFileSync(f, 'utf-8') }))
      .filter(({ f }) => f !== TYPE_DECL_FILE)
      .flatMap(({ f, src }) =>
        bandWrites(src)
          .filter((r) => !isLiteral(r))
          .map((r) => `${f}: ${r}`),
      );

    expect(
      offenders,
      'The panel states that `approvalLevel` is AUTHORED, not derived from the ' +
        'estimated value. A computed write makes that statement false. §69 measured ' +
        'the band rule UNBUILDABLE on two independent grounds — no seniority roles ' +
        '(C10 §3.4 forbids minting one per band) and no ApprovalPolicyAct/ApprovalAct ' +
        'ledgers (C10 §3.5 defers them) — so a derivation landing here has invented ' +
        'its thresholds. If a policy ledger has genuinely landed, amend the surface ' +
        'copy, this gate and CLAUDE.md together, not one of the three.',
    ).toEqual([]);
  });

  it('and the DTO declaration is still the ONE allowlisted non-literal', () => {
    // The bilateral half: an exemption whose subject has gone is an exemption
    // that silently widens (§68 deleted one of those from the stored-field gate).
    const decl = bandWrites(readFileSync(join(SRC, TYPE_DECL_FILE), 'utf-8'));
    expect(decl).toEqual(['string']);
  });

  it('⚠️ and no shipped source COMPARES `estimatedValue` — the second net', () => {
    const offenders = shipped(SRC)
      .filter((f) => comparesValue(readFileSync(f, 'utf-8')))
      .map((f) => relative(SRC, f).replace(/\\/g, '/'));

    expect(
      offenders,
      'A threshold comparison on `estimatedValue` appeared. C10 §4.1 cost 2: ' +
        '"above X now needs another approver" is an operational decision made on a ' +
        'Tuesday — as a number in code it is a review and a deploy, which is the ' +
        'shape §4 refuses. It belongs in an ApprovalPolicyAct, not in a hook or a ' +
        'component. THIS NET IS THE WEAKER OF THE TWO and cannot see a staged ' +
        'derivation; the write-site assertion above is the one to trust.',
    ).toEqual([]);
  });
});

describe('§69 · "not assigned" has ONE representation', () => {
  it('no fixture row stores the em dash the renderer used to fall back to', () => {
    // pr-005 carried a literal '—'. That is the render fallback written into the
    // data, so an unassigned band and an empty field displayed as one glyph and
    // nothing on the surface could tell them apart.
    expect(REQUISITIONS.map((r) => r.approvalLevel)).not.toContain('—');
    expect(REQUISITIONS.find((r) => r.id === 'pr-005')!.approvalLevel).toBe('');
    // …and the authored rows are untouched, so this is a normalisation and not a
    // quiet deletion of the vocabulary the batch is about.
    expect(REQUISITIONS.find((r) => r.id === 'pr-004')!.approvalLevel).toBe('Section Head');
  });

  it('the provenance + unassigned strings exist in BOTH locales and differ', () => {
    for (const key of [
      'requisitions.panel.approvalLevel.authored',
      'requisitions.panel.approvalLevel.unassigned',
    ]) {
      expect(requisitionsEn[key], key).toBeTruthy();
      expect(requisitionsId[key], key).toBeTruthy();
      // A copy-pasted EN string in the ID map is what this catches; the fragment
      // parity gate only proves the KEY is present in both.
      expect(requisitionsId[key], key).not.toBe(requisitionsEn[key]);
    }
  });

  it('⚠️ and the New-PR form no longer promises a rung the create path never writes', () => {
    // `t_pr_create` writes `approvalLevel: ''`. The old copy said "this PR routes
    // to Section Head" — refuted by the create path AND by pr-003 ('VP
    // Procurement') in the same sentence. Procurement is derivable-true:
    // `pr:approve` lives in exactly one bundle (`businessRoles.ts`).
    expect(requisitionsEn['requisitions.new.info']).not.toMatch(/Section Head/);
    expect(requisitionsId['requisitions.new.info']).not.toMatch(/Kepala Seksi/);
    expect(requisitionsEn['requisitions.new.info']).toMatch(/Procurement/);
    // The flow strip enumerated two rungs of a three-rung vocabulary and omitted
    // the most populous one.
    expect(requisitionsEn['requisitions.flow.approval.sub']).not.toMatch(/Section Head/);
  });
});
