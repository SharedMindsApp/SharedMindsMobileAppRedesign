/**
 * NotificationsPage — /notifications
 *
 * Full-screen notifications list. On mobile this is what the bell icon
 * opens (instead of a cramped dropdown). On desktop the route also
 * exists but most users will reach notifications via the header dropdown
 * — the full page is useful when there are many to scroll through.
 *
 * Mirrors the bell dropdown's logic 1:1 (same fetch / mark-read / dismiss
 * paths via NotificationService) but in a roomier layout: back-button
 * header, full-bleed rows on mobile, sticky day-bucket headers,
 * pull-to-refresh-feeling "Refresh" button when stale.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Loader2, CheckCheck, MessageCircle, Heart, UserPlus, Sparkles, Calendar,
  FolderPlus, CornerDownRight, HelpCircle, AlertCircle, Check, X,
  Zap, Clock, Users, Settings, ChevronLeft,
} from 'lucide-react';
import {
  listNotifications, fetchUnreadCount, markRead, markAllRead, dismissNotification,
  subscribeToNotifications,
  type Notification, type NotificationType,
} from '../../services/NotificationService';
import { useAuth } from '../../auth/AuthProvider';

// ── Icon + colour per notification type ─────────────────────────
// Kept in sync with the same map in NotificationsBell.tsx. Any new
// NotificationType added to NotificationService needs an entry here
// AND there, or it falls through to the generic AlertCircle.

const TYPE_META: Record<NotificationType, { Icon: typeof Bell; cls: string }> = {
  session_reminder_24h:        { Icon: Calendar,    cls: 'text-cyan-600 bg-cyan-50' },
  session_reminder_15min:      { Icon: Calendar,    cls: 'text-amber-600 bg-amber-50' },
  session_reminder_5min:       { Icon: Zap,         cls: 'text-amber-600 bg-amber-50' },
  weekly_review_prompt:        { Icon: Sparkles,    cls: 'text-violet-600 bg-violet-50' },
  onboarding_day_1:            { Icon: Sparkles,    cls: 'text-primary bg-primary/10' },
  onboarding_day_3:            { Icon: Sparkles,    cls: 'text-primary bg-primary/10' },
  onboarding_day_7:            { Icon: Sparkles,    cls: 'text-primary bg-primary/10' },
  community_session_reminder:  { Icon: Calendar,    cls: 'text-cyan-600 bg-cyan-50' },
  new_dm:                      { Icon: MessageCircle, cls: 'text-primary bg-primary/10' },
  post_reply:                  { Icon: CornerDownRight, cls: 'text-blue-600 bg-blue-50' },
  post_reaction:               { Icon: Heart,       cls: 'text-rose-600 bg-rose-50' },
  connection_request:          { Icon: UserPlus,    cls: 'text-emerald-600 bg-emerald-50' },
  connection_accepted:         { Icon: UserPlus,    cls: 'text-emerald-600 bg-emerald-50' },
  project_invite:              { Icon: FolderPlus,  cls: 'text-cyan-600 bg-cyan-50' },
  stuck_help_offered:          { Icon: HelpCircle,  cls: 'text-amber-600 bg-amber-50' },
  partner_joined:              { Icon: Users,       cls: 'text-cyan-600 bg-cyan-50' },
  session_now:                 { Icon: Zap,         cls: 'text-amber-600 bg-amber-50' },
  partner_no_show:             { Icon: Clock,       cls: 'text-slate-500 bg-slate-100' },
  session_completed:           { Icon: CheckCheck,  cls: 'text-emerald-600 bg-emerald-50' },
  session_missed:              { Icon: Clock,       cls: 'text-slate-600 bg-slate-100' },
  streak_at_risk:              { Icon: Zap,         cls: 'text-orange-600 bg-orange-50' },
};

function groupByBucket(notifications: Notification[]): Array<{ label: string; items: Notification[] }> {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);

  for (const n of notifications) {
    const created = new Date(n.created_at);
    if (created >= todayStart) today.push(n);
    else if (created >= yesterdayStart) yesterday.push(n);
    else earlier.push(n);
  }

  const buckets: Array<{ label: string; items: Notification[] }> = [];
  if (today.length) buckets.push({ label: 'Today', items: today });
  if (yesterday.length) buckets.push({ label: 'Yesterday', items: yesterday });
  if (earlier.length) buckets.push({ label: 'Earlier', items: earlier });
  return buckets;
}

function formatTimeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── Page ────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [n, c] = await Promise.all([listNotifications(50), fetchUnreadCount()]);
    setItems(n);
    setUnread(c);
  };

  useEffect(() => {
    if (!user?.id) return;
    refresh().finally(() => setLoading(false));
    const unsub = subscribeToNotifications(() => { refresh(); });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleClick(n: Notification) {
    // Mark-as-read = dismiss from view. See NotificationsBell for the
    // rationale — users read the previous "grey it out, keep it
    // around" behaviour as a bug.
    if (!n.read_at) {
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      setUnread((c) => Math.max(0, c - 1));
      markRead(n.id).catch(() => refresh());
    }
    if (n.deep_link) navigate(n.deep_link);
  }

  async function handleMarkAllRead() {
    setItems([]);
    setUnread(0);
    try {
      const updated = await markAllRead();
      if (updated === 0) {
        console.warn('[NotificationsPage] markAllRead affected 0 rows — re-syncing');
        await refresh();
      }
    } catch (e) {
      console.error('[NotificationsPage] markAllRead error, re-syncing', e);
      await refresh();
    }
  }

  async function handleDismiss(n: Notification) {
    const wasUnread = !n.read_at;
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    try {
      await dismissNotification(n.id);
    } catch {
      // Restore on failure — sort newest-first to match server order.
      setItems((prev) => [n, ...prev].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ));
      if (wasUnread) setUnread((c) => c + 1);
    }
  }

  const buckets = groupByBucket(items);

  return (
    <div className="min-h-screen-safe bg-surface">
      {/* Sticky header — back button + title + mark-all-read action.
          Matches the messenger-style mobile header we use elsewhere.
          On desktop the page is still reachable directly but most users
          arrive via the bell dropdown there. */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-surface-container/60">
        <div className="flex items-center gap-2 px-2 sm:px-4 py-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full hover:bg-surface-container-low active:bg-surface-container grid place-items-center stitch-text-primary"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <h1 className="text-lg font-extrabold stitch-text-primary leading-tight">Notifications</h1>
            {unread > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-primary hover:underline active:scale-95 px-2 py-1 transition-transform"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto pb-24">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin stitch-text-secondary" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          buckets.map((bucket) => (
            <section key={bucket.label}>
              <p className="px-4 pt-4 pb-2 text-[10px] font-bold stitch-text-secondary tracking-widest uppercase sticky top-[57px] bg-surface/95 backdrop-blur-sm z-10">
                {bucket.label}
              </p>
              <div className="divide-y divide-surface-container/60">
                {bucket.items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onClick={() => handleClick(n)}
                    onDismiss={() => handleDismiss(n)}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {/* Settings link at the bottom of the list — actionable row,
            matches the dropdown footer pattern but at page scale. */}
        {!loading && items.length > 0 && (
          <Link
            to="/profile?tab=notifications"
            className="mt-6 mx-4 flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-surface-container-low hover:bg-surface-container active:scale-[0.99] transition-all"
          >
            <span className="flex items-center gap-2.5">
              <Settings size={15} className="stitch-text-secondary" />
              <span className="text-sm font-semibold stitch-text-primary">Notification settings</span>
            </span>
            <span className="text-sm stitch-text-secondary">›</span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────

function NotificationRow({
  notification, onClick, onDismiss,
}: {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
}) {
  const meta = TYPE_META[notification.type] ?? { Icon: AlertCircle, cls: 'text-slate-500 bg-slate-100' };
  const Icon = meta.Icon;
  const isUnread = !notification.read_at;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={`group relative w-full text-left flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors ${
        isUnread ? 'bg-primary/[0.04] hover:bg-primary/[0.07] active:bg-primary/[0.10]' : 'hover:bg-surface-container-low active:bg-surface-container'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
        <Icon size={17} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0 pr-7">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <p className={`text-sm leading-tight ${isUnread ? 'font-extrabold stitch-text-primary' : 'font-bold stitch-text-primary'}`}>
            {notification.title}
          </p>
          <span className="text-[11px] stitch-text-secondary shrink-0 tabular-nums">
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>
        <p className={`text-xs leading-snug ${
          isUnread ? 'stitch-text-primary' : 'stitch-text-secondary'
        }`}>
          {notification.body}
        </p>
      </div>
      {isUnread && (
        <span className="w-2 h-2 mt-2.5 rounded-full bg-primary shrink-0" />
      )}
      {/* X dismiss — always visible on touch devices (no hover), small
          on desktop to stay subtle. stopPropagation so the row click
          doesn't fire alongside. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full grid place-items-center stitch-text-secondary opacity-60 hover:opacity-100 hover:bg-surface-container hover:stitch-text-primary active:scale-90 transition-all"
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4">
        <Check size={26} className="text-primary/60" strokeWidth={2.5} />
      </div>
      <p className="text-base font-bold stitch-text-primary mb-1.5">All caught up</p>
      <p className="text-sm stitch-text-secondary leading-relaxed max-w-[280px] mx-auto">
        Replies, reactions, session reminders and connection requests will land here.
      </p>
    </div>
  );
}
