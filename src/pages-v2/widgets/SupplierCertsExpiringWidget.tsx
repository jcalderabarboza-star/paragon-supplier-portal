import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileWarning } from 'lucide-react';
import ExpandableWidget, {
  type FlagSeverity,
} from '../../components/ui-v2/ExpandableWidget';
import Table from '../../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../../components/ui-v2/TableHeader';
import TableRow from '../../components/ui-v2/TableRow';
import TableCell from '../../components/ui-v2/TableCell';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import { formatDate } from '../../lib/format';
import { useDocuments } from '../../services/query/hooks';
import { documentDisplayState } from '../../services/data/documentDisplayState';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';

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

// Capability "supplierDocuments": backed by the supplierDocument flow, which is
// registered but author-unwired (F0.4 inert — no CommandTarget) → the
// LivenessRegistry derives SIMULATED → amber "Sample" pill. The expiry flag still
// derives honestly from the fixture's real document status.
// ⚠️ `|| d.status === 'Expired'` IS GONE BECAUSE THE UNION MEMBER IS.
// `'Expired'` was produced by nothing — 0 of 16 fixture rows, no function
// returning it, no transition reaching it — so this arm never once selected a
// document, and the `critical` severity and `withExpired` flag it fed were
// dead by construction rather than merely unused. Behaviour is unchanged:
// what was unreachable is now also unwritable.
//
// ── ⚠️ THE DIVERGENCE IS CLOSED, AND THE CLOCK WON ──────────────────────────
//   This widget used to ask the STATUS field what "expiring" means while
//   `SupplierDocuments.tsx` asked the CLOCK. Both surfaces now read
//   `documentExpiry(doc, now)`, so they cannot drift apart again — and
//   `critical` becomes reachable HONESTLY, by a count the projection can
//   actually produce, rather than by the union member #316 retired.
//
// ── ⚠️ THE EVIDENCE THIS BLOCK USED TO CITE IS RETIRED — QUOTED, NOT DELETED
//   RETIRED: *"They disagreed on 5 of 16 documents, in BOTH directions and on
//   the same screen: · doc-001 (MUI halal cert) stored 'Expiring Soon', expired
//   2026-05-15 · doc-202 stored 'Expiring Soon', expired 2026-08-19 · doc-005 /
//   doc-008 / doc-101 stored 'Valid' while genuinely inside the 180-day window
//   — so the widget OMITTED the three that needed renewing and advertised two
//   that were already dead."* And with it: *"`status` lost because it is the
//   stored clock literal law 0.5 forbids: it was typed once and has been
//   decaying ever since."*
//
//   ⚠️ **IT WAS TRUE WHEN TYPED AND FALSE THREE HOURS LATER, BY A COMMIT THAT
//   NEVER OPENED THIS FILE.** Written at `256f053` (2026-09-08 08:42 +0700);
//   falsified at `8c68d77` (11:34 +0700, FIXTURE-PRESENT-01 (d)), which shifted
//   the fixture to `DECLARED_PRESENT` at module load. The five ids and the
//   count of three still reproduce EXACTLY — off `DOCUMENTS_RAW`, the authored
//   literals, which no consumer reads. Against `DOCUMENTS`, the shifted export
//   this widget imports, **no row disagrees with the projection**. Derive it,
//   do not read it here: `fixturePresent.guard.test.ts` runs that comparison
//   every suite. No count is restated in this comment on purpose.
//
//   ⚠️ **AND THE FIX WAS STILL RIGHT — ITS REASON IS JUST WEAKER NOW.** Two
//   surfaces reading two different sources is a divergence WAITING to happen,
//   whether or not the fixture currently exhibits it; that is why this widget
//   reads the clock. What can no longer be claimed is that it RESCUED five
//   lying rows. `SupplierDocuments`' per-row badge and `SupplierDashboard`'s
//   badge and action label still read the stored literal, so the divergence is
//   closed for THIS widget and open on the tree.
//
//   ⚠️ **WHAT IS DELIBERATELY NOT CHANGED:** the stored `'Expiring Soon'`
//   literal stays in the fixture and in `SupplierDocumentStatus`. Retiring it is
//   the stored-states disposal, which is filed and not this batch's. Nothing
//   READS it for expiry any more, which is the whole of what was wrong.

const SupplierCertsExpiringWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useDocuments();
  // One clock read, captured once — the same shape the documents page uses, so
  // the two surfaces reckon against the same instant.
  const nowIso = TODAY;

  const { expired, expiring } = useMemo(() => {
    const items = query.data?.items ?? [];
    return {
      // ⚠️ ONTO THE SHARED CLASSIFIER, WHICH IS NOT A NO-OP EVEN THOUGH THIS
      // WIDGET WAS ALREADY COMPUTING. `documentExpiry` answers a pure clock
      // question and would call a REJECTED certificate `expiring` if its date
      // were near — the lifecycle half is invisible to it. This widget escaped
      // that only because nothing refused has a date today. Reading the same
      // function the other two surfaces read is what makes "all three agree"
      // a property rather than a coincidence.
      expired: items.filter((d) => documentDisplayState(d, nowIso) === 'expired'),
      expiring: items.filter((d) => documentDisplayState(d, nowIso) === 'expiring'),
    };
  }, [query.data, nowIso]);

  // Expired FIRST: a lapsed certificate is not a milder version of an expiring
  // one, and burying it under a "soon" heading is how doc-001 went unnoticed.
  const rows = useMemo(() => [...expired, ...expiring], [expired, expiring]);
  const count = rows.length;
  // `critical` is reachable again — not because the union member came back, but
  // because a COUNT the projection can produce now drives it.
  const severity: FlagSeverity =
    expired.length > 0 ? 'critical' : expiring.length > 0 ? 'warning' : 'none';
  const flagLabel =
    expired.length > 0
      ? t('widget.certsExpiring.flag.expired', { count: expired.length })
      : expiring.length > 0
        ? t('widget.certsExpiring.flag.expiring', { count: expiring.length })
        : undefined;

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">
        {t('widget.certsExpiring.empty')}
      </div>
    ) : (
      <Table>
        <TableHeader>
          <TableHeaderCell>{t('widget.certsExpiring.col.document')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.certsExpiring.col.expires')}</TableHeaderCell>
          <TableHeaderCell>{t('widget.certsExpiring.col.status')}</TableHeaderCell>
        </TableHeader>
        <tbody>
          {rows.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium text-text-primary">
                {doc.name}
              </TableCell>
              <TableCell className="whitespace-nowrap text-text-secondary">
                <Data>{doc.expiryDate ? formatDate(doc.expiryDate) : '—'}</Data>
              </TableCell>
              <TableCell>
                {/* The PROJECTED state, never `doc.status`. Rendering the stored
                    literal here is what let the widget label an already-expired
                    certificate as merely "Expiring Soon" — a hazard of the
                    SOURCE, not a count. The number that stood in this comment
                    (`116 days ago`) is retired: it was measured off the authored
                    fixture literals before `8c68d77` shifted them, and a sibling
                    comment written a day earlier said `84` for the same fact. */}
                {documentDisplayState(doc, nowIso) === 'expired' ? (
                  <StatusPill variant="danger">
                    {t('widget.certsExpiring.state.expired')}
                  </StatusPill>
                ) : (
                  <StatusPill variant="warning">
                    {t('widget.certsExpiring.state.expiring')}
                  </StatusPill>
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    );

  return (
    <ExpandableWidget
      title={t('widget.certsExpiring.title')}
      icon={FileWarning}
      count={count}
      capability="supplierDocuments"
      flagSeverity={severity}
      flagLabel={flagLabel}
      actionLabel={count > 0 ? t('widget.certsExpiring.action') : undefined}
      onAction={count > 0 ? () => navigate('/supplier/documents') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default SupplierCertsExpiringWidget;
