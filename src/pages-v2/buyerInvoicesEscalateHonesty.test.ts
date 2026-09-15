// @vitest-environment node
// -----------------------------------------------------------------------------
// ⚠️ THE OVERDUE FOOTER ACTION CLAIMS NO ACT IT DOES NOT PERFORM.
//
// The branch dispatches nothing, mutates nothing and sends nothing. Its copy
// used to read *"{{invoiceNumber}} escalated"* / *"Routed to Finance Controller
// for urgent action."* — a statement that an escalation HAD HAPPENED and had
// been routed to a named role. Nothing in the tree routes it: there is no
// Communication Hub lane, and building one is an operator ruling rather than
// this branch's business. So the surface now says the act is UNAVAILABLE and
// that NOTHING WAS ROUTED, and this file is what stops the old claim returning.
//
// ⚠️ **COMMENTS ARE STRIPPED BEFORE THE SOURCE IS READ, AND THAT IS LOAD-BEARING
// HERE RATHER THAN CEREMONIAL.** The repair QUOTES the old copy into a comment
// at the site, so that a reader meets the reason beside the code. An unstripped
// read would find "escalated" and "Routed to" in that comment and convict the
// very fix that removed them — #348's rule (*a comment can no longer acquit a
// handler*) arriving from the opposite direction: here a comment could CONVICT
// one. The stripper is length-preserving so byte offsets and line numbers hold.
//
// ⚠️ **THE VERDICT COMES FROM THE SHIPPED BUNDLE, NOT FROM THE FRAGMENT FILE.**
// `resources` is what a reader actually sees, in BOTH locales. A fragment-file
// regex would pass on a key that never reaches the bundle.
//
// ⚠️ **WHY THE TOAST-HONESTY GUARD DOES NOT COVER THIS** (reported, not fixed
// here): `toastHonesty.guard.test.tsx` acquits a handler whose BODY contains any
// `set[A-Z]\w*(` call, and `handleFooterAction`'s EARLIER branches call
// `setPanelMode('confirming')` and `setPanelMode('remittance')`. The population
// unit is the handler BODY; the claim is made by a BRANCH. One setter in one
// branch acquits every other branch of the same handler.
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resources } from '../lib/i18n';

const SRC = join(process.cwd(), 'src', 'pages-v2', 'BuyerInvoices.tsx');

/** Length-preserving comment blank — line numbers and offsets survive. */
const blanks = (m: string): string => m.replace(/[^\n]/g, ' ');
const codeOnly = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, blanks)
    .replace(/(^|[^:])(\/\/[^\n]*)/g, (_m, p1: string, c: string) => p1 + blanks(c));

/**
 * The `Overdue` branch of `handleFooterAction`, comments removed.
 *
 * ⚠️ **SLICED BY BRACE BALANCE, NOT BY A CHARACTER WINDOW, AND THE FIRST DRAFT
 * WAS THE OTHER WAY.** `codeOnly` is length-preserving by design, so the
 * ten-line reason comment at the site becomes ~400 columns of SPACES that sit
 * between the `if` and the `toast(` it guards. A fixed window swallowed the
 * blanks and stopped short of the subject, and the population control caught it
 * — the window is a sampling instrument, and a slice that misses its subject
 * reports on the slice (heuristic rule 3). Balance cannot drift when the
 * comment grows.
 */
function overdueBranch(): string {
  const code = codeOnly(readFileSync(SRC, 'utf8'));
  const start = code.indexOf("if (selected.status === 'Overdue')");
  if (start < 0) return '';
  const open = code.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    const c = code[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  return '';
}

const EN = (resources.en.translation ?? {}) as Record<string, string>;
const ID = (resources.id.translation ?? {}) as Record<string, string>;
const TITLE = 'buyerInvoices.toast.escalate.title';
const DESC = 'buyerInvoices.toast.escalate.desc';

/** The exact strings the repair removed. Absence is the assertion. */
const RETIRED = [
  '{{invoiceNumber}} escalated',
  'Routed to Finance Controller for urgent action.',
  '{{invoiceNumber}} dieskalasi',
  'Diteruskan ke Pengawas Keuangan untuk tindakan mendesak.',
] as const;

describe('⚠️ POPULATION CONTROLS — the subject exists before anything is claimed about it', () => {
  it('the Overdue branch is found in the source (an empty read cannot pass the specs below)', () => {
    const b = overdueBranch();
    expect(b.length).toBeGreaterThan(80);
    expect(b).toContain('toast(');
  });

  it('both locales resolve both keys to non-empty strings', () => {
    for (const [name, bundle] of [['en', EN], ['id', ID]] as const) {
      expect(bundle[TITLE], `${name}:${TITLE}`).toBeTruthy();
      expect(bundle[DESC], `${name}:${DESC}`).toBeTruthy();
    }
  });
});

describe('⚠️ THE OVERDUE BRANCH CLAIMS NO ACT — copy', () => {
  it('no retired claim string survives in either locale', () => {
    const shipped = [EN[TITLE], EN[DESC], ID[TITLE], ID[DESC]].join(' \u0000 ');
    for (const r of RETIRED) expect(shipped).not.toContain(r);
  });

  it('EN admits that nothing happened — the act is named as unavailable', () => {
    expect(EN[TITLE]).toMatch(/not available yet/i);
    expect(EN[DESC]).toMatch(/nothing was routed/i);
  });

  it('ID admits it too, in Indonesian rather than by echoing the English', () => {
    expect(ID[TITLE]).toMatch(/belum tersedia/i);
    expect(ID[DESC]).toMatch(/tidak ada yang diteruskan/i);
  });

  it('⚠️ the two locales are not the same bytes — a copy-paste would pass the pair above', () => {
    expect(ID[TITLE]).not.toBe(EN[TITLE]);
    expect(ID[DESC]).not.toBe(EN[DESC]);
  });
});

describe('⚠️ THE OVERDUE BRANCH CLAIMS NO ACT — variant', () => {
  it('renders `info`, the register its honest sibling uses', () => {
    expect(overdueBranch()).toContain("variant: 'info'");
  });

  it('⚠️ and NOT a success or warning register — success would restate defect #4', () => {
    const b = overdueBranch();
    expect(b).not.toContain("variant: 'success'");
    expect(b).not.toContain("variant: 'warning'");
  });
});
