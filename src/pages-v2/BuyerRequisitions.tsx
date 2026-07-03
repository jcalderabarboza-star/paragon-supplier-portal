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
import KpiCard from '../components/ui-v2/KpiCard';
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
import { useRequisitions } from '../services/query/hooks';
import { formatNumber, formatIDR, formatDate } from '../lib/format';
import type { PurchaseRequisition, PRStatus } from '../services/data/types';

const REQUISITIONS_CRUMB = ['ACQUIRE', 'REQUISITIONS'];

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
  'w-full px-3 py-2 text-sm text-text-primary bg-white border border-border-input rounded-md focus:outline-none focus:border-teal placeholder:text-text-tertiary';
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
  const steps: { label: string; sub: string; tone: 'teal' | 'mid' | 'purple' | 'success' | 'warning' }[] = [
    { label: 'Create PR', sub: 'Requestor', tone: 'teal' },
    { label: 'Approval', sub: 'Section Head / VP', tone: 'mid' },
    { label: 'Source Check', sub: 'PIR or OA?', tone: 'purple' },
    { label: 'Create PO', sub: 'Source found', tone: 'success' },
    { label: 'Sourcing Event', sub: 'No source', tone: 'warning' },
  ];
  const TONE: Record<string, string> = {
    teal: 'bg-teal text-white',
    mid: 'bg-mid text-white',
    purple: 'bg-info text-white',
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
  };
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg px-5 py-4 mb-6">
      <div className="text-label text-text-tertiary uppercase mb-3">
        Procurement flow
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center min-w-[90px]">
              <span
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold text-center ${TONE[s.tone]}`}
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
  const [group, setGroup] = useState<GroupTab>('all');
  const [search, setSearch] = useState('');
  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState<NewPRForm>(emptyForm);

  const reqQuery = useRequisitions();
  const prs = reqQuery.data?.items ?? [];

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
        title="No requisitions yet"
        subtitle="Purchase requisitions are a buyer-side view."
        message="PRs and their sourcing status appear here for buyer accounts."
      />
    );

  const canSubmit =
    !!form.material && !!form.qty && !!form.date && !!form.costCenter;

  const submitNewPR = () => {
    if (!canSubmit) return;
    const prNum = `PR-2026-00${Math.floor(346 + Math.random() * 10)}`;
    toast({
      variant: 'success',
      title: `${prNum} submitted`,
      description: 'Routed to Section Head for approval.',
    });
    setForm(emptyForm);
    setNewOpen(false);
  };

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={REQUISITIONS_CRUMB}
        title="Purchase Requisitions"
        subtitle="Starting point of procurement · PR → Approval → Source check → PO or Sourcing Event."
        actions={
          <BulkActionsBar
            actions={[
              { label: 'Export', icon: FileSpreadsheet },
              { label: 'Bulk download', icon: Download },
            ]}
            primary={{
              label: 'New PR',
              icon: Plus,
              onClick: () => setNewOpen(true),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {prs.length} requisitions · last updated {formatDate(maxCreatedDate)}
      </PageMetaLine>

      <ProcurementFlow />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-5 mb-8">
        <KpiCard
          eyebrow="Draft"
          value={counts.draft.toString()}
          subtitle="Not yet submitted"
          icon={FileText}
        />
        <KpiCard
          eyebrow="Pending Approval"
          value={counts.pending.toString()}
          subtitle="Awaiting reviewer"
          icon={Clock}
        />
        <KpiCard
          eyebrow="Approved"
          value={counts.approved.toString()}
          subtitle="Cleared for sourcing"
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow="Sourcing Event"
          value={counts.sourcing.toString()}
          subtitle="RFQ in progress"
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow="PO Created"
          value={counts.po.toString()}
          subtitle="Converted to order"
          icon={ShoppingCart}
        />
      </div>

      <SubTabs<GroupTab>
        options={[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'Draft', label: 'Draft', count: counts.draft },
          { id: 'Pending Approval', label: 'Pending', count: counts.pending },
          { id: 'Approved', label: 'Approved', count: counts.approved },
          { id: 'Sourcing Event', label: 'Sourcing', count: counts.sourcing },
          { id: 'PO Created', label: 'PO Created', count: counts.po },
        ]}
        value={group}
        onChange={setGroup}
        className="mb-5"
      />

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by PR number, material, requestor, or linked doc…"
        />
      </div>

      <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableHeaderCell>PR #</TableHeaderCell>
            <TableHeaderCell>Material</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell className="text-right">Qty</TableHeaderCell>
            <TableHeaderCell>Required</TableHeaderCell>
            <TableHeaderCell className="text-right">Est. value</TableHeaderCell>
            <TableHeaderCell>Requestor</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
            <TableHeaderCell>Linked doc</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
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
                    <div className="font-mono text-xs font-semibold text-teal">
                      {pr.prNumber}
                    </div>
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
                    {formatNumber(pr.quantity)} {pr.uom}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-text-secondary">
                    {formatDate(pr.requiredDate)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                    {formatIDR(pr.estimatedValue, { compact: true })}
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
                      {hasPIR ? 'PIR' : 'None'}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-mono text-xs ${
                        pr.linkedDoc ? 'text-teal' : 'text-text-tertiary'
                      }`}
                    >
                      {pr.linkedDoc || '—'}
                    </span>
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
                  No requisitions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <div className="mt-6 bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
        <ClipboardList size={14} className="text-info shrink-0 mt-0.5" />
        <span>
          <strong className="text-info">S/4HANA Integration (Phase 2):</strong>{' '}
          PRs will be created in S/4HANA MM. Source check queries live PIRs and
          Outline Agreements. Approved PRs with source auto-trigger PO via
          ME21N.
        </span>
      </div>

      <SidePanel
        open={selectedPR !== null}
        onClose={() => setSelectedPR(null)}
        title={selectedPR ? `PR ${selectedPR.prNumber}` : ''}
        footerActions={
          selectedPR && (
            <>
              <Button
                variant="secondary"
                onClick={() => setSelectedPR(null)}
              >
                Close
              </Button>
              {selectedPR.status === 'Approved' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const hasPIR = selectedPR.sourceOfSupply === 'PIR exists';
                    toast({
                      variant: hasPIR ? 'success' : 'info',
                      title: hasPIR
                        ? `PO creation initiated for ${selectedPR.prNumber}`
                        : `Sourcing Event initiated for ${selectedPR.prNumber}`,
                    });
                    setSelectedPR(null);
                  }}
                >
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? 'Create PO directly'
                    : 'Create Sourcing Event'}
                </Button>
              )}
              {selectedPR.status === 'Draft' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    toast({
                      variant: 'success',
                      title: `${selectedPR.prNumber} submitted for approval`,
                    });
                    setSelectedPR(null);
                  }}
                >
                  Submit for approval
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
                Key facts
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Material</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.material}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Category</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.category}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Quantity</dt>
                  <dd className="text-text-primary font-medium">
                    {formatNumber(selectedPR.quantity)} {selectedPR.uom}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Required date</dt>
                  <dd className="text-text-primary font-medium">
                    {formatDate(selectedPR.requiredDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Estimated value</dt>
                  <dd className="text-text-primary font-semibold">
                    {formatIDR(selectedPR.estimatedValue, { compact: true })}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Priority</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.priority}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Requestor</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.requestor}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Cost center</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.costCenter}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Approver</dt>
                  <dd className="text-text-primary font-medium">
                    {selectedPR.approver}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
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
                Source of supply
              </h3>
              <div
                className={`border-l-2 rounded px-3 py-3 text-sm ${
                  selectedPR.sourceOfSupply === 'PIR exists'
                    ? 'bg-success-soft border-success text-success'
                    : 'bg-warning-soft border-warning text-warning'
                }`}
              >
                <div className="font-semibold">
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? 'Source found'
                    : 'No source'}
                </div>
                <div className="text-text-secondary mt-1">
                  {selectedPR.sourceOfSupply === 'PIR exists'
                    ? `PIR exists for ${selectedPR.material}.`
                    : `No PIR found for ${selectedPR.material}. A Sourcing Event will be required.`}
                </div>
              </div>
              {selectedPR.linkedDoc && (
                <div className="mt-3 text-sm text-text-secondary">
                  Linked document:{' '}
                  <span className="font-mono text-teal">
                    {selectedPR.linkedDoc}
                  </span>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-2">
                Justification
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
        title="New Purchase Requisition"
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canSubmit}
              onClick={submitNewPR}
            >
              Submit for approval
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <FormSection
            eyebrow="Step 1"
            title="Material & quantity"
            description="What's being requested?"
          >
            <div>
              <label className={labelClass}>Material / service *</label>
              <input
                className={inputClass}
                placeholder="e.g. Niacinamide B3 USP Grade"
                value={form.material}
                onChange={(e) =>
                  setForm({ ...form, material: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <div>
                <label className={labelClass}>Quantity *</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  value={form.qty}
                  onChange={(e) => setForm({ ...form, qty: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>UoM</label>
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
            eyebrow="Step 2"
            title="Timing & cost center"
            description="When is it needed and who pays?"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Required date *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Cost center *</label>
                <select
                  className={inputClass}
                  value={form.costCenter}
                  onChange={(e) =>
                    setForm({ ...form, costCenter: e.target.value })
                  }
                >
                  <option value="">Select…</option>
                  {COST_CENTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                className={inputClass}
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value })
                }
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </FormSection>

          <FormSection
            eyebrow="Step 3"
            title="Business justification"
            description="Why is this needed?"
          >
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              placeholder="Business reason…"
              value={form.justification}
              onChange={(e) =>
                setForm({ ...form, justification: e.target.value })
              }
            />
            <div className="bg-info-soft border-l-2 border-info rounded px-3 py-2 text-xs text-text-primary">
              After submission this PR routes to Section Head. If a PIR or
              Outline Agreement exists, a PO is created directly. Otherwise, a
              Sourcing Event is initiated.
            </div>
          </FormSection>
        </div>
      </SidePanel>
    </AppShellV2>
  );
};

export default BuyerRequisitions;
