import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlannerShell } from '../PlannerShell';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface ProgressStats {
  totalGoals: number;
  completedGoals: number;
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  totalStudyHours: number;
  totalNotes: number;
  totalSkills: number;
}

export function ProgressMetrics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<ProgressStats>({
    totalGoals: 0,
    completedGoals: 0,
    totalCourses: 0,
    activeCourses: 0,
    completedCourses: 0,
    totalStudyHours: 0,
    totalNotes: 0,
    totalSkills: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgress();
    }
  }, [user]);

  const loadProgress = async () => {
    if (!user) return;
    setLoading(true);

    // Progress metrics are calculated separately
    const newStats: ProgressStats = {
      totalGoals: 0,
      completedGoals: 0,
      totalCourses: 0,
      activeCourses: 0,
      completedCourses: 0,
      totalStudyHours: 0,
      totalNotes: 0,
      totalSkills: 0
    };

    setStats(newStats);
    setLoading(false);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-800 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-700 mb-1">{title}</div>
      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
    </div>
  );

  const ProgressBar = ({ label, current, total, color }: any) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm text-slate-700 mb-2">
          <span>{label}</span>
          <span className="font-medium">{current} / {total}</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <PlannerShell>
      <div className="max-w-6xl mx-auto p-8">
        <button
          onClick={() => navigate('/planner/education')}
          className="flex items-center gap-2 px-4 py-2 mb-6 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Education</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Progress Metrics</h1>
          <p className="text-slate-600 mt-1">Track your learning journey with visual metrics</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600">Loading progress...</div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={CheckCircle2}
                title="Learning Goals"
                value={stats.totalGoals}
                subtitle={`${stats.completedGoals} completed`}
                color="bg-green-500"
              />
              <StatCard
                icon={FileText}
                title="Active Courses"
                value={stats.activeCourses}
                subtitle={`${stats.completedCourses} completed`}
                color="bg-blue-500"
              />
              <StatCard
                icon={Clock}
                title="Study Hours"
                value={stats.totalStudyHours}
                subtitle="Total logged time"
                color="bg-pink-500"
              />
              <StatCard
                icon={TrendingUp}
                title="Skills Tracked"
                value={stats.totalSkills}
                subtitle={`${stats.totalNotes} notes`}
                color="bg-purple-500"
              />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Completion Progress</h2>
              <ProgressBar
                label="Learning Goals"
                current={stats.completedGoals}
                total={stats.totalGoals}
                color="bg-green-500"
              />
              <ProgressBar
                label="Courses"
                current={stats.completedCourses}
                total={stats.totalCourses}
                color="bg-blue-500"
              />
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Learning Insights</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-800 mb-1">Keep Learning</div>
                    <div className="text-sm text-slate-600">
                      You have {stats.totalGoals - stats.completedGoals} active learning goals and{' '}
                      {stats.activeCourses} courses in progress.
                    </div>
                  </div>
                </div>

                {stats.totalStudyHours > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-pink-50 rounded-lg border border-pink-100">
                    <Clock className="w-5 h-5 text-pink-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-800 mb-1">Study Time</div>
                      <div className="text-sm text-slate-600">
                        You've logged {stats.totalStudyHours} hours of focused study time.
                      </div>
                    </div>
                  </div>
                )}

                {stats.totalNotes > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                    <FileText className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-800 mb-1">Notes & Documentation</div>
                      <div className="text-sm text-slate-600">
                        You've created {stats.totalNotes} study notes to capture your learning.
                      </div>
                    </div>
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
