// ────────────────────────────────────────────────────────────────────────────
// G1 · THE GUIDE REGISTRY, HELD TO THE TREE (Design 5 §B.1).
//
// Every gate below is BILATERAL: the guides against the flow registry, the
// stores, the router, the glossary and the repository's own history — each in
// the direction its absence would let a wrong guide through. CONTENT IS NEVER
// ASSERTED (prose stays prose); structure and identity are.
//
// ⚠️ **THE POPULATIONS ARE ASSERTED FIRST, BY NAMED MEMBER.** A gate over an
// empty registry is green by construction (`EMPTY-INPUT-REPORTS-CLEAN-01`), so
// before anything is believed the registry must hold `purchaseOrder` in both
// locales and the flow registry must hold `t_po_confirm`.
//
// ⚠️ **"GUIDE PENDING" IS ACCEPTED ONLY BY NAME** (`pending.ts`), for the flows
// whose guide lands at G2 — never by an empty-list door. G2 deletes that file.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { REPO_ROOT } from '../lib/treeMutationGate/derive';
import { getKnownFlows } from '../services/transitions';
import { ALL_GLOSSARY_TERMS } from '../lib/glossary';
import { purchaseOrderStore } from '../services/data/mock/stores/purchaseOrderStore';
import { moduleOfFlow, moduleOfRoute } from '../services/modules/registry';
import { SAMPLE_PEOPLE } from '../services/identity/sampleRoster';
import { personLabel } from '../services/identity/personLabel';
import { ROLE_LABEL_KEY } from '../services/transitions/handoff';
import { personNamesInTree } from '../lib/personNames';
import i18n from '../lib/i18n';
import {
  GUIDES,
  GUIDES_PENDING_G2,
  GUIDE_LIST_ROUTE,
  GUIDE_SECTION_KEYS,
  getGuide,
  guideCitationKey,
  guideCitations,
  resolveGuideCitation,
  type ProcessGuide,
} from './index';
import committed from './generated/guides.json';
import { buildGuides, parseGuide, GuideBuildError, STEP_KINDS, OWNERS } from '../../scripts/guides/build.mjs';

const FLOWS = getKnownFlows();
const flowOf = (entity: string) => FLOWS.find((f) => f.entity === entity);
const LOCALES = ['en', 'id'] as const;
const GUIDES_DIR = join(REPO_ROOT, 'docs', 'guides');
const rawOf = (g: ProcessGuide): string => readFileSync(join(REPO_ROOT, g.sourceFile), 'utf8');
const landed = (entity: string) => LOCALES.some((l) => getGuide(entity, l));

/**
 * Where each wired guide's fixture ids live, read at seed — the store map of
 * `review-drafts/guides/_derived/guidefacts.ts`, entry by entry as guides land.
 * A landed WIRED guide with no reader here is red, so G2 cannot land a guide
 * whose test data nothing checks.
 */
const FIXTURE_READERS: Readonly<Record<string, () => readonly { id: string; state: string }[]>> = {
  purchaseOrder: () => purchaseOrderStore.all().map((p) => ({ id: p.id, state: p.status })),
};

/** The router's routes, derived from its source exactly as the smoke table derives them. */
const ROUTER_PATHS: readonly string[] = (() => {
  const src = readFileSync(join(REPO_ROOT, 'src', 'router', 'AppRouter.tsx'), 'utf8');
  return src
    .split('<Route')
    .slice(1)
    .map((chunk) => /path="([^"]+)"/.exec(chunk)?.[1] ?? null)
    // ⚠️ The catch-all `*` (the 404 page) is EXCLUDED: it matches every path,
    // so admitting it would make "this route exists" true of anything — a
    // gate that cannot fail.
    .filter((p): p is string => p !== null && p !== '*');
})();
const routeMatches = (pattern: string, path: string): boolean =>
  new RegExp(`^${pattern.replace(/:[^/]+/g, '[^/]+')}$`).test(path);
/**
 * Is a path a guide names a real route? A `/supplier/…` names a FAMILY ("two
 * doors, both under /supplier/…"), so it needs at least one route under it.
 */
const routeExists = (path: string, routes: readonly string[] = ROUTER_PATHS): boolean =>
  path.endsWith('…')
    ? routes.some((r) => r.startsWith(path.slice(0, -1)))
    : routes.some((r) => routeMatches(r, path));
const routesIn = (markdown: string): string[] =>
  [...markdown.matchAll(/`(\/[^`\s]*)`/g)].map((m) => m[1]);

// ── THE POPULATIONS ─────────────────────────────────────────────────────────

describe('guides · THE POPULATIONS, before any gate is believed', () => {
  it('the registry holds the proof pair, by name, in both locales', () => {
    expect(getGuide('purchaseOrder', 'en')?.title).toBe('Purchase order');
    expect(getGuide('purchaseOrder', 'id')?.locale).toBe('id');
    expect(getGuide('noSuchFlow', 'en')).toBeUndefined();
  });

  it('the flow registry is the real one, not an empty import', () => {
    expect(FLOWS.flatMap((f) => f.transitions.map((t) => t.id))).toContain('t_po_confirm');
    expect(flowOf('purchaseOrder')).toBeTruthy();
  });

  it('the router population is real — a known route found, a fake one absent', () => {
    expect(ROUTER_PATHS).toContain('/buyer/process-flows');
    expect(routeExists('/supplier/orders')).toBe(true);
    expect(routeExists('/supplier/not-a-route')).toBe(false);
    expect(routeExists('/supplier/…')).toBe(true);
    expect(routeExists('/nowhere/…')).toBe(false);
  });
});

// ── THE BUILD ───────────────────────────────────────────────────────────────

describe('guides · the committed JSON is the parse of docs/guides — a stale JSON is red', () => {
  it('guides.json equals a fresh build of the markdown', () => {
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildGuides(GUIDES_DIR))));
  });

  it('every closed-union field holds a member — the one cast in the accessor, closed', () => {
    for (const g of GUIDES) {
      expect(LOCALES).toContain(g.locale);
      expect(OWNERS).toContain(g.owner);
      expect(Object.keys(g.sections).sort()).toEqual([...GUIDE_SECTION_KEYS].sort());
      for (const s of Object.values(g.steps)) expect(STEP_KINDS).toContain(s.stepKind);
    }
  });
});

describe('guides · the build refuses a malformed guide, by name', () => {
  const EN = readFileSync(join(GUIDES_DIR, 'purchaseOrder.en.md'), 'utf8').replace(/\r\n?/g, '\n');
  const FILE = 'purchaseOrder.en.md';
  const refusal = (text: string, file = FILE): string => {
    try {
      parseGuide(text, file);
    } catch (e) {
      if (e instanceof GuideBuildError) return e.code;
      throw e;
    }
    return 'ACCEPTED';
  };

  it('KNOWN-GOOD — the landed guide parses', () => {
    expect(refusal(EN)).toBe('ACCEPTED');
  });

  it.each([
    ['no front matter', EN.replace(/^---\n/, ''), 'NO_FRONT_MATTER'],
    ['an unknown front-matter key', EN.replace('owner: portal', 'owner: portal\nauthor: someone'), 'FRONT_MATTER_UNKNOWN_KEY'],
    ['a missing front-matter key', EN.replace(/^title: .*\n/m, ''), 'FRONT_MATTER_MISSING_KEY'],
    ['a source SHA that is not a commit id', EN.replace(/^source_sha: .*$/m, 'source_sha: main'), 'FRONT_MATTER_VALUE'],
    ['a section marker out of order', EN.replace('<!-- section:forks -->', '<!-- section:flagsX -->'), 'SECTION_MARKERS'],
    ['a block whose heading and marker disagree', EN.replace('### t_po_view —', '### t_po_viewed —'), 'BLOCK_HEADING'],
    ['a block missing a field', EN.replace(/^- \*\*Honesty:\*\* SIMULATED rows; the only terminal.*$/m, ''), 'BLOCK_FIELD'],
    ['a block missing its source note', EN.replace(/<!-- src: src\/services\/transitions\/flows\/purchaseOrder\.flow\.ts:33-34,127-144.*-->/, ''), 'BLOCK_SOURCE'],
    ['a step kind nobody can classify', EN.replace('- **Step kind:** not active (no caller)', '- **Step kind:** sometimes'), 'STEP_KIND'],
    ['a test-data row with the wrong cell count', EN.replace('| Closed | `po-011`, `po-015` |', '| Closed | `po-011`, `po-015` | x |'), 'TESTDATA_TABLE'],
  ])('refuses %s', (_name, text, code) => {
    expect(text).not.toBe(EN); // the mutation really applied
    expect(refusal(text)).toBe(code);
  });

  it('refuses a file whose name disagrees with its front matter', () => {
    expect(refusal(EN, 'purchaseOrder.id.md')).toBe('FILE_NAME');
  });

  it('the CLI exits non-zero on a malformed guide and writes nothing; zero on a good one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guides-'));
    try {
      const out = join(dir, 'out.json');
      writeFileSync(join(dir, FILE), EN.replace(/^---\n/, ''));
      const bad = spawnSync(process.execPath, ['scripts/guides/build.mjs', '--src', dir, '--out', out], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      expect(bad.status).toBe(1);
      expect(bad.stderr).toMatch(/GUIDE BUILD REFUSED .*NO_FRONT_MATTER/);
      expect(existsSync(out)).toBe(false);

      writeFileSync(join(dir, FILE), EN);
      const good = spawnSync(process.execPath, ['scripts/guides/build.mjs', '--src', dir, '--out', out], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      expect(good.status).toBe(0);
      expect(JSON.parse(readFileSync(out, 'utf8')).guides[0].entity).toBe('purchaseOrder');

      // …and `--check` against a JSON that no longer matches is refused.
      writeFileSync(join(dir, 'out.json'), '{}\n');
      const stale = spawnSync(process.execPath, ['scripts/guides/build.mjs', '--src', dir, '--out', out, '--check'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      expect(stale.status).toBe(1);
      expect(stale.stderr).toMatch(/is stale/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('`npm run build` runs the guide build first, so a stale JSON cannot ship', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts.build).toMatch(/^node scripts\/guides\/build\.mjs && /);
  });
});

// ── THE BILATERAL GATES ─────────────────────────────────────────────────────

describe('guides · every flow has a guide in EN and in ID — or is NAMED pending', () => {
  it('a registered flow with no guide pair is red unless the G2 list names it', () => {
    const missing = FLOWS.map((f) => f.entity).filter(
      (e) => !(getGuide(e, 'en') && getGuide(e, 'id')) && !GUIDES_PENDING_G2.includes(e),
    );
    expect(missing).toEqual([]);
  });

  it('every pending name is a registered flow', () => {
    expect(GUIDES_PENDING_G2.filter((e) => !flowOf(e))).toEqual([]);
  });

  it('no pending name has a landed guide — landing one takes it off the list', () => {
    expect(GUIDES_PENDING_G2.filter(landed)).toEqual([]);
  });

  it('the pending list names each flow once', () => {
    expect(new Set(GUIDES_PENDING_G2).size).toBe(GUIDES_PENDING_G2.length);
  });
});

describe('guides · every guide is for a registered flow', () => {
  it('a guide for a retired or misspelled flow is red', () => {
    expect(GUIDES.filter((g) => !flowOf(g.entity)).map((g) => g.sourceFile)).toEqual([]);
  });
});

describe('guides · the front-matter transitions equal the registry, in order, in both locales', () => {
  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    expect(g.transitions).toEqual(flowOf(g.entity)!.transitions.map((t) => t.id));
  });
});

describe('guides · one block per transition, each exactly once', () => {
  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    const ids = flowOf(g.entity)!.transitions.map((t) => t.id);
    // Parsed: the blocks as the build found them, duplicates kept.
    expect([...g.stepOrder].sort()).toEqual([...ids].sort());
    // Raw: the markers in the file itself, so a parser that collapsed a
    // duplicate cannot hide one.
    const raw = rawOf(g);
    for (const id of ids) {
      expect(raw.split(`<!-- transition:${id} -->`).length - 1, `${g.sourceFile}: ${id}`).toBe(1);
    }
  });
});

describe('guides · every trigger event names its own block', () => {
  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    const wrong = Object.values(g.steps).filter((s) => s.tester.triggerEvent !== s.transitionId);
    expect(wrong.map((s) => `${s.transitionId} → ${s.tester.triggerEvent}`)).toEqual([]);
  });
});

describe('guides · every fixture id resolves in its store at seed, in the state its row names', () => {
  it('the store readers are real — a known fixture found, a fake one absent', () => {
    const rows = FIXTURE_READERS.purchaseOrder();
    expect(rows.find((r) => r.id === 'po-008')?.state).toBe('Sent');
    expect(rows.find((r) => r.id === 'po-999')).toBeUndefined();
  });

  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    const read = FIXTURE_READERS[g.entity];
    if (!g.wired) {
      expect(g.testData.flatMap((r) => r.fixtureIds)).toEqual([]);
      return;
    }
    expect(read, `${g.entity} landed with no fixture reader in this spec`).toBeTruthy();
    const rows = read!();
    const wrong = g.testData.flatMap((r) =>
      r.fixtureIds
        .filter((id) => rows.find((x) => x.id === id)?.state !== r.state)
        .map((id) => `${id}: guide says ${r.state}, store says ${rows.find((x) => x.id === id)?.state ?? 'NOT FOUND'}`),
    );
    expect(wrong).toEqual([]);
    expect(g.testData.flatMap((r) => r.fixtureIds).length).toBeGreaterThan(0);
  });
});

describe('guides · every route an operator is sent to exists in AppRouter', () => {
  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    const named = Object.values(g.steps).flatMap((s) => routesIn(s.operator.where));
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((r) => !routeExists(r))).toEqual([]);
  });

  it('every landed guide has a list route, in the router, owned by the flow’s own module', () => {
    for (const entity of new Set(GUIDES.map((g) => g.entity))) {
      const route = GUIDE_LIST_ROUTE[entity];
      expect(route, `${entity} has no list route`).toBeTruthy();
      expect(routeExists(route), route).toBe(true);
      expect(moduleOfRoute(route)?.code, route).toBe(moduleOfFlow(entity));
    }
  });
});

describe('guides · no personal name — roles only, extended to the guides', () => {
  const corpus = (() => {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return out
      .split('\n')
      .filter((rel) => rel && /\.(ts|tsx|md|json)$/.test(rel) && rel !== 'package-lock.json')
      .map((rel) => {
        try {
          return readFileSync(join(REPO_ROOT, rel), 'utf8');
        } catch {
          return '';
        }
      })
      .join('\n');
  })();
  const people = personNamesInTree(corpus);
  const rosterLabels = LOCALES.flatMap((lng) => {
    const t = i18n.getFixedT(lng);
    return SAMPLE_PEOPLE.flatMap((p) => [personLabel(p.personId, t), `${t(ROLE_LABEL_KEY[p.role])} ${p.ordinal}`]);
  });
  // The roster's ids by MEMBERSHIP, never by a namespace prefix: the prefix is
  // spelled in exactly one file (`simUsrNamespace.test.ts`), and a roster
  // lookup cannot be satisfied by an id somebody invented.
  const rosterIds = SAMPLE_PEOPLE.map((p) => p.personId);
  const DENY = [...people, ...rosterLabels, ...rosterIds];
  const namesIn = (text: string) => DENY.filter((d) => text.includes(d));

  it('the denylist is real — the tree’s people, the roster’s labels in both locales, its ids', () => {
    expect(people).toContain('Budi Santoso');
    expect(rosterLabels.some((l) => /\(SAMPLE\)/.test(l))).toBe(true);
    expect(rosterLabels.some((l) => /\(CONTOH\)/.test(l))).toBe(true);
    // KNOWN-BAD — the same instrument convicts a planted name.
    expect(namesIn('the receiver, Budi Santoso, confirms')).toEqual(['Budi Santoso']);
    expect(namesIn(`act as ${rosterIds[0]}`)).toEqual([rosterIds[0]]);
  });

  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    expect(namesIn(rawOf(g))).toEqual([]);
  });
});

describe('guides · EN and ID are the same structure', () => {
  const entities = [...new Set(GUIDES.map((g) => g.entity))];
  const markers = (raw: string) =>
    [...raw.matchAll(/<!--\s*(section|transition):(\S+)\s*-->/g)].map((m) => `${m[1]}:${m[2]}`);

  it.each(entities)('%s', (entity) => {
    const en = getGuide(entity, 'en')!;
    const id = getGuide(entity, 'id')!;
    expect(en && id).toBeTruthy();
    expect(markers(rawOf(id))).toEqual(markers(rawOf(en)));
    expect(id.transitions).toEqual(en.transitions);
    expect(id.stepOrder).toEqual(en.stepOrder);
    expect([id.wired, id.owner, id.sourceSha]).toEqual([en.wired, en.owner, en.sourceSha]);
    expect(id.testData.map((r) => [r.state, r.fixtureIds])).toEqual(en.testData.map((r) => [r.state, r.fixtureIds]));
    for (const t of en.transitions) {
      expect([id.steps[t].stepKind, id.steps[t].glossary], t).toEqual([en.steps[t].stepKind, en.steps[t].glossary]);
    }
  });
});

describe('guides · the source SHA is a commit this repository holds', () => {
  const isCommit = (sha: string): boolean =>
    spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: REPO_ROOT }).status === 0;

  it('KNOWN-BAD — a SHA one digit away is refused by the same instrument', () => {
    const sha = GUIDES[0].sourceSha;
    const flipped = sha.slice(0, -1) + (sha.endsWith('0') ? '1' : '0');
    expect(isCommit(flipped)).toBe(false);
  });

  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    expect(isCommit(g.sourceSha), `${g.sourceSha} (a shallow clone does not hold it — CI fetches full history)`).toBe(true);
  });
});

describe('guides · every glossary term a step names is defined in the glossary', () => {
  const defined = new Set(ALL_GLOSSARY_TERMS.map((e) => e.term));
  it('the glossary population is real', () => {
    expect(defined.has('ILLEGAL_TRANSITION')).toBe(true);
    expect(defined.has('NOT_A_TERM')).toBe(false);
  });
  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    const undefinedTerms = Object.values(g.steps).flatMap((s) => s.glossary.filter((t) => !defined.has(t)));
    expect(undefinedTerms).toEqual([]);
  });
});

describe('guides · the citation keys (SE-20) are stable, unique and resolve', () => {
  it('a step key and a section key resolve to what they name', () => {
    const step = resolveGuideCitation('guide://purchaseOrder/en#t_po_confirm');
    expect(step?.kind === 'step' && step.step.transitionId).toBe('t_po_confirm');
    const sec = resolveGuideCitation('guide://purchaseOrder/id#troubleshooting');
    expect(sec?.kind === 'section' && sec.guide.locale).toBe('id');
  });

  it('KNOWN-BAD — an unknown anchor, locale or entity resolves to nothing, never a neighbour', () => {
    expect(resolveGuideCitation('guide://purchaseOrder/en#t_po_nothing')).toBeNull();
    expect(resolveGuideCitation('guide://purchaseOrder/fr#summary')).toBeNull();
    expect(resolveGuideCitation('guide://noSuchFlow/en#summary')).toBeNull();
    expect(resolveGuideCitation('purchaseOrder#summary')).toBeNull();
  });

  it.each(GUIDES.map((g) => [g.sourceFile, g] as const))('%s', (_f, g) => {
    const keys = guideCitations(g);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((k) => resolveGuideCitation(k) === null)).toEqual([]);
    expect(keys).toContain(guideCitationKey(g.entity, g.locale, g.transitions[0]));
  });
});
