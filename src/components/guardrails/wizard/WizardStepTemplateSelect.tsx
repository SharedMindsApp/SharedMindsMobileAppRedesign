import { useState, useEffect } from 'react';
import { Check, Layers, User, Sparkles, Plus, Briefcase, Heart, Lightbulb, Rocket, ChevronDown, ChevronRight } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getTemplatesForDomain } from '../../../lib/guardrails/templates';
import { getDomains } from '../../../lib/guardrails';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import { CreateTemplateModal } from './CreateTemplateModal';
import type { AnyTrackTemplateWithSubTracks } from '../../../lib/guardrails/templateTypes';
import type { DomainType } from '../../../lib/guardrails/templateTypes';
import type { Domain } from '../../../lib/guardrailsTypes';

const DOMAIN_CONFIG: Record<DomainType, { icon: any; label: string; color: string }> = {
  work: { icon: Briefcase, label: 'Work', color: 'blue' },
  personal: { icon: Heart, label: 'Personal', color: 'green' },
  passion: { icon: Lightbulb, label: 'Passion', color: 'orange' },
  startup: { icon: Rocket, label: 'Startup', color: 'violet' },
};

export function WizardStepTemplateSelect() {
  const {
    state,
    setUseDefaultTemplates,
    setSelectedDefaultTemplateIds: setContextSelectedDefaultTemplateIds,
    setSelectedSystemTemplateIds,
    setSelectedUserTemplateIds,
    setAvailableTemplates,
  } = useProjectWizard();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<AnyTrackTemplateWithSubTracks[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [selectedDefaultTemplateIds, setSelectedDefaultTemplateIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (!state.domainType) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadTemplates = async () => {
      setLoading(true);
      try {
        const allTemplates = await getTemplatesForDomain(state.domainType!);
        if (isMounted) {
          setTemplates(allTemplates);
          setAvailableTemplates(allTemplates);

          // Sync default templates with context state (for existing projects with pre-selected templates)
          if (state.selectedDefaultTemplateIds.length > 0) {
            // Use pre-selected templates from context (e.g., when loading existing project)
            setSelectedDefaultTemplateIds(state.selectedDefaultTemplateIds);
            setContextSelectedDefaultTemplateIds(state.selectedDefaultTemplateIds);
          } else {
            // Initialize default templates if useDefaultTemplates is true
            const defaults = allTemplates.filter(t => 'is_default' in t && t.is_default);
            if (state.useDefaultTemplates) {
              const defaultIds = defaults.map(t => t.id).filter((id): id is string => !!id);
              setSelectedDefaultTemplateIds(defaultIds);
              setContextSelectedDefaultTemplateIds(defaultIds);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.domainType, refreshTrigger]);

  const handleTemplateCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const isUserTemplate = (template: AnyTrackTemplateWithSubTracks): boolean => {
    return !('is_default' in template);
  };

  const isDefaultTemplate = (template: AnyTrackTemplateWithSubTracks): boolean => {
    return 'is_default' in template && template.is_default;
  };

  const isSystemTemplate = (template: AnyTrackTemplateWithSubTracks): boolean => {
    return 'is_default' in template && !template.is_default;
  };

  const getDomainBadge = (domainType: DomainType) => {
    const config = DOMAIN_CONFIG[domainType];
    const Icon = config.icon;
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600">
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    );
  };

  const handleToggleSystemTemplate = (templateId: string) => {
    if (!templateId || typeof templateId !== 'string' || templateId === 'undefined') {
      console.error('Invalid template ID passed to handleToggleSystemTemplate:', templateId);
      return;
    }

    if (state.selectedSystemTemplateIds.includes(templateId)) {
      setSelectedSystemTemplateIds(
        state.selectedSystemTemplateIds.filter(id => id !== templateId)
      );
    } else {
      setSelectedSystemTemplateIds([...state.selectedSystemTemplateIds, templateId]);
    }
  };

  const handleToggleUserTemplate = (templateId: string) => {
    if (!templateId || typeof templateId !== 'string' || templateId === 'undefined') {
      console.error('Invalid template ID passed to handleToggleUserTemplate:', templateId);
      return;
    }

    if (state.selectedUserTemplateIds.includes(templateId)) {
      setSelectedUserTemplateIds(
        state.selectedUserTemplateIds.filter(id => id !== templateId)
      );
    } else {
      setSelectedUserTemplateIds([...state.selectedUserTemplateIds, templateId]);
    }
  };

  const handleToggleDefaultTemplate = (templateId: string) => {
    if (!templateId || typeof templateId !== 'string' || templateId === 'undefined') {
      console.error('Invalid template ID passed to handleToggleDefaultTemplate:', templateId);
      return;
    }

    const newIds = selectedDefaultTemplateIds.includes(templateId)
      ? selectedDefaultTemplateIds.filter(id => id !== templateId)
      : [...selectedDefaultTemplateIds, templateId];

    setSelectedDefaultTemplateIds(newIds);
    setContextSelectedDefaultTemplateIds(newIds);
  };

  const toggleExpandTemplate = (templateId: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const defaultTemplates = templates.filter(isDefaultTemplate);
  const systemTemplates = templates.filter(isSystemTemplate);
  const userTemplates = templates.filter(isUserTemplate);

  const getTotalSubtracksCount = () => {
    let count = 0;

    selectedDefaultTemplateIds.forEach(id => {
      const template = defaultTemplates.find(t => t.id === id);
      if (template) {
        count += template.subtracks.length;
      }
    });

    state.selectedSystemTemplateIds.forEach(id => {
      const template = systemTemplates.find(t => t.id === id);
      if (template) {
        count += template.subtracks.length;
      }
    });

    state.selectedUserTemplateIds.forEach(id => {
      const template = userTemplates.find(t => t.id === id);
      if (template) {
        count += template.subtracks.length;
      }
    });

    return count;
  };

  const getTotalTracksCount = () => {
    let count = 0;
    count += selectedDefaultTemplateIds.length;
    count += state.selectedSystemTemplateIds.length;
    count += state.selectedUserTemplateIds.length;
    return count;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Use actual domain name for display, but domain type for template filtering
  const displayDomainConfig = domain ? getDomainConfig(domain.name) : null;
  const domainConfig = state.domainType ? DOMAIN_CONFIG[state.domainType] : null;
  const DomainIcon = displayDomainConfig?.icon || domainConfig?.icon;

  const renderTemplateCard = (
    template: AnyTrackTemplateWithSubTracks,
    isSelected: boolean,
    onToggle: () => void,
    accentColor: string
  ) => {
    if (!template.id) {
      console.warn('Cannot render template without ID:', template);
      return null;
    }

    const isExpanded = expandedTemplates.has(template.id);
    const hasSubtracks = template.subtracks && template.subtracks.length > 0;

    return (
      <div
        key={template.id}
        className={`
          rounded-lg border-2 transition-all overflow-hidden
          ${isSelected
            ? `bg-${accentColor}-50 border-${accentColor}-600`
            : 'bg-white border-gray-200'
          }
        `}
        style={isSelected ? {
          backgroundColor: `${accentColor === 'blue' ? '#eff6ff' : accentColor === 'green' ? '#f0fdf4' : accentColor === 'purple' ? '#faf5ff' : '#eff6ff'}`,
          borderColor: `${accentColor === 'blue' ? '#2563eb' : accentColor === 'green' ? '#16a34a' : accentColor === 'purple' ? '#9333ea' : '#2563eb'}`
        } : undefined}
      >
        <button
          type="button"
          onClick={onToggle}
          className="w-full p-4 text-left transition-all hover:bg-opacity-70"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                  ${isSelected
                    ? `border-${accentColor}-600`
                    : 'border-gray-300'
                  }
                `}
                style={isSelected ? {
                  backgroundColor: `${accentColor === 'blue' ? '#2563eb' : accentColor === 'green' ? '#16a34a' : accentColor === 'purple' ? '#9333ea' : '#2563eb'}`,
                  borderColor: `${accentColor === 'blue' ? '#2563eb' : accentColor === 'green' ? '#16a34a' : accentColor === 'purple' ? '#9333ea' : '#2563eb'}`
                } : undefined}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="font-semibold text-gray-900 text-sm md:text-base truncate">{template.name}</div>
                  {getDomainBadge(template.domain_type)}
                </div>
                {template.description && (
                  <div className="text-xs md:text-sm text-gray-600 mt-1">{template.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-1.5 md:mt-2">
                  {template.subtracks.length} subtrack{template.subtracks.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </button>

        {hasSubtracks && (
          <div className="px-4 pb-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpandTemplate(template.id);
              }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium">
                {isExpanded ? 'Hide' : 'Show'} subtracks ({template.subtracks.length})
              </span>
            </button>

            {isExpanded && (
              <div className="mt-2 md:mt-3 space-y-1.5 pl-4 md:pl-6">
                {template.subtracks.map((subtrack, index) => (
                  <div
                    key={subtrack.id}
                    className="flex items-start gap-2 py-1.5 px-2.5 md:px-3 bg-white bg-opacity-60 rounded text-xs md:text-sm min-w-0"
                  >
                    <span className="text-gray-400 font-mono text-xs flex-shrink-0">{index + 1}.</span>
                    <span className="font-medium text-gray-900 min-w-0 truncate">{subtrack.name}</span>
                    {subtrack.description && (
                      <span className="text-gray-500 text-xs hidden md:inline">— {subtrack.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Choose Templates
        </h2>
        <p className="text-gray-600 text-lg">
          Select track templates to structure your project workflow
        </p>

        {displayDomainConfig && DomainIcon && (
          <div className="mt-4 flex items-center justify-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${displayDomainConfig.colors.light} rounded-full border ${displayDomainConfig.colors.border}`}>
              <DomainIcon className={`w-4 h-4 ${displayDomainConfig.colors.text}`} />
              <span className={`text-sm font-medium ${displayDomainConfig.colors.text}`}>
                Project Domain: <span className="font-bold text-gray-900">{displayDomainConfig.name}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 md:mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 bg-white border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all font-medium text-sm md:text-base min-h-[44px]"
        >
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          Create Custom Template
        </button>
      </div>

      {templates.length === 0 && !loading && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-amber-800 font-medium">
              No templates found for this domain. <span className="hidden sm:inline">Create a custom template to get started.</span>
            </span>
          </div>
        </div>
      )}

      {templates.length > 0 && (
        <div className="mb-4 md:mb-6 p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm text-gray-600">
          Showing {templates.length} template{templates.length !== 1 ? 's' : ''} for{' '}
          <span className="font-semibold">{displayDomainConfig?.name || domainConfig?.label}</span> domain
          <span className="hidden sm:inline"> ({defaultTemplates.length} default, {systemTemplates.length} additional, {userTemplates.length} custom)</span>
        </div>
      )}

      {defaultTemplates.length > 0 && (
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Recommended Templates ({defaultTemplates.length})
            </h3>
          </div>
          <div className="mb-2 md:mb-3 p-2.5 md:p-3 bg-green-50 border border-green-200 rounded-lg text-xs md:text-sm text-green-800">
            <span className="hidden sm:inline">These are the recommended starting templates for your domain. </span>Click to select or deselect.
          </div>
          <div className="space-y-2">
            {defaultTemplates.map(template =>
              renderTemplateCard(
                template,
                selectedDefaultTemplateIds.includes(template.id),
                () => handleToggleDefaultTemplate(template.id),
                'green'
              )
            )}
          </div>
        </div>
      )}

      {systemTemplates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Additional System Templates ({systemTemplates.length})
            </h3>
          </div>
          <div className="space-y-2">
            {systemTemplates.map(template =>
              renderTemplateCard(
                template,
                state.selectedSystemTemplateIds.includes(template.id),
                () => handleToggleSystemTemplate(template.id),
                'blue'
              )
            )}
          </div>
        </div>
      )}

      {userTemplates.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Your Custom Templates ({userTemplates.length})
            </h3>
          </div>
          <div className="space-y-2">
            {userTemplates.map(template =>
              renderTemplateCard(
                template,
                state.selectedUserTemplateIds.includes(template.id),
                () => handleToggleUserTemplate(template.id),
                'purple'
              )
            )}
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 font-medium">
            Selected: {getTotalTracksCount()} tracks, {getTotalSubtracksCount()} subtracks
          </span>
          {selectedDefaultTemplateIds.length === 0 &&
           state.selectedSystemTemplateIds.length === 0 &&
           state.selectedUserTemplateIds.length === 0 && (
            <span className="text-amber-600 font-medium">
              Select at least one template to continue
            </span>
          )}
        </div>
      </div>

      {showCreateModal && state.domainType && (
        <CreateTemplateModal
          domainType={state.domainType}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleTemplateCreated}
        />
      )}
    </div>
  );
}
