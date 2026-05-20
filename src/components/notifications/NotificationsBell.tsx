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
  FolderPlus, CornerDownRight, HelpCircle, AlertCircle, Check,
} from 'lucide-react';
import {
  listNotifications, fetchUnreadCount, markRead, markAllRead,
  subscribeToNotifications,
  type Notification, type NotificationType,
} from '../../core/services/NotificationService';
import { useAuth } from '../../core/auth/AuthProvider';

// ── Icon + colour per notification type ─────────────────────────

const TYPE_META: Record<NotificationType, { Icon: typeof Bell; cls: string }> = {
  session_reminder_24h:        { Icon: Calendar,    cls: 'text-cyan-600 bg-cyan-50' },
  session_reminder_15min:      { Icon: Calendar,    cls: 'text-amber-600 bg-amber-50' },
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
    if (!n.read_at) {
      // Optimistic
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
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
    setItems((prev) => prev.map((x) => x.read_at ? x : { ...x, read_at: new Date().toISOString() }));
    setUnread(0);
    markAllRead().catch(() => refresh());
  }

  if (!user) return null;
  const buckets = groupByBucket(items);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-colors"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
      >
        <Bell size={18} className="stitch-text-secondary" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel — portalled to body so the nav's overflow:hidden doesn't clip it */}
      {open && createPortal(
        <>
          {/* Backdrop to catch outside clicks */}
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[95] w-[360px] max-h-[70vh] bg-surface rounded-2xl shadow-2xl ring-1 ring-surface-container/60 flex flex-col overflow-hidden"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-surface-container/60">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-primary" />
                <p className="text-sm font-extrabold stitch-text-primary">Notifications</p>
                {unread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-bold text-primary hover:underline"
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
                      />
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-3 py-2 border-t border-surface-container/60 flex items-center justify-between">
              <Link
                to="/profile?tab=notifications"
                className="text-[11px] font-semibold stitch-text-secondary hover:stitch-text-primary"
              >
                Notification settings
              </Link>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── Single notification row ────────────────────────────────────

function NotificationRow({
  notification, onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const meta = TYPE_META[notification.type] ?? { Icon: AlertCircle, cls: 'text-slate-500 bg-slate-100' };
  const Icon = meta.Icon;
  const isUnread = !notification.read_at;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-2.5 transition-colors ${
        isUnread ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : 'hover:bg-surface-container-low'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
        <Icon size={14} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <p className={`text-xs ${isUnread ? 'font-extrabold stitch-text-primary' : 'font-bold stitch-text-primary'}`}>
            {notification.title}
          </p>
          <span className="text-[10px] stitch-text-secondary shrink-0 tabular-nums">
            {formatTimeAgo(notification.created_at)}
          </span>
        </div>
        <p className={`text-[11px] leading-snug line-clamp-2 ${
          isUnread ? 'stitch-text-primary' : 'stitch-text-secondary'
        }`}>
          {notification.body}
        </p>
      </div>
      {isUnread && (
        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-primary shrink-0" />
      )}
    </button>
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
