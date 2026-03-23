import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  steps: Array<{ number: number; label: string }>;
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  return (
    <div className="w-full py-4 md:py-6 overflow-x-auto">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4 md:px-6 min-w-max md:min-w-0">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1 min-w-[60px] md:min-w-0">
            <div className="flex flex-col items-center relative flex-1 w-full">
              <div
                className={`
                  w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition-all flex-shrink-0
                  ${
                    currentStep > step.number
                      ? 'bg-green-600 text-white'
                      : currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {currentStep > step.number ? (
                  <Check className="w-4 h-4 md:w-5 md:h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-1.5 md:mt-2 text-[10px] md:text-xs font-medium whitespace-nowrap text-center
                  ${
                    currentStep >= step.number
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  }
                `}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`
                  h-0.5 md:h-1 flex-1 mx-1 md:mx-2 transition-all flex-shrink-0
                  ${
                    currentStep > step.number
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }
                `}
                style={{ marginTop: '-24px' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
