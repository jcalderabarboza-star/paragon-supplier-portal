import React from 'react';
import TopBarV2 from './TopBarV2';
import SidebarV2 from './SidebarV2';

interface AppShellV2Props {
  children: React.ReactNode;
}

const AppShellV2: React.FC<AppShellV2Props> = ({ children }) => {
  return (
    <div className="h-screen flex flex-col bg-bg-page">
      <TopBarV2 />
      <div className="flex flex-1 overflow-hidden">
        <SidebarV2 />
        <main className="flex-1 overflow-auto bg-bg-page p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShellV2;
