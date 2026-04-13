import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Users, Package, Receipt, FileText, X } from 'lucide-react';
import { mockPurchaseOrders } from '../../data/mockPurchaseOrders';
import { mockSuppliers } from '../../data/mockSuppliers';
import { mockInventory } from '../../data/mockInventory';

const NAVY   = '#0D1B2A';
const TEAL   = '#0097A7';
const MUTED  = '#64748B';
const BORDER = '#E2E8F0';

interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  path: string;
  icon: React.ReactNode;
}

function fmtIDR(v: number): string {
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `Rp ${Math.round(v / 1_000_000)}jT`;
  return `Rp ${v.toLocaleString()}`;
}

function useSearchResults(query: string): SearchResult[] {
  return useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    mockPurchaseOrders
      .filter(po => po.poNumber.toLowerCase().includes(q) || po.supplierName.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(po => results.push({
        id: `po-${po.id}`, category: 'Purchase Orders',
        title: po.poNumber,
        subtitle: `${po.supplierName} · ${fmtIDR(po.totalValue)} · ${po.status}`,
        path: '/buyer/purchase-orders',
        icon: <ShoppingCart size={14} color={TEAL} />,
      }));

    mockSuppliers
      .filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(s => results.push({
        id: `sup-${s.id}`, category: 'Suppliers',
        title: s.name,
        subtitle: `${s.category} · ${s.city}, ${s.country} · Grade ${s.scorecardGrade}`,
        path: '/buyer/suppliers',
        icon: <Users size={14} color={TEAL} />,
      }));

    mockInventory
      .filter(i => i.materialCode.toLowerCase().includes(q) || i.materialDescription.toLowerCase().includes(q) || i.supplierName.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach(i => results.push({
        id: `inv-${i.id}`, category: 'Materials',
        title: i.materialCode,
        subtitle: `${i.materialDescription.slice(0, 50)} · ${i.daysOfSupply}d supply · ${i.stockStatus}`,
        path: '/buyer/inventory',
        icon: <Package size={14} color={TEAL} />,
      }));

    return results;
  }, [query]);
}
