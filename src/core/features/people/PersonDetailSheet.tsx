/**
 * PersonDetailSheet — on-page preview of a member.
 *
 * Opens when:
 *   • Avatar or name on a PersonCard is clicked
 *   • The "+N" overflow chip is clicked (user wants to see all skills)
 *
 * Stays on the same page (no navigation). Renders as a bottom sheet on
 * mobile and a centred modal on desktop. Shows the full bio, the complete
 * skill list grouped by category with self-rated stars, the member's
 * location with country flag, all three match badges expanded with the
 * specific overlapping skill names, and Message + Connect actions.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Star, MessageCircle, Loader2, MapPin, Flame } from 'lucide-react';
import { ConnectButton } from '../connections/ConnectButton';
import { findSkillCategory, SKILL_CATEGORIES } from '../../../lib/skills';
import { findCountry } from '../../../lib/countries';
import { getOrCreateDm, DmPrivacyError } from '../../services/MessageService';
import { showToast } from '../../../components/Toast';
import { useMessagingDock } from '../messages/MessagingDockContext';
import { SafetyMenu } from '../moderation/SafetyMenu';
import type { PersonCardProfile, PersonCardMatch } from './PersonCard';

interface Props {
  member: PersonCardProfile;
  match?: PersonCardMatch;
  onClose: () => void;
}

export function PersonDetailSheet({ member, match, onClose }: Props) {
  const navigate = useNavigate();
  const { openConversation, isMobile } = useMessagingDock();
  const [messaging, setMessaging] = useState(false);

  // ESC to close (basic accessibility)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const name = member.display_name?.trim() || 'Member';
  const initial = name.charAt(0).toUpperCase();
  const workType = member.work_types?.[0];
  const country = findCountry(member.country_code);
  const dm = member.dm_privacy ?? 'open';
  const canMessage = dm !== 'do_not_disturb' && (member.isConnected || dm === 'open');

  // Group skills by their curated category so the panel reads like a CV.
  // Uncategorised customs land at the bottom under "Other".
  const grouped = groupSkillsByCategory(member.skills ?? []);

  async function handleMessage() {
    if (messaging) return;
    setMessaging(true);
    try {
      const conversationId = await getOrCreateDm(member.id);
      if (isMobile) navigate(`/messages/${conversationId}`);
      else openConversation(conversationId);
      onClose();
    } catch (err) {
      if (err instanceof DmPrivacyError) showToast('warning', err.message);
      else console.error('[PersonDetailSheet] message failed:', err);
    } finally {
      setMessaging(false);
    }
  }

  const content = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Sheet — full-width slide-up on mobile, centred modal on desktop */}
      <div className="relative w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Top controls: safety menu + close. Both ≥ 36px so they're
            comfortable to tap on touch and don't overlap with header text. */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <SafetyMenu
            targetUserId={member.id}
            targetUserName={name}
            contextUrl={typeof window !== 'undefined' ? window.location.pathname : undefined}
            onBlocked={onClose}
          />
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-surface-container flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X size={16} className="stitch-text-primary" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4">
          {/* Header — avatar + name + work_type + flame badge */}
          <div className="flex items-start gap-3">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt=""
                className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0 pr-8">
              <p className="text-base font-bold stitch-text-primary leading-tight">{name}</p>
              {workType && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary/80 mt-0.5">
                  {workType}
                </p>
              )}
              {/* Location with flag */}
              {(member.city || country) && (
                <p className="text-xs stitch-text-secondary mt-1 flex items-center gap-1.5">
                  <MapPin size={11} className="stitch-text-secondary shrink-0" />
                  <span className="truncate">
                    {member.city}
                    {member.city && country ? ', ' : ''}
                    {country?.name}
                  </span>
                  {country && <span className="text-sm leading-none">{country.flag}</span>}
                </p>
              )}
              {/* Sessions milestone — same tier logic as the card */}
              {(member.session_count ?? 0) >= 10 && (
                <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 mt-1.5">
                  <Flame size={10} strokeWidth={3} />
                  {member.session_count} sessions logged
                </p>
              )}
            </div>
          </div>

          {/* Bio — full text, no clamp */}
          {member.bio && (
            <p className="text-sm stitch-text-primary mt-4 leading-relaxed whitespace-pre-wrap">
              {member.bio}
            </p>
          )}

          {/* Match badges — expanded with actual overlapping skills */}
          {match && (match.matched.length + match.hunt.length + match.wanted.length > 0) && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
                How you connect
              </p>
              {match.matched.length > 0 && (
                <MatchRow emoji="🤝" label="Shared skills" items={match.matched} tone="blue" />
              )}
              {match.hunt.length > 0 && (
                <MatchRow emoji="🎯" label="They offer what you're seeking" items={match.hunt} tone="emerald" />
              )}
              {match.wanted.length > 0 && (
                <MatchRow emoji="🧲" label="They have skills you're looking for" items={match.wanted} tone="violet" />
              )}
            </div>
          )}

          {/* Full skill list grouped by category, with self-rated stars */}
          {grouped.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest stitch-text-secondary">
                Skills · {member.skills?.length ?? 0}
              </p>
              {grouped.map(({ id, label, emoji, skills }) => (
                <div key={id}>
                  <p className="text-[10px] font-bold stitch-text-secondary mb-1 flex items-center gap-1">
                    <span>{emoji}</span> {label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {skills.map((s) => (
                      <SkillChipFull
                        key={s}
                        skill={s}
                        level={member.skill_levels?.[s]}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky action footer */}
        <div className="border-t border-surface-container px-5 py-3 flex items-center gap-2">
          {canMessage && (
            <button
              type="button"
              onClick={handleMessage}
              disabled={messaging}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container stitch-text-primary text-sm font-bold transition-colors active:scale-95 disabled:opacity-50"
            >
              {messaging ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
              Message
            </button>
          )}
          <div className="flex-1">
            <ConnectButton otherUserId={member.id} variant="light" />
          </div>
        </div>
      </div>
    </div>
  );

  // Portal to body so the sheet escapes any clipping ancestor (Layout's
  // .core-main has CSS animations that create a containing block which
  // would trap a position:fixed child — same trick we used for sessions).
  return createPortal(content, document.body);
}

// ── Sub-components ────────────────────────────────────────────────────────

function MatchRow({
  emoji, label, items, tone,
}: {
  emoji: string;
  label: string;
  items: string[];
  tone: 'blue' | 'emerald' | 'violet';
}) {
  const toneClass = {
    blue:    'bg-blue-50 ring-blue-100 text-blue-800',
    emerald: 'bg-emerald-50 ring-emerald-100 text-emerald-800',
    violet:  'bg-violet-50 ring-violet-100 text-violet-800',
  }[tone];
  return (
    <div>
      <p className="text-[11px] font-bold stitch-text-primary leading-tight">
        {emoji} {label}
      </p>
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((s) => (
          <span key={s} className={`inline-flex text-[10px] font-bold ring-1 px-1.5 py-0.5 rounded-md ${toneClass}`}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkillChipFull({ skill, level }: { skill: string; level?: number }) {
  return (
    <span
      title={level ? `${skill} — self-rated ${level}/5` : skill}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md ring-1 ring-surface-container bg-surface-container-low text-[11px] font-semibold stitch-text-primary"
    >
      {skill}
      {level && level > 0 && (
        <span className="inline-flex items-center gap-0.5 ml-0.5">
          <Star size={9} strokeWidth={2.5} className="fill-amber-400 text-amber-400" />
          <span className="tabular-nums text-[10px] text-amber-700">{level}</span>
        </span>
      )}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function groupSkillsByCategory(skills: string[]) {
  // Walk SKILL_CATEGORIES in order so the output respects the catalogue's
  // intended priority (Design first, Engineering second, …).
  const result: { id: string; label: string; emoji: string; skills: string[] }[] = [];
  const used = new Set<string>();
  for (const cat of SKILL_CATEGORIES) {
    const here = skills.filter((s) => findSkillCategory(s)?.id === cat.id);
    if (here.length > 0) {
      result.push({ id: cat.id, label: cat.label, emoji: cat.emoji, skills: here });
      here.forEach((s) => used.add(s));
    }
  }
  // Any custom / unknown skills the user typed by hand
  const other = skills.filter((s) => !used.has(s));
  if (other.length > 0) {
    result.push({ id: 'other', label: 'Other', emoji: '✨', skills: other });
  }
  return result;
}
