import type {
  IDiscoveryService,
  QueryScope,
  GlobalSupplier,
  RecommendedSupplier,
  QualificationItem,
  MarketIntelCard,
  SingleSourceItem,
} from '../types';
import {
  GLOBAL_SUPPLIERS,
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
  async getGlobalSuppliers(scope: QueryScope): Promise<GlobalSupplier[]> {
    return buyerOnly(scope, GLOBAL_SUPPLIERS);
  }
  async getRecommended(scope: QueryScope): Promise<RecommendedSupplier[]> {
    return buyerOnly(scope, RECOMMENDED);
  }
  async getQualifications(scope: QueryScope): Promise<QualificationItem[]> {
    return buyerOnly(scope, QUALIFICATIONS);
  }
  async getMarketIntel(scope: QueryScope): Promise<MarketIntelCard[]> {
    return buyerOnly(scope, MARKET_INTEL);
  }
  async getSingleSourceItems(scope: QueryScope): Promise<SingleSourceItem[]> {
    return buyerOnly(scope, SINGLE_SOURCE);
  }
}
