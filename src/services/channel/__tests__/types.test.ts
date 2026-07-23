import { describe, it, expect } from 'vitest';
import { makeProvenanceRef, type Channel, type ChannelMessage } from '../types';
import { openSubmissionSession } from '../../sdc';

describe('C1a — channel vocabulary', () => {
  it('a ChannelMessage carries the app-resolved binding, not a parsed identity', () => {
    const msg: ChannelMessage = {
      id: 'cm-001',
      channel: 'whatsapp',
      supplierId: 'sup-005',
      receivedAt: '2026-07-23T09:00:00.000Z',
      rawText: 'STOK MAT-10234 2.400 KG',
    };
    // supplierId is a field on the MESSAGE (the conversation binding), never
    // something the parser extracts from rawText.
    expect(msg.supplierId).toBe('sup-005');
    const channels: Channel[] = ['whatsapp', 'email', 'wechat'];
    expect(channels).toContain(msg.channel);
  });

  it('makeProvenanceRef points into sdc session ids (channel → sdc, one-way)', () => {
    const session = openSubmissionSession('sess-1', 'sup-005', '2026-07-23T09:00:00.000Z');
    session.attempt('InventoryDeclaration', 'inv-1', 'corr-abc');
    const ref = makeProvenanceRef('cm-001', session.envelope());
    expect(ref).toEqual({
      channelMessageId: 'cm-001',
      sessionId: 'sess-1',
      causationAnchor: 'corr-abc',
    });
  });

  it('a session with no attempt yet yields a null causationAnchor, not a blank string', () => {
    const session = openSubmissionSession('sess-2', 'sup-005', '2026-07-23T09:00:00.000Z');
    const ref = makeProvenanceRef('cm-002', session.envelope());
    expect(ref.causationAnchor).toBeNull();
  });
});
