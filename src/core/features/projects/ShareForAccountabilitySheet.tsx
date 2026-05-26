// ShareForAccountabilitySheet
//
// Lightweight "Share for accountability" UX per the Phase D brief.
// Lets a project owner generate a read-only share link they can pass
// to a partner / friend / family member. Recipients see the project
// header + completed sessions at /shared/:token — no account needed.
//
// Surface design intent: warm + small, not "manage permissions."
// One input ("who is this for — a friendly label"), one toggle (weekly
// summary email), one button (Generate link). Existing tokens listed
// below with copy + revoke. That's the whole flow.

import { useEffect, useState } from 'react';
import { Copy, Check, X, Link2, Loader2, AlertTriangle } from 'lucide-react';
import { ProjectShareService, type ProjectShareToken } from '../../services/ProjectShareService';

interface Props {
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}

export function ShareForAccountabilitySheet({ projectId, projectTitle, onClose }: Props) {
  const [tokens, setTokens] = useState<ProjectShareToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create-form state.
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [weeklySummary, setWeeklySummary] = useState(false);

  // Per-token "just copied" feedback.
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    ProjectShareService.listTokens(projectId)
      .then((rows) => { if (!cancelled) setTokens(rows); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  async function handleGenerate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await ProjectShareService.createToken({
        projectId,
        invitedLabel: label || null,
        invitedEmail: email || null,
        weeklySummaryEmail: weeklySummary,
      });
      setTokens((prev) => [created, ...prev]);
      // Auto-copy the just-generated URL — most common next action.
      const url = ProjectShareService.buildShareUrl(created.token);
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(created.id);
        window.setTimeout(() => setCopiedId(null), 2000);
      } catch { /* clipboard can fail on insecure origins */ }
      setLabel('');
      setEmail('');
      setWeeklySummary(false);
    } catch (e: any) {
      setError(e?.message ?? 'Could not create share link.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy(tk: ProjectShareToken) {
    const url = ProjectShareService.buildShareUrl(tk.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(tk.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('[ShareForAccountability] clipboard write failed', e);
    }
  }

  async function handleRevoke(tk: ProjectShareToken) {
    if (!confirm(`Revoke this share link?\n\n${tk.invited_label || tk.invited_email || 'The recipient'} will no longer be able to view the project page.`)) return;
    try {
      await ProjectShareService.revokeToken(tk.id);
      setTokens((prev) => prev.map((t) => (t.id === tk.id ? { ...t, revoked_at: new Date().toISOString() } : t)));
    } catch (e: any) {
      setError(e?.message ?? 'Could not revoke.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 ring-1 ring-violet-100 grid place-items-center shrink-0">
              <Link2 size={18} className="text-violet-600" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">
                Share for accountability
              </h2>
              <p className="text-xs stitch-text-secondary mt-0.5 leading-snug">
                Give someone a read-only view of your progress on <strong className="stitch-text-primary">{projectTitle}</strong>. No account needed on their side.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Create form */}
          <div className="rounded-2xl bg-surface-container-low p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
              Generate a new link
            </p>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Who is this for? (e.g. Mum, Alex, Accountability buddy)"
              className="w-full px-3 py-2 rounded-lg bg-surface stitch-text-primary text-sm outline-none ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30"
              autoComplete="off"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Their email (optional — for sending weekly summaries later)"
              className="w-full px-3 py-2 rounded-lg bg-surface stitch-text-primary text-sm outline-none ring-1 ring-surface-container focus:ring-2 focus:ring-primary/30"
              autoComplete="off"
            />
            {email.trim() && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={weeklySummary}
                  onChange={(e) => setWeeklySummary(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-xs stitch-text-primary">
                  Send them a weekly summary email
                  <span className="ml-1 text-[10px] stitch-text-secondary">(coming soon)</span>
                </span>
              </label>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
              {busy ? 'Creating…' : 'Generate share link'}
            </button>
            {error && (
              <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-3 py-2 flex items-start gap-1.5">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Existing links */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary px-1">
              Existing links {tokens.length > 0 && `· ${tokens.length}`}
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-xs stitch-text-secondary px-1 py-2">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </div>
            )}
            {!loading && tokens.length === 0 && (
              <p className="text-xs stitch-text-secondary italic px-1 py-2">
                No share links yet. Create one above.
              </p>
            )}
            {tokens.map((tk) => {
              const url = ProjectShareService.buildShareUrl(tk.token);
              const isRevoked = !!tk.revoked_at;
              const isExpired = !!tk.expires_at && new Date(tk.expires_at).getTime() < Date.now();
              const inactive = isRevoked || isExpired;
              return (
                <div
                  key={tk.id}
                  className={`rounded-xl p-3 ring-1 ${
                    inactive ? 'bg-surface-container-low/40 ring-surface-container opacity-60' : 'bg-surface ring-surface-container'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold stitch-text-primary truncate">
                        {tk.invited_label || tk.invited_email || 'Untitled share'}
                      </p>
                      <p className="text-[10px] stitch-text-secondary truncate font-mono mt-0.5">
                        {url}
                      </p>
                    </div>
                    {!inactive && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(tk)}
                          className="w-7 h-7 rounded-md grid place-items-center stitch-text-secondary hover:bg-surface-container-low hover:stitch-text-primary"
                          title="Copy link"
                        >
                          {copiedId === tk.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(tk)}
                          className="w-7 h-7 rounded-md grid place-items-center text-rose-600/70 hover:bg-rose-50 hover:text-rose-700"
                          title="Revoke link"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] stitch-text-secondary">
                    {isRevoked ? 'Revoked' : isExpired ? 'Expired' : tk.last_viewed_at
                      ? `Last viewed ${new Date(tk.last_viewed_at).toLocaleDateString()}`
                      : 'Not viewed yet'}
                    {tk.expires_at && !isRevoked && !isExpired && (
                      <> · expires {new Date(tk.expires_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] stitch-text-secondary/70 leading-snug px-1">
            Recipients see your project title, description, cover, and completed sessions —
            with goals, outcomes, and durations. They don't see tasks, milestones, notes, or
            anyone else's content. Links expire after 90 days unless you revoke sooner.
          </p>
        </div>
      </div>
    </div>
  );
}
