// ────────────────────────────────────────────────────────────────────────────
// THE SENTENCE-STOP GATE — two halves, because the population has two homes.
//
// The rule (`lib/nameStop.ts`): EVERY interpolation immediately followed by a
// full stop carries the `stop` formatter, so a value that ends in its own stop
// ("Sample Vitamins Co.") never renders two. Unconditional — see that module
// for why the alternative is a per-site judgement that rots.
//
// ── ⚠️ WHY TWO HALVES, AND WHY ONE ALONE IS REFUSED ────────────────────────
//   The defect was FIRST found in an i18n toast (`psl.toast.proposed`), so an
//   i18n-only gate is the obvious build — and it would have read GREEN over a
//   tree that still carried `BuyerOrders.tsx:208`, a template literal outside
//   the i18n layer entirely, interpolating `po.supplierName` before a stop.
//   A gate that cannot see half its own population is not a weaker gate, it is
//   a gate that reports on its own matcher (derivation rule 1).
//
// ── ⚠️ HALF 2 IS AIMED AT A DEFECT THE TREE REALLY CARRIED ─────────────────
//   `PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`: a synthetic subject agrees with the
//   matcher by construction, because the seat that aimed it also built the
//   target. Half 2's classifier was run against **main's bytes before the fix**
//   and reported exactly three COPY sites — all three in `BuyerOrders.tsx`,
//   including `:208` — and fifteen KEY sites, with nothing unclassified, across
//   150 files. That run is the evidence the matcher points at the right thing;
//   the assertions below are what keep it pointing there.
//
// ── ⚠️ AND HALF 1 DOES NOT PARSE KEY/VALUE PAIRS, DELIBERATELY ─────────────
//   The scope derivation that found this defect used a `'key': 'value'` parser
//   and MISSED `widget.honesty.sessionStampNote`, whose value is a multi-line
//   continuation — a one-occurrence blind spot that cost nothing then and would
//   be inherited here for free. This half never needs to find a string boundary
//   at all: it scans raw source for `{{…}}` followed by `.`, so a value spanning
//   lines, or concatenated, is seen exactly like any other. The multi-line site
//   is asserted BY NAME below so the immunity is measured, not claimed.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import i18n from '../i18n';
import { NAME_STOP_FORMAT, stopName } from '../nameStop';

const SRC = join(process.cwd(), 'src');
const I18N_DIR = join(SRC, 'lib', 'i18n');
const I18N_ROOT = join(SRC, 'lib', 'i18n.ts');

const rel = (p: string) => relative(process.cwd(), p).replace(/\\/g, '/');

/** Every i18n SOURCE — the fragment directory plus the central map. Tests are
 *  excluded; this gate is about shipped copy, not about specs that quote it. */
function i18nSources(): string[] {
  const frags = readdirSync(I18N_DIR)
    .filter((n) => n.endsWith('.ts') && !n.includes('.test.'))
    .map((n) => join(I18N_DIR, n));
  return [...frags, I18N_ROOT];
}

/** `{{ x }}` whose very next character is `.` — bare, i.e. carrying no format. */
const BARE_BEFORE_STOP = /\{\{ ?[A-Za-z_][A-Za-z0-9_]* ?\}\}(?=\.)/g;
/** the same position, already carrying the `stop` format */
const STOPPED_BEFORE_STOP = new RegExp(
  `\\{\\{ ?[A-Za-z_][A-Za-z0-9_]* ?, ?${NAME_STOP_FORMAT} ?\\}\\}(?=\\.)`,
  'g',
);

interface Occurrence {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function scan(source: string, file: string, re: RegExp): Occurrence[] {
  const out: Occurrence[] = [];
  for (const m of source.matchAll(new RegExp(re.source, 'g'))) {
    out.push({
      file,
      line: source.slice(0, m.index ?? 0).split('\n').length,
      text: m[0],
    });
  }
  return out;
}

const I18N_FILES = i18nSources();
const I18N_TEXT = new Map(I18N_FILES.map((f) => [f, readFileSync(f, 'utf-8')]));

const bare = I18N_FILES.flatMap((f) => scan(I18N_TEXT.get(f)!, rel(f), BARE_BEFORE_STOP));
const stopped = I18N_FILES.flatMap((f) => scan(I18N_TEXT.get(f)!, rel(f), STOPPED_BEFORE_STOP));

describe('name-stop gate · half 1 — the i18n layer', () => {
  // ⚠️ ANTI-VACUITY FIRST, AND IT ASSERTS A NAMED MEMBER RATHER THAN A COUNT.
  // `EMPTY-INPUT-REPORTS-CLEAN-01`: a gate over an empty population reports a
  // clean result for the same reason a gate over a healthy one does. A count
  // would be satisfied by the wrong matches, so the control names a string.
  it('examined a real population — files read and a NAMED member present', () => {
    expect(I18N_FILES.length).toBeGreaterThan(40);
    const all = [...I18N_TEXT.values()].join('\n');
    expect(all).toContain('psl.toast.proposed');
    expect(all).toContain('supplierShipments.list.filteredBy');
    expect(stopped.length).toBeGreaterThan(90);
  });

  it('no interpolation sits bare immediately before a full stop', () => {
    expect(bare.map((o) => `${o.file}:${o.line} ${o.text}`)).toEqual([]);
  });

  // ── known-TRUE control, IN BOTH LOCALES ──────────────────────────────────
  // The reported defect. EN and ID are asserted separately because they are
  // separate strings that can rot separately — `sdcSup.empty.subtitle` is the
  // proof: EN never had the defect and ID did.
  it('known-TRUE · psl.toast.proposed carries the format in EN and in ID', () => {
    const psl = I18N_TEXT.get(join(I18N_DIR, 'psl.ts'))!;
    const en = "'psl.toast.proposed': 'Listing {{id}} raised for {{supplier, stop}}. It is waiting on a decision.',";
    const id = "'psl.toast.proposed': 'Pencatatan {{id}} diajukan untuk {{supplier, stop}}. Menunggu keputusan.',";
    expect(psl).toContain(en);
    expect(psl).toContain(id);
  });

  it('known-TRUE · the ID-only site carries it, and its EN twin needs nothing', () => {
    // `sdcSup.empty.subtitle` is why a remedy read off EN copy is not enough:
    // EN puts a word between the name and the stop, ID does not.
    const sdc = I18N_TEXT.get(join(I18N_DIR, 'sdcSupplier.ts'))!;
    expect(sdc).toContain("'Belum ada yang diterbitkan ke {{supplier, stop}}.'");
    expect(sdc).toContain("'Nothing has been published to {{supplier}} yet.'");
  });

  // ── the multi-line probe ────────────────────────────────────────────────
  // The site the scope-run parser missed. If this half ever regresses to
  // parsing key/value pairs, this is the assertion that goes red.
  it('multi-line · widget.honesty.sessionStampNote is in the population, both locales', () => {
    const widget = I18N_TEXT.get(join(I18N_DIR, 'widget.ts'))!;
    const hits = [...widget.matchAll(STOPPED_BEFORE_STOP)];
    expect(hits.length).toBe(2);
    expect(widget).toContain('widget.honesty.sessionStampNote');
    // the value really is a continuation line, which is what made it invisible
    expect(widget).toMatch(/'widget\.honesty\.sessionStampNote':\s*\n\s*'/);
  });

  // ── known-FALSE control ─────────────────────────────────────────────────
  it('known-FALSE · an interpolation NOT followed by a stop is left alone', () => {
    const ship = I18N_TEXT.get(join(I18N_DIR, 'supplierShipments.ts'))!;
    const line = ship
      .split('\n')
      .find((l) => l.includes('supplierShipments.list.filteredBy'))!;
    expect(line).toBeDefined();
    expect(line).not.toContain(`, ${NAME_STOP_FORMAT}`);
    expect(bare.some((o) => o.text.includes('filteredBy'))).toBe(false);
  });
});

// ── the behaviour, not only the spelling ───────────────────────────────────
// The gate above proves the strings carry the format. This proves the format
// is REGISTERED and DOES something — i18next resolves an unknown specifier by
// returning the value unformatted, so a failed registration would leave every
// assertion above green and the reader still looking at "Ltd..".
describe('name-stop gate · the formatter is live, not merely spelled', () => {
  it('renders ONE stop for a name that ends in its own', () => {
    const out = i18n.t('psl.toast.proposed', {
      id: 'psl-015',
      supplier: 'Sample Salicylics & Niacinamide Ltd.',
    });
    expect(out).toBe(
      'Listing psl-015 raised for Sample Salicylics & Niacinamide Ltd. It is waiting on a decision.',
    );
    expect(out).not.toContain('Ltd..');
  });

  it('leaves a name that does not end in a stop untouched', () => {
    const out = i18n.t('psl.toast.proposed', {
      id: 'psl-001',
      supplier: 'PT Sample Oleochemicals',
    });
    expect(out).toContain('for PT Sample Oleochemicals. It is waiting');
  });

  it('keeps an interior abbreviation stop — only the trailing one goes', () => {
    expect(stopName('Sample Aromatics Sdn. Bhd.')).toBe('Sample Aromatics Sdn. Bhd');
    expect(stopName('Sample Vitamins Co.')).toBe('Sample Vitamins Co');
    expect(stopName('PT Sample Oleochemicals')).toBe('PT Sample Oleochemicals');
    expect(stopName('2026-09-24')).toBe('2026-09-24');
    expect(stopName(0)).toBe('0');
    expect(stopName(undefined)).toBe('');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// HALF 2 — RENDERED TEMPLATE LITERALS, OUTSIDE THE i18n LAYER
//
// A template literal in a page is EITHER reader copy OR key construction, and
// the two want opposite treatment: copy must not print two stops, and a key
// must not be altered at all (`t('identity.supplier.title')` is not a sentence).
// The discriminator is DERIVED from the introducing token rather than guessed
// from the variable's name — a name-based matcher is the one derivation rule 2
// names as producing false accusations, and `${arm}` / `${g.id}` / `${k}` would
// have been accused by it.
// ────────────────────────────────────────────────────────────────────────────

/** Directories that render. Services and build-time gates are not reader copy. */
const RENDER_DIRS = [join(SRC, 'pages-v2'), join(SRC, 'components')];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p) && !p.includes('.test.')) out.push(p);
  }
  return out;
}

/** The token that introduces a KEY rather than a sentence. Each one is present
 *  in the tree and was read off the sites, not invented. */
const KEY_INTRO = /(?:\bt\(|\bkey=\{|\bdata-testid=\{|\bclassName=\{|\bid=\{|\bonJump\()\s*$/;
const TEMPLATE = /`(?:[^`\\]|\\.)*`/gs;
const INTERP_BEFORE_STOP = /\$\{[^{}]*\}(?=\.)/g;

interface TemplateSite extends Occurrence {
  readonly kind: 'COPY' | 'KEY';
  readonly guarded: boolean;
}

function templateSites(): TemplateSite[] {
  const out: TemplateSite[] = [];
  for (const dir of RENDER_DIRS) {
    for (const f of walk(dir)) {
      const src = readFileSync(f, 'utf-8');
      for (const lit of src.matchAll(TEMPLATE)) {
        const body = lit[0];
        const hits = [...body.matchAll(INTERP_BEFORE_STOP)];
        if (hits.length === 0) continue;
        const start = lit.index ?? 0;
        const before = src.slice(Math.max(0, start - 60), start);
        const kind = KEY_INTRO.test(before) ? 'KEY' : 'COPY';
        for (const h of hits) {
          out.push({
            file: rel(f),
            line: src.slice(0, start).split('\n').length,
            text: h[0],
            kind,
            guarded: h[0].includes('stopName('),
          });
        }
      }
    }
  }
  return out;
}

const SITES = templateSites();

describe('name-stop gate · half 2 — rendered template literals', () => {
  it('examined a real population — render files walked, both kinds present', () => {
    const files = RENDER_DIRS.flatMap(walk);
    expect(files.length).toBeGreaterThan(100);
    expect(SITES.some((s) => s.kind === 'KEY')).toBe(true);
    expect(SITES.some((s) => s.kind === 'COPY')).toBe(true);
  });

  // ⚠️ THE ASSERTION THE WHOLE HALF EXISTS FOR. Run against main's bytes this
  // matcher reported `BuyerOrders.tsx:208` as unguarded COPY — the defect the
  // tree really had, which is what makes the matcher's aim evidence rather
  // than self-agreement.
  it('every rendered interpolation before a stop is guarded', () => {
    const unguarded = SITES.filter((s) => s.kind === 'COPY' && !s.guarded);
    expect(unguarded.map((s) => `${s.file}:${s.line} ${s.text}`)).toEqual([]);
  });

  it('known-TRUE · BuyerOrders still carries the site this gate was aimed at', () => {
    const bo = SITES.filter((s) => s.file.endsWith('BuyerOrders.tsx') && s.kind === 'COPY');
    expect(bo.length).toBe(3);
    expect(bo.every((s) => s.guarded)).toBe(true);
    const src = readFileSync(join(SRC, 'pages-v2', 'BuyerOrders.tsx'), 'utf-8');
    expect(src).toContain('${stopName(po.supplierName)}.');
  });

  // ⚠️ known-FALSE, AND IT IS THE HALF THAT KEEPS THE GATE FROM OVER-REACHING.
  // A key is not a sentence. If the classifier ever starts calling these COPY,
  // the gate would demand `stopName` inside `t('identity.${arm}.title')` and
  // corrupt the lookup — so the exclusion is asserted, not assumed.
  it('known-FALSE · key construction is excluded and left untouched', () => {
    const keys = SITES.filter((s) => s.kind === 'KEY');
    expect(keys.length).toBeGreaterThan(10);
    expect(keys.every((s) => !s.guarded)).toBe(true);
    const noId = readFileSync(join(SRC, 'components/ui-v2/NoSupplierIdentity.tsx'), 'utf-8');
    expect(noId).toContain('t(`identity.${arm}.title`)');
    expect(noId).not.toContain('stopName');
  });
});
