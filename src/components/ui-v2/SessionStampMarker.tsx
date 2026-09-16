import React from 'react';
import { useTranslation } from 'react-i18next';
import { stampOrigin, type StampField } from '../../services/data/stampProvenance';
import { DECLARED_PRESENT } from '../../services/data/fixturePresent';
import { formatDate } from '../../lib/format';

// ────────────────────────────────────────────────────────────────────────────
// SessionStampMarker — the PER-VALUE honesty marker.
//
// ⚠️ **WHY THIS IS NOT `ProvenanceMarker` OR `LivenessPill`, WHICH WAS THE
// FIRST THING TRIED.** Both are CAPABILITY-scoped by construction and say so in
// their own headers: *"the only input is `capability`"*, *"there is no boolean a
// caller can pass to claim either one"*. They answer *is this FEED sample?* for
// a whole surface. The question here is a different one about a SINGLE STRING —
// *which clock wrote this value?* — and two values in the same table can
// legitimately disagree. Widening either precedent to take a per-value input
// would remove the exact property its header exists to state, so the honest
// move is a second, narrow marker rather than a weakened first one.
//
// **IT IS THE SECOND AXIS, NOT A REPLACEMENT.** Both surfaces already carry the
// capability marker (`SupplierDocuments` a `ProvenanceMarker`, `BuyerCompliance`
// a `LivenessPill`), and both keep it. That one says the data on the page is
// sample; this one says this particular stamp is not — it is the reader's own
// clock. A reader needs both sentences and they do not contradict.
//
// ⚠️ **HONEST BY CONSTRUCTION, THE PROPERTY COPIED FROM THE PRECEDENT.** The
// caller passes the document, the field and the value — facts it already holds —
// and NEVER the verdict. `stampOrigin` is looked up here. A page cannot assert
// that one of its own dates is real, and unwiring the derivation removes the
// marker rather than freezing it at a claim.
//
// ⚠️ **DELIBERATELY `info`, NOT AMBER AND NOT GREEN.** Green is reserved for
// `isLive` and this never satisfies it. Amber is the feed-sample token and would
// read as *this value is fake*, which is the opposite of true — a session stamp
// is the one genuinely live thing on the page. `info` is the neutral note the
// verb axis already uses for the same reason.
//
// ⚠️ **THE DECLARED PRESENT IS DERIVED AT RENDER, NEVER TYPED INTO THE COPY.**
// `formatDate(DECLARED_PRESENT)` — so the date in the sentence follows the
// constant and follows the locale, and a copy string can never be caught
// carrying an older present. `DECLARED_PRESENT` is a frozen literal that reads
// no clock, so this text is identical on every calendar day, which is what keeps
// both host surfaces inside `anchoredSurfaces.guard`.
//
// ⚠️ **WHAT THE COPY DOES NOT SAY, AND WHY THE OBVIOUS WORDING WAS REFUSED.**
// It does not say *"the rest of the portal is dated to the declared present"*.
// Measured, and by a property rather than by a remembered row: several seeded
// certificates on this very surface carry an `expiryDate` that lands AFTER the
// declared present — `doc-002`'s is the furthest of them — because an expiry is
// a HORIZON and belongs in the future. A sentence about the other rows on the
// page would therefore be FALSE on the very surface it appears on.
//
// ⚠️ **THE SPECIMEN MOVED ONCE ALREADY, WHICH IS WHY IT IS NAMED BY ITS
// PROPERTY.** This paragraph used to cite `doc-012`'s seeded refusal, an ACT
// INSTANT that had been carried past the present by its family's shift. That
// was a defect and it was repaired; the conclusion here survived it untouched,
// because horizon dates after `P` are the normal case and were the real reason
// all along. Re-derive the specimen (`expiryDate` later than `DECLARED_PRESENT`,
// on a row this page renders) rather than trusting this sentence.
// This claims only what it can vouch for: what THIS value is, and that the
// portal declares a fixed demonstration present. It makes no claim about the
// certificate — not validity, not scheme, not verification.
// ────────────────────────────────────────────────────────────────────────────

const SessionStampMarker: React.FC<{
  documentId: string;
  field: StampField;
  value: string;
  className?: string;
}> = ({ documentId, field, value, className = '' }) => {
  const { t } = useTranslation();
  if (stampOrigin(documentId, field, value) !== 'SESSION') return null;
  const note = t('widget.honesty.sessionStampNote', {
    date: formatDate(DECLARED_PRESENT),
  });
  return (
    <span
      className={`inline-flex items-center gap-1.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-info ${className}`}
      title={note}
      data-testid={`session-stamp-${field}-${documentId}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-sm bg-info" />
      {t('widget.honesty.sessionStamp')}
      <span className="sr-only"> — {note}</span>
    </span>
  );
};

export default SessionStampMarker;
