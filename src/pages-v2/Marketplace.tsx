import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe2, Users, FileText, Clock, ArrowUpRight } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import KpiCard from '../components/ui-v2/KpiCard';
import SearchBar from '../components/ui-v2/SearchBar';
import SupplierCard from '../components/ui-v2/SupplierCard';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import { useSuppliers } from '../services/query/hooks';

const MARKETPLACE_CRUMB = ['ACQUIRE', 'MARKETPLACE'];

const CATEGORIES = [
  'Active Ingredients',
  'Natural & Botanical',
  'Surfactants & Emulsifiers',
  'Fragrance & Aroma',
  'Halal Emulsifiers',
  'Preservatives',
  'Primary Packaging',
  'Secondary Packaging',
  'Labels & Print',
  'Sustainable Packaging',
  'Testing & Certification',
  'Contract Manufacturing',
];

const OPEN_RFQS = [
  {
    num: 'RFQ-2026-002',
    material: 'PET Bottle 100ml Airless Pump',
    qty: '50,000 PCS',
    deadline: 'Apr 15',
  },
  {
    num: 'RFQ-2026-004',
    material: 'Givaudan Floral Accord Wardah',
    qty: '100 KG',
    deadline: 'Apr 18',
  },
  {
    num: 'RFQ-2026-008',
    material: 'Folding Carton 180gsm Emina',
    qty: '150,000 PCS',
    deadline: 'Apr 20',
  },
];

const Marketplace: React.FC = () => {
  const navigate = useNavigate();
  const suppliersQuery = useSuppliers();
  const suppliers = suppliersQuery.data?.items ?? [];
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const countries = new Set(suppliers.map((s) => s.country));
    return {
      total: suppliers.length,
      countries: countries.size,
      activeRfqs: OPEN_RFQS.length,
    };
  }, [suppliers]);

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (
        selectedCats.length > 0 &&
        !selectedCats.includes(s.category)
      )
        return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          `${s.name} ${s.category} ${s.country} ${s.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, selectedCats, search]);

  const toggleCat = (cat: string) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  if (suppliersQuery.isPending)
    return <LoadingState breadcrumb={MARKETPLACE_CRUMB} />;
  if (suppliersQuery.isError)
    return (
      <ErrorState
        breadcrumb={MARKETPLACE_CRUMB}
        error={suppliersQuery.error}
        onRetry={() => suppliersQuery.refetch()}
      />
    );
  if (suppliers.length === 0)
    return (
      <EmptyState
        breadcrumb={MARKETPLACE_CRUMB}
        title="No suppliers in the marketplace"
        subtitle="The marketplace directory is empty for this view."
        message="Vetted suppliers will appear here once they join the network."
      />
    );

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={MARKETPLACE_CRUMB}
        title="Global Supplier Marketplace"
        subtitle="Discover and connect with vetted suppliers worldwide."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <KpiCard
          eyebrow="Total Suppliers"
          value={stats.total.toString()}
          subtitle="Vetted on the network"
          icon={Users}
        />
        <KpiCard
          eyebrow="Countries Covered"
          value={stats.countries.toString()}
          subtitle="Across APAC + EMEA"
          icon={Globe2}
        />
        <KpiCard
          eyebrow="Active RFQs"
          value={stats.activeRfqs.toString()}
          subtitle="Open for response"
          icon={FileText}
        />
        <KpiCard
          eyebrow="Avg Onboarding"
          value="12d"
          subtitle="From invite to first PO"
          icon={Clock}
        />
      </div>

      <div className="mb-5">
        <div className="text-label text-text-tertiary uppercase mb-2">
          Filter by category
        </div>
        <div className="inline-flex flex-wrap items-center gap-1 bg-bg-hover border border-border-subtle rounded-md p-1">
          {CATEGORIES.map((cat) => {
            const active = selectedCats.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCat(cat)}
                aria-pressed={active}
                className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-[6px] transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'bg-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, category, country, or capability…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {filtered.map((s) => (
          <SupplierCard
            key={s.id}
            name={s.name}
            country={s.country}
            countryFlag={s.city}
            tier={`Grade ${s.scorecardGrade}`}
            categories={[s.category]}
            otif={s.otif}
            compliance={[
              ...(s.halalCertified
                ? [{ label: 'Halal', variant: 'success' as const }]
                : []),
              ...(s.bpomRegistered
                ? [{ label: 'BPOM', variant: 'info' as const }]
                : []),
            ]}
            onView={() => navigate(`/marketplace/supplier/${s.id}`)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-sm text-text-tertiary py-10">
            No suppliers match the current filters.
          </div>
        )}
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h2 className="text-section text-text-primary flex items-center gap-2">
              Open RFQ Opportunities
              <StatusPill variant="neutral">Sample data</StatusPill>
            </h2>
            <p className="text-meta text-text-tertiary">
              Illustrative open-RFQ teaser — not yet wired to live sourcing data.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-teal hover:text-teal-hover"
          >
            View all <ArrowUpRight size={14} />
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell>RFQ #</TableHeaderCell>
            <TableHeaderCell>Material</TableHeaderCell>
            <TableHeaderCell>Quantity</TableHeaderCell>
            <TableHeaderCell>Deadline</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableHeader>
          <tbody>
            {OPEN_RFQS.map((r) => (
              <TableRow key={r.num}>
                <TableCell className="font-mono text-xs text-text-primary">
                  {r.num}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {r.material}
                </TableCell>
                <TableCell className="text-text-secondary">{r.qty}</TableCell>
                <TableCell className="text-text-secondary">
                  {r.deadline}
                </TableCell>
                <TableCell>
                  <StatusPill variant="info">Open</StatusPill>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </section>
    </AppShellV2>
  );
};

export default Marketplace;
