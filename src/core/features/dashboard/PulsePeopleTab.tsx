/**
 * PulsePeopleTab — the new content of the Pulse tab on the home dashboard.
 *
 * Replaces the old session activity feed (which gave users no actionable
 * signal) with people-focused content. Every card here has a clear next
 * action: connect, message, or visit a profile.
 *
 * Sections, in priority order:
 *   1. Looking for help you can give     (your `offering` ∩ their `seeking`)
 *   2. People offering help you'd like   (your `seeking` ∩ their `offering`)
 *   3. People like you                   (work_types / skills overlap)
 *   4. New members this week
 *
 * Each section is hidden if empty. If the whole tab is empty (very early
 * platform state), we show a friendly "be the first" prompt.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, HandHelping, HeartHandshake, Users, UserPlus, Magnet, Search, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { PersonCard } from '../people/PersonCard';
import { getBlockedUserIds } from '../../services/ModerationService';

interface PeopleProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  work_types: string[] | null;
  skills: string[] | null;
  skill_levels: Record<string, number> | null;
  offering: string[] | null;
  seeking: string[] | null;
  dm_privacy: 'open' | 'connections_only' | 'do_not_disturb' | null;
  session_count?: number;
  city: string | null;
  country_code: string | null;
  created_at: string;
}

function arraysOverlap(a: string[] | null | undefined, b: string[] | null | undefined): string[] {
  if (!a || !b) return [];
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

export function PulsePeopleTab() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<PeopleProfile[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Pull everyone except the current user. RLS handles privacy
  // (is_hidden_from_directory etc). 60 is plenty for the home strip.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, bio, work_types, skills, skill_levels, offering, seeking, wanted_skills, dm_privacy, city, country_code, created_at')
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(60);

      if (cancelled) return;
      if (error) {
        console.warn('[PulsePeopleTab] load failed:', error.message);
        setLoaded(true);
        return;
      }

      let rows = ((data ?? []) as unknown) as PeopleProfile[];

      // Hide blocked users from the cohort. getBlockedUserIds returns a Set
      // of "anyone I've blocked OR anyone who's blocked me" so the cards
      // also disappear from the other party's view (mutual invisibility).
      try {
        const blocked = await getBlockedUserIds();
        if (blocked.size > 0) rows = rows.filter((r) => !blocked.has(r.id));
      } catch { /* non-fatal */ }

      // Aggregate session counts client-side for the visible cohort.
      // One query, grouped in JS. Cheap because we cap to 60 members.
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const { data: sessRows } = await supabase
          .from('focus_sessions')
          .select('user_id')
          .in('user_id', ids);
        const counts: Record<string, number> = {};
        for (const s of (sessRows ?? []) as { user_id: string }[]) {
          counts[s.user_id] = (counts[s.user_id] ?? 0) + 1;
        }
        for (const r of rows) r.session_count = counts[r.id] ?? 0;
      }

      if (cancelled) return;
      setMembers(rows);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ── Filters ────────────────────────────────────────────────────────────
  // Light-weight: a single search box (matches name/skill/bio) + a work-type
  // pill row. Country/skill drop-downs live on /people where browsing is the
  // main job; here we keep Pulse scannable.
  const [filterSkill, setFilterSkill] = useState('');
  const [filterWorkType, setFilterWorkType] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const q = filterSkill.trim().toLowerCase();
    return members.filter((m) => {
      if (filterWorkType && !(m.work_types ?? []).includes(filterWorkType)) return false;
      if (q) {
        const hay = [
          m.display_name,
          m.bio ?? '',
          m.city ?? '',
          ...(m.skills ?? []),
          ...(m.work_types ?? []),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, filterSkill, filterWorkType]);

  // Surface the top 6 work-types present in the data as filter pills.
  const workTypeOptions = useMemo(() => {
    const tally = new Map<string, number>();
    for (const m of members) for (const wt of m.work_types ?? []) {
      tally.set(wt, (tally.get(wt) ?? 0) + 1);
    }
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([wt]) => wt);
  }, [members]);

  // ── Section computation ────────────────────────────────────────────────
  const myOffering = profile?.offering ?? [];
  const mySeeking  = profile?.seeking ?? [];
  const myWorkTypes = profile?.work_types ?? [];
  const mySkills    = profile?.skills ?? [];
  const myWanted    = profile?.wanted_skills ?? [];

  // 1. "People who want what I offer" — they SEEK what I OFFER
  const peopleSeekingMyHelp = useMemo(
    () => filteredMembers
      .map((m) => ({ member: m, overlap: arraysOverlap(myOffering, m.seeking) }))
      .filter((x) => x.overlap.length > 0)
      .sort((a, b) => b.overlap.length - a.overlap.length)
      .slice(0, 6),
    [filteredMembers, myOffering],
  );

  // 2. "People who offer what I seek" — they OFFER what I SEEK
  const peopleOfferingWhatINeed = useMemo(
    () => filteredMembers
      .map((m) => ({ member: m, overlap: arraysOverlap(mySeeking, m.offering) }))
      .filter((x) => x.overlap.length > 0)
      .sort((a, b) => b.overlap.length - a.overlap.length)
      .slice(0, 6),
    [filteredMembers, mySeeking],
  );

  // 3. "People like you" — overlap in work_types or skills
  const similarMembers = useMemo(
    () => filteredMembers
      .map((m) => ({
        member: m,
        overlap: [
          ...arraysOverlap(myWorkTypes, m.work_types),
          ...arraysOverlap(mySkills, m.skills),
        ],
      }))
      .filter((x) => x.overlap.length > 0)
      // exclude people already shown in sections 1 or 2
      .filter((x) =>
        !peopleSeekingMyHelp.some((p) => p.member.id === x.member.id)
        && !peopleOfferingWhatINeed.some((p) => p.member.id === x.member.id)
      )
      .sort((a, b) => b.overlap.length - a.overlap.length)
      .slice(0, 6),
    [filteredMembers, myWorkTypes, mySkills, peopleSeekingMyHelp, peopleOfferingWhatINeed],
  );

  // 4. "New this week" — joined in the last 7 days
  const newThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return filteredMembers
      .filter((m) => new Date(m.created_at).getTime() > cutoff)
      .filter((m) =>
        !peopleSeekingMyHelp.some((p) => p.member.id === m.id)
        && !peopleOfferingWhatINeed.some((p) => p.member.id === m.id)
        && !similarMembers.some((p) => p.member.id === m.id)
      )
      .slice(0, 6);
  }, [filteredMembers, peopleSeekingMyHelp, peopleOfferingWhatINeed, similarMembers]);

  // ── Empty-state CTAs ─────────────────────────────────────────────────
  const userHasNoTags = myOffering.length === 0 && mySeeking.length === 0;
  // Nudge to declare wanted skills — separate from the tags nudge because
  // people can have filled in offering/seeking without yet building a
  // skills wishlist. The two CTAs route to different pages.
  const userHasNoWanted = myWanted.length === 0;
  const allSectionsEmpty =
    peopleSeekingMyHelp.length === 0
    && peopleOfferingWhatINeed.length === 0
    && similarMembers.length === 0
    && newThisWeek.length === 0;

  if (!loaded) {
    return (
      <p className="text-center text-sm stitch-text-secondary py-8">Loading…</p>
    );
  }

  return (
    <div className="space-y-5">

      {/* Nudge to fill in tags if user is empty */}
      {userHasNoTags && (
        <section className="rounded-2xl bg-gradient-to-br from-violet-50 via-blue-50/30 to-cyan-50/30 ring-1 ring-violet-200/40 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <HandHelping size={18} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold stitch-text-primary leading-snug mb-1">
                Tell people what you can help with.
              </p>
              <p className="text-xs stitch-text-secondary leading-relaxed mb-2">
                Add a few tags to your profile. We'll match you with members who'd love your help — and members who can help you back.
              </p>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 bg-white hover:bg-violet-50 ring-1 ring-violet-200 px-3 py-1.5 rounded-full transition-colors"
              >
                <Sparkles size={11} /> Set your tags
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Nudge to declare wanted skills (find-someone-like-X). Hidden once
          the user has any wishlist. Links to /people → Discover where the
          WantedSkillsCard lives. */}
      {userHasNoWanted && (
        <section className="rounded-2xl bg-gradient-to-br from-violet-50 via-fuchsia-50/30 to-pink-50/30 ring-1 ring-violet-200/40 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
              <Magnet size={18} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold stitch-text-primary leading-snug mb-1">
                Who would you love to meet?
              </p>
              <p className="text-xs stitch-text-secondary leading-relaxed mb-2">
                Pick a few skills you're looking for in others — a fundraising
                person, a Figma pro. We'll flag matching members with a 🧲 badge.
              </p>
              <button
                type="button"
                onClick={() => navigate('/people')}
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 bg-white hover:bg-violet-50 ring-1 ring-violet-200 px-3 py-1.5 rounded-full transition-colors"
              >
                <Magnet size={11} /> Add wishlist skills
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Filter row: text search + work-type pills ─────────────── */}
      {/* All controls sized for touch: search input + clear-X ≥ 40px tall,
          work-type pills ≥ 32px tall, horizontal-scroll for overflow.    */}
      {members.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-full bg-surface-container-low ring-1 ring-surface-container">
            <Search size={14} className="stitch-text-secondary shrink-0" />
            <input
              type="text"
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              placeholder="Filter by skill, role, name, city…"
              className="flex-1 bg-transparent text-sm stitch-text-primary placeholder:stitch-text-secondary outline-none border-0 min-w-0"
            />
            {(filterSkill || filterWorkType) && (
              <button
                type="button"
                onClick={() => { setFilterSkill(''); setFilterWorkType(null); }}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors -mr-1"
                title="Clear filters"
                aria-label="Clear filters"
              >
                <X size={13} className="stitch-text-secondary" />
              </button>
            )}
          </div>
          {workTypeOptions.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
              {workTypeOptions.map((wt) => {
                const active = filterWorkType === wt;
                return (
                  <button
                    key={wt}
                    type="button"
                    onClick={() => setFilterWorkType(active ? null : wt)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low stitch-text-primary hover:bg-surface-container'
                    }`}
                  >
                    {wt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 1. People who'd love your help */}
      {peopleSeekingMyHelp.length > 0 && (
        <PeopleSection
          icon={<HeartHandshake size={13} className="text-emerald-600" />}
          title="People who'd love your help"
          tone="emerald"
          rows={peopleSeekingMyHelp}
          mySkills={mySkills}
          mySeeking={mySeeking}
          myWanted={myWanted}
        />
      )}

      {/* 2. People who can help you */}
      {peopleOfferingWhatINeed.length > 0 && (
        <PeopleSection
          icon={<HandHelping size={13} className="text-violet-600" />}
          title="People who could help you"
          tone="violet"
          rows={peopleOfferingWhatINeed}
          mySkills={mySkills}
          mySeeking={mySeeking}
          myWanted={myWanted}
        />
      )}

      {/* 3. People like you */}
      {similarMembers.length > 0 && (
        <PeopleSection
          icon={<Users size={13} className="text-blue-600" />}
          title="People like you"
          tone="blue"
          rows={similarMembers}
          mySkills={mySkills}
          mySeeking={mySeeking}
          myWanted={myWanted}
        />
      )}

      {/* 4. New this week */}
      {newThisWeek.length > 0 && (
        <PeopleSection
          icon={<UserPlus size={13} className="text-amber-600" />}
          title="New this week"
          tone="amber"
          rows={newThisWeek.map((m) => ({ member: m, overlap: [] }))}
          mySkills={mySkills}
          mySeeking={mySeeking}
          myWanted={myWanted}
        />
      )}

      {/* Full-empty state — no other members at all */}
      {allSectionsEmpty && !userHasNoTags && (
        <div className="rounded-2xl bg-surface-container-low/50 ring-1 ring-dashed ring-outline-variant/20 p-6 text-center">
          <p className="text-sm font-bold stitch-text-primary">Quiet right now.</p>
          <p className="text-xs stitch-text-secondary mt-1 leading-relaxed">
            When other members fill in what they're offering or seeking, we'll surface matches here.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────
//
// Each section is a labelled grid of PersonCards. On mobile we go single
// column for thumb-readable density; on sm+ we go two columns so the user
// can scan four people at a glance.

function PeopleSection({
  icon, title, tone, rows, mySkills, mySeeking, myWanted,
}: {
  icon: React.ReactNode;
  title: string;
  tone: 'emerald' | 'violet' | 'blue' | 'amber';
  rows: Array<{ member: PeopleProfile; overlap: string[] }>;
  mySkills: string[];
  mySeeking: string[];
  myWanted: string[];
}) {
  const accent = {
    emerald: 'text-emerald-700',
    violet:  'text-violet-700',
    blue:    'text-blue-700',
    amber:   'text-amber-700',
  }[tone];

  return (
    <section>
      <div className="flex items-center gap-1.5 mb-2 px-1">
        {icon}
        <p className={`text-[10px] font-bold uppercase tracking-widest ${accent}`}>{title}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {rows.map(({ member }) => (
          <PersonCard
            key={member.id}
            member={member}
            alwaysShowMatched={mySkills.length > 0}
            match={{
              matched: arraysOverlap(mySkills, member.skills),
              hunt:    arraysOverlap(mySeeking, member.offering),
              wanted:  arraysOverlap(myWanted, member.skills),
            }}
          />
        ))}
      </div>
    </section>
  );
}

// PersonRow / MatchBadges helpers removed — superseded by the shared
// PersonCard component which is now used in both Pulse and /people.
