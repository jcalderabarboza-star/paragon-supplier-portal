import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { readAuditEvents } from '../../services/audit/auditTrail';
import { bypassesOn } from '../../services/audit/superAdminActivity';
import { personLabel } from '../../services/identity/personLabel';
import { formatSetAt } from '../../pages-v2/modules/moduleLedger';
import { bypassRuleLabel } from './BypassReasonDialog';

// ─────────────────────────────────────────────────────────────────────────────
// ADM-1 · WHAT A DOCUMENT CARRIES WHEN A CHECK STOOD ASIDE FOR A SUPER ADMIN.
//
// "Super Admin — four-eyes bypassed", who, when, which check, and the reason.
// Read from the audit trail by document, so the note and the activity view are
// the same record and cannot disagree. A document nobody bypassed a check on
// renders nothing.
// ─────────────────────────────────────────────────────────────────────────────
const SuperAdminBypassNote: React.FC<{ entity: string; entityId: string; className?: string }> = ({
  entity,
  entityId,
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  const rows = bypassesOn(readAuditEvents(), entity, entityId);
  if (rows.length === 0) return null;
  return (
    <section
      className={`rounded-md border border-warning bg-warning-soft px-3 py-2 ${className}`}
      data-testid={`super-admin-bypass-${entity}-${entityId}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-warning-hover">
        <ShieldAlert size={14} />
        {t('superAdmin.stamp')}
      </div>
      <ul className="mt-1 flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.id} className="text-xs text-text-secondary">
            <div>
              {t('superAdmin.note.line', {
                person: personLabel(row.personId, t),
                when: formatSetAt(row.at),
                rule: row.bypassedRules.map((r) => bypassRuleLabel(r, t, (k) => i18n.exists(k))).join(' · '),
              })}
            </div>
            <div className="text-text-primary">{t('superAdmin.note.reason', { reason: row.reason ?? '' })}</div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SuperAdminBypassNote;
