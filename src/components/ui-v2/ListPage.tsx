import React from 'react';
import AppShellV2 from '../layout-v2/AppShellV2';
import PageHeader from './PageHeader';
import PageMetaLine from './PageMetaLine';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1b · THE ONE LIST PAGE.
//
// A list page is the same six things in the same order on every module:
//
//   1  header    breadcrumb · title · subtitle, actions on the right
//   2  meta      the count / scope line
//   3  notices   what the reader must know before the figures
//   4  kpis      the figures, when the page has them
//   5  toolbar   status tabs · filters · search
//   6  content   the table(s) — `DataTable` — and whatever the page hangs off
//                them: drawers, dialogs, wizards
//
// The page supplies the parts; the ORDER and the spacing are here. A page that
// has no filters passes none, and nothing is drawn in their place.
//
// Header actions read left to right: secondary, export, then the one primary.
// ─────────────────────────────────────────────────────────────────────────────

export interface ListPageProps {
  /** Segments after the sidebar group, which `PageHeader` derives. */
  breadcrumb: string[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** The count and scope line. */
  meta?: React.ReactNode;
  notices?: React.ReactNode;
  /** `KpiCard`s. The grid is supplied here. */
  kpis?: React.ReactNode;
  /** The status tab row (`SubTabs` / `Tabs`). */
  tabs?: React.ReactNode;
  /** `FilterChipsBar`, selects. */
  filters?: React.ReactNode;
  /** `SearchBar`. */
  search?: React.ReactNode;
  children: React.ReactNode;
  testId?: string;
}

const ListPage: React.FC<ListPageProps> = ({
  breadcrumb,
  title,
  subtitle,
  actions,
  meta,
  notices,
  kpis,
  tabs,
  filters,
  search,
  children,
  testId,
}) => (
  <AppShellV2>
    <div data-testid={testId} data-list-page="">
      <PageHeader breadcrumb={breadcrumb} title={title} subtitle={subtitle} actions={actions} />
      {meta ? (
        <PageMetaLine className="-mt-6 mb-6">
          {meta}
        </PageMetaLine>
      ) : null}
      {notices ? <div className="mb-6 flex flex-col gap-3">{notices}</div> : null}
      {kpis ? <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{kpis}</div> : null}
      {tabs ? <div className="mb-5">{tabs}</div> : null}
      {filters ? <div className="mb-4 flex flex-wrap items-center gap-4">{filters}</div> : null}
      {search ? <div className="mb-4">{search}</div> : null}
      {children}
    </div>
  </AppShellV2>
);

export default ListPage;
