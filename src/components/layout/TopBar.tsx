import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';
import { mockAlerts } from '../../data/mockKpis';
import { SHELL_BG, SHELL_BORDER, PARAGON_TEAL } from '../../theme/fioriTheme';

const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const { persona } = usePersona();
  const [showNotifHint, setShowNotifHint] = useState(false);

  const initials = persona === 'buyer' ? 'JC' : 'SK';
  const notifCount = mockAlerts.unacknowledgedPOs;

  return (
    <header style={{
      height: '56px',
      background: SHELL_BG,
      borderBottom: `1px solid ${SHELL_BORDER}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Left: Logo + brand name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Teal circle "P" logo */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: PARAGON_TEAL, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '16px', lineHeight: 1 }}>P</span>
        </div>

        {/* Brand text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '14px', lineHeight: 1.1, letterSpacing: '0.01em' }}>
            PARAGON CORP
          </span>
          <span style={{ color: PARAGON_TEAL, fontSize: '10px', letterSpacing: '1px', lineHeight: 1.1, fontWeight: 500 }}>
            SUPPLIER PORTAL
          </span>
        </div>
      </div>

      {/* Right: notification bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Notification bell */}
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => setShowNotifHint(h => !h)}
          title={`${notifCount} unacknowledged POs`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: '-5px', right: '-6px',
              background: PARAGON_TEAL, color: 'white',
              borderRadius: '9999px', fontSize: '9px', fontWeight: 700,
              minWidth: '16px', height: '16px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            }}>
              {notifCount}
            </span>
          )}
        </div>

        {/* User avatar */}
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: PARAGON_TEAL, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
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
