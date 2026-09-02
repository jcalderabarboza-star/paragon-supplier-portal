// ─────────────────────────────────────────────────────────────────────────────
// C1 · THE DERIVATION BEHIND THE PIN — the tree half and the document half,
// kept in one module so neither can quietly become the other.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   `C1-methods.md` is the method-surface contract: the interface a Phase-F1
//   backend team implements. It was harvested once and never re-harvested, and
//   NO BUILD STEP FAILS WHEN A CONTRACT STATEMENT STOPS BEING TRUE — the exact
//   cause CP-1 named across C7/C8 and CP-2 put on the floor for C9.
//
//   This module supplies the two populations the pin compares. It derives the
//   TREE from the AST and the DOCUMENT from its committed markdown. Neither is
//   read through the other, which is the §86 rule: a gate must not derive its
//   population through the code it is probing. Here the two sides are genuinely
//   independent instruments, so a mutation on either side moves exactly one of
//   them and the comparison goes red rather than collapsing to vacuous.
//
// ── BOTH HALVES OF THE TYPE, DELIBERATELY (§40e) ────────────────────────────
//   D-F measured that a population read through the declared type NODE sees
//   optionals but is blind to `extends`, while one read through the CHECKER
//   sees `extends` and loses optionals — and that widening from one to the
//   other GAINED 17 members while silently LOSING 5. So `deriveServiceSurface`
//   computes both and reports the divergence rather than picking a winner. No
//   sub-service uses `extends` today; the day one does, the node half stops
//   agreeing and `c1MethodSurface.contract.test.ts` says so by name instead of
//   silently under-reporting.
// ─────────────────────────────────────────────────────────────────────────────

import ts from 'typescript';

// ─── The TREE half ───────────────────────────────────────────────────────────

export interface DerivedSubService {
  /** The property name on `IDataService`, e.g. `procurement`. */
  readonly property: string;
  /** The interface it is typed as, e.g. `IProcurementService`. */
  readonly iface: string;
  /** Method names, in declaration order. */
  readonly methods: readonly string[];
  /** False when the NODE and CHECKER halves disagree — see the header. */
  readonly halvesAgree: boolean;
}

export interface DerivedSurface {
  readonly subServices: readonly DerivedSubService[];
  /** Methods declared directly on `IDataService`, e.g. `getCapabilities`. */
  readonly topLevelMethods: readonly string[];
  readonly subMethodTotal: number;
  readonly grandTotal: number;
}

const interfaceIn = (sf: ts.SourceFile, name: string): ts.InterfaceDeclaration | undefined => {
  let found: ts.InterfaceDeclaration | undefined;
  ts.forEachChild(sf, (n) => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === name) found = n;
  });
  return found;
};

/** Method names as the DECLARATION states them — blind to `extends`. */
const nodeMethods = (decl: ts.InterfaceDeclaration, sf: ts.SourceFile): string[] =>
  decl.members.filter(ts.isMethodSignature).map((m) => m.name.getText(sf));

/** Method names as the CHECKER resolves them — sees `extends`. */
const checkerMethods = (decl: ts.InterfaceDeclaration, checker: ts.TypeChecker): string[] =>
  checker
    .getPropertiesOfType(checker.getTypeAtLocation(decl))
    .filter((s) => s.declarations?.some((d) => ts.isMethodSignature(d)))
    .map((s) => s.getName());

/**
 * Every sub-service of `IDataService` and every method on it, from the AST.
 *
 * Throws rather than returning empty when the root interface is absent —
 * `EMPTY-INPUT-REPORTS-CLEAN-01`: a derivation that examined nothing must never
 * be able to hand back a clean-looking answer.
 */
export function deriveServiceSurface(program: ts.Program, typesPath: string): DerivedSurface {
  const sf = program.getSourceFile(typesPath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${typesPath}`);
  const checker = program.getTypeChecker();

  const root = interfaceIn(sf, 'IDataService');
  if (!root) throw new Error('C1 derivation: `IDataService` is not declared in the types module');

  const subServices: DerivedSubService[] = [];
  const topLevelMethods: string[] = [];

  for (const member of root.members) {
    if (ts.isMethodSignature(member)) {
      topLevelMethods.push(member.name.getText(sf));
      continue;
    }
    if (!ts.isPropertySignature(member) || !member.type) continue;

    const iface = member.type.getText(sf);
    const decl = interfaceIn(sf, iface);
    if (!decl) {
      // A sub-service typed as something the module does not declare. Recorded
      // rather than skipped: silently dropping it is how a surface shrinks
      // without anyone noticing.
      subServices.push({
        property: member.name.getText(sf),
        iface,
        methods: [],
        halvesAgree: false,
      });
      continue;
    }

    const viaNode = nodeMethods(decl, sf);
    const viaChecker = checkerMethods(decl, checker);
    const same =
      viaNode.length === viaChecker.length && [...viaNode].sort().join() === [...viaChecker].sort().join();

    subServices.push({
      property: member.name.getText(sf),
      iface,
      // The checker half is authoritative for MEMBERSHIP (it sees inherited
      // members); the node half supplies declaration ORDER, which reads better
      // in the document. They agree today, and `halvesAgree` is asserted.
      methods: same ? viaNode : [...new Set([...viaNode, ...viaChecker])],
      halvesAgree: same,
    });
  }

  const subMethodTotal = subServices.reduce((n, s) => n + s.methods.length, 0);
  return {
    subServices,
    topLevelMethods,
    subMethodTotal,
    grandTotal: subMethodTotal + topLevelMethods.length,
  };
}

/** Every member of an interface, split by kind — used for `CommandTarget`. */
export function deriveInterfaceMembers(
  program: ts.Program,
  filePath: string,
  ifaceName: string,
): { readonly methods: readonly string[]; readonly properties: readonly string[] } {
  const sf = program.getSourceFile(filePath);
  if (!sf) throw new Error(`C1 derivation: cannot read ${filePath}`);
  const decl = interfaceIn(sf, ifaceName);
  if (!decl) throw new Error(`C1 derivation: \`${ifaceName}\` is not declared in ${filePath}`);

  // ⚠️ **THE SPLIT IS THE POINT, AND IT IS WHY THIS RETURNS TWO LISTS.** The
  // first matcher written for this read `\w+\??\(` — method-call shape — and
  // reported `CommandTarget` as SIX members. It has seven: `requireCreationOwner`
  // is a `boolean` PROPERTY, not a method, and a matcher keyed on the call shape
  // cannot see it. Rule 2 in miniature, and the document had the same six.
  return {
    methods: decl.members.filter(ts.isMethodSignature).map((m) => m.name.getText(sf)),
    properties: decl.members.filter(ts.isPropertySignature).map((m) => m.name.getText(sf)),
  };
}

// ─── The DOCUMENT half ───────────────────────────────────────────────────────

/**
 * Spelled-out cardinals, so a contract can read like prose and still be pinned.
 *
 * ⚠️ A number written as a WORD is the one a count-guard never checks, because
 * no digit-matching regex sees it — `FLOOR-IN-PROSE-01` with better camouflage.
 * Both contracts use them ("exactly **two** carry it today"), so the pin maps
 * rather than parses, and fails loudly on a word it cannot map instead of
 * silently skipping the claim.
 */
export const NUMBER_WORDS: Readonly<Record<string, number>> = Object.freeze({
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
});

/** One `## ` section of the contract, heading included, up to the next `## `. */
export function section(doc: string, headingStartsWith: string): string {
  const lines = doc.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('## ') && l.includes(headingStartsWith));
  if (start === -1) throw new Error(`C1 document: no section heading contains "${headingStartsWith}"`);
  const rest = lines.slice(start + 1).findIndex((l) => l.startsWith('## '));
  return lines.slice(start, rest === -1 ? undefined : start + 1 + rest).join('\n');
}

/** Every `` `identifier` `` in a string, in order, de-duplicated. */
export const backticked = (s: string): string[] => [
  ...new Set([...s.matchAll(/`([A-Za-z_][\w.]*)`/g)].map((m) => m[1])),
];

export interface DocIfaceRow {
  readonly iface: string;
  readonly count: number;
  readonly methods: readonly string[];
}

/** Rows of the Axis-1 table: `| \`IX\` | N | \`a\`, \`b\` |`. */
export function parseIfaceTable(sectionText: string): DocIfaceRow[] {
  const rows: DocIfaceRow[] = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(/^\|\s*`(I\w+)`\s*\|\s*(\d+)\s*\|(.*)\|\s*$/);
    if (m) rows.push({ iface: m[1], count: Number(m[2]), methods: backticked(m[3]) });
  }
  return rows;
}

/** The `property: IInterface;` lines of the Axis-1 composition block. */
export function parseComposition(sectionText: string): { property: string; iface: string }[] {
  const out: { property: string; iface: string }[] = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(/^\s{2}(\w+):\s*(I\w+);/);
    if (m) out.push({ property: m[1], iface: m[2] });
  }
  return out;
}

export interface DocFlowRow {
  readonly file: string;
  readonly entity: string;
  readonly count: number;
  readonly transitionIds: readonly string[];
  /** The wiring cell verbatim, and the boolean the contract actually claims. */
  readonly wiring: string;
  readonly claimsWired: boolean;
}

/** Rows of the Axis-2 table: `| \`x.flow.ts\` | \`entity\` | N | \`t_a\`, … | wiring |`. */
export function parseFlowTable(sectionText: string): DocFlowRow[] {
  const rows: DocFlowRow[] = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const m = line.match(
      /^\|\s*`([\w.]+\.flow\.ts)`\s*\|\s*`(\w+)`\s*\|\s*(\d+)\s*\|([^|]*)\|([^|]*)\|/,
    );
    if (m) {
      rows.push({
        file: m[1],
        entity: m[2],
        count: Number(m[3]),
        transitionIds: backticked(m[4]),
        wiring: m[5].trim(),
        claimsWired: /\*\*wired\*\*/.test(m[5]),
      });
    }
  }
  return rows;
}

/** The `**TOTAL** | **N**` figure of a table, or `null` when the row is absent. */
export function parseTotal(sectionText: string): number | null {
  const m = sectionText.match(/^\|\s*\*\*TOTAL\*\*\s*\|[^|]*\|\s*\*\*(\d+)\*\*/m);
  if (m) return Number(m[1]);
  const m2 = sectionText.match(/^\|\s*\*\*TOTAL\*\*\s*\|\s*\*\*(\d+)\*\*/m);
  return m2 ? Number(m2[1]) : null;
}

/** The backticked identifiers on the single line that starts with `marker`. */
export function markedList(doc: string, marker: string): string[] {
  const line = doc.split(/\r?\n/).find((l) => l.trimStart().startsWith(marker));
  if (line === undefined) throw new Error(`C1 document: no line starts with "${marker}"`);
  return backticked(line);
}
