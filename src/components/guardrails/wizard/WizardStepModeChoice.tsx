import { useState } from 'react';
import { Rocket, Brain, Info, X } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';

export function WizardStepModeChoice() {
  const { setWizardMode, setCurrentStep, setUseDefaultTemplates } = useProjectWizard();
  const [showLearnMore, setShowLearnMore] = useState(false);

  const handleSelectQuick = () => {
    setWizardMode('quick');
    setUseDefaultTemplates(true); // Quick Setup always uses defaults
    setCurrentStep(1); // Start at step 1 for Quick Setup
  };

  const handleSelectRealityCheck = () => {
    setWizardMode('reality_check');
    setCurrentStep(1); // Start at step 1 for Reality Check
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
          How would you like to set up your project?
        </h2>
        <p className="text-gray-600 text-base md:text-lg">
          Choose the workflow that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        {/* Quick Setup Card */}
        <button
          onClick={handleSelectQuick}
          className="relative p-6 md:p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Rocket className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                Quick Setup
              </h3>
              <p className="text-sm md:text-base text-gray-600 mb-3">
                Get a structured project ready fast
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <span className="text-xs font-medium text-blue-700">
                  Estimated time: 2–3 minutes
                </span>
              </div>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-gray-600 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Automatically applies recommended structure</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>No deep questions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Best for momentum and getting started</span>
            </li>
          </ul>

          <div className="mt-6">
            <div className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Start Quick Setup
            </div>
          </div>
        </button>

        {/* Reality Check Card */}
        <div className="relative p-6 md:p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all group">
          {/* Learn More Button - Positioned absolutely outside main button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLearnMore(true);
            }}
            className="absolute top-4 right-4 flex-shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded p-1 transition-colors z-10"
            aria-label="Learn more about Reality Check"
          >
            <Info className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleSelectRealityCheck}
            className="w-full text-left"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1 pr-8">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                    Reality Check
                  </h3>
                </div>
                <p className="text-sm md:text-base text-gray-600 mb-3">
                  Validate and pressure-test your project
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full">
                  <span className="text-xs font-medium text-purple-700">
                    Estimated time: 10–15 minutes
                  </span>
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Uses the full Intent → Feasibility → Execution workflow</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Helps users think clearly before committing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Designed to improve long-term success</span>
              </li>
            </ul>

            <div className="mt-6">
              <div className="inline-flex items-center justify-center w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
                Start Reality Check
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Learn More Modal */}
      {showLearnMore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">About Reality Check</h3>
              <button
                onClick={() => setShowLearnMore(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-gray-700 mb-4">
                  Reality Check is a comprehensive workflow designed to help you think clearly about your project before committing time and energy. It takes around 10–15 minutes and follows three phases:
                </p>

                <div className="space-y-4">
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Intent</h4>
                    <p className="text-gray-700">
                      What are you actually trying to do? This phase helps you clarify your project's purpose, goals, and initial expectations.
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Feasibility</h4>
                    <p className="text-gray-700">
                      Is this realistic with your time, energy, and constraints? This phase helps you assess whether your project is achievable given your current situation.
                    </p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Execution</h4>
                    <p className="text-gray-700">
                      How will this become real work, not just ideas? This phase helps you structure your project with tracks, subtracks, and a clear roadmap.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-900">
                  <strong>Note:</strong> Reality Check is designed to improve long-term success by helping you validate your project idea and set realistic expectations before you begin.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowLearnMore(false)}
                  className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}