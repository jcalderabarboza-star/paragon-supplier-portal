import type {
  IEngagementService,
  Page,
  QueryScope,
  EngagementSummary,
  Conversation,
  ChatMessage,
  AutomationRule,
  DailyMessageRow,
  RuleRate,
  ResponseRow,
} from '../types';
import {
  ENGAGEMENT_SUMMARY,
  CONVERSATIONS,
  BERLINA_THREAD,
  OTHER_THREADS,
  AUTOMATION_RULES,
  DAILY_MSGS,
  RULE_RATES,
  RESPONSE_TABLE,
} from './fixtures/buyerWhatsApp';

// Engagement is the buyer-side comms bus (conversations span the whole supplier
// network). Suppliers do not see this surface — the service returns [] / null
// for the supplier persona.
function bufferForBuyer<T>(scope: QueryScope, rows: readonly T[]): T[] {
  return scope.personaType === 'buyer' ? [...rows] : [];
}

export class MockEngagementService implements IEngagementService {
  async getSummary(scope: QueryScope): Promise<EngagementSummary | null> {
    return scope.personaType === 'buyer' ? ENGAGEMENT_SUMMARY : null;
  }
  async getConversations(scope: QueryScope): Promise<Page<Conversation>> {
    return { items: bufferForBuyer(scope, CONVERSATIONS) };
  }
  async getConversationThread(
    scope: QueryScope,
    conversationId: string,
  ): Promise<Page<ChatMessage>> {
    if (scope.personaType !== 'buyer') return { items: [] };
    const thread =
      conversationId === 'wa-001'
        ? BERLINA_THREAD
        : OTHER_THREADS[conversationId] ?? [];
    return { items: [...thread] };
  }
  async getAutomationRules(scope: QueryScope): Promise<Page<AutomationRule>> {
    return { items: bufferForBuyer(scope, AUTOMATION_RULES) };
  }
  async getDailyMessages(scope: QueryScope): Promise<Page<DailyMessageRow>> {
    return { items: bufferForBuyer(scope, DAILY_MSGS) };
  }
  async getRuleRates(scope: QueryScope): Promise<Page<RuleRate>> {
    return { items: bufferForBuyer(scope, RULE_RATES) };
  }
  async getResponseTimes(scope: QueryScope): Promise<Page<ResponseRow>> {
    return { items: bufferForBuyer(scope, RESPONSE_TABLE) };
  }
}
