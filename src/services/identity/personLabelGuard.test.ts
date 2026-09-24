import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { personLabel, personRefusalToken } from './personLabel';
import { SAMPLE_PEOPLE } from './sampleRoster';
import { stripSourceComments } from '../../lib/sourceScan/stripComments';
import { identityEn, identityId } from '../../lib/i18n/identity';
import { ROLE_LABEL_KEY } from '../transitions/handoff';
import { rolesEn } from '../../lib/i18n/roles';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ THE SAMPLE MARKER IS STRUCTURAL, AND THIS IS WHAT HOLDS IT CLOSED.
//
// C10 §8.2 narrowed `ActingPerson` to `{ personId }`, so a record no longer
// carries a name and `personLabel` is the ONE producer of a reader-facing person
// label. That is what makes "(SAMPLE)" a property of RESOLUTION rather than a
// thing five call sites remember to do — and it is only true while nothing
// prints a person any other way.
//
// ⚠️ **THE POPULATION IS DERIVED FROM SOURCE, AND THE UNIT IS THE READ SITE, NOT
// THE FILE** (`ENTRANCE-IS-THE-UNIT-01`). "Does this file import `personLabel`?"
// is the question `SupplierOrders` answered YES to while shipping an ungated
// commit. The question here is: does EVERY expression that reaches
// `.person.personId` in a rendering module pass through the resolver?
// ─────────────────────────────────────────────────────────────────────────────

const SRC = path.resolve(__dirname, '..', '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

/** Non-spec modules that could render. */
const renderingModules = (): string[] =>
  sourceFiles(SRC).filter(
    (f) =>
      !/\.test\.tsx?$/.test(f) &&
      (f.includes(`${path.sep}pages-v2${path.sep}`) ||
        f.includes(`${path.sep}components${path.sep}`)),
  );

/** Every line reading a person's id out of an attribution, with its context. */
interface Read {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/**
 * The PERMITTED consumers of a raw `personId` in a rendering module.
 *
 * ⚠️ **TWO, AND THE SECOND IS NOT A LOOSENING.** `personLabel` produces the
 * marked label. `resolveSamplePerson` is the registry LOOKUP — it returns a row,
 * not a string, so it cannot print anything; `IdentityPanel` uses it to ask
 * *which person is this seat acting as* before rendering the marked label
 * through `identity.actor.sample`, with a SAMPLE badge on every roster row.
 * Treating a lookup as a render would accuse the one surface whose entire job
 * is making the sample identity visible.
 */
const PERMITTED = /(personLabel|resolveSamplePerson)\s*\(/;

/**
 * Is this read handed to a permitted consumer?
 *
 * ⚠️ **A WINDOW, BECAUSE THE FIRST VERSION WAS LINE-ORIENTED AND MADE TWO FALSE
 * ACCUSATIONS ON ITS FIRST RUN** — rule 2, for the second time in this batch and
 * on the seat writing the rule. It condemned `BuyerCompliance.tsx`, where the
 * call simply WRAPS —
 *
 *     personLabel(
 *       doc.declaration.declaredBy.person.personId,
 *       t,
 *     )
 *
 * — and `IdentityPanel.tsx`, where the consumer is the lookup above. Neither was
 * a naked read; both were the matcher reporting on itself.
 *
 * Probed both ways below, because a window wide enough to fix those is also wide
 * enough to be fooled by a NEIGHBOUR's call.
 */
export function readIsGuarded(lines: readonly string[], i: number): boolean {
  const from = Math.max(0, i - 3);
  return PERMITTED.test(lines.slice(from, i + 2).join('\n'));
}

/** Every read, guarded or not — the population the guard filters. */
function allPersonReads(): Read[] {
  const out: Read[] = [];
  for (const f of renderingModules()) {
    const code = stripSourceComments(fs.readFileSync(f, 'utf8'), 'blank', f);
    code.split(/\r?\n/).forEach((text, i) => {
      if (/\.person\.personId\b/.test(text)) {
        out.push({ file: path.relative(SRC, f).split(path.sep).join('/'), line: i + 1, text });
      }
    });
  }
  return out;
}

/** The reads that reach NO permitted consumer — the defect population. */
function personReads(): Read[] {
  const out: Read[] = [];
  for (const f of renderingModules()) {
    const code = stripSourceComments(fs.readFileSync(f, 'utf8'), 'blank', f);
    const lines = code.split(/\r?\n/);
    lines.forEach((text, i) => {
      if (/\.person\.personId\b/.test(text) && !readIsGuarded(lines, i)) {
        out.push({ file: path.relative(SRC, f).split(path.sep).join('/'), line: i + 1, text });
      }
    });
  }
  return out;
}

describe('POPULATION GUARD — the scan sees rendering modules', () => {
  it('finds a real population of modules, and a real population of reads', () => {
    expect(renderingModules().length).toBeGreaterThan(50);
    // ⚠️ MEMBERSHIP, NOT A COUNT. If this were `> 0` it would pass over a
    // matcher that found one read in one file and missed four others.
    const files = new Set(allPersonReads().map((r) => r.file));
    expect(files.size, 'no surface reads a person — this guard is reporting on itself').toBeGreaterThan(
      2,
    );
    expect([...files]).toContain('components/v2-features/PslListingsSection.tsx');
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);

  it('⚠️ THE MATCHER SEES A KNOWN-FALSE FILE AS CLEAN', () => {
    // A module that renders plenty and never touches a person must not appear.
    const files = new Set(allPersonReads().map((r) => r.file));
    expect([...files]).not.toContain('components/ui-v2/Button.tsx');
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);
});

describe('⚠️ PROBE THE PREDICATE BOTH WAYS — at the two false accusations it made', () => {
  it('a WRAPPED call is guarded — the BuyerCompliance shape', () => {
    const lines = [
      '  : personLabel(',
      '      doc.declaration.declaredBy.person.personId,',
      '      t,',
      '    )',
    ];
    expect(readIsGuarded(lines, 1)).toBe(true);
  });

  it('a LOOKUP is guarded — the IdentityPanel shape', () => {
    const lines = ['      ? resolveSamplePerson(identity.actor.person.personId)'];
    expect(readIsGuarded(lines, 0)).toBe(true);
  });

  it('⚠️ A GENUINELY NAKED READ IS NOT GUARDED — or the window swallowed the guard', () => {
    // The known-BAD half. A window wide enough to fix the two above is wide
    // enough to be fooled, so this is what says it still catches anything.
    const lines = ['  return <span>{actor.person.personId}</span>;'];
    expect(readIsGuarded(lines, 0)).toBe(false);
  });

  it('⚠️ AND A DISTANT NEIGHBOUR DOES NOT COVER IT — the window has a limit', () => {
    const lines = [
      '  const a = personLabel(x, t);',
      '',
      '',
      '',
      '',
      '  return <span>{actor.person.personId}</span>;',
    ];
    expect(readIsGuarded(lines, 5)).toBe(false);
  });
});

describe('⚠️ EVERY RENDERED PERSON GOES THROUGH THE ONE RESOLVER', () => {
  it('no surface reads a personId except to hand it to personLabel', () => {
    // No second filter here: `personReads` already excludes guarded reads, and
    // filtering again on the same line would re-admit exactly the wrapped-call
    // shape the predicate was fixed to handle — a weaker assertion wearing a
    // belt-and-braces look.
    const naked = personReads().map((r) => `${r.file}:${r.line} — ${r.text.trim()}`);
    expect(
      naked,
      'A SURFACE PRINTS A PERSON WITHOUT THE RESOLVER, so a SAMPLE identity can\n' +
        'render as a bare name — the one place a demo person reads as a sign-in\n' +
        '(C10 §8.2 / operator ruling I4):\n' +
        naked.join('\n'),
    ).toEqual([]);
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);

  it('⚠️ AND NO SURFACE STORES OR PRINTS A displayName — §8.2, held closed', () => {
    // The field is gone from the type, so `tsc` already refuses a read of it.
    // This catches the shape a type cannot: a surface reintroducing its own
    // person-name field to get the old behaviour back.
    const offenders: string[] = [];
    for (const f of renderingModules()) {
      const code = stripSourceComments(fs.readFileSync(f, 'utf8'), 'blank', f);
      if (/person\s*\.\s*displayName/.test(code)) {
        offenders.push(path.relative(SRC, f).split(path.sep).join('/'));
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
    // A BUDGET, NOT A DEFAULT. This walks and parses every rendering module in
    // src/ ; under parallel suite load it ran 3.3s against the 5s default and
    // flaked once. A timed-out probe never runs its assertion at all, so the
    // budget is what makes the result mean something.
  }, 30_000);
});

describe('⚠️ THE MARKER ITSELF — present, in BOTH locales', () => {
  it('the sample label interpolates and carries a marker in each locale', () => {
    // ⚠️ A DIVERGENT TOKEN PER LOCALE. A probe keyed on a word spelled the same
    // in EN and ID would be an assertion that cannot fail
    // (`i18n-probe-needs-divergent-token`).
    expect(identityEn['identity.actor.sample']).toContain('{{label}}');
    expect(identityId['identity.actor.sample']).toContain('{{label}}');
    expect(identityEn['identity.actor.sample']).toContain('SAMPLE');
    expect(identityId['identity.actor.sample']).toContain('CONTOH');
    expect(identityEn['identity.actor.sample']).not.toContain('CONTOH');
    expect(identityId['identity.actor.sample']).not.toContain('SAMPLE');
  });

  it('every sample key exists in both locales — no half-translated marker', () => {
    const keys = Object.keys(identityEn).filter((k) => k.startsWith('identity.'));
    const missing = keys.filter((k) => identityId[k] === undefined);
    expect(missing, `ID is missing: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('personLabel — what it returns', () => {
  // A translator stub: renders the EN map, and interpolates {{label}}.
  const t = (key: string, opts?: Record<string, unknown>): string => {
    const raw = identityEn[key] ?? rolesEn[key] ?? key;
    return opts
      ? raw.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(opts[k] ?? ''))
      : raw;
  };

  it('marks every roster person, and names them by role and ordinal', () => {
    for (const p of SAMPLE_PEOPLE) {
      const label = personLabel(p.personId, t);
      expect(label, p.personId).toContain('(SAMPLE)');
      expect(label, p.personId).toContain(rolesEn[ROLE_LABEL_KEY[p.role]]);
      expect(label, p.personId).toContain(String(p.ordinal));
    }
  });

  it('⚠️ AN UNRESOLVABLE ID IS NAMED AS UNKNOWN — never guessed, never printed raw', () => {
    const label = personLabel('usr-014', t);
    expect(label).toBe(identityEn['identity.actor.unknown']);
    // Printing the raw id would leak an internal token onto a governed surface.
    expect(label).not.toContain('usr-014');
    // And it must not silently acquire the marker, which would claim a sample
    // identity this portal cannot account for.
    expect(label).not.toContain('(SAMPLE)');
  });

  it('personRefusalToken names the stable id, never a label', () => {
    // A service-layer refusal is plain English by convention and must not carry
    // a person's NAME (D-ID-3). The id is role-shaped, locale-free and stable.
    expect(personRefusalToken('sim-usr-compliance-1')).toBe('sim-usr-compliance-1');
    expect(personRefusalToken('sim-usr-compliance-1')).not.toContain('Compliance');
  });
});
