import React, { useMemo, useState } from 'react';
import { Info, Lock, MessageCircle } from 'lucide-react';
import { DataSheetGrid, type Column, type CellProps } from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import './plan-grid/planGrid.css';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import PageMetaLine from '../components/ui-v2/PageMetaLine';
import Data from '../components/ui-v2/Data';
import LivenessPill from '../components/ui-v2/LivenessPill';
import ModelMarker from '../components/ui-v2/ModelMarker';
import PlanCellMarker from './plan-grid/PlanCellMarker';
import FullScreenSection from './plan-grid/FullScreenSection';
import { dataCell, textCell } from './plan-grid/cells';
import { formatDate, formatNumber } from '../lib/format';
import { statusLabelKey } from '../lib/statusLabel';
import { mockSuppliers } from '../data/mockSuppliers';
import {
  FORECAST_PUBLICATIONS,
  // CP-2 · B1 — the ONE master lookup; a label miss ECHOES the code.
  labelOf,
  currentPublication,
  SDC_SIMULATED_NOW,
  type ConsolidationRow,
  type SupplierCoverageEntry,
  type CommitmentClass,
} from '../services/sdc';
import {
  useConsolidationRows,
  useCoverageEntries,
  useChaseEntries,
  useSupplierRollups,
  useResolveRequirementDispute,
  useReviewRequirementResponse,
  useAcceptRequirementResponse,
  useDisputeRequirementResponse,
} from '../services/query/sdcBuyerHooks';
import { userVerbsFrom } from '../services/transitions';
import SidePanel from '../components/ui-v2/SidePanel';
import Button from '../components/ui-v2/Button';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import type { VerbAvailability } from '../services/transitions/handoff';
import { useToast } from '../hooks/useToast';
import type { RequirementResponse, DisputeEntry } from '../services/sdc';
import { useRefusalText } from '../hooks/useRefusalText';
import type { CommandResult } from '../services/data/types';

// ────────────────────────────────────────────────────────────────────────────
// BuyerCollaboration (SDC-1b) — the P2 planner consolidation view: the
// master-spreadsheet replacement (RFP p.13) on screen.
//
// (WAS: read-only end-to-end.) NO LONGER TRUE AS OF R1b, and the sentence that
// stood here is corrected rather than deleted. ONE action writes: a planner
// resolves a supplier's dispute, firing `t_requirementresponse_resolve` with the
// required authored answer. Everything else still renders no mutation, no
// command and no dispatch. The honesty BANNER copy changed in the same batch —
// a banner still promising read-only is an unbacked affordance run backwards.
// SDC-4d — the consolidation reads are now buyer-scoped `useServiceQuery` over
// the LIVE stores (via svc.collaboration.*), fed by the shared sdcClock, so a P1
// supplier declare / confirm is reflected here (the P1→P2 loop, closed on
// fixtures). Buyer-gated: a supplier persona resolves []. The DSG engine ships in
// this page's async chunk (lazy route, shared with PlanGrid — see AppRouter);
// every honest marker still derives from the registry (`forecastPublications`:
// gate-2 shut on the SOMO C8 feed → green structurally unreachable, the pill
// reads "Sample — awaiting SOMO C8 feed" — this is live-on-fixtures, NOT a live
// feed, so the registry / gate-2 / Sample pills are untouched).
//
// THE BOUNDARY (design §5, addendum §6): response tracking is OURS; network
// coverage-projection stays SOMO's. The ONE projection rendered here is the
// per-supplier coverage indicator — MODELED, Σ-marked (ModelMarker), never
// wearing the DP-3 observed grammar; a missing declaration renders an HONEST
// BLANK, never a fabricated zero (the CI-2 honest-silence pattern).
// ────────────────────────────────────────────────────────────────────────────

// The pinned SIMULATED clock the pure selectors receive (`now` is injected —
// SDC-1a purity). The fixture cycle lives in Aug–Oct 2026; this as-of sits past
// the R2 response deadline (2026-08-22) so the chase list shows its overdue
// state deterministically. Declared on the meta line — never presented as the
// real clock. SDC-4a: this is now the ONE shared SDC clock (SDC_SIMULATED_NOW) —
// the same instant the write stamps use, so display and writes never diverge.
const SIMULATED_ASOF = SDC_SIMULATED_NOW;

// The CURRENT publication stays module-scope: publications are frozen SOMO
// fixtures (their producer is the F2 C8 feed, not a supplier write), and drive
// the period bar + period-class only. The supplier-WRITTEN derivations
// (rows / rollups / chase / coverage) are live buyer-scoped hooks in-component.
const CURRENT = currentPublication(FORECAST_PUBLICATIONS);

// Fixed DSG height (px) — same one-source-of-truth pattern as PlanGrid: the
// `height` prop AND the `--plan-dsg-h` pin (anti-trembling, planGrid.css).
const DSG_H = { grid: 256 } as const;
const dsgVar = (h: number) => ({ '--plan-dsg-h': `${h}px` }) as React.CSSProperties;

// R1b - THE GATE IS THE MACHINE, NOT A STATUS LITERAL.
// `userVerbsFrom` reads `surfaceable` (S51), so a verb the flow marks unsurfaced
// can never reach this column even when its from-state matches. Writing
// `status === 'Disputed'` here would be shorter, correct today, and would keep
// offering the button on the day somebody flips `surfaceable` to false - an
// affordance outliving its own legality.
const RESOLVE_VERB = 't_requirementresponse_resolve';
// WAVE C — the three verbs that had a machine, an atom and no caller.
const REVIEW_VERB = 't_requirementresponse_review';
const ACCEPT_VERB = 't_requirementresponse_accept';
const DISPUTE_VERB = 't_requirementresponse_dispute';

/**
 * Does the machine offer `verbId` from `state`? One helper for all four verbs,
 * so no section can drift onto a status literal while its neighbours ask the
 * flow. `userVerbsFrom` reads `surfaceable` (S51), so a verb the flow marks
 * unsurfaced never reaches a list here even when its from-state matches.
 */
const offers = (verbId: string, state: string): boolean =>
  userVerbsFrom('requirementResponse', state).some((v) => v.id === verbId);

const offersResolve = (state: string): boolean => offers(RESOLVE_VERB, state);

/** The response behind a row's state, when the state carries one. `awaiting`
 *  does not: nobody answered, so there is nothing to dispute or resolve. */
const responseOf = (state: ConsolidationRow['state']): RequirementResponse | null =>
  'response' in state ? state.response : null;

const supplierName = (id: string): string =>
  mockSuppliers.find((s) => s.id === id)?.name ?? id;

const CLASS_LABEL_KEY: Record<CommitmentClass, string> = {
  firm: 'sdc.class.firm',
  'semi-firm': 'sdc.class.semiFirm',
  'visibility-only': 'sdc.class.visibilityOnly',
};

/** The PERIOD-level commitment class (period-global firm, design §3.1): one
 *  class per bucket in the fixtures; 'mixed' only if a bucket ever splits. */
function periodClass(bucket: string): CommitmentClass | 'mixed' {
  const classes = new Set(
    (CURRENT?.lines ?? [])
      .filter((l) => l.periodBucket === bucket)
      .map((l) => l.commitmentClass),
  );
  return classes.size === 1 ? [...classes][0] : 'mixed';
}

// Quiet-outlined chip base (DP-3 status-chip grammar: soft tint, thin border).
const CHIP = 'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium';
const CHIP_NEUTRAL = `${CHIP} border-border-subtle bg-bg-hover text-text-secondary`;
const CHIP_SUCCESS = `${CHIP} border-success/30 bg-success-soft text-success`;
const CHIP_WARNING = `${CHIP} border-warning/30 bg-warning-soft text-warning-hover`;
const CHIP_DANGER = `${CHIP} border-danger/30 bg-danger-soft text-danger`;
const CHIP_INFO = `${CHIP} border-info/30 bg-info-soft text-info`;

// SDC-4d — the coverage entry is JOINED INTO the row (not read from a column
// closure). The coverage reads resolve ASYNC now, and DSG re-renders cells on
// `value` changes — not on a column-`component` closure change — so a coverage
// map captured in the closure would render stale (all dashes) after the async
// resolve. Carrying it in the row (like `state`) makes the grid reflect it.
type CoverageRow = ConsolidationRow & {
  readonly coverage: SupplierCoverageEntry | null;
};

// ────────────────────────────────────────────────────────────────────────────
// R1b - THE RESOLVE CAPTURE.
//
// The shape is BuyerInvoices' dispute panel, copied rather than invented: a
// SidePanel (`role="dialog" aria-modal="true"`), the record above, the authored
// text below, cancel + commit in the footer. What is NOT copied is the guard.
// The neighbour's commit is `disabled={mutation.isPending}` only, and refuses a
// blank reason by early-returning into a toast - measured on the tree, not
// assumed from the pattern. Here the commit is ALSO disabled while the answer is
// blank, on the operator ruling: the supplier cannot dispute without saying why,
// so the buyer must not resolve without saying why, and a dismissible capture on
// a required field is how a required thing becomes a suggestion.
//
// THE RAISE IS RENDERED ABOVE THE BOX, and it is not decoration: a planner
// answering a dispute they cannot see would be composing a reply to a message
// they never read. The supplier's OWN words sit beside it for the same reason -
// R1a rendered the supplier's objection to the supplier; this is the first
// surface that renders it to the BUYER, at the moment of answering it.
//
// DP2-WARN-01: `text-warning-hover` is the only warning colour legal as TEXT on
// light; the bright DEFAULT is graphical-only and `text-warning` never appears.
// DP2-BUTTON-01: the commit is SOLID action-blue - a resolution appends to an
// immutable ledger the supplier reads, which is the reserved irreversible-commit
// class. The row CTA that opens this panel is outline: it commits nothing.
// ────────────────────────────────────────────────────────────────────────────
const DisputeExchange: React.FC<{ entries: readonly DisputeEntry[] }> = ({ entries }) => {
  const { t } = useTranslation();
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" data-testid="sdc-resolve-exchange">
      {entries.map((e, i) => (
        <div
          key={`${e.at}-${i}`}
          className={`border-l-2 py-1 pl-3 ${
            e.kind === 'raised' ? 'border-l-warning' : 'border-l-success'
          }`}
        >
          <div className="text-label mb-0.5 uppercase">
            <span className={e.kind === 'raised' ? 'text-warning-hover' : 'text-success'}>
              {t(e.kind === 'raised' ? 'sdc.resolve.raised' : 'sdc.resolve.resolved')}
            </span>{' '}
            <Data className="normal-case text-text-tertiary">{formatDate(e.at)}</Data>
          </div>
          <div className="text-xs text-text-secondary">{e.text}</div>
        </div>
      ))}
    </div>
  );
};

/**
 * The words a verb requires, and the exchange they land in.
 *
 * ⚠️ **ONE PANEL FOR BOTH REASON-CARRYING VERBS, AND THAT IS THE INSTRUCTED
 * SHAPE RATHER THAN A TIDINESS PREFERENCE.** `t_requirementresponse_dispute`
 * and `_resolve` require the same thing of a planner — authored words, proven
 * non-blank by the SAME policy hook (`rr_dispute_text_authored`), appended to
 * the SAME ledger. Authoring a second panel beside a proven one is how the two
 * drift, and the half that drifts is never the visible half: it is the blank
 * guard, or the availability gate below.
 *
 * ⚠️ **THE COMMIT IS GATED ON AVAILABILITY, NOT ONLY THE CTA THAT OPENED IT
 * (§84).** A panel is component state and component state OUTLIVES THE SEAT: a
 * seat narrowed while this is open still has a live commit button under the old
 * render. Gating only the entrance would be guarding one door of a mode reached
 * more than one way.
 *
 * ⚠️ **AND IT IS BELT, NOT A LAYER — SAID PLAINLY RATHER THAN COUNTED AS
 * COVERAGE.** No spec in this tree reaches it: the CTA gate closes the only
 * entrance, so a withheld seat cannot open the panel to be asked about the
 * commit, and the narrowing-while-open case needs an identity change between
 * two renders that jsdom cannot stage here. A mutation probe therefore does NOT
 * kill this line, and claiming it as a guarded path would be claiming coverage
 * that does not exist — the same honesty the resolve commit's own comment keeps
 * about its blank check. It is kept as what catches a future edit that removes
 * the CTA gate, which is a real edit somebody will make.
 */
interface ReasonPanelCopy {
  readonly title: string;
  readonly heading: string;
  readonly srLabel: string;
  readonly placeholder: string;
  readonly note: string;
  readonly cancel: string;
  readonly commit: string;
}

const ReasonPanel: React.FC<{
  row: CoverageRow | null;
  answer: string;
  onAnswer: (v: string) => void;
  pending: boolean;
  onCancel: () => void;
  onCommit: () => void;
  copy: ReasonPanelCopy;
  availability: VerbAvailability;
  testIds: { input: string; commit: string };
}> = ({ row, answer, onAnswer, pending, onCancel, onCommit, copy, availability, testIds }) => {
  const { t } = useTranslation();
  const response = row ? responseOf(row.state) : null;
  const blank = answer.trim() === '';
  const withheld = availability.kind !== 'held';

  return (
    <SidePanel
      open={row !== null}
      onClose={onCancel}
      title={copy.title}
      footerActions={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button
            variant="outline"
            data-testid={testIds.commit}
            disabled={pending || blank || withheld}
            onClick={onCommit}
          >
            {copy.commit}
          </Button>
        </>
      }
    >
      {response && row && (
        <div className="flex flex-col gap-6">
          {/* The seat, restated where the act is — a notice on the list is not a
              notice on a panel a narrowing can leave standing open. */}
          <HandoffNotice availability={availability} testId={`${testIds.commit}-handoff`} />
          <section>
            <h3 className="text-label mb-2 uppercase text-text-tertiary">
              {t('sdc.resolve.section.exchange')}
            </h3>
            <div className="mb-2 text-xs text-text-tertiary">
              <Data>{response.id}</Data> · {supplierName(response.supplierId)} ·{' '}
              <Data>{row.line.periodBucket}</Data>
            </div>
            <DisputeExchange entries={response.disputeResponse ?? []} />
          </section>

          <section>
            <h3 className="text-label mb-2 uppercase text-text-tertiary">
              {t('sdc.resolve.section.supplierSaid')}
            </h3>
            {/* The supplier's own words, unedited and untranslated - a record,
                not copy. An HONEST BLANK when they stated none: this lane never
                fabricates a cause on a supplier's behalf. */}
            <p className="text-xs text-text-secondary" data-testid="sdc-resolve-rootcause">
              {response.rootCause?.note ??
                response.forecastConfirmation?.capacityConstraint ??
                t('sdc.resolve.noRootCause')}
            </p>
          </section>

          <section>
            <h3 className="text-label mb-2 uppercase text-text-tertiary">{copy.heading}</h3>
            <label htmlFor={testIds.input} className="sr-only">
              {copy.srLabel}
            </label>
            <textarea
              id={testIds.input}
              data-testid={testIds.input}
              className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary"
              rows={4}
              placeholder={copy.placeholder}
              value={answer}
              onChange={(e) => onAnswer(e.target.value)}
            />
            <div className="mt-2 text-xs text-text-tertiary">{copy.note}</div>
          </section>
        </div>
      )}
    </SidePanel>
  );
};

const BuyerCollaboration: React.FC = () => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();

  // The period filter — 'all' or one horizon bucket of the current publication.
  const [period, setPeriod] = useState<string>('all');

  // R1b - the resolve capture. `answer` is deliberately NOT seeded from
  // anything: a resolution is AUTHORED, and pre-filling it with the dispute text
  // would let somebody resolve by pressing a button on a sentence they did not
  // write.
  const [resolving, setResolving] = useState<CoverageRow | null>(null);
  const [answer, setAnswer] = useState('');
  const resolveMutation = useResolveRequirementDispute();

  // §74 — `t_requirementresponse_resolve` (atom
  // `requirementresponse:dispute`, held by `planning`).
  //
  // ⚠️ THE NOTICE SITS ON THE SECTION, NOT ON EACH ROW. The CTA is per
  // dispute and the list is unbounded; the same owner repeated down it is
  // noise, and the atom does not vary by row. `offersResolve` still decides
  // whether a row's STATE offers the verb at all — legality, asked of the
  // machine — and this decides whether the SEAT may fire it. Two different
  // questions; neither substitutes for the other.
  const resolveAvailability = useVerbAvailability('requirementresponse:dispute');

  // WAVE C — the review lane's capture. Same discipline as `answer` above: a
  // dispute is AUTHORED, so nothing seeds it.
  const [disputing, setDisputing] = useState<CoverageRow | null>(null);
  const [objection, setObjection] = useState('');
  const reviewMutation = useReviewRequirementResponse();
  const acceptMutation = useAcceptRequirementResponse();
  const disputeMutation = useDisputeRequirementResponse();

  // ⚠️ THREE ATOMS, THREE AVAILABILITIES, THREE NOTICES — never one gate over
  // three controls. `requirementresponse:review`, `:accept` and `:dispute` are
  // DISTINCT atoms that happen to sit in the same lane today; collapsing them
  // onto one check would be asserting that co-residence is permanent, and the
  // day a role catalogue splits the lane the surface would offer an act the
  // dispatcher refuses. `:dispute` is deliberately resolved a second time here
  // rather than reusing `resolveAvailability`: same atom, different verb, and
  // §76 puts one notice in each verb's own slot.
  const reviewAvailability = useVerbAvailability('requirementresponse:review');
  const acceptAvailability = useVerbAvailability('requirementresponse:accept');
  const disputeAvailability = useVerbAvailability('requirementresponse:dispute');

  const closeDispute = () => {
    setDisputing(null);
    setObjection('');
  };

  // The response behind each open panel, resolved once. The panels need it only
  // for the screen-reader label, and reaching for it inline would mean asking
  // `responseOf` for a row that may be null in the middle of a props literal.
  const resolvingResponse = resolving ? responseOf(resolving.state) : null;
  const disputingResponse = disputing ? responseOf(disputing.state) : null;
  const { toast } = useToast();

  const closeResolve = () => {
    setResolving(null);
    setAnswer('');
  };

  /**
   * WAVE C — the outcome contract every verb on this lane shares.
   *
   * ⚠️ **A REFUSAL STATES ITS REASON RATHER THAN PROCEEDING, AND THAT IS THE
   * WHOLE REASON THIS IS ONE HELPER.** `dispatch` RESOLVES on a refusal — it
   * does not throw — so a caller that only handles `onError` reports a refused
   * command as a success. That mistake is invisible on the happy path and is
   * exactly what gets re-made when three call sites each write their own
   * handler. `refusalText` turns the machine's code into the seat's language;
   * the raw code is the fallback so an untranslated refusal still says
   * something true rather than nothing.
   */
  const outcomeOf = (
    row: CoverageRow,
    response: RequirementResponse,
    prefix: 'review' | 'accept' | 'dispute' | 'resolve',
    after?: () => void,
  ) => {
    const failed = (description?: string) =>
      toast({
        variant: 'warning' as const,
        title: t(`sdc.${prefix}.failed.title`, { material: row.line.materialCode }),
        ...(description ? { description } : {}),
      });
    return {
      onSuccess: (res: CommandResult) => {
        if (res.status === 'failed') {
          failed(refusalText(res.reason) ?? res.reason);
          return;
        }
        toast({
          variant: 'success' as const,
          title: t(`sdc.${prefix}.done.title`, { material: row.line.materialCode }),
          description: t(`sdc.${prefix}.done.body`, {
            supplier: supplierName(response.supplierId),
          }),
        });
        after?.();
      },
      onError: () => failed(),
    };
  };

  // SDC-4d — the live buyer-scoped consolidation reads (over svc.collaboration.*,
  // fed by the shared sdcClock). Buyer-gated: a supplier persona resolves [].
  const { data: rows = [] } = useConsolidationRows();
  const { data: coverage = [] } = useCoverageEntries();
  const { data: chase = [] } = useChaseEntries();
  const { data: rollups = [] } = useSupplierRollups();

  // Join coverage INTO each row (SDC-4d) so the DSG reflects it after the async
  // read resolves — a column-closure lookup would stay stale (all dashes).
  const rowsWithCoverage = useMemo<CoverageRow[]>(() => {
    const byPair = new Map<string, SupplierCoverageEntry>(
      coverage.map((c) => [`${c.supplierId}|${c.materialCode}`, c]),
    );
    return rows.map((r) => ({
      ...r,
      coverage: byPair.get(`${r.line.supplierId}|${r.line.materialCode}`) ?? null,
    }));
  }, [rows, coverage]);

  // R1b - the rows the MACHINE says are resolvable. `userVerbsFrom` reads
  // `surfaceable` (S51), so a verb the flow marks unsurfaced never reaches this
  // list even when its from-state matches; `status === 'Disputed'` would be
  // shorter, correct today, and would keep offering the button on the day
  // somebody flipped `surfaceable` to false.
  const disputedRows = useMemo(
    () =>
      rowsWithCoverage.filter((r) => {
        const response = responseOf(r.state);
        return response !== null && offersResolve(response.status);
      }),
    [rowsWithCoverage],
  );

  // WAVE C — the same derivation, once per verb. Each list is what the MACHINE
  // offers from the row's own state, so a section empties itself the moment its
  // verb stops being legal there and no list needs a status literal to say so.
  const awaitingReviewRows = useMemo(
    () =>
      rowsWithCoverage.filter((r) => {
        const response = responseOf(r.state);
        return response !== null && offers(REVIEW_VERB, response.status);
      }),
    [rowsWithCoverage],
  );

  // ⚠️ KEYED ON `ACCEPT_VERB`, AND THE TWO CTAs IT CARRIES ARE ASSERTED
  // CO-REACHABLE RATHER THAN ASSUMED. `_accept` and `_dispute` both declare
  // `from: ['UnderReview']`, so one derivation genuinely serves both — but the
  // dispute CTA re-asks the machine per row anyway (`offers(DISPUTE_VERB, …)`),
  // because a list keyed on one verb that renders a control for another is the
  // shape that survives a flow edit while quietly becoming a lie.
  const underReviewRows = useMemo(
    () =>
      rowsWithCoverage.filter((r) => {
        const response = responseOf(r.state);
        return response !== null && offers(ACCEPT_VERB, response.status);
      }),
    [rowsWithCoverage],
  );

  const visibleRows = useMemo(
    () =>
      period === 'all'
        ? rowsWithCoverage
        : rowsWithCoverage.filter((r) => r.line.periodBucket === period),
    [period, rowsWithCoverage],
  );

  // The carried-forward token: presumed valid (design §3.2), a muted note —
  // deliberately NOT a warning (the line did not move; nothing was voided).
  const carriedToken = useMemo(
    () => (
      <span className={`${CHIP_NEUTRAL} text-[10px]`} title={t('sdc.state.carriedTitle')}>
        {t('sdc.state.carried')}
      </span>
    ),
    [t],
  );

  const columns = useMemo<Column<CoverageRow>[]>(
    () => [
      {
        title: t('sdc.col.supplier'),
        disabled: true,
        grow: 2,
        minWidth: 160,
        component: textCell<CoverageRow>((r) => supplierName(r.line.supplierId)),
      },
      {
        title: t('sdc.col.material'),
        disabled: true,
        grow: 2,
        minWidth: 230,
        component: ({ rowData }: CellProps<CoverageRow>) => (
          <div className="w-full truncate px-2 text-sm">
            <Data className="text-xs">{rowData.line.materialCode}</Data>{' '}
            <span className="text-xs text-text-secondary">
              {labelOf(rowData.line.materialCode)}
            </span>
          </div>
        ),
      },
      {
        title: t('sdc.col.period'),
        disabled: true,
        minWidth: 90,
        component: dataCell<CoverageRow>((r) => r.line.periodBucket),
      },
      {
        // Per-line class chip: an ECHO of the period-level class (the filter bar
        // owns it) — neutral, never a health state, never a per-material lock.
        title: t('sdc.col.class'),
        disabled: true,
        minWidth: 110,
        component: ({ rowData }: CellProps<CoverageRow>) => (
          <div className="w-full px-2">
            <span className={CHIP_NEUTRAL}>
              {t(CLASS_LABEL_KEY[rowData.line.commitmentClass])}
            </span>
          </div>
        ),
      },
      {
        title: t('sdc.col.demand'),
        disabled: true,
        minWidth: 120,
        component: dataCell<CoverageRow>(
          (r) => `${formatNumber(r.line.forecastQty)} ${r.line.uom}`,
        ),
      },
      {
        title: t('sdc.col.confirmed'),
        disabled: true,
        minWidth: 120,
        component: dataCell<CoverageRow>((r) => {
          // Awaiting has nothing; an acknowledgment COMMITS nothing (SDC-2b-EXT
          // invariant #11) — both render the honest dash, never a fabricated qty.
          if (r.state.kind === 'awaiting' || r.state.kind === 'acknowledged')
            return t('sdc.empty.dash');
          const fc = r.state.response.forecastConfirmation;
          return fc ? `${formatNumber(fc.confirmedQty)} ${r.line.uom}` : t('sdc.empty.dash');
        }),
      },
      {
        title: t('sdc.col.deficit'),
        disabled: true,
        minWidth: 110,
        component: ({ rowData }: CellProps<CoverageRow>) => (
          <div className="w-full px-2 text-right">
            {rowData.state.kind === 'short' ? (
              <Data className="text-xs text-danger">
                −{formatNumber(rowData.state.deficitQty)} {rowData.line.uom}
              </Data>
            ) : (
              <span className="text-xs text-text-tertiary">{t('sdc.empty.dash')}</span>
            )}
          </div>
        ),
      },
      {
        title: t('sdc.col.state'),
        disabled: true,
        grow: 2,
        minWidth: 240,
        component: ({ rowData }: CellProps<CoverageRow>) => {
          const s = rowData.state;
          return (
            <div className="flex w-full flex-wrap items-center gap-1.5 px-2">
              {/* ⚠️ PF-1b — THE DRAFT HINT IS GONE (operator ruling). A muted
                  "draft in progress" rendered here whenever a supplier had an
                  unsubmitted response. It leaked no CONTENT, which is why it
                  passed review; it leaked EXISTENCE — and once creation births
                  every commitment at Draft, that is a live signal that a named
                  supplier has started composing, disclosed by nobody's choice.
                  The field is deleted from the projection too, so there is
                  nothing left here to render. */}
              {s.kind === 'awaiting' && (
                <span className={CHIP_NEUTRAL}>{t('sdc.state.awaiting')}</span>
              )}
              {s.kind === 'acknowledged' && (
                <>
                  {/* SDC-2b-EXT: a visibility response — honestly DISTINCT from
                      the commitment states (neutral, never the success chip). */}
                  <span className={CHIP_NEUTRAL}>{t('sdc.state.acknowledged')}</span>
                  {s.carriedForward && carriedToken}
                </>
              )}
              {s.kind === 'confirmed-full' && (
                <>
                  <span className={CHIP_SUCCESS}>{t('sdc.state.confirmedFull')}</span>
                  {s.carriedForward && carriedToken}
                </>
              )}
              {s.kind === 'short' && (
                <>
                  <span className={CHIP_DANGER}>{t('sdc.state.short')}</span>
                  {s.carriedForward && carriedToken}
                </>
              )}
              {/* R1b - THE LIFECYCLE AXIS, which this cell never carried.
                  Everything above is the QUANTITY join (awaiting / acknowledged
                  / full / short / stale); a DISPUTED response rendered here as
                  plain `short`, pixel-identical to one nobody had looked at.
                  The label comes from the SAME central status map the supplier's
                  own page localizes through, so the two personas cannot drift
                  into different words for one state. */}
              {responseOf(s) &&
                statusLabelKey(responseOf(s)!.status) &&
                responseOf(s)!.status !== 'Submitted' && (
                  <span
                    className={
                      responseOf(s)!.status === 'Disputed' ? CHIP_WARNING : CHIP_NEUTRAL
                    }
                    data-testid="sdc-lifecycle-chip"
                  >
                    {t(statusLabelKey(responseOf(s)!.status)!)}
                  </span>
                )}
              {s.kind === 'stale-against-current' && (
                <span className={CHIP_WARNING}>
                  {s.answeredQty === null
                    ? t('sdc.state.staleUnverified', {
                        current: formatNumber(s.currentQty),
                      })
                    : t('sdc.state.stale', {
                        answered: formatNumber(s.answeredQty),
                        current: formatNumber(s.currentQty),
                      })}
                </span>
              )}
            </div>
          );
        },
      },
      {
        // The supplier-coverage indicator (addendum §6) — the ONE projection
        // that is ours. MODELED, Σ-marked; honest blank when nothing declared.
        title: t('sdc.col.coverage'),
        disabled: true,
        grow: 2,
        minWidth: 190,
        component: ({ rowData }: CellProps<CoverageRow>) => {
          const cov = rowData.coverage;
          // Visibility-only pair: no committed demand → no sufficiency read.
          if (!cov) {
            return (
              <div className="w-full px-2 text-xs text-text-tertiary">{t('sdc.empty.dash')}</div>
            );
          }
          const st = cov.status;
          if (st.kind === 'no-declaration') {
            // The honest blank — never a fabricated zero, no Σ (nothing computed).
            return (
              <div className="w-full px-2 text-xs italic text-text-tertiary">
                {t('sdc.coverage.noDeclaration')}
              </div>
            );
          }
          const chipCls =
            st.kind === 'covered'
              ? CHIP_SUCCESS
              : st.kind === 'at-risk'
                ? CHIP_WARNING
                : CHIP_DANGER;
          const label =
            st.kind === 'covered'
              ? t('sdc.coverage.covered')
              : st.kind === 'at-risk'
                ? t('sdc.coverage.atRisk')
                : t('sdc.coverage.uncovered');
          const ratio = Number.isFinite(st.ratio) ? ` · ${st.ratio.toFixed(2)}×` : '';
          const unbridgeable = st.kind !== 'covered' && st.unbridgeable;
          return (
            <div className="flex w-full flex-wrap items-center gap-1.5 px-2">
              <span className={chipCls}>
                {label}
                {ratio}
                {unbridgeable ? ` — ${t('sdc.coverage.unbridgeable')}` : ''}
              </span>
              <ModelMarker
                label={t('sdc.coverage.model')}
                title={t('sdc.coverage.modelTitle')}
              />
              {/* SDC-3b — a total-only declaration: the ratio is honest but expiry
                  bridgeability is UNKNOWN. Marked, never assumed no-risk. */}
              {st.expiryBlind && (
                <span
                  className="text-[10px] italic text-text-tertiary"
                  title={t('sdc.coverage.expiryBlindTitle')}
                >
                  {t('sdc.coverage.expiryBlind')}
                </span>
              )}
            </div>
          );
        },
      },
      {
        title: t('sdc.col.provenance'),
        disabled: true,
        grow: 2,
        minWidth: 170,
        component: ({ rowData }: CellProps<CoverageRow>) => (
          <div className="w-full px-2">
            <PlanCellMarker
              capability="forecastPublications"
              planState={rowData.line.provenance.planState}
            />
          </div>
        ),
      },
    ],
    [t, carriedToken],
  );

  const horizon = CURRENT?.horizon ?? [];
  const CRUMB = [t('sdc.crumb.section'), t('sdc.crumb.page')];

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={CRUMB}
        title={t('sdc.header.title')}
        subtitle={t('sdc.header.subtitle')}
        actions={<LivenessPill capability="forecastPublications" />}
      />

      <PageMetaLine className="-mt-6 mb-6">
        {t('sdc.meta.summary', {
          lines: rows.length,
          suppliers: rollups.length,
          planVersion: CURRENT?.planVersion ?? t('sdc.empty.dash'),
          asOf: formatDate(SIMULATED_ASOF),
        })}
      </PageMetaLine>

      {/* Honest framing: read-only consolidation, SIMULATED feed, nothing dispatches */}
      <div className="mb-6 flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-text-primary">
        <Info size={16} className="mt-0.5 shrink-0 text-info" />
        <div>
          <div className="font-semibold text-info">{t('sdc.honesty.title')}</div>
          <p className="mt-0.5 text-text-secondary">{t('sdc.honesty.body')}</p>
        </div>
      </div>

      {/* ── Period filter bar — the PERIOD owns the commitment class ───────── */}
      <div data-testid="sdc-period-bar" className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              period === 'all'
                ? 'border-action bg-action-soft text-action'
                : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {t('sdc.period.all')}
          </button>
          {horizon.map((bucket) => (
            <button
              key={bucket}
              type="button"
              onClick={() => setPeriod(bucket)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                period === bucket
                  ? 'border-action bg-action-soft text-action'
                  : 'border-border-subtle bg-bg-surface text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <Data className="text-xs">{bucket}</Data>
              {periodClass(bucket) === 'firm' && <Lock size={12} aria-hidden="true" />}
            </button>
          ))}
        </div>
        {/* The period-level commitmentClass badges — per-line chips only ECHO these */}
        <div className="mt-2 flex flex-wrap gap-2">
          {horizon.map((bucket) => {
            const cls = periodClass(bucket);
            return (
              <span key={bucket} className={CHIP_NEUTRAL}>
                {cls === 'firm' ? (
                  <>
                    <Lock size={11} aria-hidden="true" />
                    {t('sdc.period.locked', { period: bucket })}
                  </>
                ) : (
                  <>
                    {bucket} · {t(cls === 'mixed' ? 'sdc.class.mixed' : CLASS_LABEL_KEY[cls])}
                  </>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── The consolidation grid (read-only DSG, full-screen-capable) ────── */}
      <section className="mb-8">
        <FullScreenSection title={t('sdc.grid.title')} normalHeight={DSG_H.grid}>
          {({ dsgHeight }) => (
            <>
              <p className="mb-1 text-sm text-text-secondary">{t('sdc.grid.subtitle')}</p>
              <p className="mb-3 text-xs text-text-tertiary">{t('sdc.coverage.legend')}</p>
              <div
                className="plan-dsg overflow-hidden rounded-lg border border-border-subtle bg-bg-surface"
                style={dsgVar(dsgHeight)}
              >
                <DataSheetGrid<CoverageRow>
                  value={visibleRows}
                  columns={columns}
                  gutterColumn={false}
                  lockRows
                  rowKey="id"
                  height={dsgHeight}
                />
              </div>
            </>
          )}
        </FullScreenSection>
      </section>

      {/* ── Chase list — the pre-scheduler manual WhatsApp interim ─────────── */}
      <section className="mb-8" data-testid="sdc-chase">
        <h2 className="mb-1 text-base font-semibold text-text-primary">
          {t('sdc.chase.title')}
        </h2>
        <p className="mb-3 text-sm text-text-secondary">{t('sdc.chase.subtitle')}</p>

        {/* Supplier response rollup — context for the chase */}
        <div className="mb-3 flex flex-wrap gap-2">
          <span className={CHIP_SUCCESS}>
            {t('sdc.rollup.responded')}:{' '}
            {rollups.filter((r) => r.rollup === 'responded').length}
          </span>
          <span className={CHIP_INFO}>
            {t('sdc.rollup.partial')}: {rollups.filter((r) => r.rollup === 'partial').length}
          </span>
          <span className={CHIP_NEUTRAL}>
            {t('sdc.rollup.silent')}: {rollups.filter((r) => r.rollup === 'silent').length}
          </span>
        </div>

        {chase.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-secondary">
            {t('sdc.chase.empty')}
          </p>
        ) : (
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-bg-surface">
            {chase.map((entry) => (
              <li
                key={entry.supplierId}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
              >
                <MessageCircle size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" />
                <span className="min-w-[10rem] font-medium text-text-primary">
                  {supplierName(entry.supplierId)}
                </span>
                <span className={entry.reason === 'overdue' ? CHIP_WARNING : CHIP_INFO}>
                  {t(
                    entry.reason === 'overdue'
                      ? 'sdc.chase.reason.overdue'
                      : 'sdc.chase.reason.partial',
                  )}
                </span>
                <span className="text-text-secondary">
                  {t('sdc.chase.awaitingLines', { n: entry.awaitingLines })}
                </span>
                <span className="ml-auto text-xs text-text-tertiary">
                  {t('sdc.chase.due', { date: formatDate(entry.dueAt) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* WAVE C - RESPONSES AWAITING REVIEW (`t_requirementresponse_review`).
          Plain DOM beside the chase list, deliberately NOT an action cell in the
          DSG: that grid's body is virtualized and lays out NO ROWS under jsdom's
          zero-height viewport, so an action placed there ships with browser QA
          and nothing else behind it. The disputes section below learned that the
          hard way; this copies the shape rather than rediscovering it. */}
      <section className="mb-8" data-testid="sdc-awaiting-review">
        <h2 className="mb-1 text-base font-semibold text-text-primary">
          {t('sdc.review.title')}
        </h2>
        <p className="mb-3 text-sm text-text-secondary">{t('sdc.review.subtitle')}</p>
        <div className="mb-3">
          <HandoffNotice availability={reviewAvailability} testId="handoff-sdc-review" />
        </div>
        {awaitingReviewRows.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('sdc.review.none')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {awaitingReviewRows.map((row) => {
              const response = responseOf(row.state)!;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm"
                >
                  <span className={CHIP_INFO}>{t('sdc.review.submitted')}</span>
                  <span className="font-medium text-text-primary">
                    {supplierName(row.line.supplierId)}
                  </span>
                  <Data className="text-xs">{row.line.materialCode}</Data>
                  <Data className="text-xs">{row.line.periodBucket}</Data>
                  <Data className="text-xs text-text-tertiary">{response.id}</Data>
                  {reviewAvailability.kind === 'held' && (
                    <button
                      type="button"
                      data-testid="sdc-review-cta"
                      disabled={reviewMutation.isPending}
                      title={t('sdc.review.ctaTitle', {
                        material: row.line.materialCode,
                        period: row.line.periodBucket,
                      })}
                      onClick={() =>
                        reviewMutation.mutate(
                          { responseId: response.id, supplierId: response.supplierId },
                          outcomeOf(row, response, 'review'),
                        )
                      }
                      className="ml-auto rounded-md border border-action bg-transparent px-3 py-1.5 text-xs font-medium text-action transition-colors hover:bg-action-soft disabled:opacity-50"
                    >
                      {t('sdc.review.cta')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* WAVE C - UNDER REVIEW: accept or dispute. TWO verbs on ONE row, and
          they are CO-REACHABLE (both declare `from: ['UnderReview']`), which is
          precisely why each gets its own notice in its own slot rather than one
          notice for the section. §76 retired the group collapse for verbs that
          were NOT co-reachable on any one document; these are, and the rule
          lands the same way from the other side. */}
      <section className="mb-8" data-testid="sdc-under-review">
        <h2 className="mb-1 text-base font-semibold text-text-primary">
          {t('sdc.underReview.title')}
        </h2>
        <p className="mb-3 text-sm text-text-secondary">{t('sdc.underReview.subtitle')}</p>
        <div className="mb-3 flex flex-col gap-2">
          <HandoffNotice availability={acceptAvailability} testId="handoff-sdc-accept" />
          <HandoffNotice availability={disputeAvailability} testId="handoff-sdc-dispute" />
        </div>
        {underReviewRows.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('sdc.underReview.none')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {underReviewRows.map((row) => {
              const response = responseOf(row.state)!;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm"
                >
                  <span className={CHIP_INFO}>{t('sdc.underReview.chip')}</span>
                  <span className="font-medium text-text-primary">
                    {supplierName(row.line.supplierId)}
                  </span>
                  <Data className="text-xs">{row.line.materialCode}</Data>
                  <Data className="text-xs">{row.line.periodBucket}</Data>
                  <Data className="text-xs text-text-tertiary">{response.id}</Data>
                  <span className="ml-auto flex items-center gap-2">
                    {acceptAvailability.kind === 'held' && (
                      <button
                        type="button"
                        data-testid="sdc-accept-cta"
                        disabled={acceptMutation.isPending}
                        title={t('sdc.accept.ctaTitle', {
                          material: row.line.materialCode,
                          period: row.line.periodBucket,
                        })}
                        onClick={() =>
                          acceptMutation.mutate(
                            { responseId: response.id, supplierId: response.supplierId },
                            outcomeOf(row, response, 'accept'),
                          )
                        }
                        className="rounded-md border border-action bg-transparent px-3 py-1.5 text-xs font-medium text-action transition-colors hover:bg-action-soft disabled:opacity-50"
                      >
                        {t('sdc.accept.cta')}
                      </button>
                    )}
                    {disputeAvailability.kind === 'held' &&
                      offers(DISPUTE_VERB, response.status) && (
                        <button
                          type="button"
                          data-testid="sdc-dispute-cta"
                          title={t('sdc.dispute.ctaTitle', {
                            material: row.line.materialCode,
                            period: row.line.periodBucket,
                          })}
                          onClick={() => {
                            setDisputing(row);
                            setObjection('');
                          }}
                          className="rounded-md border border-border-subtle bg-transparent px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-hover"
                        >
                          {t('sdc.dispute.cta')}
                        </button>
                      )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* R1b - DISPUTES AWAITING RESOLUTION.
          ⚠️ THIS IS NOT WHERE THE ACTION WAS FIRST BUILT, and the move is a
          finding rather than a preference. It was an action cell in the DSG,
          which is where "the buyer's action on the disputed row" naturally
          lands - and the grid BODY is virtualized and lays out NO ROWS under
          jsdom's zero-height viewport (this page's own test header has said so
          since SDC-1b). The page's one and only write would have shipped with
          zero spec coverage and nothing but browser QA behind it.
          Plain DOM, beside the chase list, which is the shape this page already
          uses for work a planner has to act on. The population is DERIVED from
          the machine, never filtered on a status literal, so the section empties
          itself the moment a dispute is answered. */}
      <section className="mb-8" data-testid="sdc-disputes">
        <h2 className="mb-1 text-base font-semibold text-text-primary">
          {t('sdc.disputes.title')}
        </h2>
        <p className="mb-3 text-sm text-text-secondary">{t('sdc.disputes.subtitle')}</p>
        <div className="mb-3">
          <HandoffNotice availability={resolveAvailability} testId="handoff-sdc-resolve" />
        </div>
        {disputedRows.length === 0 ? (
          <p className="text-sm text-text-tertiary">{t('sdc.disputes.none')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {disputedRows.map((row) => {
              const response = responseOf(row.state)!;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm"
                >
                  <span className={CHIP_WARNING}>{t('sdc.resolve.raised')}</span>
                  <span className="font-medium text-text-primary">
                    {supplierName(row.line.supplierId)}
                  </span>
                  <Data className="text-xs">{row.line.materialCode}</Data>
                  <Data className="text-xs">{row.line.periodBucket}</Data>
                  <Data className="text-xs text-text-tertiary">{response.id}</Data>
                  {resolveAvailability.kind === 'held' && (
                  <button
                    type="button"
                    data-testid="sdc-resolve-cta"
                    title={t('sdc.resolve.ctaTitle', {
                      material: row.line.materialCode,
                      period: row.line.periodBucket,
                    })}
                    onClick={() => {
                      setResolving(row);
                      setAnswer('');
                    }}
                    className="ml-auto rounded-md border border-action bg-transparent px-3 py-1.5 text-xs font-medium text-action transition-colors hover:bg-action-soft"
                  >
                    {t('sdc.resolve.cta')}
                  </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* R1b - the resolve capture, in the invoice dispute panel's shape.
          WAVE C - and now ONE component, shared with the dispute capture below.

          ⚠️ EACH PANEL IS MOUNTED ONLY WHILE ITS OWN ROW IS OPEN, AND THAT IS A
          FIX RATHER THAN A STYLE. `SidePanel` renders its DOM unconditionally
          and merely translates it off-screen, so a second ALWAYS-MOUNTED panel
          puts a duplicate of every control - two Cancels, two commits, two
          textareas - permanently in the tree. `aria-hidden` hides them from a
          screen reader and from nothing else. It surfaced as ten red tests the
          moment the second panel landed, which is the cheap way to find it.
          The two differ in their verb, their words and their atom; everything
          they have in common lives in `ReasonPanel` rather than in two files
          that agree today. */}
      {resolving && (
      <ReasonPanel
        row={resolving}
        answer={answer}
        onAnswer={setAnswer}
        pending={resolveMutation.isPending}
        onCancel={closeResolve}
        availability={resolveAvailability}
        testIds={{ input: 'sdc-resolve-input', commit: 'sdc-resolve-commit' }}
        copy={{
          title: t('sdc.resolve.panelTitle', { material: resolving?.line.materialCode ?? '' }),
          heading: t('sdc.resolve.section.answer'),
          srLabel: t('sdc.resolve.srLabel', {
            supplier: supplierName(resolvingResponse?.supplierId ?? ''),
            material: resolving?.line.materialCode ?? '',
          }),
          placeholder: t('sdc.resolve.placeholder'),
          note: t('sdc.resolve.note'),
          cancel: t('sdc.resolve.cancel'),
          commit: t('sdc.resolve.commit'),
        }}
        onCommit={() => {
          const row = resolving;
          const response = row ? responseOf(row.state) : null;
          if (!row || !response) return;
          // ⚠️ THIS BRANCH IS UNREACHABLE WHILE THE COMMIT IS DISABLED, AND THE
          // MUTATION PROBE SAYS SO RATHER THAN THE COMMENT CLAIMING OTHERWISE.
          // Replacing it with `if (false)` kills NOTHING - no test can click a
          // disabled button, so no test can reach here. It is kept as the thing
          // that catches a future edit removing `disabled`, and it is honestly
          // BELT, NOT A LAYER: writing "three guards" over one reachable guard
          // and one unreachable one would be claiming coverage that does not
          // exist. The two that DO bite are the disabled commit (asserted, and
          // a mutation kills it) and `rr_dispute_text_authored` at the
          // TRANSITION (asserted, and the only one a hand-crafted dispatch
          // cannot skip). The neighbour this panel copies (BuyerInvoices) has
          // only this unreachable-shaped one and no disabled commit at all -
          // measured on the tree, not assumed from the pattern.
          if (!answer.trim()) {
            toast({ variant: 'warning', title: t('sdc.resolve.missingReason') });
            return;
          }
          resolveMutation.mutate(
            {
              responseId: response.id,
              supplierId: response.supplierId,
              resolutionReason: answer.trim(),
            },
            outcomeOf(row, response, 'resolve', closeResolve),
          );
        }}
      />
      )}

      {/* WAVE C - the dispute capture. The SAME panel, the SAME policy guard,
          the SAME ledger - only the verb, its atom and its words differ. */}
      {disputing && (
      <ReasonPanel
        row={disputing}
        answer={objection}
        onAnswer={setObjection}
        pending={disputeMutation.isPending}
        onCancel={closeDispute}
        availability={disputeAvailability}
        testIds={{ input: 'sdc-dispute-input', commit: 'sdc-dispute-commit' }}
        copy={{
          title: t('sdc.dispute.panelTitle', { material: disputing?.line.materialCode ?? '' }),
          heading: t('sdc.dispute.section.objection'),
          srLabel: t('sdc.dispute.srLabel', {
            supplier: supplierName(disputingResponse?.supplierId ?? ''),
            material: disputing?.line.materialCode ?? '',
          }),
          placeholder: t('sdc.dispute.placeholder'),
          note: t('sdc.dispute.note'),
          cancel: t('sdc.dispute.cancel'),
          commit: t('sdc.dispute.commit'),
        }}
        onCommit={() => {
          const row = disputing;
          const response = row ? responseOf(row.state) : null;
          if (!row || !response) return;
          // Same shape and same honesty as the resolve commit above: unreachable
          // while `disabled` holds, kept as what catches an edit that removes it.
          if (!objection.trim()) {
            toast({ variant: 'warning', title: t('sdc.dispute.missingReason') });
            return;
          }
          disputeMutation.mutate(
            {
              responseId: response.id,
              supplierId: response.supplierId,
              disputeReason: objection.trim(),
            },
            outcomeOf(row, response, 'dispute', closeDispute),
          );
        }}
      />
      )}
    </AppShellV2>
  );
};

export default BuyerCollaboration;
