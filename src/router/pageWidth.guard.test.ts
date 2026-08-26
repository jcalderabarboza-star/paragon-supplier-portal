// ────────────────────────────────────────────────────────────────────────────
// §70 — A PAGE INSIDE THE SHELL DOES NOT SET ITS OWN WIDTH.
//
// `AppShellV2` renders `<main className="flex-1 overflow-auto bg-bg-page p-8">`.
// It supplies the padding and constrains nothing, so a page fills the viewport
// by rendering its content directly. Derived from `AppRouter`: of the 42 mounted
// routes, 40 did exactly that and the TWO Roles routes did not — they carried
// `p-6` on top of the shell's `p-8` and a `max-w-*` container, and they did not
// agree with each other (`max-w-6xl` catalogue, `max-w-4xl` detail). At 1920px
// the catalogue used 1152px of an available 1610px and the detail used 896px.
//
// ⚠️ **A `max-w-*` IN THIS TREE BELONGS ON PROSE, NEVER ON A CONTAINER.**
// `PageHeader`'s subtitle is `max-w-prose`; Glossary and ProcessFlows put
// `max-w-4xl` on a `<p>`. That is a MEASURE constraint — how long a line of text
// may run — and it is a different thing from how wide a page is. This gate
// therefore matches a large `max-w-*` on a `<div>` and leaves `<p>` alone.
//
// ⚠️ **AND THE EXCLUSION IS PRINCIPLED, NOT AN ALLOWLIST.** `/login` and
// `/register` render NO `AppShellV2` — they are full-bleed flows that own their
// own chrome, and `SupplierRegistration`'s `max-w-3xl mx-auto` is a CENTRED FORM,
// which is a legitimate width for a page with no shell around it. They are out of
// scope because they are not shell pages, not because they were forgiven. (That
// file is routed as `SupplierRegistrationV2` — an aliased import, which is
// exactly the kind of thing a name-based exclusion gets wrong.)
//
// ⚠️ RULE 4 — the matcher is probed BOTH ways before any claim about the tree,
// and the population is asserted by MEMBERSHIP (`EMPTY-INPUT-REPORTS-CLEAN-01`:
// a scan that read no files reports clean, and "clean" is what gets believed).
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

const ROUTER = join(process.cwd(), 'src', 'router', 'AppRouter.tsx');
const routerSrc = readFileSync(ROUTER, 'utf-8');

/** Comments stripped — a rule stated in the file it governs reads as a violation
 *  of itself (§68's gate tripped on its own explanation twice, and the note this
 *  batch added to `RolesCatalogue` names the very classes it removed). */
const withoutProse = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Route path → component name, DERIVED from the router source (§65a: the
 *  coverage guard that asserted its own table's length never read the router). */
function routes(): { path: string; component: string }[] {
  return [...routerSrc.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)\s*\/?>\}/g)].map(
    (m) => ({ path: m[1], component: m[2] }),
  );
}

/** Component name → source file, following the router's own imports (which may
 *  be ALIASED: `SupplierRegistrationV2` is `pages-v2/SupplierRegistration`). */
function sourceOf(component: string): string | null {
  const m = routerSrc.match(new RegExp(`import\\s+${component}\\s+from\\s+'([^']+)'`));
  if (!m) return null;
  const base = normalize(join(dirname(ROUTER), m[1]));
  for (const ext of ['.tsx', '.ts']) if (existsSync(base + ext)) return base + ext;
  return null;
}

/** The matcher: a container `<div>` that sets a large max-width. */
const CONTAINER_WIDTH = /<div[^>]*className="[^"]*\bmax-w-(?:3|4|5|6|7)xl\b/;
const setsOwnWidth = (source: string): boolean => CONTAINER_WIDTH.test(withoutProse(source));

describe('⚠️ §70 · THE MATCHER, BEFORE ANY CLAIM ABOUT THE TREE', () => {
  it('✅ FIRES on a container that sets its own width — the known-GOOD probe', () => {
    expect(setsOwnWidth('<div className="p-6 max-w-6xl" data-testid="x">')).toBe(true);
    expect(setsOwnWidth('<div className="max-w-4xl">')).toBe(true);
    expect(setsOwnWidth('<div className="mx-auto max-w-3xl flex">')).toBe(true);
  });

  it('does NOT fire on a PROSE measure, which is a different constraint', () => {
    expect(setsOwnWidth('<p className="mt-1 max-w-4xl text-meta">')).toBe(false);
    expect(setsOwnWidth('<p className="text-base mt-2 max-w-prose">')).toBe(false);
    expect(setsOwnWidth('<div className="max-w-prose">')).toBe(false);
    // …nor on the note that RECORDS the removal, which names the class it removed.
    expect(setsOwnWidth('{/* was <div className="p-6 max-w-6xl"> until §70 */}')).toBe(false);
    expect(setsOwnWidth('// the max-w-4xl container is gone')).toBe(false);
  });

  it('⚠️ AND THE POPULATION IS NON-EMPTY — by membership, never by count', () => {
    const paths = routes().map((r) => r.path);
    expect(paths).toContain('/buyer/roles');
    expect(paths).toContain('/buyer/roles/:roleId');
    expect(paths).toContain('/register');
    expect(paths).not.toContain('/buyer/nonexistent');
    // …and the imports actually resolve, or every per-file assertion below is
    // vacuously true over an empty set of readable sources.
    expect(sourceOf('RolesCatalogue')).toMatch(/RolesCatalogue\.tsx$/);
    // The ALIASED import is the one a name-based lookup gets wrong.
    expect(sourceOf('SupplierRegistrationV2')).toMatch(/SupplierRegistration\.tsx$/);
  });
});

describe('§70 · no page inside AppShellV2 sets its own width', () => {
  it('⚠️ EVERY shell route fills the shell — the shell owns padding and width', () => {
    const offenders = routes()
      .map((r) => ({ ...r, file: sourceOf(r.component) }))
      .filter((r) => r.file !== null)
      .map((r) => ({ ...r, src: readFileSync(r.file as string, 'utf-8') }))
      // Not a shell page ⇒ out of scope on principle: a full-bleed flow owns its
      // own chrome, and a centred form is a legitimate width without a shell.
      .filter((r) => r.src.includes('<AppShellV2'))
      .filter((r) => setsOwnWidth(r.src))
      .map((r) => `${r.path} (${r.component})`);

    expect(
      offenders,
      'A route inside AppShellV2 set its own container width. The shell already ' +
        'supplies padding (`main … p-8`) and constrains nothing, so 42 of 42 routes ' +
        'fill it. Do not add a width to match a neighbour — remove the wrapper. If a ' +
        'page genuinely needs a measure constraint, put `max-w-prose` (or a max-w on ' +
        'the `<p>`) on the TEXT, which is what PageHeader, Glossary and ProcessFlows ' +
        'do. §70 fixed the two Roles routes, which were the only exceptions and did ' +
        'not even agree with each other.',
    ).toEqual([]);
  });

  it('and the sanctioned measure constraint is still where it belongs', () => {
    // Bilateral: if `max-w-prose` vanishes from PageHeader, the rule above stops
    // having a legitimate alternative to point at, and "put it on the text"
    // becomes advice with no example in the tree.
    const header = readFileSync(join(process.cwd(), 'src/components/ui-v2/PageHeader.tsx'), 'utf-8');
    expect(header).toMatch(/max-w-prose/);
    expect(setsOwnWidth(header)).toBe(false);
  });
});
