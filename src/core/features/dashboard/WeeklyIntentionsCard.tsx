/**
 * WeeklyIntentionsCard — surface this week's 3 intentions on the home page.
 *
 * Lets the user tick mid-week without leaving home. Tapping the title or an
 * empty state jumps to /reflection for the full ritual.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, ArrowRight, Sparkles, Plus } from 'lucide-react';
import {
  ReflectionService, mondayOf,
  type ReflectionWithIntentions, type WeeklyIntention,
} from '../../services/ReflectionService';
import { useCoreData } from '../../data/CoreDataContext';

const PROJECT_HEX: Record<string, string> = {
  cyan: '#22d3ee', blue: '#3b82f6', violet: '#8b5cf6',
  emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e',
};
function projectDot(token: string | null) {
  return PROJECT_HEX[token ?? ''] ?? PROJECT_HEX.blue;
}

export function WeeklyIntentionsCard() {
  const navigate = useNavigate();
  const { state: { projects } } = useCoreData();
  const [data, setData] = useState<ReflectionWithIntentions | null>(null);
  const [loaded, setLoaded] = useState(false);

  async function reload() {
    const d = await ReflectionService.getReflectionByWeek(mondayOf());
    setData(d);
    setLoaded(true);
  }

  useEffect(() => { reload().catch(() => setLoaded(true)); }, []);

  async function handleToggle(intent: WeeklyIntention) {
    // Optimistic
    setData((prev) => prev && {
      ...prev,
      intentions: prev.intentions.map((it) =>
        it.id === intent.id ? { ...it, completed_at: it.completed_at ? null : new Date().toISOString() } : it,
      ),
    });
    try {
      await ReflectionService.toggleIntentionComplete(intent);
    } catch {
      reload(); // revert
    }
  }

  if (!loaded) return null;

  const intentions = data?.intentions ?? [];
  const doneCount = intentions.filter((i) => i.completed_at).length;

  // Empty state — push toward /reflection
  if (intentions.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate('/reflection')}
        className="w-full text-left rounded-2xl bg-gradient-to-br from-violet-50 via-blue-50/40 to-cyan-50/40 ring-1 ring-violet-200/40 hover:from-violet-100/80 transition-all p-4 active:scale-[0.99] group"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-violet-600" />
            <p className="text-[10px] font-bold text-violet-700 tracking-widest uppercase">This week's intentions</p>
          </div>
          <ArrowRight size={13} className="text-violet-600" />
        </div>
        <p className="text-sm font-bold stitch-text-primary leading-snug mb-1">
          Pick up to 3 things you want to finish this week.
        </p>
        <p className="text-xs stitch-text-secondary leading-relaxed">
          The cap is the point. Set them once, tick them off as you go.
        </p>
        <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-violet-700 bg-white px-2.5 py-1.5 rounded-full">
          <Plus size={11} strokeWidth={3} /> Set intentions
        </span>
      </button>
    );
  }

  return (
    <section className="rounded-2xl bg-surface-container-low/60 ring-1 ring-violet-200/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-violet-600" />
          <p className="text-[10px] font-bold text-violet-700 tracking-widest uppercase">
            This week · {doneCount}/{intentions.length} done
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/reflection')}
          className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity inline-flex items-center gap-1"
        >
          Edit <ArrowRight size={11} />
        </button>
      </div>

      <div className="space-y-1.5">
        {intentions.map((it, i) => {
          const project = it.project_id ? projects.find((p) => p.id === it.project_id) : null;
          const done = !!it.completed_at;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => handleToggle(it)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all active:scale-[0.99] ${
                done ? 'bg-emerald-50' : 'bg-white hover:bg-surface-container-low'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                done ? 'bg-emerald-500 text-white' : 'bg-surface-container-low ring-1 ring-surface-container-high'
              }`}>
                {done ? <Check size={10} strokeWidth={3} /> : <Circle size={8} className="stitch-text-secondary" />}
              </span>
              <span className="text-[10px] font-bold stitch-text-secondary tabular-nums">#{i + 1}</span>
              <span className={`flex-1 text-sm font-semibold leading-tight ${
                done ? 'line-through stitch-text-secondary' : 'stitch-text-primary'
              }`}>
                {it.title}
              </span>
              {project && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  title={project.name}
                  style={{ backgroundColor: projectDot(project.color) }}
                />
              )}
            </button>
          );
        })}
      </div>

      {intentions.length < 3 && (
        <button
          type="button"
          onClick={() => navigate('/reflection')}
          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold stitch-text-secondary hover:bg-surface-container-low transition-colors"
        >
          <Plus size={11} /> Add intention {intentions.length + 1} of 3
        </button>
      )}
    </section>
  );
}
