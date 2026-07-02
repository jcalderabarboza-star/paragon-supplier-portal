import type {
  IRiskService,
  Page,
  QueryScope,
  RiskAlert,
  GeoRisk,
  ExposureRow,
  ComplianceRow,
  Commodity,
} from '../types';
import {
  ALERTS,
  GEO_RISKS,
  EXPOSURE_DATA,
  COMPLIANCE_DATA,
  COMMODITIES,
} from './fixtures/buyerRisk';

// Risk fixtures are buyer-side aggregate views (geopolitical, exposure,
// compliance, commodity prices). Suppliers do not see this surface — the
// service returns [] for the supplier persona.
function bufferForBuyer<T>(scope: QueryScope, rows: readonly T[]): T[] {
  return scope.personaType === 'buyer' ? [...rows] : [];
}

export class MockRiskService implements IRiskService {
  async getRiskAlerts(scope: QueryScope): Promise<Page<RiskAlert>> {
    return { items: bufferForBuyer(scope, ALERTS) };
  }
  async getGeoRisks(scope: QueryScope): Promise<Page<GeoRisk>> {
    return { items: bufferForBuyer(scope, GEO_RISKS) };
  }
  async getExposure(scope: QueryScope): Promise<Page<ExposureRow>> {
    return { items: bufferForBuyer(scope, EXPOSURE_DATA) };
  }
  async getCompliance(scope: QueryScope): Promise<Page<ComplianceRow>> {
    return { items: bufferForBuyer(scope, COMPLIANCE_DATA) };
  }
  async getCommodities(scope: QueryScope): Promise<Page<Commodity>> {
    return { items: bufferForBuyer(scope, COMMODITIES) };
  }
}
