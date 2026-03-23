/**
 * Skills Development View - MVP Polish
 * 
 * Clear, human-centered view of skills with focus on:
 * - What skills do I have?
 * - Which skills am I actively developing?
 * - In which contexts do these skills matter?
 * - What connects to this skill?
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Target, Plus, Network, List, Briefcase, GraduationCap, Heart, Activity, Users, Link2, Award } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  skillsService,
  skillContextsService,
  skillEntityLinksService,
  type UserSkill,
  type SkillContext,
  type SkillEntityLink,
  type SkillContextType,
  PROFICIENCY_LABELS,
  CATEGORY_LABELS,
} from '../../../lib/skillsService';
import { SkillsMap } from '../../guardrails/reality/SkillsMap';
import { SkillDetailModal } from '../../skills/SkillDetailModal';
import { AddSkillModal } from '../../guardrails/reality/AddSkillModal';

// Context type icons and labels
const CONTEXT_ICONS: Record<SkillContextType, typeof Briefcase> = {
  work: Briefcase,
  education: GraduationCap,
  hobby: Heart,
  life: Activity,
  health: Activity,
  therapy: Heart,
  parenting: Users,
  coaching: Users,
  other: BookOpen,
};

const CONTEXT_LABELS: Record<SkillContextType, string> = {
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

interface SkillWithContexts {
  skill: UserSkill;
  contexts: SkillContext[];
  links: SkillEntityLink[];
  hasActiveContext: boolean;
}

type ViewType = 'currently-developing' | 'all' | 'map';

export function SkillsDevelopmentView() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>('currently-developing');
  const [skills, setSkills] = useState<SkillWithContexts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSkills();
    }
  }, [user, view]);

  const loadSkills = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load all skills
      const allSkills = await skillsService.getAll(user.id);
      
      // Load contexts and links for all skills
      const skillsWithData: SkillWithContexts[] = await Promise.all(
        allSkills.map(async (skill) => {
          const contexts = await skillContextsService.getContextsForSkill(user.id, skill.id);
          const links = await skillEntityLinksService.getLinksForSkill(user.id, skill.id);
          const hasActiveContext = contexts.some(ctx => ctx.status === 'active');
          
          return {
            skill,
            contexts,
            links,
            hasActiveContext,
          };
        })
      );

      // Filter based on view
      let filtered: SkillWithContexts[];
      if (view === 'currently-developing') {
        filtered = skillsWithData.filter(s => s.hasActiveContext);
      } else {
        filtered = skillsWithData;
      }

      setSkills(filtered);
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  };

  // If map view, use SkillsMap component
  if (view === 'map') {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setView('currently-developing')}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ← Back to Development View
          </button>
        </div>
        <SkillsMap mode="planner" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading your skills...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Skills Development</h1>
          <p className="text-gray-600 max-w-2xl">
            Track your skills and how they show up across different parts of your life.
          </p>
        </div>
        
        {/* Primary CTA - Add Skill */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
        >
          <Plus size={20} />
          Add Skill
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setView('currently-developing')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            view === 'currently-developing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Target size={18} />
            Currently Developing
            {view === 'currently-developing' && (
              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {skills.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setView('all')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            view === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <List size={18} />
            All Skills
          </span>
        </button>
        <button
          onClick={() => setView('map')}
          className={`px-4 py-3 font-medium transition-colors border-b-2 ${
            view === 'map'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Network size={18} />
            Map View
          </span>
        </button>
      </div>

      {/* Skills List */}
      {skills.length === 0 ? (
        <EmptyState view={view} onAddSkill={() => setShowAddModal(true)} />
      ) : (
        <div className="grid gap-4">
          {skills.map(({ skill, contexts, links }) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              contexts={contexts}
              links={links}
              onClick={() => setSelectedSkillId(skill.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSkillModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSkills();
          }}
        />
      )}

      {selectedSkillId && (
        <SkillDetailModal
          isOpen={true}
          onClose={() => setSelectedSkillId(null)}
          skillId={selectedSkillId}
          mode="planner"
          permissions={{ can_view: true, can_edit: true, can_manage: true }}
        />
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ view, onAddSkill }: { view: ViewType; onAddSkill: () => void }) {
  if (view === 'currently-developing') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No skills currently in development
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Skills marked with an active context will appear here. This helps you focus on what you're actively working on right now.
        </p>
        <button
          onClick={onAddSkill}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          Add Your First Skill
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No skills yet
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Start by adding skills you want to track and develop. Skills can exist across different parts of your life—work, education, hobbies, and more.
      </p>
      <button
        onClick={onAddSkill}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <Plus size={20} />
        Add Your First Skill
      </button>
    </div>
  );
}

// Improved Skill Card Component
function SkillCard({
  skill,
  contexts,
  links,
  onClick,
}: {
  skill: UserSkill;
  contexts: SkillContext[];
  links: SkillEntityLink[];
  onClick: () => void;
}) {
  const activeContexts = contexts.filter(ctx => ctx.status === 'active');
  const backgroundContexts = contexts.filter(ctx => ctx.status === 'background');
  
  // Group links by type
  const linksByType = {
    habit: links.filter(l => l.entity_type === 'habit'),
    goal: links.filter(l => l.entity_type === 'goal'),
    project: links.filter(l => l.entity_type === 'project'),
    other: links.filter(l => !['habit', 'goal', 'project'].includes(l.entity_type)),
  };

  const totalLinks = links.length;
  const linkSummary = [];
  if (linksByType.habit.length > 0) linkSummary.push(`${linksByType.habit.length} habit${linksByType.habit.length !== 1 ? 's' : ''}`);
  if (linksByType.goal.length > 0) linkSummary.push(`${linksByType.goal.length} goal${linksByType.goal.length !== 1 ? 's' : ''}`);
  if (linksByType.project.length > 0) linkSummary.push(`${linksByType.project.length} project${linksByType.project.length !== 1 ? 's' : ''}`);
  if (linksByType.other.length > 0) linkSummary.push(`${linksByType.other.length} other`);

  // Build status line
  const statusParts = [];
  if (activeContexts.length > 0) {
    const contextTypes = activeContexts.map(ctx => CONTEXT_LABELS[ctx.context_type]).join(', ');
    statusParts.push(`Active in ${contextTypes}`);
  }
  if (backgroundContexts.length > 0) {
    const contextTypes = backgroundContexts.map(ctx => CONTEXT_LABELS[ctx.context_type]).join(', ');
    statusParts.push(`Background in ${contextTypes}`);
  }
  const statusLine = statusParts.join(' · ') || 'No active contexts';

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-semibold text-gray-900">{skill.name}</h3>
            {skill.category && (
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                {CATEGORY_LABELS[skill.category]}
              </span>
            )}
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
              {PROFICIENCY_LABELS[skill.proficiency as keyof typeof PROFICIENCY_LABELS]}
            </span>
          </div>

          {/* Context Badges */}
          {contexts.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {contexts.map((context) => {
                const Icon = CONTEXT_ICONS[context.context_type];
                return (
                  <div
                    key={context.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                      context.status === 'active'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : context.status === 'background'
                        ? 'bg-gray-50 text-gray-600 border border-gray-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}
                  >
                    <Icon size={14} />
                    {CONTEXT_LABELS[context.context_type]}
                    {context.role_label && (
                      <span className="text-xs opacity-75">({context.role_label})</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Status Line */}
          <p className="text-sm text-gray-600 mb-3">{statusLine}</p>

          {/* Connection Badges - Prominent Display */}
          {totalLinks > 0 ? (
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <Link2 size={14} className="text-blue-600" />
                <span>Connected to:</span>
              </div>
              {linksByType.habit.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                  <Target size={12} />
                  {linksByType.habit.length} Habit{linksByType.habit.length !== 1 ? 's' : ''}
                </div>
              )}
              {linksByType.goal.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                  <Award size={12} />
                  {linksByType.goal.length} Goal{linksByType.goal.length !== 1 ? 's' : ''}
                </div>
              )}
              {linksByType.project.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                  <Network size={12} />
                  {linksByType.project.length} Project{linksByType.project.length !== 1 ? 's' : ''}
                </div>
              )}
              {linksByType.other.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium">
                  <Link2 size={12} />
                  {linksByType.other.length} Other
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 italic">
                Skills become more useful when linked to habits, goals, or projects.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
