// ─────────────────────────────────────────────────────────────────────────────
// C9 · A-9 — THE DERIVED REQUIRED-FIELD LIST.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
//   SOMO ratified C9's shape from OUR PROSE SUMMARY. C9 is not in their
//   repository; the field list they checked against came from a description of
//   `materialMasterRef.types.ts`, not from the module. That is
//   COMMENT-AS-CONTRACT-01 pointed at ourselves, one boundary out:
//   A COUNTERPARTY RATIFYING A SUMMARY HAS NOT RATIFIED THE CONTRACT.
//
//   The fix is an artifact they can check against — and it must be DERIVED, not
//   transcribed, because a hand-written list is exactly the summary that caused
//   the problem (CENSUS-MUST-DERIVE-01: a population obtained by an unstated
//   method reports a clean all-clear). This module reads the types source and
//   renders the whole document; `materialMasterRef.contract.test.ts` pins the
//   committed copy to this rendering, so the list cannot drift from the shape.
//
//   It lives under `__tests__/` deliberately: the shipped inert surface stays
//   ONE module (C9 §8's honest cost), and this is generation machinery, not
//   contract shape.
// ─────────────────────────────────────────────────────────────────────────────

interface DerivedField {
  readonly name: string;
  readonly required: boolean;
  readonly type: string;
}

interface DerivedInterface {
  readonly name: string;
  readonly fields: readonly DerivedField[];
}

interface DerivedVocabulary {
  readonly name: string;
  readonly members: readonly string[];
}

/** Comments are prose. Everything below reads SHAPE, so prose is removed first —
 *  otherwise a docblock quoting a field declaration would enter the list. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export const deriveInterfaces = (typesSrc: string): readonly DerivedInterface[] => {
  const src = stripComments(typesSrc);
  const out: DerivedInterface[] = [];
  for (const match of src.matchAll(/export interface (\w+) \{/g)) {
    const bodyStart = match.index! + match[0].length;
    const bodyEnd = src.indexOf('\n}', bodyStart);
    const body = src.slice(bodyStart, bodyEnd);
    const fields = [...body.matchAll(/readonly (\w+)(\??): ([^;]+);/g)].map((f) => ({
      name: f[1],
      required: f[2] !== '?',
      type: f[3].trim(),
    }));
    out.push({ name: match[1], fields });
  }
  return out;
};

export const deriveVocabularies = (typesSrc: string): readonly DerivedVocabulary[] => {
  const src = stripComments(typesSrc);
  const out: DerivedVocabulary[] = [];
  for (const match of src.matchAll(/export const (\w+) = \[([\s\S]*?)\] as const;/g)) {
    const members = [...match[2].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    out.push({ name: match[1], members });
  }
  return out;
};

const PREAMBLE = `# C9 — the COMPLETE required-field list, DERIVED

> ⚠️ **GENERATED FROM \`src/services/sdc/materialMasterRef.types.ts\`. DO NOT EDIT BY HAND.**
> It is rendered by \`src/services/sdc/__tests__/deriveC9FieldList.ts\` and pinned by
> \`materialMasterRef.contract.test.ts\`: if a field reaches the shape without reaching this
> list, the floor fails. Regenerate with \`npx vitest run -u\`.

> ⚠️ **THIS IS NOT A SUMMARY OF C9 AND MUST NOT BE RATIFIED IN PLACE OF IT.**
> [\`C9-material-master-ref.md\`](./C9-material-master-ref.md) is the authority and carries the
> normative content — the invariants, the rulings, the open decisions and the non-conformances.
> **This file carries one thing: every field of the shape, exactly as the module declares it**, so
> that a ratification can be checked against the ARTIFACT rather than against a description of it.
> **A COUNTERPARTY RATIFYING A SUMMARY HAS NOT RATIFIED THE CONTRACT** (C9 §7.11, A-9) — and this
> document exists because that is what happened.

**Send this alongside C9, never instead of it.**
`;

const FOOTER = `
## What this list deliberately does NOT carry

**The invariants are not fields, and they are the part a field list cannot hold.** They live in C9
and in the module's docblocks, and each one is normative:

- A row whose \`evidenceLiveness\` is not \`'LIVE'\` **must not** be \`'CERTAIN'\` (C9 §4.1).
- A row whose verdict is \`'ADJUDICATED_UNRESOLVED'\` **must not** be \`'CERTAIN'\`, and **no policy
  may ever make it joinable** (C9 §5.3).
- A row that is not \`'CERTAIN'\` **must** name a real \`routeToResolution\`; \`'NONE'\` belongs only
  to a row with nothing left to settle (C9 §4.2).
- \`allowSimulatedEvidence\` **must** be \`false\` for any commercial consumer (C9 §4.1).
- A pair carries **zero, one or two** rows — never two at the same grain (C9 §5.1).
- \`materialCode\`, \`spaceId\`, \`sourceOfTruth\` and \`routeToResolution\` are **strings that may
  never be parsed for meaning by either party** (C9 §3, §3.1a).

**If you are checking a shape against this list, you have checked the shape. You have not yet
checked the contract.**
`;

/** The whole document, rendered from the module. Deterministic by construction —
 *  no dates, no commit SHAs, nothing that changes without the shape changing. */
export const deriveC9FieldListDoc = (typesSrc: string): string => {
  const interfaces = deriveInterfaces(typesSrc);
  const vocabularies = deriveVocabularies(typesSrc);

  const totalFields = interfaces.reduce((n, i) => n + i.fields.length, 0);
  const requiredFields = interfaces.reduce(
    (n, i) => n + i.fields.filter((f) => f.required).length,
    0,
  );

  const lines: string[] = [PREAMBLE];

  lines.push(
    `## Counts — derived, so they cannot be quoted stale\n`,
    `| | Derived |`,
    `| --- | --- |`,
    `| Interfaces | **${interfaces.length}** |`,
    `| Fields, total | **${totalFields}** |`,
    `| Fields, REQUIRED | **${requiredFields}** |`,
    `| Fields, optional | **${totalFields - requiredFields}** |`,
    `| Closed vocabularies | **${vocabularies.length}** |`,
    ``,
    `## 1. Every interface, every field`,
    ``,
  );

  for (const iface of interfaces) {
    lines.push(`### \`${iface.name}\``, ``, `| Field | Required | Type |`, `| --- | --- | --- |`);
    for (const f of iface.fields) {
      lines.push(`| \`${f.name}\` | ${f.required ? '**REQUIRED**' : 'optional' } | \`${f.type}\` |`);
    }
    lines.push(``);
  }

  lines.push(`## 2. Every closed vocabulary, every member`, ``);
  for (const v of vocabularies) {
    lines.push(
      `### \`${v.name}\` — ${v.members.length} member${v.members.length === 1 ? '' : 's'}`,
      ``,
      ...v.members.map((m) => `- \`'${m}'\``),
      ``,
    );
  }

  lines.push(FOOTER);
  return lines.join('\n');
};
