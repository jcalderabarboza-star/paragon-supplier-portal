// ─────────────────────────────────────────────────────────────────────────────
// UI-1a · THE FOUR UI GUARDS (see `derive.ts`).
//
//   1  type scale     — no size or weight outside the scale
//   2  colour tokens  — no colour outside the tokens
//   3  contrast       — every text token clears 4.5:1 on every surface it meets
//   4  list layout    — a routed page that draws a table uses the shared layout
//
// Each matcher is probed BOTH ways before anything is said about the tree, and
// the bad-side probes are spellings this tree really carried on the day the gate
// landed (`PROBE-MUST-FIRE-AT-A-REAL-DEFECT-01`): `text-[10px]` on the provenance
// marker, `#94A3B8` on the login page, the old tertiary on a table header, and
// the Roles page's hand-written table.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  COLOUR_EXEMPT,
  TABLE_PRIMITIVES,
  cellTypeFindings,
  colourFindings,
  contrastRatio,
  derivedCellType,
  derivedColour,
  derivedFieldType,
  derivedRawFields,
  derivedRawHeadings,
  fieldTypeFindings,
  rawFieldCount,
  rawHeadingCount,
  derivedRawTables,
  derivedType,
  mismatches,
  pagesWithoutListLayout,
  rawTableCount,
  routedPages,
  shippedFiles,
  strip,
  typeFindings,
} from './derive';
import {
  COLOUR_GRANDFATHERED,
  LIST_LAYOUT_GRANDFATHERED,
  RAW_TABLE_GRANDFATHERED,
  TYPE_GRANDFATHERED,
} from './grandfathered';

describe('UI gate · population', () => {
  const files = shippedFiles().map((f) => f.file);

  it('reads the shipped source and nothing else (membership, never a count)', () => {
    expect(files).toContain('src/pages-v2/BuyerOrders.tsx');
    expect(files).toContain('src/components/ui-v2/StatusPill.tsx');
    expect(files).toContain('src/index.css');
    expect(files).not.toContain('src/lib/uiGate/uiGate.test.ts');
    expect(files.some((f) => f.startsWith('src/test/'))).toBe(false);
  });

  it('derives the routed pages from the router', () => {
    const pages = routedPages().map((p) => p.file);
    expect(pages).toContain('src/pages-v2/BuyerOrders.tsx');
    // lazy routes are routes too
    expect(pages).toContain('src/pages-v2/PlanGrid.tsx');
    expect(pages).toContain('src/pages/auth/Login.tsx');
    expect(pages).not.toContain('src/pages-v2/roles/CreateRolePanel.tsx');
  });

  it('strips comments, so a rule stated beside the code is not a violation of itself', () => {
    expect(typeFindings(strip('// was text-[10px] font-bold\nconst a = 1;', 'x.tsx'))).toEqual({});
    expect(colourFindings(strip('/* #94A3B8 */ .a { color: var(--x); }', 'x.css'))).toEqual({});
  });
});

describe('UI gate 1 · type scale', () => {
  it('accepts the scale', () => {
    const good =
      '<p className="text-title text-section text-base text-sm text-xs text-meta text-eyebrow text-label text-kpi font-normal font-medium font-semibold hover:text-sm" />';
    expect(typeFindings(good)).toEqual({});
  });

  it('rejects what the tree really carried', () => {
    // ProvenanceMarker, 9 October 2026
    expect(typeFindings('className="text-[10px] font-semibold uppercase"')).toEqual({ 'arbitrary-size': 1 });
    // chart ticks on the analytics page
    expect(typeFindings('tick={{ fontSize: 10 }}')).toEqual({ 'inline-size': 1 });
    // the discovery page's heading
    expect(typeFindings('className="text-lg font-bold md:text-2xl"')).toEqual({ 'offscale-size': 2, bold: 1 });
  });

  it('does not read a colour or a longer name as a size', () => {
    expect(typeFindings('className="text-text-primary text-xs-custom my-text-xl"')).toEqual({});
  });

  it('holds every file to its grandfathered count, both ways', () => {
    expect(mismatches(derivedType(), TYPE_GRANDFATHERED)).toEqual([]);
  });
});

describe('UI gate 2 · colour tokens', () => {
  it('accepts the tokens', () => {
    const good =
      '<a className="text-text-tertiary bg-bg-hover border-border-subtle text-action-text text-teal-text text-warning-hover bg-warning text-critical bg-critical-soft text-sample border-sample-border bg-teal/5 text-white" />';
    expect(colourFindings(good)).toEqual({});
  });

  it('rejects what the tree really carried', () => {
    // the login page, 9 October 2026
    expect(colourFindings("color: '#94A3B8'")).toEqual({ hex: 1 });
    expect(colourFindings("boxShadow: '0 20px 60px rgba(0,0,0,0.4)'")).toEqual({ rgb: 1 });
    // the drawer scrim
    expect(colourFindings('className="bg-[rgba(13,27,42,0.4)]"')).toEqual({ 'arbitrary-colour': 1 });
    expect(colourFindings('className="text-[#1A1A1A]"')).toEqual({ 'arbitrary-colour': 1 });
    // teal and action as TEXT: 3.51:1 and 4.41:1 where they stood
    expect(colourFindings('className="text-meta text-teal hover:underline"')).toEqual({ 'fill-token-as-text': 1 });
    expect(colourFindings('className="text-label text-action/80 truncate"')).toEqual({ 'fill-token-as-text': 1 });
    expect(colourFindings('className="text-warning"')).toEqual({ 'fill-token-as-text': 1 });
  });

  it('rejects a Tailwind default-palette class, of which the tree has none', () => {
    expect(colourFindings('className="text-gray-500 hover:bg-slate-100"')).toEqual({ 'default-palette': 2 });
  });

  it('leaves an icon in the graphic colour, and a PR number alone', () => {
    expect(colourFindings('<Sparkles size={16} className="text-teal" />')).toEqual({});
    expect(colourFindings("const note = 'see #311 and #4190';")).toEqual({});
  });

  it('exempts by name only files that exist', () => {
    const files = shippedFiles().map((f) => f.file);
    for (const exempt of COLOUR_EXEMPT) expect(files).toContain(exempt);
  });

  it('holds every file to its grandfathered count, both ways', () => {
    expect(mismatches(derivedColour(), COLOUR_GRANDFATHERED)).toEqual([]);
  });
});

describe('UI gate 3 · contrast', () => {
  type Scale = string | { [k: string]: string };
  const hex = (colors: Record<string, Scale>, path: string): string => {
    const [name, shade = 'DEFAULT'] = path.split('.');
    const v = colors[name];
    const out = typeof v === 'string' ? v : v?.[shade];
    if (typeof out !== 'string') throw new Error(`no colour token ${path}`);
    return out;
  };
  const load = async (): Promise<Record<string, Scale>> => {
    const url = pathToFileURL(join(process.cwd(), 'tailwind.config.js')).href;
    const mod = (await import(/* @vite-ignore */ url)) as { default: { theme: { extend: { colors: Record<string, Scale> } } } };
    return mod.default.theme.extend.colors;
  };

  /** Every surface a text token is laid on. */
  const SURFACES = [
    'bg-surface',
    'bg-page',
    'bg-hover',
    'action.soft',
    'teal.soft',
    'success.soft',
    'warning.soft',
    'critical.soft',
    'info.soft',
    'sample.soft',
  ];
  const NEUTRAL_SURFACES = ['bg-surface', 'bg-page', 'bg-hover'];
  /** Text tokens that may sit on ANY surface. */
  const TEXT_ANYWHERE = [
    'text-primary',
    'text-secondary',
    'text-tertiary',
    'data-navy',
    'action.text',
    'teal.text',
    'warning.hover',
    'critical',
    'info',
    'sample',
  ];
  /** `success` is 4.26:1 on the critical tint, so it is held to its own. */
  const TEXT_ON_OWN_TINT: [string, string][] = [['success', 'success.soft']];
  /** Solid fills that carry white text. */
  const WHITE_ON = ['action', 'action.muted', 'teal.hover', 'navy', 'success', 'critical', 'info'];
  /** Fills that are NOT text colours — each must fail, or the split is not needed. */
  const NOT_TEXT = ['teal', 'warning'];

  it('measures the way WCAG does', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    // the value `text-tertiary` held until UI-1a, on a table header
    expect(contrastRatio('#6B7785', '#F4F6F8')).toBeLessThan(4.5);
  });

  it('names real tokens', async () => {
    const colors = await load();
    for (const t of [...SURFACES, ...TEXT_ANYWHERE, ...WHITE_ON, ...NOT_TEXT, 'success']) expect(hex(colors, t)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(() => hex(colors, 'danger')).toThrow();
  });

  it('every text token clears 4.5:1 on every surface it meets', async () => {
    const colors = await load();
    const failing: string[] = [];
    const check = (fg: string, bg: string): void => {
      const r = contrastRatio(hex(colors, fg), hex(colors, bg));
      if (r < 4.5) failing.push(`${fg} on ${bg} = ${r.toFixed(2)}`);
    };
    for (const fg of TEXT_ANYWHERE) for (const bg of SURFACES) check(fg, bg);
    for (const [fg, own] of TEXT_ON_OWN_TINT) for (const bg of [...NEUTRAL_SURFACES, own]) check(fg, bg);
    for (const bg of WHITE_ON) {
      const r = contrastRatio('#FFFFFF', hex(colors, bg));
      if (r < 4.5) failing.push(`white on ${bg} = ${r.toFixed(2)}`);
    }
    expect(failing).toEqual([]);
  });

  it('the fills really are not text colours', async () => {
    const colors = await load();
    for (const fill of NOT_TEXT) expect(contrastRatio(hex(colors, fill), '#FFFFFF')).toBeLessThan(4.5);
    // …and `action` is one too, the moment it leaves pure white
    expect(contrastRatio(hex(colors, 'action'), hex(colors, 'bg-page'))).toBeLessThan(4.5);
  });
});

describe('UI gate 4 · list layout', () => {
  it('reads table markup, and not the shared primitives', () => {
    expect(rawTableCount('<table className="w-full"><thead><tr><th scope="col">A</th></tr></thead></table>')).toBe(3);
    expect(rawTableCount('<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} /><tbody />')).toBe(0);
    const files = shippedFiles().map((f) => f.file);
    for (const primitive of TABLE_PRIMITIVES) expect(files).toContain(primitive);
  });

  it('fires at the Roles page as it stood, and passes the same page once it uses the layout', () => {
    const roles = shippedFiles().find((f) => f.file === 'src/pages-v2/RolesCatalogue.tsx');
    expect(roles).toBeDefined();
    const before = { file: roles!.file, text: '<div><table><thead /></table></div>' };
    const after = { file: roles!.file, text: '<ListPage title="Roles"><DataTable columns={columns} rows={rows} /></ListPage>' };
    const others = shippedFiles().filter((f) => f.file !== roles!.file);
    expect(pagesWithoutListLayout([...others, before])).toContain(roles!.file);
    expect(pagesWithoutListLayout([...others, after])).not.toContain(roles!.file);
  });

  it('a page with no table is not a list page', () => {
    expect(pagesWithoutListLayout()).not.toContain('src/pages-v2/BuyerChase.tsx');
  });

  it('holds the pages still to migrate to the grandfather list, both ways', () => {
    expect(pagesWithoutListLayout()).toEqual([...LIST_LAYOUT_GRANDFATHERED]);
  });

  it('holds hand-written table markup to its grandfathered count, both ways', () => {
    const asCounts = (m: Record<string, number>): Record<string, { 'raw-table': number }> =>
      Object.fromEntries(Object.entries(m).map(([f, n]) => [f, { 'raw-table': n }]));
    expect(mismatches(asCounts(derivedRawTables()), asCounts(RAW_TABLE_GRANDFATHERED))).toEqual([]);
  });
});

describe('UI gate 5 · a cell does not dress itself', () => {
  const col = (cell: string, extra = ''): string => `const columns = [{ id: 'supplier', header: 'Supplier', kind: 'text', ${extra} cell: (r) => ${cell} }];`;

  it('accepts a cell that leaves its type to the kind', () => {
    expect(cellTypeFindings(col('<div className="truncate max-w-xs">{r.name}</div>'))).toEqual([]);
    // a state colour says something about the row; a link colour says it is a link
    expect(cellTypeFindings(col('<span className="text-critical">{r.due}</span>'))).toEqual([]);
    expect(cellTypeFindings(col('<Link to="/x" className="text-action-text hover:underline">{r.id}</Link>'))).toEqual([]);
    // the shared second line and the shared chip own their type
    expect(cellTypeFindings(col('<><Data>{r.id}</Data><CellSub className="text-critical">{r.note}</CellSub><StatusPill variant="neutral" className="font-medium">{r.s}</StatusPill></>'))).toEqual([]);
    // a form control in a cell is a control
    expect(cellTypeFindings(col('<input className="text-sm font-sans" />'))).toEqual([]);
  });

  it('rejects what the lists really carried', () => {
    // supplier discovery: the material name, semibold where every other list is regular
    expect(cellTypeFindings(col('<div className="font-semibold text-text-primary">{r.name}</div>'))).toEqual([
      'supplier · font-semibold',
      'supplier · text-text-primary',
    ]);
    // purchase orders: a second line dressed by hand
    expect(cellTypeFindings(col('<Data as="div" className="text-xs text-text-tertiary mt-0.5">{r.pr}</Data>'))).toEqual([
      'supplier · text-xs',
      'supplier · text-text-tertiary',
    ]);
    // delivery overview: a contract number at its own size
    expect(cellTypeFindings(col('<span className="font-mono text-[11px] uppercase tracking-wide">{r.c}</span>'))).toEqual([
      'supplier · font-mono',
      'supplier · text-[11px]',
      'supplier · uppercase',
      'supplier · tracking-wide',
    ]);
    // …and a type class on the column itself
    expect(cellTypeFindings(col('r.name', "className: 'font-medium w-40',"))).toEqual(['supplier · font-medium']);
  });

  it('reads only column definitions', () => {
    expect(cellTypeFindings('const x = <div className="font-semibold text-sm">a</div>;')).toEqual([]);
    expect(cellTypeFindings("const o = { kind: 'banner', cell: () => <b className=\"font-bold\" /> };")).toEqual([]);
  });

  it('no cell in the tree dresses itself', () => {
    expect(derivedCellType()).toEqual({});
  });
});

describe('UI gate 6 · fields and headings', () => {
  it('reads a hand-written field and a hand-written heading, and not the shared ones', () => {
    expect(rawFieldCount('<dl className="grid"><div><dt className="text-text-tertiary">A</dt><dd>1</dd></div></dl>')).toBe(3);
    expect(rawFieldCount('<FieldList><Field label="A">1</Field></FieldList>')).toBe(0);
    expect(rawHeadingCount('<h2 className="text-lg font-semibold">A</h2><h3>B</h3><h4>C</h4>')).toBe(3);
    // the page title is `PageHeader`'s, and is not a section heading
    expect(rawHeadingCount('<h1>Title</h1><SectionHeading>A</SectionHeading><SectionHeading level="group">B</SectionHeading>')).toBe(0);
  });

  it('accepts a field that leaves its type to the kind', () => {
    expect(fieldTypeFindings('<Field label="Supplier" kind="text"><span className="truncate">{name}</span></Field>')).toEqual([]);
    expect(fieldTypeFindings('<Field label="Due" kind="date"><span className="text-critical">{due}</span></Field>')).toEqual([]);
    expect(fieldTypeFindings('<Field label="Status" kind="status"><StatusPill variant="info" className="font-medium">Open</StatusPill></Field>')).toEqual([]);
    expect(fieldTypeFindings('<SectionHeading className="mb-3 flex items-center gap-2">Line items</SectionHeading>')).toEqual([]);
  });

  it('rejects what the drawers really carried', () => {
    // purchase orders drawer: the total, semibold where the order date was medium
    expect(fieldTypeFindings('<Field label="Total"><Data className="text-text-primary font-semibold">{v}</Data></Field>')).toEqual([
      'Field · text-text-primary',
      'Field · font-semibold',
    ]);
    // a label dressed by hand
    expect(fieldTypeFindings('<Field label={<span className="uppercase text-[11px]">Qty</span>}>{q}</Field>')).toEqual([
      'Field · uppercase',
      'Field · text-[11px]',
    ]);
    // a heading resized
    expect(fieldTypeFindings('<SectionHeading className="text-lg font-bold">A</SectionHeading>')).toEqual([
      'SectionHeading · text-lg',
      'SectionHeading · font-bold',
    ]);
  });

  it('no detail field in the tree is written by hand', () => {
    expect(derivedRawFields()).toEqual({});
  });

  it('no heading under a page title is written by hand', () => {
    expect(derivedRawHeadings()).toEqual({});
  });

  it('`Field` names the shared detail field only — no page defines its own', () => {
    // A page-local `Field` hid a detail helper from this gate once (the listing
    // card). A form helper is `FormField` until the form components replace it.
    const local = shippedFiles()
      .filter((f) => f.file.endsWith('.tsx') && f.file !== 'src/components/ui-v2/Field.tsx')
      .filter((f) => /(?:const|function)\s+Field[^A-Za-z]/.test(f.text))
      .map((f) => f.file);
    expect(local).toEqual([]);
  });

  it('no field or heading in the tree dresses itself', () => {
    expect(derivedFieldType()).toEqual({});
  });
});

describe('UI gate · the lists name live files', () => {
  it('no row outlives its file', () => {
    const files = new Set(shippedFiles().map((f) => f.file));
    const listed = [
      ...Object.keys(TYPE_GRANDFATHERED),
      ...Object.keys(COLOUR_GRANDFATHERED),
      ...Object.keys(RAW_TABLE_GRANDFATHERED),
      ...LIST_LAYOUT_GRANDFATHERED,
    ];
    expect(listed.filter((f) => !files.has(f))).toEqual([]);
    // the lists are read from disk, not from a cache of this module
    expect(readFileSync(join(process.cwd(), 'src', 'lib', 'uiGate', 'grandfathered.ts'), 'utf-8')).toContain('TYPE_GRANDFATHERED');
  });
});
