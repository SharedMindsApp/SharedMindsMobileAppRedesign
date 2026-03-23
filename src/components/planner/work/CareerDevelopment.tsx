import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Target, BookOpen, Award, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface SkillGoal {
  id: string;
  skill: string;
  current_level: number;
  target_level: number;
  notes: string;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  achieved: boolean;
  created_at: string;
}

interface Reflection {
  id: string;
  content: string;
  created_at: string;
}

export function CareerDevelopment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<SkillGoal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showReflectionForm, setShowReflectionForm] = useState(false);

  const [newSkill, setNewSkill] = useState({ skill: '', current_level: 3, target_level: 5, notes: '' });
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '' });
  const [newReflection, setNewReflection] = useState('');

  useEffect(() => {
    if (user) {
      loadCareerData();
    }
  }, [user]);

  const loadCareerData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: skillsData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%skill-goal%')
      .order('created_at', { ascending: false });

    if (skillsData) {
      setSkills(skillsData.map(s => {
        const metadata = s.metadata as any || {};
        return {
          id: s.id,
          skill: s.title || '',
          current_level: metadata.current_level || 3,
          target_level: metadata.target_level || 5,
          notes: s.content || '',
          created_at: s.created_at
        };
      }));
    }

    const { data: milestonesData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%milestone%')
      .order('created_at', { ascending: false });

    if (milestonesData) {
      setMilestones(milestonesData.map(m => {
        const metadata = m.metadata as any || {};
        return {
          id: m.id,
          title: m.title || '',
          date: metadata.date || '',
          achieved: metadata.achieved || false,
          created_at: m.created_at
        };
      }));
    }

    const { data: reflectionsData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%career-reflection%')
      .order('created_at', { ascending: false });

    if (reflectionsData) {
      setReflections(reflectionsData.map(r => ({
        id: r.id,
        content: r.content || '',
        created_at: r.created_at
      })));
    }

    setLoading(false);
  };

  const addSkill = async () => {
    if (!user || !newSkill.skill.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newSkill.skill,
        content: newSkill.notes,
        tags: 'skill-goal',
        metadata: {
          current_level: newSkill.current_level,
          target_level: newSkill.target_level
        }
      });

    setNewSkill({ skill: '', current_level: 3, target_level: 5, notes: '' });
    setShowSkillForm(false);
    loadCareerData();
  };

  const addMilestone = async () => {
    if (!user || !newMilestone.title.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newMilestone.title,
        tags: 'milestone',
        metadata: {
          date: newMilestone.date,
          achieved: false
        }
      });

    setNewMilestone({ title: '', date: '' });
    setShowMilestoneForm(false);
    loadCareerData();
  };

  const addReflection = async () => {
    if (!user || !newReflection.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        content: newReflection,
        tags: 'career-reflection',
        metadata: {}
      });

    setNewReflection('');
    setShowReflectionForm(false);
    loadCareerData();
  };

  return (
    <PlannerShell>
      <div className="max-w-7xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/work')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Work & Career</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Career Development</h1>
          <p className="text-slate-600 mt-1">Long-term growth, skills, and milestones</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading career data...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-600" />
                    <h2 className="text-xl font-semibold text-slate-800">Skill Goals</h2>
                  </div>
                  <button
                    onClick={() => setShowSkillForm(!showSkillForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {showSkillForm && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newSkill.skill}
                        onChange={(e) => setNewSkill({ ...newSkill, skill: e.target.value })}
                        placeholder="Skill name..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Current Level</label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={newSkill.current_level}
                            onChange={(e) => setNewSkill({ ...newSkill, current_level: parseInt(e.target.value) })}
                            className="w-full"
                          />
                          <div className="text-xs text-center text-slate-600">{newSkill.current_level}/5</div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Target Level</label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={newSkill.target_level}
                            onChange={(e) => setNewSkill({ ...newSkill, target_level: parseInt(e.target.value) })}
                            className="w-full"
                          />
                          <div className="text-xs text-center text-slate-600">{newSkill.target_level}/5</div>
                        </div>
                      </div>
                      <textarea
                        value={newSkill.notes}
                        onChange={(e) => setNewSkill({ ...newSkill, notes: e.target.value })}
                        placeholder="Notes..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={addSkill}
                          className="px-4 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setShowSkillForm(false);
                            setNewSkill({ skill: '', current_level: 3, target_level: 5, notes: '' });
                          }}
                          className="px-4 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {skills.length === 0 ? (
                  <p className="text-slate-500 text-sm">No skill goals set</p>
                ) : (
                  <div className="space-y-3">
                    {skills.map(skill => (
                      <div key={skill.id} className="p-4 bg-slate-50 rounded-lg">
                        <h3 className="font-medium text-slate-800 mb-2">{skill.skill}</h3>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-slate-600 mb-1">
                            <span>Current: {skill.current_level}/5</span>
                            <span>Target: {skill.target_level}/5</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-teal-500 h-2 rounded-full transition-all"
                              style={{ width: `${(skill.current_level / skill.target_level) * 100}%` }}
                            />
                          </div>
                        </div>
                        {skill.notes && (
                          <p className="text-sm text-slate-600">{skill.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-teal-600" />
                    <h2 className="text-xl font-semibold text-slate-800">Milestones</h2>
                  </div>
                  <button
                    onClick={() => setShowMilestoneForm(!showMilestoneForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {showMilestoneForm && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                        placeholder="Milestone..."
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        value={newMilestone.date}
                        onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={addMilestone}
                          className="px-4 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setShowMilestoneForm(false);
                            setNewMilestone({ title: '', date: '' });
                          }}
                          className="px-4 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {milestones.length === 0 ? (
                  <p className="text-slate-500 text-sm">No milestones set</p>
                ) : (
                  <div className="space-y-2">
                    {milestones.map(milestone => (
                      <div key={milestone.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <Award className={`w-5 h-5 ${milestone.achieved ? 'text-green-500' : 'text-slate-400'}`} />
                        <div className="flex-1">
                          <p className={`font-medium ${milestone.achieved ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                            {milestone.title}
                          </p>
                          {milestone.date && (
                            <p className="text-xs text-slate-600">{new Date(milestone.date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Reflections</h2>
                  </div>
                  <button
                    onClick={() => setShowReflectionForm(!showReflectionForm)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {showReflectionForm && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <textarea
                      value={newReflection}
                      onChange={(e) => setNewReflection(e.target.value)}
                      placeholder="Career reflections..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={addReflection}
                        className="px-4 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowReflectionForm(false);
                          setNewReflection('');
                        }}
                        className="px-4 py-1.5 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {reflections.length === 0 ? (
                  <p className="text-slate-500 text-sm">No reflections yet</p>
                ) : (
                  <div className="space-y-3">
                    {reflections.map(reflection => (
                      <div key={reflection.id} className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-700 leading-relaxed mb-1">{reflection.content}</p>
                        <p className="text-xs text-slate-500">{new Date(reflection.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
