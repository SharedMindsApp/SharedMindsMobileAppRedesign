/**
 * Skill Scenario View
 * 
 * Allows users to compare contexts side-by-side for the same skill.
 * Observational only - no judgments, no "better/worse" comparisons.
 * 
 * PRINCIPLES:
 * - Compare without judging
 * - Show differences, not evaluations
 * - No progress bars or deltas
 * - No implied improvements
 */

import { useState, useEffect } from 'react';
import { X, Calendar, Target, BookOpen, FolderKanban, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  skillContextsService,
  skillEntityLinksService,
  type SkillContext,
} from '../../lib/skillsService';
import { computeContextState, getStateBadgeClass } from '../../lib/skills/skillContextState';
import { getSkillTimeline } from '../../lib/skills/skillTimelineService';
import { skillPlanningService } from '../../lib/skills/skillPlanningService';

interface SkillScenarioViewProps {
  isOpen: boolean;
  onClose: () => void;
  skillId: string;
  mode: 'guardrails' | 'planner';
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

export function SkillScenarioView({
  isOpen,
  onClose,
  skillId,
  mode,
}: SkillScenarioViewProps) {
  const { user } = useAuth();
  const [contexts, setContexts] = useState<SkillContext[]>([]);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);
  const [contextData, setContextData] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user && skillId) {
      loadData();
    }
  }, [isOpen, user, skillId]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load all contexts for this skill
      const contextsData = await skillContextsService.getContextsForSkill(user.id, skillId);
      setContexts(contextsData);
      
      // Select first two contexts for comparison
      if (contextsData.length >= 2) {
        setSelectedContexts([contextsData[0].id, contextsData[1].id]);
      } else if (contextsData.length === 1) {
        setSelectedContexts([contextsData[0].id]);
      }

      // Load data for each context
      const dataMap = new Map();
      for (const context of contextsData) {
        const [links, timeline, plan] = await Promise.all([
          skillEntityLinksService.getLinksForSkill(user.id, skillId, context.id),
          getSkillTimeline(user.id, skillId, context.id),
          skillPlanningService.getPlanForContext(user.id, skillId, context.id),
        ]);

        // Get last activity from timeline
        const lastActivity = timeline.length > 0 ? timeline[0].timestamp : undefined;
        const state = computeContextState(context, lastActivity);

        dataMap.set(context.id, {
          context,
          links,
          timeline,
          plan,
          state,
        });
      }
      setContextData(dataMap);
    } catch (err) {
      console.error('Failed to load scenario data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Context Comparison</h2>
              <p className="text-sm text-gray-600 mt-1">
                Compare contexts side-by-side. Observational only — no judgments.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Context Selector */}
          {contexts.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select contexts to compare (up to 2)
              </label>
              <div className="flex flex-wrap gap-2">
                {contexts.map(context => {
                  const isSelected = selectedContexts.includes(context.id);
                  return (
                    <button
                      key={context.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedContexts(selectedContexts.filter(id => id !== context.id));
                        } else if (selectedContexts.length < 2) {
                          setSelectedContexts([...selectedContexts, context.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {CONTEXT_TYPE_LABELS[context.context_type] || context.context_type}
                      {context.role_label && ` (${context.role_label})`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Comparison Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading scenario data...</p>
            </div>
          ) : selectedContexts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Select contexts to compare</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${selectedContexts.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {selectedContexts.map(contextId => {
                const data = contextData.get(contextId);
                if (!data) return null;

                const { context, links, timeline, plan, state } = data;
                const linksByType = {
                  habit: links.filter(l => l.entity_type === 'habit'),
                  goal: links.filter(l => l.entity_type === 'goal'),
                  project: links.filter(l => l.entity_type === 'project'),
                };

                return (
                  <div key={contextId} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {CONTEXT_TYPE_LABELS[context.context_type] || context.context_type}
                      </h3>
                      {context.role_label && (
                        <p className="text-sm text-gray-600">Role: {context.role_label}</p>
                      )}
                    </div>

                    {/* Context State */}
                    {state && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">Activity State:</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${getStateBadgeClass(state.state)}`}
                            title={state.description}
                          >
                            {state.label}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Intent */}
                    {context.intent && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Intent
                        </label>
                        <p className="text-sm text-gray-700">{context.intent}</p>
                      </div>
                    )}

                    {/* Links Summary */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <label className="block text-xs font-medium text-gray-500 mb-2">
                        Connected Entities
                      </label>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                        {linksByType.habit.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Target size={14} className="text-green-600" />
                            {linksByType.habit.length} habit{linksByType.habit.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {linksByType.goal.length > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen size={14} className="text-blue-600" />
                            {linksByType.goal.length} goal{linksByType.goal.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {linksByType.project.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FolderKanban size={14} className="text-purple-600" />
                            {linksByType.project.length} project{linksByType.project.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {links.length === 0 && (
                          <span className="text-gray-500">No connections</span>
                        )}
                      </div>
                    </div>

                    {/* Timeline Summary */}
                    {timeline.length > 0 && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Recent Activity
                        </label>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Calendar size={14} />
                          <span>{timeline.length} event{timeline.length !== 1 ? 's' : ''} in timeline</span>
                        </div>
                      </div>
                    )}

                    {/* Planning Note */}
                    {plan && (
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 mb-2">
                          Planning Note
                        </label>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar size={14} className="text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">
                              {plan.timeframe === 'short' ? 'Short-term' :
                               plan.timeframe === 'medium' ? 'Medium-term' :
                               plan.timeframe === 'long' ? 'Long-term' : 'Open timeframe'}
                            </span>
                          </div>
                          {plan.intent_note && (
                            <p className="text-sm text-gray-700 mt-2">{plan.intent_note}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status & Pressure */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Status
                        </label>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          context.status === 'active' ? 'bg-green-100 text-green-700' :
                          context.status === 'background' ? 'bg-gray-100 text-gray-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {context.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Pressure Level
                        </label>
                        <span className="text-sm text-gray-700 capitalize">
                          {context.pressure_level || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

