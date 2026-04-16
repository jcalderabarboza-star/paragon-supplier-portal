import React, { useState, useEffect } from 'react';
import CommandPalette from '../shared/CommandPalette';
import { useNavigate } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';
import { mockAlerts } from '../../data/mockKpis';

const NAVY   = '#0D1B2A';
const BORDER = '#1E3A5F';
const TEAL   = '#0097A7';
const MUTED  = '#64748B';

const responsiveStyle = document.createElement('style');
responsiveStyle.textContent = `
  @media (max-width: 900px) {
    .topbar-portal-label { display: none !important; }
  }
  @media (max-width: 700px) {
    .topbar-persona { display: none !important; }
  }
`;
if (!document.head.querySelector('[data-topbar-responsive]')) {
  responsiveStyle.setAttribute('data-topbar-responsive', '');
  document.head.appendChild(responsiveStyle);
}


const OdysseyBadge: React.FC = () => (
  <svg height="20" viewBox="0 0 88 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="6"  cy="10" r="4.5" stroke="#0097A7" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="10" r="4.5" stroke="#8DA4BC" strokeWidth="1.5" fill="none" />
    <rect x="8" y="5.5" width="4" height="9" fill="#0D1B2A" />
    <line x1="8" y1="5.5"  x2="12" y2="5.5"  stroke="#0097A7" strokeWidth="1.5" />
    <line x1="8" y1="14.5" x2="12" y2="14.5" stroke="#8DA4BC" strokeWidth="1.5" />
    <text x="22" y="14" fontFamily="'Inter', -apple-system, sans-serif" fontSize="10" fontWeight="700" fill="#CBD5E1" letterSpacing="2.5">ODYSSEY</text>
  </svg>
);

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { persona } = usePersona();
  const [showNotifHint, setShowNotifHint] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && e.target === document.body) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const initials     = persona === 'buyer' ? 'JC' : 'SK';
  const notifCount   = mockAlerts.unacknowledgedPOs;
  const personaIcon  = persona === 'buyer' ? 'i' : 'i';
  const personaLabel = persona === 'buyer' ? 'Buyer View' : 'Supplier View';

  return (
    <header style={{
      height: '56px', background: NAVY, borderBottom: `1px solid ${BORDER}`,
      boxShadow: '0 1px 0 rgba(255,255,255,0.04)', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={() => navigate(persona === 'buyer' ? '/buyer/dashboard' : '/supplier/dashboard')}>
          <span style={{
            color: 'white',
            fontWeight: 500,
            fontSize: '15px',
            letterSpacing: '3.5px',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}>
            PARAGONCORP
          </span>
        </div>
        <div style={{ width: 1, height: 28, background: BORDER, flexShrink: 0 }} />
        <div className="topbar-portal-label" style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ color: TEAL, fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', lineHeight: 1.2, textTransform: 'uppercase' }}>
            Supplier Portal
          </span>
          <OdysseyBadge />
        </div>
        <div className="topbar-portal-label" style={{ width: 1, height: 28, background: BORDER, flexShrink: 0 }} />
        <span className="topbar-persona" style={{ fontSize: '12px', color: MUTED, fontWeight: 400, letterSpacing: '0.2px' }}>
          {personaIcon} {personaLabel}
        </span>
      </div>

      {showSearch && <CommandPalette onClose={() => setShowSearch(false)} />}

      {/* RIGHT — search + notification bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => setShowSearch(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', color: '#8DA4BC', fontSize: 12, fontFamily: 'inherit' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="#8DA4BC" strokeWidth="1.2"/><line x1="8.5" y1="8.5" x2="12" y2="12" stroke="#8DA4BC" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span>Search</span>
          <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '1px 5px', fontSize: 10, fontFamily: 'inherit', color: '#64748B' }}>/</kbd>
        </button>
        <div style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => setShowNotifHint(h => !h)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: '-5px', right: '-6px',
              background: TEAL, color: 'white', borderRadius: '9999px',
              fontSize: '9px', fontWeight: 700, minWidth: '16px', height: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            }}>{notifCount}</span>
          )}
          {showNotifHint && (
            <div style={{ position: 'absolute', top: 32, right: -8, width: 320, background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 500, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ background: '#0D1B2A', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Notifications</span>
                <span style={{ background: '#0097A7', color: 'white', borderRadius: 9999, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{notifCount} new</span>
              </div>
              {[
                { icon: '⚠', color: '#BB0000', bg: '#FEE2E2', title: 'PO unacknowledged >48h', sub: 'PO-2025-00103 · Zhejiang NHU · Rp 540jT', path: '/buyer/purchase-orders', time: '2h ago' },
                { icon: '📄', color: '#E9730C', bg: '#FEF3C7', title: 'PR pending approval', sub: 'PR-2026-00344 · Halal Glycerin · Rp 43jT', path: '/buyer/purchase-requisition', time: '4h ago' },
                { icon: '🔔', color: '#E9730C', bg: '#FEF3C7', title: 'Certificate expiring in 70 days', sub: 'Firmenich Malaysia · ISO 9001:2015', path: '/buyer/compliance', time: '1d ago' },
              ].map((n, i) => (
                <div key={i} style={{ padding: '12px 14px', borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', background: 'white' }}
                  onClick={() => { setShowNotifHint(false); }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0D1B2A', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{n.sub}</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.time}</div>
                </div>
              ))}
              <div style={{ padding: '8px 14px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0' }}>
                <button style={{ width: '100%', background: 'none', border: 'none', color: '#0097A7', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  onClick={() => setShowNotifHint(false)}>
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', background: TEAL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}
          title={persona === 'buyer' ? 'James Chen (Buyer)' : 'Sri Kusuma (Supplier)'}
          onClick={() => navigate(persona === 'buyer' ? '/buyer/dashboard' : '/supplier/dashboard')}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '11px', letterSpacing: '0.03em' }}>
            {initials}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
