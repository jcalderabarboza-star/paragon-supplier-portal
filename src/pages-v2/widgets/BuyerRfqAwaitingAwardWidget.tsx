import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import ExpandableWidget from '../../components/ui-v2/ExpandableWidget';
import DataTable from '../../components/ui-v2/DataTable';
import Data from '../../components/ui-v2/Data';
import StatusPill from '../../components/ui-v2/StatusPill';
import RecordRowLink from './RecordRowLink';
import { statusTone } from '../../lib/statusTone';
import { formatDate } from '../../lib/format';
import { useRFQs, useQuotations } from '../../services/query/hooks';
import { awardPastDeadlineAt, pendingAwardRfqs, quoteCountByRfq } from './buyerDerivations';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';

// ─────────────────────────────────────────────────────────────────────────────
// Buyer sourcing — LIVE: RFQs with quotations in but not yet Awarded, read from
// the RFQ + quotation stores. The award is a decision, so the action routes to
// the sourcing board rather than auto-awarding.
//
// ── ⚠️ THE POPULATION IS `Open` OR `Closed`, AND THAT IS THE FLOW'S OWN RULE ─
// `t_rfq_award.from` is `['Open', 'Closed']` in `rfq.flow.ts`, so a CLOSED RFQ
// with quotations really is awaiting an award decision — closing the response
// window is not awarding it. Derived and pinned in `buyerWindows.test.tsx`
// against the registered flow, in both directions: nothing in this list is
// award-illegal from its state, and nothing award-legal-with-quotes is missing.
//
// ── THE DEADLINE IS JUDGED AT THE DECLARED PRESENT (FB-1, operator ruling) ──
// This window once showed `awardOverdue(pending, new Date())` as *"N past
// deadline"* while the sourcing events were unanchored, so the count was 9 of
// 9 and said nothing; the judgement was then withheld behind a note. The events
// have been anchored since SRC-2, so the note was stale: the count is back, read
// at the declared present by the rule a response deadline is read by, and
// `buyerWindows.test.tsx` holds that it names some events and not all of them.
// ─────────────────────────────────────────────────────────────────────────────
const BuyerRfqAwaitingAwardWidget: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rfqQuery = useRFQs();
  const quoteQuery = useQuotations();

  const pending = useMemo(
    () => pendingAwardRfqs(rfqQuery.data?.items ?? [], quoteQuery.data?.items ?? []),
    [rfqQuery.data, quoteQuery.data],
  );
  const quoteCounts = useMemo(
    () => quoteCountByRfq(quoteQuery.data?.items ?? []),
    [quoteQuery.data],
  );
  const count = pending.length;
  const late = useMemo(() => awardPastDeadlineAt(pending, DECLARED_PRESENT).length, [pending]);

  const expandedRows =
    count === 0 ? (
      <div className="text-sm text-text-tertiary">{t('widget.rfqAward.empty')}</div>
    ) : (
      <DataTable
        card={false}
        rows={pending}
        rowKey={(rfq) => rfq.id}
        rowProps={() => ({ className: 'relative' })}
        columns={[
          {
            id: 'rfq',
            header: t('widget.rfqAward.col.rfq'),
            kind: 'id',
            cell: (rfq) => (
              <RecordRowLink
                path="/buyer/sourcing"
                id={rfq.id}
                name={rfq.rfqNumber}
                label={<Data>{rfq.rfqNumber}</Data>}
              />
            ),
          },
          {
            id: 'title',
            header: t('widget.rfqAward.col.title'),
            kind: 'text',
            cell: (rfq) => rfq.title,
          },
          {
            id: 'quotes',
            header: t('widget.rfqAward.col.quotes'),
            kind: 'number',
            cell: (rfq) => <Data>{quoteCounts.get(rfq.id) ?? 0}</Data>,
          },
          {
            id: 'awardBy',
            header: t('widget.rfqAward.col.awardBy'),
            kind: 'date',
            cell: (rfq) => <Data>{formatDate(rfq.awardDeadline)}</Data>,
          },
          {
            id: 'status',
            header: t('widget.rfqAward.col.status'),
            kind: 'status',
            cell: (rfq) => <StatusPill variant={statusTone(rfq.status)}>{rfq.status}</StatusPill>,
          },
        ]}
      />
    );

  return (
    <ExpandableWidget
      title={t('widget.rfqAward.title')}
      icon={Gavel}
      count={count}
      capability="rfqs"
      flagSeverity={late > 0 ? 'warning' : count > 0 ? 'info' : 'none'}
      flagLabel={
        count === 0
          ? undefined
          : late > 0
            ? t('widget.rfqAward.flag.withLate', { count, late })
            : t('widget.rfqAward.flag.toAward', { count })
      }
      actionLabel={count > 0 ? t('widget.rfqAward.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/sourcing') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerRfqAwaitingAwardWidget;
