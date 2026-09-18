import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { recordHref } from '../../lib/recordDeepLink';

// ─────────────────────────────────────────────────────────────────────────────
// A WINDOW ROW'S LINK TO ITS OWN RECORD.
//
// ⚠️ **A REAL ANCHOR, NOT AN `onClick` ON A ROW.** A `<tr onClick>` is invisible
// to the keyboard, invisible to "open in a new tab", and invisible to a screen
// reader's link list — it *looks* clickable to a mouse and is unreachable by
// everything else. The row keeps its table semantics and gains ONE link.
//
// ⚠️ **AND THE WHOLE ROW IS STILL THE TARGET.** The anchor sits in the first
// cell (the record's own identifier, which is what a reader would aim at) and
// stretches over the row with `after:absolute after:inset-0`, so the mouse
// target is the row while the accessibility tree sees a single named link.
// `TableRow` must therefore be `relative`; that is the caller's one obligation
// and the reason this component does not render the row itself.
//
// The accessible name is the RECORD, not "open" — a screen-reader link list of
// nine rows reading "Open, Open, Open" names nothing.
// ─────────────────────────────────────────────────────────────────────────────

const RecordRowLink: React.FC<{
  /** The list page the record lives on, e.g. `/buyer/invoices`. */
  path: string;
  /** The record's own id — what the destination page selects on. */
  id: string;
  /** What the reader sees and what the link is named after (a doc number). */
  label: React.ReactNode;
  /** The record name for the accessible label, when `label` is not a string. */
  name?: string;
  /**
   * ⚠️ **AN EXPLICIT DESTINATION, FOR A RECORD THAT HAS ITS OWN ROUTE.**
   *
   * `recordHref` builds `path?id=…` because this component was written for list
   * pages that select a row into a panel they already own. A few records are
   * not like that: a supplier has its OWN PAGE at `/buyer/suppliers/:id`, so
   * the query parameter would name a record the destination never reads.
   *
   * The accessibility contract — a real anchor, stretched over the row, named
   * after the record — is the SAME in both cases and is the whole reason this
   * component exists. So the destination is what varies, not the component: a
   * second row-link component would be two places for one rule about keyboards
   * and screen readers. `id` is still required and still names the link.
   */
  href?: string;
  className?: string;
}> = ({ path, id, label, name, href, className = '' }) => {
  const { t } = useTranslation();
  const record = name ?? (typeof label === 'string' ? label : id);
  return (
    <Link
      to={href ?? recordHref(path, id)}
      aria-label={t('widget.row.open', { record })}
      className={`after:absolute after:inset-0 hover:underline focus-visible:underline ${className}`}
    >
      {label}
    </Link>
  );
};

export default RecordRowLink;
