import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, ChevronRight } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import Data from '../../components/ui-v2/Data';
import type { FlowEdge, FlowView } from '../../services/transitions/catalogView';
import { transitionPurposeKey } from '../../services/transitions/annotations';
import { isPerformable, STEP_KIND_KEY } from '../../lib/i18n/stepKind';
import { verbOf } from './flowLayout';

// ────────────────────────────────────────────────────────────────────────────
// PF-1 · THE LIFECYCLE WALK — a reading aid over a diagram, and nothing else.
//
// ⚠️ **THIS IS NOT LEARN, AND THE DISTINCTION IS NOT COSMETIC.** Learn (LN-0 /
// LN-2) walks a REAL record and dispatches REAL verbs through the command
// spine, so a step there lands in the store and in the DR-10 audit trail. This
// walks a DIAGRAM: the cursor is React state, it advances nothing, it dispatches
// nothing, it is scoped to the session and it is gone on reload. Confusing the
// two would be the worst class of dishonesty this page could commit — a reader
// believing they had moved a purchase order by reading about one.
//
// So the surface says so, in the TMS register, ABOVE the controls rather than
// in a footnote, and the buttons themselves are split by what the schema says
// drives the step: an operator verb reads "advance", a system or cascade verb
// reads "observe" — SHOWN as observed, never performed. The cursor moves either
// way, because the point is to read the machine; what changes is the claim.
//
// Which steps exist is DERIVED (`view.edges` out of the cursor). There is no
// authored script, so the walk cannot offer a step the machine does not have.
// ────────────────────────────────────────────────────────────────────────────

interface LifecycleWalkProps {
  view: FlowView;
  cursor: string | null;
  /** States visited this session, oldest first. Reset on reload, by design. */
  path: readonly string[];
  onStep: (edge: FlowEdge) => void;
  onReset: () => void;
}

const LifecycleWalk: React.FC<LifecycleWalkProps> = ({
  view,
  cursor,
  path,
  onStep,
  onReset,
}) => {
  const { t } = useTranslation();

  // Not started ⇒ the birth edges (or, for a machine with no creation verb, its
  // seed states — the analyzer's ruling 3 read forward instead of backward).
  const started = cursor !== null;
  const steps: readonly FlowEdge[] = started
    ? view.edges.filter((e) => e.from === cursor)
    : view.edges.filter((e) => e.from === null);
  const seeds = started ? [] : view.seededFrom;

  // The defs behind the drawable edges — a settlement edge borrows its verb's
  // id, which is why the performability read excludes it explicitly above.
  const defById = React.useMemo(
    () => new Map(view.transitions.map((tr) => [tr.def.id, tr.def])),
    [view.transitions],
  );

  const current = started ? view.states.find((s) => s.name === cursor) : undefined;
  const facts = current?.facts ?? [];

  return (
    <section className="rounded-md border border-border-subtle bg-bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-section text-text-primary">{t('processFlows.walk.title')}</h3>
          <p className="mt-1 max-w-prose text-meta text-text-secondary">
            {t('processFlows.walk.contract')}
          </p>
          <p className="mt-1 max-w-prose text-meta text-text-tertiary">
            {t('processFlows.walk.notLearn')}
          </p>
        </div>
        <Button variant="secondary" icon={RotateCcw} onClick={onReset} className="shrink-0">
          {t('processFlows.walk.reset')}
        </Button>
      </div>

      {/* Where the cursor is, and how it got there. */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-label uppercase text-text-tertiary">
          {t('processFlows.walk.cursor')}
        </span>
        {path.length === 0 ? (
          <span className="text-meta text-text-tertiary">{t('processFlows.walk.notStarted')}</span>
        ) : (
          path.map((state, i) => (
            <span key={`${state}-${i}`} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={12} className="text-text-tertiary" />}
              <Data
                className={
                  i === path.length - 1
                    ? 'rounded-sm bg-action-soft px-1.5 py-0.5 text-[11px]'
                    : 'text-[11px] text-text-tertiary'
                }
              >
                {state}
              </Data>
            </span>
          ))
        )}
      </div>

      {/* The steps the machine declares from here. */}
      <div className="mt-3 space-y-2">
        {!started && seeds.length > 0 && steps.length === 0 && (
          <p className="text-meta text-text-secondary">
            {t('processFlows.walk.noCreationVerb', { states: seeds.join(', ') })}
          </p>
        )}
        {!started &&
          steps.length === 0 &&
          seeds.map((seed) => (
            <button
              key={`seed-${seed}`}
              type="button"
              onClick={() =>
                onStep({
                  id: `seed#${seed}`,
                  transitionId: '',
                  from: null,
                  to: seed,
                  kind: 'creation',
                  settlement: false,
                  cascade: false,
                })
              }
              className="flex w-full items-center justify-between gap-3 rounded-md border border-border-subtle px-3 py-2 text-left hover:bg-bg-hover"
            >
              <span className="text-meta text-text-secondary">
                {t('processFlows.walk.seedAt')}
              </span>
              <Data className="text-[11px]">{seed}</Data>
            </button>
          ))}

        {steps.map((edge) => {
          // THE SURFACE AXIS, ASKED OF THE FIELD THAT ANSWERS IT (§52). This
          // read `kind === 'operator-action' || kind === 'creation'` and got
          // two births wrong in the direction that matters: `t_po_issue` and
          // `t_shipment_create` arrive from S/4HANA and the TMS as facts, and
          // the walk offered both as steps the reader ADVANCES. `creation` is
          // the structural axis; it never answered this question.
          const def = defById.get(edge.transitionId);
          const operator = !edge.settlement && def !== undefined && isPerformable(def);
          // PF-2 — the purpose belongs HERE more than anywhere else on the page:
          // the walk is the surface where a reader is choosing between two verbs,
          // and "why would I do this" is the only question that separates them.
          // The SETTLEMENT edge deliberately has none — it is not a verb, it is
          // where an async boundary lands the entity, and annotating it would
          // mean authoring a purpose for something nobody performs.
          const purpose = edge.settlement ? null : transitionPurposeKey(edge.transitionId);
          return (
            <div
              key={edge.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border-subtle px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <Data className="text-[11px]">{verbOf(edge.transitionId)}</Data>
                  <ChevronRight size={12} className="text-text-tertiary" />
                  <Data className="text-[11px]">{edge.to}</Data>
                  <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    {edge.settlement
                      ? t('processFlows.walk.viaSettlement')
                      : t(STEP_KIND_KEY[edge.kind])}
                  </span>
                </span>
                {purpose && (
                  <p className="mt-1 max-w-prose text-[11px] leading-relaxed text-text-secondary">
                    {t(purpose)}
                  </p>
                )}
              </span>
              <Button
                variant={operator ? 'outline' : 'secondary'}
                onClick={() => onStep(edge)}
                className="shrink-0 !px-3 !py-1.5 text-xs"
              >
                {operator ? t('processFlows.walk.advance') : t('processFlows.walk.observe')}
              </Button>
            </div>
          );
        })}

        {started && steps.length === 0 && (
          <p className="text-meta text-text-secondary">
            {current?.isTerminal
              ? t('processFlows.walk.declaredEnding')
              : t('processFlows.walk.noExit')}
          </p>
        )}

        {facts.length > 0 && (
          <div className="rounded-md border border-dashed border-border-subtle px-3 py-2">
            <p className="text-[11px] text-text-tertiary">{t('processFlows.walk.factsHere')}</p>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {facts.map((id) => (
                <Data key={id} className="text-[11px] text-text-secondary">
                  {verbOf(id)}
                </Data>
              ))}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default LifecycleWalk;
