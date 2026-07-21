import type { IDataService } from '../types';
import { MockSupplierService } from './MockSupplierService';
import { MockProcurementService } from './MockProcurementService';
import { MockRiskService } from './MockRiskService';
import { MockDiscoveryService } from './MockDiscoveryService';
import { MockAnalyticsService } from './MockAnalyticsService';
import { MockEngagementService } from './MockEngagementService';
import { MockCollaborationService } from './MockCollaborationService';
import { MockDeliveryService } from './MockDeliveryService';
import { MockCommandService } from './MockCommandService';
import { capabilitiesFor } from '../../transitions';

export const mockDataService: IDataService = {
  suppliers: new MockSupplierService(),
  procurement: new MockProcurementService(),
  risk: new MockRiskService(),
  discovery: new MockDiscoveryService(),
  analytics: new MockAnalyticsService(),
  engagement: new MockEngagementService(),
  collaboration: new MockCollaborationService(),
  delivery: new MockDeliveryService(),
  commands: new MockCommandService(),
  getCapabilities: async (scope) => capabilitiesFor(scope),
};
