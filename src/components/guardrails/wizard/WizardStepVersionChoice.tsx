import { useState } from 'react';
import { Zap, Target, Layers, Loader, Check } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { wizardAIService } from '../../../lib/guardrails/ai/wizardAIService';
import type { VersionPreset } from '../../../lib/guardrails/ai/wizardAISchemas';
import { AIErrorBanner } from './AIErrorBanner';

const VERSION_OPTIONS: Array<{
  key: VersionPreset;
  title: string;
  icon: typeof Zap;
  description: string;
  features: string[];
  color: string;
}> = [
  {
    key: 'lean',
    title: 'Lean',
    icon: Zap,
    description: 'Fast start with essential structure',
    features: [
      '2-3 main tracks',
      '1-2 subtracks per track',
      'Key milestones only',
      'Core roadmap items',
      'Minimal mind mesh',
    ],
    color: 'blue',
  },
  {
    key: 'standard',
    title: 'Standard',
    icon: Target,
    description: 'Balanced structure for most projects',
    features: [
      '3-5 main tracks',
      '2-4 subtracks per track',
      'Detailed milestones',
      'Full roadmap with phases',
      'Comprehensive mind mesh',
    ],
    color: 'green',
  },
  {
    key: 'detailed',
    title: 'Detailed',
    icon: Layers,
    description: 'Comprehensive planning for complex projects',
    features: [
      '5-8 main tracks',
      '3-6 subtracks per track',
      'Granular milestones',
      'Extensive roadmap',
      'Rich mind mesh network',
    ],
    color: 'purple',
  },
];

export function WizardStepVersionChoice() {
  const { state, setSelectedVersion, setAIStructureDraft, setAIError, setCurrentStep } = useProjectWizard();
  const [selectedKey, setSelectedKey] = useState<VersionPreset | null>(state.selectedVersion);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSelect(version: VersionPreset) {
    if (!state.aiProjectIntake || !state.projectTypeId) {
      setAIError('Missing project data. Please go back and complete previous steps.');
      return;
    }

    setSelectedKey(version);
    setSelectedVersion(version);
    setIsGenerating(true);
    setAIError(null);

    try {
      const draft = await wizardAIService.generateProjectStructure(
        state.aiProjectIntake,
        state.aiClarificationAnswers,
        state.projectTypeId,
        state.aiSessionId,
        version
      );

      setAIStructureDraft(draft);

      setTimeout(() => {
        setCurrentStep(state.currentStep + 1);
      }, 500);
    } catch (error) {
      console.error('[WIZARD] Failed to generate structure:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to generate project structure';
      setAIError(errorMessage);
      setIsGenerating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {state.aiError && (
        <AIErrorBanner
          error={state.aiError}
          onContinueManually={() => setCurrentStep(state.currentStep + 1)}
          onDismiss={() => setAIError(null)}
        />
      )}

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Project Structure</h2>
        <p className="text-gray-600">
          Select the level of detail that fits your needs. You can always adjust later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {VERSION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedKey === option.key;
          const colorClasses = {
            blue: {
              border: 'border-blue-500',
              bg: 'bg-blue-50',
              icon: 'bg-blue-100 text-blue-600',
              button: 'bg-blue-600 hover:bg-blue-700',
              check: 'text-blue-600',
            },
            green: {
              border: 'border-green-500',
              bg: 'bg-green-50',
              icon: 'bg-green-100 text-green-600',
              button: 'bg-green-600 hover:bg-green-700',
              check: 'text-green-600',
            },
            purple: {
              border: 'border-purple-500',
              bg: 'bg-purple-50',
              icon: 'bg-purple-100 text-purple-600',
              button: 'bg-purple-600 hover:bg-purple-700',
              check: 'text-purple-600',
            },
          };

          const colors = colorClasses[option.color as keyof typeof colorClasses];

          return (
            <div
              key={option.key}
              className={`relative bg-white border-2 rounded-xl p-6 transition-all ${
                isSelected ? `${colors.border} ${colors.bg}` : 'border-gray-200 hover:border-gray-300'
              } ${isGenerating && !isSelected ? 'opacity-50' : ''}`}
            >
              {isSelected && (
                <div className={`absolute top-4 right-4 w-6 h-6 rounded-full bg-white border-2 ${colors.border} flex items-center justify-center`}>
                  <Check className={`w-4 h-4 ${colors.check}`} />
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">{option.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{option.description}</p>

              <ul className="space-y-2 mb-6">
                {option.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(option.key)}
                disabled={isGenerating}
                className={`w-full px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 ${
                  isSelected && isGenerating
                    ? 'bg-gray-400 cursor-wait'
                    : colors.button
                }`}
              >
                {isSelected && isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </span>
                ) : isSelected ? (
                  'Selected'
                ) : (
                  'Select'
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-700">
          Not sure? <strong>Standard</strong> is recommended for most projects. You can add or remove tracks anytime.
        </p>
      </div>
    </div>
  );
}
