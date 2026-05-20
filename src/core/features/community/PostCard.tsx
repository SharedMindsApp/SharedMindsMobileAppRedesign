/**
 * PostCard — single feed item.
 *
 * Renders author header, post-type chip, content, reaction row,
 * expandable reply thread, and (for the author) a delete affordance.
 *
 * Auto-posts (session_finished, project_started, joined) use a quieter
 * "activity" style — smaller avatar, lighter background, no big chip.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, MessageCircle, Send, Loader2, MoreHorizontal, Trash2,
  CheckCircle2, HelpCircle, Hand, Lightbulb, Zap, FolderPlus, UserPlus2, Flag,
} from 'lucide-react';
import { ReportModal } from '../moderation/ReportModal';
import { useAuth } from '../../auth/AuthProvider';
import {
  REACTION_OPTIONS,
  type CommunityPost, type CommunityReply, type ReactionEmoji,
  addReaction, removeReaction,
  fetchReplies, createReply, deletePost,
} from '../../services/CommunityService';

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
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const POST_TYPE_META: Record<string, { label: string; cls: string; Icon: typeof Sparkles }> = {
  working_on:       { label: 'Working on',  cls: 'bg-blue-100 text-blue-700',       Icon: Zap },
  stuck:            { label: 'Stuck',       cls: 'bg-amber-100 text-amber-700',     Icon: HelpCircle },
  win:              { label: 'Win',         cls: 'bg-emerald-100 text-emerald-700', Icon: Hand },
  question:         { label: 'Question',    cls: 'bg-violet-100 text-violet-700',   Icon: Lightbulb },
  session_finished: { label: 'Finished',    cls: 'bg-emerald-50 text-emerald-700',  Icon: CheckCircle2 },
  project_started:  { label: 'New project', cls: 'bg-cyan-50 text-cyan-700',        Icon: FolderPlus },
  joined:           { label: 'New member',  cls: 'bg-rose-50 text-rose-700',        Icon: UserPlus2 },
};

export function PostCard({
  post, onDeleted,
}: {
  post: CommunityPost;
  onDeleted?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const meta = POST_TYPE_META[post.post_type] ?? POST_TYPE_META.working_on;
  const Icon = meta.Icon;
  const isMine = user?.id === post.author_id;

  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<CommunityReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Local mirror of reactions so toggling feels instant
  const [reactions, setReactions] = useState(post.reactions);
  useEffect(() => { setReactions(post.reactions); }, [post.reactions]);

  useEffect(() => {
    if (showReplies && replies.length === 0) {
      setLoadingReplies(true);
      fetchReplies(post.id)
        .then(setReplies)
        .finally(() => setLoadingReplies(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReplies]);

  async function toggleReaction(emoji: ReactionEmoji) {
    if (!user) return;
    const mine = reactions.some((r) => r.user_id === user.id && r.emoji === emoji);
    // Optimistic
    setReactions((prev) =>
      mine
        ? prev.filter((r) => !(r.user_id === user.id && r.emoji === emoji))
        : [...prev, { user_id: user.id, emoji }],
    );
    try {
      if (mine) await removeReaction(post.id, emoji);
      else await addReaction(post.id, emoji);
    } catch {
      // Revert on failure
      setReactions(post.reactions);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const reply = await createReply(post.id, replyText.trim());
      setReplies((prev) => [...prev, reply]);
      setReplyText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this post?')) return;
    try {
      await deletePost(post.id);
      onDeleted?.();
    } catch (e) {
      console.error(e);
    }
  }

  // Group reactions by emoji for the chip display
  const grouped = REACTION_OPTIONS
    .map((emoji) => ({
      emoji,
      count: reactions.filter((r) => r.emoji === emoji).length,
      mine: !!user && reactions.some((r) => r.user_id === user.id && r.emoji === emoji),
    }))
    .filter((g) => g.count > 0);

  // Some reactions for picker (always show the row so users can react)
  const pickerEmojis = REACTION_OPTIONS;

  return (
    <article className={`rounded-2xl p-4 transition-all ${
      post.is_auto
        ? 'bg-surface-container-low/60 ring-1 ring-surface-container/60'
        : 'bg-surface-container-low hover:shadow-sm'
    }`}>
      {/* Header */}
      <header className="flex items-start gap-3 mb-2">
        <button
          type="button"
          onClick={() => navigate(`/profile/${post.author_id}`)}
          className="shrink-0 hover:opacity-80 transition-opacity"
        >
          {post.author.avatar_url ? (
            <img src={post.author.avatar_url} alt={post.author.display_name} className={`${post.is_auto ? 'w-8 h-8' : 'w-10 h-10'} rounded-2xl object-cover`} />
          ) : (
            <div className={`${post.is_auto ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} rounded-2xl bg-gradient-to-br ${gradFor(post.author.display_name)} flex items-center justify-center text-white font-extrabold shadow-sm`}>
              {post.author.display_name.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => navigate(`/profile/${post.author_id}`)}
              className={`font-bold stitch-text-primary truncate hover:text-primary transition-colors ${
                post.is_auto ? 'text-xs' : 'text-sm'
              }`}
            >
              {post.author.display_name}
            </button>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${meta.cls}`}>
              <Icon size={9} strokeWidth={2.5} />
              {meta.label}
            </span>
            <span className="text-[10px] stitch-text-secondary tabular-nums">· {formatTimeAgo(post.created_at)}</span>
          </div>
          {post.author.work_type && !post.is_auto && (
            <p className="text-[10px] font-bold stitch-text-secondary uppercase tracking-wider mt-0.5">
              {post.author.work_type}
            </p>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center stitch-text-secondary"
            aria-label="Post options"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute top-8 right-0 bg-surface rounded-xl shadow-lg ring-1 ring-surface-container/60 py-1 z-10 min-w-[130px]">
              {isMine && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); handleDelete(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
              {!isMine && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold stitch-text-secondary hover:bg-surface-container transition-colors"
                >
                  <Flag size={11} /> Report
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <p className={`stitch-text-primary leading-relaxed whitespace-pre-wrap break-words mb-3 ${
        post.is_auto ? 'text-xs' : 'text-sm'
      }`}>
        {post.content}
      </p>

      {/* Reaction row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {grouped.map((g) => (
          <button
            key={g.emoji}
            type="button"
            onClick={() => toggleReaction(g.emoji as ReactionEmoji)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              g.mine ? 'bg-primary/10 ring-1 ring-primary/30 text-primary' : 'bg-surface-container hover:bg-surface-container-high stitch-text-primary'
            }`}
          >
            <span>{g.emoji}</span>
            <span className="tabular-nums">{g.count}</span>
          </button>
        ))}
        {/* Quick reaction picker — small + button reveals the row */}
        <ReactionPicker onPick={toggleReaction} existing={grouped.map((g) => g.emoji)} options={pickerEmojis} />

        {/* Reply button */}
        <button
          type="button"
          onClick={() => setShowReplies((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold stitch-text-secondary hover:bg-surface-container transition-colors"
        >
          <MessageCircle size={11} />
          {post.reply_count > 0 && <span className="tabular-nums">{post.reply_count}</span>}
          {post.reply_count === 0 && 'Reply'}
        </button>
      </div>

      {/* Replies */}
      {showReplies && (
        <div className="mt-3 pt-3 border-t border-surface-container/60 space-y-2">
          {loadingReplies ? (
            <div className="flex justify-center py-2">
              <Loader2 size={14} className="animate-spin stitch-text-secondary" />
            </div>
          ) : (
            replies.map((r) => <ReplyRow key={r.id} reply={r} />)
          )}

          {/* Reply composer */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) handleSendReply(); }}
              placeholder="Reply…"
              className="flex-1 bg-surface-container-low rounded-full px-3.5 py-1.5 text-xs stitch-text-primary outline-none focus:ring-2 focus:ring-primary/30 placeholder:stitch-text-secondary"
            />
            <button
              type="button"
              onClick={handleSendReply}
              disabled={!replyText.trim() || sendingReply}
              className="w-7 h-7 rounded-full stitch-btn--primary text-white flex items-center justify-center disabled:opacity-50 active:scale-90 transition-all"
              aria-label="Send reply"
            >
              {sendingReply ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            </button>
          </div>
        </div>
      )}

      {/* Report modal */}
      {reportOpen && (
        <ReportModal
          contentType="post"
          contentId={post.id}
          flaggedUserId={post.author_id}
          contentSnapshot={post.content}
          onClose={() => setReportOpen(false)}
        />
      )}
    </article>
  );
}

// ── Reaction picker — small "+ react" button reveals options ────

function ReactionPicker({
  onPick, existing, options,
}: {
  onPick: (e: ReactionEmoji) => void;
  existing: string[];
  options: ReactionEmoji[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-container hover:bg-surface-container-high stitch-text-secondary text-xs"
        aria-label="Add reaction"
      >
        +
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-7 left-0 flex items-center gap-1 bg-surface rounded-full p-1 shadow-md ring-1 ring-surface-container/60 z-20">
            {options.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onPick(e); setOpen(false); }}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-base transition-all hover:scale-110 active:scale-95 ${
                  existing.includes(e) ? 'bg-primary/10' : ''
                }`}
                title={`React with ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Reply row ───────────────────────────────────────────────────

function ReplyRow({ reply }: { reply: CommunityReply }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const isOwn = user?.id === reply.author_id;

  return (
    <div className="group flex items-start gap-2.5">
      <button
        type="button"
        onClick={() => navigate(`/profile/${reply.author_id}`)}
        className="shrink-0 hover:opacity-80 transition-opacity"
      >
        {reply.author.avatar_url ? (
          <img src={reply.author.avatar_url} alt="" className="w-7 h-7 rounded-xl object-cover" />
        ) : (
          <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${gradFor(reply.author.display_name)} flex items-center justify-center text-white text-xs font-extrabold`}>
            {reply.author.display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="bg-surface-container/70 rounded-2xl rounded-tl-sm px-3 py-1.5">
          <p className="text-[11px] font-bold stitch-text-primary mb-0.5">{reply.author.display_name}</p>
          <p className="text-xs stitch-text-primary leading-snug whitespace-pre-wrap break-words">{reply.content}</p>
        </div>
        <p className="text-[10px] stitch-text-secondary mt-0.5 px-2">{formatTimeAgo(reply.created_at)}</p>
      </div>
      {/* Flag — only on others' replies, revealed on hover */}
      {!isOwn && (
        <button
          type="button"
          title="Report reply"
          onClick={() => setReportOpen(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 w-6 h-6 rounded-full bg-surface-container hover:bg-red-50 flex items-center justify-center shrink-0"
        >
          <Flag size={10} className="stitch-text-secondary hover:text-red-500" />
        </button>
      )}
      {reportOpen && (
        <ReportModal
          contentType="post"
          contentId={reply.id}
          flaggedUserId={reply.author_id}
          contentSnapshot={reply.content}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
