/**
 * PersonCard — the shared card for browsing other members.
 *
 * Used on:
 *   • Home → Pulse tab (grid of matched members)
 *   • /people Discover tab (full directory)
 *
 * Why this exists (vs. the older row-based PersonRow): a card grid scans
 * better when you're browsing strangers, gives more vertical room for
 * skills + match signal, and matches the visual density users expect from
 * directory products (CoFoundersLab, LinkedIn, etc.).
 *
 * Comprehensiveness brief:
 *   - Avatar + name + work-type + city/country flag (identity)
 *   - Bio line (context)
 *   - Top 4 skills with self-rated star count (signal)
 *   - Three match badges: 🤝 matched / 🎯 hunt / 🧲 wanted (action cue)
 *   - Connect button (CTA)
 *
 * Anything more directory-specific (incoming requests, active-session glow,
 * Message buttons) lives in MembersDirectoryPage's wrapper, not here.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MessageCircle, Loader2, Flame } from 'lucide-react';
import { ConnectButton } from '../connections/ConnectButton';
import { findSkillCategory } from '../../../lib/skills';
import { findCountry } from '../../../lib/countries';
import { getOrCreateDm, DmPrivacyError, type DmPrivacy } from '../../services/MessageService';
import { showToast } from '../../../components/Toast';
import { useMessagingDock } from '../messages/MessagingDockContext';
import { PersonDetailSheet } from './PersonDetailSheet';
import { SafetyMenu } from '../moderation/SafetyMenu';

export interface PersonCardProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio?: string | null;
  work_types?: string[] | null;
  city?: string | null;
  country_code?: string | null;
  skills?: string[] | null;
  skill_levels?: Record<string, number> | null;
  offering?: string[] | null;
  /** DM privacy preference. Controls whether the Message button shows for
   *  non-connected viewers. Default 'open' if undefined for legacy rows. */
  dm_privacy?: DmPrivacy | null;
  /** Lifetime focus-session count. Drives the tiered milestone badge
   *  (10+, 50+, 100+, 250+, 500+). Hidden below 10 — we only want to show
   *  this as positive social proof, not as a wall of single-digit counts. */
  session_count?: number | null;
  /** True when the viewer is already a connection. When set, the Message
   *  button shows regardless of dm_privacy unless DND. */
  isConnected?: boolean;
}

export interface PersonCardMatch {
  /** my skills ∩ their skills */
  matched: string[];
  /** my seeking ∩ their offering */
  hunt: string[];
  /** my wanted_skills ∩ their skills */
  wanted: string[];
}

interface Props {
  member: PersonCardProfile;
  match?: PersonCardMatch;
  /** When true, the matched badge renders even at 0 with greyed styling — used
   *  on Pulse so a row never feels empty. Set false on neutral directories. */
  alwaysShowMatched?: boolean;
}

export function PersonCard({ member, match, alwaysShowMatched = false }: Props) {
  const navigate = useNavigate();
  const { openConversation, isMobile } = useMessagingDock();
  const [messaging, setMessaging] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const name = member.display_name?.trim() || 'Member';
  const initial = name.charAt(0).toUpperCase();
  const workType = member.work_types?.[0] ?? null;
  const country = findCountry(member.country_code);
  const location = member.city ?? '';

  // Show the Message button when:
  //   - they're a connection (DMs are always allowed connection-to-connection
  //     unless DND), OR
  //   - their dm_privacy is 'open' (anyone can DM).
  // Hide for 'connections_only' from a stranger, and always for 'do_not_disturb'.
  const dm = member.dm_privacy ?? 'open';
  const canMessage =
    dm !== 'do_not_disturb' &&
    (member.isConnected || dm === 'open');

  async function handleMessage() {
    if (messaging) return;
    setMessaging(true);
    try {
      const conversationId = await getOrCreateDm(member.id);
      if (isMobile) navigate(`/messages/${conversationId}`);
      else openConversation(conversationId);
    } catch (err) {
      if (err instanceof DmPrivacyError) showToast('warning', err.message);
      else console.error('[PersonCard] message failed:', err);
    } finally {
      setMessaging(false);
    }
  }

  // Skill ordering: matched + wanted first (so the user sees relevant skills
  // at a glance), then anything else, capped at 3 chips so the "+N more"
  // counter can sit inline rather than wrapping to its own orphan row.
  const totalSkills = member.skills?.length ?? 0;
  const topSkills = orderSkills(
    member.skills ?? [],
    new Set([...(match?.matched ?? []), ...(match?.wanted ?? [])]),
  ).slice(0, 3);
  const overflowCount = Math.max(0, totalSkills - topSkills.length);

  const hasAnyMatch = !!match && (match.matched.length + match.hunt.length + match.wanted.length > 0);
  const showMatchedZero = !!match && alwaysShowMatched && match.matched.length === 0 && !hasAnyMatch;

  return (
    <div className="relative group flex flex-col rounded-2xl bg-white ring-1 ring-surface-container hover:ring-primary/30 hover:shadow-md transition-all p-4">
      {/* Safety menu — tucked top-right. On desktop, hover reveals.
          On mobile (no hover), keep clearly visible so it's reachable. */}
      <div className="absolute top-2 right-2 z-10 opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <SafetyMenu
          targetUserId={member.id}
          targetUserName={name}
          contextUrl={typeof window !== 'undefined' ? window.location.pathname : undefined}
        />
      </div>

      {/* ── Header: avatar + name + work_type/location ─────────────── */}
      {/* pr-9 reserves space for the safety menu trigger so long names
          don't run under it on narrow cards. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex items-start gap-3 text-left w-full pr-9"
      >
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt=""
            className="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-white"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-base font-bold text-white shrink-0">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-bold stitch-text-primary truncate leading-tight">
              {name}
            </p>
            <SessionsBadge count={member.session_count ?? 0} />
          </div>
          {workType && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80 truncate mt-0.5">
              {workType}
            </p>
          )}
          {(location || country) && (
            <p className="text-[11px] stitch-text-secondary truncate mt-0.5 flex items-center gap-1">
              {country && <span className="text-xs leading-none shrink-0" title={country.name}>{country.flag}</span>}
              <span className="truncate">
                {location}
                {location && country?.name ? ', ' : ''}
                {!location && country?.name}
              </span>
            </p>
          )}
        </div>
      </button>

      {/* ── Bio (clamped to 2 lines so cards stay the same height) ─── */}
      {member.bio && (
        <p className="text-[11px] stitch-text-secondary leading-snug line-clamp-2 mt-2">
          {member.bio}
        </p>
      )}

      {/* ── Skill chips: max 3, then "+N more" inline on the same row ─ */}
      {topSkills.length > 0 && (
        <div className="flex items-center gap-1 mt-2.5 flex-wrap">
          {topSkills.map((s) => (
            <SkillChip
              key={s}
              skill={s}
              level={member.skill_levels?.[s]}
              highlight={
                match?.matched.includes(s)
                  ? 'matched'
                  : match?.wanted.includes(s)
                  ? 'wanted'
                  : undefined
              }
            />
          ))}
          {overflowCount > 0 && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              title={`See ${overflowCount} more skill${overflowCount === 1 ? '' : 's'}`}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold text-primary bg-primary/8 ring-1 ring-primary/15 hover:bg-primary/15 transition-colors active:scale-95"
            >
              +{overflowCount}
            </button>
          )}
        </div>
      )}

      {/* ── Match badges row (only when there's something to say) ──── */}
      {(hasAnyMatch || showMatchedZero) && (
        <div className="flex items-center flex-wrap gap-1 mt-2.5">
          {hasAnyMatch ? (
            <>
              {match!.matched.length > 0 && (
                <MatchBadge kind="matched" count={match!.matched.length} items={match!.matched} />
              )}
              {match!.hunt.length > 0 && (
                <MatchBadge kind="hunt" count={match!.hunt.length} items={match!.hunt} />
              )}
              {match!.wanted.length > 0 && (
                <MatchBadge kind="wanted" count={match!.wanted.length} items={match!.wanted} />
              )}
            </>
          ) : (
            // Viewer has skills but no overlap with this person — single
            // muted pill rather than absent, so a card never feels broken.
            <MatchBadge kind="matched" count={0} items={[]} muted />
          )}
        </div>
      )}

      {/* ── Action row: Message (when allowed) + Connect ───────────── */}
      {/* min-h-[36px] keeps the row tap-friendly on touch devices even
          when neither child grows the row naturally. */}
      <div className="flex items-center justify-end gap-1.5 mt-3 min-h-[36px]">
        {canMessage && (
          <button
            type="button"
            onClick={handleMessage}
            disabled={messaging}
            title="Send a message"
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-surface-container-low hover:bg-surface-container stitch-text-primary text-[11px] font-bold transition-colors active:scale-95 disabled:opacity-50"
          >
            {messaging
              ? <Loader2 size={11} className="animate-spin" />
              : <MessageCircle size={12} />}
            Message
          </button>
        )}
        <ConnectButton otherUserId={member.id} variant="light" />
      </div>

      {sheetOpen && (
        <PersonDetailSheet
          member={member}
          match={match}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

// ── Sessions badge ────────────────────────────────────────────────────────
//
// Tiered milestone badge — only renders at 10+ sessions so it always feels
// like positive social proof. Tiers: 10+, 50+, 100+, 250+, 500+.

function SessionsBadge({ count }: { count: number }) {
  if (count < 10) return null;
  const tier =
    count >= 500 ? { label: '500+', tone: 'text-amber-700 bg-amber-50 ring-amber-200' } :
    count >= 250 ? { label: '250+', tone: 'text-amber-700 bg-amber-50 ring-amber-200' } :
    count >= 100 ? { label: '100+', tone: 'text-violet-700 bg-violet-50 ring-violet-200' } :
    count >= 50  ? { label: '50+',  tone: 'text-emerald-700 bg-emerald-50 ring-emerald-200' } :
                   { label: '10+',  tone: 'text-blue-700 bg-blue-50 ring-blue-200' };
  return (
    <span
      title={`${count} focus sessions logged`}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ring-1 shrink-0 ${tier.tone}`}
    >
      <Flame size={9} strokeWidth={3} />
      {tier.label}
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function SkillChip({
  skill, level, highlight,
}: {
  skill: string;
  level?: number;
  highlight?: 'matched' | 'wanted';
}) {
  const cat = findSkillCategory(skill);
  const tone =
    highlight === 'matched' ? 'bg-blue-50 ring-blue-200 text-blue-800' :
    highlight === 'wanted'  ? 'bg-violet-50 ring-violet-200 text-violet-800' :
                              'bg-surface-container-low ring-surface-container stitch-text-primary';
  return (
    <span
      title={level ? `${skill} — self-rated ${level}/5` : skill}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ring-1 text-[10px] font-bold ${tone}`}
    >
      {cat && <span className="text-[10px] leading-none">{cat.emoji}</span>}
      {skill}
      {level && level > 0 && (
        <span className="inline-flex items-center gap-0.5 ml-0.5">
          <Star size={8} strokeWidth={2.5} className="fill-amber-400 text-amber-400" />
          <span className="tabular-nums text-[9px] text-amber-700">{level}</span>
        </span>
      )}
    </span>
  );
}

function MatchBadge({
  kind, count, items, muted,
}: {
  kind: 'matched' | 'hunt' | 'wanted';
  count: number;
  items: string[];
  muted?: boolean;
}) {
  const config = {
    matched: { emoji: '🤝', label: 'matched', tone: 'text-blue-700 bg-blue-50 ring-blue-100',     titlePrefix: 'Shared skills' },
    hunt:    { emoji: '🎯', label: 'hunt',    tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100', titlePrefix: "They offer what you're seeking" },
    wanted:  { emoji: '🧲', label: 'wanted',  tone: 'text-violet-700 bg-violet-50 ring-violet-100', titlePrefix: "They have skills you're looking for" },
  }[kind];

  const tone = muted ? 'text-slate-500 bg-slate-50 ring-slate-100' : config.tone;
  return (
    <span
      title={items.length > 0 ? `${config.titlePrefix}: ${items.join(', ')}` : 'No overlap yet'}
      className={`inline-flex items-center gap-1 text-[10px] font-bold ring-1 px-1.5 py-0.5 rounded-full ${tone}`}
    >
      {config.emoji} {count} {config.label}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function orderSkills(skills: string[], priority: Set<string>): string[] {
  // Prioritised first (matched / wanted), then everything else in original order.
  const hot: string[] = [];
  const rest: string[] = [];
  for (const s of skills) (priority.has(s) ? hot : rest).push(s);
  return [...hot, ...rest];
}
