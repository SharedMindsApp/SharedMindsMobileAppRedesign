/**
 * DailyIntentionCard — one-line "what's today about?" capture.
 *
 * Persists to the existing `daily_plans` table (intention column), unique
 * per (user_id, plan_date). Self-only RLS. Anchors the home page even on
 * days you don't book a session — a tiny journaling habit that builds
 * continuity.
 */

import { useEffect, useRef, useState } from 'react';
import { Sun, Loader2, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/AuthProvider';
import { useCoreData } from '../../data/CoreDataContext';

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function DailyIntentionCard() {
  const { user } = useAuth();
  const { state: { spaces } } = useCoreData();
  const personalSpace = spaces.find((s) => s.type === 'personal');

  const [intention, setIntention] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const initialRef = useRef('');
  const debounceRef = useRef<number | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('daily_plans')
      .select('intention')
      .eq('user_id', user.id)
      .eq('plan_date', todayKey())
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const text = data?.intention ?? '';
        setIntention(text);
        initialRef.current = text;
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Debounced upsert on edit
  useEffect(() => {
    if (!loaded || !user || !personalSpace) return;
    if (intention === initialRef.current) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from('daily_plans')
        .upsert(
          {
            user_id: user.id,
            space_id: personalSpace.id,
            plan_date: todayKey(),
            intention: intention.trim() || null,
          },
          { onConflict: 'user_id,plan_date' }
        );
      if (!error) {
        initialRef.current = intention;
        setSavedAt(Date.now());
      }
      setSaving(false);
    }, 800);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [intention, loaded, user, personalSpace]);

  // Auto-clear "saved" indicator
  useEffect(() => {
    if (!savedAt) return;
    const id = window.setTimeout(() => setSaved(null), 1500);
    return () => window.clearTimeout(id);
    function setSaved(n: number | null) { setSavedAt(n); }
  }, [savedAt]);

  return (
    <div className="rounded-2xl bg-surface-container-low p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sun size={13} className="text-amber-500" />
          <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase">
            Today's intention
          </p>
        </div>
        {saving && <Loader2 size={11} className="animate-spin stitch-text-secondary" />}
        {!saving && savedAt && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
            <Check size={10} strokeWidth={3} /> Saved
          </span>
        )}
      </div>
      <input
        type="text"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        maxLength={200}
        placeholder="What's today about? One line."
        className="w-full bg-transparent outline-none text-sm font-semibold stitch-text-primary placeholder:stitch-text-secondary placeholder:font-normal"
      />
    </div>
  );
}
