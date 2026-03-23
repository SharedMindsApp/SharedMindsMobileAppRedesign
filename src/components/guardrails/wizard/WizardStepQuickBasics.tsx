import { useState, useEffect } from 'react';
import { Briefcase, Heart, Lightbulb, Rocket } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getDomains, ensureDomainsExist } from '../../../lib/guardrails';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import { mapDomainToTemplateType } from '../../../lib/guardrails/templates';
import type { Domain } from '../../../lib/guardrailsTypes';
import type { DomainType } from '../../../lib/guardrails/templateTypes';

const DOMAIN_CONFIG = {
  work: {
    icon: Briefcase,
    label: 'Work',
    color: 'blue',
  },
  personal: {
    icon: Heart,
    label: 'Personal',
    color: 'green',
  },
  passion: {
    icon: Lightbulb,
    label: 'Passion',
    color: 'orange',
  },
  startup: {
    icon: Rocket,
    label: 'Startup',
    color: 'purple',
  },
};

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    selected: 'border-blue-600 bg-blue-50',
    icon: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50 hover:bg-green-100 border-green-200',
    selected: 'border-green-600 bg-green-50',
    icon: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    selected: 'border-orange-600 bg-orange-50',
    icon: 'text-orange-600',
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    selected: 'border-purple-600 bg-purple-50',
    icon: 'text-purple-600',
  },
};

type DomainName = 'work' | 'personal' | 'creative' | 'health';

const DOMAIN_NAME_TO_TYPE: Record<DomainName, DomainType> = {
  work: 'work',
  personal: 'personal',
  creative: 'startup',
  health: 'personal',
};

export function WizardStepQuickBasics() {
  const {
    state,
    isExistingProject,
    setDomain,
    setProjectName,
    setProjectDescription,
  } = useProjectWizard();

  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDomains() {
      try {
        await ensureDomainsExist();
        const allDomains = await getDomains();
        setDomains(allDomains);

        // If domain is already selected in state but not yet set (e.g., from existing project or previous navigation),
        // ensure it's properly configured. This handles cases where domainId exists but domainType might be missing.
        if (state.domainId && !state.domainType) {
          const existingDomain = allDomains.find(d => d.id === state.domainId);
          if (existingDomain) {
            const domainType = mapDomainToTemplateType(existingDomain.name);
            setDomain(state.domainId, domainType);
          }
        }

        // For new projects in Quick Setup, if no domain is selected yet, don't auto-select
        // Let the user explicitly choose. But if a domain is already selected (from context),
        // ensure it remains selected.
      } catch (error) {
        console.error('Failed to load domains:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDomains();
  }, [state.domainId, state.domainType, setDomain]);

  const handleDomainSelect = (domain: Domain) => {
    const domainType = mapDomainToTemplateType(domain.name);
    setDomain(domain.id, domainType);
  };

  const displayDomainConfig = state.domainId 
    ? domains.find(d => d.id === state.domainId) 
      ? getDomainConfig(domains.find(d => d.id === state.domainId)!.name)
      : null
    : null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
          Project Basics
        </h2>
        <p className="text-gray-600 text-base md:text-lg px-2">
          Give your project a name and choose a domain
        </p>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Domain Selection - always show in Quick Setup Step 1 */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Domain <span className="text-red-500">*</span>
          </label>
          {domains.length === 0 && !loading && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              No domains available. Please refresh the page.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {domains.map((domain) => {
              const domainType = mapDomainToTemplateType(domain.name);
              const config = DOMAIN_CONFIG[domainType] || DOMAIN_CONFIG.personal;
              const colors = COLOR_CLASSES[config.color];
              const Icon = config.icon;
              // CRITICAL: Always check state.domainId from context to ensure selection persists
              // This persists across navigation, page refreshes, and component re-renders
              const isSelected = state.domainId === domain.id;

              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => handleDomainSelect(domain)}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-left
                    ${isSelected ? colors.selected : `${colors.bg} border-gray-200`}
                  `}
                  aria-pressed={isSelected}
                  aria-label={`Select ${config.label} domain${isSelected ? ' (currently selected)' : ''}`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <Icon className={`w-6 h-6 ${colors.icon}`} />
                    <span className="text-sm font-medium text-gray-900">{config.label}</span>
                    {isSelected && (
                      <span className="text-xs text-gray-600 mt-1">Selected</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Show selected domain confirmation if one is selected */}
          {state.domainId && domains.length > 0 && domains.find(d => d.id === state.domainId) && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <span className="font-medium">Selected: </span>
              {domains.find(d => d.id === state.domainId)?.name || 'Domain selected'}
            </div>
          )}
        </div>

        {/* Project Name */}
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
            autoFocus={isExistingProject}
          />
        </div>

        {/* Project Description - optional */}
        <div>
          <label htmlFor="project-description" className="block text-sm font-semibold text-gray-900 mb-2">
            Description <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <textarea
            id="project-description"
            value={state.projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            placeholder="Brief description of your project..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900"
          />
        </div>
      </div>
    </div>
  );
}