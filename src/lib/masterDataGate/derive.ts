// ─────────────────────────────────────────────────────────────────────────────
// MD-2 · THE MASTER-DATA GATE — the derivations.
//
// Two questions, asked of source text so they can be asked of a tree the spec
// builds as well as of the real one:
//
//   1  Which files import a master-data FIXTURE directly? The material master
//      and the supplier roster are the seed's input now; every other reader is
//      meant to come through the lookups or the service.
//   2  Which files declare an OPTION LIST for a value that has a reference
//      table? A list is caught by what it HOLDS — two or more values of one
//      table — never by what it is called.
//
// Both take `files`: path under `src/` → source with comments removed.
// ─────────────────────────────────────────────────────────────────────────────

export type SourceFiles = Readonly<Record<string, string>>;

/** A fixture and the module that exports it. */
export interface FixtureSpec {
  readonly name: string;
  /** The end of the import path, without extension. */
  readonly module: string;
  /** A barrel that re-exports the fixture: an import of the name from it is a direct read too. */
  readonly barrel?: string;
}

export const MASTER_FIXTURES: readonly FixtureSpec[] = [
  { name: 'MATERIAL_MASTER', module: 'sdc/fixtures', barrel: 'sdc' },
  { name: 'mockSuppliers', module: 'data/mockSuppliers' },
];

const IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g;

/** The files that import `fixture` by name from its module, sorted. The fixture's own module is not an importer of it. */
export function fixtureImporters(files: SourceFiles, fixture: FixtureSpec): string[] {
  const tails = [fixture.module.split('/').slice(-1)[0], ...(fixture.barrel ? [fixture.barrel] : [])];
  return Object.keys(files)
    .filter((file) => {
      if (file.endsWith(`${fixture.module}.ts`)) return false;
      for (const m of files[file].matchAll(IMPORT)) {
        const names = m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]);
        if (names.includes(fixture.name) && tails.includes(m[2].split('/').slice(-1)[0])) return true;
      }
      return false;
    })
    .sort();
}

/** One array of string literals a file declares under a name. */
export interface DeclaredList {
  readonly file: string;
  readonly name: string;
  readonly values: readonly string[];
}

const DECLARATION = /\bconst\s+([A-Za-z_]\w*)\b[^=;\n]*=\s*(?:Object\.freeze\(\s*)?\[([\s\S]*?)\]/g;
const STRING = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g;

/** Every `const NAME = [ … ]` in the tree, with the string literals it holds. */
export function declaredLists(files: SourceFiles): DeclaredList[] {
  const out: DeclaredList[] = [];
  for (const file of Object.keys(files).sort()) {
    for (const m of files[file].matchAll(DECLARATION)) {
      const values = [...m[2].matchAll(STRING)].map((s) => s[1] ?? s[2]);
      if (values.length >= 2) out.push({ file, name: m[1], values });
    }
  }
  return out;
}

/** What a reference table would recognise: its keys and its texts. */
export interface TableVocabulary {
  readonly table: string;
  readonly values: ReadonlySet<string>;
}

export interface OptionListFinding {
  /** `file::NAME` */
  readonly key: string;
  readonly table: string;
  readonly matched: readonly string[];
}

/**
 * The declared lists that hold two or more values of one reference table. A
 * list that matches several tables is reported against the one it matches most.
 */
export function optionListsForReferenceValues(
  files: SourceFiles,
  vocabularies: readonly TableVocabulary[],
): OptionListFinding[] {
  const findings: OptionListFinding[] = [];
  for (const list of declaredLists(files)) {
    let best: OptionListFinding | null = null;
    for (const v of vocabularies) {
      const matched = [...new Set(list.values.filter((value) => v.values.has(value)))];
      if (matched.length >= 2 && (!best || matched.length > best.matched.length)) {
        best = { key: `${list.file}::${list.name}`, table: v.table, matched };
      }
    }
    if (best) findings.push(best);
  }
  return findings.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}
