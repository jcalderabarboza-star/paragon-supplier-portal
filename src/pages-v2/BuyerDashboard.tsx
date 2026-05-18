import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Wallet, Activity, Users, ShoppingCart } from 'lucide-react';
import AppShellV2 from '../components/layout-v2/AppShellV2';
import PageHeader from '../components/ui-v2/PageHeader';
import KpiCard from '../components/ui-v2/KpiCard';
import StatusPill from '../components/ui-v2/StatusPill';
import Table from '../components/ui-v2/Table';
import TableHeader, { TableHeaderCell } from '../components/ui-v2/TableHeader';
import TableRow from '../components/ui-v2/TableRow';
import TableCell from '../components/ui-v2/TableCell';
import TimeRangeToggle from '../components/ui-v2/TimeRangeToggle';

type RangeId = 'today' | 'week' | 'month';

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
];

interface ProductionLineRow {
  line: string;
  category: string;
  risk: 'low' | 'medium' | 'high';
  riskLabel: string;
  coverDays: number;
  blockedSkus: number;
}

const PRODUCTION_LINES: ProductionLineRow[] = [
  {
    line: 'Line A — Skin Care',
    category: 'Active Ingredient',
    risk: 'high',
    riskLabel: 'High',
    coverDays: 4,
    blockedSkus: 3,
  },
  {
    line: 'Line B — Hair Care',
    category: 'Fragrance',
    risk: 'medium',
    riskLabel: 'Medium',
    coverDays: 9,
    blockedSkus: 1,
  },
  {
    line: 'Line C — Color',
    category: 'Packaging',
    risk: 'low',
    riskLabel: 'Low',
    coverDays: 21,
    blockedSkus: 0,
  },
  {
    line: 'Line D — Fragrance',
    category: 'Raw Material',
    risk: 'medium',
    riskLabel: 'Medium',
    coverDays: 11,
    blockedSkus: 1,
  },
];

interface SupplierHealthRow {
  name: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

const SUPPLIER_HEALTH: SupplierHealthRow[] = [
  { name: 'Kao Indonesia', score: 94, grade: 'A' },
  { name: 'BASF SE', score: 89, grade: 'A' },
  { name: 'Givaudan ID', score: 82, grade: 'B' },
  { name: 'Lonza APAC', score: 76, grade: 'B' },
  { name: 'PT Mitra Kemas', score: 68, grade: 'C' },
  { name: 'Sumber Aroma', score: 54, grade: 'D' },
];

const GRADE_COLOR: Record<SupplierHealthRow['grade'], string> = {
  A: '#107E3E',
  B: '#0A6ED1',
  C: '#B45309',
  D: '#BB0000',
};

const RISK_VARIANT: Record<ProductionLineRow['risk'], 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};

const BuyerDashboard: React.FC = () => {
  const [range, setRange] = useState<RangeId>('today');

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['DASHBOARDS', 'PROCUREMENT COMMAND CENTER']}
        title="Procurement Command Center"
        subtitle="Paragon Corp · Odyssey Program · Live operational view"
        actions={
          <TimeRangeToggle options={RANGES} value={range} onChange={setRange} />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <KpiCard
          eyebrow="Total Spend YTD"
          value="Rp 14.0B"
          subtitle={<span className="text-success font-medium">+8.4% vs last year</span>}
          icon={Wallet}
        />
        <KpiCard
          eyebrow="Portfolio OTIF"
          value="75%"
          subtitle="Target ≥ 95% · 8pp gap"
          icon={Activity}
        />
        <KpiCard
          eyebrow="Active Suppliers"
          value="9"
          subtitle="/ 12 total · 2 onboarding"
          icon={Users}
        />
        <KpiCard
          eyebrow="Open POs"
          value="14"
          subtitle="1 unacknowledged >48h"
          icon={ShoppingCart}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-bg-surface rounded-lg shadow-sm border border-border-subtle p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-eyebrow text-text-tertiary uppercase">Operations</div>
              <h2 className="text-lg font-semibold text-text-primary mt-1">
                Production Line Risk
              </h2>
            </div>
            <StatusPill variant="warning">2 lines at risk</StatusPill>
          </div>
          <Table>
            <TableHeader>
              <TableHeaderCell>Line</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Cover (days)</TableHeaderCell>
              <TableHeaderCell>Risk</TableHeaderCell>
            </TableHeader>
            <tbody>
              {PRODUCTION_LINES.map((row) => (
                <TableRow key={row.line}>
                  <TableCell>
                    <div className="font-medium text-text-primary">{row.line}</div>
                    {row.blockedSkus > 0 ? (
                      <div className="text-meta text-text-tertiary">
                        {row.blockedSkus} blocked SKU{row.blockedSkus === 1 ? '' : 's'}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-text-secondary">{row.category}</TableCell>
                  <TableCell className="font-mono text-text-primary">{row.coverDays}d</TableCell>
                  <TableCell>
                    <StatusPill variant={RISK_VARIANT[row.risk]}>{row.riskLabel}</StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </section>

        <section className="bg-bg-surface rounded-lg shadow-sm border border-border-subtle p-6">
          <div className="text-eyebrow text-text-tertiary uppercase">Intelligence</div>
          <h2 className="text-lg font-semibold text-text-primary mt-1">
            Supplier Health Index
          </h2>
          <div className="flex items-center gap-4 mt-1 mb-4 text-meta text-text-tertiary">
            {(['A', 'B', 'C', 'D'] as const).map((g) => (
              <div key={g} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: GRADE_COLOR[g] }}
                />
                <span className="font-semibold">{g}</span>
              </div>
            ))}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SUPPLIER_HEALTH} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                <CartesianGrid stroke="#E5E9EE" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6B7785' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7785' }} />
                <Tooltip
                  cursor={{ fill: '#F4F6F8' }}
                  contentStyle={{
                    border: '1px solid #E5E9EE',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {SUPPLIER_HEALTH.map((row) => (
                    <Cell key={row.name} fill={GRADE_COLOR[row.grade]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AppShellV2>
  );
};

export default BuyerDashboard;
