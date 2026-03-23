import { useState, useEffect } from 'react';
import { Calendar, Briefcase, Heart, Lightbulb, Rocket, RefreshCw } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import type { DomainType } from '../../../lib/guardrails/templateTypes';
import { getDomains } from '../../../lib/guardrails';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import type { Domain } from '../../../lib/guardrailsTypes';

export function WizardStepProjectDetails() {
  const {
    state,
    isExistingProject,
    setCurrentStep,
    setExistingProjectId,
    setProjectName,
    setProjectDescription,
    setGenerateInitialRoadmap,
  } = useProjectWizard();

  const [domain, setDomain] = useState<Domain | null>(null);

  // Load actual domain name for display
  useEffect(() => {
    async function loadDomain() {
      if (state.domainId) {
        try {
          const domains = await getDomains();
          const selectedDomain = domains.find(d => d.id === state.domainId);
          setDomain(selectedDomain || null);
        } catch (error) {
          console.error('Failed to load domain:', error);
        }
      } else {
        setDomain(null);
      }
    }

    loadDomain();
  }, [state.domainId]);

  const displayDomainConfig = domain ? getDomainConfig(domain.name) : null;
  const DomainIcon = displayDomainConfig?.icon;

  const handleChangeDomain = () => {
    if (isExistingProject) {
      setExistingProjectId(null);
    }
    setCurrentStep(1);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
          Name Your Project
        </h2>
        <p className="text-gray-600 text-base md:text-lg px-2">
          Give your project a clear, descriptive name
        </p>

        {displayDomainConfig && DomainIcon && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 px-4">
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 rounded-full w-full sm:w-auto justify-center">
              <DomainIcon className={`w-4 h-4 text-${displayDomainConfig.color}-600 flex-shrink-0`} />
              <span className="text-xs md:text-sm font-medium text-gray-700">
                <span className="hidden sm:inline">Project Domain: </span>
                <span className="font-bold">{displayDomainConfig.name}</span>
              </span>
            </div>
            <button
              onClick={handleChangeDomain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors w-full sm:w-auto justify-center"
            >
              <RefreshCw className="w-4 h-4" />
              Change
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 md:space-y-6">
        <div>
          <label htmlFor="project-name" className="block text-sm font-semibold text-gray-900 mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="project-name"
            value={state.projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Q1 Product Launch, Website Redesign, Fitness Journey..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            autoFocus
          />
          {!state.projectName.trim() && (
            <p className="mt-2 text-sm text-gray-500">
              Choose a name that clearly identifies the project's purpose
            </p>
          )}
        </div>

        <div>
          <label htmlFor="project-description" className="block text-sm font-semibold text-gray-900 mb-2">
            Description <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            id="project-description"
            value={state.projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Add more details about your project goals, scope, or context..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
          />
          <p className="mt-2 text-sm text-gray-500">
            Provide context to help keep your team aligned on goals
          </p>
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex items-center h-5 mt-0.5">
              <input
                type="checkbox"
                checked={state.generateInitialRoadmap}
                onChange={(e) => setGenerateInitialRoadmap(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold text-gray-900 group-hover:text-gray-700">
                <Calendar className="w-4 h-4" />
                Generate Initial Roadmap Preview
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Creates placeholder roadmap items for each subtrack to help you get started.
                You can customize or delete these later.
              </p>
            </div>
          </label>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-1">Pro Tips</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>Include timeframes in the name (Q1 2024, Summer Project)</li>
                <li>Be specific about the outcome or goal</li>
                <li>Keep it under 50 characters for better readability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
