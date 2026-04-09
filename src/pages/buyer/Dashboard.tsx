import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockInventory } from '../../data/mockInventory';
import { mockTrendData, mockKpisByCategory } from '../../data/mockKpis';
import { POStatus, ChannelType } from '../../types/purchaseOrder.types';
import { StockStatus, ScorecardGrade } from '../../types/supplier.types';

const NAVY    = '#0D1B2A';
const NAVY2   = '#152236';
const TEAL    = '#0097A7';
const MID     = '#354A5F';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
const SUCCESS = '#107E3E';
const WARNING = '#E9730C';
const ERROR   = '#BB0000';
const INFO    = '#0A6ED1';

function useDerivedData() {
  return useMemo(() => {
    const pos = mockPurchaseOrders;
    const suppliers = mockSuppliers;
    const inventory = mockInventory;

    const openPOs = pos.filter(p => ![POStatus.CLOSED, POStatus.DELIVERED].includes(p.status));
    const unacknowledged = pos.filter(p => p.status === POStatus.SENT && p.acknowledgmentTimeHours > 48);
    const overduePOs = pos.filter(p => p.daysOverdue > 0);
    const totalSpend = pos.reduce((a, b) => a + b.totalValue, 0);
    const deliveredOnTime = pos.filter(p => p.status === POStatus.DELIVERED && p.daysOverdue <= 0).length;
    const delivered = pos.filter(p => p.status === POStatus.DELIVERED).length;
    const otif = delivered > 0 ? Math.round((deliveredOnTime / delivered) * 100) : 0;

    const poFunnel = [
      { status: 'Sent',       count: pos.filter(p => p.status === POStatus.SENT).length,               color: WARNING },
      { status: 'Viewed',     count: pos.filter(p => p.status === POStatus.VIEWED).length,              color: INFO },
      { status: "Ack'd",      count: pos.filter(p => p.status === POStatus.ACKNOWLEDGED).length,        color: '#5B21B6' },
      { status: 'Confirmed',  count: pos.filter(p => p.status === POStatus.CONFIRMED).length,           color: TEAL },
      { status: 'Part. Del.', count: pos.filter(p => p.status === POStatus.PARTIALLY_DELIVERED).length, color: INFO },
      { status: 'Delivered',  count: pos.filter(p => p.status === POStatus.DELIVERED).length,           color: SUCCESS },
      { status: 'Closed',     count: pos.filter(p => p.status === POStatus.CLOSED).length,              color: MUTED },
    ];

    const activeSuppliers = suppliers.filter(s => s.status === 'Active').length;
    const gradeD = suppliers.filter(s => s.scorecardGrade === ScorecardGrade.D || s.scorecardGrade === ScorecardGrade.F);
    const expiringCerts = suppliers.filter(s => {
      const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
      return days <= 180;
    });
    const expiredCerts = suppliers.filter(s => {
      const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
      return days <= 0;
    });
    const avgOTIF = Math.round(suppliers.reduce((a, b) => a + b.otif, 0) / suppliers.length);

    const channelCounts = pos.reduce((acc, p) => {
      acc[p.channel] = (acc[p.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const channelData = Object.entries(channelCounts).map(([name, value]) => ({ name, value }));

    const criticalStock = inventory.filter(i => i.stockStatus === StockStatus.CRITICAL);
    const lowStock = inventory.filter(i => i.stockStatus === StockStatus.LOW);

    const productionRisk = criticalStock.filter(item => {
      const hasCoveringPO = pos.some(p =>
        p.supplierId === item.supplierId &&
        [POStatus.SENT, POStatus.VIEWED, POStatus.ACKNOWLEDGED, POStatus.CONFIRMED].includes(p.status) &&
        p.lineItems.some(li => li.materialCode === item.materialCode)
      );
      return !hasCoveringPO;
    });

    const warRoomActive =
      productionRisk.length > 0 ||
      unacknowledged.length > 0 ||
      expiredCerts.length > 0 ||
      gradeD.length > 0 ||
      overduePOs.filter(p => p.daysOverdue > 30).length > 0;

    const actionQueue = [
      ...unacknowledged.map(p => ({
        id: p.id, type: 'PO Unacknowledged' as const,
        severity: 'critical' as const,
        title: `${p.poNumber} unacknowledged ${p.acknowledgmentTimeHours}h`,
        supplier: p.supplierName,
        detail: `Requested delivery: ${p.requestedDeliveryDate}`,
        path: '/buyer/purchase-orders',
      })),
      ...expiredCerts.map(s => ({
        id: s.id, type: 'Cert Expired' as const,
        severity: 'critical' as const,
        title: `${s.name} — cert expired`,
        supplier: s.name,
        detail: `Expired: ${s.certExpiryDate}`,
        path: '/buyer/suppliers',
      })),
      ...productionRisk.map(i => ({
        id: i.id, type: 'Production Risk' as const,
        severity: 'critical' as const,
        title: `${i.materialCode} — ${i.daysOfSupply}d supply left`,
        supplier: i.supplierName,
        detail: `No covering PO · ${i.materialDescription.slice(0, 40)}`,
        path: '/buyer/inventory',
      })),
      ...overduePOs.filter(p => p.daysOverdue > 0 && p.daysOverdue <= 30).map(p => ({
        id: p.id, type: 'PO Overdue' as const,
        severity: 'warning' as const,
        title: `${p.poNumber} ${p.daysOverdue}d overdue`,
        supplier: p.supplierName,
        detail: `Status: ${p.status}`,
        path: '/buyer/purchase-orders',
      })),
      ...expiringCerts.filter(s => {
        const days = (new Date(s.certExpiryDate).getTime() - Date.now()) / 86400000;
        return days > 0 && days <= 90;
      }).map(s => ({
        id: s.id + '-exp', type: 'Cert Expiring' as const,
        severity: 'warning' as const,
        title: `${s.name} — cert expiring soon`,
        supplier: s.name,
        detail: `Expires: ${s.certExpiryDate}`,
        path: '/buyer/suppliers',
      })),
    ];

    return {
      pos, openPOs, unacknowledged, overduePOs, totalSpend,
      otif, avgOTIF, activeSuppliers, gradeD, expiringCerts, expiredCerts,
      criticalStock, lowStock, productionRisk, poFunnel, channelData,
      warRoomActive, actionQueue,
    };
  }, []);
}
