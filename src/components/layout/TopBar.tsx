import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';
import { mockAlerts } from '../../data/mockKpis';

const NAVY   = '#0D1B2A';
const BORDER = '#1E3A5F';
const TEAL   = '#0097A7';
const MUTED  = '#64748B';

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { persona } = usePersona();
  const [showNotifHint, setShowNotifHint] = useState(false);

  const initials    = persona === 'buyer' ? 'JC' : 'SK';
  const notifCount  = mockAlerts.unacknowledgedPOs;
  const personaIcon = persona === 'buyer' ? '👔' : '🏭';
  const personaLabel = persona === 'buyer' ? 'Buyer View' : 'Supplier View';

  return (
    <header style={{
      height: '56px',
      background: NAVY,
      borderBottom: `1px solid ${BORDER}`,
      boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>

      {/* LEFT — Chevron logo + brand text */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Chevron SVG symbol */}
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
          xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <polyline
            points="3,5 10,15 17,5"
            stroke={TEAL}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        {/* Brand text block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginLeft: '8px' }}>
          <span style={{
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.5px',
            lineHeight: 1.2,
          }}>
            PARAGON CORP
          </span>
          <span style={{
            color: TEAL,
            fontWeight: 500,
            fontSize: '9px',
            letterSpacing: '1.5px',
            lineHeight: 1.2,
            textTransform: 'uppercase',
          }}>
            SUPPLIER PORTAL
          </span>
          <span style={{
            color: MUTED,
            fontWeight: 400,
            fontSize: '8px',
            letterSpacing: '1px',
            lineHeight: 1.2,
            textTransform: 'uppercase',
          }}>
            ODYSSEY PROGRAM
          </span>
        </div>

        {/* Vertical divider */}
        <div style={{
          width: '1px',
          height: '28px',
          background: BORDER,
          margin: '0 20px',
          flexShrink: 0,
        }} />

        {/* Center breadcrumb */}
        <span style={{
          fontSize: '12px',
          color: MUTED,
          fontWeight: 400,
          letterSpacing: '0.2px',
        }}>
          {personaIcon} {personaLabel}
        </span>
      </div>

      {/* RIGHT — notification bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        {/* Notification bell */}
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => setShowNotifHint(h => !h)}
          title={`${notifCount} unacknowledged POs`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-6px',
              background: TEAL,
              color: 'white',
              borderRadius: '9999px',
              fontSize: '9px',
              fontWeight: 700,
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}>
              {notifCount}
            </span>
          )}
        </div>

        {/* User avatar */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: TEAL,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title={persona === 'buyer' ? 'James Chen (Buyer)' : 'Sri Kusuma (Supplier)'}
          onClick={() => navigate(persona === 'buyer' ? '/buyer/dashboard' : '/supplier/dashboard')}
        >
          <span style={{ color: 'white', fontWeight: 700, fontSize: '11px', letterSpacing: '0.03em' }}>
            {initials}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
