import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Check } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

type TimeWindow = '7days' | '14days' | '30days';

export function ExpansionVsExecutionPanel() {
  const { user } = useAuth();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('14days');
  const [itemsAdded, setItemsAdded] = useState(0);
  const [itemsCompleted, setItemsCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadBalance();
    }
  }, [user, timeWindow]);

  async function loadBalance() {
    if (!user) return;

    const now = new Date();
    const startDate = new Date();

    if (timeWindow === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeWindow === '14days') {
      startDate.setDate(now.getDate() - 14);
    } else {
      startDate.setDate(now.getDate() - 30);
    }

    const { data: projects } = await supabase
      .from('master_projects')
      .select('id')
      .eq('user_id', user.id);

    if (!projects || projects.length === 0) {
      setItemsAdded(0);
      setItemsCompleted(0);
      setLoading(false);
      return;
    }

    const projectIds = projects.map((p) => p.id);

    const { count: addedCount } = await supabase
      .from('roadmap_items')
      .select('*', { count: 'exact', head: true })
      .in('master_project_id', projectIds)
      .gte('created_at', startDate.toISOString());

    const { count: completedCount } = await supabase
      .from('roadmap_items')
      .select('*', { count: 'exact', head: true })
      .in('master_project_id', projectIds)
      .eq('status', 'completed')
      .gte('updated_at', startDate.toISOString());

    setItemsAdded(addedCount || 0);
    setItemsCompleted(completedCount || 0);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Building vs expanding</h3>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (itemsAdded === 0 && itemsCompleted === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Building vs expanding</h3>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-100">
          <p className="text-sm text-gray-600 mb-2">No roadmap activity yet</p>
          <p className="text-xs text-gray-500">
            This panel shows the balance between adding new items and completing existing ones. Try using Guardrails to
            see how this works.
          </p>
        </div>
      </div>
    );
  }

  const total = itemsAdded + itemsCompleted;
  const addedPercent = total > 0 ? (itemsAdded / total) * 100 : 0;
  const completedPercent = total > 0 ? (itemsCompleted / total) * 100 : 0;

  const leaningToward =
    itemsAdded > itemsCompleted * 1.5
      ? 'adding'
      : itemsCompleted > itemsAdded * 1.5
      ? 'completing'
      : 'balanced';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h3 className="font-medium text-gray-900">Building vs expanding</h3>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimeWindow('7days')}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              timeWindow === '7days'
                ? 'bg-indigo-100 text-indigo-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setTimeWindow('14days')}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              timeWindow === '14days'
                ? 'bg-indigo-100 text-indigo-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            14 days
          </button>
          <button
            onClick={() => setTimeWindow('30days')}
            className={`px-3 py-1 text-xs rounded-lg transition-all ${
              timeWindow === '30days'
                ? 'bg-indigo-100 text-indigo-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            30 days
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Things added</span>
            </div>
            <span className="text-sm font-bold text-blue-600">{itemsAdded}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${addedPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">Things completed</span>
            </div>
            <span className="text-sm font-bold text-green-600">{itemsCompleted}</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
              style={{ width: `${completedPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
        <p className="text-sm text-gray-700 leading-relaxed">
          {leaningToward === 'adding' && (
            <>
              This period leaned more toward adding than finishing. That can reflect ideation, planning, or shifting
              priorities. It's not inherently good or bad.
            </>
          )}
          {leaningToward === 'completing' && (
            <>
              This period leaned more toward completing than adding. That can reflect execution focus, finishing cycles,
              or tightening scope. It's not inherently good or bad.
            </>
          )}
          {leaningToward === 'balanced' && (
            <>
              This period showed a mix of adding and completing. That can reflect active development, iterative work, or
              balanced progress. It's not inherently good or bad.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
