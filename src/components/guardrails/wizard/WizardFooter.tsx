import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  isLastStep: boolean;
  isLoading: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  minStep?: number;
  isExistingProject?: boolean;
}

export function WizardFooter({
  currentStep,
  totalSteps,
  canProceed,
  isLastStep,
  isLoading,
  onBack,
  onNext,
  onSkip,
  minStep = 1,
  isExistingProject = false,
}: WizardFooterProps) {
  return (
    <div className="border-t bg-white px-4 md:px-6 py-3 md:py-4">
      <div className="max-w-3xl mx-auto">
        {/* Mobile: Stack buttons vertically */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Back button - full width on mobile */}
          <div className="flex items-center w-full md:w-auto">
            {currentStep > minStep && (
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 w-full md:w-auto justify-center md:justify-start"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden md:inline">{currentStep === 2 ? 'Change Domain' : 'Back'}</span>
                <span className="md:hidden">Back</span>
              </button>
            )}
          </div>

          {/* Next/Skip buttons - full width on mobile */}
          <div className="flex items-center gap-2 w-full md:w-auto md:gap-3">
            {onSkip && currentStep < totalSteps && (
              <button
                type="button"
                onClick={onSkip}
                disabled={isLoading}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 border border-gray-300 rounded-lg"
              >
                <X className="w-4 h-4" />
                <span className="hidden md:inline">Skip for now</span>
                <span className="md:hidden">Skip</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                console.log('[WIZARD FOOTER] Next button clicked', { currentStep, isLastStep, canProceed, isLoading });
                onNext();
              }}
              disabled={!canProceed || isLoading}
              className={`
                flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all min-h-[44px]
                ${
                  canProceed && !isLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden md:inline">{isExistingProject ? 'Applying...' : 'Creating...'}</span>
                  <span className="md:hidden">{isExistingProject ? 'Applying...' : 'Creating...'}</span>
                </>
              ) : isLastStep ? (
                <>
                  <span className="hidden md:inline">{isExistingProject ? 'Complete Setup' : 'Create Project'}</span>
                  <span className="md:hidden">{isExistingProject ? 'Complete' : 'Create'}</span>
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
