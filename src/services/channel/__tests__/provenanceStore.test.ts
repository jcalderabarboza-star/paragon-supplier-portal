import { describe, it, expect, afterEach } from 'vitest';
import { channelProvenanceStore } from '../provenanceStore';
import { makeProvenanceRef } from '../types';
import { openSubmissionSession } from '../../sdc';

afterEach(() => channelProvenanceStore.reset());

describe('C2 — channelProvenanceStore (append-only, empty seed)', () => {
  it('starts empty and appends immutably', () => {
    expect(channelProvenanceStore.all()).toHaveLength(0);
    const session = openSubmissionSession('ss-1', 'sup-007', '2026-08-25T12:00:00.000Z');
    session.attempt('InventoryDeclaration', 'inv-9001', 'corr-1');
    const before = channelProvenanceStore.all();
    channelProvenanceStore.append(makeProvenanceRef('cm-1', session.envelope()));
    expect(channelProvenanceStore.all()).not.toBe(before);
    expect(before).toHaveLength(0);
    expect(channelProvenanceStore.all()).toHaveLength(1);
    expect(channelProvenanceStore.forMessage('cm-1')).toEqual([
      { channelMessageId: 'cm-1', sessionId: 'ss-1', causationAnchor: 'corr-1' },
    ]);
  });

  it('reset() clears the log', () => {
    const session = openSubmissionSession('ss-2', 'sup-007', '2026-08-25T12:00:00.000Z');
    channelProvenanceStore.append(makeProvenanceRef('cm-2', session.envelope()));
    expect(channelProvenanceStore.all()).toHaveLength(1);
    channelProvenanceStore.reset();
    expect(channelProvenanceStore.all()).toHaveLength(0);
  });
});
