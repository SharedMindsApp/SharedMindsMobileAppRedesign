// CoverImage
//
// Single renderer for project cover images. Used by both the detail-page
// hero (full-bleed) and the projects-list card banner (slim). Matches the
// math used by CoverPositioner exactly so what the user sees during edit
// is what they get everywhere else.
//
// Transform model:
//   - object-fit: cover  → fills the container at minimum 1× scale
//   - object-position    → controls the focal point within the cover-fit view
//   - transform: scale() → zooms in on top of the cover-fit, anchored at
//     the same focal point so the visible region stays centred on what
//     the user marked.

import type { CSSProperties } from 'react';

interface Props {
  url: string;
  /** 0-100 percent. Default 50. */
  x?: number | null;
  y?: number | null;
  /** 100-300 (× 100). Default 100 = no zoom. */
  zoom?: number | null;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

export function CoverImage({
  url,
  x = 50,
  y = 50,
  zoom = 100,
  className = '',
  style,
  alt = '',
}: Props) {
  const safeX = clamp(x ?? 50, 0, 100);
  const safeY = clamp(y ?? 50, 0, 100);
  const safeZoom = clamp(zoom ?? 100, 100, 300);
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <img
        src={url}
        alt={alt}
        draggable={false}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          objectFit: 'cover',
          objectPosition: `${safeX}% ${safeY}%`,
          transform: `scale(${safeZoom / 100})`,
          transformOrigin: `${safeX}% ${safeY}%`,
        }}
      />
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
