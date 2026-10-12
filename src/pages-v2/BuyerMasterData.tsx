import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import ListPage from '../components/ui-v2/ListPage';
import DataTable, { type Column } from '../components/ui-v2/DataTable';
import Tabs from '../components/ui-v2/Tabs';
import SubTabs from '../components/ui-v2/SubTabs';
import SearchBar from '../components/ui-v2/SearchBar';
import SidePanel from '../components/ui-v2/SidePanel';
import Notice from '../components/ui-v2/Notice';
import Data from '../components/ui-v2/Data';
import StatusPill from '../components/ui-v2/StatusPill';
import LivenessPill from '../components/ui-v2/LivenessPill';
import SectionHeading from '../components/ui-v2/SectionHeading';
import ReplicaStampLine from '../components/ui-v2/ReplicaStampLine';
import { Field, FieldList } from '../components/ui-v2/Field';
import { Select } from '../components/ui-v2/Form';
import { LinkButton } from '../components/ui-v2/Actions';
import Button from '../components/ui-v2/Button';
import HandoffNotice from '../components/ui-v2/HandoffNotice';
import { useVerbAvailability } from '../hooks/useVerbAvailability';
import { isSampleMaterial } from '../services/masterData/lookup';
import type { MdrKind } from '../services/masterData/changeRequest';
import { ChangeRequestsView, ProposeDialog, SyncLogView } from './master-data/ChangeRequests';
import { formatDateTime } from '../lib/format';
import { RECORD_PARAM } from '../lib/recordDeepLink';
import { useServiceQuery } from '../services/query/useServiceQuery';
import { freshnessOf, masterDataNow, maxAgeHours } from '../services/masterData/freshness';
import {
  REFERENCE_TABLES,
  isMaterialRecord,
  isReferenceRecord,
  isReferenceTable,
  isSupplierRecord,
  type MasterObject,
  type MasterRecord,
  type ReferenceAttribute,
  type ReferenceTable,
  type SapStatus,
  type SyncRun,
} from '../services/masterData/types';
import { WHERE_USED_PATH, type WhereUsedKind } from '../services/masterData/whereUsed';
import {
  DEFAULT_REFERENCE_TABLE,
  MASTER_DATA_VIEWS,
  codeWithText,
  filterRecords,
  isMasterDataView,
  objectOfView,
  referenceTexts,
  type MasterDataView,
  type ReferenceTexts,
} from './master-data/masterDataView';

// ─────────────────────────────────────────────────────────────────────────────
// MD-1 · MASTER DATA (Platform group) — the one place to look up a material, a
// supplier or a reference value.
//
// The page shows a REPLICA of SAP's master data. SAP is the system of record,
// so nothing here changes a record: there is no edit, and the only act a later
// batch adds is a proposal that is handed to SAP. Every record carries its
// stamp — where it came from and when it was read — and a record that was not
// read from SAP says so.
//
// The view, the reference table, the filters and the open record all live in
// the URL, so any page can link to a record and a reload keeps the place.
// ─────────────────────────────────────────────────────────────────────────────

const VIEW_PARAM = 'view';
const TABLE_PARAM = 'table';
const SEARCH_PARAM = 'q';
const TYPE_PARAM = 'type';
const GROUP_PARAM = 'group';
const COUNTRY_PARAM = 'country';
const REQUEST_PARAM = 'request';

const PANEL_ID = 'master-data-panel';

const SAP_STATUS_VARIANT: Record<SapStatus, 'neutral' | 'warning' | 'danger'> = {
  ACTIVE: 'neutral',
  BLOCKED: 'warning',
  FLAGGED_FOR_DELETION: 'danger',
};

const MASTER_DATA_KEY = ['masterData'] as const;

/** Every record of one object. */
function useMasterRecords(object: MasterObject) {
  return useServiceQuery([...MASTER_DATA_KEY, 'list', object], (svc, scope) =>
    svc.masterData.list(scope, object).then((p) => p.items),
  );
}

/** Every reference table, for showing a code beside its text. */
function useReferenceTexts(): ReferenceTexts {
  const { data } = useServiceQuery([...MASTER_DATA_KEY, 'reference-texts'], async (svc, scope) => {
    const pages = await Promise.all(REFERENCE_TABLES.map((table) => svc.masterData.list(scope, table)));
    return pages.flatMap((p) => p.items);
  });
  return useMemo(() => referenceTexts(data ?? []), [data]);
}

const SapStatusPill: React.FC<{ status: SapStatus; t: TFunction }> = ({ status, t }) => (
  <StatusPill variant={SAP_STATUS_VARIANT[status]} data-sap-status={status}>
    {t(`masterData.sapStatus.${status}`)}
  </StatusPill>
);

/** The last sync run: what it took, and what it refused and why. */
export const SyncRunSummary: React.FC<{ run: SyncRun }> = ({ run }) => {
  const { t } = useTranslation();
  return (
    <span data-testid="master-data-last-run" data-run={run.id}>
      {t('masterData.run.line', {
        run: run.id,
        when: formatDateTime(run.at),
        taken: run.created + run.changed + run.unchanged,
      })}
      {run.missing > 0 ? ` · ${t('masterData.run.missing', { count: run.missing })}` : ''}
      {run.refused.length > 0 ? ` · ${t('masterData.run.refused', { count: run.refused.length })}` : ''}
    </span>
  );
};

/** The records a run did not take, each with the reason. Drawn only when there is one. */
export const SyncRefusalNotice: React.FC<{ run: SyncRun }> = ({ run }) => {
  const { t } = useTranslation();
  if (run.refused.length === 0) return null;
  return (
    <Notice tone="warning" title={t('masterData.run.refusedTitle')} data-testid="master-data-refused">
      <p>{t('masterData.run.refusedBody')}</p>
      <ul className="mt-2 list-disc pl-5">
        {run.refused.map((r) => (
          <li key={`${r.object}:${r.key}:${r.reason}`} data-refusal={r.reason}>
            <Data>{t('masterData.run.refusedRow', { object: r.object, key: r.key })}</Data>
            {' — '}
            {t(`masterData.refusal.${r.reason}`, { value: r.value })}
          </li>
        ))}
      </ul>
    </Notice>
  );
};

const RecordDrawer: React.FC<{
  record: MasterRecord;
  texts: ReferenceTexts;
  now: string;
  onClose: () => void;
  onOpenKind: (kind: WhereUsedKind, record: MasterRecord) => void;
  /** Raise a change request about this record. Absent for a record no request can be about. */
  onPropose?: () => void;
}> = ({ record, texts, now, onClose, onOpenKind, onPropose }) => {
  const { t } = useTranslation();
  const { stamp } = record;
  const whereUsed = useServiceQuery([...MASTER_DATA_KEY, 'where-used', record.object, record.key], (svc, scope) =>
    svc.masterData.whereUsed(scope, record.object, record.key),
  );
  const notHeld = t('masterData.field.notHeld');
  const freshness = freshnessOf(stamp, record.object, now);
  const canPropose = useVerbAvailability('masterdata:propose');

  return (
    <SidePanel
      open
      onClose={onClose}
      title={record.key}
      footerActions={
        onPropose ? (
          canPropose.kind === 'held' ? (
            <Button data-testid="master-data-propose-change" onClick={onPropose}>
              {t('masterData.request.act.proposeChange')}
            </Button>
          ) : (
            <HandoffNotice availability={canPropose} testId="handoff-mdr-propose" />
          )
        ) : undefined
      }
    >
      <div data-testid="master-data-drawer" data-object={record.object} data-key={record.key} className="flex flex-col gap-6">
        <ReplicaStampLine record={record} now={now} />

        <section>
          <SectionHeading level="group">{t('masterData.drawer.record')}</SectionHeading>
          <p className="mb-3 mt-1 text-meta text-text-tertiary">{t('masterData.drawer.recordNote')}</p>
          <FieldList columns={2} data-testid="master-data-fields">
            {isMaterialRecord(record) ? (
              <>
                <Field label={t('masterData.field.materialNumber')} kind="id">{record.key}</Field>
                <Field label={t('masterData.field.description')}>{record.data.description}</Field>
                <Field label={t('masterData.field.materialType')}>
                  {codeWithText(texts, 'materialType', record.data.materialType)}
                </Field>
                <Field label={t('masterData.field.baseUnit')}>{codeWithText(texts, 'unit', record.data.baseUnit)}</Field>
                <Field label={t('masterData.field.materialGroup')} wide>
                  {codeWithText(texts, 'materialGroup', record.data.materialGroup)}
                </Field>
              </>
            ) : null}
            {isSupplierRecord(record) ? (
              <>
                <Field label={t('masterData.field.sapNumber')} kind="id">{record.key}</Field>
                <Field label={t('masterData.field.name')}>{record.data.name}</Field>
                <Field label={t('masterData.field.legalName')}>{record.data.legalName ?? notHeld}</Field>
                <Field label={t('masterData.field.country')}>{codeWithText(texts, 'country', record.data.country)}</Field>
                <Field label={t('masterData.field.city')}>{record.data.city}</Field>
                <Field label={t('masterData.field.taxId')}>{record.data.taxId ?? notHeld}</Field>
                <Field label={t('masterData.field.businessRegNo')}>{record.data.businessRegNo ?? notHeld}</Field>
                <Field label={t('masterData.field.paymentTerm')}>
                  {record.data.paymentTerm ? codeWithText(texts, 'paymentTerm', record.data.paymentTerm) : notHeld}
                </Field>
                <Field label={t('masterData.field.incoterm')}>
                  {record.data.incoterm ? codeWithText(texts, 'incoterm', record.data.incoterm) : notHeld}
                </Field>
                <Field label={t('masterData.field.incotermPlace')}>{record.data.incotermPlace ?? notHeld}</Field>
                <Field label={t('masterData.field.portalSupplierId')} kind="id">{record.data.portalSupplierId}</Field>
              </>
            ) : null}
            {isReferenceRecord(record) ? (
              <>
                <Field label={t('masterData.field.code')} kind="id">{record.key}</Field>
                <Field label={t('masterData.field.text')}>{record.data.text}</Field>
                {(Object.entries(record.data.attributes) as [ReferenceAttribute, string][]).map(([attribute, value]) => (
                  <Field key={attribute} label={t(`masterData.attribute.${attribute}`)}>{value}</Field>
                ))}
              </>
            ) : null}
            <Field label={t('masterData.field.sapStatus')} kind="status">
              <SapStatusPill status={stamp.sapStatus} t={t} />
            </Field>
          </FieldList>
        </section>

        <section>
          <SectionHeading level="group">{t('masterData.drawer.source')}</SectionHeading>
          <FieldList columns={2} className="mt-3" data-testid="master-data-stamp-fields">
            <Field label={t('masterData.stamp.field.source')}>{t(`masterData.stamp.source.${stamp.source}`)}</Field>
            <Field label={t('masterData.stamp.field.syncRun')} kind="id">{stamp.syncRun}</Field>
            <Field label={t('masterData.stamp.field.readAt')} kind="date">{formatDateTime(stamp.readAt)}</Field>
            <Field label={t('masterData.stamp.field.sourceChangedAt')} kind={stamp.sourceChangedAt ? 'date' : 'text'}>
              {stamp.sourceChangedAt ? formatDateTime(stamp.sourceChangedAt) : t('masterData.stamp.notCarried')}
            </Field>
            <Field label={t('masterData.stamp.field.freshness')} wide>
              {t(`masterData.freshness.${freshness}`, { hours: maxAgeHours(record.object), run: stamp.missingFromRun })}
            </Field>
          </FieldList>
        </section>

        <section data-testid="master-data-where-used">
          <SectionHeading level="group">{t('masterData.drawer.whereUsed')}</SectionHeading>
          {whereUsed.data ? (
            <>
              <p className="mb-3 mt-1 text-meta text-text-tertiary" data-testid="master-data-where-used-total">
                {whereUsed.data.rows.length === 0
                  ? t('masterData.whereUsed.none')
                  : t('masterData.whereUsed.total', { count: whereUsed.data.total })}
              </p>
              <FieldList columns={2}>
                {whereUsed.data.rows.map((row) => (
                  <Field
                    key={row.kind}
                    label={t(`masterData.whereUsed.kind.${row.kind}`)}
                    kind="number"
                    data-testid={`master-data-where-used-${row.kind}`}
                    sub={
                      row.count > 0 ? (
                        <LinkButton onClick={() => onOpenKind(row.kind, record)}>
                          {t('masterData.whereUsed.open', { page: t(`masterData.whereUsed.kind.${row.kind}`) })}
                        </LinkButton>
                      ) : undefined
                    }
                  >
                    {row.count}
                  </Field>
                ))}
              </FieldList>
            </>
          ) : (
            <p className="mt-1 text-meta text-text-tertiary">{t('masterData.whereUsed.loading')}</p>
          )}
        </section>
      </div>
    </SidePanel>
  );
};

const BuyerMasterData: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const now = masterDataNow();

  const viewParam = params.get(VIEW_PARAM);
  // `/buyer/master-data/requests` is the same page, opened on its requests view.
  const onRequestsRoute = useLocation().pathname.endsWith('/requests');
  const view: MasterDataView = isMasterDataView(viewParam) ? viewParam : onRequestsRoute ? 'requests' : 'materials';
  const tableParam = params.get(TABLE_PARAM) ?? '';
  const table: ReferenceTable = isReferenceTable(tableParam) ? tableParam : DEFAULT_REFERENCE_TABLE;
  const object = objectOfView(view, table);
  const filters = {
    q: params.get(SEARCH_PARAM) ?? '',
    materialType: params.get(TYPE_PARAM) ?? '',
    materialGroup: params.get(GROUP_PARAM) ?? '',
    country: params.get(COUNTRY_PARAM) ?? '',
  };
  const openKey = params.get(RECORD_PARAM);

  /** Set or clear parameters, keeping the rest. `replace`, so typing does not fill the history. */
  const patch = (next: Record<string, string | null>, replace = true) => {
    const merged = new URLSearchParams(params);
    for (const [name, value] of Object.entries(next)) {
      if (value === null || value === '') merged.delete(name);
      else merged.set(name, value);
    }
    setParams(merged, { replace });
  };
  /** A change of view or table starts from a clean list: the old search, filters and record do not follow. */
  const show = (nextView: MasterDataView, nextTable?: ReferenceTable) => {
    const next = new URLSearchParams();
    next.set(VIEW_PARAM, nextView);
    if (nextView === 'reference') next.set(TABLE_PARAM, nextTable ?? table);
    setParams(next);
  };

  const records = useMasterRecords(object);
  const texts = useReferenceTexts();
  const runs = useServiceQuery([...MASTER_DATA_KEY, 'sync-log'], (svc, scope) =>
    svc.masterData.syncLog(scope).then((p) => p.items),
  );
  const lastRun = runs.data?.[0] ?? null;

  const all = useMemo(() => records.data ?? [], [records.data]);
  const rows = useMemo(
    () => filterRecords(all, { q: filters.q, materialType: filters.materialType, materialGroup: filters.materialGroup, country: filters.country }),
    [all, filters.q, filters.materialType, filters.materialGroup, filters.country],
  );
  // The open record is looked up in the UNFILTERED list: a link to a record
  // must open it whatever the reader last filtered by.
  const open = openKey ? all.find((r) => r.key === openKey) ?? null : null;
  const [proposing, setProposing] = useState<{ kind: MdrKind; subject: MasterRecord | null } | null>(null);
  const canPropose = useVerbAvailability('masterdata:propose');
  /** A request can be about an authored material or a supplier; a generated sample has no SAP record to change. */
  const proposable = (r: MasterRecord): MdrKind | null =>
    isMaterialRecord(r) ? (isSampleMaterial(r.key) ? null : 'material.change') : isSupplierRecord(r) ? 'supplier.change' : null;
  const isList = view === 'materials' || view === 'suppliers' || view === 'reference';

  const options = (pick: (r: MasterRecord) => string | null): string[] =>
    [...new Set(all.map(pick).filter((v): v is string => v !== null))].sort();

  const columns = useMemo<Column<MasterRecord>[]>(() => {
    const status: Column<MasterRecord> = {
      id: 'sapStatus',
      header: t('masterData.col.sapStatus'),
      kind: 'status',
      cell: (r) => <SapStatusPill status={r.stamp.sapStatus} t={t} />,
    };
    const read: Column<MasterRecord> = {
      id: 'read',
      header: t('masterData.col.read'),
      kind: 'date',
      cell: (r) => <ReplicaStampLine record={r} now={now} compact />,
    };
    if (view === 'materials') {
      return [
        { id: 'key', header: t('masterData.col.materialNumber'), kind: 'id', cell: (r) => r.key },
        { id: 'description', header: t('masterData.col.description'), kind: 'text', primary: true, cell: (r) => (isMaterialRecord(r) ? r.data.description : '') },
        { id: 'type', header: t('masterData.col.materialType'), kind: 'text', cell: (r) => (isMaterialRecord(r) ? codeWithText(texts, 'materialType', r.data.materialType) : '') },
        { id: 'group', header: t('masterData.col.materialGroup'), kind: 'text', cell: (r) => (isMaterialRecord(r) ? <Data>{r.data.materialGroup}</Data> : '') },
        { id: 'unit', header: t('masterData.col.baseUnit'), kind: 'text', cell: (r) => (isMaterialRecord(r) ? <Data>{r.data.baseUnit}</Data> : '') },
        status,
        read,
      ];
    }
    if (view === 'suppliers') {
      return [
        { id: 'key', header: t('masterData.col.sapNumber'), kind: 'id', cell: (r) => r.key },
        { id: 'name', header: t('masterData.col.name'), kind: 'text', primary: true, cell: (r) => (isSupplierRecord(r) ? r.data.name : '') },
        { id: 'country', header: t('masterData.col.country'), kind: 'text', cell: (r) => (isSupplierRecord(r) ? codeWithText(texts, 'country', r.data.country) : '') },
        { id: 'city', header: t('masterData.col.city'), kind: 'text', cell: (r) => (isSupplierRecord(r) ? r.data.city : '') },
        { id: 'paymentTerm', header: t('masterData.col.paymentTerm'), kind: 'text', cell: (r) => (isSupplierRecord(r) && r.data.paymentTerm ? codeWithText(texts, 'paymentTerm', r.data.paymentTerm) : '') },
        { id: 'incoterm', header: t('masterData.col.incoterm'), kind: 'text', cell: (r) => (isSupplierRecord(r) && r.data.incoterm ? [r.data.incoterm, r.data.incotermPlace].filter(Boolean).join(' ') : '') },
        status,
        read,
      ];
    }
    return [
      { id: 'key', header: t('masterData.col.code'), kind: 'id', cell: (r) => r.key },
      { id: 'text', header: t('masterData.col.text'), kind: 'text', primary: true, cell: (r) => (isReferenceRecord(r) ? r.data.text : '') },
      {
        id: 'detail',
        header: t('masterData.col.detail'),
        kind: 'text',
        cell: (r) =>
          isReferenceRecord(r)
            ? (Object.entries(r.data.attributes) as [ReferenceAttribute, string][])
                .map(([attribute, value]) => `${t(`masterData.attribute.${attribute}`)}: ${value}`)
                .join(' · ')
            : '',
      },
      status,
      read,
    ];
  }, [t, view, texts, now]);

  const count =
    view === 'reference'
      ? t('masterData.count.reference', { count: rows.length, table: t(`masterData.object.${table}`) })
      : t(`masterData.count.${view === 'materials' ? 'material' : 'supplier'}`, { count: rows.length });

  /** A where-used row leads to the page that lists those documents; a row of this page's own records to its view. */
  const openKind = (kind: WhereUsedKind, record: MasterRecord) => {
    if (kind === 'material' && isReferenceRecord(record)) {
      const filter = record.object === 'materialType' ? TYPE_PARAM : record.object === 'materialGroup' ? GROUP_PARAM : SEARCH_PARAM;
      navigate(`${WHERE_USED_PATH.material}?${VIEW_PARAM}=materials${filter === SEARCH_PARAM ? '' : `&${filter}=${encodeURIComponent(record.key)}`}`);
      return;
    }
    if (kind === 'supplier' && isReferenceRecord(record)) {
      navigate(`${WHERE_USED_PATH.supplier}?${VIEW_PARAM}=suppliers${record.object === 'country' ? `&${COUNTRY_PARAM}=${encodeURIComponent(record.key)}` : ''}`);
      return;
    }
    navigate(WHERE_USED_PATH[kind]);
  };

  return (
    <ListPage
      testId="master-data"
      breadcrumb={[t('masterData.crumb')]}
      title={t('masterData.title')}
      subtitle={t('masterData.subtitle')}
      actions={
        canPropose.kind === 'held' ? (
          <Button variant="primary" data-testid="master-data-new-material" onClick={() => setProposing({ kind: 'material.create', subject: null })}>
            {t('masterData.request.act.newMaterial')}
          </Button>
        ) : (
          <HandoffNotice availability={canPropose} testId="handoff-mdr-propose-header" />
        )
      }
      meta={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {isList ? <span data-testid="master-data-count">{count}</span> : null}
          <LivenessPill capability="masterData" />
          {lastRun ? <SyncRunSummary run={lastRun} /> : null}
        </span>
      }
      notices={
        <>
          <Notice tone="sample" title={t('masterData.sampleNotice.title')} data-testid="master-data-sample-notice">
            {t('masterData.sampleNotice.body')}
          </Notice>
          {lastRun ? <SyncRefusalNotice run={lastRun} /> : null}
        </>
      }
      tabs={
        <Tabs
          ariaLabel={t('masterData.views.label')}
          active={view}
          onChange={(id) => (isMasterDataView(id) ? show(id) : undefined)}
          tabs={MASTER_DATA_VIEWS.map((v) => ({
            id: v,
            label: t(`masterData.view.${v}`),
            domId: `master-data-tab-${v}`,
            controls: PANEL_ID,
            testId: `master-data-view-${v}`,
          }))}
        />
      }
      filters={
        !isList ? undefined : view === 'materials' ? (
          <>
            <Select
              className="w-56"
              aria-label={t('masterData.filter.type')}
              data-testid="master-data-filter-type"
              value={filters.materialType}
              onChange={(e) => patch({ [TYPE_PARAM]: e.target.value })}
            >
              <option value="">{t('masterData.filter.typeAll')}</option>
              {options((r) => (isMaterialRecord(r) ? r.data.materialType : null)).map((v) => (
                <option key={v} value={v}>{codeWithText(texts, 'materialType', v)}</option>
              ))}
            </Select>
            <Select
              className="w-80"
              aria-label={t('masterData.filter.group')}
              data-testid="master-data-filter-group"
              value={filters.materialGroup}
              onChange={(e) => patch({ [GROUP_PARAM]: e.target.value })}
            >
              <option value="">{t('masterData.filter.groupAll')}</option>
              {options((r) => (isMaterialRecord(r) ? r.data.materialGroup : null)).map((v) => (
                <option key={v} value={v}>{codeWithText(texts, 'materialGroup', v)}</option>
              ))}
            </Select>
          </>
        ) : view === 'suppliers' ? (
          <Select
            className="w-56"
            aria-label={t('masterData.filter.country')}
            data-testid="master-data-filter-country"
            value={filters.country}
            onChange={(e) => patch({ [COUNTRY_PARAM]: e.target.value })}
          >
            <option value="">{t('masterData.filter.countryAll')}</option>
            {options((r) => (isSupplierRecord(r) ? r.data.country : null)).map((v) => (
              <option key={v} value={v}>{codeWithText(texts, 'country', v)}</option>
            ))}
          </Select>
        ) : (
          <div data-testid="master-data-tables" aria-label={t('masterData.filter.table')}>
            <SubTabs
              variant="chips"
              value={table}
              onChange={(id) => show('reference', id)}
              options={REFERENCE_TABLES.map((id) => ({ id, label: t(`masterData.object.${id}`) }))}
            />
          </div>
        )
      }
      search={
        !isList ? undefined : (
        // The test id sits on the wrapper: `SearchBar` owns its input.
        <div data-testid="master-data-search">
          <SearchBar
            value={filters.q}
            onChange={(q) => patch({ [SEARCH_PARAM]: q })}
            placeholder={t(`masterData.search.${view}`)}
            ariaLabel={t(`masterData.search.${view}`)}
          />
        </div>
        )
      }
    >
      <div id={PANEL_ID} role="tabpanel" aria-labelledby={`master-data-tab-${view}`} data-view={view} data-object={object}>
        {view === 'requests' ? (
          <ChangeRequestsView openId={params.get(REQUEST_PARAM)} onOpen={(id) => patch({ [REQUEST_PARAM]: id }, false)} />
        ) : view === 'sync' ? (
          <SyncLogView />
        ) : records.isError ? (
          <Notice tone="critical" role="alert" data-testid="master-data-error">
            {t('masterData.error')}
          </Notice>
        ) : records.isLoading ? (
          <Notice tone="neutral" role="status" data-testid="master-data-loading">
            {t('masterData.loading')}
          </Notice>
        ) : rows.length === 0 ? (
          <Notice tone="neutral" data-testid="master-data-empty">
            {t('masterData.empty')}
          </Notice>
        ) : (
          <DataTable
            testId="master-data-table"
            columns={columns}
            rows={rows}
            rowKey={(r) => `${r.object}:${r.key}`}
            onRowClick={(r) => patch({ [RECORD_PARAM]: r.key }, false)}
            rowProps={(r) => ({
              'data-testid': `master-data-row-${r.key}`,
              'data-source': r.stamp.source,
              'data-freshness': freshnessOf(r.stamp, r.object, now),
            })}
          />
        )}
      </div>
      {open ? (
        <RecordDrawer
          record={open}
          texts={texts}
          now={now}
          onClose={() => patch({ [RECORD_PARAM]: null }, false)}
          onOpenKind={openKind}
          onPropose={proposable(open) ? () => setProposing({ kind: proposable(open) as MdrKind, subject: open }) : undefined}
        />
      ) : null}
      {proposing ? (
        <ProposeDialog
          kind={proposing.kind}
          subject={proposing.subject}
          onClose={() => setProposing(null)}
          onProposed={(id) => {
            setProposing(null);
            const next = new URLSearchParams();
            next.set(VIEW_PARAM, 'requests');
            if (id) next.set(REQUEST_PARAM, id);
            setParams(next);
          }}
        />
      ) : null}
    </ListPage>
  );
};

export default BuyerMasterData;
