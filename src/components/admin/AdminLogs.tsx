import { useEffect, useState, useCallback } from 'react';
import {
  UserPlus,
  Play,
  CheckSquare,
  ShieldAlert,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  Zap,
  Clock,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { getPlatformEvents, getAnalytics, PlatformEvent, AnalyticsSummary } from '../../lib/admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ---------------------------------------------------------------------------
// Event type config
// ---------------------------------------------------------------------------
type FilterType = 'all' | 'signup' | 'session' | 'admin';

const EVENT_CONFIG: Record<PlatformEvent['type'], {
  icon: React.ReactNode;
  color: string;
  bg: string;
}> = {
  signup:          { icon: <UserPlus   size={14} />, color: 'text-teal-700',  bg: 'bg-teal-50'  },
  session_started: { icon: <Play       size={14} />, color: 'text-blue-700',  bg: 'bg-blue-50'  },
  session_finished:{ icon: <CheckSquare size={14}/>, color: 'text-green-700', bg: 'bg-green-50' },
  role_change:     { icon: <ShieldAlert size={14}/>, color: 'text-violet-700',bg: 'bg-violet-50'},
  post:            { icon: <Zap        size={14} />, color: 'text-orange-700',bg: 'bg-orange-50'},
  connection:      { icon: <Users      size={14} />, color: 'text-pink-700',  bg: 'bg-pink-50'  },
};

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
function MiniAvatar({ name, src }: { name: string; src: string | null }) {
  if (src) return (
    <img src={src} alt={name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
  );
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-teal-400
      flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-semibold">{name[0]?.toUpperCase()}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all',     label: 'All events'    },
  { id: 'signup',  label: 'Signups'       },
  { id: 'session', label: 'Sessions'      },
  { id: 'admin',   label: 'Admin actions' },
];

export function AdminLogs() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async (f: FilterType) => {
    setLoading(true);
    setError(null);
    try {
      const [evts, { summary }] = await Promise.all([
        getPlatformEvents(f),
        getAnalytics(),
      ]);
      setEvents(evts);
      setStats(summary);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Activity Logs</h1>
            <p className="text-gray-500 text-sm">
              Live platform events — last 7 days · refreshed {timeAgo(lastRefresh.toISOString())}
            </p>
          </div>
          <button
            onClick={() => load(filter)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200
              rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Active now"
              value={stats.activeSessionsNow}
              sub="live sessions"
            />
            <StatCard
              label="Sessions today"
              value={stats.sessionsToday}
              sub={`${stats.sessionsThisWeek} this week`}
            />
            <StatCard
              label="New signups"
              value={stats.newSignupsToday}
              sub={`${stats.newSignupsWeek} this week`}
            />
            <StatCard
              label="Total users"
              value={stats.totalUsers}
              sub={`${stats.adminUsers} admin · ${stats.premiumUsers} premium`}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Event feed */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Loading events…</span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <Clock size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">No events in the last 7 days</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {events.map((evt) => {
                const cfg = EVENT_CONFIG[evt.type] ?? EVENT_CONFIG.signup;
                return (
                  <div key={evt.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <MiniAvatar name={evt.actorName} src={evt.actorAvatar} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {evt.actorName}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.icon}
                          {evt.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 leading-snug">
                        {evt.description}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <span
                      className="text-xs text-gray-400 flex-shrink-0 mt-0.5"
                      title={fullDate(evt.timestamp)}
                    >
                      {timeAgo(evt.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {events.length > 0 && (
          <p className="text-xs text-gray-400 text-center pb-2">
            Showing {events.length} events from the last 7 days
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
