import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe2, Users, FileText, Clock } from 'lucide-react';
import { useCategoryLabel } from '../hooks/useCategoryLabel';
import ProvenanceMarker from '../components/ui-v2/ProvenanceMarker';
import KpiCard from '../components/ui-v2/KpiCard';
import SearchBar from '../components/ui-v2/SearchBar';
import SupplierCard from '../components/ui-v2/SupplierCard';
import StatusPill from '../components/ui-v2/StatusPill';
import SectionHeading from '../components/ui-v2/SectionHeading';
import DataTable from '../components/ui-v2/DataTable';
import ListPage from '../components/ui-v2/ListPage';
import LoadingState from '../components/ui-v2/LoadingState';
import ErrorState from '../components/ui-v2/ErrorState';
import EmptyState from '../components/ui-v2/EmptyState';
import Data from '../components/ui-v2/Data';
import { useSuppliers } from '../services/query/hooks';

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
    material: 'Sample Floral Accord Wardah',
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
  const { t } = useTranslation();
  const cl = useCategoryLabel();
  const MARKETPLACE_CRUMB = [
    t('marketplace.crumb.marketplace'),
  ];
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
        title={t('marketplace.empty.title')}
        subtitle={t('marketplace.empty.subtitle')}
        message={t('marketplace.empty.message')}
      />
    );

  return (
    <ListPage
      breadcrumb={MARKETPLACE_CRUMB}
      title={t('marketplace.header.title')}
      subtitle={t('marketplace.header.subtitle')}
      /* D-CENSUS-8 — MARKER-SCOPE-01. This page did carry a "Sample data" badge, but
          only on the RFQ section below; the supplier grid and the four KPI tiles above
          it — the page's actual claim — were unmarked, and a section badge reads as
          scoped to its section. The page-level marker states the fact once, for the
          whole route. */
      meta={<ProvenanceMarker capability="suppliers" />}
      kpis={
        <>
          <KpiCard
            eyebrow={t('marketplace.kpi.totalSuppliers.eyebrow')}
            value={stats.total.toString()}
            subtitle={t('marketplace.kpi.totalSuppliers.subtitle')}
            icon={Users}
          />
          <KpiCard
            eyebrow={t('marketplace.kpi.countries.eyebrow')}
            value={stats.countries.toString()}
            subtitle={t('marketplace.kpi.countries.subtitle')}
            icon={Globe2}
          />
          <KpiCard
            eyebrow={t('marketplace.kpi.activeRfqs.eyebrow')}
            value={stats.activeRfqs.toString()}
            subtitle={t('marketplace.kpi.activeRfqs.subtitle')}
            icon={FileText}
          />
          <KpiCard
            eyebrow={t('marketplace.kpi.onboarding.eyebrow')}
            value="12d"
            subtitle={t('marketplace.kpi.onboarding.subtitle')}
            icon={Clock}
          />
        </>
      }
      filters={
        <div>
          <div className="text-label text-text-tertiary uppercase mb-2">
            {t('marketplace.filter.byCategory')}
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
                  {cl(cat)}
                </button>
              );
            })}
          </div>
        </div>
      }
      search={
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('marketplace.search.placeholder')}
        />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {filtered.map((s) => (
          <SupplierCard
            key={s.id}
            name={s.name}
            country={s.country}
            countryFlag={s.city}
            tier={t('marketplace.grade', { grade: s.scorecardGrade })}
            categories={[cl(s.category)]}
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
            {t('marketplace.cards.empty')}
          </div>
        )}
      </div>

      <section className="bg-bg-surface border border-border-subtle rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <SectionHeading as="h2" className="flex items-center gap-2">
              {t('marketplace.rfq.title')}
              {/* MARKER-I18N-HOLE-01 — this was a hardcoded English
                  `<StatusPill>Sample data</StatusPill>`, so switching the portal to
                  Bahasa made the honest marker VANISH: the one surface where a
                  reader most needs the disclosure lost it by changing language.
                  Migrated onto the registry-derived primitive, which is translated. */}
              <ProvenanceMarker capability="suppliers" />
            </SectionHeading>
            <p className="text-meta text-text-tertiary">
              {t('marketplace.rfq.subtitle')}
            </p>
          </div>
          {/* ⚠️ `View all` IS GONE — H3. The table directly beneath this heading
              renders `OPEN_RFQS` IN FULL — there is no longer list to go to — so the
              control was a duplicate of the surface it sat on, and nothing would
              have changed had it worked. */}
        </div>
        <DataTable<(typeof OPEN_RFQS)[number]>
          card={false}
          rows={OPEN_RFQS}
          rowKey={(r) => r.num}
          columns={[
            {
              id: 'rfq',
              header: t('marketplace.rfq.col.rfq'),
              kind: 'id',
              cell: (r) => <Data>{r.num}</Data>,
            },
            {
              id: 'material',
              header: t('marketplace.rfq.col.material'),
              kind: 'text',
              cell: (r) => r.material,
            },
            {
              id: 'quantity',
              header: t('marketplace.rfq.col.quantity'),
              kind: 'number',
              cell: (r) => <Data>{r.qty}</Data>,
            },
            {
              id: 'deadline',
              header: t('marketplace.rfq.col.deadline'),
              kind: 'date',
              cell: (r) => <Data>{r.deadline}</Data>,
            },
            {
              id: 'status',
              header: t('marketplace.rfq.col.status'),
              kind: 'status',
              cell: () => <StatusPill variant="info">Open</StatusPill>,
            },
          ]}
        />
      </section>
    </ListPage>
  );
};

export default Marketplace;
