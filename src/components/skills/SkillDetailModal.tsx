/**
 * Skill Detail Modal
 * 
 * Primary interaction surface for a single skill.
 * Displays comprehensive skill information, contexts, links, and AI narrative.
 * 
 * Supports both Guardrails (strategic) and Planner (growth) modes.
 */

import { useState, useEffect } from 'react';
import {
  X,
  Award,
  ChevronDown,
  ChevronUp,
  Target,
  BookOpen,
  FolderKanban,
  Calendar,
  FileText,
  GraduationCap,
  TrendingUp,
  Clock,
  Lock,
  Eye,
  Edit2,
  Save,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  skillsService,
  skillContextsService,
  skillEntityLinksService,
  type UserSkill,
  type SkillContext,
  type SkillEntityLink,
  PROFICIENCY_LABELS,
  CATEGORY_LABELS,
} from '../../lib/skillsService';
import { generateSkillNarrative, type NarrativeOutput } from '../../lib/skills/skillNarrativeService';
import { NarrativeSection, NARRATIVE_SECTION_LABELS } from '../../lib/skills/skillNarrativeRules';
import { SkillContextManager } from '../guardrails/reality/SkillContextManager';
import { SkillLinkManager } from '../guardrails/reality/SkillLinkManager';
import { SkillTimeline } from './SkillTimeline';
import { SkillPlanningPanel } from './SkillPlanningPanel';
import { SkillScenarioView } from './SkillScenarioView';
import { SharedUnderstandingManager } from './SharedUnderstandingManager';
import { computeContextState, getStateBadgeClass, type ContextStateInfo } from '../../lib/skills/skillContextState';
import { sharedUnderstandingService, type SharedUnderstandingAgreement } from '../../lib/skills/sharedUnderstandingService';
import { SkillContextSection } from './SkillContextSection';
import { WhyThisMattersSection } from '../shared/WhyThisMattersSection';
import { getWhyThisMattersForSkill } from '../../lib/trackerContext/meaningHelpers';
import { getSkillMomentum, getHabitsPracticingSkill, getRecentPracticeSummary } from '../../lib/skills/skillContextHelpers';

interface SkillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillId: string;
  contextId?: string;
  mode: 'guardrails' | 'planner';
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
    can_manage: boolean;
  };
}

interface CollapsibleSection {
  id: string;
  title: string;
  isOpen: boolean;
}

const CONTEXT_TYPE_LABELS: Record<string, string> = {
  work: 'Work',
  education: 'Education',
  hobby: 'Hobby',
  life: 'Life',
  health: 'Health',
  therapy: 'Therapy',
  parenting: 'Parenting',
  coaching: 'Coaching',
  other: 'Other',
};

const PRESSURE_LEVEL_LABELS: Record<string, string> = {
  none: 'No Pressure',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  background: 'Background',
  paused: 'Paused',
};

export function SkillDetailModal({
  isOpen,
  onClose,
  skillId,
  contextId: initialContextId,
  mode,
  permissions = { can_view: true, can_edit: true, can_manage: true },
}: SkillDetailModalProps) {
  const { user } = useAuth();
  const [skill, setSkill] = useState<UserSkill | null>(null);
  const [contexts, setContexts] = useState<SkillContext[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | undefined>(initialContextId);
  const [links, setLinks] = useState<SkillEntityLink[]>([]);
  const [narrative, setNarrative] = useState<NarrativeOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CollapsibleSection[]>([
    { id: 'header', title: 'Header', isOpen: true },
    { id: 'context', title: 'Context Summary', isOpen: true },
    { id: 'linked', title: 'Linked Activity', isOpen: true }, // Moved up - promoted to first-class
    { id: 'narrative', title: 'AI Narrative', isOpen: true },
    { id: 'timeline', title: 'Timeline', isOpen: false },
    { id: 'planning', title: 'Planning', isOpen: false },
    { id: 'reflections', title: 'External Reflections', isOpen: false },
    { id: 'shared_understanding', title: 'Shared Understanding', isOpen: false },
    { id: 'evidence', title: 'Evidence & History', isOpen: false },
  ]);
  const [showNarrativeExplanation, setShowNarrativeExplanation] = useState(false);
  const [editingIntent, setEditingIntent] = useState(false);
  const [intentValue, setIntentValue] = useState('');
  const [showScenarioView, setShowScenarioView] = useState(false);
  const [contextState, setContextState] = useState<ContextStateInfo | null>(null);
  
  // Shared Understanding state
  const [isOwner, setIsOwner] = useState(true);
  const [isExternalViewer, setIsExternalViewer] = useState(false);
  const [externalAgreement, setExternalAgreement] = useState<SharedUnderstandingAgreement | null>(null);
  const [externalReflections, setExternalReflections] = useState<any[]>([]);
  
  // Skill context data (read-only)
  const [skillMomentum, setSkillMomentum] = useState<any>(null);
  const [habitsPracticing, setHabitsPracticing] = useState<any[]>([]);
  const [practiceSummary, setPracticeSummary] = useState<any>(null);
  const [whyThisMatters, setWhyThisMatters] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user && skillId) {
      loadData();
    }
  }, [isOpen, user, skillId, selectedContextId]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load skill
      const skillData = await skillsService.getById(skillId);
      if (!skillData) {
        console.error('Skill not found');
        return;
      }
      setSkill(skillData);

      // ============================================================================
      // Shared Understanding Safety Boundary
      // External viewers must never mutate skill state
      // ============================================================================
      
      // Determine viewer status
      const ownerId = skillData.user_id;
      const isOwnerView = user.id === ownerId;
      setIsOwner(isOwnerView);
      setIsExternalViewer(!isOwnerView);

      // If external viewer, check for agreement and load reflections
      let agreement: SharedUnderstandingAgreement | null = null;
      if (!isOwnerView) {
        const access = await sharedUnderstandingService.hasAccess(
          ownerId,
          user.id,
          skillId,
          selectedContextId
        );
        if (!access.hasAccess) {
          console.error('No access agreement found');
          setLoading(false);
          return;
        }
        agreement = access.agreement || null;
        setExternalAgreement(agreement);

        // Load external reflections if allowed
        if (agreement && (agreement.allowed_interactions.includes('reflect') || agreement.allowed_interactions.includes('ask_questions'))) {
          try {
            const reflections = await sharedUnderstandingService.getReflectionsForSkill(
              skillId,
              selectedContextId
            );
            setExternalReflections(reflections);
          } catch (err) {
            console.warn('Failed to load external reflections:', err);
          }
        }
      } else {
        setExternalAgreement(null);
        // Owner can see all reflections
        try {
          const reflections = await sharedUnderstandingService.getReflectionsForSkill(
            skillId,
            selectedContextId
          );
          setExternalReflections(reflections);
        } catch (err) {
          console.warn('Failed to load external reflections:', err);
        }
      }

      // Load contexts (use owner ID for data fetching)
      const contextsData = await skillContextsService.getContextsForSkill(ownerId, skillId);
      setContexts(contextsData);

      // Select context if not set
      if (!selectedContextId && contextsData.length > 0) {
        const activeContext = contextsData.find(c => c.status === 'active') || contextsData[0];
        setSelectedContextId(activeContext.id);
      }

      // Load links (use owner ID for data fetching)
      const linksData = await skillEntityLinksService.getLinksForSkill(
        ownerId,
        skillId,
        selectedContextId
      );
      setLinks(linksData);

      // Load narrative (use owner ID, but external viewers get read-only narrative)
      const narrativeData = await generateSkillNarrative(ownerId, skillId, selectedContextId);
      setNarrative(narrativeData);

      // Set intent value if context exists
      const currentContext = contextsData.find(c => c.id === selectedContextId);
      if (currentContext) {
        setIntentValue(currentContext.intent || '');
        
        // Compute context state
        const state = computeContextState(
          currentContext,
          skillData.last_used_at,
          skillData.usage_count
        );
        setContextState(state);
      }

      // Load skill context (momentum, habits, practice summary) - read-only
      if (isOwnerView) {
        try {
          const [momentum, habits, summary, meaning] = await Promise.all([
            getSkillMomentum(ownerId, skillId),
            getHabitsPracticingSkill(ownerId, skillId),
            getRecentPracticeSummary(ownerId, skillId),
            getWhyThisMattersForSkill(ownerId, skillId),
          ]);
          setSkillMomentum(momentum);
          setHabitsPracticing(habits);
          setPracticeSummary(summary);
          setWhyThisMatters(meaning);
        } catch (err) {
          console.error('Failed to load skill context:', err);
          // Non-fatal: continue without context
        }
      }
    } catch (err) {
      console.error('Failed to load skill data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, isOpen: !s.isOpen } : s))
    );
  };

  const handleSaveIntent = async () => {
    // Shared Understanding Safety Boundary
    if (!isOwner) {
      console.error('External viewers cannot edit context intent');
      return;
    }
    
    if (!user || !selectedContextId) return;
    try {
      await skillContextsService.updateContext(selectedContextId, {
        intent: intentValue.trim() || undefined,
      });
      setEditingIntent(false);
      await loadData();
    } catch (err) {
      console.error('Failed to update intent:', err);
      alert('Failed to update intent');
    }
  };

  const handleDismissReflection = async (reflectionId: string) => {
    // Shared Understanding Safety Boundary
    if (!isOwner) {
      console.error('Only owners can dismiss reflections');
      return;
    }
    
    try {
      await sharedUnderstandingService.dismissReflection(reflectionId);
      await loadData();
    } catch (err) {
      console.error('Failed to dismiss reflection:', err);
      alert('Failed to dismiss reflection');
    }
  };

  const selectedContext = contexts.find(c => c.id === selectedContextId);

  if (!isOpen) return null;

  if (loading || !skill) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading skill details...</p>
        </div>
      </div>
    );
  }

  if (!permissions.can_view) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          </div>
          <p className="text-gray-600 mb-6">You don't have permission to view this skill.</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Group links by type
  const linksByType = {
    habit: links.filter(l => l.entity_type === 'habit'),
    goal: links.filter(l => l.entity_type === 'goal'),
    project: links.filter(l => l.entity_type === 'project'),
    trip: links.filter(l => l.entity_type === 'trip'),
    calendar_event: links.filter(l => l.entity_type === 'calendar_event'),
    journal_entry: links.filter(l => l.entity_type === 'journal_entry'),
    learning_resource: links.filter(l => l.entity_type === 'learning_resource'),
  };

  const getEntityIcon = (type: SkillEntityLink['entity_type']) => {
    switch (type) {
      case 'habit':
        return Target;
      case 'goal':
        return BookOpen;
      case 'project':
        return FolderKanban;
      case 'trip':
        return Calendar;
      case 'calendar_event':
        return Calendar;
      case 'journal_entry':
        return FileText;
      case 'learning_resource':
        return GraduationCap;
      default:
        return Target;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header Section */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{skill.name}</h2>
                {skill.category && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                    {CATEGORY_LABELS[skill.category]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {PROFICIENCY_LABELS[skill.proficiency as keyof typeof PROFICIENCY_LABELS]}
                  </span>
                </div>
                {skill.confidence_level && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">
                      Confidence: {skill.confidence_level}/5
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Context Selector */}
          {contexts.length > 1 && (
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                View Context
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedContextId || ''}
                  onChange={(e) => setSelectedContextId(e.target.value || undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Contexts</option>
                  {contexts.map(ctx => (
                    <option key={ctx.id} value={ctx.id}>
                      {CONTEXT_TYPE_LABELS[ctx.context_type] || ctx.context_type}
                      {ctx.role_label ? ` (${ctx.role_label})` : ''}
                      {ctx.status !== 'active' ? ` - ${STATUS_LABELS[ctx.status]}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowScenarioView(true)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                  title="Compare contexts"
                >
                  Compare Contexts
                </button>
              </div>
              </div>
            )}
          </div>

        <div className="p-6 space-y-6">
          {/* Perspective Banner (External Viewers Only) */}
          {isExternalViewer && externalAgreement && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Viewing as: {externalAgreement.role_label || externalAgreement.role}
                    {selectedContextId && (
                      <span className="text-gray-700">
                        {' '}({CONTEXT_TYPE_LABELS[contexts.find(c => c.id === selectedContextId)?.context_type || ''] || 'Context'})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Read-only view. You can observe and understand, but cannot edit or control.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Skill Context Section (Practice, Habits, Momentum) - After proficiency/confidence, before evidence */}
          {isOwner && skillMomentum && practiceSummary && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <SkillContextSection
                habits={habitsPracticing}
                practiceSummary={practiceSummary}
                momentum={skillMomentum}
                compact={false}
              />
              
              {/* Why This Matters Section */}
              <WhyThisMattersSection
                context={whyThisMatters}
                compact={false}
              />
            </div>
          )}

          {/* Context Summary Section */}
          {selectedContext && (
            <Section
              title="Context Summary"
              isOpen={sections.find(s => s.id === 'context')?.isOpen ?? true}
              onToggle={() => toggleSection('context')}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Context Type
                    </label>
                    <p className="text-sm font-medium text-gray-900">
                      {CONTEXT_TYPE_LABELS[selectedContext.context_type] || selectedContext.context_type}
                    </p>
                  </div>
                  {selectedContext.role_label && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Role
                      </label>
                      <p className="text-sm text-gray-900">{selectedContext.role_label}</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-500">
                      Intent
                    </label>
                    {permissions.can_edit && isOwner && !editingIntent && (
                      <button
                        onClick={() => setEditingIntent(true)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  {editingIntent ? (
                    <div className="space-y-2">
                      <textarea
                        value={intentValue}
                        onChange={(e) => setIntentValue(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Why does this skill matter in this context?"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingIntent(false);
                            setIntentValue(selectedContext.intent || '');
                          }}
                          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveIntent}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                        >
                          <Save size={14} />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">
                      {selectedContext.intent || 'No intent specified'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedContext.status === 'active' ? 'bg-green-100 text-green-700' :
                      selectedContext.status === 'background' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {STATUS_LABELS[selectedContext.status]}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Pressure Level
                    </label>
                    <p className="text-sm text-gray-900">
                      {PRESSURE_LEVEL_LABELS[selectedContext.pressure_level]}
                    </p>
                  </div>
                  {selectedContext.confidence_level && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Confidence
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedContext.confidence_level}/5
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* AI Narrative Panel */}
          {narrative && (
            <Section
              title="AI Narrative"
              isOpen={sections.find(s => s.id === 'narrative')?.isOpen ?? true}
              onToggle={() => toggleSection('narrative')}
            >
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  {narrative.sentences.map((sentence, idx) => (
                    <p key={idx} className="text-gray-700 mb-2">
                      {sentence.text}
                    </p>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setShowNarrativeExplanation(!showNarrativeExplanation)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showNarrativeExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Why am I seeing this?
                  </button>
                  {showNarrativeExplanation && (
                    <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700 mb-2">{narrative.explanation}</p>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-600 mb-1">Data Sources:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {narrative.data_sources.map((source, idx) => (
                            <li key={idx}>{source}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

          {/* Linked Activity Section */}
          <Section
            title="Linked Activity"
            isOpen={sections.find(s => s.id === 'linked')?.isOpen ?? true}
            onToggle={() => toggleSection('linked')}
          >
            <div className="space-y-4">
              {links.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                  <Link2 size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700 mb-1">No connections yet</p>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Link this skill to habits, goals, or projects when something actively supports this skill.
                  </p>
                </div>
              ) : (
                <>
                  {linksByType.habit.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Target size={16} className="text-green-600" />
                        Habits ({linksByType.habit.length})
                      </h4>
                          <div className="space-y-2">
                            {linksByType.habit.map(link => (
                              <LinkItem key={link.id} link={link} mode={mode} />
                            ))}
                          </div>
                        </div>
                      )}

                      {linksByType.goal.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <BookOpen size={16} className="text-blue-600" />
                            Goals ({linksByType.goal.length})
                          </h4>
                          <div className="space-y-2">
                            {linksByType.goal.map(link => (
                              <LinkItem key={link.id} link={link} mode={mode} />
                            ))}
                          </div>
                        </div>
                      )}

                      {linksByType.project.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <FolderKanban size={16} className="text-purple-600" />
                            Projects ({linksByType.project.length})
                          </h4>
                          <div className="space-y-2">
                            {linksByType.project.map(link => (
                              <LinkItem key={link.id} link={link} mode={mode} />
                            ))}
                          </div>
                        </div>
                      )}

                      {linksByType.calendar_event.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Calendar size={16} className="text-orange-600" />
                            Calendar Events ({linksByType.calendar_event.length})
                          </h4>
                          <div className="space-y-2">
                            {linksByType.calendar_event.map(link => (
                              <LinkItem key={link.id} link={link} mode={mode} />
                            ))}
                          </div>
                        </div>
                      )}
                </>
              )}

              {permissions.can_edit && isOwner && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <SkillLinkManager
                    skillId={skillId}
                    contextId={selectedContextId}
                    onLinkChange={loadData}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* Timeline Section */}
          <Section
            title="Timeline"
            isOpen={sections.find(s => s.id === 'timeline')?.isOpen ?? false}
            onToggle={() => toggleSection('timeline')}
          >
            <SkillTimeline
              skillId={skillId}
              contextId={selectedContextId}
              isOpen={sections.find(s => s.id === 'timeline')?.isOpen ?? false}
              isReadOnly={isExternalViewer}
            />
          </Section>

          {/* Planning Section (Only if editable and owner) */}
          {permissions.can_edit && isOwner && (
            <Section
              title="Planning"
              isOpen={sections.find(s => s.id === 'planning')?.isOpen ?? false}
              onToggle={() => toggleSection('planning')}
            >
              <SkillPlanningPanel
                skillId={skillId}
                contextId={selectedContextId}
                mode={mode}
                canEdit={permissions.can_edit}
                onPlanChange={loadData}
              />
            </Section>
          )}

          {/* External Reflections Section */}
          {externalReflections.length > 0 && (
            <Section
              title="External Reflections"
              isOpen={sections.find(s => s.id === 'reflections')?.isOpen ?? true}
              onToggle={() => toggleSection('reflections')}
            >
              <div className="space-y-3">
                {externalReflections.map(reflection => (
                  <div
                    key={reflection.id}
                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-blue-900">
                            {externalAgreement?.role_label || externalAgreement?.role || 'External Viewer'}
                          </span>
                          <span className="text-xs text-blue-700">
                            • {new Date(reflection.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800">{reflection.reflection_text}</p>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleDismissReflection(reflection.id)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Dismiss reflection"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Evidence & History Section */}
          <Section
            title="Evidence & History"
            isOpen={sections.find(s => s.id === 'evidence')?.isOpen ?? false}
            onToggle={() => toggleSection('evidence')}
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Evidence tracking will be available in a future update.
              </p>
              {skill.last_used_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={16} />
                  <span>Last activity: {new Date(skill.last_used_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Context Management (if editable and owner) */}
          {permissions.can_edit && isOwner && (
            <div className="pt-4 border-t border-gray-200">
              <SkillContextManager skillId={skillId} onContextChange={loadData} />
            </div>
          )}

          {/* Shared Understanding Manager (owner only) */}
          {isOwner && (
            <Section
              title="Shared Understanding"
              isOpen={sections.find(s => s.id === 'shared_understanding')?.isOpen ?? false}
              onToggle={() => toggleSection('shared_understanding')}
            >
              <SharedUnderstandingManager
                skillId={skillId}
                contextId={selectedContextId}
                onAgreementChange={loadData}
              />
            </Section>
          )}
        </div>
      </div>

      {/* Scenario View Modal */}
      {showScenarioView && (
        <SkillScenarioView
          isOpen={showScenarioView}
          onClose={() => setShowScenarioView(false)}
          skillId={skillId}
          mode={mode}
        />
      )}
    </div>
  );
}

// Collapsible Section Component
function Section({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && <div className="px-4 py-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// Link Item Component
function LinkItem({ link }: { link: SkillEntityLink }) {
  const Icon = getEntityIcon(link.entity_type);
  const entityTypeLabels: Record<SkillEntityLink['entity_type'], string> = {
    habit: 'Habit',
    goal: 'Goal',
    project: 'Project',
    trip: 'Trip',
    calendar_event: 'Calendar Event',
    journal_entry: 'Journal Entry',
    learning_resource: 'Learning Resource',
  };

  return (
    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-blue-600" />
        <span className="text-sm text-gray-900">
          {entityTypeLabels[link.entity_type]}
        </span>
        {link.link_notes && (
          <span className="text-xs text-gray-500">• {link.link_notes}</span>
        )}
      </div>
      {/* TODO: Add navigation to entity detail */}
    </div>
  );
}

function getEntityIcon(type: SkillEntityLink['entity_type']) {
  switch (type) {
    case 'habit':
      return Target;
    case 'goal':
      return BookOpen;
    case 'project':
      return FolderKanban;
    case 'trip':
      return Calendar;
    case 'calendar_event':
      return Calendar;
    case 'journal_entry':
      return FileText;
    case 'learning_resource':
      return GraduationCap;
    default:
      return Target;
  }
}

