// ────────────────────────────────────────────────────────────────────────────
// §68 — DP2-BUTTON-01 AMENDED: THE RESERVED-SOLID REGISTER IS RETIRED.
//
// Solid action-blue used to be the irreversible-commit signal — Award, Release
// payment, Post-to-SAP, Reject, Override-hold — with at most one per surface,
// and the WhatsApp messenger chrome exempt from DP-2 entirely (D-2). The
// operator retired all of it: OUTLINE IS THE ONLY PRIMARY REGISTER, and the
// messenger exemption is retired with it.
//
// ⚠️ **THIS IS A TEST AND NOT A COMMENT BECAUSE A COMMENT DOES NOT SURVIVE THE
// NEXT PAGE — AND THE LITERAL SCAN THAT STARTED THIS WAS INCOMPLETE FOUR WAYS.**
// `grep 'variant="primary"'` found the plain call sites and could not see:
//
//   · a PROP — `BulkActionsBar`'s `primary.solid` opt-in;
//   · a MODEL FLAG — `invoiceActionModel`'s `solid`, which also drove a
//     confirmation step, so deleting it with the styling would have deleted
//     behaviour;
//   · two TYPED HELPERS returning `'primary' | 'outline'` — `FOOTER_VARIANT`
//     and an inline `variant={commitAction ? 'primary' : 'outline'}`;
//   · the DEFAULT — `Button`'s own `variant = 'primary'`, which made solid the
//     shape of forgetting to choose.
//
// THE LIST IS THE COUNT; the last two were found by the TYPE, after removing
// `'primary'` from `Variant` — not by any scan, including this one.
//
// ⚠️ RULE 4 — the matcher is probed BOTH ways. A source scan that returns an
// empty set is indistinguishable from a scan that read no files, and "your
// codebase is clean" is the reading that gets believed. The known-GOOD probe
// below asserts the matcher DOES fire on a synthetic solid button, on the same
// instrument, before the real-tree assertion is worth anything.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { stripSourceComments } from '../lib/sourceScan/stripComments';

const SRC = join(process.cwd(), 'src');

/** Every shipped .tsx under src/ — specs excluded, they may assert on solid. */
function shippedTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      shippedTsx(full, out);
    } else if (name.endsWith('.tsx') && !name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Comments stripped before matching — the `simUsrNamespace` precedent, and it
 * earned its place here immediately: the FIRST run of this gate condemned
 * `BulkActionsBar.tsx`, whose only offence was a comment SAYING that the
 * `variant="primary"` scan had been incomplete. A source matcher cannot tell
 * prose from code, and a rule whose own explanation trips it is a rule people
 * stop explaining.
 */
const withoutProse = (source: string): string => stripSourceComments(source, 'space');

/**
 * The matcher under test: does this source render a solid action-blue button?
 *
 * ⚠️ **TWO CHANGES HERE ARE ONE CHANGE, AND THE ORDER OF THE ARGUMENT MATTERS.**
 * `QUOTED_PRIMARY` is a NECESSARY CONDITION for the regex below — both of its
 * alternatives require `primary` between quote characters — and it is sound only
 * because the strip now BLANKS (`'space'`) instead of DELETING.
 * Blanking cannot join two fragments; deleting can — `pri/* x *\/mary` collapses
 * to `primary` under `'delete'` — so under the old mode a raw-text pre-filter
 * could have skipped a file the full matcher would convict. That is a FALSE
 * NEGATIVE, the direction that terminates an investigation, so the mode was
 * changed rather than the pre-filter weakened.
 *
 * ⚠️ **AND BLANKING WEAKENS NOTHING THIS FILE ASSERTS.** Every use below is a
 * regex over contiguous tokens; `'space'` preserves offsets and removes exactly
 * the same comment bytes. The pinned control two tests down asserts the
 * joining property directly rather than trusting this paragraph.
 *
 * The cost this removes: `withoutProse` is a full TypeScript parse, run over
 * every shipped `.tsx`. Measured 2026-09-21 — **829 ms alone**, and it timed
 * out at 5000 ms under full-suite load during the batch that filed §106i.
 *
 * ⚠️ **THE OBVIOUS PRE-FILTER — `source.includes('primary')` — WAS WRITTEN
 * FIRST AND MEASURED SLOWER (829 ms → 1205 ms), WHICH IS WHY THE QUOTES ARE IN
 * IT.** This portal's DP-2 palette puts `text-primary` in almost every file, so
 * the bare substring is true nearly everywhere and the parse was still paid —
 * plus the cost of asking. A pre-filter is only a pre-filter if it is SELECTIVE;
 * an unmeasured one is just another line of code claiming to help.
 */
const QUOTED_PRIMARY = /['"]primary['"]/;

const rendersSolid = (source: string): boolean =>
  QUOTED_PRIMARY.test(source) &&
  /variant\s*=\s*(["']primary["']|\{[^}]*['"]primary['"][^}]*\})/.test(withoutProse(source));

describe('⚠️ §68 · THE MATCHER ITSELF, BEFORE ANY CLAIM ABOUT THE TREE', () => {
  it('✅ FIRES on a solid button — the known-GOOD probe', () => {
    expect(rendersSolid('<Button variant="primary">Award</Button>')).toBe(true);
    expect(rendersSolid("<Button variant='primary' />")).toBe(true);
    expect(rendersSolid('<Button variant={"primary"} />')).toBe(true);
    // …including the CONDITIONAL form, which is how two of the six producers
    // actually looked (`variant={commitAction ? 'primary' : 'outline'}`).
    expect(rendersSolid("<Button variant={ok ? 'primary' : 'outline'} />")).toBe(true);
  });

  it('does NOT fire on the register that replaced it', () => {
    expect(rendersSolid('<Button variant="outline">Award</Button>')).toBe(false);
    expect(rendersSolid('<Button variant="secondary">Cancel</Button>')).toBe(false);
    // …nor on PROSE that merely names it, which is what several files now
    // contain instead of the thing itself. This is the false accusation the
    // gate made on its own first run, pinned so the strip cannot be dropped.
    expect(rendersSolid('// the variant="primary" scan came back incomplete')).toBe(false);
    expect(rendersSolid('/* variant="primary" was here and is gone */')).toBe(false);
  });

  it('⚠️ BLANKING NEVER JOINS TWO FRAGMENTS — what the raw-text pre-filter rests on', () => {
    // `rendersSolid` skips the parse when the RAW source lacks `primary`. That
    // is sound only if stripping cannot CREATE the token. Asserted on the exact
    // shape that would break it, and on the twin that shows the check is real:
    // under `'delete'` the first line below yields `primary`, under `'space'`
    // it cannot. If this ever goes red, the pre-filter is unsound and must go,
    // not the assertion.
    expect(withoutProse('const pri/* x */mary = 1;')).not.toContain('primary');
    expect(withoutProse('const primary = 1;')).toContain('primary');
  });

  it('⚠️ AND THE POPULATION IS NON-EMPTY — an empty scan reports clean either way', () => {
    // `EMPTY-INPUT-REPORTS-CLEAN-01`: a right answer from an instrument that
    // examined nothing looks exactly like a right answer. Membership, not a
    // count — the file list grows, and a count would rot.
    const files = shippedTsx(SRC).map((f) => relative(SRC, f).replace(/\\/g, '/'));
    expect(files).toContain('pages-v2/BuyerRequisitions.tsx');
    expect(files).toContain('pages-v2/SupplierWhatsApp.tsx');
    expect(files).toContain('components/ui-v2/BulkActionsBar.tsx');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// UI-1d (operator ruling, 10 October 2026) · SOLID IS BACK FOR ONE THING: THE
// PAGE'S MAIN ACTION, ONE PER PAGE.
//
// The describe that stood here was named
//   '§68 · nothing in the portal renders a solid action-blue button'
// and its first spec asserted
//   expect(offenders).toEqual([])        // no shipped .tsx uses variant="primary"
// with, beside it, on `Button.tsx`:
//   expect(btn).not.toMatch(/'primary'/);
// Both are retired by the ruling and quoted rather than deleted in silence. What
// §68 retired — solid as the mark of an irreversible commit, anywhere one stood,
// by a prop or a model flag — stays retired, and the specs below still hold it.
//
// What a solid button may now be, and all it may be:
//   · the primary slot of a page header (`BulkActionsBar`), or
//   · ONE button written in a ROUTED PAGE's own file (the router's imports are
//     the population — a drawer, a wizard, a dialog and a widget are not pages).
// A page has at most one: its own, or the header slot's, never both.
// ────────────────────────────────────────────────────────────────────────────

const SOLID_SITE = /variant\s*=\s*(["']primary["']|\{[^}]*['"]primary['"][^}]*\})|buttonClass\(\s*['"]primary['"]/g;

/** How many solid buttons this source writes. */
const solidCount = (source: string): number =>
  QUOTED_PRIMARY.test(source) ? (withoutProse(source).match(SOLID_SITE) ?? []).length : 0;

/** Does this source fill a page header's primary slot? */
const fillsHeaderSlot = (source: string): boolean => {
  const code = withoutProse(source);
  return /<BulkActionsBar\b/.test(code) && /\bprimary\s*[=:]/.test(code);
};

/** The files the router mounts — derived from its imports, static and lazy. */
function routedPages(): string[] {
  const router = readFileSync(join(SRC, 'router/AppRouter.tsx'), 'utf-8');
  const out = new Set<string>();
  for (const m of router.matchAll(/from\s+'\.\.\/(pages(?:-v2)?\/[\w/.-]+)'|import\(\s*'\.\.\/(pages(?:-v2)?\/[\w/.-]+)'\s*\)/g)) {
    out.add(`${m[1] ?? m[2]}.tsx`);
  }
  return [...out];
}

const HEADER_SLOT = 'components/ui-v2/BulkActionsBar.tsx';

describe('UI-1d · the counting matcher, before any claim about the tree', () => {
  it('counts every way a solid button is written', () => {
    expect(solidCount('<Button variant="primary">A</Button>')).toBe(1);
    expect(solidCount('<Button variant="primary">A</Button><Button variant="primary">B</Button>')).toBe(2);
    expect(solidCount("<Link className={buttonClass('primary')} />")).toBe(1);
    expect(solidCount("<Button variant={ok ? 'primary' : 'outline'} />")).toBe(1);
    expect(solidCount('<Button variant="outline">A</Button>')).toBe(0);
    expect(solidCount('// variant="primary" was here')).toBe(0);
  });

  it('knows a header slot when it sees one', () => {
    expect(fillsHeaderSlot('<BulkActionsBar actions={a} primary={{ label }} />')).toBe(true);
    expect(fillsHeaderSlot('<BulkActionsBar {...{ actions: a, primary: { label } }} />')).toBe(true);
    expect(fillsHeaderSlot('<BulkActionsBar actions={a} />')).toBe(false);
    expect(fillsHeaderSlot('const primary = 1;')).toBe(false);
  });

  it('derives the routed pages from the router, and they exist', () => {
    const pages = routedPages();
    expect(pages).toContain('pages-v2/BuyerOrders.tsx');
    expect(pages).toContain('pages/auth/Login.tsx');
    expect(pages).not.toContain('components/ui-v2/BulkActionsBar.tsx');
    for (const p of pages) expect(statSync(join(SRC, p)).isFile(), p).toBe(true);
  });
});

describe('UI-1d · a solid button is a page\'s main action, and a page has one', () => {
  const sites = (): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const f of shippedTsx(SRC)) {
      const n = solidCount(readFileSync(f, 'utf-8'));
      if (n > 0) out[relative(SRC, f).replace(/\\/g, '/')] = n;
    }
    return out;
  };

  it('⚠️ the population is real — the header slot and the login page are both in it', () => {
    const found = sites();
    expect(Object.keys(found)).toContain(HEADER_SLOT);
    expect(Object.keys(found)).toContain('pages/auth/Login.tsx');
  });

  it('⚠️ a solid button stands only in the header slot or in a routed page\'s own file', () => {
    const pages = routedPages();
    const elsewhere = Object.keys(sites()).filter((f) => f !== HEADER_SLOT && !pages.includes(f));
    expect(
      elsewhere,
      'A solid button is the PAGE\'s main action (UI-1d). A drawer, a wizard, a dialog or a ' +
        'widget takes variant="outline" — or tone="critical" for a destructive act.',
    ).toEqual([]);
  });

  it('⚠️ no page has two — its own, or the header slot\'s, never both', () => {
    const found = sites();
    const two: string[] = [];
    for (const [file, n] of Object.entries(found)) {
      if (file === HEADER_SLOT) {
        if (n !== 1) two.push(`${file} writes ${n}`);
        continue;
      }
      if (n > 1) two.push(`${file} writes ${n}`);
      if (fillsHeaderSlot(readFileSync(join(SRC, file), 'utf-8'))) two.push(`${file} writes one AND fills the header slot`);
    }
    expect(two).toEqual([]);
  });

  it('a destructive act is never solid, and solid is never the default', () => {
    const btn = withoutProse(readFileSync(join(SRC, 'components/ui-v2/Button.tsx'), 'utf-8'));
    expect(btn).toMatch(/variant = 'outline'/);
    expect(btn).toMatch(/Variant = 'outline', tone\?: 'critical'/);
    // the critical tone wins over the variant, so `variant="primary" tone="critical"` is an outline
    expect(btn).toMatch(/tone === 'critical' \? CRITICAL_CLASS : VARIANT_CLASS\[variant\]/);
  });

  it('and the producers a literal scan could not see are still gone', async () => {
    // The prop: `BulkActionsBar`'s primary slot took a `solid` OPT-IN. The slot
    // is solid now by rule, not by a flag a caller may forget or abuse.
    const bar = withoutProse(readFileSync(join(SRC, HEADER_SLOT), 'utf-8'));
    expect(bar).not.toMatch(/solid\?:\s*boolean/);
    expect(bar).not.toMatch(/primary\.solid/);

    // The model flag: `invoiceActionModel` marked one verb `solid`, and that
    // flag also drove a confirmation step. It kept the meaning and lost the
    // style name (`reservedCommit`); a commit in a drawer is an outline.
    const model = await import('./invoices/invoiceActionModel');
    const commit = model.invoiceCommitAction('Approved');
    expect(commit).not.toBeNull();
    expect(commit!.reservedCommit).toBe(true);
    expect('solid' in commit!).toBe(false);
  });
});
