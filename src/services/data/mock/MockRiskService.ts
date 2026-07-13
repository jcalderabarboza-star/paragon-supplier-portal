import type {
  IRiskService,
  Page,
  QueryScope,
  RiskAlert,
  GeoRisk,
  ExposureRow,
  ComplianceRow,
  ComplianceRegistryEntry,
  Commodity,
  Scenario,
} from '../types';
import {
  ALERTS,
  GEO_RISKS,
  EXPOSURE_DATA,
  SCENARIO_ME,
  COMPLIANCE_DATA,
  COMMODITIES,
} from './fixtures/buyerRisk';
import { COMPLIANCE_REGISTRY } from './fixtures/complianceRegistry';

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
  async getScenarios(scope: QueryScope): Promise<Page<Scenario>> {
    // Only the Middle East scenario is fully modeled today; the picker in the
    // page lists the wider library. Additional modeled scenarios append here.
    return { items: bufferForBuyer(scope, [SCENARIO_ME]) };
  }
  async getCompliance(scope: QueryScope): Promise<Page<ComplianceRow>> {
    return { items: bufferForBuyer(scope, COMPLIANCE_DATA) };
  }
  async getComplianceRegistry(scope: QueryScope): Promise<Page<ComplianceRegistryEntry>> {
    // supplierId-keyed → per-supplier isolation; buyer sees the cross-supplier
    // superset. Unlike the legacy buyer-only `getCompliance`, a supplier reads
    // its OWN certs — the FK closes the name-vs-id split (HALAL-XPERSONA-01). The
    // rows are honestly synthetic (see the fixture header); UI liveness is
    // SIMULATED via the LivenessRegistry, not asserted here.
    const items =
      scope.personaType === 'buyer'
        ? [...COMPLIANCE_REGISTRY]
        : COMPLIANCE_REGISTRY.filter((e) => e.supplierId === scope.supplierId);
    return { items };
  }
  async getCommodities(scope: QueryScope): Promise<Page<Commodity>> {
    return { items: bufferForBuyer(scope, COMMODITIES) };
  }
}
