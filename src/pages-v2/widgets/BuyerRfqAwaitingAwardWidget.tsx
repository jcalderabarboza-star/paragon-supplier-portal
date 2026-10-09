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
import { pendingAwardRfqs, quoteCountByRfq } from './buyerDerivations';

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
// ── ⚠️ NO DEADLINE JUDGEMENT. THE FIGURE WAS SATURATED, NOT MERELY STALE ────
// This window used to show `awardOverdue(pending, new Date())` as *"N past
// deadline"*. `rfq` is NOT an anchored family, so every RFQ's award deadline
// sits behind the wall clock: measured, the count was **9 of 9** — the sentence
// was true of every row and therefore said nothing about any of them. The
// "Award by" DATE stays, because a date is a fact about the document; what is
// withheld is the judgement of that date against a clock the fixtures are not
// anchored to. The header says so, and it is a note rather than a control.
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
            cell: (rfq) => <span className="text-text-secondary">{rfq.title}</span>,
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
      // CLOCK-FREE severity: there are RFQs waiting on a person, or there are
      // not. The old ladder raised this to `warning` on the overdue count,
      // which was every row.
      flagSeverity={count > 0 ? 'info' : 'none'}
      flagLabel={
        count > 0
          ? `${t('widget.rfqAward.flag.toAward', { count })} · ${t('widget.rfqAward.held')}`
          : undefined
      }
      actionLabel={count > 0 ? t('widget.rfqAward.action') : undefined}
      onAction={count > 0 ? () => navigate('/buyer/sourcing') : undefined}
      expandedRows={expandedRows}
    />
  );
};

export default BuyerRfqAwaitingAwardWidget;
