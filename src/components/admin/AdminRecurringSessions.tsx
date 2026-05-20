/**
 * AdminRecurringSessions — schedule recurring group sessions for the
 * founding network. Templates define a weekly cadence; the materialize
 * button bulk-inserts the next N weeks into focus_sessions so they
 * appear in every user's calendar + Upcoming strip on the home page.
 */

import { useEffect, useState } from 'react';
import {
  CalendarRange, Plus, Loader2, Pencil, Trash2, Power, Clock, Globe,
  Sparkles, Check,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import {
  RecurringSessionService, dayLabel, formatTemplateCadence,
  type RecurringTemplate, type SessionMode, type SessionPurpose,
  type UpcomingMaterializedSession,
} from '../../core/services/RecurringSessionService';

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 0, label: 'Sun' },
];

const COMMON_TIMEZONES = [
  'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC',
];

const PURPOSE_LABELS: Record<NonNullable<SessionPurpose>, string> = {
  weekly_review: 'Weekly review',
  community: 'Community',
  workshop: 'Workshop',
};

export function AdminRecurringSessions() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [materializing, setMaterializing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<RecurringTemplate | 'new' | null>(null);
  const [upcomingByTemplate, setUpcomingByTemplate] = useState<Record<string, UpcomingMaterializedSession[]>>({});

  async function load(opts?: { autoMaterialize?: boolean }) {
    setLoading(true);
    try {
      // Auto-materialize on mount so the admin's templates always have rows in
      // focus_sessions waiting to be displayed on /sessions. Idempotent via the
      // unique index on (recurring_template_id, scheduled_at).
      if (opts?.autoMaterialize) {
        try {
          const count = await RecurringSessionService.materialize(4);
          if (count > 0) {
            console.log(`[AdminRecurringSessions] auto-materialized ${count} new session row(s)`);
          }
        } catch (matErr) {
          console.warn('[AdminRecurringSessions] auto-materialize on load failed:', matErr);
        }
      }

      const list = await RecurringSessionService.list();
      setTemplates(list);
      const previews: Record<string, UpcomingMaterializedSession[]> = {};
      await Promise.all(
        list.map(async (t) => {
          try { previews[t.id] = await RecurringSessionService.upcomingForTemplate(t.id, 4); }
          catch (err) {
            console.error(`[AdminRecurringSessions] upcomingForTemplate(${t.id}) failed:`, err);
            previews[t.id] = [];
          }
        }),
      );
      console.log('[AdminRecurringSessions] templates loaded:', list.length, '· upcoming rows by template:', previews);
      setUpcomingByTemplate(previews);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load({ autoMaterialize: true }); }, []);

  async function handleToggle(t: RecurringTemplate) {
    await RecurringSessionService.update(t.id, { enabled: !t.enabled });
    load();
  }

  async function handleDelete(t: RecurringTemplate) {
    if (!confirm(`Delete "${t.title}"? Future materialized sessions will lose their template link but stay scheduled.`)) return;
    await RecurringSessionService.remove(t.id);
    load();
  }

  async function handleMaterialize() {
    setMaterializing(true);
    try {
      const count = await RecurringSessionService.materialize(4);
      setToast(`Scheduled ${count} new session${count === 1 ? '' : 's'} for the next 4 weeks.`);
      await load();
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast(`Failed: ${e?.message ?? 'unknown error'}`);
    } finally {
      setMaterializing(false);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <CalendarRange className="text-blue-600" size={24} />
              Recurring Sessions
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Schedule the rhythms that anchor the community — weekly reset blocks, recurring coworking, workshops.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMaterialize}
              disabled={materializing || templates.filter(t => t.enabled).length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-bold hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50"
              title="Inserts the next 4 weeks of every enabled template into the calendar"
            >
              {materializing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Materialize 4 weeks
            </button>
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold active:scale-[0.98] transition-all"
            >
              <Plus size={14} strokeWidth={3} /> New template
            </button>
          </div>
        </div>

        {toast && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
            <Check size={14} strokeWidth={3} className="text-emerald-600" />
            {toast}
          </div>
        )}

        {/* Templates */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" size={20} /></div>
        ) : templates.length === 0 ? (
          <EmptyState onCreate={() => setEditing('new')} />
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                upcoming={upcomingByTemplate[t.id] ?? []}
                onToggle={() => handleToggle(t)}
                onEdit={() => setEditing(t)}
                onDelete={() => handleDelete(t)}
              />
            ))}
          </div>
        )}

        {/* Editor modal */}
        {editing && (
          <TemplateEditorModal
            template={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// ── Empty state ─────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <CalendarRange size={24} className="text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">No recurring sessions yet</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
        Create a template like "Sunday Reset · Sun 18:00 · 50min · group" and SharedMinds will schedule it every week.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold active:scale-[0.98] transition-all"
      >
        <Plus size={14} strokeWidth={3} /> Create first template
      </button>
    </div>
  );
}

// ── Template card ───────────────────────────────────────────────

function TemplateCard({
  template, upcoming, onToggle, onEdit, onDelete,
}: {
  template: RecurringTemplate;
  upcoming: UpcomingMaterializedSession[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-2xl bg-white border p-5 transition-all ${
      template.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
    }`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-gray-900 truncate">{template.title}</h3>
            {template.session_purpose && (
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                {PURPOSE_LABELS[template.session_purpose]}
              </span>
            )}
            {!template.enabled && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                Disabled
              </span>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-gray-500 leading-snug mb-2">{template.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600">
            <span className="inline-flex items-center gap-1"><Clock size={11} /> {dayLabel(template.day_of_week)} {template.time_local}</span>
            <span className="inline-flex items-center gap-1"><Globe size={11} /> {template.timezone}</span>
            <span className="font-semibold">{template.duration_minutes}m</span>
            <span className="uppercase tracking-wider font-bold">{template.session_mode.replace('_', '-')}</span>
            {template.quiet_mode && <span className="uppercase tracking-wider font-bold text-slate-500">Quiet</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              template.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={template.enabled ? 'Disable' : 'Enable'}
          >
            <Power size={15} />
          </button>
          <button type="button" onClick={onEdit} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="Edit">
            <Pencil size={14} />
          </button>
          <button type="button" onClick={onDelete} className="w-9 h-9 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Upcoming materialized sessions */}
      {upcoming.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
            Next {upcoming.length} on the calendar
          </p>
          <div className="flex flex-wrap gap-1.5">
            {upcoming.map((u) => (
              <span key={u.id} className="text-[11px] font-semibold px-2 py-1 rounded-md bg-gray-50 text-gray-700 tabular-nums">
                {new Date(u.scheduled_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}
                {new Date(u.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Editor modal ────────────────────────────────────────────────

function TemplateEditorModal({
  template, onClose, onSaved,
}: {
  template: RecurringTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = template === null;
  const [title, setTitle] = useState(template?.title ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [dayOfWeek, setDayOfWeek] = useState<number>(template?.day_of_week ?? 0);
  const [timeLocal, setTimeLocal] = useState(template?.time_local ?? '18:00');
  const [timezone, setTimezone] = useState(template?.timezone ?? 'Europe/London');
  const [duration, setDuration] = useState<25 | 50 | 90>(template?.duration_minutes ?? 50);
  const [sessionMode, setSessionMode] = useState<SessionMode>(template?.session_mode ?? 'group');
  const [purpose, setPurpose] = useState<SessionPurpose | null>(template?.session_purpose ?? 'weekly_review');
  const [quietMode, setQuietMode] = useState<boolean>(template?.quiet_mode ?? false);
  const [enabled, setEnabled] = useState(template?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) { setError('Title required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        await RecurringSessionService.create({
          title: title.trim(),
          description: description.trim() || null,
          day_of_week: dayOfWeek,
          time_local: timeLocal,
          timezone,
          duration_minutes: duration,
          session_mode: sessionMode,
          session_purpose: purpose,
          quiet_mode: quietMode,
          enabled,
        });
      } else {
        await RecurringSessionService.update(template!.id, {
          title: title.trim(),
          description: description.trim() || null,
          day_of_week: dayOfWeek,
          time_local: timeLocal,
          timezone,
          duration_minutes: duration,
          session_mode: sessionMode,
          session_purpose: purpose,
          quiet_mode: quietMode,
          enabled,
        });
      }
      // Auto-materialize the next 4 weeks so the admin sees their session
      // appear on the calendar immediately. Idempotent — safe to repeat.
      // Non-fatal if it fails; we still consider the save successful.
      try {
        if (enabled) await RecurringSessionService.materialize(4);
      } catch (matErr) {
        console.warn('[AdminRecurringSessions] auto-materialize failed:', matErr);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">
            {isNew ? 'New recurring session' : 'Edit recurring session'}
          </h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Field label="Title" required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sunday Reset" className="input" />
          </Field>
          <Field label="Description (optional)">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Group weekly intention-setting and reflection." className="input resize-y" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Day of week">
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDayOfWeek(d.value)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors ${
                      dayOfWeek === d.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Time (24h)">
              <input
                type="time"
                value={timeLocal}
                onChange={(e) => setTimeLocal(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <Field label="Timezone">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input">
              {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Duration">
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as 25 | 50 | 90)} className="input">
                <option value={25}>25 min</option>
                <option value={50}>50 min</option>
                <option value={90}>90 min</option>
              </select>
            </Field>
            <Field label="Mode">
              <select value={sessionMode} onChange={(e) => setSessionMode(e.target.value as SessionMode)} className="input">
                <option value="group">Group</option>
                <option value="one_on_one">1-on-1</option>
              </select>
            </Field>
            <Field label="Purpose">
              <select
                value={purpose ?? ''}
                onChange={(e) => setPurpose((e.target.value || null) as SessionPurpose | null)}
                className="input"
              >
                <option value="">None</option>
                <option value="weekly_review">Weekly review</option>
                <option value="community">Community</option>
                <option value="workshop">Workshop</option>
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={quietMode} onChange={(e) => setQuietMode(e.target.checked)} className="w-4 h-4" />
            <span>Quiet mode (mute mics by default)</span>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4" />
            <span>Enabled (auto-include in materialize runs)</span>
          </label>

          {error && (
            <p className="text-xs text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
          color: #111827;
        }
        .input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">
        {label}{required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

// Local helper: X icon (kept here so the modal stays self-contained)
function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
