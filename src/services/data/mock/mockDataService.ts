import type { IDataService } from '../types';
import { MockSupplierService } from './MockSupplierService';
import { MockProcurementService } from './MockProcurementService';
import { MockRiskService } from './MockRiskService';
import { MockDiscoveryService } from './MockDiscoveryService';

export const mockDataService: IDataService = {
  suppliers: new MockSupplierService(),
  procurement: new MockProcurementService(),
  risk: new MockRiskService(),
  discovery: new MockDiscoveryService(),
};
