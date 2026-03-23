import React, { useState, useEffect } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface ScopeData {
  tasksCreated: number;
  tracksCreated: number;
  ideasCreated: number;
  sideProjectsCreated: number;
  tasksCompleted: number;
  totalAdditions: number;
  totalCompletions: number;
}

export function ScopeBalanceCard() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | '7days' | '14days'>('7days');
  const [scopeData, setScopeData] = useState<ScopeData>({
    tasksCreated: 0,
    tracksCreated: 0,
    ideasCreated: 0,
    sideProjectsCreated: 0,
    tasksCompleted: 0,
    totalAdditions: 0,
    totalCompletions: 0
  });

  useEffect(() => {
    if (user) {
      loadScopeData();
    }
  }, [user, timeframe]);

  async function loadScopeData() {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;

      if (timeframe === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (timeframe === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      }

      const startDateStr = startDate.toISOString();

      const { data: userProjects } = await supabase
        .from('master_projects')
        .select('id')
        .eq('user_id', user.id);

      const projectIds = userProjects?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        setScopeData({
          tasksCreated: 0,
          tracksCreated: 0,
          ideasCreated: 0,
          sideProjectsCreated: 0,
          tasksCompleted: 0,
          totalAdditions: 0,
          totalCompletions: 0
        });
        setLoading(false);
        return;
      }

      const [tasksCreatedRes, tracksCreatedRes, ideasCreatedRes, sideProjectsCreatedRes, tasksCompletedRes] = await Promise.all([
        supabase
          .from('taskflow_tasks')
          .select('id', { count: 'exact', head: true })
          .in('master_project_id', projectIds)
          .gte('created_at', startDateStr),

        supabase
          .from('guardrails_tracks')
          .select('id', { count: 'exact', head: true })
          .in('master_project_id', projectIds)
          .gte('created_at', startDateStr),

        supabase
          .from('offshoot_ideas')
          .select('id', { count: 'exact', head: true })
          .in('master_project_id', projectIds)
          .gte('created_at', startDateStr),

        supabase
          .from('side_projects')
          .select('id', { count: 'exact', head: true })
          .in('master_project_id', projectIds)
          .gte('created_at', startDateStr),

        supabase
          .from('taskflow_tasks')
          .select('id', { count: 'exact', head: true })
          .in('master_project_id', projectIds)
          .eq('status', 'completed')
          .gte('updated_at', startDateStr)
      ]);

      const tasksCreated = tasksCreatedRes.count || 0;
      const tracksCreated = tracksCreatedRes.count || 0;
      const ideasCreated = ideasCreatedRes.count || 0;
      const sideProjectsCreated = sideProjectsCreatedRes.count || 0;
      const tasksCompleted = tasksCompletedRes.count || 0;

      const totalAdditions = tasksCreated + tracksCreated + ideasCreated + sideProjectsCreated;
      const totalCompletions = tasksCompleted;

      setScopeData({
        tasksCreated,
        tracksCreated,
        ideasCreated,
        sideProjectsCreated,
        tasksCompleted,
        totalAdditions,
        totalCompletions
      });
    } catch (error) {
      console.error('Error loading scope data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Scope Growth vs Execution Balance</h3>
        </div>
        <div className="text-sm text-gray-500">Loading scope patterns...</div>
      </div>
    );
  }

  const maxValue = Math.max(scopeData.totalAdditions, scopeData.totalCompletions, 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Scope Growth vs Execution Balance</h3>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-6">
          <div className="text-xs text-gray-500 italic">
            This makes expansion patterns visible without discouraging ideation. No targets or norms are implied.
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeframe === 'today'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('7days')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeframe === '7days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe('14days')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeframe === '14days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              14 Days
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">Additions</span>
                <span className="text-sm font-bold text-blue-700">{scopeData.totalAdditions}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(scopeData.totalAdditions / maxValue) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                <span>{scopeData.tasksCreated} tasks</span>
                <span>{scopeData.tracksCreated} tracks</span>
                <span>{scopeData.ideasCreated} ideas</span>
                <span>{scopeData.sideProjectsCreated} side projects</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">Completions</span>
                <span className="text-sm font-bold text-green-700">{scopeData.totalCompletions}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(scopeData.totalCompletions / maxValue) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-2">
                {scopeData.tasksCompleted} tasks completed
              </div>
            </div>
          </div>

          {scopeData.totalAdditions === 0 && scopeData.totalCompletions === 0 ? (
            <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
              No additions or completions recorded during this period.
            </div>
          ) : (
            <div className="text-sm text-gray-700 p-4 bg-blue-50 rounded-lg">
              {scopeData.totalAdditions > scopeData.totalCompletions ? (
                <span>
                  This period involved more expansion than completion. This is neither good nor bad - it
                  simply describes what happened.
                </span>
              ) : scopeData.totalCompletions > scopeData.totalAdditions ? (
                <span>
                  This period involved more completion than expansion. This is neither good nor bad - it
                  simply describes what happened.
                </span>
              ) : (
                <span>
                  This period showed a balance between expansion and completion. This is neither good nor bad - it
                  simply describes what happened.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
