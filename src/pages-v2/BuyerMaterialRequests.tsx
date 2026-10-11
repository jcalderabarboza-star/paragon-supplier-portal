// ────────────────────────────────────────────────────────────────────────────
// R8 · THE MATERIAL-REQUEST QUEUE — the standalone entrance and the reviewer's
// surface, one page.
//
// ── ⚠️ TWO ENTRANCES, ONE RECORD, AND THE BUILDER IS WHAT GUARANTEES IT ─────
//
// The other entrance is the RFQ wizard (`BuyerSourcing.tsx`), where the gap is
// discovered. **Neither surface builds its own payload**:
// `buildMaterialRequestPayload` is the ONE builder and
// `MaterialRequestSubmitPayload` is a TYPED interface, so an entrance that
// omits a field is a `tsc` failure rather than a silent default.
//
// That is `t_pr_create`'s defect refused rather than repeated. Measured in this
// tree today: four entrances, `Record<string, unknown>`, `requiredFields` of
// `['material','quantity']`, and two divergent field sets whose absences become
// `''` / `0` inside the target. `materialRequestEntrances.test.ts` derives the
// calling components from SOURCE and asserts every one routes through the
// builder, with a known-FALSE control.
//
// ── ⚠️ NO PAGE-LEVEL GATE. THE GATE IS PER VERB, FROM THAT VERB'S OWN ATOM ──
//
// `materialrequest:submit` is `procurement`'s; `:review` and `:decide` are
// `planning`'s. So a seat holding review but NOT decide is a real seat, and it
// must see the review act LIVE and a NOTICE on the two decision acts — never an
// absent affordance, and never a live button the dispatcher would refuse. A
// page-level gate would be exactly the collapse.
//
// ⚠️ **AND THE RAISE VERB ACTS ON NO SELECTED ROW** — it lives in the page
// header, which is the one shape a panel-walking derivation cannot see
// (`IMPORTER-PRESENCE-IS-NOT-VERB-COVERAGE-01`). It gets its own availability,
// never the review gate's.
//
// ── ⚠️ THE MODE IS GATED, NOT THE DOOR (ENTRANCE-IS-THE-UNIT-01) ────────────
//
// Both the raise panel's BODY and the button that opens it check the atom, and
// both decision commits check theirs. `SupplierOrders` imported the guard,
// rendered it, and still shipped a live commit behind a comment asserting one
// entrance was the only one — *"That comment was the only thing holding the
// claim up, and it was false."* **Component state outlives the seat**: a seat
// narrowed WHILE a panel stands open is reachable, not a dead branch.
//
// ── ⚠️ CONFIRM BEFORE COMMIT, AND THE TWO ENDINGS DIFFER ────────────────────
//
// Both decisions are terminal and neither can be undone, so both confirm. The
// asymmetry is the reason: a DECLINE requires authored text (the verb refuses
// without it, and `MATERIALREQUEST_REFUSAL_AUTHORED` refuses a blank one),
// because that text is the whole account the buyer gets. An ACCEPTANCE needs no
// text and is not given a box to type in — *a field nobody must fill is a field
// somebody will.*
//
// The commit button is disabled until the justification is non-blank. That is a
// COURTESY MIRROR of the policy, not the policy.
//
// ── ⚠️ NOTHING HERE RENDERS A CODE, AND NOTHING RENDERS A DAY-COUNT ─────────
//
// No code: the lane exists because there is none, and
// `MaterialRequest.materialCode` is the literal type `null`. No day-count: the
// store opens empty so the lane joins no anchored family, and a waiting-time
// label is a day-label. The queue answers *"has anybody started?"* with a
// STATE and an ordering, not with an age.
//
// ── SidePanel (#280): a closed panel renders NOTHING ────────────────────────
// Every control below lives inside a panel only mounted when a row is selected,
// so a test must WALK TO THE STATE before asserting a control — and the confirm
// step is a further state inside it.
// ────────────────────────────────────────────────────────────────────────────

import React, { useMemo, useState } from 'react';
import { Clock, Eye, CheckCircle2, FilePlus2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { personLabel } from '../services/identity/personLabel';
import { personNamingRefusalKey } from './personNamingRefusal';

import ListPage from '../components/ui-v2/ListPage';
import DataTable, { type Column } from '../components/ui-v2/DataTable';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import Data from '../components/ui-v2/Data';
import SubTabs from '../components/ui-v2/SubTabs';
import SearchBar from '../components/ui-v2/SearchBar';
import StatusPill from '../components/ui-v2/StatusPill';
import { Field, FieldList } from '../components/ui-v2/Field';
import Button from '../components/ui-v2/Button';
import SidePanel from '../components/ui-v2/SidePanel';
import SuperAdminBypassNote from '../components/v2-features/SuperAdminBypassNote';
import FormSection from '../components/ui-v2/FormSection';
import { FormField, Select, TextArea, TextInput } from '../components/ui-v2/Form';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';

import { useToast } from '../hooks/useToast';
import { useMaterialRequests } from '../services/query/hooks';
import {
  useMaterialRequestSubmit,
  useMaterialRequestStartReview,
  useMaterialRequestApprove,
  useMaterialRequestReject,
} from '../services/query/commandHooks';
import { useVerbAvailabilities, useNextAct } from '../hooks/useVerbAvailability';
import NextActLine from '../components/ui-v2/NextActLine';
import { HandoffNotice } from '../components/ui-v2/HandoffNotice';
import { useRefusalText, useDataErrorText } from '../hooks/useRefusalText';
import { formatDate } from '../lib/format';
import { DataError } from '../services/data/types';
import type { MaterialRequest, MaterialRequestStatus } from '../services/data/types';
import type { ActorAttribution, UnattributedReason } from '../lib/enforcement';
import { RFQ_CATEGORIES, type RFQCategory } from '../data/mockRfqs';
import { categoryLabel } from './sourcing/categoryLabel';
import { CODE_LESS_REASONS } from '../data/materialCatalogReason';
import {
  buildMaterialRequestPayload,
  materialRequestReady,
  type MaterialRequestInput,
} from './sourcing/materialRequest';
import ActorPreActNotice from '../components/ui-v2/ActorPreActNotice';
import { namedSeatRefusalKey } from '../lib/namedSeatRefusal';

/**
 * EXHAUSTIVE over the unattributed vocabulary, deliberately: widening it must
 * break the build here rather than render a blank where a person's name would
 * be. The `BuyerSupplierApplications` convention, reused because the question
 * is the same one — WHICH failure to resolve, never a bare "unknown".
 */
const UNATTRIBUTED_KEY: Record<UnattributedReason, string> = {
  NO_PERSON_IN_SESSION: 'materialRequests.attribution.noPerson',
  IDENTITY_PROVIDER_UNAVAILABLE: 'materialRequests.attribution.idpDown',
};

/** The four states, toned. Exhaustive: a fifth state must break the build here
 *  rather than render an untoned pill. */
const STATUS_VARIANT: Record<
  MaterialRequestStatus,
  'success' | 'warning' | 'danger' | 'info' | 'neutral'
> = {
  Submitted: 'warning',
  'Under Review': 'info',
  Approved: 'success',
  Rejected: 'danger',
};

type Tab = 'all' | 'submitted' | 'underReview' | 'approved' | 'rejected';

const TAB_STATUSES: Record<Tab, readonly MaterialRequestStatus[] | null> = {
  all: null,
  submitted: ['Submitted'],
  underReview: ['Under Review'],
  approved: ['Approved'],
  rejected: ['Rejected'],
};

/** Which confirmation step is open, if any. `null` is the panel's resting state. */
type Pending = 'approve' | 'reject' | null;

const emptyRaise: MaterialRequestInput = {
  requestedLabel: '',
  category: 'Other',
  need: '',
};

const BuyerMaterialRequests: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const refusalText = useRefusalText();
  const dataErrorText = useDataErrorText();

  /**
   * A refusal the dispatcher THREW, in the reader's language. `SCOPE_DENIED`
   * and its siblings arrive as a thrown `DataError` whose message is prose, so
   * `useRefusalText` cannot read them — `useDataErrorText` owns that vocabulary
   * and returns `null` for a code it does not own, which is why the fallback
   * chain is preserved rather than collapsed.
   */
  const describeThrown = (e: unknown, fallback: string): string =>
    dataErrorText(e instanceof DataError ? e.code : undefined) ??
    (e instanceof DataError ? e.message : fallback);

  // ⚠️ TRANSLATED, AND BUILT INSIDE THE COMPONENT — the house convention, and
  // the one browser QA caught on the applications page when it was a
  // module-level English literal.
  const CRUMB = [t('materialRequests.crumb.requests')];

  const { data, isLoading, isError, error } = useMaterialRequests();
  const requests = useMemo(() => data?.items ?? [], [data]);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [justification, setJustification] = useState('');

  const submit = useMaterialRequestSubmit();
  const startReview = useMaterialRequestStartReview();
  const approve = useMaterialRequestApprove();
  const reject = useMaterialRequestReject();

  // ── THE STANDALONE DOOR ───────────────────────────────────────────────────
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raise, setRaise] = useState<MaterialRequestInput>(emptyRaise);
  const raiseComplete = materialRequestReady(raise);

  // ⚠️ ONE AVAILABILITY PER VERB, FROM THAT VERB'S OWN ATOM. `review` and
  // `decide` are separate questions and a seat can hold one without the other —
  // which is precisely the segregation `/buyer/roles` renders.
  const {
    submit: submitAvailability,
    review: reviewAvailability,
    decide: decideAvailability,
  } = useVerbAvailabilities({
    submit: 'materialrequest:submit',
    review: 'materialrequest:review',
    decide: 'materialrequest:decide',
  } as const);

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  // WHO ACTS NEXT. `MaterialRequestStatus` matches the machine exactly, so
  // `status` is the canonical state on this surface.
  const nextAct = useNextAct('materialRequest', selected?.status);

  const counts = useMemo(() => {
    const by = (s: MaterialRequestStatus) => requests.filter((r) => r.status === s).length;
    return {
      submitted: by('Submitted'),
      underReview: by('Under Review'),
      approved: by('Approved'),
      rejected: by('Rejected'),
    };
  }, [requests]);

  const filtered = useMemo(() => {
    const wanted = TAB_STATUSES[tab];
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (wanted && !wanted.includes(r.status)) return false;
      if (!q) return true;
      return (
        r.requestNumber.toLowerCase().includes(q) ||
        r.requestedLabel.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        // SRC-2 — and by the label the reader actually sees.
        categoryLabel(t, r.category).toLowerCase().includes(q)
      );
    });
  }, [requests, tab, search, t]);

  const closePanel = () => {
    setSelectedId(null);
    setPending(null);
    setJustification('');
  };

  const closeRaise = () => {
    setRaiseOpen(false);
    setRaise(emptyRaise);
  };

  /** The justification must be SUBSTANCE, not presence — the policy's mirror. */
  const canCommitReject = justification.trim().length > 0;

  // ⚠️ RESOLVED AT READ, NEVER STORED (C10 §8.2 / D-ID-7). The record carries a
  // `personId` and nothing else; `personLabel` is the ONE producer of a
  // reader-facing person label and is what attaches the SAMPLE marker, so this
  // surface cannot print an unmarked sample person.
  //
  // ⚠️ THE COMMENT SITS ABOVE THE FUNCTION RATHER THAN INSIDE IT, AND THAT IS
  // LOAD-BEARING: `chipCoverage.test.ts` classifies a message-map use as
  // non-render by looking for `): string =>` within SIX lines above it. Four
  // comment lines inside the body pushed the signature out of that window and
  // the guard raised a FALSE ACCUSATION against a correctly-typed helper —
  // rule 2, on a proximity window rather than a matcher.
  const renderAttribution = (actor: ActorAttribution | null): string =>
    actor === null
      ? t('materialRequests.detail.none')
      : actor.kind === 'RESOLVED'
        ? personLabel(actor.person.personId, t)
        : t(UNATTRIBUTED_KEY[actor.reason]);

  // ⚠️ **A REFUSAL A READER SEES NEVER CARRIES A `personId`.** Browser QA
  // found this toast rendering *"the requester (sim-usr-procurement-1) may not
  // also decide this request"* — an internal token standing where a person is
  // meant, on a governed surface. The fallback chain was
  // `refusalText(reason) ?? reason`, and `describeRefusal` appends the hook's
  // own developer sentence verbatim, so the id came through the SECOND link
  // rather than the last one.
  //
  // The person is resolved from the ROW's `submittedBy`, not from the seat.
  // They are the same person whenever this refusal fires — that identity is
  // the refusal's own condition — but reading the row is what the copy
  // actually claims, and a helper that read the seat would go quietly wrong
  // the day a hook refuses on somebody else's behalf.
  //
  // `renderAttribution` routes through `personLabel`, the ONE read-time
  // resolver, so the SAMPLE marker comes with the label and cannot be dropped
  // here.
  const refusalCopy = (
    reason: string | undefined,
    row: MaterialRequest | null,
    fallback: string,
  ): string => {
    // SUP-1 - accept and decline need a named person.
    const seatKey = namedSeatRefusalKey(reason);
    if (seatKey !== null) return t(seatKey);
    const key = personNamingRefusalKey(reason);
    if (key !== null) return t(key, { person: renderAttribution(row?.submittedBy ?? null) });
    return refusalText(reason) ?? reason ?? fallback;
  };

  const originLabel = (r: MaterialRequest): string =>
    r.raisedFromRfqId === null
      ? t('materialRequests.origin.standalone')
      : t('materialRequests.origin.rfq', { rfq: r.raisedFromRfqId });

  const raiseRequest = async () => {
    if (!raiseComplete || submit.isPending) return;
    try {
      // ⚠️ THE ONE BUILDER. The wizard entrance calls the same function with
      // the pick's reason and the minted RFQ id; this door leaves both absent.
      const result = await submit.mutateAsync({
        payload: buildMaterialRequestPayload(raise),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('materialRequests.toast.submitFailed.title'),
          description: refusalCopy(
            result.reason,
            null,
            t('materialRequests.toast.submitFailed.desc'),
          ),
        });
        return;
      }
      // ⚠️ THE TOAST NAMES THE REQUEST NUMBER FROM THE STORE, NOT FROM A
      // SURFACE DERIVATION. `CommandResult.entityId` is the id; the NUMBER is
      // minted inside the store. Recomputing `MR-2026-…` here would be a second
      // copy of `numberFor` — a number computed on the surface, which is the
      // exact defect B3 deleted from `/register`. The refetched row carries the
      // real one, so the toast reads it from there or says nothing.
      const minted = result.entityId
        ? (requests.find((r) => r.id === result.entityId)?.requestNumber ?? result.entityId)
        : '';
      toast({
        variant: 'success',
        title: t('materialRequests.toast.submitted.title', { number: minted }),
        description: t('materialRequests.toast.submitted.desc'),
      });
      closeRaise();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('materialRequests.toast.submitFailed.title'),
        description: describeThrown(e, t('materialRequests.toast.submitFailed.desc')),
      });
    }
  };

  const startReviewSelected = async () => {
    if (!selected || startReview.isPending) return;
    try {
      const result = await startReview.mutateAsync({ requestId: selected.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('materialRequests.toast.failed.title'),
          description: refusalCopy(result.reason, selected, ''),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('materialRequests.toast.reviewStarted.title'),
      });
    } catch (e) {
      toast({
        variant: 'error',
        title: t('materialRequests.toast.failed.title'),
        description: describeThrown(e, t('materialRequests.toast.failed.title')),
      });
    }
  };

  const approveSelected = async () => {
    if (!selected || approve.isPending) return;
    try {
      const result = await approve.mutateAsync({ requestId: selected.id });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('materialRequests.toast.failed.title'),
          description: refusalCopy(result.reason, selected, ''),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('materialRequests.toast.approved.title'),
        description: t('materialRequests.toast.approved.desc'),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('materialRequests.toast.failed.title'),
        description: describeThrown(e, t('materialRequests.toast.failed.title')),
      });
    }
  };

  const rejectSelected = async () => {
    if (!selected || !canCommitReject || reject.isPending) return;
    try {
      const result = await reject.mutateAsync({
        requestId: selected.id,
        justification: justification.trim(),
      });
      if (result.status === 'failed') {
        toast({
          variant: 'error',
          title: t('materialRequests.toast.failed.title'),
          description: refusalCopy(result.reason, selected, ''),
        });
        return;
      }
      toast({
        variant: 'success',
        title: t('materialRequests.toast.rejected.title'),
        description: t('materialRequests.toast.rejected.desc'),
      });
      closePanel();
    } catch (e) {
      toast({
        variant: 'error',
        title: t('materialRequests.toast.failed.title'),
        description: describeThrown(e, t('materialRequests.toast.failed.title')),
      });
    }
  };

  /** The header and the count line render in every state; the figures, the
   *  tabs and the search only once the read has answered. */
  const ready = !isLoading && !isError;

  const columns: Column<MaterialRequest>[] = [
    {
      id: 'number',
      header: t('materialRequests.col.number'),
      kind: 'id',
      cell: (r) => <Data>{r.requestNumber}</Data>,
    },
    {
      id: 'material',
      header: t('materialRequests.col.material'),
      kind: 'text',
      // i18n-defer: the material's name in the buyer's own words.
      cell: (r) => r.requestedLabel,
    },
    {
      id: 'category',
      header: t('materialRequests.col.category'),
      kind: 'text',
      cell: (r) => categoryLabel(t, r.category),
    },
    {
      id: 'origin',
      header: t('materialRequests.col.origin'),
      kind: 'text',
      cell: (r) => originLabel(r),
    },
    {
      id: 'status',
      header: t('materialRequests.col.status'),
      kind: 'status',
      cell: (r) => (
        <StatusPill variant={STATUS_VARIANT[r.status]}>
          {t(`materialRequests.status.${r.status}`)}
        </StatusPill>
      ),
    },
  ];

  return (
    <ListPage
        breadcrumb={CRUMB}
        title={t('materialRequests.title')}
        subtitle={t('materialRequests.subtitle')}
        actions={
          /* The CREATE verb, in the page header, acting on no selected row —
             the one shape a panel-walking derivation cannot see. Its own atom,
             its own notice, never the review gate. */
          submitAvailability.kind === 'held' ? (
            <Button
              variant="primary"
              onClick={() => setRaiseOpen(true)}
              data-testid="material-request-raise-open"
            >
              <FilePlus2 size={16} className="mr-2" />
              {t('materialRequests.raise.open')}
            </Button>
          ) : (
            <HandoffNotice
              availability={submitAvailability}
              testId="handoff-materialrequest-submit"
            />
          )
        }
        meta={
          <>
            {t('materialRequests.meta.note')}
            <ProvenanceMarker capability="materialRequests" className="ml-3 align-middle" />
          </>
        }
        kpis={
          ready ? (
            <>
              <KpiCard
                icon={Clock}
                eyebrow={t('materialRequests.kpi.submitted')}
                value={counts.submitted.toString()}
              />
              <KpiCard
                icon={Eye}
                eyebrow={t('materialRequests.kpi.underReview')}
                value={counts.underReview.toString()}
              />
              <KpiCard
                icon={CheckCircle2}
                eyebrow={t('materialRequests.kpi.approved')}
                value={counts.approved.toString()}
              />
              <KpiCard
                icon={Clock}
                eyebrow={t('materialRequests.kpi.rejected')}
                value={counts.rejected.toString()}
              />
            </>
          ) : undefined
        }
        tabs={
          ready ? (
            <SubTabs<Tab>
              options={[
                { id: 'all', label: t('materialRequests.tab.all'), count: requests.length },
                {
                  id: 'submitted',
                  label: t('materialRequests.tab.submitted'),
                  count: counts.submitted,
                },
                {
                  id: 'underReview',
                  label: t('materialRequests.tab.underReview'),
                  count: counts.underReview,
                },
                {
                  id: 'approved',
                  label: t('materialRequests.tab.approved'),
                  count: counts.approved,
                },
                {
                  id: 'rejected',
                  label: t('materialRequests.tab.rejected'),
                  count: counts.rejected,
                },
              ]}
              value={tab}
              onChange={setTab}
            />
          ) : undefined
        }
        search={
          ready ? (
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t('materialRequests.search.placeholder')}
            />
          ) : undefined
        }
      >
      {isLoading && <LoadingState breadcrumb={CRUMB} />}
      {isError && (
        <ErrorState
          breadcrumb={CRUMB}
          title={t('materialRequests.error.title')}
          error={error}
        />
      )}

      {ready && (
        <>
          {requests.length === 0 ? (
            <EmptyState
              breadcrumb={CRUMB}
              title={t('materialRequests.empty.title')}
              subtitle={t('materialRequests.empty.subtitle')}
              message={t('materialRequests.empty.body')}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              breadcrumb={CRUMB}
              title={t('materialRequests.empty.filtered.title')}
              subtitle={t('materialRequests.empty.filtered.subtitle')}
              message={t('materialRequests.empty.filtered.body')}
            />
          ) : (
            <DataTable<MaterialRequest>
              columns={columns}
              rows={filtered}
              rowKey={(r) => r.id}
              onRowClick={(r) => {
                setSelectedId(r.id);
                setPending(null);
                setJustification('');
              }}
              rowProps={(r) => ({ 'data-testid': `material-request-row-${r.requestNumber}` })}
            />
          )}
        </>
      )}

      {/* ── THE STANDALONE DOOR. Its own panel, its own gate. ─────────────── */}
      <SidePanel
        open={raiseOpen}
        onClose={closeRaise}
        title={t('materialRequests.raise.title')}
      >
        {/* ⚠️ THE MODE IS GATED, NOT ONLY THE DOOR (ENTRANCE-IS-THE-UNIT-01). A seat narrowed while
            this panel stands open is reachable, so the BODY checks the atom too,
            and the notice is what it falls back to rather than a blank. */}
        {submitAvailability.kind !== 'held' ? (
          <HandoffNotice
            availability={submitAvailability}
            testId="handoff-materialrequest-submit-panel"
          />
        ) : (
          <div className="space-y-6" data-testid="material-request-raise-form">
            <FormSection title={t('materialRequests.raise.section.what')}>
              <FormField
                label={t('materialRequests.raise.field.label')}
                hint={t('materialRequests.raise.field.label.hint')}
              >
                <TextInput
                  type="text"
                  value={raise.requestedLabel}
                  onChange={(e) => setRaise({ ...raise, requestedLabel: e.target.value })}
                  placeholder={t('materialRequests.raise.placeholder.label')}
                  data-testid="material-request-label"
                />
              </FormField>
              <FormField label={t('materialRequests.raise.field.category')}>
                <Select
                  value={raise.category}
                  onChange={(e) =>
                    setRaise({ ...raise, category: e.target.value as RFQCategory })
                  }
                  data-testid="material-request-category"
                >
                  {/* DERIVED from the closed union's own runtime list, never a
                      literal list here — a seventh category must reach this
                      control by being added to `RFQ_CATEGORIES`. */}
                  {RFQ_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(t, c)}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label={t('materialRequests.raise.field.need')}
                hint={t('materialRequests.raise.field.need.hint')}
              >
                <TextArea
                  value={raise.need}
                  onChange={(e) => setRaise({ ...raise, need: e.target.value })}
                  placeholder={t('materialRequests.raise.placeholder.need')}
                  rows={3}
                  data-testid="material-request-need"
                />
              </FormField>
            </FormSection>

            <FormSection title={t('materialRequests.raise.section.optional')}>
              <FormField label={t('materialRequests.raise.field.specification')}>
                <TextInput
                  type="text"
                  value={raise.specification ?? ''}
                  onChange={(e) => setRaise({ ...raise, specification: e.target.value })}
                  data-testid="material-request-specification"
                />
              </FormField>
              <FormField
                label={t('materialRequests.raise.field.uom')}
                hint={t('materialRequests.raise.field.uom.hint')}
              >
                <TextInput
                  type="text"
                  value={raise.expectedUom ?? ''}
                  onChange={(e) => setRaise({ ...raise, expectedUom: e.target.value })}
                  data-testid="material-request-uom"
                />
                {/* ⚠️ THE FIELD IS LABELLED AS THE REQUESTER'S CLAIM, in the
                    rendered copy and not only in a comment (operator ruling).
                    There is no single UOM union in this tree to validate
                    against — three sets, no mapper — so validating here would
                    mean minting a fourth. */}
              </FormField>
            </FormSection>

            <p className="text-xs text-text-tertiary">
              <ActorPreActNotice unattributedKey="materialRequests.raise.unattributed" testId="mr-pre-act" />
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={raiseRequest}
                disabled={!raiseComplete || submit.isPending}
                data-testid="material-request-raise-commit"
              >
                {t('materialRequests.raise.submit')}
              </Button>
              <Button variant="secondary" onClick={closeRaise}>
                {t('materialRequests.raise.cancel')}
              </Button>
            </div>
          </div>
        )}
      </SidePanel>

      {/* ── THE REVIEWER'S PANEL ─────────────────────────────────────────── */}
      <SidePanel
        open={selected !== null}
        onClose={closePanel}
        title={
          selected
            ? t('materialRequests.detail.title', { number: selected.requestNumber })
            : ''
        }
      >
        {selected && (
          <div className="space-y-6">
            {/* ⚠️ `testId` IS PASSED, AND OMITTING IT WAS CAUGHT BY A GATE
                RATHER THAN BY REVIEW — worth recording because it is that
                gate's design working. `moduleScopeLiteralGate`'s discriminator
                is DERIVED: a parameter default is a defect *iff some JSX call
                site omits the prop*. All eleven existing `NextActLine` sites
                pass one, so `testId = 'next-act'` had never been reachable;
                this page omitting it made the default render for the first
                time and the gate fired with nobody editing it. */}
            <NextActLine act={nextAct} testId="next-act-buyer-material-request" />
            {/* ADM-1 — what a Super Admin passed on this request, if anything. */}
            <SuperAdminBypassNote entity="materialRequest" entityId={selected.id} />

            <FormSection title={t('materialRequests.detail.section.request')}>
              <FieldList columns={1}>
                <Field label={t('materialRequests.col.material')}>
                  {/* i18n-defer: the buyer's own words for the material. */}
                  {selected.requestedLabel}
                </Field>
                <Field label={t('materialRequests.col.category')}>
                  {categoryLabel(t, selected.category)}
                </Field>
                <Field label={t('materialRequests.detail.field.need')}>
                  {/* i18n-defer: the requester's own justification. */}
                  {selected.need}
                </Field>
                {selected.catalogReason !== null && (
                  <Field
                    label={t('materialRequests.detail.field.reason')}
                    data-testid="material-request-reason"
                  >
                    {t(`materialRequests.reason.${selected.catalogReason}`)}
                  </Field>
                )}
                <Field label={t('materialRequests.detail.field.origin')}>
                  {originLabel(selected)}
                </Field>
                {selected.specification !== null && (
                  <Field label={t('materialRequests.detail.field.specification')}>
                    {/* i18n-defer: the requester's own text. */}
                    {selected.specification}
                  </Field>
                )}
                {selected.expectedUom !== null && (
                  <Field label={t('materialRequests.detail.field.uom')}>
                    {/* i18n-defer: the requester's stated unit, unvalidated. */}
                    {selected.expectedUom}
                  </Field>
                )}
                <Field label={t('materialRequests.detail.field.submittedAt')} kind="date">
                  {formatDate(selected.submittedAt)}
                </Field>
                <Field label={t('materialRequests.detail.field.submittedBy')}>
                  {renderAttribution(selected.submittedBy)}
                </Field>
                {selected.reviewStartedAt !== null && (
                  <Field label={t('materialRequests.detail.field.reviewStartedAt')} kind="date">
                    {formatDate(selected.reviewStartedAt)}
                  </Field>
                )}
              </FieldList>
            </FormSection>

            {/* ── THE DECISION, once one exists ──────────────────────────── */}
            {(selected.status === 'Approved' || selected.status === 'Rejected') && (
              <FormSection title={t('materialRequests.detail.section.decision')}>
                {/* ⚠️ THE OUTCOME LINE. "Accepted for creation" and the sentence
                    that follows it are the whole defence against this reading as
                    "the material now exists" — it says plainly that the code is
                    issued by SAP and that the catalog gains the material then. */}
                <p
                  className="text-sm text-text-secondary"
                  data-testid="material-request-outcome"
                >
                  {selected.status === 'Approved'
                    ? t('materialRequests.outcome.approved')
                    : t('materialRequests.outcome.rejected')}
                </p>
                <FieldList columns={1} className="mt-4">
                  {selected.justification !== null && (
                    <Field label={t('materialRequests.reject.field.justification')}>
                      {/* i18n-defer: the decider's own words. */}
                      {selected.justification}
                    </Field>
                  )}
                  <Field label={t('materialRequests.detail.field.decidedAt')} kind="date">
                    {selected.decidedAt
                      ? formatDate(selected.decidedAt)
                      : t('materialRequests.detail.none')}
                  </Field>
                  <Field label={t('materialRequests.detail.field.decidedBy')}>
                    {renderAttribution(selected.decidedBy)}
                  </Field>
                </FieldList>
              </FormSection>
            )}

            {/* ── THE ACTS. Per verb, per state, each behind its own atom. ── */}
            {selected.status === 'Submitted' &&
              (reviewAvailability.kind === 'held' ? (
                <Button
                  variant="outline"
                  onClick={startReviewSelected}
                  disabled={startReview.isPending}
                  data-testid="material-request-start-review"
                >
                  {t('materialRequests.action.startReview')}
                </Button>
              ) : (
                <HandoffNotice
                  availability={reviewAvailability}
                  testId="handoff-materialrequest-review"
                />
              ))}

            {selected.status === 'Under Review' && decideAvailability.kind === 'held' && (
              <ActorPreActNotice unattributedKey="identity.preAct.namedRequired" testId="materialrequest-decide-pre-act" />
            )}
            {selected.status === 'Under Review' &&
              (decideAvailability.kind !== 'held' ? (
                <HandoffNotice
                  availability={decideAvailability}
                  testId="handoff-materialrequest-decide"
                />
              ) : pending === null ? (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setPending('approve')}
                    data-testid="material-request-approve"
                  >
                    {t('materialRequests.action.approve')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setPending('reject')}
                    data-testid="material-request-reject"
                  >
                    {t('materialRequests.action.reject')}
                  </Button>
                </div>
              ) : pending === 'approve' ? (
                <div className="space-y-4" data-testid="material-request-approve-confirm">
                  {/* ⚠️ NO TEXT BOX HERE, DELIBERATELY. An acceptance requires
                      no authored reason — and a field nobody must fill is a
                      field somebody will. */}
                  <p className="text-sm text-text-secondary">
                    {t('materialRequests.confirm.approve')}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={approveSelected}
                      disabled={approve.isPending}
                      data-testid="material-request-approve-commit"
                    >
                      {t('materialRequests.action.confirmApprove')}
                    </Button>
                    <Button variant="secondary" onClick={() => setPending(null)}>
                      {t('materialRequests.action.back')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4" data-testid="material-request-reject-confirm">
                  <FormField
                    label={t('materialRequests.reject.field.justification')}
                    hint={t('materialRequests.reject.field.justification.hint')}
                  >
                    <TextArea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      rows={3}
                      data-testid="material-request-justification"
                    />
                  </FormField>
                  <p className="text-sm text-text-secondary">
                    {t('materialRequests.confirm.reject')}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={rejectSelected}
                      /* A COURTESY MIRROR of MATERIALREQUEST_REFUSAL_AUTHORED,
                         never the policy: the hook stands behind any caller
                         that never renders this box. */
                      disabled={!canCommitReject || reject.isPending}
                      data-testid="material-request-reject-commit"
                    >
                      {t('materialRequests.action.confirmReject')}
                    </Button>
                    <Button variant="secondary" onClick={() => setPending(null)}>
                      {t('materialRequests.action.back')}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </SidePanel>
    </ListPage>
  );
};

export default BuyerMaterialRequests;

/**
 * ⚠️ RE-EXPORTED FOR THE i18n COVERAGE SPEC, NOT FOR THE PAGE.
 * `CODE_LESS_REASONS` is imported above so the reason-copy spec can assert that
 * this surface renders a key for EVERY member of the union — the population is
 * derived from the union rather than from the five keys that happen to exist.
 */
export { CODE_LESS_REASONS };
