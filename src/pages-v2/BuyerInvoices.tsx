import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileSpreadsheet,
  Database,
  ChevronRight,
  Send,
  Download,
  MessageCircle,
  Mail,
  Globe,
  LucideIcon,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import KpiCard from '../components/ui-v2/KpiCard';
import BulkActionsBar from '../components/ui-v2/BulkActionsBar';
import SubTabs from '../components/ui-v2/SubTabs';
import FilterChipsBar from '../components/ui-v2/FilterChipsBar';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import { useToast } from '../hooks/useToast';

type InvStatus =
  | 'Pending Match'
  | 'Approved'
  | 'Disputed'
  | 'Payment Released'
  | 'Overdue';

type MatchStatus =
  | 'Matched'
  | 'Pending GR'
  | 'Qty Mismatch'
  | 'Price Variance'
  | 'Pending';

interface BuyerInvoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  supplierId: string;
  poNumber: string;
  poId: string;
  amount: number;
  currency: string;
  status: InvStatus;
  receivedDate: string;
  dueDate: string;
  paymentDate: string | null;
  matchStatus: MatchStatus;
  sapFiDoc: string | null;
  sapGrDoc: string | null;
  approver: string;
  paymentTerms: string;
  daysOutstanding: number;
  bankAccount: string;
  channel: 'WhatsApp' | 'Email' | 'Web' | 'API';
}

const BUYER_INVOICES: BuyerInvoice[] = [
  { id: 'binv-001', invoiceNumber: 'INV-2025-ECO-0341', supplierName: 'PT Ecogreen Oleochemicals', supplierId: 'sup-001', poNumber: 'PO-2025-00101', poId: 'po-001', amount: 1_250_000_000, currency: 'IDR', status: 'Payment Released', receivedDate: '2025-03-22', dueDate: '2025-05-05', paymentDate: '2025-04-30', matchStatus: 'Matched', sapFiDoc: 'FI-5100009100', sapGrDoc: 'GR-4900009201', approver: 'Finance Controller', paymentTerms: 'Net 45', daysOutstanding: 0, bankAccount: 'BCA 028-345-6789', channel: 'API' },
  { id: 'binv-002', invoiceNumber: 'INV-2025-GIV-0892', supplierName: 'Givaudan Indonesia Fragrances', supplierId: 'sup-003', poNumber: 'PO-2025-00103', poId: 'po-003', amount: 2_000_000_000, currency: 'IDR', status: 'Approved', receivedDate: '2025-04-01', dueDate: '2025-05-01', paymentDate: null, matchStatus: 'Matched', sapFiDoc: 'FI-5100009312', sapGrDoc: 'GR-4900009344', approver: 'VP SCM', paymentTerms: 'Net 30', daysOutstanding: 7, bankAccount: 'Mandiri 123-456-7890', channel: 'API' },
  { id: 'binv-003', invoiceNumber: 'INV-2025-MUS-0214', supplierName: 'PT Musim Mas Specialty Fats', supplierId: 'sup-002', poNumber: 'PO-2025-00102', poId: 'po-002', amount: 875_000_000, currency: 'IDR', status: 'Pending Match', receivedDate: '2025-04-08', dueDate: '2025-05-23', paymentDate: null, matchStatus: 'Pending GR', sapFiDoc: null, sapGrDoc: null, approver: 'Procurement Officer', paymentTerms: 'Net 45', daysOutstanding: 0, bankAccount: 'BNI 456-789-0123', channel: 'Web' },
  { id: 'binv-004', invoiceNumber: 'INV-2025-BAS-0561', supplierName: 'BASF Personal Care Emulsifiers GmbH', supplierId: 'sup-005', poNumber: 'PO-2025-00013', poId: 'po-013', amount: 560_000_000, currency: 'IDR', status: 'Payment Released', receivedDate: '2025-03-15', dueDate: '2025-04-14', paymentDate: '2025-04-12', matchStatus: 'Matched', sapFiDoc: 'FI-5100009198', sapGrDoc: 'GR-4900009189', approver: 'Finance Controller', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'Deutsche Bank DE89-3704', channel: 'API' },
  { id: 'binv-005', invoiceNumber: 'INV-2025-BRL-0042', supplierName: 'PT Berlina Packaging Indonesia', supplierId: 'sup-007', poNumber: 'PO-2025-00107', poId: 'po-007', amount: 320_000_000, currency: 'IDR', status: 'Approved', receivedDate: '2025-04-10', dueDate: '2025-05-10', paymentDate: null, matchStatus: 'Matched', sapFiDoc: 'FI-5100009441', sapGrDoc: 'GR-4900009420', approver: 'Procurement Officer', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp' },
  { id: 'binv-006', invoiceNumber: 'INV-2025-BRL-0043', supplierName: 'PT Berlina Packaging Indonesia', supplierId: 'sup-007', poNumber: 'PO-2025-00108', poId: 'po-008', amount: 185_000_000, currency: 'IDR', status: 'Disputed', receivedDate: '2025-04-12', dueDate: '2025-05-12', paymentDate: null, matchStatus: 'Qty Mismatch', sapFiDoc: null, sapGrDoc: 'GR-4900009488', approver: 'Finance Controller', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'BCA 028-111-2222', channel: 'WhatsApp' },
  { id: 'binv-007', invoiceNumber: 'INV-2025-EVO-0188', supplierName: 'Evonik Specialty Chemicals France', supplierId: 'sup-006', poNumber: 'PO-2025-00014', poId: 'po-014', amount: 410_000_000, currency: 'IDR', status: 'Overdue', receivedDate: '2025-03-25', dueDate: '2025-04-03', paymentDate: null, matchStatus: 'Matched', sapFiDoc: 'FI-5100009288', sapGrDoc: 'GR-4900009302', approver: 'Finance Controller', paymentTerms: 'Net 10', daysOutstanding: 34, bankAccount: 'Société Générale FR76-3000', channel: 'Email' },
  { id: 'binv-008', invoiceNumber: 'INV-2025-FIR-0309', supplierName: 'Firmenich Malaysia Sdn. Bhd.', supplierId: 'sup-004', poNumber: 'PO-2025-00018', poId: 'po-018', amount: 890_000_000, currency: 'IDR', status: 'Payment Released', receivedDate: '2025-03-18', dueDate: '2025-04-17', paymentDate: '2025-04-15', matchStatus: 'Matched', sapFiDoc: 'FI-5100009241', sapGrDoc: 'GR-4900009255', approver: 'VP SCM', paymentTerms: 'Net 30', daysOutstanding: 0, bankAccount: 'Maybank MY-1234-5678', channel: 'Web' },
];

const STATUS_VARIANT: Record<InvStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  'Pending Match': 'neutral',
  Approved: 'success',
  Disputed: 'danger',
  'Payment Released': 'success',
  Overdue: 'danger',
};

const MATCH_VARIANT: Record<MatchStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Matched: 'success',
  'Pending GR': 'neutral',
  Pending: 'neutral',
  'Qty Mismatch': 'danger',
  'Price Variance': 'danger',
};

const CHANNEL_ICON: Record<BuyerInvoice['channel'], LucideIcon> = {
  WhatsApp: MessageCircle,
  Email: Mail,
  Web: Globe,
  API: Send,
};

const AGING_DATA = [
  { bucket: 'Current', amount: 3195, count: 3, risk: 'success' as const, riskLabel: 'Low' },
  { bucket: '1–30d', amount: 320, count: 1, risk: 'warning' as const, riskLabel: 'Medium' },
  { bucket: '31–60d', amount: 410, count: 1, risk: 'danger' as const, riskLabel: 'High' },
  { bucket: '61–90d', amount: 0, count: 0, risk: 'danger' as const, riskLabel: 'High' },
  { bucket: '>90d', amount: 0, count: 0, risk: 'danger' as const, riskLabel: 'High' },
];

const MONTHLY_SPEND = [
  { month: 'Nov 24', paid: 1800, pending: 400 },
  { month: 'Dec 24', paid: 2100, pending: 350 },
  { month: 'Jan 25', paid: 1950, pending: 500 },
  { month: 'Feb 25', paid: 2400, pending: 280 },
  { month: 'Mar 25', paid: 3100, pending: 380 },
  { month: 'Apr 25', paid: 890, pending: 3195 },
];

const fmtCompact = (n: number): string => `Rp ${(n / 1_000_000).toFixed(0)}jT`;
const fmtFull = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`;
const fmtDate = (s: string | null): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const TOKEN_SUCCESS = '#107E3E';
const TOKEN_WARNING = '#B45309';
const TOKEN_DANGER = '#BB0000';
const TOKEN_TEAL = '#0097A7';
const TOKEN_MUTED = '#6B7785';

interface ChartTooltipPayload {
  name: string;
  value: number;
  color?: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
  suffix?: string;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, label, suffix = 'jT' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-subtle rounded-md shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-text-primary mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: Rp {p.value}
          {suffix}
        </div>
      ))}
    </div>
  );
};

type TabKey = 'queue' | 'analytics' | 'aging';
type StatusFilter = InvStatus | 'all';
type PanelMode = 'detail' | 'confirming' | 'remittance';

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Pending Match', label: 'Pending Match' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Payment Released', label: 'Released' },
  { id: 'Disputed', label: 'Disputed' },
  { id: 'Overdue', label: 'Overdue' },
];

const FOOTER_ACTION_BY_STATUS: Record<InvStatus, string> = {
  'Pending Match': 'Review match',
  Approved: 'Release payment',
  Disputed: 'Resolve dispute',
  'Payment Released': 'Send remittance',
  Overdue: 'Escalate',
};

const loadGRPosted = (): string[] => {
  try {
    const raw = localStorage.getItem('paragon_gr_posted');
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const initialInvoices = (): BuyerInvoice[] => {
  const posted = loadGRPosted();
  return BUYER_INVOICES.map((inv) =>
    posted.includes(inv.poNumber) &&
    inv.status === 'Pending Match' &&
    inv.matchStatus === 'Pending GR'
      ? {
          ...inv,
          status: 'Approved' as InvStatus,
          matchStatus: 'Matched' as MatchStatus,
          sapGrDoc: `GR-490000${Math.floor(1000 + Math.random() * 9000)}`,
        }
      : inv,
  );
};

const BuyerInvoices: React.FC = () => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<BuyerInvoice[]>(() => initialInvoices());
  const [tab, setTab] = useState<TabKey>('queue');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<BuyerInvoice | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('detail');

  const counts = useMemo(() => {
    const by = (s: InvStatus) => invoices.filter((i) => i.status === s).length;
    return {
      all: invoices.length,
      pendingMatch: by('Pending Match'),
      approved: by('Approved'),
      released: by('Payment Released'),
      disputed: by('Disputed'),
      overdue: by('Overdue'),
    };
  }, [invoices]);

  const sums = useMemo(() => {
    const sum = (filter: (i: BuyerInvoice) => boolean) =>
      invoices.filter(filter).reduce((a, b) => a + b.amount, 0);
    return {
      pendingApproval: sum((i) => i.status === 'Pending Match' || i.status === 'Approved'),
      released: sum((i) => i.status === 'Payment Released'),
      disputed: sum((i) => i.status === 'Disputed'),
      overdue: sum((i) => i.status === 'Overdue'),
    };
  }, [invoices]);

  const pendingApprovalCount = counts.pendingMatch + counts.approved;

  const matchCounts = useMemo(() => {
    const by = (m: MatchStatus) => invoices.filter((i) => i.matchStatus === m).length;
    return {
      matched: by('Matched'),
      pendingGr: by('Pending GR'),
      qtyMismatch: by('Qty Mismatch'),
      priceVariance: by('Price Variance'),
    };
  }, [invoices]);

  const overdueInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'Overdue'),
    [invoices],
  );
  const disputedInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'Disputed'),
    [invoices],
  );

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? invoices
        : invoices.filter((i) => i.status === statusFilter),
    [invoices, statusFilter],
  );

  const lastUpdated = useMemo(() => {
    const latest = invoices.reduce(
      (acc, i) => (i.receivedDate > acc ? i.receivedDate : acc),
      invoices[0]?.receivedDate ?? '',
    );
    return fmtDate(latest);
  }, [invoices]);

  const closePanel = () => {
    setSelected(null);
    setPanelMode('detail');
  };

  const openInvoice = (inv: BuyerInvoice) => {
    setSelected(inv);
    setPanelMode('detail');
  };

  const handleFooterAction = () => {
    if (!selected) return;
    if (selected.status === 'Approved') {
      setPanelMode('confirming');
      return;
    }
    if (selected.status === 'Payment Released') {
      setPanelMode('remittance');
      return;
    }
    if (selected.status === 'Pending Match') {
      toast({
        title: `${selected.invoiceNumber}`,
        description: 'Awaiting GR confirmation in SAP before approval.',
      });
      return;
    }
    if (selected.status === 'Overdue') {
      toast({
        variant: 'warning',
        title: `${selected.invoiceNumber} escalated`,
        description: 'Routed to Finance Controller for urgent action.',
      });
      return;
    }
    if (selected.status === 'Disputed') {
      toast({
        variant: 'info',
        title: `Opening dispute thread for ${selected.invoiceNumber}`,
        description: 'Credit note required before payment release.',
      });
    }
  };

  const confirmRelease = () => {
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    const released: BuyerInvoice = {
      ...selected,
      status: 'Payment Released',
      paymentDate: today,
    };
    setInvoices((prev) =>
      prev.map((i) => (i.id === selected.id ? released : i)),
    );
    setSelected(released);
    setPanelMode('detail');
    toast({
      variant: 'success',
      title: 'Payment released',
      description: `${released.invoiceNumber} — SAP FI document will post within 24 hours.`,
    });
  };

  const sendRemittance = () => {
    if (!selected) return;
    toast({
      variant: 'success',
      title: `Remittance advice sent to ${selected.supplierName}`,
      description: `Delivered via ${selected.channel}.`,
    });
    setPanelMode('detail');
  };

  const downloadPdf = () => {
    toast({
      title: 'Downloading remittance PDF',
      description: 'File will be available in a moment.',
    });
  };

  const panelTitle = selected ? `Invoice ${selected.invoiceNumber}` : '';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['TRANSACT', 'INVOICES & PAYMENT']}
        title="Invoices & Payment"
        subtitle="3-way match · approval queue · payment release · SAP FI integration."
        actions={
          <BulkActionsBar
            actions={[
              {
                label: 'SAP AP Export',
                icon: Database,
                onClick: () =>
                  toast({
                    title: 'Exporting to SAP AP batch',
                  }),
              },
            ]}
            primary={{
              label: 'Export Report',
              icon: FileSpreadsheet,
              onClick: () =>
                toast({
                  variant: 'info',
                  title: 'Downloading aging report',
                }),
            }}
          />
        }
      />

      <PageMetaLine className="-mt-6 mb-6">
        {invoices.length} invoices · last updated {lastUpdated}
      </PageMetaLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="Pending Approval"
          value={fmtCompact(sums.pendingApproval)}
          subtitle={`${pendingApprovalCount} invoice${pendingApprovalCount === 1 ? '' : 's'}`}
          icon={Clock}
        />
        <KpiCard
          eyebrow="Payments Released"
          value={fmtCompact(sums.released)}
          subtitle={`${counts.released} invoice${counts.released === 1 ? '' : 's'}`}
          icon={CheckCircle2}
        />
        <KpiCard
          eyebrow="Disputed"
          value={fmtCompact(sums.disputed)}
          subtitle={`${counts.disputed} invoice${counts.disputed === 1 ? '' : 's'}`}
          icon={AlertTriangle}
        />
        <KpiCard
          eyebrow="Overdue"
          value={fmtCompact(sums.overdue)}
          subtitle={`${counts.overdue} invoice${counts.overdue === 1 ? '' : 's'}`}
          icon={AlertOctagon}
        />
      </div>

      {overdueInvoices.length > 0 && (
        <div className="bg-danger-soft border-l-2 border-danger rounded px-4 py-3 mb-3 text-sm text-danger flex items-start gap-2">
          <AlertOctagon size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>
              {overdueInvoices.length} overdue invoice
              {overdueInvoices.length > 1 ? 's' : ''}:{' '}
            </strong>
            {overdueInvoices
              .map(
                (i) =>
                  `${i.invoiceNumber} (${i.daysOutstanding}d overdue)`,
              )
              .join(' · ')}
          </div>
        </div>
      )}

      {disputedInvoices.length > 0 && (
        <div className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 mb-6 text-sm text-warning flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Invoice dispute: </strong>
            {disputedInvoices.map((i) => i.invoiceNumber).join(', ')} —
            Quantity mismatch on PT Berlina Packaging. Credit note required
            before payment.
          </div>
        </div>
      )}

      <SubTabs<TabKey>
        options={[
          { id: 'queue', label: 'Invoice Queue' },
          { id: 'analytics', label: 'Spend Analytics' },
          { id: 'aging', label: 'Aging Analysis' },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-5"
      />

      {tab === 'queue' && (
        <>
          <div className="mb-4">
            <FilterChipsBar<StatusFilter>
              options={STATUS_OPTIONS.map((o) => ({
                ...o,
                count:
                  o.id === 'all'
                    ? counts.all
                    : invoices.filter((i) => i.status === o.id).length,
              }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderCell>Invoice #</TableHeaderCell>
                <TableHeaderCell>Supplier</TableHeaderCell>
                <TableHeaderCell>PO ref</TableHeaderCell>
                <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                <TableHeaderCell>3-way match</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Due date</TableHeaderCell>
                <TableHeaderCell>SAP FI</TableHeaderCell>
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              </TableHeader>
              <tbody>
                {filtered.map((inv) => {
                  const Channel = CHANNEL_ICON[inv.channel];
                  return (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer"
                      onClick={() => openInvoice(inv)}
                    >
                      <TableCell>
                        <div className="font-mono text-xs font-semibold text-teal">
                          {inv.invoiceNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-text-primary truncate max-w-[14rem]">
                          {inv.supplierName}
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs text-text-tertiary mt-0.5">
                          <Channel size={12} />
                          via {inv.channel}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-text-secondary">
                          {inv.poNumber}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="font-semibold text-text-primary">
                          {fmtCompact(inv.amount)}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {fmtFull(inv.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={MATCH_VARIANT[inv.matchStatus]}>
                          {inv.matchStatus}
                        </StatusPill>
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={STATUS_VARIANT[inv.status]}>
                          {inv.status}
                        </StatusPill>
                        {inv.status === 'Overdue' && (
                          <div className="text-xs text-danger mt-1">
                            {inv.daysOutstanding}d overdue
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm text-text-secondary">
                          {fmtDate(inv.dueDate)}
                        </div>
                        {inv.paymentDate && (
                          <div className="text-xs text-success">
                            Paid {fmtDate(inv.paymentDate)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono text-xs ${
                            inv.sapFiDoc ? 'text-success' : 'text-text-tertiary'
                          }`}
                        >
                          {inv.sapFiDoc ?? '—'}
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
                      colSpan={9}
                      className="text-center text-sm text-text-tertiary py-10"
                    >
                      No invoices match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <h3 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
              Monthly Invoice Flow (Rp jT)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={MONTHLY_SPEND}
                margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
                <YAxis tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="paid"
                  fill={TOKEN_SUCCESS}
                  name="Released"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
                <Bar
                  dataKey="pending"
                  fill={TOKEN_TEAL}
                  name="Pending"
                  radius={[4, 4, 0, 0]}
                  stackId="a"
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <h3 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
              3-Way Match Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MatchTile
                label="Auto-Matched"
                count={matchCounts.matched}
                variant="success"
              />
              <MatchTile
                label="Pending GR"
                count={matchCounts.pendingGr}
                variant="neutral"
              />
              <MatchTile
                label="Qty Mismatch"
                count={matchCounts.qtyMismatch}
                variant="danger"
              />
              <MatchTile
                label="Price Variance"
                count={matchCounts.priceVariance}
                variant="danger"
              />
            </div>
          </section>
        </div>
      )}

      {tab === 'aging' && (
        <div className="flex flex-col gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6">
            <h3 className="text-base font-semibold text-text-primary mb-4 pb-3 border-b border-border-subtle">
              Invoice Aging Report (Rp jT)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={AGING_DATA}
                margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E9EE" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
                <YAxis tick={{ fontSize: 11, fill: TOKEN_MUTED }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="amount"
                  fill={TOKEN_TEAL}
                  name="Amount"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <div className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableHeaderCell>Aging bucket</TableHeaderCell>
                <TableHeaderCell className="text-right">Count</TableHeaderCell>
                <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                <TableHeaderCell className="text-right">% of AP</TableHeaderCell>
                <TableHeaderCell>Risk</TableHeaderCell>
              </TableHeader>
              <tbody>
                {AGING_DATA.map((row) => {
                  const total = AGING_DATA.reduce((a, b) => a + b.amount, 0);
                  const pct =
                    total > 0 ? ((row.amount / total) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow key={row.bucket}>
                      <TableCell>
                        <span className="font-semibold text-text-primary">
                          {row.bucket}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-semibold ${
                            row.amount > 0
                              ? 'text-text-primary'
                              : 'text-text-tertiary'
                          }`}
                        >
                          {row.amount > 0 ? `Rp ${row.amount}jT` : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {row.amount > 0 ? `${pct}%` : '—'}
                      </TableCell>
                      <TableCell>
                        {row.amount > 0 && (
                          <StatusPill variant={row.risk}>
                            {row.riskLabel}
                          </StatusPill>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </div>

          <div className="bg-info-soft border-l-2 border-info rounded px-4 py-3 text-sm text-text-primary flex items-start gap-2">
            <Database size={14} className="text-info shrink-0 mt-0.5" />
            <span>
              <strong className="text-info">Phase 2 — SAP FI Integration:</strong>{' '}
              Aging will pull from SAP AP open items. Payment runs triggered via
              SAP F110.
            </span>
          </div>
        </div>
      )}

      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={panelTitle}
        footerActions={
          selected && (
            <>
              {panelMode === 'detail' && (
                <>
                  <Button variant="secondary" onClick={closePanel}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={handleFooterAction}>
                    {FOOTER_ACTION_BY_STATUS[selected.status]}
                  </Button>
                </>
              )}
              {panelMode === 'confirming' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('detail')}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={confirmRelease}>
                    Confirm release — {fmtCompact(selected.amount)}
                  </Button>
                </>
              )}
              {panelMode === 'remittance' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setPanelMode('detail')}
                  >
                    Back
                  </Button>
                  <Button variant="primary" icon={Send} onClick={sendRemittance}>
                    Send to supplier
                  </Button>
                </>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Key facts
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Supplier</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.supplierName}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">PO reference</dt>
                  <dd className="text-text-primary font-mono">
                    {selected.poNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Amount</dt>
                  <dd className="text-text-primary font-semibold">
                    {fmtFull(selected.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment terms</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.paymentTerms}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Due date</dt>
                  <dd
                    className={`font-medium ${
                      selected.status === 'Overdue'
                        ? 'text-danger'
                        : 'text-text-primary'
                    }`}
                  >
                    {fmtDate(selected.dueDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Approver</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.approver}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Status</dt>
                  <dd>
                    <StatusPill variant={STATUS_VARIANT[selected.status]}>
                      {selected.status}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Channel</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.channel}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                3-way match
              </h3>
              <div
                className={`border-l-2 rounded px-3 py-3 text-sm ${
                  MATCH_VARIANT[selected.matchStatus] === 'success'
                    ? 'bg-success-soft border-success text-success'
                    : MATCH_VARIANT[selected.matchStatus] === 'danger'
                      ? 'bg-danger-soft border-danger text-danger'
                      : 'bg-bg-hover border-border-subtle text-text-secondary'
                }`}
              >
                <div className="font-semibold">{selected.matchStatus}</div>
                <div className="text-text-secondary mt-1">
                  {selected.matchStatus === 'Matched' &&
                    'PO, GR and invoice quantities + prices all reconcile.'}
                  {selected.matchStatus === 'Pending GR' &&
                    'Awaiting goods receipt posting in SAP before match can complete.'}
                  {selected.matchStatus === 'Pending' && 'Match not yet started.'}
                  {selected.matchStatus === 'Qty Mismatch' &&
                    'Delivered quantity does not match invoiced quantity. Credit note required.'}
                  {selected.matchStatus === 'Price Variance' &&
                    'Invoice unit price exceeds PO price by more than tolerance.'}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                SAP documents
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">FI document</dt>
                  <dd
                    className={`font-mono ${
                      selected.sapFiDoc ? 'text-success' : 'text-text-tertiary'
                    }`}
                  >
                    {selected.sapFiDoc ?? '— pending —'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">GR document</dt>
                  <dd
                    className={`font-mono ${
                      selected.sapGrDoc ? 'text-success' : 'text-text-tertiary'
                    }`}
                  >
                    {selected.sapGrDoc ?? '— pending —'}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-label text-text-tertiary uppercase mb-3">
                Payment
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Bank account</dt>
                  <dd className="text-text-primary font-medium">
                    {selected.bankAccount}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Payment date</dt>
                  <dd className="text-text-primary font-medium">
                    {fmtDate(selected.paymentDate)}
                  </dd>
                </div>
              </dl>
            </section>

            {panelMode === 'confirming' && (
              <section className="bg-warning-soft border-l-2 border-warning rounded px-4 py-3 text-sm text-warning">
                <div className="font-semibold mb-1">Confirm payment release</div>
                <div className="text-text-secondary">
                  This action cannot be undone. Payment of{' '}
                  <strong className="text-text-primary">
                    {fmtFull(selected.amount)}
                  </strong>{' '}
                  will be transferred to{' '}
                  <strong className="text-text-primary">
                    {selected.bankAccount}
                  </strong>
                  . Verify bank details before confirming.
                </div>
              </section>
            )}

            {panelMode === 'remittance' && (
              <section>
                <h3 className="text-label text-text-tertiary uppercase mb-3">
                  Remittance advice
                </h3>
                <div className="border border-border-subtle rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        ['Invoice no', selected.invoiceNumber],
                        ['PO reference', selected.poNumber],
                        ['Amount', fmtFull(selected.amount)],
                        ['Payment date', fmtDate(selected.paymentDate)],
                        ['Bank account', selected.bankAccount],
                      ].map(([label, value]) => (
                        <tr
                          key={label}
                          className="border-t border-border-subtle first:border-t-0"
                        >
                          <td className="px-3 py-2 text-text-tertiary uppercase tracking-wider font-semibold w-1/3">
                            {label}
                          </td>
                          <td className="px-3 py-2 font-semibold text-text-primary">
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    icon={Download}
                    onClick={downloadPdf}
                  >
                    Download PDF
                  </Button>
                </div>
                <div className="mt-3 bg-success-soft border-l-2 border-success rounded px-3 py-2 text-xs text-text-secondary">
                  This remittance advice confirms payment has been processed.
                  The supplier will receive notification via their preferred
                  communication channel.
                </div>
              </section>
            )}
          </div>
        )}
      </SidePanel>
    </AppShellV2>
  );
};

interface MatchTileProps {
  label: string;
  count: number;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

const MATCH_TILE_CLASS: Record<MatchTileProps['variant'], string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-bg-hover text-text-secondary',
};

const MatchTile: React.FC<MatchTileProps> = ({ label, count, variant }) => (
  <div
    className={`rounded-md px-4 py-4 text-center ${MATCH_TILE_CLASS[variant]}`}
  >
    <div className="text-label uppercase mb-2">{label}</div>
    <div className="text-3xl font-bold">{count}</div>
  </div>
);

export default BuyerInvoices;
