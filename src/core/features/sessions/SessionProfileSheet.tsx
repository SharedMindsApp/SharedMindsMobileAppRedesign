/**
 * SessionProfileSheet — tap a participant (video tile or chat) to see who
 * they are without leaving the session: headline, what they're working on,
 * what they're open to, skills, and their public projects.
 *
 * Reuses the public-profile fetch + the canonical WorkingOnSection (public
 * projects). Shows only curated public fields — never private project data.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, ExternalLink } from 'lucide-react';
import { fetchPublicProfile, type PublicProfile } from '../../services/ProfileService';
import { WorkingOnSection } from '../profile/BuildingProjects';
import { OPEN_TO_OPTIONS } from '../../../lib/openTo';

interface SessionProfileSheetProps {
  userId: string;
  /** Fallbacks shown instantly while the profile loads. */
  fallbackName?: string;
  fallbackAvatar?: string | null;
  onClose: () => void;
}

export function SessionProfileSheet({ userId, fallbackName, fallbackAvatar = null, onClose }: SessionProfileSheetProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchPublicProfile(userId)
      .then((p) => { if (alive) setProfile(p); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [userId]);

  const name = profile?.display_name ?? fallbackName ?? 'Member';
  const avatar = profile?.avatar_url ?? fallbackAvatar;
  const openTo = (profile?.open_to ?? []).map((id) => OPEN_TO_OPTIONS.find((o) => o.id === id)).filter(Boolean) as typeof OPEN_TO_OPTIONS;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover + avatar */}
        <div className="h-16 bg-gradient-to-br from-violet-500 to-indigo-600" />
        <div className="px-5 pb-5 -mt-8">
          <div className="flex items-end justify-between">
            {avatar ? (
              <img src={avatar} alt="" className="w-16 h-16 rounded-2xl ring-4 ring-surface object-cover bg-surface" />
            ) : (
              <div className="w-16 h-16 rounded-2xl ring-4 ring-surface bg-gradient-to-br from-violet-400 to-fuchsia-500 grid place-items-center text-2xl font-extrabold text-white">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full grid place-items-center stitch-text-secondary hover:bg-surface-container-low">
              <X size={16} />
            </button>
          </div>

          <h2 className="text-xl font-extrabold stitch-text-primary tracking-tight mt-3">{name}</h2>
          {profile?.headline && <p className="text-sm stitch-text-secondary leading-snug mt-0.5">{profile.headline}</p>}

          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin stitch-text-secondary" /></div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Right now */}
              {profile?.current_focus && (
                <section>
                  <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1">Right now</p>
                  <p className="text-sm stitch-text-primary leading-relaxed">{profile.current_focus}</p>
                </section>
              )}

              {/* Open to */}
              {openTo.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5">Open to</p>
                  <div className="flex flex-wrap gap-1.5">
                    {openTo.map((o) => (
                      <span key={o.id} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container-low stitch-text-primary">
                        <span>{o.emoji}</span> {o.label}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Skills */}
              {profile?.skills && profile.skills.length > 0 && (
                <section>
                  <p className="text-[10px] font-bold stitch-text-secondary tracking-widest uppercase mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.slice(0, 12).map((s) => (
                      <span key={s} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-container-low stitch-text-secondary">{s}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Public projects */}
              <WorkingOnSection userId={userId} />
            </div>
          )}

          {/* Link to the full profile page */}
          <a
            href={`/profile/${userId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <ExternalLink size={12} /> View full profile
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
