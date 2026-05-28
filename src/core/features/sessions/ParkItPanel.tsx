/**
 * ParkItPanel — the in-session distraction parking lot.
 *
 * A floating button (bottom-left, above the timer chrome) that expands into a
 * tiny capture field + this session's parked list. Type a distraction, hit
 * Enter, get straight back to work — the whole point is to NOT chase the
 * thought. Triage happens later (at the debrief + the parking-lot inbox).
 *
 * Dark-themed to sit over both the solo ambient view and the live video grid.
 */

import { useEffect, useRef, useState } from 'react';
import { Inbox, X, Plus, Loader2 } from 'lucide-react';
import { CaptureService, type SessionCapture } from '../../services/CaptureService';

export function ParkItPanel({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [items, setItems] = useState<SessionCapture[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    CaptureService.getCapturesForSession(sessionId)
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function add() {
    const clean = text.trim();
    if (!clean || saving) return;
    setSaving(true);
    try {
      const created = await CaptureService.addCapture(sessionId, clean);
      setItems((prev) => [...prev, created]);
      setText('');
      inputRef.current?.focus();
    } catch { /* keep text for retry */ }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed left-3 bottom-3 z-40 flex flex-col items-start gap-2" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      {open && (
        <div className="w-72 max-w-[80vw] rounded-2xl bg-[#1a1a2e]/95 backdrop-blur-md ring-1 ring-white/10 shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/50">
              Parking lot {items.length > 0 && `· ${items.length}`}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-6 h-6 rounded-full grid place-items-center text-white/50 hover:bg-white/10"
            >
              <X size={13} />
            </button>
          </div>

          {/* Parked list (this session) */}
          {items.length > 0 && (
            <ul className="mb-2 max-h-40 overflow-y-auto space-y-1">
              {items.map((c) => (
                <li key={c.id} className="text-[12px] text-white/85 leading-snug flex items-start gap-1.5">
                  <span className="text-white/30 mt-0.5">•</span>
                  <span className="min-w-0 break-words">{c.text}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Capture input */}
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder="Park a distraction…"
              className="flex-1 min-w-0 bg-white/10 rounded-lg px-2.5 py-2 text-[13px] text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-violet-400/40"
            />
            {text.trim() && (
              <button
                type="button"
                onClick={add}
                disabled={saving}
                aria-label="Park it"
                className="shrink-0 w-8 h-8 rounded-lg bg-violet-500 grid place-items-center active:scale-90 transition-transform disabled:opacity-50"
              >
                {saving ? <Loader2 size={13} className="text-white animate-spin" /> : <Plus size={14} className="text-white" strokeWidth={3} />}
              </button>
            )}
          </div>
          <p className="text-[10px] text-white/35 mt-1.5 leading-snug">
            Stay on task — sort these out when you finish.
          </p>
        </div>
      )}

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#1a1a2e]/90 backdrop-blur-md ring-1 ring-white/10 text-white/85 text-xs font-bold shadow-lg hover:bg-[#1a1a2e] active:scale-95 transition-all"
      >
        <Inbox size={13} className="text-violet-300" />
        Park it
        {items.length > 0 && (
          <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-500 text-white text-[10px] font-extrabold grid place-items-center tabular-nums">
            {items.length}
          </span>
        )}
      </button>
    </div>
  );
}
