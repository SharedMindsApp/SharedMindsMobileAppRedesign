/**
 * CommunityFeedPage — /community
 *
 * Inline composer at the top, filter chips, then the post list. Auto-events
 * mix in naturally so the feed has texture even with few users.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, MessageSquare, HelpCircle, Hand, Lightbulb, Send, ChevronDown, Activity } from 'lucide-react';
import {
  fetchFeed, createPost, subscribeToFeed,
  type CommunityPost, type CommunityPostType,
} from '../../services/CommunityService';
import { PageGreeting, SurfaceCard } from '../../ui/CorePage';
import { PostCard } from './PostCard';

type FilterId = 'all' | 'asks' | 'wins' | 'activity';

const FILTERS: { id: FilterId; label: string; types: CommunityPostType[] | null }[] = [
  { id: 'all',      label: 'All',      types: null },
  { id: 'asks',     label: 'Asks',     types: ['stuck', 'question'] },
  { id: 'wins',     label: 'Wins',     types: ['win'] },
  { id: 'activity', label: 'Activity', types: ['session_finished', 'project_started', 'joined'] },
];

type ComposeType = 'working_on' | 'stuck' | 'win' | 'question';

const COMPOSE_OPTIONS: { id: ComposeType; label: string; placeholder: string; Icon: typeof Sparkles; cls: string }[] = [
  { id: 'working_on', label: 'Working on',    placeholder: "What are you working on today?",                  Icon: Sparkles,    cls: 'text-blue-700 bg-blue-50' },
  { id: 'stuck',      label: 'Stuck',         placeholder: "What's blocking you? Be specific so others can help.", Icon: HelpCircle, cls: 'text-amber-700 bg-amber-50' },
  { id: 'win',        label: 'Win',           placeholder: "Just finished or shipped something? Share it.",   Icon: Hand,        cls: 'text-emerald-700 bg-emerald-50' },
  { id: 'question',   label: 'Question',      placeholder: "Ask anything — the community is small but kind.", Icon: Lightbulb,   cls: 'text-violet-700 bg-violet-50' },
];

export function CommunityFeedPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>('all');

  async function refresh() {
    const filterDef = FILTERS.find((f) => f.id === filter);
    const types = filterDef?.types ?? undefined;
    const fresh = await fetchFeed({ limit: 80, types });
    setPosts(fresh);
  }

  // Initial + on filter change
  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Realtime
  useEffect(() => {
    const unsub = subscribeToFeed(() => { refresh(); });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filteredPosts = useMemo(() => posts, [posts]);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <PageGreeting
        greeting="Community"
        subtitle="What everyone's working on, stuck on, and shipping."
      />

      {/* Composer */}
      <Composer onPosted={refresh} />

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              filter === f.id
                ? 'stitch-btn--primary text-white shadow-sm'
                : 'bg-surface-container-low stitch-text-secondary hover:bg-surface-container'
            }`}
          >
            {f.id === 'activity' && <Activity size={11} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin stitch-text-secondary" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <SurfaceCard>
          <div className="text-center py-12 px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-primary/60" />
            </div>
            <p className="text-base font-bold stitch-text-primary mb-1.5">Quiet here</p>
            <p className="text-sm stitch-text-secondary leading-relaxed max-w-[300px] mx-auto">
              {filter === 'all'
                ? "Be the first to post. Share what you're working on, ask for help, or celebrate a win."
                : "Nothing in this filter yet. Try a different one or post first."}
            </p>
          </div>
        </SurfaceCard>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((p) => (
            <PostCard key={p.id} post={p} onDeleted={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composer ────────────────────────────────────────────────────

function Composer({ onPosted }: { onPosted: () => void }) {
  const [type, setType] = useState<ComposeType>('working_on');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = COMPOSE_OPTIONS.find((o) => o.id === type)!;
  const Icon = meta.Icon;

  async function handlePost() {
    if (!content.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      await createPost({ postType: type, content: content.trim() });
      setContent('');
      setExpanded(false);
      onPosted();
    } catch (e: any) {
      setError(e?.message ?? 'Could not post.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-surface-container-low p-3 sm:p-4 ring-1 ring-surface-container/40">
      {/* Type picker */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto -mx-1 px-1 pb-1">
        {COMPOSE_OPTIONS.map((opt) => {
          const Active = opt.Icon;
          const isSel = type === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                isSel ? opt.cls + ' ring-1 ring-current/30' : 'bg-white stitch-text-secondary hover:bg-surface-container'
              }`}
            >
              <Active size={10} strokeWidth={2.5} />
              {opt.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setExpanded(true)}
        placeholder={meta.placeholder}
        rows={expanded ? 4 : 2}
        maxLength={2000}
        className="w-full bg-white rounded-xl px-3.5 py-2.5 text-sm stitch-text-primary outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:stitch-text-secondary transition-all"
      />

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">{error}</p>
      )}

      {(expanded || content.trim()) && (
        <div className="flex items-center justify-between mt-2.5 gap-2">
          <p className="text-[10px] stitch-text-secondary">
            {content.length}/2000 · Posts are visible to all members
          </p>
          <button
            type="button"
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full stitch-btn--primary text-white text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
          >
            {posting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Post
          </button>
        </div>
      )}
    </div>
  );
}
