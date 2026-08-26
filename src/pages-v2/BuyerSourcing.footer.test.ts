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

// ⚠️ **§68 TURNED THIS SUITE AROUND RATHER THAN DELETING IT.** It used to pin
// "Award is the one solid on this surface, and solid tracks the Award label
// exactly". DP2-BUTTON-01's reserved-solid register is retired portal-wide
// (operator ruling), so the claim inverts: EVERY state is outline, Award
// included. A control that stops holding is turned around, not dropped — this
// file is now the only thing that fails if a solid footer comes back here.
describe('FOOTER_VARIANT — §68: outline is the only register, Award included', () => {
  it('⚠️ THE AWARD STATE — the one that USED to be solid — is outline like the rest', () => {
    expect(FOOTER_VARIANT(rfq('Open', ['a', 'b'], ['a', 'b']))).toBe('outline');
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

  it('⚠️ NO state produces anything but outline — and the Award label still exists', () => {
    const states: RFQ[] = [
      rfq('Open', ['a', 'b'], ['a', 'b']), // Award
      rfq('Open', ['a', 'b'], ['a']), // Send reminder
      rfq('Awarded', ['a'], ['a']),
      rfq('Closed', ['a'], ['a']),
      rfq('Cancelled', ['a'], ['a']),
      rfq('Draft', [], []),
    ];
    for (const r of states) {
      expect(FOOTER_VARIANT(r)).toBe('outline');
    }
    // ⚠️ PAIRED, so the loop above is not vacuously true of a broken helper:
    // the Award STATE is still reachable and still labelled as the Award CTA.
    // What changed is only how it is painted — the polymorphic footer still
    // knows which verb it is offering.
    expect(FOOTER_LABEL(rfq('Open', ['a', 'b'], ['a', 'b']), echo)).toBe(AWARD_KEY);
    expect(FOOTER_LABEL(rfq('Open', ['a', 'b'], ['a']), echo)).not.toBe(AWARD_KEY);
  });
});
