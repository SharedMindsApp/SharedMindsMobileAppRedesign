import React, { useState, useEffect } from 'react';
import { Edit2, ChevronDown, ChevronUp, Briefcase, Heart, Lightbulb, Rocket, Loader2, AlertCircle } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getDomains } from '../../../lib/guardrails';
import { getProjectTypeById } from '../../../lib/guardrails/projectTypes';
import type { Domain } from '../../../lib/guardrailsTypes';
import { performInitialRealityCheck, type ProjectIntentSnapshot } from '../../../lib/guardrails/ai/realityCheckService';

const DOMAIN_ICONS: Record<string, any> = {
  work: Briefcase,
  personal: Heart,
  passion: Lightbulb,
  startup: Rocket,
  health: Heart,
  creative: Lightbulb,
};

// ProjectIntentSnapshot is now imported from realityCheckService

export function WizardStepReview() {
  const { state, setCurrentStep, setRealityCheckResult } = useProjectWizard();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [projectTypeName, setProjectTypeName] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'idea', 'goals', 'clarify']));
  const [snapshot, setSnapshot] = useState<ProjectIntentSnapshot | null>(null);
  const [isRunningRealityCheck, setIsRunningRealityCheck] = useState(false);
  const [realityCheckError, setRealityCheckError] = useState<string | null>(null);

  // Load domain and project type names
  useEffect(() => {
    async function loadData() {
      if (state.domainId) {
        try {
          const domains = await getDomains();
          const foundDomain = domains.find(d => d.id === state.domainId);
          setDomain(foundDomain || null);
        } catch (error) {
          console.error('Failed to load domain:', error);
        }
      }

      if (state.projectTypeId) {
        try {
          const projectType = await getProjectTypeById(state.projectTypeId);
          setProjectTypeName(projectType?.name || null);
        } catch (error) {
          console.error('Failed to load project type:', error);
        }
      }
    }

    loadData();
  }, [state.domainId, state.projectTypeId]);

  // Parse projectDescription to extract idea fields
  useEffect(() => {
    const ideaParts = state.projectDescription.split('\n\n');
    const idea = {
      description: ideaParts[0]?.trim() || '',
      startingPoint: ideaParts[1]?.trim() || '',
      expectations: ideaParts[2]?.trim() || '',
    };

    const clarifySignals = state.clarifySignals || {
      timeExpectation: null,
      weeklyCommitment: null,
      experienceLevel: null,
      dependencyLevel: null,
      resourceAssumption: null,
      scopeClarity: null,
    };

    // Build context notes from optional context fields
    const contextNotes: Record<string, string> = {};
    if (state.clarifySignals) {
      if (state.clarifySignals.timeExpectationContext) {
        contextNotes.timeExpectation = state.clarifySignals.timeExpectationContext;
      }
      if (state.clarifySignals.weeklyCommitmentContext) {
        contextNotes.weeklyCommitment = state.clarifySignals.weeklyCommitmentContext;
      }
      if (state.clarifySignals.experienceLevelContext) {
        contextNotes.experienceLevel = state.clarifySignals.experienceLevelContext;
      }
      if (state.clarifySignals.dependencyLevelContext) {
        contextNotes.dependencyLevel = state.clarifySignals.dependencyLevelContext;
      }
      if (state.clarifySignals.resourceAssumptionContext) {
        contextNotes.resourceAssumption = state.clarifySignals.resourceAssumptionContext;
      }
      if (state.clarifySignals.scopeClarityContext) {
        contextNotes.scopeClarity = state.clarifySignals.scopeClarityContext;
      }
    }

    setSnapshot({
      domain: domain?.name || null,
      projectType: projectTypeName,
      projectName: state.projectName,
      idea,
      goals: state.aspirationalGoals || [],
      clarifySignals: {
        ...clarifySignals,
        contextNotes: Object.keys(contextNotes).length > 0 ? contextNotes : undefined,
      },
    });
  }, [state.projectDescription, state.clarifySignals, state.aspirationalGoals, state.projectName, domain, projectTypeName]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  const handleRunRealityCheck = async () => {
    if (!snapshot) {
      setRealityCheckError('Cannot run reality check: snapshot data is missing');
      return;
    }

    setIsRunningRealityCheck(true);
    setRealityCheckError(null);

    try {
      const result = await performInitialRealityCheck(snapshot);
      
      // Store the result in context
      setRealityCheckResult(result);

      // Route based on recommendedOutcome
      // For now, we'll proceed to the next step regardless
      // TODO: Implement reframe flow for 'reframe' and 'strong_reframe' outcomes
      setCurrentStep(state.currentStep + 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run reality check';
      setRealityCheckError(errorMessage);
      console.error('Reality check failed:', error);
    } finally {
      setIsRunningRealityCheck(false);
    }
  };

  if (!snapshot) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        <div className="text-center">
          <p className="text-gray-600">Loading review...</p>
        </div>
      </div>
    );
  }

  const DomainIcon = domain?.name ? DOMAIN_ICONS[domain.name.toLowerCase()] || Lightbulb : Lightbulb;

  const clarifyLabels: Record<string, string> = {
    timeExpectation: 'Time horizon',
    weeklyCommitment: 'Weekly commitment',
    experienceLevel: 'Prior experience',
    dependencyLevel: 'External dependencies',
    resourceAssumption: 'Resource expectations',
    scopeClarity: 'Scope clarity',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
          Review Your Project Intent
        </h2>
        <p className="text-sm md:text-base text-gray-600 px-2">
          This is a summary of what you've shared. Everything below will be used for an initial reality check.
        </p>
      </div>

      <div className="space-y-3 md:space-y-4">
        {/* 1. Project Overview */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
            <button
              onClick={() => toggleSection('overview')}
              className="flex items-center gap-2 md:gap-3 flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <DomainIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              </div>
              <h3 className="text-base md:text-lg font-medium text-gray-900 truncate">Project Overview</h3>
            </button>
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <button
                onClick={() => handleEdit(1)}
                className="inline-flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1.5 text-xs md:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-h-[36px] md:min-h-[40px]"
              >
                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => toggleSection('overview')}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                {expandedSections.has('overview') ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {expandedSections.has('overview') && (
            <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-gray-200">
              <div className="pt-4 space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Domain</div>
                  <div className="text-base text-gray-900">{snapshot.domain || 'Not selected'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Project Type</div>
                  <div className="text-base text-gray-900">{snapshot.projectType || 'Not selected'}</div>
                </div>
                {snapshot.projectName && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Project Name</div>
                    <div className="text-base font-medium text-gray-900">{snapshot.projectName}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. Project Idea */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
            <button
              onClick={() => toggleSection('idea')}
              className="flex items-center gap-2 md:gap-3 flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
              </div>
              <h3 className="text-base md:text-lg font-medium text-gray-900 truncate">Project Idea</h3>
            </button>
            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <button
                onClick={() => handleEdit(4)}
                className="inline-flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1.5 text-xs md:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-h-[36px] md:min-h-[40px]"
              >
                <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => toggleSection('idea')}
                className="p-1 hover:bg-gray-100 rounded transition-colors min-h-[36px] md:min-h-[40px] flex items-center justify-center"
              >
                {expandedSections.has('idea') ? (
                  <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {expandedSections.has('idea') && (
            <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-gray-200">
              <div className="pt-4 space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">Describe your project idea</div>
                  <div className="text-base text-gray-900 whitespace-pre-wrap">
                    {snapshot.idea.description || <span className="text-gray-400 italic">Not provided</span>}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">Where are you starting from right now?</div>
                  <div className="text-base text-gray-900 whitespace-pre-wrap">
                    {snapshot.idea.startingPoint || <span className="text-gray-400 italic">Not provided</span>}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">What are you expecting this project to involve?</div>
                  <div className="text-base text-gray-900 whitespace-pre-wrap">
                    {snapshot.idea.expectations || <span className="text-gray-400 italic">Not provided</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Goals & Motivation */}
        {snapshot.goals.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
              <button
                onClick={() => toggleSection('goals')}
                className="flex items-center gap-2 md:gap-3 flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
              >
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
                <h3 className="text-base md:text-lg font-medium text-gray-900 truncate">Goals & Motivation</h3>
              </button>
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(5)}
                  className="inline-flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1.5 text-xs md:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-h-[36px] md:min-h-[40px]"
                >
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => toggleSection('goals')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors min-h-[36px] md:min-h-[40px] flex items-center justify-center"
                >
                  {expandedSections.has('goals') ? (
                    <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {expandedSections.has('goals') && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-gray-200">
                <div className="pt-4">
                  <ul className="space-y-2">
                    {snapshot.goals.map((goal, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 font-medium mt-0.5">{index + 1}.</span>
                        <span className="text-base text-gray-900">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Clarify Signals */}
        {snapshot.clarifySignals && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
              <button
                onClick={() => toggleSection('clarify')}
                className="flex items-center gap-2 md:gap-3 flex-1 text-left hover:opacity-80 transition-opacity min-w-0"
              >
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                </div>
                <h3 className="text-base md:text-lg font-medium text-gray-900 truncate">Clarify Signals</h3>
              </button>
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEdit(6)}
                  className="inline-flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1.5 text-xs md:text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors min-h-[36px] md:min-h-[40px]"
                >
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => toggleSection('clarify')}
                  className="p-1 hover:bg-gray-100 rounded transition-colors min-h-[36px] md:min-h-[40px] flex items-center justify-center"
                >
                  {expandedSections.has('clarify') ? (
                    <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {expandedSections.has('clarify') && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-gray-200">
                <div className="pt-4">
                  <div className="space-y-3">
                    {Object.entries(clarifyLabels).map(([key, label]) => {
                      const value = snapshot.clarifySignals[key as keyof typeof snapshot.clarifySignals] as string | null;
                      const contextNote = snapshot.clarifySignals.contextNotes?.[key];
                      
                      if (!value) return null;

                      return (
                        <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="text-sm font-medium text-gray-500 min-w-[140px]">{label}</div>
                            <div className="text-base text-gray-900 flex-1 text-right">{value}</div>
                          </div>
                          {contextNote && (
                            <div className="mt-2 ml-[140px] text-sm text-gray-600 italic">
                              {contextNote}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!snapshot.clarifySignals.timeExpectation &&
                     !snapshot.clarifySignals.weeklyCommitment &&
                     !snapshot.clarifySignals.experienceLevel &&
                     !snapshot.clarifySignals.dependencyLevel &&
                     !snapshot.clarifySignals.resourceAssumption &&
                     !snapshot.clarifySignals.scopeClarity && (
                      <div className="text-sm text-gray-500 italic">No clarify signals provided</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Informational Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-base font-semibold text-blue-900 mb-3">
            What This Review Is Used For
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Run an initial reality check</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Identify mismatches or assumptions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Suggest reframing if needed</span>
            </li>
          </ul>
          <p className="mt-3 text-sm text-blue-700 italic">
            You won't be judged — this is about alignment, not correctness.
          </p>
        </div>
      </div>

      {/* Final Confirmation */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex flex-col items-center gap-4">
          {realityCheckError && (
            <div className="w-full max-w-md p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Reality check failed</p>
                <p className="text-sm text-red-700 mt-1">{realityCheckError}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleRunRealityCheck}
            disabled={isRunningRealityCheck}
            className="w-full max-w-md px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isRunningRealityCheck ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Reality Check...
              </>
            ) : (
              <>
                ➡️ Run Initial Reality Check
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 text-center">
            This uses the information above — nothing else.
          </p>
        </div>
      </div>
    </div>
  );
}
