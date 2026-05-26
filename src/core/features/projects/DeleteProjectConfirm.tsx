// DeleteProjectConfirm
//
// Type-the-name confirmation modal for permanent project deletion.
// Replaces the native window.prompt() dialog with a properly themed
// surface that matches the rest of the app: backdrop-blur, sized to
// the viewport (full-bleed bottom-sheet on mobile, centered card on
// desktop), and gives the user clear "this cannot be undone" framing.
//
// The match guard is exact (case-sensitive, trim-whitespace) — small
// friction by design because this is destructive.

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';

interface Props {
  projectName: string;
  /** What permanent deletion means in the user's words. */
  detail?: string;
  /** Called after the user types the correct name AND clicks Delete.
   *  Promise resolves: parent closes the modal. Throws: stays open. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteProjectConfirm({ projectName, detail, onConfirm, onClose }: Props) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus the input on mount + Esc to cancel.
  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const matches = typed.trim() === projectName.trim();

  async function handleSubmit() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error('[DeleteProjectConfirm]', e);
      setError(e instanceof Error ? e.message : 'Delete failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-md"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 ring-1 ring-rose-100 grid place-items-center shrink-0">
              <AlertTriangle size={18} className="text-rose-600" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold stitch-text-primary leading-tight">
                Delete project?
              </h2>
              <p className="text-xs stitch-text-secondary mt-0.5">
                This can't be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low disabled:opacity-40"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-3">
          {detail && (
            <p className="text-sm stitch-text-secondary leading-relaxed">
              {detail}
            </p>
          )}
          {!detail && (
            <p className="text-sm stitch-text-secondary leading-relaxed">
              All tasks, milestones, notes, and pinned sessions tied to this project will be permanently removed.
            </p>
          )}

          <div className="rounded-xl bg-surface-container-low p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest stitch-text-secondary mb-1.5">
              Type to confirm
            </p>
            <p className="text-sm font-extrabold stitch-text-primary break-words mb-2">
              {projectName}
            </p>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && matches) handleSubmit(); }}
              disabled={busy}
              placeholder="Project name"
              className={`w-full px-3 py-2.5 rounded-lg bg-surface stitch-text-primary text-sm font-medium outline-none ring-1 transition-shadow focus:ring-2 ${
                matches
                  ? 'ring-emerald-300 focus:ring-emerald-400'
                  : typed.length > 0
                    ? 'ring-rose-200 focus:ring-rose-300'
                    : 'ring-surface-container focus:ring-primary/30'
              }`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-700 bg-rose-50 ring-1 ring-rose-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 rounded-xl text-sm font-bold stitch-text-primary bg-surface-container-low hover:bg-surface-container disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!matches || busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {busy ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
