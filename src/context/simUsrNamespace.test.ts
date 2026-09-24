import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NO_PERSON, FIXTURE_PERSON_PREFIX } from './noPerson';
import { asActorAttribution, isAttributed } from '../lib/enforcement';
import { enforcementSettingStore } from '../services/data/mock/stores/enforcementSettingStore';
import { pslStore } from '../services/data/mock/stores/pslStore';
import { materialRequestStore } from '../services/data/mock/stores/materialRequestStore';
import { customRoleStore } from '../services/transitions/customRoles';
import {
  SAMPLE_PEOPLE,
  SAMPLE_PERSON_PREFIX,
  isSampleActor,
} from '../services/identity/sampleRoster';
import { seedPslListings } from '../services/data/mock/pslSeed';
import { seedMaterialRequests } from '../services/data/mock/materialRequestSeed';
import { ATTRIBUTION_KEYS } from '../services/identity/attributionKeys';
// ⚠️ **THE SHARED, PARSER-BASED COMMENT SCAN — AND THE FIRST DRAFT OF THIS FILE
// HAND-ROLLED ITS OWN TWO-REGEX ONE.** That is the exact pattern
// `stripComments.ts` was written to make extinct, and `stripComments.test.ts`
// guards against by name: a LINE comment containing `/*` opens a false block
// that blanks every line down to the next `*` + `/`, and the loss reads as
// "nothing found" — `SILENT-PESSIMISM-TERMINATES-THE-INVESTIGATION-01`. The
// re-implementation was caught by the shipped instrument, which is the order
// `REIMPLEMENTATION-CONTRADICTS-THE-INSTRUMENT-01` says to trust.
import { stripSourceComments } from '../lib/sourceScan/stripComments';

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

describe('⚠️ PROBE THE COMMENT STRIP BOTH WAYS — at the defect it really made', () => {
  const strip = (src: string) => stripSourceComments(src, 'blank', 'probe.ts');

  it('a prefix written in PROSE is removed — the three false accusations, replayed', () => {
    // ⚠️ **THE PROBE INPUT IS A DEFECT THIS BRANCH REALLY HAD**, not a synthetic
    // one: the first matcher here used a bare `includes` and condemned
    // `identitySources.ts`, `enforcement.ts` and `enforcement.test.ts` — all
    // three of which merely EXPLAIN the namespace. Rule 2, fired on the seat
    // writing the rule.
    expect(strip('// MEMBERSHIP, NOT THE `sim-usr-` SPELLING')).not.toContain('sim-usr-');
    expect(strip('/** reserves `sim-usr-*` for demo people */')).not.toContain('sim-usr-');
  });

  it('a prefix written in CODE survives — or the pin would catch nothing', () => {
    // The known-GOOD half. Without it, a strip that returned '' would pass the
    // case above and silently disable the whole pin.
    expect(strip("const id = 'sim-usr-procurement-1';")).toContain('sim-usr-');
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
  // ⚠️ **THIS ASSERTION READ "the namespace is still unused anywhere in src/",
  // AND IT WENT RED EXACTLY AS ITS OWN FAILURE MESSAGE PREDICTED.** That message
  // named the disposal and this is it, verbatim: *"A FIXTURE PERSON EXISTS. That
  // is allowed — but it must never appear in a RESOLVED attribution on a
  // governed record (C10 §6.3). Add the store to the governed-record sweep
  // below before landing it."*
  //
  // The replacement is NARROWER, not weaker. "Unused" was only ever a proxy for
  // "nobody has minted a person we cannot account for"; now that people exist,
  // the honest form of that claim is that the namespace is spelled in exactly
  // the modules entitled to spell it, and that every id carrying it resolves to
  // a roster row. A file that mints `sim-usr-whoever` on its own still fails.
  //
  // ⚠️ **AND THIS IS THE ONE PLACE A `sim-usr-` PREFIX MAY BE READ AS A STRING
  // TO DECIDE SOMETHING** (operator ruling R2). Everywhere else — the loosening
  // gate, the override gate, the storage reader — the question is *is this one
  // of our fixture people?* and the answer is ROSTER MEMBERSHIP, because a
  // prefix check says yes to `sim-usr-anything` including a value a caller
  // invented. This test's whole job is policing the spelling, which is why it,
  // and only it, reads the spelling.
  it('the namespace is spelled ONLY where it is entitled to be', () => {
    // ⚠️ **ENTITLEMENT IS BY LOCATION, NOT BY A FILE LIST** — and the list was
    // tried first and went stale by two files inside this same batch.
    // `services/identity/` is the roster's own module: the registry, the seeds'
    // actors derived from it, and their specs. A spec there that PINS a named
    // member is the correct instrument (`DATA-POPULATION-INSTRUMENT-SURVIVES-
    // ITS-CORPUS-01`), and it goes red if the roster renames that person —
    // which is drift being CAUGHT, not drift happening.
    //
    // Everything else in the tree must reach a person through the roster.
    const ENTITLED_DIR = path.join(SRC, 'services', 'identity') + path.sep;
    const ENTITLED_FILES = [
      'noPerson.ts',             // declares the reserved prefix
      'simUsrNamespace.test.ts', // this pin
    ];
    // ⚠️ **COMMENTS ARE STRIPPED FIRST, AND THE FIRST VERSION OF THIS MATCHER
    // DID NOT — IT MADE THREE FALSE ACCUSATIONS ON ITS FIRST RUN.** A bare
    // `includes(FIXTURE_PERSON_PREFIX)` condemned `identitySources.ts`,
    // `enforcement.ts` and `enforcement.test.ts`, all three of which merely
    // EXPLAIN the namespace in prose — *"MEMBERSHIP IN THE ROSTER IS THE TEST,
    // NOT THE `sim-usr-` SPELLING"* is a sentence about the rule, not a minting
    // of a person. That is rule 2 exactly: widening a matcher creates false
    // accusations as readily as narrowing one creates blind spots, and it fired
    // on the seat writing the rule.
    //
    // The discriminator is the one `constructsResolvedActor` already uses in
    // this file, moved up a layer: strip what a reader writes, keep what the
    // machine runs.
    const offenders = sourceFiles(SRC)
      .filter((f) => !f.startsWith(ENTITLED_DIR))
      .filter((f) => !ENTITLED_FILES.some((e) => f.endsWith(e)))
      .filter((f) =>
        stripSourceComments(fs.readFileSync(f, 'utf8'), 'blank', f).includes(
          FIXTURE_PERSON_PREFIX,
        ),
      )
      .map((f) => path.relative(SRC, f));
    expect(
      offenders,
      'A MODULE MINTS A FIXTURE PERSON ID OF ITS OWN. Every sample person must\n' +
        'come from the roster, or its id can drift from the roster with nothing\n' +
        'red in between (C10 §6.3):\n' +
        offenders.join('\n'),
    ).toEqual([]);
    // A BUDGET, NOT A DEFAULT. This parses every file in src/ through TypeScript
    // to strip comments, which is the price of not repeating the three false
    // accusations a raw includes() made. The 5s default is not enough on this
    // tree, and a timed-out probe never runs its assertion at all - a timeout is
    // not a verdict. The pageWidth-guard precedent (#369).
  }, 30_000);

  it('CONTROL — the two prefixes are the same string, pinned rather than imported', () => {
    // `sampleRoster.ts` re-declares the prefix so it can keep ZERO runtime
    // imports (which is what lets `lib/enforcement.ts` read it without a cycle).
    // Two constants are only safe while something asserts they agree.
    expect(SAMPLE_PERSON_PREFIX).toBe(FIXTURE_PERSON_PREFIX);
  });

  it('every roster id carries the namespace, and resolves', () => {
    expect(SAMPLE_PEOPLE.length).toBeGreaterThan(5);
    for (const p of SAMPLE_PEOPLE) {
      expect(p.personId.startsWith(FIXTURE_PERSON_PREFIX), p.personId).toBe(true);
      expect(isSampleActor(p.personId), p.personId).toBe(true);
    }
    // Known-FALSE control: a well-spelled id that is NOT on the roster must be
    // refused, or `isSampleActor` is a prefix check wearing a lookup's clothes.
    expect(isSampleActor(`${FIXTURE_PERSON_PREFIX}not-a-real-person`)).toBe(false);
  });

  it('⚠️ EVERY STORED ATTRIBUTION RESOLVES — no store names a person we do not have', async () => {
    // ⚠️ **THE SWEEP THE RETIRED ASSERTION TOLD US TO WRITE.** The seeded lanes
    // now carry SAMPLE actors by ruling (R4), so "no fixture person anywhere" is
    // no longer the claim. The claim is that no stored attribution names anybody
    // the roster cannot resolve — an id that resolves to nobody is manufactured
    // provenance whether or not it is spelled `sim-usr-`.
    //
    // ⚠️ **THE POPULATION IS DERIVED FROM THE STORES' OWN ROWS**, never from a
    // list of fields: `ATTRIBUTION_KEYS` is pinned to the declared
    // `ActorAttribution` fields, so a twelfth attributed field joins this sweep
    // without anybody editing it.
    await seedPslListings();
    await seedMaterialRequests();
    const rows: unknown[] = [
      ...pslStore.all(),
      ...pslStore.all().flatMap((r) => r.statusHistory),
      ...materialRequestStore.all(),
      ...customRoleStore.all(),
      ...enforcementSettingStore.all(),
    ];
    expect(rows.length, 'an empty sweep reports clean over nothing (§42b)').toBeGreaterThan(10);

    const unresolvable: string[] = [];
    for (const row of rows) {
      for (const key of ATTRIBUTION_KEYS) {
        const a = asActorAttribution((row as Record<string, unknown>)[key]);
        if (a && isAttributed(a) && !isSampleActor(a.person.personId)) {
          unresolvable.push(`${key}: ${a.person.personId}`);
        }
      }
    }
    expect(unresolvable, unresolvable.join('\n')).toEqual([]);

    // CONTROL — the sweep really did SEE resolved actors. Without this it would
    // pass identically over a corpus that named nobody at all, which is the
    // reading `EMPTY-INPUT-REPORTS-CLEAN-01` warns is indistinguishable.
    const seen = rows.flatMap((row) =>
      ATTRIBUTION_KEYS.map((k) => asActorAttribution((row as Record<string, unknown>)[k])).filter(
        (a): a is NonNullable<typeof a> => a !== undefined && isAttributed(a),
      ),
    );
    expect(seen.length, 'the sweep found no RESOLVED actor — it proves nothing').toBeGreaterThan(0);
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

  // ⚠️ **THE TRIPWIRE FIRED, AND IT FIRED HAVING DONE ITS JOB.** It read
  // *"NOTHING IN SHIPPED CODE CONSTRUCTS A RESOLVED ACTOR — §6.2 stays free"*,
  // and its message named the condition that had to be met before it could go:
  // *"C10 §6.2's second half — a payload-supplied RESOLVED actor REFUSED BY NAME
  // ON WRITE — must land BEFORE this does."*
  //
  // It landed, in this branch, ahead of the roster: the dispatcher refuses every
  // key under which an actor could arrive (`ACTOR_IN_PAYLOAD`). So the tripwire
  // is REPLACED BY THE THING IT WAS WAITING FOR — the refusal it demanded is now
  // what gets asserted, which is the only honest way to retire a guard whose
  // premise was met rather than abandoned.
  it('⚠️ §6.2 IS BUILT — the refusal the old tripwire demanded before this point', () => {
    const dispatcher = fs.readFileSync(
      path.join(SRC, 'services', 'transitions', 'dispatcher.ts'),
      'utf8',
    );
    expect(dispatcher).toContain('ACTOR_IN_PAYLOAD');
    expect(dispatcher).toContain('attributionKeysIn(payload)');
    // And the population it refuses over is non-empty and names the field C10
    // §8.3 filed against us by name.
    expect(ATTRIBUTION_KEYS.length).toBeGreaterThan(5);
    expect(ATTRIBUTION_KEYS).toContain('setBy');
  });

  it('⚠️ NO FLOW REQUIRES AN ATTRIBUTION KEY IN ITS PAYLOAD — §8.3, closed', () => {
    // The other half of the same flip. A `requiredFields` naming an attribution
    // key would demand the very thing the dispatcher refuses, making the verb
    // unreachable — and would mean somebody had reintroduced attribution by
    // assertion and papered the refusal over.
    const flows = sourceFiles(path.join(SRC, 'services', 'transitions', 'flows'));
    const offenders: string[] = [];
    for (const f of flows) {
      // ⚠️ COMMENTS STRIPPED, AND THIS MATCHER MADE THE MISTAKE TOO.
      // `purchaseRequisition.flow.ts` DISCUSSES the shape it did not build —
      // "The obvious build was `requiredFields: ['approvedBy']` behind a hook" —
      // and a raw read condemned it for the sentence explaining why it is absent.
      const src = stripSourceComments(fs.readFileSync(f, 'utf8'), 'blank', f);
      for (const m of src.matchAll(/requiredFields:\s*\[([^\]]*)\]/g)) {
        for (const key of ATTRIBUTION_KEYS) {
          if (new RegExp(`'${key}'`).test(m[1])) {
            offenders.push(`${path.relative(SRC, f)} — requiredFields names '${key}'`);
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
    // CONTROL: the derivation saw real flows, with real required fields.
    const anyRequired = flows.some((f) =>
      /requiredFields:\s*\['/.test(stripSourceComments(fs.readFileSync(f, 'utf8'), 'blank', f)),
    );
    expect(anyRequired, 'the flow scan found nothing — it is reporting on itself').toBe(true);
  });
});
