import { describe, it, expect } from 'vitest';
import { targetStatus, TARGET_STATUS } from './chartPalette';

// DP2-TARGET-01 guard: the ONE target-status system. Locks the meeting/near/
// missing thresholds and the state → colour map so the seven scattered target-
// bar systems can't creep back. `near` must be the DP2-WARN-01 amber split
// (bright fill #D97706 for the bar, dark #8A5606 for text on light).
describe('DP2-TARGET-01 — targetStatus thresholds', () => {
  it('at/above target is meeting', () => {
    expect(targetStatus(95, 95)).toBe('meeting');
    expect(targetStatus(100, 90)).toBe('meeting');
  });

  it('within the near band (default 10) below target is near', () => {
    expect(targetStatus(89, 90)).toBe('near');
    expect(targetStatus(80, 90)).toBe('near');
  });

  it('beyond the near band is missing', () => {
    expect(targetStatus(79, 90)).toBe('missing');
    expect(targetStatus(40, 75)).toBe('missing');
  });

  it('honours a custom near band', () => {
    expect(targetStatus(85, 95, 10)).toBe('near');
    expect(targetStatus(84, 95, 10)).toBe('missing');
  });
});

describe('DP2-TARGET-01 — state → colour map', () => {
  it('near is the DP2-WARN-01 amber split (bright fill, dark text)', () => {
    expect(TARGET_STATUS.near.fill).toBe('#D97706');
    expect(TARGET_STATUS.near.text).toBe('#8A5606');
  });

  it('meeting is success green, missing is danger red', () => {
    expect(TARGET_STATUS.meeting.fill).toBe('#107E3E');
    expect(TARGET_STATUS.missing.fill).toBe('#BB0000');
  });
});
