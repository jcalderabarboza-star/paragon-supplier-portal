import type { LucideIcon } from 'lucide-react';
import { Layers, FileCheck2, Building2, Clock, UploadCloud } from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Halal-renewal walkthrough — the scripted STEP DESCRIPTOR (I3.4, FORK-1=(c)).
//
// This module owns only the SHAPE of the walkthrough: the ordered step ids, a
// decorative icon per step, and the i18n keys where the prose lives. It carries
// NO regulatory prose — the copy is in `src/lib/i18n/learn.ts` (EN/ID), and even
// there it is written as a GUIDE that routes to the authoritative source, never
// as an authority that states procedure (I3.4 governing principle).
//
// The dual-trigger reality (GR 42/2024): a BPJPH certificate has PERMANENT
// validity and needs re-certification only on a composition / Halal Product
// Process (PPH) change; a legacy MUI / GR-39 certificate carries a fixed expiry
// and must migrate to BPJPH. The FIRST step names both triggers, then all steps
// share ONE SIHALAL path (no per-certificate branching — D-A deleted `certBasis`,
// so the field this once promised not to read is gone — that content engine is
// deferred; a single shared path is also what the team's Compliance session
// ratifies). Every specific regulatory fact routes to `HALAL_RENEWAL_SOURCE`.
// ────────────────────────────────────────────────────────────────────────────

export interface WalkthroughStepDescriptor {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
}

/** The authoritative external source every step routes to — the official BPJPH
 *  portal. Paragon is never the authority; this is (halal.go.id). */
export const HALAL_RENEWAL_SOURCE = {
  href: 'https://halal.go.id',
  labelKey: 'learn.halalRenewal.source.label',
};

export const HALAL_RENEWAL_STEPS: readonly WalkthroughStepDescriptor[] = [
  {
    id: 'basis',
    icon: Layers,
    titleKey: 'learn.halalRenewal.step.basis.title',
    bodyKey: 'learn.halalRenewal.step.basis.body',
  },
  {
    id: 'prepare',
    icon: FileCheck2,
    titleKey: 'learn.halalRenewal.step.prepare.title',
    bodyKey: 'learn.halalRenewal.step.prepare.body',
  },
  {
    id: 'apply',
    icon: Building2,
    titleKey: 'learn.halalRenewal.step.apply.title',
    bodyKey: 'learn.halalRenewal.step.apply.body',
  },
  {
    id: 'track',
    icon: Clock,
    titleKey: 'learn.halalRenewal.step.track.title',
    bodyKey: 'learn.halalRenewal.step.track.body',
  },
  {
    id: 'upload',
    icon: UploadCloud,
    titleKey: 'learn.halalRenewal.step.upload.title',
    bodyKey: 'learn.halalRenewal.step.upload.body',
  },
];
