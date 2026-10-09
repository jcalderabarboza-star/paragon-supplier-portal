// ─────────────────────────────────────────────────────────────────────────────
// UI-1a · THE UI GATE — one type scale, one colour system, one list layout.
//
// Three source derivations over SHIPPED source (specs excluded, comments
// stripped) and one piece of arithmetic over the tokens themselves:
//
//   typeFindings    a size or weight spelled outside the scale
//   colourFindings  a colour spelled outside the tokens
//   listFindings    a routed page that draws a table without the shared layout
//   contrastRatio   WCAG 2.x contrast, so the token pairs are measured rather
//                   than asserted
//
// The scale, spelled with the names the tree already uses (UI-1 audit, accepted
// 9 October 2026): `text-title` 30 · `text-section` / `text-base` 16 ·
// `text-sm` 14 (body, table) · `text-xs` / `text-meta` / `text-eyebrow` 12
// (caption, label) · `text-label` 11 (caps) · `text-kpi` 36. Weights 400 / 500 /
// 600. Nothing under 11px.
//
// What predates the gate is counted per file and kind in `grandfathered.ts`,
// and the counts are held EQUAL: a file that gains one is a new violation, and a
// file that sheds one must hand its row back. The lists can only shrink.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { stripSourceComments } from '../sourceScan/stripComments';

export const SRC_ROOT = join(process.cwd(), 'src');

export interface ShippedFile {
  /** Repo-relative, forward slashes: `src/pages-v2/BuyerOrders.tsx`. */
  file: string;
  /** Comments removed. */
  text: string;
}

const isShipped = (name: string): boolean =>
  /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts');

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      // `src/test` holds spec helpers, not product.
      if (p !== join(SRC_ROOT, 'test')) walk(p, out);
    } else if (isShipped(name)) out.push(p);
  }
}

/** CSS has one comment form and no string that can hold it in this tree: a scan, not a regex. */
function stripCss(text: string): string {
  let out = '';
  let at = 0;
  for (;;) {
    const open = text.indexOf('/*', at);
    if (open === -1) return out + text.slice(at);
    const close = text.indexOf('*/', open + 2);
    out += text.slice(at, open);
    if (close === -1) return out;
    at = close + 2;
  }
}

export function strip(text: string, file: string): string {
  return file.endsWith('.css') ? stripCss(text) : stripSourceComments(text, 'delete', file);
}

let cache: ShippedFile[] | null = null;
export function shippedFiles(): ShippedFile[] {
  if (cache) return cache;
  const paths: string[] = [];
  walk(SRC_ROOT, paths);
  cache = paths.sort().map((p) => {
    const file = relative(process.cwd(), p).split(sep).join('/');
    return { file, text: strip(readFileSync(p, 'utf-8'), file) };
  });
  return cache;
}

// ── type ─────────────────────────────────────────────────────────────────────
export type TypeKind = 'arbitrary-size' | 'inline-size' | 'offscale-size' | 'bold';

/** A class token: not preceded by a word character or a hyphen, variants allowed. */
const B = String.raw`(?<![\w-])(?:[a-z0-9-]+:)*`;
const E = String.raw`(?![\w-])`;

const TYPE_MATCHERS: Record<TypeKind, RegExp> = {
  'arbitrary-size': new RegExp(B + String.raw`text-\[\d+(?:\.\d+)?(?:px|rem|em)\]`, 'g'),
  'inline-size': /\bfontSize\s*[:=]/g,
  'offscale-size': new RegExp(B + String.raw`text-(?:lg|xl|[2-9]xl)` + E, 'g'),
  bold: new RegExp(B + String.raw`font-(?:bold|extrabold|black)` + E, 'g'),
};

export type Counts<K extends string> = Partial<Record<K, number>>;

function countKinds<K extends string>(text: string, matchers: Record<K, RegExp>): Counts<K> {
  const out: Counts<K> = {};
  for (const kind of Object.keys(matchers) as K[]) {
    const n = (text.match(matchers[kind]) ?? []).length;
    if (n > 0) out[kind] = n;
  }
  return out;
}

export const typeFindings = (text: string): Counts<TypeKind> => countKinds(text, TYPE_MATCHERS);

// ── colour ───────────────────────────────────────────────────────────────────
export type ColourKind = 'hex' | 'rgb' | 'arbitrary-colour' | 'default-palette' | 'fill-token-as-text';

const UTIL = String.raw`(?:text|bg|border|ring|fill|stroke|divide|outline|from|to|via|decoration|accent|caret|shadow)(?:-[trblxy])?`;
const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

const ARBITRARY_COLOUR = new RegExp(UTIL + String.raw`-\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^\]]*\))\]`, 'g');
/** Six or eight hex digits, or three when at least one is a letter (`#311` is a PR). */
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|(?=[0-9a-fA-F]{0,2}[a-fA-F])[0-9a-fA-F]{3})(?![0-9a-zA-Z])/g;
const RGB = /\brgba?\(\s*\d/g;
const DEFAULT_PALETTE = new RegExp(B + UTIL + String.raw`-(?:` + PALETTE + String.raw`)-\d{2,3}(?:\/\d+)?` + E, 'g');
/**
 * `teal`, `action` and `warning` are FILLS: as text they are 3.51, 4.41 (on the
 * page) and 3.19 to 1. Text takes `teal-text`, `action-text`, `warning-hover`.
 * An icon is a graphic, so a line that sizes one is not counted.
 */
const FILL_AS_TEXT = new RegExp(B + String.raw`text-(?:teal|action|warning)(?:\/\d+)?` + E, 'g');
const ICON_LINE = /size=\{|iconClass/;

export function colourFindings(text: string): Counts<ColourKind> {
  const out: Counts<ColourKind> = {};
  const add = (kind: ColourKind, n: number): void => {
    if (n > 0) out[kind] = (out[kind] ?? 0) + n;
  };
  const arbitrary = text.match(ARBITRARY_COLOUR) ?? [];
  add('arbitrary-colour', arbitrary.length);
  // An arbitrary class is one finding, not two: take it out before the literal scans.
  const rest = text.replace(ARBITRARY_COLOUR, '');
  add('hex', (rest.match(HEX) ?? []).length);
  add('rgb', (rest.match(RGB) ?? []).length);
  add('default-palette', (text.match(DEFAULT_PALETTE) ?? []).length);
  for (const line of text.split('\n')) {
    if (!ICON_LINE.test(line)) add('fill-token-as-text', (line.match(FILL_AS_TEXT) ?? []).length);
  }
  return out;
}

/**
 * Where a colour literal is the point. `chartPalette.ts` is the one place chart
 * colours are spelled (its own guard holds it); the channel demo imitates an
 * external messenger's chrome on purpose (operator ruling, 9 October 2026).
 */
export const COLOUR_EXEMPT: readonly string[] = ['src/lib/chartPalette.ts', 'src/pages-v2/SupplierWhatsApp.tsx'];

// ── list layout ──────────────────────────────────────────────────────────────
/** The shared table primitives themselves are the one place a `<table>` is written. */
export const TABLE_PRIMITIVES: readonly string[] = [
  'src/components/ui-v2/Table.tsx',
  'src/components/ui-v2/TableHeader.tsx',
  'src/components/ui-v2/TableRow.tsx',
  'src/components/ui-v2/TableCell.tsx',
];

// `<tbody>` is not counted: the primitives have no body element, so every page
// that uses them writes one. `DataTable` (UI-1b) is what absorbs it.
const RAW_TABLE = /<(?:table|thead|th|td)[\s>]/g;
export const rawTableCount = (text: string): number => (text.match(RAW_TABLE) ?? []).length;

/** Page component → repo-relative file, DERIVED from the router's imports. */
export function routedPages(): { component: string; file: string }[] {
  const router = strip(readFileSync(join(SRC_ROOT, 'router', 'AppRouter.tsx'), 'utf-8'), 'AppRouter.tsx');
  const found = [
    ...router.matchAll(/import\s+(\w+)\s+from\s+'\.\.\/(pages[^']+)'/g),
    ...router.matchAll(/const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\('\.\.\/(pages[^']+)'\)/g),
  ];
  return found
    .map((m) => ({ component: m[1], file: `src/${m[2]}.tsx` }))
    .filter((p) => new RegExp(`<${p.component}[\\s/>]`).test(router))
    .sort((a, b) => a.file.localeCompare(b.file));
}

const DRAWS_TABLE = /<(?:Table|table)[\s>]/;
const USES_LIST_LAYOUT = /<(?:ListPage|DataTable)[\s/>]/;

/** A routed page whose own file draws a table and does not use the shared layout. */
export function pagesWithoutListLayout(files: readonly ShippedFile[] = shippedFiles()): string[] {
  const byFile = new Map(files.map((f) => [f.file, f.text]));
  return routedPages()
    .map((p) => p.file)
    .filter((file) => {
      const text = byFile.get(file) ?? '';
      return DRAWS_TABLE.test(text) && !USES_LIST_LAYOUT.test(text);
    });
}

// ── contrast ─────────────────────────────────────────────────────────────────
const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export function luminance(hex: string): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) throw new Error(`luminance: not a six-digit hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ── the derived maps the grandfather lists are held against ──────────────────
function byFile<K extends string>(
  findings: (text: string) => Counts<K>,
  skip: readonly string[],
): Record<string, Counts<K>> {
  const out: Record<string, Counts<K>> = {};
  for (const f of shippedFiles()) {
    if (skip.includes(f.file)) continue;
    const found = findings(f.text);
    if (Object.keys(found).length > 0) out[f.file] = found;
  }
  return out;
}

export const derivedType = (): Record<string, Counts<TypeKind>> => byFile(typeFindings, []);
export const derivedColour = (): Record<string, Counts<ColourKind>> => byFile(colourFindings, COLOUR_EXEMPT);

export function derivedRawTables(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of shippedFiles()) {
    if (!f.file.endsWith('.tsx') || TABLE_PRIMITIVES.includes(f.file)) continue;
    const n = rawTableCount(f.text);
    if (n > 0) out[f.file] = n;
  }
  return out;
}

/** Rows that differ between a derived map and its grandfather list, both ways. */
export function mismatches<K extends string>(
  derived: Record<string, Counts<K>>,
  listed: Record<string, Counts<K>>,
): string[] {
  const out: string[] = [];
  for (const file of [...new Set([...Object.keys(derived), ...Object.keys(listed)])].sort()) {
    const d = derived[file] ?? {};
    const l = listed[file] ?? {};
    for (const kind of [...new Set([...Object.keys(d), ...Object.keys(l)])].sort() as K[]) {
      const dn = d[kind] ?? 0;
      const ln = l[kind] ?? 0;
      if (dn > ln) out.push(`${file} · ${kind}: ${dn} found, ${ln} grandfathered — NEW, use the scale / the tokens`);
      if (dn < ln) out.push(`${file} · ${kind}: ${dn} found, ${ln} grandfathered — shrink the row to ${dn}`);
    }
  }
  return out;
}
