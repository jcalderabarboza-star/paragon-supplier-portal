import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';
import { mockAlerts } from '../../data/mockKpis';

const NAVY   = '#0D1B2A';
const BORDER = '#1E3A5F';
const TEAL   = '#0097A7';
const MUTED  = '#64748B';

const ParagonCorpLogo: React.FC<{ height?: number }> = ({ height = 32 }) => (
  <svg height={height} viewBox="0 0 160 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }}>
    <g transform="translate(0, 2)">
      <polygon points="16,0 28,8 24,28 8,28 4,8" fill="none" stroke="#5BA3E8" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="16,0 4,8 16,14" fill="rgba(91,163,232,0.18)" />
      <polygon points="16,0 28,8 16,14" fill="rgba(91,163,232,0.28)" />
      <polygon points="4,8 8,28 16,14" fill="rgba(91,163,232,0.10)" />
      <polygon points="28,8 24,28 16,14" fill="rgba(91,163,232,0.22)" />
      <polygon points="8,28 24,28 16,14" fill="rgba(91,163,232,0.14)" />
      <line x1="4" y1="8" x2="28" y2="8" stroke="#5BA3E8" strokeWidth="0.6" opacity="0.5" />
      <line x1="16" y1="0" x2="16" y2="14" stroke="#5BA3E8" strokeWidth="0.6" opacity="0.3" />
    </g>
    <text x="38" y="16" fontFamily="'Inter', -apple-system, sans-serif" fontSize="11" fontWeight="700" fill="#FFFFFF" letterSpacing="1.5">PARAGON</text>
    <text x="38" y="28" fontFamily="'Inter', -apple-system, sans-serif" fontSize="8.5" fontWeight="500" fill="#8DA4BC" letterSpacing="1.8">CORP</text>
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

  const initials     = persona === 'buyer' ? 'JC' : 'SK';
  const notifCount   = mockAlerts.unacknowledgedPOs;
  const personaIcon  = persona === 'buyer' ? '👔' : '🏭';
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ color: TEAL, fontWeight: 600, fontSize: '10px', letterSpacing: '1.5px', lineHeight: 1.2, textTransform: 'uppercase' }}>
            Supplier Portal
          </span>
          <OdysseyBadge />
        </div>
        <div style={{ width: 1, height: 28, background: BORDER, flexShrink: 0 }} />
        <span style={{ fontSize: '12px', color: MUTED, fontWeight: 400, letterSpacing: '0.2px' }}>
          {personaIcon} {personaLabel}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
