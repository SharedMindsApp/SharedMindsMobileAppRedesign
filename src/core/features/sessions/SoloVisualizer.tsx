// SoloVisualizer
//
// Audio-reactive ambient layer that orbits the solo timer ring. Three
// styles selectable by the user (plus 'off' for distraction-free
// focus), driven by the live frequency data from musicAudioBus.
//
//   • bars      — circular EQ, 60 bars evenly spaced around 360°,
//                 each bar's height comes from a logarithmically
//                 sampled frequency bin so low frequencies don't
//                 swamp the top of the ring.
//   • pulse     — single concentric ring that breathes in/out with
//                 the overall amplitude. Calmer than bars.
//   • particles — dots placed around the ring with brightness
//                 modulated by amplitude. Most subtle of the three.
//   • off       — renders nothing. CPU-free.
//
// Selection is persisted in localStorage (sm.solo.visualizer).

import { useEffect, useRef, useState } from 'react';
import { musicAudioBus } from './musicAudioBus';

export type VisualizerStyle = 'bars' | 'pulse' | 'particles' | 'off';

const LS_STYLE = 'sm.solo.visualizer';

export function readVisualizerStyle(): VisualizerStyle {
  if (typeof window === 'undefined') return 'bars';
  const v = window.localStorage.getItem(LS_STYLE);
  if (v === 'bars' || v === 'pulse' || v === 'particles' || v === 'off') return v;
  return 'bars';
}
export function writeVisualizerStyle(v: VisualizerStyle): void {
  try { window.localStorage.setItem(LS_STYLE, v); } catch { /* private */ }
}

interface Props {
  size?: number;
  /** Inner radius — bars/particles sit just outside this. */
  innerRadius?: number;
  /** Max bar height in pixels at full amplitude. */
  barHeight?: number;
  /** Visualizer style. 'off' renders nothing. */
  style?: VisualizerStyle;
  className?: string;
}

export function SoloVisualizer({
  size = 360,
  innerRadius = 145,
  barHeight = 40,
  style = 'bars',
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fadeRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => musicAudioBus.subscribeMuted(() => {}), []);
  useEffect(() => musicAudioBus.subscribe(setPlaying), []);

  useEffect(() => {
    if (style === 'off') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx2d.scale(dpr, dpr);

    const analyser = musicAudioBus.getAnalyser();
    const binCount = analyser?.frequencyBinCount ?? 0;
    const data = binCount > 0 ? new Uint8Array(binCount) : null;

    // Number of bars/particles to render around the full 360°.
    const BAR_COUNT = style === 'bars' ? 60 : 48;

    /** Map a bar index (0..BAR_COUNT-1) to a frequency bin index.
     *
     *  The spectrum is MIRRORED around the circle: bars sweep low→high
     *  frequency over the first half (top → bottom down one side) and back
     *  high→low over the second half (bottom → top up the other side). Music
     *  energy lives mostly in the low bins, so without mirroring all the tall
     *  bars clump onto a single arc and the ring looks lopsided / off-centre.
     *  Mirroring makes both sides match → a balanced ring concentric with the
     *  timer. A quadratic curve still emphasises the lows. */
    function binFor(i: number): number {
      if (!binCount) return 0;
      const half = BAR_COUNT / 2;
      const mirrored = i <= half ? i : BAR_COUNT - i;   // 0 → half → 0
      const t = mirrored / Math.max(1, half);
      const logT = Math.pow(t, 2);
      return Math.min(binCount - 1, Math.floor(logT * (binCount - 1)));
    }

    function draw() {
      if (!ctx2d || !canvas) return;
      const target = playing && data && musicAudioBus.getAnalyser() ? 1 : 0;
      fadeRef.current += (target - fadeRef.current) * 0.06;
      const opacity = fadeRef.current;

      ctx2d.clearRect(0, 0, size, size);
      if (opacity < 0.01) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      if (analyser && data) analyser.getByteFrequencyData(data);

      const cx = size / 2;
      const cy = size / 2;

      // Average amplitude — drives the breathing halo behind all
      // three styles, plus the 'pulse' style's primary ring.
      let avg = 0;
      if (data) {
        // Use the low-mid bands for the avg (where most music energy
        // sits) — gives a more responsive overall pulse than the full
        // spectrum average which is dragged down by silent highs.
        const sampleN = Math.min(40, binCount);
        for (let i = 0; i < sampleN; i++) avg += data[i];
        avg = sampleN > 0 ? avg / (sampleN * 255) : 0;
      }

      // ── Soft halo (all styles) ─────────────────────────────────
      const haloRadius = innerRadius + 16 + avg * 50;
      const haloGrad = ctx2d.createRadialGradient(cx, cy, innerRadius * 0.7, cx, cy, haloRadius);
      haloGrad.addColorStop(0, `rgba(167, 139, 250, 0)`);
      haloGrad.addColorStop(0.7, `rgba(167, 139, 250, ${0.10 * opacity * (0.5 + avg * 0.5)})`);
      haloGrad.addColorStop(1, `rgba(96, 165, 250, 0)`);
      ctx2d.fillStyle = haloGrad;
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx2d.fill();

      // ── Style-specific draw ────────────────────────────────────
      if (style === 'bars' && data) {
        // Each bar gets an evenly-spaced angle around the full
        // circle. Amplitude is sampled log-mapped from the spectrum
        // so the visual spreads across all 360° instead of clumping.
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = data[binFor(i)] / 255;
          const h = v * barHeight * opacity;
          if (h < 0.5) continue;
          // Even angular distribution. Subtract π/2 so bar 0 sits at
          // the top of the circle — cosmetic, the loop covers all 360°.
          const angle = -Math.PI / 2 + (i / BAR_COUNT) * Math.PI * 2;
          // Colour drifts violet → blue across the sweep.
          const t = i / BAR_COUNT;
          const r = Math.round(167 + (96 - 167) * t);
          const g = Math.round(139 + (165 - 139) * t);
          const b = 250;
          const alpha = (0.35 + v * 0.55) * opacity;
          const x1 = cx + Math.cos(angle) * innerRadius;
          const y1 = cy + Math.sin(angle) * innerRadius;
          const x2 = cx + Math.cos(angle) * (innerRadius + h);
          const y2 = cy + Math.sin(angle) * (innerRadius + h);
          ctx2d.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx2d.lineWidth = 2.2;
          ctx2d.lineCap = 'round';
          ctx2d.beginPath();
          ctx2d.moveTo(x1, y1);
          ctx2d.lineTo(x2, y2);
          ctx2d.stroke();
        }
      } else if (style === 'pulse') {
        // Single concentric ring just outside the timer. Stroke
        // width and opacity breathe with the overall amplitude.
        const ringR = innerRadius + 10 + avg * 20;
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx2d.strokeStyle = `rgba(167, 139, 250, ${(0.20 + avg * 0.45) * opacity})`;
        ctx2d.lineWidth = 1.5 + avg * 4;
        ctx2d.stroke();
        // A second softer ring slightly further out.
        ctx2d.beginPath();
        ctx2d.arc(cx, cy, ringR + 14 + avg * 12, 0, Math.PI * 2);
        ctx2d.strokeStyle = `rgba(96, 165, 250, ${0.12 * opacity})`;
        ctx2d.lineWidth = 1;
        ctx2d.stroke();
      } else if (style === 'particles' && data) {
        // Dots placed evenly around the ring. Each dot's brightness
        // (and tiny size variation) modulates with its bin amplitude.
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = data[binFor(i)] / 255;
          if (v < 0.04) continue;
          const angle = -Math.PI / 2 + (i / BAR_COUNT) * Math.PI * 2;
          const r = innerRadius + 14 + v * 6;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const t = i / BAR_COUNT;
          const cr = Math.round(167 + (96 - 167) * t);
          const cg = Math.round(139 + (165 - 139) * t);
          ctx2d.fillStyle = `rgba(${cr}, ${cg}, 250, ${(0.25 + v * 0.65) * opacity})`;
          ctx2d.beginPath();
          ctx2d.arc(x, y, 1.5 + v * 2, 0, Math.PI * 2);
          ctx2d.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, size, innerRadius, barHeight, style]);

  if (style === 'off') return null;

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
