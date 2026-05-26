/**
 * AdminModerationQueue — content moderation review page.
 *
 * Tabs: Open flags / Resolved / Audit log
 * For each open flag: content snapshot, reporter, flagged user, reason,
 * and three action buttons: Remove content / Warn user / Dismiss.
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, XCircle, ShieldCheck, Loader2,
  Flag, MessageSquare, User, Clock, Bot, ChevronDown, ChevronUp,
  Trash2, Bell, X, ScrollText,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  listFlags, listModerationActions, adminRemoveContent, warnUser, resolveFlag,
  getFlagEvidence,
  FLAG_REASON_LABELS, CONTENT_TYPE_LABELS,
  type ContentFlag, type ModerationAction, type FlagStatus, type FlagEvidence,
} from '../../core/services/ModerationService';

type QueueTab = 'open' | 'resolved' | 'dismissed' | 'log';

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const REASON_COLORS: Record<string, string> = {
  harassment:     'bg-rose-100 text-rose-700',
  hate_speech:    'bg-red-100 text-red-700',
  spam:           'bg-amber-100 text-amber-700',
  inappropriate:  'bg-orange-100 text-orange-700',
  safety_concern: 'bg-purple-100 text-purple-700',
  other:          'bg-gray-100 text-gray-600',
};

const ACTION_META: Record<string, { label: string; color: string }> = {
  content_removed: { label: 'Content removed', color: 'text-red-600 bg-red-50' },
  user_warned:     { label: 'User warned',     color: 'text-amber-600 bg-amber-50' },
  user_suspended:  { label: 'User suspended',  color: 'text-purple-600 bg-purple-50' },
  flag_dismissed:  { label: 'Dismissed',       color: 'text-gray-500 bg-gray-50' },
  auto_flagged:    { label: 'Auto-flagged',     color: 'text-blue-600 bg-blue-50' },
};

// ── FlagCard ──────────────────────────────────────────────────────────────────

function FlagCard({
  flag, onActionTaken,
}: {
  flag: ContentFlag;
  onActionTaken: () => void;
}) {
  const [expanded, setExpanded]   = useState(false);
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Evidence is lazy-loaded the first time the flag is expanded. Signed
  // URLs for screenshots only live 5 min, so we re-fetch on each expand.
  const [evidence, setEvidence] = useState<FlagEvidence[] | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    if (!expanded || evidenceLoading || evidence !== null) return;
    setEvidenceLoading(true);
    getFlagEvidence(flag.id)
      .then(setEvidence)
      .finally(() => setEvidenceLoading(false));
  }, [expanded, flag.id, evidenceLoading, evidence]);

  async function handleRemove() {
    if (!confirm(`Remove this ${flag.content_type} content? It will be hidden from all users but preserved in the database.`)) return;
    setActioning(true);
    setActionError(null);
    try {
      const idMap: Record<string, string | null> = {
        chat:    flag.flagged_chat_id,
        dm:      flag.flagged_dm_id,
        post:    flag.flagged_post_id,
        reply:   flag.flagged_reply_id,
        session: flag.flagged_session_id,
      };
      const contentId = idMap[flag.content_type];
      if (!contentId) throw new Error('Content ID not found');

      await adminRemoveContent({
        contentType:  flag.content_type,
        contentId,
        flagId:       flag.id,
        targetUserId: flag.flagged_user_id,
      });
      onActionTaken();
    } catch (e: any) {
      setActionError(e?.message ?? 'Action failed');
    } finally {
      setActioning(false);
    }
  }

  async function handleWarn() {
    setActioning(true);
    setActionError(null);
    try {
      await warnUser({
        flagId:       flag.id,
        targetUserId: flag.flagged_user_id,
        reason:       FLAG_REASON_LABELS[flag.reason as keyof typeof FLAG_REASON_LABELS] ?? flag.reason,
      });
      onActionTaken();
    } catch (e: any) {
      setActionError(e?.message ?? 'Action failed');
    } finally {
      setActioning(false);
    }
  }

  async function handleDismiss() {
    setActioning(true);
    setActionError(null);
    try {
      await resolveFlag({
        flagId:        flag.id,
        action:        'flag_dismissed',
        targetUserId:  flag.flagged_user_id,
        notes:         'Dismissed by admin — no violation found.',
      });
      onActionTaken();
    } catch (e: any) {
      setActionError(e?.message ?? 'Action failed');
    } finally {
      setActioning(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        {/* Content type icon */}
        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
          {flag.auto_flagged
            ? <Bot size={16} className="text-blue-600" />
            : <Flag size={16} className="text-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-gray-900">
              {CONTENT_TYPE_LABELS[flag.content_type]}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${REASON_COLORS[flag.reason] ?? 'bg-gray-100 text-gray-600'}`}>
              {FLAG_REASON_LABELS[flag.reason as keyof typeof FLAG_REASON_LABELS] ?? flag.reason}
            </span>
            {flag.auto_flagged && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Auto · {flag.auto_flag_score != null ? `${(flag.auto_flag_score * 100).toFixed(0)}%` : 'AI'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><User size={10} /> Reporter: <strong className="text-gray-700">{flag.reporter_name}</strong></span>
            <span className="flex items-center gap-1"><AlertTriangle size={10} /> Flagged: <strong className="text-gray-700">{flag.flagged_user_name}</strong></span>
            <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(flag.created_at)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 shrink-0"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Content snapshot — always show a truncated preview */}
      {flag.content_snapshot && (
        <div className="px-4 pb-3">
          <p className={`text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border-l-4 border-red-300 leading-relaxed italic ${expanded ? '' : 'line-clamp-2'}`}>
            "{flag.content_snapshot}"
          </p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && flag.notes && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Reporter notes</p>
          <p className="text-sm text-gray-700">{flag.notes}</p>
        </div>
      )}

      {/* Evidence panel — only loads when the flag is expanded */}
      {expanded && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
            Evidence {evidence && evidence.length > 0 && `· ${evidence.length}`}
          </p>
          {evidenceLoading ? (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Loading…
            </p>
          ) : !evidence || evidence.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              No evidence attached (report not fired from inside a live session).
            </p>
          ) : (
            <div className="space-y-3">
              {evidence.map((ev) => (
                <EvidenceItem key={ev.id} evidence={ev} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action error */}
      {actionError && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>
        </div>
      )}

      {/* Actions (open flags only) */}
      {flag.status === 'open' && (
        <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-2 bg-gray-50/50">
          {actioning ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 size={14} className="animate-spin" />
              Acting…
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Trash2 size={11} /> Remove content
              </button>
              <button
                type="button"
                onClick={handleWarn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <Bell size={11} /> Warn user
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 transition-colors ml-auto"
              >
                <X size={11} /> Dismiss
              </button>
            </>
          )}
        </div>
      )}

      {/* Resolved status */}
      {flag.status !== 'open' && (
        <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50 flex items-center gap-2">
          {flag.status === 'resolved'
            ? <CheckCircle2 size={13} className="text-emerald-500" />
            : <XCircle size={13} className="text-gray-400" />}
          <span className="text-xs text-gray-500 font-medium capitalize">{flag.status}</span>
          {flag.resolved_at && (
            <span className="text-xs text-gray-400 ml-auto">{timeAgo(flag.resolved_at)}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Audit log row ─────────────────────────────────────────────────────────────

function AuditRow({ action }: { action: ModerationAction }) {
  const meta = ACTION_META[action.action] ?? { label: action.action, color: 'text-gray-500 bg-gray-50' };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <ShieldCheck size={13} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">{action.admin_name}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.label}
          </span>
        </div>
        {action.notes && (
          <p className="text-xs text-gray-500 mt-0.5">{action.notes}</p>
        )}
      </div>
      <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(action.created_at)}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminModerationQueue() {
  const [tab, setTab]       = useState<QueueTab>('open');
  const [flags, setFlags]   = useState<ContentFlag[]>([]);
  const [auditLog, setAuditLog] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    if (tab === 'log') {
      const actions = await listModerationActions(100);
      setAuditLog(actions);
    } else {
      const statusMap: Record<QueueTab, FlagStatus> = {
        open: 'open', resolved: 'resolved', dismissed: 'dismissed', log: 'open',
      };
      const data = await listFlags(statusMap[tab]);
      setFlags(data);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCount = flags.filter((f) => f.status === 'open').length;

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck size={22} className="text-violet-600" />
              Moderation Queue
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review flagged content and manage community safety.
            </p>
          </div>
          {tab === 'open' && openCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm font-bold">
              {openCount} open
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {([
            { id: 'open'      as const, label: 'Open',     icon: Flag },
            { id: 'resolved'  as const, label: 'Resolved', icon: CheckCircle2 },
            { id: 'dismissed' as const, label: 'Dismissed', icon: XCircle },
            { id: 'log'       as const, label: 'Audit log', icon: ScrollText },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === id
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : tab === 'log' ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-2">
            {auditLog.length === 0 ? (
              <div className="py-12 text-center">
                <ScrollText size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">No moderation actions yet</p>
              </div>
            ) : (
              auditLog.map((action) => <AuditRow key={action.id} action={action} />)
            )}
          </div>
        ) : flags.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <ShieldCheck size={28} className="text-emerald-500" />
            </div>
            <p className="text-base font-bold text-gray-800 mb-1">
              {tab === 'open' ? 'No open reports' : `No ${tab} reports`}
            </p>
            <p className="text-sm text-gray-500">
              {tab === 'open' ? 'Community is looking good.' : `Nothing here yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {flags.map((flag) => (
              <FlagCard key={flag.id} flag={flag} onActionTaken={load} />
            ))}
          </div>
        )}

        {/* Safeguarding note */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <MessageSquare size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Safeguarding retention policy</p>
            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
              All messages and posts are retained indefinitely regardless of user deletion.
              Removed content is soft-deleted (hidden from users but preserved in the database).
              This audit log is immutable — no entries can be modified or deleted.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Evidence display ───────────────────────────────────────────────────────

function EvidenceItem({ evidence }: { evidence: FlagEvidence }) {
  const capturedAt = new Date(evidence.captured_at).toLocaleString();
  const deletesAt  = new Date(evidence.auto_delete_at).toLocaleDateString();

  if (evidence.evidence_type === 'screenshot') {
    return (
      <div className="rounded-xl bg-white ring-1 ring-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-700">
            📸 Screenshot
          </p>
          <p className="text-[10px] text-gray-400">
            Captured {capturedAt} · Auto-deletes {deletesAt}
          </p>
        </div>
        {evidence.signed_url ? (
          <a href={evidence.signed_url} target="_blank" rel="noreferrer" className="block">
            <img
              src={evidence.signed_url}
              alt="Captured frame from reported participant"
              className="w-full max-h-72 object-contain rounded-lg bg-black/5"
            />
            <p className="text-[10px] text-blue-600 mt-1.5 font-semibold">
              Open full size →
            </p>
          </a>
        ) : (
          <p className="text-xs text-gray-400 italic">Image unavailable (storage object may have been purged).</p>
        )}
      </div>
    );
  }

  // chat_transcript
  const messages = evidence.transcript ?? [];
  return (
    <div className="rounded-xl bg-white ring-1 ring-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-gray-700">
          💬 Chat transcript · {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </p>
        <p className="text-[10px] text-gray-400">
          Captured {capturedAt} · Auto-deletes {deletesAt}
        </p>
      </div>
      {messages.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No messages in the captured window.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 text-xs">
          {messages.map((m, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-400 font-mono shrink-0">
                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-gray-400 font-mono shrink-0 truncate max-w-[100px]" title={m.user_id}>
                {m.user_id.slice(0, 8)}
              </span>
              <span className="text-gray-700 break-words">{m.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
