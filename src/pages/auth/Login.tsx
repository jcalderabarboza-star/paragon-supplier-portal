import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersona } from '../../context/PersonaContext';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: NAVY,
  background: 'white',
  boxSizing: 'border-box',
  outline: 'none',
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setPersona } = usePersona();
  const [activeTab, setActiveTab] = useState<'buyer' | 'supplier'>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = () => {
    if (activeTab === 'buyer') {
      setPersona('buyer');
      navigate('/buyer/dashboard');
    } else {
      setPersona('supplier');
      navigate('/supplier/dashboard');
    }
  };

  const handleViewAsBuyer = () => {
    setPersona('buyer');
    navigate('/buyer/dashboard');
  };

  const handleViewAsSupplier = () => {
    setPersona('supplier');
    navigate('/supplier/dashboard');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: NAVY,
      padding: '2rem 1rem',
    }}>
      {/* Card */}
      <div style={{
        background: 'white',
        width: '100%',
        maxWidth: '400px',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Logo + brand */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: TEAL, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 12px',
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>P</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: NAVY, letterSpacing: '0.05em' }}>
            PARAGON CORP
          </div>
          <div style={{ color: TEAL, fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
            Supplier Portal
          </div>
          <div style={{ color: '#94A3B8', fontSize: '12px', fontStyle: 'italic', marginTop: '6px' }}>
            Portal Kolaborasi Pemasok
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '24px' }}>
          {([['buyer', 'Paragon Team'], ['supplier', 'Supplier Login']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? (tab === 'buyer' ? NAVY : TEAL) : '#94A3B8',
                borderBottom: activeTab === tab
                  ? `2px solid ${tab === 'buyer' ? NAVY : TEAL}`
                  : '2px solid transparent',
                marginBottom: '-1px',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
              Email
            </label>
            <input
              type="email"
              style={INPUT_STYLE}
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
              Password
            </label>
            <input
              type="password"
              style={INPUT_STYLE}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            />
          </div>

          <button
            onClick={handleSignIn}
            style={{
              width: '100%',
              padding: '11px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === 'buyer' ? NAVY : TEAL,
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginTop: '2px',
              letterSpacing: '0.02em',
            }}
          >
            Sign In
          </button>

          <div style={{ display: 'flex', justifyContent: activeTab === 'buyer' ? 'flex-end' : 'space-between', alignItems: 'center' }}>
            {activeTab === 'supplier' && (
              <button
                onClick={() => navigate('/register')}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  color: TEAL, fontSize: '12px', fontWeight: 500, fontFamily: 'inherit', padding: 0,
                }}
              >
                New supplier? Register here →
              </button>
            )}
            <button
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                color: '#94A3B8', fontSize: '12px', fontFamily: 'inherit', padding: 0,
              }}
              onClick={() => {}}
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap', fontWeight: 500 }}>Demo Mode</span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
        </div>

        {/* Demo buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleViewAsBuyer}
            style={{
              flex: 1, padding: '9px', border: `1.5px solid #CBD5E1`,
              borderRadius: '6px', background: 'white', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, color: NAVY,
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = NAVY)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#CBD5E1')}
          >
            👔 View as Buyer
          </button>
          <button
            onClick={handleViewAsSupplier}
            style={{
              flex: 1, padding: '9px', border: `1.5px solid #CBD5E1`,
              borderRadius: '6px', background: 'white', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, color: NAVY,
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = TEAL)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#CBD5E1')}
          >
            🏭 View as Supplier
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '24px', fontSize: '11px', color: '#475569', textAlign: 'center' }}>
        © 2026 PT Paragon Technology and Innovation. All rights reserved.
      </div>
    </div>
  );
};

export default Login;
