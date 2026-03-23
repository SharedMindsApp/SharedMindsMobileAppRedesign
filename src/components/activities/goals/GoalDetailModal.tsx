/**
 * Goal Detail Modal
 * 
 * Full goal view with progress, requirements, and actions.
 */

import { useState, useEffect } from 'react';
import { X, Target, CheckCircle2, Calendar, TrendingUp, Edit2, Trash2, Plus, ArrowRight, Award, Link2 } from 'lucide-react';
import { computeGoalProgress, markGoalCompleted, extendGoal, expandGoal, archiveGoal, getGoalRequirements } from '../../../lib/goals/goalsService';
import type { Goal, GoalProgress } from '../../../lib/goals/goalsService';
import { emitActivityChanged } from '../../../lib/activities/activityEvents';
import { GoalRequirementBuilderSheet } from './GoalRequirementBuilderSheet';
import { skillEntityLinksService, skillsService } from '../../../lib/skillsService';
import { SkillDetailModal } from '../../skills/SkillDetailModal';

export interface GoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal;
  userId: string;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
    can_manage: boolean;
    detail_level: 'overview' | 'detailed';
  };
  onGoalUpdated?: () => void;
}

export function GoalDetailModal({
  isOpen,
  onClose,
  goal,
  userId,
  permissions,
  onGoalUpdated,
}: GoalDetailModalProps) {
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequirementBuilder, setShowRequirementBuilder] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [relatedSkills, setRelatedSkills] = useState<Array<{ skill: any; link: any }>>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProgress();
      loadRelatedSkills();
    }
  }, [isOpen, goal.id, userId]);

  const loadRelatedSkills = async () => {
    setLoadingSkills(true);
    try {
      // Skill linking is owner-controlled only
      const links = await skillEntityLinksService.getLinksForEntity(userId, 'goal', goal.id);
      const skillsWithLinks = await Promise.all(
        links.map(async (link) => {
          const skill = await skillsService.getById(link.skill_id);
          return { skill, link };
        })
      );
      setRelatedSkills(skillsWithLinks.filter(item => item.skill !== null));
    } catch (error) {
      console.error('Error loading related skills:', error);
    } finally {
      setLoadingSkills(false);
    }
  };

  const loadProgress = async () => {
    try {
      setLoading(true);
      const goalProgress = await computeGoalProgress(userId, goal.id);
      setProgress(goalProgress);
    } catch (err) {
      console.error('[GoalDetailModal] Error loading progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      await markGoalCompleted(userId, goal.id);
      emitActivityChanged(goal.goal_activity_id);
      onGoalUpdated?.();
      onClose();
    } catch (err) {
      console.error('[GoalDetailModal] Error marking complete:', err);
      alert('Failed to mark goal as complete');
    }
  };

  const handleExtend = async () => {
    if (!newEndDate) return;

    try {
      await extendGoal(userId, goal.id, { newEndDate });
      emitActivityChanged(goal.goal_activity_id);
      onGoalUpdated?.();
      setShowExtendDialog(false);
      loadProgress();
    } catch (err) {
      console.error('[GoalDetailModal] Error extending goal:', err);
      alert('Failed to extend goal');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this goal?')) return;

    try {
      await archiveGoal(userId, goal.id);
      emitActivityChanged(goal.goal_activity_id);
      onGoalUpdated?.();
      onClose();
    } catch (err) {
      console.error('[GoalDetailModal] Error archiving goal:', err);
      alert('Failed to archive goal');
    }
  };

  if (!isOpen || !permissions.can_view) return null;

  const showDetails = permissions.detail_level === 'detailed';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-2xl max-h-screen-safe overflow-hidden flex flex-col overscroll-contain">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <Target size={24} className="text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{progress?.activity.title || 'Goal'}</h2>
                {progress?.activity.description && (
                  <p className="text-sm text-gray-500 mt-1">{progress.activity.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading progress...</div>
            ) : progress ? (
              <>
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Overall Progress</div>
                      <div className="text-4xl font-bold text-blue-600">{Math.round(progress.overallProgress)}%</div>
                    </div>
                    {progress.goal.status === 'completed' && (
                      <CheckCircle2 size={48} className="text-green-600" />
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500"
                      style={{ width: `${progress.overallProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar size={14} />
                      {progress.remainingDays !== null ? (
                        <span>{progress.remainingDays} days remaining</span>
                      ) : (
                        <span>No deadline</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <TrendingUp size={14} />
                      <span>{progress.completedCount}/{progress.totalCount} requirements</span>
                    </div>
                  </div>
                </div>

                {/* Requirements List */}
                {showDetails && progress.requirementProgress.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Requirements</h3>
                      {permissions.can_edit && (
                        <button
                          onClick={() => setShowRequirementBuilder(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus size={16} />
                          Add
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {progress.requirementProgress.map((req, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {req.requirement.requirement_type === 'habit_streak' ? 'Streak' : 'Count'}
                              </span>
                              {req.status === 'completed' && (
                                <CheckCircle2 size={16} className="text-green-600" />
                              )}
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {req.completed}/{req.target}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                req.status === 'completed'
                                  ? 'bg-green-500'
                                  : req.status === 'on_track'
                                  ? 'bg-blue-500'
                                  : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(100, req.progress)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {Math.round(req.progress)}% complete
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Skills Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Award size={18} className="text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Related Skills</h3>
                  </div>
                  {loadingSkills ? (
                    <div className="text-sm text-gray-500">Loading skills...</div>
                  ) : relatedSkills.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                      <Link2 size={20} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No skills linked to this goal</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {relatedSkills.map(({ skill, link }) => (
                        <button
                          key={skill.id}
                          onClick={() => setSelectedSkillId(skill.id)}
                          className="w-full text-left p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award size={16} className="text-blue-600" />
                              <span className="font-medium text-gray-900">{skill.name}</span>
                            </div>
                            <ArrowRight size={16} className="text-gray-400" />
                          </div>
                          {link.link_notes && (
                            <p className="text-xs text-gray-600 mt-1 ml-6">{link.link_notes}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {permissions.can_manage && (
                  <div className="border-t border-gray-200 pt-6 space-y-3">
                    {progress.goal.status === 'active' && progress.overallProgress >= 100 && (
                      <button
                        onClick={handleMarkComplete}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle2 size={20} />
                        Mark as Complete
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowExtendDialog(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Calendar size={16} />
                        Extend
                      </button>
                      <button
                        onClick={handleArchive}
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                        Archive
                      </button>
                    </div>
                  </div>
                )}

                {/* Extend Dialog */}
                {showExtendDialog && (
                  <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                      <h3 className="text-lg font-semibold mb-4">Extend Goal</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New End Date
                          </label>
                          <input
                            type="date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setShowExtendDialog(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleExtend}
                            disabled={!newEndDate}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          >
                            Extend
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">Failed to load progress</div>
            )}
          </div>
        </div>
      </div>

      {/* Requirement Builder */}
      {showRequirementBuilder && (
        <GoalRequirementBuilderSheet
          isOpen={showRequirementBuilder}
          onClose={() => setShowRequirementBuilder(false)}
          goalId={goal.id}
          userId={userId}
          onRequirementAdded={() => {
            loadProgress();
            setShowRequirementBuilder(false);
          }}
        />
      )}

      {/* Skill Detail Modal */}
      {selectedSkillId && (
        <SkillDetailModal
          isOpen={true}
          onClose={() => setSelectedSkillId(null)}
          skillId={selectedSkillId}
          mode="planner"
          permissions={{ can_view: true, can_edit: false, can_manage: false }}
        />
      )}
    </>
  );
}

