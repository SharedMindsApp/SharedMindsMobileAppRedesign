import { useState, useEffect } from 'react';
import { Briefcase, Heart, Lightbulb, Rocket } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getDomains, ensureDomainsExist, getMasterProjects } from '../../../lib/guardrails';
import type { Domain } from '../../../lib/guardrailsTypes';
import type { DomainType } from '../../../lib/guardrails/templateTypes';

const DOMAIN_CONFIG = {
  work: {
    icon: Briefcase,
    label: 'Work',
    color: 'blue',
    description: 'Professional projects, strategic initiatives, and career development',
    examples: 'Product launches, team initiatives, skill building',
  },
  personal: {
    icon: Heart,
    label: 'Personal',
    color: 'green',
    description: 'Life goals, personal growth, health, and family projects',
    examples: 'Fitness goals, learning new skills, home improvements',
  },
  passion: {
    icon: Lightbulb,
    label: 'Passion',
    color: 'orange',
    description: 'Creative pursuits, hobbies, and passion projects',
    examples: 'Art projects, music, writing, game development',
  },
  startup: {
    icon: Rocket,
    label: 'Startup',
    color: 'purple',
    description: 'Entrepreneurial ventures, MVPs, and business launches',
    examples: 'SaaS product, mobile app, service business',
  },
};

const COLOR_CLASSES = {
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    selected: 'border-blue-600 bg-blue-50',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  green: {
    bg: 'bg-green-50 hover:bg-green-100 border-green-200',
    selected: 'border-green-600 bg-green-50',
    icon: 'text-green-600',
    badge: 'bg-green-100 text-green-700',
  },
  orange: {
    bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    selected: 'border-orange-600 bg-orange-50',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    selected: 'border-purple-600 bg-purple-50',
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
};

type DomainName = 'work' | 'personal' | 'creative' | 'health';

const DOMAIN_NAME_TO_TYPE: Record<DomainName, DomainType> = {
  work: 'work',
  personal: 'personal',
  creative: 'startup',
  health: 'personal',
};

export function WizardStepDomainSelect() {
  const { state, existingProjectId, setDomain } = useProjectWizard();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [occupiedDomains, setOccupiedDomains] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDomains() {
      try {
        await ensureDomainsExist();
        const allDomains = await getDomains();
        setDomains(allDomains);

        const projects = await getMasterProjects();

        const occupied = new Set<string>();
        for (const project of projects) {
          if (project.status === 'active' && project.id !== existingProjectId) {
            occupied.add(project.domain_id);
          }
        }
        setOccupiedDomains(occupied);
      } catch (error) {
        console.error('Failed to load domains:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDomains();
  }, [existingProjectId]);

  const handleSelectDomain = (domain: Domain, isOccupied: boolean) => {
    if (isOccupied) return;
    const domainType = DOMAIN_NAME_TO_TYPE[domain.name as DomainName];
    setDomain(domain.id, domainType);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
          Choose Your Domain
        </h2>
        <p className="text-gray-600 text-base md:text-lg px-2">
          Select the area of life where your project belongs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {Object.entries(DOMAIN_CONFIG).map(([key, config]) => {
          const domain = domains.find(d => DOMAIN_NAME_TO_TYPE[d.name as DomainName] === key);
          if (!domain) return null;

          const Icon = config.icon;
          const colors = COLOR_CLASSES[config.color as keyof typeof COLOR_CLASSES];
          const isSelected = state.domainId === domain.id;
          const isOccupied = occupiedDomains.has(domain.id);

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectDomain(domain, isOccupied)}
              disabled={isOccupied}
              className={`
                relative p-4 md:p-6 rounded-xl border-2 text-left transition-all w-full
                ${isOccupied ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' :
                  isSelected ? colors.selected : `${colors.bg} border-transparent`}
                ${!isSelected && !isOccupied && 'hover:shadow-md'}
              `}
            >
              {isSelected && !isOccupied && (
                <div className="absolute top-4 right-4">
                  <div className={`w-6 h-6 rounded-full ${colors.badge} flex items-center justify-center`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}

              {isOccupied && (
                <div className="absolute top-4 right-4">
                  <div className="px-2 py-1 bg-gray-200 text-gray-600 rounded-md text-xs font-semibold">
                    Project Active
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 md:gap-4">
                <div className={`p-2 md:p-3 rounded-lg flex-shrink-0 ${isOccupied ? 'bg-gray-200' : colors.badge}`}>
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isOccupied ? 'text-gray-400' : colors.icon}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg md:text-xl font-semibold mb-1.5 md:mb-2 ${isOccupied ? 'text-gray-500' : 'text-gray-900'}`}>
                    {config.label}
                  </h3>
                  <p className={`text-sm mb-2 md:mb-3 ${isOccupied ? 'text-gray-400' : 'text-gray-600'}`}>
                    {config.description}
                  </p>
                  <div className={`inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-md text-xs font-medium ${
                    isOccupied ? 'bg-gray-200 text-gray-500' : colors.badge
                  }`}>
                    <span className="hidden md:inline">Examples: </span>
                    <span>{config.examples}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {state.domainId && (
        <div className="mt-4 md:mt-6 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs md:text-sm text-blue-800">
            <span className="font-semibold">Note:</span> Each domain can have one active project at a time.
            <span className="hidden md:inline"> Completed or abandoned projects can be archived to make room for new ones.</span>
          </p>
        </div>
      )}
    </div>
  );
}
