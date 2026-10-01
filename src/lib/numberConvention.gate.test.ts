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

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { describe, it, expect, afterEach, vi } from 'vitest';
import i18n from './i18n';
import { formatIDR, formatNumber } from './format';

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
  "MONEY — AdaptiveContext's per-currency amount for a NON-rupiah currency: each states its own locale (ruling 1 is about plain numbers; the rupiah case goes through formatIDR, below).";
const NOT_A_PLAIN_NUMBER: Readonly<Record<string, string>> = {
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

  it('CONTROL (E1): the four repointed money pages format no number of their own', () => {
    for (const f of ['src/pages-v2/BuyerContracts.tsx', 'src/pages-v2/contracts/contractView.tsx', 'src/pages-v2/SupplierDashboard.tsx', 'src/pages-v2/SupplierOrders.tsx']) {
      expect(SITES.filter((s) => s.startsWith(`${f}::`)), f).toEqual([]);
    }
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

// ────────────────────────────────────────────────────────────────────────────
// E1 · MONEY — ONE RUPIAH FORMATTER, RENDERING IDENTICALLY ON EVERY MACHINE.
//
// The plain-number rule above sends a quantity through `formatNumber`. This is
// the money half: a rupiah AMOUNT goes through `formatIDR`, and `formatIDR`
// asks neither the machine's locale nor its ICU data (it groups by hand).
//
// The population is derived the same way — the AST, never a regex over text: a
// template literal or `+` whose static text carries `Rp` in front of a computed
// part, a JSX element whose text says `Rp` beside an expression, and an
// `Intl.NumberFormat` asked for `currency: 'IDR'`. Each site outside
// `format.ts` must be on the list below with its reason, BILATERALLY.
//
// The walker is fired at the real defect it exists for — `SupplierOrders`'
// retired `fmtIDR`, read out of git at `dda8079`, whose last branch was
// `Rp ${v.toLocaleString()}`: the machine's own convention on a rupiah amount.
// ────────────────────────────────────────────────────────────────────────────

/** Every rupiah rendering in one source text: its normalised source. */
export function rupiahSites(file: string, text: string): string[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const RP = /\bRp\b/;
  const out: string[] = [];
  const norm = (n: ts.Node) => n.getText(sf).replace(/\s+/g, ' ');
  const visit = (n: ts.Node) => {
    if (ts.isTemplateExpression(n) && RP.test([n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' '))) out.push(norm(n));
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken && ts.isStringLiteral(n.left) && RP.test(n.left.text)) out.push(norm(n));
    if (ts.isJsxElement(n) && n.children.some((c) => ts.isJsxText(c) && RP.test(c.text)) && n.children.some(ts.isJsxExpression)) out.push(norm(n));
    if (ts.isNewExpression(n) && n.expression.getText(sf) === 'Intl.NumberFormat' && /currency:\s*['"]IDR['"]/.test(n.getText(sf))) out.push(norm(n));
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const RUPIAH_SITES: readonly string[] = shippedFiles(SRC).flatMap((f) =>
  rupiahSites(f, fs.readFileSync(f, 'utf8')).map((c) => `${rel(f)}::${c}`),
);

/**
 * Every rupiah rendering OUTSIDE the formatter, with why it is not an amount
 * that `formatIDR` can take. ⚠️ BILATERAL: a key that matches no site fails.
 */
const JUTA_SERIES =
  'NOT AN AMOUNT — a chart series already scaled to juta (millions) in its own data; formatIDR takes rupiah, not juta.';
const RUPIAH_NOT_AN_AMOUNT: Readonly<Record<string, string>> = {
  'src/pages-v2/BuyerAnalytics.tsx::<div className="text-text-secondary mt-0.5"> Rp {p.value}jT ({pct}%) </div>': JUTA_SERIES,
  'src/pages-v2/BuyerInvoices.tsx::<div key={p.name} style={{ color: p.color }}> {p.name}: Rp {p.value} {suffix} </div>': JUTA_SERIES,
  "src/pages-v2/BuyerInvoices.tsx::`Rp ${row.amount}jT`": JUTA_SERIES,
  'src/pages-v2/BuyerSupplierProfile.tsx::<Data>Rp {m.unitPrice}</Data>':
    'NOT A NUMBER — the storefront catalogue stores `unitPrice` as an authored STRING; there is no amount to format.',
};

describe('money — every rupiah rendering goes through formatIDR, both ways', () => {
  const outside = RUPIAH_SITES.filter((s) => !s.startsWith(`${FORMATTER}::`));

  it('CONTROL: the walker sees the formatter itself, and a listed juta series', () => {
    expect(RUPIAH_SITES.some((s) => s.startsWith(`${FORMATTER}::`))).toBe(true);
    expect(RUPIAH_SITES).toContain("src/pages-v2/BuyerInvoices.tsx::`Rp ${row.amount}jT`");
  });

  it('no rupiah amount is rendered outside formatIDR', () => {
    expect(outside.filter((s) => !(s in RUPIAH_NOT_AN_AMOUNT))).toEqual([]);
  });

  it('no money entry outlives its site', () => {
    expect(Object.keys(RUPIAH_NOT_AN_AMOUNT).filter((k) => !outside.includes(k))).toEqual([]);
  });

  it('KNOWN-BAD (the real defect): SupplierOrders’ retired fmtIDR at dda8079 is FOUND, every branch by name', () => {
    const retired = execFileSync('git', ['show', 'dda8079:src/pages-v2/SupplierOrders.tsx'], {
      cwd: path.resolve(SRC, '..'),
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    expect(rupiahSites('SupplierOrders.tsx', retired)).toEqual([
      '`Rp ${(v / 1_000_000_000).toFixed(1)}M`',
      '`Rp ${Math.round(v / 1_000_000)}jT`',
      '`Rp ${v.toLocaleString()}`',
    ]);
  });

  it('KNOWN-BAD: a concatenation, a JSX amount and an IDR currency formatter are FOUND', () => {
    const bad = [
      "const a = (n: number) => 'Rp ' + n;",
      'const b = (n: number) => <span>Rp {n}</span>;',
      "const c = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });",
    ].join('\n');
    expect(rupiahSites('bad.tsx', bad)).toEqual([
      "'Rp ' + n",
      '<span>Rp {n}</span>',
      "new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })",
    ]);
  });

  it('KNOWN-GOOD: formatIDR, a static "Rp" label and the word in a comment are NOT sites', () => {
    const good = [
      '// `Rp ${v.toLocaleString()}` was retired',
      "import { formatIDR } from './format';",
      'const a = (n: number) => formatIDR(n);',
      'const b = <th>Rp</th>;',
      "const c = 'Rp';",
    ].join('\n');
    expect(rupiahSites('good.tsx', good)).toEqual([]);
  });
});

describe('formatIDR renders identically on every machine — pinned in both locales', () => {
  const realNumberFormat = Intl.NumberFormat;
  const realToLocale = Number.prototype.toLocaleString;

  afterEach(async () => {
    Intl.NumberFormat = realNumberFormat;
    Number.prototype.toLocaleString = realToLocale;
    await i18n.changeLanguage('en');
  });

  /** A machine whose number formatting is foreign: every locale prints en-US, as a runtime without full ICU does. */
  const foreignMachine = () => {
    const enUS = new realNumberFormat('en-US');
    Intl.NumberFormat = function ForeignNumberFormat() {
      return enUS;
    } as unknown as typeof Intl.NumberFormat;
    Number.prototype.toLocaleString = function toLocaleString(this: number) {
      return enUS.format(this);
    };
  };

  const AMOUNTS = [1_250_000_000, 185_000_000, 4_500, 1234.5, 0, -2_000_000] as const;

  it('EN and ID: dot groups, comma decimal, the same on this machine and on a foreign one', async () => {
    for (const lng of ['en', 'id']) {
      await i18n.changeLanguage(lng);
      const expected = ['Rp 1.250.000.000', 'Rp 185.000.000', 'Rp 4.500', 'Rp 1.234,5', 'Rp 0', 'Rp -2.000.000'];
      expect(AMOUNTS.map((v) => formatIDR(v)), lng).toEqual(expected);
    }
  });

  // ⚠️ THE FOREIGN MACHINE MUST BE IN PLACE WHEN `format.ts` LOADS, not after.
  // A formatter built once at module scope (`const idID = new Intl.NumberFormat
  // ('id-ID')`) is fixed at load; stubbing `Intl` afterwards cannot move it, and
  // the first version of this pin passed against exactly that revert (E1 probe
  // P2b). So the module is loaded FRESH under the stub.
  it('on a foreign machine, a freshly loaded formatIDR prints the same rupiah', async () => {
    foreignMachine();
    vi.resetModules();
    const fresh = await import('./format');
    expect(AMOUNTS.map((v) => fresh.formatIDR(v))).toEqual(['Rp 1.250.000.000', 'Rp 185.000.000', 'Rp 4.500', 'Rp 1.234,5', 'Rp 0', 'Rp -2.000.000']);
  });

  it('CONTROL: the same fresh load DOES move a number built from Intl at module scope', async () => {
    foreignMachine();
    vi.resetModules();
    const fresh = await import('./format');
    const freshI18n = (await import('./i18n')).default;
    // formatNumber's id-ID formatter is built at load, so on this machine it groups the foreign way.
    await freshI18n.changeLanguage('id');
    expect(fresh.formatNumber(1_250_000)).toBe('1,250,000');
    await freshI18n.changeLanguage('en');
  });

  it('CONTROL: the foreign machine really is foreign — the same stub moves a formatter that asks Intl', () => {
    foreignMachine();
    expect(new Intl.NumberFormat('id-ID').format(1_250_000_000)).toBe('1,250,000,000');
  });

  it('compact: only the billion tier names a locale (EN "B", ID "M")', async () => {
    await i18n.changeLanguage('en');
    expect([formatIDR(1_250_000_000, { compact: true }), formatIDR(185_000_000, { compact: true }), formatIDR(4_500, { compact: true })]).toEqual([
      'Rp 1.3B',
      'Rp 185.0jt',
      'Rp 4.5rb',
    ]);
    await i18n.changeLanguage('id');
    expect(formatIDR(1_250_000_000, { compact: true })).toBe('Rp 1.3M');
  });
});
