import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { PARAGON_TEAL, BACKGROUND } from '../../theme/fioriTheme';

const AppShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', borderTop: `3px solid ${PARAGON_TEAL}` }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', background: BACKGROUND }}>
        <Sidebar collapsed={collapsed} />
        <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: BACKGROUND }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
