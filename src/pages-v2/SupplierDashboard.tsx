import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Truck,
  CreditCard,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  FileText,
  ChevronRight,
} from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import { statusTone } from '../lib/statusTone';
import {
  targetStatus,
  TARGET_STATUS,
  TargetStatus,
} from '../lib/chartPalette';
import TargetBar from '../components/ui-v2/TargetBar';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import Button from '../components/ui-v2/Button';
import Data from '../components/ui-v2/Data';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/useToast';
import { useCurrentIdentity } from '../context/CurrentIdentityContext';
import { PreferredChannel } from '../types/supplier.types';
import { POStatus } from '../services/data/types';
import NoSupplierIdentity from '../components/ui-v2/NoSupplierIdentity';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import OrdersToConfirmWidget from './widgets/OrdersToConfirmWidget';
import SupplierInvoicePaymentWidget from './widgets/SupplierInvoicePaymentWidget';
import SupplierRfqToRespondWidget from './widgets/SupplierRfqToRespondWidget';
import SupplierCertsExpiringWidget from './widgets/SupplierCertsExpiringWidget';
import {
  useCurrentSupplier,
  usePurchaseOrders,
  useSupplierInvoices,
  useDocuments,
} from '../services/query/hooks';
import {
  documentDisplayState,
  DISPLAY_STATE_LABEL_KEY,
  DISPLAY_STATE_TONE,
  DISPLAY_STATE_ACTION_KEY,
} from '../services/data/documentDisplayState';
import { daysUntil } from '../services/data/dayProjection';
import { DECLARED_PRESENT } from '../services/data/fixturePresent';

// ⚠️ ANCHORED — this surface rendered values derived from anchored
// fixture data against the WALL CLOCK, so what a reader saw moved every day
// with no commit involved. Module-scope `DECLARED_PRESENT`, the shipped
// pattern from `BuyerShipments` / `BuyerGoodsReceipt`, and behaviour-
// preserving for the same reason they are: this surface's families shift by
// `DECLARED_PRESENT - anchor` and so does this pin, so every rendered
// day-count is answered at the instant the fixtures were authored for.
//
// ⚠️ SESSION-WRITTEN STATE KEEPS THE WALL CLOCK. This constant is for READ
// projections only. A timestamp stamped onto something the user just did is a
// fact about this session, not about the fixture set, and anchoring one would
// tell the reader their own action happened weeks ago.
const TODAY = DECLARED_PRESENT;

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

const fmtIDR = (v: number): string => {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
};

const fmtDate = (s: string): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// DP2-TARGET-01: perf thresholds come from the central target-status system
// (target 90 → meeting ≥90, near ≥80, else missing) so the StatusPill and the
// KPI bars can't disagree. Kept returning StatusPill variants for the pill site.
const STATUS_TO_VARIANT: Record<TargetStatus, 'success' | 'warning' | 'danger'> = {
  meeting: 'success',
  near: 'warning',
  missing: 'danger',
};
const perfVariant = (v: number): 'success' | 'warning' | 'danger' =>
  STATUS_TO_VARIANT[targetStatus(v, 90)];

// Channel labels map to i18n keys; resolved with t() at the call site.
const CHANNEL_KEY: Record<PreferredChannel, string> = {
  [PreferredChannel.WHATSAPP]: 'supplierDashboard.channel.whatsapp',
  [PreferredChannel.WEB]: 'supplierDashboard.channel.web',
  [PreferredChannel.EMAIL]: 'supplierDashboard.channel.email',
  [PreferredChannel.API]: 'supplierDashboard.channel.api',
};

const GRADE_TONE: Record<Grade, { stroke: string; soft: string }> = {
  A: { stroke: '#107E3E', soft: '#E8F5EC' },
  B: { stroke: '#1E5BAE', soft: '#E5F0FF' },
  C: { stroke: '#B45309', soft: '#FEF3D6' },
  D: { stroke: '#BB0000', soft: '#FCE4E4' },
  F: { stroke: '#BB0000', soft: '#FCE4E4' },
};

interface ActionItem {
  id: string;
  Icon: typeof AlertTriangle;
  iconClass: string;
  iconBg: string;
  title: string;
  badge: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  desc: string;
  primary: boolean;
  btnLabel: string;
  time: string;
}

// Ledger register (DP2-FLAG-01) for the briefing rows: severity reads as a 3px
// left edge + a small dot, not a colored chip — consistent with the widget cards.
const BRIEF_EDGE: Record<ActionItem['badgeVariant'], string> = {
  danger: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-text-tertiary',
  success: 'border-l-success',
  neutral: 'border-l-border-subtle',
};
const BRIEF_DOT: Record<ActionItem['badgeVariant'], string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-text-tertiary',
  success: 'bg-success',
  neutral: 'bg-text-tertiary',
};


// ⚠️ **`DOC_STATUS_TONE` AND `DOC_STATUS_ACTION_KEY` ARE BOTH GONE, AND THE
// ACTION MAP IS THE ONE THAT MATTERED.** A badge that computes beside a label
// that does not is the same split one field over: this page would have shown
// a computed state next to a stored verb, and the verb is the half a supplier
// acts on. Both now come from `documentDisplayState`'s maps.
//
// ⚠️ **ONE TONE CHANGED, DELIBERATELY, AND IT IS NOT A DP-2 DECISION.**
// `'Awaiting Upload'` was `danger` here and `neutral` on
// `/supplier/documents` — the same state, two colours, one persona. The
// shared map cannot hold both, so the page's reading wins: a document nobody
// has supplied yet is not a failure, and `Rejected` is what red is for on
// this surface.
//
// ⚠️ **AND IT IS LATENT, NOT VISIBLE — A FIRST DRAFT OF THIS NOTE CLAIMED
// THE A/B WOULD SHOW IT, AND THE BROWSER PASS SAID OTHERWISE.** The tile
// below slices to the first four documents and the only `Awaiting Upload`
// row in the fixture is the sixth, so the changed tone renders nowhere
// today. It becomes visible the moment the slice, the ordering or the
// fixture moves. Recorded as latent because a colour change nobody can see
// is still a colour change, and the next person to widen that slice should
// not discover it as a surprise.


const GradeBadge: React.FC<{ grade: Grade; size?: 'sm' | 'md' }> = ({
  grade,
  size = 'md',
}) => {
  const tone = GRADE_TONE[grade];
  const px = size === 'sm' ? 'w-10 h-10 text-base' : 'w-16 h-16 text-3xl';
  return (
    <div
      className={`rounded-md flex items-center justify-center font-semibold ${px}`}
      style={{
        background: tone.soft,
        color: tone.stroke,
        border: `3px solid ${tone.stroke}`,
      }}
    >
      {grade}
    </div>
  );
};


const SupplierDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { identity } = useCurrentIdentity();
  const { supplierId } = identity;
  const dashCrumb = [
    t('supplierDashboard.crumb.acquire'),
    t('supplierDashboard.crumb.dashboard'),
  ];
  const [dismissedActions, setDismissedActions] = useState<string[]>([]);

  const supplierQuery = useCurrentSupplier();
  const posQuery = usePurchaseOrders();
  const invoicesQuery = useSupplierInvoices();
  const documentsQuery = useDocuments();

  const mySupplier = supplierQuery.data ?? null;

  const MY_POS = useMemo(() => posQuery.data?.items ?? [], [posQuery.data]);

  const unpaidInvoices = useMemo(
    () =>
      (invoicesQuery.data?.items ?? []).filter(
        (inv) =>
          inv.status !== 'Payment Released' &&
          inv.status !== 'Remittance Received',
      ).length,
    [invoicesQuery.data],
  );

  // The instant every clock read on this page reckons against — the
  // convention `SupplierDocuments` and the certs widget already use, so all
  // three answer as of the same moment rather than three `Date.now()` calls.
  const nowIso = TODAY;

  const documents = useMemo(
    () => (documentsQuery.data?.items ?? []).slice(0, 4),
    [documentsQuery.data],
  );

  /**
   * The one certificate the briefing should be shouting about — the SOONEST
   * of those that actually compute `expiring` or `expired`, or none.
   *
   * ⚠️ Read from `documentsQuery` and NOT from `documents`, which is sliced
   * to the first four for the tile below. A briefing that only noticed an
   * expiry when it happened to fall in the first four rows would be a
   * population bug wearing a layout decision.
   */
  const expiringDoc = useMemo(() => {
    const due = (documentsQuery.data?.items ?? [])
      .map((doc) => ({ doc, days: daysUntil(doc.expiryDate, nowIso) ?? 0 }))
      .filter(({ doc }) => {
        const st = documentDisplayState(doc, nowIso);
        return st === 'expiring' || st === 'expired';
      })
      .sort((x, y) => x.days - y.days);
    return due[0] ?? null;
  }, [documentsQuery.data, nowIso]);

  const dismiss = (id: string) =>
    setDismissedActions((prev) => [...prev, id]);

  const openOrders = useMemo(
    () =>
      MY_POS.filter(
        (po) =>
          po.status !== POStatus.DELIVERED && po.status !== POStatus.CLOSED,
      ).length,
    [MY_POS],
  );

  const pendingASNs = useMemo(
    () => MY_POS.filter((po) => po.status === POStatus.CONFIRMED).length,
    [MY_POS],
  );

  const needsConfirmCount = useMemo(
    () =>
      MY_POS.filter(
        (po) => po.status === POStatus.SENT || po.status === POStatus.ACKNOWLEDGED,
      ).length,
    [MY_POS],
  );

  const asnDueOrders = useMemo(
    () =>
      MY_POS.filter((po) => {
        if (po.status !== POStatus.CONFIRMED) return false;
        const delivery = new Date(po.requestedDeliveryDate);
        const today = new Date(TODAY);
        const daysLeft = Math.ceil(
          (delivery.getTime() - today.getTime()) / 86_400_000,
        );
        return daysLeft <= 7;
      }),
    [MY_POS],
  );

  if (!supplierId) return <NoSupplierIdentity />;
  if (
    supplierQuery.isPending ||
    posQuery.isPending ||
    invoicesQuery.isPending ||
    documentsQuery.isPending
  )
    return <LoadingState breadcrumb={dashCrumb} />;
  if (
    supplierQuery.isError ||
    posQuery.isError ||
    invoicesQuery.isError ||
    documentsQuery.isError
  )
    return (
      <ErrorState
        breadcrumb={dashCrumb}
        error={
          supplierQuery.error ??
          posQuery.error ??
          invoicesQuery.error ??
          documentsQuery.error
        }
        onRetry={() => {
          supplierQuery.refetch();
          posQuery.refetch();
          invoicesQuery.refetch();
          documentsQuery.refetch();
        }}
      />
    );
  if (!mySupplier)
    return (
      <EmptyState
        breadcrumb={dashCrumb}
        title={t('supplierDashboard.empty.title')}
        subtitle={t('supplierDashboard.empty.subtitle')}
        message={t('supplierDashboard.empty.message')}
      />
    );

  const grade = mySupplier.scorecardGrade as Grade;
  const channelLabel = t(CHANNEL_KEY[mySupplier.preferredChannel]);
  const otifVariant = perfVariant(mySupplier.otif);
  const otifStatusLabel =
    mySupplier.otif >= 90
      ? 'On Track'
      : mySupplier.otif >= 80
        ? 'Needs Attention'
        : 'At Risk';

  // i18n-defer: mock/sample data — the briefing is badged "Sample data"; these
  // action titles/descs/badges/labels are fixture narratives, kept EN by design.
  const allActions: ActionItem[] = [
    {
      id: 'po-confirm',
      Icon: AlertTriangle,
      iconClass: 'text-danger',
      iconBg: 'bg-danger-soft',
      title: `Confirm ${needsConfirmCount} purchase order${needsConfirmCount !== 1 ? 's' : ''}`,
      badge: 'Urgent',
      badgeVariant: 'danger',
      desc: 'PO-2025-00108 · Rp 185jT · Delivery 25 Apr 2025 — acknowledgement overdue 96h',
      primary: true,
      btnLabel: 'Confirm now',
      time: '~2 min',
    },
    // ⚠️ **THE CERTIFICATE CARD IS DERIVED NOW, AND WHAT IT REPLACED WAS NOT
    // MERELY UNTRANSLATED — IT CONTRADICTED THE PAGE IT SAT ON.** Retired,
    // quoted rather than deleted:
    //
    //     title: 'Upload ISO 9001:2015 certificate'
    //     badge: '45 days left'
    //     desc:  'Cert expires 24 May 2026 — upload renewal to avoid
    //             disruption to active POs'
    //
    // Three claims, and the fixture answers all three. The ISO 9001 cert is a
    // REAL row (`doc-005`) — so this was never authored-because-uncomputable,
    // it was authored beside its own subject. That row is not expiring: it
    // computes `valid`, and this card was urging a renewal on a certificate
    // with most of a year left, in a slot two cards down from `asn-*` entries
    // that have always computed their own day-counts.
    //
    // ⚠️ **AND `45 days left` DISAGREED WITH `expires 24 May 2026` ON THE SAME
    // CARD** — one implies a future date, the other names a past one. A
    // hand-written day-count decays; a hand-written PAIR of them decays out of
    // step, which is how one card ends up arguing with itself. No count is
    // written below: both come from `daysUntil` at the page's own instant.
    //
    // ⚠️ **IT IS TRANSLATED, WHICH THE `i18n-defer` ABOVE NO LONGER COVERS.**
    // That note acquits these entries as *fixture narratives, kept EN by
    // design*. This one is no longer a narrative — it reads a real document —
    // so the exemption lapses with the authorship. The remaining authored
    // cards are untouched and the note still covers them.
    ...expiringDoc
      ? [
          {
            id: `cert-renew-${expiringDoc.doc.id}`,
            Icon: Clock,
            iconClass: 'text-warning-hover',
            iconBg: 'bg-warning-soft',
            title: t('supplierDashboard.briefing.cert.title', {
              name: expiringDoc.doc.name,
            }),
            // The expired arm is reachable by the clock alone — no fixture
            // reaches it today, and the day one does the card must not still
            // say `days left`.
            badge:
              expiringDoc.days <= 0
                ? t('supplierDashboard.briefing.cert.badgeExpired')
                : t('supplierDashboard.briefing.cert.badge', {
                    count: expiringDoc.days,
                  }),
            badgeVariant: expiringDoc.days <= 0 ? ('danger' as const) : ('warning' as const),
            desc: t('supplierDashboard.briefing.cert.desc', {
              date: fmtDate(expiringDoc.doc.expiryDate ?? ''),
            }),
            primary: true,
            btnLabel: t('supplierDashboard.briefing.cert.cta'),
            time: '~5 min',
          },
        ]
      : [],
    ...asnDueOrders.map((po) => {
      const days = Math.ceil(
        (new Date(po.requestedDeliveryDate).getTime() - new Date(TODAY).getTime()) /
          86_400_000,
      );
      return {
        id: `asn-${po.id}`,
        Icon: Truck,
        iconClass: 'text-teal',
        iconBg: 'bg-teal-soft',
        title: `Create ASN for ${po.poNumber}`,
        badge: `Delivery in ${days}d`,
        badgeVariant: 'info' as const,
        desc: `${po.supplierName} · ${fmtDate(po.requestedDeliveryDate)} — ASN must be submitted before delivery`,
        primary: true,
        btnLabel: 'Create ASN',
        time: '~5 min',
      };
    }),
    {
      id: 'profile',
      Icon: User,
      iconClass: 'text-teal',
      iconBg: 'bg-teal-soft',
      title: 'Complete company profile',
      badge: 'When ready',
      badgeVariant: 'neutral',
      desc: 'Add bank account details and payment preferences to enable Net 15 payment terms',
      primary: false,
      btnLabel: 'Update profile',
      time: '~10 min',
    },
  ];

  const activeActions = allActions.filter(
    (a) => !dismissedActions.includes(a.id),
  );
  const remaining = activeActions.length;

  // ⚠️ **WALL CLOCK BY RULING, NOT BY OVERSIGHT (operator, 2026-09-10).**
  // This is the briefing greeting — a rendered DATE, so anchoring it does not
  // reconcile two numbers, it changes what the reader is told today is. That
  // puts it with `SupplierWhatsApp`'s `sessionOpened` and the wizard's
  // `inspectionInstant`: a fact about THIS reading, not a projection over
  // fixture data. The clock-derived BADGES on this page stay anchored above —
  // that is the read/write split this batch is built on, not a half-anchor.
  // `anchoredSurfaces.guard.test.tsx` asserts BOTH halves, so re-anchoring
  // this line goes red by name rather than passing quietly.
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const sortedPOs = [...MY_POS].sort((a, b) =>
    b.orderDate.localeCompare(a.orderDate),
  );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={dashCrumb}
        title={t('supplierDashboard.header.title', { name: mySupplier.name })}
        subtitle={t('supplierDashboard.header.subtitle', {
          // i18n-defer: mock/sample data — hardcoded last-login date.
          date: '5 April 2026',
          channel: channelLabel,
        })}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('supplierDashboard.meta.identity', {
          country: mySupplier.country,
          category: mySupplier.category,
        })}
        {/* D-CENSUS-8 — the KPI tiles above were the only unmarked figures on a page
            whose widgets each carry a derived marker; the briefing block below had
            its own "Sample data" badge while the numbers at the top had none. */}
        <ProvenanceMarker capability="dashboard" className="ml-3 align-middle" />
      </PageMetaLine>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <div className="text-section text-text-primary mb-1">
              {mySupplier.name}
            </div>
            <div className="text-sm text-text-secondary">
              {t('supplierDashboard.identity.sapBp', {
                bp: mySupplier.sapBpNumber,
                channel: channelLabel,
              })}
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-2">
                {t('supplierDashboard.identity.grade')}
              </div>
              <GradeBadge grade={grade} />
              <div className="text-xs text-text-secondary mt-1">
                {mySupplier.otif >= 90 ? '94' : mySupplier.otif >= 80 ? '82' : '70'} / 100
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <StatusPill variant={otifVariant}>{otifStatusLabel}</StatusPill>
              <div className="text-xs text-text-secondary">
                {t('supplierDashboard.identity.otif', { value: mySupplier.otif })}
              </div>
              <div className="text-xs text-text-tertiary">
                {t('supplierDashboard.identity.target')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.openOrders.eyebrow')}
          value={openOrders.toString()}
          subtitle={t('supplierDashboard.kpi.openOrders.subtitle')}
          icon={ClipboardList}
        />
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.pendingAsns.eyebrow')}
          value={pendingASNs.toString()}
          subtitle={t('supplierDashboard.kpi.pendingAsns.subtitle')}
          icon={Truck}
        />
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.unpaidInvoices.eyebrow')}
          value={unpaidInvoices.toString()}
          subtitle={
            unpaidInvoices > 0 ? (
              <span className="text-danger">
                {t('supplierDashboard.kpi.unpaidInvoices.pending')}
              </span>
            ) : (
              t('supplierDashboard.kpi.unpaidInvoices.settled')
            )
          }
          icon={CreditCard}
        />
        <KpiCard
          eyebrow={t('supplierDashboard.kpi.otif.eyebrow')}
          value={`${mySupplier.otif}%`}
          subtitle={t('supplierDashboard.kpi.otif.subtitle')}
          icon={Target}
        />
      </div>

      {/* Supplier module-summary widget grid — live adapters over real stores,
          alongside the existing panels (briefing serves as the alerts bar). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <OrdersToConfirmWidget />
        <SupplierInvoicePaymentWidget />
        <SupplierRfqToRespondWidget />
        {/* Sample-data widget (live=false, amber pill) — document fixture, no
            upload command yet: honest by construction, never faked green. */}
        <SupplierCertsExpiringWidget />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5">
        <div className="flex flex-col gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-text-primary">
                    {t('supplierDashboard.briefing.title')}
                  </div>
                  <StatusPill variant="neutral">
                    {t('supplierDashboard.briefing.sampleData')}
                  </StatusPill>
                </div>
                <div className="text-xs text-text-tertiary mt-0.5">{today}</div>
              </div>
              <StatusPill variant={remaining > 0 ? 'warning' : 'success'}>
                {remaining > 0
                  ? remaining === 1
                    ? t('supplierDashboard.briefing.actions.one', { count: remaining })
                    : t('supplierDashboard.briefing.actions.other', { count: remaining })
                  : t('supplierDashboard.briefing.allClear')}
              </StatusPill>
            </div>
            {remaining === 0 ? (
              <div className="py-10 px-6 text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-success-soft items-center justify-center mb-3">
                  <CheckCircle2 size={24} className="text-success" />
                </div>
                <div className="text-base font-semibold text-success mb-1">
                  {t('supplierDashboard.briefing.done.title')}
                </div>
                <div className="text-sm text-text-tertiary">
                  {t('supplierDashboard.briefing.done.body')}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {activeActions.map((action, idx) => {
                  const Icon = action.Icon;
                  return (
                    <div
                      key={action.id}
                      className={`px-5 py-4 flex gap-4 items-start border-l-[3px] ${
                        BRIEF_EDGE[action.badgeVariant]
                      } ${
                        idx < activeActions.length - 1
                          ? 'border-b border-border-subtle'
                          : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 bg-bg-hover">
                        <Icon size={16} className="text-text-tertiary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                          <span className="text-sm font-semibold text-text-primary">
                            {action.title}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                            <span
                              aria-hidden="true"
                              className={`h-1.5 w-1.5 rounded-full ${BRIEF_DOT[action.badgeVariant]}`}
                            />
                            {action.badge}
                          </span>
                        </div>
                        <div className="text-xs text-text-secondary mb-2">
                          {action.desc}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              // R1 — the description was a hardcoded template
                              // literal asserting "<label> workflow initiated."
                              // It was EN-only (both locales bypassed) and it was
                              // FALSE: this handler dismisses the card and does
                              // nothing else. `action.title` stays verbatim —
                              // it is sample-briefing DATA, not a claim.
                              toast({
                                variant: 'info',
                                title: action.title,
                                description: t('supplierDashboard.brief.toast.desc'),
                              });
                              dismiss(action.id);
                            }}
                            className="inline-flex items-center gap-1 text-sm font-medium text-action hover:underline"
                          >
                            {action.btnLabel}
                            <span aria-hidden="true">→</span>
                          </button>
                          <span className="text-xs text-text-tertiary inline-flex items-center gap-1">
                            <Clock size={11} /> {action.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h2 className="text-section text-text-primary">
                {t('supplierDashboard.orders.title')}
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableHeaderCell>{t('supplierDashboard.orders.col.po')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierDashboard.orders.col.orderDate')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('supplierDashboard.orders.col.items')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('supplierDashboard.orders.col.value')}</TableHeaderCell>
                <TableHeaderCell>{t('supplierDashboard.orders.col.status')}</TableHeaderCell>
                <TableHeaderCell className="text-right">{t('supplierDashboard.orders.col.action')}</TableHeaderCell>
              </TableHeader>
              <tbody>
                {sortedPOs.map((po) => {
                  const isActionable =
                    po.status === POStatus.SENT ||
                    po.status === POStatus.ACKNOWLEDGED;
                  const isConfirmed = po.status === POStatus.CONFIRMED;
                  const btnLabel = isActionable
                    ? t('supplierDashboard.orders.action.confirm')
                    : isConfirmed
                      ? t('supplierDashboard.orders.action.createAsn')
                      : t('supplierDashboard.orders.action.view');
                  return (
                    <TableRow key={po.id}>
                      <TableCell>
                        <Data className="text-xs font-bold text-text-primary">
                          {po.poNumber}
                        </Data>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-text-secondary">
                        <Data>{fmtDate(po.orderDate)}</Data>
                      </TableCell>
                      <TableCell className="text-right text-text-secondary">
                        {po.lineItems.length}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-text-primary whitespace-nowrap">
                        <Data>{fmtIDR(po.totalValue)}</Data>
                      </TableCell>
                      <TableCell>
                        <StatusPill variant={statusTone(po.status)}>
                          {po.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={isActionable ? 'outline' : 'secondary'}
                          onClick={() =>
                            toast({
                              variant: 'info',
                              title: isActionable
                                ? t('supplierDashboard.orders.toast.opening', { po: po.poNumber })
                                : isConfirmed
                                  ? t('supplierDashboard.orders.toast.creatingAsn', { po: po.poNumber })
                                  : t('supplierDashboard.orders.toast.viewing', { po: po.poNumber }),
                            })
                          }
                        >
                          {btnLabel}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-section text-text-primary">
                {t('supplierDashboard.perf.title')}
              </h2>
              <GradeBadge grade={grade} size="sm" />
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: t('supplierDashboard.perf.otif'), value: mySupplier.otif },
                {
                  label: t('supplierDashboard.perf.leadTime'),
                  value: mySupplier.leadTimeAdherence,
                },
                {
                  label: t('supplierDashboard.perf.invoiceAccuracy'),
                  value: mySupplier.invoiceAccuracy,
                },
              ].map((m) => {
                const status = targetStatus(m.value, 90);
                return (
                  <div key={m.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-text-secondary">
                        {m.label}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: TARGET_STATUS[status].text }}
                      >
                        {m.value}%
                      </span>
                    </div>
                    <TargetBar pct={m.value} target={90} status={status} />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary italic">
              {t('supplierDashboard.perf.footnote')}
            </div>
          </section>

          <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm p-5">
            <h2 className="text-section text-text-primary mb-4">
              {t('supplierDashboard.docs.title')}
            </h2>
            <div className="flex flex-col">
              {documents.map((doc, idx) => {
                const display = documentDisplayState(doc, nowIso);
                const action = t(DISPLAY_STATE_ACTION_KEY[display]);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between gap-3 py-3 ${
                      idx < documents.length - 1
                        ? 'border-b border-border-subtle'
                        : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <FileText size={12} className="text-text-tertiary" />
                        <span className="text-sm font-semibold text-text-primary">
                          {doc.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill variant={DISPLAY_STATE_TONE[display]}>
                          {t(DISPLAY_STATE_LABEL_KEY[display])}
                        </StatusPill>
                        <span className="text-xs text-text-tertiary">
                          {doc.expiryDate
                            ? t('supplierDashboard.docs.exp', {
                                date: fmtDate(doc.expiryDate),
                              })
                            : t('supplierDashboard.docs.noExpiry')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        toast({
                          title: t('supplierDashboard.docs.toast.title', {
                            action,
                            name: doc.name,
                          }),
                          description: t('supplierDashboard.docs.toast.desc'),
                        })
                      }
                    >
                      {action}
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShellV2>
  );
};

export default SupplierDashboard;
