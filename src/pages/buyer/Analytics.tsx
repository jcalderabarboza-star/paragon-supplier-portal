import React from 'react';

const NAVY = '#0D1B2A';
const TEAL = '#0097A7';

const CARDS = [
  {
    icon: '📊',
    title: 'Spend Analytics',
    desc: 'Total spend by category, supplier, and time period',
  },
  {
    icon: '📈',
    title: 'Trend Analysis',
    desc: 'OTIF and OTDR trends with forecasting',
  },
  {
    icon: '🌍',
    title: 'Supplier Risk Map',
    desc: 'Geographic risk visualization across your supplier network',
  },
  {
    icon: '🤖',
    title: 'AI Insights',
    desc: 'Powered by ARIA — intelligent procurement recommendations',
  },
];

const Analytics: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: '20px', fontWeight: 600, color: NAVY, marginBottom: '4px' }}>
          Analytics &amp; Insights
        </div>
        <div style={{ fontSize: '13px', color: '#64748B' }}>
          Advanced procurement analytics — Phase 2
        </div>
      </div>

      {/* Coming soon cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {CARDS.map(card => (
          <div
            key={card.title}
            style={{
              background: 'white',
              border: '2px dashed #CBD5E1',
              borderRadius: '8px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{card.icon}</span>
            <div style={{ fontWeight: 700, fontSize: '15px', color: NAVY }}>{card.title}</div>
            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>{card.desc}</div>
            <span style={{
              marginTop: '4px',
              background: '#F1F5F9',
              color: '#64748B',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: '9999px',
              letterSpacing: '0.03em',
            }}>
              Coming in Phase 2
            </span>
          </div>
        ))}
      </div>

      {/* Info bar */}
      <div style={{
        background: '#E0F7FA',
        border: `1px solid ${TEAL}44`,
        borderRadius: '8px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        color: '#006064',
      }}>
        <span style={{ fontSize: '18px' }}>💡</span>
        <span>
          <strong>ARIA</strong> (Adaptive Replenishment &amp; Intelligence Agent) will power AI-driven
          insights in Phase 2 of the Paragon Odyssey Digital Transformation Program.
        </span>
      </div>
    </div>
  );
};

export default Analytics;
