/**
 * ParkingLotCard — the home inbox for distractions parked during sessions.
 *
 * Anything you captured mid-session but didn't triage at the debrief lands
 * here. Clear it on your own terms: turn a note into a backlog task, or let
 * it go. Hides itself when the lot is empty.
 */

import { useEffect, useState } from 'react';
import { Inbox, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';
import { CaptureService, type SessionCapture } from '../../services/CaptureService';

export function ParkingLotCard() {
  const { user } = useAuth();
  const { state: { spaces }, reloadTasks } = useCoreData();
  const personalSpace = spaces.find((s) => s.type === 'personal');

  const [items, setItems] = useState<SessionCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    CaptureService.getOpenCaptures()
      .then((rows) => { if (!cancelled) setItems(rows); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function keepAsTask(c: SessionCapture) {
    if (busyId || !user || !personalSpace) return;
    setBusyId(c.id);
    try {
      await CaptureService.convertToTask(c, personalSpace.id, user.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
      void reloadTasks();
    } catch { /* keep */ }
    finally { setBusyId(null); }
  }
  async function discard(c: SessionCapture) {
    if (busyId) return;
    setBusyId(c.id);
    try {
      await CaptureService.deleteCapture(c.id);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch { /* keep */ }
    finally { setBusyId(null); }
  }

  if (loading || items.length === 0) return null;

  return (
    <section className="rounded-2xl bg-violet-50/60 ring-1 ring-violet-200/60 p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Inbox size={15} className="text-violet-600 shrink-0" />
        <p className="text-sm font-extrabold text-violet-900 leading-tight">
          Parking lot · {items.length}
        </p>
      </div>
      <p className="text-[11px] text-violet-700/80 leading-snug mb-3">
        Distractions you parked mid-session. Make them tasks or let them go.
      </p>

      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-xl bg-surface ring-1 ring-violet-200/40 px-3 py-2">
            <span className="flex-1 min-w-0 text-sm stitch-text-primary leading-snug break-words">{c.text}</span>
            <button
              type="button"
              onClick={() => keepAsTask(c)}
              disabled={busyId === c.id}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold active:scale-[0.97] transition-transform disabled:opacity-50"
              title="Add to your tasks"
            >
              {busyId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={3} />}
              Task
            </button>
            <button
              type="button"
              onClick={() => discard(c)}
              disabled={busyId === c.id}
              className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-rose-600/70 hover:bg-rose-50 hover:text-rose-700 transition-colors disabled:opacity-50"
              aria-label="Let it go"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
