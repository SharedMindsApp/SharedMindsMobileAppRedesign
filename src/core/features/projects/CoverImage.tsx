// CoverImage
//
// Single renderer for project cover images. Used by both the detail-page
// hero (full-bleed) and the projects-list card banner (slim). Matches the
// math used by CoverPositioner exactly so what the user sees during edit
// is what they get everywhere else.
//
// Two fit modes:
//   - 'cover'   → image crops to fill the frame edge-to-edge (default)
//   - 'contain' → whole image visible, bands painted with bgColor
//
// Zoom always applies on top of the fit baseline. Range 50-300 (× 100);
// values <100 are mostly useful in contain mode for extra breathing room.

import type { CSSProperties } from 'react';

interface Props {
  url: string;
  /** 0-100 percent. Default 50. */
  x?: number | null;
  y?: number | null;
  /** 50-300 (× 100). Default 100 = no zoom on top of the fit. */
  zoom?: number | null;
  /** Fit mode. Default 'cover'. */
  fit?: 'cover' | 'contain' | null;
  /** Hex colour painted behind the image when bands show. Null = inherit. */
  bgColor?: string | null;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

export function CoverImage({
  url,
  x = 50,
  y = 50,
  zoom = 100,
  fit = 'cover',
  bgColor = null,
  className = '',
  style,
  alt = '',
}: Props) {
  const safeX = clamp(x ?? 50, 0, 100);
  const safeY = clamp(y ?? 50, 0, 100);
  const safeZoom = clamp(zoom ?? 100, 50, 300);
  const safeFit: 'cover' | 'contain' = fit === 'contain' ? 'contain' : 'cover';
  const containerStyle: CSSProperties = {
    ...style,
    ...(bgColor ? { backgroundColor: bgColor } : null),
  };
  return (
    <div className={`relative overflow-hidden ${className}`} style={containerStyle}>
      <img
        src={url}
        alt={alt}
        draggable={false}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          objectFit: safeFit,
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
