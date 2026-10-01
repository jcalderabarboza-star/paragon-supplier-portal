import React from 'react';
import { useTranslation } from 'react-i18next';
import TopBarV2 from './TopBarV2';
import SidebarV2 from './SidebarV2';
import { useRouteModuleOff } from '../../context/ModuleActivationContext';
import { ModuleOffNotice } from '../ui-v2/ModuleOffNotice';

interface AppShellV2Props {
  children: React.ReactNode;
}

const AppShellV2: React.FC<AppShellV2Props> = ({ children }) => {
  const { i18n } = useTranslation();
  // M1 — a page whose module, part or side is OFF renders READ-ONLY: this
  // banner above it, and every guarded verb slot on it swapped for the notice
  // (Design 5 §A.3). The page itself stays: an OFF module never hides a document.
  const routeOff = useRouteModuleOff();
  // Pages build `children` in their own render, so a language change (which
  // re-renders subscribers like TopBar/Sidebar) would NOT re-run a page body —
  // React bails on the referentially-equal children element. Keying <main> on
  // the active language remounts the page subtree on toggle, so locale-aware
  // format.ts output (dates, currency) flips app-wide even on pages not yet
  // migrated to useTranslation. Per-page key extraction refines this later.
  return (
    <div className="h-screen flex flex-col bg-bg-page">
      <TopBarV2 />
      <div className="flex flex-1 overflow-hidden">
        <SidebarV2 />
        <main key={i18n.language} className="flex-1 overflow-auto bg-bg-page p-8">
          {routeOff && <ModuleOffNotice off={routeOff} variant="banner" testId="module-off-banner" />}
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShellV2;
