import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SidePanel from '../../components/ui-v2/SidePanel';
import Data from '../../components/ui-v2/Data';
import { getKnownFlows } from '../../services/transitions';
import { getModule, type ModuleCode } from '../../services/modules/registry';
import { useModuleActivation } from '../../context/ModuleActivationContext';
import { dependantsOf } from './boardModel';
import { formatSetAt, rowsFor, setByLabel, useModuleLedger } from './moduleLedger';

// ─────────────────────────────────────────────────────────────────────────────
// M2 · A MODULE'S DETAIL DRAWER (Design 5 §A.5.1): routes, flows and verbs,
// parts, dependants, the activation ledger, and a link per flow to its process
// guide. READ-ONLY for every seat — switching lives on the admin page.
//
// Every list is read from the registry or the ledger at render; the guide link
// is `/buyer/process-flows` until the guides land (G1/G2).
// ─────────────────────────────────────────────────────────────────────────────

const Section: React.FC<{ titleKey: string; testId: string; children: React.ReactNode }> = ({ titleKey, testId, children }) => {
  const { t } = useTranslation();
  return (
    <section className="mb-5" data-testid={testId}>
      <h3 className="text-label text-text-tertiary uppercase mb-2">{t(titleKey)}</h3>
      {children}
    </section>
  );
};

const None: React.FC = () => {
  const { t } = useTranslation();
  return <p className="text-xs text-text-tertiary">{t('modules.drawer.none')}</p>;
};

export const ModuleDetailDrawer: React.FC<{ code: ModuleCode | null; onClose: () => void }> = ({ code, onClose }) => {
  const { t } = useTranslation();
  const view = useModuleActivation();
  const ledger = useModuleLedger();
  if (code === null) return null;

  const spec = getModule(code);
  const state = view.modules[code];
  const flows = getKnownFlows().filter((f) => spec.flows.includes(f.entity));
  const dependants = dependantsOf(code);
  const acts = ledger.data ? rowsFor(ledger.data.items, code) : [];

  return (
    <SidePanel open onClose={onClose} title={`${t(spec.nameKey)} · ${code}`}>
      <div data-testid={`module-drawer-${code}`}>
        <p className="text-sm text-text-secondary mb-4">{t(spec.descriptionKey)}</p>
        <p className="text-xs text-text-secondary mb-5" data-testid="module-drawer-state">
          {t('modules.drawer.state', {
            phase: t(`modules.phase.${state.phase}`),
            onOff: t(state.enabled ? 'modules.admin.on' : 'modules.admin.off'),
          })}
        </p>

        <Section titleKey="modules.drawer.routes" testId="module-drawer-routes">
          {spec.routes.length === 0 ? (
            <None />
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {spec.routes.map((r) => (
                <li key={r} className="rounded border border-border-subtle bg-bg-hover px-1.5 py-0.5">
                  <Data className="text-[11px]">{r}</Data>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titleKey="modules.drawer.flows" testId="module-drawer-flows">
          {flows.length === 0 ? (
            <None />
          ) : (
            <ul className="space-y-3">
              {flows.map((f) => (
                <li key={f.entity} data-testid={`module-drawer-flow-${f.entity}`}>
                  <div className="flex items-center justify-between gap-2">
                    <Data className="text-xs">{f.entity}</Data>
                    <Link to="/buyer/process-flows" className="text-xs text-action-text hover:underline whitespace-nowrap">
                      {t('modules.drawer.guide')}
                    </Link>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {f.transitions.map((tr) => (
                      <span key={tr.id} className="rounded bg-bg-hover px-1 py-0.5">
                        <Data className="text-[10px] text-text-secondary">{tr.id}</Data>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titleKey="modules.drawer.parts" testId="module-drawer-parts">
          {spec.parts.length === 0 ? (
            <None />
          ) : (
            <ul className="space-y-1">
              {spec.parts.map((p) => (
                <li key={p.id} className="text-xs text-text-primary flex justify-between gap-2">
                  <span>{t(p.nameKey)}</span>
                  <span className="text-text-tertiary">
                    {t(state.parts[p.id] === false ? 'modules.admin.off' : 'modules.admin.on')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titleKey="modules.drawer.dependants" testId="module-drawer-dependants">
          {dependants.length === 0 ? (
            <None />
          ) : (
            <ul className="space-y-1">
              {dependants.map((d) => (
                <li key={d.code} className="text-xs text-text-primary">
                  <Data className="text-xs">{d.code}</Data> {t(getModule(d.code).nameKey)}{' '}
                  <span className="text-text-tertiary">· {t(`modules.dependency.${d.kind}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titleKey="modules.drawer.ledger" testId="module-drawer-ledger">
          {ledger.isError ? (
            <p className="text-xs text-text-tertiary">{t('modules.ledger.unavailable')}</p>
          ) : acts.length === 0 ? (
            <p className="text-xs text-text-tertiary" data-testid="module-drawer-ledger-empty">
              {t('modules.ledger.empty')}
            </p>
          ) : (
            <ol className="space-y-2">
              {acts.map((row) => (
                <li key={row.seq} className="text-xs border-l-2 border-border-subtle pl-2" data-testid="module-drawer-ledger-row">
                  <div className="text-text-primary">
                    {t('modules.ledger.act', {
                      phase: row.phase ? t(`modules.phase.${row.phase}`) : '—',
                      onOff: t(row.enabled ? 'modules.admin.on' : 'modules.admin.off'),
                    })}
                  </div>
                  <div className="text-text-secondary">“{row.reason}”</div>
                  <div className="text-text-tertiary">
                    {t('modules.ledger.by', { who: setByLabel(row, t), at: formatSetAt(row.setAt) })}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>
    </SidePanel>
  );
};

export default ModuleDetailDrawer;
