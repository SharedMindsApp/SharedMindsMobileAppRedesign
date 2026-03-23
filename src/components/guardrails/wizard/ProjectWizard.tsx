import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ProjectWizardProvider, useProjectWizard } from '../../../contexts/ProjectWizardContext';
import { useActiveProject } from '../../../contexts/ActiveProjectContext';
import { setActiveProjectId } from '../../../state/activeDataContext';
import { WizardProgress } from './WizardProgress';
import { WizardFooter } from './WizardFooter';
import { WizardContextDisplay } from './WizardContextDisplay';
import { WizardStepModeChoice } from './WizardStepModeChoice';
import { WizardStepQuickBasics } from './WizardStepQuickBasics';
import { WizardStepQuickStructure } from './WizardStepQuickStructure';
import { WizardStepQuickTrackSetup } from './WizardStepQuickTrackSetup';
import { WizardStepQuickCreate } from './WizardStepQuickCreate';
import { WizardValidationScreen } from './WizardValidationScreen';
import { WizardStepDomainSelect } from './WizardStepDomainSelect';
import { WizardStepProjectTypeSelect } from './WizardStepProjectTypeSelect';
import { WizardStepTemplateSelect } from './WizardStepTemplateSelect';
import { WizardStepProjectDetails } from './WizardStepProjectDetails';
import { WizardStepIdeaIntake } from './WizardStepIdeaIntake';
import { WizardStepGoals } from './WizardStepGoals';
import { WizardStepClarification } from './WizardStepClarification';
import { WizardStepVersionChoice } from './WizardStepVersionChoice';
import { WizardStepReview } from './WizardStepReview';
import { createProjectWithWizard, addTracksToProject, getMasterProjectById, getDomains } from '../../../lib/guardrails';
import { markWizardCompleted, markWizardSkipped } from '../../../lib/guardrails/wizardHelpers';
import { mapDomainToTemplateType } from '../../../lib/guardrails/templates';
import type { DomainType } from '../../../lib/guardrails/templateTypes';
import { createProjectFromDraft } from '../../../lib/guardrails/wizardDraftCreation';
import { getAppliedTemplateIdsForProject } from '../../../lib/guardrails/wizard';
import { getProjectLifecyclePhase } from '../../../lib/guardrails/projectLifecycle';
import type { MasterProject } from '../../../lib/guardrailsTypes';
import type { Track } from '../../../lib/guardrails/tracksTypes';

// Quick Setup steps
const QUICK_SETUP_STEPS = [
  { number: 1, label: 'Basics' },
  { number: 2, label: 'Structure' },
  { number: 3, label: 'Roadmap' },
  { number: 4, label: 'Create' },
];

// Phase 1 (Intent) steps - Domain, Project Type, Details, Idea, Goals, Clarify, Review
const PHASE_1_STEPS = [
  { number: 1, label: 'Domain' },
  { number: 2, label: 'Project Type' },
  { number: 3, label: 'Details' },
  { number: 4, label: 'Idea' },
  { number: 5, label: 'Goals' },
  { number: 6, label: 'Clarify' },
  { number: 7, label: 'Review' },
];

// Legacy steps for backward compatibility (when not in phase-aware mode)
const LEGACY_WIZARD_STEPS = [
  { number: 1, label: 'Domain' },
  { number: 2, label: 'Project Type' },
  { number: 3, label: 'Templates' },
  { number: 4, label: 'Details' },
  { number: 5, label: 'Idea' },
  { number: 6, label: 'Clarify' },
  { number: 7, label: 'Version' },
  { number: 8, label: 'Review' },
];

function ProjectWizardContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, isExistingProject, setCurrentStep, canProceedToNextStep, resetWizard, setExistingProjectId, setDomain, setProjectName, setProjectDescription, setProjectType, setSelectedDefaultTemplateIds, setSelectedSystemTemplateIds, setSelectedUserTemplateIds, setUseDefaultTemplates, setGenerateInitialRoadmap, setWizardMode, getMinStep, changeDomainAndGoBack } = useProjectWizard();
  const { setActiveProject } = useActiveProject();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<MasterProject | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationProjectId, setValidationProjectId] = useState<string | null>(null);
  const [validationTracks, setValidationTracks] = useState<Track[]>([]);
  const [validationSubtracks, setValidationSubtracks] = useState<Array<{ id: string; track_id: string; name: string }>>([]);

  // Determine which phase we're in and which steps to use
  const lifecyclePhase = currentProject ? getProjectLifecyclePhase(currentProject) : 'intent';
  const isPhase1 = lifecyclePhase === 'intent' || lifecyclePhase === 'intent_checked';
  
  // Determine which workflow and steps to use
  const isQuickSetup = state.wizardMode === 'quick';
  const isRealityCheck = state.wizardMode === 'reality_check';
  const WIZARD_STEPS = isQuickSetup 
    ? QUICK_SETUP_STEPS 
    : (isPhase1 ? PHASE_1_STEPS : LEGACY_WIZARD_STEPS);

  useEffect(() => {
    async function loadExistingProject() {
      const projectId = searchParams.get('project');

      if (projectId) {
        try {
          const project = await getMasterProjectById(projectId);
          if (project) {
            setCurrentProject(project);
            const domains = await getDomains();
            const projectDomain = domains.find(d => d.id === project.domain_id);

            if (projectDomain) {
              const mappedDomainType = mapDomainToTemplateType(projectDomain.name);
              setExistingProjectId(projectId);
              setDomain(project.domain_id, mappedDomainType);
              setProjectName(project.name);
              setProjectDescription(project.description || '');
              
              // Load project type if it exists
              if (project.project_type_id) {
                setProjectType(project.project_type_id);
              }
              
              // Only load templates if we're in Phase 2 (feasibility)
              const phase = getProjectLifecyclePhase(project);
              if (phase === 'feasibility' || phase === 'feasibility_checked') {
                try {
                  const appliedTemplates = await getAppliedTemplateIdsForProject(projectId, mappedDomainType);
                  setSelectedDefaultTemplateIds(appliedTemplates.defaultTemplateIds);
                  setSelectedSystemTemplateIds(appliedTemplates.systemTemplateIds);
                  setSelectedUserTemplateIds(appliedTemplates.userTemplateIds);
                } catch (err) {
                  console.error('Failed to load applied templates:', err);
                }
              }
              
              // CRITICAL: Do NOT auto-set currentStep here
              // wizardMode will be null, ensuring mode choice screen is shown first
              // User must explicitly choose Quick Setup vs Reality Check
              // The mode choice will then set currentStep appropriately
            }
          }
        } catch (err) {
          console.error('Failed to load project:', err);
          setError('Failed to load project');
        }
      }

      setLoading(false);
    }

    loadExistingProject();
  }, [searchParams, setExistingProjectId, setDomain, setProjectName, setProjectDescription, setProjectType, setSelectedDefaultTemplateIds, setSelectedSystemTemplateIds, setSelectedUserTemplateIds]);

  const handleBack = () => {
    const minStep = getMinStep();

    if (state.currentStep > minStep) {
      if (state.currentStep === 2) {
        changeDomainAndGoBack();
      } else if (state.aiDisabledForSession && state.currentStep === 8) {
        setCurrentStep(4);
      } else {
        setCurrentStep(state.currentStep - 1);
      }
      setError(null);
    }
  };

  const handleNext = async () => {
    console.log('[WIZARD] handleNext called', { currentStep: state.currentStep, isQuickSetup, maxStep: WIZARD_STEPS.length });
    // Quick Setup: use simplified validation
    if (isQuickSetup) {
      // Step 1: require domain and project name
      if (state.currentStep === 1) {
        if (!state.domainId || !state.projectName.trim()) {
          return; // Don't proceed if validation fails
        }
      }
      // Step 2: require at least one template selected
      if (state.currentStep === 2) {
        const hasSelectedTemplates = 
          state.selectedDefaultTemplateIds.length > 0 || 
          state.selectedSystemTemplateIds.length > 0 || 
          state.selectedUserTemplateIds.length > 0;
        if (!hasSelectedTemplates) {
          return; // Don't proceed if no templates selected
        }
      }
      // Step 3: require all tracks have valid setup data
      if (state.currentStep === 3) {
        if (state.wizardTrackSetup.length === 0) {
          return; // No tracks to set up
        }
        // Validate all tracks
        for (const track of state.wizardTrackSetup) {
          if (!track.objective.trim() || !track.definitionOfDone.trim() || !track.timeMode) {
            return; // At least one track is incomplete
          }
          // Date validation based on time mode
          if (track.timeMode === 'target' && !track.targetDate) {
            return;
          }
          if (track.timeMode === 'ranged') {
            if (!track.startDate || !track.endDate) {
              return;
            }
            if (new Date(track.endDate) < new Date(track.startDate)) {
              return; // End date before start date
            }
          }
        }
      }
    } else {
      // Reality Check: use full validation
      if (!canProceedToNextStep()) return;
    }

    const maxStep = WIZARD_STEPS.length;
    if (state.currentStep < maxStep) {
      if (isQuickSetup) {
        // Quick Setup: simple increment
        setCurrentStep(state.currentStep + 1);
      } else if (isPhase1) {
        // Phase 1: Go through intent steps (Domain, Project Type, Details, Idea, Goals, Clarify, Review)
        if (state.aiDisabledForSession && state.currentStep === 3) {
          // Skip from Details to Review (when AI disabled, skip Idea, Goals, Clarify)
          setCurrentStep(7);
        } else {
          setCurrentStep(state.currentStep + 1);
        }
      } else {
        // Legacy mode: original behavior
        if (state.aiDisabledForSession && state.currentStep === 4) {
          setCurrentStep(8);
        } else {
          setCurrentStep(state.currentStep + 1);
        }
      }
      setError(null);
    } else {
      await handleCreateProject();
    }
  };

  const handleSkip = async () => {
    try {
      await markWizardSkipped();
      navigate('/guardrails');
    } catch (error) {
      console.error('Failed to skip wizard:', error);
      navigate('/guardrails');
    }
  };

  const handleBackToDashboard = () => {
    // Reset wizard completely, including wizardMode
    resetWizard();
    navigate('/guardrails/dashboard');
  };
  
  // CRITICAL: Ensure wizardMode is explicitly null when wizard opens
  // This prevents stale wizardMode from previous sessions
  useEffect(() => {
    // If wizardMode is somehow not null and we have no active workflow, reset it
    // This handles edge cases where state might be stale
    if (state.wizardMode !== null && state.currentStep === 0 && !isExistingProject) {
      // This shouldn't happen, but guard against it
      console.warn('[WIZARD] wizardMode was set without user action, resetting');
      setWizardMode(null);
    }
  }, []); // Run once on mount

  const handleCreateProject = async () => {
    console.log('[WIZARD] handleCreateProject called', { 
      domainId: state.domainId, 
      domainType: state.domainType,
      wizardMode: state.wizardMode,
      wizardTrackSetup: state.wizardTrackSetup 
    });
    
    if (!state.domainId || !state.domainType) {
      setError('Domain information is missing');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log('[WIZARD] Starting project creation...');
      
      // Quick Setup: Use selected templates if any, otherwise use defaults
      const isQuickSetupMode = state.wizardMode === 'quick';
      
      const validDefaultIds = state.selectedDefaultTemplateIds.filter((id): id is string => !!id);
      const validSystemIds = state.selectedSystemTemplateIds.filter((id): id is string => !!id);
      const validUserIds = state.selectedUserTemplateIds.filter((id): id is string => !!id);
      
      console.log('[WIZARD] Template IDs:', { 
        validDefaultIds, 
        validSystemIds, 
        validUserIds, 
        isQuickSetupMode,
        selectedDefaultTemplateIds: state.selectedDefaultTemplateIds,
        selectedSystemTemplateIds: state.selectedSystemTemplateIds,
        selectedUserTemplateIds: state.selectedUserTemplateIds
      });

      const hasAIDraft = !!state.aiStructureDraft && !state.aiDisabledForSession;

      if (state.existingProjectId) {
        if (hasAIDraft) {
          const draftResult = await createProjectFromDraft({
            projectId: state.existingProjectId,
            draft: state.aiStructureDraft!,
            includeNodes: state.includeNodes,
            includeRoadmapItems: state.includeRoadmapItems,
            includeMilestones: state.includeMilestones,
          });

          if (!draftResult.success) {
            console.warn('[WIZARD] Project creation completed with errors:', draftResult.errors);
          }
        } else {
          await addTracksToProject({
            project_id: state.existingProjectId,
            domain_type: state.domainType,
            use_default_templates: validDefaultIds.length > 0,
            selected_default_template_ids: validDefaultIds,
            selected_system_template_ids: validSystemIds,
            selected_user_template_ids: validUserIds,
          });
        }

        const updatedProject = await getMasterProjectById(state.existingProjectId);
        if (updatedProject) {
          setActiveProject(updatedProject);
          setActiveProjectId(updatedProject.id, updatedProject.domain_id);
        }

        resetWizard();
        navigate(hasAIDraft
          ? `/guardrails/projects/${state.existingProjectId}/welcome`
          : `/guardrails/dashboard`
        );
      } else {
        if (hasAIDraft) {
          const result = await createProjectWithWizard({
            domain_id: state.domainId,
            domain_type: state.domainType,
            name: state.projectName,
            description: state.projectDescription || undefined,
            use_default_templates: false,
            selected_default_template_ids: [],
            selected_system_template_ids: [],
            selected_user_template_ids: [],
            generate_initial_roadmap: false,
            quick_goal: state.quickGoal,
            first_priority_track_template_id: state.firstPriorityTrackId || undefined,
          });

          const draftResult = await createProjectFromDraft({
            projectId: result.project.id,
            draft: state.aiStructureDraft!,
            includeNodes: state.includeNodes,
            includeRoadmapItems: state.includeRoadmapItems,
            includeMilestones: state.includeMilestones,
          });

          if (!draftResult.success) {
            console.warn('[WIZARD] Project creation completed with errors:', draftResult.errors);
          }

          await markWizardCompleted();

          setActiveProject(result.project);
          setActiveProjectId(result.project.id, result.project.domain_id);

          resetWizard();

          navigate(`/guardrails/projects/${result.project.id}/welcome`);
        } else {
          // Quick Setup: Use selected templates if any, otherwise use defaults
          // If user selected templates, use those. Otherwise fall back to use_default_templates flag
          const hasSelectedTemplates = validDefaultIds.length > 0 || validSystemIds.length > 0 || validUserIds.length > 0;
          const useDefaultTemplates = isQuickSetupMode && !hasSelectedTemplates;
          
          // Map wizard track setup to the format expected by createProjectWithWizard
          const wizardTrackSetup = state.wizardTrackSetup.map(setup => ({
            track_template_id: setup.trackTemplateId,
            objective: setup.objective,
            definition_of_done: setup.definitionOfDone,
            time_mode: setup.timeMode,
            start_date: setup.startDate || null,
            end_date: setup.endDate || null,
            target_date: setup.targetDate || null,
          }));

          let result;
          try {
            result = await createProjectWithWizard({
              domain_id: state.domainId,
              domain_type: state.domainType,
              name: state.projectName,
              description: state.projectDescription || undefined,
              use_default_templates: useDefaultTemplates,
              selected_default_template_ids: validDefaultIds,
              selected_system_template_ids: validSystemIds,
              selected_user_template_ids: validUserIds,
              generate_initial_roadmap: state.generateInitialRoadmap,
              quick_goal: state.quickGoal,
              first_priority_track_template_id: state.firstPriorityTrackId || undefined,
              wizard_track_setup: wizardTrackSetup,
            });

            await markWizardCompleted();

            setActiveProject(result.project);
            setActiveProjectId(result.project.id, result.project.domain_id);

            // Show validation screen
            console.log('[WIZARD] Project created, result:', { 
              projectId: result.project.id, 
              tracksCount: result.tracks.length, 
              subtracksCount: result.subtracks.length,
              tracks: result.tracks,
              subtracks: result.subtracks
            });
            setValidationProjectId(result.project.id);
            setValidationTracks(result.tracks || []);
            setValidationSubtracks((result.subtracks || []).map(st => ({
              id: st.id,
              track_id: st.track_id,
              name: st.name,
            })));
            setShowValidation(true);
            setIsCreating(false);
          } catch (error) {
            console.error('[WIZARD] Error creating project:', error);
            setIsCreating(false);
            // Show error to user
            alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
            // Don't show validation screen on error
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to complete wizard:', err);
      setError(err.message || 'Failed to complete wizard. Please try again.');
      setIsCreating(false);
    }
  };

  const handleValidationComplete = () => {
    setShowValidation(false);
    resetWizard();
    // Quick Setup: redirect to roadmap for immediate use
    const isQuickSetupMode = state.wizardMode === 'quick';
    if (validationProjectId) {
      navigate(isQuickSetupMode 
        ? `/guardrails/projects/${validationProjectId}/roadmap`
        : `/guardrails/dashboard`
      );
    }
  };

  const renderStep = () => {
    // Show validation screen if validation is active
    if (showValidation && validationProjectId) {
      return (
        <WizardValidationScreen
          projectId={validationProjectId}
          expectedTracks={validationTracks}
          expectedSubtracks={validationSubtracks}
          onValidationComplete={handleValidationComplete}
        />
      );
    }

    // CRITICAL: Always show mode choice when wizardMode is null
    // This ensures users explicitly choose Quick Setup vs Reality Check
    // regardless of whether it's a new or existing project
    if (!state.wizardMode) {
      return <WizardStepModeChoice />;
    }

    // Quick Setup workflow
    if (isQuickSetup) {
      switch (state.currentStep) {
        case 1:
          return <WizardStepQuickBasics />;
        case 2:
          return <WizardStepQuickStructure />;
        case 3:
          return <WizardStepQuickTrackSetup />;
        case 4:
          return <WizardStepQuickCreate />;
        default:
          return null;
      }
    }

    // Reality Check workflow (existing logic)
    if (isPhase1) {
      // Phase 1 (Intent): Domain, Project Type, Details, Idea, Clarify, Review
      if (state.aiDisabledForSession) {
        switch (state.currentStep) {
          case 1:
            return <WizardStepDomainSelect />;
          case 2:
            return <WizardStepProjectTypeSelect />;
          case 3:
            return <WizardStepProjectDetails />;
          case 6:
            return <WizardStepReview />;
          default:
            return null;
        }
      }

      switch (state.currentStep) {
        case 1:
          return <WizardStepDomainSelect />;
        case 2:
          return <WizardStepProjectTypeSelect />;
        case 3:
          return <WizardStepProjectDetails />;
        case 4:
          return <WizardStepIdeaIntake />;
        case 5:
          return <WizardStepGoals />;
        case 6:
          return <WizardStepClarification />;
        case 7:
          return <WizardStepReview />;
        default:
          return null;
      }
    } else {
      // Legacy mode: Original step mapping
      if (state.aiDisabledForSession) {
        switch (state.currentStep) {
          case 1:
            return <WizardStepDomainSelect />;
          case 2:
            return <WizardStepProjectTypeSelect />;
          case 3:
            return <WizardStepTemplateSelect />;
          case 4:
            return <WizardStepProjectDetails />;
          case 8:
            return <WizardStepReview />;
          default:
            return null;
        }
      }

      switch (state.currentStep) {
        case 1:
          return <WizardStepDomainSelect />;
        case 2:
          return <WizardStepProjectTypeSelect />;
        case 3:
          return <WizardStepTemplateSelect />;
        case 4:
          return <WizardStepProjectDetails />;
        case 5:
          return <WizardStepIdeaIntake />;
        case 6:
          return <WizardStepClarification />;
        case 7:
          return <WizardStepVersionChoice />;
        case 8:
          return <WizardStepReview />;
        default:
          return null;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wizard...</p>
        </div>
      </div>
    );
  }

  // Don't show header/progress/footer for mode choice or validation screen
  // Mode choice is shown for all projects when wizardMode is null
  const showModeChoice = !state.wizardMode;
  const showHeaderAndFooter = !showModeChoice && !showValidation;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {showHeaderAndFooter && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {isExistingProject 
                    ? 'Complete Project Setup' 
                    : isQuickSetup 
                      ? 'Quick Setup' 
                      : 'Reality Check'}
                </h1>
                <p className="text-sm md:text-base text-gray-600 mt-1 hidden md:block">
                  {isExistingProject
                    ? 'Add tracks and subtracks to your project'
                    : isQuickSetup
                      ? 'Get your project ready in minutes'
                      : 'Validate and structure your project'}
                </p>
                {!isQuickSetup && (
                  <div className="mt-2 md:mt-3">
                    <WizardContextDisplay />
                  </div>
                )}
              </div>
              <button
                onClick={handleBackToDashboard}
                className="flex-shrink-0 flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm md:text-base"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-medium hidden md:inline">Back to Dashboard</span>
                <span className="font-medium md:hidden">Back</span>
              </button>
            </div>
          </div>

          <WizardProgress currentStep={state.currentStep} steps={WIZARD_STEPS} />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-900">Error creating project</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-20">
        <div className="max-w-4xl mx-auto w-full">
          {renderStep()}
        </div>
      </div>

      {showHeaderAndFooter && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-10 safe-bottom">
          <WizardFooter
            currentStep={state.currentStep}
            totalSteps={WIZARD_STEPS.length}
            canProceed={isQuickSetup ? (() => {
              if (state.currentStep === 1) {
                return state.domainId !== null && state.projectName.trim().length > 0;
              }
              if (state.currentStep === 2) {
                return state.selectedDefaultTemplateIds.length > 0 || state.selectedSystemTemplateIds.length > 0 || state.selectedUserTemplateIds.length > 0;
              }
              if (state.currentStep === 3) {
                // Validate all tracks have valid setup data
                if (state.wizardTrackSetup.length === 0) return false;
                for (const track of state.wizardTrackSetup) {
                  if (!track.objective.trim() || !track.definitionOfDone.trim() || !track.timeMode) {
                    return false;
                  }
                  if (track.timeMode === 'target' && !track.targetDate) return false;
                  if (track.timeMode === 'ranged') {
                    if (!track.startDate || !track.endDate) return false;
                    if (new Date(track.endDate) < new Date(track.startDate)) return false;
                  }
                }
                return true;
              }
              if (state.currentStep === 4) {
                // Step 4 is the review/confirmation step - always allow proceeding (creation happens on Next click)
                return true;
              }
              return true;
            })() : canProceedToNextStep()}
            isLastStep={state.currentStep === WIZARD_STEPS.length}
            isLoading={isCreating}
            onBack={handleBack}
            onNext={handleNext}
            onSkip={!isExistingProject && !isQuickSetup ? handleSkip : undefined}
            minStep={getMinStep()}
            isExistingProject={isExistingProject}
          />
        </div>
      )}
    </div>
  );
}

export function ProjectWizard() {
  return (
    <ProjectWizardProvider>
      <ProjectWizardContent />
    </ProjectWizardProvider>
  );
}
