import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { RFQ, RFQStatus } from '../data/mockRfqs';
import { FOOTER_LABEL, FOOTER_VARIANT } from './BuyerSourcing';

// FOOTER_VARIANT reads only status + the invited/responded rosters. A minimal
// factory keeps the state matrix explicit and the arithmetic hand-verifiable.
const rfq = (
  status: RFQStatus,
  invited: string[],
  responded: string[],
): RFQ =>
  ({
    status,
    invitedSupplierIds: invited,
    respondedSupplierIds: responded,
  }) as RFQ;

// Echo the i18n key so label identity is assertable without a real bundle.
const echo = ((k: string) => k) as unknown as TFunction;
const AWARD_KEY = 'sourcing.footer.awardRfq';

describe('FOOTER_VARIANT — DP2-BUTTON-01: solid is the single reserved commit signal', () => {
  it('an Open RFQ with every invitee responded is the Award commit → solid primary', () => {
    expect(FOOTER_VARIANT(rfq('Open', ['a', 'b'], ['a', 'b']))).toBe('primary');
  });

  it('an Open RFQ still awaiting responses is Send-reminder → calm outline', () => {
    expect(FOOTER_VARIANT(rfq('Open', ['a', 'b'], ['a']))).toBe('outline');
  });

  it('an Open RFQ with no invitees is not "all responded" → outline (never solid)', () => {
    expect(FOOTER_VARIANT(rfq('Open', [], []))).toBe('outline');
  });

  it('View-award / View-report / Continue-draft states are all outline', () => {
    expect(FOOTER_VARIANT(rfq('Awarded', ['a'], ['a']))).toBe('outline');
    expect(FOOTER_VARIANT(rfq('Closed', ['a'], ['a']))).toBe('outline');
    expect(FOOTER_VARIANT(rfq('Cancelled', ['a'], ['a']))).toBe('outline');
    expect(FOOTER_VARIANT(rfq('Draft', [], []))).toBe('outline');
  });

  it('solid appears iff the label is the Award CTA (the two helpers never drift)', () => {
    const states: RFQ[] = [
      rfq('Open', ['a', 'b'], ['a', 'b']), // Award  → primary
      rfq('Open', ['a', 'b'], ['a']), // Send reminder → outline
      rfq('Awarded', ['a'], ['a']),
      rfq('Closed', ['a'], ['a']),
      rfq('Cancelled', ['a'], ['a']),
      rfq('Draft', [], []),
    ];
    for (const r of states) {
      const isSolid = FOOTER_VARIANT(r) === 'primary';
      const isAwardLabel = FOOTER_LABEL(r, echo) === AWARD_KEY;
      expect(isSolid).toBe(isAwardLabel);
    }
  });
});
