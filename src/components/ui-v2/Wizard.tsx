import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import Button from './Button';

export interface WizardStep {
  id: string;
  title: string;
  shortTitle?: string;
  description?: string;
  content: React.ReactNode;
}

interface WizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onCancel: () => void;
  onComplete: () => void;
  isStepValid?: (step: number) => boolean;
  /** Required, not defaulted: the default was dead at 5 of 5 call sites, and
   *  a default nothing omits is a literal that cannot render. Required makes
   *  that state unrepresentable instead of merely unreached. */
  completeLabel: string;
  className?: string;
}

const Wizard: React.FC<WizardProps> = ({
  steps,
  currentStep,
  onStepChange,
  onCancel,
  onComplete,
  isStepValid,
  completeLabel,
  className = '',
}) => {
  const { t } = useTranslation();
  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const nextValid = isStepValid ? isStepValid(currentStep) : true;

  const goNext = () => {
    if (!nextValid) return;
    if (isLast) onComplete();
    else onStepChange(currentStep + 1);
  };

  const goBack = () => {
    if (currentStep > 0) onStepChange(currentStep - 1);
  };

  return (
    <div
      className={`bg-bg-surface rounded-lg shadow-md border border-border-subtle flex flex-col w-full max-w-4xl max-h-[90vh] ${className}`}
    >
      {/* Stepper */}
      <div className="border-b border-border-subtle px-8 py-5">
        <ol className="flex items-center gap-2">
          {steps.map((step, i) => {
            const completed = i < currentStep;
            const active = i === currentStep;
            const reachable = i <= currentStep;
            const label = step.shortTitle ?? step.title;
            return (
              <React.Fragment key={step.id}>
                <li className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => reachable && onStepChange(i)}
                    disabled={!reachable}
                    aria-current={active ? 'step' : undefined}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      completed
                        ? 'bg-action text-white'
                        : active
                          ? 'bg-action-soft text-action-hover border-2 border-action'
                          : 'bg-bg-hover text-text-tertiary border border-border-subtle'
                    } ${reachable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {completed ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </button>
                  <span
                    className={`text-sm hidden sm:inline ${
                      active
                        ? 'text-text-primary font-semibold'
                        : completed
                          ? 'text-text-secondary'
                          : 'text-text-tertiary'
                    }`}
                  >
                    {label}
                  </span>
                </li>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px ${
                      i < currentStep ? 'bg-action' : 'bg-border-subtle'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </div>

      {/* Header */}
      <div className="px-8 pt-6 pb-2">
        <h2 className="text-xl font-semibold text-text-primary">
          {current.title}
        </h2>
        {current.description && (
          <p className="text-sm text-text-secondary mt-1">
            {current.description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-4">{current.content}</div>

      {/* Footer */}
      <div className="border-t border-border-subtle px-8 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-text-tertiary hover:text-text-secondary font-medium"
        >
          {t('wizard.cancel')}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={goBack}
            disabled={currentStep === 0}
          >
            {t('wizard.back')}
          </Button>
          <Button variant="outline" onClick={goNext} disabled={!nextValid}>
            {isLast ? completeLabel : t('wizard.next')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Wizard;
