/**
 * NotificationsBell — bell icon for the nav + click-to-open dropdown.
 *
 * Self-contained: holds its own state for the dropdown, fetches its own
 * notifications, subscribes to realtime, marks read on click. Drop into
 * the nav next to the avatar dropdown.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell, Loader2, CheckCheck, MessageCircle, Heart, UserPlus, Sparkles, Calendar,
  FolderPlus, CornerDownRight, HelpCircle, AlertCircle, Check, X,
  Zap, Clock, Users, Settings,
} from 'lucide-react';
import {
  listNotifications, fetchUnreadCount, markRead, markAllRead, dismissNotification,
  subscribeToNotifications,
  type Notification, type NotificationType,
} from '../../core/services/NotificationService';
import { useAuth } from '../../core/auth/AuthProvider';

// ── Icon + colour per notification type ─────────────────────────

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
  // Session lifecycle — previously missing, which made every "Session
  // complete — nice work" row fall through to the generic AlertCircle.
  // Now they each get a recognisable icon + tone.
  partner_joined:              { Icon: Users,       cls: 'text-cyan-600 bg-cyan-50' },
  session_now:                 { Icon: Zap,         cls: 'text-amber-600 bg-amber-50' },
  partner_no_show:             { Icon: Clock,       cls: 'text-slate-500 bg-slate-100' },
  session_completed:           { Icon: CheckCheck,  cls: 'text-emerald-600 bg-emerald-50' },
  // 'You missed it' — slate to read as muted rather than alarming;
  // we don't want to make the user feel attacked for skipping.
  session_missed:              { Icon: Clock,       cls: 'text-slate-600 bg-slate-100' },
  // Streak nudge — warm orange "flame" tone signals momentum/heat.
  streak_at_risk:              { Icon: Zap,         cls: 'text-orange-600 bg-orange-50' },
};

// ── Time grouping ──────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate(); // used by handleClick deep-links
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the dropdown whenever the user navigates to a new route.
  // This is the reliable way to handle Link clicks inside portals —
  // synchronously calling setOpen(false) in an onClick can unmount the
  // portal before React Router finishes the navigation.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Refresh: pull the latest list + count
  const refresh = async () => {
    const [n, c] = await Promise.all([listNotifications(30), fetchUnreadCount()]);
    setItems(n);
    setUnread(c);
  };

  // Initial + realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    refresh();
    const unsub = subscribeToNotifications(() => { refresh(); });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Refetch when the dropdown opens to ensure freshness
  useEffect(() => {
    if (open) {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Calculate portal position whenever dropdown opens
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  async function handleClick(n: Notification) {
    // Mark-as-read = dismiss from view. The row stays in the DB with
    // `read_at` set but disappears from the visible inbox — matches
    // the user's mental model ("I've actioned it, it's done"). Old
    // behaviour kept rows around looking grey, which everyone read as
    // "didn't work."
    if (!n.read_at) {
      setItems((prev) => prev.filter((x) => x.id !== n.id));
      setUnread((c) => Math.max(0, c - 1));
      markRead(n.id).catch(() => refresh());
    }
    if (n.deep_link) {
      // navigate() triggers the location effect which closes the dropdown.
      // Don't call setOpen(false) here — it races with the portal unmount.
      navigate(n.deep_link);
    }
  }

  async function handleMarkAllRead() {
    // Optimistic: clear the visible list + zero the unread count. The
    // rows persist in the DB (read_at populated) for any future archive
    // view.
    setItems([]);
    setUnread(0);
    try {
      const updated = await markAllRead();
      if (updated === 0) {
        console.warn('[Notifications] markAllRead affected 0 rows — re-syncing from server');
        await refresh();
      }
    } catch (e) {
      console.error('[Notifications] markAllRead error, re-syncing', e);
      await refresh();
    }
  }

  /** Per-row dismissal — permanently removes the notification.
   *  Optimistic local remove + rollback on server failure. */
  async function handleDismiss(n: Notification) {
    const wasUnread = !n.read_at;
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
    try {
      await dismissNotification(n.id);
    } catch {
      // Restore on failure
      setItems((prev) => [n, ...prev].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ));
      if (wasUnread) setUnread((c) => c + 1);
    }
  }

  if (!user) return null;
  const buckets = groupByBucket(items);

  /** Mobile breakpoint check — bell navigates to the full-screen
   *  /notifications page on phones (iOS / native messenger convention)
   *  rather than opening a tiny dropdown squeezed under the header.
   *  Desktop keeps the dropdown, which is the right pattern when the
   *  bell sits in a wider top nav. */
  function handleBellClick() {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      navigate('/notifications');
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleBellClick}
        className="relative w-10 h-10 rounded-full hover:bg-surface-container-low active:bg-surface-container flex items-center justify-center transition-colors"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
      >
        <Bell size={20} className="stitch-text-secondary" strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center leading-none ring-2 ring-white tabular-nums">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel — desktop only. On phones the bell navigates
          to the full-screen /notifications page (see handleBellClick).
          Portalled so the nav's overflow:hidden doesn't clip it. */}
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[95] w-[380px] max-h-[70vh] bg-surface rounded-2xl shadow-2xl ring-1 ring-surface-container/60 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            {/* Header — taller + a touch more breathing room on mobile.
                The bell glyph next to the title doubles as a visual
                anchor so the panel reads as a continuation of the icon. */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3.5 border-b border-surface-container/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 grid place-items-center">
                  <Bell size={14} className="text-primary" strokeWidth={2.25} />
                </div>
                <p className="text-base font-extrabold stitch-text-primary">Notifications</p>
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
                  className="text-xs font-bold text-primary hover:underline active:scale-95 transition-transform"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={18} className="animate-spin stitch-text-secondary" />
                </div>
              ) : items.length === 0 ? (
                <EmptyState />
              ) : (
                buckets.map((bucket) => (
                  <div key={bucket.label}>
                    <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
                      {bucket.label}
                    </p>
                    {bucket.items.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onClick={() => handleClick(n)}
                        onDismiss={() => handleDismiss(n)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer — actionable row, not a tiny text link. Easy to
                tap on mobile (44px tall) and visually distinct from the
                notification list above. */}
            <Link
              to="/profile?tab=notifications"
              className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-surface-container/60 hover:bg-surface-container-low active:bg-surface-container transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings size={14} className="stitch-text-secondary" />
                <span className="text-xs font-semibold stitch-text-primary">Notification settings</span>
              </span>
              <span className="text-[10px] stitch-text-secondary">›</span>
            </Link>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── Single notification row ────────────────────────────────────

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

  // role=button on a div instead of a real <button> so the X dismiss can
  // be its own clickable child (HTML disallows nested buttons).
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={`group relative w-full text-left flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
        isUnread ? 'bg-primary/[0.04] hover:bg-primary/[0.07] active:bg-primary/[0.10]' : 'hover:bg-surface-container-low active:bg-surface-container'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
        <Icon size={16} strokeWidth={2.25} />
      </div>
      <div className="flex-1 min-w-0 pr-5">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <p className={`text-sm leading-tight ${isUnread ? 'font-extrabold stitch-text-primary' : 'font-bold stitch-text-primary'}`}>
            {notification.title}
          </p>
          <span className="text-[11px] stitch-text-secondary shrink-0 tabular-nums">
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>
        <p className={`text-xs leading-snug line-clamp-2 ${
          isUnread ? 'stitch-text-primary' : 'stitch-text-secondary'
        }`}>
          {notification.body}
        </p>
      </div>
      {isUnread && (
        <span className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
      )}
      {/* X dismiss — hover-revealed, click bubbles stopped so the row
          onClick doesn't fire alongside. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md grid place-items-center stitch-text-secondary opacity-0 group-hover:opacity-100 hover:bg-surface-container hover:stitch-text-primary transition-opacity"
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-12 h-12 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-3">
        <Check size={20} className="text-primary/60" strokeWidth={2.5} />
      </div>
      <p className="text-sm font-bold stitch-text-primary mb-1">All caught up</p>
      <p className="text-[11px] stitch-text-secondary leading-relaxed max-w-[220px] mx-auto">
        Replies, reactions, session reminders and connection requests will land here.
      </p>
    </div>
  );
}
