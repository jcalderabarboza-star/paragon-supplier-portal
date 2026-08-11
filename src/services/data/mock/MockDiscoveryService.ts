import type {
  IDiscoveryService,
  Page,
  QueryScope,
  RecommendedSupplier,
  QualificationItem,
  MarketIntelCard,
  SingleSourceItem,
} from '../types';
import {
  RECOMMENDED,
  QUALIFICATIONS,
  MARKET_INTEL,
  SINGLE_SOURCE,
} from './fixtures/buyerDiscovery';

// Discovery / marketplace surface is buyer-side. Suppliers do not browse
// other suppliers — the service returns [] for the supplier persona.
function buyerOnly<T>(scope: QueryScope, rows: readonly T[]): T[] {
  return scope.personaType === 'buyer' ? [...rows] : [];
}

export class MockDiscoveryService implements IDiscoveryService {
  async getRecommended(scope: QueryScope): Promise<Page<RecommendedSupplier>> {
    return { items: buyerOnly(scope, RECOMMENDED) };
  }
  async getQualifications(scope: QueryScope): Promise<Page<QualificationItem>> {
    return { items: buyerOnly(scope, QUALIFICATIONS) };
  }
  async getMarketIntel(scope: QueryScope): Promise<Page<MarketIntelCard>> {
    return { items: buyerOnly(scope, MARKET_INTEL) };
  }
  async getSingleSourceItems(scope: QueryScope): Promise<Page<SingleSourceItem>> {
    return { items: buyerOnly(scope, SINGLE_SOURCE) };
  }
}
