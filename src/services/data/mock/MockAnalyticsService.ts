import type {
  IAnalyticsService,
  Page,
  QueryScope,
  AnalyticsSummary,
  SpendCategoryRow,
  TopSupplierSpend,
  MonthlyOtifRow,
  MonthlyPoRow,
  MonthlyChannelMix,
  AnalyticsPerfRow,
} from '../types';
import {
  ANALYTICS_SUMMARY,
  SPEND_CAT,
  TOP_SUPPLIERS,
  OTIF_DATA,
  PO_VOL_DATA,
  CHANNEL_DATA,
  PERF_TABLE,
} from './fixtures/buyerAnalytics';

// Analytics is a buyer-side portfolio view (spend, performance, channel mix
// across the whole supplier network). Suppliers do not see this surface — the
// service returns [] / null for the supplier persona.
function bufferForBuyer<T>(scope: QueryScope, rows: readonly T[]): T[] {
  return scope.personaType === 'buyer' ? [...rows] : [];
}

export class MockAnalyticsService implements IAnalyticsService {
  async getSummary(scope: QueryScope): Promise<AnalyticsSummary | null> {
    return scope.personaType === 'buyer' ? ANALYTICS_SUMMARY : null;
  }
  async getSpendByCategory(scope: QueryScope): Promise<Page<SpendCategoryRow>> {
    return { items: bufferForBuyer(scope, SPEND_CAT) };
  }
  async getTopSuppliers(scope: QueryScope): Promise<Page<TopSupplierSpend>> {
    return { items: bufferForBuyer(scope, TOP_SUPPLIERS) };
  }
  async getOtifTrend(scope: QueryScope): Promise<Page<MonthlyOtifRow>> {
    return { items: bufferForBuyer(scope, OTIF_DATA) };
  }
  async getPoVolumeTrend(scope: QueryScope): Promise<Page<MonthlyPoRow>> {
    return { items: bufferForBuyer(scope, PO_VOL_DATA) };
  }
  async getChannelMix(scope: QueryScope): Promise<Page<MonthlyChannelMix>> {
    return { items: bufferForBuyer(scope, CHANNEL_DATA) };
  }
  async getSupplierPerformance(scope: QueryScope): Promise<Page<AnalyticsPerfRow>> {
    return { items: bufferForBuyer(scope, PERF_TABLE) };
  }
}
