import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NO_PERSON, FIXTURE_PERSON_PREFIX } from './noPerson';
import { asActorAttribution, isAttributed } from '../lib/enforcement';
import { enforcementSettingStore } from '../services/data/mock/stores/enforcementSettingStore';

// ─────────────────────────────────────────────────────────────────────────────
// C10 §6.3 — THE `sim-usr-*` PIN.
//
// **The namespace is worthless without the pin.** A reserved prefix nobody
// checks is a naming habit, and habits do not survive a deadline. This is the
// mechanism: it fails the floor rather than warning.
//
// WHY IT MUST EXIST BEFORE THE FIRST FIXTURE PERSON: the portal is fixture-first
// by design and will acquire demo people. **A demo person and a real person are
// the same shape.** A governed record — an override, an approval, an enforcement
// setting — naming a demo person is MANUFACTURED PROVENANCE, and retrofitting
// the check means auditing every stored attribution to decide which ones were
// real, against records written precisely because nobody could tell the
// difference at read time.
//
// Free exactly once, and free today.
// ─────────────────────────────────────────────────────────────────────────────

const SRC = path.resolve(__dirname, '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

/**
 * Does this source CONSTRUCT a resolved actor?
 *
 * ⚠️ **THE FIRST VERSION OF THIS MATCHER MADE A FALSE ACCUSATION, AND IT WAS
 * RULE 2 EXACTLY** (`docs/findings.md` §19 / CLAUDE.md): a bare
 * `/kind:\s*'RESOLVED'/` condemned `services/transitions/policies.ts`, whose
 * only occurrence is inside a REFUSAL MESSAGE documenting the shape a caller
 * must send — `"setBy must be { kind: 'RESOLVED', person: … }"`. A string
 * describing a constructor is not a constructor, and widening a matcher
 * creates false accusations as readily as narrowing one creates blind spots.
 *
 * The discriminator: this tree quotes CODE property values with single quotes
 * and writes PROSE (error text) in double quotes or templates. Stripping
 * double-quoted and template spans removes the message and keeps the code.
 * Probed in BOTH directions below — a guard is habitually probed one way only,
 * so one that is wrong about what it should ACCEPT ships looking like it works.
 */
export function constructsResolvedActor(source: string): boolean {
  const withoutProse = source
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  return /kind:\s*'RESOLVED'/.test(withoutProse);
}

describe('⚠️ PROBE THE GUARD BOTH WAYS (§39)', () => {
  it('a known-BAD input is caught — a real constructor', () => {
    expect(constructsResolvedActor("const a = { kind: 'RESOLVED', person: p };")).toBe(true);
  });

  it('a known-GOOD input passes — prose that DESCRIBES one', () => {
    // The exact false accusation this matcher used to make. Asserting only the
    // BAD half would have shipped the accusation.
    expect(
      constructsResolvedActor(
        `throw new Error("setBy must be { kind: 'RESOLVED', person: { personId } }");`,
      ),
    ).toBe(false);
    expect(
      constructsResolvedActor('const s = ' + '`' + "expects { kind: 'RESOLVED' }" + '`' + ';'),
    ).toBe(false);
  });
});

describe('POPULATION GUARD — the scan sees a real tree', () => {
  it('finds this very file, and does not find one that cannot exist', () => {
    // §42b: a scan that returns "nothing bad found" over an EMPTY population
    // looks exactly like a scan that returned a correct answer.
    const files = sourceFiles(SRC);
    expect(files.length).toBeGreaterThan(200);
    expect(files.some((f) => f.endsWith('simUsrNamespace.test.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('this-file-does-not-exist.ts'))).toBe(false);
  });
});

describe('⚠️ THE PIN — no fixture person reaches a RESOLVED attribution', () => {
  it('the namespace is still unused anywhere in src/', () => {
    // The moment this goes red, somebody has minted a demo person — and the
    // assertion below is what stops it reaching a governed record.
    const offenders = sourceFiles(SRC)
      .filter((f) => !f.endsWith('noPerson.ts') && !f.endsWith('simUsrNamespace.test.ts'))
      .filter((f) => fs.readFileSync(f, 'utf8').includes(FIXTURE_PERSON_PREFIX))
      .map((f) => path.relative(SRC, f));
    expect(
      offenders,
      'A FIXTURE PERSON EXISTS. That is allowed — but it must never appear in a\n' +
        'RESOLVED attribution on a governed record (C10 §6.3). Add the store to\n' +
        'the governed-record sweep below before landing it:\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });

  it('no enforcement setting names a fixture person', () => {
    // The one governed record that exists today. `settingHistory` is
    // append-only, so a fixture person landing here could not be edited out —
    // only appended over, which leaves the original in the ledger.
    const rows = enforcementSettingStore.all();
    const named = rows
      .map((r) => asActorAttribution(r.setBy))
      .filter((a): a is NonNullable<typeof a> => a !== undefined)
      .filter(isAttributed)
      .map((a) => a.person.personId)
      .filter((id) => id.startsWith(FIXTURE_PERSON_PREFIX));
    expect(named).toEqual([]);
  });

  it('the seat actor is UNATTRIBUTED, and says WHY — not a `SYSTEM` shrug', () => {
    expect(NO_PERSON.kind).toBe('UNATTRIBUTED');
    expect(NO_PERSON.kind === 'UNATTRIBUTED' && NO_PERSON.reason).toBe('NO_PERSON_IN_SESSION');
    // Known-GOOD control: the parser accepts it, so "UNATTRIBUTED" here is the
    // real shape and not a value the boundary would reject.
    expect(asActorAttribution(NO_PERSON)).toEqual(NO_PERSON);
    expect(isAttributed(NO_PERSON)).toBe(false);
  });

  it('⚠️ NOTHING IN SHIPPED CODE CONSTRUCTS A RESOLVED ACTOR — §6.2 stays free', () => {
    // This is what makes the payload-supplied-RESOLVED seam harmless TODAY: a
    // forged attribution cannot exist because no attribution can. The refusal
    // half of §6.2 is NOT built, and it becomes unfixable only at the FIRST
    // RESOLVED record. This test is the tripwire on that claim.
    const shipped = sourceFiles(SRC).filter(
      (f) => !/\.test\.tsx?$/.test(f) && !f.endsWith('enforcement.ts'),
    );
    const constructors = shipped
      .filter((f) => constructsResolvedActor(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f));
    expect(
      constructors,
      'SHIPPED CODE NOW CONSTRUCTS A RESOLVED ACTOR. C10 §6.2’s second half —\n' +
        'a payload-supplied RESOLVED actor REFUSED BY NAME ON WRITE — must land\n' +
        'BEFORE this does, or forged and genuine attributions become\n' +
        'indistinguishable in a permanent ledger:\n' +
        constructors.join('\n'),
    ).toEqual([]);
  });
});
