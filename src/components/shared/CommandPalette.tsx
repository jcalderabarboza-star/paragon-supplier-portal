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

const QUICK_ACTIONS = [
  { title: 'Purchase Orders', subtitle: 'View all active POs', path: '/buyer/purchase-orders', icon: <ShoppingCart size={14} color={TEAL} /> },
  { title: 'Supplier Directory', subtitle: 'Browse all suppliers', path: '/buyer/suppliers', icon: <Users size={14} color={TEAL} /> },
  { title: 'Inventory Visibility', subtitle: 'Check stock levels', path: '/buyer/inventory', icon: <Package size={14} color={TEAL} /> },
  { title: 'Invoices & Payment', subtitle: 'AP queue and approvals', path: '/buyer/invoices', icon: <Receipt size={14} color={TEAL} /> },
  { title: 'Compliance Tracker', subtitle: 'Halal · BPOM · ISO', path: '/buyer/compliance', icon: <FileText size={14} color={TEAL} /> },
];

const CommandPalette: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useSearchResults(query);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      const items = query.length >= 2 ? results : QUICK_ACTIONS;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, items.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') {
        const item = items[selectedIdx];
        if (item) { navigate(item.path); onClose(); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [query, results, selectedIdx, navigate, onClose]);

  const handleNavigate = (path: string) => { navigate(path); onClose(); };

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 900, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '580px', maxWidth: '90vw', background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', zIndex: 901, overflow: 'hidden' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <Search size={16} color={MUTED} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search POs, suppliers, materials, invoices..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: NAVY, fontFamily: 'inherit', background: 'transparent' }}
          />
          {query && <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: MUTED }}><X size={14} /></button>}
          <kbd style={{ background: '#F1F5F9', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '2px 6px', fontSize: 11, color: MUTED, fontFamily: 'inherit' }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          {query.length < 2 ? (
            <div>
              <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Quick Navigation</div>
              {QUICK_ACTIONS.map((action, i) => (
                <div key={action.path} onClick={() => handleNavigate(action.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', background: selectedIdx === i ? '#F0FDFA' : 'white', transition: 'background 0.1s' }}
                  onMouseEnter={() => setSelectedIdx(i)}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{action.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{action.title}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{action.subtitle}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 11, color: MUTED }}>→</div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 6 }}>No results for "{query}"</div>
              <div style={{ fontSize: 12, color: MUTED }}>Try searching for a PO number, supplier name, or material code</div>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div style={{ padding: '10px 16px 4px', fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{category}</div>
                {items.map((item, i) => {
                  const globalIdx = results.indexOf(item);
                  return (
                    <div key={item.id} onClick={() => handleNavigate(item.path)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', background: selectedIdx === globalIdx ? '#F0FDFA' : 'white', transition: 'background 0.1s' }}
                      onMouseEnter={() => setSelectedIdx(globalIdx)}>
                      <div style={{ width: 30, height: 30, borderRadius: 6, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle}</div>
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>→</div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '8px 16px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 16, fontSize: 11, color: MUTED }}>
          <span><kbd style={{ background: '#F1F5F9', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit' }}>↑↓</kbd> navigate</span>
          <span><kbd style={{ background: '#F1F5F9', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit' }}>↵</kbd> open</span>
          <span><kbd style={{ background: '#F1F5F9', border: `1px solid ${BORDER}`, borderRadius: 3, padding: '1px 5px', fontFamily: 'inherit' }}>ESC</kbd> close</span>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
