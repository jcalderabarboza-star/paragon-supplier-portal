import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, AlertTriangle } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import FlowDiagram from './process-flows/FlowDiagram';
import LifecycleWalk from './process-flows/LifecycleWalk';
import { looseEndKindKey, reasonKey, ALL_REASONS } from './process-flows/labels';
import { verbOf } from './process-flows/flowLayout';
import { STEP_KIND_KEY } from '../lib/i18n/stepKind';
import { getKnownFlows } from '../services/transitions';
import { entityPurposeKey, transitionPurposeKey } from '../services/transitions/annotations';
import {
  buildCatalogView,
  type AnnotatedLooseEnd,
  type FlowEdge,
  type FlowView,
  type TransitionView,
} from '../services/transitions/catalogView';

// ────────────────────────────────────────────────────────────────────────────
// PF-1 · PROCESS FLOWS — the surface for the analyzer PF-0 built.
//
// ⚠️ **THE MODULE CANNOT SHOW A STATE THE MACHINE DOES NOT HAVE, BECAUSE THERE
// IS NO OTHER PLACE A STATE COULD COME FROM.** The page's only data source is
// `buildCatalogView(getKnownFlows())`. There is no fixture, no diagram file, no
// authored node list, and deliberately no escape hatch by which a nicer-looking
// picture could be drawn — a hand-drawn flow diagram is a SECOND COPY of a
// machine, and the second copy is the one that rots, silently, because nothing
// type-checks a picture.
//
// ── WHAT IS REAL HERE, AND WHAT IS NOT (D-CENSUS-8) ─────────────────────────
//   REAL: the catalog. States, transitions, triggers, roles, required fields,
//   policy-hook names, SAP boundaries, settlement targets, cascade links,
//   terminals, branch points, and every count — all read from the shipped
//   schema at runtime.
//   REAL: the loose-end census. The nine rows are DERIVED first (`analyzeFlow`)
//   and annotated second, so an exemption cannot outlive its subject.
//   NOT REAL: the lifecycle walk. A local cursor in React state. It advances
//   nothing, dispatches nothing, and resets on reload.
//   NOT REAL: any flow's underlying DATA. The per-flow marker states both axes
//   separately — whether the verbs dispatch, and where the read surface's rows
//   come from — because averaging them picks which lie to tell.
//
// ── THE ONE AUTHORED THING (PF-2) ──────────────────────────────────────────
// ⚠️ **PURPOSE IS AUTHORED, AND IT IS THE ONLY THING ON THIS PAGE THAT IS.**
// PF-1 could draw the whole catalog and say what none of it was FOR
// (`PF1-NO-PURPOSE-ANNOTATION-01`), because purpose is the one thing the schema
// does not carry: `trigger: 'user'` says a person does it, never why a person
// would. So PF-2 authors one sentence per machine and per verb —
// `services/transitions/annotations.ts` for the keys, `lib/i18n/
// processFlowPurpose.ts` for the words, bilaterally pinned to `getKnownFlows()`
// in both directions.
//
// The prose is fenced by the rule it ships under: NO PURPOSE RESTATES A MACHINE
// FACT. State names, roles, triggers and field lists render from the registry,
// on the same row, so a sentence repeating one would be a second copy of it —
// and the copy is the half that goes wrong silently. Held as a test over both
// languages, not as an instruction to whoever edits next.
//
// The census `note` is still rendered verbatim and labelled as source text: it
// is existing recorded data, not new prose, and a reader who can see the
// recorded decision is the entire reason the census exists.
// ────────────────────────────────────────────────────────────────────────────

/** The two-axis honest marker, per flow. Both looked up; neither assertable. */
const FlowProvenance: React.FC<{ view: FlowView }> = ({ view }) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning-hover">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-warning" />
        {view.feed === null
          ? t('processFlows.provenance.noReadSurface')
          : t('processFlows.provenance.fixtureFeed', { capability: view.capability })}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${
          view.dispatches ? 'text-info' : 'text-text-tertiary'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-sm ${view.dispatches ? 'bg-info' : 'bg-text-tertiary'}`}
        />
        {view.dispatches
          ? t('processFlows.provenance.dispatches')
          : t('processFlows.provenance.unwired')}
      </span>
    </span>
  );
};

const LooseEndRow: React.FC<{ end: AnnotatedLooseEnd }> = ({ end }) => {
  const { t } = useTranslation();
  return (
    <li className="rounded-md border border-warning/40 bg-warning-soft/40 px-3 py-2.5">
      <span className="flex flex-wrap items-center gap-2">
        <AlertTriangle size={13} className="text-warning-hover" aria-hidden="true" />
        <Data className="text-[11px]">{end.subject}</Data>
        <span className="text-[11px] text-text-secondary">{t(looseEndKindKey(end.kind))}</span>
        {/* The reason TOKEN, verbatim — it is the census's own closed-vocabulary
            word, and it is what a reader traces back to `looseEndCensus.ts`.
            The gloss for each token is in the reading key on the rail. */}
        <StatusPill variant="warning" className="text-[10px]">
          <Data className="text-[10px] text-warning-hover">
            {end.reason ?? t('processFlows.reason.uncensused')}
          </Data>
        </StatusPill>
      </span>
      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-text-secondary">
        {end.detail}
      </p>
      {end.note ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-text-tertiary">
          <span className="text-label uppercase">{t('processFlows.looseEnd.censusNote')}</span>{' '}
          {end.note}
        </p>
      ) : null}
    </li>
  );
};

const TransitionRow: React.FC<{ tv: TransitionView }> = ({ tv }) => {
  const { t } = useTranslation();
  const { def } = tv;
  // PF-2. `null` is unreachable for a registered verb (the bilateral test makes
  // it so) — and it renders as NOTHING rather than as an echoed key, because a
  // reader shown `processFlows.purpose.t_whatever` has been handed a defect
  // dressed as a sentence.
  const purpose = transitionPurposeKey(def.id);
  return (
    <>
    <TableRow className={purpose ? '!border-b-0' : ''}>
      <TableCell className="py-3 align-top">
        <Data className="text-[11px]">{def.id}</Data>
      </TableCell>
      <TableCell className="py-3">
        <span className="flex flex-wrap items-center gap-1">
          <Data className="text-[11px] text-text-secondary">
            {def.from.length > 0 ? def.from.join(' · ') : t('processFlows.badge.birth')}
          </Data>
          <span className="text-text-tertiary">→</span>
          <Data className="text-[11px]">{def.to}</Data>
        </span>
      </TableCell>
      <TableCell className="py-3 whitespace-nowrap text-[11px] text-text-secondary">
        {t(STEP_KIND_KEY[tv.kind])}
        {/* THE OTHER AXIS, VERBATIM. The badge above answers "can anyone here
            perform this"; this answers "what fires it". They are two questions
            and §50 split the fields that answer them, so the row shows both
            rather than letting one stand in for the other. Raw and
            untranslated by design — it is the schema token, not prose. */}
        <span className="ml-1 text-text-tertiary">({def.trigger})</span>
      </TableCell>
      <TableCell className="py-3">
        <Data className="text-[11px]">{def.requiredRole}</Data>
        <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-text-tertiary">
          {tv.personas.length > 0
            ? tv.personas.map((p) => t(`nav.persona.${p}`)).join(' · ')
            : t('processFlows.role.unmapped')}
        </span>
      </TableCell>
      <TableCell className="py-3">
        {def.requiredFields.length > 0 ? (
          <Data className="block text-[11px] text-text-secondary">
            {def.requiredFields.join(', ')}
          </Data>
        ) : (
          <span className="text-[11px] text-text-tertiary">—</span>
        )}
        {def.policyHooks.length > 0 ? (
          <Data className="mt-0.5 block text-[10px] text-text-tertiary">
            {def.policyHooks.join(', ')}
          </Data>
        ) : null}
      </TableCell>
      <TableCell className="py-3">
        <span className="flex flex-wrap gap-1">
          {tv.recordsFact && (
            <StatusPill variant="neutral" className="text-[10px]">
              {t('processFlows.flag.recordsFact')}
            </StatusPill>
          )}
          {tv.sapBoundary && (
            <StatusPill variant="info" className="text-[10px]">
              {t('processFlows.flag.sapBoundary', { state: tv.settlesTo })}
            </StatusPill>
          )}
          {tv.fansOutTo.map((link) => (
            <StatusPill key={link.targetTransitionId} variant="info" className="text-[10px]">
              {t('processFlows.flag.fansOut', {
                entity: link.targetEntity,
                verb: verbOf(link.targetTransitionId),
              })}
            </StatusPill>
          ))}
          {def.trigger === 'cascade' && (
            <StatusPill
              variant={tv.firedBy.length > 0 ? 'info' : 'warning'}
              className="text-[10px]"
            >
              {tv.firedBy.length > 0
                ? t('processFlows.flag.firedBy', { sources: tv.firedBy.map(verbOf).join(', ') })
                : t('processFlows.flag.firedByNothing')}
            </StatusPill>
          )}
        </span>
      </TableCell>
    </TableRow>
    {/* PF-2 — THE PURPOSE GETS ITS OWN FULL-WIDTH ROW, and the reason is
        measured rather than aesthetic. Inside the first column the sentence was
        laid out at 132px — twelve lines of eleven-pixel text beside a one-line
        id — because the other five columns already claim the table's width.
        Spanning the row costs the table NOTHING horizontally (it was already
        863px against an 816px wrapper before this batch) and gives the sentence
        a readable measure. The teal rule marks it as the authored line: the one
        thing in this table nothing derived. */}
    {purpose && (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={6} className="!py-0 !pt-0 pb-3">
          <p
            data-testid={`pf-purpose-${def.id}`}
            className="max-w-prose border-l-2 border-teal/40 pl-3 text-[11px] leading-relaxed text-text-secondary"
          >
            {t(purpose)}
          </p>
        </TableCell>
      </TableRow>
    )}
    </>
  );
};

const ProcessFlows: React.FC = () => {
  const { t } = useTranslation();
  // The registry is seeded once at import (`services/transitions` barrel), so
  // this is a stable derivation, not a read that can fail. There is no loading
  // or error state here on purpose: the schema is in the bundle.
  const catalog = useMemo(() => buildCatalogView(getKnownFlows()), []);
  const [selected, setSelected] = useState<string>(
    () => catalog.flows[0]?.entity ?? '',
  );
  const view = catalog.flows.find((f) => f.entity === selected) ?? catalog.flows[0];

  // The walk's whole memory. Session-scoped by construction — this is React
  // state, so a reload starts over, which is exactly the contract on the copy.
  const [path, setPath] = useState<readonly string[]>([]);
  const cursor = path.length > 0 ? path[path.length - 1] : null;

  const selectFlow = (entity: string): void => {
    setSelected(entity);
    setPath([]);
  };
  const step = (edge: FlowEdge): void => setPath((p) => [...p, edge.to]);

  if (!view) return null;

  const flowPurpose = entityPurposeKey(view.entity);

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={[t('processFlows.crumb.platform'), t('processFlows.crumb.processFlows')]}
        title={t('processFlows.header.title')}
        subtitle={t('processFlows.header.subtitle')}
      />
      <PageMetaLine className="-mt-4 mb-4">
        {t('processFlows.meta.summary', {
          flows: catalog.flowCount,
          states: catalog.stateCount,
          transitions: catalog.transitionCount,
          forks: catalog.forkCount,
          looseEnds: catalog.looseEndCount,
        })}
      </PageMetaLine>

      {/* The honest marker for the route (D-CENSUS-8). Both halves stated. */}
      <section className="mb-6 rounded-md border border-border-subtle bg-bg-surface p-4">
        <h2 className="text-section text-text-primary">{t('processFlows.honesty.title')}</h2>
        <p className="mt-1 max-w-4xl text-meta text-text-secondary">
          {t('processFlows.honesty.derived')}
        </p>
        <p className="mt-1 max-w-4xl text-meta text-text-secondary">
          {t('processFlows.honesty.notReal')}
        </p>
        {/* PF-2 — the third axis, and it is neither of the first two. Purpose is
            not derived (so it is not in `derived`) and it is not fiction (so it
            is not in `notReal`). It is AUTHORED, which is its own thing to be,
            and a page that marks the other two honestly has to mark this one. */}
        <p className="mt-1 max-w-4xl text-meta text-text-secondary">
          {t('processFlows.honesty.authored')}
        </p>
        <p className="mt-1 max-w-4xl text-meta text-text-tertiary">
          {t('processFlows.honesty.identifiers')}
        </p>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* The catalog rail — every registered flow, derived from the registry. */}
        <nav
          aria-label={t('processFlows.catalog.aria')}
          className="w-full shrink-0 lg:w-72"
        >
          <h2 className="mb-2 text-label uppercase text-text-tertiary">
            {t('processFlows.catalog.title')}
          </h2>
          <ul className="space-y-1">
            {catalog.flows.map((flow) => {
              const active = flow.entity === view.entity;
              return (
                <li key={flow.entity}>
                  <button
                    type="button"
                    data-testid={`pf-flow-${flow.entity}`}
                    onClick={() => selectFlow(flow.entity)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                      active
                        ? 'border-action bg-action-soft'
                        : 'border-border-subtle bg-bg-surface hover:bg-bg-hover'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <Data className="text-[12px]">{flow.entity}</Data>
                      {flow.looseEnds.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning-hover">
                          <AlertTriangle size={11} aria-hidden="true" />
                          {flow.looseEnds.length}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-text-tertiary">
                      {t('processFlows.catalog.counts', {
                        states: flow.stateCount,
                        transitions: flow.transitionCount,
                      })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* The reading key for the census vocabulary — derived from the map,
              so a fifth reason appears here without an edit. */}
          <h2 className="mb-2 mt-6 text-label uppercase text-text-tertiary">
            {t('processFlows.reason.keyTitle')}
          </h2>
          <ul className="space-y-1.5">
            {ALL_REASONS.map((reason) => (
              <li key={reason} className="text-[11px] leading-relaxed text-text-tertiary">
                <Data className="text-[10px] font-semibold text-warning-hover">{reason}</Data>
                {' — '}
                {t(reasonKey(reason))}
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-6">
          <section className="rounded-md border border-border-subtle bg-bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-section text-text-primary">
                  <GitBranch size={16} className="text-teal" aria-hidden="true" />
                  <Data className="text-[15px]">{view.entity}</Data>
                </h2>
                {/* PF-2 — WHAT THIS MACHINE IS FOR, first, above its counts. A
                    flow's purpose is not the sum of its verbs: `invoiceMatch` is
                    four system transitions and the reason it exists is "a wrong
                    bill is caught before money moves". That is the sentence a
                    reader needs before any of the rest means anything. */}
                {flowPurpose && (
                  <p
                    data-testid={`pf-flow-purpose-${view.entity}`}
                    className="mt-1.5 max-w-prose text-meta text-text-secondary"
                  >
                    {t(flowPurpose)}
                  </p>
                )}
                <p className="mt-2 text-meta text-text-tertiary">
                  {t('processFlows.flow.counts', {
                    states: view.stateCount,
                    transitions: view.transitionCount,
                    forks: view.forkCount,
                    version: view.version,
                  })}
                </p>
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {t('processFlows.flow.initial')}{' '}
                  <Data className="text-[11px]">{view.initial}</Data>
                  {' · '}
                  {t('processFlows.flow.terminals')}{' '}
                  {view.terminals.length > 0 ? (
                    <Data className="text-[11px]">{view.terminals.join(', ')}</Data>
                  ) : (
                    <span>{t('processFlows.flow.noTerminals')}</span>
                  )}
                </p>
              </div>
              <FlowProvenance view={view} />
            </div>

            <div className="mt-4">
              <FlowDiagram view={view} cursor={cursor} idPrefix={`pf-${view.entity}`} />
            </div>
          </section>

          <LifecycleWalk
            view={view}
            cursor={cursor}
            path={path}
            onStep={step}
            onReset={() => setPath([])}
          />

          {view.looseEnds.length > 0 && (
            <section className="rounded-md border border-border-subtle bg-bg-surface p-4">
              <h3 className="text-section text-text-primary">
                {t('processFlows.looseEnd.title', { total: view.looseEnds.length })}
              </h3>
              <p className="mt-1 max-w-prose text-meta text-text-secondary">
                {t('processFlows.looseEnd.body')}
              </p>
              <ul className="mt-3 space-y-2">
                {view.looseEnds.map((end) => (
                  <LooseEndRow key={`${end.kind}#${end.subject}`} end={end} />
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-md border border-border-subtle bg-bg-surface">
            <div className="border-b border-border-subtle p-4">
              <h3 className="text-section text-text-primary">
                {t('processFlows.transitions.title')}
              </h3>
              <p className="mt-1 text-meta text-text-tertiary">
                {t('processFlows.transitions.body')}
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableHeaderCell>{t('processFlows.col.transition')}</TableHeaderCell>
                  <TableHeaderCell>{t('processFlows.col.edge')}</TableHeaderCell>
                  <TableHeaderCell>{t('processFlows.col.step')}</TableHeaderCell>
                  <TableHeaderCell>{t('processFlows.col.role')}</TableHeaderCell>
                  <TableHeaderCell>{t('processFlows.col.contract')}</TableHeaderCell>
                  <TableHeaderCell>{t('processFlows.col.links')}</TableHeaderCell>
                </TableHeader>
                <tbody>
                  {view.transitions.map((tv) => (
                    <TransitionRow key={tv.def.id} tv={tv} />
                  ))}
                </tbody>
              </Table>
            </div>
          </section>
        </div>
      </div>
    </AppShellV2>
  );
};

export default ProcessFlows;
