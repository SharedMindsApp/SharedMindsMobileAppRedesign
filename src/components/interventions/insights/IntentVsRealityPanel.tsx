import { useState, useEffect } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface AlignmentBlock {
  item_title: string;
  start_time: string;
  duration_minutes: number;
  engagement_count: number;
}

export function IntentVsRealityPanel() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<AlignmentBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAlignmentData();
    }
  }, [user]);

  async function loadAlignmentData() {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data: alignment } = await supabase
      .from('daily_alignments')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!alignment) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('daily_alignment_blocks')
      .select('item_title, start_time, duration_minutes')
      .eq('alignment_id', alignment.id)
      .order('start_time');

    if (data) {
      const blocksWithEngagement = await Promise.all(
        data.map(async (block) => {
          const { count } = await supabase
            .from('focus_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('started_at', `${today}T${block.start_time}`)
            .lte('started_at', `${today}T${addMinutes(block.start_time, block.duration_minutes)}`);

          return {
            ...block,
            engagement_count: count || 0,
          };
        })
      );

      setBlocks(blocksWithEngagement);
    }

    setLoading(false);
  }

  function addMinutes(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Today, at a glance</h3>
        </div>
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Today, at a glance</h3>
        </div>
        <div className="bg-gray-50 rounded-lg p-6 text-center border border-gray-100">
          <p className="text-sm text-gray-600 mb-2">No plan set for today</p>
          <p className="text-xs text-gray-500">
            Insights here compare intended blocks with actual engagement. Try using Daily Alignment to see how this
            works.
          </p>
        </div>
      </div>
    );
  }

  const engaged = blocks.filter((b) => b.engagement_count > 0);
  const stillOpen = blocks.filter((b) => b.engagement_count === 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="font-medium text-gray-900">Today, at a glance</h3>
      </div>

      <div className="mb-6 space-y-2">
        {blocks.map((block, idx) => {
          const isEngaged = block.engagement_count > 0;

          return (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`flex-1 h-10 rounded-lg border-2 flex items-center px-3 ${
                  isEngaged
                    ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-sm font-medium text-gray-900">{block.item_title}</span>
              </div>
              {isEngaged ? (
                <div className="flex items-center gap-1 text-xs text-green-700 font-medium">
                  <ArrowRight className="w-3 h-3" />
                  Engaged
                </div>
              ) : (
                <div className="text-xs text-gray-500">Still open</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <p className="text-sm text-gray-700 leading-relaxed">
          {engaged.length > 0 && stillOpen.length > 0 && (
            <>
              So far, {engaged.length} {engaged.length === 1 ? 'block' : 'blocks'} engaged, {stillOpen.length}{' '}
              {stillOpen.length === 1 ? 'block' : 'blocks'} still open. That's normal—plans shift as the day unfolds.
            </>
          )}
          {engaged.length > 0 && stillOpen.length === 0 && (
            <>
              All planned blocks engaged today. That doesn't mean everything went perfectly—just that attention moved
              where it was expected.
            </>
          )}
          {engaged.length === 0 && stillOpen.length > 0 && (
            <>
              None of the planned blocks engaged yet. That's okay—sometimes the day goes differently than expected.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
