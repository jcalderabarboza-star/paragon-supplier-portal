import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveEnvBadge } from '../../lib/envBadge';
import LanguageMenu from './LanguageMenu';
import IdentityPanel from './IdentityPanel';

const TopBarV2: React.FC = () => {
  const { t } = useTranslation();
  const badge = resolveEnvBadge(
    import.meta.env.DEV,
    __DEPLOY_ENV__,
    typeof window !== 'undefined' ? window.location.hostname : undefined,
  );
  return (
    <header className="h-14 w-full bg-bg-surface border-b border-border-subtle flex items-center px-4 gap-4">
      {/* Left cluster */}
      <div className="flex items-center gap-3 min-w-0">
        {/* ⚠️ THE NAV TOGGLE IS GONE — H3. `AppShellV2` and `SidebarV2` hold no
            collapse state of any kind, so there was nothing for this control to
            toggle, and giving it one would have meant BUILDING a collapsible
            shell — which the H3 ruling forbids. The sidebar is always present;
            the control that implied it could be put away is not. */}
        <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
          {t('app.title')}
        </span>
        {badge && (
          <span
            className={`text-label px-2 py-0.5 rounded-full uppercase ${
              badge === 'PREVIEW'
                ? 'border border-dashed border-sample-border bg-sample-soft text-sample'
                : 'bg-bg-hover text-text-tertiary'
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Center search */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
          />
          <input
            type="search"
            placeholder={t('topbar.search')}
            className="w-full h-9 pl-9 pr-3 rounded-md bg-bg-hover text-sm text-text-primary placeholder:text-text-tertiary border border-transparent focus:outline-none focus:border-border-input focus:bg-bg-surface"
          />
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <LanguageMenu />
        {/* ⚠️ THE BELL IS GONE AND THE BADGE WITH IT — H3, and the badge is the
            more misleading half. There is no notification store, no notification
            route and no notification verb in this tree, so the button could not
            be wired to anything; the hardcoded `3` beside it was a VALUE claim —
            three unread somethings — that no data here supports.
            `deadAffordance.guard` convicts the button and states in its own reach
            block that it cannot see the count. Removing the control removes both,
            which is why this is GONE rather than an honest notice. */}
        {/* The avatar is now a PANEL, not a decoration: the current role and the
            scope it grants live here, because identity belongs with identity. */}
        <IdentityPanel />
      </div>
    </header>
  );
};

export default TopBarV2;
