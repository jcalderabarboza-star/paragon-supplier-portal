// ────────────────────────────────────────────────────────────────────────────
// G1 · THE GUIDE BUILD — `docs/guides/**.md` → `src/guides/generated/guides.json`
// (Design 5 §B.1, decisions D6 and D8).
//
// The guides are MARKDOWN because their editors are not engineers; the JSON is
// what the app and the co-pilot read. This script is the only thing that turns
// one into the other, and it runs FIRST in `npm run build`, so a bundle can
// never ship a JSON older than the prose beside it. `guides.test.ts` compares
// the committed JSON with a fresh parse as well, so a stale file is red in the
// suite even where nobody runs the build.
//
// ⚠️ **WHAT THIS REFUSES, AND WHAT IT DELIBERATELY DOES NOT.** It refuses a
// guide it cannot PARSE — no front matter, an unknown key, a section marker
// missing or out of order, a transition block whose heading and marker
// disagree, a block missing a field or its source note, a step kind it cannot
// classify, a test-data row with the wrong number of cells. It does NOT refuse
// a guide that parses but is WRONG about the tree — a transition the registry
// lacks, a duplicated block, a trigger event naming another verb, a fixture id
// that does not resolve. Those are the bilateral gates in `guides.test.ts`, and
// they need the registry, the stores and the router, which a build script must
// not import. So a duplicated block is carried into `stepOrder` verbatim rather
// than collapsed, precisely so the gate can see it.
//
// Usage:  node scripts/guides/build.mjs            write the JSON
//         node scripts/guides/build.mjs --check    exit 1 if the JSON is stale
//         node scripts/guides/build.mjs --src <dir> --out <file>
// ────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DEFAULT_SRC = join(REPO_ROOT, 'docs', 'guides');
export const DEFAULT_OUT = join(REPO_ROOT, 'src', 'guides', 'generated', 'guides.json');

/** The nine sections, in the order every guide must carry them (README §Sections). */
export const SECTION_KEYS = Object.freeze([
  'summary', 'lifecycle', 'steps', 'forks', 'flags', 'linked', 'history', 'troubleshooting', 'testdata',
]);

export const STEP_KINDS = Object.freeze([
  'operator-action', 'system-driven', 'cascade', 'external-fact', 'records-fact', 'not-active', 'modelled-not-active',
]);

export const OWNERS = Object.freeze(['portal', 's4hana', 'tms', 'bank', 'substrate']);
export const LOCALES = Object.freeze(['en', 'id']);

/** The per-transition bullet labels, per locale. The KEY is what the parser keys on; the label is prose. */
const FIELD_LABELS = {
  en: {
    stepKind: 'Step kind', role: 'Role', fromTo: 'From → to',
    where: 'Operator — where', do: 'Operator — do', fill: 'Operator — fill',
    expectedState: 'Tester — expected state', confirm: 'Tester — confirm', triggerEvent: 'Tester — trigger event',
    checks: 'Checks that can refuse', glossary: 'Glossary', honesty: 'Honesty',
  },
  id: {
    stepKind: 'Jenis langkah', role: 'Peran', fromTo: 'Dari → ke',
    where: 'Operator — di mana', do: 'Operator — lakukan', fill: 'Operator — isi',
    expectedState: 'Penguji — status yang diharapkan', confirm: 'Penguji — konfirmasi', triggerEvent: 'Penguji — peristiwa pemicu',
    checks: 'Pemeriksaan yang dapat menolak', glossary: 'Glosarium', honesty: 'Kejujuran',
  },
};

/**
 * The step-kind phrases, per locale. `modelled, not active` wins wherever it
 * appears (it qualifies whatever precedes it); otherwise the phrase that occurs
 * EARLIEST in the line decides, because the line leads with what the step is
 * and qualifies after (`operator action; cascade source`).
 */
const STEP_KIND_PHRASES = {
  en: [
    ['operator action', 'operator-action'], ['system-driven', 'system-driven'], ['cascade', 'cascade'],
    ['external fact', 'external-fact'], ['records a fact', 'records-fact'], ['not active', 'not-active'],
  ],
  id: [
    ['tindakan operator', 'operator-action'], ['digerakkan sistem', 'system-driven'], ['kaskade', 'cascade'],
    ['fakta eksternal', 'external-fact'], ['mencatat fakta', 'records-fact'], ['tidak aktif', 'not-active'],
  ],
};
const MODELLED = { en: 'modelled, not active', id: 'dimodelkan, tidak aktif' };

export class GuideBuildError extends Error {
  /** @param {string} code  @param {string} file  @param {string} message */
  constructor(code, file, message) {
    super(`${file}: ${code}: ${message}`);
    this.name = 'GuideBuildError';
    this.code = code;
    this.file = file;
  }
}

const SRC_NOTE = /^<!--\s*src:\s*(.*?)\s*-->$/;
const SECTION_MARKER = /^<!--\s*section:([a-z]+)\s*-->$/;
const BLOCK_HEADING = /^###\s+(\S+)\s+—\s+(.+?)\s*<!--\s*transition:(\S+)\s*-->\s*$/;
const TICKED = /`([^`]+)`/g;

const ticked = (s) => [...s.matchAll(TICKED)].map((m) => m[1]);
const splitSources = (s) => s.split(';').map((x) => x.trim()).filter(Boolean);

/** Strict front matter: the seven README keys, nothing else, nothing missing. */
function parseFrontMatter(lines, file) {
  if (lines[0] !== '---') throw new GuideBuildError('NO_FRONT_MATTER', file, 'the file must open with `---`');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new GuideBuildError('NO_FRONT_MATTER', file, 'the front matter is never closed with `---`');
  const fm = {};
  let list = null;
  for (const raw of lines.slice(1, end)) {
    if (raw.trim() === '' || /^\s*#/.test(raw)) continue;
    const item = /^\s+-\s+(\S+)\s*(?:#.*)?$/.exec(raw);
    if (item) {
      if (!list) throw new GuideBuildError('FRONT_MATTER_SYNTAX', file, `a list item outside a list: "${raw}"`);
      list.push(item[1]);
      continue;
    }
    const kv = /^([a-z_]+):\s*(.*?)\s*(?:#.*)?$/.exec(raw);
    if (!kv) throw new GuideBuildError('FRONT_MATTER_SYNTAX', file, `cannot read "${raw}"`);
    const [, key, value] = kv;
    if (key in fm) throw new GuideBuildError('FRONT_MATTER_SYNTAX', file, `\`${key}\` appears twice`);
    if (value === '') {
      list = [];
      fm[key] = list;
    } else {
      list = null;
      fm[key] = value;
    }
  }
  const required = ['entity', 'locale', 'title', 'wired', 'owner', 'source_sha', 'transitions'];
  for (const k of Object.keys(fm)) {
    if (!required.includes(k)) throw new GuideBuildError('FRONT_MATTER_UNKNOWN_KEY', file, `\`${k}\` is not a guide key`);
  }
  for (const k of required) {
    if (!(k in fm)) throw new GuideBuildError('FRONT_MATTER_MISSING_KEY', file, `\`${k}\` is required`);
  }
  if (!Array.isArray(fm.transitions) || fm.transitions.length === 0) {
    throw new GuideBuildError('FRONT_MATTER_SYNTAX', file, '`transitions` must be a non-empty list');
  }
  if (!LOCALES.includes(fm.locale)) throw new GuideBuildError('FRONT_MATTER_VALUE', file, `locale \`${fm.locale}\``);
  if (fm.wired !== 'true' && fm.wired !== 'false') throw new GuideBuildError('FRONT_MATTER_VALUE', file, `wired \`${fm.wired}\``);
  if (!OWNERS.includes(fm.owner)) throw new GuideBuildError('FRONT_MATTER_VALUE', file, `owner \`${fm.owner}\``);
  if (!/^[0-9a-f]{40}$/.test(fm.source_sha)) {
    throw new GuideBuildError('FRONT_MATTER_VALUE', file, `source_sha must be a 40-hex commit id, got \`${fm.source_sha}\``);
  }
  return { fm, bodyStart: end + 1 };
}

/** Split the body on the nine markers; each must appear once, in order. */
function splitSections(lines, file) {
  const found = [];
  lines.forEach((l, i) => {
    const m = SECTION_MARKER.exec(l.trim());
    if (m) found.push({ key: m[1], at: i });
  });
  const keys = found.map((f) => f.key);
  if (keys.join(',') !== SECTION_KEYS.join(',')) {
    throw new GuideBuildError(
      'SECTION_MARKERS',
      file,
      `expected the markers ${SECTION_KEYS.join(' · ')} once each in that order, found ${keys.join(' · ') || 'none'}`,
    );
  }
  const out = {};
  found.forEach((f, n) => {
    const stop = n + 1 < found.length ? found[n + 1].at : lines.length;
    let body = lines.slice(f.at + 1, stop);
    const head = body.findIndex((l) => l.trim() !== '');
    if (head < 0 || !/^##\s/.test(body[head])) {
      throw new GuideBuildError('SECTION_HEADING', file, `section \`${f.key}\` must open with a \`## \` heading`);
    }
    out[f.key] = body.slice(head + 1);
  });
  return out;
}

/** Section prose for rendering: the `<!-- src -->` notes are lifted out, never rendered. */
function proseOf(lines) {
  const sources = [];
  const kept = [];
  for (const l of lines) {
    const m = SRC_NOTE.exec(l.trim());
    if (m) sources.push(...splitSources(m[1]));
    else kept.push(l);
  }
  return { text: kept.join('\n').trim(), sources };
}

function classifyStepKind(text, locale, file, id) {
  const lower = text.toLowerCase();
  if (lower.includes(MODELLED[locale])) return 'modelled-not-active';
  let best = null;
  for (const [phrase, kind] of STEP_KIND_PHRASES[locale]) {
    const at = lower.indexOf(phrase);
    if (at >= 0 && (best === null || at < best.at)) best = { at, kind };
  }
  if (!best) throw new GuideBuildError('STEP_KIND', file, `\`${id}\`: cannot classify the step kind "${text}"`);
  return best.kind;
}

/** One `### <id> — <label> <!-- transition:<id> -->` block. */
function parseBlock(lines, locale, file) {
  const m = BLOCK_HEADING.exec(lines[0]);
  if (!m) throw new GuideBuildError('BLOCK_HEADING', file, `cannot read the block heading "${lines[0]}"`);
  const [, headingId, label, markerId] = m;
  if (headingId !== markerId) {
    throw new GuideBuildError('BLOCK_HEADING', file, `heading names \`${headingId}\` but its marker names \`${markerId}\``);
  }
  const labels = FIELD_LABELS[locale];
  const byLabel = new Map(Object.entries(labels).map(([k, v]) => [v, k]));
  const fields = {};
  let current = null;
  let sources = null;
  for (const raw of lines.slice(1)) {
    const src = SRC_NOTE.exec(raw.trim());
    if (src) {
      sources = splitSources(src[1]);
      current = null;
      continue;
    }
    const f = /^- \*\*(.+?):\*\*\s*(.*)$/.exec(raw);
    if (f && byLabel.has(f[1])) {
      const key = byLabel.get(f[1]);
      if (key in fields) throw new GuideBuildError('BLOCK_FIELD', file, `\`${markerId}\`: "${f[1]}" appears twice`);
      fields[key] = f[2];
      current = key;
      continue;
    }
    if (f) throw new GuideBuildError('BLOCK_FIELD', file, `\`${markerId}\`: "${f[1]}" is not a ${locale} step field`);
    if (current && raw.trim() !== '') fields[current] += `\n${raw}`;
  }
  for (const [key, text] of Object.entries(labels)) {
    if (!(key in fields)) throw new GuideBuildError('BLOCK_FIELD', file, `\`${markerId}\`: missing "${text}"`);
  }
  if (!sources || sources.length === 0) {
    throw new GuideBuildError('BLOCK_SOURCE', file, `\`${markerId}\`: every block ends with a \`<!-- src: … -->\` note`);
  }
  const trigger = ticked(fields.triggerEvent)[0];
  if (!trigger) throw new GuideBuildError('BLOCK_FIELD', file, `\`${markerId}\`: the trigger event names no \`transition id\``);
  return {
    transitionId: markerId,
    label,
    stepKind: classifyStepKind(fields.stepKind, locale, file, markerId),
    role: fields.role.trim(),
    fromTo: fields.fromTo.trim(),
    operator: { where: fields.where.trim(), do: fields.do.trim(), fill: fields.fill.trim() },
    tester: { expectedState: fields.expectedState.trim(), confirm: fields.confirm.trim(), triggerEvent: trigger },
    checks: fields.checks.trim(),
    // A parenthesis glosses the term before it (`ILLEGAL_TRANSITION` (what a
    // dispatch from any state other than `Sent` would get)) — commentary, not
    // a second term, so it is set aside before the terms are read.
    glossary: ticked(fields.glossary.replace(/\([^()]*\)/g, '')),
    honesty: fields.honesty.trim(),
    sources,
  };
}

/** The transition blocks of section 3, in file order — duplicates kept, for the gate to see. */
function parseSteps(lines, locale, file) {
  const starts = [];
  lines.forEach((l, i) => {
    if (/^###\s/.test(l)) starts.push(i);
  });
  const intro = proseOf(lines.slice(0, starts[0] ?? lines.length));
  const blocks = starts.map((s, n) => parseBlock(lines.slice(s, starts[n + 1] ?? lines.length), locale, file));
  return { intro, blocks };
}

/** Section 9: `| state | fixture ids | number | note |`, one row per state. */
function parseTestData(lines, file) {
  const rows = lines.filter((l) => l.trim().startsWith('|'));
  if (rows.length < 3) throw new GuideBuildError('TESTDATA_TABLE', file, 'section 9 holds no test-data table');
  return rows.slice(2).map((row) => {
    const cells = row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length !== 4) {
      throw new GuideBuildError('TESTDATA_TABLE', file, `a test-data row has ${cells.length} cells, not 4: "${row.trim()}"`);
    }
    const [state, ids, number, note] = cells;
    const entry = { state: state.replace(/`/g, ''), fixtureIds: ticked(ids) };
    if (number && number !== '—' && number !== '-') entry.number = number;
    if (note) entry.note = note;
    return entry;
  });
}

/**
 * Parse ONE guide. `file` is `<entity>.<locale>.md` (any directory); the front
 * matter must agree with it.
 */
export function parseGuide(text, file) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const { fm, bodyStart } = parseFrontMatter(lines, file);
  const name = /^([A-Za-z]+)\.([a-z]+)\.md$/.exec(basename(file));
  if (!name) throw new GuideBuildError('FILE_NAME', file, 'a guide is named `<entity>.<locale>.md`');
  if (name[1] !== fm.entity || name[2] !== fm.locale) {
    throw new GuideBuildError('FILE_NAME', file, `the file name says ${name[1]}/${name[2]}, the front matter ${fm.entity}/${fm.locale}`);
  }
  const raw = splitSections(lines.slice(bodyStart), file);
  const sections = {};
  const sectionSources = {};
  for (const key of SECTION_KEYS) {
    if (key === 'steps') continue;
    const p = proseOf(raw[key]);
    sections[key] = p.text;
    sectionSources[key] = p.sources;
  }
  const { intro, blocks } = parseSteps(raw.steps, fm.locale, file);
  sections.steps = intro.text;
  sectionSources.steps = intro.sources;
  const steps = {};
  for (const b of blocks) if (!(b.transitionId in steps)) steps[b.transitionId] = b;
  return {
    entity: fm.entity,
    locale: fm.locale,
    title: fm.title,
    wired: fm.wired === 'true',
    owner: fm.owner,
    sourceSha: fm.source_sha,
    sourceFile: file,
    transitions: fm.transitions,
    stepOrder: blocks.map((b) => b.transitionId),
    sections,
    sectionSources,
    steps,
    testData: parseTestData(raw.testdata, file),
  };
}

/** Every `*.md` under `srcDir` except `_`-prefixed authoring files. */
export function guideFiles(srcDir) {
  if (!existsSync(srcDir)) return [];
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md') && !e.name.startsWith('_')) out.push(p);
    }
  };
  walk(srcDir);
  return out.sort();
}

/** Parse every guide under `srcDir` into the registry the app imports. */
export function buildGuides(srcDir = DEFAULT_SRC) {
  const guides = guideFiles(srcDir).map((p) => {
    const rel = relative(REPO_ROOT, p).split('\\').join('/');
    return parseGuide(readFileSync(p, 'utf8'), rel.startsWith('..') ? basename(p) : rel);
  });
  const seen = new Set();
  for (const g of guides) {
    const key = `${g.entity}.${g.locale}`;
    if (seen.has(key)) throw new GuideBuildError('DUPLICATE_GUIDE', g.sourceFile, `a second ${key} guide`);
    seen.add(key);
  }
  guides.sort((a, b) => (a.entity === b.entity ? a.locale.localeCompare(b.locale) : a.entity.localeCompare(b.entity)));
  return { schema: 1, guides };
}

export const serialize = (registry) => `${JSON.stringify(registry, null, 2)}\n`;

/** A file's text with its line endings normalised — the one comparison both `--check` and the write use. */
const normalisedText = (path) => (existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n?/g, '\n') : null);

/**
 * Write `text` to `out` ONLY when the content differs, line endings aside;
 * returns whether it wrote.
 *
 * ⚠️ **WHY THE COMPARISON IGNORES LINE ENDINGS.** `core.autocrlf` checks the
 * JSON out with CRLF on Windows while this script serialises LF, so an
 * unconditional write turned every local `npm run build` into a modified file
 * whose git blob was identical — a dirty tree with no change in it (found
 * after G1's post-merge build). A file whose content already matches is left
 * byte-for-byte alone; a stale one is rewritten exactly as before.
 */
export function writeIfChanged(out, text) {
  if (normalisedText(out) === text) return false;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  return true;
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const src = arg('--src') ? resolve(arg('--src')) : DEFAULT_SRC;
  const out = arg('--out') ? resolve(arg('--out')) : DEFAULT_OUT;
  let text;
  try {
    text = serialize(buildGuides(src));
  } catch (e) {
    if (e instanceof GuideBuildError) {
      console.error(`GUIDE BUILD REFUSED — ${e.message}`);
      return 1;
    }
    throw e;
  }
  if (argv.includes('--check')) {
    if (normalisedText(out) !== text) {
      console.error(`GUIDE BUILD REFUSED — ${relative(REPO_ROOT, out)} is stale; run \`node scripts/guides/build.mjs\``);
      return 1;
    }
    console.log('guides: JSON is current');
    return 0;
  }
  const wrote = writeIfChanged(out, text);
  console.log(`guides: ${relative(REPO_ROOT, out).split('\\').join('/')} ${wrote ? 'written' : 'unchanged'}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
