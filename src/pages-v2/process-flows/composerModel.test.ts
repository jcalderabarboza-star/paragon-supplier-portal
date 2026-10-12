// FB-2 · THE COMPOSER'S MODEL, HELD. Each edit a person can make is a pure
// function; each is fired here at a draft written to show it, and the act
// picker is fired at the real catalogue by named member.
import { describe, it, expect } from 'vitest';
import { getKnownFlows } from '../../services/transitions';
import { emptyContent, type FlowVersionContent } from '../../services/flowBuilder/flowVersion';
import { liveWorld } from '../../services/flowBuilder/liveWorld';
import { errorsOf, validateVersion } from '../../services/flowBuilder/validateVersion';
import {
  actOptions,
  addStep,
  COMPOSABLE_KINDS,
  earlierSteps,
  elementsPerAct,
  moveStep,
  removeStep,
  sameContent,
  stepsBefore,
  updateStep,
} from './composerModel';

const flow = (entity: string) => getKnownFlows().find((f) => f.entity === entity)!;
const PR = flow('purchaseRequisition');
const start = (): FlowVersionContent => emptyContent(PR.entity, PR.version);
const ids = (content: FlowVersionContent, act = 't_pr_approve'): string[] => stepsBefore(content, act).map((s) => s.id);

describe('FB-2 · the act picker', () => {
  it('the act picker offers exactly the person-fired, surfaced acts of the process', () => {
    // DERIVED HERE, from the registry — not through the function under test.
    const expected = PR.transitions.filter((t) => t.trigger === 'user' && t.surfaceable.surfaced).map((t) => t.id);
    const options = actOptions(PR);
    expect(options.offered.map((d) => d.id)).toEqual(expected);
    expect(expected).toContain('t_pr_approve');
    // Every act of the process is on one side or the other, once.
    expect([...options.offered.map((d) => d.id), ...options.withheld.map((w) => w.def.id)].sort()).toEqual(
      PR.transitions.map((t) => t.id).sort(),
    );
  });

  it('a cascade-fired act and a creation are withheld, each with its own reason', () => {
    const because = (entity: string, id: string) => actOptions(flow(entity)).withheld.find((w) => w.def.id === id)?.because;
    expect(because('quotation', 't_quotation_award')).toBe('cascade');
    expect(because('purchaseRequisition', 't_pr_create')).toBe('creation');
    expect(because('goodsReceipt', 't_gr_post')).toBeDefined();
    expect(actOptions(flow('quotation')).offered.map((d) => d.id)).not.toContain('t_quotation_award');
  });

  it('whatever the picker offers, the library accepts — and whatever it withholds, rule R04 refuses', () => {
    const world = liveWorld();
    // EVERY writable process, not a sample of three: the first build of this
    // spec sampled three that held no person-fired act without a screen, so a
    // picker that offered one went unnoticed (a probe survived it).
    const writable = world.flows.filter((f) => world.wiredEntities.includes(f.entity));
    expect(writable.map((f) => f.entity)).toContain('enforcement');
    expect(actOptions(flow('enforcement')).withheld.map((w) => [w.def.id, w.because])).toContainEqual([
      't_enforcement_set',
      'not-surfaced',
    ]);
    for (const f of writable) {
      const { offered, withheld } = actOptions(f);
      const r04 = (act: string) =>
        validateVersion(addStep(emptyContent(f.entity, f.version), act, 'confirmation'), world).some((x) => x.code === 'R04');
      expect(offered.filter((d) => r04(d.id)).map((d) => d.id), f.entity).toEqual([]);
      expect(withheld.filter((w) => !r04(w.def.id)).map((w) => w.def.id), f.entity).toEqual([]);
    }
  });
});

describe('FB-2 · adding, changing, moving and removing a step', () => {
  it('a step is added last in front of its act, with an id nothing else uses', () => {
    let c = start();
    for (const kind of COMPOSABLE_KINDS) c = addStep(c, 't_pr_approve', kind);
    c = addStep(c, 't_pr_approve', 'approval');
    expect(ids(c)).toEqual(['s_approval_1', 's_confirmation_1', 's_capture_1', 's_approval_2']);
    expect(stepsBefore(c, 't_pr_approve').map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(c.steps.find((s) => s.id === 's_capture_1')!.fields).toEqual([]);
    expect(c.steps.find((s) => s.id === 's_approval_1')!.fields).toBeUndefined();
    // A step in front of another act counts from one, there.
    expect(stepsBefore(addStep(c, 't_pr_submit', 'approval'), 't_pr_submit').map((s) => [s.id, s.order])).toEqual([
      ['s_approval_3', 1],
    ]);
  });

  it('a new step is unfinished, and the rules say so by name — it is not valid until a lane and both languages are written', () => {
    const world = liveWorld();
    const born = addStep(start(), 't_pr_approve', 'approval');
    const codes = () => errorsOf(validateVersion(done, world)).map((f) => `${f.code} ${f.element}`);
    let done = born;
    expect([...new Set(codes())]).toEqual(['R06 s_approval_1', 'R07 s_approval_1']);
    done = updateStep(done, 's_approval_1', {
      lane: 'finance',
      label: { en: 'Finance approval', id: '' },
      instruction: { en: 'Check the budget line.', id: 'Periksa pos anggaran.' },
    });
    // A step with a label in one language cannot be saved as valid — R07 names the step.
    const left = errorsOf(validateVersion(done, world));
    expect(left.map((f) => `${f.code} ${f.element}`)).toEqual(['R07 s_approval_1']);
    expect(left[0].detail).toEqual({ part: 'label', language: 'id', problem: 'missing' });
    done = updateStep(done, 's_approval_1', { label: { en: 'Finance approval', id: 'Persetujuan Keuangan' } });
    expect(codes()).toEqual([]);
    // The id, the act, the kind and the place are not the form's to change.
    expect(done.steps[0]).toMatchObject({ id: 's_approval_1', before: 't_pr_approve', kind: 'approval', order: 1 });
  });

  it('moving exchanges two places; the ends do not move; a step moved ahead of one it must differ from stops naming it', () => {
    let c = start();
    c = addStep(addStep(addStep(c, 't_pr_approve', 'approval'), 't_pr_approve', 'confirmation'), 't_pr_approve', 'capture');
    c = updateStep(c, 's_capture_1', { differentFrom: ['s_approval_1', 's_confirmation_1'] });
    expect(earlierSteps(c, 's_capture_1').map((s) => s.id)).toEqual(['s_approval_1', 's_confirmation_1']);
    expect(earlierSteps(c, 's_approval_1')).toEqual([]);

    expect(sameContent(moveStep(c, 's_approval_1', 'earlier'), c)).toBe(true);
    expect(sameContent(moveStep(c, 's_capture_1', 'later'), c)).toBe(true);

    const moved = moveStep(c, 's_capture_1', 'earlier');
    expect(ids(moved)).toEqual(['s_approval_1', 's_capture_1', 's_confirmation_1']);
    expect(moved.steps.find((s) => s.id === 's_capture_1')!.differentFrom).toEqual(['s_approval_1']);
    // Moving it back restores the order, not the rule that was dropped.
    expect(ids(moveStep(moved, 's_capture_1', 'later'))).toEqual(['s_approval_1', 's_confirmation_1', 's_capture_1']);
    // And no place in the order is ever used twice.
    expect(validateVersion(moved, liveWorld()).filter((f) => f.code === 'R08' || f.code === 'R12')).toEqual([]);
  });

  it('removing a step removes every rule that named it — and nothing the model did not write', () => {
    let c = start();
    c = addStep(addStep(c, 't_pr_approve', 'approval'), 't_pr_approve', 'approval');
    c = updateStep(c, 's_approval_2', { differentFrom: ['s_approval_1'] });
    c = {
      ...c,
      forks: [{ id: 'f_kept', before: 't_pr_approve', condition: { field: 'x', op: '=', value: 1 }, label: { en: 'a', id: 'b' } }],
      checks: [
        { id: 'c_apart', on: 't_pr_approve', rule: { kind: 'different-person', step: 's_approval_1' } },
        { id: 'c_named', on: 't_pr_approve', rule: { kind: 'named-person' } },
      ],
    };
    expect(elementsPerAct(c).get('t_pr_approve')).toBe(5);
    const gone = removeStep(c, 's_approval_1');
    expect(ids(gone)).toEqual(['s_approval_2']);
    expect(gone.steps[0].differentFrom).toEqual([]);
    expect(gone.checks.map((x) => x.id)).toEqual(['c_named']);
    expect(gone.forks.map((x) => x.id)).toEqual(['f_kept']);
    // A new step never takes the id of one that is still there.
    expect(ids(addStep(gone, 't_pr_approve', 'approval'))).toEqual(['s_approval_2', 's_approval_1']);
  });
});
