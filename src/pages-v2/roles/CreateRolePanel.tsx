import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import Button from '../../components/ui-v2/Button';
import { ToggleChip } from '../../components/ui-v2/Actions';
import SectionHeading from '../../components/ui-v2/SectionHeading';
import { FORM_HINT_CLASS, FormField, Select, TextInput } from '../../components/ui-v2/Form';
import HandoffNotice from '../../components/ui-v2/HandoffNotice';
import { useCurrentIdentity } from '../../context/CurrentIdentityContext';
import { useToast } from '../../hooks/useToast';
import { useRoleGrant } from '../../services/query/commandHooks';
import { availabilityOfAtom } from '../../services/transitions/handoff';
import {
  PERSONA_SYSTEM_ROLES,
  SYSTEM_ROLES,
  type SystemRoleId,
} from '../../services/transitions/businessRoles';
import { atomsOfSide } from '../../services/transitions/customRoles';
import { useRefusalText } from '../../hooks/useRefusalText';
import ActorPreActNotice from '../../components/ui-v2/ActorPreActNotice';
import { namedSeatRefusalKey } from '../../lib/namedSeatRefusal';

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE-AND-NARROW — AND THE FIRST ROLE-GATED SURFACE IN THIS PLATFORM.
//
// ⚠️ **NO PAGE IN THIS PORTAL HAD EVER GATED ON ROLE.** Derived before building:
// not one `<Route>` in `AppRouter.tsx` carries a guard element, and the only
// role-conditional rendering anywhere in `pages-v2` / `components` was the
// invoice footer. So the shape was TAKEN, not inherited, and the choice is:
//
//   **THE AFFORDANCE IS GATED, NEVER THE ROUTE.**
//
// A route guard was refused for two reasons that both already have rulings
// behind them. It would render A GAP where the standing constraint requires THE
// WAIT — *a verb a seat does not hold shows as PENDING WITH AN OWNER, never as
// an absent affordance* — and it would hide the CATALOGUE, which §65 ruled must
// stay readable by anyone, because reading which roles exist is not editing one.
// So the page renders for every seat and this panel states, by name, whose act
// creating a role is.
//
// ⚠️ **AND THE GATE HERE IS COSMETIC. THE REAL ONE IS `role:grant`.** This panel
// can only prevent the GESTURE. The dispatcher's role check and
// `role_grant_governed` prevent the ACT — including the tenancy rule, which is
// enforced per atom at the verb precisely because the `adds` list below is
// populated correctly and a boundary that holds because a dropdown was built
// well is not a boundary.
//
// ⚠️ **IT RENDERS NOTHING A CUSTOM ROLE NEEDS TO BE SHOWN.** The list, the
// badge, the tile, the reach column and the detail page were not touched: they
// read `deriveRoleViews()`, which now yields custom roles too. This file is the
// WRITE path and the gate; the READ path did not learn that custom roles exist.
// ─────────────────────────────────────────────────────────────────────────────

const CreateRolePanel: React.FC<{ onGranted: () => void }> = ({ onGranted }) => {
  const { t } = useTranslation();
  const refusalText = useRefusalText();
  const { identity } = useCurrentIdentity();
  const { toast } = useToast();
  const grant = useRoleGrant();

  // THE GATE. `role:grant` sits in `compliance` alone — see `businessRoles.ts`.
  const availability = useMemo(
    () => availabilityOfAtom('role:grant', identity.businessRoles),
    [identity.businessRoles],
  );

  // Only roles on the seat's own side are offerable parents. Since ADM-1 the
  // two administrator roles are on the buyer side and so are offered; a copy of
  // `super_admin` holds its permissions and never its exemption, which belongs
  // to the role id (`services/identity/superAdmin.ts`).
  const parents = PERSONA_SYSTEM_ROLES[identity.personaType];
  const [parent, setParent] = useState<SystemRoleId>(parents[0]);
  const [roleId, setRoleId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [adds, setAdds] = useState<readonly string[]>([]);

  // Same side, not already held. Derived from the same two functions the policy
  // hook reads, so the offer and the refusal cannot disagree.
  const addable = useMemo(() => {
    const held = new Set<string>(SYSTEM_ROLES[parent]);
    return atomsOfSide(identity.personaType).filter((a) => !held.has(a)).slice().sort();
  }, [parent, identity.personaType]);

  if (availability.kind !== 'held') {
    return (
      <section className="flex gap-3" data-testid="roles-create-gate">
        <ShieldCheck size={16} className="text-teal shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary">
              {t('roles.page.createGateTitle')}
            </span>
            <HandoffNotice availability={availability} testId="roles-create-handoff" />
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mt-1">
            {t('roles.page.createGateBody')}
          </p>
          {/* ⚠️ HOW, NOT ONLY WHY — AND FENCED AS A DEMO CONTROL. A reader who
              cannot see the affordance can learn from the surface what would
              change it. The fence is load-bearing: "you can take this role
              yourself" is true only because the switcher is a demo control, and
              the sentence that omitted that would describe a self-service
              privilege grant as though it were the design. The switcher is what
              a real IdP replaces, so this line is written to die with it. */}
          <p
            className="text-xs text-text-tertiary leading-relaxed mt-2"
            data-testid="roles-create-gate-demo"
          >
            {t('roles.page.createGateDemo')}
          </p>
        </div>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await grant.mutateAsync({
      parent,
      roleId: roleId.trim(),
      displayName,
      description,
      adds,
    });
    if (result.status === 'failed') {
      // The dispatcher's own words. A refusal that only reports failure is half
      // a remedy — this one names the atom, the side or the field.
      toast({
        variant: 'error',
        title:
          (namedSeatRefusalKey(result.reason) ? t(namedSeatRefusalKey(result.reason)!) : null) ??
          refusalText(result.reason) ??
          t('roles.page.createRefused', { reason: result.reason ?? '' }),
      });
      return;
    }
    toast({ variant: 'success', title: t('roles.page.createOk', { id: roleId.trim() }) });
    setRoleId('');
    setDisplayName('');
    setDescription('');
    setAdds([]);
    onGranted();
  };

  return (
    <section data-testid="roles-create">
      {/* ADM-1 — the title is the dialog's; the form opens on its intro. */}
      <p className="text-xs text-text-secondary leading-relaxed mb-3">
        {t('roles.page.createIntro')}
      </p>

      <form className="flex flex-col gap-3" onSubmit={submit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t('roles.page.createParent')}>
            <Select
              data-testid="role-create-parent"
              value={parent}
              onChange={(e) => {
                setParent(e.target.value as SystemRoleId);
                setAdds([]);
              }}
            >
              {parents.map((p) => (
                <option key={p} value={p}>
                  {t(`roles.owner.${p}`)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('roles.page.createId')} hint={t('roles.page.createIdHint')}>
            <TextInput
              mono
              data-testid="role-create-id"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            />
          </FormField>
        </div>

        <FormField label={t('roles.page.createName')}>
          <TextInput
            data-testid="role-create-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </FormField>

        <FormField label={t('roles.page.createDescription')}>
          <TextInput
            data-testid="role-create-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <div>
          <SectionHeading level="group" as="h4">{t('roles.page.createAdds')}</SectionHeading>
          {addable.length === 0 ? (
            <p className="text-xs text-text-tertiary mt-1" data-testid="role-create-adds-none">
              {t('roles.page.createAddsNone')}
            </p>
          ) : (
            <div
              className="mt-1 flex flex-wrap gap-1 max-h-40 overflow-y-auto"
              data-testid="role-create-adds"
            >
              {addable.map((a) => {
                const on = adds.includes(a);
                return (
                  <ToggleChip
                    mono
                    selected={on}
                    key={a}
                    data-testid={`role-create-add-${a}`}
                    aria-pressed={on}
                    onClick={() =>
                      setAdds(on ? adds.filter((x) => x !== a) : [...adds, a])
                    }
                  >
                    {a}
                  </ToggleChip>
                );
              })}
            </div>
          )}
          <p className={`mt-1 ${FORM_HINT_CLASS}`}>{t('roles.page.createAddsHint')}</p>
        </div>

        {/* THE ATTRIBUTION, STATED BEFORE THE ACT. SUP-1: a grant is recorded
            against the person who made it, and a seat that names nobody is
            refused - so the line says which of the two this seat is. */}
        <p
          className="text-xs text-text-tertiary leading-relaxed"
          data-testid="role-create-persistence"
        >
          {t('roles.page.createPersistence')}
        </p>
        <ActorPreActNotice
          unattributedKey="identity.preAct.namedRequired"
          className="text-xs text-text-tertiary leading-relaxed"
          testId="role-create-actor"
        />

        <div>
          {/* DP2-BUTTON-01: OUTLINE. Creating a session-scoped role is reversible
              by reloading; solid stays reserved for irreversible commits. */}
          <Button type="submit" variant="outline" data-testid="role-create-submit">
            {t('roles.page.createSubmit')}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default CreateRolePanel;
