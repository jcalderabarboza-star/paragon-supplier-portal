// ────────────────────────────────────────────────────────────────────────────
// FB-1 · THE WORLD AS IT IS — what `validateVersion` is handed outside a spec,
// and the one place a stored version is judged against today's rules.
//
// Every member is read from the thing that owns the fact: the flow registry,
// the command-target table, the role bundles, the module switches, the stores.
// Nothing is restated here.
// ────────────────────────────────────────────────────────────────────────────

import { getKnownFlows } from '../transitions/registry';
import {
  PERSONA_SYSTEM_ROLES,
  SUPERSET_ROLES,
  SYSTEM_ROLES,
  type SystemRoleId,
} from '../transitions/businessRoles';
import { WIRED_COMMAND_TARGETS, commandTargetFor } from '../data/mock/MockCommandService';
import { moduleGate } from '../data/mock/moduleActivationTarget';
import { DOCUMENT_IDS } from '../data/mock/documentIds';
import { ATTRIBUTION_KEYS } from '../identity/attributionKeys';
import { SAMPLE_PEOPLE } from '../identity/sampleRoster';
import type { QueryScope } from '../data/types';
import type { FlowVersion } from './flowVersion';
import { flowVersionStore, type FlowVersionReadState } from './flowVersionStore';
import { rosterLabels } from './rosterLabels';
import { STEP_SURFACES } from './stepSurfaces';
import { errorsOf, validateVersion, type Finding, type ValidationWorld } from './validateVersion';

/**
 * THE LANES THAT MAY BE GIVEN A STEP: on the buyer side, holding a permission
 * of their own, and not a union of other lanes. An anchor holds nothing, so
 * nobody could complete its step; a union role is several lanes, so "which lane
 * completes this" would have no answer.
 */
export function stepLanes(): readonly SystemRoleId[] {
  return PERSONA_SYSTEM_ROLES.buyer.filter((r) => !SUPERSET_ROLES.has(r) && SYSTEM_ROLES[r].length > 0);
}

/** A buyer seat, to ask the module gate what is off for the buyer side. */
const BUYER_SCOPE: QueryScope = { personaType: 'buyer', supplierId: null };

export function liveWorld(extra: { personNames?: readonly string[] } = {}): ValidationWorld {
  return {
    flows: getKnownFlows(),
    wiredEntities: WIRED_COMMAND_TARGETS,
    stepSurfaces: STEP_SURFACES,
    stepLanes: stepLanes(),
    // The roster's ids, and every sample person as a reader sees them in
    // either language — one list for every caller.
    personNames: [...SAMPLE_PEOPLE.map((p) => p.personId), ...rosterLabels(), ...(extra.personNames ?? [])],
    actorKeys: ATTRIBUTION_KEYS,
    switchedOff: (transitionId) => moduleGate(transitionId, BUYER_SCOPE),
    resting: (entity, state) => {
      const ids = DOCUMENT_IDS[entity];
      const target = commandTargetFor(entity);
      if (!ids || !target) return null;
      return ids().filter((id) => target.readState(id) === state).length;
    },
  };
}

export interface FlaggedVersion {
  readonly version: FlowVersion;
  /** The rules this version breaks today — errors only. */
  readonly findings: readonly Finding[];
}

export interface FlowVersionsRead extends FlowVersionReadState {
  /**
   * Versions that are well-formed and no longer obey the rules of their
   * process. REPORTED, NOT ABSORBED: the row is kept and named, so a change
   * whose process moved underneath it is neither silently kept nor silently
   * dropped.
   */
  readonly flagged: readonly FlaggedVersion[];
}

/** Read the store and judge every version against the world as it is now. */
export function readFlowVersions(world: ValidationWorld = liveWorld()): FlowVersionsRead {
  const read = flowVersionStore.readState();
  const flagged = read.versions
    .map((version) => ({ version, findings: errorsOf(validateVersion(version.content, world)) }))
    .filter((f) => f.findings.length > 0);
  return { ...read, flagged };
}
