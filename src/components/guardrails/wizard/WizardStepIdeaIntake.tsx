import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader, AlertCircle } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { wizardAIService } from '../../../lib/guardrails/ai/wizardAIService';
import { AIErrorBanner } from './AIErrorBanner';
import { getIdeaExampleText } from './ideaExamples';
import { getDomains } from '../../../lib/guardrails';
import { getProjectTypeById } from '../../../lib/guardrails/projectTypes';
import type { Domain } from '../../../lib/guardrailsTypes';

export function WizardStepIdeaIntake() {
  const { state, setProjectDescription, setAIProjectIntake, setAIError, setCurrentStep, disableAIForSession } = useProjectWizard();
  
  // Parse existing projectDescription if it exists (for backward compatibility)
  // For new entries, these will be empty
  const [coreIdea, setCoreIdea] = useState('');
  const [currentSituation, setCurrentSituation] = useState('');
  const [initialExpectations, setInitialExpectations] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [exampleText, setExampleText] = useState(getIdeaExampleText(null, null));

  // Load domain and project type to determine example text
  useEffect(() => {
    async function loadExampleText() {
      if (!state.domainId) {
        setExampleText(getIdeaExampleText(null, null));
        return;
      }

      try {
        // Load domain name
        const domains = await getDomains();
        const domain = domains.find(d => d.id === state.domainId);
        const domainName = domain?.name || null;

        // Load project type with example_text (if selected)
        let projectTypeExampleText = null;
        if (state.projectTypeId) {
          try {
            const projectType = await getProjectTypeById(state.projectTypeId);
            projectTypeExampleText = projectType?.example_text || null;
          } catch (err) {
            console.error('Failed to load project type:', err);
            // Continue with domain default
          }
        }

        // Get example text based on domain and project type example_text
        const examples = getIdeaExampleText(domainName, projectTypeExampleText);
        setExampleText(examples);
      } catch (error) {
        console.error('Failed to load example text:', error);
        // Fall back to generic
        setExampleText(getIdeaExampleText(null, null));
      }
    }

    loadExampleText();
  }, [state.domainId, state.projectTypeId]);

  // Load existing projectDescription into the three fields on mount (if it exists)
  // Use a ref to track if we've already loaded to prevent infinite loops
  const hasLoadedRef = useRef(false);
  
  useEffect(() => {
    // Only load once when component mounts and we have saved data, or when state.projectDescription changes
    if (state.projectDescription && !hasLoadedRef.current) {
      // Parse the combined projectDescription back into the three fields
      // Format: coreIdea\n\ncurrentSituation\n\ninitialExpectations
      const parts = state.projectDescription.split('\n\n');
      
      // New format: Always has exactly 3 parts (even if some are empty)
      if (parts.length >= 3) {
        // All three fields are present (new format)
        setCoreIdea(parts[0]?.trim() || '');
        setCurrentSituation(parts[1]?.trim() || '');
        setInitialExpectations(parts[2]?.trim() || '');
        hasLoadedRef.current = true;
      } else if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
        // Backward compatibility: Only two fields (old format)
        setCoreIdea(parts[0].trim());
        setCurrentSituation(parts[1].trim());
        hasLoadedRef.current = true;
      } else if (parts.length === 1 && parts[0].trim()) {
        // Backward compatibility: Single field (old format)
        setCoreIdea(parts[0].trim());
        hasLoadedRef.current = true;
      }
    }
  }, [state.projectDescription]);

  // Combine the three fields for AI analysis and storage
  // Always preserve all three fields (even if empty) to maintain structure for parsing
  const combineIdeaFields = (): string => {
    return [
      coreIdea.trim(),
      currentSituation.trim(),
      initialExpectations.trim(),
    ].join('\n\n');
  };

  // Update projectDescription whenever the fields change (so it saves automatically)
  useEffect(() => {
    // Always save the combined fields, even if not all are filled (for persistence)
    const combined = combineIdeaFields();
    setProjectDescription(combined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreIdea, currentSituation, initialExpectations]);

  async function handleAnalyze() {
    // Validate all three fields are filled
    if (!coreIdea.trim()) {
      setLocalError('Please describe your project idea');
      return;
    }
    if (!currentSituation.trim()) {
      setLocalError('Please describe your current situation');
      return;
    }
    if (!initialExpectations.trim()) {
      setLocalError('Please describe your initial expectations');
      return;
    }

    if (!state.projectTypeId) {
      setLocalError('Project type is required. Please go back and select a project type.');
      return;
    }

    setIsAnalyzing(true);
    setLocalError(null);
    setAIError(null);

    try {
      // Combine all three fields for AI analysis (projectDescription is already updated via useEffect)
      const combinedIdea = combineIdeaFields();
      
      const intake = await wizardAIService.analyzeProjectIdea(
        combinedIdea,
        state.projectTypeId,
        state.aiSessionId
      );

      setAIProjectIntake(intake);

      setCurrentStep(state.currentStep + 1);
    } catch (error) {
      console.error('[WIZARD] Idea analysis failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze project idea';
      setAIError(errorMessage);
      setLocalError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSkipAI() {
    disableAIForSession();
    // projectDescription is already updated via useEffect, so we can just proceed
    setCurrentStep(state.currentStep + 3);
  }

  // Check if all required fields are filled
  const canProceed = coreIdea.trim().length > 0 && 
                     currentSituation.trim().length > 0 && 
                     initialExpectations.trim().length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      {state.aiError && (
        <AIErrorBanner
          error={state.aiError}
          onContinueManually={handleSkipAI}
          onDismiss={() => setAIError(null)}
        />
      )}

      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Describe Your Project Idea</h2>
        <p className="text-sm md:text-base text-gray-600 px-2">
          Tell us what you think this project is about. Don't worry about planning or execution yet.
        </p>
      </div>

      <div className="space-y-4 md:space-y-6 mb-4 md:mb-6">
        {/* Core Idea Description */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="coreIdea" className="block text-sm font-semibold text-gray-900">
              Describe your project idea <span className="text-red-500">*</span>
            </label>
            <span className={`text-xs ${coreIdea.length > 250 ? 'text-red-600' : 'text-gray-500'}`}>
              {coreIdea.length}/250
            </span>
          </div>
          <textarea
            id="coreIdea"
            value={coreIdea}
            onChange={(e) => {
              if (e.target.value.length <= 250) {
                setCoreIdea(e.target.value);
                setLocalError(null);
              }
            }}
            placeholder={exampleText.idea}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
            rows={4}
            disabled={isAnalyzing}
            maxLength={250}
          />
          <p className="mt-2 text-sm text-gray-500">
            In your own words, describe what you think this project is about.
            <br />
            Don't worry about planning or execution yet.
          </p>
          {!coreIdea.trim() && (
            <p className="mt-2 text-sm text-red-600">This field is required</p>
          )}
        </div>

        {/* Current Situation & Starting Point */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="currentSituation" className="block text-sm font-semibold text-gray-900">
              Where are you starting from right now? <span className="text-red-500">*</span>
            </label>
            <span className={`text-xs ${currentSituation.length > 250 ? 'text-red-600' : 'text-gray-500'}`}>
              {currentSituation.length}/250
            </span>
          </div>
          <textarea
            id="currentSituation"
            value={currentSituation}
            onChange={(e) => {
              if (e.target.value.length <= 250) {
                setCurrentSituation(e.target.value);
                setLocalError(null);
              }
            }}
            placeholder={exampleText.startingPoint}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
            rows={4}
            disabled={isAnalyzing}
            maxLength={250}
          />
          <p className="mt-2 text-sm text-gray-500">
            Briefly describe your current situation as it relates to this idea.
          </p>
          {!currentSituation.trim() && (
            <p className="mt-2 text-sm text-red-600">This field is required</p>
          )}
        </div>

        {/* Initial Expectations */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="initialExpectations" className="block text-sm font-semibold text-gray-900">
              What are you expecting this project to involve? <span className="text-red-500">*</span>
            </label>
            <span className={`text-xs ${initialExpectations.length > 250 ? 'text-red-600' : 'text-gray-500'}`}>
              {initialExpectations.length}/250
            </span>
          </div>
          <textarea
            id="initialExpectations"
            value={initialExpectations}
            onChange={(e) => {
              if (e.target.value.length <= 250) {
                setInitialExpectations(e.target.value);
                setLocalError(null);
              }
            }}
            placeholder={exampleText.expectations}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
            rows={4}
            disabled={isAnalyzing}
            maxLength={250}
          />
          <p className="mt-2 text-sm text-gray-500">
            At a high level, what do you imagine this project will require from you?
          </p>
          <p className="mt-1 text-xs text-gray-400 italic">
            This is expectation capture, not planning.
          </p>
          {!initialExpectations.trim() && (
            <p className="mt-2 text-sm text-red-600">This field is required</p>
          )}
        </div>
      </div>

      {localError && (
        <div className="mb-6 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{localError}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleAnalyze}
          disabled={!canProceed || isAnalyzing}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
        >
          {isAnalyzing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Analyze & Clarify My Idea
            </>
          )}
        </button>

        <button
          onClick={handleSkipAI}
          disabled={isAnalyzing}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="You can continue without AI and clarify later"
        >
          Skip AI (Manual Setup)
        </button>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <div className="font-semibold mb-1">AI-Powered Idea Clarification</div>
            <p className="text-blue-800">
              AI will help surface assumptions and clarify what this project might realistically involve.
              <br />
              <span className="text-xs text-blue-700 italic mt-1 block">
                Note: AI will not generate plans, tasks, or recommendations at this stage.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
