// @vitest-environment node
// ─────────────────────────────────────────────────────────────────────────────
// THE `surfaceable` GATE (§50).
//
// `trigger` says WHAT FIRES an act. `surfaceable` says WHETHER A PARAGON SCREEN
// IS EVER MEANT TO OFFER IT. They were one field until this batch, they agree
// for most of the tree, and *most* is the defect: the `sapBoundary` population
// is two transitions and disagrees with itself.
//
// ⚠️ THIS GATE ASSERTS ONE DIRECTION ONLY — everything DISPATCHED is
// surfaceable. The converse ("every surfaceable act has a screen") would redden
// the build for the 28 verbs of `USER-VERBS-WITHOUT-SURFACES-01`, which are a
// truthful backlog, not a defect. A gate that forces a backlog to lie about
// itself is worse than no gate.
//
// ⚠️ RULE 4 THROUGHOUT, AND `EMPTY-INPUT-REPORTS-CLEAN-01` FIRST: the population
// guard is the FIRST test and asserts MEMBERSHIP, never a count. Every
// emptiness claim below is paired with a membership claim on the same
// derivation, because this file's own failure mode is deriving nothing and
// reporting it clean.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getKnownFlows, getTransition } from './index';
import { validateFlow } from './validate';
import { PERSONA_ROLES } from './roles';
import type { FlowDefinition, TransitionDef } from './schema';

const allTransitions = (): readonly TransitionDef[] =>
  getKnownFlows().flatMap((f) => f.transitions);

describe('the population itself', () => {
  it('⚠️ FIRST — the registry is seeded and the population is NON-EMPTY', () => {
    // Without this every assertion below passes vacuously over `[]`. Asserts
    // MEMBERSHIP, not a count: a count here would drift and be edited.
    expect(getKnownFlows().length).toBeGreaterThan(10);
    expect(allTransitions().map((t) => t.id)).toContain('t_gr_post');
    expect(allTransitions().map((t) => t.id)).toContain('t_invoice_release_payment');
  });
});

describe('EXHAUSTIVE — a transition cannot exist without a value', () => {
  it('every declared transition carries `surfaceable`', () => {
    const missing = allTransitions()
      .filter((t) => !t.surfaceable || typeof t.surfaceable.surfaced !== 'boolean')
      .map((t) => t.id);
    expect(
      missing,
      'A TRANSITION WITHOUT `surfaceable` IS AN ACT NOBODY DECIDED ABOUT.\n' +
        'The field is required precisely so the decision cannot be skipped:\n' +
        missing.join('\n'),
    ).toEqual([]);
    expect(allTransitions().length).toBeGreaterThan(80);
  });

  it('every NOT-surfaced act states a declared reason, in its own words', () => {
    const REASONS = new Set(['external-fact', 'computed', 'ruled-unsurfaced']);
    const thin = allTransitions()
      .filter((t) => t.surfaceable.surfaced === false)
      .filter(
        (t) =>
          !REASONS.has((t.surfaceable as { because: string }).because) ||
          (t.surfaceable as { why: string }).why.trim().length < 40,
      )
      .map((t) => t.id);
    expect(
      thin,
      'A NOT-SURFACED ACT WITH A PLACEHOLDER REASON ERASES THE ONE DISTINCTION\n' +
        'THE FIELD EXISTS TO CARRY: "no screen is possible" and "a ruling refuses\n' +
        'the screen" have opposite futures.\n' + thin.join('\n'),
    ).toEqual([]);
    // Paired membership: some acts really are not surfaced.
    expect(allTransitions().filter((t) => t.surfaceable.surfaced === false).length).toBeGreaterThan(0);
  });
});

describe('THE INVARIANT THE VERB-LEVEL FORM RESTS ON', () => {
  it('every USER verb maps to exactly ONE persona — asserted, never assumed', () => {
    // `surfaceable` is keyed on the verb, which is exact only while a
    // requiredRole belongs to one persona. That is true of all 46 user verbs
    // today and NOTHING IN THE SCHEMA ENFORCES IT: the day a role is granted to
    // both personas, a verb-level boolean goes silently lossy — it would have to
    // mean "surfaced for somebody" without saying whom. This test is the only
    // thing standing between the design and that failure.
    const offenders = allTransitions()
      .filter((t) => t.trigger === 'user')
      .map((t) => ({
        id: t.id,
        personas: Object.entries(PERSONA_ROLES)
          .filter(([, roles]) => roles.includes(t.requiredRole))
          .map(([p]) => p),
      }))
      .filter((r) => r.personas.length !== 1);
    expect(
      offenders,
      'A USER VERB IS PERMITTED TO A NUMBER OF PERSONAS OTHER THAN ONE.\n' +
        'If it is TWO, `surfaceable` must become per-(verb, persona) before it can\n' +
        'be trusted. If it is ZERO, the role is unmapped and nobody can fire it:\n' +
        JSON.stringify(offenders, null, 2),
    ).toEqual([]);
    expect(allTransitions().filter((t) => t.trigger === 'user').length).toBeGreaterThan(40);
  });
});

// ── THE DERIVATION: WHICH ACTS CAN A PERSON ACTUALLY FIRE?
//    Both halves are required, and the gate's first run proved why. Naming a
//    transition id is NOT firing it: `cascades.ts` registers fan-out targets,
//    `enforcementSeed.ts` seeds governance, the mock adapter names cascade ids
//    in its own plumbing, and `useInvoiceApprove` exists with no consumer. Every
//    one of those named an id, none of them is an operator.
//      HALF 1 — a non-documentation module hands the id to the dispatcher.
//      HALF 2 — the EXPORTED HOOK enclosing that site is called from a surface,
//               or the site IS a surface.
//    A SHOUTING_CONST is never a hook: with a bare-id matcher the first home for
//    `t_invoice_release_payment` resolves to `WIRED_COMMAND_TARGETS`, and taking
//    that for a hook once declared the verb #230 restored unreachable (§49b).
const SRC = path.resolve(__dirname, '../..');
const DOC_HOMES = [
  'services/transitions/flows/',
  'services/transitions/annotations.ts',
  'services/transitions/catalogView.ts',
  'services/transitions/roles.ts',
  'services/transitions/cascades.ts',
  'lib/i18n/',
];
const isSurface = (rel: string): boolean =>
  rel.startsWith('pages-v2/') || rel.startsWith('components/');

function sources(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'test' && e.name !== '__tests__') walk(p);
        continue;
      }
      if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) continue;
      const rel = path.relative(SRC, p).split(path.sep).join('/');
      if (DOC_HOMES.some((d) => rel.startsWith(d))) continue;
      out.set(rel, fs.readFileSync(p, 'utf8'));
    }
  };
  walk(SRC);
  return out;
}

/** The exported function/const enclosing a position — null when it is a registry. */
function enclosingHook(text: string, idx: number): string | null {
  const before = text.slice(0, idx);
  const m = [...before.matchAll(/export function (\w+)|export const (\w+)/g)].pop();
  const name = m ? m[1] || m[2] : null;
  return name && !/^[A-Z0-9_]+$/.test(name) ? name : null;
}

function operatorFirableIds(src: ReadonlyMap<string, string>): ReadonlySet<string> {
  const out = new Set<string>();
  for (const t of allTransitions()) {
    const q = `'${t.id}'`;
    const homes = [...src.entries()].filter(([, text]) => text.includes(q));
    // resolve a real dispatch site before a mere mention
    homes.sort(
      (a, b) =>
        (b[1].includes(`transitionId: ${q}`) ? 1 : 0) - (a[1].includes(`transitionId: ${q}`) ? 1 : 0),
    );
    for (const [rel, text] of homes) {
      if (isSurface(rel)) {
        out.add(t.id);
        break;
      }
      const hook = enclosingHook(text, text.indexOf(q));
      if (!hook) continue;
      const called = [...src.entries()].some(
        ([g, gt]) => g !== rel && isSurface(g) && new RegExp(`\\b${hook}\\s*\\(`).test(gt),
      );
      if (called) {
        out.add(t.id);
        break;
      }
    }
  }
  return out;
}

describe('DISPATCHED ⇒ SURFACEABLE — the one direction this gate asserts', () => {
  const src = sources();
  const firable = operatorFirableIds(src);

  it('⚠️ the derivation found the acts it must find, before anything is concluded', () => {
    // A broken walk returns `{}` and every assertion below passes on nothing.
    expect(firable.has('t_gr_post')).toBe(true);
    expect(firable.has('t_invoice_release_payment')).toBe(true);
    expect(firable.has('t_po_confirm')).toBe(true);
    // And a known-FALSE: an act named only by its flow is not "dispatched".
    expect(firable.has('t_shipment_dock')).toBe(false);
    // …and the three shapes that NAME an id without anybody being able to fire it:
    expect(firable.has('t_invoice_approve')).toBe(false); // a hook with no consumer
    expect(firable.has('t_enforcement_set')).toBe(false); // a seed, not an operator
    expect(firable.has('t_quotation_award')).toBe(false); // the adapter's cascade plumbing
  });

  it('nothing a PERSON can fire is declared unsurfaceable', () => {
    const contradictions = [...firable]
      .map((id) => getTransition(id)!)
      .filter((t) => t.surfaceable.surfaced === false)
      .map((t) => `${t.id} — declared NOT surfaced (${(t.surfaceable as { because: string }).because}) yet an operator can fire it`);
    expect(
      contradictions,
      'AN ACT THE TREE CAN FIRE IS DECLARED UNSURFACEABLE. Either the code has a\n' +
        'path nobody intended, or the declaration is wrong. Both are defects:\n' +
        contradictions.join('\n'),
    ).toEqual([]);
  });

  it('`t_gr_post` — the act that forced the split — is surfaced despite its trigger', () => {
    const post = getTransition('t_gr_post')!;
    expect(post.trigger).toBe('system');
    expect(post.surfaceable.surfaced).toBe(true);
    // Its twin: same sapBoundary shape, same button, the OTHER trigger value.
    const release = getTransition('t_invoice_release_payment')!;
    expect(release.trigger).toBe('user');
    expect(release.surfaceable.surfaced).toBe(true);
    expect(post.sapBoundary).toBe(true);
    expect(release.sapBoundary).toBe(true);
  });
});

describe('THE CENSUS — acts a screen is meant to offer that no screen offers', () => {
  const src = sources();
  const firable = operatorFirableIds(src);
  const census = allTransitions()
    .filter((t) => t.surfaceable.surfaced && !firable.has(t.id) && t.from.length > 0)
    .map((t) => t.id);

  it('⚠️ RULE 4 — the census FLAGS a verb that is surfaceable and unsurfaced', () => {
    // Believing anything the census EXCLUDES requires proving it includes what
    // it must. A census that flags nothing looks exactly like a clean tree, so
    // it must hold a known-true member.
    //
    // ⚠️ **THE MEMBER HAS NOW BEEN REPLACED TWICE, AND THAT IS THE CONTROL
    // WORKING RATHER THAN ROTTING.** `t_pr_revise` / `t_pr_submit` were the
    // original pair and §68 surfaced both; `t_asn_resolve_discrepancy` replaced
    // them and has now been surfaced in its turn. Each time, the retired member
    // moves to the ABSENCE assertion below rather than being deleted — a
    // control that stops holding is turned around, never removed quietly,
    // because its absence is the only thing that fails if a future batch
    // retires the affordance without retiring the verb's `surfaced` flag.
    //
    // The current member is `t_gr_hold`: `surfaced: true`, `from: ['Under
    // Inspection']`, and **nothing in the tree has ever fired it** — it is
    // parked by ruling, not by accident, which is exactly what makes it a
    // stable known-true rather than a defect waiting to be fixed out from under
    // this assertion.
    expect(census).toContain('t_gr_hold');
    expect(census.length).toBeGreaterThan(5);
  });

  it('⚠️ §68 / ASN — and the members this census was built on have LEFT it', () => {
    // The other direction of the same guard, one row longer each time a member
    // graduates. `t_pr_submit` had a button that toasted instead of dispatching
    // and `t_pr_revise` had no surface at all (§49e); both now reach the
    // dispatcher from `BuyerRequisitions`.
    expect(firable.has('t_pr_submit')).toBe(true);
    expect(firable.has('t_pr_revise')).toBe(true);
    expect(census).not.toContain('t_pr_submit');
    expect(census).not.toContain('t_pr_revise');

    // ⚠️ **AND `t_asn_resolve_discrepancy` JOINS THEM.** Its `Discrepancy` state
    // is the only problem state in this portal a LIVE dispatched verb produces
    // (the GR mismatch cascade, from `t_gr_reject` AND `t_gr_partial_approve`),
    // and until this batch nothing could leave it from a screen: the buyer had
    // no ASN surface at all on `/buyer/goods-receipt`, and the supplier had a
    // "Resolve" button that fired an info toast on an atom no supplier lane
    // holds. It is now fired from the GR page's discrepancy section.
    expect(firable.has('t_asn_resolve_discrepancy')).toBe(true);
    expect(census).not.toContain('t_asn_resolve_discrepancy');

    // ⚠️ **AND `t_po_acknowledge` JOINS THEM.** Surfaced in the panel footer on
    // `/supplier/orders`, in its own slot beside `po:confirm`'s.
    expect(firable.has('t_po_acknowledge')).toBe(true);
    expect(census).not.toContain('t_po_acknowledge');

    // ⚠️ **AND ALL THREE INCOMING-SHIPMENT ADVANCE VERBS JOIN THEM (Wave D).**
    // Surfaced on `/supplier/forecasts`, Shipments tab, each in its own slot on
    // the leg's action row.
    //
    // ⚠️ **THE CENSUS CANNOT SEE THE HALF THAT MATTERS, AND SAYING SO HERE IS
    // THE POINT.** It asks "does any source dispatch this id?" — so it reads
    // GREEN the moment a call site exists, on a leg of EITHER direction. What
    // this batch actually ruled is that the verbs are offered on a
    // `principal-to-distributor` leg ONLY, because a to-paragon leg's card
    // renders its linked ASN's state and the stored `lifecycle` these verbs move
    // is never displayed there. A dispatch census is blind to that distinction
    // by construction; `SupplierForecastsAdvance.test.tsx` is what holds it.
    for (const id of [
      't_incomingshipment_ship',
      't_incomingshipment_arrive',
      't_incomingshipment_cancel',
    ]) {
      expect(firable.has(id), `${id} should now be dispatched from a surface`).toBe(true);
      expect(census).not.toContain(id);
    }

    // The paired membership control on the SAME instrument, so the four
    // assertions above cannot pass by the census having collapsed: the leg's
    // own creation verb was surfaced long before this batch and must still read
    // as firable, and `t_gr_hold` (below) must still read as flagged.
    expect(firable.has('t_incomingshipment_report')).toBe(true);
  });

  it('⚠️ AND ITS SIBLING STAYS FLAGGED — `t_po_view` is the control on the control', () => {
    // `t_po_acknowledge` and `t_po_view` are adjacent verbs on the same flow,
    // both `surfaced: true`, and only ONE of them was surfaced. If the census
    // had lost both, the instrument would be reporting on the batch rather than
    // on the tree — the shape rule 1 warns about, one flow down.
    //
    // It is also the reason `Viewed` is a stranded state: `t_po_view` is its
    // sole producer, so nothing a person does can reach it. That is a FLOW
    // question and is deliberately not answered by a surface batch.
    expect(firable.has('t_po_view')).toBe(false);
    expect(census).toContain('t_po_view');
  });

  it('and only THEN: the two verbs RULED unsurfaced are absent — they are decisions, not gaps', () => {
    // This is what `surfaceable === true` buys over a bare field swap. Both are
    // `trigger: 'user'`, so a swap-free census keyed on `trigger` flags them;
    // both are refused by the SAME identity ruling (C10 ·
    // ENF-NO-PERSON-IN-IDENTITY-01), so flagging them would file a decision as
    // a defect.
    expect(census).not.toContain('t_invoice_approve');
    expect(census).not.toContain('t_enforcement_set');
  });

  it('and the verb that used to be a false positive is gone from the other side', () => {
    // `t_gr_post` is `trigger: 'system'` and IS pressed. Any census asking
    // "which acts should a person reach?" through `trigger` could never see it
    // as an act at all — it was invisible to the question, which is a quieter
    // failure than a wrong answer.
    expect(getTransition('t_gr_post')!.surfaceable.surfaced).toBe(true);
    expect(firable.has('t_gr_post')).toBe(true);
    expect(census).not.toContain('t_gr_post');
  });
});

describe('the runtime validator — probed BOTH ways on the same synthetic flow', () => {
  const flow = (surfaceable: unknown): FlowDefinition =>
    ({
      entity: 'probe_surfaceable',
      version: 1,
      states: ['New', 'Done'],
      initial: 'New',
      terminals: ['Done'],
      transitions: [
        {
          id: 't_probe_go',
          from: ['New'],
          to: 'Done',
          trigger: 'user',
          requiredRole: 'po:confirm',
          requiredFields: [],
          policyHooks: [],
          surfaceable,
          version: 1,
        },
      ],
    }) as unknown as FlowDefinition;

  it('KNOWN-GOOD FIRST: a well-formed value VALIDATES', () => {
    // Believing the refusals below requires this to pass. A validator that
    // rejects everything looks exactly like a working validator.
    expect(validateFlow(flow({ surfaced: true })).ok).toBe(true);
    expect(
      validateFlow(
        flow({
          surfaced: false,
          because: 'external-fact',
          why: 'A carrier feed reports this milestone; nobody in Paragon initiates it.',
        }),
      ).ok,
    ).toBe(true);
  });

  it('a missing value is refused', () => {
    const r = validateFlow(flow(undefined));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/surfaceable' is required/);
  });

  it('an invented reason is refused', () => {
    const r = validateFlow(flow({ surfaced: false, because: 'because-i-said-so', why: 'x'.repeat(60) }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/must be one of/);
  });

  it('a placeholder reason is refused — the distinction is the whole point', () => {
    const r = validateFlow(flow({ surfaced: false, because: 'computed', why: 'derived' }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/state WHY in its own words/);
  });
});
