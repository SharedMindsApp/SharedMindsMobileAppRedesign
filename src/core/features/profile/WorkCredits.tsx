/**
 * WorkCredits — the IMDB-style body of work on a profile.
 *
 *   <WorkCreditsSection userId={...} />  — read-only display (hidden when empty)
 *   <WorkCreditsEditor />                — own-profile add/edit/delete + tagging
 *
 * Credits can tag collaborators (existing members); a tag is pending until the
 * member confirms, at which point the credit shows as verified.
 */

import { useEffect, useState } from 'react';
import { Briefcase, Plus, Trash2, Pencil, ExternalLink, Loader2, Check, X, BadgeCheck, UserPlus } from 'lucide-react';
import { findSkillCategory } from '../../../lib/skills';
import { SkillsEditor } from '../../ui/SkillsEditor';
import { useAuth } from '../../auth/AuthProvider';
import { fetchConnections, type ConnectionWithProfile } from '../../services/ConnectionService';
import {
  fetchWorkCredits, createWorkCredit, updateWorkCredit, deleteWorkCredit,
  fetchCreditCollaborators, addCreditCollaborator, removeCreditCollaborator,
  fetchPendingCreditTags, respondToCreditTag,
  type WorkCredit, type WorkCreditInput, type CreditCollaborator, type PendingCreditTag,
} from '../../services/WorkCreditService';

function MiniAvatar({ name, url, size = 18 }: { name: string | null; url: string | null; size?: number }) {
  const s = { width: size, height: size };
  return url
    ? <img src={url} alt={name ?? ''} className="rounded-full object-cover ring-1 ring-surface" style={s} />
    : <span className="rounded-full bg-gradient-to-br from-violet-400 to-blue-500 text-white grid place-items-center font-bold ring-1 ring-surface" style={{ ...s, fontSize: size * 0.5 }}>{(name ?? '?').charAt(0).toUpperCase()}</span>;
}

// ── Display ─────────────────────────────────────────────────────────────────

function CreditRow({ credit, collaborators = [] }: { credit: WorkCredit; collaborators?: CreditCollaborator[] }) {
  const confirmed = collaborators.filter((c) => c.status === 'confirmed');
  return (
    <div className="flex gap-3 py-3 border-b border-surface-container last:border-0">
      {credit.thumbnail_url ? (
        <img src={credit.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 ring-1 ring-surface-container" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-surface-container-low grid place-items-center shrink-0">
          <Briefcase size={16} className="stitch-text-secondary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <p className="text-sm font-bold stitch-text-primary leading-tight">{credit.title}</p>
          {credit.year_label && <span className="text-[11px] stitch-text-secondary tabular-nums">· {credit.year_label}</span>}
        </div>
        {credit.role && <p className="text-xs font-semibold text-primary leading-snug mt-0.5">{credit.role}</p>}
        {credit.description && <p className="text-xs stitch-text-secondary leading-snug mt-0.5">{credit.description}</p>}
        {credit.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {credit.skills.map((s) => {
              const cat = findSkillCategory(s);
              return (
                <span key={s} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-surface-container-low stitch-text-secondary text-[10px] font-semibold">
                  {cat && <span className="text-[9px] leading-none">{cat.emoji}</span>}{s}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {credit.url && (
            <a href={credit.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
              <ExternalLink size={10} /> View work
            </a>
          )}
          {confirmed.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <BadgeCheck size={12} />
              <span className="flex -space-x-1.5">
                {confirmed.slice(0, 4).map((c) => <MiniAvatar key={c.id} name={c.display_name} url={c.avatar_url} />)}
              </span>
              Verified with {confirmed.length === 1 ? (confirmed[0].display_name ?? 'a member') : `${confirmed.length} people`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function WorkCreditsSection({ userId }: { userId: string }) {
  const [credits, setCredits] = useState<WorkCredit[]>([]);
  const [collabs, setCollabs] = useState<Record<string, CreditCollaborator[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchWorkCredits(userId).then(async (c) => {
      if (!alive) return;
      setCredits(c);
      if (c.length > 0) {
        const m = await fetchCreditCollaborators(c.map((x) => x.id));
        if (alive) setCollabs(m);
      }
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  if (loading || credits.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Briefcase size={13} className="stitch-text-secondary" />
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Work</p>
      </div>
      <div>
        {credits.map((c) => <CreditRow key={c.id} credit={c} collaborators={collabs[c.id]} />)}
      </div>
    </section>
  );
}

// ── Editor (own profile, in settings) ────────────────────────────────────────

const EMPTY: WorkCreditInput = { title: '', role: '', description: '', year_label: '', url: '', thumbnail_url: '', skills: [] };

export function WorkCreditsEditor() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<WorkCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<WorkCreditInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingCreditTag[]>([]);
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [taggingCredit, setTaggingCredit] = useState<string | null>(null);

  async function load() {
    if (!user) { setLoading(false); return; }
    const [c, p, conns] = await Promise.all([
      fetchWorkCredits(user.id),
      fetchPendingCreditTags(),
      fetchConnections().catch(() => [] as ConnectionWithProfile[]),
    ]);
    setCredits(c);
    setPending(p);
    setConnections(conns);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(tagId: string, status: 'confirmed' | 'declined') {
    setPending((cur) => cur.filter((t) => t.id !== tagId));
    try { await respondToCreditTag(tagId, status); } catch { /* ignore */ }
  }

  function startNew() { setDraft(EMPTY); setEditing('new'); }
  function startEdit(c: WorkCredit) {
    setDraft({ title: c.title, role: c.role ?? '', description: c.description ?? '', year_label: c.year_label ?? '', url: c.url ?? '', thumbnail_url: c.thumbnail_url ?? '', skills: c.skills });
    setEditing(c.id);
  }
  function cancel() { setEditing(null); setDraft(EMPTY); }

  async function save() {
    if (!draft.title.trim() || saving) return;
    setSaving(true);
    try {
      if (editing === 'new') await createWorkCredit(draft);
      else if (editing) await updateWorkCredit(editing, draft);
      await load();
      cancel();
    } catch (e) {
      console.warn('[WorkCreditsEditor] save failed:', e);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try { await deleteWorkCredit(id); setCredits((cur) => cur.filter((c) => c.id !== id)); }
    catch (e) { console.warn('[WorkCreditsEditor] delete failed:', e); }
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 size={18} className="animate-spin stitch-text-secondary" /></div>;

  const field = 'w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-sm font-medium placeholder:stitch-text-secondary border-0 outline-none focus:ring-2 focus:ring-primary/30 transition-all';

  return (
    <div className="space-y-3">
      {/* Credits you've been tagged on — confirm or decline */}
      {pending.length > 0 && (
        <div className="rounded-xl ring-1 ring-violet-200 bg-violet-50/60 p-3 space-y-2">
          <p className="text-[10px] font-extrabold tracking-widest uppercase text-violet-700">Confirm your credits</p>
          {pending.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <MiniAvatar name={t.owner_name} url={t.owner_avatar} size={24} />
              <p className="flex-1 min-w-0 text-xs stitch-text-primary leading-snug">
                <span className="font-bold">{t.owner_name ?? 'Someone'}</span> credited you{t.credit_role ? ` as ${t.credit_role}` : ''} on <span className="font-bold">{t.credit_title}</span>
              </p>
              <button type="button" onClick={() => void respond(t.id, 'confirmed')} className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full"><Check size={11} strokeWidth={3} /> Confirm</button>
              <button type="button" onClick={() => void respond(t.id, 'declined')} aria-label="Decline" className="w-7 h-7 grid place-items-center rounded-full stitch-text-secondary hover:bg-surface-container"><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Existing credits */}
      {credits.map((c) => (
        editing === c.id ? (
          <CreditForm key={c.id} draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} saving={saving} fieldClass={field} />
        ) : (
          <div key={c.id} className="rounded-xl bg-surface-container-low">
            <div className="flex items-start gap-2 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold stitch-text-primary leading-tight truncate">{c.title}{c.year_label ? ` · ${c.year_label}` : ''}</p>
                {c.role && <p className="text-xs text-primary font-semibold truncate">{c.role}</p>}
              </div>
              <button type="button" onClick={() => setTaggingCredit(taggingCredit === c.id ? null : c.id)} aria-label="Tag collaborators" className={`w-7 h-7 grid place-items-center rounded-lg transition-colors ${taggingCredit === c.id ? 'bg-primary/10 text-primary' : 'stitch-text-secondary hover:bg-surface-container'}`}><UserPlus size={13} /></button>
              <button type="button" onClick={() => startEdit(c)} aria-label="Edit" className="w-7 h-7 grid place-items-center rounded-lg stitch-text-secondary hover:bg-surface-container"><Pencil size={13} /></button>
              <button type="button" onClick={() => void remove(c.id)} aria-label="Delete" className="w-7 h-7 grid place-items-center rounded-lg stitch-text-secondary hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
            </div>
            {taggingCredit === c.id && user && (
              <div className="px-3 pb-3">
                <CreditCollaboratorsManager creditId={c.id} ownerId={user.id} connections={connections} />
              </div>
            )}
          </div>
        )
      ))}

      {/* New credit form / add button */}
      {editing === 'new' ? (
        <CreditForm draft={draft} setDraft={setDraft} onSave={save} onCancel={cancel} saving={saving} fieldClass={field} />
      ) : (
        <button type="button" onClick={startNew}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl ring-1 ring-dashed ring-surface-container-high stitch-text-secondary hover:stitch-text-primary hover:bg-surface-container-low text-sm font-bold transition-all">
          <Plus size={14} /> Add work
        </button>
      )}
    </div>
  );
}

function CreditForm({
  draft, setDraft, onSave, onCancel, saving, fieldClass,
}: {
  draft: WorkCreditInput;
  setDraft: (d: WorkCreditInput) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  fieldClass: string;
}) {
  const set = (patch: Partial<WorkCreditInput>) => setDraft({ ...draft, ...patch });
  return (
    <div className="rounded-xl ring-1 ring-surface-container p-3 space-y-2.5 bg-surface">
      <input className={fieldClass} placeholder="Title — e.g. Brand film for Nike" value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} />
      <div className="grid grid-cols-2 gap-2">
        <input className={fieldClass} placeholder="Your role — e.g. Director" value={draft.role ?? ''} onChange={(e) => set({ role: e.target.value })} maxLength={80} />
        <input className={fieldClass} placeholder="Year — e.g. 2024" value={draft.year_label ?? ''} onChange={(e) => set({ year_label: e.target.value })} maxLength={20} />
      </div>
      <input className={fieldClass} placeholder="One line — what you did" value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })} maxLength={160} />
      <input className={fieldClass} placeholder="Link to the work (optional)" value={draft.url ?? ''} onChange={(e) => set({ url: e.target.value })} />
      <input className={fieldClass} placeholder="Thumbnail image URL (optional)" value={draft.thumbnail_url ?? ''} onChange={(e) => set({ thumbnail_url: e.target.value })} />
      <div>
        <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5">Skills used</p>
        <SkillsEditor value={draft.skills} onChange={(skills) => set({ skills })} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onSave} disabled={!draft.title.trim() || saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl stitch-btn--primary text-white text-sm font-bold disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={3} />} Save
        </button>
        <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container-low stitch-text-secondary text-sm font-bold">
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}

// ── Collaborator manager (per credit, owner only) ───────────────────────────
function CreditCollaboratorsManager({
  creditId, ownerId, connections,
}: {
  creditId: string;
  ownerId: string;
  connections: ConnectionWithProfile[];
}) {
  const [collabs, setCollabs] = useState<CreditCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const m = await fetchCreditCollaborators([creditId]);
    setCollabs(m[creditId] ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [creditId]); // eslint-disable-line react-hooks/exhaustive-deps

  const taggedIds = new Set(collabs.map((c) => c.collaborator_user_id));
  const addable = connections.filter((c) => !taggedIds.has(c.other_user_id));

  async function add(userId: string) {
    if (busy) return;
    setBusy(true);
    try { await addCreditCollaborator(creditId, ownerId, userId); await load(); }
    catch (e) { console.warn('[CreditCollaboratorsManager] add failed:', e); }
    finally { setBusy(false); }
  }
  async function drop(id: string) {
    setCollabs((cur) => cur.filter((c) => c.id !== id));
    try { await removeCreditCollaborator(id); } catch { void load(); }
  }

  if (loading) return <div className="py-2 flex justify-center"><Loader2 size={14} className="animate-spin stitch-text-secondary" /></div>;

  return (
    <div className="rounded-lg bg-surface p-2.5 space-y-2 ring-1 ring-surface-container">
      <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">Worked on this with</p>

      {collabs.length > 0 && (
        <div className="space-y-1">
          {collabs.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <MiniAvatar name={c.display_name} url={c.avatar_url} size={20} />
              <span className="flex-1 min-w-0 text-xs font-semibold stitch-text-primary truncate">{c.display_name ?? 'Member'}</span>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${c.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : c.status === 'declined' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
              <button type="button" onClick={() => void drop(c.id)} aria-label="Remove" className="w-6 h-6 grid place-items-center rounded-md stitch-text-secondary hover:bg-surface-container"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      {addable.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {addable.map((c) => (
            <button key={c.other_user_id} type="button" disabled={busy} onClick={() => void add(c.other_user_id)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-container-low stitch-text-primary text-[11px] font-semibold hover:bg-surface-container disabled:opacity-50">
              <MiniAvatar name={c.display_name} url={c.avatar_url} size={16} /> {c.display_name}
            </button>
          ))}
        </div>
      ) : collabs.length === 0 ? (
        <p className="text-[11px] stitch-text-secondary italic">Connect with the people you worked with, then tag them here to verify the credit.</p>
      ) : null}
    </div>
  );
}
