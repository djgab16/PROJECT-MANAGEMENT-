import { Check } from 'lucide-react';
import './ProgressStepper.css';

interface Step {
  id?: string | number;
  label: string;
  subLabel?: string;
}

interface ProgressStepperProps {
  steps: readonly Step[];
  currentStep: number;
}

export default function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <div className="progress-stepper">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div 
            key={step.id ?? step.label} 
            className={`stepper-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
          >
            <div className="stepper-node-wrapper">
              <div className="stepper-node">
                {isCompleted ? (
                   <span className="stepper-check">
                      <Check size={14} />
                   </span>
                ) : (
                  <span className="stepper-index">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="stepper-connector" />
              )}
            </div>
            <div className="stepper-info">
              <div className="stepper-label">{step.label}</div>
              {step.subLabel && <div className="stepper-sublabel">{step.subLabel}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
