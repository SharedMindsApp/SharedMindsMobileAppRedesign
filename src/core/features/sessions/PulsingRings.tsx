/**
 * PulsingRings — audio-reactive concentric rings around an avatar.
 *
 * Three SVG rings, each one slightly larger than the avatar, that scale +
 * fade in/out based on the participant's current audio level (0–1).
 *
 * Why SVG over canvas: we already have a small number of these on screen
 * (one per camera-off participant). SVG transforms are GPU-accelerated by
 * the browser and don't need a render loop — the audio level updates the
 * `transform` and `opacity` props directly via React state.
 *
 * The audio level itself comes from Daily's useAudioLevel hook in the
 * parent component; this component is purely presentational.
 */

import { memo } from 'react';

interface PulsingRingsProps {
  /** Audio level in 0..1 from useAudioLevel */
  audioLevel: number;
  /** Diameter of the inner avatar (px). Rings render outside this. */
  size: number;
  /** Ring colour — defaults to brand indigo */
  color?: string;
}

function PulsingRingsImpl({ audioLevel, size, color = '#a78bfa' }: PulsingRingsProps) {
  // Smooth the audio level a touch — raw values can be jittery
  // and the visual benefits from a tiny gamma curve so quiet speech
  // is still visible.
  const intensity = Math.min(1, Math.pow(audioLevel, 0.6));

  // Three rings: each successively larger and fainter.
  // Base scale grows with audio level so rings "breathe" outward.
  const ring = (index: number) => {
    const baseScale = 1 + index * 0.15;          // 1.0, 1.15, 1.3
    const scaleBump = intensity * (0.2 - index * 0.05); // outer rings move less
    const scale = baseScale + scaleBump;
    const opacity = (0.35 - index * 0.08) * (0.4 + intensity * 0.6);
    const strokeWidth = 2 + (1 - index * 0.3);
    return { scale, opacity, strokeWidth };
  };

  // We render the rings in a square viewBox larger than the avatar so
  // they have room to expand without clipping.
  const padding = size * 0.6;        // extra space for outer rings
  const total = size + padding * 2;
  const cx = total / 2;
  const cy = total / 2;
  const baseR = size / 2;

  return (
    <svg
      width={total}
      height={total}
      viewBox={`0 0 ${total} ${total}`}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {[0, 1, 2].map((i) => {
        const { scale, opacity, strokeWidth } = ring(i);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={baseR}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `scale(${scale})`,
              opacity,
              transition: 'transform 80ms ease-out, opacity 80ms ease-out',
            }}
          />
        );
      })}
    </svg>
  );
}

export const PulsingRings = memo(PulsingRingsImpl);
