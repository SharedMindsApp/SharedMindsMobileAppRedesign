/**
 * AdminSafetyEscalation — per-user safety dashboard.
 *
 * Complements AdminModerationQueue (which is content-flag-centric) by
 * surfacing the same data rolled up per *user*. The queue answers
 * "what bad content needs review"; this answers "which users are causing
 * problems and what should we do about them".
 *
 * Tabs:
 *   • Flagged — users with open flags or warning history, sorted by risk
 *   • Suspended — currently suspended/banned
 *
 * Click a user → opens a side panel with:
 *   • Full warning history
 *   • Open + resolved flags
 *   • Escalation actions: Warning → Final warning → Suspension → Ban
 *   • Lift suspension (when applicable)
 */

import { useEffect, useState } from 'react';
import {
  ShieldAlert, Loader2, Flag, Clock, AlertTriangle, UserX, History, X,
  ChevronRight, ShieldOff, ShieldCheck,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  listFlaggedUsers, getWarningHistory, listFlags,
  issueWarning, liftSuspension,
  type UserSafetySummary, type UserWarning, type ContentFlag, type WarningSeverity,
} from '../../core/services/ModerationService';

const SEVERITY_META: Record<WarningSeverity, { label: string; tone: string; pillTone: string }> = {
  warning:        { label: 'Warning',        tone: 'text-amber-700',  pillTone: 'bg-amber-100 text-amber-800' },
  final_warning:  { label: 'Final warning',  tone: 'text-orange-700', pillTone: 'bg-orange-100 text-orange-800' },
  suspension:     { label: 'Suspension',     tone: 'text-rose-700',   pillTone: 'bg-rose-100 text-rose-800' },
  ban:            { label: 'Banned',         tone: 'text-red-700',    pillTone: 'bg-red-100 text-red-800' },
};

type Tab = 'flagged' | 'suspended';

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminSafetyEscalation() {
  const [tab, setTab] = useState<Tab>('flagged');
  const [users, setUsers] = useState<UserSafetySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserSafetySummary | null>(null);

  async function refresh() {
    setLoading(true);
    const data = await listFlaggedUsers(100);
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const visible = users.filter((u) => {
    if (tab === 'suspended') {
      return u.suspended_until && new Date(u.suspended_until) > new Date();
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        <header>
          <h1 className="text-2xl font-extrabold stitch-text-primary flex items-center gap-2">
            <ShieldAlert size={22} className="text-rose-600" /> Safety escalation
          </h1>
          <p className="text-sm stitch-text-secondary mt-1">
            Repeat-offender view. For per-message content review, see the Moderation Queue.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-container-low rounded-full w-fit">
          <TabBtn active={tab === 'flagged'} onClick={() => setTab('flagged')}>
            Flagged users · {users.length}
          </TabBtn>
          <TabBtn active={tab === 'suspended'} onClick={() => setTab('suspended')}>
            Suspended · {users.filter((u) => u.suspended_until && new Date(u.suspended_until) > new Date()).length}
          </TabBtn>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin stitch-text-secondary" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-sm stitch-text-secondary">
            {tab === 'flagged' ? 'No users with open flags or warnings.' : 'No active suspensions.'}
          </div>
        ) : (
          <div className="rounded-2xl bg-white ring-1 ring-surface-container overflow-hidden">
            {visible.map((u, i) => (
              <UserRow
                key={u.user_id}
                user={u}
                isLast={i === visible.length - 1}
                onSelect={() => setSelected(u)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <UserDetailPanel
          user={selected}
          onClose={() => setSelected(null)}
          onAction={() => { setSelected(null); refresh(); }}
        />
      )}
    </AdminLayout>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
        active ? 'bg-white text-primary shadow-sm' : 'stitch-text-secondary hover:stitch-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function UserRow({
  user, isLast, onSelect,
}: {
  user: UserSafetySummary;
  isLast: boolean;
  onSelect: () => void;
}) {
  const suspended = user.suspended_until && new Date(user.suspended_until) > new Date();
  const risk =
    suspended                ? { label: 'Suspended',    tone: 'text-rose-700 bg-rose-50' } :
    user.open_flag_count > 2 ? { label: 'High risk',    tone: 'text-orange-700 bg-orange-50' } :
    user.open_flag_count > 0 ? { label: 'Needs review', tone: 'text-amber-700 bg-amber-50' } :
                               { label: 'Warned',       tone: 'text-blue-700 bg-blue-50' };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-container-low transition-colors ${!isLast ? 'border-b border-surface-container' : ''}`}
    >
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
          {user.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold stitch-text-primary truncate">{user.display_name}</p>
        <p className="text-[11px] stitch-text-secondary flex items-center gap-2 mt-0.5">
          <span><Flag size={9} className="inline mr-0.5" />{user.open_flag_count} open · {user.total_flag_count} total</span>
          <span>·</span>
          <span><History size={9} className="inline mr-0.5" />{user.warning_history_count} warnings</span>
          {user.latest_flag_at && (
            <>
              <span>·</span>
              <span><Clock size={9} className="inline mr-0.5" />{timeAgo(user.latest_flag_at)}</span>
            </>
          )}
        </p>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${risk.tone}`}>
        {risk.label}
      </span>
      <ChevronRight size={14} className="stitch-text-secondary shrink-0" />
    </button>
  );
}

function UserDetailPanel({
  user, onClose, onAction,
}: {
  user: UserSafetySummary;
  onClose: () => void;
  onAction: () => void;
}) {
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<WarningSeverity | 'lift' | null>(null);
  const [reason, setReason] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [w, f] = await Promise.all([
        getWarningHistory(user.user_id),
        listFlags({ status: 'open' }).then((all) =>
          all.filter((x) => x.flagged_user_id === user.user_id),
        ),
      ]);
      setWarnings(w);
      setFlags(f);
      setLoading(false);
    })();
  }, [user.user_id]);

  async function handleIssue(severity: WarningSeverity) {
    if (!reason.trim() && severity !== 'ban') {
      alert('Please add a reason — it goes into the audit log and the user notification.');
      return;
    }
    if (severity === 'ban' && !confirm(`Permanently ban ${user.display_name}? This is irreversible without DB access.`)) return;

    setActioning(severity);
    try {
      const expiresAt = severity === 'suspension'
        ? new Date(Date.now() + suspendDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      await issueWarning({
        userId: user.user_id,
        severity,
        reason: reason.trim() || `${SEVERITY_META[severity].label} issued by admin`,
        expiresAt,
      });
      onAction();
    } catch (err) {
      console.error('[AdminSafetyEscalation] issue failed:', err);
      alert('Could not issue. Check console.');
      setActioning(null);
    }
  }

  async function handleLift() {
    if (!confirm(`Lift the suspension on ${user.display_name}?`)) return;
    setActioning('lift');
    try {
      await liftSuspension(user.user_id);
      onAction();
    } catch (err) {
      console.error('[AdminSafetyEscalation] lift failed:', err);
      setActioning(null);
    }
  }

  const isSuspended = user.suspended_until && new Date(user.suspended_until) > new Date();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-lg h-full bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-3 border-b border-surface-container">
          <h2 className="text-base font-bold stitch-text-primary truncate">{user.display_name}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Risk summary */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Open flags"  value={user.open_flag_count} />
            <Stat label="Total flags" value={user.total_flag_count} />
            <Stat label="Warnings"    value={user.warning_history_count} />
          </div>

          {isSuspended && (
            <div className="rounded-xl bg-rose-50 ring-1 ring-rose-200 p-3 flex items-start gap-3">
              <ShieldOff size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-800">Suspended until {new Date(user.suspended_until!).toLocaleString()}</p>
                <button
                  type="button"
                  onClick={handleLift}
                  disabled={actioning !== null}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-white ring-1 ring-rose-200 px-2.5 py-1 rounded-full hover:bg-rose-50"
                >
                  {actioning === 'lift' ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                  Lift suspension
                </button>
              </div>
            </div>
          )}

          {/* Open flags */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-2">
              Open flags · {flags.length}
            </h3>
            {loading ? (
              <Loader2 size={14} className="animate-spin stitch-text-secondary" />
            ) : flags.length === 0 ? (
              <p className="text-xs stitch-text-secondary">No open flags.</p>
            ) : (
              <ul className="space-y-2">
                {flags.map((f) => (
                  <li key={f.id} className="rounded-lg bg-surface-container-low p-2.5 text-xs">
                    <p className="font-bold stitch-text-primary capitalize">{f.reason.replace(/_/g, ' ')}</p>
                    {f.notes && <p className="stitch-text-secondary mt-1 leading-snug">{f.notes}</p>}
                    {f.content_snapshot && (
                      <p className="mt-1 stitch-text-secondary italic line-clamp-2">"{f.content_snapshot}"</p>
                    )}
                    <p className="text-[10px] stitch-text-secondary mt-1">{timeAgo(f.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Warning history */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary mb-2">
              Warning history · {warnings.length}
            </h3>
            {warnings.length === 0 ? (
              <p className="text-xs stitch-text-secondary">No warnings issued.</p>
            ) : (
              <ul className="space-y-2">
                {warnings.map((w) => (
                  <li key={w.id} className="rounded-lg bg-surface-container-low p-2.5 text-xs flex items-start gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${SEVERITY_META[w.severity].pillTone} shrink-0 mt-0.5`}>
                      {SEVERITY_META[w.severity].label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="stitch-text-primary leading-snug">{w.reason}</p>
                      <p className="text-[10px] stitch-text-secondary mt-1">
                        {timeAgo(w.created_at)}
                        {w.expires_at && ` · expires ${new Date(w.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Escalation actions */}
          <section className="rounded-xl bg-surface-container-low p-4 space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
              Issue action
            </h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Reason (shown to the user + saved to audit log)…"
              rows={2}
              className="w-full px-3 py-2 bg-white rounded-lg text-xs stitch-text-primary placeholder:stitch-text-secondary outline-none focus:ring-2 focus:ring-primary/20 resize-none ring-1 ring-surface-container"
            />
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">
                Suspend for
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={suspendDays}
                onChange={(e) => setSuspendDays(Math.max(1, Number(e.target.value) || 7))}
                className="w-16 px-2 py-1 text-xs stitch-text-primary bg-white rounded-md ring-1 ring-surface-container outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-[10px] stitch-text-secondary">days (suspension only)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ActionBtn
                onClick={() => handleIssue('warning')}
                busy={actioning === 'warning'}
                icon={<AlertTriangle size={11} />}
                label="Warning"
                tone="bg-amber-100 text-amber-800 hover:bg-amber-200"
              />
              <ActionBtn
                onClick={() => handleIssue('final_warning')}
                busy={actioning === 'final_warning'}
                icon={<AlertTriangle size={11} />}
                label="Final warning"
                tone="bg-orange-100 text-orange-800 hover:bg-orange-200"
              />
              <ActionBtn
                onClick={() => handleIssue('suspension')}
                busy={actioning === 'suspension'}
                icon={<ShieldOff size={11} />}
                label={`Suspend ${suspendDays}d`}
                tone="bg-rose-600 text-white hover:bg-rose-700"
              />
              <ActionBtn
                onClick={() => handleIssue('ban')}
                busy={actioning === 'ban'}
                icon={<UserX size={11} />}
                label="Ban"
                tone="bg-red-700 text-white hover:bg-red-800"
              />
            </div>
            <p className="text-[10px] stitch-text-secondary leading-relaxed">
              Each action increments the user's warning count and writes a notification.
              Suspension blocks login until expiry. Ban is permanent (lift via DB).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface-container-low p-2.5 text-center">
      <p className="text-lg font-extrabold stitch-text-primary tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider stitch-text-secondary">{label}</p>
    </div>
  );
}

function ActionBtn({
  onClick, busy, icon, label, tone,
}: {
  onClick: () => void; busy: boolean; icon: React.ReactNode; label: string; tone: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors active:scale-95 disabled:opacity-60 ${tone}`}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
