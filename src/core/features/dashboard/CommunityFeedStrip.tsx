/**
 * CommunityFeedStrip — home page teaser of the latest community posts.
 *
 * Shows 3 most recent posts as a compact preview. Tap any (or the
 * "See all" link) to open the full /community feed.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MessageSquare, Loader2 } from 'lucide-react';
import { fetchFeed, type CommunityPost } from '../../services/CommunityService';

const AVATAR_GRAD = [
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
];
function gradFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRAD[Math.abs(hash) % AVATAR_GRAD.length];
}

function formatTimeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const TYPE_LABELS: Record<string, string> = {
  working_on: 'Working on',
  stuck: 'Stuck',
  win: 'Win',
  question: 'Question',
  session_finished: 'Finished',
  project_started: 'New project',
  joined: 'New member',
};

const TYPE_COLOURS: Record<string, string> = {
  working_on: 'text-blue-700',
  stuck: 'text-amber-700',
  win: 'text-emerald-700',
  question: 'text-violet-700',
  session_finished: 'text-emerald-700',
  project_started: 'text-cyan-700',
  joined: 'text-rose-700',
};

export function CommunityFeedStrip() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchFeed({ limit: 3 })
      .then(setPosts)
      .finally(() => setLoaded(true));
  }, []);

  // Hide entirely while loading or if empty — no sad placeholder.
  if (!loaded) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={12} className="stitch-text-secondary" />
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
            Community
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/community')}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          See all <ArrowRight size={11} />
        </button>
      </div>

      {posts.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate('/community')}
          className="w-full text-left rounded-2xl border-2 border-dashed border-surface-container-high hover:border-primary/30 hover:bg-primary/[0.02] transition-all p-4 flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-primary/8 group-hover:bg-primary/12 flex items-center justify-center shrink-0 transition-colors">
            <MessageSquare size={17} className="text-primary/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold stitch-text-primary leading-tight">Start the conversation</p>
            <p className="text-xs stitch-text-secondary mt-0.5">
              Share what you're working on, stuck on, or shipping.
            </p>
          </div>
          <ArrowRight size={14} className="text-primary shrink-0" />
        </button>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate('/community')}
              className="w-full text-left flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors active:scale-[0.99]"
            >
              {p.author.avatar_url ? (
                <img src={p.author.avatar_url} alt="" className="w-9 h-9 rounded-2xl object-cover shrink-0" />
              ) : (
                <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${gradFor(p.author.display_name)} flex items-center justify-center text-white font-extrabold text-xs shrink-0`}>
                  {p.author.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                  <span className="text-xs font-bold stitch-text-primary truncate">{p.author.display_name}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${TYPE_COLOURS[p.post_type] ?? 'stitch-text-secondary'}`}>
                    {TYPE_LABELS[p.post_type] ?? p.post_type}
                  </span>
                  <span className="text-[10px] stitch-text-secondary tabular-nums">· {formatTimeAgo(p.created_at)}</span>
                </div>
                <p className="text-xs stitch-text-secondary leading-snug line-clamp-2">
                  {p.content}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// Suppress unused-import warning
export type { CommunityPost as _CP };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ = Loader2;
