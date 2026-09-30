// ────────────────────────────────────────────────────────────────────────────
// B4b-2 · THE NUMBER-CONVENTION GATE (operator ruling 1): a plain number
// renders in the SEAT's convention — EN "6,000", ID "6.000" — and it does so
// because it goes through `formatNumber`, the ONE place that asks the seat.
//
// The population is DERIVED, never listed by hand: every `new Intl.NumberFormat`
// and every `.toLocaleString(` call in shipped source, found by walking the
// TypeScript AST (so prose in a comment can never be a site, and no regex
// strips a comment). Each site outside `format.ts` must be on the list below
// with its reason — money has its own convention, a date is not a number — and
// the list is BILATERAL: an entry that no longer matches a site is red too, so
// the list can only shrink truthfully.
//
// What the ruling moved is pinned in both locales, and the walker is fired at a
// known-bad source (a raw `toLocaleString('id-ID')` on a quantity) that it must
// find, beside a known-good one it must not.
// ────────────────────────────────────────────────────────────────────────────

import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { describe, it, expect, afterEach } from 'vitest';
import i18n from './i18n';
import { formatNumber } from './format';

const SRC = path.resolve(__dirname, '..');
const rel = (f: string) => path.relative(path.resolve(SRC, '..'), f).split(path.sep).join('/');

/** Every number-formatting call in one source text: `path::callText`. */
export function formattingSites(file: string, text: string): string[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isNewExpression(n) && n.expression.getText(sf) === 'Intl.NumberFormat') out.push(n.getText(sf).replace(/\s+/g, ' '));
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.expression.name.text === 'toLocaleString'
    ) {
      out.push(n.getText(sf).replace(/\s+/g, ' '));
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

function shippedFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...shippedFiles(p));
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

const SITES: readonly string[] = shippedFiles(SRC).flatMap((f) =>
  formattingSites(f, fs.readFileSync(f, 'utf8')).map((c) => `${rel(f)}::${c}`),
);

/** The formatter itself — the one place a plain number is allowed to be formatted. */
const FORMATTER = 'src/lib/format.ts';

/**
 * Every OTHER site, with why it is not a plain number in the seat's convention.
 * ⚠️ BILATERAL: a key that matches no site fails, so a migrated site must leave.
 */
const ADAPTIVE_MONEY =
  "MONEY — AdaptiveContext's per-currency amount: each currency states its own locale (ruling 1 is about plain numbers).";
const NOT_A_PLAIN_NUMBER: Readonly<Record<string, string>> = {
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('id-ID')": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  // `'en-US'` is TWO sites in AdaptiveContext (USD and the default currency) and
  // ONE key here: the list is keyed by what the call IS, and both are money.
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('en-US', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('en-SG', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('ja-JP')": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  "src/context/AdaptiveContext.tsx::amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })": ADAPTIVE_MONEY,
  "src/pages-v2/BuyerContracts.tsx::new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, })":
    'MONEY — a local rupiah formatter (style: currency); a duplicate of formatIDR, reported as a finding.',
  "src/pages-v2/contracts/contractView.tsx::new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, })":
    'MONEY — the same local rupiah formatter as BuyerContracts; a duplicate of formatIDR, reported as a finding.',
  'src/pages-v2/SupplierDashboard.tsx::v.toLocaleString()':
    'MONEY — `Rp ${v.toLocaleString()}`: runtime-locale grouping on a rupiah amount, reported as a finding.',
  "src/pages-v2/SupplierInvoices.tsx::n.toLocaleString('id-ID')":
    "MONEY — fmtIDRFull, 'Rp ' + id-ID grouping: the rupiah's own convention, as formatIDR.",
  'src/pages-v2/SupplierOrders.tsx::v.toLocaleString()':
    'MONEY — `Rp ${v.toLocaleString()}`: runtime-locale grouping on a rupiah amount, reported as a finding.',
  "src/pages-v2/SupplierWhatsApp.tsx::new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', })":
    "A DATE, not a number — the messenger chrome's timestamp.",
};

describe('the population is derived, and it is not empty', () => {
  it('CONTROL: the walker sees the formatter and a known money site', () => {
    expect(SITES.some((s) => s.startsWith(`${FORMATTER}::`))).toBe(true);
    expect(SITES.some((s) => s.startsWith('src/context/AdaptiveContext.tsx::'))).toBe(true);
  });

  it('CONTROL: a site this batch migrated is GONE from the population', () => {
    expect(SITES.filter((s) => s.startsWith('src/pages-v2/SupplierShipments.tsx::'))).toEqual([]);
    expect(SITES.filter((s) => s.startsWith('src/components/v2-features/GRInspectionWizard.tsx::'))).toEqual([]);
  });
});

describe('every number-formatting site outside the formatter is accounted for — both ways', () => {
  const outside = SITES.filter((s) => !s.startsWith(`${FORMATTER}::`));

  it('no site formats a number without a stated reason (a quantity must go through formatNumber)', () => {
    expect(outside.filter((s) => !(s in NOT_A_PLAIN_NUMBER))).toEqual([]);
  });

  it('no entry outlives its site (the list only shrinks truthfully)', () => {
    expect(Object.keys(NOT_A_PLAIN_NUMBER).filter((k) => !outside.includes(k))).toEqual([]);
  });

  it('every entry states its reason', () => {
    expect(Object.entries(NOT_A_PLAIN_NUMBER).filter(([, why]) => why.trim().length < 10).map(([k]) => k)).toEqual([]);
  });
});

describe('the walker, fired both ways at a synthetic source', () => {
  it('KNOWN-BAD: a raw id-ID quantity and a runtime-locale one are FOUND', () => {
    const bad = "const a = (n: number) => n.toLocaleString('id-ID');\nconst b = new Intl.NumberFormat('id-ID').format(3);\nexport { a, b };";
    expect(formattingSites('bad.ts', bad)).toEqual(["n.toLocaleString('id-ID')", "new Intl.NumberFormat('id-ID')"]);
  });

  it('KNOWN-GOOD: formatNumber, and the words in a comment, are NOT sites', () => {
    const good = "// n.toLocaleString('id-ID') was retired\nimport { formatNumber } from './format';\nexport const a = (n: number) => formatNumber(n);";
    expect(formattingSites('good.ts', good)).toEqual([]);
  });
});

describe('formatNumber follows the SEAT (operator ruling 1) — pinned in both locales', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('EN: comma groups, point decimal', async () => {
    await i18n.changeLanguage('en');
    expect([formatNumber(6000), formatNumber(1234.5), formatNumber(10000000), formatNumber(0)]).toEqual([
      '6,000',
      '1,234.5',
      '10,000,000',
      '0',
    ]);
  });

  it('ID: point groups, comma decimal', async () => {
    await i18n.changeLanguage('id');
    expect([formatNumber(6000), formatNumber(1234.5), formatNumber(10000000), formatNumber(0)]).toEqual([
      '6.000',
      '1.234,5',
      '10.000.000',
      '0',
    ]);
  });

  it('an absence is a dash in both, never a zero', async () => {
    for (const lng of ['en', 'id']) {
      await i18n.changeLanguage(lng);
      expect([formatNumber(null), formatNumber(undefined), formatNumber(Number.NaN)]).toEqual(['—', '—', '—']);
    }
  });
});
