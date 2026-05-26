import type {
  IDiscoveryService,
  QueryScope,
  GlobalSupplier,
  RecommendedSupplier,
  QualificationItem,
  MarketIntelCard,
  SingleSourceItem,
} from '../types';

// All discovery fixtures still live inline in BuyerDiscovery.tsx.
// Batch 2 will relocate them under fixtures/.

export class MockDiscoveryService implements IDiscoveryService {
  async getGlobalSuppliers(_scope: QueryScope): Promise<GlobalSupplier[]> {
    return [];
  }
  async getRecommended(_scope: QueryScope): Promise<RecommendedSupplier[]> {
    return [];
  }
  async getQualifications(_scope: QueryScope): Promise<QualificationItem[]> {
    return [];
  }
  async getMarketIntel(_scope: QueryScope): Promise<MarketIntelCard[]> {
    return [];
  }
  async getSingleSourceItems(_scope: QueryScope): Promise<SingleSourceItem[]> {
    return [];
  }
}
