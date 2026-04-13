import React from 'react';

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 6,
};

const style = document.createElement('style');
style.textContent = `@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
if (!document.head.querySelector('[data-skeleton]')) {
  style.setAttribute('data-skeleton', '');
  document.head.appendChild(style);
}

export const SkeletonBox: React.FC<{ width?: string | number; height?: number; style?: React.CSSProperties }> = ({ width = '100%', height = 16, style: extra }) => (
  <div style={{ ...shimmer, width, height, ...extra }} />
);

export const SkeletonText: React.FC<{ lines?: number; lastWidth?: string }> = ({ lines = 3, lastWidth = '60%' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBox key={i} width={i === lines - 1 ? lastWidth : '100%'} height={14} />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonBox width={160} height={18} />
      <SkeletonBox width={60} height={24} style={{ borderRadius: 9999 }} />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonBox key={i} width={i % 2 === 0 ? '80%' : '60%'} height={14} />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => (
  <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
    <div style={{ background: '#0D1B2A', padding: '10px 12px', display: 'flex', gap: 16 }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} style={{ ...shimmer, height: 14, flex: 1, opacity: 0.3 }} />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ padding: '12px', display: 'flex', gap: 16, borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'white' : '#F8FAFC' }}>
        {Array.from({ length: cols }).map((_, j) => (
          <SkeletonBox key={j} width={j === 0 ? 120 : '100%'} height={14} />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonKpiRow: React.FC<{ tiles?: number }> = ({ tiles = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles}, 1fr)`, gap: 12 }}>
    {Array.from({ length: tiles }).map((_, i) => (
      <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderLeft: '4px solid #E2E8F0', borderRadius: 8, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBox width={80} height={11} />
        <SkeletonBox width={60} height={28} />
        <SkeletonBox width={100} height={11} />
      </div>
    ))}
  </div>
);

export const SkeletonDashboard: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SkeletonBox width={280} height={24} />
        <SkeletonBox width={200} height={14} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonBox width={120} height={36} style={{ borderRadius: 6 }} />
        <SkeletonBox width={120} height={36} style={{ borderRadius: 6 }} />
      </div>
    </div>
    <SkeletonBox width="100%" height={120} style={{ borderRadius: 10 }} />
    <SkeletonKpiRow tiles={4} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <SkeletonCard rows={4} />
      <SkeletonCard rows={4} />
    </div>
    <SkeletonTable rows={6} cols={5} />
  </div>
);

export default SkeletonBox;
