import React, { useMemo, useState } from 'react';
import Wizard, { WizardStep } from '../ui-v2/Wizard';
import FormSection from '../ui-v2/FormSection';
import Data from '../ui-v2/Data';
import { useToast } from '../../hooks/useToast';
import { useTranslation } from 'react-i18next';
import { useEnumLabel } from '../../hooks/useEnumLabel';
import { statusLabelKey } from '../../lib/statusLabel';
import { enumLabelKey } from '../../lib/priorityLabel';
import type { Shipment, ASN, AsnStatus } from '../../services/data/types';
import type { InspectionResult } from '../../data/mockGoodsReceipts';
import {
  readGrLineQuantities,
  seedQty,
  type GrLineQtyOutcome,
} from './grLineQuantities';
import type { QtyRefusalReason } from '../../lib/localeNumber';
import {
  useGoodsReceiptCreate,
  useGoodsReceiptFinalize,
  useGoodsReceiptPost,
  useGoodsReceiptSettle,
} from '../../services/query/commandHooks';
import {
  deriveHeaderDisposition,
  headerVerbFor,
  type GrHeaderDisposition,
} from '../../services/transitions';
import { bpomOf } from '../../services/sdc/bpom';
import type { BpomOutcome, BpomRefusalReason } from '../../services/sdc/bpom';

interface GRInspectionWizardProps {
  onClose: () => void;
  /** Called after the create/dispose/post commands resolve — the list re-derives
   *  from the invalidated query, so no GR object is handed back. */
  onComplete: () => void;
  initialAsnId?: string;
  /** Shipments resolved through the service seam (GR-LEGACY-READ-01) — the
   *  wizard no longer reads the raw fixture. */
  shipments: Shipment[];
  /** ASNs resolved through the service seam (asnStore-backed) — a live
   *  supplier-submitted ASN is a receivable GR source, not just fixture docks. */
  asns: ASN[];
}

// CP-0 · W1 · 2f-a — each quantity refusal names its own rule. A blank, an
// unreadable token and a cross-convention token are three different mistakes on
// a value that becomes inventory, and the blank message says what to type
// instead: 0 is a real receipt of none, blank is not a statement at all.
const GR_QTY_REFUSAL_KEY: Record<QtyRefusalReason, string> = {
  EMPTY_QTY: 'goodsReceipt.wizard.qty.refused.empty',
  NOT_NUMERIC: 'goodsReceipt.wizard.qty.refused.notNumeric',
  AMBIGUOUS_QTY: 'goodsReceipt.wizard.qty.refused.ambiguous',
};

// CP-2 · 2B-4b — each BPOM refusal NAMES what is missing. Same shape as
// GR_QTY_REFUSAL_KEY above, and for the same reason: a refusal that cannot say
// which absence it hit is half a refusal (the `uomOf` precedent).
//
// ⚠️ THE TWO REASONS DIFFER ONLY IN THE SENTENCE. They refuse IDENTICALLY —
// same `!ok`, same blocked step, same absent determination. `reason` exists so
// the message can name the gap, NOT so a caller can pick which refusal to
// ignore, and nothing here or in `qualityValid` branches on it to proceed.
const GR_BPOM_REFUSAL_KEY: Record<BpomRefusalReason, string> = {
  UNKNOWN_MATERIAL: 'goodsReceipt.wizard.bpom.refused.unknownMaterial',
  UNDETERMINED_APPLICABILITY: 'goodsReceipt.wizard.bpom.refused.undetermined',
};

type SourceMode = 'shipment' | 'manual';

interface LineDraft {
  materialCode: string;
  description: string;
  qtyExpected: number;
  // RAW-BACKED (2f-a). `number` had no representation for "blank", so there was
  // no string to parse and therefore no parse boundary to fix — converting the
  // draft IS the fix, not a means to it. Same shape as QuoteForm.unitPrice,
  // DraftRfq.totalQty and IntakeAdjustDrawer's acceptedRaw.
  qtyReceivedRaw: string;
  qtyAcceptedRaw: string;
  rejectionReason: string;
  visualCheck: 'Pass' | 'Fail';
  packagingCheck: 'Pass' | 'Fail' | 'N/A';
  halalRequired: boolean;
  /**
   * The halal seal answer, or ABSENT because nobody has given one.
   *
   * ⚠️ The `?` is the whole point and it always was — `'Pass' | 'Fail'` has no
   * room for *unanswered*, so `undefined` IS the third state. What was wrong was
   * never the type; it was that the builders never let `undefined` survive
   * contact with a required line (`REQUIRED-OPENS-PRE-ANSWERED-01`).
   */
  halalSealCheck?: 'Pass' | 'Fail';
  /**
   * The BPOM gate, read ONCE from the material master (`bpomOf`).
   *
   * ⚠️ **NOT A BOOLEAN, and that is the whole of `INFERBPOM-REGULATORY-01`'s
   * fix.** The field this replaces was `bpomRequired: boolean`, seeded from a
   * code-prefix parse, and a boolean has no room for *nobody has ruled* — so
   * every material the rule did not recognise came back `false`, and `false` is
   * an ASSERTION ("this lot needs no BPOM check"). The outcome type can refuse,
   * and `qualityValid` blocks on a refusal.
   */
  bpom: BpomOutcome;
  /** The BPOM lot answer, or ABSENT because nobody has given one — see
   *  `halalSealCheck` above and `seedBpom` below. */
  bpomLotCheck?: 'Pass' | 'Fail';
  labSampleRequired: boolean;
  labRequestId?: string;
}

// i18n-defer: ROLES is submitted verbatim as the `receivedBy` field on
// t_gr_create — the option label IS the stored data value, so translating the
// display would corrupt the recorded receiver. Defer until receivedBy carries a
// stable role code separate from its display label.
const ROLES = [
  'Warehouse Supervisor',
  'QC Inspector',
  'Operations Manager',
];

// i18n-defer: warehouse facility names / codes (proper nouns) — out of scope
// like material/brand data.
const LOCATIONS = ['NDC J6 Jakarta', 'RM Warehouse', 'PM Warehouse'];

const ELIGIBLE_STATUSES = ['At Dock', 'Unloading'] as const;

// ASN states in which a submitted ASN is receivable (mirrors the cascadable set
// the dispatcher enforces on t_gr_create's manual-ref path).
const RECEIVABLE_ASN_STATUSES: readonly AsnStatus[] = ['Submitted', 'In Transit', 'Delivered'];

// A normalized GR source — a shipment at dock OR a live submitted ASN. The dock
// list is the union of both; live ASNs without a dock appointment are labelled
// honestly (dock scheduling arrives via the TMS boundary, INT-TMS-01).
interface GrSource {
  id: string; // shipment id, or `asn:<number>` for a store ASN
  asnNumber: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  dockLabel: string;
  dockTime: string;
  lines: LineDraft[];
}

const labelFor = (text: string) => (
  <label className="block text-xs font-medium text-text-tertiary uppercase mb-1">
    {text}
  </label>
);

const inputCls =
  'w-full rounded-md border border-border-input bg-white px-3 py-2 text-sm text-text-primary focus:border-action focus:outline-none';

const radioCls = 'flex items-center gap-1.5 text-sm text-text-primary cursor-pointer';

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n);

// ── CP-3 · `REQUIRED-OPENS-PRE-ANSWERED-01` — ONE control, BOTH regulatory
// checks ─────────────────────────────────────────────────────────────────────
// The halal check and the BPOM check were two hand-rolled radio pairs with two
// hand-rolled seeds, and that is precisely how one of them ended up demanding an
// answer while its neighbour supplied one. They now render through a SINGLE
// component, so "unanswered looks like this" is one fact in one place and a
// future check cannot quietly re-acquire a default.
//
// ⚠️ **THE UNANSWERED MARKER IS NOT AN ERROR MESSAGE, and its role says so.**
// `role="status"` (polite), not `role="alert"`: nobody has done anything wrong
// on open — a required question is simply outstanding. The BPOM *refusal* below
// keeps `role="alert"`, because that one IS a fault in the data. Two different
// facts, two different announcements.
//
// The blocking is NOT here. `qualityValid` blocks, as it already did; this
// component only makes the blocked state legible instead of a silently blank
// pair of radios.
interface RegulatoryCheckProps {
  /** Radio group name — unique per line (`halal-3`, `bpom-3`). */
  name: string;
  label: string;
  /** The recorded answer, or `undefined` for the honest absence of one. */
  value?: 'Pass' | 'Fail';
  onChange: (v: 'Pass' | 'Fail') => void;
  /** Display resolver for the Pass/Fail tokens — the STORED value stays EN. */
  el: (token: string) => string;
  unansweredText: string;
  testId: string;
}

const RegulatoryCheck: React.FC<RegulatoryCheckProps> = ({
  name,
  label,
  value,
  onChange,
  el,
  unansweredText,
  testId,
}) => (
  <div>
    {labelFor(label)}
    <div className="flex gap-4">
      {(['Pass', 'Fail'] as const).map((v) => (
        <label key={v} className={radioCls}>
          <input
            type="radio"
            name={name}
            value={v}
            // A line renders up to four Pass/Fail pairs, so an accessible name of
            // just "Pass" is ambiguous four times over — to a screen reader and
            // to a spec alike. Qualified by the check it belongs to; the visible
            // word is still contained in it (WCAG 2.5.3).
            aria-label={`${label} — ${el(v)}`}
            // REQUIRED, and machine-readable as such. The row only renders when
            // the check applies, so `aria-required` is never a lie: a check that
            // does not apply has no control to be required.
            aria-required
            checked={value === v}
            onChange={() => onChange(v)}
          />
          {el(v)}
        </label>
      ))}
    </div>
    {value === undefined && (
      <div
        data-testid={testId}
        role="status"
        className="mt-1 text-[11px] text-warning-hover"
      >
        {unansweredText}
      </div>
    )}
  </div>
);

// ── ⚠️ `inferHalal` SURVIVES THIS BATCH, AND IT IS THE SAME DEFECT ───────────
// `INFERHALAL-READS-PROSE-01`. `inferBpom` is gone from this file; its twin is
// not, and it is REPORTED rather than folded in silently (2B-4b dispatch).
//
// It is not left because it is safer. On two of the three axes it is WORSE:
//   · `inferBpom` parsed a code WE control; this reads `description`, which on
//     the ASN lane is a SUPPLIER-SUBMITTED free-text field. A regulatory check
//     keyed on prose a counterparty types is a weaker thing than one keyed on a
//     code space we author.
//   · MEASURED, not argued: across both shipment lanes the halal check fires on
//     `RM-EMUL-9410` and `RM-EMUL-9430` — and NOT on `RM-EMUL-9440`. Three
//     emulsifiers, one material group, and the check fires on two of them
//     because a fixture author happened to write "(Halal Emulsifier)" into a
//     product name. That is `PREFIX-RULE-SUCCEEDS-BY-ACCIDENT-01` one field
//     over. `RM-PSTN-7150` — palm stearin, the single most halal-load-bearing
//     row in the master — does not fire either.
//
// It is left because RETIRING IT REQUIRES A FIELD THAT DOES NOT EXIST. There is
// no `halalApplicable` on `MaterialMasterEntry`; authoring one (plus its class
// rule, its provisional seed on all 42 rows and its `D-COMP-HALAL` escalation)
// is a 2B-4a-shaped batch, and doing it inside a wiring batch would be exactly
// the decision-smuggling `MG-NO-EMULSIFIER-GROUP-01` was held back from.
// See `docs/findings.md` → `INFERHALAL-READS-PROSE-01`.
//
// ── ⚠️ STILL TRUE AT CP-3, AND DELIBERATELY UNTOUCHED ───────────────────────
// `REQUIRED-OPENS-PRE-ANSWERED-01` removed the fabricated `'Pass'` this function
// used to hand its callers. It did NOT touch the function. WHETHER the halal
// check is asked remains this prose parse's decision, wrong in the ways measured
// above; WHAT the answer is is now nobody's decision but an inspector's. Two
// separable defects, and only the second one was in scope.
//
// The consequence, measured and not assumed: `inferHalal` fires on FOUR fixture
// lines and NONE of them is a receivable GR source (`shp-004` In Transit ×2,
// `shp-011` Customs Clearance, `shp-016` Delivered — only 'At Dock' /
// 'Unloading' are eligible). So the halal pre-tick blocked ZERO lines today.
// Fixing it now costs nothing and closes the hole BEFORE the applicability arc
// gives it reach — see `PRE-ANSWERED-HAS-NO-REACH-YET-01`.
const inferHalal = (description: string): boolean => {
  const d = description.toLowerCase();
  return d.includes('halal');
};

/**
 * The BPOM gate for one line. **NO seeded check value — that is the fix.**
 *
 * ONE read, shared by both draft builders — the shipment lane and the ASN lane
 * cannot disagree about whether a material needs a BPOM lot check, because
 * neither of them decides it.
 *
 * ⚠️ **`REQUIRED-OPENS-PRE-ANSWERED-01` CLOSED HERE.** This returned
 * `bpomLotCheck: bpom.ok && bpom.applicable ? 'Pass' : undefined` — so the
 * moment the master ruled a lot APPLICABLE, the form ANSWERED the question it
 * had just decided to ask. A derived fact hand-stamped, on a regulatory
 * control. `bpomLotCheck` now starts absent and STAYS absent until a human
 * ticks it; `qualityValid` already blocked on `applicable && !bpomLotCheck`,
 * so removing the stamp is what activates a gate that was written correctly
 * and could never fire.
 *
 * **THE SEED IS NOT REPLACED BY A DIFFERENT SEED.** There is no `'Pending'`
 * token, no third radio option, no `null` sentinel — absence is absence, and
 * the three states are told apart by the SHAPE of the surface: no row (not
 * required) · row with nothing selected + an unanswered marker (required,
 * unanswered) · row with a selection (required, answered).
 */
const seedBpom = (materialCode: string): Pick<LineDraft, 'bpom' | 'bpomLotCheck'> => ({
  bpom: bpomOf(materialCode),
  bpomLotCheck: undefined,
});

const buildDraftFromShipment = (s: Shipment): LineDraft[] =>
  s.lineItems.map((li) => ({
    materialCode: li.materialCode,
    description: li.description,
    qtyExpected: li.qty,
    qtyReceivedRaw: seedQty(li.qty),
    qtyAcceptedRaw: seedQty(li.qty),
    rejectionReason: '',
    visualCheck: 'Pass',
    packagingCheck: 'Pass',
    halalRequired: inferHalal(li.description),
    // `REQUIRED-OPENS-PRE-ANSWERED-01`, the halal half — see `seedBpom`. The
    // applicability call (`inferHalal`) is UNCHANGED and still its own arc; only
    // the fabricated ANSWER is gone.
    halalSealCheck: undefined,
    ...seedBpom(li.materialCode),
    labSampleRequired: false,
  }));

const buildDraftFromAsn = (a: ASN): LineDraft[] =>
  a.lineItems.map((li) => ({
    materialCode: li.materialCode,
    description: li.description,
    qtyExpected: li.orderedQty,
    qtyReceivedRaw: seedQty(li.shippedQty),
    qtyAcceptedRaw: seedQty(li.shippedQty),
    rejectionReason: '',
    visualCheck: 'Pass',
    packagingCheck: 'Pass',
    halalRequired: inferHalal(li.description),
    halalSealCheck: undefined,
    ...seedBpom(li.materialCode),
    labSampleRequired: false,
  }));

const sourceFromShipment = (s: Shipment): GrSource => ({
  id: s.id,
  asnNumber: s.asnNumber,
  poNumber: s.poNumber,
  supplierId: s.supplierId,
  supplierName: s.supplierName,
  dockLabel: s.dockAssignment ?? 'Pending dock',
  dockTime: s.dockTime ?? '—',
  lines: buildDraftFromShipment(s),
});

const sourceFromAsn = (a: ASN): GrSource => ({
  id: `asn:${a.asnNumber}`,
  asnNumber: a.asnNumber,
  poNumber: a.poReference,
  supplierId: a.supplierId,
  // The ASN carries no supplierName; its create stamps the supplier name into
  // details.originCity (else fall back to the id).
  supplierName: a.details.originCity || a.supplierId,
  dockLabel: 'No dock appointment',
  dockTime: 'Scheduled via TMS',
  lines: buildDraftFromAsn(a),
});

const GRInspectionWizard: React.FC<GRInspectionWizardProps> = ({
  onClose,
  onComplete,
  initialAsnId,
  shipments,
  asns,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  // Display resolver for the shared inspection tokens (Pass/Fail/N/A). The radio
  // state value stays canonical EN (checked/onChange use `v`); only the visible
  // label localizes — the recorded visualCheck/packagingCheck are never touched.
  const el = useEnumLabel();
  // The header disposition is DERIVED (never a submitted literal — headerVerbFor
  // maps it to a verb), so its badge/toast text localizes freely. Its tokens are
  // status-rollup vocab (Approved / Partially Approved), so try statusLabel first.
  const dispositionLabel = (d: string) => {
    const k = statusLabelKey(d) ?? enumLabelKey(d);
    return k ? t(k) : d;
  };
  const createGR = useGoodsReceiptCreate();
  const finalizeGR = useGoodsReceiptFinalize();
  const postGR = useGoodsReceiptPost();
  const settleGR = useGoodsReceiptSettle();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [sourceMode, setSourceMode] = useState<SourceMode>('shipment');
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    initialAsnId ?? ''
  );
  const [manualASN, setManualASN] = useState('');

  // Step 2 state
  const [receivedDate, setReceivedDate] = useState('2026-05-20');
  const [receivedBy, setReceivedBy] = useState(ROLES[0]);
  const [warehouse, setWarehouse] = useState(LOCATIONS[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);

  // Step 4 state — NO free-choice disposition: the header is DERIVED from the
  // lines (see derivedDisposition below), never asserted.
  const [dispositionReason, setDispositionReason] = useState('');
  const [autoPostSap, setAutoPostSap] = useState(true);
  const [finalNotes, setFinalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receivable GR sources = shipments at dock ∪ live receivable ASNs (deduped by
  // ASN number; the shipment wins when both exist since it carries dock data).
  const sources = useMemo(() => {
    const shipmentSources = shipments
      .filter((s) => ELIGIBLE_STATUSES.includes(s.status as 'At Dock' | 'Unloading'))
      .map(sourceFromShipment);
    const seen = new Set(shipmentSources.map((s) => s.asnNumber));
    const asnSources = asns
      .filter((a) => RECEIVABLE_ASN_STATUSES.includes(a.status) && !seen.has(a.asnNumber))
      .map(sourceFromAsn);
    return [...shipmentSources, ...asnSources];
  }, [shipments, asns]);

  // Manual entry resolves against the live ASNs (the service seam), not a
  // fixture list: an unknown / non-receivable ASN is honestly reported.
  const manualAsnMatch = useMemo(
    () =>
      asns.find(
        (a) => a.asnNumber === manualASN.trim() && RECEIVABLE_ASN_STATUSES.includes(a.status),
      ),
    [asns, manualASN],
  );
  const manualNotFound = manualASN.trim().length > 0 && !manualAsnMatch;

  const activeSource: GrSource | undefined =
    sourceMode === 'manual'
      ? manualAsnMatch
        ? sourceFromAsn(manualAsnMatch)
        : undefined
      : sources.find((s) => s.id === selectedSourceId);

  // Auto-populate lines when a source resolves (dock selection, manual match, or
  // the initial pre-selection) and none are drafted yet.
  const activeSourceId = activeSource?.id;
  React.useEffect(() => {
    if (activeSource && lines.length === 0) {
      setLines(activeSource.lines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSourceId]);

  const sourceValid = !!activeSource;

  // Finalized inspection lines + the header disposition ROLLED UP from them. The
  // header is DERIVED, never a free-choice assertion (law 0.6) — the same rollup
  // the dispatcher's gr_rollup_* hooks re-check, so the UI cannot present an
  // Accept the lines contradict.
  // ── CP-0 · W1 · 2f-a — the ONE read of every line's quantity pair ─────────
  // Index-aligned with `lines`. The field messages, the receipt guard, the
  // derived qtyRejected, the header rollup and the dispatched payload all read
  // THIS, so none of them can disagree about what arrived.
  const lineQtys = useMemo<GrLineQtyOutcome[]>(
    () => lines.map((l) => readGrLineQuantities(l.qtyReceivedRaw, l.qtyAcceptedRaw)),
    [lines],
  );
  const allQtysOk = lineQtys.every((q) => q.ok);

  const inspectionResults = useMemo<InspectionResult[]>(
    () =>
      // A receipt with an unreadable line has no coherent description, so there
      // is nothing to describe: the empty set rolls up to 'Pending'
      // (`deriveHeaderDisposition`) and `headerVerbFor` returns null, so nothing
      // is finalizable. Honest by existing construction — no new rule needed.
      !allQtysOk
        ? []
        : lines.map((l, i) => {
        const q = lineQtys[i] as Extract<GrLineQtyOutcome, { ok: true }>;
        const rejected = Math.max(0, q.received - q.accepted);
        const packaging: 'Pass' | 'Fail' | 'Pending' =
          l.packagingCheck === 'N/A' ? 'Pass' : l.packagingCheck;
        return {
          materialCode: l.materialCode,
          description: l.description,
          qtyExpected: l.qtyExpected,
          qtyReceived: q.received,
          qtyAccepted: q.accepted,
          qtyRejected: rejected,
          rejectionReason: rejected > 0 ? l.rejectionReason : undefined,
          labResultId: l.labRequestId,
          visualCheck: l.visualCheck,
          packagingCheck: packaging,
          halalSealCheck: l.halalSealCheck,
          bpomLotCheck: l.bpomLotCheck,
        };
      }),
    [lines, lineQtys, allQtysOk],
  );
  const derivedDisposition = useMemo<GrHeaderDisposition>(
    () => deriveHeaderDisposition(inspectionResults),
    [inspectionResults],
  );

  // A GUARD IS ONLY ASKABLE OF A VALUE THAT EXISTS (2f-a) — the third named site
  // of the IntakeAdjustDrawer C6-LOCK pattern, after rfqCreateModel.
  //
  // The three guards below are UNCHANGED and still individually correct. What
  // changed is that they can no longer be reached with a fabricated value: the
  // refusal short-circuits first, so a cleared field is refused rather than
  // silently satisfying all three (not negative, accepted <= received, no
  // rejection reason owed) and posting a receipt asserting nothing arrived.
  // Strictly stronger than adding a fourth blank-check, and it leaves the
  // existing rules alone.
  const receiptValid = lines.length > 0 && lines.every((l, i) => {
    const q = lineQtys[i];
    if (!q.ok) return false;
    if (q.received < 0 || q.accepted < 0) return false;
    if (q.accepted > q.received) return false;
    if (q.received - q.accepted > 0 && !l.rejectionReason.trim())
      return false;
    return true;
  });

  // ── CP-2 · 2B-4b — THE REGULATORY GATE, AND IT FAILS CLOSED ───────────────
  // A REGULATORY GATE THAT FAILS OPEN IS WORSE THAN ONE THAT FAILS LOUD. The
  // line this replaces read `if (l.bpomRequired && !l.bpomLotCheck)` over a
  // prefix-parsed boolean, so a material nobody had ruled on took the SAME path
  // as one ruled not-applicable: no row rendered, no check owed, receipt posts.
  //
  // Now an absent determination BLOCKS. `!l.bpom.ok` covers both refusals —
  // the master does not name the code, and the master names it and records no
  // determination — with ONE branch, so neither can be given a way through.
  //
  // ── CP-3 · `REQUIRED-OPENS-PRE-ANSWERED-01` — NOT A LINE CHANGED HERE ──────
  // ⚠️ **THIS BLOCK IS BYTE-IDENTICAL TO WHAT 2B-4b SHIPPED, AND THAT IS THE
  // FINDING.** The two clauses that make a required-and-unanswered check block
  // — `halalRequired && !halalSealCheck`, `bpom.applicable && !bpomLotCheck` —
  // were already here, already correct, and COULD NOT FIRE, because the draft
  // builders stamped an answer into every line they applied to. A gate is only
  // a gate over a value that can be absent. The fix was upstream, in the seed;
  // what changed at this line is that it can now say no.
  const qualityValid = lines.every((l) => {
    if (!l.visualCheck || !l.packagingCheck) return false;
    if (l.halalRequired && !l.halalSealCheck) return false;
    if (!l.bpom.ok) return false;
    if (l.bpom.applicable && !l.bpomLotCheck) return false;
    if (l.labSampleRequired && !l.labRequestId) return false;
    return true;
  });

  // A fully-Rejected rollup needs a reason (t_gr_reject requiredField); Approved
  // / Partially Approved don't. 'Pending' can't be finalized (uninspected line).
  const dispositionValid =
    derivedDisposition === 'Rejected'
      ? dispositionReason.trim().length > 0
      : derivedDisposition !== 'Pending';

  const isStepValid = (i: number): boolean => {
    if (i === 0) return sourceValid;
    if (i === 1) return receiptValid;
    if (i === 2) return qualityValid;
    if (i === 3) return dispositionValid;
    return true;
  };

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        if (patch.labSampleRequired === true && !next.labRequestId) {
          next.labRequestId = `LAB-2026-${String(100 + idx).padStart(3, '0')}`;
        }
        if (patch.labSampleRequired === false) {
          next.labRequestId = undefined;
        }
        return next;
      })
    );
  };

  const stepOneContent = (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSourceMode('shipment')}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
            sourceMode === 'shipment'
              ? 'border-action bg-action-soft text-action-hover'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          {t('goodsReceipt.wizard.source.selectDock')}
        </button>
        <button
          type="button"
          onClick={() => setSourceMode('manual')}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
            sourceMode === 'manual'
              ? 'border-action bg-action-soft text-action-hover'
              : 'border-border-input text-text-secondary hover:bg-bg-hover'
          }`}
        >
          {t('goodsReceipt.wizard.source.enterAsn')}
        </button>
      </div>

      {sourceMode === 'shipment' ? (
        <div className="border border-border-subtle rounded-lg divide-y divide-border-subtle">
          {sources.length === 0 && (
            <div className="p-4 text-sm text-text-tertiary">
              {t('goodsReceipt.wizard.source.empty')}
            </div>
          )}
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedSourceId(s.id);
                setLines(s.lines);
              }}
              className={`w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors ${
                selectedSourceId === s.id ? 'bg-action-soft' : 'hover:bg-bg-hover'
              }`}
            >
              <div>
                <div className="font-semibold text-text-primary">
                  <Data>{s.asnNumber}</Data>
                </div>
                <div className="text-xs text-text-tertiary">
                  <Data>{s.poNumber}</Data> · {s.supplierName}
                </div>
              </div>
              <div className="text-right text-xs text-text-secondary">
                <div>{s.dockLabel}</div>
                <div className="text-text-tertiary">{s.dockTime}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div>
            {labelFor(t('goodsReceipt.wizard.field.asnNumber'))}
            <input
              type="text"
              value={manualASN}
              onChange={(e) => setManualASN(e.target.value)}
              placeholder="ASN-2026-XXX"
              className={inputCls}
            />
          </div>
          {manualNotFound && (
            <p className="text-xs text-danger">
              {t('goodsReceipt.wizard.source.notFound')}
            </p>
          )}
          {manualAsnMatch && (
            <p className="text-xs text-success">
              {manualAsnMatch.asnNumber} · {manualAsnMatch.poReference} — {manualAsnMatch.status}. {t('goodsReceipt.wizard.source.readyToReceive')}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const stepTwoContent = (
    <div className="flex flex-col gap-5">
      <FormSection title={t('goodsReceipt.wizard.section.receiptInfo')}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            {labelFor(t('goodsReceipt.wizard.field.receivedDate'))}
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            {labelFor(t('goodsReceipt.wizard.field.receivedBy'))}
            <select
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            {labelFor(t('goodsReceipt.wizard.field.warehouseLocation'))}
            <select
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              className={inputCls}
            >
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            {labelFor(t('goodsReceipt.wizard.field.notes'))}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('goodsReceipt.wizard.placeholder.notes')}
              className={inputCls}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title={t('goodsReceipt.wizard.section.lineItems')}>
        {lines.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            {t('goodsReceipt.wizard.lines.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {lines.map((l, i) => {
              const qty = lineQtys[i];
              // Only ASKABLE of a readable pair — an unreadable line shows no
              // rejected figure rather than a product of a guessed value.
              const rejected = qty.ok ? Math.max(0, qty.received - qty.accepted) : null;
              return (
                <div
                  key={i}
                  className="border border-border-subtle rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <Data as="div" className="text-sm text-text-primary">
                        {l.materialCode}
                      </Data>
                      <div className="text-xs text-text-tertiary">
                        {l.description}
                      </div>
                    </div>
                    <div className="text-xs text-text-tertiary text-right">
                      {t('goodsReceipt.wizard.field.expected')}
                      <div className="font-semibold text-text-primary">
                        <Data>{formatNumber(l.qtyExpected)}</Data>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      {labelFor(t('goodsReceipt.wizard.field.received'))}
                      {/* Ruling 6.2, and load-bearing twice over here. A number
                          input REJECTS a comma-grouped token outright — "1,500"
                          leaves `.value` empty in en-US, no id-ID browser
                          required — and the empty string then took the `Number`
                          path to a silent zero that satisfied every guard.
                          `min` goes with the type: `received >= 0` is enforced
                          in `receiptValid`, where it is actually checked. */}
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={t('goodsReceipt.wizard.aria.received', { code: l.materialCode })}
                        aria-invalid={!qty.ok && qty.field === 'received'}
                        value={l.qtyReceivedRaw}
                        onChange={(e) =>
                          updateLine(i, { qtyReceivedRaw: e.target.value })
                        }
                        className={inputCls}
                      />
                      {!qty.ok && qty.field === 'received' && (
                        <div
                          role="alert"
                          data-testid={`gr-received-refusal-${i}`}
                          className="mt-1 text-[11px] text-danger"
                        >
                          {t(GR_QTY_REFUSAL_KEY[qty.reason])}
                        </div>
                      )}
                    </div>
                    <div>
                      {labelFor(t('goodsReceipt.wizard.field.accepted'))}
                      {/* `max` went with the type too — `accepted <= received`
                          is enforced in `receiptValid`. An input attribute that
                          vanishes with the type change was never the guarantee
                          (the 2e-b-4b precedent). */}
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={t('goodsReceipt.wizard.aria.accepted', { code: l.materialCode })}
                        aria-invalid={!qty.ok && qty.field === 'accepted'}
                        value={l.qtyAcceptedRaw}
                        onChange={(e) =>
                          updateLine(i, { qtyAcceptedRaw: e.target.value })
                        }
                        className={inputCls}
                      />
                      {!qty.ok && qty.field === 'accepted' && (
                        <div
                          role="alert"
                          data-testid={`gr-accepted-refusal-${i}`}
                          className="mt-1 text-[11px] text-danger"
                        >
                          {t(GR_QTY_REFUSAL_KEY[qty.reason])}
                        </div>
                      )}
                    </div>
                    <div>
                      {labelFor(t('goodsReceipt.wizard.field.rejected'))}
                      <div className="rounded-md border border-border-input bg-bg-hover px-3 py-2 text-sm text-text-secondary">
                        <Data>{rejected === null ? '—' : formatNumber(rejected)}</Data>
                      </div>
                    </div>
                    <div className="col-span-4">
                      {/* The reason field is only ASKABLE of a readable pair —
                          nobody can be asked to justify a rejection derived from
                          a quantity that does not exist. Same principle as the
                          receipt guard, applied to the surface. */}
                      {rejected !== null && rejected > 0 && (
                        <>
                          {labelFor(t('goodsReceipt.wizard.field.rejectionReason'))}
                          <textarea
                            rows={2}
                            aria-label={t('goodsReceipt.wizard.aria.rejectionReason', { code: l.materialCode })}
                            value={l.rejectionReason}
                            onChange={(e) =>
                              updateLine(i, {
                                rejectionReason: e.target.value,
                              })
                            }
                            placeholder={t('goodsReceipt.wizard.placeholder.rejectionReason')}
                            className={inputCls}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </FormSection>
    </div>
  );

  const stepThreeContent = (
    <FormSection eyebrow={t('goodsReceipt.wizard.section.qualityEyebrow')} title={t('goodsReceipt.wizard.section.perLineInspection')}>
      <div className="flex flex-col gap-4">
        {lines.map((l, i) => (
          <div
            key={i}
            className="border border-border-subtle rounded-md p-4 flex flex-col gap-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <Data as="div" className="text-sm text-text-primary">
                  {l.materialCode}
                </Data>
                <div className="text-xs text-text-tertiary">
                  {l.description}
                </div>
              </div>
              <div className="text-xs text-text-tertiary">
                <Data>
                  {lineQtys[i]?.ok ? formatNumber(lineQtys[i].received) : '—'}
                </Data>{' '}
                {t('goodsReceipt.wizard.receivedSuffix')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                {labelFor(t('goodsReceipt.wizard.field.visualInspection'))}
                <div className="flex gap-4">
                  {(['Pass', 'Fail'] as const).map((v) => (
                    <label key={v} className={radioCls}>
                      <input
                        type="radio"
                        name={`vis-${i}`}
                        value={v}
                        checked={l.visualCheck === v}
                        onChange={() => updateLine(i, { visualCheck: v })}
                      />
                      {el(v)}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                {labelFor(t('goodsReceipt.wizard.field.packagingIntegrity'))}
                <div className="flex gap-4">
                  {(['Pass', 'Fail', 'N/A'] as const).map((v) => (
                    <label key={v} className={radioCls}>
                      <input
                        type="radio"
                        name={`pkg-${i}`}
                        value={v}
                        checked={l.packagingCheck === v}
                        onChange={() => updateLine(i, { packagingCheck: v })}
                      />
                      {el(v)}
                    </label>
                  ))}
                </div>
              </div>
              {/* THE THREE STATES, and they are told apart by SHAPE:
                  · NOT REQUIRED           → no row at all
                  · REQUIRED, UNANSWERED   → row, nothing selected, marker
                  · REQUIRED, ANSWERED     → row, a selection, no marker
                  Neither check opens with an answer (`REQUIRED-OPENS-PRE-
                  ANSWERED-01`); both block `qualityValid` until ticked. */}
              {l.halalRequired && (
                <RegulatoryCheck
                  name={`halal-${i}`}
                  label={t('goodsReceipt.wizard.field.halalSealCheck')}
                  value={l.halalSealCheck}
                  onChange={(v) => updateLine(i, { halalSealCheck: v })}
                  el={el}
                  unansweredText={t('goodsReceipt.wizard.check.unanswered')}
                  testId={`gr-halal-unanswered-${i}`}
                />
              )}
              {l.bpom.ok && l.bpom.applicable && (
                <RegulatoryCheck
                  name={`bpom-${i}`}
                  label={t('goodsReceipt.wizard.field.bpomLotTracking')}
                  value={l.bpomLotCheck}
                  onChange={(v) => updateLine(i, { bpomLotCheck: v })}
                  el={el}
                  unansweredText={t('goodsReceipt.wizard.check.unanswered')}
                  testId={`gr-bpom-unanswered-${i}`}
                />
              )}
              {/* THE REFUSAL, BY NAME. Not a hidden row and not a skipped check:
                  the line says which material it cannot answer for and why, and
                  `qualityValid` will not let the wizard past this step. */}
              {!l.bpom.ok && (
                <div
                  data-testid={`gr-bpom-refusal-${i}`}
                  role="alert"
                  className="col-span-2 rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs text-warning-hover"
                >
                  <span className="font-semibold">
                    {t('goodsReceipt.wizard.bpom.refused.title')}
                  </span>{' '}
                  {t(GR_BPOM_REFUSAL_KEY[l.bpom.reason], {
                    code: l.bpom.materialCode,
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={l.labSampleRequired}
                  onChange={(e) =>
                    updateLine(i, { labSampleRequired: e.target.checked })
                  }
                />
                {t('goodsReceipt.wizard.labSampleRequired')}
              </label>
              {l.labSampleRequired && (
                <div className="text-xs text-text-secondary">
                  {t('goodsReceipt.wizard.labRequestId')}{' '}
                  <Data>{l.labRequestId}</Data>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </FormSection>
  );

  // Summed from the PARSED pairs, so the roll-up can never total a value the
  // guard refused. An unreadable line contributes nothing rather than a zero.
  const totals = useMemo(() => {
    return lineQtys.reduce(
      (acc, q) => ({
        items: acc.items + 1,
        accepted: acc.accepted + (q.ok ? q.accepted : 0),
        rejected: acc.rejected + (q.ok ? Math.max(0, q.received - q.accepted) : 0),
      }),
      { items: 0, accepted: 0, rejected: 0 }
    );
  }, [lineQtys]);

  const stepFourContent = (
    <div className="flex flex-col gap-5">
      <FormSection title={t('goodsReceipt.wizard.section.finalDisposition')}>
        <div>
          {labelFor(t('goodsReceipt.wizard.field.headerDisposition'))}
          <div
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
              derivedDisposition === 'Approved'
                ? 'border-success/40 bg-success-soft text-success'
                : derivedDisposition === 'Partially Approved'
                  ? 'border-warning/40 bg-warning-soft text-warning-hover'
                  : derivedDisposition === 'Rejected'
                    ? 'border-danger/40 bg-danger-soft text-danger'
                    : 'border-border-input bg-bg-hover text-text-secondary'
            }`}
          >
            {dispositionLabel(derivedDisposition)}
          </div>
          <p className="mt-1.5 text-xs text-text-tertiary">
            {totals.items === 1
              ? t('goodsReceipt.wizard.rollup.prefix.one', { count: totals.items })
              : t('goodsReceipt.wizard.rollup.prefix.other', { count: totals.items })}{' '}
            <Data>{formatNumber(totals.accepted)}</Data> {t('goodsReceipt.wizard.rollup.acceptedWord')}{' '}
            <Data>{formatNumber(totals.rejected)}</Data> {t('goodsReceipt.wizard.rollup.rejectedWord')}{' '}
            {t('goodsReceipt.wizard.rollup.notEditable')}
          </p>
        </div>

        {derivedDisposition === 'Rejected' && (
          <div>
            {labelFor(t('goodsReceipt.wizard.field.rejectionReasonRequired'))}
            <textarea
              rows={2}
              aria-label={t('goodsReceipt.wizard.aria.headerRejectionReason')}
              value={dispositionReason}
              onChange={(e) => setDispositionReason(e.target.value)}
              className={inputCls}
              placeholder={t('goodsReceipt.wizard.placeholder.fullLotRejection')}
            />
          </div>
        )}

        {(derivedDisposition === 'Approved' ||
          derivedDisposition === 'Partially Approved') && (
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={autoPostSap}
              onChange={(e) => setAutoPostSap(e.target.checked)}
            />
            {t('goodsReceipt.wizard.autoPostSap')}
          </label>
        )}

        <div>
          {labelFor(t('goodsReceipt.wizard.field.finalNotes'))}
          <textarea
            rows={2}
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            className={inputCls}
            placeholder={t('goodsReceipt.wizard.placeholder.optional')}
          />
        </div>
      </FormSection>

      <div className="border border-border-subtle rounded-lg p-4 bg-bg-hover grid grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-xs text-text-tertiary">{t('goodsReceipt.wizard.summary.totalItems')}</div>
          <div className="font-semibold text-text-primary"><Data>{totals.items}</Data></div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">{t('goodsReceipt.wizard.summary.totalAccepted')}</div>
          <div className="font-semibold text-success">
            <Data>{formatNumber(totals.accepted)}</Data>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">{t('goodsReceipt.wizard.summary.totalRejected')}</div>
          <div className="font-semibold text-danger">
            <Data>{formatNumber(totals.rejected)}</Data>
          </div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">{t('goodsReceipt.wizard.summary.sapDoc')}</div>
          <div className="text-xs text-text-secondary">
            {autoPostSap ? t('goodsReceipt.wizard.summary.assignedBySap') : t('goodsReceipt.wizard.summary.notPosted')}
          </div>
        </div>
      </div>
    </div>
  );

  const steps: WizardStep[] = [
    {
      id: 'source',
      title: t('goodsReceipt.wizard.step.source.title'),
      shortTitle: t('goodsReceipt.wizard.step.source.short'),
      description: t('goodsReceipt.wizard.step.source.desc'),
      content: stepOneContent,
    },
    {
      id: 'details',
      title: t('goodsReceipt.wizard.step.details.title'),
      shortTitle: t('goodsReceipt.wizard.step.details.short'),
      description: t('goodsReceipt.wizard.step.details.desc'),
      content: stepTwoContent,
    },
    {
      id: 'quality',
      title: t('goodsReceipt.wizard.step.quality.title'),
      shortTitle: t('goodsReceipt.wizard.step.quality.short'),
      description: t('goodsReceipt.wizard.step.quality.desc'),
      content: stepThreeContent,
    },
    {
      id: 'disposition',
      title: t('goodsReceipt.wizard.step.disposition.title'),
      shortTitle: t('goodsReceipt.wizard.step.disposition.short'),
      description: t('goodsReceipt.wizard.step.disposition.desc'),
      content: stepFourContent,
    },
  ];

  // Replaces the old client-side fabrication (GR-FABRICATION-01): the GR is
  // created, disposed, and posted through the dispatcher. The store assigns the
  // GR number; the header disposition is the ROLLUP the dispatcher re-derives
  // from the recorded lines; the SAP material document is assigned by SAP on
  // settlement — nothing is minted here.
  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);

    const asnReference = activeSource?.asnNumber ?? manualASN.trim();

    try {
      // 1) Create — the store assigns the number; lines are recorded at receipt.
      const createRes = await createGR.mutateAsync({
        asnReference,
        inspectionResults,
        receivedDate,
        receivedBy,
        notes: finalNotes || notes || undefined,
      });
      if (createRes.status === 'failed' || !createRes.entityId) {
        toast({
          variant: 'error',
          title: t('gr.create.failed.title'),
          // CP-2 · B1 — the UNDECLARED_MATERIAL refusal gets its own sentence
          // (the `MISSING_FIELDS` precedent below): "could not be created
          // (UNDECLARED_MATERIAL: …)" names the code but not what to DO.
          description: (createRes.reason ?? '').startsWith('UNDECLARED_MATERIAL')
            ? t('gr.create.failed.undeclared', { reason: createRes.reason ?? '' })
            : t('gr.create.failed.desc', { reason: createRes.reason ?? '' }),
        });
        return;
      }
      const grNumber = createRes.entityId;

      // 2) Finalize — dispatch the ROLLED-UP header verb (approve / partial /
      //    reject). The dispatcher re-derives the disposition from the stored
      //    lines, so the header is provably derived, not asserted.
      const dispo = derivedDisposition;
      const headerVerb = headerVerbFor(dispo);
      if (headerVerb) {
        const finalizeRes = await finalizeGR.mutateAsync({
          grId: grNumber,
          headerVerb,
          dispositionReason: dispositionReason || finalNotes || undefined,
        });
        if (finalizeRes.status === 'failed') {
          const missing = (finalizeRes.reason ?? '').startsWith('MISSING_FIELDS');
          toast({
            variant: 'warning',
            title: t('gr.dispose.failed.title', { grNumber }),
            description: missing
              ? t('gr.dispose.missingReason')
              : t('gr.dispose.failed.desc', { reason: finalizeRes.reason ?? '' }),
          });
          onComplete();
          return;
        }
      }

      // 3) Post to SAP (Option B) — only for an accepting rollup, when opted in.
      if (autoPostSap && (dispo === 'Approved' || dispo === 'Partially Approved')) {
        const postRes = await postGR.mutateAsync({ grId: grNumber });
        if (postRes.status === 'submitted') {
          // The async SAP callback settles: Posting to SAP → Posted to SAP +
          // the real material document (assigned on settle).
          await settleGR.mutateAsync({ correlationId: postRes.correlationId });
          toast({
            variant: 'success',
            title: t('gr.post.posted.title', { grNumber }),
            description: t('gr.post.posted.desc'),
          });
        } else {
          toast({
            variant: 'warning',
            title: t('gr.post.failed.title', { grNumber }),
            description: t('gr.post.failed.desc', { reason: postRes.reason ?? '' }),
          });
        }
      } else {
        toast({
          variant: 'success',
          title: t('gr.dispose.success.title', { grNumber, disposition: dispositionLabel(dispo) }),
          description: t('gr.dispose.success.desc', { correlationId: createRes.correlationId }),
        });
      }
      onComplete();
    } catch {
      toast({ variant: 'error', title: t('gr.denied.title'), description: t('gr.denied.desc') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(13,27,42,0.5)]">
      <Wizard
        steps={steps}
        currentStep={step}
        onStepChange={setStep}
        onCancel={onClose}
        onComplete={handleComplete}
        isStepValid={isStepValid}
        completeLabel={t('goodsReceipt.wizard.complete')}
      />
    </div>
  );
};

export default GRInspectionWizard;
