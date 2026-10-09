import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpenText, RefreshCw } from 'lucide-react';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import GlossaryTermChip from '../../components/ui-v2/GlossaryTermChip';
import { HandoffNotice } from '../../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../../hooks/useVerbAvailability';
import { GLOSSARY_REGISTRIES, type GlossaryRef } from '../../lib/glossary';
import { getTransition } from '../../services/transitions';
import { readAuditEvents } from '../../services/audit/auditTrail';
import { personLabel, type TranslateFn } from '../../services/identity/personLabel';
import type { TransitionEvent } from '../../services/transitions/events';
import type { FlowView, TransitionView } from '../../services/transitions/catalogView';
import {
  GUIDE_LIST_ROUTE,
  getGuide,
  GUIDE_DRAFT_LOCALES,
  guideCitationKey,
  guideLocaleFor,
  type GuideSectionKey,
  type GuideStep,
  type ProcessGuide,
} from '../../guides';
import GuideMarkdown, { GuideInline } from './GuideMarkdown';
import DerivedFlags, { hasDerivedFlags } from './DerivedFlags';
import { documentsWithEvents, historyFor } from './statusHistory';
import { formatSetAt } from '../modules/moduleLedger';

// ────────────────────────────────────────────────────────────────────────────
// G1 · THE GUIDE TABS UNDER THE DIAGRAM (Design 5 §B.2).
//
// ⚠️ **NOTHING ON THE PAGE IS REMOVED.** The catalogue's loose ends and its
// transitions table are the Overview tab's body, and Overview is the tab that
// opens, so the page reads exactly as it did until a reader chooses another
// tab. The interactive lifecycle walk stays where it was — directly under the
// diagram it drives — and the Lifecycle tab adds the guide's account beside it.
//
// ⚠️ **TWO KINDS OF CONTENT, NEVER BLENDED.** The guide's prose is AUTHORED
// (and says so, with the commit it was written against); the derived flags, the
// seat's handoff notice and the status history are READ from the registry, the
// session and the audit sink. Each tab keeps them in separate, labelled boxes.
//
// Every flow has a guide in both locales since G2, held by `guides.test.ts`.
// A guide in a DRAFT locale (`GUIDE_DRAFT_LOCALES` — Indonesian until its
// locale review) carries a banner saying so on every tab.
// ────────────────────────────────────────────────────────────────────────────

// i18n-defer: tab KEYS, not copy — each reaches the reader only as
// `t(`processGuides.tab.${k}`)`; the raw key is a React key and a test id.
const TABS = [
  'overview',
  'lifecycle',
  'steps',
  'forks',
  'flags',
  'linked',
  'history',
  'troubleshooting',
  'testdata',
] as const;
type TabKey = (typeof TABS)[number];

/** The section a tab cites — Overview cites the summary. */
const SECTION_OF: Readonly<Record<TabKey, GuideSectionKey>> = {
  overview: 'summary',
  lifecycle: 'lifecycle',
  steps: 'steps',
  forks: 'forks',
  flags: 'flags',
  linked: 'linked',
  history: 'history',
  troubleshooting: 'troubleshooting',
  testdata: 'testdata',
};

/** A guide term to its glossary entry, or `null` — never a guess at a near term. */
function glossaryRefFor(term: string): GlossaryRef | null {
  const registry = GLOSSARY_REGISTRIES.find((r) => term in r.entries);
  return registry ? ({ sourceType: registry.sourceType, term } as GlossaryRef) : null;
}

const Box: React.FC<{ title: string; children: React.ReactNode; testId?: string }> = ({ title, children, testId }) => (
  <section className="rounded-md border border-border-subtle bg-bg-surface p-4" data-testid={testId}>
    <h4 className="mb-2 text-label uppercase text-text-tertiary">{title}</h4>
    {children}
  </section>
);

/**
 * Unreachable while the gates hold — every flow has a guide in both locales —
 * and kept so a missing guide renders a true sentence rather than an empty box.
 */
const Pending: React.FC = () => {
  const { t } = useTranslation();
  return (
    <p data-testid="pf-guide-missing" className="text-meta text-text-tertiary">
      {t('processGuides.missing')}
    </p>
  );
};

/** The seat's own answer for a verb a person performs — the handoff notice, or nothing when held. */
const SeatNotice: React.FC<{ tv: TransitionView }> = ({ tv }) => {
  const availability = useVerbAvailability(tv.def.requiredRole);
  return <HandoffNotice availability={availability} testId={`pf-guide-handoff-${tv.def.id}`} />;
};

const Field: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div className="text-[12px] leading-relaxed text-text-secondary">
    <span className="mr-1 font-semibold text-text-primary">{label}:</span>
    {text.includes('\n') ? <GuideMarkdown source={text} className="mt-1" /> : <GuideInline text={text} />}
  </div>
);

const StepCard: React.FC<{ guide: ProcessGuide; step: GuideStep; tv: TransitionView | undefined }> = ({
  guide,
  step,
  tv,
}) => {
  const { t } = useTranslation();
  const key = guideCitationKey(guide.entity, guide.locale, step.transitionId);
  return (
    <article
      id={`guide-${guide.entity}-${step.transitionId}`}
      data-testid={`pf-guide-step-${step.transitionId}`}
      data-citation={key}
      className="rounded-md border border-border-subtle bg-bg-surface p-4"
    >
      <header className="flex flex-wrap items-center gap-2">
        <Data className="text-[12px]">{step.transitionId}</Data>
        <span className="text-[13px] font-semibold text-text-primary">{step.label}</span>
        <StatusPill variant="neutral" className="text-[10px]">
          {t(`processGuides.stepKind.${step.stepKind}`)}
        </StatusPill>
        <Data className="ml-auto text-[10px] text-text-tertiary">{key}</Data>
      </header>
      <div className="mt-2 space-y-1">
        <Field label={t('processGuides.step.role')} text={step.role} />
        <Field label={t('processGuides.step.fromTo')} text={step.fromTo} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5 rounded-md border border-border-subtle p-3" data-testid={`pf-guide-operator-${step.transitionId}`}>
          <h5 className="text-label uppercase text-text-tertiary">{t('processGuides.step.operator')}</h5>
          <Field label={t('processGuides.step.where')} text={step.operator.where} />
          <Field label={t('processGuides.step.do')} text={step.operator.do} />
          <Field label={t('processGuides.step.fill')} text={step.operator.fill} />
        </div>
        <div className="space-y-1.5 rounded-md border border-border-subtle p-3" data-testid={`pf-guide-tester-${step.transitionId}`}>
          <h5 className="text-label uppercase text-text-tertiary">{t('processGuides.step.tester')}</h5>
          <Field label={t('processGuides.step.expected')} text={step.tester.expectedState} />
          <Field label={t('processGuides.step.confirm')} text={step.tester.confirm} />
          <div className="text-[12px] text-text-secondary">
            <span className="mr-1 font-semibold text-text-primary">{t('processGuides.step.trigger')}:</span>
            <Data className="text-[11px]">{step.tester.triggerEvent}</Data>
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <Field label={t('processGuides.step.checks')} text={step.checks} />
        {step.glossary.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[12px]">
            <span className="mr-1 font-semibold text-text-primary">{t('processGuides.step.glossary')}:</span>
            {step.glossary.map((term) => {
              const ref = glossaryRefFor(term);
              return ref ? (
                <GlossaryTermChip key={term} refTo={ref} />
              ) : (
                <Data key={term} className="text-[10px]">
                  {term}
                </Data>
              );
            })}
          </div>
        )}
        <div className="border-l-2 border-warning/50 pl-2">
          <Field label={t('processGuides.step.honesty')} text={step.honesty} />
        </div>
        {tv && tv.def.trigger === 'user' && (
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold text-text-primary">{t('processGuides.step.yourSeat')}:</span>
            <SeatNotice tv={tv} />
          </div>
        )}
      </div>
    </article>
  );
};

function actorText(e: TransitionEvent, t: TranslateFn): string {
  if (e.attribution === undefined) return t('processGuides.history.machine');
  if (e.attribution.kind === 'RESOLVED') return personLabel(e.attribution.person.personId, t);
  return t('processGuides.history.unattributed');
}

const HistoryTab: React.FC<{ view: FlowView; guide: ProcessGuide | undefined }> = ({ view, guide }) => {
  const { t } = useTranslation();
  // The sink is in-memory and has no subscription, so it is READ when the tab
  // opens and again on Refresh — what is shown is what the sink held then.
  const [events, setEvents] = useState<readonly TransitionEvent[]>(() => readAuditEvents());
  const documents = useMemo(() => {
    const seeded = guide ? guide.testData.flatMap((r) => r.fixtureIds) : [];
    return [...new Set([...documentsWithEvents(events, view.entity), ...seeded])];
  }, [events, guide, view.entity]);
  const [picked, setPicked] = useState<string>(() => documents[0] ?? '');
  const chosen = documents.includes(picked) ? picked : (documents[0] ?? '');
  const groups = chosen ? historyFor(events, view.entity, chosen) : [];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Box title={t('processGuides.tab.history')} testId="pf-guide-history-live">
        <p className="mb-3 text-[11px] text-text-tertiary">{t('processGuides.history.sinkNote')}</p>
        {documents.length === 0 ? (
          <p className="text-meta text-text-tertiary">{t('processGuides.history.noDocuments')}</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-[12px] text-text-secondary" htmlFor="pf-guide-history-pick">
                {t('processGuides.history.pick')}
              </label>
              <select
                id="pf-guide-history-pick"
                data-testid="pf-guide-history-pick"
                value={chosen}
                onChange={(e) => setPicked(e.target.value)}
                className="rounded-md border border-border-subtle bg-bg-surface px-2 py-1 font-mono text-[12px]"
              >
                {documents.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="pf-guide-history-refresh"
                onClick={() => setEvents(readAuditEvents())}
                className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[12px] text-text-secondary hover:bg-bg-hover"
              >
                <RefreshCw size={12} aria-hidden="true" />
                {t('processGuides.history.refresh')}
              </button>
            </div>
            {groups.length === 0 ? (
              <p data-testid="pf-guide-history-seeded" className="text-meta text-text-tertiary">
                {t('processGuides.history.seeded')}
              </p>
            ) : (
              <div className="space-y-3" data-testid="pf-guide-history-events">
                {groups.map((g) => (
                  <div key={g.anchor} className="rounded-md border border-border-subtle">
                    <p className="border-b border-border-subtle bg-bg-hover px-2 py-1 text-[11px] text-text-tertiary">
                      {t('processGuides.history.group', { anchor: g.anchor })}
                    </p>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-left text-text-tertiary">
                          <th className="px-2 py-1 font-semibold">{t('processGuides.history.col.time')}</th>
                          <th className="px-2 py-1 font-semibold">{t('processGuides.history.col.edge')}</th>
                          <th className="px-2 py-1 font-semibold">{t('processGuides.history.col.actor')}</th>
                          <th className="px-2 py-1 font-semibold">{t('processGuides.history.col.trigger')}</th>
                          <th className="px-2 py-1 font-semibold">{t('processGuides.history.col.event')}</th>
                          <th className="px-2 py-1 font-semibold">{t('processGuides.history.col.outcome')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map(({ event: e, elsewhere }) => (
                          <tr
                            key={`${e.correlationId}-${e.outcome}-${e.ts}`}
                            data-testid={`pf-guide-history-row-${e.event}`}
                            className="border-t border-border-subtle align-top"
                          >
                            <td className="px-2 py-1">
                              <Data className="text-[11px]">{formatSetAt(e.ts)}</Data>
                            </td>
                            <td className="px-2 py-1">
                              <Data className="text-[11px]">
                                {e.subject ? `${e.subject.from ?? t('processGuides.history.creation')} → ${e.subject.to}` : '—'}
                              </Data>
                              {elsewhere && e.subject && (
                                <span className="block text-[10px] text-text-tertiary">
                                  {t('processGuides.history.elsewhere', { entity: e.subject.entity, id: e.subject.entityId })}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              <Data className="block text-[11px]">{e.actor}</Data>
                              <span className="text-[10px] text-text-tertiary">{actorText(e, t)}</span>
                            </td>
                            <td className="px-2 py-1">
                              <Data className="text-[11px]">{getTransition(e.event)?.trigger ?? '—'}</Data>
                            </td>
                            <td className="px-2 py-1">
                              <Data className="text-[11px]">{e.event}</Data>
                            </td>
                            <td className="px-2 py-1">
                              <Data className="text-[11px]">{e.outcome}</Data>
                              {e.reason && <Data className="block text-[10px] text-text-tertiary">{e.reason}</Data>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Box>
      <Box title={t('processGuides.history.worked')} testId="pf-guide-history-worked">
        {guide ? <GuideMarkdown source={guide.sections.history} /> : <Pending />}
      </Box>
    </div>
  );
};

const TestDataTab: React.FC<{ guide: ProcessGuide }> = ({ guide }) => {
  const { t } = useTranslation();
  const route = GUIDE_LIST_ROUTE[guide.entity];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]" data-testid="pf-guide-testdata">
        <thead className="bg-bg-hover text-left text-text-tertiary">
          <tr>
            <th className="px-2 py-1.5 font-semibold">{t('processGuides.testdata.col.state')}</th>
            <th className="px-2 py-1.5 font-semibold">{t('processGuides.testdata.col.fixtures')}</th>
            <th className="px-2 py-1.5 font-semibold">{t('processGuides.testdata.col.number')}</th>
            <th className="px-2 py-1.5 font-semibold">{t('processGuides.testdata.col.note')}</th>
          </tr>
        </thead>
        <tbody>
          {guide.testData.map((row) => (
            <tr key={row.state} className="border-t border-border-subtle align-top">
              <td className="px-2 py-1.5">
                <Data className="text-[11px]">{row.state}</Data>
              </td>
              <td className="px-2 py-1.5">
                {row.fixtureIds.length === 0 ? (
                  <span className="text-text-tertiary">{t('processGuides.testdata.none')}</span>
                ) : (
                  <span className="flex flex-wrap gap-1.5">
                    {row.fixtureIds.map((id) =>
                      route ? (
                        <Link
                          key={id}
                          to={route}
                          data-testid={`pf-guide-fixture-${id}`}
                          aria-label={t('processGuides.testdata.openAria', { id })}
                          className="font-mono text-[11px] text-action-text underline-offset-2 hover:underline"
                        >
                          {id}
                        </Link>
                      ) : (
                        <Data key={id} className="text-[11px]">
                          {id}
                        </Data>
                      ),
                    )}
                  </span>
                )}
              </td>
              <td className="px-2 py-1.5">{row.number ? <GuideInline text={row.number} /> : '—'}</td>
              <td className="px-2 py-1.5 text-text-secondary">{row.note ? <GuideInline text={row.note} /> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const GuideTabs: React.FC<{ view: FlowView; overview: React.ReactNode }> = ({ view, overview }) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabKey>('overview');
  const guide = getGuide(view.entity, guideLocaleFor(i18n.language));
  const tvOf = (id: string) => view.transitions.find((x) => x.def.id === id);
  const citation = guide ? guideCitationKey(guide.entity, guide.locale, SECTION_OF[tab]) : null;
  const flagged = view.transitions.filter(hasDerivedFlags);

  const body = (): React.ReactNode => {
    switch (tab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {guide ? (
              <Box title={guide.title} testId="pf-guide-summary">
                <GuideMarkdown source={guide.sections.summary} />
              </Box>
            ) : (
              <Pending />
            )}
            {overview}
          </div>
        );
      case 'lifecycle':
        return guide ? (
          <div className="space-y-4">
            <p className="text-meta text-text-tertiary">{t('processGuides.lifecycle.walkNote')}</p>
            <Box title={t('processGuides.lifecycle.kinds')}>
              <ul className="flex flex-wrap gap-1.5" data-testid="pf-guide-lifecycle-kinds">
                {guide.transitions.map((id) => (
                  <li key={id} className="inline-flex items-center gap-1 rounded border border-border-subtle px-1.5 py-0.5">
                    <Data className="text-[10px]">{id}</Data>
                    <span className="text-[10px] text-text-tertiary">
                      {t(`processGuides.stepKind.${guide.steps[id]?.stepKind ?? 'not-active'}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </Box>
            <GuideMarkdown source={guide.sections.lifecycle} />
          </div>
        ) : (
          <Pending />
        );
      case 'steps':
        return guide ? (
          <div className="space-y-3">
            {guide.sections.steps && <GuideMarkdown source={guide.sections.steps} />}
            {guide.transitions.map((id) =>
              guide.steps[id] ? <StepCard key={id} guide={guide} step={guide.steps[id]} tv={tvOf(id)} /> : null,
            )}
          </div>
        ) : (
          <Pending />
        );
      case 'flags':
        return (
          <div className="space-y-4">
            <Box title={t('processGuides.flags.guideTitle')}>
              {guide ? <GuideMarkdown source={guide.sections.flags} /> : <Pending />}
            </Box>
            <Box title={t('processGuides.flags.derivedTitle')} testId="pf-guide-flags-derived">
              {flagged.length === 0 ? (
                <p className="text-meta text-text-tertiary">{t('processGuides.flags.derivedNone')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {flagged.map((tv) => (
                    <li key={tv.def.id} className="flex flex-wrap items-center gap-2">
                      <Data className="text-[11px]">{tv.def.id}</Data>
                      <DerivedFlags tv={tv} />
                    </li>
                  ))}
                </ul>
              )}
            </Box>
          </div>
        );
      case 'linked':
        return guide ? (
          <div className="space-y-3">
            <GuideMarkdown source={guide.sections.linked} />
            {GUIDE_LIST_ROUTE[guide.entity] && (
              <Link
                to={GUIDE_LIST_ROUTE[guide.entity]}
                data-testid="pf-guide-linked-list"
                className="inline-flex items-center gap-1 text-[12px] text-action-text hover:underline"
              >
                {t('processGuides.linked.openList')} · <Data className="text-[11px] text-action-text">{GUIDE_LIST_ROUTE[guide.entity]}</Data>
              </Link>
            )}
          </div>
        ) : (
          <Pending />
        );
      case 'history':
        return <HistoryTab key={view.entity} view={view} guide={guide} />;
      case 'testdata':
        return guide ? <TestDataTab guide={guide} /> : <Pending />;
      case 'forks':
      case 'troubleshooting':
        return guide ? <GuideMarkdown source={guide.sections[tab]} /> : <Pending />;
    }
  };

  return (
    <section className="space-y-4" data-testid="pf-guide">
      <div className="rounded-md border border-border-subtle bg-bg-surface p-4">
        <h3 className="flex items-center gap-2 text-section text-text-primary">
          <BookOpenText size={16} className="text-teal" aria-hidden="true" />
          {t('processGuides.title')}
        </h3>
        {guide && (
          <p className="mt-1 max-w-4xl text-[11px] text-text-tertiary" data-testid="pf-guide-authored">
            {t('processGuides.authored', { sha: guide.sourceSha.slice(0, 8) })}
          </p>
        )}
        {guide && GUIDE_DRAFT_LOCALES.includes(guide.locale) && (
          <p
            className="mt-2 max-w-4xl rounded-md border border-warning/40 bg-warning-soft px-2 py-1 text-[11px] text-warning-hover"
            data-testid="pf-guide-draft"
          >
            {t('processGuides.draft')}
          </p>
        )}
        <div role="tablist" aria-label={t('processGuides.tablist')} className="mt-3 flex flex-wrap gap-1 border-b border-border-subtle">
          {TABS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              id={`pf-guide-tab-${k}`}
              data-testid={`pf-guide-tab-${k}`}
              aria-selected={tab === k}
              aria-controls="pf-guide-panel"
              onClick={() => setTab(k)}
              className={`-mb-px rounded-t-md border px-3 py-1.5 text-[12px] transition-colors ${
                tab === k
                  ? 'border-border-subtle border-b-bg-surface bg-bg-surface font-semibold text-action-text'
                  : 'border-transparent text-text-secondary hover:bg-bg-hover'
              }`}
            >
              {t(`processGuides.tab.${k}`)}
            </button>
          ))}
        </div>
        {citation && (
          <p className="mt-2 text-[10px] text-text-tertiary">
            {t('processGuides.citation')}{' '}
            <Data className="text-[10px] text-text-tertiary" data-testid="pf-guide-citation">
              {citation}
            </Data>
          </p>
        )}
      </div>
      <div
        role="tabpanel"
        id="pf-guide-panel"
        aria-labelledby={`pf-guide-tab-${tab}`}
        data-testid={`pf-guide-panel-${tab}`}
        data-citation={citation ?? undefined}
      >
        {body()}
      </div>
    </section>
  );
};

export default GuideTabs;
