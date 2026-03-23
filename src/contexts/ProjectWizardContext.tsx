import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import type { DomainType, AnyTrackTemplate } from '../lib/guardrails/templateTypes';
import type {
  ProjectIntakeAnalysis,
  ClarificationQuestion,
  ClarificationAnswer,
  ProjectStructureDraft,
  VersionPreset,
} from '../lib/guardrails/ai/wizardAISchemas';

// Reality Check Result type (inline to avoid potential circular dependency issues)
export interface RealityCheckResult {
  achievabilityScore: number; // 0-100
  achievabilityBand: 'low' | 'medium' | 'high';
  summary: string; // 2-3 sentences, neutral tone
  keyAssumptions: string[]; // Bullet-style strings
  primaryRisks: string[]; // Structural risks only
  recommendedOutcome: 'proceed' | 'reframe' | 'strong_reframe';
  reframeGuidance: {
    needed: boolean;
    suggestion: string | null;
  };
  confidenceNotes: string; // Short reassurance
}

// Clarify Signals - structured data collected from Clarify step
export interface ClarifySignals {
  timeExpectation: string | null; // Q1: Time horizon
  weeklyCommitment: string | null; // Q2: Weekly time commitment
  experienceLevel: string | null; // Q3: Prior experience
  dependencyLevel: string | null; // Q4: External dependencies
  resourceAssumption: string | null; // Q5: Resource requirements
  scopeClarity: string | null; // Q6: Scope boundaries
  // Optional context text for each question
  timeExpectationContext?: string;
  weeklyCommitmentContext?: string;
  experienceLevelContext?: string;
  dependencyLevelContext?: string;
  resourceAssumptionContext?: string;
  scopeClarityContext?: string;
}

export interface WizardTrackSetupState {
  trackTemplateId: string; // Template ID (used before track is created)
  trackId?: string; // Actual track ID (set after track creation)
  trackName: string; // Track name for display
  trackCategoryId: string; // REQUIRED - Purpose category ID
  objective: string;
  definitionOfDone: string;
  timeMode: 'unscheduled' | 'target' | 'ranged' | 'ongoing';
  startDate?: string;
  endDate?: string;
  targetDate?: string;
}

export interface WizardState {
  wizardMode: 'quick' | 'reality_check' | null; // Wizard entry mode choice
  currentStep: number;
  existingProjectId: string | null;
  domainId: string | null;
  domainType: DomainType | null;
  projectTypeId: string | null;
  projectName: string;
  projectDescription: string;
  aspirationalGoals: string[]; // Goals selected by user (up to 5)
  primaryAspirationalGoal: string | null; // Which goal matters most (optional)
  useDefaultTemplates: boolean;
  selectedDefaultTemplateIds: string[];
  selectedSystemTemplateIds: string[];
  selectedUserTemplateIds: string[];
  generateInitialRoadmap: boolean;
  quickGoal?: string; // One-sentence goal for Quick Setup
  firstPriorityTrackId?: string | null; // Priority track ID (template ID for preview)
  wizardTrackSetup: WizardTrackSetupState[]; // Layer 1 track setup data for Quick Setup
  availableTemplates: AnyTrackTemplate[];
  aiError: string | null;
  aiDisabledForSession: boolean;
  aiSessionId: string;
  aiProjectIntake: ProjectIntakeAnalysis | null;
  aiClarificationQuestions: ClarificationQuestion[];
  aiClarificationAnswers: ClarificationAnswer[];
  aiStructureDraft: ProjectStructureDraft | null;
  selectedVersion: VersionPreset | null;
  includeNodes: boolean;
  includeRoadmapItems: boolean;
  includeMilestones: boolean;
  clarifySignals: ClarifySignals | null; // New: Structured clarify signals
  realityCheckResult: RealityCheckResult | null; // Reality Check Funnel #1 result
}

interface ProjectWizardContextType {
  state: WizardState;
  isExistingProject: boolean;
  existingProjectId: string | null;
  setCurrentStep: (step: number) => void;
  setExistingProjectId: (id: string | null) => void;
  setDomain: (domainId: string, domainType: DomainType) => void;
  clearDomain: () => void;
  changeDomainAndGoBack: () => void;
  setProjectType: (projectTypeId: string) => void;
  setProjectName: (name: string) => void;
  setProjectDescription: (description: string) => void;
  setAspirationalGoals: (goals: string[]) => void;
  setPrimaryAspirationalGoal: (goal: string | null) => void;
  setUseDefaultTemplates: (use: boolean) => void;
  setSelectedDefaultTemplateIds: (ids: string[]) => void;
  setSelectedSystemTemplateIds: (ids: string[]) => void;
  setSelectedUserTemplateIds: (ids: string[]) => void;
  setGenerateInitialRoadmap: (generate: boolean) => void;
  setQuickGoal: (goal: string) => void;
  setFirstPriorityTrackId: (trackId: string | null) => void;
  setWizardTrackSetup: (setup: WizardTrackSetupState[]) => void;
  updateWizardTrackSetup: (index: number, updates: Partial<WizardTrackSetupState>) => void;
  setAvailableTemplates: (templates: AnyTrackTemplate[]) => void;
  resetWizard: () => void;
  canProceedToNextStep: () => boolean;
  getMinStep: () => number;
  setAIError: (error: string | null) => void;
  disableAIForSession: () => void;
  clearAIError: () => void;
  setAIProjectIntake: (intake: ProjectIntakeAnalysis | null) => void;
  setAIClarificationQuestions: (questions: ClarificationQuestion[]) => void;
  setAIClarificationAnswers: (answers: ClarificationAnswer[]) => void;
  setAIStructureDraft: (draft: ProjectStructureDraft | null) => void;
  setSelectedVersion: (version: VersionPreset | null) => void;
  setIncludeNodes: (include: boolean) => void;
  setIncludeRoadmapItems: (include: boolean) => void;
  setIncludeMilestones: (include: boolean) => void;
  setClarifySignals: (signals: ClarifySignals | null) => void;
  setRealityCheckResult: (result: RealityCheckResult | null) => void;
  setWizardMode: (mode: 'quick' | 'reality_check' | null) => void;
}

const ProjectWizardContext = createContext<ProjectWizardContextType | undefined>(undefined);

function generateSessionId(): string {
  return `wizard-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const WIZARD_STORAGE_KEY = 'guardrails_wizard_state';

const initialState: WizardState = {
  wizardMode: null,
  currentStep: 1,
  existingProjectId: null,
  domainId: null,
  domainType: null,
  projectTypeId: null,
  projectName: '',
  projectDescription: '',
  aspirationalGoals: [],
  primaryAspirationalGoal: null,
  useDefaultTemplates: true,
  selectedDefaultTemplateIds: [],
  selectedSystemTemplateIds: [],
  selectedUserTemplateIds: [],
  generateInitialRoadmap: false, // No longer used in Quick Setup Step 3
  quickGoal: undefined,
  firstPriorityTrackId: undefined,
  wizardTrackSetup: [],
  availableTemplates: [],
  aiError: null,
  aiDisabledForSession: false,
  aiSessionId: generateSessionId(),
  aiProjectIntake: null,
  aiClarificationQuestions: [],
  aiClarificationAnswers: [],
  aiStructureDraft: null,
  selectedVersion: null,
  includeNodes: true,
  includeRoadmapItems: true,
  includeMilestones: true,
  clarifySignals: null,
  realityCheckResult: null,
};

/**
 * Phase 5: State Management Resilience - Added storage protection
 */
function loadSavedWizardState(): WizardState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    // Validate that we have at least some wizard data
    if (parsed && typeof parsed === 'object') {
      // Restore session ID if missing
      if (!parsed.aiSessionId) {
        parsed.aiSessionId = generateSessionId();
      }
      return { ...initialState, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load saved wizard state:', error);
    localStorage.removeItem(WIZARD_STORAGE_KEY);
  }
  
  return null;
}

function saveWizardState(state: WizardState): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Don't save if we're working with an existing project (it's loaded from DB)
    if (state.existingProjectId) {
      return;
    }
    
    // Create a sanitized version to save (exclude large/complex objects)
    const stateToSave: Partial<WizardState> = {
      wizardMode: state.wizardMode,
      currentStep: state.currentStep,
      domainId: state.domainId,
      domainType: state.domainType,
      projectTypeId: state.projectTypeId,
      projectName: state.projectName,
      projectDescription: state.projectDescription,
      aspirationalGoals: state.aspirationalGoals,
      primaryAspirationalGoal: state.primaryAspirationalGoal,
      useDefaultTemplates: state.useDefaultTemplates,
      selectedDefaultTemplateIds: state.selectedDefaultTemplateIds,
      selectedSystemTemplateIds: state.selectedSystemTemplateIds,
      selectedUserTemplateIds: state.selectedUserTemplateIds,
      generateInitialRoadmap: state.generateInitialRoadmap,
      aiDisabledForSession: state.aiDisabledForSession,
      aiSessionId: state.aiSessionId,
      selectedVersion: state.selectedVersion,
      includeNodes: state.includeNodes,
      includeRoadmapItems: state.includeRoadmapItems,
      includeMilestones: state.includeMilestones,
      clarifySignals: state.clarifySignals,
      // Note: We don't save availableTemplates, aiProjectIntake, aiClarificationQuestions,
      // aiClarificationAnswers, aiStructureDraft as these are large/complex and can be regenerated
    };
    
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save wizard state:', error);
  }
}

function clearSavedWizardState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WIZARD_STORAGE_KEY);
}

export function ProjectWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(() => {
    // Load saved state on mount (but only if no existing project)
    const saved = loadSavedWizardState();
    return saved || initialState;
  });

  const isExistingProject = !!state.existingProjectId;

  const filterValidIds = useCallback((ids: string[]): string[] => {
    return ids.filter(id => {
      if (!id || typeof id !== 'string' || id.length === 0 || id === 'undefined') {
        console.warn('Filtered out invalid template ID:', id);
        return false;
      }
      return true;
    });
  }, []);

  const getMinStep = useCallback((): number => {
    return 1;
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState(prev => {
      const newState = { ...prev, currentStep: step };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setExistingProjectId = useCallback((id: string | null) => {
    setState(prev => {
      const newState = { ...prev, existingProjectId: id };
      // Clear saved state if we're loading an existing project (we'll use project data instead)
      if (id) {
        clearSavedWizardState();
      }
      return newState;
    });
  }, []);

  const setDomain = useCallback((domainId: string, domainType: DomainType) => {
    setState(prev => {
      const newState = {
        ...prev,
        domainId,
        domainType,
        projectTypeId: null,
        selectedSystemTemplateIds: [],
        selectedUserTemplateIds: [],
        availableTemplates: [],
      };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const clearDomain = useCallback(() => {
    setState(prev => ({
      ...prev,
      domainId: null,
      domainType: null,
      projectTypeId: null,
      selectedSystemTemplateIds: [],
      selectedUserTemplateIds: [],
      availableTemplates: [],
    }));
  }, []);

  const changeDomainAndGoBack = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 1,
      existingProjectId: null,
      domainId: null,
      domainType: null,
      projectTypeId: null,
      selectedSystemTemplateIds: [],
      selectedUserTemplateIds: [],
      availableTemplates: [],
    }));
  }, []);

  const setProjectType = useCallback((projectTypeId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        projectTypeId,
        selectedSystemTemplateIds: [],
        selectedUserTemplateIds: [],
        availableTemplates: [],
      };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setProjectName = useCallback((name: string) => {
    setState(prev => {
      const newState = { ...prev, projectName: name };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setProjectDescription = useCallback((description: string) => {
    setState(prev => {
      const newState = { ...prev, projectDescription: description };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setAspirationalGoals = useCallback((goals: string[]) => {
    setState(prev => {
      const newState = { ...prev, aspirationalGoals: goals };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setPrimaryAspirationalGoal = useCallback((goal: string | null) => {
    setState(prev => {
      const newState = { ...prev, primaryAspirationalGoal: goal };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setUseDefaultTemplates = useCallback((use: boolean) => {
    setState(prev => {
      const newState = { ...prev, useDefaultTemplates: use };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setSelectedDefaultTemplateIds = useCallback((ids: string[]) => {
    const validIds = filterValidIds(ids);
    setState(prev => {
      const newState = { ...prev, selectedDefaultTemplateIds: validIds };
      saveWizardState(newState);
      return newState;
    });
  }, [filterValidIds]);

  const setSelectedSystemTemplateIds = useCallback((ids: string[]) => {
    const validIds = filterValidIds(ids);
    setState(prev => {
      const newState = { ...prev, selectedSystemTemplateIds: validIds };
      saveWizardState(newState);
      return newState;
    });
  }, [filterValidIds]);

  const setSelectedUserTemplateIds = useCallback((ids: string[]) => {
    const validIds = filterValidIds(ids);
    setState(prev => {
      const newState = { ...prev, selectedUserTemplateIds: validIds };
      saveWizardState(newState);
      return newState;
    });
  }, [filterValidIds]);

  const setGenerateInitialRoadmap = useCallback((generate: boolean) => {
    setState(prev => {
      const newState = { ...prev, generateInitialRoadmap: generate };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setQuickGoal = useCallback((goal: string) => {
    setState(prev => {
      const newState = { ...prev, quickGoal: goal.trim() || undefined };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setFirstPriorityTrackId = useCallback((trackId: string | null) => {
    setState(prev => {
      const newState = { ...prev, firstPriorityTrackId: trackId || undefined };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setWizardTrackSetup = useCallback((setup: WizardTrackSetupState[]) => {
    setState(prev => {
      const newState = { ...prev, wizardTrackSetup: setup };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const updateWizardTrackSetup = useCallback((index: number, updates: Partial<WizardTrackSetupState>) => {
    setState(prev => {
      const newSetup = [...prev.wizardTrackSetup];
      if (newSetup[index]) {
        newSetup[index] = { ...newSetup[index], ...updates };
      }
      const newState = { ...prev, wizardTrackSetup: newSetup };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setAvailableTemplates = useCallback((templates: AnyTrackTemplate[]) => {
    setState(prev => {
      const currentIds = prev.availableTemplates.map(t => t.id).sort().join(',');
      const newIds = templates.map(t => t.id).sort().join(',');
      if (currentIds === newIds) {
        return prev;
      }
      return { ...prev, availableTemplates: templates };
    });
  }, []);

  const resetWizard = useCallback(() => {
    clearSavedWizardState();
    setState({ ...initialState, aiSessionId: generateSessionId() });
  }, []);

  const setAIError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, aiError: error }));
  }, []);

  const disableAIForSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      aiDisabledForSession: true,
      aiError: 'AI assistance is temporarily unavailable. You can continue manually.',
    }));
  }, []);

  const clearAIError = useCallback(() => {
    setState(prev => ({ ...prev, aiError: null }));
  }, []);

  const setAIProjectIntake = useCallback((intake: ProjectIntakeAnalysis | null) => {
    setState(prev => ({ ...prev, aiProjectIntake: intake }));
  }, []);

  const setAIClarificationQuestions = useCallback((questions: ClarificationQuestion[]) => {
    setState(prev => ({ ...prev, aiClarificationQuestions: questions }));
  }, []);

  const setAIClarificationAnswers = useCallback((answers: ClarificationAnswer[]) => {
    setState(prev => ({ ...prev, aiClarificationAnswers: answers }));
  }, []);

  const setAIStructureDraft = useCallback((draft: ProjectStructureDraft | null) => {
    setState(prev => ({ ...prev, aiStructureDraft: draft }));
  }, []);

  const setSelectedVersion = useCallback((version: VersionPreset | null) => {
    setState(prev => ({ ...prev, selectedVersion: version }));
  }, []);

  const setIncludeNodes = useCallback((include: boolean) => {
    setState(prev => ({ ...prev, includeNodes: include }));
  }, []);

  const setIncludeRoadmapItems = useCallback((include: boolean) => {
    setState(prev => ({ ...prev, includeRoadmapItems: include }));
  }, []);

  const setIncludeMilestones = useCallback((include: boolean) => {
    setState(prev => ({ ...prev, includeMilestones: include }));
  }, []);

  const setClarifySignals = useCallback((signals: ClarifySignals | null) => {
    setState(prev => {
      const newState = { ...prev, clarifySignals: signals };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setRealityCheckResult = useCallback((result: RealityCheckResult | null) => {
    setState(prev => {
      const newState = { ...prev, realityCheckResult: result };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const setWizardMode = useCallback((mode: 'quick' | 'reality_check' | null) => {
    setState(prev => {
      const newState = { ...prev, wizardMode: mode };
      saveWizardState(newState);
      return newState;
    });
  }, []);

  const canProceedToNextStep = useCallback((): boolean => {
    // Detect if we're in Phase 1 (Intent phase) by checking if we have no templates selected
    // Phase 1 steps: Domain, Project Type, Details, Idea, Clarify, Review (no Templates/Version)
    // Legacy steps: Domain, Project Type, Templates, Details, Idea, Clarify, Version, Review
    const hasTemplates = state.selectedDefaultTemplateIds.length > 0 ||
                         state.selectedSystemTemplateIds.length > 0 ||
                         state.selectedUserTemplateIds.length > 0;
    const isPhase1 = !hasTemplates; // Simple heuristic: no templates = Phase 1

    switch (state.currentStep) {
      case 1:
        return state.domainId !== null && state.domainType !== null;
      case 2:
        return state.projectTypeId !== null;
      case 3:
        if (isPhase1) {
          // Phase 1: Details step - requires projectName
          return state.projectName.trim().length > 0;
        } else {
          // Legacy: Templates step - requires templates selected
          return hasTemplates;
        }
      case 4:
        if (isPhase1) {
          // Phase 1: Idea step - requires projectDescription OR aiDisabledForSession
          return state.projectDescription.trim().length > 0 || state.aiDisabledForSession;
        } else {
          // Legacy: Details step - requires projectName
          return state.projectName.trim().length > 0;
        }
        case 5:
        if (isPhase1) {
          // Phase 1: Goals step - requires at least one goal selected
          return state.aspirationalGoals.length > 0;
        } else {
          // Legacy: Idea step - requires projectDescription OR aiDisabledForSession
          return state.projectDescription.trim().length > 0 || state.aiDisabledForSession;
        }
      case 6:
        if (isPhase1) {
          // Phase 1: Clarify step - requires clarifySignals (at least one answer) OR aiDisabledForSession
          // Allow proceeding if user has answered at least one question
          const hasAnyAnswer = state.clarifySignals && (
            state.clarifySignals.timeExpectation ||
            state.clarifySignals.weeklyCommitment ||
            state.clarifySignals.experienceLevel ||
            state.clarifySignals.dependencyLevel ||
            state.clarifySignals.resourceAssumption ||
            state.clarifySignals.scopeClarity
          );
          return hasAnyAnswer || state.aiDisabledForSession;
        } else {
          // Legacy: Clarify step - requires aiClarificationQuestions OR aiDisabledForSession
          return state.aiClarificationQuestions.length > 0 || state.aiDisabledForSession;
        }
      case 7:
        // Legacy only: Version step
        return state.selectedVersion !== null || state.aiDisabledForSession;
      case 8:
        // Legacy only: Review step
        return true;
      default:
        return false;
    }
  }, [
    state.currentStep,
    state.domainId,
    state.domainType,
    state.projectTypeId,
    state.selectedDefaultTemplateIds.length,
    state.selectedSystemTemplateIds.length,
    state.selectedUserTemplateIds.length,
    state.projectName,
    state.projectDescription,
    state.aspirationalGoals.length,
    state.aiClarificationQuestions.length,
    state.selectedVersion,
    state.aiDisabledForSession,
    state.clarifySignals,
  ]);

  const value: ProjectWizardContextType = useMemo(() => {
    const contextValue: ProjectWizardContextType = {
      state,
      isExistingProject,
      existingProjectId: state.existingProjectId,
      setCurrentStep,
      setExistingProjectId,
      setDomain,
      clearDomain,
      changeDomainAndGoBack,
      setProjectType,
      setProjectName,
      setProjectDescription,
      setAspirationalGoals,
      setPrimaryAspirationalGoal,
      setUseDefaultTemplates,
      setSelectedDefaultTemplateIds,
      setSelectedSystemTemplateIds,
      setSelectedUserTemplateIds,
      setGenerateInitialRoadmap,
      setQuickGoal,
      setFirstPriorityTrackId,
      setWizardTrackSetup,
      updateWizardTrackSetup,
      setAvailableTemplates,
      resetWizard,
      canProceedToNextStep,
      getMinStep,
      setAIError,
      disableAIForSession,
      clearAIError,
      setAIProjectIntake,
      setAIClarificationQuestions,
      setAIClarificationAnswers,
      setAIStructureDraft,
      setSelectedVersion,
      setIncludeNodes,
      setIncludeRoadmapItems,
      setIncludeMilestones,
      setClarifySignals,
      setRealityCheckResult,
      setWizardMode,
    };
    return contextValue;
  }, [
    state,
    isExistingProject,
    setCurrentStep,
    setExistingProjectId,
    setDomain,
    clearDomain,
    changeDomainAndGoBack,
    setProjectType,
    setProjectName,
    setProjectDescription,
    setAspirationalGoals,
    setPrimaryAspirationalGoal,
    setUseDefaultTemplates,
    setSelectedDefaultTemplateIds,
    setSelectedSystemTemplateIds,
    setSelectedUserTemplateIds,
    setGenerateInitialRoadmap,
    setQuickGoal,
    setFirstPriorityTrackId,
    setWizardTrackSetup,
    updateWizardTrackSetup,
    setAvailableTemplates,
    resetWizard,
    canProceedToNextStep,
    getMinStep,
    setAIError,
    disableAIForSession,
    clearAIError,
    setAIProjectIntake,
    setAIClarificationQuestions,
    setAIClarificationAnswers,
    setAIStructureDraft,
    setSelectedVersion,
    setIncludeNodes,
    setIncludeRoadmapItems,
    setIncludeMilestones,
    setClarifySignals,
    setRealityCheckResult,
    setWizardMode,
  ]);

  return (
    <ProjectWizardContext.Provider value={value}>
      {children}
    </ProjectWizardContext.Provider>
  );
}

export function useProjectWizard() {
  const context = useContext(ProjectWizardContext);
  if (context === undefined) {
    throw new Error('useProjectWizard must be used within ProjectWizardProvider');
  }
  return context;
}
