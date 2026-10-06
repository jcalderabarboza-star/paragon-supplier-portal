// ────────────────────────────────────────────────────────────────────────────
// SRC-2 · WHEN A QUOTATION MAY STILL BE MADE — the two day comparisons the
// submit hooks and the supplier's surface both read, so the form says before
// the act exactly what the machine will say at it.
//
// Day granularity, as `deliveryDayNotPast` (`policies.ts`): both sides are a
// `YYYY-MM-DD`, compared as strings, so no timezone can bend the answer.
// ────────────────────────────────────────────────────────────────────────────

const dayOf = (iso: string): string => iso.slice(0, 10);

const isDay = (value: string): boolean => /^\d{4}-\d{2}-\d{2}/.test(value);

/**
 * Has the event's response deadline gone? The deadline day itself is still
 * open: an event due on the 2nd takes quotations through the 2nd.
 */
export function responseDeadlinePassed(responseDeadline: string, todayIso: string): boolean {
  return dayOf(todayIso) > dayOf(responseDeadline);
}

/**
 * Is a stated validity already over? A quotation valid until today is still an
 * offer. A value that is not a date is refused with the past ones: a validity
 * nobody can read protects nobody.
 */
export function validityAlreadyPast(validUntil: string, todayIso: string): boolean {
  if (!isDay(validUntil)) return true;
  return dayOf(validUntil) < dayOf(todayIso);
}
