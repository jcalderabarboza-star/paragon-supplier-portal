import type { IDataService } from '../types';
import { MockSupplierService } from './MockSupplierService';
import { MockProcurementService } from './MockProcurementService';
import { MockRiskService } from './MockRiskService';
import { MockDiscoveryService } from './MockDiscoveryService';
import { MockAnalyticsService } from './MockAnalyticsService';
import { MockCollaborationService } from './MockCollaborationService';
import { MockDeliveryService } from './MockDeliveryService';
import { MockChaseService } from './MockChaseService';
import { MockCommandService } from './MockCommandService';
import { MockEnforcementService } from './MockEnforcementService';
import { capabilitiesFor } from '../../transitions';

// Shared instances so the chase service composes the SAME collaboration + delivery
// reads the rest of the app uses (the single SDC-5d composition point).
const collaboration = new MockCollaborationService();
const delivery = new MockDeliveryService();

export const mockDataService: IDataService = {
  suppliers: new MockSupplierService(),
  procurement: new MockProcurementService(),
  risk: new MockRiskService(),
  discovery: new MockDiscoveryService(),
  analytics: new MockAnalyticsService(),
  collaboration,
  delivery,
  chase: new MockChaseService(collaboration, delivery),
  enforcement: new MockEnforcementService(),
  commands: new MockCommandService(),
  getCapabilities: async (scope) => capabilitiesFor(scope),
};
