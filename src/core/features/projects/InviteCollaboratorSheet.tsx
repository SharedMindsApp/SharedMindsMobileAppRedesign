/**
 * InviteCollaboratorSheet — two-tab invite flow.
 *
 * Tab A "From connections": click a connected user to add them directly
 * to project_members (no email round-trip).
 *
 * Tab B "Email link": generates a /invite/:token URL. The sheet copies it
 * to the clipboard and optionally opens a pre-filled mailto: so the host
 * can ship the invite without leaving the app.
 */

import { useEffect, useState } from 'react';
import { X, Mail, Users, Loader2, Check, Copy, Link as LinkIcon } from 'lucide-react';
import { ProjectService, type Project } from '../../services/ProjectService';
import { fetchConnections, type ConnectionWithProfile } from '../../services/ConnectionService';

type Tab = 'connections' | 'email';

export function InviteCollaboratorSheet({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState<ConnectionWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Email tab state
  const [email, setEmail] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchConnections()
      .then(setConnections)
      .catch((e) => setError(e?.message ?? 'Could not load connections'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAddConnection(c: ConnectionWithProfile) {
    setBusyId(c.other_user_id);
    setError(null);
    try {
      await ProjectService.addConnectionAsMember({
        projectId: project.id,
        userId: c.other_user_id,
      });
      setAddedIds((prev) => new Set(prev).add(c.other_user_id));
    } catch (e: any) {
      setError(e?.message ?? 'Could not add collaborator');
    } finally {
      setBusyId(null);
    }
  }

  async function handleGenerateLink() {
    setGenerating(true);
    setError(null);
    setCopied(false);
    try {
      const invite = await ProjectService.createInvite({
        projectId: project.id,
        email: email.trim() || undefined,
      });
      const url = `${window.location.origin}/invite/${invite.invite_token}`;
      setGeneratedUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch { /* ignore */ }
    } catch (e: any) {
      setError(e?.message ?? 'Could not create invite');
    } finally {
      setGenerating(false);
    }
  }

  async function copyAgain() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <h2 className="stitch-headline text-base font-extrabold leading-tight">Invite to project</h2>
            <p className="text-xs stitch-text-secondary truncate">{project.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container transition-colors"
          >
            <X size={15} className="stitch-text-secondary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 px-5 pb-3">
          <div className="flex p-1 bg-surface-container-low rounded-full gap-1">
            {([
              { id: 'connections' as const, label: 'From connections', icon: Users },
              { id: 'email' as const, label: 'Email link', icon: Mail },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-semibold transition-all ${
                  tab === id ? 'bg-white shadow-sm text-primary' : 'stitch-text-secondary'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {error && (
            <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {tab === 'connections' && (
            loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-surface-container-low rounded-xl animate-pulse" />
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Users size={28} className="mx-auto mb-3 stitch-text-secondary opacity-50" />
                <p className="text-sm font-bold stitch-text-primary mb-1">No connections yet</p>
                <p className="text-xs stitch-text-secondary leading-relaxed">
                  Send a connection request from someone's profile, or use the Email link tab to share with anyone.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {connections.map((c) => {
                  const added = addedIds.has(c.other_user_id);
                  const isBusy = busyId === c.other_user_id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={added || isBusy}
                      onClick={() => handleAddConnection(c)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                        added
                          ? 'bg-emerald-50 cursor-default'
                          : 'bg-surface-container-low hover:bg-surface-container active:scale-[0.99]'
                      }`}
                    >
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white font-extrabold shrink-0">
                          {c.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-sm font-bold stitch-text-primary truncate">
                        {c.display_name}
                      </span>
                      {added ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 inline-flex items-center gap-1">
                          <Check size={11} strokeWidth={3} /> Added
                        </span>
                      ) : isBusy ? (
                        <Loader2 size={14} className="animate-spin stitch-text-secondary" />
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Add
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          )}

          {tab === 'email' && (
            <div className="space-y-3">
              <p className="text-xs stitch-text-secondary leading-relaxed">
                Generate a link anyone can use to join. Optionally tag it with an
                email — they can be a brand-new SharedMinds user; the link auto-joins
                them after signup.
              </p>
              <div>
                <label className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5 block">
                  Email <span className="opacity-60 normal-case font-medium">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="them@example.com"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-surface-container-low outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {!generatedUrl ? (
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl stitch-btn--primary text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-60"
                >
                  {generating ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                  Generate invite link
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-surface-container-low rounded-xl px-3 py-2.5">
                    <LinkIcon size={13} className="text-primary shrink-0" />
                    <code className="flex-1 text-xs stitch-text-primary truncate">{generatedUrl}</code>
                    <button
                      type="button"
                      onClick={copyAgain}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                        copied ? 'bg-emerald-100 text-emerald-700' : 'bg-white stitch-text-secondary hover:bg-surface-container'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {email && (
                    <a
                      href={`mailto:${email}?subject=${encodeURIComponent(`Join my project: ${project.title}`)}&body=${encodeURIComponent(`I'd love your help on "${project.title}" on SharedMinds.\n\nJoin here:\n${generatedUrl}\n\nLink expires in 14 days.`)}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-container-low stitch-text-primary text-xs font-bold hover:bg-surface-container transition-colors"
                    >
                      <Mail size={12} /> Open email draft
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => { setGeneratedUrl(null); setCopied(false); setEmail(''); }}
                    className="w-full text-xs stitch-text-secondary py-2 hover:stitch-text-primary"
                  >
                    Generate another link
                  </button>
                </div>
              )}
              <p className="text-[10px] stitch-text-secondary text-center">
                Links expire after 14 days.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
