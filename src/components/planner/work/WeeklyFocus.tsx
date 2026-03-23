import { useState, useEffect } from 'react';
import { ArrowLeft, Target, Calendar, Briefcase, AlertTriangle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface WeeklyObjective {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
}

interface ProjectSnapshot {
  id: string;
  name: string;
  status: string;
  progress: number;
}

interface Reflection {
  id: string;
  content: string;
  created_at: string;
}

export function WeeklyFocus() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [objectives, setObjectives] = useState<WeeklyObjective[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<ProjectSnapshot[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);

  const [newObjective, setNewObjective] = useState('');
  const [newRisk, setNewRisk] = useState('');
  const [newReflection, setNewReflection] = useState('');

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getWeekEnd(start: Date): Date {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }

  function formatWeekRange(start: Date): string {
    const end = getWeekEnd(start);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  useEffect(() => {
    if (user) {
      loadWeeklyData();
    }
  }, [user, weekStart]);

  const loadWeeklyData = async () => {
    if (!user) return;
    setLoading(true);

    const weekEnd = getWeekEnd(weekStart);
    const weekStartISO = weekStart.toISOString();
    const weekEndISO = weekEnd.toISOString();

    const { data: objectivesData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%weekly-objective%')
      .gte('created_at', weekStartISO)
      .lte('created_at', weekEndISO)
      .order('created_at', { ascending: false });

    if (objectivesData) {
      setObjectives(objectivesData.map(obj => {
        const metadata = obj.metadata as any || {};
        return {
          id: obj.id,
          title: obj.title || '',
          completed: metadata.completed || false,
          created_at: obj.created_at
        };
      }));
    }

    // Meetings are managed separately in the calendar view
    setMeetings([]);

    const { data: projectsData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%project%')
      .limit(5)
      .order('created_at', { ascending: false });

    if (projectsData) {
      setProjects(projectsData.map(p => {
        const metadata = p.metadata as any || {};
        return {
          id: p.id,
          name: p.title || '',
          status: metadata.status || 'active',
          progress: metadata.progress || 0
        };
      }));
    }

    const { data: risksData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%risk%')
      .gte('created_at', weekStartISO)
      .lte('created_at', weekEndISO)
      .order('created_at', { ascending: false });

    if (risksData) {
      setRisks(risksData.map(r => r.content || ''));
    }

    const { data: reflectionsData } = await supabase
      .from('daily_planner_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('life_area', 'work')
      .ilike('tags', '%weekly-reflection%')
      .gte('created_at', weekStartISO)
      .lte('created_at', weekEndISO)
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

  const addObjective = async () => {
    if (!user || !newObjective.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        title: newObjective,
        tags: 'weekly-objective',
        metadata: { completed: false }
      });

    setNewObjective('');
    loadWeeklyData();
  };

  const addRisk = async () => {
    if (!user || !newRisk.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        content: newRisk,
        tags: 'risk',
        metadata: {}
      });

    setNewRisk('');
    loadWeeklyData();
  };

  const addReflection = async () => {
    if (!user || !newReflection.trim()) return;

    await supabase
      .from('daily_planner_entries')
      .insert({
        user_id: user.id,
        life_area: 'work',
        content: newReflection,
        tags: 'weekly-reflection',
        metadata: {}
      });

    setNewReflection('');
    loadWeeklyData();
  };

  const previousWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const nextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const thisWeek = () => {
    setWeekStart(getWeekStart(new Date()));
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

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Weekly Focus</h1>
            <p className="text-slate-600 mt-1">Set direction and track weekly objectives</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={previousWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={thisWeek}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              This Week
            </button>
            <span className="px-4 py-2 bg-teal-50 text-teal-700 rounded-lg font-medium text-sm border border-teal-200">
              {formatWeekRange(weekStart)}
            </span>
            <button
              onClick={nextWeek}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading weekly focus...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Weekly Objectives</h2>
                </div>
                <div className="space-y-2 mb-4">
                  {objectives.map(obj => (
                    <div key={obj.id} className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <Target className="w-4 h-4 text-teal-600" />
                      <span className={`flex-1 ${obj.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {obj.title}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="Add weekly objective..."
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    onClick={addObjective}
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Key Meetings This Week</h2>
                </div>
                {meetings.length === 0 ? (
                  <p className="text-slate-500 text-sm">No meetings scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {meetings.map(meeting => (
                      <div key={meeting.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-800">{meeting.title}</p>
                            <p className="text-xs text-slate-600">{meeting.date} at {meeting.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-slate-800">Active Projects</h2>
                </div>
                {projects.length === 0 ? (
                  <p className="text-slate-500 text-sm">No active projects</p>
                ) : (
                  <div className="space-y-3">
                    {projects.map(project => (
                      <div key={project.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-800">{project.name}</p>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 border border-blue-200">
                            {project.status}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-teal-500 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{project.progress}% complete</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Risks & Blockers</h2>
                </div>
                <div className="space-y-2 mb-4">
                  {risks.map((risk, idx) => (
                    <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-sm text-slate-700">{risk}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value)}
                    placeholder="Note any risks or blockers..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    onClick={addRisk}
                    className="w-full px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Add Risk
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Weekly Reflections</h2>
                </div>
                <div className="space-y-2 mb-4">
                  {reflections.map(reflection => (
                    <div key={reflection.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700 leading-relaxed">{reflection.content}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(reflection.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <textarea
                    value={newReflection}
                    onChange={(e) => setNewReflection(e.target.value)}
                    placeholder="What went well? What could improve?"
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <button
                    onClick={addReflection}
                    className="w-full px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    Add Reflection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PlannerShell>
  );
}
