import { describe, it, expect } from 'vitest';
import { pslNumber } from './pslNumber';

describe('pslNumber', () => {
  it('reads like every other document number', () => {
    expect(pslNumber('psl-008')).toBe('PSL-008');
    expect(pslNumber('psl-anchor-carrier')).toBe('PSL-ANCHOR-CARRIER');
  });
});
