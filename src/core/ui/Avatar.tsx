/**
 * Avatar — shared component with optional presence dot.
 *
 * Usage:
 *   <Avatar displayName="Maya" size="md" showPresence lastSeenAt={profile.last_seen_at} />
 *
 * Presence logic: online = last_seen_at within the past 10 minutes.
 * The dot appears bottom-right as a small green circle.
 */

import { useMemo } from 'react';

// ── Gradient palette (matches existing inline avatar styles across the app) ──
const GRADIENTS = [
  'from-violet-400 to-fuchsia-500',
  'from-cyan-400 to-blue-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-purple-500',
  'from-sky-400 to-cyan-500',
  'from-lime-400 to-emerald-500',
];

function gradientFor(name: string): string {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function isOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 10 * 60 * 1000;
}

// ── Size presets ──────────────────────────────────────────────────────────────
const SIZE_CLASSES = {
  xs:  { outer: 'w-6 h-6',   text: 'text-[10px]', dot: 'w-2 h-2 border' },
  sm:  { outer: 'w-8 h-8',   text: 'text-xs',      dot: 'w-2.5 h-2.5 border' },
  md:  { outer: 'w-10 h-10', text: 'text-sm',      dot: 'w-3 h-3 border-2' },
  lg:  { outer: 'w-12 h-12', text: 'text-base',    dot: 'w-3.5 h-3.5 border-2' },
  xl:  { outer: 'w-16 h-16', text: 'text-xl',      dot: 'w-4 h-4 border-2' },
};

export type AvatarSize = keyof typeof SIZE_CLASSES;

export interface AvatarProps {
  displayName: string;
  avatarUrl?:  string | null;
  size?:       AvatarSize;
  showPresence?: boolean;
  lastSeenAt?: string | null;
  /** Extra className applied to the outer wrapper div */
  className?:  string;
  /** Ring variant for emphasis (e.g. active session) */
  ring?: 'none' | 'cyan' | 'green' | 'violet';
}

const RING_CLASSES: Record<NonNullable<AvatarProps['ring']>, string> = {
  none:   '',
  cyan:   'ring-2 ring-cyan-400 ring-offset-1',
  green:  'ring-2 ring-emerald-400 ring-offset-1',
  violet: 'ring-2 ring-violet-400 ring-offset-1',
};

export function Avatar({
  displayName,
  avatarUrl,
  size = 'md',
  showPresence = false,
  lastSeenAt,
  className = '',
  ring = 'none',
}: AvatarProps) {
  const sizes = SIZE_CLASSES[size];
  const gradient = useMemo(() => gradientFor(displayName), [displayName]);
  const online = showPresence && isOnline(lastSeenAt);
  const initials = displayName
    ? displayName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizes.outer} rounded-full object-cover ${RING_CLASSES[ring]}`}
        />
      ) : (
        <div
          className={`${sizes.outer} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-semibold text-white ${RING_CLASSES[ring]}`}
        >
          <span className={sizes.text}>{initials}</span>
        </div>
      )}

      {/* Presence dot */}
      {showPresence && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full ${sizes.dot}
            ${online
              ? 'bg-emerald-400 border-white'
              : 'bg-gray-300 border-white'
            }
          `}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}

// ── AvatarStack ───────────────────────────────────────────────────────────────
// Renders up to `max` avatars overlapping, with a "+N" overflow chip.

interface AvatarStackItem {
  displayName: string;
  avatarUrl?:  string | null;
  lastSeenAt?: string | null;
}

interface AvatarStackProps {
  users:    AvatarStackItem[];
  max?:     number;
  size?:    AvatarSize;
  showPresence?: boolean;
}

export function AvatarStack({ users, max = 4, size = 'sm', showPresence = false }: AvatarStackProps) {
  const visible  = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <Avatar
          key={i}
          displayName={u.displayName}
          avatarUrl={u.avatarUrl}
          size={size}
          showPresence={showPresence}
          lastSeenAt={u.lastSeenAt}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 && (
        <div
          className={`
            ${SIZE_CLASSES[size].outer}
            rounded-full bg-gray-100 border-2 border-white
            flex items-center justify-center
            text-gray-600 font-medium
            ${SIZE_CLASSES[size].text}
          `}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
