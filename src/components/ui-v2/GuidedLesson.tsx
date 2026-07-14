import React, { useState } from 'react';
import { Check, ExternalLink, type LucideIcon } from 'lucide-react';
import Button from './Button';

// ────────────────────────────────────────────────────────────────────────────
// GuidedLesson — a READ-ONLY, stepped guidance primitive (I3.4, FORK-1=(c)).
//
// Deliberately NOT `Wizard`: a Wizard collects input and terminates in Submit /
// onComplete — it implies a MUTATION. A GuidedLesson only ever reads: it walks a
// supplier through steps and closes with Done. There is NO submit path and NO
// mutation callback in this component's API — so it is STRUCTURALLY incapable of
// looking like a live submission (the I3.4 §4 honesty guarantee). The authoritative
// action always completes at an external source (e.g. SIHALAL); this primitive is
// the honest frame around that, never the authority.
//
// Labels are passed in (i18n resolved at the call site), so the primitive stays
// locale-agnostic and reusable. A persistent `disclaimer` and an optional external
// `source` link render on every step — the honest boundary is always visible, not
// buried on a final screen.
// ────────────────────────────────────────────────────────────────────────────

export interface GuidedLessonStep {
  id: string;
  /** Optional lead icon for the step (decorative). */
  icon?: LucideIcon;
  title: string;
  body: React.ReactNode;
}

interface GuidedLessonProps {
  steps: GuidedLessonStep[];
  labels: {
    back: string;
    next: string;
    done: string;
    /** e.g. (2, 5) → "Step 2 of 5". */
    step: (current: number, total: number) => string;
  };
  /** The always-visible honest note: guidance, not an official submission. */
  disclaimer: React.ReactNode;
  /** The authoritative external source this lesson routes to (never Paragon). */
  source?: { label: string; href: string };
  /** Close the lesson. There is intentionally no onComplete/onSubmit. */
  onDone: () => void;
  className?: string;
}

const GuidedLesson: React.FC<GuidedLessonProps> = ({
  steps,
  labels,
  disclaimer,
  source,
  onDone,
  className = '',
}) => {
  const [current, setCurrent] = useState(0);
  const total = steps.length;
  const step = steps[current];
  const isLast = current === total - 1;
  const StepIcon = step.icon;

  return (
    <div className={`flex flex-col min-h-full ${className}`}>
      {/* Read-only stepper — dots are navigable (no gating; nothing to validate). */}
      <ol className="flex items-center gap-1.5 mb-5" aria-label={labels.step(current + 1, total)}>
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <React.Fragment key={s.id}>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-current={active ? 'step' : undefined}
                  aria-label={s.title}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors cursor-pointer ${
                    done
                      ? 'bg-action text-white'
                      : active
                        ? 'bg-action-soft text-action-hover border-2 border-action'
                        : 'bg-bg-hover text-text-tertiary border border-border-subtle'
                  }`}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                </button>
              </li>
              {i < total - 1 && (
                <div className={`flex-1 h-px ${i < current ? 'bg-action' : 'bg-border-subtle'}`} />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Step content */}
      <div className="flex-1">
        <div className="text-meta text-text-tertiary uppercase tracking-wider mb-2">
          {labels.step(current + 1, total)}
        </div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-text-primary mb-2">
          {StepIcon && <StepIcon size={18} className="text-teal shrink-0" aria-hidden="true" />}
          {step.title}
        </h3>
        <div className="text-sm text-text-secondary leading-relaxed">{step.body}</div>
      </div>

      {/* Persistent honest boundary — visible on every step, not a final-screen reveal */}
      <div className="mt-6 bg-bg-hover border-l-2 border-border-input rounded px-4 py-3">
        <p className="text-xs text-text-secondary leading-relaxed">{disclaimer}</p>
        {source && (
          <a
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-action-hover hover:underline"
          >
            {source.label}
            <ExternalLink size={11} aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Nav — Back / Next / Done. No submit, ever. Pinned within the scroll area. */}
      <div className="sticky bottom-0 -mx-6 px-6 py-4 mt-4 border-t border-border-subtle bg-bg-surface flex items-center justify-between">
        <Button variant="secondary" onClick={() => setCurrent((i) => Math.max(0, i - 1))} disabled={current === 0}>
          {labels.back}
        </Button>
        {isLast ? (
          <Button variant="outline" onClick={onDone}>
            {labels.done}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setCurrent((i) => Math.min(total - 1, i + 1))}>
            {labels.next}
          </Button>
        )}
      </div>
    </div>
  );
};

export default GuidedLesson;
