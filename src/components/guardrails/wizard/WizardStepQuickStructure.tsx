import { useState, useEffect } from 'react';
import { Check, Layers, User, Sparkles, Plus, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { getTemplatesForDomain } from '../../../lib/guardrails/templates';
import { getDomains } from '../../../lib/guardrails';
import { getDomainConfig } from '../../../lib/guardrails/domainConfig';
import { CreateTemplateModal } from './CreateTemplateModal';
import type { AnyTrackTemplateWithSubTracks } from '../../../lib/guardrails/templateTypes';
import type { DomainType } from '../../../lib/guardrails/templateTypes';
import type { Domain } from '../../../lib/guardrailsTypes';

export function WizardStepQuickStructure() {
  const {
    state,
    setSelectedDefaultTemplateIds,
    setSelectedSystemTemplateIds,
    setSelectedUserTemplateIds,
    setAvailableTemplates,
  } = useProjectWizard();

  const [templates, setTemplates] = useState<AnyTrackTemplateWithSubTracks[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [localSelectedDefaultTemplateIds, setLocalSelectedDefaultTemplateIds] = useState<string[]>([]);
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

          // CRITICAL: Always auto-select default templates if none are selected
          // This ensures the Next button is active by default when Step 2 loads
          if (state.selectedDefaultTemplateIds.length === 0 && 
              state.selectedSystemTemplateIds.length === 0 && 
              state.selectedUserTemplateIds.length === 0) {
            const defaults = allTemplates.filter(t => 'is_default' in t && t.is_default);
            const defaultIds = defaults.map(t => t.id).filter((id): id is string => !!id);
            
            // Update both local state and context state
            // This ensures validation passes immediately
            if (defaultIds.length > 0) {
              setLocalSelectedDefaultTemplateIds(defaultIds);
              setSelectedDefaultTemplateIds(defaultIds); // Update context - this triggers re-render and enables Next button
            }
          } else {
            // Sync with context state if templates were already selected
            setLocalSelectedDefaultTemplateIds(state.selectedDefaultTemplateIds);
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

    const newIds = localSelectedDefaultTemplateIds.includes(templateId)
      ? localSelectedDefaultTemplateIds.filter(id => id !== templateId)
      : [...localSelectedDefaultTemplateIds, templateId];

    setLocalSelectedDefaultTemplateIds(newIds); // Update local state
    setSelectedDefaultTemplateIds(newIds); // Update context
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

    localSelectedDefaultTemplateIds.forEach(id => {
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
    count += localSelectedDefaultTemplateIds.length;
    count += state.selectedSystemTemplateIds.length;
    count += state.selectedUserTemplateIds.length;
    return count;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const displayDomainConfig = domain ? getDomainConfig(domain.name) : null;
  const DomainIcon = displayDomainConfig?.icon;

  const renderTemplateCard = (
    template: AnyTrackTemplateWithSubTracks,
    isSelected: boolean,
    onToggle: () => void,
    accentColor: 'green' | 'blue' | 'purple'
  ) => {
    if (!template.id) {
      console.warn('Cannot render template without ID:', template);
      return null;
    }

    const isExpanded = expandedTemplates.has(template.id);
    const hasSubtracks = template.subtracks && template.subtracks.length > 0;

    const colorClasses = {
      green: {
        bg: 'bg-green-50',
        border: 'border-green-600',
        check: 'border-green-600 bg-green-600',
        text: 'text-green-600',
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-600',
        check: 'border-blue-600 bg-blue-600',
        text: 'text-blue-600',
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-600',
        check: 'border-purple-600 bg-purple-600',
        text: 'text-purple-600',
      },
    };

    const colors = colorClasses[accentColor];

    return (
      <div
        key={template.id}
        className={`
          rounded-lg border-2 transition-all overflow-hidden
          ${isSelected ? `${colors.bg} ${colors.border}` : 'bg-white border-gray-200'}
        `}
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
                  ${isSelected ? colors.check : 'border-gray-300'}
                `}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm md:text-base truncate">
                  {template.name}
                </div>
                {template.description && (
                  <div className="text-xs md:text-sm text-gray-600 mt-1">
                    {template.description}
                  </div>
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
                    <span className="text-gray-400 font-mono text-xs flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span className="font-medium text-gray-900 min-w-0 truncate">
                      {subtrack.name}
                    </span>
                    {subtrack.description && (
                      <span className="text-gray-500 text-xs hidden md:inline">
                        — {subtrack.description}
                      </span>
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
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="text-center mb-6 md:mb-8">
        <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Project Structure
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-blue-600 transition-colors p-1"
            aria-label="Learn more about project structure"
            title="Templates help structure your project with tracks and subtracks. Select recommended templates or create your own."
          >
            <Info className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <p className="text-gray-600 text-base md:text-lg px-2">
          Select templates to structure your project. You can select multiple templates and create custom ones.
        </p>

        {displayDomainConfig && DomainIcon && (
          <div className="mt-4 flex items-center justify-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 ${displayDomainConfig.colors.light} rounded-full border ${displayDomainConfig.colors.border}`}
            >
              <DomainIcon className={`w-4 h-4 ${displayDomainConfig.colors.text}`} />
              <span className={`text-sm font-medium ${displayDomainConfig.colors.text}`}>
                Domain: <span className="font-bold text-gray-900">{displayDomainConfig.name}</span>
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
              No templates found for this domain.{' '}
              <span className="hidden sm:inline">Create a custom template to get started.</span>
            </span>
          </div>
        </div>
      )}

      {templates.length > 0 && (
        <div className="mb-4 md:mb-6 p-2.5 md:p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs md:text-sm text-gray-600">
          Showing {templates.length} template{templates.length !== 1 ? 's' : ''} for{' '}
          <span className="font-semibold">{displayDomainConfig?.name}</span> domain
          <span className="hidden sm:inline">
            {' '}
            ({defaultTemplates.length} recommended, {systemTemplates.length} additional,{' '}
            {userTemplates.length} custom)
          </span>
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
            <span className="hidden sm:inline">
              These are the recommended starting templates for your domain.{' '}
            </span>
            Click to select or deselect.
          </div>
          <div className="space-y-2">
            {defaultTemplates.map((template) =>
              renderTemplateCard(
                template,
                localSelectedDefaultTemplateIds.includes(template.id),
                () => handleToggleDefaultTemplate(template.id),
                'green'
              )
            )}
          </div>
        </div>
      )}

      {systemTemplates.length > 0 && (
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Layers className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Additional Templates ({systemTemplates.length})
            </h3>
          </div>
          <div className="space-y-2">
            {systemTemplates.map((template) =>
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
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <User className="w-4 h-4 md:w-5 md:h-5 text-purple-600 flex-shrink-0" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              Custom Templates ({userTemplates.length})
            </h3>
          </div>
          <div className="space-y-2">
            {userTemplates.map((template) =>
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
          {localSelectedDefaultTemplateIds.length === 0 &&
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
