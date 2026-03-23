import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface DailyAlignmentBlock {
  id: string;
  start_time: string;
  end_time: string;
  intended_work_label: string;
  actual_engagement: boolean;
}

interface DailyAlignmentMicrotask {
  id: string;
  label: string;
  is_completed: boolean;
}

interface DailyAlignmentData {
  id: string;
  date: string;
  blocks: DailyAlignmentBlock[];
  microtasks: DailyAlignmentMicrotask[];
}

export function DailyAlignmentReflectionCard() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alignmentData, setAlignmentData] = useState<DailyAlignmentData | null>(null);

  useEffect(() => {
    if (user) {
      loadTodayAlignment();
    }
  }, [user]);

  async function loadTodayAlignment() {
    if (!user) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: alignment, error: alignmentError } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (alignmentError) throw alignmentError;

      if (!alignment) {
        setAlignmentData(null);
        return;
      }

      const { data: blocks, error: blocksError } = await supabase
        .from('daily_alignment_blocks')
        .select('*')
        .eq('alignment_id', alignment.id)
        .order('start_time', { ascending: true });

      if (blocksError) throw blocksError;

      let microtasks: any[] = [];
      if (blocks && blocks.length > 0) {
        const blockIds = blocks.map(b => b.id);
        const { data: microtasksData, error: microtasksError } = await supabase
          .from('daily_alignment_microtasks')
          .select('*')
          .in('block_id', blockIds)
          .order('created_at', { ascending: true });

        if (microtasksError) throw microtasksError;
        microtasks = microtasksData || [];
      }

      setAlignmentData({
        id: alignment.id,
        date: alignment.date,
        blocks: blocks || [],
        microtasks: microtasks
      });
    } catch (error) {
      console.error('Error loading daily alignment:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Alignment Reflection</h3>
        </div>
        <div className="text-sm text-gray-500">Loading today's reflection...</div>
      </div>
    );
  }

  if (!alignmentData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Alignment Reflection</h3>
        </div>
        <div className="text-sm text-gray-600">
          No alignment data for today yet. Visit Daily Alignment to set your intentions.
        </div>
      </div>
    );
  }

  const engagedBlocks = alignmentData.blocks.filter(b => b.actual_engagement).length;
  const totalBlocks = alignmentData.blocks.length;
  const completedTasks = alignmentData.microtasks.filter(m => m.is_completed).length;
  const totalTasks = alignmentData.microtasks.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Daily Alignment Reflection</h3>
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
            This is information only. Nothing here requires action.
          </div>

          {totalBlocks > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Planned Blocks</h4>
              <div className="space-y-2">
                {alignmentData.blocks.map(block => (
                  <div
                    key={block.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                        block.actual_engagement ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {block.intended_work_label}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {new Date(`2000-01-01T${block.start_time}`).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit'
                        })} - {new Date(`2000-01-01T${block.end_time}`).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      {block.actual_engagement ? 'Engaged' : 'Not reached today'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-600 mt-3">
                {engagedBlocks} of {totalBlocks} blocks engaged with today
              </div>
            </div>
          )}

          {totalTasks > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Microtasks</h4>
              <div className="space-y-2">
                {alignmentData.microtasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div
                      className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                        task.is_completed ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900">{task.label}</div>
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      {task.is_completed ? 'Completed' : 'Still open'}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-gray-600 mt-3">
                {completedTasks} of {totalTasks} microtasks completed today
              </div>
            </div>
          )}

          {totalBlocks === 0 && totalTasks === 0 && (
            <div className="text-sm text-gray-600">
              No blocks or tasks were planned for today.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
