import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Save } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import Button from '../components/ui-v2/Button';
import Switch from '../components/ui-v2/Switch';
import Data from '../components/ui-v2/Data';
import GlossaryTermChip from '../components/ui-v2/GlossaryTermChip';
import ActorPreActNotice from '../components/ui-v2/ActorPreActNotice';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { useRefusalText } from '../hooks/useRefusalText';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useModuleActivation } from '../context/ModuleActivationContext';
import { useModuleSetBatch, type ModuleSetOutcome } from '../services/query/commandHooks';
import { refusalKindOf } from '../services/transitions/refusals';
import { moduleDeployment } from '../services/modules/deployment';
import {
  MODULE_PHASES,
  getModules,
  hardDependantsOf,
  type ModuleCode,
  type ModulePhase,
  type ModuleSpec,
} from '../services/modules/registry';
import {
  blockedSwitchOffs,
  changesOf,
  defaultForm,
  differsFromDefaults,
  formFromView,
  orderChanges,
  setEnabled,
  setPart,
  setPhase,
  setSide,
  type AdminForm,
} from './modules/adminModel';
import { formatSetAt, rowsFor, setByLabel, useModuleLedger } from './modules/moduleLedger';

// ─────────────────────────────────────────────────────────────────────────────
// M2 · THE MODULE ADMIN PAGE — `/buyer/platform/modules/admin` (Design 5
// §A.5.2).
//
// ⚠️ **WHO MAY EDIT IS DERIVED, AND EVERY OTHER SEAT READS THE SAME PAGE.**
// Three read-only arms, in the order the dispatcher would refuse: a seat
// without `module:set` sees whose act it is (`HandoffNotice` → compliance); an
// UNATTRIBUTED seat is told to adopt a sample person (the identity rule applies
// here first, §A.5.2); and on a production deployment a sample person is told a
// real one must act (`MODULE_SET_NOT_SAMPLE_IN_PROD`, ruling 3). The controls
// are DISABLED in every arm, never absent: the page still shows what is in
// force and what each switch would do.
//
// ⚠️ **SAVE IS ONE `t_module_set` PER CHANGED ROW** (`adminModel.changesOf`),
// in an order the dependency rules can admit, under one causation anchor
// (`useModuleSetBatch`). A refused row keeps its form value and is marked with
// its reason and glossary chip; the applied rows leave the form, because the
// form follows what is in force once saved.
// ─────────────────────────────────────────────────────────────────────────────

type ReadOnly = 'not-held' | 'unattributed' | 'production-sample' | null;

const RowResult: React.FC<{ outcome: ModuleSetOutcome }> = ({ outcome }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const testId = `module-result-${outcome.subject}`;
  if (outcome.result.status !== 'failed') {
    return (
      <div className="text-xs text-success mt-1" data-testid={testId} data-outcome="applied">
        {t('modules.admin.applied')}
      </div>
    );
  }
  const kind = refusalKindOf(outcome.result.reason);
  return (
    <div className="text-xs text-critical mt-1 flex flex-wrap items-center gap-1.5" data-testid={testId} data-outcome="refused">
      <span>
        {outcome.blockedBy
          ? t('modules.admin.blockedRefusal', { codes: outcome.blockedBy.join(', ') })
          : refusalText(outcome.result.reason) ?? outcome.result.reason}
      </span>
      {kind && <GlossaryTermChip refTo={{ sourceType: 'CommandRefusal', term: kind }} />}
    </div>
  );
};

const RouteChips: React.FC<{ spec: ModuleSpec; on: boolean }> = ({ spec, on }) => (
  <div className="flex flex-wrap gap-1 mt-1">
    {spec.routes.map((r) =>
      on && !r.includes(':') ? (
        <Link key={r} to={r} className="rounded border border-border-subtle px-1 py-0.5 hover:bg-bg-hover">
          <Data className="text-[10px] text-action-text">{r}</Data>
        </Link>
      ) : (
        <span key={r} className="rounded border border-border-subtle px-1 py-0.5">
          <Data className="text-[10px] text-text-tertiary">{r}</Data>
        </span>
      ),
    )}
  </div>
);

const ModulesAdmin: React.FC = () => {
  const { t } = useTranslation();
  const view = useModuleActivation();
  const ledger = useModuleLedger();
  const { identity } = useCurrentIdentity();
  const canSet = useVerbAvailability('module:set');
  const save = useModuleSetBatch();

  const [draft, setDraft] = useState<AdminForm | null>(null);
  const form = draft ?? formFromView(view);
  const [reason, setReason] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, ModuleSetOutcome>>({});

  const actor = identity.actor;
  const readOnly: ReadOnly =
    canSet.kind !== 'held'
      ? 'not-held'
      : actor.kind !== 'RESOLVED'
        ? 'unattributed'
        : moduleDeployment.barsActor(actor)
          ? 'production-sample'
          : null;
  const disabled = readOnly !== null || save.isPending;

  const changes = useMemo(() => orderChanges(changesOf(form, view)), [form, view]);
  const changed = new Set(changes.map((c) => c.subject));
  const blocked = useMemo(() => blockedSwitchOffs(form), [form]);
  const reasonFor = (subject: string) => (overrides[subject] ?? '').trim() || reason.trim();
  const canSave = !disabled && changes.length > 0 && changes.every((c) => reasonFor(c.subject) !== '');

  const edit = (next: AdminForm) => {
    setDraft(next);
    setOutcomes({});
  };

  const onSave = async () => {
    const results = await save.mutateAsync({
      rows: changes.map((c) => ({ subject: c.subject, payload: c.payload, reason: reasonFor(c.subject) })),
      reason: reason.trim(),
    });
    setOutcomes(Object.fromEntries(results.map((o) => [o.subject, o])));
    // The applied rows now equal what is in force; the refused ones keep their
    // form value so the person can see what they asked for beside why not.
    if (results.every((o) => o.result.status !== 'failed')) {
      setDraft(null);
      setOverrides({});
    }
  };

  const lastUpdated = (subject: string) => {
    const latest = ledger.data ? rowsFor(ledger.data.items, subject)[0] : undefined;
    return latest
      ? t('modules.admin.lastUpdated', { who: setByLabel(latest, t), at: formatSetAt(latest.setAt) })
      : t('modules.admin.neverUpdated');
  };

  return (
    <AppShellV2>
      <div data-testid="modules-admin" data-read-only={readOnly ?? 'editable'}>
        <PageHeader
          breadcrumb={[t('modules.board.crumb'), t('modules.admin.crumb')]}
          title={t('modules.admin.title')}
          subtitle={t('modules.admin.subtitle')}
          actions={
            <Link
              to="/buyer/platform/modules"
              className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium bg-bg-surface text-text-primary border border-border-input hover:bg-bg-hover"
            >
              <ArrowLeft size={16} />
              {t('modules.admin.back')}
            </Link>
          }
        />

        {/* WHO IS ABOUT TO BE RECORDED, or why nobody can be. */}
        <section className="mb-5 rounded-lg border border-border-subtle bg-bg-hover px-4 py-3" data-testid="modules-admin-gate">
          {readOnly === 'not-held' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-primary">{t('modules.admin.notHeld')}</span>
              <HandoffNotice availability={canSet} testId="modules-admin-handoff" />
            </div>
          ) : readOnly === 'production-sample' ? (
            <p className="text-sm text-text-primary" data-testid="modules-admin-production">
              {t('modules.admin.productionSample')}
            </p>
          ) : (
            <ActorPreActNotice
              unattributedKey="modules.admin.unattributed"
              className="text-sm text-text-primary"
              testId="modules-admin-actor"
            />
          )}
          <p className="text-xs text-text-tertiary mt-1">{t('modules.admin.fourEyes')}</p>
        </section>

        {/* THE SIDES (§A.1.4). The buyer side is never switchable while PLT is on. */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="modules-admin-sides">
          {(['side:buyer', 'side:supplier'] as const).map((side) => {
            const key = side === 'side:buyer' ? 'buyer' : 'supplier';
            const locked = side === 'side:buyer';
            return (
              <div key={side} className="bg-white border border-border-subtle rounded-lg p-4" data-testid={`modules-side-${key}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">{t(`modules.side.${key}`)}</span>
                  <Switch
                    checked={form.sides[side]}
                    onChange={(on) => edit(setSide(form, side, on))}
                    ariaLabel={t(`modules.side.${key}`)}
                    disabled={disabled || locked}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-1">{t(`modules.sideDescription.${key}`)}</p>
                {locked && <p className="text-xs text-text-tertiary mt-1">{t('modules.admin.buyerSideLocked')}</p>}
                {outcomes[side] && <RowResult outcome={outcomes[side]} />}
              </div>
            );
          })}
        </section>

        <div className="bg-white border border-border-subtle rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-bg-hover">
              <tr className="text-label text-text-tertiary uppercase">
                <th className="py-2 px-4">{t('modules.admin.col.module')}</th>
                <th className="py-2 px-4">{t('modules.admin.col.phase')}</th>
                <th className="py-2 px-4">{t('modules.admin.col.onOff')}</th>
                <th className="py-2 px-4">{t('modules.admin.col.parts')}</th>
              </tr>
            </thead>
            <tbody>
              {getModules().map((spec) => {
                const code = spec.code as ModuleCode;
                const row = form.modules[code];
                const alwaysOn = spec.alwaysOn === true;
                const dependants = hardDependantsOf(code);
                return (
                  <tr key={code} className="border-t border-border-subtle align-top" data-testid={`module-row-${code}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">{t(spec.nameKey)}</span>
                        <Data className="text-xs">{code}</Data>
                        <span className="rounded-md border border-border-subtle bg-bg-hover px-1.5 py-0.5 text-[10px] text-text-secondary">
                          {t(`modules.scope.${spec.scope}`)}
                        </span>
                      </div>
                      <RouteChips spec={spec} on={row.enabled} />
                      <div className="text-[11px] text-text-tertiary mt-1" data-testid={`module-last-${code}`}>
                        {alwaysOn ? t('modules.admin.alwaysOn') : lastUpdated(code)}
                      </div>
                      {changed.has(code) && (
                        <input
                          type="text"
                          value={overrides[code] ?? ''}
                          onChange={(e) => setOverrides({ ...overrides, [code]: e.target.value })}
                          placeholder={t('modules.admin.rowReason')}
                          aria-label={t('modules.admin.rowReasonAria', { code })}
                          disabled={disabled}
                          className="mt-2 w-full rounded-md border border-border-input px-2 py-1 text-xs"
                          data-testid={`module-reason-${code}`}
                        />
                      )}
                      {blocked[code] && (
                        <div className="text-xs text-warning-hover mt-1" data-testid={`module-blocked-${code}`}>
                          {t('modules.admin.blocked', { codes: blocked[code]!.join(', ') })}
                        </div>
                      )}
                      {outcomes[code] && <RowResult outcome={outcomes[code]} />}
                    </td>
                    <td className="py-3 px-4 w-56">
                      <select
                        value={row.phase}
                        onChange={(e) => edit(setPhase(form, code, e.target.value as ModulePhase))}
                        disabled={disabled || alwaysOn}
                        aria-label={t('modules.admin.phaseAria', { code })}
                        className="w-full rounded-md border border-border-input px-2 py-1 text-sm bg-white"
                        data-testid={`module-phase-${code}`}
                      >
                        {MODULE_PHASES.map((p) => (
                          <option key={p} value={p}>
                            {t(`modules.phase.${p}`)}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-text-tertiary mt-1">{t(`modules.phaseHelp.${row.phase}`)}</p>
                    </td>
                    <td className="py-3 px-4" title={dependants.length > 0 ? t('modules.admin.dependedOnBy', { codes: dependants.join(', ') }) : undefined}>
                      <div className="flex items-center gap-2" data-testid={`module-toggle-${code}`}>
                        <Switch
                          checked={row.enabled}
                          onChange={(on) => edit(setEnabled(form, code, on))}
                          ariaLabel={t('modules.admin.toggleAria', { code })}
                          disabled={disabled || alwaysOn}
                        />
                        <span className="text-xs text-text-secondary">{t(row.enabled ? 'modules.admin.on' : 'modules.admin.off')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {spec.parts.length === 0 ? (
                        <span className="text-xs text-text-tertiary">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {spec.parts.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-2 text-xs text-text-primary">
                              <span>{t(p.nameKey)}</span>
                              <Switch
                                checked={row.parts[p.id] !== false}
                                onChange={(on) => edit(setPart(form, code, p.id, on))}
                                ariaLabel={t('modules.admin.partAria', { part: t(p.nameKey), code })}
                                disabled={disabled || !row.enabled}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section className="mt-5 bg-white border border-border-subtle rounded-lg p-4" data-testid="modules-admin-save">
          <label className="block text-sm font-medium text-text-primary" htmlFor="modules-batch-reason">
            {t('modules.admin.reason')}
          </label>
          <textarea
            id="modules-batch-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={disabled}
            rows={2}
            className="mt-1 w-full rounded-md border border-border-input px-2 py-1 text-sm"
            data-testid="modules-batch-reason"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-text-tertiary" data-testid="modules-admin-change-count">
              {t('modules.admin.changeCount', { count: changes.length })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                icon={RotateCcw}
                onClick={() => edit(defaultForm())}
                disabled={disabled || !differsFromDefaults(form)}
                data-testid="modules-reset"
              >
                {t('modules.admin.reset')}
              </Button>
              <Button icon={Save} onClick={onSave} disabled={!canSave} data-testid="modules-save">
                {t('modules.admin.save')}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShellV2>
  );
};

export default ModulesAdmin;
