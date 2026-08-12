// ─────────────────────────────────────────────────────────────────────────────
// R1 · THE UNBACKED-TOAST HONESTY GUARD — the class, gated.
//
// ⚠️ **THE CLASS THIS EXISTS FOR: THE PAGES DISCLAIM THEIR DATA AND ASSERT THEIR
// ACTS.** `BuyerRisk` says EVERY FIGURE IS ILLUSTRATIVE, then offers an "Export
// Report" that produces a toast. Every honest-marking arc this portal has run
// covered DATA — D-CENSUS-8 marked what a page SAYS. NOTHING marked what a page
// CLAIMS TO HAVE DONE, and a claim about an act is the one a user acts on.
//
// ── THE RULE, AND IT IS BILATERAL BY CONSTRUCTION ──────────────────────────
//   IF an affordance's handler performs NO REAL ACT, its toast MUST ADMIT that.
//
//   Both halves derive; neither is a list:
//     · THE POPULATION derives from the page sources — every `toast(` inside an
//       affordance handler that contains no dispatch, no mutation, no navigation
//       and no download. Add an unbacked affordance tomorrow and it is IN,
//       without anybody editing this file (`CENSUS-MUST-DERIVE-01`).
//     · THE VERDICT derives from the SHIPPED i18n bundle (`resources`), not from
//       a regex over the fragment files — the guard judges the string a user
//       actually sees, in BOTH locales.
//
//   ⚠️ **THERE IS NO EXEMPTION LIST, DELIBERATELY.** An exemption list is the
//   thing that rots (`C9-STALE-BY-FIX-01`): wire the affordance and the row
//   outlives its subject. Here, wiring an affordance removes it from the
//   population automatically, because the handler then contains a real act.
//   The only way to pass is to be honest or to be real.
//
// ── WHY A CLOSED ADMISSION VOCABULARY ──────────────────────────────────────
//   `ADMISSIONS` is a closed set of phrases already shipping in the tree — the
//   register `shipments.toast.reminder` and `carrierAlerted` established. It is
//   NOT free text: a blanket "not implemented" would satisfy a checker while
//   telling a user nothing, which is the failure mode this guard exists to
//   prevent. The honest strings name THE ACT, say it did not happen, and say
//   what is missing.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { resources } from '../lib/i18n';

const PAGES_DIR = __dirname;

/**
 * A real act. If a handler does ANY of these, its toast is OUT of this guard's
 * population.
 *
 * ⚠️ **THE LIMIT, STATED: THIS GUARD JUDGES "NO SIDE EFFECT AT ALL", NEVER
 * "THE SIDE EFFECT MATCHES THE CLAIM."** A React state setter counts as a real
 * act here because for a UI affordance it usually IS one — expanding a dock
 * panel, loading parsed XLSX rows into a grid. That is deliberate under-reach:
 * without it the guard accuses a working import of lying, which would train
 * people to weaken it. The residue it cannot see — a handler that does
 * something SMALLER than it claims, like `SupplierDashboard`'s briefing card
 * dismissing itself while announcing "workflow initiated" — is a HUMAN review
 * question, and that one was found and fixed by hand at R1, not by this rule.
 */
const PERFORMS_REAL_ACT =
  /\b(?:\w*[Mm]utation\.mutate|\w*[Mm]utateAsync|dispatch|navigate|window\.open|createObjectURL|setSearchParams|location\.assign|fetch|set[A-Z]\w*|refetch|invalidateQueries)\s*\(/;

/**
 * Affordance handlers. `on<Something>` — but NEVER a react-query lifecycle
 * callback: a toast inside `onSuccess` is fired BY a real dispatch and is
 * backed by construction. Treating `onSuccess` as an affordance mis-attributes
 * the body and reports the RFQ-create toast — which is fully wired — as a lie.
 */
const AFFORDANCE = new RegExp(
  [
    // inline JSX/prop handler: onClick={() => …}, onQualify={() => …}
    String.raw`\bon(?!Success|Error|Settled|Mutate)[A-Z][A-Za-z0-9]*\s*[:=]\s*\{?\s*\([^)]*\)\s*=>`,
    // NAMED handler hoisted out of the JSX: `const handleExport = () => …`.
    // Without this the guard has a hole exactly where the biggest pages put
    // their affordances — `BuyerGoodsReceipt.handleExport` sat in it.
    String.raw`\bconst\s+handle[A-Za-z0-9]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>`,
  ].join('|'),
  'g',
);

/**
 * The honest register, EN + ID. Phrases that ADMIT the act did not happen.
 * Closed on purpose — see the header.
 */
const ADMISSIONS: readonly RegExp[] = [
  /not available yet/i,
  /future release/i,
  /coming in (?:Phase|a )/i,
  /\(mock\)/i,
  /\(tiruan\)/i,
  /simulated/i,
  /simulasi/i,
  /nothing was/i,
  /not wired/i,
  /pending live/i,
  /will send once/i,
  /will open/i,
  /no .{1,40} was (?:opened|sent|created|queued)/i,
  /belum tersedia/i,
  /rilis mendatang/i,
  /akan hadir|hadir pada/i,
  /tidak ada/i,
  /belum tersambung/i,
  /menunggu kanal/i,
  /akan dikirim setelah/i,
];

const admits = (s: string) => ADMISSIONS.some((r) => r.test(s));

interface Site {
  readonly file: string;
  readonly line: number;
  readonly keys: readonly string[];
  readonly literals: readonly string[];
}

/** Balance ( { [ from `from`, returning the end index of the expression. */
function balancedEnd(src: string, from: number): number {
  let depth = 0;
  let seen = false;
  for (let i = from; i < Math.min(src.length, from + 8000); i++) {
    const c = src[i];
    if (c === '(' || c === '{' || c === '[') {
      depth++;
      seen = true;
    } else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (seen && depth <= 0) return i + 1;
      if (depth < 0) return i;
    }
  }
  return Math.min(src.length, from + 8000);
}

/** DERIVE every unbacked toast site across the shipped pages. */
function deriveUnbackedSites(): Site[] {
  const out: Site[] = [];
  const files = readdirSync(PAGES_DIR).filter(
    (f) => f.endsWith('.tsx') && !f.includes('.test.'),
  );
  for (const file of files) {
    const src = readFileSync(join(PAGES_DIR, file), 'utf8');
    for (const m of src.matchAll(/\btoast\s*\(\s*\{/g)) {
      const idx = m.index ?? 0;
      const pre = src.slice(0, idx);
      const handlers = [...pre.matchAll(AFFORDANCE)];
      const h = handlers[handlers.length - 1];
      if (!h) continue;
      const hStart = h.index ?? 0;
      const body = src.slice(hStart, balancedEnd(src, hStart + h[0].length));
      if (!body.includes('toast')) continue;
      if (PERFORMS_REAL_ACT.test(body)) continue; // backed — not this guard's business
      const keys = [...body.matchAll(/t\('([^']+)'/g)].map((k) => k[1]);
      const literals = [...body.matchAll(/(?:title|description):\s*[`'"]([^`'"]{4,})[`'"]/g)].map(
        (k) => k[1],
      );
      const line = pre.split('\n').length;
      if (out.some((s) => s.file === file && s.line === line)) continue;
      out.push({ file, line, keys, literals });
    }
  }
  return out;
}

const EN = (resources.en.translation ?? {}) as Record<string, string>;
const ID = (resources.id.translation ?? {}) as Record<string, string>;

const SITES = deriveUnbackedSites();

describe('unbacked-toast honesty guard (R1)', () => {
  it('derives a non-empty population — a guard over nothing guards nothing', () => {
    expect(SITES.length).toBeGreaterThan(10);
  });

  it.each(SITES.map((s) => [`${s.file}:${s.line}`, s] as const))(
    'an unbacked affordance admits it in EN — %s',
    (_at, site) => {
      const claims = [
        ...site.keys.map((k) => EN[k]).filter(Boolean),
        ...site.literals,
      ];
      if (claims.length === 0) return; // nothing user-visible to judge
      expect(
        claims.some(admits),
        `No claim admits the act did not happen. Claims: ${JSON.stringify(claims)}`,
      ).toBe(true);
    },
  );

  it.each(SITES.map((s) => [`${s.file}:${s.line}`, s] as const))(
    'an unbacked affordance admits it in ID — %s',
    (_at, site) => {
      const claims = site.keys.map((k) => ID[k]).filter(Boolean);
      if (claims.length === 0) return;
      expect(
        claims.some(admits),
        `ID locale asserts an act with no admission. Claims: ${JSON.stringify(claims)}`,
      ).toBe(true);
    },
  );

  it('every user-visible toast string is externalised (no hardcoded copy)', () => {
    const hardcoded = SITES.filter((s) =>
      s.literals.some((l) => !l.startsWith('t(') && /[a-z]{4}/.test(l)),
    ).map((s) => `${s.file}:${s.line} → ${s.literals.join(' | ')}`);
    expect(hardcoded, `Hardcoded toast copy bypasses both locales:\n${hardcoded.join('\n')}`)
      .toEqual([]);
  });
});
