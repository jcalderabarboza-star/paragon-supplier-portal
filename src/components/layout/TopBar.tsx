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

const ParagonCorpLogo: React.FC<{ height?: number }> = ({ height = 36 }) => (
  <svg height={height} viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }} aria-label="Paragon Technology and Innovation">
    {/* Icon — stylized P: vertical bar + half-circle arc */}
    <g transform="translate(2, 2)">
      {/* Outer circle */}
      <circle cx="18" cy="18" r="16" stroke="#0097A7" strokeWidth="2.5" fill="none" />
      {/* Vertical bar (spine of P) */}
      <rect x="10" y="7" width="3.5" height="22" rx="1.75" fill="#0097A7" />
      {/* Bowl of P — half disc */}
      <path d="M13.5 8 C13.5 8, 28 8, 28 18 C28 28, 13.5 28, 13.5 28" fill="none" stroke="#0097A7" strokeWidth="2.5" strokeLinecap="round" />
      {/* Inner accent dot */}
      <circle cx="21" cy="18" r="3" fill="#0097A7" opacity="0.3" />
    </g>
    {/* Wordmark — "paragon" */}
    <text x="44" y="18" fontFamily="'Inter', -apple-system, sans-serif" fontSize="14" fontWeight="700" fill="#FFFFFF" letterSpacing="1.2">paragon</text>
    {/* Subtitle */}
    <text x="44" y="30" fontFamily="'Inter', -apple-system, sans-serif" fontSize="6.5" fontWeight="500" fill="#8DA4BC" letterSpacing="2.2">TECHNOLOGY AND INNOVATION</text>
  </svg>
);

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
          <ParagonCorpLogo height={32} />
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
          onClick={() => setShowNotifHint(h => !h)}
          title={`${notifCount} unacknowledged POs`}>
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
