import { useState, useEffect, useMemo } from 'react';
import { Target, Calendar, CheckCircle2, ArrowLeft, ArrowRight, Info, X, AlertCircle, Plus, Search } from 'lucide-react';
import { useProjectWizard, type WizardTrackSetupState } from '../../../contexts/ProjectWizardContext';
import type { AnyTrackTemplateWithSubTracks } from '../../../lib/guardrails/templateTypes';
import { getTracksForProject } from '../../../lib/guardrails/tracks';
import { getUniversalTrackInfoMapByProject, saveUniversalTrackInfo } from '../../../lib/guardrails/universalTrackInfo';
import { getTemplatesForDomain, createTrackFromTemplate } from '../../../lib/guardrails/templates';
import { getProjectTrackCategories, createCustomCategory, SYSTEM_CATEGORY_DEFINITIONS, seedSystemCategoriesForProject, type ProjectTrackCategory } from '../../../lib/guardrails/trackCategories';
import { BottomSheet } from '../../shared/BottomSheet';
import { sortCategoriesByRelevance } from '../../../lib/guardrails/categoryOrdering';
import { createMasterProject } from '../../../lib/guardrails';
import { isUserTrackTemplate, createTrackFromUserTemplate as createTrackFromUserTemplateUtil } from '../../../lib/guardrails/userTemplates';

export function WizardStepQuickTrackSetup() {
  const {
    state,
    setWizardTrackSetup,
    updateWizardTrackSetup,
    setCurrentStep,
    isExistingProject,
    existingProjectId,
    setExistingProjectId,
    setAvailableTemplates,
  } = useProjectWizard();

  // Current track index (0-based)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showTrackInfoModal, setShowTrackInfoModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [trackIdMap, setTrackIdMap] = useState<Map<string, string>>(new Map()); // templateId -> trackId
  
  // Category selector state
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [categories, setCategories] = useState<ProjectTrackCategory[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryDescription, setCustomCategoryDescription] = useState('');
  const [showCustomCategoryForm, setShowCustomCategoryForm] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Load existing tracks and universal track info for existing projects
  useEffect(() => {
    async function loadExistingTracks() {
      if (!isExistingProject || !existingProjectId || !state.domainId) {
        return;
      }

      try {
        // Get existing tracks
        const tracks = await getTracksForProject(existingProjectId);
        
        // Get existing universal track info
        const trackInfoMap = await getUniversalTrackInfoMapByProject(existingProjectId);

        // If no tracks exist, we need to initialize from templates
        if (tracks.length === 0) {
          // Load templates if not already loaded
          if (state.availableTemplates.length === 0 && state.domainType) {
            const templates = await getTemplatesForDomain(state.domainType);
            setAvailableTemplates(templates);
          }
          
          // Initialize from selected templates (will be handled by the template initialization effect)
          return;
        }

        // Build template ID to track ID mapping
        const newTrackIdMap = new Map<string, string>();
        const existingSetup: WizardTrackSetupState[] = [];

        // Load templates if not already loaded (needed for matching)
        if (state.availableTemplates.length === 0 && state.domainType) {
          const templates = await getTemplatesForDomain(state.domainType);
          setAvailableTemplates(templates);
        }

        // Match tracks to templates by name or template_id
        for (const track of tracks) {
          // Try to find matching template
          const template = state.availableTemplates.find(
            t => {
              // Match by template_id if track has it in metadata
              const trackTemplateId = (track as any).template_id || (track as any).metadata?.template_id;
              if (trackTemplateId && t.id === trackTemplateId) {
                return true;
              }
              // Match by name as fallback
              return t.name === (track as any).name;
            }
          ) as AnyTrackTemplateWithSubTracks | undefined;

          if (template) {
            newTrackIdMap.set(template.id, (track as any).id);
            
            // Load existing universal track info if available
            const existingInfo = trackInfoMap.get((track as any).id);
            
            existingSetup.push({
              trackTemplateId: template.id,
              trackId: (track as any).id,
              trackName: (track as any).name,
              trackCategoryId: (existingInfo as any)?.track_category_id || '', // Will be set by user if missing
              objective: existingInfo?.objective || '',
              definitionOfDone: existingInfo?.definition_of_done || '',
              timeMode: (existingInfo?.time_mode as any) || 'unscheduled',
              startDate: existingInfo?.start_date || undefined,
              endDate: existingInfo?.end_date || undefined,
              targetDate: existingInfo?.target_date || undefined,
            });
          }
        }

        setTrackIdMap(newTrackIdMap);
        
        // Only set if we have existing tracks, otherwise initialize from templates
        if (existingSetup.length > 0) {
          setWizardTrackSetup(existingSetup);
        }
      } catch (error) {
        console.error('Failed to load existing tracks:', error);
        // Continue with template-based initialization
      }
    }

    loadExistingTracks();
  }, [isExistingProject, existingProjectId, state.domainId, state.domainType, state.availableTemplates, setAvailableTemplates, setWizardTrackSetup]);

  // Load categories for existing projects
  useEffect(() => {
    async function loadCategories() {
      if (isExistingProject && existingProjectId) {
        try {
          const projectCategories = await getProjectTrackCategories(existingProjectId);
          setCategories(projectCategories);
        } catch (error) {
          console.error('Failed to load categories:', error);
          // For existing projects, use system categories as fallback
          setCategories([]);
        }
      } else {
        // For new projects, categories will be seeded when project is created
        // For now, use empty array - categories will be available after project creation
        setCategories([]);
      }
    }

    loadCategories();
  }, [isExistingProject, existingProjectId]);

  // Load templates and initialize track setup (for new projects OR existing projects with no tracks)
  useEffect(() => {
    // Initialize from templates if:
    // 1. New project (!isExistingProject), OR
    // 2. Existing project but setup is still empty (no tracks found)
    if (state.domainType && (!isExistingProject || (isExistingProject && state.wizardTrackSetup.length === 0))) {
      async function loadAndInitialize() {
        try {
          // Load templates
          const templates = await getTemplatesForDomain(state.domainType!);
          setAvailableTemplates(templates);

          // Only initialize if wizardTrackSetup is empty
          if (state.wizardTrackSetup.length === 0) {
            // Build initial setup from selected templates
            const allSelectedTemplateIds = [
              ...state.selectedDefaultTemplateIds,
              ...state.selectedSystemTemplateIds,
              ...state.selectedUserTemplateIds,
            ];

            if (allSelectedTemplateIds.length === 0) {
              return;
            }

            const initialSetup: WizardTrackSetupState[] = [];

            allSelectedTemplateIds.forEach(templateId => {
              const template = templates.find(
                t => t.id === templateId
              ) as AnyTrackTemplateWithSubTracks | undefined;

              if (template) {
                initialSetup.push({
                  trackTemplateId: template.id,
                  trackName: template.name,
                  trackCategoryId: '', // Will be set by user in the UI
                  objective: '',
                  definitionOfDone: '',
                  timeMode: 'unscheduled',
                });
              }
            });

            if (initialSetup.length > 0) {
              setWizardTrackSetup(initialSetup);
            }
          }
        } catch (error) {
          console.error('Failed to load templates:', error);
        }
      }
      loadAndInitialize();
    }
  }, [
    isExistingProject,
    state.domainType,
    state.selectedDefaultTemplateIds,
    state.selectedSystemTemplateIds,
    state.selectedUserTemplateIds,
    state.wizardTrackSetup.length,
    setAvailableTemplates,
    setWizardTrackSetup,
  ]);

  const currentTrack = state.wizardTrackSetup[currentTrackIndex];
  const totalTracks = state.wizardTrackSetup.length;
  const isLastTrack = currentTrackIndex === totalTracks - 1;
  const isFirstTrack = currentTrackIndex === 0;

  // Validate current track
  const isCurrentTrackValid = useMemo(() => {
    if (!currentTrack) return false;

    // Required fields
    if (!currentTrack.objective.trim()) return false;
    if (!currentTrack.definitionOfDone.trim()) return false;
    if (!currentTrack.timeMode) return false;
    if (!currentTrack.trackCategoryId) return false;

    // Date validation based on time mode
    if (currentTrack.timeMode === 'target') {
      if (!currentTrack.targetDate) return false;
    } else if (currentTrack.timeMode === 'ranged') {
      if (!currentTrack.startDate || !currentTrack.endDate) return false;
      // Validate end date is after start date
      if (currentTrack.startDate && currentTrack.endDate) {
        if (new Date(currentTrack.endDate) < new Date(currentTrack.startDate)) {
          return false;
        }
      }
    }

    return true;
  }, [currentTrack]);

  // Validation errors for current track
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!currentTrack) return errors;

    if (!currentTrack.objective.trim()) {
      errors.push('Objective is required');
    }

    if (!currentTrack.definitionOfDone.trim()) {
      errors.push('Definition of Done is required');
    }

    if (!currentTrack.trackCategoryId) {
      errors.push('Track category is required');
    }

    if (currentTrack.timeMode === 'target' && !currentTrack.targetDate) {
      errors.push('Target date is required');
    }

    if (currentTrack.timeMode === 'ranged') {
      if (!currentTrack.startDate) {
        errors.push('Start date is required');
      }
      if (!currentTrack.endDate) {
        errors.push('End date is required');
      }
      if (currentTrack.startDate && currentTrack.endDate) {
        if (new Date(currentTrack.endDate) < new Date(currentTrack.startDate)) {
          errors.push('End date must be after start date');
        }
      }
    }

    return errors;
  }, [currentTrack]);

  const handleNext = async () => {
    if (!isCurrentTrackValid || !currentTrack) {
      return;
    }

    // Save current track before proceeding
    setSaving(true);
    setSaveError(null);

    try {
      let projectId = existingProjectId;
      
      // For new projects, create the project first if it doesn't exist
      if (!isExistingProject && !projectId) {
        if (!state.domainId || !state.domainType || !state.projectName) {
          throw new Error('Project information is incomplete');
        }

        // Create the project
        const project = await createMasterProject(state.domainId, state.projectName, state.projectDescription || undefined);
        projectId = project.id;
        setExistingProjectId(project.id);

        // Seed system categories
        await seedSystemCategoriesForProject(project.id, state.domainType);
        
        // Reload categories
        const projectCategories = await getProjectTrackCategories(project.id);
        setCategories(projectCategories);
      }

      if (!projectId) {
        throw new Error('Project ID is required');
      }

      let trackId = currentTrack.trackId;

      // If track doesn't exist yet, create it from template
      if (!trackId && currentTrack.trackTemplateId) {
        const template = state.availableTemplates.find(t => t.id === currentTrack.trackTemplateId);
        if (!template) {
          throw new Error('Template not found');
        }

        const isUser = await isUserTrackTemplate(currentTrack.trackTemplateId);
        
        if (isUser) {
          const track = await createTrackFromUserTemplateUtil({
            master_project_id: projectId,
            user_track_template_id: currentTrack.trackTemplateId,
            include_subtracks: true,
          });
          trackId = track.id;
        } else {
          const result = await createTrackFromTemplate({
            master_project_id: projectId,
            track_template_id: currentTrack.trackTemplateId,
            domain_type: state.domainType || undefined,
            include_subtracks: true,
          });
          trackId = result.track.id;
        }

        // Update wizard state with the created track ID
        updateWizardTrackSetup(currentTrackIndex, { trackId });
        
        // Update trackIdMap
        setTrackIdMap(prev => new Map(prev).set(currentTrack.trackTemplateId, trackId!));
      }

      if (!trackId) {
        throw new Error('Track ID is required');
      }

      // Save universal track info
      await saveUniversalTrackInfo({
        master_project_id: projectId,
        track_id: trackId,
        track_category_id: currentTrack.trackCategoryId || null,
        objective: currentTrack.objective.trim(),
        definition_of_done: currentTrack.definitionOfDone.trim(),
        time_mode: currentTrack.timeMode,
        start_date: currentTrack.startDate || null,
        end_date: currentTrack.endDate || null,
        target_date: currentTrack.targetDate || null,
      });

      // Move to next track
      if (currentTrackIndex < totalTracks - 1) {
        setCurrentTrackIndex(currentTrackIndex + 1);
      }
    } catch (error) {
      console.error('Failed to save track info:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save track information');
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex(currentTrackIndex - 1);
    }
  };

  const handleObjectiveChange = (value: string) => {
    updateWizardTrackSetup(currentTrackIndex, { objective: value });
  };

  const handleDefinitionOfDoneChange = (value: string) => {
    updateWizardTrackSetup(currentTrackIndex, { definitionOfDone: value });
  };

  const handleTimeModeChange = (mode: 'unscheduled' | 'target' | 'ranged' | 'ongoing') => {
    // Clear date fields when switching modes
    updateWizardTrackSetup(currentTrackIndex, {
      timeMode: mode,
      startDate: undefined,
      endDate: undefined,
      targetDate: undefined,
    });
  };

  const handleStartDateChange = (value: string) => {
    updateWizardTrackSetup(currentTrackIndex, { startDate: value });
  };

  const handleEndDateChange = (value: string) => {
    updateWizardTrackSetup(currentTrackIndex, { endDate: value });
  };

  const handleTargetDateChange = (value: string) => {
    updateWizardTrackSetup(currentTrackIndex, { targetDate: value });
  };

  const handleCategorySelect = (categoryId: string) => {
    updateWizardTrackSetup(currentTrackIndex, { trackCategoryId: categoryId });
    setShowCategorySelector(false);
  };

  const handleCreateCustomCategory = async () => {
    if (!isExistingProject || !existingProjectId || !customCategoryName.trim()) {
      return;
    }

    setCreatingCategory(true);
    setCategoryError(null);

    try {
      const newCategory = await createCustomCategory({
        master_project_id: existingProjectId,
        name: customCategoryName.trim(),
        description: customCategoryDescription.trim() || undefined,
      });

      // Add to categories list
      setCategories([...categories, newCategory]);
      
      // Select the new category
      handleCategorySelect(newCategory.id);
      
      // Reset form
      setCustomCategoryName('');
      setCustomCategoryDescription('');
      setShowCustomCategoryForm(false);
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  // Get available categories (for existing projects) or system categories (for new projects)
  const availableCategories = useMemo(() => {
    if (isExistingProject && categories.length > 0) {
      return categories;
    }
    // For new projects, return empty array - categories will be available after project creation
    // For now, we'll use SYSTEM_CATEGORY_DEFINITIONS as a reference but can't select yet
    return [];
  }, [isExistingProject, categories]);

  // Order categories by relevance to the current track template
  const orderedCategories = useMemo(() => {
    // If no categories available, return empty array
    if (availableCategories.length === 0) {
      return [];
    }

    // If no current track or template ID, return categories in alphabetical order
    if (!currentTrack?.trackTemplateId) {
      return [...availableCategories].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Find the template for the current track
    const template = state.availableTemplates.find(
      t => t.id === currentTrack.trackTemplateId
    );

    if (!template) {
      // Fallback to alphabetical if template not found
      return [...availableCategories].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Sort by relevance to the template
    return sortCategoriesByRelevance(availableCategories, template);
  }, [availableCategories, currentTrack, state.availableTemplates]);

  const selectedCategory = orderedCategories.find(cat => cat.id === currentTrack?.trackCategoryId);

  // Filter categories based on search query (applied AFTER relevance sorting)
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) {
      return orderedCategories;
    }

    const query = categorySearchQuery.toLowerCase().trim();
    return orderedCategories.filter(cat => {
      const nameMatch = cat.name.toLowerCase().includes(query);
      const descriptionMatch = cat.description?.toLowerCase().includes(query);
      return nameMatch || descriptionMatch;
    });
  }, [orderedCategories, categorySearchQuery]);

  const filteredSystemCategories = filteredCategories.filter(cat => cat.is_system);
  const filteredCustomCategories = filteredCategories.filter(cat => !cat.is_system);

  if (totalTracks === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        <div className="text-center space-y-4">
          <p className="text-red-600 font-semibold text-lg">
            We couldn't initialise your project tracks.
          </p>
          <p className="text-gray-600 text-sm">
            Please go back and reselect your templates.
          </p>
          <button
            onClick={() => setCurrentStep(2)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Go back to Structure
          </button>
        </div>
      </div>
    );
  }

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      {/* Header */}
      <div className="text-center mb-6 md:mb-8">
        <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            Set up your project tracks
          </h2>
          <button
            type="button"
            onClick={() => setShowTrackInfoModal(true)}
            className="text-gray-400 hover:text-blue-600 transition-colors p-1"
            aria-label="Learn more about tracks"
          >
            <Info className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <p className="text-gray-600 text-base md:text-lg px-2">
          Each track needs a clear objective and sense of direction. This helps your project work properly from day one.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Track {currentTrackIndex + 1} of {totalTracks}
          </span>
          <span className="text-xs text-gray-500">
            ~30 seconds per track
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentTrackIndex + 1) / totalTracks) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Track Name */}
      <div className="mb-6 md:mb-8">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
          {currentTrack.trackName}
        </h3>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Objective */}
        <div>
          <label htmlFor="objective" className="block text-sm font-medium text-gray-700 mb-2">
            What is the main objective of this track? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="objective"
            value={currentTrack.objective}
            onChange={(e) => handleObjectiveChange(e.target.value)}
            placeholder="e.g., Research market opportunities and validate product-market fit"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
          />
        </div>

        {/* Track Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What is this track mainly for? <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowCategorySelector(true)}
            className={`w-full px-4 py-3 border-2 rounded-lg text-left transition-colors ${
              currentTrack.trackCategoryId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {selectedCategory ? (
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{selectedCategory.name}</span>
                {selectedCategory.description && (
                  <span className="text-sm text-gray-500 ml-2">{selectedCategory.description}</span>
                )}
              </div>
            ) : (
              <span className="text-gray-500">Select a category...</span>
            )}
          </button>
        </div>

        {/* Time Intent */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Time intent <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="timeMode"
                value="unscheduled"
                checked={currentTrack.timeMode === 'unscheduled'}
                onChange={() => handleTimeModeChange('unscheduled')}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Unscheduled / exploratory</div>
                <div className="text-sm text-gray-600">No specific timeline</div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="timeMode"
                value="target"
                checked={currentTrack.timeMode === 'target'}
                onChange={() => handleTimeModeChange('target')}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Target date</div>
                <div className="text-sm text-gray-600">Complete by a specific date</div>
                {currentTrack.timeMode === 'target' && (
                  <div className="mt-3">
                    <input
                      type="date"
                      value={currentTrack.targetDate || ''}
                      onChange={(e) => handleTargetDateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="timeMode"
                value="ranged"
                checked={currentTrack.timeMode === 'ranged'}
                onChange={() => handleTimeModeChange('ranged')}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Date range</div>
                <div className="text-sm text-gray-600">Work within a specific period</div>
                {currentTrack.timeMode === 'ranged' && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start date</label>
                      <input
                        type="date"
                        value={currentTrack.startDate || ''}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End date</label>
                      <input
                        type="date"
                        value={currentTrack.endDate || ''}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        min={currentTrack.startDate || undefined}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="timeMode"
                value="ongoing"
                checked={currentTrack.timeMode === 'ongoing'}
                onChange={() => handleTimeModeChange('ongoing')}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Ongoing</div>
                <div className="text-sm text-gray-600">Continuous work without an end date</div>
              </div>
            </label>
          </div>
        </div>

        {/* Definition of Done */}
        <div>
          <label htmlFor="definitionOfDone" className="block text-sm font-medium text-gray-700 mb-2">
            How will you know this track is complete? <span className="text-red-500">*</span>
          </label>
          <textarea
            id="definitionOfDone"
            value={currentTrack.definitionOfDone}
            onChange={(e) => handleDefinitionOfDoneChange(e.target.value)}
            placeholder="e.g., Market research report completed and validated with 10 customer interviews"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm md:text-base"
          />
          <p className="mt-1 text-xs text-gray-500">1-2 sentences max</p>
        </div>

        {/* Save Error */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900 mb-1">Failed to save</div>
                <div className="text-sm text-red-700">{saveError}</div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm font-medium text-red-900 mb-2">Please fix the following:</div>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstTrack}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isFirstTrack
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Previous Track
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!isCurrentTrackValid || isLastTrack || saving}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
            !isCurrentTrackValid || isLastTrack || saving
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Next Track
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Track Info Modal */}
      {showTrackInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">What is a Track?</h3>
              <button
                onClick={() => setShowTrackInfoModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Tracks organize your project work</h4>
                <p className="text-gray-700">
                  A track is a major area of focus or work stream in your project. Think of tracks as the main categories that structure your project and help you organize everything you need to do.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Why we set up tracks</h4>
                <p className="text-gray-700 mb-3">
                  Setting up tracks with clear objectives helps your project work properly from day one. Each track needs:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-2">
                  <li><strong>An objective:</strong> What you're trying to achieve in this track</li>
                  <li><strong>A definition of done:</strong> How you'll know the track is complete</li>
                  <li><strong>Time intent:</strong> When you plan to work on it (or if it's ongoing)</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Example</h4>
                <p className="text-blue-900 text-sm">
                  For a product launch project, you might have tracks like "Market Research", "Product Development", and "Marketing". Each track has its own objective, timeline, and completion criteria.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-2">What happens next?</h4>
                <p className="text-gray-700">
                  Once you complete this setup, your tracks will be created and you can start adding roadmap items, tasks, and other work to each track. This structure helps you stay organized and make progress on your project.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowTrackInfoModal(false)}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selector Bottom Sheet */}
      <BottomSheet
        isOpen={showCategorySelector}
        onClose={() => {
          setShowCategorySelector(false);
          setShowCustomCategoryForm(false);
          setCategorySearchQuery('');
          setCustomCategoryName('');
          setCustomCategoryDescription('');
          setCategoryError(null);
        }}
        title="Select Track Category"
        maxHeight="80vh"
      >
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={categorySearchQuery}
              onChange={(e) => setCategorySearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {categorySearchQuery && (
              <button
                type="button"
                onClick={() => setCategorySearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Add Custom Category Button (only for existing projects) - Moved to top */}
          {isExistingProject && existingProjectId && !showCustomCategoryForm && (
            <button
              type="button"
              onClick={() => setShowCustomCategoryForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add custom category
            </button>
          )}

          {/* Custom Category Form */}
          {showCustomCategoryForm && isExistingProject && existingProjectId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="e.g., User Experience"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={customCategoryDescription}
                  onChange={(e) => setCustomCategoryDescription(e.target.value)}
                  placeholder="Brief description of this category"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                />
              </div>
              {categoryError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {categoryError}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomCategoryForm(false);
                    setCustomCategoryName('');
                    setCustomCategoryDescription('');
                    setCategoryError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustomCategory}
                  disabled={!customCategoryName.trim() || creatingCategory}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingCategory ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          )}

          {/* Search Results Count */}
          {categorySearchQuery && (
            <div className="text-sm text-gray-500 px-1">
              {filteredCategories.length === 0
                ? 'No categories found'
                : `${filteredCategories.length} ${filteredCategories.length === 1 ? 'category' : 'categories'} found`}
            </div>
          )}

          {/* No Results Message */}
          {categorySearchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No categories match your search.</p>
              <p className="text-xs mt-1">Try a different search term or clear the search.</p>
            </div>
          )}

          {/* System Categories */}
          {filteredSystemCategories.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-2 px-1">
                Project Purpose Categories (Default)
              </div>
              <div className="space-y-2">
                {filteredSystemCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategorySelect(category.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      currentTrack.trackCategoryId === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{category.name}</div>
                    {category.description && (
                      <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Categories */}
          {filteredCustomCategories.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1">
                Custom Project Categories
              </div>
              <div className="space-y-2">
                {filteredCustomCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategorySelect(category.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      currentTrack.trackCategoryId === category.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{category.name}</div>
                    {category.description && (
                      <div className="text-sm text-gray-600 mt-1">{category.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </BottomSheet>
    </div>
  );
}
