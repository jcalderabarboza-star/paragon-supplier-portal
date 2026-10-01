import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import LivenessPill from '../components/ui-v2/LivenessPill';
import Data from '../components/ui-v2/Data';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useModuleActivation } from '../context/ModuleActivationContext';
import { MODULE_PHASES, getModule, type ModuleCode, type ModulePhase } from '../services/modules/registry';
import type { Capability } from '../services/liveness/registry';
import { boardColumns, cardFacts } from './modules/boardModel';
import { ModuleDetailDrawer } from './modules/ModuleDetailDrawer';

// ─────────────────────────────────────────────────────────────────────────────
// M2 · THE ROADMAP BOARD — `/buyer/platform/modules` (Design 5 §A.5.1).
//
// Four columns — Active · Activating · Planned · Backlog — from the phase IN
// FORCE per module (the ledger's latest act; the registry default where none).
// Every number on a card is derived (`boardModel.ts`). READ-ONLY for every seat:
// the admin page is one click away for a seat holding `module:set`, and the
// seat that does not hold it is told who does, in the slot the link would take.
// ─────────────────────────────────────────────────────────────────────────────

const ScopeChip: React.FC<{ code: ModuleCode }> = ({ code }) => {
  const { t } = useTranslation();
  return (
    <span className="rounded-md border border-border-subtle bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-secondary whitespace-nowrap">
      {t(`modules.scope.${getModule(code).scope}`)}
    </span>
  );
};

const ModuleCard: React.FC<{ code: ModuleCode; onOpen: (c: ModuleCode) => void }> = ({ code, onOpen }) => {
  const { t } = useTranslation();
  const spec = getModule(code);
  const f = cardFacts(code);
  return (
    <button
      type="button"
      onClick={() => onOpen(code)}
      className="w-full text-left bg-white border border-border-subtle rounded-lg p-3 hover:bg-bg-hover transition-colors"
      data-testid={`module-card-${code}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Data className="text-xs font-semibold">{code}</Data>
        <ScopeChip code={code} />
      </div>
      <div className="text-sm font-medium text-text-primary mt-1">{t(spec.nameKey)}</div>
      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{t(spec.descriptionKey)}</p>
      <div className="text-[11px] text-text-tertiary mt-2" data-testid={`module-card-counts-${code}`}>
        {t('modules.board.counts', { routes: f.routes, verbs: f.verbs })}
      </div>
      <div className="text-[11px] text-text-tertiary mt-0.5" data-testid={`module-card-deps-${code}`}>
        {f.needs.length === 0 && f.reads.length === 0
          ? t('modules.board.needsNothing')
          : [
              f.needs.length > 0 ? t('modules.board.needs', { codes: f.needs.join(', ') }) : null,
              f.reads.length > 0 ? t('modules.board.reads', { codes: f.reads.join(', ') }) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
      </div>
      {f.mainCapability && (
        <div className="mt-2">
          <LivenessPill capability={f.mainCapability as Capability} />
        </div>
      )}
    </button>
  );
};

const ModulesBoard: React.FC = () => {
  const { t } = useTranslation();
  const view = useModuleActivation();
  const columns = useMemo(() => boardColumns(view), [view]);
  const [open, setOpen] = useState<ModuleCode | null>(null);
  const canSet = useVerbAvailability('module:set');

  return (
    <AppShellV2>
      <div data-testid="modules-board">
        <PageHeader
          breadcrumb={[t('processFlows.crumb.platform'), t('modules.board.crumb')]}
          title={t('modules.board.title')}
          subtitle={t('modules.board.subtitle')}
          actions={
            canSet.kind === 'held' ? (
              <Link
                to="/buyer/platform/modules/admin"
                className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium bg-transparent text-action border border-action hover:bg-action-soft"
                data-testid="modules-board-admin-link"
              >
                <Settings2 size={16} />
                {t('modules.board.manage')}
              </Link>
            ) : (
              <HandoffNotice availability={canSet} testId="modules-board-admin-handoff" />
            )
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {MODULE_PHASES.map((phase: ModulePhase) => (
            <section key={phase} className="bg-bg-hover/40 rounded-lg p-3" data-testid={`modules-column-${phase}`}>
              <h2 className="text-label text-text-tertiary uppercase mb-3 flex items-center justify-between">
                <span>{t(`modules.phase.${phase}`)}</span>
                <span className="font-mono text-data-navy">{columns[phase].length}</span>
              </h2>
              <p className="text-[11px] text-text-tertiary mb-3">{t(`modules.phaseHelp.${phase}`)}</p>
              <div className="space-y-3">
                {columns[phase].map((code) => (
                  <ModuleCard key={code} code={code} onOpen={setOpen} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <ModuleDetailDrawer code={open} onClose={() => setOpen(null)} />
    </AppShellV2>
  );
};

export default ModulesBoard;
