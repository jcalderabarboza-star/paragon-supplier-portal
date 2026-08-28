import React from 'react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShellV2 from '../layout-v2/AppShellV2';
import PageHeader from './PageHeader';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ **THE REMEDY IS DERIVED FROM THE PERSONA, BECAUSE ONE STRING WAS BEING
// ASKED TO BE TRUE OF TWO DIFFERENT FACTS.** This component is reached from 18
// sites through two guard expressions — `!supplierId` (13) and `!mySupplier`
// (5) — and the FIRST of them is hit by two states that are not the same event:
//
//   · a BUYER seat, whose `supplierId` is `null` by construction; and
//   · a SUPPLIER seat naming a tenant the supplier master does not hold —
//     `tenantFromStorage` maps an unknown id to `{ supplierId: null }`
//     (`identitySources.ts`), so it lands on the buyer's guard.
//
// It told the second one to *"use the persona toggle to switch to Supplier
// mode"* while it was ALREADY in supplier mode. That is a remedy naming an act
// that changes nothing — the label-names-the-wrong-verb class, in copy.
//
// ⚠️ **THE DISCRIMINATOR IS `personaType`, AND IT IS READ HERE RATHER THAN
// PASSED IN.** A prop would make every one of the 18 call sites responsible for
// re-deriving a fact the seat already holds, and 18 chances to derive it
// differently is how a guard starts disagreeing with the thing it guards.
//
// The `!mySupplier` guard is defence-in-depth that cannot fire today —
// `tenantFromStorage` and `MockSupplierService.getCurrent` search THE SAME
// `mockSuppliers` array, so an id that passed the first is found by the second.
// If those two ever diverge it fires on a SUPPLIER seat, and the unresolved
// arm is already the truthful message for it. Nothing here assumes it is dead.
// ─────────────────────────────────────────────────────────────────────────────
const NoSupplierIdentity: React.FC = () => {
  const { t } = useTranslation();
  const { identity } = useCurrentIdentity();
  const arm = identity.personaType === 'supplier' ? 'unresolvedTenant' : 'noSupplier';

  return (
    <AppShellV2>
      <PageHeader
        breadcrumb={['SUPPLIER']}
        title={t(`identity.${arm}.title`)}
        subtitle={t(`identity.${arm}.subtitle`)}
      />
      <div className="py-16 px-6 flex flex-col items-center text-center">
        <div className="inline-flex w-14 h-14 rounded-full bg-bg-hover items-center justify-center mb-4">
          <User size={24} className="text-text-tertiary" />
        </div>
        <div className="text-base font-semibold text-text-primary mb-1">
          {t(`identity.${arm}.heading`)}
        </div>
        <div className="text-sm text-text-tertiary max-w-md">
          {t(`identity.${arm}.body`)}
        </div>
      </div>
    </AppShellV2>
  );
};

export default NoSupplierIdentity;
