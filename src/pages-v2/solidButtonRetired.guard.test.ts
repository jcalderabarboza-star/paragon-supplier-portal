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
const withoutProse = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** The matcher under test: does this source render a solid action-blue button? */
const rendersSolid = (source: string): boolean =>
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

describe('§68 · nothing in the portal renders a solid action-blue button', () => {
  // ⚠️ **THE TYPE IS THE REAL GUARD; THIS IS THE SECOND ONE.** `Button`'s
  // `Variant` union no longer HAS a `'primary'` member, so every route back is
  // a `tsc` failure. That is strictly stronger than a scan — and it is what
  // found the last two producers, both typed `'primary' | 'outline'` helpers
  // that no literal search could see. This test earns its place by covering
  // what a type cannot: a raw string reaching a `className`, and the prop and
  // model flags below.
  it('⚠️ NO shipped .tsx uses variant="primary" — outline is the only register', () => {
    const offenders = shippedTsx(SRC)
      .filter((f) => rendersSolid(readFileSync(f, 'utf-8')))
      .map((f) => relative(SRC, f).replace(/\\/g, '/'));

    expect(
      offenders,
      'DP2-BUTTON-01 was amended at §68: the reserved-solid register is retired ' +
        'portal-wide, messenger chrome included. Use variant="outline". If solid is ' +
        'genuinely wanted again, that is a doctrine change — amend CLAUDE.md and this ' +
        'test together, not one of them.',
    ).toEqual([]);
  });

  it('and the producers a literal scan could not see are gone with it', async () => {
    // The prop: `BulkActionsBar`'s primary slot took a `solid` opt-in and could
    // render solid without the literal appearing at the call site.
    //
    // ⚠️ `withoutProse` AGAIN, AND FOR THE SECOND TIME ON THIS FILE'S FIRST
    // RUNS: the comment that RECORDS the removal names the declaration it
    // removed. Two self-trips in one gate is not a coincidence — a rule stated
    // in the file it governs will always be readable as a violation of itself.
    const bar = withoutProse(readFileSync(join(SRC, 'components/ui-v2/BulkActionsBar.tsx'), 'utf-8'));
    expect(bar).not.toMatch(/solid\?:\s*boolean/);
    expect(bar).not.toMatch(/primary\.solid/);

    // The model flag: `invoiceActionModel` marked one verb `solid`, and that
    // flag also drove a confirmation step. It kept the meaning and lost the
    // style name (`reservedCommit`), so the behaviour is intact and no field
    // named for a rendering survives it.
    // The DEFAULT, and the union member behind it: `Variant` no longer has a
    // `'primary'` arm at all, so `tsc` — not this test — is what refuses the
    // next one. Asserted on the source because a removed type has no runtime.
    const btn = withoutProse(readFileSync(join(SRC, 'components/ui-v2/Button.tsx'), 'utf-8'));
    expect(btn).not.toMatch(/'primary'/);
    expect(btn).toMatch(/variant = 'outline'/);

    const model = await import('./invoices/invoiceActionModel');
    const commit = model.invoiceCommitAction('Approved');
    expect(commit).not.toBeNull();
    expect(commit!.reservedCommit).toBe(true);
    expect('solid' in commit!).toBe(false);
  });
});
