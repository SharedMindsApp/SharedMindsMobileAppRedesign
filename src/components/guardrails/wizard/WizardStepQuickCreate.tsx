import { useMemo, useState, useEffect } from 'react';
import { Edit2, Briefcase, Heart, Lightbulb, Rocket, Check, Calendar, Target } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getDomains } from '../../../lib/guardrails';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import type { Domain } from '../../../lib/guardrailsTypes';
import type { AnyTrackTemplateWithSubTracks } from '../../../lib/guardrails/templateTypes';

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

const TIME_MODE_LABELS: Record<string, string> = {
  unscheduled: 'Unscheduled',
  target: 'Target Date',
  ranged: 'Date Range',
  ongoing: 'Ongoing',
};

export function WizardStepQuickCreate() {
  const { state, setCurrentStep } = useProjectWizard();
  const [domain, setDomain] = useState<Domain | null>(null);

  // Load domain name for display
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

  // Map domain name to DomainName for getDomainConfig
  // DomainName is 'work' | 'personal' | 'creative' | 'health'
  // Domain names from DB might be different (e.g., 'passion', 'startup')
  const getDomainNameForConfig = (domainName: string): 'work' | 'personal' | 'creative' | 'health' => {
    const normalized = domainName.toLowerCase();
    if (normalized === 'work') return 'work';
    if (normalized === 'personal' || normalized === 'passion') return 'personal';
    if (normalized === 'startup' || normalized === 'creative') return 'creative';
    if (normalized === 'health') return 'health';
    return 'personal'; // default
  };

  const displayDomainConfig = domain ? getDomainConfig(getDomainNameForConfig(domain.name)) : null;
  const DomainIcon = displayDomainConfig?.icon || (state.domainType ? DOMAIN_CONFIG[state.domainType]?.icon : Briefcase);

  // Build track summary from wizard track setup and available templates
  const trackSummary = useMemo(() => {
    return state.wizardTrackSetup.map(setup => {
      // Find template to get track name and subtracks
      const template = state.availableTemplates.find(
        t => t.id === setup.trackTemplateId
      ) as AnyTrackTemplateWithSubTracks | undefined;

      return {
        trackName: setup.trackName || template?.name || 'Unknown Track',
        objective: setup.objective,
        definitionOfDone: setup.definitionOfDone,
        timeMode: setup.timeMode,
        startDate: setup.startDate,
        endDate: setup.endDate,
        targetDate: setup.targetDate,
        subtrackCount: template && 'subtracks' in template ? template.subtracks.length : 0,
      };
    });
  }, [state.wizardTrackSetup, state.availableTemplates]);

  // Get selected template names
  const selectedTemplateNames = useMemo(() => {
    const allSelectedTemplateIds = [
      ...state.selectedDefaultTemplateIds,
      ...state.selectedSystemTemplateIds,
      ...state.selectedUserTemplateIds,
    ];

    return allSelectedTemplateIds
      .map(id => {
        const template = state.availableTemplates.find(t => t.id === id);
        return template?.name;
      })
      .filter((name): name is string => !!name);
  }, [
    state.selectedDefaultTemplateIds,
    state.selectedSystemTemplateIds,
    state.selectedUserTemplateIds,
    state.availableTemplates,
  ]);

  const totalTracks = selectedTemplateNames.length;
  const totalSubtracks = trackSummary.reduce((sum, track) => sum + track.subtrackCount, 0);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTimeMode = (track: typeof trackSummary[0]) => {
    switch (track.timeMode) {
      case 'target':
        return track.targetDate ? `Target: ${formatDate(track.targetDate)}` : 'Target Date (not set)';
      case 'ranged':
        if (track.startDate && track.endDate) {
          return `${formatDate(track.startDate)} → ${formatDate(track.endDate)}`;
        }
        return 'Date Range (incomplete)';
      case 'ongoing':
        return track.startDate ? `Ongoing (since ${formatDate(track.startDate)})` : 'Ongoing';
      case 'unscheduled':
      default:
        return 'Unscheduled';
    }
  };

  const handleEditBasics = () => {
    setCurrentStep(1);
  };

  const handleEditStructure = () => {
    setCurrentStep(2);
  };

  const handleEditTracks = () => {
    setCurrentStep(3);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      {/* Header */}
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">
          Review & Create
        </h2>
        <p className="text-gray-600 text-base md:text-lg">
          Review your project setup. Click "Create Project" when you're ready.
        </p>
      </div>

      {/* Project Basics */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 md:p-6 mb-4 md:mb-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Project Basics</h3>
          <button
            type="button"
            onClick={handleEditBasics}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden md:inline">Edit</span>
          </button>
        </div>

        <div className="space-y-3 md:space-y-4">
          {/* Project Name */}
          <div>
            <div className="text-xs md:text-sm font-medium text-gray-500 mb-1">Project Name</div>
            <div className="text-base md:text-lg text-gray-900 font-medium">{state.projectName}</div>
          </div>

          {/* Domain */}
          {state.domainType && (
            <div>
              <div className="text-xs md:text-sm font-medium text-gray-500 mb-1">Domain</div>
              <div className="flex items-center gap-2">
                {DomainIcon && (
                  <DomainIcon className={`w-4 h-4 md:w-5 md:h-5 ${
                    state.domainType === 'work' ? 'text-blue-600' :
                    state.domainType === 'personal' ? 'text-green-600' :
                    state.domainType === 'passion' ? 'text-orange-600' :
                    'text-purple-600'
                  }`} />
                )}
                <span className="text-base md:text-lg text-gray-900">
                  {domain?.name || DOMAIN_CONFIG[state.domainType]?.label || state.domainType}
                </span>
              </div>
            </div>
          )}

          {/* Description (if provided) */}
          {state.projectDescription && (
            <div>
              <div className="text-xs md:text-sm font-medium text-gray-500 mb-1">Description</div>
              <div className="text-sm md:text-base text-gray-700 whitespace-pre-wrap">
                {state.projectDescription}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structure */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 md:p-6 mb-4 md:mb-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">Structure</h3>
          <button
            type="button"
            onClick={handleEditStructure}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden md:inline">Edit</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm md:text-base text-gray-700">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>
              <strong className="font-semibold text-gray-900">{totalTracks}</strong> track{totalTracks !== 1 ? 's' : ''} selected
            </span>
          </div>
          {selectedTemplateNames.length > 0 && (
            <div className="pl-7 space-y-1.5">
              {selectedTemplateNames.map((name, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  {name}
                </div>
              ))}
            </div>
          )}
          {totalSubtracks > 0 && (
            <div className="pl-7 text-sm text-gray-500">
              {totalSubtracks} subtrack{totalSubtracks !== 1 ? 's' : ''} will be created
            </div>
          )}
        </div>
      </div>

      {/* Track Setup */}
      {trackSummary.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 md:p-6 mb-4 md:mb-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900">Track Setup</h3>
            <button
              type="button"
              onClick={handleEditTracks}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden md:inline">Edit</span>
            </button>
          </div>

          <div className="space-y-4 md:space-y-5">
            {trackSummary.map((track, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 md:p-5 bg-gray-50">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                    <h4 className="text-base md:text-lg font-semibold text-gray-900">{track.trackName}</h4>
                  </div>
                  {track.subtrackCount > 0 && (
                    <div className="text-xs md:text-sm text-gray-500 ml-6 md:ml-7">
                      {track.subtrackCount} subtrack{track.subtrackCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5 md:space-y-3 ml-6 md:ml-7">
                  {/* Objective */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Objective</div>
                    <div className="text-sm md:text-base text-gray-900">{track.objective}</div>
                  </div>

                  {/* Definition of Done */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Definition of Done</div>
                    <div className="text-sm md:text-base text-gray-900">{track.definitionOfDone}</div>
                  </div>

                  {/* Time Mode */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Time Intent</div>
                    <div className="flex items-center gap-2 text-sm md:text-base text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span>{formatTimeMode(track)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-5">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 md:w-6 md:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm md:text-base font-semibold text-blue-900 mb-1">
              Ready to Create
            </div>
            <div className="text-xs md:text-sm text-blue-800">
              Your project will be created with {totalTracks} track{totalTracks !== 1 ? 's' : ''}
              {totalSubtracks > 0 && ` and ${totalSubtracks} subtrack${totalSubtracks !== 1 ? 's' : ''}`}.
              You can add more tracks and customize your project after creation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
