import type {
  IRiskService,
  QueryScope,
  RiskAlert,
  GeoRisk,
  ExposureRow,
  ComplianceRow,
  Commodity,
} from '../types';

// All risk fixtures still live inline in BuyerRisk.tsx / BuyerCompliance.tsx.
// Batch 2 will relocate them under fixtures/.

export class MockRiskService implements IRiskService {
  async getRiskAlerts(_scope: QueryScope): Promise<RiskAlert[]> {
    return [];
  }
  async getGeoRisks(_scope: QueryScope): Promise<GeoRisk[]> {
    return [];
  }
  async getExposure(_scope: QueryScope): Promise<ExposureRow[]> {
    return [];
  }
  async getCompliance(_scope: QueryScope): Promise<ComplianceRow[]> {
    return [];
  }
  async getCommodities(_scope: QueryScope): Promise<Commodity[]> {
    return [];
  }
}
