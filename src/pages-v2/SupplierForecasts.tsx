import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarRange, Info, Lock, Send } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import SubTabs from '../components/ui-v2/SubTabs';
import StatusPill from '../components/ui-v2/StatusPill';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import FormSection from '../components/ui-v2/FormSection';
import Data from '../components/ui-v2/Data';
import LivenessPill from '../components/ui-v2/LivenessPill';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { useCurrentSupplier } from '../services/query/hooks';
import {
  useOwnForecastLines,
  useOwnRequirementResponses,
  useRequirementResponseSubmit,
  useRequirementResponseAcknowledge,
} from '../services/query/sdcSupplierHooks';
import {
  MATERIAL_MASTER,
  buildRequirementResponsePayload,
  buildRequirementAcknowledgePayload,
  openSubmissionSession,
  type CommitmentClass,
  type ForecastLine,
  type ForecastPublication,
  type RequirementResponse,
  type SubmissionSessionRecorder,
} from '../services/sdc';
import { formatDate, formatNumber } from '../lib/format';
import { statusLabelKey } from '../lib/statusLabel';

// ────────────────────────────────────────────────────────────────────────────
// SupplierForecasts (SDC-2b) — the P1 supplier submission surface: an invited
// supplier sees ITS OWN published forecast lines (fanned to it) and confirms
// them through t_requirementresponse_submit (the SHARED channel-agnostic
// write-path, DEC-COMMS-PRIMARY — the portal is the reference front door).
//
// HONESTY (FLAG-2, all three layers):
//   1+2 (structural) — the read comes through `supplierVisiblePublications()`
//       (see useOwnForecastLines): the governed LIVE lane is EMPTY today, so
//       the page renders the SIMULATED sample ONLY under the explicit sample
//       banner + the registry-derived LivenessPill ("Sample — awaiting SOMO C8
//       feed", green structurally unreachable).
//   3   (vocabulary) — the supplier-facing class vocabulary is commitmentClass
//       ONLY. NO PlanCellMarker here: the SIMULATED×PLANNED provenance grammar
//       is P2-internal (BuyerCollaboration) and never reaches a supplier.
//
// OWN-FACTS-ONLY (FORK-3b-C): own lines + own submissions with STATUS only —
// no rank, no score, no other suppliers' lines/responses, no rollup/chase/
// coverage (those are P2 buyer-only). Page-level own-filtering is today's
// enforcement; service-level scoping is the named SDC-4 deferral.
//
// F-2: confirmedQty 0 + a root cause is a LEGAL short confirmation ("cannot
// supply at all"). F-3: "Submit confirmation" is the ONE solid primary — the
// governed commit (DP2-BUTTON-01); openers/cancel stay outline/secondary.
// ────────────────────────────────────────────────────────────────────────────

type TabKey = 'lines' | 'responses';

const CLASS_LABEL_KEY: Record<CommitmentClass, string> = {
  firm: 'sdcSup.class.firm',
  'semi-firm': 'sdcSup.class.semiFirm',
  'visibility-only': 'sdcSup.class.visibilityOnly',
};

// Root-cause level-1 vocabulary offered by the form (the child object's
// category axis; free-text note carries the specifics).
const ROOT_CAUSE_LEVELS = ['capacity', 'material', 'logistics', 'quality', 'other'] as const;

// Quiet-outlined chip (DP-3 status-chip grammar — soft tint, thin border).
const CHIP =
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium border-border-subtle bg-bg-hover text-text-secondary';

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass = 'block text-label text-text-tertiary uppercase mb-1';

interface ConfirmForm {
  confirmedQty: string;
  committedDate: string;
  capacityConstraint: string;
  rootCauseLevel1: string;
  rootCauseNote: string;
}

const emptyForm: ConfirmForm = {
  confirmedQty: '',
  committedDate: '',
  capacityConstraint: '',
  rootCauseLevel1: '',
  rootCauseNote: '',
};

const materialLabel = (code: string): string => MATERIAL_MASTER[code]?.label ?? code;

/** The latest own response answering this exact published line (this
 *  publication), for the inline "your latest response" echo. */
const latestResponseFor = (
  responses: readonly RequirementResponse[],
  publication: ForecastPublication,
  line: ForecastLine,
): RequirementResponse | undefined =>
  responses
    .filter(
      (r) =>
        r.publicationId === publication.publicationId &&
        r.materialCode === line.materialCode &&
        r.periodBucket === line.periodBucket,
    )
    .reduce<RequirementResponse | undefined>(
      (best, r) => (!best || r.submissionVersion > best.submissionVersion ? r : best),
      undefined,
    );

const LineCard: React.FC<{
  line: ForecastLine;
  latest?: RequirementResponse;
  onConfirm: (line: ForecastLine) => void;
  onAcknowledge: (line: ForecastLine) => void;
}> = ({ line, latest, onConfirm, onAcknowledge }) => {
  const { t } = useTranslation();
  const confirmable = line.commitmentClass !== 'visibility-only';
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Data className="text-sm font-bold text-text-primary">{line.materialCode}</Data>
            <span className={CHIP}>
              {line.commitmentClass === 'firm' && <Lock size={11} aria-hidden="true" />}
              {t(CLASS_LABEL_KEY[line.commitmentClass])}
            </span>
          </div>
          <div className="text-base font-semibold text-text-primary mt-1">
            {materialLabel(line.materialCode)}
          </div>
        </div>
        {confirmable ? (
          // Outline opener — the SOLID commit lives on the panel's Submit (F-3).
          <Button variant="outline" onClick={() => onConfirm(line)}>
            {t('sdcSup.line.confirm')}
          </Button>
        ) : (
          // SDC-2b-EXT: a visibility-only line takes a RESPONSE (acknowledge +
          // optional signal), never a commitment — quieter affordance by design.
          <div className="flex flex-col items-end gap-1.5 max-w-[14rem]">
            <Button variant="outline" onClick={() => onAcknowledge(line)}>
              {t('sdcSup.line.acknowledge')}
            </Button>
            <span className="text-xs italic text-text-tertiary text-right">
              {t('sdcSup.line.visibilityHint')}
            </span>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.line.demand')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {formatNumber(line.forecastQty)} {line.uom}
          </Data>
        </div>
        <div className="bg-bg-hover rounded-md px-3 py-2">
          <dt className="text-label text-text-tertiary uppercase mb-0.5">
            {t('sdcSup.line.period')}
          </dt>
          <Data as="dd" className="text-sm font-semibold">
            {line.periodBucket}
          </Data>
        </div>
      </dl>

      {latest && (
        <div className="mt-3 text-xs text-text-secondary">
          {latest.acknowledgment
            ? t('sdcSup.line.lastResponseAck', {
                version: latest.submissionVersion,
                status: statusLabelKey(latest.status)
                  ? t(statusLabelKey(latest.status)!)
                  : latest.status,
              })
            : t('sdcSup.line.lastResponse', {
                qty: formatNumber(latest.forecastConfirmation!.confirmedQty),
                uom: latest.forecastConfirmation!.uom,
                version: latest.submissionVersion,
                // Same central status map StatusPill localizes through.
                status: statusLabelKey(latest.status)
                  ? t(statusLabelKey(latest.status)!)
                  : latest.status,
              })}
        </div>
      )}
    </div>
  );
};

const ResponsesTab: React.FC<{ responses: readonly RequirementResponse[] }> = ({
  responses,
}) => {
  const { t } = useTranslation();
  if (responses.length === 0) {
    return (
      <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
          <Send size={20} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t('sdcSup.responses.emptyTitle')}
        </div>
        <div className="text-sm text-text-tertiary">{t('sdcSup.responses.emptyBody')}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4" data-testid="sdcsup-responses">
      {responses.map((r) => (
        <div
          key={r.id}
          className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm border-l-2 border-l-teal p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Data className="text-sm font-bold text-text-primary">{r.id}</Data>
              <Data className="text-xs bg-bg-hover text-text-secondary rounded-full px-2 py-0.5 font-semibold">
                {r.materialCode}
              </Data>
            </div>
            {/* Own facts + STATUS only (FORK-3b-C) — never a rank or score. */}
            <StatusPill variant="neutral">{r.status}</StatusPill>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: t('sdcSup.responses.col.material'), value: materialLabel(r.materialCode) },
              { label: t('sdcSup.responses.col.period'), value: r.periodBucket },
              {
                // SDC-2b-EXT: an acknowledgment carries NO qty — the cell reads
                // "Acknowledged" under a "Response" label; the word "confirmed"
                // never appears on a visibility response.
                label: r.acknowledgment
                  ? t('sdcSup.responses.col.response')
                  : t('sdcSup.responses.col.confirmed'),
                value: r.acknowledgment
                  ? t('sdcSup.responses.ack')
                  : `${formatNumber(r.forecastConfirmation!.confirmedQty)} ${r.forecastConfirmation!.uom}`,
              },
              {
                label: t('sdcSup.responses.col.committedDate'),
                value: r.forecastConfirmation?.committedDate
                  ? formatDate(r.forecastConfirmation.committedDate)
                  : '—',
              },
              { label: t('sdcSup.responses.col.version'), value: `v${r.submissionVersion}` },
              {
                label: t('sdcSup.responses.col.submitted'),
                value: r.submittedAt ? formatDate(r.submittedAt) : '—',
              },
            ].map((d) => (
              <div key={d.label} className="bg-bg-hover rounded-md px-3 py-2">
                <dt className="text-label text-text-tertiary uppercase mb-0.5">{d.label}</dt>
                <Data as="dd" className="text-sm font-semibold">
                  {d.value}
                </Data>
              </div>
            ))}
          </dl>
          {r.acknowledgment?.note && (
            <div className="mt-3 text-xs text-text-secondary">
              <span className="text-label text-text-tertiary uppercase">
                {t('sdcSup.responses.note')}
              </span>{' '}
              {r.acknowledgment.note}
            </div>
          )}
          {r.rootCause && (
            <div className="mt-3 text-xs text-text-secondary">
              <span className="text-label text-text-tertiary uppercase">
                {t('sdcSup.responses.rootCause')}
              </span>{' '}
              {r.rootCause.level1}
              {r.rootCause.note ? ` — ${r.rootCause.note}` : ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface WorkspaceProps {
  supplierId: string;
  supplierName: string;
  publication: ForecastPublication;
  lines: readonly ForecastLine[];
  liveFeed: boolean;
  responses: readonly RequirementResponse[];
}

const ForecastWorkspace: React.FC<WorkspaceProps> = ({
  supplierId,
  supplierName,
  publication,
  lines,
  liveFeed,
  responses,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const crumb = [t('sdcSup.crumb.section'), t('sdcSup.crumb.page')];
  const submitMutation = useRequirementResponseSubmit();
  const acknowledgeMutation = useRequirementResponseAcknowledge();
  const [activeTab, setActiveTab] = useState<TabKey>('lines');
  const [panelLine, setPanelLine] = useState<ForecastLine | null>(null);
  const [form, setForm] = useState<ConfirmForm>(emptyForm);
  // SDC-2b-EXT — the visibility-response panel (acknowledge + optional note).
  const [ackPanelLine, setAckPanelLine] = useState<ForecastLine | null>(null);
  const [ackNote, setAckNote] = useState('');
  // One SubmissionSession envelope per supplier visit (addendum §5): each
  // dispatched object is recorded on it; SDC-3's extra objects join the same
  // recorder. Degenerate today (one object kind) but shape-correct.
  const sessionRef = useRef<SubmissionSessionRecorder | null>(null);

  const openConfirm = (line: ForecastLine) => {
    setPanelLine(line);
    setForm(emptyForm);
  };

  const openAcknowledge = (line: ForecastLine) => {
    setAckPanelLine(line);
    setAckNote('');
  };

  const qtyNumber = Number(form.confirmedQty.replace(/,/g, ''));
  const isShort =
    panelLine !== null &&
    form.confirmedQty.trim() !== '' &&
    !Number.isNaN(qtyNumber) &&
    qtyNumber < panelLine.forecastQty;

  const submitConfirmation = async () => {
    if (!panelLine) return;
    // Quantity must be STATED — 0 is legal (F-2), an empty field is not.
    if (form.confirmedQty.trim() === '' || Number.isNaN(qtyNumber)) {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.missingQty.title'),
        description: t('sdcSup.toast.missingQty.body'),
      });
      return;
    }
    // Short (including 0): the deviation needs its root cause (form-level rule).
    if (qtyNumber < panelLine.forecastQty && !form.rootCauseLevel1) {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.missingRootCause.title'),
        description: t('sdcSup.toast.missingRootCause.body'),
      });
      return;
    }
    // Snapshot keys come from the RENDERED publication + line; supplierId from
    // the IDENTITY — never the form (un-falsifiable binding, SDC-2a).
    const payload = buildRequirementResponsePayload(publication, panelLine, supplierId, {
      confirmedQty: form.confirmedQty,
      ...(form.committedDate ? { committedDate: form.committedDate } : {}),
      ...(form.capacityConstraint ? { capacityConstraint: form.capacityConstraint } : {}),
      ...(form.rootCauseLevel1
        ? {
            rootCause: {
              level1: form.rootCauseLevel1,
              ...(form.rootCauseNote ? { note: form.rootCauseNote } : {}),
            },
          }
        : {}),
    });
    try {
      const res = await submitMutation.mutateAsync({ payload });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.toast.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body'),
        });
        return;
      }
      // Record the dispatch on the visit's session envelope (audit grouping).
      if (!sessionRef.current) {
        sessionRef.current = openSubmissionSession(
          `ss-p1-${Date.now().toString(36)}`,
          supplierId,
          new Date().toISOString(),
        );
      }
      sessionRef.current.attempt('RequirementResponse', res.entityId ?? '', res.correlationId);
      toast({
        variant: 'success',
        title: t('sdcSup.toast.submitted.title', {
          material: materialLabel(panelLine.materialCode),
        }),
        description: t('sdcSup.toast.submitted.body'),
      });
      setPanelLine(null);
      setForm(emptyForm);
      setActiveTab('responses');
    } catch {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.failed.title'),
        description: t('sdcSup.toast.failed.body'),
      });
    }
  };

  // SDC-2b-EXT — the visibility response: acknowledge + optional signal.
  // Same snapshot binding + identity discipline + session envelope; NO qty.
  const submitAcknowledgment = async () => {
    if (!ackPanelLine) return;
    const payload = buildRequirementAcknowledgePayload(
      publication,
      ackPanelLine,
      supplierId,
      ackNote,
    );
    try {
      const res = await acknowledgeMutation.mutateAsync({ payload });
      if (res.status === 'failed') {
        toast({
          variant: 'error',
          title: t('sdcSup.toast.failed.title'),
          description: res.reason ?? t('sdcSup.toast.failed.body'),
        });
        return;
      }
      if (!sessionRef.current) {
        sessionRef.current = openSubmissionSession(
          `ss-p1-${Date.now().toString(36)}`,
          supplierId,
          new Date().toISOString(),
        );
      }
      sessionRef.current.attempt('RequirementResponse', res.entityId ?? '', res.correlationId);
      toast({
        variant: 'success',
        title: t('sdcSup.toast.acknowledged.title', {
          material: materialLabel(ackPanelLine.materialCode),
        }),
        description: t('sdcSup.toast.acknowledged.body'),
      });
      setAckPanelLine(null);
      setAckNote('');
      setActiveTab('responses');
    } catch {
      toast({
        variant: 'error',
        title: t('sdcSup.toast.failed.title'),
        description: t('sdcSup.toast.failed.body'),
      });
    }
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={crumb}
        title={t('sdcSup.header.title')}
        subtitle={t('sdcSup.header.subtitle', { supplier: supplierName })}
        actions={<LivenessPill capability="forecastPublications" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('sdcSup.meta.summary', {
          lines: lines.length,
          responses: responses.length,
          planVersion: publication.planVersion,
        })}
      </PageMetaLine>

      {/* FLAG-2: the governed LIVE lane is empty — the sample renders ONLY under
          this explicit banner (the honest empty state of the live lane, stated). */}
      {!liveFeed && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-text-primary">
          <Info size={16} className="mt-0.5 shrink-0 text-warning-hover" />
          <div>
            <div className="font-semibold text-warning-hover">{t('sdcSup.honesty.title')}</div>
            <p className="mt-0.5 text-text-secondary">{t('sdcSup.honesty.body')}</p>
          </div>
        </div>
      )}

      <SubTabs<TabKey>
        options={[
          { id: 'lines', label: t('sdcSup.tab.lines'), count: lines.length },
          { id: 'responses', label: t('sdcSup.tab.responses'), count: responses.length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        className="mb-5"
      />

      {activeTab === 'lines' &&
        (lines.length === 0 ? (
          <div className="bg-bg-surface border border-border-subtle rounded-lg py-12 px-6 text-center">
            <div className="inline-flex w-12 h-12 rounded-full bg-bg-hover items-center justify-center mb-3">
              <CalendarRange size={20} className="text-text-tertiary" />
            </div>
            <div className="text-base font-semibold text-text-primary mb-1">
              {t('sdcSup.lines.emptyTitle')}
            </div>
            <div className="text-sm text-text-tertiary">{t('sdcSup.lines.emptyBody')}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4" data-testid="sdcsup-lines">
            {lines.map((line) => (
              <LineCard
                key={`${line.materialCode}|${line.periodBucket}`}
                line={line}
                latest={latestResponseFor(responses, publication, line)}
                onConfirm={openConfirm}
                onAcknowledge={openAcknowledge}
              />
            ))}
          </div>
        ))}
      {activeTab === 'responses' && <ResponsesTab responses={responses} />}

      <SidePanel
        open={panelLine !== null}
        onClose={() => setPanelLine(null)}
        title={
          panelLine
            ? t('sdcSup.panel.title', { material: materialLabel(panelLine.materialCode) })
            : ''
        }
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setPanelLine(null)}>
              {t('sdcSup.panel.cancel')}
            </Button>
            {/* F-3 — the ONE solid primary on this surface: the governed commit. */}
            <Button
              variant="primary"
              icon={Send}
              disabled={submitMutation.isPending}
              onClick={submitConfirmation}
            >
              {submitMutation.isPending
                ? t('sdcSup.panel.submitting')
                : t('sdcSup.panel.submit')}
            </Button>
          </>
        }
      >
        {panelLine && (
          <div className="space-y-5">
            <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">
                  {panelLine.materialCode}
                </Data>
                <span className={CHIP}>
                  {panelLine.commitmentClass === 'firm' && <Lock size={11} aria-hidden="true" />}
                  {t(CLASS_LABEL_KEY[panelLine.commitmentClass])}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
                <span>
                  {t('sdcSup.panel.requested')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {formatNumber(panelLine.forecastQty)} {panelLine.uom}
                  </Data>
                </span>
                <span>
                  {t('sdcSup.line.period')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {panelLine.periodBucket}
                  </Data>
                </span>
              </div>
            </section>

            <FormSection
              eyebrow={t('sdcSup.panel.qty.eyebrow')}
              title={t('sdcSup.panel.qty.title')}
              description={t('sdcSup.panel.qty.desc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-qty">
                  {t('sdcSup.panel.qtyLabel', { uom: panelLine.uom })}
                </label>
                <input
                  id="sdcsup-qty"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.confirmedQty}
                  onChange={(e) => setForm({ ...form, confirmedQty: e.target.value })}
                  className={inputClass}
                />
              </div>
            </FormSection>

            <FormSection
              eyebrow={t('sdcSup.panel.date.eyebrow')}
              title={t('sdcSup.panel.date.title')}
              description={t('sdcSup.panel.date.desc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-date">
                  {t('sdcSup.panel.committedDate')}
                </label>
                <input
                  id="sdcsup-date"
                  type="date"
                  value={form.committedDate}
                  onChange={(e) => setForm({ ...form, committedDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="sdcsup-constraint">
                  {t('sdcSup.panel.capacityConstraint')}
                </label>
                <input
                  id="sdcsup-constraint"
                  type="text"
                  placeholder={t('sdcSup.panel.capacityPlaceholder')}
                  value={form.capacityConstraint}
                  onChange={(e) => setForm({ ...form, capacityConstraint: e.target.value })}
                  className={inputClass}
                />
              </div>
            </FormSection>

            <FormSection
              eyebrow={t('sdcSup.panel.rootCause.eyebrow')}
              title={t('sdcSup.panel.rootCause.title')}
              description={t('sdcSup.panel.rootCause.desc')}
            >
              <div>
                <label className={labelClass} htmlFor="sdcsup-rootcause">
                  {t('sdcSup.panel.rootCause.level1')}
                  {isShort && <span className="text-danger"> *</span>}
                </label>
                <select
                  id="sdcsup-rootcause"
                  value={form.rootCauseLevel1}
                  onChange={(e) => setForm({ ...form, rootCauseLevel1: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('sdcSup.panel.rootCause.select')}</option>
                  {ROOT_CAUSE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`sdcSup.rootCause.${level}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="sdcsup-rootcause-note">
                  {t('sdcSup.panel.rootCause.note')}
                </label>
                <textarea
                  id="sdcsup-rootcause-note"
                  rows={3}
                  placeholder={t('sdcSup.panel.rootCause.notePlaceholder')}
                  value={form.rootCauseNote}
                  onChange={(e) => setForm({ ...form, rootCauseNote: e.target.value })}
                  className={`${inputClass} resize-y`}
                />
              </div>
            </FormSection>
          </div>
        )}
      </SidePanel>

      {/* SDC-2b-EXT — the LIGHT visibility-response panel: acknowledge +
          optional signal. The commit stays OUTLINE — solid is reserved for
          real commitments (DP2-BUTTON-01); an acknowledgment commits nothing. */}
      <SidePanel
        open={ackPanelLine !== null}
        onClose={() => setAckPanelLine(null)}
        title={
          ackPanelLine
            ? t('sdcSup.ackPanel.title', { material: materialLabel(ackPanelLine.materialCode) })
            : ''
        }
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setAckPanelLine(null)}>
              {t('sdcSup.panel.cancel')}
            </Button>
            <Button
              variant="outline"
              disabled={acknowledgeMutation.isPending}
              onClick={submitAcknowledgment}
            >
              {acknowledgeMutation.isPending
                ? t('sdcSup.ackPanel.submitting')
                : t('sdcSup.ackPanel.submit')}
            </Button>
          </>
        }
      >
        {ackPanelLine && (
          <div className="space-y-5">
            <section className="bg-bg-hover border border-border-subtle rounded-md px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Data className="text-sm font-bold text-text-primary">
                  {ackPanelLine.materialCode}
                </Data>
                <span className={CHIP}>{t(CLASS_LABEL_KEY[ackPanelLine.commitmentClass])}</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-tertiary">
                <span>
                  {t('sdcSup.panel.requested')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {formatNumber(ackPanelLine.forecastQty)} {ackPanelLine.uom}
                  </Data>
                </span>
                <span>
                  {t('sdcSup.line.period')}{' '}
                  <Data as="strong" className="text-text-primary">
                    {ackPanelLine.periodBucket}
                  </Data>
                </span>
              </div>
              <p className="mt-2 text-xs text-text-secondary">{t('sdcSup.ackPanel.desc')}</p>
            </section>

            <div>
              <label className={labelClass} htmlFor="sdcsup-ack-note">
                {t('sdcSup.ackPanel.note')}
              </label>
              <textarea
                id="sdcsup-ack-note"
                rows={3}
                placeholder={t('sdcSup.ackPanel.notePlaceholder')}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

// Wrapper: identity gate + the scoped reads + the four honest states, exactly
// the SupplierRFQs shape.
const SupplierForecasts: React.FC = () => {
  const { t } = useTranslation();
  const crumb = [t('sdcSup.crumb.section'), t('sdcSup.crumb.page')];
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const supplierQuery = useCurrentSupplier();
  const linesQuery = useOwnForecastLines();
  const responsesQuery = useOwnRequirementResponses();

  if (!supplierId) return <NoSupplierIdentity />;
  if (supplierQuery.isPending || linesQuery.isPending || responsesQuery.isPending)
    return <LoadingState breadcrumb={crumb} />;
  if (supplierQuery.isError || linesQuery.isError || responsesQuery.isError)
    return (
      <ErrorState
        breadcrumb={crumb}
        error={supplierQuery.error ?? linesQuery.error ?? responsesQuery.error}
        onRetry={() => {
          supplierQuery.refetch();
          linesQuery.refetch();
          responsesQuery.refetch();
        }}
      />
    );

  const mySupplier = supplierQuery.data ?? null;
  if (!mySupplier) return <NoSupplierIdentity />;

  const read = linesQuery.data;
  const responses = responsesQuery.data ?? [];
  if (!read?.publication)
    return (
      <EmptyState
        breadcrumb={crumb}
        title={t('sdcSup.empty.title')}
        subtitle={t('sdcSup.empty.subtitle', { supplier: mySupplier.name })}
        message={t('sdcSup.empty.message')}
      />
    );

  return (
    <ForecastWorkspace
      supplierId={supplierId}
      supplierName={mySupplier.name}
      publication={read.publication}
      lines={read.lines}
      liveFeed={read.liveFeed}
      responses={responses}
    />
  );
};

export default SupplierForecasts;
