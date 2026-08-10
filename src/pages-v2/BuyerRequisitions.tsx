import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  FileText,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
  AlertTriangle,
  Plus,
  Download,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import Data from '../components/ui-v2/Data';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import FormSection from '../components/ui-v2/FormSection';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useToast } from '../hooks/useToast';
import { useTranslation } from 'react-i18next';
import { useEnumLabel } from '../hooks/useEnumLabel';
import { useRequisitions } from '../services/query/hooks';
import { usePurchaseRequisitionCreate } from '../services/query/commandHooks';
import { DataError } from '../services/data/types';
import { formatNumber, formatIDR, formatDate } from '../lib/format';
import { normalizeQty, type QtyRefusalReason } from '../lib/localeNumber';
import type { PurchaseRequisition, PRStatus } from '../services/data/types';

// ── CP-0 · W1 · PR-2b — the New-PR quantity is PARSED, never coerced ─────────
// `Number(form.qty)` behind a `type="number"` field read "4.500" as 4.5, so a
// buyer authoring 4,500 KG minted a Draft PR for 4.5 KG — silently, and with a
// real audited document number attached. The field is now
// `type="text" inputmode="decimal"` (ruling 6.2) and routes through the ONE
// legal parser with NO convention hint, so a token legal under both readings
// refuses instead of being guessed.
//
// The type flip is what makes the parse non-optional rather than merely better:
// `type="number"` filtered the input space to what `Number` happens to accept,
// so a comma could never arrive. On a text field "4,500" reaches the handler,
// `Number` yields NaN, and NaN survives the whole spine — the dispatcher's
// requiredFields check tests emptiness (NaN is not empty), the command target
// accepts it (`typeof NaN === 'number'`), and `formatNumber(NaN)` renders a
// tidy em-dash. A corrupted quantity would look like a formatting nicety.
// Hence: the flip and the parse ship in one commit, never staged.
//
// EXHAUSTIVE, not Partial (the 2a discipline): widening QtyRefusalReason must
// break the build here, not render a blank refusal to a buyer.
const QTY_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'requisitions.new.qty.refused.empty',
  NOT_NUMERIC: 'requisitions.new.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'requisitions.new.qty.refused.ambiguous',
};

const STATUS_VARIANT: Record<
  PRStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  Approved: 'success',
  'Sourcing Event': 'neutral',
  'PO Created': 'success',
  Rejected: 'danger',
};

type GroupTab = 'all' | 'Draft' | 'Pending Approval' | 'Approved' | 'Sourcing Event' | 'PO Created';

const inputClass =
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-action placeholder:text-text-tertiary';
const labelClass =
  'block text-label text-text-tertiary uppercase mb-1';

const COST_CENTERS = [
  'CC-RD-001 — R&D',
  'CC-PKG-002 — Packaging',
  'CC-MFG-001 — Manufacturing',
  'CC-SC-001 — Supply Chain',
  'CC-RD-003 — Perfumer',
];

const UOM_OPTIONS = ['KG', 'L', 'PCS', 'MT', 'BOX'];
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

const ProcurementFlow: React.FC = () => {
  const { t } = useTranslation();
  // Calm outline register (DP-2/DP-3): the pipeline STAGES carry no state, so
  // they go neutral — the diagram's only real decision is the source-check fork,
  // so semantic colour is reserved for its two outcomes (PO = source found;
  // Sourcing Event = the no-source branch). Quiet soft-tint + hue-border chips,
  // no solid saturated fills, mirroring the StatusPill grammar.
  const steps: { label: string; sub: string; tone: 'neutral' | 'success' | 'warning' }[] = [
    { label: t('requisitions.flow.createPr.label'), sub: t('requisitions.flow.createPr.sub'), tone: 'neutral' },
    { label: t('requisitions.flow.approval.label'), sub: t('requisitions.flow.approval.sub'), tone: 'neutral' },
    { label: t('requisitions.flow.sourceCheck.label'), sub: t('requisitions.flow.sourceCheck.sub'), tone: 'neutral' },
    { label: t('requisitions.flow.createPo.label'), sub: t('requisitions.flow.createPo.sub'), tone: 'success' },
    { label: t('requisitions.flow.sourcingEvent.label'), sub: t('requisitions.flow.sourcingEvent.sub'), tone: 'warning' },
  ];
  const TONE: Record<string, string> = {
    neutral: 'bg-bg-hover text-text-secondary border-border-subtle',
    success: 'bg-success-soft text-success border-success/30',
    warning: 'bg-warning-soft text-warning-hover border-warning/30',
  };
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg px-5 py-4 mb-6">
      <div className="text-label text-text-tertiary uppercase mb-3">
        {t('requisitions.flow.label')}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center min-w-[90px]">
              <span
                className={`px-3 py-1.5 rounded-sm border text-[11px] font-semibold text-center ${TONE[s.tone]}`}
              >
                {s.label}
              </span>
              <span className="text-[10px] text-text-tertiary mt-1 text-center">
                {s.sub}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight size={14} className="text-text-tertiary -mt-3" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

interface NewPRForm {
  material: string;
  qty: string;
  uom: string;
  date: string;
  costCenter: string;
  priority: string;
  justification: string;
}

const emptyForm: NewPRForm = {
  material: '',
  qty: '',
  uom: 'KG',
  date: '',
  costCenter: '',
  priority: 'Medium',
  justification: '',
};

const BuyerRequisitions: React.FC = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const el = useEnumLabel();
  const REQUISITIONS_CRUMB = [
    t('requisitions.crumb.acquire'),
    t('requisitions.crumb.requisitions'),
  ];
  const [group, setGroup] = useState<GroupTab>('all');
  const [search, setSearch] = useState('');
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<NewPRForm>(emptyForm);

  const reqQuery = useRequisitions();
  const prs = reqQuery.data?.items ?? [];
  const createPr = usePurchaseRequisitionCreate();

  const counts = useMemo(() => {
    const by = (s: PRStatus) => prs.filter((p) => p.status === s).length;
    return {
      all: prs.length,
      draft: by('Draft'),
      pending: by('Pending Approval'),
      approved: by('Approved'),
      sourcing: by('Sourcing Event'),
      po: by('PO Created'),
      rejected: by('Rejected'),
    };
  }, [prs]);

  const maxCreatedDate = useMemo(
    () =>
      prs.reduce(
        (acc, p) => (p.createdDate > acc ? p.createdDate : acc),
        prs[0]?.createdDate ?? '',
      ),
    [prs],
  );

  const filtered = useMemo(() => {
    return prs.filter((pr) => {
      if (group !== 'all' && pr.status !== group) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          `${pr.prNumber} ${pr.material} ${pr.category} ${pr.requestor} ${pr.linkedDoc}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [prs, group, search]);

  if (reqQuery.isPending) return <LoadingState breadcrumb={REQUISITIONS_CRUMB} />;
  if (reqQuery.isError)
    return (
      <ErrorState
        breadcrumb={REQUISITIONS_CRUMB}
        error={reqQuery.error}
        onRetry={() => reqQuery.refetch()}
      />
    );
  if (prs.length === 0)
    return (
      <EmptyState
        breadcrumb={REQUISITIONS_CRUMB}
        title={t('requisitions.empty.title')}
        subtitle={t('requisitions.empty.subtitle')}
        message={t('requisitions.empty.message')}
      />
    );

  // The ONE parse. No hint: a buyer's own form carries no origin convention.
  const parsedQty = normalizeQty(form.qty);
  // A refused quantity is not a submittable form. `!!form.qty` used to be the
  // whole gate — presence, not readability — which is how "4.500" got through.
  const canSubmit =
    !!form.material && parsedQty.ok && !!form.date && !!form.costCenter;

  // G1.2b — the fabricated `PR-2026-00${random}` toast is retired onto the real
  // t_pr_create push (usePurchaseRequisitionCreate). The number now comes from
  // the store (store-assigned PR-2026-9xx), invalidation makes the real Draft
  // list-visible, and both failure channels surface honestly. Fresh authoring —
  // not a quantity override, so no C6-LOCK reason-gate here.
  const submitNewPR = async () => {
    // Re-checked at the click (belt-and-suspenders beside the disabled button):
    // an unreadable quantity short-circuits here, so nothing reaches the spine.
    if (!parsedQty.ok || !canSubmit || createPr.isPending) return;
    try {
      const result = await createPr.mutateAsync({
        payload: {
          material: form.material,
          quantity: parsedQty.value,
          uom: form.uom,
          requiredDate: form.date,
          costCenter: form.costCenter,
          priority: form.priority,
          justification: form.justification,
        },
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('requisitions.toast.submitFailed.title'),
          description: result.reason ?? t('requisitions.toast.submitFailed.desc'),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('requisitions.toast.submitted.title', { prNumber: result.entityId }),
        description: t('requisitions.toast.submitted.desc'),
      });
      setForm(emptyForm);
      setNewOpen(false);
    } catch (e) {
      toast({
        variant: 'error',
        title: t('requisitions.toast.submitFailed.title'),
        description: e instanceof DataError ? e.message : t('requisitions.toast.submitFailed.desc'),
      });
    }
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={REQUISITIONS_CRUMB}
        title={t('requisitions.header.title')}
        subtitle={t('requisitions.header.subtitle')}
        actions={
          <BulkActionsBar
            actions={[
              { label: t('requisitions.action.export'), icon: FileSpreadsheet },
              { label: t('requisitions.action.bulkDownload'), icon: Download },
            ]}
            primary={{
              label: t('requisitions.action.newPr'),
              icon: Plus,
              onClick: () => setNewOpen(true),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t(
          prs.length === 1
            ? 'requisitions.meta.summary.one'
            : 'requisitions.meta.summary.other',
          { count: prs.length, date: formatDate(maxCreatedDate) },
        )}
        {/* D-CENSUS-8 — PARTLY REAL, both axes. The PR CommandTarget is wired
            (G1.1) so a create genuinely dispatches; gate-2 still holds the feed
            SIMULATED (no live producer — SOMO F2 / Grid G1.2), which is why the
            feed axis reads the specific "awaiting live PR producer" text. */}
        <ProvenanceMarker capability="purchaseRequisitions" className="ml-3 align-middle" />
      </PageMetaLine>

      <ProcurementFlow />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
        <KpiCard
          eyebrow={t('requisitions.kpi.draft.eyebrow')}
          value={counts.draft.toString()}
          subtitle={t('requisitions.kpi.draft.subtitle')}
          icon={FileText}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.pending.eyebrow')}
          value={counts.pending.toString()}
          subtitle={t('requisitions.kpi.pending.subtitle')}
          icon={Clock}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.approved.eyebrow')}
          value={counts.approved.toString()}
          subtitle={t('requisitions.kpi.approved.subtitle')}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.sourcing.eyebrow')}
          value={counts.sourcing.toString()}
          subtitle={t('requisitions.kpi.sourcing.subtitle')}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow={t('requisitions.kpi.po.eyebrow')}
          value={counts.po.toString()}
          subtitle={t('requisitions.kpi.po.subtitle')}
          icon={ShoppingCart}
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: t('requisitions.tab.all'), count: counts.all },
          { id: 'Draft', label: t('requisitions.tab.draft'), count: counts.draft },
          { id: 'Pending Approval', label: t('requisitions.tab.pending'), count: counts.pending },
          { id: 'Approved', label: t('requisitions.tab.approved'), count: counts.approved },
          { id: 'Sourcing Event', label: t('requisitions.tab.sourcing'), count: counts.sourcing },
          { id: 'PO Created', label: t('requisitions.tab.po'), count: counts.po },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('requisitions.search.placeholder')}
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>{t('requisitions.table.col.pr')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.material')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.category')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('requisitions.table.col.qty')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.required')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('requisitions.table.col.estValue')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.requestor')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.status')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.source')}</TableHeaderCell>
            <TableHeaderCell>{t('requisitions.table.col.linkedDoc')}</TableHeaderCell>
            <TableHeaderCell className="text-right">{t('requisitions.table.col.actions')}</TableHeaderCell>
          </TableHeader>
          <tbody>
            {filtered.map((pr) => {
              const hasPIR = pr.sourceOfSupply === 'PIR exists';
              return (
                <TableRow
                  key={pr.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedPR(pr)}
                >
                  <TableCell>
                    <Data as="div" className="text-xs font-semibold text-text-primary">
                      {pr.prNumber}
                    </Data>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-text-primary truncate max-w-[14rem]">
                      {pr.material}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {pr.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-sm text-text-primary">
                    <Data>{formatNumber(pr.quantity)} {pr.uom}</Data>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-secondary">
                    <Data>{formatDate(pr.requiredDate)}</Data>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    <Data>{formatIDR(pr.estimatedValue, { compact: true })}</Data>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {pr.requestor}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={STATUS_VARIANT[pr.status]}>
                      {pr.status}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill variant={hasPIR ? 'success' : 'warning'}>
                      {hasPIR ? 'PIR' : t('requisitions.source.none')}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <Data
                      className={`text-xs ${
                        pr.linkedDoc ? 'text-text-primary' : 'text-text-tertiary'
                      }`}
                    >
                      {pr.linkedDoc || '—'}
                    </Data>
                  </TableCell>
                  <TableCell className="text-right">
                    <ChevronRight
                      size={16}
                      className="text-text-tertiary inline-block"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="text-center text-sm text-text-tertiary py-10"
                >
                  {t('requisitions.table.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="mt-6 bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <ClipboardList size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">{t('requisitions.footnote.title')}</strong>{' '}
          {t('requisitions.footnote.body')}
        </span>
      </div>

      <SidePanel
        open={selectedPR !== null}
        onClose={() => setSelectedPR(null)}
        title={selectedPR ? t('requisitions.panel.title', { number: selectedPR.prNumber }) : ''}
        footerActions={
          selectedPR && (
            <>
              <Button
                variant="secondary"
                onClick={() => setSelectedPR(null)}
              >
                {t('requisitions.panel.close')}
              </Button>
              {selectedPR.status === 'Approved' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const hasPIR = selectedPR.sourceOfSupply === 'PIR exists';
                    toast({
                      variant: hasPIR ? 'success' : 'info',
                      title: hasPIR
                        ? t('requisitions.toast.poInitiated.title', { prNumber: selectedPR.prNumber })
                        : t('requisitions.toast.sourcingInitiated.title', { prNumber: selectedPR.prNumber }),
                    });
                    setSelectedPR(null);
                  }}
                >
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? t('requisitions.panel.createPoDirectly')
                    : t('requisitions.panel.createSourcingEvent')}
                </Button>
              )}
              {selectedPR.status === 'Draft' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      variant: 'success',
                      title: t('requisitions.toast.submittedApproval.title', { prNumber: selectedPR.prNumber }),
                    });
                    setSelectedPR(null);
                  }}
                >
                  {t('requisitions.panel.submitForApproval')}
                </Button>
              )}
            </>
          )
        }
      >
        {selectedPR && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('requisitions.panel.keyFacts')}
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.material')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.material}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.category')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.quantity')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatNumber(selectedPR.quantity)} {selectedPR.uom}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.requiredDate')}</dt>
                  <Data as="dd" className="text-text-primary font-medium">
                    {formatDate(selectedPR.requiredDate)}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.estValue')}</dt>
                  <Data as="dd" className="text-text-primary font-semibold">
                    {formatIDR(selectedPR.estimatedValue, { compact: true })}
                  </Data>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.priority')}</dt>
                  <dd className="text-text-primary font-medium">
                    {el(selectedPR.priority)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.requestor')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.requestor}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.costCenter')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.costCenter}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.approver')}</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.approver}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">{t('requisitions.panel.field.status')}</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selectedPR.status]}>
                      {selectedPR.status}
                    </StatusPill>
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                {t('requisitions.panel.source.title')}
              </h3>
              <div
                className={`border-l-2 rounded px-3 py-3 text-sm ${
                  selectedPR.sourceOfSupply === 'PIR exists'
                    ? 'bg-success-soft border-success text-success'
                    : 'bg-warning-soft border-warning text-warning-hover'
                }`}
              >
                <div className="font-semibold">
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? t('requisitions.panel.source.found')
                    : t('requisitions.panel.source.none')}
                </div>
                <div className="text-text-secondary mt-1">
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? t('requisitions.panel.source.pirExists', { material: selectedPR.material })
                    : t('requisitions.panel.source.noPir', { material: selectedPR.material })}
                </div>
              </div>
              {selectedPR.linkedDoc && (
                <div className="mt-3 text-sm text-text-secondary">
                  {t('requisitions.panel.linkedDocument')}{' '}
                  <Data className="text-text-primary">
                    {selectedPR.linkedDoc}
                  </Data>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">
                {t('requisitions.panel.justification')}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {selectedPR.justification}
              </p>
            </section>
          </div>
        )}
      </SidePanel>

      <SidePanel
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t('requisitions.new.title')}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              {t('requisitions.new.cancel')}
            </Button>
            <Button
              variant="outline"
              disabled={!canSubmit}
              onClick={submitNewPR}
            >
              {t('requisitions.new.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection
            eyebrow={t('requisitions.new.step1.eyebrow')}
            title={t('requisitions.new.step1.title')}
            description={t('requisitions.new.step1.desc')}
          >
            <div>
              <label className={labelClass}>{t('requisitions.new.field.material')}</label>
              <input
                className={inputClass}
                placeholder={t('requisitions.new.placeholder.material')}
                value={form.material}
                onChange={(e) =>
                  setForm({ ...form, material: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <div>
                <label className={labelClass}>{t('requisitions.new.field.quantity')}</label>
                {/* type=text + inputmode=decimal (ruling 6.2): type=number
                    rejects the separators this field exists to adjudicate. */}
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder={t('requisitions.new.placeholder.quantity')}
                  aria-label={t('requisitions.new.field.quantity')}
                  aria-invalid={form.qty.trim() !== '' && !parsedQty.ok}
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                />
                {/* An untouched blank does not nag; a TYPED token that cannot be
                    read says so, and says what to type instead. */}
                {form.qty.trim() !== '' && !parsedQty.ok && (
                  <div
                    role="alert"
                    data-testid="new-pr-qty-refusal"
                    className="mt-1 text-[11px] text-danger"
                  >
                    {t(QTY_REFUSAL_KEY[parsedQty.reason])}
                  </div>
                )}
                <div className="mt-1 text-[11px] text-text-tertiary">
                  {t('requisitions.new.qty.hint')}
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('requisitions.new.field.uom')}</label>
                <select
                  className={inputClass}
                  value={form.uom}
                  onChange={(e) => setForm({ ...form, uom: e.target.value })}
                >
                  {UOM_OPTIONS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('requisitions.new.step2.eyebrow')}
            title={t('requisitions.new.step2.title')}
            description={t('requisitions.new.step2.desc')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('requisitions.new.field.requiredDate')}</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>{t('requisitions.new.field.costCenter')}</label>
                <select
                  className={inputClass}
                  value={form.costCenter}
                  onChange={(e) =>
                    setForm({ ...form, costCenter: e.target.value })
                  }
                >
                  <option value="">{t('requisitions.new.select.placeholder')}</option>
                  {COST_CENTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('requisitions.new.field.priority')}</label>
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {el(p)}
                  </option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection
            eyebrow={t('requisitions.new.step3.eyebrow')}
            title={t('requisitions.new.step3.title')}
            description={t('requisitions.new.step3.desc')}
          >
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              placeholder={t('requisitions.new.placeholder.justification')}
              value={form.justification}
              onChange={(e) =>
                setForm({ ...form, justification: e.target.value })
              }
            />
            <div className="bg-info-soft border-l-2 border-info rounded px-3 py-2 text-xs text-text-primary">
              {t('requisitions.new.info')}
            </div>
          </FormSection>
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerRequisitions;
